// Exponential family with a fixed location (DIST_SPEC §3.9): a = location (cm, never estimated), r > 0 = RATE (1/cm).
//   F(d) = 1 − exp[−r(d − a)],  f(d) = r·exp[−r(d − a)],  d ≥ a;   the SCALE is 1/r (cm), reported separately and never
//   used as the rate. SciPy: expon(loc = a, scale = 1/r). A simple reference model for reverse-J (uneven-aged) stands.
// Logarithms are computed directly: ln F = ln(−expm1(−u)) below ln 2, log1p(−e^(−u)) above, u = r(d − a).
export const exponential = {
  id: 'exponential',
  params: [
    { key: 'a', label: 'a', role: 'location', unit: 'cm', min: 0 },
    { key: 'r', label: 'r', role: 'rate', unit: '1/cm', min: 0, minOpen: true }],
  support: p => [p.a, Infinity],
  logpdf: (d, p) => d >= p.a ? Math.log(p.r) - p.r * (d - p.a) : -Infinity,
  pdf(d, p) { return d >= p.a ? p.r * Math.exp(-p.r * (d - p.a)) : 0; },
  cdf: (d, p) => d > p.a ? -Math.expm1(-p.r * (d - p.a)) : 0,
  sf: (d, p) => d > p.a ? Math.exp(-p.r * (d - p.a)) : 1,
  logcdf(d, p) { if (!(d > p.a)) return -Infinity; const u = p.r * (d - p.a); return u < Math.LN2 ? Math.log(-Math.expm1(-u)) : Math.log1p(-Math.exp(-u)); },
  logsf: (d, p) => d > p.a ? -p.r * (d - p.a) : 0,
  quantile: (q, p) => q <= 0 ? p.a : q >= 1 ? Infinity : p.a - Math.log1p(-q) / p.r,
  mean: p => p.a + 1 / p.r,
  variance: p => 1 / (p.r * p.r),
  /** Scale 1/r (cm), shown next to the rate so that the two are never confused. */
  diagnostics: p => ({ scale: 1 / p.r }),
  source: 'exponential',
};
