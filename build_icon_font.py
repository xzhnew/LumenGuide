import os, re, base64, glob
from fontTools.ttLib import TTFont
from fontTools.subset import Subsetter, Options

SRC = r"D:\new\LumenGuide\LumenGuide\src"
FONT = os.path.join(SRC, "assets", "Fonts", "SEGOEICONS.TTF")
OUT_CSS = os.path.join(SRC, "styles", "icon-font.css")

cps = set()

# 1) \uXXXX escapes anywhere in source (templates, scripts)
rx_u = re.compile(r'\\u([0-9A-Fa-f]{4})')
# 2) \eXXXX / \EXXXX in CSS content: (checkmarks, infobar icons etc.)
rx_e = re.compile(r'\\e([0-9A-Fa-f]{3,4})', re.IGNORECASE)
# 3) bare uXXXX only inside .md frontmatter (decoded to glyphs by build-md)
rx_bare = re.compile(r"u([0-9A-Fa-f]{4})")

# Safety: glyphs referenced via CSS content:() that the scanner may miss
SAFETY = ['E73C', 'E73E', 'E7BA', 'E783', 'E946', 'E713', 'E721', 'E710', 'E711',
          'E738', 'E739', 'E7A8', 'E8FB', 'E894', 'E76C', 'E76B', 'E70E', 'E70D']

def scan_text(txt, bare_ok=False):
    for m in rx_u.finditer(txt):
        cps.add(int(m.group(1), 16))
    for m in rx_e.finditer(txt):
        cps.add(int(m.group(1), 16))
    if bare_ok:
        for m in rx_bare.finditer(txt):
            cps.add(int(m.group(1), 16))

for root, _, files in os.walk(SRC):
    for f in files:
        if f.lower().endswith(('.vue', '.ts', '.js', '.css', '.html')):
            try:
                scan_text(open(os.path.join(root, f), encoding='utf-8', errors='ignore').read())
            except Exception as e:
                print("skip", f, e)
        elif f.lower().endswith('.md'):
            try:
                scan_text(open(os.path.join(root, f), encoding='utf-8', errors='ignore').read(), bare_ok=True)
            except Exception as e:
                print("skip md", f, e)

# Always keep a few standard glyphs the app may rely on
for extra in (0x21B5, 0x25CF):  # arrow / disc (rendered by system fonts anyway, harmless)
    cps.add(extra)

# Safety list
for s in SAFETY:
    cps.add(int(s, 16))

cps = sorted(cps)
print("total code points:", len(cps))
print("sample:", [hex(c) for c in cps[:10]], "...")

font = TTFont(FONT)
opts = Options()
opts.glyph_names = False
opts.recalc_bounds = True
opts.drop_tables = []
ss = Subsetter(options=opts)
ss.populate(unicodes=cps)
ss.subset(font)

# emit subset to bytes
import io
buf = io.BytesIO()
font.save(buf)
data = buf.getvalue()
b64 = base64.b64encode(data).decode('ascii')
print("subset font bytes:", len(data), "base64 len:", len(b64))

css = (
    "@font-face {\n"
    "  font-family: 'LumenGuideIcons';\n"
    "  src: url(data:font/ttf;base64," + b64 + ") format('truetype');\n"
    "  font-display: swap;\n"
    "}\n"
)
with open(OUT_CSS, 'w', encoding='utf-8') as fh:
    fh.write(css)
print("wrote", OUT_CSS)
