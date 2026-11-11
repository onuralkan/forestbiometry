// Diameter distribution engine, stage P10: exponential (fixed location) and log-logistic/Fisk (ML, two percentiles,
// log-moments), moment existence, recovery from percentiles.
//   node tests/dist/test_p10.mjs
// Reference: tests/ref/dist_p10.json (tests/ref/make_dist_p10.py: scipy.stats.expon / fisk / logistic, expon.fit,
// fisk.fit, Nelder–Mead, minimize_scalar, least_squares on ppf, mpmath quadrature of the moments).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as D from '../../assets/lab/dist/index.js';
import * as LL from '../../assets/lab/dist/fit/loglogistic.js';
import { llMoments } from '../../assets/lab/dist/families/loglogistic.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const nearAbs = (a, b, m, tol) => ok(Math.abs(a - b) <= tol, `${m}: got ${a} expected ${b}`);
const near = (a, b, m, tol = 1e-12) => ok(a === b || (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1e-300)), `${m}: got ${a} expected ${b}`);
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/dist_p10.json'), 'utf8'));
const FX = JSON.parse(readFileSync(path.join(root, 'tests/weibull/fixture.json'), 'utf8')).samples;
const SAMPLES = { ...FX, ...R.sim };
const EX = D.family('exponential'), FK = D.family('loglogistic');
const run = (id, d, o) => D.runMethod(id, { d }, o);
const FNS = ['pdf', 'logpdf', 'cdf', 'logcdf', 'sf', 'logsf'];

/* 1. registry */
eq(EX.params.map(p => [p.key, p.role, p.unit]), [['a', 'location', 'cm'], ['r', 'rate', '1/cm']], 'exponential: location a (cm), RATE r (1/cm)');
eq(FK.params.map(p => [p.key, p.role, p.unit]), [['b', 'scale', 'cm'], ['c', 'shape', null]], 'log-logistic: scale b (cm), shape c; no location');
eq(D.methodsFor({ family: 'exponential' }).filter(m => !m.truncation).map(m => [m.id, m.kind, m.estimator, m.solver, m.likelihoodMaximised]), [['exponential.ml', 'fit', 'ml', 'closed form', true]], 'exponential: one method (ML = moments)');
eq(D.methodsFor({ family: 'loglogistic' }).filter(m => !m.truncation).map(m => [m.id, m.kind, m.estimator, m.solver, m.likelihoodMaximised]),
  [['loglogistic.ml', 'fit', 'ml', 'newton', true], ['loglogistic.pct', 'fit', 'quantile', 'closed form', false], ['loglogistic.logmom', 'fit', 'logmom', 'closed form', false]], 'log-logistic methods');
ok(!D.methodsFor({ family: 'loglogistic' }).some(m => m.estimator === 'mom'), 'log-logistic: the ordinary method of moments is not offered (log-moments are named separately)');
eq(D.method('exponential.ml').options.map(o => [o.key, o.type, o.policies.join()]), [['a', 'fixed-param', 'zero,user']], 'exponential: location 0 or user-fixed, never estimated');

