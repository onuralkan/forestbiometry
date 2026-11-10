// Johnson SB family (DIST_SPEC §3.7): ξ = lower bound (cm), λ > 0 = range (cm), so the support is ξ < d < ξ + λ;
// γ (real) and δ > 0 are shapes (no unit).
//   z = γ + δ ln[(d − ξ)/(ξ + λ − d)],  F(d) = Φ(z),  f(d) = φ(z) δλ / [(d − ξ)(ξ + λ − d)],
//   Q_p = ξ + λ·logistic((Φ⁻¹(p) − γ)/δ).
// ξ + λ − d is computed directly (not as λ − (d − ξ) after a ratio), and the upper quantiles are written from the top
// (d = ξ + λ − λ·logistic(−w)), so both tails keep their accuracy. Moments have no closed form: E[Y] and E[Y²] for
// Y = logistic((Z − γ)/δ), Z ~ N(0, 1), by composite Gauss–Legendre (core/quad.js) with breakpoints around z = γ.
import { normCdf, normSf, logNormCdf, logNormSf, normQuantile } from '../../core/stats.js';
import { normalExpect } from '../../core/quad.js';
import { DistError } from '../registry.js';

const LN_SQRT_2PI = 0.5 * Math.log(2 * Math.PI);
const zOf = (d, p) => p.gamma + p.delta * Math.log((d - p.xi) / (p.xi + p.lambda - d));
const inside = (d, p) => d > p.xi && d < p.xi + p.lambda;
/** logistic(w) = 1/(1 + e^(−w)) and 1 − logistic(w), both without cancellation. */
export const logistic = w => w >= 0 ? 1 / (1 + Math.exp(-w)) : Math.exp(w) / (1 + Math.exp(w));
/** E[Y], E[Y²] of Y = (D − ξ)/λ. */
export function sbMomentsY(gamma, delta) {
  const br = [0.25, 0.5, 1, 2, 4, 8, 16].flatMap(k => [gamma - k * delta, gamma + k * delta]).concat([gamma]);
  // centred at c = logistic(−γ/δ) (the median of Y) so that a small variance is not the difference of two large numbers;
  const c = logistic(-gamma / delta);
  const [e1, e2] = normalExpect(z => { const t = logistic((z - gamma) / delta) - c; return [t, t * t]; }, 2, { breaks: br });
  const m1 = c + e1;
  return { m1, m2: e2 + 2 * c * e1 + c * c, v: Math.max(0, e2 - e1 * e1) };
}
export const johnsonsb = {
  id: 'johnsonsb',
  params: [
    { key: 'xi', label: 'ξ', role: 'lower', unit: 'cm', min: 0 },
    { key: 'lambda', label: 'λ', role: 'range', unit: 'cm', min: 0, minOpen: true },
    { key: 'gamma', label: 'γ', role: 'shape', unit: null },
    { key: 'delta', label: 'δ', role: 'shape', unit: null, min: 0, minOpen: true }],
  support: p => [p.xi, p.xi + p.lambda],
  logpdf(d, p) {
    if (!inside(d, p)) return -Infinity;
    const z = zOf(d, p);
    return -0.5 * z * z - LN_SQRT_2PI + Math.log(p.delta) + Math.log(p.lambda) - Math.log(d - p.xi) - Math.log(p.xi + p.lambda - d);
  },
  pdf(d, p) { return inside(d, p) ? Math.exp(this.logpdf(d, p)) : 0; },
  cdf: (d, p) => d <= p.xi ? 0 : d >= p.xi + p.lambda ? 1 : normCdf(zOf(d, p)),
  sf: (d, p) => d <= p.xi ? 1 : d >= p.xi + p.lambda ? 0 : normSf(zOf(d, p)),
  logcdf: (d, p) => d <= p.xi ? -Infinity : d >= p.xi + p.lambda ? 0 : logNormCdf(zOf(d, p)),
  logsf: (d, p) => d <= p.xi ? 0 : d >= p.xi + p.lambda ? -Infinity : logNormSf(zOf(d, p)),
  quantile(q, p) {
    if (q <= 0) return p.xi; if (q >= 1) return p.xi + p.lambda;
    const w = (normQuantile(q) - p.gamma) / p.delta;
    return w <= 0 ? p.xi + p.lambda * logistic(w) : p.xi + p.lambda - p.lambda * logistic(-w);
  },
  mean(p) { return p.xi + p.lambda * sbMomentsY(p.gamma, p.delta).m1; },
  variance(p) { const v = p.lambda * p.lambda * sbMomentsY(p.gamma, p.delta).v; if (!Number.isFinite(v)) throw new DistError('moment.undefined', { family: 'johnsonsb', order: 2 }); return v; },
  source: 'johnsonsb',
};
