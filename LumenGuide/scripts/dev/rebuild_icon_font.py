"""
rebuild_icon_font.py —— 自己加图标符号后，一键重建 LumenGuide 图标子集字体。

为什么需要它：
  项目的图标字体 `src/assets/Fonts/SEGOEICONS.TTF` 是「手工子集」，
  只含用到的字形。旧脚本是从「现有子集」再子集化 —— 如果你想用的新码位
  本来就不在子集里，再子集也加不进来（表现为部署后图标空白）。
  本脚本改从「系统全字库 C:/Windows/Fonts/segmdl2.ttf」子集化，并
  UNION 上「当前子集里已有的字形」，做到：既不丢旧字，又能加新字。

用法（在本机，装好 fonttools 后）：
  python scripts/dev/rebuild_icon_font.py
然后重新 `npm run build` + 部署即可。

加一个新符号的步骤：
  1. 在 .md frontmatter 写  icon: uE7xx   （裸 u + 4 位十六进制，PUA 区 E000-F8FF）
     或在文章的 markdown 正文写  &#xE7xx;    （HTML 实体）
     或在 .vue/.ts 的 JS 里写  '\\uE7xx'
  2. 确认该码位在系统 segmdl2.ttf 里存在（常见 MDL2 图标都在这；Fluent 的 F 码位大概率没有）。
  3. 跑本脚本 → 自动把新字形补进子集字体 + 更新 icon-font.css 的 base64。
  4. 重新构建部署。线上硬刷新验证。

注意：base64 内联在 CSS，dist 里没有独立 ttf 文件，这是正常的。
"""

import os
import re
import io
import base64
from fontTools.ttLib import TTFont
from fontTools.subset import Subsetter, Options

ROOT = r"D:\new\LumenGuide\LumenGuide"
SRC = os.path.join(ROOT, "src")
FONT = os.path.join(SRC, "assets", "Fonts", "SEGOEICONS.TTF")
OUT_CSS = os.path.join(SRC, "styles", "icon-font.css")
# 系统全字库（Segoe MDL2，包含所有可能用到的图标码位）
FULL_FONT = r"C:\Windows\Fonts\segmdl2.ttf"

# ---- 1. 扫描源码里实际用到的码位 ----
cps = set()
rx_u = re.compile(r'\\u([0-9A-Fa-f]{4})')                       # JS / 引号 YAML: \uE711
rx_e = re.compile(r'\\e([0-9A-Fa-f]{3,4})', re.IGNORECASE)      # CSS content: \e73c
rx_ent = re.compile(r'&#x([0-9A-Fa-f]{4});')                    # markdown 正文 HTML 实体: &#xE896;
rx_bare = re.compile(r"u([0-9A-Fa-f]{4})")                      # .md frontmatter 裸 uE896

# 保险列表：CSS content / 历史用过的图标，确保不会被漏扫
SAFETY = ['E73C', 'E73E', 'E7BA', 'E783', 'E946', 'E713', 'E721', 'E710', 'E711',
          'E738', 'E739', 'E7A8', 'E8FB', 'E894', 'E76C', 'E76B', 'E70E', 'E70D',
          'E734', 'E826', 'E7FC', 'E896', 'E72C', 'E138', 'E70F']


def scan_text(txt, bare_ok=False):
    for m in rx_u.finditer(txt):
        cps.add(int(m.group(1), 16))
    for m in rx_e.finditer(txt):
        cps.add(int(m.group(1), 16))
    for m in rx_ent.finditer(txt):
        cps.add(int(m.group(1), 16))
    if bare_ok:
        for m in rx_bare.finditer(txt):
            cps.add(int(m.group(1), 16))


for root, _, files in os.walk(SRC):
    for f in files:
        p = os.path.join(root, f)
        try:
            if f.lower().endswith(('.vue', '.ts', '.js', '.css', '.html')):
                scan_text(open(p, encoding='utf-8', errors='ignore').read())
            elif f.lower().endswith('.md'):
                scan_text(open(p, encoding='utf-8', errors='ignore').read(), bare_ok=True)
        except Exception as e:
            print("skip", f, e)

for s in SAFETY:
    cps.add(int(s, 16))
for extra in (0x21B5, 0x25CF):  # 箭头 / 圆点（系统字体也有，无害）
    cps.add(extra)

# ---- 2. 合并「现有子集字体里已有的字形」，绝不丢字 ----
if os.path.exists(FONT):
    try:
        cur = TTFont(FONT)
        existing = cur.getBestCmap()
        for cp in existing:
            cps.add(cp)
        print("现有子集字形数:", len(existing))
    except Exception as e:
        print("读现有字体失败(忽略):", e)

# 仅保留私用区（图标码位 E000-F8FF），过滤掉正文/噪声
cps = sorted(c for c in cps if 0xE000 <= c <= 0xF8FF)
print("最终子集码位总数:", len(cps))
print("样本:", [hex(c) for c in cps[:8]], "...")

if not os.path.exists(FULL_FONT):
    raise SystemExit("找不到系统全字库: " + FULL_FONT + "\n（需要 Windows 的 Segoe MDL2，无法从全字库子集化）")

# ---- 3. 校验这些码位在全字库里确实存在 ----
full = TTFont(FULL_FONT)
full_cmap = full.getBestCmap()
missing = [hex(c) for c in cps if c not in full_cmap]
if missing:
    print("警告：以下码位在系统全字库里【不存在】，将不会被渲染（请换一个真实存在的 MDL2 码位）：")
    print("  ", missing)

# ---- 4. 从全字库子集化 ----
opts = Options()
opts.glyph_names = False
opts.recalc_bounds = True
opts.drop_tables = []
ss = Subsetter(options=opts)
ss.populate(unicodes=cps)
ss.subset(full)

buf = io.BytesIO()
full.save(buf)
data = buf.getvalue()

# 写回 TTF 源文件
with open(FONT, 'wb') as fh:
    fh.write(data)
print("写回字体:", FONT, len(data), "bytes")

# 写 base64 内联 CSS（@font-face 是 data URI，dist 不生成独立 ttf，这是正常的）
b64 = base64.b64encode(data).decode('ascii')
css = (
    "@font-face {\n"
    "  font-family: 'LumenGuideIcons';\n"
    "  src: url(data:font/ttf;base64," + b64 + ") format('truetype');\n"
    "  font-display: swap;\n"
    "}\n"
)
with open(OUT_CSS, 'w', encoding='utf-8') as fh:
    fh.write(css)
print("写回 CSS:", OUT_CSS, "base64 len:", len(b64))
print("完成。记得重新 npm run build 并部署。")
