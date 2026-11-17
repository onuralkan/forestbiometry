// Biomass and carbon (TOOLS_SPEC BC02): user interface. All arithmetic in calc.js (tested in tests/biomass/); the data
// grouping comes from the Plot & Stand engine, the coefficient sets from the shared library (core/coef.js).
import * as B from './calc.js';
import { T } from './i18n.js';
import { lang, fmtNum, esc } from '../core/i18n.js';
import { put, get, del } from '../core/store.js';
import { listCoefs, form as formOf } from '../core/coef.js';
import { mountCoefEditor } from '../core/coef-ui.js';
import { EXTRA } from './coef-extra.js';
import * as MC from './mc.js';
import { renderImport, readImport } from '../core/importer.js';
import { cellText } from '../core/table.js';
import { parseNumber, toInternal, detectDecimal, defaultDecimal } from '../core/num.js';
import { tableToDataset, validateDataset } from '../stand/calc.js';
import { download, downloadCSV, xlsxBlob, loadXLSX } from '../core/export.js';
import { barChart, svgForDownload } from '../core/chart.js';
import { downloadRecord, recordOption } from '../core/record-ui.js';
import { sha256JSON } from '../core/record.js';
import { readDerived, volumeLookup, storeKey, KIND_VOLUME } from '../core/derived.js';

const BASE = './', KEY = 'session:' + B.TOOL.id, LOC = lang === 'tr' ? 'tr-TR' : 'en-GB', $ = id => document.getElementById(id);
const f = (x, d = 3) => x == null || !Number.isFinite(x) ? '–' : fmtNum(x, d);
const num = t => { const r = parseNumber(String(t ?? '').trim(), '.'); return r.status === 'ok' ? r.value : NaN; };
let S = blank(), R = null, sets = [], approved = null, saveT = null, dv = null, U = null;
function blank() {
  return { v: 1, step: 1, tbl: null, ds: null, dsSrc: null, approach: 'allometric', comps: [{ key: 'c1', label: T('c.default'), CF: '' }], map: {}, total: {}, ec: 'unmeasured',
    mc: { B: String(MC.MC_DEFAULTS.B), seed: String(MC.MC_DEFAULTS.seed), level: '0.95' }, vol: { from: 'col', col: null, bark: 'ob', mode: 'bef', D: '', BEF: '', BCEF: '', R: '', fbark: 'ob', src: '', CF: '' } };
}
function save() { clearTimeout(saveT); saveT = setTimeout(flush, 250); }
function flush() { clearTimeout(saveT); saveT = null; return put(KEY, { ...S, saved: new Date().toISOString() }); }
addEventListener('pagehide', () => { if (saveT) flush(); });
function status(m, k = '') { const s = $('status'); s.className = 'status ' + k; s.textContent = m || ''; }
const setsById = () => new Map(sets.map(s => [s.id, s]));
const setLabel = s => { const fm = formOf(s.form); return `${fm ? (fm.formula[lang] || fm.formula.tr) : s.form}${[s.species, s.component].filter(Boolean).length ? ' · ' + [s.species, s.component].filter(Boolean).join(' · ') : ''} — ${s.source.citation}`; };

/* ---------------- step 1: data ---------------- */
const MAPKEYS = ['plot', 'dbh', 'area', 'tree', 'species', 'height', 'period'];
const GUESS = { plot: ['plot', 'plot_id', 'alan', 'alan_no', 'ornek_alan', 'örnek_alan', 'oa'], dbh: ['dbh', 'dbh_cm', 'd', 'd13', 'cap', 'çap', 'cap_cm', 'çap_cm'], area: ['plot_area', 'plotarea', 'area', 'alan_buyuklugu', 'alan_büyüklüğü', 'alan_m2'],
  tree: ['tree', 'tree_id', 'agac', 'ağaç', 'agac_no', 'ağaç_no'], species: ['species', 'sp', 'tur', 'tür'], height: ['h', 'height', 'boy', 'boy_m', 'height_m'], period: ['period', 'year', 'yil', 'yıl', 'donem', 'dönem'] };
