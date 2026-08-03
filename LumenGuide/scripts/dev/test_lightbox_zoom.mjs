import { chromium } from 'playwright';

const BASE = 'http://localhost:4188/LumenGuide/';
const results = [];
function check(name, cond, extra='') { results.push(`${cond?'PASS':'FAIL'} | ${name} ${extra}`); }

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForSelector('.win-nav-content', { timeout: 10000 });

// 注入一张测试图到文章区（绕过具体文章内容依赖）
await page.evaluate(() => {
  const c = document.querySelector('.win-nav-content');
  const img = document.createElement('img');
  img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><rect width="300" height="200" fill="%23c33"/></svg>';
  img.id = 'test-zoom-img';
  c.appendChild(img);
});

// 1) 点击图片 → 灯箱打开
await page.click('#test-zoom-img');
await page.waitForSelector('.img-lightbox-img', { state: 'visible', timeout: 5000 });
const t0 = await page.$eval('.img-lightbox-img', el => el.style.transform);
check('灯箱打开', true, `transform=${t0}`);

// 1b) 关闭按钮尺寸（桌面应 ≤34px）
const cw = await page.$eval('.img-lightbox-close', el => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; });
check('关闭按钮已缩小(桌面≤34)', cw.w <= 34 && cw.h <= 34, `size=${cw.w}x${cw.h}`);

// 2) 点「放大」按钮(＋) → scale 变大
await page.click('.lb-tool[title="放大"]');
await page.waitForTimeout(150);
const t1 = await page.$eval('.img-lightbox-img', el => el.style.transform);
const s1 = parseFloat((t1.match(/scale\(([^)]+)\)/) || [])[1] || '1');
check('放大按钮生效', s1 > 1, `scale=${s1}`);

// 3) 拖拽平移（放大后） → translate 改变
const box = await page.$eval('.img-lightbox-img', el => { const r = el.getBoundingClientRect(); return {x:r.x+r.width/2, y:r.y+r.height/2}; });
await page.mouse.move(box.x, box.y);
await page.mouse.down();
await page.mouse.move(box.x + 60, box.y + 40, { steps: 5 });
await page.mouse.up();
await page.waitForTimeout(100);
const t2 = await page.$eval('.img-lightbox-img', el => el.style.transform);
check('拖拽平移生效', /translate\([^0]/.test(t2), `transform=${t2}`);

// 4) 点「缩小」按钮(－) → scale 变小但仍>1 或回到1
await page.click('.lb-tool[title="缩小"]');
await page.waitForTimeout(120);
const t3 = await page.$eval('.img-lightbox-img', el => el.style.transform);
const s3 = parseFloat((t3.match(/scale\(([^)]+)\)/) || [])[1] || '1');
check('缩小按钮生效', s3 < s1, `scale=${s3}`);

// 5) 滚轮放大（先复位，再滚轮）
await page.click('.lb-tool[title="复位（原始大小）"]');
await page.waitForTimeout(100);
await page.mouse.move(box.x, box.y);
await page.mouse.wheel(0, -120); // 向上滚 = 放大
await page.waitForTimeout(120);
const t4 = await page.$eval('.img-lightbox-img', el => el.style.transform);
const s4 = parseFloat((t4.match(/scale\(([^)]+)\)/) || [])[1] || '1');
check('滚轮放大生效', s4 > 1, `scale=${s4}`);

// 6) 复位 → scale=1 且 translate=0
await page.click('.lb-tool[title="复位（原始大小）"]');
await page.waitForTimeout(100);
const t5 = await page.$eval('.img-lightbox-img', el => el.style.transform);
check('复位归零', /scale\(1\)/.test(t5) && /translate\(0px, 0px\)/.test(t5), `transform=${t5}`);

// 7) 关闭按钮 → 灯箱消失
await page.click('.img-lightbox-close');
await page.waitForTimeout(250);
const gone = await page.$('.img-lightbox-img') === null;
check('关闭按钮关闭灯箱', gone);

await browser.close();
console.log(results.join('\n'));
const failed = results.filter(r => r.startsWith('FAIL'));
console.log(failed.length ? `\n${failed.length} 项失败` : '\n全部通过');
process.exit(failed.length ? 1 : 0);
