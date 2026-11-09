// Forest Data Checker: user interface. All checking logic lives in calc.js.
import * as C from './calc.js';
import { T } from './i18n.js';
import { lang, fmtNum, esc } from '../core/i18n.js';
import { tableFromText, tableFromSheet, detectDelimiter, decodeBytes, utf8Suspicious, cellText } from '../core/table.js';
import { parseNumber, UNITS } from '../core/num.js';
import { put, get, del } from '../core/store.js';
import { csvText, download, downloadCSV, downloadJSON, xlsxBlob, loadXLSX, XLSX_READ_OPTS } from '../core/export.js';

const BASE = './', KEY = 'session:' + C.TOOL.id, PAGE = 200;
const $ = id => document.getElementById(id);
const UNIT_LABEL = { cm: 'cm', mm: 'mm', m: 'm', dm: 'dm', m2: 'm²', ha: 'ha' };
const SEV_RANK = { info: 1, warning: 2, error: 3 };
const DELIM_NAME = { ',': lang === 'tr' ? 'virgül' : 'comma', ';': lang === 'tr' ? 'noktalı virgül' : 'semicolon', '\t': lang === 'tr' ? 'sekme' : 'tab', '|': '|' };

let S = blank(), ev = null, approvedDs = null, view = { flt: { sev: 'all', cat: 'all', open: true, q: '' }, lim: PAGE, dlim: PAGE, dtable: 'trees', donly: false };
function blank() {
  return { v: 1, step: 1, tab: 'summary', srcVer: 0, workSrcVer: -1, imports: { trees: null, plots: null }, sources: {},
    mapping: { trees: {}, plots: {} }, unitHints: {}, decimalChosen: false,
    settings: { decimal: null, units: { ...C.DEFAULT_UNITS }, limits: { ...C.DEFAULT_LIMITS } }, work: null, approved: null };
}

/* ---------------- persistence ---------------- */
let saveT = null;
function save() { clearTimeout(saveT); saveT = setTimeout(flush, 250); }
async function flush() { clearTimeout(saveT); saveT = null; await put(KEY, { ...S, saved: new Date().toISOString() }); }
$('langlink') && $('langlink').addEventListener('click', async e => {
  e.preventDefault(); const href = e.currentTarget.href; await flush(); location.href = href;
});
function status(msg, kind = '') { const s = $('status'); s.className = 'status ' + kind; s.textContent = msg || ''; }

