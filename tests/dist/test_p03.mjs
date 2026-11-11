// Diameter distribution engine, stage P03: two-parameter gamma (family, ML, moments, recovery) and its numerics.
//   node tests/dist/test_p03.mjs
// Reference: tests/ref/dist_p03.json (tests/ref/make_dist_p03.py: scipy.stats.gamma(a = k, scale = θ), gamma.fit,
// Nelder–Mead, least_squares, scipy.special.digamma / gammaincinv).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as D from '../../assets/lab/dist/index.js';
import * as G from '../../assets/lab/dist/fit/gamma.js';
import { digamma, lnMinusDigamma } from '../../assets/lab/core/special.js';
import { gammaPInv, lnGammaP, lnGammaQ, gammaP } from '../../assets/lab/core/stats.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-12) => ok(a === b || (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1e-300)), `${m}: got ${a} expected ${b}`);
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/dist_p03.json'), 'utf8'));
const FX = JSON.parse(readFileSync(path.join(root, 'tests/weibull/fixture.json'), 'utf8')).samples;
const SAMPLES = { ...FX, ...R.sim };
const GA = D.family('gamma');
const run = (id, d, o) => D.runMethod(id, { d }, o);

/* 1. registry */
eq(GA.params.map(p => [p.key, p.role, p.unit]), [['k', 'shape', null], ['theta', 'scale', 'cm']], 'gamma: shape k (no unit), SCALE θ (cm); no location');
eq(D.methodsFor({ family: 'gamma' }).filter(m => !m.truncation).map(m => [m.id, m.kind, m.estimator, m.solver, m.likelihoodMaximised]),
  [['gamma.ml', 'fit', 'ml', 'brent', true], ['gamma.mom', 'fit', 'mom', 'closed form', false], ['gamma.rec', 'recover', 'moments', 'closed form', false]], 'gamma methods');
ok(!D.methodsFor({ family: 'gamma' }).some(m => (m.options || []).some(o => o.key === 'a' || o.key === 'loc')), 'no free-location gamma');

/* 2. numerics: digamma, ln P / ln Q tails, inverse incomplete gamma */
R.digamma.x.forEach((x, i) => {
  near(digamma(x), R.digamma.psi[i], `ψ(${x})`, x === 1e-4 ? 1e-13 : 3e-14 * Math.max(1, 1 / Math.abs(R.digamma.psi[i])));
  if (R.digamma.lnMinusPsi[i] != null && x <= 37) near(lnMinusDigamma(x), R.digamma.lnMinusPsi[i], `ln x − ψ(x) at ${x}`, 1e-13);
});
for (const x of [1e3, 1e6, 1e9]) { const g = lnMinusDigamma(x); near(g, 1 / (2 * x) + 1 / (12 * x * x), `ln x − ψ(x) at ${x}: asymptotic, no cancellation`, 1e-9); }
ok(lnMinusDigamma(1e-8) > 1e7 && Number.isNaN(lnMinusDigamma(0)) && Number.isNaN(lnMinusDigamma(-1)), 'ln x − ψ(x): small x large, x ≤ 0 undefined');
{ let mono = true, prev = Infinity; for (let t = -9; t <= 18; t += 0.25) { const g = lnMinusDigamma(Math.exp(t)); if (!(g < prev) || !(g > 0)) mono = false; prev = g; } ok(mono, 'ln k − ψ(k) positive and strictly decreasing over 1e-4 … 6e7'); }
for (const c of R.gammaincinv) near(gammaPInv(c.a, c.p), c.x, `P⁻¹(${c.a}, ${c.p})`, 1e-12);
ok(gammaPInv(2, 0) === 0 && gammaPInv(2, 1) === Infinity && Number.isNaN(gammaPInv(-1, 0.5)), 'P⁻¹ at the ends and for a bad shape');
ok(Number.isFinite(lnGammaP(3, 1e-60)) && lnGammaP(3, 1e-60) < -400 && Number.isFinite(lnGammaQ(3, 2000)) && lnGammaQ(3, 2000) < -1900, 'ln P and ln Q stay finite far in the tails');
near(Math.exp(lnGammaP(4.5, 2)), gammaP(4.5, 2), 'ln P consistent with P', 1e-14);

