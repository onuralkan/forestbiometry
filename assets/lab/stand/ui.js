// Plot & Stand Metrics: user interface. All arithmetic lives in calc.js.
import * as C from './calc.js';
import { T } from './i18n.js';
import { lang, fmtNum, esc } from '../core/i18n.js';
import { put, get, del } from '../core/store.js';
import { download, downloadCSV, xlsxBlob, loadXLSX } from '../core/export.js';
import { barChart, svgForDownload } from '../core/chart.js';
import { createUnitNav } from '../core/unitnav.js';
import { renderImport } from '../core/importer.js';
import { cellText } from '../core/table.js';
import { parseNumber, toInternal, detectDecimal, defaultDecimal } from '../core/num.js';

const BASE = './', KEY = 'session:' + C.TOOL.id;
const $ = id => document.getElementById(id);
const LOC = lang === 'tr' ? 'tr-TR' : 'en-GB';
const f = (x, d = 2) => fmtNum(x, d);
const perLabel = p => p == null ? T('per.none') : p;
const when = iso => iso ? new Date(iso).toLocaleString(LOC) : '–';

let S = blank(), R = null, approved = null;
function blank() {
  return { v: 1, step: 1, tab: 'units', ds: null, dsSrc: null, scopeOk: false, status: null, emptyCombos: null,
    cls: null, design: { type: 'none', forestArea: '', strata: {} }, selPlot: null, selPer: null, nav: null, tbl: null, domBy: 'both' };
}
let saveT = null;
function save() { clearTimeout(saveT); saveT = setTimeout(flush, 250); }
async function flush() { clearTimeout(saveT); saveT = null; await put(KEY, { ...S, saved: new Date().toISOString() }); }
$('langlink') && $('langlink').addEventListener('click', async e => { e.preventDefault(); const h = e.currentTarget.href; await flush(); location.href = h; });
function status(m, k = '') { const s = $('status'); s.className = 'status ' + k; s.textContent = m || ''; }
const num = v => { const x = parseFloat(String(v).replace(',', '.')); return Number.isFinite(x) ? x : NaN; };

/* ---------------- step 1: data ---------------- */
function dsInfo(ds, name) {
  return T(S.dsSrc && S.dsSrc.kind === 'table' && ds === S.ds ? 'src.info.t' : 'src.info', { name: esc(name || (ds.source && ds.source.trees && ds.source.trees.name) || '–'), trees: fmtNum(ds.trees.length, 0), plots: fmtNum(ds.plots.length, 0), periods: C.periodsOf(ds).filter(p => p != null).length || 1, when: when(ds.created) });
}
function useDataset(ds, src) {
  const probs = C.validateDataset(ds);
  if (probs.length) { status(T('src.bad', { codes: probs.join(', ') }), 'err'); return; }
  S.ds = ds; S.dsSrc = src; S.status = null; S.emptyCombos = null; S.cls = defaultClasses(ds); S.selPlot = null; S.selPer = null; R = null;
  const strata = [...new Set(ds.plots.map(p => p.stratum).filter(Boolean))];
  S.design = { type: 'none', forestArea: '', strata: Object.fromEntries(strata.map(h => [h, ''])) };
  status(''); save(); render();
}
/* ---- direct table import: the tree table as recorded in the field (one row per tree) ---- */
const MAPKEYS = ['plot', 'dbh', 'area', 'height', 'age', 'tree', 'species', 'period', 'stratum', 'status'];
const GUESS = { plot: ['plot', 'plot_id', 'plotno', 'plot_no', 'alan', 'alan_no', 'ornek_alan', 'örnek_alan', 'oa', 'oa_no'], tree: ['treeno', 'tree_no', 'tree', 'tree_id', 'agac', 'ağaç', 'agac_no', 'ağaç_no', 'agacno'],
  dbh: ['dbh', 'dbh_cm', 'd', 'd13', 'd1.3', 'cap', 'çap', 'cap_cm', 'çap_cm', 'gc'], height: ['h', 'height', 'height_m', 'h_m', 'boy', 'boy_m', 'ht'], age: ['age', 'yas', 'yaş', 'age_yr'],
  area: ['plotsize', 'plot_size', 'plotarea', 'plot_area', 'area', 'alan_m2', 'alan_buyuklugu', 'alan_büyüklüğü', 'buyukluk', 'büyüklük'], species: ['species', 'sp', 'tur', 'tür', 'agac_turu', 'ağaç_türü'],
  period: ['period', 'year', 'yil', 'yıl', 'donem', 'dönem'], stratum: ['stratum', 'tabaka'], status: ['status', 'durum'] };
