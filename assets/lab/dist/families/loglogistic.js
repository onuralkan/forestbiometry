// Log-logistic (Fisk) family (DIST_SPEC §3.9): b > 0 = scale (cm, also the median), c > 0 = shape (no unit). No location.
//   F(d) = 1/[1 + (b/d)^c] = logistic(z),  z = c(ln d − ln b),  d > 0;   Q_p = b·[p/(1 − p)]^(1/c).
//   f(d) = (c/d)·g(z), g the standard logistic density; ln g(z) = −|z| − 2·log1p(e^(−|z|)) (symmetric, no overflow).
// SciPy: fisk(c, scale = b). Moments: E[D] = b·θ/sin θ exists only for c > 1, Var[D] = b²[2θ/sin 2θ − (θ/sin θ)²]
// only for c > 2 (θ = π/c). Where they do not exist, mean()/variance() throw DistError('moment.undefined'); they never
// return NaN, Infinity or a number.
import { DistError } from '../registry.js';

const zOf = (d, p) => p.c * (Math.log(d) - Math.log(p.b));
/** ln logistic(z) = −log1p(e^(−z)), written so that neither tail overflows or loses digits. */
export const logLogistic = z => z >= 0 ? -Math.log1p(Math.exp(-z)) : z - Math.log1p(Math.exp(z));
export const logisticF = z => z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z));
export const logLogisticPdf = z => { const a = Math.abs(z); return -a - 2 * Math.log1p(Math.exp(-a)); };
/** x/sin x, series below 1e-4 (no 0/0). */
const xOverSin = x => Math.abs(x) < 1e-4 ? 1 + x * x / 6 : x / Math.sin(x);
/** Existence of the ordinary moments: mean needs c > 1, variance c > 2. */
export function llMoments(p) {
  const th = Math.PI / p.c, meanDefined = p.c > 1, varianceDefined = p.c > 2;
  const mean = meanDefined ? p.b * xOverSin(th) : null;
  // 2θ/sin 2θ − (θ/sin θ)² = θ²/3 + 11θ⁴/45 + 38θ⁶/315 + …: the series below θ = 0.01 (c > 314) avoids the cancellation
  const t2 = th * th, k = !varianceDefined ? null : th < 0.01 ? t2 * (1 / 3 + t2 * (11 / 45 + t2 * 38 / 315)) : xOverSin(2 * th) - xOverSin(th) ** 2;
  return { meanDefined, varianceDefined, mean, variance: varianceDefined ? p.b * p.b * k : null };
}
export const loglogistic = {
  id: 'loglogistic',
  params: [
    { key: 'b', label: 'b', role: 'scale', unit: 'cm', min: 0, minOpen: true },
    { key: 'c', label: 'c', role: 'shape', unit: null, min: 0, minOpen: true }],
  support: () => [0, Infinity],
  logpdf: (d, p) => d > 0 ? Math.log(p.c) - Math.log(d) + logLogisticPdf(zOf(d, p)) : -Infinity,
  pdf(d, p) { return d > 0 ? Math.exp(this.logpdf(d, p)) : 0; },
  cdf: (d, p) => d > 0 ? logisticF(zOf(d, p)) : 0,
  sf: (d, p) => d > 0 ? logisticF(-zOf(d, p)) : 1,
  logcdf: (d, p) => d > 0 ? logLogistic(zOf(d, p)) : -Infinity,
  logsf: (d, p) => d > 0 ? logLogistic(-zOf(d, p)) : 0,
  /** b·exp(logit(q)/c), logit(q) = ln q − log1p(−q). */
  quantile: (q, p) => q <= 0 ? 0 : q >= 1 ? Infinity : p.b * Math.exp((Math.log(q) - Math.log1p(-q)) / p.c),
  mean(p) { const m = llMoments(p); if (!m.meanDefined) throw new DistError('moment.undefined', { family: 'loglogistic', order: 1, rule: 'c > 1', c: p.c }); return m.mean; },
  variance(p) { const m = llMoments(p); if (!m.varianceDefined) throw new DistError('moment.undefined', { family: 'loglogistic', order: 2, rule: 'c > 2', c: p.c }); return m.variance; },
  /** Which ordinary moments exist, and their values where they do (null otherwise). */
  diagnostics: p => ({ moments: llMoments(p) }),
  source: 'loglogistic',
};
