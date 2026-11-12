// Stand Structure: user interface. All arithmetic lives in calc.js, spatial.js, competition.js and run.js.
import * as S from './calc.js';
import { analyse } from './run.js';
import { appendColumns } from './competition.js';
import { T } from './i18n.js';
import { lang, fmtNum, esc } from '../core/i18n.js';
import { put, get, del } from '../core/store.js';
import { download, downloadCSV, downloadJSON, xlsxBlob, loadXLSX } from '../core/export.js';
import { barChart, plotChart, svgForDownload } from '../core/chart.js';
import { createUnitNav } from '../core/unitnav.js';
import { renderImport, readImport } from '../core/importer.js';
import { cellText } from '../core/table.js';
import { parseNumber, toInternal, detectDecimal, defaultDecimal } from '../core/num.js';
import { tableToDataset, validateDataset } from '../stand/calc.js';

const BASE = './', KEY = 'session:' + S.TOOL.id, $ = id => document.getElementById(id), LOC = lang === 'tr' ? 'tr-TR' : 'en-GB';
const f = (x, d = 3) => x == null || !Number.isFinite(x) ? '–' : fmtNum(x, d);
const num = v => { const t = String(v ?? '').trim().replace(',', '.'); if (t === '') return NaN; const x = Number(t); return Number.isFinite(x) ? x : NaN; };
const perLabel = p => p == null ? T('per.none') : p;
const ukey = u => u.plot_id + '|' + (u.period ?? '');

let st = blank(), R = null, approved = null;
function blank() {
  return { v: 1, step: 1, tab: 'units', ds: null, dsSrc: null, tbl: null, sel: null, nav: null, allCols: false,
    set: { classStart: '0', classWidth: '4', giniOn: 'g', balTies: 'exclude', sdiBeta: '1.605', sdiRef: '25', rdExp: '0.5', spacing: 'square', h0From: 'dbh' },
    geo: { shape: 'circle-area', cx: '0', cy: '0', r: '', x0: '', y0: '', x1: '', y1: '', k: '4', edge: 'none', buffer: '5', ciMode: 'knn', radius: '' } };
}
let saveT = null;
function save() { clearTimeout(saveT); saveT = setTimeout(flush, 250); }
async function flush() { clearTimeout(saveT); saveT = null; await put(KEY, { ...st, saved: new Date().toISOString() }); }
$('langlink') && $('langlink').addEventListener('click', async e => { e.preventDefault(); const h = e.currentTarget.href; await flush(); location.href = h; });
function status(m, k = '') { const s = $('status'); s.className = 'status ' + k; s.textContent = m || ''; }
const hasXY = ds => !!ds && ds.trees.some(t => Number.isFinite(t.x) && Number.isFinite(t.y));

/* ---------------- step 1: data ---------------- */
const MAPKEYS = ['plot', 'dbh', 'area', 'tree', 'species', 'height', 'period', 'x', 'y'];
const GUESS = { plot: ['plot', 'plot_id', 'alan', 'alan_no', 'ornek_alan', 'örnek_alan', 'oa'], dbh: ['dbh', 'dbh_cm', 'd', 'd13', 'cap', 'çap', 'cap_cm', 'çap_cm'], area: ['plot_area', 'plotarea', 'area', 'alan_buyuklugu', 'alan_büyüklüğü', 'alan_m2', 'buyukluk'],
  tree: ['tree', 'tree_id', 'agac', 'ağaç', 'agac_no', 'ağaç_no'], species: ['species', 'sp', 'tur', 'tür'], height: ['h', 'height', 'boy', 'boy_m', 'height_m'], period: ['period', 'year', 'yil', 'yıl', 'donem', 'dönem'],
  x: ['x', 'x_m', 'koordx', 'dogu'], y: ['y', 'y_m', 'koordy', 'kuzey'] };
