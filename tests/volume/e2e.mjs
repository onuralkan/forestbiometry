// Browser test for Volume Equations (hacim-denklemleri.php; SV-04). The simulated sample table of the page; values on
// screen are compared with calc.js run in Node on the same rows (tests/volume/test_sv04.mjs checks calc.js against
// Python). Also: saving a set, the hand-off to Model Evaluation, the volumes sent by Stem Section Volume, English, phone.
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/volume/e2e.mjs http://127.0.0.1:8092 [shots-dir]
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const XLSX = require(path.join(ROOT, 'assets/vendor/sheetjs/xlsx.mini.min.js'));
const VOL = await import('../../assets/lab/volume/calc.js');
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null, URL = BASE + '/hacim-denklemleri.php';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async n => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
const dl = async sel => { const [d] = await Promise.all([page.waitForEvent('download'), page.click(sel)]); return d; };
const n = s => Number(String(s).trim().replace(/\s/g, '').replace(',', '.'));

// the sample in Node (rows numbered as the importer does: header = row 1)
const csv = (await readFile(path.join(ROOT, 'assets/lab/volume/ornek/ornek-hacim.csv'), 'utf8')).trim().split('\n').slice(1);
const trees = csv.map((l, i) => { const [id, D, H, V] = l.split(',').map(Number); return { row: i + 2, id: String(id), D, H, V }; });

await page.goto(URL + '?lang=en'); await page.waitForSelector('#steps');
ok((await page.locator('h1').textContent()).includes('Volume Equations') && (await page.locator('.b-head').getAttribute('data-ids')) === 'SV-04' && (await page.locator('.b-ver').textContent()).includes(VOL.TOOL.version), 'title, catalogue id SV-04, version');
ok(await page.locator('#side a[href="hacim-denklemleri.php"]').count() === 1, 'listed in the sidebar');
await page.click('#sample'); await page.waitForSelector('#dsinfo');
ok((await page.textContent('#dsinfo')).includes(`${trees.length} trees`), `sample: ${trees.length} trees`);
await page.click('#to2'); await page.waitForSelector('#ftab');
ok(await page.isChecked('[data-form="cv"]') && await page.isChecked('[data-form="ln"]') && !(await page.isChecked('[data-form="cf"]')), 'defaults: combined variable and logarithmic forms');
await page.check('[data-form="cf"]'); await page.waitForSelector('#ftab'); await page.check('[data-form="loc"]'); await page.waitForSelector('#ftab');
await page.check('[data-won="cv"]'); await page.waitForSelector('[data-wk="cv"]');
await page.fill('[data-wk="cv"]', 'x'); await page.locator('[data-wk="cv"]').dispatchEvent('change'); await page.waitForSelector('#s2prob');
ok(await page.isDisabled('#calc'), 'a non-numeric k is refused');
await page.fill('[data-wk="cv"]', ''); await page.locator('[data-wk="cv"]').dispatchEvent('change'); await page.waitForSelector('#calc:not([disabled])');
await page.click('#calc'); await page.waitForSelector('#cmptab');
const E = { cf: VOL.fitForm('cf', trees), cv: VOL.fitForm('cv', trees, { weight: { kind: 'power', k: null } }), ln: VOL.fitForm('ln', trees, { correction: 'baskerville' }), loc: VOL.fitForm('loc', trees) };
for (const [id, e] of Object.entries(E)) {
  const row = page.locator(`#cmptab tr[data-form="${id}"]`), rmse = n(await row.locator('[data-k="rmse"]').textContent()), r2 = n(await row.locator('[data-k="r2"]').textContent());
  const c0 = n(await page.locator(`[data-coef="${id}"] [data-k="c0"]`).textContent());
  ok(Math.abs(rmse - e.metrics.rmse) < 5e-6 && Math.abs(r2 - e.metrics.r2) < 5e-5 && Math.abs(c0 - e.coef[0]) <= 1e-7 * Math.abs(e.coef[0]), `${id}: RMSE ${rmse}, R² ${r2}, first coefficient ${c0} = engine`);
}
ok((await page.locator('#cmptab tr[data-form="cv"]').textContent()).includes('estimated') && (await page.locator('#cmptab tr[data-form="ln"]').textContent()).includes('Baskerville'), 'weight (estimated k) and Baskerville correction written');
ok(await page.locator('[data-fit] .chartbox svg').count() === 8, 'observed–predicted and residual charts for each form');
await shot('volume-1-results');
// downloads
const x = await dl('#x-xlsx'), wb = XLSX.read(await readFile(await x.path()));
const tr = XLSX.utils.sheet_to_json(wb.Sheets['Trees'], { header: 1 }), j = tr[0].indexOf('V_ln_m3');
ok(['Info', 'Comparison', 'Coefficients', 'Trees'].every(s => wb.SheetNames.includes(s)) && tr.length === trees.length + 1 && Math.abs(tr[1][j] - E.ln.pred[0]) < 1e-12, 'Excel: four sheets, predictions at full precision');
const jd = await dl('#x-json'), rec = JSON.parse(await readFile(await jd.path(), 'utf8'));
ok(rec.format === 'run-record/1' && rec.tool.ids.includes('SV-04') && rec.fits.length === 4 && rec.inputs[0].kind === 'file', 'run record: catalogue id, four fits, input fingerprint');
{ const rd = await dl('#x-r'), rs = await readFile(await rd.path(), 'utf8');
  ok(rd.suggestedFilename().endsWith('.R') && rs.includes('data_file <- "ornek-hacim.csv"') && rs.includes('lm(log(V) ~ log(D) + log(H), data = d, weights = w)') && rs.includes('exp(s^2 / 2)') && rs.includes('fb_out(res)'),
    'R code: a .R file reading the user\'s file, the forms as lm, the Baskerville correction (its numbers are checked in R by scripts/rcode-check.sh)'); }
