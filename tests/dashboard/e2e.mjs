// Browser test for Data Visualization (pano.php; DI-04). Packages: the sample package of Plot & Stand
// Metrics (made up). Records: a Diameter Distribution record made in Node with the distribution engine on that
// package, and a Height–Diameter record with arbitrary test coefficients.
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/dashboard/e2e.mjs http://127.0.0.1:8092 [shots-dir]
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const D = await import('../../assets/lab/dist/index.js');
const { seal, sha256JSON } = await import('../../assets/lab/core/record.js');
const C = await import('../../assets/lab/dashboard/calc.js');
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null, URL = BASE + '/pano.php';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async n => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
const tmp = await mkdtemp(path.join(os.tmpdir(), 'di04-'));
const tile = id => page.textContent(`#${id} b`);
const sample = JSON.parse(await readFile(path.join(ROOT, 'assets/lab/stand/ornek/ornek-veri.json'), 'utf8')), sha = await sha256JSON(sample);

// records
const d24 = sample.trees.filter(t => t.period === '2024').map(t => t.dbh);
const res = [D.runMethod('weibull.ml', { d: d24, plot: D.POOL, period: '2024' }), D.runMethod('lognormal.ml', { d: d24, plot: D.POOL, period: '2024' })];
const distRec = await seal({ format: 'run-record/1', tool: { id: 'cap-dagilimi', version: '2.2.0', ids: ['SS-03'], page: 'cap-dagilimi.php' }, build: { commit: null, site: null }, created: '2026-11-16T12:00:00Z', lang: 'en', inputs: [{ role: 'data', kind: 'file', name: 'agaclar.csv', sha256: '00' }], results: res });
const hdRec = await seal({ format: 'run-record/1', tool: { id: 'boy-cap', version: '1.1.0', ids: ['SM-01'], page: 'boy-cap.php' }, build: { commit: null, site: null }, created: '2026-11-16T12:05:00Z', lang: 'en',
  inputs: [{ role: 'dataset', kind: 'dataset', sha256: sha }], settings: { breastHeight: 1.3, model: 'naslund' }, fits: [{ id: 'naslund', status: 'ok', theta: [1.9, 0.2] }, { id: 'michailoff', status: 'ok', theta: [30, 12] }] });
const other = { format: 'run-record/1', tool: { id: 'bonitet', version: '1.0.0-beta.3' }, created: '2026-11-16T12:10:00Z', inputs: [] };
const files = [['dist.json', distRec], ['hd.json', hdRec], ['bonitet.json', other], ['bozuk.json', null]];
for (const [n, o] of files) await writeFile(path.join(tmp, n), o ? JSON.stringify(o) : '{ nope');

// 1. no package, then the sample
await page.goto(URL); await page.waitForSelector('#srccard');
ok(await page.locator('#srcnone').count() === 1 && await page.locator('#panels').count() === 0, 'no package: guidance, no panels');
await page.click('#sample'); await page.waitForSelector('#panels');
ok(await page.locator('#samplenote').count() === 1, 'sample package marked as made up');
const all = C.plotTable(sample, C.blankFilter(), 'unmeasured');
ok(+await tile('t-rec') === sample.trees.length && +await tile('t-plots') === all.rows.length && await tile('t-N') === String(Math.round(all.mean.Nha * 10) / 10).replace(/\.0$/, ''), `tiles: ${sample.trees.length} records, ${all.rows.length} plot × period, mean N/ha`);
ok(await page.locator('#ch-hist svg rect.ch-bar').count() > 3 && await page.locator('#ch-sp svg').count() === 1 && await page.locator('#ch-N svg').count() === 1 && await page.locator('#ch-hd svg circle').count() > 0, 'panels drawn: histogram, species, N/ha, height–diameter');
// chart navigation (MR-001): one button per chart drawn, jumps to it, stays under the top bar, marks the chart in view
{ const go = await page.locator('#chnav [data-go]').evaluateAll(b => b.map(x => x.dataset.go));
  ok(go.join() === 'ch-hist,ch-sp,ch-N,ch-G,ch-hd,ch-map,fcard', 'chart navigation: one button per chart and back to the filters: ' + go.join());
  await page.emulateMedia({ reducedMotion: 'reduce' });   // jump at once (smooth scrolling is the default)
  await page.click('#chnav [data-go="ch-hd"]');
  await page.waitForFunction(() => { const r = document.getElementById('ch-hd').getBoundingClientRect(), n = document.getElementById('chnav').getBoundingClientRect(); return r.top >= n.bottom - 1 && r.top < innerHeight - 100; }, null, { timeout: 4000 });
  const nav = await page.evaluate(() => { const n = document.getElementById('chnav').getBoundingClientRect(), t = document.querySelector('.b-top').getBoundingClientRect(), hd = document.getElementById('ch-hd').getBoundingClientRect();
    return { top: n.top, under: t.bottom, clear: hd.top >= n.bottom - 1 }; });
  ok(Math.abs(nav.top - nav.under) <= 1 && nav.clear, `chart navigation: the bar stays under the top bar (${nav.top} px) and the chart is not hidden by it`);
  await page.waitForFunction(() => document.querySelector('#chnav [data-go="ch-hd"]').getAttribute('aria-current') === 'true', null, { timeout: 4000 }).then(() => ok(true, 'chart navigation: chosen chart marked'), () => ok(false, 'chart navigation: chart in view marked'));
  await page.click('#chnav [data-go="fcard"]');
  await page.waitForFunction(() => { const r = document.getElementById('fcard').getBoundingClientRect(); return r.top >= 0 && r.top < 250; }, null, { timeout: 4000 }).then(() => ok(true, 'chart navigation: back to the filters'), () => ok(false, 'chart navigation: back to the filters'));
  await page.evaluate(() => scrollTo(0, 0)); await page.emulateMedia({ reducedMotion: null }); }
