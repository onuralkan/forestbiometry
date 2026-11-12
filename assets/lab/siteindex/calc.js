// Site Index: pure logic (no DOM). Specification: docs/TOOLS_SPEC.md §3 (stage SI01); formulas METHODS §15.
// Dynamic (algebraic difference, ADA) site equations H2 = f(A2, A1, H1): one parameter of the base model is site
// specific and is eliminated, so the equation passes through the observed (A1, H1) and is base-age invariant.
// Site index SI = f(A0, A, H): dominant height at the base age A0. Ages in years, heights in m.
// Equations checked against Hernández-Cuevas et al. (2018, Agrociencia 52: 437–453, Cuadro 3) [B]; METHODS §15.
// The site ships NO coefficients (TOOLS_SPEC K1): the user enters them with their source, or fits them (SI03).
import { registerForm } from '../core/coef.js';
import { levenbergMarquardt, covariance } from '../core/nls.js';

export const TOOL = { id: 'bonitet', version: '1.0.0-beta.2' };
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

/* ---------------- SI03: fitting a difference equation to the user's own height–age series ---------------- */
// Series: stem analysis (one tree, many ages) or repeated measurements of a plot's top height. The equation is fitted to
// PAIRS of observations of the same series, H2 = f(A2, A1, H1); how the pairs are formed is a setting and changes the fit:
//   'consecutive'  (1→2, 2→3, …)      'first'  (1→2, 1→3, …: from the first observation)      'all'  (every i < j)
// Pairs are forward in age only. Observations of one series are not independent, so standard errors from the usual
// σ̂²(JᵀJ)⁻¹ are labelled "assuming independent observations" (SI04 gives a series-level bootstrap).

export const PAIRINGS = ['consecutive', 'first', 'all'];
/** series: [{ id, points: [{ A, H, row? }] }] (any order); returns pairs [{ id, A1, H1, A2, H2 }] and counts. */
export function makePairs(series, mode = 'consecutive') {
  const pairs = [];
  for (const s of series) {
    const p = [...s.points].sort((a, b) => a.A - b.A);
    for (let i = 0; i < p.length; i++) for (let j = i + 1; j < p.length; j++) {
      if (mode === 'consecutive' && j !== i + 1) continue;
      if (mode === 'first' && i !== 0) continue;
      if (!(p[j].A > p[i].A)) continue;                                  // equal ages give no information on growth
      pairs.push({ id: s.id, A1: p[i].A, H1: p[i].H, A2: p[j].A, H2: p[j].H });
    }
  }
  return pairs;
}
const dL = (b1, A) => A / Math.expm1(b1 * A);                            // d/db1 of ln(1 − e^(−b1·A))
/** Analytic gradients of H2 with respect to the global parameters (in FORMS[id].params order). */
export const GRAD = {
  'cr.ada.b0': ([b1, b2], x) => { const L1 = lnOneMinusExp(b1 * x.A1), L2 = lnOneMinusExp(b1 * x.A2), H2 = x.H1 * Math.exp(b2 * (L2 - L1)); return [H2 * b2 * (dL(b1, x.A2) - dL(b1, x.A1)), H2 * (L2 - L1)]; },
  'cr.ada.b2': ([b0, b1], x) => { const L1 = lnOneMinusExp(b1 * x.A1), L2 = lnOneMinusExp(b1 * x.A2), r = L2 / L1, q = Math.log(x.H1 / b0), e = Math.exp(q * r);
    return [e * (1 - r), b0 * e * q * (dL(b1, x.A2) * L1 - L2 * dL(b1, x.A1)) / (L1 * L1)]; },
  'schu.ada': ([b1], x) => { const k = 1 / x.A2 - 1 / x.A1; return [x.H1 * Math.exp(b1 * k) * k]; },
};
/** Start values: a small grid over plausible values (a tool rule), the one with the least squared error is used. */
export function startGrid(id, pairs) {
  const hmax = Math.max(...pairs.map(p => Math.max(p.H1, p.H2)));
  const g = { 'cr.ada.b0': [[0.005, 0.01, 0.02, 0.03, 0.05, 0.08], [0.8, 1.0, 1.3, 1.6, 2.0, 2.5]], 'cr.ada.b2': [[1.1, 1.25, 1.5, 2, 3].map(k => k * hmax), [0.005, 0.01, 0.02, 0.03, 0.05, 0.08]], 'schu.ada': [[-5, -10, -20, -30, -45, -60, -90]] }[id];
  const combos = g.length === 1 ? g[0].map(a => [a]) : g[0].flatMap(a => g[1].map(b => [a, b]));
  let best = null;
  for (const th of combos) { const s = sse(id, th, pairs); if (Number.isFinite(s) && (!best || s < best.sse)) best = { theta: th, sse: s }; }
  return best ? best.theta : null;
}
function predictTheta(id, theta, x) { const f = FORMS[id], p = Object.fromEntries(f.params.map((k, i) => [k, theta[i]])); return f.project(p, x.A2, x.A1, x.H1); }
function sse(id, theta, pairs) { let s = 0; for (const x of pairs) { const v = predictTheta(id, theta, x); if (!fin(v)) return Infinity; s += (x.H2 - v) ** 2; } return s; }
/**
 * Fits a form to pairs by Levenberg–Marquardt (core/nls.js). start: [θ] or null (grid). Returns { status, params, se,
 * seNote, start, startFrom, iter, reason, n, nSeries, rmse, bias, sigma, residuals: [{ id, A1, A2, H2, pred, e }] }.
 * e = predicted − observed (Model Evaluation definitions: bias = mean e, RMSE = √(Σe²/n)). A converged fit whose
 * parameters break the form's rules (e.g. b1 ≤ 0) is reported as 'invalid', never as a usable set.
 */
