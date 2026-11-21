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
const E = await import(path.join(root, 'assets/lab/eval/calc.js'));
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null;
const URL = BASE + '/model-degerlendirme.php';
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
ok(s[0][1] === '3' && s[0][2] === '-1' && s[0][3] === '2.3333' && s[0][4] === '2.3805' && s[0][5] === '0.915', 'acceptance: n=3, bias −1, MAE 2.3333, RMSE 2.3805, R² 0.915: ' + s[0].join('|'));
await page.click('#tab-export');
const [d1] = await Promise.all([page.waitForEvent('download'), page.click('#x-m')]);
const csv = (await readFile(await d1.path(), 'utf8')).replace(/^﻿/, '').split('\r\n');
ok(csv[0].startsWith('Source,Model,n,Bias'), 'EN CSV headers in English');
const v = csv[1].split(',');
ok(v[3] === '-1' && Math.abs(+v[4] - 7 / 3) < 1e-15 && Math.abs(+v[5] - Math.sqrt(17 / 3)) < 1e-15 && Math.abs(+v[6] - 0.915) < 1e-12, 'EN CSV full precision');
// English only: ?lang=tr redirects to the English page; the session and the decimal point stay
await page.goto(URL + '?lang=tr'); await page.waitForSelector('#tab-summary');
ok(!page.url().includes('lang='), '?lang=tr redirects to the page without the lang parameter');
await page.click('#tab-summary');
s = await summary();
ok(s[0][3] === '2.3333' && s[0][5] === '0.915', 'after the redirect: same values with a decimal point');
await page.click('#tab-export');
const [d2] = await Promise.all([page.waitForEvent('download'), page.click('#x-m')]);
const csv2 = (await readFile(await d2.path(), 'utf8')).replace(/^﻿/, '').split('\r\n');
ok(csv2[0] === csv[0] && csv2[1].split(',').slice(2).join() === v.slice(2).join(), 'after the redirect: English CSV headers, identical number rows');

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
await page.goto(URL + '?lang=en');
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
ok((await page.locator('#panel', { hasText: 'Common valid rows: 53 of 60' }).count()) === 1, 'dropped pairs reported');
ok((await page.locator('.statement', { hasText: 'external validation' }).count()) === 1, 'no external validation assumed for unstated source');
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
ok((await page.locator('.note.warn', { hasText: 'cannot be compared directly' }).count()) === 1, 'sample difference made visible');
await shot('ev-6-farkli-satirlar');
await page.click('#tab-export');
const [d4] = await Promise.all([page.waitForEvent('download'), page.click('#x-xlsx')]);
const wb = XLSX.read(await readFile(await d4.path()));
ok(wb.SheetNames.join(',') === 'Info,Measures,Row accounting,Inference,Groups,Residuals', 'XLSX sheets: ' + wb.SheetNames.join(','));
const resid = XLSX.utils.sheet_to_json(wb.Sheets.Residuals, { header: 1 });
ok(resid.length === 1 + 57 + 54 && resid[1][4] === resid[1][2] - resid[1][3], 'residual sheet: e = observed − predicted');

