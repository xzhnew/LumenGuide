<template>
  <div class="win-search-box" ref="rootRef">
    <!-- Header（对标 AutoSuggestBox.Header） -->
    <div v-if="header || $slots.header" class="win-search-header">
      <slot name="header">{{ header }}</slot>
    </div>

    <div class="win-search-input-wrap" :class="{ focused: isFocused, 'has-query': !!query }">
      <input
        ref="inputRef"
        class="win-search-input"
        type="text"
        :placeholder="placeholderText"
        v-model="query"
        @focus="onFocus"
        @blur="onBlur"
        @keydown="onKeydown"
      />
      <!-- 清除按钮（有输入时显示） -->
      <button
        v-if="query"
        class="win-search-clear"
        @mousedown.prevent="clearQuery"
        aria-label="清除搜索">
        <span class="icon">&#xE711;</span>
      </button>
      <!-- QueryIcon：搜索框末端、框内的 WinButton，点击等价于回车提交 -->
      <WinButton
        class="win-search-query-btn"
        :aria-label="queryButtonAriaLabel"
        @click="submitQuery">
        <span class="icon">{{ queryIcon }}</span>
      </WinButton>
    </div>

    <!-- Description（对标 AutoSuggestBox.Description） -->
    <div v-if="description || $slots.description" class="win-search-description">
      <slot name="description">{{ description }}</slot>
    </div>

    <Teleport to="body">
      <Transition name="search-popup">
        <div
          v-if="showPopup"
          class="win-search-popup"
          :class="{ 'with-content': !!query, 'is-empty': !query }"
          :style="popupStyle">
          <!-- 空白态：最近访问与收藏并排 -->
          <div v-if="!query" class="win-search-empty">
            <div class="win-search-row">
              <!-- 最近访问 -->
              <div v-if="recentItems.length" class="win-search-column">
                <div class="win-search-section-title">
                  <span class="icon">&#xE823;</span>
                  <span>最近访问</span>
                </div>
                <div class="win-search-list-simple">
                  <div
                    v-for="item in recentItems"
                    :key="item.key"
                    class="win-search-simple-item"
                    @mousedown.prevent="chooseSuggestion(item)">
                    <span class="icon win-search-simple-icon">{{ item.icon }}</span>
                    <span class="win-search-simple-text">{{ item.titleZh || item.title }}</span>
                  </div>
                </div>
              </div>
              <!-- 我的收藏 -->
              <div v-if="favoriteItems.length" class="win-search-column">
                <div class="win-search-section-title">
                  <span class="icon">&#xE735;</span>
                  <span>我的收藏</span>
                </div>
                <div class="win-search-list-simple">
                  <div
                    v-for="item in favoriteItems"
                    :key="item.key"
                    class="win-search-simple-item"
                    @mousedown.prevent="chooseSuggestion(item)">
                    <span class="icon win-search-simple-icon">{{ item.icon }}</span>
                    <span class="win-search-simple-text">{{ item.titleZh || item.title }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="!recentItems.length && !favoriteItems.length" class="win-search-hero">
              <div class="win-search-hero-icon"><span class="icon">&#xE721;</span></div>
              <div class="win-search-hero-title">搜索内容</div>
              <div class="win-search-hero-desc">输入关键词搜索。试试 <code>项目</code>、<code>介绍</code> 或 <code>设置</code>。</div>
            </div>
          </div>

          <!-- 搜索结果：分类分组显示 -->
          <div v-else class="win-search-results">
            <div v-if="!flatSuggestions.length" class="win-search-no-results">
              <div class="win-search-no-results-icon"><span class="icon">&#xE721;</span></div>
              <div>没有匹配 <strong>"{{ query }}"</strong> 的内容</div>
            </div>
            <template v-else>
              <div
                v-for="group in groupedSuggestions"
                :key="group.key"
                class="win-search-section">
                <div v-if="group.label" class="win-search-section-title">
                  <span class="icon">{{ group.icon }}</span>
                  <span>{{ group.label }}</span>
                  <span class="win-search-section-count">{{ group.items.length }}</span>
                </div>
                <div class="win-search-list">
                  <div
                    v-for="(item, idx) in group.items"
                    :key="item.key"
                    class="win-search-suggestion"
                    :class="{ highlighted: isHighlighted(group, idx) }"
                    @mousedown.prevent="chooseSuggestion(item)"
                    @mouseenter="setHighlight(flatIndexOf(group, idx))">
                    <div class="win-sug-icon"><span class="icon">{{ item.icon }}</span></div>
                    <div class="win-sug-text">
                      <div class="win-sug-title">{{ item.title }}</div>
                      <div class="win-sug-subtitle">{{ item.titleZh }} &middot; {{ item.descZh }}</div>
                    </div>
                    <div class="win-sug-meta">
                      <span class="win-sug-category">{{ group.label || '结果' }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- 底部快捷键提示 -->
          <div v-if="showFooter" class="win-search-popup-footer">
            <div class="win-footer-left">
              <span class="icon win-footer-icon">&#xE946;</span>
              <span>{{ flatSuggestions.length || '' }} 条结果</span>
            </div>
            <div class="win-footer-right">
              <div><kbd>&#8593;&#8595;</kbd><span>浏览</span></div>
              <div><kbd>&#x21B5;</kbd><span>打开</span></div>
              <div><kbd>Esc</kbd><span>关闭</span></div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import WinButton from './WinButton.vue';
import { searchPages, getPageMeta, pageGroups, type PageMeta } from '../data/pages';
import { useFavorites } from '../composables/useFavorites';

/**
 * WinSearchBox —— 对标 WinUI 3 的 Microsoft.UI.Xaml.Controls.AutoSuggestBox
 *
 * 官方字段名映射：
 *   Text                 -> prop `text`            (v-model:text)
 *   PlaceholderText      -> prop `placeholderText`
 *   QueryIcon            -> prop `queryIcon`       (末端 WinButton 的图标字形)
 *   Header               -> prop `header` / #header slot
 *   Description          -> prop `description` / #description slot
 *   ItemsSource          -> prop `itemsSource`    (外部数据源，提供后替代内置搜索)
 *   TextMemberPath       -> prop `textMemberPath`
 *   DisplayMemberPath    -> prop `displayMemberPath`
 *   MaxSuggestionHeight  -> prop `maxSuggestionHeight`
 *   IsSuggestionListOpen -> prop `isSuggestionListOpen` (v-model:isSuggestionListOpen)
 *   UpdateTextOnSelect   -> prop `updateTextOnSelect`
 *
 * 官方事件映射：
 *   TextChanged          -> emit `textChanged`      ({ reason, text })
 *   SuggestionChosen     -> emit `suggestionChosen` ({ selectedItem })
 *   QuerySubmitted       -> emit `querySubmitted`   ({ queryText, chosenSuggestion })
 */

const props = defineProps({
  text: { type: String, default: '' },
  placeholderText: { type: String, default: '搜索...' },
  queryIcon: { type: String, default: '\uE721' }, // 放大镜
  queryButtonAriaLabel: { type: String, default: '执行搜索' },
  header: { type: String, default: '' },
  description: { type: String, default: '' },
  itemsSource: { type: Array as () => any[], default: null },
  textMemberPath: { type: String, default: 'title' },
  displayMemberPath: { type: String, default: 'titleZh' },
  maxSuggestionHeight: { type: Number, default: 0 },
  isSuggestionListOpen: { type: Boolean, default: false },
  updateTextOnSelect: { type: Boolean, default: true },
  fullWidth: { type: Boolean, default: false },
  navMode: { type: String, default: 'left' } // 'left' | 'top'
});

const emit = defineEmits([
  'update:text',
  'textChanged',
  'suggestionChosen',
  'querySubmitted',
  'update:isSuggestionListOpen'
]);

const inputRef = ref<HTMLInputElement | null>(null);
const rootRef = ref<HTMLElement | null>(null);
const isFocused = ref(false);
const highlightIndex = ref(0);

// Text（对标 AutoSuggestBox.Text）
const query = computed({
  get: () => props.text,
  set: (v) => emit('update:text', v)
});

const showPopup = computed(() => isFocused.value || props.isSuggestionListOpen);

watch(isFocused, (v) => emit('update:isSuggestionListOpen', v));

// 弹窗位置状态（手动更新，支持 resize/scroll 实时刷新）
const popupPos = ref({ top: '0px', left: '0px', width: '400px' });

// 计算并更新弹窗位置
const updatePopupPos = () => {
  if (!rootRef.value || !isFocused.value) return;
  const rect = rootRef.value.getBoundingClientRect();
  // 弹窗宽度与搜索框一致，最小 320px，小屏时撑满可用宽度
  const popupWidth = Math.max(320, rect.width);

  if (props.navMode === 'top') {
    // 顶导航模式：弹窗从搜索框下方展开，左对齐
    let left = rect.left;
    if (left < 12) left = 12;
    const maxRight = window.innerWidth - 12;
    if (left + popupWidth > maxRight) {
      left = maxRight - popupWidth;
    }
    popupPos.value = {
      top: (rect.bottom + 8) + 'px',
      left: left + 'px',
      width: popupWidth + 'px'
    };
  } else {
    // 左导航模式：弹窗从搜索框下方展开，左对齐搜索框
    let left = rect.left;
    const contentEl = document.querySelector('.win-nav-content');
    if (contentEl) {
      const contentRect = contentEl.getBoundingClientRect();
      const maxRight = contentRect.right - 12;
      if (left + popupWidth > maxRight) {
        left = Math.max(rect.left - (left + popupWidth - maxRight), contentRect.left + 8);
      }
    }
    if (left < 12) left = 12;

    popupPos.value = {
      top: (rect.bottom + 8) + 'px',
      left: left + 'px',
      width: popupWidth + 'px'
    };
  }
};

const suggestions = ref<PageMeta[]>([]);

// TextChanged —— 文本变化时过滤（内置引擎）
watch(query, (q) => {
  suggestions.value = searchPages(q).slice(0, 30);
  highlightIndex.value = 0;
  emit('textChanged', { reason: 'UserInput', text: q });
});

// 分组结果：ItemsSource 优先，否则使用内置分类分组
const groupedSuggestions = computed(() => {
  // ItemsSource（对标 AutoSuggestBox.ItemsSource）—— 外部数据源
  if (props.itemsSource && Array.isArray(props.itemsSource)) {
    const q = query.value.trim().toLowerCase();
    const filtered = q
      ? props.itemsSource.filter(it =>
          String((it as any)[props.textMemberPath] ?? it.title ?? '').toLowerCase().includes(q) ||
          String((it as any)[props.displayMemberPath] ?? it.titleZh ?? '').toLowerCase().includes(q))
      : props.itemsSource;
    return [{ key: '__ext', icon: props.queryIcon, label: '', items: filtered as PageMeta[] }];
  }

  const groups: { key: string; icon: string; label: string; items: PageMeta[] }[] = [];
  for (const group of pageGroups) {
    const items = suggestions.value.filter(p => group.children.includes(p.key));
    if (items.length) {
      groups.push({ key: group.key, icon: group.icon, label: group.label, items });
    }
  }
  return groups;
});

const flatSuggestions = computed(() => groupedSuggestions.value.flatMap(g => g.items));

const isHighlighted = (group: any, idx: number) => {
  return flatIndexOf(group, idx) === highlightIndex.value;
};

const flatIndexOf = (group: any, idx: number) => {
  let i = 0;
  for (const g of groupedSuggestions.value) {
    if (g.key === group.key) return i + idx;
    i += g.items.length;
  }
  return -1;
};

const setHighlight = (i: number) => { highlightIndex.value = i; };

// 最近访问与收藏
const { favorites } = useFavorites();

const getRecentHistory = (): string[] => {
  try {
    const raw = localStorage.getItem('winui-recent-pages');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const recentItems = computed(() => {
  return getRecentHistory()
    .filter(key => key !== 'home')
    .map(key => getPageMeta(key))
    .filter((m): m is PageMeta => !!m)
    .slice(0, 6);
});

const favoriteItems = computed(() => {
  return favorites.value
    .filter(key => key !== 'home')
    .map(key => getPageMeta(key))
    .filter((m): m is PageMeta => !!m)
    .slice(0, 6);
});

const showFooter = computed(() => !!query.value);

// 弹窗样式（使用 popupPos 响应式更新，并应用 MaxSuggestionHeight）
const popupStyle = computed(() => ({
  ...popupPos.value,
  maxHeight: props.maxSuggestionHeight > 0 ? (props.maxSuggestionHeight + 'px') : undefined
}));

const onFocus = () => { isFocused.value = true; updatePopupPos(); };

const onBlur = () => {
  setTimeout(() => { isFocused.value = false; }, 150);
};

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    highlightIndex.value = Math.min(highlightIndex.value + 1, flatSuggestions.value.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    highlightIndex.value = Math.max(highlightIndex.value - 1, 0);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    submitQuery(); // 回车 = 点击 QueryIcon 按钮
  } else if (e.key === 'Escape') {
    e.preventDefault();
    inputRef.value?.blur();
  }
};

/**
 * SuggestionChosen + QuerySubmitted
 * 用户从建议列表中选择某一项（点击 / 方向键 + 回车）
 */
const chooseSuggestion = (item: PageMeta) => {
  emit('suggestionChosen', { selectedItem: item });
  // UpdateTextOnSelect —— 选中后是否把文本写回输入框
  query.value = props.updateTextOnSelect ? (item.title || '') : '';
  emit('querySubmitted', { queryText: query.value, chosenSuggestion: item });
  isFocused.value = false;
  inputRef.value?.blur();
};

/**
 * QuerySubmitted（无 chosenSuggestion）
 * 回车或点击 QueryIcon 按钮：提交当前高亮项，或仅提交文本
 */
const submitQuery = () => {
  const item = flatSuggestions.value[highlightIndex.value];
  if (item) {
    chooseSuggestion(item);
  } else {
    emit('querySubmitted', { queryText: query.value, chosenSuggestion: null });
    isFocused.value = false;
    inputRef.value?.blur();
  }
};

const clearQuery = () => {
  query.value = '';
  inputRef.value?.focus();
};

// Ctrl+K 全局快捷键
let globalKeyHandler: ((e: KeyboardEvent) => void) | null = null;
let resizeHandler: (() => void) | null = null;

onMounted(() => {
  globalKeyHandler = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      inputRef.value?.focus();
    } else if (e.key === 'Escape' && isFocused.value) {
      inputRef.value?.blur();
    }
  };
  document.addEventListener('keydown', globalKeyHandler);

  resizeHandler = () => { updatePopupPos(); };
  watch(isFocused, (focused) => {
    if (focused) {
      window.addEventListener('resize', resizeHandler!);
      window.addEventListener('scroll', resizeHandler!, true);
      updatePopupPos();
    } else {
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
        window.removeEventListener('scroll', resizeHandler, true);
      }
    }
  });

  // 开发态支持 ?q=xxx 自动填充并弹出
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    if (q) {
      setTimeout(() => {
        query.value = q;
        inputRef.value?.focus();
        isFocused.value = true;
      }, 100);
    }
  }
});

