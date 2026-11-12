// Shared coefficient library, schema model-coef/1 (docs/TOOLS_SPEC.md §1.3, stage T01). No DOM.
// The site ships NO species or regional coefficients (TOOLS_SPEC decision K1): every set is entered by the user or
// fitted from the user's data, and its source is mandatory. Sets live in the browser (core/store.js, keys 'coef:<id>');
// they are never sent anywhere.
//
// A tool registers the equation FORMS it supports (registerForm); a set gives coefficients for one registered form.
// Free-text formulas (an expression parser) are deliberately not supported.
import { put, get, del, keys } from './store.js';

export const SCHEMA = 'model-coef/1';
export const LIBRARY_SCHEMA = 'model-coef-library/1';
export const KEY_PREFIX = 'coef:';
const TRANSFORMS = ['none', 'log', 'log10'], CORRECTIONS = ['none', 'baskerville', 'snowdon', 'user'], ORIGINS = ['user-entered', 'fitted'];
const BARK = ['ob', 'ib'];
const FORMS = new Map();

/**
 * form = { id, tool, params: [{ key, label? }], inputs: { <var>: { unit, bark? } }, output: { name, unit, bark? },
 *          formula: { tr, en } (text shown to the user), transform?: 'none'|'log'|'log10' (the scale the equation is
 *          written on; default 'none'), eval?(params, x) → number (optional; the tool's own calculator) }
 */
export function registerForm(f) {
  if (!f || typeof f.id !== 'string' || !f.id || FORMS.has(f.id)) throw new Error('form id missing or duplicate: ' + (f && f.id));
  if (typeof f.tool !== 'string' || !f.tool) throw new Error(`form ${f.id}: tool missing`);
  if (!Array.isArray(f.params) || !f.params.length || f.params.some(p => !p || typeof p.key !== 'string')) throw new Error(`form ${f.id}: params missing`);
  if (!f.inputs || !Object.keys(f.inputs).length || !f.output || !f.output.unit) throw new Error(`form ${f.id}: inputs/output missing`);
  if (f.transform != null && !TRANSFORMS.includes(f.transform)) throw new Error(`form ${f.id}: bad transform`);
  FORMS.set(f.id, f); return f;
}
export const form = id => FORMS.get(id) || null;
export const formsFor = tool => [...FORMS.values()].filter(f => !tool || f.tool === tool);

const fin = x => typeof x === 'number' && Number.isFinite(x);
const txt = x => typeof x === 'string' && x.trim() !== '';
/**
 * Checks a set against the schema and its registered form. Returns [{ code, … }] (empty = valid). Codes:
 * schema, id, tool, form.unknown, form.tool, param.missing, param.extra, param.nonfinite, unit.input, unit.output,
 * bark, valid.bad, transform.bad, correction.bad, correction.value, source.missing, origin.bad, fit.missing.
 */
export function validateCoef(s) {
  const p = [], add = (code, extra = {}) => p.push({ code, ...extra });
  if (!s || typeof s !== 'object') return [{ code: 'schema' }];
  if (s.schema !== SCHEMA) add('schema');
  if (!txt(s.id)) add('id');
  if (!txt(s.tool)) add('tool');
  const f = FORMS.get(s.form);
  if (!f) add('form.unknown', { form: s.form ?? null });
  else if (f.tool !== s.tool) add('form.tool', { form: f.id, tool: s.tool ?? null });
  const params = s.params && typeof s.params === 'object' ? s.params : {};
  if (f) {
    for (const q of f.params) { if (!(q.key in params)) add('param.missing', { key: q.key }); else if (!fin(params[q.key])) add('param.nonfinite', { key: q.key, value: params[q.key] ?? null }); }
    for (const k of Object.keys(params)) if (!f.params.some(q => q.key === k)) add('param.extra', { key: k });
    for (const v of Object.keys(f.inputs)) if (!s.inputs || !s.inputs[v] || !txt(s.inputs[v].unit)) add('unit.input', { key: v });
  }
  if (!s.output || !txt(s.output.unit)) add('unit.output');
  for (const side of [...Object.values(s.inputs || {}), s.output || {}]) if (side && side.bark != null && !BARK.includes(side.bark)) add('bark', { value: side.bark });
  if (s.valid != null) {
    if (typeof s.valid !== 'object') add('valid.bad', { key: null });
    else for (const [k, r] of Object.entries(s.valid)) if (!Array.isArray(r) || r.length !== 2 || !r.every(x => x === null || fin(x)) || (fin(r[0]) && fin(r[1]) && !(r[0] < r[1]))) add('valid.bad', { key: k });
  }
  if (s.transform != null) {
    const t = s.transform;
    if (typeof t !== 'object' || !TRANSFORMS.includes(t.kind)) add('transform.bad');
    else {
      if (f && (f.transform || 'none') !== t.kind) add('transform.bad', { expected: f.transform || 'none', got: t.kind });
      if (t.correction != null && !CORRECTIONS.includes(t.correction)) add('correction.bad', { value: t.correction });
      if ((t.correction === 'baskerville' || t.correction === 'snowdon' || t.correction === 'user') && !(fin(t.value) && t.value > 0)) add('correction.value', { correction: t.correction });
      if (t.kind === 'none' && t.correction && t.correction !== 'none') add('correction.bad', { value: t.correction });
    }
  } else if (f && f.transform && f.transform !== 'none') add('transform.bad', { expected: f.transform, got: null });
  if (!s.source || !txt(s.source.citation)) add('source.missing');
  if (!ORIGINS.includes(s.origin)) add('origin.bad', { value: s.origin ?? null });
  if (s.origin === 'fitted' && (!s.fit || typeof s.fit !== 'object')) add('fit.missing');
  return p;
}
/**
 * Back-transformation factor for a set on a log scale: Baskerville exp(SEE²/2) (SEE on the natural-log scale; for
 * log10 equations SEE is converted, SEE·ln 10), Snowdon or user factor as given, none = 1. null when not applicable.
 */
