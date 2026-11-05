// Browser test for Model Evaluation (Playwright, Chromium).
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/eval/e2e.mjs http://127.0.0.1:8092 [screenshot-dir]
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const XLSX = require(path.join(root, 'assets/vendor/sheetjs/xlsx.mini.min.js'));
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null;
const URL = BASE + '/araclar/model-degerlendirme.php';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async (n, p = page) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
const summary = () => page.evaluate(() => [...document.querySelectorAll('#panel table')[0].querySelectorAll('tbody tr')].map(tr => [...tr.children].map(td => td.textContent.trim())));
async function pasteRun(text, lang = 'en') {
  await page.goto(URL + '?lang=' + lang);
  if (await page.locator('#steps [data-go="1"]').isEnabled()) await page.click('#steps [data-go="1"]');
  page.once('dialog', d => d.accept());
  await page.click('#reset');
  await page.locator('#impbox details summary').click();
  await page.fill('#impbox textarea', text);
  await page.click('#impbox [data-act="paste"]');
  await page.waitForSelector('#impbox .fname');
  await page.click('#to2');
  await page.selectOption('#obs', { label: 'obs' });
  await page.check('[data-mc="1"]');
  if (!(await page.isChecked('input[name="dec"][value="."]'))) await page.check('input[name="dec"][value="."]');
  await page.click('#calc');
  await page.waitForSelector('#panel table');
}

// 1. acceptance example (EN)
await pasteRun('obs\tpred\n10\t12\n20\t18\n30\t33\n');
let s = await summary();
ok(s[0][1] === '3' && s[0][2] === '1' && s[0][3] === '2.3333' && s[0][4] === '2.3805' && s[0][5] === '0.915', 'acceptance: n=3, bias 1, MAE 2.3333, RMSE 2.3805, R² 0.915: ' + s[0].join('|'));
await page.click('#tab-export');
const [d1] = await Promise.all([page.waitForEvent('download'), page.click('#x-m')]);
const csv = (await readFile(await d1.path(), 'utf8')).replace(/^﻿/, '').split('\r\n');
ok(csv[0].startsWith('Source,Model,n,Bias'), 'EN CSV headers in English');
const v = csv[1].split(',');
ok(v[3] === '1' && Math.abs(+v[4] - 7 / 3) < 1e-15 && Math.abs(+v[5] - Math.sqrt(17 / 3)) < 1e-15 && Math.abs(+v[6] - 0.915) < 1e-12, 'EN CSV full precision');
await page.click('#langlink'); await page.waitForURL(/lang=tr/); await page.waitForSelector('#tab-summary');
await page.click('#tab-summary');
s = await summary();
ok(s[0][3] === '2,3333' && s[0][5] === '0,915', 'TR: same values, Turkish format');
await page.click('#tab-export');
const [d2] = await Promise.all([page.waitForEvent('download'), page.click('#x-m')]);
const csvTr = (await readFile(await d2.path(), 'utf8')).replace(/^﻿/, '').split('\r\n');
ok(csvTr[0].startsWith('Kaynak;Model;n;Yanlılık') && csvTr[1].split(';')[5] === v[5].replace('.', ','), 'TR CSV: Turkish headers, same numbers');

// 2. perfect prediction
await pasteRun('obs\tpred\n10\t10\n20\t20\n30\t30\n');
s = await summary();
ok(s[0][2] === '0' && s[0][3] === '0' && s[0][4] === '0' && s[0][5] === '1', 'perfect: 0, 0, 0, R² = 1');

// 3. constant observed → R² undefined; negative R² shown as is
await pasteRun('obs\tpred\n5\t4\n5\t5\n5\t7\n');
s = await summary();
ok(s[0][5] === 'undefined' && (await page.locator('.note.warn', { hasText: 'SST = 0' }).count()) === 1, 'constant observed: R² undefined');
await pasteRun('obs\tpred\n10\t30\n20\t10\n30\t50\n');
s = await summary();
ok(s[0][5].startsWith('-'), 'negative R² not clipped: ' + s[0][5]);

// 4. sample: missing / unreadable pairs, two models, common vs own rows, groups, charts
await page.goto(URL + '?lang=tr');
await page.click('#steps [data-go="1"]');
await page.click('#sample'); await page.waitForSelector('#impbox .fname');
await page.click('#to2');
ok(await page.isChecked('input[name="dec"][value=","]'), 'decimal comma recognised');
await page.selectOption('[data-mr="5"]', 'cv');
await page.check('input[name="norm"][value="mean"]');
await shot('ev-2-ayarlar');
await page.click('#calc'); await page.waitForSelector('#panel table');
s = await summary();
ok(s[0][1] === '53' && s[1][1] === '53', 'common rows: both models n = 53');
ok((await page.locator('#panel', { hasText: 'Ortak geçerli satır: 53 / 60' }).count()) === 1, 'dropped pairs reported');
ok((await page.locator('.statement', { hasText: 'dış doğrulama' }).count()) === 1, 'no external validation assumed for unstated source');
await shot('ev-3-ozet');
await page.click('#tab-charts');
ok((await page.locator('#ch-op .ch-ref').count()) === 1 && (await page.locator('#ch-op circle').count()) === 53, 'observed–predicted plot with 1:1 line, 53 points');
ok((await page.locator('#ch-rp .ch-ref').count()) === 1, 'residual plot with zero line');
await shot('ev-4-grafik');
const [d3] = await Promise.all([page.waitForEvent('download'), page.click('[data-svg="ch-op"]')]);
ok((await readFile(await d3.path(), 'utf8')).includes('<svg'), 'chart downloads as SVG');
await page.click('#tab-groups');
await page.selectOption('#gk', 'dclass');
ok((await page.locator('#panel th', { hasText: '[8, 20)' }).count()) === 2, 'diameter class groups for both models');
await shot('ev-5-gruplar');
await page.click('#steps [data-go="2"]');
await page.check('input[name="rs"][value="own"]');
await page.click('#calc'); await page.waitForSelector('#panel table');
s = await summary();
ok(s[0][1] === '57' && s[1][1] === '54', 'own rows: n = 57 and 54');
ok((await page.locator('.note.warn', { hasText: 'doğrudan karşılaştırılamaz' }).count()) === 1, 'sample difference made visible');
await shot('ev-6-farkli-satirlar');
await page.click('#tab-export');
const [d4] = await Promise.all([page.waitForEvent('download'), page.click('#x-xlsx')]);
const wb = XLSX.read(await readFile(await d4.path()));
ok(wb.SheetNames.join(',') === 'Bilgi,Olcutler,Satir sayimi,Gruplar,Artiklar', 'XLSX sheets: ' + wb.SheetNames.join(','));
const resid = XLSX.utils.sheet_to_json(wb.Sheets.Artiklar, { header: 1 });
ok(resid.length === 1 + 57 + 54 && resid[1][4] === resid[1][3] - resid[1][2], 'residual sheet: e = predicted − observed');

// 5. phone + dark
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
phone.on('pageerror', e => errors.push(e.message));
await phone.goto(URL + '?lang=tr');
await phone.click('#sample'); await phone.waitForSelector('#impbox .fname');
await phone.click('#to2'); await phone.click('#calc'); await phone.click('#tab-charts');
ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no horizontal page scroll');
await shot('ev-7-telefon-koyu', phone);

ok(errors.length === 0, 'no console errors: ' + errors.join(' | '));
await browser.close();
console.log(`eval e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
