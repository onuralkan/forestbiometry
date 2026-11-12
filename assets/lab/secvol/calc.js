// Stem Section Volume: pure logic (no DOM). Specification: docs/TOOLS_SPEC.md §2 (stage SV01); formulas METHODS §14.
// Input: one tree of a stem-sections/1 table (core/stems.js readStems): points sorted by height above ground,
// diameters over bark (d) and/or under bark (d_ib), tree attributes dbh, height (total), stump_h (cut height).
// g(d) = (π/4)(d/100)² m² with d in cm; lengths in m; volumes in m³.
//
// Methods (separate ids) and the data layouts they accept (the layout is the user's choice, never guessed):
//   huber     V = g_m·L               layouts 'mids' (every point is a section middle) or 'triples' (uses the middles)
//   smalian   V = (g₁ + g₂)/2·L       layouts 'ends' (every point is a section boundary) or 'triples' (uses the ends)
//   newton    V = L/6·(g₁ + 4g_m + g₂) layout 'triples' (end, middle, end, middle, end …)
//   hohenadl  V = (H/5)·Σ g(d at 0.1H, 0.3H, 0.5H, 0.7H, 0.9H)   points at those heights (tolerance hohTol); covers
//             the whole stem from the ground to the top: no separate stump or top section
// Stump (ground → cut height): cylinder with the diameter at the cut surface; shown separately, added to the total only
// if includeStump. Top (last boundary → total height): cone gL/3 (default, a tool rule), paraboloid gL/2 or neiloid gL/4.
// Without a total height there is no top section and the volume is labelled "to the last boundary".
export const TOOL = { id: 'seksiyon-hacmi', version: '1.0.0-beta.1' };
export const METHODS = ['huber', 'smalian', 'newton', 'hohenadl'];
export const LAYOUTS = { huber: ['mids', 'triples'], smalian: ['ends', 'triples'], newton: ['triples'], hohenadl: ['hohenadl'] };
export const SOLIDS = { paraboloid: 1, cone: 2, neiloid: 3 };            // g(t) = g0·(1 − t/L)^r
/** Tool rules (not literature values); each is a setting written into the result. */
export const DEFAULTS = { method: 'smalian', layout: 'ends', top: 'cone', includeStump: false, midTol: 0.01, hohTol: 0.05, dTop: null };
const HOH = [0.1, 0.3, 0.5, 0.7, 0.9];

export const ba = d => Math.PI / 4 * (d / 100) ** 2;
/** Volume of a solid of revolution with base area g0, length L, g(t) = g0(1 − t/L)^r, between t = 0 and t = x ≤ L. */
export function solidVolume(g0, L, r, x = L) { return g0 * L / (r + 1) * (1 - (1 - x / L) ** (r + 1)); }

/**
 * tree: a stem-sections/1 tree record. settings: DEFAULTS overridden. Returns
 * { tree, status: 'ok'|'invalid', settings, ob: part|null, ib: part|null, formFactor, problems, warnings }
 * part = { status, sections: [{ kind: 'stump'|'section'|'top', lo, hi, L, d: { lo, mid, hi }, v }], stem, stump, top,
 *          total, label: 'to-top'|'to-last-boundary'|'ground-to-top', merch?, problems, warnings }.
 */
export function treeVolume(tree, settings = {}) {
  const s = { ...DEFAULTS, ...settings }, base = { tree: { plot_id: tree.plot_id ?? null, tree_id: tree.tree_id, period: tree.period ?? null }, settings: s };
  const problems = [];
  if (!METHODS.includes(s.method)) problems.push({ code: 'method.bad', method: s.method });
  else if (!LAYOUTS[s.method].includes(s.method === 'hohenadl' ? 'hohenadl' : s.layout)) problems.push({ code: 'layout.method', method: s.method, layout: s.layout });
  if (!(s.top in SOLIDS)) problems.push({ code: 'top.bad', top: s.top });
  if (s.dTop != null && !(s.dTop > 0)) problems.push({ code: 'dtop.bad', value: s.dTop });
  if (tree.state === 'error') problems.push({ code: 'tree.error' });
  if (problems.length) return { ...base, status: 'invalid', ob: null, ib: null, formFactor: null, problems, warnings: [] };
  const ob = tree.points.every(p => p.d != null) ? part(tree, s, p => p.d) : null;
  const ib = tree.points.every(p => p.d_ib != null) ? part(tree, s, p => p.d_ib) : null;
  const warnings = [];
  if (!ob) warnings.push({ code: 'ob.none' });
  if (!ib) warnings.push({ code: 'ib.none' });
  const ff = ob && ob.status === 'ok' && ob.label !== 'to-last-boundary' && tree.dbh > 0 && tree.height > 0 ? { value: ob.total / (ba(tree.dbh) * tree.height), volume: ob.label === 'ground-to-top' ? 'ground-to-top' : ob.includeStump ? 'stump-included' : 'from-cut', def: 'f1.3 = V / (g1.3 · H)' } : null;
  const status = (ob && ob.status === 'ok') || (ib && ib.status === 'ok') ? 'ok' : 'invalid';
  return { ...base, status, ob, ib, formFactor: ff, problems: status === 'ok' ? [] : [...(ob ? ob.problems : []), ...(ib ? ib.problems : [])], warnings };
}