function setTable(st) {
  if (!st.src) { S.tbl = null; save(); renderStep1(); return; }
  const H = st.src.headers.map(h => String(h).trim().toLocaleLowerCase('tr'));
  const map = {}; for (const k of MAPKEYS) { const i = H.findIndex(h => GUESS[k].includes(h)); map[k] = i < 0 ? null : i; }
  S.tbl = { imp: st.imp, src: st.src, map, spec: { decimal: null, decChosen: false, dbhUnit: 'cm', hUnit: 'm', areaUnit: 'm2', areaConst: '' }, problems: null, usedKey: null };
  status(''); save(); renderStep1();
}
const tblKey = () => JSON.stringify([S.tbl.map, S.tbl.spec.decimal, S.tbl.spec.dbhUnit, S.tbl.spec.hUnit, S.tbl.spec.areaUnit, S.tbl.spec.areaConst, S.tbl.src.rows.length, S.tbl.imp && S.tbl.imp.name]);
function renderMap() {
  const box = $('mapbox'); if (!box) return;
  if (!S.tbl || !S.tbl.src) { box.innerHTML = ''; return; }
  const { src, map, spec } = S.tbl, Hd = src.headers;
  const textOf = c => c == null ? [] : src.rows.map(r => r[c]).filter(x => x && x.t === 's').map(x => x.v);
  const dv = detectDecimal(['dbh', 'height', 'age', 'area'].flatMap(k => textOf(map[k])));
  if (!spec.decChosen) spec.decimal = defaultDecimal(dv.verdict);
  const opts = (k, none = true) => (none ? `<option value="">${T('none')}</option>` : '') + Hd.map((h, i) => `<option value="${i}"${map[k] === i ? ' selected' : ''}>${esc(h)}</option>`).join('');
  const sel = (k, req) => `<label>${T('map.' + k)}${req ? ` <span class="muted small">(${T('map.req')})</span>` : ''} <select data-map="${k}">${opts(k)}</select></label>`;
  const unit = (id, cur, list) => `<select data-unit="${id}">${list.map(([v, l]) => `<option value="${v}"${cur === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
  let h = `<div class="card"><h2>${T('map.h')}</h2><div class="lims">${sel('plot', true)}${sel('dbh', true)}<label>${T('map.dunit')} ${unit('dbhUnit', spec.dbhUnit, [['cm', 'cm'], ['mm', 'mm']])}</label>
    ${sel('area', true)}<label>${T('map.aunit')} ${unit('areaUnit', spec.areaUnit, [['m2', 'm²'], ['ha', 'ha']])}</label>
    ${map.area == null ? `<label>${T('map.aconst')} <input type="text" inputmode="decimal" id="aconst" value="${esc(spec.areaConst)}" size="8"></label>` : ''}</div>
    <p class="small"><b>${T('map.opt')}</b></p><div class="lims">${sel('height')}<label>${T('map.hunit')} ${unit('hUnit', spec.hUnit, [['m', 'm'], ['dm', 'dm'], ['cm', 'cm']])}</label>
    ${sel('age')}${sel('tree')}${sel('species')}${sel('period')}${sel('stratum')}${sel('status')}</div>${map.tree == null ? `<p class="muted small">${T('map.notree')}</p>` : ''}</div>`;
  const dmsg = dv.verdict === 'ambiguous' ? T('dec.v.ambiguous', { ex: dv.examples.ambiguous.map(x => `"${x}"`).join(', ') }) : T('dec.v.' + dv.verdict);
  h += `<div class="card"><h2>${T('dec.h')}</h2><p class="note ${dv.verdict === 'ambiguous' || dv.verdict === 'conflict' ? 'warn' : ''}">${esc(dmsg)}</p><div class="radios">
    <label><input type="radio" name="tdec" value="."${spec.decimal === '.' ? ' checked' : ''}> ${T('dec.dot')}</label><label><input type="radio" name="tdec" value=","${spec.decimal === ',' ? ' checked' : ''}> ${T('dec.comma')}</label></div>`;
  const pr = S.tbl.problems;
  if (pr && pr.length) {
    const L = 12, lab = q => q.row != null ? `${T('pr.row', q)}: ${T('pr.' + q.code, { ...q, a: q.a != null ? fmtNum(q.a, 4) : '', b: q.b != null ? fmtNum(q.b, 4) : '' })}` : T('pr.' + q.code);
    h += `<div class="note err" id="tblprob"><p>${T('pr.h', { n: pr.length })}</p><ul class="small">${pr.slice(0, L).map(q => `<li>${esc(lab(q))}</li>`).join('')}</ul>${pr.length > L ? `<p class="small">${T('pr.more', { n: pr.length - L })}</p>` : ''}</div>`;
  }
  const used = S.dsSrc && S.dsSrc.kind === 'table' && S.ds;
  if (used && S.tbl.usedKey === tblKey()) h += `<p class="note ok">${T('map.ok', { trees: fmtNum(S.ds.trees.length, 0), plots: fmtNum(S.ds.plots.length, 0) })}</p>`;
  else if (used) h += `<p class="note warn">${T('map.stale')}</p>`;
  h += `<div class="nav"><button type="button" class="btn" id="usetbl">${T('map.use')}</button></div></div>`;
  box.innerHTML = h;
  const changed = () => { S.tbl.problems = null; save(); renderMap(); };
  box.querySelectorAll('[data-map]').forEach(x => x.addEventListener('change', () => { map[x.dataset.map] = x.value === '' ? null : +x.value; changed(); }));
  box.querySelectorAll('[data-unit]').forEach(x => x.addEventListener('change', () => { spec[x.dataset.unit] = x.value; changed(); }));
  box.querySelectorAll('input[name="tdec"]').forEach(x => x.addEventListener('change', () => { spec.decimal = x.value; spec.decChosen = true; changed(); }));
  $('aconst') && $('aconst').addEventListener('change', e => { spec.areaConst = e.target.value; changed(); });
  $('usetbl').addEventListener('click', () => {
    const r = C.tableToDataset({ ...src, name: S.tbl.imp && S.tbl.imp.name }, map, { ...spec, areaConst: num(spec.areaConst) }, parseNumber, toInternal);
    if (r.problems.length) { S.tbl.problems = r.problems; save(); renderMap(); $('tblprob') && $('tblprob').scrollIntoView({ block: 'nearest' }); return; }
    S.tbl.problems = null; S.tbl.usedKey = tblKey();
    useDataset(r.ds, { kind: 'table', name: S.tbl.imp && S.tbl.imp.name });
  });
}
function defaultClasses(ds) {
  const d = ds.trees.map(t => t.dbh), w = 4;
  if (!d.length) return { mode: 'width', start: 8, width: w, end: 60, openTop: false, breaks: '', hint: null };
  const mn = Math.min(...d), mx = Math.max(...d);
  return { mode: 'width', start: Math.floor(mn / w) * w, width: w, end: Math.max(Math.floor(mx / w) * w + w, Math.floor(mn / w) * w + w), openTop: false, breaks: '', hint: { min: mn, max: mx } };
}
function renderStep1() {
  const el = $('step1');
  let h = `<p class="muted">${T('src.sub')}</p><div id="tblbox"></div><div id="mapbox"></div><div class="card"><h2>${T('src.h')}</h2>`;
  if (approved) h += `<div class="srcbox"><b>${T('src.approved')}</b><p class="small">${dsInfo(approved)}</p><button type="button" class="btn" id="useapp">${T('src.use')}</button></div>`;
  else h += `<p class="note">${T('src.none')} <a href="veri-denetcisi.php">${T('src.checker')}</a></p>`;
  h += `<div class="srcrow"><label class="filebtn small"><input type="file" accept=".json,application/json" id="dsfile"><span>${T('src.filebtn')}</span></label>
    <button type="button" class="btn ghost" id="sample">${T('src.sample')}</button></div><p class="muted small">${T('src.sample.note')}</p>`;
  if (S.ds) {
    h += `<p class="note ok"><b>${T('src.current')}:</b> ${dsInfo(S.ds, S.dsSrc && S.dsSrc.name)}</p>`;
    if (approved && S.dsSrc && S.dsSrc.kind === 'approved' && approved.created !== S.ds.created) h += `<p class="note warn">${T('src.newer')}</p>`;
  }
  h += `</div><div class="card"><h2>${T('scope.h')}</h2><p>${T('scope.sub')}</p><p class="note warn">${T('scope.no')}</p>
    <label class="chk"><input type="checkbox" id="scope"${S.scopeOk ? ' checked' : ''}> ${T('scope.ok')}</label></div>
    <div class="nav"><button type="button" class="btn ghost" id="reset">${T('reset')}</button><button type="button" class="btn" id="to2"${S.ds && S.scopeOk ? '' : ' disabled'}>${T('next')}</button>
    ${!S.ds ? `<span class="muted small">${T('need.ds')}</span>` : !S.scopeOk ? `<span class="muted small">${T('need.scope')}</span>` : ''}</div>`;
  el.innerHTML = h;
  renderImport($('tblbox'), { imp: S.tbl && S.tbl.imp, src: S.tbl && S.tbl.src }, { base: BASE, title: T('tb.h'), sub: T('tb.sub'), onChange: setTable, onError: m => status(m, 'err') });
  renderMap();
  $('useapp') && $('useapp').addEventListener('click', () => useDataset(approved, { kind: 'approved', name: approved.source && approved.source.trees && approved.source.trees.name }));
  $('dsfile').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    try { useDataset(JSON.parse(await file.text()), { kind: 'file', name: file.name }); } catch (err) { status(T('src.readfail'), 'err'); }
  });
  $('sample').addEventListener('click', async () => {
    const ds = await (await fetch(BASE + 'assets/lab/stand/ornek/ornek-veri.json')).json();
    useDataset(ds, { kind: 'sample', name: lang === 'tr' ? 'örnek veri paketi (uydurma)' : 'sample data package (made up)' });
  });
  $('scope').addEventListener('change', e => { S.scopeOk = e.target.checked; save(); renderStep1(); renderSteps(); });
  $('reset').addEventListener('click', async () => { S = blank(); R = null; status(''); render(); await del(KEY); });
  $('to2').addEventListener('click', () => go(2));
}