onBeforeUnmount(() => {
  if (globalKeyHandler) document.removeEventListener('keydown', globalKeyHandler);
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    window.removeEventListener('scroll', resizeHandler, true);
  }
});

defineExpose({ focus: () => inputRef.value?.focus() });
</script>

<style>
.win-search-box {
  width: 100%;
  box-sizing: border-box;
}

/* Header / Description（对标 AutoSuggestBox） */
.win-search-header {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.win-search-description {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 6px;
}

/* 搜索框本体 */
.win-search-input-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 6px 0 12px;
  background: var(--ctrl-fill-default);
  backdrop-filter: var(--flyout-backdrop);
  -webkit-backdrop-filter: var(--flyout-backdrop);
  border: 1px solid var(--ctrl-border-rest);
  border-bottom-color: var(--ctrl-strong-stroke);
  border-radius: 8px;
  transition: background var(--fast-duration), border-color var(--fast-duration);
  box-sizing: border-box;
}

.win-search-input-wrap:hover {
  background: var(--ctrl-fill-secondary);
}

.win-search-input-wrap.focused {
  background: var(--ctrl-fill-default);
  border-color: var(--ctrl-border-rest);
  border-bottom-color: var(--accent-base);
  border-bottom-width: 2px;
  padding-bottom: 0;
}

