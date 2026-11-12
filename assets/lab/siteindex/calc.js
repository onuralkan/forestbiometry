// Site Index: pure logic (no DOM). Specification: docs/TOOLS_SPEC.md §3 (stage SI01); formulas METHODS §15.
// Dynamic (algebraic difference, ADA) site equations H2 = f(A2, A1, H1): one parameter of the base model is site
// specific and is eliminated, so the equation passes through the observed (A1, H1) and is base-age invariant.
// Site index SI = f(A0, A, H): dominant height at the base age A0. Ages in years, heights in m.
// Equations checked against Hernández-Cuevas et al. (2018, Agrociencia 52: 437–453, Cuadro 3) [B]; METHODS §15.
// The site ships NO coefficients (TOOLS_SPEC K1): the user enters them with their source, or fits them (SI03).
import { registerForm } from '../core/coef.js';

export const TOOL = { id: 'bonitet', version: '1.0.0-beta.1' };
export const AGE_TYPES = ['total', 'bh'];                         // total age, breast-height age (K8: never converted)

/** ln(1 − e^(−x)) for x > 0 without cancellation (log(−expm1(−x)) below ln 2, log1p(−e^(−x)) above). */
export const lnOneMinusExp = x => x < Math.LN2 ? Math.log(-Math.expm1(-x)) : Math.log1p(-Math.exp(-x));
const fin = x => typeof x === 'number' && Number.isFinite(x);

/**
 * Forms. params: global parameters the user gives; site: the site-specific parameter of the base model (eliminated).
 *   project(p, A2, A1, H1) → H2;  siteParam(p, A, H) → value of the site parameter through (A, H);  base(p, s, A) → H.
 *   check(p) → [problem] for the global parameters;  domain(p, A, H) → [problem] for one (A, H).
 */
export const FORMS = {
  'cr.ada.b0': {
    id: 'cr.ada.b0', kind: 'anamorphic', params: ['b1', 'b2'], site: 'b0',
    formula: { tr: 'H₂ = H₁·[(1 − e^(−b₁A₂))/(1 − e^(−b₁A₁))]^b₂  (Chapman–Richards, b₀ yere özgü)', en: 'H₂ = H₁·[(1 − e^(−b₁A₂))/(1 − e^(−b₁A₁))]^b₂  (Chapman–Richards, b₀ site-specific)' },
    base: (p, b0, A) => b0 * Math.exp(p.b2 * lnOneMinusExp(p.b1 * A)),
    siteParam: (p, A, H) => H * Math.exp(-p.b2 * lnOneMinusExp(p.b1 * A)),
    project: (p, A2, A1, H1) => H1 * Math.exp(p.b2 * (lnOneMinusExp(p.b1 * A2) - lnOneMinusExp(p.b1 * A1))),
    check: p => [...(p.b1 > 0 ? [] : [{ code: 'par.b1pos', value: p.b1 }]), ...(p.b2 > 0 ? [] : [{ code: 'par.b2pos', value: p.b2 }])],
    domain: () => [],
  },
  'cr.ada.b2': {
    id: 'cr.ada.b2', kind: 'polymorphic', params: ['b0', 'b1'], site: 'b2',
    formula: { tr: 'H₂ = b₀·(H₁/b₀)^[ln(1 − e^(−b₁A₂))/ln(1 − e^(−b₁A₁))]  (Chapman–Richards, b₂ yere özgü)', en: 'H₂ = b₀·(H₁/b₀)^[ln(1 − e^(−b₁A₂))/ln(1 − e^(−b₁A₁))]  (Chapman–Richards, b₂ site-specific)' },
    base: (p, b2, A) => p.b0 * Math.exp(b2 * lnOneMinusExp(p.b1 * A)),
    siteParam: (p, A, H) => Math.log(H / p.b0) / lnOneMinusExp(p.b1 * A),
    project: (p, A2, A1, H1) => p.b0 * Math.exp(Math.log(H1 / p.b0) * lnOneMinusExp(p.b1 * A2) / lnOneMinusExp(p.b1 * A1)),
    check: p => [...(p.b0 > 0 ? [] : [{ code: 'par.b0pos', value: p.b0 }]), ...(p.b1 > 0 ? [] : [{ code: 'par.b1pos', value: p.b1 }])],
    // every curve has the asymptote b0: a height at or above it has no curve through it
    domain: (p, A, H) => H < p.b0 ? [] : [{ code: 'h.aboveasym', h: H, b0: p.b0 }],
  },
  'schu.ada': {
    id: 'schu.ada', kind: 'anamorphic', params: ['b1'], site: 'b0',
    formula: { tr: 'ln H₂ = ln H₁ + b₁(1/A₂ − 1/A₁)  (Schumacher ln H = b₀ + b₁/A, b₀ yere özgü; büyüme için b₁ < 0)', en: 'ln H₂ = ln H₁ + b₁(1/A₂ − 1/A₁)  (Schumacher ln H = b₀ + b₁/A, b₀ site-specific; growth needs b₁ < 0)' },
    base: (p, b0, A) => Math.exp(b0 + p.b1 / A),
    siteParam: (p, A, H) => Math.log(H) - p.b1 / A,
    project: (p, A2, A1, H1) => H1 * Math.exp(p.b1 * (1 / A2 - 1 / A1)),
    // ln H = b0 + b1/A grows with A only for b1 < 0; sources that write H = b0·exp(−b1/A) with b1 > 0 need −b1 here
    check: p => p.b1 < 0 ? [] : [{ code: 'par.b1neg', value: p.b1 }],
    domain: () => [],
  },
};
export const FORM_IDS = Object.keys(FORMS);

