// Additional estimation methods (stage P18, DIST_SPEC §1.1, P18). No DOM. None is switched on by default (optional), none
// enters the likelihood comparison (likelihoodMaximised = false), and a failed fit never falls back to another method.
//
//   L-moments  sample L-moments from probability-weighted moments (unbiased): b0 = mean, b1 = (1/n) Σ (j − 1)/(n − 1) x₍ⱼ₎,
//              ℓ1 = b0, ℓ2 = 2b1 − b0.
//     weibull.lmom  y = d − a (a fixed): c = −ln 2 / ln(1 − ℓ2/ℓ1), b = ℓ1 / Γ(1 + 1/c)  (from λ2/λ1 = 1 − 2^(−1/c))
//     gamma.lmom    λ2/λ1 = Γ(k + ½)/(√π Γ(k + 1)) solved exactly for k (decreasing in k: one root; Brent on ln k);
//                   θ = ℓ1/k. (Hosking's rational approximation used by lmomco is not used; the exact equation is.)
//   QME (general quantile matching): minimise Σ wᵢ [Q(pᵢ; θ) − q̂ᵢ]² over the free parameters, q̂ type-7 sample
//              quantiles at the chosen probabilities pᵢ with the chosen weights wᵢ (at least as many pᵢ as free parameters).
//   MGE (minimum distance): minimise the chosen distance KS D, Cramér–von Mises W² or Anderson–Darling A² (gof.js).
//   QME and MGE: Nelder–Mead on the log of the positive parameters (core/optim.js) from the moment estimate; for the
//   normal and the fixed-bound beta and gamma (the families the method matrix lists).
import { lnGamma } from '../../core/special.js';
import { brent } from '../../core/roots.js';
import { nelderMead } from '../../core/optim.js';
import { checkBasic, meanVar } from './common.js';
import { weibull } from '../families/weibull.js';
import { gamma } from '../families/gamma.js';
import { normal } from '../families/normal.js';
import { beta } from '../families/beta.js';
import { checkBounds, boundProblems, betaFromMoments } from './beta.js';
import { ks, ad, cvm, logLik } from '../gof.js';
import { quantile7 } from '../data.js';

const fin = x => typeof x === 'number' && Number.isFinite(x);
const NM = { step: 0.2, ftol: 1e-13, xtol: 1e-9 };
/** Sample L-moments ℓ1, ℓ2 (unbiased, via probability-weighted moments). */
export function sampleLmoments(d) {
  const s = [...d].sort((a, b) => a - b), n = s.length; let b1 = 0, b0 = 0;
  for (let j = 0; j < n; j++) { b0 += s[j]; b1 += j / (n - 1) * s[j]; }
  b0 /= n; b1 /= n;
  return { l1: b0, l2: 2 * b1 - b0 };
}
const LOC = { key: 'a', type: 'fixed-param', param: 'a', policies: ['zero', 'user'] };

export function fitWeibullLmom(d, opts = {}) {
  const a = opts.a ?? 0, s0 = checkBasic(d), base = { settings: {}, warnings: s0.notices, fixed: { a: { value: a, origin: a === 0 ? 'zero' : 'user' } }, free: ['b', 'c'] };
  const below = d.filter(v => !(v > a)), problems = [...(below.length ? [{ code: 'd.le.a', count: below.length, example: below[0], a }] : []), ...s0.problems];
  if (problems.length) return { ...base, status: 'invalid', problems };
  const { l1, l2 } = sampleLmoments(d.map(v => v - a)), t = l2 / l1;
  base.targets = { l1, l2, ratio: t, of: 'd - a' };
  if (!(t > 0 && t < 1)) return { ...base, status: 'invalid', problems: [{ code: 'lmom.ratio', t }] };
  const c = -Math.LN2 / Math.log(1 - t), b = l1 / Math.exp(lnGamma(1 + 1 / c)), p = { a, b, c };
  if (!(fin(b) && b > 0 && fin(c) && c > 0)) return { ...base, status: 'boundary', warnings: [...base.warnings, { code: 'lmom.overflow', t }] };
  return { ...base, status: 'ok', params: p, logLik: logLik(weibull, p, d), convergence: { iter: 0 } };
}
export const K_RANGE = [1e-4, 1e8];
const lmomGammaRatio = k => Math.exp(lnGamma(k + 0.5) - lnGamma(k + 1) - 0.5 * Math.log(Math.PI));
export function fitGammaLmom(d) {
  const s0 = checkBasic(d), base = { settings: {}, warnings: s0.notices };
  const nonpos = d.filter(v => !(v > 0)), problems = [...(nonpos.length ? [{ code: 'd.nonpos', count: nonpos.length, example: nonpos[0] }] : []), ...s0.problems];
  if (problems.length) return { ...base, status: 'invalid', problems };
  const { l1, l2 } = sampleLmoments(d), t = l2 / l1;
  base.targets = { l1, l2, ratio: t };
  if (!(t > 0 && t < 1)) return { ...base, status: 'invalid', problems: [{ code: 'lmom.ratio', t }] };
  const f = u => Math.log(lmomGammaRatio(Math.exp(u))) - Math.log(t), L = Math.log(K_RANGE[0]), H = Math.log(K_RANGE[1]);
  if (f(L) < 0 || f(H) > 0) return { ...base, status: 'boundary', warnings: [...base.warnings, { code: 'lmom.kbound', t }] };
  const r = brent(f, L, H, { xtol: 1e-15 });
  if (r.status !== 'ok') return { ...base, status: 'noconverge', convergence: { iter: r.iter } };
  const k = Math.exp(r.root), p = { k, theta: l1 / k };
  return { ...base, status: 'ok', params: p, logLik: logLik(gamma, p, d), convergence: { iter: r.iter, interval: K_RANGE } };
}

