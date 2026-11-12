// Browser test for the site index tool (bonitet.php). Playwright, Chromium.
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/siteindex/e2e.mjs http://127.0.0.1:8092 [screenshot-dir]
// Every number on screen is checked against the engine (assets/lab/siteindex/calc.js, itself checked against SciPy in
// test_si01.mjs) and, for H0, against the Plot & Stand tool's own functions. Coefficients here are TEST values.
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const SI = await import('../../assets/lab/siteindex/calc.js');
const ST = await import('../../assets/lab/stand/calc.js');
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null, URL = BASE + '/bonitet.php';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, tol, m) => ok(Math.abs(a - b) <= tol, `${m}: got ${a} expected ${b}`);
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async (n, p = page) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
const rows = () => page.evaluate(() => [...document.querySelectorAll('#rtab tbody tr')].map(tr => [...tr.children].map(x => x.textContent.trim())));
const num = s => parseFloat(s);
const fillC = async (id, v) => { await page.fill(id, v); await page.locator(id).dispatchEvent('change'); };

// 0. listed under its category
await page.goto(BASE + '/?lang=tr');
ok((await page.locator('#side .b-cat', { hasText: 'Meşcere ve yetişme ortamı' }).count()) === 1 && (await page.locator('#side a[href="bonitet.php"]').count()) === 1, 'sidebar: "Meşcere ve yetişme ortamı" with Bonitet');
await page.goto(URL + '?lang=tr'); await page.waitForSelector('.coefcard');
ok((await page.locator('h1').textContent()).includes('Bonitet') && (await page.locator('#cf-none').count()) === 1 && (await page.locator('#to2').isDisabled()), 'no built-in coefficients; cannot continue without a set (K1)');
ok((await page.locator('#cf-form option').count()) === 3, 'three forms offered (no GADA)');

// 1. a set: source and the definition of the equation are required
await page.selectOption('#cf-form', 'si.cr.ada.b0'); await page.click('#cf-new');
await page.fill('#cf-p-b1', '0.03'); await page.fill('#cf-p-b2', '1.4'); await page.click('#cf-save');
let m = await page.locator('#cf-msg').textContent();
ok(m.includes('Yaş türü seçilmedi') && m.includes('Üst boy tanımı seçilmedi') && m.includes('kaynak künyesi zorunlu'), 'age type, top height definition and source required: ' + m);
await page.selectOption('#cf-x-ageType', 'total'); await page.selectOption('#cf-x-topDef', 'h0dbh');
await page.fill('#cf-v-A-0', '10'); await page.fill('#cf-v-A-1', '80'); await page.fill('#cf-cit', 'Test, not a real equation'); await page.click('#cf-save');
await page.waitForSelector('#setsel');
ok(await page.inputValue('#setsel') !== '' && (await page.locator('#setinfo').textContent()).includes('toplam yaş'), 'the only set is chosen; its age type shown');
ok(await page.locator('#to2').isDisabled(), 'no base age: cannot continue (no default)');
await fillC('#a0', '50');
await page.check('input[name="clsmode"][value="equal"]'); for (const [k, v] of [['start', '10'], ['width', '4'], ['n', '5']]) await fillC('#cls-' + k, v);
ok((await page.locator('#clsprev').textContent()).includes('I: 26–30') && (await page.locator('#clsprev').textContent()).includes('V: 10–14'), 'class preview, I = highest');
await shot('si-model');

// 2. one point: SI equals the engine; age type and base age in the result
await page.click('#to2');
ok(await page.locator('#calc').isDisabled(), 'age type of the data must be chosen');
await page.selectOption('#dage', 'bh');
ok((await page.locator('#step2 .nav').textContent()).includes('aynı değil') && await page.locator('#calc').isDisabled(), 'data age type differs from the equation: refused (K8)');
await page.selectOption('#dage', 'total'); await fillC('#sA', '30'); await fillC('#sH', '15');
await page.click('#calc'); await page.waitForSelector('#rtab');
const M = { form: 'cr.ada.b0', params: { b1: 0.03, b2: 1.4 }, baseAge: 50, ageType: 'total' }, si1 = SI.siteIndex(M, 30, 15).value;
let r = (await rows())[0];
near(num(r[6]), si1, 6e-4, 'SI50 on screen = engine'); ok(r[7] === 'III' && r[9] === 'tamam', 'class III ([18, 22))');
ok((await page.locator('#rmodel').textContent()).includes('Dayanak yaş 50 yıl (toplam yaş)') && (await page.locator('#rsrc').textContent()).includes('Kullanıcı katsayılarıyla üretildi: Test, not a real equation'), 'base age, age type and source in the result');
ok((await page.locator('#ch-si svg path, #ch-si svg polyline').count()) >= 6, 'curve family: six class-boundary curves');
// class boundaries change → class changes, SI does not
await page.click('#steps [data-go="1"]'); await fillC('#cls-start', '14');
await page.click('#steps [data-go="3"]'); await page.waitForSelector('#rtab'); r = (await rows())[0];
near(num(r[6]), si1, 6e-4, 'SI unchanged when the classes change'); ok(r[7] === 'IV', 'class changes to IV ([18, 22) with classes from 14 m): ' + r[7]);
// base age 100: same curve, index read at 100 (base-age invariance on screen)
await page.click('#steps [data-go="1"]'); await page.check('input[name="clsmode"][value="none"]'); await fillC('#a0', '100');
await page.click('#steps [data-go="3"]'); await page.waitForSelector('#rtab'); r = (await rows())[0];
near(num(r[6]), SI.project(M, 100, 50, si1).value, 6e-4, 'SI100 = projection of SI50 to age 100');
ok((await page.evaluate(() => [...document.querySelectorAll('#rtab thead th')].map(x => x.textContent))).includes('Bonitet endeksi SI100 (m)'), 'column named with the base age');

