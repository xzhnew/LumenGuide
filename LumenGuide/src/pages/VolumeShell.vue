<template>
  <WinPage :title="title" :description="desc" :pageKey="pageKey">
    <article class="volume">
      <slot />
      <div class="chapter-nav" v-if="prevKey || nextKey">
        <button v-if="prevKey" class="chapter-nav-btn" @click="goTo(prevKey)">← 上一章</button>
        <button v-if="nextKey" class="chapter-nav-btn" @click="goTo(nextKey)">下一章 →</button>
      </div>
    </article>
  </WinPage>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, nextTick, watch } from 'vue';
import WinPage from '../components/WinPage.vue';
import { getPageMeta, chapterPlan } from '../data/pages';

// 当前页面 key（如 ch1-2），由 App 注入；同一卷的多章共用本组件，
// 但 App 用 :key="currentPage" 包裹，切章会整体重挂载，故 onMounted 即可定位。
const currentPage = inject<{ value: string }>('currentPage');
const pageKey = computed(() => currentPage?.value || '');

const meta = computed(() => getPageMeta(pageKey.value));
const title = computed(() => meta.value?.titleZh || meta.value?.title || '文章');
const desc = computed(() => meta.value?.descZh || meta.value?.desc || '');

// 按 chapterPlan 顺序计算上一章 / 下一章
const orderedKeys = chapterPlan.flatMap((vol, i) => vol.chapters.map((_, t) => `ch${i + 1}-${t + 1}`));
const idx = computed(() => orderedKeys.indexOf(pageKey.value));
const prevKey = computed(() => (idx.value > 0 ? orderedKeys[idx.value - 1] : ''));
const nextKey = computed(() => (idx.value >= 0 && idx.value < orderedKeys.length - 1 ? orderedKeys[idx.value + 1] : ''));
const goTo = (k: string) => { if (currentPage && k) currentPage.value = k; };

// 只显示当前章（每章都是独立页面），并锚点定位
const scrollToCurrent = () => {
  if (!pageKey.value) return;
  const root = document.querySelector('.volume');
  if (root) {
    root.querySelectorAll<HTMLElement>('.chapter').forEach(el => {
      el.style.display = (el.id === pageKey.value) ? '' : 'none';
    });
  }
  const el = document.getElementById(pageKey.value);
  if (!el) return;

  const content = document.querySelector('.win-nav-content') as HTMLElement | null;
  const header = document.querySelector('.win-nav-content-header') as HTMLElement | null;
  const headerHeight = header ? header.getBoundingClientRect().height : 0;

  // 每卷第 1 章位于页面顶部，直接回到顶部即可保留页面标题；
  // 其他章滚动到标题下方，预留 sticky 搜索头高度 + 16px 间距。
  const match = pageKey.value.match(/^ch(\d+)-1$/);
  if (match) {
    content?.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    el.style.scrollMarginTop = `${headerHeight + 16}px`;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

onMounted(async () => {
  await nextTick();
  scrollToCurrent();
});

// 兜底：同卷内切章未触发 remount 时也跟随 pageKey 更新
watch(pageKey, async () => {
  await nextTick();
  scrollToCurrent();
});
</script>

<style scoped>
.volume {
  max-width: 760px;
  margin: 0 auto;
  padding: 4px 4px 48px;
}

/* ===== 章区块（由各 Volume{n}.vue 在 slot 中提供） ===== */
.volume :deep(.chapter) {
  scroll-margin-top: 16px;
  margin: 0 0 8px;
}
.volume :deep(.chapter-title) {
  font-size: 22px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text-primary);
  margin: 32px 0 12px;
  padding-top: 20px;
  border-top: 1px solid var(--stroke-divider);
}
.volume :deep(.chapter:first-child .chapter-title) {
  margin-top: 8px;
  padding-top: 0;
  border-top: none;
}

/* ===== 章正文排版 ===== */
.volume :deep(.chapter-body h3) {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--text-primary);
  margin: 22px 0 8px;
}
.volume :deep(.chapter-body p) {
  font-size: 15px;
  line-height: 1.75;
  color: var(--text-secondary);
  margin: 0 0 14px;
}
.volume :deep(.chapter-body ul),
.volume :deep(.chapter-body ol) {
  margin: 0 0 14px;
  padding-left: 24px;
}
.volume :deep(.chapter-body li) {
  font-size: 15px;
  line-height: 1.75;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.volume :deep(.chapter-body strong),
.volume :deep(.chapter-body b) {
  color: var(--text-primary);
  font-weight: 600;
}
.volume :deep(.chapter-body a) {
  color: var(--accent-base);
  text-decoration: none;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-base) 45%, transparent);
}
.volume :deep(.chapter-body a:hover) {
  border-bottom-color: var(--accent-base);
}
.volume :deep(.chapter-body blockquote) {
  margin: 0 0 14px;
  padding: 4px 0 4px 16px;
  border-left: 3px solid var(--accent-base);
  color: var(--text-secondary);
}
.volume :deep(.chapter-body code) {
  font-family: 'Cascadia Code', Consolas, 'Courier New', monospace;
  font-size: 13px;
  background: var(--subtle-secondary);
  border-radius: 4px;
  padding: 2px 6px;
}
.volume :deep(.chapter-body pre) {
  background: var(--subtle-secondary);
  border: 1px solid var(--card-stroke);
  border-radius: 8px;
  padding: 14px 16px;
  overflow: auto;
  margin: 0 0 14px;
}
.volume :deep(.chapter-body pre code) {
  background: transparent;
  padding: 0;
}
.volume :deep(.chapter-body img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 4px 0 14px;
}
.volume :deep(.chapter-body table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 14px;
  font-size: 14px;
}
.volume :deep(.chapter-body th),
.volume :deep(.chapter-body td) {
  border: 1px solid var(--card-stroke);
  padding: 8px 12px;
  text-align: left;
  color: var(--text-secondary);
}
.volume :deep(.chapter-body th) {
  background: var(--subtle-secondary);
  color: var(--text-primary);
  font-weight: 600;
}

/* ===== 上一章 / 下一章 导航 ===== */
.chapter-nav {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  max-width: 760px;
  margin: 24px auto 0;
  padding-top: 16px;
  border-top: 1px solid var(--stroke-divider);
}
.chapter-nav-btn {
  font-family: inherit;
  font-size: 14px;
  color: var(--accent-base);
  background: var(--subtle-secondary);
  border: 1px solid var(--card-stroke);
  border-radius: 8px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background .15s, border-color .15s;
}
.chapter-nav-btn:hover {
  background: color-mix(in srgb, var(--accent-base) 10%, transparent);
  border-color: color-mix(in srgb, var(--accent-base) 35%, var(--card-stroke));
}
</style>
