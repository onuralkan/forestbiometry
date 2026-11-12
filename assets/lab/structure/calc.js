// Stand Structure & Competition: pure logic (no DOM). Specification docs/TOOLS_SPEC.md §4 (stage SS01: non-spatial
// structure and density); formulas, sources and their reading status in docs/METHODS.md §16.
// The plot × period unit, the expansion factor (10000/A, fixed-area plots only), N/ha, G/ha, Dq, H0 and the diameter
// classes are the Plot & Stand definitions: imported from ../stand/calc.js, never rewritten (TOOLS_SPEC SS01, T00 §2).
//
// Every tree i carries a weight w_i (trees per hectare it represents, = the expansion factor of its plot). Inside one
// fixed-area plot the weights are equal; the weighted functions below are general so that they stay correct if the
// weights differ.
//   moments      CV = s/x̄, skewness g1 = m3/m2^1.5, excess kurtosis g2 = m4/m2² − 3; central moments with divisor W = Σw
//                (n for equal weights): descriptive statistics of the stand, not sample estimates
//   Gini         G = Σ_i Σ_j w_i w_j |x_i − x_j| / (2 W² x̄)  (mean absolute difference over all ordered pairs, i = j
//                included, / twice the mean); computed from the ascending sort: G = Σ_i w_i x_i (W_<i − W_>i) / (W·Σ w x).
//                x = basal area g (default) or diameter. 0 = all equal; 1 − 1/n at most for n equal-weight trees.
//   Shannon      H' = −Σ p_k ln p_k over diameter classes (p_k: share of the trees, weighted); natural log
//   species      shares by number, Shannon H' and Simpson 1 − Σ p² (Gini–Simpson) and Σ p² (dominance)
//   BAL          BAL_i = Σ_{j: d_j > d_i} w_j g_j (m²/ha); equal diameters excluded (default) or included (tool rule,
//                written); the tree itself is never included
//   rel. size    d_i/Dq and g_i/ḡ (= (d_i/Dq)²)
//   SDI          Reineke (1933): SDI = N·(Dq/D_ref)^β; β = 1.605 (Reineke's slope), D_ref = 25 cm (metric tool rule;
//                Reineke's own reference is 10 in = 25.4 cm, available as a setting)
//   RD           Curtis (1982): RD = G/Dq^b (G m²/ha, Dq cm); b = 0.5 (Curtis' rounded value for coastal Douglas-fir;
//                0.4 corresponds to Reineke's 1.605); a setting, written with the result
//   Hart(–Becking) relative spacing S% = 100·a/H0; a = √(10000/N) square spacing, √(2·10000/(N√3)) triangular
//                spacing (geometric definition; textbook-definition exception, user decision 12 Nov 2026)
import { unitMetrics, classesFromBreaks, breaksFromWidth, classIndex } from '../stand/calc.js';

export const TOOL = { id: 'mescere-yapisi', version: '1.0.0-beta.1' };
export const SCHEMA = 'structure-result/1';
export const DEFAULTS = { giniOn: 'g', classStart: 0, classWidth: 4, balTies: 'exclude', sdiBeta: 1.605, sdiRef: 25, rdExp: 0.5, spacing: 'square', h0From: 'dbh' };
export const g = d => Math.PI / 4 * (d / 100) ** 2;
const fin = x => typeof x === 'number' && Number.isFinite(x);

