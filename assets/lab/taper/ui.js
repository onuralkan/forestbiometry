// Taper (stem profile): user interface. All arithmetic lives in calc.js and fit.js (and core/stems.js for the stem table).
import * as TP from './calc.js';
import * as FIT from './fit.js';
import * as BK from './bucking.js';
import { T } from './i18n.js';
import { lang, fmtNum, esc } from '../core/i18n.js';
import { put, get, del, autosave } from '../core/store.js';
import { cellText } from '../core/table.js';
import { parseNumber, detectDecimal, defaultDecimal } from '../core/num.js';
import { download, downloadCSV, xlsxBlob, loadXLSX } from '../core/export.js';
import { downloadRecord, recordOption } from '../core/record-ui.js';
import { plotChart, scatterChart, svgForDownload } from '../core/chart.js';
import { renderImport, readImport } from '../core/importer.js';
import { mountCoefEditor } from '../core/coef-ui.js';
import { saveCoef, listCoefs } from '../core/coef.js';
import { readStems } from '../core/stems.js';
import { EXTRA } from './coef-extra.js';

const BASE = './', KEY = 'session:' + TP.TOOL.id, LOC = 'en-GB';
const $ = id => document.getElementById(id);
const f = (x, d = 3) => x == null || !Number.isFinite(x) ? '–' : fmtNum(x, d);
const num = v => { const t = String(v ?? '').trim(); if (!t) return null; const x = Number(t.replace(',', '.')); return Number.isFinite(x) ? x : NaN; };
const FKEYS = ['tree', 'plot', 'period', 'h', 'd', 'bark_t', 'dbh', 'height', 'stump_h'];
const FGUESS = { tree: ['agac', 'ağaç', 'tree', 'tree_id'], plot: ['alan', 'plot', 'plot_id'], period: ['donem', 'dönem', 'period'], h: ['h', 'h_m', 'yukseklik', 'yükseklik'], d: ['d', 'cap', 'çap', 'cap_cm', 'çap_cm'],
  bark_t: ['kabuk', 'kabuk_mm', 'bark_mm'], dbh: ['dbh', 'd13', 'gogus_capi'], height: ['boy', 'boy_m', 'height'], stump_h: ['kesim', 'kesim_m', 'stump_h'] };
const TGUESS = { plot: ['alan', 'plot', 'plot_id'], tree: ['agac', 'ağaç', 'tree', 'tree_id'], D: ['dbh', 'd13', 'cap', 'çap', 'd'], H: ['boy', 'h', 'height', 'boy_m'] };

let S = blank(), sets = [], R = null, FR = null;
function blank() {
  return { v: 1, step: 1, tab: 'coef', setOb: null, setIb: null,
    fit: { imp: null, src: null, map: Object.fromEntries(FKEYS.map(k => [k, null])), decimal: null, decimalChosen: false, barkDef: 'ob', form: 'mb76', bark: 'ib', scale: 'd', cit: '' },
    trees: { mode: 'single', D: '', H: '', imp: null, src: null, map: { plot: null, tree: null, D: null, H: null }, decimal: null, decimalChosen: false },
    opt: { stump: '0.3', dTop: '', step: '1', logOn: false, L: '', trim: '', minLen: '', shortTop: 'drop' }, sel: 0,
    buck: { on: false, method: 'value', objective: 'value', step: '0.1', bark: 'ib', currency: '', rows: [] } };
}
const AS = autosave(KEY, () => ({ ...S, saved: new Date().toISOString() }));
function save() { AS.save(); }
function flush() { return AS.flush(); }
$('langlink') && $('langlink').addEventListener('click', async e => { e.preventDefault(); const h = e.currentTarget.href; await flush(); location.href = h; });
function status(m, k = '') { const s = $('status'); s.className = 'status ' + k; s.textContent = m || ''; }
const guess = (src, G) => { const H = src.headers.map(h => String(h).toLocaleLowerCase('tr').trim()), m = {}; for (const [k, names] of Object.entries(G)) { const i = H.findIndex(h => names.includes(h)); m[k] = i >= 0 ? i : null; } return m; };

/* ---------------- step 1: model (enter a set, or fit one) ---------------- */
const setById = id => sets.find(s => s.id === id) || null;
const chosenSets = () => [S.setOb, S.setIb].map(setById).filter(Boolean);
const formText = id => { const fm = TP.FORMS[String(id).replace('taper.', '')]; return fm ? `${fm.source}` : id; };
let editor = null;
function renderStep1() {
  const el = $('step1');
  if (!editor) {
    el.innerHTML = `<div class="tabs" role="tablist" aria-label="${esc(T('mt.label'))}">${['coef', 'fit'].map(t => `<button type="button" role="tab" id="mt-${t}" aria-controls="${t}box">${T('mt.' + t)}</button>`).join('')}</div>
      <div id="coefbox"></div><div class="card" id="fitbox"><h2>${T('fit.h')}</h2><div id="fitbody"></div></div><div id="m-rest"></div>`;
    const tab = t => { S.tab = t; save(); for (const k of ['coef', 'fit']) { $('mt-' + k).setAttribute('aria-selected', String(t === k)); $(k + 'box').hidden = t !== k; } if (t === 'fit') renderFit(); };
    $('mt-coef').addEventListener('click', () => tab('coef')); $('mt-fit').addEventListener('click', () => tab('fit'));
    editor = mountCoefEditor($('coefbox'), { tool: 'taper', extra: EXTRA, onChange: s => {
      sets = s; for (const k of ['setOb', 'setIb']) if (S[k] && !setById(S[k])) S[k] = null;
      const byBark = b => sets.filter(x => TP.barkOf(x) === b);
      if (!S.setOb && !S.setIb) { if (byBark('ob').length === 1) S.setOb = byBark('ob')[0].id; if (byBark('ib').length === 1) S.setIb = byBark('ib')[0].id; }
      R = null; renderRest(); renderSteps(); } });
    tab(S.tab);
  }
  renderRest();
}
function renderRest() {
  const box = $('m-rest'); if (!box) return;
  const opt = b => `<option value="">${T('none')}</option>` + sets.filter(s => TP.barkOf(s) === b).map(s => `<option value="${esc(s.id)}"${s.id === (b === 'ob' ? S.setOb : S.setIb) ? ' selected' : ''}>${esc([s.species, s.region, s.source && s.source.citation].filter(Boolean).join(' · ') || s.id)}</option>`).join('');
  const info = s => s ? `<p class="small">${esc(T('m.info', { form: formText(s.form), bark: T('bark.' + TP.barkOf(s)), src: s.source.citation }))}</p>` : '';
  const pr = chosenSets().length ? [] : [T('m.need')];
  box.innerHTML = `<div class="card"><h2>${T('m.h')}</h2><div class="lims"><label>${T('m.ob')} <select id="set-ob">${opt('ob')}</select></label><label>${T('m.ib')} <select id="set-ib">${opt('ib')}</select></label></div>
    ${info(setById(S.setOb))}${info(setById(S.setIb))}<p class="muted small">${T('m.note')}</p></div>
    <div class="nav"><button type="button" class="btn ghost" id="reset">${T('reset')}</button><button type="button" class="btn" id="to2"${pr.length ? ' disabled' : ''}>${T('next')}</button>${pr.length ? `<span class="muted small">${pr.map(esc).join(' ')}</span>` : ''}</div>`;
  $('set-ob').addEventListener('change', e => { S.setOb = e.target.value || null; R = null; save(); renderRest(); renderSteps(); });
  $('set-ib').addEventListener('change', e => { S.setIb = e.target.value || null; R = null; save(); renderRest(); renderSteps(); });
  $('reset').addEventListener('click', async () => { S = blank(); R = null; FR = null; status(''); await del(KEY); editor = null; render(); });
  $('to2').addEventListener('click', () => go(2));
}

