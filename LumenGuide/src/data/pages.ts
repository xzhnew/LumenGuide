/**
 * 统一页面元数据 - 单一数据源
 * App.vue 的 navMenuItems / pageMap 和 HomePage.vue 的卡片数据都从此派生
 */

export interface PageMeta {
  key: string
  icon: string
  title: string
  titleZh: string
  desc: string
  descZh: string
  keywords: string[]
  content?: string // 文章正文（HTML 字符串），留空则显示占位说明
}

export interface PageGroup {
  key: string
  icon: string
  label: string
  children: string[] // page keys
}

// ========== 篇章（卷 / 章）相关数据已迁至 ./pages/chapters ==========
// 这里取值并在本模块重新导出，使 App.vue / HomePage.vue / 搜索等现有 import 无需改动。
import { chapterPlan, chapterNames, chapterArticles, chapterGroups } from '../pages/chapters';
export { chapterPlan, chapterNames, chapterArticles, chapterGroups };

// ========== 所有页面元数据（仅包含网站实际存在的页面） ==========
export const allPages: PageMeta[] = [
  { key: 'home', icon: '\uE80F', title: 'Home', titleZh: '首页', desc: 'Project introduction and overview.', descZh: '项目介绍与概览。', keywords: ['home', 'index', 'intro', '首页', '主页', '介绍', '项目'] },
  { key: 'settings', icon: '\uE713', title: 'Settings', titleZh: '设置', desc: 'Site settings page.', descZh: '网站设置页面。', keywords: ['settings', 'preferences', 'theme', '设置', '偏好', '主题'] },
  ...chapterArticles,
];

// ========== 页面分组（搜索结果分类显示，按卷分组） ==========
export const pageGroups: PageGroup[] = [
  // 网站实际页面
  {
    key: 'sitepages', icon: '\uE80F', label: '网站页面', children: [
      'home'
    ]
  },
  ...chapterGroups,
  {
    key: 'settings_group', icon: '\uE713', label: '设置', children: [
      'settings'
    ]
  },
];

// ========== 工具函数 ==========

/** 根据 key 查找页面元数据 */
export function getPageMeta(key: string): PageMeta | undefined {
  return allPages.find(p => p.key === key);
}

/** 生成导航菜单项（WinNavigationView 格式） */
export function buildNavMenuItems(): Array<{
  value: string; icon: string; label: string; selectsOnInvoked?: boolean; children?: Array<{ value: string; icon: string; label: string }>
}> {
  return [
    { value: 'home', icon: '\uE80F', label: 'Home' },
    ...pageGroups.map(group => ({
      value: group.key,
      icon: group.icon,
      label: group.label,
      selectsOnInvoked: false,
      children: group.children.map(key => {
        const meta = getPageMeta(key);
        if (!meta) return { value: key, icon: '\uE80F', label: key };
        return { value: meta.key, icon: meta.icon, label: meta.title };
      })
    }))
  ];
}

/** 搜索页面元数据 */
export function searchPages(query: string): PageMeta[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();
  return allPages.filter(item =>
    item.title.toLowerCase().includes(q) ||
    item.titleZh.includes(q) ||
    item.desc.toLowerCase().includes(q) ||
    item.descZh.includes(q) ||
    item.keywords.some(k => k.toLowerCase().includes(q))
  );
}
