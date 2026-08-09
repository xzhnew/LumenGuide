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
        type="search"
        enterkeyhint="search"
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        :placeholder="placeholderText"
        v-model="query"
        @focus="onFocus"
        @blur="onBlur"
        @keydown="onKeydown"
        @contextmenu.prevent
      />
      <!-- 清除按钮（有输入时显示） -->
      <button
        v-if="query"
        class="win-search-clear"
        @mousedown.prevent="clearQuery"
        aria-label="清除搜索">
        <span class="icon">{{ '\uE711' }}</span>
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
          ref="popupRef"
          class="win-search-popup"
          :class="{ 'with-content': !!query, 'is-empty': !query, 'nav-dropdown': !isSmallScreen, 'is-snapping-close': isSnapClosing }"
          :style="popupStyle"
          @pointerdown="onPopupPointerDown">
          <!-- 拖动把手：仅小屏（移动端底部抽屉）显示，按住上下拖动调整大小；桌面/顶部/自动模式不显示、不可移动 -->
          <div
            v-if="isSmallScreen"
            class="win-search-handle"
            role="separator"
            aria-label="拖动以调整搜索面板大小"
            title="拖动以调整搜索面板大小"
            @pointerdown.prevent="startResize"></div>
          <!-- 空白态：最近访问与收藏并排 -->
          <div v-if="!query" class="win-search-empty">
            <div class="win-search-row">
              <!-- 最近访问 -->
              <div v-if="recentItems.length" class="win-search-column">
                <div class="win-search-section-title">
                  <span class="icon">{{ '\uE823' }}</span>
                  <span>最近访问</span>
                </div>
                <div class="win-search-list-simple">
                  <div
                    v-for="item in recentItems"
                    :key="item.key"
                    class="win-search-simple-item"
                    @mousedown.prevent="chooseSuggestion(item)">
                    <span class="icon win-search-simple-icon">{{ item.icon }}</span>
                    <span class="win-search-simple-text">{{ item.titlePlain || item.titleZh || item.title }}</span>
                  </div>
                </div>
                <WinHyperlinkButton
                  class="win-search-view-all"
                  @mousedown.prevent="emit('querySubmitted', { queryText: query, chosenSuggestion: { key: 'recent' } })">
                  查看全部访问
                </WinHyperlinkButton>
              </div>
              <!-- 精选收藏 -->
              <div v-if="favoriteItems.length" class="win-search-column">
                <div class="win-search-section-title">
                  <span class="icon">{{ '\uE735' }}</span>
                  <span>精选收藏</span>
                </div>
                <div class="win-search-list-simple">
                  <div
                    v-for="item in favoriteItems"
                    :key="item.key"
                    class="win-search-simple-item"
                    @mousedown.prevent="chooseSuggestion(item)">
                    <span class="icon win-search-simple-icon">{{ item.icon }}</span>
                    <span class="win-search-simple-text">{{ item.titlePlain || item.titleZh || item.title }}</span>
                  </div>
                </div>
                <WinHyperlinkButton
                  class="win-search-view-all"
                  @mousedown.prevent="emit('querySubmitted', { queryText: query, chosenSuggestion: { key: 'favorites' } })">
                  查看全部收藏
                </WinHyperlinkButton>
              </div>
            </div>
            <div v-if="!recentItems.length && !favoriteItems.length" class="win-search-hero">
              <div class="win-search-hero-icon"><span class="icon">{{ '\uE721' }}</span></div>
              <div class="win-search-hero-title">搜索内容</div>
              <div class="win-search-hero-desc">输入关键词搜索。试试 <code>项目</code>、<code>介绍</code> 或 <code>设置</code>。</div>
            </div>
          </div>

          <!-- 搜索结果：分类分组显示 -->
          <div v-else class="win-search-results">
            <div v-if="!flatSuggestions.length" class="win-search-hero win-search-no-results-hero">
              <div class="win-search-hero-icon"><span class="icon">{{ '\uE721' }}</span></div>
              <div class="win-search-hero-title">搜索内容</div>
              <div class="win-search-hero-desc">
                <span class="win-search-no-results-query">{{ query }}</span>
                <span>没有匹配结果</span>
              </div>
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
                      <div class="win-sug-title">{{ item.titleZh || item.title }}</div>
                      <div class="win-sug-subtitle">{{ getSnippet(item, query) }}</div>
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
              <span class="icon win-footer-icon">{{ '\uE946' }}</span>
              <span>{{ flatSuggestions.length || '' }} 条结果</span>
            </div>
            <div class="win-footer-right">
              <div><kbd>&#8593;&#8595;</kbd><span>浏览</span></div>
              <div><kbd>{{ '\u21B5' }}</kbd><span>打开</span></div>
              <div><kbd>Esc</kbd><span>关闭</span></div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import WinButton from './WinButton.vue';
