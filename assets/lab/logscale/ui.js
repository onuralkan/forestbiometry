// Log scaling (SV-05): user interface. All arithmetic in calc.js (tested in tests/logscale/).
import * as LS from './calc.js';
import { T } from './i18n.js';
import { lang, fmtNum, esc } from '../core/i18n.js';
import { put, get, del, autosave } from '../core/store.js';
import { renderImport, readImport } from '../core/importer.js';
import { cellText } from '../core/table.js';
import { parseNumber, detectDecimal, defaultDecimal } from '../core/num.js';
import { download, downloadCSV, xlsxBlob, loadXLSX } from '../core/export.js';
import { downloadRecord, recordOption } from '../core/record-ui.js';

const BASE = './', KEY = 'session:' + LS.TOOL.id, LOC = 'en-GB', $ = id => document.getElementById(id);
const f = (x, d = 3) => x == null || !Number.isFinite(x) ? '–' : fmtNum(x, d);
const num = t => { const s = String(t ?? '').trim(); if (s === '') return null; const r = parseNumber(s.replace(',', '.'), '.'); return r.status === 'ok' ? r.value : NaN; };
let S = blank(), R = null;
function blank() {
  return { v: 1, step: 1, mode: 'single', one: { ds: '', db: '', dm: '', L: '' }, tbl: null, logs: null,
    rules: { scribner: true, doyle: true, intl8: false, intl4: true }, o: { roundD: true, len: 'whole', max: '', round5: false } };
}
const AS = autosave(KEY, () => ({ ...S, saved: new Date().toISOString() }));
function save() { AS.save(); }
function flush() { return AS.flush(); }
function status(m, k = '') { const s = $('status'); s.className = 'status ' + k; s.textContent = m || ''; }

