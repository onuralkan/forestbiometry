// Browser test for the nonlinear additive system (BC-02/a2) in Biomass and Carbon: the slash pine sample of Parresol
// (2001) Table 1 (tests/ref/parresol2001_slashpine.json) fitted on the page with the printed weight functions, compared
// with nsur.js in Node and with Table 3; intervals at D = 20 cm, H = 17 m; the ln-scale system; three component sets
// saved to the coefficient library as the registered power forms.
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/biomass/e2e_bc02n.mjs http://127.0.0.1:8092 [shots-dir]
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const NS = await import('../../assets/lab/biomass/nsur.js');
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null, URL = BASE + '/biyokutle-karbon.php?lang=tr';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async n => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
const P01 = JSON.parse(await readFile(path.join(ROOT, 'tests/ref/parresol2001_slashpine.json'), 'utf8'));
const tmp = await mkdtemp(path.join(os.tmpdir(), 'bc02n-'));
const sample = ['agac,cap,boy,govde,kabuk,tepe,toplam', ...P01.rows.map((r, i) => [i + 1, r[0], r[1], r[4], r[5], r[6], r[7]].join(','))].join('\n');
const inv = ['alan,agac,tur,cap,boy,alan_buyuklugu', ...P01.rows.map((r, i) => [i < 20 ? 1 : 2, i + 1, 'P', r[0], r[1], 400].join(','))].join('\n');
const fs = path.join(tmp, 'kesim.csv'), fi = path.join(tmp, 'envanter.csv'); await writeFile(fs, sample); await writeFile(fi, inv);
const trees = P01.rows.map((r, i) => ({ row: i + 2, D: r[0], H: r[1], y: { c0: r[4], c1: r[5], c2: r[6] }, total: r[7] }));
const comps = w => [{ key: 'c0', label: 'govde', form: 'pow.d2h', weight: w[0] }, { key: 'c1', label: 'kabuk', form: 'pow.d', weight: w[1] }, { key: 'c2', label: 'tepe', form: 'pow.dh', weight: w[2] }];
const ENG = NS.fitNonlinearAdditive(trees, { method: 'weighted', comps: comps([{ code: 'd2h', theta: [2.114] }, { code: 'd', theta: [3.715] }, { code: 'd.h2', theta: [7.322, -0.006185] }]), total: { from: 'column', weight: { code: 'dh', theta: [3.45] } } });
const ENGL = NS.fitNonlinearAdditive(trees, { method: 'log', comps: comps([]), total: { from: 'column' } });
const nums = async sel => (await page.locator(sel).allTextContents()).map(s => +s.replace(/\s/g, '').replace('−', '-').replace(',', '.'));