import WinHyperlinkButton from './WinHyperlinkButton.vue';
import { searchPages, getPageMeta, pageGroups, type PageMeta } from '../data/pages';
import { useFavorites } from '../composables/useFavorites';

/**
 * 生成搜索结果的辅助说明：优先展示正文中命中关键词的前后片段。
 */
function getSnippet(item: PageMeta, query: string): string {
  const q = query.trim().toLowerCase();
  if (!q) return item.descZh;

  // 1. 正文命中：截取匹配处前后文本，并高亮上下文
  if (item.content) {
    const lower = item.content.toLowerCase();
    const idx = lower.indexOf(q);
    if (idx >= 0) {
      const start = Math.max(0, idx - 24);
      const end = Math.min(item.content.length, idx + q.length + 72);
      let snippet = item.content.slice(start, end).replace(/\s+/g, ' ').trim();
      if (start > 0) snippet = '…' + snippet;
      if (end < item.content.length) snippet = snippet + '…';
      return snippet;
    }
  }

  // 2. 描述命中：直接展示中文描述
  if (item.descZh.includes(q) || item.desc.toLowerCase().includes(q)) {
    return item.descZh;
  }

  // 3. 标题 / 关键词命中：返回描述兜底
  return item.descZh || item.titleZh || '';
}

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
  navMode: { type: String, default: 'left' }, // 'left' | 'top'
  activePage: { type: String, default: '' }
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
const popupRef = ref<HTMLElement | null>(null);
const isFocused = ref(false);
const highlightIndex = ref(0);
// 弹窗显式高度（拖动把手时锁定，null = 由内容自动撑高）
const popupHeight = ref<number | null>(null);
// 是否小屏（<640px）：只有小屏（移动端底部抽屉）才允许拖拽调整大小；
// 桌面 / 顶部 / 自动 模式均为固定下拉卡片，不可移动。与 CSS @media(max-width:640px) 断点一致。
const isSmallScreen = ref(typeof window !== 'undefined' ? window.innerWidth < 640 : false);

// 虚拟视口（VisualViewport）：移动端键盘唤起时，visualViewport 高度会缩小，
// 据此推算键盘高度，把搜索弹窗抬到键盘上方（窄于 80px 视为浏览器工具栏抖动，忽略）。
const keyboardH = ref(0);

// 小屏弹窗独立开关：与输入框焦点解耦，键盘收起后弹窗不自动关闭；
// 关闭方式：① 向下拖拽把手把面板缩到“显示不下一行文字”（此时已接近屏幕底部）即关闭
//           ② 弹窗/搜索框之外点击两次及以上。
const popupOpen = ref(false);
// 小屏拖拽状态：拖拽中禁用过渡以便实时跟随手指；释放后恢复过渡回弹
const dragging = ref(false);
// 小屏：拖拽松开后“向下滑出屏幕”的关闭动画中
const isSnapClosing = ref(false);

// Text（对标 AutoSuggestBox.Text）
const query = computed({
  get: () => props.text,
  set: (v) => emit('update:text', v)
});

