// Product bucking (assortments) on a taper profile, stage SV-06/a1 (TOOLS_SPEC §6.2, TP03; docs/PLATFORM_PLAN.md SV-06).
// No DOM. The site ships NO products, prices or lengths (TOOLS_SPEC K1): the user defines them.
//
// Sources (docs/METHODS.md §19):
//   Grondin, F. 1998. Improvements of the dynamic programming algorithm for tree bucking. Wood and Fiber Science
//     30(1): 91–104 [B]: recursion (3), stem_value(0, j) = max over predefined lengths i of
//     stem_value(0, j − i) + log_value(j − i, j), positions in steps p from the butt, lengths divisible by p; the value
//     of the segment left at the small end is separate. Grondin cites the first DP bucking model, Pnevmaticos and
//     Mann (1972), and says his own formulation differs from it; the original was not read [D], credited as cited.
//   Bennemann, C., Lussier, J.-M., Labelle, E.R. 2025. An open-source tree bucking optimizer based on dynamic
//     programming. Forests 16: 780 [B]: the same stage recursion (value of the log added + best value of the
//     cumulative length before it); products by length (including overlength), small-end diameter limits and a value
//     per cubic metre applied to the log volume; a log of zero value is allowed but never chosen.
// Tool rules (not taken from a source, written in the results):
//   - Positions on a grid of step Δ (default 0.1 m) from the stump cut; every product length + trim must be a whole
//     number of steps (otherwise the product is refused, as in Grondin: lengths divisible by p).
//   - A piece occupies its nominal length + trim; its small-end diameter is the profile diameter at its top, and its
//     volume and value cover the whole piece (Bennemann et al.: length including overlength, value per m³ of volume).
//   - The usable stem is [stump, hTop], hTop the height of the usable top diameter (the highest root, as on the taper
//     page); pieces lie inside it. One step may be left as waste anywhere (so the recursion also covers profiles that
//     do not taper monotonically); waste and the remainder below hTop are residual volume.
//   - Priority method (greedy, TOOLS_SPEC §6.2 (1)): from the stump up, at each position the highest-priority product
//     that fits (longest of its lengths first); stops when nothing fits.
//   - Value method (DP): maximises Σ value (or Σ volume when objective = 'volume'); ties keep the earlier choice
//     (waste first, then products by priority and lengths from long to short).
//   - Volumes are profile integrals (taper/calc.js volume), so pieces + stump + waste + top = total stem volume.
import { volume, merchantable, diameterAt, barkOf, checkSet, checkTree } from './calc.js';

export const PRODUCTS_SCHEMA = 'bucking-products/1';
export const BUCK_DEFAULTS = { method: 'value', objective: 'value', step: 0.1, stump: 0.3, dTop: null };
const fin = x => typeof x === 'number' && Number.isFinite(x);
const EPS = 1e-9;

/**
 * Validates a product list { schema, bark: 'ob' | 'ib', currency, products: [{ id, name, dMin (cm), L (m), Lmax (m or
 * null: fixed length), Lstep (m), trim (cm), priority (integer ≥ 1, 1 = highest), value (per m³ or null) }] }.
 * Returns problems [{ code, product?, ... }] (empty when valid).
 */
export function checkProducts(list) {
  const out = [];
  if (!list || typeof list !== 'object') return [{ code: 'products.missing' }];
  if (!['ob', 'ib'].includes(list.bark)) out.push({ code: 'products.bark' });
  const ps = Array.isArray(list.products) ? list.products : null;
  if (!ps || !ps.length) { out.push({ code: 'products.empty' }); return out; }
  const ids = new Set();
  ps.forEach((p, i) => {
    const at = { product: i, id: p && p.id };
    if (!p || typeof p.id !== 'string' || !p.id.trim()) out.push({ code: 'product.id', ...at });
    else if (ids.has(p.id)) out.push({ code: 'product.id.duplicate', ...at }); else ids.add(p.id);
    if (!(p && typeof p.name === 'string' && p.name.trim())) out.push({ code: 'product.name', ...at });
    if (!(p && fin(p.dMin) && p.dMin > 0)) out.push({ code: 'product.dMin', ...at });
    if (!(p && fin(p.L) && p.L > 0)) out.push({ code: 'product.L', ...at });
    if (p && p.Lmax != null && !(fin(p.Lmax) && fin(p.L) && p.Lmax >= p.L && fin(p.Lstep) && p.Lstep > 0)) out.push({ code: 'product.Lrange', ...at });
    if (!(p && (p.trim == null || (fin(p.trim) && p.trim >= 0)))) out.push({ code: 'product.trim', ...at });
    if (!(p && Number.isInteger(p.priority) && p.priority >= 1)) out.push({ code: 'product.priority', ...at });
    if (!(p && (p.value == null || (fin(p.value) && p.value >= 0)))) out.push({ code: 'product.value', ...at });
  });
  return out;
}

/** Nominal lengths of a product (m): L, or L, L + Lstep, … ≤ Lmax. */
export function lengthsOf(p) {
  if (p.Lmax == null) return [p.L];
  const out = [], n = Math.floor((p.Lmax - p.L) / p.Lstep + EPS);
  for (let i = 0; i <= n; i++) out.push(+(p.L + i * p.Lstep).toFixed(10));
  return out;
}

