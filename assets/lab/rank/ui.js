// Relative Ranking (Nispi Sıralama): user interface. All arithmetic lives in calc.js.
import * as C from './calc.js';
import { T } from './i18n.js';
import { lang, fmtNum, esc } from '../core/i18n.js';
import { put, get, del } from '../core/store.js';
import { cellText } from '../core/table.js';
import { detectDecimal } from '../core/num.js';
import { download, downloadCSV, xlsxBlob, loadXLSX } from '../core/export.js';
import { radarChart, svgForDownload } from '../core/chart.js';
import { renderImport, readImport } from '../core/importer.js';

const BASE = '../', KEY = 'session:' + C.TOOL.id, LOC = lang === 'tr' ? 'tr-TR' : 'en-GB';
const $ = id => document.getElementById(id);
const f = (x, d = 3) => x == null || !Number.isFinite(x) ? '–' : fmtNum(x, d);
const fv = x => x == null ? '–' : fmtNum(x, 6);

let S = blank(), D = null, Rk = null;
function blank() {
  return { v: 1, step: 1, tab: 'table', imp: null, src: null, headerRow: 0, modelCol: 0, crit: {}, decimal: null, decimalChosen: false,
    excl: [], showVals: false, rd: { best: true, nb: 5, worst: true, nw: 5, extra: [] } };
}
let saveT = null;
function save() { clearTimeout(saveT); saveT = setTimeout(flush, 250); }
async function flush() { clearTimeout(saveT); saveT = null; await put(KEY, { ...S, saved: new Date().toISOString() }); }
$('langlink') && $('langlink').addEventListener('click', async e => { e.preventDefault(); const h = e.currentTarget.href; await flush(); location.href = h; });
function status(m, k = '') { const s = $('status'); s.className = 'status ' + k; s.textContent = m || ''; }

/* ---------------- data ---------------- */
function headerCells() { return (S.src.rows[S.headerRow] || []).map((c, j) => cellText(c).trim() || `#${j + 1}`); }
function initCriteria() {
  S.crit = {};
  headerCells().forEach((h, j) => {
    if (j === S.modelCol) return;
    const hasNum = S.src.rows.slice(S.headerRow + 1).some(r => r[j] && (r[j].t === 'n' || /\d/.test(cellText(r[j]))));
    if (!hasNum) return;
    const dir = C.suggestDirection(h);
    S.crit[j] = { use: true, dir, suggested: !!dir };
  });
}
function setTable(state) {
  S = { ...blank(), step: S.step, imp: state.imp, src: state.src }; D = Rk = null;
  if (S.src) {
    const dv = detectDecimal(S.src.rows.flatMap(r => r.filter(c => c && c.t === 's').map(c => c.v)));
    S.decimal = dv.verdict === 'comma' ? ',' : '.';
    S.headerRow = C.guessHeaderRow(S.src.rows, S.decimal);
    S.decimal = null; initCriteria();
  }
  status(''); save(); render();
}
function renderStep1() {
  const el = $('step1');
  el.innerHTML = `<div id="impbox"></div><div class="card sample"><button type="button" class="btn ghost" id="sample">${T('sample')}</button><span class="muted small">${T('sample.note')}</span></div>
    <div class="nav"><button type="button" class="btn ghost" id="reset">${T('reset')}</button><button type="button" class="btn" id="to2"${S.src ? '' : ' disabled'}>${T('next')}</button>${S.src ? '' : `<span class="muted small">${T('need.data')}</span>`}</div>`;
  renderImport($('impbox'), { imp: S.imp, src: S.src }, { base: BASE, title: T('imp.h'), sub: T('imp.sub'), onChange: setTable, onError: m => status(m, 'err'), rawRows: true });
  $('sample').addEventListener('click', async () => {
    const buf = await (await fetch(BASE + 'assets/lab/rank/ornek/ornek-olcutler.xlsx')).arrayBuffer();
    const imp = { kind: 'xlsx', name: lang === 'tr' ? 'ornek-olcutler.xlsx (uydurma)' : 'ornek-olcutler.xlsx (made up)', buf, header: false, sheet: null };
    setTable({ imp, src: await readImport(imp, BASE) });
  });
  $('reset').addEventListener('click', async () => { S = blank(); D = Rk = null; status(''); render(); await del(KEY); });
  $('to2').addEventListener('click', () => go(2));
}

