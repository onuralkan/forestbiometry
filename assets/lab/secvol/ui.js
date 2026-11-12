// Stem Section Volume: user interface. All arithmetic lives in calc.js and core/stems.js.
import * as V from './calc.js';
import { T } from './i18n.js';
import { lang, fmtNum, esc } from '../core/i18n.js';
import { put, get, del } from '../core/store.js';
import { cellText } from '../core/table.js';
import { detectDecimal, defaultDecimal } from '../core/num.js';
import { download, downloadCSV, downloadJSON, xlsxBlob, loadXLSX } from '../core/export.js';
import { plotChart, svgForDownload } from '../core/chart.js';
import { renderImport, readImport } from '../core/importer.js';
import { readStems, keyOf } from '../core/stems.js';

const BASE = './', KEY = 'session:' + V.TOOL.id, LOC = lang === 'tr' ? 'tr-TR' : 'en-GB';
const $ = id => document.getElementById(id);
const f = (x, d = 4) => x == null || !Number.isFinite(x) ? '–' : fmtNum(x, d);
const num = v => { const t = String(v ?? '').trim(); if (!t) return null; const x = Number(t.replace(',', '.')); return Number.isFinite(x) ? x : NaN; };
const LAYOUTS = ['ends', 'mids', 'triples', 'hohenadl'];
const forLayout = l => V.METHODS.filter(m => V.LAYOUTS[m].includes(l));
const MAPKEYS = ['tree', 'plot', 'period', 'h', 'd', 'd1', 'd2', 'bark', 'bark_t', 'kind', 'dbh', 'height', 'stump_h', 'area'];

let S = blank(), R = null, approved = null;
function blank() {
  return { v: 1, step: 1, imp: null, src: null, map: Object.fromEntries(MAPKEYS.map(k => [k, null])), dmode: 'one', combine: 'arith', barkDef: 'ob',
    u: { h: 'm', d: 'cm', bark_t: 'mm', dbh: 'cm', height: 'm' }, decimal: null, decimalChosen: false,
    layout: 'ends', methods: { huber: true, smalian: true, newton: true, hohenadl: true }, top: 'cone', includeStump: false, dTop: '',
    areaMode: 'none', areaConst: '', useDs: false, adv: { buttressH: '1.3', dbhTol: '10', midTol: '0.01', hohTol: '0.05', topShare: '10' }, selTree: null, bark: 'ob' };
}
let saveT = null;
function save() { clearTimeout(saveT); saveT = setTimeout(flush, 250); }
async function flush() { clearTimeout(saveT); saveT = null; await put(KEY, { ...S, saved: new Date().toISOString() }); }
$('langlink') && $('langlink').addEventListener('click', async e => { e.preventDefault(); const h = e.currentTarget.href; await flush(); location.href = h; });
function status(m, k = '') { const s = $('status'); s.className = 'status ' + k; s.textContent = m || ''; }

/* ---------------- step 1: data ---------------- */
const GUESS = { tree: ['agac', 'ağaç', 'tree', 'tree_id', 'agac_no', 'ağaç_no'], plot: ['alan', 'plot', 'plot_id', 'ornek_alan', 'örnek_alan', 'alan_no'], period: ['donem', 'dönem', 'period', 'yil', 'yıl', 'year'],
  h: ['h', 'h_m', 'yukseklik', 'yükseklik', 'yukseklik_m', 'yükseklik_m', 'olcum_yuksekligi'], d: ['d', 'cap', 'çap', 'cap_cm', 'çap_cm', 'd_cm'], d1: ['d1', 'cap1', 'çap1'], d2: ['d2', 'cap2', 'çap2'],
  bark: ['kabuk_durumu', 'bark_status'], bark_t: ['kabuk', 'kabuk_mm', 'bark', 'bark_mm', 'kabuk_kalinligi'], kind: ['tur_nokta', 'nokta', 'kind', 'point'],
  dbh: ['dbh', 'd13', 'gogus_capi', 'göğüs_çapı'], height: ['boy', 'boy_m', 'height', 'toplam_boy', 'h_total'], stump_h: ['kesim', 'kesim_m', 'stump', 'dip_kutuk', 'stump_h'], area: ['alan_m2', 'plot_area', 'area_m2', 'alan_buyuklugu'] };
