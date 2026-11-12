// Forest Data Checker: pure logic (no DOM). Methods: docs/METHODS.md §5.
// Layers: raw tables (as read) → work (raw cells + user edits + exclusions + changelog)
//         → evaluation (parsed values in internal units + issues) → approved dataset (+ derived values, kept separate).
import { parseNumber, toInternal, detectDecimal, UNITS } from '../core/num.js';
import { cellText } from '../core/table.js';

export const TOOL = { id: 'veri-denetcisi', version: '1.1.0' };
export const SCHEMA = 'forest-dataset/1';

export const TREE_FIELDS = [
  { key: 'plot_id', kind: 'id', req: true }, { key: 'tree_id', kind: 'id', req: true },
  { key: 'species', kind: 'code', req: true }, { key: 'dbh', kind: 'num', unit: 'dbh', req: true },
  { key: 'height', kind: 'num', unit: 'height' }, { key: 'period', kind: 'period' },
  { key: 'stem_id', kind: 'id' }, { key: 'plot_area', kind: 'num', unit: 'area' },
  { key: 'stratum', kind: 'code' }, { key: 'status', kind: 'code' },
  { key: 'x', kind: 'num', unit: 'xy' }, { key: 'y', kind: 'num', unit: 'xy' },
  { key: 'age', kind: 'num', unit: 'age' },
];
export const PLOT_FIELDS = [
  { key: 'plot_id', kind: 'id', req: true }, { key: 'plot_area', kind: 'num', unit: 'area', req: true }, { key: 'stratum', kind: 'code' },
];
export const FIELDS = { trees: TREE_FIELDS, plots: PLOT_FIELDS };
/** Screening thresholds, not scientific limits: users adjust them to their data (METHODS.md §5). */
export const DEFAULT_LIMITS = { dbhMin: 1, dbhMax: 200, hMin: 2, hMax: 60, slMin: 15, slMax: 200 };
export const DEFAULT_UNITS = { dbh: 'cm', height: 'm', area: 'm2', xy: 'm', age: 'yr' };
const HARD = new Set(['format', 'missing', 'invalid', 'duplicate', 'conflict', 'reference']);

