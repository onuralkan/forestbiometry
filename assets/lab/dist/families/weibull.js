// Weibull family: a = location (cm), b > 0 = scale (cm), c > 0 = shape.
//   F(d) = 1 − exp(−((d − a)/b)^c),  d > a.   Two-parameter form: a = 0.   Spec: docs/DIST_SPEC.md §3.5.
// Logarithms are computed directly (no "log of a rounded probability").
import { lnGamma } from '../../core/special.js';
import { DistError } from '../registry.js';

const t = (d, p) => ((d - p.a) / p.b) ** p.c;                 // (z)^c, z = (d − a)/b
const G = (r, c) => Math.exp(lnGamma(1 + r / c));
export const weibull = {
  id: 'weibull',
  params: [
    { key: 'a', role: 'location', unit: 'cm', min: 0 },
    { key: 'b', role: 'scale', unit: 'cm', min: 0, minOpen: true },
    { key: 'c', role: 'shape', unit: null, min: 0, minOpen: true }],
  support: p => [p.a, Infinity],
  logpdf(d, p) { if (!(d > p.a)) return -Infinity; const z = (d - p.a) / p.b; return Math.log(p.c / p.b) + (p.c - 1) * Math.log(z) - z ** p.c; },
  pdf(d, p) { return d > p.a ? Math.exp(this.logpdf(d, p)) : 0; },
  cdf: (d, p) => d > p.a ? -Math.expm1(-t(d, p)) : 0,
  sf: (d, p) => d > p.a ? Math.exp(-t(d, p)) : 1,
  logsf: (d, p) => d > p.a ? -t(d, p) : 0,
  /** ln F = ln(1 − e^(−u)): series for tiny u, log(−expm1(−u)) below ln 2, log1p(−e^(−u)) above (keeps the upper tail). */
  logcdf(d, p) { if (!(d > p.a)) return -Infinity; const u = t(d, p); return u < 1e-5 ? Math.log(u) - u / 2 + u * u / 24 : u < Math.LN2 ? Math.log(-Math.expm1(-u)) : Math.log1p(-Math.exp(-u)); },
  quantile: (q, p) => q <= 0 ? p.a : q >= 1 ? Infinity : p.a + p.b * (-Math.log1p(-q)) ** (1 / p.c),
  mean: p => p.a + p.b * G(1, p.c),
  variance(p) { const g1 = G(1, p.c), v = p.b * p.b * (G(2, p.c) - g1 * g1); if (!Number.isFinite(v)) throw new DistError('moment.undefined', { family: 'weibull', order: 2 }); return Math.max(0, v); },
  source: 'weibull',
};
