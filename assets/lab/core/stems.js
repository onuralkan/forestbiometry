// Stem measurement table, schema stem-sections/1 (docs/TOOLS_SPEC.md §1.2, stage T01). No DOM.
// Shared by the stem section volume and the taper tools (decision K6). One row = one measurement point of one tree.
// Internal units: h m (height above GROUND), d cm, double bark thickness mm. Ids are text (Data Checker rule).
// Nothing is corrected or guessed: every problem is reported with its source row number; trees with errors keep
// their points but carry state 'error' and are not computed by the tools.
import { parseNumber, toInternal } from './num.js';
import { cellText } from './table.js';

export const SCHEMA = 'stem-sections/1';
/** Tool rules (not literature values); every one is a setting and is written into the result. */
export const DEFAULTS = { buttressH: 1.3, dbhTol: 0.10, combine: 'arith', bark: 'ob' };
const BH = 1.3;

/**
 * tbl: raw table (core/table.js). map: { tree (required), plot?, period?, h (required), d? | d1 + d2, bark?, bark_t?,
 * kind?, dbh?, height?, stump_h? } (column indexes; dbh, height, stump_h are tree-level and must agree on every row
 * of a tree). spec: { decimal, units: { h: 'm'|'cm'|'dm', d: 'cm'|'mm', bark_t: 'mm'|'cm', dbh, height }, bark: 'ob'|'ib'
 * (table default), combine: 'arith' (d = (d1 + d2)/2) | 'quadratic' (d = √((d1² + d2²)/2), equal-area), buttressH,
 * dbhTol }.
 * treeList (optional): tree records (e.g. forest-dataset/1 trees) whose dbh, height, stump_h fill what the stem table
 * lacks; attached BEFORE the checks, so height-based checks use them.
 * Returns { schema, settings, points: [...], trees: [...], problems: [{ code, severity, row, tree?, … }] }.
 */
export function readStems(tbl, map, spec = {}, treeList = null) {
  const set = { ...DEFAULTS, ...spec, units: { h: 'm', d: 'cm', bark_t: 'mm', dbh: 'cm', height: 'm', ...(spec.units || {}) } };
  const problems = [], add = (code, severity, row, extra = {}) => { if (problems.length < 2000) problems.push({ code, severity, row, ...extra }); };
  if (map.tree == null || map.h == null || (map.d == null && (map.d1 == null || map.d2 == null))) return { schema: SCHEMA, settings: set, points: [], trees: [], problems: [{ code: 'map.need', severity: 'error', row: null }] };
  const txt = c => c == null ? '' : cellText(c).trim();
  const num = c => c == null ? { status: 'empty' } : c.t === 'n' ? parseNumber(c.v, set.decimal) : parseNumber(cellText(c), set.decimal);
  const points = [], trees = new Map();
  tbl.rows.forEach((r, i) => {
    const row = tbl.rowNumbers[i];
    if (r.every(c => txt(c) === '')) return;
    const tree_id = txt(r[map.tree]);
    if (!tree_id) { add('req.tree', 'error', row); return; }
    const plot_id = map.plot != null ? txt(r[map.plot]) || null : null, period = map.period != null ? txt(r[map.period]) || null : null;
    const key = keyOf(plot_id, tree_id, period), tag = { tree: tree_id, plot: plot_id, period };
    if (!trees.has(key)) trees.set(key, { key, plot_id, tree_id, period, rows: [], points: [], dbh: null, height: null, stump_h: null, state: 'ok' });
    const T = trees.get(key); T.rows.push(row);
    const bad = (code, extra) => { add(code, 'error', row, { ...tag, ...extra }); T.state = 'error'; };   // a point lost to an error makes the whole tree unusable
    const val = (col, kind, unit, code, { pos = false, nonneg = false } = {}) => {
      if (col == null) return { v: null, ok: true };
      const x = num(r[col]);
      if (x.status === 'empty') return { v: null, ok: true, empty: true };
      if (x.status !== 'ok') { bad('num.bad', { field: code, text: txt(r[col]) }); return { ok: false }; }
      const v = kind ? toInternal(kind, unit, x.value) : x.value;
      if ((pos && !(v > 0)) || (nonneg && v < 0)) { bad(code === 'h' ? 'h.neg' : code === 'bark_t' ? 'bark.neg' : code === 'd' ? 'd.nonpos' : 'tree.nonpos', { field: code, value: v }); return { ok: false }; }
      return { v, ok: true };
    };
    // tree-level attributes: must agree on every row of the tree
    for (const [f, kind, unit] of [['dbh', 'dbh', set.units.dbh], ['height', 'height', set.units.height], ['stump_h', 'height', set.units.h]]) {
      const x = val(map[f], kind, unit, f, f === 'stump_h' ? { nonneg: true } : { pos: true });
      if (!x.ok || x.v == null) continue;
      if (T[f] == null) T[f] = x.v; else if (Math.abs(T[f] - x.v) > 1e-9 * Math.max(1, Math.abs(x.v))) bad('tree.conflict', { field: f, a: T[f], b: x.v });
    }
    const h = val(map.h, 'height', set.units.h, 'h', { nonneg: true });
    if (!h.ok) return;
    if (h.v == null) { bad('req.h'); return; }
    let d;
    if (map.d != null) { const x = val(map.d, 'dbh', set.units.d, 'd', { pos: true }); if (!x.ok) return; if (x.v == null) { bad('req.d'); return; } d = x.v; }
    else {
      const a = val(map.d1, 'dbh', set.units.d, 'd', { pos: true }), b = val(map.d2, 'dbh', set.units.d, 'd', { pos: true });
      if (!a.ok || !b.ok) return;
      if (a.v == null || b.v == null) { bad('req.d12'); return; }
      d = set.combine === 'quadratic' ? Math.sqrt((a.v * a.v + b.v * b.v) / 2) : (a.v + b.v) / 2;
    }
    let bark = set.bark;
    if (map.bark != null) { const b = txt(r[map.bark]).toLowerCase(); if (b) { if (!['ob', 'ib'].includes(b)) { bad('bark.bad', { text: b }); return; } bark = b; } }
    const bt = val(map.bark_t, 'bark', set.units.bark_t, 'bark_t', { nonneg: true });
    if (!bt.ok) return;
    let d_ib = null;
    if (bark === 'ib') d_ib = d;
    else if (bt.v != null) { d_ib = d - bt.v / 10; if (!(d_ib > 0)) { bad('bark.thick', { d, bark_t: bt.v }); return; } }
    const kind = map.kind != null ? txt(r[map.kind]) || null : null;
    const p = { row, plot_id, tree_id, period, h: h.v, d: bark === 'ob' ? d : null, d_ib, bark, bark_t: bt.v, kind };
    points.push(p); T.points.push(p);
  });
  const out = [...trees.values()];
  if (treeList) for (const q of attach(out, treeList)) add(q.code, q.severity, q.row, q.extra);
  for (const T of out) checkTree(T, set, add);
  return { schema: SCHEMA, settings: set, points, trees: out, problems };
}
export const keyOf = (plot, tree, period) => `${plot ?? ''}\u0001${tree}\u0001${period ?? ''}`;
/** Diameter used for profile checks: over bark where known, otherwise under bark. */
const dOf = p => p.d ?? p.d_ib;

