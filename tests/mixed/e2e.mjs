// Browser test for Mixed-Effects Models (SM-03): the simulated sample with the default linear (random intercept and
// slope, REML) and nonlinear (Chapman–Richards, random a, ML) models, compared with nlme (tests/ref/mixed_sm03.json);
// calibration of a new plot; likelihood-ratio test guard; a set saved and shown in the coefficient library; English.
// Usage: php -S 127.0.0.1:8092 in the site folder, then node tests/mixed/e2e.mjs http://127.0.0.1:8092 [shots-dir]
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://127.0.0.1:8092', SHOTS = process.argv[3] || null;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async n => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, n + '.png'), fullPage: true }); };
const REF = JSON.parse(await readFile(path.join(ROOT, 'tests/ref/mixed_sm03.json'), 'utf8'));
const nums = async sel => (await page.locator(sel).allTextContents()).map(s => +s.replace(/\s/g, '').replace('−', '-'));
const close = (a, b, r) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= r * Math.abs(b[i]));

await page.goto(BASE + '/mixed-models.php'); await page.waitForSelector('#sample');
await page.click('#sample'); await page.waitForSelector('#dsinfo');
ok((await page.textContent('#dsinfo')).includes('441 rows'), 'sample read: 441 rows');
await page.click('#to2'); await page.waitForSelector('#gsel');
ok(await page.inputValue('#gsel') === '0' && await page.inputValue('#ysel') === '3' && await page.inputValue('fieldset[data-m="1"] [data-k="expr"]') === '1.3 + a*(1-exp(-b*D_cm))^c', 'group, response and the two sample models set');
await page.click('#calc'); await page.waitForSelector('#cmptab', { timeout: 60000 });
ok((await page.textContent('#r-n')).includes('441 observations, 25 groups'), '441 observations in 25 groups');
const b0 = await nums('[data-fix="0"] [data-k^="b"]'), b1 = await nums('[data-fix="1"] [data-k^="b"]');
ok(close(b0, REF.lme.L2.fixef, 1e-6), 'linear model (REML, general 2 × 2) fixed effects = nlme: ' + b0.join(' '));
ok(close(b1, REF.nlme.N1.fixef, 1e-6), 'nonlinear model (ML, random a) fixed effects = nlme: ' + b1.join(' '));
const ll = await nums('#cmptab [data-k="ll"]');
ok(Math.abs(ll[0] - REF.lme.L2.logLik) < 1e-3 && Math.abs(ll[1] - REF.nlme.N1.logLik) < 1e-3, `log-likelihoods ${ll.join(', ')} = nlme`);
const sd = await nums('[data-vc="0"] [data-k^="sd"]');
ok(close(sd, REF.lme.L2.ranefCov.D.map((r, i) => Math.sqrt(r[i])), 1e-5), 'random-effect standard deviations = nlme');
// likelihood-ratio test refuses a REML model
await page.click('#lrt-go'); await page.waitForSelector('#lrt-bad');
ok((await page.textContent('#lrt-bad')).includes('ML'), 'likelihood-ratio test needs two ML fits');
// calibration: three trees of plot 3 under the linear model, then the nonlinear one
const nd = (await readFile(path.join(ROOT, 'assets/lab/mixed/ornek/ornek-karma.csv'), 'utf8')).trim().split('\n').slice(1).map(l => l.split(';')).filter(r => r[0] === '3').slice(0, 3).map(r => `${r[2]} ${r[3]}`).join('\n');
await page.fill('#cal-obs', nd); await page.fill('#cal-pts', '15 30 45'); await page.click('#cal-go'); await page.waitForSelector('#cal-b');
const cb = await nums('#cal-b [data-k^="b"]');
ok(close(cb, REF.calib_lme.L2.u, 1e-4), 'calibration of the new plot (BLUP) = R: ' + cb.join(' '));
const cp = await nums('#cal-p [data-k="cal"]');
ok(close(cp.slice(3), REF.calib_lme.L2.pred, 1e-3), 'calibrated predictions at 15, 30, 45 cm = R');
{ const [rd] = await Promise.all([page.waitForEvent('download'), page.click('#x-r')]), rs = await readFile(await rd.path(), 'utf8');
  ok(rd.suggestedFilename().endsWith('.R') && rs.includes('library(nlme)') && rs.includes('data_file <- "ornek-karma.csv"') && rs.includes('lme(.y ~ log(D_cm), random = list(.g = pdSymm(~ log(D_cm)))') && rs.includes('nlme(.y ~ m2_f(a, b, c, D_cm)')
    && rs.includes('# BLUP') && rs.includes('c(15, 30, 45)') && rs.includes('fb_out(res)'), 'R code: a .R file with lme and nlme, the calibration card\'s plot (its numbers are checked in R by scripts/rcode-check.sh)'); }
await page.selectOption('#cal-m', '1'); await page.waitForSelector('#cal-it');
await page.fill('#cal-obs', nd); await page.click('#cal-go'); await page.waitForSelector('#cal-b');
const cn = await nums('#cal-b [data-k^="b"]');
ok(Math.abs(cn[0] - REF.calib_nlme.N1.u1) < 1e-3, 'nonlinear calibration (one step) = R: ' + cn.join(' '));
await shot('mx-1');
// save the nonlinear model
await page.selectOption('#sv-m', '1'); await page.waitForSelector('[data-unit]');
await page.fill('#sv-cit', 'e2e benzetim'); await page.locator('#sv-cit').dispatchEvent('change');
for (const [k, v] of [['c2', 'cm'], ['c3', 'm']]) await page.fill(`[data-unit="${k}"]`, v);
await page.click('#sv-save'); await page.waitForSelector('#sv-ok');
const stored = await page.evaluate(async () => { const C = await import('/assets/lab/core/coef.js'); return (await C.listCoefs('mixed')).map(s => ({ form: s.form, params: s.params, expr: s.fit.expr, D: s.fit.D, sigma: s.meta.sigma })); });
ok(stored.length === 1 && /^mixed\./.test(stored[0].form) && stored[0].expr === '1.3+a*(1-exp(-b*D_cm))^c' && Math.abs(stored[0].params.a / REF.nlme.N1.fixef[0] - 1) < 1e-6 && Math.abs(stored[0].D[0][0] / REF.nlme.N1.ranefCov.D[0][0] - 1) < 1e-3, 'mixed-model set saved: formula, fixed effects, D');
await page.goto(BASE + '/coefficient-library.php'); await page.waitForFunction(() => document.body.textContent.includes('1.3+a*(1-exp(-b*D_cm))^c'));
const lib = await page.textContent('main');
ok(lib.includes('Mixed-Effects Models') && !/form\.unknown/.test(lib), 'the coefficient library shows the set, no unknown-form problem');
await page.goto(BASE + '/mixed-models.php'); await page.waitForSelector('#cmptab', { timeout: 60000 });
ok((await page.textContent('main')).includes('Calibrate a new group') && (await page.textContent('#cmptab')).includes('converged'), 'results restored on reload');
ok(errors.length === 0, 'no page errors: ' + errors.join(' | '));
await browser.close();
console.log(`SM-03 e2e: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
