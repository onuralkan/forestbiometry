// Browser test for Biomass and Carbon (biyokutle-karbon.php; TOOLS_SPEC BC02). A small tree table written here (one
// tree without height, one without volume, a species left without a set); coefficient sets with arbitrary test
// numbers (no species' values) stored in the page's browser storage. Values on screen are compared with the engine
// run in Node on the same table (tests/biomass/test_bc02.mjs checks the engine against Python).
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/biomass/e2e.mjs http://127.0.0.1:8092 [shots-dir]
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const XLSX = require(path.join(ROOT, 'assets/vendor/sheetjs/xlsx.mini.min.js'));
const Bm = await import('../../assets/lab/biomass/calc.js');
const { blankSet } = await import('../../assets/lab/core/coef.js');
const { tableFromText } = await import('../../assets/lab/core/table.js');
const { tableToDataset } = await import('../../assets/lab/stand/calc.js');
const { parseNumber, toInternal } = await import('../../assets/lab/core/num.js');
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null, URL = BASE + '/biyokutle-karbon.php?lang=en';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async n => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
const tmp = await mkdtemp(path.join(os.tmpdir(), 'bc02-'));
const dl = async sel => { const [d] = await Promise.all([page.waitForEvent('download'), page.click(sel)]); return d; };

const CSV = `alan,agac,tur,cap,boy,hacim,alan_buyuklugu
1,1,A,23.4,19.4,0.41,400
1,2,A,31.0,,0.80,400
1,3,B,18.2,15.1,0.21,400
1,4,C,40.5,24.0,1.30,400
2,1,A,27.7,21.0,0.62,500
2,2,B,35.1,22.8,1.05,500
2,3,B,12.4,11.0,,500`;
const file = path.join(tmp, 'agaclar.csv'); await writeFile(file, CSV);
const mk = (id, form, params, extra = {}) => ({ ...blankSet('biomass.' + form), id, params, transform: Bm.FORMS[form].scale === 'none' ? null : { kind: Bm.FORMS[form].scale, correction: 'none' }, source: { citation: 'e2e test values ' + id }, origin: 'user-entered', created: '2026-11-17T00:00:00Z', modified: '2026-11-17T00:00:00Z', ...extra });
const SETS = [mk('sA1', 'pow.d', { a: 0.11, b: 2.37 }), mk('sA2', 'log.dh', { a: -4.1, b: 2.0, c: 0.5 }), mk('sB1', 'pow.dh', { a: 0.03, b: 1.95, c: 0.8 })];

// Node engine on the same table (same column mapping as the page guesses)
const tbl = tableFromText(CSV, { delim: ',', header: true, name: 'agaclar.csv' });
const ds = tableToDataset(tbl, { plot: 0, tree: 1, species: 2, dbh: 3, height: 4, area: 6, period: null }, { decimal: '.', dbhUnit: 'cm', hUnit: 'm', areaUnit: 'm2', areaConst: NaN }, parseNumber, toInternal).ds;
const setMap = new Map(SETS.map(s => [s.id, s]));
const ENG = Bm.computeAllometric(ds, { components: [{ key: 'c1', CF: 0.5 }, { key: 'c2', CF: 0.48 }], map: { A: { c1: 'sA1', c2: 'sA2' }, B: { c1: 'sB1' } } }, setMap);

// 1. data
await page.goto(URL);
await page.evaluate(async sets => { const C = await import('/assets/lab/core/coef.js'); await import('/assets/lab/biomass/calc.js'); for (const s of sets) { const r = await C.saveCoef(s, s.modified); if (!r.ok) throw new Error(JSON.stringify(r.problems)); } }, SETS);
await page.reload();
await page.setInputFiles('#tblbox input[type="file"]', file); await page.waitForSelector('#usetbl');
await page.click('#usetbl'); await page.waitForSelector('#dsinfo');
ok((await page.textContent('#dsinfo')).includes('7 tree records'), 'table read: 7 trees');
await page.click('#to2'); await page.waitForSelector('#maptab');

// 2. settings: two components, mapping, CF
ok(await page.isDisabled('#calc') && (await page.textContent('#s2prob')).includes('carbon fraction'), 'computing waits for the carbon fraction and a mapping');
await page.fill('[data-cf="0"]', '0.5'); await page.locator('[data-cf="0"]').dispatchEvent('change'); await page.waitForSelector('#maptab');
await page.click('#cadd'); await page.waitForSelector('[data-cf="1"]');
await page.fill('[data-cf="1"]', '0.48'); await page.locator('[data-cf="1"]').dispatchEvent('change'); await page.waitForSelector('#maptab');
{ const nr = await page.locator('#maptab tbody tr[data-sp]').count(), no = await page.locator('#maptab select[data-ms="A"][data-mc="c1"] option').count(); ok(nr === 3 && no === 4, 'three species, three sets offered: ' + nr + ' / ' + no); }
await page.selectOption('select[data-ms="A"][data-mc="c1"]', 'sA1'); await page.selectOption('select[data-ms="A"][data-mc="c2"]', 'sA2'); await page.selectOption('select[data-ms="B"][data-mc="c1"]', 'sB1');
await page.waitForSelector('#calc:not([disabled])'); await shot('bc02-1-ayarlar');
await page.click('#calc'); await page.waitForSelector('#utab');

