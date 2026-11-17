// Browser test for Nonlinear Regression (SM-02): the simulated sample, ready-made and formula models, a weighted
// model with estimated θ, comparison against nlsreg/calc.js in Node, intervals, saving a formula set to the
// coefficient library (shown there without problems), the hand-off to Model Evaluation, English.
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/nlsreg/e2e.mjs http://127.0.0.1:8092 [shots-dir]
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const N = await import('../../assets/lab/nlsreg/calc.js');
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async n => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
const csv = (await readFile(path.join(ROOT, 'assets/lab/nlsreg/ornek/ornek-nls.csv'), 'utf8')).trim().split('\n').slice(1).map(l => l.split(';').slice(1).map(c => +c.replace(',', '.')));
const D = csv.map(r => r[0]), H = csv.map(r => r[1]), V = csv.map(r => r[2]);
const nums = async sel => (await page.locator(sel).allTextContents()).map(s => +s.replace(/\s/g, '').replace('−', '-'));
const fit = async () => { await page.click('#calc'); await page.waitForSelector('#cmptab'); };
const s2 = async () => { await page.click('[data-go="2"]'); await page.waitForSelector('#ysel'); };

await page.goto(BASE + '/dogrusal-olmayan-regresyon.php?lang=tr'); await page.waitForSelector('#sample');
await page.click('#sample'); await page.waitForSelector('#dsinfo');
ok((await page.textContent('#dsinfo')).includes('60 satır, 4 sütun'), 'sample read: 60 rows, 4 columns');
await page.click('#to2'); await page.waitForSelector('#ysel');
ok(await page.inputValue('#ysel') === '2' && await page.inputValue('fieldset[data-m="1"] [data-k="expr"]') === '1.3 + b0*(1-exp(-b1*D))^b2', 'sample models: Chapman–Richards and a free formula for H');
await fit();
const CR = N.compile({ kind: 'ready', ready: 'cr' }), F1 = N.fitModel(CR, D.map(d => [d]), H, { readyId: 'cr' });
const CRH = N.compile({ kind: 'formula', expr: '1.3 + b0*(1-exp(-b1*D))^b2', vars: ['D'] }), F2 = N.fitModel(CRH, D.map(d => [d]), H, { start: [30, 0.03, 1] });
const shown = await nums('[data-coef="0"] [data-k^="b"]'), shown2 = await nums('[data-coef="1"] [data-k^="b"]');
ok(shown.every((v, j) => Math.abs(v / F1.theta[j] - 1) < 1e-6) && shown2.every((v, j) => Math.abs(v / F2.theta[j] - 1) < 1e-6), 'coefficients on screen = calc.js: ' + shown.join(' ') + ' | ' + shown2.join(' '));
const aic = await nums('#cmptab [data-k="aic"]');
ok(Math.abs(aic[0] - F1.aic) < 1e-3 && Math.abs(aic[1] - F2.aic) < 1e-3, `AIC in the comparison: ${aic.join(', ')}`);
await page.fill('[data-iv="x"]', '30'); await page.click('#iv-go'); await page.waitForSelector('#iv-tab');
const iv = N.interval(CR, F1, { x: 30 }, 1), ivs = await nums('#iv-tab [data-k="y"]');
ok(Math.abs(ivs[0] - iv.yhat) < 1e-5 && (await page.textContent('#iv-tab [data-k="pi"]')).includes(String(Number(iv.pi[0].toPrecision(7)))), 'intervals at D = 30 as calc.js');
await shot('nl-1');

