// Generalized gamma family (DIST_SPEC P20; Stacy's form with positive power c, as SciPy's gengamma(a, c, scale = b)):
//   f(d) = c / [b Γ(a)] · (d/b)^(ac − 1) · exp[−(d/b)^c],  d > 0;  a > 0, b > 0 (cm), c > 0.
//   F(d) = P(a, (d/b)^c) (regularised lower incomplete gamma);  Q_p = b·[P⁻¹(a, p)]^(1/c);  E[D^r] = b^r Γ(a + r/c)/Γ(a).
// Special cases: c = 1 → two-parameter gamma (shape a, scale b); a = 1 → two-parameter Weibull (shape c, scale b).
// Here a is a SHAPE parameter of this family; it is not the location a of the Weibull family. No location parameter:
// this is not the three-parameter (shifted) gamma. Only c > 0 is covered (the wider definition that allows c < 0 is
// not claimed).
import { lnGamma } from '../../core/special.js';
import { gammaP, gammaQ, lnGammaP, lnGammaQ, gammaPInv } from '../../core/stats.js';

const u = (d, p) => Math.pow(d / p.b, p.c);
/** ln E[D^r] = r ln b + lnΓ(a + r/c) − lnΓ(a). */
export const ggLogMoment = (p, r) => r * Math.log(p.b) + lnGamma(p.a + r / p.c) - lnGamma(p.a);
export const gengamma = {
  id: 'gengamma',
  params: [
    { key: 'a', label: 'a', role: 'shape', unit: null, min: 0, minOpen: true },
    { key: 'b', label: 'b', role: 'scale', unit: 'cm', min: 0, minOpen: true },
    { key: 'c', label: 'c', role: 'shape', unit: null, min: 0, minOpen: true }],
  support: () => [0, Infinity],
  logpdf: (d, p) => d > 0 ? Math.log(p.c) - Math.log(p.b) - lnGamma(p.a) + (p.a * p.c - 1) * Math.log(d / p.b) - u(d, p) : -Infinity,
  pdf(d, p) { return d > 0 ? Math.exp(this.logpdf(d, p)) : 0; },
  cdf: (d, p) => d > 0 ? gammaP(p.a, u(d, p)) : 0, sf: (d, p) => d > 0 ? gammaQ(p.a, u(d, p)) : 1,
  logcdf: (d, p) => d > 0 ? lnGammaP(p.a, u(d, p)) : -Infinity, logsf: (d, p) => d > 0 ? lnGammaQ(p.a, u(d, p)) : 0,
  quantile: (q, p) => q <= 0 ? 0 : q >= 1 ? Infinity : p.b * Math.pow(gammaPInv(p.a, q), 1 / p.c),
  mean: p => Math.exp(ggLogMoment(p, 1)),
  /** b²[Γ(a + 2/c)/Γ(a) − (Γ(a + 1/c)/Γ(a))²], written as E[D]²·expm1(L2 − 2L1) to limit the cancellation. */
  variance: p => { const l1 = ggLogMoment(p, 1), l2 = ggLogMoment(p, 2); return Math.exp(2 * l1) * Math.expm1(l2 - 2 * l1); },
  source: 'gengamma',
};
