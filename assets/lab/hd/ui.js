// Height–Diameter Modelling: user interface. All arithmetic lives in calc.js (and core/nls.js, core/stats.js).
import * as H from './calc.js';
import { T } from './i18n.js';
import { lang, fmtNum, esc } from '../core/i18n.js';
import { put, get, del } from '../core/store.js';
import { cellText } from '../core/table.js';
import { detectDecimal, defaultDecimal } from '../core/num.js';
import { download, downloadCSV, xlsxBlob, loadXLSX } from '../core/export.js';
import { plotChart, scatterChart, svgForDownload } from '../core/chart.js';
import { renderImport, readImport } from '../core/importer.js';

const BASE = './', KEY = 'session:' + H.TOOL.id, LOC = lang === 'tr' ? 'tr-TR' : 'en-GB';
const $ = id => document.getElementById(id);
const f = (x, d = 4) => x == null || !Number.isFinite(x) ? '–' : fmtNum(x, d);
const num = v => { const x = parseFloat(String(v).replace(',', '.')); return Number.isFinite(x) ? x : NaN; };
const mname = id => T('m.' + id), mshort = id => { const s = T('m.short.' + id); return s === 'm.short.' + id ? mname(id) : s; };
const tick = () => new Promise(r => setTimeout(r, 0));

let S = blank(), R = null, approved = null, busy = false;
function blank() {
  return { v: 1, step: 1, tab: 'models', imp: null, src: null, dcol: null, dunit: 'cm', hcol: null, hunit: 'm', pcol: null, scol: null, sval: null,
    fcol: null, fval: null, decimal: null, decimalChosen: false, bh: '1.3', cv: null, model: null, shown: null, nd: '' };
}
let saveT = null;
function save() { clearTimeout(saveT); saveT = setTimeout(flush, 250); }
async function flush() { clearTimeout(saveT); saveT = null; await put(KEY, { ...S, saved: new Date().toISOString() }); }
$('langlink') && $('langlink').addEventListener('click', async e => { e.preventDefault(); const h = e.currentTarget.href; await flush(); location.href = h; });
function status(m, k = '') { const s = $('status'); s.className = 'status ' + k; s.textContent = m || ''; }

/* ---------------- data ---------------- */
function setTable(state) {
  const keep = { bh: S.bh };
  S = { ...blank(), ...keep, step: S.step, imp: state.imp, src: state.src };
  R = null;
  if (S.src) {
    const Hh = S.src.headers.map(h => h.toLocaleLowerCase('tr'));
    const find = names => { const i = Hh.findIndex(h => names.includes(h)); return i < 0 ? null : i; };
    S.dcol = find(['dbh', 'dbh_cm', 'cap', 'çap', 'cap_cm', 'çap_cm', 'd', 'd13']); S.hcol = find(['h', 'height', 'height_m', 'boy', 'boy_m', 'h_m']);
    S.pcol = find(['plot', 'plot_id', 'alan', 'alan_no', 'ornek_alan', 'örnek_alan']); S.scol = find(['species', 'tur', 'tür', 'sp', 'agac_turu']);
  }
  if (S.imp && S.imp.kind === 'dataset') { S.decimal = '.'; S.decimalChosen = true; }
  status(''); save(); render();
}
function datasetTable(ds) {
  const cols = [['plot_id', 's'], ['tree_id', 's'], ['period', 's'], ['species', 's'], ['dbh', 'n', 'dbh_cm'], ['height', 'n', 'height_m'], ['status', 's']];
  const cell = (v, t) => v == null ? { t: 's', v: '' } : t === 'n' ? { t: 'n', v, w: String(v) } : { t: 's', v: String(v) };
  return { kind: 'dataset', name: (ds.source && ds.source.trees && ds.source.trees.name) || 'dataset', headers: cols.map(c => c[2] || c[0]),
    rows: ds.trees.map(t => cols.map(c => cell(t[c[0]], c[1]))), rowNumbers: ds.trees.map(t => t.row), meta: {} };
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
    const buf = await (await fetch(BASE + 'assets/lab/hd/ornek/ornek-boy-cap.csv')).arrayBuffer();
    const imp = { kind: 'csv', name: lang === 'tr' ? 'ornek-boy-cap.csv (benzetim)' : 'ornek-boy-cap.csv (simulated)', buf, encoding: 'utf-8', delim: null, header: true, sheet: null };
    setTable({ imp, src: await readImport(imp, BASE) });
  });
  $('reset').addEventListener('click', async () => { S = blank(); R = null; status(''); render(); await del(KEY); });
  $('to2').addEventListener('click', () => go(2));
}

