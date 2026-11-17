// Tree measurement page (agac-olcumu.php; TM-01 height, TM-02 diameter and basal area, TM-06 form factors).
// All arithmetic lives in height.js, diameter.js and form.js; results update as the fields change.
import * as Ht from './height.js';
import * as Dm from './diameter.js';
import * as Fm from './form.js';
import * as Ag from './age.js';
import { TOOL } from './calc.js';
import { T } from './i18n.js';
import { lang, fmtNum, esc } from '../core/i18n.js';
import { put, get, del } from '../core/store.js';
import { cellText } from '../core/table.js';
import { parseNumber, detectDecimal, defaultDecimal } from '../core/num.js';
import { download, xlsxBlob, loadXLSX } from '../core/export.js';
import { downloadRecord, recordOption } from '../core/record-ui.js';
import { renderImport, readImport } from '../core/importer.js';

const BASE = './', KEY = 'session:' + TOOL.id, LOC = lang === 'tr' ? 'tr-TR' : 'en-GB';
const $ = id => document.getElementById(id);
const f = (x, d = 3) => x == null || !Number.isFinite(x) ? '–' : fmtNum(x, d);
/** Typed numbers: point or comma as decimal separator, optional sign; '' → null; anything else → NaN (never 0). */
const num = v => { const t = String(v ?? '').trim().replace(',', '.').replace('−', '-'); if (!t) return null; return /^[+-]?(\d+\.?\d*|\.\d+)$/.test(t) ? Number(t) : NaN; };
const nv = v => { const x = num(v); return Number.isNaN(x) ? NaN : x; };
const HCOLS = { tangent: ['D', 'top', 'base'], slope: ['S', 'top', 'base'], point: ['Sp', 'pa', 'top', 'base'], shadow: ['treeShadow', 'pole', 'poleShadow'], poles: ['bc', 'AC', 'Ac'] };
const blankH = () => ({ D: '', S: '', Sp: '', pa: '', top: '', base: '', treeShadow: '', pole: '', poleShadow: '', bc: '', AC: '', Ac: '' });

let S = blank();
function blank() {
  return { v: 1, tab: 'h',
    h: { method: 'tangent', unit: 'deg', ground: false, slope: '', rows: [blankH()] },
    d: { mean: 'arithmetic', round: 'none', rows: [{ kind: 'diameter', value: '', unit: 'cm' }], imp: null, src: null, col: null, ncol: null, kind: 'diameter', unit: 'cm', decimal: null, decimalChosen: false },
    f: { V: '', d: '', H: '', kind: 'breast', d1: '', x1: '', d2: '', x2: '', exH: '', dMid: '', D: '', c: '' },
    a: { rings: '', toH: '', ringsOut: '', coreAge: '', gD: '', gMai: '', cD: '', cBark: '', cToBh: '', cPith: true, cW: '', cN: '10', groups: [{ a: '', n: '', b: '', v: '' }], gNow: '', gThen: '', gYears: '', mTotal: '', mAge: '' } };
}
let saveT = null;
function save() { clearTimeout(saveT); saveT = setTimeout(flush, 250); }
async function flush() { clearTimeout(saveT); saveT = null; const { src, ...d } = S.d; await put(KEY, { ...S, d, saved: new Date().toISOString() }); }
addEventListener('pagehide', () => { if (saveT) flush(); });
$('langlink') && $('langlink').addEventListener('click', async e => { e.preventDefault(); const h = e.currentTarget.href; await flush(); location.href = h; });
function status(m, k = '') { const s = $('status'); s.className = 'status ' + k; s.textContent = m || ''; }
const ptext = q => T('p.' + q.code, q);
const wtext = w => T('w.' + w.code, w);

