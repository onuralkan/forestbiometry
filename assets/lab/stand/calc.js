// Plot & Stand Metrics: pure logic (no DOM). Definitions: docs/METHODS.md §6.
// Scope: fixed-area plots, every tree on the plot has the same inclusion probability.
// Nested plots and angle counts (Bitterlich) need per-tree expansion factors and are NOT handled here.
export const TOOL = { id: 'ornek-alan-mescere', version: '1.0.0' };
export const SCHEMA = 'forest-dataset/1';

const BA = d => Math.PI * d * d / 40000;          // basal area of one tree, m² (d in cm)
const r9 = x => Math.round(x * 1e9) / 1e9;

/* ---------------- input dataset ---------------- */
/** Structural check of a forest-dataset/1 object (from the Data Checker or a downloaded JSON package). */
export function validateDataset(ds) {
  const p = [];
  if (!ds || typeof ds !== 'object') return ['ds.notobject'];
  if (ds.schema !== SCHEMA) p.push('ds.schema');
  if (!Array.isArray(ds.plots) || !Array.isArray(ds.trees)) { p.push('ds.arrays'); return p; }
  const plots = new Set();
  for (const pl of ds.plots) {
    if (typeof pl.plot_id !== 'string') p.push('ds.plotid');
    if (!(Number.isFinite(pl.plot_area) && pl.plot_area > 0)) p.push('ds.plotarea');
    if (plots.has(pl.plot_id)) p.push('ds.plotdup');
    plots.add(pl.plot_id);
  }
  for (const t of ds.trees) {
    if (!plots.has(t.plot_id)) p.push('ds.treeplot');
    if (!(Number.isFinite(t.dbh) && t.dbh > 0)) p.push('ds.dbh');
    if (t.height != null && !(Number.isFinite(t.height) && t.height > 0)) p.push('ds.height');
  }
  return [...new Set(p)];
}
/** Distinct periods; null means "no period recorded". Numeric periods sort numerically. */
export function periodsOf(ds) {
  const s = new Set(ds.trees.map(t => t.period ?? null));
  if (!s.size) return [null];                         // only empty plots: one unit per plot
  const arr = [...s];
  const num = arr.every(v => v == null || /^-?\d+(\.\d+)?$/.test(v));
  return arr.sort((a, b) => a == null ? 1 : b == null ? -1 : num ? +a - +b : a < b ? -1 : a > b ? 1 : 0);
}
export function statusesOf(ds) { return [...new Set(ds.trees.map(t => t.status ?? ''))].sort(); }

/* ---------------- diameter classes: half-open [lo, hi), so they can never overlap ---------------- */
/** breaks: strictly increasing boundaries b0 < b1 < … < bk (cm). openTop adds [bk, ∞). */
export function classesFromBreaks(breaks, openTop = false) {
  const b = breaks.map(Number);
  if (b.length < (openTop ? 1 : 2)) return { problem: 'cls.few' };
  if (b.some(x => !Number.isFinite(x) || x < 0)) return { problem: 'cls.bad' };
  for (let i = 1; i < b.length; i++) if (!(b[i] > b[i - 1])) return { problem: 'cls.order', at: i };
  const classes = [];
  for (let i = 0; i + 1 < b.length; i++) classes.push({ lo: b[i], hi: b[i + 1] });
  if (openTop) classes.push({ lo: b[b.length - 1], hi: Infinity });
  return { classes };
}
/** Equal-width classes from start up to end (end rounded up to a whole class). */
export function breaksFromWidth(start, width, end) {
  if (![start, width, end].every(Number.isFinite) || width <= 0 || start < 0 || end <= start) return null;
  const k = Math.ceil(r9((end - start) / width));
  if (k > 500) return null;
  return Array.from({ length: k + 1 }, (_, i) => r9(start + i * width));
}
export function classIndex(classes, d) {
  if (d < classes[0].lo) return -1;
  for (let i = 0; i < classes.length; i++) if (d >= classes[i].lo && d < classes[i].hi) return i;
  return classes.length;                              // at or above the last upper bound
}

/* ---------------- plot × period units ---------------- */
/**
 * opts.status: array of status values to include ('' = no status) or null for all.
 * opts.emptyCombos: what a plot–period combination without any tree record means when periods exist:
 *   'empty' (measured, no trees) | 'unmeasured' (not measured, left out) | null (undecided → 'unknown', left out).
 * Without periods every plot is one unit, and a plot without records is a valid empty plot.
 */
