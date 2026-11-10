// Diameter distribution engine, stage P06: Weibull recovery, Poudel and Cao (2013) M2–M5, location policy, targets from
// measured diameters.
//   node tests/dist/test_p06.mjs
// Reference: tests/ref/dist_p06.json (tests/ref/make_dist_p06.py: scipy.stats.weibull_min moments and ppf, joint
// least_squares solutions, brentq root counts, numpy summaries).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as D from '../../assets/lab/dist/index.js';
import * as RW from '../../assets/lab/dist/recover/weibull.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-12) => ok(a === b || (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1e-300)), `${m}: got ${a} expected ${b}`);
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/dist_p06.json'), 'utf8'));
const FX = JSON.parse(readFileSync(path.join(root, 'tests/weibull/fixture.json'), 'utf8')).samples;
const rec = (m, summary, o) => D.runMethod('weibull.' + m, { type: 'summary', summary }, o);
const MS = ['m2', 'm3', 'm4', 'm5'];

/* 1. registry: four methods, kind 'recover', separate ids; not in the direct-fit menu */
eq(D.methodsFor({ family: 'weibull', kind: 'recover' }).filter(m => ['weibull.m2', 'weibull.m3', 'weibull.m4', 'weibull.m5'].includes(m.id)).map(m => [m.id, m.estimator, m.solver, m.needs.join('+'), m.dataTypes.join()]),
  [['weibull.m2', 'recovery', 'brent', 'mean+variance', 'summary,raw'], ['weibull.m3', 'recovery', 'brent', 'dq+variance', 'summary,raw'], ['weibull.m4', 'recovery', 'closed form', 'q31+q63', 'summary,raw'], ['weibull.m5', 'recovery', 'closed form', 'q50+q95', 'summary,raw']], 'M2–M5 registered with their inputs');
ok(!D.methodsFor({ kind: 'fit', dataType: 'raw' }).some(m => m.kind === 'recover'), 'recovery methods are not direct-fit methods');

/* 2. DIST_SPEC §8.2: a = 5, b = 20, c = 2.5 recovered by every method (a given; and a = 0.5 × Dmin with Dmin = 10) */
const S82 = { mean: 22.745276350061506, variance: 57.65867565204488, dq: 23.979288394210368, q31: 18.45269745606343, q63: 24.95393865551951, q50: 22.272698012047496, q95: 36.01924299565496 };
for (const k of Object.keys(S82)) near(S82[k], R.spec82[k], `§8.2 target ${k} = SciPy`, 1e-14);
near(S82.variance + S82.mean ** 2, 575.0062718927121, '§8.2 second raw moment = mean² + v (divisor n)', 1e-14);
for (const m of MS) for (const [o, extra, pol] of [[{ loc: 'user', a: 5 }, {}, 'user'], [{}, { dmin: 10 }, 'half-dmin']]) {
  const r = rec(m, { ...S82, ...extra }, o), t = `§8.2 ${m} (${pol})`;
  ok(r.status === 'ok', `${t} ok`);
  near(r.params.a, 5, `${t} a`, 0); near(r.params.b, 20, `${t} b = 20`, 1e-12); near(r.params.c, 2.5, `${t} c = 2.5`, 1e-12);
  eq([r.fixed.a.policy, r.fixed.a.origin, r.settings.locPolicy], pol === 'user' ? ['user', 'user', 'user'] : ['half-dmin', 'rule', 'half-dmin'], `${t} location policy recorded`);
  ok(Object.values(r.diagnostics.residuals).every(x => Math.abs(x) < 1e-13), `${t} back-calculated targets equal the inputs`);
}
{ const r = rec('m2', { ...S82, dmin: 10 }, {}); eq([r.fixed.a.dmin, r.targets.dmin, r.targets.a], [10, 10, 5], 'Dmin kept as a target, a = 0.5 × Dmin'); }

