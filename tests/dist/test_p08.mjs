// Diameter distribution engine, stage P08: Johnson SB with fixed ξ, λ (family, CML, percentiles, moments) and quadrature.
//   node tests/dist/test_p08.mjs
// Reference: tests/ref/dist_p08.json (tests/ref/make_dist_p08.py: scipy.stats.johnsonsb, mpmath.quad at 40 digits,
// Nelder–Mead, johnsonsb.fit, least_squares with scipy.integrate.quad moments).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as D from '../../assets/lab/dist/index.js';
import * as SBF from '../../assets/lab/dist/fit/johnsonsb.js';
import { sbMomentsY, logistic } from '../../assets/lab/dist/families/johnsonsb.js';
import { gaussLegendre, normalExpect } from '../../assets/lab/core/quad.js';
import { normQuantile as normQ } from '../../assets/lab/core/stats.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-12) => ok(a === b || (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1e-300)), `${m}: got ${a} expected ${b}`);
const nearAbs = (a, b, m, tol) => ok(Number.isFinite(a) && Math.abs(a - b) <= tol, `${m}: got ${a} expected ${b}`);
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/dist_p08.json'), 'utf8'));
const FX = JSON.parse(readFileSync(path.join(root, 'tests/weibull/fixture.json'), 'utf8')).samples;
const SB = D.family('johnsonsb');
const run = (id, d, o) => D.runMethod(id, { d }, o);

/* 1. registry: fixed bounds, shapes estimated; no joint four-parameter method; KB and the general pair are separate */
eq(SB.params.map(p => [p.key, p.role, p.unit]), [['xi', 'lower', 'cm'], ['lambda', 'range', 'cm'], ['gamma', 'shape', null], ['delta', 'shape', null]], 'Johnson SB parameters');
eq(D.methodsFor({ family: 'johnsonsb', kind: 'fit' }).filter(m => !m.truncation && !m.grouped).map(m => [m.id, m.estimator, m.solver, m.likelihoodMaximised, m.needsInput]),
  [['johnsonsb.cml', 'ml', 'closed form', true, true], ['johnsonsb.mom', 'mom', 'brent', false, true], ['johnsonsb.kb', 'quantile', 'closed form', false, true], ['johnsonsb.pct', 'quantile', 'closed form', false, true]], 'SB methods');
ok(D.methodsFor({ family: 'johnsonsb', kind: 'fit' }).every(m => ['xi', 'lambda'].every(k => m.options.some(o => o.key === k && o.type === 'fixed-param' && o.policies.join() === 'user'))), 'ξ and λ are user-fixed in every method');
ok(!D.methodsFor({ family: 'johnsonsb' }).some(m => /joint|4p|full/.test(m.id)), 'no joint four-parameter method');
eq(D.method('johnsonsb.kb').options.filter(o => o.type === 'prob').length, 0, 'KB has a fixed pair (no p, r options)');
eq(D.method('johnsonsb.pct').options.filter(o => o.type === 'prob').map(o => o.key), ['p', 'r'], 'general percentile method: user pair');

/* 2. quadrature */
{ const { x, w } = gaussLegendre(10); near(w.reduce((a, b) => a + b, 0), 2, 'GL10 weights sum to 2', 1e-15);
  near(x.reduce((s, v, i) => s + w[i] * v ** 18, 0), 2 / 19, 'GL10 exact for x¹⁸', 1e-14);
  const [m0, m2, m4] = normalExpect(z => [1, z * z, z ** 4], 3); near(m0, 1, 'E[1] under N(0,1)', 1e-15); near(m2, 1, 'E[Z²]', 1e-14); near(m4, 3, 'E[Z⁴]', 1e-14); }
for (const c of R.mom_cases) { const r = sbMomentsY(c.gamma, c.delta); near(r.m1, c.meanY, `E[Y] (γ ${c.gamma}, δ ${c.delta}) = mpmath`, 2e-14); near(r.v, c.varY, `Var[Y] (γ ${c.gamma}, δ ${c.delta}) = mpmath`, 5e-13); }
nearAbs(sbMomentsY(0, 1.7).m1, 0.5, 'symmetric SB: E[Y] = ½', 1e-15);
ok(logistic(-800) === 0 && logistic(800) === 1 && Math.abs(logistic(1e-3) - 0.50025) < 1e-8, 'logistic without overflow');