function setTable(state) {
  S = { ...blank(), step: S.step, imp: state.imp, src: state.src, useDs: S.useDs };
  R = null;
  if (S.src) {
    const H = S.src.headers.map(h => h.toLocaleLowerCase('tr').trim());
    for (const [k, names] of Object.entries(GUESS)) { const i = H.findIndex(h => names.includes(h)); if (i >= 0) S.map[k] = i; }
    if (S.map.d == null && S.map.d1 != null && S.map.d2 != null) S.dmode = 'two';
    if (S.map.area != null) S.areaMode = 'col';
  }
  status(''); save(); render();
}
function renderStep1() {
  const el = $('step1');
  el.innerHTML = `<div id="impbox"></div><div class="card"><h2>${T('ds.h')}</h2><p class="muted">${T('ds.sub')}</p>
    ${approved ? (S.useDs ? `<p class="note ok small" id="dsinfo">${T('ds.used', { n: approved.trees.length, p: approved.plots.length })}</p><button type="button" class="btn ghost small" id="dsdrop">${T('ds.drop')}</button>`
      : `<button type="button" class="btn ghost" id="useds">${T('ds.use')}</button>`) : `<p class="muted small">${T('ds.none')}</p>`}</div>
    <div class="card sample"><button type="button" class="btn ghost" id="sample">${T('sample')}</button><span class="muted small">${T('sample.note')}</span></div>
    <div class="nav"><button type="button" class="btn ghost" id="reset">${T('reset')}</button><button type="button" class="btn" id="to2"${S.src ? '' : ' disabled'}>${T('next')}</button>${S.src ? '' : `<span class="muted small">${T('need.data')}</span>`}</div>`;
  renderImport($('impbox'), { imp: S.imp, src: S.src }, { base: BASE, title: T('imp.h'), sub: T('imp.sub'), onChange: setTable, onError: m => status(m, 'err') });
  $('useds') && $('useds').addEventListener('click', () => { S.useDs = true; if (S.areaMode === 'none') S.areaMode = 'ds'; R = null; save(); renderStep1(); });
  $('dsdrop') && $('dsdrop').addEventListener('click', () => { S.useDs = false; if (S.areaMode === 'ds') S.areaMode = 'none'; R = null; save(); renderStep1(); });
  $('sample').addEventListener('click', async () => {
    const buf = await (await fetch(BASE + 'assets/lab/secvol/ornek/ornek-seksiyon.csv')).arrayBuffer();
    const imp = { kind: 'csv', name: lang === 'tr' ? 'ornek-seksiyon.csv (benzetim)' : 'ornek-seksiyon.csv (simulated)', buf, encoding: 'utf-8', delim: null, header: true, sheet: null };
    setTable({ imp, src: await readImport(imp, BASE) });
  });
  $('reset').addEventListener('click', async () => { S = blank(); R = null; status(''); render(); await del(KEY); });
  $('to2').addEventListener('click', () => go(2));
}

