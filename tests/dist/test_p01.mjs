// Diameter distribution engine, stage P01: registry, result contract, Weibull adapter, numerics, data contract.
//   node tests/dist/test_p01.mjs
// Reference: tests/ref/dist_p01.json (tests/ref/make_dist_p01.py, SciPy; ML by direct minimisation of −ln L).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as D from '../../assets/lab/dist/index.js';
import * as W from '../../legacy/weibull/calc.js';
import { normCdf, normSf, logNormCdf, logNormSf, gammaQ, gammaP, normQuantile } from '../../assets/lab/core/stats.js';
import { brent } from '../../assets/lab/core/roots.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-12) => ok(a === b || (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1e-300) + 1e-300), `${m}: got ${a} expected ${b}`);
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/dist_p01.json'), 'utf8'));
const FX = JSON.parse(readFileSync(path.join(root, 'tests/weibull/fixture.json'), 'utf8')).samples;
const fam = D.family('weibull');

/* 1. Weibull functions against SciPy, both tails, on the log scale too (relative tolerance) */
for (const g of R.weibull) {
  const p = { a: g.a, b: g.b, c: g.c }, tag = `W(${g.a},${g.b},${g.c})`;
  g.x.forEach((x, i) => {
    near(fam.pdf(x, p), g.pdf[i], `${tag} pdf(${x})`, 1e-11); near(fam.logpdf(x, p), g.logpdf[i], `${tag} logpdf(${x})`, 1e-11);
    near(fam.cdf(x, p), g.cdf[i], `${tag} cdf(${x})`, 1e-11); near(fam.logcdf(x, p), g.logcdf[i], `${tag} logcdf(${x})`, 1e-11);
    near(fam.sf(x, p), g.sf[i], `${tag} sf(${x})`, 1e-11); near(fam.logsf(x, p), g.logsf[i], `${tag} logsf(${x})`, 1e-11);
    // the published tool's functions give the same values
    near(fam.pdf(x, p), W.pdf(x, p), `${tag} pdf = published tool`, 1e-13); near(fam.cdf(x, p), W.cdf(x, p), `${tag} cdf = published tool`, 1e-13);
  });
  g.q.forEach((q, i) => { near(fam.quantile(q, p), g.ppf[i], `${tag} quantile(${q})`, 1e-11); near(fam.cdf(fam.quantile(q, p), p), q, `${tag} F(Q(${q}))`, 1e-9); });
  near(fam.mean(p), g.mean, `${tag} mean`, 1e-11); near(fam.variance(p), g.var, `${tag} variance`, 1e-9);
  ok(fam.pdf(g.a, p) === 0 && fam.cdf(g.a - 1, p) === 0 && fam.sf(g.a - 1, p) === 1 && fam.logpdf(g.a, p) === -Infinity && fam.logsf(g.a, p) === 0 && fam.logcdf(g.a, p) === -Infinity, `${tag} at and below the location`);
  eq(fam.support(p), [g.a, null], `${tag} support`);                                  // [a, ∞): JSON writes ∞ as null
}
{ const p = { a: 5, b: 20, c: 2.5 };                                                   // DIST_SPEC §8.1
  near(fam.pdf(20, p), 0.049881557187, '§8.1 pdf(20)', 1e-10); near(fam.cdf(20, p), 0.385618549980, '§8.1 cdf(20)', 1e-10); near(fam.quantile(0.5, p), 22.272698012047, '§8.1 median', 1e-12);
  near(fam.pdf(20, p), R.spec81.pdf20, '§8.1 pdf = SciPy', 1e-13); }

/* 2. normal tails and upper incomplete gamma (core/stats.js) */
R.normal.z.forEach((z, i) => {
  near(normCdf(z), R.normal.cdf[i], `Φ(${z})`, 2e-13); near(normSf(z), R.normal.sf[i], `1 − Φ(${z})`, 2e-13);
  near(logNormCdf(z), R.normal.logcdf[i], `ln Φ(${z})`, 2e-13); near(logNormSf(z), R.normal.logsf[i], `ln(1 − Φ)(${z})`, 2e-13);
});
for (const g of R.gammaQ) { near(gammaQ(g.a, g.x), g.q, `Q(${g.a}, ${g.x})`, 1e-12); near(gammaP(g.a, g.x) + gammaQ(g.a, g.x), 1, `P + Q (${g.a}, ${g.x})`, 1e-14); }
ok(normCdf(0) === 0.5 && Number.isNaN(normCdf(NaN)) && logNormCdf(-40) < -800 && Number.isFinite(logNormCdf(-40)), 'normal: centre, NaN, finite log tail');
near(normQuantile(0.975), 1.959963984540054, 'Φ⁻¹(0.975) unchanged', 1e-12);

