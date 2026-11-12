// Gumbel family, MAXIMUM form (largest extreme value, extreme value type I; DIST_SPEC P20, NIST [R19]):
//   F(d) = exp{−exp[−(d − μ)/β]},  f(d) = (1/β)·e^(−z)·exp(−e^(−z)),  z = (d − μ)/β;  μ location (cm), β > 0 scale (cm).
//   Q_p = μ − β ln(−ln p);  E[D] = μ + γ_E β (γ_E Euler–Mascheroni);  Var[D] = π²β²/6.
// Right-skewed. The minimum form, F(d) = 1 − exp{−exp[(d − μ)/β]}, is a different (left-skewed) distribution with
// E[D] = μ − γ_E β; it is not offered. Support: the whole real line, so a fitted Gumbel gives diameters below zero the
// probability F(0) = exp[−exp(μ/β)]; it is reported with every result.
export const EULER_GAMMA = 0.5772156649015329;
const zOf = (d, p) => (d - p.mu) / p.beta;
export const gumbel = {
  id: 'gumbel',
  params: [
    { key: 'mu', label: 'μ', role: 'location', unit: 'cm' },
    { key: 'beta', label: 'β', role: 'scale', unit: 'cm', min: 0, minOpen: true }],
  support: () => [-Infinity, Infinity],
  logpdf: (d, p) => { const z = zOf(d, p); return -Math.log(p.beta) - z - Math.exp(-z); },
  pdf(d, p) { return Math.exp(this.logpdf(d, p)); },
  cdf: (d, p) => Math.exp(-Math.exp(-zOf(d, p))),
  sf: (d, p) => -Math.expm1(-Math.exp(-zOf(d, p))),
  logcdf: (d, p) => -Math.exp(-zOf(d, p)),
  /** ln(1 − e^(−t)), t = e^(−z): log1p(−F) where F < ½; ln(−expm1(−t)) above the median; far in the upper tail
   *  (t < 1e−10) ln t − t/2 = −z − t/2. */
  logsf: (d, p) => { const z = zOf(d, p), t = Math.exp(-z); return t > Math.LN2 ? Math.log1p(-Math.exp(-t)) : t < 1e-10 ? -z - t / 2 : Math.log(-Math.expm1(-t)); },
  quantile: (q, p) => q <= 0 ? -Infinity : q >= 1 ? Infinity : p.mu - p.beta * Math.log(-Math.log(q)),
  mean: p => p.mu + EULER_GAMMA * p.beta, variance: p => Math.PI * Math.PI * p.beta * p.beta / 6,
  /** Probability of a diameter below zero, F(0) = exp[−exp(μ/β)]. */
  diagnostics: p => ({ pBelowZero: Math.exp(-Math.exp(p.mu / p.beta)) }),
  source: 'gumbel',
};
