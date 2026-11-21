// Bark thickness and under-bark diameter, stage TM-03/a1 (docs/PLATFORM_PLAN.md TM-03). No DOM. Sources (docs/METHODS.md §23):
//   Hamilton 1975 (Forestry Commission Booklet 39), Part V §5 Bark (p. 147), paras 3–4, 8, 11: bark thickness is the
//     peripheral thickness, the average distance between the plane of a girthing tape over bark and that of a tape in
//     the same position under bark (a bark gauge gives about the same); the double bark thickness is subtracted from the
//     over-bark diameter; the bark volume is the average cross-sectional area of bark times the length, or the
//     difference between the over- and under-bark volumes (Part III Procedure 1: the volume of a log from length and mid
//     diameter) [B].
//   Graves 1906, §42 (pp. 77–78): several bark measurements on different sides, each from the wood to the line a
//     caliper arm would touch; inside diameter = outside diameter − bark widths, or outside = inside + bark widths [B].
//   van Laar & Akça 2007, §4.1.6: bark factor k = d_u.b./d_o.b. (Meyer 1942), assumed constant within a stand (a linear
//     relationship between over- and under-bark diameter), its inverse (Zöhrer et al. 1973), estimated by the ratio of
//     means; a linear relationship between bark thickness and dbh; log-transformed bark thickness on log-transformed
//     diameter (Oestlin 1963) [B]. Back-transformation of ln equations: as for biomass (Baskerville, METHODS §22 [A]).
// The site ships no bark coefficients or tables (K1): k and every equation come from the user's sample trees or from a
// source the user enters.
// Units inside: diameters in cm, bark thickness in mm (single = one side; double = both sides), areas in m², volumes in m³.
import { registerForm, correctionFactor, outsideValid, validateCoef } from '../core/coef.js';
import { basalArea, diameterFromGirth } from './diameter.js';

const fin = x => typeof x === 'number' && Number.isFinite(x);

/**
 * Equation forms of the coefficient library (tool 'bark'). D = over-bark diameter at the point (cm). out: 'dub' gives the
 * under-bark diameter (cm); 'B1' single and 'B2' double bark thickness (mm). f(p, D) is on the form's own scale.
 */
export const FORMS = {
  ratio: { params: ['k'], out: 'dub', scale: 'none', formula: { en: 'd_ub = k·D' }, f: (p, D) => p.k * D },
  lin: { params: ['a', 'b'], out: 'dub', scale: 'none', formula: { en: 'd_ub = a + b·D' }, f: (p, D) => p.a + p.b * D },
  'b1.lin': { params: ['a', 'b'], out: 'B1', scale: 'none', formula: { en: 'B (single, mm) = a + b·D' }, f: (p, D) => p.a + p.b * D },
  'b2.lin': { params: ['a', 'b'], out: 'B2', scale: 'none', formula: { en: '2B (double, mm) = a + b·D' }, f: (p, D) => p.a + p.b * D },
  'b1.loglog': { params: ['a', 'b'], out: 'B1', scale: 'log', formula: { en: 'ln B (single, mm) = a + b·ln D' }, f: (p, D) => p.a + p.b * Math.log(D) },
  'b2.loglog': { params: ['a', 'b'], out: 'B2', scale: 'log', formula: { en: 'ln 2B (double, mm) = a + b·ln D' }, f: (p, D) => p.a + p.b * Math.log(D) },
};
for (const [id, f] of Object.entries(FORMS)) {
  try {
    registerForm({ id: 'bark.' + id, tool: 'bark', params: f.params.map(key => ({ key })), inputs: { D: { unit: 'cm', bark: 'ob' } },
      output: f.out === 'dub' ? { name: 'd', unit: 'cm', bark: 'ib' } : { name: f.out === 'B1' ? 'B' : '2B', unit: 'mm' }, formula: f.formula, transform: f.scale });
  } catch (e) { /* already registered (module loaded twice in one page) */ }
}
export const formOf = set => set && typeof set.form === 'string' && set.form.startsWith('bark.') ? FORMS[set.form.slice(5)] || null : null;

/** Under-bark diameter (cm) from the over-bark diameter (cm) and the single bark thickness (mm): d − 2B (Hamilton para 8; Graves). */
export const underBark = (dob, B1) => (fin(dob) && fin(B1) ? dob - 2 * B1 / 10 : null);
/** Over-bark diameter (cm) from the under-bark diameter (cm) and the single bark thickness (mm): d + 2B (Graves §42). */
export const overBark = (dub, B1) => (fin(dub) && fin(B1) ? dub + 2 * B1 / 10 : null);
/** Peripheral (single) bark thickness (mm) from two girths (cm) taken at the same place over and under bark (Hamilton para 3): (c_ob − c_ub)/(2π). */
export const barkFromGirths = (cob, cub) => (fin(cob) && fin(cub) ? (cob - cub) / (2 * Math.PI) * 10 : null);

