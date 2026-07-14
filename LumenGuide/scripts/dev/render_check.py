import sys
from playwright.sync_api import sync_playwright

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
BASE = "http://localhost:63182/LumenGuide/"

TARGETS = [
    ("settings", "settings"),
    ("article", "ch1-1"),
    ("home", "home"),
]

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=EDGE, args=["--no-sandbox"])
    page = browser.new_page(viewport={"width": 1100, "height": 900})
    # Force ONLY the embedded icon font (no Segoe fallback) to simulate Mac/phone
    page.add_init_script(
        "localStorage.setItem('winui-current-page', 'PLACEHOLDER');"
    )
    for name, cp in TARGETS:
        page.add_init_script(
            "localStorage.setItem('winui-current-page', '%s');" % cp
        )
        page.goto(BASE, wait_until="networkidle")
        # inject forcing style after load: ONLY the embedded icon font for
        # icon elements (drop Segoe fallback) to simulate Mac/phone with no Segoe
        ICON_SEL = (".icon,.icon-btn,.ptr-icon-wrapper,.symbol-icon,.win-asb-icon,"
                    ".win-symbol-icon,.win-expander-arrow,.close-icon,.infobadge-icon,"
                    ".win-password-reveal span,.win-pull-to-refresh,.win-textbox-delete-glyph,"
                    ".win-number-compact-indicator span,.win-number-popup-button span,"
                    ".checkbox-box.is-checked:after,.checkbox-box.is-indeterminate:after,"
                    ".radio-box.is-checked:after")
        page.add_style_tag(content=(
            ICON_SEL + "{font-family:'LumenGuideIcons',sans-serif !important;}"
        ))
        page.wait_for_timeout(800)
        # report whether LumenGuideIcons loaded
        loaded = page.evaluate(
            "document.fonts.check(\"16px 'LumenGuideIcons'\")"
        )
        print(name, "LumenGuideIcons loaded:", loaded)
        page.screenshot(path="shot_%s.png" % name, full_page=False)
    browser.close()
print("done")
