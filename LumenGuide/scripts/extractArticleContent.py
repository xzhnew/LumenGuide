#!/usr/bin/env python3
"""从 Volume{n}.vue 自动提取章节正文，生成 articleContent.ts 搜索索引。

用法:
    python scripts/extractArticleContent.py

提取规则：
- 读取 src/pages/Volume1.vue ~ Volume9.vue
- 找到 <section class="chapter" id="ch{n}-{t}">
- 提取其内部 <div class="chapter-body"> 的纯文本
- 去除 HTML 标签，合并空行，保留段落结构
- 写入 src/data/articleContent.ts
"""

from pathlib import Path
import html
import re

PROJECT_ROOT = Path(__file__).resolve().parent.parent
VOLUME_DIR = PROJECT_ROOT / "src" / "pages"
OUTPUT_FILE = PROJECT_ROOT / "src" / "data" / "articleContent.ts"


def strip_tags(html_text: str) -> str:
    """简单去除 HTML 标签，保留文本并解码 HTML 实体。"""
    text = re.sub(r"<[^>]+>", "", html_text)
    return html.unescape(text)


def normalize_text(text: str) -> str:
    """规范化空白：合并连续空行、去除每行首尾空格。"""
    lines = [line.strip() for line in text.splitlines()]
    lines = [line for line in lines if line]
    return "\n".join(lines)


def extract_volume(path: Path) -> dict[str, str]:
    """从单个 Volume{n}.vue 提取 {chKey: text}。"""
    content = path.read_text(encoding="utf-8")
    results = {}

    # 匹配 <section class="chapter" id="chX-Y">...</section>
    # 使用非贪婪匹配，section 之间不嵌套
    section_pattern = re.compile(
        r'<section\s+class="chapter"\s+id="(ch\d+-\d+)"\s*>'
        r'(.*?)'
        r'</section>',
        re.DOTALL | re.IGNORECASE,
    )

    body_pattern = re.compile(
        r'<div\s+class="chapter-body"\s*>(.*?)</div>',
        re.DOTALL | re.IGNORECASE,
    )

    for sec_match in section_pattern.finditer(content):
        ch_key = sec_match.group(1)
        section_html = sec_match.group(2)

        body_match = body_pattern.search(section_html)
        if not body_match:
            continue

        body_html = body_match.group(1)
        text = normalize_text(strip_tags(body_html))
        results[ch_key] = text

    return results


def generate_ts(all_content: dict[str, str]) -> str:
    """生成 articleContent.ts 源码。"""
    volume_names = {
        1: "第一卷 · 开箱与初见",
        2: "第二卷 · 从手机到电脑",
        3: "第三卷 · 第一次用电脑",
        4: "第四卷 · 日常使用与维护",
        5: "第五卷 · 安全与防护",
        6: "第六卷 · 文件管理进阶",
        7: "第七卷 · 通讯与网络",
        8: "第八卷 · 工作与娱乐",
        9: "第九卷 · 故障排除思维",
    }

    lines = [
        "/**",
        " * 篇章正文索引 —— 供站内搜索使用",
        " *",
        " * 说明：",
        " * - 此文件由 scripts/extractArticleContent.py 自动从 Volume{n}.vue 提取生成，",
        " *   保持搜索索引与页面实际渲染内容一致。",
        " * - 新增 / 修改章节内容后，请运行：python scripts/extractArticleContent.py",
        " * - 内容保持为纯文本（去掉 HTML 标签），便于 searchPages 做关键词匹配。",
        " */",
        "",
        "export const articleContent: Record<string, string> = {",
    ]

    for vol in range(1, 10):
        lines.append(f"  // {volume_names[vol]}")
        for ch in range(1, 4):
            key = f"ch{vol}-{ch}"
            text = all_content.get(key, "")
            if text:
                escaped = text.replace("`", "\\`").replace("${", "\\${")
                lines.append(f"  '{key}': `{escaped}`,")
            else:
                lines.append(f"  '{key}': ``,")
        lines.append("")

    lines[-1] = "};\n"
    return "\n".join(lines)


def main():
    all_content: dict[str, str] = {}
    for vol in range(1, 10):
        path = VOLUME_DIR / f"Volume{vol}.vue"
        if not path.exists():
            print(f"⚠️ 跳过不存在文件: {path}")
            continue
        extracted = extract_volume(path)
        all_content.update(extracted)
        print(f"✅ {path.name}: 提取 {len(extracted)} 章")

    total_words = sum(len(v) for v in all_content.values())
    print(f"\n📄 总字数（含空格）: {total_words}")

    OUTPUT_FILE.write_text(generate_ts(all_content), encoding="utf-8")
    print(f"📝 已写入: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
