// Stand Structure & Competition: pure logic (no DOM). Specification: docs/TOOLS_SPEC.md §4 (stage SS01, distance-free
// measures); formulas and sources METHODS §16. Units are plot × period exactly as in the Plot & Stand tool: the unit
// builder, expansion factor, dominant height H0 and diameter classes are imported from stand/calc.js, not copied.
// Fixed-area plots only (expansion factor 10000/A); nested plots and angle counts are not handled.
import { buildUnits, unitMetrics, classesFromBreaks, breaksFromWidth, classIndex } from '../stand/calc.js';

export const TOOL = { id: 'mescere-yapisi', version: '1.0.0-beta.1' };
/** Tool settings and their defaults; every one is written into the result. */
export const DEFAULTS = {
  classWidth: 5, classStart: 0,           // diameter classes for Shannon (cm)
  shannonWeight: 'ba',                    // 'ba': proportions of basal area g_i/G (Valbuena 2015, Table 1) | 'n': of stems
  balTies: 'strict',                      // BAL: trees with d_j > d_i ('strict') or d_j ≥ d_i, the tree itself excluded ('ties')
  sdiExp: 1.605, sdiRef: 25,              // SDI = N·(Dq/25)^β; β is Reineke's (1933) value as usually cited [D], Tomé (2020) "about 1.6" [B]
  spacing: 'square',                      // relative spacing: regular square ('square', Tomé 2020) or triangular arrangement
  domRank: 'dbh',                         // H0: the 100 largest trees per hectare by diameter ('dbh') or height ('height')
};
const BA = d => Math.PI * d * d / 40000;
const sum = v => v.reduce((a, b) => a + b, 0);

/** Gini coefficient of x ≥ 0 by Valbuena's (2015, Table 1) definition: ΣΣ|x_i − x_j| / (2n²·x̄). */
export function giniPairs(x) { const n = x.length, m = sum(x) / n; if (n < 2 || !(m > 0)) return null; let s = 0; for (const a of x) for (const b of x) s += Math.abs(a - b); return s / (2 * n * n * m); }
/** The same coefficient from the sorted values (O(n log n)): (2Σ i·x_(i))/(n·Σx) − (n + 1)/n, i = 1…n ascending. */
export function gini(x) { const n = x.length, s = [...x].sort((a, b) => a - b), t = sum(s); if (n < 2 || !(t > 0)) return null; let w = 0; s.forEach((v, i) => { w += (i + 1) * v; }); return 2 * w / (n * t) - (n + 1) / n; }
/** Lorenz curve of basal area with trees ranked by diameter (Valbuena 2015, Eqs. 2–3): points (r/N, M_r). */
export function lorenz(d) { const g = [...d].sort((a, b) => a - b).map(BA), G = sum(g), N = g.length; let c = 0; return [[0, 0], ...g.map((v, i) => { c += v; return [(i + 1) / N, c / G]; })]; }
/** Shannon H′ = −Σ p ln p over p > 0 and evenness J′ = H′/ln S (S = classes with p > 0; J′ undefined for S = 1). */
export function shannon(p) { const q = p.filter(x => x > 0), S = q.length, H = -sum(q.map(x => x * Math.log(x))); return { H, S, J: S > 1 ? H / Math.log(S) : null }; }
/** Simpson D = Σ p² (Valbuena 2015, Table 1). */
export const simpson = p => sum(p.map(x => x * x));
/** Moments with divisor n: coefficient of variation uses the n − 1 standard deviation (stated in METHODS §16). */
export function moments(x) {
  const n = x.length; if (n < 2) return { n, mean: n ? x[0] : null, sd: null, cv: null, skew: null, kurt: null };
  const m = sum(x) / n, m2 = sum(x.map(v => (v - m) ** 2)) / n, m3 = sum(x.map(v => (v - m) ** 3)) / n, m4 = sum(x.map(v => (v - m) ** 4)) / n;
  const sd = Math.sqrt(m2 * n / (n - 1));
  return { n, mean: m, sd, cv: m > 0 ? sd / m : null, skew: m2 > 0 ? m3 / m2 ** 1.5 : null, kurt: m2 > 0 ? m4 / (m2 * m2) - 3 : null };
}
/** BAL of each tree (m² per hectare): Σ g_j over trees with d_j > d_i ('strict') or d_j ≥ d_i, j ≠ i ('ties'), × ef. */
export function bal(d, ef, ties = 'strict') {
  const idx = d.map((_, i) => i).sort((a, b) => d[b] - d[a]), out = new Array(d.length);
  let cum = 0, i = 0;
  while (i < idx.length) {                                   // groups of equal diameters, largest first
    let j = i; while (j < idx.length && d[idx[j]] === d[idx[i]]) j++;
    const gGroup = (j - i) * BA(d[idx[i]]);
    for (let k = i; k < j; k++) out[idx[k]] = (ties === 'ties' ? cum + gGroup - BA(d[idx[k]]) : cum) * ef;
    cum += gGroup; i = j;
  }
  return out;
}
/** Relative spacing (%) = 100·a/H0, a = √(10000/N) (square, Tomé 2020) or √(2·10000/(N√3)) (triangular: area per tree (√3/2)a²). */
export function relSpacing(Nha, H0, spacing = 'square') {
  if (!(Nha > 0) || !(H0 > 0)) return null;
  const a = spacing === 'triangular' ? Math.sqrt(2 * 10000 / (Nha * Math.sqrt(3))) : Math.sqrt(10000 / Nha);
  return 100 * a / H0;
}
export const sdi = (Nha, Dq, exp = DEFAULTS.sdiExp, ref = DEFAULTS.sdiRef) => Nha > 0 && Dq > 0 ? Nha * (Dq / ref) ** exp : null;

