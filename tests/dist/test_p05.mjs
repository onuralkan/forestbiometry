// Diameter distribution engine, stage P05: Weibull direct estimation (ML, moments with divisor n or n − 1, two percentiles).
//   node tests/dist/test_p05.mjs
// Reference: tests/ref/dist_p05.json (tests/ref/make_dist_p05.py: SciPy joint solves, weibull_min.fit, Nelder–Mead;
// nothing copied from the JavaScript). Regression reference: the published tool assets/lab/weibull/calc.js (1.0.0).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as D from '../../assets/lab/dist/index.js';
import * as F from '../../assets/lab/dist/fit/weibull.js';
import * as W from '../../legacy/weibull/calc.js';
import { quantile7 } from '../../assets/lab/dist/data.js';
import { bisectMonotone } from '../../assets/lab/core/roots.js';
import { lnGamma } from '../../assets/lab/core/special.js';
import { fmtNum } from '../../assets/lab/core/i18n.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-12) => ok(a === b || (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1e-300)), `${m}: got ${a} expected ${b}`);
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/dist_p05.json'), 'utf8'));
const FX = JSON.parse(readFileSync(path.join(root, 'tests/weibull/fixture.json'), 'utf8')).samples;
const SAMPLES = { ...FX, ...R.sim };
const fam = D.family('weibull');
const run = (id, d, o) => D.runMethod(id, { d }, o);

/* 1. registry: three Weibull methods, separate estimator and solver, options declared */
eq(D.methodsFor({ family: 'weibull', kind: 'fit', dataType: 'raw' }).map(m => [m.id, m.estimator, m.solver, m.likelihoodMaximised]),
  [['weibull.ml', 'ml', 'bisection', true], ['weibull.mom', 'mom', 'bisection', false], ['weibull.pct', 'quantile', 'closed form', false]], 'methods, estimators, solvers');
eq(D.method('weibull.mom').options.map(o => [o.key, o.default ?? null]), [['a', null], ['varDivisor', 'n']], 'moments: location and divisor options, n by default');
eq(D.method('weibull.pct').options.map(o => [o.key, o.default ?? null]), [['a', null], ['p', 0.24], ['r', 0.93]], 'percentiles: Dubey (1967) pair by default');
eq([D.methodsFor({ family: 'weibull', kind: 'recover' }).length, D.methodsFor({ kind: 'stand' }).length], [0, 0], 'no Weibull recovery (P06) or stand methods yet');
ok(!D.methodsFor({}).some(m => /3p|free|loc/.test(m.id)), 'no free-location method');

/* 2. regression: ML and moments (n − 1) reproduce the published 1.0.0 tool exactly */
for (const [name, d] of Object.entries(SAMPLES)) for (const a of [0, Math.round(Math.min(...d) * 5) / 10]) {
  const kind = a ? 'fixed' : 'zero';
  for (const [id, old, o] of [['weibull.ml', W.fitML(d, a, kind), { a }], ['weibull.mom', W.fitMoments(d, a, kind), { a, varDivisor: 'n-1' }]]) {
    const r = run(id, d, o), tag = `${name} a=${a} ${id}`;
    if (old.status === 'ok') ok(r.status === 'ok' && r.params.b === old.b && r.params.c === old.c && r.params.a === old.a && r.logLik === old.logLik && r.convergence.iter === old.iter, `${tag}: identical to 1.0.0`);
    else ok(r.status === (old.status === 'problem' ? 'invalid' : old.status) && r.params === null, `${tag}: same state as 1.0.0 (${old.status})`);
  }
}
// the published tool's edge cases keep their states
for (const [d, o, st, code] of [[[20], {}, 'invalid', 'n.few'], [[20, 20, 20], {}, 'invalid', 'constant'], [[10, 12, 15], { a: 10 }, 'invalid', 'a.notbelow'], [[10, 12, 15], { a: -1 }, 'invalid', 'a.negative']])
  for (const id of ['weibull.ml', 'weibull.mom', 'weibull.pct']) { const r = run(id, d, o); ok(r.status === st && r.problems.some(p => p.code === code) && r.params === null && r.logLik === null, `${id} ${JSON.stringify(d)} ${JSON.stringify(o)}: ${code}`); }
{ // a solution outside the shape interval is a boundary state without parameters (as in 1.0.0)
  const d = [100, 100.0001, 100.0002, 100.0003];
  for (const [id, old] of [['weibull.ml', W.fitML(d)], ['weibull.mom', W.fitMoments(d)]]) {
    const r = run(id, d, id === 'weibull.mom' ? { varDivisor: 'n-1' } : {});
    ok(r.status === old.status && r.params === null && r.warnings.some(w => w.code === 'c.' + (old.status === 'boundary' ? 'boundary' : 'noconverge')), `${id}: ${old.status} reported, no parameters`);
  }
}