/* fitting tab (SV-02/a3) */
function fitStems() {
  const F = S.fit, m = { ...F.map };
  return readStems(F.src, m, { decimal: F.decimal, bark: F.barkDef, units: { h: 'm', d: 'cm', bark_t: 'mm', dbh: 'cm', height: 'm' } });
}
function renderFit() {
  const el = $('fitbody'); if (!el) return;
  const F = S.fit;
  let h = `<p class="muted small">${T('fit.sub')}</p><div id="fitimp"></div>`;
  if (!F.src) h += `<div class="card sample"><button type="button" class="btn ghost" id="fsample">${T('fit.sample')}</button><span class="muted small">${T('fit.sample.note')}</span></div>`;
  else {
    const opts = sel => `<option value="">${T('none')}</option>` + F.src.headers.map((x, i) => `<option value="${i}"${sel === i ? ' selected' : ''}>${esc(x)}</option>`).join('');
    const textOf = c => c == null ? [] : F.src.rows.map(r => r[c]).filter(x => x && x.t === 's').map(x => x.v);
    if (!F.decimalChosen) F.decimal = defaultDecimal(detectDecimal(['h', 'd', 'bark_t', 'dbh', 'height', 'stump_h'].flatMap(k => textOf(F.map[k]))).verdict);
    const need = F.map.tree == null || F.map.h == null || F.map.d == null || F.map.dbh == null || F.map.height == null;
    h += `<div class="lims">${FKEYS.map(k => `<label>${T('fit.col.' + k)} <select id="fm-${k}">${opts(F.map[k])}</select></label>`).join('')}</div>
      <div class="lims"><label>${T('fit.barkdef')} <select id="f-barkdef">${['ob', 'ib'].map(v => `<option value="${v}"${F.barkDef === v ? ' selected' : ''}>${T('fit.barkdef.' + v)}</option>`).join('')}</select></label>
        <span class="radios"><span class="small">${T('fit.dec')}:</span> ${['.', ','].map(v => `<label class="small"><input type="radio" name="fdec" value="${v}"${F.decimal === v ? ' checked' : ''}> ${T(v === '.' ? 'fit.dec.dot' : 'fit.dec.comma')}</label>`).join('')}</span></div>
      <div class="lims"><label>${T('fit.form')} <select id="f-form">${Object.keys(TP.FORMS).map(k => `<option value="${k}"${F.form === k ? ' selected' : ''}>${esc(TP.FORMS[k].source)}</option>`).join('')}</select></label>
        <label>${T('fit.bark')} <select id="f-bark">${['ob', 'ib'].map(v => `<option value="${v}"${F.bark === v ? ' selected' : ''}>${T('fit.bark.' + v)}</option>`).join('')}</select></label></div>
      <p class="small">${esc(TP.FORMS[F.form].formula[lang])}</p>
      <div class="radios col"><span class="small"><b>${T('fit.scale')}</b></span>${['d', 'source'].map(v => `<label><input type="radio" name="fscale" value="${v}"${F.scale === v ? ' checked' : ''}> ${T('fit.scale.' + v)}</label>`).join('')}</div>
      <div class="nav"><button type="button" class="btn" id="f-run"${need ? ' disabled' : ''}>${T('fit.run')}</button>${need ? `<span class="muted small">${T('fit.need')}</span>` : ''}</div><div id="fitout"></div>`;
  }
  el.innerHTML = h;
  renderImport($('fitimp'), { imp: F.imp, src: F.src }, { base: BASE, title: T('fit.imp'), onChange: st => { F.imp = st.imp; F.src = st.src; F.map = st.src ? { ...F.map, ...guess(st.src, FGUESS) } : Object.fromEntries(FKEYS.map(k => [k, null])); F.decimalChosen = false; FR = null; save(); renderFit(); }, onError: m => status(m, 'err') });
  $('fsample') && $('fsample').addEventListener('click', async () => {
    const buf = await (await fetch(BASE + 'assets/lab/secvol/ornek/ornek-seksiyon.csv')).arrayBuffer();
    const imp = { kind: 'csv', name: 'ornek-seksiyon.csv (simulated)', buf, encoding: 'utf-8', delim: null, header: true, sheet: null };
    F.imp = imp; F.src = await readImport(imp, BASE); F.map = { ...Object.fromEntries(FKEYS.map(k => [k, null])), ...guess(F.src, FGUESS) }; F.decimalChosen = false; FR = null; save(); renderFit();
  });
  if (!F.src) return;
  for (const k of FKEYS) $('fm-' + k).addEventListener('change', e => { F.map[k] = e.target.value === '' ? null : +e.target.value; FR = null; save(); renderFit(); });
  el.querySelectorAll('input[name="fdec"]').forEach(x => x.addEventListener('change', () => { F.decimal = x.value; F.decimalChosen = true; FR = null; save(); renderFit(); }));
  el.querySelectorAll('input[name="fscale"]').forEach(x => x.addEventListener('change', () => { F.scale = x.value; FR = null; save(); renderFit(); }));
  $('f-barkdef').addEventListener('change', e => { F.barkDef = e.target.value; FR = null; save(); renderFit(); });
  $('f-form').addEventListener('change', e => { F.form = e.target.value; FR = null; save(); renderFit(); });
  $('f-bark').addEventListener('change', e => { F.bark = e.target.value; FR = null; save(); renderFit(); });
  $('f-run').addEventListener('click', () => { FR = FIT.fitTaper(fitStems(), { form: F.form, bark: F.bark, scale: F.scale }); renderFitOut(); });
  if (FR) renderFitOut();
}
function renderFitOut() {
  const el = $('fitout'), F = S.fit, r = FR; if (!el || !r) return;
  let h = `<h3>${T('fit.res')}: ${T('fit.status.' + r.status)}</h3>`;
  if (r.left) h += `<p class="small" id="fitleft">${esc(T('fit.left', { err: r.left.errorTrees, tree: r.left.noTree, d: r.left.noDiameter, tip: r.left.tip }))}</p>`;
  if (r.status !== 'ok') { el.innerHTML = h + `<p class="note err">${esc((r.problems || []).map(q => q.code).join(', ') || T('fit.status.' + r.status))}</p>`; return; }
  h += `<p class="small" id="fitsum">${esc(T('fit.sum', { n: r.n, trees: r.nTrees, rmse: f(r.rmse, 3), bias: f(r.bias, 3), method: T('fit.method.' + r.method) }))}</p>
    <table class="grid" id="fittab"><thead><tr><th>${T('fit.param')}</th><th>${T('fit.est')}</th><th>${T('fit.sec')}</th></tr></thead><tbody>${Object.entries(r.params).map(([k, v]) => `<tr><td>${k}</td><td class="num">${f(v, 6)}</td><td class="num">${r.se ? f(r.se[k], 6) : '–'}</td></tr>`).join('')}</tbody></table>
    <p class="note small">${T('fit.se')}</p>${r.se && Object.entries(r.se).some(([k, v]) => v > Math.abs(r.params[k])) ? `<p class="note warn small" id="fitweak">${esc(T('fit.weak', { list: Object.entries(r.se).filter(([k, v]) => v > Math.abs(r.params[k])).map(([k]) => k).join(', ') }))}</p>` : ''}${r.note === 'no-backtransform-correction' ? `<p class="note warn small">${T('fit.nobt')}</p>` : ''}
    <h3>${T('fit.cls')}</h3><table class="grid" id="clstab"><thead><tr><th>${T('fit.cls.c')}</th><th>${T('fit.cls.n')}</th><th>${T('fit.cls.bias')}</th><th>${T('fit.cls.rmse')}</th></tr></thead><tbody>${r.byClass.map(c => `<tr><td>${fmtNum(c.lo, 1)}–${fmtNum(c.hi, 1)}</td><td class="num">${c.n}</td><td class="num">${f(c.bias, 3)}</td><td class="num">${f(c.rmse, 3)}</td></tr>`).join('')}</tbody></table>
    <figure class="chartbox" id="ch-resid">${scatterChart({ title: T('fit.resid'), points: r.residuals.filter(q => q.res != null).map(q => [q.rel, q.res]), xLabel: 'h/H', yLabel: T('fit.cls.bias'), hline: 0, fmt: v => fmtNum(v, 2), height: 320 })}<figcaption class="small">${T('fit.resid')}</figcaption></figure>
    <h3>${T('fit.vol')}</h3><p class="muted small">${T('fit.vol.note')}</p><div class="tscroll"><table class="grid" id="voltab"><thead><tr><th>${T('fit.vol.tree')}</th><th>${T('fit.vol.sec')}</th><th>${T('fit.vol.prof')}</th><th>${T('fit.vol.rel')}</th></tr></thead><tbody>${r.volumes.map(v => `<tr><td>${esc([v.plot_id, v.tree_id].filter(Boolean).join(' / '))}</td><td class="num">${f(v.sectionV, 4)}</td><td class="num">${f(v.profileV, 4)}</td><td class="num">${v.rel == null ? '–' : f(100 * v.rel, 2)}</td></tr>`).join('')}</tbody></table></div>
    <div class="lims"><label class="field"><span>${T('fit.cit')}</span><input type="text" id="f-cit" value="${esc(F.cit)}"></label></div>
    <div class="nav"><button type="button" class="btn" id="f-save">${T('fit.save')}</button></div>`;
  el.innerHTML = h;
  $('f-cit').addEventListener('input', e => { F.cit = e.target.value; save(); });
  $('f-save').addEventListener('click', async () => {
    if (!F.cit.trim()) { status(T('fit.cit.need'), 'err'); return; }
    const set = FIT.fitToSet(r, { citation: F.cit.trim(), dataNote: F.imp ? F.imp.name : '' }); set.meta = { bark: r.bark };
    await saveCoef(set); if (r.bark === 'ob') S.setOb = set.id; else S.setIb = set.id; save(); status(T('fit.saved'), 'ok'); await editor.refresh();
  });
}