function useDataset(ds, src) {
  const probs = validateDataset(ds);
  if (probs.length) { status(T('src.bad', { codes: probs.join(', ') }), 'err'); return; }
  S.ds = ds; S.dsSrc = src; S.vol.col = null; R = null; status(''); save();
  loadDerived().then(render);
}
/** Stem volumes sent by the Stem Section Volume tool for this package (BC03; core/derived.js), matched by fingerprint. */
async function loadDerived() {
  dv = null; if (!S.ds) return;
  try { const sha = await sha256JSON(S.ds); dv = { sha, ...readDerived(await get(storeKey(KIND_VOLUME, sha)), KIND_VOLUME, sha) }; } catch (e) { dv = null; }
}
function setTable(st) {
  if (!st.src) { S.tbl = null; save(); renderStep1(); return; }
  const H = st.src.headers.map(h => String(h).trim().toLocaleLowerCase('tr')), map = {};
  for (const k of MAPKEYS) { const i = H.findIndex(h => GUESS[k].includes(h)); map[k] = i < 0 ? null : i; }
  S.tbl = { imp: st.imp, src: st.src, map, spec: { decimal: null, decChosen: false, dbhUnit: 'cm', hUnit: 'm', areaUnit: 'm2', areaConst: '' }, problems: null, used: false };
  status(''); save(); renderStep1();
}
function renderMap() {
  const box = $('mapbox'); if (!box) return;
  if (!S.tbl || !S.tbl.src) { box.innerHTML = ''; return; }
  const { src, map, spec } = S.tbl, textOf = c => c == null ? [] : src.rows.map(r => r[c]).filter(x => x && x.t === 's').map(x => x.v);
  const dv = detectDecimal(['dbh', 'height', 'area'].flatMap(k => textOf(map[k])));
  if (!spec.decChosen) spec.decimal = defaultDecimal(dv.verdict);
  const opts = k => `<option value="">${T('none')}</option>` + src.headers.map((h, i) => `<option value="${i}"${map[k] === i ? ' selected' : ''}>${esc(h)}</option>`).join('');
  const sel = (k, req) => `<label>${T('map.' + k)}${req ? ` <span class="muted small">(${T('map.req')})</span>` : ''} <select data-map="${k}">${opts(k)}</select></label>`;
  const unit = (id, cur, list) => `<select data-unit="${id}">${list.map(([v, l]) => `<option value="${v}"${cur === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
  let h = `<div class="card"><h2>${T('map.h')}</h2><div class="lims">${sel('plot', true)}${sel('dbh', true)}<label>${T('map.dunit')} ${unit('dbhUnit', spec.dbhUnit, [['cm', 'cm'], ['mm', 'mm']])}</label>
    ${sel('area', true)}<label>${T('map.aunit')} ${unit('areaUnit', spec.areaUnit, [['m2', 'm²'], ['ha', 'ha']])}</label>${map.area == null ? `<label>${T('map.aconst')} <input type="text" inputmode="decimal" id="aconst" size="8" value="${esc(spec.areaConst)}"></label>` : ''}</div>
    <p class="small"><b>${T('map.opt')}</b></p><div class="lims">${sel('tree')}${sel('species')}${sel('height')}<label>${T('map.hunit')} ${unit('hUnit', spec.hUnit, [['m', 'm'], ['dm', 'dm'], ['cm', 'cm']])}</label>${sel('period')}</div>`;
  const dmsg = dv.verdict === 'ambiguous' ? T('dec.v.ambiguous', { ex: dv.examples.ambiguous.map(x => `"${x}"`).join(', ') }) : T('dec.v.' + dv.verdict);
  h += `<h3>${T('dec.h')}</h3><p class="note ${dv.verdict === 'ambiguous' || dv.verdict === 'conflict' ? 'warn' : ''} small">${esc(dmsg)}</p><div class="radios">
    <label><input type="radio" name="tdec" value="."${spec.decimal === '.' ? ' checked' : ''}> ${T('dec.dot')}</label><label><input type="radio" name="tdec" value=","${spec.decimal === ',' ? ' checked' : ''}> ${T('dec.comma')}</label></div>`;
  const pr = S.tbl.problems;
  if (pr && pr.length) h += `<div class="note err" id="tblprob"><p>${T('pr.h', { n: pr.length })}</p><ul class="small">${pr.slice(0, 12).map(q => `<li>${esc(q.row != null ? T('pr.row', q) + ': ' + q.code : q.code)}</li>`).join('')}</ul>${pr.length > 12 ? `<p class="small">${T('pr.more', { n: pr.length - 12 })}</p>` : ''}</div>`;
  if (S.tbl.used && S.ds && S.dsSrc && S.dsSrc.kind === 'table') h += `<p class="note ok" id="tblok">${T('map.ok', { trees: S.ds.trees.length, plots: S.ds.plots.length })}</p>`;
  h += `<div class="nav"><button type="button" class="btn" id="usetbl">${T('map.use')}</button></div></div>`;
  box.innerHTML = h;
  const changed = () => { S.tbl.problems = null; S.tbl.used = false; save(); renderMap(); };
  box.querySelectorAll('[data-map]').forEach(x => x.addEventListener('change', () => { map[x.dataset.map] = x.value === '' ? null : +x.value; changed(); }));
  box.querySelectorAll('[data-unit]').forEach(x => x.addEventListener('change', () => { spec[x.dataset.unit] = x.value; changed(); }));
  box.querySelectorAll('input[name="tdec"]').forEach(x => x.addEventListener('change', () => { spec.decimal = x.value; spec.decChosen = true; changed(); }));
  $('aconst') && $('aconst').addEventListener('change', e => { spec.areaConst = e.target.value; changed(); });
  $('usetbl').addEventListener('click', () => {
    const r = tableToDataset({ ...src, name: S.tbl.imp && S.tbl.imp.name }, map, { ...spec, areaConst: parseNumber(spec.areaConst, spec.decimal).value ?? NaN }, parseNumber, toInternal);
    if (r.problems.length) { S.tbl.problems = r.problems; save(); renderMap(); $('tblprob') && $('tblprob').scrollIntoView({ block: 'nearest' }); return; }
    S.tbl.problems = null; S.tbl.used = true; useDataset(r.ds, { kind: 'table', name: S.tbl.imp && S.tbl.imp.name });
  });
}
const dsInfo = (ds, name) => T('src.info', { name: esc(name || (ds.source && ds.source.trees && ds.source.trees.name) || '–'), trees: ds.trees.length, plots: ds.plots.length });
function renderStep1() {
  const el = $('step1');
  let h = `<div id="tblbox"></div><div id="mapbox"></div><div class="card"><h2>${T('src.h')}</h2>`;
  h += approved ? `<div class="srcbox"><b>${T('src.approved')}</b><p class="small">${dsInfo(approved)}</p><button type="button" class="btn" id="useapp">${T('src.use')}</button></div>`
    : `<p class="note">${T('src.none')} <a href="veri-denetcisi.php">${T('src.checker')}</a></p>`;
  h += `<p><button type="button" class="btn ghost" id="sample">${T('src.sample')}</button></p><p class="muted small">${T('src.sample.note')}</p>`;
  if (S.ds) h += `<p class="note ok" id="dsinfo"><b>${T('src.current')}:</b> ${dsInfo(S.ds, S.dsSrc && S.dsSrc.name)}</p>`;
  h += `</div><div class="nav"><button type="button" class="btn ghost" id="reset">${T('reset')}</button><button type="button" class="btn" id="to2"${S.ds ? '' : ' disabled'}>${T('next')}</button>${S.ds ? '' : `<span class="muted small">${T('need.ds')}</span>`}</div>`;
  el.innerHTML = h;
  renderImport($('tblbox'), { imp: S.tbl && S.tbl.imp, src: S.tbl && S.tbl.src }, { base: BASE, title: T('tb.h'), sub: T('tb.sub'), onChange: setTable, onError: m => status(m, 'err') });
  renderMap();
  $('useapp') && $('useapp').addEventListener('click', () => useDataset(approved, { kind: 'approved', name: approved.source && approved.source.trees && approved.source.trees.name }));
  $('sample').addEventListener('click', async () => {
    const buf = await (await fetch(BASE + 'assets/lab/structure/ornek/ornek-mescere.csv')).arrayBuffer();
    const imp = { kind: 'csv', name: lang === 'tr' ? 'ornek-mescere.csv (benzetim)' : 'ornek-mescere.csv (simulated)', buf, encoding: 'utf-8', delim: null, header: true, sheet: null };
    setTable({ imp, src: await readImport(imp, BASE) }); S.tbl.spec.decimal = '.'; S.tbl.spec.decChosen = true; renderMap(); $('usetbl').click();
  });
  $('reset').addEventListener('click', async () => { S = blank(); R = null; status(''); render(); await del(KEY); });
  $('to2').addEventListener('click', () => go(2));
}

/* ---------------- step 2: settings ---------------- */
/** Columns that can hold a volume: the raw table's columns (table import) or the data package's kept columns (extra). */
function volumeColumns() {
  if (S.dsSrc && S.dsSrc.kind === 'table' && S.tbl && S.tbl.src) return S.tbl.src.headers.map(String);
  const k = new Set(); for (const t of (S.ds ? S.ds.trees : [])) for (const x of Object.keys(t.extra || {})) k.add(x);
  return [...k];
}
function volumeOf() {
  if (S.vol.from === 'secvol') return dv && dv.ok ? volumeLookup(dv.record, S.vol.bark) : () => null;
  const col = S.vol.col; if (col == null) return () => null;
  if (S.dsSrc && S.dsSrc.kind === 'table' && S.tbl && S.tbl.src) {
    const src = S.tbl.src, ci = src.headers.map(String).indexOf(col), byRow = new Map(src.rowNumbers.map((r, i) => [r, src.rows[i]]));
    return t => { const r = byRow.get(t.row); if (!r || ci < 0) return null; const p = parseNumber(cellText(r[ci]), S.tbl.spec.decimal); return p.status === 'ok' ? p.value : null; };
  }
  const dec = S.ds && S.ds.source && S.ds.source.settings && S.ds.source.settings.decimal || '.';
  return t => { const v = t.extra && t.extra[col]; if (v == null || v === '') return null; const p = parseNumber(String(v), dec); return p.status === 'ok' ? p.value : null; };
}
function settingsProblems() {
  const p = [];
  if (S.approach !== 'volume') {
    if (!S.comps.length) p.push(T('p.comp'));
    if (new Set(S.comps.map(c => c.label.trim())).size !== S.comps.length) p.push(T('p.compdup'));
    for (const c of S.comps) { const v = num(c.CF); if (!(v > 0 && v <= 1)) p.push(T('p.cf', { c: c.label })); }
    if (!Object.values(S.map).some(m => Object.values(m || {}).some(Boolean))) p.push(T('p.map'));
  }
  if (S.approach !== 'allometric') {
    const v = S.vol;
    if (v.from === 'secvol') { if (!(dv && dv.ok)) p.push(T('p.vnone')); }
    else if (v.col == null) p.push(T('p.vcol'));
    for (const k of v.mode === 'bef' ? ['D', 'BEF'] : ['BCEF']) if (!(num(v[k]) > 0)) p.push(T('p.vnum', { what: T('v.' + k) }));
    if (!(num(v.R) >= 0)) p.push(T('p.vnum', { what: T('v.R') }));
    const cf = num(v.CF); if (!(cf > 0 && cf <= 1)) p.push(T('p.cf', { c: 'CF' }));
    if (!v.src.trim()) p.push(T('p.vsrc'));
    if (v.bark !== v.fbark) p.push(T('p.vbark'));
  }
  return p;
}
function renderStep2() {
  const el = $('step2'), sp = B.speciesOf(S.ds), A = S.approach;
  let h = `<div class="card"><h2>${T('a.h')}</h2><div class="radios col">${['allometric', 'volume', 'both'].map(a => `<label><input type="radio" name="appr" value="${a}"${A === a ? ' checked' : ''}> ${T('a.' + a)}</label>`).join('')}</div></div>`;
  if (A !== 'volume') {
    h += `<div class="card"><h2>${T('c.h')}</h2><p class="muted small">${T('c.sub')}</p><div class="tscroll"><table class="grid" id="comptab"><thead><tr><th>${T('c.name')}</th><th>${T('c.cf')}</th><th></th></tr></thead><tbody>
      ${S.comps.map((c, i) => `<tr><td><input type="text" size="18" data-cl="${i}" value="${esc(c.label)}"></td><td><input type="text" inputmode="decimal" size="6" data-cf="${i}" value="${esc(c.CF)}"></td><td>${S.comps.length > 1 ? `<button type="button" class="btn ghost small" data-crm="${i}">${T('c.rm')}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>
      <p><button type="button" class="btn ghost small" id="cadd">${T('c.add')}</button></p></div>`;
    const opts = (cur) => `<option value="">${T('m.choose')}</option>` + sets.map(s => `<option value="${esc(s.id)}"${cur === s.id ? ' selected' : ''}>${esc(setLabel(s))}</option>`).join('');
    h += `<div class="card"><h2>${T('m.h')}</h2><p class="muted small">${T('m.sub')}</p>${sets.length ? '' : `<p class="note warn small" id="nosets">${T('m.nosets')}</p>`}
      <div class="tscroll"><table class="grid" id="maptab"><thead><tr><th>${T('m.sp')}</th><th>${T('m.n')}</th>${S.comps.map(c => `<th>${esc(c.label)}</th>`).join('')}<th>${T('m.total')}</th></tr></thead><tbody>
      ${sp.map(x => `<tr data-sp="${esc(x.species)}"><th>${esc(x.species || T('m.nosp'))}</th><td class="num">${x.n}</td>${S.comps.map(c => `<td><select data-ms="${esc(x.species)}" data-mc="${c.key}">${opts((S.map[x.species] || {})[c.key])}</select></td>`).join('')}
        <td><select data-ts="${esc(x.species)}">${opts(S.total[x.species])}</select></td></tr>`).join('')}
      <tr class="tail"><td colspan="2"><span class="small">${T('m.all')}</span></td>${S.comps.map(c => `<td><select data-all="${c.key}">${opts(null)}</select></td>`).join('')}<td></td></tr></tbody></table></div></div>`;
    h += `<div id="coefbox"></div>`;
  }
  if (A !== 'allometric') {
    const v = S.vol, cols = volumeColumns(), inp = (k, size = 7) => `<label>${T('v.' + k)} <input type="text" inputmode="decimal" size="${size}" data-v="${k}" value="${esc(v[k])}"></label>`;
    const side = (k) => `<select data-vs="${k}">${['ob', 'ib'].map(b => `<option value="${b}"${v[k] === b ? ' selected' : ''}>${T(b)}</option>`).join('')}</select>`;
    h += `<div class="card"><h2>${T('v.h')}</h2><div class="radios col"><span class="small">${T('v.from')}:</span>${['col', 'secvol'].map(x => `<label class="small"><input type="radio" name="vfrom" value="${x}"${v.from === x ? ' checked' : ''}> ${T('v.from.' + x)}</label>`).join('')}</div>`;
    if (v.from === 'secvol') h += `<div id="dvbox">${dvHTML()}</div><div class="lims"><label>${T('v.bark')} ${side('bark')}</label></div>`;
    else h += `<div class="lims"><label>${T('v.col')} <select id="vcol"><option value="">${T('none')}</option>${cols.map(c => `<option${v.col === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select></label><label>${T('v.bark')} ${side('bark')}</label></div>`;
    h += `<div class="radios"><span class="small">${T('v.mode')}:</span> ${['bef', 'bcef'].map(m => `<label class="small"><input type="radio" name="vmode" value="${m}"${v.mode === m ? ' checked' : ''}> ${T('v.' + m)}</label>`).join(' ')}</div>
      <div class="lims">${v.mode === 'bef' ? inp('D') + inp('BEF') : inp('BCEF')}${inp('R')}<label>${T('v.fbark')} ${side('fbark')}</label>${inp('CF', 6)}</div>
      <label class="field"><span>${T('v.src')}</span><input type="text" id="vsrc" value="${esc(v.src)}"></label><p class="muted small">${T('v.note')}</p></div>`;
  }
  h += `<div class="card"><div class="radios"><span class="small">${T('e.h')}:</span> ${['unmeasured', 'empty'].map(x => `<label class="small"><input type="radio" name="ec" value="${x}"${S.ec === x ? ' checked' : ''}> ${T('e.' + x)}</label>`).join(' ')}</div></div>`;
  const pr = settingsProblems();
  h += `<div class="nav"><button type="button" class="btn ghost" id="back1">${T('back')}</button><button type="button" class="btn" id="calc"${pr.length ? ' disabled' : ''}>${T('calc')}</button>${pr.length ? `<span class="muted small" id="s2prob">${pr.map(esc).join(' · ')}</span>` : ''}</div>`;
  el.innerHTML = h;
  const re = () => { R = null; save(); renderStep2(); renderSteps(); };
  el.querySelectorAll('input[name="appr"]').forEach(x => x.addEventListener('change', () => { S.approach = x.value; re(); }));
  el.querySelectorAll('input[name="ec"]').forEach(x => x.addEventListener('change', () => { S.ec = x.value; re(); }));
  el.querySelectorAll('input[name="vfrom"]').forEach(x => x.addEventListener('change', async () => { S.vol.from = x.value; await loadDerived(); re(); }));
  el.querySelectorAll('[data-cl]').forEach(x => x.addEventListener('change', () => { S.comps[+x.dataset.cl].label = x.value; re(); }));
  el.querySelectorAll('[data-cf]').forEach(x => x.addEventListener('change', () => { S.comps[+x.dataset.cf].CF = x.value.trim(); re(); }));
  el.querySelectorAll('[data-crm]').forEach(x => x.addEventListener('click', () => { const c = S.comps.splice(+x.dataset.crm, 1)[0]; for (const m of Object.values(S.map)) delete m[c.key]; re(); }));
  $('cadd') && $('cadd').addEventListener('click', () => { const n = Math.max(0, ...S.comps.map(c => +c.key.slice(1) || 0)) + 1; S.comps.push({ key: 'c' + n, label: `${T('c.name')} ${n}`, CF: '' }); re(); });
  el.querySelectorAll('[data-ms]').forEach(x => x.addEventListener('change', () => { const m = S.map[x.dataset.ms] = S.map[x.dataset.ms] || {}; if (x.value) m[x.dataset.mc] = x.value; else delete m[x.dataset.mc]; re(); }));
  el.querySelectorAll('[data-ts]').forEach(x => x.addEventListener('change', () => { if (x.value) S.total[x.dataset.ts] = x.value; else delete S.total[x.dataset.ts]; re(); }));
  el.querySelectorAll('[data-all]').forEach(x => x.addEventListener('change', () => { if (!x.value) return; for (const s of sp) { (S.map[s.species] = S.map[s.species] || {})[x.dataset.all] = x.value; } re(); }));
  $('vcol') && $('vcol').addEventListener('change', e => { S.vol.col = e.target.value || null; re(); });
  el.querySelectorAll('[data-vs]').forEach(x => x.addEventListener('change', () => { S.vol[x.dataset.vs] = x.value; re(); }));
  el.querySelectorAll('input[name="vmode"]').forEach(x => x.addEventListener('change', () => { S.vol.mode = x.value; re(); }));
  el.querySelectorAll('[data-v]').forEach(x => x.addEventListener('change', () => { S.vol[x.dataset.v] = x.value.trim(); re(); }));
  $('vsrc') && $('vsrc').addEventListener('change', e => { S.vol.src = e.target.value; re(); });
  $('back1').addEventListener('click', () => go(1));
  $('calc').addEventListener('click', () => { compute(); go(3); });
  if ($('coefbox')) mountCoefEditor($('coefbox'), { tool: 'biomass', extra: EXTRA, onChange: list => { const changed = list.length !== sets.length || list.some((s, i) => !sets[i] || sets[i].id !== s.id || sets[i].modified !== s.modified); sets = list; if (changed) { R = null; renderStep2(); } } }).refresh();
}
/** What the browser holds from the Stem Section Volume tool for this package. */
function dvHTML() {
  if (!dv || dv.problems.includes('derived.none')) return `<p class="note warn small" id="dvnone">${T('dv.none')} <a href="seksiyon-hacmi.php">${T('dv.link')}</a></p>`;
  if (!dv.ok) return `<p class="note err small" id="dvbad">${T('dv.bad', { codes: dv.problems.join(', ') })}</p>`;
  const r = dv.record, sides = ['ob', 'ib'].filter(s => r.trees.some(t => t['v_' + s] != null)).map(s => T(s)).join(', ') || '–';
  return `<p class="note ok small" id="dvinfo">${esc(T('dv.info', { tool: `${r.tool.id} ${r.tool.version}`, when: new Date(r.created).toLocaleString(LOC), m: r.settings && r.settings.method || '–', n: r.trees.length, ok: r.trees.filter(t => t.status === 'ok').length, sides }))}</p>`;
}

/* ---------------- step 3: results ---------------- */
function alloRun(created) {
  const cfg = { components: S.comps.map(c => ({ key: c.key, label: c.label, CF: num(c.CF) })), map: S.map, total: S.total, emptyCombos: S.ec };
  return { kind: 'allometric', created, cfg, used: [...new Set(Object.values(S.map).flatMap(m => Object.values(m || {})).concat(Object.values(S.total)))].map(id => setsById().get(id)).filter(Boolean), ...B.computeAllometric(S.ds, cfg, setsById()) };
}
function volRun(created) {
  const v = S.vol, factors = { mode: v.mode, bark: v.fbark, D: num(v.D), BEF: num(v.BEF), BCEF: num(v.BCEF), R: num(v.R) };
  const from = v.from === 'secvol' && dv && dv.ok ? { kind: 'secvol', package: dv.sha, created: dv.record.created, tool: dv.record.tool, method: dv.record.settings ? dv.record.settings.method : null } : { kind: 'column', column: v.col };
  return { kind: 'volume', created, cfg: { from, col: v.from === 'secvol' ? null : v.col, bark: v.bark, factors, CF: num(v.CF), src: v.src, emptyCombos: S.ec }, ...B.computeVolume(S.ds, volumeOf(), { bark: v.bark, factors, CF: num(v.CF), emptyCombos: S.ec }) };
}
function compute() {
  const created = new Date().toISOString(); U = null;
  if (S.approach === 'allometric') R = alloRun(created);
  else if (S.approach === 'volume') R = volRun(created);
  else { const a = alloRun(created), v = volRun(created); R = { kind: 'both', created, allo: a, vol: v, cmp: B.bothApproaches(a, v) }; }
}
const parts = () => R.kind === 'both' ? [R.allo, R.vol] : [R];
const rowsText = rows => { const r = rows.filter(x => x != null); return r.length > 25 ? r.slice(0, 25).join(', ') + ' …' : r.join(', '); };
const compLabel = key => (S.comps.find(c => c.key === key) || { label: key }).label;
const unitCols = P => P.kind === 'allometric' ? [...S.comps.map(c => ({ k: c.key, l: c.label, v: u => u.comps[c.key].perHa })), { k: 'B', l: T('u.B'), v: u => u.B }, { k: 'C', l: T('u.C'), v: u => u.C }, { k: 'CO2', l: T('u.CO2'), v: u => u.CO2 }]
  : [{ k: 'AGB', l: T('u.AGB'), v: u => u.AGB }, { k: 'BGB', l: T('u.BGB'), v: u => u.BGB }, { k: 'B', l: T('u.B'), v: u => u.B }, { k: 'C', l: T('u.C'), v: u => u.C }, { k: 'CO2', l: T('u.CO2'), v: u => u.CO2 }];
const srcText = P => P.cfg.from && P.cfg.from.kind === 'secvol' ? T('r.vfrom.secvol', { tool: `${P.cfg.from.tool.id} ${P.cfg.from.tool.version}`, m: P.cfg.from.method || '–', when: P.cfg.from.created }) : T('r.vfrom.col', { c: P.cfg.col });
/** Tiles, notes, unit table, chart and tree table of one approach; ids carry the suffix x ('' for a single approach). */
function partHTML(P, x) {
  const units = P.units;
  let h = `<div class="card"><h2>${R.kind === 'both' ? T('a.' + P.kind + '.s') : T('r.tiles')}</h2><div class="tiles">`;
  if (P.kind === 'allometric') {
    const n = P.trees.length, ok = P.trees.filter(t => t.sum != null).length;
    const sumK = k => Object.values(P.counts).reduce((a, c) => a + (c[k] || 0), 0);
    h += `<div class="tile"><span>${T('t.trees')}</span><b id="t-n${x}">${n}</b></div><div class="tile t-ok"><span>${T('t.ok')}</span><b id="t-ok${x}">${ok}</b></div>
      <div class="tile${P.unmapped.length ? ' t-warn' : ''}"><span>${T('t.unmapped')}</span><b id="t-um${x}">${new Set(P.unmapped.flatMap(u => u.rows)).size}</b></div><div class="tile${P.noheight.length ? ' t-warn' : ''}"><span>${T('t.noh')}</span><b id="t-noh${x}">${new Set(P.noheight.flatMap(u => u.rows)).size}</b></div>
      <div class="tile"><span>${T('t.out')}</span><b id="t-out${x}">${sumK('outside')}</b></div><div class="tile"><span>${T('t.est')}</span><b id="t-est${x}">${sumK('estimatedHeight')}</b></div><div class="tile"><span>${T('t.units')}</span><b>${units.length}</b></div></div>`;
    for (const u of P.unmapped) h += `<p class="note warn small" data-um="${esc(u.species)}">${esc(T('r.unmapped', { sp: u.species || T('m.nosp'), c: compLabel(u.component), rows: rowsText(u.rows) }))}</p>`;
    for (const u of P.noheight) h += `<p class="note warn small" data-noh="${u.component}">${esc(T('r.noh', { c: compLabel(u.component), rows: rowsText(u.rows) }))}</p>`;
    for (const [k, c] of Object.entries(P.counts)) {
      if (c.estimatedHeight) h += `<p class="note small">${esc(T('r.est', { n: c.estimatedHeight, c: compLabel(k) }))}</p>`;
      if (c.outside) h += `<p class="note warn small">${esc(T('r.out', { n: c.outside, c: compLabel(k) }))}</p>`;
      if (c.invalid) h += `<p class="note err small">${esc(T('r.inv', { n: c.invalid, c: compLabel(k) }))}</p>`;
      if (c.unsupported) h += `<p class="note err small">${esc(T('r.uns', { n: c.unsupported, c: compLabel(k) }))}</p>`;
    }
    const adds = P.trees.filter(t => t.additivity).map(t => Math.abs(t.additivity.rel));
    if (adds.length) h += `<p class="note small" id="addnote${x}">${esc(T('r.add', { r: f(Math.max(...adds) * 100, 2) }))}</p>`;
    h += `<p class="muted small" id="srcnote${x}">${esc(T('r.note', { list: [...new Set(P.used.map(s => s.source.citation))].join('; ') }))}</p></div>`;
  } else {
    const n = P.trees.length, ok = P.trees.filter(t => t.status === 'ok').length;
    h += `<div class="tile"><span>${T('t.trees')}</span><b id="t-n${x}">${n}</b></div><div class="tile t-ok"><span>${T('t.ok')}</span><b id="t-ok${x}">${ok}</b></div><div class="tile${P.missing.length ? ' t-warn' : ''}"><span>${T('t.nov')}</span><b id="t-nov${x}">${P.missing.length}</b></div><div class="tile"><span>${T('t.units')}</span><b>${units.length}</b></div></div>`;
    if (P.missing.length) h += `<p class="note warn small" id="novnote${x}">${esc(T('r.nov', { rows: rowsText(P.missing) }))}</p>`;
    const bad = P.trees.filter(t => t.status === 'invalid'); if (bad.length) h += `<p class="note err small" id="vbad${x}">${esc(bad[0].problems.map(q => q.code).join(', '))}</p>`;
    h += `<p class="small" id="vfrom${x}">${esc(srcText(P))}</p><p class="muted small" id="srcnote${x}">${esc(T('r.vnote', { src: P.cfg.src }))}</p></div>`;
  }
  const cols = unitCols(P);
  h += `<div class="card"><h2>${T('u.h')}</h2><div class="tscroll"><table class="grid" id="utab${x}"><thead><tr><th>${T('u.plot')}</th><th>${T('u.period')}</th><th>${T('u.n')}</th>${cols.map(c => `<th>${esc(c.l)}</th>`).join('')}</tr></thead><tbody>
    ${units.map(u => `<tr data-u="${esc(u.plot_id)}|${esc(u.period ?? '')}"><th>${esc(u.plot_id)}</th><td>${esc(u.period ?? '–')}</td><td class="num">${u.n}</td>${cols.map(c => { const v = c.v(u); return `<td class="num" data-k="${c.k}"${v == null && u.n ? ` title="${esc(T('u.miss'))}"` : ''}>${f(v, 3)}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div><p class="muted small">${T('u.note')}</p>`;
  const series = P.kind === 'allometric' ? S.comps.map(c => ({ name: c.label, values: units.map(u => u.comps[c.key].perHa) })) : [{ name: T('u.AGB'), values: units.map(u => u.AGB) }, { name: T('u.BGB'), values: units.map(u => u.BGB) }];
  h += `<figure class="chartbox" id="ch-b${x}">${barChart({ title: T('ch.title'), categories: units.map(u => u.period ? `${u.plot_id} · ${u.period}` : u.plot_id), series, yLabel: T('ch.y'), fmt: v => fmtNum(v, 1) })}<figcaption><button type="button" class="btn ghost small" id="svg${x}">${T('ch.svg')}</button></figcaption></figure></div>`;
  const K = 200, trs = P.trees.slice(0, K);
  h += `<div class="card"><h2>${T('g.h')}</h2><div class="tscroll tall"><table class="grid" id="ttab${x}"><thead><tr><th>${T('g.row')}</th><th>${T('u.plot')}</th><th>${T('m.sp')}</th><th>D</th><th>H</th>${P.kind === 'allometric' ? S.comps.map(c => `<th>${esc(c.label)} (kg)</th>`).join('') + `<th>Σ (kg)</th><th>C (kg)</th>` : '<th>V (m³)</th><th>B (kg)</th><th>C (kg)</th>'}</tr></thead><tbody>
    ${trs.map(t => `<tr><td class="num">${t.row ?? '–'}</td><td>${esc(t.t.plot_id)}</td><td>${esc(t.t.species ?? '')}</td><td class="num">${f(t.t.dbh, 1)}</td><td class="num">${f(t.t.height, 1)}${t.t.height_source === 'estimated' ? '*' : ''}</td>${P.kind === 'allometric'
      ? S.comps.map(c => { const r = t.comps[c.key]; return `<td class="num"${r.status !== 'ok' ? ` title="${esc(T('st.' + r.status))}"` : ''}>${r.status === 'ok' ? f(r.value, 2) : `<span class="muted">${T('st.' + r.status)}</span>`}</td>`; }).join('') + `<td class="num">${f(t.sum, 2)}</td><td class="num">${f(t.C, 2)}</td>`
      : `<td class="num">${f(t.V, 4)}</td><td class="num">${t.status === 'ok' ? f(t.total, 2) : `<span class="muted">${T('st.' + t.status)}</span>`}</td><td class="num">${f(t.C, 2)}</td>`}</tr>`).join('')}</tbody></table></div>${P.trees.length > K ? `<p class="muted small">${T('g.more', { k: K, n: P.trees.length })}</p>` : ''}</div>`;
  return h;
}
/** Both approaches side by side: one row per unit and approach (never averaged). */
function cmpHTML() {
  return `<div class="card"><h2>${T('b.h')}</h2><p class="muted small">${T('b.sub')}</p><div class="tscroll"><table class="grid" id="cmptab"><thead><tr><th>${T('u.plot')}</th><th>${T('u.period')}</th><th>${T('b.appr')}</th><th>${T('u.n')}</th><th>${T('u.B')}</th><th>${T('u.C')}</th><th>${T('u.CO2')}</th></tr></thead><tbody>
    ${R.cmp.units.map(u => `<tr data-u="${esc(u.plot_id)}|${esc(u.period ?? '')}" data-a="${u.approach}"><th>${esc(u.plot_id)}</th><td>${esc(u.period ?? '–')}</td><td>${T('a.' + u.approach + '.s')}</td><td class="num">${u.n}</td>${['B', 'C', 'CO2'].map(k => `<td class="num" data-k="${k}">${f(u[k], 3)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="muted small">${T('u.note')}</p></div>`;
}
function renderStep3() {
  if (!R) compute();
  const el = $('step3'), sx = R.kind === 'both' ? ['-a', '-v'] : [''];
  let h = R.kind === 'both' ? cmpHTML() : '';
  parts().forEach((P, i) => { h += partHTML(P, sx[i]); });
  h += `<div class="card" id="mccard">${mcHTML()}</div>`;
  h += `<div class="card"><h2>${T('x.h')}</h2><div class="exports"><button type="button" class="btn" id="x-xlsx">${T('x.xlsx')}</button><button type="button" class="btn ghost" id="x-csv">${T('x.csv')}</button><button type="button" class="btn ghost" id="x-json">${T('x.json')}</button>${recordOption()}</div></div>`;
  h += `<div class="nav"><button type="button" class="btn ghost" id="back2">${T('back')}</button></div>`;
  el.innerHTML = h;
  $('back2').addEventListener('click', () => go(2));
  bindMC();
  sx.forEach(x => $('svg' + x).addEventListener('click', () => download(fname() + (x ? x : '') + '.svg', svgForDownload($('ch-b' + x).querySelector('svg')), 'image/svg+xml')));
  $('x-csv').addEventListener('click', () => downloadCSV(fname() + '.csv', R.kind === 'both' ? bothTreeRows() : treeRows(R), lang));
  $('x-xlsx').addEventListener('click', async () => {
    let XLSX; try { XLSX = await loadXLSX(BASE); } catch (e) { status(T('x.fail'), 'err'); return; }
    const sheets = [{ name: T('x.info'), rows: infoRows(), widths: [26, 110] }];
    if (R.kind === 'both') sheets.push({ name: T('x.cmpu'), rows: bothUnitRows() }, { name: T('x.cmpt'), rows: bothTreeRows() }, { name: T('x.units') + ' A', rows: unitRows(R.allo) }, { name: T('x.trees') + ' A', rows: treeRows(R.allo) }, { name: T('x.units') + ' V', rows: unitRows(R.vol) }, { name: T('x.trees') + ' V', rows: treeRows(R.vol) });
    else sheets.push({ name: T('x.units'), rows: unitRows(R) }, { name: T('x.trees'), rows: treeRows(R) });
    if (U && U.status === 'ok') sheets.push({ name: T('x.mcu'), rows: mcUnitRows() }, { name: T('x.mct'), rows: mcTreeRows() });
    download(fname() + '.xlsx', xlsxBlob(XLSX, sheets));
  });
  $('x-json').addEventListener('click', () => {
    const used = parts().flatMap(P => P.used || []);
    const body = { tool: B.TOOL, created: R.created, settings: recordSettings(), sets: used.map(s => ({ id: s.id, form: s.form, params: s.params, transform: s.transform, valid: s.valid, species: s.species, component: s.component, source: s.source })) };
    if (R.kind === 'both') Object.assign(body, { allometric: partRecord(R.allo), volume: partRecord(R.vol), comparison: R.cmp.units });
    else Object.assign(body, partRecord(R));
    if (U) body.uncertainty = U.status === 'ok' ? U : { status: U.status, problems: U.problems, B: U.B, seed: U.seed, level: U.level, sets: U.sets };
    downloadRecord(fname() + '.json', body, B.TOOL, S.dsSrc && S.dsSrc.kind === 'table' && S.tbl ? [['trees', S.tbl.imp]] : S.ds ? [['dataset', { kind: 'dataset', dataset: S.ds }]] : [], m => status(m, 'err'));
  });
}
const partRecord = P => ({ counts: P.counts || null, unmapped: P.unmapped || null, noheight: P.noheight || null, missing: P.missing || null, units: P.units });
const fname = () => `${lang === 'tr' ? 'biyokutle-karbon' : 'biomass-carbon'}-${new Date().toISOString().slice(0, 10)}`;
function partSettings(P) {
  return P.kind === 'allometric' ? { approach: 'allometric', components: S.comps.map(c => ({ key: c.key, label: c.label, CF: num(c.CF) })), map: S.map, total: S.total, emptyCombos: S.ec }
    : { approach: 'volume', volumeFrom: P.cfg.from, volumeColumn: P.cfg.col, volumeBark: P.cfg.bark, factors: P.cfg.factors, CF: P.cfg.CF, factorSource: P.cfg.src, emptyCombos: S.ec };
}
function recordSettings() { return R.kind === 'both' ? { approach: 'both', allometric: partSettings(R.allo), volume: partSettings(R.vol) } : partSettings(R); }
function infoRows() {
  const rows = [[T('x.k'), T('x.v')], [T('x.tool'), `${B.TOOL.id} ${B.TOOL.version}`], [T('x.date'), R.created], [T('x.lang'), lang], [T('x.data'), (S.dsSrc && S.dsSrc.name) || ''], [T('x.approach'), T('a.' + R.kind)]];
  for (const P of parts()) {
    if (P.kind === 'allometric') {
      for (const c of S.comps) rows.push([`${T('c.name')}: ${c.label}`, `CF = ${c.CF}`]);
      for (const s of P.used) rows.push([`${T('x.set')}: ${setLabel(s)}`, `${T('x.src')}: ${s.source.citation}${s.source.doi ? ' · DOI ' + s.source.doi : ''}`]);
      rows.push(['', T('r.note', { list: [...new Set(P.used.map(s => s.source.citation))].join('; ') })]);
    } else {
      rows.push([T('x.vfrom'), srcText(P)]);
      if (P.cfg.from.kind === 'secvol') rows.push([T('x.pkg'), P.cfg.from.package]);
      rows.push([T('x.factors'), JSON.stringify(P.cfg.factors)], ['CF', String(P.cfg.CF)], [T('x.src'), P.cfg.src], ['', T('v.note')]);
    }
  }
  if (R.kind === 'both') rows.push([T('x.rule'), T('b.sub')]);
  if (U) rows.push([T('mc.h'), U.status === 'ok' ? mcSettingsText() : T('mc.st.' + U.status)], ...(U.status === 'ok' ? [['', T('mc.assume')]] : []));
  rows.push([T('x.rule'), T('u.note')], [T('x.rule'), 'CO₂ = C × 44/12']);
  return rows;
}
function unitRows(P) { const cols = unitCols(P); return [[T('u.plot'), T('u.period'), T('u.n'), ...cols.map(c => `${c.l} (Mg/ha)`)], ...P.units.map(u => [u.plot_id, u.period ?? '', u.n, ...cols.map(c => c.v(u))])]; }
function treeRows(P) {
  if (P.kind === 'allometric') return [[T('g.row'), T('u.plot'), 'tree', T('u.period'), T('m.sp'), 'D (cm)', 'H (m)', 'height_source', ...S.comps.flatMap(c => [`${c.label} ${T('g.status')}`, `${c.label} (kg)`, `${c.label} C (kg)`, `${c.label} ${T('g.set')}`]), 'Σ (kg)', 'C (kg)'],
    ...P.trees.map(x => [x.row, x.t.plot_id, x.t.tree_id ?? '', x.t.period ?? '', x.t.species ?? '', x.t.dbh, x.t.height ?? null, x.t.height_source || (x.t.height != null ? 'measured' : ''),
      ...S.comps.flatMap(c => { const r = x.comps[c.key]; return [r.status, r.value, r.C, r.setId || '']; }), x.sum, x.C])];
  return [[T('g.row'), T('u.plot'), 'tree', T('u.period'), T('m.sp'), 'D (cm)', 'V (m³)', T('g.status'), 'AGB (kg)', 'BGB (kg)', 'B (kg)', 'C (kg)'],
    ...P.trees.map(x => [x.row, x.t.plot_id, x.t.tree_id ?? '', x.t.period ?? '', x.t.species ?? '', x.t.dbh, x.V, x.status, x.agb, x.bgb, x.total, x.C])];
}
function bothUnitRows() { return [[T('u.plot'), T('u.period'), T('b.appr'), T('u.n'), `${T('u.B')} (Mg/ha)`, `${T('u.C')} (Mg/ha)`, `${T('u.CO2')} (Mg/ha)`], ...R.cmp.units.map(u => [u.plot_id, u.period ?? '', T('a.' + u.approach + '.s'), u.n, u.B, u.C, u.CO2])]; }
function bothTreeRows() { return [[T('g.row'), T('u.plot'), 'tree', T('u.period'), T('m.sp'), 'D (cm)', T('b.appr'), T('g.status'), 'B (kg)', 'C (kg)'], ...R.cmp.trees.map(x => [x.row, x.t.plot_id, x.t.tree_id ?? '', x.t.period ?? '', x.t.species ?? '', x.t.dbh, T('a.' + x.approach + '.s'), x.status, x.B, x.C])]; }

/* ---------------- BC04: Monte Carlo uncertainty (mc.js) ---------------- */
const alloPart = () => R.kind === 'allometric' ? R : R.kind === 'both' ? R.allo : null;
const mcSettingsText = () => T('mc.settings', { B: U.B, seed: U.seed, level: U.level * 100 });
const partsText = parts => parts.length ? parts.map(p => T('mc.part.' + p)).join(' + ') : T('mc.part.none');
function mcHTML() {
  let h = `<h2>${T('mc.h')}</h2>`;
  const A = alloPart();
  if (!A) return h + `<p class="note small" id="mcnone">${T('mc.vol')}</p>`;
  h += `<p class="muted small">${T('mc.sub')}</p>${R.kind === 'both' ? `<p class="note small">${T('mc.vol')}</p>` : ''}
    <div class="lims"><label>${T('mc.B')} <input type="text" inputmode="numeric" size="7" id="mc-B" value="${esc(S.mc.B)}"></label><label>${T('mc.seed')} <input type="text" inputmode="numeric" size="11" id="mc-seed" value="${esc(S.mc.seed)}"></label>
    <label>${T('mc.level')} <select id="mc-level">${['0.9', '0.95', '0.99'].map(v => `<option value="${v}"${S.mc.level === v ? ' selected' : ''}>${+v * 100} %</option>`).join('')}</select></label>
    <button type="button" class="btn ghost" id="mc-run">${T('mc.run')}</button></div><div id="mcout">${U ? mcResultHTML() : ''}</div>`;
  return h;
}
function mcResultHTML() {
  if (U.status === 'noinfo') return `<p class="note warn" id="mcnoinfo">${T('mc.st.noinfo')}</p>`;
  if (U.status === 'bad') return `<p class="note err" id="mcbad">${esc(U.problems.map(p => (p.set ? (setsById().get(p.set) ? setLabel(setsById().get(p.set)) : p.set) + ': ' : '') + T('mc.p.' + p.code)).join(' · '))}</p>`;
  const sl = id => { const s = setsById().get(id); return s ? setLabel(s) : id; };
  let h = `<p class="small" id="mcset">${esc(mcSettingsText())}</p><ul class="small" id="mcparts">${U.sets.map(x => `<li data-set="${esc(x.id)}">${esc(sl(x.id))}: <b>${esc(partsText(x.parts))}</b></li>`).join('')}</ul>`;
  if (U.fixed.length) h += `<p class="note warn small" id="mcfixed">${esc(T('mc.fixed', { n: U.fixed.length }))}</p>`;
  if (U.negative) h += `<p class="note warn small" id="mcneg">${esc(T('mc.neg', { n: U.negative }))}</p>`;
  const cell = q => q ? `<td class="num">${f(q.point, 3)}</td><td class="num" data-k="mean">${f(q.mean, 3)}</td><td class="num" data-k="sd">${f(q.sd, 3)}</td><td class="num">${q.cv == null ? '–' : f(q.cv * 100, 1)}</td><td class="num" data-k="lo">${f(q.lo, 3)}</td><td class="num" data-k="hi">${f(q.hi, 3)}</td>` : '<td colspan="6" class="muted">–</td>';
  const head = q => `<th>${q}</th><th>${T('mc.mean')}</th><th>${T('mc.sd')}</th><th>CV %</th><th>${T('mc.lo')}</th><th>${T('mc.hi')}</th>`;
  h += `<div class="tscroll"><table class="grid" id="mctab"><thead><tr><th rowspan="2">${T('u.plot')}</th><th rowspan="2">${T('u.period')}</th><th colspan="6">${T('u.B')} (Mg/ha)</th><th colspan="6">CO₂ (Mg/ha)</th></tr><tr>${head(T('mc.point'))}${head(T('mc.point'))}</tr></thead><tbody>
    ${U.units.map(u => `<tr data-u="${esc(u.plot_id)}|${esc(u.period ?? '')}"><th>${esc(u.plot_id)}</th><td>${esc(u.period ?? '–')}</td>${cell(u.B)}${cell(u.CO2)}</tr>`).join('')}</tbody></table></div>`;
  const K = 200, tr = U.trees.map((t, i) => [t, alloPart().trees[i]]).filter(([t]) => t).slice(0, K);
  h += `<details class="more"><summary>${T('mc.trees')}</summary><div class="tscroll tall"><table class="grid" id="mcttab"><thead><tr><th>${T('g.row')}</th><th>${T('u.plot')}</th><th>${T('m.sp')}</th>${head('B (kg)')}</tr></thead><tbody>
    ${tr.map(([t, x]) => `<tr><td class="num">${t.row ?? '–'}</td><td>${esc(x.t.plot_id)}</td><td>${esc(x.t.species ?? '')}</td>${cell(t.B)}</tr>`).join('')}</tbody></table></div></details>
    <p class="muted small" id="mcassume">${T('mc.assume')}</p>`;
  return h;
}
function bindMC() {
  if (!$('mc-run')) return;
  const keep = () => { S.mc = { B: $('mc-B').value.trim(), seed: $('mc-seed').value.trim(), level: $('mc-level').value }; save(); };
  ['mc-B', 'mc-seed', 'mc-level'].forEach(id => $(id).addEventListener('change', keep));
  $('mc-run').addEventListener('click', () => {
    keep(); $('mcout').innerHTML = `<p class="small">${T('mc.busy')}</p>`;
    setTimeout(() => {
      const A = alloPart(), cfg = { components: S.comps.map(c => ({ key: c.key, label: c.label, CF: num(c.CF) })), map: S.map, total: S.total, emptyCombos: S.ec };
      const Bn = /^\d+$/.test(S.mc.B) ? +S.mc.B : NaN, seed = /^\d+$/.test(S.mc.seed) ? +S.mc.seed : NaN;
      U = MC.monteCarlo(S.ds, cfg, setsById(), A, { B: Bn, seed, level: +S.mc.level });
      $('mcout').innerHTML = mcResultHTML();
    }, 20);
  });
}
function mcUnitRows() {
  const q = ['point', 'mean', 'sd', 'cv', 'lo', 'hi'], H = k => q.map(x => `${k} ${T('mc.c.' + x)}`);
  return [[T('u.plot'), T('u.period'), T('u.n'), ...H('B (Mg/ha)'), ...H('C (Mg/ha)'), ...H('CO₂ (Mg/ha)')], ...U.units.map(u => [u.plot_id, u.period ?? '', u.n, ...['B', 'C', 'CO2'].flatMap(k => q.map(x => u[k] ? u[k][x] : null))]), [], [mcSettingsText()], [T('mc.assume')],
    ...U.sets.map(x => [x.id, partsText(x.parts)])];
}
function mcTreeRows() {
  const q = ['point', 'mean', 'sd', 'cv', 'lo', 'hi'], A = alloPart();
  return [[T('g.row'), T('u.plot'), 'tree', T('m.sp'), ...q.map(x => `B (kg) ${T('mc.c.' + x)}`), ...q.map(x => `C (kg) ${T('mc.c.' + x)}`)],
    ...U.trees.map((t, i) => { const x = A.trees[i]; return [x.row, x.t.plot_id, x.t.tree_id ?? '', x.t.species ?? '', ...q.map(k => t ? t.B[k] ?? null : null), ...q.map(k => t ? t.C[k] ?? null : null)]; })];
}

/* ---------------- shell ---------------- */
function canGo(n) { if (n <= 1) return true; if (!S.ds) return false; if (n === 2) return true; return !settingsProblems().length; }
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
    const a = await get('dataset:approved'); if (a && !validateDataset(a).length) approved = a;
    sets = await listCoefs('biomass');
    const saved = await get(KEY); if (saved && saved.v === 1) { S = { ...blank(), ...saved, vol: { ...blank().vol, ...(saved.vol || {}) }, mc: { ...blank().mc, ...(saved.mc || {}) } }; status(T('restored', { when: new Date(saved.saved).toLocaleString(LOC) })); }
    if (S.tbl && S.tbl.imp && S.tbl.imp.buf && !S.tbl.src) S.tbl.src = await readImport(S.tbl.imp, BASE).catch(() => null);
    await loadDerived();
  } catch (e) { S = blank(); }
  render();
})();
