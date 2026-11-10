// Inventory Sampling Planner: user interface (one page, results update as you type). Arithmetic lives in calc.js.
import * as P from './calc.js';
import { T } from './i18n.js';
import { lang, fmtNum, esc } from '../core/i18n.js';
import { put, get, del } from '../core/store.js';
import { cellText } from '../core/table.js';
import { detectDecimal, defaultDecimal } from '../core/num.js';
import { download, downloadCSV, xlsxBlob, loadXLSX } from '../core/export.js';
import { plotChart, svgForDownload } from '../core/chart.js';
import { renderImport, readImport } from '../core/importer.js';

const BASE = './', KEY = 'session:' + P.TOOL.id, LOC = lang === 'tr' ? 'tr-TR' : 'en-GB';
const $ = id => document.getElementById(id);
const f = (x, d = 4) => x == null || !Number.isFinite(x) ? '–' : fmtNum(x, d);
/** Numbers typed in the form: point or comma as decimal separator; anything else → NaN (never 0). */
const num = v => { const t = String(v ?? '').trim().replace(',', '.'); return /^[+-]?(\d+\.?\d*|\.\d+)$/.test(t) ? Number(t) : NaN; };
const natural = (a, b) => { const na = /^-?\d+(\.\d+)?$/.test(a), nb = /^-?\d+(\.\d+)?$/.test(b); return na && nb ? (+a - +b || (a < b ? -1 : 1)) : a < b ? -1 : a > b ? 1 : 0; };

let S = blank();
function blank() {
  return { v: 1, src: 'pilot', imp: null, tbl: null, vcol: null, pcol: null, fcol: null, fval: null, unit: '', decimal: null, decimalChosen: false, confirm: false,
    cvText: '', cvNote: '', nText: '', eText: '10', level: '95', levelOther: '', fpc: false, MText: '', inDesign: false };
}
let saveT = null;
function save() { clearTimeout(saveT); saveT = setTimeout(flush, 250); }
async function flush() { clearTimeout(saveT); saveT = null; await put(KEY, { ...S, saved: new Date().toISOString() }); }
$('langlink') && $('langlink').addEventListener('click', async e => { e.preventDefault(); const h = e.currentTarget.href; await flush(); location.href = h; });
function status(m, k = '') { const s = $('status'); s.className = 'status ' + k; s.textContent = m || ''; }

/* ---------------- inputs → numbers ---------------- */
function pilot() {
  if (S.src !== 'pilot' || !S.tbl || S.vcol == null || !S.decimal) return null;
  const rd = P.readPilot(S.tbl, { vcol: S.vcol, pcol: S.pcol, fcol: S.fcol, fval: S.fval, decimal: S.decimal });
  return { rd, st: P.pilotStats(rd.values) };
}
const levelValue = () => S.level === 'other' ? num(S.levelOther) : +S.level;
/** Everything the plan needs, plus the reasons it cannot be computed yet. */
function inputs() {
  const blockers = [];
  let cv = NaN, nPilot = null, pl = null;
  if (S.src === 'pilot') {
    pl = pilot();
    if (!S.tbl) blockers.push(T('pr.cv.missing'));
    else if (S.vcol == null) blockers.push(T('col.v'));
    else if (!S.decimal) blockers.push(T('dec.choose'));
    else if (pl.rd.dups.length) blockers.push(T('dups', { list: pl.rd.dups.slice(0, 5).map(d => `${d.id} ×${d.c}`).join(', ') }));
    else if (pl.st.problem) blockers.push(T('pr.' + pl.st.problem, { mean: f(pl.st.mean, 4) }));
    else if (!S.confirm) blockers.push(T('confirm.need'));
    else { cv = pl.st.cv; nPilot = pl.st.n; }
  } else {
    cv = num(S.cvText);
    if (String(S.nText).trim() !== '') nPilot = num(S.nText);
  }
  const p = { cv, e: num(S.eText), level: levelValue(), fpc: S.fpc, M: S.fpc ? num(S.MText) : undefined, nPilot: nPilot ?? undefined, pilotInDesign: S.inDesign && nPilot != null };
  const probs = blockers.length ? blockers : P.check(p).map(k => T('pr.' + k));
  return { p, pl, nPilot, problems: probs };
}

