// Weibull direct estimation from measured diameters (docs/DIST_SPEC.md §3.5, stage P05). No DOM.
// Parameters: a = location (cm), b > 0 = scale (cm), c > 0 = shape;  F(d) = 1 − exp(−((d − a)/b)^c), d > a.
// The location is NEVER estimated: it is 0 (two-parameter form) or a value the user fixes. No free-location method.
// Method (estimation principle) and solver (numerical algorithm) are separate: the solver is reported, never chosen.
//
//   weibull.ml    maximum likelihood, location fixed          solver: geometric bisection on the profile score
//   weibull.mom   moments: mean and variance, location fixed  solver: geometric bisection on the CV² equation
//                 variance divisor n by default (DIST_SPEC §0, decision 2); n − 1 is an option and reproduces the
//                 published 1.0.0 tool exactly
//   weibull.pct   two sample percentiles p < r, location fixed  closed form (DIST_SPEC §3.6 C_{p,r}(a) and b)
//
// The ML and moment equations and their solver are those of the published tool (assets/lab/weibull/calc.js), ported
// here so that the engine does not depend on it (that file moves to legacy/ at 2.0.0).
import { lnGamma } from '../../core/special.js';
import { bisectMonotone } from '../../core/roots.js';
import { quantile7 } from '../data.js';
import { checkBasic, VAR_DIVISOR } from './common.js';
export { FEW_UNIQUE } from './common.js';

export const C_RANGE = [0.01, 1000];               // search interval for the shape c (tool rule)
export const C_RTOL = 1e-14;                       // relative width of the final bisection interval
export const DUBEY = { p: 0.24, r: 0.93 };         // Dubey (1967): most efficient pair for scale and shape together (rounded)

/* ---------------- sample checks (same rules as the published tool) ---------------- */
export function checkSample(d, a = 0) {
  const s = checkBasic(d), problems = [...s.problems];
  if (!Number.isFinite(a)) problems.push({ code: 'a.bad' });
  else if (s.n && !(s.min > a)) problems.push({ code: 'a.notbelow', a, min: s.min });
  if (Number.isFinite(a) && a < 0) problems.push({ code: 'a.negative', a });
  return { ...s, problems };
}
function logLik(d, a, b, c) {
  let s = 0;
  for (const v of d) { const t = (v - a) / b; s += Math.log(c / b) + (c - 1) * Math.log(t) - t ** c; }
  return s;
}

/* ---------------- location policy ---------------- */
/** opts.a: fixed location (cm); 0 or absent = two-parameter form. opts.aOrigin = 'user' marks a user-entered 0. */
function location(opts) {
  const a = opts.a ?? 0, user = (opts.a != null && opts.a !== 0) || opts.aOrigin === 'user';
  return { a, fixed: { a: { value: a, origin: user ? 'user' : 'zero' } } };
}
const shapeConv = r => ({ iter: r.iter, tol: C_RTOL, tolKind: 'relative', interval: C_RANGE });
function shapeFailure(r, base) {
  const status = r.status === 'below' || r.status === 'above' ? 'boundary' : 'noconverge';
  return { ...base, status, convergence: shapeConv(r), warnings: [...base.warnings, { code: status === 'boundary' ? 'c.boundary' : 'c.noconverge', side: r.status, c: r.root }] };
}

/* ---------------- maximum likelihood, location fixed ---------------- */
/**
 * Profile score for c (x = d − a):  g(c) = Σ x^c ln x / Σ x^c − 1/c − mean(ln x) = 0;  b = (mean x^c)^(1/c).
 * g increases in c; the root must lie inside C_RANGE, otherwise the result is a boundary state without parameters.
 */
export function fitML(d, opts = {}) {
  const { a, fixed } = location(opts), s = checkSample(d, a), base = { fixed, settings: {}, warnings: s.notices };
  if (s.problems.length) return { ...base, status: 'invalid', problems: s.problems };
  const x = d.map(v => v - a), lx = x.map(Math.log), mx = Math.max(...x), y = x.map(v => v / mx);
  const mlx = lx.reduce((p, q) => p + q, 0) / x.length;
  const g = c => { let sy = 0, syl = 0; for (let i = 0; i < y.length; i++) { const t = y[i] ** c; sy += t; syl += t * lx[i]; } return syl / sy - 1 / c - mlx; };
  const r = bisectMonotone(g, C_RANGE[0], C_RANGE[1], { rtol: C_RTOL });
  if (r.status !== 'ok') return shapeFailure(r, base);
  const c = r.root, b = mx * (y.reduce((p, q) => p + q ** c, 0) / y.length) ** (1 / c), ll = logLik(d, a, b, c);
  return { ...base, status: 'ok', params: { a, b, c }, logLik: ll, objective: { name: 'logLik', value: ll }, convergence: { ...shapeConv(r), score: g(c) } };
}

/* ---------------- moments (mean and variance), location fixed ---------------- */
/**
 * Match the mean x̄ and the variance v of x = d − a:  Γ(1 + 2/c)/Γ²(1 + 1/c) − 1 = v/x̄² (decreasing in c);
 * b = x̄/Γ(1 + 1/c).  v = Σ(x − x̄)²/n by default (moment variance, DIST_SPEC §2.1); opts.varDivisor = 'n-1' uses
 * the sample variance s² (the published 1.0.0 tool). The two differ only by the factor (n − 1)/n on v.
 */
