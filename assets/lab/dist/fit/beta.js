// Location–scale beta with FIXED, user-given bounds L < U (DIST_SPEC §3.4, stage P04). No DOM.
// Bound policy: L and U are always entered by the user (origin 'user'); they are never set from the sample minimum or
// maximum, never estimated, and observations on or outside them are never moved (no epsilon, no jitter): they are
// reported as problems and no estimate is made. Free L/U estimation is a different method and is not offered.
//   y = (d − L)/S, 1 − y = (U − d)/S, S = U − L
//   beta.mom   μ_y = (m − L)/S, v_y = v/S², t = μ_y(1 − μ_y)/v_y − 1, α = μ_y t, β = (1 − μ_y) t;
//              needs 0 < μ_y < 1 and 0 < v_y < μ_y(1 − μ_y) (otherwise no estimate); v divisor n (default) or n − 1
//   beta.ml    maximise Σ[(α − 1) ln y + (β − 1) ln(1 − y)] − n ln B(α, β) − n ln S  (the −n ln S makes it the
//              log-likelihood of the diameters). Concave in (α, β); Newton with the exact (trigamma) Hessian and step
//              halving, started from the moment estimate (or α = β = 1 where moments are not admissible).
import { digamma, trigamma, lnGamma } from '../../core/special.js';
import { checkBasic, meanVar, VAR_DIVISOR } from './common.js';
import { beta } from '../families/beta.js';
import { logLik } from '../gof.js';

export const SHAPE_MAX = 1e8;                        // tool rule: larger shapes are reported as a boundary state
const fin = x => typeof x === 'number' && Number.isFinite(x);

