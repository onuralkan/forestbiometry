// Growth function fitter: user interface. All arithmetic lives in calc.js.
import * as G from './calc.js';
import { T } from './i18n.js';
import { lang, fmtNum, esc } from '../core/i18n.js';
import { put, get, del } from '../core/store.js';
import { cellText } from '../core/table.js';
import { parseNumber, detectDecimal, defaultDecimal } from '../core/num.js';
import { download, downloadCSV, xlsxBlob, loadXLSX } from '../core/export.js';
import { downloadRecord, recordOption } from '../core/record-ui.js';
import { plotChart, scatterChart, svgForDownload } from '../core/chart.js';
import { renderImport, readImport } from '../core/importer.js';
import { saveCoef } from '../core/coef.js';
import { buildR } from './rcode.js';
import { tableCsv, csvName } from '../core/rcode.js';

const BASE = './', KEY = 'session:' + G.TOOL.id, LOC = lang === 'tr' ? 'tr-TR' : 'en-GB';
const $ = id => document.getElementById(id);
const f = (x, d = 3) => x == null || !Number.isFinite(x) ? '–' : fmtNum(x, d);
const num = v => { const t = String(v ?? '').trim(); if (!t) return null; const x = Number(t.replace(',', '.')); return Number.isFinite(x) ? x : NaN; };
const GUESS = { series: ['seri', 'series', 'agac', 'ağaç', 'tree', 'id'], t: ['yas', 'yaş', 'age', 't', 'a'], y: ['boy', 'boy_m', 'h', 'height', 'cap', 'çap', 'd', 'dbh', 'hacim', 'v', 'y'] };

let S = blank(), R = null;
function blank() { return { v: 1, step: 1, imp: null, src: null, map: { series: null, t: null, y: null }, decimal: null, decimalChosen: false, variable: '', unit: '', forms: Object.fromEntries(G.FORM_IDS.map(id => [id, true])), sel: 'cr', cit: '', step3: '5' }; }
let saveT = null;
function save() { clearTimeout(saveT); saveT = setTimeout(flush, 250); }
async function flush() { clearTimeout(saveT); saveT = null; await put(KEY, { ...S, saved: new Date().toISOString() }); }
addEventListener('pagehide', () => { if (saveT) flush(); });   // a pending save is written when the page goes away
$('langlink') && $('langlink').addEventListener('click', async e => { e.preventDefault(); const h = e.currentTarget.href; await flush(); location.href = h; });
function status(m, k = '') { const s = $('status'); s.className = 'status ' + k; s.textContent = m || ''; }
const reading = () => S.src && S.map.t != null && S.map.y != null ? G.readSeries(S.src, S.map, S.decimal, parseNumber, cellText) : null;

