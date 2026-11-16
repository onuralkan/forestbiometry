// Taper (stem profile): user interface. All arithmetic lives in calc.js and fit.js (and core/stems.js for the stem table).
import * as TP from './calc.js';
import * as FIT from './fit.js';
import { T } from './i18n.js';
import { lang, fmtNum, esc } from '../core/i18n.js';
import { put, get, del } from '../core/store.js';
import { cellText } from '../core/table.js';
import { parseNumber, detectDecimal, defaultDecimal } from '../core/num.js';
import { download, downloadCSV, downloadJSON, xlsxBlob, loadXLSX } from '../core/export.js';
import { plotChart, scatterChart, svgForDownload } from '../core/chart.js';
import { renderImport, readImport } from '../core/importer.js';
import { mountCoefEditor } from '../core/coef-ui.js';
import { saveCoef, listCoefs } from '../core/coef.js';
import { readStems } from '../core/stems.js';

const BASE = './', KEY = 'session:' + TP.TOOL.id, LOC = lang === 'tr' ? 'tr-TR' : 'en-GB';
const $ = id => document.getElementById(id);
const f = (x, d = 3) => x == null || !Number.isFinite(x) ? '–' : fmtNum(x, d);
const num = v => { const t = String(v ?? '').trim(); if (!t) return null; const x = Number(t.replace(',', '.')); return Number.isFinite(x) ? x : NaN; };
const EXTRA = [{ key: 'bark', type: 'choice', required: true, label: { tr: T('x.bark'), en: T('x.bark') }, values: ['ob', 'ib'].map(v => ({ v, tr: T('x.bark.' + v), en: T('x.bark.' + v) })), note: { tr: T('x.bark.note'), en: T('x.bark.note') } }];
const FKEYS = ['tree', 'plot', 'period', 'h', 'd', 'bark_t', 'dbh', 'height', 'stump_h'];
const FGUESS = { tree: ['agac', 'ağaç', 'tree', 'tree_id'], plot: ['alan', 'plot', 'plot_id'], period: ['donem', 'dönem', 'period'], h: ['h', 'h_m', 'yukseklik', 'yükseklik'], d: ['d', 'cap', 'çap', 'cap_cm', 'çap_cm'],
  bark_t: ['kabuk', 'kabuk_mm', 'bark_mm'], dbh: ['dbh', 'd13', 'gogus_capi'], height: ['boy', 'boy_m', 'height'], stump_h: ['kesim', 'kesim_m', 'stump_h'] };
const TGUESS = { plot: ['alan', 'plot', 'plot_id'], tree: ['agac', 'ağaç', 'tree', 'tree_id'], D: ['dbh', 'd13', 'cap', 'çap', 'd'], H: ['boy', 'h', 'height', 'boy_m'] };