// filters
await page.selectOption('[data-f="period"]', '2024'); await page.waitForSelector('#t-rec');
ok(+await tile('t-rec') === d24.length, 'period filter: 2024 records only');
await page.check('input[name="ec"][value="empty"]'); await page.waitForSelector('#t-plots');
ok(+await tile('t-plots') === sample.plots.length, 'empty combinations counted as zero: every plot in 2024');
await page.check('input[name="ec"][value="unmeasured"]'); await page.waitForSelector('input[name="ec"][value="unmeasured"]:checked');
const u24 = C.plotTable(sample, { ...C.blankFilter(), period: '2024' }, 'unmeasured');
ok(+await tile('t-plots') === u24.rows.length, `back to not measured: ${u24.rows.length} plot × period in 2024`);

await page.selectOption('[data-f="plot"]', '001'); await page.waitForSelector('#ch-map');
ok((await page.textContent('#ch-map')).includes('No trees with coordinates'), 'one plot: map panel says the sample has no coordinates');
await page.selectOption('[data-f="plot"]', '*');

// 2. records
await page.setInputFiles('#recfile', files.map(([n]) => path.join(tmp, n))); await page.waitForSelector('#rectab');
ok(await page.locator('#rectab tbody tr').count() === 3 && (await page.textContent('#status')).includes('bozuk.json'), 'three records listed, the broken file reported');
ok(await page.locator('#rectab tr[data-kind="dist"]').count() === 1 && await page.locator('#rectab tr[data-kind="hd"]').count() === 1 && await page.locator('#rectab tr[data-kind="other"] input[data-show]').count() === 0, 'record kinds: distribution, height, other (not drawn)');
ok(await page.locator('#ch-hist path.ch-line').count() === 2 && (await page.textContent('#ch-hist figcaption')).includes('weibull'), '2024 pooled: Weibull and lognormal densities over the histogram');
ok(await page.locator('#ch-hd path.ch-line').count() === 2 && (await page.textContent('#ch-hd figcaption')).includes('naslund ★'), 'height curves from the record, chosen model starred');
ok((await page.textContent('#rectab tr[data-kind="dist"]')).includes('match unknown'), 'distribution record made from a file: match unknown');
await shot('di04-1-pano');
await page.selectOption('[data-f="period"]', '2019');
ok(await page.locator('#ch-hist path.ch-line').count() === 0 && (await page.textContent('#ch-hist figcaption')).includes('No record result to draw'), 'other period: no density, explained');
await page.selectOption('[data-f="period"]', '2024');
await page.uncheck('#rectab tr[data-kind="dist"] input[data-show]');
ok(await page.locator('#ch-hist path.ch-line').count() === 0, 'record hidden: densities removed');
// downloads
const [dc] = await Promise.all([page.waitForEvent('download'), page.click('[data-csv="ch-hist"]')]);
const csv = (await readFile(await dc.path(), 'utf8')).replace(/^﻿/, '').trim().split(/\r?\n/);
ok(csv.length - 1 === C.histogram(d24, C.niceWidth(Math.max(...d24) - Math.min(...d24))).length && csv.slice(1).reduce((a, l) => a + +l.split(',')[2], 0) === d24.length, 'histogram CSV: one row per class, counts add up');
const [ds2] = await Promise.all([page.waitForEvent('download'), page.click('[data-svg="ch-N"]')]);
ok((await readFile(await ds2.path(), 'utf8')).startsWith('<?xml'), 'SVG download');

// 3. a kept package: the height record is recognised as made from it; settings survive a reload
await page.evaluate(async ds => { const P = await import('/assets/lab/core/projects.js'); await P.registerApproved(ds, 'en'); }, sample);
await page.reload(); await page.waitForSelector('#pkg');
await page.selectOption('#pkg', { index: 0 });
await page.waitForSelector('#rectab');
ok((await page.textContent('#rectab tr[data-kind="hd"]')).includes('this package') && await page.locator('#samplenote').count() === 0, 'package from the manager: height record made from this package');
ok(await page.inputValue('[data-f="period"]') === '2024' && await page.locator('#rectab tbody tr').count() === 3, 'filters and records kept after a reload');

// 4. English page text, phone
await page.goto(URL); await page.waitForSelector('#panels');
ok((await page.textContent('h1')).includes('Data Visualization') && (await page.textContent('#fcard')).includes('Filters'), 'English');
const phone = await ctx.newPage(); await phone.setViewportSize({ width: 390, height: 800 });
await phone.goto(URL); await phone.waitForSelector('#panels');
ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no horizontal page scroll');
await phone.click('#chnav [data-go="ch-map"]');
ok(await phone.waitForFunction(() => { const r = document.getElementById('ch-map').getBoundingClientRect(), n = document.getElementById('chnav').getBoundingClientRect(); return r.top >= n.bottom - 1 && r.top < innerHeight - 100; }, null, { timeout: 4000 }).then(() => true, () => false)
  && await phone.evaluate(() => { const n = document.getElementById('chnav'); return n.scrollWidth >= n.clientWidth && document.documentElement.scrollWidth <= innerWidth + 1; }), 'phone: the chart bar scrolls sideways on its own and reaches the last chart');
if (SHOTS) await phone.screenshot({ path: path.join(SHOTS, 'di04-2-telefon.png'), fullPage: true });

ok(errors.length === 0, 'no page errors: ' + errors.join(' | '));
await browser.close();
console.log(`DI-04 e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