.win-search-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  color: var(--text-primary);
  min-width: 0;
  line-height: 1.4;
}

.win-search-input::placeholder {
  color: var(--text-tertiary);
}

/* QueryIcon：搜索框末端、框内的小长方形 WinButton */
.win-search-query-btn.win-btn {
  height: 28px;
  padding: 0 9px;
  flex-shrink: 0;
  border-radius: 4px;
  margin-left: 2px;
}

.win-search-query-btn .icon {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1;
}

.win-search-query-btn.win-btn:hover .icon {
  color: var(--text-primary);
}

.win-search-query-btn.win-btn:active .icon {
  color: var(--text-secondary);
}

/* 清除按钮（有输入时） */
.win-search-clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  color: var(--text-secondary);
  flex-shrink: 0;
  padding: 0;
}

.win-search-clear:hover {
  background: var(--subtle-secondary);
  color: var(--text-primary);
}

.win-search-clear .icon {
  font-size: 10px;
  line-height: 1;
}

/* ===== 弹出面板 (Win11 图库风格) ===== */
.win-search-popup {
  position: fixed;
  z-index: 10001;
  display: flex;
  flex-direction: column;
  background: var(--flyout-bg);
  backdrop-filter: var(--flyout-backdrop);
  -webkit-backdrop-filter: var(--flyout-backdrop);
  border: 1px solid var(--stroke-surface-flyout);
  border-radius: 8px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.28);
  max-height: 70vh;
  overflow: hidden;
}

