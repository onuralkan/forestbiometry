// Volume equations (SV-04): user interface. All arithmetic in calc.js (tested in tests/volume/); fit measures from the
// Model Evaluation tool's own function. Data: a tree table (D, H, V) or the volumes sent by Stem Section Volume (BC03).
import * as VOL from './calc.js';
import { T } from './i18n.js';
import { lang, fmtNum, esc } from '../core/i18n.js';
import { put, get, del } from '../core/store.js';
import { saveCoef, blankSet } from '../core/coef.js';
import { renderImport, readImport } from '../core/importer.js';
import { cellText } from '../core/table.js';
import { parseNumber, detectDecimal, defaultDecimal } from '../core/num.js';
import { sha256JSON } from '../core/record.js';
import { readDerived, storeKey, KIND_VOLUME } from '../core/derived.js';
import { download, downloadCSV, xlsxBlob, loadXLSX } from '../core/export.js';
import { scatterChart, svgForDownload } from '../core/chart.js';
import { downloadRecord, recordOption } from '../core/record-ui.js';
import { buildR } from './rcode.js';
import { tableCsv, csvName } from '../core/rcode.js';

const BASE = './', KEY = 'session:' + VOL.TOOL.id, LOC = lang === 'tr' ? 'tr-TR' : 'en-GB', $ = id => document.getElementById(id);
const f = (x, d = 4) => x == null || !Number.isFinite(x) ? '–' : fmtNum(x, d);
/** Eight significant digits (coefficients and errors span many orders of magnitude). */
const sig = x => x == null || !Number.isFinite(x) ? '–' : x === 0 ? '0' : Math.abs(x) >= 1e-4 && Math.abs(x) < 1e6 ? fmtNum(Number(x.toPrecision(8)), 14) : x.toExponential(7);
const num = t => { const r = parseNumber(String(t ?? '').trim(), '.'); return r.status === 'ok' ? r.value : NaN; };
const WLABEL = { d2h: 'D²H', d2: 'D²' };
let S = blank(), R = null, approved = null, dv = null, saveT = null;
function blank() {
  return { v: 1, step: 1, tbl: null, trees: null, src: null, forms: { cf: false, cv: true, ln: true, loc: false, locln: false },
    w: { cf: { on: false, k: '' }, cv: { on: false, k: '' }, loc: { on: false, k: '' } }, corr: { ln: 'baskerville', locln: 'baskerville' }, cit: '', sp: '', saveForm: 'ln' };
}
function save() { clearTimeout(saveT); saveT = setTimeout(flush, 250); }
function flush() { clearTimeout(saveT); saveT = null; return put(KEY, { ...S, saved: new Date().toISOString() }); }
addEventListener('pagehide', () => { if (saveT) flush(); });
function status(m, k = '') { const s = $('status'); s.className = 'status ' + k; s.textContent = m || ''; }
const formName = id => T('f.' + id);