let S = blank(), sets = [], R = null, FR = null;
function blank() {
  return { v: 1, step: 1, tab: 'coef', setOb: null, setIb: null,
    fit: { imp: null, src: null, map: Object.fromEntries(FKEYS.map(k => [k, null])), decimal: null, decimalChosen: false, barkDef: 'ob', form: 'mb76', bark: 'ib', scale: 'd', cit: '' },
    trees: { mode: 'single', D: '', H: '', imp: null, src: null, map: { plot: null, tree: null, D: null, H: null }, decimal: null, decimalChosen: false },
    opt: { stump: '0.3', dTop: '', step: '1' }, sel: 0 };
}
let saveT = null;
function save() { clearTimeout(saveT); saveT = setTimeout(flush, 250); }
async function flush() { clearTimeout(saveT); saveT = null; await put(KEY, { ...S, saved: new Date().toISOString() }); }
addEventListener('pagehide', () => { if (saveT) flush(); });   // a pending save is written when the page goes away
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
      <p class="small">${esc(TP.FORMS[F.form].formula[lang] || TP.FORMS[F.form].formula.tr)}</p>
      <div class="radios col"><span class="small"><b>${T('fit.scale')}</b></span>${['d', 'source'].map(v => `<label><input type="radio" name="fscale" value="${v}"${F.scale === v ? ' checked' : ''}> ${T('fit.scale.' + v)}</label>`).join('')}</div>
      <div class="nav"><button type="button" class="btn" id="f-run"${need ? ' disabled' : ''}>${T('fit.run')}</button>${need ? `<span class="muted small">${T('fit.need')}</span>` : ''}</div><div id="fitout"></div>`;
  }
  el.innerHTML = h;
  renderImport($('fitimp'), { imp: F.imp, src: F.src }, { base: BASE, title: T('fit.imp'), onChange: st => { F.imp = st.imp; F.src = st.src; F.map = st.src ? { ...F.map, ...guess(st.src, FGUESS) } : Object.fromEntries(FKEYS.map(k => [k, null])); F.decimalChosen = false; FR = null; save(); renderFit(); }, onError: m => status(m, 'err') });
  $('fsample') && $('fsample').addEventListener('click', async () => {
    const buf = await (await fetch(BASE + 'assets/lab/secvol/ornek/ornek-seksiyon.csv')).arrayBuffer();
    const imp = { kind: 'csv', name: lang === 'tr' ? 'ornek-seksiyon.csv (benzetim)' : 'ornek-seksiyon.csv (simulated)', buf, encoding: 'utf-8', delim: null, header: true, sheet: null };
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
  return p;
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
    <p class="muted small">${T('tr.opts.note')}</p></div>`;
  const pr = step2Problems();
  h += `<div class="nav"><button type="button" class="btn ghost" id="back1">${T('back')}</button><button type="button" class="btn" id="calc"${pr.length ? ' disabled' : ''}>${T('calc')}</button>${pr.length ? `<span class="muted small">${pr.map(esc).join(' ')}</span>` : ''}</div>`;
  el.innerHTML = h;
  const re = () => { R = null; save(); renderStep2(); renderSteps(); };
  el.querySelectorAll('input[name="tmode"]').forEach(x => x.addEventListener('change', () => { t.mode = x.value; re(); }));
  for (const k of ['D', 'H']) $('t-' + k) && $('t-' + k).addEventListener('change', e => { t[k] = e.target.value; re(); });
  for (const k of ['stump', 'dTop', 'step']) $('o-' + k).addEventListener('change', e => { o[k] = e.target.value; re(); });
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
  const o = opts(), list = chosenSets();
  R = { created: new Date().toISOString(), settings: { stump: o.stump, dTop: o.dTop, step: o.step }, sets: list.map(s => ({ id: s.id, form: s.form, bark: TP.barkOf(s), params: s.params, source: s.source.citation, origin: s.origin })),
    trees: treeRows().map(t => ({ ...t, by: list.map(s => {
      const ev = TP.evaluateTree(s, t.D, t.H);
      if (ev.status !== 'ok') return { bark: TP.barkOf(s), status: 'invalid', problems: ev.problems, warnings: [] };
      const m = TP.merchantable(s, t.D, t.H, { stump: o.stump, dTop: o.dTop });
      return { bark: TP.barkOf(s), status: m.status, total: m.total, hTop: m.hTop, merch: m.merch, note: m.note, d13: ev.consistency.d13, warnings: ev.warnings, problems: [] };
    }) })) };
  save();
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
  let h = `<div class="card"><h2>${T('res.trees')}</h2><p class="note small" id="used">${esc(T('res.used', { list: used }))}</p><div class="tscroll"><table class="grid" id="rtab"><thead><tr><th>${T('res.tree')}</th><th>${T('res.D')}</th><th>${T('res.H')}</th><th>${T('res.bark')}</th><th>${T('res.total')}</th>${R.settings.dTop != null ? `<th>${T('res.hTop')}</th><th>${T('res.merch')}</th>` : ''}<th>${T('res.d13')}</th><th>${T('res.notes')}</th></tr></thead><tbody>`;
  R.trees.forEach((t, i) => t.by.forEach((b, j) => {
    h += `<tr${i === S.sel ? ' class="sel"' : ''}>${j === 0 ? `<td rowspan="${t.by.length}"><button type="button" class="linkbtn" data-sel="${i}">${esc([t.plot_id, t.tree_id].filter(Boolean).join(' / '))}</button></td><td class="num" rowspan="${t.by.length}">${f(t.D, 1)}</td><td class="num" rowspan="${t.by.length}">${f(t.H, 1)}</td>` : ''}
      <td>${T('bark.' + b.bark)}</td><td class="num">${f(b.total, 4)}</td>${R.settings.dTop != null ? `<td class="num">${f(b.hTop, 2)}</td><td class="num">${f(b.merch, 4)}</td>` : ''}<td class="num">${f(b.d13, 2)}</td><td class="small">${esc(noteText(b).join('; '))}</td></tr>`;
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
  h += `<div class="card"><div class="exports"><button type="button" class="btn" id="x-xlsx">${T('res.excel')}</button><button type="button" class="btn ghost" id="x-csv">${T('res.csv')}</button><button type="button" class="btn ghost" id="x-json">${T('res.json')}</button></div></div>
    <div class="nav"><button type="button" class="btn ghost" id="back2">${T('back')}</button></div>`;
  el.innerHTML = h;
  el.querySelectorAll('[data-sel]').forEach(b => b.addEventListener('click', () => { S.sel = +b.dataset.sel; save(); renderStep3(); }));
  $('svg-prof') && $('svg-prof').addEventListener('click', () => download('govde-profili.svg', svgForDownload($('ch-prof').querySelector('svg')), 'image/svg+xml'));
  $('back2').addEventListener('click', () => go(2));
  const name = ext => `${lang === 'tr' ? 'govde-profili' : 'taper'}-${new Date().toISOString().slice(0, 10)}.${ext}`;
  $('x-csv').addEventListener('click', () => downloadCSV(name('csv'), treeTable(), lang));
  $('x-json').addEventListener('click', () => downloadJSON(name('json'), { tool: TP.TOOL, created: R.created, settings: R.settings, sets: R.sets, trees: R.trees }));
  $('x-xlsx').addEventListener('click', async () => {
    const XLSX = await loadXLSX(BASE), prof = [['plot_id', 'tree_id', 'D_cm', 'H_m', 'h_m', ...R.sets.map(s => `d_${s.bark}_cm`)]];
    for (const t of R.trees) { if (t.by.every(b => b.status === 'invalid')) continue; const P = profileOf(t); P.hs.forEach((x, i) => prof.push([t.plot_id, t.tree_id, t.D, t.H, x, ...P.cols.map(c => c.d[i])])); }
    const info = [[T('x.k'), T('x.v')], [T('x.tool'), `${TP.TOOL.id} ${TP.TOOL.version}`], [T('x.date'), R.created], [T('x.lang'), lang], [T('x.settings'), JSON.stringify(R.settings)],
      ...R.sets.map(s => [T('x.sets'), `${s.form}; ${s.bark}; ${s.origin}; ${s.source}; ${JSON.stringify(s.params)}`])];
    download(name('xlsx'), xlsxBlob(XLSX, [{ name: T('x.info'), rows: info }, { name: T('x.trees'), rows: treeTable() }, { name: T('x.profile'), rows: prof }]), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });
}
function treeTable() {
  const rows = [['plot_id', 'tree_id', 'D_cm', 'H_m', 'bark', 'stump_m', 'total_m3', 'dTop_cm', 'hTop_m', 'merch_m3', 'd13_cm', 'status', 'notes']];
  for (const t of R.trees) for (const b of t.by) rows.push([t.plot_id, t.tree_id, t.D, t.H, b.bark, R.settings.stump, b.total ?? null, R.settings.dTop, b.hTop ?? null, b.merch ?? null, b.d13 ?? null, b.status, noteText(b).join('; ')]);
  return rows;
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
      S = { ...blank(), ...saved, fit: { ...blank().fit, ...(saved.fit || {}) }, trees: { ...blank().trees, ...(saved.trees || {}) }, opt: { ...blank().opt, ...(saved.opt || {}) } };
      if (S.fit.imp && S.fit.imp.buf) S.fit.src = await readImport(S.fit.imp, BASE).catch(() => null);
      if (S.trees.imp && S.trees.imp.buf) S.trees.src = await readImport(S.trees.imp, BASE).catch(() => null);
      status(T('restored', { when: new Date(saved.saved).toLocaleString(LOC) }));
    }
  } catch (e) { S = blank(); }
  try { sets = await listCoefs('taper'); } catch (e) { sets = []; }   // the editor refreshes them again when step 1 is shown
  render();
})();
