<template>
  <div class="recent-page">
    <!-- 标题区 -->
    <header class="recent-header">
      <div class="recent-title-row">
        <h1><span class="icon">{{ '\uE823' }}</span> 最近访问</h1>
        <button
          v-if="keys.length"
          class="recent-clear"
          @click="onClearAll">
          清空记录
        </button>
      </div>
      <p class="recent-sub">
        这里记录了你最近打开过的页面（最多保留 25 条）。
      </p>
    </header>

    <!-- 空态 -->
    <div v-if="!items.length" class="recent-empty">
      <div class="recent-empty-icon"><span class="icon">{{ '\uE823' }}</span></div>
      <div class="recent-empty-title">还没有访问记录</div>
      <div class="recent-empty-desc">打开任意文章后，它会显示在这里，方便你快速回到刚才看的地方。</div>
    </div>

    <!-- 访问列表（全部展示，可滚动） -->
    <ul v-else class="recent-list">
      <li
        v-for="item in items"
        :key="item.key"
        class="recent-item"
        @click="goPage(item.key)">
        <span class="icon recent-dot">{{ item.icon }}</span>
        <span class="recent-title">
          <span v-if="!isSmall && chapterOf(item)" class="recent-chapter">{{ chapterOf(item) }}</span><span v-if="!isSmall && chapterOf(item)" class="recent-sep">·</span>{{ titleOf(item) }}
        </span>

        <div class="recent-actions" @click.stop>
          <button
            class="recent-action fav-toggle"
            :class="{ 'is-fav': isFavorite(item.key) }"
            :title="isFavorite(item.key) ? '取消收藏' : '收藏'"
            @click="onToggleFav(item.key)">
            <span class="icon">{{ isFavorite(item.key) ? '\uE735' : '\uE734' }}</span>
          </button>
          <button
            class="recent-action"
            title="从记录中移除"
            @click="onRemove(item.key)">
            <span class="icon">{{ '\uE894' }}</span>
          </button>
        </div>
      </li>
    </ul>

    <WinCopyrightFooter />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref, type Ref } from 'vue';
import { getPageMeta, getChapterName, type PageMeta } from '../data/pages';
import { useFavorites } from '../composables/useFavorites';
import WinCopyrightFooter from '../components/WinCopyrightFooter.vue';

const currentPage = inject('currentPage') as Ref<string> | undefined;
const goPage = (key: string) => { if (currentPage) currentPage.value = key; };

// 小屏（<640px）由 WinNavigationView provide；小屏下只显示文章名，避免过长
const isSmallScreen = inject<Ref<boolean>>('isSmallScreen');
const isSmall = computed(() => !!isSmallScreen?.value);

// 收藏状态（用于列表项里的「收藏」星标按钮，与我的收藏页共享同一份数据）
const { isFavorite, toggleFavorite } = useFavorites();
function onToggleFav(key: string) {
  toggleFavorite(key);
}

const STORAGE_KEY = 'winui-recent-pages';

function readKeys(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function persist(list: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

// 当前记录（排除首页自身）
const keys = ref<string[]>(readKeys().filter(k => k !== 'home'));

const items = computed<PageMeta[]>(() =>
  keys.value
    .map(key => getPageMeta(key))
    .filter((m): m is PageMeta => !!m)
);

// 标题显示：非小屏且有章名时显示「章名·文章名」，否则仅文章名
const chapterOf = (item: PageMeta): string => getChapterName(item.key) || '';
const titleOf = (item: PageMeta): string => item.titlePlain || item.titleZh || item.title;

function onRemove(key: string) {
  keys.value = keys.value.filter(k => k !== key);
  persist(keys.value);
}

function onClearAll() {
  keys.value = [];
  persist([]);
}
</script>

<style scoped>
.recent-page {
  --brand: #0067C0;
  max-width: 860px;
  width: 100%;
  margin: 0 auto;
  padding: 8px 4px 40px;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.recent-header {
  margin-bottom: 20px;
}
.recent-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.recent-title-row h1 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.6rem;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}
.recent-title-row h1 .icon {
  font-size: 1.4rem;
  color: var(--accent-base);
}
.recent-sub {
  font-size: .9rem;
  color: var(--text-secondary);
  line-height: 1.7;
  margin: 0;
}
.recent-clear {
  margin-left: auto;
  flex-shrink: 0;
  font-family: inherit;
  font-size: .8rem;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--card-stroke);
  border-radius: 8px;
  padding: 4px 10px;
  cursor: pointer;
  transition: .15s;
}
.recent-clear:hover {
  color: #E5484D;
  border-color: color-mix(in srgb, #E5484D 40%, var(--card-stroke));
  background: color-mix(in srgb, #E5484D 10%, transparent);
}

/* 列表（可滚动） */
.recent-list {
  list-style: none;
  margin: 0;
  padding: 0 4px 0 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}
.recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--card-bg-default);
  border: 1px solid var(--card-stroke);
  border-radius: 12px;
  cursor: pointer;
  transition: background .15s, border-color .15s;
}
.recent-item:hover {
  background: var(--subtle-secondary);
  border-color: color-mix(in srgb, var(--brand) 24%, var(--card-stroke));
}
.recent-dot {
  font-size: 1.1rem;
  color: var(--accent-base);
  flex-shrink: 0;
}
.recent-title {
  font-size: .95rem;
  color: var(--text-primary);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.recent-chapter {
  color: var(--text-secondary);
  font-weight: 500;
}
.recent-sep {
  color: var(--accent-base);
  font-weight: 700;
  margin: 0 6px;
  opacity: .9;
}
.recent-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.recent-action {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: .15s;
  font-family: inherit;
}
.recent-action .icon {
  font-size: 1.05rem;
}
.recent-action:hover {
  background: var(--subtle-secondary);
  color: #E5484D;
}
.fav-toggle.is-fav {
  color: var(--accent-base);
}
.fav-toggle:hover:not(:disabled) {
  background: var(--subtle-secondary);
  color: var(--accent-base);
}

/* 空态 */
.recent-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-tertiary);
  text-align: center;
  padding: 40px 20px;
}
.recent-empty-icon .icon {
  font-size: 3rem;
  color: var(--card-stroke);
}
.recent-empty-title {
  font-size: 1.05rem;
  color: var(--text-secondary);
  font-weight: 600;
}
.recent-empty-desc {
  font-size: .85rem;
  max-width: 360px;
  line-height: 1.6;
}

@media (max-width: 640px) {
  .recent-title-row h1 { font-size: 1.35rem; }
  .recent-item { padding: 10px 12px; }
}
</style>
