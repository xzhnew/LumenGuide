import struct

FONT = r"D:\new\LumenGuide\LumenGuide\src\assets\Fonts\SEGOEICONS.TTF"
data = open(FONT, "rb").read()

def read_table(data, tag):
    num = struct.unpack(">H", data[4:6])[0]
    off = 12
    for _ in range(num):
        t = data[off:off+4]
        toff = struct.unpack(">I", data[off+8:off+12])[0]
        tlen = struct.unpack(">I", data[off+12:off+16])[0]
        if t == tag:
            return data[toff:toff+tlen]
        off += 16
    return None

# ---- cmap: build cp -> gid ----
cmap = read_table(data, b"cmap")
cp2gid = {}
ver, num = struct.unpack(">HH", cmap[:4])
ptr = 4
for _ in range(num):
    plat, enc, suboff = struct.unpack(">HHI", cmap[ptr:ptr+8])
    ptr += 8
    base = suboff
    fmt = struct.unpack(">H", cmap[base:base+2])[0]
    if fmt == 4:
        segX2 = struct.unpack(">H", cmap[base+6:base+8])[0]
        segCount = segX2 // 2
        endOff = base + 14
        ends = struct.unpack(">%dH" % segCount, cmap[endOff:endOff+segCount*2])
        startOff = endOff + segCount*2 + 2
        starts = struct.unpack(">%dH" % segCount, cmap[startOff:startOff+segCount*2])
        deltaOff = startOff + segCount*2
        deltas = struct.unpack(">%dh" % segCount, cmap[deltaOff:deltaOff+segCount*2])
        roOff = deltaOff + segCount*2
        ros = struct.unpack(">%dH" % segCount, cmap[roOff:roOff+segCount*2])
        for i in range(segCount):
            end = ends[i]; start = starts[i]
            if start == 0xFFFF:
                break
            for c in range(start, end+1):
                if ros[i] == 0:
                    gid = (c + deltas[i]) & 0xFFFF
                else:
                    addr = roOff + i*2 + ros[i] + (c-start)*2
                    gid = struct.unpack(">H", cmap[addr:addr+2])[0]
                if gid != 0:
                    cp2gid[c] = gid
    elif fmt == 12:
        n = struct.unpack(">I", cmap[base+4:base+8])[0]
        rec = base + 12
        for _ in range(n):
            s, e, _ = struct.unpack(">III", cmap[rec:rec+12])
            for c in range(s, e+1):
                cp2gid[c] = c  # format12 maps 1:1 typically; refine below
            rec += 12

# refine format12 mapping if present (gid from glyphIdArray) - skip, our font uses fmt4

# ---- head: indexToLocFormat ----
head = read_table(data, b"head")
indexToLocFormat = struct.unpack(">H", head[50:52])[0]

# ---- maxp: numGlyphs ----
maxp = read_table(data, b"maxp")
numGlyphs = struct.unpack(">H", maxp[4:6])[0]

# ---- loca ----
loca = read_table(data, b"loca")
if indexToLocFormat == 0:
    n = len(loca) // 2
    locs = list(struct.unpack(">%dH" % n, loca))
else:
    n = len(loca) // 4
    locs = list(struct.unpack(">%dI" % n, loca))
locs = locs + [len(read_table(data, b"glyf"))]

glyf = read_table(data, b"glyf")

def glyph_empty(gid):
    if gid >= len(locs)-1:
        return True
    start = locs[gid]; end = locs[gid+1]
    if end <= start:
        return True  # zero-length = empty
    # read numberOfContours
    nc = struct.unpack(">h", glyf[start:start+2])[0]
    if nc == 0:
        return True  # no contours
    if nc > 0:
        return False
    # composite (nc == -1): has components, not empty
    return False

suspects = ["E734","E735","E793","E708","E7E8","E706","E8AB","F594","E946","E8A5",
             "E8D9","E713","E80F","E721","E736","E774","E7F4","E8B7","E8B1","E72E",
             "E823","E711","E70D","E712","E700","E72B","E74A","E72C","E70F","E897","E724",
             "F090","F08E","F08D","F08F","F78D","E943","E8FD","E8EF","E894","E8C6","E8C8",
             "E77F","E7A7","E7A6","E8B3","E8DD","E8DB","E8DC","E787","E767","E74F","E768","E769",
             "E8E5","E78C","E749","E722","E723","E76E","E90B","E707","E7C1","E896","E898",
             "E77B","E76B","E76C","E70E"]
print("cp     gid   empty?")
for s in suspects:
    cp = int(s, 16)
    gid = cp2gid.get(cp)
    if gid is None:
        print("%s  --    NO_CMAP")
    else:
        print("%s  %4d   %s" % (s, gid, "EMPTY" if glyph_empty(gid) else "ok"))
