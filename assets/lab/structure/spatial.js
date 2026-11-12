// Stand Structure & Competition, stage SS02: spatial structure (pure logic, no DOM). Specification TOOLS_SPEC §4.1;
// formulas and sources METHODS §16 (SS02). Plot geometry comes from the user: a circle (centre, radius) or an
// axis-parallel rectangle (two opposite corners), in the same metre coordinates as the trees' x, y.
// Neighbour search: uniform cell grid (exact k nearest neighbours, also on a torus), O(n·k) for usual patterns.
import { buildUnits } from '../stand/calc.js';

export const SPATIAL_DEFAULTS = {
  k: 4,                 // neighbours of the structural unit for W, M, U, T (Li et al. 2024: four; Pommerening 2002: n)
  alpha0: 72,           // standard angle of W in degrees (Li et al. 2024: 72° for four neighbours)
  edge: 'none',         // 'none' | 'buffer' (trees nearer than `buffer` m to the boundary are neighbours only) | 'torus' (rectangles)
  buffer: 5,            // buffer width (m) for edge = 'buffer'
};
export const ANGLE_TOL = 1e-9;   // degrees: α < α0 − ANGLE_TOL counts as smaller (regular grids give α = α0 up to rounding)

/* ---------------- plot geometry ---------------- */
/** Normalised geometry or { problem }. Rectangle corners may be given in any order. */
export function geometry(g) {
  if (!g || typeof g !== 'object') return { problem: 'geom.none' };
  const f = v => typeof v === 'number' && Number.isFinite(v);
  if (g.shape === 'circle') {
    if (![g.cx, g.cy, g.r].every(f)) return { problem: 'geom.bad' };
    if (!(g.r > 0)) return { problem: 'geom.size' };
    return { shape: 'circle', cx: g.cx, cy: g.cy, r: g.r };
  }
  if (g.shape === 'rect') {
    if (![g.x0, g.y0, g.x1, g.y1].every(f)) return { problem: 'geom.bad' };
    const x0 = Math.min(g.x0, g.x1), x1 = Math.max(g.x0, g.x1), y0 = Math.min(g.y0, g.y1), y1 = Math.max(g.y0, g.y1);
    if (!(x1 > x0 && y1 > y0)) return { problem: 'geom.size' };
    return { shape: 'rect', x0, y0, x1, y1 };
  }
  return { problem: 'geom.shape' };
}
export const areaOf = g => g.shape === 'circle' ? Math.PI * g.r * g.r : (g.x1 - g.x0) * (g.y1 - g.y0);
export const perimeterOf = g => g.shape === 'circle' ? 2 * Math.PI * g.r : 2 * ((g.x1 - g.x0) + (g.y1 - g.y0));
/** Inside or on the boundary. */
export const inside = (g, x, y) => g.shape === 'circle' ? Math.hypot(x - g.cx, y - g.cy) <= g.r : x >= g.x0 && x <= g.x1 && y >= g.y0 && y <= g.y1;
/** Distance from an inside point to the boundary. */
export const edgeDist = (g, x, y) => g.shape === 'circle' ? g.r - Math.hypot(x - g.cx, y - g.cy) : Math.min(x - g.x0, g.x1 - x, y - g.y0, g.y1 - y);

/* ---------------- k nearest neighbours ---------------- */
/**
 * For every point the k nearest other points, sorted by distance (ties by index), as {j, d, dx, dy} with dx = x_j − x_i.
 * torus = {w, h}: periodic distances (minimum image) in a w × h box; points at the same position are neighbours at d = 0.
 */
