// Stand Structure, stage SS02: spatial structure (no DOM). TOOLS_SPEC §4.1; formulas and their reading status in
// METHODS §16 (SS02). The sources (Clark and Evans 1954; Donnelly 1978; Pommerening 2002) are NOT read yet: the
// definitions below are implemented under a provisional definition exception (user decision, 12 Nov 2026) and are to be
// checked against the sources when they are uploaded.
//
// Plot geometry (user given): { shape: 'circle', cx, cy, r } or { shape: 'rect', x0, y0, x1, y1 } (axis-parallel), m.
// Every tree needs x, y inside the plot; a tree without coordinates or outside the plot is a problem with its row, and
// the unit is not computed (a partial map would bias every index).
// Neighbours: k nearest by Euclidean distance (ties by input order; tool rule), found on a uniform grid.
//   Clark–Evans  R = r̄_A / r̄_E, r̄_A mean distance to the nearest neighbour, r̄_E = 0.5/√λ, λ = n/A (trees per m²)
//                Donnelly (edge-corrected expectation): r̄_E,D = 0.5·√(A/n) + (0.0514 + 0.041/√n)·P/n, P perimeter
//   W (uniform angle) W_i = (1/k)·Σ v_j over the k angles between azimuth-adjacent neighbours (each the smaller angle,
//                ≤ 180°), v_j = 1 if the angle < α0 = 360°/(k + 1) (72° for k = 4), else 0
//   M (mingling)  M_i = (1/k)·Σ [species_j ≠ species_i]
//   T (diameter differentiation) T_i = (1/k)·Σ (1 − min(d_i, d_j)/max(d_i, d_j))
//   U (dominance) U_i = (1/k)·Σ v_j, v_j = 0 if neighbour j is smaller than tree i, else 1 (equal diameters count 1)
// Edge handling (written with every result): 'none' (all trees are reference trees; a tree closer to the boundary than
// to its k-th neighbour is flagged as an edge tree), 'buffer' (trees closer than b m to the boundary are neighbours
// only), 'toroidal' (rectangles only: distances wrap around, every tree is a reference tree).
export const SPATIAL_DEFAULTS = { k: 4, edge: 'none', buffer: 5 };
const fin = x => typeof x === 'number' && Number.isFinite(x);

export function geomArea(G) { return G.shape === 'circle' ? Math.PI * G.r * G.r : (G.x1 - G.x0) * (G.y1 - G.y0); }
export function geomPerimeter(G) { return G.shape === 'circle' ? 2 * Math.PI * G.r : 2 * ((G.x1 - G.x0) + (G.y1 - G.y0)); }
/** Distance from (x, y) to the plot boundary (≥ 0 inside, < 0 outside). */
export function boundaryDist(G, x, y) {
  if (G.shape === 'circle') return G.r - Math.hypot(x - G.cx, y - G.cy);
  return Math.min(x - G.x0, G.x1 - x, y - G.y0, G.y1 - y);
}
export function checkGeom(G) {
  if (!G || !['circle', 'rect'].includes(G.shape)) return [{ code: 'geom.shape' }];
  if (G.shape === 'circle' && !(fin(G.cx) && fin(G.cy) && fin(G.r) && G.r > 0)) return [{ code: 'geom.circle' }];
  if (G.shape === 'rect' && !(fin(G.x0) && fin(G.y0) && fin(G.x1) && fin(G.y1) && G.x1 > G.x0 && G.y1 > G.y0)) return [{ code: 'geom.rect' }];
  return [];
}

/**
 * k nearest neighbours of every point: [{ idx: [j…], dist: [r…] }] sorted by distance (ties by index). torus = { w, h }
 * wraps the distances (minimum image), points must lie in [x0, x0 + w) × [y0, y0 + h). Uniform grid with growing rings.
 */