/* ---------------- step 1: logs ---------------- */
const GUESS = { id: ['tomruk', 'log', 'id', 'no'], ds: ['ince_uc_cm', 'ince_uc', 'ds', 'small_end', 'd_small'], db: ['kalin_uc_cm', 'kalin_uc', 'db', 'large_end', 'd_large'], dm: ['orta_cm', 'orta', 'dm', 'middle', 'd_mid'], L: ['boy_m', 'boy', 'l', 'length', 'length_m'] };
function setTable(st) {
  if (!st.src) { S.tbl = null; save(); renderStep1(); return; }
  const H = st.src.headers.map(h => String(h).trim().toLocaleLowerCase('tr')), map = {};
  for (const k of Object.keys(GUESS)) { const i = H.findIndex(h => GUESS[k].includes(h)); map[k] = i < 0 ? null : i; }
  S.tbl = { imp: st.imp, src: st.src, map, decimal: null, decChosen: false }; S.logs = null; status(''); save(); renderStep1();
}
function useTable() {
  const t = S.tbl, src = t.src, val = (r, c) => { if (c == null) return null; const x = r[c]; if (x && x.t === 'n') return x.v; const p = parseNumber(cellText(x), t.decimal); return p.status === 'ok' ? p.value : null; };
  S.logs = src.rows.map((r, i) => ({ row: src.rowNumbers[i], id: t.map.id != null ? cellText(r[t.map.id]) : String(src.rowNumbers[i]), ds: val(r, t.map.ds), db: val(r, t.map.db), dm: val(r, t.map.dm), Lm: val(r, t.map.L) }));
  R = null; save(); render();
}
function singleLogs() {
  const o = S.one, l = { row: null, id: '1', ds: num(o.ds), db: num(o.db), dm: num(o.dm), Lm: num(o.L) };
  return l.ds > 0 && l.Lm > 0 && (l.db == null || l.db >= l.ds) && !Number.isNaN(l.db) && !Number.isNaN(l.dm) ? [l] : null;
}
const currentLogs = () => S.mode === 'single' ? singleLogs() : S.logs;
function renderStep1() {
  const el = $('step1');
  let h = `<div class="card"><h2>${T('mode.h')}</h2><div class="radios">${['single', 'table'].map(m => `<label><input type="radio" name="mode" value="${m}"${S.mode === m ? ' checked' : ''}> ${T('mode.' + m)}</label>`).join(' ')}</div>`;
  if (S.mode === 'single') {
    const o = S.one;
    h += `<div class="lims">${['ds', 'db', 'dm', 'L'].map(k => `<label>${T('in.' + k)} <input type="text" inputmode="decimal" size="7" id="in-${k}" value="${esc(o[k])}"></label>`).join('')}</div>${singleLogs() || !o.ds ? '' : `<p class="note err small" id="single-bad">${T('p.single')}</p>`}</div>`;
  } else h += `</div><div id="tblbox"></div><div id="mapbox"></div><div class="card"><p><button type="button" class="btn ghost" id="sample">${T('sample')}</button> <span class="muted small">${T('sample.note')}</span></p>${S.logs ? `<p class="note ok" id="dsinfo">${esc(T('src.info', { n: S.logs.length }))}</p>` : ''}</div>`;
  const ok = !!currentLogs();
  h += `<div class="nav"><button type="button" class="btn ghost" id="reset">${T('reset')}</button><button type="button" class="btn" id="to2"${ok ? '' : ' disabled'}>${T('next')}</button>${ok ? '' : `<span class="muted small">${T('need.data')}</span>`}</div>`;
  el.innerHTML = h;
  el.querySelectorAll('input[name="mode"]').forEach(x => x.addEventListener('change', () => { S.mode = x.value; R = null; save(); render(); }));
  for (const k of ['ds', 'db', 'dm', 'L']) $('in-' + k) && $('in-' + k).addEventListener('change', e => { S.one[k] = e.target.value.trim(); R = null; save(); render(); });
  if (S.mode === 'table') {
    renderImport($('tblbox'), { imp: S.tbl && S.tbl.imp, src: S.tbl && S.tbl.src }, { base: BASE, title: T('tb.h'), sub: T('tb.sub'), onChange: setTable, onError: m => status(m, 'err') });
    renderMap();
    $('sample').addEventListener('click', async () => {
      const buf = await (await fetch(BASE + 'assets/lab/logscale/ornek/ornek-tomruk.csv')).arrayBuffer();
      const imp = { kind: 'csv', name: 'ornek-tomruk.csv (simulated)', buf, encoding: 'utf-8', delim: null, header: true, sheet: null };
      setTable({ imp, src: await readImport(imp, BASE) }); S.tbl.decimal = ','; S.tbl.decChosen = true; useTable();
    });
  }
  $('reset').addEventListener('click', async () => { S = blank(); R = null; status(''); render(); await del(KEY); });
  $('to2').addEventListener('click', () => go(2));
}
function renderMap() {
  const box = $('mapbox'); if (!box) return;
  if (!S.tbl || !S.tbl.src) { box.innerHTML = ''; return; }
  const t = S.tbl, src = t.src;
  const dv = detectDecimal(['ds', 'db', 'dm', 'L'].map(k => t.map[k]).filter(c => c != null).flatMap(c => src.rows.map(r => r[c]).filter(x => x && x.t === 's').map(x => x.v)));
  if (!t.decChosen) t.decimal = defaultDecimal(dv.verdict);
  const opts = cur => `<option value="">${T('none')}</option>` + src.headers.map((x, i) => `<option value="${i}"${cur === i ? ' selected' : ''}>${esc(x)}</option>`).join('');
  box.innerHTML = `<div class="card"><div class="lims">${['id', 'ds', 'db', 'dm', 'L'].map(k => `<label>${T('map.' + k)} <select data-map="${k}">${opts(t.map[k])}</select></label>`).join('')}</div>
    <div class="radios"><span class="small">${T('dec.h')}:</span> <label class="small"><input type="radio" name="tdec" value="."${t.decimal === '.' ? ' checked' : ''}> ${T('dec.dot')}</label><label class="small"><input type="radio" name="tdec" value=","${t.decimal === ',' ? ' checked' : ''}> ${T('dec.comma')}</label></div>
    <div class="nav"><button type="button" class="btn" id="usetbl"${t.map.ds == null || t.map.L == null ? ' disabled' : ''}>${T('map.use')}</button></div></div>`;
  box.querySelectorAll('[data-map]').forEach(x => x.addEventListener('change', () => { t.map[x.dataset.map] = x.value === '' ? null : +x.value; save(); renderMap(); }));
  box.querySelectorAll('input[name="tdec"]').forEach(x => x.addEventListener('change', () => { t.decimal = x.value; t.decChosen = true; save(); }));
  $('usetbl').addEventListener('click', useTable);
}