/* ---------------- column mapping suggestions (exact names only; the user confirms) ---------------- */
const ALIASES = {
  plot_id: ['plot', 'plotid', 'plotno', 'plotnr', 'alan', 'alanno', 'alanid', 'ornekalan', 'ornekalanno', 'oa', 'oano', 'sampleplot', 'parsel'],
  tree_id: ['tree', 'treeid', 'treeno', 'treenr', 'agac', 'agacno', 'agacid'],
  species: ['species', 'sp', 'spp', 'speciescode', 'tur', 'turkod', 'turkodu', 'agactur', 'agacturu'],
  dbh: ['dbh', 'cap', 'd13', 'd130', 'gogus', 'gogusyuksekligicapi', 'goguscapi', 'diameter', 'diam'],
  height: ['height', 'h', 'ht', 'boy', 'agacboyu', 'toplamboy'],
  period: ['period', 'donem', 'yil', 'year', 'tarih', 'date', 'olcumyili', 'olcumtarihi', 'census', 'olcumdonemi'],
  stem_id: ['stem', 'stemid', 'stemno', 'govde', 'govdeno'],
  plot_area: ['area', 'plotarea', 'alanbuyuklugu', 'ornekalanbuyuklugu', 'buyukluk', 'plotsize'],
  stratum: ['stratum', 'strata', 'tabaka', 'katman'],
  status: ['status', 'durum', 'state'],
  x: ['x', 'koordx', 'easting', 'east', 'dogu'], y: ['y', 'koordy', 'northing', 'north', 'kuzey'],
  age: ['age', 'yas', 'agacyasi', 'treeage'],
};
const UNIT_SUFFIX = { dbh: ['cm', 'mm', 'm'], height: ['m', 'dm', 'cm'], plot_area: ['m2', 'ha'], x: ['m'], y: ['m'] };
export function normHeader(h) {
  return String(h).toLocaleLowerCase('tr').replace(/[çğıöşü]/g, c => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' }[c])).replace(/²/g, '2').replace(/[^a-z0-9]/g, '');
}
/** @returns {{map:{field:colIndex}, units:{dbh?,height?,area?}}} */
export function suggestMapping(headers, fields) {
  const map = {}, units = {}, used = new Set(), H = headers.map(normHeader);
  for (const f of fields) {
    const al = ALIASES[f.key] || [];
    let hit = -1, unit = null;
    H.forEach((h, i) => { if (hit < 0 && !used.has(i) && al.includes(h)) hit = i; });
    if (hit < 0) H.forEach((h, i) => {
      if (hit >= 0 || used.has(i)) return;
      for (const a of al) for (const u of (UNIT_SUFFIX[f.key] || [])) if (h === a + u) { hit = i; unit = u; }
    });
    if (f.key === 'plot_area' && hit < 0) H.forEach((h, i) => { if (hit < 0 && !used.has(i) && (h === 'alanm2' || h === 'm2' || h === 'alanha')) { hit = i; unit = h.endsWith('ha') ? 'ha' : 'm2'; } });
    if (hit >= 0) { map[f.key] = hit; used.add(hit); if (unit) units[f.key === 'plot_area' ? 'area' : f.key] = unit; }
  }
  return { map, units };
}

/** Problems that prevent building the work table. */
export function mappingProblems(sources, mapping) {
  const p = [];
  for (const table of ['trees', 'plots']) {
    if (!sources[table]) continue;
    const m = mapping[table] || {}, seen = new Map();
    for (const f of FIELDS[table]) {
      if (f.req && m[f.key] == null && !(table === 'trees' && f.key === 'plot_area')) p.push({ code: 'map.required', table, field: f.key });
      if (m[f.key] != null) { if (seen.has(m[f.key])) p.push({ code: 'map.twice', table, field: f.key, other: seen.get(m[f.key]) }); else seen.set(m[f.key], f.key); }
    }
  }
  if (!(sources.plots && mapping.plots && mapping.plots.plot_area != null) && mapping.trees.plot_area == null) p.push({ code: 'map.noarea' });
  return p;
}

/** Decimal-separator evidence from TEXT cells of the mapped numeric columns (XLSX numeric cells are already numbers). */
export function decimalEvidence(sources, mapping) {
  const vals = [];
  for (const table of ['trees', 'plots']) {
    const src = sources[table]; if (!src) continue;
    for (const f of FIELDS[table]) {
      const c = mapping[table] && mapping[table][f.key];
      if (f.kind !== 'num' || c == null) continue;
      for (const row of src.rows) { const cell = row[c]; if (cell && cell.t === 's') vals.push(cell.v); }
    }
  }
  return detectDecimal(vals);
}

/* ---------------- work table ---------------- */
export function buildWork(sources, mapping) {
  const mk = table => {
    const src = sources[table]; if (!src) return [];
    const m = mapping[table] || {}, mappedCols = new Set(Object.values(m));
    return src.rows.map((row, i) => {
      const f = {};
      for (const fd of FIELDS[table]) if (m[fd.key] != null) f[fd.key] = { col: m[fd.key] };
      const extra = {};
      src.headers.forEach((h, c) => { if (!mappedCols.has(c)) extra[h] = cellText(row[c]); });
      return { i, row: src.rowNumbers[i], f, extra, excluded: false };
    });
  };
  return { trees: mk('trees'), plots: mk('plots'), edits: {}, accepted: {}, changelog: [], seq: 0 };
}
const ek = (table, i, field) => `${table}:${i}:${field}`;
function srcCell(sources, work, table, rec, field) {
  const e = work.edits[ek(table, rec.i, field)];
  if (e != null) return { t: 's', v: e };
  return sources[table].rows[rec.i][rec.f[field].col];
}
/** Current text of a field as the user would see it (source units, source decimal separator). */
export function currentText(sources, work, table, rec, field) {
  if (!rec.f[field]) return '';
  return cellText(srcCell(sources, work, table, rec, field));
}
function valueOf(fd, cell, settings) {
  if (fd.kind === 'num') {
    if (!cell || (cell.t === 's' && String(cell.v).trim() === '')) return { status: 'empty', value: null };
    if (cell.t === 'n') return { status: 'ok', value: toInternal(fd.unit, settings.units[fd.unit] ?? DEFAULT_UNITS[fd.unit], cell.v) };
    if (cell.t !== 's') return { status: 'bad', reason: 'cell-type', value: null };
    const r = parseNumber(cell.v, settings.decimal);
    if (r.status === 'ok') return { status: 'ok', value: toInternal(fd.unit, settings.units[fd.unit] ?? DEFAULT_UNITS[fd.unit], r.value) };
    return { status: r.status, reason: r.reason, value: null };
  }
  const text = fd.kind === 'period' && cell && cell.t === 'n' && cell.date ? cell.date : cellText(cell);
  return text.trim() === '' ? { status: 'empty', value: null, text } : { status: 'ok', value: text, text };
}
/** Internal value → text in the user's source unit and decimal separator (used for "choose this value" fixes). */
export function internalToText(unitKind, internal, settings) {
  const v = internal / UNITS[unitKind][settings.units[unitKind]];
  const s = String(+v.toPrecision(12));
  return settings.decimal === ',' ? s.replace('.', ',') : s;
}

/* ---------------- evaluation: values + issues ---------------- */
export function evaluate(sources, work, settings) {
  const L = settings.limits, issues = [];
  const vals = { trees: [], plots: [] };
  const cols = t => sources[t] ? sources[t].headers : [];
  const add = o => {
    const id = o.id || `${o.code}|${o.table}|${o.rec ?? o.plot ?? ''}|${o.field || ''}`;
    const accepted = o.severity === 'warning' && work.accepted[id] ? work.accepted[id] : null;
    issues.push({ ...o, id, kind: o.severity === 'error' ? 'hard' : o.severity === 'warning' ? 'suspect' : 'note', accepted });
  };
  for (const table of ['trees', 'plots']) {
    for (const rec of work[table]) {
      const v = {};
      for (const fd of FIELDS[table]) if (rec.f[fd.key]) v[fd.key] = valueOf(fd, srcCell(sources, work, table, rec, fd.key), settings);
      vals[table][rec.i] = v;
    }
  }
  const T = work.trees.filter(r => !r.excluded), P = work.plots.filter(r => !r.excluded);
  const head = (table, field, rec) => rec.f[field] ? cols(table)[rec.f[field].col] : '';
  const base = (table, rec, field) => ({ table, rec: rec.i, row: rec.row, field, column: head(table, field, rec), text: currentText(sources, work, table, rec, field) });

  // field-level: format, missing, non-positive, whitespace
  for (const [table, recs] of [['trees', T], ['plots', P]]) {
    for (const rec of recs) {
      const v = vals[table][rec.i];
      for (const fd of FIELDS[table]) {
        if (!rec.f[fd.key]) continue;
        const x = v[fd.key];
        if (x.status === 'bad') add({ ...base(table, rec, fd.key), code: 'num.bad', severity: 'error', category: 'format', params: { reason: x.reason } });
        else if (x.status === 'empty' && fd.req) add({ ...base(table, rec, fd.key), code: 'req.missing', severity: 'error', category: 'missing' });
        else if (x.status === 'ok' && fd.kind === 'num' && fd.key !== 'x' && fd.key !== 'y' && x.value <= 0)
          add({ ...base(table, rec, fd.key), code: 'num.nonpos', severity: 'error', category: 'invalid' });
        if ((fd.kind === 'id' || fd.kind === 'code') && x.status === 'ok' && x.text !== x.text.trim() && !(table === 'trees' && fd.key === 'species'))
          add({ ...base(table, rec, fd.key), code: 'text.space', severity: 'warning', category: 'format', suggestion: { value: x.text.trim() } });
      }
    }
  }
  // tree-level biology (screening thresholds)
  for (const rec of T) {
    const v = vals.trees[rec.i], d = v.dbh && v.dbh.status === 'ok' ? v.dbh.value : null, h = v.height && v.height.status === 'ok' ? v.height.value : null;
    if (d != null && d > 0) {
      if (d < L.dbhMin || d > L.dbhMax) add({ ...base('trees', rec, 'dbh'), code: 'dbh.range', severity: 'warning', category: 'biological', params: { value: d, min: L.dbhMin, max: L.dbhMax } });
    }
    if (h != null && h > 0) {
      if (d != null && d > 0 && h < 1.3) add({ ...base('trees', rec, 'height'), code: 'h.belowbh', severity: 'warning', category: 'biological', params: { value: h } });
      else if (h < L.hMin || h > L.hMax) add({ ...base('trees', rec, 'height'), code: 'h.range', severity: 'warning', category: 'biological', params: { value: h, min: L.hMin, max: L.hMax } });
      if (d != null && d > 0) {
        const sl = h / (d / 100);
        if (sl < L.slMin || sl > L.slMax) add({ ...base('trees', rec, 'height'), id: `sl.range|trees|${rec.i}|`, code: 'sl.range', severity: 'warning', category: 'biological', params: { value: sl, min: L.slMin, max: L.slMax, d, h } });
      }
    }
  }
  const txt = (t, rec, k) => { const x = vals[t][rec.i][k]; return x && x.status === 'ok' ? x.value : null; };
  // duplicate composite keys: plot + tree (+ stem) (+ period). Same tree in different periods is NOT a duplicate.
  const keyFields = ['plot_id', 'tree_id', 'stem_id', 'period'].filter(k => work.trees[0] && work.trees[0].f[k]);
  const groups = new Map();
  for (const rec of T) {
    if (txt('trees', rec, 'plot_id') == null || txt('trees', rec, 'tree_id') == null) continue;
    const key = JSON.stringify(keyFields.map(k => txt('trees', rec, k)));
    if (!groups.has(key)) groups.set(key, []); groups.get(key).push(rec);
  }
  groups.forEach(g => {
    if (g.length < 2) return;
    for (const rec of g) add({ ...base('trees', rec, 'tree_id'), code: 'key.dup', severity: 'error', category: 'duplicate', params: { keyFields, key: keyFields.map(k => txt('trees', rec, k)), rows: g.filter(r => r !== rec).map(r => r.row) } });
  });
  // species: case/space variants of the same code, and species changing between periods of one tree
  if (work.trees[0] && work.trees[0].f.species) {
    const variants = new Map();
    for (const rec of T) { const s = txt('trees', rec, 'species'); if (s == null) continue; const k = s.trim().toLocaleUpperCase('tr'); if (!variants.has(k)) variants.set(k, new Map()); const m = variants.get(k); m.set(s, (m.get(s) || 0) + 1); }
    const canon = new Map();
    variants.forEach((m, k) => { let best = null, bc = -1; m.forEach((c, s) => { const clean = s === s.trim(); if (c > bc || (c === bc && clean && best !== best.trim())) { bc = c; best = s; } }); canon.set(k, { best: best.trim(), n: m.size, all: [...m.keys()] }); });
    for (const rec of T) {
      const s = txt('trees', rec, 'species'); if (s == null) continue;
      const c = canon.get(s.trim().toLocaleUpperCase('tr'));
      if (s !== c.best) add({ ...base('trees', rec, 'species'), code: c.n > 1 ? 'sp.variant' : 'text.space', severity: 'warning', category: c.n > 1 ? 'consistency' : 'format', params: { variants: c.all }, suggestion: { value: c.best } });
    }
    const byTree = new Map();
    for (const rec of T) {
      if (txt('trees', rec, 'plot_id') == null || txt('trees', rec, 'tree_id') == null) continue;
      const k = JSON.stringify(['plot_id', 'tree_id', 'stem_id'].map(f => txt('trees', rec, f)));
      if (!byTree.has(k)) byTree.set(k, []); byTree.get(k).push(rec);
    }
    byTree.forEach(g => {
      const sp = new Set(g.map(r => { const s = txt('trees', r, 'species'); return s == null ? null : s.trim().toLocaleUpperCase('tr'); }).filter(Boolean));
      if (sp.size > 1 && keyFields.includes('period')) for (const rec of g)
        add({ ...base('trees', rec, 'species'), code: 'sp.change', severity: 'warning', category: 'consistency', params: { values: [...sp], rows: g.filter(r => r !== rec).map(r => r.row) } });
    });
  }
  // plots: duplicates in plot table, references, area and stratum agreement, empty plots
  const plotRows = new Map();
  for (const rec of P) { const id = txt('plots', rec, 'plot_id'); if (id == null) continue; if (!plotRows.has(id)) plotRows.set(id, []); plotRows.get(id).push(rec); }
  plotRows.forEach(g => { if (g.length > 1) for (const rec of g) add({ ...base('plots', rec, 'plot_id'), code: 'plot.dup', severity: 'error', category: 'duplicate', params: { rows: g.filter(r => r !== rec).map(r => r.row) } }); });
  const hasPlotTable = !!sources.plots;
  const treePlots = new Map();
  for (const rec of T) { const id = txt('trees', rec, 'plot_id'); if (id == null) continue; if (!treePlots.has(id)) treePlots.set(id, []); treePlots.get(id).push(rec); }
  if (hasPlotTable) for (const rec of T) { const id = txt('trees', rec, 'plot_id'); if (id != null && !plotRows.has(id)) add({ ...base('trees', rec, 'plot_id'), code: 'plot.unknown', severity: 'error', category: 'reference' }); }
  const allPlots = new Set([...plotRows.keys(), ...treePlots.keys()]);
  const plotsOut = [];
  for (const id of allPlots) {
    const areas = [], strata = [];
    for (const rec of plotRows.get(id) || []) {
      const a = vals.plots[rec.i].plot_area; if (a && a.status === 'ok' && a.value > 0) areas.push({ v: a.value, table: 'plots', rec: rec.i, row: rec.row });
      const s = vals.plots[rec.i].stratum; if (s && s.status === 'ok') strata.push({ v: s.value.trim(), table: 'plots', rec: rec.i, row: rec.row });
    }
    for (const rec of treePlots.get(id) || []) {
      const a = vals.trees[rec.i].plot_area; if (a && a.status === 'ok' && a.value > 0) areas.push({ v: a.value, table: 'trees', rec: rec.i, row: rec.row });
      const s = vals.trees[rec.i].stratum; if (s && s.status === 'ok') strata.push({ v: s.value.trim(), table: 'trees', rec: rec.i, row: rec.row });
    }
    const da = distinct(areas, (a, b) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a)));
    const ds = distinct(strata, (a, b) => a === b);
    if (da.length > 1) add({ table: 'plot', plot: id, field: 'plot_area', code: 'area.conflict', severity: 'error', category: 'conflict',
      params: { plot: id, values: da.map(x => ({ value: x.v, rows: x.items.map(i => ({ table: i.table, row: i.row })) })) }, choices: da.map(x => x.v) });
    if (ds.length > 1) add({ table: 'plot', plot: id, field: 'stratum', code: 'stratum.conflict', severity: 'error', category: 'conflict',
      params: { plot: id, values: ds.map(x => ({ value: x.v, rows: x.items.map(i => ({ table: i.table, row: i.row })) })) }, choices: ds.map(x => x.v) });
    if (!da.length && (!hasPlotTable || plotRows.has(id))) add({ table: 'plot', plot: id, field: 'plot_area', code: 'area.none', severity: 'error', category: 'missing', params: { plot: id } });
    const nTrees = (treePlots.get(id) || []).length;
    if (plotRows.has(id) && nTrees === 0) add({ table: 'plot', plot: id, field: 'plot_id', code: 'plot.empty', severity: 'info', category: 'info', params: { plot: id } });
    plotsOut.push({ plot_id: id, plot_area: da.length === 1 ? da[0].v : null, stratum: ds.length === 1 ? ds[0].v : null,
      area_source: da.length ? [...new Set(areas.map(a => a.table))].join('+') : null, n_records: nTrees, in_plot_table: plotRows.has(id) });
  }
  plotsOut.sort((a, b) => a.plot_id < b.plot_id ? -1 : a.plot_id > b.plot_id ? 1 : 0);
  // summary
  const open = issues.filter(i => !i.accepted);
  const count = (arr, sev) => arr.filter(i => i.severity === sev).length;
  const periods = new Set(), species = new Set();
  for (const rec of T) { const p = txt('trees', rec, 'period'); if (p != null) periods.add(p); const s = txt('trees', rec, 'species'); if (s != null) species.add(s); }
  const summary = {
    records: work.trees.length, excluded: work.trees.length - T.length, plotRecords: work.plots.length, plotExcluded: work.plots.length - P.length,
    plots: plotsOut.length, emptyPlots: plotsOut.filter(p => p.in_plot_table && p.n_records === 0).length,
    periods: periods.size, species: species.size,
    errors: count(issues, 'error'), warnings: count(issues, 'warning'), warningsOpen: count(open, 'warning'), infos: count(issues, 'info'),
    byCategory: Object.fromEntries([...new Set(issues.map(i => i.category))].map(c => [c, issues.filter(i => i.category === c).length])),
    hardErrors: issues.filter(i => i.severity === 'error' && HARD.has(i.category)).length,
  };
  summary.approvable = summary.errors === 0 && T.length > 0;
  return { vals, issues, plots: plotsOut, summary };
}
function distinct(items, eq) {
  const out = [];
  for (const it of items) { const g = out.find(o => eq(o.v, it.v)); if (g) g.items.push(it); else out.push({ v: it.v, items: [it] }); }
  return out;
}

