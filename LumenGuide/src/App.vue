<template>
  <WinTitleBar title="全端启萌" :theme="themeSetting" />
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

  <!-- 全局中文右键菜单（WinUI MenuFlyout 风格） -->
  <WinContextMenu
    :open="contextMenuOpen"
    :anchor="contextMenuAnchor"
    :items="contextMenuItems"
    @close="closeContextMenu"
    @select="onContextMenuSelect" />
</template>

<script setup>
import { ref, watch, provide, computed, nextTick, onMounted, onBeforeUnmount } from 'vue';
import WinTitleBar from './components/WinTitleBar.vue';
import WinNavigationView from './components/WinNavigationView.vue';
import WinSearchBox from './components/WinSearchBox.vue';
import WinContextMenu from './components/WinContextMenu.vue';

import HomePage from './pages/HomePage.vue';
import SettingsPage from './pages/SettingsPage.vue';
import Volume1 from './pages/Volume1.vue';
import Volume2 from './pages/Volume2.vue';
import Volume3 from './pages/Volume3.vue';
import Volume4 from './pages/Volume4.vue';
import Volume5 from './pages/Volume5.vue';
import Volume6 from './pages/Volume6.vue';
import Volume7 from './pages/Volume7.vue';
import Volume8 from './pages/Volume8.vue';
import Volume9 from './pages/Volume9.vue';
import { chapterArticles, chapterPlan } from './data/pages';
import { useContextMenu } from './composables/useContextMenu.js';

// ========== 页面路由表 ==========
// 每章 key 映射到其所属卷的 Volume 组件；同一卷多章共用一个组件，
// App 用 :key="currentPage" 包裹会按章重挂载，组件内自动锚点定位到对应章。
const volumeComponents = {
  1: Volume1, 2: Volume2, 3: Volume3, 4: Volume4, 5: Volume5,
  6: Volume6, 7: Volume7, 8: Volume8, 9: Volume9,
};
const pageMap = {
  home: HomePage,
  settings: SettingsPage,
};
chapterArticles.forEach(p => {
  const m = p.key.match(/^ch(\d+)-/);
  const n = m ? parseInt(m[1], 10) : 1;
  pageMap[p.key] = volumeComponents[n] || Volume1;
});

// ========== 左侧导航菜单 ==========
// 9 个卷分组，每卷下挂其 chapters（来自 chapterPlan，支持单卷增删章）
const chapterNavItems = chapterPlan.map((vol, i) => {
  const n = i + 1;
  const volIcon = chapterArticles.find(p => p.key === `ch${n}-1`)?.icon || '\uE8D9';
  const children = vol.chapters.map((chTitle, t) => {
    const key = `ch${n}-${t + 1}`;
    const meta = chapterArticles.find(p => p.key === key);
    return {
      value: key,
      icon: meta?.icon || '\uE8A5',
      label: chTitle,
    };
  });
  return {
    value: `vol${n}`,
    icon: volIcon,
    label: vol.name,
    selectsOnInvoked: false,
    children,
  };
});

const navMenuItems = [
  { value: 'home', icon: '\uE80F', label: '首页' },
  ...chapterNavItems,
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
    list = [newPage, ...list.filter(k => k !== newPage)].slice(0, 10);
    localStorage.setItem('winui-recent-pages', JSON.stringify(list));
  } catch { /* ignore */ }
});

// ========== 全局中文右键菜单（逻辑抽到 useContextMenu composable） ==========
const {
  contextMenuOpen,
  contextMenuAnchor,
  contextMenuItems,
  onContextMenuSelect,
  closeContextMenu,
  onGlobalContextMenu,
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

onMounted(() => {
  document.addEventListener('contextmenu', onGlobalContextMenu, true);
});

onBeforeUnmount(() => {
  document.removeEventListener('contextmenu', onGlobalContextMenu, true);
});
</script>

<style>
@import './styles/theme.css';
@import './styles/animations.css';

@font-face {
  font-family: 'LumenGuideIcons';
  src: url('./assets/Fonts/SEGOEICONS.TTF') format('truetype');
  font-display: block;
}

body .icon,
body .icon-btn,
body .ptr-icon-wrapper {
  font-family: 'LumenGuideIcons', 'Segoe Fluent Icons', 'Segoe MDL2 Assets', sans-serif;
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
