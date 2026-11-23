// Browser test for Relative Ranking (Playwright, Chromium).
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/rank/e2e.mjs http://127.0.0.1:8092 [screenshot-dir]
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const XLSX = require(path.join(root, 'assets/vendor/sheetjs/xlsx.mini.min.js'));
const REF = JSON.parse(await readFile(path.join(root, 'tests/ref/rank.json'), 'utf8'));
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null;
const URL = BASE + '/relative-ranking.php';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async (n, p = page) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
const csv = async () => { const [d] = await Promise.all([page.waitForEvent('download'), page.click('#x-csv')]); return (await readFile(await d.path(), 'utf8')).replace(/^﻿/, '').split('\r\n'); };
const bestRef = s => { const i = REF[s].overall.indexOf(Math.min(...REF[s].overall)); return REF[s].models[i]; };

// 1. sample workbook (title row above the header, duplicate name, missing value, R² = FI, one poor model)
await page.goto(URL);
await page.click('#sample'); await page.waitForSelector('#impbox .fname');
await page.click('#to2');
ok(await page.locator('#hrow').inputValue() === '1', 'header row found under the title row');
ok(await page.locator('[data-dir="3"]').inputValue() === 'abs', 'Bias → closest to zero');
ok(await page.locator('[data-dir="1"]').inputValue() === 'max' && await page.locator('[data-dir="4"]').inputValue() === 'min', 'R² → max, RMSE → min');
await shot('rk-2-olcutler');
await page.click('#calc'); await page.waitForSelector('#panel table');
const first = await page.locator('#panel tbody tr').first().locator('th').textContent();
ok(first === bestRef('all'), `best model = numpy reference (${first})`);
ok((await page.locator('.note.warn', { hasText: 'M07' }).count()) === 1, 'duplicate name reported');
ok((await page.locator('.note.warn', { hasText: 'M06' }).count()) === 1, 'model with missing value listed, not ranked');
ok((await page.locator('.note.warn', { hasText: 'R² = FI' }).count()) === 1, 'identical criteria reported');
const last = await page.locator('#panel tbody tr').last().locator('td').last().textContent();
ok(last === '13', 'worst overall = m = 13');
await shot('rk-3-siralama');
// exclude the poor model M13 → m = 12, ranks recomputed
await page.locator('#panel tbody tr', { hasText: 'M13' }).locator('input[type=checkbox]').click();
ok((await page.locator('#panel', { hasText: '12 models ranked' }).count()) === 1, 'excluding a model recomputes with m = 12');
ok((await page.locator('#panel tbody tr').first().locator('th').textContent()) === bestRef('excl'), 'best after exclusion = reference');
ok((await page.locator('[data-back]').count()) === 1, 'excluded model listed with put-back button');
await shot('rk-4-dislama');
// radar: best 3 and worst 2
await page.click('#tab-radar');
await page.fill('#nb', '3'); await page.locator('#nb').dispatchEvent('change');
await page.fill('#nw', '2'); await page.locator('#nw').dispatchEvent('change');
ok((await page.locator('#ch-r polygon.ch-radar').count()) === 5, 'radar shows best 3 + worst 2');
await page.locator('details summary', { hasText: /^Also show$/ }).click();
await page.locator('[data-x]').nth(5).click();
ok((await page.locator('#ch-r polygon.ch-radar').count()) === 6, 'extra model added to radar');
await shot('rk-5-radar');
const [ds] = await Promise.all([page.waitForEvent('download'), page.click('#svg')]);
ok((await readFile(await ds.path(), 'utf8')).includes('<svg'), 'radar downloads as SVG');

// 2. exports, before and after a reload
await page.click('#tab-export');
const before = await csv();
await page.reload(); await page.waitForSelector('#tab-export');
await page.click('#tab-export');
const en = await csv();
ok(en[0].startsWith('Rank,Model,Row,R: R²') && before[0] === en[0], 'CSV header in English');
ok(en.length === 13 && before[1].split(',').slice(-1)[0] === en[1].split(',').slice(-1)[0], 'same values after a reload (m = 12 kept)');
const [dx] = await Promise.all([page.waitForEvent('download'), page.click('#x-xlsx')]);
ok(XLSX.read(await readFile(await dx.path())).SheetNames.join(',') === 'Info,Relative ranks,Criterion values,Criteria', 'XLSX sheets');

// 3. unknown criterion name needs a direction; pasted text table with decimal comma
await page.goto(URL);
await page.click('#steps [data-go="1"]'); await page.click('#reset');
await page.locator('#impbox details summary').click();
await page.fill('#impbox textarea', 'Model\tRMSE\tXYZ\nA\t1,20\t5\nB\t1,40\t6\nC\t1,10\t9\n');
await page.click('#impbox [data-act="paste"]'); await page.waitForSelector('#impbox .fname');
await page.click('#to2');
ok(await page.isDisabled('#calc') && (await page.locator('.crit.need').count()) === 1, 'unknown criterion blocks until a direction is chosen');
await page.selectOption('[data-dir="2"]', 'min');
await page.click('#calc'); await page.waitForSelector('#panel table');
const rowsTxt = await page.locator('#panel tbody tr th').allTextContents();
ok(rowsTxt.join(',') === 'A,C,B', 'ranking A, C, B: ' + rowsTxt.join(','));
// 3b. criterion weights (1.2.0): RMSE weight 4 → C, A, B (relative ranks RMSE A 5/3, B 3, C 1; XYZ A 1, B 1.5, C 3: A 23/3, B 13.5, C 7)
await page.click('#steps [data-go="2"]');
await page.fill('[data-w="1"]', '0'); await page.locator('[data-w="1"]').dispatchEvent('change');
ok(await page.isDisabled('#calc') && (await page.locator('.probs li', { hasText: 'Weight must be' }).count()) === 1, 'weight 0 refused, Calculate disabled');
await page.fill('[data-w="1"]', '4'); await page.locator('[data-w="1"]').dispatchEvent('change');
await page.click('#calc'); await page.waitForSelector('#panel table');
const wTxt = await page.locator('#panel tbody tr th').allTextContents();
ok(wTxt.join(',') === 'C,A,B' && (await page.locator('.note', { hasText: 'Weighted overall rank' }).count()) === 1 && (await page.textContent('#panel thead')).includes('w = 4'), 'weighted ranking C, A, B with the weights shown: ' + wTxt.join(','));

// 4. phone + dark
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
phone.on('pageerror', e => errors.push(e.message));
await phone.goto(URL);
await phone.click('#sample'); await phone.waitForSelector('#impbox .fname');
await phone.click('#to2'); await phone.click('#calc'); await phone.click('#tab-radar');
ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no horizontal page scroll');
await shot('rk-6-telefon-koyu', phone);

ok(errors.length === 0, 'no console errors: ' + errors.join(' | '));
await browser.close();
console.log(`rank e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