/* ---------------- step 1: data ---------------- */
const GUESS = { D: ['d', 'dbh', 'cap', 'çap', 'dbh_cm', 'cap_cm', 'd13'], H: ['h', 'boy', 'height', 'boy_m', 'height_m'], V: ['v', 'hacim', 'volume', 'v_m3', 'hacim_m3'], id: ['agac', 'ağaç', 'tree', 'tree_id', 'id'] };
function setTable(st) {
  if (!st.src) { S.tbl = null; save(); renderStep1(); return; }
  const H = st.src.headers.map(h => String(h).trim().toLocaleLowerCase('tr')), map = {};
  for (const k of Object.keys(GUESS)) { const i = H.findIndex(h => GUESS[k].includes(h)); map[k] = i < 0 ? null : i; }
  S.tbl = { imp: st.imp, src: st.src, map, decimal: null, decChosen: false, bark: 'na' };
  status(''); save(); renderStep1();
}
function useTable() {
  const t = S.tbl, src = t.src, val = (r, c) => { if (c == null) return null; const x = r[c]; if (x && x.t === 'n') return x.v; const p = parseNumber(cellText(x), t.decimal); return p.status === 'ok' ? p.value : null; };
  S.trees = src.rows.map((r, i) => ({ row: src.rowNumbers[i], id: t.map.id != null ? cellText(r[t.map.id]) : null, D: val(r, t.map.D), H: val(r, t.map.H), V: val(r, t.map.V) }));
  S.src = { kind: 'table', name: t.imp ? t.imp.name : '', bark: t.bark }; R = null; save(); render();
}
async function loadDerived() {
  dv = null; if (!approved) return;
  try { const sha = await sha256JSON(approved); dv = { sha, ...readDerived(await get(storeKey(KIND_VOLUME, sha)), KIND_VOLUME, sha) }; } catch (e) { dv = null; }
}
function useDerived(side) {
  const by = new Map(dv.record.trees.map(t => [t.row, t]));
  S.trees = approved.trees.map(t => { const x = by.get(t.row); return { row: t.row, id: [t.plot_id, t.tree_id].filter(v => v != null).join('/'), D: t.dbh, H: t.height ?? null, V: x ? (side === 'ib' ? x.v_ib : x.v_ob) : null }; });
  S.src = { kind: 'secvol', name: `${dv.record.tool.id} ${dv.record.tool.version} (${dv.record.settings && dv.record.settings.method || ''})`, bark: side, package: dv.sha };
  R = null; save(); render();
}
function renderMap() {
  const box = $('mapbox'); if (!box) return;
  if (!S.tbl || !S.tbl.src) { box.innerHTML = ''; return; }
  const t = S.tbl, src = t.src;
  const dvr = detectDecimal(['D', 'H', 'V'].map(k => t.map[k]).filter(c => c != null).flatMap(c => src.rows.map(r => r[c]).filter(x => x && x.t === 's').map(x => x.v)));
  if (!t.decChosen) t.decimal = defaultDecimal(dvr.verdict);
  const opts = cur => `<option value="">${T('none')}</option>` + src.headers.map((h, i) => `<option value="${i}"${cur === i ? ' selected' : ''}>${esc(h)}</option>`).join('');
  box.innerHTML = `<div class="card"><div class="lims">${['D', 'H', 'V', 'id'].map(k => `<label>${T('map.' + k)} <select data-map="${k}">${opts(t.map[k])}</select></label>`).join('')}
    <label>${T('map.bark')} <select id="tbark">${['na', 'ob', 'ib'].map(b => `<option value="${b}"${t.bark === b ? ' selected' : ''}>${T('bark.' + b)}</option>`).join('')}</select></label></div>
    <div class="radios"><span class="small">${T('dec.h')}:</span> <label class="small"><input type="radio" name="tdec" value="."${t.decimal === '.' ? ' checked' : ''}> ${T('dec.dot')}</label><label class="small"><input type="radio" name="tdec" value=","${t.decimal === ',' ? ' checked' : ''}> ${T('dec.comma')}</label></div>
    <div class="nav"><button type="button" class="btn" id="usetbl"${t.map.D == null || t.map.V == null ? ' disabled' : ''}>${T('map.use')}</button></div></div>`;
  box.querySelectorAll('[data-map]').forEach(x => x.addEventListener('change', () => { t.map[x.dataset.map] = x.value === '' ? null : +x.value; save(); renderMap(); }));
  box.querySelectorAll('input[name="tdec"]').forEach(x => x.addEventListener('change', () => { t.decimal = x.value; t.decChosen = true; save(); }));
  $('tbark').addEventListener('change', e => { t.bark = e.target.value; save(); });
  $('usetbl').addEventListener('click', useTable);
}
function renderStep1() {
  const el = $('step1');
  let h = `<div id="tblbox"></div><div id="mapbox"></div><div class="card"><h2>${T('sv.h')}</h2><p class="muted small">${T('sv.sub')}</p>`;
  if (dv && dv.ok) h += `<p class="note ok small" id="svinfo">${esc(T('sv.info', { tool: `${dv.record.tool.id} ${dv.record.tool.version}`, when: new Date(dv.record.created).toLocaleString(LOC), m: dv.record.settings && dv.record.settings.method || '–', n: dv.record.trees.length }))}</p>
    <div class="lims"><label>${T('sv.side')} <select id="svside">${['ob', 'ib'].map(b => `<option value="${b}">${T('bark.' + b)}</option>`).join('')}</select></label><button type="button" class="btn ghost" id="svuse">${T('sv.use')}</button></div>`;
  else h += `<p class="muted small" id="svnone">${T('sv.none')}</p>`;
  h += `<p><button type="button" class="btn ghost" id="sample">${T('sample')}</button> <span class="muted small">${T('sample.note')}</span></p>`;
  if (S.trees) h += `<p class="note ok" id="dsinfo"><b>${T('src.current')}:</b> ${esc(T('src.info', { name: S.src.name, n: S.trees.length, bark: T('bark.' + (S.src.bark || 'na')) }))}</p>`;
  h += `</div><div class="nav"><button type="button" class="btn ghost" id="reset">${T('reset')}</button><button type="button" class="btn" id="to2"${S.trees ? '' : ' disabled'}>${T('next')}</button>${S.trees ? '' : `<span class="muted small">${T('need.data')}</span>`}</div>`;
  el.innerHTML = h;
  renderImport($('tblbox'), { imp: S.tbl && S.tbl.imp, src: S.tbl && S.tbl.src }, { base: BASE, title: T('tb.h'), sub: T('tb.sub'), onChange: setTable, onError: m => status(m, 'err') });
  renderMap();
  $('svuse') && $('svuse').addEventListener('click', () => useDerived($('svside').value));
  $('sample').addEventListener('click', async () => {
    const buf = await (await fetch(BASE + 'assets/lab/volume/ornek/ornek-hacim.csv')).arrayBuffer();
    const imp = { kind: 'csv', name: lang === 'tr' ? 'ornek-hacim.csv (benzetim)' : 'ornek-hacim.csv (simulated)', buf, encoding: 'utf-8', delim: null, header: true, sheet: null };
    setTable({ imp, src: await readImport(imp, BASE) }); S.tbl.decimal = '.'; S.tbl.decChosen = true; useTable();
  });
  $('reset').addEventListener('click', async () => { S = blank(); R = null; status(''); render(); await del(KEY); });
  $('to2').addEventListener('click', () => go(2));
}