function checkTree(T, set, add) {
  const tag = { tree: T.tree_id, plot: T.plot_id, period: T.period }, err = () => { T.state = 'error'; };
  T.points.sort((a, b) => a.h - b.h || a.row - b.row);
  const pts = T.points;
  for (let i = 1; i < pts.length; i++) if (pts[i].h === pts[i - 1].h) { add('h.dup', 'error', pts[i].row, { ...tag, h: pts[i].h, first: pts[i - 1].row }); err(); }
  if (T.height != null) for (const p of pts) if (p.h > T.height) { add('h.abovetop', 'error', p.row, { ...tag, h: p.h, height: T.height }); err(); }
  if (T.height != null && T.stump_h != null && !(T.stump_h < T.height)) { add('stump.abovetop', 'error', T.rows[0], { ...tag, stump_h: T.stump_h, height: T.height }); err(); }
  // mixed bark status inside one tree: the profile is not comparable point to point
  const both = pts.filter(p => p.d != null).length, ibOnly = pts.filter(p => p.d == null).length;
  if (both && ibOnly) add('bark.mixed', 'warning', T.rows[0], tag);
  if (pts.length < 2) { add('tree.single', 'error', T.rows[0], { ...tag, n: pts.length }); err(); }
  // diameter increasing with height outside the buttress zone (both points at or above buttressH)
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    if (a.h >= set.buttressH && b.h > a.h && dOf(b) > dOf(a)) add('d.increase', 'warning', b.row, { ...tag, h: b.h, d: dOf(b), below: dOf(a), hBelow: a.h });
  }
  // the measured diameter at 1.3 m against the tree's dbh (same bark status: dbh is over bark)
  const at = pts.find(p => Math.abs(p.h - BH) < 1e-9 && p.d != null);
  if (at && T.dbh != null && Math.abs(at.d - T.dbh) > set.dbhTol * T.dbh) add('dbh.mismatch', 'warning', at.row, { ...tag, d: at.d, dbh: T.dbh, tol: set.dbhTol });
}

/** Tree-level attributes from a tree list where the stem table had none; missing records and conflicts are reported. */
function attach(stemTrees, treeList) {
  const byKey = new Map(treeList.map(t => [keyOf(t.plot_id ?? null, t.tree_id, t.period ?? null), t])), out = [];
  for (const T of stemTrees) {
    const tag = { tree: T.tree_id, plot: T.plot_id, period: T.period }, t = byKey.get(T.key);
    if (!t) { out.push({ code: 'tree.nomatch', severity: 'warning', row: T.rows[0], extra: tag }); continue; }
    for (const f of ['dbh', 'height', 'stump_h']) {
      if (t[f] == null) continue;
      if (T[f] == null) T[f] = t[f];
      else if (Math.abs(T[f] - t[f]) > 1e-9 * Math.max(1, Math.abs(t[f]))) { out.push({ code: 'tree.conflict', severity: 'error', row: T.rows[0], extra: { ...tag, field: f, a: T[f], b: t[f] } }); T.state = 'error'; }
    }
  }
  return out;
}