export function knn(xs, ys, k, torus = null) {
  const n = xs.length; if (n < 2) return xs.map(() => ({ idx: [], dist: [] }));
  const kk = Math.min(k, n - 1);
  let x0 = Math.min(...xs), y0 = Math.min(...ys), W = Math.max(...xs) - x0, H = Math.max(...ys) - y0;
  if (torus) { x0 = torus.x0; y0 = torus.y0; W = torus.w; H = torus.h; }
  // on a torus every cell is at least `cell` wide (the side is split into whole cells), so the ring bound below holds
  // across the wrap too
  const cell = Math.max(Math.sqrt(Math.max(W * H, 1e-12) / n) * 1.5, 1e-9), nx = Math.max(1, torus ? Math.floor(W / cell) : Math.ceil(W / cell) || 1), ny = Math.max(1, torus ? Math.floor(H / cell) : Math.ceil(H / cell) || 1);
  const sx = torus ? W / nx : cell, sy = torus ? H / ny : cell;
  const grid = new Map(), key = (i, j) => i * 1000003 + j, cx = x => Math.min(nx - 1, Math.max(0, Math.floor((x - x0) / sx))), cy = y => Math.min(ny - 1, Math.max(0, Math.floor((y - y0) / sy)));
  for (let p = 0; p < n; p++) { const kq = key(cx(xs[p]), cy(ys[p])); if (!grid.has(kq)) grid.set(kq, []); grid.get(kq).push(p); }
  const d2 = (p, q) => { let dx = Math.abs(xs[p] - xs[q]), dy = Math.abs(ys[p] - ys[q]); if (torus) { dx = Math.min(dx, torus.w - dx); dy = Math.min(dy, torus.h - dy); } return dx * dx + dy * dy; };
  const maxRing = Math.max(nx, ny);
  return xs.map((_, p) => {
    const ci = cx(xs[p]), cj = cy(ys[p]), best = [];                    // [d2, q], kept sorted, length ≤ kk
    const consider = q => { if (q === p) return; const v = d2(p, q); if (best.length === kk && (v > best[kk - 1][0] || (v === best[kk - 1][0] && q > best[kk - 1][1]))) return;
      let i = best.length; best.push([v, q]); while (i > 0 && (best[i - 1][0] > v || (best[i - 1][0] === v && best[i - 1][1] > q))) { best[i] = best[i - 1]; i--; } best[i] = [v, q]; if (best.length > kk) best.pop(); };
    const seen = new Set();
    for (let ring = 0; ring <= maxRing; ring++) {
      for (let di = -ring; di <= ring; di++) for (let dj = -ring; dj <= ring; dj++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== ring) continue;
        let a = ci + di, b = cj + dj;
        if (torus) { a = ((a % nx) + nx) % nx; b = ((b % ny) + ny) % ny; } else if (a < 0 || b < 0 || a >= nx || b >= ny) continue;
        const kq = key(a, b); if (seen.has(kq)) continue; seen.add(kq);
        for (const q of grid.get(kq) || []) consider(q);
      }
      // every point not yet seen is at least ring·cell away (minus the point's offset inside its cell): stop when safe
      if (best.length === kk && Math.sqrt(best[kk - 1][0]) <= ring * cell) break;
    }
    return { idx: best.map(b => b[1]), dist: best.map(b => Math.sqrt(b[0])) };
  });
}