/* ---------------- rendering ---------------- */
function render() {
  $('app').innerHTML = `<p class="statement">${T('scope')}</p>
    <section class="card" id="c-src"></section><section class="card" id="c-tg"></section><section class="card" id="c-fr"></section><section class="card" id="c-ex"></section>
    <section class="card wide" id="c-res" aria-live="polite"></section>
    <div class="nav"><button type="button" class="btn ghost" id="reset">${T('reset')}</button></div>`;
  renderSrc(); renderTarget(); renderFrame(); renderExisting(); renderResult();
  $('reset').addEventListener('click', async () => { S = blank(); status(''); await del(KEY); render(); });
}
const changed = (full = false) => { save(); if (full) render(); else { renderExisting(); renderResult(); } };
function renderSrc() {
  const el = $('c-src');
  let h = `<h2>${T('src.h')}</h2><div class="radios col"><label><input type="radio" name="src" value="pilot"${S.src === 'pilot' ? ' checked' : ''}> ${T('src.pilot')}</label>
    <label><input type="radio" name="src" value="manual"${S.src === 'manual' ? ' checked' : ''}> ${T('src.manual')}</label></div>`;
  if (S.src === 'manual') {
    h += `<div class="lims"><label>${T('man.cv')} <input type="text" inputmode="decimal" id="cv" value="${esc(S.cvText)}" size="7"></label>
      <label>${T('man.n')} <input type="text" inputmode="numeric" id="nex" value="${esc(S.nText)}" size="6"></label></div>
      <label class="field"><span>${T('man.src')}</span><input type="text" id="cvnote" value="${esc(S.cvNote)}" placeholder="${esc(T('man.src.ph'))}"></label><p class="muted small">${T('man.note')}</p>`;
    el.innerHTML = h;
    $('cv').addEventListener('input', e => { S.cvText = e.target.value; changed(); });
    $('nex').addEventListener('input', e => { S.nText = e.target.value; changed(); });
    $('cvnote').addEventListener('input', e => { S.cvNote = e.target.value; save(); });
  } else {
    h += `<div id="impbox"></div><div class="sample"><button type="button" class="btn ghost" id="sample">${T('sample')}</button> <span class="muted small">${T('sample.note')}</span></div><div id="pcols"></div>`;
    el.innerHTML = h;
    renderImport($('impbox'), { imp: S.imp, src: S.tbl }, { base: BASE, title: T('imp.h'), sub: T('imp.sub'), onChange: setTable, onError: m => status(m, 'err') });
    $('sample').addEventListener('click', async () => {
      const buf = await (await fetch(BASE + 'assets/lab/sampling/ornek/ornek-pilot.csv')).arrayBuffer();
      const imp = { kind: 'csv', name: lang === 'tr' ? 'ornek-pilot.csv (benzetim)' : 'ornek-pilot.csv (simulated)', buf, encoding: 'utf-8', delim: null, header: true, sheet: null };
      setTable({ imp, src: await readImport(imp, BASE) });
      S.unit = 'm³/ha'; changed(true);
    });
    renderPilotCols();
  }
  el.querySelectorAll('input[name="src"]').forEach(x => x.addEventListener('change', () => { S.src = x.value; S.inDesign = false; changed(true); }));
}
function setTable(state) {
  const keep = { src: 'pilot', eText: S.eText, level: S.level, levelOther: S.levelOther, fpc: S.fpc, MText: S.MText, cvText: S.cvText, cvNote: S.cvNote };
  S = { ...blank(), ...keep, imp: state.imp, tbl: state.src };
  if (S.tbl) {
    const H = S.tbl.headers.map(h => h.toLocaleLowerCase('tr'));
    S.pcol = (i => i < 0 ? null : i)(H.findIndex(h => ['plot', 'plot_id', 'ornek_alan', 'örnek_alan', 'alan', 'alan_no'].includes(h)));
    const cand = H.map((h, i) => i).filter(i => i !== S.pcol && S.tbl.rows.some(r => r[i] && (r[i].t === 'n' || /\d/.test(r[i].v))));
    S.vcol = cand.length === 1 ? cand[0] : null;
  }
  status(''); changed(true);
}
function renderPilotCols() {
  const box = $('pcols'); if (!S.tbl) { box.innerHTML = ''; return; }
  const Hd = S.tbl.headers, opts = sel => `<option value="">${T('none')}</option>` + Hd.map((h, i) => `<option value="${i}"${sel === i ? ' selected' : ''}>${esc(h)}</option>`).join('');
  const dv = detectDecimal(S.vcol == null ? [] : S.tbl.rows.map(r => r[S.vcol]).filter(c => c && c.t === 's').map(c => c.v));
  if (!S.decimalChosen) S.decimal = defaultDecimal(dv.verdict);
  const fvals = S.fcol != null ? [...new Set(S.tbl.rows.map(r => cellText(r[S.fcol])))].sort(natural) : [];
  let h = `<div class="lims"><label>${T('col.v')} <select id="vcol">${opts(S.vcol)}</select></label><label>${T('col.unit')} <input type="text" id="unit" value="${esc(S.unit)}" size="8"></label>
    <label>${T('col.p')} <select id="pcol">${opts(S.pcol)}</select></label><label>${T('col.f')} <select id="fcol">${opts(S.fcol)}</select></label>
    ${S.fcol != null ? `<label>${T('col.fv')} <select id="fval"><option value="">${T('none')}</option>${fvals.map(v => `<option${S.fval === v ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></label>` : ''}</div>
    <div class="radios"><span class="muted small">${T('dec.h')}:</span><label><input type="radio" name="dec" value="."${S.decimal === '.' ? ' checked' : ''}> ${T('dec.dot')}</label><label><input type="radio" name="dec" value=","${S.decimal === ',' ? ' checked' : ''}> ${T('dec.comma')}</label></div>`;
  const pl = pilot();
  if (pl) {
    const { rd, st } = pl, a = rd.acc;
    if (rd.treeLevelName) h += `<p class="note err">${T('treelevel', { c: esc(Hd[S.vcol]) })}</p>`;
    if (rd.dups.length) h += `<p class="note err">${T('dups', { list: rd.dups.slice(0, 5).map(d => `${esc(d.id)} ×${d.c}`).join(', ') })}</p>`;
    if (a.empty || a.bad || a.neg || a.filter) h += `<p class="${a.neg || a.bad ? 'note warn' : 'small muted'}" id="placc">${T('pl.acc', { ...a, badRows: rd.badRows.slice(0, 8).join(', '), negRows: rd.negRows.slice(0, 8).join(', ') })}</p>`;
    if (st.problem) h += `<p class="note err" id="plprob">${T('pr.' + st.problem, { mean: f(st.mean, 4) })}</p>`;
    else h += `<p class="note ok" id="plstats">${T('pl.stats', { n: st.n, mean: f(st.mean, 3), sd: f(st.sd, 3), cv: f(st.cv, 2) })}</p>${st.n < P.PILOT_FEW ? `<p class="note warn">${T('pl.few', { n: st.n })}</p>` : ''}`;
  }
  h += `<label class="chk confirm"><input type="checkbox" id="confirm"${S.confirm ? ' checked' : ''}> ${T('confirm')}</label>`;
  box.innerHTML = h;
  const sel = (id, k) => $(id) && $(id).addEventListener('change', e => { S[k] = e.target.value === '' ? null : +e.target.value; if (k === 'fcol') S.fval = null; if (k === 'vcol') S.decimalChosen = false; save(); renderPilotCols(); renderExisting(); renderResult(); });
  sel('vcol', 'vcol'); sel('pcol', 'pcol'); sel('fcol', 'fcol');
  $('fval') && $('fval').addEventListener('change', e => { S.fval = e.target.value || null; save(); renderPilotCols(); renderExisting(); renderResult(); });
  $('unit').addEventListener('input', e => { S.unit = e.target.value; save(); });
  box.querySelectorAll('input[name="dec"]').forEach(x => x.addEventListener('change', () => { S.decimal = x.value; S.decimalChosen = true; save(); renderPilotCols(); renderExisting(); renderResult(); }));
  $('confirm').addEventListener('change', e => { S.confirm = e.target.checked; changed(); });
}
function renderTarget() {
  const el = $('c-tg');
  el.innerHTML = `<h2>${T('tg.h')}</h2><div class="lims"><label>${T('tg.e')} <input type="text" inputmode="decimal" id="e" value="${esc(S.eText)}" size="6"></label>
    <label>${T('tg.level')} <select id="level">${P.LEVELS.map(l => `<option value="${l}"${S.level === String(l) ? ' selected' : ''}>%${l}</option>`).join('')}<option value="other"${S.level === 'other' ? ' selected' : ''}>${T('tg.other')}</option></select></label>
    ${S.level === 'other' ? `<label>${T('tg.otherv')} <input type="text" inputmode="decimal" id="lvo" value="${esc(S.levelOther)}" size="6"></label>` : ''}</div><p class="muted small">${T('tg.note')}</p>`;
  $('e').addEventListener('input', e => { S.eText = e.target.value; changed(); });
  $('level').addEventListener('change', e => { S.level = e.target.value; save(); renderTarget(); renderResult(); });
  $('lvo') && $('lvo').addEventListener('input', e => { S.levelOther = e.target.value; changed(); });
}
function renderFrame() {
  const el = $('c-fr');
  el.innerHTML = `<h2>${T('fr.h')}</h2><div class="radios col"><label><input type="radio" name="fr" value="inf"${!S.fpc ? ' checked' : ''}> ${T('fr.inf')}</label>
    <label><input type="radio" name="fr" value="fin"${S.fpc ? ' checked' : ''}> ${T('fr.fin')}</label></div>
    ${S.fpc ? `<label class="field inline"><span>${T('fr.M')}</span><input type="text" inputmode="numeric" id="M" value="${esc(S.MText)}" size="8"></label>` : ''}<p class="muted small">${T('fr.note')}</p>`;
  el.querySelectorAll('input[name="fr"]').forEach(x => x.addEventListener('change', () => { S.fpc = x.value === 'fin'; save(); renderFrame(); renderResult(); }));
  $('M') && $('M').addEventListener('input', e => { S.MText = e.target.value; changed(); });
}
function renderExisting() {
  const el = $('c-ex'), { nPilot } = inputs();
  if (nPilot == null || !Number.isFinite(nPilot)) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  el.innerHTML = `<h2>${T('ex.h')}</h2><label class="chk"><input type="checkbox" id="indesign"${S.inDesign ? ' checked' : ''}> ${T('ex.in', { n: nPilot })}</label><p class="muted small">${T('ex.note')}</p>`;
  $('indesign').addEventListener('change', e => { S.inDesign = e.target.checked; save(); renderResult(); });
}
function renderResult() {
  const el = $('c-res'), inp = inputs();
  if (inp.problems.length) { el.innerHTML = `<h2>${T('res.h')}</h2><p class="note">${T('res.need')}</p><ul class="probs">${inp.problems.map(p => `<li>${esc(p)}</li>`).join('')}</ul>`; return; }
  const p = inp.p, r = P.plan(p), lvl = fmtNum(p.level, 2);
  let h = `<h2>${T('res.h')}</h2><div class="tiles">
    <div class="tile t-ok" id="t-n"><span>${T('t.n')}</span><b>${r.n}</b><em>${T('t.n.sub', { fpc: r.fpc, M: r.M })}</em></div>
    ${r.additional != null ? `<div class="tile t-info" id="t-add"><span>${T('t.add')}</span><b>${r.additional}</b><em>${T('t.add.sub', { have: p.nPilot })}</em></div>` : ''}
    <div class="tile" id="t-n0"><span>${T('t.n0')}</span><b>${r.n0}</b><em>${T('t.n0.sub', { raw: f(r.n0Raw, 3) })}</em></div>
    <div class="tile" id="t-z"><span>${T('t.z')}</span><b>${f(r.z, 4)}</b><em>${T('t.z.sub', { level: lvl })}</em></div></div>`;
  h += `<p class="small"><code id="calc0">${esc(T('calc.line0', { z: f(r.z, 4), cv: f(p.cv, 3), e: f(p.e, 3), raw: f(r.n0Raw, 3), n0: r.n0 }))}</code></p>`;
  h += r.fpc ? `<p class="small"><code id="calc1">${esc(T('calc.line1', { raw: f(r.n0Raw, 3), M: r.M, nraw: f(r.nRaw, 3), n: r.n }))}</code></p>` : `<p class="small muted" id="nofpc">${T('calc.nofpc')}</p>`;
  for (const n of r.notes.filter(n => n !== 'n.gtM')) h += `<p class="note warn">${T('no.' + n)}</p>`;
  const g = P.grid(p, [p.e]);
  h += `<h3>${T('grid.h')}</h3><div class="charts2"><div class="tscroll"><table class="grid" id="gtab"><thead><tr><th>${T('grid.e')}</th><th>${T('grid.n0')}</th><th>${T('grid.n')}</th>${r.additional != null ? `<th>${T('grid.add')}</th>` : ''}</tr></thead><tbody>
    ${g.map(x => `<tr${x.e === p.e ? ' class="tail"' : ''}><th>${f(x.e, 2)}${x.e === p.e ? ` <span class="kind">${T('grid.yours')}</span>` : ''}</th><td class="num">${f(x.n0Raw, 2)}</td><td class="num">${x.n}</td>${r.additional != null ? `<td class="num">${x.additional}</td>` : ''}</tr>`).join('')}</tbody></table></div>
    <figure class="chartbox" id="ch-n">${plotChart({ title: T('ch.title', { cv: f(p.cv, 2), level: lvl }), xmin: 0, xmax: Math.max(...g.map(x => x.e)) * 1.04, ymin: 0,
      lines: [{ k: 0, pts: Array.from({ length: 120 }, (_, i) => { const e0 = Math.min(...g.map(x => x.e)), e = e0 + (Math.max(...g.map(x => x.e)) * 1.04 - e0) * i / 119; return [e, P.plan({ ...p, e }).nRaw]; }) }],
      points: g.map(x => [x.e, x.n]), xLabel: T('ch.x'), yLabel: T('ch.y'), fmt: v => fmtNum(v, 1), height: 330 })}
      <figcaption><button type="button" class="btn ghost small" id="svg">${T('ch.svg')}</button></figcaption></figure></div>
    <p class="muted small">${T('grid.note', { cv: f(p.cv, 2), level: lvl })}</p>`;
  h += `<h3>${T('as.h')}</h3><ul class="assume">${T('as.list').map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="note">${T('as.not')}</p>`;
  h += `<h3>${T('x.h')}</h3><div class="exports"><button type="button" class="btn" id="x-txt">${T('x.txt')}</button><button type="button" class="btn ghost" id="x-csv">${T('x.csv')}</button><button type="button" class="btn ghost" id="x-xlsx">${T('x.xlsx')}</button></div><p class="muted small">${T('x.note')}</p>`;
  el.innerHTML = h;
  $('svg').addEventListener('click', () => download(fname('ornek-sayisi', 'sample-size') + '.svg', svgForDownload($('ch-n').querySelector('svg')), 'image/svg+xml'));
  $('x-txt').addEventListener('click', () => download(fname('ornekleme-varsayimlar', 'sampling-assumptions') + '.txt', summaryLines(inp, r).join('\r\n') + '\r\n', 'text/plain;charset=utf-8'));
  $('x-csv').addEventListener('click', () => downloadCSV(fname('ornekleme-hata-hedefleri', 'sampling-error-targets') + '.csv', gridRows(p, r), lang));
  $('x-xlsx').addEventListener('click', async () => {
    let XLSX; try { XLSX = await loadXLSX(BASE); } catch (e) { status('XLSX', 'err'); return; }
    const sheets = [{ name: T('sheet.info'), rows: summaryLines(inp, r).map(l => [l]), widths: [140] }, { name: T('sheet.grid'), rows: gridRows(p, r) }];
    if (inp.pl) sheets.push({ name: T('sheet.pilot'), rows: [[T('col.p'), T('col.v')], ...inp.pl.rd.values.map((v, i) => [inp.pl.rd.ids[i], v])] });
    download(fname('ornekleme-plani', 'sampling-plan') + '.xlsx', xlsxBlob(XLSX, sheets));
  });
}

/* ---------------- exports ---------------- */
const fname = (a, b) => `${lang === 'tr' ? a : b}-${new Date().toISOString().slice(0, 10)}`;
function gridRows(p, r) {
  const g = P.grid(p, [p.e]);
  return [[T('grid.e'), T('grid.n0'), T('grid.n'), ...(r.additional != null ? [T('grid.add')] : []), 'CV (%)', T('tg.level'), 'z', 'M'],
    ...g.map(x => [x.e, x.n0Raw, x.n, ...(r.additional != null ? [x.additional] : []), p.cv, p.level, x.z, r.fpc ? r.M : null])];
}
function summaryLines(inp, r) {
  const p = inp.p, lvl = fmtNum(p.level, 2), L = [];
  L.push(T('s.title'), '', `${T('s.tool')}: ${P.TOOL.id} ${P.TOOL.version}`, `${T('s.date')}: ${new Date().toLocaleString(LOC)}`, `${T('s.design')}: ${T('s.design.v')}`, '');
  if (inp.pl) {
    const st = inp.pl.st, a = inp.pl.rd.acc;
    L.push(`${T('s.cvsrc')}: ${T('s.cvsrc.pilot', { file: S.imp ? S.imp.name : '', col: S.tbl.headers[S.vcol], unit: S.unit, filter: S.fcol != null ? `${S.tbl.headers[S.fcol]} = ${S.fval ?? '–'}` : '' })}`);
    L.push(T('pl.stats', { n: st.n, mean: f(st.mean, 4), sd: f(st.sd, 4), cv: f(st.cv, 4) }));
    if (a.empty || a.bad || a.neg || a.filter) L.push(T('pl.acc', { ...a, badRows: inp.pl.rd.badRows.join(', '), negRows: inp.pl.rd.negRows.join(', ') }));
    L.push(T('confirm'));
  } else L.push(`${T('s.cvsrc')}: ${T('s.cvsrc.manual', { note: S.cvNote.trim() })}`, `CV = %${f(p.cv, 4)}`);
  L.push(`${T('tg.e')}: ${f(p.e, 4)}`, `${T('tg.level')}: %${lvl} (z = ${f(r.z, 6)})`, `${T('s.frame')}: ${r.fpc ? T('s.frame.fin', { M: r.M }) : T('s.frame.inf')}`, '');
  L.push(`${T('s.calc')}:`, T('calc.line0', { z: f(r.z, 6), cv: f(p.cv, 4), e: f(p.e, 4), raw: f(r.n0Raw, 4), n0: r.n0 }), r.fpc ? T('calc.line1', { raw: f(r.n0Raw, 4), M: r.M, nraw: f(r.nRaw, 4), n: r.n }) : T('calc.nofpc'), '');
  L.push(`${T('s.result')}: ${T('t.n')} = ${r.n}`);
  if (p.nPilot != null && Number.isFinite(p.nPilot)) L.push(`${T('s.existing')}: ${r.additional != null ? T('s.existing.in', { n: p.nPilot, add: r.additional }) : T('s.existing.out', { n: p.nPilot })}`);
  for (const n of r.notes.filter(n => n !== 'n.gtM')) L.push(T('no.' + n));
  L.push('', `${T('s.assume')}:`, ...T('as.list').map(x => '- ' + x), '', `${T('s.not')}: ${T('as.not')}`);
  return L;
}

(async function init() {
  $('privacy').textContent = T('privacy');
  try {
    const saved = await get(KEY);
    if (saved && saved.v === 1) { S = { ...blank(), ...saved }; status(T('restored', { when: new Date(saved.saved).toLocaleString(LOC) })); }
  } catch (e) { S = blank(); }
  render();
})();