// 3. results against the engine
const n = s => s === '–' ? null : +String(s).replace(',', '.');
for (const u of ENG.units) {
  const row = page.locator(`#utab tr[data-u="${u.plot_id}|"]`);
  const c1 = n(await row.locator('[data-k="c1"]').textContent()), B = n(await row.locator('[data-k="B"]').textContent());
  ok((u.comps.c1.perHa == null ? c1 === null : Math.abs(c1 - u.comps.c1.perHa) < 5e-3) && (u.B == null ? B === null : Math.abs(B - u.B) < 5e-3), `plot ${u.plot_id}: component and total Mg/ha as the engine (${c1} / ${u.comps.c1.perHa}, ${B} / ${u.B})`);
}
ok(ENG.units.every(u => u.B === null), 'the table has a missing tree in every plot: no plot total shown');
ok((await page.textContent('[data-um="C"]')).includes('rows 5') && (await page.textContent('[data-um="B"]')).includes('rows 4, 7, 8'), 'unmapped species with their row numbers (C everywhere, B for the second component)');
ok((await page.textContent('[data-noh="c2"]')).includes('rows 3'), 'tree without height: row number given');
ok((await page.textContent('#srcnote')).includes('e2e test values sA1'), 'results carry the sources of the sets');
await shot('bc02-2-sonuc');
// exports
const xd = await dl('#x-xlsx'), wb = XLSX.read(await readFile(await xd.path()));
const info = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }).flat().join(' ');
ok(wb.SheetNames.length === 3 && info.includes('e2e test values sA2') && info.includes('44/12'), 'Excel: info sheet with the sources of the sets and the rules');
const cd = await dl('#x-csv'), csv = (await readFile(await cd.path(), 'utf8')).trim().split(/\r?\n/);
ok(csv.length === 8 && csv[1].split(',').length === 8 + 4 * 2 + 2, 'CSV: one row per tree, status, mass, carbon and set per component');
const jd = await dl('#x-json'), rec = JSON.parse(await readFile(await jd.path(), 'utf8'));
ok(rec.format === 'run-record/1' && rec.tool.id === 'biyokutle-karbon' && rec.tool.ids.includes('BC-01') && rec.sets.length === 3 && rec.settings.components.length === 2 && rec.inputs[0].kind === 'file', 'run record: tool, catalogue ids, sets with sources, settings, input fingerprint');

// 4. conversion from volume
await page.click('#back2'); await page.waitForSelector('input[name="appr"]');
await page.check('input[name="appr"][value="volume"]'); await page.waitForSelector('#vcol');
await page.selectOption('#vcol', 'hacim');
for (const [k, v] of [['D', '0.5'], ['BEF', '1.3'], ['R', '0.25'], ['CF', '0.47']]) { await page.fill(`[data-v="${k}"]`, v); await page.locator(`[data-v="${k}"]`).dispatchEvent('change'); await page.waitForSelector('#vcol'); }
ok(await page.isDisabled('#calc') && (await page.textContent('#s2prob')).includes('source of the factors'), 'factors need their source');
await page.fill('#vsrc', 'e2e factors'); await page.locator('#vsrc').dispatchEvent('change'); await page.waitForSelector('#calc:not([disabled])');
await page.selectOption('[data-vs="fbark"]', 'ib'); await page.waitForSelector('#s2prob');
ok((await page.textContent('#s2prob')).includes('Bark sides differ'), 'different bark sides refused');
await page.selectOption('[data-vs="fbark"]', 'ob'); await page.waitForSelector('#calc:not([disabled])');
await page.click('#calc'); await page.waitForSelector('#utab');
const vol = Bm.computeVolume(ds, t => [0.41, 0.80, 0.21, 1.30, 0.62, 1.05, null][ds.trees.indexOf(t)], { bark: 'ob', factors: { mode: 'bef', bark: 'ob', D: 0.5, BEF: 1.3, R: 0.25 }, CF: 0.47 });
const p1 = vol.units.find(u => u.plot_id === '1');
ok(Math.abs(n(await page.locator('#utab tr[data-u="1|"] [data-k="B"]').textContent()) - p1.B) < 5e-3 && Math.abs(n(await page.locator('#utab tr[data-u="1|"] [data-k="CO2"]').textContent()) - p1.CO2) < 5e-3, `volume path: plot 1 B and CO₂ as the engine (${p1.B.toFixed(3)}, ${p1.CO2.toFixed(3)})`);
ok((await page.locator('#utab tr[data-u="2|"] [data-k="B"]').textContent()) === '–' && (await page.textContent('#novnote')).includes('8'), 'tree without volume: row 8 reported, plot 2 without a total');

// 5. sample button, the coefficient library lists biomass sets, English, phone
await page.click('[data-go="1"]'); await page.click('#sample'); await page.waitForFunction(() => (document.getElementById('dsinfo') || {}).textContent?.includes('ornek-mescere'));
ok((await page.textContent('#dsinfo')).includes('simulated'), 'simulated sample table loads');
await page.goto(BASE + '/katsayi-kutuphanesi.php?lang=en'); await page.waitForSelector('#libtab');
ok(await page.locator('#libtab tbody tr', { hasText: 'e2e test values sB1' }).count() === 1, 'the Coefficient Library lists the biomass sets');
await page.goto(BASE + '/biyokutle-karbon.php?lang=en'); await page.waitForSelector('#steps');
ok((await page.textContent('h1')).includes('Biomass and Carbon'), 'English');
const phone = await ctx.newPage(); await phone.setViewportSize({ width: 390, height: 800 }); await phone.goto(URL); await phone.waitForSelector('#steps');
ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no horizontal page scroll');

ok(errors.length === 0, 'no page errors: ' + errors.join(' | '));
await browser.close();
console.log(`BC02 e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
