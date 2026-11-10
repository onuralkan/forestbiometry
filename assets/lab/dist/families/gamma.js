// Two-parameter gamma family (DIST_SPEC §3.3): shape k > 0 (dimensionless), SCALE θ > 0 (cm). No location parameter.
//   f(d) = d^(k−1) e^(−d/θ) / (Γ(k) θ^k), d > 0;   F(d) = P(k, d/θ) (regularised lower incomplete gamma).
// Libraries that use the rate β = 1/θ (1/cm) need an explicit conversion; SciPy's gamma(a = k, scale = θ) uses the
// scale, as here.
import { lnGamma } from '../../core/special.js';
import { gammaP, gammaQ, lnGammaP, lnGammaQ, gammaPInv } from '../../core/stats.js';

export const gamma = {
  id: 'gamma',
  params: [
    { key: 'k', label: 'k', role: 'shape', unit: null, min: 0, minOpen: true },
    { key: 'theta', label: 'θ', role: 'scale', unit: 'cm', min: 0, minOpen: true }],
  support: () => [0, Infinity],
  logpdf: (d, p) => d > 0 ? (p.k - 1) * Math.log(d) - d / p.theta - lnGamma(p.k) - p.k * Math.log(p.theta) : -Infinity,
  pdf(d, p) { return d > 0 ? Math.exp(this.logpdf(d, p)) : 0; },
  cdf: (d, p) => d > 0 ? gammaP(p.k, d / p.theta) : 0, sf: (d, p) => d > 0 ? gammaQ(p.k, d / p.theta) : 1,
  logcdf: (d, p) => d > 0 ? lnGammaP(p.k, d / p.theta) : -Infinity, logsf: (d, p) => d > 0 ? lnGammaQ(p.k, d / p.theta) : 0,
  quantile: (q, p) => q <= 0 ? 0 : q >= 1 ? Infinity : p.theta * gammaPInv(p.k, q),
  mean: p => p.k * p.theta, variance: p => p.k * p.theta * p.theta,
  source: 'gamma',
};