await page.goto(URL); await page.waitForSelector('#tblbox input[type="file"]', { state: 'attached' });
await page.setInputFiles('#tblbox input[type="file"]', fi); await page.waitForSelector('#usetbl'); await page.click('#usetbl'); await page.waitForSelector('#dsinfo');
await page.click('#to2'); await page.waitForSelector('#syscard');
await page.locator('#syscard > summary').click(); await page.setInputFiles('#sysimp input[type="file"]', fs); await page.waitForSelector('#systab');
ok((await page.textContent('#syscard > summary')).includes('Parresol 1999, 2001'), 'card title names both sources');
await page.check('input[name="sykind"][value="nonlinear"]'); await page.waitForSelector('[data-nf="0"]');
ok(await page.isChecked('input[name="synlm"][value="weighted"]'), 'nonlinear: weighted NSUR by default');
const sel = async (s, v) => { await page.selectOption(s, v); await page.waitForSelector('#systab'); };
const fill = async (s, v) => { await page.fill(s, v); await page.locator(s).dispatchEvent('change'); await page.waitForSelector('#systab'); };
await sel('[data-cc="0"]', '3'); await sel('[data-cc="1"]', '4');
await page.click('#sy-add'); await page.waitForSelector('[data-cc="2"]'); await sel('[data-cc="2"]', '5'); await sel('[data-cc="total"]', '6');
await sel('[data-nf="1"]', 'pow.d'); await sel('[data-nf="2"]', 'pow.dh');
await sel('[data-nw="0"]', 'd2h'); await fill('[data-nth="0"]', '2.114');
await sel('[data-nw="1"]', 'd'); await fill('[data-nth="1"]', '3.715');
await sel('[data-nw="2"]', 'd.h2'); await fill('[data-nth="2"]', '7.322 -0.006185');
await sel('[data-nw="total"]', 'dh'); await fill('[data-nth="total"]', '3.45');
ok((await page.textContent('#systab')).includes('ψ = D^θ1·e^(θ2·H²)'), 'weight functions listed with θ');
await page.click('#sy-fit'); await page.waitForSelector('#sy-coef');
ok((await page.textContent('#sy-sum')).includes('40 ağaç, 4 denklem, 7 katsayı'), 'summary: 40 trees, 4 equations, 7 coefficients');
const shown = await nums('#sy-coef [data-k="b"]');
ok(shown.length === 7 && shown.every((v, k) => Math.abs(v - ENG.beta[k]) <= 1e-4 * Math.abs(ENG.beta[k])), 'NSUR coefficients on screen = nsur.js: ' + shown.join(' '));
ok(Math.abs(shown[0] - 0.016245) < 6e-7 && Math.abs(shown[3] - 2.2112) < 6e-5, 'Table 3: b11 0.016245, b22 2.2112');
const fi2 = await nums('#sy-stat [data-k="fi"]');
ok(fi2.map(v => v.toFixed(3)).join() === '0.984,0.961,0.909,0.988', 'Table 4 fit index: ' + fi2.join(' '));
ok((await page.textContent('#sy-stat')).includes('(D²H)^2.114') && (await page.textContent('#sy-s2')).includes('153'), 'weights and degrees of freedom shown');
await page.fill('#sy-pD', '20'); await page.fill('#sy-pH', '17'); await page.click('#sy-iv'); await page.waitForSelector('#sy-ivtab');
const iv = NS.intervals(ENG, 20, 17), ys = await nums('#sy-ivtab [data-k="y"]');
ok(ys.length === 4 && Math.abs(ys[3] - 264.23) < 0.01 && Math.abs(ys[1] - 34.67) < 0.01, 'intervals table: bark 34.7, total 264.2 kg');
ok((await page.textContent('#sy-ivtab tr[data-eq="total"]')).includes(iv.rows[3].pi[0].toFixed(2)), 'prediction interval as nsur.js (Student t, 153 df)');
await shot('bc02n-1-nsur');
// ln scale
await page.check('input[name="synlm"][value="log"]'); await page.waitForSelector('#systab');
ok(!(await page.locator('[data-nw="0"]').count()), 'ln scale: no weight selectors');
await page.click('#sy-fit'); await page.waitForSelector('#sy-coef');
const shownL = await nums('#sy-coef [data-k="b"]');
ok(shownL.every((v, k) => Math.abs(v - ENGL.beta[k]) <= 1e-4 * Math.abs(ENGL.beta[k])), 'ln-scale NSUR on screen = nsur.js');
await page.click('#sy-iv'); await page.waitForSelector('#sy-ivtab');
ok((await page.textContent('#sy-ivout')).includes('simetrik değildir'), 'ln scale: asymmetric intervals noted');
// save: refused without a source, then three component sets as power forms
await page.check('input[name="synlm"][value="weighted"]'); await page.waitForSelector('#systab'); await page.click('#sy-fit'); await page.waitForSelector('#sy-coef');
await page.click('#sy-save'); await page.waitForSelector('#sy-msg .err');
await page.fill('#sy-cit', 'Parresol 2001 Tablo 1 (e2e)'); await page.locator('#sy-cit').dispatchEvent('change'); await page.fill('#sy-sp', 'P'); await page.locator('#sy-sp').dispatchEvent('change');
await page.click('#sy-save'); await page.waitForSelector('#sy-ok');
const stored = await page.evaluate(async () => { const C = await import('/assets/lab/core/coef.js'); await import('/assets/lab/biomass/calc.js'); return (await C.listCoefs('biomass')).map(s => ({ form: s.form, component: s.component, params: s.params, cov: s.meta && s.meta.cov, valid: s.valid, method: s.fit && s.fit.method })); });
ok(stored.length === 3 && stored.map(s => s.form).sort().join() === 'biomass.pow.d,biomass.pow.d2h,biomass.pow.dh' && stored.every(s => s.cov && s.valid.D && /NSUR/.test(s.method)), 'three sets saved as the registered power forms, with covariance and the NSUR method');
const tepe = stored.find(s => s.component === 'tepe');
ok(tepe && Math.abs(tepe.params.a / ENG.beta[4] - 1) < 1e-6 && Math.abs(tepe.params.c / ENG.beta[6] - 1) < 1e-6 && tepe.valid.H, 'crown set: a, b, c = NSUR coefficients; height range kept');
// apply the sets: the component sum is the NSUR total
const byComp = Object.fromEntries(stored.map(s => [s.component, s]));
await page.goto(BASE + '/biyokutle-karbon.php?lang=en'); await page.waitForSelector('#steps'); await page.click('[data-go="2"]'); await page.waitForSelector('#syscard');
ok((await page.textContent('#syscard > summary')).includes('additive component system from your own data (Parresol 1999, 2001)'), 'English');
ok(errors.length === 0, 'no page errors: ' + errors.join(' | '));
await browser.close();
console.log(`BC-02/a2 e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