/* ---------------- height ---------------- */
function heightRow(r) {
  const h = S.h, u = h.unit;
  switch (h.method) {
    case 'tangent': {
      let D = nv(r.D);
      if (h.ground) { const sl = nv(h.slope); D = Number.isFinite(sl) && D > 0 ? Ht.horizontalDistance(D, sl, u) : NaN; if (D == null) return { status: 'invalid', problems: [{ code: 'slope.bad' }], warnings: [] }; }
      return Ht.heightTangent({ D, top: nv(r.top), base: nv(r.base), unit: u });
    }
    case 'slope': return Ht.heightSlopeDistance({ S: nv(r.S), top: nv(r.top), base: nv(r.base), unit: u });
    case 'point': return Ht.heightSlopeDistance({ S: nv(r.Sp), top: nv(r.top), base: nv(r.base), unit: u, pointAngle: nv(r.pa) });
    case 'shadow': return Ht.heightShadow({ treeShadow: nv(r.treeShadow), pole: nv(r.pole), poleShadow: nv(r.poleShadow) });
    default: return Ht.heightTwoPoles({ bc: nv(r.bc), AC: nv(r.AC), Ac: nv(r.Ac) });
  }
}
const filled = r => HCOLS[S.h.method].some(k => String(r[k]).trim() !== '');
function heightResults() { return S.h.rows.map(r => filled(r) ? heightRow(r) : null); }
function heightHTML() {
  const h = S.h, angular = ['tangent', 'slope', 'point'].includes(h.method), cols = HCOLS[h.method], res = heightResults();
  const lab = k => k === 'D' && h.ground ? T('h.c.Dg') : T('h.c.' + k) + (['top', 'base', 'pa'].includes(k) ? ` (${T('h.unit.' + h.unit)})` : '');
  let x = `<div class="card"><h2>${T('h.h')}</h2><div class="lims"><label>${T('h.method')} <select id="h-method">${Object.keys(HCOLS).map(m => `<option value="${m}"${h.method === m ? ' selected' : ''}>${T('h.m.' + m)}</option>`).join('')}</select></label>`;
  if (angular) x += `<span class="radios"><span class="small">${T('h.unit')}:</span> ${['deg', 'pct'].map(u => `<label><input type="radio" name="h-unit" value="${u}"${h.unit === u ? ' checked' : ''}> ${T('h.unit.' + u)}</label>`).join(' ')}</span>`;
  x += `</div>`;
  if (h.method === 'tangent') x += `<div class="lims"><label><input type="checkbox" id="h-ground"${h.ground ? ' checked' : ''}> ${T('h.ground')}</label>${h.ground ? `<label>${T('h.slope')} (${T('h.unit.' + h.unit)}) <input type="text" inputmode="decimal" size="6" id="h-slope" value="${esc(h.slope)}"></label>` : ''}</div>`;
  if (angular) x += `<p class="muted small">${T('h.sign')}</p>`;
  x += `<div class="tscroll"><table class="grid" id="htab"><thead><tr><th>#</th>${cols.map(k => `<th>${esc(lab(k))}</th>`).join('')}<th>${T('h.c.H')}</th><th>${T('h.c.note')}</th><th></th></tr></thead><tbody>`;
  h.rows.forEach((r, i) => { const q = res[i];
    x += `<tr><td>${i + 1}</td>${cols.map(k => `<td><input type="text" inputmode="decimal" size="7" data-hrow="${i}" data-k="${k}" value="${esc(r[k])}" aria-label="${esc(lab(k))} ${i + 1}"></td>`).join('')}
      <td class="num" data-h="${i}">${q && q.status === 'ok' ? f(q.H, 2) : '–'}</td><td class="small">${q ? esc([...(q.problems || []).map(ptext), ...(q.warnings || []).map(wtext)].join('; ')) : ''}</td>
      <td>${h.rows.length > 1 ? `<button type="button" class="btn ghost small" data-hdel="${i}">${T('del')}</button>` : ''}</td></tr>`; });
  x += `</tbody></table></div><div class="exports"><button type="button" class="btn ghost small" id="h-add">${T('add')}</button></div>`;
  const m = Ht.meanReading(res.filter(q => q && q.status === 'ok').map(q => q.H));
  if (m) x += `<p id="hsum"><b>${esc(T('h.sum', { n: m.n, mean: f(m.mean, 2), min: f(m.min, 2), max: f(m.max, 2), range: f(m.range, 2) }))}</b></p>`;
  return x + `<p class="muted small">${T('h.rules')}</p></div>`;
}
function bindHeight() {
  const h = S.h;
  $('h-method').addEventListener('change', e => { h.method = e.target.value; re(); });
  document.querySelectorAll('input[name="h-unit"]').forEach(x => x.addEventListener('change', () => { h.unit = x.value; re(); }));
  $('h-ground') && $('h-ground').addEventListener('change', e => { h.ground = e.target.checked; re(); });
  $('h-slope') && $('h-slope').addEventListener('change', e => { h.slope = e.target.value; re(); });
  document.querySelectorAll('[data-hrow]').forEach(x => x.addEventListener('change', () => { h.rows[+x.dataset.hrow][x.dataset.k] = x.value; re(); }));
  document.querySelectorAll('[data-hdel]').forEach(x => x.addEventListener('click', () => { h.rows.splice(+x.dataset.hdel, 1); re(); }));
  $('h-add').addEventListener('click', () => { h.rows.push(blankH()); re(); });
}