/** Problems with the form, the global parameters and the settings (base age, age type). */
export function checkModel(m) {
  const f = FORMS[m && m.form], out = [];
  if (!f) return [{ code: 'form.unknown', form: m && m.form }];
  for (const k of f.params) if (!fin(m.params && m.params[k])) out.push({ code: 'par.missing', key: k });
  if (!out.length) out.push(...f.check(m.params));
  if (m.baseAge != null && !(fin(m.baseAge) && m.baseAge > 0)) out.push({ code: 'a0.bad', value: m.baseAge });
  if (m.ageType != null && !AGE_TYPES.includes(m.ageType)) out.push({ code: 'agetype.bad', value: m.ageType });
  return out;
}
const pointProblems = (f, p, A, H, tag) => {
  const out = [];
  if (!(fin(A) && A > 0)) out.push({ code: 'a.bad', value: A ?? null, at: tag });
  if (!(fin(H) && H > 0)) out.push({ code: 'h.bad', value: H ?? null, at: tag });
  if (!out.length) out.push(...f.domain(p, A, H).map(q => ({ ...q, at: tag })));
  return out;
};
/**
 * Projection H2 from (A1, H1) to A2. m = { form, params, ageType?, baseAge? }. Returns { status: 'ok', value } or
 * { status: 'invalid', problems } — never a number when an input or the result is outside the model's domain.
 */
export function project(m, A2, A1, H1) {
  const f = FORMS[m && m.form], pr = checkModel(m);
  if (pr.length) return { status: 'invalid', problems: pr };
  const q = [...pointProblems(f, m.params, A1, H1, 'start'), ...(fin(A2) && A2 > 0 ? [] : [{ code: 'a.bad', value: A2 ?? null, at: 'target' }])];
  if (q.length) return { status: 'invalid', problems: q };
  const v = f.project(m.params, A2, A1, H1);
  return fin(v) && v > 0 ? { status: 'ok', value: v } : { status: 'invalid', problems: [{ code: 'result.bad', value: v }] };
}
/** Site index: the dominant height at the base age m.baseAge through (A, H). Settings are carried into the result. */
export function siteIndex(m, A, H) {
  const settings = { form: m ? m.form : null, baseAge: m ? m.baseAge : null, ageType: m && m.ageType != null ? m.ageType : null };
  if (!(fin(m && m.baseAge) && m.baseAge > 0)) return { status: 'invalid', problems: [{ code: 'a0.bad', value: m && m.baseAge }], settings };
  return { ...project(m, m.baseAge, A, H), settings, input: { A, H } };
}
/** The curve of one site index: H at each age of `ages` (projection from (A0, SI)). Invalid ages give null, never a number. */
export function curve(m, SI, ages) {
  return ages.map(a => { const r = project(m, a, m.baseAge, SI); return [a, r.status === 'ok' ? r.value : null]; });
}
/** Value of the eliminated site parameter through (A, H) (for display and for the independent check). */
export function siteParameter(m, A, H) {
  const f = FORMS[m.form], pr = [...checkModel(m), ...pointProblems(f, m.params, A, H, 'start')];
  return pr.length ? { status: 'invalid', problems: pr } : { status: 'ok', name: f.site, value: f.siteParam(m.params, A, H) };
}

