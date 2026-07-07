import { ref, computed } from 'vue';
import { useFavorites } from './useFavorites';

/**
 * useContextMenu — 全局 WinUI 风格中文右键菜单
 *
 * 调用方提供：
 *   - currentPage: Ref<string>
 *   - themeSetting: Ref<'system'|'light'|'dark'>
 *   - onToggleTheme: () => void
 *   - onRefreshCurrent: () => void
 *
 * 返回：
 *   - contextMenuOpen / contextMenuAnchor / contextMenuItems
 *   - closeContextMenu / onContextMenuSelect / onGlobalContextMenu
 */
export function useContextMenu({ currentPage, themeSetting, onToggleTheme, onRefreshCurrent }) {
  const contextMenuOpen = ref(false);
  const contextMenuAnchor = ref(null);
  const contextMenuSelection = ref('');
  const contextMenuTarget = ref(null);
  // 防止菜单关闭后短时间内被意外重新触发（如粘贴操作引发的连锁事件）
  let menuLockUntil = 0;

  const { isFavorite, toggleFavorite } = useFavorites();

  const isTextElement = (el) => {
    if (!el) return false;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
    if (el.isContentEditable) return true;
    return false;
  };

  const buildContextItems = () => {
    const target = contextMenuTarget.value;
    const sel = contextMenuSelection.value;
    const hasSelection = !!sel;
    const isTextTarget = isTextElement(target);
    const pageKey = currentPage.value;
    const onChapter = /^ch\d+-\d+$/.test(pageKey);

    const items = [];

    if (isTextTarget) {
      items.push({ key: 'cut', label: '剪切', icon: '\uE8C6', shortcut: 'Ctrl+X', disabled: !hasSelection });
      items.push({ key: 'copy', label: '复制', icon: '\uE8C8', shortcut: 'Ctrl+C', disabled: !hasSelection });
      items.push({ key: 'paste', label: '粘贴', icon: '\uE77F', shortcut: 'Ctrl+V' });
      items.push({ key: 'undo', label: '撤回', icon: '\uE7A7', shortcut: 'Ctrl+Z' });
      items.push({ key: 'select-all', label: '全选', icon: '\uE8B3', shortcut: 'Ctrl+A' });
      items.push({ key: 'separator-edit', kind: 'separator' });
    }

    if (onChapter) {
      const fav = isFavorite(pageKey);
      items.push({
        key: 'toggle-fav',
        label: fav ? '取消收藏' : '收藏此章节',
        icon: fav ? '\uE735' : '\uE734',
      });
      items.push({ key: 'separator-fav', kind: 'separator' });
    }

    items.push({ key: 'back-home', label: '返回首页', icon: '\uE80F' });
    items.push({ key: 'back-top', label: '回到顶部', icon: '\uE74A' });
    items.push({ key: 'refresh', label: '刷新此页', icon: '\uE72C', shortcut: 'F5' });

    items.push({ key: 'separator-nav', kind: 'separator' });

    const themeLabel = themeSetting.value === 'light' ? '切换到深色主题'
                     : themeSetting.value === 'dark' ? '跟随系统主题'
                     : '切换到浅色主题';
    const themeIcon = themeSetting.value === 'light' ? '\uE708'
                    : themeSetting.value === 'dark' ? '\uE7E8'
                    : '\uE793';
    items.push({ key: 'toggle-theme', label: themeLabel, icon: themeIcon });

    items.push({ key: 'separator-theme', kind: 'separator' });

    items.push({ key: 'settings', label: '设置', icon: '\uE713' });

    return items;
  };

  const contextMenuItems = computed(buildContextItems);

  /** 获取当前选中的文本（兼容输入框和普通页面文本） */
  const getSelectionText = (target) => {
    // 输入框：从 value + selectionStart/End 获取
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      const el = target;
      if (el.selectionStart !== null && el.selectionEnd !== null
          && el.selectionStart !== el.selectionEnd) {
        return el.value.substring(el.selectionStart, el.selectionEnd);
      }
      return '';
    }
    // 普通页面 / contentEditable：从 window.getSelection 获取
    return window.getSelection?.()?.toString() || '';
  };

  const onGlobalContextMenu = (e) => {
    // 防止菜单关闭后 200ms 内再次触发
    if (Date.now() < menuLockUntil) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    contextMenuTarget.value = e.target;
    // 兼容输入框和普通文本的选中内容获取
    contextMenuSelection.value = getSelectionText(e.target);
    contextMenuAnchor.value = { clientX: e.clientX, clientY: e.clientY };
    contextMenuOpen.value = true;
    e.preventDefault();
    e.stopPropagation();
  };

  const closeContextMenu = () => {
    contextMenuOpen.value = false;
    contextMenuSelection.value = '';
    contextMenuTarget.value = null;
    contextMenuAnchor.value = null;
    menuLockUntil = Date.now() + 200; // 锁定 200ms，防止连锁触发
  };

  const execEdit = (command) => {
    try { return document.execCommand(command, false, null); } catch { return false; }
  };

  const doCopy = async (target = contextMenuTarget.value) => {
    const sel = getSelectionText(target);
    if (!sel) return;
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(sel); } catch (err) {
        console.warn('clipboard.writeText failed:', err);
        execEdit('copy');
      }
    } else {
      execEdit('copy');
    }
  };

  const doCut = async (target = contextMenuTarget.value) => {
    // 剪切 = 先复制到剪贴板，再删除选中文本
    const sel = getSelectionText(target);
    if (sel && navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(sel); } catch (err) {
        console.warn('clipboard.writeText in cut failed:', err);
      }
    }

    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      if (target.selectionStart !== target.selectionEnd) {
        target.setRangeText('', target.selectionStart, target.selectionEnd, 'end');
        target.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } else if (target?.isContentEditable) {
      target.focus();
      execEdit('cut');
    } else {
      execEdit('cut');
    }
  };

  const doPaste = async (target = contextMenuTarget.value) => {
    if (!target) return;

    // 先让目标输入框重新获得焦点，否则粘贴时 cursor/selection 会丢失
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      target.focus();
    }

    if (navigator.clipboard?.readText) {
      try {
        const text = await navigator.clipboard.readText();
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          const start = target.selectionStart ?? target.value.length;
          const end = target.selectionEnd ?? target.value.length;
          target.setRangeText(text, start, end, 'end');
          target.selectionStart = target.selectionEnd = start + text.length;
          // 触发 input 事件，让 v-model 等绑定同步
          target.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (target.isContentEditable) {
          document.execCommand('insertText', false, text);
        } else {
          execEdit('paste');
        }
      } catch (err) {
        console.warn('Paste failed:', err);
        execEdit('paste');
      }
    } else {
      execEdit('paste');
    }
  };

  const doUndo = (target = contextMenuTarget.value) => {
    if (target && typeof target.undo === 'function') {
      target.undo();
    } else {
      execEdit('undo');
    }
  };

  const doSelectAll = (target = contextMenuTarget.value) => {
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      target.select();
    } else if (target?.isContentEditable) {
      const range = document.createRange();
      range.selectNodeContents(target);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      execEdit('selectAll');
    }
  };

  const onContextMenuSelect = async (item) => {
    // 在关闭菜单前捕获目标元素，否则 closeContextMenu 会把它清空，导致后续编辑命令找不到目标
    const target = contextMenuTarget.value;
    closeContextMenu();
    switch (item.key) {
      case 'cut': await doCut(target); break;
      case 'copy': await doCopy(target); break;
      case 'paste': await doPaste(target); break;
      case 'undo': doUndo(target); break;
      case 'select-all': doSelectAll(target); break;
      case 'toggle-fav': {
        const k = currentPage.value;
        if (k && /^ch\d+-\d+$/.test(k)) toggleFavorite(k);
        break;
      }
      case 'back-home': currentPage.value = 'home'; break;
      case 'back-top': window.scrollTo({ top: 0, behavior: 'smooth' }); break;
      case 'refresh': onRefreshCurrent(); break;
      case 'toggle-theme': onToggleTheme(); break;
      case 'settings': currentPage.value = 'settings'; break;
    }
  };

  return {
    contextMenuOpen,
    contextMenuAnchor,
    contextMenuItems,
    onContextMenuSelect,
    closeContextMenu,
    onGlobalContextMenu,
  };
}
