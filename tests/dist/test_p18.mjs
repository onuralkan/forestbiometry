// Diameter distribution engine, stage P18: L-moments (Weibull, gamma), general quantile matching (QME) and minimum
// distance (MGE) for the normal, gamma and fixed-bound beta.
//   node tests/dist/test_p18.mjs
// Reference: tests/ref/dist_p18.json (tests/ref/make_dist_p18.py: combinatorial sample L-moments, theoretical L-moments
// by numerical integration, brentq, scipy least_squares, minimize with kstest / cramervonmises / A² from logcdf, logsf).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as D from '../../assets/lab/dist/index.js';
import { sampleLmoments } from '../../assets/lab/dist/fit/general.js';
import { lnGamma } from '../../assets/lab/core/special.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/dist_p18.json'), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
const IDS = ['weibull.lmom', 'gamma.lmom', 'normal.qme', 'normal.mge', 'gamma.qme', 'gamma.mge', 'beta.qme', 'beta.mge'];

/* 1. registry: optional, never in the likelihood comparison, raw data only */
for (const id of IDS) { const m = D.method(id);
  ok(m.optional === true && m.likelihoodMaximised === false && m.dataTypes.join() === 'raw' && ['lmom', 'qme', 'mge'].includes(m.estimator), `${id}: optional, no likelihood, raw data, estimator ${m.estimator}`); }
ok(D.method('beta.qme').needsInput && D.method('beta.mge').needsInput, 'beta methods need the user\'s bounds');
ok(D.methodsFor({ dataType: 'classes' }).every(m => !IDS.includes(m.id)), 'not offered for class data');

/* 2. sample L-moments (PWM) = combinatorial definition */
for (const [k, v] of Object.entries(R.lmom)) { const s = sampleLmoments(R.samples[k]);
  ok(rel(s.l1, v.l1) < 1e-13 && rel(s.l2, v.l2) < 1e-12, `${k}: ℓ1, ℓ2 = combinatorial reference (${s.l2})`); }

/* 3. the theoretical L-moment ratios the methods invert, against numerical integration */
for (const t of R.theory) {
  const lam2 = t.family === 'weibull' ? t.params.b * Math.exp(lnGamma(1 + 1 / t.params.c)) * (1 - 2 ** (-1 / t.params.c))
    : t.params.theta * Math.exp(lnGamma(t.params.k + 0.5) - lnGamma(t.params.k) - 0.5 * Math.log(Math.PI));
  ok(rel(lam2, t.lam2) < 1e-9, `${t.family} ${JSON.stringify(t.params)}: λ2 formula = ∫ x(2F − 1)f dx (${lam2} vs ${t.lam2})`); }

/* 4. L-moment fits */
for (const c of R.lmomfit) { const r = D.runMethod(c.id, { d: R.samples[c.s] }, c.opts);
  ok(r.status === 'ok' && Object.keys(c.params).every(k => rel(r.params[k], c.params[k]) < 1e-10 || Math.abs(r.params[k] - c.params[k]) < 1e-14), `${c.id} ${JSON.stringify(c.opts)}: parameters = reference ${JSON.stringify(r.params)}`);
  ok(r.targets.l1 > 0 && r.targets.l2 > 0 && (c.id !== 'weibull.lmom' || r.targets.of === 'd - a'), `${c.id}: sample L-moments recorded as targets`); }

/* 5. QME: probabilities, weights and quantile type recorded; parameters = reference */
for (const c of R.qme) { const o = { probs: c.probs, ...(c.weights ? { weights: c.weights } : {}), ...(c.family === 'beta' ? { L: c.L, U: c.U } : {}) }, r = D.runMethod(c.family + '.qme', { d: R.samples[c.s] }, o), tag = `${c.family}.qme ${c.probs.length} probs${c.weights ? ' weighted' : ''}`;
  ok(r.status === 'ok', `${tag}: ok (${r.status})`); if (r.status !== 'ok') continue;
  ok(Object.keys(c.params).every(k => rel(r.params[k], c.params[k]) < 2e-6), `${tag}: parameters = reference ${JSON.stringify(r.params)} vs ${JSON.stringify(c.params)}`);
  ok(r.objective.value <= c.objective * (1 + 1e-8) + 1e-15, `${tag}: objective not above the reference optimum, to 1e-15 cm² absolute (exact fits reach ~0) (${r.objective.value} vs ${c.objective})`);
  ok(JSON.stringify(r.settings.probs) === JSON.stringify(c.probs) && JSON.stringify(r.settings.weights) === JSON.stringify(c.weights ?? c.probs.map(() => 1)) && r.settings.quantile === 'type7', `${tag}: probabilities, weights, quantile definition recorded`); }

