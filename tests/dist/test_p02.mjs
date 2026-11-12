// Diameter distribution engine, stage P02: normal and two-parameter lognormal (families, direct fits, recovery).
//   node tests/dist/test_p02.mjs
// Reference: tests/ref/dist_p02.json (tests/ref/make_dist_p02.py: scipy.stats.norm / lognorm, Nelder–Mead, least_squares).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as D from '../../assets/lab/dist/index.js';
import { normQuantile } from '../../assets/lab/core/stats.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-12) => ok(a === b || (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1e-300)), `${m}: got ${a} expected ${b}`);
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/dist_p02.json'), 'utf8'));
const FX = JSON.parse(readFileSync(path.join(root, 'tests/weibull/fixture.json'), 'utf8')).samples;
const SAMPLES = { ...FX, ...R.sim };
const NO = D.family('normal'), LN = D.family('lognormal');
const run = (id, d, o) => D.runMethod(id, { d }, o);
const rec = (id, summary) => D.runMethod(id, { type: 'summary', summary });

/* 1. registry */
eq(D.families().map(f => f.id).slice(0, 3), ['weibull', 'normal', 'lognormal'], 'families (later stages append)');
eq(D.methodsFor({ kind: 'fit', dataType: 'raw' }).filter(m => !m.truncation && !m.grouped && !m.optional && ['weibull', 'normal', 'lognormal'].includes(m.family)).map(m => [m.id, m.estimator, m.solver, m.likelihoodMaximised]),
  [['weibull.ml', 'ml', 'bisection', true], ['weibull.mom', 'mom', 'bisection', false], ['weibull.pct', 'quantile', 'closed form', false],
   ['normal.ml', 'ml', 'closed form', true], ['lognormal.ml', 'ml', 'closed form', true], ['lognormal.mom', 'mom', 'closed form', false]], 'direct methods');
ok(!D.methodsFor({ family: 'normal', kind: 'fit' }).some(m => m.estimator === 'mom'), 'normal: one method (ML = moments), no duplicate row');
eq(D.methodsFor({ kind: 'recover' }).filter(m => ['normal', 'lognormal'].includes(m.family)).map(m => [m.id, m.dataTypes]), [['normal.rec', ['summary']], ['lognormal.rec', ['summary']]], 'recovery: separate kind and data type');
eq(D.methodsFor({ kind: 'recover', dataType: 'raw' }).filter(m => m.group !== 'poudel').length, 0, 'moment recovery is not offered for raw data (Poudel M2–M5 compute their targets from it, P06)');
eq(LN.params.map(p => [p.key, p.unit, p.scale ?? null]), [['mu', 'ln cm', 'log'], ['sigma', null, 'log']], 'lognormal μ, σ labelled as log scale');
eq(NO.params.map(p => [p.key, p.unit]), [['mu', 'cm'], ['sigma', 'cm']], 'normal μ, σ in cm');
let thrown = null; try { D.runMethod('normal.rec', { d: [1, 2] }); } catch (e) { thrown = e.code; }
eq(thrown, 'method.datatype', 'recovery method refuses raw data');

/* 2. distribution functions against SciPy, both tails */
for (const [fam, grid] of [[NO, R.normal], [LN, R.lognormal]]) for (const g of grid) {
  const p = { mu: g.mu, sigma: g.sigma }, tag = `${fam.id}(${g.mu}, ${g.sigma})`;
  g.x.forEach((x, i) => {
    for (const k of ['pdf', 'logpdf', 'cdf', 'logcdf', 'sf', 'logsf']) near(fam[k](x, p), g[k][i], `${tag} ${k}(${x})`, 2e-12);
  });
  g.q.forEach((q, i) => near(fam.quantile(q, p), g.ppf[i], `${tag} quantile(${q})`, 1e-12));
  near(fam.mean(p), g.mean, `${tag} mean`, 1e-13); near(fam.variance(p), g.var, `${tag} variance`, 1e-12);
}
ok(LN.pdf(0, { mu: 1, sigma: 1 }) === 0 && LN.cdf(-1, { mu: 1, sigma: 1 }) === 0 && LN.logpdf(0, { mu: 1, sigma: 1 }) === -Infinity && LN.sf(0, { mu: 1, sigma: 1 }) === 1, 'lognormal at and below zero');
eq([LN.support({}), NO.support({})], [[0, null], [null, null]], 'supports (∞ written as null)');
R.normQuantile.p.forEach((p, i) => near(normQuantile(p), R.normQuantile.z[i], `Φ⁻¹(${p})`, 1e-13));
{ const s = R.spec81;                                                                    // DIST_SPEC §8.1
  near(NO.pdf(20, { mu: 20, sigma: 5 }), 0.079788456080, '§8.1 normal pdf(20)', 1e-11); near(NO.cdf(20, { mu: 20, sigma: 5 }), 0.5, '§8.1 normal cdf(20)'); near(NO.quantile(0.5, { mu: 20, sigma: 5 }), 20, '§8.1 normal median');
  near(LN.pdf(20, { mu: 3, sigma: 0.4 }), 0.049864946799, '§8.1 lognormal pdf(20)', 1e-11); near(LN.cdf(20, { mu: 3, sigma: 0.4 }), 0.495743639452, '§8.1 lognormal cdf(20)', 1e-11);
  near(LN.quantile(0.5, { mu: 3, sigma: 0.4 }), 20.085536923188, '§8.1 lognormal median', 1e-12);
  near(NO.pdf(20, { mu: 20, sigma: 5 }), s.normal.pdf, '§8.1 normal = SciPy', 1e-14); near(LN.pdf(20, { mu: 3, sigma: 0.4 }), s.lognormal.pdf, '§8.1 lognormal = SciPy', 1e-14); }

