// Diameter Distribution Lab (Weibull): user interface. All arithmetic lives in calc.js.
import * as W from './calc.js';
import { T } from './i18n.js';
import { lang, fmtNum, esc } from '../core/i18n.js';
import { put, get, del } from '../core/store.js';
import { cellText } from '../core/table.js';
import { detectDecimal, UNITS, defaultDecimal } from '../core/num.js';
import { download, downloadCSV, xlsxBlob, loadXLSX } from '../core/export.js';
import { plotChart, svgForDownload } from '../core/chart.js';
import { renderImport, readImport } from '../core/importer.js';
import { createUnitNav, DOT } from '../core/unitnav.js';
import { readNum } from '../eval/calc.js';
import { classesFromBreaks, breaksFromWidth } from '../stand/calc.js';

const BASE = './', KEY = 'session:' + W.TOOL.id, LOC = lang === 'tr' ? 'tr-TR' : 'en-GB', POOL = '\u0000pool';
const $ = id => document.getElementById(id);
const f = (x, d = 4) => x == null || !Number.isFinite(x) ? '–' : fmtNum(x, d);
const num = v => { const x = parseFloat(String(v).replace(',', '.')); return Number.isFinite(x) ? x : NaN; };
const natural = (a, b) => { const na = /^-?\d+(\.\d+)?$/.test(a), nb = /^-?\d+(\.\d+)?$/.test(b); return na && nb ? (+a - +b || (a < b ? -1 : 1)) : a < b ? -1 : a > b ? 1 : 0; };

let S = blank(), R = null, approved = null;
function blank() {
  return { v: 1, step: 1, tab: 'params', imp: null, src: null, dcol: null, unit: 'cm', pcol: null, fcol: null, fval: null, decimal: null, decimalChosen: false,
    trunc: null, truncAt: '', mode: 'each', aText: '', cls: { mode: 'width', start: '', width: '4', end: '', breaks: '' }, sel: null, shown: null, clsFit: 0,
    ex: { a: '0', b: '20', c: '2.5' } };
}
let saveT = null;
function save() { clearTimeout(saveT); saveT = setTimeout(flush, 250); }
async function flush() { clearTimeout(saveT); saveT = null; await put(KEY, { ...S, saved: new Date().toISOString() }); }
$('langlink') && $('langlink').addEventListener('click', async e => { e.preventDefault(); const h = e.currentTarget.href; await flush(); location.href = h; });
function status(m, k = '') { const s = $('status'); s.className = 'status ' + k; s.textContent = m || ''; }

/* ---------------- data ---------------- */
function setTable(state) {
  const keep = { trunc: S.trunc, truncAt: S.truncAt, ex: S.ex };
  S = { ...blank(), ...keep, step: S.step, imp: state.imp, src: state.src };
  R = null;
  if (S.src) {
    const H = S.src.headers.map(h => h.toLocaleLowerCase('tr'));
    const find = names => { const i = H.findIndex(h => names.includes(h)); return i < 0 ? null : i; };
    S.dcol = find(['dbh', 'dbh_cm', 'cap', 'çap', 'cap_cm', 'd', 'd13']); S.pcol = find(['plot', 'plot_id', 'alan', 'alan_no', 'ornek_alan']);
  }
  if (S.imp && S.imp.kind === 'dataset') { S.decimal = S.imp.decimal || '.'; S.decimalChosen = true; }
  status(''); save(); render();
}
function datasetTable(ds) {
  const cols = [['plot_id', 's'], ['tree_id', 's'], ['period', 's'], ['species', 's'], ['dbh', 'n', 'dbh_cm'], ['status', 's']];
  const cell = (v, t) => v == null ? { t: 's', v: '' } : t === 'n' ? { t: 'n', v, w: String(v) } : { t: 's', v: String(v) };
  return { kind: 'dataset', name: (ds.source && ds.source.trees && ds.source.trees.name) || 'dataset', headers: cols.map(c => c[2] || c[0]),
    rows: ds.trees.map(t => cols.map(c => cell(t[c[0]], c[1]))), rowNumbers: ds.trees.map(t => t.row), meta: {} };
}
/** Diameters (cm) per plot after the filter; counts of what was left out. */
function extract() {
  const out = new Map(), acc = { bad: 0, np: 0, f: 0 }, src = S.src;
  for (const r of src.rows) {
    if (S.fcol != null && S.fval != null && cellText(r[S.fcol]) !== S.fval) { acc.f++; continue; }
    const v = readNum(r[S.dcol], S.decimal);
    if (v.status !== 'ok') { acc.bad++; continue; }
    const d = v.value * UNITS.dbh[S.unit];
    if (!(d > 0)) { acc.np++; continue; }
    const p = S.pcol != null ? cellText(r[S.pcol]).trim() : '';
    if (!out.has(p)) out.set(p, []); out.get(p).push(d);
  }
  return { byPlot: out, acc };
}
function renderStep1() {
  const el = $('step1');
  el.innerHTML = `<div id="impbox"></div><div class="card"><h2>${T('ds.h')}</h2><p class="muted">${T('ds.sub')}</p>
    ${approved ? `<button type="button" class="btn ghost" id="useds">${T('ds.use')}</button>` : `<p class="muted small">${T('ds.none')}</p>`}</div>
    <div class="card sample"><button type="button" class="btn ghost" id="sample">${T('sample')}</button><span class="muted small">${T('sample.note')}</span></div>
    <div class="nav"><button type="button" class="btn ghost" id="reset">${T('reset')}</button><button type="button" class="btn" id="to2"${S.src ? '' : ' disabled'}>${T('next')}</button>${S.src ? '' : `<span class="muted small">${T('need.data')}</span>`}</div>`;
  renderImport($('impbox'), { imp: S.imp, src: S.src }, { base: BASE, title: T('imp.h'), sub: T('imp.sub'), onChange: setTable, onError: m => status(m, 'err') });
  $('useds') && $('useds').addEventListener('click', () => { const src = datasetTable(approved); setTable({ imp: { kind: 'dataset', name: src.name, decimal: '.' }, src }); });
  $('sample').addEventListener('click', async () => {
    const buf = await (await fetch(BASE + 'assets/lab/weibull/ornek/ornek-caplar.csv')).arrayBuffer();
    const imp = { kind: 'csv', name: lang === 'tr' ? 'ornek-caplar.csv (benzetim)' : 'ornek-caplar.csv (simulated)', buf, encoding: 'utf-8', delim: null, header: true, sheet: null };
    setTable({ imp, src: await readImport(imp, BASE) });
  });
  $('reset').addEventListener('click', async () => { const ex = S.ex; S = blank(); S.ex = ex; R = null; status(''); render(); await del(KEY); });
  $('to2').addEventListener('click', () => go(2));
}

