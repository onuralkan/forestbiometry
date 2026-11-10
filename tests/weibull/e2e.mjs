// Browser test for the Diameter Distribution Lab, Weibull version (Playwright, Chromium).
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/weibull/e2e.mjs http://127.0.0.1:8092 [screenshot-dir]
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { parseDelimited } = await import('../../assets/lab/core/table.js');
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const XLSX = require(path.join(root, 'assets/vendor/sheetjs/xlsx.mini.min.js'));
const REF = JSON.parse(await readFile(path.join(root, 'tests/ref/weibull.json'), 'utf8'));
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null;
const URL = BASE + '/cap-dagilimi.php';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async (n, p = page) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
const csvOf = async btn => { const [d] = await Promise.all([page.waitForEvent('download'), page.click(btn)]); return (await readFile(await d.path(), 'utf8')).replace(/^﻿/, '').split('\r\n'); };

// 1. sample data, TR; truncation question must be answered; known threshold blocks fitting
await page.goto(URL + '?lang=tr');
await page.click('#sample'); await page.waitForSelector('#impbox .fname');
await page.click('#to2');
ok(await page.isDisabled('#calc'), 'cannot calculate before the threshold question is answered');
await page.check('input[name="tr"][value="yes"]');
ok(await page.isDisabled('#calc') && (await page.locator('.note.err', { hasText: 'kesilmiş Weibull olabilirliği' }).count()) === 1, 'known threshold: fitting blocked, method named');
await page.check('input[name="tr"][value="none"]');
ok(await page.isChecked('input[name="dec"][value=","]'), 'decimal comma recognised');
ok(await page.isChecked('input[name="an"][value="each"]'), 'each plot separately by default');
await page.fill('#afix', '5'); await page.locator('#afix').dispatchEvent('change');
await shot('wb-2-ayarlar');
await page.click('#calc'); await page.waitForSelector('#panel table');
// unit P01: values against SciPy (per-plot reference)
await page.click('#ulist [data-u="P01"]');
const row0 = await page.evaluate(() => [...document.querySelector('#panel tbody tr').children].map(td => td.textContent.trim()));
const rP = REF.per_plot.P01;
ok(!/,/.test(row0[2] + row0[3]) && Math.abs(parseFloat(row0[2]) - rP.b) < 6e-5, 'P01 ML b matches SciPy (decimal point in Turkish): ' + row0[2]);
ok(Math.abs(parseFloat(row0[3]) - rP.c) < 6e-5, 'P01 ML c matches SciPy: ' + row0[3]);
ok((await page.locator('#panel', { hasText: 'p değeri sunulmaz' }).count()) === 1, 'no p-values, reason stated');
ok((await page.locator('#panel td', { hasText: 'sabit' }).count()) >= 2, 'fixed a labelled as fixed');
await shot('wb-3-parametreler');
await page.click('#tab-plots');
ok((await page.locator('#panel tr', { hasText: 'K1' }).locator('td.undef', { hasText: 'Bütün çaplar aynı' }).count()) >= 1, 'constant plot reported, not fitted');
ok((await page.locator('#panel tr', { hasText: 'K2' }).locator('td.undef', { hasText: 'En az 2 çap' }).count()) >= 1, 'single-tree plot reported');
await shot('wb-4-alanlar');
await page.click('#tab-charts');
// navigator: list, prev/next buttons and arrow keys
ok((await page.locator('#ulist .uitem').count()) === 5, 'navigator lists the 5 plots');
const lab = async () => (await page.locator('.navlab b').textContent());
const startLab = await lab();
await page.click('#unext'); const afterNext = await lab();
await page.click('#uprev'); ok(await lab() === startLab && afterNext !== startLab, 'next / previous buttons');
await page.locator('h1').click(); await page.keyboard.press('ArrowRight');
ok(await lab() === afterNext, '→ key moves to the next plot');
await page.check('#ubad');
ok((await page.locator('#ulist [data-u="K1"]').count()) === 1 && (await page.locator('#ulist [data-u="K2"]').count()) === 1 && (await page.locator('#ulist .uitem .st-ok').count()) === 0, 'problems-only filter keeps only plots with problems (incl. K1, K2)');
await page.uncheck('#ubad');
await page.selectOption('#usort', 'ks');
await page.fill('#uq', 'P0');
ok((await page.locator('#ulist .uitem').count()) === 2, 'search filters the list');
await page.fill('#uq', '');
await page.click('#ulist [data-u="P02"]');
ok((await page.locator('#ch-h path.ch-line').count()) >= 2 && (await page.locator('#ch-c path.ch-line').count()) >= 3, 'histogram with densities, ECDF with fitted CDFs');
await shot('wb-5-grafik');
await page.click('#tab-classes');
ok((await page.locator('.navlab b').textContent()).includes('P02'), 'selected plot kept across tabs');
const tails = await page.locator('#panel tr.tail').count();
ok(tails === 2, 'lower and upper tail rows shown');
ok((await page.locator('#panel tr', { hasText: 'Toplam (sınıflar + kuyruklar)' }).locator('td').nth(1).textContent()) === '1', 'probabilities incl. tails sum to 1');
await shot('wb-6-siniflar');

// 2. pooled analysis warning; language switch keeps values
await page.click('#steps [data-go="2"]');
await page.check('input[name="an"][value="pool"]');
ok((await page.locator('.note.warn', { hasText: 'eşit büyüklükte değilse' }).count()) === 1, 'pooling warning shown');
await page.click('#calc'); await page.click('#tab-export');
const pTr = await csvOf('#x-p');
await page.click('#langlink'); await page.waitForURL(/lang=en/); await page.waitForSelector('#tab-export');
await page.click('#tab-export');
const pEn = await csvOf('#x-p');
ok(pEn[0].startsWith('Unit of analysis,Method,Form,a (cm)'), 'EN headers');
const trB = parseDelimited(pTr[1], ',')[0][4], enB = parseDelimited(pEn[1], ',')[0][4];
ok(trB === enB && +enB > 0, 'same b in TR and EN exports: ' + enB);
const [dx] = await Promise.all([page.waitForEvent('download'), page.click('#x-xlsx')]);
const wb = XLSX.read(await readFile(await dx.path()));
ok(wb.SheetNames.join(',') === 'Info,Parameters,Classes', 'XLSX sheets');

// 3. curve explorer is separate and labelled
await page.locator('#exdet summary').click();
ok((await page.locator('#explore .tag', { hasText: 'not a fit to data' }).count()) === 1, 'explorer labelled as illustration');
await page.fill('#ex-c', '0');
ok((await page.locator('#explore .note.err').count()) === 1, 'explorer rejects c = 0');
await page.fill('#ex-c', '3.6');
ok((await page.locator('#explore svg').count()) === 2, 'explorer draws pdf and cdf');
await shot('wb-7-gezgin');

// 4. phone + dark
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
phone.on('pageerror', e => errors.push(e.message));
await phone.goto(URL + '?lang=tr');
await phone.click('#sample'); await phone.waitForSelector('#impbox .fname');
await phone.click('#to2'); await phone.check('input[name="tr"][value="none"]'); await phone.click('#calc'); await phone.click('#tab-charts');
ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no horizontal page scroll');
await shot('wb-8-telefon-koyu', phone);

ok(errors.length === 0, 'no console errors: ' + errors.join(' | '));
await browser.close();
console.log(`weibull e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
