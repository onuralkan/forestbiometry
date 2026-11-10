// Weibull parameter recovery from summary targets, Poudel and Cao (2013) methods M2–M5 (DIST_SPEC §3.6, stage P06).
// Kind 'recover'. No DOM. a = location (cm), b = scale (cm), c = shape; G_r(c) = Γ(1 + r/c), A_p = −ln(1 − p).
//
//   weibull.m2   mean m and variance v        b = (m − a)/G1;  b²(G2 − G1²) = v solved for c
//   weibull.m3   Dq = q and variance v        b = B_q(c) = [−aG1 + √(a²G1² + G2(q² − a²))]/G2;  b²(G2 − G1²) = v for c
//   weibull.m4   Q31 and Q63                  c = ln(A.63/A.31)/ln[(Q63 − a)/(Q31 − a)],  b = (Q31 − a)/A.31^(1/c)
//   weibull.m5   Q50 and Q95                  the same with p = 0.50, r = 0.95
// Hybrids (stage P07): the shape and the scale come from different targets, so not every target is matched.
//   weibull.m6   Dq, Q25, Q95                 c = C_.25,.95(a),  b = B_q(c)
//   weibull.m7   Dq, Q31, Q63                 c = C_.31,.63(a),  b = B_q(c)
//   weibull.m8   mean m, Q95                  b = (Q95 − a)/A.95^(1/c);  a + bG1 = m solved for c (may have 2 roots)
//   weibull.m9   Dq, Q95                      the same b;  a² + 2abG1 + b²G2 = Dq² solved for c (may have 2 roots)
//   weibull.m10  Dq, Q25, Q50, Q95, Dmin, n   a = (n^(1/3)·Dmin − Q50)/(n^(1/3) − 1) (its own location rule; n = trees
//                                             measured in the plot, never N per hectare), c = C_.25,.95(a), b = B_q(c)
// Only the targets a method matches by construction are checked after back-calculation (EXACT below); the others are
// shown with their back-calculated values but are not expected to agree.
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
export const PAIRS = { m4: [0.31, 0.63], m5: [0.5, 0.95], m6: [0.25, 0.95], m7: [0.31, 0.63], m10: [0.25, 0.95] };
export const NEEDS = { m2: ['mean', 'variance'], m3: ['dq', 'variance'], m4: ['q31', 'q63'], m5: ['q50', 'q95'],
  m6: ['dq', 'q25', 'q95'], m7: ['dq', 'q31', 'q63'], m8: ['mean', 'q95'], m9: ['dq', 'q95'], m10: ['dq', 'q25', 'q50', 'q95', 'dmin', 'n'] };
/** Targets matched by construction ('ratio' = the percentile ratio that fixes c). */
export const EXACT = { m2: ['mean', 'variance'], m3: ['dq', 'variance'], m4: ['q31', 'q63'], m5: ['q50', 'q95'],
  m6: ['dq', 'ratio'], m7: ['dq', 'ratio'], m8: ['mean', 'q95'], m9: ['dq', 'q95'], m10: ['dq', 'ratio'] };
const SELECTION = 'none: every root in the interval is reported; one root gives the result, several give the state multiple (no hidden c > 1 rule)';

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
    if (k === 'n') { if (s.n == null) problems.push({ code: 'wsum.missing', key: 'n', value: null }); continue; }   // checked above when given
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
  return { backMean: m, backVariance: v, backDq: Math.sqrt(m * m + v), backQ25: weibull.quantile(0.25, p), backQ31: weibull.quantile(0.31, p), backQ63: weibull.quantile(0.63, p), backQ50: weibull.quantile(0.5, p), backQ95: weibull.quantile(0.95, p) };
};
export const BACK = { mean: 'backMean', variance: 'backVariance', dq: 'backDq', q25: 'backQ25', q31: 'backQ31', q63: 'backQ63', q50: 'backQ50', q95: 'backQ95' };
/** Relative residual (back-calculated − target)/target of every target that has a back-calculated value. */
function residuals(bk, t, keys) { return Object.fromEntries(keys.filter(k => BACK[k] && t[k] != null).map(k => [k, (bk[BACK[k]] - t[k]) / t[k]])); }
/** ln[(Q_r − a)/(Q_p − a)] of the targets and of the fitted distribution: the quantity that fixes c in M6, M7, M10. */
function ratioResidual(id, bk, t, a) {
  const [p, r] = PAIRS[id], kp = 'q' + Math.round(p * 100), kr = 'q' + Math.round(r * 100);
  const tr = Math.log((t[kr] - a) / (t[kp] - a)), br = Math.log((bk[BACK[kr]] - a) / (bk[BACK[kp]] - a));
  return (br - tr) / tr;
}

