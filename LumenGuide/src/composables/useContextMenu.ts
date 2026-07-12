import { ref, computed, onMounted, onBeforeUnmount, type Ref, type ComputedRef } from 'vue';
import { useFavorites } from './useFavorites';

/** 右键菜单项（与 WinContextMenu 的 props.items 对齐） */
export interface ContextMenuItem {
  key: string;
  label?: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
  kind?: 'separator';
}

/** 锚点：鼠标坐标（clientX/Y）或某个元素的 DOMRect */
export type ContextMenuAnchor = { clientX: number; clientY: number } | DOMRect | null;

/** useContextMenu 入参 */
export interface ContextMenuOptions {
  currentPage: Ref<string>;
  themeSetting: Ref<'system' | 'light' | 'dark'>;
  onToggleTheme: () => void;
  onRefreshCurrent: () => void;
}

/** useContextMenu 返回值 */
export interface ContextMenuApi {
  contextMenuOpen: Ref<boolean>;
  contextMenuAnchor: Ref<ContextMenuAnchor>;
  contextMenuItems: ComputedRef<ContextMenuItem[]>;
  onContextMenuSelect: (item: ContextMenuItem) => Promise<void>;
  closeContextMenu: () => void;
  openContextMenu: (x: number, y: number, target?: EventTarget | null) => void;
  onGlobalContextMenu: (e: MouseEvent) => void;
}

/**
 * useContextMenu — 全局 WinUI 风格中文右键菜单（与上游控件库互补的「应用功能」）
 *
 * 调用方提供：
 *   - currentPage:    Ref<string>
 *   - themeSetting:   Ref<'system'|'light'|'dark'>
 *   - onToggleTheme:  () => void
 *   - onRefreshCurrent: () => void
 */