export function fitMoments(d, opts = {}) {
  const { a, fixed } = location(opts), div = opts.varDivisor === 'n-1' ? 'n-1' : 'n';
  const s = checkSample(d, a), base = { fixed, settings: { varDivisor: div }, warnings: [...s.notices, ...(div === 'n-1' ? [{ code: 'var.n1' }] : [])] };
  if (s.problems.length) return { ...base, status: 'invalid', problems: s.problems };
  const x = d.map(v => v - a), n = x.length, m = x.reduce((p, q) => p + q, 0) / n;
  const v = x.reduce((p, q) => p + (q - m) ** 2, 0) / (div === 'n-1' ? n - 1 : n), cv2 = v / (m * m);
  base.targets = { mean: m + a, variance: v, varDivisor: div };
  const h = c => Math.exp(lnGamma(1 + 2 / c) - 2 * lnGamma(1 + 1 / c)) - 1 - cv2;
  const r = bisectMonotone(h, C_RANGE[0], C_RANGE[1], { rtol: C_RTOL });
  if (r.status !== 'ok') return shapeFailure(r, base);
  const c = r.root, b = m / Math.exp(lnGamma(1 + 1 / c));
  return { ...base, status: 'ok', params: { a, b, c }, logLik: logLik(d, a, b, c), convergence: shapeConv(r) };
}

/* ---------------- two percentiles, location fixed ---------------- */
/**
 * Closed form (DIST_SPEC §3.6), A_q = −ln(1 − q), 0 < p < r < 1:
 *   c = ln(A_r/A_p) / ln[(Q_r − a)/(Q_p − a)],   b = (Q_p − a)/A_p^(1/c).
 * Returns null where it is undefined (Q_r ≤ Q_p or Q_p ≤ a).
 */
export function percentileParams(qp, qr, p, r, a = 0) {
  if (!(qp > a) || !(qr > qp) || !(p > 0 && p < r && r < 1)) return null;
  const Ap = -Math.log1p(-p), Ar = -Math.log1p(-r), c = Math.log(Ar / Ap) / Math.log((qr - a) / (qp - a));
  return { a, b: (qp - a) / Ap ** (1 / c), c };
}
const prob = v => typeof v === 'number' && v > 0 && v < 1;
/** Option check shared with the interface: returns problem codes for p and r. */
export function checkPercentiles(p, r) {
  if (!prob(p) || !prob(r)) return [{ code: 'pr.range', p, r }];
  if (!(p < r)) return [{ code: 'pr.order', p, r }];
  return [];
}
/** Sample percentiles: Hyndman and Fan type 7 (R default). Defaults p = 0.24, r = 0.93 (Dubey 1967). */
export function fitPercentiles(d, opts = {}) {
  const { a, fixed } = location(opts), p = opts.p ?? DUBEY.p, r = opts.r ?? DUBEY.r;
  const s = checkSample(d, a), base = { fixed, settings: { p, r, quantile: 'type7' }, warnings: s.notices };
  const problems = [...s.problems, ...checkPercentiles(p, r)];
  if (problems.length) return { ...base, status: 'invalid', problems };
  const srt = [...d].sort((u, v) => u - v), qp = quantile7(srt, p), qr = quantile7(srt, r);
  base.targets = { qp, qr, p, r, quantile: 'type7' };
  const est = percentileParams(qp, qr, p, r, a);
  if (!est) return { ...base, status: 'invalid', problems: [{ code: 'q.tied', p, r, q: qp }] };
  return { ...base, status: 'ok', params: est, logLik: logLik(d, a, est.b, est.c), convergence: { iter: 0 } };
}

/* ---------------- registry entries ---------------- */
const LOC = { key: 'a', type: 'fixed-param', param: 'a', policies: ['zero', 'user'] };
export const weibullML = {
  id: 'weibull.ml', family: 'weibull', kind: 'fit', estimator: 'ml', solver: 'bisection', dataTypes: ['raw'], likelihoodMaximised: true,
  options: [LOC], source: 'weibull.ml', run: (input, opts = {}) => fitML(input.d, opts),
};
export const weibullMoments = {
  id: 'weibull.mom', family: 'weibull', kind: 'fit', estimator: 'mom', solver: 'bisection', dataTypes: ['raw'], likelihoodMaximised: false,
  options: [LOC, VAR_DIVISOR], source: 'weibull.mom',
  run: (input, opts = {}) => fitMoments(input.d, opts),
};
export const weibullPercentiles = {
  id: 'weibull.pct', family: 'weibull', kind: 'fit', estimator: 'quantile', solver: 'closed form', dataTypes: ['raw'], likelihoodMaximised: false,
  options: [LOC, { key: 'p', type: 'prob', default: DUBEY.p }, { key: 'r', type: 'prob', default: DUBEY.r }], source: 'weibull.pct',
  checkOptions: o => checkPercentiles(o.p ?? DUBEY.p, o.r ?? DUBEY.r), run: (input, opts = {}) => fitPercentiles(input.d, opts),
};
