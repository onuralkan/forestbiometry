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
