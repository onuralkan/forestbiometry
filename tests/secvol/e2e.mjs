// Browser test for the stem section volume tool (seksiyon-hacmi.php). Playwright, Chromium.
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/secvol/e2e.mjs http://127.0.0.1:8092 [screenshot-dir]
// Data: trees on exact cone profiles d(h) = D0(1 − h/H), so every number on screen is checked against the engine
// (itself checked against SciPy in tests/secvol/test_sv01.mjs) and, for the top piece, against the cone formula.
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const V = await import('../../assets/lab/secvol/calc.js');
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null, URL = BASE + '/seksiyon-hacmi.php';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, tol, m) => ok(Math.abs(a - b) <= tol, `${m}: got ${a} expected ${b}`);
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async (n, p = page) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
const rows = id => page.evaluate(id => [...document.querySelectorAll(`#${id} tbody tr`)].map(tr => [...tr.children].map(x => x.textContent.trim())), id);
const num = s => parseFloat(s);

// cone trees: (plot, tree, D0 at ground, H, cut height, measured heights); bark 2·5 % of d in mm
const cone = (D0, H) => h => D0 * (1 - h / H);
const TREES = [['P1', 'A', 30, 20, 0.3, [0.3, 1.3, 5.3, 9.3, 13.3]], ['P1', 'B', 24, 16, 0.2, [0.2, 1.3, 4.3, 7.3, 10.3]], ['P2', 'C', 36, 24, 0.3, [0.3, 1.3, 6.3, 11.3, 16.3]]];
const lines = ['plot\ttree\th\td\tbark_mm\tdbh\tboy\tstump\tarea_m2'];
for (const [p, t, D0, H, st, hs] of TREES) { const d = cone(D0, H); for (const h of hs) lines.push([p, t, h, +d(h).toFixed(6), +(d(h) * 0.5).toFixed(6), +d(1.3).toFixed(6), H, st, p === 'P1' ? 500 : 400].join('\t')); }
lines.push(['P2', 'D', 5, 20, 1, 20, 18, 0.3, 400].join('\t'), ['P2', 'D', 5, 19, 1, 20, 18, 0.3, 400].join('\t'));   // repeated height: error
const engine = (s) => TREES.map(([p, t, D0, H, st, hs]) => { const d = cone(D0, H); return V.treeVolume({ plot_id: p, tree_id: t, period: null, state: 'ok', height: H, stump_h: st, dbh: d(1.3),
  points: hs.map((h, i) => ({ row: i + 2, h, d: +d(h).toFixed(6), d_ib: +d(h).toFixed(6) - +(d(h) * 0.5).toFixed(6) / 10, kind: null })) }, s); });

// 0. the tool is listed under its category
await page.goto(BASE + '/?lang=tr');
ok((await page.locator('#side .b-cat', { hasText: 'Ağaç ve gövde' }).count()) === 1 && (await page.locator('#side a[href="seksiyon-hacmi.php"]').count()) === 1, 'sidebar: "Ağaç ve gövde" with Seksiyon Hacmi');
await page.goto(URL + '?lang=tr');
ok((await page.locator('h1').textContent()).includes('Seksiyon Hacmi') && (await page.locator('text=1.0.0-beta.1').count()) >= 1, 'page title and version 1.0.0-beta.1');

// 1. paste the table, columns recognised, defaults
await page.locator('#impbox details summary').click(); await page.fill('#impbox textarea', lines.join('\n')); await page.click('#impbox [data-act="paste"]');
await page.waitForSelector('#impbox .fname'); await page.click('#to2');
ok(await page.inputValue('#m-tree') === '1' && await page.inputValue('#m-plot') === '0' && await page.inputValue('#m-h') === '2' && await page.inputValue('#m-d') === '3' && await page.inputValue('#m-bark_t') === '4' && await page.inputValue('#m-dbh') === '5' && await page.inputValue('#m-height') === '6' && await page.inputValue('#m-stump_h') === '7' && await page.inputValue('#m-area') === '8', 'columns recognised from the headers');
ok(await page.isChecked('input[name="layout"][value="ends"]') && await page.isChecked('input[name="top"][value="cone"]') && !(await page.isChecked('#incstump')) && await page.isChecked('input[name="area"][value="col"]') && await page.isChecked('input[name="dec"][value="."]'), 'defaults: ends layout, cone top, stump not added, plot size from the column, decimal point');
ok((await page.locator('[data-meth]').count()) === 1 && (await page.locator('[data-meth="smalian"]').count()) === 1, 'ends layout offers only Smalian');
await page.check('input[name="layout"][value="mids"]'); ok((await page.locator('[data-meth]').count()) === 1 && (await page.locator('[data-meth="huber"]').count()) === 1, 'middles layout offers only Huber');
await page.check('input[name="layout"][value="triples"]'); ok((await page.locator('[data-meth]').count()) === 3, 'triples offer Huber, Smalian, Newton');
await page.check('input[name="layout"][value="ends"]');
await page.click('#calc'); await page.waitForSelector('#ttab');
await shot('secvol-results');

