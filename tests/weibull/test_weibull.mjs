// Tests for the Diameter Distribution Lab, Weibull version (Module 4). Run: node tests/weibull/test_weibull.mjs
// Reference: tests/ref/weibull.json (SciPy: brentq on the same estimating equations, weibull_min cdf/sf/pdf/ppf,
// kstest, logcdf/logsf for A²) on fixed-seed synthetic samples in tests/weibull/fixture.json.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as W from '../../assets/lab/weibull/calc.js';
import { lnGamma } from '../../assets/lab/core/special.js';
import { classesFromBreaks } from '../../assets/lab/stand/calc.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-9) => ok(a === b || (a != null && b != null && Math.abs(a - b) <= tol * Math.max(1, Math.abs(b))), `${m}: got ${a} expected ${b}`);
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/weibull.json'), 'utf8'));
const FX = JSON.parse(readFileSync(path.join(here, 'fixture.json'), 'utf8'));

/* 0. lnGamma moved unchanged from assets/tools.js */
{
  globalThis.window = globalThis; globalThis.document = { documentElement: { lang: 'en' } };
  createRequire(import.meta.url)(path.join(root, 'assets/tools.js'));
  for (const zz of [0.1, 0.5, 1, 1.5, 2.7, 10, 101]) ok(lnGamma(zz) === globalThis.MP.lnGamma(zz), `lnGamma(${zz}) identical to tools.js`);
}

/* 1. CDF limits and point values */
{
  const P = R.points, p = P.p;
  P.x.forEach((x, i) => { near(W.cdf(x, p), P.cdf[i], `cdf(${x})`, 1e-12); near(W.sf(x, p), P.sf[i], `sf(${x})`, 1e-12); near(W.pdf(x, p), P.pdf[i], `pdf(${x})`, 1e-12); });
  eq([W.cdf(-1, p), W.cdf(5, p), W.pdf(5, p)], [0, 0, 0], 'F(d) = 0 and f(d) = 0 for d ≤ a');
  ok(W.cdf(1e6, p) === 1 && W.sf(1e6, p) === 0, 'F → 1 in the upper tail');
  for (const [q, v] of Object.entries(P.ppf)) near(W.quantile(+q, p), v, `quantile(${q})`, 1e-12);
  ok(W.quantile(0, p) === 5 && W.quantile(1, p) === Infinity, 'quantile limits');
  const m = W.moments(p); near(m.mean, P.mean, 'mean'); near(m.sd, P.sd, 'sd'); near(m.median, P.median, 'median');
  for (let i = 0; i < 50; i++) { const x = 5 + i * 0.7; ok(W.cdf(x + 0.7, p) >= W.cdf(x, p), 'CDF non-decreasing'); }
}

/* 2. estimators against SciPy on fixed-seed samples */
for (const [k, x] of Object.entries(FX.samples)) {
  const r = R.fits[k], aF = FX.a_fixed[k], res = W.analyse(x, aF);
  const by = (m, kind) => res.fits.find(f => f.method === m && f.aKind === kind);
  for (const [name, f] of [['ml0', by('ml', 'zero')], ['mom0', by('mom', 'zero')], ['mlA', by('ml', 'fixed')], ['momA', by('mom', 'fixed')]]) {
    if (!r[name]) { ok(!f, `${k} ${name} not computed without a fixed a`); continue; }
    ok(f.status === 'ok', `${k} ${name} status ok`);
    near(f.a, r[name].a, `${k} ${name} a (fixed, not estimated)`, 0);
    near(f.c, r[name].c, `${k} ${name} c`, 1e-9); near(f.b, r[name].b, `${k} ${name} b`, 1e-9);
    near(f.ks, r[name].ks, `${k} ${name} KS D`, 1e-8); near(f.ad, r[name].ad, `${k} ${name} AD A²`, 1e-7);
    near(f.logLik, r[name].loglik, `${k} ${name} log L`, 1e-9);
    near(f.mom.mean, r[name].mean, `${k} ${name} fitted mean`, 1e-9);
    if (name.startsWith('ml')) { near(f.aic, r[name].aic, `${k} ${name} AIC`, 1e-9); near(f.bic, r[name].bic, `${k} ${name} BIC`, 1e-9); ok(f.k === 2, `${k} ${name} k = 2 (a fixed)`); }
    else ok(f.aic === undefined, `${k} ${name}: no AIC for a moment fit`);
  }
  const ml = by('ml', 'zero');
  near(ml.c, R.fits[k].ml0_scipy_fit[0], `${k} ML c vs scipy .fit()`, 2e-4);
  // class frequencies: expected = n·[F(upper) − F(lower)], tails apart, not renormalised
  const C = R.fits[k].classes, ct = W.classTable(x, ml, classesFromBreaks(C.breaks).classes);
  ct.rows.forEach((row, i) => { near(row.prob, C.prob[i], `${k} class ${i} probability`, 1e-10); near(row.exp, x.length * C.prob[i], `${k} class ${i} expected = n·ΔF`, 1e-10); ok(row.obs === C.obs[i], `${k} class ${i} observed`); });
  near(ct.lower.prob, C.below, `${k} lower tail probability`, 1e-10); near(ct.upper.prob, C.above, `${k} upper tail probability`, 1e-10);
  ok(ct.lower.obs === C.obs_below && ct.upper.obs === C.obs_above, `${k} tail observations`);
  near(ct.totalProb, 1, `${k} visible + tails = 1`, 1e-12);
  ok(ct.visibleProb < 1, `${k} visible classes are not renormalised`);
}