/* 2. family functions against SciPy */
for (const g of R.expon) {
  const p = { a: g.a, r: g.r }, tag = `expon(a = ${g.a}, r = ${g.r})`;
  g.x.forEach((x, i) => { for (const f of FNS) near(EX[f](x, p), g[f][i], `${tag} ${f}(${x})`, 2e-13); });
  g.q.forEach((q, i) => near(EX.quantile(q, p), g.ppf[i], `${tag} quantile(${q})`, 1e-13));
  near(EX.mean(p), g.mean, `${tag} mean`, 1e-15); near(EX.variance(p), g.var, `${tag} variance`, 1e-15);
  near(EX.diagnostics(p).scale, 1 / g.r, `${tag} scale 1/r reported`, 1e-15);
}
ok(EX.pdf(4.9, { a: 5, r: 1 }) === 0 && EX.cdf(5, { a: 5, r: 1 }) === 0 && EX.logsf(5, { a: 5, r: 1 }) === 0 && EX.logcdf(4, { a: 5, r: 1 }) === -Infinity, 'exponential below and at a');
for (const g of R.fisk) {
  const p = { b: g.b, c: g.c }, tag = `fisk(b = ${g.b}, c = ${g.c})`;
  g.x.forEach((x, i) => { for (const f of FNS) near(FK[f](x, p), g[f][i], `${tag} ${f}(${x}) = mpmath`, g.c >= 500 ? 1e-10 : 1e-12); });
  g.q.forEach((q, i) => near(FK.quantile(q, p), g.ppf[i], `${tag} quantile(${q})`, 1e-13));
  g.scipy.x.forEach((x, i) => { for (const f of ['pdf', 'cdf', 'logpdf']) near(FK[f](x, p), g.scipy[f][i], `${tag} ${f}(${x}) = SciPy fisk`, g.c >= 500 ? 1e-10 : 1e-12); });
}
ok(FK.pdf(0, { b: 20, c: 3 }) === 0 && FK.cdf(-1, { b: 20, c: 3 }) === 0 && FK.logsf(0, { b: 20, c: 3 }) === 0 && FK.logpdf(-2, { b: 20, c: 3 }) === -Infinity, 'log-logistic at and below zero');
ok(Number.isFinite(FK.logcdf(1e-30, { b: 20, c: 3 })) && Number.isFinite(FK.logsf(1e30, { b: 20, c: 3 })), 'ln F and ln(1 − F) stay finite far in the tails');
// DIST_SPEC §8.1
nearAbs(EX.pdf(20, { a: 0, r: 0.1 }), 0.013533528324, '§8.1 exponential pdf(20) (table: 12 decimals)', 1e-12); nearAbs(EX.cdf(20, { a: 0, r: 0.1 }), 0.864664716763, '§8.1 exponential cdf(20)', 1e-12);
near(EX.quantile(0.5, { a: 0, r: 0.1 }), 6.931471805599, '§8.1 exponential median', 1e-12); near(EX.pdf(20, { a: 0, r: 0.1 }), R.spec81.expon.pdf, '§8.1 exponential = SciPy', 1e-15);
near(FK.pdf(20, { b: 20, c: 3 }), 0.0375, '§8.1 log-logistic pdf(20)', 1e-12); near(FK.cdf(20, { b: 20, c: 3 }), 0.5, '§8.1 log-logistic cdf(20)', 1e-15);
near(FK.quantile(0.5, { b: 20, c: 3 }), 20, '§8.1 log-logistic median', 1e-15); near(FK.pdf(20, { b: 20, c: 3 }), R.spec81.fisk.pdf, '§8.1 log-logistic = SciPy', 1e-14);

/* 3. moments: existence (c > 1 mean, c > 2 variance) and values against mpmath quadrature */
for (const m of R.moments) {
  const p = { b: m.b, c: m.c }, t = `log-logistic c = ${m.c}`, mm = llMoments(p);
  eq([mm.meanDefined, mm.varianceDefined], [m.meanDefined, m.varianceDefined], `${t}: moment existence`);
  if (m.meanDefined) near(FK.mean(p), m.mean, `${t}: E[D] = quadrature`, 1e-13); else { ok(mm.mean === null, `${t}: no number for the mean`); let e = null; try { FK.mean(p); } catch (x) { e = x; } ok(e && e.code === 'moment.undefined' && e.detail.order === 1, `${t}: mean() throws moment.undefined`); }
  if (m.varianceDefined) near(FK.variance(p), m.variance, `${t}: Var[D] = quadrature`, m.c >= 500 ? 1e-9 : 1e-12); else { ok(mm.variance === null, `${t}: no number for the variance`); let e = null; try { FK.variance(p); } catch (x) { e = x; } ok(e && e.code === 'moment.undefined' && e.detail.order === 2, `${t}: variance() throws moment.undefined`); }
}
{ let cont = true; for (const c of [310, 314, 314.2, 314.16, 320]) { const v1 = llMoments({ b: 1, c }).variance, v2 = llMoments({ b: 1, c: c * (1 + 1e-9) }).variance; if (!(Math.abs(v1 / v2 - 1) < 1e-8)) cont = false; } ok(cont, 'variance continuous across the series switch (θ = 0.01)'); }

