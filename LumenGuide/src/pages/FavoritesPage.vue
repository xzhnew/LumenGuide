<template>
  <div class="fav-page">
    <!-- 标题区 -->
    <header class="fav-header">
      <h1><span class="icon">{{ '\uE734' }}</span> 我的收藏</h1>
      <p class="fav-sub">
        这里收藏了你手动收藏的全部内容。
        <span class="fav-pin-hint">点 <span class="icon pin-inline">{{ '\uE735' }}</span> 可把常用项设为「精选」——精选最多 {{ maxPinned }} 个，会显示在首页与搜索框的「精选收藏」里。</span>
      </p>
    </header>

    <!-- 空态 -->
    <div v-if="!items.length" class="fav-empty">
      <div class="fav-empty-icon"><span class="icon">{{ '\uE734' }}</span></div>
      <div class="fav-empty-title">还没有收藏</div>
      <div class="fav-empty-desc">在任意文章页右上角点 <span class="icon pin-inline">{{ '\uE734' }}</span> 即可收藏，之后会显示在这里。</div>
    </div>

    <!-- 收藏列表（全部展示，可滚动） -->
    <ul v-else class="fav-list">
      <li
        v-for="item in items"
        :key="item.key"
        class="fav-item"
        @click="goPage(item.key)">
        <span class="icon fav-dot">{{ item.icon }}</span>
        <span class="fav-title">
          <span v-if="!isSmall && chapterOf(item)" class="fav-chapter">{{ chapterOf(item) }}</span><span v-if="!isSmall && chapterOf(item)" class="fav-sep">·</span>{{ titleOf(item) }}
        </span>

        <div class="fav-actions" @click.stop>
          <button
            class="fav-action"
            :class="{ 'is-pinned': isPinned(item.key) }"
            :title="isPinned(item.key) ? '取消精选' : '设为精选'"
            :disabled="!isPinned(item.key) && pinnedFull"
            @click="onTogglePin(item.key)">
            <span class="icon">{{ isPinned(item.key) ? '\uE735' : '\uE734' }}</span>
          </button>
          <button
            class="fav-action fav-remove"
            title="取消收藏"
            @click="onRemove(item.key)">
            <span class="icon">{{ '\uE894' }}</span>
          </button>
        </div>
      </li>
    </ul>

    <!-- 精选已满提示 -->
    <div v-if="pinnedFull && items.length" class="fav-pin-tip">
      精选已选满 {{ maxPinned }} 个，取消一个精选后才能再选新项。
    </div>

    <WinCopyrightFooter />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, type Ref } from 'vue';
import { getPageMeta, getChapterName, type PageMeta } from '../data/pages';
import { useFavorites, MAX_PINNED } from '../composables/useFavorites';
import WinCopyrightFooter from '../components/WinCopyrightFooter.vue';

const currentPage = inject('currentPage') as Ref<string> | undefined;
const goPage = (key: string) => { if (currentPage) currentPage.value = key; };

// 小屏（<640px）由 WinNavigationView provide；小屏下只显示文章名，避免过长
const isSmallScreen = inject<Ref<boolean>>('isSmallScreen');
const isSmall = computed(() => !!isSmallScreen?.value);

const { favorites, pinned, isPinned, togglePin, removeFavorite } = useFavorites();

const maxPinned = MAX_PINNED;
const pinnedFull = computed(() => pinned.value.length >= MAX_PINNED);

// 全部收藏（排除首页自身），全部展示、不截断
const items = computed<PageMeta[]>(() =>
  favorites.value
    .filter(k => k !== 'home')
    .map(key => getPageMeta(key))
    .filter((m): m is PageMeta => !!m)
);

// 收藏项显示标题：非小屏且有章名时显示「章名·文章名」（如「开箱与初见·开箱初体验」），
// 否则仅显示文章名（小屏下避免过长）。章名与文章名之间用带颜色的「·」分隔，更醒目。
const chapterOf = (item: PageMeta): string => getChapterName(item.key) || '';
const titleOf = (item: PageMeta): string => item.titlePlain || item.titleZh || item.title;

function onTogglePin(key: string) {
  togglePin(key);
}

function onRemove(key: string) {
  removeFavorite(key);
}
</script>

<style scoped>
.fav-page {
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

.fav-header {
  margin-bottom: 20px;
}
.fav-header h1 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.6rem;
  font-weight: 600;
  margin: 0 0 8px;
  color: var(--text-primary);
}
.fav-header h1 .icon {
  font-size: 1.4rem;
  color: var(--accent-base);
}
.fav-sub {
  font-size: .9rem;
  color: var(--text-secondary);
  line-height: 1.7;
  margin: 0;
}
.fav-pin-hint {
  color: var(--text-tertiary);
}
.pin-inline {
  font-size: .85em;
  color: var(--accent-base);
  vertical-align: -1px;
}

/* 列表（可滚动） */
.fav-list {
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
.fav-item {
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
.fav-item:hover {
  background: var(--subtle-secondary);
  border-color: color-mix(in srgb, var(--brand) 24%, var(--card-stroke));
}
.fav-dot {
  font-size: 1.1rem;
  color: var(--accent-base);
  flex-shrink: 0;
}
.fav-title {
  font-size: .95rem;
  color: var(--text-primary);
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fav-chapter {
  color: var(--text-secondary);
  font-weight: 500;
}
.fav-sep {
  color: var(--accent-base);
  font-weight: 700;
  margin: 0 6px;
  opacity: .9;
}
.fav-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.fav-action {
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
.fav-action .icon {
  font-size: 1.05rem;
}
.fav-action:hover:not(:disabled) {
  background: var(--subtle-secondary);
  color: var(--accent-base);
}
.fav-action.is-pinned {
  color: var(--accent-base);
}
.fav-action:disabled {
  opacity: .35;
  cursor: not-allowed;
}
.fav-remove:hover:not(:disabled) {
  color: #E5484D;
  background: color-mix(in srgb, #E5484D 12%, transparent);
}

/* 空态 */
.fav-empty {
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
.fav-empty-icon .icon {
  font-size: 3rem;
  color: var(--card-stroke);
}
.fav-empty-title {
  font-size: 1.05rem;
  color: var(--text-secondary);
  font-weight: 600;
}
.fav-empty-desc {
  font-size: .85rem;
  max-width: 360px;
  line-height: 1.6;
}

.fav-pin-tip {
  margin-top: 12px;
  padding: 10px 14px;
  font-size: .82rem;
  color: var(--text-tertiary);
  background: var(--subtle-secondary);
  border-radius: 8px;
  text-align: center;
}

@media (max-width: 640px) {
  .fav-header h1 { font-size: 1.35rem; }
  .fav-item { padding: 10px 12px; }
}
</style>