/* ---------------- diameter ---------------- */
function stemResult() {
  const d = S.d, rows = d.rows.filter(r => String(r.value).trim() !== '');
  if (!rows.length) return null;
  return Dm.stemDiameter(rows.map(r => ({ kind: r.kind, value: nv(r.value), unit: r.unit })), { mean: d.mean, round: d.round });
}
function listRead() {
  const d = S.d; if (!d.src || d.col == null) return null;
  const val = (row, c) => { const x = row[c]; if (x == null) return null; if (x.t === 'n') return x.v; const p = parseNumber(cellText(x), d.decimal); return p.status === 'ok' ? p.value : NaN; };
  const trees = [], bad = [];
  d.src.rows.forEach((row, i) => {
    const v = val(row, d.col), n = d.ncol == null ? 1 : val(row, d.ncol);
    if (v == null && (d.ncol == null || n == null)) return;
    const cm = Dm.toCm(v, d.unit), dd = d.kind === 'girth' ? Dm.diameterFromGirth(cm) : cm;
    if (!(dd > 0) || !(n > 0)) { bad.push(d.src.rowNumbers[i]); return; }
    trees.push({ row: d.src.rowNumbers[i], d: dd, n });
  });
  return { trees, bad, sum: Dm.treeSummary(trees) };
}
function diameterHTML() {
  const d = S.d, r = stemResult(), units = Object.keys(Dm.LENGTH_UNITS);
  let x = `<div class="card"><h2>${T('d.h')}</h2><p class="muted small">${T('d.sub')}</p><div class="tscroll"><table class="grid" id="dtab"><thead><tr><th>#</th><th>${T('d.c.kind')}</th><th>${T('d.c.value')}</th><th>${T('d.c.unit')}</th><th></th></tr></thead><tbody>`;
  d.rows.forEach((q, i) => { x += `<tr><td>${i + 1}</td><td><select data-drow="${i}" data-k="kind">${['diameter', 'girth'].map(k => `<option value="${k}"${q.kind === k ? ' selected' : ''}>${T('d.kind.' + k)}</option>`).join('')}</select></td>
    <td><input type="text" inputmode="decimal" size="8" data-drow="${i}" data-k="value" value="${esc(q.value)}" aria-label="${esc(T('d.c.value'))} ${i + 1}"></td><td><select data-drow="${i}" data-k="unit">${units.map(u => `<option${q.unit === u ? ' selected' : ''}>${u}</option>`).join('')}</select></td>
    <td>${d.rows.length > 1 ? `<button type="button" class="btn ghost small" data-ddel="${i}">${T('del')}</button>` : ''}</td></tr>`; });
  x += `</tbody></table></div><div class="exports"><button type="button" class="btn ghost small" id="d-add">${T('add')}</button></div>
    <div class="radios col"><span class="small"><b>${T('d.mean')}</b></span>${['arithmetic', 'ellipse'].map(m => `<label><input type="radio" name="d-mean" value="${m}"${d.mean === m ? ' checked' : ''}> ${T('d.mean.' + m)}</label>`).join('')}</div>
    <div class="radios"><span class="small">${T('d.round')}:</span> ${['none', 'down', 'nearest-mm'].map(m => `<label><input type="radio" name="d-round" value="${m}"${d.round === m ? ' checked' : ''}> ${T('d.round.' + m)}</label>`).join(' ')}</div>`;
  if (r) x += r.status === 'ok' ? `<p id="dres"><b>${esc(T('d.res', { d: f(r.d, 2), raw: f(r.dRaw, 3), g: f(r.g, 5), c: f(Dm.girthFromDiameter(r.d), 1) }))}</b></p>` : `<p class="note err small" id="dres">${esc(r.problems.map(ptext).join('; '))}</p>`;
  x += `</div><div id="dimp"></div>`;
  if (!d.src) x += `<div class="card sample"><button type="button" class="btn ghost" id="d-sample">${T('d.sample')}</button><span class="muted small">${T('d.sample.note')}</span></div>`;
  else {
    const op = (sel, none) => (none ? `<option value="">${T('none')}</option>` : '') + d.src.headers.map((hh, i) => `<option value="${i}"${sel === i ? ' selected' : ''}>${esc(hh)}</option>`).join('');
    x += `<div class="card"><h2>${T('d.list')}</h2><p class="muted small">${T('d.list.sub')}</p><div class="lims"><label>${T('d.col.d')} <select id="d-col">${op(d.col, true)}</select></label><label>${T('d.col.n')} <select id="d-ncol">${op(d.ncol, true)}</select></label>
      <label>${T('d.col.kind')} <select id="d-kind">${['diameter', 'girth'].map(k => `<option value="${k}"${d.kind === k ? ' selected' : ''}>${T('d.kind.' + k)}</option>`).join('')}</select></label><label>${T('d.col.unit')} <select id="d-unit">${units.map(u => `<option${d.unit === u ? ' selected' : ''}>${u}</option>`).join('')}</select></label>
      <span class="radios"><span class="small">${T('d.dec')}:</span> ${['.', ','].map(v => `<label class="small"><input type="radio" name="d-dec" value="${v}"${d.decimal === v ? ' checked' : ''}> ${T(v === '.' ? 'd.dec.dot' : 'd.dec.comma')}</label>`).join('')}</span></div>`;
    const L = listRead();
    if (L && L.sum.status === 'ok') x += `<p id="dsum"><b>${esc(T('d.sum', { N: L.sum.N, G: f(L.sum.G, 4), gm: f(L.sum.gMean, 5), dm: f(L.sum.dMean, 2), dg: f(L.sum.dg, 2), skip: L.bad.length, rows: L.bad.slice(0, 10).join(', ') }))}</b></p>`;
    x += `</div>`;
  }
  return x + `<div class="card"><h3>${T('d.rules.h')}</h3><ul class="small">${T('d.rules').map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>`;
}
function bindDiameter() {
  const d = S.d;
  document.querySelectorAll('[data-drow]').forEach(x => x.addEventListener('change', () => { d.rows[+x.dataset.drow][x.dataset.k] = x.value; re(); }));
  document.querySelectorAll('[data-ddel]').forEach(x => x.addEventListener('click', () => { d.rows.splice(+x.dataset.ddel, 1); re(); }));
  $('d-add').addEventListener('click', () => { d.rows.push({ kind: 'diameter', value: '', unit: d.rows[d.rows.length - 1].unit }); re(); });
  document.querySelectorAll('input[name="d-mean"]').forEach(x => x.addEventListener('change', () => { d.mean = x.value; re(); }));
  document.querySelectorAll('input[name="d-round"]').forEach(x => x.addEventListener('change', () => { d.round = x.value; re(); }));
  const onImp = st => { d.imp = st.imp; d.src = st.src; d.col = null; d.ncol = null; d.decimalChosen = false; guessList(); re(); };
  renderImport($('dimp'), { imp: d.imp, src: d.src }, { base: BASE, title: T('d.list'), sub: T('d.list.sub'), onChange: onImp, onError: m => status(m, 'err') });
  $('d-sample') && $('d-sample').addEventListener('click', async () => {
    const buf = await (await fetch(BASE + 'assets/lab/tree/ornek/ornek-capler.csv')).arrayBuffer();
    d.imp = { kind: 'csv', name: lang === 'tr' ? 'ornek-capler.csv (uydurma)' : 'ornek-capler.csv (made up)', buf, encoding: 'utf-8', delim: null, header: true, sheet: null };
    d.src = await readImport(d.imp, BASE); d.col = null; d.ncol = null; d.decimalChosen = false; guessList(); re();
  });
  if (!d.src) return;
  $('d-col').addEventListener('change', e => { d.col = e.target.value === '' ? null : +e.target.value; guessDecimal(); re(); });
  $('d-ncol').addEventListener('change', e => { d.ncol = e.target.value === '' ? null : +e.target.value; re(); });
  $('d-kind').addEventListener('change', e => { d.kind = e.target.value; re(); });
  $('d-unit').addEventListener('change', e => { d.unit = e.target.value; re(); });
  document.querySelectorAll('input[name="d-dec"]').forEach(x => x.addEventListener('change', () => { d.decimal = x.value; d.decimalChosen = true; re(); }));
}
function guessList() {
  const d = S.d; if (!d.src) return;
  const H = d.src.headers.map(x => String(x).toLocaleLowerCase('tr').trim());
  const i = H.findIndex(x => ['cap', 'çap', 'cap_cm', 'çap_cm', 'dbh', 'd', 'd13', 'cevre', 'çevre', 'girth'].includes(x)); d.col = i >= 0 ? i : null;
  if (i >= 0 && ['cevre', 'çevre', 'girth'].includes(H[i])) d.kind = 'girth';
  const j = H.findIndex(x => ['n', 'adet', 'sayi', 'sayı', 'count'].includes(x)); d.ncol = j >= 0 ? j : null;
  guessDecimal();
}
function guessDecimal() {
  const d = S.d; if (!d.src || d.decimalChosen) return;
  d.decimal = defaultDecimal(detectDecimal(d.col == null ? [] : d.src.rows.map(r => r[d.col]).filter(x => x && x.t === 's').map(x => x.v)).verdict);
}

