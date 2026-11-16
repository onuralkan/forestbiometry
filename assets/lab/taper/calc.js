// Taper (stem profile) core, stage SV-02/a1 (TOOLS_SPEC TP01; docs/PLATFORM_PLAN.md SV-02, SV-03). No DOM.
// The site ships NO coefficients (TOOLS_SPEC K1): a profile is a user's coefficient set (model-coef/1, tool 'taper')
// with its source; this file only knows the equation FORMS whose sources have been read.
//
// mb76: Max, T.A., Burkhart, H.E. 1976. Segmented polynomial regression applied to taper equations. Forest Science
// 22: 283–289, Model 4 (quadratic–quadratic–quadratic, reparameterized after Gallant and Fuller 1973) [B]:
//   y = b1·(x − 1) + b2·(x² − 1) + b3·(a1 − x)²·I1 + b4·(a2 − x)²·I2,  I_i = 1 if x ≤ a_i, else 0
//   y = d²/D², x = h/H; d diameter at height h (cm), D dbh outside bark (cm), H total height (m), h height above the
//   ground (m); a1, a2 join points (relative heights). The paper fits d inside bark; the set's output.bark says which
//   (ob or ib) the user's coefficients give. The model is conditioned so that d = 0 at x = 1.
// Volume between h1 and h2 (m³): V = (π/40000)·∫ d² dh = (π/40000)·D²·H·[Y(x2) − Y(x1)], Y the antiderivative of y:
//   Y(x) = b1(x²/2 − x) + b2(x³/3 − x) + b3·[a1³ − (a1 − min(x, a1))³]/3 + b4·[a2³ − (a2 − min(x, a2))³]/3
// Height of a given diameter: every root of d(h) = d* on [0, H] (sign changes on a grid, refined by Brent; join points
// are grid points); several roots are possible (butt swell) and all are reported.
// kozak02 (stage SV-02/a2): Kozak, A. 2004. My last words on taper equations. The Forestry Chronicle 80: 507–515,
// Model 02 (equation 4) [B]:
//   d = a0·D^a1·H^a2·X^E,  E = b1·z⁴ + b2·(1/e^(D/H)) + b3·X^0.1 + b4·(1/D) + b5·H^Q + b6·X
//   X = [1 − z^(1/3)] / [1 − p^(1/3)], Q = 1 − z^(1/3), z = h/H, p = 1.3/H
//   d inside bark (cm) in the paper, D dbh outside bark (cm), H total height (m), h height above the ground (m).
//   X = 1 at 1.3 m (so d(1.3) = a0·D^a1·H^a2) and X = 0 at the tip (d = 0 when the exponent there is > 0).
//   No closed-form volume: adaptive Gauss–Legendre on d².
// Every form gives y = d²/D² (possibly depending on D and H); volume (π/40000)·D²·H·∫ y dx.
// No bark model here: no sourced bark-model form has been read; outside- and inside-bark profiles are separate sets.
import { registerForm, validateCoef } from '../core/coef.js';
import { brent } from '../core/roots.js';
import { gaussLegendre } from '../core/quad.js';

export const TOOL = { id: 'govde-profili', version: '1.0.0-beta.2' };
const fin = x => typeof x === 'number' && Number.isFinite(x);

