<template>
  <WinPage :title="title" :description="summary" pageKey="preface">
    <!-- 双栏布局：左正文 + 右目录 -->
    <div class="article-layout">
      <div class="article-main">
        <article class="preface" ref="prefaceEl">
      <p class="lede">
        你正在翻开的，不是一本晦涩的技术手册，而是一封写给「第一次与电脑相遇的人」的信。
      </p>

      <h2>为什么会有这本《全端启萌》</h2>
      <p>
        市面上的电脑教程，要么一上来就堆满术语，把新手劝退在门口；要么散落在各个论坛，
        东拼西凑、真伪难辨。我们想做一件简单的事：用最接地气的话，把一台电脑从拆箱到用顺的
        全过程，讲成一个谁都能跟得上的故事。
      </p>
      <p>
        它诞生于一个朴素的念头——<strong>每个人都应该被温柔地领进数字世界</strong>，
        而不是被默认「你本来就懂」。
      </p>

      <h2>这本书适合谁</h2>
      <ul>
        <li>第一次拥有自己的电脑，却不知从何下手的人；</li>
        <li>用了很久，却总在某个功能前卡住、不敢乱点的「老新手」；</li>
        <li>想从 Windows 换到 macOS、Linux 或鸿蒙，担心「换系统就抓瞎」的人；</li>
        <li>只是好奇：这台每天都在用的机器，到底是怎么运转的。</li>
      </ul>

      <h2>九大章，一条清晰的路</h2>
      <p>
        我们把内容编排成一条循序渐进的路径：从<strong>开箱初体验</strong>认识外观与接口，
        到系统、文件、网络、软件、效率、安全，再到进阶与跨平台。你不必从头读到尾——
        哪一章卡住了，就翻哪一章；读不懂的地方，右上角的<strong>搜索</strong>随时能帮你定位。
      </p>

      <h2>怎么用这本书</h2>
      <ul>
        <li><strong>搜索</strong>：顶部搜索框输入关键词（如「截屏」「连 Wi-Fi」），即刻找到对应章节；</li>
        <li><strong>收藏</strong>：遇到常看的内容，点开页面右上角的收藏星标，下次在首页「我的收藏」里一键直达；</li>
        <li><strong>按需翻阅</strong>：左侧导航按章分组，想温习哪节点哪节，进度会被自动记住；</li>
        <li><strong>换主题</strong>：喜欢深色或浅色？设置里一键切换，护眼又顺手。</li>
      </ul>

      <h2>关于「全端」</h2>
      <p>
        电脑早已不是某一家系统的天下。本书尽量同时覆盖 <strong>Windows、macOS、Linux 与鸿蒙</strong>，
        在差异处会明确标注「此处不同」，让你在任意设备上都不至于迷路。若某个界面的图标或说法和你手上的
        略有出入，那多半是版本更迭——核心思路始终一致。
      </p>

      <blockquote>
        愿这束光，照亮你与电脑相遇的每一刻。现在，从第一章开始吧。
      </blockquote>
    </article>
        <!-- 评论区（Waline） -->
        <div ref="walineBox" class="waline-box"></div>
        <WinCopyrightFooter />
      </div>
      <ArticleToc :container="prefaceEl" />
    </div>
  </WinPage>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, nextTick, ref } from 'vue';
import { init, type WalineInstance } from '@waline/client';
import '@waline/client/waline.css';
import WinPage from '../components/WinPage.vue';
import WinCopyrightFooter from '../components/WinCopyrightFooter.vue';
import ArticleToc from '../components/ArticleToc.vue';
import { isResolvedDark, onResolvedDarkChange } from '../composables/useWalineTheme';

const title = '序言';
const summary = '写给每一位第一次与电脑相遇的人：这本书 why、为谁、怎么读。';

// ===== Waline 评论区 =====
const walineBox = ref<HTMLElement | null>(null);
const prefaceEl = ref<HTMLElement | null>(null); // 正文容器 ref，传给 ArticleToc 提取标题
let waline: WalineInstance | null = null;
let offTheme: (() => void) | null = null;

onMounted(async () => {
  await nextTick();
  if (walineBox.value) {
    // 序言为独立页面，用固定 path 隔离评论
    const path = 'preface';
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
/* 大屏：目录是 fixed 钉在视口右上角（脱离此 flex），预留右侧空间避免正文被遮挡 */
@media (min-width: 1351px) {
  .article-layout {
    padding-right: 320px;
  }
}
.article-main {
  flex: 1;
  min-width: 0;
}

/* 让 WinPage 标题与正文同处一个 1040px 居中列，标题与正文左缘对齐 */
:deep(.win-page-head) {
  max-width: 1040px;
  margin-left: auto;
  margin-right: auto;
}

.preface {
  max-width: 720px;
  margin: 0; /* 桌面端左对齐，与标题左缘一致 */
  padding: 4px 4px 8px;
  overflow-wrap: break-word;
  word-break: break-word;
}
.preface :deep(h2) {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text-primary);
  margin: 32px 0 12px;
}
.preface :deep(p) {
  font-size: 15px;
  line-height: 1.78;
  color: var(--text-secondary);
  margin: 0 0 14px;
}
.preface :deep(ul) {
  margin: 0 0 14px;
  padding-left: 24px;
}
.preface :deep(li) {
  font-size: 15px;
  line-height: 1.78;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.preface :deep(strong) {
  color: var(--text-primary);
  font-weight: 600;
}
.preface :deep(blockquote) {
  margin: 0 0 14px;
  padding: 4px 0 4px 16px;
  border-left: 3px solid var(--accent-base);
  color: var(--text-secondary);
}
.lede {
  font-size: 17px !important;
  color: var(--text-primary) !important;
  line-height: 1.7 !important;
  padding: 8px 0 4px;
  border-bottom: 1px solid var(--stroke-divider);
  margin-bottom: 18px !important;
}
.waline-box {
  margin: 24px 0 0;
  padding: 0 4px;
}

/* 中小屏（目录在左侧导航栏） */
@media (max-width: 1350px) {
  .preface {
    margin: 0 auto;
  }
}
</style>