// 3. table input: decimal comma, an unreadable cell, an age outside the validity range
const tbl = ['alan;donem;yas;ust_boy', 'A;2019;35;17,5', 'A;2024;40;19,8', 'B;2019;95;30,1', 'C;2019;x;12'].join('\n');
await page.click('#steps [data-go="2"]'); await page.check('input[name="dmode"][value="table"]');
await page.locator('#impbox details summary').click(); await page.fill('#impbox textarea', tbl); await page.click('#impbox [data-act="paste"]'); await page.waitForSelector('#impbox .fname');
ok(await page.inputValue('#map-A') === '2' && await page.inputValue('#map-H') === '3' && await page.isChecked('input[name="dec"][value=","]'), 'columns and decimal comma recognised');
await page.click('#calc'); await page.waitForSelector('#rtab');
const tr = await rows(), M100 = { ...M, baseAge: 100 };
near(num(tr[0][6]), SI.siteIndex(M100, 35, 17.5).value, 6e-4, 'row A/2019 = engine'); near(num(tr[1][6]), SI.siteIndex(M100, 40, 19.8).value, 6e-4, 'row A/2024 = engine');
// no classes now: columns unit, plot, period, A, H, source, SI, note, state
ok(tr[2][7].includes('geçerlilik aralığı dışında') && tr[2][8] === 'tamam', 'age 95 outside the set range 10–80: computed and flagged');
ok(tr[3][8] === 'hesaplanmadı' && tr[3][6] === '–' && tr[3][7].includes('sayı okunamadı ("x")'), 'unreadable age: no number');
ok((await page.locator('#rsum').textContent()).includes('4 nokta: 3 hesaplandı, 1 hesaplanamadı, 1 geçerlilik aralığı dışında'), 'summary');
const [dc] = await Promise.all([page.waitForEvent('download'), page.click('#x-csv')]);
ok((await readFile(await dc.path(), 'utf8')).split('\n').length >= 5, 'CSV downloads');
const [dj] = await Promise.all([page.waitForEvent('download'), page.click('#x-json')]);
const js = JSON.parse(await readFile(await dj.path(), 'utf8'));
ok(js.tool.version === '1.0.0-beta.2' && js.model.baseAge === 100 && js.model.ageType === 'total' && js.set.source.citation === 'Test, not a real equation' && js.results.length === 4, 'JSON: model, set with source, results');
const [dx] = await Promise.all([page.waitForEvent('download'), page.click('#x-xlsx')]); ok((await dx.suggestedFilename()).endsWith('.xlsx'), 'Excel report');

// 4. approved data: H0 by the Plot & Stand definition (shared code), mean recorded age
const ds = { schema: 'forest-dataset/1', plots: [{ plot_id: 'P1', plot_area: 400 }, { plot_id: 'P2', plot_area: 200 }], trees: [] };
const H = [[30, 24, 45], [28, 23, 45], [26, 22, 44], [22, 19, null], [18, 16, null], [35, 26, 50], [33, 25, 50], [20, null, null]];
H.forEach(([d, h, a], i) => ds.trees.push({ row: i + 2, plot_id: i < 5 ? 'P1' : 'P2', tree_id: String(i + 1), period: null, dbh: d, height: h, age: a, status: null }));
await page.evaluate(async d => { const s = await import('/assets/lab/core/store.js'); await s.put('dataset:approved', d); }, ds);
await page.reload(); await page.waitForSelector('#steps');
await page.click('#steps [data-go="2"]'); await page.check('input[name="dmode"][value="ds"]'); await page.check('input[name="rank"][value="dbh"]');
await page.click('#calc');
await page.waitForSelector('#rtab');
const dr = await rows(), units = ST.buildUnits(ds, {}).units.filter(u => u.state === 'measured');
units.forEach((u, i) => { const mm = ST.unitMetrics(u), H0 = mm.dom.d.H0, A = mm.age.mean;
  near(num(dr[i][4]), H0, 6e-4, `${u.plot_id}: H0 = Plot & Stand function`); near(num(dr[i][3]), A, 6e-4, `${u.plot_id}: mean recorded age`);
  near(num(dr[i][6]), SI.siteIndex(M100, A, H0).value, 6e-4, `${u.plot_id}: SI100 from H0`); ok(dr[i][5] === 'H0, en kalın 100', `${u.plot_id}: source of the top height named`); });