export function correctionFactor(s) {
  const t = s.transform; if (!t || t.kind === 'none') return null;
  if (!t.correction || t.correction === 'none') return 1;
  if (t.correction === 'baskerville') { const see = t.kind === 'log10' ? t.value * Math.LN10 : t.value; return Math.exp(see * see / 2); }
  return t.value;
}
/** Which inputs of x lie outside the set's validity ranges: [{ key, value, min, max }]. */
export function outsideValid(s, x) {
  const out = []; if (!s.valid) return out;
  for (const [k, [mn, mx]] of Object.entries(s.valid)) { const v = x[k]; if (fin(v) && ((fin(mn) && v < mn) || (fin(mx) && v > mx))) out.push({ key: k, value: v, min: mn, max: mx }); }
  return out;
}

/** New set skeleton for a form (params empty, units from the form). */
export function blankSet(formId) {
  const f = FORMS.get(formId); if (!f) throw new Error('unknown form ' + formId);
  return { schema: SCHEMA, id: newId(), tool: f.tool, form: f.id, params: {}, inputs: JSON.parse(JSON.stringify(f.inputs)), output: { ...f.output },
    valid: null, species: null, region: null, component: null, transform: f.transform && f.transform !== 'none' ? { kind: f.transform, correction: 'none' } : null,
    source: { citation: '' }, origin: 'user-entered', created: null, modified: null };
}
export function newId() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

/* ---------------- JSON library file ---------------- */
/** { schema: 'model-coef-library/1', exported, sets: [...] }. Numbers survive JSON exactly (shortest round-trip form). */
export function exportLibrary(sets, now = new Date().toISOString()) { return { schema: LIBRARY_SCHEMA, exported: now, sets }; }
/** Reads a library (or a single set). Valid sets are returned; invalid ones are listed with their problems, never dropped silently. */
export function importLibrary(obj) {
  const list = obj && obj.schema === LIBRARY_SCHEMA && Array.isArray(obj.sets) ? obj.sets : obj && obj.schema === SCHEMA ? [obj] : null;
  if (!list) return { sets: [], rejected: [{ index: null, problems: [{ code: 'library.schema' }] }] };
  const sets = [], rejected = [];
  list.forEach((s, i) => { const pr = validateCoef(s); if (pr.length) rejected.push({ index: i, id: s && s.id, problems: pr }); else sets.push(s); });
  return { sets, rejected };
}

/* ---------------- storage (browser only; IndexedDB through core/store.js) ---------------- */
export async function saveCoef(s, now = new Date().toISOString()) {
  const pr = validateCoef(s); if (pr.length) return { ok: false, problems: pr };
  const rec = { ...s, created: s.created || now, modified: now };
  await put(KEY_PREFIX + rec.id, rec); return { ok: true, set: rec };
}
export async function loadCoef(id) { return (await get(KEY_PREFIX + id)) || null; }
export async function deleteCoef(id) { await del(KEY_PREFIX + id); }
/** Stored sets, optionally of one tool, sorted by modification time (newest first). */
export async function listCoefs(tool = null) {
  const ks = await keys(KEY_PREFIX), out = [];
  for (const k of ks) { const s = await get(k); if (s && (!tool || s.tool === tool)) out.push(s); }
  return out.sort((a, b) => String(b.modified || '').localeCompare(String(a.modified || '')) || String(a.id).localeCompare(String(b.id)));
}