/** One bark state (dOf picks the diameter). */
function part(tree, s, dOf) {
  const pts = tree.points.map(p => ({ h: p.h, d: dOf(p), kind: p.kind, row: p.row })), H = tree.height ?? null, problems = [], warnings = [];
  const out = (o) => ({ status: problems.length ? 'invalid' : 'ok', sections: [], stem: null, stump: null, top: null, total: null, label: null, problems, warnings, ...o });
  if (s.method === 'hohenadl') return hohenadl(pts, H, s, problems, out);
  // section list from the layout
  let secs = [], lastBoundary = null, dAtLast = null;
  if (s.layout === 'ends') {
    const e = pts;
    if (e.length < 2) problems.push({ code: 'ends.few', n: e.length });
    for (let i = 0; i + 1 < e.length; i++) secs.push({ lo: e[i].h, hi: e[i + 1].h, d: { lo: e[i].d, mid: null, hi: e[i + 1].d } });
    if (e.length) { lastBoundary = e[e.length - 1].h; dAtLast = e[e.length - 1].d; }
  } else if (s.layout === 'triples') {
    const e = pts;
    if (e.length < 3 || e.length % 2 === 0) problems.push({ code: 'triples.count', n: e.length });
    else for (let i = 0; i + 2 < e.length; i += 2) {
      const a = e[i], m = e[i + 1], b = e[i + 2];
      if (Math.abs(m.h - (a.h + b.h) / 2) > s.midTol) problems.push({ code: 'triples.mid', row: m.row, h: m.h, expected: (a.h + b.h) / 2, tol: s.midTol });
      secs.push({ lo: a.h, hi: b.h, d: { lo: a.d, mid: m.d, hi: b.d } });
    }
    if (e.length) { lastBoundary = e[e.length - 1].h; dAtLast = e[e.length - 1].d; }
  } else if (s.layout === 'mids') {
    // section middles; boundaries derived from the cut height: b0 = stump_h, b(i+1) = 2·m(i) − b(i). Points marked
    // 'stump', 'dbh' or 'top' are auxiliary (not middles); a 'top' point exactly at the last boundary gives its diameter.
    if (tree.stump_h == null) problems.push({ code: 'mids.nostump' });
    else {
      const mids = pts.filter(p => !['stump', 'dbh', 'top'].includes(p.kind));
      let b = tree.stump_h;
      for (const m of mids) {
        if (!(m.h > b)) { problems.push({ code: 'mids.order', row: m.row, h: m.h, boundary: b }); break; }
        const hi = 2 * m.h - b; secs.push({ lo: b, hi, d: { lo: null, mid: m.d, hi: null } }); b = hi;
      }
      if (!mids.length) problems.push({ code: 'mids.none' });
      lastBoundary = b;
      if (H != null && lastBoundary > H + 1e-9) problems.push({ code: 'mids.beyondtop', boundary: lastBoundary, height: H });
      const at = pts.find(p => Math.abs(p.h - lastBoundary) <= s.midTol && ['top', 'stump', 'dbh'].includes(p.kind));
      dAtLast = at ? at.d : null;
    }
  }
  if (problems.length) return out();
  for (const q of secs) {
    q.L = q.hi - q.lo; q.kind = 'section';
    q.v = s.method === 'smalian' ? (ba(q.d.lo) + ba(q.d.hi)) / 2 * q.L : s.method === 'huber' ? ba(q.d.mid) * q.L : q.L / 6 * (ba(q.d.lo) + 4 * ba(q.d.mid) + ba(q.d.hi));
  }
  const stem = secs.reduce((a, q) => a + q.v, 0), sections = [...secs];
  // stump: needs a diameter at the cut height (a point there)
  let stump = null;
  if (tree.stump_h != null) {
    const c = pts.find(p => Math.abs(p.h - tree.stump_h) <= 1e-9);
    if (c && tree.stump_h > 0) { stump = { kind: 'stump', lo: 0, hi: tree.stump_h, L: tree.stump_h, d: { lo: c.d, mid: c.d, hi: c.d }, v: ba(c.d) * tree.stump_h }; sections.unshift(stump); }
    else if (tree.stump_h > 0) warnings.push({ code: 'stump.nod', h: tree.stump_h });
    if (secs.length && secs[0].lo > tree.stump_h + 1e-9) warnings.push({ code: 'gap.base', from: tree.stump_h, to: secs[0].lo });
  } else warnings.push({ code: 'stump.noh' });
  // top
  let top = null, label;
  if (H == null) { label = 'to-last-boundary'; warnings.push({ code: 'top.noh' }); }
  else if (!(H > lastBoundary)) { label = 'to-top'; if (lastBoundary > H + 1e-9) problems.push({ code: 'top.below', boundary: lastBoundary, height: H }); }
  else if (dAtLast == null) { label = 'to-last-boundary'; warnings.push({ code: 'top.nod', h: lastBoundary }); }
  else { const L = H - lastBoundary, g0 = ba(dAtLast); top = { kind: 'top', lo: lastBoundary, hi: H, L, d: { lo: dAtLast, mid: null, hi: 0 }, solid: s.top, v: solidVolume(g0, L, SOLIDS[s.top]) }; sections.push(top); label = 'to-top'; }
  if (problems.length) return out();
  const total = stem + (top ? top.v : 0) + (s.includeStump && stump ? stump.v : 0);
  const o = out({ sections, stem, stump: stump ? stump.v : null, top: top ? top.v : null, total, label, includeStump: s.includeStump && !!stump });
  if (s.dTop != null) o.merch = merch(secs, top, stump, s, pts);
  return o;
}

