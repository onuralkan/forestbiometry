// Browser test for the Report Generator (report-generator.php; DI-05). Package: the sample package of Plot & Stand Metrics (made
// up). Records: a Diameter Distribution record made in Node with the engine and its own reference list, a
// Height–Diameter record with arbitrary test coefficients.
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/report/e2e.mjs http://127.0.0.1:8092 [shots-dir]
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const D = await import('../../assets/lab/dist/index.js');
const SRC = await import('../../assets/lab/dist/sources.js');
const { seal, sha256JSON } = await import('../../assets/lab/core/record.js');
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null, URL = BASE + '/report-generator.php';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const tmp = await mkdtemp(path.join(os.tmpdir(), 'di05-'));
const prev = () => page.innerHTML('#preview');
const settle = () => page.waitForTimeout(400);           // the preview follows typing after 300 ms

const sample = JSON.parse(await readFile(path.join(ROOT, 'assets/lab/stand/ornek/ornek-veri.json'), 'utf8')), sha = await sha256JSON(sample);
const d24 = sample.trees.filter(t => t.period === '2024').map(t => t.dbh), wr = D.runMethod('weibull.ml', { d: d24, plot: D.POOL, period: '2024' });
const refs = SRC.refsOf(['weibull.ml']);
const distRec = await seal({ format: 'run-record/1', tool: { id: 'cap-dagilimi', version: '2.2.0', ids: ['SS-03'], page: 'diameter-distribution.php' }, build: { commit: null, site: null }, created: '2026-11-16T12:00:00Z', lang: 'en',
  inputs: [{ role: 'data', kind: 'file', name: 'agaclar.csv', bytes: 10, sha256: 'ab'.repeat(32) }], settings: { unit: 'cm' }, results: [wr], sources: { methods: {}, references: Object.fromEntries(refs.map(k => [k, SRC.REFS[k]])) } });
const hdRec = await seal({ format: 'run-record/1', tool: { id: 'boy-cap', version: '1.1.0', ids: ['SM-01'], page: 'height-diameter.php' }, build: { commit: null, site: null }, created: '2026-11-16T12:05:00Z', lang: 'en',
  inputs: [{ role: 'dataset', kind: 'dataset', sha256: sha }], settings: { breastHeight: 1.3, model: 'naslund' }, fits: [{ id: 'naslund', status: 'ok', theta: [1.9, 0.2], n: 12, rmse: 1.5 }] });
for (const [n, o] of [['dist.json', distRec], ['hd.json', hdRec], ['bozuk.json', null]]) await writeFile(path.join(tmp, n), o ? JSON.stringify(o) : '{x');

// 1. empty report
await page.goto(URL); await page.waitForSelector('#preview article');
ok((await prev()).includes('<h1>Inventory report</h1>') && (await prev()).includes('No run records were added to the report.') && !(await prev()).includes('r-package'), 'no package, no records: default title, said so');
// 2. sample package, details, notes
await page.selectOption('#pkg', '#sample'); await page.waitForSelector('#samplenote');
ok((await prev()).includes('<h2>1. Data package</h2>') && (await page.locator('#preview svg').count()) === 5, 'sample package: package section and five charts');
await page.fill('[data-m="title"]', 'Deneme <raporu>'); await page.fill('[data-m="author"]', 'A. Yazar'); await page.fill('[data-m="intro"]', 'Giriş.\n\nİkinci paragraf.'); await page.fill('[data-note="charts"]', 'Grafik notu'); await settle();
ok((await prev()).includes('<h1>Deneme &lt;raporu&gt;</h1>') && (await prev()).includes('<p>Giriş.</p><p>İkinci paragraf.</p>') && (await prev()).includes('<div class="r-note"><p>Grafik notu</p></div>') && (await prev()).includes('A. Yazar'), 'title, author, introduction and a section note follow typing (escaped)');
await page.selectOption('[data-f="period"]', '2024');
ok((await prev()).includes('period: 2024'), 'filter written in the charts section');