/* ---------------- step 2: settings ---------------- */
const chosen = () => forLayout(S.layout).filter(m => S.methods[m]);
const dTopVal = () => { const v = num(S.dTop); return v == null ? null : v > 0 ? v : NaN; };
const advVal = () => { const o = {}; for (const k of Object.keys(S.adv)) o[k] = num(S.adv[k]); for (const k of ['dbhTol', 'topShare']) o[k] = o[k] == null ? null : o[k] / 100; return o; };
function mapForStems() {
  const m = { ...S.map }; if (S.dmode === 'two') m.d = null; else { m.d1 = null; m.d2 = null; }
  delete m.area; return m;
}
function settingsProblems() {
  const p = [], m = S.map;
  if (m.tree == null || m.h == null || (S.dmode === 'one' ? m.d == null : m.d1 == null || m.d2 == null)) p.push(T('col.need'));
  if (!chosen().length) p.push(T('m.need'));
  if (Number.isNaN(dTopVal())) p.push(T('dtop.bad'));
  if (S.areaMode === 'const' && !(num(S.areaConst) > 0)) p.push(T('area.bad'));
  if (S.areaMode === 'col' && m.area == null) p.push(T('area.nocol'));
  const a = advVal(); if (!Object.values(a).every(x => x > 0)) p.push(T('adv.bad'));
  return p;
}
function renderStep2() {
  const el = $('step2'), Hd = S.src.headers;
  const opts = sel => `<option value="">${T('none')}</option>` + Hd.map((h, i) => `<option value="${i}"${sel === i ? ' selected' : ''}>${esc(h)}</option>`).join('');
  const colSel = (k, lab, unitKey, units) => `<label>${lab} <select id="m-${k}">${opts(S.map[k])}</select>${unitKey ? ` <select id="u-${unitKey}" aria-label="${esc(lab)} ${T('col.unit')}">${units.map(u => `<option${S.u[unitKey] === u ? ' selected' : ''}>${u}</option>`).join('')}</select>` : ''}</label>`;
  const textOf = c => c == null ? [] : S.src.rows.map(r => r[c]).filter(x => x && x.t === 's').map(x => x.v);
  const dv = detectDecimal(['h', 'd', 'd1', 'd2', 'bark_t', 'height', 'stump_h', 'dbh', 'area'].flatMap(k => textOf(S.map[k])));
  if (!S.decimalChosen) S.decimal = defaultDecimal(dv.verdict);
  let h = `<div class="card"><h2>${T('col.h')}</h2>
    <div class="lims">${colSel('tree', T('col.tree'))}${colSel('plot', T('col.plot'))}${colSel('period', T('col.period'))}</div>
    <div class="lims">${colSel('h', T('col.hgt'), 'h', ['m', 'dm', 'cm'])}
      <span class="radios"><span class="small">${T('col.dmode')}:</span> ${['one', 'two'].map(v => `<label class="small"><input type="radio" name="dmode" value="${v}"${S.dmode === v ? ' checked' : ''}> ${T('col.dmode.' + v)}</label>`).join(' ')}</span></div>
    <div class="lims">${S.dmode === 'one' ? colSel('d', T('col.d'), 'd', ['cm', 'mm']) : colSel('d1', T('col.d1'), 'd', ['cm', 'mm']) + colSel('d2', T('col.d2'))}
      ${S.dmode === 'two' ? `<label>${T('col.combine')} <select id="combine">${['arith', 'quadratic'].map(v => `<option value="${v}"${S.combine === v ? ' selected' : ''}>${T('col.combine.' + v)}</option>`).join('')}</select></label>` : ''}
      <label>${T('col.barkdef')} <select id="barkdef">${['ob', 'ib'].map(v => `<option value="${v}"${S.barkDef === v ? ' selected' : ''}>${T('col.barkdef.' + v)}</option>`).join('')}</select></label></div>
    <div class="lims">${colSel('bark_t', T('col.bark_t'), 'bark_t', ['mm', 'cm'])}${colSel('bark', T('col.bark'))}${colSel('kind', T('col.kind'))}</div>
    <div class="lims">${colSel('dbh', T('col.dbh'), 'dbh', ['cm', 'mm'])}${colSel('height', T('col.height'), 'height', ['m', 'dm', 'cm'])}${colSel('stump_h', T('col.stump'))}${colSel('area', T('col.area'))}</div></div>`;
  const dmsg = dv.verdict === 'ambiguous' ? T('dec.v.ambiguous', { ex: dv.examples.ambiguous.map(x => `"${x}"`).join(', ') }) : T('dec.v.' + dv.verdict);
  h += `<div class="card"><h2>${T('dec.h')}</h2><p class="note ${dv.verdict === 'ambiguous' || dv.verdict === 'conflict' ? 'warn' : ''}">${esc(dmsg)}</p><div class="radios">
    <label><input type="radio" name="dec" value="."${S.decimal === '.' ? ' checked' : ''}> ${T('dec.dot')}</label><label><input type="radio" name="dec" value=","${S.decimal === ',' ? ' checked' : ''}> ${T('dec.comma')}</label></div></div>`;
  h += `<div class="card"><h2>${T('m.h')}</h2><p class="small"><b>${T('m.layout')}</b></p><div class="radios col">${LAYOUTS.map(l => `<label><input type="radio" name="layout" value="${l}"${S.layout === l ? ' checked' : ''}> ${T('lay.' + l)}</label>`).join('')}</div>
    <div class="radios">${forLayout(S.layout).map(m => `<label><input type="checkbox" data-meth="${m}"${S.methods[m] ? ' checked' : ''}> ${T('meth.' + m)}</label>`).join(' ')}</div>
    <p class="muted small">${T('m.note')}</p>
    ${S.layout !== 'hohenadl' ? `<p class="small"><b>${T('top.h')}</b></p><div class="radios">${Object.keys(V.SOLIDS).sort((a, b) => (a === 'cone' ? -1 : b === 'cone' ? 1 : 0)).map(s => `<label><input type="radio" name="top" value="${s}"${S.top === s ? ' checked' : ''}> ${T('top.' + s)}</label>`).join(' ')}</div>
      <p class="muted small">${T('top.note')}</p><label class="small"><input type="checkbox" id="incstump"${S.includeStump ? ' checked' : ''}> ${T('stump.inc')}</label>` : ''}
    <div class="lims"><label>${T('dtop')} <input type="text" inputmode="decimal" size="6" id="dtop" value="${esc(S.dTop)}"></label></div>
    ${Number.isNaN(dTopVal()) ? `<p class="note err">${T('dtop.bad')}</p>` : ''}</div>`;
  h += `<div class="card"><h2>${T('area.h')}</h2><div class="radios col">${['none', 'col', 'const', ...(S.useDs ? ['ds'] : [])].map(v => `<label><input type="radio" name="area" value="${v}"${S.areaMode === v ? ' checked' : ''}> ${T('area.' + v)}${v === 'const' ? ` <input type="text" inputmode="decimal" size="7" id="aconst" value="${esc(S.areaConst)}" aria-label="m²"> m²` : ''}</label>`).join('')}</div>
    <p class="muted small">${T('p.partial')}</p></div>`;
  h += `<details class="card more"><summary>${T('adv.h')}</summary><div class="lims">${[['buttressH', 'adv.buttress'], ['dbhTol', 'adv.dbhtol'], ['topShare', 'adv.topshare'], ['midTol', 'adv.midtol'], ['hohTol', 'adv.hohtol']].map(([k, l]) => `<label>${T(l)} <input type="text" inputmode="decimal" size="6" id="adv-${k}" value="${esc(S.adv[k])}"></label>`).join('')}</div></details>`;
  const pr = settingsProblems();
  h += `<div class="nav"><button type="button" class="btn ghost" id="back1">${T('back')}</button><button type="button" class="btn" id="calc"${pr.length ? ' disabled' : ''}>${T('calc')}</button>${pr.length ? `<span class="muted small">${pr.map(esc).join(' ')}</span>` : ''}</div>`;
  el.innerHTML = h;
  const re = () => { R = null; save(); renderStep2(); renderSteps(); };
  for (const k of MAPKEYS) $('m-' + k) && $('m-' + k).addEventListener('change', e => { S.map[k] = e.target.value === '' ? null : +e.target.value; if (k === 'area' && S.map.area != null && S.areaMode === 'none') S.areaMode = 'col'; re(); });
  for (const k of Object.keys(S.u)) $('u-' + k) && $('u-' + k).addEventListener('change', e => { S.u[k] = e.target.value; re(); });
  el.querySelectorAll('input[name="dmode"]').forEach(x => x.addEventListener('change', () => { S.dmode = x.value; re(); }));
  $('combine') && $('combine').addEventListener('change', e => { S.combine = e.target.value; re(); });
  $('barkdef').addEventListener('change', e => { S.barkDef = e.target.value; re(); });
  el.querySelectorAll('input[name="dec"]').forEach(x => x.addEventListener('change', () => { S.decimal = x.value; S.decimalChosen = true; re(); }));
  el.querySelectorAll('input[name="layout"]').forEach(x => x.addEventListener('change', () => { S.layout = x.value; re(); }));
  el.querySelectorAll('[data-meth]').forEach(x => x.addEventListener('change', () => { S.methods[x.dataset.meth] = x.checked; re(); }));
  el.querySelectorAll('input[name="top"]').forEach(x => x.addEventListener('change', () => { S.top = x.value; re(); }));
  $('incstump') && $('incstump').addEventListener('change', e => { S.includeStump = e.target.checked; re(); });
  $('dtop').addEventListener('change', e => { S.dTop = e.target.value; re(); });
  el.querySelectorAll('input[name="area"]').forEach(x => x.addEventListener('change', () => { S.areaMode = x.value; re(); }));
  $('aconst').addEventListener('change', e => { S.areaConst = e.target.value; if (S.areaMode !== 'const') S.areaMode = 'const'; re(); });
  for (const k of Object.keys(S.adv)) $('adv-' + k).addEventListener('change', e => { S.adv[k] = e.target.value; re(); });
  $('back1').addEventListener('click', () => go(1));
  $('calc').addEventListener('click', () => { compute(); if (R) go(3); });
}

