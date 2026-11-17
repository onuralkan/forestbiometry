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
const BK = await import('../../assets/lab/taper/bucking.js');
const { blankSet } = await import('../../assets/lab/core/coef.js');
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
ok((await page.locator('h1').textContent()).includes('Gövde Profili') && (await page.locator('.b-ids').textContent()).trim() === 'SV-02 · SV-03 · SV-06' && (await page.locator('.b-ver').textContent()).includes(VER), `page title, tool ids SV-02 · SV-06, version ${VER}`);
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

// product bucking (SV-06) on the same tree: user products, value method, then priority; results = engine
await page.click('#steps [data-go="2"]'); await page.check('#b-on'); await page.waitForSelector('#b-add');
ok(await page.isDisabled('#calc') && (await page.textContent('#step2')).includes('En az bir ürün'), 'bucking on without products: cannot compute');
const PRODS = [['tomruk', '20', '4', '6', '0.5', '10', '1', '120'], ['kısa tomruk', '12', '2.5', '', '', '10', '2', '80'], ['lif-yonga', '7', '2', '', '', '0', '3', '30']];
const KS = ['name', 'dMin', 'L', 'Lmax', 'Lstep', 'trim', 'priority', 'value'];
for (const [i, row] of PRODS.entries()) {
  await page.click('#b-add'); await page.waitForSelector(`#bprod input[data-row="${i}"][data-k="name"]`);
  for (const [j, v] of row.entries()) { const sel = `#bprod input[data-row="${i}"][data-k="${KS[j]}"]`; await page.fill(sel, v); await page.press(sel, 'Tab'); }
}
await page.waitForSelector('#calc:not([disabled])');
const LIST = { bark: 'ib', currency: null, products: PRODS.map((r, i) => ({ id: String(i + 1), name: r[0], dMin: +r[1], L: +r[2], Lmax: r[3] ? +r[3] : null, Lstep: r[3] ? +r[4] : null, trim: +r[5], priority: +r[6], value: +r[7] })) };
await page.fill('#bprod input[data-row="1"][data-k="trim"]', '5'); await page.press('#bprod input[data-row="1"][data-k="trim"]', 'Tab');
ok(await page.isDisabled('#calc') && (await page.textContent('#step2')).includes('tam katı değil'), 'length + trim off the 0.1 m grid: refused with a message');
await page.fill('#bprod input[data-row="1"][data-k="trim"]', '10'); await page.press('#bprod input[data-row="1"][data-k="trim"]', 'Tab'); await page.waitForSelector('#calc:not([disabled])');
await page.click('#calc'); await page.waitForSelector('#bsum');
const bset = { ...blankSet('taper.mb76'), id: 'e', params: E.params, output: { name: 'd', unit: 'cm', bark: 'ib' }, source: { citation: 'e2e' } };
const bOpts = { method: 'value', objective: 'value', step: 0.1, stump: 0.3, dTop: 7 }, BV = BK.buckTree(bset, 30, 24, LIST, bOpts);
const sumRows = await page.$$eval('#bsum tbody tr', rs => rs.map(r => [...r.children].map(c => c.textContent.trim())));
ok(BV.status === 'ok' && sumRows.length === 4 && BV.byProduct.every((b, k) => Number(sumRows[k][1]) === b.n && Math.abs(num(sumRows[k][2]) - b.V) <= 5e-5 * Math.max(1, b.V) + 1e-4 && Math.abs(num(sumRows[k][3]) - b.value) <= 0.005 + 1e-6 * b.value),
  `value method: product summary = engine (${BV.byProduct.map(b => b.n + '×' + b.name).join(', ')}; value ${BV.valueTotal.toFixed(2)})`);
