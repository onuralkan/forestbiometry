// Browser test for the Stem Section Volume → Biomass & Carbon hand-off (TOOLS_SPEC BC03). An approved package holding the
// trees of the Stem Section Volume sample is put in the page's browser store; the volumes are computed and sent in
// seksiyon-hacmi.php, read in biyokutle-karbon.php, and compared bit for bit with Stem Section Volume's own JSON export.
// Coefficients and factors are arbitrary test numbers (no species' values).
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/biomass/e2e_bc03.mjs http://127.0.0.1:8092 [shots-dir]
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const XLSX = require(path.join(ROOT, 'assets/vendor/sheetjs/xlsx.mini.min.js'));
const V = await import('../../assets/lab/secvol/calc.js');
await import('../../assets/lab/biomass/calc.js');
const { readStems } = await import('../../assets/lab/core/stems.js');
const { tableFromText } = await import('../../assets/lab/core/table.js');
const { blankSet } = await import('../../assets/lab/core/coef.js');
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async n => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
const dl = async sel => { const [d] = await Promise.all([page.waitForEvent('download'), page.click(sel)]); return d; };

// the approved package: one tree per stem tree of the sample, plus one tree without stem measurements
const text = await readFile(path.join(ROOT, 'assets/lab/secvol/ornek/ornek-seksiyon.csv'), 'utf8');
const st = readStems(tableFromText(text, { delim: ';', header: true }), { plot: 0, tree: 1, h: 2, d: 3, bark_t: 4, dbh: 5, height: 6, stump_h: 7 }, { decimal: ',' });
const trees = st.trees.map((T, i) => ({ row: i + 1, plot_id: T.plot_id, tree_id: T.tree_id, stem_id: null, period: null, species: i % 2 ? 'B' : 'A', dbh: T.dbh, height: T.height, status: null, stratum: null, x: null, y: null, extra: {} }));
trees.push({ row: trees.length + 1, plot_id: trees[0].plot_id, tree_id: 'olcusuz', stem_id: null, period: null, species: 'A', dbh: 22, height: 19, status: null, stratum: null, x: null, y: null, extra: {} });
const plots = [...new Set(trees.map(t => t.plot_id))].map(p => ({ plot_id: p, plot_area: 400, stratum: null, area_source: 'plots', n_records: trees.filter(t => t.plot_id === p).length }));
const DS = { schema: 'forest-dataset/1', created: '2026-11-17T00:00:00Z', tool: { id: 'e2e', version: '0' }, units: { dbh: 'cm', height: 'm', plot_area: 'm2', x: 'm', y: 'm' },
  source: { trees: { name: 'e2e-paket', kind: 'csv', meta: {}, records: trees.length }, plots: null, mapping: { trees: {}, plots: {} }, settings: { decimal: '.' }, lang: 'en' },
  plots, trees, derived: { note: '', trees: [], plots: [] }, warnings: [], excluded: [], changelog: [] };
const SET = { ...blankSet('biomass.pow.d'), id: 'e2eS', params: { a: 0.11, b: 2.37 }, transform: null, source: { citation: 'e2e test values S' }, origin: 'user-entered', created: '2026-11-17T00:00:00Z', modified: '2026-11-17T00:00:00Z' };

// 1. Stem Section Volume without the approved data: the hand-off asks for it
await page.goto(BASE + '/biyokutle-karbon.php?lang=en'); await page.waitForSelector('#steps');
await page.evaluate(async ({ ds, set }) => { const S = await import('/assets/lab/core/store.js'), C = await import('/assets/lab/core/coef.js'); await import('/assets/lab/biomass/calc.js'); await S.put('dataset:approved', ds); const r = await C.saveCoef(set, set.modified); if (!r.ok) throw new Error(JSON.stringify(r.problems)); }, { ds: DS, set: SET });
await page.goto(BASE + '/seksiyon-hacmi.php?lang=en'); await page.waitForSelector('#sample');
await page.click('#sample'); await page.waitForSelector('#impbox .fname'); await page.click('#to2'); await page.click('#calc'); await page.waitForSelector('#ttab');
ok(await page.locator('#ho-need').count() === 1 && await page.locator('#ho-send').count() === 0, 'without the linked package the volumes cannot be sent');