/* 3. family functions against SciPy */
for (const g of R.gamma) {
  const p = { k: g.k, theta: g.theta }, tag = `gamma(${g.k}, ${g.theta})`, tol = g.k >= 60 ? 2e-10 : 2e-12;
  g.x.forEach((x, i) => { for (const f of ['pdf', 'logpdf', 'cdf', 'logcdf', 'sf', 'logsf']) near(GA[f](x, p), g[f][i], `${tag} ${f}(${x})`, f.startsWith('log') ? tol : tol * 10); });
  g.q.forEach((q, i) => near(GA.quantile(q, p), g.ppf[i], `${tag} quantile(${q})`, 1e-12));
  near(GA.mean(p), g.mean, `${tag} mean`, 1e-14); near(GA.variance(p), g.var, `${tag} variance`, 1e-14);
}
ok(GA.pdf(0, { k: 2, theta: 3 }) === 0 && GA.cdf(-1, { k: 2, theta: 3 }) === 0 && GA.logsf(0, { k: 2, theta: 3 }) === 0 && GA.logpdf(-2, { k: 2, theta: 3 }) === -Infinity, 'gamma at and below zero');
near(GA.pdf(20, { k: 2, theta: 8 }), 0.025651562070, '§8.1 gamma pdf(20)', 1e-11); near(GA.cdf(20, { k: 2, theta: 8 }), 0.712702504816, '§8.1 gamma cdf(20)', 1e-11);
near(GA.quantile(0.5, { k: 2, theta: 8 }), 13.426775920133, '§8.1 gamma median', 1e-12); near(GA.pdf(20, { k: 2, theta: 8 }), R.spec81.pdf, '§8.1 = SciPy', 1e-14);

/* 4. fits against SciPy */
for (const [name, f] of Object.entries(R.fits)) {
  const d = SAMPLES[name], ml = run('gamma.ml', d), narrow = name === 'sim_narrow_n50';
  ok(ml.status === 'ok', `${name} ML ok`);
  near(ml.params.k, f.ml.k_fit, `${name} ML k = gamma.fit(floc = 0)`, 1e-8); near(ml.params.theta, f.ml.theta_fit, `${name} ML θ = gamma.fit`, 1e-8);
  near(ml.params.k, f.ml.k, `${name} ML k = Nelder–Mead`, narrow ? 1e-5 : 2e-6); near(ml.params.theta, f.ml.theta, `${name} ML θ = Nelder–Mead`, narrow ? 1e-5 : 2e-6);
  // optimality on the same function: SciPy's estimates evaluated with the JS log-likelihood are not better
  ok(ml.logLik >= D.gof.logLik(GA, { k: f.ml.k, theta: f.ml.theta }, d) - (narrow ? 1e-9 : 1e-12) && ml.logLik >= D.gof.logLik(GA, { k: f.ml.k_fit, theta: f.ml.theta_fit }, d) - (narrow ? 1e-9 : 1e-12), `${name} ML ln L ≥ ln L at both SciPy estimates`);
  // value: for very large k, lnΓ(k) (≈ 8·10⁴ at k ≈ 10⁴) limits ln L to about 10⁻⁹ absolute in double precision
  near(ml.logLik, f.ml.logLik_fit, `${name} ML ln L = SciPy`, narrow ? 1e-10 : 1e-11);
  near(ml.params.k * ml.params.theta, d.reduce((s, v) => s + v, 0) / d.length, `${name} ML: kθ = sample mean`, 1e-13);
  ok(Math.abs(ml.convergence.score) < 1e-12 && ml.convergence.solver === 'brent' && ml.convergence.iter > 0, `${name} ML: score ≈ 0, Brent iterations reported`);
  near(D.gof.ks(GA, ml.params, d), f.ml.ks, `${name} ML KS`, narrow ? 1e-3 : 1e-5); near(D.gof.ad(GA, ml.params, d), f.ml.ad, `${name} ML A²`, narrow ? 1e-2 : 1e-4);
  for (const [div, ref] of [['n', f.mom_n], ['n-1', f.mom_n1]]) {
    const r = run('gamma.mom', d, { varDivisor: div });
    near(r.params.k, ref.k, `${name} MOM(${div}) k`, 1e-11); near(r.params.theta, ref.theta, `${name} MOM(${div}) θ`, 1e-11);
    near(GA.mean(r.params), ref.mean, `${name} MOM(${div}) mean reproduced`, 1e-13); near(GA.variance(r.params), ref.var, `${name} MOM(${div}) variance reproduced`, 1e-13);
    near(r.logLik, ref.logLik, `${name} MOM(${div}) ln L`, 1e-10);
    eq([r.settings, r.objective, r.likelihoodMaximised, r.warnings.some(w => w.code === 'var.n1s')], [{ varDivisor: div }, null, false, div === 'n-1'], `${name} MOM(${div}) record`);
    ok(ml.logLik >= r.logLik - 1e-10, `${name} ML ln L ≥ MOM(${div})`);
  }
}