/* 3. Brent */
near(brent(x => x ** 3 - 2, 0, 2).root, R.roots.cube2, 'brent: cube root of 2', 1e-14);
near(brent(Math.cos, 0, 3).root, R.roots.cos, 'brent: π/2', 1e-14);
near(brent(x => Math.exp(x) - 1e6, 0, 30).root, R.roots.steep, 'brent: steep function', 1e-13);
near(brent(x => (x - 1.25) ** 3, 0, 3).root, R.roots.flat, 'brent: triple root', 1e-4);
eq(brent(x => x * x + 1, -1, 1).status, 'nobracket', 'brent: no sign change reported');
eq(brent(x => 1 / (x - 1) > 0 ? NaN : -1, 0, 2).status, 'nonfinite', 'brent: non-finite value reported');
ok(brent(x => x - 0.3, 0, 1).status === 'ok' && brent(x => x, 0, 1).root === 0, 'brent: root at an end point');

/* 4. registry: only implemented things exist */
eq(D.families()[0].id, 'weibull', 'Weibull registered first (later stages add families after it)');
const FAMS0 = D.families().map(f => f.id);
eq(D.methodsFor({ family: 'weibull', kind: 'fit', dataType: 'raw' }).filter(m => !m.truncation && !m.grouped && !m.optional).map(m => m.id), ['weibull.ml', 'weibull.mom', 'weibull.pct'], 'Weibull raw-data methods (percentiles added in P05)');
eq([D.methodsFor({ kind: 'stand' }).length, D.methodsFor({ dataType: 'classes' }).filter(m => !m.grouped).length, D.methodsFor({ kind: 'recover' }).filter(m => !m.dataTypes.every(t => t === 'summary') && m.group !== 'poudel').length], [0, 0, 0], 'nothing unimplemented is offered (no stand models, class data only through grouped ML (P12); recovery from summaries, raw data only where the summary is computed from it: Poudel M2–M5, P06)');
const thrown = f => { try { f(); return null; } catch (e) { return e instanceof D.DistError ? e.code : 'other:' + e.message; } };
eq(thrown(() => D.family('nosuchfamily')), 'family.unknown', 'unknown family');
eq(thrown(() => D.method('weibull.nosuchmethod')), 'method.unknown', 'unknown method');
eq(thrown(() => D.runMethod('weibull.ml', { type: 'classes' })), 'method.datatype', 'data type the method does not support');
ok(thrown(() => D.registerFamily({ id: 'x', params: [{ key: 'm' }], pdf() {} })).startsWith('other:family x'), 'incomplete family rejected');
ok(thrown(() => D.registerMethod({ id: 'q.ml', family: 'nope', kind: 'fit', dataTypes: ['raw'], run() {} })).startsWith('other:method q.ml'), 'method for an unknown family rejected');
// a new family needs no change elsewhere: register a toy family and a method, the selectors and the runner see it
{
  D.registerFamily({ id: 'toyexp', params: [{ key: 'r', role: 'scale', unit: '1/cm', min: 0, minOpen: true }], support: () => [0, Infinity],
    pdf: (d, p) => d > 0 ? p.r * Math.exp(-p.r * d) : 0, logpdf: (d, p) => d > 0 ? Math.log(p.r) - p.r * d : -Infinity, cdf: (d, p) => d > 0 ? -Math.expm1(-p.r * d) : 0,
    logcdf: (d, p) => Math.log(-Math.expm1(-p.r * d)), sf: (d, p) => Math.exp(-p.r * d), logsf: (d, p) => -p.r * d, quantile: (q, p) => -Math.log1p(-q) / p.r });
  D.registerMethod({ id: 'toyexp.ml', family: 'toyexp', kind: 'fit', estimator: 'ml', solver: 'closed form', dataTypes: ['raw'], likelihoodMaximised: true,
    run(input) { const f = D.family('toyexp'), p = { r: input.d.length / input.d.reduce((a, b) => a + b, 0) }; D.checkParams(f, p); D.checkSupport(f, p, input.d); return { status: 'ok', params: p, logLik: D.gof.logLik(f, p, input.d) }; } });
  const r = D.runMethod('toyexp.ml', { d: [2, 4, 6], plot: 'T' });
  ok(r.status === 'ok' && Math.abs(r.params.r - 0.25) < 1e-15 && r.units.r === '1/cm' && r.free.join() === 'r' && r.family === 'toyexp', 'new family runs through the same runner');
  const e = D.runMethod('toyexp.ml', { d: [2, -4, 6], plot: 'T' });
  ok(e.status === 'error' && e.error.code === 'support.outside' && e.error.detail.count === 1 && e.error.detail.example === -4 && e.params === null, 'observation outside the support → structured error, no parameters');
  eq(D.families().map(f => f.id), [...FAMS0, 'toyexp'], 'family list grows by registration only');
}