export function knn(xs, ys, k, torus = null) {
  const n = xs.length, out = new Array(n);
  if (!n || k < 1) return Array.from({ length: n }, () => []);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) { if (xs[i] < minX) minX = xs[i]; if (xs[i] > maxX) maxX = xs[i]; if (ys[i] < minY) minY = ys[i]; if (ys[i] > maxY) maxY = ys[i]; }
  let W = maxX - minX, H = maxY - minY;
  if (torus) { W = torus.w; H = torus.h; minX = torus.x0 ?? minX; minY = torus.y0 ?? minY; }
  const c = Math.max(Math.sqrt((Math.max(W, 1e-9) * Math.max(H, 1e-9)) / n) * 1.5, 1e-9);
  const nx = Math.max(1, Math.min(Math.ceil(W / c) || 1, 4096)), ny = Math.max(1, Math.min(Math.ceil(H / c) || 1, 4096));
  const cw = W > 0 ? W / nx : 1, ch = H > 0 ? H / ny : 1;
  const cellX = x => Math.min(nx - 1, Math.max(0, Math.floor((x - minX) / cw))), cellY = y => Math.min(ny - 1, Math.max(0, Math.floor((y - minY) / ch)));
  const head = new Int32Array(nx * ny).fill(-1), next = new Int32Array(n);
  for (let i = 0; i < n; i++) { const id = cellY(ys[i]) * nx + cellX(xs[i]); next[i] = head[id]; head[id] = i; }
  const step = Math.min(cw, ch), kk = Math.min(k, n - 1);
  for (let i = 0; i < n; i++) {
    const best = [], cx = cellX(xs[i]), cy = cellY(ys[i]), seen = torus ? new Set() : null;
    const visit = (gx, gy) => {
      if (torus) { gx = ((gx % nx) + nx) % nx; gy = ((gy % ny) + ny) % ny; const id = gy * nx + gx; if (seen.has(id)) return; seen.add(id); }
      else if (gx < 0 || gy < 0 || gx >= nx || gy >= ny) return;
      for (let j = head[gy * nx + gx]; j !== -1; j = next[j]) {
        if (j === i) continue;
        let dx = xs[j] - xs[i], dy = ys[j] - ys[i];
        if (torus) { dx -= W * Math.round(dx / W); dy -= H * Math.round(dy / H); }
        const d = Math.hypot(dx, dy);
        if (best.length === kk && (d > best[kk - 1].d || (d === best[kk - 1].d && j > best[kk - 1].j))) continue;
        let p = best.length; while (p > 0 && (best[p - 1].d > d || (best[p - 1].d === d && best[p - 1].j > j))) p--;
        best.splice(p, 0, { j, d, dx, dy }); if (best.length > kk) best.pop();
      }
    };
    const maxR = Math.max(nx, ny);
    for (let r = 0; r <= maxR; r++) {
      if (r === 0) visit(cx, cy);
      else { for (let t = -r; t <= r; t++) { visit(cx + t, cy - r); visit(cx + t, cy + r); } for (let t = -r + 1; t <= r - 1; t++) { visit(cx - r, cy + t); visit(cx + r, cy + t); } }
      // every point in ring r + 1 or beyond is at least r·step away
      if (best.length === kk && best[kk - 1].d <= r * step) break;
      if (torus && seen.size === nx * ny) break;
    }
    out[i] = best;
  }
  return out;
}

/* ---------------- single-tree neighbourhood measures ---------------- */
/** Uniform angle index: neighbours ordered by direction; α of each adjacent pair = smaller of its two angles; share α < α0. */
export function uniformAngle(nb, alpha0) {
  if (nb.length < 2 || nb.some(v => v.d === 0)) return null;
  const az = nb.map(v => (Math.atan2(v.dy, v.dx) * 180 / Math.PI + 360) % 360).sort((a, b) => a - b), k = az.length;
  let z = 0;
  for (let j = 0; j < k; j++) { const th = j + 1 < k ? az[j + 1] - az[j] : az[0] + 360 - az[j]; const a = Math.min(th, 360 - th); if (a < alpha0 - ANGLE_TOL) z++; }
  return z / k;
}
export const mingling = (sp, nb, i) => sp[i] == null || nb.some(v => sp[v.j] == null) ? null : nb.filter(v => sp[v.j] !== sp[i]).length / nb.length;
export const dominance = (d, nb, i) => nb.filter(v => d[i] < d[v.j]).length / nb.length;
export const differentiation = (d, nb, i) => nb.map(v => 1 - Math.min(d[i], d[v.j]) / Math.max(d[i], d[v.j]));

/** Clark–Evans R with E(r) = 1/(2√λ) (Pommerening 2002) and Donnelly's rectangle correction as given by Dixon (2002). */
export function clarkEvans(rObs, n, A, P = null) {
  if (!(n >= 2) || !(A > 0) || !Number.isFinite(rObs)) return null;
  const E = 0.5 * Math.sqrt(A / n), out = { R: rObs / E, E, rObs, lambda: n / A };
  if (P != null) { const Ed = E + 0.0514 * P / n + 0.041 * P / n ** 1.5; out.donnelly = { R: rObs / Ed, E: Ed }; }
  return out;
}