/* ---------------- computation ---------------- */
function compute() {
  const a = advVal();
  const st = readStems(S.src, mapForStems(), { decimal: S.decimal, units: { h: S.u.h, d: S.u.d, bark_t: S.u.bark_t, dbh: S.u.dbh, height: S.u.height }, bark: S.barkDef, combine: S.combine, buttressH: a.buttressH, dbhTol: a.dbhTol },
    S.useDs && approved ? approved.trees : null);
  const settings = { layout: S.layout, top: S.top, includeStump: S.includeStump, dTop: dTopVal(), midTol: a.midTol, hohTol: a.hohTol };
  const methods = chosen(), res = Object.fromEntries(methods.map(m => [m, V.allTrees(st, { ...settings, method: m })]));
  let areaOf = null, areaProblems = [];
  if (S.areaMode === 'col') { const r = V.plotAreas(S.src, S.map.plot, S.map.area, S.decimal, S.map.period); areaOf = r.areaOf; areaProblems = r.problems; }
  else if (S.areaMode === 'const') { const A = num(S.areaConst); areaOf = () => A; }
  else if (S.areaMode === 'ds' && approved) { const m = new Map(approved.plots.map(p => [p.plot_id, p.plot_area])); areaOf = plot => m.get(plot) ?? null; }
  let unmeasuredOf = null;
  if (S.useDs && approved) {
    const have = new Set(st.trees.map(T => T.key));
    unmeasuredOf = (plot, per) => approved.trees.filter(t => t.plot_id === plot && (t.period ?? null) === per && !have.has(keyOf(t.plot_id, t.tree_id, t.period ?? null))).length;
  }
  const plots = areaOf ? Object.fromEntries(methods.map(m => [m, V.plotTotals(res[m], areaOf, unmeasuredOf)])) : null;
  const ref = methods.includes('newton') ? 'newton' : methods[0];
  const quality = V.qualityReport(st, res[ref], { topShareMax: a.topShare }), comp = methods.length > 1 ? V.methodComparison(res, ref) : null;
  R = { st, res, methods, ref, plots, areaProblems, settings, quality, comp, created: new Date().toISOString() };
  if (!R.st.trees.some(t => keyOf(t.plot_id, t.tree_id, t.period) === S.selTree)) { const firstOk = res[ref].find(r => r.status === 'ok'); S.selTree = firstOk ? keyOf(firstOk.tree.plot_id, firstOk.tree.tree_id, firstOk.tree.period) : null; }
  save();
}
/** All problems and warnings for the list: table checks, plot sizes, and tree results of the reference method. */
function allProblems() {
  const rowOf = new Map(R.st.trees.map(t => [t.key, t.rows[0]])), out = [...R.st.problems, ...R.areaProblems];
  for (const r of R.res[R.ref]) {
    const k = keyOf(r.tree.plot_id, r.tree.tree_id, r.tree.period), row = rowOf.get(k) ?? null, tag = { row, tree: r.tree.tree_id, plot: r.tree.plot_id };
    for (const q of r.problems) if (q.code !== 'tree.error') out.push({ ...q, ...tag, severity: 'error' });
    for (const side of ['ob', 'ib']) if (r[side]) for (const w of r[side].warnings) if (!(side === 'ib' && r.ob)) out.push({ ...w, ...tag, severity: 'warning' });
    for (const w of r.warnings) if (w.code === 'ib.none' && r.ob) continue; else out.push({ ...w, ...tag, severity: 'warning' });
  }
  if (R.plots) for (const p of R.plots[R.ref]) if (p.area == null) out.push({ code: 'area.none', severity: 'warning', row: null, plot: p.plot_id, tree: null });
  return out.sort((a, b) => (a.row ?? 1e12) - (b.row ?? 1e12));
}

