/**
 * 篇章（章 / 节）数据 —— 位于 pages 文件夹内
 *
 * 设计原则：章与节 100% 由 src/content/*.md 的 frontmatter 驱动，不再需要手写任何数组。
 *   - 某「章」是否存在 = markdownArticles 里是否出现该 chapter 值（按升序）
 *   - 该章的显示名 / 图标 = 该章任一篇 .md 写的 chapterName / chapterIcon（可只写在一篇里）
 *   - 该章包含哪些「节」 = markdownArticles 里 chapter 匹配的条目，按 section 升序
 *
 * 因此：
 *   - 加一章 = 新建一篇 chapter: N 的 .md 并写 chapterName
 *   - 删一章 = 删光该 chapter 的所有 .md
 *   - 加一节 = 新建一篇 .md
 *   - 删一节 = 删掉对应 .md
 * 全程只改 .md，不用碰本文件。
 *
 * markdownArticles（由 scripts/build-md.mjs 生成）是文章单一数据源。
 * 本模块从中派生：
 *   - chapterArticles：PageMeta[]，供导航 / 首页 / 搜索 / 收藏使用
 *   - chapterGroups：按章分组，供导航分组与首页卡片使用
 *
 * data/pages.ts 再从本模块取值并重新导出，供 App / HomePage / 搜索等使用。
 */

import type { PageMeta, PageGroup } from '../data/pages';
import { markdownArticles } from '../data/markdownArticles';

// ===== 中文数字（用于 第一章 / 第一节 等序号，支持 1–99） =====
function toChineseNum(n: number): string {
  const d = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (n <= 0) return String(n);
  if (n <= 10) return n === 10 ? '十' : d[n];
  if (n < 20) return '十' + d[n - 10];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return d[t] + '十' + (o ? d[o] : '');
  }
  return String(n);
}

// ===== 从 markdownArticles 派生所有「章」（顶层分组） =====
const chapterNumbers = Array.from(
  new Set(markdownArticles.map(a => a.chapter))
).sort((a, b) => a - b);

// 读取某章的显示信息（名称 / 图标），优先用 .md 的 chapterName / chapterIcon，否则回落
function resolveChapterMeta(chapterNum: number) {
  const all = markdownArticles.filter(a => a.chapter === chapterNum);
  const named = all.find(a => a.chapterName);
  const first = all[0];
  return {
    name: named?.chapterName || first?.chapterName || `第${toChineseNum(chapterNum)}章`,
    icon: named?.chapterIcon || first?.chapterIcon || first?.icon || '',
  };
}

// ===== 按章生成文章元数据（导航 / 首页 / 搜索 / 收藏） =====
export const chapterArticles: PageMeta[] = [];
for (const cn of chapterNumbers) {
  const cMeta = resolveChapterMeta(cn);
  markdownArticles
    .filter(a => a.chapter === cn)
    .sort((a, b) => a.section - b.section)
    .forEach(a => {
      chapterArticles.push({
        key: a.key,
        icon: a.icon || cMeta.icon,
        title: `Chapter ${cn}.${a.section}`,
        // 导航/标题显示：第一节 开箱初体验（自动序号 + 标题）
        titleZh: `第${toChineseNum(a.section)}节 ${a.title}`,
        desc: a.summary,
        descZh: a.summary,
        keywords: [
          'chapter', '章', '节', 'section', '文章', 'article',
          cMeta.name, `第${toChineseNum(cn)}章`, `第${toChineseNum(a.section)}节`,
          a.title, ...a.keywords,
        ],
        content: a.plainText,
      });
    });
}

// ===== 按章分组（导航分组 / 搜索分组 / 首页卡片） =====
// 组标签只显示章名（如「开箱与初见」），不显示「第一章」前缀。
export const chapterGroups: PageGroup[] = chapterNumbers.map(cn => {
  const cMeta = resolveChapterMeta(cn);
  return {
    key: `ch${cn}`,
    icon: cMeta.icon,
    label: cMeta.name,
    children: markdownArticles
      .filter(a => a.chapter === cn)
      .sort((a, b) => a.section - b.section)
      .map(a => a.key),
  };
});
