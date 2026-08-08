<template>
  <WinTitleBar title="全端启萌" :theme="themeSetting" />
  <WinContextMenuSurface @request="onContextMenuRequest">
    <WinNavigationView v-model:selectedValue="currentPage"
                       :paneDisplayMode="navPosition"
                       :menuItems="navMenuItems"
                       :footerItems="footerMenuItems"
                       :isSettingsVisible="false"
                       :showBackButton="true">
      <!-- 左导航模式：搜索框在内容区顶部 -->
      <template #contentHeader>
        <WinSearchBox
          v-model:text="searchQuery"
          placeholder-text="搜索..."
          nav-mode="left"
          :active-page="currentPage"
          @querySubmitted="onQuerySubmitted" />
      </template>

      <!-- 顶导航模式：搜索框在顶部导航栏中 -->
      <template #topSearch>
        <div class="app-top-search">
          <WinSearchBox
            v-model:text="searchQuery"
            placeholder-text="搜索..."
            nav-mode="top"
            :active-page="currentPage"
            @querySubmitted="onQuerySubmitted" />
        </div>
      </template>

      <!-- 主内容区 -->
      <div v-if="pageComponent" :key="currentPage" class="page-container" :class="'page-anim-' + currentPage">
        <component :is="pageComponent" :class="pageAnimClass" />
      </div>
    </WinNavigationView>
  </WinContextMenuSurface>

  <!-- 全局中文右键菜单（WinUI MenuFlyout 风格） -->
  <WinContextMenu
    :open="contextMenuOpen"
    :anchor="contextMenuAnchor"
    :items="contextMenuItems"
    @close="closeContextMenu"
    @select="onContextMenuSelect" />

  <!-- 图片点击放大（灯箱）：不修改任何 .md 文章代码，由 App 统一接管 -->
  <transition name="img-lightbox-fade">
    <div v-if="lightboxSrc" class="img-lightbox" ref="lightboxEl" @click.self="closeLightbox">
      <button
        class="img-lightbox-close"
        type="button"
        aria-label="关闭"
        title="关闭"
        @click="closeLightbox">
        <span class="close-icon">{{ '\uE711' }}</span>
      </button>

      <!-- 缩放 / 复位工具条：点工具条不会关闭灯箱（@click.stop） -->
      <div class="img-lightbox-tools" @click.stop>
        <button class="lb-tool" type="button" title="放大" aria-label="放大" @click="zoomLightbox(1.3)">＋</button>
        <button class="lb-tool" type="button" title="缩小" aria-label="缩小" @click="zoomLightbox(1 / 1.3)">－</button>
        <button class="lb-tool" type="button" title="复位（原始大小）" aria-label="复位" @click="resetLightbox">⟲</button>
      </div>

      <img
        class="img-lightbox-img"
        :src="lightboxSrc"
        alt=""
        :style="lightboxImgStyle"
        @click.stop
        @wheel.prevent="onLightboxWheel"
        @mousedown="onLightboxDragStart"
        @touchstart.passive="onLightboxTouchStart"
        @touchmove.prevent="onLightboxTouchMove"
        @touchend="onLightboxTouchEnd" />
    </div>
  </transition>
</template>

<script setup>
import { ref, watch, provide, computed, nextTick, onMounted, onUnmounted } from 'vue';
import WinTitleBar from './components/WinTitleBar.vue';
import WinNavigationView from './components/WinNavigationView.vue';
import WinSearchBox from './components/WinSearchBox.vue';
import WinContextMenu from './components/WinContextMenu.vue';
import WinContextMenuSurface from './components/WinContextMenuSurface.vue';
import { i18nKey, createI18n } from './components/i18n';

import HomePage from './pages/HomePage.vue';
import SettingsPage from './pages/SettingsPage.vue';
import ArticlePage from './pages/ArticlePage.vue';
import PrefacePage from './pages/PrefacePage.vue';
import FavoritesPage from './pages/FavoritesPage.vue';
import RecentPage from './pages/RecentPage.vue';
import { getPageMeta, chapterArticles, chapterGroups, allPages } from './data/pages';
import { useContextMenu } from './composables/useContextMenu';