/* ---------------- step 2: trees and settings ---------------- */
const opts = () => ({ stump: num(S.opt.stump), dTop: num(S.opt.dTop), step: num(S.opt.step) });
/** SV-03 log-length limit settings (lengths in m, trim in cm), or null when off. */
const logOpts = () => S.opt.logOn ? { L: num(S.opt.L), trim: num(S.opt.trim) ?? 0, minLen: num(S.opt.minLen), shortTop: S.opt.shortTop } : null;
function treeRows() {
  const t = S.trees;
  if (t.mode === 'single') return [{ row: null, plot_id: null, tree_id: '1', D: num(t.D), H: num(t.H) }];
  if (!t.src || t.map.D == null || t.map.H == null) return [];
  const val = (r, c) => { const x = r[c]; if (x == null) return null; if (x.t === 'n') return x.v; const p = parseNumber(cellText(x), t.decimal); return p.status === 'ok' ? p.value : null; };
  return t.src.rows.map((r, i) => ({ row: t.src.rowNumbers[i], plot_id: t.map.plot != null ? cellText(r[t.map.plot]) || null : null, tree_id: t.map.tree != null ? cellText(r[t.map.tree]) || String(t.src.rowNumbers[i]) : String(t.src.rowNumbers[i]), D: val(r, t.map.D), H: val(r, t.map.H) }))
    .filter(q => q.D != null || q.H != null);
}
function step2Problems() {
  const p = [], o = opts(), t = S.trees;
  if (t.mode === 'single' && TP.checkTree(num(t.D), num(t.H)).length) p.push(T('tr.bad'));
  if (t.mode === 'table' && (!t.src || t.map.D == null || t.map.H == null)) p.push(T('tr.need'));
  if (!(o.stump != null && o.stump >= 0) || Number.isNaN(o.dTop) || (o.dTop != null && !(o.dTop > 0)) || !(o.step > 0)) p.push(T('tr.opts.bad'));
  const lo = logOpts();
  if (lo && (!(lo.L > 0) || !(lo.trim >= 0) || Number.isNaN(lo.minLen) || (lo.minLen != null && !(lo.minLen > 0)))) p.push(T('lg.bad'));
  return [...p, ...buckProblems()];
}

