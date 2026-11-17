// Browser test for the additive component system (BC-02/a1) in Biomass and Carbon: sample tree table of
// tests/ref/biomass_bc02s.json (random test numbers), fitted on the page, compared with sur.js in Node, saved to the
// coefficient library and applied: the separate total equation then differs from the component sum by 0 %.
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/biomass/e2e_bc02s.mjs http://127.0.0.1:8092 [shots-dir]
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const SUR = await import('../../assets/lab/biomass/sur.js');
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null, URL = BASE + '/biyokutle-karbon.php?lang=tr';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async n => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
const REF = JSON.parse(await readFile(path.join(ROOT, 'tests/ref/biomass_bc02s.json'), 'utf8'));
const tmp = await mkdtemp(path.join(os.tmpdir(), 'bc02s-'));
// felled sample: the reference trees; inventory: the same trees as a plot table
const sample = ['agac,cap,boy,govde,kabuk,dal', ...REF.trees.map(t => [t.row - 1, t.D, t.H ?? '', t.y.wood, t.y.bark, t.y.br].join(','))].join('\n');
const inv = ['alan,agac,tur,cap,boy,alan_buyuklugu', ...REF.trees.filter(t => t.H).map((t, i) => [i < 15 ? 1 : 2, t.row - 1, 'X', t.D, t.H, 400].join(','))].join('\n');
const fs = path.join(tmp, 'kesim.csv'), fi = path.join(tmp, 'envanter.csv'); await writeFile(fs, sample); await writeFile(fi, inv);
const spec = { comps: [{ key: 'c0', label: 'govde', terms: ['d2h'], weight: { kind: 'power', v: 'd2h', k: null } }, { key: 'c1', label: 'kabuk', terms: ['d2'], weight: { kind: 'none' } }, { key: 'c2', label: 'dal', terms: ['d2h', 'h'], weight: { kind: 'none' } }],
  total: { from: 'sum', weight: { kind: 'power', v: 'd2h', k: 1.8 } } };
const ENG = SUR.fitAdditive(REF.trees.map(t => ({ row: t.row, D: t.D, H: t.H, y: { c0: t.y.wood, c1: t.y.bark, c2: t.y.br }, total: null })), spec);