export function buildUnits(ds, opts = {}) {
  const periods = periodsOf(ds), noPeriod = periods.length === 1 && periods[0] == null;
  const keep = opts.status ? new Set(opts.status) : null;
  const byKey = new Map();
  for (const t of ds.trees) {
    const k = t.plot_id + '\u0000' + (t.period ?? '\u0001');
    if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(t);
  }
  const units = [];
  for (const pl of ds.plots) for (const per of periods) {
    const recs = byKey.get(pl.plot_id + '\u0000' + (per ?? '\u0001')) || [];
    let state = 'measured';
    if (!recs.length) state = noPeriod ? 'empty' : opts.emptyCombos === 'empty' ? 'empty' : opts.emptyCombos === 'unmeasured' ? 'unmeasured' : 'unknown';
    const trees = keep ? recs.filter(t => keep.has(t.status ?? '')) : recs;
    units.push({ plot_id: pl.plot_id, period: per, area: pl.plot_area, stratum: pl.stratum ?? null, state, nRecords: recs.length, trees });
  }
  return { units, periods, noPeriod };
}
export const isValidUnit = u => u.state === 'measured' || u.state === 'empty';

/* ---------------- per-unit metrics ---------------- */
function stats(v) {
  const n = v.length;
  if (!n) return { n: 0, mean: null, sd: null, min: null, max: null };
  let s = 0, mn = Infinity, mx = -Infinity;
  for (const x of v) { s += x; if (x < mn) mn = x; if (x > mx) mx = x; }
  const mean = s / n;
  let ss = 0; for (const x of v) ss += (x - mean) ** 2;
  return { n, mean, sd: n > 1 ? Math.sqrt(ss / (n - 1)) : null, min: mn, max: mx };
}
export function unitMetrics(u, classes) {
  const ef = 10000 / u.area, d = u.trees.map(t => t.dbh), n = d.length;
  let G = 0, d2 = 0;
  for (const x of d) { G += BA(x); d2 += x * x; }
  const ds = stats(d);
  const out = {
    plot_id: u.plot_id, period: u.period, state: u.state, area_m2: u.area, ef, stratum: u.stratum,
    n, Nha: n * ef, G_m2: G, Gha: G * ef,
    d_mean: ds.mean, dq: n ? Math.sqrt(d2 / n) : null, d_min: ds.min, d_max: ds.max, d_sd: ds.sd,
    n_trees: new Set(u.trees.map(t => t.tree_id)).size,
  };
  if (classes) {
    const c = classes.map(k => ({ lo: k.lo, hi: k.hi, n: 0, g: 0 }));
    let below = 0, above = 0;
    for (const x of d) { const i = classIndex(classes, x); if (i < 0) below++; else if (i >= classes.length) above++; else { c[i].n++; c[i].g += BA(x); } }
    out.classes = c.map(k => ({ ...k, Nha: k.n * ef, Gha: k.g * ef }));
    out.below = below; out.above = above;
  }
  const sp = new Map();
  for (const t of u.trees) { const s = sp.get(t.species) || { species: t.species, n: 0, g: 0 }; s.n++; s.g += BA(t.dbh); sp.set(t.species, s); }
  out.species = [...sp.values()].map(s => ({ ...s, Nha: s.n * ef, Gha: s.g * ef, shareN: n ? s.n / n : null, shareG: G > 0 ? s.g / G : null }))
    .sort((a, b) => b.g - a.g || (a.species < b.species ? -1 : 1));
  out.shareDen = { n, G_m2: G };                       // denominators of the shares
  const meas = [], est = [];
  for (const t of u.trees) if (t.height != null) (t.height_source === 'estimated' ? est : meas).push(t.height);
  out.h_measured = stats(meas); out.h_estimated = stats(est); out.h_missing = n - meas.length - est.length;
  return out;
}

/* ---------------- between-plot descriptive summary (each plot = one observation) ---------------- */
function describe(v) {
  const s = stats(v); if (!s.n) return s;
  const a = v.slice().sort((x, y) => x - y), m = a.length;
  return { ...s, median: m % 2 ? a[(m - 1) / 2] : (a[m / 2 - 1] + a[m / 2]) / 2 };
}
export function betweenPlots(metrics) {
  const valid = metrics.filter(m => m.state === 'measured' || m.state === 'empty'), nonEmpty = valid.filter(m => m.n > 0);
  return { m: valid.length, mEmpty: valid.length - nonEmpty.length,
    Nha: describe(valid.map(m => m.Nha)), Gha: describe(valid.map(m => m.Gha)),
    d_mean: describe(nonEmpty.map(m => m.d_mean)), dq: describe(nonEmpty.map(m => m.dq)), area_m2: describe(valid.map(m => m.area_m2)) };
}