// save a set
await page.selectOption('#sv-form', 'ln'); await page.click('#sv-save'); await page.waitForSelector('#sv-msg .err');
await page.fill('#sv-cit', 'e2e simulated example'); await page.locator('#sv-cit').dispatchEvent('change'); await page.click('#sv-save'); await page.waitForSelector('#sv-ok');
const sets = await page.evaluate(async () => { const C = await import('/assets/lab/core/coef.js'); await import('/assets/lab/volume/calc.js'); return C.listCoefs('volume'); });
ok(sets.length === 1 && sets[0].form === 'volume.ln' && sets[0].origin === 'fitted' && sets[0].transform.correction === 'baskerville' && Math.abs(sets[0].transform.value - E.ln.s) < 1e-15 && sets[0].valid.D && sets[0].valid.H, 'set saved: log form, Baskerville SEE, validity range');
ok(Math.abs(VOL.predict(sets[0], trees[0].D, trees[0].H) - E.ln.pred[0]) < 1e-12, 'the saved set predicts the fitted volume');
// hand-off to Model Evaluation
await page.click('#ev-send'); await page.waitForURL(/model-degerlendirme/); await page.waitForSelector('#obs');
ok((await page.textContent('#status')).includes('handed over by another tool') && (await page.locator('#obs option:checked').textContent()).trim() === 'V_obs_m3', 'Model Evaluation opens with the handed-over table and the observed column chosen');
await shot('volume-2-eval');
// the volumes sent by Stem Section Volume (a package and a stem-volume record written into the store)
await page.goto(URL + '?lang=en'); await page.waitForSelector('#steps');
await page.evaluate(async T => {
  const S = await import('/assets/lab/core/store.js'), R = await import('/assets/lab/core/record.js'), D = await import('/assets/lab/core/derived.js');
  const ds = { schema: 'forest-dataset/1', trees: T.map(t => ({ row: t.row, plot_id: '1', tree_id: t.id, period: null, species: 'X', dbh: t.D, height: t.H, extra: {} })), plots: [{ plot_id: '1', plot_area: 400 }] };
  await S.put('dataset:approved', ds); const sha = await R.sha256JSON(ds);
  await S.put(D.storeKey(D.KIND_VOLUME, sha), { schema: 'forest-derived/1', kind: 'stem-volume', created: '2026-11-17T00:00:00Z', tool: { id: 'seksiyon-hacmi', version: 'x' }, dataset: { schema: 'forest-dataset/1', sha256: sha, trees: T.length }, units: { volume: 'm3' }, settings: { method: 'smalian' },
    trees: T.map(t => ({ row: t.row, plot_id: '1', tree_id: t.id, period: null, status: 'ok', v_ob: t.V, v_ib: t.V * 0.9 })), unmatched: [], ambiguous: [] });
}, trees);
await page.reload(); await page.waitForSelector('#steps'); await page.click('#steps [data-go="1"]'); await page.waitForSelector('#svinfo');
await page.selectOption('#svside', 'ib'); await page.click('#svuse'); await page.waitForSelector('#dsinfo');
ok((await page.textContent('#dsinfo')).includes('under bark') && (await page.textContent('#dsinfo')).includes(`${trees.length} trees`), 'sent volumes used: under bark, every tree');
await page.click('#to2'); await page.click('#calc'); await page.waitForSelector('#cmptab');
{ const e = VOL.fitForm('cv', trees.map(t => ({ ...t, V: t.V * 0.9 })), { weight: { kind: 'power', k: null } }); ok(Math.abs(n(await page.locator('#cmptab tr[data-form="cv"] [data-k="rmse"]').textContent()) - e.metrics.rmse) < 5e-6, 'fit on the sent under-bark volumes = engine'); }
{ const got = []; page.on('download', d => got.push(d)); await page.click('#x-r'); await page.waitForFunction(() => true); for (let i = 0; i < 50 && got.length < 2; i++) await page.waitForTimeout(100);
  const csvD = got.find(d => d.suggestedFilename().endsWith('.csv')), rs = got.find(d => d.suggestedFilename().endsWith('.R'));
  const ct = csvD ? (await readFile(await csvD.path(), 'utf8')).trim().split('\n') : [], rt = rs ? await readFile(await rs.path(), 'utf8') : '';
  ok(ct.length === trees.length + 1 && ct[0] === 'row,tree,D_cm,H_m,V_m3' && Math.abs(+ct[1].split(',')[4] - trees[0].V * 0.9) < 1e-15 && rt.includes('data_file <- "volume-trees.csv"') && rt.includes('seksiyon-hacmi'),
    'R code of the sent volumes: the script and the trees as CSV (full precision)'); }
// the old ?lang=tr link redirects to the English page; phone
await page.goto(URL + '?lang=tr'); await page.waitForSelector('#steps');
ok(!page.url().includes('lang=') && (await page.locator('h1').textContent()).includes('Volume Equations'), '?lang=tr redirects to the English page');
const ph = await ctx.newPage(); await ph.setViewportSize({ width: 390, height: 800 }); await ph.goto(URL + '?lang=en'); await ph.waitForSelector('#steps');
ok(await ph.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'phone: no horizontal page scroll');
ok(errors.length === 0, 'no page errors: ' + errors.join(' | '));
await browser.close();
console.log(`SV-04 e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