/** Option check (also used by the interface): both bounds given, L ≥ 0, U > L. */
export function checkBounds(o) {
  if (!fin(o.L) || !fin(o.U)) return [{ code: 'bounds.missing' }];
  if (o.L < 0) return [{ code: 'bounds.negative', L: o.L }];
  if (!(o.U > o.L)) return [{ code: 'bounds.order', L: o.L, U: o.U }];
  return [];
}
/** Observations outside [L, U] and exactly on L or U, counted separately with an example each. */
export function boundProblems(d, L, U) {
  const out = d.filter(v => v < L || v > U), on = d.filter(v => v === L || v === U), pr = [];
  if (out.length) pr.push({ code: 'bound.outside', count: out.length, example: out[0], L, U });
  if (on.length) pr.push({ code: 'bound.on', count: on.length, example: on[0], L, U });
  return pr;
}
/** α, β from the mean and (moment) variance of D with bounds L, U; { problem } when the moments are not admissible. */
export function betaFromMoments(m, v, L, U) {
  const s = U - L, mu = (m - L) / s, vy = v / (s * s);
  if (!(mu > 0 && mu < 1)) return { problem: { code: 'beta.mean', mean: m, L, U } };
  if (!(vy > 0 && vy < mu * (1 - mu))) return { problem: { code: 'beta.var', variance: v, max: mu * (1 - mu) * s * s } };
  const t = mu * (1 - mu) / vy - 1;
  return { alpha: mu * t, beta: (1 - mu) * t };
}
function prepare(d, opts, settings) {
  const L = opts.L, U = opts.U, fixed = { L: { value: L, origin: 'user' }, U: { value: U, origin: 'user' } };
  const s0 = checkBasic(d), base = { fixed, free: ['alpha', 'beta'], settings: { boundPolicy: 'user', ...settings }, warnings: s0.notices };
  const problems = [...checkBounds(opts), ...(fin(L) && fin(U) && U > L ? boundProblems(d, L, U) : []), ...s0.problems];
  return { L, U, base, problems };
}
export function fitBetaMoments(d, opts = {}) {
  const div = opts.varDivisor === 'n-1' ? 'n-1' : 'n', P = prepare(d, opts, { varDivisor: div });
  if (div === 'n-1') P.base.warnings = [...P.base.warnings, { code: 'var.n1s' }];
  if (P.problems.length) return { ...P.base, status: 'invalid', problems: P.problems };
  const { m, v } = meanVar(d, div), r = betaFromMoments(m, v, P.L, P.U);
  P.base.targets = { mean: m, variance: v, varDivisor: div };
  if (r.problem) return { ...P.base, status: 'invalid', problems: [r.problem] };
  const p = { L: P.L, U: P.U, alpha: r.alpha, beta: r.beta };
  return { ...P.base, status: 'ok', params: p, logLik: logLik(beta, p, d), convergence: { iter: 0 } };
}
export function fitBetaML(d, opts = {}) {
  const P = prepare(d, opts, {});
  if (P.problems.length) return { ...P.base, status: 'invalid', problems: P.problems };
  const n = d.length, S = P.U - P.L;
  let T1 = 0, T2 = 0; for (const v of d) { T1 += Math.log((v - P.L) / S); T2 += Math.log((P.U - v) / S); } T1 /= n; T2 /= n;
  const f = (a, b) => (a - 1) * T1 + (b - 1) * T2 - (lnGamma(a) + lnGamma(b) - lnGamma(a + b));      // per tree, without −ln S
  const mv = meanVar(d, 'n'), st = betaFromMoments(mv.m, mv.v, P.L, P.U);
  let a = st.problem ? 1 : st.alpha, b = st.problem ? 1 : st.beta, fv = f(a, b), it = 0, ga = NaN, gb = NaN, status = 'noconverge';
  P.base.targets = { meanLogY: T1, meanLog1mY: T2, start: st.problem ? 'alpha = beta = 1' : 'moments' };
  for (it = 1; it <= 200; it++) {
    const pab = digamma(a + b), tab = trigamma(a + b);
    ga = T1 - digamma(a) + pab; gb = T2 - digamma(b) + pab;
    if (Math.max(Math.abs(ga), Math.abs(gb)) < 1e-14 * Math.max(1, Math.abs(T1), Math.abs(T2))) { status = 'ok'; break; }
    const haa = -trigamma(a) + tab, hbb = -trigamma(b) + tab, hab = tab, det = haa * hbb - hab * hab;
    let da = -(hbb * ga - hab * gb) / det, db = -(-hab * ga + haa * gb) / det;              // Newton step −H⁻¹g
    if (!fin(da) || !fin(db)) break;
    let lam = 1, moved = false;
    for (let k = 0; k < 60; k++) {
      const na = a + lam * da, nb = b + lam * db;
      if (na > 0 && nb > 0) { const nf = f(na, nb); if (nf >= fv - 1e-15 * Math.abs(fv)) { const rel = Math.max(Math.abs(na - a) / a, Math.abs(nb - b) / b); a = na; b = nb; fv = nf; moved = true; if (rel < 1e-15) status = 'ok'; break; } }
      lam /= 2;
    }
    if (!moved || status === 'ok') { status = moved ? 'ok' : status; break; }
    if (a > SHAPE_MAX || b > SHAPE_MAX) { status = 'boundary'; break; }
  }
  const conv = { iter: it, tol: 1e-14, tolKind: 'score', score: [ga, gb] };
  if (status === 'boundary') return { ...P.base, status, warnings: [...P.base.warnings, { code: 'shape.boundary', max: SHAPE_MAX }], convergence: conv };
  if (status !== 'ok') return { ...P.base, status: 'noconverge', warnings: [...P.base.warnings, { code: 'shape.noconverge' }], convergence: conv };
  const p = { L: P.L, U: P.U, alpha: a, beta: b }, ll = logLik(beta, p, d);
  return { ...P.base, status: 'ok', params: p, logLik: ll, objective: { name: 'logLik', value: ll }, convergence: conv };
}
const BOUNDS = [{ key: 'L', type: 'fixed-param', param: 'L', policies: ['user'] }, { key: 'U', type: 'fixed-param', param: 'U', policies: ['user'] }];
export const betaML = {
  id: 'beta.ml', family: 'beta', kind: 'fit', estimator: 'ml', solver: 'newton', dataTypes: ['raw'], likelihoodMaximised: true, needsInput: true,
  options: BOUNDS, checkOptions: checkBounds, source: 'beta.ml', run: (input, opts = {}) => fitBetaML(input.d, opts),
};
export const betaMoments = {
  id: 'beta.mom', family: 'beta', kind: 'fit', estimator: 'mom', solver: 'closed form', dataTypes: ['raw'], likelihoodMaximised: false, needsInput: true,
  options: [...BOUNDS, VAR_DIVISOR], checkOptions: checkBounds, source: 'beta.mom', run: (input, opts = {}) => fitBetaMoments(input.d, opts),
};
