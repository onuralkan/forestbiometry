// Model Evaluation: user interface. All arithmetic lives in calc.js.
import * as E from './calc.js';
import { T } from './i18n.js';
import { lang, fmtNum, esc } from '../core/i18n.js';
import { put, get, del, autosave } from '../core/store.js';
import { cellText } from '../core/table.js';
import { detectDecimal, defaultDecimal } from '../core/num.js';
import { download, downloadCSV, xlsxBlob, loadXLSX } from '../core/export.js';
import { downloadRecord, recordButton } from '../core/record-ui.js';
import { scatterChart, svgForDownload } from '../core/chart.js';
import { renderImport, readImport } from '../core/importer.js';
import { classesFromBreaks } from '../stand/calc.js';

const BASE = './', KEY = 'session:' + E.TOOL.id, LOC = 'en-GB';
const $ = id => document.getElementById(id);
const f = (x, d = 4) => x == null ? '–' : fmtNum(x, d);
const num = v => { const x = parseFloat(String(v).replace(',', '.')); return Number.isFinite(x) ? x : NaN; };

let S = blank(), R = null, approved = null;
function blank() {
  return { v: 1, step: 1, tab: 'summary', imp: null, src: null, obs: null, models: [], groups: { plot: null, species: null, fold: null, dcol: null, breaks: '', openTop: true },
    decimal: null, decimalChosen: false, rowSet: 'common', norm: null, chartModel: 0, groupKey: null,
    weight: null, level: 0.95, alpha: 0.05, mtype: null, mvalue: '', boot: false, bootB: 2000, seed: '1' };
}
const AS = autosave(KEY, () => ({ ...S, saved: new Date().toISOString() }));
function save() { AS.save(); }
function flush() { return AS.flush(); }
$('langlink') && $('langlink').addEventListener('click', async e => { e.preventDefault(); const h = e.currentTarget.href; await flush(); location.href = h; });
function status(m, k = '') { const s = $('status'); s.className = 'status ' + k; s.textContent = m || ''; }

/* ---------------- step 1 ---------------- */
function setTable(state) {
  S.imp = state.imp; S.src = state.src; R = null;
  S.obs = null; S.models = []; S.decimal = null; S.decimalChosen = false; S.chartModel = 0; S.groupKey = null;
  S.groups = { plot: null, species: null, fold: null, dcol: null, breaks: '', openTop: true }; S.weight = null;
  if (S.src) guessColumns();
  if (S.imp && S.imp.kind === 'dataset' && S.imp.decimal) { S.decimal = S.imp.decimal; S.decimalChosen = true; }
  status(''); save(); render();
}
/** Exact header names only (the user confirms on the next step). */
function guessColumns() {
  const H = S.src.headers.map(h => h.toLocaleLowerCase('tr'));
  const find = names => { const i = H.findIndex(h => names.includes(h)); return i < 0 ? null : i; };
  S.groups.plot = find(['plot', 'plot_id', 'alan', 'alan_no', 'ornek_alan']); S.groups.species = find(['species', 'tur', 'tür', 'sp']);
  S.groups.fold = find(['fold', 'kat', 'cv_fold']); S.groups.dcol = find(['dbh', 'dbh_cm', 'cap', 'çap', 'cap_cm', 'd']);
}
function datasetTable(ds) {
  const base = [['plot_id', 's'], ['tree_id', 's'], ['stem_id', 's'], ['period', 's'], ['species', 's'], ['dbh', 'n', 'dbh_cm'], ['height', 'n', 'height_m'], ['status', 's'], ['stratum', 's']];
  const extra = [...new Set(ds.trees.flatMap(t => Object.keys(t.extra || {})))];
  const cell = (v, t) => v == null ? { t: 's', v: '' } : t === 'n' ? { t: 'n', v, w: String(v) } : { t: 's', v: String(v) };
  return { kind: 'dataset', name: (ds.source && ds.source.trees && ds.source.trees.name) || 'dataset', headers: [...base.map(b => b[2] || b[0]), ...extra],
    rows: ds.trees.map(t => [...base.map(b => cell(t[b[0]], b[1])), ...extra.map(e => cell((t.extra || {})[e], 's'))]), rowNumbers: ds.trees.map(t => t.row), meta: {} };
}
function renderStep1() {
  const el = $('step1');
  el.innerHTML = `<div id="impbox"></div><div class="card"><h2>${T('ds.h')}</h2><p class="muted">${T('ds.sub')}</p>
    ${approved ? `<button type="button" class="btn ghost" id="useds">${T('ds.use')}</button>` : `<p class="muted small">${T('ds.none')}</p>`}</div>
    <div class="card sample"><button type="button" class="btn ghost" id="sample">${T('sample')}</button><span class="muted small">${T('sample.note')}</span></div>
    <div class="nav"><button type="button" class="btn ghost" id="reset">${T('reset')}</button><button type="button" class="btn" id="to2"${S.src ? '' : ' disabled'}>${T('next')}</button>${S.src ? '' : `<span class="muted small">${T('need.data')}</span>`}</div>`;
  renderImport($('impbox'), { imp: S.imp && S.imp.kind !== 'dataset' ? S.imp : S.imp, src: S.src }, { base: BASE, title: T('imp.h'), sub: T('imp.sub'), onChange: setTable, onError: m => status(m, 'err') });
  $('useds') && $('useds').addEventListener('click', () => {
    const src = datasetTable(approved);
    setTable({ imp: { kind: 'dataset', name: src.name, decimal: approved.source && approved.source.settings ? approved.source.settings.decimal : null }, src });
  });
  $('sample').addEventListener('click', async () => {
    const buf = await (await fetch(BASE + 'assets/lab/eval/ornek/ornek-tahminler.csv')).arrayBuffer();
    const imp = { kind: 'csv', name: 'ornek-tahminler.csv (simulated)', buf, encoding: 'utf-8', delim: null, header: true, sheet: null };
    setTable({ imp, src: await readImport(imp, BASE) });
    S.obs = S.src.headers.indexOf('h_obs');
    S.models = ['h_m1', 'h_m2'].map(h => ({ col: S.src.headers.indexOf(h), name: h, role: 'unknown' }));
    S.groups.breaks = '8 20 32 44'; save(); render();
  });
  $('reset').addEventListener('click', async () => { S = blank(); R = null; status(''); render(); await del(KEY); });
  $('to2').addEventListener('click', () => go(2));
}

