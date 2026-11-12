// Site Index: user interface. All arithmetic lives in calc.js; dominant height H0 comes from the Plot & Stand tool's
// own functions (stand/calc.js), not a copy (TOOLS_T00 §2).
import * as S from './calc.js';
import { T } from './i18n.js';
import { lang, fmtNum, esc } from '../core/i18n.js';
import { put, get, del } from '../core/store.js';
import { cellText } from '../core/table.js';
import { parseNumber, detectDecimal, defaultDecimal } from '../core/num.js';
import { download, downloadCSV, downloadJSON, xlsxBlob, loadXLSX } from '../core/export.js';
import { plotChart, svgForDownload } from '../core/chart.js';
import { renderImport } from '../core/importer.js';
import { mountCoefEditor } from '../core/coef-ui.js';
import { saveCoef, blankSet } from '../core/coef.js';
import { scatterChart } from '../core/chart.js';
import { buildUnits, unitMetrics } from '../stand/calc.js';

const BASE = './', KEY = 'session:' + S.TOOL.id, LOC = lang === 'tr' ? 'tr-TR' : 'en-GB';
const $ = id => document.getElementById(id);
const f = (x, d = 3) => x == null || !Number.isFinite(x) ? '–' : fmtNum(x, d);
const num = v => { const t = String(v ?? '').trim(); if (!t) return null; const x = Number(t.replace(',', '.')); return Number.isFinite(x) ? x : NaN; };
const EXTRA = [
  { key: 'ageType', type: 'choice', required: true, label: { tr: T('x.ageType'), en: T('x.ageType') }, values: S.AGE_TYPES.map(v => ({ v, tr: T('x.ageType.' + v), en: T('x.ageType.' + v) })), note: { tr: T('x.ageType.note'), en: T('x.ageType.note') } },
  { key: 'topDef', type: 'choice', required: true, label: { tr: T('x.topDef'), en: T('x.topDef') }, values: ['h0dbh', 'h0height', 'other'].map(v => ({ v, tr: T('x.topDef.' + v), en: T('x.topDef.' + v) })) },
  { key: 'topNote', type: 'text', label: { tr: T('x.topNote'), en: T('x.topNote') } }];

let S0 = blank(), sets = [], R = null, approved = null;
function blank() {
  return { v: 1, step: 1, setId: null, a0: '', cls: { mode: 'none', start: '', width: '', n: '', list: '', order: 'desc' },
    fit: { imp: null, src: null, map: { series: null, plot: null, A: null, H: null }, decimal: null, decimalChosen: false, form: 'cr.ada.b0', pairing: 'consecutive', startMode: 'grid', start: {}, ageType: '', topDef: '', topNote: '', cit: '', open: false },
    mode: 'single', A: '', H: '', imp: null, src: null, map: { plot: null, period: null, A: null, H: null }, decimal: null, decimalChosen: false, dAge: null, rank: 'dbh' };
}
let saveT = null;
function save() { clearTimeout(saveT); saveT = setTimeout(flush, 250); }
async function flush() { clearTimeout(saveT); saveT = null; await put(KEY, { ...S0, saved: new Date().toISOString() }); }
$('langlink') && $('langlink').addEventListener('click', async e => { e.preventDefault(); const h = e.currentTarget.href; await flush(); location.href = h; });
function status(m, k = '') { const s = $('status'); s.className = 'status ' + k; s.textContent = m || ''; }

