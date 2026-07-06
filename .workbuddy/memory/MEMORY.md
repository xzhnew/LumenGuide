# LumenGuide 项目长期记忆

## 关键约定（踩坑记录）
- **App.vue 的 `<script setup>` 是纯 JS（没有 `lang="ts"`）**。在里面新增代码不要用 TS 类型注解（如 `: Record<number, any>`），否则 vue 编译器报 `Missing initializer in const declaration`。需要类型时用 plain JS；类型严格的代码放在 `src/data/pages.ts`、`src/pages/chapters.ts` 等 `.ts` 文件里。
- 篇章文章架构：`src/pages/chapters.ts` 用 `chapterPlan`（每卷自声明卷名/图标/chapters 数组，支持单卷增删章）→ 生成 `chapterArticles` 元数据；各卷正文是独立 Vue 组件 `src/pages/Volume{n}.vue`，共用 `src/pages/VolumeShell.vue`（WinPage 包裹 + 锚点定位 + `:deep()` 章排版）。`data/pages.ts` 仅保留站点通用页 + 搜索/导航，并从 chapters.ts 重新导出 `chapterPlan/chapterNames/chapterArticles/chapterGroups`。
- 导航点某章 → 进入 `Volume{n}.vue`，`VolumeShell` 用 `display:none` 隐藏非当前章、只渲染当前章并锚点定位，形成「每章一个独立页面」；底部有上一章/下一章按钮（按 `chapterPlan` 顺序）。`App.vue` 用 `:key="currentPage"` 包裹页面区，切章会重挂载。
- **刷新保持当前页**：`currentPage` 初始化自 `localStorage['winui-current-page']`（无则用 'home'），并 `watch` 写回。刷新文章不会再跳回首页。
- 收藏按章 key（`ch{n}-{t}`）粒度，由 `VolumeShell` 内的 `<WinPage :pageKey>` 提供。
- 构建/类型检查：`npm run build`（含 `vue-tsc`）。项目根在 `D:\new\LumenGuide\LumenGuide\`（注意外层还有一层同名目录）。