/* ---------------- step 2 ---------------- */
function textValues(cols) {
  const out = [];
  for (const c of cols) if (c != null) for (const r of S.src.rows) { const x = r[c]; if (x && x.t === 's') out.push(x.v); }
  return out;
}
function decimalBlock() {
  const d = detectDecimal(textValues([S.obs, ...S.models.map(m => m.col), S.groups.breaks.trim() ? S.groups.dcol : null, S.weight]));
  if (!S.decimalChosen) S.decimal = defaultDecimal(d.verdict);
  const msg = d.verdict === 'ambiguous' ? T('dec.v.ambiguous', { ex: d.examples.ambiguous.map(x => `"${x}"`).join(', ') }) : T('dec.v.' + d.verdict);
  return `<div class="card"><h2>${T('dec.h')}</h2><p class="note ${d.verdict === 'ambiguous' || d.verdict === 'conflict' ? 'warn' : ''}">${esc(msg)}</p>
    <div class="radios"><label><input type="radio" name="dec" value="."${S.decimal === '.' ? ' checked' : ''}> ${T('dec.dot')}</label><label><input type="radio" name="dec" value=","${S.decimal === ',' ? ' checked' : ''}> ${T('dec.comma')}</label></div>
    ${S.decimal ? '' : `<p class="note err">${T('dec.choose')}</p>`}</div>`;
}
function classes() {
  if (S.groups.dcol == null || !S.groups.breaks.trim()) return { classes: null };
  const r = classesFromBreaks(S.groups.breaks.trim().split(/[;\s]+/).map(num), S.groups.openTop);
  return r.problem ? r : { classes: r.classes };
}
function problems() {
  const p = [];
  if (S.obs == null) p.push(T('need.obs'));
  if (!S.models.length) p.push(T('need.model'));
  if (S.models.some(m => m.col === S.obs)) p.push(T('same.col'));
  if (!S.decimal) p.push(T('dec.choose'));
  const c = classes(); if (c.problem) p.push(T(c.problem));
  if (S.weight != null && (S.weight === S.obs || S.models.some(m => m.col === S.weight))) p.push(T('w.same'));
  if (S.mtype && !(margin() > 0)) p.push(T('eq.need'));
  if (S.boot && seed() == null) p.push(T('bt.needseed'));
  return p;
}
const margin = () => num(S.mvalue);
const seed = () => /^\s*\d{1,10}\s*$/.test(String(S.seed)) && +S.seed <= 4294967295 ? +S.seed : null;
function renderStep2() {
  const el = $('step2'), H = S.src.headers;
  const opts = (sel, none = true) => (none ? `<option value="">${T('none')}</option>` : '') + H.map((h, i) => `<option value="${i}"${sel === i ? ' selected' : ''}>${esc(h)}</option>`).join('');
  const first = c => S.src.rows.slice(0, 3).map(r => `<code>${esc(cellText(r[c]))}</code>`).join(' ');
  let h = `<div class="card"><h2>${T('obs.h')}</h2><label class="field inline"><span>${T('obs.col')}</span><select id="obs">${opts(S.obs)}</select></label>${S.obs != null ? `<p class="small">${first(S.obs)}</p>` : ''}</div>`;
  h += `<div class="card"><h2>${T('mod.h')}</h2><p class="muted">${T('mod.sub')}</p><div class="models">`;
  H.forEach((name, c) => {
    if (c === S.obs) return;
    const m = S.models.find(x => x.col === c);
    h += `<div class="modelrow${m ? ' on' : ''}"><label class="chk"><input type="checkbox" data-mc="${c}"${m ? ' checked' : ''}> <b>${esc(name)}</b></label><span class="small">${first(c)}</span>`;
    if (m) h += `<label>${T('mod.name')} <input type="text" data-mn="${c}" value="${esc(m.name)}" size="14"></label>
      <label>${T('mod.role')} <select data-mr="${c}">${E.ROLES.map(r => `<option value="${r}"${m.role === r ? ' selected' : ''}>${T('role.' + r)}</option>`).join('')}</select></label>`;
    h += '</div>';
  });
  h += `</div></div><div class="card"><h2>${T('grp.h')}</h2><div class="lims">
    ${['plot', 'species', 'fold'].map(k => `<label>${T('grp.' + k)} <select data-g="${k}">${opts(S.groups[k])}</select></label>`).join('')}
    <label>${T('grp.dcol')} <select data-g="dcol">${opts(S.groups.dcol)}</select></label></div>
    ${S.groups.dcol != null ? `<label class="field"><span>${T('grp.breaks')}</span><input type="text" id="breaks" value="${esc(S.groups.breaks)}" placeholder="8 20 32 44"></label>
      <label class="chk"><input type="checkbox" id="opentop"${S.groups.openTop ? ' checked' : ''}> ${T('grp.open')}</label>` : ''}</div>`;
  h += decimalBlock();
  h += `<div class="card"><h2>${T('rs.h')}</h2><div class="radios col">${['common', 'own'].map(v => `<label><input type="radio" name="rs" value="${v}"${S.rowSet === v ? ' checked' : ''}> ${T('rs.' + v)}</label>`).join('')}</div></div>
    <div class="card"><h2>${T('norm.h')}</h2><div class="radios col">${['none', ...E.NORMS].map(v => `<label><input type="radio" name="norm" value="${v}"${(S.norm || 'none') === v ? ' checked' : ''}> ${T('norm.' + v)}</label>`).join('')}</div></div>
    <div class="card"><h2>${T('w.h')}</h2><p class="muted">${T('w.sub')}</p><label class="field inline"><span>${T('w.col')}</span><select id="wcol">${opts(S.weight)}</select></label>${S.weight != null ? `<p class="small">${first(S.weight)}</p>` : ''}</div>
    <div class="card"><h2>${T('inf.h')}</h2><p class="muted">${T('inf.sub')}</p>${S.weight != null ? `<p class="note warn">${T('inf.weighted')}</p>` : ''}
      <label class="field inline"><span>${T('inf.level')}</span><select id="level">${E.LEVELS.map(l => `<option value="${l}"${S.level === l ? ' selected' : ''}>${fmtNum(l * 100, 0)} %</option>`).join('')}</select></label>
      <h3>${T('eq.h')}</h3><p class="muted small">${T('eq.sub')}</p>
      <div class="radios col">${['none', ...E.MARGINS].map(v => `<label><input type="radio" name="mtype" value="${v}"${(S.mtype || 'none') === v ? ' checked' : ''}> ${T('eq.' + v)}</label>`).join('')}</div>
      ${S.mtype ? `<div class="lims"><label>${T(S.mtype === 'abs' ? 'eq.delta' : 'eq.eps')} <input type="text" id="mvalue" value="${esc(S.mvalue)}" size="8" inputmode="decimal"></label>
        <label>${T('eq.alpha')} <select id="alpha">${E.ALPHAS.map(a => `<option value="${a}"${S.alpha === a ? ' selected' : ''}>${fmtNum(a, 2)}</option>`).join('')}</select></label></div>` : ''}
      <h3>${T('bt.h')}</h3><label class="chk"><input type="checkbox" id="boot"${S.boot ? ' checked' : ''}> ${T('bt.on')}</label><p class="muted small">${T('bt.sub')}</p>
      ${S.boot ? `<div class="lims"><label>${T('bt.B')} <select id="bootB">${E.BOOT_B.map(b => `<option value="${b}"${S.bootB === b ? ' selected' : ''}>${fmtNum(b, 0)}</option>`).join('')}</select></label>
        <label>${T('bt.seed')} <input type="text" id="seed" value="${esc(S.seed)}" size="10" inputmode="numeric"></label></div>` : ''}</div>`;
  const pr = problems();
  if (pr.length) h += `<div class="card"><ul class="probs">${pr.map(x => `<li class="note err">${esc(x)}</li>`).join('')}</ul></div>`;
  h += `<div class="nav"><button type="button" class="btn ghost" id="back1">${T('back')}</button><button type="button" class="btn" id="calc"${pr.length ? ' disabled' : ''}>${T('calc')}</button></div>`;
  el.innerHTML = h;
  const re = () => { R = null; save(); renderStep2(); renderSteps(); };
  $('obs').addEventListener('change', e => { S.obs = e.target.value === '' ? null : +e.target.value; S.models = S.models.filter(m => m.col !== S.obs); re(); });
  el.querySelectorAll('[data-mc]').forEach(x => x.addEventListener('change', () => {
    const c = +x.dataset.mc;
    if (x.checked) S.models.push({ col: c, name: H[c], role: 'unknown' }); else S.models = S.models.filter(m => m.col !== c);
    S.models.sort((a, b) => a.col - b.col); re();
  }));
  el.querySelectorAll('[data-mn]').forEach(x => x.addEventListener('input', () => { S.models.find(m => m.col === +x.dataset.mn).name = x.value || H[+x.dataset.mn]; R = null; save(); }));
  el.querySelectorAll('[data-mr]').forEach(x => x.addEventListener('change', () => { S.models.find(m => m.col === +x.dataset.mr).role = x.value; R = null; save(); }));
  el.querySelectorAll('[data-g]').forEach(x => x.addEventListener('change', () => { S.groups[x.dataset.g] = x.value === '' ? null : +x.value; re(); }));
  $('breaks') && $('breaks').addEventListener('change', e => { S.groups.breaks = e.target.value; re(); });
  $('opentop') && $('opentop').addEventListener('change', e => { S.groups.openTop = e.target.checked; re(); });
  el.querySelectorAll('input[name="dec"]').forEach(x => x.addEventListener('change', () => { S.decimal = x.value; S.decimalChosen = true; re(); }));
  el.querySelectorAll('input[name="rs"]').forEach(x => x.addEventListener('change', () => { S.rowSet = x.value; R = null; save(); }));
  el.querySelectorAll('input[name="norm"]').forEach(x => x.addEventListener('change', () => { S.norm = x.value === 'none' ? null : x.value; R = null; save(); }));
  $('wcol').addEventListener('change', e => { S.weight = e.target.value === '' ? null : +e.target.value; re(); });
  $('level').addEventListener('change', e => { S.level = +e.target.value; R = null; save(); });
  el.querySelectorAll('input[name="mtype"]').forEach(x => x.addEventListener('change', () => { S.mtype = x.value === 'none' ? null : x.value; re(); }));
  $('mvalue') && $('mvalue').addEventListener('change', e => { S.mvalue = e.target.value; re(); });
  $('alpha') && $('alpha').addEventListener('change', e => { S.alpha = +e.target.value; R = null; save(); });
  $('boot').addEventListener('change', e => { S.boot = e.target.checked; re(); });
  $('bootB') && $('bootB').addEventListener('change', e => { S.bootB = +e.target.value; R = null; save(); });
  $('seed') && $('seed').addEventListener('change', e => { S.seed = e.target.value.trim(); re(); });
  $('back1').addEventListener('click', () => go(1));
  $('calc').addEventListener('click', () => { compute(); S.tab = 'summary'; go(3); });
}
function compute() {
  const c = classes();
  const groups = { plot: S.groups.plot, species: S.groups.species, fold: S.groups.fold };
  if (c.classes) groups.dclass = { col: S.groups.dcol, classes: c.classes };
  R = E.evaluate(S.src, { obs: S.obs, models: S.models, decimal: S.decimal, groups, rowSet: S.rowSet, norm: S.norm, weight: S.weight,
    infer: { level: S.level, alpha: S.alpha, margin: S.mtype ? { type: S.mtype, value: margin() } : null, boot: S.boot ? { B: S.bootB, seed: seed() } : null } });
  if (S.chartModel >= R.models.length) S.chartModel = 0;
  const keys = groupKeys(); if (!keys.includes(S.groupKey)) S.groupKey = keys[0] || null;
}
const groupKeys = () => R ? ['plot', 'species', 'dclass', 'fold'].filter(k => R.models[0] && R.models[0].groups[k]) : [];