/**
 * Bark at one point from over- and under-bark diameters (cm): single and double thickness (mm), the two basal areas,
 * the bark area (m²) and its share of the over-bark area (%). With a length L (m), the diameters are taken as the mid
 * diameters of a log and the volumes follow (Hamilton paras 4 and 11): V = g·L, bark volume = V_ob − V_ub.
 */
export function barkAt(dob, dub, L = null) {
  const problems = [];
  if (!(fin(dob) && dob > 0)) problems.push({ code: 'dob.bad' });
  if (!(fin(dub) && dub > 0)) problems.push({ code: 'dub.bad' });
  if (!problems.length && !(dub <= dob)) problems.push({ code: 'dub.gt' });
  if (L != null && !(fin(L) && L > 0)) problems.push({ code: 'len.bad' });
  if (problems.length) return { status: 'invalid', problems };
  const gob = basalArea(dob), gub = basalArea(dub), ga = gob - gub;
  const r = { status: 'ok', dob, dub, B1: (dob - dub) / 2 * 10, B2: (dob - dub) * 10, gob, gub, gBark: ga, pctArea: ga / gob * 100, k: dub / dob, problems };
  if (L != null) Object.assign(r, { L, Vob: gob * L, Vub: gub * L, Vbark: ga * L, pctVol: ga / gob * 100 });
  return r;
}

/**
 * One measured point. input = { mode: 'gauge' | 'girths' | 'inside', dob?, girthOb?, girthUb?, dub?, readings?: [mm], L? }:
 *   gauge  : over-bark diameter (cm) and bark-gauge readings (mm) on several sides, averaged (Graves; Hamilton para 3);
 *   girths : girths over and under bark (cm) at the same place (Hamilton para 3);
 *   inside : under-bark diameter (cm) and bark readings (mm), the over-bark diameter by adding (Graves §42).
 */
export function measurePoint(input) {
  const m = input && input.mode, rd = (input && input.readings) || [];
  const reads = () => {
    const bad = rd.map((x, i) => (fin(x) && x >= 0 ? null : i)).filter(i => i != null);
    if (!rd.length) return { problems: [{ code: 'readings.none' }] };
    if (bad.length) return { problems: [{ code: 'reading.bad', rows: bad.map(i => i + 1) }] };
    return { B1: rd.reduce((s, x) => s + x, 0) / rd.length, problems: [] };
  };
  if (m === 'gauge') { const q = reads(); if (q.problems.length) return { status: 'invalid', problems: q.problems }; const r = barkAt(input.dob, underBark(input.dob, q.B1), input.L ?? null); return r.status === 'ok' ? { ...r, readings: rd.length, mode: m } : r; }
  if (m === 'inside') { const q = reads(); if (q.problems.length) return { status: 'invalid', problems: q.problems }; const r = barkAt(overBark(input.dub, q.B1), input.dub, input.L ?? null); return r.status === 'ok' ? { ...r, readings: rd.length, mode: m } : r; }
  if (m === 'girths') {
    if (!(fin(input.girthOb) && input.girthOb > 0) || !(fin(input.girthUb) && input.girthUb > 0)) return { status: 'invalid', problems: [{ code: 'girth.bad' }] };
    const r = barkAt(diameterFromGirth(input.girthOb), diameterFromGirth(input.girthUb), input.L ?? null); return r.status === 'ok' ? { ...r, mode: m } : r;
  }
  return { status: 'invalid', problems: [{ code: 'mode.bad' }] };
}

/**
 * Bark factor and linear fit from sample trees: pairs [{ dob, dub }] (cm). k = Σd_ub / Σd_ob (ratio of means, van Laar
 * §4.1.6), its inverse; least-squares line d_ub = a + b·d_ob with R² and the residual standard error (n − 2), for n ≥ 3
 * and differing d_ob. Pairs with d_ub > d_ob or non-positive values are reported by row and left out; null entries
 * (empty rows) are passed over and keep the row numbering.
 */