ok(Math.abs(num(sumRows[3][3]) - BV.valueTotal) <= 0.005 + 1e-6 * BV.valueTotal && await page.locator('#ch-buck svg g.bpiece').count() === BV.pieces.length && await page.locator('#bpieces tbody tr').count() === BV.pieces.length, 'total value, one drawn shape and one table row per piece');
const pcs = await page.$$eval('#bpieces tbody tr', rs => rs.map(r => [...r.children].map(c => c.textContent.trim())));
ok(pcs.every((c, i) => Math.abs(num(c[2]) - BV.pieces[i].h1) <= 5e-3 && Math.abs(num(c[3]) - BV.pieces[i].h2) <= 5e-3 && num(c[7]) >= LIST.products[BV.pieces[i].product].dMin - 0.05), 'pieces: heights = engine, small ends not below the minimum');
ok((await page.textContent('#bused')).includes('dinamik programlama') && (await page.textContent('#bbal')).includes('toplam gövde'), 'method, settings and volume balance written');
ok(await page.locator('#ch-buck svg pattern').count() === 3 && await page.locator('#bsum .bsw').count() === 3, 'each product has a pattern and a legend swatch (not colour alone)');
const [dxb] = await Promise.all([page.waitForEvent('download'), page.click('#x-xlsx')]);
const wbb = XLSX.read(await readFile(await dxb.path()), { type: 'buffer' }), pz = XLSX.utils.sheet_to_json(wbb.Sheets['Parçalar'], { header: 1 });
ok(wbb.SheetNames.includes('Ürünler') && pz.length === BV.pieces.length + 1 && Math.abs(pz[1][pz[0].indexOf('V_m3')] - BV.pieces[0].V) <= 1e-4 * BV.pieces[0].V, 'Excel: Products and Pieces sheets, piece volumes at full precision');
if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'taper-buck.png'), fullPage: true });
// changing a product changes the bucking; priority method = engine
await page.click('#steps [data-go="2"]'); await page.fill('#bprod input[data-row="0"][data-k="dMin"]', '26'); await page.press('#bprod input[data-row="0"][data-k="dMin"]', 'Tab');
await page.check('input[name="bmethod"][value="priority"]'); await page.waitForSelector('#calc:not([disabled])'); await page.click('#calc'); await page.waitForSelector('#bsum');
const LIST2 = { ...LIST, products: LIST.products.map((p, i) => i === 0 ? { ...p, dMin: 26 } : p) }, BP = BK.buckTree(bset, 30, 24, LIST2, { ...bOpts, method: 'priority' });
const sum2 = await page.$$eval('#bsum tbody tr', rs => rs.map(r => [...r.children].map(c => c.textContent.trim())));
ok(BP.byProduct.every((b, k) => Number(sum2[k][1]) === b.n) && (await page.textContent('#bused')).includes('öncelik sırası') && JSON.stringify(sum2.map(r => r[1])) !== JSON.stringify(sumRows.map(r => r[1])), 'new minimum diameter and priority method: bucking changes and = engine');
// product list JSON: download, clear, load back
await page.click('#steps [data-go="2"]');
const [dj] = await Promise.all([page.waitForEvent('download'), page.click('#b-save')]); const pj = await dj.path();
const back = BK.parseProducts(await readFile(pj, 'utf8')); ok(back.problems.length === 0 && back.list.products.length === 3 && back.list.products[0].dMin === 26, 'product list downloaded as bucking-products/1 JSON');
for (let i = 0; i < 3; i++) await page.click('[data-bdel="0"]');
ok(await page.locator('#bprod tbody tr').count() === 0, 'products deleted');
await page.setInputFiles('#b-load', pj); await page.waitForSelector('#bprod input[data-row="2"]');
ok(await page.inputValue('#bprod input[data-row="0"][data-k="dMin"]') === '26' && (await page.textContent('#status')).includes('yüklendi'), 'product list loaded back from the JSON');
await page.uncheck('#b-on');