/* 3. family functions against SciPy (reflected near U) */
for (const g of R.johnsonsb) {
  const p = { xi: g.xi, lambda: g.lambda_, gamma: g.gamma, delta: g.delta }, tag = `SB(${g.gamma}, ${g.delta}; ${g.xi}, ${g.lambda_})`;
  g.x.forEach((x, i) => { for (const f of ['pdf', 'logpdf', 'cdf', 'logcdf', 'sf', 'logsf']) {
    if (g[f][i] == null) { ok(Number.isFinite(SB[f](x, p)) && SB[f](x, p) < -700, `${tag} ${f}(${x}): finite where SciPy underflows`); continue; }
    if (g[f][i] === 0) { ok(SB[f](x, p) < 1e-300, `${tag} ${f}(${x}) = 0`); continue; }
    near(SB[f](x, p), g[f][i], `${tag} ${f}(${x})`, f.startsWith('log') ? 1e-11 : 1e-10); } });
  g.q.forEach((q, i) => near(SB.quantile(q, p), g.ppf[i], `${tag} quantile(${q})`, 1e-12));
  near(SB.mean(p), g.mean, `${tag} mean = mpmath`, 1e-14); near(SB.variance(p), g.var, `${tag} variance = mpmath`, 5e-13);
  ok(SB.pdf(g.xi, p) === 0 && SB.pdf(g.xi + g.lambda_, p) === 0 && SB.cdf(g.xi - 1, p) === 0 && SB.cdf(g.xi + g.lambda_ + 1, p) === 1 && SB.quantile(0, p) === g.xi && SB.quantile(1, p) === g.xi + g.lambda_, `${tag} outside the open support`);
  for (const q of [0.001, 0.3, 0.77, 0.999]) {
    const gap = g.lambda_ * logistic((q < 0.5 ? 1 : -1) * (normQ(q) - g.gamma) / g.delta), Q = SB.quantile(q, p);   // distance of Q to its near bound
    // with a very small δ the distance of an outer quantile to its bound can fall below the spacing of doubles there:
    // the correctly rounded quantile is then the bound itself, and F(bound) is 0 or 1
    if (Q === g.xi || Q === g.xi + g.lambda_) ok(gap < 4 * Number.EPSILON * Math.max(g.xi + g.lambda_, 1), `${tag} Q(${q}) rounds to the bound (gap ${gap})`);
    else near(SB.cdf(Q, p), q, `${tag} F(Q(${q}))`, 1e-10);
  }
}
{ const p = { xi: 5, lambda: 40, gamma: 0.6, delta: 1.3 };                         // DIST_SPEC §8.1
  near(SB.pdf(20, p), 0.055206557626, '§8.1 SB pdf(20)', 1e-11); near(SB.cdf(20, p), 0.474455926493, '§8.1 SB cdf(20)', 1e-11);
  near(SB.quantile(0.5, p), 20.464836861499, '§8.1 SB median', 1e-12); near(SB.pdf(20, p), R.spec81.pdf, '§8.1 = SciPy', 1e-14); }