/* ---------------- QME and MGE ---------------- */
/** Free parameters of a family on an unconstrained scale; start from the moment estimate. */
const SPEC = {
  normal: { free: ['mu', 'sigma'], to: p => [p.mu, Math.log(p.sigma)], from: (x, o) => ({ mu: x[0], sigma: Math.exp(x[1]) }), start: d => { const { m, v } = meanVar(d); return { mu: m, sigma: Math.sqrt(v) }; }, fam: normal },
  gamma: { free: ['k', 'theta'], to: p => [Math.log(p.k), Math.log(p.theta)], from: x => ({ k: Math.exp(x[0]), theta: Math.exp(x[1]) }), start: d => { const { m, v } = meanVar(d); return { k: m * m / v, theta: v / m }; }, fam: gamma },
  beta: { free: ['alpha', 'beta'], to: p => [Math.log(p.alpha), Math.log(p.beta)], from: (x, o) => ({ L: o.L, U: o.U, alpha: Math.exp(x[0]), beta: Math.exp(x[1]) }), start: (d, o) => { const { m, v } = meanVar(d), r = betaFromMoments(m, v, o.L, o.U); return r.problem ? null : { L: o.L, U: o.U, ...r }; }, fam: beta },
};
/** Checks shared by QME and MGE: sample, support, bounds (beta). */
function prepare(famId, d, opts) {
  const s0 = checkBasic(d), problems = [...s0.problems], base = { warnings: s0.notices };
  if (famId === 'gamma') { const bad = d.filter(v => !(v > 0)); if (bad.length) problems.unshift({ code: 'd.nonpos', count: bad.length, example: bad[0] }); }
  if (famId === 'beta') { const b = checkBounds(opts); problems.unshift(...b); if (!b.length) problems.unshift(...boundProblems(d, opts.L, opts.U));
    base.fixed = { L: { value: opts.L, origin: 'user' }, U: { value: opts.U, origin: 'user' } }; base.free = ['alpha', 'beta']; }
  return { problems, base };
}
const DEFAULT_PROBS = [0.1, 0.25, 0.5, 0.75, 0.9];
/** Probabilities and weights of a QME: strictly increasing in (0, 1), at least `k` of them, weights positive and as many. */
export function checkQME(o, k = 2) {
  const p = o.probs ?? DEFAULT_PROBS, w = o.weights ?? p.map(() => 1);
  if (!Array.isArray(p) || p.some(v => !(v > 0 && v < 1))) return [{ code: 'qme.probs' }];
  for (let i = 1; i < p.length; i++) if (!(p[i] > p[i - 1])) return [{ code: 'qme.order' }];
  if (p.length < k) return [{ code: 'qme.few', k, m: p.length }];
  if (!Array.isArray(w) || w.length !== p.length || w.some(v => !(v > 0))) return [{ code: 'qme.weights', m: p.length }];
  return [];
}
function minimise(famId, d, opts, objective, settings, extra = {}) {
  const sp = SPEC[famId], P = prepare(famId, d, opts), base = { ...P.base, settings, ...extra };
  if (P.problems.length) return { ...base, status: 'invalid', problems: P.problems };
  const p0 = sp.start(d, opts); if (!p0) return { ...base, status: 'invalid', problems: [{ code: 'start.none' }] };
  const f = x => { const p = sp.from(x, opts), v = objective(p); return Number.isFinite(v) ? v : Infinity; };
  const r = nelderMead(f, sp.to(p0), NM);   // the flat bottom of these objectives does not allow x spreads below ~1e-10 in floating point
  if (r.status !== 'ok') return { ...base, status: 'noconverge', convergence: { iter: r.iter, restarts: r.restarts, start: 'moments' } };
  const p = sp.from(r.x, opts);
  return { ...base, status: 'ok', params: p, logLik: logLik(sp.fam, p, d), objective: { name: settings.gof ? 'mge.' + settings.gof : 'qme', value: r.f },
    convergence: { iter: r.iter, restarts: r.restarts, start: 'moments', value: r.f, tol: { f: NM.ftol, x: NM.xtol, scale: 'log of positive parameters' } } };
}
export function fitQME(famId, d, opts = {}) {
  const probs = opts.probs ?? DEFAULT_PROBS, weights = opts.weights ?? probs.map(() => 1), settings = { probs, weights, quantile: 'type7' };
  const bad = checkQME({ probs, weights }, SPEC[famId].free.length); if (bad.length) return { settings, status: 'invalid', problems: bad };
  const s = [...d].sort((a, b) => a - b), q = probs.map(p => quantile7(s, p)), fam = SPEC[famId].fam;
  if (new Set(q).size < SPEC[famId].free.length) return { settings, targets: { quantiles: q }, status: 'invalid', problems: [{ code: 'qme.ident', unique: new Set(q).size }] };
  return minimise(famId, d, opts, p => probs.reduce((acc, pi, i) => acc + weights[i] * (fam.quantile(pi, p) - q[i]) ** 2, 0), settings, { targets: { probs, quantiles: q } });
}
export const GOFS = ['ks', 'cvm', 'ad'];
export function fitMGE(famId, d, opts = {}) {
  const g = GOFS.includes(opts.gof) ? opts.gof : 'cvm', fam = SPEC[famId].fam, fn = { ks, cvm, ad }[g];
  return minimise(famId, d, opts, p => fn(fam, p, d), { gof: g });
}