.win-search-popup.is-empty {
  min-height: 320px;
}

/* 空白态 */
.win-search-empty {
  flex: 1;
  overflow-y: auto;
  padding: 20px 32px 12px 32px;
}

/* 最近+收藏 并排布局 */
.win-search-row {
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
}

.win-search-column {
  flex: 1;
  min-width: 200px;
  margin-bottom: 12px;
}

.win-search-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.win-search-section {
  margin-bottom: 24px;
}

.win-search-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.win-search-section-title .icon {
  font-size: 16px;
  color: var(--text-secondary);
}

.win-search-section-count {
  margin-left: auto;
  font-size: 12px;
  font-weight: 400;
  color: var(--text-tertiary);
  background: var(--subtle-secondary);
  padding: 2px 8px;
  border-radius: 999px;
}

/* 搜索结果 - 简洁列表（最近访问/收藏用） */
.win-search-list-simple {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.win-search-simple-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background var(--faster-duration);
}

.win-search-simple-item:hover {
  background: var(--subtle-secondary);
}

.win-search-simple-icon {
  font-size: 14px;
  color: var(--text-secondary);
  flex-shrink: 0;
  width: 16px;
  text-align: center;
}

.win-search-simple-text {
  font-size: 13px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.win-search-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 32px;
  text-align: center;
  height: 100%;
  justify-content: center;
}

