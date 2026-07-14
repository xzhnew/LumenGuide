<template>
  <div class="intro-page" ref="introPage">
    <!-- ====== 首屏：Hero + 九大章（桌面端占满一屏） ====== -->
    <div class="home-top">
    <!-- ====== Hero（项目介绍） ====== -->
    <section class="hero">
      <div class="title-row">
        <h1><strong>全端启萌</strong></h1>
        <span class="en">LumenGuide</span>
      </div>
      <div class="subhead-wrap">
        <div class="subhead">每一台电脑的第一束光</div>
      </div>
      <p class="desc">
        从 Windows 到 macOS，从 Linux 到 HarmonyOS<br />
        用最接地气的方式，带你走进电脑的世界~<br />
      </p>
    </section>

    <!-- ====== 九大章 ====== -->
    <div class="section-head">
      <h2 class="section-title"><span class="icon section-icon">{{ '\uE8D9' }}</span>九大章</h2>
      <span class="section-sub">从开箱到精通，九步走进电脑世界</span>
    </div>
    <div class="chapter-grid">
      <button
        v-for="c in chapters"
        :key="c.key"
        class="chapter-card"
        @click="goPage(c.key)"
      >
        <span class="icon chapter-icon">{{ c.icon }}</span>
        <span class="chapter-name">{{ c.name }}</span>
        <span class="icon chapter-arrow">{{ '\uE76C' }}</span>
      </button>
    </div>
    </div><!-- /home-top -->

    <!-- ====== 桌面端两屏之间的柔和分割线 ====== -->
    <div class="home-horizon" aria-hidden="true"></div>

    <!-- ====== 第二屏：最近访问 / 精选收藏 / 页脚 ====== -->
    <div class="home-bottom" ref="homeBottom">
    <!-- ====== 最近访问 / 精选收藏 ====== -->
    <div class="rf-grid">
      <div class="sidebar-card">
        <h3 class="sidebar-title">
          <span class="icon">{{ '\uE823' }}</span>
          最近访问
          <WinHyperlinkButton class="sidebar-more" @click="goPage('recent')">查看全部</WinHyperlinkButton>
        </h3>
        <div v-if="!recentPages.length" class="sidebar-empty">暂无访问记录</div>
        <ul v-else class="sidebar-list">
          <li v-for="item in recentPages" :key="item.key" class="sidebar-item" @click="goPage(item.key)">
            <span class="icon sidebar-dot">{{ item.icon }}</span>
            <span class="sidebar-text">{{ item.titlePlain || item.titleZh || item.title }}</span>
          </li>
        </ul>
      </div>

      <div class="sidebar-card">
        <h3 class="sidebar-title">
          <span class="icon">{{ '\uE735' }}</span>
          精选收藏
          <WinHyperlinkButton class="sidebar-more" @click="goPage('favorites')">查看全部</WinHyperlinkButton>
        </h3>
        <div v-if="!featuredPages.length" class="sidebar-empty">暂无收藏</div>
        <ul v-else class="sidebar-list">
          <li v-for="item in featuredPages" :key="item.key" class="sidebar-item" @click="goPage(item.key)">
            <span class="icon sidebar-dot">{{ '\uE734' }}</span>
            <span class="sidebar-text">{{ item.titlePlain || item.titleZh || item.title }}</span>
          </li>
        </ul>
      </div>
    </div><!-- /rf-grid -->

    <!-- ====== 页脚（双开源协议） ====== -->
    <footer class="site-footer">
      <span>© 2026 全端启萌</span>
      <span class="license">
        灵感来源于
        <a :href="COURSE_URL" target="_blank" rel="noopener">《你缺失的那门计算机课》</a>
        · CC BY-NC-SA 4.0
        &nbsp;·&nbsp;
        基于
        <a :href="LUMENGUIDE_URL" target="_blank" rel="noopener"> WinUIonWeb </a>
        · GPL-3.0
      </span>
    </footer>
    </div><!-- /home-bottom -->
  </div>
</template>

<script setup>
import { computed, inject, onMounted, onUnmounted, ref } from 'vue';
import { getPageMeta, chapterGroups } from '../data/pages';
import { useFavorites } from '../composables/useFavorites';
import WinHyperlinkButton from '../components/WinHyperlinkButton.vue';