/** Weighted descriptive moments (divisor W = Σw). { mean, sd, cv, skew, kurt } ; skew/kurt null if all values equal. */
export function moments(x, w = x.map(() => 1)) {
  const W = w.reduce((a, b) => a + b, 0); if (!(W > 0) || !x.length) return null;
  const mean = x.reduce((a, v, i) => a + w[i] * v, 0) / W;
  let m2 = 0, m3 = 0, m4 = 0;
  x.forEach((v, i) => { const e = v - mean, e2 = e * e; m2 += w[i] * e2; m3 += w[i] * e2 * e; m4 += w[i] * e2 * e2; });
  m2 /= W; m3 /= W; m4 /= W;
  const sd = Math.sqrt(m2), flat = !(m2 > 1e-24 * Math.max(1, mean * mean));
  return { mean, sd, cv: mean !== 0 ? sd / mean : null, skew: flat ? null : m3 / m2 ** 1.5, kurt: flat ? null : m4 / (m2 * m2) - 3 };
}
/** Weighted Gini coefficient from the ascending sort (ties contribute nothing either way). */
export function gini(x, w = x.map(() => 1)) {
  const idx = x.map((_, i) => i).sort((a, b) => x[a] - x[b]), W = w.reduce((a, b) => a + b, 0), S = x.reduce((a, v, i) => a + w[i] * v, 0);
  if (!(W > 0) || !(S > 0)) return null;
  let below = 0, s = 0;
  for (let k = 0; k < idx.length;) {                         // tie group [k, j): same x, cumulative weight before and after
    let j = k; while (j < idx.length && x[idx[j]] === x[idx[k]]) j++;
    let wg = 0; for (let q = k; q < j; q++) wg += w[idx[q]];
    const above = W - below - wg; s += wg * x[idx[k]] * (below - above); below += wg; k = j;
  }
  return s / (W * S);
}
/** Shannon H' = −Σ p ln p of the given shares (zeros skipped). */
export const shannon = p => -p.reduce((a, q) => a + (q > 0 ? q * Math.log(q) : 0), 0);
/** Simpson: { dominance: Σ p², index: 1 − Σ p² }. */
export const simpson = p => { const d = p.reduce((a, q) => a + q * q, 0); return { dominance: d, index: 1 - d }; };
/** BAL_i (m²/ha): Σ w_j g_j over trees with a larger diameter (ties: 'exclude' | 'include'; never the tree itself). */
export function bal(d, w, ties = 'exclude') {
  const idx = d.map((_, i) => i).sort((a, b) => d[b] - d[a]), out = new Array(d.length);
  let larger = 0;                                            // Σ w g of strictly larger trees
  for (let k = 0; k < idx.length;) {
    let j = k; while (j < idx.length && d[idx[j]] === d[idx[k]]) j++;
    let grp = 0; for (let q = k; q < j; q++) grp += w[idx[q]] * g(d[idx[q]]);
    for (let q = k; q < j; q++) out[idx[q]] = ties === 'include' ? larger + grp - w[idx[q]] * g(d[idx[q]]) : larger;
    larger += grp; k = j;
  }
  return out;
}
export const sdi = (N, Dq, beta = DEFAULTS.sdiBeta, ref = DEFAULTS.sdiRef) => N * (Dq / ref) ** beta;
export const curtisRD = (Gha, Dq, b = DEFAULTS.rdExp) => Gha / Dq ** b;
/** Mean distance between trees a (m) for N trees/ha and the relative spacing S% = 100·a/H0. */
export function spacing(N, H0, pattern = 'square') {
  if (!(N > 0)) return null;
  const a = pattern === 'triangular' ? Math.sqrt(2 * 10000 / (N * Math.sqrt(3))) : Math.sqrt(10000 / N);
  return { a, pct: H0 > 0 ? 100 * a / H0 : null };
}

/** Problems of the settings (nothing is repaired). */
export function checkSettings(s) {
  const p = [];
  if (!['g', 'd'].includes(s.giniOn)) p.push({ code: 'set.gini' });
  if (!(fin(s.classWidth) && s.classWidth > 0) || !(fin(s.classStart) && s.classStart >= 0)) p.push({ code: 'set.classes' });
  if (!['exclude', 'include'].includes(s.balTies)) p.push({ code: 'set.ties' });
  if (!(fin(s.sdiBeta) && s.sdiBeta > 0) || !(fin(s.sdiRef) && s.sdiRef > 0)) p.push({ code: 'set.sdi' });
  if (!(fin(s.rdExp) && s.rdExp > 0)) p.push({ code: 'set.rd' });
  if (!['square', 'triangular'].includes(s.spacing)) p.push({ code: 'set.spacing' });
  if (!['dbh', 'height'].includes(s.h0From)) p.push({ code: 'set.h0' });
  return p;
}

/**
 * Structure of one plot × period unit (buildUnits of ../stand/calc.js; 'measured' or 'empty'). Returns
 * { schema, tool, plot_id, period, status: 'ok'|'empty'|'invalid', n, Nha, Gha, Dq, H0, measures, classes, species, trees,
 *   settings, definitions, problems, warnings }. A value that cannot be computed is null with a warning, never 0.
 */