/* ---------------- form ---------------- */
function formResults() {
  const F = S.f, any = ks => ks.some(k => String(F[k]).trim() !== '');
  return {
    ff: any(['V', 'd', 'H']) ? Fm.formFactor({ V: nv(F.V), d: nv(F.d), H: nv(F.H), kind: F.kind }) : null,
    ex: any(['d1', 'x1', 'd2', 'x2']) ? Fm.formExponent({ d1: nv(F.d1), x1: nv(F.x1), d2: nv(F.d2), x2: nv(F.x2) }) : null,
    q: any(['dMid', 'D']) ? Fm.formQuotient({ dMid: nv(F.dMid), D: nv(F.D), c: num(F.c) }) : null,
  };
}
function formHTML() {
  const F = S.f, R = formResults(), inp = (k, size = 8) => `<label>${T('f.' + k)} <input type="text" inputmode="decimal" size="${size}" id="f-${k}" value="${esc(F[k])}"></label>`;
  const out = (r, ok) => !r ? '' : r.status === 'ok' ? ok + ((r.warnings || []).length ? ` <span class="note warn small">${esc(r.warnings.map(wtext).join('; '))}</span>` : '') : `<p class="note err small">${esc(r.problems.map(ptext).join('; '))}</p>`;
  let x = `<div class="card"><h2>${T('f.ff')}</h2><div class="lims">${inp('V')}${inp('d')}${inp('H')}<label>${T('f.kind')} <select id="f-kind">${['breast', 'absolute', 'absolute-above-bh', 'normal'].map(k => `<option value="${k}"${F.kind === k ? ' selected' : ''}>${T('f.k.' + k)}</option>`).join('')}</select></label></div>
    <div id="ffres">${out(R.ff, R.ff && R.ff.status === 'ok' ? `<p><b>${esc(T('f.ff.res', { F: f(R.ff.F, 4), fh: f(R.ff.formHeight, 3), B: f(R.ff.B, 5) }))}</b></p>` : '')}</div><p class="muted small">${T('f.ff.note')}</p></div>`;
  const exr = R.ex && R.ex.status === 'ok' ? { r: f(R.ex.r, 4), body: R.ex.body ? T('body.' + R.ex.body) : '', abs: f(R.ex.absoluteF, 4), bh: num(F.exH) > Fm.BH ? f(Fm.breastFormFactorFromExponent(R.ex.r, num(F.exH)), 4) : null } : null;
  x += `<div class="card"><h2>${T('f.ex')}</h2><p class="muted small">${T('f.ex.sub')}</p><div class="lims">${inp('d1')}${inp('x1')}${inp('d2')}${inp('x2')}${inp('exH')}</div>
    <div id="exres">${out(R.ex, exr ? `<p><b>${esc(T('f.ex.res', exr))}</b></p>` : '')}</div></div>`;
  x += `<div class="card"><h2>${T('f.q')}</h2><div class="lims">${inp('dMid')}${inp('D')}${inp('c')}</div>
    <div id="qres">${out(R.q, R.q && R.q.status === 'ok' ? `<p><b>${esc(T('f.q.res', { q: f(R.q.q, 4), F: R.q.F == null ? null : f(R.q.F, 4) }))}</b></p>` : '')}</div><p class="muted small">${T('f.q.note')}</p></div>`;
  return x;
}
function bindForm() {
  for (const k of Object.keys(S.f)) { const el = $('f-' + k); if (el) el.addEventListener('change', e => { S.f[k] = e.target.value; re(); }); }
}