/* ---------------- step 3 ---------------- */
const TABS = ['summary', 'infer', 'charts', 'groups', 'export'];
function renderStep3() {
  if (!R) compute();
  const el = $('step3');
  el.innerHTML = `<div class="tabs" role="tablist">${TABS.map(t => `<button type="button" role="tab" id="tab-${t}" aria-selected="${S.tab === t}" aria-controls="panel" data-tab="${t}">${T('tab.' + t)}</button>`).join('')}</div>
    <div id="panel" class="panel" role="tabpanel" aria-labelledby="tab-${S.tab}"></div><div class="nav"><button type="button" class="btn ghost" id="back2">${T('back')}</button></div>`;
  el.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { S.tab = b.dataset.tab; save(); renderStep3(); }));
  el.querySelector('.tabs').addEventListener('keydown', e => {
    const i = TABS.indexOf(S.tab), d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return; S.tab = TABS[(i + d + TABS.length) % TABS.length]; renderStep3(); $('tab-' + S.tab).focus();
  });
  $('back2').addEventListener('click', () => go(2));
  ({ summary: tabSummary, infer: tabInfer, charts: tabCharts, groups: tabGroups, export: tabExport })[S.tab]($('panel'));
}
function r2Cell(m) { return m.r2 == null ? `<td class="num undef" title="${esc(T('r2.' + (m.r2Reason || 'n0')))}">${T('undef')}</td>` : `<td class="num">${f(m.r2, 4)}</td>`; }
function relCells(m) {
  if (!S.norm) return '';
  const r = m.rel;
  if (!r || r.reason) return `<td class="num undef" colspan="3">${T('undef')}${r ? ` (${T('rel.' + r.reason)})` : ''}</td><td class="num">${r && r.den != null ? f(r.den, 4) : '–'}</td>`;
  return `<td class="num">${f(r.bias, 2)}</td><td class="num">${f(r.mae, 2)}</td><td class="num">${f(r.rmse, 2)}</td><td class="num">${f(r.den, 4)}</td>`;
}
function metricHead(first) {
  return `<tr><th>${first}</th><th>${T('m.n')}</th><th>${T('m.bias')}</th><th>${T('m.mae')}</th><th>${T('m.rmse')}</th><th>${T('m.r2')}</th>${S.norm ? `<th>${T('m.rbias')}</th><th>${T('m.rmae')}</th><th>${T('m.rrmse')}</th><th>${T('m.den')} (${T('norm.' + S.norm).replace(/ \(%\)$/, '')})</th>` : ''}<th>${T('m.mobs')}</th><th>${T('m.mpred')}</th></tr>`;
}
function metricRow(label, m) {
  return `<td class="num">${fmtNum(m.n, 0)}</td><td class="num">${f(m.bias)}</td><td class="num">${f(m.mae)}</td><td class="num">${f(m.rmse)}</td>${r2Cell(m)}${relCells(m)}<td class="num">${f(m.meanObs)}</td><td class="num">${f(m.meanPred)}</td>`;
}
function tabSummary(p) {
  let h = `<p class="note">${T('sign')}</p>${R.weighted ? `<p class="note">${T('w.note', { col: esc(S.src.headers[S.weight]) })}</p>` : ''}`;
  h += `<div class="tscroll"><table class="grid"><thead>${metricHead(T('m.model'))}</thead><tbody>${R.models.map(m => `<tr><th>${esc(m.name)}<br><span class="kind">${T('role.' + m.role)}</span></th>${metricRow(m.name, m.overall)}</tr>`).join('')}</tbody></table></div>`;
  for (const m of R.models) if (m.overall.r2 == null) h += `<p class="small note warn">${esc(m.name)}: ${T('r2.' + (m.overall.r2Reason || 'n0'))}</p>`;
  const roles = [...new Set(R.models.map(m => m.role))];
  h += `<p class="statement">${T('role.note', { list: R.models.map(m => `${esc(m.name)}: ${T('role.' + m.role)}`).join('; ') })}${roles.includes('training') ? ' ' + T('role.warn.training') : ''}${roles.includes('unknown') ? ' ' + T('role.warn.unknown') : ''}</p>`;
  h += `<h3>${T('acc.h')}</h3><p class="small">${T('common.n', { n: fmtNum(R.nCommon, 0), N: fmtNum(R.N, 0) })}</p><div class="tscroll"><table class="grid"><thead><tr><th>${T('m.model')}</th>
    ${accCols().map(([, l]) => `<th>${T('acc.' + l)}</th>`).join('')}</tr></thead><tbody>
    ${R.models.map(m => `<tr><th>${esc(m.name)}</th>${accCols().map(([k]) => `<td class="num">${fmtNum(m.acc[k], 0)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="muted small">${T('acc.note')}</p>`;
  if (R.rowSet === 'own' && R.models.length > 1) {
    h += `<p class="note ${R.sameSample ? 'ok' : 'warn'}">${T(R.sameSample ? 'own.same' : 'own.warn')}</p>`;
    h += `<h3>${T('ov.h')}</h3><div class="tscroll"><table class="grid"><thead><tr><th></th>${R.models.map(m => `<th>${esc(m.name)}</th>`).join('')}</tr></thead><tbody>${R.models.map((m, i) => `<tr><th>${esc(m.name)}</th>${R.overlap[i].map(c => `<td class="num">${fmtNum(c, 0)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  p.innerHTML = h + `<p class="muted small">${T('noinf')}</p>`;
}
function tabInfer(p) {
  const I = R.models.map(m => m.infer);
  if (I.some(x => x && x.reason === 'weighted')) { p.innerHTML = `<p class="note warn">${T('inf.weighted')}</p>`; return; }
  const pc = fmtNum(S.level * 100, 0);
  let h = `<p class="note">${T('sign')}</p><h3>${T('ci.h', { l: pc })}</h3><div class="tscroll"><table class="grid"><thead><tr><th>${T('m.model')}</th><th>${T('m.n')}</th><th>${T('m.bias')}</th><th>${T('ci.sd')}</th><th>${T('ci.se')}</th><th>${T('ci.t')}</th><th>${T('ci.lo')}</th><th>${T('ci.hi')}</th></tr></thead><tbody>`;
  for (const m of R.models) {
    const x = m.infer;
    h += x.reason ? `<tr><th>${esc(m.name)}</th><td class="num">${fmtNum(x.n, 0)}</td><td class="num undef" colspan="6">${T('undef')} (${T('inf.' + x.reason)})</td></tr>`
      : `<tr><th>${esc(m.name)}</th><td class="num">${fmtNum(x.n, 0)}</td><td class="num">${f(x.mean)}</td><td class="num">${f(x.sd)}</td><td class="num">${f(x.se)}</td><td class="num">${f(x.ci.t)}</td><td class="num">${f(x.ci.lo)}</td><td class="num">${f(x.ci.hi)}</td></tr>`;
  }
  h += `</tbody></table></div><p class="muted small">${T('ci.note', { l: pc })}</p>`;
  h += bootHtml(pc);
  if (!S.mtype) { p.innerHTML = h + `<p class="muted">${T('eq.off')}</p>`; return; }
  const a = fmtNum(S.alpha, 2), a2 = fmtNum((1 - 2 * S.alpha) * 100, 0);
  h += `<h3>${T('eq.res', { a })}</h3><p class="small">${T(S.mtype === 'abs' ? 'eq.abs.set' : 'eq.rel.set', { v: esc(S.mvalue) })}</p><div class="tscroll"><table class="grid"><thead>
    <tr><th rowspan="2">${T('m.model')}</th><th rowspan="2">δ</th><th rowspan="2">ε = δ/s</th><th colspan="3">${T('eq.tost', { l: a2 })}</th><th colspan="5">${T('eq.wellek')}</th></tr>
    <tr><th>${T('ci.lo')}</th><th>${T('ci.hi')}</th><th>${T('eq.dec')}</th><th>ψ²</th><th>C</th><th>|t|</th><th>${T('eq.dec')}</th><th>${T('eq.power')}</th></tr></thead><tbody>`;
  for (const m of R.models) {
    const x = m.infer, q = x.equiv;
    if (x.reason || !q || q.reason) { h += `<tr><th>${esc(m.name)}</th><td class="num undef" colspan="10">${T('undef')} (${T('inf.' + (x.reason || (q ? q.reason : 'n')))})</td></tr>`; continue; }
    const dec = v => `<td class="${v ? 'ok' : 'warn'}">${T(v ? 'eq.yes' : 'eq.no')}</td>`;
    h += `<tr><th>${esc(m.name)}</th><td class="num">${f(q.delta)}</td><td class="num">${f(q.eps)}</td><td class="num">${f(q.tost.lo)}</td><td class="num">${f(q.tost.hi)}</td>${dec(q.tost.equivalent)}
      <td class="num">${f(q.wellek.psi2)}</td><td class="num">${f(q.wellek.C)}</td><td class="num">${f(Math.abs(q.wellek.t))}</td>${dec(q.wellek.equivalent)}<td class="num">${f(q.wellek.power, 3)}</td></tr>`;
  }
  p.innerHTML = h + `</tbody></table></div><p class="statement">${T('eq.read')}</p><p class="muted small">${T('eq.note')}</p>`;
}
function bootHtml(pc) {
  if (!S.boot) return `<p class="muted">${T('bt.off')}</p>`;
  const cell = (st, key) => st[key] ? `<td class="num">${f(st[key].lo)}</td><td class="num">${f(st[key].hi)}${st[key].edge ? ' *' : ''}</td>` : `<td class="num undef" colspan="2">${T('undef')}${key === 'bca' && st.bcaReason ? ` (${T('bt.r.' + st.bcaReason)})` : ''}</td>`;
  let h = `<h3>${T('bt.res', { l: pc })}</h3>`, edge = false;
  for (const m of R.models) {
    const b = m.infer && m.infer.boot; if (!b) continue;
    h += `<h4>${esc(m.name)}</h4>`;
    if (b.reason) { h += `<p class="note warn">${T('undef')} (${T('inf.' + b.reason)})</p>`; continue; }
    h += `<div class="tscroll"><table class="grid boot"><thead><tr><th rowspan="2">${T('bt.stat')}</th><th rowspan="2">${T('bt.est')}</th><th colspan="2">${T('bt.pct')}</th><th colspan="2">BCa</th><th rowspan="2">ẑ₀</th><th rowspan="2">â</th><th rowspan="2">${T('bt.Bok')}</th></tr>
      <tr><th>${T('ci.lo')}</th><th>${T('ci.hi')}</th><th>${T('ci.lo')}</th><th>${T('ci.hi')}</th></tr></thead><tbody>`;
    for (const k of E.BOOT_STATS) {
      const st = b.stats[k], lab = T('bt.s.' + k);
      if (st.reason) { h += `<tr><th>${lab}</th><td class="num undef" colspan="8">${T('undef')} (${T('bt.r.' + st.reason)})</td></tr>`; continue; }
      if ((st.pct && st.pct.edge) || (st.bca && st.bca.edge)) edge = true;
      h += `<tr><th>${lab}</th><td class="num">${f(st.est)}</td>${cell(st, 'pct')}${cell(st, 'bca')}<td class="num">${f(st.z0)}</td><td class="num">${f(st.a)}</td><td class="num">${fmtNum(st.Bok, 0)}</td></tr>`;
    }
    h += '</tbody></table></div>';
  }
  return h + `<p class="muted small">${T('bt.note', { B: fmtNum(S.bootB, 0), seed: esc(S.seed) })}${edge ? ' ' + T('bt.edge') : ''}</p>` + rankBootHtml(pc);
}
/** Uncertainty of the ranking (1.2.0-beta.3): relative ranks of Relative Ranking in every bootstrap replication. */
function rankBootHtml(pc) {
  const rb = R.rankBoot; if (!rb) return '';
  let h = `<h3>${T('rb.h')}</h3><p class="muted small">${T('rb.sub', { n: fmtNum(rb.n, 0), m: rb.m })}</p>`;
  if (rb.reason) return h + `<p class="note warn">${T('undef')} (${T('rb.r.' + rb.reason)})</p>`;
  const order = rb.models.map((x, i) => i).sort((a, b) => rb.models[a].overall - rb.models[b].overall || a - b);
  h += `<div class="tscroll"><table class="grid" id="rbtab"><thead><tr><th>${T('m.model')}</th><th>${T('rb.overall')}</th><th>${T('rb.ord')}</th><th colspan="2">${T('rb.int', { l: pc })}</th><th>${T('rb.mean')}</th><th>${T('rb.best')}</th></tr></thead><tbody>
    ${order.map(i => { const x = rb.models[i]; return `<tr data-m="${i}"><th>${esc(R.models[i].name)}</th><td class="num" data-k="overall">${f(x.overall)}</td><td class="num" data-k="ord">${x.ordinal}</td><td class="num" data-k="lo">${f(x.lo)}</td><td class="num" data-k="hi">${f(x.hi)}${x.edge ? ' *' : ''}</td><td class="num" data-k="mean">${f(x.meanOrdinal)}</td><td class="num" data-k="best">${fmtNum(100 * x.pBest, 1)} %</td></tr>`; }).join('')}</tbody></table></div>`;
  return h + `<p class="muted small">${T('rb.note', { B: fmtNum(rb.Bok, 0), skip: rb.skipped })}</p>`;
}
function rankBootRows() {
  const rb = R.rankBoot; if (!rb) return null;
  const out = [[T('m.model'), T('rb.overall'), T('rb.ord'), T('x.level'), T('x.pctlo'), T('x.pcthi'), T('rb.mean'), T('rb.best.x'), 'B', T('bt.seed'), T('bt.Bok'), 'n', T('x.note')]];
  if (rb.reason) { out.push(['', '', '', rb.level, '', '', '', '', rb.B, rb.seed, '', rb.n, `${T('undef')}: ${T('rb.r.' + rb.reason)}`]); return out; }
  rb.models.forEach((x, i) => out.push([R.models[i].name, x.overall, x.ordinal, rb.level, x.lo, x.hi, x.meanOrdinal, x.pBest, rb.B, rb.seed, rb.Bok, rb.n, x.edge ? T('bt.edgeshort') : '']));
  return out;
}
function tabCharts(p) {
  const m = R.models[S.chartModel], pts = m.obs.map((o, i) => [o, m.pred[i]]), res = m.pred.map((q, i) => [q, m.obs[i] - q]);
  const fmt = v => fmtNum(v, 3), nm = m.name.replace(/[^\p{L}\p{N}_-]+/gu, '_');
  p.innerHTML = `<label class="field inline"><span>${T('ch.pick')}</span><select id="cm">${R.models.map((x, i) => `<option value="${i}"${i === S.chartModel ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</select></label>
    <p class="muted small">${T('ch.n', { n: fmtNum(pts.length, 0) })} · ${T('sign')}</p><div class="charts2">
    <figure class="chartbox" id="ch-op">${scatterChart({ title: T('ch.op', { m: m.name }), points: pts, xLabel: T('ch.obs'), yLabel: T('ch.pred'), line11: true, equal: true, fmt })}<figcaption><button type="button" class="btn ghost small" data-svg="ch-op" data-name="gozlenen-tahmin-${nm}">${T('ch.svg')}</button></figcaption></figure>
    <figure class="chartbox" id="ch-rp">${scatterChart({ title: T('ch.rp', { m: m.name }), points: res, xLabel: T('ch.pred'), yLabel: T('ch.res'), hline: 0, fmt })}<figcaption><button type="button" class="btn ghost small" data-svg="ch-rp" data-name="artik-tahmin-${nm}">${T('ch.svg')}</button></figcaption></figure></div>`;
  $('cm').addEventListener('change', e => { S.chartModel = +e.target.value; save(); tabCharts(p); });
  p.querySelectorAll('[data-svg]').forEach(b => b.addEventListener('click', () => download(b.dataset.name + '.svg', svgForDownload($(b.dataset.svg).querySelector('svg')), 'image/svg+xml')));
}
function tabGroups(p) {
  const keys = groupKeys();
  if (!keys.length) { p.innerHTML = `<p class="muted">${T('g.none')}</p>`; return; }
  let h = `<label class="field inline"><span>${T('g.pick')}</span><select id="gk">${keys.map(k => `<option value="${k}"${k === S.groupKey ? ' selected' : ''}>${T('grp.' + k)}</option>`).join('')}</select></label>`;
  for (const m of R.models) {
    h += `<h3>${esc(m.name)} <span class="kind">${T('role.' + m.role)}</span></h3><div class="tscroll"><table class="grid"><thead>${metricHead(T('grp.' + S.groupKey))}</thead><tbody>
      ${m.groups[S.groupKey].map(g => `<tr><th>${g.label === '' ? T('g.blank') : esc(g.label)}</th>${metricRow(g.label, g)}</tr>`).join('')}
      <tr class="total"><th>Σ</th>${metricRow('', m.overall)}</tr></tbody></table></div>`;
  }
  p.innerHTML = h + `<p class="muted small">${T('sign')}</p>`;
  $('gk').addEventListener('change', e => { S.groupKey = e.target.value; save(); tabGroups(p); });
}

/* ---------------- exports (headers in the chosen language) ---------------- */
const fname = (a, b) => `${b}-${new Date().toISOString().slice(0, 10)}`;
const undef = v => v == null ? T('undef') : v;
function mHead(first) { return [first, T('m.n'), T('m.bias'), T('m.mae'), T('m.rmse'), T('m.r2'), ...(S.norm ? [T('m.rbias'), T('m.rmae'), T('m.rrmse'), T('m.den'), T('x.norm')] : []), T('m.mobs'), T('m.mpred')]; }
function mVals(m) {
  const rel = S.norm ? (m.rel && !m.rel.reason ? [m.rel.bias, m.rel.mae, m.rel.rmse, m.rel.den, T('norm.' + S.norm)] : [T('undef'), T('undef'), T('undef'), m.rel ? m.rel.den : null, `${T('norm.' + S.norm)}: ${m.rel ? T('rel.' + m.rel.reason) : ''}`]) : [];
  return [m.n, m.bias, m.mae, m.rmse, undef(m.r2), ...rel, m.meanObs, m.meanPred];
}
function metricsRows() { return [[T('m.role'), ...mHead(T('m.model'))], ...R.models.map(m => [T('role.' + m.role), m.name, ...mVals(m.overall)])]; }
function accCols() {
  const c = [['rows', 'rows'], ['obsEmpty', 'obsE'], ['obsBad', 'obsB'], ['predEmpty', 'predE'], ['predBad', 'predB']];
  if (R.weighted) c.push(['wEmpty', 'wE'], ['wBad', 'wB']);
  return c.concat([['ownValid', 'own'], ['used', 'used'], ['dropped', 'dropped']]);
}
function accRows() { return [[T('m.model'), ...accCols().map(([, l]) => T('acc.' + l))], ...R.models.map(m => [m.name, ...accCols().map(([k]) => m.acc[k])])]; }
/** Bootstrap intervals, one row per model and measure. */
function bootRows() {
  const out = [[T('m.model'), T('bt.stat'), T('bt.est'), T('x.level'), 'B', T('bt.seed'), T('bt.Bok'), T('x.pctlo'), T('x.pcthi'), T('x.bcalo'), T('x.bcahi'), 'z0', 'a', T('x.note')]];
  for (const m of R.models) {
    const b = m.infer && m.infer.boot; if (!b) continue;
    if (b.reason) { out.push([m.name, '', '', S.level, b.B, b.seed, '', '', '', '', '', '', '', `${T('undef')}: ${T('inf.' + b.reason)}`]); continue; }
    for (const k of E.BOOT_STATS) {
      const st = b.stats[k], note = st.reason ? T('bt.r.' + st.reason) : st.bcaReason ? 'BCa: ' + T('bt.r.' + st.bcaReason) : ((st.pct && st.pct.edge) || (st.bca && st.bca.edge)) ? T('bt.edgeshort') : '';
      out.push([m.name, T('bt.s.' + k), st.est, S.level, b.B, b.seed, st.Bok, st.pct ? st.pct.lo : '', st.pct ? st.pct.hi : '', st.bca ? st.bca.lo : '', st.bca ? st.bca.hi : '', st.z0 == null ? '' : st.z0, st.a == null ? '' : st.a, note]);
    }
  }
  return out;
}
/** Interval for the bias and equivalence tests, one row per model (empty when weights are chosen). */
function inferRows() {
  const out = [[T('m.model'), T('m.n'), T('m.bias'), T('ci.sd'), T('ci.se'), T('x.level'), T('ci.t'), T('ci.lo'), T('ci.hi'),
    T('x.mtype'), T('x.mvalue'), 'alpha', 'delta', 'epsilon', T('x.tostlo'), T('x.tosthi'), T('x.tostdec'), 'psi2', 'C', 't', T('x.wdec'), T('eq.power')]];
  for (const m of R.models) {
    const x = m.infer; if (!x || x.reason === 'weighted') continue;
    if (x.reason) { out.push([m.name, x.n, `${T('undef')}: ${T('inf.' + x.reason)}`]); continue; }
    const row = [m.name, x.n, x.mean, x.sd, x.se, S.level, x.ci.t, x.ci.lo, x.ci.hi], q = x.equiv;
    if (q) row.push(T('eq.' + q.type), q.value, S.alpha, ...(q.reason ? [`${T('undef')}: ${T('inf.' + q.reason)}`] :
      [q.delta, q.eps, q.tost.lo, q.tost.hi, T(q.tost.equivalent ? 'eq.yes' : 'eq.no'), q.wellek.psi2, q.wellek.C, q.wellek.t, T(q.wellek.equivalent ? 'eq.yes' : 'eq.no'), q.wellek.power]));
    out.push(row);
  }
  return out;
}
function groupRows() {
  const out = [[T('x.group'), T('m.model'), ...mHead(T('g.label'))]];
  for (const key of groupKeys()) for (const m of R.models) for (const g of m.groups[key]) out.push([T('grp.' + key), m.name, g.label, ...mVals(g)]);
  return out;
}
function residualRows() {
  const out = [[T('x.row'), T('m.model'), T('x.obsv'), T('x.pred'), T('x.e'), ...(R.weighted ? [T('x.w')] : [])]];
  for (const m of R.models) m.idx.forEach((i, k) => out.push([R.rowNumbers[i], m.name, m.obs[k], m.pred[k], m.obs[k] - m.pred[k], ...(R.weighted ? [m.w[k]] : [])]));
  return out;
}
function infoRows() {
  return [[T('x.k'), T('x.v')], [T('x.tool'), `${E.TOOL.id} ${E.TOOL.version}`], [T('x.date'), new Date().toISOString()], [T('x.src'), S.imp ? S.imp.name : ''],
    [T('x.obs'), S.src.headers[S.obs]], [T('x.rs'), T('rs.' + S.rowSet)], [T('x.norm'), S.norm ? T('norm.' + S.norm) : T('norm.none')], [T('x.dec'), S.decimal], [T('x.weight'), S.weight == null ? T('none') : S.src.headers[S.weight]],
    [T('x.level'), S.level], [T('x.mtype'), S.mtype ? T('eq.' + S.mtype) : T('eq.none')], ...(S.mtype ? [[T('x.mvalue'), S.mvalue], ['alpha', S.alpha]] : []), [T('bt.h'), S.boot ? `B = ${S.bootB}, ${T('bt.seed')} = ${S.seed}` : T('eq.none')],
    ...R.models.map(m => [`${T('m.model')}: ${m.name}`, `${S.src.headers[m.col]} · ${T('role.' + m.role)}`]), ['', T('x.def')], ['', T('noinf')]];
}
/** JSON run record (DI-07): settings and every model's measures, overall and by group (no row-level residuals: CSV). */
function recordPayload() {
  const col = c => c == null ? null : S.src.headers[c];
  return { tool: E.TOOL, created: new Date().toISOString(),
    settings: { observed: col(S.obs), models: S.models.map(m => ({ column: col(m.col), name: m.name, role: m.role })), rowSet: S.rowSet, norm: S.norm, decimal: S.decimal, weight: col(S.weight),
      inference: { level: S.level, alpha: S.alpha, margin: S.mtype ? { type: S.mtype, value: margin() } : null, bootstrap: S.boot ? { B: S.bootB, seed: seed() } : null },
      groups: { plot: col(S.groups.plot), species: col(S.groups.species), fold: col(S.groups.fold), dclass: S.groups.dcol == null ? null : { column: col(S.groups.dcol), breaks: S.groups.breaks, openTop: S.groups.openTop } } },
    rows: { N: R.N, common: R.nCommon, sameSample: R.sameSample, weighted: R.weighted },
    models: R.models.map(m => ({ name: m.name, column: col(m.col), role: m.role, accounting: m.acc, overall: m.overall, groups: m.groups, inference: m.infer })),
    rankBootstrap: R.rankBoot ? { ...R.rankBoot, criteria: E.RANK_CRIT, models: R.rankBoot.models.map((x, i) => ({ name: R.models[i].name, ...x })) } : null };
}
function tabExport(p) {
  p.innerHTML = `<div class="exports"><button type="button" class="btn" id="x-xlsx">${T('ex.xlsx')}</button><button type="button" class="btn ghost" id="x-m">${T('ex.metrics')}</button>
    <button type="button" class="btn ghost" id="x-g"${groupKeys().length ? '' : ' disabled'}>${T('ex.groups')}</button><button type="button" class="btn ghost" id="x-i"${R.weighted ? ' disabled' : ''}>${T('ex.infer')}</button><button type="button" class="btn ghost" id="x-b"${R.weighted || !S.boot ? ' disabled' : ''}>${T('ex.boot')}</button><button type="button" class="btn ghost" id="x-r">${T('ex.rows')}</button>${recordButton('x-json')}</div><p class="muted small">${T('ex.note')}</p>`;
  $('x-m').addEventListener('click', () => downloadCSV(fname('model-olcutleri', 'model-measures') + '.csv', metricsRows(), lang));
  $('x-g').addEventListener('click', () => downloadCSV(fname('grup-olcutleri', 'group-measures') + '.csv', groupRows(), lang));
  $('x-r').addEventListener('click', () => downloadCSV(fname('artiklar', 'residuals') + '.csv', residualRows(), lang));
  $('x-i').addEventListener('click', () => downloadCSV(fname('cikarim', 'inference') + '.csv', inferRows(), lang));
  $('x-b').addEventListener('click', () => downloadCSV(fname('bootstrap', 'bootstrap') + '.csv', bootRows(), lang));
  $('x-json').addEventListener('click', () => downloadRecord(fname('model-degerlendirme', 'model-evaluation') + '.json', recordPayload(), E.TOOL,
    [[S.imp && S.imp.kind === 'dataset' ? 'dataset' : 'data', S.imp && S.imp.kind === 'dataset' ? { kind: 'dataset', dataset: approved } : S.imp]], m => status(m, 'err')));
  $('x-xlsx').addEventListener('click', async () => {
    let XLSX; try { XLSX = await loadXLSX(BASE); } catch (e) { status('XLSX', 'err'); return; }
    const sheets = [{ name: T('sheet.info'), rows: infoRows(), widths: [30, 100] }, { name: T('sheet.metrics'), rows: metricsRows() }, { name: T('sheet.acc'), rows: accRows() }];
    if (!R.weighted) sheets.push({ name: T('sheet.infer'), rows: inferRows() });
    if (!R.weighted && S.boot) sheets.push({ name: 'Bootstrap', rows: bootRows() });
    if (R.rankBoot) sheets.push({ name: T('rb.sheet'), rows: rankBootRows() });
    if (groupKeys().length) sheets.push({ name: T('sheet.groups'), rows: groupRows() });
    sheets.push({ name: T('sheet.rows'), rows: residualRows() });
    download(fname('model-degerlendirme', 'model-evaluation') + '.xlsx', xlsxBlob(XLSX, sheets));
  });
}

/* ---------------- shell ---------------- */
function canGo(n) { if (n <= 1) return true; if (!S.src) return false; if (n === 2) return true; return !problems().length; }
function go(n) { if (!canGo(n)) return; S.step = n; save(); render(); scrollTo({ top: $('steps').offsetTop - 8, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
function renderSteps() {
  $('steps').innerHTML = `<ol class="n3">${[1, 2, 3].map(n => `<li><button type="button" data-go="${n}"${S.step === n ? ' aria-current="step"' : ''}${canGo(n) ? '' : ' disabled'}><b>${n}</b> ${T('step.' + n)}</button></li>`).join('')}</ol>`;
  $('steps').querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(+b.dataset.go)));
}
function render() {
  if (!canGo(S.step)) S.step = [3, 2, 1].find(canGo);
  renderSteps();
  for (const n of [1, 2, 3]) $('step' + n).hidden = S.step !== n;
  ({ 1: renderStep1, 2: renderStep2, 3: renderStep3 })[S.step]();
}
(async function init() {
  $('privacy').textContent = T('privacy');
  try {
    const a = await get('dataset:approved'); if (a && a.schema === 'forest-dataset/1' && Array.isArray(a.trees)) approved = a;
    const saved = await get(KEY);
    if (saved && saved.v === 1) { S = { ...blank(), ...saved }; status(T('restored', { when: new Date(saved.saved).toLocaleString(LOC) })); }
    // a table handed over by another tool (Volume Equations, SV-04): observed and predicted columns chosen; read once
    const ho = await get('handoff:model-degerlendirme');
    if (ho && typeof ho.text === 'string') {
      await del('handoff:model-degerlendirme');
      const imp = { kind: 'paste', name: ho.name || 'handoff', text: ho.text, encoding: 'utf-8', delim: '\t', header: true, sheet: null }, src = await readImport(imp, BASE);
      S = blank(); S.imp = imp; S.src = src; guessColumns();
      S.obs = src.headers.indexOf(ho.obs); S.models = (ho.models || []).map(m => ({ col: src.headers.indexOf(m), name: m, role: E.ROLES.includes(ho.role) ? ho.role : 'unknown' })).filter(m => m.col >= 0);
      S.decimal = '.'; S.decimalChosen = true; S.step = 2; save(); status(T('handoff', { name: imp.name }), 'ok');
    }
  } catch (e) { S = blank(); }
  render();
})();
