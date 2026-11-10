// Location–scale (four-parameter) beta family (DIST_SPEC §3.4): Y = (D − L)/(U − L) ~ Beta(α, β), L < D < U.
// L and U (cm) are the SUPPORT of the distribution, not a measurement threshold and not the sample minimum/maximum;
// in this engine they are always fixed by the user (stage P04). α, β > 0 are shapes (no unit).
//   f(d) = y^(α−1)(1 − y)^(β−1) / (B(α, β)·S),  S = U − L  (the 1/S is the change of scale to the diameter axis).
// 1 − y is computed as (U − d)/S, not as 1 − y, so the upper tail keeps its accuracy.
import { lnGamma } from '../../core/special.js';
import { lnBetaInc, betaIncInvLower } from '../../core/stats.js';
import { DistError } from '../registry.js';

const lnB = (a, b) => lnGamma(a) + lnGamma(b) - lnGamma(a + b);
const S = p => p.U - p.L;
export const beta = {
  id: 'beta',
  params: [
    { key: 'L', label: 'L', role: 'lower', unit: 'cm', min: 0 },
    { key: 'U', label: 'U', role: 'upper', unit: 'cm', min: 0, minOpen: true },
    { key: 'alpha', label: 'α', role: 'shape', unit: null, min: 0, minOpen: true },
    { key: 'beta', label: 'β', role: 'shape', unit: null, min: 0, minOpen: true }],
  /** Cross-parameter rule: L < U. */
  check(p) { if (!(p.U > p.L)) throw new DistError('param.invalid', { family: 'beta', key: 'U', value: p.U, rule: '> L = ' + p.L }); },
  support: p => [p.L, p.U],
  logpdf(d, p) {
    if (!(d > p.L && d < p.U)) return -Infinity;
    const s = S(p);
    return (p.alpha - 1) * Math.log((d - p.L) / s) + (p.beta - 1) * Math.log((p.U - d) / s) - lnB(p.alpha, p.beta) - Math.log(s);
  },
  pdf(d, p) { return d > p.L && d < p.U ? Math.exp(this.logpdf(d, p)) : 0; },
  logcdf: (d, p) => d <= p.L ? -Infinity : d >= p.U ? 0 : lnBetaInc(p.alpha, p.beta, (d - p.L) / S(p), (p.U - d) / S(p)),
  logsf: (d, p) => d <= p.L ? 0 : d >= p.U ? -Infinity : lnBetaInc(p.beta, p.alpha, (p.U - d) / S(p), (d - p.L) / S(p)),
  cdf(d, p) { return d <= p.L ? 0 : d >= p.U ? 1 : Math.exp(this.logcdf(d, p)); },
  sf(d, p) { return d <= p.L ? 1 : d >= p.U ? 0 : Math.exp(this.logsf(d, p)); },
  /** Lower half: d = L + S·y; upper half solved from the top: d = U − S·z with I_z(β, α) = 1 − q (exact for q ≥ ½). */
  quantile: (q, p) => q <= 0 ? p.L : q >= 1 ? p.U : q <= 0.5 ? p.L + S(p) * betaIncInvLower(p.alpha, p.beta, q) : p.U - S(p) * betaIncInvLower(p.beta, p.alpha, 1 - q),
  mean: p => p.L + S(p) * p.alpha / (p.alpha + p.beta),
  variance: p => { const a = p.alpha, b = p.beta, s = S(p); return s * s * a * b / ((a + b) ** 2 * (a + b + 1)); },
  source: 'beta',
};
