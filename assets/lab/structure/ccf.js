// Crown competition factor (CCF), part of SS-02 (docs/PLATFORM_PLAN.md). No DOM. Sources (docs/METHODS.md §16, CCF):
//   Kershaw, Ducey, Beers & Husch 2016, §8.9.4 (pp. 264–265), after Krajicek, Brinkman & Gingrich (1961): crown width
//     and dbh of truly open-grown trees; CW = b0 + b1·d by least squares; maximum crown area of a tree as a per cent of
//     the unit area A, MCA = 100·(π·CW²/4)/A (eq. 8.26; SI: 0.0078·CW²); CCF = Σ nᵢ·MCAᵢ with nᵢ the trees per unit area
//     (eq. 8.27); CCF = 100 when the crowns of open-grown size would just cover the ground; it is not a measure of crown
//     closure [B].
//   van Laar & Akça 2007, pp. 156–157, after Krajicek et al.: MCA = b0 + b1·d + b2·d² (m²), CCF = Σ MCA / 10000 per
//     hectare, i.e. as a fraction (Kershaw's per cent / 100) [B].
// The tool reports CCF in per cent (Kershaw, Krajicek) and, as a fraction, CCF/100 (van Laar). No coefficients are
// built in (K1): a set of the coefficient library (tool 'ccf') or a line fitted here to the user's open-grown trees.
// Units: d in cm (over bark), CW in m, MCA in m² of ground, A = 10 000 m² (one hectare).
import { registerForm, validateCoef, outsideValid } from '../core/coef.js';

const fin = x => typeof x === 'number' && Number.isFinite(x);
export const HA = 10000;

/** Forms of the library: crown width of an open-grown tree (Kershaw eq. 8.26 route) or its crown area directly (van Laar). */
export const FORMS = {
  cw: { params: ['b0', 'b1'], out: 'CW', formula: { en: 'CW (m) = b0 + b1·d' }, f: (p, d) => p.b0 + p.b1 * d },
  mca: { params: ['b0', 'b1', 'b2'], out: 'MCA', formula: { en: 'MCA (m²) = b0 + b1·d + b2·d²' }, f: (p, d) => p.b0 + p.b1 * d + p.b2 * d * d },
};
for (const [id, f] of Object.entries(FORMS)) {
  try {
    registerForm({ id: 'ccf.' + id, tool: 'ccf', params: f.params.map(key => ({ key })), inputs: { D: { unit: 'cm', bark: 'ob' } },
      output: f.out === 'CW' ? { name: 'CW', unit: 'm' } : { name: 'MCA', unit: 'm2' }, formula: f.formula, transform: 'none' });
  } catch (e) { /* already registered */ }
}
export const formOf = set => set && typeof set.form === 'string' && set.form.startsWith('ccf.') ? FORMS[set.form.slice(4)] || null : null;

/**
 * Maximum crown area (m² of ground) of an open-grown tree of diameter d (cm) with a set: π·CW²/4 for the crown-width
 * form, the quadratic directly for the area form. → { status, mca, cw?, warnings, problems }. A non-positive crown
 * width or area is refused (never clipped).
 */
export function mcaOf(set, d) {
  const f = formOf(set), warnings = [];
  if (!f || set.tool !== 'ccf') return { status: 'invalid', problems: [{ code: 'ccf.set.form' }], warnings };
  const pr = validateCoef(set); if (pr.length) return { status: 'invalid', problems: [{ code: 'ccf.set.bad', list: pr }], warnings };
  if (!(fin(d) && d > 0)) return { status: 'invalid', problems: [{ code: 'ccf.d.bad' }], warnings };
  for (const o of outsideValid(set, { D: d })) warnings.push({ code: 'ccf.outside', ...o });
  const y = f.f(set.params, d);
  if (f.out === 'CW') { if (!(fin(y) && y > 0)) return { status: 'invalid', problems: [{ code: 'ccf.cw.neg', value: y }], warnings }; return { status: 'ok', cw: y, mca: Math.PI * y * y / 4, warnings, problems: [] }; }
  if (!(fin(y) && y > 0)) return { status: 'invalid', problems: [{ code: 'ccf.mca.neg', value: y }], warnings };
  return { status: 'ok', mca: y, warnings, problems: [] };
}
/** Per cent of a hectare: MCA% = 100·MCA/A (Kershaw eq. 8.26 with A = 10 000 m²). */
export const mcaPct = mcaM2 => 100 * mcaM2 / HA;

