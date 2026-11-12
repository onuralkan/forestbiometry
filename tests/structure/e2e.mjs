// Browser test for the Stand Structure tool (mescere-yapisi.php). Playwright, Chromium.
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/structure/e2e.mjs http://127.0.0.1:8092 [screenshot-dir]
// Every number on screen is checked against the engine (run.js), itself checked against SciPy and brute force in
// tests/structure/test_ss01.mjs, test_ss02.mjs, test_ss07.mjs and test_ss04.mjs.
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const XLSX = require(path.join(ROOT, 'assets/vendor/sheetjs/xlsx.mini.min.js'));
const { tableFromText } = await import('../../assets/lab/core/table.js');
const { parseNumber, toInternal } = await import('../../assets/lab/core/num.js');
const { tableToDataset } = await import('../../assets/lab/stand/calc.js');
const RUN = await import('../../assets/lab/structure/run.js');
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null, URL = BASE + '/mescere-yapisi.php';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async (n, p = page) => { if (SHOTS) await p.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
const rows = id => page.evaluate(id => [...document.querySelectorAll(`#${id} tbody tr`)].map(tr => [...tr.children].map(x => x.textContent.trim())), id);
const num = s => parseFloat(String(s).replace(/\s/g, ''));
const close = (a, b, rel = 2e-3) => Number.isFinite(a) && Math.abs(a - b) <= rel * Math.max(1, Math.abs(b));

// engine on the sample data
const csv = await readFile(path.join(ROOT, 'assets/lab/structure/ornek/ornek-mescere.csv'), 'utf8');
const { ds } = tableToDataset(tableFromText(csv, { delim: ',' }), { plot: 0, tree: 1, species: 2, dbh: 3, height: 4, x: 5, y: 6, area: 7 }, { decimal: '.', dbhUnit: 'cm', hUnit: 'm', areaUnit: 'm2' }, parseNumber, toInternal);
const E = RUN.analyse(ds, { structure: {}, spatial: { k: 4, edge: 'none', buffer: 5 }, geometry: { shape: 'circle-area', cx: 0, cy: 0 }, competition: { mode: 'knn', k: 4, edge: 'none', buffer: 5 } });

// 0. listed in the sidebar and the index under its module; the catalogue ids it covers in the header
await page.goto(BASE + '/?lang=tr');
ok((await page.locator('#side a[href="mescere-yapisi.php"]').count()) === 1 && (await page.locator('#side .b-group[data-mod="SS"] a[href="mescere-yapisi.php"]').count()) === 1, 'sidebar: Meşcere Yapısı under "Meşcere yapısı ve sıklığı"');
await page.goto(URL + '?lang=tr');
ok((await page.locator('h1').textContent()).includes('Meşcere Yapısı') && (await page.locator('.b-ids').textContent()).trim() === 'SS-02 · SS-04 · SS-05 · SS-06 · SS-07' && (await page.locator('.b-ver').textContent()).includes('1.0.0-beta.1'), 'page title, tool ids SS-02, SS-04…SS-07, version 1.0.0-beta.1');

// 1. sample data
await page.click('#sample'); await page.waitForSelector('#dsinfo');
ok((await page.textContent('#dsinfo')).includes('158 ağaç, 3 örnek alan, koordinatlı') && (await page.locator('.fname', { hasText: 'benzetim' }).count()) === 1, 'sample: simulated, 158 trees, 3 plots, coordinates found');
await page.click('#to2'); await page.waitForSelector('#geocard');
ok((await page.isChecked('input[name="gshape"][value="circle-area"]')) && (await page.isChecked('input[name="gedge"][value="none"]')) && (await page.inputValue('[data-set="sdiBeta"]')) === '1.605', 'defaults: circle from the plot area, no edge correction, β = 1.605');
await shot('settings');
await page.click('#calc'); await page.waitForSelector('#utab');

// 2. the plots table = engine
{ const th = await page.evaluate(() => [...document.querySelectorAll('#utab thead th')].map(x => x.textContent.trim())), rr = await rows('utab'), col = h => th.indexOf(h);
  ok(rr.length === 3, 'one row per plot');
  const checks = [['N/ha', u => u.st.Nha], ['G (m²/ha)', u => u.st.Gha], ['Dq (cm)', u => u.st.Dq], ['H0 (m)', u => u.st.H0], ['ÇK', u => u.st.measures.cv], ['Gini', u => u.st.measures.gini], ['Shannon (çap)', u => u.st.measures.shannonD], ['Simpson (1 − Σp²)', u => u.st.measures.simpson],
    ['SDI', u => u.st.measures.sdi], ['Curtis RD', u => u.st.measures.rd], ['Clark–Evans R', u => u.sp.ce.R], ['R (Donnelly)', u => u.sp.ce.RD], ['W', u => u.sp.means.W], ['M', u => u.sp.means.M], ['T', u => u.sp.means.T]];
  for (const [h, g] of checks) ok(col(h) > 0 && E.units.every((u, i) => close(num(rr[i][col(h)]), g(u))), `${h} = engine (${E.units.map(g).map(v => v.toFixed(4)).join(', ')})`);
  await page.check('#allcols'); const th2 = await page.evaluate(() => [...document.querySelectorAll('#utab thead th')].map(x => x.textContent.trim()));
  ok(['Çarpıklık', 'Basıklık (fazlalık)', 'Shannon (tür)', 'Göreli aralık S%', 'U', 'Hegyi (ort.)'].every(h => th2.includes(h)), 'all columns: skewness, kurtosis, species Shannon, relative spacing, U, mean Hegyi'); }
await shot('units');

// 3. details: tiles, histogram, Lorenz curve, stem map, notes, tree table with BAL and Hegyi
await page.click('#tab-detail'); await page.waitForSelector('#ch-hist');
ok((await page.locator('#ch-hist svg').count()) === 1 && (await page.locator('#ch-lorenz svg').count()) === 1 && (await page.locator('#ch-map svg circle').count()) > 80, 'histogram, Lorenz curve and stem map drawn');
{ await page.locator('#ttab').evaluate(t => t.closest('details').open = true); const tr = await rows('ttab'), u = E.units[0];
  ok(tr.length === u.n && tr.every((r, i) => close(num(r[4]), u.st.trees[i].bal) && close(num(r[6]), u.ci.trees[i].hegyi)), 'tree table: BAL and Hegyi = engine for every tree');
  ok(tr.filter(r => r[7] !== '').length === u.ci.trees.filter(t => t.edge).length, 'edge trees marked (no correction chosen)'); }
await page.click('.unav [data-u="3|"]'); await page.waitForFunction(() => document.querySelector('.tiles b').textContent === '30');
ok(true, 'unit list: plot 3 opened from the list');
await shot('detail');

// 4. settings change the result: buffer and radius
await page.click('#steps [data-go="2"]'); await page.check('input[name="gedge"][value="buffer"]'); await page.check('input[name="gci"][value="radius"]');
ok(await page.isDisabled('#calc') === false, 'radius mode offered'); await page.fill('[data-set="g.radius"]', '6'); await page.locator('[data-set="g.radius"]').dispatchEvent('change');
await page.click('#calc'); await page.waitForSelector('#utab'); await page.click('#tab-detail'); await page.waitForSelector('#ttab', { state: 'attached' });
{ const E2 = RUN.analyse(ds, { structure: {}, spatial: { k: 4, edge: 'buffer', buffer: 5 }, geometry: { shape: 'circle-area', cx: 0, cy: 0 }, competition: { mode: 'radius', radius: 6, edge: 'buffer', buffer: 5 } });
  const u = E2.units.find(x => x.plot_id === '3'), tr = await rows('ttab');
  ok(tr.every((r, i) => u.ci.trees[i].hegyi === null ? r[6] === '–' : close(num(r[6]), u.ci.trees[i].hegyi)), 'buffer 5 m, radius 6 m: Hegyi = engine, "–" in the buffer'); }

// 5. downloads
await page.click('#tab-export');
{ const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#x-xlsx')]), wb = XLSX.read(await readFile(await dl.path()));
  ok(wb.SheetNames.join() === 'Bilgi,Ornek alanlar,Agaclar,Siniflar,Turler', 'Excel sheets: ' + wb.SheetNames.join());
  const tr = XLSX.utils.sheet_to_json(wb.Sheets.Agaclar, { header: 1 });
  ok(tr[0].slice(0, 8).join() === 'alan,agac,tur,cap,boy,x,y,alan_buyuklugu' && tr[0].includes('BAL_m2_ha') && tr[0].includes('hegyi') && tr.length === 159 && tr[1][3] === '23.4' && typeof tr[1][tr[0].indexOf('BAL_m2_ha')] === 'number', 'tree sheet: the source rows exactly as read, competition columns appended as numbers');
  const info = XLSX.utils.sheet_to_json(wb.Sheets.Bilgi, { header: 1 }); ok(info.some(r => String(r[1]).includes('"edge":"buffer"')) && info.some(r => r[0] === 'Araç' && r[1] === 'mescere-yapisi 1.0.0-beta.1'), 'Info: tool and version, settings with the edge handling'); }

// 6. data without coordinates: spatial part "–", the reason given
{ const q = await ctx.newPage(); q.on('pageerror', e => errors.push(e.message));
  await q.goto(URL + '?lang=tr'); await q.click('#steps [data-go="1"]'); await q.click('#reset'); await q.locator('#tblbox details summary').click();
  await q.fill('#tblbox textarea', ['alan\tcap\talan_buyuklugu', ...ds.trees.filter(t => t.plot_id === '2').map(t => `2\t${t.dbh}\t500`)].join('\n')); await q.click('#tblbox [data-act="paste"]');
  await q.waitForSelector('#usetbl'); await q.click('#usetbl'); await q.waitForSelector('#dsinfo'); await q.click('#to2');
  ok((await q.locator('#geocard', { hasText: 'koordinat yok' }).count()) === 1, 'no coordinates: the spatial settings say so');
  await q.click('#calc'); await q.waitForSelector('#utab'); await q.check('#allcols');
  const th = await q.evaluate(() => [...document.querySelectorAll('#utab thead th')].map(x => x.textContent.trim())), r = (await q.evaluate(() => [...document.querySelector('#utab tbody tr').children].map(x => x.textContent.trim())));
  ok(r[th.indexOf('Clark–Evans R')] === '–' && r[th.indexOf('Hegyi (ort.)')] === '–' && num(r[th.indexOf('Gini')]) > 0, 'spatial values "–", not zero; structure computed');
  await q.close(); }

// 7. English, phone + dark
const en = await ctx.newPage(); en.on('pageerror', e => errors.push(e.message)); await en.goto(URL + '?lang=en'); await en.click('#steps [data-go="1"]'); await en.click('#sample'); await en.waitForSelector('#dsinfo'); await en.click('#to2'); await en.click('#calc'); await en.waitForSelector('#utab');
ok((await en.locator('#utab thead th', { hasText: 'Clark–Evans R' }).count()) === 1 && (await en.locator('h1').textContent()).includes('Stand Structure'), 'English');
const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' }); phone.on('pageerror', e => errors.push(e.message));
await phone.goto(URL + '?lang=tr'); await phone.click('#sample'); await phone.waitForSelector('#dsinfo'); await phone.click('#to2'); await phone.click('#calc'); await phone.waitForSelector('#utab');
await phone.click('#tab-detail'); await phone.waitForSelector('#ch-map');
ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no horizontal page scroll'); await shot('phone', phone);
ok(errors.length === 0, 'no console errors: ' + errors.join(' | '));
await browser.close();
console.log(`structure e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