function useDataset(ds, src) {
  const probs = validateDataset(ds);
  if (probs.length) { status(T('src.bad', { codes: probs.join(', ') }), 'err'); return; }
  st.ds = ds; st.dsSrc = src; st.sel = null; R = null; status(''); save(); render();
}
function setTable(s) {
  if (!s.src) { st.tbl = null; save(); renderStep1(); return; }
  const H = s.src.headers.map(h => String(h).trim().toLocaleLowerCase('tr')), map = {};
  for (const k of MAPKEYS) { const i = H.findIndex(h => GUESS[k].includes(h)); map[k] = i < 0 ? null : i; }
  st.tbl = { imp: s.imp, src: s.src, map, spec: { decimal: null, decChosen: false, dbhUnit: 'cm', hUnit: 'm', areaUnit: 'm2', areaConst: '' }, problems: null, used: false };
  status(''); save(); renderStep1();
}
function renderMap() {
  const box = $('mapbox'); if (!box) return;
  if (!st.tbl || !st.tbl.src) { box.innerHTML = ''; return; }
  const { src, map, spec } = st.tbl, textOf = c => c == null ? [] : src.rows.map(r => r[c]).filter(x => x && x.t === 's').map(x => x.v);
  const dv = detectDecimal(['dbh', 'height', 'area', 'x', 'y'].flatMap(k => textOf(map[k])));
  if (!spec.decChosen) spec.decimal = defaultDecimal(dv.verdict);
  const opts = k => `<option value="">${T('none')}</option>` + src.headers.map((h, i) => `<option value="${i}"${map[k] === i ? ' selected' : ''}>${esc(h)}</option>`).join('');
  const sel = (k, req) => `<label>${T('map.' + k)}${req ? ` <span class="muted small">(${T('map.req')})</span>` : ''} <select data-map="${k}">${opts(k)}</select></label>`;
  const unit = (id, cur, list) => `<select data-unit="${id}">${list.map(([v, l]) => `<option value="${v}"${cur === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
  let h = `<div class="card"><h2>${T('map.h')}</h2><div class="lims">${sel('plot', true)}${sel('dbh', true)}<label>${T('map.dunit')} ${unit('dbhUnit', spec.dbhUnit, [['cm', 'cm'], ['mm', 'mm']])}</label>
    ${sel('area', true)}<label>${T('map.aunit')} ${unit('areaUnit', spec.areaUnit, [['m2', 'm²'], ['ha', 'ha']])}</label>${map.area == null ? `<label>${T('map.aconst')} <input type="text" inputmode="decimal" id="aconst" size="8" value="${esc(spec.areaConst)}"></label>` : ''}</div>
    <p class="small"><b>${T('map.opt')}</b></p><div class="lims">${sel('tree')}${sel('species')}${sel('height')}<label>${T('map.hunit')} ${unit('hUnit', spec.hUnit, [['m', 'm'], ['dm', 'dm'], ['cm', 'cm']])}</label>${sel('period')}${sel('x')}${sel('y')}</div></div>`;
  const dmsg = dv.verdict === 'ambiguous' ? T('dec.v.ambiguous', { ex: dv.examples.ambiguous.map(x => `"${x}"`).join(', ') }) : T('dec.v.' + dv.verdict);
  h += `<div class="card"><h2>${T('dec.h')}</h2><p class="note ${dv.verdict === 'ambiguous' || dv.verdict === 'conflict' ? 'warn' : ''}">${esc(dmsg)}</p><div class="radios">
    <label><input type="radio" name="tdec" value="."${spec.decimal === '.' ? ' checked' : ''}> ${T('dec.dot')}</label><label><input type="radio" name="tdec" value=","${spec.decimal === ',' ? ' checked' : ''}> ${T('dec.comma')}</label></div>`;
  const pr = st.tbl.problems;
  if (pr && pr.length) h += `<div class="note err" id="tblprob"><p>${T('pr.h', { n: pr.length })}</p><ul class="small">${pr.slice(0, 12).map(q => `<li>${esc(q.row != null ? T('pr.row', q) + ': ' + T('pr.' + q.code, q) : T('pr.' + q.code, q))}</li>`).join('')}</ul>${pr.length > 12 ? `<p class="small">${T('pr.more', { n: pr.length - 12 })}</p>` : ''}</div>`;
  if (st.tbl.used && st.ds && st.dsSrc && st.dsSrc.kind === 'table') h += `<p class="note ok">${T('map.ok', { trees: fmtNum(st.ds.trees.length, 0), plots: fmtNum(st.ds.plots.length, 0) })}</p>`;
  h += `<div class="nav"><button type="button" class="btn" id="usetbl">${T('map.use')}</button></div></div>`;
  box.innerHTML = h;
  const changed = () => { st.tbl.problems = null; st.tbl.used = false; save(); renderMap(); };
  box.querySelectorAll('[data-map]').forEach(x => x.addEventListener('change', () => { map[x.dataset.map] = x.value === '' ? null : +x.value; changed(); }));
  box.querySelectorAll('[data-unit]').forEach(x => x.addEventListener('change', () => { spec[x.dataset.unit] = x.value; changed(); }));
  box.querySelectorAll('input[name="tdec"]').forEach(x => x.addEventListener('change', () => { spec.decimal = x.value; spec.decChosen = true; changed(); }));
  $('aconst') && $('aconst').addEventListener('change', e => { spec.areaConst = e.target.value; changed(); });
  $('usetbl').addEventListener('click', () => {
    const r = tableToDataset({ ...src, name: st.tbl.imp && st.tbl.imp.name }, map, { ...spec, areaConst: num(spec.areaConst) }, parseNumber, toInternal);
    if (r.problems.length) { st.tbl.problems = r.problems; save(); renderMap(); $('tblprob') && $('tblprob').scrollIntoView({ block: 'nearest' }); return; }
    st.tbl.problems = null; st.tbl.used = true; useDataset(r.ds, { kind: 'table', name: st.tbl.imp && st.tbl.imp.name });
  });
}
const dsInfo = (ds, name) => T('src.info', { name: esc(name || (ds.source && ds.source.trees && ds.source.trees.name) || '–'), trees: fmtNum(ds.trees.length, 0), plots: fmtNum(ds.plots.length, 0), xy: hasXY(ds) });
function renderStep1() {
  const el = $('step1');
  let h = `<div id="tblbox"></div><div id="mapbox"></div><div class="card"><h2>${T('src.h')}</h2>`;
  h += approved ? `<div class="srcbox"><b>${T('src.approved')}</b><p class="small">${dsInfo(approved)}</p><button type="button" class="btn" id="useapp">${T('src.use')}</button></div>`
    : `<p class="note">${T('src.none')} <a href="veri-denetcisi.php">${T('src.checker')}</a></p>`;
  h += `<div class="srcrow"><button type="button" class="btn ghost" id="sample">${T('src.sample')}</button></div><p class="muted small">${T('src.sample.note')}</p>`;
  if (st.ds) h += `<p class="note ok" id="dsinfo"><b>${T('src.current')}:</b> ${dsInfo(st.ds, st.dsSrc && st.dsSrc.name)}</p>`;
  h += `</div><div class="nav"><button type="button" class="btn ghost" id="reset">${T('reset')}</button><button type="button" class="btn" id="to2"${st.ds ? '' : ' disabled'}>${T('next')}</button>${st.ds ? '' : `<span class="muted small">${T('need.ds')}</span>`}</div>`;
  el.innerHTML = h;
  renderImport($('tblbox'), { imp: st.tbl && st.tbl.imp, src: st.tbl && st.tbl.src }, { base: BASE, title: T('tb.h'), sub: T('tb.sub'), onChange: setTable, onError: m => status(m, 'err') });
  renderMap();
  $('useapp') && $('useapp').addEventListener('click', () => useDataset(approved, { kind: 'approved', name: approved.source && approved.source.trees && approved.source.trees.name }));
  $('sample').addEventListener('click', async () => {
    const buf = await (await fetch(BASE + 'assets/lab/structure/ornek/ornek-mescere.csv')).arrayBuffer();
    const imp = { kind: 'csv', name: lang === 'tr' ? 'ornek-mescere.csv (benzetim)' : 'ornek-mescere.csv (simulated)', buf, encoding: 'utf-8', delim: null, header: true, sheet: null };
    setTable({ imp, src: await readImport(imp, BASE) });
    st.tbl.spec.decimal = '.'; st.tbl.spec.decChosen = true; renderMap(); $('usetbl').click();
  });
  $('reset').addEventListener('click', async () => { st = blank(); R = null; status(''); render(); await del(KEY); });
  $('to2').addEventListener('click', () => go(2));
}

/* ---------------- step 2: settings ---------------- */
function settings() {
  const s = st.set, g = st.geo;
  const structure = { classStart: num(s.classStart), classWidth: num(s.classWidth), giniOn: s.giniOn, balTies: s.balTies, sdiBeta: num(s.sdiBeta), sdiRef: num(s.sdiRef), rdExp: num(s.rdExp), spacing: s.spacing, h0From: s.h0From };
  const geometry = g.shape === 'circle-area' ? { shape: 'circle-area', cx: num(g.cx), cy: num(g.cy) } : g.shape === 'circle' ? { shape: 'circle', cx: num(g.cx), cy: num(g.cy), r: num(g.r) } : { shape: 'rect', x0: num(g.x0), y0: num(g.y0), x1: num(g.x1), y1: num(g.y1) };
  const spatial = hasXY(st.ds) ? { k: num(g.k), edge: g.edge, buffer: num(g.buffer) } : null;
  const competition = { mode: g.ciMode, k: num(g.k), radius: g.ciMode === 'radius' ? num(g.radius) : null, edge: g.edge, buffer: num(g.buffer) };
  return { structure, spatial, geometry, competition };
}
const settingsProblems = () => S.checkSettings({ ...S.DEFAULTS, ...settings().structure }).length ? [T('set.bad')] : [];
function renderStep2() {
  const el = $('step2'), s = st.set, g = st.geo, xy = hasXY(st.ds);
  const inp = (id, v, lab, size = 6) => `<label>${lab} <input type="text" inputmode="decimal" size="${size}" data-set="${id}" value="${esc(v)}"></label>`;
  const radio = (name, cur, vals) => `<span class="radios">${vals.map(([v, l]) => `<label class="small"><input type="radio" name="${name}" value="${v}"${cur === v ? ' checked' : ''}> ${l}</label>`).join(' ')}</span>`;
  let h = `<div class="card"><h2>${T('set.h')}</h2>
    <div class="lims"><span class="small"><b>${T('set.cls')}</b></span>${inp('classStart', s.classStart, T('set.cstart'))}${inp('classWidth', s.classWidth, T('set.cwidth'))}</div>
    <div class="lims"><span class="small"><b>${T('set.gini')}</b></span>${radio('giniOn', s.giniOn, [['g', T('set.gini.g')], ['d', T('set.gini.d')]])}</div>
    <div class="lims"><span class="small"><b>${T('set.ties')}</b></span>${radio('balTies', s.balTies, [['exclude', T('set.ties.exclude')], ['include', T('set.ties.include')]])}</div>
    <div class="lims"><span class="small"><b>${T('set.sdi')}</b></span>${inp('sdiBeta', s.sdiBeta, T('set.beta'))}${radio('sdiRef', s.sdiRef, [['25', T('set.ref.25')], ['25.4', T('set.ref.254')]])}</div>
    <div class="lims">${inp('rdExp', s.rdExp, T('set.rd'))}<span class="muted small">${T('set.rd.note')}</span></div>
    <div class="lims"><span class="small"><b>${T('set.sp')}</b></span>${radio('spacing', s.spacing, [['square', T('set.sp.square')], ['triangular', T('set.sp.triangular')]])}
      <span class="small"><b>${T('set.h0')}</b></span>${radio('h0From', s.h0From, [['dbh', T('set.h0.dbh')], ['height', T('set.h0.height')]])}</div></div>`;
  h += `<div class="card" id="geocard"><h2>${T('geo.h')}</h2>`;
  if (!xy) h += `<p class="note">${T('geo.noxy')}</p>`;
  else {
    h += `<p class="small"><b>${T('geo.shape')}</b></p><div class="radios col">${['circle-area', 'circle', 'rect'].map(v => `<label><input type="radio" name="gshape" value="${v}"${g.shape === v ? ' checked' : ''}> ${T('geo.' + v)}</label>`).join('')}</div>
      <div class="lims">${g.shape === 'rect' ? inp('g.x0', g.x0, 'x₀') + inp('g.y0', g.y0, 'y₀') + inp('g.x1', g.x1, 'x₁') + inp('g.y1', g.y1, 'y₁') : inp('g.cx', g.cx, 'x') + inp('g.cy', g.cy, 'y') + (g.shape === 'circle' ? inp('g.r', g.r, 'r (m)') : '')}</div>
      <p class="muted small">${T('geo.note')}</p>
      <div class="lims">${inp('g.k', g.k, T('geo.k'), 4)}<span class="small"><b>${T('geo.edge')}</b></span>${radio('gedge', g.edge, ['none', 'buffer', 'toroidal'].map(v => [v, T('geo.edge.' + v)]))}${g.edge === 'buffer' ? inp('g.buffer', g.buffer, T('geo.buffer')) : ''}</div>
      <div class="lims"><span class="small"><b>${T('geo.ci')}</b></span>${radio('gci', g.ciMode, [['knn', T('geo.ci.knn')], ['radius', T('geo.ci.radius')]])}${g.ciMode === 'radius' ? inp('g.radius', g.radius, T('geo.radius')) : ''}</div>
      <p class="muted small">${T('geo.src')}</p>`;
  }
  h += `</div>`;
  const pr = settingsProblems();
  h += `<div class="nav"><button type="button" class="btn ghost" id="back1">${T('back')}</button><button type="button" class="btn" id="calc"${pr.length ? ' disabled' : ''}>${T('calc')}</button>${pr.length ? `<span class="muted small">${pr.join(' ')}</span>` : ''}</div>`;
  el.innerHTML = h;
  const re = () => { R = null; save(); renderStep2(); renderSteps(); };
  el.querySelectorAll('[data-set]').forEach(x => x.addEventListener('change', () => { const k = x.dataset.set; if (k.startsWith('g.')) st.geo[k.slice(2)] = x.value; else st.set[k] = x.value; re(); }));
  for (const n of ['giniOn', 'balTies', 'sdiRef', 'spacing', 'h0From']) el.querySelectorAll(`input[name="${n}"]`).forEach(x => x.addEventListener('change', () => { st.set[n] = x.value; re(); }));
  el.querySelectorAll('input[name="gshape"]').forEach(x => x.addEventListener('change', () => { st.geo.shape = x.value; re(); }));
  el.querySelectorAll('input[name="gedge"]').forEach(x => x.addEventListener('change', () => { st.geo.edge = x.value; re(); }));
  el.querySelectorAll('input[name="gci"]').forEach(x => x.addEventListener('change', () => { st.geo.ciMode = x.value; re(); }));
  $('back1').addEventListener('click', () => go(1));
  $('calc').addEventListener('click', () => { compute(); st.tab = 'units'; go(3); });
}

/* ---------------- step 3: results ---------------- */
function compute() { R = analyse(st.ds, settings()); R.created = new Date().toISOString(); if (!R.units.some(u => ukey(u) === st.sel)) st.sel = R.units.length ? ukey(R.units[0]) : null; save(); }
const COLS = [['c.n', u => u.n, 0], ['c.Nha', u => u.st.Nha, 1], ['c.Gha', u => u.st.Gha, 3], ['c.Dq', u => u.st.Dq, 2], ['c.H0', u => u.st.H0, 2], ['c.cv', u => m(u, 'cv'), 3], ['c.skew', u => m(u, 'skew'), 3, 1], ['c.kurt', u => m(u, 'kurt'), 3, 1],
  ['c.gini', u => m(u, 'gini'), 3], ['c.shD', u => m(u, 'shannonD'), 3], ['c.shS', u => m(u, 'shannonSp'), 3, 1], ['c.simp', u => m(u, 'simpson'), 3], ['c.sdi', u => m(u, 'sdi'), 1], ['c.rd', u => m(u, 'rd'), 2], ['c.hart', u => m(u, 'hartPct'), 1, 1],
  ['c.R', u => u.sp.status === 'ok' ? u.sp.ce.R : null, 3], ['c.RD', u => u.sp.status === 'ok' ? u.sp.ce.RD : null, 3], ['c.W', u => spm(u, 'W'), 3], ['c.M', u => spm(u, 'M'), 3], ['c.T', u => spm(u, 'T'), 3], ['c.U', u => spm(u, 'U'), 3, 1],
  ['c.hegyi', u => { if (u.ci.status !== 'ok') return null; const v = u.ci.trees.map(t => t.hegyi).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; }, 3, 1]];
function m(u, k) { return u.st.status === 'ok' && u.st.measures ? u.st.measures[k] : null; }
function spm(u, k) { return u.sp.status === 'ok' ? u.sp.means[k] : null; }
const uState = u => u.st.status !== 'ok' ? u.st.status : (u.sp.status === 'invalid' || u.ci.status === 'invalid') ? 'invalid' : u.st.warnings.length || (u.sp.warnings || []).length || (u.ci.warnings || []).length ? 'warning' : 'ok';
const curUnit = () => R && R.units.find(u => ukey(u) === st.sel);
function renderStep3() {
  if (!R) compute();
  const el = $('step3'), tabs = ['units', 'detail', 'export'];
  const withNav = st.tab === 'detail' && R.units.length > 1;
  el.innerHTML = `${R.skipped.length ? `<p class="note warn small">${T('res.skipped', { n: R.skipped.length })}</p>` : ''}<div class="tabs" role="tablist">${tabs.map(t => `<button type="button" role="tab" id="tab-${t}" aria-selected="${st.tab === t}" aria-controls="panel">${T('res.' + t)}</button>`).join('')}</div>
    <div class="panel${withNav ? ' withnav' : ''}">${withNav ? `<aside class="unav" id="unav"></aside>` : ''}<div id="panel" role="tabpanel"></div></div>`;
  tabs.forEach(t => $('tab-' + t).addEventListener('click', () => { st.tab = t; save(); renderStep3(); }));
  const p = $('panel');
  if (st.tab === 'units') tabUnits(p); else if (st.tab === 'detail') tabDetail(p); else tabExport(p);
  if (withNav) nav.renderAside($('unav'));
}
function tabUnits(p) {
  const cols = COLS.filter(c => st.allCols || !c[3]);
  p.innerHTML = `<p class="muted small">${T('units.note')}</p><label class="chk small"><input type="checkbox" id="allcols"${st.allCols ? ' checked' : ''}> ${T('units.all')}</label>
    <div class="tscroll"><table class="grid" id="utab"><thead><tr><th>${T('c.unit')}</th><th>${T('c.period')}</th>${cols.map(c => `<th>${T(c[0])}</th>`).join('')}<th>${T('c.state')}</th></tr></thead><tbody>
    ${R.units.map(u => `<tr data-key="${esc(ukey(u))}"${uState(u) === 'invalid' ? ' class="st-bad"' : ''}><td><button type="button" class="linkbtn" data-sel="${esc(ukey(u))}"><code>${esc(u.plot_id)}</code></button></td><td>${esc(perLabel(u.period))}</td>${cols.map(c => `<td class="num">${f(c[1](u), c[2])}</td>`).join('')}<td>${T('st.' + (u.st.status === 'ok' ? 'ok' : u.st.status))}</td></tr>`).join('')}</tbody></table></div>`;
  $('allcols').addEventListener('change', e => { st.allCols = e.target.checked; save(); tabUnits(p); });
  p.querySelectorAll('[data-sel]').forEach(b => b.addEventListener('click', () => { st.sel = b.dataset.sel; st.tab = 'detail'; save(); renderStep3(); }));
}
const nav = createUnitNav({
  items: () => R.units.map(u => { const s = uState(u); return { id: ukey(u), label: `${u.plot_id} · ${perLabel(u.period)}`, search: String(u.plot_id), state: s === 'invalid' ? 'error' : s === 'warning' ? 'warning' : 'ok', stateTitle: T('nav.st.' + (s === 'invalid' ? 'error' : s === 'warning' ? 'warning' : 'ok')), n: u.n, meta: [`n = ${fmtNum(u.n, 0)}`] }; }),
  sorts: [{ key: 'id', label: T('nav.sort.id'), cmp: () => 0 }, { key: 'n', label: T('nav.sort.n'), cmp: (a, b) => b.n - a.n }],
  texts: { search: T('nav.search'), sort: T('nav.sort'), bad: T('nav.bad'), count: q => T('nav.count', q), none: T('nav.none'), prev: T('nav.prev'), next: T('nav.next'), keys: T('nav.keys'), outside: T('nav.outside') },
  prefs: () => st.nav || (st.nav = { q: '', sort: 'id', bad: false }), getSel: () => st.sel, setSel: id => { st.sel = id; save(); tabDetail($('panel')); }, save });
document.addEventListener('keydown', e => { if (R && st.step === 3 && st.tab === 'detail' && R.units.length > 1) nav.handleKey(e); });
function chartBox(id, svg, name) { return `<figure class="chartbox" id="${id}">${svg}<figcaption><button type="button" class="btn ghost small" data-svg="${id}" data-name="${esc(name)}">SVG</button></figcaption></figure>`; }
const MAPX = 3;                                   // stem circles: diameter enlarged 3 times (drawing only)
function stemMap(u, G) {
  const W = 420, P = 20, ext = G.shape === 'circle' ? [G.cx - G.r, G.cy - G.r, G.cx + G.r, G.cy + G.r] : [G.x0, G.y0, G.x1, G.y1], sc = (W - 2 * P) / Math.max(ext[2] - ext[0], ext[3] - ext[1]);
  const X = x => P + (x - ext[0]) * sc, Y = y => W - P - (y - ext[1]) * sc, ci = u.ci.status === 'ok' ? u.ci.trees.map(t => t.hegyi) : u.trees.map(() => null);
  const v = ci.filter(x => x != null).sort((a, b) => a - b), q = p => v.length ? v[Math.min(v.length - 1, Math.floor(p * v.length))] : null, q1 = q(1 / 3), q2 = q(2 / 3);
  const cls = x => x == null ? 'ch-ptsg' : x <= q1 ? 'ch-s2' : x <= q2 ? 'ch-s1' : 'ch-s5';
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${W + 30}" class="chart" role="img" aria-label="${esc(T('d.map'))}"><title>${esc(T('d.map'))}</title>`;
  s += G.shape === 'circle' ? `<circle cx="${X(G.cx)}" cy="${Y(G.cy)}" r="${G.r * sc}" class="ch-frame"/>` : `<rect x="${X(G.x0)}" y="${Y(G.y1)}" width="${(G.x1 - G.x0) * sc}" height="${(G.y1 - G.y0) * sc}" class="ch-frame"/>`;
  u.trees.forEach((t, i) => { if (Number.isFinite(t.x) && Number.isFinite(t.y)) s += `<circle cx="${X(t.x).toFixed(1)}" cy="${Y(t.y).toFixed(1)}" r="${Math.max(1.5, t.dbh / 200 * sc * MAPX).toFixed(1)}" class="${cls(ci[i])}" fill-opacity=".8"><title>${esc(t.tree_id ?? t.row)}: ${f(t.dbh, 1)} cm, Hegyi ${f(ci[i], 3)}</title></circle>`; });
  s += [['ch-s2', T('d.map.lo')], ['ch-s1', '·'], ['ch-s5', T('d.map.hi')], ['ch-ptsg', T('d.map.none')]].map(([c, l], i) => `<circle cx="${P + 8 + i * 90}" cy="${W + 14}" r="6" class="${c}"/><text class="ch-tick" x="${P + 18 + i * 90}" y="${W + 18}">${esc(l)}</text>`).join('');
  return s + '</svg>';
}
function notesOf(u) {
  const out = [];
  for (const w of u.st.warnings || []) out.push(T('w.' + w.code, w));
  for (const q of u.st.problems || []) out.push(T('p.' + q.code, q));
  for (const part of [u.sp, u.ci]) { for (const q of part.problems || []) out.push(T('p.' + q.code, q)); for (const w of part.warnings || []) out.push(T('w.' + w.code, w)); for (const q of part.samePosition || []) out.push(T('p.ci.samepos', q)); }
  return [...new Set(out)];
}
function tabDetail(p) {
  const u = curUnit(); if (!u) { p.innerHTML = ''; return; }
  let h = R.units.length > 1 ? nav.bar('') : '';
  const tile = (v, l) => `<div class="tile"><b>${v}</b><span>${l}</span></div>`;
  if (u.st.status === 'ok') {
    const ms = u.st.measures;
    h += `<div class="tiles">${tile(fmtNum(u.n, 0), T('c.n'))}${tile(f(u.st.Nha, 1), T('c.Nha'))}${tile(f(u.st.Gha, 3), T('c.Gha'))}${tile(f(u.st.Dq, 2), T('c.Dq'))}${tile(f(ms.gini, 3), T('c.gini'))}${tile(f(ms.sdi, 1), T('c.sdi'))}
      ${u.sp.status === 'ok' ? tile(f(u.sp.ce.R, 3), T('c.R')) : ''}${u.sp.status === 'ok' ? tile(f(u.sp.means.W, 3), T('c.W')) : ''}</div>`;
    const nz = u.st.classes.map((c, i) => c.Nha > 0 ? i : -1).filter(i => i >= 0), cls = u.st.classes.slice(nz[0], nz[nz.length - 1] + 1);   // from the first to the last occupied class
    h += chartBox('ch-hist', barChart({ title: T('d.hist'), categories: cls.map(c => c.hi === Infinity ? `≥ ${fmtNum(c.lo, 1)}` : `${fmtNum(c.lo, 1)}–${fmtNum(c.hi, 1)}`), series: [{ name: T('c.Nha'), values: cls.map(c => c.Nha) }], yLabel: T('c.Nha'), fmt: v => fmtNum(v, 0) }), 'cap-siniflari');
    h += chartBox('ch-lorenz', plotChart({ title: T('d.lorenz', { on: T(u.st.settings.giniOn === 'd' ? 'set.gini.d' : 'set.gini.g') }), xmin: 0, xmax: 1, ymin: 0, ymax: 1, lines: [{ name: T('d.lorenz.eq'), k: 1, dash: true, pts: [[0, 0], [1, 1]] }, { name: 'Gini ' + f(ms.gini, 3), k: 0, pts: u.lorenz }], fmt: v => fmtNum(v, 1) }), 'lorenz');
    const G = u.sp.status === 'ok' ? u.sp.settings.geometry : u.ci.status === 'ok' ? u.ci.settings.geometry : null;
    if (G) h += chartBox('ch-map', stemMap(u, G), 'govde-haritasi').replace('<figcaption>', `<figcaption><span class="muted small">${T('d.map.note', { x: MAPX })}</span> `);
    const nt = notesOf(u); if (nt.length) h += `<h3>${T('d.notes')}</h3><ul class="small" id="notes">${nt.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
    const ci = u.ci.status === 'ok' ? u.ci.trees : null;
    h += `<details class="more"><summary>${T('d.trees')}</summary><div class="tscroll"><table class="grid" id="ttab"><thead><tr><th>${T('t.row')}</th><th>${T('t.tree')}</th><th>${T('t.sp')}</th><th>${T('t.dbh')}</th><th>${T('t.bal')}</th><th>${T('t.relD')}</th><th>${T('t.hegyi')}</th><th>${T('t.edge')}</th></tr></thead><tbody>
      ${u.st.trees.map((t, i) => `<tr><td>${t.row ?? '–'}</td><td>${esc(t.tree_id ?? '')}</td><td>${esc(t.species ?? '')}</td><td class="num">${f(t.dbh, 1)}</td><td class="num">${f(t.bal, 3)}</td><td class="num">${f(t.relD, 3)}</td><td class="num">${ci ? f(ci[i].hegyi, 3) : '–'}</td><td>${ci && ci[i].edge ? T('t.yes') : ''}</td></tr>`).join('')}</tbody></table></div></details>`;
    h += `<details class="more"><summary>${T('d.defs')}</summary><ul class="small">${Object.values(u.st.definitions).map(x => `<li>${esc(x)}</li>`).join('')}${u.sp.status === 'ok' ? `<li>${esc(T('geo.src'))}</li>` : ''}</ul></details>`;
  } else h += `<p class="note warn">${esc(notesOf(u).join('; ') || T('st.' + u.st.status))}</p>`;
  p.innerHTML = h;
  if (R.units.length > 1) { nav.bindBar(); if ($('unav')) nav.renderAside($('unav')); }
  p.querySelectorAll('[data-svg]').forEach(b => b.addEventListener('click', () => download(b.dataset.name + '.svg', svgForDownload($(b.dataset.svg).querySelector('svg')), 'image/svg+xml')));
}

/* ---------------- downloads ---------------- */
const fname = (a, b) => `${lang === 'tr' ? a : b}-${new Date().toISOString().slice(0, 10)}`;
function unitRows() {
  return [['plot_id', 'period', 'state', 'n', 'N_ha', 'G_m2_ha', 'Dq_cm', 'H0_m', 'd_mean', 'd_sd', 'cv', 'skewness', 'kurtosis_excess', 'gini', 'shannon_d', 'species_n', 'shannon_species', 'simpson', 'simpson_dominance', 'sdi', 'curtis_rd', 'spacing_a_m', 'relative_spacing_pct',
    'clark_evans_R', 'clark_evans_R_donnelly', 'W', 'M', 'T', 'U', 'n_reference', 'n_edge', 'hegyi_mean', 'spatial_state'],
    ...R.units.map(u => { const ms = u.st.measures || {}, sp = u.sp.status === 'ok' ? u.sp : null, hm = COLS.find(c => c[0] === 'c.hegyi')[1](u);
      return [u.plot_id, u.period, u.st.status, u.n, u.st.Nha ?? null, u.st.Gha ?? null, u.st.Dq ?? null, u.st.H0 ?? null, ms.d_mean ?? null, ms.d_sd ?? null, ms.cv ?? null, ms.skew ?? null, ms.kurt ?? null, ms.gini ?? null, ms.shannonD ?? null, ms.speciesN ?? null, ms.shannonSp ?? null, ms.simpson ?? null, ms.simpsonD ?? null,
        ms.sdi ?? null, ms.rd ?? null, ms.spacingA ?? null, ms.hartPct ?? null, sp ? sp.ce.R : null, sp ? sp.ce.RD : null, sp ? sp.means.W : null, sp ? sp.means.M : null, sp ? sp.means.T : null, sp ? sp.means.U : null, sp ? sp.nRef : null, sp ? sp.nEdge : null, hm, u.sp.status]; })];
}
function treeVals() {
  const per = new Map();
  for (const u of R.units) { if (u.st.status !== 'ok') continue; const ci = u.ci.status === 'ok' ? u.ci.trees : null, sp = u.sp.status === 'ok' ? u.sp.trees : null;
    u.st.trees.forEach((t, i) => per.set(t.row, { bal: t.bal, relD: t.relD, relG: t.relG, hegyi: ci ? ci[i].hegyi : null, edge: ci ? (ci[i].edge ? 1 : 0) : null, W: sp ? sp[i].W : null, M: sp ? sp[i].M : null, T: sp ? sp[i].T : null, U: sp ? sp[i].U : null })); }
  return per;
}
const TREE_COLS = [['BAL_m2_ha', 'bal'], ['d_Dq', 'relD'], ['g_gmean', 'relG'], ['hegyi', 'hegyi'], ['edge_tree', 'edge'], ['W', 'W'], ['M', 'M'], ['T', 'T'], ['U', 'U']];
function treeRows() {
  const per = treeVals(), fromTable = st.dsSrc && st.dsSrc.kind === 'table' && st.tbl && st.tbl.src;
  if (fromTable) { const src = st.tbl.src; return appendColumns(src.headers.map(String), src.rows.map(r => src.headers.map((_, k) => { const c = r[k]; return c == null || cellText(c) === '' ? null : c.t === 'n' ? c.v : cellText(c); })), src.rowNumbers, per, TREE_COLS); }
  const ds = st.ds; return appendColumns(['row', 'plot_id', 'tree_id', 'period', 'species', 'dbh_cm', 'height_m', 'x_m', 'y_m'], ds.trees.map(t => [t.row, t.plot_id, t.tree_id, t.period, t.species, t.dbh, t.height, t.x ?? null, t.y ?? null]), ds.trees.map(t => t.row), per, TREE_COLS);
}
function infoRows() {
  const s = settings();
  return [[T('x.k'), T('x.v')], [T('x.tool'), `${S.TOOL.id} ${S.TOOL.version}`], [T('x.date'), R.created], [T('x.src'), st.dsSrc ? st.dsSrc.name || st.dsSrc.kind : ''],
    [T('x.settings'), JSON.stringify(s.structure)], [T('x.geom'), s.spatial ? JSON.stringify({ geometry: s.geometry, spatial: s.spatial, competition: s.competition }) : T('geo.noxy')],
    ...(R.units.find(u => u.st.definitions) ? Object.entries(R.units.find(u => u.st.definitions).st.definitions).map(([k, v]) => [T('x.defs') + ': ' + k, v]) : []), [T('x.src2'), T('geo.src')]];
}
function tabExport(p) {
  p.innerHTML = `<div class="exports"><button type="button" class="btn" id="x-xlsx">${T('ex.xlsx')}</button><button type="button" class="btn ghost" id="x-trees">${T('ex.trees')}</button>
    <button type="button" class="btn ghost" id="x-csv">${T('ex.csv')}</button><button type="button" class="btn ghost" id="x-json">${T('ex.json')}</button></div><p class="muted small">${T('ex.note')}</p>`;
  $('x-csv').addEventListener('click', () => downloadCSV(fname('mescere-yapisi', 'stand-structure') + '.csv', unitRows(), lang));
  $('x-json').addEventListener('click', () => downloadJSON(fname('mescere-yapisi', 'stand-structure') + '.json', { tool: S.TOOL, created: R.created, settings: settings(), units: R.units.map(({ trees, ...u }) => u), skipped: R.skipped }));
  const xl = async sheets => { let XLSX; try { XLSX = await loadXLSX(BASE); } catch (e) { status(T('ex.fail'), 'err'); return null; } return XLSX; };
  $('x-xlsx').addEventListener('click', async () => {
    const XLSX = await xl(); if (!XLSX) return;
    const cls = [['plot_id', 'period', 'class_lower_cm', 'class_upper_cm', 'N_ha', 'share'], ...R.units.filter(u => u.st.status === 'ok').flatMap(u => u.st.classes.map(c => [u.plot_id, u.period, c.lo, c.hi === Infinity ? null : c.hi, c.Nha, c.share]))];
    const sp = [['plot_id', 'period', 'species', 'N_ha', 'share'], ...R.units.filter(u => u.st.status === 'ok').flatMap(u => u.st.species.map(s => [u.plot_id, u.period, s.species, s.Nha, s.share]))];
    download(fname('mescere-yapisi', 'stand-structure') + '.xlsx', xlsxBlob(XLSX, [{ name: T('sheet.info'), rows: infoRows(), widths: [30, 110] }, { name: T('sheet.units'), rows: unitRows() }, { name: T('sheet.trees'), rows: treeRows() }, { name: T('sheet.cls'), rows: cls }, { name: T('sheet.sp'), rows: sp }]));
  });
  $('x-trees').addEventListener('click', async () => {
    const XLSX = await xl(); if (!XLSX) return;
    download(fname('agac-rekabet', 'tree-competition') + '.xlsx', xlsxBlob(XLSX, [{ name: T('sheet.data'), rows: treeRows() }, { name: T('sheet.info'), rows: infoRows(), widths: [30, 110] }]));
  });
}

/* ---------------- shell ---------------- */
function canGo(n) { if (n <= 1) return true; if (!st.ds) return false; if (n === 2) return true; return !settingsProblems().length; }
function go(n) { if (!canGo(n)) return; st.step = n; save(); render(); scrollTo({ top: $('steps').offsetTop - 8, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
function renderSteps() {
  $('steps').innerHTML = `<ol class="n3">${[1, 2, 3].map(n => `<li><button type="button" data-go="${n}"${st.step === n ? ' aria-current="step"' : ''}${canGo(n) ? '' : ' disabled'}><b>${n}</b> ${T('step.' + n)}</button></li>`).join('')}</ol>`;
  $('steps').querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(+b.dataset.go)));
}
function render() {
  if (!canGo(st.step)) st.step = [3, 2, 1].find(canGo);
  renderSteps();
  for (const n of [1, 2, 3]) $('step' + n).hidden = st.step !== n;
  ({ 1: renderStep1, 2: renderStep2, 3: renderStep3 })[st.step]();
}
(async function init() {
  $('privacy').textContent = T('privacy');
  try {
    const a = await get('dataset:approved'); if (a && !validateDataset(a).length) approved = a;
    const saved = await get(KEY); if (saved && saved.v === 1) { st = { ...blank(), ...saved }; status(T('restored', { when: new Date(saved.saved).toLocaleString(LOC) })); }
  } catch (e) { st = blank(); }
  render();
})();