/* ---------------- one unit ---------------- */
/** Spatial measures of one unit; geom as for geometry(); s overrides SPATIAL_DEFAULTS. */
export function unitSpatial(u, geom, s = {}) {
  s = { ...SPATIAL_DEFAULTS, ...s };
  const base = { plot_id: u.plot_id, period: u.period, settings: s }, problems = [], warnings = [];
  const g = geometry(geom);
  if (g.problem) return { ...base, status: 'invalid', problems: [{ code: g.problem }] };
  if (!['none', 'buffer', 'torus'].includes(s.edge)) return { ...base, status: 'invalid', problems: [{ code: 'edge.bad' }] };
  if (s.edge === 'torus' && g.shape !== 'rect') return { ...base, status: 'invalid', problems: [{ code: 'edge.torusrect' }] };
  if (s.edge === 'buffer' && !(s.buffer > 0)) return { ...base, status: 'invalid', problems: [{ code: 'edge.buffer' }] };
  if (!(Number.isInteger(s.k) && s.k >= 2 && s.k <= 12)) return { ...base, status: 'invalid', problems: [{ code: 'k.bad' }] };
  if (!(s.alpha0 > 0 && s.alpha0 < 180)) return { ...base, status: 'invalid', problems: [{ code: 'alpha0.bad' }] };
  const A = areaOf(g), P = perimeterOf(g);
  if (u.area > 0 && Math.abs(A - u.area) > 0.01 * u.area) warnings.push({ code: 'geom.area', geomArea: A, plotArea: u.area });
  const trees = u.trees, has = t => Number.isFinite(t.x) && Number.isFinite(t.y);
  if (!trees.length) return { ...base, status: 'empty', geometry: g, area: A, problems, warnings };
  const noXY = trees.filter(t => !has(t));
  if (noXY.length === trees.length) return { ...base, status: 'nocoords', geometry: g, area: A, problems, warnings };
  if (noXY.length) return { ...base, status: 'invalid', geometry: g, problems: [{ code: 'xy.missing', rows: noXY.map(t => t.row ?? null) }], warnings };
  const out = trees.filter(t => !inside(g, t.x, t.y));
  if (out.length) problems.push({ code: 'xy.outside', rows: out.map(t => t.row ?? null) });   // left out of every spatial measure
  const T = trees.filter(t => inside(g, t.x, t.y)), n = T.length;
  if (n < 2) return { ...base, status: 'invalid', geometry: g, problems: [...problems, { code: 'n.few', n }], warnings };
  const xs = T.map(t => t.x), ys = T.map(t => t.y), d = T.map(t => t.dbh), sp = T.map(t => t.species ?? null);
  const torus = s.edge === 'torus' ? { w: g.x1 - g.x0, h: g.y1 - g.y0, x0: g.x0, y0: g.y0 } : null;
  const k = Math.min(s.k, n - 1), NB = knn(xs, ys, Math.max(k, 1), torus);
  if (k < s.k) problems.push({ code: 'k.few', n, k: s.k });                      // neighbourhood measures need n > k
  // equal positions: reported once per pair, W undefined for both trees
  const dup = []; NB.forEach((nb, i) => nb.forEach(v => { if (v.d === 0 && i < v.j) dup.push([T[i].row ?? null, T[v.j].row ?? null]); }));
  if (dup.length) problems.push({ code: 'xy.dup', pairs: dup });
  const ed = T.map(t => edgeDist(g, t.x, t.y));
  const core = T.map((_, i) => s.edge !== 'buffer' || ed[i] >= s.buffer);
  const nCore = core.filter(Boolean).length;
  if (s.edge === 'buffer' && !nCore) problems.push({ code: 'edge.nocore' });
  // ties at the k-th distance make the neighbour set depend on order: counted, resolved by data order
  let ties = 0;
  if (k >= 1 && n > k + 1) { const NB1 = knn(xs, ys, k + 1, torus); NB1.forEach((nb, i) => { if (core[i] && nb.length > k && nb[k].d === nb[k - 1].d) ties++; }); }
  if (ties) warnings.push({ code: 'knn.tie', n: ties });
  const hasSp = sp.some(v => v != null), full = k === s.k;
  const rows = T.map((t, i) => {
    const nb = NB[i].slice(0, k), r = { row: t.row ?? null, tree_id: t.tree_id ?? null, x: t.x, y: t.y, edgeDist: ed[i], nn: NB[i][0].d, core: core[i] };
    if (s.edge === 'none') { r.edgeNN = ed[i] < r.nn; r.edgeK = full ? ed[i] < nb[k - 1].d : null; }   // neighbourhood may reach beyond the plot
    if (!core[i] || !full) return { ...r, W: null, M: null, U: null, T: null };
    return { ...r, W: uniformAngle(nb, s.alpha0), M: hasSp ? mingling(sp, nb, i) : null, U: dominance(d, nb, i), T: differentiation(d, nb, i) };
  });
  const mean = v => { const w = v.filter(x => x != null); return w.length ? w.reduce((a, b) => a + b, 0) / w.length : null; };
  const ref = rows.filter(r => r.core);
  const ce = clarkEvans(mean(ref.map(r => r.nn)), n, A, s.edge === 'none' && g.shape === 'rect' ? P : null);
  if (ce && !ce.donnelly) ce.donnelly = null;
  const why = s.edge !== 'none' ? 'edge' : g.shape !== 'rect' ? 'shape' : null;
  return {
    ...base, status: 'ok', geometry: g, area: A, perimeter: P, n, nRef: ref.length, k, problems, warnings,
    clarkEvans: ce ? { ...ce, edge: s.edge, donnellyWhy: ce.donnelly ? null : why } : null,
    W: full ? mean(ref.map(r => r.W)) : null, M: full && hasSp ? mean(ref.map(r => r.M)) : null, U: full ? mean(ref.map(r => r.U)) : null,
    T: full ? Array.from({ length: k }, (_, j) => mean(ref.map(r => r.T ? r.T[j] : null))) : null,
    species: hasSp, nEdge: s.edge === 'none' ? rows.filter(r => r.edgeK).length : null, trees: rows,
  };
}
/** Every unit; geom is one geometry for all plots or a function plot_id → geometry. */
export function spatialAll(ds, geom, settings = {}, unitOpts = {}) {
  const { units } = buildUnits(ds, unitOpts);
  return units.filter(u => u.state === 'measured' || u.state === 'empty').map(u => unitSpatial(u, typeof geom === 'function' ? geom(u.plot_id) : geom, settings));
}
