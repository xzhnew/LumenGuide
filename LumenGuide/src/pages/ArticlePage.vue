<template>
  <WinPage :title="title" :description="summary" :pageKey="pageKey">
    <!-- 双栏布局：左正文 + 右目录 -->
    <div class="article-layout">
      <div class="article-main">
        <article class="article" ref="articleEl" v-html="html"></article>
        <div class="chapter-nav" v-if="prevKey || nextKey">
          <button v-if="prevKey" class="chapter-nav-btn" @click="goTo(prevKey)">← 上一篇</button>
          <button v-if="nextKey" class="chapter-nav-btn" @click="goTo(nextKey)">下一篇 →</button>
        </div>
        <!-- 评论区（Waline） -->
        <div ref="walineBox" class="waline-box"></div>
        <!-- 版权说明（设置页除外，每一页都展示） -->
        <WinCopyrightFooter />
      </div>
      <ArticleToc :container="articleEl" />
    </div>
  </WinPage>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, nextTick, ref } from 'vue';
import { init, type WalineInstance } from '@waline/client';
import '@waline/client/waline.css';
import WinPage from '../components/WinPage.vue';
import WinCopyrightFooter from '../components/WinCopyrightFooter.vue';
import ArticleToc from '../components/ArticleToc.vue';
import { getPageMeta, chapterArticles } from '../data/pages';
import { getMarkdownArticle } from '../data/markdownArticles';
import { isResolvedDark, onResolvedDarkChange } from '../composables/useWalineTheme';

// 当前页面 key（如 ch1-2），由 App 注入；App 用 :key="currentPage" 包裹，
// 切章会整体重挂载，故 onMounted 即可定位到文章顶部。
const currentPage = inject<{ value: string }>('currentPage');
const pageKey = computed(() => currentPage?.value || '');

const article = computed(() => getMarkdownArticle(pageKey.value));
const meta = computed(() => getPageMeta(pageKey.value));
const title = computed(() => article.value?.title || meta.value?.titleZh || meta.value?.title || '文章');
const summary = computed(() => article.value?.summary || meta.value?.descZh || '');
const html = computed(() => article.value?.html || '<p class="article-empty">这篇文章还没有内容，去 <code>src/content/</code> 添加对应的 .md 文件吧。</p>');

// 按 chapterArticles 顺序计算上一章 / 下一章（与导航、收藏 key 一致）
const orderedKeys = chapterArticles.map(a => a.key);
const idx = computed(() => orderedKeys.indexOf(pageKey.value));
const prevKey = computed(() => (idx.value > 0 ? orderedKeys[idx.value - 1] : ''));
const nextKey = computed(() => (idx.value >= 0 && idx.value < orderedKeys.length - 1 ? orderedKeys[idx.value + 1] : ''));
const goTo = (k: string) => { if (currentPage && k) currentPage.value = k; };

// ===== Waline 评论区 =====
const walineBox = ref<HTMLElement | null>(null);
const articleEl = ref<HTMLElement | null>(null); // 正文容器 ref，传给 ArticleToc 提取标题
let waline: WalineInstance | null = null;
let offTheme: (() => void) | null = null;

// 进入文章滚到顶部（内容区为 .win-nav-content）
onMounted(async () => {
  await nextTick();
  const content = document.querySelector('.win-nav-content') as HTMLElement | null;
  if (content) content.scrollTo({ top: 0 });
  else window.scrollTo({ top: 0 });

  // 初始化 Waline 评论区（SPA 每次进入文章页都会 onMounted，按当前文章 path 独立加载评论）
  if (walineBox.value) {
    // 用文章 key 作为独立评论路径，避免所有文章共用同一评论区
    const path = pageKey.value || window.location.pathname;
    waline = init({
      el: walineBox.value,
      serverURL: 'https://speak.oxzh.top',
      path,
      // 跟随应用明暗（含 system 跟随系统）
      dark: isResolvedDark(),
      lang: 'zh-CN',
      commentSorting: 'latest',
    });
    // 注意：Waline 的 update 若不显式传 path，会回退到 window.location.pathname
    // （SPA 下是 /LumenGuide/），导致评论列表按错路径重拉而「刷没」。必须带上原 path。
    offTheme = onResolvedDarkChange((d) => waline?.update({ dark: d, path }));
  }
});