/** All distance-free measures of one unit (from buildUnits); s = DEFAULTS overridden. */
export function unitStructure(u, s = {}) {
  s = { ...DEFAULTS, ...s };
  const base = { plot_id: u.plot_id, period: u.period, state: u.state, area: u.area };
  if (u.state !== 'measured' && u.state !== 'empty') return { ...base, status: 'invalid', problems: [{ code: 'unit.' + u.state }] };
  const m = unitMetrics(u), ef = m.ef, d = u.trees.map(t => t.dbh), n = d.length, g = d.map(BA);
  if (n === 0) return { ...base, status: 'empty', n: 0, Nha: 0, Gha: 0 };
  const mo = moments(d), G = sum(g), problems = [], warnings = [];
  // diameter classes for Shannon (half-open [lo, hi), the stand tool's class functions); trees below the start counted.
  // The classes run one width past the largest diameter, so a tree exactly on the last break is not left out.
  const br = breaksFromWidth(s.classStart, s.classWidth, Math.max(...d) + s.classWidth), cl = br ? classesFromBreaks(br).classes : null;
  let sh = null, below = 0;
  if (!cl) problems.push({ code: 'cls.bad' });
  else {
    const w = new Array(cl.length).fill(0);
    d.forEach((x, i) => { const k = classIndex(cl, x); if (k < 0) below++; else if (k < cl.length) w[k] += s.shannonWeight === 'n' ? 1 : g[i]; });
    const tot = sum(w), r = tot > 0 ? shannon(w.map(x => x / tot)) : null;
    sh = r ? { ...r, weight: s.shannonWeight, width: s.classWidth, start: s.classStart, below } : null;
    if (below) warnings.push({ code: 'cls.below', n: below, start: s.classStart });
  }
  // species composition: shares by stems and by basal area; Shannon and Simpson on both
  const sp = new Map(); u.trees.forEach((t, i) => { const k = t.species ?? null; const o = sp.get(k) || { species: k, n: 0, g: 0 }; o.n++; o.g += g[i]; sp.set(k, o); });
  const spl = [...sp.values()], hasSp = !(spl.length === 1 && spl[0].species == null);
  if (hasSp && sp.has(null)) warnings.push({ code: 'sp.missing', n: sp.get(null).n });   // counted as its own group
  const species = hasSp ? { k: spl.length, shares: spl.map(o => ({ species: o.species, pN: o.n / n, pG: o.g / G })), shannonN: shannon(spl.map(o => o.n / n)), shannonG: shannon(spl.map(o => o.g / G)), simpsonN: simpson(spl.map(o => o.n / n)), simpsonG: simpson(spl.map(o => o.g / G)) } : null;
  // density: SDI with Dq of the unit; relative spacing with the platform H0
  const dom = s.domRank === 'height' ? m.dom.h : m.dom.d, H0 = dom.H0;
  if (H0 == null) warnings.push({ code: 'h0.none', why: dom.why });
  // trees: BAL (m²/ha) and relative sizes (Tomé & Barreiro 2025: x_i/x_m, x_i/x_max, x_i/x_dom; here d_i/Dq, g_i/ḡ,
  // d_i/d_max, d_i/D0). Note g_i/ḡ = (d_i/Dq)², both reported because sources use either.
  const B = bal(d, ef, s.balTies), dmax = Math.max(...d), D0 = m.dom.d.D0, gbar = G / n;
  const trees = u.trees.map((t, i) => ({ row: t.row ?? null, tree_id: t.tree_id ?? null, species: t.species ?? null, dbh: d[i], g: g[i], bal: B[i], relDq: d[i] / m.dq, relG: g[i] / gbar, relMax: d[i] / dmax, relDom: D0 > 0 ? d[i] / D0 : null }));
  return { ...base, status: 'ok', problems, warnings, ef, n, Nha: m.Nha, Gha: m.Gha, Dq: m.dq, D0, H0, moments: mo, gini: gini(g), giniD: gini(d), lorenz: lorenz(d),
    shannon: sh, species, sdi: { value: sdi(m.Nha, m.dq, s.sdiExp, s.sdiRef), exp: s.sdiExp, ref: s.sdiRef }, rs: { value: relSpacing(m.Nha, H0, s.spacing), spacing: s.spacing, H0, rank: s.domRank }, trees, settings: s };
}
/** Every unit of a forest-dataset/1 object (buildUnits options as in the Plot & Stand tool). */
export function structureAll(ds, settings = {}, unitOpts = {}) {
  const { units } = buildUnits(ds, unitOpts);
  return units.map(u => unitStructure(u, settings));
}
