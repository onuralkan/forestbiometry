// Stand Structure: tree-level competition indices (SS-07/a1; TOOLS_SPEC SS03). No DOM. METHODS §16 (SS-07).
// Distance-independent: BAL and relative size, from structureUnit (calc.js, SS01) unchanged.
// Distance-dependent: Hegyi CI_i = Σ_j (d_j / d_i) / dist_ij over the competitors j of subject tree i, either all trees
// within a radius R (m, the user's choice, no default) or the k nearest trees (default k = 4, as in SS02).
// The source (Hegyi 1974) is NOT read yet: implemented under a provisional definition exception (user decision,
// 12 Nov 2026), to be checked when the source is uploaded.
// Edge handling as in spatial.js (SS02): 'none' (every tree gets an index; trees whose competitor search reaches beyond
// the plot are flagged), 'buffer' (trees closer than b m to the boundary get no index but are competitors of others),
// 'toroidal' (rectangles only; distances wrap around). Two trees at the same position (dist = 0) are a problem with both
// rows: neither gets an index (no infinite value); they remain competitors of the other trees.
import { knn, boundaryDist, checkGeom } from './spatial.js';
import { structureUnit } from './calc.js';

export const COMP_DEFAULTS = { mode: 'knn', k: 4, radius: null, edge: 'none', buffer: 5 };
const fin = x => typeof x === 'number' && Number.isFinite(x);

/** Competitors of every tree within radius R: [{ idx, dist }] (j ≠ i, dist ≤ R), on a grid of cell R. */
export function withinRadius(xs, ys, R, torus = null) {
  // cells at least R wide; on a torus the side is split into whole cells (no narrow last cell across the wrap)
  const n = xs.length, x0 = torus ? torus.x0 : Math.min(...xs), y0 = torus ? torus.y0 : Math.min(...ys), W = torus ? torus.w : Math.max(...xs) - x0, H = torus ? torus.h : Math.max(...ys) - y0;
  const nx = Math.max(1, torus ? Math.floor(W / R) : Math.ceil(W / R) || 1), ny = Math.max(1, torus ? Math.floor(H / R) : Math.ceil(H / R) || 1), cx = torus ? W / nx : R, cy = torus ? H / ny : R;
  const grid = new Map(), ci = x => Math.min(nx - 1, Math.max(0, Math.floor((x - x0) / cx))), cj = y => Math.min(ny - 1, Math.max(0, Math.floor((y - y0) / cy)));
  for (let p = 0; p < n; p++) { const kq = ci(xs[p]) * 100003 + cj(ys[p]); if (!grid.has(kq)) grid.set(kq, []); grid.get(kq).push(p); }
  return xs.map((_, p) => {
    const a = ci(xs[p]), b = cj(ys[p]), idx = [], dist = [], seen = new Set();
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      let u = a + di, v = b + dj;
      if (torus) { u = ((u % nx) + nx) % nx; v = ((v % ny) + ny) % ny; } else if (u < 0 || v < 0 || u >= nx || v >= ny) continue;
      const kq = u * 100003 + v; if (seen.has(kq)) continue; seen.add(kq);
      for (const q of grid.get(kq) || []) {
        if (q === p) continue;
        let dx = Math.abs(xs[q] - xs[p]), dy = Math.abs(ys[q] - ys[p]); if (torus) { dx = Math.min(dx, torus.w - dx); dy = Math.min(dy, torus.h - dy); }
        const r = Math.hypot(dx, dy); if (r <= R) { idx.push(q); dist.push(r); }
      }
    }
    const o = idx.map((q, i) => i).sort((s, t) => dist[s] - dist[t] || idx[s] - idx[t]);
    return { idx: o.map(i => idx[i]), dist: o.map(i => dist[i]) };
  });
}

/**
 * Hegyi index of every tree. trees: [{ row, x, y, dbh }]. Returns { status: 'ok'|'nocoord'|'invalid', problems,
 * warnings, settings, trees: [{ row, hegyi, nComp, edge, ref }] } ; hegyi null where it is not computed (buffer, same
 * position, no competitor within R is 0 by definition and is given as 0).
 */
