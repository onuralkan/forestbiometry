// Johnson SB with FIXED, user-given bounds ξ and λ (support ξ < d < ξ + λ; DIST_SPEC §3.7, stage P08). No DOM.
// Only the two shapes γ, δ are estimated. None of these is the joint four-parameter ML estimate, and the bounds are
// never set from the sample or from package constants: the user enters ξ and λ (same policy as the beta, P04).
//   t = ln[(d − ξ)/(ξ + λ − d)]
//   jsb.cml   conditional ML given ξ, λ:  δ = 1/s_t, γ = −t̄/s_t,  s_t² = Σ(t − t̄)²/n (divisor n)
//   jsb.kb    two percentiles with the pair p = 0.50, r = 0.95 (Knoebel–Burkhart; ForestFit "KB")
//   jsb.pct   two percentiles, user-defined pair 0 < p < r < 1 (general percentile method)
//             t_q = logit[(Q_q − ξ)/λ], z_q = Φ⁻¹(q):  δ = (z_r − z_p)/(t_r − t_p), γ = z_p − δ t_p;  sample Q: type 7
//   jsb.mom   moments: E[D] = m and Var[D] = v solved for (γ, δ) numerically. For fixed δ, E[Y] decreases in γ
//             (Brent on γ); along that curve Var[Y] decreases in δ (Brent on ln δ). Requires the same admissibility as
//             the beta: 0 < μ_y < 1, 0 < v_y < μ_y(1 − μ_y), with μ_y = (m − ξ)/λ, v_y = v/λ².
import { normQuantile } from '../../core/stats.js';
import { brent } from '../../core/roots.js';
import { checkBasic, meanVar, VAR_DIVISOR } from './common.js';
import { johnsonsb, sbMomentsY } from '../families/johnsonsb.js';
import { boundProblems } from './beta.js';
import { checkPercentiles } from './weibull.js';
import { quantile7 } from '../data.js';
import { logLik } from '../gof.js';

export const KB = { p: 0.5, r: 0.95 };
export const DELTA_RANGE = [1e-3, 1e4];               // tool rule for the moment solver
const fin = x => typeof x === 'number' && Number.isFinite(x);
/** Option check (also used by the interface): ξ ≥ 0, λ > 0, both given. */
export function checkSB(o) {
  if (!fin(o.xi) || !fin(o.lambda)) return [{ code: 'sb.missing' }];
  if (o.xi < 0) return [{ code: 'sb.xineg', xi: o.xi }];
  if (!(o.lambda > 0)) return [{ code: 'sb.lambda', lambda: o.lambda }];
  return [];
}
function prepare(d, opts, settings) {
  const xi = opts.xi, lam = opts.lambda, fixed = { xi: { value: xi, origin: 'user' }, lambda: { value: lam, origin: 'user' } };
  const s0 = checkBasic(d), base = { fixed, free: ['gamma', 'delta'], settings: { boundPolicy: 'user', ...settings }, warnings: s0.notices };
  const problems = [...checkSB(opts), ...(fin(xi) && fin(lam) && lam > 0 ? boundProblems(d, xi, xi + lam) : []), ...s0.problems];
  return { xi, lam, U: xi + lam, base, problems };
}
const tOf = (v, xi, U) => Math.log((v - xi) / (U - v));
const result = (P, g, dl, d, extra = {}) => { const p = { xi: P.xi, lambda: P.lam, gamma: g, delta: dl }; return { ...P.base, status: 'ok', params: p, logLik: logLik(johnsonsb, p, d), ...extra }; };

export function fitSBcml(d, opts = {}) {
  const P = prepare(d, opts, {}); if (P.problems.length) return { ...P.base, status: 'invalid', problems: P.problems };
  const t = d.map(v => tOf(v, P.xi, P.U)), { m, v } = meanVar(t, 'n'), s = Math.sqrt(v);
  P.base.targets = { meanT: m, varT: v, varDivisor: 'n' };
  if (!(s > 0) || !fin(s)) return { ...P.base, status: 'invalid', problems: [{ code: 'sb.degenerate' }] };
  const r = result(P, -m / s, 1 / s, d); r.objective = { name: 'logLik', value: r.logLik }; r.convergence = { iter: 0 }; return r;
}
function fitPct(d, opts, p, r, kind) {
  const P = prepare(d, opts, { p, r, quantile: 'type7', pair: kind });
  const problems = [...P.problems, ...checkPercentiles(p, r)];
  if (problems.length) return { ...P.base, status: 'invalid', problems };
  const srt = [...d].sort((a, b) => a - b), qp = quantile7(srt, p), qr = quantile7(srt, r);
  P.base.targets = { qp, qr, p, r, quantile: 'type7' };
  const tp = tOf(qp, P.xi, P.U), tr = tOf(qr, P.xi, P.U);
  if (!(tr > tp)) return { ...P.base, status: 'invalid', problems: [{ code: 'q.tied', p, r, q: qp }] };
  const zp = normQuantile(p), zr = normQuantile(r), dl = (zr - zp) / (tr - tp);
  return { ...result(P, zp - dl * tp, dl, d), convergence: { iter: 0 } };
}
export const fitSBkb = (d, opts = {}) => fitPct(d, opts, KB.p, KB.r, 'kb');
export const fitSBpct = (d, opts = {}) => fitPct(d, opts, opts.p ?? 0.25, opts.r ?? 0.75, 'user');