/* ---------------- step 2: rules ---------------- */
const opts = () => ({ roundD: S.o.roundD, lengthRule: S.o.len, maxFt: num(S.o.max), round5: S.o.round5 });
function step2Problems() {
  const p = []; if (!LS.RULES.some(r => S.rules[r])) p.push(T('p.rules'));
  const m = num(S.o.max); if (m !== null && !(m > 0)) p.push(T('p.max'));
  return p;
}
function renderStep2() {
  const el = $('step2'), o = S.o;
  let h = `<div class="card"><h2>${T('r.h')}</h2><p class="muted small">${T('r.sub')}</p><div class="radios col">${LS.RULES.map(r => `<label><input type="checkbox" data-rule="${r}"${S.rules[r] ? ' checked' : ''}> ${T('r.' + r)}</label>`).join('')}</div></div>
    <div class="card"><h2>${T('o.h')}</h2><label class="chk"><input type="checkbox" id="o-roundD"${o.roundD ? ' checked' : ''}> ${T('o.roundD')}</label>
    <div class="lims"><label>${T('o.len')} <select id="o-len">${['whole', 'even', 'none'].map(v => `<option value="${v}"${o.len === v ? ' selected' : ''}>${T('o.len.' + v)}</option>`).join('')}</select></label>
    <label>${T('o.max')} <input type="text" inputmode="decimal" size="6" id="o-max" value="${esc(o.max)}"></label></div>
    <label class="chk"><input type="checkbox" id="o-round5"${o.round5 ? ' checked' : ''}> ${T('o.round5')}</label><p class="muted small" id="onote">${T('o.note')}</p></div>`;
  const pr = step2Problems();
  h += `<div class="nav"><button type="button" class="btn ghost" id="back1">${T('back')}</button><button type="button" class="btn" id="calc"${pr.length ? ' disabled' : ''}>${T('calc')}</button>${pr.length ? `<span class="muted small" id="s2prob">${pr.map(esc).join(' · ')}</span>` : ''}</div>`;
  el.innerHTML = h;
  const re = () => { R = null; save(); renderStep2(); renderSteps(); };
  el.querySelectorAll('[data-rule]').forEach(x => x.addEventListener('change', () => { S.rules[x.dataset.rule] = x.checked; re(); }));
  $('o-roundD').addEventListener('change', e => { o.roundD = e.target.checked; re(); });
  $('o-round5').addEventListener('change', e => { o.round5 = e.target.checked; re(); });
  $('o-len').addEventListener('change', e => { o.len = e.target.value; re(); });
  $('o-max').addEventListener('change', e => { o.max = e.target.value.trim(); re(); });
  $('back1').addEventListener('click', () => go(1));
  $('calc').addEventListener('click', () => { compute(); go(3); });
}