// SV-03: log-length limit on the same tree (top diameter 7 cm): 2 m logs, 10 cm trim, 1 m minimum, short top kept
await page.click('#steps [data-go="2"]'); await page.check('#o-logOn'); await page.waitForSelector('#o-L');
ok(await page.isDisabled('#calc') && (await page.textContent('#step2')).includes('Tomruk boyu > 0'), 'log limit on without a log length: cannot compute');
for (const [k, v] of [['L', '2'], ['trim', '10'], ['minLen', '1']]) { await page.fill('#o-' + k, v); await page.press('#o-' + k, 'Tab'); await page.waitForSelector('#o-L'); }
await page.selectOption('#o-shortTop', 'keep'); await page.waitForSelector('#calc:not([disabled])');
ok((await page.textContent('#lgnote')).includes('§6.4.1') && (await page.textContent('#lgnote')).includes('varsayılan değildir'), 'rule and source written; the book values are not defaults');
await page.click('#calc'); await page.waitForSelector('#logcard');
{ const mm = TP.merchantable(set, 30, 24, { stump: 0.3, dTop: 7 }), G = TP.logLimit(set, 30, 24, { stump: 0.3, hTop: mm.hTop, L: 2, trim: 0.1, minLen: 1, shortTop: 'keep' });
  const r = await page.$$eval('#rtab tbody tr td', ts => ts.map(t => t.textContent.trim()));
  ok(r[7] === `${G.n}${G.short ? ' + 1' : ''}` && Math.abs(num(r[8]) - (G.V.logs + G.V.short)) <= 5e-5 && Math.abs(num(r[9]) - G.V.trims) <= 5e-5 && Math.abs(num(r[10]) - G.V.rest) <= 5e-5,
    `tree table: ${r[7]} logs, ${r[8]} m³ = engine (${G.n}${G.short ? ' + short' : ''}, ${(G.V.logs + G.V.short).toFixed(4)})`);
  const lr = await page.$$eval('#logcard table[data-logs="ib"] tbody tr', rs => rs.map(x => [...x.children].map(c => c.textContent.trim())));
  ok(lr.length === G.logs.length + (G.short ? 1 : 0) && G.logs.every((q, i) => Math.abs(num(lr[i][1]) - q.h1) <= 5e-3 && Math.abs(num(lr[i][2]) - q.h2) <= 5e-3 && Math.abs(num(lr[i][5]) - q.V) <= 5e-5 && num(lr[i][4]) >= 7 - 0.05), 'log list of the tree = engine; every small end at or above the top diameter');
  ok((await page.textContent('#logcard [data-bal="ib"]')).includes('kullanılabilir hacim'), 'volume balance written (logs + trim + rest = merchantable)');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#x-csv')]);
  const L = (await readFile(await dl.path(), 'utf8')).trim().split(/\r?\n/), hd = L[0].split(','), c = L[1].split(',');
  ok(hd.includes('logs_n') && Number(c[hd.indexOf('logs_n')]) === G.n && Math.abs(Number(c[hd.indexOf('logs_m3')]) - G.V.logs) <= 1e-9 * Math.max(1, G.V.logs), 'CSV: log count and log volume at full precision'); }
if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'taper-logs.png'), fullPage: true });
await page.click('#steps [data-go="2"]'); await page.uncheck('#o-logOn'); await page.waitForSelector('#calc');

// a tree table (pasted) and an invalid tree
await page.click('#steps [data-go="2"]'); await page.check('input[name="tmode"][value="table"]');
await page.evaluate(() => { document.querySelector('#timp details').open = true; });
await page.fill('#timp textarea', 'alan;agac;dbh;boy\n1;a;25;20\n1;b;40;28\n1;c;0;20'); await page.click('#timp [data-act="paste"]');
await page.waitForSelector('#tm-D'); await page.waitForSelector('#calc:not([disabled])'); await page.click('#calc'); await page.waitForSelector('#rtab tbody tr:nth-child(3)');
const rows = await page.$$eval('#rtab tbody tr', rs => rs.map(r => r.textContent));
ok(rows.length === 3 && rows[2].includes('göğüs çapı eksik'), 'tree table: three trees, the invalid one with its note');

// session survives a reload; English
await page.waitForTimeout(400); await page.reload(); await page.waitForSelector('#rtab'); ok((await page.textContent('#status')).includes('geri yüklendi'), 'session restored after reload');
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