/* ---------------- settings ---------------- */
const bhValue = () => { const v = num(S.bh); return v > 0 && v < 3 ? v : null; };
/** Table after the optional filter (rows and their source row numbers kept together). */
function filtered() {
  const src = S.src;
  if (S.fcol == null || S.fval == null) return { tbl: src, nFilter: 0 };
  const keep = src.rows.map((r, i) => cellText(r[S.fcol]) === S.fval ? i : -1).filter(i => i >= 0);
  return { tbl: { ...src, rows: keep.map(i => src.rows[i]), rowNumbers: keep.map(i => src.rowNumbers[i]) }, nFilter: src.rows.length - keep.length };
}
function specOf() { return { dcol: S.dcol, hcol: S.hcol, pcol: S.pcol, scol: S.scol, sval: S.scol != null ? S.sval : null, dunit: S.dunit, hunit: S.hunit, decimal: S.decimal, bh: bhValue() }; }
function settingsProblems() {
  const p = [];
  if (S.dcol == null || S.hcol == null) p.push(T('col.need')); else if (S.dcol === S.hcol) p.push(T('col.same'));
  if (!S.decimal) p.push(T('dec.choose'));
  if (bhValue() == null) p.push(T('bh.bad'));
  return p;
}
/** Plots present among the fitting rows (for the CV choice). */
function plotCount() {
  if (S.pcol == null || S.dcol == null || S.hcol == null || !S.decimal || bhValue() == null) return 0;
  try { return H.prepare(filtered().tbl, specOf()).nPlots; } catch (e) { return 0; }
}
function renderStep2() {
  const el = $('step2'), Hd = S.src.headers;
  const opts = (sel, none = true) => (none ? `<option value="">${T('none')}</option>` : '') + Hd.map((h, i) => `<option value="${i}"${sel === i ? ' selected' : ''}>${esc(h)}</option>`).join('');
  const textOf = c => c == null ? [] : S.src.rows.map(r => r[c]).filter(x => x && x.t === 's').map(x => x.v);
  const dv = detectDecimal([...textOf(S.dcol), ...textOf(S.hcol)]);
  if (!S.decimalChosen) S.decimal = defaultDecimal(dv.verdict);
  const vals = c => [...new Set(S.src.rows.map(r => cellText(r[c]).trim()))].sort(H.natural);
  let h = `<div class="card"><h2>${T('col.h')}</h2><div class="lims">
    <label>${T('col.d')} <select id="dcol">${opts(S.dcol)}</select></label>
    <label>${T('col.dunit')} <select id="dunit">${['cm', 'mm'].map(u => `<option${S.dunit === u ? ' selected' : ''}>${u}</option>`).join('')}</select></label>
    <label>${T('col.h2')} <select id="hcol">${opts(S.hcol)}</select></label>
    <label>${T('col.hunit')} <select id="hunit">${['m', 'dm', 'cm'].map(u => `<option${S.hunit === u ? ' selected' : ''}>${u}</option>`).join('')}</select></label></div>
    <div class="lims"><label>${T('col.plot')} <select id="pcol">${opts(S.pcol)}</select></label>
    <label>${T('col.sp')} <select id="scol">${opts(S.scol)}</select></label>
    ${S.scol != null ? `<label>${T('col.spval')} <select id="sval"><option value="">${T('all')}</option>${vals(S.scol).map(v => `<option${S.sval === v ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></label>` : ''}
    <label>${T('col.filter')} <select id="fcol">${opts(S.fcol)}</select></label>
    ${S.fcol != null ? `<label>${T('col.fval')} <select id="fval"><option value="">${T('none')}</option>${vals(S.fcol).map(v => `<option${S.fval === v ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></label>` : ''}</div>
    ${S.scol != null ? `<p class="muted small">${T('col.sp.note')}</p>` : ''}</div>`;
  const dmsg = dv.verdict === 'ambiguous' ? T('dec.v.ambiguous', { ex: dv.examples.ambiguous.map(x => `"${x}"`).join(', ') }) : T('dec.v.' + dv.verdict);
  h += `<div class="card"><h2>${T('dec.h')}</h2><p class="note ${dv.verdict === 'ambiguous' || dv.verdict === 'conflict' ? 'warn' : ''}">${esc(dmsg)}</p><div class="radios">
    <label><input type="radio" name="dec" value="."${S.decimal === '.' ? ' checked' : ''}> ${T('dec.dot')}</label><label><input type="radio" name="dec" value=","${S.decimal === ',' ? ' checked' : ''}> ${T('dec.comma')}</label></div></div>`;
  h += `<div class="card"><h2>${T('bh.h')}</h2><p class="muted">${T('bh.sub')}</p><label class="field inline"><span>${T('bh.label')}</span><input type="text" inputmode="decimal" id="bh" value="${esc(S.bh)}" size="6"></label>
    ${bhValue() == null ? `<p class="note err">${T('bh.bad')}</p>` : ''}</div>`;
  const np = plotCount(), canPlot = np >= 2;
  if (S.cv == null || (S.cv === 'plot' && !canPlot)) S.cv = canPlot ? 'plot' : 'tree';
  h += `<div class="card"><h2>${T('cv.h')}</h2><div class="radios col">
    <label><input type="radio" name="cv" value="plot"${S.cv === 'plot' ? ' checked' : ''}${canPlot ? '' : ' disabled'}> ${T('cv.plot')}</label>
    <label><input type="radio" name="cv" value="tree"${S.cv === 'tree' ? ' checked' : ''}> ${T('cv.tree')}</label>
    <label><input type="radio" name="cv" value="none"${S.cv === 'none' ? ' checked' : ''}> ${T('cv.none')}</label></div>
    ${canPlot ? (np < 5 ? `<p class="note warn">${T('cv.plot.fewwarn', { n: np })}</p>` : '') : `<p class="note">${T('cv.plot.few')}</p>`}
    <p class="muted small">${T('cv.sub', { seed: H.CV_SEED, lopo: H.LOPO_MAX, k: H.CV_K })}</p></div>`;
  const pr = settingsProblems();
  h += `<div class="nav"><button type="button" class="btn ghost" id="back1">${T('back')}</button><button type="button" class="btn" id="calc"${pr.length ? ' disabled' : ''}>${T('calc')}</button>${pr.length ? `<span class="muted small">${pr.map(esc).join(' ')}</span>` : ''}</div>`;
  el.innerHTML = h;
  const re = () => { R = null; save(); renderStep2(); renderSteps(); };
  const sel = (id, k) => $(id) && $(id).addEventListener('change', e => { S[k] = e.target.value === '' ? null : +e.target.value; if (k === 'fcol') S.fval = null; if (k === 'scol') S.sval = null; re(); });
  sel('dcol', 'dcol'); sel('hcol', 'hcol'); sel('pcol', 'pcol'); sel('scol', 'scol'); sel('fcol', 'fcol');
  $('dunit').addEventListener('change', e => { S.dunit = e.target.value; re(); });
  $('hunit').addEventListener('change', e => { S.hunit = e.target.value; re(); });
  $('sval') && $('sval').addEventListener('change', e => { S.sval = e.target.value || null; re(); });
  $('fval') && $('fval').addEventListener('change', e => { S.fval = e.target.value || null; re(); });
  el.querySelectorAll('input[name="dec"]').forEach(x => x.addEventListener('change', () => { S.decimal = x.value; S.decimalChosen = true; re(); }));
  el.querySelectorAll('input[name="cv"]').forEach(x => x.addEventListener('change', () => { S.cv = x.value; re(); }));
  $('bh').addEventListener('change', e => { S.bh = e.target.value; re(); });
  $('back1').addEventListener('click', () => go(1));
  $('calc').addEventListener('click', async () => { await compute(); if (R) { S.tab = 'models'; go(3); } });
}

/* ---------------- computation (fits, then CV fold by fold so the page stays responsive) ---------------- */
async function compute() {
  if (busy) return; busy = true; $('calc') && ($('calc').disabled = true);
  try {
    status(T('busy', { what: '' }));
    await tick();
    const { tbl, nFilter } = filtered(), prep = H.prepare(tbl, specOf());
    prep.acc.filter = nFilter;
    const inference = H.inferenceAllowed(prep), fits = H.fitAll(prep, inference);
    const res = { tbl, prep, inference, fits, cv: null };
    if (S.cv !== 'none') {
      const plan = H.cvPlan(prep, S.cv === 'plot' ? 'plot' : 'tree');
      if (!plan.problem) {
        const folds = [];
        for (let k = 0; k < plan.folds.length; k++) {
          status(T('busy', { what: `${T('cv.h')} ${k + 1}/${plan.folds.length}` })); await tick();
          folds.push(H.cvFold(prep, plan.folds[k]));
        }
        res.cv = { mode: plan.mode, lopo: plan.lopo, k: plan.folds.length, sum: H.cvSummary(prep, folds) };
      } else res.cv = { problem: plan.problem };
    }
    R = res;
    if (S.model && !fits.some(fi => fi.id === S.model && fi.status === 'ok')) S.model = null;
    S.shown = fits.filter(fi => fi.status === 'ok').map(fi => fi.id);
    status('');
  } finally { busy = false; }
}

/* ---------------- results ---------------- */
const TABS = ['models', 'compare', 'charts', 'predict', 'export'];
function renderStep3() {
  if (!R) { $('step3').innerHTML = `<p class="muted">${T('busy', { what: '' })}</p>`; compute().then(() => { if (R) renderStep3(); }); return; }
  const el = $('step3');
  el.innerHTML = `<div class="tabs" role="tablist">${TABS.map(t => `<button type="button" role="tab" id="tab-${t}" aria-selected="${S.tab === t}" aria-controls="panel" data-tab="${t}">${T('tab.' + t)}</button>`).join('')}</div>
    <div class="panel"><div id="panel" role="tabpanel" aria-labelledby="tab-${S.tab}"></div></div>
    <div class="nav"><button type="button" class="btn ghost" id="back2">${T('back')}</button></div>`;
  el.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { S.tab = b.dataset.tab; save(); renderStep3(); }));
  el.querySelector('.tabs').addEventListener('keydown', e => {
    const i = TABS.indexOf(S.tab), d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return; S.tab = TABS[(i + d + TABS.length) % TABS.length]; renderStep3(); $('tab-' + S.tab).focus();
  });
  $('back2').addEventListener('click', () => go(2));
  ({ models: tabModels, compare: tabCompare, charts: tabCharts, predict: tabPredict, export: tabExport })[S.tab]($('panel'));
}
const okFits = () => R.fits.filter(fi => fi.status === 'ok');
const selFit = () => R.fits.find(fi => fi.id === S.model && fi.status === 'ok') || null;
function dataNotes() {
  const p = R.prep;
  let h = `<p class="small">${T('data.sum', { n: p.fitRows.length, dmin: f(p.dmin, 1), dmax: f(p.dmax, 1), plots: p.hasPlot ? p.nPlots : 0, missing: p.acc.missing })}</p>`;
  const a = p.acc; if (a.dEmpty || a.dBad || a.dNonpos || a.hBad || a.hLeBh || a.species || a.filter) h += `<p class="small muted">${T('data.exc', a)}</p>`;
  h += `<p class="statement">${!p.hasPlot ? T('inf.noplot') : p.nPlots > 1 ? T('inf.multi', { n: p.nPlots }) : T('inf.one')}</p>`;
  return h;
}
function statusText(fi) {
  const m = H.modelById(fi.id);
  if (fi.status === 'ok') return T('s.ok');
  const why = { toofew: T('sx.toofew', { k: m.p + 2, u: m.p + 1 }), nostart: T('sx.nostart'), noconverge: T('sx.noconverge'), diverged: T('sx.diverged', { k: H.DIVERGE_FACTOR }), invalid: T('sx.invalid') }[fi.status];
  return `${T('s.' + fi.status)}: ${why}`;
}
function warnText(fi) {
  return fi.warn.map(w => w.code === 'sign' ? T('w.sign', { params: w.params.join(', ') }) : w.code === 'singular' ? T('w.singular') : T('w.corr', { a: w.pair[0], b: w.pair[1], r: f(w.r, 3) }));
}
function tabModels(p) {
  let h = dataNotes();
  h += `<div class="tscroll"><table class="grid" id="ptab"><thead><tr><th>${T('p.model')}</th><th>${T('p.formula')}</th><th>${T('p.status')}</th><th>a</th><th>b</th><th>c</th><th>${T('p.asym')}</th><th>${T('p.iter')}</th></tr></thead><tbody>`;
  for (const fi of R.fits) {
    const m = H.modelById(fi.id), ok = fi.status === 'ok';
    const cell = j => {
      if (j >= m.p) return '<td class="undef">–</td>';
      if (!ok) return '<td class="undef">–</td>';
      let c = `<b>${f(fi.theta[j], 6)}</b>`;
      if (fi.se) c += `<br><span class="kind">${T('p.se')} ${f(fi.se[j], 6)}</span><br><span class="kind nowrap">[${f(fi.ci[j][0], 5)}; ${f(fi.ci[j][1], 5)}]</span>`;
      return `<td class="num">${c}</td>`;
    };
    const w = ok ? warnText(fi) : [];
    h += `<tr data-model="${fi.id}"><th>${esc(mname(fi.id))}<br><span class="kind">${esc(T('src.' + fi.id))}</span></th><td class="nowrap"><code>${esc(m.formula)}</code></td>
      <td class="${ok ? '' : 'undef'}">${esc(statusText(fi))}${w.length ? `<br><span class="note warn small">${w.map(esc).join(' ')}</span>` : ''}</td>
      ${[0, 1, 2].map(cell).join('')}<td class="num">${ok && fi.asym != null ? f(R.prep.bh + fi.asym, 3) : '–'}</td><td class="num">${fi.iter ?? '–'}</td></tr>`;
  }
  h += '</tbody></table></div>';
  if (R.inference) h += `<p class="muted small">${T('p.ci')}: ${T('p.est')} ± t(0.975; n − p) × ${T('p.se')}.</p>`;
  p.innerHTML = h + `<p class="muted small">${T('src.note')}</p>`;
}
function tabCompare(p) {
  const ok = okFits(), minAic = ok.length ? Math.min(...ok.map(fi => fi.aicValue)) : null;
  let h = `<h3>${T('c.fit.h')}</h3><div class="tscroll"><table class="grid" id="ctab"><thead><tr><th>${T('p.model')}</th><th>${T('p.n')}</th><th>${T('p.p')}</th><th>${T('c.rmse')}</th><th>${T('c.mae')}</th><th>${T('c.bias')}</th><th>${T('c.sigma')}</th>
    ${R.inference ? `<th>${T('c.ll')}</th><th>${T('c.aic')}</th><th>${T('c.daic')}</th><th>${T('c.bic')}</th>` : ''}</tr></thead><tbody>`;
  for (const fi of R.fits) {
    if (fi.status !== 'ok') { h += `<tr><th>${esc(mname(fi.id))}</th><td class="undef" colspan="${R.inference ? 10 : 6}">${esc(statusText(fi))}</td></tr>`; continue; }
    h += `<tr data-model="${fi.id}"><th>${esc(mname(fi.id))}</th><td class="num">${fi.n}</td><td class="num">${fi.p}</td><td class="num">${f(fi.rmse)}</td><td class="num">${f(fi.mae)}</td><td class="num">${f(fi.bias)}</td><td class="num">${f(fi.sigma)}</td>
      ${R.inference ? `<td class="num">${f(fi.logLik, 3)}</td><td class="num">${f(fi.aicValue, 3)}</td><td class="num">${f(fi.aicValue - minAic, 3)}</td><td class="num">${f(fi.bicValue, 3)}</td>` : ''}</tr>`;
  }
  h += `</tbody></table></div><p class="muted small">${T('c.fit.note')}</p><p class="muted small">${R.inference ? T('c.aic.note') : T('c.aic.off')}</p>`;
  h += `<h3>${T('c.cv.h')}</h3>`;
  const cv = R.cv;
  if (!cv) h += `<p class="muted">${T('c.cv.none')}</p>`;
  else if (cv.problem) h += `<p class="note">${T(cv.problem)}</p>`;
  else {
    const s = cv.sum;
    h += `<p class="note">${T('c.cv.kind.' + cv.mode, { k: cv.k, lopo: cv.lopo })}</p><p class="small">${T('c.cv.same', { n: s.nTest })}</p>`;
    if (s.dropped.length) h += `<p class="note warn">${T('c.cv.dropped', { list: s.dropped.join(', ') })}</p>`;
    if (s.nOutside) h += `<p class="small muted">${T('c.cv.out', { n: s.nOutside })}</p>`;
    h += `<div class="tscroll"><table class="grid" id="cvtab"><thead><tr><th>${T('p.model')}</th><th>${T('c.rmse')}</th><th>${T('c.mae')}</th><th>${T('c.bias')}</th><th>${T('c.cv.chosen')}</th></tr></thead><tbody>
      ${H.MODELS.map((m, k) => `<tr data-model="${m.id}"><th>${esc(mname(m.id))}</th><td class="num">${f(s.models[k].rmse)}</td><td class="num">${f(s.models[k].mae)}</td><td class="num">${f(s.models[k].bias)}</td><td class="num">${s.chosen[k]}</td></tr>`).join('')}
      <tr class="tail" id="cvsel"><th>${T('c.cv.sel')}</th><td class="num">${f(s.selection.rmse)}</td><td class="num">${f(s.selection.mae)}</td><td class="num">${f(s.selection.bias)}</td><td class="num">${s.chosen.reduce((a, b) => a + b, 0)}</td></tr></tbody></table></div>
      <p class="muted small">${T('c.cv.sel.note')}</p>
      <details><summary>${T('c.cv.folds')} (${s.nFolds})</summary><div class="tscroll"><table class="grid"><thead><tr><th>${T('c.cv.fold')}</th><th>${T('c.cv.ntr')}</th><th>${T('c.cv.nte')}</th><th>${T('c.cv.nout')}</th>${H.MODELS.map(m => `<th>${esc(mshort(m.id))} RMSE</th>`).join('')}<th>${T('c.cv.selm')}</th></tr></thead><tbody>
      ${s.perFold.map(fo => `<tr><th>${esc(fo.label)}</th><td class="num">${fo.nTrain}</td><td class="num">${fo.nTest}</td><td class="num">${fo.nOutside}</td>${fo.rmse.map((r, k) => r == null ? `<td class="undef">${esc(T('s.' + fo.status[k]))}</td>` : `<td class="num">${f(r)}</td>`).join('')}<td>${fo.sel >= 0 ? esc(mshort(H.MODELS[fo.sel].id)) : '–'}</td></tr>`).join('')}</tbody></table></div></details>`;
  }
  p.innerHTML = h;
}
function modelPicker() {
  const ok = okFits();
  return `<label class="field inline"><span>${T('ch.pick')}</span><select id="msel"><option value="">${T('ch.pick.none')}</option>${ok.map(fi => `<option value="${fi.id}"${S.model === fi.id ? ' selected' : ''}>${esc(mname(fi.id))}</option>`).join('')}</select></label>`;
}
function bindPicker(p, fn) { $('msel').addEventListener('change', e => { S.model = e.target.value || null; save(); fn(p); }); }
function tabCharts(p) {
  const ok = okFits(), prep = R.prep, bh = prep.bh, sf = selFit();
  let h = modelPicker();
  if (!S.shown) S.shown = ok.map(fi => fi.id);
  h += `<p class="small">${T('ch.models')}: ${ok.map(fi => `<label class="chk"><input type="checkbox" data-show="${fi.id}"${S.shown.includes(fi.id) ? ' checked' : ''}> ${esc(mshort(fi.id))}</label>`).join(' ')}</p>`;
  const xs = Array.from({ length: 201 }, (_, i) => prep.dmin + (prep.dmax - prep.dmin) * i / 200);
  const lines = ok.filter(fi => S.shown.includes(fi.id)).map(fi => ({ name: mshort(fi.id), k: H.MODELS.findIndex(m => m.id === fi.id), pts: xs.map(x => [x, H.predict(fi, x, bh)]) }));
  if (sf && sf.V) {
    const iv = xs.map(x => H.intervals(sf, x, bh)), k = H.MODELS.findIndex(m => m.id === sf.id);
    lines.push({ k, dash: true, pts: xs.map((x, i) => [x, iv[i].ci[0]]) }, { k, dash: true, pts: xs.map((x, i) => [x, iv[i].ci[1]]) },
      { k, dot: true, pts: xs.map((x, i) => [x, iv[i].pi[0]]) }, { k, dot: true, pts: xs.map((x, i) => [x, iv[i].pi[1]]) });
  }
  const pts = prep.fitRows.map(r => [r.d, r.h]), fm = v => fmtNum(v, 2), xpad = (prep.dmax - prep.dmin) * 0.03;
  h += `<figure class="chartbox" id="ch-data">${plotChart({ title: T('ch.data', { n: pts.length }), xmin: Math.max(0, prep.dmin - xpad), xmax: prep.dmax + xpad, points: pts, lines, xLabel: T('ch.d'), yLabel: T('ch.h'), fmt: fm, width: 760, height: 440 })}
    <figcaption><span class="muted small">${T('ch.range')}${sf && sf.V ? ' ' + T('ch.bands') : ''}</span> <button type="button" class="btn ghost small" data-svg="ch-data" data-name="boy-cap">${T('ch.svg')}</button></figcaption></figure>`;
  if (!sf) h += `<p class="note">${T('ch.need')}</p>`;
  else {
    const res = H.residuals(prep, sf), mn = mname(sf.id);
    h += `<div class="charts2"><figure class="chartbox" id="ch-rf">${scatterChart({ title: T('ch.resfit', { m: mn }), points: res.map(r => [r.fit, r.e]), hline: 0, xLabel: T('ch.fit'), yLabel: T('ch.e'), fmt: fm })}
      <figcaption><button type="button" class="btn ghost small" data-svg="ch-rf" data-name="artik-tahmin">${T('ch.svg')}</button></figcaption></figure>
      <figure class="chartbox" id="ch-rd">${scatterChart({ title: T('ch.resd', { m: mn }), points: res.map(r => [r.d, r.e]), hline: 0, xLabel: T('ch.d'), yLabel: T('ch.e'), fmt: fm })}
      <figcaption><button type="button" class="btn ghost small" data-svg="ch-rd" data-name="artik-cap">${T('ch.svg')}</button></figcaption></figure></div>`;
    const sp = H.spreadByThirds(res);
    h += `<h3>${T('ch.spread.h')}</h3><div class="tscroll"><table class="grid"><thead><tr><th>${T('ch.spread.part')}</th><th>${T('ch.fit')}</th><th>n</th><th>${T('ch.spread.sd')}</th></tr></thead><tbody>
      ${sp.map((s, i) => s ? `<tr><th>${i + 1}</th><td class="num nowrap">${f(s.lo, 2)}–${f(s.hi, 2)}</td><td class="num">${s.n}</td><td class="num">${f(s.sd)}</td></tr>` : '').join('')}</tbody></table></div><p class="muted small">${T('ch.spread.note')}</p>`;
    if (prep.hasPlot && prep.nPlots > 1) {
      const bp = H.byPlot(res);
      h += `<h3>${T('ch.plot.h')}</h3><div class="tscroll"><table class="grid" id="bytab"><thead><tr><th>${T('pr.plot')}</th><th>n</th><th>${T('c.bias')}</th><th>${T('c.rmse')}</th></tr></thead><tbody>
        ${bp.map(b => `<tr><th>${esc(b.plot)}</th><td class="num">${b.n}</td><td class="num">${f(b.bias)}</td><td class="num">${f(b.rmse)}</td></tr>`).join('')}</tbody></table></div><p class="muted small">${T('ch.plot.note')}</p>`;
    }
  }
  p.innerHTML = h;
  bindPicker(p, tabCharts);
  p.querySelectorAll('[data-show]').forEach(x => x.addEventListener('change', () => { const id = x.dataset.show; S.shown = x.checked ? [...S.shown, id] : S.shown.filter(i => i !== id); save(); tabCharts(p); }));
  p.querySelectorAll('[data-svg]').forEach(b => b.addEventListener('click', () => download(b.dataset.name + '.svg', svgForDownload($(b.dataset.svg).querySelector('svg')), 'image/svg+xml')));
}
const SHOW = 200;
function tabPredict(p) {
  const sf = selFit(), prep = R.prep;
  let h = modelPicker();
  if (!sf) { p.innerHTML = h + `<p class="note">${T('ch.need')}</p>`; bindPicker(p, tabPredict); return; }
  const pm = H.predictMissing(prep, sf);
  h += `<h3>${T('pr.h')}</h3>`;
  if (!pm.length) h += `<p class="muted">${T('pr.nomissing')}</p>`;
  else {
    h += `<p class="small">${T('pr.sum', { n: pm.length, out: pm.filter(x => x.outside).length, dmin: f(prep.dmin, 1), dmax: f(prep.dmax, 1) })}</p><p class="muted small">${T('pr.sep')}</p>
      <div class="tscroll"><table class="grid" id="mtab"><thead><tr><th>${T('pr.row')}</th><th>${T('pr.plot')}</th><th>${T('pr.sp')}</th><th>${T('pr.d')}</th><th>${T('pr.hhat')}</th><th>${T('pr.flag')}</th></tr></thead><tbody>
      ${pm.slice(0, SHOW).map(x => `<tr${x.outside ? ' class="tail"' : ''}><td class="rn">${x.row.rowNo}</td><td>${esc(x.row.plot)}</td><td>${esc(x.row.species)}</td><td class="num">${f(x.row.d, 2)}</td><td class="num">${f(x.h, 2)}</td><td>${x.outside ? `<span class="sev sev-warning"><i></i>${T('pr.outside')}</span>` : T('pr.inside')}</td></tr>`).join('')}</tbody></table></div>
      ${pm.length > SHOW ? `<p class="muted small">${T('pr.more', { k: SHOW })}</p>` : ''}`;
  }
  h += `<h3>${T('nd.h')}</h3><p class="muted small">${T('nd.sub', { unit: S.dunit })}</p><textarea id="nd" rows="3" spellcheck="false">${esc(S.nd)}</textarea><div id="ndout"></div>`;
  p.innerHTML = h;
  bindPicker(p, tabPredict);
  $('nd').addEventListener('input', e => { S.nd = e.target.value; save(); updateNd(); });
  updateNd();
}
function ndRows() {
  const sf = selFit(); if (!sf || !String(S.nd).trim()) return null;
  const { d, bad } = H.parseDiameters(S.nd, S.decimal, S.dunit), others = okFits().filter(fi => fi.id !== sf.id);
  return { sf, others, bad, rows: d.map(x => ({ d: x, ...H.intervals(sf, x, R.prep.bh), outside: H.outside(R.prep, x), oth: others.map(fi => H.predict(fi, x, R.prep.bh)) })) };
}
/** Only the output under the text box is redrawn, so typing keeps focus. */
function updateNd() {
  const out = $('ndout'), r = ndRows(); if (!out) return;
  if (!r) { out.innerHTML = ''; return; }
  const iv = !!r.sf.V;
  let h = r.bad.length ? `<p class="note warn">${T('nd.bad', { list: r.bad.map(esc).join(', ') })}</p>` : '';
  h += `<div class="tscroll"><table class="grid" id="ndtab"><thead><tr><th>${T('pr.d')}</th><th>${T('pr.hhat')} (${esc(mname(r.sf.id))})</th>
    ${iv ? `<th>${T('nd.ci')}</th><th>${T('nd.pi')}</th>` : ''}<th>${T('pr.flag')}</th>${r.others.map(fi => `<th>${esc(mshort(fi.id))}</th>`).join('')}</tr></thead><tbody>
    ${r.rows.map(x => `<tr${x.outside ? ' class="tail"' : ''}><td class="num">${f(x.d, 2)}</td><td class="num"><b>${f(x.yhat, 3)}</b></td>
      ${iv ? `<td class="num nowrap">${f(x.ci[0], 3)} – ${f(x.ci[1], 3)}</td><td class="num nowrap">${f(x.pi[0], 3)} – ${f(x.pi[1], 3)}</td>` : ''}
      <td>${x.outside ? `<span class="sev sev-warning"><i></i>${T('pr.outside')}</span>` : T('pr.inside')}</td>${x.oth.map(v => `<td class="num">${f(v, 3)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  h += `<p class="muted small">${iv ? T('nd.defs') : T('nd.noint')}</p>`;
  out.innerHTML = h;
}

/* ---------------- exports ---------------- */
const fname = (a, b) => `${lang === 'tr' ? a : b}-${new Date().toISOString().slice(0, 10)}`;
function treeRows() {
  const sf = selFit(), prep = R.prep, tbl = R.tbl;
  const out = [[T('t.row'), T('t.plot'), T('t.sp'), T('t.dsrc'), T('t.d'), T('t.hsrc'), T('t.h'), T('t.state'), T('t.hhat'), T('t.model'), T('t.out'), T('t.fitv'), T('t.e')]];
  for (const r of prep.rows) {
    const src = tbl.rows[r.i], st = r.fit ? 'fit' : r.missing ? 'missing' : r.dStatus === 'nonpos' ? 'dnonpos' : r.dStatus !== 'ok' ? 'dbad' : r.hStatus === 'lebh' ? 'lebh' : 'hbad';
    const hMeas = r.hStatus === 'ok' || r.hStatus === 'lebh' ? r.h : null;
    let hhat = null, model = null, outF = null, fitv = null, e = null;
    if (sf && r.missing) { hhat = H.predict(sf, r.d, prep.bh); model = mname(sf.id); outF = H.outside(prep, r.d) ? T('yes') : T('no'); }
    if (sf && r.fit) { fitv = H.predict(sf, r.d, prep.bh); e = fitv - r.h; model = mname(sf.id); }
    out.push([r.rowNo, r.plot, r.species, cellText(src[S.dcol]), r.dStatus === 'ok' ? r.d : null, cellText(src[S.hcol]), hMeas, T('st.' + st), hhat, model, outF, fitv, e]);
  }
  return out;
}
function paramRows() {
  const out = [[T('p.model'), T('p.formula'), T('p.status'), T('p.param'), T('p.est'), T('p.se'), `${T('p.ci')} ${T('nd.lo')}`, `${T('p.ci')} ${T('nd.hi')}`, 'n', 'p', T('c.rmse'), T('c.mae'), T('c.bias'), T('c.sigma'), T('c.aic'), T('c.bic'), T('p.iter'), T('p.src')]];
  for (const fi of R.fits) {
    const m = H.modelById(fi.id);
    if (fi.status !== 'ok') { out.push([mname(fi.id), m.formula, statusText(fi), null, null, null, null, null, fi.n, m.p, null, null, null, null, null, null, fi.iter ?? null, T('src.' + fi.id)]); continue; }
    m.names.forEach((nm, j) => out.push([mname(fi.id), m.formula, statusText(fi), nm, fi.theta[j], fi.se ? fi.se[j] : null, fi.ci ? fi.ci[j][0] : null, fi.ci ? fi.ci[j][1] : null, fi.n, m.p,
      fi.rmse, fi.mae, fi.bias, fi.sigma, R.inference ? fi.aicValue : null, R.inference ? fi.bicValue : null, fi.iter, T('src.' + fi.id)]));
  }
  return out;
}
function cvRows() {
  const cv = R.cv; if (!cv || cv.problem) return [[T('c.cv.none')]];
  const s = cv.sum, out = [[T('c.cv.fold'), T('c.cv.ntr'), T('c.cv.nte'), T('c.cv.nout'), ...H.MODELS.map(m => `${mshort(m.id)} RMSE`), T('c.cv.selm')]];
  for (const fo of s.perFold) out.push([fo.label, fo.nTrain, fo.nTest, fo.nOutside, ...fo.rmse, fo.sel >= 0 ? mshort(H.MODELS[fo.sel].id) : null]);
  out.push([]); out.push([T('p.model'), T('c.rmse'), T('c.mae'), T('c.bias'), T('c.cv.chosen')]);
  H.MODELS.forEach((m, k) => out.push([mname(m.id), s.models[k].rmse, s.models[k].mae, s.models[k].bias, s.chosen[k]]));
  out.push([T('c.cv.sel'), s.selection.rmse, s.selection.mae, s.selection.bias, null]);
  return out;
}
function ndExport() {
  const r = ndRows(); if (!r) return null;
  const out = [[T('pr.d'), `${T('pr.hhat')} ${mname(r.sf.id)}`, `${T('nd.ci')} ${T('nd.lo')}`, `${T('nd.ci')} ${T('nd.hi')}`, `${T('nd.pi')} ${T('nd.lo')}`, `${T('nd.pi')} ${T('nd.hi')}`, T('t.out'), ...r.others.map(fi => mshort(fi.id))]];
  for (const x of r.rows) out.push([x.d, x.yhat, x.ci ? x.ci[0] : null, x.ci ? x.ci[1] : null, x.pi ? x.pi[0] : null, x.pi ? x.pi[1] : null, x.outside ? T('yes') : T('no'), ...x.oth]);
  return out;
}
function infoRows() {
  const p = R.prep, sf = selFit();
  return [[T('x.k'), T('x.v')], [T('x.tool'), `${H.TOOL.id} ${H.TOOL.version}`], [T('x.date'), new Date().toISOString()], [T('x.src'), S.imp ? S.imp.name : ''],
    [T('col.d'), `${S.src.headers[S.dcol]} (${S.dunit})`], [T('col.h2'), `${S.src.headers[S.hcol]} (${S.hunit})`], [T('x.units'), 'd cm, h m'], [T('x.bh'), p.bh],
    [T('col.plot'), S.pcol != null ? S.src.headers[S.pcol] : '–'], [T('x.spf'), S.scol != null ? `${S.src.headers[S.scol]}: ${S.sval ?? T('all')}` : '–'], [T('x.filter'), S.fcol != null ? `${S.src.headers[S.fcol]} = ${S.fval ?? '–'}` : '–'],
    [T('x.cv'), !R.cv ? T('cv.none') : R.cv.problem ? T(R.cv.problem) : T('c.cv.kind.' + R.cv.mode, { k: R.cv.k, lopo: R.cv.lopo })], [T('x.model'), sf ? mname(sf.id) : '–'],
    ['', T('data.sum', { n: p.fitRows.length, dmin: p.dmin, dmax: p.dmax, plots: p.hasPlot ? p.nPlots : 0, missing: p.acc.missing })], ['', T('data.exc', p.acc)],
    ['', !p.hasPlot ? T('inf.noplot') : p.nPlots > 1 ? T('inf.multi', { n: p.nPlots }) : T('inf.one')], ['', T('c.fit.note')], ['', R.inference ? T('c.aic.note') : T('c.aic.off')],
    ['', R.inference ? T('nd.defs') : T('nd.noint')], ['', T('pr.sep')], ['', T('src.note')]];
}
function tabExport(p) {
  const nd = ndExport();
  p.innerHTML = `${selFit() ? '' : `<p class="note warn">${T('ex.nomodel')}</p>`}<div class="exports"><button type="button" class="btn" id="x-xlsx">${T('ex.xlsx')}</button>
    <button type="button" class="btn ghost" id="x-t">${T('ex.trees')}</button><button type="button" class="btn ghost" id="x-p">${T('ex.params')}</button>
    ${R.cv && !R.cv.problem ? `<button type="button" class="btn ghost" id="x-cv">${T('ex.cv')}</button>` : ''}${nd ? `<button type="button" class="btn ghost" id="x-nd">${T('ex.nd')}</button>` : ''}</div><p class="muted small">${T('ex.note')}</p>`;
  $('x-t').addEventListener('click', () => downloadCSV(fname('boy-cap-agaclar', 'height-diameter-trees') + '.csv', treeRows(), lang));
  $('x-p').addEventListener('click', () => downloadCSV(fname('boy-cap-parametreler', 'height-diameter-parameters') + '.csv', paramRows(), lang));
  $('x-cv') && $('x-cv').addEventListener('click', () => downloadCSV(fname('boy-cap-capraz-dogrulama', 'height-diameter-cv') + '.csv', cvRows(), lang));
  $('x-nd') && $('x-nd').addEventListener('click', () => downloadCSV(fname('boy-cap-yeni-caplar', 'height-diameter-new') + '.csv', ndExport(), lang));
  $('x-xlsx').addEventListener('click', async () => {
    let XLSX; try { XLSX = await loadXLSX(BASE); } catch (e) { status('XLSX', 'err'); return; }
    const sheets = [{ name: T('sheet.info'), rows: infoRows(), widths: [26, 110] }, { name: T('sheet.params'), rows: paramRows() }, { name: T('sheet.cv'), rows: cvRows() }, { name: T('sheet.trees'), rows: treeRows() }];
    const n2 = ndExport(); if (n2) sheets.push({ name: T('sheet.nd'), rows: n2 });
    download(fname('boy-cap', 'height-diameter') + '.xlsx', xlsxBlob(XLSX, sheets));
  });
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
  render();
})();
