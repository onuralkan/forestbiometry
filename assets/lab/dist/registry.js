// Diameter distribution engine: registry of families and methods, the result contract and structured errors.
// No DOM: the same files run in the browser, in Node tests and (later) in a Web Worker. Spec: docs/DIST_SPEC.md.
//
// Separate concepts (never mixed in one menu):
//   family     the probability model (Weibull, gamma, …)
//   method     kind 'fit'     direct estimation from measured diameters (estimator: 'ml', 'mom', 'quantile', …)
//              kind 'recover' parameters from summaries (mean, Dq, percentiles)
//              kind 'stand'   prediction from stand variables
//   solver     the numerical algorithm a method uses (bisection, Brent, …); reported, never a choice of "method"
export const TOOL = { id: 'cap-dagilimi', version: '2.0.0' };
export const CONTRACT = 'dist-result/1';

/** Structured error: code + detail (never a number that looks like a result). */
export class DistError extends Error {
  constructor(code, detail = {}) { super(code); this.name = 'DistError'; this.code = code; this.detail = detail; }
}

const FAMILIES = new Map(), METHODS = new Map();
const FAMILY_FNS = ['support', 'pdf', 'logpdf', 'cdf', 'logcdf', 'sf', 'logsf', 'quantile'];
const KINDS = ['fit', 'recover', 'stand'];

/**
 * family = { id, params: [{ key, label?, role: 'location'|'scale'|'shape'|'lower'|'upper'|'range', unit: 'cm'|'ln cm'|null, scale?: 'log', min?, max?, minOpen?, maxOpen? }],
 *            support(p) → [lo, hi] (cm), pdf, logpdf, cdf, logcdf, sf, logsf (d, p), quantile(q, p),
 *            mean?(p), variance?(p) (throw DistError('moment.undefined') where they do not exist), diagnostics?(p), check?(p) (cross-parameter rules; throws DistError), source }
 */
export function registerFamily(f) {
  if (!f || !f.id || FAMILIES.has(f.id)) throw new Error('family id missing or duplicate: ' + (f && f.id));
  for (const k of FAMILY_FNS) if (typeof f[k] !== 'function') throw new Error(`family ${f.id}: ${k}() missing`);
  if (!Array.isArray(f.params) || !f.params.length) throw new Error(`family ${f.id}: params missing`);
  FAMILIES.set(f.id, f); return f;
}
/**
 * method = { id, family, kind, estimator, solver, dataTypes: ['raw'|'classes'|'summary'], likelihoodMaximised: bool,
 *            options?: [{ key, type: 'fixed-param'|'choice'|'prob', default?, values? }], checkOptions?(opts) → [problem],
 *            source, run(input, opts) → partial result (see makeResult) }
 * Only registered methods are offered anywhere: nothing unimplemented can appear in a menu.
 */
export function registerMethod(m) {
  if (!m || !m.id || METHODS.has(m.id)) throw new Error('method id missing or duplicate: ' + (m && m.id));
  if (!FAMILIES.has(m.family)) throw new Error(`method ${m.id}: unknown family ${m.family}`);
  if (!KINDS.includes(m.kind) || typeof m.run !== 'function' || !Array.isArray(m.dataTypes)) throw new Error(`method ${m.id}: bad definition`);
  METHODS.set(m.id, m); return m;
}
export const families = () => [...FAMILIES.values()];
export const family = id => { const f = FAMILIES.get(id); if (!f) throw new DistError('family.unknown', { id }); return f; };
export const method = id => { const m = METHODS.get(id); if (!m) throw new DistError('method.unknown', { id }); return m; };
/** Methods that exist for a family, kind and data type (what a selector may show). */
export function methodsFor({ family: fam, kind, dataType } = {}) {
  return [...METHODS.values()].filter(m => (!fam || m.family === fam) && (!kind || m.kind === kind) && (!dataType || m.dataTypes.includes(dataType)));
}

