<template>
  <div>
    <div class="win-page-head" v-if="!noHeader">
      <h1 class="win-page-title">{{ title }}</h1>
      <p v-if="description" class="win-page-desc">{{ description }}</p>
      <div class="win-page-actions" v-if="showActions">
        <!-- 主题切换 -->
        <WinButton
          subtle
          @click="toggleTheme"
          style="width: 32px; height: 32px; padding: 0; min-width: 0;"
          :aria-label="pageTheme === 'dark' ? '切换到浅色主题' : '切换到深色主题'">
          <span class="icon">{{ '\uE793' }}</span>
        </WinButton>
        <!-- 收藏 -->
        <WinToggleButton
          v-model="isFavoriteState"
          subtle
          @click.stop="toggleFav"
          style="width: 32px; height: 32px; padding: 0; min-width: 0;"
          :aria-label="isFavoriteState ? '取消收藏' : '添加收藏'">
          <span class="icon">{{ isFavoriteState ? '\uE735' : '\uE734' }}</span>
        </WinToggleButton>
      </div>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject, watch } from 'vue';
import WinButton from './WinButton.vue';
import WinToggleButton from './WinToggleButton.vue';
import { useFavorites } from '../composables/useFavorites';

const props = withDefaults(defineProps<{
  title?: string;
  description?: string;
  /** 页面 key，用于收藏。不传则不显示收藏按钮 */
  pageKey?: string;
  /** 是否隐藏整个头部 */
  noHeader?: boolean;
  /** 是否显示操作按钮（主题+收藏）。当 noHeader 为 true 时自动隐藏 */
  showActions?: boolean;
}>(), {
  showActions: true
});

// 收集当前页面标识
const injectedPage = inject<{ value: string }>('currentPage');
const resolvedPageKey = computed(() => props.pageKey || injectedPage?.value || '');

// 收藏
const { isFavorite: checkFavorite, toggleFavorite: _toggleFavorite } = useFavorites();
const isFavorite = computed(() => resolvedPageKey.value ? checkFavorite(resolvedPageKey.value) : false);
const isFavoriteState = ref(isFavorite.value);

watch(isFavorite, (v) => { isFavoriteState.value = v; });

// 点击收藏按钮时传入正确的 pageKey
const toggleFav = () => {
  if (resolvedPageKey.value) {
    const newState = _toggleFavorite(resolvedPageKey.value);
    isFavoriteState.value = newState;
  }
};

// 主题 -- 直接操作全局 themeSetting，与 App.vue 和设置页保持一致
const themeSetting = inject<{ value: string }>('themeSetting');
const pageTheme = computed(() => themeSetting?.value || 'system');

const toggleTheme = () => {
  if (!themeSetting) return;
  const order = ['system', 'light', 'dark'];
  const idx = order.indexOf(themeSetting.value);
  themeSetting.value = order[(idx + 1) % 3];
};
</script>

<style scoped>
.win-page-head {
  position: relative;
  margin-bottom: 4px;
}

.win-page-title {
  font-size: 28px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--text-primary);
  /* 给右上角绝对定位的操作按钮（主题/收藏，约 72px 宽）留出空间，
     避免窄屏下长标题与按钮重叠 */
  padding-right: 76px;
}

.win-page-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 16px 0;
  line-height: 1.5;
}

.win-page-actions {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  gap: 4px;
  align-items: center;
}

.icon {
  font-size: 16px;
  font-family: 'Segoe Fluent Icons', 'Segoe MDL2 Assets';
}
</style>