// 2. tree volumes equal the engine; top piece is the exact cone
let E = engine({ method: 'smalian', layout: 'ends' }), tr = await rows('ttab');
ok((await page.locator('#sum').textContent()).includes('4 ağaç: 3 hesaplandı, 1 hesaplanamadı'), 'summary: 3 computed, 1 not');
TREES.forEach(([, t], i) => { const r = tr.find(x => x[1] === t); near(num(r[3]), E[i].ob.total, 6e-5, `${t}: over-bark volume = engine`); near(num(r[4]), E[i].ib.total, 6e-5, `${t}: under-bark volume = engine`); near(num(r[5]), E[i].formFactor.value, 6e-5, `${t}: form factor`); ok(r[6] === 'kesimden tepeye' && r[7] === 'tamam', `${t}: extent and state`); });
{ const [, , D0, H, , hs] = TREES[0], h0 = hs[hs.length - 1], d0 = cone(D0, H)(h0); near(E[0].ob.top, Math.PI / 4 * (d0 / 100) ** 2 * (H - h0) / 3, 1e-12, 'top piece of a cone tree = exact cone gL/3'); }
ok(tr.find(x => x[1] === 'D')[7] === 'hesaplanmadı' && tr.find(x => x[1] === 'D')[3] === '–', 'tree with a repeated height: not computed, no number');
// plots: m³/ha = Σ V × 10000/A, the plot with a failed tree is marked
const pr = await rows('ptab');
near(num(pr[0][6]), (E[0].ob.total + E[1].ob.total) * 10000 / 500, 6e-3, 'P1 m³/ha over bark'); ok(pr[0][8] === 'tamam' && pr[1][8] === 'eksik ağaç var' && pr[1][5] === '1', 'P2: one tree not computed, marked');
near(num(pr[1][6]), E[2].ob.total * 10000 / 400, 6e-3, 'P2 m³/ha over the computed tree only');
// problems with row numbers
await page.locator('#probs summary').click();
const probs = await rows('prtab');
ok(probs.some(r => r[0] === '18' && r[3].includes('aynı yükseklik')), 'repeated height reported with its row (18): ' + JSON.stringify(probs));

// 3. tree details: section breakdown and profile chart
await page.locator('#ttab tr[data-key]').nth(2).click();
ok(await page.evaluate(() => document.getElementById('tdetail').open), 'clicking a row opens the details');
const secs = await rows('sectab');
ok(secs[0][0] === 'kütük' && secs[secs.length - 1][0].startsWith('uç (koni') && secs.length === 6, 'stump, four sections, top: ' + secs.map(r => r[0]).join(','));
near(secs.slice(1).reduce((a, r) => a + num(r[7]), 0), E[2].ob.total, 3e-5, 'section volumes add up to the total (stump not added)');
ok((await page.locator('#ch-prof svg path, #ch-prof svg polyline').count()) >= 2, 'profile chart with measured line and top piece');
await page.check('input[name="dbark"][value="ib"]'); ok(num((await rows('sectab'))[1][7]) < num(secs[1][7]), 'under-bark breakdown is smaller');

// 4. settings change the numbers in the expected direction
await page.click('#steps [data-go="2"]'); await page.check('input[name="top"][value="paraboloid"]'); await page.check('#incstump'); await page.fill('#dtop', '7'); await page.locator('#dtop').dispatchEvent('change');
await page.click('#calc'); await page.waitForSelector('#ttab');
E = engine({ method: 'smalian', layout: 'ends', top: 'paraboloid', includeStump: true, dTop: 7 }); tr = await rows('ttab');
const hd = await page.evaluate(() => [...document.querySelectorAll('#ttab thead th')].map(x => x.textContent));
ok(hd.includes("Kullanılabilir hacim, 7 cm'ye (m³)") && hd.includes('7 cm yüksekliği (m)'), 'merchantable columns appear');
TREES.forEach(([, t], i) => { const r = tr.find(x => x[1] === t); near(num(r[3]), E[i].ob.total, 6e-5, `${t}: paraboloid top + stump = engine`); near(num(r[6]), E[i].ob.merch.volume, 6e-5, `${t}: merchantable volume = engine`); near(num(r[7]), E[i].ob.merch.h, 6e-3, `${t}: height of 7 cm`); ok(r[8] === 'kesimden tepeye + kütük', `${t}: extent says the stump is included`); });
{ const [, , D0, H, , hs] = TREES[0], h0 = hs[hs.length - 1], d0 = cone(D0, H)(h0), L = H - h0;   // 7 cm lies in the top piece of A: the chosen paraboloid's profile d0·(1 − t/L)^(1/2)
  near(E[0].ob.merch.h, h0 + L * (1 - (7 / d0) ** 2), 1e-9, 'A: height of 7 cm in the paraboloid top piece'); ok(E[0].ob.merch.rule === 'top-solid', 'A: rule recorded'); }

