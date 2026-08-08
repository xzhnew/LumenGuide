<template>
  <footer class="win-copyright-footer">
    <span class="cp-left">© 2026–{{ currentYear }} <a :href="GITHUB_URL" target="_blank" rel="noopener">全端启萌</a></span>
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
</template>

<script setup lang="ts">
// 版权说明：与首页页脚同款（左版权 + 右协议，两端对齐；年份动态 = 2026–今年）。
const COURSE_URL = 'https://www.criwits.top/missing';
const LUMENGUIDE_URL = 'https://furry-xiyi.github.io/WinUIonWeb/';
const GITHUB_URL = 'https://github.com/xzhnew/LumenGuide';
const currentYear = new Date().getFullYear();
</script>

<style scoped>
.win-copyright-footer {
  --brand: #0067C0;
  margin-top: 28px;
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
.win-copyright-footer a {
  color: var(--text-secondary);
  text-decoration: none;
  transition: .15s;
}
.win-copyright-footer a:hover {
  color: var(--brand);
}

/* 小屏模式：与首页页脚一致——两行堆叠、居中 */
@media (max-width: 640px) {
  .win-copyright-footer {
    flex-direction: column;
    text-align: center;
  }
}
</style>
