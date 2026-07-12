<template>
  <div class="win-copyright-footer">
    <span>© 2026 全端启萌</span>
    <span class="sep">·</span>
    <span>灵感来源于 <a :href="COURSE_URL" target="_blank" rel="noopener">《你缺失的那门计算机课》</a></span>
    <span class="sep">·</span>
    <span>CC BY-NC-SA 4.0</span>
    <span class="sep">·</span>
    <span>基于 <a :href="LUMENGUIDE_URL" target="_blank" rel="noopener">WinUIonWeb</a></span>
    <span class="sep">·</span>
    <span>GPL-3.0</span>
  </div>
</template>

<script setup lang="ts">
// 版权说明：首页已内置同款；除「设置」页外，每一页（文章 / 序言）都应展示。
const COURSE_URL = 'https://www.criwits.top/missing';
const LUMENGUIDE_URL = 'https://furry-xiyi.github.io/WinUIonWeb/';
</script>

<style scoped>
.win-copyright-footer {
  max-width: 760px;
  margin: 28px auto 8px;
  padding-top: 16px;
  border-top: 1px solid var(--stroke-divider);
  font-size: 12px;
  color: var(--text-tertiary);
  text-align: center;
  line-height: 1.9;
  box-sizing: border-box;
}
.win-copyright-footer .sep {
  margin: 0 6px;
  opacity: 0.6;
}
.win-copyright-footer a {
  color: var(--text-secondary);
  text-decoration: none;
  border-bottom: 1px solid color-mix(in srgb, var(--text-secondary) 40%, transparent);
}
.win-copyright-footer a:hover {
  color: var(--accent-base);
  border-bottom-color: var(--accent-base);
}
@media (max-width: 640px) {
  .win-copyright-footer {
    font-size: 11px;
    padding: 16px 8px 8px;
  }
}
</style>
