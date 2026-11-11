// Diameter distribution engine, stage P04: location–scale beta with fixed user bounds (family, ML, moments, policy).
//   node tests/dist/test_p04.mjs
// Reference: tests/ref/dist_p04.json (tests/ref/make_dist_p04.py: scipy.stats.beta(α, β, loc = L, scale = U − L),
// beta.fit(floc, fscale), Nelder–Mead, least_squares, scipy.special.polygamma).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as D from '../../assets/lab/dist/index.js';
import * as BF from '../../assets/lab/dist/fit/beta.js';
import { trigamma } from '../../assets/lab/core/special.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-12) => ok(a === b || (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1e-300)), `${m}: got ${a} expected ${b}`);
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/dist_p04.json'), 'utf8'));
const FX = JSON.parse(readFileSync(path.join(root, 'tests/weibull/fixture.json'), 'utf8')).samples;
const BE = D.family('beta');
const run = (id, d, o) => D.runMethod(id, { d }, o);
const thrown = f => { try { f(); return null; } catch (e) { return e.code || e.message; } };

/* 1. registry: one beta model, fixed bounds, two methods; no "generalized beta" duplicate, no free bounds */
eq(BE.params.map(p => [p.key, p.role, p.unit]), [['L', 'lower', 'cm'], ['U', 'upper', 'cm'], ['alpha', 'shape', null], ['beta', 'shape', null]], 'beta parameters');
eq(D.methodsFor({ family: 'beta' }).filter(m => !m.truncation).map(m => [m.id, m.kind, m.estimator, m.solver, m.likelihoodMaximised, m.needsInput]),
  [['beta.ml', 'fit', 'ml', 'newton', true, true], ['beta.mom', 'fit', 'mom', 'closed form', false, true]], 'beta methods (bounds required)');
ok(!D.families().some(f => /gb1|gb2|genbeta|generali/i.test(f.id)), 'no second (generalized) beta model');
ok(D.methodsFor({ family: 'beta' }).every(m => m.options.filter(o => o.key === 'L' || o.key === 'U').every(o => o.type === 'fixed-param' && o.policies.join() === 'user')), 'bounds are fixed parameters with the user policy only');
eq(thrown(() => D.checkParams(BE, { L: 10, U: 10, alpha: 1, beta: 1 })), 'param.invalid', 'L < U enforced by the family');
eq(thrown(() => D.checkParams(BE, { L: 0, U: 10, alpha: 0, beta: 1 })), 'param.invalid', 'α > 0 enforced');
ok(D.checkParams(BE, { L: 0, U: 10, alpha: 0.5, beta: 3 }) === true, 'valid beta parameters');

/* 2. trigamma */
R.poly.x.forEach((x, i) => near(trigamma(x), R.poly.trigamma[i], `ψ′(${x})`, 1e-13));

/* 3. family functions against SciPy */
for (const g of R.beta) {
  const p = { L: g.L, U: g.U, alpha: g.alpha, beta: g.beta }, tag = `beta(${g.alpha}, ${g.beta}; ${g.L}, ${g.U})`, tol = g.alpha >= 40 ? 1e-10 : 2e-12;
  g.x.forEach((x, i) => { for (const f of ['pdf', 'logpdf', 'cdf', 'logcdf', 'sf', 'logsf']) {
    if (g[f][i] == null) { ok(f.startsWith('log') && Number.isFinite(BE[f](x, p)) && BE[f](x, p) < -700, `${tag} ${f}(${x}): finite where SciPy underflows (${BE[f](x, p)})`); continue; }
    near(BE[f](x, p), g[f][i], `${tag} ${f}(${x})`, f.startsWith('log') ? tol : tol * 10); } });
  g.q.forEach((q, i) => near(BE.quantile(q, p), g.ppf[i], `${tag} quantile(${q})`, 1e-12));
  near(BE.quantile(1 - 1e-9, p), g.isf_small[0], `${tag} upper quantile 1 − 1e-9`, 1e-12);
  near(BE.mean(p), g.mean, `${tag} mean`, 1e-14); near(BE.variance(p), g.var, `${tag} variance`, 1e-13);
  ok(BE.pdf(g.L, p) === 0 && BE.pdf(g.U, p) === 0 && BE.cdf(g.L, p) === 0 && BE.cdf(g.U + 1, p) === 1 && BE.logpdf(g.L - 1, p) === -Infinity && BE.quantile(0, p) === g.L && BE.quantile(1, p) === g.U, `${tag} outside the open support`);
}
{ const p = { L: 5, U: 45, alpha: 2, beta: 5 };                                    // DIST_SPEC §8.1
  near(BE.pdf(20, p), 0.042915344238, '§8.1 beta pdf(20)', 1e-11); near(BE.cdf(20, p), 0.725818634033, '§8.1 beta cdf(20)', 1e-11);
  near(BE.quantile(0.5, p), 15.577999331826, '§8.1 beta median', 1e-12); near(BE.pdf(20, p), R.spec81.pdf, '§8.1 = SciPy', 1e-14); }

