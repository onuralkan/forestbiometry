// Diameter Distribution Lab, Weibull version: pure logic (no DOM). Definitions: docs/METHODS.md §8.
// Parameters everywhere: a = location, b > 0 = scale, c > 0 = shape.
//   F(d) = 1 − exp(−((d − a)/b)^c) for d > a;  F(d) = 0 for d ≤ a.
// The location a is NEVER estimated here: it is 0 (two-parameter form) or a value the user fixes.
import { lnGamma } from '../../assets/lab/core/special.js';
import { classIndex } from '../../assets/lab/stand/calc.js';

export const TOOL = { id: 'cap-dagilimi', version: '1.0.0' };
export const C_RANGE = [0.01, 1000];               // search interval for the shape c
export const FEW_UNIQUE = 10;                      // screening threshold for "few distinct values" (tool rule, not literature)

/* ---------------- distribution ---------------- */
const z = (d, p) => (d - p.a) / p.b;
export const cdf = (d, p) => d <= p.a ? 0 : -Math.expm1(-(z(d, p) ** p.c));
export const sf = (d, p) => d <= p.a ? 1 : Math.exp(-(z(d, p) ** p.c));
export function pdf(d, p) {
  if (d <= p.a) return 0;
  const t = z(d, p);
  return (p.c / p.b) * t ** (p.c - 1) * Math.exp(-(t ** p.c));
}
export const quantile = (q, p) => q <= 0 ? p.a : q >= 1 ? Infinity : p.a + p.b * (-Math.log1p(-q)) ** (1 / p.c);
export function moments(p) {
  const g1 = Math.exp(lnGamma(1 + 1 / p.c)), g2 = Math.exp(lnGamma(1 + 2 / p.c));
  const v = p.b * p.b * (g2 - g1 * g1);
  return { mean: p.a + p.b * g1, sd: Math.sqrt(Math.max(0, v)), median: quantile(0.5, p), mode: p.c > 1 ? p.a + p.b * ((p.c - 1) / p.c) ** (1 / p.c) : p.a };
}
export const validParams = p => [p.a, p.b, p.c].every(Number.isFinite) && p.b > 0 && p.c > 0;
export function logLik(d, p) {
  let s = 0;
  for (const v of d) { if (v <= p.a) return -Infinity; const t = z(v, p); s += Math.log(p.c / p.b) + (p.c - 1) * Math.log(t) - t ** p.c; }
  return s;
}

/* ---------------- sample checks ---------------- */
/** a: location to use (0 for the two-parameter form, or the user's fixed value). */
export function checkSample(d, a = 0) {
  const n = d.length, uniq = new Set(d).size;
  let mn = Infinity, mx = -Infinity; for (const v of d) { if (v < mn) mn = v; if (v > mx) mx = v; }
  const problems = [], notices = [];
  if (n < 2) problems.push({ code: 'n.few', n });
  else if (uniq < 2) problems.push({ code: 'constant', value: mn });
  if (!Number.isFinite(a)) problems.push({ code: 'a.bad' });
  else if (n && !(mn > a)) problems.push({ code: 'a.notbelow', a, min: mn });      // every d − a must be > 0
  if (Number.isFinite(a) && a < 0) problems.push({ code: 'a.negative', a });
  if (n >= 2 && uniq >= 2 && uniq < FEW_UNIQUE) notices.push({ code: 'few.unique', unique: uniq, n });
  if (n >= 20 && uniq <= 15 && uniq / n < 0.2) notices.push({ code: 'looks.grouped', unique: uniq, n });
  return { n, unique: uniq, min: n ? mn : null, max: n ? mx : null, problems, notices };
}