/** Registered forms: params in the order of the source; y(p, x, D, H) = d²/D²; Y (antiderivative in x) if closed. */
export const FORMS = {
  mb76: {
    id: 'mb76', params: ['b1', 'b2', 'b3', 'b4', 'a1', 'a2'], joins: p => [p.a1, p.a2],
    source: 'Max ve Burkhart (1976), Model 4',
    formula: { tr: 'd²/D² = b1(x − 1) + b2(x² − 1) + b3(a1 − x)²·I1 + b4(a2 − x)²·I2; x = h/H; I_i = 1 eğer x ≤ a_i',
               en: 'd²/D² = b1(x − 1) + b2(x² − 1) + b3(a1 − x)²·I1 + b4(a2 − x)²·I2; x = h/H; I_i = 1 if x ≤ a_i' },
    y: (p, x) => p.b1 * (x - 1) + p.b2 * (x * x - 1) + (x <= p.a1 ? p.b3 * (p.a1 - x) ** 2 : 0) + (x <= p.a2 ? p.b4 * (p.a2 - x) ** 2 : 0),
    Y: (p, x) => p.b1 * (x * x / 2 - x) + p.b2 * (x ** 3 / 3 - x) + p.b3 * (p.a1 ** 3 - (p.a1 - Math.min(x, p.a1)) ** 3) / 3 + p.b4 * (p.a2 ** 3 - (p.a2 - Math.min(x, p.a2)) ** 3) / 3,
    check: p => [p.a1, p.a2].every(a => fin(a) && a > 0 && a < 1) ? [] : [{ code: 'param.join', a1: p.a1, a2: p.a2 }],
    // minimum of y on [lo, hi] when no join point lies inside: y = c0 + c1·x + c2·x² with the terms active on the piece
    minOn: (p, lo, hi) => {
      let c0 = -p.b1 - p.b2, c1 = p.b1, c2 = p.b2;
      for (const [b, a] of [[p.b3, p.a1], [p.b4, p.a2]]) if (a >= hi) { c0 += b * a * a; c1 -= 2 * b * a; c2 += b; }
      const q = x => c0 + c1 * x + c2 * x * x; let m = Math.min(q(lo), q(hi));
      if (c2 > 0) { const v = -c1 / (2 * c2); if (v > lo && v < hi) m = Math.min(m, q(v)); }
      return m;
    },
  },
  kozak02: {
    id: 'kozak02', params: ['a0', 'a1', 'a2', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6'], joins: () => [],
    source: 'Kozak (2004), Model 02',
    formula: { tr: 'd = a0·D^a1·H^a2·X^(b1·z⁴ + b2/e^(D/H) + b3·X^0.1 + b4/D + b5·H^Q + b6·X); X = [1 − z^(1/3)]/[1 − p^(1/3)], Q = 1 − z^(1/3), z = h/H, p = 1.3/H',
               en: 'd = a0·D^a1·H^a2·X^(b1·z⁴ + b2/e^(D/H) + b3·X^0.1 + b4/D + b5·H^Q + b6·X); X = [1 − z^(1/3)]/[1 − p^(1/3)], Q = 1 − z^(1/3), z = h/H, p = 1.3/H' },
    y: (p, x, D, H) => {
      const X = (1 - Math.cbrt(x)) / (1 - Math.cbrt(1.3 / H)), Q = 1 - Math.cbrt(x);
      const E = p.b1 * x ** 4 + p.b2 / Math.exp(D / H) + p.b3 * X ** 0.1 + p.b4 / D + p.b5 * H ** Q + p.b6 * X;
      const d = p.a0 * D ** p.a1 * H ** p.a2 * X ** E;
      return d * d / (D * D);
    },
    check: () => [],
  },
};
for (const f of Object.values(FORMS)) {
  try {
    registerForm({ id: 'taper.' + f.id, tool: 'taper', params: f.params.map(key => ({ key })), inputs: { D: { unit: 'cm', bark: 'ob' }, H: { unit: 'm' }, h: { unit: 'm' } },
      output: { name: 'd', unit: 'cm' }, formula: f.formula, transform: 'none' });
  } catch (e) { /* already registered (module loaded twice in one page) */ }
}
/** Bark side of a set's output: output.bark, or meta.bark (the coefficient editor stores tool fields in meta). */
export const barkOf = set => (set && set.output && ['ob', 'ib'].includes(set.output.bark) ? set.output.bark : set && set.meta && ['ob', 'ib'].includes(set.meta.bark) ? set.meta.bark : null);
export const formOf = set => (set && typeof set.form === 'string' && set.form.startsWith('taper.') ? FORMS[set.form.slice(6)] : null) || null;

/** Problems of a taper set: the coefficient-library checks, the form's own checks, and the bark side of the output. */
export function checkSet(set) {
  const p = validateCoef(set), f = formOf(set);
  if (set && set.tool !== 'taper') p.push({ code: 'tool', tool: set.tool ?? null });
  if (!f) { if (!p.some(q => q.code === 'form.unknown')) p.push({ code: 'form.unknown', form: set && set.form }); return p; }
  if (!p.some(q => q.code.startsWith('param'))) p.push(...f.check(set.params));
  if (!barkOf(set)) p.push({ code: 'bark.missing' });
  return p;
}
/** Problems of a tree: D > 0 (cm), H > 1.3 (m). */
export function checkTree(D, H) {
  const p = [];
  if (!(fin(D) && D > 0)) p.push({ code: 'tree.D', D: D ?? null });
  if (!(fin(H) && H > 1.3)) p.push({ code: 'tree.H', H: H ?? null });
  return p;
}

/** Relative profile y = d²/D² at relative height x (no checks). */
export const relProfile = (set, x, D, H) => formOf(set).y(set.params, x, D, H);

/**
 * Diameter at height h (cm) for a tree (D cm, H m). Returns { d, status: 'ok' | 'outside' (h < 0 or h > H) |
 * 'negative' (y < 0: the coefficients give no real diameter there) | 'nonfinite' (e.g. 0 to a negative power), y }.
 */
export function diameterAt(set, D, H, h) {
  if (!(fin(h) && h >= 0 && h <= H)) return { d: null, status: 'outside', y: null };
  const y = relProfile(set, h / H, D, H);
  if (Number.isNaN(y) || y === Infinity) return { d: null, status: 'nonfinite', y: null };
  if (!(y >= 0)) return { d: null, status: 'negative', y };
  return { d: D * Math.sqrt(y), status: 'ok', y };
}

/** Sub-intervals of [x1, x2] (between join points) where y < 0 somewhere: exact minimum of each polynomial piece
 * (forms without minOn, such as kozak02, cannot be negative: y is a square). */
function negativeParts(set, x1, x2) {
  const f = formOf(set), p = set.params; if (!f.minOn) return [];
  const cuts = [x1, ...f.joins(p).filter(a => a > x1 && a < x2).sort((a, b) => a - b), x2], bad = [];
  for (let i = 0; i + 1 < cuts.length; i++) if (f.minOn(p, cuts[i], cuts[i + 1]) < -1e-12) bad.push([cuts[i], cuts[i + 1]]);
  return bad;
}
/**
 * ∫ g over [a, b] by adaptive Gauss–Legendre: 10 against 20 nodes per panel; a panel is bisected until the two agree
 * within its share of an absolute error budget (rtol × the first whole-interval estimate × panel width / (b − a)).
 * Near the tip the profile's slope can be infinite (X^0.1 in kozak02); the absolute budget keeps the bisection finite.
 */
function adaptiveGL(g, a, b, rtol = 1e-14) {
  const q = (lo, hi, n) => { const { x, w } = gaussLegendre(n), c = (hi - lo) / 2, m = (lo + hi) / 2; let s = 0; for (let j = 0; j < n; j++) s += w[j] * g(m + c * x[j]); return s * c; };
  const whole = q(a, b, 20); if (!Number.isFinite(whole)) return NaN;
  const budget = rtol * Math.max(Math.abs(whole), 1e-300), stack = [[a, b, 0]]; let sum = 0, panels = 0;
  while (stack.length) {
    const [lo, hi, depth] = stack.pop(), s10 = q(lo, hi, 10), s20 = q(lo, hi, 20); panels++;
    if (!Number.isFinite(s20)) return NaN;
    if (Math.abs(s20 - s10) <= budget * (hi - lo) / (b - a) || depth >= 60 || panels > 20000) { sum += s20; continue; }
    const m = (lo + hi) / 2; stack.push([m, hi, depth + 1], [lo, m, depth + 1]);
  }
  return sum;
}

/**
 * Volume (m³) between heights h1 < h2 (m): closed form when the form has one (mb76), otherwise adaptive Gauss–Legendre
 * on y (kozak02). Returns { V, status: 'ok' | 'outside' | 'order' | 'negative' (y < 0 somewhere in the interval: no
 * volume) | 'nonfinite', method: 'closed' | 'numeric' }.
 */
export function volume(set, D, H, h1, h2) {
  if (!(fin(h1) && fin(h2) && h1 >= 0 && h2 <= H)) return { V: null, status: 'outside' };
  if (!(h2 > h1)) return { V: h2 === h1 ? 0 : null, status: h2 === h1 ? 'ok' : 'order' };
  const x1 = h1 / H, x2 = h2 / H, f = formOf(set);
  if (negativeParts(set, x1, x2).length) return { V: null, status: 'negative' };
  if (f.Y) return { V: Math.PI / 40000 * D * D * H * (f.Y(set.params, x2) - f.Y(set.params, x1)), status: 'ok', method: 'closed' };
  const I = adaptiveGL(x => f.y(set.params, x, D, H), x1, x2);
  return Number.isFinite(I) ? { V: Math.PI / 40000 * D * D * H * I, status: 'ok', method: 'numeric' } : { V: null, status: 'nonfinite', method: 'numeric' };
}
/** Same volume by composite Gauss–Legendre on d(h)², split at the join points (the check of the closed form). */
export function volumeNumeric(set, D, H, h1, h2, nodes = 20) {
  if (!(fin(h1) && fin(h2) && h1 >= 0 && h2 <= H && h2 > h1)) return { V: null, status: 'outside' };
  const f = formOf(set), cuts = [h1, ...f.joins(set.params).map(a => a * H).filter(h => h > h1 && h < h2).sort((a, b) => a - b), h2], { x, w } = gaussLegendre(nodes);
  let s = 0;
  for (let i = 0; i + 1 < cuts.length; i++) { const a = cuts[i], b = cuts[i + 1], c = (b - a) / 2, m = (a + b) / 2; for (let j = 0; j < x.length; j++) s += w[j] * c * D * D * f.y(set.params, (m + c * x[j]) / H, D, H); }
  return { V: Math.PI / 40000 * s, status: 'ok' };
}

/**
 * Heights (m) where the profile has diameter dStar (cm): every root on [0, H]. Grid of k intervals plus the join points;
 * each sign change refined by Brent (xtol 1e-13 m). Returns { heights: [...ascending], status: 'ok' | 'none' |
 * 'multiple' | 'invalid' }. A tangent (double) root that does not change sign can be missed (written in METHODS).
 */
export function heightOf(set, D, H, dStar, k = 2000) {
  if (!(fin(dStar) && dStar >= 0)) return { heights: [], status: 'invalid' };
  const f = formOf(set), g = h => D * D * f.y(set.params, h / H, D, H) - dStar * dStar;
  const grid = [...new Set([...Array.from({ length: k + 1 }, (_, i) => H * i / k), ...f.joins(set.params).map(a => a * H).filter(h => h > 0 && h < H)])].sort((a, b) => a - b);
  const vals = grid.map(g), out = [];
  for (let i = 0; i < grid.length; i++) {
    if (vals[i] === 0) { out.push(grid[i]); continue; }
    if (i + 1 < grid.length && vals[i] * vals[i + 1] < 0) { const r = brent(g, grid[i], grid[i + 1], { xtol: 1e-13 }); if (r.status === 'ok') out.push(r.root); }
  }
  const heights = out.filter((h, i) => i === 0 || h - out[i - 1] > 1e-9);
  return { heights, status: heights.length === 0 ? 'none' : heights.length > 1 ? 'multiple' : 'ok' };
}

/**
 * Consistency of a set for one tree (TOOLS_SPEC §6.1): d at the tip (0 for mb76 by construction; for kozak02 0 when the
 * exponent at the tip is > 0, otherwise reported), d at 1.3 m against D
 * (the difference is reported, not corrected: inside-bark sets are below D by the bark), and whether y < 0 anywhere on
 * the stem (the coefficients then give no diameter there).
 */
export function consistency(set, D, H) {
  const tip = diameterAt(set, D, H, H), at13 = diameterAt(set, D, H, 1.3), neg = negativeParts(set, 0, 1);
  return { dTip: tip.d, d13: at13.d, d13diff: at13.d == null ? null : at13.d - D, d13ratio: at13.d == null ? null : at13.d / D, negative: neg.map(([a, b]) => [a * H, b * H]) };
}

/**
 * One tree with one set: { status: 'ok' | 'invalid', problems, warnings, set: { id, form, bark, source }, D, H, units,
 * consistency, profile(h) → diameterAt, volume(h1, h2), heightOf(d) }. warnings: valid ranges of the set, negative parts.
 */
export function evaluateTree(set, D, H) {
  const problems = [...checkSet(set), ...checkTree(D, H)], warnings = [];
  const head = { schema: 'taper-result/1', tool: `${TOOL.id} ${TOOL.version}`, units: { D: 'cm', H: 'm', h: 'm', d: 'cm', V: 'm3' },
    set: set ? { id: set.id ?? null, form: set.form ?? null, bark: barkOf(set), source: set.source ? set.source.citation ?? null : null } : null, D, H };
  if (problems.length) return { ...head, status: 'invalid', problems, warnings };
  if (set.valid) for (const [key, r] of Object.entries(set.valid)) { const v = key === 'D' ? D : key === 'H' ? H : null; if (v != null && ((fin(r[0]) && v < r[0]) || (fin(r[1]) && v > r[1]))) warnings.push({ code: 'valid.outside', key, value: v, min: r[0], max: r[1] }); }
  const c = consistency(set, D, H);
  if (c.negative.length) warnings.push({ code: 'profile.negative', parts: c.negative });
  if (c.dTip === null) warnings.push({ code: 'tip.nonfinite' });   // e.g. kozak02 with an exponent ≤ 0 at the tip: no diameter there; heights near the tip are not searched
  return { ...head, status: 'ok', problems, warnings, consistency: c,
    profile: h => diameterAt(set, D, H, h), volume: (h1, h2) => volume(set, D, H, h1, h2), heightOf: d => heightOf(set, D, H, d) };
}

/**
 * Volumes of one tree for a page or a table (SV-02 page; merchantable part as in TOOLS_SPEC §6.1, SV-03 basics):
 * total from the cut height (stump, m) to the tip, and, when a top diameter dTop (cm) is given, the height where the
 * profile last falls to dTop (the highest root of d(h) = dTop above the stump) and the volume from the stump to it.
 * Returns { status, stump, total, dTop, hTop, merch, note } with note 'below-at-stump' (d at the cut < dTop: nothing
 * merchantable), 'multiple' (several heights; the highest is used) or null.
 */
export function merchantable(set, D, H, { stump = 0, dTop = null } = {}) {
  if (!(fin(stump) && stump >= 0 && stump < H)) return { status: 'invalid', code: 'stump.bad', stump };
  const tot = volume(set, D, H, stump, H), out = { status: tot.status === 'ok' ? 'ok' : tot.status, stump, total: tot.status === 'ok' ? tot.V : null, dTop: dTop ?? null, hTop: null, merch: null, note: null };
  if (dTop == null) return out;
  if (!(fin(dTop) && dTop > 0)) return { ...out, status: 'invalid', code: 'dtop.bad' };
  const at = diameterAt(set, D, H, stump);
  if (at.status === 'ok' && at.d < dTop) return { ...out, hTop: null, merch: 0, note: 'below-at-stump' };
  const r = heightOf(set, D, H, dTop), above = r.heights.filter(h => h > stump);
  if (!above.length) return { ...out, note: 'none' };
  const hTop = above[above.length - 1], v = volume(set, D, H, stump, hTop);
  return { ...out, hTop, merch: v.status === 'ok' ? v.V : null, note: above.length > 1 ? 'multiple' : null };
}