/* ---------------- age and increment (TM-05) ---------------- */
/** Ring widths typed or pasted: separated by spaces, new lines, ';' or tabs; a comma inside a number is its decimal mark. */
const widthsOf = t => String(t || '').split(/[\s;]+/).filter(Boolean).map(x => nv(x));
function ageResults() {
  const A = S.a, any = ks => ks.some(k => String(A[k]).trim() !== ''), int = v => { const x = num(v); return Number.isInteger(x) ? x : NaN; };
  const ws = widthsOf(A.cW), core = any(['cD', 'cW']) ? Ag.coreSeries({ widths: ws, D: nv(A.cD), doubleBark: num(A.cBark) ?? 0, yearsToBh: num(A.cToBh) ?? 0, reachesPith: A.cPith }) : null;
  const n = int(A.cN);
  let pr = null;
  if (core && core.status === 'ok' && Number.isInteger(n) && n > 0 && n <= core.rings) { const then = core.series[n].d; pr = { n, d: then, p: Ag.presslerDiameter(core.dib, then, n), pai: Ag.periodicAnnual(core.dib, then, n) }; }
  const groups = A.groups.filter(g => Object.values(g).some(v => String(v).trim() !== '')).map(g => ({ a: nv(g.a), n: num(g.n), b: num(g.b), v: num(g.v) }));
  return {
    tree: any(['rings', 'toH']) ? Ag.treeAge({ rings: int(A.rings), yearsToHeight: num(A.toH) ?? 0 }) : null,
    econ: any(['ringsOut', 'coreAge']) ? Ag.economicAge({ ringsOutside: int(A.ringsOut), coreAge: nv(A.coreAge) }) : null,
    nog: any(['gD', 'gMai']) ? Ag.ageFromGrowth({ D: nv(A.gD), mai: nv(A.gMai) }) : null,
    core, pr, groups,
    stand: groups.length ? ['arithmetic', 'number', 'basal', 'volume'].map(m => Ag.standAge(groups, m)) : null,
    gp: any(['gNow', 'gThen', 'gYears']) ? ['past', 'present', 'mean'].map(pp => Ag.growthPercent({ now: nv(A.gNow), then: nv(A.gThen), n: nv(A.gYears), principal: pp })) : null,
    mai: any(['mTotal', 'mAge']) ? Ag.meanAnnual(nv(A.mTotal), nv(A.mAge)) : null,
  };
}
function ageHTML() {
  const A = S.a, R = ageResults(), inp = (k, size = 7) => `<label>${T('a.' + k)} <input type="text" inputmode="decimal" size="${size}" id="a-${k}" value="${esc(A[k])}"></label>`;
  const err = r => `<p class="note err small">${esc((r.problems || []).map(ptext).join('; '))}</p>`;
  const line = (r, txt) => !r ? '' : r.status === 'ok' ? `<p><b>${esc(txt)}</b></p>` : err(r);
  let x = `<div class="card"><h2>${T('a.age.h')}</h2><p class="muted small">${T('a.age.sub')}</p><div class="lims">${inp('rings')}${inp('toH')}</div><div id="ageres">${line(R.tree, R.tree && T('a.age.res', { age: f(R.tree.age, 1) }))}</div>
    <h3>${T('a.econ.h')}</h3><div class="lims">${inp('ringsOut')}${inp('coreAge')}</div><div id="econres">${line(R.econ, R.econ && T('a.econ.res', { age: f(R.econ.age, 1) }))}</div>
    <h3>${T('a.nog.h')}</h3><div class="lims">${inp('gD')}${inp('gMai')}</div><div id="nogres">${line(R.nog, R.nog && T('a.age.res', { age: f(R.nog.age, 1) }))}</div>
    <p class="muted small">${T('a.age.note')}</p></div>`;
  x += `<div class="card"><h2>${T('a.core.h')}</h2><p class="muted small">${T('a.core.sub')}</p><div class="lims">${inp('cD')}${inp('cBark')}${inp('cToBh')}<label><input type="checkbox" id="a-cPith"${A.cPith ? ' checked' : ''}> ${T('a.cPith')}</label></div>
    <label class="field"><span>${T('a.cW')}</span><textarea id="a-cW" rows="3" spellcheck="false">${esc(A.cW)}</textarea></label>`;
  const C = R.core;
  if (C && C.status === 'ok') {
    x += `<p id="coreres"><b>${esc(T('a.core.res', { rings: C.rings, age: f(C.ageNow, 0), dib: f(C.dib, 2), rad: f(C.radius, 2) }))}</b></p>${C.warnings.length ? `<p class="note warn small">${esc(C.warnings.map(wtext).join('; '))}</p>` : ''}
      <div class="lims">${inp('cN', 4)}</div>${R.pr ? `<p id="presres">${esc(T('a.pres.res', { n: R.pr.n, d: f(R.pr.d, 2), pai: f(R.pr.pai, 3), p: f(R.pr.p, 2) }))}</p>` : ''}
      <div class="tscroll"><table class="grid" id="coretab"><thead><tr><th>${T('a.c.ago')}</th><th>${T('a.c.age')}</th><th>${T('a.c.d')}</th><th>${T('a.c.g')}</th></tr></thead><tbody>${C.decades.map(r => `<tr><td class="num">${r.yearsAgo}</td><td class="num">${f(r.age, 0)}</td><td class="num">${r.d >= 0 ? f(r.d, 2) : '–'}</td><td class="num">${r.d >= 0 ? f(Dm.basalArea(r.d), 5) : '–'}</td></tr>`).join('')}</tbody></table></div><p class="muted small">${T('a.core.note')}</p>`;
  } else if (C) x += `<div id="coreres">${err(C)}</div>`;
  x += `</div><div class="card"><h2>${T('a.stand.h')}</h2><p class="muted small">${T('a.stand.sub')}</p><div class="tscroll"><table class="grid" id="sgtab"><thead><tr><th>#</th>${['a', 'n', 'b', 'v'].map(k => `<th>${T('a.g.' + k)}</th>`).join('')}<th></th></tr></thead><tbody>
    ${A.groups.map((g, i) => `<tr><td>${i + 1}</td>${['a', 'n', 'b', 'v'].map(k => `<td><input type="text" inputmode="decimal" size="7" data-grow="${i}" data-k="${k}" value="${esc(g[k])}" aria-label="${esc(T('a.g.' + k))} ${i + 1}"></td>`).join('')}<td>${A.groups.length > 1 ? `<button type="button" class="btn ghost small" data-gdel="${i}">${T('del')}</button>` : ''}</td></tr>`).join('')}
    </tbody></table></div><div class="exports"><button type="button" class="btn ghost small" id="a-gadd">${T('add')}</button></div>`;
  if (R.stand) x += `<table class="grid" id="standres"><tbody>${R.stand.map((r, k) => `<tr><td>${T('a.m.' + ['arithmetic', 'number', 'basal', 'volume'][k])}</td><td class="num">${r.status === 'ok' ? f(r.A, 1) : '–'}</td><td class="small">${r.status === 'ok' ? (r.skipped ? esc(T('a.skipped', { n: r.skipped })) : '') : esc(T('a.need.' + ['arithmetic', 'number', 'basal', 'volume'][k]))}</td></tr>`).join('')}</tbody></table>`;
  x += `</div><div class="card"><h2>${T('a.gp.h')}</h2><p class="muted small">${T('a.gp.sub')}</p><div class="lims">${inp('gNow')}${inp('gThen')}${inp('gYears', 4)}</div>`;
  if (R.gp) x += R.gp[0].status === 'ok' ? `<table class="grid" id="gpres"><tbody>${['past', 'present', 'mean'].map((pp, k) => `<tr><td>${T('a.p.' + pp)}</td><td class="num">${f(R.gp[k].p, 3)} %</td></tr>`).join('')}</tbody></table>${R.gp[0].warnings.length ? `<p class="note warn small">${esc(R.gp[0].warnings.map(wtext).join('; '))}</p>` : ''}` : err(R.gp[0]);
  x += `<h3>${T('a.mai.h')}</h3><div class="lims">${inp('mTotal')}${inp('mAge')}</div>${R.mai != null ? `<p id="maires"><b>${esc(T('a.mai.res', { m: f(R.mai, 4) }))}</b></p>` : ''}</div>`;
  return x;
}
function bindAge() {
  const A = S.a;
  for (const k of Object.keys(A)) { const el = $('a-' + k); if (el && k !== 'cPith') el.addEventListener('change', e => { A[k] = e.target.value; re(); }); }
  $('a-cPith').addEventListener('change', e => { A.cPith = e.target.checked; re(); });
  document.querySelectorAll('[data-grow]').forEach(x => x.addEventListener('change', () => { A.groups[+x.dataset.grow][x.dataset.k] = x.value; re(); }));
  document.querySelectorAll('[data-gdel]').forEach(x => x.addEventListener('click', () => { A.groups.splice(+x.dataset.gdel, 1); re(); }));
  $('a-gadd').addEventListener('click', () => { A.groups.push({ a: '', n: '', b: '', v: '' }); re(); });
}