await page.click('#steps [data-go="2"]'); await page.check('input[name="rank"][value="height"]'); await page.click('#calc'); await page.waitForSelector('#rtab');
ok((await rows())[1][8] === 'hesaplanmadı' && (await rows())[1][7].includes('H0 hesaplanamadı'), 'tallest-tree H0 with an unmeasured height: not computed (Plot & Stand rule)');
await shot('si-results');

// 4b. fitting to own series (SI03): the simulated stem analyses of the SciPy reference, same start → same coefficients
const REF = JSON.parse(await readFile(new globalThis.URL('../ref/siteindex_si03.json', import.meta.url), 'utf8')), rec = REF.forms['cr.ada.b0'];
const tsv = ['agac\tyas\tboy', ...rec.series.flatMap(s => s.points.map(p => [s.id, p.A, p.H].join('\t')))].join('\n');
await page.click('#steps [data-go="1"]'); await page.locator('#fitbox > summary').click(); await page.waitForSelector('#fitimp');
await page.locator('#fitimp details summary').click(); await page.fill('#fitimp textarea', tsv); await page.click('#fitimp [data-act="paste"]'); await page.waitForSelector('#f-run');
ok(await page.inputValue('#fm-series') === '0' && await page.inputValue('#fm-A') === '1' && await page.inputValue('#fm-H') === '2', 'series, age and height columns recognised');
await page.check('input[name="fstart"][value="user"]'); await fillC('#fs-b1', String(REF.start['cr.ada.b0'][0])); await fillC('#fs-b2', String(REF.start['cr.ada.b0'][1]));
for (const mode of ['consecutive', 'all']) {
  await page.check(`input[name="fpair"][value="${mode}"]`); await page.click('#f-run'); await page.waitForSelector('#fittab');
  const ref = rec.fits[mode], est = await page.evaluate(() => [...document.querySelectorAll('#fittab tbody tr')].map(tr => parseFloat(tr.children[1].textContent)));
  near(est[0], ref.theta[0], 1e-7, `${mode}: b1 = SciPy least_squares`); near(est[1], ref.theta[1], 1e-7, `${mode}: b2 = SciPy`);
  ok((await page.locator('#fitsum').textContent()).startsWith(`${ref.n} çift, 25 dizi`), `${mode}: ${ref.n} pairs`);
  near(num((await page.locator('#fitgof').textContent()).match(/RMSE ([\d.]+)/)[1]), ref.rmse, 6e-4, `${mode}: RMSE`);
}
ok((await page.locator('#fitbox', { hasText: 'Gözlemler bağımsız varsayımıyla' }).count()) === 1 && (await page.locator('#ch-fit svg').count()) === 1 && (await page.locator('#ch-res svg').count()) === 1, 'SE label, curve and residual charts');
await page.click('#fx-save'); ok((await page.locator('#fx-msg').textContent()).includes('Eksik') && (await page.locator('#fx-msg').textContent()).includes('Kaynak künyesi'), 'saving needs age type, top height definition and a citation');
await page.selectOption('#fx-age', 'total'); await page.selectOption('#fx-top', 'h0dbh'); await fillC('#fx-cit', 'Simulated stem analyses (test)'); await page.click('#fx-save'); await page.waitForSelector('#fx-ok');
{ const lib = await page.evaluate(async () => (await (await import('/assets/lab/core/coef.js')).listCoefs('siteindex')));
  const fitted = lib.find(s => s.origin === 'fitted');
  ok(fitted && fitted.fit.pairing === 'all' && fitted.fit.n === rec.fits.all.n && fitted.fit.seNote === 'independent-observations' && Math.abs(fitted.params.b1 - rec.fits.all.theta[0]) < 1e-7 * rec.fits.all.theta[0] && fitted.valid.A[0] > 0 && fitted.meta.ageType === 'total', 'fitted set stored with origin, fit summary and the data range as validity range');
  ok(await page.inputValue('#setsel') === fitted.id, 'the fitted set is chosen for the calculation'); }

// 5. English and phone + dark (back to the results with the fitted set)
await page.click('#steps [data-go="3"]'); await page.waitForSelector('#rtab'); await page.waitForTimeout(400);
const en = await ctx.newPage(); en.on('pageerror', e => errors.push(e.message));
await en.goto(URL + '?lang=en'); await en.waitForSelector('#rtab');
ok((await en.locator('#rsrc').textContent()).includes('Produced with user coefficients') && (await en.locator('#rtab thead th', { hasText: 'Site index SI100 (m)' }).count()) === 1, 'English');
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' }); phone.on('pageerror', e => errors.push(e.message));
await phone.goto(URL + '?lang=tr'); await phone.waitForSelector('.coefcard');
ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no horizontal page scroll');
ok(errors.length === 0, 'no console errors: ' + errors.join(' | '));
await browser.close();
console.log(`siteindex e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