/* 3. other known Weibulls: JS = SciPy joint least_squares; one root of the moment equations in [0.05, 200] */
for (const k of R.cases) {
  for (const m of MS) {
    const r = rec(m, k.targets, { loc: 'user', a: k.a }), s = k.solve[m], t = `W(${k.a}, ${k.b}, ${k.c}) ${m}`;
    ok(r.status === 'ok', `${t} ok`);
    near(r.params.b, k.b, `${t} b`, 1e-10); near(r.params.c, k.c, `${t} c`, 1e-10);
    near(r.params.b, s.b, `${t} b = SciPy least_squares`, k.c >= 40 ? 1e-9 : 1e-10); near(r.params.c, s.c, `${t} c = SciPy least_squares`, k.c >= 40 ? 1e-9 : 1e-10);
  }
  for (const m of ['m2', 'm3']) eq(rec(m, k.targets, { loc: 'user', a: k.a }).convergence.roots, k.roots[m], `W(${k.a}, ${k.b}, ${k.c}) ${m}: number of roots = SciPy count`);
}

/* 4. targets from measured diameters (same methods, summary computed from the data; not a stand regression) */
for (const [name, x] of Object.entries(R.raw)) {
  const d = FX[name], s = RW.weibullSummary(d);
  for (const k of ['n', 'mean', 'variance', 'dq', 'dmin', 'q31', 'q63', 'q50', 'q95']) near(s[k], x.summary[k], `${name} summary ${k} = numpy`, 1e-13);
  eq([s.varDivisor, s.quantile, s.origin, s.from], ['n', 'type7', 'measured', 'raw'], `${name}: divisor, quantile definition and origin recorded`);
  for (const [pol, f] of Object.entries(x.fits)) for (const m of MS) {
    const o = pol === 'zero' ? { loc: 'user', a: 0 } : {}, r = D.runMethod('weibull.' + m, { type: 'raw', d }, o), t = `${name} ${m} (${pol}) from raw`;
    ok(r.status === 'ok', `${t} ok`);
    near(r.params.a, f.a, `${t} a`, 1e-15); near(r.params.b, f[m].b, `${t} b = SciPy`, 1e-9); near(r.params.c, f[m].c, `${t} c = SciPy`, 1e-9);
    eq([r.data.type, r.data.n, r.targets.from, r.targets.origin], ['raw', d.length, 'raw', 'measured'], `${t}: record`);
    if (m === 'm4' || m === 'm5') eq(r.targets.quantile, 'type7', `${t}: quantile definition recorded`);
    // the same targets typed in give the same answer
    const r2 = rec(m, s, o); ok(r2.params.b === r.params.b && r2.params.c === r.params.c, `${t}: typed summary = raw path`);
  }
  // cross-checks with the direct estimators: M2 = moment fit with the same a (divisor n); M4 = percentile fit (0.31, 0.63)
  const a = 0.5 * x.summary.dmin, m2 = D.runMethod('weibull.m2', { type: 'raw', d }), mom = D.runMethod('weibull.mom', { d }, { a, varDivisor: 'n' });
  near(m2.params.c, mom.params.c, `${name}: M2 (a = 0.5·Dmin) = moment fit with that fixed a`, 1e-12);
  const m4 = D.runMethod('weibull.m4', { type: 'raw', d }, { loc: 'user', a: 0 }), pct = D.runMethod('weibull.pct', { d }, { p: 0.31, r: 0.63 });
  near(m4.params.c, pct.params.c, `${name}: M4 = percentile fit with p = 0.31, r = 0.63`, 1e-14);
}