/* 3. against SciPy */
for (const [key, f] of Object.entries(R.fits)) {
  const d = SAMPLES[f.sample], a = f.a, tag = key;
  // maximum likelihood: the score root is the exact optimum; SciPy's optimisers agree to their own precision
  const ml = run('weibull.ml', d, { a });
  near(ml.params.b, f.ml.b, `${tag} ML b = Nelder–Mead`, 2e-6); near(ml.params.c, f.ml.c, `${tag} ML c = Nelder–Mead`, 2e-6);
  near(ml.params.b, f.ml.b_scipyfit, `${tag} ML b = weibull_min.fit`, 2e-5); near(ml.params.c, f.ml.c_scipyfit, `${tag} ML c = weibull_min.fit`, 2e-5);
  ok(ml.logLik >= f.ml.logLik - 1e-9, `${tag} ML ln L ≥ SciPy optimum (${ml.logLik} vs ${f.ml.logLik})`);
  near(ml.logLik, f.ml.logLik, `${tag} ML ln L`, 1e-9);
  near(D.gof.ks(fam, ml.params, d), f.ml.ks, `${tag} ML KS`, 1e-4); near(D.gof.ad(fam, ml.params, d), f.ml.ad, `${tag} ML A²`, 1e-3);
  eq([ml.fixed.a.value, ml.free, ml.objective.name, ml.convergence.solver, ml.convergence.tol, ml.targets], [a, ['b', 'c'], 'logLik', 'bisection', F.C_RTOL, null], `${tag} ML record`);
  ok(Math.abs(ml.convergence.score) < 1e-10, `${tag} ML score ≈ 0 at the solution`);
  // moments, both divisors (joint SciPy solve of mean and variance)
  for (const [div, ref] of [['n', f.mom_n], ['n-1', f.mom_n1]]) {
    const r = run('weibull.mom', d, { a, varDivisor: div });
    near(r.params.b, ref.b, `${tag} MOM(${div}) b`, 1e-10); near(r.params.c, ref.c, `${tag} MOM(${div}) c`, 1e-10);
    near(r.logLik, ref.logLik, `${tag} MOM(${div}) ln L`, 1e-9);
    near(D.gof.ks(fam, r.params, d), ref.ks, `${tag} MOM(${div}) KS`, 1e-8); near(D.gof.ad(fam, r.params, d), ref.ad, `${tag} MOM(${div}) A²`, 1e-7);
    near(r.targets.mean, ref.mean, `${tag} MOM(${div}) target mean`, 1e-13); near(r.targets.variance, ref.var, `${tag} MOM(${div}) target variance`, 1e-12);
    near(fam.mean(r.params), ref.mean, `${tag} MOM(${div}) fitted mean = sample mean`, 1e-11); near(fam.variance(r.params), ref.var, `${tag} MOM(${div}) fitted variance = target`, 1e-9);
    eq([r.settings, r.objective, r.likelihoodMaximised, r.warnings.some(w => w.code === 'var.n1')], [{ varDivisor: div }, null, false, div === 'n-1'], `${tag} MOM(${div}) record states the divisor`);
  }
  // the default is the divisor n; the difference to 1.0.0 comes only from the factor (n − 1)/n on the variance
  { const def = run('weibull.mom', d, { a }), n = d.length, x = d.map(v => v - a), m = x.reduce((s, v) => s + v, 0) / n, s2 = x.reduce((s, v) => s + (v - m) ** 2, 0) / (n - 1);
    ok(def.settings.varDivisor === 'n' && def.params.c === run('weibull.mom', d, { a, varDivisor: 'n' }).params.c, `${tag} default divisor is n`);
    const c = def.params.c, cv2 = Math.exp(lnGamma(1 + 2 / c) - 2 * lnGamma(1 + 1 / c)) - 1;
    near(cv2, s2 * (n - 1) / n / (m * m), `${tag} default = 1.0.0 equation with v = s²(n − 1)/n`, 1e-9);
    ok(def.params.c > W.fitMoments(d, a, a ? 'fixed' : 'zero').c, `${tag} smaller variance → larger shape`); }
  // percentiles: closed form = SciPy's joint solve of ppf(p) = Qp and ppf(r) = Qr
  for (const pr of f.pct) {
    const r = run('weibull.pct', d, { a, p: pr.p, r: pr.r }), t = `${tag} PCT(${pr.p}, ${pr.r})`;
    near(r.targets.qp, pr.qp, `${t} Qp type 7`, 1e-14); near(r.targets.qr, pr.qr, `${t} Qr type 7`, 1e-14);
    if (pr.tied) { ok(r.status === 'invalid' && r.problems[0].code === 'q.tied', `${t}: tied percentiles`); continue; }
    near(r.params.b, pr.b, `${t} b`, 1e-10); near(r.params.c, pr.c, `${t} c`, 1e-10); near(r.logLik, pr.logLik, `${t} ln L`, 1e-9);
    near(D.gof.ks(fam, r.params, d), pr.ks, `${t} KS`, 1e-8); near(D.gof.ad(fam, r.params, d), pr.ad, `${t} A²`, 1e-7);
    near(fam.quantile(pr.p, r.params), pr.qp, `${t} fitted Q(p) = sample Qp`, 1e-12); near(fam.quantile(pr.r, r.params), pr.qr, `${t} fitted Q(r) = sample Qr`, 1e-12);
    eq([r.settings, r.objective, r.convergence.solver, r.free, r.fixed.a.value], [{ p: pr.p, r: pr.r, quantile: 'type7' }, null, 'closed form', ['b', 'c'], a], `${t} record`);
  }
  // ML is the likelihood maximum among the three estimators
  const ll = [run('weibull.mom', d, { a }), ...f.pct.filter(x => !x.tied).map(x => run('weibull.pct', d, { a, p: x.p, r: x.r }))].map(r => r.logLik);
  ok(ll.every(v => ml.logLik >= v - 1e-9), `${tag} ML ln L is the largest`);
}
{ // simulated samples: estimates near the true values (sanity, not a reference)
  const r = run('weibull.ml', R.sim.sim_2p_n500); ok(Math.abs(r.params.c - 2.5) < 0.3 && Math.abs(r.params.b - 20) < 1.5, 'n = 500 from W(0, 20, 2.5): ML near the truth');
  const q = run('weibull.ml', R.sim.sim_loc5_n200, { a: 5 }); ok(Math.abs(q.params.c - 1.3) < 0.25 && Math.abs(q.params.b - 15) < 2.5, 'n = 200 from W(5, 15, 1.3), a = 5: ML near the truth');
}