/* 5. parameter and support validation */
eq(thrown(() => D.checkParams(fam, { a: 0, b: 0, c: 2 })), 'param.invalid', 'b = 0 rejected');
eq(thrown(() => D.checkParams(fam, { a: 0, b: 3, c: -1 })), 'param.invalid', 'c < 0 rejected');
eq(thrown(() => D.checkParams(fam, { a: -1, b: 3, c: 2 })), 'param.invalid', 'a < 0 rejected');
eq(thrown(() => D.checkParams(fam, { a: 0, b: NaN, c: 2 })), 'param.invalid', 'NaN rejected');
ok(D.checkParams(fam, { a: 0, b: 3, c: 2 }) === true && D.checkSupport(fam, { a: 5, b: 3, c: 2 }, [5.1, 9]) === true, 'valid parameters and data pass');
{ let det = null; try { D.checkSupport(fam, { a: 5, b: 3, c: 2 }, [5, 4, 9]); } catch (e) { det = e.detail; }
  ok(det && det.count === 2 && det.example === 5 && det.lo === 5, 'support error: count, example and limit'); }
eq(thrown(() => fam.variance({ a: 0, b: 1e200, c: 1e-3 })), 'moment.undefined', 'non-finite moment is an error, not a number');

/* 6. the adapter keeps the published Weibull results, and they agree with SciPy */
for (const [key, f] of Object.entries(R.fits)) {
  const d = FX[f.sample];
  for (const [id, old, ref, tol] of [['weibull.ml', W.fitML(d, f.a, f.a ? 'fixed' : 'zero'), f.ml, 2e-6], ['weibull.mom', W.fitMoments(d, f.a, f.a ? 'fixed' : 'zero'), f.mom, 1e-9]]) {
    const r = D.runMethod(id, { d, plot: f.sample }, { a: f.a, ...(id === 'weibull.mom' ? { varDivisor: 'n-1' } : {}) });   // P05: n − 1 is now an option (published tool)
    ok(r.status === 'ok' && r.contract === 'dist-result/1' && r.data.n === f.n && r.data.plot === f.sample, `${key} ${id}: contract`);
    ok(r.params.a === old.a && r.params.b === old.b && r.params.c === old.c && r.logLik === old.logLik, `${key} ${id}: identical to the published tool`);
    near(r.params.b, ref.b, `${key} ${id} b = SciPy`, tol); near(r.params.c, ref.c, `${key} ${id} c = SciPy`, tol);
    near(r.logLik, ref.logLik, `${key} ${id} ln L = SciPy`, 1e-9);
    near(D.gof.logLik(fam, r.params, d), r.logLik, `${key} ${id} ln L from logpdf`, 1e-12);
    near(D.gof.ks(fam, r.params, d), ref.ks, `${key} ${id} KS = SciPy`, tol * 50); near(D.gof.ks(fam, r.params, d), W.ks(d, old), `${key} ${id} KS = published tool`, 1e-12);
    near(D.gof.ad(fam, r.params, d), ref.ad, `${key} ${id} A² = SciPy`, tol * 500); near(D.gof.ad(fam, r.params, d), W.ad(d, old), `${key} ${id} A² = published tool`, 1e-10);
    eq([r.fixed.a.value, r.fixed.a.origin, r.free], [f.a, f.a ? 'user' : 'zero', ['b', 'c']], `${key} ${id}: fixed and free parameters`);
    eq([r.units, r.estimator, r.convergence.solver, r.likelihoodMaximised], [{ a: 'cm', b: 'cm', c: null }, id.endsWith('ml') ? 'ml' : 'mom', 'bisection', id.endsWith('ml')], `${key} ${id}: units, estimator, solver`);
  }
}
{ // ML maximises the likelihood: ln L(ML) ≥ ln L(moments) on every sample; AIC only meaningful there
  for (const f of Object.values(R.fits)) ok(f.ml.logLik >= f.mom.logLik - 1e-9, `${f.sample}: ML log-likelihood is the larger one`);
  const a = D.gof.aicBic(-100, 2, 50); near(a.aic, 204, 'AIC = 2k − 2ℓ'); near(a.bic, 2 * Math.log(50) + 200, 'BIC = k ln n − 2ℓ');
}
{ // problems and non-solutions are states, never numbers
  let r = D.runMethod('weibull.ml', { d: [20] });
  ok(r.status === 'invalid' && r.params === null && r.problems[0].code === 'n.few' && r.logLik === null, 'one tree: invalid, no parameters');
  r = D.runMethod('weibull.ml', { d: [20, 20, 20] }); ok(r.status === 'invalid' && r.problems[0].code === 'constant', 'equal diameters: invalid');
  r = D.runMethod('weibull.ml', { d: [10, 12, 15] }, { a: 10 }); ok(r.status === 'invalid' && r.problems[0].code === 'a.notbelow' && r.fixed.a.value === 10, 'location not below the minimum: invalid');
  r = D.runMethod('weibull.mom', { d: [10, 12, 15, 30, 31] }, { varDivisor: 'n-1' }); ok(r.status === 'ok' && r.warnings.some(w => w.code === 'var.n1') && r.objective === null && !r.likelihoodMaximised, 'moments: variance divisor stated, no objective claimed');
}