/** Clark–Evans with the plain and the Donnelly expectation. nnDist: distances of the reference trees; n, A, P of the plot. */
export function clarkEvans(nnDist, n, A, P) {
  const rA = nnDist.reduce((a, b) => a + b, 0) / nnDist.length, rE = 0.5 / Math.sqrt(n / A), rED = 0.5 * Math.sqrt(A / n) + (0.0514 + 0.041 / Math.sqrt(n)) * P / n;
  return { rA, rE, rED, R: rA / rE, RD: rA / rED };
}
/** W of one tree from the azimuths (radians) of its k neighbours. */
export function uniformAngle(az, k = az.length) {
  const a = az.map(v => ((v % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)).sort((p, q) => p - q), a0 = 2 * Math.PI / (k + 1);
  let c = 0;
  for (let i = 0; i < a.length; i++) { const gap = i + 1 < a.length ? a[i + 1] - a[i] : a[0] + 2 * Math.PI - a[i], ang = Math.min(gap, 2 * Math.PI - gap); if (ang < a0 - 1e-12) c++; }
  return c / a.length;
}

/**
 * Spatial structure of one unit. trees: [{ row, x, y, dbh, species }]. geom: plot geometry. opts: SPATIAL_DEFAULTS.
 * Returns { status: 'ok'|'nocoord'|'invalid', problems, warnings, settings, n, A, P, ce: { R, RD, rA, rE, rED, nRef },
 *   means: { W, M, T, U } (over the reference trees), trees: [{ row, nn1, edgeDist, ref, edge, W, M, T, U }] }.
 */
export function spatialUnit(trees, geom, opts = {}) {
  const s = { ...SPATIAL_DEFAULTS, ...opts }, problems = [...checkGeom(geom)], warnings = [];
  const base = { settings: { ...s, geometry: geom }, problems, warnings };
  if (!(Number.isInteger(s.k) && s.k >= 1 && s.k <= 20)) problems.push({ code: 'sp.k', k: s.k });
  if (!['none', 'buffer', 'toroidal'].includes(s.edge)) problems.push({ code: 'sp.edge', edge: s.edge });
  if (s.edge === 'buffer' && !(fin(s.buffer) && s.buffer > 0)) problems.push({ code: 'sp.buffer', buffer: s.buffer });
  if (s.edge === 'toroidal' && geom && geom.shape !== 'rect') problems.push({ code: 'sp.torus.shape' });
  if (problems.length) return { ...base, status: 'invalid' };
  const noXY = trees.filter(t => !(fin(t.x) && fin(t.y)));
  if (noXY.length === trees.length) return { ...base, status: 'nocoord' };
  if (noXY.length) problems.push({ code: 'xy.missing', count: noXY.length, rows: noXY.slice(0, 20).map(t => t.row ?? null) });
  const out = trees.filter(t => fin(t.x) && fin(t.y) && boundaryDist(geom, t.x, t.y) < -1e-9);
  if (out.length) problems.push({ code: 'xy.outside', count: out.length, rows: out.slice(0, 20).map(t => t.row ?? null) });
  const n = trees.length;
  if (!problems.length && n < s.k + 1) problems.push({ code: 'sp.few', n, k: s.k });
  if (problems.length) return { ...base, status: 'invalid' };
  const xs = trees.map(t => t.x), ys = trees.map(t => t.y), A = geomArea(geom), P = geomPerimeter(geom);
  const torus = s.edge === 'toroidal' ? { x0: geom.x0, y0: geom.y0, w: geom.x1 - geom.x0, h: geom.y1 - geom.y0 } : null;
  { const at = new Map(); trees.forEach((t, i) => { const kq = xs[i] + ',' + ys[i]; if (at.has(kq)) warnings.push({ code: 'xy.same', rows: [trees[at.get(kq)].row ?? null, t.row ?? null] }); else at.set(kq, i); }); }
  const nb = knn(xs, ys, s.k, torus), hasSp = trees.every(t => t.species != null && t.species !== '');
  if (!hasSp) warnings.push({ code: 'sp.nospecies' });
  const rows = trees.map((t, i) => {
    const e = boundaryDist(geom, t.x, t.y), J = nb[i].idx, kd = nb[i].dist[nb[i].dist.length - 1];
    const ref = s.edge === 'buffer' ? e >= s.buffer : true, edge = s.edge === 'none' && e < kd;
    const az = J.map(j => { let dx = xs[j] - t.x, dy = ys[j] - t.y; if (torus) { if (dx > torus.w / 2) dx -= torus.w; else if (dx < -torus.w / 2) dx += torus.w; if (dy > torus.h / 2) dy -= torus.h; else if (dy < -torus.h / 2) dy += torus.h; } return Math.atan2(dy, dx); });
    const dI = t.dbh, Td = J.map(j => { const a = trees[j].dbh; return fin(a) && fin(dI) && a > 0 && dI > 0 ? 1 - Math.min(a, dI) / Math.max(a, dI) : null; });
    return { row: t.row ?? null, tree_id: t.tree_id ?? null, nn1: nb[i].dist[0], edgeDist: e, ref, edge, neighbours: J.map(j => trees[j].row ?? j),
      W: uniformAngle(az, s.k), M: hasSp ? J.filter(j => trees[j].species !== t.species).length / J.length : null,
      T: Td.every(v => v != null) ? Td.reduce((a, b) => a + b, 0) / J.length : null,
      U: fin(dI) ? J.filter(j => !(trees[j].dbh < dI)).length / J.length : null };
  });
  const R = rows.filter(r => r.ref);
  if (!R.length) return { ...base, status: 'invalid', problems: [{ code: 'sp.noref', buffer: s.buffer }] };
  if (s.edge === 'buffer' && R.length < 0.5 * n) warnings.push({ code: 'sp.buffer.large', nRef: R.length, n });
  const mean = key => { const v = R.map(r => r[key]); return v.every(x => x != null) ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  // R with the chosen edge handling (reference trees); Donnelly's expectation is itself the edge correction, so R_D
  // always uses the plain nearest-neighbour distances of all trees (no buffer, no wrapping)
  const ce = clarkEvans(R.map(r => r.nn1), n, A, P), plain = torus ? knn(xs, ys, 1).map(q => q.dist[0]) : rows.map(r => r.nn1), ced = clarkEvans(plain, n, A, P);
  if (fin(s.areaRecorded) && Math.abs(A - s.areaRecorded) > 0.01 * s.areaRecorded) warnings.push({ code: 'geom.area', geom: A, recorded: s.areaRecorded });
  return { ...base, status: 'ok', n, A, P, lambda: n / A, nRef: R.length, nEdge: rows.filter(r => r.edge).length,
    ce: { R: ce.R, rA: ce.rA, rE: ce.rE, nRef: R.length, RD: ced.RD, rAplain: ced.rA, rED: ced.rED }, means: { W: mean('W'), M: mean('M'), T: mean('T'), U: mean('U') }, trees: rows };
}