/* 4. percentile closed form against DIST_SPEC §8.2 (a = 5, b = 20, c = 2.5) and SciPy's theoretical percentiles */
{ const s = R.spec82, Q = s.q;
  near(Q['0.31'], 18.45269745606343, '§8.2 Q31 (SciPy = spec table)', 1e-13); near(Q['0.63'], 24.95393865551951, '§8.2 Q63', 1e-13);
  near(Q['0.25'], 17.150527008986376, '§8.2 Q25', 1e-13); near(Q['0.95'], 36.01924299565496, '§8.2 Q95', 1e-13); near(Q['0.5'], 22.272698012047496, '§8.2 Q50', 1e-13);
  for (const [p, r] of [[0.31, 0.63], [0.25, 0.95], [0.5, 0.95], [0.24, 0.93]]) {
    const e = F.percentileParams(Q[String(p)], Q[String(r)], p, r, 5);
    near(e.c, 2.5, `§8.2 C(${p}, ${r}) recovers c`, 1e-12); near(e.b, 20, `§8.2 b from Q(${p})`, 1e-12); ok(e.a === 5, '§8.2 a kept');
  }
  ok(F.percentileParams(20, 20, 0.25, 0.95, 0) === null && F.percentileParams(4, 30, 0.25, 0.95, 5) === null && F.percentileParams(10, 30, 0.95, 0.25, 0) === null, 'closed form undefined → null (tied, Qp ≤ a, p ≥ r)');
  near(fam.mean({ a: 5, b: 20, c: 2.5 }), 22.745276350061506, '§8.2 mean', 1e-13); near(fam.variance({ a: 5, b: 20, c: 2.5 }), 57.65867565204488, '§8.2 moment variance', 1e-12); }

