// Coefficient and equation library (DI-02; docs/PLATFORM_PLAN.md). No DOM.
// One place for every user coefficient set of every tool (model-coef/1, core/coef.js): overview, filters, problems,
// duplicates, copies and a full backup / restore. The site ships NO sets (K1, P2); this page never adds any.
// The equation forms are registered by the tools' own engines, imported here only for that.
import { validateCoef, form, SCHEMA, LIBRARY_SCHEMA, newId } from '../core/coef.js';
import '../taper/calc.js';
import '../growth/calc.js';
import '../siteindex/calc.js';

export const TOOL = { id: 'katsayi-kutuphanesi', version: '1.0.0-beta.1' };
/** Tools that keep sets in the library: catalogue id, page, names. Order = display order. */
export const TOOLS = [
  { tool: 'siteindex', id: 'SQ-01', page: 'bonitet.php', name: { tr: 'Bonitet', en: 'Site Index' } },
  { tool: 'growth', id: 'SQ-03', page: 'buyume-islevi.php', name: { tr: 'Büyüme İşlevi', en: 'Growth Functions' } },
  { tool: 'taper', id: 'SV-02', page: 'govde-profili.php', name: { tr: 'Gövde Profili', en: 'Stem Taper' } },
];
export const toolInfo = t => TOOLS.find(x => x.tool === t) || null;

/**
 * Problems of a set: the schema check (core/coef.js validateCoef) plus the tool's own required fields, given as
 * extraCheck(tool, set) → problems (the page passes the editors' checks; Node tests may pass none).
 */
export function problemsOf(s, extraCheck = null) {
  const p = validateCoef(s);
  if (!p.length && extraCheck) p.push(...extraCheck(s.tool, s));
  if (s && s.tool && !toolInfo(s.tool)) p.push({ code: 'tool.unknown', tool: s.tool });
  return p;
}

const norm = x => String(x ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/\u0131/g, 'i');   // I, İ, ı and i all match
/** Text of a set searched by the filter: form id and formula, species, region, component, citation, DOI, note, tool. */
export function searchText(s) {
  const f = form(s.form);
  return norm([s.form, f && f.formula && (f.formula.tr + ' ' + f.formula.en), s.species, s.region, s.component, s.source && s.source.citation, s.source && s.source.doi, s.source && s.source.note, s.tool,
    toolInfo(s.tool) && toolInfo(s.tool).name.tr, toolInfo(s.tool) && toolInfo(s.tool).name.en].filter(Boolean).join(' '));
}
/** Filter: { tool: '' | tool id, q: words (all must occur, case- and accent-insensitive), origin: '' | 'user-entered' | 'fitted', problems: bool (only sets with problems) }. */
export function filterSets(sets, { tool = '', q = '', origin = '', problems = false } = {}, problemsFn = problemsOf) {
  const words = norm(q).split(/\s+/).filter(Boolean);
  return sets.filter(s => (!tool || s.tool === tool) && (!origin || s.origin === origin) && (!problems || problemsFn(s).length > 0)
    && words.every(w => searchText(s).includes(w)));
}

/** Content key of a set: tool, form, coefficients, units, transformation and the tool's own fields; not id, dates, source or scope. */
export function fingerprint(s) {
  const sort = o => o && typeof o === 'object' && !Array.isArray(o) ? Object.fromEntries(Object.keys(o).sort().map(k => [k, sort(o[k])])) : o;
  return JSON.stringify(sort({ tool: s.tool, form: s.form, params: s.params, inputs: s.inputs, output: s.output, transform: s.transform ?? null, meta: s.meta ?? null }));
}
/** Groups of two or more sets with the same content (same coefficients, possibly different sources): [[id, id, …], …]. */
export function duplicates(sets) {
  const by = new Map();
  for (const s of sets) { const k = fingerprint(s); by.set(k, [...(by.get(k) || []), s.id]); }
  return [...by.values()].filter(g => g.length > 1);
}

/** A copy of a set with a new id (unsaved; created/modified empty); copyOf records where it came from. */
export function copySet(s, id = newId()) {
  const c = JSON.parse(JSON.stringify(s));
  return { ...c, id, created: null, modified: null, copyOf: s.id };
}

/**
 * Backup file of the whole library (model-coef-library/1, the format each tool page also reads and writes),
 * with the tool and page versions that wrote it.
 */
export function backup(sets, now = new Date().toISOString()) {
  return { schema: LIBRARY_SCHEMA, exported: now, writer: `${TOOL.id} ${TOOL.version}`, sets };
}

/**
 * What restoring a library file would do, without doing it: each incoming set is 'add' (new id), 'replace' (same id,
 * different content or source), 'same' (same id and identical record apart from dates) or 'reject' (problems).
 * Content duplicates of stored sets under another id are flagged (dupOf), not refused. A single set (model-coef/1)
 * is read as a library of one.
 */
export function planRestore(stored, obj, problemsFn = problemsOf) {
  const list = obj && obj.schema === LIBRARY_SCHEMA && Array.isArray(obj.sets) ? obj.sets : obj && obj.schema === SCHEMA ? [obj] : null;
  if (!list) return { ok: false, problems: [{ code: 'library.schema' }], items: [] };
  const byId = new Map(stored.map(s => [s.id, s])), byFp = new Map(stored.map(s => [fingerprint(s), s.id]));
  const strip = s => { const { created, modified, ...rest } = s; return JSON.stringify(rest); };
  const seen = new Set();
  const items = list.map((s, index) => {
    const pr = problemsFn(s);
    if (pr.length) return { index, id: s && s.id, action: 'reject', problems: pr };
    if (seen.has(s.id)) return { index, id: s.id, action: 'reject', problems: [{ code: 'id.repeated' }] };
    seen.add(s.id);
    const old = byId.get(s.id), dup = byFp.get(fingerprint(s));
    const action = !old ? 'add' : strip(old) === strip(s) ? 'same' : 'replace';
    return { index, id: s.id, action, set: s, dupOf: action === 'add' && dup ? dup : null };
  });
  const count = a => items.filter(x => x.action === a).length;
  return { ok: true, items, add: count('add'), replace: count('replace'), same: count('same'), reject: count('reject') };
}

/** Rows for a CSV/Excel listing: one row per set, coefficients as JSON at full precision. */
export function tableRows(sets, problemsFn = problemsOf) {
  const rows = [['id', 'tool', 'form', 'params', 'species', 'region', 'component', 'origin', 'citation', 'doi', 'output_unit', 'meta', 'created', 'modified', 'problems']];
  for (const s of sets) rows.push([s.id, s.tool, s.form, JSON.stringify(s.params), s.species ?? null, s.region ?? null, s.component ?? null, s.origin, s.source ? s.source.citation : null, s.source ? s.source.doi ?? null : null,
    s.output ? s.output.unit : null, s.meta ? JSON.stringify(s.meta) : null, s.created ?? null, s.modified ?? null, problemsFn(s).map(q => q.code).join(' ')]);
  return rows;
}
