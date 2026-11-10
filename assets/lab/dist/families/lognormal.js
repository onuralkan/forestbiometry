// Two-parameter lognormal family (no shift): ln D ~ N(mu, sigma²). mu and sigma are on the LOG scale: mu = E[ln D]
// (ln cm), not the arithmetic mean in cm; sigma > 0 is the standard deviation of ln D (DIST_SPEC §3.2). Support d > 0.
// The density is on the original diameter scale: f(d) = φ((ln d − μ)/σ)/(σ d), i.e. it includes the Jacobian 1/d.
import { normCdf, normSf, logNormCdf, logNormSf, normQuantile } from '../../core/stats.js';
import { DistError } from '../registry.js';

const LN_SQRT_2PI = 0.5 * Math.log(2 * Math.PI);
const z = (d, p) => (Math.log(d) - p.mu) / p.sigma;
export const lognormal = {
  id: 'lognormal',
  params: [
    { key: 'mu', label: 'μ', role: 'location', unit: 'ln cm', scale: 'log' },
    { key: 'sigma', label: 'σ', role: 'scale', unit: null, scale: 'log', min: 0, minOpen: true }],
  support: () => [0, Infinity],
  logpdf(d, p) { if (!(d > 0)) return -Infinity; const t = z(d, p); return -0.5 * t * t - Math.log(p.sigma) - LN_SQRT_2PI - Math.log(d); },
  pdf(d, p) { return d > 0 ? Math.exp(this.logpdf(d, p)) : 0; },
  cdf: (d, p) => d > 0 ? normCdf(z(d, p)) : 0, sf: (d, p) => d > 0 ? normSf(z(d, p)) : 1,
  logcdf: (d, p) => d > 0 ? logNormCdf(z(d, p)) : -Infinity, logsf: (d, p) => d > 0 ? logNormSf(z(d, p)) : 0,
  quantile: (q, p) => q <= 0 ? 0 : q >= 1 ? Infinity : Math.exp(p.mu + p.sigma * normQuantile(q)),
  /** E[D] = exp(μ + σ²/2) (cm). */
  mean: p => Math.exp(p.mu + p.sigma * p.sigma / 2),
  /** Var[D] = (e^{σ²} − 1)·e^{2μ + σ²} (cm²). */
  variance(p) { const v = Math.expm1(p.sigma * p.sigma) * Math.exp(2 * p.mu + p.sigma * p.sigma); if (!Number.isFinite(v)) throw new DistError('moment.undefined', { family: 'lognormal', order: 2 }); return v; },
  source: 'lognormal',
};