const showPopup = computed(() => {
  // 桌面与移动端统一：弹窗显隐由 popupOpen 独立控制（与输入框焦点解耦），
  // 这样桌面端可以在“第一次点击主内容区”时保持弹窗打开，第二次点击才关闭。
  return popupOpen.value || props.isSuggestionListOpen;
});

// 页面切换（如移动端点击左侧导航）时主动收起搜索弹窗，避免跳转后弹窗仍覆盖在新页面上
watch(() => props.activePage, () => {
  if (popupOpen.value) closePopup();
});

watch(isFocused, (v) => emit('update:isSuggestionListOpen', v));

// 弹窗位置状态（手动更新，支持 resize/scroll 实时刷新）
const popupPos = ref({ top: '0px', left: '0px', width: '400px' });
// 拖拽中标记：拖拽时不要被 updatePopupPos（scroll/resize 触发）覆盖用户拖动的位置
let isResizing = false;

// 计算并更新弹窗位置
const updatePopupPos = () => {
  if (isResizing) return; // 拖拽中：保持用户拖动的位置，不被 scroll/resize 重置
  if (!rootRef.value || !isFocused.value) return;
  const rect = rootRef.value.getBoundingClientRect();
  // 弹窗宽度与搜索框一致；小屏模式下尽量撑满，桌面端保底 320px
  const isSmallScreen = window.innerWidth < 640;
  const popupWidth = isSmallScreen ? rect.width : Math.max(320, rect.width);

  if (props.navMode === 'top') {
    // 顶导航模式：弹窗从搜索框下方展开，左对齐；小屏允许贴到右边缘，避免被 padding 挤偏
    let left = rect.left;
    if (left < 12) left = 12;
    const maxRight = isSmallScreen ? window.innerWidth : window.innerWidth - 12;
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

// 移动端键盘高度推算：键盘高度只由 visualViewport 的“高度收缩”决定，
// 即 window.innerHeight - vv.height；**不再减去 vv.offsetTop**。
// 原因：vv.offsetTop 反映的是“页面滚动偏移”，不是键盘高度。原来减去它，
// 在 iOS 上拖动背后的页面（页面滚动 / rubber-band）会改变 offsetTop，
// 进而错误改写 --kb-offset，把 position:fixed 的搜索弹窗被动顶上去。
const onVVResize = () => {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null;
  if (!vv) return;
  const kh = Math.max(0, Math.round(window.innerHeight - vv.height));
  keyboardH.value = kh;
  if (isFocused.value) updatePopupPos();
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

// 高亮项随键盘上下移动时，自动滚入可见区域（列表较长时不会“跑出屏幕”）
watch(highlightIndex, () => {
  nextTick(() => {
    const el = document.querySelector('.win-search-suggestion.highlighted') as HTMLElement | null;
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
});

// 弹窗关闭时，重置为“内容自动撑高”（下次打开不被上次拖动的高度影响）
watch(isFocused, (v) => { if (!v) popupHeight.value = null; });

// 弹窗（小屏 popupOpen）关闭时，清理拖拽/点击计数状态
watch(popupOpen, (v) => {
  if (!v) { popupHeight.value = null; outsideTapCount = 0; }
});

// 最近访问与收藏
const { pinnedFavoritesKeys } = useFavorites();
const recentRefresh = ref(0);

const getRecentHistory = (): string[] => {
  try {
    const raw = localStorage.getItem('winui-recent-pages');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const recentItems = computed(() => {
  recentRefresh.value; // 强制 Vue 追踪此依赖——每次 recentRefresh 变化就重新读 localStorage
  return getRecentHistory()
    .filter(key => key !== 'home')
    .map(key => getPageMeta(key))
    .filter((m): m is PageMeta => !!m)
    .slice(0, 6);
});

const favoriteItems = computed(() => {
  // 「精选收藏」只显示 6 条（来自 useFavorites 的 pinnedFavoritesKeys：
  // 用户手动精选优先，未设则回退全部收藏的前 6 个）
  return pinnedFavoritesKeys.value
    .map(key => getPageMeta(key))
    .filter((m): m is PageMeta => !!m);
});

const showFooter = computed(() => !!query.value);

// 弹窗样式（使用 popupPos 响应式更新，并应用 MaxSuggestionHeight / 拖动高度 / 键盘抬升）
const popupStyle = computed(() => {
  const kb = keyboardH.value;
  const isSmall = isSmallScreen.value;
  const style: Record<string, string> = { ...popupPos.value };
  // 小屏拖拽中：实时跟随手指（禁用过渡），反应更跟手
  if (isSmall && dragging.value) style.transition = 'none';

  if (isSmall) {
    // 键盘升起：底部贴键盘顶沿
    if (kb > 80) style['--kb-offset'] = kb + 'px';

    // 计算可用最大高度：弹窗顶部不得低于搜索框底部 + gap，避免覆盖搜索框
    const rootRect = rootRef.value?.getBoundingClientRect();
    const searchBoxBottom = rootRect?.bottom ?? 56;
    const gap = 8;
    const viewportBottom = kb > 80 ? window.innerHeight - kb : window.innerHeight;
    const maxAvailableH = Math.max(120, viewportBottom - searchBoxBottom - gap);

    // 用户拖拽锁定了高度：以拖拽高度为准，但仍受“不覆盖搜索框”限制
    if (popupHeight.value !== null) {
      const h = Math.min(popupHeight.value, maxAvailableH);
      style.height = h + 'px';
      style.maxHeight = h + 'px';
      return style;
    }

    // 小屏默认高度：统一 250px；所有状态（空白/无结果/列表）默认尺寸一样。
    const compactH = Math.min(250, maxAvailableH);
    style.height = compactH + 'px';
    style.maxHeight = compactH + 'px';
    return style;
  }

  // 桌面 / 顶部 / 自动：固定下拉卡片，高度由内容撑开（封顶 70vh 由基础样式控制），不可拖拽
  if (props.maxSuggestionHeight > 0) style.maxHeight = props.maxSuggestionHeight + 'px';
  return style;
});

// ===== 拖动调整弹窗大小 =====
// 抓手在弹窗顶部：向上拖 → 弹窗变高（底边固定，顶边跟随）；向下拖 → 变矮。
// 注意：仅小屏（移动端底部抽屉）允许拖拽；桌面/顶部/自动模式由 startResize 守卫拦截，不可移动。
let dragStart = { y: 0, bottom: 0, height: 0 };
// 小屏：弹窗之外的点击计数（点两次才算关闭，避免第一次点击只是收起软键盘）
let outsideTapCount = 0;
// 小屏向下拖拽关闭的阈值：当弹窗高度缩到“显示不下一行文字”即触发关闭。
// 手指可以一直拖到只剩把手（32px）贴到屏幕边缘，松开后才滑出关闭。
let dragCloseHeight = 56;

const startResize = (e: PointerEvent) => {
  if (!isSmallScreen.value || !popupRef.value) return; // 仅小屏可拖拽
  const rect = popupRef.value.getBoundingClientRect();
  dragStart = { y: e.clientY, bottom: rect.bottom, height: rect.height };
  popupHeight.value = rect.height; // 锁定当前高度，避免首帧跳动
  // 关闭阈值：向下拖到该高度（含）以下、松手即播放滑出关闭动画。
  // 空白态/无结果态（hero 圆形图标）阈值 230px；列表态（有结果/最近访问收藏）阈值 150px。
  const heroIcon = popupRef.value.querySelector('.win-search-hero-icon');
  if (heroIcon) {
    dragCloseHeight = 230;
  } else {
    dragCloseHeight = 150;
  }
  isResizing = true; // 标记拖拽中，阻止 updatePopupPos 覆盖位置
  dragging.value = true;
  outsideTapCount = 0;
  window.addEventListener('pointermove', onResizeMove);
  window.addEventListener('pointerup', stopResize);
};

const onResizeMove = (e: PointerEvent) => {
  const deltaY = e.clientY - dragStart.y;
  // 移动端底部抽屉：上下拖动 = 调整面板高度（向上更高、向下更矮）
  if (isSmallScreen.value) {
    if (!rootRef.value) return;
    const rootRect = rootRef.value.getBoundingClientRect();
    const kb = keyboardH.value;
    const gap = 8;
    const viewportBottom = kb > 80 ? window.innerHeight - kb : window.innerHeight;
    // 向上最大高度：弹窗顶部不得低于搜索框底部 + gap，避免覆盖搜索框
    const maxH = Math.max(120, viewportBottom - rootRect.bottom - gap);
    // 向下最小高度：只剩把手（手指按住时允许贴到屏幕最底部）
    const minH = 32;
    // 向上拖（deltaY<0）→ 更高；向下拖（deltaY>0）→ 更矮
    const h = Math.max(minH, Math.min(maxH, dragStart.height - deltaY));
    popupHeight.value = h;
    // 拖动过程中不自动关闭，手指松开后在 stopResize 中判断
    return;
  }
  // 桌面：向上拖 → 变高，底边固定、顶边跟随
  const minH = 200;
  const maxH = Math.round(window.innerHeight * 0.9);
  let h = dragStart.height - deltaY; // 向上拖（deltaY<0）→ 变高
  h = Math.max(minH, Math.min(maxH, h));
  popupHeight.value = h;
  if (!isSmallScreen.value) {
    // 桌面：底边固定，顶边跟随拖动（并防止顶到屏幕外）
    const newTop = Math.max(8, dragStart.bottom - h);
    popupPos.value = { ...popupPos.value, top: newTop + 'px' };
  }
};

const stopResize = () => {
  isResizing = false;
  dragging.value = false;
  window.removeEventListener('pointermove', onResizeMove);
  window.removeEventListener('pointerup', stopResize);
  // 手指松开后，如果面板已缩到“显示不下一行文字”，先播放“向下滑出屏幕”动画再真正关闭
  if (popupHeight.value !== null && popupHeight.value <= dragCloseHeight && !isSnapClosing.value) {
    isSnapClosing.value = true;
    setTimeout(() => {
      closePopup();
      isSnapClosing.value = false;
      popupHeight.value = null; // 重置锁定高度，下次打开恢复默认
    }, 260);
  }
};

// ===== 面板下滑关闭（小屏）：除把手、输入框、可滚动结果区外，在面板内容上向下滑动即可关闭 =====
let swipeStartY = 0;
let swipeTracking = false;
const SWIPE_CLOSE_THRESHOLD = 80;

const onPopupPointerDown = (e: PointerEvent) => {
  if (!isSmallScreen.value || !popupRef.value) return;
  const t = e.target as HTMLElement;
  // 把手自己处理拖拽；输入框保留焦点行为
  if (t.closest('.win-search-handle') || t.closest('.win-search-input')) return;
  // 结果区可滚动时不接管（避免和滚动冲突，仍可用把手关闭）
  const resultsEl = popupRef.value.querySelector('.win-search-results');
  if (resultsEl && resultsEl.contains(t) && resultsEl.scrollHeight > resultsEl.clientHeight + 1) return;
  swipeTracking = true;
  swipeStartY = e.clientY;
  window.addEventListener('pointermove', onPopupPointerMove);
  window.addEventListener('pointerup', onPopupPointerUp);
};

const onPopupPointerMove = (e: PointerEvent) => {
  if (!swipeTracking) return;
  const deltaY = e.clientY - swipeStartY;
  if (deltaY > SWIPE_CLOSE_THRESHOLD && !isSnapClosing.value) {
    swipeTracking = false;
    window.removeEventListener('pointermove', onPopupPointerMove);
    window.removeEventListener('pointerup', onPopupPointerUp);
    isSnapClosing.value = true;
    setTimeout(() => {
      closePopup();
      isSnapClosing.value = false;
      popupHeight.value = null;
    }, 260);
  }
};

const onPopupPointerUp = () => {
  swipeTracking = false;
  window.removeEventListener('pointermove', onPopupPointerMove);
  window.removeEventListener('pointerup', onPopupPointerUp);
};

// 关闭弹窗（小屏）：重置所有拖拽/焦点状态并收起键盘
const closePopup = () => {
  popupOpen.value = false;
  dragging.value = false;
  isResizing = false;
  isSnapClosing.value = false;
  outsideTapCount = 0;
  inputRef.value?.blur();
  window.removeEventListener('pointermove', onResizeMove);
  window.removeEventListener('pointerup', stopResize);
  window.removeEventListener('pointermove', onPopupPointerMove);
  window.removeEventListener('pointerup', onPopupPointerUp);
  swipeTracking = false;
};

const onFocus = () => {
  recentRefresh.value++;
  isFocused.value = true;
  popupOpen.value = true; // 小屏：弹窗打开（与焦点解耦，键盘收起不关闭）
  outsideTapCount = 0;
  updatePopupPos();
};

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
    closePopup(); // 桌面与移动一致：Esc 直接关闭弹窗
  }
};

/**
 * SuggestionChosen + QuerySubmitted
 * 用户从建议列表中选择某一项（点击 / 方向键 + 回车）
 */
const chooseSuggestion = (item: PageMeta) => {
  emit('suggestionChosen', { selectedItem: item });
  // UpdateTextOnSelect —— 选中后是否把文本写回输入框
  query.value = props.updateTextOnSelect ? (item.titleZh || item.title || '') : '';
  emit('querySubmitted', { queryText: query.value, chosenSuggestion: item });
  popupOpen.value = false; // 桌面与移动一致：选中后关闭弹窗
  isFocused.value = false;
  inputRef.value?.blur();
};

/**
 * QuerySubmitted（无 chosenSuggestion）
 * 回车 / 搜索键 / 点击 QueryIcon 按钮：提交当前高亮项，或仅提交文本
 * 移动端特殊处理：搜索键只收起软键盘，保留搜索面板与已输入内容，不跳转、不清除——
 * 解决「手机上按换行键后直接跳走、搜索内容丢失」的问题（type=search 让键盘键显示为「搜索」）。
 *
 * 注意：isSmallScreen 仅按 innerWidth<640 判定，但手机横屏时宽度通常 ≥ 640（如 iPhone 横屏约 844px），
 *       此时仍应走移动端逻辑（收键盘、不跳转）。因此用 < 1025 补充覆盖横屏手机/小平板。
 */
const submitQuery = () => {
  // 移动端（含横屏手机）：收起键盘、保留搜索面板与内容，不退出、不清除
  const isTouchMobile = isSmallScreen.value || window.innerWidth < 1025;
  if (isTouchMobile) {
    inputRef.value?.blur();
    return;
  }
  const item = flatSuggestions.value[highlightIndex.value];
  if (item) {
    chooseSuggestion(item);
  } else {
    emit('querySubmitted', { queryText: query.value, chosenSuggestion: null });
    popupOpen.value = false; // 桌面：提交后关闭弹窗
    isFocused.value = false;
    inputRef.value?.blur();
  }
};

const clearQuery = () => {
  query.value = '';
  closePopup();
};

// 监听全局 pointerdown，统计弹窗/搜索框之外的点击次数（点两次才关闭）
// 小屏：任意区域（除弹窗/搜索框）点两次关闭；桌面：仅在主内容区（.win-nav-content）点两次关闭。
const onDocPointerDown = (e: PointerEvent) => {
  const t = e.target as HTMLElement;
  // 点在弹窗内部或搜索框内部：不算“外部点击”，计数器清零
  if (popupRef.value?.contains(t) || rootRef.value?.contains(t)) {
    outsideTapCount = 0;
    return;
  }
  // 点击导航栏（左面板 / 顶部栏）任意位置都立即关闭搜索弹窗——搜索框本身已在上面排除。
  // 这样无论移动端还是桌面端，点导航栏都不会出现“弹窗还赖着”的怪异情况。
  if (t.closest('.win-nav-left-panel') || t.closest('.win-nav-top-bar')) {
    closePopup();
    return;
  }
  if (isSmallScreen.value) {
    if (!popupOpen.value) return;
    outsideTapCount += 1;
    if (outsideTapCount >= 2) closePopup();
    return;
  }

  // 桌面版：点击主内容区（.win-nav-content）两次关闭弹窗；第一次保持打开，第二次关闭。
  // 弹窗已与输入框焦点解耦（popupOpen 控制显隐），故第一次点击不会因失焦而关闭。
  if (!showPopup.value) return;
  const contentEl = document.querySelector('.win-nav-content');
  if (!contentEl?.contains(t)) {
    outsideTapCount = 0;
    return;
  }
  outsideTapCount += 1;
  if (outsideTapCount >= 2) closePopup();
};

// Ctrl+K 全局快捷键
let globalKeyHandler: ((e: KeyboardEvent) => void) | null = null;
let resizeHandler: (() => void) | null = null;
let widthChangeHandler: (() => void) | null = null;

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

  // 小屏：全局监听“弹窗外点击”，用于两次点击关闭弹窗
  document.addEventListener('pointerdown', onDocPointerDown, true);

  // 实时跟踪是否小屏：切换桌面/顶部/自动 ↔ 小屏时同步刷新，离开小屏时重置拖动高度
  widthChangeHandler = () => {
    const next = window.innerWidth < 640;
    if (next !== isSmallScreen.value) {
      isSmallScreen.value = next;
      if (!next) popupHeight.value = null; // 离开小屏：丢弃曾拖动的高度
      updatePopupPos();
    }
  };
  window.addEventListener('resize', widthChangeHandler);

  // 键盘检测：只监听 VisualViewport 的 resize（键盘唤起/收起会收缩 vv.height，触发 resize）；
  // 不监听 scroll —— 拖动背后的页面（页面滚动）也会触发 scroll，会反复扰动键盘高度推算，
  // 从而把 fixed 弹窗被动顶上去。键盘检测本身只依赖 height，所以移除 scroll 无影响。
  if (typeof window !== 'undefined' && window.visualViewport) {
    window.visualViewport.addEventListener('resize', onVVResize);
  }

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
  document.removeEventListener('pointerdown', onDocPointerDown, true);
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    window.removeEventListener('scroll', resizeHandler, true);
  }
  if (widthChangeHandler) window.removeEventListener('resize', widthChangeHandler);
  if (typeof window !== 'undefined' && window.visualViewport) {
    window.visualViewport.removeEventListener('resize', onVVResize);
  }
  window.removeEventListener('pointermove', onResizeMove);
  window.removeEventListener('pointerup', stopResize);
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

/* 隐藏 type=search 自带的圆形清除按钮（已有自定义清除按钮） */
.win-search-input::-webkit-search-cancel-button,
.win-search-input::-webkit-search-decoration {
  -webkit-appearance: none;
  appearance: none;
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
  background: var(--material-solid, #FBFBFB);
  backdrop-filter: var(--flyout-backdrop);
  -webkit-backdrop-filter: var(--flyout-backdrop);
  border: 1px solid var(--material-acrylic-border, rgba(0, 0, 0, 0.1));
  border-radius: 8px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.28);
  max-height: 70vh;
  overflow: hidden;
  /* 小屏拖拽释放后回弹到底部的过渡（拖拽中由内联 transition:none 覆盖） */
  transition: transform 0.2s ease;
  /* 移动端由 JS 接管下滑关闭手势，防止浏览器默认滚动抢占 */
  touch-action: none;
}

/* .win-search-popup.is-empty 不再设置 min-height：小屏下高度由 JS 统一控制（紧凑态 196px），
   避免内容少时被撑高、内容多时被 min-height 限制。桌面端也由内容自然撑开。 */

/* 桌面 / 顶部 / 自动模式：固定下拉卡片（不可拖拽）。
   与小屏底部抽屉区分，但顶部不加任何强调色，保持纯净材质观感。 */
.win-search-popup.nav-dropdown {
  border-radius: 10px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.30);
}

/* 顶部拖动把手（桌面 / 移动通用，移动端样式见下方 media query） */
.win-search-handle {
  height: 12px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ns-resize;
  touch-action: none;
  background: transparent;
}

.win-search-handle::after {
  content: '';
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--text-tertiary);
  opacity: 0.35;
  transition: opacity var(--fast-duration);
}

.win-search-handle:hover::after {
  opacity: 0.7;
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

/* 列底部：查看全部（超链接按钮，居中显示） */
.win-search-column .win-search-view-all {
  display: flex;
  justify-content: center;
  width: 100%;
  margin-top: 8px;
  font-size: 12px;
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
  /* 结果区保留垂直滚动，不被 popup 的 touch-action:none 覆盖 */
  touch-action: pan-y;
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

.win-search-no-results-body {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  align-self: stretch;
}

.win-search-no-results-query {
  color: var(--text-primary);
  font-weight: 500;
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
  background: transparent;
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
  /* 仅淡入，不加 transform —— .win-search-popup 自身带 backdrop-filter，transform 会废掉毛玻璃 */
}
.search-popup-leave-to {
  opacity: 0;
}

/* ===== 移动端适配 ===== */
@media (max-width: 640px) {
  /* 弹窗改为底部抽屉（bottom sheet）：全宽、贴底、统一圆角/边框/安全区，彻底消除移动端定位错乱 */
  .win-search-popup {
    top: auto !important;
    left: 0 !important;
    right: auto !important;
    /* 键盘升起时通过 --kb-offset 把弹窗抬到键盘上方（由 JS 实时设置） */
    bottom: var(--kb-offset, 0px) !important;
    width: 100% !important;
    max-height: 86vh;
    border-radius: 16px 16px 0 0;
    border-left: none;
    border-right: none;
    border-bottom: none;
    box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.35);
    padding-bottom: env(safe-area-inset-bottom);
  }

  /* 抽屉顶部小抓手（真实手柄，桌面/移动通用） */
  .win-search-handle {
    height: 20px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: ns-resize;
    touch-action: none;
    background: transparent;
  }

  .win-search-handle::after {
    content: '';
    width: 40px;
    height: 4px;
    border-radius: 2px;
    background: var(--text-tertiary);
    opacity: 0.5;
    transition: opacity var(--fast-duration);
  }

  .win-search-handle:hover::after {
    opacity: 0.8;
  }

  /* 手机端关闭动画：弹窗（顶部小横条）向下滑到屏幕边缘后消失 */
  .search-popup-leave-active {
    transition: transform 0.26s cubic-bezier(0.32, 0.08, 0.24, 1), opacity 0.26s ease;
    will-change: transform, opacity;
  }
  .search-popup-leave-to {
    transform: translateY(100%);
    opacity: 0;
  }

  /* 拖拽释放到底后的关闭动画：手指松开时由 JS 添加 is-snapping-close 类触发，
     弹窗先向下滑到屏幕边缘再真正卸载。 */
  .win-search-popup.is-snapping-close {
    transform: translateY(100%) !important;
    opacity: 0 !important;
    transition: transform 0.26s cubic-bezier(0.32, 0.08, 0.24, 1), opacity 0.26s ease !important;
    will-change: transform, opacity;
  }

  /* 输入框 16px：避免 iOS Safari 点击搜索框时页面被自动放大 */
  .win-search-input {
    font-size: 16px;
  }

  /* 空白态内边距缩小，与搜索结果/无结果区域保持一致，确保三块内容区等宽 */
  .win-search-empty {
    padding: 12px 16px 8px 16px;
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

  /* 无结果提示与结果区域内边距一致，保持宽度统一 */
  .win-search-no-results {
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
