// Browser test for Plot & Stand Metrics (Playwright, Chromium).
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/stand/e2e.mjs http://127.0.0.1:8092 [screenshot-dir]
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const XLSX = require(path.join(root, 'assets/vendor/sheetjs/xlsx.mini.min.js'));
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null;
const URL = BASE + '/ornek-alan.php';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async (n, p = page) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
const cell = (row, col) => page.evaluate(([r, c]) => { const tr = [...document.querySelectorAll('table.units tbody tr')].find(x => x.querySelector('code').textContent === r[0] && x.children[1].textContent === r[1]); return tr ? tr.children[c].textContent : null; }, [row, col]);

// 1. acceptance example as an uploaded data package: 500 m², d = 10, 20, 30 cm
const acc = { schema: 'forest-dataset/1', created: '2026-11-05T00:00:00Z', plots: [{ plot_id: 'K', plot_area: 500, stratum: null }],
  trees: [10, 20, 30].map((d, i) => ({ row: i + 2, plot_id: 'K', tree_id: String(i + 1), stem_id: null, period: null, species: 'Pb', dbh: d, height: null, status: null, extra: {} })) };
await page.goto(URL + '?lang=en');
await page.setInputFiles('#dsfile', { name: 'kabul.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(acc)) });
await page.waitForSelector('.note.ok');
ok(await page.isDisabled('#to2'), 'cannot continue without the fixed-area confirmation');
await page.check('#scope'); await page.click('#to2');
await page.click('#calc');
await page.waitForSelector('table.units');
ok(await cell(['K', '–'], 5) === '60', 'EN: N = 60 trees/ha');
ok(await cell(['K', '–'], 6) === '2.199', 'EN: G = 2.199 m²/ha');
ok(await cell(['K', '–'], 7) === '20', 'EN: mean d = 20 cm');
ok(await cell(['K', '–'], 8) === '21.6', 'EN: Dq = 21.6 cm');
await page.click('#tab-export');
const [d1] = await Promise.all([page.waitForEvent('download'), page.click('#x-units')]);
const csvEn = (await readFile(await d1.path(), 'utf8')).replace(/^﻿/, '').split('\r\n');
const row = csvEn[1].split(',');
ok(row[7] === '60' && Math.abs(+row[9] - 2.1991148575128552) < 1e-12 && Math.abs(+row[11] - 21.602468994692867) < 1e-12, 'EN CSV: full-precision N, G, Dq');
// language switch keeps state, values identical
await page.click('#langlink'); await page.waitForURL(/lang=tr/); await page.waitForSelector('#tab-units');
await page.click('#tab-units');
ok(await cell(['K', '–'], 6) === '2.199' && await cell(['K', '–'], 8) === '21.6', 'TR: same values, decimal point as in English');
// a single plot and period: no list, a plain bar without previous / next, the period shown as text
await page.click('#tab-detail');
ok((await page.locator('#unav').count()) === 0 && (await page.locator('.navbar.single').count()) === 1 && (await page.locator('#uprev, #unext').count()) === 0, 'single plot: no list, no previous / next');
ok((await page.locator('.perswitch.single').count()) === 1 && (await page.locator('[data-per]').count()) === 0, 'single period: no switch');
ok(await page.locator('.tiles .tile b').nth(2).textContent() === '2.199', 'TR detail tile: decimal point');
await page.click('#tab-export');
const [d2] = await Promise.all([page.waitForEvent('download'), page.click('#x-units')]);
const rowTr = (await readFile(await d2.path(), 'utf8')).replace(/^﻿/, '').split('\r\n')[1].split(',');
ok(rowTr.slice(4).join() === row.slice(4).join(), 'TR CSV number columns identical to EN (comma columns, decimal point)');

// 2. sample package: two periods, empty plot, undecided combinations, classes, species, forest estimate
await page.click('#steps [data-go="1"]');
await page.click('#sample'); await page.waitForSelector('.note.ok');
await page.check('#scope'); await page.click('#to2');
ok((await page.locator('.note.warn', { hasText: 'Henüz seçilmedi' }).count()) === 1, 'undecided plot–period combinations reported');
await page.click('input[name="cm"][value="list"]');
await page.fill('[data-c="breaks"]', '8 12 12 20');
ok(await page.isDisabled('#calc') && (await page.locator('#clsprev', { hasText: 'kesin artan' }).count()) === 1, 'overlapping class limits rejected');
await page.fill('[data-c="breaks"]', '8 16 24 32 40 48');
await page.check('#opentop');
await page.check('input[name="des"][value="srs"]');
await page.fill('#farea', '120');
await shot('st-2-ayarlar');
await page.click('#calc');
await page.waitForSelector('table.units');
ok((await page.locator('tr.st-unknown').count()) === 5, '5 combinations await a decision (004 in 2019; 002, 003, 004, 1 in 2024)');
await shot('st-3-alanlar');
await page.click('#tab-forest');
ok((await page.locator('.note.err', { hasText: 'kararı verilmemiş' }).count()) >= 1, 'forest estimate blocked for undecided period');
await page.click('#steps [data-go="2"]');
await page.check('input[name="ec"][value="empty"]');
await page.click('#calc');
ok((await page.locator('tr.st-unknown').count()) === 0, 'decision applied');
ok(await cell(['004', '2019'], 5) === '0' && await cell(['004', '2019'], 7) === '–', 'empty plot: N = 0, mean d undefined');
await page.click('#tab-detail');
ok((await page.locator('#ch-cls svg rect').count()) > 0 && (await page.locator('#ch-sp svg').count()) === 1, 'class and species charts drawn');
ok((await page.locator('p.small', { hasText: 'Paydalar' }).count()) === 1, 'share denominators stated');
await shot('st-4-ayrinti');

// plot / period navigation (shared navigator, as in the diameter distribution tool)
const navState = () => page.evaluate(() => ({
  bar: document.querySelector('.navlab b')?.textContent, pos: document.querySelector('.navlab .muted')?.textContent.replace(/[^0-9/]/g, ''),
  per: document.querySelector('[data-per][aria-pressed="true"]')?.textContent.trim(), pers: document.querySelectorAll('[data-per]').length,
  on: document.querySelector('#ulist .uitem.on .uid')?.textContent, list: [...document.querySelectorAll('#ulist .uid')].map(x => x.textContent),
  title: document.querySelector('#ch-cls svg title, #ch-cls svg text')?.textContent || '', bars: document.querySelectorAll('.navbar').length }));
let ns = await navState();
ok(ns.list.length === 5 && (await page.locator('.panel.withnav #unav').count()) === 1, 'plot list beside the detail (5 plots): ' + ns.list.join(' '));
ok(ns.pers === 2 && ns.per === '2019' && ns.bar === 'Örnek alan ' + ns.on && ns.pos === `1/5`, 'first plot, first period, 1 / 5: ' + JSON.stringify(ns));
await page.click('[data-per]:not([aria-pressed="true"])');
let ns2 = await navState();
ok(ns2.per === '2024' && ns2.on === ns.on && ns2.title.includes('2024') && !ns2.title.includes('2019') && ns2.bars === 1, 'period switch redraws the panel for 2024 (no stale chart): ' + ns2.title);
await page.click('#unext');
let ns3 = await navState();
ok(ns3.on === ns.list[1] && ns3.per === '2024' && ns3.pos === '2/5' && ns3.title.includes(ns.list[1] + ' / 2024'), 'next plot keeps the period: ' + JSON.stringify([ns3.on, ns3.per, ns3.title]));
await page.locator('h3').first().click();                                   // focus away from the controls, then ← →
await page.keyboard.press('ArrowRight');
ok((await navState()).on === ns.list[2], '→ key: next plot');
await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
ok((await navState()).on === ns.list[0], '← key: previous plot');
await page.click('#uprev');
ok((await navState()).on === ns.list[4] && (await navState()).pos === '5/5', 'previous from the first wraps to the last');
await page.click('#unext');
ok((await navState()).on === ns.list[0], 'next from the last wraps to the first');
await page.locator('[data-per][aria-pressed="true"]').focus(); await page.keyboard.press('ArrowLeft');
ok((await navState()).per === '2019' && (await navState()).on === ns.list[0], '← inside the period switch changes the period, not the plot');
await page.click(`#ulist [data-u="${ns.list[3]}"]`);
ok((await navState()).on === ns.list[3] && (await navState()).pos === '4/5', 'list click selects the plot');
await page.fill('#uq', '00');
ok((await navState()).list.every(x => x.includes('00')), 'search filters the list');
await page.fill('#uq', '');
// from the units table straight to a plot and period
await page.click('#tab-units');
await page.evaluate(() => [...document.querySelectorAll('table.units tbody tr')].find(x => x.querySelector('code').textContent === '004' && x.children[1].textContent === '2019').querySelector('[data-sel]').click());
let ns4 = await navState();
ok(ns4.on === '004' && ns4.per === '2019' && ns4.title.includes('004 / 2019'), 'units table opens 004 / 2019 in the detail');
ok(await page.locator('.tiles .tile b').first().textContent() === '0', 'empty plot detail: N = 0');
await shot('st-4b-gezinme');
await page.click('#tab-between');
ok((await page.locator('.note', { hasText: 'orman tahmini değildir' }).count()) === 1, 'between-plot summary labelled as descriptive');
await shot('st-5-arasi');
await page.click('#tab-forest');
ok((await page.locator('#panel table').count()) >= 2, 'forest estimate tables for both periods');
await shot('st-6-orman');
await page.click('#tab-export');
const [d3] = await Promise.all([page.waitForEvent('download'), page.click('#x-xlsx')]);
const wb = XLSX.read(await readFile(await d3.path()));
ok(wb.SheetNames.length === 6, 'XLSX has 6 sheets: ' + wb.SheetNames.join(','));
const units = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[1]]);
ok(units.some(u => u.plot_id === '001') && units.some(u => u.plot_id === '1'), 'XLSX: "001" and "1" kept apart');

// 3. stratified design with strata from the sample (A: 001, 002, 1; B: 003, 004)
await page.click('#steps [data-go="2"]');
await page.check('input[name="des"][value="strat"]');
await page.fill('[data-stratum="A"]', '70'); await page.fill('[data-stratum="B"]', '50');
await page.click('#calc'); await page.click('#tab-forest');
ok((await page.locator('#panel', { hasText: 'W_h' }).count()) === 1, 'stratified estimate shows stratum weights');

// 4. phone + dark
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
phone.on('pageerror', e => errors.push(e.message));
await phone.goto(URL + '?lang=tr');
await phone.click('#sample'); await phone.waitForSelector('.note.ok');
await phone.check('#scope'); await phone.click('#to2'); await phone.click('#calc');
await phone.click('#tab-detail');
ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no horizontal page scroll');
await shot('st-7-telefon-koyu', phone);

ok(errors.length === 0, 'no console errors: ' + errors.join(' | '));
await browser.close();
console.log(`stand e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