.win-search-hero-icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--subtle-secondary);
}

.win-search-hero-icon .icon {
  font-size: 32px;
  color: var(--text-secondary);
}

.win-search-hero-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.win-search-hero-desc {
  font-size: 13px;
  color: var(--text-secondary);
  max-width: 480px;
  line-height: 1.5;
}

.win-search-hero-desc code {
  font-family: 'Cascadia Code', 'Consolas', monospace;
  background: var(--subtle-secondary);
  padding: 2px 6px;
  border-radius: 3px;
  color: var(--accent-text);
}

/* 搜索结果 */
.win-search-results {
  flex: 1;
  overflow-y: auto;
  padding: 16px 32px 8px 32px;
}

.win-search-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
}

.win-search-suggestion {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background var(--faster-duration);
}

.win-search-suggestion.highlighted {
  background: var(--subtle-secondary);
}

.win-search-suggestion:hover {
  background: var(--subtle-secondary);
}

.win-sug-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: var(--subtle-secondary);
  flex-shrink: 0;
}

.win-sug-icon .icon {
  font-size: 16px;
  color: var(--text-primary);
}

.win-sug-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.win-sug-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.win-sug-subtitle {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.win-sug-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.win-sug-category {
  font-size: 11px;
  color: var(--text-tertiary);
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--subtle-secondary);
}

