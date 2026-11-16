// Report generator (DI-05): the content of a report as plain data, no DOM. A report gathers a data package (details,
// summary, plot × period table, the dashboard's panels under a filter) and run records (settings, result tables,
// sources, reproducibility details). Nothing is computed here that the tools and the dashboard do not compute
// already: counts come from core/projects.js and dashboard/calc.js, results are read from the records as they are.
// Tests: tests/report/test_di05.mjs.
import { summarize } from '../core/projects.js';
import { verifyRecord } from '../core/record.js';
import * as P from '../dashboard/calc.js';

export const TOOL = { id: 'rapor', version: '1.0.0-beta.1' };
export const SECTIONS = ['package', 'charts', 'records', 'sources', 'repro'];
export const blankMeta = () => ({ title: '', author: '', org: '', date: new Date().toISOString().slice(0, 10), intro: '', notes: Object.fromEntries(SECTIONS.map(s => [s, ''])) });

/** Number as text: up to 6 significant digits, decimal point, no exponent for ordinary sizes. */
export function num(x) {
  if (x == null || typeof x !== 'number' || !Number.isFinite(x)) return x == null ? '' : String(x);
  if (Number.isInteger(x)) return String(x);
  const a = Math.abs(x);
  if (a !== 0 && (a < 1e-4 || a >= 1e9)) return x.toExponential(4);
  return String(Number(x.toPrecision(6)));
}
/** Cell text of any value: numbers by num(), arrays joined, objects as compact JSON, null as '–'. */
export function cell(v) {
  if (v == null || v === '') return '–';
  if (typeof v === 'number') return num(v);
  if (typeof v === 'boolean') return v ? '✓' : '✗';
  if (Array.isArray(v)) return v.every(x => typeof x !== 'object' || x == null) ? v.map(x => typeof x === 'number' ? num(x) : x ?? '–').join('; ') : JSON.stringify(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v).replace(/\u0000pool/g, '*');
}
const getPath = (o, p) => p.split('.').reduce((a, k) => a == null ? undefined : a[k], o);
/**
 * Columns of a table from paths: 'a.b' (nested), 'a.*' (every key of object a, primitives only), '*' (every
 * primitive top-level key and one level below). → [path…], at most max.
 */
export function columns(rows, spec, max = 14) {
  const out = [];
  const add = p => { if (!out.includes(p)) out.push(p); };
  for (const s of spec) {
    if (s === '*') {
      for (const r of rows) for (const [k, v] of Object.entries(r || {})) {
        if (v == null || typeof v !== 'object') add(k);
        else if (!Array.isArray(v)) for (const [k2, v2] of Object.entries(v)) { if (v2 == null || typeof v2 !== 'object') add(k + '.' + k2); }
        else if (v.every(x => typeof x !== 'object')) add(k);
      }
    } else if (s.endsWith('.*')) {
      const base = s.slice(0, -2);
      for (const r of rows) { const o = getPath(r, base); if (o && typeof o === 'object' && !Array.isArray(o)) for (const [k, v] of Object.entries(o)) if (v == null || typeof v !== 'object') add(base + '.' + k); }
    } else if (rows.some(r => getPath(r, s) !== undefined)) add(s);
  }
  return out.slice(0, max);
}
/** A table { title, cols, rows (text), total, shown } from objects. */
export function table(title, objs, spec, { maxRows = 60, maxCols = 14 } = {}) {
  const list = (objs || []).filter(x => x && typeof x === 'object');
  const cols = columns(list, spec, maxCols), shown = list.slice(0, maxRows);
  return { title, cols, rows: shown.map(r => cols.map(c => cell(getPath(r, c)))), total: list.length, shown: shown.length };
}
/** Key–value rows of an object (one level; nested objects as compact JSON). */
export const kv = o => Object.entries(o || {}).filter(([, v]) => v !== undefined).map(([k, v]) => [k, cell(v)]);

/** What each tool's record shows: tables over its arrays (paths as in columns()) and key–value blocks. */
export const SPECS = {
  'cap-dagilimi': [{ key: 'results', cols: ['data.plot', 'data.period', 'data.n', 'family', 'method', 'status', 'params.*', 'logLik'] }],
  'boy-cap': [{ key: 'fits', cols: ['id', 'status', 'theta', 'se', 'n', 'rmse', 'mae', 'bias', 'aic'] }, { key: 'data', kv: true }],
  'buyume-islevi': [{ key: 'fits', cols: ['form', 'status', 'theta', 'se', 'n', 'rmse', 'bias', 'aic'] }],
  'model-degerlendirme': [{ key: 'models', cols: ['name', 'column', 'role', 'overall.*'] }, { key: 'rows', kv: true }],
  'nispi-siralama': [{ key: 'ranks', cols: ['ordinal', 'label', 'sum', 'overall'] }, { key: 'criteria', cols: ['name', 'dir', 'best', 'worst'] }],
  'ornekleme-planlayici': [{ key: 'plan', kv: true }, { key: 'input', kv: true }, { key: 'pilot', kv: true }],
  'ornek-alan-mescere': [{ key: 'units', cols: ['plot_id', 'period', 'state', 'n', 'Nha', 'Gha', 'd_mean', 'dq', 'd_min', 'd_max'] }],
};
const GENERIC = ['results', 'units', 'trees', 'fits', 'rows', 'ranks', 'models'];

