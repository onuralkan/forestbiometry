// Browser test for the Stem Taper page (govde-profili.php; SV-02, TOOLS_SPEC TP04).
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/taper/e2e.mjs http://127.0.0.1:8092 [shots-dir]
// Values on screen are compared with the engine (assets/lab/taper/calc.js, fit.js) run in Node on the same sample.
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const XLSX = require(path.join(ROOT, 'assets/vendor/sheetjs/xlsx.mini.min.js'));
const { tableFromText } = await import('../../assets/lab/core/table.js');
const { readStems } = await import('../../assets/lab/core/stems.js');
const TP = await import('../../assets/lab/taper/calc.js');
const FIT = await import('../../assets/lab/taper/fit.js');
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null, URL = BASE + '/govde-profili.php';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const num = s => Number(String(s).trim());
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

// (the page and Node fit the same data with the same code; their coefficients agree within ~1e-6, so derived values are
// compared with a matching tolerance)
// engine on the same sample (columns as guessed by the page; decimal comma; inside-bark diameters from the bark thickness)
const csv = await readFile(path.join(ROOT, 'assets/lab/secvol/ornek/ornek-seksiyon.csv'), 'utf8');
const tbl = tableFromText(csv, { delim: ';' }), Hd = tbl.headers.map(h => String(h).toLowerCase());
const col = n => Hd.indexOf(n);
const st = readStems(tbl, { tree: col('agac'), plot: col('alan'), h: col('h_m'), d: col('cap_cm'), bark_t: col('kabuk_mm'), dbh: col('dbh'), height: col('boy_m'), stump_h: col('kesim_m') },
  { decimal: ',', bark: 'ob', units: { h: 'm', d: 'cm', bark_t: 'mm', dbh: 'cm', height: 'm' } });
const E = FIT.fitTaper(st, { form: 'mb76', bark: 'ib', scale: 'd' });

await page.goto(URL + '?lang=tr'); await page.waitForSelector('#steps button');
const VER = TP.TOOL.version;
ok((await page.locator('h1').textContent()).includes('Gövde Profili') && (await page.locator('.b-ids').textContent()).trim() === 'SV-02' && (await page.locator('.b-ver').textContent()).includes(VER), `page title, tool id SV-02, version ${VER}`);
ok(await page.isDisabled('#to2'), 'no profile set: cannot continue');

// fitting tab with the sample stems
await page.click('#mt-fit'); await page.click('#fsample'); await page.waitForSelector('#f-run');
ok(await page.isChecked('input[name="fdec"][value=","]'), 'decimal comma of the sample detected');
ok(await page.inputValue('#fm-tree') !== '' && await page.inputValue('#fm-dbh') !== '' && await page.inputValue('#fm-height') !== '' && await page.inputValue('#fm-bark_t') !== '', 'stem columns guessed (tree, dbh, height, bark thickness)');
await page.click('#f-run'); await page.waitForSelector('#fittab');
ok((await page.textContent('#fitout h3')).includes('yakınsadı') && E.status === 'ok', 'fit converged (page and engine)');
const shown = await page.$$eval('#fittab tbody tr', rs => rs.map(r => [...r.children].map(c => c.textContent.trim())));
ok(shown.length === 6 && shown.every(([k, v]) => Math.abs(num(v) - E.params[k]) <= 1e-6 * Math.max(1, Math.abs(E.params[k]))), 'coefficients on screen = engine (mb76, inside bark, d scale)');
ok((await page.textContent('#fitsum')).includes(`${E.n} nokta, ${E.nTrees} ağaç`) && (await page.textContent('#fitleft')).includes('1 hatalı ağaç'), 'points, trees and the tree with an error (single point) reported');
ok(await page.locator('#clstab tbody tr').count() === 10 && await page.locator('#voltab tbody tr').count() === E.volumes.length, 'residual classes and volume comparison tables');
ok((await page.locator('#fitweak').count()) === (E.se && Object.entries(E.se).some(([k, v]) => v > Math.abs(E.params[k])) ? 1 : 0), 'weakly determined parameters flagged as the engine finds them');
await page.click('#f-save'); ok((await page.textContent('#status')).includes('kaynak'), 'saving needs a citation');
await page.fill('#f-cit', 'e2e: benzetim örneği'); await page.click('#f-save'); await page.waitForFunction(() => document.querySelector('#set-ib') && document.querySelector('#set-ib').value !== '');
ok(!(await page.isDisabled('#to2')), 'fitted set saved and chosen as the inside-bark profile');
if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'taper-fit.png'), fullPage: true });

