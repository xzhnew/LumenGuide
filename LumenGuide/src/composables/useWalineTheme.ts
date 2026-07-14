// Waline 评论区明暗状态同步
// 项目主题由 <html> 上的 theme-dark / theme-light 类控制；但「跟随系统」(system) 时
// App 不会给 <html> 加任何类，此时实际明暗由系统 prefers-color-scheme 决定。
// Waline 的 dark 选项若只用 classList.contains('theme-dark') 判断，会在
// 「system + 系统深色」场景下误判为浅色。这里统一解析「实际生效的明暗」。

/** 计算当前实际是否为暗色（含 system 跟随系统） */
export function isResolvedDark(): boolean {
  const h = document.documentElement;
  if (h.classList.contains('theme-dark')) return true;
  if (h.classList.contains('theme-light')) return false;
  // system：跟随系统偏好
  return !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * 监听主题变化（应用手动切换 + 系统偏好切换），变化时回调最新暗色状态。
 * 返回取消监听的函数。
 */
export function onResolvedDarkChange(cb: (dark: boolean) => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onMq = () => cb(isResolvedDark());
  mq.addEventListener('change', onMq);

  const mo = new MutationObserver(() => cb(isResolvedDark()));
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

  return () => {
    mq.removeEventListener('change', onMq);
    mo.disconnect();
  };
}