/* 5. states kept apart; a failed ML never returns the moment estimate */
for (const id of ['gamma.ml', 'gamma.mom']) {
  for (const [d, code] of [[[20], 'n.few'], [[20, 20, 20], 'constant']]) { const r = run(id, d); ok(r.status === 'invalid' && r.problems.some(p => p.code === code) && r.params === null, `${id} ${JSON.stringify(d)}: ${code}`); }
  const r = run(id, [10, 0, -2, 30]); ok(r.status === 'invalid' && r.problems[0].code === 'd.nonpos' && r.problems[0].count === 2 && r.params === null, `${id}: non-positive diameters`);
}
{ // differing diameters whose ln m − mean(ln d) is zero or below in floating point: shape overflow, not a number
  const d = [1e8, 1e8 * (1 + 4e-16), 1e8, 1e8 * (1 + 2.2e-16)], r = run('gamma.ml', d);
  ok(r.status === 'boundary' && r.params === null && r.warnings.some(w => w.code === 'k.overflow'), 'ML: shape overflow is a boundary state without parameters: ' + JSON.stringify(r.warnings));
}
{ // shape beyond the search interval (k > 1e8): boundary, never the moment value relabelled
  const d = Array.from({ length: 40 }, (_, i) => 50 + (i % 2 ? 1e-4 : -1e-4)), r = run('gamma.ml', d), mo = run('gamma.mom', d);
  ok(r.status === 'boundary' && r.params === null && r.warnings.some(w => w.code === 'k.overflow' && w.side === 'above'), 'ML: k above 1e8 → boundary');
  ok(mo.status === 'ok' && mo.params.k > 1e8 && r.method === 'gamma.ml' && r.estimator === 'ml', 'the moment estimate exists but is not returned under the ML label');
}
{ // very small shape inside the interval still solves
  const d = [1e-6, 3e-3, 0.01, 0.4, 2, 9, 30, 80, 150, 400], r = run('gamma.ml', d);
  ok(r.status === 'ok' && r.params.k > 1e-4 && r.params.k < 1, 'ML: small shape solved (k = ' + (r.params && r.params.k) + ')');
}

/* 6. recovery */
for (const c of R.recover) {
  const s = c.input, r = D.runMethod('gamma.rec', { type: 'summary', summary: s }), tag = JSON.stringify(s);
  ok(r.status === 'ok' && r.kind === 'recover' && r.logLik === null, `${tag}: recovered, no likelihood`);
  near(r.params.k, c.k, `${tag} k`, 1e-12); near(r.params.theta, c.theta, `${tag} θ`, 1e-12);
  near(r.diagnostics.backMean, s.mean, `${tag} mean reproduced`, 1e-13); near(r.diagnostics.backDq, c.dq, `${tag} Dq reproduced`, 1e-13);
}
{ const r = D.runMethod('gamma.rec', { type: 'summary', summary: { mean: 16, variance: 128 } }); near(r.params.k, 2, 'k = m²/v'); near(r.params.theta, 8, 'θ = v/m'); }
ok(D.runMethod('gamma.rec', { type: 'summary', summary: { mean: 20, dq: 19 } }).status === 'invalid', 'recovery: inconsistent summary refused');

console.log(`dist P03: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