// volume models: response V, a weighted ready-made power form and a formula with names equal to the column headings
await s2(); await page.selectOption('#ysel', '3'); await page.waitForSelector('#ysel');
await page.selectOption('fieldset[data-m="0"] [data-k="type"]', 'pow2'); await page.waitForSelector('fieldset[data-m="0"] [data-map="x1"]');
await page.selectOption('fieldset[data-m="0"] [data-map="x1"]', '1'); await page.waitForSelector('#ysel'); await page.selectOption('fieldset[data-m="0"] [data-map="x2"]', '2'); await page.waitForSelector('#ysel');
await page.selectOption('fieldset[data-m="0"] [data-k="wkind"]', 'power'); await page.waitForSelector('fieldset[data-m="0"] [data-k="wcol"]'); await page.selectOption('fieldset[data-m="0"] [data-k="wcol"]', '1'); await page.waitForSelector('#ysel');
await page.fill('fieldset[data-m="1"] [data-k="expr"]', 'log(D_cm)'); await page.locator('fieldset[data-m="1"] [data-k="expr"]').dispatchEvent('change'); await page.waitForSelector('[data-k="perr"]');
ok((await page.textContent('[data-k="perr"]')).includes('ln ya da log10') && await page.isDisabled('#calc'), 'formula error explained; fitting blocked');
await page.fill('fieldset[data-m="1"] [data-k="expr"]', 'a*D_cm^b*H_m^c'); await page.locator('fieldset[data-m="1"] [data-k="expr"]').dispatchEvent('change'); await page.waitForSelector('fieldset[data-m="1"] [data-start="a"]');
ok(await page.inputValue('fieldset[data-m="1"] [data-map="D_cm"]') === '1' && await page.inputValue('fieldset[data-m="1"] [data-map="H_m"]') === '2', 'names equal to column headings mapped to the columns');
ok((await page.textContent('#s2prob')).includes('başlangıç değeri'), 'formula coefficients need starting values');
for (const [k, v] of [['a', '0.00006'], ['b', '2'], ['c', '1']]) { await page.fill(`fieldset[data-m="1"] [data-start="${k}"]`, v); await page.locator(`fieldset[data-m="1"] [data-start="${k}"]`).dispatchEvent('change'); await page.waitForSelector('#ysel'); }
await fit();
const P2 = N.compile({ kind: 'ready', ready: 'pow2' }), W = N.fitModel(P2, csv.map(r => [r[0], r[1]]), V, { readyId: 'pow2', weight: { kind: 'power', X: D, theta: null } });
const PF = N.compile({ kind: 'formula', expr: 'a*D_cm^b*H_m^c', vars: ['D_cm', 'H_m'] }), U = N.fitModel(PF, csv.map(r => [r[0], r[1]]), V, { start: [6e-5, 2, 1] });
const w0 = await nums('[data-coef="0"] [data-k^="b"]'), w1 = await nums('[data-coef="1"] [data-k^="b"]');
ok(w0.every((v, j) => Math.abs(v / W.theta[j] - 1) < 1e-5) && w1.every((v, j) => Math.abs(v / U.theta[j] - 1) < 1e-5), 'weighted power form and formula on screen = calc.js');
ok((await page.textContent('#cmptab tr[data-m="0"]')).includes(`ψ = D_cm^${W.weight.theta.toFixed(4).replace(/0+$/, '')}`.slice(0, 14)) && (await page.textContent('#cmptab')).includes('kestirildi'), 'estimated weight exponent shown');
// interval of the weighted model asks for the weight variable only when it is not a model variable
await page.selectOption('#iv-m', '0'); await page.waitForSelector('[data-iv="x1"]');
ok(!(await page.locator('[data-iv="__w"]').count()), 'weight variable is a model variable: not asked again');
await page.fill('[data-iv="x1"]', '30'); await page.fill('[data-iv="x2"]', '20'); await page.click('#iv-go'); await page.waitForSelector('#iv-tab');
const ivw = N.interval(P2, W, { x1: 30, x2: 20 }, 30 ** W.weight.theta);
ok((await page.textContent('#iv-tab [data-k="pi"]')).includes(String(Number(ivw.pi[1].toPrecision(7)))), 'weighted prediction interval uses ψ = D^θ at the point');
// save the formula model
await page.selectOption('#sv-m', '1'); await page.waitForSelector('[data-unit]');
await page.fill('#sv-cit', 'e2e benzetim'); await page.locator('#sv-cit').dispatchEvent('change');
await page.click('#sv-save'); await page.waitForSelector('#sv-msg .err');
ok((await page.textContent('#sv-msg')).includes('birim'), 'units are required');
for (const [k, v] of [['c1', 'cm'], ['c2', 'm'], ['c3', 'm3']]) await page.fill(`[data-unit="${k}"]`, v);
await page.click('#sv-save'); await page.waitForSelector('#sv-ok');
const stored = await page.evaluate(async () => { const C = await import('/assets/lab/core/coef.js'); return (await C.listCoefs('nls')).map(s => ({ form: s.form, params: s.params, inputs: s.inputs, output: s.output, expr: s.fit.expr, vars: s.fit.vars, valid: s.valid })); });
ok(stored.length === 1 && /^nls\.expr\./.test(stored[0].form) && stored[0].expr === 'a*D_cm^b*H_m^c' && stored[0].inputs.D_cm.unit === 'cm' && stored[0].output.unit === 'm3' && Math.abs(stored[0].params.b / U.theta[1] - 1) < 1e-6, 'formula set saved with formula, units and coefficients');
await shot('nl-2');
await page.goto(BASE + '/katsayi-kutuphanesi.php?lang=tr'); await page.waitForSelector('#steps, main');
await page.waitForFunction(() => document.body.textContent.includes('a*D_cm^b*H_m^c'));
const libText = await page.textContent('main');
ok(libText.includes('Doğrusal Olmayan Regresyon') && libText.includes('a*D_cm^b*H_m^c') && !/form\.unknown/.test(libText), 'the coefficient library shows the formula set, no unknown-form problem');
// hand-off to Model Evaluation
await page.goto(BASE + '/dogrusal-olmayan-regresyon.php?lang=tr'); await page.waitForSelector('#ev-send');
await page.click('#ev-send'); await page.waitForURL(/model-degerlendirme\.php/); await page.waitForTimeout(800);
ok((await page.textContent('main')).includes('dogrusal-olmayan-regresyon.tsv'), 'Model Evaluation opened with the handed-off table');
await page.goto(BASE + '/dogrusal-olmayan-regresyon.php?lang=en'); await page.waitForSelector('#cmptab');
ok((await page.textContent('#cmptab')).includes('estimated') && (await page.textContent('main')).includes('Save the set'), 'English');
ok(errors.length === 0, 'no page errors: ' + errors.join(' | '));
await browser.close();
console.log(`SM-02 e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
