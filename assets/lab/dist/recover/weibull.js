// Weibull parameter recovery from summary targets, Poudel and Cao (2013) methods M2–M5 (DIST_SPEC §3.6, stage P06).
// Kind 'recover'. No DOM. a = location (cm), b = scale (cm), c = shape; G_r(c) = Γ(1 + r/c), A_p = −ln(1 − p).
//
//   weibull.m2   mean m and variance v        b = (m − a)/G1;  b²(G2 − G1²) = v solved for c
//   weibull.m3   Dq = q and variance v        b = B_q(c) = [−aG1 + √(a²G1² + G2(q² − a²))]/G2;  b²(G2 − G1²) = v for c
//   weibull.m4   Q31 and Q63                  c = ln(A.63/A.31)/ln[(Q63 − a)/(Q31 − a)],  b = (Q31 − a)/A.31^(1/c)
//   weibull.m5   Q50 and Q95                  the same with p = 0.50, r = 0.95
//
// Location policy (separate from the method, recorded in `fixed.a`):
//   'half-dmin'  a = 0.5 × Dmin, the policy of the source for M2–M9 (Dmin = smallest diameter of the stand; the source
//                calls it D0, the platform uses D0 for the dominant diameter). Dmin is a TARGET, not the theoretical
//                zeroth percentile Q(0) = a.
//   'user'       a given by the user (0 = two-parameter form). Not labelled as the source's policy.
// Variance: the moment variance v (divisor n); a sample variance s² (divisor n − 1) is converted, v = s²(n − 1)/n,
// and needs n. Every target carries its origin: 'measured' (from a plot) or 'predicted' (output of a stand model).
// Shape roots are searched on a geometric grid over C_RANGE and refined with Brent; all roots are kept. One root →
// 'ok'; none → 'invalid' (no solution in the interval); more than one → 'multiple' (candidates in diagnostics, no
// parameters: the method alone cannot choose). Every solution is checked by back-calculating the targets.
import { lnGamma } from '../../core/special.js';
import { brent } from '../../core/roots.js';
import { weibull } from '../families/weibull.js';
import { percentileParams } from '../fit/weibull.js';
import { quantile7 } from '../data.js';

export const C_RANGE = [0.05, 200];                 // shape search interval for the moment equations (tool rule)
export const GRID = 600;                            // geometric grid points for bracketing roots
export const RESID_TOL = 1e-9;                      // relative back-calculation tolerance for an accepted solution
const G = (r, c) => Math.exp(lnGamma(1 + r / c));
const fin = x => typeof x === 'number' && Number.isFinite(x);
const pos = x => fin(x) && x > 0;
export const PAIRS = { m4: [0.31, 0.63], m5: [0.5, 0.95] };
export const NEEDS = { m2: ['mean', 'variance'], m3: ['dq', 'variance'], m4: ['q31', 'q63'], m5: ['q50', 'q95'] };

/** All roots of f on [lo, hi] (geometric grid + Brent). Returns { roots, iter }. Exact zeros on the grid are kept. */
export function scanRoots(f, lo = C_RANGE[0], hi = C_RANGE[1], k = GRID) {
  const xs = Array.from({ length: k + 1 }, (_, i) => lo * (hi / lo) ** (i / k)), ys = xs.map(f), roots = []; let iter = 0;
  for (let i = 0; i < k; i++) {
    if (ys[i] === 0) { roots.push(xs[i]); continue; }
    if (fin(ys[i]) && fin(ys[i + 1]) && ys[i] * ys[i + 1] < 0) { const r = brent(f, xs[i], xs[i + 1], { xtol: 1e-15 }); iter += r.iter; if (r.status === 'ok') roots.push(r.root); }
  }
  if (ys[k] === 0) roots.push(xs[k]);
  const out = []; for (const r of roots) if (!out.length || Math.abs(r / out[out.length - 1] - 1) > 1e-9) out.push(r);   // merge repeated roots
  return { roots: out, iter };
}
/** Positive scale from Dq: B_q(c). Requires q > a ≥ 0. */
export function Bq(c, a, q) { const g1 = G(1, c), g2 = G(2, c); return (-a * g1 + Math.sqrt(a * a * g1 * g1 + g2 * (q * q - a * a))) / g2; }