// ========== 页面路由表 ==========
// 所有 ch* 文章（由 src/content/*.md 生成）统一由 ArticlePage 渲染；
// App 用 :key="currentPage" 包裹会按章重挂载，ArticlePage 内部自动定位到文章顶部。
const pageMap = {
  home: HomePage,
  settings: SettingsPage,
  preface: PrefacePage,
  favorites: FavoritesPage,
  recent: RecentPage,
};
chapterArticles.forEach(p => {
  pageMap[p.key] = ArticlePage;
});

// ========== 左侧导航菜单 ==========
// 9 个卷分组，每卷下挂其 chapters（来自 chapterPlan，支持单卷增删章）
const chapterNavItems = chapterGroups.map(group => ({
  value: group.key,
  icon: group.icon,
  label: group.label,
  selectsOnInvoked: false,
  children: group.children.map(key => {
    const meta = getPageMeta(key);
    return {
      value: key,
      icon: meta?.icon || '\uE8A5',
      label: meta?.titleZh || meta?.title || key,
    };
  }),
}));

const navMenuItems = [
  { value: 'home', icon: '\uE80F', label: '首页' },
  { value: 'preface', icon: '\uE736', label: '序言' },
  ...chapterNavItems,
  { value: 'recent', icon: '\uE823', label: '最近访问' },
  { value: 'favorites', icon: '\uE734', label: '我的收藏' },
];

const footerMenuItems = [
  { value: 'settings', icon: '\uE713', label: '设置' },
];

// ========== 设置与状态 ==========
const storedPage = (typeof localStorage !== 'undefined') ? (localStorage.getItem('winui-current-page') || 'home') : 'home';
const currentPage = ref(storedPage);
provide('currentPage', currentPage);

// 刷新后停留在当前文章（而不是回到首页）
watch(currentPage, (v) => {
  try { localStorage.setItem('winui-current-page', v || 'home'); } catch { /* ignore */ }
});

const pageComponent = computed(() => pageMap[currentPage.value] || HomePage);

const readStored = (key, fallback) => {
  const v = localStorage.getItem(key);
  return v || fallback;
};

const themeSetting = ref(readStored('winui-theme', 'system'));
const navPosition = ref(readStored('winui-nav-position', 'Auto'));
const animSetting = ref(readStored('winui-anim', 'entrance'));

provide('themeSetting', themeSetting);
provide('navPosition', navPosition);
provide('animSetting', animSetting);
// 注入上游 WinUIonWeb 的 i18n（合并控件内部使用），默认中文
provide(i18nKey, createI18n('zh-CN'));

watch(themeSetting, (v) => {
  localStorage.setItem('winui-theme', v);
  const h = document.documentElement;
  h.classList.remove('theme-light', 'theme-dark');
  if (v === 'light') h.classList.add('theme-light');
  else if (v === 'dark') h.classList.add('theme-dark');
}, { immediate: true });

watch(navPosition, (v) => {
  localStorage.setItem('winui-nav-position', v);
});

watch(animSetting, (v) => {
  localStorage.setItem('winui-anim', v);
});

// 页面切换动画类映射
const pageAnimClass = computed(() => {
  const map = {
    entrance: 'page-transition-up',
    drill: 'page-transition-left',
    fade: 'page-transition-fade',
  };
  return map[animSetting.value] || 'page-transition-up';
});

// 搜索（WinSearchBox）
const searchQuery = ref('');
const onQuerySubmitted = (e) => {
  const item = e.chosenSuggestion;
  if (item && item.key && pageMap[item.key]) {
    currentPage.value = item.key;
  }
  searchQuery.value = '';
};

// 最近访问追踪
watch(currentPage, (newPage) => {
  if (!newPage || newPage === 'home') return;
  try {
    const raw = localStorage.getItem('winui-recent-pages');
    let list = raw ? JSON.parse(raw) : [];
    list = [newPage, ...list.filter(k => k !== newPage)].slice(0, 25);
    localStorage.setItem('winui-recent-pages', JSON.stringify(list));
  } catch { /* ignore */ }
});

// 切换页面时把持久滚动容器（.win-nav-content）滚到顶部，
// 使各页（如「最近访问」与「我的收藏」）滚动位置互不干扰、点击进入后均从最上方展示。
watch(currentPage, () => {
  nextTick(() => {
    const sc = document.querySelector('.win-nav-content');
    if (sc) sc.scrollTop = 0;
  });
});