/* ---------------- step 3: results ---------------- */
const rulesOn = () => LS.RULES.filter(r => S.rules[r]);
function compute() {
  const rules = rulesOn(), o = opts();
  R = { created: new Date().toISOString(), rules, settings: o, logs: currentLogs().map(l => ({ ...l, r: LS.scaleLog(l, rules, o) })) };
}
const ruleName = r => T('r.' + r).replace(/ \(.*\)$/, '');
function totals() {
  const t = {}; for (const r of R.rules) { const vals = R.logs.map(l => l.r.status === 'ok' ? l.r.bf[r].V : null); t[r] = { sum: vals.filter(v => v != null).reduce((a, b) => a + b, 0), n: vals.filter(v => v != null).length }; }
  for (const k of ['smalian', 'huber', 'newton']) { const v = R.logs.map(l => l.r.cubic[k]).filter(x => x != null); t[k] = { sum: v.reduce((a, b) => a + b, 0), n: v.length }; }
  return t;
}
function renderStep3() {
  if (!R) compute();
  const el = $('step3'), tot = totals();
  let h = `<div class="card"><h2>${T('res.h')}</h2><div class="tscroll"><table class="grid" id="ltab"><thead><tr><th>${T('res.id')}</th><th>${T('res.ds')}</th><th>${T('res.L')}</th><th>${T('res.Lft')}</th><th>${T('res.Din')}</th>${R.rules.map(r => `<th>${esc(T('res.bf', { r: ruleName(r) }))}</th>`).join('')}<th>${T('res.sm')}</th><th>${T('res.hu')}</th><th>${T('res.ne')}</th></tr></thead><tbody>`;
  for (const l of R.logs) {
    const r = l.r;
    if (r.status !== 'ok') { h += `<tr data-log="${esc(l.id)}"><td>${esc(l.id)}</td><td class="num">${f(l.ds, 1)}</td><td class="num">${f(l.Lm, 2)}</td><td colspan="${2 + R.rules.length}" class="small">${esc(T('e.' + r.code))}</td><td class="num">${f(r.cubic.smalian, 4)}</td><td class="num">${f(r.cubic.huber, 4)}</td><td class="num">${f(r.cubic.newton, 4)}</td></tr>`; continue; }
    h += `<tr data-log="${esc(l.id)}"><td>${esc(l.id)}</td><td class="num">${f(l.ds, 1)}</td><td class="num">${f(l.Lm, 2)}</td><td class="num">${r.segments.map(s => f(s.L, 1)).join(' + ')}</td><td class="num">${r.segments.map(s => f(s.Din, 1)).join(' / ')}</td>
      ${R.rules.map(k => { const b = r.bf[k]; return b.V == null ? `<td class="small muted" data-k="${k}">${esc(T('e.' + b.code))}</td>` : `<td class="num" data-k="${k}">${f(b.V, 1)}</td>`; }).join('')}
      <td class="num">${f(r.cubic.smalian, 4)}</td><td class="num">${f(r.cubic.huber, 4)}</td><td class="num">${f(r.cubic.newton, 4)}</td></tr>`;
  }
  h += `<tr class="tot"><th>${T('res.tot')}</th><td></td><td></td><td></td><td></td>${R.rules.map(k => `<td class="num" data-tot="${k}"${tot[k].n < R.logs.length ? ` title="${esc(T('res.partial'))}"` : ''}>${tot[k].n === R.logs.length ? f(tot[k].sum, 1) : '–'}</td>`).join('')}${['smalian', 'huber', 'newton'].map(k => `<td class="num">${tot[k].n === R.logs.length ? f(tot[k].sum, 4) : '–'}</td>`).join('')}</tr></tbody></table></div>
    <p class="muted small" id="resnote">${T('res.note')}</p></div>`;
  h += `<div class="card"><h2>${T('x.h')}</h2><div class="exports"><button type="button" class="btn" id="x-xlsx">${T('x.xlsx')}</button><button type="button" class="btn ghost" id="x-csv">${T('x.csv')}</button><button type="button" class="btn ghost" id="x-json">${T('x.json')}</button>${recordOption()}</div></div>
    <div class="nav"><button type="button" class="btn ghost" id="back2">${T('back')}</button></div>`;
  el.innerHTML = h;
  $('back2').addEventListener('click', () => go(2));
  const name = ext => `log-scaling-${new Date().toISOString().slice(0, 10)}.${ext}`;
  $('x-csv').addEventListener('click', () => downloadCSV(name('csv'), logRows(), lang));
  $('x-xlsx').addEventListener('click', async () => {
    let XLSX; try { XLSX = await loadXLSX(BASE); } catch (e) { status(T('x.fail'), 'err'); return; }
    download(name('xlsx'), xlsxBlob(XLSX, [{ name: T('x.info'), rows: infoRows(), widths: [26, 100] }, { name: T('x.logs'), rows: logRows() }, { name: T('x.segs'), rows: segRows() }]));
  });
  $('x-json').addEventListener('click', () => downloadRecord(name('json'), { tool: LS.TOOL, created: R.created, rules: R.rules, settings: R.settings, units: { input: { d: 'cm', L: 'm' }, rules: { D: 'in', L: 'ft', V: 'board feet' }, cubic: 'm3' },
    logs: R.logs.map(l => ({ id: l.id, row: l.row, ds: l.ds, db: l.db, dm: l.dm, Lm: l.Lm, ...l.r })) }, LS.TOOL, S.mode === 'table' && S.tbl ? [['logs', S.tbl.imp]] : [], m => status(m, 'err')));
}
function logRows() {
  return [['log', 'row', 'ds_cm', 'db_cm', 'dm_cm', 'L_m', 'L_ft', 'segments', ...R.rules.map(r => r + '_bf'), 'smalian_m3', 'huber_m3', 'newton_m3', 'status'],
    ...R.logs.map(l => { const r = l.r, ok = r.status === 'ok'; return [l.id, l.row, l.ds, l.db, l.dm, l.Lm, ok ? r.Lft : null, ok ? r.segments.length : null, ...R.rules.map(k => ok ? r.bf[k].V : null), r.cubic.smalian, r.cubic.huber, r.cubic.newton, ok ? 'ok' : r.code]; })];
}
function segRows() {
  const rows = [['log', 'segment', 'from_ft', 'L_ft', 'D_cm', 'D_in', ...R.rules.map(r => r + '_bf')]];
  for (const l of R.logs) if (l.r.status === 'ok') l.r.segments.forEach((s, i) => rows.push([l.id, i + 1, s.from, s.L, s.Dcm, s.Din, ...R.rules.map(k => l.r.bf[k].segs[i])]));
  return rows;
}
function infoRows() {
  return [[T('x.k'), T('x.v')], [T('x.tool'), `${LS.TOOL.id} ${LS.TOOL.version}`], [T('x.date'), R.created], [T('x.rule'), R.rules.map(r => T('r.' + r)).join('; ')], [T('o.h'), JSON.stringify(R.settings)],
    [T('x.src'), 'Kershaw, J.A., Ducey, M.J., Beers, T.W., Husch, B. 2016. Forest Mensuration, 5th ed., Wiley, §7.3, §7.4.1, Table 6.1'], ['', T('o.note')], ['', T('res.note')]];
}

/* ---------------- shell ---------------- */
function canGo(n) { if (n <= 1) return true; if (!currentLogs()) return false; if (n === 2) return true; return !step2Problems().length; }
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
    if (saved && saved.v === 1) { S = { ...blank(), ...saved, one: { ...blank().one, ...(saved.one || {}) }, rules: { ...blank().rules, ...(saved.rules || {}) }, o: { ...blank().o, ...(saved.o || {}) } }; status(T('restored', { when: new Date(saved.saved).toLocaleString(LOC) })); }
    if (S.tbl && S.tbl.imp && S.tbl.imp.buf && !S.tbl.src) S.tbl.src = await readImport(S.tbl.imp, BASE).catch(() => null);
  } catch (e) { S = blank(); }
  render();
})();
