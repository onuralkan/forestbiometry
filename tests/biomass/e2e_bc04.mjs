// Browser test for the Monte Carlo uncertainty of Biomass and Carbon (TOOLS_SPEC BC04). Tree table and coefficient sets
// of tests/ref/biomass_bc04.json (random test numbers, no species' values); the sets carry a coefficient covariance
// and/or a residual standard error in their tool fields. Values on screen are compared with mc.js run in Node on the
// same data (tests/biomass/test_bc04.mjs checks mc.js against Python and closed forms).
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/biomass/e2e_bc04.mjs http://127.0.0.1:8092 [shots-dir]
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
const M = await import('../../assets/lab/biomass/mc.js');
const { blankSet } = await import('../../assets/lab/core/coef.js');
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null, URL = BASE + '/biyokutle-karbon.php?lang=tr';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async n => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
const dl = async sel => { const [d] = await Promise.all([page.waitForEvent('download'), page.click(sel)]); return d; };
const n = s => s.trim() === '–' ? null : +s.trim();

const REF = JSON.parse(await readFile(path.join(ROOT, 'tests/ref/biomass_bc04.json'), 'utf8'));
const tmp = await mkdtemp(path.join(os.tmpdir(), 'bc04-'));
const area = Object.fromEntries(REF.plots.map(p => [p.plot_id, p.plot_area]));
const csv = ['alan,agac,tur,cap,boy,alan_buyuklugu', ...REF.trees.map(t => [t.plot_id, t.tree_id, t.species, t.dbh, t.height, area[t.plot_id]].join(','))].join('\n');
const file = path.join(tmp, 'agaclar.csv'); await writeFile(file, csv);
const mk = (id, s) => ({ ...blankSet('biomass.' + s.form), id, params: s.params, source: { citation: 'e2e test values ' + id }, origin: 'user-entered', created: '2026-11-17T00:00:00Z', modified: '2026-11-17T00:00:00Z',
  transform: Bm.FORMS[s.form].scale === 'none' ? null : { kind: Bm.FORMS[s.form].scale, correction: s.corr ? 'user' : 'none', ...(s.corr ? { value: s.corr } : {}) },
  meta: { ...(s.cov ? { cov: s.cov.map(r => r.join(' ')).join('; ') } : {}), ...(s.rse != null ? { rse: s.rse } : {}) } });
const SETS = Object.entries(REF.sets).map(([id, s]) => mk(id, s));

// Node engine on the same data (rows as the page numbers them: header = row 1)
const ds = { schema: 'forest-dataset/1', plots: REF.plots.map(p => ({ ...p, stratum: null, area_source: 'trees', n_records: 6 })), trees: REF.trees.map((t, i) => ({ ...t, row: i + 2, extra: {} })) };
const cfg = { components: REF.comps.map(([key, CF], i) => ({ key: 'c' + (i + 1), CF })), map: Object.fromEntries(Object.entries(REF.mapping).map(([sp, m]) => [sp, { c1: m.c1, c2: m.c2 }])), emptyCombos: 'unmeasured' };
const setMap = new Map(SETS.map(s => [s.id, s])), allo = Bm.computeAllometric(ds, cfg, setMap), ENG = M.monteCarlo(ds, cfg, setMap, allo, { B: 500, seed: 99, level: 0.9 });

await page.goto(URL); await page.waitForSelector('#steps');
await page.evaluate(async sets => { const C = await import('/assets/lab/core/coef.js'); await import('/assets/lab/biomass/calc.js'); for (const s of sets) { const r = await C.saveCoef(s, s.modified); if (!r.ok) throw new Error(JSON.stringify(r.problems)); } }, SETS);
await page.reload(); await page.waitForSelector('#tblbox input[type="file"]');
await page.setInputFiles('#tblbox input[type="file"]', file); await page.waitForSelector('#usetbl');
await page.click('#usetbl'); await page.waitForSelector('#dsinfo'); await page.click('#to2'); await page.waitForSelector('#maptab');
// the coefficient editor offers the two uncertainty fields
await page.locator('#coefbox [data-act="edit"]').first().click(); await page.waitForSelector('#cf-x-cov');
ok(await page.locator('#cf-x-rse').count() === 1 && (await page.locator('#coefbox').textContent()).includes('Artık standart hatası'), 'the set editor has the covariance and residual standard error fields');
await page.click('#cf-cancel');
await page.fill('[data-cf="0"]', String(REF.comps[0][1])); await page.locator('[data-cf="0"]').dispatchEvent('change'); await page.waitForSelector('#maptab');
await page.click('#cadd'); await page.waitForSelector('[data-cf="1"]');
await page.fill('[data-cf="1"]', String(REF.comps[1][1])); await page.locator('[data-cf="1"]').dispatchEvent('change'); await page.waitForSelector('#maptab');
for (const [sp, m] of Object.entries(REF.mapping)) { await page.selectOption(`select[data-ms="${sp}"][data-mc="c1"]`, m.c1); await page.selectOption(`select[data-ms="${sp}"][data-mc="c2"]`, m.c2); }
await page.waitForSelector('#calc:not([disabled])'); await page.click('#calc'); await page.waitForSelector('#mccard');