/** Hohenadl: five equal sections over the total height, diameters measured at 0.1H … 0.9H (tolerance hohTol). */
function hohenadl(pts, H, s, problems, out) {
  if (!(H > 0)) { problems.push({ code: 'hoh.noh' }); return out(); }
  const sections = [];
  for (const f of HOH) {
    const target = f * H, p = pts.filter(q => Math.abs(q.h - target) <= s.hohTol).sort((a, b) => Math.abs(a.h - target) - Math.abs(b.h - target))[0];
    if (!p) { problems.push({ code: 'hoh.missing', at: f, h: target, tol: s.hohTol }); continue; }
    sections.push({ kind: 'section', lo: (f - 0.1) * H, hi: (f + 0.1) * H, L: H / 5, d: { lo: null, mid: p.d, hi: null }, hMeasured: p.h, v: ba(p.d) * H / 5 });
  }
  if (problems.length) return out();
  const total = sections.reduce((a, q) => a + q.v, 0);
  return out({ sections, stem: total, total, label: 'ground-to-top' });
}

/**
 * Merchantable volume up to the height where the diameter falls to dTop. Inside the measured stem the height is found
 * by LINEAR interpolation of the diameter between neighbouring points, and the cut section is computed with the same
 * method from linearly interpolated diameters; inside the top piece the chosen solid's own profile is used,
 * d(t) = d0·(1 − t/L)^(r/2). Starts at the lowest boundary (the stump is never merchantable volume here).
 */
function merch(secs, top, stump, s, pts) {
  const dTop = s.dTop, sorted = [...pts].sort((a, b) => a.h - b.h);
  const dAt = h => { for (let i = 0; i + 1 < sorted.length; i++) { const a = sorted[i], b = sorted[i + 1]; if (h >= a.h && h <= b.h) return a.d + (b.d - a.d) * (h - a.h) / (b.h - a.h); } return null; };
  if (!secs.length) return { status: 'invalid', code: 'merch.nosec' };
  const first = secs[0].lo, d0 = dAt(first) ?? (secs[0].d.lo ?? secs[0].d.mid);
  if (d0 != null && d0 < dTop) return { status: 'ok', dTop, h: null, volume: 0, note: 'below-at-base' };
  // first crossing from the base upwards, among the measured points (linear interpolation)
  let hm = null;
  for (let i = 0; i + 1 < sorted.length; i++) { const a = sorted[i], b = sorted[i + 1]; if (a.h < first) continue; if (a.d >= dTop && b.d < dTop) { hm = a.h + (a.d - dTop) / (a.d - b.d) * (b.h - a.h); break; } }
  let v = 0;
  if (hm != null) {
    for (const q of secs) {
      if (q.hi <= hm) { v += q.v; continue; }
      if (q.lo >= hm) break;
      const L = hm - q.lo, dl = dAt(q.lo), dm = dAt((q.lo + hm) / 2);
      if ((s.method !== 'huber' && dl == null) || (s.method !== 'smalian' && dm == null)) return { status: 'invalid', code: 'merch.nod', dTop };   // never a zero area for a missing diameter
      v += s.method === 'smalian' ? (ba(dl) + ba(dTop)) / 2 * L : s.method === 'huber' ? ba(dm) * L : L / 6 * (ba(dl) + 4 * ba(dm) + ba(dTop));
    }
    return { status: 'ok', dTop, h: hm, volume: v, rule: 'linear-interpolation' };
  }
  // not reached inside the measured stem: inside the top piece, by its solid
  v = secs.reduce((a, q) => a + q.v, 0);
  if (!top) return { status: 'invalid', code: 'merch.notop', dTop };
  const r = SOLIDS[top.solid], t = top.L * (1 - (dTop / top.d.lo) ** (2 / r));
  return { status: 'ok', dTop, h: top.lo + t, volume: v + solidVolume(ba(top.d.lo), top.L, r, t), rule: 'top-solid' };
}

/** Every tree of a readStems result; trees with errors are returned with status 'invalid' and code 'tree.error'. */
export function allTrees(st, settings = {}) { return st.trees.map(T => treeVolume(T, settings)); }