/** Targets from the summary: numbers checked, variance converted to the moment variance. { t, problems }. */
export function weibullTargets(s = {}, needs) {
  const problems = [], t = { origin: s.origin === 'predicted' ? 'predicted' : 'measured' };
  if (s.n != null && !(Number.isInteger(s.n) && s.n >= 2)) problems.push({ code: 'sum.n', value: s.n });
  for (const k of needs) {
    if (k === 'variance') {
      const div = s.varDivisor === 'n-1' ? 'n-1' : 'n';
      if (!pos(s.variance)) { problems.push({ code: 'sum.var', value: s.variance ?? null }); continue; }
      if (div === 'n-1' && s.n == null) { problems.push({ code: 'sum.nneed' }); continue; }
      t.variance = div === 'n-1' ? s.variance * (s.n - 1) / s.n : s.variance; t.varDivisor = div; t.varGiven = s.variance;
    } else if (!pos(s[k])) problems.push({ code: 'wsum.missing', key: k, value: s[k] ?? null });
    else t[k] = s[k];
  }
  if (s.n != null) t.n = s.n;
  return { t, problems };
}
/** Location from the policy. { a, fixed, problems }. */
export function locationOf(opts = {}, s = {}) {
  if (opts.loc === 'user') {
    const a = opts.a;
    if (!fin(a)) return { problems: [{ code: 'a.bad' }] };
    if (a < 0) return { problems: [{ code: 'a.negative', a }] };
    return { a, fixed: { a: { value: a, origin: a === 0 ? 'zero' : 'user', policy: 'user' } }, problems: [] };
  }
  if (!pos(s.dmin)) return { problems: [{ code: 'wsum.dmin', value: s.dmin ?? null }] };
  const a = 0.5 * s.dmin;
  return { a, fixed: { a: { value: a, origin: 'rule', policy: 'half-dmin', dmin: s.dmin } }, problems: [] };
}
const back = p => {
  const m = weibull.mean(p), v = weibull.variance(p);
  return { backMean: m, backVariance: v, backDq: Math.sqrt(m * m + v), backQ31: weibull.quantile(0.31, p), backQ63: weibull.quantile(0.63, p), backQ50: weibull.quantile(0.5, p), backQ95: weibull.quantile(0.95, p) };
};
const BACK = { mean: 'backMean', variance: 'backVariance', dq: 'backDq', q31: 'backQ31', q63: 'backQ63', q50: 'backQ50', q95: 'backQ95' };
/** Relative residual of every target the method matched (back-calculated − target)/target. */
function residuals(bk, t, keys) { return Object.fromEntries(keys.map(k => [k, (bk[BACK[k]] - t[k]) / t[k]])); }