export function hegyi(trees, geom, opts = {}) {
  const s = { ...COMP_DEFAULTS, ...opts }, problems = [...checkGeom(geom)], warnings = [];
  const base = { settings: { ...s, geometry: geom }, problems, warnings };
  if (!['knn', 'radius'].includes(s.mode)) problems.push({ code: 'ci.mode', mode: s.mode });
  if (s.mode === 'knn' && !(Number.isInteger(s.k) && s.k >= 1 && s.k <= 20)) problems.push({ code: 'sp.k', k: s.k });
  if (s.mode === 'radius' && !(fin(s.radius) && s.radius > 0)) problems.push({ code: 'ci.radius', radius: s.radius });
  if (!['none', 'buffer', 'toroidal'].includes(s.edge)) problems.push({ code: 'sp.edge', edge: s.edge });
  if (s.edge === 'buffer' && !(fin(s.buffer) && s.buffer > 0)) problems.push({ code: 'sp.buffer', buffer: s.buffer });
  if (s.edge === 'toroidal' && geom && geom.shape !== 'rect') problems.push({ code: 'sp.torus.shape' });
  if (s.edge === 'toroidal' && s.mode === 'radius' && geom && geom.shape === 'rect' && !(2 * s.radius < Math.min(geom.x1 - geom.x0, geom.y1 - geom.y0))) problems.push({ code: 'ci.torus.radius' });   // a tree would meet a competitor twice
  if (problems.length) return { ...base, status: 'invalid' };
  const noXY = trees.filter(t => !(fin(t.x) && fin(t.y)));
  if (noXY.length === trees.length) return { ...base, status: 'nocoord' };
  if (noXY.length) problems.push({ code: 'xy.missing', count: noXY.length, rows: noXY.slice(0, 20).map(t => t.row ?? null) });
  const out = trees.filter(t => fin(t.x) && fin(t.y) && boundaryDist(geom, t.x, t.y) < -1e-9);
  if (out.length) problems.push({ code: 'xy.outside', count: out.length, rows: out.slice(0, 20).map(t => t.row ?? null) });
  const bad = trees.filter(t => !(t.dbh > 0));
  if (bad.length) problems.push({ code: 'd.nonpos', count: bad.length, rows: bad.slice(0, 20).map(t => t.row ?? null) });
  if (!problems.length && s.mode === 'knn' && trees.length < s.k + 1) problems.push({ code: 'sp.few', n: trees.length, k: s.k });
  if (problems.length) return { ...base, status: 'invalid' };
  const xs = trees.map(t => t.x), ys = trees.map(t => t.y), torus = s.edge === 'toroidal' ? { x0: geom.x0, y0: geom.y0, w: geom.x1 - geom.x0, h: geom.y1 - geom.y0 } : null;
  // same position: problem, no index for either tree
  const same = new Set(), at = new Map();
  trees.forEach((t, i) => { const kq = xs[i] + ',' + ys[i]; if (at.has(kq)) { const j = at.get(kq); same.add(i); same.add(j); problems.push({ code: 'ci.samepos', rows: [trees[j].row ?? null, t.row ?? null] }); } else at.set(kq, i); });
  const nb = s.mode === 'radius' ? withinRadius(xs, ys, s.radius, torus) : knn(xs, ys, s.k, torus);
  const rows = trees.map((t, i) => {
    const e = boundaryDist(geom, t.x, t.y), J = nb[i].idx, D = nb[i].dist, reach = s.mode === 'radius' ? s.radius : D[D.length - 1];
    const ref = s.edge === 'buffer' ? e >= s.buffer : true, edge = s.edge === 'none' && e < reach;
    let ci = null;
    if (ref && !same.has(i)) { ci = 0; for (let q = 0; q < J.length; q++) ci += (trees[J[q]].dbh / t.dbh) / D[q]; }
    return { row: t.row ?? null, tree_id: t.tree_id ?? null, hegyi: ci, nComp: J.length, ref, edge, why: !ref ? 'buffer' : same.has(i) ? 'samepos' : null };
  });
  if (same.size) warnings.push({ code: 'ci.samepos.n', n: same.size });
  if (s.mode === 'radius' && rows.some(r => r.ref && r.nComp === 0)) warnings.push({ code: 'ci.nocomp', n: rows.filter(r => r.ref && r.nComp === 0).length });
  return { ...base, problems: problems.filter(p => p.code !== 'ci.samepos'), samePosition: problems.filter(p => p.code === 'ci.samepos'), status: 'ok', nEdge: rows.filter(r => r.edge).length, nRef: rows.filter(r => r.ref).length, trees: rows };
}

/**
 * Competition of one plot × period unit: BAL and relative size (structureUnit, SS01) and Hegyi when the plot has a
 * geometry and the trees have coordinates. Per tree: { row, tree_id, dbh, bal, relD, relG, hegyi, edge }.
 */
export function competitionUnit(u, geom, settings = {}, compSettings = {}) {
  const st = structureUnit(u, settings);
  if (st.status !== 'ok') return { status: st.status, structure: st, spatial: null, trees: [] };
  const sp = geom ? hegyi(u.trees.map(t => ({ row: t.row, tree_id: t.tree_id, x: t.x, y: t.y, dbh: t.dbh })), geom, compSettings) : { status: 'nogeom' };
  return { status: 'ok', structure: st, spatial: sp,
    trees: st.trees.map((t, i) => ({ row: t.row, tree_id: t.tree_id, dbh: t.dbh, bal: t.bal, relD: t.relD, relG: t.relG,
      hegyi: sp.status === 'ok' ? sp.trees[i].hegyi : null, edge: sp.status === 'ok' ? sp.trees[i].edge : null, ref: sp.status === 'ok' ? sp.trees[i].ref : null })) };
}

/**
 * The user's tree table with the competition columns appended to its rows (source rows unchanged; the Plot & Stand
 * "tree data with appended columns" layout). head: column names; body: rows; perRow: Map(row number → values object);
 * cols: [[name, key]]. A name already in the table gets "_ci". Rows without values get empty cells.
 */
export function appendColumns(head, body, rowNumbers, perRow, cols) {
  const taken = new Set(head.map(h => String(h).toLocaleLowerCase('en'))), names = cols.map(([n]) => { let x = n; while (taken.has(x.toLocaleLowerCase('en'))) x += '_ci'; taken.add(x.toLocaleLowerCase('en')); return x; });
  return [[...head, ...names], ...body.map((r, i) => { const v = perRow.get(rowNumbers[i]); return [...r, ...cols.map(([, k]) => v && v[k] != null ? v[k] : null)]; })];
}
