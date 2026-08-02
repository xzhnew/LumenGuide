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
          @querySubmitted="onQuerySubmitted" />
      </template>

      <!-- 顶导航模式：搜索框在顶部导航栏中 -->
      <template #topSearch>
        <div class="app-top-search">
          <WinSearchBox
            v-model:text="searchQuery"
            placeholder-text="搜索..."
            nav-mode="top"
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
</template>

<script setup>
import { ref, watch, provide, computed, nextTick, onMounted } from 'vue';
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
</style>