// ========== 全局中文右键菜单（逻辑抽到 useContextMenu composable） ==========
const {
  contextMenuOpen,
  contextMenuAnchor,
  contextMenuItems,
  onContextMenuSelect,
  closeContextMenu,
  openContextMenu,
} = useContextMenu({
  currentPage,
  themeSetting,
  onToggleTheme: () => {
    const order = ['system', 'light', 'dark'];
    themeSetting.value = order[(order.indexOf(themeSetting.value) + 1) % 3];
  },
  onRefreshCurrent: () => {
    const k = currentPage.value;
    currentPage.value = '__ping__';
    nextTick(() => { currentPage.value = k; });
  },
});

const onContextMenuRequest = ({ clientX, clientY, target }) => {
  openContextMenu(clientX, clientY, target);
};

// ========== 锚点 hash 跳转（网址 #内容 直达） ==========
// 支持两种链接格式：
//   1) #page/anchor  —— 跨页跳转，如 #ch1-2/why  （先切到 ch1-2，再滚到 id=why 的小节）
//   2) #anchor      —— 当前页内跳转，如 #audience（仅当它不是某个页面 key 时）
// 页面 key 集合用于区分「跳页面」与「页内锚点」。
const knownPageKeys = new Set([
  ...allPages.map((p) => p.key),
  ...chapterArticles.map((a) => a.key),
]);

function parseHash() {
  const raw = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (!raw) return null;
  if (raw.includes('/')) {
    const parts = raw.split('/');
    return { page: parts[0] || null, anchor: parts[1] || null };
  }
  // 无斜杠：恰好是页面 key 则跳到该页顶部；否则当作当前页锚点
  if (knownPageKeys.has(raw)) return { page: raw, anchor: null };
  return { page: null, anchor: raw };
}

// 用 replaceState 改网址 # 片段（不触发 hashchange、不污染历史记录）。
// 切页时只写「页码」(#ch1-1)，小节(#ch1-1/first-look)由 ArticleToc 滚动时细化。
// 传入空串则清除片段（回到首页用）。
function setHash(hash) {
  const target = hash ? '#' + hash : '';
  const newUrl = location.pathname + location.search + target;
  if (location.hash === target) return;
  history.replaceState(null, '', newUrl);
}

// 滚动到目标 id（用浏览器原生 scrollIntoView，由它自己算最终位置，最稳）。
// 用重试等待：文章/序言是异步渲染的，标题 id 可能稍晚出现，最多等 ~1.5s。
function scrollToAnchor(anchor) {
  if (!anchor) return;
  let tries = 0;
  const tryScroll = () => {
    const el = document.getElementById(anchor);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (tries++ < 30) {
      setTimeout(tryScroll, 50);
    }
  };
  tryScroll();
}

function handleHashNavigation() {
  const target = parseHash();
  if (!target) return;
  const { page, anchor } = target;
  if (page && page !== currentPage.value && pageMap[page]) {
    currentPage.value = page; // 跨页：先切到目标页（组件会重挂载）
  }
  // 等页面切换/渲染后，再滚动到锚点。
  // 注意：App 与 ArticlePage 在切页时会把 .win-nav-content 滚到顶部，
  // 这里用 nextTick + 短延时让锚点滚动在「滚到顶部」之后生效（重试循环也会兜底）。
  nextTick(() => setTimeout(() => scrollToAnchor(anchor), 60));
}

onMounted(() => {
  handleHashNavigation();
  window.addEventListener('hashchange', handleHashNavigation);
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onDocKey);
});

// ========== 图片点击放大（灯箱） ==========
// 不修改任何 .md 文章代码：全局委托监听文章区域内 <img> 的点击，
// 打开全屏灯箱显示大图。关闭方式：点关闭按钮 / 点背景 / 按 Esc。
// 图片用 currentSrc（即 GitHub 挂了自动显示的图床兜底图），放大也对。
const lightboxSrc = ref('');
const lightboxEl = ref(null);
// 缩放 / 平移状态：scale=倍率，tx/ty=平移像素
const lightboxScale = ref(1);
const lightboxTX = ref(0);
const lightboxTY = ref(0);
const lightboxDragging = ref(false);
const lightboxImgStyle = computed(() => ({
  transform: `translate(${lightboxTX.value}px, ${lightboxTY.value}px) scale(${lightboxScale.value})`,
  cursor: lightboxScale.value > 1 ? (lightboxDragging.value ? 'grabbing' : 'grab') : 'default',
}));