/* ---------------- step 2: settings ---------------- */
function currentClasses() {
  const c = S.cls;
  if (c.mode === 'width') {
    const b = C.breaksFromWidth(num(c.start), num(c.width), num(c.end));
    if (!b) return { problem: 'cls.width.bad' };
    return C.classesFromBreaks(b, c.openTop);
  }
  const parts = String(c.breaks).trim().split(/[;\s]+/).filter(Boolean).map(num);
  return C.classesFromBreaks(parts, c.openTop);
}
function clsLabel(k) { return k.hi === Infinity ? `≥ ${f(k.lo, 3)}` : `[${f(k.lo, 3)}, ${f(k.hi, 3)})`; }
function missingCombos() {
  const { units, noPeriod } = C.buildUnits(S.ds, { status: null, emptyCombos: null });
  return noPeriod ? [] : units.filter(u => u.state === 'unknown');
}
function renderStep2() {
  const el = $('step2'), ds = S.ds, stats = C.statusesOf(ds), c = S.cls, cl = currentClasses();
  let h = `<div class="card"><h2>${T('st.h')}</h2>`;
  if (stats.length === 1 && stats[0] === '') h += `<p class="muted">${T('st.none')}</p>`;
  else h += `<p class="muted">${T('st.sub')}</p><div class="radios">${stats.map(s => `<label><input type="checkbox" data-st="${esc(s)}"${!S.status || S.status.includes(s) ? ' checked' : ''}> ${s === '' ? T('st.blank') : esc(s)}</label>`).join('')}</div>`;
  h += '</div>';
  const miss = missingCombos();
  if (miss.length) {
    h += `<div class="card"><h2>${T('ec.h')}</h2><p class="muted">${T('ec.sub', { k: miss.length, ex: miss.slice(0, 4).map(u => `${esc(u.plot_id)} / ${esc(perLabel(u.period))}`).join(', ') })}</p>
      <div class="radios col">${['empty', 'unmeasured'].map(v => `<label><input type="radio" name="ec" value="${v}"${S.emptyCombos === v ? ' checked' : ''}> ${T('ec.' + v)}</label>`).join('')}</div>
      ${S.emptyCombos ? '' : `<p class="note warn">${T('ec.undecided')}</p>`}</div>`;
  }
  h += `<div class="card"><h2>${T('dom.title')}</h2><details class="more"><summary>${T('more')}</summary><p class="muted small">${T('dom.sub', { n: C.DOM_PER_HA })}</p></details><p class="small"><b>${T('dom.pick')}</b></p><div class="radios col">
    ${['both', 'd', 'h'].map(v => `<label><input type="radio" name="domby" value="${v}"${S.domBy === v ? ' checked' : ''}> ${T('dom.' + v)}</label>`).join('')}</div>
    <details class="more"><summary>${T('dom.hnote.h')}</summary><p class="muted small">${T('dom.hnote')} ${T('dom.agenote')}</p></details></div>`;
  h += `<div class="card"><h2>${T('cls.h')}</h2><p class="muted">${T('cls.sub')}</p>
    <div class="radios"><label><input type="radio" name="cm" value="width"${c.mode === 'width' ? ' checked' : ''}> ${T('cls.width')}</label><label><input type="radio" name="cm" value="list"${c.mode === 'list' ? ' checked' : ''}> ${T('cls.list')}</label></div>`;
  if (c.mode === 'width') h += `<div class="lims"><label>${T('cls.start')} <input type="text" inputmode="decimal" data-c="start" value="${esc(c.start)}" size="6"></label>
      <label>${T('cls.w')} <input type="text" inputmode="decimal" data-c="width" value="${esc(c.width)}" size="6"></label>
      <label>${T('cls.end')} <input type="text" inputmode="decimal" data-c="end" value="${esc(c.end)}" size="6"></label></div>`;
  else h += `<label class="field"><span>${T('cls.breaks')}</span><input type="text" data-c="breaks" value="${esc(c.breaks)}" placeholder="8 12 16 20 30 50"></label>`;
  h += `<label class="chk"><input type="checkbox" id="opentop"${c.openTop ? ' checked' : ''}> ${T('cls.open')}</label>
    <p class="small" id="clsprev">${clsPreview(cl)}</p>${c.hint ? `<p class="muted small">${T('cls.suggest', { min: f(c.hint.min, 1), max: f(c.hint.max, 1) })}</p>` : ''}</div>`;
  const strata = Object.keys(S.design.strata);
  h += `<div class="card"><h2>${T('des.h')}</h2><p class="muted">${T('des.sub')}</p><div class="radios col">
    ${['none', 'srs', 'strat'].map(v => `<label><input type="radio" name="des" value="${v}"${S.design.type === v ? ' checked' : ''}${v === 'strat' && !strata.length ? ' disabled' : ''}> ${T('des.' + v)}</label>`).join('')}</div>`;
  if (!strata.length) h += `<p class="muted small">${T('des.nostrata')}</p>`;
  if (S.design.type === 'srs') h += `<p class="muted small">${T('des.srs.note')}</p><label class="field"><span>${T('des.area')}</span><input type="text" inputmode="decimal" id="farea" value="${esc(S.design.forestArea)}" size="10"></label>`;
  if (S.design.type === 'strat') h += `<p class="small"><b>${T('des.strata')}</b></p><div class="lims">${strata.map(s => `<label>${esc(s)} <input type="text" inputmode="decimal" data-stratum="${esc(s)}" value="${esc(S.design.strata[s])}" size="8"></label>`).join('')}</div>`;
  h += `</div><div class="nav"><button type="button" class="btn ghost" id="back1">${T('back')}</button><button type="button" class="btn" id="calc"${cl.problem ? ' disabled' : ''}>${T('calc')}</button></div>`;
  el.innerHTML = h;
  el.querySelectorAll('[data-st]').forEach(x => x.addEventListener('change', () => {
    const on = [...el.querySelectorAll('[data-st]')].filter(i => i.checked).map(i => i.dataset.st);
    S.status = on.length === stats.length ? null : on; R = null; save();
  }));
  el.querySelectorAll('input[name="domby"]').forEach(x => x.addEventListener('change', () => { S.domBy = x.value; save(); }));
  el.querySelectorAll('input[name="ec"]').forEach(x => x.addEventListener('change', () => { S.emptyCombos = x.value; R = null; save(); renderStep2(); }));
  el.querySelectorAll('input[name="cm"]').forEach(x => x.addEventListener('change', () => {
    if (x.value === 'list' && !c.breaks) { const b = C.breaksFromWidth(num(c.start), num(c.width), num(c.end)); c.breaks = b ? b.map(v => String(v)).join(' ') : ''; }
    c.mode = x.value; R = null; save(); renderStep2();
  }));
  el.querySelectorAll('[data-c]').forEach(x => x.addEventListener('input', () => {
    c[x.dataset.c] = x.value; R = null; save();
    const k = currentClasses(); $('clsprev').innerHTML = clsPreview(k); $('calc').disabled = !!k.problem;
  }));
  $('opentop').addEventListener('change', e => { c.openTop = e.target.checked; R = null; save(); renderStep2(); });
  el.querySelectorAll('input[name="des"]').forEach(x => x.addEventListener('change', () => { S.design.type = x.value; R = null; save(); renderStep2(); }));
  $('farea') && $('farea').addEventListener('input', e => { S.design.forestArea = e.target.value; R = null; save(); });
  el.querySelectorAll('[data-stratum]').forEach(x => x.addEventListener('input', () => { S.design.strata[x.dataset.stratum] = x.value; R = null; save(); }));
  $('back1').addEventListener('click', () => go(1));
  $('calc').addEventListener('click', () => { compute(); S.tab = 'units'; go(3); });
}
function clsPreview(k) {
  if (k.problem) return `<span class="note err">${T(k.problem)}</span>`;
  const list = k.classes.length > 14 ? [...k.classes.slice(0, 6).map(clsLabel), '…', ...k.classes.slice(-3).map(clsLabel)] : k.classes.map(clsLabel);
  return T('cls.preview', { k: k.classes.length, list: list.join(', ') });
}
function designObj() {
  const d = S.design;
  if (d.type === 'srs') { const a = num(d.forestArea); return { type: 'srs', forestArea_ha: Number.isFinite(a) && a > 0 ? a : undefined }; }
  if (d.type === 'strat') return { type: 'strat', strataArea_ha: Object.fromEntries(Object.entries(d.strata).map(([k, v]) => [k, num(v)])) };
  return { type: 'none' };
}
function compute() {
  const cl = currentClasses();
  R = C.computeAll(S.ds, { status: S.status, emptyCombos: S.emptyCombos }, cl.classes, designObj());
  R.classes = cl.classes;
  fixSel();
}