// 3. records
await page.setInputFiles('#recfile', ['dist.json', 'hd.json', 'bozuk.json'].map(n => path.join(tmp, n))); await page.waitForSelector('#reclist');
ok(await page.locator('#reclist li').count() === 2 && (await page.textContent('#status')).includes('bozuk.json'), 'two records added, broken file reported');
const html = await prev();
ok(html.includes('2.2.0') && html.includes('weibull.ml') && html.includes('naslund') && html.includes('the package in this report') && html.includes('a file (whether'), 'record sections: tools, results, data origin');
ok(refs.every(k => html.includes(SRC.REFS[k].cite.slice(0, 30).replace(/&/g, '&amp;').replace(/'/g, '&#39;'))) && html.includes('Diameter Distribution Lab') && html.includes('Report Generator'), 'references carried by the record; tool citations');
ok(html.includes(distRec.integrity.value) && html.includes(sha), 'appendix: seal and package fingerprint');
ok((await page.locator('#preview svg path.ch-line').count()) === 2, 'record curves drawn in the report charts (density and height)');
// order and the dashboard's records
await page.click('[data-up="1"]'); await page.waitForSelector('#reclist');
ok((await page.textContent('#reclist li:first-child')).includes('hd.json') && (await prev()).indexOf('3.1 Height–Diameter Modelling') > 0, 'records reordered, numbered in the report');
await page.evaluate(async rec => { const S = await import('/assets/lab/core/store.js'); await S.put('session:pano', { v: 1, recs: [{ name: 'pano.json', obj: rec, show: true }] }); }, { ...hdRec, created: '2026-11-16T13:00:00Z' });
await page.click('#frompano'); await page.waitForSelector('#reclist li:nth-child(3)');
ok(await page.locator('#reclist li').count() === 3 && (await page.textContent('#status')).includes('1 record(s) taken'), "dashboard's record taken");
await page.click('[data-rm="2"]'); await page.waitForFunction(() => document.querySelectorAll('#reclist li').length === 2);
if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'di05-1-rapor.png'), fullPage: true });

// 4. sections, report language, files, print
await page.uncheck('[data-on="charts"]');
ok((await page.locator('#preview svg').count()) === 0 && (await prev()).includes('<h2>2. Run records</h2>'), 'charts left out; sections renumbered');
await page.check('[data-on="charts"]');
ok(await page.locator('#rlang').count() === 0 && (await prev()).includes('<h2>1. Data package</h2>') && (await prev()).includes('Retrieved') && (await page.textContent('#metacard')).includes('Report details'), 'English report, no report-language choice');
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#html')]);
const file = await readFile(await dl.path(), 'utf8');
ok(dl.suggestedFilename().startsWith('report-') && file.startsWith('<!doctype html>') && file.includes('<title>Deneme &lt;raporu&gt;</title>') && file.includes('.ch-l0{stroke:#0072b2}') && (file.match(/<svg/g) || []).length === 5, 'standalone HTML: title, styles and charts inside');
const solo = await browser.newPage(); await solo.setContent(file); ok((await solo.locator('article.report h2').count()) === 5, 'the saved file opens on its own'); await solo.close();
await page.emulateMedia({ media: 'print' });
ok(!(await page.isVisible('.b-side')) && !(await page.isVisible('#metacard')) && await page.isVisible('#preview article') && !(await page.isVisible('.b-top')), 'print view: the report alone');
if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'di05-2-baski.png'), fullPage: true });
await page.emulateMedia({ media: 'screen' });
// 5. kept after reload; phone
await page.reload(); await page.waitForSelector('#preview article');
ok(await page.inputValue('[data-m="title"]') === 'Deneme <raporu>' && await page.locator('#reclist li').count() === 2 && (await prev()).includes('<h2>1. Data package</h2>') && (await page.isChecked('[data-on="charts"]')), 'details, records and choices kept after a reload');
const phone = await ctx.newPage(); await phone.setViewportSize({ width: 390, height: 800 });
await phone.goto(URL); await phone.waitForSelector('#preview article');
ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no horizontal page scroll');

ok(errors.length === 0, 'no page errors: ' + errors.join(' | '));
await browser.close();
console.log(`DI-05 e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