// 2. link the package, compute, send
await page.click('#steps [data-go="1"]'); await page.click('#useds'); await page.waitForSelector('#dsinfo');
await page.click('#to2'); await page.click('#calc'); await page.waitForSelector('#ho-send');
await page.click('#ho-send'); await page.waitForFunction(() => (document.getElementById('ho-msg') || {}).textContent?.includes('volumes sent'));
const msg = await page.textContent('#ho-msg');
ok(msg.includes(`${st.trees.length} trees`) && msg.includes('Without a tree in the package: 0'), 'sent: every stem tree matched to the package: ' + msg);
await shot('bc03-1-aktar');
const jd = await dl('#x-json'), svRec = JSON.parse(await readFile(await jd.path(), 'utf8'));
const meth = svRec.settings.reference, svRes = svRec.results[meth];
const stored = await page.evaluate(async () => { const S = await import('/assets/lab/core/store.js'), R = await import('/assets/lab/core/record.js'), ds = await S.get('dataset:approved'), sha = await R.sha256JSON(ds); return { sha, rec: await S.get('derived:stem-volume:' + sha), ds }; });
ok(stored.rec && stored.rec.schema === 'forest-derived/1' && stored.rec.dataset.sha256 === stored.sha && stored.rec.settings.method === meth, 'record stored under the package fingerprint, with the method');
ok(JSON.stringify(stored.ds) === JSON.stringify(DS), 'the approved package in the store is unchanged');
let bits = 0, nb = 0; svRes.forEach(r => { const t = stored.rec.trees.find(x => x.tree_id === r.tree.tree_id && x.plot_id === r.tree.plot_id); const ob = r.status === 'ok' && r.ob && r.ob.status === 'ok' ? r.ob.total : null; if (!t || !Object.is(t.v_ob, ob)) bits++; if (ob != null) nb++; });
ok(bits === 0 && nb > 3, `stored volumes equal Stem Section Volume's own JSON export bit for bit (${nb} trees)`);

// 3. Biomass: both approaches on the package; volumes from the hand-off
await page.goto(BASE + '/biyokutle-karbon.php?lang=en'); await page.waitForSelector('#useapp');
await page.click('#useapp'); await page.waitForSelector('#dsinfo'); await page.click('#to2'); await page.waitForSelector('input[name="appr"]');
await page.check('input[name="appr"][value="both"]'); await page.waitForSelector('input[name="vfrom"]');
await page.check('input[name="vfrom"][value="secvol"]'); await page.waitForSelector('#dvinfo');
ok((await page.textContent('#dvinfo')).includes(`${st.trees.length} trees`) && await page.locator('#vcol').count() === 0, 'the sent volumes are found for this package; no column to choose');
await page.fill('[data-cf="0"]', '0.5'); await page.locator('[data-cf="0"]').dispatchEvent('change'); await page.waitForSelector('#maptab');
await page.selectOption('select[data-all="c1"]', 'e2eS'); await page.waitForSelector('#maptab');
for (const [k, v] of [['D', '0.5'], ['BEF', '1.3'], ['R', '0.25'], ['CF', '0.47']]) { await page.fill(`[data-v="${k}"]`, v); await page.locator(`[data-v="${k}"]`).dispatchEvent('change'); await page.waitForSelector('#dvinfo'); }
await page.fill('#vsrc', 'e2e factors'); await page.locator('#vsrc').dispatchEvent('change'); await page.waitForSelector('#calc:not([disabled])');
await page.selectOption('[data-vs="bark"]', 'ib'); await page.waitForSelector('#s2prob');
ok((await page.textContent('#s2prob')).includes('Bark sides differ'), 'bark sides must match (volumes under bark, factors over bark): refused');
await page.selectOption('[data-vs="bark"]', 'ob'); await page.waitForSelector('#calc:not([disabled])');
await page.click('#calc'); await page.waitForSelector('#cmptab');
const units = plots.length;
ok(await page.locator('#cmptab tr[data-a="allometric"]').count() === units && await page.locator('#cmptab tr[data-a="volume"]').count() === units, 'one row per unit for each approach');
ok(await page.locator('#utab-a').count() === 1 && await page.locator('#utab-v').count() === 1 && (await page.textContent('#vfrom-v')).includes('Stem Section Volume'), 'each approach with its own tables; volume source written');
{ const noV = trees.filter(t => { const x = stored.rec.trees.find(r => r.row === t.row); return !x || x.v_ob == null; }).map(t => t.row);
  ok((await page.textContent('#t-nov-v')) === String(noV.length) && (await page.textContent('#novnote-v')).includes(String(trees.length)), `trees without a sent volume (incl. the unmeasured package tree) counted with rows: ${noV.join(',')}`); }