/* 6. MGE: the criterion recorded; minimum = reference */
for (const c of R.mge) { const o = { gof: c.gof, ...(c.family === 'beta' ? { L: c.L, U: c.U } : {}) }, r = D.runMethod(c.family + '.mge', { d: R.samples[c.s] }, o), tag = `${c.family}.mge ${c.gof}`;
  ok(r.status === 'ok' && r.settings.gof === c.gof && r.objective.name === 'mge.' + c.gof, `${tag}: ok, criterion recorded`); if (r.status !== 'ok') continue;
  const fam = D.family(c.family), v = D.gof[c.gof](fam, r.params, R.samples[c.s]);
  ok(rel(v, r.objective.value) < 1e-12, `${tag}: reported value is the criterion at the parameters`);
  ok(v <= c.objective * (1 + 1e-6), `${tag}: minimum not above the reference (${v} vs ${c.objective})`);
  ok(rel(v, c.objective) < 1e-4, `${tag}: same minimum as the reference`); }

/* 7. definitions kept apart; no hidden switch to another method on failure */
{ const d = R.samples.w45, lm = D.runMethod('weibull.lmom', { d }, { a: 0 }), mo = D.runMethod('weibull.mom', { d }, { a: 0 }), ml = D.runMethod('weibull.ml', { d }, { a: 0 });
  ok(lm.params.c !== mo.params.c && lm.params.c !== ml.params.c && mo.params.c !== ml.params.c && lm.method === 'weibull.lmom', 'L-moments, moments and ML give different estimates (different definitions)'); }
{ const d = R.samples.w45, r = D.runMethod('weibull.lmom', { d }, { a: Math.min(...d) });
  ok(r.status === 'invalid' && r.params === null && r.problems[0].code === 'd.le.a' && r.method === 'weibull.lmom', 'a not below every diameter: no result, no other method'); }
{ const d = R.samples.g60;
  ok(D.runMethod('gamma.qme', { d }, { probs: [0.5, 0.25] }).problems[0].code === 'qme.order', 'QME: probabilities must increase');
  ok(D.runMethod('gamma.qme', { d }, { probs: [0.5] }).problems[0].code === 'qme.few', 'QME: at least as many probabilities as free parameters');
  ok(D.runMethod('gamma.qme', { d }, { probs: [0.25, 0.75], weights: [1] }).problems[0].code === 'qme.weights', 'QME: one positive weight per probability');
  ok(D.runMethod('gamma.qme', { d: [10, 10, 10, 10, 10, 10, 10, 12] }, { probs: [0.25, 0.75] }).problems.some(p => p.code === 'qme.ident' || p.code === 'constant'), 'QME: equal sample quantiles do not identify two parameters');
  ok(D.runMethod('beta.mge', { d }, {}).problems[0].code === 'bounds.missing', 'beta MGE without bounds: no result');
  ok(D.runMethod('gamma.lmom', { d: [...d, -1] }).problems[0].code === 'd.nonpos', 'gamma L-moments: support checked'); }

/* 8. not in the likelihood (AIC) comparison: grouped with the descriptive fits */
{ const d = R.samples.g60, rs = ['gamma.ml', 'gamma.lmom', 'gamma.qme', 'gamma.mge'].map(id => D.runMethod(id, { d }, {}));
  const g = D.compare.compareUnit(rs.map(r => ({ ...r, gof: { ks: D.gof.ks(D.family('gamma'), r.params, d) } })), () => null)[0];
  ok(g.ml.map(x => x.r.method).join() === 'gamma.ml' && g.desc.map(x => x.r.method).sort().join() === 'gamma.lmom,gamma.mge,gamma.qme', 'only ML in the AIC table; L-moments, QME, MGE among the descriptive fits'); }

console.log(`dist P18: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