const currentPage = inject('currentPage');
const goPage = (key) => { if (currentPage) currentPage.value = key; };

// 模板 ref
const introPage = ref(null);
const homeBottom = ref(null);

// ====== 桌面端：平滑全屏翻页 + 滚动驱动过渡动画（上下都生效）======
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isDesktop = ref(false);
let navEl = null;
let ticking = false;
let pageIndex = 0;          // 0 = 首屏, 1 = 第二屏
let animating = false;
let rafScroll = null;
let cooldownUntil = 0;
let touchStartY = 0;

const maxScroll = () => (navEl ? navEl.scrollHeight - navEl.clientHeight : 0);
const targetTop = (idx) => (idx <= 0 ? 0 : maxScroll());
// 第二屏是否一屏放得下（放不下就退回原生滚动，避免长列表滚不到底）
const fitsScreen = () => {
  const el = homeBottom.value;
  return !!el && !!navEl && el.offsetHeight <= navEl.clientHeight - 8;
};

// 滚动进度 → 驱动首屏视差离场 / 光带过场 / 第二屏入场
const updateProgress = () => {
  ticking = false;
  if (!navEl || !introPage.value) return;
  const max = maxScroll();
  const st = navEl.scrollTop;
  const p = max > 0 ? Math.min(1, Math.max(0, st / max)) : 0;
  const ti = Math.max(0, 1 - Math.abs(p - 0.5) * 2);       // 过场强度：中段最强
  const bp = Math.min(1, Math.max(0, (p - 0.45) / 0.55));  // 第二屏入场进度
  const bpf = Math.min(1, Math.max(0, (p - 0.6) / 0.4));   // 页脚稍后入场（stagger）
  const s = introPage.value.style;
  s.setProperty('--p', p.toFixed(4));
  s.setProperty('--ti', ti.toFixed(4));
  s.setProperty('--bp', bp.toFixed(4));
  s.setProperty('--bpf', bpf.toFixed(4));
  if (!animating) pageIndex = p > 0.5 ? 1 : 0;             // 与手动滚动同步
};
const onScroll = () => {
  if (ticking) return;
  ticking = true;
  rafScroll = requestAnimationFrame(updateProgress);
};

// 缓动 + 平滑滚动到目标页（一次滑动 = 翻一页）
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const animateTo = (idx) => {
  if (!navEl || animating) return;
  idx = Math.max(0, Math.min(1, idx));
  if (idx === pageIndex && !animating) return;
  animating = true;
  const start = navEl.scrollTop;
  const end = targetTop(idx);
  const dur = reduceMotion ? 0 : 720;
  const t0 = performance.now();
  const step = (now) => {
    const t = dur === 0 ? 1 : Math.min(1, (now - t0) / dur);
    navEl.scrollTop = start + (end - start) * easeInOutCubic(t);
    updateProgress();
    if (t < 1) requestAnimationFrame(step);
    else { animating = false; pageIndex = idx; cooldownUntil = performance.now() + 300; }
  };
  requestAnimationFrame(step);
};

// 滚轮 / 触控板：桌面端接管滚动，轻滑一下翻一页
const onWheel = (e) => {
  if (!isDesktop.value || maxScroll() <= 0) return;
  if (!fitsScreen()) return;                 // 内容超屏 → 让原生滚动（动画仍由 scroll 监听驱动）
  e.preventDefault();
  if (animating || performance.now() < cooldownUntil) return;
  const dy = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
  if (Math.abs(dy) < 6) return;              // 忽略触控板噪声
  const dir = dy > 0 ? 1 : -1;
  if (dir > 0 && pageIndex >= 1) return;     // 已在末页
  if (dir < 0 && pageIndex <= 0) return;     // 已为首屏
  animateTo(pageIndex + dir);
};

const onTouchStart = (e) => { touchStartY = e.touches[0].clientY; };
const onTouchEnd = (e) => {
  if (!isDesktop.value || maxScroll() <= 0 || !fitsScreen()) return;
  const endY = (e.changedTouches[0] || {}).clientY ?? touchStartY;
  const dy = touchStartY - endY;
  if (Math.abs(dy) < 40 || animating) return;
  const dir = dy > 0 ? 1 : -1;
  if (dir > 0 && pageIndex >= 1) return;
  if (dir < 0 && pageIndex <= 0) return;
  animateTo(pageIndex + dir);
};