function resetLightbox() {
  lightboxScale.value = 1;
  lightboxTX.value = 0;
  lightboxTY.value = 0;
}
// 以灯箱中心为锚点缩放（工具条按钮用）
function zoomLightbox(factor) {
  const s = Math.min(8, Math.max(0.5, lightboxScale.value * factor));
  const ratio = s / lightboxScale.value;
  lightboxScale.value = s;
  lightboxTX.value = ratio * lightboxTX.value;
  lightboxTY.value = ratio * lightboxTY.value;
  if (lightboxScale.value === 1) { lightboxTX.value = 0; lightboxTY.value = 0; }
}
// 滚轮缩放，以光标位置为锚点（桌面端）
function onLightboxWheel(e) {
  if (!lightboxEl.value) return;
  const rect = lightboxEl.value.getBoundingClientRect();
  const cx = e.clientX - rect.left - rect.width / 2;
  const cy = e.clientY - rect.top - rect.height / 2;
  const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
  const s = Math.min(8, Math.max(0.5, lightboxScale.value * factor));
  const ratio = s / lightboxScale.value;
  lightboxScale.value = s;
  lightboxTX.value = cx - ratio * (cx - lightboxTX.value);
  lightboxTY.value = cy - ratio * (cy - lightboxTY.value);
}
// 鼠标拖拽平移（仅放大后可用）
let lbDragLastX = 0;
let lbDragLastY = 0;
function onLightboxDragStart(e) {
  if (lightboxScale.value <= 1) return;
  lightboxDragging.value = true;
  lbDragLastX = e.clientX;
  lbDragLastY = e.clientY;
  window.addEventListener('mousemove', onLightboxDragMove);
  window.addEventListener('mouseup', onLightboxDragEnd);
}
function onLightboxDragMove(e) {
  if (!lightboxDragging.value) return;
  lightboxTX.value += e.clientX - lbDragLastX;
  lightboxTY.value += e.clientY - lbDragLastY;
  lbDragLastX = e.clientX;
  lbDragLastY = e.clientY;
}
function onLightboxDragEnd() {
  lightboxDragging.value = false;
  window.removeEventListener('mousemove', onLightboxDragMove);
  window.removeEventListener('mouseup', onLightboxDragEnd);
}
// 触摸：单指平移（放大后）/ 双指捏合缩放（移动端）
let lbTouchMode = null;
let lbTouchStartX = 0;
let lbTouchStartY = 0;
let lbTouchStartTX = 0;
let lbTouchStartTY = 0;
let lbTouchStartDist = 0;
let lbTouchStartScale = 1;
let lbTouchStartMidX = 0;
let lbTouchStartMidY = 0;
function lbTouchMid(t) {
  return { x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 };
}
function lbTouchDist(t) {
  return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
}
function onLightboxTouchStart(e) {
  if (e.touches.length === 1) {
    if (lightboxScale.value > 1) {
      lbTouchMode = 'pan';
      lbTouchStartX = e.touches[0].clientX;
      lbTouchStartY = e.touches[0].clientY;
      lbTouchStartTX = lightboxTX.value;
      lbTouchStartTY = lightboxTY.value;
    }
  } else if (e.touches.length === 2) {
    lbTouchMode = 'pinch';
    lbTouchStartDist = lbTouchDist(e.touches);
    lbTouchStartScale = lightboxScale.value;
    const mid = lbTouchMid(e.touches);
    lbTouchStartMidX = mid.x;
    lbTouchStartMidY = mid.y;
  }
}
function onLightboxTouchMove(e) {
  if (!lightboxEl.value) return;
  if (lbTouchMode === 'pan' && e.touches.length === 1) {
    lightboxTX.value = lbTouchStartTX + (e.touches[0].clientX - lbTouchStartX);
    lightboxTY.value = lbTouchStartTY + (e.touches[0].clientY - lbTouchStartY);
  } else if (lbTouchMode === 'pinch' && e.touches.length === 2) {
    const dist = lbTouchDist(e.touches);
    const mid = lbTouchMid(e.touches);
    const s = Math.min(8, Math.max(0.5, lbTouchStartScale * dist / lbTouchStartDist));
    const rect = lightboxEl.value.getBoundingClientRect();
    const cx = mid.x - rect.left - rect.width / 2;
    const cy = mid.y - rect.top - rect.height / 2;
    const ratio = s / lightboxScale.value;
    lightboxScale.value = s;
    lightboxTX.value = cx - ratio * (cx - lightboxTX.value);
    lightboxTY.value = cy - ratio * (cy - lightboxTY.value);
    lightboxTX.value += mid.x - lbTouchStartMidX;
    lightboxTY.value += mid.y - lbTouchStartMidY;
    lbTouchStartMidX = mid.x;
    lbTouchStartMidY = mid.y;
  }
}
function onLightboxTouchEnd(e) {
  if (e.touches.length === 0) {
    lbTouchMode = null;
  } else if (e.touches.length === 1) {
    lbTouchMode = 'pan';
    lbTouchStartX = e.touches[0].clientX;
    lbTouchStartY = e.touches[0].clientY;
    lbTouchStartTX = lightboxTX.value;
    lbTouchStartTY = lightboxTY.value;
  }
}

