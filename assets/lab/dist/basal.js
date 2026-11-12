// Empirical basal area diameter distribution, descriptive only (DIST_SPEC P23; Kangas and Maltamo 2000, §2.2–2.3,
// [R23], read). No DOM. Every tree is weighted by its basal area g = π d²/40000 (m², d in cm):
//   F_G(x) = Σ_{d_i ≤ x} g_i / Σ g_i   next to the ordinary empirical distribution by number F_N(x) = #{d_i ≤ x}/n.
// Percentiles of the basal area distribution (tool rule, recorded with the result): the inverse of the step function,
//   x_p = the smallest observed d with F_G(d) ≥ p  (p = 0 → the smallest diameter); x_0.5 = dgM, the basal-area median
//   diameter. Same definition as numpy.percentile(…, weights = g, method = 'inverted_cdf').
// Classes: class basal area b_k (m²/ha with a plot area, else m² on the plot) and its share of the total; conversion to
// numbers of trees f_k = b_k / ḡ_k (source, eq. 1). ḡ_k is either the observed mean basal area of the trees in the class
// (then f_k equals the observed count exactly) or the basal area of the class mid-diameter, an approximation labelled as
// such (not given for an open class). No parametric family is fitted to basal-area-weighted data here.
import { classOf } from './classes.js';

export const BA_PROBS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1];
export const BA_DEF = 'smallest d with F_G(d) >= p (inverse of the basal-area weighted step ECDF; numpy inverted_cdf)';
export const gOf = d => Math.PI * d * d / 40000;
const REL = 1e-12;                                  // tolerance on F_G ≥ p against rounding in the cumulative sums

/** Distinct sorted diameters with F_N and F_G at each; N, G (m² on the plot). Diameters must be positive. */
export function baEcdf(d) {
  const s = [...d].sort((a, b) => a - b), n = s.length, G = s.reduce((a, v) => a + gOf(v), 0);
  const x = [], FN = [], FG = []; let cn = 0, cg = 0;
  for (let i = 0; i < n; i++) { cn++; cg += gOf(s[i]); if (i === n - 1 || s[i + 1] !== s[i]) { x.push(s[i]); FN.push(cn / n); FG.push(cg / G); } }
  return { x, FN, FG, N: n, G };
}
/** Diameters at the basal-area percentiles; dgM = x_0.5. */
export function baPercentiles(d, probs = BA_PROBS) {
  const e = baEcdf(d);
  const at = p => { if (p <= 0) return e.x[0]; for (let i = 0; i < e.x.length; i++) if (e.FG[i] >= p - REL) return e.x[i]; return e.x[e.x.length - 1]; };
  return { probs: probs.slice(), d: probs.map(at), dgM: at(0.5), def: BA_DEF };
}
/** Problems: too few trees, non-positive diameters. */
export function checkBasal(d) {
  const bad = d.filter(v => !(v > 0));
  if (bad.length) return [{ code: 'd.nonpos', count: bad.length, example: bad[0] }];
  if (d.length < 1) return [{ code: 'n.few', n: d.length }];
  return [];
}
/**
 * Class table of basal area: per class n_k, b_k, share, ḡ_k (observed) and f_k = b_k/ḡ_k, ḡ_k and f_k from the class
 * mid-diameter (approximation; null for an open class); rows below, above and in gaps; totals. perHa = 10000/area or null.
 */
export function baClassTable(cl, d, perHa = null) {
  const k = perHa || 1, G = d.reduce((a, v) => a + gOf(v), 0), N = d.length;
  const acc = () => ({ n: 0, g: 0 }), cls = cl.map(acc), below = acc(), above = acc(), gap = acc();
  for (const v of d) { const i = classOf(cl, v), t = i === -1 ? below : i === -2 ? gap : i >= cl.length ? above : cls[i]; t.n++; t.g += gOf(v); }
  const row = (t, c) => {
    const b = t.g * k, gObs = t.n ? t.g / t.n : null, mid = c && c.hi !== Infinity ? (c.lo + c.hi) / 2 : null, gMid = mid != null ? gOf(mid) : null;
    return { ...(c ? { lo: c.lo, hi: c.hi } : {}), n: t.n, nHa: t.n * k, b, share: G > 0 ? t.g / G : null, gObs, fObs: gObs ? b / gObs : (t.n ? null : 0), mid, gMid, fMid: gMid ? b / gMid : null };
  };
  return { rows: cls.map((t, j) => row(t, cl[j])), below: row(below), above: row(above), gaps: row(gap), N, G, total: { n: N, nHa: N * k, b: G * k }, perHa, unit: perHa ? 'm2/ha' : 'm2 (plot)' };
}
