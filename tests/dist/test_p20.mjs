// Diameter distribution engine, stage P20: generalized gamma (positive c, ML by the profile in c) and Gumbel (maximum
// form; ML, moments; negative-diameter probability; conditional likelihood under thresholds and for classes).
//   node tests/dist/test_p20.mjs
// Reference: tests/ref/dist_p20.json (tests/ref/make_dist_p20.py: mpmath at 40 digits, scipy.stats.gengamma / gamma /
// weibull_min / gumbel_r, Nelder–Mead on the full likelihood and mpmath.findroot of the score equations at 30 digits).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as D from '../../assets/lab/dist/index.js';
import { ggProfile } from '../../assets/lab/dist/fit/gengamma.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/dist_p20.json'), 'utf8'));
const FX = JSON.parse(readFileSync(path.join(root, 'tests/weibull/fixture.json'), 'utf8')).samples;
const SAMPLES = { ...FX, ...R.sim };
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-12) => ok(a === b || (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1e-300)), `${m}: got ${a} expected ${b}`);
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
const run = (id, d, o) => D.runMethod(id, { d }, o);
const FNS = ['pdf', 'logpdf', 'cdf', 'logcdf', 'sf', 'logsf'];

/* ================= generalized gamma ================= */
const GG = D.family('gengamma');
/* 1. registry: its own parameter scheme (a is a shape here, not the Weibull location), optional methods */
eq(GG.params.map(p => [p.key, p.role, p.unit]), [['a', 'shape', null], ['b', 'scale', 'cm'], ['c', 'shape', null]], 'generalized gamma: a shape, b scale (cm), c shape; no location');
ok(!GG.params.some(p => p.role === 'location') && GG.support({})[0] === 0, 'not the three-parameter (shifted) gamma: support starts at 0');
eq(D.methodsFor({ family: 'gengamma' }).map(m => [m.id, m.estimator, m.solver, m.likelihoodMaximised, !!m.optional]),
  [['gengamma.ml', 'ml', 'profile', true, true], ['gengamma.tml', 'ml', 'nelder-mead', true, true], ['gengamma.gml', 'ml', 'nelder-mead', true, true]], 'methods: ML (+ threshold and grouped ML), all optional');

/* 2. functions against mpmath, SciPy in the body */
for (const g of R.gg) {
  const p = { a: g.a, b: g.b, c: g.c }, tag = `gengamma(a = ${g.a}, b = ${g.b}, c = ${g.c})`;
  g.x.forEach((x, i) => { for (const f of FNS) near(GG[f](x, p), g[f][i], `${tag} ${f}(${x}) = mpmath`, 1e-11); });
  g.q.forEach((q, i) => near(GG.quantile(q, p), g.ppf[i], `${tag} quantile(${q}) = mpmath`, 1e-12));
  g.scipy.x.forEach((x, i) => { for (const f of ['pdf', 'cdf', 'logpdf']) near(GG[f](x, p), g.scipy[f][i], `${tag} ${f}(${x}) = SciPy gengamma`, 1e-12); });
  [0.05, 0.5, 0.75].forEach((q, i) => near(GG.quantile(q, p), g.scipy.ppf[i], `${tag} quantile(${q}) = SciPy`, 1e-12));
  near(GG.mean(p), g.mean, `${tag} mean = Γ(a + 1/c)/Γ(a)·b = quadrature`, 1e-12); near(GG.variance(p), g.var, `${tag} variance = quadrature`, 1e-10);
  if (g.special) { const S = D.family(g.special.kind), sp = g.special.kind === 'gamma' ? { k: g.a, theta: g.b } : { a: 0, b: g.b, c: g.c };
    g.special.x.forEach((x, i) => { near(GG.pdf(x, p), g.special.pdf[i], `${tag} = SciPy ${g.special.kind} pdf(${x})`, 1e-13); near(GG.cdf(x, p), g.special.cdf[i], `${tag} = SciPy ${g.special.kind} cdf(${x})`, 1e-13);
      near(GG.pdf(x, p), S.pdf(x, sp), `${tag} = engine ${g.special.kind} pdf(${x})`, 1e-13); near(GG.cdf(x, p), S.cdf(x, sp), `${tag} = engine ${g.special.kind} cdf(${x})`, 1e-13); }); }
}
ok(GG.pdf(0, { a: 2, b: 10, c: 2 }) === 0 && GG.cdf(-1, { a: 2, b: 10, c: 2 }) === 0 && GG.logsf(0, { a: 2, b: 10, c: 2 }) === 0 && GG.logpdf(-1, { a: 2, b: 10, c: 2 }) === -Infinity, 'generalized gamma at and below zero');