/* bucking (SV-06): product list from the editable rows; all checks in bucking.js */
const BCOLS = ['name', 'dMin', 'L', 'Lmax', 'Lstep', 'trim', 'priority', 'value'];
const blankRow = n => ({ name: '', dMin: '', L: '', Lmax: '', Lstep: '', trim: '0', priority: String(n), value: '' });
function buckList() {
  const b = S.buck, n = v => { const x = num(v); return x == null ? null : x; };
  return { bark: b.bark, currency: b.currency.trim() || null, products: b.rows.map((r, i) => {
    const pr = num(r.priority);
    return { id: String(i + 1), name: r.name.trim(), dMin: n(r.dMin), L: n(r.L), Lmax: n(r.Lmax), Lstep: n(r.Lmax) == null ? null : n(r.Lstep), trim: n(r.trim) ?? 0, priority: pr, value: n(r.value) };
  }) };
}
const buckOpts = () => ({ method: S.buck.method, objective: S.buck.objective, step: num(S.buck.step), stump: num(S.opt.stump), dTop: num(S.opt.dTop) });
const buckSet = () => setById(S.buck.bark === 'ob' ? S.setOb : S.setIb);
const bpText = q => q.product != null ? T('b.p', { n: q.product + 1, msg: T('bp.' + q.code, q) }) : T('bp.' + q.code, q);
function buckProblems() {
  const b = S.buck; if (!b.on) return [];
  if (!b.rows.length) return [T('b.need')];
  const list = buckList(), o = buckOpts(), p = BK.checkProducts(list).map(bpText);
  if (!(o.step > 0)) p.push(T('bp.step.bad'));
  if (!buckSet()) p.push(T('b.noset', { bark: T('bark.' + b.bark) }));
  if (!p.length) {
    if (o.method === 'value' && o.objective === 'value') list.products.forEach((q, i) => { if (q.value == null) p.push(bpText({ code: 'product.value.missing', product: i })); });
    p.push(...BK.options(list, o.step).problems.map(bpText));
  }
  return p;
}
function buckCard() {
  const b = S.buck;
  let h = `<div class="card" id="buckcard"><h2>${T('b.h')}</h2><label><input type="checkbox" id="b-on"${b.on ? ' checked' : ''}> ${T('b.on')}</label>`;
  if (!b.on) return h + '</div>';
  h += `<p class="muted small">${T('b.sub')}</p>
    <div class="lims"><label>${T('b.bark')} <select id="b-bark">${['ob', 'ib'].map(v => `<option value="${v}"${b.bark === v ? ' selected' : ''}>${T('bark.' + v)}</option>`).join('')}</select></label>
      <label>${T('b.step')} <input type="text" inputmode="decimal" size="5" id="b-step" value="${esc(b.step)}"></label><label>${T('b.cur')} <input type="text" size="6" id="b-cur" value="${esc(b.currency)}"></label></div>
    <div class="radios col"><span class="small"><b>${T('b.method')}</b></span>${['value', 'priority'].map(v => `<label><input type="radio" name="bmethod" value="${v}"${b.method === v ? ' checked' : ''}> ${T('b.method.' + v)}</label>`).join('')}</div>
    ${b.method === 'value' ? `<div class="radios"><span class="small">${T('b.obj')}:</span> ${['value', 'volume'].map(v => `<label><input type="radio" name="bobj" value="${v}"${b.objective === v ? ' checked' : ''}> ${T('b.obj.' + v)}</label>`).join(' ')}</div>` : ''}
    <div class="tscroll"><table class="grid" id="bprod"><thead><tr><th>#</th>${BCOLS.map(k => `<th>${T('b.col.' + k)}</th>`).join('')}<th></th></tr></thead><tbody>
    ${b.rows.map((r, i) => `<tr><td>${i + 1}</td>${BCOLS.map(k => `<td><input type="text"${k === 'name' ? ' size="12"' : ' inputmode="decimal" size="5"'} data-row="${i}" data-k="${k}" value="${esc(r[k])}" aria-label="${esc(T('b.col.' + k))} ${i + 1}"></td>`).join('')}<td><button type="button" class="btn ghost small" data-bdel="${i}">${T('b.del')}</button></td></tr>`).join('')}
    </tbody></table></div>
    <div class="exports"><button type="button" class="btn ghost" id="b-add">${T('b.add')}</button><button type="button" class="btn ghost" id="b-save"${b.rows.length ? '' : ' disabled'}>${T('b.save')}</button>
      <label class="btn ghost">${T('b.load')}<input type="file" id="b-load" accept=".json,application/json" hidden></label></div>
    <p class="muted small">${T('b.rules')}</p></div>`;
  return h;
}
function bindBuck(re) {
  const b = S.buck;
  $('b-on').addEventListener('change', e => { b.on = e.target.checked; re(); });
  if (!b.on) return;
  $('b-bark').addEventListener('change', e => { b.bark = e.target.value; re(); });
  $('b-step').addEventListener('change', e => { b.step = e.target.value; re(); });
  $('b-cur').addEventListener('change', e => { b.currency = e.target.value; re(); });
  document.querySelectorAll('input[name="bmethod"]').forEach(x => x.addEventListener('change', () => { b.method = x.value; re(); }));
  document.querySelectorAll('input[name="bobj"]').forEach(x => x.addEventListener('change', () => { b.objective = x.value; re(); }));
  document.querySelectorAll('#bprod input[data-k]').forEach(x => x.addEventListener('change', () => { b.rows[+x.dataset.row][x.dataset.k] = x.value; re(); }));
  document.querySelectorAll('[data-bdel]').forEach(x => x.addEventListener('click', () => { b.rows.splice(+x.dataset.bdel, 1); re(); }));
  $('b-add').addEventListener('click', () => { b.rows.push(blankRow(b.rows.length + 1)); re(); });
  $('b-save').addEventListener('click', () => download(`products.json`, BK.productsToJSON(buckList()), 'application/json'));
  $('b-load').addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    const r = BK.parseProducts(await file.text());
    if (!r.list) { status(r.problems.map(bpText).join('; '), 'err'); return; }
    const t = v => v == null ? '' : String(v);
    b.bark = r.list.bark; b.currency = r.list.currency || ''; b.rows = r.list.products.map(q => ({ name: q.name, dMin: t(q.dMin), L: t(q.L), Lmax: t(q.Lmax), Lstep: t(q.Lstep), trim: t(q.trim), priority: t(q.priority), value: t(q.value) }));
    status(T('b.loaded'), 'ok'); re();
  });
}
function renderStep2() {
  const el = $('step2'), t = S.trees, o = S.opt;
  let h = `<div class="card"><h2>${T('tr.h')}</h2><div class="radios"><span class="small">${T('tr.mode')}:</span> ${['single', 'table'].map(m => `<label><input type="radio" name="tmode" value="${m}"${t.mode === m ? ' checked' : ''}> ${T('tr.' + m)}</label>`).join(' ')}</div>`;
  if (t.mode === 'single') h += `<div class="lims"><label>${T('tr.D')} <input type="text" inputmode="decimal" size="7" id="t-D" value="${esc(t.D)}"></label><label>${T('tr.H')} <input type="text" inputmode="decimal" size="7" id="t-H" value="${esc(t.H)}"></label></div>`;
  else {
    h += `<div id="timp"></div>`;
    if (t.src) {
      if (!t.decimalChosen) t.decimal = defaultDecimal(detectDecimal([t.map.D, t.map.H].filter(c => c != null).flatMap(c => t.src.rows.map(r => r[c]).filter(x => x && x.t === 's').map(x => x.v))).verdict);
      const op = sel => `<option value="">${T('none')}</option>` + t.src.headers.map((x, i) => `<option value="${i}"${sel === i ? ' selected' : ''}>${esc(x)}</option>`).join('');
      h += `<div class="lims">${['plot', 'tree', 'D', 'H'].map(k => `<label>${T('tr.col.' + k)} <select id="tm-${k}">${op(t.map[k])}</select></label>`).join('')}
        <span class="radios"><span class="small">${T('fit.dec')}:</span> ${['.', ','].map(v => `<label class="small"><input type="radio" name="tdec" value="${v}"${t.decimal === v ? ' checked' : ''}> ${T(v === '.' ? 'fit.dec.dot' : 'fit.dec.comma')}</label>`).join('')}</span></div>`;
    }
  }
  h += `</div><div class="card"><h2>${T('tr.opts')}</h2><div class="lims"><label>${T('tr.stump')} <input type="text" inputmode="decimal" size="6" id="o-stump" value="${esc(o.stump)}"></label>
    <label>${T('tr.dtop')} <input type="text" inputmode="decimal" size="6" id="o-dTop" value="${esc(o.dTop)}"></label><label>${T('tr.step')} <input type="text" inputmode="decimal" size="5" id="o-step" value="${esc(o.step)}"></label></div>
    <p class="muted small">${T('tr.opts.note')}</p>
    <label class="chk"><input type="checkbox" id="o-logOn"${o.logOn ? ' checked' : ''}> <b>${T('lg.on')}</b></label>
    ${o.logOn ? `<div class="lims" id="lgbox"><label>${T('lg.L')} <input type="text" inputmode="decimal" size="6" id="o-L" value="${esc(o.L)}"></label><label>${T('lg.trim')} <input type="text" inputmode="decimal" size="6" id="o-trim" value="${esc(o.trim)}"></label>
      <label>${T('lg.min')} <input type="text" inputmode="decimal" size="6" id="o-minLen" value="${esc(o.minLen)}"></label>
      <label>${T('lg.short')} <select id="o-shortTop">${['drop', 'keep'].map(v => `<option value="${v}"${o.shortTop === v ? ' selected' : ''}>${T('lg.short.' + v)}</option>`).join('')}</select></label></div>
      <p class="muted small" id="lgnote">${T('lg.note')}</p>` : ''}</div>` + buckCard();
  const pr = step2Problems();
  h += `<div class="nav"><button type="button" class="btn ghost" id="back1">${T('back')}</button><button type="button" class="btn" id="calc"${pr.length ? ' disabled' : ''}>${T('calc')}</button>${pr.length ? `<span class="muted small">${pr.map(esc).join(' ')}</span>` : ''}</div>`;
  el.innerHTML = h;
  const re = () => { R = null; save(); renderStep2(); renderSteps(); };
  el.querySelectorAll('input[name="tmode"]').forEach(x => x.addEventListener('change', () => { t.mode = x.value; re(); }));
  for (const k of ['D', 'H']) $('t-' + k) && $('t-' + k).addEventListener('change', e => { t[k] = e.target.value; re(); });
  for (const k of ['stump', 'dTop', 'step']) $('o-' + k).addEventListener('change', e => { o[k] = e.target.value; re(); });
  $('o-logOn').addEventListener('change', e => { o.logOn = e.target.checked; re(); });
  for (const k of ['L', 'trim', 'minLen']) $('o-' + k) && $('o-' + k).addEventListener('change', e => { o[k] = e.target.value.trim(); re(); });
  $('o-shortTop') && $('o-shortTop').addEventListener('change', e => { o.shortTop = e.target.value; re(); });
  bindBuck(re);
  if (t.mode === 'table') {
    renderImport($('timp'), { imp: t.imp, src: t.src }, { base: BASE, title: T('tr.table'), onChange: st => { t.imp = st.imp; t.src = st.src; t.map = st.src ? guess(st.src, TGUESS) : { plot: null, tree: null, D: null, H: null }; t.decimalChosen = false; re(); }, onError: m => status(m, 'err') });
    if (t.src) {
      for (const k of ['plot', 'tree', 'D', 'H']) $('tm-' + k).addEventListener('change', e => { t.map[k] = e.target.value === '' ? null : +e.target.value; re(); });
      el.querySelectorAll('input[name="tdec"]').forEach(x => x.addEventListener('change', () => { t.decimal = x.value; t.decimalChosen = true; re(); }));
    }
  }
  $('back1').addEventListener('click', () => go(1));
  $('calc').addEventListener('click', () => { compute(); S.sel = 0; go(3); });
}

