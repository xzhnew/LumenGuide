/**
 * 篇章（卷 / 章）数据 —— 位于 pages 文件夹内
 *
 * - chapterPlan：每卷自行声明卷名、图标、章标题（支持单卷单独增删章）
 * - 各章正文不再放在这里，而是写在对应的 `src/pages/Volume{n}.vue` 组件里
 *   （导航点某章 → 进入该卷页面并锚点定位到对应 <section id="ch{n}-{t}">）
 *
 * 本模块仅以 type-only 方式从 ../data/pages 引入类型，运行时不构成循环依赖；
 * data/pages.ts 再从本模块取值并重新导出，供 App / HomePage / 搜索等使用。
 */

import type { PageMeta, PageGroup } from '../data/pages';
import { articleContent } from '../data/articleContent';


// ========== 篇章结构：每卷自行声明包含哪几章（支持单卷单独增删章） ==========
export interface VolumeDef {
  name: string;        // 卷名
  icon: string;        // 该卷在导航 / 首页显示的图标
  chapters: string[];  // 章标题列表；长度即章数，增删章只改这里
}
export const chapterPlan: VolumeDef[] = [
  { name: '第一卷 · 开箱与初见',     icon: '\uE7B8', chapters: ['第1章', '第2章', '第3章'] },
  { name: '第二卷 · 从手机到电脑',   icon: '\uE717', chapters: ['第1章', '第2章', '第3章'] },
  { name: '第三卷 · 第一次用电脑',   icon: '\uE897', chapters: ['第1章', '第2章', '第3章'] },
  { name: '第四卷 · 日常使用与维护', icon: '\uE74E', chapters: ['第1章', '第2章', '第3章'] },
  { name: '第五卷 · 安全与防护',     icon: '\uE72E', chapters: ['第1章', '第2章', '第3章'] },
  { name: '第六卷 · 文件管理进阶',   icon: '\uE8B7', chapters: ['第1章', '第2章', '第3章'] },
  { name: '第七卷 · 通讯与网络',     icon: '\uE715', chapters: ['第1章', '第2章', '第3章'] },
  { name: '第八卷 · 工作与娱乐',     icon: '\uE768', chapters: ['第1章', '第2章', '第3章'] },
  { name: '第九卷 · 故障排除思维',   icon: '\uE7BA', chapters: ['第1章', '第2章', '第3章'] },
];

// 兼容导出：卷名列表（首页九宫格 / 旧引用仍可沿用）
export const chapterNames = chapterPlan.map(v => v.name);

// ========== 根据 chapterPlan 生成篇章文章元数据（每卷章数可不同） ==========
// 注意：content 不再由这里提供，正文写在 Volume{n}.vue 中；此处仅保留
// 标题 / 描述 / 关键词等元数据，供导航、首页、搜索、收藏使用。
export const chapterArticles: PageMeta[] = [];
chapterPlan.forEach((vol, i) => {
  const n = i + 1;
  vol.chapters.forEach((chTitle, t) => {
    const tNum = t + 1;
    const key = `ch${n}-${tNum}`;
    chapterArticles.push({
      key,
      icon: vol.icon,
      title: `Chapter ${n}.${tNum}`,
      titleZh: `${vol.name} · ${chTitle}`,
      desc: `Chapter ${n} article ${tNum}.`,
      descZh: `《${vol.name}》${chTitle}内容。`,
      keywords: ['chapter', '篇章', '文章', 'article', vol.name, `第${n}卷`, chTitle],
      content: articleContent[key] || '',
    });
  });
});

// ========== 按卷分组（导航分组 / 搜索分组 / 首页卡片都由此派生） ==========
export const chapterGroups: PageGroup[] = chapterPlan.map((vol, i) => ({
  key: `vol${i + 1}`,
  icon: vol.icon,
  label: vol.name,
  children: vol.chapters.map((_, t) => `ch${i + 1}-${t + 1}`),
}));