/* 4. fits */
const sample = name => R.sim[name] ? { d: R.sim[name].d, xi: R.sim[name].xi, lambda: R.sim[name].lambda_ } : { d: FX[name], xi: R.bounds[name][0], lambda: R.bounds[name][1] };
for (const [name, f] of Object.entries(R.fits)) {
  const { d, xi, lambda } = sample(name), o = { xi, lambda };
  // CML: closed form equals the numerical maximum of the likelihood with ξ, λ fixed
  const c = run('johnsonsb.cml', d, o);
  ok(c.status === 'ok', `${name} CML ok`);
  nearAbs(c.params.gamma, f.cml.gamma, `${name} CML γ = Nelder–Mead`, 2e-6); near(c.params.delta, f.cml.delta, `${name} CML δ = Nelder–Mead`, 2e-6);
  nearAbs(c.params.gamma, f.cml.gamma_fit, `${name} CML γ = johnsonsb.fit (optimiser ~1e-5)`, 1e-4); near(c.params.delta, f.cml.delta_fit, `${name} CML δ = johnsonsb.fit`, 1e-4);
  ok(c.logLik >= D.gof.logLik(SB, { ...o, gamma: f.cml.gamma, delta: f.cml.delta }, d) - 1e-11, `${name} CML ln L ≥ ln L at the SciPy optimum`);
  near(c.logLik, f.cml.logLik, `${name} CML ln L (diameter scale)`, 1e-11);
  { const t = d.map(v => Math.log((v - xi) / (xi + lambda - v))), m = t.reduce((a, b) => a + b, 0) / t.length, v = t.reduce((a, b) => a + (b - m) ** 2, 0) / t.length;
    near(c.params.delta, 1 / Math.sqrt(v), `${name} CML: δ = 1/s_t with divisor n`, 1e-14); eq(c.targets.varDivisor, 'n', `${name} CML: divisor n recorded`); }
  eq([c.fixed, c.free, c.settings.boundPolicy], [{ xi: { value: xi, origin: 'user' }, lambda: { value: lambda, origin: 'user' } }, ['gamma', 'delta'], 'user'], `${name} CML record`);
  // percentiles: KB pair and the general method; closed forms equal SciPy's joint solve of ppf(p) = Qp, ppf(r) = Qr
  for (const pr of f.pct) {
    const kb = pr.p === 0.5 && pr.r === 0.95, r = kb ? run('johnsonsb.kb', d, o) : run('johnsonsb.pct', d, { ...o, p: pr.p, r: pr.r }), t = `${name} ${kb ? 'KB' : 'PCT'}(${pr.p}, ${pr.r})`;
    near(r.targets.qp, pr.qp, `${t} Qp`, 1e-14); near(r.targets.qr, pr.qr, `${t} Qr`, 1e-14);
    nearAbs(r.params.gamma, pr.gamma, `${t} γ`, 1e-10); near(r.params.delta, pr.delta, `${t} δ`, 1e-10);
    near(SB.quantile(pr.p, r.params), pr.qp, `${t} fitted Q(p) = sample Qp`, 1e-12); near(SB.quantile(pr.r, r.params), pr.qr, `${t} fitted Q(r) = sample Qr`, 1e-12);
    eq([r.settings.pair, r.settings.p, r.settings.r], [kb ? 'kb' : 'user', pr.p, pr.r], `${t} pair recorded`);
  }
  ok(run('johnsonsb.pct', d, { ...o, p: 0.5, r: 0.95 }).params.gamma === run('johnsonsb.kb', d, o).params.gamma, `${name}: KB = general method with 0.50/0.95 (same formula, separate label)`);
  // moments: numerical solution reproduces m and v; equals SciPy's least_squares
  for (const div of ['n', 'n-1']) {
    const ref = f.mom[div], r = run('johnsonsb.mom', d, { ...o, varDivisor: div }), t = `${name} MOM(${div})`;
    ok(r.status === 'ok', `${t} ok`);
    nearAbs(r.params.gamma, ref.gamma, `${t} γ`, 1e-9); near(r.params.delta, ref.delta, `${t} δ`, 1e-9);
    near(SB.mean(r.params), ref.mean, `${t} fitted mean = sample mean`, 1e-13); near(SB.variance(r.params), ref.var, `${t} fitted variance = target`, 1e-11);
    near(xi + lambda * ref.check_meanY, ref.mean, `${t} SciPy solution checked with mpmath`, 1e-12);
    eq([r.settings.varDivisor, r.objective, r.convergence.solver], [div, null, 'brent'], `${t} record`);
    ok(c.logLik >= r.logLik - 1e-10, `${t}: CML ln L is the larger`);
  }
}