/* ---------------- root finding with explicit status ---------------- */
/** f monotone on [lo, hi]. Returns { root, status:'ok'|'below'|'above'|'nonfinite'|'maxiter', iter }. */
export function solveMonotone(f, lo, hi, maxIter = 300) {
  let flo = f(lo), fhi = f(hi);
  if (!Number.isFinite(flo) || !Number.isFinite(fhi)) return { root: null, status: 'nonfinite', iter: 0 };
  const inc = fhi > flo;
  if (inc ? flo > 0 : flo < 0) return { root: lo, status: 'below', iter: 0 };       // root < lo
  if (inc ? fhi < 0 : fhi > 0) return { root: hi, status: 'above', iter: 0 };       // root > hi
  for (let i = 1; i <= maxIter; i++) {
    const mid = Math.sqrt(lo * hi), fm = f(mid);                                     // geometric bisection: c spans 5 decades
    if (!Number.isFinite(fm)) return { root: null, status: 'nonfinite', iter: i };
    if (fm === 0) return { root: mid, status: 'ok', iter: i };
    if ((fm > 0) === inc) hi = mid; else lo = mid;
    if (hi / lo - 1 < 1e-14) return { root: Math.sqrt(lo * hi), status: 'ok', iter: i };
  }
  return { root: Math.sqrt(lo * hi), status: 'maxiter', iter: maxIter };
}

/* ---------------- estimators (location fixed) ---------------- */
function result(method, a, aKind, s, extra) { return { method, a, aKind, b: null, c: null, status: 'problem', problems: s.problems, notices: s.notices, n: s.n, ...extra }; }
/**
 * Maximum likelihood with the location fixed at a. Profile score for c:
 *   g(c) = Σ x^c ln x / Σ x^c − 1/c − mean(ln x) = 0,  x = d − a;  then b = (mean x^c)^(1/c).
 * g is increasing in c; a root inside C_RANGE is required, otherwise the solution is reported as a boundary.
 */
export function fitML(d, a = 0, aKind = 'zero') {
  const s = checkSample(d, a), out = result('ml', a, aKind, s, {});
  if (s.problems.length) return out;
  const x = d.map(v => v - a), lx = x.map(Math.log), mx = Math.max(...x), y = x.map(v => v / mx);
  const mlx = lx.reduce((p, q) => p + q, 0) / x.length;
  const g = c => { let sy = 0, syl = 0; for (let i = 0; i < y.length; i++) { const t = y[i] ** c; sy += t; syl += t * lx[i]; } return syl / sy - 1 / c - mlx; };
  const r = solveMonotone(g, C_RANGE[0], C_RANGE[1]);
  out.iter = r.iter;
  if (r.status !== 'ok') { out.status = r.status === 'below' || r.status === 'above' ? 'boundary' : 'noconverge'; out.side = r.status; out.c = r.root; return out; }
  const c = r.root, b = mx * (y.reduce((p, q) => p + q ** c, 0) / y.length) ** (1 / c);
  Object.assign(out, { b, c, status: 'ok', score: g(c) });
  out.logLik = logLik(d, out);
  return out;
}
/**
 * Method of moments with the location fixed at a: match the mean and the sample variance (n − 1) of x = d − a.
 *   CV² = s²/x̄² = Γ(1 + 2/c)/Γ²(1 + 1/c) − 1 (decreasing in c);  b = x̄ / Γ(1 + 1/c).
 */
export function fitMoments(d, a = 0, aKind = 'zero') {
  const s = checkSample(d, a), out = result('mom', a, aKind, s, {});
  if (s.problems.length) return out;
  const x = d.map(v => v - a), n = x.length, m = x.reduce((p, q) => p + q, 0) / n;
  const v = x.reduce((p, q) => p + (q - m) ** 2, 0) / (n - 1), cv2 = v / (m * m);
  const h = c => Math.exp(lnGamma(1 + 2 / c) - 2 * lnGamma(1 + 1 / c)) - 1 - cv2;
  const r = solveMonotone(h, C_RANGE[0], C_RANGE[1]);
  out.iter = r.iter;
  if (r.status !== 'ok') { out.status = r.status === 'below' || r.status === 'above' ? 'boundary' : 'noconverge'; out.side = r.status; out.c = r.root; return out; }
  const c = r.root;
  Object.assign(out, { b: m / Math.exp(lnGamma(1 + 1 / c)), c, status: 'ok' });
  out.logLik = logLik(d, out);
  return out;
}