// run: 500 replicates, seed 99, 90 %
ok(await page.inputValue('#mc-B') === '1000' && await page.inputValue('#mc-seed') === '20261117', 'defaults: 1000 replicates, fixed seed');
await page.fill('#mc-B', '500'); await page.fill('#mc-seed', '99'); await page.selectOption('#mc-level', '0.9');
await page.click('#mc-run'); await page.waitForSelector('#mctab');
for (const u of ENG.units) {
  const row = page.locator(`#mctab tr[data-u="${u.plot_id}|"]`), cells = (await row.locator('td.num').allTextContents()).map(n);
  ok(Math.abs(cells[1] - u.B.mean) < 5e-4 && Math.abs(cells[4] - u.B.lo) < 5e-4 && Math.abs(cells[5] - u.B.hi) < 5e-4 && Math.abs(cells[7] - u.CO2.mean) < 5e-4, `plot ${u.plot_id}: mean and 90 % limits as mc.js (${u.B.lo.toFixed(3)}–${u.B.hi.toFixed(3)} Mg/ha)`);
}
ok((await page.textContent('#mcset')).includes('500 tekrar, tohum 99, %90'), 'replicates, seed and level written');
ok((await page.textContent('#mcparts li[data-set="sA"]')).includes('katsayı kovaryansı + artık') && (await page.textContent('#mcparts li[data-set="sB"]')).includes('katsayı kovaryansı') && (await page.textContent('#mcparts li[data-set="sD"]')).includes('bilgi yok'), 'what each set contributes is labelled');
ok((await page.textContent('#mcfixed')).includes('1 sette') && (await page.textContent('#mcassume')).includes('bağımsızlık'), 'set without information held fixed, assumptions written');
await shot('bc04-1-belirsizlik');
const xd = await dl('#x-xlsx'), wb = XLSX.read(await readFile(await xd.path()));
const mu = XLSX.utils.sheet_to_json(wb.Sheets['Belirsizlik birimler'], { header: 1 }), mt = XLSX.utils.sheet_to_json(wb.Sheets['Belirsizlik ağaçlar'], { header: 1 });
ok(mu.length > 3 && Math.abs(mu[1][4] - ENG.units[0].B.mean) < 1e-9 && mt.length === REF.trees.length + 1 && Math.abs(mt[1][5] - ENG.trees[0].B.mean) < 1e-9, 'Excel: unit and tree uncertainty sheets with the engine values');
const jd = await dl('#x-json'), rec = JSON.parse(await readFile(await jd.path(), 'utf8'));
ok(rec.uncertainty && rec.uncertainty.seed === 99 && rec.uncertainty.B === 500 && rec.uncertainty.assumptions.length === 5 && rec.tool.ids.includes('BC-06'), 'run record: uncertainty with seed, replicates, assumptions; catalogue id BC-06');

// no information
await page.evaluate(async sets => { const C = await import('/assets/lab/core/coef.js'); await import('/assets/lab/biomass/calc.js'); for (const s of sets) { const r = await C.saveCoef({ ...s, meta: {} }); if (!r.ok) throw new Error(JSON.stringify(r.problems)); } }, SETS);
await page.reload(); await page.waitForSelector('#steps'); await page.click('[data-go="2"]'); await page.waitForSelector('#calc'); await page.click('#calc'); await page.waitForSelector('#mc-run');
await page.click('#mc-run'); await page.waitForSelector('#mcnoinfo');
ok((await page.textContent('#mcnoinfo')).includes('Belirsizlik bilgisi yok') && await page.locator('#mctab').count() === 0, 'no covariance and no residual: "no uncertainty information", nothing computed');
// a bad covariance is refused with the set named
await page.evaluate(async s => { const C = await import('/assets/lab/core/coef.js'); await import('/assets/lab/biomass/calc.js'); const r = await C.saveCoef({ ...s, meta: { cov: '4 1; 2 4' } }); if (!r.ok) throw new Error(JSON.stringify(r.problems)); }, SETS.find(s => s.id === 'sB'));
await page.reload(); await page.waitForSelector('#steps'); await page.click('[data-go="2"]'); await page.waitForSelector('#calc'); await page.click('#calc'); await page.waitForSelector('#mc-run');
await page.click('#mc-run'); await page.waitForSelector('#mcbad');
ok((await page.textContent('#mcbad')).includes('simetrik değil') && (await page.textContent('#mcbad')).includes('e2e test values sB'), 'asymmetric covariance refused, set named');
// volume approach: no information
await page.click('#back2'); await page.check('input[name="appr"][value="volume"]'); await page.waitForSelector('#vcol');
// English
await page.goto(BASE + '/biyokutle-karbon.php?lang=en'); await page.waitForSelector('#steps');
const phone = await ctx.newPage(); await phone.setViewportSize({ width: 390, height: 800 }); await phone.goto(URL); await phone.waitForSelector('#steps');
{ const w = await phone.evaluate(() => { const W = innerWidth; return [document.documentElement.scrollWidth, W, [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > W + 1).slice(0, 6).map(e => e.tagName + '#' + e.id + '.' + e.className).join(' ')]; }); ok(w[0] <= w[1] + 1, 'phone: no horizontal page scroll ' + JSON.stringify(w)); }
ok(errors.length === 0, 'no page errors: ' + errors.join(' | '));
await browser.close();
console.log(`BC04 e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