// 进入/离开桌面模式的完整切换（resize / 初始挂载共用）
const enterDesktop = () => {
  if (!navEl || reduceMotion) return;
  navEl.addEventListener('wheel', onWheel, { passive: false });
  navEl.addEventListener('touchstart', onTouchStart, { passive: true });
  navEl.addEventListener('touchend', onTouchEnd, { passive: true });
  navEl.addEventListener('scroll', onScroll, { passive: true });
  pageIndex = 0;
  animating = false;
  updateProgress();
};
const leaveDesktop = () => {
  if (!navEl) return;
  navEl.removeEventListener('wheel', onWheel);
  navEl.removeEventListener('touchstart', onTouchStart);
  navEl.removeEventListener('touchend', onTouchEnd);
  navEl.removeEventListener('scroll', onScroll);
  // 回滚所有状态，确保切回小屏/平板后内容正常可见
  animating = false;
  pageIndex = 0;
  cooldownUntil = 0;
  navEl.scrollTop = 0;
  if (introPage.value) {
    const s = introPage.value.style;
    s.removeProperty('--p');
    s.removeProperty('--ti');
    s.removeProperty('--bp');
    s.removeProperty('--bpf');
  }
  if (homeBottom.value) homeBottom.value.classList.remove('is-entered');
  if (rafScroll) { cancelAnimationFrame(rafScroll); rafScroll = null; }
  ticking = false;
};

const onResize = () => {
  const wasDesktop = isDesktop.value;
  isDesktop.value = window.matchMedia('(min-width: 1025px)').matches;
  if (wasDesktop && !isDesktop.value) leaveDesktop();
  else if (!wasDesktop && isDesktop.value) enterDesktop();
  else if (isDesktop.value) updateProgress(); // 桌面内 resize 只更新进度
};

const enableController = () => {
  navEl = document.querySelector('.win-nav-content');
  if (!navEl) return;
  isDesktop.value = window.matchMedia('(min-width: 1025px)').matches;
  window.addEventListener('resize', onResize);
  if (isDesktop.value) enterDesktop();
  else updateProgress();
};
const disableController = () => {
  leaveDesktop();
  window.removeEventListener('resize', onResize);
};
onMounted(() => requestAnimationFrame(enableController));
onUnmounted(disableController);

// 各章 -> 点击进入该章第 1 节
const chapters = chapterGroups.map(g => {
  const firstKey = g.children[0];
  const first = getPageMeta(firstKey);
  return { name: g.label, key: firstKey, icon: g.icon || first?.icon || '\uE8D9' };
});