/* 4. fits against SciPy */
const sample = name => R.sim[name] ? { d: R.sim[name].d, L: R.sim[name].L, U: R.sim[name].U } : { d: FX[name], L: R.bounds[name][0], U: R.bounds[name][1] };
for (const [name, f] of Object.entries(R.fits)) {
  const { d, L, U } = sample(name), o = { L, U }, big = f.ml.alpha > 20, ml = run('beta.ml', d, o);
  ok(ml.status === 'ok', `${name} ML ok`);
  near(ml.params.alpha, f.ml.alpha_fit, `${name} ML α = beta.fit`, 2e-7); near(ml.params.beta, f.ml.beta_fit, `${name} ML β = beta.fit`, 2e-7);
  near(ml.params.alpha, f.ml.alpha, `${name} ML α = Nelder–Mead`, big ? 2e-5 : 2e-6); near(ml.params.beta, f.ml.beta, `${name} ML β = Nelder–Mead`, big ? 2e-5 : 2e-6);
  ok(ml.logLik >= D.gof.logLik(BE, { L, U, alpha: f.ml.alpha, beta: f.ml.beta }, d) - 1e-11 && ml.logLik >= D.gof.logLik(BE, { L, U, alpha: f.ml.alpha_fit, beta: f.ml.beta_fit }, d) - 1e-11, `${name} ML ln L ≥ ln L at both SciPy estimates`);
  near(ml.logLik, f.ml.logLik_fit, `${name} ML ln L (diameter scale, −n ln S included) = SciPy`, 1e-11);
  { const S = U - L, ly = d.reduce((s, v) => s + (ml.params.alpha - 1) * Math.log((v - L) / S) + (ml.params.beta - 1) * Math.log((U - v) / S), 0);
    const lB = D.gof.logLik(BE, { L: 0, U: 1, alpha: ml.params.alpha, beta: ml.params.beta }, d.map(v => (v - L) / S));
    near(ml.logLik, lB - d.length * Math.log(S), `${name} ln L(d) = ln L(y) − n ln S`, 1e-11); void ly; }
  ok(Math.max(...ml.convergence.score.map(Math.abs)) < 1e-12 && ml.convergence.iter < 50, `${name} ML: score ≈ 0 after ${ml.convergence.iter} Newton steps`);
  eq([ml.fixed, ml.free, ml.settings.boundPolicy, ml.convergence.solver], [{ L: { value: L, origin: 'user' }, U: { value: U, origin: 'user' } }, ['alpha', 'beta'], 'user', 'newton'], `${name} ML record: bounds fixed by the user, two free shapes`);
  near(D.gof.ks(BE, ml.params, d), f.ml.ks, `${name} ML KS`, big ? 1e-4 : 1e-5); near(D.gof.ad(BE, ml.params, d), f.ml.ad, `${name} ML A²`, big ? 1e-3 : 1e-4);
  for (const [div, ref] of [['n', f.mom_n], ['n-1', f.mom_n1]]) {
    const r = run('beta.mom', d, { ...o, varDivisor: div });
    near(r.params.alpha, ref.alpha, `${name} MOM(${div}) α`, 1e-11); near(r.params.beta, ref.beta, `${name} MOM(${div}) β`, 1e-11);
    near(BE.mean(r.params), ref.mean, `${name} MOM(${div}) mean reproduced`, 1e-13); near(BE.variance(r.params), ref.var, `${name} MOM(${div}) variance reproduced`, 1e-12);
    near(r.logLik, ref.logLik, `${name} MOM(${div}) ln L`, 1e-10);
    eq([r.settings, r.objective, r.free], [{ boundPolicy: 'user', varDivisor: div }, null, ['alpha', 'beta']], `${name} MOM(${div}) record`);
    ok(ml.logLik >= r.logLik - 1e-10, `${name} ML ln L ≥ MOM(${div})`);
  }
}