/**
 * Options of the recursion: one per product and length, { product (index), L (nominal m), len (L + trim, m), k (steps) },
 * ordered by priority (then list order) and length from long to short. Problems for lengths off the grid.
 */
export function options(list, step) {
  const problems = [], opts = [];
  const order = list.products.map((p, i) => i).sort((a, b) => list.products[a].priority - list.products[b].priority || a - b);
  for (const i of order) {
    const p = list.products[i];
    for (const L of lengthsOf(p).slice().reverse()) {
      const len = L + (p.trim || 0) / 100, k = Math.round(len / step);
      if (Math.abs(k * step - len) > 1e-7 * Math.max(1, len)) { problems.push({ code: 'length.grid', product: i, id: p.id, L, len, step }); continue; }
      opts.push({ product: i, L, len, k });
    }
  }
  return { opts, problems };
}

/** Grid of the usable stem: heights hj = stump + j·Δ (j = 0…M ≤ (hTop − stump)/Δ), diameters there, and cumulative volumes. */
function grid(set, D, H, stump, hTop, step) {
  const M = Math.max(0, Math.floor((hTop - stump) / step + EPS)), h = [], d = [], C = [0];
  for (let j = 0; j <= M; j++) { h.push(j === 0 ? stump : Math.min(stump + j * step, hTop)); const r = diameterAt(set, D, H, h[j]); d.push(r.status === 'ok' ? r.d : null); }
  for (let j = 1; j <= M; j++) { const v = volume(set, D, H, h[j - 1], h[j]); if (v.status !== 'ok') return null; C.push(C[j - 1] + v.V); }
  return { M, h, d, C };
}

/** Dynamic programming over the grid (Grondin 1998 recursion (3), with one-step waste allowed). */
function dp(G, list, opts, objective) {
  const f = new Float64Array(G.M + 1), from = new Array(G.M + 1).fill(null);
  for (let j = 1; j <= G.M; j++) {
    f[j] = f[j - 1]; from[j] = null;
    for (const o of opts) {
      const i = j - o.k; if (i < 0) continue;
      const p = list.products[o.product];
      if (G.d[j] == null || G.d[j] < p.dMin) continue;
      const v = G.C[j] - G.C[i], val = f[i] + (objective === 'volume' ? v : (p.value || 0) * v);
      if (val > f[j]) { f[j] = val; from[j] = o; }
    }
  }
  const cuts = []; let j = G.M;
  while (j > 0) { const o = from[j]; if (o) { cuts.push({ i: j - o.k, j, o }); j -= o.k; } else j -= 1; }
  return { best: f[G.M], cuts: cuts.reverse() };
}

/** Greedy by priority: at each position the first option (priority, then longest) that fits; stops when none fits. */
function greedy(G, list, opts) {
  const cuts = []; let i = 0;
  for (;;) {
    const o = opts.find(q => i + q.k <= G.M && G.d[i + q.k] != null && G.d[i + q.k] >= list.products[q.product].dMin);
    if (!o) break; cuts.push({ i, j: i + o.k, o }); i += o.k;
  }
  return { cuts };
}

/**
 * Bucks one tree (D cm, H m) with one taper set and a product list. opts: { method: 'value' | 'priority',
 * objective: 'value' | 'volume' (value method), step (m), stump (m), dTop (cm or null) }.
 * Returns { status: 'ok' | 'invalid' | 'failed', problems, settings, hTop, pieces: [{ product, id, name, h1, h2, L, trim,
 * len, dLarge, dSmall, V, value }], byProduct, volumes: { total, stump, pieces, waste, top, residual }, valueTotal, best }.
 */
