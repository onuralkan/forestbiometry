// Browser test for the Inventory Sampling Planner (Playwright, Chromium).
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/sampling/e2e.mjs http://127.0.0.1:8092 [screenshot-dir]
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const XLSX = require(path.join(root, 'assets/vendor/sheetjs/xlsx.mini.min.js'));
const REF = JSON.parse(await readFile(path.join(root, 'tests/ref/sampling.json'), 'utf8'));
const FIX = await readFile(path.join(root, 'tests/sampling/fixture.csv'), 'utf8');
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null;
const URL = BASE + '/sampling-planner.php';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async (n, p = page) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
const tile = async id => (await page.locator(`#${id} b`).textContent()).trim();
const dl = async btn => { const [d] = await Promise.all([page.waitForEvent('download'), page.click(btn)]); return d; };

// 1. acceptance with a typed CV: CV 30 %, E 10 %, 95 %, no frame → 35
await page.goto(URL); await page.waitForSelector('#app .statement');
ok((await page.locator('.statement', { hasText: 'not a power analysis for a hypothesis test' }).count()) === 1, 'scope statement: not a power analysis');
await page.check('input[name="src"][value="manual"]');
ok((await page.locator('#c-res li', { hasText: 'No CV' }).count()) === 1, 'missing CV reported, no number shown');
await page.fill('#cv', '30');
ok(await tile('t-n') === '35' && (await page.locator('#nofpc').count()) === 1 && (await page.locator('#calc1').count()) === 0, '35 plots; no finite correction applied');
ok((await page.locator('#calc0').textContent()).includes('1.96') && (await page.locator('#calc0').textContent()).includes('34.573'), 'calculation shown with numbers (decimal point)');
// E smaller → n larger; the table and chart
await page.fill('#e', '5');
ok(+await tile('t-n') === REF.grid_cv30_95['5'].inf.n && +await tile('t-n') > 35, 'E = 5 % → more plots: ' + await tile('t-n'));
const gn = await page.$$eval('#gtab tbody tr', rs => rs.map(r => +r.children[2].textContent));
ok(gn.every((v, i) => i === 0 || v <= gn[i - 1]) && gn.length === 9, 'table: n decreases as E grows');
ok((await page.locator('#gtab tr.tail').count()) === 1 && (await page.locator('#ch-n circle').count()) === 9, 'own target marked; chart with points');
await page.fill('#e', '10');
// a frame size only counts when the finite frame is chosen
await page.check('input[name="fr"][value="fin"]');
ok((await page.locator('#c-res li', { hasText: 'M is missing' }).count()) === 1, 'finite frame without M: asks for M');
await page.fill('#M', '500');
ok(+await tile('t-n') === REF.grid_cv30_95['10'].M500.n && (await page.locator('#calc1').count()) === 1, 'M = 500: corrected n = ' + await tile('t-n'));
await page.fill('#M', '120.5');
ok((await page.locator('#c-res li', { hasText: 'whole number' }).count()) === 1, 'non-integer M rejected');
await page.fill('#M', '500');
await page.check('input[name="fr"][value="inf"]');
ok(await tile('t-n') === '35', 'back to no frame: M ignored, 35 again');
// invalid inputs
await page.fill('#e', '0'); ok((await page.locator('#c-res li', { hasText: 'between 0 and 100' }).count()) === 1, 'E = 0 rejected');
await page.fill('#e', '-3'); ok((await page.locator('#c-res li', { hasText: 'between 0 and 100' }).count()) === 1, 'negative E rejected');
await page.fill('#e', '10'); await page.fill('#cv', '-30'); ok((await page.locator('#c-res li', { hasText: 'CV must be positive' }).count()) === 1, 'negative CV rejected');
await page.fill('#cv', 'abc'); ok((await page.locator('#c-res li', { hasText: 'No CV' }).count()) === 1, 'unreadable CV rejected');
await page.fill('#cv', '30');
// existing plots, part of the design → additional
await page.fill('#nex', '12');
ok((await page.locator('#t-add').count()) === 0, 'existing plots not counted until declared part of the design');
await page.check('#indesign');
ok(await tile('t-add') === '23', '12 existing in the design → 23 more');
await shot('sp-1-elle-cv');