/* 5. sample quantile type 7 = numpy 'linear' */
for (const q of R.q7) near(quantile7(q.d, q.p), q.q, `type 7 Q(${q.p}) of n = ${q.d.length}`, 1e-14);
ok(Number.isNaN(quantile7([], 0.5)) && Number.isNaN(quantile7([1, 2], 1.5)), 'type 7: empty sample or p outside [0, 1]');

/* 6. option checks: wrong p, r never produce a number */
for (const [o, code] of [[{ p: 0.9, r: 0.2 }, 'pr.order'], [{ p: 0.5, r: 0.5 }, 'pr.order'], [{ p: 0, r: 0.5 }, 'pr.range'], [{ p: 0.2, r: 1 }, 'pr.range'], [{ p: NaN, r: 0.9 }, 'pr.range']]) {
  const r = run('weibull.pct', FX.w2, o); ok(r.status === 'invalid' && r.problems[0].code === code && r.params === null, `p, r = ${o.p}, ${o.r}: ${code}`);
}
{ // tied percentiles in a sample with many equal values
  const d = [10, 20, 20, 20, 20, 20, 20, 20, 20, 30], r = run('weibull.pct', d, { p: 0.25, r: 0.75 });
  ok(r.status === 'invalid' && r.problems[0].code === 'q.tied' && r.targets.qp === 20 && r.targets.qr === 20, 'equal sample percentiles: no estimate, the percentiles are reported');
  ok(run('weibull.pct', d, { p: 0.05, r: 0.95 }).status === 'ok', 'other percentiles of the same sample work');
}
{ // a user-entered 0 is a user choice, not the two-parameter default
  ok(run('weibull.ml', FX.w2, { a: 0, aOrigin: 'user' }).fixed.a.origin === 'user' && run('weibull.ml', FX.w2, {}).fixed.a.origin === 'zero', 'location origin: zero vs user');
}

/* 7. solver: geometric bisection with explicit states */
eq(bisectMonotone(x => x - 2, 0.01, 1000).status, 'ok', 'bisection: root found');
near(bisectMonotone(x => Math.log(x) - 1, 0.01, 1000).root, Math.E, 'bisection: e', 1e-14);
eq([bisectMonotone(x => x - 0.001, 0.01, 1000).status, bisectMonotone(x => x - 5000, 0.01, 1000).status, bisectMonotone(x => 3 - x, 0.01, 1000).status], ['below', 'above', 'ok'], 'bisection: root outside the interval reported; decreasing function');
eq(bisectMonotone(x => x > 10 ? NaN : x - 2, 0.01, 1000).status, 'nonfinite', 'bisection: non-finite value reported');
{ const d = FX.w2, s = W.solveMonotone, f = c => c * c - 7; const a = bisectMonotone(f, 0.01, 1000), b = s(f, 0.01, 1000); ok(a.root === b.root && a.iter === b.iter, 'bisection identical to the published tool'); void d; }

/* 8. display: decimal point in both languages (shared formatter) */
{ const r = run('weibull.pct', FX.w2); ok(!fmtNum(r.params.b, 4).includes(',') && /^\d+\.\d{1,4}$/.test(fmtNum(r.params.c, 4)), 'fmtNum: decimal point'); }

console.log(`dist P05: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