/* 3. fixed a is never taken from the sample minimum; constraints */
{
  const x = FX.samples.w3, mn = Math.min(...x);
  const r = W.analyse(x, null);
  ok(r.fits.every(f => f.a === 0) && r.fits.length === 2, 'without a user value only the two-parameter form (a = 0) is fitted');
  eq(W.fitML(x, mn, 'fixed').problems.map(p => p.code), ['a.notbelow'], 'a = min(d) rejected (d − a must be > 0)');
  eq(W.fitML(x, mn + 1, 'fixed').status, 'problem', 'a above the minimum rejected');
  eq(W.fitML(x, -2, 'fixed').problems.map(p => p.code), ['a.negative'], 'negative a rejected');
  eq(W.fitML(x, NaN, 'fixed').problems.map(p => p.code), ['a.bad'], 'non-numeric a rejected');
}

/* 4. constant, too few, few unique, boundary and non-convergence are reported */
{
  eq(W.fitML([20, 20, 20], 0).problems.map(p => p.code), ['constant'], 'constant data: no fit');
  eq(W.fitMoments([20, 20, 20], 0).status, 'problem', 'constant data: no moment fit');
  eq(W.fitML([14.5], 0).problems.map(p => p.code), ['n.few'], 'one tree: no fit');
  ok(W.checkSample([10, 12, 12, 14, 10, 12], 0).notices.some(n => n.code === 'few.unique'), 'few distinct values reported');
  const grouped = Array.from({ length: 60 }, (_, i) => 10 + 4 * (i % 6));
  ok(W.checkSample(grouped, 0).notices.some(n => n.code === 'looks.grouped'), 'class-midpoint-like data reported');
  const nearConst = [50, 50.0000001, 50.0000002, 49.9999999];
  const b = W.fitML(nearConst, 0);
  ok(b.status === 'boundary' && b.side === 'above' && b.b === null, 'near-constant data: shape beyond 1000 → boundary, no parameters');
  const bm = W.fitMoments(nearConst, 0);
  ok(bm.status === 'boundary' && bm.side === 'above', 'moments: boundary reported');
  const s = W.solveMonotone(c => NaN, 1, 2); ok(s.status === 'nonfinite', 'non-finite estimating function reported');
  const it = W.solveMonotone(c => c - 1.5, 1, 2, 3); ok(it.status === 'maxiter', 'iteration limit reported as non-convergence');
}

/* 5. multiple plots: each plot separately, failures per plot */
{
  const byPlot = new Map(); for (const t of FX.plots) { if (!byPlot.has(t.plot_id)) byPlot.set(t.plot_id, []); byPlot.get(t.plot_id).push(t.dbh); }
  for (const [pid, ref] of Object.entries(R.per_plot)) {
    const f = W.analyse(byPlot.get(pid), null).fits[0];
    if (ref == null) ok(f.status === 'problem', `plot ${pid}: no fit (constant or single tree)`);
    else { ok(f.n === ref.n && f.status === 'ok', `plot ${pid} fitted`); near(f.c, ref.c, `plot ${pid} c`, 1e-9); near(f.b, ref.b, `plot ${pid} b`, 1e-9); }
  }
  ok(byPlot.has('7') && byPlot.has('P01'), 'plot IDs kept as text');
}

console.log(`weibull: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