/* registry of the coefficient library (core/coef.js, model-coef/1): the forms a user can enter coefficients for */
for (const f of Object.values(FORMS)) {
  try {
    registerForm({ id: 'si.' + f.id, tool: 'siteindex', params: f.params.map(key => ({ key })), inputs: { A: { unit: 'yr' }, H: { unit: 'm' } }, output: { name: 'H', unit: 'm' }, formula: f.formula, transform: 'none' });
  } catch (e) { /* already registered (module loaded twice in one page) */ }
}

/* ---------------- SI02: site classes (user-defined, TOOLS_SPEC §3.4) and evaluation of many points ---------------- */
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
/**
 * Classes from the user's definition (the site embeds no yield table): def = { mode: 'none' | 'equal' | 'breaks',
 * start, width, n (equal), breaks: [b0 < b1 < … ] (breaks), order: 'desc' (I = highest SI, default) | 'asc' }.
 * Classes are half-open [lo, hi); the last one includes its upper bound. Returns { classes: [{ lo, hi, name }], problems }.
 */
export function classesOf(def = {}) {
  if (!def.mode || def.mode === 'none') return { classes: [], problems: [] };
  let b;
  if (def.mode === 'equal') {
    const { start, width, n } = def;
    if (!(fin(start) && start >= 0 && fin(width) && width > 0 && Number.isInteger(n) && n >= 1 && n <= ROMAN.length)) return { classes: [], problems: [{ code: 'cls.equal' }] };
    b = Array.from({ length: n + 1 }, (_, i) => start + i * width);
  } else if (def.mode === 'breaks') {
    b = (def.breaks || []).map(Number);
    if (b.length < 2 || b.length - 1 > ROMAN.length || b.some(x => !fin(x) || x < 0)) return { classes: [], problems: [{ code: 'cls.breaks' }] };
    for (let i = 1; i < b.length; i++) if (!(b[i] > b[i - 1])) return { classes: [], problems: [{ code: 'cls.order', at: i }] };
  } else return { classes: [], problems: [{ code: 'cls.mode', mode: def.mode }] };
  const k = b.length - 1, desc = def.order !== 'asc';
  return { classes: Array.from({ length: k }, (_, i) => ({ lo: b[i], hi: b[i + 1], name: ROMAN[desc ? k - 1 - i : i] })), problems: [] };
}
/** Class name of a site index, or null when it lies outside every class (never forced into the nearest one). */
export function classify(si, classes) {
  if (!fin(si) || !classes.length) return null;
  for (let i = 0; i < classes.length; i++) { const c = classes[i], last = i === classes.length - 1; if (si >= c.lo && (si < c.hi || (last && si === c.hi))) return c.name; }
  return null;
}
/**
 * Site index of many points. rows: [{ key, plot, period, A, H, Hsource? }]. m: { form, params, baseAge, ageType }.
 * valid: { A: [min, max], H: [min, max] } of the coefficient set (null = not given). Points outside are computed and
 * warned ('valid.A', 'valid.H'), as TOOLS_SPEC §1.1 asks.
 */
export function evaluate(m, rows, { valid = null, classes = [] } = {}) {
  return rows.map(r => {
    const s = siteIndex(m, r.A, r.H), warnings = [];
    if (valid) for (const k of ['A', 'H']) { const v = r[k], lim = valid[k]; if (lim && fin(v) && ((fin(lim[0]) && v < lim[0]) || (fin(lim[1]) && v > lim[1]))) warnings.push({ code: 'valid.' + k, value: v, min: lim[0], max: lim[1] }); }
    return { ...r, status: s.status, si: s.status === 'ok' ? s.value : null, cls: s.status === 'ok' ? classify(s.value, classes) : null, problems: s.problems || [], warnings, settings: s.settings };
  });
}
/** Model for the calculator from a stored coefficient set (model-coef/1, tool 'siteindex'; form id 'si.<form>'). */
export function modelFromSet(set, baseAge) {
  return { form: String(set.form).replace(/^si\./, ''), params: set.params, ageType: set.meta && set.meta.ageType || null, baseAge };
}