/** Parameter check against the family schema. Throws DistError('param.invalid'). */
export function checkParams(fam, p) {
  for (const s of fam.params) {
    const v = p[s.key];
    if (!Number.isFinite(v)) throw new DistError('param.invalid', { family: fam.id, key: s.key, value: v ?? null, rule: 'finite' });
    if (s.min != null && (s.minOpen ? !(v > s.min) : !(v >= s.min))) throw new DistError('param.invalid', { family: fam.id, key: s.key, value: v, rule: (s.minOpen ? '> ' : '≥ ') + s.min });
    if (s.max != null && (s.maxOpen ? !(v < s.max) : !(v <= s.max))) throw new DistError('param.invalid', { family: fam.id, key: s.key, value: v, rule: (s.maxOpen ? '< ' : '≤ ') + s.max });
  }
  if (fam.check) fam.check(p);                                     // cross-parameter rules (e.g. beta L < U)
  return true;
}
/** Every observation must lie inside the open support. Throws DistError('support.outside') with a count and an example. */
export function checkSupport(fam, p, d) {
  const [lo, hi] = fam.support(p); let count = 0, example = null;
  for (const v of d) if (!(v > lo && v < hi)) { count++; if (example == null) example = v; }
  if (count) throw new DistError('support.outside', { family: fam.id, lo, hi, count, example });
  return true;
}

/**
 * The result contract. Required: family, method, status. Everything else is filled where it applies; fields that do not
 * apply stay null (they are never invented).
 *   status      'ok' | 'boundary' (solution at the edge of the search interval) | 'noconverge' | 'invalid' (data or
 *               setting problem, see problems) | 'error' (structured error, see error)
 *   data        { plot, period, type: 'raw'|'classes'|'summary', n, unit: 'cm' }
 *   params      { key: value }       units { key: 'cm' | null }
 *   fixed       { key: { value, origin: 'zero'|'user'|'data' } }       free [keys]
 *   settings    method options actually used (e.g. { varDivisor: 'n' }, { p, r, quantile: 'type7' }); {} if none
 *   targets     sample summaries the method matched, with their definition (moments, percentiles); null for ML
 *   truncation  { lower, upper, logMass, mass, nObserved, nPopulation } for conditional fits to thresholded data (P11)
 *   diagnostics family/method extras, e.g. { pBelowZero } for the normal, back-calculated moments for recovery
 *   objective   { name: 'logLik' | …, value }     logLik (original diameter scale) when it can be evaluated
 *   convergence { status, iter, solver, tol }
 *   warnings    [{ code, … }]   problems [{ code, … }]   source: reference id (METHODS.md)
 */
export function makeResult(o) {
  const m = METHODS.get(o.method), fam = FAMILIES.get(o.family || (m && m.family));
  if (!fam || !m) throw new Error('makeResult: unknown family or method');
  return {
    contract: CONTRACT, tool: TOOL.id + ' ' + TOOL.version, family: fam.id, method: m.id, kind: m.kind, estimator: m.estimator,
    status: o.status,
    data: { plot: null, period: null, type: 'raw', n: null, unit: 'cm', ...(o.data || {}) },
    params: o.params || null, units: Object.fromEntries(fam.params.map(s => [s.key, s.unit])),
    fixed: o.fixed || {}, settings: o.settings || {}, targets: o.targets || null, diagnostics: o.diagnostics || null, truncation: o.truncation || null, free: o.free || fam.params.map(s => s.key).filter(k => !(o.fixed && k in o.fixed)),
    objective: o.objective || null, logLik: o.logLik ?? null, likelihoodMaximised: !!m.likelihoodMaximised,
    convergence: { status: o.status, iter: null, solver: m.solver || null, tol: null, ...(o.convergence || {}) },
    warnings: o.warnings || [], problems: o.problems || [], error: o.error || null, source: m.source || null,
  };
}
/** Runs a registered method; a DistError becomes a result with status 'error' (never a thrown exception to the UI). */
export function runMethod(id, input, opts = {}) {
  const m = method(id);
  if (!m.dataTypes.includes(input.type || 'raw')) throw new DistError('method.datatype', { method: id, type: input.type || 'raw' });
  const data = { plot: input.plot ?? null, period: input.period ?? null, type: input.type || 'raw', n: input.d ? input.d.length : input.n ?? null };
  try {
    const bad = m.checkOptions ? m.checkOptions(opts) : [];
    const r = bad.length ? { status: 'invalid', problems: bad } : m.run(input, opts);
    return makeResult({ ...r, method: id, family: m.family, data: { ...data, ...(r.data || {}) } });
  } catch (e) {
    if (!(e instanceof DistError)) throw e;
    return makeResult({ method: id, family: m.family, status: 'error', data, error: { code: e.code, detail: e.detail } });
  }
}
