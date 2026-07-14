import pw from 'file:///C:/Users/Xzh20/.workbuddy/binaries/node/workspace/node_modules/playwright-core/index.js';
const { chromium } = pw;

const browser = await chromium.launch({ channel: 'msedge' });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
await page.goto('https://blog.oxzh.top/LumenGuide/', { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(2000);

const info = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return { rect: { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) }, width: s.width, height: s.height, maxWidth: s.maxWidth, transform: s.transform, position: s.position, display: s.display };
  };
  // 从 .win-nav-shell 往上遍历父链
  const chain = [];
  let el = document.querySelector('.win-nav-shell');
  let depth = 0;
  while (el && depth < 12) {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    chain.push({
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      cls: el.className || '',
      w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y),
      width: s.width, maxWidth: s.maxWidth, position: s.position, display: s.display, flex: s.flexDirection
    });
    el = el.parentElement;
    depth++;
  }
  return { innerW: window.innerWidth, innerH: window.innerHeight, chain };
});

console.log('=== LAYOUT INFO ===');
console.log('innerW=' + info.innerW + ' innerH=' + info.innerH);
console.log('=== PARENT CHAIN from .win-nav-shell ===');
info.chain.forEach((n, i) => console.log(i + ': <' + n.tag + (n.id ? '#' + n.id : '') + '> class="' + (n.cls.length > 60 ? n.cls.slice(0, 60) + '...' : n.cls) + '"  ' + n.w + 'x' + n.h + ' @(' + n.x + ',' + n.y + ')  width=' + n.width + ' maxW=' + n.maxWidth + ' pos=' + n.position + ' disp=' + n.display));
console.log('=== FULL ===');
console.log(JSON.stringify(info, null, 2));
console.log('=== CONSOLE ERRORS ===');
console.log(errs.join('\n') || '(none)');

await page.screenshot({ path: 'D:/new/LumenGuide/desktop-shot.png' });
await browser.close();
