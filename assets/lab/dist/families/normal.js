// Normal family: mu = mean (cm), sigma > 0 = standard deviation (cm). Support: the whole real line, so a fitted normal
// gives diameters below zero a positive probability Φ(−μ/σ); it is reported with every result (DIST_SPEC §3.1).
import { normCdf, normSf, logNormCdf, logNormSf, normQuantile } from '../../core/stats.js';

const LN_SQRT_2PI = 0.5 * Math.log(2 * Math.PI);
const z = (d, p) => (d - p.mu) / p.sigma;
export const normal = {
  id: 'normal',
  params: [
    { key: 'mu', label: 'μ', role: 'location', unit: 'cm' },
    { key: 'sigma', label: 'σ', role: 'scale', unit: 'cm', min: 0, minOpen: true }],
  support: () => [-Infinity, Infinity],
  logpdf: (d, p) => { const t = z(d, p); return -0.5 * t * t - Math.log(p.sigma) - LN_SQRT_2PI; },
  pdf(d, p) { return Math.exp(this.logpdf(d, p)); },
  cdf: (d, p) => normCdf(z(d, p)), sf: (d, p) => normSf(z(d, p)),
  logcdf: (d, p) => logNormCdf(z(d, p)), logsf: (d, p) => logNormSf(z(d, p)),
  quantile: (q, p) => q <= 0 ? -Infinity : q >= 1 ? Infinity : p.mu + p.sigma * normQuantile(q),
  mean: p => p.mu, variance: p => p.sigma * p.sigma,
  /** Probability of a diameter below zero, Φ(−μ/σ). */
  diagnostics: p => ({ pBelowZero: normCdf(-p.mu / p.sigma) }),
  source: 'normal',
};