/* ---------------- step 1: data ---------------- */
function setTable(st) {
  S.imp = st.imp; S.src = st.src; S.decimalChosen = false; R = null;
  S.map = { series: null, t: null, y: null };
  if (S.src) { const H = S.src.headers.map(h => String(h).toLocaleLowerCase('tr').trim()); for (const [k, names] of Object.entries(GUESS)) { const i = H.findIndex(h => names.includes(h)); if (i >= 0 && !Object.values(S.map).includes(i)) S.map[k] = i; } if (!S.variable && S.map.y != null) S.variable = S.src.headers[S.map.y]; }
  status(''); save(); renderStep1(); renderSteps();
}
function renderStep1() {
  const el = $('step1');
  let h = `<div id="impbox"></div>`;
  if (!S.src) h += `<div class="card sample"><button type="button" class="btn ghost" id="sample">${T('d.sample')}</button><span class="muted small">${T('d.sample.note')}</span></div>`;
  else {
    const opts = sel => `<option value="">${T('none')}</option>` + S.src.headers.map((x, i) => `<option value="${i}"${sel === i ? ' selected' : ''}>${esc(x)}</option>`).join('');
    if (!S.decimalChosen) S.decimal = defaultDecimal(detectDecimal([S.map.t, S.map.y].filter(c => c != null).flatMap(c => S.src.rows.map(r => r[c]).filter(x => x && x.t === 's').map(x => x.v))).verdict);
    const rd = reading();
    h += `<div class="card"><h2>${T('d.h')}</h2><p class="muted small">${T('d.sub')}</p>
      <div class="lims">${['series', 't', 'y'].map(k => `<label>${T('d.col.' + k)} <select id="m-${k}">${opts(S.map[k])}</select></label>`).join('')}</div>
      <div class="lims"><label>${T('d.var')} <input type="text" size="12" id="d-var" value="${esc(S.variable)}"></label><label>${T('d.unit')} <input type="text" size="6" id="d-unit" value="${esc(S.unit)}"></label>
        <span class="radios"><span class="small">${T('d.dec')}:</span> ${['.', ','].map(v => `<label class="small"><input type="radio" name="dec" value="${v}"${S.decimal === v ? ' checked' : ''}> ${T(v === '.' ? 'd.dec.dot' : 'd.dec.comma')}</label>`).join('')}</span></div>
      ${rd ? `<p class="note ok small" id="dread">${esc(T('d.read', { n: rd.obs.length, s: new Set(rd.obs.map(o => o.series).filter(Boolean)).size }))}</p>${rd.problems.length ? `<p class="note warn small" id="dprob">${esc(T('d.prob', { n: rd.problems.length, rows: rd.problems.slice(0, 20).map(q => q.row).join(', ') }))}</p>` : ''}` : ''}</div>`;
  }
  const ready = reading() && reading().obs.length > 0;
  h += `<div class="nav"><button type="button" class="btn ghost" id="reset">${T('reset')}</button><button type="button" class="btn" id="to2"${ready ? '' : ' disabled'}>${T('next')}</button>${ready ? '' : `<span class="muted small">${T('d.need')}</span>`}</div>`;
  el.innerHTML = h;
  renderImport($('impbox'), { imp: S.imp, src: S.src }, { base: BASE, title: T('d.h'), onChange: setTable, onError: m => status(m, 'err') });
  $('sample') && $('sample').addEventListener('click', async () => {
    const buf = await (await fetch(BASE + 'assets/lab/growth/ornek/ornek-buyume.csv')).arrayBuffer();
    const imp = { kind: 'csv', name: lang === 'tr' ? 'ornek-buyume.csv (benzetim)' : 'ornek-buyume.csv (simulated)', buf, encoding: 'utf-8', delim: null, header: true, sheet: null };
    S.variable = lang === 'tr' ? 'boy' : 'height'; S.unit = 'm'; setTable({ imp, src: await readImport(imp, BASE) });
  });
  if (S.src) {
    for (const k of ['series', 't', 'y']) $('m-' + k).addEventListener('change', e => { S.map[k] = e.target.value === '' ? null : +e.target.value; R = null; save(); renderStep1(); renderSteps(); });
    $('d-var').addEventListener('change', e => { S.variable = e.target.value; save(); });
    $('d-unit').addEventListener('change', e => { S.unit = e.target.value; save(); });
    el.querySelectorAll('input[name="dec"]').forEach(x => x.addEventListener('change', () => { S.decimal = x.value; S.decimalChosen = true; R = null; save(); renderStep1(); renderSteps(); }));
  }
  $('reset').addEventListener('click', async () => { S = blank(); R = null; status(''); await del(KEY); render(); });
  $('to2').addEventListener('click', () => go(2));
}

/* ---------------- step 2: models ---------------- */
const chosen = () => G.FORM_IDS.filter(id => S.forms[id]);
function renderStep2() {
  const el = $('step2');
  el.innerHTML = `<div class="card"><h2>${T('m.h')}</h2><div class="radios col">${G.FORM_IDS.map(id => { const F = G.FORMS[id];
      return `<label><input type="checkbox" data-form="${id}"${S.forms[id] ? ' checked' : ''}> <b>${esc(F.name)}</b> <span class="small">${esc(F.formula)}</span> <span class="muted small">(${T('m.src.' + F.status)})</span></label>`; }).join('')}</div>
    <p class="muted small">${T('m.note')}</p><p class="muted small">${T('m.korf')}</p></div>
    <div class="nav"><button type="button" class="btn ghost" id="back1">${T('back')}</button><button type="button" class="btn" id="calc"${chosen().length ? '' : ' disabled'}>${T('calc')}</button>${chosen().length ? '' : `<span class="muted small">${T('m.need')}</span>`}</div>`;
  el.querySelectorAll('[data-form]').forEach(x => x.addEventListener('change', () => { S.forms[x.dataset.form] = x.checked; R = null; save(); renderStep2(); renderSteps(); }));
  $('back1').addEventListener('click', () => go(1));
  $('calc').addEventListener('click', () => { compute(); go(3); });
}

