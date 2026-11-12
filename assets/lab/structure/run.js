// Stand Structure: one run over all plot × period units (no DOM): non-spatial structure and density (calc.js),
// spatial structure (spatial.js) and competition (competition.js) per unit, with the plot geometry built from the
// user's choice. The page (ui.js) only draws what this returns; Node tests call it directly.
import { buildUnits } from '../stand/calc.js';
import { structureUnit, g as gOf } from './calc.js';
import { spatialUnit } from './spatial.js';
import { hegyi } from './competition.js';

/**
 * Plot geometry for a unit. spec.shape: 'circle-area' (centre cx, cy; radius √(A/π) from the unit's recorded plot
 * area, a tool rule), 'circle' (cx, cy, r given) or 'rect' (x0, y0, x1, y1 given). Coordinates are in m in the same
 * frame for every plot (e.g. measured from each plot centre).
 */
export function geometryFor(spec, u) {
  if (!spec) return null;
  if (spec.shape === 'circle-area') return { shape: 'circle', cx: spec.cx ?? 0, cy: spec.cy ?? 0, r: Math.sqrt(u.area / Math.PI) };
  if (spec.shape === 'circle') return { shape: 'circle', cx: spec.cx, cy: spec.cy, r: spec.r };
  if (spec.shape === 'rect') return { shape: 'rect', x0: spec.x0, y0: spec.y0, x1: spec.x1, y1: spec.y1 };
  return null;
}
/** Lorenz curve of x (weights w), ascending: points (cumulative share of trees, cumulative share of x), from (0, 0). */
export function lorenz(x, w = x.map(() => 1)) {
  const o = x.map((_, i) => i).sort((a, b) => x[a] - x[b]), W = w.reduce((a, b) => a + b, 0), S = x.reduce((a, v, i) => a + w[i] * v, 0);
  const pts = [[0, 0]]; let cw = 0, cs = 0;
  for (const i of o) { cw += w[i]; cs += w[i] * x[i]; pts.push([cw / W, S > 0 ? cs / S : 0]); }
  return pts;
}

/**
 * opts = { structure: settings of structureUnit, spatial: { k, edge, buffer } | null (null: no spatial part),
 *          geometry: geometryFor spec, competition: { mode, k, radius, edge, buffer } }.
 * Returns { units: [{ plot_id, period, state, area, n, st (structureUnit), sp (spatialUnit or { status }),
 * ci (hegyi or { status }), lorenz }], hasXY, periods, skipped }.
 */
export function analyse(ds, opts = {}) {
  const { units, periods } = buildUnits(ds, { emptyCombos: 'unmeasured' });
  const hasXY = ds.trees.some(t => Number.isFinite(t.x) && Number.isFinite(t.y));
  const out = [], skipped = [];
  for (const u of units) {
    if (u.state !== 'measured' && u.state !== 'empty') { skipped.push({ plot_id: u.plot_id, period: u.period, state: u.state }); continue; }
    const st = structureUnit(u, opts.structure || {});
    let sp = { status: 'off' }, ci = { status: 'off' };
    if (opts.spatial && st.status === 'ok') {
      const G = geometryFor(opts.geometry, u), T = u.trees.map(t => ({ row: t.row, tree_id: t.tree_id, x: t.x, y: t.y, dbh: t.dbh, species: t.species }));
      sp = G ? spatialUnit(T, G, { ...opts.spatial, areaRecorded: u.area }) : { status: 'nogeom' };
      ci = G ? hegyi(T, G, opts.competition || {}) : { status: 'nogeom' };
    }
    const lz = st.status === 'ok' ? lorenz(st.settings.giniOn === 'd' ? u.trees.map(t => t.dbh) : u.trees.map(t => gOf(t.dbh))) : null;
    out.push({ plot_id: u.plot_id, period: u.period, state: u.state, area: u.area, n: u.trees.length, trees: u.trees, st, sp, ci, lorenz: lz });
  }
  return { units: out, hasXY, periods, skipped };
}