// 最近访问（排除首页自身），固定 6 条
const getRecentHistory = () => {
  try {
    const raw = localStorage.getItem('winui-recent-pages');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};
const recentPages = computed(() =>
  getRecentHistory()
    .filter(k => k !== 'home')
    .map(key => getPageMeta(key))
    .filter(Boolean)
    .slice(0, 6)
);

// 精选收藏
const { pinnedFavoritesKeys } = useFavorites();
const featuredPages = computed(() =>
  pinnedFavoritesKeys.value
    .map(key => getPageMeta(key))
    .filter(Boolean)
);

const COURSE_URL = 'https://www.criwits.top/missing';
const LUMENGUIDE_URL = 'https://furry-xiyi.github.io/WinUIonWeb/';
</script>

<style scoped>
.intro-page {
  --brand: #0067C0;
  --brand-2: #4CC2FF;
  --p: 0;
  --ti: 0;
  --bp: 0;
  --bpf: 0;
  max-width: 1120px;
  margin: 0 auto;
  padding: 28px 0 40px;
}

/* ===== Hero ===== */
.hero {
  background: var(--card-bg-default);
  border: 1px solid var(--card-stroke);
  border-radius: 20px;
  padding: 60px 60px 48px;
  text-align: center;
  margin-bottom: 32px;
}
.title-row {
  display: flex;
  align-items: baseline;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px 20px;
  margin-bottom: 6px;
}
.title-row h1 {
  font-size: 3.2rem;
  font-weight: 300;
  letter-spacing: 1px;
  margin: 0;
  color: var(--text-primary);
}
.title-row h1 strong {
  font-weight: 600;
  background: linear-gradient(120deg, #0067C0 0%, #2B88D8 50%, #38BDF8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
.title-row .en {
  font-size: 1.2rem;
  font-weight: 300;
  color: var(--text-secondary);
  letter-spacing: 2px;
}
.subhead-wrap { text-align: center; }
.subhead {
  display: inline-block;
  text-align: left;
  font-size: 1.2rem;
  color: var(--text-secondary);
  font-weight: 300;
  margin: 4px 0 28px;
  border-left: 3px solid var(--brand);
  padding-left: 18px;
}
.desc {
  font-size: 1.05rem;
  color: var(--text-secondary);
  max-width: 720px;
  margin: 0 auto 8px;
  line-height: 1.8;
}

/* ===== 九大章 ===== */
.section-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin: 0 0 18px;
}
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.35rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}
.section-icon { font-size: 1.15rem; color: var(--accent-base); }
.section-sub { font-size: .9rem; color: var(--text-tertiary); }

.chapter-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 40px;
}
.chapter-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--card-bg-default);
  border: 1px solid var(--card-stroke);
  border-radius: 14px;
  padding: 18px 20px;
  font-size: 1.02rem;
  font-weight: 600;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: .15s;
}
.chapter-card:hover {
  background: color-mix(in srgb, var(--brand) 8%, transparent);
  border-color: color-mix(in srgb, var(--brand) 24%, transparent);
  color: var(--brand);
  transform: translateY(-2px);
}
.chapter-icon { font-size: 1.3rem; color: var(--accent-base); }
.chapter-name { flex: 1; }
.chapter-arrow { font-size: .9rem; color: var(--text-tertiary); transition: .15s; }
.chapter-card:hover .chapter-arrow { color: var(--brand); transform: translateX(3px); }

/* ===== 最近访问 / 精选收藏 ===== */
.rf-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 40px;
}
.sidebar-card {
  padding: 22px 24px;
  border-radius: 14px;
  background: var(--card-bg-default);
  border: 1px solid var(--card-stroke);
}
.sidebar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 14px;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.sidebar-title .icon { font-size: 15px; color: var(--text-secondary); }
.sidebar-title .sidebar-more { margin-left: auto; font-size: 12px; font-weight: 400; }
.sidebar-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--text-primary);
  cursor: pointer;
  padding: 9px 12px;
  border-radius: 6px;
  transition: background .15s;
  white-space: nowrap;
  overflow: hidden;
}
.sidebar-item:hover { background: var(--subtle-secondary); }
.sidebar-text { overflow: hidden; text-overflow: ellipsis; }
.sidebar-dot { font-size: 13px; color: var(--accent-base); flex-shrink: 0; }
.sidebar-empty {
  font-size: 13px;
  color: var(--text-tertiary);
  padding: 8px 0;
  text-align: center;
}

/* ===== 页脚 ===== */
.site-footer {
  margin-top: 8px;
  padding-top: 24px;
  border-top: 1px solid var(--card-stroke);
  font-size: .8rem;
  color: var(--text-tertiary);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 8px 16px;
}
.site-footer a {
  color: var(--text-secondary);
  text-decoration: none;
  transition: .15s;
}
.site-footer a:hover { color: var(--brand); }