/* ---------------- step 3: results ---------------- */
function compute() {
  const o = opts(), list = chosenSets(), lo = logOpts();
  R = { created: new Date().toISOString(), settings: { stump: o.stump, dTop: o.dTop, step: o.step, logs: lo ? { L: lo.L, trim_cm: lo.trim, minLen: lo.minLen, shortTop: lo.shortTop } : null }, sets: list.map(s => ({ id: s.id, form: s.form, bark: TP.barkOf(s), params: s.params, source: s.source.citation, origin: s.origin })),
    trees: treeRows().map(t => ({ ...t, by: list.map(s => {
      const ev = TP.evaluateTree(s, t.D, t.H);
      if (ev.status !== 'ok') return { bark: TP.barkOf(s), status: 'invalid', problems: ev.problems, warnings: [] };
      const m = TP.merchantable(s, t.D, t.H, { stump: o.stump, dTop: o.dTop });
      // SV-03: logs from the cut height to the top limit (the top-diameter height, or the tip without a top diameter)
      let logs = null;
      if (lo && m.status === 'ok') {
        const top = o.dTop == null ? t.H : m.hTop;
        logs = top == null ? { status: 'ok', n: 0, logs: [], short: null, V: { logs: 0, short: 0, trims: 0, rest: 0, merch: 0 } }
          : TP.logLimit(s, t.D, t.H, { stump: o.stump, hTop: top, L: lo.L, trim: lo.trim / 100, minLen: lo.minLen, shortTop: lo.shortTop });
      }
      return { bark: TP.barkOf(s), status: m.status, total: m.total, hTop: m.hTop, merch: m.merch, note: m.note, d13: ev.consistency.d13, logs, warnings: ev.warnings, problems: [] };
    }) })) };
  R.buck = null;
  if (S.buck.on && !buckProblems().length) {
    const set = buckSet(), list = buckList(), o = buckOpts(), all = BK.buckTrees(set, R.trees.map(t => ({ D: t.D, H: t.H })), list, o);
    R.buck = { settings: { ...o, objective: o.method === 'value' ? o.objective : null, bark: list.bark, currency: list.currency }, list, set: { id: set.id, form: set.form, source: set.source.citation },
      trees: all.results.map(x => x.r), byProduct: all.byProduct, volumes: all.volumes, valueTotal: all.valueTotal };
  }
  save();
}