/* ---------------- step 3: results ---------------- */
const TABS = ['units', 'detail', 'between', 'forest', 'export'];
function renderStep3() {
  if (!R) compute();
  const el = $('step3'), withNav = S.tab === 'detail' && plotIds().length > 1;
  nav.reset();
  el.innerHTML = `<div class="tabs" role="tablist">${TABS.map(t => `<button type="button" role="tab" id="tab-${t}" aria-selected="${S.tab === t}" aria-controls="panel" data-tab="${t}">${T('tab.' + t)}</button>`).join('')}</div>
    <div class="panel${withNav ? ' withnav' : ''}">${withNav ? `<aside class="unav" id="unav" aria-label="${esc(T('nav.list'))}"></aside>` : ''}<div id="panel" role="tabpanel" aria-labelledby="tab-${S.tab}"></div></div><div class="nav"><button type="button" class="btn ghost" id="back2">${T('back')}</button></div>`;
  el.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { S.tab = b.dataset.tab; save(); renderStep3(); }));
  el.querySelector('.tabs').addEventListener('keydown', e => {
    const i = TABS.indexOf(S.tab), d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return; S.tab = TABS[(i + d + TABS.length) % TABS.length]; renderStep3(); $('tab-' + S.tab).focus();
  });
  $('back2').addEventListener('click', () => go(2));
  if (withNav) nav.renderAside($('unav'));
  ({ units: tabUnits, detail: tabDetail, between: tabBetween, forest: tabForest, export: tabExport })[S.tab]($('panel'));
}
const UNIT_COLS = [['plot', m => esc(m.plot_id), 'code'], ['per', m => esc(perLabel(m.period))], ['state', m => T('s.' + m.state)], ['c.area', m => f(m.area_m2, 2), 'num'],
  ['c.n', m => fmtNum(m.n, 0), 'num'], ['c.Nha', m => f(m.Nha, 1), 'num'], ['c.Gha', m => f(m.Gha, 3), 'num'], ['c.dmean', m => f(m.d_mean, 2), 'num'], ['c.dq', m => f(m.dq, 2), 'num'],
  ['c.dmin', m => f(m.d_min, 1), 'num'], ['c.dmax', m => f(m.d_max, 1), 'num'], ['c.dsd', m => f(m.d_sd, 2), 'num'], ['c.hm', m => fmtNum(m.h_measured.n, 0), 'num'],
  ['c.hmean', m => f(m.h_measured.mean, 2), 'num'], ['c.he', m => fmtNum(m.h_estimated.n, 0), 'num']];