/**
 * Set of a tree: method = { bySpecies: { <species>: set }, all: set | null }; the species' own set first, then the one
 * for all species. null when neither applies.
 */
export const setFor = (method, species) => (method && method.bySpecies && species != null && method.bySpecies[species]) || (method && method.all) || null;

/**
 * CCF of one plot × period: trees [{ dbh, species, row }], w = trees per hectare each tree represents (the plot's
 * expansion factor). CCF = Σ wᵢ·MCA%ᵢ (Kershaw eq. 8.27). If any tree has no set or no valid MCA, CCF is not given
 * (status 'incomplete', the trees and the species named): a partial sum would understate the density.
 * → { status: 'ok'|'incomplete'|'off', ccf (%), fraction (= ccf/100, van Laar), trees: [{ row, mca, mcaPct }],
 *     missing: [species], bad: [rows], outside: count }.
 */
export function ccfUnit(trees, w, method) {
  if (!method || (!method.all && !Object.keys(method.bySpecies || {}).length)) return { status: 'off' };
  if (!(trees || []).length) return { status: 'ok', ccf: 0, fraction: 0, trees: [], missing: [], bad: [], outside: 0 };   // measured, no trees: N = 0, CCF = 0
  const out = [], missing = new Set(), bad = []; let sum = 0, outside = 0;
  for (const t of trees) {
    const s = setFor(method, t.species ?? null);
    if (!s) { missing.add(t.species ?? null); out.push({ row: t.row ?? null, mca: null, mcaPct: null }); continue; }
    const r = mcaOf(s, t.dbh);
    if (r.status !== 'ok') { bad.push({ row: t.row ?? null, code: r.problems[0].code }); out.push({ row: t.row ?? null, mca: null, mcaPct: null }); continue; }
    if (r.warnings.length) outside++;
    const p = mcaPct(r.mca); sum += w * p; out.push({ row: t.row ?? null, mca: r.mca, mcaPct: p, set: s.id });
  }
  const complete = !missing.size && !bad.length;
  return { status: complete ? 'ok' : 'incomplete', ccf: complete ? sum : null, fraction: complete ? sum / 100 : null, trees: out, missing: [...missing], bad, outside };
}

/**
 * Line CW = b0 + b1·d by least squares from open-grown trees [{ d (cm), cw (m) }] (Kershaw step 2). n ≥ 3 and differing
 * diameters; rows with non-positive values reported by number and left out. → { status, n, b0, b1, r2, se, min, max, bad }.
 */
export function fitCW(pairs) {
  const ok = [], bad = [];
  (pairs || []).forEach((p, i) => { if (p == null) return; if (fin(p.d) && fin(p.cw) && p.d > 0 && p.cw > 0) ok.push(p); else bad.push(i + 1); });
  const n = ok.length;
  if (n < 3) return { status: 'few', n, bad };
  const mx = ok.reduce((s, p) => s + p.d, 0) / n, my = ok.reduce((s, p) => s + p.cw, 0) / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (const p of ok) { sxx += (p.d - mx) ** 2; sxy += (p.d - mx) * (p.cw - my); syy += (p.cw - my) ** 2; }
  if (!(sxx > 0)) return { status: 'flat', n, bad };
  const b1 = sxy / sxx, b0 = my - b1 * mx, sse = ok.reduce((s, p) => s + (p.cw - b0 - b1 * p.d) ** 2, 0);
  return { status: 'ok', n, b0, b1, r2: syy > 0 ? 1 - sse / syy : null, se: Math.sqrt(sse / (n - 2)), min: Math.min(...ok.map(p => p.d)), max: Math.max(...ok.map(p => p.d)), bad };
}