onUnmounted(() => {
  offTheme?.();
  offTheme = null;
  waline?.destroy();
  waline = null;
});
</script>

<style scoped>
/* ===== 双栏布局：左正文（目录已固定到视口右上角，右侧预留空间） ===== */
.article-layout {
  display: flex;
  gap: 32px;
  align-items: flex-start;
  max-width: 1040px;
  margin: 0 auto;
}
/* 大屏：目录是 fixed 钉在视口右上角（脱离此 flex），预留右侧空间避免正文/评论被遮挡 */
@media (min-width: 1351px) {
  .article-layout {
    padding-right: 320px;
  }
}
.article-main {
  flex: 1;
  min-width: 0; /* 防止 flex 子项溢出 */
}

/* 让 WinPage 标题与正文同处一个 1040px 居中列，标题与正文左缘对齐 */
:deep(.win-page-head) {
  max-width: 1040px;
  margin-left: auto;
  margin-right: auto;
}

.article {
  max-width: 720px;
  margin: 0; /* 桌面端左对齐，与标题左缘一致 */
  padding: 4px 4px 8px;
  /* 长单词 / 长 URL 在窄屏自动换行，避免横向溢出 */
  overflow-wrap: break-word;
  word-break: break-word;
}

/* ===== 文章正文排版（与 VolumeShell 一致，作用于 markdown-it 生成的 HTML） ===== */
.article :deep(h1) {
  font-size: 26px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--text-primary);
  margin: 8px 0 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--stroke-divider);
}
.article :deep(h2) {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text-primary);
  margin: 32px 0 12px;
}
.article :deep(h3) {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--text-primary);
  margin: 22px 0 8px;
}
.article :deep(p) {
  font-size: 15px;
  line-height: 1.78;
  color: var(--text-secondary);
  margin: 0 0 14px;
}
.article :deep(ul),
.article :deep(ol) {
  margin: 0 0 14px;
  padding-left: 24px;
}
.article :deep(li) {
  font-size: 15px;
  line-height: 1.78;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.article :deep(strong),
.article :deep(b) {
  color: var(--text-primary);
  font-weight: 600;
}
.article :deep(a) {
  color: var(--accent-base);
  text-decoration: none;
  border-bottom: 1px solid color-mix(in srgb, var(--accent-base) 45%, transparent);
  overflow-wrap: anywhere;
  word-break: break-word;
}
.article :deep(a:hover) {
  border-bottom-color: var(--accent-base);
}
.article :deep(blockquote) {
  margin: 0 0 14px;
  padding: 4px 0 4px 16px;
  border-left: 3px solid var(--accent-base);
  color: var(--text-secondary);
}
.article :deep(code) {
  font-family: 'Cascadia Code', Consolas, 'Courier New', monospace;
  font-size: 13px;
  background: var(--subtle-secondary);
  border-radius: 4px;
  padding: 2px 6px;
}
.article :deep(pre) {
  background: var(--subtle-secondary);
  border: 1px solid var(--card-stroke);
  border-radius: 8px;
  padding: 14px 16px;
  overflow: auto;
  margin: 0 0 14px;
}
.article :deep(pre code) {
  background: transparent;
  padding: 0;
}
.article :deep(img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 4px 0 14px;
}
.article :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 14px;
  font-size: 14px;
}
.article :deep(th),
.article :deep(td) {
  border: 1px solid var(--card-stroke);
  padding: 8px 12px;
  text-align: left;
  color: var(--text-secondary);
}
.article :deep(th) {
  background: var(--subtle-secondary);
  color: var(--text-primary);
  font-weight: 600;
}
.article :deep(hr) {
  border: none;
  border-top: 1px solid var(--stroke-divider);
  margin: 24px 0;
}
.article-empty {
  color: var(--text-tertiary);
}

/* ===== 上一章 / 下一章 导航 ===== */
.chapter-nav {
  display: flex;
  gap: 12px;
  justify-content: space-between;
  margin: 24px 0 0;
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

/* ===== Waline 评论区容器 ===== */
.waline-box {
  margin: 32px 0 0;
  padding-top: 16px;
  border-top: 1px solid var(--stroke-divider);
}

/* 中小屏（目录在左侧导航栏，隐藏时无需额外处理） */
@media (max-width: 1350px) {
  .article {
    margin: 0 auto;
  }
}
</style>