/* 5. inputs: only what the method needs; origin; variance conversion */
{ const r = rec('m4', { q31: S82.q31, q63: S82.q63 }, { loc: 'user', a: 5 }); ok(r.status === 'ok', 'M4 needs only Q31 and Q63'); }
{ const r = rec('m2', { mean: S82.mean }, { loc: 'user', a: 5 }); ok(r.status === 'invalid' && r.problems.some(p => p.code === 'sum.var') && r.params === null, 'M2 without the variance: refused'); }
{ const r = rec('m3', { mean: S82.mean, variance: S82.variance }, { loc: 'user', a: 5 }); ok(r.status === 'invalid' && r.problems.some(p => p.code === 'wsum.missing' && p.key === 'dq'), 'M3 without Dq: refused (mean is not used)'); }
{ const r = rec('m5', { ...S82, origin: 'predicted' }, { loc: 'user', a: 5 }); eq(r.targets.origin, 'predicted', 'predicted targets recorded as predicted'); eq(rec('m5', S82, { loc: 'user', a: 5 }).targets.origin, 'measured', 'default origin: measured'); }
{ const n = 30, s2 = S82.variance * n / (n - 1), r = rec('m2', { mean: S82.mean, variance: s2, varDivisor: 'n-1', n }, { loc: 'user', a: 5 });
  near(r.params.c, 2.5, 'sample variance s² converted with n: v = s²(n − 1)/n', 1e-12); eq([r.targets.varDivisor, r.targets.varGiven === s2], ['n-1', true], 'divisor and given value recorded');
  ok(rec('m2', { mean: S82.mean, variance: s2, varDivisor: 'n-1' }, { loc: 'user', a: 5 }).problems[0].code === 'sum.nneed', 's² without n: refused'); }

/* 6. location and ordering checks: states, never numbers */
const bad = (r, code, m) => ok(r.status === 'invalid' && r.params === null && r.problems.some(p => p.code === code), `${m}: ${code}`);
bad(rec('m2', S82, {}), 'wsum.dmin', 'half-Dmin policy without Dmin');
bad(rec('m2', S82, { loc: 'user' }), 'a.bad', 'user policy without a');
bad(rec('m2', S82, { loc: 'user', a: -1 }), 'a.negative', 'negative a');
bad(rec('m2', S82, { loc: 'user', a: 30 }), 'wsum.meanbelow', 'M2 with a ≥ mean');
bad(rec('m3', S82, { loc: 'user', a: 30 }), 'wsum.dqbelow', 'M3 with a ≥ Dq');
bad(rec('m4', S82, { loc: 'user', a: 19 }), 'wsum.qbelow', 'M4 with Q31 ≤ a');
bad(rec('m5', { q50: 30, q95: 25 }, { loc: 'user', a: 0 }), 'wsum.qorder', 'M5 with Q95 ≤ Q50');
bad(rec('m4', { q31: 20, q63: 20 }, { loc: 'user', a: 0 }), 'wsum.qorder', 'M4 with equal percentiles');
bad(rec('m2', { mean: 1, variance: 1e13 }, { loc: 'user', a: 0 }), 'wsum.noroot', 'M2: CV beyond the shape interval → no root, interval reported');
bad(rec('m3', { dq: 20, variance: 500 }, { loc: 'user', a: 0 }), 'wsum.noroot', 'M3: variance larger than Dq² → no root');
bad(rec('m2', { ...S82, n: 1 }, { loc: 'user', a: 5 }), 'sum.n', 'n = 1 refused');
{ const r = rec('m2', { mean: 1, variance: 1e13 }, { loc: 'user', a: 0 }); eq(r.problems[0].lo + '–' + r.problems[0].hi, '0.05–200', 'search interval in the problem record'); }

/* 7. root scanner: keeps every root (the moment equations here have one; M8/M9 in P07 can have two) */
{ const s = RW.scanRoots(c => (c - 0.2) * (c - 2.5)); ok(s.roots.length === 2 && Math.abs(s.roots[0] - 0.2) < 1e-14 && Math.abs(s.roots[1] - 2.5) < 1e-14, 'two roots both found'); }
{ const s = RW.scanRoots(c => c - 1e3); ok(s.roots.length === 0, 'no root outside the interval'); }

console.log(`dist P06: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