/* ---------------- user actions (each one is logged) ---------------- */
function log(work, e) { work.seq += 1; const entry = { seq: work.seq, time: new Date().toISOString(), ...e }; work.changelog.push(entry); return entry; }
export function editField(sources, work, table, i, field, newText, reason, issueCode = null) {
  const rec = work[table][i]; if (!rec || !rec.f[field]) throw new Error('no-field');
  if (!reason || !String(reason).trim()) throw new Error('reason-required');
  const old = currentText(sources, work, table, rec, field);
  if (old === newText) return null;
  work.edits[ek(table, i, field)] = String(newText);
  return log(work, { action: 'edit', table, row: rec.row, field, column: sources[table].headers[rec.f[field].col], old, new: String(newText), reason: String(reason).trim(), issue: issueCode });
}
export function setExcluded(work, table, i, excluded, reason) {
  const rec = work[table][i]; if (!rec) throw new Error('no-record');
  if (!reason || !String(reason).trim()) throw new Error('reason-required');
  if (rec.excluded === excluded) return null;
  rec.excluded = excluded;
  return log(work, { action: excluded ? 'exclude' : 'include', table, row: rec.row, field: null, old: null, new: null, reason: String(reason).trim() });
}
export function acceptIssue(work, issue, reason) {
  if (issue.severity !== 'warning') throw new Error('only-warnings');
  if (!reason || !String(reason).trim()) throw new Error('reason-required');
  work.accepted[issue.id] = { reason: String(reason).trim(), time: new Date().toISOString() };
  return log(work, { action: 'accept', table: issue.table, row: issue.row ?? null, field: issue.field || null, old: issue.text ?? null, new: issue.text ?? null, reason: String(reason).trim(), issue: issue.code });
}
export function unacceptIssue(work, issue, reason) {
  if (!work.accepted[issue.id]) return null;
  delete work.accepted[issue.id];
  return log(work, { action: 'unaccept', table: issue.table, row: issue.row ?? null, field: issue.field || null, old: null, new: null, reason: String(reason || '').trim(), issue: issue.code });
}
/** Plot-level conflict: write the chosen value (internal units) into every involved record that differs. */
export function applyChoice(sources, work, issue, chosen, reason, settings) {
  const out = [];
  for (const g of issue.params.values) {
    if (issue.field === 'plot_area' ? Math.abs(g.value - chosen) <= 1e-9 * Math.max(1, chosen) : g.value === chosen) continue;
    for (const r of g.rows) {
      const rec = work[r.table].find(x => x.row === r.row && !x.excluded);
      if (!rec) continue;
      const text = issue.field === 'plot_area' ? internalToText('area', chosen, settings) : chosen;
      const e = editField(sources, work, r.table, rec.i, issue.field, text, reason, issue.code); if (e) out.push(e);
    }
  }
  return out;
}