function openLightbox(src) {
  if (!src) return;
  resetLightbox();
  lightboxSrc.value = src;
}
function closeLightbox() {
  lightboxSrc.value = '';
  resetLightbox();
  onLightboxDragEnd();
  lbTouchMode = null;
}

function onDocClick(e) {
  const t = e.target;
  // 1) 代码块「复制」按钮（图标是 SVG，e.target 可能是 SVGPathElement，用 closest 兜底）
  const copyBtn = t && t.closest && t.closest('.copy-code-btn');
  if (copyBtn && copyBtn.closest('.win-nav-content')) {
    const block = copyBtn.closest('.code-block');
    const code = block && block.querySelector('pre code');
    if (code) copyCodeToClipboard(code.textContent, copyBtn);
    return;
  }
  // 2) 行内代码：点击文本即复制（控件即代码本身，避免打断句子）
  const inlineCode = t && t.closest && t.closest('code.inline-code, code[data-copy]');
  if (inlineCode && inlineCode.closest('.win-nav-content') && !inlineCode.closest('pre')) {
    copyCodeToClipboard(inlineCode.textContent, inlineCode);
    return;
  }
  // 3) 图片灯箱
  if (t instanceof HTMLElement && t.tagName === 'IMG' && t.closest('.win-nav-content')) {
    openLightbox(t.currentSrc || t.src);
  }
}

// ========== 代码块「复制」按钮 ==========
// 读取代码文本写入剪贴板；优先 navigator.clipboard（localhost / HTTPS 均安全上下文），
// 失败降级到临时 textarea + execCommand。成功后给按钮加 .copied 类（CSS 切到「已复制」图标）。
async function copyCodeToClipboard(text, btn) {
  let ok = false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      ok = true;
    } else {
      throw new Error('clipboard unavailable');
    }
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ok = document.execCommand('copy');
      document.body.removeChild(ta);
    } catch {
      ok = false;
    }
  }
  if (ok) {
    btn.classList.add('copied');
    setTimeout(() => btn.classList.remove('copied'), 1600);
  } else {
    btn.title = '复制失败，请手动选择';
  }
}
function onDocKey(e) { if (e.key === 'Escape') closeLightbox(); }

onUnmounted(() => {
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('keydown', onDocKey);
});

// 进入页面时把网址同步为 #页面（小节由 ArticleToc 滚动时细化成 #页面/小节）。
// 首页清除锚点（避免出现陈旧的 #ch1-1/xxx）。home 也在 knownPageKeys 中，
// 故先单独判断，确保首页 URL 干净。
watch(currentPage, (v) => {
  if (!v || v === '__ping__') return;
  if (v === 'home') {
    setHash('');
    return;
  }
  if (knownPageKeys.has(v)) {
    setHash(v);
  }
});
</script>

<style>
@import './styles/theme.css';
@import './styles/animations.css';