/* ---------------- model ---------------- */
const curSet = () => sets.find(s => s.id === S0.setId) || null;
const a0 = () => { const v = num(S0.a0); return v == null ? null : v > 0 ? v : NaN; };
const formName = id => S.FORMS[id] ? S.FORMS[id].formula[lang] || S.FORMS[id].formula.tr : id;
const topText = set => set && set.meta ? T('x.topDef.' + set.meta.topDef) + (set.meta.topNote ? ` (${set.meta.topNote})` : '') : '–';
function classDef() {
  const c = S0.cls;
  if (c.mode === 'equal') return { mode: 'equal', start: num(c.start), width: num(c.width), n: num(c.n), order: c.order };
  if (c.mode === 'breaks') return { mode: 'breaks', breaks: String(c.list).split(/[;\s]+/).filter(Boolean).map(x => num(x)), order: c.order };
  return { mode: 'none' };
}
function modelProblems() {
  const p = [];
  if (!curSet()) p.push(T('m.need'));
  if (!(a0() > 0)) p.push(T('m.a0.bad'));
  if (S.classesOf(classDef()).problems.length) p.push(T('cls.bad'));
  return p;
}
let editor = null;
function renderStep1() {
  const el = $('step1');
  if (!editor) { el.innerHTML = '<div id="coefbox"></div><details class="card more" id="fitbox"><summary>' + T('fit.h') + '</summary><div id="fitbody"></div></details><div id="m-rest"></div>'; $('fitbox').open = !!S0.fit.open; $('fitbox').addEventListener('toggle', e => { S0.fit.open = e.target.open; save(); if (e.target.open) renderFit(); }); if (S0.fit.open) setTimeout(renderFit, 0); editor = mountCoefEditor($('coefbox'), { tool: 'siteindex', extra: EXTRA, onChange: s => { sets = s; if (S0.setId && !curSet()) S0.setId = null; if (!S0.setId && sets.length === 1) S0.setId = sets[0].id; renderRest(); } }); }
  renderRest();
  function renderRest() {
    const set = curSet(), cd = S.classesOf(classDef());
    let h = `<div class="card"><h2>${T('m.h')}</h2>${sets.length ? `<div class="lims"><label>${T('m.set')} <select id="setsel"><option value="">${T('none')}</option>${sets.map(s => `<option value="${esc(s.id)}"${s.id === S0.setId ? ' selected' : ''}>${esc([s.species, s.region].filter(Boolean).join(' · ') || s.source.citation)} — ${esc(formName(String(s.form).replace(/^si\./, '')))}</option>`).join('')}</select></label></div>` : `<p class="small">${T('m.noset')}</p>`}
      ${set ? `<p class="small" id="setinfo">${esc(T('m.info', { form: formName(S.modelFromSet(set).form), age: set.meta ? T('x.ageType.' + set.meta.ageType) : '–', top: topText(set), src: set.source.citation }))}</p>` : ''}
      <div class="lims"><label>${T('m.a0')} <input type="text" inputmode="decimal" size="6" id="a0" value="${esc(S0.a0)}"></label></div><p class="muted small">${T('m.a0.note')}</p></div>
      <div class="card"><h2>${T('cls.h')}</h2><div class="radios">${['none', 'equal', 'breaks'].map(m => `<label><input type="radio" name="clsmode" value="${m}"${S0.cls.mode === m ? ' checked' : ''}> ${T('cls.' + m)}</label>`).join(' ')}</div>
      ${S0.cls.mode === 'equal' ? `<div class="lims">${[['start', 'cls.start'], ['width', 'cls.width'], ['n', 'cls.n']].map(([k, l]) => `<label>${T(l)} <input type="text" inputmode="decimal" size="6" id="cls-${k}" value="${esc(S0.cls[k])}"></label>`).join('')}</div>` : ''}
      ${S0.cls.mode === 'breaks' ? `<label class="field"><span>${T('cls.list')}</span><input type="text" id="cls-list" value="${esc(S0.cls.list)}"></label>` : ''}
      ${S0.cls.mode !== 'none' ? `<div class="radios"><span class="small">${T('cls.order')}:</span> ${['desc', 'asc'].map(o => `<label class="small"><input type="radio" name="clsorder" value="${o}"${S0.cls.order === o ? ' checked' : ''}> ${T('cls.order.' + o)}</label>`).join(' ')}</div>
        ${cd.problems.length ? `<p class="note err small">${T('cls.bad')}</p>` : cd.classes.length ? `<p class="small" id="clsprev">${esc(T('cls.preview', { list: cd.classes.slice().reverse().map(k => `${k.name}: ${fmtNum(k.lo, 2)}–${fmtNum(k.hi, 2)}`).join(', ') }))}</p>` : ''}` : ''}
      <p class="muted small">${T('cls.note')}</p></div>`;
    const pr = modelProblems();
    h += `<div class="nav"><button type="button" class="btn ghost" id="reset">${T('reset')}</button><button type="button" class="btn" id="to2"${pr.length ? ' disabled' : ''}>${T('next')}</button>${pr.length ? `<span class="muted small">${pr.map(esc).join(' ')}</span>` : ''}</div>`;
    $('m-rest').innerHTML = h;
    const re = () => { R = null; save(); renderRest(); renderSteps(); };
    $('setsel') && $('setsel').addEventListener('change', e => { S0.setId = e.target.value || null; re(); });
    $('a0').addEventListener('change', e => { S0.a0 = e.target.value; re(); });
    $('m-rest').querySelectorAll('input[name="clsmode"]').forEach(x => x.addEventListener('change', () => { S0.cls.mode = x.value; re(); }));
    $('m-rest').querySelectorAll('input[name="clsorder"]').forEach(x => x.addEventListener('change', () => { S0.cls.order = x.value; re(); }));
    for (const k of ['start', 'width', 'n', 'list']) $('cls-' + k) && $('cls-' + k).addEventListener('change', e => { S0.cls[k] = e.target.value; re(); });
    $('reset').addEventListener('click', async () => { const keep = S0.setId; S0 = { ...blank(), setId: keep }; R = null; status(''); save(); render(); });
    $('to2').addEventListener('click', () => go(2));
  }
}