// one tree: total and merchantable volume against the engine
const set = { schema: 'model-coef/1', id: 'e', tool: 'taper', form: 'taper.mb76', params: E.params, output: { name: 'd', unit: 'cm', bark: 'ib' } };
await page.click('#to2'); await page.fill('#t-D', '30'); await page.press('#t-D', 'Tab'); await page.fill('#t-H', '24'); await page.press('#t-H', 'Tab');
await page.fill('#o-dTop', '7'); await page.press('#o-dTop', 'Tab'); await page.click('#calc'); await page.waitForSelector('#rtab');
const m = TP.merchantable(set, 30, 24, { stump: 0.3, dTop: 7 }), row = await page.$$eval('#rtab tbody tr td', ts => ts.map(t => t.textContent.trim()));
ok(Math.abs(num(row[4]) - m.total) <= 5e-3 && Math.abs(num(row[5]) - m.hTop) <= 5e-3 && Math.abs(num(row[6]) - m.merch) <= 5e-5, `one tree: total ${row[4]}, top height ${row[5]}, merchantable ${row[6]} = engine (${m.total}, ${m.hTop}, ${m.merch})`);
ok(await page.locator('#ch-prof svg path.ch-line').count() === 1 && (await page.textContent('#used')).includes('e2e: benzetim örneği'), 'profile chart, coefficient source written');
await page.evaluate(() => { document.querySelector('#ptab').closest('details').open = true; });
const pr = await page.$$eval('#ptab tbody tr', rs => rs.map(r => [...r.children].map(c => c.textContent.trim())));
ok(pr.length === 25 && pr.every(([h, d]) => { const e = TP.diameterAt(set, 30, 24, Number(h)).d; return d === '–' ? e == null : Math.abs(Number(d) - e) <= 5e-3; }), 'profile table (1 m step, 25 rows) = engine');
// downloads
const [dx] = await Promise.all([page.waitForEvent('download'), page.click('#x-xlsx')]);
const wb = XLSX.read(await readFile(await dx.path()), { type: 'buffer' });
ok(['Bilgi', 'Ağaçlar', 'Profil'].every(n => wb.SheetNames.includes(n)) && XLSX.utils.sheet_to_json(wb.Sheets.Bilgi, { header: 1 }).some(r => r[0] === 'Katsayı setleri' && String(r[1]).includes('e2e: benzetim örneği')), 'Excel: Info (with the set and its source), Trees, Profile');
const [dc] = await Promise.all([page.waitForEvent('download'), page.click('#x-csv')]);
const csvOut = await readFile(await dc.path(), 'utf8'); { const L = csvOut.trim().split(/\r?\n/), hd = L[0].split(','), v = Number(L[1].split(',')[hd.indexOf('merch_m3')]); ok(hd.includes('merch_m3') && Math.abs(v - m.merch) <= 1e-5 * m.merch && String(v).length > 8, 'CSV with full-precision merchantable volume'); }
if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'taper-res.png'), fullPage: true });

// a tree table (pasted) and an invalid tree
await page.click('#steps [data-go="2"]'); await page.check('input[name="tmode"][value="table"]');
await page.evaluate(() => { document.querySelector('#timp details').open = true; });
await page.fill('#timp textarea', 'alan;agac;dbh;boy\n1;a;25;20\n1;b;40;28\n1;c;0;20'); await page.click('#timp [data-act="paste"]');
await page.waitForSelector('#tm-D'); await page.waitForSelector('#calc:not([disabled])'); await page.click('#calc'); await page.waitForSelector('#rtab tbody tr:nth-child(3)');
const rows = await page.$$eval('#rtab tbody tr', rs => rs.map(r => r.textContent));
ok(rows.length === 3 && rows[2].includes('göğüs çapı eksik'), 'tree table: three trees, the invalid one with its note');

// session survives a reload; English
await page.reload(); await page.waitForSelector('#rtab'); ok((await page.textContent('#status')).includes('geri yüklendi'), 'session restored after reload');
await page.goto(URL + '?lang=en'); await page.waitForSelector('#steps button');
ok((await page.locator('h1').textContent()).includes('Stem Taper') && (await page.textContent('#steps')).includes('Results'), 'English page');
// phone and dark theme
const ph = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' }); ph.on('pageerror', e => errors.push(e.message));
await ph.goto(URL + '?lang=tr'); await ph.waitForSelector('#steps button');
ok(await ph.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'phone: no horizontal scroll');
if (SHOTS) await ph.screenshot({ path: path.join(SHOTS, 'taper-phone.png'), fullPage: true });
ok(errors.length === 0, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
await browser.close();
console.log(`taper e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