/* 5. moment solver: recovers known shapes; Var[Y] decreases in δ along the mean curve */
for (const k of R.mom_cases) {
  const r = SBF.sbFromMoments(k.meanY, k.varY);
  ok(r.status === 'ok', `moments of SB(${k.gamma}, ${k.delta}) solved`);
  nearAbs(r.gamma, k.gamma, `… γ recovered`, 1e-8 * Math.max(1, Math.abs(k.gamma))); near(r.delta, k.delta, `… δ recovered`, 1e-8);
}
{ let mono = true; for (const mu of [0.1, 0.5, 0.83]) { let prev = Infinity; for (let u = -6; u <= 9; u += 0.5) { const dl = Math.exp(u), g = (() => { const r = SBF.sbFromMoments; return r; })(); void g;
    // γ(δ) by bisection on the monotone mean, then Var
    let lo = -1e6, hi = 1e6; for (let i = 0; i < 300; i++) { const m = (lo + hi) / 2; if (sbMomentsY(m, dl).m1 > mu) lo = m; else hi = m; }
    const v = sbMomentsY((lo + hi) / 2, dl).v; if (!(v < prev + 1e-15)) mono = false; prev = v; } }
  ok(mono, 'Var[Y] decreases in δ at fixed E[Y] (assumption of the moment solver)'); }

/* 6. problems are states, never numbers */
for (const id of ['johnsonsb.cml', 'johnsonsb.mom', 'johnsonsb.kb', 'johnsonsb.pct']) {
  for (const [o, code] of [[{}, 'sb.missing'], [{ xi: 0 }, 'sb.missing'], [{ xi: -1, lambda: 60 }, 'sb.xineg'], [{ xi: 0, lambda: 0 }, 'sb.lambda']]) { const r = run(id, FX.w2, o); ok(r.status === 'invalid' && r.problems[0].code === code && r.params === null, `${id} ${JSON.stringify(o)}: ${code}`); }
  const d = [3, 5, 10, 20, 30, 40, 41, 50], r = run(id, d, { xi: 5, lambda: 36 });
  ok(r.status === 'invalid' && r.problems.some(p => p.code === 'bound.outside' && p.count === 2) && r.problems.some(p => p.code === 'bound.on' && p.count === 2) && r.params === null, `${id}: outside and on-bound observations reported`);
  for (const [dd, code] of [[[20], 'n.few'], [[20, 20, 20], 'constant']]) ok(run(id, dd, { xi: 0, lambda: 60 }).problems.some(p => p.code === code), `${id} ${JSON.stringify(dd)}: ${code}`);
}
{ const r = run('johnsonsb.mom', [1, 9], { xi: 0, lambda: 10, varDivisor: 'n-1' }); ok(r.status === 'invalid' && r.problems[0].code === 'sb.var', 'moments: variance beyond the SB limit (n − 1) → not admissible'); }
eq(SBF.sbFromMoments(1.2, 0.01).problem.code, 'sb.mean', 'mean outside the bounds'); eq(SBF.sbFromMoments(0.5, 0.25).problem.code, 'sb.var', 'variance at the two-point limit');
{ const r = SBF.sbFromMoments(0.5, 1e-12); ok(r.status === 'boundary' && r.side === 'above', 'tiny variance: δ beyond the search interval → boundary, no numbers'); }
{ const d = [10, 12, 12, 12, 12, 12, 12, 12, 12, 30]; const r = run('johnsonsb.pct', d, { xi: 0, lambda: 40, p: 0.25, r: 0.75 }); ok(r.status === 'invalid' && r.problems[0].code === 'q.tied', 'tied sample percentiles'); }
for (const [o, code] of [[{ p: 0.9, r: 0.2 }, 'pr.order'], [{ p: 0, r: 0.5 }, 'pr.range']]) { const r = run('johnsonsb.pct', FX.w2, { xi: 0, lambda: 60, ...o }); ok(r.status === 'invalid' && r.problems.some(p => p.code === code), `PCT ${JSON.stringify(o)}: ${code}`); }
{ // near the bounds (0.01 cm outside the data): all methods still finite and consistent
  const s = R.sim.sim_near_bounds, o = { xi: s.xi, lambda: s.lambda_ };
  for (const id of ['johnsonsb.cml', 'johnsonsb.mom', 'johnsonsb.kb']) { const r = run(id, s.d, o); ok(r.status === 'ok' && Number.isFinite(r.logLik) && r.params.delta > 0, `${id}: bounds 0.01 cm from the data handled`); }
}

console.log(`dist P08: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