/* 5. moments from known α, β, L, U are recovered */
for (const [a, b, L, U] of [[2, 5, 5, 45], [0.5, 0.5, 0, 1], [0.7, 1.4, 0, 50], [40, 60, 10, 40], [3, 1.2, 2, 30], [1, 1, 0, 10], [1e-3, 2e-3, 0, 5], [5e5, 2e5, 1, 2]]) {
  const p = { L, U, alpha: a, beta: b }, r = BF.betaFromMoments(BE.mean(p), BE.variance(p), L, U);
  near(r.alpha, a, `moments of beta(${a}, ${b}; ${L}, ${U}) → α`, a > 1e4 ? 1e-7 : 1e-11); near(r.beta, b, `… → β`, a > 1e4 ? 1e-7 : 1e-11);
}

/* 6. inadmissible bound/moment combinations never look like results */
eq(BF.betaFromMoments(50, 10, 0, 40).problem.code, 'beta.mean', 'mean above U');
eq(BF.betaFromMoments(0, 10, 0, 40).problem.code, 'beta.mean', 'mean on L');
eq(BF.betaFromMoments(20, 400, 0, 40).problem.code, 'beta.var', 'variance ≥ μ(1 − μ)S²');
eq(BF.betaFromMoments(20, 0, 0, 40).problem.code, 'beta.var', 'zero variance');
{ const d = [1, 9], o = { L: 0, U: 10 };                                           // s² = 32 > (m − L)(U − m) = 25
  const r1 = run('beta.mom', d, { ...o, varDivisor: 'n-1' }), r0 = run('beta.mom', d, o);
  ok(r1.status === 'invalid' && r1.problems[0].code === 'beta.var' && r1.params === null && r1.logLik === null, 'n − 1 variance beyond the beta limit: no estimate');
  ok(r0.status === 'ok', 'the same data with the moment variance (divisor n) is admissible'); }
for (const [o, code] of [[{}, 'bounds.missing'], [{ L: 0 }, 'bounds.missing'], [{ L: NaN, U: 60 }, 'bounds.missing'], [{ L: -1, U: 60 }, 'bounds.negative'], [{ L: 60, U: 60 }, 'bounds.order'], [{ L: 70, U: 60 }, 'bounds.order']])
  for (const id of ['beta.ml', 'beta.mom']) { const r = run(id, FX.w2, o); ok(r.status === 'invalid' && r.problems[0].code === code && r.params === null, `${id} ${JSON.stringify(o)}: ${code}`); }
{ // observations outside or exactly on a bound: reported with counts, never moved
  const d = [3, 5, 10, 20, 30, 40, 41, 41, 50], copy = [...d];
  for (const id of ['beta.ml', 'beta.mom']) {
    const r = run(id, d, { L: 5, U: 41 });
    const out = r.problems.find(p => p.code === 'bound.outside'), on = r.problems.find(p => p.code === 'bound.on');
    ok(r.status === 'invalid' && out && out.count === 2 && out.example === 3 && on && on.count === 3 && on.example === 5 && r.params === null, `${id}: 2 outside, 3 on the bounds, no estimate`);
  }
  eq(d, copy, 'data left untouched (no epsilon, no jitter)');
  const m = Math.min(...FX.w2), x = Math.max(...FX.w2), r = run('beta.ml', FX.w2, { L: m, U: x }), k = FX.w2.filter(v => v === m || v === x).length;
  ok(r.status === 'invalid' && r.problems[0].code === 'bound.on' && r.problems[0].count === k && k >= 2, 'sample minimum and maximum as bounds: observations on the bounds, refused (not turned into a support silently)');
}
for (const id of ['beta.ml', 'beta.mom']) for (const [d, code] of [[[20], 'n.few'], [[20, 20, 20], 'constant']]) { const r = run(id, d, { L: 0, U: 60 }); ok(r.status === 'invalid' && r.problems.some(p => p.code === code), `${id} ${JSON.stringify(d)}: ${code}`); }
{ // shapes below 1 (J- or U-shaped) and a very peaked sample both converge
  const r = run('beta.ml', R.sim.sim_beta_small_shape.d, { L: 0, U: 50 }); ok(r.status === 'ok' && r.params.alpha < 1, 'α < 1 solved');
  const u = run('beta.ml', [0.01, 0.02, 0.5, 9.97, 9.99, 9.995, 0.003, 9.9], { L: 0, U: 10 }); ok(u.status === 'ok' && u.params.alpha < 1 && u.params.beta < 1, 'U-shaped sample: α, β < 1');
}

console.log(`dist P04: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
