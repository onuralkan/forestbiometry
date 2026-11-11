// Fit statistics for any registered family (raw diameters). No p-values here: with parameters estimated from the
// same data the standard tables do not apply (docs/DIST_SPEC.md §2.4; bootstrap comes in P14).
/** Log-likelihood on the original diameter scale. −Infinity when an observation is outside the support. */
export function logLik(fam, p, d) { let s = 0; for (const v of d) { const l = fam.logpdf(v, p); if (l === -Infinity) return -Infinity; s += l; } return s; }
/** Two-sided Kolmogorov–Smirnov D = max(D⁺, D⁻): D⁺ = max[j/n − F(d(j))], D⁻ = max[F(d(j)) − (j − 1)/n]. */
export function ks(fam, p, d) {
  const s = [...d].sort((u, v) => u - v), n = s.length; let D = 0;
  s.forEach((v, i) => { const F = fam.cdf(v, p); D = Math.max(D, (i + 1) / n - F, F - i / n); });
  return D;
}
/** Anderson–Darling A² = −n − (1/n) Σ (2i − 1)[ln F(d(i)) + ln(1 − F(d(n+1−i)))], from logcdf and logsf. */
export function ad(fam, p, d) {
  const s = [...d].sort((u, v) => u - v), n = s.length; let S = 0;
  for (let i = 1; i <= n; i++) S += (2 * i - 1) * (fam.logcdf(s[i - 1], p) + fam.logsf(s[n - i], p));
  return -n - S / n;
}
/** AIC = 2k − 2ℓ, BIC = k ln n − 2ℓ; n = number of observed trees, k = number of freely estimated parameters. */
export const aicBic = (ll, k, n) => ({ k, aic: 2 * k - 2 * ll, bic: k * Math.log(n) - 2 * ll });
/** Cramér–von Mises W² = 1/(12n) + Σ [F(d(i)) − (2i − 1)/(2n)]² (no p-value: parameters estimated from the same data). */
export function cvm(fam, p, d) {
  const s = [...d].sort((u, v) => u - v), n = s.length; let S = 1 / (12 * n);
  for (let i = 1; i <= n; i++) S += (fam.cdf(s[i - 1], p) - (2 * i - 1) / (2 * n)) ** 2;
  return S;
}
/** AICc = AIC + 2k(k + 1)/(n − k − 1); null when n ≤ k + 1 (not defined). Small-sample correction derived for regular models. */
export const aicc = (ll, k, n) => n > k + 1 ? 2 * k - 2 * ll + 2 * k * (k + 1) / (n - k - 1) : null;