/* ---------------- registry entries ---------------- */
const BOUNDS = [{ key: 'L', type: 'fixed-param', param: 'L', policies: ['user'] }, { key: 'U', type: 'fixed-param', param: 'U', policies: ['user'] }];
const QOPTS = [{ key: 'probs', type: 'list', default: DEFAULT_PROBS }, { key: 'weights', type: 'list', default: null }];
const GOPT = { key: 'gof', type: 'choice', values: GOFS, default: 'cvm' };
const common = { kind: 'fit', dataTypes: ['raw'], likelihoodMaximised: false, optional: true };
export const weibullLmom = { ...common, id: 'weibull.lmom', family: 'weibull', estimator: 'lmom', solver: 'closed form', options: [LOC], source: 'weibull.lmom', run: (i, o = {}) => fitWeibullLmom(i.d, o) };
export const gammaLmom = { ...common, id: 'gamma.lmom', family: 'gamma', estimator: 'lmom', solver: 'brent', options: [], source: 'gamma.lmom', run: i => fitGammaLmom(i.d) };
const qme = (fam, extra = []) => ({ ...common, id: fam + '.qme', family: fam, estimator: 'qme', solver: 'nelder-mead', options: [...extra, ...QOPTS], checkOptions: o => [...(fam === 'beta' ? checkBounds(o) : []), ...checkQME({ probs: o.probs ?? DEFAULT_PROBS, weights: o.weights ?? (o.probs ?? DEFAULT_PROBS).map(() => 1) })], source: fam + '.qme', run: (i, o = {}) => fitQME(fam, i.d, o) });
const mge = (fam, extra = []) => ({ ...common, id: fam + '.mge', family: fam, estimator: 'mge', solver: 'nelder-mead', options: [...extra, GOPT], checkOptions: o => fam === 'beta' ? checkBounds(o) : [], source: fam + '.mge', run: (i, o = {}) => fitMGE(fam, i.d, o) });
export const generalMethods = [weibullLmom, gammaLmom, qme('normal'), mge('normal'), qme('gamma'), mge('gamma'), { ...qme('beta', BOUNDS), needsInput: true }, { ...mge('beta', BOUNDS), needsInput: true }];