/* bucking results: summary, per tree, drawing of the selected tree */
const PAT = ['', '<path d="M0 8 L8 0"/>', '<path d="M0 0 L8 8 M0 8 L8 0"/>', '<circle cx="4" cy="4" r="1.4"/>', '<path d="M0 4 L8 4"/>', '<path d="M4 0 L4 8"/>'];
// product k: colour k mod 6 and a pattern that changes every six products, so no two of the first 36 look alike and none depends on colour alone
const patDefs = (n, pre) => Array.from({ length: n }, (_, k) => `<pattern id="${pre}${k}" width="8" height="8" patternUnits="userSpaceOnUse"><g stroke="rgba(0,0,0,.55)" fill="rgba(0,0,0,.55)" stroke-width="1.3">${PAT[(k % 6 + Math.floor(k / 6)) % PAT.length]}</g></pattern>`).join('');
const swatch = k => `<svg width="22" height="14" aria-hidden="true" class="bsw"><rect class="ch-s${k % 6}" width="22" height="14"/><rect width="22" height="14" fill="url(#bsw${k})"/></svg>`;
function buckDrawing(t, r) {
  const set = buckSet(); if (!set) return '';
  const W = 760, Hh = 170, L = 50, Rr = 14, top = 14, mid = 78, n = R.buck.list.products.length;
  const x = h => L + (W - L - Rr) * h / t.H, dmax = Math.max(...Array.from({ length: 101 }, (_, i) => TP.diameterAt(set, t.D, t.H, t.H * i / 100).d || 0), 1), yk = 60 / dmax;
  const shape = (h1, h2) => { const hs = Array.from({ length: 41 }, (_, i) => h1 + (h2 - h1) * i / 40), d = hs.map(h => TP.diameterAt(set, t.D, t.H, h).d || 0);
    return hs.map((h, i) => `${x(h).toFixed(2)},${(mid - d[i] * yk).toFixed(2)}`).concat(hs.slice().reverse().map((h, i) => `${x(h).toFixed(2)},${(mid + d[d.length - 1 - i] * yk).toFixed(2)}`)).join(' '); };
  let g = `<polygon points="${shape(0, t.H)}" class="bres"/>`;
  g += `<polygon points="${shape(0, R.buck.settings.stump)}" class="bstump"/>`;
  r.pieces.forEach((q, i) => { const pts = shape(q.h1, q.h2); g += `<g class="bpiece" data-product="${q.product}"><polygon points="${pts}" class="ch-s${q.product % 6}"/><polygon points="${pts}" fill="url(#bdp${q.product})" class="bpat"/><line x1="${x(q.h2).toFixed(2)}" x2="${x(q.h2).toFixed(2)}" y1="${top}" y2="${mid + 64}" class="bcut"/>${x(q.h2) - x(q.h1) > 18 ? `<text x="${((x(q.h1) + x(q.h2)) / 2).toFixed(2)}" y="${mid + 4}" class="blab">${q.product + 1}</text>` : ''}<title>${esc(`${q.name}: ${fmtNum(q.h1, 2)}–${fmtNum(q.h2, 2)} m, ${fmtNum(q.V, 4)} m³`)}</title></g>`; });
  for (let h = 0; h <= t.H + 1e-9; h += t.H > 20 ? 5 : 2) g += `<line x1="${x(h)}" x2="${x(h)}" y1="${mid + 66}" y2="${mid + 70}" class="ch-axis"/><text x="${x(h)}" y="${mid + 84}" class="ch-tick" text-anchor="middle">${fmtNum(h, 0)}</text>`;
  return `<svg viewBox="0 0 ${W} ${Hh}" class="chart" role="img" aria-label="${esc(T('br.draw'))}"><defs>${patDefs(n, 'bdp')}</defs>${g}<text x="${W - Rr}" y="${Hh - 2}" class="ch-tick" text-anchor="end">${esc(T('res.h'))}</text></svg>`;
}
function buckSection() {
  const B = R.buck; if (!B) return '';
  const st = B.settings, cur = st.currency, hasVal = B.valueTotal != null;
  const method = st.method === 'value' ? `${T('b.method.value')}, ${T('b.obj.' + st.objective)}` : T('b.method.priority');
  let h = `<div class="card" id="buckres"><svg width="0" height="0" aria-hidden="true" style="position:absolute"><defs>${patDefs(B.list.products.length, 'bsw')}</defs></svg><h2>${T('br.h')}</h2><p class="note small" id="bused">${esc(T('br.used', { method, step: fmtNum(st.step, 2), stump: fmtNum(st.stump, 2), dTop: st.dTop == null ? T('br.nodtop') : fmtNum(st.dTop, 1) + ' cm', bark: T('bark.' + st.bark) }))} ${esc(T('res.used', { list: `${formText(B.set.form)} (${B.set.source})` }))}</p>
    <h3>${T('br.sum')}</h3><div class="tscroll"><table class="grid" id="bsum"><thead><tr><th>${T('br.prod')}</th><th>${T('br.n')}</th><th>${T('br.V')}</th>${hasVal ? `<th>${esc(T('br.val', { cur }))}</th>` : ''}</tr></thead><tbody>
    ${B.byProduct.map((p, k) => `<tr data-product="${k}"><td>${swatch(k)} ${k + 1}. ${esc(p.name)}</td><td class="num">${p.n}</td><td class="num">${f(p.V, 4)}</td>${hasVal ? `<td class="num">${f(p.value, 2)}</td>` : ''}</tr>`).join('')}
    <tr class="tot"><td>${T('br.total')}</td><td class="num">${B.byProduct.reduce((s, p) => s + p.n, 0)}</td><td class="num">${f(B.volumes.pieces, 4)}</td>${hasVal ? `<td class="num">${f(B.valueTotal, 2)}</td>` : ''}</tr></tbody></table></div>
    <p class="small" id="bbal">${esc(T('br.bal', { pieces: f(B.volumes.pieces, 4), residual: f(B.volumes.residual, 4), stump: f(B.volumes.stump, 4), waste: f(B.volumes.waste, 4), top: f(B.volumes.top, 4), total: f(B.volumes.total, 4) }))}</p>
    <h3>${T('br.trees')}</h3><div class="tscroll"><table class="grid" id="btrees"><thead><tr><th>${T('br.tree')}</th><th>${T('br.n')}</th><th>${T('br.V')}</th><th>${T('br.res')}</th>${hasVal ? `<th>${esc(T('br.val', { cur }))}</th>` : ''}<th>${T('br.status')}</th></tr></thead><tbody>
    ${R.trees.map((t, i) => { const r = B.trees[i], okr = r.status === 'ok'; return `<tr${i === S.sel ? ' class="sel"' : ''}><td><button type="button" class="linkbtn" data-sel="${i}">${esc([t.plot_id, t.tree_id].filter(Boolean).join(' / '))}</button></td><td class="num">${okr ? r.pieces.length : '–'}</td><td class="num">${okr ? f(r.volumes.pieces, 4) : '–'}</td><td class="num">${okr ? f(r.volumes.residual, 4) : '–'}</td>${hasVal ? `<td class="num">${okr ? f(r.valueTotal, 2) : '–'}</td>` : ''}<td class="small">${esc(okr ? (r.topNote ? T('n.' + r.topNote) : '') : r.problems.map(q => q.code.startsWith('profile.') ? T('n.' + q.code.slice(8)) : T('p.' + q.code, q)).join('; '))}</td></tr>`; }).join('')}
    </tbody></table></div>`;
  const t = R.trees[S.sel], r = B.trees[S.sel];
  if (t && r && r.status === 'ok') {
    h += `<h3>${esc(T('br.pieces', { tree: [t.plot_id, t.tree_id].filter(Boolean).join(' / ') }))}</h3>
      <figure class="chartbox" id="ch-buck">${buckDrawing(t, r)}<figcaption class="small">${T('br.draw')} <button type="button" class="btn ghost small" id="svg-buck">${T('res.svg')}</button></figcaption></figure>`;
    h += r.pieces.length ? `<div class="tscroll"><table class="grid" id="bpieces"><thead><tr><th>#</th><th>${T('br.prod')}</th><th>${T('br.h1')}</th><th>${T('br.h2')}</th><th>${T('br.L')}</th><th>${T('br.trim')}</th><th>${T('br.dL')}</th><th>${T('br.dS')}</th><th>${T('br.V')}</th>${hasVal ? `<th>${esc(T('br.val', { cur }))}</th>` : ''}</tr></thead><tbody>
      ${r.pieces.map((q, i) => `<tr data-product="${q.product}"><td>${i + 1}</td><td>${swatch(q.product)} ${q.product + 1}. ${esc(q.name)}</td><td class="num">${f(q.h1, 2)}</td><td class="num">${f(q.h2, 2)}</td><td class="num">${f(q.L, 2)}</td><td class="num">${f(q.trim, 0)}</td><td class="num">${f(q.dLarge, 1)}</td><td class="num">${f(q.dSmall, 1)}</td><td class="num">${f(q.V, 4)}</td>${hasVal ? `<td class="num">${f(q.value, 2)}</td>` : ''}</tr>`).join('')}</tbody></table></div>`
      : `<p class="note small">${T('br.none')}</p>`;
  }
  return h + `<div class="exports"><button type="button" class="btn ghost" id="x-csv-b">${T('br.csv')}</button></div></div>`;
}
function piecesTable() {
  const rows = [['plot_id', 'tree_id', 'D_cm', 'H_m', 'piece', 'product', 'h1_m', 'h2_m', 'L_m', 'trim_cm', 'dLarge_cm', 'dSmall_cm', 'V_m3', 'value']];
  R.trees.forEach((t, i) => { const r = R.buck.trees[i]; if (r.status === 'ok') r.pieces.forEach((q, k) => rows.push([t.plot_id, t.tree_id, t.D, t.H, k + 1, q.name, q.h1, q.h2, q.L, q.trim, q.dLarge, q.dSmall, q.V, q.value])); });
  return rows;
}
function productsTable() {
  const B = R.buck, rows = [['product', 'dMin_cm', 'L_m', 'Lmax_m', 'Lstep_m', 'trim_cm', 'priority', 'value_per_m3', 'pieces', 'V_m3', 'value']];
  B.list.products.forEach((p, k) => rows.push([p.name, p.dMin, p.L, p.Lmax, p.Lstep, p.trim, p.priority, p.value, B.byProduct[k].n, B.byProduct[k].V, B.byProduct[k].value]));
  rows.push([], ['stump_m3', B.volumes.stump], ['pieces_m3', B.volumes.pieces], ['waste_m3', B.volumes.waste], ['top_m3', B.volumes.top], ['total_m3', B.volumes.total], ['currency', B.settings.currency]);
  return rows;
}
const noteText = b => [...(b.problems || []).map(q => T('p.' + q.code, q)), ...(b.warnings || []).map(w => T('n.' + w.code, w)), ...(b.note ? [T('n.' + b.note)] : []), ...(b.status !== 'ok' && b.status !== 'invalid' ? [T('n.' + b.status)] : [])];
function profileOf(t) {
  const step = R.settings.step, list = chosenSets(), hs = [];
  for (let h = 0; h < t.H - 1e-9; h += step) hs.push(+h.toFixed(10)); hs.push(t.H);
  return { hs, cols: list.map(s => ({ bark: TP.barkOf(s), d: hs.map(h => TP.diameterAt(s, t.D, t.H, h).d) })) };
}
function renderStep3() {
  const el = $('step3'); if (!R) compute();
  const used = R.sets.map(s => `${formText(s.form)} (${T('bark.' + s.bark)}; ${s.source})`).join('; ');
  let h = `<div class="card"><h2>${T('res.trees')}</h2><p class="note small" id="used">${esc(T('res.used', { list: used }))}</p><div class="tscroll"><table class="grid" id="rtab"><thead><tr><th>${T('res.tree')}</th><th>${T('res.D')}</th><th>${T('res.H')}</th><th>${T('res.bark')}</th><th>${T('res.total')}</th>${R.settings.dTop != null ? `<th>${T('res.hTop')}</th><th>${T('res.merch')}</th>` : ''}${R.settings.logs ? `<th>${T('lg.n')}</th><th>${T('lg.V')}</th><th>${T('lg.trims')}</th><th>${T('lg.rest')}</th>` : ''}<th>${T('res.d13')}</th><th>${T('res.notes')}</th></tr></thead><tbody>`;
  R.trees.forEach((t, i) => t.by.forEach((b, j) => {
    h += `<tr${i === S.sel ? ' class="sel"' : ''}>${j === 0 ? `<td rowspan="${t.by.length}"><button type="button" class="linkbtn" data-sel="${i}">${esc([t.plot_id, t.tree_id].filter(Boolean).join(' / '))}</button></td><td class="num" rowspan="${t.by.length}">${f(t.D, 1)}</td><td class="num" rowspan="${t.by.length}">${f(t.H, 1)}</td>` : ''}
      <td>${T('bark.' + b.bark)}</td><td class="num">${f(b.total, 4)}</td>${R.settings.dTop != null ? `<td class="num">${f(b.hTop, 2)}</td><td class="num">${f(b.merch, 4)}</td>` : ''}${R.settings.logs ? logCells(b.logs) : ''}<td class="num">${f(b.d13, 2)}</td><td class="small">${esc(noteText(b).join('; '))}</td></tr>`;
  }));
  h += `</tbody></table></div></div>`;
  const t = R.trees[S.sel];
  if (t && t.by.some(b => b.status !== 'invalid')) {
    const P = profileOf(t), list = chosenSets(), fine = Array.from({ length: 301 }, (_, i) => t.H * i / 300);   // the chart on a fine grid, the table on the chosen step
    const lines = list.map(s => ({ name: T('bark.' + TP.barkOf(s)), pts: fine.map(x => [x, TP.diameterAt(s, t.D, t.H, x).d ?? NaN]), k: TP.barkOf(s) === 'ob' ? 0 : 1, dash: TP.barkOf(s) === 'ib' }));
    const ymax = Math.max(...lines.flatMap(l => l.pts.map(p => p[1]).filter(Number.isFinite)), 1);
    h += `<div class="card"><h2>${T('res.detail')}: ${esc([t.plot_id, t.tree_id].filter(Boolean).join(' / '))}</h2>
      <figure class="chartbox" id="ch-prof">${plotChart({ title: T('res.profile'), xLabel: T('res.h'), yLabel: T('res.d'), xmin: 0, xmax: t.H, ymax: ymax * 1.05, lines, fmt: v => fmtNum(v, 1), height: 340 })}<figcaption class="small">${T('res.profile')} <button type="button" class="btn ghost small" id="svg-prof">${T('res.svg')}</button></figcaption></figure>
      <details class="more"><summary>${T('res.ptab')}</summary><div class="tscroll"><table class="grid" id="ptab"><thead><tr><th>${T('res.h')}</th>${P.cols.map(c => `<th>${T('res.d')} (${T('bark.' + c.bark)})</th>`).join('')}</tr></thead><tbody>${P.hs.map((x, i) => `<tr><td class="num">${f(x, 2)}</td>${P.cols.map(c => `<td class="num">${f(c.d[i], 2)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details></div>`;
  }
  if (t && R.settings.logs) h += logDetail(t);
  h += buckSection();
  h += `<div class="card"><div class="exports"><button type="button" class="btn" id="x-xlsx">${T('res.excel')}</button><button type="button" class="btn ghost" id="x-csv">${T('res.csv')}</button><button type="button" class="btn ghost" id="x-json">${T('res.json')}</button>${recordOption()}</div></div>
    <div class="nav"><button type="button" class="btn ghost" id="back2">${T('back')}</button></div>`;
  el.innerHTML = h;
  el.querySelectorAll('[data-sel]').forEach(b => b.addEventListener('click', () => { S.sel = +b.dataset.sel; save(); renderStep3(); }));
  $('svg-prof') && $('svg-prof').addEventListener('click', () => download('govde-profili.svg', svgForDownload($('ch-prof').querySelector('svg')), 'image/svg+xml'));
  $('svg-buck') && $('svg-buck').addEventListener('click', () => download('bucking.svg', svgForDownload($('ch-buck').querySelector('svg')), 'image/svg+xml'));
  $('back2').addEventListener('click', () => go(2));
  const name = ext => `taper-${new Date().toISOString().slice(0, 10)}.${ext}`;
  $('x-csv').addEventListener('click', () => downloadCSV(name('csv'), treeTable(), lang));
  $('x-csv-b') && $('x-csv-b').addEventListener('click', () => downloadCSV(name('csv').replace('.csv', '-pieces.csv'), piecesTable(), lang));
  $('x-json').addEventListener('click', () => downloadRecord(name('json'), { tool: TP.TOOL, created: R.created, settings: R.settings, sets: R.sets, trees: R.trees, bucking: R.buck,
    reading: S.trees.mode === 'table' && S.trees.src ? { columns: Object.fromEntries(Object.entries(S.trees.map).map(([k, i]) => [k, i == null ? null : S.trees.src.headers[i]])), decimal: S.trees.decimal } : { mode: S.trees.mode } },
    TP.TOOL, S.trees.mode === 'table' ? [['trees', S.trees.imp]] : [], m => status(m, 'err')));
  $('x-xlsx').addEventListener('click', async () => {
    const XLSX = await loadXLSX(BASE), prof = [['plot_id', 'tree_id', 'D_cm', 'H_m', 'h_m', ...R.sets.map(s => `d_${s.bark}_cm`)]];
    for (const t of R.trees) { if (t.by.every(b => b.status === 'invalid')) continue; const P = profileOf(t); P.hs.forEach((x, i) => prof.push([t.plot_id, t.tree_id, t.D, t.H, x, ...P.cols.map(c => c.d[i])])); }
    const info = [[T('x.k'), T('x.v')], [T('x.tool'), `${TP.TOOL.id} ${TP.TOOL.version}`], [T('x.date'), R.created], [T('x.lang'), lang], [T('x.settings'), JSON.stringify(R.settings)],
      ...R.sets.map(s => [T('x.sets'), `${s.form}; ${s.bark}; ${s.origin}; ${s.source}; ${JSON.stringify(s.params)}`])];
    if (R.buck) info.push([T('br.h'), JSON.stringify(R.buck.settings)], [T('br.h') + ' — ' + T('x.sets'), `${R.buck.set.form}; ${R.buck.set.source}`]);
    const sheets = [{ name: T('x.info'), rows: info }, { name: T('x.trees'), rows: treeTable() }, { name: T('x.profile'), rows: prof }];
    if (R.buck) sheets.push({ name: T('x.products'), rows: productsTable() }, { name: T('x.pieces'), rows: piecesTable() });
    download(name('xlsx'), xlsxBlob(XLSX, sheets), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });
}
function treeTable() {
  const L = !!R.settings.logs, rows = [['plot_id', 'tree_id', 'D_cm', 'H_m', 'bark', 'stump_m', 'total_m3', 'dTop_cm', 'hTop_m', 'merch_m3', ...(L ? ['logs_n', 'log_L_m', 'trim_cm', 'logs_m3', 'short_L_m', 'short_m3', 'trims_m3', 'rest_m3'] : []), 'd13_cm', 'status', 'notes']];
  for (const t of R.trees) for (const b of t.by) {
    const g = b.logs && b.logs.status === 'ok' ? b.logs : null;
    rows.push([t.plot_id, t.tree_id, t.D, t.H, b.bark, R.settings.stump, b.total ?? null, R.settings.dTop, b.hTop ?? null, b.merch ?? null,
      ...(L ? [g ? g.n : null, R.settings.logs.L, R.settings.logs.trim_cm, g ? g.V.logs : null, g && g.short ? g.short.L : null, g ? g.V.short : null, g ? g.V.trims : null, g ? g.V.rest : null] : []), b.d13 ?? null, b.status, noteText(b).join('; ')]);
  }
  return rows;
}
/* SV-03: log columns of the tree table and the log list of the selected tree */
function logCells(g) {
  if (!g) return '<td colspan="4" class="muted">–</td>';
  if (g.status !== 'ok') return `<td colspan="4" class="small">${esc(T('lg.e.' + g.code))}</td>`;
  return `<td class="num">${g.n}${g.short ? ' + 1' : ''}</td><td class="num">${f(g.V.logs + g.V.short, 4)}</td><td class="num">${f(g.V.trims, 4)}</td><td class="num"${g.code ? ` title="${esc(T('lg.e.' + g.code))}"` : ''}>${f(g.V.rest, 4)}</td>`;
}
function logDetail(t) {
  const items = t.by.filter(b => b.logs && b.logs.status === 'ok');
  if (!items.length) return '';
  let h = `<div class="card" id="logcard"><h2>${esc(T('lg.h', { tree: [t.plot_id, t.tree_id].filter(Boolean).join(' / ') }))}</h2>`;
  for (const b of items) {
    const g = b.logs, rows = [...g.logs.map((q, i) => [String(i + 1), q]), ...(g.short ? [[T('lg.shortrow'), g.short]] : [])];
    h += `<h3>${T('bark.' + b.bark)}</h3>${g.code ? `<p class="note warn small">${esc(T('lg.e.' + g.code))}</p>` : ''}
      ${rows.length ? `<div class="tscroll"><table class="grid" data-logs="${b.bark}"><thead><tr><th>#</th><th>${T('lg.h1')}</th><th>${T('lg.h2')}</th><th>${T('lg.len')}</th><th>${T('lg.ds')}</th><th>${T('lg.vol')}</th></tr></thead><tbody>
      ${rows.map(([k, q]) => `<tr><td>${esc(k)}</td><td class="num">${f(q.h1, 2)}</td><td class="num">${f(q.h2, 2)}</td><td class="num">${f(q.L, 2)}</td><td class="num">${f(q.dSmall, 1)}</td><td class="num">${f(q.V, 4)}</td></tr>`).join('')}</tbody></table></div>` : `<p class="small">${T('lg.none')}</p>`}
      <p class="small" data-bal="${b.bark}">${esc(T('lg.bal', { logs: f(g.V.logs + g.V.short, 4), trims: f(g.V.trims, 4), rest: f(g.V.rest, 4), merch: f(g.V.merch, 4) }))}</p>`;
  }
  return h + `<p class="muted small">${T('lg.src')}</p></div>`;
}

/* ---------------- navigation ---------------- */
const canGo = n => n === 1 || (n === 2 && chosenSets().length > 0) || (n === 3 && chosenSets().length > 0 && !step2Problems().length);
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
    const saved = await get(KEY);
    if (saved && saved.v === 1) {
      S = { ...blank(), ...saved, fit: { ...blank().fit, ...(saved.fit || {}) }, trees: { ...blank().trees, ...(saved.trees || {}) }, opt: { ...blank().opt, ...(saved.opt || {}) }, buck: { ...blank().buck, ...(saved.buck || {}) } };
      if (S.fit.imp && S.fit.imp.buf) S.fit.src = await readImport(S.fit.imp, BASE).catch(() => null);
      if (S.trees.imp && S.trees.imp.buf) S.trees.src = await readImport(S.trees.imp, BASE).catch(() => null);
      status(T('restored', { when: new Date(saved.saved).toLocaleString(LOC) }));
    }
  } catch (e) { S = blank(); }
  try { sets = await listCoefs('taper'); } catch (e) { sets = []; }   // the editor refreshes them again when step 1 is shown
  render();
})();