/* ---------------- SI03: fitting to the user's own height–age series ---------------- */
let FR = null;                                                   // last fit (not stored; recomputed on demand)
const FGUESS = { series: ['agac', 'ağaç', 'tree', 'tree_id', 'seri', 'series', 'id'], plot: ['alan', 'plot', 'plot_id', 'ornek_alan'], A: ['yas', 'yaş', 'age', 'a'], H: ['boy', 'h', 'height', 'ust_boy', 'üst_boy', 'h0'] };
function fitSeries() { const F = S0.fit; return S.seriesFromTable(F.src, F.map, F.decimal, parseNumber, cellText); }
function renderFit() {
  const el = $('fitbody'); if (!el) return;
  const F = S0.fit, fm = S.FORMS[F.form];
  let h = `<p class="muted small">${T('fit.sub')}</p><div id="fitimp"></div>`;
  if (F.src) {
    const opts = sel => `<option value="">${T('none')}</option>` + F.src.headers.map((x, i) => `<option value="${i}"${sel === i ? ' selected' : ''}>${esc(x)}</option>`).join('');
    const dv = detectDecimal([F.map.A, F.map.H].filter(c => c != null).flatMap(c => F.src.rows.map(r => r[c]).filter(x => x && x.t === 's').map(x => x.v)));
    if (!F.decimalChosen) F.decimal = defaultDecimal(dv.verdict);
    h += `<div class="lims">${['series', 'plot', 'A', 'H'].map(k => `<label>${T('fit.col.' + k)} <select id="fm-${k}">${opts(F.map[k])}</select></label>`).join('')}</div>
      <div class="radios"><span class="small">${T('d.dec')}:</span> <label class="small"><input type="radio" name="fdec" value="."${F.decimal === '.' ? ' checked' : ''}> ${T('d.dec.dot')}</label><label class="small"><input type="radio" name="fdec" value=","${F.decimal === ',' ? ' checked' : ''}> ${T('d.dec.comma')}</label></div>
      <div class="lims"><label>${T('fit.form')} <select id="f-form">${S.FORM_IDS.map(id => `<option value="${id}"${F.form === id ? ' selected' : ''}>${esc(formName(id))}</option>`).join('')}</select></label></div>
      <div class="radios col"><span class="small"><b>${T('fit.pair')}</b></span>${S.PAIRINGS.map(m => `<label><input type="radio" name="fpair" value="${m}"${F.pairing === m ? ' checked' : ''}> ${T('fit.pair.' + m)}</label>`).join('')}</div>
      <div class="radios"><span class="small"><b>${T('fit.start')}</b></span> ${['grid', 'user'].map(m => `<label class="small"><input type="radio" name="fstart" value="${m}"${F.startMode === m ? ' checked' : ''}> ${T('fit.start.' + m)}</label>`).join(' ')}</div>
      ${F.startMode === 'user' ? `<div class="lims">${fm.params.map(k => `<label>${k} <input type="text" inputmode="decimal" size="8" id="fs-${k}" value="${esc(F.start[k] ?? '')}"></label>`).join('')}</div>` : ''}
      <div class="nav"><button type="button" class="btn" id="f-run"${F.map.series == null || F.map.A == null || F.map.H == null ? ' disabled' : ''}>${T('fit.run')}</button></div><div id="fitout"></div>`;
  }
  el.innerHTML = h;
  renderImport($('fitimp'), { imp: F.imp, src: F.src }, { base: BASE, title: T('fit.imp'), sub: T('fit.imp.sub'), onChange: st => {
    F.imp = st.imp; F.src = st.src; F.map = { series: null, plot: null, A: null, H: null }; F.decimalChosen = false; FR = null;
    if (F.src) { const H = F.src.headers.map(x => x.toLocaleLowerCase('tr').trim()); for (const [k, names] of Object.entries(FGUESS)) { const i = H.findIndex(x => names.includes(x)); if (i >= 0) F.map[k] = i; } }
    save(); renderFit(); }, onError: m => status(m, 'err') });
  if (!F.src) return;
  const re = () => { FR = null; save(); renderFit(); };
  for (const k of ['series', 'plot', 'A', 'H']) $('fm-' + k).addEventListener('change', e => { F.map[k] = e.target.value === '' ? null : +e.target.value; re(); });
  el.querySelectorAll('input[name="fdec"]').forEach(x => x.addEventListener('change', () => { F.decimal = x.value; F.decimalChosen = true; re(); }));
  $('f-form').addEventListener('change', e => { F.form = e.target.value; F.start = {}; re(); });
  el.querySelectorAll('input[name="fpair"]').forEach(x => x.addEventListener('change', () => { F.pairing = x.value; re(); }));
  el.querySelectorAll('input[name="fstart"]').forEach(x => x.addEventListener('change', () => { F.startMode = x.value; re(); }));
  for (const k of fm.params) $('fs-' + k) && $('fs-' + k).addEventListener('change', e => { F.start[k] = e.target.value; re(); });
  $('f-run').addEventListener('click', () => runFit());
  if (FR) drawFit();
}
function runFit() {
  const F = S0.fit, fm = S.FORMS[F.form], { series, problems } = fitSeries(), pairs = S.makePairs(series, F.pairing);
  let start = null;
  if (F.startMode === 'user') { start = fm.params.map(k => num(F.start[k])); if (start.some(v => !Number.isFinite(v))) { FR = { status: 'invalid', problems: [{ code: 'fit.startbad' }], readProblems: problems }; drawFit(); return; } }
  FR = { ...S.fitPairs(F.form, pairs, { start, nSeries: series.length }), readProblems: problems, series, pairing: F.pairing, created: new Date().toISOString() };
  drawFit();
}
function drawFit() {
  const out = $('fitout'); if (!out || !FR) return;
  const F = S0.fit, fm = S.FORMS[FR.form || F.form];
  let h = '';
  if (FR.readProblems && FR.readProblems.length) h += `<p class="note warn small" id="fitread">${esc(T('fit.read', { n: FR.readProblems.length, rows: FR.readProblems.slice(0, 12).map(p => p.row).join(', ') }))}</p>`;
  if (FR.status !== 'ok') { out.innerHTML = h + `<p class="note err" id="fitstate">${esc(T('fit.fail', { why: (FR.problems || []).map(p => T('c.' + p.code, p)).join('; ') || FR.status }))}</p>`; return; }
  h += `<p class="small" id="fitsum">${esc(T('fit.sum', { n: FR.n, s: FR.nSeries, pair: T('fit.pair.' + FR.pairing), it: FR.iter, start: FR.start.map(v => fmtNum(v, 6)).join(', '), from: T('fit.start.' + FR.startFrom) }))}</p>
    <div class="tscroll"><table class="grid" id="fittab"><thead><tr><th>${T('fit.par')}</th><th>${T('fit.est')}</th><th>${T('fit.se')}</th></tr></thead><tbody>
    ${fm.params.map(k => `<tr><th>${k}</th><td class="num">${fmtNum(FR.params[k], 8)}</td><td class="num">${f(FR.se && FR.se[k], 6)}</td></tr>`).join('')}</tbody></table></div>
    <p class="muted small">${T('fit.senote')}</p>
    <p class="small" id="fitgof">${esc(T('fit.gof', { rmse: fmtNum(FR.rmse, 4), bias: fmtNum(FR.bias, 4), sigma: fmtNum(FR.sigma, 4) }))}</p>`;
  const amax = Math.max(...FR.series.flatMap(s => s.points.map(p => p.A))) * 1.05, ages = Array.from({ length: 81 }, (_, i) => Math.max(0.5, amax * i / 80));
  const m = { form: FR.form, params: FR.params };
  const lines = FR.series.slice(0, 30).map((s, i) => { const o = [...s.points].sort((a, b) => b.A - a.A)[0]; return { name: i === 0 ? T('fit.ch.lines') : null, k: i % 6, pts: ages.map(a => [a, (S.project(m, a, o.A, o.H).value ?? null)]).filter(q => q[1] != null) }; });
  h += `<figure class="chartbox" id="ch-fit">${plotChart({ title: T('fit.ch.curves'), xmin: 0, xmax: amax, ymin: 0, lines, points: FR.series.flatMap(s => s.points.map(p => [p.A, p.H])), xLabel: T('fit.ch.age'), yLabel: T('fit.ch.h'), fmt: v => fmtNum(v, 1) })}
    <figcaption class="muted small">${T('fit.ch.note')}</figcaption></figure>
    <figure class="chartbox" id="ch-res">${scatterChart({ title: T('fit.ch.res'), points: FR.residuals.map(r => [r.A2, r.e]), xLabel: T('fit.ch.age2'), yLabel: T('fit.ch.e'), hline: 0, fmt: v => fmtNum(v, 1) })}</figure>`;
  h += `<h3>${T('fit.save.h')}</h3><p class="muted small">${T('fit.save.sub')}</p>
    <div class="lims"><label>${T('x.ageType')} <select id="fx-age"><option value="">${T('none')}</option>${S.AGE_TYPES.map(v => `<option value="${v}"${F.ageType === v ? ' selected' : ''}>${T('x.ageType.' + v)}</option>`).join('')}</select></label>
      <label>${T('x.topDef')} <select id="fx-top"><option value="">${T('none')}</option>${['h0dbh', 'h0height', 'other'].map(v => `<option value="${v}"${F.topDef === v ? ' selected' : ''}>${T('x.topDef.' + v)}</option>`).join('')}</select></label>
      <label>${T('x.topNote')} <input type="text" size="20" id="fx-note" value="${esc(F.topNote)}"></label></div>
    <label class="field"><span>${T('fit.cit')}</span><input type="text" id="fx-cit" value="${esc(F.cit)}" placeholder="${esc(T('fit.cit.ph'))}"></label>
    <div class="nav"><button type="button" class="btn" id="fx-save">${T('fit.save')}</button></div><div id="fx-msg"></div>`;
  out.innerHTML = h;
  for (const [id, k] of [['fx-age', 'ageType'], ['fx-top', 'topDef'], ['fx-note', 'topNote'], ['fx-cit', 'cit']]) $(id).addEventListener('change', e => { F[k] = e.target.value; save(); });
  $('fx-save').addEventListener('click', async () => {
    const miss = [!F.ageType && T('x.ageType'), !F.topDef && T('x.topDef'), !String(F.cit).trim() && T('fit.cit')].filter(Boolean);
    if (miss.length) { $('fx-msg').innerHTML = `<p class="note err small">${esc(T('fit.miss', { list: miss.join(', ') }))}</p>`; return; }
    const allA = FR.series.flatMap(s => s.points.map(p => p.A)), allH = FR.series.flatMap(s => s.points.map(p => p.H));
    const set = { ...blankSet('si.' + FR.form), params: { ...FR.params }, valid: { A: [Math.min(...allA), Math.max(...allA)], H: [Math.min(...allH), Math.max(...allH)] },
      meta: { ageType: F.ageType, topDef: F.topDef, ...(F.topNote.trim() ? { topNote: F.topNote.trim() } : {}) }, source: { citation: F.cit.trim() }, origin: 'fitted',
      fit: { data: F.imp ? F.imp.name : null, n: FR.n, nSeries: FR.nSeries, pairing: FR.pairing, method: 'Levenberg–Marquardt', start: FR.start, startFrom: FR.startFrom, iter: FR.iter, rmse: FR.rmse, bias: FR.bias, sigma: FR.sigma, se: FR.se, seNote: FR.seNote, created: FR.created } };
    const r = await saveCoef(set);
    if (!r.ok) { $('fx-msg').innerHTML = `<p class="note err small">${esc(r.problems.map(p => p.code).join(', '))}</p>`; return; }
    S0.setId = r.set.id; save(); $('fx-msg').innerHTML = `<p class="note ok small" id="fx-ok">${T('fit.saved')}</p>`; editor && editor.refresh();
  });
}