/* ---------------- step 2: forms ---------------- */
function step2Problems() {
  const p = [];
  if (!VOL.FORM_IDS.some(id => S.forms[id])) p.push(T('p.forms'));
  for (const id of Object.keys(S.w)) if (S.forms[id] && S.w[id].on && S.w[id].k !== '' && !Number.isFinite(num(S.w[id].k))) p.push(T('p.k'));
  return p;
}
function renderStep2() {
  const el = $('step2');
  let h = `<div class="card"><h2>${T('f.h')}</h2><p class="muted small">${T('f.sub')}</p><div class="tscroll"><table class="grid" id="ftab"><tbody>`;
  for (const id of VOL.FORM_IDS) {
    const F = VOL.FORMS[id];
    h += `<tr><td><label class="chk"><input type="checkbox" data-form="${id}"${S.forms[id] ? ' checked' : ''}> ${esc(formName(id))}</label></td><td>`;
    if (F.scale === 'none') { const w = S.w[id]; h += `<label class="small"><input type="checkbox" data-won="${id}"${w.on ? ' checked' : ''}> ${T('w.power', { v: WLABEL[F.wvar] })}</label>${w.on ? ` <label class="small">${T('w.k')} <input type="text" inputmode="decimal" size="6" data-wk="${id}" value="${esc(w.k)}"></label>` : ''}`; }
    else h += `<label class="small">${T('corr.h')} <select data-corr="${id}">${['none', 'baskerville'].map(c => `<option value="${c}"${S.corr[id] === c ? ' selected' : ''}>${T('corr.' + c)}</option>`).join('')}</select></label>`;
    h += `</td></tr>`;
  }
  h += `</tbody></table></div><p class="muted small">${T('f.note')}</p></div>`;
  const pr = step2Problems();
  h += `<div class="nav"><button type="button" class="btn ghost" id="back1">${T('back')}</button><button type="button" class="btn" id="calc"${pr.length ? ' disabled' : ''}>${T('calc')}</button>${pr.length ? `<span class="muted small" id="s2prob">${pr.map(esc).join(' · ')}</span>` : ''}</div>`;
  el.innerHTML = h;
  const re = () => { R = null; save(); renderStep2(); renderSteps(); };
  el.querySelectorAll('[data-form]').forEach(x => x.addEventListener('change', () => { S.forms[x.dataset.form] = x.checked; re(); }));
  el.querySelectorAll('[data-won]').forEach(x => x.addEventListener('change', () => { S.w[x.dataset.won].on = x.checked; re(); }));
  el.querySelectorAll('[data-wk]').forEach(x => x.addEventListener('change', () => { S.w[x.dataset.wk].k = x.value.trim(); re(); }));
  el.querySelectorAll('[data-corr]').forEach(x => x.addEventListener('change', () => { S.corr[x.dataset.corr] = x.value; re(); }));
  $('back1').addEventListener('click', () => go(1));
  $('calc').addEventListener('click', () => { compute(); go(3); });
}