/* ---------------- criteria ---------------- */
function critList() { return Object.entries(S.crit).filter(([, c]) => c.use).map(([j, c]) => ({ col: +j, dir: c.dir })); }
function problems() {
  const p = [], cl = critList();
  if (!cl.length) p.push(T('need.crit'));
  const nodir = cl.filter(c => !C.DIRS.includes(c.dir)).map(c => headerCells()[c.col]);
  if (nodir.length) p.push(T('need.dir', { names: nodir }));
  if (cl.some(c => c.col === S.modelCol)) p.push(T('need.model'));
  if (!S.decimal) p.push(T('dec.choose'));
  return p;
}
function renderStep2() {
  const el = $('step2'), H = headerCells(), rows = S.src.rows;
  const dv = detectDecimal(rows.slice(S.headerRow + 1).flatMap(r => critList().map(c => r[c.col]).filter(c => c && c.t === 's').map(c => c.v)));
  if (!S.decimalChosen) S.decimal = dv.verdict === 'dot' ? '.' : dv.verdict === 'comma' ? ',' : dv.verdict === 'none' ? '.' : null;
  const rowOpts = rows.slice(0, 30).map((r, i) => `<option value="${i}"${i === S.headerRow ? ' selected' : ''}>${S.src.rowNumbers[i]}: ${esc(r.map(c => cellText(c)).filter(Boolean).slice(0, 5).join(' | ').slice(0, 70))}</option>`).join('');
  let h = `<div class="card"><h2>${T('hdr.h')}</h2><div class="lims"><label>${T('hdr.row')} <select id="hrow">${rowOpts}</select></label>
    <label>${T('hdr.model')} <select id="mcol">${H.map((x, j) => `<option value="${j}"${j === S.modelCol ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></label></div><p class="muted small">${T('hdr.guess')}</p></div>`;
  const msg = dv.verdict === 'ambiguous' ? T('dec.v.ambiguous', { ex: dv.examples.ambiguous.map(x => `"${x}"`).join(', ') }) : T('dec.v.' + dv.verdict);
  h += `<div class="card"><h2>${T('dec.h')}</h2><p class="note ${dv.verdict === 'ambiguous' || dv.verdict === 'conflict' ? 'warn' : ''}">${esc(msg)}</p>
    <div class="radios"><label><input type="radio" name="dec" value="."${S.decimal === '.' ? ' checked' : ''}> ${T('dec.dot')}</label><label><input type="radio" name="dec" value=","${S.decimal === ',' ? ' checked' : ''}> ${T('dec.comma')}</label></div>
    ${S.imp && S.imp.kind === 'xlsx' ? `<p class="muted small">${T('dec.xlsx')}</p>` : ''}</div>`;
  h += `<div class="card"><h2>${T('cr.h')}</h2><p class="muted">${T('cr.sub')}</p><div class="crits">`;
  for (const [j, c] of Object.entries(S.crit)) {
    const first = rows.slice(S.headerRow + 1, S.headerRow + 4).map(r => `<code>${esc(cellText(r[j]))}</code>`).join(' ');
    h += `<div class="crit${c.use ? '' : ' off'}${c.use && !c.dir ? ' need' : ''}"><label class="chk"><input type="checkbox" data-use="${j}"${c.use ? ' checked' : ''}> <b>${esc(H[j])}</b></label>
      <label>${T('cr.dir')} <select data-dir="${j}"><option value="">${T('dir.none')}</option>${C.DIRS.map(d => `<option value="${d}"${c.dir === d ? ' selected' : ''}>${T('dir.' + d)}</option>`).join('')}</select></label>
      ${c.suggested ? `<span class="muted small">${T('cr.suggested')}</span>` : ''}<span class="small">${first}</span></div>`;
  }
  h += `</div><p class="muted small">${T('aicnote')}</p></div>`;
  const pr = problems();
  if (pr.length) h += `<div class="card"><ul class="probs">${pr.map(x => `<li class="note err">${esc(x)}</li>`).join('')}</ul></div>`;
  h += `<div class="nav"><button type="button" class="btn ghost" id="back1">${T('back')}</button><button type="button" class="btn" id="calc"${pr.length ? ' disabled' : ''}>${T('calc')}</button></div>`;
  el.innerHTML = h;
  const re = () => { D = Rk = null; save(); renderStep2(); renderSteps(); };
  $('hrow').addEventListener('change', e => { S.headerRow = +e.target.value; initCriteria(); S.excl = []; re(); });
  $('mcol').addEventListener('change', e => { S.modelCol = +e.target.value; initCriteria(); S.excl = []; re(); });
  el.querySelectorAll('input[name="dec"]').forEach(x => x.addEventListener('change', () => { S.decimal = x.value; S.decimalChosen = true; re(); }));
  el.querySelectorAll('[data-use]').forEach(x => x.addEventListener('change', () => { S.crit[x.dataset.use].use = x.checked; re(); }));
  el.querySelectorAll('[data-dir]').forEach(x => x.addEventListener('change', () => { const c = S.crit[x.dataset.dir]; c.dir = x.value || null; c.suggested = false; re(); }));
  $('back1').addEventListener('click', () => go(1));
  $('calc').addEventListener('click', () => { compute(); S.tab = 'table'; go(3); });
}
function compute() {
  D = C.readModels(S.src, { headerRow: S.headerRow, modelCol: S.modelCol, criteria: critList(), decimal: S.decimal });
  const ex = new Set(D.models.map((m, i) => S.excl.includes(m.row) ? i : -1).filter(i => i >= 0));
  Rk = C.rank(D, ex);
}

/* ---------------- results ---------------- */
const TABS = ['table', 'radar', 'export'];
function renderStep3() {
  if (!Rk) compute();
  const el = $('step3');
  el.innerHTML = `<div class="tabs" role="tablist">${TABS.map(t => `<button type="button" role="tab" id="tab-${t}" aria-selected="${S.tab === t}" aria-controls="panel" data-tab="${t}">${T('tab.' + t)}</button>`).join('')}</div>
    <div id="panel" class="panel" role="tabpanel" aria-labelledby="tab-${S.tab}"></div><div class="nav"><button type="button" class="btn ghost" id="back2">${T('back')}</button></div>`;
  el.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { S.tab = b.dataset.tab; save(); renderStep3(); }));
  el.querySelector('.tabs').addEventListener('keydown', e => {
    const i = TABS.indexOf(S.tab), d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return; S.tab = TABS[(i + d + TABS.length) % TABS.length]; renderStep3(); $('tab-' + S.tab).focus();
  });
  $('back2').addEventListener('click', () => go(2));
  ({ table: tabTable, radar: tabRadar, export: tabExport })[S.tab]($('panel'));
}
function notes() {
  let h = '';
  if (D.duplicates.length) h += `<p class="note warn">${T('dup', { list: D.duplicates.map(d => `${esc(d.name)} ×${d.count}`).join(', ') })}</p>`;
  if (Rk.incomplete.length) h += `<p class="note warn">${T('incomplete', { k: Rk.incomplete.length, list: Rk.incomplete.map(i => esc(D.models[i].label)).join(', ') })}</p>`;
  if (Rk.sameRanks && Rk.sameRanks.length) h += `<p class="note warn">${T('same', { list: Rk.sameRanks.map(p => p.map(esc).join(' = ')).join('; ') })}</p>`;
  if (Rk.per && Rk.per.some(p => p.constant)) h += `<p class="note">${T('constant', { list: Rk.per.filter(p => p.constant).map(p => esc(p.name)).join(', ') })}</p>`;
  return h;
}
function toggleModel(row, out) { S.excl = out ? [...new Set([...S.excl, row])] : S.excl.filter(r => r !== row); Rk = null; compute(); save(); }
function tabTable(p) {
  let h = `<p class="note">${T('method')}</p>`;
  if (Rk.problems.length) {
    p.innerHTML = h + notes() + Rk.problems.map(pr => `<p class="note err">${pr.code === 'few.models' ? `${T('m.info', { m: pr.m })} m ≥ 2` : T('need.dir', { names: pr.names || [] })}</p>`).join('') + exclList();
    bindExcl(p); return;
  }
  h += `<p class="small">${T('m.info', { m: Rk.m })}</p>` + notes();
  h += `<label class="chk small"><input type="checkbox" id="vals"${S.showVals ? ' checked' : ''}> ${T('show.vals')}</label>`;
  h += `<div class="tscroll"><table class="grid"><thead><tr><th>${T('th.use')}</th><th>${T('th.ord')}</th><th>${T('th.model')}</th>
    ${Rk.per.map(c => `<th title="${esc(T('bestworst', { best: fv(c.best), worst: fv(c.worst) }))}">${T('R')}: ${esc(c.name)}<br><span class="kind">${T('dir.' + c.dir).split(' (')[0]}</span></th>`).join('')}
    <th>${T('th.sum')}</th><th>${T('th.overall')}</th></tr></thead><tbody>`;
  for (const r of Rk.rows) {
    h += `<tr><td><input type="checkbox" checked data-row="${r.row}" aria-label="${esc(r.label)}"></td><td class="num">${r.ordinal}</td><th>${esc(r.label)}</th>
      ${r.R.map((x, j) => `<td class="num">${f(x)}${S.showVals ? `<br><span class="kind">${fv(r.values[j])}</span>` : ''}</td>`).join('')}<td class="num">${f(r.sum)}</td><td class="num"><b>${f(r.overall)}</b></td></tr>`;
  }
  h += `</tbody></table></div><p class="muted small">${T('sens')}</p>` + exclList();
  p.innerHTML = h; bindExcl(p);
  $('vals').addEventListener('change', e => { S.showVals = e.target.checked; save(); tabTable(p); });
  p.querySelectorAll('[data-row]').forEach(x => x.addEventListener('change', () => { toggleModel(+x.dataset.row, !x.checked); tabTable(p); }));
}
function exclList() {
  const ex = D.models.filter(m => S.excl.includes(m.row));
  return `<h3>${T('excl.h')}</h3>` + (ex.length ? `<ul class="oldlist">${ex.map(m => `<li>${esc(m.label)} <button type="button" class="btn ghost small" data-back="${m.row}">${T('excl.back')}</button></li>`).join('')}</ul>` : `<p class="muted small">${T('excl.none')}</p>`);
}
function bindExcl(p) { p.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => { toggleModel(+b.dataset.back, false); renderStep3(); })); }
function tabRadar(p) {
  if (Rk.problems.length) { p.innerHTML = notes(); return; }
  const rd = S.rd;
  if (Rk.per.length < 3) { p.innerHTML = `<p class="note warn">${T('rd.few')}</p>`; return; }
  const pick = C.pickForChart(Rk.rows, { best: rd.best ? +rd.nb || 0 : 0, worst: rd.worst ? +rd.nw || 0 : 0, extra: rd.extra.map(row => (Rk.rows.find(r => r.row === row) || {}).index).filter(i => i != null) });
  let h = `<div class="lims"><label class="chk"><input type="checkbox" id="rb"${rd.best ? ' checked' : ''}> ${T('rd.best')}</label><input type="number" id="nb" min="0" max="${Rk.m}" value="${esc(rd.nb)}" style="width:70px"> ${T('rd.models')}
    <label class="chk"><input type="checkbox" id="rw"${rd.worst ? ' checked' : ''}> ${T('rd.worst')}</label><input type="number" id="nw" min="0" max="${Rk.m}" value="${esc(rd.nw)}" style="width:70px"> ${T('rd.models')}
    <button type="button" class="btn ghost small" id="rall">${T('rd.all')}</button><button type="button" class="btn ghost small" id="rclr">${T('rd.clear')}</button></div>
    <details><summary>${T('rd.extra')}</summary><div class="modelpick">${Rk.rows.map(r => `<label><input type="checkbox" data-x="${r.row}"${rd.extra.includes(r.row) ? ' checked' : ''}> ${r.ordinal}. ${esc(r.label)}</label>`).join('')}</div></details>`;
  if (!pick.length) h += `<p class="note warn">${T('rd.none')}</p>`;
  else h += `<figure class="chartbox radar" id="ch-r">${radarChart({ title: T('rd.title', { k: pick.length, m: Rk.m }), axes: Rk.per.map(c => c.name), series: pick.map(r => ({ name: `${r.ordinal}. ${r.label} — ${f(r.overall, 2)}`, values: r.R })), rmin: 1, rmax: Rk.m, fmt: v => fmtNum(v, 1), note: T('rd.note', { m: Rk.m }) })}
    <figcaption><button type="button" class="btn ghost small" id="svg">${T('ch.svg')}</button></figcaption></figure>`;
  p.innerHTML = h;
  const re = () => { save(); tabRadar(p); };
  $('rb').addEventListener('change', e => { rd.best = e.target.checked; re(); }); $('rw').addEventListener('change', e => { rd.worst = e.target.checked; re(); });
  $('nb').addEventListener('change', e => { rd.nb = Math.max(0, Math.round(+e.target.value || 0)); re(); }); $('nw').addEventListener('change', e => { rd.nw = Math.max(0, Math.round(+e.target.value || 0)); re(); });
  $('rall').addEventListener('click', () => { Object.assign(rd, { best: true, nb: Rk.m, worst: false }); re(); });
  $('rclr').addEventListener('click', () => { Object.assign(rd, { best: false, worst: false, extra: [] }); re(); });
  p.querySelectorAll('[data-x]').forEach(x => x.addEventListener('change', () => { const r = +x.dataset.x; rd.extra = x.checked ? [...rd.extra, r] : rd.extra.filter(y => y !== r); re(); p.querySelector('details').open = true; }));
  $('svg') && $('svg').addEventListener('click', () => download(`${lang === 'tr' ? 'nispi-sira-radar' : 'relative-rank-radar'}.svg`, svgForDownload($('ch-r').querySelector('svg')), 'image/svg+xml'));
}

/* ---------------- exports ---------------- */
const fname = (a, b) => `${lang === 'tr' ? a : b}-${new Date().toISOString().slice(0, 10)}`;
function rankRows() {
  return [[T('th.ord'), T('th.model'), T('th.row'), ...Rk.per.map(c => `${T('R')}: ${c.name}`), T('th.sum'), T('th.overall')],
    ...Rk.rows.map(r => [r.ordinal, r.label, r.row, ...r.R, r.sum, r.overall])];
}
function valueRows() { return [[T('th.model'), T('th.row'), ...Rk.per.map(c => c.name)], ...Rk.rows.map(r => [r.label, r.row, ...r.values])]; }
function critRows() { return [[T('x.crit'), T('x.dir'), T('x.best'), T('x.worst'), T('x.const')], ...Rk.per.map(c => [c.name, T('dir.' + c.dir), c.best, c.worst, T(c.constant ? 'yes' : 'no')])]; }
function infoRows() {
  return [[T('x.k'), T('x.v')], [T('x.tool'), `${C.TOOL.id} ${C.TOOL.version}`], [T('x.date'), new Date().toISOString()], [T('x.src'), S.imp ? S.imp.name : ''],
    [T('x.m'), Rk.m], [T('x.excl'), D.models.filter(m => S.excl.includes(m.row)).map(m => m.label).join(', ') || '–'], [T('x.inc'), Rk.incomplete.map(i => D.models[i].label).join(', ') || '–'],
    ['', T('method')], ['', T('x.ref')], ...(Rk.sameRanks.length ? [['', T('same', { list: Rk.sameRanks.map(p => p.join(' = ')).join('; ') })]] : [])];
}
function tabExport(p) {
  if (Rk.problems.length) { p.innerHTML = notes(); return; }
  p.innerHTML = `<div class="exports"><button type="button" class="btn" id="x-xlsx">${T('ex.xlsx')}</button><button type="button" class="btn ghost" id="x-csv">${T('ex.csv')}</button></div><p class="muted small">${T('ex.note')}</p>`;
  $('x-csv').addEventListener('click', () => downloadCSV(fname('nispi-siralama', 'relative-ranking') + '.csv', rankRows(), lang));
  $('x-xlsx').addEventListener('click', async () => {
    let XLSX; try { XLSX = await loadXLSX(BASE); } catch (e) { status('XLSX', 'err'); return; }
    download(fname('nispi-siralama', 'relative-ranking') + '.xlsx', xlsxBlob(XLSX, [{ name: T('sheet.info'), rows: infoRows(), widths: [30, 110] }, { name: T('sheet.ranks'), rows: rankRows() },
      { name: T('sheet.values'), rows: valueRows() }, { name: T('sheet.crit'), rows: critRows() }]));
  });
}

/* ---------------- shell ---------------- */
function canGo(n) { if (n <= 1) return true; if (!S.src) return false; if (n === 2) return true; return !problems().length; }
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
  try { const saved = await get(KEY); if (saved && saved.v === 1) { S = { ...blank(), ...saved }; status(T('restored', { when: new Date(saved.saved).toLocaleString(LOC) })); } } catch (e) { S = blank(); }
  render();
})();