/* 3. direct fits against SciPy */
for (const [name, f] of Object.entries(R.fits)) {
  const d = SAMPLES[name];
  const no = run('normal.ml', d);
  near(no.params.mu, f.normal.mu, `${name} normal μ = norm.fit`, 1e-13); near(no.params.sigma, f.normal.sigma, `${name} normal σ = norm.fit (divisor n)`, 1e-12);
  near(no.logLik, f.normal.logLik, `${name} normal ln L`, 1e-12); near(no.diagnostics.pBelowZero, f.normal.pBelowZero, `${name} normal P(D < 0) = Φ(−μ/σ)`, 1e-11);
  near(D.gof.ks(NO, no.params, d), f.normal.ks, `${name} normal KS`, 1e-10); near(D.gof.ad(NO, no.params, d), f.normal.ad, `${name} normal A²`, 1e-9);
  eq([no.targets.varDivisor, no.objective.name, no.convergence.solver, no.free], ['n', 'logLik', 'closed form', ['mu', 'sigma']], `${name} normal record`);
  const ml = run('lognormal.ml', d);
  near(ml.params.mu, f.lognormal_ml.mu, `${name} lognormal ML μ = Nelder–Mead`, 1e-7); near(ml.params.sigma, f.lognormal_ml.sigma, `${name} lognormal ML σ = Nelder–Mead`, 1e-7);
  near(ml.params.mu, f.lognormal_ml.mu_fit, `${name} lognormal ML μ = lognorm.fit`, 1e-7); near(ml.params.sigma, f.lognormal_ml.sigma_fit, `${name} lognormal ML σ = lognorm.fit`, 1e-7);
  ok(ml.logLik >= f.lognormal_ml.logLik - 1e-10, `${name} lognormal ML ln L ≥ SciPy optimum`); near(ml.logLik, f.lognormal_ml.logLik, `${name} lognormal ML ln L (diameter scale)`, 1e-10);
  // the Jacobian: ln L on the diameter scale = normal ln L of ln d − Σ ln d
  const ld = d.map(Math.log), jac = ld.reduce((s, v) => s + v, 0);
  near(ml.logLik, D.gof.logLik(NO, ml.params, ld) - jac, `${name} lognormal ln L includes the Jacobian −Σ ln d`, 1e-12);
  near(D.gof.ks(LN, ml.params, d), f.lognormal_ml.ks, `${name} lognormal ML KS`, 1e-6); near(D.gof.ad(LN, ml.params, d), f.lognormal_ml.ad, `${name} lognormal ML A²`, 1e-5);
  for (const [div, ref] of [['n', f.lognormal_mom_n], ['n-1', f.lognormal_mom_n1]]) {
    const r = run('lognormal.mom', d, { varDivisor: div });
    near(r.params.mu, ref.mu, `${name} lognormal MOM(${div}) μ`, 1e-11); near(r.params.sigma, ref.sigma, `${name} lognormal MOM(${div}) σ`, 1e-11);
    near(LN.mean(r.params), ref.mean, `${name} MOM(${div}) fitted mean = sample mean`, 1e-13); near(LN.variance(r.params), ref.var, `${name} MOM(${div}) fitted variance = target`, 1e-12);
    near(r.logLik, ref.logLik, `${name} MOM(${div}) ln L`, 1e-10); near(D.gof.ks(LN, r.params, d), ref.ks, `${name} MOM(${div}) KS`, 1e-9);
    eq([r.settings, r.targets.varDivisor, r.objective, r.warnings.some(w => w.code === 'var.n1s')], [{ varDivisor: div }, div, null, div === 'n-1'], `${name} MOM(${div}) record states the divisor`);
    ok(ml.logLik >= r.logLik - 1e-10, `${name} lognormal ML ln L ≥ MOM(${div})`);
  }
  // AIC comparisons need the same scale: both normal and lognormal ln L are densities of d (1/cm)
  const a1 = D.gof.aicBic(no.logLik, 2, d.length), a2 = D.gof.aicBic(ml.logLik, 2, d.length);
  near(a1.aic - a2.aic, 2 * (ml.logLik - no.logLik), `${name} AIC difference = 2Δ ln L`, 1e-9);
}