.win-search-no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 64px 32px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}

.win-search-no-results-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--subtle-secondary);
}

.win-search-no-results-icon .icon {
  font-size: 24px;
  color: var(--text-tertiary);
}

/* 底部快捷键提示 */
.win-search-popup-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  border-top: 1px solid var(--stroke-divider);
  font-size: 11px;
  color: var(--text-tertiary);
  background: var(--layer-default);
  flex-shrink: 0;
}

.win-footer-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.win-footer-left .icon {
  font-size: 12px;
  color: var(--text-tertiary);
}

.win-footer-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.win-footer-right > div {
  display: flex;
  align-items: center;
  gap: 4px;
}

.win-search-popup-footer kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 3px;
  background: var(--subtle-secondary);
  border: 1px solid var(--ctrl-border-rest);
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  font-size: 10px;
  color: var(--text-primary);
}

/* ===== 动画 ===== */
.search-popup-enter-active {
  transition: opacity 0.167s ease, transform 0.167s cubic-bezier(0.1, 0.9, 0.2, 1);
}
.search-popup-leave-active {
  transition: opacity 0.083s ease;
}
.search-popup-enter-from {
  opacity: 0;
  transform: translateY(-8px) scaleY(0.96);
  transform-origin: top center;
}
.search-popup-leave-to {
  opacity: 0;
}

/* ===== 移动端适配 ===== */
@media (max-width: 640px) {
  /* 弹窗撑满屏幕宽度，仅留边距 */
  .win-search-popup {
    border-radius: 0 0 12px 12px;
    max-height: 80vh;
  }

  /* 空白态内边距缩小 */
  .win-search-empty {
    padding: 16px 20px 12px 20px;
  }

  /* 最近/收藏改成上下排列 */
  .win-search-row {
    flex-direction: column;
    gap: 8px;
  }

  .win-search-column {
    min-width: 0;
    margin-bottom: 4px;
  }

  /* 搜索结果区域缩小内边距 */
  .win-search-results {
    padding: 12px 16px 8px 16px;
  }

  /* 底部快捷键提示隐藏或简化 */
  .win-search-popup-footer {
    padding: 8px 12px;
  }

  .win-footer-right {
    gap: 8px;
  }

  .win-footer-right span {
    display: none;
  }

  /* hero 区域缩小 */
  .win-search-hero {
    padding: 24px 20px;
  }

  .win-search-hero-icon {
    width: 48px;
    height: 48px;
  }

  .win-search-hero-icon .icon {
    font-size: 24px;
  }

  .win-search-hero-title {
    font-size: 16px;
  }

  .win-search-hero-desc {
    font-size: 12px;
  }
}
</style>