await page.goto(URL); await page.waitForSelector('#tblbox input[type="file"]', { state: 'attached' });
await page.setInputFiles('#tblbox input[type="file"]', fi); await page.waitForSelector('#usetbl'); await page.click('#usetbl'); await page.waitForSelector('#dsinfo');
await page.click('#to2'); await page.waitForSelector('#syscard');
await page.locator('#syscard > summary').click(); await page.setInputFiles('#sysimp input[type="file"]', fs); await page.waitForSelector('#systab');
ok(await page.inputValue('[data-sc="D"]') === '1' && await page.inputValue('[data-sc="H"]') === '2', 'diameter and height columns recognised');
const sel = async (s, v) => { await page.selectOption(s, v); await page.waitForSelector('#systab'); };
await sel('[data-cc="0"]', '3'); await sel('[data-cc="1"]', '4');
await page.click('#sy-add'); await page.waitForSelector('[data-cc="2"]'); await sel('[data-cc="2"]', '5');
ok(await page.inputValue('[data-cl2="0"]') === 'govde' && await page.inputValue('[data-cl2="2"]') === 'dal', 'component names taken from the column headers');
// terms: bark D² instead of D²H; branches D²H + H
await page.check('[data-ct="1"][value="d2"]'); await page.waitForSelector('#systab'); await page.uncheck('[data-ct="1"][value="d2h"]'); await page.waitForSelector('#systab');
await page.check('[data-ct="2"][value="h"]'); await page.waitForSelector('#systab');
await sel('[data-sw="0"]', 'd2h'); await sel('[data-sw="total"]', 'd2h');
await page.fill('[data-sk="total"]', '1.8'); await page.locator('[data-sk="total"]').dispatchEvent('change'); await page.waitForSelector('#systab');
await page.click('#sy-fit'); await page.waitForSelector('#sy-coef');
ok((await page.textContent('#sy-sum')).includes(`${ENG.n} ağaç, 4 denklem, 4 toplamsallık kısıtı`) && (await page.textContent('#sy-drop')).includes('satırlar 7'), 'summary, tree without height left out with its row');
const shown = (await page.locator('#sy-coef [data-k="b"]').allTextContents()).map(s => +s.replace(/\s/g, '')), want = ENG.equations.flatMap(e => e.sur.b);
ok(shown.length === want.length && shown.every((v, k) => Math.abs(v - want[k]) <= 5e-6 * Math.max(1, Math.abs(want[k]))), 'restricted SUR coefficients on screen = sur.js: ' + shown.join(' '));
ok((await page.textContent('#sy-stat')).includes('kestirildi') && (await page.textContent('#sy-stat')).includes('^1,8') || (await page.textContent('#sy-stat')).includes('^1.8'), 'weights: estimated and given exponents shown');
await shot('bc02s-1-sistem');
// save without a source: refused; with a source: 4 sets
await page.click('#sy-save'); await page.waitForSelector('#sy-msg .err');
await page.fill('#sy-cit', 'e2e kesim verisi'); await page.locator('#sy-cit').dispatchEvent('change'); await page.fill('#sy-sp', 'X'); await page.locator('#sy-sp').dispatchEvent('change');
await page.click('#sy-save'); await page.waitForSelector('#sy-ok');
const stored = await page.evaluate(async () => { const C = await import('/assets/lab/core/coef.js'); await import('/assets/lab/biomass/calc.js'); return (await C.listCoefs('biomass')).map(s => ({ id: s.id, form: s.form, component: s.component, origin: s.origin, cov: s.meta && s.meta.cov, rse: s.meta && s.meta.rse, valid: s.valid, b0: s.params.b0 })); });
ok(stored.length === 4 && stored.every(s => s.origin === 'fitted' && s.cov && s.valid && s.valid.D) && stored.filter(s => s.rse > 0).length === 2, 'four fitted sets with covariance; residual standard error only for the unweighted equations');
ok(stored.some(s => s.form === 'biomass.lt.d2h.h' && s.component === 'dal') && stored.some(s => s.form === 'biomass.lt.d2.d2h.h' && s.component === 'Toplam ağaç'), 'linear forms in the library: branches D²H + H, total D² + D²H + H');
// apply: three components mapped to the fitted sets, the total as separate total equation → additivity difference 0
const byComp = Object.fromEntries(stored.map(s => [s.component, s.id]));
await page.fill('[data-cf="0"]', '0.5'); await page.locator('[data-cf="0"]').dispatchEvent('change'); await page.waitForSelector('#maptab');
for (const i of [1, 2]) { await page.click('#cadd'); await page.waitForSelector(`[data-cf="${i}"]`); await page.fill(`[data-cf="${i}"]`, '0.5'); await page.locator(`[data-cf="${i}"]`).dispatchEvent('change'); await page.waitForSelector('#maptab'); }
const keys = await page.$$eval('#maptab thead th', ths => ths.length);
const comps = await page.$$eval('select[data-ms="X"]', s => s.map(x => x.dataset.mc));
await page.selectOption(`select[data-ms="X"][data-mc="${comps[0]}"]`, byComp.govde); await page.selectOption(`select[data-ms="X"][data-mc="${comps[1]}"]`, byComp.kabuk); await page.selectOption(`select[data-ms="X"][data-mc="${comps[2]}"]`, byComp.dal);
await page.selectOption('select[data-ts="X"]', byComp['Toplam ağaç']);
await page.waitForSelector('#calc:not([disabled])'); await page.click('#calc'); await page.waitForSelector('#addnote');
ok(/: -?0([.,]0+)? %/.test(await page.textContent('#addnote')), 'applied: total equation − component sum = 0 % (additive by construction): ' + await page.textContent('#addnote'));
await page.goto(BASE + '/biyokutle-karbon.php?lang=en'); await page.waitForSelector('#steps'); await page.click('[data-go="2"]'); await page.waitForSelector('#syscard');
ok((await page.textContent('#syscard > summary')).includes('additive component system'), 'English');
ok(errors.length === 0, 'no page errors: ' + errors.join(' | '));
await browser.close();
console.log(`BC-02 e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
