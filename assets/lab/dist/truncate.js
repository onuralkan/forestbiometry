// Measurement thresholds (truncation; DIST_SPEC §2.2–2.3, stage P11). No DOM.
// A threshold is a property of the OBSERVATION (only trees with L ≤ d ≤ U were recorded), not of the distribution:
// the distribution keeps its own support and parameters; what was observed follows the conditional distribution
//   f_T(d) = f(d)/[F(U) − F(L)],   F_T(d) = [F(d) − F(L)]/[F(U) − F(L)],   L ≤ d ≤ U.
// U = ∞ when there is no upper threshold. The mass F(U) − F(L) is computed on the log scale from the side where it is
// accurate (lower side with F(L) < ½, otherwise from the survival function), so far tails do not cancel.
const LN2 = Math.LN2;
/** ln(1 − e^x) for x ≤ 0, without cancellation (Mächler 2012). */
export const log1mexp = x => x === 0 ? -Infinity : x > -LN2 ? Math.log(-Math.expm1(x)) : Math.log1p(-Math.exp(x));
const has = v => v != null && Number.isFinite(v);
/** ln P(L ≤ D ≤ U) under the (untruncated) distribution. */
export function logMass(fam, p, L, U) {
  const lo = has(L), hi = has(U);
  if (!lo && !hi) return 0;
  if (!lo) return fam.logcdf(U, p);
  if (!hi) return fam.logsf(L, p);
  const lcL = fam.logcdf(L, p);
  if (lcL < -LN2) { const lcU = fam.logcdf(U, p); return lcU + log1mexp(lcL - lcU); }
  const lsL = fam.logsf(L, p), lsU = fam.logsf(U, p);
  return lsL + log1mexp(lsU - lsL);
}
/**
 * The observed (conditional) distribution as a family-like object (pdf, logpdf, cdf, logcdf, sf, logsf, quantile of
 * d only), so that fit statistics and charts use it unchanged. t = { lower, upper } (cm; null = none).
 */
export function truncated(fam, p, t) {
  const L = has(t.lower) ? t.lower : null, U = has(t.upper) ? t.upper : null, lm = logMass(fam, p, L, U);
  const inside = d => (L == null || d >= L) && (U == null || d <= U);
  const lowerSide = L == null || fam.logcdf(L, p) < -LN2;
  const lcL = L == null ? -Infinity : fam.logcdf(L, p), lsU = U == null ? -Infinity : fam.logsf(U, p);
  // ln[F(d) − F(L)] or ln[S(d) − S(U)]
  const logcdfT = d => { if (L != null && d <= L) return -Infinity; if (U != null && d >= U) return 0;
    if (lowerSide) { const lc = fam.logcdf(d, p); return lc + log1mexp(lcL - lc) - lm; }
    return log1mexp(logsfT(d)); };
  const logsfT = d => { if (L != null && d <= L) return 0; if (U != null && d >= U) return -Infinity;
    if (!lowerSide) { const ls = fam.logsf(d, p); return ls + log1mexp(lsU - ls) - lm; }
    return log1mexp(logcdfT(d)); };
  const obj = {
    id: fam.id + '|trunc', base: fam, params: p, lower: L, upper: U, logMass: lm, mass: Math.exp(lm),
    logpdf: d => inside(d) ? fam.logpdf(d, p) - lm : -Infinity,
    pdf: d => inside(d) ? Math.exp(fam.logpdf(d, p) - lm) : 0,
    logcdf: logcdfT, logsf: logsfT, cdf: d => Math.exp(logcdfT(d)), sf: d => Math.exp(logsfT(d)),
    /** F_T⁻¹(q): base quantile at F(L) + q·mass (lower side) or at 1 − [S(U) + (1 − q)·mass] (upper side). */
    quantile(q) {
      if (q <= 0) return L ?? fam.quantile(0, p); if (q >= 1) return U ?? fam.quantile(1, p);
      if (lowerSide) return fam.quantile(Math.exp(lcL) + q * Math.exp(lm), p);
      return fam.quantile(1 - (Math.exp(lsU) + (1 - q) * Math.exp(lm)), p);
    },
    support: () => [L ?? fam.support(p)[0], U ?? fam.support(p)[1]],
  };
  return obj;
}
/** Conditional log-likelihood Σ ln f(d) − n ln[F(U) − F(L)]; −∞ if an observation is outside the support. */
export function truncLogLik(fam, p, d, t) {
  const lm = logMass(fam, p, has(t.lower) ? t.lower : null, has(t.upper) ? t.upper : null);
  if (!Number.isFinite(lm)) return -Infinity;
  let s = 0; for (const v of d) { const l = fam.logpdf(v, p); if (l === -Infinity) return -Infinity; s += l; }
  return s - d.length * lm;
}
/** Option check: at least one threshold, L ≥ 0, U > L. */
export function checkTrunc(t = {}) {
  const lo = t.lower, hi = t.upper;
  if (lo == null && hi == null) return [{ code: 'trunc.none' }];
  if (lo != null && !(Number.isFinite(lo) && lo >= 0)) return [{ code: 'trunc.lower', value: lo }];
  if (hi != null && !(Number.isFinite(hi) && hi > 0)) return [{ code: 'trunc.upper', value: hi }];
  if (lo != null && hi != null && !(hi > lo)) return [{ code: 'trunc.order', lower: lo, upper: hi }];
  return [];
}
