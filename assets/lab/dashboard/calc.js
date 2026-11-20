// Data visualization (DI-04): page logic without DOM. No new science: per-plot N/ha and G/ha come from the
// Plot & Stand engine (stand/calc.js), fitted densities from the Diameter Distribution engine (dist/, the observed
// model of a result: conditional inside thresholds), height curves from the Height–Diameter engine (hd/calc.js);
// all three are tested against independent references in their own tests. Here: filters, counts, histogram bins,
// and the reading of run records (run-record/1, core/record.js). Tests: tests/dashboard/test_di04.mjs.
import { computeAll, isValidUnit } from '../stand/calc.js';
import '../dist/index.js';                                  // registers the distribution families and methods
import { family } from '../dist/registry.js';
import { observedModel } from '../dist/bootstrap.js';
import { POOL } from '../dist/data.js';
import { predict, modelById } from '../hd/calc.js';
import { verifyRecord } from '../core/record.js';

export const TOOL = { id: 'pano', version: '1.0.0-beta.1' };
export const ALL = '*';
const BA = d => Math.PI * d * d / 40000;                  // m², d in cm (same as stand/calc.js)
const natural = (a, b) => String(a).localeCompare(String(b), 'tr', { numeric: true });
const perKey = v => v == null ? '' : String(v);

/** Filter values present in a package: periods ('' = no period), strata, species ('' = none), plots. */
export function options(ds) {
  return {
    periods: [...new Set(ds.trees.map(t => perKey(t.period)))].sort(natural),
    strata: [...new Set(ds.plots.map(p => p.stratum).filter(s => s != null && s !== '').map(String))].sort(natural),
    species: [...new Set(ds.trees.map(t => t.species == null ? '' : String(t.species)))].sort(natural),
    plots: ds.plots.map(p => p.plot_id).sort(natural),
  };
}
/** f = { period, stratum, species, plot }, each ALL or a value. */
export const blankFilter = () => ({ period: ALL, stratum: ALL, species: ALL, plot: ALL });
function plotOk(ds, f) {
  const st = new Map(ds.plots.map(p => [p.plot_id, p.stratum == null ? '' : String(p.stratum)]));
  return id => (f.plot === ALL || id === f.plot) && (f.stratum === ALL || st.get(id) === f.stratum);
}
/** Tree records passing the filter. */
export function filterTrees(ds, f) {
  const okPlot = plotOk(ds, f);
  return ds.trees.filter(t => okPlot(t.plot_id) && (f.period === ALL || perKey(t.period) === f.period) && (f.species === ALL || (t.species == null ? '' : String(t.species)) === f.species));
}

/** Class width giving about 12 classes over a range: 1, 2 or 5 × 10^k. */
export function niceWidth(range) {
  if (!(range > 0)) return 1;
  const raw = range / 12, p = 10 ** Math.floor(Math.log10(raw)), m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}
/**
 * Histogram of values in classes [lo, hi) of width w starting at a multiple of w (the largest value falls in the last
 * class). → [{ lo, hi, n, dens }] with dens = n / (N·w), so that a probability density can be drawn over it.
 */
export function histogram(values, w) {
  const v = values.filter(Number.isFinite); if (!v.length || !(w > 0)) return [];
  const lo0 = Math.floor(Math.min(...v) / w) * w, k = Math.max(1, Math.floor((Math.max(...v) - lo0) / w + 1e-9) + 1);
  const bins = Array.from({ length: k }, (_, i) => ({ lo: +(lo0 + i * w).toPrecision(12), hi: +(lo0 + (i + 1) * w).toPrecision(12), n: 0, dens: 0 }));
  for (const x of v) bins[Math.min(k - 1, Math.floor((x - lo0) / w + 1e-9))].n++;
  for (const b of bins) b.dens = b.n / (v.length * w);
  return bins;
}
/** Species of the filtered records: count and basal area (Σ π/4·(d/100)²), shares; by basal area, then name. */
export function speciesTable(trees) {
  const m = new Map(); let N = 0, G = 0;
  for (const t of trees) { const s = t.species == null ? '' : String(t.species), e = m.get(s) || { species: s, n: 0, g: 0 }; e.n++; e.g += BA(t.dbh); m.set(s, e); N++; G += BA(t.dbh); }
  return [...m.values()].map(e => ({ ...e, shareN: N ? e.n / N : null, shareG: G > 0 ? e.g / G : null })).sort((a, b) => b.g - a.g || natural(a.species, b.species));
}
/**
 * Per plot × period: N/ha and G/ha from the Plot & Stand engine. Plot–period combinations without records are
 * 'unmeasured' (left out) or 'empty' (N = G = 0), as the user chooses (emptyCombos). With a species filter the
 * values are that species' share of the plot (0 where it is absent). → { rows: [{ plot, period, state, n, Nha, Gha }], mean: { Nha, Gha, n } }
 */