export function fitPairs(id, pairs, { start = null, nSeries = null } = {}) {
  const f = FORMS[id], p = f ? f.params.length : 0, base = { form: id, n: pairs.length, nSeries };
  if (!f) return { ...base, status: 'invalid', problems: [{ code: 'form.unknown' }] };
  if (pairs.length <= p) return { ...base, status: 'invalid', problems: [{ code: 'fit.few', n: pairs.length, p }] };
  const th0 = start || startGrid(id, pairs);
  if (!th0) return { ...base, status: 'invalid', problems: [{ code: 'fit.nostart' }] };
  const model = { f: (th, x) => predictTheta(id, th, x), grad: (th, x) => GRAD[id](th, x) };
  const valid = th => !f.check(Object.fromEntries(f.params.map((k, i) => [k, th[i]]))).length;
  const r = levenbergMarquardt(model, pairs, pairs.map(x => x.H2), th0, { valid, maxIter: 1000, xtol: 1e-15, ftol: 1e-16, gtol: 1e-12 });
  const out = { ...base, start: th0, startFrom: start ? 'user' : 'grid', iter: r.iter, reason: r.reason ?? null, stop: { xtol: 1e-15, ftol: 1e-16, gtol: 1e-12, maxIter: 1000 } };
  if (r.status !== 'ok') return { ...out, status: r.status, problems: [{ code: 'fit.' + r.status }] };
  const params = Object.fromEntries(f.params.map((k, i) => [k, r.theta[i]]));
  const bad = f.check(params);
  if (bad.length) return { ...out, status: 'invalid', params, problems: bad };
  const residuals = pairs.map(x => { const pred = predictTheta(id, r.theta, x); return { id: x.id, A1: x.A1, H1: x.H1, A2: x.A2, H2: x.H2, pred, e: pred - x.H2 }; });
  const n = pairs.length, bias = residuals.reduce((a, q) => a + q.e, 0) / n, rmse = Math.sqrt(r.sse / n);
  const cov = n > p ? covariance(model, r.theta, pairs, r.sse) : null;
  return { ...out, status: 'ok', params, theta: r.theta, sse: r.sse, rmse, bias, sigma: Math.sqrt(r.sse / (n - p)),
    se: cov ? Object.fromEntries(f.params.map((k, i) => [k, cov.se[i]])) : null, seNote: 'independent-observations', residuals };
}
/**
 * Height–age series from a raw table (core/table.js). map: { series (required), plot?, A, H }. The series key is
 * plot + series id (ids are text). Unreadable or non-positive values are reported with their rows and left out;
 * repeated ages in one series are reported (the pair builder ignores equal ages). Returns { series, problems }.
 */
export function seriesFromTable(tbl, map, decimal, parseNumber, cellText) {
  const by = new Map(), problems = [];
  tbl.rows.forEach((r, i) => {
    const row = tbl.rowNumbers[i], txt = c => c == null ? '' : cellText(c).trim();
    if (r.every(c => txt(c) === '')) return;
    const sid = txt(r[map.series]), plot = map.plot != null ? txt(r[map.plot]) : '';
    if (!sid) { problems.push({ code: 'ser.id', row }); return; }
    const rd = c => c == null ? { status: 'empty' } : c.t === 'n' ? parseNumber(c.v, decimal) : parseNumber(cellText(c), decimal);
    const A = rd(r[map.A]), H = rd(r[map.H]);
    if (A.status !== 'ok' || !(A.value > 0)) { problems.push({ code: 'ser.a', row, text: txt(r[map.A]) }); return; }
    if (H.status !== 'ok' || !(H.value > 0)) { problems.push({ code: 'ser.h', row, text: txt(r[map.H]) }); return; }
    const key = plot ? `${plot} / ${sid}` : sid;
    if (!by.has(key)) by.set(key, { id: key, points: [] });
    const s = by.get(key);
    if (s.points.some(p => p.A === A.value)) problems.push({ code: 'ser.dup', row, id: key, A: A.value });
    s.points.push({ A: A.value, H: H.value, row });
  });
  return { series: [...by.values()], problems };
}