/** Dominant-tree columns for the chosen selection ('both' | 'd' | 'h'). */
function domCols() {
  const by = S.domBy || 'both', c = (lab, key, v) => [lab, m => f(m.dom[key][v], v === 'D0' ? 2 : 2), 'num'];
  const cols = by === 'both' ? [c('c.D0d', 'd', 'D0'), c('c.H0d', 'd', 'H0'), c('c.D0h', 'h', 'D0'), c('c.H0h', 'h', 'H0')] : [c('c.D0', by, 'D0'), c('c.H0', by, 'H0')];
  return [...cols, ['c.age', m => f(m.age.mean, 1), 'num'], ['c.agen', m => fmtNum(m.age.n, 0), 'num']];
}
function tabUnits(p) {
  const COLS = [...UNIT_COLS, ...domCols()];
  p.innerHTML = `<p class="muted">${T('units.note')} ${T('units.dom')}</p><div class="tscroll"><table class="grid units"><thead><tr>${COLS.map(c => `<th>${T(c[0])}</th>`).join('')}</tr></thead><tbody>
    ${R.metrics.map((m, i) => `<tr class="st-${m.state}"><td><button type="button" class="linkbtn" data-sel="${i}"><code>${esc(m.plot_id)}</code></button></td>${COLS.slice(1).map(c => `<td class="${c[2] || ''}">${C.isValidUnit(m) || c[0] === 'per' || c[0] === 'state' || c[0] === 'c.area' ? c[1](m) : '–'}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div>`;
  p.querySelectorAll('[data-sel]').forEach(b => b.addEventListener('click', () => { const m = R.metrics[+b.dataset.sel]; S.selPlot = m.plot_id; S.selPer = m.period; S.tab = 'detail'; save(); renderStep3(); }));
}
function chartBox(id, svg, name) { return `<figure class="chartbox" id="${id}">${svg}<figcaption><button type="button" class="btn ghost small" data-svg="${id}" data-name="${esc(name)}">${T('ch.svg')}</button></figcaption></figure>`; }
function bindSvg(p) {
  p.querySelectorAll('[data-svg]').forEach(b => b.addEventListener('click', () => download(b.dataset.name + '.svg', svgForDownload($(b.dataset.svg).querySelector('svg')), 'image/svg+xml')));
}
function tabDetail(p) {
  const m = curMetric();
  if (!m) { p.innerHTML = `<p class="note">${T('nav.empty')}</p>`; return; }
  const unitName = `${m.plot_id} / ${perLabel(m.period)}`, valid = C.isValidUnit(m);
  let h = nav.bar(perSwitch(m));
  const tile = (v, l) => `<div class="tile"><b>${v}</b><span>${l}</span></div>`;
  h += `<h3>${T('det.metrics')}</h3><div class="tiles">${tile(fmtNum(m.n, 0), T('c.n'))}${tile(valid ? f(m.Nha, 1) : '–', T('c.Nha'))}${tile(valid ? f(m.Gha, 3) : '–', T('c.Gha'))}
    ${tile(f(m.d_mean, 2), T('c.dmean'))}${tile(f(m.dq, 2), T('c.dq'))}${tile(f(m.d_sd, 2), T('c.dsd'))}${tile(m.d_min == null ? '–' : `${f(m.d_min, 1)}–${f(m.d_max, 1)}`, T('c.drange'))}${tile(f(m.ef, 4), T('det.ef'))}</div>
    <p class="muted small">${T('c.area')}: ${f(m.area_m2, 2)} · ${T('c.G')}: ${f(m.G_m2, 5)} · ${T('state')}: ${T('s.' + m.state)}</p>`;
  if (!valid) { p.innerHTML = h + `<p class="note warn">${T('units.note')}</p>`; bindDetail(); return; }
  {
    const by = S.domBy === 'both' || !S.domBy ? ['d', 'h'] : [S.domBy], notes = [];
    let tl = '';
    for (const b of by) {
      const r = m.dom[b], suf = by.length > 1 ? ` · ${T('det.by.' + b)}` : '';
      tl += tile(f(r.D0, 2), T('c.D0') + suf) + tile(f(r.H0, 2), T('c.H0') + suf);
      if (r.why && r.why !== 'empty') notes.push(`${T('det.by.' + b)}: ${T('why.' + r.why)}`);
      if (r.short && !notes.includes('short')) notes.push('short');
    }
    tl += tile(f(m.h_measured.mean, 2), T('c.hmean')) + tile(m.age.n ? f(m.age.mean, 1) : '–', `${T('c.age')} · n = ${fmtNum(m.age.n, 0)}`);
    h += `<h3>${T('det.dom')}</h3><p class="muted small">${T('det.domk', { k: f(m.dom.k, 4), n: C.DOM_PER_HA, a: f(m.area_m2, 2) })}</p><div class="tiles" id="domtiles">${tl}</div>
      ${notes.map(x => `<p class="small note warn">${x === 'short' ? T('dom.short', { k: f(m.dom.k, 4), n: m.n }) : esc(x)}</p>`).join('')}`;
  }
  // classes
  const cls = m.classes;
  h += `<h3>${T('det.cls')}</h3><div class="two"><div class="tscroll"><table class="grid"><thead><tr><th>${T('cl.class')}</th><th>${T('cl.mid')}</th><th>${T('cl.n')}</th><th>${T('cl.Nha')}</th><th>${T('cl.Gha')}</th></tr></thead><tbody>
    ${cls.map(k => `<tr><td class="nowrap">${clsLabel(k)}</td><td class="num">${k.hi === Infinity ? '–' : f((k.lo + k.hi) / 2, 3)}</td><td class="num">${fmtNum(k.n, 0)}</td><td class="num">${f(k.Nha, 1)}</td><td class="num">${f(k.Gha, 4)}</td></tr>`).join('')}</tbody></table></div><div>`;
  h += chartBox('ch-cls', barChart({ title: T('ch.cls', { u: unitName }), categories: cls.map(k => k.hi === Infinity ? `≥${f(k.lo, 1)}` : f(k.lo, 1)), series: [{ name: T('ch.y.Nha'), values: cls.map(k => k.Nha) }], xLabel: T('ch.x.cls'), yLabel: T('ch.y.Nha'), fmt: v => f(v, 1) }), `cap-siniflari-${m.plot_id}-${perLabel(m.period)}`);
  if (m.below) h += `<p class="small note warn">${T('cl.below', { b: f(R.classes[0].lo, 3), n: m.below })}</p>`;
  if (m.above) h += `<p class="small note warn">${T('cl.above', { b: f(R.classes[R.classes.length - 1].hi, 3), n: m.above })}</p>`;
  h += '</div></div>';
  // species
  h += `<h3>${T('det.sp')}</h3>`;
  if (!m.n) h += `<p class="muted">${T('sp.none')}</p>`;
  else {
    h += `<p class="small">${T('sp.den', { n: fmtNum(m.shareDen.n, 0), g: f(m.shareDen.G_m2, 5) })}</p><div class="two"><div class="tscroll"><table class="grid"><thead><tr><th>${T('sp.sp')}</th><th>${T('c.n')}</th><th>${T('c.Nha')}</th><th>${T('sp.shareN')}</th><th>${T('c.G')}</th><th>${T('c.Gha')}</th><th>${T('sp.shareG')}</th></tr></thead><tbody>
      ${m.species.map(s => `<tr><td>${esc(s.species)}</td><td class="num">${fmtNum(s.n, 0)}</td><td class="num">${f(s.Nha, 1)}</td><td class="num">${f(s.shareN * 100, 1)}</td><td class="num">${f(s.g, 5)}</td><td class="num">${f(s.Gha, 3)}</td><td class="num">${f(s.shareG * 100, 1)}</td></tr>`).join('')}</tbody></table></div><div>`;
    h += chartBox('ch-sp', barChart({ title: T('ch.sp', { u: unitName }), categories: m.species.map(s => s.species), series: [{ name: T('sp.shareN'), values: m.species.map(s => s.shareN * 100) }, { name: T('sp.shareG'), values: m.species.map(s => s.shareG * 100) }], yLabel: T('ch.y.pct'), fmt: v => f(v, 1) }), `tur-katilimi-${m.plot_id}-${perLabel(m.period)}`);
    h += '</div></div>';
  }
  // heights
  const hr = (lbl, s) => `<tr><th>${lbl}</th><td class="num">${fmtNum(s.n, 0)}</td><td class="num">${f(s.mean, 2)}</td><td class="num">${f(s.sd, 2)}</td><td class="num">${f(s.min, 1)}</td><td class="num">${f(s.max, 1)}</td></tr>`;
  h += `<h3>${T('det.h')}</h3><div class="tscroll"><table class="grid"><thead><tr><th>${T('h.kind')}</th><th>n</th><th>${T('h.mean')}</th><th>${T('h.sd')}</th><th>${T('h.min')}</th><th>${T('h.max')}</th></tr></thead><tbody>
    ${hr(T('h.meas'), m.h_measured)}${hr(T('h.est'), m.h_estimated)}<tr><th>${T('h.none')}</th><td class="num">${fmtNum(m.h_missing, 0)}</td><td colspan="4"></td></tr></tbody></table></div><p class="muted small">${T('h.note')}</p>`;
  p.innerHTML = h; bindDetail(); bindSvg(p);
}

/* Plot / period navigation: the shared navigator (core/unitnav.js) lists the plots beside the detail panel; the
   periods of the chosen plot are a switch in its bar. A change redraws the whole panel, so nothing stale remains. */
const ST_RANK = { measured: 0, empty: 0, unmeasured: 1, unknown: 2 }, ST_NAV = ['ok', 'warning', 'error'];
const samePer = (a, b) => (a ?? null) === (b ?? null);
function plotIds() { return R ? [...new Set(R.metrics.map(m => m.plot_id))] : []; }
const metricsOf = id => R.metrics.filter(m => String(m.plot_id) === String(id));
function curMetric() { return R && R.metrics.find(m => m.plot_id === S.selPlot && samePer(m.period, S.selPer)); }
/** Keeps the selection valid after a (re)computation; converts the index of earlier sessions. */
function fixSel() {
  if (S.sel != null) { const m = R.metrics[S.sel]; if (m && S.selPlot == null) { S.selPlot = m.plot_id; S.selPer = m.period; } delete S.sel; }
  if (curMetric()) return;
  const own = metricsOf(S.selPlot), m = own.find(x => samePer(x.period, S.selPer)) || own[0] || R.metrics[0];
  S.selPlot = m ? m.plot_id : null; S.selPer = m ? m.period : null;
}
function choosePlot(id) {
  const own = metricsOf(id); if (!own.length) return;
  const m = own.find(x => samePer(x.period, S.selPer)) || own[0];        // same period when this plot has it
  S.selPlot = m.plot_id; S.selPer = m.period; redrawDetail();
}
function choosePeriod(i) { const own = metricsOf(S.selPlot), m = own[i]; if (!m) return; S.selPer = m.period; save(); redrawDetail(); $('per-' + i) && $('per-' + i).focus(); }
function redrawDetail() { if (S.tab === 'detail' && $('panel')) { tabDetail($('panel')); if ($('unav')) nav.renderAside($('unav')); } }
function perSwitch(m) {
  const own = metricsOf(m.plot_id);
  if (own.length < 2) return `<div class="perswitch single small muted">${T('per')}: <b>${esc(perLabel(m.period))}</b> · ${T('s.' + m.state)}</div>`;
  return `<div class="perswitch" role="group" aria-label="${esc(T('nav.per'))}"><span class="small muted">${T('per')}:</span>${own.map((x, i) => {
    const on = samePer(x.period, m.period), st = ST_NAV[ST_RANK[x.state]];
    return `<button type="button" class="btn ghost small${on ? ' on' : ''}" id="per-${i}" data-per="${i}" aria-pressed="${on}" title="${esc(T('s.' + x.state))}">${esc(perLabel(x.period))}${st === 'ok' ? '' : ` <span class="ust st-${st}">${st === 'warning' ? '▲' : '◆'}</span>`}</button>`; }).join('')}</div>`;
}
function bindDetail() {
  nav.bindBar();
  const ps = document.querySelector('.perswitch[role="group"]'); if (!ps) return;
  ps.addEventListener('click', e => { const b = e.target.closest('[data-per]'); if (b) choosePeriod(+b.dataset.per); });
  ps.addEventListener('keydown', e => {                                   // ← → move between the periods of this plot
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
    e.preventDefault(); const own = metricsOf(S.selPlot), i = own.findIndex(x => samePer(x.period, S.selPer));
    choosePeriod((i + d + own.length) % own.length);
  });
}
const nav = createUnitNav({
  items: () => plotIds().map(id => {
    const own = metricsOf(id), st = ST_NAV[Math.max(...own.map(x => ST_RANK[x.state] ?? 2))], n = own.reduce((a, x) => a + (x.n || 0), 0);
    return { id, label: String(id), search: String(id), state: st, stateTitle: T('nav.st.' + st), n,
      meta: [own.length > 1 ? T('nav.nper', { k: own.length }) : `n = ${fmtNum(n, 0)}`, own.length > 1 ? `n = ${fmtNum(n, 0)}` : ''],
      barLabel: `${T('plot')} ${id}` };
  }),
  sorts: [
    { key: 'id', label: T('nav.sort.id'), cmp: () => 0 },
    { key: 'n', label: T('nav.sort.n'), cmp: (a, b) => b.n - a.n },
    { key: 'state', label: T('nav.sort.state'), cmp: (a, b) => ST_NAV.indexOf(b.state) - ST_NAV.indexOf(a.state) }],
  texts: { search: T('nav.search'), sort: T('nav.sort'), bad: T('nav.bad'), count: p => T('nav.count', p), none: T('nav.none'), prev: T('nav.prev'), next: T('nav.next'), keys: T('nav.keys'), outside: T('nav.outside') },
  prefs: () => S.nav || (S.nav = { q: '', sort: 'id', bad: false }),
  getSel: () => S.selPlot, setSel: id => choosePlot(plotIds().find(x => String(x) === String(id))), save });
document.addEventListener('keydown', e => { if (R && S.step === 3 && S.tab === 'detail' && plotIds().length > 1) nav.handleKey(e, '.perswitch'); });
function tabBetween(p) {
  let h = `<p class="note">${T('bt.note')}</p>`;
  for (const b of R.byPeriod) {
    const bt = b.between, row = (k, s, d) => `<tr><th>${T('v.' + k)}</th><td class="num">${fmtNum(s.n, 0)}</td><td class="num">${f(s.mean, d)}</td><td class="num">${f(s.sd, d)}</td><td class="num">${f(s.min, d)}</td><td class="num">${f(s.median, d)}</td><td class="num">${f(s.max, d)}</td></tr>`;
    h += `<h3>${T('per')}: ${esc(perLabel(b.period))} · ${T('bt.m', { m: bt.m, e: bt.mEmpty })}</h3>`;
    if (b.unknown || b.unmeasured) h += `<p class="small note warn">${T('bt.excl', { u: b.unknown, x: b.unmeasured })}</p>`;
    h += `<div class="tscroll"><table class="grid"><thead><tr><th>${T('bt.var')}</th><th>${T('bt.k')}</th><th>${T('bt.mean')}</th><th>${T('bt.sd')}</th><th>${T('bt.min')}</th><th>${T('bt.med')}</th><th>${T('bt.max')}</th></tr></thead><tbody>
      ${row('Nha', bt.Nha, 1)}${row('Gha', bt.Gha, 3)}${row('dmean', bt.d_mean, 2)}${row('dq', bt.dq, 2)}${row('area', bt.area_m2, 1)}</tbody></table></div>`;
  }
  p.innerHTML = h + `<p class="muted small">${T('bt.dnote')}</p>`;
}
function feRows(est, keys, label) {
  const tot = keys.some(k => est[k].total != null);
  return `<div class="tscroll"><table class="grid"><thead><tr><th>${T('fe.var')}</th><th>${T('fe.est')}</th><th>${T('fe.se')}</th><th>${T('fe.rse')}</th><th>${T('fe.m')}</th>${est[keys[0]].df != null ? `<th>${T('fe.df')}</th>` : ''}${tot ? `<th>${T('fe.total')}</th><th>${T('fe.setotal')}</th>` : ''}</tr></thead><tbody>
    ${keys.map(k => { const e = est[k], d = k.startsWith('G') ? 3 : 1; return `<tr><th>${label(k)}</th><td class="num">${f(e.mean, d)}</td><td class="num">${f(e.se, d)}</td><td class="num">${f(e.rse == null ? null : e.rse * 100, 1)}</td><td class="num">${e.m}</td>${e.df != null ? `<td class="num">${e.df}</td>` : ''}${tot ? `<td class="num">${f(e.total, d)}</td><td class="num">${f(e.se_total, d)}</td>` : ''}</tr>`; }).join('')}</tbody></table></div>`;
}
function tabForest(p) {
  if (S.design.type === 'none') { p.innerHTML = `<p class="note">${T('fe.none')}</p>`; return; }
  let h = `<p class="note">${T(S.design.type === 'srs' ? 'fe.design.srs' : 'fe.design.strat')}</p>`;
  for (const b of R.byPeriod) {
    const fe = b.forest;
    h += `<h3>${T('per')}: ${esc(perLabel(b.period))}</h3>`;
    if (!fe.estimate) { h += fe.problems.map(pr => `<p class="note err">${T('fe.p.' + pr.code, pr)}</p>`).join(''); continue; }
    const est = fe.estimate;
    h += feRows(est, ['Nha', 'Gha'], k => T('v.' + k));
    if (fe.species.length > 1) h += `<p class="small"><b>${T('fe.sp')}</b></p>` + feRows(est, fe.species.flatMap(s => [`Nha:${s}`, `Gha:${s}`]), k => `${esc(k.split(':').slice(1).join(':'))}: ${T('v.' + k.split(':')[0])}`);
    if (est.Nha.strata) h += `<p class="small"><b>${T('fe.strata')}</b></p><div class="tscroll"><table class="grid"><thead><tr><th></th><th>${T('fe.ha')}</th><th>${T('fe.W')}</th><th>m_h</th><th>ȳ N/ha</th><th>s N/ha</th><th>ȳ G/ha</th><th>s G/ha</th></tr></thead><tbody>
      ${Object.entries(est.Nha.strata).map(([hh, s]) => `<tr><th>${esc(hh)}</th><td class="num">${f(s.area_ha, 2)}</td><td class="num">${f(s.W, 4)}</td><td class="num">${s.m}</td><td class="num">${f(s.mean, 1)}</td><td class="num">${f(s.s, 1)}</td><td class="num">${f(est.Gha.strata[hh].mean, 3)}</td><td class="num">${f(est.Gha.strata[hh].s, 3)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  p.innerHTML = h + `<p class="muted small">${T('fe.nci')}</p>`;
}

/* ---------------- exports ---------------- */
const fname = (a, b) => `${lang === 'tr' ? a : b}-${new Date().toISOString().slice(0, 10)}`;
function unitRows() {
  return [['plot_id', 'period', 'state', 'stratum', 'area_m2', 'expansion_factor', 'n', 'N_ha', 'G_m2', 'G_m2_ha', 'd_mean_cm', 'dq_cm', 'd_min_cm', 'd_max_cm', 'd_sd_cm', 'h_measured_n', 'h_measured_mean_m', 'h_estimated_n', 'h_estimated_mean_m', 'h_missing_n', 'below_classes_n', 'above_classes_n',
    'dominant_k', 'D0_by_dbh_cm', 'H0_by_dbh_m', 'D0_by_height_cm', 'H0_by_height_m', 'age_mean', 'age_n'],
    ...R.metrics.map(m => { const v = C.isValidUnit(m); return [m.plot_id, m.period, m.state, m.stratum, m.area_m2, m.ef, v ? m.n : null, v ? m.Nha : null, v ? m.G_m2 : null, v ? m.Gha : null, m.d_mean, m.dq, m.d_min, m.d_max, m.d_sd,
      m.h_measured.n, m.h_measured.mean, m.h_estimated.n, m.h_estimated.mean, v ? m.h_missing : null, m.below, m.above,
      m.dom.k, m.dom.d.D0, m.dom.d.H0, m.dom.h.D0, m.dom.h.H0, m.age.mean, m.age.n]; })];
}
/**
 * Tree table with the plot's stand parameters appended to every row (the user's field-data layout).
 * Source rows come back unchanged (numbers stay numbers) when the data were loaded as a table here;
 * otherwise the tree records of the data package are written. Names already in the table get "_plot".
 */
function treeExport() {
  const by = S.domBy || 'both', unit = new Map(R.metrics.map(m => [m.plot_id + '\u0000' + (m.period ?? '\u0001'), m]));
  const dom = by === 'both' ? [['D0_d', 'd', 'D0'], ['H0_d', 'd', 'H0'], ['D0_h', 'h', 'D0'], ['H0_h', 'h', 'H0']] : [['D0', by, 'D0'], ['H0', by, 'H0']];
  const add = [...dom.map(([n, b, v]) => [n, m => m.dom[b][v]]), ['hm', m => m.h_measured.mean], ['dm', m => m.d_mean], ['N', m => m.Nha], ['BA', m => m.Gha], ['age', m => m.age.mean], ['Dq', m => m.dq]];
  const fromTable = S.dsSrc && S.dsSrc.kind === 'table' && S.tbl && S.tbl.src && S.tbl.usedKey === tblKey();
  let head, body;
  if (fromTable) {
    const src = S.tbl.src, byRow = new Map(src.rowNumbers.map((r, i) => [r, src.rows[i]]));
    head = src.headers.map(String);
    body = S.ds.trees.map(t => { const r = byRow.get(t.row) || []; return head.map((_, k) => { const c = r[k]; return c == null || cellText(c) === '' ? null : c.t === 'n' ? c.v : cellText(c); }); });
  } else {
    head = ['plot_id', 'tree_id', 'period', 'species', 'dbh_cm', 'height_m', 'age', 'status'];
    body = S.ds.trees.map(t => [t.plot_id, t.tree_id, t.period, t.species, t.dbh, t.height, t.age ?? null, t.status]);
  }
  const taken = new Set(head.map(h => h.toLocaleLowerCase('en'))), names = add.map(([n]) => { let x = n; while (taken.has(x.toLocaleLowerCase('en'))) x += '_plot'; taken.add(x.toLocaleLowerCase('en')); return x; });
  const keep = S.status ? new Set(S.status) : null;
  const rows = [[...head, ...names, ...(keep ? ['in_calc'] : [])], ...S.ds.trees.map((t, i) => {
    const m = unit.get(t.plot_id + '\u0000' + (t.period ?? '\u0001')), ok = m && C.isValidUnit(m);
    return [...body[i], ...add.map(([, g]) => ok ? g(m) : null), ...(keep ? [keep.has(t.status ?? '') ? 1 : 0] : [])];
  })];
  const def = { D0: T('xd.D0', { by: T('xd.by.' + (by === 'both' ? 'd' : by)) }), H0: T('xd.H0', { by: T('xd.by.' + (by === 'both' ? 'd' : by)) }),
    D0_d: T('xd.D0', { by: T('xd.by.d') }), H0_d: T('xd.H0', { by: T('xd.by.d') }), D0_h: T('xd.D0', { by: T('xd.by.h') }), H0_h: T('xd.H0', { by: T('xd.by.h') }),
    hm: T('xd.hm'), dm: T('xd.dm'), N: T('xd.N'), BA: T('xd.BA'), age: T('xd.age'), Dq: T('xd.Dq') };
  const units = { D0: 'cm', D0_d: 'cm', D0_h: 'cm', H0: 'm', H0_d: 'm', H0_h: 'm', hm: 'm', dm: 'cm', N: '1/ha', BA: 'm²/ha', age: T('xd.yr'), Dq: 'cm' };
  const info = [...infoRows(), [], [T('xd.h')], [T('xd.col'), T('xd.def'), T('xd.unit')], ...add.map(([n], i) => [names[i], def[n], units[n]]),
    ...(keep ? [['in_calc', T('xd.used'), '']] : []), [], ['', T('xd.k')], ['', T('xd.empty')]];
  return { rows, info };
}
function classRows() {
  return [['plot_id', 'period', 'class_lower_cm', 'class_upper_cm', 'n', 'N_ha', 'G_m2_ha'],
    ...R.metrics.filter(C.isValidUnit).flatMap(m => m.classes.map(k => [m.plot_id, m.period, k.lo, k.hi === Infinity ? null : k.hi, k.n, k.Nha, k.Gha]))];
}
function speciesRows() {
  return [['plot_id', 'period', 'species', 'n', 'N_ha', 'share_of_n', 'n_denominator', 'g_m2', 'G_m2_ha', 'share_of_g', 'g_denominator_m2'],
    ...R.metrics.filter(C.isValidUnit).flatMap(m => m.species.map(s => [m.plot_id, m.period, s.species, s.n, s.Nha, s.shareN, m.shareDen.n, s.g, s.Gha, s.shareG, m.shareDen.G_m2]))];
}
function betweenRows() {
  const out = [['period', 'variable', 'plots', 'mean', 'sd', 'min', 'median', 'max']];
  for (const b of R.byPeriod) for (const [k, key] of [['N_ha', 'Nha'], ['G_m2_ha', 'Gha'], ['d_mean_cm', 'd_mean'], ['dq_cm', 'dq'], ['area_m2', 'area_m2']]) { const s = b.between[key]; out.push([b.period, k, s.n, s.mean, s.sd, s.min, s.median, s.max]); }
  return out;
}
function forestRows() {
  const out = [['period', 'design', 'variable', 'estimate_per_ha', 'se', 'relative_se', 'plots_m', 'df', 'total', 'se_total', 'problem']];
  for (const b of R.byPeriod) {
    const fe = b.forest; if (!fe) continue;
    if (!fe.estimate) { out.push([b.period, S.design.type, null, null, null, null, null, null, null, null, fe.problems.map(x => x.code + (x.stratum ? ':' + x.stratum : '')).join(' ')]); continue; }
    for (const [k, e] of Object.entries(fe.estimate)) out.push([b.period, S.design.type, k, e.mean, e.se, e.rse, e.m, e.df ?? null, e.total ?? null, e.se_total ?? null, null]);
  }
  return out;
}
function infoRows() {
  const c = S.cls;
  return [[T('x.k'), T('x.v')], [T('x.tool'), `${C.TOOL.id} ${C.TOOL.version}`], [T('x.date'), new Date().toISOString()], [T('x.src'), `${S.dsSrc ? S.dsSrc.name || S.dsSrc.kind : ''} (${S.ds.created})`],
    [T('x.status'), S.status ? S.status.map(s => s || T('st.blank')).join(', ') : T('x.all')], [T('x.ec'), S.emptyCombos ? T('ec.' + S.emptyCombos) : T('ec.undecided')],
    [T('x.cls'), R.classes.map(clsLabel).join(' ')], [T('x.design'), T('des.' + S.design.type)], [T('dom.pick'), T('dom.' + (S.domBy || 'both'))], ['', T('x.formulas')], ['', T('scope.no')]];
}
function tabExport(p) {
  p.innerHTML = `<div class="exports"><button type="button" class="btn" id="x-trees">${T('ex.trees')}</button></div><p class="muted small">${T('ex.trees.note')}</p>
    <div class="exports"><button type="button" class="btn ghost" id="x-xlsx">${T('ex.xlsx')}</button><button type="button" class="btn ghost" id="x-units">${T('ex.units')}</button>
    <button type="button" class="btn ghost" id="x-cls">${T('ex.cls')}</button><button type="button" class="btn ghost" id="x-sp">${T('ex.sp')}</button></div><p class="muted small">${T('ex.note')}</p>`;
  $('x-units').addEventListener('click', () => downloadCSV(fname('ornek-alanlar', 'plots') + '.csv', unitRows(), lang));
  $('x-cls').addEventListener('click', () => downloadCSV(fname('cap-siniflari', 'diameter-classes') + '.csv', classRows(), lang));
  $('x-sp').addEventListener('click', () => downloadCSV(fname('tur-katilimi', 'species') + '.csv', speciesRows(), lang));
  $('x-trees').addEventListener('click', async () => {
    let XLSX; try { status(T('busy')); XLSX = await loadXLSX(BASE); status(''); } catch (e) { status('XLSX', 'err'); return; }
    const x = treeExport(), base = ((S.dsSrc && S.dsSrc.name) || 'data').replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}_-]+/gu, '-').slice(0, 60);
    download(`${base}-${lang === 'tr' ? 'mescere' : 'stand'}.xlsx`, xlsxBlob(XLSX, [{ name: T('sheet.data'), rows: x.rows }, { name: T('sheet.info'), rows: x.info, widths: [22, 90, 10] }]));
  });
  $('x-xlsx').addEventListener('click', async () => {
    let XLSX; try { status(T('busy')); XLSX = await loadXLSX(BASE); status(''); } catch (e) { status('XLSX', 'err'); return; }
    const sheets = [{ name: T('sheet.info'), rows: infoRows(), widths: [30, 90] }, { name: T('sheet.units'), rows: unitRows() }, { name: T('sheet.cls'), rows: classRows() },
      { name: T('sheet.sp'), rows: speciesRows() }, { name: T('sheet.between'), rows: betweenRows() }];
    if (S.design.type !== 'none') sheets.push({ name: T('sheet.forest'), rows: forestRows() });
    download(fname('ornek-alan-mescere', 'plot-stand-metrics') + '.xlsx', xlsxBlob(XLSX, sheets));
  });
}

/* ---------------- shell ---------------- */
function canGo(n) { if (n <= 1) return true; if (!S.ds || !S.scopeOk) return false; if (n === 2) return true; return !currentClasses().problem; }
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
    const a = await get('dataset:approved');
    if (a && !C.validateDataset(a).length) approved = a;
    const saved = await get(KEY);
    if (saved && saved.v === 1) { S = { ...blank(), ...saved }; status(T('restored', { when: when(saved.saved) })); }
  } catch (e) { S = blank(); }
  render();
})();