/* 3. ML against the score equations solved at 30 digits; nested gamma and Weibull */
for (const m of R.ml) {
  const d = SAMPLES[m.sample], r = run('gengamma.ml', d), tag = `gengamma.ml ${m.sample}`;
  ok(r.status === 'ok', `${tag}: ok (${r.status} ${JSON.stringify(r.warnings)})`);
  if (r.status !== 'ok') continue;
  for (const k of ['a', 'b', 'c']) near(r.params[k], m[k], `${tag} ${k} = score root`, 1e-7);
  near(r.logLik, m.logLik, `${tag} ln L = score root`, 1e-12);
  ok(r.logLik >= m.nm.logLik - 1e-9 && r.logLik >= m.scipyfit.logLik - 1e-9, `${tag}: not below Nelder–Mead (${m.nm.logLik}) or gengamma.fit (${m.scipyfit.logLik})`);
  ok(r.logLik >= m.gammaLogLik - 1e-9 && r.logLik >= m.weibullLogLik - 1e-9, `${tag}: ln L ≥ gamma ML (c = 1) and Weibull ML (a = 1), nested models`);
  const gm = run('gamma.ml', d), wb = run('weibull.ml', d, { a: 0 });
  near(gm.logLik, m.gammaLogLik, `${tag}: engine gamma.ml = SciPy gamma`, 1e-11); near(wb.logLik, m.weibullLogLik, `${tag}: engine weibull.ml = Weibull reference`, 1e-11);
  const ly = d.map(Math.log), yb = ly.reduce((s, v) => s + v, 0) / d.length, y = ly.map(v => v - yb), at1 = ggProfile(y, 1);
  near(at1.ell - d.length * yb, gm.logLik, `${tag}: profile at c = 1 = gamma ML log-likelihood`, 1e-11);
  ok(Math.abs(r.convergence.score) < 1e-10 && r.units.b === 'cm' && r.free.join() === 'a,b,c', `${tag}: score in c ≈ 0 (${r.convergence.score}), units, three free parameters`);
}
{ const r = run('gengamma.ml', SAMPLES.skewed); ok(r.warnings.some(w => w.code === 'gg.multimodal'), 'skewed fixture: two local maxima of the profile reported, the global one returned (= reference above)'); }

/* 4. limits: right-skewed ln d (the profile rises as c → 0, towards the lognormal) and a tiny sample */
{ const L = R.logskew, pr = L.profile; ok(L.skewLog > 0 && pr.every((q, i) => i === 0 || q.logLik > pr[i - 1].logLik), `reference: ln d right-skewed (${L.skewLog.toFixed(3)}); profile rises as c decreases`);
  const r = run('gengamma.ml', SAMPLES[L.sample]); ok(r.status === 'boundary' && r.params === null && r.warnings.some(w => w.code === 'gg.cedge' && w.side === 'low'), 'gengamma.ml: optimum at the lower edge of c → boundary, no parameters');
  const ly = SAMPLES[L.sample].map(Math.log), yb = ly.reduce((s, v) => s + v, 0) / ly.length, y = ly.map(v => v - yb);
  for (const q of pr) near(ggProfile(y, q.c).ell - ly.length * yb, q.logLik, `profile at c = ${q.c} = Nelder–Mead over (a, b)`, 1e-9); }
ok(run('gengamma.ml', [12, 15, 15, 12]).problems.some(p => p.code === 'gg.few'), 'fewer than three distinct diameters: invalid');
ok(run('gengamma.ml', [12, 0, 15, 20]).problems.some(p => p.code === 'd.nonpos'), 'non-positive diameters: invalid');

/* 5. conditional ML above a threshold, grouped ML */
{ const t = R.tml, r = run('gengamma.tml', t.d, { trunc: { lower: t.lower, upper: null } });
  ok(r.status === 'ok', `gengamma.tml ok (${r.status})`); near(r.logLik, t.logLik, 'gengamma.tml ln L = Nelder–Mead on the conditional likelihood', 1e-9);
  for (const k of ['a', 'b', 'c']) near(r.params[k], t[k], `gengamma.tml ${k}`, 2e-3); }
{ const g = R.gml, cl = g.classes.map(c => ({ lo: c.lo, hi: c.hi ?? Infinity, n: c.n })), r = D.runMethod('gengamma.gml', { type: 'classes', classes: cl, countType: 'count', outside: 'zero' });
  ok(r.status === 'ok', `gengamma.gml ok (${r.status})`); near(r.logLik, g.logLik, 'gengamma.gml ln L = Nelder–Mead on Σ n ln p', 1e-9);
  for (const k of ['a', 'b', 'c']) near(r.params[k], g[k], `gengamma.gml ${k}`, 2e-3); }

/* ================= Gumbel, maximum form ================= */
const GB = D.family('gumbel');
eq(GB.params.map(p => [p.key, p.role, p.unit]), [['mu', 'location', 'cm'], ['beta', 'scale', 'cm']], 'Gumbel: μ location (cm), β scale (cm)');
eq(D.methodsFor({ family: 'gumbel' }).map(m => [m.id, m.estimator, m.solver, m.likelihoodMaximised, !!m.optional]),
  [['gumbel.ml', 'ml', 'brent', true, true], ['gumbel.mom', 'mom', 'closed form', false, true], ['gumbel.tml', 'ml', 'nelder-mead', true, true], ['gumbel.gml', 'ml', 'nelder-mead', true, true]], 'Gumbel methods: ML, moments (+ threshold and grouped ML), all optional');
