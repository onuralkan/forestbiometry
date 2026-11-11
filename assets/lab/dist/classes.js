// Diameter classes and grouped data (DIST_SPEC §2.3, stage P12). No DOM.
// A class is the half-open interval [lo, hi) in cm; the last class may be open-ended (hi = Infinity). Widths may differ.
// Classes must not overlap; gaps between classes are allowed and are NOT classes (see `outside` below).
// Probabilities are CDF differences p_j = F(hi_j) − F(lo_j), computed on the log scale from the accurate side
// (truncate.js logMass); no "+1" or mid-point correction of any kind.
import { logMass } from './truncate.js';

const has = v => v != null && Number.isFinite(v);
/** Classes from a start and a width up to (at least) a maximum, or from explicit edges (last edge may be Infinity). */
export function makeClasses(spec) {
  if (spec.edges) {
    const e = spec.edges;
    return e.slice(0, -1).map((lo, i) => ({ lo, hi: e[i + 1] }));
  }
  const { start, width, max } = spec, out = [];
  for (let lo = start, i = 0; lo <= max && i < 10000; i++, lo = start + i * width) out.push({ lo: +lo.toFixed(10), hi: +(start + (i + 1) * width).toFixed(10) });
  if (spec.openLast && out.length) out[out.length - 1].hi = Infinity;
  return out;
}
/** Problems of a class list: empty, not increasing, overlapping, open class not last. */
export function checkClasses(cl) {
  if (!cl.length) return [{ code: 'cls.none' }];
  for (let i = 0; i < cl.length; i++) {
    const c = cl[i];
    if (!has(c.lo) || !(c.hi > c.lo)) return [{ code: 'cls.bad', i, lo: c.lo, hi: c.hi }];
    if (c.hi === Infinity && i < cl.length - 1) return [{ code: 'cls.open', i }];
    if (i && c.lo < cl[i - 1].hi) return [{ code: 'cls.overlap', i, lo: c.lo, prevHi: cl[i - 1].hi }];
  }
  return [];
}
/** Index of the class holding d; -1 below the first, cl.length above the last, -2 in a gap between classes. */
export function classOf(cl, d) {
  if (d < cl[0].lo) return -1;
  for (let i = 0; i < cl.length; i++) { if (d < cl[i].lo) return -2; if (d < cl[i].hi) return i; }
  return cl.length;
}
/** ln p_j for every class under a distribution-like object G (family + params, or a truncated one). */
export function logClassProbs(fam, p, cl) { return cl.map(c => logMass(fam, p, c.lo, c.hi === Infinity ? null : c.hi)); }
/**
 * Class table for one fit. counts: observed counts per class (integers for trees); n: observed total that the
 * expected counts refer to; perHa: factor to trees per hectare (10000 / plot area in m²) or null.
 * Tails: below the first class and above the last (if the last is closed); gaps: probability between classes.
 */
export function classTable(fam, p, cl, counts, { n, perHa = null, below = 0, above = 0, gap = 0 } = {}) {
  const lp = logClassProbs(fam, p, cl), rows = cl.map((c, j) => {
    const prob = Math.exp(lp[j]); return { lo: c.lo, hi: c.hi, width: c.hi - c.lo, obs: counts[j], prob, exp: n * prob, ...(perHa ? { obsHa: counts[j] * perHa, expHa: n * prob * perHa } : {}) };
  });
  const lo0 = cl[0].lo, hiK = cl[cl.length - 1].hi;
  const pBelow = Math.exp(logMass(fam, p, null, lo0)), pAbove = hiK === Infinity ? 0 : Math.exp(logMass(fam, p, hiK, null));
  const visible = rows.reduce((s, r) => s + r.prob, 0);
  let pGap = 0; for (let j = 1; j < cl.length; j++) if (cl[j].lo > cl[j - 1].hi) pGap += Math.exp(logMass(fam, p, cl[j - 1].hi, cl[j].lo));   // gaps from their own CDF differences
  const tail = (obs, prob) => ({ obs, prob, exp: n * prob, ...(perHa ? { obsHa: obs * perHa, expHa: n * prob * perHa } : {}) });
  return { rows, lower: tail(below, pBelow), upper: tail(above, pAbove), gaps: tail(gap, pGap), n, perHa, visibleProb: visible, totalProb: visible + pBelow + pAbove + pGap,
    absDiff: rows.reduce((s, r) => s + Math.abs(r.obs - r.exp), 0) };
}
/** Observed counts of raw diameters in the classes, with the counts below, above and in gaps. */
export function countRaw(cl, d) {
  const counts = cl.map(() => 0); let below = 0, above = 0, gap = 0;
  for (const v of d) { const i = classOf(cl, v); if (i === -1) below++; else if (i === -2) gap++; else if (i >= cl.length) above++; else counts[i]++; }
  return { counts, below, above, gap };
}