/* ---------------- step 3: results ---------------- */
function compute() {
  const rd = reading(), obs = rd ? rd.obs : [], tMax = Math.max(...obs.map(o => o.t));
  R = { created: new Date().toISOString(), n: obs.length, tMax, obs, fits: chosen().map(id => { const r = G.fitGrowth(obs, id); return { ...r, derived: r.status === 'ok' ? G.derived(id, r.theta, tMax) : null }; }) };
  const b = R.fits.filter(q => q.status === 'ok').sort((a, b) => a.aic - b.aic)[0]; S.sel = b ? b.form : chosen()[0];   // a new fit shows the smallest AIC first
  save();
}
const unitTxt = () => S.unit ? ` (${S.unit})` : '';
function renderStep3() {
  const el = $('step3'); if (!R) compute();
  const okFits = R.fits.filter(q => q.status === 'ok'), best = okFits.length ? Math.min(...okFits.map(q => q.aic)) : null;
  let h = `<div class="card"><h2>${T('r.h')}</h2><div class="tscroll"><table class="grid" id="ctab"><thead><tr><th>${T('r.model')}</th><th>${T('r.status')}</th><th>${T('r.params')}</th><th>${T('r.rmse')}</th><th>${T('r.bias')}</th><th>${T('r.rse')}</th><th>${T('r.aic')}</th><th>${T('r.asym')}</th><th>${T('r.infl')}</th><th>${T('r.mai')}</th></tr></thead><tbody>`;
  for (const q of R.fits) {
    const F = G.FORMS[q.form], d = q.derived;
    h += `<tr data-form="${q.form}"${q.form === S.sel ? ' class="sel"' : ''}><td><button type="button" class="linkbtn" data-sel="${q.form}">${esc(F.name)}</button></td><td>${T('r.status.' + q.status)}</td>
      <td class="small">${q.params ? F.params.map(k => `${k} = ${f(q.params[k], 5)}${q.se ? ` (${f(q.se[k], 4)})` : ''}`).join('<br>') : '–'}</td>
      <td class="num">${f(q.rmse, 3)}</td><td class="num">${f(q.bias, 3)}</td><td class="num">${f(q.rse, 3)}</td><td class="num">${f(q.aic, 2)}${q.status === 'ok' && q.aic === best ? ' ★' : ''}</td>
      <td class="num">${d ? f(d.asymptote, 2) : '–'}</td><td class="num">${d ? f(d.inflection, 1) : '–'}</td><td class="num">${d ? f(d.maiCulmination, 1) : '–'}</td></tr>`;
  }
  h += `</tbody></table></div><p class="muted small">${T('r.note')}</p></div>`;
  const tEnd = R.tMax * 1.25, lines = okFits.map((q, k) => ({ name: G.FORMS[q.form].name, pts: G.curve(q.form, q.theta, tEnd, tEnd / 300).map(c => [c.t, c.y]), k }));
  h += `<div class="card"><h2>${T('r.curves')}</h2><figure class="chartbox" id="ch-curves">${plotChart({ title: T('r.curves'), xLabel: T('r.age'), yLabel: (S.variable || 'y') + unitTxt(), xmin: 0, xmax: tEnd, lines, points: R.obs.map(o => [o.t, o.y]), fmt: v => fmtNum(v, 1), height: 380 })}<figcaption class="small">${T('r.curves')} <button type="button" class="btn ghost small" data-svg="ch-curves">${T('r.svg')}</button></figcaption></figure></div>`;
  const q = R.fits.find(x => x.form === S.sel && x.status === 'ok');
  if (q) {
    const F = G.FORMS[q.form], cv = G.curve(q.form, q.theta, tEnd, tEnd / 300), d = q.derived;
    const st = num(S.step3) > 0 ? num(S.step3) : 5, tab = G.curve(q.form, q.theta, tEnd, st);
    h += `<div class="card"><h2>${esc(F.name)}</h2><div class="lims"><label>${T('r.sel')} <select id="selform">${okFits.map(x => `<option value="${x.form}"${x.form === S.sel ? ' selected' : ''}>${esc(G.FORMS[x.form].name)}</option>`).join('')}</select></label></div>
      <p class="small" id="derived">${esc(T('r.der', { a: f(d.asymptote, 2) + unitTxt(), i: d.inflection != null ? `${f(d.inflection, 1)} ${lang === 'tr' ? 'yaş' : 'years'}` : T('r.der.none'), m: d.maiCulmination != null ? `${f(d.maiCulmination, 1)} ${lang === 'tr' ? 'yaş' : 'years'} (MAI ${f(d.maiMax, 3)})` : T('r.der.none') }))}</p>
      <figure class="chartbox" id="ch-inc">${plotChart({ title: T('r.inc'), xLabel: T('r.age'), yLabel: (S.variable || 'y') + unitTxt() + (lang === 'tr' ? '/yıl' : '/yr'), xmin: 0, xmax: tEnd,
        ymax: 1.1 * Math.max(...cv.filter(c => c.t >= Math.min(...R.obs.map(o => o.t))).flatMap(c => [c.cai, c.mai]).filter(Number.isFinite)), lines: [{ name: T('r.cai'), pts: cv.map(c => [c.t, c.cai]), k: 0 }, { name: T('r.maiL'), pts: cv.map(c => [c.t, c.mai]), k: 1, dash: true }], fmt: v => fmtNum(v, 3), height: 320 })}<figcaption class="small">${T('r.inc')} <button type="button" class="btn ghost small" data-svg="ch-inc">${T('r.svg')}</button></figcaption></figure>
      <figure class="chartbox" id="ch-res">${scatterChart({ title: T('r.resid'), points: q.residuals.map(r => [r.t, r.res]), xLabel: T('r.age'), yLabel: T('r.bias'), hline: 0, fmt: v => fmtNum(v, 2), height: 300 })}<figcaption class="small">${T('r.resid')}</figcaption></figure>
      <details class="more"><summary>${T('r.tab')}</summary><div class="lims"><label>${T('r.step')} <input type="text" inputmode="decimal" size="4" id="tstep" value="${esc(S.step3)}"></label></div><div class="tscroll"><table class="grid" id="ttab"><thead><tr><th>${T('r.age')}</th><th>${esc(S.variable || 'y')}</th><th>CAI</th><th>MAI</th></tr></thead><tbody>${tab.map(c => `<tr><td class="num">${f(c.t, 1)}</td><td class="num">${f(c.y, 3)}</td><td class="num">${f(c.cai, 4)}</td><td class="num">${f(c.mai, 4)}</td></tr>`).join('')}</tbody></table></div></details>
      <div class="lims"><label class="field"><span>${T('r.cit')}</span><input type="text" id="cit" value="${esc(S.cit)}"></label></div><div class="nav"><button type="button" class="btn" id="savecoef">${T('r.save')}</button></div></div>`;
  }
  h += `<div class="card"><div class="exports"><button type="button" class="btn" id="x-xlsx">${T('r.excel')}</button><button type="button" class="btn ghost" id="x-csv">${T('r.csv')}</button><button type="button" class="btn ghost" id="x-json">${T('r.json')}</button><button type="button" class="btn ghost" id="x-r">${T('r.rcode')}</button>${recordOption()}</div><p class="muted small">${T('r.rcode.note')}</p></div>
    <div class="nav"><button type="button" class="btn ghost" id="back2">${T('back')}</button></div>`;
  el.innerHTML = h;
  el.querySelectorAll('[data-sel]').forEach(b => b.addEventListener('click', () => { if (R.fits.find(x => x.form === b.dataset.sel && x.status === 'ok')) { S.sel = b.dataset.sel; save(); renderStep3(); } }));
  $('selform') && $('selform').addEventListener('change', e => { S.sel = e.target.value; save(); renderStep3(); });
  $('tstep') && $('tstep').addEventListener('change', e => { S.step3 = e.target.value; save(); renderStep3(); });
  $('cit') && $('cit').addEventListener('input', e => { S.cit = e.target.value; save(); });
  $('savecoef') && $('savecoef').addEventListener('click', async () => {
    if (!S.cit.trim()) { status(T('r.cit.need'), 'err'); return; }
    await saveCoef(G.fitToSet(q, { citation: S.cit.trim(), variable: S.variable, unit: S.unit, dataNote: S.imp ? S.imp.name : '' })); status(T('r.saved'), 'ok');
  });
  el.querySelectorAll('[data-svg]').forEach(b => b.addEventListener('click', () => download(b.dataset.svg + '.svg', svgForDownload($(b.dataset.svg).querySelector('svg')), 'image/svg+xml')));
  $('back2').addEventListener('click', () => go(2));
  const name = ext => `${lang === 'tr' ? 'buyume-islevi' : 'growth'}-${new Date().toISOString().slice(0, 10)}.${ext}`;
  $('x-csv').addEventListener('click', () => downloadCSV(name('csv'), cmpRows(), lang));
  $('x-r').addEventListener('click', () => {
    const file = S.imp && S.imp.kind !== 'dataset' && S.imp.kind !== 'paste' ? S.imp.name : null;
    download(name('R'), buildR({ imp: S.imp, src: S.src, map: S.map, decimal: S.decimal || '.', sel: S.sel, step: num(S.step3) > 0 ? num(S.step3) : 5 }, R,
      { lang, created: new Date().toISOString(), version: G.TOOL.version, fileName: file }), 'text/plain;charset=utf-8');
    // a table that was not read from a file (approved package, pasted cells) goes along as CSV for the script to read
    if (!file) download(csvName(S.imp), tableCsv(S.src, cellText), 'text/csv;charset=utf-8');
  });
  $('x-json').addEventListener('click', () => downloadRecord(name('json'), { tool: G.TOOL, created: R.created, variable: S.variable, unit: S.unit,
    settings: { columns: Object.fromEntries(Object.entries(S.map).map(([k, i]) => [k, i == null ? null : S.src.headers[i]])), decimal: S.decimal, forms: chosen() }, n: R.n, fits: R.fits.map(({ residuals, ...r }) => r) },
    G.TOOL, [['data', S.imp]], m => status(m, 'err')));
  $('x-xlsx').addEventListener('click', async () => {
    const XLSX = await loadXLSX(BASE), ok = R.fits.filter(x => x.status === 'ok');
    const info = [[T('x.k'), T('x.v')], [T('x.tool'), `${G.TOOL.id} ${G.TOOL.version}`], [T('x.date'), R.created], [T('x.lang'), lang], [T('x.data'), S.imp ? S.imp.name : ''], [T('x.var'), `${S.variable} ${S.unit}`.trim()],
      ...ok.map(x => [T('x.forms'), `${G.FORMS[x.form].name}: ${G.FORMS[x.form].formula}`]), [T('r.note'), '']];
    const pred = [['row', 'series', 't', 'y', ...ok.map(x => 'pred_' + x.form)], ...R.obs.map((o, i) => [o.row, o.series, o.t, o.y, ...ok.map(x => x.residuals[i].pred)])];
    const st = num(S.step3) > 0 ? num(S.step3) : 5, grid = G.curve(ok[0] ? ok[0].form : 'cr', ok[0] ? ok[0].theta : [1, 1, 1], R.tMax * 1.25, st).map(c => c.t);
    const curves = [['t', ...ok.flatMap(x => [`y_${x.form}`, `cai_${x.form}`, `mai_${x.form}`])], ...grid.map(t => [t, ...ok.flatMap(x => { const F = G.FORMS[x.form], y = F.f(x.theta, t); return [y, F.dy(x.theta, t), y / t]; })])];
    download(name('xlsx'), xlsxBlob(XLSX, [{ name: T('x.info'), rows: info }, { name: T('x.cmp'), rows: cmpRows() }, { name: T('x.pred'), rows: pred }, { name: T('x.curve'), rows: curves }]), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });
}
function cmpRows() {
  const rows = [['form', 'status', 'b0', 'b1', 'b2', 'b3', 'se_b0', 'se_b1', 'se_b2', 'se_b3', 'n', 'sse', 'rmse', 'bias', 'rse', 'aic', 'asymptote', 'inflection_age', 'mai_culmination_age', 'se_note']];
  for (const q of R.fits) { const P = q.params || {}, E = q.se || {}, d = q.derived || {};
    rows.push([q.form, q.status, P.b0 ?? null, P.b1 ?? null, P.b2 ?? null, P.b3 ?? null, E.b0 ?? null, E.b1 ?? null, E.b2 ?? null, E.b3 ?? null, q.n ?? null, q.sse ?? null, q.rmse ?? null, q.bias ?? null, q.rse ?? null, q.aic ?? null, d.asymptote ?? null, d.inflection ?? null, d.maiCulmination ?? null, q.seNote ?? null]); }
  return rows;
}

/* ---------------- navigation ---------------- */
const canGo = n => n === 1 || (n >= 2 && !!reading() && reading().obs.length > 0 && (n === 2 || chosen().length > 0));
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
      S = { ...blank(), ...saved, forms: { ...blank().forms, ...(saved.forms || {}) } };
      if (S.imp && S.imp.buf) S.src = await readImport(S.imp, BASE).catch(() => null);
      status(T('restored', { when: new Date(saved.saved).toLocaleString(LOC) }));
    }
  } catch (e) { S = blank(); }
  render();
})();