/* 7. data contract: plot × period units, pooled mode, unreadable values listed */
{
  const c = v => v == null ? null : typeof v === 'number' ? { t: 'n', v, w: String(v) } : { t: 's', v };
  const rows = [['A', 2019, 20.5], ['A', 2019, '31,2'], ['A', 2024, 22], ['B', 2019, 'x'], ['B', 2019, 15], ['B', 2024, -3], ['10', 2019, 9], ['2', 2019, 8], ['A', 2019, null]];
  const tbl = { headers: ['plot', 'yr', 'd'], rows: rows.map(r => r.map(c)), rowNumbers: rows.map((_, i) => i + 2) };
  let x = D.extractUnits(tbl, { dcol: 2, unit: 'cm', decimal: '.', pcol: 0, percol: 1, mode: 'each' });
  eq(x.units.map(u => [u.plot, u.period, u.d]), [['2', '2019', [8]], ['10', '2019', [9]], ['A', '2019', [20.5]], ['A', '2024', [22]], ['B', '2019', [15]]], 'units: plot × period, natural order, periods never merged');
  eq([x.acc.read, x.acc.bad, x.acc.nonpos, x.acc.badRows], [5, 3, 1, [3, 5, 7, 10]], 'unreadable and non-positive values counted with their rows ("31,2" is not read with a decimal point)');
  eq([x.plots, x.periods], [['2', '10', 'A', 'B'], ['2019', '2024']], 'plots and periods');
  x = D.extractUnits(tbl, { dcol: 2, unit: 'cm', decimal: ',', pcol: 0, percol: 1, mode: 'each' });
  eq(x.units.find(u => u.plot === 'A' && u.period === '2019').d, [20.5, 31.2], 'decimal comma setting reads "31,2"');
  x = D.extractUnits(tbl, { dcol: 2, unit: 'mm', decimal: '.', pcol: 0, percol: 1, mode: 'pool' });
  eq(x.units.map(u => [u.plot === D.POOL, u.period, u.d.length]), [[true, '2019', 4], [true, '2024', 1]], 'pooled: one unit per period');
  near(x.units[0].d[0], 2.05, 'mm → cm');
  x = D.extractUnits(tbl, { dcol: 2, unit: 'cm', decimal: '.', pcol: 0, mode: 'each' });
  eq(x.units.map(u => [u.plot, u.period, u.d.length]), [['2', null, 1], ['10', null, 1], ['A', null, 2], ['B', null, 1]], 'no period column: one unit per plot');
  x = D.extractUnits(tbl, { dcol: 2, unit: 'cm', decimal: '.', pcol: 0, fcol: 1, fval: '2024', mode: 'each' });
  eq([x.units.map(u => u.plot), x.acc.filtered], [['A'], 7], 'filter column');
  const s = D.describe([10, 20, 30]);
  near(s.varN, 200 / 3, 'moment variance (divisor n)'); near(s.varN1, 100, 'sample variance (n − 1)'); near(s.m2, s.mean ** 2 + s.varN, 'm2 = m² + v'); near(s.dq, Math.sqrt(1400 / 3), 'Dq');
}

console.log(`dist P01: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
