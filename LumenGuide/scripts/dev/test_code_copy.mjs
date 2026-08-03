import { chromium } from 'playwright';

const BASE = 'http://localhost:4188/LumenGuide/';
const results = [];
function check(name, cond, extra = '') { results.push(`${cond ? 'PASS' : 'FAIL'} | ${name} ${extra}`); }

const browser = await chromium.launch({ channel: 'msedge' });
const context = await browser.newContext({
  permissions: ['clipboard-read', 'clipboard-write'],
  viewport: { width: 1280, height: 800 },
});
const page = await context.newPage();
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForSelector('.win-nav-content', { timeout: 10000 });

// 用 #ch10-2 哈希深链直接打开真实文章（绕开导航点击）
let usingReal = true;
try {
  await page.evaluate(() => { location.hash = 'ch10-2'; });
  await page.waitForSelector('.inline-code, .code-block', { timeout: 6000 });
} catch (e) {
  usingReal = false;
  console.log('打开文章失败:', e.message);
}
check('真实文章已打开(ch10-2)', usingReal);

// 注入一个 fenced 代码块到 .article 容器内（ArticlePage 的 :deep 样式才会作用到它）
const injectSel = (await page.$('.article')) ? '.article' : '.win-nav-content';
await page.evaluate((sel) => {
  const c = document.querySelector(sel);
  const block = document.createElement('div');
  block.className = 'code-block';
  block.innerHTML =
    '<button class="copy-code-btn" type="button"><svg class="ic-copy"></svg><svg class="ic-done"></svg></button>' +
    '<pre><code>FENCED_COPY_TEST_456</code></pre>';
  c.appendChild(block);
}, injectSel);

// ---- 1) fenced 代码块「复制」按钮 ----
const codeText = 'FENCED_COPY_TEST_456';
await page.evaluate(() => navigator.clipboard.writeText('').catch(() => {}));
const btn = page.locator('.copy-code-btn').first();
await btn.click();
await page.waitForTimeout(250);
const copied = await btn.evaluate(el => el.classList.contains('copied'));
check('点击后显示「已复制」(.copied)', copied);

const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => '(denied)'));
check('剪贴板内容=代码文本', clip === codeText, `clip=${JSON.stringify(clip)}`);

const btnBox = await btn.boundingBox();
check('复制按钮可见且定位', !!btnBox && btnBox.width > 0 && btnBox.height > 0,
  btnBox ? `${Math.round(btnBox.width)}x${Math.round(btnBox.height)}` : 'no-box');

const iconState = await btn.evaluate(el => {
  const c = el.querySelector('.ic-copy');
  const d = el.querySelector('.ic-done');
  return {
    copyShown: c ? getComputedStyle(c).display !== 'none' : false,
    doneShown: d ? getComputedStyle(d).display !== 'none' : false,
  };
});
check('复制后切换到「已复制」图标', iconState.doneShown && !iconState.copyShown, JSON.stringify(iconState));

// ---- 2) 行内代码点击复制（真实文章 ch10-2 里的 QQ 路径）----
if (usingReal) {
  const inlineEl = page.locator('code.inline-code').first();
  if (await inlineEl.count()) {
    const inlineText = await inlineEl.evaluate(el => el.textContent);
    await inlineEl.click();
    await page.waitForTimeout(200);
    const ic = await inlineEl.evaluate(el => el.classList.contains('copied'));
    check('行内代码点击后显示已复制', ic);
    const clip2 = await page.evaluate(() => navigator.clipboard.readText().catch(() => '(denied)'));
    check('行内代码剪贴板正确', clip2 === inlineText, `clip=${JSON.stringify(clip2)} code=${JSON.stringify(inlineText)}`);
  } else {
    check('行内代码存在', false, '未找到 inline-code');
  }
}

await browser.close();
console.log(results.join('\n'));
const failed = results.filter(r => r.startsWith('FAIL'));
console.log(failed.length ? `\n${failed.length} 项失败` : '\n全部通过');
process.exit(failed.length ? 1 : 0);