function recover(id, input, opts = {}) {
  const needs = NEEDS[id], s = input.type === 'raw' ? weibullSummary(input.d) : (input.summary || {});
  const T = weibullTargets(s, needs), m10 = id === 'm10';
  const L = m10 ? m10Location(s, T) : locationOf(opts, s);
  const settings = { locPolicy: m10 ? 'm10' : opts.loc === 'user' ? 'user' : 'half-dmin', ...(PAIRS[id] ? { p: PAIRS[id][0], r: PAIRS[id][1] } : {}), ...(s.quantile ? { quantile: s.quantile } : {}) };
  const base = { settings, targets: { ...T.t, ...(L.a != null ? { a: L.a } : {}), ...(s.dmin != null ? { dmin: s.dmin } : {}), from: input.type === 'raw' ? 'raw' : (s.from || 'typed'), ...(s.quantile ? { quantile: s.quantile } : {}) },
    fixed: L.fixed || {}, free: ['b', 'c'], data: { type: input.type === 'raw' ? 'raw' : 'summary', n: s.n ?? null }, warnings: L.warnings || [] };
  const problems = [...T.problems, ...(L.problems || [])];
  if (problems.length) return { ...base, status: 'invalid', problems };
  const a = L.a, t = T.t;
  let params, conv;
  const pctShape = () => {                              // c from a percentile ratio (M4–M7, M10); null + problem if undefined
    const [p, r] = PAIRS[id], kp = 'q' + Math.round(p * 100), kr = 'q' + Math.round(r * 100), qp = t[kp], qr = t[kr];
    if (!(qp > a)) return { problem: { code: 'wsum.qbelow', key: kp, q: qp, a } };
    if (!(qr > qp)) return { problem: { code: 'wsum.qorder', p, r, qp, qr } };
    return { est: percentileParams(qp, qr, p, r, a) };
  };
  if (id === 'm4' || id === 'm5') {
    const e = pctShape(); if (e.problem) return { ...base, status: 'invalid', problems: [e.problem] };
    params = e.est; conv = { iter: 0 };
  } else if (id === 'm6' || id === 'm7' || m10) {
    const e = pctShape(); if (e.problem) return { ...base, status: 'invalid', problems: [e.problem] };
    if (!(t.dq > a)) return { ...base, status: 'invalid', problems: [{ code: 'wsum.dqbelow', dq: t.dq, a }] };
    const c = e.est.c; params = { a, b: Bq(c, a, t.dq), c }; conv = { iter: 0 };
  } else {
    let h, scale;
    if (id === 'm2' || id === 'm8') { if (!(t.mean > a)) return { ...base, status: 'invalid', problems: [{ code: 'wsum.meanbelow', mean: t.mean, a }] }; }
    else if (!(t.dq > a)) return { ...base, status: 'invalid', problems: [{ code: 'wsum.dqbelow', dq: t.dq, a }] };
    if (id === 'm8' || id === 'm9') {
      if (!(t.q95 > a)) return { ...base, status: 'invalid', problems: [{ code: 'wsum.qbelow', key: 'q95', q: t.q95, a }] };
      const A95 = -Math.log1p(-0.95);
      scale = c => (t.q95 - a) / A95 ** (1 / c);
      // relative forms: (a + bG1)/m − 1 and (a² + 2abG1 + b²G2)/Dq² − 1
      h = id === 'm8' ? c => (a + scale(c) * G(1, c)) / t.mean - 1 : c => { const b = scale(c); return (a * a + 2 * a * b * G(1, c) + b * b * G(2, c)) / (t.dq * t.dq) - 1; };
    } else {
      scale = id === 'm2' ? c => (t.mean - a) / G(1, c) : c => Bq(c, a, t.dq);
      // relative form: b²(G2 − G1²)/v − 1 (no units, comparable over the whole interval)
      h = c => { const b = scale(c), g1 = G(1, c); return b * b * (G(2, c) - g1 * g1) / t.variance - 1; };
    }
    const sc = scanRoots(h), cands = sc.roots.map(c => ({ a, b: scale(c), c })).filter(p => pos(p.b));
    conv = { iter: sc.iter, interval: C_RANGE, grid: GRID, gridKind: 'geometric', tol: 1e-15, roots: cands.length, selection: SELECTION };
    if (!cands.length) return { ...base, status: 'invalid', convergence: conv, problems: [{ code: 'wsum.noroot', lo: C_RANGE[0], hi: C_RANGE[1] }] };
    if (cands.length > 1) return { ...base, status: 'multiple', convergence: conv, diagnostics: { candidates: cands.map(p => ({ ...p, ...back(p), residuals: residuals(back(p), t, needs) })), exact: EXACT[id] }, warnings: [...base.warnings, { code: 'wsum.multiple', count: cands.length }] };
    params = cands[0];
  }
  const bk = back(params), res = residuals(bk, t, needs);
  if (EXACT[id].includes('ratio')) res.ratio = ratioResidual(id, bk, t, a);
  const worst = Math.max(...EXACT[id].map(k => Math.abs(res[k])));
  if (!(worst <= RESID_TOL)) return { ...base, status: 'noconverge', convergence: conv, diagnostics: { ...bk, residuals: res, exact: EXACT[id] }, warnings: [...base.warnings, { code: 'wsum.resid', worst }] };
  return { ...base, status: 'ok', params, convergence: conv, diagnostics: { ...bk, residuals: res, exact: EXACT[id] } };
}
/** M10 location: a = (n^(1/3)·Dmin − Q50)/(n^(1/3) − 1); invalid values are reported, never moved to zero. */
function m10Location(s, T) {
  if (T.problems.length || !pos(s.dmin) || !(s.q50 > 0) || !(Number.isInteger(s.n) && s.n >= 2)) return { problems: !pos(s.dmin) && !T.problems.some(p => p.key === 'dmin') ? [{ code: 'wsum.dmin', value: s.dmin ?? null }] : [] };
  const k = Math.cbrt(s.n), a = (k * s.dmin - s.q50) / (k - 1);
  if (!Number.isFinite(a)) return { problems: [{ code: 'm10.a', a: null }] };
  if (a < 0) return { problems: [{ code: 'm10.aneg', a, dmin: s.dmin, q50: s.q50, n: s.n }] };
  const warnings = a >= s.dmin ? [{ code: 'm10.aabove', a, dmin: s.dmin }] : [];
  return { a, fixed: { a: { value: a, origin: 'rule', policy: 'm10', dmin: s.dmin, n: s.n, q50: s.q50 } }, problems: [], warnings };
}