// 2. pilot data (sample): CV from plot-level values
await page.check('input[name="src"][value="pilot"]');
await page.click('#sample'); await page.waitForSelector('#plstats');
ok((await page.locator('#plstats').textContent()).includes('n = 13') && (await page.locator('#placc', { hasText: '1 empty' }).count()) === 1, 'sample: 13 plots, one empty reported');
ok((await page.locator('#c-res li', { hasText: 'Confirm the statement' }).count()) === 1, 'calculation waits for the plot-level statement');
await page.check('#confirm');
const cvS = REF.sample.cv, n95 = Math.ceil(REF.z['95'] ** 2 * (cvS / 10) ** 2 - 1e-9);
ok(+await tile('t-n') === n95, `pilot CV ${cvS.toFixed(3)} % → ${n95} plots`);
await shot('sp-2-pilot');
// summary download
await page.check('#indesign');
const txt = (await readFile(await (await dl('#x-txt')).path(), 'utf8')).split('\r\n');
ok(txt[0].includes('Inventory Sampling Planner') && txt.some(l => l.startsWith('n₀ = z² × (CV / E)²')) && txt.some(l => l.includes('No finite frame stated')), 'summary: approach and frame');
ok(txt.some(l => l.includes('Normal (z) approximation')) && txt.some(l => l.includes('power analysis for a hypothesis test')), 'summary: assumptions and scope');
ok(txt.some(l => l.includes(`${n95 - 13} more needed`)), 'summary: additional plots');
const csv = (await readFile(await (await dl('#x-csv')).path(), 'utf8')).replace(/^﻿/, '').split('\r\n');
ok(csv[0].startsWith('E (%),n₀ (not rounded),Plots needed,Additional') && csv.length >= 10, 'error-target table CSV');

// 3. edge-case file: two periods → duplicates; filter one period; negative and unreadable rows
const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('#impbox .filebtn')]);
await fc.setFiles({ name: 'pilot-donemler.csv', mimeType: 'text/csv', buffer: Buffer.from(FIX) });
await page.waitForSelector('#impbox .fname');
await page.selectOption('#vcol', '2');
ok((await page.locator('#pcols .note.err', { hasText: 'The same plot identifier' }).count()) === 1 && (await page.locator('#c-res li', { hasText: 'The same plot identifier' }).count()) === 1, 'duplicated plot ids block the calculation');
await page.selectOption('#fcol', '1'); await page.selectOption('#fval', '2023');
ok((await page.locator('#placc', { hasText: '1 negative values (row 4)' }).count()) === 1 && (await page.locator('#placc', { hasText: '1 unreadable (row 5)' }).count()) === 1, 'negative and unreadable values reported with row numbers');
await page.check('#confirm');
ok(+await tile('t-n') === Math.ceil(REF.z['95'] ** 2 * (REF.fixture2023.cv / 10) ** 2 - 1e-9), 'filtered pilot used');
// tree-level column name and zero mean
const tree = 'plot,dbh\nP1,20\nP2,31\nP3,25\n';
const [fc2] = await Promise.all([page.waitForEvent('filechooser'), page.click('#impbox .filebtn')]);
await fc2.setFiles({ name: 'agaclar.csv', mimeType: 'text/csv', buffer: Buffer.from(tree) });
await page.locator('#impbox .fname', { hasText: 'agaclar.csv' }).waitFor(); await page.selectOption('#vcol', '1');
ok((await page.locator('#pcols .note.err', { hasText: 'tree-level measurement' }).count()) === 1, 'tree-level column name warned');
const zero = 'plot,V\nP1,0\nP2,0\nP3,0\n';
const [fc3] = await Promise.all([page.waitForEvent('filechooser'), page.click('#impbox .filebtn')]);
await fc3.setFiles({ name: 'sifir.csv', mimeType: 'text/csv', buffer: Buffer.from(zero) });
await page.locator('#impbox .fname', { hasText: 'sifir.csv' }).waitFor(); await page.selectOption('#vcol', '1');
ok((await page.locator('#plprob', { hasText: 'undefined' }).count()) === 1 && (await page.locator('#t-n').count()) === 0, 'zero mean: relative error undefined, no result');
await shot('sp-3-sifir-ortalama');

// 4. session kept after a reload, other confidence level, XLSX
await page.check('input[name="src"][value="manual"]');
await page.reload(); await page.waitForSelector('#c-res #t-n');
ok(await tile('t-n') === '35', 'reload: session kept, 35');
await page.selectOption('#level', '99');
ok(+await tile('t-n') === Math.ceil(REF.z['99'] ** 2 * 9 - 1e-9), '99 % confidence: ' + await tile('t-n'));
await page.selectOption('#level', 'other'); await page.fill('#lvo', '99.9');
ok(+await tile('t-n') === Math.ceil(REF.z['99.9'] ** 2 * 9 - 1e-9), '99.9 % via "other"');
const wb = XLSX.read(await readFile(await (await dl('#x-xlsx')).path()));
ok(wb.SheetNames.join(',') === 'Summary,Error targets', 'XLSX sheets: ' + wb.SheetNames.join(','));

// 5. phone + dark
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
phone.on('pageerror', e => errors.push(e.message));
await phone.goto(URL); await phone.check('input[name="src"][value="manual"]'); await phone.fill('#cv', '30');
ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no horizontal page scroll');
await shot('sp-4-telefon-koyu', phone);

ok(errors.length === 0, 'no console errors: ' + errors.join(' | '));
await browser.close();
console.log(`sampling e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