/* ---------------- page ---------------- */
function re() { save(); render(); }
function render() {
  const tabs = ['h', 'd', 'f', 'a'];
  let x = `<div class="tabs" role="tablist" aria-label="${esc(T('tab.label'))}">${tabs.map(t => `<button type="button" role="tab" id="tab-${t}" aria-selected="${S.tab === t}" aria-controls="panel">${T('tab.' + t)}</button>`).join('')}</div><div id="panel" role="tabpanel" aria-labelledby="tab-${S.tab}">`;
  x += S.tab === 'h' ? heightHTML() : S.tab === 'd' ? diameterHTML() : S.tab === 'f' ? formHTML() : ageHTML();
  x += `</div><div class="card"><div class="exports"><button type="button" class="btn" id="x-xlsx">${T('x.excel')}</button><button type="button" class="btn ghost" id="x-json">${T('x.json')}</button>${recordOption()}
    <button type="button" class="btn ghost" id="reset">${T('reset')}</button></div><p class="muted small">${esc(T('src'))}</p></div>`;
  $('app').innerHTML = x;
  tabs.forEach(t => $('tab-' + t).addEventListener('click', () => { S.tab = t; re(); }));
  ({ h: bindHeight, d: bindDiameter, f: bindForm, a: bindAge })[S.tab]();
  $('reset').addEventListener('click', async () => { S = blank(); status(''); await del(KEY); render(); });
  $('x-json').addEventListener('click', () => downloadRecord(fname('json'), payload(), TOOL, S.d.imp && S.d.src ? [['tree-list', S.d.imp]] : [], m => status(m, 'err')));
  $('x-xlsx').addEventListener('click', excel);
}
const fname = ext => `${lang === 'tr' ? 'agac-olcumu' : 'tree-measurement'}-${new Date().toISOString().slice(0, 10)}.${ext}`;
function payload() {
  const hr = heightResults(), st = stemResult(), L = listRead(), R = formResults(), strip = r => r && (({ problems, warnings, ...rest }) => ({ ...rest, problems, warnings }))(r);
  return { tool: TOOL, created: new Date().toISOString(),
    height: { settings: { method: S.h.method, unit: S.h.unit, ground: S.h.ground, slope: S.h.slope }, readings: S.h.rows.map((r, i) => ({ input: Object.fromEntries(HCOLS[S.h.method].map(k => [k, r[k]])), result: strip(hr[i]) })),
      mean: Ht.meanReading(hr.filter(q => q && q.status === 'ok').map(q => q.H)) },
    diameter: { settings: { mean: S.d.mean, round: S.d.round }, readings: S.d.rows, stem: strip(st),
      list: L ? { column: S.d.src.headers[S.d.col], count: S.d.ncol == null ? null : S.d.src.headers[S.d.ncol], kind: S.d.kind, unit: S.d.unit, decimal: S.d.decimal, summary: L.sum, unreadRows: L.bad } : null },
    form: { inputs: S.f, formFactor: strip(R.ff), exponent: strip(R.ex), breastFromExponent: R.ex && R.ex.status === 'ok' && num(S.f.exH) > Fm.BH ? Fm.breastFormFactorFromExponent(R.ex.r, num(S.f.exH)) : null, quotient: strip(R.q) },
    age: (() => { const R = ageResults(); return { inputs: S.a, tree: strip(R.tree), economic: strip(R.econ), noRings: strip(R.nog), core: R.core && R.core.status === 'ok' ? { ...strip(R.core), pressler: R.pr } : strip(R.core),
      stand: R.stand && R.stand.map(strip), growthPercent: R.gp && R.gp.map(strip), meanAnnual: R.mai }; })(),
    sources: [T('src')] };
}
async function excel() {
  const XLSX = await loadXLSX(BASE), P = payload(), hr = heightResults(), L = listRead(), R = formResults();
  const info = [[T('x.k'), T('x.v')], [T('x.tool'), `${TOOL.id} ${TOOL.version}`], [T('x.date'), P.created], [T('x.lang'), lang], [T('x.src'), T('src')]];
  const cols = HCOLS[S.h.method];
  const hs = [['row', 'method', 'unit', ...cols, 'H_m', 'status', 'notes'], ...S.h.rows.map((r, i) => [i + 1, S.h.method, S.h.unit, ...cols.map(k => num(r[k])), hr[i] && hr[i].status === 'ok' ? hr[i].H : null, hr[i] ? hr[i].status : null, hr[i] ? [...hr[i].problems.map(ptext), ...hr[i].warnings.map(wtext)].join('; ') : null])];
  const st = stemResult(), ds = [['row', 'kind', 'value', 'unit'], ...S.d.rows.map((r, i) => [i + 1, r.kind, num(r.value), r.unit]), [], ['mean', S.d.mean], ['round', S.d.round], ['d_cm', st && st.status === 'ok' ? st.d : null], ['d_unrounded_cm', st && st.status === 'ok' ? st.dRaw : null], ['g_m2', st && st.status === 'ok' ? st.g : null]];
  const sheets = [{ name: T('x.info'), rows: info }, { name: T('x.h'), rows: hs }, { name: T('x.d'), rows: ds }];
  if (L) sheets.push({ name: T('x.list'), rows: [['row', 'd_cm', 'n', 'g_m2'], ...L.trees.map(t => [t.row, t.d, t.n, Dm.basalArea(t.d)]), [], ['N', L.sum.N], ['G_m2', L.sum.G], ['d_mean_cm', L.sum.dMean], ['dg_cm', L.sum.dg]] });
  sheets.push({ name: T('x.f'), rows: [['quantity', 'value'], ['V_m3', num(S.f.V)], ['d_cm', num(S.f.d)], ['H_m', num(S.f.H)], ['kind', S.f.kind], ['F', R.ff && R.ff.status === 'ok' ? R.ff.F : null], ['form_height_m', R.ff && R.ff.status === 'ok' ? R.ff.formHeight : null],
    ['d1', num(S.f.d1)], ['x1_m', num(S.f.x1)], ['d2', num(S.f.d2)], ['x2_m', num(S.f.x2)], ['r', R.ex && R.ex.status === 'ok' ? R.ex.r : null], ['F_absolute_from_r', R.ex && R.ex.status === 'ok' ? R.ex.absoluteF : null], ['F_breast_from_r', P.form.breastFromExponent],
    ['d_mid_cm', num(S.f.dMid)], ['D_cm', num(S.f.D)], ['q', R.q && R.q.status === 'ok' ? R.q.q : null], ['c', num(S.f.c)], ['F_q_minus_c', R.q && R.q.status === 'ok' ? R.q.F : null]] });
  const AR = ageResults(), ok = r => r && r.status === 'ok';
  sheets.push({ name: T('x.a'), rows: [['quantity', 'value'], ['rings', num(S.a.rings)], ['years_to_height', num(S.a.toH)], ['tree_age', ok(AR.tree) ? AR.tree.age : null], ['rings_outside_core', num(S.a.ringsOut)], ['core_age', num(S.a.coreAge)], ['economic_age', ok(AR.econ) ? AR.econ.age : null],
    ['D_no_rings', num(S.a.gD)], ['mean_annual_diameter_growth', num(S.a.gMai)], ['age_from_growth', ok(AR.nog) ? AR.nog.age : null], [],
    ['stand_age_method', 'A'], ...(AR.stand || []).map((r, k) => [['arithmetic', 'number', 'basal', 'volume'][k], ok(r) ? r.A : null]), [],
    ['V_now', num(S.a.gNow)], ['v_then', num(S.a.gThen)], ['years', num(S.a.gYears)], ...(AR.gp || []).map((r, k) => ['growth_percent_' + ['past', 'present', 'mean'][k], ok(r) ? r.p : null]), ['mean_annual_growth', AR.mai]] });
  if (ok(AR.core)) sheets.push({ name: T('x.core'), rows: [['D_cm', num(S.a.cD)], ['double_bark_cm', num(S.a.cBark) ?? 0], ['years_to_bh', num(S.a.cToBh) ?? 0], ['reaches_pith', S.a.cPith], ['rings', AR.core.rings], ['age_now', AR.core.ageNow],
    ['pressler_n', AR.pr ? AR.pr.n : null], ['pressler_percent', AR.pr ? AR.pr.p : null], [], ['years_ago', 'age', 'd_ub_cm', 'g_m2', 'ring_width_mm'], ...AR.core.series.map((r, k) => [r.yearsAgo, r.age, r.d >= 0 ? r.d : null, r.d >= 0 ? Dm.basalArea(r.d) : null, k ? widthsOf(S.a.cW)[k - 1] : null])] });
  download(fname('xlsx'), xlsxBlob(XLSX, sheets), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

(async function init() {
  $('privacy').textContent = T('privacy');
  try {
    const saved = await get(KEY);
    if (saved && saved.v === 1) {
      const b = blank();
      S = { ...b, ...saved, h: { ...b.h, ...(saved.h || {}) }, d: { ...b.d, ...(saved.d || {}) }, f: { ...b.f, ...(saved.f || {}) }, a: { ...b.a, ...(saved.a || {}) } };
      if (S.d.imp && S.d.imp.buf) S.d.src = await readImport(S.d.imp, BASE).catch(() => null);
      status(T('restored', { when: new Date(saved.saved).toLocaleString(LOC) }));
    }
  } catch (e) { S = blank(); }
  render();
})();