await shot('bc03-2-ikisi');
const xd = await dl('#x-xlsx'), wb = XLSX.read(await readFile(await xd.path()));
const tv = XLSX.utils.sheet_to_json(wb.Sheets['Trees V'], { header: 1 }), vi = tv[0].indexOf('V (m³)');
let vb = 0; for (const r of tv.slice(1)) { const t = stored.rec.trees.find(x => x.row === r[0]); const want = t ? t.v_ob : null; if (!Object.is(r[vi] ?? null, want)) vb++; }
ok(vb === 0 && tv.length === trees.length + 1, 'Excel: V of every tree equals the sent volume bit for bit');
const cmp = XLSX.utils.sheet_to_json(wb.Sheets['Comparison trees'], { header: 1 });
ok(cmp.length === 2 * trees.length + 1 && cmp[1][0] === cmp[2][0] && cmp[1][6] !== cmp[2][6], 'Excel: comparison sheet with the same tree in two rows, one per approach');
const info = XLSX.utils.sheet_to_json(wb.Sheets['Info'], { header: 1 }).flat().join(' ');
ok(info.includes(stored.sha) && info.includes('e2e test values S') && info.includes('e2e factors'), 'Excel info: package fingerprint, set source, factor source');
const bj = await dl('#x-json'), bRec = JSON.parse(await readFile(await bj.path(), 'utf8'));
ok(bRec.settings.approach === 'both' && bRec.settings.volume.volumeFrom.kind === 'secvol' && bRec.settings.volume.volumeFrom.package === stored.sha && bRec.comparison.length === 2 * units && /^1\.0\.0-beta\.[2-9]$/.test(bRec.tool.version), 'run record: both approaches, volume source with the package fingerprint');

// 4. another package: the old volumes are not used
await page.evaluate(async ds => { const S = await import('/assets/lab/core/store.js'); await S.put('dataset:approved', { ...ds, created: '2026-11-18T00:00:00Z' }); }, DS);
await page.goto(BASE + '/biyokutle-karbon.php?lang=en'); await page.waitForSelector('#steps');
await page.click('[data-go="1"]'); await page.click('#useapp'); await page.waitForSelector('#dsinfo'); await page.click('#to2'); await page.waitForSelector('#dvnone');
ok(await page.isDisabled('#calc') && (await page.textContent('#s2prob')).includes('No volumes sent'), 'a different package (other fingerprint): the earlier volumes are not used');

// 5. English
await page.goto(BASE + '/biyokutle-karbon.php?lang=en'); await page.waitForSelector('#steps'); await page.click('[data-go="2"]'); await page.waitForSelector('input[name="appr"]');
ok((await page.locator('input[name="appr"][value="both"]').locator('..').textContent()).includes('Both'), 'English: the both-approaches option');
await page.goto(BASE + '/seksiyon-hacmi.php?lang=en'); await page.waitForSelector('#steps');
ok(errors.length === 0, 'no page errors: ' + errors.join(' | '));
await browser.close();
console.log(`BC03 e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
