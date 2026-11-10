// Special functions shared by the tools. lnGamma is moved unchanged from assets/tools.js
// (Lanczos, g = 7, 9 terms; checked against SciPy in tests/test_math.js and tests/weibull/test_weibull.mjs).
const LZ = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
export function lnGamma(z) {
  if (z < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * z))) - lnGamma(1 - z);
  z -= 1; let x = LZ[0];
  for (let i = 1; i < 9; i++) x += LZ[i] / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}
export const gammaFn = z => Math.exp(lnGamma(z));

/**
 * g(x) = ln x − ψ(x) for x > 0, computed without the cancellation that ln x − digamma(x) suffers for large x.
 * x ≥ 10: asymptotic series 1/(2x) + 1/(12x²) − 1/(120x⁴) + 1/(252x⁶) − 1/(240x⁸) + 1/(132x¹⁰) − 691/(32760x¹²);
 * below, the recurrence ψ(x) = ψ(x + 1) − 1/x moves x up first. g decreases from +∞ (x → 0) to 0 (x → ∞).
 */
export function lnMinusDigamma(x) {
  if (!(x > 0)) return NaN;
  let add = 0, y = x;
  while (y < 10) { add += 1 / y; y += 1; }                  // ψ(x) = ψ(y) − Σ 1/(x + i)
  const r = 1 / (y * y);
  const gy = 1 / (2 * y) + r * (1 / 12 - r * (1 / 120 - r * (1 / 252 - r * (1 / 240 - r * (1 / 132 - r * 691 / 32760)))));
  return y === x ? gy : Math.log(x / y) + gy + add;          // ln x − ψ(x) = ln x − ln y + g(y) + Σ 1/(x + i)
}
/** Digamma ψ(x) for x > 0. */
export const digamma = x => Math.log(x) - lnMinusDigamma(x);
