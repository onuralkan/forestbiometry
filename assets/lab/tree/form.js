// Form factors, form exponent and form quotient, stage TM-06/a1 (docs/PLATFORM_PLAN.md TM-06). No DOM.
// Source: Graves 1906, Chapter XIII (docs/METHODS.md §23) [B]:
//   §91 form factor F = V/(B·H): breast-height (B at breast height), absolute (B at the base; or, §95, the stem above
//     breast height against a cylinder of the breast-height area and the height above breast height), normal (§96,
//     Pressler: B at a fixed proportion of the height, generally 1/20); merchantable, stem or tree form factor by the
//     volume used. §92 V = B·H·F. §98 form height = F·H.
//   §97 form exponent: y² = p·xʳ (x from the tip, y the radius or diameter); from two diameters y₁, y₂ at distances
//     x₁, x₂ from the tip, r = 2·(log y₁ − log y₂)/(log x₁ − log x₂); r = 0 cylinder, 1 (Apollonian) paraboloid,
//     2 cone, 3 Neilian paraboloid. V = 1/(r + 1)·(π/4)·D²·H with D at the base, so the absolute form factor is
//     1/(r + 1); with the breast-height diameter D₂: V = 1/(r + 1)·(π/4)·D₂²·(H/(H − bh))ʳ·H (Graves writes 4½ ft for bh).
//     The book's worked example (18 and 15 in at 61 and 45 ft) prints log 1.25 = 0.086910 instead of 0.096910 and gets
//     r = 1.35; the formula gives r = 1.199 (tests/tree/test_tm02_06.mjs).
//   §100 form quotient q = d/D, d at the middle of the stem, D at breast height; F = q − c with a species constant c
//     that the user gives (Graves quotes values for some European species: not shipped, TOOLS_SPEC K1).
// Not applied: the approximate methods of §99 (Philipp, Strzelecki, Nossek, Schaal) and Pressler's §83 (its printed
// formula is not legible in the copy read).

import { basalArea } from './diameter.js';
const fin = x => typeof x === 'number' && Number.isFinite(x);
export const BH = 1.3;   // breast height (m), Hamilton §2

/**
 * Form factor F = V/(B·H) with B from a diameter d (cm) at the chosen reference, H (m), V (m³).
 * kind: 'breast' (d at breast height, H the total height), 'absolute' (d at the base), 'absolute-above-bh' (V of the
 * stem above breast height, d at breast height, H − bh used), 'normal' (d at H/20). Returns { status, F, formHeight, B, Href }.
 */
export function formFactor({ V, d, H, kind = 'breast', bh = BH }) {
  const p = [];
  if (!(fin(V) && V > 0)) p.push({ code: 'volume.bad' });
  if (!(fin(d) && d > 0)) p.push({ code: 'diameter.bad' });
  if (!(fin(H) && H > 0)) p.push({ code: 'height.bad' });
  if (!['breast', 'absolute', 'absolute-above-bh', 'normal'].includes(kind)) p.push({ code: 'kind.bad' });
  if ((kind === 'breast' || kind === 'absolute-above-bh') && fin(H) && !(H > bh)) p.push({ code: 'height.below-bh' });
  if (p.length) return { status: 'invalid', problems: p };
  const B = basalArea(d), Href = kind === 'absolute-above-bh' ? H - bh : H, F = V / (B * Href);
  return { status: 'ok', kind, F, B, Href, formHeight: F * H, problems: [], warnings: F > 1 ? [{ code: 'factor.above-one' }] : [] };
}
/** Volume from basal area, height and form factor: V = B·H·F (Graves §92); d in cm. */
export const volumeFromFormFactor = (d, H, F) => (fin(d) && fin(H) && fin(F) && d > 0 && H > 0 && F > 0 ? basalArea(d) * H * F : null);

/** Form exponent r from two diameters (any unit, same for both) at distances x1 > x2 from the tip (Graves §97). */
export function formExponent({ d1, x1, d2, x2 }) {
  if (![d1, x1, d2, x2].every(v => fin(v) && v > 0) || !(x1 > x2)) return { status: 'invalid', problems: [{ code: 'exponent.input' }] };
  const r = 2 * (Math.log(d1) - Math.log(d2)) / (Math.log(x1) - Math.log(x2));
  return { status: 'ok', r, absoluteF: 1 / (r + 1), body: bodyOf(r), problems: [] };
}
/** The solid an exponent describes (Graves §97), or null when it is not one of them. */
export function bodyOf(r, tol = 0.05) {
  const named = [[0, 'cylinder'], [1, 'paraboloid'], [2, 'cone'], [3, 'neiloid']];
  const hit = named.find(([v]) => Math.abs(r - v) <= tol);
  return hit ? hit[1] : null;
}
/** Breast-height form factor of a body of form exponent r and height H: (1/(r + 1))·(H/(H − bh))ʳ (Graves §97). */
export function breastFormFactorFromExponent(r, H, bh = BH) {
  if (!(fin(r) && r > -1 && fin(H) && H > bh)) return null;
  return Math.pow(H / (H - bh), r) / (r + 1);
}

/** Form quotient q = d/D (d at the middle of the stem, D at breast height) and, with a species constant c, F = q − c (Graves §100). */
export function formQuotient({ dMid, D, c = null }) {
  if (!(fin(dMid) && dMid > 0 && fin(D) && D > 0)) return { status: 'invalid', problems: [{ code: 'quotient.input' }] };
  const q = dMid / D;
  return { status: 'ok', q, F: fin(c) ? q - c : null, c: fin(c) ? c : null, problems: [], warnings: q > 1 ? [{ code: 'quotient.above-one' }] : [] };
}
