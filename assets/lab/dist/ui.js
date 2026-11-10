// Diameter distribution tool, engine version (development page): interface. Everything about families and methods
// comes from the registry (./index.js); adding a family there adds it here without changes to this file.
import * as D from './index.js';
import { T } from './i18n.js';
import { lang, fmtNum, esc } from '../core/i18n.js';
import { put, get, del } from '../core/store.js';
import { download, downloadJSON } from '../core/export.js';
import { plotChart, svgForDownload } from '../core/chart.js';
import { renderImport, readImport } from '../core/importer.js';
import { cellText } from '../core/table.js';
import { detectDecimal, defaultDecimal } from '../core/num.js';
import { createUnitNav } from '../core/unitnav.js';

const BASE = './', KEY = 'session:cap-dagilimi-2';
const $ = id => document.getElementById(id);
const LOC = lang === 'tr' ? 'tr-TR' : 'en-GB';
const f = (x, d = 4) => x == null || !Number.isFinite(x) ? '–' : fmtNum(x, d);
const num = v => { const x = parseFloat(String(v).trim().replace(',', '.')); return Number.isFinite(x) ? x : NaN; };
const perLabel = p => p == null ? T('per.none') : p;
const samePer = (a, b) => (a ?? null) === (b ?? null);

let S = blank(), R = null;
function blank() {
  return { v: 1, step: 1, tab: 'params', imp: null, src: null, dcol: null, unit: 'cm', pcol: null, percol: null, fcol: null, fval: null, decimal: null, decimalChosen: false,
    mode: 'each', methods: null, aText: '', selPlot: null, selPer: null, nav: null, hidden: [] };
}
let saveT = null;
function save() { clearTimeout(saveT); saveT = setTimeout(flush, 250); }
async function flush() { clearTimeout(saveT); saveT = null; await put(KEY, { ...S, saved: new Date().toISOString() }); }
$('langlink') && $('langlink').addEventListener('click', async e => { e.preventDefault(); const h = e.currentTarget.href; await flush(); location.href = h; });
function status(m, k = '') { const s = $('status'); s.className = 'status ' + k; s.textContent = m || ''; }

/* ---------------- step 1: data ---------------- */
function setTable(st) {
  S = { ...blank(), step: S.step, imp: st.imp, src: st.src }; R = null;
  if (S.src) {
    const H = S.src.headers.map(h => String(h).trim().toLocaleLowerCase('tr')), find = names => { const i = H.findIndex(h => names.includes(h)); return i < 0 ? null : i; };
    S.dcol = find(['dbh', 'dbh_cm', 'cap', 'çap', 'cap_cm', 'çap_cm', 'd', 'd13']); S.pcol = find(['plot', 'plot_id', 'plotno', 'alan', 'alan_no', 'ornek_alan', 'örnek_alan']);
    S.percol = find(['period', 'year', 'yil', 'yıl', 'donem', 'dönem']);
  }
  status(''); save(); render();
}
function renderStep1() {
  const el = $('step1');
  el.innerHTML = `<p class="note warn" id="devnote">${T('dev')}</p><div id="impbox"></div>
    <div class="card sample"><button type="button" class="btn ghost" id="sample">${T('sample')}</button><span class="muted small">${T('sample.note')}</span></div>
    <div class="nav"><button type="button" class="btn ghost" id="reset">${T('reset')}</button><button type="button" class="btn" id="to2"${S.src ? '' : ' disabled'}>${T('next')}</button>${S.src ? '' : `<span class="muted small">${T('need.data')}</span>`}</div>`;
  renderImport($('impbox'), { imp: S.imp, src: S.src }, { base: BASE, title: T('imp.h'), sub: T('imp.sub'), onChange: setTable, onError: m => status(m, 'err') });
  $('sample').addEventListener('click', async () => {
    const buf = await (await fetch(BASE + 'assets/lab/dist/ornek/ornek-caplar.csv')).arrayBuffer();
    const imp = { kind: 'csv', name: lang === 'tr' ? 'ornek-caplar.csv (benzetim)' : 'ornek-caplar.csv (simulated)', buf, encoding: 'utf-8', delim: null, header: true, sheet: null };
    setTable({ imp, src: await readImport(imp, BASE) });
  });
  $('reset').addEventListener('click', async () => { S = blank(); R = null; status(''); render(); await del(KEY); });
  $('to2').addEventListener('click', () => go(2));
}