/* ---------------- step 1: data ---------------- */
async function readImport(table) {
  const imp = S.imports[table];
  if (!imp) { delete S.sources[table]; return; }
  imp.warn = null;
  if (imp.kind === 'xlsx') {
    status(T('xlsx.loading'));
    let XLSX;
    try { XLSX = await loadXLSX(BASE); } catch (e) { status(T('xlsx.fail'), 'err'); throw e; }
    const wb = XLSX.read(new Uint8Array(imp.buf), XLSX_READ_OPTS);
    imp.sheets = wb.SheetNames;
    if (!imp.sheet || !wb.SheetNames.includes(imp.sheet)) imp.sheet = wb.SheetNames[0];
    S.sources[table] = tableFromSheet(XLSX, wb.Sheets[imp.sheet], { header: imp.header, name: imp.name, sheet: imp.sheet });
    status('');
  } else {
    const text = imp.kind === 'paste' ? imp.text : decodeBytes(new Uint8Array(imp.buf), imp.encoding);
    if (imp.kind !== 'paste' && imp.encoding === 'utf-8' && utf8Suspicious(new Uint8Array(imp.buf))) imp.warn = 'enc.warn';
    imp.detected = detectDelimiter(text).delim;
    S.sources[table] = tableFromText(text, { delim: imp.delim || imp.detected, header: imp.header, kind: imp.kind, name: imp.name });
  }
  const sug = C.suggestMapping(S.sources[table].headers, C.FIELDS[table]);
  S.mapping[table] = sug.map;
  if (table === 'trees' || table === 'plots') for (const [k, u] of Object.entries(sug.units)) { S.unitHints[k] = u; S.settings.units[k] = u; }
  S.srcVer++; S.decimalChosen = false; S.settings.decimal = null;
}
async function setImport(table, imp) {
  S.imports[table] = imp;
  try { await readImport(table); }
  catch (e) { S.imports[table] = null; delete S.sources[table]; status(T('read.fail') + ' ' + (e.message || ''), 'err'); }
  ev = null; save(); render();
}
async function onFile(table, file) {
  if (!file) return;
  const name = file.name, ext = name.toLowerCase().split('.').pop();
  if (ext === 'xls') { status(T('xlsx.only'), 'err'); return; }
  const buf = await file.arrayBuffer();
  const isZip = new Uint8Array(buf.slice(0, 2)).join() === '80,75';   // "PK": an XLSX package
  await setImport(table, { kind: ext === 'xlsx' || ext === 'xlsm' || isZip ? 'xlsx' : 'csv', name, buf, encoding: 'utf-8', delim: null, header: true, sheet: null });
}
async function loadSample() {
  const tag = lang === 'tr' ? ' (örnek)' : ' (sample)';
  for (const [table, f] of [['trees', 'agaclar.csv'], ['plots', 'ornek-alanlar.csv']]) {
    const buf = await (await fetch(BASE + 'assets/lab/checker/ornek/' + f)).arrayBuffer();
    S.imports[table] = { kind: 'csv', name: f + tag, buf, encoding: 'utf-8', delim: null, header: true, sheet: null };
    await readImport(table);
  }
  ev = null; save(); render();
}
function importPanel(table) {
  const imp = S.imports[table], src = S.sources[table], req = table === 'trees';
  let h = `<div class="card imp" data-table="${table}"><h2>${T(table + '.h')} <span class="tag ${req ? 'req' : ''}">${T(req ? 'req' : 'opt')}</span></h2><p class="muted">${T(table + '.sub')}</p>`;
  h += `<div class="imp-in"><label class="filebtn"><input type="file" accept=".csv,.txt,.tsv,.xlsx,.xlsm,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" data-act="file"><span>${T('file')}</span></label>
    <details${imp && imp.kind === 'paste' ? ' open' : ''}><summary>${T('paste')}</summary><textarea rows="5" spellcheck="false" data-act="pastebox">${imp && imp.kind === 'paste' ? esc(imp.text) : ''}</textarea>
    <button type="button" class="btn small" data-act="paste">${T('paste.take')}</button></details></div>`;
  if (imp && src) {
    h += `<div class="imp-opts"><strong class="fname">${esc(imp.name)}</strong>`;
    if (imp.kind === 'xlsx') {
      h += `<label>${T('sheet')} <select data-act="sheet">${(imp.sheets || []).map(s => `<option${s === imp.sheet ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select></label>`;
    } else {
      h += `<label>${T('delim')} <select data-act="delim"><option value="">${T('delim.auto', { d: DELIM_NAME[imp.detected] })}</option>${Object.entries(DELIM_NAME).map(([d, nm]) => `<option value="${esc(d)}"${imp.delim === d ? ' selected' : ''}>${nm}</option>`).join('')}</select></label>`;
      if (imp.kind === 'csv') h += `<label>${T('enc')} <select data-act="enc">${['utf-8', 'windows-1254', 'iso-8859-9'].map(e => `<option${imp.encoding === e ? ' selected' : ''}>${e}</option>`).join('')}</select></label>`;
    }
    h += `<label class="chk"><input type="checkbox" data-act="header"${imp.header ? ' checked' : ''}> ${T('header')}</label>
      <button type="button" class="btn ghost small" data-act="clear">${T('clear')}</button></div>`;
    if (imp.warn) h += `<p class="note warn">${T(imp.warn)}</p>`;
    if (imp.kind === 'xlsx') h += `<p class="note">${T('xlsx.note')}</p>`;
    h += preview(src);
  }
  return h + '</div>';
}
function preview(src, k = 8) {
  const rows = src.rows.slice(0, k);
  return `<p class="muted small">${T('preview', { k: rows.length, n: src.rows.length, c: src.headers.length })}</p>
  <div class="tscroll"><table class="grid"><thead><tr><th>${T('rowno')}</th>${src.headers.map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead>
  <tbody>${rows.map((r, i) => `<tr><td class="rn">${src.rowNumbers[i]}</td>${r.map(c => `<td>${vis(cellText(c))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
/** Shows leading/trailing spaces so "001 " is visibly different from "001". */
function vis(s) { const t = String(s ?? ''); return esc(t).replace(/^( +)|( +)$/g, m => `<span class="sp" title="space">${'·'.repeat(m.length)}</span>`); }
function renderStep1() {
  const el = $('step1');
  el.innerHTML = `<div class="two">${importPanel('trees')}${importPanel('plots')}</div>
  <div class="card sample"><button type="button" class="btn ghost" id="sample">${T('sample')}</button>
    <span class="muted small">${T('sample.note')} <a href="${BASE}assets/lab/checker/ornek/agaclar.csv" download>agaclar.csv</a>, <a href="${BASE}assets/lab/checker/ornek/ornek-alanlar.csv" download>ornek-alanlar.csv</a></span></div>
  <div class="nav"><button type="button" class="btn ghost" id="reset">${T('reset')}</button><button type="button" class="btn" id="to2"${S.sources.trees ? '' : ' disabled'}>${T('next')}</button>
  ${S.sources.trees ? '' : `<span class="muted small">${T('need.trees')}</span>`}</div>`;
  el.querySelectorAll('.imp').forEach(p => {
    const table = p.dataset.table, imp = S.imports[table];
    const q = a => p.querySelector(`[data-act="${a}"]`);
    q('file').addEventListener('change', e => onFile(table, e.target.files[0]));
    q('paste').addEventListener('click', () => { const text = q('pastebox').value; if (text.trim()) setImport(table, { kind: 'paste', name: lang === 'tr' ? 'yapıştırılan tablo' : 'pasted table', text, delim: null, header: true }); });
    if (!imp || !S.sources[table]) return;
    q('header').addEventListener('change', e => { imp.header = e.target.checked; setImport(table, imp); });
    q('clear').addEventListener('click', () => { S.imports[table] = null; delete S.sources[table]; S.mapping[table] = {}; S.srcVer++; ev = null; save(); render(); });
    q('sheet') && q('sheet').addEventListener('change', e => { imp.sheet = e.target.value; setImport(table, imp); });
    q('delim') && q('delim').addEventListener('change', e => { imp.delim = e.target.value || null; setImport(table, imp); });
    q('enc') && q('enc').addEventListener('change', e => { imp.encoding = e.target.value; setImport(table, imp); });
  });
  $('sample').addEventListener('click', loadSample);
  $('reset').addEventListener('click', async () => { if (!confirm(T('reset.q'))) return; S = blank(); ev = null; status(''); render(); await del(KEY); });
  $('to2').addEventListener('click', () => go(2));
}

/* ---------------- step 2: mapping, units, decimal ---------------- */
function fieldName(table, key) { return T('f.' + key); }
function colValues(table, field, k = 3) {
  const c = S.mapping[table][field], src = S.sources[table];
  if (c == null || !src) return [];
  return src.rows.slice(0, k).map(r => cellText(r[c]));
}
function unitStats(kind) {
  const keyFor = { dbh: [['trees', 'dbh']], height: [['trees', 'height']], area: [['trees', 'plot_area'], ['plots', 'plot_area']] }[kind];
  const vals = [];
  for (const [t, f] of keyFor) {
    const c = S.mapping[t] && S.mapping[t][f]; if (c == null || !S.sources[t]) continue;
    for (const r of S.sources[t].rows) {
      const cell = r[c]; let v = null;
      if (cell && cell.t === 'n') v = cell.v;
      else if (cell && cell.t === 's' && S.settings.decimal) { const p = parseNumber(cell.v, S.settings.decimal); if (p.status === 'ok') v = p.value; }
      if (v != null) vals.push(v * UNITS[kind][S.settings.units[kind]]);
    }
  }
  if (!vals.length) return '';
  vals.sort((a, b) => a - b);
  const m = vals.length, med = m % 2 ? vals[(m - 1) / 2] : (vals[m / 2 - 1] + vals[m / 2]) / 2;
  return T('u.stats', { k: m, min: vals[0], med, max: vals[m - 1], u: { dbh: 'cm', height: 'm', area: 'm²' }[kind] });
}
function decimalEvidence() {
  const d = C.decimalEvidence(S.sources, S.mapping);
  if (!S.decimalChosen) S.settings.decimal = d.verdict === 'dot' ? '.' : d.verdict === 'comma' ? ',' : null;
  return d;
}
function decimalBlock(d) {
  let msg = '', cls = '';
  if (d.verdict === 'dot' || d.verdict === 'comma' || d.verdict === 'none') msg = T('dec.v.' + d.verdict);
  if (d.verdict === 'ambiguous') { msg = T('dec.v.ambiguous', { ex: d.examples.ambiguous.map(x => `"${x}"`).join(', ') }); cls = 'warn'; }
  if (d.verdict === 'conflict') { msg = T('dec.v.conflict', { d: d.examples.dot.join(', '), c: d.examples.comma.join(', ') }); cls = 'warn'; }
  return `<div class="card"><h2>${T('dec.h')}</h2><p class="muted">${T('dec.sub')}</p>
    <p class="small">${T('dec.ev', d)}</p><p class="note ${cls}">${esc(msg)}</p>
    <div class="radios" role="radiogroup" aria-label="${T('dec.h')}">
      <label><input type="radio" name="dec" value="."${S.settings.decimal === '.' ? ' checked' : ''}> ${T('dec.dot')}</label>
      <label><input type="radio" name="dec" value=","${S.settings.decimal === ',' ? ' checked' : ''}> ${T('dec.comma')}</label></div>
    ${S.settings.decimal ? '' : `<p class="note err">${T('dec.choose')}</p>`}</div>`;
}
function mapProblems() {
  return C.mappingProblems(S.sources, S.mapping).map(p => T('mp.' + p.code, { tableName: p.table ? T('t.' + p.table) : '', fieldName: p.field ? fieldName(p.table, p.field) : '', otherName: p.other ? fieldName(p.table, p.other) : '' }));
}
function renderStep2() {
  const el = $('step2'), dec = decimalEvidence();
  let h = `<div class="card"><h2>${T('map.h')}</h2><p class="muted">${T('map.sub')}</p>`;
  for (const table of ['trees', 'plots']) {
    const src = S.sources[table]; if (!src) continue;
    h += `<h3>${T('t.' + table)} <span class="muted small">${esc(src.name)}</span></h3><div class="maps">`;
    for (const f of C.FIELDS[table]) {
      const req = f.req && !(table === 'trees' && f.key === 'plot_area'), c = S.mapping[table][f.key];
      h += `<label class="map"><span class="ml">${fieldName(table, f.key)} <span class="tag ${req ? 'req' : ''}">${T(req ? 'req' : 'opt')}</span></span>
        <select data-table="${table}" data-field="${f.key}"><option value="">${T('map.none')}</option>${src.headers.map((x, i) => `<option value="${i}"${c === i ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>
        <span class="mv">${c != null ? colValues(table, f.key).map(v => `<code>${vis(v)}</code>`).join(' ') : ''}</span></label>`;
    }
    h += '</div>';
  }
  h += '</div>';
  const needs = { dbh: S.mapping.trees.dbh != null, height: S.mapping.trees.height != null, area: S.mapping.trees.plot_area != null || (S.mapping.plots && S.mapping.plots.plot_area != null) };
  h += `<div class="card"><h2>${T('units.h')}</h2><p class="muted">${T('units.sub')}</p><div class="units">`;
  for (const kind of ['dbh', 'height', 'area']) {
    if (!needs[kind]) continue;
    h += `<label class="unit"><span>${T('u.' + kind)}</span><select data-unit="${kind}">${Object.keys(UNITS[kind]).map(u => `<option value="${u}"${S.settings.units[kind] === u ? ' selected' : ''}>${UNIT_LABEL[u]}</option>`).join('')}</select>
      ${S.unitHints[kind === 'area' ? 'plot_area' : kind] || S.unitHints[kind] ? `<span class="muted small">${T('u.from')}</span>` : ''}<span class="small">${unitStats(kind)}</span></label>`;
  }
  h += '</div></div>' + decimalBlock(dec);
  const probs = mapProblems();
  if (probs.length) h += `<div class="card"><ul class="probs">${probs.map(p => `<li class="note err">${esc(p)}</li>`).join('')}</ul></div>`;
  h += `<div class="nav"><button type="button" class="btn ghost" id="back1">${T('back')}</button><button type="button" class="btn" id="to3"${probs.length || !S.settings.decimal ? ' disabled' : ''}>${T('next')}</button></div>`;
  el.innerHTML = h;
  el.querySelectorAll('select[data-field]').forEach(s => s.addEventListener('change', () => {
    const t = s.dataset.table, f = s.dataset.field;
    if (s.value === '') delete S.mapping[t][f]; else S.mapping[t][f] = +s.value;
    ev = null; save(); renderStep2(); renderSteps();
  }));
  el.querySelectorAll('select[data-unit]').forEach(s => s.addEventListener('change', () => { S.settings.units[s.dataset.unit] = s.value; save(); renderStep2(); }));
  el.querySelectorAll('input[name="dec"]').forEach(r => r.addEventListener('change', () => { S.settings.decimal = r.value; S.decimalChosen = true; save(); renderStep2(); renderSteps(); }));
  $('back1').addEventListener('click', () => go(1));
  $('to3').addEventListener('click', () => go(3));
}

/* ---------------- step 3: limits and run ---------------- */
function renderStep3() {
  const L = S.settings.limits, el = $('step3');
  const pair = (lbl, a, b) => `<fieldset class="lim"><legend>${T(lbl)}</legend>
    <label>${T('lim.min')} <input type="number" step="any" min="0" data-lim="${a}" value="${L[a]}"></label>
    <label>${T('lim.max')} <input type="number" step="any" min="0" data-lim="${b}" value="${L[b]}"></label></fieldset>`;
  el.innerHTML = `<div class="card"><h2>${T('lim.h')}</h2><p class="muted">${T('lim.sub')}</p>
    <div class="lims">${pair('lim.dbh', 'dbhMin', 'dbhMax')}${pair('lim.h2', 'hMin', 'hMax')}${pair('lim.sl', 'slMin', 'slMax')}</div>
    <p id="limerr" class="note err" hidden>${T('lim.bad')}</p>
    <button type="button" class="btn ghost small" id="limdef">${T('lim.default')}</button></div>
    <div class="nav"><button type="button" class="btn ghost" id="back2">${T('back')}</button><button type="button" class="btn" id="run">${T('run')}</button></div>`;
  el.querySelectorAll('input[data-lim]').forEach(i => i.addEventListener('input', () => {
    const v = parseFloat(i.value); if (Number.isFinite(v)) S.settings.limits[i.dataset.lim] = v; checkLimits(); save();
  }));
  $('limdef').addEventListener('click', () => { S.settings.limits = { ...C.DEFAULT_LIMITS }; save(); renderStep3(); });
  $('back2').addEventListener('click', () => go(2));
  $('run').addEventListener('click', run);
}
function checkLimits() {
  const L = S.settings.limits, ok = [['dbhMin', 'dbhMax'], ['hMin', 'hMax'], ['slMin', 'slMax']].every(([a, b]) => L[a] >= 0 && L[b] > 0 && L[a] < L[b]);
  if ($('limerr')) $('limerr').hidden = ok; if ($('run')) $('run').disabled = !ok;
  return ok;
}
function run() {
  if (!checkLimits()) return;
  const fresh = C.buildWork(S.sources, S.mapping);
  if (S.work && S.workSrcVer === S.srcVer) {           // same source: keep fixes, exclusions, acceptances and the log
    for (const t of ['trees', 'plots']) fresh[t].forEach((r, i) => { if (S.work[t][i]) r.excluded = S.work[t][i].excluded; });
    Object.assign(fresh, { edits: S.work.edits, accepted: S.work.accepted, changelog: S.work.changelog, seq: S.work.seq });
  }
  S.work = fresh; S.workSrcVer = S.srcVer;
  reeval(); S.tab = 'summary'; go(4);
}
function reeval() { ev = C.evaluate(S.sources, S.work, S.settings); }

/* ---------------- step 4: results ---------------- */
const TABS = ['summary', 'issues', 'data', 'plots', 'log', 'approve'];
function sig() { return JSON.stringify([S.srcVer, S.work && S.work.seq, S.settings, S.mapping]); }
function msg(i) { return T('m.' + i.code, i.params || {}); }
function sevBadge(s) { return `<span class="sev sev-${s}"><i aria-hidden="true"></i>${T('sev.' + s)}</span>`; }
function where(i) { return i.table === 'plot' ? T('where.plot', { p: esc(i.plot) }) : T('where.row', { t: T('t.' + i.table), r: i.row }); }
function renderStep4() {
  if (!ev) { if (S.work) reeval(); else { go(3); return; } }
  const el = $('step4'), s = ev.summary;
  const tabs = `<div class="tabs" role="tablist">${TABS.map(t => `<button type="button" role="tab" id="tab-${t}" aria-selected="${S.tab === t}" aria-controls="panel" data-tab="${t}">${T('tab.' + t)}${t === 'issues' ? ` <span class="cnt">${s.errors + s.warningsOpen}</span>` : ''}</button>`).join('')}</div>`;
  el.innerHTML = `${tabs}<div id="panel" class="panel" role="tabpanel" aria-labelledby="tab-${S.tab}"></div>
    <div class="nav"><button type="button" class="btn ghost" id="back3">${T('back')}</button></div>`;
  el.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { S.tab = b.dataset.tab; save(); renderStep4(); }));
  el.querySelector('.tabs').addEventListener('keydown', e => {
    const i = TABS.indexOf(S.tab), d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return; S.tab = TABS[(i + d + TABS.length) % TABS.length]; renderStep4(); $('tab-' + S.tab).focus();
  });
  $('back3').addEventListener('click', () => go(3));
  ({ summary: tabSummary, issues: tabIssues, data: tabData, plots: tabPlots, log: tabLog, approve: tabApprove })[S.tab]($('panel'));
}
function tabSummary(p) {
  const s = ev.summary, L = S.settings.limits;
  const tile = (n, lbl, sub = '', cls = '') => `<div class="tile ${cls}"><b>${fmtNum(n, 0)}</b><span>${lbl}</span>${sub ? `<em>${sub}</em>` : ''}</div>`;
  p.innerHTML = `<div class="tiles">
    ${tile(s.records - s.excluded, T('sum.records'), s.excluded ? `${fmtNum(s.excluded, 0)} ${T('sum.excluded')}` : '')}
    ${tile(s.plots, T('sum.plots'), s.emptyPlots ? `${s.emptyPlots} ${T('sum.empty')}` : '')}
    ${tile(s.periods, T('sum.periods'))}${tile(s.species, T('sum.species'))}
    ${tile(s.errors, T('sum.errors'), '', s.errors ? 't-error' : 't-ok')}
    ${tile(s.warnings, T('sum.warnings'), `${fmtNum(s.warningsOpen, 0)} ${T('sum.open')}`, s.warningsOpen ? 't-warning' : '')}
    ${tile(s.infos, T('sum.infos'), '', 't-info')}</div>
    <p class="note ${s.approvable ? 'ok' : 'err'}">${s.approvable ? T('sum.ok') : T('sum.notok', { e: s.errors })}</p>
    <div class="two"><div><h3>${T('sum.bycat')}</h3><table class="grid kv">${Object.entries(s.byCategory).map(([c, n]) => `<tr><th>${T('cat.' + c)}</th><td class="num">${fmtNum(n, 0)}</td></tr>`).join('') || '<tr><td>–</td></tr>'}</table></div>
    <div><h3>${T('sum.settings')}</h3><table class="grid kv">${settingsRows().map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}</table></div></div>`;
}
function settingsRows() {
  const st = S.settings, L = st.limits, u = st.units;
  return [
    [T('dec.h'), st.decimal === ',' ? T('dec.comma') : T('dec.dot')],
    [T('u.dbh'), UNIT_LABEL[u.dbh]], [T('u.height'), UNIT_LABEL[u.height]], [T('u.area'), UNIT_LABEL[u.area]],
    [T('lim.dbh'), `${fmtNum(L.dbhMin)}–${fmtNum(L.dbhMax)}`], [T('lim.h2'), `${fmtNum(L.hMin)}–${fmtNum(L.hMax)}`], [T('lim.sl'), `${fmtNum(L.slMin)}–${fmtNum(L.slMax)}`],
    ...['trees', 'plots'].filter(t => S.sources[t]).map(t => [T('t.' + t), `${S.sources[t].name} (${S.sources[t].rows.length})`]),
  ];
}
function filtered() {
  const f = view.flt, q = f.q.trim().toLocaleLowerCase(lang);
  return ev.issues.filter(i => (f.sev === 'all' || i.severity === f.sev) && (f.cat === 'all' || i.category === f.cat) && (!f.open || !i.accepted)
    && (!q || String(i.row ?? '') === q || (i.text || '').toLocaleLowerCase(lang).includes(q) || String(i.plot || '').toLocaleLowerCase(lang).includes(q)));
}
function tabIssues(p) {
  const f = view.flt, list = filtered();
  const cats = [...new Set(ev.issues.map(i => i.category))];
  const bulk = {};
  for (const i of ev.issues) if (i.suggestion && i.rec != null && !i.accepted) (bulk[i.code] = bulk[i.code] || []).push(i);
  let h = `<div class="filters">
    <label>${T('flt.sev')} <select id="fsev"><option value="all">${T('flt.all')}</option>${['error', 'warning', 'info'].map(s => `<option value="${s}"${f.sev === s ? ' selected' : ''}>${T('sev.' + s)}</option>`).join('')}</select></label>
    <label>${T('flt.cat')} <select id="fcat"><option value="all">${T('flt.all')}</option>${cats.map(c => `<option value="${c}"${f.cat === c ? ' selected' : ''}>${T('cat.' + c)}</option>`).join('')}</select></label>
    <label class="chk"><input type="checkbox" id="fopen"${f.open ? ' checked' : ''}> ${T('flt.open')}</label>
    <input type="search" id="fq" placeholder="${T('flt.search')}" value="${esc(f.q)}" aria-label="${T('flt.search')}">
    <span class="dl"><button type="button" class="btn ghost small" id="dlissues">${T('ex.issues')} CSV</button></span></div>`;
  const bk = Object.entries(bulk).filter(([, a]) => a.length > 1);
  if (bk.length) h += `<p class="bulk">${bk.map(([code, a]) => `<button type="button" class="btn small" data-bulk="${code}">${T('act.bulk', { k: a.length })} (${T('cat.' + a[0].category)})</button>`).join(' ')}</p>`;
  if (!list.length) h += `<p class="muted">${T('no.issues')}</p>`;
  else {
    h += `<div class="tscroll"><table class="grid issues"><thead><tr><th>${T('col.sev')}</th><th>${T('col.cat')}</th><th>${T('col.where')}</th><th>${T('col.col')}</th><th>${T('col.val')}</th><th>${T('col.msg')}</th><th>${T('col.act')}</th></tr></thead><tbody>`;
    list.slice(0, view.lim).forEach((i, k) => {
      h += `<tr class="${i.accepted ? 'acc' : ''}"><td>${sevBadge(i.severity)}<br><span class="kind">${T('kind.' + i.kind)}</span></td><td>${T('cat.' + i.category)}</td><td class="nowrap">${where(i)}</td>
        <td>${esc(i.column || (i.field ? T('f.' + i.field) : ''))}</td><td>${i.text != null && i.text !== '' ? `<code>${vis(i.text)}</code>` : ''}</td>
        <td>${esc(msg(i))}${i.accepted ? `<br><em class="accn">${esc(T('accepted', { r: i.accepted.reason }))}</em>` : ''}</td><td class="acts">${actions(i, k)}</td></tr>`;
    });
    h += '</tbody></table></div>';
    if (list.length > view.lim) h += `<p class="muted small">${T('more', { k: view.lim, n: list.length })} <button type="button" class="btn ghost small" id="more">${T('show.more')}</button></p>`;
  }
  p.innerHTML = h;
  const upd = () => { view.lim = PAGE; tabIssues(p); };
  $('fsev').addEventListener('change', e => { f.sev = e.target.value; upd(); });
  $('fcat').addEventListener('change', e => { f.cat = e.target.value; upd(); });
  $('fopen').addEventListener('change', e => { f.open = e.target.checked; upd(); });
  $('fq').addEventListener('change', e => { f.q = e.target.value; upd(); });
  $('dlissues').addEventListener('click', () => downloadCSV(fname('sorunlar', 'issues') + '.csv', issueRows(), lang));
  $('more') && $('more').addEventListener('click', () => { view.lim += PAGE; tabIssues(p); });
  p.querySelectorAll('[data-bulk]').forEach(b => b.addEventListener('click', () => bulkDialog(bulk[b.dataset.bulk])));
  p.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => doAction(list[+b.dataset.k], b.dataset.a)));
}
function actions(i, k) {
  const b = (a, label, cls = 'ghost') => `<button type="button" class="btn small ${cls}" data-a="${a}" data-k="${k}">${label}</button>`;
  const out = [];
  if (i.table === 'plot') {
    if (i.code === 'area.conflict' || i.code === 'stratum.conflict') out.push(b('choose', T('act.choose'), ''));
    if (i.code === 'area.none') out.push(b('setarea', T('act.setarea'), ''));
  } else {
    if (i.suggestion && !i.accepted) out.push(b('suggest', T('act.suggest', { v: esc(i.suggestion.value) }), ''));
    if (i.field) out.push(b('edit', T('act.edit')));
    const rec = S.work[i.table][i.rec];
    out.push(b(rec.excluded ? 'include' : 'exclude', T(rec.excluded ? 'act.include' : 'act.exclude')));
  }
  if (i.severity === 'warning') out.push(i.accepted ? b('unaccept', T('act.unaccept')) : b('accept', T('act.accept')));
  return out.join('');
}

/* ---------------- dialogs (every change needs a reason) ---------------- */
function dialog({ title, sub = '', body = '', reason = '', onOk, onInput }) {
  const d = $('dlg');
  d.innerHTML = `<form method="dialog" class="dlg-f"><h2>${title}</h2>${sub ? `<p class="muted">${sub}</p>` : ''}${body}
    <label class="field"><span>${T('dlg.reason')}</span><input type="text" id="dreason" value="${esc(reason)}" maxlength="300" required></label>
    <p class="note err" id="derr" hidden></p>
    <div class="nav"><button type="button" class="btn ghost" id="dcancel">${T('dlg.cancel')}</button><button type="submit" class="btn" id="dok">${T('dlg.ok')}</button></div></form>`;
  const err = m => { $('derr').textContent = m; $('derr').hidden = !m; };
  d.querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    const r = $('dreason').value.trim(); if (!r) { err(T('dlg.need')); $('dreason').focus(); return; }
    const res = onOk(r, d); if (typeof res === 'string') { err(res); return; }
    d.close(); reeval(); save(); render();
  });
  $('dcancel').addEventListener('click', () => d.close());
  d.oninput = onInput ? () => onInput(d) : null;
  d.showModal();
  const first = d.querySelector('#dnew') || d.querySelector('input[name="pick"]') || $('dreason'); first.focus(); if (first.type === 'text') first.select();
  if (onInput) onInput(d);
}
function fieldDef(table, field) { return C.FIELDS[table].find(f => f.key === field); }
function parsedPreview(table, field, text) {
  const fd = fieldDef(table, field); if (fd.kind !== 'num') return '';
  const r = parseNumber(text, S.settings.decimal);
  if (r.status === 'empty') return '';
  if (r.status !== 'ok') return `<span class="bad">${T('dlg.parsebad')}</span>`;
  const v = r.value * UNITS[fd.unit][S.settings.units[fd.unit]];
  return T('dlg.parsed', { v: `${fmtNum(v, 6)} ${{ dbh: 'cm', height: 'm', area: 'm²', xy: 'm' }[fd.unit]}` });
}
function editDialog(table, recI, field, issueCode = null) {
  const rec = S.work[table][recI], old = C.currentText(S.sources, S.work, table, rec, field);
  dialog({
    title: `${T('dlg.edit')}: ${T('t.' + table)}, ${T('rowno').toLocaleLowerCase(lang)} ${rec.row}, ${T('f.' + field)}`,
    body: `<p class="small">${T('dlg.old')}: <code>${vis(old) || '∅'}</code></p>
      <label class="field"><span>${T('dlg.new')}</span><input type="text" id="dnew" value="${esc(old)}" spellcheck="false"></label><p class="small" id="dparsed"></p>`,
    onInput: () => { $('dparsed').innerHTML = parsedPreview(table, field, $('dnew').value); },
    onOk: reason => { const nv = $('dnew').value; if (nv === old) return T('dlg.same'); C.editField(S.sources, S.work, table, recI, field, nv, reason, issueCode); },
  });
}
function doAction(i, a) {
  if (a === 'edit') return editDialog(i.table, i.rec, i.field, i.code);
  if (a === 'suggest') return dialog({ title: T('act.suggest', { v: esc(i.suggestion.value) }), sub: `${where(i)}: <code>${vis(i.text)}</code> → <code>${vis(i.suggestion.value)}</code>`,
    reason: T(i.code === 'sp.variant' ? 'r.unify' : 'r.trim'), onOk: r => { C.editField(S.sources, S.work, i.table, i.rec, i.field, i.suggestion.value, r, i.code); } });
  if (a === 'exclude' || a === 'include') return dialog({ title: `${T(a === 'exclude' ? 'dlg.exclude' : 'dlg.include')}: ${where(i)}`, sub: a === 'exclude' ? T('dlg.exclude.sub') : '',
    onOk: r => { C.setExcluded(S.work, i.table, i.rec, a === 'exclude', r); } });
  if (a === 'accept') return dialog({ title: T('dlg.accept'), sub: `${where(i)}: ${esc(msg(i))}`, onOk: r => { C.acceptIssue(S.work, i, r); } });
  if (a === 'unaccept') return dialog({ title: T('act.unaccept'), sub: `${where(i)}: ${esc(msg(i))}`, onOk: r => { C.unacceptIssue(S.work, i, r); } });
  if (a === 'choose') {
    const isArea = i.field === 'plot_area';
    return dialog({ title: `${T('dlg.choose')}: ${esc(i.plot)}`, sub: T('dlg.choose.sub'),
      body: `<div class="radios col">${i.params.values.map((v, k) => `<label><input type="radio" name="pick" value="${k}"${k === 0 ? ' checked' : ''}> <b>${isArea ? fmtNum(v.value, 6) + ' m²' : esc(v.value)}</b>
        <span class="muted small">(${v.rows.map(r => `${T('t.' + r.table)} ${r.row}`).join(', ')})</span></label>`).join('')}</div>`,
      onOk: r => { const k = +document.querySelector('input[name="pick"]:checked').value; C.applyChoice(S.sources, S.work, i, i.params.values[k].value, r, S.settings); } });
  }
  if (a === 'setarea') {
    const targets = [];
    for (const t of ['plots', 'trees']) for (const rec of S.work[t]) {
      if (rec.excluded || !rec.f.plot_area || !rec.f.plot_id) continue;
      if (C.currentText(S.sources, S.work, t, rec, 'plot_id') === i.plot) targets.push([t, rec.i]);
    }
    const tgt = targets.some(([t]) => t === 'plots') ? targets.filter(([t]) => t === 'plots') : targets;
    return dialog({ title: `${T('dlg.area')}: ${esc(i.plot)} (${UNIT_LABEL[S.settings.units.area]})`,
      body: `<label class="field"><span>${T('dlg.new')}</span><input type="text" id="dnew" inputmode="decimal"></label><p class="small" id="dparsed"></p>`,
      onInput: () => { $('dparsed').innerHTML = parsedPreview('plots', 'plot_area', $('dnew').value); },
      onOk: r => {
        const v = $('dnew').value.trim(), pr = parseNumber(v, S.settings.decimal);
        if (pr.status !== 'ok' || pr.value <= 0) return T('dlg.parsebad');
        for (const [t, ri] of tgt) C.editField(S.sources, S.work, t, ri, 'plot_area', v, r, i.code);
      } });
  }
}
function bulkDialog(list) {
  dialog({ title: T('dlg.bulk'), sub: `${list.length} × ${esc(msg(list[0]))}<br>${list.slice(0, 6).map(i => `<code>${vis(i.text)}</code> → <code>${vis(i.suggestion.value)}</code>`).join(', ')}${list.length > 6 ? ' …' : ''}`,
    reason: T(list[0].code === 'sp.variant' ? 'r.unify' : 'r.trim'),
    onOk: r => { for (const i of list) C.editField(S.sources, S.work, i.table, i.rec, i.field, i.suggestion.value, r, i.code); } });
}

/* ---------------- data, plots, log ---------------- */
function cellIssueIndex() {
  const m = new Map(), up = (k, s) => { if (!m.has(k) || SEV_RANK[s] > SEV_RANK[m.get(k)]) m.set(k, s); };
  const byRow = { trees: new Map(S.work.trees.map(r => [r.row, r.i])), plots: new Map(S.work.plots.map(r => [r.row, r.i])) };
  for (const i of ev.issues) {
    if (i.accepted) continue;
    if (i.rec != null) up(`${i.table}:${i.rec}:${i.field}`, i.severity);
    else if (i.params && i.params.values) for (const v of i.params.values) for (const r of v.rows) up(`${r.table}:${byRow[r.table].get(r.row)}:${i.field}`, i.severity);
  }
  return m;
}
function tabData(p) {
  const table = view.dtable, src = S.sources[table];
  const fields = C.FIELDS[table].filter(f => S.mapping[table][f.key] != null);
  const idx = cellIssueIndex();
  let recs = S.work[table];
  if (view.donly) recs = recs.filter(r => fields.some(f => idx.has(`${table}:${r.i}:${f.key}`)));
  let h = `<p class="muted">${T('data.sub')}</p><div class="filters">`;
  if (S.sources.plots) h += `<div class="seg">${['trees', 'plots'].map(t => `<button type="button" class="btn small ${t === table ? '' : 'ghost'}" data-dt="${t}">${T('t.' + t)}</button>`).join('')}</div>`;
  h += `<label class="chk"><input type="checkbox" id="donly"${view.donly ? ' checked' : ''}> ${T('data.only')}</label></div>
    <div class="tscroll"><table class="grid data"><thead><tr><th>${T('rowno')}</th>${fields.map(f => `<th>${T('f.' + f.key)}<br><span class="muted small">${esc(src.headers[S.mapping[table][f.key]])}</span></th>`).join('')}<th></th></tr></thead><tbody>`;
  for (const r of recs.slice(0, view.dlim)) {
    h += `<tr class="${r.excluded ? 'ex' : ''}"><td class="rn">${r.row}${r.excluded ? ` <span class="kind">${T('data.ex')}</span>` : ''}</td>`;
    for (const f of fields) {
      const s = idx.get(`${table}:${r.i}:${f.key}`), edited = S.work.edits[`${table}:${r.i}:${f.key}`] != null;
      const x = ev.vals[table][r.i] && ev.vals[table][r.i][f.key];
      const title = f.kind === 'num' && x && x.status === 'ok' ? `${T('data.parsed')}: ${fmtNum(x.value, 6)}` : '';
      h += `<td class="${s ? 'c-' + s : ''}${edited ? ' edited' : ''}"><button type="button" class="cellbtn" data-r="${r.i}" data-f="${f.key}"${title ? ` title="${esc(title)}"` : ''}>${vis(C.currentText(S.sources, S.work, table, r, f.key)) || '<span class="muted">∅</span>'}</button></td>`;
    }
    h += `<td><button type="button" class="btn ghost small" data-x="${r.i}">${T(r.excluded ? 'act.include' : 'act.exclude')}</button></td></tr>`;
  }
  h += '</tbody></table></div>';
  if (recs.length > view.dlim) h += `<p class="muted small">${T('more', { k: view.dlim, n: recs.length })} <button type="button" class="btn ghost small" id="dmore">${T('show.more')}</button></p>`;
  p.innerHTML = h;
  p.querySelectorAll('[data-dt]').forEach(b => b.addEventListener('click', () => { view.dtable = b.dataset.dt; view.dlim = PAGE; tabData(p); }));
  $('donly').addEventListener('change', e => { view.donly = e.target.checked; view.dlim = PAGE; tabData(p); });
  $('dmore') && $('dmore').addEventListener('click', () => { view.dlim += PAGE; tabData(p); });
  p.querySelectorAll('.cellbtn').forEach(b => b.addEventListener('click', () => editDialog(table, +b.dataset.r, b.dataset.f)));
  p.querySelectorAll('[data-x]').forEach(b => b.addEventListener('click', () => {
    const r = S.work[table][+b.dataset.x];
    dialog({ title: `${T(r.excluded ? 'dlg.include' : 'dlg.exclude')}: ${T('where.row', { t: T('t.' + table), r: r.row })}`, sub: r.excluded ? '' : T('dlg.exclude.sub'),
      onOk: reason => { C.setExcluded(S.work, table, r.i, !r.excluded, reason); } });
  }));
}
function tabPlots(p) {
  const cols = T('plots.cols');
  p.innerHTML = `<div class="tscroll"><table class="grid"><thead><tr>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>
    ${ev.plots.map(x => `<tr class="${x.n_records ? '' : 'empty'}"><td><code>${vis(x.plot_id)}</code></td><td class="num">${fmtNum(x.plot_area, 6)}</td><td>${esc(x.area_source || '–')}</td><td>${esc(x.stratum ?? '–')}</td>
      <td class="num">${fmtNum(x.n_records, 0)}</td><td>${T(x.in_plot_table ? 'yes' : 'no')}</td></tr>`).join('')}</tbody></table></div>`;
}
function logRows(withHead = true) {
  const rows = S.work.changelog.map(e => [e.seq, e.time, T('a.' + e.action), T('t.' + (e.table || 'trees')), e.row, e.field ? T('f.' + e.field) : '', e.old, e.new, e.reason, e.issue || '']);
  return withHead ? [T('log.cols'), ...rows] : rows;
}
function tabLog(p) {
  const rows = logRows(false).slice().reverse();
  p.innerHTML = `<div class="filters"><span class="dl"><button type="button" class="btn ghost small" id="dllog"${rows.length ? '' : ' disabled'}>${T('ex.log')} CSV</button></span></div>` +
    (rows.length ? `<div class="tscroll"><table class="grid"><thead><tr>${T('log.cols').map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>
    ${rows.map(r => `<tr>${r.map((c, k) => `<td${k === 1 ? ' class="nowrap small"' : ''}>${k === 6 || k === 7 ? `<code>${vis(c ?? '')}</code>` : esc(k === 1 ? new Date(c).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-GB') : c ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : `<p class="muted">${T('log.empty')}</p>`);
  $('dllog').addEventListener('click', () => downloadCSV(fname('degisiklik-gunlugu', 'change-log') + '.csv', logRows(), lang));
}

/* ---------------- approval and exports ---------------- */
function fname(trName, enName) { return `${lang === 'tr' ? trName : enName}-${new Date().toISOString().slice(0, 10)}`; }
function issueRows() {
  return [T('x.issueCols'), ...ev.issues.map(i => [T('sev.' + i.severity), T('kind.' + i.kind), T('cat.' + i.category), i.code, T('t.' + i.table), i.row ?? '', i.plot ?? '',
    i.field ? T('f.' + i.field) : '', i.column || '', i.text ?? '', msg(i), i.suggestion ? i.suggestion.value : '', i.accepted ? i.accepted.reason : ''])];
}
const DATA_COLS = [['row', 'row'], ['plot_id', 'plot_id'], ['tree_id', 'tree_id'], ['stem_id', 'stem_id'], ['period', 'period'], ['species', 'species'], ['dbh', 'dbh_cm'], ['height', 'height_m'], ['status', 'status'], ['stratum', 'stratum'], ['x', 'x_m'], ['y', 'y_m']];
function dataRows(ds) {
  const extra = [...new Set(ds.trees.flatMap(t => Object.keys(t.extra || {})))];
  return [[...DATA_COLS.map(c => c[1]), ...extra.map(e => 'extra.' + e)], ...ds.trees.map(t => [...DATA_COLS.map(c => t[c[0]]), ...extra.map(e => t.extra[e] ?? '')])];
}
function plotRows(ds) { return [['plot_id', 'plot_area_m2', 'stratum', 'area_source', 'n_records'], ...ds.plots.map(p => [p.plot_id, p.plot_area, p.stratum, p.area_source, p.n_records])]; }
function tabApprove(p) {
  const s = ev.summary, current = S.approved && S.approved.sig === sig();
  let h = `<div class="card"><h2>${T('ap.h')}</h2><p class="muted">${T('ap.sub')}</p>`;
  if (!s.approvable) h += `<p class="note err">${T('ap.blocked', { e: s.errors })}</p>`;
  if (S.approved && approvedDs) h += `<p class="note ${current ? 'ok' : 'warn'}">${T('ap.done', { n: approvedDs.trees.length, p: approvedDs.plots.length, when: new Date(S.approved.created).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-GB') })}${current ? '' : ' ' + T('ap.stale')}</p>`;
  h += `<button type="button" class="btn" id="approve"${s.approvable ? '' : ' disabled'}>${T('ap.btn')}</button></div>
  <div class="card"><h2>${T('ex.h')}</h2><div class="exports">
    <button type="button" class="btn ghost" id="x-issues">${T('ex.issues')} (CSV)</button>
    <button type="button" class="btn ghost" id="x-log"${S.work.changelog.length ? '' : ' disabled'}>${T('ex.log')} (CSV)</button>
    <button type="button" class="btn ghost" id="x-data"${approvedDs ? '' : ' disabled'}>${T('ex.data')} (CSV)</button>
    <button type="button" class="btn" id="x-xlsx">${T('ex.all')}</button>
    <button type="button" class="btn ghost" id="x-json"${approvedDs ? '' : ' disabled'}>${T('ex.json')}</button></div>
    ${approvedDs ? '' : `<p class="muted small">${T('ex.need')}</p>`}<p class="muted small">${T('ex.csvnote')}</p>
    <p>${approvedDs ? `<a class="btn" href="ornek-alan.php">${T('to.stand')}</a> ` : ''}<a href="./">${T('to.tools')}</a></p></div>`;
  p.innerHTML = h;
  $('approve').addEventListener('click', async () => {
    const ds = C.approve(S.sources, S.work, S.mapping, S.settings, ev, { lang });
    await put('dataset:approved', ds);
    approvedDs = ds; S.approved = { created: ds.created, sig: sig() }; save(); tabApprove(p);
  });
  $('x-issues').addEventListener('click', () => downloadCSV(fname('sorunlar', 'issues') + '.csv', issueRows(), lang));
  $('x-log').addEventListener('click', () => downloadCSV(fname('degisiklik-gunlugu', 'change-log') + '.csv', logRows(), lang));
  $('x-data').addEventListener('click', () => downloadCSV(fname('onayli-veri', 'approved-data') + '.csv', dataRows(approvedDs), lang));
  $('x-json').addEventListener('click', () => downloadJSON(fname('veri-paketi', 'dataset') + '.json', approvedDs));
  $('x-xlsx').addEventListener('click', async () => {
    let XLSX; try { status(T('xlsx.loading')); XLSX = await loadXLSX(BASE); status(''); } catch (e) { status(T('xlsx.fail'), 'err'); return; }
    const sum = [[T('x.tool'), `${C.TOOL.id} ${C.TOOL.version}`], [T('x.date'), new Date().toISOString()], [T('x.lang'), lang],
      ...settingsRows(), [T('sum.records'), s.records], [T('sum.excluded'), s.excluded], [T('sum.plots'), s.plots], [T('sum.errors'), s.errors], [T('sum.warnings'), s.warnings], [T('sum.infos'), s.infos],
      [T('tab.approve'), approvedDs && current ? approvedDs.created : '–']];
    const sheets = [{ name: T('sheet.summary'), rows: [T('x.setCols'), ...sum], widths: [34, 50] }, { name: T('sheet.issues'), rows: issueRows(), widths: [8, 12, 16, 16, 18, 7, 10, 14, 14, 14, 60, 14, 30] }];
    if (approvedDs) {
      sheets.push({ name: T('sheet.data'), rows: dataRows(approvedDs) }, { name: T('sheet.plots'), rows: plotRows(approvedDs) },
        { name: T('sheet.derived'), rows: [T('x.derivedCols'), ...approvedDs.derived.trees.map(d => [d.row, d.basal_area_m2]), [], T('x.derivedPlotCols'), ...approvedDs.derived.plots.map(d => [d.plot_id, d.expansion_factor])] });
    }
    sheets.push({ name: T('sheet.log'), rows: logRows(), widths: [5, 22, 14, 16, 6, 16, 14, 14, 40, 14] });
    download(fname('veri-denetimi', 'data-check') + '.xlsx', xlsxBlob(XLSX, sheets));
  });
}

/* ---------------- shell ---------------- */
function canGo(n) {
  if (n <= 1) return true;
  if (!S.sources.trees) return false;
  if (n === 2) return true;
  if (mapProblems().length || !S.settings.decimal) return false;
  if (n === 3) return true;
  return !!S.work && S.workSrcVer === S.srcVer;
}
function go(n) { if (!canGo(n)) return; S.step = n; save(); render(); scrollTo({ top: $('steps').offsetTop - 8, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
function renderSteps() {
  $('steps').innerHTML = `<ol>${[1, 2, 3, 4].map(n => `<li><button type="button" data-go="${n}"${S.step === n ? ' aria-current="step"' : ''}${canGo(n) ? '' : ' disabled'}><b>${n}</b> ${T('step.' + n)}</button></li>`).join('')}</ol>`;
  $('steps').querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(+b.dataset.go)));
}
function render() {
  if (!canGo(S.step)) S.step = [4, 3, 2, 1].find(canGo);
  renderSteps();
  for (const n of [1, 2, 3, 4]) $('step' + n).hidden = S.step !== n;
  ({ 1: renderStep1, 2: renderStep2, 3: renderStep3, 4: renderStep4 })[S.step]();
}
(async function init() {
  $('privacy').textContent = T('privacy');
  try {
    const saved = await get(KEY);
    if (saved && saved.v === 1) {
      S = { ...blank(), ...saved };
      status(T('restored', { when: new Date(saved.saved).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-GB') }));
      const ds = await get('dataset:approved');
      if (ds && S.approved && ds.created === S.approved.created) approvedDs = ds;
      if (S.work && S.workSrcVer === S.srcVer) reeval();
    }
  } catch (e) { S = blank(); }
  render();
})();