export function structureUnit(u, settings = {}) {
  const s = { ...DEFAULTS, ...settings }, problems = checkSettings(s), warnings = [];
  const base = { schema: SCHEMA, tool: `${TOOL.id} ${TOOL.version}`, plot_id: u.plot_id, period: u.period ?? null, settings: s, problems, warnings };
  if (problems.length) return { ...base, status: 'invalid', measures: null };
  if (!(u.state === 'measured' || u.state === 'empty')) return { ...base, status: 'invalid', measures: null, problems: [{ code: 'unit.state', state: u.state }] };
  const m = unitMetrics(u), n = m.n;
  const head = { ...base, n, ef: m.ef, Nha: m.Nha, Gha: m.Gha, Dq: m.dq, H0: null };
  if (!n) return { ...head, status: 'empty', measures: null, warnings: [{ code: 'unit.empty' }] };
  const d = u.trees.map(t => t.dbh), w = d.map(() => m.ef), gi = d.map(g);
  const dom = s.h0From === 'height' ? m.dom.h : m.dom.d; head.H0 = dom.H0;
  // diameter structure
  const mo = moments(d, w);
  if (mo.skew == null) warnings.push({ code: 'd.constant' });
  const gn = gini(s.giniOn === 'd' ? d : gi, w);
  // diameter classes (the Plot & Stand class functions), shares by number of trees per hectare
  const dmax = Math.max(...d), br = dmax > s.classStart ? breaksFromWidth(s.classStart, s.classWidth, dmax) : [s.classStart];
  if (!br) return { ...head, status: 'invalid', measures: null, problems: [{ code: 'set.classes.many' }] };
  const cls = classesFromBreaks(br, true).classes;            // equal widths from the start, the last class open
  const cnt = cls.map(() => 0); let below = 0;
  d.forEach((x, i) => { const k = classIndex(cls, x); if (k < 0) below += w[i]; else cnt[Math.min(k, cls.length - 1)] += w[i]; });
  if (below > 0) warnings.push({ code: 'cls.below', n: below / m.ef, start: s.classStart });
  const inCls = cnt.reduce((a, b) => a + b, 0), pc = inCls > 0 ? cnt.map(c => c / inCls) : [];
  // species mix (shares by number)
  const sp = new Map(); u.trees.forEach((t, i) => sp.set(t.species ?? null, (sp.get(t.species ?? null) || 0) + w[i]));
  const W = w.reduce((a, b) => a + b, 0), species = [...sp.entries()].map(([k, v]) => ({ species: k, Nha: v, share: v / W })).sort((a, b) => b.share - a.share || String(a.species).localeCompare(String(b.species)));
  const ps = species.map(x => x.share), simp = simpson(ps);
  if (species.some(x => x.species == null)) warnings.push({ code: 'sp.missing' });
  // tree level
  const B = bal(d, w, s.balTies), gbar = gi.reduce((a, v, i) => a + w[i] * v, 0) / W;
  const trees = u.trees.map((t, i) => ({ row: t.row ?? null, tree_id: t.tree_id ?? null, species: t.species ?? null, dbh: d[i], g: gi[i], bal: B[i], relD: d[i] / m.dq, relG: gi[i] / gbar }));
  // density
  const sp2 = spacing(m.Nha, dom.H0, s.spacing);
  if (dom.H0 == null) warnings.push({ code: 'h0.none', why: dom.why });
  const measures = {
    d_mean: mo.mean, d_sd: mo.sd, cv: mo.cv, skew: mo.skew, kurt: mo.kurt, gini: gn,
    shannonD: pc.length ? shannon(pc) : null, nClasses: cls.length,
    speciesN: species.length, shannonSp: shannon(ps), simpson: simp.index, simpsonD: simp.dominance,
    sdi: sdi(m.Nha, m.dq, s.sdiBeta, s.sdiRef), rd: curtisRD(m.Gha, m.dq, s.rdExp), spacingA: sp2 ? sp2.a : null, hartPct: sp2 ? sp2.pct : null,
  };
  return { ...head, status: 'ok', measures, classes: cls.map((c, i) => ({ lo: c.lo, hi: c.hi, Nha: cnt[i], share: pc[i] ?? null })), species, trees,
    definitions: { moments: 'divisor n (weighted: W = Σw); kurtosis = excess (m4/m2² − 3)', gini: `on ${s.giniOn === 'd' ? 'diameter' : 'basal area'}; ascending sort; mean absolute difference over all pairs / (2·mean)`,
      shannon: 'natural log; diameter classes [lo, hi), shares of trees per hectare', simpson: '1 − Σp² (shares by number)', bal: `m²/ha; equal diameters ${s.balTies === 'include' ? 'included' : 'excluded'}; the tree itself never`,
      sdi: `N·(Dq/${s.sdiRef})^${s.sdiBeta} (Reineke 1933)`, rd: `G/Dq^${s.rdExp} (Curtis 1982; G m²/ha, Dq cm)`, spacing: `${s.spacing}; S% = 100·a/H0 (H0 by ${s.h0From === 'height' ? 'height' : 'diameter'} ranking)` } };
}