export function buckTree(set, D, H, list, opts = {}) {
  const o = { ...BUCK_DEFAULTS, ...opts }, settings = { method: o.method, objective: o.method === 'value' ? o.objective : null, step: o.step, stump: o.stump, dTop: o.dTop ?? null };
  const head = { schema: 'bucking-result/1', D, H, settings, bark: barkOf(set) };
  const problems = [...checkSet(set), ...checkTree(D, H), ...checkProducts(list)];
  if (!['value', 'priority'].includes(o.method)) problems.push({ code: 'method.bad' });
  if (o.method === 'value' && !['value', 'volume'].includes(o.objective)) problems.push({ code: 'objective.bad' });
  if (!(fin(o.step) && o.step > 0)) problems.push({ code: 'step.bad' });
  if (!(fin(o.stump) && o.stump >= 0 && (!fin(H) || o.stump < H))) problems.push({ code: 'stump.bad' });
  if (o.dTop != null && !(fin(o.dTop) && o.dTop > 0)) problems.push({ code: 'dtop.bad' });
  if (!problems.length && barkOf(set) !== list.bark) problems.push({ code: 'bark.mismatch', set: barkOf(set), products: list.bark });
  if (!problems.length && o.method === 'value' && o.objective === 'value') list.products.forEach((p, i) => { if (p.value == null) problems.push({ code: 'product.value.missing', product: i, id: p.id }); });
  let op = null;
  if (!problems.length) { op = options(list, o.step); problems.push(...op.problems); }
  if (problems.length) return { ...head, status: 'invalid', problems };

  const total = volume(set, D, H, 0, H), m = merchantable(set, D, H, { stump: o.stump, dTop: o.dTop });
  if (total.status !== 'ok' || m.status !== 'ok') return { ...head, status: 'failed', problems: [{ code: 'profile.' + (total.status !== 'ok' ? total.status : m.status) }] };
  const hTop = o.dTop == null ? H : m.note === 'below-at-stump' || m.hTop == null ? o.stump : m.hTop;
  const G = grid(set, D, H, o.stump, hTop, o.step);
  if (!G) return { ...head, status: 'failed', problems: [{ code: 'profile.volume' }] };
  const run = o.method === 'value' ? dp(G, list, op.opts, o.objective) : greedy(G, list, op.opts);

  const pieces = run.cuts.map(({ i, j, o: q }) => {
    const p = list.products[q.product], h1 = G.h[i], h2 = G.h[j], V = volume(set, D, H, h1, h2).V;
    return { product: q.product, id: p.id, name: p.name, h1, h2, L: q.L, trim: p.trim || 0, len: q.len, dLarge: G.d[i], dSmall: G.d[j], V, value: p.value == null ? null : p.value * V };
  });
  const byProduct = list.products.map((p, i) => {
    const mine = pieces.filter(q => q.product === i);
    return { product: i, id: p.id, name: p.name, n: mine.length, V: mine.reduce((s, q) => s + q.V, 0), value: p.value == null ? null : mine.reduce((s, q) => s + q.value, 0) };
  });
  const Vstump = volume(set, D, H, 0, o.stump).V, Vusable = volume(set, D, H, o.stump, hTop).V, Vtop = volume(set, D, H, hTop, H).V;
  const Vpieces = pieces.reduce((s, q) => s + q.V, 0), waste = Vusable - Vpieces;
  const valueTotal = pieces.every(q => q.value != null) ? pieces.reduce((s, q) => s + q.value, 0) : null;
  return { ...head, status: 'ok', problems: [], hTop, topNote: m.note, grid: { M: G.M, step: o.step, rest: hTop - G.h[G.M] },
    pieces, byProduct, valueTotal, best: o.method === 'value' ? run.best : null,
    volumes: { total: total.V, stump: Vstump, usable: Vusable, pieces: Vpieces, waste, top: Vtop, residual: Vstump + waste + Vtop } };
}

/**
 * Several trees [{ id, D, H, ... }] with one set and one product list: per-tree results and totals by product.
 */
export function buckTrees(set, trees, list, opts = {}) {
  const results = trees.map(t => ({ tree: t, r: buckTree(set, t.D, t.H, list, opts) }));
  const ok = results.filter(x => x.r.status === 'ok');
  const byProduct = (list && Array.isArray(list.products) ? list.products : []).map((p, i) => ({ product: i, id: p.id, name: p.name,
    n: ok.reduce((s, x) => s + x.r.byProduct[i].n, 0), V: ok.reduce((s, x) => s + x.r.byProduct[i].V, 0), value: p.value == null ? null : ok.reduce((s, x) => s + x.r.byProduct[i].value, 0) }));
  const sum = k => ok.reduce((s, x) => s + x.r.volumes[k], 0);
  return { results, byProduct, nOk: ok.length, nFailed: results.length - ok.length,
    volumes: { total: sum('total'), pieces: sum('pieces'), residual: sum('residual'), stump: sum('stump'), waste: sum('waste'), top: sum('top') },
    valueTotal: byProduct.every(b => b.value != null) ? byProduct.reduce((s, b) => s + b.value, 0) : null };
}

/** Product list as a JSON text (saved and loaded by the page). */
export const productsToJSON = list => JSON.stringify({ schema: PRODUCTS_SCHEMA, bark: list.bark, currency: list.currency ?? null,
  products: list.products.map(p => ({ id: p.id, name: p.name, dMin: p.dMin, L: p.L, Lmax: p.Lmax ?? null, Lstep: p.Lmax == null ? null : p.Lstep, trim: p.trim ?? 0, priority: p.priority, value: p.value ?? null })) }, null, 2);

/** Reads a product list JSON text: { list, problems } (problems as in checkProducts, plus 'json.parse' / 'json.schema'). */
export function parseProducts(text) {
  let o; try { o = JSON.parse(text); } catch { return { list: null, problems: [{ code: 'json.parse' }] }; }
  if (!o || o.schema !== PRODUCTS_SCHEMA) return { list: null, problems: [{ code: 'json.schema' }] };
  const list = { bark: o.bark, currency: o.currency ?? null, products: Array.isArray(o.products) ? o.products.map(p => ({ ...p, Lmax: p.Lmax ?? null, Lstep: p.Lstep ?? null, trim: p.trim ?? 0, value: p.value ?? null })) : [] };
  const problems = checkProducts(list);
  return { list: problems.length ? null : list, problems };
}