export function useContextMenu(options: ContextMenuOptions): ContextMenuApi {
  const { currentPage, themeSetting, onToggleTheme, onRefreshCurrent } = options;

  const contextMenuOpen = ref(false);
  const contextMenuAnchor = ref<ContextMenuAnchor>(null);
  const contextMenuSelection = ref('');
  const contextMenuTarget = ref<EventTarget | null>(null);
  // 防止菜单关闭后短时间内被意外重新触发（如粘贴操作引发的连锁事件）
  let menuLockUntil = 0;
  // 记录最后一次触摸位置：移动端长按触发的 contextmenu 事件坐标在很多浏览器里
  // 不可靠（常为 0/0 或落在角落），因此用真实触摸点来定位菜单。
  let lastTouchX: number | null = null;
  let lastTouchY: number | null = null;
  const recordTouch = (e: TouchEvent): void => {
    const t = e.touches && e.touches[0];
    if (t) {
      lastTouchX = t.clientX;
      lastTouchY = t.clientY;
    }
  };
  const isTouchDevice = typeof window !== 'undefined'
    && ('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0);

  const { isFavorite, toggleFavorite } = useFavorites();

  const isTextElement = (el: EventTarget | null): boolean => {
    if (!el || !(el instanceof HTMLElement)) return false;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return true;
    if (el.isContentEditable) return true;
    return false;
  };

  const buildContextItems = (): ContextMenuItem[] => {
    const target = contextMenuTarget.value;
    const sel = contextMenuSelection.value;
    const hasSelection = !!sel;
    const isTextTarget = isTextElement(target);
    const pageKey = currentPage.value;
    const onChapter = /^ch\d+-\d+$/.test(pageKey);

    const items: ContextMenuItem[] = [];

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
  const getSelectionText = (target: EventTarget | null): string => {
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      const el = target;
      if (el.selectionStart !== null && el.selectionEnd !== null
        && el.selectionStart !== el.selectionEnd) {
        return el.value.substring(el.selectionStart, el.selectionEnd);
      }
      return '';
    }
    if (target instanceof HTMLElement && target.isContentEditable) {
      return window.getSelection?.()?.toString() || '';
    }
    return window.getSelection?.()?.toString() || '';
  };

  /**
   * 主动打开右键菜单（供 WinContextMenuSurface 等控件调用）。
   * 同时兼容桌面右键与移动长按：传入坐标和事件目标即可。
   */
  const openContextMenu = (x: number, y: number, target: EventTarget | null = null): void => {
    if (Date.now() < menuLockUntil) return;
    contextMenuTarget.value = target;
    contextMenuSelection.value = getSelectionText(target);
    contextMenuAnchor.value = { clientX: x, clientY: y };
    contextMenuOpen.value = true;
  };

  const onGlobalContextMenu = (e: MouseEvent): void => {
    // 防止菜单关闭后 200ms 内再次触发
    if (Date.now() < menuLockUntil) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    contextMenuTarget.value = e.target;
    // 兼容输入框和普通文本的选中内容获取
    contextMenuSelection.value = getSelectionText(e.target);

    // 计算锚点坐标：
    // 桌面端直接用鼠标坐标；移动端长按触发的 contextmenu 事件坐标常常不可靠
    // （0/0 或落在角落），因此优先使用刚才记录的触摸点位置。
    const touchCap = (e as unknown as { sourceCapabilities?: { firesTouchEvents?: boolean } }).sourceCapabilities;
    const isTouch = !!touchCap?.firesTouchEvents;
    let x = e.clientX;
    let y = e.clientY;
    const degenerate = (typeof x !== 'number' || typeof y !== 'number') || (x === 0 && y === 0);
    if ((isTouch || isTouchDevice || degenerate) && lastTouchX !== null && lastTouchY !== null) {
      x = lastTouchX;
      y = lastTouchY;
    }
    contextMenuAnchor.value = { clientX: x, clientY: y };
    contextMenuOpen.value = true;
    e.preventDefault();
    e.stopPropagation();
  };

  const closeContextMenu = (): void => {
    contextMenuOpen.value = false;
    contextMenuSelection.value = '';
    contextMenuTarget.value = null;
    contextMenuAnchor.value = null;
    menuLockUntil = Date.now() + 200; // 锁定 200ms，防止连锁触发
  };

  const execEdit = (command: string): boolean => {
    try { return document.execCommand(command, false, undefined); } catch { return false; }
  };

  const doCopy = async (target: EventTarget | null = contextMenuTarget.value): Promise<void> => {
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

  const doCut = async (target: EventTarget | null = contextMenuTarget.value): Promise<void> => {
    // 剪切 = 先复制到剪贴板，再删除选中文本
    const sel = getSelectionText(target);
    if (sel && navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(sel); } catch (err) {
        console.warn('clipboard.writeText in cut failed:', err);
      }
    }

    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      if (target.selectionStart !== target.selectionEnd) {
        const s = target.selectionStart ?? target.value.length;
        const e = target.selectionEnd ?? target.value.length;
        target.setRangeText('', s, e, 'end');
        target.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } else if (target instanceof HTMLElement && target.isContentEditable) {
      target.focus();
      execEdit('cut');
    } else {
      execEdit('cut');
    }
  };

  const doPaste = async (target: EventTarget | null = contextMenuTarget.value): Promise<void> => {
    if (!target) return;

    // 先让目标输入框重新获得焦点，否则粘贴时 cursor/selection 会丢失
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && target.isContentEditable)) {
      target.focus();
    }

    if (navigator.clipboard?.readText) {
      try {
        const text = await navigator.clipboard.readText();
        if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
          const start = target.selectionStart ?? target.value.length;
          const end = target.selectionEnd ?? target.value.length;
          target.setRangeText(text, start, end, 'end');
          target.selectionStart = target.selectionEnd = start + text.length;
          // 触发 input 事件，让 v-model 等绑定同步
          target.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (target instanceof HTMLElement && target.isContentEditable) {
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

  const doUndo = (target: EventTarget | null = contextMenuTarget.value): void => {
    const t = target as unknown as { undo?: () => void } | null;
    if (t && typeof t.undo === 'function') t.undo();
    else execEdit('undo');
  };

  const doSelectAll = (target: EventTarget | null = contextMenuTarget.value): void => {
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      target.select();
    } else if (target instanceof HTMLElement && target.isContentEditable) {
      const range = document.createRange();
      range.selectNodeContents(target);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    } else {
      execEdit('selectAll');
    }
  };

  const onContextMenuSelect = async (item: ContextMenuItem): Promise<void> => {
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

  onMounted(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('touchstart', recordTouch as EventListener, { passive: true });
      window.addEventListener('touchmove', recordTouch as EventListener, { passive: true });
    }
  });
  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('touchstart', recordTouch as EventListener);
      window.removeEventListener('touchmove', recordTouch as EventListener);
    }
  });

  return {
    contextMenuOpen,
    contextMenuAnchor,
    contextMenuItems,
    onContextMenuSelect,
    closeContextMenu,
    openContextMenu,
    onGlobalContextMenu,
  };
}
