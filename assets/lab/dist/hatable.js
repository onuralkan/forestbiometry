// Diameter Distribution, stage P25 (23 Nov 2026, user decision): per-hectare stand table, descriptive. No DOM.
// The estimation unit is the plot, as in Plot & Stand Metrics (METHODS §6, design-based estimate): for each class k,
// y_ik = n_ik · 10000 / A_i is the number of trees per hectare of plot i (0 where the plot has no tree in the class);
// the table gives ȳ_k = Σ y_ik / m and SE(ȳ_k) = s_k / √m, s_k² = Σ (y_ik − ȳ_k)² / (m − 1) (simple random sampling,
// Cochran 1977 §2 [B]; no finite population correction). Plots of different sizes are therefore not pooled as one
// area. No distribution is fitted to these numbers (DIST_SPEC decision 3: no hectare-weighted fitting).
import { countRaw } from './classes.js';

/**
 * plots: [{ plot, d: [cm], area: m² }] (one period), cl: classes. → { m, rows: [{ lo, hi, mean, se }], outside: { mean,
 * se } (trees below, above or between the classes), total: { mean, se }, problems: [] }. SE needs m ≥ 2 (null otherwise).
 */
export function haTable(plots, cl) {
  const problems = [];
  if (!cl || !cl.length) problems.push({ code: 'ha.cls' });
  const bad = plots.filter(p => !(Number.isFinite(p.area) && p.area > 0)).map(p => p.plot);
  if (bad.length) problems.push({ code: 'ha.area', plots: bad });
  if (!plots.length) problems.push({ code: 'ha.noplot' });
  if (problems.length) return { problems };
  const m = plots.length, K = cl.length;
  const y = plots.map(p => { const c = countRaw(cl, p.d), f = 10000 / p.area; return { cls: c.counts.map(n => n * f), out: (c.below + c.above + c.gap) * f, all: p.d.length * f }; });
  const ms = vals => { const mean = vals.reduce((a, v) => a + v, 0) / m;
    return { mean, se: m >= 2 ? Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / (m - 1) / m) : null }; };
  return { m, problems: [], rows: cl.map((c, k) => ({ lo: c.lo, hi: c.hi, ...ms(y.map(r => r.cls[k])) })), outside: ms(y.map(r => r.out)), total: ms(y.map(r => r.all)) };
}

/**
 * Plot areas from a column (m², per tree row; must be the same on every row of a plot) or one area for every plot.
 * rows: [{ plot, area }] → { areas: Map plot → m², problems: [{ code, plots }] }.
 */
export function plotAreas(rows, common = null) {
  const areas = new Map(), conflict = new Set(), missing = new Set();
  for (const r of rows) {
    const a = common != null ? common : r.area;
    if (!(Number.isFinite(a) && a > 0)) { missing.add(r.plot); continue; }
    if (areas.has(r.plot) && Math.abs(areas.get(r.plot) - a) > 1e-9 * a) conflict.add(r.plot); else areas.set(r.plot, a);
  }
  const problems = [];
  if (conflict.size) problems.push({ code: 'ha.conflict', plots: [...conflict] });
  if (missing.size) problems.push({ code: 'ha.missing', plots: [...missing] });
  return { areas, problems };
}
