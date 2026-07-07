/**
 * 篇章正文索引 —— 供站内搜索使用
 *
 * 说明：
 * - 此文件由 scripts/extractArticleContent.py 自动从 Volume{n}.vue 提取生成，
 *   保持搜索索引与页面实际渲染内容一致。
 * - 新增 / 修改章节内容后，请运行：python scripts/extractArticleContent.py
 * - 内容保持为纯文本（去掉 HTML 标签），便于 searchPages 做关键词匹配。
 */

export const articleContent: Record<string, string> = {
  // 第一卷 · 开箱与初见
  'ch1-1': `当你第一次把电脑抱回家，先别急着开机。找一个平稳的桌面，确认电源、键盘、鼠标都齐备。
第一步：认识外观
屏幕、机身、接口——它们各自负责什么，看完这一节你就心里有数了。
电源键通常在机身上方或侧面
USB 接口用来插键盘、鼠标、U 盘
网线口 / Wi-Fi 负责上网
下一章我们会正式按下电源，进入系统。`,
  'ch1-2': `（这是《第一卷 · 开箱与初见 · 第2章》的正文占位。在 src/pages/Volume1.vue 里找到 id="ch1-2" 的 <section>，把内容写进它的 .chapter-body 即可。）`,
  'ch1-3': `（这是《第一卷 · 开箱与初见 · 第3章》的正文占位。在 src/pages/Volume1.vue 里找到 id="ch1-3" 的 <section>，把内容写进它的 .chapter-body 即可。）`,

  // 第二卷 · 从手机到电脑
  'ch2-1': `（这是《第二卷 · 从手机到电脑 · 第1章》的正文占位。在 src/pages/Volume2.vue 里找到 id="ch2-1" 的 <section>，把内容写进它的 .chapter-body 即可。）`,
  'ch2-2': `（这是《第二卷 · 从手机到电脑 · 第2章》的正文占位。在 src/pages/Volume2.vue 里找到 id="ch2-2" 的 <section>，把内容写进它的 .chapter-body 即可。）`,
  'ch2-3': `（这是《第二卷 · 从手机到电脑 · 第3章》的正文占位。在 src/pages/Volume2.vue 里找到 id="ch2-3" 的 <section>，把内容写进它的 .chapter-body 即可。）`,

  // 第三卷 · 第一次用电脑
  'ch3-1': `（这是《第三卷 · 第一次用电脑 · 第1章》的正文占位。在 src/pages/Volume3.vue 里找到 id="ch3-1" 的 <section>，把内容写进它的 .chapter-body 即可。）`,
  'ch3-2': `（这是《第三卷 · 第一次用电脑 · 第2章》的正文占位。在 src/pages/Volume3.vue 里找到 id="ch3-2" 的 <section>，把内容写进它的 .chapter-body 即可。）`,
  'ch3-3': `（这是《第三卷 · 第一次用电脑 · 第3章》的正文占位。在 src/pages/Volume3.vue 里找到 id="ch3-3" 的 <section>，把内容写进它的 .chapter-body 即可。）`,

  // 第四卷 · 日常使用与维护
  'ch4-1': `（这是《第四卷 · 日常使用与维护 · 第1章》的正文占位。在 src/pages/Volume4.vue 里找到 id="ch4-1" 的 <section>，把内容写进它的 .chapter-body 即可。）`,
  'ch4-2': `（这是《第四卷 · 日常使用与维护 · 第2章》的正文占位。在 src/pages/Volume4.vue 里找到 id="ch4-2" 的 <section>，把内容写进它的 .chapter-body 即可。）`,
  'ch4-3': `（这是《第四卷 · 日常使用与维护 · 第3章》的正文占位。在 src/pages/Volume4.vue 里找到 id="ch4-3" 的 <section>，把内容写进它的 .chapter-body 即可。）`,

  // 第五卷 · 安全与防护
  'ch5-1': `（这是《第五卷 · 安全与防护 · 第1章》的正文占位。在 src/pages/Volume5.vue 里找到 id="ch5-1" 的 <section>，把内容写进它的 .chapter-body 即可。）`,
  'ch5-2': `（这是《第五卷 · 安全与防护 · 第2章》的正文占位。在 src/pages/Volume5.vue 里找到 id="ch5-2" 的 <section>，把内容写进它的 .chapter-body 即可。）`,
  'ch5-3': `（这是《第五卷 · 安全与防护 · 第3章》的正文占位。在 src/pages/Volume5.vue 里找到 id="ch5-3" 的 <section>，把内容写进它的 .chapter-body 即可。）`,

  // 第六卷 · 文件管理进阶
  'ch6-1': `（这是《第六卷 · 文件管理进阶 · 第1章》的正文占位。在 src/pages/Volume6.vue 里找到 id="ch6-1" 的 <section>，把内容写进它的 .chapter-body 即可。）`,
  'ch6-2': `（这是《第六卷 · 文件管理进阶 · 第2章》的正文占位。在 src/pages/Volume6.vue 里找到 id="ch6-2" 的 <section>，把内容写进它的 .chapter-body 即可。）`,
  'ch6-3': `（这是《第六卷 · 文件管理进阶 · 第3章》的正文占位。在 src/pages/Volume6.vue 里找到 id="ch6-3" 的 <section>，把内容写进它的 .chapter-body 即可。）`,

  // 第七卷 · 通讯与网络
  'ch7-1': `（这是《第七卷 · 通讯与网络 · 第1章》的正文占位。在 src/pages/Volume7.vue 里找到 id="ch7-1" 的 <section>，把内容写进它的 .chapter-body 即可。）`,
  'ch7-2': `（这是《第七卷 · 通讯与网络 · 第2章》的正文占位。在 src/pages/Volume7.vue 里找到 id="ch7-2" 的 <section>，把内容写进它的 .chapter-body 即可。）`,
  'ch7-3': `（这是《第七卷 · 通讯与网络 · 第3章》的正文占位。在 src/pages/Volume7.vue 里找到 id="ch7-3" 的 <section>，把内容写进它的 .chapter-body 即可。）`,

  // 第八卷 · 工作与娱乐
  'ch8-1': `（这是《第八卷 · 工作与娱乐 · 第1章》的正文占位。在 src/pages/Volume8.vue 里找到 id="ch8-1" 的 <section>，把内容写进它的 .chapter-body 即可。）`,
  'ch8-2': `（这是《第八卷 · 工作与娱乐 · 第2章》的正文占位。在 src/pages/Volume8.vue 里找到 id="ch8-2" 的 <section>，把内容写进它的 .chapter-body 即可。）`,
  'ch8-3': `（这是《第八卷 · 工作与娱乐 · 第3章》的正文占位。在 src/pages/Volume8.vue 里找到 id="ch8-3" 的 <section>，把内容写进它的 .chapter-body 即可。）`,

  // 第九卷 · 故障排除思维
  'ch9-1': `（这是《第九卷 · 故障排除思维 · 第1章》的正文占位。在 src/pages/Volume9.vue 里找到 id="ch9-1" 的 <section>，把内容写进它的 .chapter-body 即可。）`,
  'ch9-2': `（这是《第九卷 · 故障排除思维 · 第2章》的正文占位。在 src/pages/Volume9.vue 里找到 id="ch9-2" 的 <section>，把内容写进它的 .chapter-body 即可。）`,
  'ch9-3': `（这是《第九卷 · 故障排除思维 · 第3章》的正文占位。在 src/pages/Volume9.vue 里找到 id="ch9-3" 的 <section>，把内容写进它的 .chapter-body 即可。）`,
};