/* ---------------- design-based estimate for the whole forest (per period) ---------------- */
function meanSE(v) {
  const m = v.length, mean = v.reduce((a, b) => a + b, 0) / m;
  const s2 = m > 1 ? v.reduce((a, b) => a + (b - mean) ** 2, 0) / (m - 1) : null;
  return { m, mean, s: s2 == null ? null : Math.sqrt(s2), se: s2 == null ? null : Math.sqrt(s2 / m) };
}
/**
 * design: { type:'srs', forestArea_ha?:number }                         simple random (systematic treated as SRS)
 *       | { type:'strat', strataArea_ha:{ stratum: ha } }                stratified random
 * Unit of estimation = the plot. y_i = per-hectare value of plot i (N/ha, G/ha, and per species).
 */
export function forestEstimate(metrics, design) {
  const problems = [];
  if (metrics.some(m => m.state === 'unknown')) problems.push({ code: 'est.unknown' });
  const valid = metrics.filter(m => m.state === 'measured' || m.state === 'empty');
  const species = [...new Set(valid.flatMap(m => m.species.map(s => s.species)))].sort();
  const vars = [['Nha', m => m.Nha], ['Gha', m => m.Gha],
    ...species.flatMap(sp => [[`Nha:${sp}`, m => (m.species.find(s => s.species === sp) || { Nha: 0 }).Nha], [`Gha:${sp}`, m => (m.species.find(s => s.species === sp) || { Gha: 0 }).Gha]])];
  let est = null;
  if (design.type === 'srs') {
    if (valid.length < 2) problems.push({ code: 'est.few', m: valid.length });
    if (!problems.length) {
      est = {};
      for (const [k, f] of vars) { const r = meanSE(valid.map(f)); est[k] = { ...r, df: r.m - 1, rse: r.mean > 0 && r.se != null ? r.se / r.mean : null }; }
    }
  } else if (design.type === 'strat') {
    const areas = design.strataArea_ha || {};
    if (valid.some(m => m.stratum == null || m.stratum === '')) problems.push({ code: 'est.nostratum' });
    const strata = [...new Set(valid.map(m => m.stratum).filter(s => s != null && s !== ''))].sort();
    for (const h of strata) {
      if (!(Number.isFinite(areas[h]) && areas[h] > 0)) problems.push({ code: 'est.noarea', stratum: h });
      const mh = valid.filter(m => m.stratum === h).length;
      if (mh < 2) problems.push({ code: 'est.stratfew', stratum: h, m: mh });
    }
    if (!strata.length) problems.push({ code: 'est.nostrata' });
    if (!problems.length) {
      const A = strata.reduce((a, h) => a + areas[h], 0);
      est = {};
      for (const [k, f] of vars) {
        let mean = 0, v = 0; const per = {};
        for (const h of strata) {
          const W = areas[h] / A, r = meanSE(valid.filter(m => m.stratum === h).map(f));
          mean += W * r.mean; v += W * W * r.s * r.s / r.m; per[h] = { ...r, W, area_ha: areas[h] };
        }
        est[k] = { m: valid.length, mean, se: Math.sqrt(v), rse: mean > 0 ? Math.sqrt(v) / mean : null, strata: per };
      }
      est._area = A;
    }
  }
  if (est) {
    const A = design.type === 'srs' ? design.forestArea_ha : est._area;
    if (Number.isFinite(A) && A > 0) for (const k of Object.keys(est)) if (k[0] !== '_') { est[k].total = est[k].mean * A; est[k].se_total = est[k].se == null ? null : est[k].se * A; }
    delete est._area;
  }
  return { problems, estimate: est, species, m: valid.length };
}

/* ---------------- one call for the UI and the tests ---------------- */
export function computeAll(ds, opts, classes, design) {
  const { units, periods, noPeriod } = buildUnits(ds, opts);
  const metrics = units.map(u => unitMetrics(u, classes));
  const byPeriod = periods.map(p => {
    const ms = metrics.filter(m => m.period === p);
    return { period: p, between: betweenPlots(ms), forest: design && design.type !== 'none' ? forestEstimate(ms, design) : null,
      unknown: ms.filter(m => m.state === 'unknown').length, unmeasured: ms.filter(m => m.state === 'unmeasured').length };
  });
  return { metrics, periods, noPeriod, byPeriod };
}