function recover(id, input, opts = {}) {
  const needs = NEEDS[id], s = input.type === 'raw' ? weibullSummary(input.d) : (input.summary || {});
  const T = weibullTargets(s, needs), L = locationOf(opts, s);
  const settings = { locPolicy: opts.loc === 'user' ? 'user' : 'half-dmin', ...(PAIRS[id] ? { p: PAIRS[id][0], r: PAIRS[id][1] } : {}), ...(s.quantile ? { quantile: s.quantile } : {}) };
  const base = { settings, targets: { ...T.t, ...(L.a != null ? { a: L.a } : {}), ...(s.dmin != null ? { dmin: s.dmin } : {}), from: input.type === 'raw' ? 'raw' : (s.from || 'typed'), ...(s.quantile ? { quantile: s.quantile } : {}) },
    fixed: L.fixed || {}, free: ['b', 'c'], data: { type: input.type === 'raw' ? 'raw' : 'summary', n: s.n ?? null } };
  const problems = [...T.problems, ...L.problems];
  if (problems.length) return { ...base, status: 'invalid', problems };
  const a = L.a, t = T.t;
  let params, conv;
  if (id === 'm4' || id === 'm5') {
    const [p, r] = PAIRS[id], [kp, kr] = needs, qp = t[kp], qr = t[kr];
    if (!(qp > a)) return { ...base, status: 'invalid', problems: [{ code: 'wsum.qbelow', key: kp, q: qp, a }] };
    if (!(qr > qp)) return { ...base, status: 'invalid', problems: [{ code: 'wsum.qorder', p, r, qp, qr }] };
    params = percentileParams(qp, qr, p, r, a); conv = { iter: 0 };
  } else {
    let h, scale;
    if (id === 'm2') {
      if (!(t.mean > a)) return { ...base, status: 'invalid', problems: [{ code: 'wsum.meanbelow', mean: t.mean, a }] };
      scale = c => (t.mean - a) / G(1, c);
    } else {
      if (!(t.dq > a)) return { ...base, status: 'invalid', problems: [{ code: 'wsum.dqbelow', dq: t.dq, a }] };
      scale = c => Bq(c, a, t.dq);
    }
    // relative form: b²(G2 − G1²)/v − 1 (no units, comparable over the whole interval)
    h = c => { const b = scale(c), g1 = G(1, c); return b * b * (G(2, c) - g1 * g1) / t.variance - 1; };
    const sc = scanRoots(h), cands = sc.roots.map(c => ({ a, b: scale(c), c })).filter(p => pos(p.b));
    conv = { iter: sc.iter, interval: C_RANGE, grid: GRID, gridKind: 'geometric', tol: 1e-15, roots: cands.length };
    if (!cands.length) return { ...base, status: 'invalid', convergence: conv, problems: [{ code: 'wsum.noroot', lo: C_RANGE[0], hi: C_RANGE[1] }] };
    if (cands.length > 1) return { ...base, status: 'multiple', convergence: conv, diagnostics: { candidates: cands.map(p => ({ ...p, ...back(p) })) }, warnings: [{ code: 'wsum.multiple', count: cands.length }] };
    params = cands[0];
  }
  const bk = back(params), res = residuals(bk, t, needs), worst = Math.max(...Object.values(res).map(Math.abs));
  if (!(worst <= RESID_TOL)) return { ...base, status: 'noconverge', convergence: conv, diagnostics: { ...bk, residuals: res }, warnings: [{ code: 'wsum.resid', worst }] };
  return { ...base, status: 'ok', params, convergence: conv, diagnostics: { ...bk, residuals: res } };
}

/** Summary targets computed from measured diameters: moments (divisor n), Dq, Dmin, percentiles (type 7). */
export function weibullSummary(d) {
  const n = d.length; if (!n) return { n: 0, origin: 'measured', from: 'raw' };
  const m = d.reduce((p, q) => p + q, 0) / n, v = d.reduce((p, q) => p + (q - m) ** 2, 0) / n, s = [...d].sort((x, y) => x - y);
  return { n, mean: m, variance: v, varDivisor: 'n', dq: Math.sqrt(m * m + v), dmin: s[0], q31: quantile7(s, 0.31), q63: quantile7(s, 0.63), q50: quantile7(s, 0.5), q95: quantile7(s, 0.95), quantile: 'type7', origin: 'measured', from: 'raw' };
}

const LOCOPT = { key: 'loc', type: 'choice', values: ['half-dmin', 'user'], default: 'half-dmin' };
const def = (k, solver) => ({ id: 'weibull.' + k, family: 'weibull', kind: 'recover', group: 'poudel', estimator: 'recovery', solver, dataTypes: ['summary', 'raw'], likelihoodMaximised: false,
  needs: NEEDS[k], options: [LOCOPT, { key: 'a', type: 'fixed-param', param: 'a', policies: ['user'] }], source: 'poudel2013.' + k, run: (input, opts = {}) => recover(k, input, opts) });
export const weibullM2 = def('m2', 'brent'), weibullM3 = def('m3', 'brent'), weibullM4 = def('m4', 'closed form'), weibullM5 = def('m5', 'closed form');