ok(GB.support({})[0] === -Infinity && D.families().filter(f => f.id.startsWith('gumbel')).length === 1, 'maximum form only (no minimum-form family); support: all real numbers');
for (const g of R.gumbel) {
  const p = { mu: g.mu, beta: g.beta }, tag = `gumbel(μ = ${g.mu}, β = ${g.beta})`;
  g.x.forEach((x, i) => { for (const f of FNS) near(GB[f](x, p), g[f][i], `${tag} ${f}(${x}) = mpmath`, 1e-13); });
  g.q.forEach((q, i) => near(GB.quantile(q, p), g.ppf[i], `${tag} quantile(${q}) = mpmath`, 1e-13));
  g.scipy.x.forEach((x, i) => { for (const f of ['pdf', 'cdf', 'logpdf', 'sf']) near(GB[f](x, p), g.scipy[f][i], `${tag} ${f}(${x}) = SciPy gumbel_r`, 1e-13); });
  near(GB.mean(p), g.mean, `${tag} mean μ + γ_E β = SciPy`, 1e-15); near(GB.variance(p), g.var, `${tag} variance π²β²/6 = SciPy`, 1e-15);
  near(GB.diagnostics(p).pBelowZero, g.p0, `${tag} F(0) = SciPy`, 1e-13);
}
ok(GB.cdf(20 - 5 * Math.log(Math.log(2)), { mu: 20, beta: 5 }) - 0.5 < 1e-15 && GB.cdf(0, { mu: 0, beta: 1 }) === Math.exp(-1), 'median μ − β ln ln 2; F(μ) = 1/e (the maximum form, not the minimum form, where F(μ) = 1 − 1/e)');
for (const g of R.gumbel_fit) {
  const d = SAMPLES[g.sample], r = run('gumbel.ml', d), tag = `gumbel ${g.sample}`;
  ok(r.status === 'ok', `${tag}: ML ok`);
  near(r.params.mu, g.ml.mu, `${tag} ML μ = score root (30 digits)`, 1e-12); near(r.params.beta, g.ml.beta, `${tag} ML β`, 1e-12); near(r.logLik, g.ml.logLik, `${tag} ML ln L`, 1e-13);
  near(r.params.mu, g.ml.scipyfit.mu, `${tag} ML = gumbel_r.fit`, 1e-7);
  near(r.diagnostics.pBelowZero, g.ml.p0, `${tag} ML: F(0) reported`, 1e-11);
  for (const div of ['n', 'n-1']) { const m = run('gumbel.mom', d, { varDivisor: div });
    near(m.params.mu, g.mom[div].mu, `${tag} moments (${div}) μ = fsolve on gumbel_r.stats`, 1e-12); near(m.params.beta, g.mom[div].beta, `${tag} moments (${div}) β`, 1e-12);
    ok(m.diagnostics.pBelowZero > 0 && m.settings.varDivisor === div && m.targets.varDivisor === div, `${tag} moments (${div}): divisor recorded, F(0) reported`); }
}
{ const g = R.gumbel_fit.find(x => x.sample === 'sim_gumbel_m9_b5_pos'); ok(SAMPLES[g.sample].every(v => v > 0) && g.ml.p0 > 1e-3, `positive diameters, yet the fitted Gumbel puts ${g.ml.p0.toFixed(4)} below zero: reported, not hidden`); }
ok(run('gumbel.ml', [12, 12, 12]).problems.some(p => p.code === 'constant') && run('gumbel.mom', [20]).problems.some(p => p.code === 'n.few'), 'equal diameters or one tree: invalid');
{ const t = R.gumbel_tml, r = run('gumbel.tml', t.d, { trunc: { lower: t.lower, upper: t.upper } });
  ok(r.status === 'ok' && r.truncation.lower === t.lower && r.truncation.upper === t.upper, 'gumbel.tml ok, both thresholds recorded');
  near(r.logLik, t.logLik, 'gumbel.tml ln L = Nelder–Mead on Σ ln f − n ln[F(U) − F(L)]', 1e-10); near(r.params.mu, t.mu, 'gumbel.tml μ', 1e-5); near(r.params.beta, t.beta, 'gumbel.tml β', 1e-5);
  const u = run('gumbel.ml', t.d); ok(Math.abs(r.params.beta - u.params.beta) > 1e-3, 'conditional fit differs from the untruncated equations on the same trees');
  ok(r.diagnostics.pBelowZero > 0, 'gumbel.tml: F(0) of the fitted model reported'); }
{ const g = R.gumbel_gml, cl = g.classes.map(c => ({ lo: c.lo, hi: c.hi ?? Infinity, n: c.n })), r = D.runMethod('gumbel.gml', { type: 'classes', classes: cl, countType: 'count', outside: 'zero' });
  ok(r.status === 'ok' && r.diagnostics.pBelowZero > 0, 'gumbel.gml ok, F(0) reported'); near(r.logLik, g.logLik, 'gumbel.gml ln L = Nelder–Mead on Σ n ln p', 1e-10);
  near(r.params.mu, g.mu, 'gumbel.gml μ', 1e-5); near(r.params.beta, g.beta, 'gumbel.gml β', 1e-5); }

console.log(`dist P20: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