/* ---------------- data ---------------- */
const MAPGUESS = { plot: ['alan', 'plot', 'plot_id', 'ornek_alan', 'örnek_alan'], period: ['donem', 'dönem', 'period', 'yil', 'yıl', 'year'], A: ['yas', 'yaş', 'age', 'a', 'yas_yil'], H: ['ust_boy', 'üst_boy', 'h0', 'h', 'boy', 'top_height', 'hdom', 'height'] };
function setTable(state) {
  S0 = { ...S0, imp: state.imp, src: state.src, map: { plot: null, period: null, A: null, H: null }, decimalChosen: false };
  if (S0.src) { const H = S0.src.headers.map(h => h.toLocaleLowerCase('tr').trim()); for (const [k, names] of Object.entries(MAPGUESS)) { const i = H.findIndex(h => names.includes(h)); if (i >= 0) S0.map[k] = i; } }
  R = null; save(); renderStep2(); renderSteps();
}
function rowsFromInput() {
  const set = curSet();
  if (S0.mode === 'single') return { rows: [{ key: 'single', unit: T('u.single'), plot: null, period: null, A: num(S0.A), H: num(S0.H), Hsrc: 'given' }], problems: [] };
  if (S0.mode === 'table') {
    const rows = [], tbl = S0.src;
    tbl.rows.forEach((r, i) => {
      const rv = c => c == null ? { status: 'empty' } : c.t === 'n' ? parseNumber(c.v, S0.decimal) : parseNumber(cellText(c), S0.decimal);
      const A = rv(r[S0.map.A]), H = rv(r[S0.map.H]), row = tbl.rowNumbers[i];
      if (A.status === 'empty' && H.status === 'empty') return;
      const plot = S0.map.plot != null ? cellText(r[S0.map.plot]).trim() || null : null, period = S0.map.period != null ? cellText(r[S0.map.period]).trim() || null : null;
      const pr = [[A, 'a.bad', S0.map.A], [H, 'h.bad', S0.map.H]].filter(([x]) => x.status !== 'ok').map(([x, code, col]) => x.status === 'empty' ? { code } : { code: 'num.bad', text: cellText(r[col]) });
      rows.push({ key: 'r' + row, row, unit: [plot, period].filter(Boolean).join(' / ') || String(row), plot, period, A: A.status === 'ok' ? A.value : null, H: H.status === 'ok' ? H.value : null, Hsrc: 'given', pre: pr });
    });
    return { rows, problems: [] };
  }
  // approved data: one unit per plot × period; H0 by the Plot & Stand definition, age = mean recorded age
  const units = buildUnits(approved, { emptyCombos: 'unmeasured' }).units.filter(u => u.state === 'measured');
  return { rows: units.map(u => {
    const m = unitMetrics(u), dom = S0.rank === 'height' ? m.dom.h : m.dom.d, pre = [];
    if (!u.trees.length) pre.push({ code: 'unit.empty' });
    else { if (dom.H0 == null) pre.push({ code: 'h0.none' }); if (!(m.age.n > 0)) pre.push({ code: 'age.none' }); }
    return { key: u.plot_id + '|' + (u.period ?? ''), unit: [u.plot_id, u.period].filter(x => x != null).join(' / '), plot: u.plot_id, period: u.period, A: m.age.mean, H: dom.H0, Hsrc: S0.rank === 'height' ? 'h0height' : 'h0dbh', pre, nAge: m.age.n, k: m.dom.k };
  }), problems: [] };
}
function dataProblems() {
  const p = [], set = curSet();
  if (S0.mode === 'single' && !(num(S0.A) > 0 && num(S0.H) > 0)) p.push(T('d.single.bad'));
  if (S0.mode === 'table' && (!S0.src || S0.map.A == null || S0.map.H == null)) p.push(T('d.col.need'));
  if (S0.mode === 'ds' && !approved) p.push(T('d.nods'));
  if (!S0.dAge) p.push(T('d.agetype.need'));
  else if (set && set.meta && S0.dAge !== set.meta.ageType) p.push(T('d.agetype.diff', { d: T('x.ageType.' + S0.dAge), m: T('x.ageType.' + set.meta.ageType) }));
  return p;
}
function renderStep2() {
  const el = $('step2');
  let h = `<div class="card"><h2>${T('d.h')}</h2><p class="small"><b>${T('d.mode')}</b></p><div class="radios col">${['single', 'table', 'ds'].map(m => `<label><input type="radio" name="dmode" value="${m}"${S0.mode === m ? ' checked' : ''}${m === 'ds' && !approved ? ' disabled' : ''}> ${T('d.' + m)}${m === 'ds' && !approved ? ` <span class="muted small">(${T('d.nods')})</span>` : ''}</label>`).join('')}</div>
    <div class="lims"><label>${T('d.agetype')} <select id="dage"><option value="">${T('none')}</option>${S.AGE_TYPES.map(v => `<option value="${v}"${S0.dAge === v ? ' selected' : ''}>${T('x.ageType.' + v)}</option>`).join('')}</select></label></div></div>`;
  if (S0.mode === 'single') h += `<div class="card"><div class="lims"><label>${T('d.A')} <input type="text" inputmode="decimal" size="7" id="sA" value="${esc(S0.A)}"></label><label>${T('d.H')} <input type="text" inputmode="decimal" size="7" id="sH" value="${esc(S0.H)}"></label></div></div>`;
  if (S0.mode === 'table') {
    h += '<div id="impbox"></div>';
    if (S0.src) {
      const opts = sel => `<option value="">${T('none')}</option>` + S0.src.headers.map((x, i) => `<option value="${i}"${sel === i ? ' selected' : ''}>${esc(x)}</option>`).join('');
      const dv = detectDecimal([S0.map.A, S0.map.H].filter(c => c != null).flatMap(c => S0.src.rows.map(r => r[c]).filter(x => x && x.t === 's').map(x => x.v)));
      if (!S0.decimalChosen) S0.decimal = defaultDecimal(dv.verdict);
      h += `<div class="card"><div class="lims">${['plot', 'period', 'A', 'H'].map(k => `<label>${T('d.col.' + k)} <select id="map-${k}">${opts(S0.map[k])}</select></label>`).join('')}</div>
        <div class="radios"><span class="small">${T('d.dec')}:</span> <label class="small"><input type="radio" name="dec" value="."${S0.decimal === '.' ? ' checked' : ''}> ${T('d.dec.dot')}</label><label class="small"><input type="radio" name="dec" value=","${S0.decimal === ',' ? ' checked' : ''}> ${T('d.dec.comma')}</label></div></div>`;
    }
  }
  if (S0.mode === 'ds') h += `<div class="card"><div class="radios"><span class="small">${T('d.rank')}:</span> ${['dbh', 'height'].map(r => `<label class="small"><input type="radio" name="rank" value="${r}"${S0.rank === r ? ' checked' : ''}> ${T('d.rank.' + r)}</label>`).join(' ')}</div><p class="muted small">${T('d.ds.note')}</p></div>`;
  const pr = dataProblems();
  h += `<div class="nav"><button type="button" class="btn ghost" id="back1">${T('back')}</button><button type="button" class="btn" id="calc"${pr.length ? ' disabled' : ''}>${T('calc')}</button>${pr.length ? `<span class="muted small">${pr.map(esc).join(' ')}</span>` : ''}</div>`;
  el.innerHTML = h;
  if (S0.mode === 'table') renderImport($('impbox'), { imp: S0.imp, src: S0.src }, { base: BASE, title: T('d.imp'), sub: T('d.imp.sub'), onChange: setTable, onError: m => status(m, 'err') });
  const re = () => { R = null; save(); renderStep2(); renderSteps(); };
  el.querySelectorAll('input[name="dmode"]').forEach(x => x.addEventListener('change', () => { S0.mode = x.value; re(); }));
  $('dage').addEventListener('change', e => { S0.dAge = e.target.value || null; re(); });
  $('sA') && $('sA').addEventListener('change', e => { S0.A = e.target.value; re(); });
  $('sH') && $('sH').addEventListener('change', e => { S0.H = e.target.value; re(); });
  for (const k of ['plot', 'period', 'A', 'H']) $('map-' + k) && $('map-' + k).addEventListener('change', e => { S0.map[k] = e.target.value === '' ? null : +e.target.value; re(); });
  el.querySelectorAll('input[name="dec"]').forEach(x => x.addEventListener('change', () => { S0.decimal = x.value; S0.decimalChosen = true; re(); }));
  el.querySelectorAll('input[name="rank"]').forEach(x => x.addEventListener('change', () => { S0.rank = x.value; re(); }));
  $('back1').addEventListener('click', () => go(1));
  $('calc').addEventListener('click', () => { compute(); if (R) go(3); });
}