/* ---------------- fit statistics (no p-values: see METHODS.md §8) ---------------- */
export function ks(d, p) {
  const s = [...d].sort((u, v) => u - v), n = s.length; let D = 0;
  s.forEach((v, i) => { const F = cdf(v, p); D = Math.max(D, F - i / n, (i + 1) / n - F); });
  return D;
}
/** Anderson–Darling A² = −n − (1/n) Σ (2i − 1)[ln F(x(i)) + ln(1 − F(x(n+1−i)))], on the log scale for stability. */
export function ad(d, p) {
  const s = [...d].sort((u, v) => u - v), n = s.length;
  const lF = v => { const t = z(v, p) ** p.c; return t < 1e-12 ? Math.log(t) - t / 2 : Math.log(-Math.expm1(-t)); };   // ln F (series for tiny t)
  const lS = v => -(z(v, p) ** p.c);                                                                            // ln(1 − F)
  let S = 0;
  for (let i = 1; i <= n; i++) S += (2 * i - 1) * (lF(s[i - 1]) + lS(s[n - i]));
  return -n - S / n;
}
/** AIC/BIC for a maximum likelihood fit with k free parameters (location fixed → k = 2). */
export const aicBic = (ll, k, n) => ({ aic: 2 * k - 2 * ll, bic: k * Math.log(n) - 2 * ll, k });

/* ---------------- class frequencies: expected = n·[F(upper) − F(lower)], tails apart ---------------- */
export function classTable(d, p, classes) {
  const n = d.length, rows = classes.map(k => ({ lo: k.lo, hi: k.hi, obs: 0, prob: (k.hi === Infinity ? sf(k.lo, p) : sf(k.lo, p) - sf(k.hi, p)) }));
  let below = 0, above = 0;
  for (const v of d) { const i = classIndex(classes, v); if (i < 0) below++; else if (i >= classes.length) above++; else rows[i].obs++; }
  for (const r of rows) r.exp = n * r.prob;
  const last = classes[classes.length - 1];
  const lower = { obs: below, prob: cdf(classes[0].lo, p) }; lower.exp = n * lower.prob;
  const upper = { obs: above, prob: last.hi === Infinity ? 0 : sf(last.hi, p) }; upper.exp = n * upper.prob;
  const visible = rows.reduce((s, r) => s + r.prob, 0);
  return { rows, lower, upper, n, visibleProb: visible, totalProb: visible + lower.prob + upper.prob };
}
/** Empirical CDF points (step function: value i/n just after the i-th order statistic). */
export function ecdf(d) { const s = [...d].sort((u, v) => u - v), n = s.length; return s.map((v, i) => [v, (i + 1) / n]); }

/* ---------------- one analysis unit (a plot, or all trees pooled) ---------------- */
/** aFixed: user's fixed location or null. Returns the fits in a fixed order. */
export function analyse(d, aFixed) {
  const fits = [fitML(d, 0, 'zero'), fitMoments(d, 0, 'zero')];
  if (aFixed != null) fits.push(fitML(d, aFixed, 'fixed'), fitMoments(d, aFixed, 'fixed'));
  for (const f of fits) if (f.status === 'ok') {
    f.ks = ks(d, f); f.ad = ad(d, f); f.mom = moments(f);
    if (f.method === 'ml') Object.assign(f, aicBic(f.logLik, 2, d.length));      // AIC only where the likelihood was maximised
  }
  const s = checkSample(d, 0);
  return { n: s.n, unique: s.unique, min: s.min, max: s.max, mean: s.n ? d.reduce((p, q) => p + q, 0) / s.n : null, fits };
}
