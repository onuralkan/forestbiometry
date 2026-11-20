// Browser test for Log Scaling (tomruk-olcumu.php; SV-05): one log against the book (Doyle, 20 in., 16 ft = 256 bf),
// the simulated table against calc.js in Node, splitting, downloads, English only, phone.
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/logscale/e2e.mjs http://127.0.0.1:8092 [shots-dir]
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const XLSX = require(path.join(ROOT, 'assets/vendor/sheetjs/xlsx.mini.min.js'));
const LS = await import('../../assets/lab/logscale/calc.js');
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null, URL = BASE + '/tomruk-olcumu.php';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const dl = async sel => { const [d] = await Promise.all([page.waitForEvent('download'), page.click(sel)]); return d; };
const n = s => Number(String(s).trim().replace(',', '.'));
const csv = (await readFile(path.join(ROOT, 'assets/lab/logscale/ornek/ornek-tomruk.csv'), 'utf8')).trim().split('\n').slice(1);
const logs = csv.map(l => { const [id, ds, db, dm, L] = l.split(';').map(x => Number(x.replace(',', '.'))); return { id: String(id), ds, db, dm, Lm: L }; });

await page.goto(URL + '?lang=en'); await page.waitForSelector('#steps');
ok((await page.locator('h1').textContent()).includes('Log Scaling') && (await page.locator('.b-ids').textContent()).trim() === 'SV-05' && (await page.locator('.b-ver').textContent()).includes(LS.TOOL.version), 'title, catalogue id SV-05, version');
// one log: 20 in. (50.8 cm), 16 ft (4.8768 m): Doyle (20 − 4)² = 256 bf (the book's rule of thumb)
for (const [k, v] of [['ds', '50.8'], ['L', '4.8768']]) { await page.fill('#in-' + k, v); await page.locator('#in-' + k).dispatchEvent('change'); await page.waitForSelector('#in-ds'); }
await page.click('#to2'); await page.waitForSelector('[data-rule]'); await page.click('#calc'); await page.waitForSelector('#ltab');
ok(n(await page.locator('#ltab tr[data-log="1"] [data-k="doyle"]').textContent()) === 256, 'one log 20 in. × 16 ft: Doyle 256 board feet');
ok(n(await page.locator('#ltab tr[data-log="1"] [data-k="scribner"]').textContent()) === Number(LS.boardFeet('scribner', 20, 16).V.toFixed(1)), 'Scribner (7.3) = engine');
ok((await page.textContent('#resnote')).includes('board foot') && (await page.textContent('#ltab')).includes('–'), 'board foot labelled; no cubic volume without large-end/middle diameters');
// the table
await page.click('#steps [data-go="1"]'); await page.check('input[name="mode"][value="table"]'); await page.waitForSelector('#sample');
await page.click('#sample'); await page.waitForSelector('#dsinfo');
await page.click('#to2'); await page.check('[data-rule="intl8"]'); await page.waitForSelector('#calc');
await page.fill('#o-max', '16'); await page.locator('#o-max').dispatchEvent('change'); await page.waitForSelector('#calc:not([disabled])');
await page.click('#calc'); await page.waitForSelector('#ltab');
const opts = { roundD: true, lengthRule: 'whole', maxFt: 16, round5: false };
let bad = 0;
for (const l of logs) {
  const e = LS.scaleLog(l, LS.RULES, opts), row = page.locator(`#ltab tr[data-log="${l.id}"]`);
  for (const r of LS.RULES) { const cell = (await row.locator(`[data-k="${r}"]`).textContent()).trim(), v = e.bf[r].V; if (v == null ? !cell.length || Number.isFinite(n(cell)) : Math.abs(n(cell) - v) > 0.051) bad++; }
}
ok(bad === 0, `${logs.length} logs × 4 rules: board feet on screen = engine (or the reason it was not computed)`);
{ const tot = r => logs.reduce((a, l) => a + (LS.scaleLog(l, [r], opts).bf[r].V ?? 0), 0);
  ok(Math.abs(n(await page.locator('#ltab [data-tot="doyle"]').textContent()) - tot('doyle')) < 0.051 && Math.abs(n(await page.locator('#ltab [data-tot="intl4"]').textContent()) - tot('intl4')) < 0.051, 'Doyle and International ¼-in. totals = engine'); }
ok((await page.locator('#ltab [data-tot="intl8"]').textContent()).trim() === '–', 'a rule that could not scale every log shows no (partial) total');
// downloads
const x = await dl('#x-xlsx'), wb = XLSX.read(await readFile(await x.path()));
const lr = XLSX.utils.sheet_to_json(wb.Sheets['Logs'], { header: 1 }), ci = lr[0].indexOf('newton_m3');
ok(['Info', 'Logs', 'Segments'].every(s => wb.SheetNames.includes(s)) && Math.abs(lr[1][ci] - LS.cubic(logs[0]).newton) < 1e-12, 'Excel: three sheets; Newton m³ at full precision');
const jd = await dl('#x-json'), rec = JSON.parse(await readFile(await jd.path(), 'utf8'));
ok(rec.format === 'run-record/1' && rec.tool.ids.includes('SV-05') && rec.units.rules.V === 'board feet' && rec.logs.length === logs.length, 'run record: catalogue id, units written, every log');
if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'logscale.png'), fullPage: true });
// ?lang=tr redirects to the English page
await page.goto(URL + '?lang=tr'); await page.waitForSelector('#steps');
ok(!page.url().includes('lang=') && (await page.locator('h1').textContent()).includes('Log Scaling'), 'English only: ?lang=tr redirects to the English page');
// phone
const ph = await ctx.newPage(); await ph.setViewportSize({ width: 390, height: 800 }); await ph.goto(URL); await ph.waitForSelector('#steps');
ok(await ph.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no horizontal page scroll');
ok(errors.length === 0, 'no page errors: ' + errors.join(' | '));
await browser.close();
console.log(`SV-05 e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