/* ---------------- approval: the dataset other tools read (docs/PROJECT.md §4b) ---------------- */
export function approve(sources, work, mapping, settings, ev, meta = {}) {
  if (!ev.summary.approvable) throw new Error('not-approvable');
  const v = ev.vals, pick = (x) => x && x.status === 'ok' ? x.value : null;
  const trees = [], derivedTrees = [];
  for (const rec of work.trees) {
    if (rec.excluded) continue;
    const x = v.trees[rec.i], o = { row: rec.row };
    for (const fd of TREE_FIELDS) if (fd.key !== 'plot_area') o[fd.key] = x[fd.key] ? pick(x[fd.key]) : null;
    o.extra = rec.extra;
    trees.push(o);
    derivedTrees.push({ row: rec.row, basal_area_m2: o.dbh != null ? Math.PI / 4 * (o.dbh / 100) ** 2 : null });
  }
  const plots = ev.plots.map(p => ({ plot_id: p.plot_id, plot_area: p.plot_area, stratum: p.stratum, area_source: p.area_source, n_records: p.n_records }));
  const derivedPlots = plots.map(p => ({ plot_id: p.plot_id, expansion_factor: p.plot_area ? 10000 / p.plot_area : null }));
  const hdr = t => sources[t] ? sources[t].headers : [];
  return {
    schema: SCHEMA, created: new Date().toISOString(), tool: TOOL,
    units: { dbh: 'cm', height: 'm', plot_area: 'm2', x: 'm', y: 'm', age: 'yr' },
    source: {
      trees: sources.trees && { name: sources.trees.name, kind: sources.trees.kind, meta: sources.trees.meta, records: sources.trees.rows.length },
      plots: sources.plots && { name: sources.plots.name, kind: sources.plots.kind, meta: sources.plots.meta, records: sources.plots.rows.length },
      mapping: Object.fromEntries(['trees', 'plots'].map(t => [t, Object.fromEntries(Object.entries(mapping[t] || {}).map(([k, c]) => [k, hdr(t)[c]]))])),
      settings: { decimal: settings.decimal, units: settings.units, limits: settings.limits },
      ...meta,
    },
    plots, trees,
    derived: { note: 'Computed from approved values; not part of the measured data.', trees: derivedTrees, plots: derivedPlots },
    warnings: ev.issues.filter(i => i.severity === 'warning').map(i => ({ code: i.code, table: i.table, row: i.row ?? null, plot: i.plot ?? null, field: i.field, accepted: i.accepted ? i.accepted.reason : null })),
    excluded: work.trees.filter(r => r.excluded).map(r => r.row),
    changelog: work.changelog,
  };
}