export function plotTable(ds, f, emptyCombos = 'unmeasured') {
  const okPlot = plotOk(ds, f);
  const { metrics } = computeAll(ds, { status: null, emptyCombos }, null, null);
  const rows = metrics.filter(m => isValidUnit(m) && okPlot(m.plot_id) && (f.period === ALL || perKey(m.period) === f.period)).map(m => {
    if (f.species === ALL) return { plot: m.plot_id, period: m.period, state: m.state, n: m.n, Nha: m.Nha, Gha: m.Gha };
    const s = (m.species || []).find(x => (x.species == null ? '' : String(x.species)) === f.species);
    return { plot: m.plot_id, period: m.period, state: m.state, n: s ? s.n : 0, Nha: s ? s.Nha : 0, Gha: s ? s.Gha : 0 };
  }).sort((a, b) => natural(a.plot, b.plot) || natural(perKey(a.period), perKey(b.period)));
  const k = rows.length;
  return { rows, mean: { n: k, Nha: k ? rows.reduce((a, r) => a + r.Nha, 0) / k : null, Gha: k ? rows.reduce((a, r) => a + r.Gha, 0) / k : null } };
}
/** Height–diameter pairs: measured and estimated heights apart. */
export function hdPoints(trees) {
  const m = [], e = [];
  for (const t of trees) if (Number.isFinite(t.height) && Number.isFinite(t.dbh)) (t.height_source === 'estimated' ? e : m).push([t.dbh, t.height]);
  return { measured: m, estimated: e };
}
/** Tree positions of the filtered records, if coordinates exist: [{ x, y, dbh, species }]. */
export const positions = trees => trees.filter(t => Number.isFinite(t.x) && Number.isFinite(t.y)).map(t => ({ x: t.x, y: t.y, dbh: t.dbh, species: t.species == null ? '' : String(t.species) }));

/* ---------------- run records ---------------- */
const KINDS = { 'cap-dagilimi': 'dist', 'boy-cap': 'hd' };
/**
 * Reads a parsed JSON file as a run record for the dashboard. pkgSha: fingerprint of the package on show.
 * → { ok, kind: 'dist'|'hd'|'other', tool, created, seal, fromPackage: true (a dataset input with this fingerprint) |
 *     false (a dataset input with another one) | null (made from a file: cannot tell), problems }
 */
export async function readRecord(obj, pkgSha) {
  const v = await verifyRecord(obj);
  if (v.kind !== 'record' && v.kind !== 'legacy') return { ok: false, kind: null, problems: v.problems };
  const id = v.tool && v.tool.id, kind = KINDS[id] || 'other';
  const ds = (obj.inputs || []).filter(x => x && x.kind === 'dataset');
  const fromPackage = !ds.length ? null : ds.some(x => String(x.sha256).toLowerCase() === String(pkgSha || '').toLowerCase());
  const usable = kind === 'dist' ? Array.isArray(obj.results) : kind === 'hd' ? Array.isArray(obj.fits) : false;
  return { ok: true, kind: usable ? kind : 'other', tool: v.tool, created: v.created, seal: v.seal, legacy: v.kind === 'legacy', fromPackage, problems: v.problems };
}
const unitPlot = p => p == null || p === POOL ? ALL : String(p);
/**
 * Fitted densities of a Diameter Distribution record for the unit on show (plot ALL = the pooled results), on the
 * grid xs (cm). Only results with status ok and a registered family. → [{ name, family, method, estimator, pts }]
 */
export function distCurves(rec, f, xs) {
  const out = [];
  for (const r of rec.results || []) {
    if (!r || r.status !== 'ok' || !r.params || !r.data) continue;
    if (unitPlot(r.data.plot) !== f.plot) continue;
    if (f.period !== ALL && perKey(r.data.period) !== f.period) continue;
    if (f.period === ALL && r.data.period != null && r.data.period !== POOL) continue;
    let model; try { family(r.family); model = observedModel(r); } catch (e) { continue; }
    out.push({ name: `${r.family} · ${r.method}`, family: r.family, method: r.method, estimator: r.estimator, truncated: !!(r.truncation && r.truncation.logMass != null), pts: xs.map(x => [x, model.pdf(x, r.params)]) });
  }
  return out;
}
/** Height curves of a Height–Diameter record: h = bh + f(θ, d) for each fitted model. → [{ name, id, chosen, pts }] */
export function hdCurves(rec, xs) {
  const bh = rec.settings && Number.isFinite(rec.settings.breastHeight) ? rec.settings.breastHeight : 1.3, chosen = rec.settings && rec.settings.model;
  const out = [];
  for (const fi of rec.fits || []) {
    if (!fi || fi.status !== 'ok' || !Array.isArray(fi.theta)) continue;
    if (!modelById(fi.id)) continue;
    out.push({ name: fi.id, id: fi.id, chosen: fi.id === chosen, pts: xs.map(d => [d, predict({ id: fi.id, theta: fi.theta }, d, bh)]) });
  }
  return out;
}
/** Evenly spaced grid. */
export const grid = (a, b, n = 160) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