/* 图标字体已内联（styles/icon-font.css，base64 嵌入，零网络依赖）。
   以下用 !important 统一强制 LumenGuideIcons 优先，覆盖各组件 scoped 样式中
   遗漏 LumenGuideIcons 的 font-family 覆盖——这些覆盖在缺少 Segoe 字体的
   Mac / 手机上会渲染成豆腐块（正是“收藏/颜色/设置图标不显示”的根因）。 */
body .icon,
body .icon-btn,
body .ptr-icon-wrapper,
body .symbol-icon,
body .win-asb-icon,
body .win-symbol-icon,
body .win-expander-arrow,
body .close-icon,
body .infobadge-icon,
body .win-password-reveal span,
body .win-pull-to-refresh,
body .win-textbox-delete-glyph,
body .win-number-compact-indicator span,
body .win-number-popup-button span,
body .checkbox-box.is-checked:after,
body .checkbox-box.is-indeterminate:after,
body .radio-box.is-checked:after {
  font-family: 'LumenGuideIcons', 'Segoe Fluent Icons', 'Segoe MDL2 Assets', sans-serif !important;
}

.page-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* 顶导航模式：搜索框在导航栏中 */
.app-top-search {
  display: flex;
  align-items: center;
  margin-right: 8px;
  min-width: 0;
}

.app-top-search .win-search-box {
  width: 240px;
  max-width: 100%;
}

@media (max-width: 640px) {
  .app-top-search {
    margin-right: 0;
  }
  .app-top-search .win-search-box {
    width: 100%;
  }
}

/* ========== 图片灯箱（点击放大） ========== */
/* 浮层背景用不透明实色（非毛玻璃），遵守项目浮层材质规矩 */
.img-lightbox {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.92);
}

.img-lightbox-img {
  width: 92vw;
  height: 92vh;
  max-width: 92vw;
  max-height: 92vh;
  object-fit: contain;  /* 撑满视口且不变形；小图也会放大到最大 */
  border-radius: 8px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
  cursor: default;
  will-change: transform;
}

/* 缩放 / 复位工具条：不透明实色（遵守浮层材质规矩），主题自适应 */
.img-lightbox-tools {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  padding: 6px 10px;
  background: var(--flyout-bg);
  border: 1px solid var(--card-stroke);
  border-radius: 999px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  z-index: 10;
}
.lb-tool {
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--text-primary);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, transform 0.12s;
}
.lb-tool:hover { background: var(--subtle-pressed); }
.lb-tool:active { transform: scale(0.94); }

/* 关闭按键：用主题变量，亮/暗色自动适配（与 WinInfoBar 关闭图标同款 \uE711） */
.img-lightbox-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 34px;
  height: 34px;
  /* 关键：图片带 transform/will-change 会创建堆叠上下文并盖在按钮之上，
     必须显式抬高层级，放大后关闭按钮才能点得到 */
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--card-stroke);
  border-radius: 50%;
  background: var(--flyout-bg);
  color: var(--text-primary);
  cursor: pointer;
  transition: background 0.15s, transform 0.12s;
}
.img-lightbox-close:hover { background: var(--subtle-pressed); }
.img-lightbox-close:active { transform: scale(0.94); }
.img-lightbox-close .close-icon {
  font-family: 'LumenGuideIcons', 'Segoe MDL2 Assets', sans-serif; /* 关键：套图标字体，否则 X 不显示 */
  font-size: 16px;
  line-height: 1;
}

/* 移动端：图片更撑满、关闭按钮略大更好点、工具条稍大 */
@media (max-width: 640px) {
  .img-lightbox-img {
    width: 96vw;
    height: 96vh;
    max-width: 96vw;
    max-height: 96vh;
  }
  .img-lightbox-close {
    width: 40px;
    height: 40px;
    top: 12px;
    right: 12px;
  }
  .img-lightbox-close .close-icon { font-size: 20px; }
  .img-lightbox-tools { bottom: 16px; gap: 6px; padding: 5px 8px; }
  .lb-tool { width: 42px; height: 42px; font-size: 22px; }
}

/* 入场/退场：仅 opacity（不动 transform，避免破坏浮层渲染） */
.img-lightbox-fade-enter-active,
.img-lightbox-fade-leave-active { transition: opacity 0.18s ease; }
.img-lightbox-fade-enter-from,
.img-lightbox-fade-leave-to { opacity: 0; }
</style>