/* ---------------- computation and results ---------------- */
function compute() {
  const set = curSet(), m = S.modelFromSet(set, a0()), classes = S.classesOf(classDef()).classes, { rows } = rowsFromInput();
  const ev = S.evaluate(m, rows.map(r => ({ ...r, A: r.pre && r.pre.length ? null : r.A })), { valid: set.valid, classes })
    .map((r, i) => r.pre && r.pre.length ? { ...r, status: 'invalid', si: null, cls: null, problems: r.pre } : r);
  R = { set, m, classes, rows: ev, created: new Date().toISOString() };
  save();
}
const fname = (a, b) => `${lang === 'tr' ? a : b}-${new Date().toISOString().slice(0, 10)}`;
function resTable() {
  const head = [T('t.unit'), T('t.plot'), T('t.period'), T('t.A'), T('t.H'), T('t.Hsrc'), T('t.SI', { a0: fmtNum(R.m.baseAge, 2) }), ...(R.classes.length ? [T('t.cls')] : []), T('t.note'), T('t.state')];
  const rows = R.rows.map(r => ({ ok: r.status === 'ok', cells: [r.unit, r.plot, r.period, r.A, r.H, T('src.' + r.Hsrc), r.si, ...(R.classes.length ? [r.status === 'ok' ? r.cls ?? T('cls.out') : null] : []),
    [...r.problems, ...r.warnings].map(p => T('c.' + p.code, p)).join('; ') || '–', T('st.' + r.status)] }));
  return { head, rows };
}
function curves() {
  const ok = R.rows.filter(r => r.status === 'ok');
  const sis = R.classes.length ? [...new Set(R.classes.flatMap(c => [c.lo, c.hi]))] : (() => { const v = ok.map(r => r.si).sort((a, b) => a - b); return v.length ? [...new Set([v[0], v[Math.floor((v.length - 1) / 2)], v[v.length - 1]])] : []; })();
  const amax = Math.max(R.m.baseAge * 1.6, ...ok.map(r => r.A)) * 1.05, ages = Array.from({ length: 121 }, (_, i) => Math.max(0.5, amax * i / 120));
  return { sis, ages, lines: sis.map(si => ({ si, pts: S.curve(R.m, si, ages).filter(p => p[1] != null) })) };
}
function renderStep3() {
  if (!R) compute();
  const el = $('step3'), t = resTable(), set = R.set, ok = R.rows.filter(r => r.status === 'ok'), out = R.rows.filter(r => r.warnings.length).length, cv = curves();
  const ageTxt = T('x.ageType.' + R.m.ageType);
  let h = `<div class="card"><p class="small" id="rmodel">${esc(T('r.model', { form: formName(R.m.form), a0: fmtNum(R.m.baseAge, 2), age: ageTxt, top: topText(set) }))}</p>
    <p class="note small" id="rsrc">${esc(T('r.src', { src: set.source.citation }))}</p>
    <p class="small" id="rsum">${T('r.sum', { n: R.rows.length, ok: ok.length, bad: R.rows.length - ok.length, out })}</p>
    <div class="tscroll"><table class="grid" id="rtab"><thead><tr>${t.head.map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${t.rows.map(r => `<tr${r.ok ? '' : ' class="st-bad"'}>${r.cells.map(c => `<td class="${typeof c === 'number' ? 'num' : ''}">${typeof c === 'number' ? f(c, 3) : esc(c ?? '–')}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  if (cv.lines.length) h += `<figure class="chartbox card" id="ch-si">${plotChart({ title: T('ch.title', { a0: fmtNum(R.m.baseAge, 2) }), xmin: 0, xmax: cv.ages[cv.ages.length - 1], ymin: 0,
      lines: cv.lines.map((l, i) => ({ name: T('ch.curve', { si: fmtNum(l.si, 2) }), k: i % 6, pts: l.pts })), points: ok.map(r => [r.A, r.H]), xLabel: T('ch.x', { age: ageTxt }), yLabel: T('ch.y'), fmt: v => fmtNum(v, 1) })}
    <figcaption><span class="muted small">${R.classes.length ? T('ch.note.cls') : T('ch.note.q')}</span> <button type="button" class="btn ghost small" id="ch-svg">SVG</button></figcaption></figure>`;
  h += `<div class="exports"><button type="button" class="btn" id="x-xlsx">${T('ex.xlsx')}</button><button type="button" class="btn ghost" id="x-csv">${T('ex.csv')}</button><button type="button" class="btn ghost" id="x-json">${T('ex.json')}</button></div>
    <div class="nav"><button type="button" class="btn ghost" id="back2">${T('back')}</button></div>`;
  el.innerHTML = h;
  $('back2').addEventListener('click', () => go(2));
  $('ch-svg') && $('ch-svg').addEventListener('click', () => download(fname('bonitet-egrileri', 'site-index-curves') + '.svg', svgForDownload($('ch-si').querySelector('svg')), 'image/svg+xml'));
  $('x-csv').addEventListener('click', () => downloadCSV(fname('bonitet', 'site-index') + '.csv', [t.head, ...t.rows.map(r => r.cells)], lang));
  $('x-json').addEventListener('click', () => downloadJSON(fname('bonitet', 'site-index') + '.json', { tool: S.TOOL, created: R.created, model: R.m, set: R.set, classes: R.classes, input: S0.mode, results: R.rows }));
  $('x-xlsx').addEventListener('click', async () => {
    let XLSX; try { XLSX = await loadXLSX(BASE); } catch (e) { status('XLSX', 'err'); return; }
    const info = [[T('x.k'), T('x.v')], [T('x.tool'), `${S.TOOL.id} ${S.TOOL.version}`], [T('x.date'), R.created], [T('x.form'), formName(R.m.form)],
      [T('x.params'), Object.entries(R.m.params).map(([k, v]) => `${k} = ${v}`).join('; ')], [T('x.source'), [set.source.citation, set.source.doi, set.source.page, set.source.table].filter(Boolean).join('; ')],
      [T('x.a0'), R.m.baseAge], [T('x.age'), ageTxt], [T('x.top'), topText(set)], [T('x.valid'), set.valid ? JSON.stringify(set.valid) : '–'],
      [T('x.cls'), R.classes.length ? R.classes.map(c => `${c.name}: ${c.lo}–${c.hi}`).join('; ') : '–'], [T('x.input'), T('d.' + S0.mode)], ['', T('r.src', { src: set.source.citation })], ['', T('m.a0.note')], ['', T('cls.note')]];
    const cur = [[T('ch.x', { age: ageTxt }), ...cv.lines.map(l => T('ch.curve', { si: l.si }))], ...cv.ages.map((a, i) => [a, ...cv.lines.map(l => { const p = S.curve(R.m, l.si, [a])[0]; return p[1]; })])];
    download(fname('bonitet', 'site-index') + '.xlsx', xlsxBlob(XLSX, [{ name: T('sheet.info'), rows: info, widths: [24, 100] }, { name: T('sheet.res'), rows: [t.head, ...t.rows.map(r => r.cells)], textCols: [0, 1, 2] }, { name: T('sheet.curves'), rows: cur }]));
  });
}

/* ---------------- shell ---------------- */
function canGo(n) { if (n <= 1) return true; if (modelProblems().length) return false; if (n === 2) return true; return !dataProblems().length; }
function go(n) { if (!canGo(n)) return; S0.step = n; save(); render(); scrollTo({ top: $('steps').offsetTop - 8, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
function renderSteps() {
  $('steps').innerHTML = `<ol class="n3">${[1, 2, 3].map(n => `<li><button type="button" data-go="${n}"${S0.step === n ? ' aria-current="step"' : ''}${canGo(n) ? '' : ' disabled'}><b>${n}</b> ${T('step.' + n)}</button></li>`).join('')}</ol>`;
  $('steps').querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(+b.dataset.go)));
}
function render() {
  if (!canGo(S0.step)) S0.step = [3, 2, 1].find(canGo);
  renderSteps();
  for (const n of [1, 2, 3]) $('step' + n).hidden = S0.step !== n;
  ({ 1: renderStep1, 2: renderStep2, 3: renderStep3 })[S0.step]();
}
(async function init() {
  $('privacy').textContent = T('privacy');
  try {
    const a = await get('dataset:approved'); if (a && a.schema === 'forest-dataset/1' && Array.isArray(a.trees)) approved = a;
    const saved = await get(KEY);
    if (saved && saved.v === 1) { S0 = { ...blank(), ...saved, cls: { ...blank().cls, ...(saved.cls || {}) }, map: { ...blank().map, ...(saved.map || {}) } }; if (S0.mode === 'ds' && !approved) S0.mode = 'single'; status(T('restored', { when: new Date(saved.saved).toLocaleString(LOC) })); }
  } catch (e) { S0 = blank(); }
  const { listCoefs } = await import('../core/coef.js'); sets = await listCoefs('siteindex');
  render();
})();