/* ---------------- step 2: settings (families and methods come from the registry) ---------------- */
const fitMethods = fam => D.methodsFor({ family: fam, kind: 'fit', dataType: 'raw' });
function chosenMethods() {
  if (!S.methods) S.methods = Object.fromEntries(D.families().flatMap(fa => fitMethods(fa.id).map(m => [m.id, true])));
  return D.families().flatMap(fa => fitMethods(fa.id)).filter(m => S.methods[m.id]);
}
function aFixed() { const t = String(S.aText).trim(); if (!t) return { a: null }; const a = num(t); return Number.isFinite(a) && a >= 0 ? { a } : { bad: true }; }
const needsLocation = () => chosenMethods().some(m => (m.options || []).some(o => o.key === 'a'));
function settingsProblems() {
  const p = [];
  if (S.dcol == null) p.push(T('col.need'));
  if (!chosenMethods().length) p.push(T('fam.need'));
  if (needsLocation() && aFixed().bad) p.push(T('loc.bad'));
  return p;
}
function renderStep2() {
  const el = $('step2'), Hd = S.src.headers;
  const opts = sel => `<option value="">${T('none')}</option>` + Hd.map((h, i) => `<option value="${i}"${sel === i ? ' selected' : ''}>${esc(h)}</option>`).join('');
  const dv = detectDecimal(S.dcol == null ? [] : S.src.rows.map(r => r[S.dcol]).filter(x => x && x.t === 's').map(x => x.v));
  if (!S.decimalChosen) S.decimal = defaultDecimal(dv.verdict);
  const vals = c => [...new Set(S.src.rows.map(r => cellText(r[c]).trim()))].sort(D.natural);
  chosenMethods();
  let h = `<div class="card"><h2>${T('col.h')}</h2><div class="lims"><label>${T('col.d')} <select id="dcol">${opts(S.dcol)}</select></label>
    <label>${T('col.unit')} <select id="dunit">${['cm', 'mm'].map(u => `<option${S.unit === u ? ' selected' : ''}>${u}</option>`).join('')}</select></label>
    <label>${T('col.plot')} <select id="pcol">${opts(S.pcol)}</select></label><label>${T('col.per')} <select id="percol">${opts(S.percol)}</select></label>
    <label>${T('col.filter')} <select id="fcol">${opts(S.fcol)}</select></label>
    ${S.fcol != null ? `<label>${T('col.fval')} <select id="fval"><option value="">${T('none')}</option>${vals(S.fcol).map(v => `<option${S.fval === v ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select></label>` : ''}</div>
    <p class="muted small">${T('col.pernote')}</p></div>`;
  const dmsg = dv.verdict === 'ambiguous' ? T('dec.v.ambiguous', { ex: dv.examples.ambiguous.map(x => `"${x}"`).join(', ') }) : T('dec.v.' + dv.verdict);
  h += `<div class="card"><h2>${T('dec.h')}</h2><p class="note ${dv.verdict === 'ambiguous' || dv.verdict === 'conflict' ? 'warn' : ''}">${esc(dmsg)}</p><div class="radios">
    <label><input type="radio" name="dec" value="."${S.decimal === '.' ? ' checked' : ''}> ${T('dec.dot')}</label><label><input type="radio" name="dec" value=","${S.decimal === ',' ? ' checked' : ''}> ${T('dec.comma')}</label></div></div>`;
  if (S.pcol != null) h += `<div class="card"><h2>${T('mode.h')}</h2><div class="radios col"><label><input type="radio" name="mode" value="each"${S.mode === 'each' ? ' checked' : ''}> ${T('mode.each')}</label>
    <label><input type="radio" name="mode" value="pool"${S.mode === 'pool' ? ' checked' : ''}> ${T('mode.pool')}</label></div>${S.mode === 'pool' ? `<p class="note warn">${T('mode.poolnote')}</p>` : ''}</div>`;
  h += `<div class="card" id="famcard"><h2>${T('fam.h')}</h2><p class="muted">${T('fam.sub')}</p>${D.families().map(fa => { const ms = fitMethods(fa.id); return !ms.length ? '' : `<fieldset class="fam" data-fam="${fa.id}"><legend>${esc(T('fam.' + fa.id))}</legend>
      <div class="radios col">${ms.map(m => `<label><input type="checkbox" data-m="${m.id}"${S.methods[m.id] ? ' checked' : ''}> ${esc(T('m.' + m.id))}</label>`).join('')}</div></fieldset>`; }).join('')}</div>`;
  if (needsLocation()) h += `<div class="card"><h2>${T('loc.h')}</h2><p class="muted">${T('loc.sub')}</p><label class="field inline"><span>${T('loc.label')}</span><input type="text" inputmode="decimal" id="atext" value="${esc(S.aText)}" size="8"></label>
    ${aFixed().bad ? `<p class="note err">${T('loc.bad')}</p>` : ''}</div>`;
  const pr = settingsProblems();
  h += `<div class="nav"><button type="button" class="btn ghost" id="back1">${T('back')}</button><button type="button" class="btn" id="calc"${pr.length ? ' disabled' : ''}>${T('calc')}</button>${pr.length ? `<span class="muted small">${pr.map(esc).join(' ')}</span>` : ''}</div>`;
  el.innerHTML = h;
  const re = () => { R = null; save(); renderStep2(); renderSteps(); };
  for (const [id, k] of [['dcol', 'dcol'], ['pcol', 'pcol'], ['percol', 'percol'], ['fcol', 'fcol']]) $(id).addEventListener('change', e => { S[k] = e.target.value === '' ? null : +e.target.value; if (k === 'fcol') S.fval = null; if (k === 'dcol') S.decimalChosen = false; re(); });
  $('dunit').addEventListener('change', e => { S.unit = e.target.value; re(); });
  $('fval') && $('fval').addEventListener('change', e => { S.fval = e.target.value || null; re(); });
  el.querySelectorAll('input[name="dec"]').forEach(x => x.addEventListener('change', () => { S.decimal = x.value; S.decimalChosen = true; re(); }));
  el.querySelectorAll('input[name="mode"]').forEach(x => x.addEventListener('change', () => { S.mode = x.value; re(); }));
  el.querySelectorAll('[data-m]').forEach(x => x.addEventListener('change', () => { S.methods[x.dataset.m] = x.checked; re(); }));
  $('atext') && $('atext').addEventListener('change', e => { S.aText = e.target.value; re(); });
  $('back1').addEventListener('click', () => go(1));
  $('calc').addEventListener('click', () => { compute(); S.tab = 'params'; go(3); });
}

/* ---------------- computation: every chosen method on every unit, through the registry ---------------- */
function compute() {
  const X = D.extractUnits(S.src, { dcol: S.dcol, unit: S.unit, decimal: S.decimal, pcol: S.pcol, percol: S.percol, fcol: S.fcol, fval: S.fval, mode: S.mode });
  const a = aFixed().a, ms = chosenMethods();
  for (const u of X.units) {
    u.desc = D.describe(u.d); u.results = [];
    for (const m of ms) {
      const variants = (m.options || []).some(o => o.key === 'a') ? [{ a: 0 }, ...(a != null && a !== 0 ? [{ a }] : [])] : [{}];
      for (const o of variants) {
        const r = D.runMethod(m.id, { d: u.d, plot: u.plot === D.POOL ? null : u.plot, period: u.period }, o), fam = D.family(r.family);
        if (r.status === 'ok') {
          r.gof = { ks: D.gof.ks(fam, r.params, u.d), ad: D.gof.ad(fam, r.params, u.d) };
          if (r.likelihoodMaximised) Object.assign(r.gof, D.gof.aicBic(r.logLik, r.free.length, u.d.length));   // AIC only where the likelihood was maximised
        }
        u.results.push(r);
      }
    }
    const okN = u.results.filter(r => r.status === 'ok').length, warn = u.results.some(r => r.status !== 'ok' || r.warnings.some(w => w.code !== 'var.n1'));
    u.state = !okN ? 'error' : warn ? 'warning' : 'ok';
  }
  R = { ...X };
  fixSel();
}
const plotIds = () => R ? R.plots : [];
const unitsOf = id => R.units.filter(u => u.plot === id);
const curUnit = () => R && R.units.find(u => u.plot === S.selPlot && samePer(u.period, S.selPer));
function fixSel() {
  if (curUnit()) return;
  const own = unitsOf(S.selPlot), u = own.find(x => samePer(x.period, S.selPer)) || own[0] || R.units[0];
  S.selPlot = u ? u.plot : null; S.selPer = u ? u.period : null;
}
const unitLabel = u => `${u.plot === D.POOL ? T('unit.pool') : T('unit.plot', { p: u.plot })}${u.period != null ? ` / ${u.period}` : ''}`;
const resName = r => { const fx = Object.entries(r.fixed).map(([k, v]) => `${k} = ${f(v.value, 4)}`).join(', '); return `${T('fam.' + r.family)} · ${T('m.' + r.method)}${fx ? ` (${fx})` : ''}`; };

/* ---------------- step 3: results ---------------- */
const TABS = ['params', 'charts'];
function renderStep3() {
  if (!R) compute();
  const el = $('step3'), withNav = plotIds().length > 1, a = R.acc;
  nav.reset();
  el.innerHTML = `<p class="small" id="acc">${T('acc', { read: fmtNum(a.read, 0) })}${a.bad || a.nonpos ? ` <span class="note warn">${T('acc.bad', { n: a.bad, np: a.nonpos, rows: a.badRows.join(', '), more: a.bad + a.nonpos > a.badRows.length })}</span>` : ''}${a.filtered ? ` ${T('acc.f', { n: a.filtered })}` : ''}</p>
    <div class="tabs" role="tablist">${TABS.map(t => `<button type="button" role="tab" id="tab-${t}" aria-selected="${S.tab === t}" aria-controls="panel" data-tab="${t}">${T('tab.' + t)}</button>`).join('')}</div>
    <div class="panel${withNav ? ' withnav' : ''}">${withNav ? `<aside class="unav" id="unav" aria-label="${esc(T('nav.list'))}"></aside>` : ''}<div id="panel" role="tabpanel" aria-labelledby="tab-${S.tab}"></div></div>
    <div class="nav"><button type="button" class="btn ghost" id="back2">${T('back')}</button></div>`;
  el.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { S.tab = b.dataset.tab; save(); renderStep3(); }));
  el.querySelector('.tabs').addEventListener('keydown', e => {
    const i = TABS.indexOf(S.tab), d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return; S.tab = TABS[(i + d + TABS.length) % TABS.length]; renderStep3(); $('tab-' + S.tab).focus();
  });
  $('back2').addEventListener('click', () => go(2));
  if (withNav) nav.renderAside($('unav'));
  drawPanel();
}
function drawPanel() { const p = $('panel'); if (!p) return; (S.tab === 'charts' ? tabCharts : tabParams)(p); }

/* plot navigator (shared component) + period switch, as in Plot & Stand Metrics */
const ST = ['ok', 'warning', 'error'];
function choosePlot(id) { const own = unitsOf(id); if (!own.length) return; const u = own.find(x => samePer(x.period, S.selPer)) || own[0]; S.selPlot = u.plot; S.selPer = u.period; drawPanel(); }
function choosePeriod(i) { const u = unitsOf(S.selPlot)[i]; if (!u) return; S.selPer = u.period; save(); drawPanel(); if ($('unav')) nav.renderAside($('unav')); $('per-' + i) && $('per-' + i).focus(); }
function perSwitch(u) {
  const own = unitsOf(u.plot);
  if (own.length < 2) return u.period == null ? '' : `<div class="perswitch single small muted">${T('per')}: <b>${esc(perLabel(u.period))}</b></div>`;
  return `<div class="perswitch" role="group" aria-label="${esc(T('nav.per'))}"><span class="small muted">${T('per')}:</span>${own.map((x, i) => {
    const on = samePer(x.period, u.period);
    return `<button type="button" class="btn ghost small${on ? ' on' : ''}" id="per-${i}" data-per="${i}" aria-pressed="${on}" title="${esc(T('nav.st.' + x.state))}">${esc(perLabel(x.period))}${x.state === 'ok' ? '' : ` <span class="ust st-${x.state}">${x.state === 'warning' ? '▲' : '◆'}</span>`}</button>`; }).join('')}</div>`;
}
function bindBar() {
  nav.bindBar();
  const ps = document.querySelector('.perswitch[role="group"]'); if (!ps) return;
  ps.addEventListener('click', e => { const b = e.target.closest('[data-per]'); if (b) choosePeriod(+b.dataset.per); });
  ps.addEventListener('keydown', e => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
    e.preventDefault(); const own = unitsOf(S.selPlot), i = own.findIndex(x => samePer(x.period, S.selPer)); choosePeriod((i + d + own.length) % own.length);
  });
}
const nav = createUnitNav({
  items: () => plotIds().map(id => {
    const own = unitsOf(id), st = ST[Math.max(...own.map(x => ST.indexOf(x.state)))], n = own.reduce((s, x) => s + x.d.length, 0);
    return { id, label: id === D.POOL ? T('unit.pool') : String(id), search: String(id), state: st, stateTitle: T('nav.st.' + st), n,
      meta: [own.length > 1 ? T('nav.nper', { k: own.length }) : `n = ${fmtNum(n, 0)}`, own.length > 1 ? `n = ${fmtNum(n, 0)}` : ''], barLabel: id === D.POOL ? T('unit.pool') : T('unit.plot', { p: id }) };
  }),
  sorts: [{ key: 'id', label: T('nav.sort.id'), cmp: (a, b) => D.natural(a.id, b.id) }, { key: 'n', label: T('nav.sort.n'), cmp: (a, b) => b.n - a.n },
    { key: 'state', label: T('nav.sort.state'), cmp: (a, b) => ST.indexOf(b.state) - ST.indexOf(a.state) }],
  texts: { search: T('nav.search'), sort: T('nav.sort'), bad: T('nav.bad'), count: p => T('nav.count', p), none: T('nav.none'), prev: T('nav.prev'), next: T('nav.next'), keys: T('nav.keys'), outside: T('nav.outside') },
  prefs: () => S.nav || (S.nav = { q: '', sort: 'id', bad: false }),
  getSel: () => S.selPlot, setSel: id => choosePlot(plotIds().find(x => String(x) === String(id))), save });
document.addEventListener('keydown', e => { if (R && S.step === 3 && plotIds().length > 1) nav.handleKey(e, '.perswitch'); });

function notesOf(r) {
  const out = [];
  for (const q of r.problems) out.push(T('pr.' + q.code, q));
  for (const w of r.warnings) out.push(T('w.' + w.code, w));
  if (r.error) out.push(T('e.' + r.error.code, r.error.detail));
  return out;
}
function tabParams(p) {
  const u = curUnit(); if (!u) { p.innerHTML = ''; return; }
  const s = u.desc, tile = (v, l) => `<div class="tile"><b>${v}</b><span>${l}</span></div>`;
  let h = nav.bar(perSwitch(u)) + `<div class="tiles">${tile(fmtNum(s.n, 0), T('d.n'))}${tile(f(s.mean, 2), T('d.mean'))}${tile(f(s.dq, 2), T('d.dq'))}${tile(`${f(s.min, 1)}–${f(s.max, 1)}`, T('d.range'))}${tile(f(s.varN, 2), T('d.var'))}</div>`;
  for (const fa of D.families()) {
    const rs = u.results.filter(r => r.family === fa.id); if (!rs.length) continue;
    h += `<h3>${esc(T('fam.' + fa.id))}</h3><div class="tscroll"><table class="grid ptab" data-fam="${fa.id}"><thead><tr><th>${T('t.method')}</th><th>${T('t.fixed')}</th>
      ${fa.params.map(q => `<th title="${esc(T('role.' + q.role))}">${esc(q.key)}${q.unit ? ` (${q.unit})` : ''}</th>`).join('')}<th>${T('t.n')}</th><th>${T('t.ll')}</th><th>${T('t.aic')}</th><th>${T('t.bic')}</th><th>${T('t.ks')}</th><th>${T('t.ad')}</th><th>${T('t.status')}</th><th>${T('t.solver')}</th></tr></thead><tbody>
      ${rs.map(r => { const okr = r.status === 'ok', g = r.gof || {}, fx = Object.entries(r.fixed).map(([k, v]) => T('fixed.' + (v.origin === 'zero' ? 'zero' : 'user'), { k, v: f(v.value, 4) })).join(', ') || T('fixed.none');
        return `<tr class="${okr ? '' : 'st-bad'}" data-method="${r.method}" data-status="${r.status}"><th>${esc(T('m.' + r.method))}</th><td>${esc(fx)}</td>${fa.params.map(q => `<td class="num">${okr ? f(r.params[q.key], 4) : '–'}</td>`).join('')}
          <td class="num">${fmtNum(r.data.n, 0)}</td><td class="num">${okr ? f(r.logLik, 3) : '–'}</td><td class="num">${g.aic != null ? f(g.aic, 2) : '–'}</td><td class="num">${g.bic != null ? f(g.bic, 2) : '–'}</td>
          <td class="num">${okr ? f(g.ks, 4) : '–'}</td><td class="num">${okr ? f(g.ad, 3) : '–'}</td><td>${T('st.' + r.status)}</td><td class="small">${esc(T('sol.' + r.convergence.solver))}${r.convergence.iter != null ? ` · ${r.convergence.iter}` : ''}</td></tr>`; }).join('')}</tbody></table></div>`;
    const notes = rs.flatMap(r => notesOf(r).map(x => `${T('m.' + r.method)}${Object.values(r.fixed).some(v => v.origin !== 'zero') ? ` (${Object.entries(r.fixed).map(([k, v]) => `${k} = ${f(v.value, 4)}`).join(', ')})` : ''}: ${x}`));
    if (notes.length) h += `<ul class="small notes">${[...new Set(notes)].map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  }
  h += `<p class="muted small">${T('p.note')}</p><div class="exports"><button type="button" class="btn ghost" id="x-json">${T('p.json')}</button></div>`;
  p.innerHTML = h; bindBar();
  $('x-json').addEventListener('click', () => downloadJSON(`cap-dagilimi-sonuc-${new Date().toISOString().slice(0, 10)}.json`,
    { tool: D.TOOL, created: new Date().toISOString(), source: S.imp ? S.imp.name : null, settings: { unit: S.unit, decimal: S.decimal, mode: S.mode, fixedLocation: aFixed().a }, results: R.units.flatMap(x => x.results.map(({ gof, ...r }) => ({ ...r, fit: gof || null }))) }));
}
function niceWidth(range) { const raw = range / 12, p = 10 ** Math.floor(Math.log10(raw)), m = raw / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; }
function tabCharts(p) {
  const u = curUnit(); if (!u) { p.innerHTML = ''; return; }
  const okR = u.results.map((r, i) => [r, i]).filter(([r]) => r.status === 'ok'), key = ([r]) => r.method + '|' + JSON.stringify(r.fixed);
  let h = nav.bar(perSwitch(u));
  if (!okR.length) { p.innerHTML = h + `<p class="note warn">${T('p.nofit')}</p>`; bindBar(); return; }
  const shown = okR.filter(x => !S.hidden.includes(key(x)));
  h += `<p class="small">${T('ch.fit')}: ${okR.map(x => `<label class="chk"><input type="checkbox" data-fit="${esc(key(x))}"${S.hidden.includes(key(x)) ? '' : ' checked'}> ${esc(resName(x[0]))}</label>`).join(' ')}</p>`;
  const s = u.desc, w = niceWidth(Math.max(s.max - s.min, 1e-9)), b0 = Math.floor(s.min / w) * w, nb = Math.max(1, Math.ceil((s.max - b0) / w + 1e-9)), n = u.d.length;
  const bars = Array.from({ length: nb }, (_, i) => ({ lo: b0 + i * w, hi: b0 + (i + 1) * w, v: 0 }));
  for (const v of u.d) bars[Math.min(nb - 1, Math.floor((v - b0) / w))].v += 1 / (n * w);
  const hi = b0 + nb * w, xmin = Math.max(0, b0 - (hi - b0) * 0.03), xmax = hi + (hi - b0) * 0.03, xs = Array.from({ length: 401 }, (_, i) => xmin + (xmax - xmin) * i / 400);
  const line = (fn) => shown.map(([r, i]) => { const fam = D.family(r.family); return { name: resName(r), k: i, dash: r.estimator !== 'ml', pts: xs.map(x => [x, fam[fn](x, r.params)]) }; });
  const srt = [...u.d].sort((a, b) => a - b), step = [[xmin, 0], ...srt.map((x, j) => [x, (j + 1) / n]), [xmax, 1]];
  const fm = v => fmtNum(v, 3), nm = String(u.plot === D.POOL ? 'havuz' : u.plot).replace(/[^\p{L}\p{N}_-]+/gu, '_') + (u.period != null ? '-' + u.period : '');
  h += `<div class="charts2"><figure class="chartbox" id="ch-h">${plotChart({ title: T('ch.hist', { u: unitLabel(u) }), xmin, xmax, bars, lines: line('pdf'), xLabel: T('ch.d'), yLabel: T('ch.dens'), fmt: fm })}
      <figcaption><span class="muted small">${T('ch.bins', { w: f(w, 3) })}</span> <button type="button" class="btn ghost small" data-svg="ch-h" data-name="histogram-${nm}">${T('ch.svg')}</button></figcaption></figure>
    <figure class="chartbox" id="ch-c">${plotChart({ title: T('ch.cdf', { u: unitLabel(u) }), xmin, xmax, ymin: 0, ymax: 1, lines: [{ name: T('ch.ecdf'), step: true, k: 5, pts: step }, ...line('cdf')], xLabel: T('ch.d'), yLabel: T('ch.F'), fmt: fm })}
      <figcaption><button type="button" class="btn ghost small" data-svg="ch-c" data-name="birikimli-${nm}">${T('ch.svg')}</button></figcaption></figure></div>`;
  p.innerHTML = h; bindBar();
  p.querySelectorAll('[data-fit]').forEach(x => x.addEventListener('change', () => { const k = x.dataset.fit; S.hidden = x.checked ? S.hidden.filter(j => j !== k) : [...S.hidden, k]; save(); tabCharts(p); }));
  p.querySelectorAll('[data-svg]').forEach(b => b.addEventListener('click', () => download(b.dataset.name + '.svg', svgForDownload($(b.dataset.svg).querySelector('svg')), 'image/svg+xml')));
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
  try { const saved = await get(KEY); if (saved && saved.v === 1) { S = { ...blank(), ...saved }; status(T('restored', { when: new Date(saved.saved).toLocaleString(LOC) })); } } catch (e) { S = blank(); }
  render();
})();