// 4b. inference: interval for the bias and equivalence tests (EN), values as in calc.js; then weights switch them off
await pasteRun('obs\tpred\tw\n10\t12\t1\n20\t18\t2\n30\t33\t1\n');
await page.click('#steps [data-go="2"]');
await page.selectOption('#level', '0.9');
await page.check('input[name="mtype"][value="abs"]');
ok(await page.locator('#calc').isDisabled(), 'equivalence chosen without a margin: Calculate disabled');
await page.fill('#mvalue', '20'); await page.locator('#mvalue').dispatchEvent('change');
await page.check('#boot'); await page.fill('#seed', '7'); await page.locator('#seed').dispatchEvent('change'); await page.selectOption('#bootB', '1000');
await page.click('#calc'); await page.waitForSelector('#panel table');
await page.click('#tab-infer');
const I = E.inference([-2, 2, -3], { level: 0.9, alpha: 0.05, margin: { type: 'abs', value: 20 } });
const fx = x => String(+x.toFixed(4));
const rows = await page.evaluate(() => [...document.querySelectorAll('#panel table')].map(t => [...t.querySelectorAll('tbody tr')].map(tr => [...tr.children].map(td => td.textContent.trim()))));
ok(rows[0][0][2] === fx(I.mean) && rows[0][0][6] === fx(I.ci.lo) && rows[0][0][7] === fx(I.ci.hi), `90% interval as calc.js: ${rows[0][0].join('|')}`);
ok(rows[2][0][3] === fx(I.equiv.tost.lo) && rows[2][0][5] === 'Yes' && rows[2][0][7] === fx(I.equiv.wellek.C) && rows[2][0][9] === (I.equiv.wellek.equivalent ? 'Yes' : 'Not shown'), `equivalence row as calc.js: ${rows[2][0].join('|')}`);
const Bt = E.bootstrapCI([10, 20, 30], [12, 18, 33], { B: 1000, seed: 7, level: 0.9 });
const bt = rows[1];   // first bootstrap table (one model)
ok(bt[0][0] === 'Bias ē' && bt[0][2] === fx(Bt.stats.bias.pct.lo) && bt[2][3].replace(' *', '') === fx(Bt.stats.rmse.pct.hi), `bootstrap table as calc.js: ${bt.map(r => r.join('|')).join(' / ')}`);
ok(rows[2][0][3] === fx(I.equiv.tost.lo), 'equivalence table follows the bootstrap table');
await shot('ev-8-cikarim-en');
await page.click('#tab-export');
const [d5] = await Promise.all([page.waitForEvent('download'), page.click('#x-i')]);
const ic = (await readFile(await d5.path(), 'utf8')).replace(/^\uFEFF/, '').split('\r\n');
ok(ic[0].startsWith('Model,n,Bias') && Math.abs(+ic[1].split(',')[7] - I.ci.lo) < 1e-12, 'inference CSV at full precision');
const [d6] = await Promise.all([page.waitForEvent('download'), page.click('#x-b')]);
const bcsv = (await readFile(await d6.path(), 'utf8')).replace(/^\uFEFF/, '').split('\r\n');
ok(bcsv.length >= 5 && Math.abs(+bcsv[3].split(',')[10] - Bt.stats.rmse.bca.hi) < 1e-12, 'bootstrap CSV: BCa at full precision: ' + bcsv[3]);
await page.click('#steps [data-go="2"]');
await page.selectOption('#wcol', { label: 'w' });
ok((await page.locator('.note.warn', { hasText: 'not computed' }).count()) === 1, 'weights: inference switched off, said in the settings');
await page.click('#calc'); await page.waitForSelector('#panel table');
s = await summary();
ok(s[0][2] === '-0.25' && (await page.locator('.note', { hasText: 'weighted by the column "w"' }).count()) === 1, 'weighted bias (−2 + 4 − 3)/4 = −0.25: ' + s[0].join('|'));
await page.click('#tab-infer');
ok((await page.locator('#panel .note.warn').count()) === 1, 'inference tab explains why nothing is computed');

// 4c. uncertainty of the ranking (1.2.0-beta.3): two models, bootstrap on; table as calc.js, Excel sheet
{ const T3 = 'obs\tm1\tm2\n10\t11\t13\n14\t13\t15\n20\t21\t18\n25\t24\t27\n31\t30\t29\n35\t36\t38\n40\t41\t37\n46\t44\t47\n';
  await pasteRun(T3);
  await page.click('#steps [data-go="2"]'); await page.check('[data-mc="2"]');
  await page.check('#boot'); await page.fill('#seed', '7'); await page.locator('#seed').dispatchEvent('change'); await page.selectOption('#bootB', '1000');
  await page.click('#calc'); await page.waitForSelector('#panel table'); await page.click('#tab-infer'); await page.waitForSelector('#rbtab');
  const L = T3.trim().split('\n').slice(1).map(l => l.split('\t').map(Number));
  const W = E.bootstrapRanks(L.map(r => r[0]), [L.map(r => r[1]), L.map(r => r[2])], { B: 1000, seed: 7, level: 0.95 });
  const fx = x => String(+x.toFixed(4));
  const cells = await page.evaluate(() => [...document.querySelectorAll('#rbtab tbody tr')].map(tr => ({ m: +tr.dataset.m, v: [...tr.querySelectorAll('td')].map(td => td.textContent.trim()) })));
  ok(cells.length === 2 && cells.every(({ m, v }) => v[0] === fx(W.models[m].overall) && v[1] === String(W.models[m].ordinal) && v[2] === fx(W.models[m].lo) && v[3].replace(' *', '') === fx(W.models[m].hi)
    && v[5] === `${String(+(100 * W.models[m].pBest).toFixed(1))} %`), 'rank uncertainty table as calc.js: ' + JSON.stringify(cells));
  await page.click('#tab-export');
  const [dx] = await Promise.all([page.waitForEvent('download'), page.click('#x-xlsx')]);
  const wbx = XLSX.read(await readFile(await dx.path()));
  const rs = XLSX.utils.sheet_to_json(wbx.Sheets['Rank uncertainty'], { header: 1 });
  ok(rs.length === 3 && Math.abs(rs[1][4] - W.models[0].lo) < 1e-12 && Math.abs(rs[2][7] - W.models[1].pBest) < 1e-12, 'Excel: rank uncertainty sheet at full precision');
}

// 5. phone + dark
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
phone.on('pageerror', e => errors.push(e.message));
await phone.goto(URL);
await phone.click('#sample'); await phone.waitForSelector('#impbox .fname');
await phone.click('#to2'); await phone.click('#calc'); await phone.click('#tab-charts');
ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no horizontal page scroll');
await shot('ev-7-telefon-koyu', phone);

ok(errors.length === 0, 'no console errors: ' + errors.join(' | '));
await browser.close();
console.log(`eval e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