/* ===== 入场动画（仅 CSS，不依赖 JS，失败也可见） ===== */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* 尊重"减少动画"偏好 */
@media (prefers-reduced-motion: reduce) {
  .hero, .chapter-grid, .rf-grid, .site-footer { animation: none; }
  .home-top .hero,
  .home-top .section-head,
  .home-top .chapter-grid {
    transform: none !important;
    filter: none !important;
    opacity: 1 !important;
  }
  .home-bottom .rf-grid,
  .home-bottom .site-footer {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
}

/* ===== 桌面端两屏布局（>1024px） =====
 * 首屏 .home-top 占满一屏（min-height 100vh - 顶栏高度）
 * 第二屏 .home-bottom 占满一屏
 * scroll-snap 让 .win-nav-content 滚动容器吸附到整屏切换，
 *   下滑/上滑直接进入对应屏，不显示中间过渡内容
 */
@media (min-width: 1025px) {
  .intro-page { --p: 0; --ti: 0; --bp: 0; --bpf: 0; }

  .home-top {
    height: calc(100vh - 24px);
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    padding-top: 16px;
  }

  /* 出屏：Hero 轻微缩放 + 模糊 + 上移（视差·慢） */
  .home-top .hero {
    transform: translateY(calc(var(--p) * -34px)) scale(calc(1 - var(--p) * 0.05));
    transform-origin: center top;
    filter: blur(calc(var(--p) * 3px));
    opacity: calc(1 - var(--p) * 0.35);
    will-change: transform, opacity, filter;
  }
  /* 出屏：九大章标题 + 卡片更快上移 + 淡出（视差·快） */
  .home-top .section-head,
  .home-top .chapter-grid {
    transform: translateY(calc(var(--p) * -90px));
    opacity: calc(1 - var(--p) * 0.55);
    will-change: transform, opacity;
  }

  /* 过场：品牌色光带，滚动中段最亮（南孚聚能环光感） */
  .home-horizon {
    display: block;
    height: 3px;
    width: 58%;
    margin: 4px auto;
    border-radius: 3px;
    background: linear-gradient(90deg,
      transparent 0%,
      var(--brand) 22%,
      var(--brand-2) 50%,
      var(--brand) 78%,
      transparent 100%);
    opacity: calc(0.12 + var(--ti) * 0.88);
    box-shadow: 0 0 calc(6px + var(--ti) * 26px) calc(var(--ti) * 5px)
      color-mix(in srgb, var(--brand) 55%, transparent);
  }

  .home-bottom {
    min-height: calc(100vh - 24px);
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding-top: 24px;
    padding-bottom: 24px;
  }

  /* 入屏：最近访问 / 精选收藏 随滚动连续上浮（一镜到底，上下都生效） */
  .home-bottom .rf-grid {
    opacity: var(--bp, 1);
    transform: translateY(calc((1 - var(--bp, 1)) * 46px));
    will-change: opacity, transform;
  }
  /* 页脚稍后入场，形成 stagger 错落 */
  .home-bottom .site-footer {
    opacity: var(--bpf, 1);
    transform: translateY(calc((1 - var(--bpf, 1)) * 30px));
    will-change: opacity, transform;
  }
}

/* 平板/小屏：单页连续滚动，不强制分屏 */
@media (max-width: 1024px) {
  .home-horizon { display: none; }
  .home-top, .home-bottom { height: auto; min-height: 0; }
  .chapter-grid { animation: fadeUp .6s ease .08s both; }
  .rf-grid { animation: fadeUp .6s ease .16s both; }
  .site-footer { animation: fadeUp .6s ease .24s both; }
}

/* ===== 浅色主题对比度修正 ===== */
html.theme-light .intro-page .title-row h1 strong {
  background: linear-gradient(120deg, #004E9A 0%, #0067C0 55%, #2B88D8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}

/* ===== 平板模式（641–1024px） ===== */
@media (min-width: 641px) and (max-width: 1024px) {
  .hero { padding: 20px 24px 16px; border-radius: 14px; margin-bottom: 18px; }
  .title-row h1 { font-size: 1.85rem; }
  .subhead { font-size: .95rem; margin-bottom: 16px; }
  .desc { font-size: .85rem; max-width: 560px; }
  .chapter-grid { gap: 10px; margin-bottom: 28px; }
  .chapter-card { padding: 13px 14px; font-size: .9rem; border-radius: 12px; gap: 8px; }
  .chapter-icon { font-size: 1.05rem; }
  .rf-grid { gap: 12px; margin-bottom: 28px; }
  .sidebar-card { padding: 16px 18px; border-radius: 12px; }
  .sidebar-title { font-size: 13.5px; margin: 0 0 10px; }
  .sidebar-item { padding: 6px 9px; font-size: 12.5px; }
}

/* ===== 小屏模式（≤640px） ===== */
@media (max-width: 640px) {
  .hero { padding: 32px 20px 28px; border-radius: 16px; }
  .title-row h1 { font-size: 2.2rem; }
  .title-row .en { font-size: 1rem; }
  .subhead { font-size: 1rem; padding-left: 14px; }
  .desc { font-size: .95rem; }
  .chapter-grid { grid-template-columns: 1fr; gap: 10px; margin-bottom: 28px; }
  .rf-grid { grid-template-columns: 1fr; gap: 14px; }
  .site-footer { flex-direction: column; text-align: center; }
}
</style>