// 5. exports
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#x-csv')]);
const csv = await readFile(await dl.path(), 'utf8');
ok(csv.split('\n')[0].includes('Smalian, kabuklu (m³)') && csv.includes('A,') && !/\d,\d{3}\b/.test(csv.split('\n')[1].replace(/^[^,]*,[^,]*,[^,]*,/, '')), 'CSV with comma separator and decimal point');
const [dj] = await Promise.all([page.waitForEvent('download'), page.click('#x-json')]);
const js = JSON.parse(await readFile(await dj.path(), 'utf8'));
ok(js.tool.version === '1.0.0-beta.1' && js.settings.top === 'paraboloid' && js.settings.includeStump === true && js.results.smalian.length === 4 && js.results.smalian[0].ob.sections.length > 0, 'JSON: settings and full results');
const [dx] = await Promise.all([page.waitForEvent('download'), page.click('#x-xlsx')]);
ok((await dx.suggestedFilename()).endsWith('.xlsx'), 'Excel report downloads');

// 6. triples: three methods side by side, Newton as the reference
const trip = ['plot\ttree\th\td\tboy\tstump'];
{ const d = cone(30, 20); for (const h of [0.3, 2.3, 4.3, 6.3, 8.3]) trip.push(['P', 'T', h, +d(h).toFixed(6), 20, 0.3].join('\t')); }
await page.click('#steps [data-go="1"]'); await page.evaluate(() => { document.querySelector('#impbox details').open = true; }); await page.fill('#impbox textarea', trip.join('\n')); await page.click('#impbox [data-act="paste"]');
await page.waitForSelector('#impbox .fname'); await page.click('#to2'); await page.check('input[name="layout"][value="triples"]'); await page.check('input[name="area"][value="none"]');
await page.click('#calc'); await page.waitForSelector('#ttab');
const th3 = await page.evaluate(() => [...document.querySelectorAll('#ttab thead th')].map(x => x.textContent)), r3 = (await rows('ttab'))[0];
ok(th3.includes('Huber, kabuklu (m³)') && th3.includes('Newton, kabuklu (m³)') && th3.includes('Huber farkı (%)') && th3.includes('Newton, kabuksuz (m³)'), 'three methods side by side; differences relative to Newton');
{ const vh = num(r3[3]), vs = num(r3[4]), vn = num(r3[5]); ok(vh < vn && vs > vn, 'cone: Huber below Newton, Smalian above (Newton exact)'); const tt = { plot_id: 'P', tree_id: 'T', period: null, state: 'ok', height: 20, stump_h: 0.3, dbh: null, points: [0.3, 2.3, 4.3, 6.3, 8.3].map((h, i) => ({ row: i + 2, h, d: +cone(30, 20)(h).toFixed(6), d_ib: null, kind: null })) };
  const eh = V.treeVolume(tt, { method: 'huber', layout: 'triples' }).ob.total, en_ = V.treeVolume(tt, { method: 'newton', layout: 'triples' }).ob.total;
  near(num(r3[7]), 100 * (eh - en_) / en_, 6e-4, 'Huber difference % = engine'); }
ok((await page.locator('#ptab').count()) === 0, 'no per-hectare table without plot sizes');

// 7. sample data (decimal commas), English, phone + dark
await page.click('#steps [data-go="1"]'); await page.click('#sample'); await page.waitForSelector('#impbox .fname'); await page.click('#to2');
ok(await page.isChecked('input[name="dec"][value=","]'), 'sample with decimal commas: comma proposed');
await page.click('#calc'); await page.waitForSelector('#ttab');
ok((await page.locator('#sum').textContent()).includes('14 ağaç: 13 hesaplandı, 1 hesaplanamadı') && (await page.locator('#ptab tbody tr').count()) === 3, 'sample: 13 of 14 trees, three plots');
await page.waitForTimeout(600);                                   // the session is saved 250 ms after the last change
const en = await ctx.newPage(); en.on('pageerror', e => errors.push(e.message));
await en.goto(URL + '?lang=en'); await en.waitForSelector('#ttab');
ok((await en.locator('#sum').textContent()).includes('14 trees: 13 computed, 1 not computed') && (await en.locator('#ttab thead th', { hasText: 'over bark' }).count()) >= 1, 'English: same session, translated');
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' }); phone.on('pageerror', e => errors.push(e.message));
await phone.goto(URL + '?lang=tr'); await phone.click('#sample'); await phone.waitForSelector('#impbox .fname'); await phone.click('#to2'); await phone.click('#calc'); await phone.waitForSelector('#ttab');
ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no horizontal page scroll');
await shot('secvol-phone', phone);
ok(errors.length === 0, 'no console errors: ' + errors.join(' | '));
await browser.close();
console.log(`secvol e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