/** Summary targets computed from measured diameters: moments (divisor n), Dq, Dmin, percentiles (type 7). */
export function weibullSummary(d) {
  const n = d.length; if (!n) return { n: 0, origin: 'measured', from: 'raw' };
  const m = d.reduce((p, q) => p + q, 0) / n, v = d.reduce((p, q) => p + (q - m) ** 2, 0) / n, s = [...d].sort((x, y) => x - y);
  return { n, mean: m, variance: v, varDivisor: 'n', dq: Math.sqrt(m * m + v), dmin: s[0], q25: quantile7(s, 0.25), q31: quantile7(s, 0.31), q63: quantile7(s, 0.63), q50: quantile7(s, 0.5), q95: quantile7(s, 0.95), quantile: 'type7', origin: 'measured', from: 'raw' };
}

const LOCOPT = { key: 'loc', type: 'choice', values: ['half-dmin', 'user'], default: 'half-dmin' };
const def = (k, solver, opts = [LOCOPT, { key: 'a', type: 'fixed-param', param: 'a', policies: ['user'] }]) => ({ id: 'weibull.' + k, family: 'weibull', kind: 'recover', group: 'poudel', estimator: 'recovery', solver, dataTypes: ['summary', 'raw'], likelihoodMaximised: false,
  hybrid: ['m6', 'm7', 'm8', 'm9', 'm10'].includes(k), needs: NEEDS[k], exact: EXACT[k], options: opts, source: 'poudel2013.' + k, run: (input, o = {}) => recover(k, input, o) });
export const weibullM2 = def('m2', 'brent'), weibullM3 = def('m3', 'brent'), weibullM4 = def('m4', 'closed form'), weibullM5 = def('m5', 'closed form');
export const weibullM6 = def('m6', 'closed form'), weibullM7 = def('m7', 'closed form'), weibullM8 = def('m8', 'brent'), weibullM9 = def('m9', 'brent');
export const weibullM10 = def('m10', 'closed form', []);          // M10 has its own location rule: no location option