/* ---------------- step 3: results ---------------- */
function optsOf(id) {
  const F = VOL.FORMS[id];
  if (F.scale === 'log') return { correction: S.corr[id] };
  const w = S.w[id]; return { weight: w.on ? { kind: 'power', k: w.k === '' ? null : num(w.k) } : { kind: 'none' } };
}
function compute() {
  R = { created: new Date().toISOString(), src: S.src, fits: VOL.FORM_IDS.filter(id => S.forms[id]).map(id => ({ id, opts: optsOf(id), ...VOL.fitForm(id, S.trees, optsOf(id)) })) };
  const ok = R.fits.filter(x => x.status === 'ok'); if (ok.length && !ok.some(x => x.id === S.saveForm)) S.saveForm = ok[0].id;
}
const rowsText = rows => { const r = rows.filter(x => x != null); return r.length > 25 ? r.slice(0, 25).join(', ') + ' …' : r.join(', '); };
const wText = x => x.weight.kind === 'none' ? T('w.none') : `${T('w.power', { v: WLABEL[x.weight.var] })}, k = ${fmtNum(x.weight.k, 4)}${x.weight.estimated ? ' (' + T('r.k.est') + ')' : ''}`;
const cfText = x => x.cf == null ? '–' : x.correction === 'baskerville' ? `${T('corr.baskerville')} = ${fmtNum(x.cf, 6)}` : T('corr.none');
function renderStep3() {
  if (!R) compute();
  const el = $('step3'), ok = R.fits.filter(x => x.status === 'ok');
  let h = `<div class="card"><h2>${T('r.cmp')}</h2><div class="tscroll"><table class="grid" id="cmptab"><thead><tr><th>${T('r.form')}</th><th>${T('r.n')}</th><th>${T('r.rmse')}</th><th>${T('r.bias')}</th><th>${T('r.mae')}</th><th>${T('r.r2')}</th><th>${T('r.s')}</th><th>${T('r.w')}</th><th>${T('r.cf')}</th></tr></thead><tbody>
    ${R.fits.map(x => x.status === 'ok' ? `<tr data-form="${x.id}"><th>${esc(formName(x.id))}</th><td class="num">${x.n}</td><td class="num" data-k="rmse">${f(x.metrics.rmse, 5)}</td><td class="num" data-k="bias">${f(x.metrics.bias, 5)}</td><td class="num">${f(x.metrics.mae, 5)}</td><td class="num" data-k="r2">${f(x.metrics.r2, 4)}</td><td class="num">${sig(x.s)}</td><td class="small">${esc(wText(x))}</td><td class="small">${esc(cfText(x))}</td></tr>`
      : `<tr data-form="${x.id}"><th>${esc(formName(x.id))}</th><td colspan="8" class="small">${esc(T('r.bad', { why: T('e.' + x.code) }))}</td></tr>`).join('')}</tbody></table></div><p class="muted small">${T('r.cmpnote')}</p></div>`;
  for (const x of ok) {
    const F = VOL.FORMS[x.id], log = F.scale === 'log', names = log ? ['ln ' + F.params[0], ...F.params.slice(1)] : F.params;
    h += `<div class="card" data-fit="${x.id}"><h2>${esc(formName(x.id))}</h2>${x.dropped.length ? `<p class="note warn small">${esc(T('r.drop', { n: x.dropped.length, rows: rowsText(x.dropped.map(d => d.row)) }))}</p>` : ''}
      <div class="tscroll"><table class="grid" data-coef="${x.id}"><thead><tr><th>${T('r.term')}</th><th>${T('r.est')}</th><th>${T('r.se')}</th></tr></thead><tbody>
      ${names.map((n, i) => `<tr><th>${esc(n)}</th><td class="num" data-k="c${i}">${sig(x.coef[i])}</td><td class="num">${sig(x.se[i])}</td></tr>`).join('')}
      ${log ? `<tr><th>${esc(F.params[0])} = exp(ln ${esc(F.params[0])})</th><td class="num">${sig(x.params[F.params[0]])}</td><td></td></tr>` : ''}</tbody></table></div>${log ? `<p class="muted small">${T('r.lnnote')}</p>` : ''}
      <div class="charts2"><figure class="chartbox" id="ch-o-${x.id}">${scatterChart({ title: T('ch.obs', { f: formName(x.id) }), points: x.obs.map((o, i) => [o, x.pred[i]]), xLabel: T('ch.xo'), yLabel: T('ch.yo'), equal: true, fmt: v => fmtNum(v, 2), width: 420, height: 340 })}</figure>
      <figure class="chartbox" id="ch-r-${x.id}">${scatterChart({ title: T('ch.res', { f: formName(x.id) }), points: x.pred.map((p, i) => [p, x.obs[i] - p]), xLabel: T('ch.x'), yLabel: T('ch.y'), hline: 0, fmt: v => fmtNum(v, 2), width: 420, height: 340 })}</figure></div></div>`;
  }
  if (ok.length) {
    h += `<div class="card" id="savecard"><h2>${T('save.h')}</h2><div class="lims"><label>${T('save.form')} <select id="sv-form">${ok.map(x => `<option value="${x.id}"${S.saveForm === x.id ? ' selected' : ''}>${esc(formName(x.id))}</option>`).join('')}</select></label>
      <label>${T('save.sp')} <input type="text" size="14" id="sv-sp" value="${esc(S.sp)}"></label></div>
      <label class="field"><span>${T('save.cit')}</span><input type="text" id="sv-cit" value="${esc(S.cit)}" placeholder="${esc(T('save.cit.ph'))}"></label>
      <div class="nav"><button type="button" class="btn" id="sv-save">${T('save.btn')}</button></div><div id="sv-msg"></div></div>
      <div class="card" id="evcard"><h2>${T('ev.h')}</h2><p class="muted small">${T('ev.sub')}</p><button type="button" class="btn ghost" id="ev-send">${T('ev.btn')}</button></div>`;
  }
  h += `<div class="card"><h2>${T('x.h')}</h2><div class="exports"><button type="button" class="btn" id="x-xlsx">${T('x.xlsx')}</button><button type="button" class="btn ghost" id="x-csv">${T('x.csv')}</button><button type="button" class="btn ghost" id="x-json">${T('x.json')}</button><button type="button" class="btn ghost" id="x-r">${T('x.r')}</button>${recordOption()}</div><p class="muted small">${T('x.r.note')}</p></div>
    <div class="nav"><button type="button" class="btn ghost" id="back2">${T('back')}</button></div>`;
  el.innerHTML = h;
  $('back2').addEventListener('click', () => go(2));
  if (ok.length) {
    $('sv-form').addEventListener('change', e => { S.saveForm = e.target.value; save(); });
    $('sv-sp').addEventListener('change', e => { S.sp = e.target.value.trim(); save(); });
    $('sv-cit').addEventListener('change', e => { S.cit = e.target.value; save(); });
    $('sv-save').addEventListener('click', saveSet);
    $('ev-send').addEventListener('click', sendToEval);
  }
  const name = ext => `${lang === 'tr' ? 'hacim-denklemleri' : 'volume-equations'}-${new Date().toISOString().slice(0, 10)}.${ext}`;
  $('x-csv').addEventListener('click', () => downloadCSV(name('csv'), treeRows(), lang));
  $('x-r').addEventListener('click', downloadR);
  $('x-xlsx').addEventListener('click', async () => {
    let XLSX; try { XLSX = await loadXLSX(BASE); } catch (e) { status(T('x.fail'), 'err'); return; }
    download(name('xlsx'), xlsxBlob(XLSX, [{ name: T('x.info'), rows: infoRows(), widths: [28, 100] }, { name: T('x.cmp'), rows: cmpRows() }, { name: T('x.coef'), rows: coefRows() }, { name: T('x.trees'), rows: treeRows() }]));
  });
  $('x-json').addEventListener('click', () => downloadRecord(name('json'), { tool: VOL.TOOL, created: R.created, source: R.src,
    fits: R.fits.map(x => x.status === 'ok' ? { form: x.id, eq: x.eq, n: x.n, options: x.opts, coef: x.coef, se: x.se, cov: x.cov, params: x.params, s: x.s, weight: x.weight, correction: x.correction, cf: x.cf, metrics: x.metrics, dropped: x.dropped } : { form: x.id, status: x.status, code: x.code }) },
    VOL.TOOL, S.src && S.src.kind === 'table' && S.tbl ? [['trees', S.tbl.imp]] : approved && S.src && S.src.kind === 'secvol' ? [['dataset', { kind: 'dataset', dataset: approved }]] : [], m => status(m, 'err')));
}
/** The R script; trees not read from a file (Stem Section Volume results, pasted cells) go along as a CSV file. */
function downloadR() {
  const fromTable = S.src && S.src.kind === 'table' && S.tbl, imp = fromTable ? S.tbl.imp : null, file = imp && imp.kind !== 'dataset' && imp.kind !== 'paste' ? imp.name : null;
  const n = v => v == null ? null : { t: 'n', v };
  const s = fromTable ? { imp, src: S.tbl.src, map: S.tbl.map, decimal: S.tbl.decimal || '.' }
    : { imp: { kind: 'dataset', name: lang === 'tr' ? 'hacim-agaclari' : 'volume-trees' }, decimal: '.', map: { D: 2, H: 3, V: 4 },
      src: { headers: ['row', 'tree', 'D_cm', 'H_m', 'V_m3'], rows: S.trees.map(t => [n(t.row), { t: 's', v: t.id ?? '' }, n(t.D), n(t.H), n(t.V)]) },
      note: T('x.r.sv', { src: S.src ? S.src.name : '' }) };
  const name = `${lang === 'tr' ? 'hacim-denklemleri' : 'volume-equations'}-${new Date().toISOString().slice(0, 10)}.R`;
  download(name, buildR(s, R, { lang, created: new Date().toISOString(), version: VOL.TOOL.version, fileName: file }), 'text/plain;charset=utf-8');
  if (!file) download(csvName(s.imp), tableCsv(s.src, cellText, s.decimal), 'text/csv;charset=utf-8');
}
async function saveSet() {
  const cit = String(S.cit).trim(); if (!cit) { $('sv-msg').innerHTML = `<p class="note err small">${T('save.cit.miss')}</p>`; return; }
  const x = R.fits.find(q => q.id === S.saveForm && q.status === 'ok'), F = VOL.FORMS[x.id];
  const D = x.D, H = x.H.filter(v => v != null);
  const set = { ...blankSet('volume.' + x.id), params: { ...x.params }, valid: { D: [Math.min(...D), Math.max(...D)], ...(F.needsH && H.length ? { H: [Math.min(...H), Math.max(...H)] } : {}) },
    species: S.sp || null, source: { citation: cit }, origin: 'fitted',
    transform: F.scale === 'log' ? { kind: 'log', correction: x.correction === 'baskerville' ? 'baskerville' : 'none', ...(x.correction === 'baskerville' ? { value: x.s } : {}) } : null,
    meta: { bark: S.src && S.src.bark || 'na' },
    fit: { method: x.weight.kind === 'none' ? 'least squares' : 'weighted least squares', eq: 'Kershaw et al. 2016 ' + F.eq, data: S.src ? S.src.name : null, n: x.n, coef: x.coef, se: x.se, cov: x.cov, s: x.s, weight: x.weight, metrics: { bias: x.metrics.bias, mae: x.metrics.mae, rmse: x.metrics.rmse, r2: x.metrics.r2 }, created: R.created } };
  const r = await saveCoef(set);
  $('sv-msg').innerHTML = r.ok ? `<p class="note ok small" id="sv-ok">${T('save.ok')}</p>` : `<p class="note err small">${esc(r.problems.map(q => q.code).join(', '))}</p>`;
}
/** Observed and predicted volumes of every fitted form, one row per tree (rows not used by a form stay empty). */
function predTable() {
  const ok = R.fits.filter(x => x.status === 'ok'), head = ['row', 'tree', 'D_cm', 'H_m', 'V_obs_m3', ...ok.map(x => 'V_' + x.id + '_m3')];
  const byForm = ok.map(x => new Map(x.rows.map((r, i) => [r, x.pred[i]])));
  return [head, ...S.trees.map(t => [t.row, t.id ?? '', t.D, t.H, t.V, ...byForm.map(m => m.has(t.row) ? m.get(t.row) : null)])];
}
const treeRows = () => predTable();
function cmpRows() { return [[T('r.form'), 'eq', 'n', 'RMSE', 'bias', 'MAE', 'R2', 's', T('r.w'), T('r.cf')], ...R.fits.filter(x => x.status === 'ok').map(x => [formName(x.id), x.eq, x.n, x.metrics.rmse, x.metrics.bias, x.metrics.mae, x.metrics.r2, x.s, wText(x), cfText(x)])]; }
function coefRows() {
  const rows = [[T('r.form'), T('r.term'), T('r.est'), T('r.se')]];
  for (const x of R.fits.filter(q => q.status === 'ok')) { const F = VOL.FORMS[x.id], names = F.scale === 'log' ? ['ln ' + F.params[0], ...F.params.slice(1)] : F.params; names.forEach((n, i) => rows.push([formName(x.id), n, x.coef[i], x.se[i]])); if (F.scale === 'log') rows.push([formName(x.id), F.params[0], x.params[F.params[0]], null]); }
  return rows;
}
function infoRows() {
  return [[T('x.k'), T('x.v')], [T('x.tool'), `${VOL.TOOL.id} ${VOL.TOOL.version}`], [T('x.date'), R.created], [T('x.data'), R.src ? `${R.src.name} (${T('bark.' + (R.src.bark || 'na'))})` : ''],
    [T('x.src'), 'Kershaw, J.A., Ducey, M.J., Beers, T.W., Husch, B. 2016. Forest Mensuration, 5th ed., Wiley, §6.2'], [T('x.src'), 'Parresol, B.R. 1999. Forest Science 45: 573–593 (weights)'], [T('x.rule'), T('r.cmpnote')], [T('x.rule'), T('f.note')]];
}
/** Hand-off to Model Evaluation (store key 'handoff:model-degerlendirme', read once by that page). */
async function sendToEval() {
  const rows = predTable(), text = rows.map(r => r.map(v => v == null ? '' : String(v)).join('\t')).join('\n');
  await put('handoff:model-degerlendirme', { name: (lang === 'tr' ? 'hacim-denklemleri' : 'volume-equations') + '.tsv', text, obs: 'V_obs_m3', models: rows[0].slice(5), role: 'training', created: new Date().toISOString() });
  await flush(); location.href = 'model-degerlendirme.php';
}

/* ---------------- shell ---------------- */
function canGo(n) { if (n <= 1) return true; if (!S.trees) return false; if (n === 2) return true; return !step2Problems().length; }
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
    await loadDerived();
    const saved = await get(KEY);
    if (saved && saved.v === 1) { S = { ...blank(), ...saved, forms: { ...blank().forms, ...(saved.forms || {}) }, w: { ...blank().w, ...(saved.w || {}) }, corr: { ...blank().corr, ...(saved.corr || {}) } }; status(T('restored', { when: new Date(saved.saved).toLocaleString(LOC) })); }
    if (S.tbl && S.tbl.imp && S.tbl.imp.buf && !S.tbl.src) S.tbl.src = await readImport(S.tbl.imp, BASE).catch(() => null);
  } catch (e) { S = blank(); }
  render();
})();