export function fitBark(pairs) {
  const ok = [], bad = [];
  (pairs || []).forEach((p, i) => { if (p == null) return; if (fin(p.dob) && fin(p.dub) && p.dob > 0 && p.dub > 0 && p.dub <= p.dob) ok.push(p); else bad.push(i + 1); });
  const n = ok.length;
  if (!n) return { status: 'empty', n: 0, bad };
  const Sx = ok.reduce((s, p) => s + p.dob, 0), Sy = ok.reduce((s, p) => s + p.dub, 0), k = Sy / Sx;
  const r = { status: 'ok', n, bad, k, kInv: 1 / k, line: null };
  if (n >= 3) {
    const mx = Sx / n, my = Sy / n;
    let sxx = 0, sxy = 0, syy = 0;
    for (const p of ok) { sxx += (p.dob - mx) ** 2; sxy += (p.dob - mx) * (p.dub - my); syy += (p.dub - my) ** 2; }
    if (sxx > 0) {
      const b = sxy / sxx, a = my - b * mx;
      const sse = ok.reduce((s, p) => s + (p.dub - a - b * p.dob) ** 2, 0);
      r.line = { a, b, r2: syy > 0 ? 1 - sse / syy : null, se: Math.sqrt(sse / (n - 2)), min: Math.min(...ok.map(p => p.dob)), max: Math.max(...ok.map(p => p.dob)) };
    }
  }
  return r;
}

/**
 * Under-bark diameter of one tree with a method: { kind: 'k', k } (a bark factor), { kind: 'line', a, b, min?, max? } (a
 * line d_ub = a + b·D fitted to sample trees; outside min–max of the sample a warning) or { kind: 'set', set } (a
 * model-coef/1 set of tool 'bark'). D = over-bark diameter (cm). → { status, dub, B1, warnings, problems, cf }.
 * Statuses: invalid = bad method or input, or a result outside 0 < d_ub ≤ D (reported, never clipped).
 */
export function applyBark(method, D) {
  const problems = [], warnings = [];
  if (!(fin(D) && D > 0)) return { status: 'invalid', problems: [{ code: 'dob.bad' }], warnings };
  let dub = null, cf = null;
  if (method && method.kind === 'k') {
    if (!(fin(method.k) && method.k > 0 && method.k <= 1)) return { status: 'invalid', problems: [{ code: 'k.bad' }], warnings };
    dub = method.k * D;
  } else if (method && method.kind === 'line') {
    if (!(fin(method.a) && fin(method.b))) return { status: 'invalid', problems: [{ code: 'line.bad' }], warnings };
    dub = method.a + method.b * D;
    if (fin(method.min) && fin(method.max) && (D < method.min || D > method.max)) warnings.push({ code: 'outside', key: 'D', value: D, min: method.min, max: method.max });
  } else if (method && method.kind === 'set') {
    const s = method.set, f = formOf(s);
    if (!f || s.tool !== 'bark') return { status: 'invalid', problems: [{ code: 'set.form' }], warnings };
    const pr = validateCoef(s); if (pr.length) return { status: 'invalid', problems: [{ code: 'set.bad', list: pr }], warnings };
    for (const o of outsideValid(s, { D })) warnings.push({ code: 'outside', ...o });
    let y = f.f(s.params, D);
    if (f.scale === 'log') { cf = correctionFactor(s); y = Math.exp(y) * cf; }
    if (f.out === 'dub') dub = y;
    else { const B1 = f.out === 'B1' ? y : y / 2; if (!(fin(B1) && B1 >= 0)) return { status: 'invalid', problems: [{ code: 'bark.neg', value: B1 }], warnings }; dub = underBark(D, B1); }
  } else return { status: 'invalid', problems: [{ code: 'method.bad' }], warnings };
  if (!(fin(dub) && dub > 0 && dub <= D)) return { status: 'invalid', problems: [{ code: 'dub.range', value: fin(dub) ? dub : null }], warnings };
  return { status: 'ok', dob: D, dub, B1: (D - dub) / 2 * 10, cf, warnings, problems };
}

/**
 * A tree list: trees [{ d (cm, over bark), n?, row? }] → per tree applyBark and the totals of the trees computed:
 * N, G over and under bark (m²), bark area and its share (%), the trees left out by row.
 */
export function barkList(method, trees) {
  const rows = [], skipped = [];
  let N = 0, Gob = 0, Gub = 0;
  for (const t of trees || []) {
    const r = applyBark(method, t.d), n = t.n ?? 1;
    rows.push({ row: t.row ?? null, n, ...r });
    if (r.status !== 'ok') { skipped.push(t.row ?? null); continue; }
    N += n; Gob += n * basalArea(r.dob); Gub += n * basalArea(r.dub);
  }
  return { rows, skipped, N, Gob, Gub, Gbark: Gob - Gub, pct: Gob > 0 ? (Gob - Gub) / Gob * 100 : null };
}