/* 4. recovery from theoretical percentiles */
for (const k of R.recover) {
  const e = LL.llPercentileParams(k.qp, k.qr, k.p, k.r), t = `percentiles of fisk(${k.b}, ${k.c}) at (${k.p}, ${k.r})`;
  near(e.b, k.b, `${t}: b recovered`, k.c >= 500 ? 1e-11 : 1e-12); near(e.c, k.c, `${t}: c recovered`, k.c >= 500 ? 1e-9 : 1e-12);
}
ok(LL.llPercentileParams(20, 20, 0.25, 0.75) === null && LL.llPercentileParams(20, 10, 0.25, 0.75) === null && LL.llPercentileParams(0, 10, 0.25, 0.75) === null && LL.llPercentileParams(10, 20, 0.75, 0.25) === null, 'percentile closed form undefined → null, never a number');

/* 5. fits against SciPy */
for (const [name, f] of Object.entries(R.fits)) {
  const d = SAMPLES[name];
  for (const e of f.expon) {
    const r = run('exponential.ml', d, { a: e.a }), t = `${name} exponential a = ${e.a}`;
    ok(r.status === 'ok', `${t} ok`);
    near(r.params.r, e.r_fit, `${t}: r = 1/scale of expon.fit(floc = a)`, 1e-13); near(r.params.r, e.r_min, `${t}: r = numerical maximum (minimize_scalar)`, 1e-7);
    near(r.diagnostics.scale, 1 / e.r_fit, `${t}: scale 1/r = mean − a`, 1e-13); near(r.logLik, e.logLik, `${t}: ln L`, 1e-12);
    near(D.gof.ks(EX, r.params, d), e.ks, `${t}: KS`, 1e-11); near(D.gof.ad(EX, r.params, d), e.ad, `${t}: AD`, 1e-9);
    eq([r.fixed.a.origin, r.free, r.likelihoodMaximised], [e.a === 0 ? 'zero' : 'user', ['r'], true], `${t}: record (k = 1 for AIC)`);
  }
  // ML: Newton reaches the maximum; equals Nelder–Mead and is not worse than either SciPy optimum
  const ml = run('loglogistic.ml', d), t = `${name} log-logistic ML`;
  ok(ml.status === 'ok', `${t} ok`);
  near(ml.params.b, f.ml.b, `${t} b = Nelder–Mead`, 2e-7); near(ml.params.c, f.ml.c, `${t} c = Nelder–Mead`, 2e-7);
  near(ml.params.b, f.ml.b_fit, `${t} b = fisk.fit(floc = 0) (optimiser ~1e-5)`, 3e-5); near(ml.params.c, f.ml.c_fit, `${t} c = fisk.fit`, 3e-5);
  ok(ml.logLik >= D.gof.logLik(FK, { b: f.ml.b, c: f.ml.c }, d) - 1e-11 && ml.logLik >= D.gof.logLik(FK, { b: f.ml.b_fit, c: f.ml.c_fit }, d) - 1e-11, `${t}: ln L ≥ ln L at both SciPy optima`);
  near(ml.logLik, f.ml.logLik, `${t}: ln L (diameter scale, Jacobian included)`, 1e-10);
  ok(ml.convergence.score < 1e-11 && ml.convergence.iter < 50, `${t}: score ≈ 0 in few Newton steps (${ml.convergence.iter})`);
  eq(ml.diagnostics.moments.meanDefined, ml.params.c > 1, `${t}: mean existence reported`);
  // two percentiles: closed form = joint ppf solution
  for (const pr of f.pct) {
    const r = run('loglogistic.pct', d, { p: pr.p, r: pr.r }), tt = `${name} log-logistic PCT(${pr.p}, ${pr.r})`;
    near(r.targets.qp, pr.qp, `${tt} Qp`, 1e-14); near(r.targets.qr, pr.qr, `${tt} Qr`, 1e-14);
    near(r.params.b, pr.b, `${tt} b`, 1e-10); near(r.params.c, pr.c, `${tt} c`, 1e-10);
    near(FK.quantile(pr.p, r.params), pr.qp, `${tt}: fitted Q(p) = sample Qp`, 1e-12); near(FK.quantile(pr.r, r.params), pr.qr, `${tt}: fitted Q(r) = sample Qr`, 1e-12);
  }
  // log-moments
  const lm = run('loglogistic.logmom', d), tl = `${name} log-logistic log-moments`;
  near(lm.params.b, f.logmom.b, `${tl} b`, 1e-12); near(lm.params.c, f.logmom.c, `${tl} c`, 1e-11);
  eq([lm.targets.varDivisor, lm.objective, lm.likelihoodMaximised], ['n', null, false], `${tl}: divisor n, no likelihood objective`);
  ok(ml.logLik >= lm.logLik - 1e-10 && ml.logLik >= run('loglogistic.pct', d).logLik - 1e-10, `${name}: ML has the largest ln L of the three`);
}
// moment existence in the fits: c < 1, 1 < c ≤ 2, c > 2
{ const c09 = run('loglogistic.ml', R.sim.sim_fisk_c09_n120), c16 = run('loglogistic.ml', R.sim.sim_fisk_c16_n200), c35 = run('loglogistic.ml', R.sim.sim_fisk_c35_n150);
  ok(c09.params.c < 1 && !c09.diagnostics.moments.meanDefined && c09.diagnostics.moments.mean === null && c09.diagnostics.moments.variance === null, 'c < 1: no mean, no variance, no numbers');
  ok(c16.params.c > 1 && c16.params.c <= 2 && c16.diagnostics.moments.meanDefined && !c16.diagnostics.moments.varianceDefined && c16.diagnostics.moments.variance === null, '1 < c ≤ 2: mean only');
  ok(c35.diagnostics.moments.varianceDefined && Number.isFinite(c35.diagnostics.moments.variance), 'c > 2: mean and variance');
  ok(!JSON.stringify(c09).includes('null,"variance":NaN') && !/NaN|Infinity/.test(JSON.stringify(c09.diagnostics)), 'no NaN or Infinity in the record'); }

