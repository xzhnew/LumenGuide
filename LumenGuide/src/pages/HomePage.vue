<template>
  <div class="intro-page">
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
    <div class="section-title"><span class="icon section-icon">{{ '\uE8D9' }}</span> 九大章</div>
      <div class="chapter-grid">
        <button
          v-for="c in chapters"
          :key="c.key"
          class="chapter-chip"
          @click="goPage(c.key)"
        >
          <span class="icon chapter-icon">{{ c.icon }}</span>
          {{ c.name }}
        </button>
      </div>

    <!-- ====== 最近访问 / 我的收藏（保留现有功能） ====== -->
    <div class="rf-grid">
      <div class="sidebar-card">
        <h3 class="sidebar-title">
          <span class="icon">{{ '\uE823' }}</span>
          最近访问
        </h3>
        <div v-if="!recentPages.length" class="sidebar-empty">暂无访问记录</div>
        <ul v-else class="sidebar-list">
          <li v-for="item in recentPages" :key="item.key" class="sidebar-item" @click="goPage(item.key)">
            <span class="icon sidebar-dot">{{ item.icon }}</span>
            <span>{{ item.titlePlain || item.titleZh || item.title }}</span>
          </li>
        </ul>
      </div>

      <div class="sidebar-card">
        <h3 class="sidebar-title">
          <span class="icon">{{ '\uE735' }}</span>
          我的收藏
        </h3>
        <div v-if="!favoritePages.length" class="sidebar-empty">暂无收藏</div>
        <ul v-else class="sidebar-list">
          <li v-for="item in favoritePages" :key="item.key" class="sidebar-item" @click="goPage(item.key)">
            <span class="icon sidebar-dot">{{ '\uE734' }}</span>
            <span>{{ item.titlePlain || item.titleZh || item.title }}</span>
          </li>
        </ul>
      </div>
    </div>

    <!-- ====== 页脚（双开源协议） ====== -->
    <div class="footer">
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
    </div>
  </div>
</template>

<script setup>
import { computed, inject } from 'vue';
import { getPageMeta, chapterGroups } from '../data/pages';
import { useFavorites } from '../composables/useFavorites';

const currentPage = inject('currentPage');
const goPage = (key) => { if (currentPage) currentPage.value = key; };

// 各章 -> 点击进入该章第 1 节
const chapters = chapterGroups.map(g => {
  const firstKey = g.children[0];
  const first = getPageMeta(firstKey);
  return { name: g.label, key: firstKey, icon: g.icon || first?.icon || '\uE8D9' };
});

// 最近访问（排除首页自身）
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
    .slice(0, 5)
);

// 我的收藏（排除首页自身）
const { favorites } = useFavorites();
const favoritePages = computed(() =>
  favorites.value
    .filter(k => k !== 'home')
    .map(key => getPageMeta(key))
    .filter(Boolean)
    .slice(0, 5)
);

const COURSE_URL = 'https://www.criwits.top/missing';
const LUMENGUIDE_URL = 'https://furry-xiyi.github.io/WinUIonWeb/';
</script>

<style scoped>
.intro-page {
  --brand: #0067C0;
  --brand-2: #4CC2FF;
  max-width: 960px;
  margin: 0 auto;
  padding: 8px 4px 40px;
}

/* ===== Hero ===== */
.hero {
  background: var(--card-bg-default);
  border: 1px solid var(--card-stroke);
  border-radius: 20px;
  padding: 48px 44px 36px;
  text-align: center;
  margin-bottom: 32px;
}

.badge {
  display: inline-block;
  font-size: .7rem;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--brand-2);
  background: color-mix(in srgb, var(--brand) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--brand) 22%, transparent);
  padding: 4px 14px;
  border-radius: 30px;
  margin-bottom: 20px;
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

/* ===== 特色卡片 ===== */
.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 44px;
}
.feature-item {
  background: var(--card-bg-default);
  border: 1px solid var(--card-stroke);
  border-radius: 18px;
  padding: 22px 20px 20px;
  text-align: left;
  transition: background .2s, border-color .2s;
}
.feature-item:hover {
  background: var(--subtle-secondary);
  border-color: color-mix(in srgb, var(--brand) 28%, var(--card-stroke));
}
.feature-icon {
  font-size: 1.8rem;
  display: block;
  margin-bottom: 8px;
  color: var(--accent-base);
}
.feature-item h3 {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0 0 2px;
  color: var(--text-primary);
}
.feature-item p {
  font-size: .9rem;
  color: var(--text-secondary);
  font-weight: 300;
  margin: 0;
}

/* ===== 九大章 ===== */
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 14px;
  color: var(--text-primary);
}
.section-icon { font-size: 1.1rem; color: var(--accent-base); }

.chapter-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 40px;
}
.chapter-chip {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--card-bg-default);
  border: 1px solid var(--card-stroke);
  border-radius: 12px;
  padding: 12px 16px;
  font-size: .9rem;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  transition: .15s;
  font-family: inherit;
}
.chapter-chip:hover {
  background: color-mix(in srgb, var(--brand) 8%, transparent);
  border-color: color-mix(in srgb, var(--brand) 24%, transparent);
  color: var(--brand);
}
.chapter-icon { font-size: 1rem; color: var(--accent-base); }

/* ===== 最近访问 / 我的收藏 ===== */
.rf-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 40px;
}
.sidebar-card {
  padding: 16px;
  border-radius: 12px;
  background: var(--card-bg-default);
  border: 1px solid var(--card-stroke);
}
.sidebar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.sidebar-title .icon {
  font-size: 14px;
  color: var(--text-secondary);
}
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
  gap: 8px;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
  padding: 5px 8px;
  border-radius: 4px;
  transition: background var(--faster-duration);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sidebar-item:hover { background: var(--subtle-secondary); }
.sidebar-dot {
  font-size: 13px;
  color: var(--accent-base);
  flex-shrink: 0;
}
.sidebar-empty {
  font-size: 13px;
  color: var(--text-tertiary);
  padding: 8px 0;
  text-align: center;
}

/* ===== 页脚 ===== */
.footer {
  margin-top: 44px;
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
.footer a {
  color: var(--text-secondary);
  text-decoration: none;
  transition: .15s;
}
.footer a:hover { color: var(--brand); }

/* ===== 浅色主题对比度修正 ===== */
html.theme-light .intro-page .title-row h1 strong {
  background: linear-gradient(120deg, #004E9A 0%, #0067C0 55%, #2B88D8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
html.theme-light .intro-page .badge { color: #005A9E; }

/* ===== 响应式 ===== */
@media (max-width: 640px) {
  .hero { padding: 32px 20px 28px; border-radius: 16px; }
  .title-row h1 { font-size: 2.2rem; }
  .title-row .en { font-size: 1rem; }
  .subhead { font-size: 1rem; padding-left: 14px; }
  .desc { font-size: .95rem; }
  .features { grid-template-columns: 1fr; }
  .chapter-grid { grid-template-columns: 1fr; }
  .rf-grid { grid-template-columns: 1fr; }
  .footer { flex-direction: column; text-align: center; }
}
</style>