/* ---------------- step 3: results ---------------- */
const mName = m => T('meth.' + m).replace(/ \(.*\)$/, '');
const labelOf = side => side ? T('lab.' + side.label) + (side.includeStump ? T('lab.stump') : '') : '–';
const keyOfRes = r => keyOf(r.tree.plot_id, r.tree.tree_id, r.tree.period);
function treeTable() {
  const { methods, ref, res } = R, dT = R.settings.dTop, others = methods.filter(m => m !== ref);
  const head = [T('t.plot'), T('t.tree'), T('t.period'), ...methods.map(m => T('t.vob', { m: mName(m) })), T('t.vib', { m: mName(ref) }), ...others.map(m => T('t.diff', { m: mName(m) })), T('t.ff'),
    ...(dT ? [T('t.merch', { d: f(dT, 2) }), T('t.hm', { d: f(dT, 2) })] : []), T('t.label'), T('t.state')];
  const rows = res[ref].map((r, i) => {
    const ob = m => res[m][i].ob && res[m][i].ob.status === 'ok' ? res[m][i].ob.total : null, base = ob(ref);
    const side = r.ob || r.ib, merch = side && side.merch && side.merch.status === 'ok' ? side.merch : null;
    return { key: keyOfRes(r), ok: r.status === 'ok', cells: [r.tree.plot_id, r.tree.tree_id, r.tree.period, ...methods.map(ob), r.ib && r.ib.status === 'ok' ? r.ib.total : null,
      ...others.map(m => base && ob(m) != null ? 100 * (ob(m) - base) / base : null), r.formFactor ? r.formFactor.value : null,
      ...(dT ? [merch ? merch.volume : null, merch ? merch.h : null] : []), r.status === 'ok' ? labelOf(side) : '–', T('st.' + r.status)] };
  });
  return { head, rows };
}
function plotTable() {
  if (!R.plots) return null;
  const { methods } = R, head = [T('t.plot'), T('t.period'), T('t.area'), T('t.n'), T('t.nok'), T('t.nbad'), ...(S.useDs ? [T('t.unm')] : []), ...methods.flatMap(m => [T('t.vhaob', { m: mName(m) }), T('t.vhaib', { m: mName(m) })]), T('t.state')];
  const rows = R.plots[R.ref].map((p, i) => ({ cells: [p.plot_id, p.period, p.area, p.nTrees, p.nComputed, p.nFailed, ...(S.useDs ? [p.unmeasured] : []), ...methods.flatMap(m => [R.plots[m][i].obHa, R.plots[m][i].ibHa]), T('st.' + p.status)] }));
  return { head, rows };
}
const cellHTML = (v, isNum, d = 4) => v == null ? '–' : isNum && typeof v === 'number' ? f(v, d) : esc(v);
function tableHTML(t, id, digits) {
  return `<div class="tscroll"><table class="grid" id="${id}"><thead><tr>${t.head.map(x => `<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${t.rows.map(r => `<tr${r.key ? ` data-key="${esc(r.key)}"` : ''}${r.ok === false ? ' class="st-bad"' : ''}>${r.cells.map(c => `<td class="${typeof c === 'number' ? 'num' : ''}">${cellHTML(c, true, digits)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function renderStep3() {
  if (!R) compute();
  const el = $('step3'), r0 = R.res[R.ref], nOk = r0.filter(r => r.status === 'ok').length, probs = allProblems();
  const nE = probs.filter(p => p.severity === 'error').length, nW = probs.length - nE, tt = treeTable(), pt = plotTable();
  let h = `<p class="small" id="sum">${T('r.sum', { n: r0.length, ok: nOk, bad: r0.length - nOk })}${R.methods.length > 1 ? ' ' + T('r.ref', { m: mName(R.ref) }) : ''}</p>
    <div class="card"><h2>${T('r.trees')}</h2>${tableHTML(tt, 'ttab', 4)}</div>`;
  if (pt) h += `<div class="card"><h2>${T('r.plots')}</h2>${tableHTML(pt, 'ptab', 3)}<p class="muted small">${T('p.partial')}</p></div>`;
  h += qualityCard();
  h += `<details class="card more" id="tdetail"${S.detailOpen ? ' open' : ''}><summary>${T('d.h')}</summary><div id="tdbody"></div></details>`;
  h += `<details class="card more" id="probs"><summary>${T('pr.h', { e: nE, w: nW })}</summary>${probs.length ? `<div class="tscroll"><table class="grid" id="prtab"><thead><tr><th>${T('pr.row')}</th><th>${T('pr.tree')}</th><th>${T('pr.sev')}</th><th>${T('pr.msg')}</th></tr></thead><tbody>
    ${probs.slice(0, 300).map(p => `<tr data-code="${esc(p.code)}"><td class="rn">${p.row ?? '–'}</td><td>${esc([p.plot, p.tree].filter(x => x != null).join(' / ') || '–')}</td><td>${T('sev.' + p.severity)}</td><td>${esc(T('c.' + p.code, p))}</td></tr>`).join('')}</tbody></table></div>${probs.length > 300 ? `<p class="small">${T('pr.more', { n: probs.length - 300 })}</p>` : ''}` : ''}</details>`;
  h += `<div class="exports"><button type="button" class="btn" id="x-xlsx">${T('ex.xlsx')}</button><button type="button" class="btn ghost" id="x-csv">${T('ex.csv')}</button><button type="button" class="btn ghost" id="x-json">${T('ex.json')}</button></div>
    <div class="nav"><button type="button" class="btn ghost" id="back2">${T('back')}</button></div>`;
  el.innerHTML = h;
  $('tdetail').addEventListener('toggle', e => { S.detailOpen = e.target.open; save(); });
  $('ttab').querySelectorAll('tr[data-key]').forEach(tr => tr.addEventListener('click', () => { S.selTree = tr.dataset.key; S.detailOpen = true; $('tdetail').open = true; drawDetail(); save(); }));
  $('back2').addEventListener('click', () => go(2));
  $('x-csv').addEventListener('click', () => downloadCSV(fname('seksiyon-hacmi-agaclar', 'stem-volume-trees') + '.csv', [tt.head, ...tt.rows.map(r => r.cells)], lang));
  $('x-json').addEventListener('click', () => downloadJSON(fname('seksiyon-hacmi', 'stem-volume') + '.json', { tool: V.TOOL, created: R.created, source: S.imp ? S.imp.name : null, settings: settingsRecord(), problems: R.st.problems, results: R.res, plots: R.plots, quality: R.quality, comparison: R.comp }));
  $('x-xlsx').addEventListener('click', exportXLSX);
  drawDetail();
}
function drawDetail() {
  const body = $('tdbody'); if (!body) return;
  const ok = R.res[R.ref].filter(r => r.status === 'ok');
  if (!ok.length) { body.innerHTML = `<p class="small">${T('d.notree')}</p>`; return; }
  const cur = ok.find(r => keyOfRes(r) === S.selTree) || ok[0]; S.selTree = keyOfRes(cur);
  const sides = ['ob', 'ib'].filter(s => cur[s] && cur[s].status === 'ok'); if (!sides.includes(S.bark)) S.bark = sides[0];
  const part = cur[S.bark], name = [cur.tree.plot_id, cur.tree.tree_id, cur.tree.period].filter(x => x != null).join(' / ');
  let h = `<div class="lims"><label>${T('d.tree')} <select id="dsel">${ok.map(r => `<option value="${esc(keyOfRes(r))}"${keyOfRes(r) === S.selTree ? ' selected' : ''}>${esc([r.tree.plot_id, r.tree.tree_id, r.tree.period].filter(x => x != null).join(' / '))}</option>`).join('')}</select></label>
    ${sides.length > 1 ? `<span class="radios"><span class="small">${T('d.bark')}:</span> ${sides.map(s => `<label class="small"><input type="radio" name="dbark" value="${s}"${S.bark === s ? ' checked' : ''}> ${T('d.' + s)}</label>`).join(' ')}</span>` : ''}</div>`;
  h += `<h3>${T('d.sec')} (${esc(mName(R.ref))})</h3><div class="tscroll"><table class="grid" id="sectab"><thead><tr><th>${T('d.kind')}</th><th>${T('d.lo')}</th><th>${T('d.hi')}</th><th>${T('d.L')}</th><th>${T('d.dlo')}</th><th>${T('d.dmid')}</th><th>${T('d.dhi')}</th><th>${T('d.v')}</th></tr></thead><tbody>
    ${part.sections.map(q => `<tr><td>${q.kind === 'top' ? T('kind.top', { s: T('top.' + q.solid).replace(/ \(.*\)$/, '').toLocaleLowerCase(LOC) }) : T('kind.' + q.kind)}</td><td class="num">${f(q.lo, 2)}</td><td class="num">${f(q.hi, 2)}</td><td class="num">${f(q.L, 2)}</td><td class="num">${f(q.d.lo, 1)}</td><td class="num">${f(q.d.mid, 1)}</td><td class="num">${f(q.d.hi, 1)}</td><td class="num">${f(q.v, 5)}</td></tr>`).join('')}</tbody></table></div>`;
  const T0 = R.st.trees.find(t => t.key === S.selTree), dOf = p => S.bark === 'ob' ? p.d : p.d_ib, pts = T0.points.filter(p => dOf(p) != null).map(p => [p.h, dOf(p)]);
  const lines = [{ name: T('d.' + S.bark), k: 0, pts }], top = part.sections.find(q => q.kind === 'top');
  if (top) { const r = V.SOLIDS[top.solid]; lines.push({ name: T('kind.top', { s: T('top.' + top.solid).replace(/ \(.*\)$/, '').toLocaleLowerCase(LOC) }), k: 0, dash: true, pts: Array.from({ length: 41 }, (_, i) => { const t = top.L * i / 40; return [top.lo + t, top.d.lo * (1 - t / top.L) ** (r / 2)]; }) }); }
  const xmax = Math.max(T0.height ?? 0, ...pts.map(p => p[0])), ymax = Math.max(...pts.map(p => p[1]));
  h += `<figure class="chartbox" id="ch-prof">${plotChart({ title: T('d.chart', { t: name }), xmin: 0, xmax: xmax * 1.02, ymin: 0, ymax: ymax * 1.1, lines, points: pts, xLabel: T('d.hx'), yLabel: T('d.dy'), fmt: v => fmtNum(v, 1) })}
    <figcaption><button type="button" class="btn ghost small" id="ch-svg">SVG</button></figcaption></figure>`;
  body.innerHTML = h;
  $('dsel').addEventListener('change', e => { S.selTree = e.target.value; save(); drawDetail(); });
  body.querySelectorAll('input[name="dbark"]').forEach(x => x.addEventListener('change', () => { S.bark = x.value; save(); drawDetail(); }));
  $('ch-svg').addEventListener('click', () => download(fname('gövde-profili', 'stem-profile') + '.svg', svgForDownload($('ch-prof').querySelector('svg')), 'image/svg+xml'));
}

/* ---------------- quality and method comparison (SV03) ---------------- */
const pct = x => x == null ? '–' : fmtNum(100 * x, 1);
function qualityRows() {
  const q = R.quality, head = [T('t.plot'), T('t.tree'), T('t.period'), T('q.np'), T('q.inc'), T('q.lmin'), T('q.lmean'), T('q.lmax'), T('q.top'), T('q.dbh'), T('q.flags')];
  return { head, rows: q.trees.map(t => ({ ok: !t.flags.includes('tree.error'), cells: [t.plot_id, t.tree_id, t.period, t.nPoints, t.nIncrease, t.sections.min, t.sections.mean, t.sections.max,
    t.topShare == null ? null : 100 * t.topShare, t.dbhRel == null ? null : 100 * t.dbhRel, t.flags.map(f => T('q.f.' + f)).join(', ') || '–'] })) };
}
function compRows() {
  const c = R.comp; if (!c) return null;
  const head = [T('t.method'), T('c.total'), T('c.tdiff'), T('c.dmin'), T('c.dmean'), T('c.dmax')];
  return { head, rows: c.methods.map(m => ({ cells: [mName(m) + (m === c.ref ? ` (${T('c.ref')})` : ''), c.total[m], m === c.ref ? null : c.totalDiff[m], m === c.ref ? null : c.treeDiff[m].min, m === c.ref ? null : c.treeDiff[m].mean, m === c.ref ? null : c.treeDiff[m].max] })) };
}
function qualityCard() {
  const q = R.quality, s = q.summary, th = q.thresholds, qt = qualityRows(), ct = compRows();
  let h = `<div class="card" id="qcard"><h2>${T('q.h')}</h2><p class="small" id="qsum">${T('q.sum', { inc: s.increase, top: s.topShare, dbh: s.dbh, err: s.error, n: s.n })}</p>
    <p class="muted small">${T('q.thr', { b: fmtNum(th.buttressH, 2), d: pct(th.dbhTol), t: pct(th.topShareMax) })}</p>
    <details class="more"><summary>${T('q.table')}</summary>${tableHTML(qt, 'qtab', 2)}<p class="muted small">${T('q.topnote')}</p></details>`;
  if (ct) h += `<h3>${T('c.h')}</h3><p class="small" id="csum">${T('c.sum', { n: R.comp.nCommon, all: R.comp.nTrees, ref: mName(R.comp.ref), bark: R.comp.bark.map(b => T('d.' + b)).join(', ') || '–' })}</p>${tableHTML(ct, 'ctab', 3)}
    <details class="more"><summary>${T('c.why')}</summary><p class="small">${T('c.behav')}</p></details>`;
  return h + '</div>';
}

/* ---------------- exports ---------------- */
const fname = (a, b) => `${lang === 'tr' ? a : b}-${new Date().toISOString().slice(0, 10)}`;
function settingsRecord() {
  return { layout: S.layout, methods: R.methods, reference: R.ref, top: S.layout === 'hohenadl' ? null : S.top, includeStump: S.includeStump, dTop: R.settings.dTop, combine: S.dmode === 'two' ? S.combine : null,
    barkDefault: S.barkDef, areaMode: S.areaMode, areaConst: S.areaMode === 'const' ? num(S.areaConst) : null, linkedApprovedData: !!(S.useDs && approved), thresholds: advVal(), decimal: S.decimal, units: S.u };
}
async function exportXLSX() {
  let XLSX; try { XLSX = await loadXLSX(BASE); } catch (e) { status('XLSX', 'err'); return; }
  const tt = treeTable(), pt = plotTable(), s = settingsRecord(), yn = b => b ? T('x.yes') : T('x.no');
  const info = [[T('x.k'), T('x.v')], [T('x.tool'), `${V.TOOL.id} ${V.TOOL.version}`], [T('x.date'), R.created], [T('x.src'), S.imp ? S.imp.name : ''], [T('x.layout'), T('lay.' + s.layout)],
    [T('x.methods'), s.methods.map(mName).join(', ')], [T('x.top'), s.top ? T('top.' + s.top) : '–'], [T('x.stump'), yn(s.includeStump)], [T('x.combine'), s.combine ? T('col.combine.' + s.combine) : '–'],
    [T('x.dtop'), s.dTop ?? '–'], [T('x.area'), T('area.' + s.areaMode) + (s.areaConst ? ` ${s.areaConst} m²` : '')], [T('x.units'), T('x.unitsv')],
    [T('x.thr'), `${T('adv.buttress')} ${s.thresholds.buttressH}; ${T('adv.dbhtol')} ${s.thresholds.dbhTol * 100}; ${T('adv.topshare')} ${s.thresholds.topShare * 100}; ${T('adv.midtol')} ${s.thresholds.midTol}; ${T('adv.hohtol')} ${s.thresholds.hohTol}`],
    ['', T('c.behav')],
    ['', T('m.note')], ['', T('top.note')], ['', T('p.partial')], ['', T('x.merch.rule')]];
  const secs = [[T('t.plot'), T('t.tree'), T('t.period'), T('x.methods'), T('d.bark'), T('d.kind'), T('d.lo'), T('d.hi'), T('d.L'), T('d.dlo'), T('d.dmid'), T('d.dhi'), T('d.v')]];
  for (const m of R.methods) for (const r of R.res[m]) for (const side of ['ob', 'ib']) if (r[side] && r[side].status === 'ok')
    for (const q of r[side].sections) secs.push([r.tree.plot_id, r.tree.tree_id, r.tree.period, mName(m), T('d.' + side), q.kind === 'top' ? T('kind.top', { s: q.solid }) : T('kind.' + q.kind), q.lo, q.hi, q.L, q.d.lo, q.d.mid, q.d.hi, q.v]);
  const probs = [[T('pr.row'), T('t.plot'), T('pr.tree'), T('pr.sev'), T('pr.msg')], ...allProblems().map(p => [p.row, p.plot ?? null, p.tree ?? null, T('sev.' + p.severity), T('c.' + p.code, p)])];
  const sheets = [{ name: T('sheet.info'), rows: info, widths: [26, 100] }, { name: T('sheet.trees'), rows: [tt.head, ...tt.rows.map(r => r.cells)], textCols: [0, 1, 2] }];
  if (pt) sheets.push({ name: T('sheet.plots'), rows: [pt.head, ...pt.rows.map(r => r.cells)], textCols: [0, 1] });
  const qt = qualityRows(), ct = compRows();
  sheets.push({ name: T('sheet.quality'), rows: [qt.head, ...qt.rows.map(r => r.cells)], textCols: [0, 1, 2] });
  if (ct) sheets.push({ name: T('sheet.comp'), rows: [ct.head, ...ct.rows.map(r => r.cells)] });
  sheets.push({ name: T('sheet.secs'), rows: secs, textCols: [0, 1, 2] }, { name: T('sheet.probs'), rows: probs, textCols: [1, 2] });
  download(fname('seksiyon-hacmi', 'stem-volume') + '.xlsx', xlsxBlob(XLSX, sheets));
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
    if (saved && saved.v === 1) { S = { ...blank(), ...saved, map: { ...blank().map, ...(saved.map || {}) }, u: { ...blank().u, ...(saved.u || {}) }, adv: { ...blank().adv, ...(saved.adv || {}) } }; if (!approved) S.useDs = false; status(T('restored', { when: new Date(saved.saved).toLocaleString(LOC) })); }
  } catch (e) { S = blank(); }
  render();
})();
