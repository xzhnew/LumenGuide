<template>
  <div class="win-copyright-footer">
    <span class="cp-left">© 2026 全端启萌</span><span class="cp-sep"> · </span><span class="cp-right">
      灵感来源于 <a :href="COURSE_URL" target="_blank" rel="noopener">《你缺失的那门计算机课》</a>
      <span class="sep">·</span> CC BY-NC-SA 4.0
      <span class="sep">·</span> 基于 <a :href="LUMENGUIDE_URL" target="_blank" rel="noopener">WinUIonWeb</a>
      <span class="sep">·</span> GPL-3.0
    </span>
  </div>
</template>

<script setup lang="ts">
// 版权说明：与首页页脚同款内容；小屏模式（<640px）下学习首页——两行堆叠居中。
const COURSE_URL = 'https://www.criwits.top/missing';
const LUMENGUIDE_URL = 'https://furry-xiyi.github.io/WinUIonWeb/';
</script>

<style scoped>
.win-copyright-footer {
  --brand: #0067C0;
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
  color: var(--brand);
  border-bottom-color: var(--brand);
}

/* 小屏模式：学习首页页脚——两行堆叠、居中，字号/分隔/间距与首页一致 */
@media (max-width: 640px) {
  .win-copyright-footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    font-size: .8rem;
    margin-top: 44px;
    padding: 24px 8px 8px;
    border-top: 1px solid var(--card-stroke);
  }
  .win-copyright-footer .cp-sep {
    display: none;
  }
}
</style>