/** (γ, δ) with E[Y] = mu, Var[Y] = vy; { problem } or { status, gamma, delta, iter }. */
export function sbFromMoments(mu, vy) {
  if (!(mu > 0 && mu < 1)) return { problem: { code: 'sb.mean' } };
  if (!(vy > 0 && vy < mu * (1 - mu))) return { problem: { code: 'sb.var' } };
  let inner = 0;
  const gammaFor = dl => {                                   // E[Y] decreases in γ; bracket from the logistic of the mean
    const g0 = -dl * Math.log(mu / (1 - mu)), f = g => sbMomentsY(g, dl).m1 - mu;
    let lo = g0 - 1, hi = g0 + 1, k = 0;
    while (f(lo) < 0 && k++ < 60) lo -= 2 ** k; k = 0;
    while (f(hi) > 0 && k++ < 60) hi += 2 ** k;
    const r = brent(f, lo, hi, { xtol: 1e-14 }); inner += r.iter; return r.status === 'ok' ? r.root : NaN;
  };
  const h = u => { const dl = Math.exp(u), g = gammaFor(dl); return fin(g) ? sbMomentsY(g, dl).v - vy : NaN; };   // decreasing in u
  const L = Math.log(DELTA_RANGE[0]), H = Math.log(DELTA_RANGE[1]), hl = h(L), hh = h(H);
  if (!fin(hl) || !fin(hh)) return { status: 'noconverge', iter: 0 };
  if (hl < 0) return { status: 'boundary', side: 'below', iter: 0 };
  if (hh > 0) return { status: 'boundary', side: 'above', iter: 0 };
  const r = brent(h, L, H, { xtol: 1e-14 });
  if (r.status !== 'ok') return { status: 'noconverge', iter: r.iter };
  const dl = Math.exp(r.root), g = gammaFor(dl);
  return fin(g) ? { status: 'ok', gamma: g, delta: dl, iter: r.iter, inner } : { status: 'noconverge', iter: r.iter };
}
export function fitSBmom(d, opts = {}) {
  const div = opts.varDivisor === 'n-1' ? 'n-1' : 'n', P = prepare(d, opts, { varDivisor: div });
  if (div === 'n-1') P.base.warnings = [...P.base.warnings, { code: 'var.n1s' }];
  if (P.problems.length) return { ...P.base, status: 'invalid', problems: P.problems };
  const { m, v } = meanVar(d, div), mu = (m - P.xi) / P.lam, vy = v / (P.lam * P.lam);
  P.base.targets = { mean: m, variance: v, varDivisor: div };
  const s = sbFromMoments(mu, vy);
  if (s.problem) return { ...P.base, status: 'invalid', problems: [s.problem] };
  const conv = { iter: s.iter, inner: s.inner ?? null, tol: 1e-14, interval: DELTA_RANGE, quadrature: 'Gauss–Legendre 10 × panels, |z| ≤ 10' };
  if (s.status !== 'ok') return { ...P.base, status: s.status, convergence: conv, warnings: [...P.base.warnings, { code: s.status === 'boundary' ? 'sb.boundary' : 'sb.noconverge', side: s.side ?? null }] };
  return { ...result(P, s.gamma, s.delta, d), convergence: conv };
}

const BOUNDS = [{ key: 'xi', type: 'fixed-param', param: 'xi', policies: ['user'] }, { key: 'lambda', type: 'fixed-param', param: 'lambda', policies: ['user'] }];
const base = { family: 'johnsonsb', kind: 'fit', dataTypes: ['raw'], needsInput: true };
export const sbCML = { ...base, id: 'johnsonsb.cml', estimator: 'ml', solver: 'closed form', likelihoodMaximised: true, options: BOUNDS, checkOptions: checkSB, source: 'johnsonsb.cml', run: (i, o = {}) => fitSBcml(i.d, o) };
export const sbMOM = { ...base, id: 'johnsonsb.mom', estimator: 'mom', solver: 'brent', likelihoodMaximised: false, options: [...BOUNDS, VAR_DIVISOR], checkOptions: checkSB, source: 'johnsonsb.mom', run: (i, o = {}) => fitSBmom(i.d, o) };
export const sbKB = { ...base, id: 'johnsonsb.kb', estimator: 'quantile', solver: 'closed form', likelihoodMaximised: false, options: BOUNDS, checkOptions: checkSB, source: 'johnsonsb.kb', run: (i, o = {}) => fitSBkb(i.d, o) };
export const sbPCT = { ...base, id: 'johnsonsb.pct', estimator: 'quantile', solver: 'closed form', likelihoodMaximised: false,
  options: [...BOUNDS, { key: 'p', type: 'prob', default: 0.25 }, { key: 'r', type: 'prob', default: 0.75 }],
  checkOptions: o => [...checkSB(o), ...checkPercentiles(o.p ?? 0.25, o.r ?? 0.75)], source: 'johnsonsb.pct', run: (i, o = {}) => fitSBpct(i.d, o) };