/** Coefficient sources a record names (site index set, taper sets): [text]. */
export function coefSources(rec) {
  const out = [];
  const s = rec.set && rec.set.source; if (s) out.push(typeof s === 'string' ? s : s.citation);
  for (const x of Array.isArray(rec.sets) ? rec.sets : []) if (x && x.source) out.push(typeof x.source === 'string' ? x.source : x.source.citation);
  return [...new Set(out.filter(Boolean))];
}
/** Literature a record carries (Diameter Distribution: sources.references {id: { cite, status, url }}). */
export function recordRefs(rec) {
  const r = rec.sources && rec.sources.references;
  return r && typeof r === 'object' ? Object.entries(r).filter(([, v]) => v && v.cite).map(([id, v]) => ({ id, cite: v.cite, status: v.status || null, url: v.url || null })) : [];
}

/**
 * One record for the report: identity, check, settings, tables. obj: parsed run record (or a tool JSON written before
 * DI-07). pkgSha: fingerprint of the package in the report (null if none).
 */
export async function recordSection(name, obj, pkgSha) {
  const v = await verifyRecord(obj);
  if (v.kind !== 'record' && v.kind !== 'legacy') return null;
  const id = v.tool && v.tool.id, specs = SPECS[id];
  const tables = [], blocks = [];
  if (specs) for (const s of specs) {
    const val = obj[s.key]; if (val == null) continue;
    if (s.kv) blocks.push({ title: s.key, rows: kv(val) });
    else if (Array.isArray(val)) tables.push(table(s.key, val, s.cols));
  } else {
    const key = GENERIC.find(k => Array.isArray(obj[k]) && obj[k].length && typeof obj[k][0] === 'object');
    if (key) tables.push(table(key, obj[key], ['*'], { maxCols: 12 }));
  }
  const settings = ['settings', 'reading', 'summary', 'location', 'variable', 'unit', 'input', 'model', 'classes'].filter(k => obj[k] != null && !(specs || []).some(s => s.key === k))
    .flatMap(k => typeof obj[k] === 'object' && !Array.isArray(obj[k]) ? kv(obj[k]).map(([a, b]) => [k === 'settings' ? a : `${k}.${a}`, b]) : [[k, cell(obj[k])]]);
  const ds = (obj.inputs || []).filter(x => x && x.kind === 'dataset');
  return {
    name, kind: v.kind, tool: v.tool, created: v.created, seal: v.seal, expected: v.expected, actual: v.actual, build: v.build, problems: v.problems,
    inputs: v.inputs, fromPackage: !ds.length ? null : ds.some(x => String(x.sha256).toLowerCase() === String(pkgSha || '').toLowerCase()),
    settings, tables, blocks, refs: recordRefs(obj), coefSources: coefSources(obj),
  };
}

/**
 * The package part: details, summary, plot × period counts, and the dashboard panels under the filter.
 * project: { name, year, location, description, sha256, dataset } (or a bare data set as { dataset }).
 */
export function packagePart(project, f, ec, width, recs) {
  const ds = project.dataset, s = summarize(ds);
  const trees = P.filterTrees(ds, f), pt = P.plotTable(ds, f, ec), sp = P.speciesTable(trees), hd = P.hdPoints(trees);
  const d = trees.map(t => t.dbh), w = width > 0 ? width : d.length ? P.niceWidth(Math.max(...d) - Math.min(...d)) : 1, bins = P.histogram(d, w);
  const curves = [], hcurves = [];
  if (bins.length) { const xs = P.grid(Math.max(0.01, bins[0].lo), bins[bins.length - 1].hi, 200); for (const r of recs) if (r.kind === 'dist') curves.push(...P.distCurves(r.obj, f, xs)); }
  if (hd.measured.length) { const all = hd.measured, xs = P.grid(Math.max(0.5, Math.min(...all.map(p => p[0])) * 0.9), Math.max(...all.map(p => p[0])) * 1.05, 120); for (const r of recs) if (r.kind === 'hd') hcurves.push(...P.hdCurves(r.obj, xs)); }
  return { project, summary: s, filter: f, ec, trees: trees.length, plots: pt, species: sp, hist: { bins, width: w, n: d.length, curves }, hd: { ...hd, curves: hcurves } };
}
