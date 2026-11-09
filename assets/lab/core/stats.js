// Small statistics core (no DOM): regularised incomplete beta and gamma, normal and Student t distributions and quantiles,
// a seeded random generator and a stable shuffle. Checked against SciPy in tests/hd/test_hd.mjs.
import { lnGamma } from './special.js';

/** Continued fraction for the incomplete beta function (modified Lentz; Numerical Recipes "betacf"). */
function betacf(a, b, x) {
  const TINY = 1e-300, EPS = 1e-16;
  let c = 1, d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d; let h = d;
  for (let m = 1; m <= 1000; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY; c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY; d = 1 / d; h *= d * c;
    aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY; c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY; d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}
/** Regularised incomplete beta I_x(a, b). */
export function betaInc(a, b, x) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const lbt = lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log1p(-x);
  return x < (a + 1) / (a + b + 2) ? Math.exp(lbt) * betacf(a, b, x) / a : 1 - Math.exp(lbt) * betacf(b, a, 1 - x) / b;
}
/** Student t cumulative distribution P(T ≤ t), ν > 0 degrees of freedom. */
export function tCdf(t, nu) {
  const x = nu / (nu + t * t), tail = 0.5 * betaInc(nu / 2, 0.5, x);
  return t >= 0 ? 1 - tail : tail;
}
/** Student t quantile: the t with P(T ≤ t) = p (0 < p < 1). Bisection on the cdf to 1e-13. */
export function tQuantile(p, nu) {
  if (!(p > 0 && p < 1) || !(nu > 0)) return NaN;
  if (p === 0.5) return 0;
  if (p < 0.5) return -tQuantile(1 - p, nu);
  let lo = 0, hi = 1;
  while (tCdf(hi, nu) < p) { lo = hi; hi *= 2; if (hi > 1e12) return Infinity; }
  for (let i = 0; i < 200 && hi - lo > 1e-13 * Math.max(1, hi); i++) { const m = (lo + hi) / 2; if (tCdf(m, nu) < p) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

/** Regularised lower incomplete gamma P(a, x): series for x < a + 1, Lentz continued fraction otherwise. */
export function gammaP(a, x) {
  if (x <= 0) return 0;
  const lg = lnGamma(a);
  if (x < a + 1) {
    let ap = a, sum = 1 / a, del = sum;
    for (let n = 0; n < 1000; n++) { ap += 1; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-16) break; }
    return sum * Math.exp(-x + a * Math.log(x) - lg);
  }
  const TINY = 1e-300; let b = x + 1 - a, c = 1 / TINY, d = 1 / b, h = d;
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a); b += 2;
    d = an * d + b; if (Math.abs(d) < TINY) d = TINY; c = b + an / c; if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-16) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - lg) * h;
}
/** Standard normal cumulative distribution Φ(z) = ½[1 + sign(z)·P(½, z²/2)]. */
export function normCdf(z) { const p = gammaP(0.5, z * z / 2); return z >= 0 ? 0.5 + 0.5 * p : 0.5 - 0.5 * p; }
/** Standard normal quantile Φ⁻¹(p), bisection on Φ to 1e-14 (0 < p < 1). */
export function normQuantile(p) {
  if (!(p > 0 && p < 1)) return NaN;
  if (p === 0.5) return 0;
  if (p < 0.5) return -normQuantile(1 - p);
  let lo = 0, hi = 1; while (normCdf(hi) < p) { lo = hi; hi *= 2; if (hi > 64) return Infinity; }
  for (let i = 0; i < 200 && hi - lo > 1e-14; i++) { const m = (lo + hi) / 2; if (normCdf(m) < p) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

/** mulberry32: small seeded generator returning numbers in [0, 1). Same sequence in tests/ref/make_hd_reference.py. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Fisher–Yates shuffle of a copy, driven by rng(seed). */
export function shuffle(arr, seed) {
  const a = arr.slice(), r = rng(seed);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