/* 4. validation: no number from bad data */
for (const id of ['normal.ml', 'lognormal.ml', 'lognormal.mom']) {
  for (const [d, code] of [[[20], 'n.few'], [[], 'n.few'], [[20, 20, 20], 'constant']]) { const r = run(id, d); ok(r.status === 'invalid' && r.problems.some(p => p.code === code) && r.params === null && r.logLik === null, `${id} ${JSON.stringify(d)}: ${code}`); }
}
for (const id of ['lognormal.ml', 'lognormal.mom']) { const r = run(id, [10, 0, -3, 22]); ok(r.status === 'invalid' && r.problems[0].code === 'd.nonpos' && r.problems[0].count === 2 && r.problems[0].example === 0 && r.params === null, `${id}: zero and negative diameters rejected with count and example`); }
ok(run('normal.ml', [10, -3, 22]).status === 'ok', 'normal accepts any real value (support is the real line)');
{ const r = run('normal.ml', [2, 3, 30, 31]); ok(r.diagnostics.pBelowZero > 0.1, 'wide normal: large P(D < 0) reported: ' + r.diagnostics.pBelowZero); }
{ const r = run('lognormal.ml', FX.w2), w = run('lognormal.ml', [5, 5, 5, 5, 5, 5, 5, 5, 6, 7]); ok(r.warnings.length === 0 && w.status === 'ok' && w.warnings.some(x => x.code === 'few.unique'), 'notices shared with the Weibull checks'); }

/* 5. recovery from summaries */
for (const c of R.recover) {
  const s = c.input, tag = JSON.stringify(s);
  const n = rec('normal.rec', s), l = rec('lognormal.rec', s);
  ok(n.status === 'ok' && l.status === 'ok' && n.kind === 'recover' && n.data.type === 'summary' && n.logLik === null && n.objective === null, `${tag}: recovered, no likelihood`);
  near(n.params.mu, c.normal.mu, `${tag} normal μ`, 1e-12); near(n.params.sigma, c.normal.sigma, `${tag} normal σ`, 1e-12);
  near(l.params.mu, c.lognormal.mu, `${tag} lognormal μ`, 1e-12); near(l.params.sigma, c.lognormal.sigma, `${tag} lognormal σ`, 1e-11);
  near(n.diagnostics.pBelowZero, c.normal.pBelowZero, `${tag} normal P(D < 0)`, 1e-11);
  for (const r of [n, l]) {          // the recovered distribution reproduces the given mean and Dq (and the moment variance)
    near(r.diagnostics.backMean, s.mean, `${tag} ${r.family}: back-calculated mean = given mean`, 1e-13);
    near(r.diagnostics.backDq, c.dq, `${tag} ${r.family}: back-calculated Dq`, 1e-13);
    if (s.dq != null) near(r.diagnostics.backDq, s.dq, `${tag} ${r.family}: given Dq reproduced`, 1e-13);
    near(r.diagnostics.backVariance, c.v, `${tag} ${r.family}: moment variance`, 1e-12);
    eq([r.targets.source, r.targets.varDivisor, r.targets.n ?? null], [s.dq != null ? 'dq' : 'variance', s.dq != null ? null : s.varDivisor, s.n ?? null], `${tag} ${r.family}: inputs recorded`);
  }
}
{ // s² with n − 1: v = s²(n − 1)/n is what the distribution reproduces
  const r = rec('lognormal.rec', { mean: 31.2, variance: 40, varDivisor: 'n-1', n: 30 }); near(r.targets.variance, 40 * 29 / 30, 'n − 1 variance converted to the moment variance', 1e-15);
  near(r.diagnostics.backVariance, 40 * 29 / 30, 'converted variance reproduced', 1e-12); }
for (const [s, code] of [[{ mean: 20 }, 'sum.none'], [{ mean: 20, variance: 4, dq: 21 }, 'sum.both'], [{ mean: 0, dq: 21 }, 'sum.mean'], [{ mean: -5, variance: 3 }, 'sum.mean'],
  [{ mean: 20, variance: 0 }, 'sum.var'], [{ mean: 20, variance: 4, varDivisor: 'n-1' }, 'sum.nneed'], [{ mean: 20, variance: 4, varDivisor: 'n-1', n: 1 }, 'sum.n'],
  [{ mean: 20, dq: 20 }, 'sum.dq'], [{ mean: 20, dq: 19 }, 'sum.dq'], [{ mean: 20, dq: -1 }, 'sum.dqbad'], [{ mean: 20, dq: 21, n: 2.5 }, 'sum.n']]) {
  for (const id of ['normal.rec', 'lognormal.rec']) { const r = rec(id, s); ok(r.status === 'invalid' && r.problems.some(p => p.code === code) && r.params === null, `${id} ${JSON.stringify(s)}: ${code}`); }
}

console.log(`dist P02: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