/* 6. problems are states, never numbers */
for (const id of ['exponential.ml', 'loglogistic.ml', 'loglogistic.pct', 'loglogistic.logmom']) {
  for (const [dd, code] of [[[20], 'n.few'], [[], 'n.few'], [[20, 20, 20], 'constant']]) { const r = run(id, dd); ok(r.status === 'invalid' && r.problems.some(p => p.code === code) && r.params === null, `${id} ${JSON.stringify(dd)}: ${code}`); }
}
for (const id of ['loglogistic.ml', 'loglogistic.pct', 'loglogistic.logmom']) { const r = run(id, [0, 10, 12, 30]); ok(r.status === 'invalid' && r.problems[0].code === 'd.nonpos' && r.params === null, `${id}: zero diameter → d.nonpos`); }
{ const r = run('exponential.ml', [10, 12, 30], { a: 10 }); ok(r.status === 'invalid' && r.problems.some(p => p.code === 'a.notbelow') && r.params === null, 'exponential: a not below the smallest diameter'); }
{ const r = run('exponential.ml', [10, 12, 30], { a: -1 }); ok(r.status === 'invalid' && r.problems.some(p => p.code === 'a.negative'), 'exponential: negative a'); }
{ const d = [10, 12, 12, 12, 12, 12, 12, 12, 12, 30]; const r = run('loglogistic.pct', d, { p: 0.25, r: 0.75 }); ok(r.status === 'invalid' && r.problems[0].code === 'q.tied', 'log-logistic: tied sample percentiles'); }
for (const [o, code] of [[{ p: 0.9, r: 0.2 }, 'pr.order'], [{ p: 0, r: 0.5 }, 'pr.range']]) { const r = run('loglogistic.pct', FX.w2, o); ok(r.status === 'invalid' && r.problems.some(p => p.code === code), `log-logistic PCT ${JSON.stringify(o)}: ${code}`); }
{ const r = run('loglogistic.ml', [10, 30]); ok(r.status === 'ok' && Number.isFinite(r.params.c) && r.params.c > 0, 'two distinct diameters: ML exists'); }
{ const r = run('loglogistic.ml', [40, 40.0000001, 40.0000002, 39.9999999]); ok(['ok', 'boundary'].includes(r.status) && (r.status === 'ok' ? Number.isFinite(r.params.c) : r.params === null), 'nearly equal diameters: ML or a boundary state, never a fake number'); }

console.log(`dist P10: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