/* ---------------- settings ---------------- */
function aFixed() { const t = String(S.aText).trim(); if (!t) return { a: null }; const a = num(t); return Number.isFinite(a) && a >= 0 ? { a } : { problem: 'a.bad' }; }
function currentClasses() {
  const c = S.cls;
  if (c.mode === 'width') { const b = breaksFromWidth(num(c.start), num(c.width), num(c.end)); return b ? classesFromBreaks(b, false) : { problem: 'cls.width.bad' }; }
  return classesFromBreaks(String(c.breaks).trim().split(/[;\s]+/).filter(Boolean).map(num), false);
}
function settingsProblems() {
  const p = [];
  if (S.dcol == null) p.push(T('col.dbh'));
  if (!S.decimal) p.push(T('dec.choose'));
  if (!S.trunc) p.push(T('tr.need'));
  if (S.trunc === 'yes') p.push(T('tr.block'));
  if (aFixed().problem) p.push(T('a.bad'));
  const c = currentClasses(); if (c.problem) p.push(T(c.problem));
  return p;
}
function defaultClasses() {
  if (S.dcol == null || !S.decimal || S.cls.start !== '') return;
  const all = [...extract().byPlot.values()].flat(); if (!all.length) return;
  const w = 4, mn = Math.min(...all), mx = Math.max(...all);
  Object.assign(S.cls, { start: String(Math.floor(mn / w) * w), width: String(w), end: String(Math.floor(mx / w) * w + w) });
}
function renderStep2() {
  const el = $('step2'), H = S.src.headers;
  const opts = (sel, none = true) => (none ? `<option value="">${T('none')}</option>` : '') + H.map((h, i) => `<option value="${i}"${sel === i ? ' selected' : ''}>${esc(h)}</option>`).join('');
  const dv = detectDecimal(S.dcol == null ? [] : S.src.rows.map(r => r[S.dcol]).filter(c => c && c.t === 's').map(c => c.v));
  if (!S.decimalChosen) S.decimal = defaultDecimal(dv.verdict);
  defaultClasses();
  const fvals = S.fcol != null ? [...new Set(S.src.rows.map(r => cellText(r[S.fcol])))].sort(natural) : [];
  let h = `<div class="card"><h2>${T('col.h')}</h2><div class="lims">
    <label>${T('col.dbh')} <select id="dcol">${opts(S.dcol)}</select></label>
    <label>${T('col.unit')} <select id="unit">${['cm', 'mm'].map(u => `<option${S.unit === u ? ' selected' : ''}>${u}</option>`).join('')}</select></label>
    <label>${T('col.plot')} <select id="pcol">${opts(S.pcol)}</select></label>
    <label>${T('col.filter')} <select id="fcol">${opts(S.fcol)}</select></label>
    ${S.fcol != null ? `<label>${T('col.fval')} <select id="fval"><option value="">${T('none')}</option>${fvals.map(v => `<option${S.fval === v ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></label>` : ''}</div></div>`;
  const dmsg = dv.verdict === 'ambiguous' ? T('dec.v.ambiguous', { ex: dv.examples.ambiguous.map(x => `"${x}"`).join(', ') }) : T('dec.v.' + dv.verdict);
  h += `<div class="card"><h2>${T('dec.h')}</h2><p class="note ${dv.verdict === 'ambiguous' || dv.verdict === 'conflict' ? 'warn' : ''}">${esc(dmsg)}</p><div class="radios">
    <label><input type="radio" name="dec" value="."${S.decimal === '.' ? ' checked' : ''}> ${T('dec.dot')}</label><label><input type="radio" name="dec" value=","${S.decimal === ',' ? ' checked' : ''}> ${T('dec.comma')}</label></div></div>`;
  h += `<div class="card"><h2>${T('tr.h')}</h2><p class="muted">${T('tr.sub')}</p><div class="radios col">
    <label><input type="radio" name="tr" value="none"${S.trunc === 'none' ? ' checked' : ''}> ${T('tr.none')}</label>
    <label><input type="radio" name="tr" value="yes"${S.trunc === 'yes' ? ' checked' : ''}> ${T('tr.yes')}</label></div>
    ${S.trunc === 'yes' ? `<label class="field inline"><span>${T('tr.at')}</span><input type="text" inputmode="decimal" id="trat" value="${esc(S.truncAt)}" size="6"></label><p class="note err">${T('tr.block')}</p>` : ''}</div>`;
  if (S.pcol != null) h += `<div class="card"><h2>${T('an.h')}</h2><div class="radios col">${['each', 'pool'].map(v => `<label><input type="radio" name="an" value="${v}"${S.mode === v ? ' checked' : ''}> ${T('an.' + v)}</label>`).join('')}</div>
    ${S.mode === 'pool' ? `<p class="note warn">${T('an.pool.note')}</p>` : ''}</div>`;
  h += `<div class="card"><h2>${T('a.h')}</h2><p class="muted">${T('a.sub')}</p><label class="field inline"><span>${T('a.label')}</span><input type="text" inputmode="decimal" id="afix" value="${esc(S.aText)}" size="8"></label></div>`;
  const c = S.cls, cl = currentClasses();
  h += `<div class="card"><h2>${T('cls.h')}</h2><p class="muted">${T('cls.sub')}</p>
    <div class="radios"><label><input type="radio" name="cm" value="width"${c.mode === 'width' ? ' checked' : ''}> ${T('cls.width')}</label><label><input type="radio" name="cm" value="list"${c.mode === 'list' ? ' checked' : ''}> ${T('cls.list')}</label></div>
    ${c.mode === 'width' ? `<div class="lims">${['start', 'width', 'end'].map(k => `<label>${T('cls.' + (k === 'width' ? 'w' : k))} <input type="text" inputmode="decimal" data-c="${k}" value="${esc(c[k])}" size="6"></label>`).join('')}</div>`
      : `<label class="field"><span>${T('cls.breaks')}</span><input type="text" data-c="breaks" value="${esc(c.breaks)}"></label>`}
    <p class="small" id="clsprev">${cl.problem ? `<span class="note err">${T(cl.problem)}</span>` : cl.classes.map(k => `[${f(k.lo, 3)}, ${f(k.hi, 3)})`).join(' ')}</p></div>`;
  const pr = settingsProblems();
  h += `<div class="nav"><button type="button" class="btn ghost" id="back1">${T('back')}</button><button type="button" class="btn" id="calc"${pr.length ? ' disabled' : ''}>${T('calc')}</button></div>`;
  el.innerHTML = h;
  const re = () => { R = null; save(); renderStep2(); renderSteps(); };
  const sel = (id, k) => $(id) && $(id).addEventListener('change', e => { S[k] = e.target.value === '' ? null : +e.target.value; if (k === 'fcol') S.fval = null; if (k === 'dcol') S.cls.start = ''; re(); });
  sel('dcol', 'dcol'); sel('pcol', 'pcol'); sel('fcol', 'fcol');
  $('unit').addEventListener('change', e => { S.unit = e.target.value; S.cls.start = ''; re(); });
  $('fval') && $('fval').addEventListener('change', e => { S.fval = e.target.value || null; re(); });
  el.querySelectorAll('input[name="dec"]').forEach(x => x.addEventListener('change', () => { S.decimal = x.value; S.decimalChosen = true; S.cls.start = ''; re(); }));
  el.querySelectorAll('input[name="tr"]').forEach(x => x.addEventListener('change', () => { S.trunc = x.value; re(); }));
  $('trat') && $('trat').addEventListener('change', e => { S.truncAt = e.target.value; save(); });
  el.querySelectorAll('input[name="an"]').forEach(x => x.addEventListener('change', () => { S.mode = x.value; re(); }));
  $('afix').addEventListener('change', e => { S.aText = e.target.value; re(); });
  el.querySelectorAll('input[name="cm"]').forEach(x => x.addEventListener('change', () => {
    if (x.value === 'list' && !c.breaks) { const b = breaksFromWidth(num(c.start), num(c.width), num(c.end)); c.breaks = b ? b.join(' ') : ''; }
    c.mode = x.value; re();
  }));
  el.querySelectorAll('[data-c]').forEach(x => x.addEventListener('change', () => { c[x.dataset.c] = x.value; re(); }));
  $('back1').addEventListener('click', () => go(1));
  $('calc').addEventListener('click', () => { compute(); S.tab = 'params'; go(3); });
}
function compute() {
  const { byPlot, acc } = extract(), a = aFixed().a, cl = currentClasses().classes;
  const units = [];
  if (S.pcol != null && S.mode === 'each') for (const p of [...byPlot.keys()].sort(natural)) units.push({ id: p, label: T('unit.plot', { p }), d: byPlot.get(p) });
  else units.push({ id: POOL, label: S.pcol != null ? T('unit.pool') : T('unit.all'), d: [...byPlot.values()].flat() });
  for (const u of units) {
    u.res = W.analyse(u.d, a); u.classes = u.res.fits.map(fi => fi.status === 'ok' ? W.classTable(u.d, fi, cl) : null);
    const ml = u.res.fits[0], notices = W.checkSample(u.d, 0).notices;
    u.state = ml.status !== 'ok' ? 'error' : u.res.fits.some(fi => fi.status !== 'ok') || notices.length ? 'warning' : 'ok';
    u.ks = ml.status === 'ok' ? ml.ks : null;
  }
  R = { units, acc, a, classes: cl };
  if (!units.some(u => u.id === S.sel)) S.sel = units[0].id;
}

/* ---------------- results ---------------- */
const TABS = ['params', 'charts', 'classes', 'plots', 'export'];
const unit = () => R.units.find(u => u.id === S.sel) || R.units[0];
const fitName = fi => `${T('m.' + fi.method)}, ${fi.aKind === 'zero' ? T('k.zero') : `${T('k.fixed')} (a = ${f(fi.a, 3)})`}`;
function renderStep3() {
  if (!R) compute();
  const tabs = TABS.filter(t => t !== 'plots' || R.units.length > 1), el = $('step3');
  if (!tabs.includes(S.tab)) S.tab = 'params';
  const withNav = multi() && NAVTABS.includes(S.tab);
  el.innerHTML = `<div class="tabs" role="tablist">${tabs.map(t => `<button type="button" role="tab" id="tab-${t}" aria-selected="${S.tab === t}" aria-controls="panel" data-tab="${t}">${T('tab.' + t)}</button>`).join('')}</div>
    <div class="panel${withNav ? ' withnav' : ''}">${withNav ? '<aside class="unav" id="unav" aria-label="' + esc(T('nav.list')) + '"></aside>' : ''}<div id="panel" role="tabpanel" aria-labelledby="tab-${S.tab}"></div></div>
    <div class="nav"><button type="button" class="btn ghost" id="back2">${T('back')}</button></div>`;
  if (withNav) renderAside();
  el.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { S.tab = b.dataset.tab; save(); renderStep3(); }));
  el.querySelector('.tabs').addEventListener('keydown', e => {
    const i = tabs.indexOf(S.tab), d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return; S.tab = tabs[(i + d + tabs.length) % tabs.length]; renderStep3(); $('tab-' + S.tab).focus();
  });
  $('back2').addEventListener('click', () => go(2));
  tabFn()($('panel'));
}
const tabFn = () => ({ params: tabParams, charts: tabCharts, classes: tabClasses, plots: tabPlots, export: tabExport })[S.tab];
const NAVTABS = ['params', 'charts', 'classes'];
const multi = () => R && R.units.length > 1;
const natural2 = (a, b) => natural(String(a), String(b));
/** Plot navigator (shared component, core/unitnav.js): list beside the results, previous / next bar, ← → keys. */
const nav = createUnitNav({
  items: () => R.units.map(u => ({ id: u.id, label: u.id, barLabel: u.label, search: u.id, state: u.state, stateTitle: T('nav.st.' + u.state),
    meta: [`n ${u.d.length}`, u.ks != null ? 'D ' + fmtNum(u.ks, 3) : '–'], barMeta: `n = ${u.d.length}` })),
  sorts: [
    { key: 'id', label: T('nav.sort.id'), cmp: (a, b) => natural2(a.id, b.id) },
    { key: 'n', label: T('nav.sort.n'), cmp: (a, b) => unitById(b.id).d.length - unitById(a.id).d.length },
    { key: 'ks', label: T('nav.sort.ks'), cmp: (a, b) => (unitById(b.id).ks ?? Infinity) - (unitById(a.id).ks ?? Infinity) },
    { key: 'state', label: T('nav.sort.state'), cmp: (a, b) => ({ error: 0, warning: 1, ok: 2 }[a.state] - { error: 0, warning: 1, ok: 2 }[b.state]) }],
  texts: { search: T('nav.search'), sort: T('nav.sort'), bad: T('nav.bad'), count: p => T('nav.count', p), none: T('nav.none'), prev: T('nav.prev'), next: T('nav.next'), keys: T('nav.keys'), outside: T('nav.outside') },
  prefs: () => S.nav || (S.nav = { q: '', sort: 'id', bad: false }),
  getSel: () => S.sel, setSel: id => { S.sel = id; tabFn()($('panel')); }, save,
});
const unitById = id => R.units.find(u => String(u.id) === String(id));
function renderAside() { nav.renderAside($('unav')); }
document.addEventListener('keydown', e => { if (R && S.step === 3 && multi() && NAVTABS.includes(S.tab)) nav.handleKey(e, '#explore'); });
function unitPicker() { return nav.bar(); }
function bindPicker() { nav.bindBar(); }
function statusText(fi) {
  if (fi.status === 'ok') return T('s.ok');
  if (fi.status === 'boundary') return `${T('s.boundary')}: ${T(fi.side === 'above' ? 'b.above' : 'b.below', { lo: W.C_RANGE[0], hi: W.C_RANGE[1] })}`;
  if (fi.status === 'noconverge') return `${T('s.noconverge')}: ${T('nc')}`;
  return `${T('s.problem')}: ${fi.problems.map(pr => T('pr.' + pr.code, { ...pr, a: f(pr.a, 3), min: f(pr.min, 3), value: f(pr.value, 3) })).join(' ')}`;
}
function tabParams(p) {
  const u = unit(), r = u.res;
  let h = unitPicker() + `<p class="note">${T('def')}</p>`;
  if (R.acc.bad || R.acc.np || R.acc.f) h += `<p class="small muted">${T('exc', R.acc)}</p>`;
  h += `<p class="small">n = ${r.n} · ${T('pl.uniq')}: ${r.unique} · d min–${lang === 'tr' ? 'maks' : 'max'}: ${f(r.min, 2)}–${f(r.max, 2)} cm</p>`;
  const notices = W.checkSample(u.d, 0).notices;
  for (const no of notices) h += `<p class="note warn">${T('no.' + no.code, no)}</p>`;
  h += `<div class="tscroll"><table class="grid"><thead><tr><th>${T('p.method')}</th><th>${T('p.a')}</th><th>${T('p.b')}</th><th>${T('p.c')}</th><th>${T('p.status')}</th><th>${T('p.ll')}</th><th>${T('p.aic')}</th><th>${T('p.bic')}</th><th>${T('p.ks')}</th><th>${T('p.ad')}</th><th>${T('p.mean')}</th><th>${T('p.sd')}</th><th>${T('p.median')}</th></tr></thead><tbody>`;
  for (const fi of r.fits) {
    const okk = fi.status === 'ok';
    h += `<tr><th>${T('m.' + fi.method)}<br><span class="kind">${fi.aKind === 'zero' ? T('k.zero') : T('k.fixed')}</span></th>
      <td class="num">${f(fi.a, 3)} <span class="kind">${fi.aKind === 'zero' ? T('a.zerotag') : T('a.fixedtag')}</span></td><td class="num">${okk ? f(fi.b) : '–'}</td><td class="num">${okk ? f(fi.c) : '–'}</td>
      <td class="${okk ? '' : 'undef'}">${esc(statusText(fi))}</td><td class="num">${okk ? f(fi.logLik, 3) : '–'}</td><td class="num">${fi.aic != null ? f(fi.aic, 3) : '–'}</td><td class="num">${fi.bic != null ? f(fi.bic, 3) : '–'}</td>
      <td class="num">${okk ? f(fi.ks) : '–'}</td><td class="num">${okk ? f(fi.ad) : '–'}</td><td class="num">${okk ? f(fi.mom.mean, 3) : '–'}</td><td class="num">${okk ? f(fi.mom.sd, 3) : '–'}</td><td class="num">${okk ? f(fi.mom.median, 3) : '–'}</td></tr>`;
  }
  h += '</tbody></table></div>';
  if (r.fits.some(fi => fi.status === 'ok' && fi.c <= 1)) h += `<p class="note">${T('no.cbelow1')}</p>`;
  p.innerHTML = h + `<p class="muted small">${T('gof')}</p><p class="muted small">${T('aic')}</p>`;
  bindPicker(p, tabParams);
}
function chartRange(u) {
  const cl = R.classes, lo = Math.min(cl[0].lo, u.res.min ?? cl[0].lo), hi = Math.max(cl[cl.length - 1].hi, u.res.max ?? 0);
  return { xmin: Math.max(0, lo - (hi - lo) * 0.03), xmax: hi + (hi - lo) * 0.03 };
}
function tabCharts(p) {
  const u = unit(), okFits = u.res.fits.map((fi, i) => [fi, i]).filter(([fi]) => fi.status === 'ok');
  if (!S.shown) S.shown = okFits.map(([, i]) => i);
  const shown = okFits.filter(([, i]) => S.shown.includes(i));
  let h = unitPicker();
  if (!okFits.length) { p.innerHTML = h + `<p class="note warn">${T('c.nofit')}</p>`; bindPicker(p, tabCharts); return; }
  h += `<p class="small">${T('ch.fit')}: ${okFits.map(([fi, i]) => `<label class="chk"><input type="checkbox" data-fit="${i}"${S.shown.includes(i) ? ' checked' : ''}> ${esc(fitName(fi))}</label>`).join(' ')}</p>`;
  const { xmin, xmax } = chartRange(u), n = u.d.length;
  const bars = R.classes.map(k => ({ lo: k.lo, hi: k.hi, v: u.d.filter(v => v >= k.lo && v < k.hi).length / (n * (k.hi - k.lo)) }));
  const xs = Array.from({ length: 401 }, (_, i) => xmin + (xmax - xmin) * i / 400);
  const lines = shown.map(([fi, i]) => ({ name: fitName(fi), k: i, dash: fi.method === 'mom', pts: xs.map(x => [x, W.pdf(x, fi)]) }));
  const ec = W.ecdf(u.d), step = [[xmin, 0], ...ec.map(([x], j) => [x, (j + 1) / n]), [xmax, 1]];
  const cdfs = [{ name: T('ch.ecdf'), step: true, k: 5, pts: step }, ...shown.map(([fi, i]) => ({ name: fitName(fi), k: i, dash: fi.method === 'mom', pts: xs.map(x => [x, W.cdf(x, fi)]) }))];
  const fm = v => fmtNum(v, 3), nm = String(u.id === POOL ? 'havuz' : u.id).replace(/[^\p{L}\p{N}_-]+/gu, '_');
  h += `<div class="charts2"><figure class="chartbox" id="ch-h">${plotChart({ title: T('ch.hist', { u: u.label }), xmin, xmax, bars, lines, xLabel: T('ch.d'), yLabel: T('ch.dens'), fmt: fm })}
      <figcaption><span class="muted small">${T('ch.histw')}</span> <button type="button" class="btn ghost small" data-svg="ch-h" data-name="histogram-${nm}">${T('ch.svg')}</button></figcaption></figure>
    <figure class="chartbox" id="ch-c">${plotChart({ title: T('ch.cdf', { u: u.label }), xmin, xmax, ymin: 0, ymax: 1, lines: cdfs, xLabel: T('ch.d'), yLabel: T('ch.F'), fmt: fm })}
      <figcaption><button type="button" class="btn ghost small" data-svg="ch-c" data-name="birikimli-${nm}">${T('ch.svg')}</button></figcaption></figure></div>`;
  p.innerHTML = h;
  bindPicker(p, tabCharts);
  p.querySelectorAll('[data-fit]').forEach(x => x.addEventListener('change', () => { const i = +x.dataset.fit; S.shown = x.checked ? [...S.shown, i] : S.shown.filter(j => j !== i); save(); tabCharts(p); }));
  p.querySelectorAll('[data-svg]').forEach(b => b.addEventListener('click', () => download(b.dataset.name + '.svg', svgForDownload($(b.dataset.svg).querySelector('svg')), 'image/svg+xml')));
}
function tabClasses(p) {
  const u = unit(), ok = u.res.fits.map((fi, i) => [fi, i]).filter(([fi]) => fi.status === 'ok');
  let h = unitPicker();
  if (!ok.length) { p.innerHTML = h + `<p class="note warn">${T('c.nofit')}</p>`; bindPicker(p, tabClasses); return; }
  if (!ok.some(([, i]) => i === S.clsFit)) S.clsFit = ok[0][1];
  const fi = u.res.fits[S.clsFit], ct = u.classes[S.clsFit];
  h += `<label class="field inline"><span>${T('c.pick')}</span><select id="cfit">${ok.map(([x, i]) => `<option value="${i}"${i === S.clsFit ? ' selected' : ''}>${esc(fitName(x))}</option>`).join('')}</select></label>
    <p class="small">a = ${f(fi.a, 3)}, b = ${f(fi.b)}, c = ${f(fi.c)}; n = ${ct.n}</p>`;
  const row = (lab, r, cls = '') => `<tr class="${cls}"><th class="nowrap">${lab}</th><td class="num">${fmtNum(r.obs, 0)}</td><td class="num">${f(r.prob, 6)}</td><td class="num">${f(r.exp, 3)}</td><td class="num">${f(r.obs - r.exp, 3)}</td></tr>`;
  h += `<div class="tscroll"><table class="grid"><thead><tr><th>${T('c.class')}</th><th>${T('c.obs')}</th><th>${T('c.prob')}</th><th>${T('c.exp')}</th><th>${T('c.diff')}</th></tr></thead><tbody>
    ${row(T('c.below', { b: f(R.classes[0].lo, 3) }), ct.lower, 'tail')}
    ${ct.rows.map(r => row(`[${f(r.lo, 3)}, ${f(r.hi, 3)})`, r)).join('')}
    ${row(T('c.above', { b: f(R.classes[R.classes.length - 1].hi, 3) }), ct.upper, 'tail')}
    <tr><th>${T('c.vis')}</th><td class="num">${fmtNum(ct.rows.reduce((s, r) => s + r.obs, 0), 0)}</td><td class="num">${f(ct.visibleProb, 6)}</td><td class="num">${f(ct.n * ct.visibleProb, 3)}</td><td></td></tr>
    <tr><th>${T('c.tot')}</th><td class="num">${fmtNum(ct.n, 0)}</td><td class="num">${f(ct.totalProb, 6)}</td><td class="num">${f(ct.n * ct.totalProb, 3)}</td><td></td></tr></tbody></table></div>`;
  p.innerHTML = h + `<p class="muted small">${T('c.note')}</p>`;
  bindPicker(p, tabClasses);
  $('cfit').addEventListener('change', e => { S.clsFit = +e.target.value; save(); tabClasses(p); });
}
function tabPlots(p) {
  const heads = R.units[0].res.fits.map(fi => fitName(fi));
  p.innerHTML = `<p class="muted">${T('pl.note')}</p><div class="tscroll"><table class="grid"><thead><tr><th>${T('pl.plot')}</th><th>${T('pl.n')}</th><th>${T('pl.uniq')}</th><th>${T('pl.min')}</th><th>${T('pl.max')}</th>
    ${heads.map(x => `<th>${esc(x)}: b, c</th><th>KS D</th>`).join('')}</tr></thead><tbody>
    ${R.units.map(u => `<tr><th><button type="button" class="linkbtn" data-go="${esc(u.id)}" title="${esc(T('nav.open'))}"><code>${esc(u.id)}</code></button> <span class="ust st-${u.state}">${DOT[u.state]}</span></th><td class="num">${u.res.n}</td><td class="num">${u.res.unique}</td><td class="num">${f(u.res.min, 1)}</td><td class="num">${f(u.res.max, 1)}</td>
      ${u.res.fits.map(fi => fi.status === 'ok' ? `<td class="num nowrap">${f(fi.b, 3)}; ${f(fi.c, 3)}</td><td class="num">${f(fi.ks, 4)}</td>` : `<td class="undef" colspan="2">${esc(statusText(fi))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  p.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { S.sel = b.dataset.go; S.tab = 'charts'; save(); renderStep3(); }));
}

/* ---------------- exports ---------------- */
const fname = (a, b) => `${lang === 'tr' ? a : b}-${new Date().toISOString().slice(0, 10)}`;
function paramRows() {
  const out = [[T('x.unit'), T('p.method'), T('p.form'), T('p.a'), T('p.b'), T('p.c'), T('p.status'), T('p.iter'), T('p.ll'), T('p.aic'), T('p.bic'), T('p.ks'), T('p.ad'), T('p.mean'), T('p.sd'), T('p.median'), 'n']];
  for (const u of R.units) for (const fi of u.res.fits) {
    const ok = fi.status === 'ok';
    out.push([u.id === POOL ? u.label : u.id, T('m.' + fi.method), fi.aKind === 'zero' ? T('k.zero') : T('k.fixed'), fi.a, ok ? fi.b : null, ok ? fi.c : null, statusText(fi), fi.iter ?? null,
      ok ? fi.logLik : null, fi.aic ?? null, fi.bic ?? null, ok ? fi.ks : null, ok ? fi.ad : null, ok ? fi.mom.mean : null, ok ? fi.mom.sd : null, ok ? fi.mom.median : null, u.res.n]);
  }
  return out;
}
function classRows() {
  const out = [[T('x.unit'), T('x.fit'), T('c.class'), 'lower_cm', 'upper_cm', T('c.obs'), T('c.prob'), T('c.exp')]];
  for (const u of R.units) u.res.fits.forEach((fi, i) => {
    const ct = u.classes[i]; if (!ct) return; const uid = u.id === POOL ? u.label : u.id, fn = fitName(fi);
    out.push([uid, fn, T('c.below', { b: R.classes[0].lo }), null, R.classes[0].lo, ct.lower.obs, ct.lower.prob, ct.lower.exp]);
    for (const r of ct.rows) out.push([uid, fn, `[${r.lo}, ${r.hi})`, r.lo, r.hi, r.obs, r.prob, r.exp]);
    out.push([uid, fn, T('c.above', { b: R.classes[R.classes.length - 1].hi }), R.classes[R.classes.length - 1].hi, null, ct.upper.obs, ct.upper.prob, ct.upper.exp]);
  });
  return out;
}
function infoRows() {
  return [[T('x.k'), T('x.v')], [T('x.tool'), `${W.TOOL.id} ${W.TOOL.version}`], [T('x.date'), new Date().toISOString()], [T('x.src'), S.imp ? S.imp.name : ''],
    [T('col.dbh'), `${S.src.headers[S.dcol]} (${S.unit})`], [T('x.unit'), S.pcol == null ? T('unit.all') : T('an.' + S.mode)], [T('x.trunc'), T('tr.' + S.trunc)],
    [T('x.a'), R.a == null ? '–' : R.a], [T('x.cls'), R.classes.map(k => `[${k.lo}, ${k.hi})`).join(' ')], ['', T('def')], ['', T('gof')], ['', T('aic')], ['', T('exc', R.acc)]];
}
function tabExport(p) {
  p.innerHTML = `<div class="exports"><button type="button" class="btn" id="x-xlsx">${T('ex.xlsx')}</button><button type="button" class="btn ghost" id="x-p">${T('ex.params')}</button><button type="button" class="btn ghost" id="x-c">${T('ex.classes')}</button></div><p class="muted small">${T('ex.note')}</p>`;
  $('x-p').addEventListener('click', () => downloadCSV(fname('weibull-parametreleri', 'weibull-parameters') + '.csv', paramRows(), lang));
  $('x-c').addEventListener('click', () => downloadCSV(fname('weibull-siniflari', 'weibull-classes') + '.csv', classRows(), lang));
  $('x-xlsx').addEventListener('click', async () => {
    let XLSX; try { XLSX = await loadXLSX(BASE); } catch (e) { status('XLSX', 'err'); return; }
    download(fname('cap-dagilimi-weibull', 'diameter-distribution-weibull') + '.xlsx', xlsxBlob(XLSX, [{ name: T('sheet.info'), rows: infoRows(), widths: [28, 100] }, { name: T('sheet.params'), rows: paramRows() }, { name: T('sheet.classes'), rows: classRows() }]));
  });
}

/* ---------------- curve explorer: user's own a, b, c; never fitted ---------------- */
function renderExplorer() {
  const e = S.ex;
  const rng = (k, lo, hi, st) => `<div class="range"><label for="ex-${k}">${k}</label><input type="range" id="exr-${k}" min="${lo}" max="${hi}" step="${st}" value="${Number.isFinite(num(e[k])) ? num(e[k]) : lo}" aria-label="${k}"><input type="text" inputmode="decimal" id="ex-${k}" value="${esc(e[k])}" size="6"></div>`;
  $('explore').innerHTML = `<details${S.exOpen ? ' open' : ''} id="exdet"><summary><b>${T('ex.h2')}</b> <span class="tag">${T('ex.tag')}</span></summary><p class="muted">${T('ex.sub')}</p>
    ${rng('a', 0, 40, 0.5)}${rng('b', 0.5, 80, 0.5)}${rng('c', 0.2, 8, 0.05)}<div id="exout"></div></details>`;
  $('exdet').addEventListener('toggle', ev => { S.exOpen = ev.target.open; save(); });
  for (const k of ['a', 'b', 'c']) {
    $('exr-' + k).addEventListener('input', ev => { S.ex[k] = ev.target.value; $('ex-' + k).value = ev.target.value; save(); updateExplorer(); });
    $('ex-' + k).addEventListener('input', ev => { S.ex[k] = ev.target.value; const v = num(ev.target.value); if (Number.isFinite(v)) $('exr-' + k).value = v; save(); updateExplorer(); });
  }
  updateExplorer();
}
/** Only the output part is redrawn, so the inputs keep focus while typing or dragging. */
function updateExplorer() {
  const e = S.ex, p = { a: num(e.a), b: num(e.b), c: num(e.c) }, okp = W.validParams(p) && p.a >= 0;
  if (!okp) { $('exout').innerHTML = `<p class="note err">${T('ex.bad')}</p>`; return; }
  const m = W.moments(p), xmax = W.quantile(0.999, p) * 1.05, xs = Array.from({ length: 401 }, (_, i) => xmax * i / 400), lab = { a: f(p.a, 2), b: f(p.b, 2), c: f(p.c, 2) };
  $('exout').innerHTML = `<div class="charts2"><figure class="chartbox">${plotChart({ title: T('ex.pdf', lab), xmin: 0, xmax, lines: [{ k: 3, pts: xs.map(x => [x, W.pdf(x, p)]) }], xLabel: T('ch.d'), yLabel: T('ch.dens'), fmt: v => fmtNum(v, 3), height: 300 })}</figure>
    <figure class="chartbox">${plotChart({ title: T('ex.cdf', lab), xmin: 0, xmax, ymin: 0, ymax: 1, lines: [{ k: 3, pts: xs.map(x => [x, W.cdf(x, p)]) }], xLabel: T('ch.d'), yLabel: T('ch.F'), fmt: v => fmtNum(v, 3), height: 300 })}</figure></div>
    <p class="small">${T('p.mean')}: ${f(m.mean, 3)} · ${T('p.sd')}: ${f(m.sd, 3)} · ${T('p.median')}: ${f(m.median, 3)} · ${T('ex.q')}: ${[0.05, 0.25, 0.75, 0.95].map(q => `P${q * 100} = ${f(W.quantile(q, p), 2)}`).join(', ')}</p>`;
}

/* ---------------- shell ---------------- */
function canGo(n) { if (n <= 1) return true; if (!S.src) return false; if (n === 2) return true; return !settingsProblems().length; }
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
  } catch (e) { S = blank(); }
  render(); renderExplorer();
})();
