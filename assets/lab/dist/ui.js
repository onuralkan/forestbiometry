// Diameter distribution tool, engine version (development page): interface. Everything about families and methods
// comes from the registry (./index.js); adding a family there adds it here without changes to this file.
import * as D from './index.js';
import { T } from './i18n.js';
import { lang, fmtNum, esc } from '../core/i18n.js';
import { put, get, del } from '../core/store.js';
import { download, downloadJSON, downloadCSV, xlsxBlob, loadXLSX } from '../core/export.js';
import * as REP from './report.js';
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
const has = k => T(k) !== k;
/** Probability: small values in exponent form (decimal point), never rounded to a misleading 0. */
const fP = x => x == null || !Number.isFinite(x) ? '–' : x === 0 ? '0' : x < 1e-4 ? x.toExponential(2) : fmtNum(x, 4);
const parLabel = (fam, k) => { const q = D.family(fam).params.find(x => x.key === k); return q ? q.label ?? q.key : k; };
const parHead = q => `${q.label ?? q.key}${q.unit ? ` (${q.unit})` : q.scale === 'log' ? ` (${T('unit.log')})` : ''}`;
const perLabel = p => p == null ? T('per.none') : p;
const samePer = (a, b) => (a ?? null) === (b ?? null);

let S = blank(), R = null;
function blank() {
  return { v: 1, step: 1, tab: 'params', imp: null, src: null, dcol: null, unit: 'cm', pcol: null, percol: null, fcol: null, fval: null, decimal: null, decimalChosen: false,
    wf: 'raw', sum: { mean: '', which: 'var', v: '', div: 'n', n: '', dq: '', methods: {}, done: false },
    prs: { xi: '', mean: '', median: '', qmode: 'ng', nha: '', g: '', dq: '', origin: 'measured', from: null, unit: 0, done: false },
    wb: { methods: {}, mean: '', v: '', div: 'n', n: '', dq: '', q31: '', q63: '', q50: '', q95: '', loc: 'half-dmin', dmin: '', a: '', origin: 'measured', from: null, unit: 0, done: false },
    mode: 'each', methods: null, mopt: {}, bText: { L: '', U: '', xi: '', lambda: '' }, aText: '', selPlot: null, selPer: null, nav: null, hidden: [] };
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
  if (!S.methods) S.methods = {};
  for (const fa of D.families()) for (const m of fitMethods(fa.id)) if (!(m.id in S.methods)) S.methods[m.id] = !m.needsInput;   // new methods start checked, except those that need the user's input (beta bounds)
  return D.families().flatMap(fa => fitMethods(fa.id)).filter(m => S.methods[m.id]);
}
function aFixed() { const t = String(S.aText).trim(); if (!t) return { a: null }; const a = num(t); return Number.isFinite(a) && a >= 0 ? { a } : { bad: true }; }
// method options other than the fixed location (e.g. variance divisor, percentile pair), kept as text as typed
const extraOpts = m => (m.options || []).filter(o => o.type !== 'fixed-param');
// fixed support bounds entered by the user (beta); never taken from the data
const isUserBound = o => o.type === 'fixed-param' && (o.policies || []).join() === 'user';
/** Families of the chosen methods that need user-fixed support parameters (beta: L, U; Johnson SB: ξ, λ), with their keys. */
function boundFams() {
  const out = new Map();
  for (const m of chosenMethods()) { const ks = (m.options || []).filter(isUserBound).map(o => o.key); if (ks.length && !out.has(m.family)) out.set(m.family, { keys: ks, check: m.checkOptions || (() => []) }); }
  return out;
}
const needsBounds = () => boundFams().size > 0;
const boundVal = k => { const t = String((S.bText || {})[k] ?? '').trim(); return t === '' ? NaN : num(t); };
function optText(m, o) { const t = (S.mopt[m.id] || {})[o.key]; return t != null ? t : o.default != null ? String(o.default) : ''; }
/** Parsed options of a method: { opts } or { bad: [problem] } (never a guessed value). */
function methodOpts(m) {
  const opts = {}, bad = [];
  for (const o of m.options || []) if (isUserBound(o)) opts[o.key] = boundVal(o.key);
  for (const o of extraOpts(m)) {
    const t = optText(m, o);
    if (o.type === 'choice') opts[o.key] = o.values.includes(t) ? t : o.default;
    else if (o.type === 'prob') { const v = num(t); opts[o.key] = v; if (!(v > 0 && v < 1)) bad.push({ code: 'pr.range' }); }
  }
  if (!bad.length && m.checkOptions) bad.push(...m.checkOptions(opts));
  return bad.length ? { bad: bad.slice(0, 1) } : { opts };
}
const setLabel = r => Object.entries(r.settings || {}).filter(([k]) => !['quantile', 'boundPolicy', 'pair'].includes(k)).map(([k, v]) => T('set.' + k, { v: typeof v === 'number' ? fmtNum(v, 4) : v })).join(', ');
const methodName = r => { const sl = setLabel(r); return T('m.' + r.method) + (sl ? ` · ${sl}` : ''); };
const needsLocation = () => chosenMethods().some(m => (m.options || []).some(o => o.key === 'a'));
function settingsProblems() {
  const p = [];
  if (S.dcol == null) p.push(T('col.need'));
  if (!chosenMethods().length) p.push(T('fam.need'));
  if (needsLocation() && aFixed().bad) p.push(T('loc.bad'));
  for (const m of chosenMethods()) { const o = methodOpts(m); if (o.bad) p.push(`${T('m.' + m.id)}: ${T('pr.' + o.bad[0].code, o.bad[0])}.`); }
  return p;
}
function optControls(m) {
  const xs = extraOpts(m); if (!xs.length) return '';
  const mo = methodOpts(m);
  return `<div class="mopts" data-mopts="${m.id}">${xs.map(o => o.type === 'choice'
    ? `<span class="small">${T('opt.' + o.key)}:</span> ${o.values.map(v => `<label class="small"><input type="radio" name="o-${m.id}-${o.key}" data-o="${m.id}|${o.key}" value="${v}"${optText(m, o) === v ? ' checked' : ''}> ${T('opt.' + o.key + '.' + v)}</label>`).join(' ')}`
    : `<label class="small">${T('opt.' + o.key)} <input type="text" inputmode="decimal" size="5" id="o-${m.id.replace('.', '-')}-${o.key}" data-o="${m.id}|${o.key}" value="${esc(optText(m, o))}"></label>`).join(' ')}
    <p class="muted small">${T('opt.note.' + m.id)}</p>${mo.bad ? `<p class="note err small">${esc(T('pr.' + mo.bad[0].code, mo.bad[0]))}</p>` : ''}</div>`;
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
      <div class="radios col">${ms.map(m => `<label><input type="checkbox" data-m="${m.id}"${S.methods[m.id] ? ' checked' : ''}> ${esc(T('m.' + m.id))}</label>${has('mnote.' + m.id) ? `<p class="muted small mnote">${T('mnote.' + m.id)}</p>` : ''}${S.methods[m.id] ? optControls(m) : ''}`).join('')}</div>${has('fnote.' + fa.id) ? `<p class="muted small">${T('fnote.' + fa.id)}</p>` : ''}</fieldset>`; }).join('')}
    <p class="note small">${T('fam.trunc')}</p></div>`;
  if (needsLocation()) h += `<div class="card"><h2>${T('loc.h')}</h2><p class="muted">${T('loc.sub')}</p><label class="field inline"><span>${T('loc.label')}</span><input type="text" inputmode="decimal" id="atext" value="${esc(S.aText)}" size="8"></label>
    ${aFixed().bad ? `<p class="note err">${T('loc.bad')}</p>` : ''}</div>`;
  if (needsBounds()) {
    const all = S.dcol == null ? [] : D.extractUnits(S.src, { dcol: S.dcol, unit: S.unit, decimal: S.decimal, pcol: null, fcol: S.fcol, fval: S.fval, mode: 'pool' }).units.flatMap(u => u.d);
    const lo = all.length ? Math.min(...all) : null, hi = all.length ? Math.max(...all) : null;
    for (const [fam, b] of boundFams()) {
      const vals = Object.fromEntries(b.keys.map(k => [k, boundVal(k)])), bp = b.check(vals);
      const bc = b.keys.map(k => `<label class="field inline"><span>${T('bnd.' + k)}</span><input type="text" inputmode="decimal" id="b-${k}" value="${esc((S.bText || {})[k] ?? '')}" size="8"></label>`).join(' ');
      const upper = fam === 'johnsonsb' && !bp.length ? `<p class="small">${T('bnd.sbU', { u: fmtNum(vals.xi + vals.lambda, 6) })}</p>` : '';
      h += `<div class="card bndcard" id="bnd-${fam}"><h2>${T('bnd.h.' + fam)}</h2><p class="muted">${T('bnd.sub.' + fam)}</p><div class="lims">${bc}</div>${upper}
        ${lo != null ? `<p class="small">${T('bnd.obs', { lo: fmtNum(lo, 3), hi: fmtNum(hi, 3) })}</p>` : ''}${bp.length ? `<p class="note err small">${esc(T('pr.' + bp[0].code, bp[0]))}</p>` : ''}</div>`;
    }
  }
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
  el.querySelectorAll('[id^="b-"]').forEach(x => x.addEventListener('change', e => { S.bText = { ...(S.bText || {}), [x.id.slice(2)]: e.target.value }; re(); }));
  el.querySelectorAll('[data-o]').forEach(x => x.addEventListener('change', () => { const [id, k] = x.dataset.o.split('|'); (S.mopt[id] || (S.mopt[id] = {}))[k] = x.value; re(); }));
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
      const mo = methodOpts(m).opts;
      for (const o of variants) {
        const r = D.runMethod(m.id, { d: u.d, plot: u.plot === D.POOL ? null : u.plot, period: u.period }, { ...o, ...mo }), fam = D.family(r.family);
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
const resName = r => { const fx = Object.entries(r.fixed).map(([k, v]) => `${parLabel(r.family, k)} = ${f(v.value, 4)}`).join(', '); const sl = setLabel(r); return `${T('fam.' + r.family)} · ${T('m.' + r.method)}${[fx, sl].filter(Boolean).length ? ` (${[fx, sl].filter(Boolean).join('; ')})` : ''}`; };

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
  if (r.status === 'ok' && r.diagnostics && r.diagnostics.pBelowZero != null) out.push(T('dg.pBelowZero', { p: fP(r.diagnostics.pBelowZero) }));
  if (r.status === 'ok' && r.diagnostics && r.diagnostics.scale != null) out.push(T('dg.scale', { s: f(r.diagnostics.scale, 4) }));
  const mo = r.status === 'ok' && r.diagnostics && r.diagnostics.moments;                                    // log-logistic: moments that do not exist
  if (mo && !mo.meanDefined) out.push(T('dg.ll.nomean', { c: f(r.params.c, 4) }));
  else if (mo && !mo.varianceDefined) out.push(T('dg.ll.novar', { c: f(r.params.c, 4), m: f(mo.mean, 2) }));
  return out;
}
/* ---------------- exports (tables built in report.js; numbers at full precision, decimal point) ---------------- */
const stamp = () => new Date().toISOString().slice(0, 10);
const fname = (tr, en, ext) => `${lang === 'tr' ? tr : en}-${stamp()}.${ext}`;
const repH = () => ({ T, methodName, notes: notesOf, poolLabel: T('unit.pool') });
function settingsInfo() {
  const H = S.src ? S.src.headers : [], col = c => c == null ? null : String(H[c]);
  const ms = chosenMethods().map(m => { const o = methodOpts(m).opts || {}, e = Object.entries(o).filter(([, v]) => v != null && !(typeof v === 'number' && Number.isNaN(v))); return T('m.' + m.id) + ` [${T('fam.' + m.family)}]` + (e.length ? ` (${e.map(([k, v]) => `${k} = ${v}`).join(', ')})` : ''); });
  const bnd = needsBounds() ? [...boundFams()].map(([fam, b]) => `${T('fam.' + fam)}: ${b.keys.map(k => `${parLabel(fam, k)} = ${boundVal(k)}`).join(', ')}`).join('; ') : null;
  return [[T('x.tool'), `${D.TOOL.id} ${D.TOOL.version}`], [T('x.date'), new Date().toISOString()], [T('x.src'), S.imp ? S.imp.name : null],
    [T('x.dcol'), `${col(S.dcol)} (${S.unit})`], [T('x.pcol'), col(S.pcol)], [T('x.percol'), col(S.percol)], [T('x.filter'), S.fcol != null ? `${col(S.fcol)} = ${S.fval ?? ''}` : null],
    [T('x.mode'), S.pcol == null ? T('unit.pool') : T('mode.' + S.mode)], [T('x.dec'), S.decimal], [T('x.loc'), needsLocation() ? `0${aFixed().a != null && aFixed().a !== 0 ? '; ' + aFixed().a : ''}` : null], [T('x.bounds'), bnd],
    [T('x.methods'), ms.join('\n')], [T('x.acc'), `${R.acc.read} / ${R.acc.bad} / ${R.acc.nonpos}`], [T('x.badrows'), R.acc.badRows.length ? R.acc.badRows.join(', ') + (R.acc.bad + R.acc.nonpos > R.acc.badRows.length ? ', …' : '') : null],
    ['', T('x.n.ll')], ['', T('x.n.aic')], ['', T('x.n.p')], ['', T('x.n.var')], ['', T('x.n.trunc')], ['', T('x.n.num')]];
}
function exportRaw(kind) {
  const h = repH();
  if (kind === 'fits') return downloadCSV(fname('cap-dagilimi-uydurmalar', 'diameter-distribution-fits', 'csv'), REP.fitRows(R.units, h));
  if (kind === 'params') return downloadCSV(fname('cap-dagilimi-parametreler', 'diameter-distribution-parameters', 'csv'), REP.paramRows(R.units, h));
  return loadXLSX(BASE).then(XLSX => download(fname('cap-dagilimi', 'diameter-distribution', 'xlsx'), xlsxBlob(XLSX, [
    { name: T('sheet.info'), rows: REP.infoRows(settingsInfo(), T), widths: [34, 110] }, { name: T('sheet.fits'), rows: REP.fitRows(R.units, h) },
    { name: T('sheet.params'), rows: REP.paramRows(R.units, h) }, { name: T('sheet.units'), rows: REP.unitRows(R.units, h) }])), () => status(T('ex.fail'), 'err'));
}
function exportRec(kind, results, info, base) {
  const h = repH(), rows = REP.recoverRows(results, h);
  if (kind === 'csv') return downloadCSV(fname(base[0], base[1], 'csv'), rows);
  return loadXLSX(BASE).then(XLSX => download(fname(base[0], base[1], 'xlsx'), xlsxBlob(XLSX, [{ name: T('sheet.info'), rows: REP.infoRows(info, T), widths: [34, 110] }, { name: T('sheet.rec'), rows }])), () => status(T('ex.fail'), 'err'));
}
const exportButtons = (pre, kinds) => `<div class="exports">${kinds.map(([k, lab, main]) => `<button type="button" class="btn${main ? '' : ' ghost'}" id="${pre}-${k}">${T(lab)}</button>`).join('')}</div><p class="muted small">${T('ex.note')}</p>`;
function tabParams(p) {
  const u = curUnit(); if (!u) { p.innerHTML = ''; return; }
  const s = u.desc, tile = (v, l) => `<div class="tile"><b>${v}</b><span>${l}</span></div>`;
  let h = nav.bar(perSwitch(u)) + `<div class="tiles">${tile(fmtNum(s.n, 0), T('d.n'))}${tile(f(s.mean, 2), T('d.mean'))}${tile(f(s.dq, 2), T('d.dq'))}${tile(`${f(s.min, 1)}–${f(s.max, 1)}`, T('d.range'))}${tile(f(s.varN, 2), T('d.var'))}${tile(f(s.varN1, 2), T('d.var1'))}</div>`;
  for (const fa of D.families()) {
    const rs = u.results.filter(r => r.family === fa.id); if (!rs.length) continue;
    h += `<h3>${esc(T('fam.' + fa.id))}</h3><div class="tscroll"><table class="grid ptab" data-fam="${fa.id}"><thead><tr><th>${T('t.method')}</th><th>${T('t.fixed')}</th>
      ${fa.params.map(q => `<th title="${esc(T('role.' + q.role) + (q.scale === 'log' ? ', ' + T('unit.logscale') : ''))}">${esc(parHead(q))}</th>`).join('')}<th>${T('t.n')}</th><th>${T('t.ll')}</th><th>${T('t.aic')}</th><th>${T('t.bic')}</th><th>${T('t.ks')}</th><th>${T('t.ad')}</th><th>${T('t.status')}</th><th>${T('t.solver')}</th></tr></thead><tbody>
      ${rs.map(r => { const okr = r.status === 'ok', g = r.gof || {}, fx = Object.entries(r.fixed).map(([k, v]) => T('fixed.' + (v.origin === 'zero' ? 'zero' : 'user'), { k: parLabel(r.family, k), v: f(v.value, 4) })).join(', ') || T('fixed.none');
        return `<tr class="${okr ? '' : 'st-bad'}" data-method="${r.method}" data-status="${r.status}"><th>${esc(methodName(r))}</th><td>${esc(fx)}</td>${fa.params.map(q => `<td class="num">${okr ? f(r.params[q.key], 4) : '–'}</td>`).join('')}
          <td class="num">${fmtNum(r.data.n, 0)}</td><td class="num">${okr ? f(r.logLik, 3) : '–'}</td><td class="num">${g.aic != null ? f(g.aic, 2) : '–'}</td><td class="num">${g.bic != null ? f(g.bic, 2) : '–'}</td>
          <td class="num">${okr ? f(g.ks, 4) : '–'}</td><td class="num">${okr ? f(g.ad, 3) : '–'}</td><td>${T('st.' + r.status)}</td><td class="small">${esc(T('sol.' + r.convergence.solver))}${r.convergence.iter != null ? ` · ${r.convergence.iter}` : ''}</td></tr>`; }).join('')}</tbody></table></div>`;
    const notes = rs.flatMap(r => notesOf(r).map(x => `${methodName(r)}${Object.values(r.fixed).some(v => v.origin !== 'zero') ? ` (${Object.entries(r.fixed).map(([k, v]) => `${parLabel(r.family, k)} = ${f(v.value, 4)}`).join(', ')})` : ''}: ${x}`));
    if (notes.length) h += `<ul class="small notes">${[...new Set(notes)].map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
  }
  h += `<p class="muted small">${T('p.note')}</p><h3>${T('ex.h')}</h3>` + exportButtons('x', [['xlsx', 'ex.xlsx', true], ['fits', 'ex.fits'], ['params', 'ex.params'], ['json', 'p.json']]);
  p.innerHTML = h; bindBar();
  for (const k of ['xlsx', 'fits', 'params']) $('x-' + k).addEventListener('click', () => exportRaw(k));
  $('x-json').addEventListener('click', () => downloadJSON(`cap-dagilimi-sonuc-${new Date().toISOString().slice(0, 10)}.json`,
    { tool: D.TOOL, created: new Date().toISOString(), source: S.imp ? S.imp.name : null, settings: { unit: S.unit, decimal: S.decimal, mode: S.mode, fixedLocation: aFixed().a, fixedBounds: needsBounds() ? Object.fromEntries([...boundFams()].map(([fam, b]) => [fam, { ...Object.fromEntries(b.keys.map(k => [k, boundVal(k)])), origin: 'user' }])) : null, methods: Object.fromEntries(chosenMethods().map(m => [m.id, methodOpts(m).opts || null])) }, results: R.units.flatMap(x => x.results.map(({ gof, ...r }) => ({ ...r, fit: gof || null }))) }));
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

/* ---------------- separate workflow: parameters recovered from summary values (no raw diameters) ---------------- */
const recMethods = () => D.methodsFor({ kind: 'recover', dataType: 'summary' }).filter(m => !m.group);   // moment recovery (normal, lognormal, gamma); Poudel M2–M10 have their own card
const recChosen = () => recMethods().filter(m => S.sum.methods[m.id] !== false);
/** Summary from the typed fields: numbers, or null where a field is empty (the methods report what is missing). */
function summaryInput() {
  const q = S.sum, val = t => { const x = String(t ?? '').trim(); return x === '' ? null : num(x); };
  const out = { mean: val(q.mean) };
  if (q.which === 'dq') out.dq = val(q.dq); else { out.variance = val(q.v); out.varDivisor = q.div; }
  const n = val(q.n); if (n != null) out.n = n;
  return out;
}
let RS = null;
function computeRecover() { const sm = summaryInput(); RS = recChosen().map(m => D.runMethod(m.id, { type: 'summary', summary: sm })); }
function renderRecover() {
  const el = $('recover'), q = S.sum, inp = (id, v, lab) => `<label>${lab} <input type="text" inputmode="decimal" size="8" id="${id}" value="${esc(v)}"></label>`;
  let h = `<p class="note warn">${T('dev')}</p><div class="card"><h2>${T('rec.h')}</h2><p class="muted">${T('rec.sub')}</p>
    <div class="lims">${inp('s-mean', q.mean, T('rec.mean'))}</div>
    <div class="radios"><label><input type="radio" name="s-which" value="var"${q.which === 'var' ? ' checked' : ''}> ${T('rec.byvar')}</label><label><input type="radio" name="s-which" value="dq"${q.which === 'dq' ? ' checked' : ''}> ${T('rec.bydq')}</label></div>
    <div class="lims">${q.which === 'dq' ? inp('s-dq', q.dq, T('rec.dq')) : inp('s-v', q.v, T('rec.var')) + ` <span class="small">${T('opt.varDivisor')}:</span> ${['n', 'n-1'].map(v => `<label class="small"><input type="radio" name="s-div" value="${v}"${q.div === v ? ' checked' : ''}> ${T('rec.div.' + v)}</label>`).join(' ')}`}
      ${inp('s-n', q.n, q.which === 'var' && q.div === 'n-1' ? T('rec.nreq') : T('rec.nopt'))}</div>
    <p class="muted small">${T('rec.note')}</p></div>
    <div class="card"><h2>${T('rec.fam')}</h2><div class="radios col">${recMethods().map(m => `<label><input type="checkbox" data-rm="${m.id}"${S.sum.methods[m.id] !== false ? ' checked' : ''}> ${esc(T('fam.' + m.family))}: ${esc(T('m.' + m.id))}</label>${has('mnote.' + m.id) ? `<p class="muted small mnote">${T('mnote.' + m.id)}</p>` : ''}`).join('')}</div></div>
    <div class="nav"><button type="button" class="btn" id="s-calc"${recChosen().length ? '' : ' disabled'}>${T('calc')}</button>${recChosen().length ? '' : `<span class="muted small">${T('fam.need')}</span>`}</div><div id="s-out"></div>
    <div id="wb"></div><div id="prs"></div>`;
  el.innerHTML = h;
  renderWb(); renderPrs();
  const re = () => { S.sum.done = false; RS = null; save(); renderRecover(); };
  for (const [id, k] of [['s-mean', 'mean'], ['s-v', 'v'], ['s-dq', 'dq'], ['s-n', 'n']]) $(id) && $(id).addEventListener('change', e => { S.sum[k] = e.target.value; re(); });
  el.querySelectorAll('input[name="s-which"]').forEach(x => x.addEventListener('change', () => { S.sum.which = x.value; re(); }));
  el.querySelectorAll('input[name="s-div"]').forEach(x => x.addEventListener('change', () => { S.sum.div = x.value; re(); }));
  el.querySelectorAll('[data-rm]').forEach(x => x.addEventListener('change', () => { S.sum.methods[x.dataset.rm] = x.checked; re(); }));
  $('s-calc').addEventListener('click', () => { S.sum.done = true; save(); computeRecover(); drawRecover(); });
  if (q.done) { computeRecover(); drawRecover(); }
}
function drawRecover() {
  const out = $('s-out'); if (!out || !RS) return;
  const okR = RS.filter(r => r.status === 'ok'), t0 = RS.find(r => r.targets) || null;
  let h = `<div class="tscroll"><table class="grid rtab"><thead><tr><th>${T('t.dist')}</th><th>${T('t.params')}</th><th>${T('rec.back.mean')}</th><th>${T('rec.back.dq')}</th><th>${T('rec.back.var')}</th><th>${T('rec.pneg')}</th><th>${T('t.status')}</th></tr></thead><tbody>
    ${RS.map(r => { const fam = D.family(r.family), okr = r.status === 'ok', g = r.diagnostics || {};
      return `<tr data-method="${r.method}" data-status="${r.status}" class="${okr ? '' : 'st-bad'}"><th>${esc(T('fam.' + r.family))}</th><td class="num">${okr ? fam.params.map(q => `<span style="white-space:nowrap">${esc(q.label ?? q.key)} = ${f(r.params[q.key], 6)}</span>`).join('<br>') : '–'}</td>
        <td class="num">${okr ? f(g.backMean, 4) : '–'}</td><td class="num">${okr ? f(g.backDq, 4) : '–'}</td><td class="num">${okr ? f(g.backVariance, 4) : '–'}</td><td class="num">${okr && g.pBelowZero != null ? fP(g.pBelowZero) : '–'}</td>
        <td>${T('st.' + r.status)}${okr ? '' : `: ${esc(r.problems.map(p => T('pr.' + p.code, p)).join('; '))}`}</td></tr>`; }).join('')}</tbody></table></div>`;
  if (t0) h += `<p class="small">${T('rec.used', { m: f(t0.targets.mean, 4), v: f(t0.targets.variance, 4), dq: f(t0.targets.dq, 4), src: T('rec.src.' + t0.targets.source + (t0.targets.varDivisor === 'n-1' ? '1' : '')) })}</p>`;
  h += `<p class="muted small">${T('rec.p.note')}</p>`;
  if (okR.length) {
    const lo = Math.min(...okR.map(r => D.family(r.family).quantile(0.0005, r.params))), hi = Math.max(...okR.map(r => D.family(r.family).quantile(0.9995, r.params)));
    const xmin = Math.max(0, lo), xmax = hi, xs = Array.from({ length: 401 }, (_, i) => xmin + (xmax - xmin) * i / 400);
    h += `<figure class="chartbox" id="ch-r">${plotChart({ title: T('rec.chart'), xmin, xmax, lines: okR.map((r, i) => ({ name: T('fam.' + r.family), k: i, pts: xs.map(x => [x, D.family(r.family).pdf(x, r.params)]) })), xLabel: T('ch.d'), yLabel: T('ch.dens'), fmt: v => fmtNum(v, 3) })}
      <figcaption><button type="button" class="btn ghost small" id="ch-r-svg">${T('ch.svg')}</button></figcaption></figure>`;
  }
  h += exportButtons('s', [['xlsx', 'ex.rxlsx', true], ['csv', 'ex.rcsv'], ['json', 'p.json']]);
  out.innerHTML = h;
  const sInfo = () => [[T('x.tool'), `${D.TOOL.id} ${D.TOOL.version}`], [T('x.date'), new Date().toISOString()], ...Object.entries(summaryInput()).map(([k, v]) => [T('x.in', { k }), v]), ['', T('rec.p.note')], ['', T('x.n.num')]];
  for (const k of ['xlsx', 'csv']) $('s-' + k).addEventListener('click', () => exportRec(k, RS, sInfo(), ['cap-dagilimi-geri-kazanim', 'diameter-distribution-recovery']));
  $('ch-r-svg') && $('ch-r-svg').addEventListener('click', () => download('geri-kazanim.svg', svgForDownload($('ch-r').querySelector('svg')), 'image/svg+xml'));
  $('s-json').addEventListener('click', () => downloadJSON(`cap-dagilimi-geri-kazanim-${new Date().toISOString().slice(0, 10)}.json`, { tool: D.TOOL, created: new Date().toISOString(), summary: summaryInput(), results: RS }));
}

/* ---------------- Weibull recovery, Poudel and Cao (2013) M2–M10: targets typed, predicted, or computed from loaded data ---------------- */
const wbMethods = () => D.methodsFor({ family: 'weibull', kind: 'recover' });
const wbOn = m => S.wb.methods[m.id] ?? !m.hybrid;                   // hybrids (M6–M10) start unchecked: extra inputs, often several roots
const wbChosen = () => wbMethods().filter(wbOn);
const WB_FIELDS = ['mean', 'dq', 'variance', 'q25', 'q31', 'q63', 'q50', 'q95'];
const wbKey = k => k === 'variance' ? 'v' : k;
/** Raw-data units available for "compute from data" (same column settings as the direct-fit workflow). */
function wbUnits() {
  if (!S.src || S.dcol == null) return [];
  try { return D.extractUnits(S.src, { dcol: S.dcol, unit: S.unit, decimal: S.decimal, pcol: S.pcol, percol: S.percol, fcol: S.fcol, fval: S.fval, mode: S.mode }).units.filter(u => u.d.length >= 2); } catch (e) { return []; }
}
function wbSummary() {
  const q = S.wb, val = t => { const x = String(t ?? '').trim(); return x === '' ? null : num(x); }, need = new Set(wbChosen().flatMap(m => m.needs)), out = { origin: q.origin };
  for (const k of WB_FIELDS) if (need.has(k)) { const v = val(q[wbKey(k)]); if (v != null) out[k] = v; }
  if (need.has('variance')) out.varDivisor = q.div;
  const n = val(q.n); if (n != null) out.n = n;
  if (q.loc === 'half-dmin' || need.has('dmin')) { const v = val(q.dmin); if (v != null) out.dmin = v; }   // Dmin: source location policy and/or M10
  if (q.from) { out.from = 'raw'; out.quantile = 'type7'; out.unit = q.from; }
  return out;
}
const wbOpts = () => S.wb.loc === 'user' ? { loc: 'user', a: (t => t === '' ? NaN : num(t))(String(S.wb.a).trim()) } : { loc: 'half-dmin' };
let RW = null;
function computeWb() { const sm = wbSummary(), o = wbOpts(); RW = wbChosen().map(m => D.runMethod(m.id, { type: 'summary', summary: sm }, o)); }
let wbBusy = false;
function renderWb() {
  const el = $('wb'); if (!el || wbBusy) return;
  wbBusy = true;
  try {
    // a focused field that is about to be replaced fires its own change event on blur: let it update the state first
    if (el.contains(document.activeElement)) document.activeElement.blur();
    drawWbCard(el);
  } finally { wbBusy = false; }
  if (S.wb.done) { computeWb(); drawWb(); }
}
function drawWbCard(el) {
  const q = S.wb, need = new Set(wbChosen().flatMap(m => m.needs)), inp = (id, v, lab) => `<label>${lab} <input type="text" inputmode="decimal" size="9" id="${id}" value="${esc(v)}"></label>`;
  const us = wbUnits(), fields = WB_FIELDS.filter(k => need.has(k)).map(k => inp('w-' + wbKey(k), q[wbKey(k)], T('wb.f.' + k))).join(' ')
    + (need.has('dmin') && q.loc !== 'half-dmin' ? ' ' + inp('w-dmin', q.dmin, T('wb.dmin')) : '') + (need.has('n') && !need.has('variance') ? ' ' + inp('w-n', q.n, T('wb.f.n')) : '');
  const varCtl = need.has('variance') ? `<div class="lims"><span class="small">${T('opt.varDivisor')}:</span> ${['n', 'n-1'].map(v => `<label class="small"><input type="radio" name="w-div" value="${v}"${q.div === v ? ' checked' : ''}> ${T('rec.div.' + v)}</label>`).join(' ')}
    ${inp('w-n', q.n, q.div === 'n-1' ? T('rec.nreq') : T('rec.nopt'))}</div>` : '';
  let h = `<div class="card" id="wbcard"><h2>${T('wb.h')}</h2><p class="muted">${T('wb.sub')}</p>
    <div class="radios col">${wbMethods().map(m => `<label><input type="checkbox" data-wm="${m.id}"${wbOn(m) ? ' checked' : ''}> ${esc(T('m.' + m.id))}</label><p class="muted small mnote">${T('mnote.' + m.id)}</p>`).join('')}</div>
    <h3>${T('wb.loc.h')}</h3><div class="radios col">${['half-dmin', 'user'].map(v => `<label><input type="radio" name="w-loc" value="${v}"${q.loc === v ? ' checked' : ''}> ${T('wb.loc.' + v)}</label>`).join('')}</div>
    <div class="lims">${q.loc === 'half-dmin' ? inp('w-dmin', q.dmin, T('wb.dmin')) : inp('w-a', q.a, T('wb.a'))}</div>
    ${q.loc === 'half-dmin' ? `<p class="muted small">${T('wb.dmin.note')}</p>` : `<p class="muted small">${T('wb.a.note')}</p>`}
    <h3>${T('wb.t.h')}</h3><div class="radios">${['measured', 'predicted'].map(v => `<label><input type="radio" name="w-origin" value="${v}"${q.origin === v ? ' checked' : ''}> ${T('wb.origin.' + v)}</label>`).join('')}</div>
    ${need.size ? `<div class="lims">${fields}</div>${varCtl}` : ''}
    ${q.from ? `<p class="note small" id="w-from">${esc(T('wb.from', { u: q.from.label, n: fmtNum(q.from.n, 0) }))}</p>` : ''}
    <details class="wbfill"><summary>${T('wb.fill.h')}</summary><p class="muted small">${T('wb.fill.sub')}</p>
      ${us.length ? `<div class="lims"><label>${T('wb.fill.unit')} <select id="w-unit">${us.map((u, i) => `<option value="${i}"${+q.unit === i ? ' selected' : ''}>${esc(unitLabel(u))} (n = ${u.d.length})</option>`).join('')}</select></label>
        <button type="button" class="btn ghost small" id="w-fill">${T('wb.fill.btn')}</button></div>` : `<p class="small">${T('wb.fill.none')}</p>`}</details>
    <div class="nav"><button type="button" class="btn" id="w-calc"${wbChosen().length ? '' : ' disabled'}>${T('calc')}</button>${wbChosen().length ? '' : `<span class="muted small">${T('fam.need')}</span>`}</div><div id="w-out"></div></div>`;
  el.innerHTML = h;
  const re = (keepFrom = true) => { if (!keepFrom) q.from = null; q.done = false; RW = null; save(); renderWb(); };
  for (const k of [...WB_FIELDS.map(wbKey), 'n', 'dmin']) $('w-' + k) && $('w-' + k).addEventListener('change', e => { q[k] = e.target.value; re(false); });   // a changed target is typed, no longer computed from data
  $('w-a') && $('w-a').addEventListener('change', e => { q.a = e.target.value; re(); });
  el.querySelectorAll('input[name="w-div"]').forEach(x => x.addEventListener('change', () => { q.div = x.value; re(false); }));
  el.querySelectorAll('input[name="w-loc"]').forEach(x => x.addEventListener('change', () => { q.loc = x.value; re(); }));
  el.querySelectorAll('input[name="w-origin"]').forEach(x => x.addEventListener('change', () => { q.origin = x.value; if (x.value === 'predicted') q.from = null; re(); }));
  el.querySelectorAll('[data-wm]').forEach(x => x.addEventListener('change', () => { q.methods[x.dataset.wm] = x.checked; re(); }));
  $('w-unit') && $('w-unit').addEventListener('change', e => { q.unit = +e.target.value; save(); });
  $('w-fill') && $('w-fill').addEventListener('click', () => {
    const u = us[+q.unit] || us[0], s = D.weibullSummary(u.d);
    Object.assign(q, { mean: String(s.mean), v: String(s.variance), div: 'n', n: String(s.n), dq: String(s.dq), q25: String(s.q25), q31: String(s.q31), q63: String(s.q63), q50: String(s.q50), q95: String(s.q95), dmin: String(s.dmin), origin: 'measured',
      from: { label: unitLabel(u), plot: u.plot === D.POOL ? null : u.plot, period: u.period ?? null, n: s.n } });
    re();
  });
  $('w-calc').addEventListener('click', () => { q.done = true; save(); computeWb(); drawWb(); });
}
const WB_LAB = { mean: 'wb.k.mean', variance: 'wb.k.variance', dq: 'wb.k.dq', q25: 'wb.k.q25', q31: 'wb.k.q31', q63: 'wb.k.q63', q50: 'wb.k.q50', q95: 'wb.k.q95', dmin: 'wb.k.dmin', n: 'wb.k.n' };
const WB_BACK = { mean: 'backMean', variance: 'backVariance', dq: 'backDq', q25: 'backQ25', q31: 'backQ31', q63: 'backQ63', q50: 'backQ50', q95: 'backQ95' };
function drawWb() {
  const out = $('w-out'); if (!out || !RW) return;
  const okR = RW.filter(r => r.status === 'ok'), m = id => D.method(id);
  const locCell = r => { const a = r.fixed.a; return !a ? '–' : a.policy === 'half-dmin' ? T('wb.fx.half', { a: f(a.value, 4), d: f(a.dmin, 4) }) : a.policy === 'm10' ? T('wb.fx.m10', { a: f(a.value, 4), d: f(a.dmin, 4), n: a.n }) : T('wb.fx.user', { a: f(a.value, 4) }); };
  let h = `<div class="tscroll"><table class="grid wtab"><thead><tr><th>${T('t.method')}</th><th>${T('wb.t.loc')}</th><th>b (cm)</th><th>c</th><th>${T('wb.t.targets')}</th><th>${T('t.status')}</th><th>${T('t.solver')}</th></tr></thead><tbody>
    ${RW.map(r => { const okr = r.status === 'ok', g = r.diagnostics || {}, tg = r.targets || {};
      const ex = m(r.method).exact || [], tcell = m(r.method).needs.map(k => `<span style="white-space:nowrap">${T(WB_LAB[k])}: ${k === 'n' ? fmtNum(tg[k], 0) : f(tg[k], 4)}${okr && WB_BACK[k] ? ` → ${f(g[WB_BACK[k]], 4)}${m(r.method).hybrid && !ex.includes(k) ? ' *' : ''}` : ''}</span>`).join('<br>');
      const why = [...(r.problems || []).map(p => T('pr.' + p.code, { ...p, key: p.key ? T(WB_LAB[p.key]) : p.key })), ...(r.warnings || []).map(w => T('w.' + w.code, w))].join('; ');
      const cands = r.status === 'multiple' ? `<br><span class="small">${(g.candidates || []).map(c => `b = ${f(c.b, 4)}, c = ${f(c.c, 4)}`).join('; ')}</span>` : '';
      return `<tr data-method="${r.method}" data-status="${r.status}" class="${okr ? '' : 'st-bad'}"><th>${esc(T('m.' + r.method))}</th><td>${esc(locCell(r))}</td><td class="num">${okr ? f(r.params.b, 6) : '–'}</td><td class="num">${okr ? f(r.params.c, 6) : '–'}</td>
        <td class="num small">${tcell}</td><td>${T('st.' + r.status)}${why ? `: ${esc(why)}` : ''}${cands}</td><td class="small">${esc(T('sol.' + r.convergence.solver))}${r.convergence.roots != null ? ` · ${T('wb.roots', { k: r.convergence.roots, lo: fmtNum(r.convergence.interval[0], 2), hi: fmtNum(r.convergence.interval[1], 0) })}` : ''}</td></tr>`; }).join('')}</tbody></table></div>`;
  const t0 = RW[0] && RW[0].targets;
  if (t0) h += `<p class="small">${T('wb.used', { o: T('wb.origin.' + t0.origin), src: t0.from === 'raw' ? T('wb.src.raw') : T('wb.src.typed'), div: t0.varDivisor ? T('rec.src.variance' + (t0.varDivisor === 'n-1' ? '1' : '')) : null })}</p>`;
  h += `<p class="muted small">${T('wb.p.note')}</p>${RW.some(r => D.method(r.method).hybrid) ? `<p class="muted small">${T('wb.hybrid.note')}</p>` : ''}`;
  if (okR.length) {
    const lo = Math.min(...okR.map(r => D.family('weibull').quantile(0.0005, r.params))), hi = Math.max(...okR.map(r => D.family('weibull').quantile(0.9995, r.params)));
    const xmin = Math.max(0, lo - (hi - lo) * 0.03), xmax = hi, xs = Array.from({ length: 401 }, (_, i) => xmin + (xmax - xmin) * i / 400);
    h += `<figure class="chartbox" id="ch-w">${plotChart({ title: T('wb.chart'), xmin, xmax, lines: okR.map((r, i) => ({ name: T('m.' + r.method), k: i, pts: xs.map(x => [x, D.family('weibull').pdf(x, r.params)]) })), xLabel: T('ch.d'), yLabel: T('ch.dens'), fmt: v => fmtNum(v, 3) })}
      <figcaption><button type="button" class="btn ghost small" id="ch-w-svg">${T('ch.svg')}</button></figcaption></figure>`;
  }
  h += exportButtons('w', [['xlsx', 'ex.rxlsx', true], ['csv', 'ex.rcsv'], ['json', 'p.json']]);
  out.innerHTML = h;
  const wInfo = () => [[T('x.tool'), `${D.TOOL.id} ${D.TOOL.version}`], [T('x.date'), new Date().toISOString()], ...Object.entries(wbSummary()).filter(([k]) => k !== 'unit').map(([k, v]) => [T('x.in', { k }), v]),
    ...Object.entries(wbOpts()).map(([k, v]) => [T('x.in', { k }), v]), S.wb.from ? [T('x.in', { k: 'unit' }), S.wb.from.label] : null, ['', T('wb.p.note')], ['', T('x.n.num')]];
  for (const k of ['xlsx', 'csv']) $('w-' + k).addEventListener('click', () => exportRec(k, RW, wInfo(), ['cap-dagilimi-weibull-geri-kazanim', 'diameter-distribution-weibull-recovery']));
  $('ch-w-svg') && $('ch-w-svg').addEventListener('click', () => download('weibull-geri-kazanim.svg', svgForDownload($('ch-w').querySelector('svg')), 'image/svg+xml'));
  $('w-json').addEventListener('click', () => downloadJSON(`cap-dagilimi-weibull-geri-kazanim-${new Date().toISOString().slice(0, 10)}.json`, { tool: D.TOOL, created: new Date().toISOString(), summary: wbSummary(), location: wbOpts(), results: RW }));
}
/* ---------------- Johnson SB recovery, Parresol (2003): ξ fixed, λ, γ, δ recovered ---------------- */
function prsSummary() {
  const q = S.prs, val = t => { const x = String(t ?? '').trim(); return x === '' ? null : num(x); }, out = { origin: q.origin };
  for (const k of ['xi', 'mean', 'median']) { const v = val(q[k]); if (v != null) out[k] = v; }
  if (q.qmode !== 'dq') { const n = val(q.nha), g = val(q.g); if (n != null) out.nha = n; if (g != null) out.g = g; if (n == null && g == null) { out.nha = null; } }
  if (q.qmode !== 'ng') { const d = val(q.dq); if (d != null) out.dq = d; }
  if (out.nha === null) delete out.nha;
  if (q.from) { out.from = 'raw'; out.unit = q.from.label; }
  return out;
}
let RP = null, prsBusy = false;
function renderPrs() {
  const el = $('prs'); if (!el || prsBusy) return;
  prsBusy = true;
  try { if (el.contains(document.activeElement)) document.activeElement.blur(); drawPrsCard(el); } finally { prsBusy = false; }
  if (S.prs.done) { RP = [D.runMethod('johnsonsb.parresol', { type: 'summary', summary: prsSummary() })]; drawPrs(); }
}
function drawPrsCard(el) {
  const q = S.prs, us = wbUnits(), inp = (id, v, lab) => `<label>${lab} <input type="text" inputmode="decimal" size="9" id="${id}" value="${esc(v)}"></label>`;
  el.innerHTML = `<div class="card" id="prscard"><h2>${T('prs.h')}</h2><p class="muted">${T('prs.sub')}</p>
    <div class="lims">${inp('p-xi', q.xi, T('prs.f.xi'))} ${inp('p-mean', q.mean, T('wb.f.mean'))} ${inp('p-median', q.median, T('prs.f.median'))}</div>
    <h3>${T('prs.q.h')}</h3><div class="radios">${['ng', 'dq', 'both'].map(v => `<label><input type="radio" name="p-qmode" value="${v}"${q.qmode === v ? ' checked' : ''}> ${T('prs.q.' + v)}</label>`).join('')}</div>
    <div class="lims">${q.qmode !== 'dq' ? inp('p-nha', q.nha, T('prs.f.nha')) + ' ' + inp('p-g', q.g, T('prs.f.g')) : ''} ${q.qmode !== 'ng' ? inp('p-dq', q.dq, T('wb.f.dq')) : ''}</div>
    <p class="muted small">${T('prs.q.note')}</p>
    <h3>${T('wb.t.h')}</h3><div class="radios">${['measured', 'predicted'].map(v => `<label><input type="radio" name="p-origin" value="${v}"${q.origin === v ? ' checked' : ''}> ${T('wb.origin.' + v)}</label>`).join('')}</div>
    ${q.from ? `<p class="note small" id="p-from">${esc(T('prs.from', { u: q.from.label, n: fmtNum(q.from.n, 0) }))}</p>` : ''}
    <details class="wbfill"><summary>${T('prs.fill.h')}</summary><p class="muted small">${T('prs.fill.sub')}</p>
      ${us.length ? `<div class="lims"><label>${T('wb.fill.unit')} <select id="p-unit">${us.map((u, i) => `<option value="${i}"${+q.unit === i ? ' selected' : ''}>${esc(unitLabel(u))} (n = ${u.d.length})</option>`).join('')}</select></label>
        <button type="button" class="btn ghost small" id="p-fill">${T('wb.fill.btn')}</button></div>` : `<p class="small">${T('wb.fill.none')}</p>`}</details>
    <div class="nav"><button type="button" class="btn" id="p-calc">${T('calc')}</button></div><div id="p-out"></div></div>`;
  const re = (keepFrom = true) => { if (!keepFrom) q.from = null; q.done = false; RP = null; save(); renderPrs(); };
  for (const k of ['mean', 'median', 'nha', 'g', 'dq']) $('p-' + k) && $('p-' + k).addEventListener('change', e => { q[k] = e.target.value; re(false); });
  $('p-xi').addEventListener('change', e => { q.xi = e.target.value; re(); });
  el.querySelectorAll('input[name="p-qmode"]').forEach(x => x.addEventListener('change', () => { q.qmode = x.value; re(); }));
  el.querySelectorAll('input[name="p-origin"]').forEach(x => x.addEventListener('change', () => { q.origin = x.value; if (x.value === 'predicted') q.from = null; re(); }));
  $('p-unit') && $('p-unit').addEventListener('change', e => { q.unit = +e.target.value; save(); });
  $('p-fill') && $('p-fill').addEventListener('click', () => {                 // mean, median (type 7), Dq from the loaded diameters; N, G are not in tree data
    const u = us[+q.unit] || us[0], s = D.describe(u.d), srt = [...u.d].sort((a, b) => a - b);
    Object.assign(q, { mean: String(s.mean), median: String(D.quantile7(srt, 0.5)), dq: String(s.dq), qmode: 'dq', origin: 'measured', from: { label: unitLabel(u), n: s.n } });
    re();
  });
  $('p-calc').addEventListener('click', () => { q.done = true; save(); renderPrs(); });
}
function drawPrs() {
  const out = $('p-out'); if (!out || !RP) return;
  const r = RP[0], okr = r.status === 'ok', g = r.diagnostics || {}, tg = r.targets || {}, fam = D.family('johnsonsb');
  const why = [...(r.problems || []).map(p => T('pr.' + p.code, { ...p, key: p.key ? T('prs.k.' + p.key) : p.key })), ...(r.warnings || []).map(w => T('w.' + w.code, w))].join('; ');
  const cands = r.status === 'multiple' ? (g.candidates || []).map(c => fam.params.map(q => `${q.label} = ${f(c[q.key], 4)}`).join(', ')).join(' | ') : '';
  const back = okr ? [['mean', 'backMean'], ['median', 'backMedian'], ['dq', 'backDq']].map(([k, b]) => `<span style="white-space:nowrap">${T('prs.k.' + k)}: ${f(tg[k], 4)} → ${f(g[b], 4)}</span>`).join('<br>') : '–';
  let h = `<div class="tscroll"><table class="grid ptab prtab"><thead><tr><th>${T('t.method')}</th>${fam.params.map(q => `<th>${esc(parHead(q))}</th>`).join('')}<th>${T('wb.t.targets')}</th><th>${T('t.status')}</th><th>${T('t.solver')}</th></tr></thead><tbody>
    <tr data-method="${r.method}" data-status="${r.status}" class="${okr ? '' : 'st-bad'}"><th>${esc(T('m.' + r.method))}</th>${fam.params.map(q => `<td class="num">${okr ? f(r.params[q.key], 6) : q.key === 'xi' && tg.xi != null ? f(tg.xi, 4) : '–'}</td>`).join('')}
      <td class="num small">${back}</td><td>${T('st.' + r.status)}${why ? `: ${esc(why)}` : ''}${cands ? `<br><span class="small">${esc(cands)}</span>` : ''}</td>
      <td class="small">${esc(T('sol.newton'))}${r.convergence && r.convergence.starts ? ` · ${T('prs.starts', { k: r.convergence.starts, s: r.convergence.solutions })}` : ''}</td></tr></tbody></table></div>`;
  if (tg.dq != null) h += `<p class="small">${T('prs.used', { dq: f(tg.dq, 4), src: T('prs.src.' + tg.source), ng: tg.dqNG != null ? f(tg.dqNG, 4) : '–' })}</p>`;
  h += `<p class="muted small">${T('prs.p.note')}</p>`;
  if (okr) {
    const xmin = r.params.xi, xmax = r.params.xi + r.params.lambda, xs = Array.from({ length: 401 }, (_, i) => xmin + (xmax - xmin) * (i + 0.5) / 401);
    h += `<figure class="chartbox" id="ch-p">${plotChart({ title: T('prs.chart'), xmin, xmax, lines: [{ name: T('fam.johnsonsb'), k: 0, pts: xs.map(x => [x, fam.pdf(x, r.params)]) }], xLabel: T('ch.d'), yLabel: T('ch.dens'), fmt: v => fmtNum(v, 3) })}
      <figcaption><button type="button" class="btn ghost small" id="ch-p-svg">${T('ch.svg')}</button></figcaption></figure>`;
  }
  h += exportButtons('p', [['xlsx', 'ex.rxlsx', true], ['csv', 'ex.rcsv'], ['json', 'p.json']]);
  out.innerHTML = h;
  $('ch-p-svg') && $('ch-p-svg').addEventListener('click', () => download('johnson-sb-parresol.svg', svgForDownload($('ch-p').querySelector('svg')), 'image/svg+xml'));
  const pInfo = () => [[T('x.tool'), `${D.TOOL.id} ${D.TOOL.version}`], [T('x.date'), new Date().toISOString()], ...Object.entries(prsSummary()).map(([k, v]) => [T('x.in', { k }), v]), ['', T('prs.p.note')], ['', T('x.n.num')]];
  for (const k of ['xlsx', 'csv']) $('p-' + k).addEventListener('click', () => exportRec(k, RP, pInfo(), ['cap-dagilimi-johnson-sb-parresol', 'diameter-distribution-johnson-sb-parresol']));
  $('p-json').addEventListener('click', () => downloadJSON(`cap-dagilimi-johnson-sb-parresol-${stamp()}.json`, { tool: D.TOOL, created: new Date().toISOString(), summary: prsSummary(), results: RP }));
}
function renderWf() {
  $('wf').innerHTML = `<div class="tabs wftabs" role="tablist" aria-label="${esc(T('wf.label'))}">${['raw', 'summary'].map(w => `<button type="button" role="tab" id="wf-${w}" aria-selected="${S.wf === w}" data-wf="${w}">${T('wf.' + w)}</button>`).join('')}</div>`;
  $('wf').querySelectorAll('[data-wf]').forEach(b => b.addEventListener('click', () => { S.wf = b.dataset.wf; save(); render(); }));
}

/* ---------------- shell ---------------- */
function canGo(n) { if (n <= 1) return true; if (!S.src) return false; if (n === 2) return true; return !settingsProblems().length; }
function go(n) { if (!canGo(n)) return; S.step = n; save(); render(); scrollTo({ top: $('steps').offsetTop - 8, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
function renderSteps() {
  $('steps').innerHTML = `<ol class="n3">${[1, 2, 3].map(n => `<li><button type="button" data-go="${n}"${S.step === n ? ' aria-current="step"' : ''}${canGo(n) ? '' : ' disabled'}><b>${n}</b> ${T('step.' + n)}</button></li>`).join('')}</ol>`;
  $('steps').querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(+b.dataset.go)));
}
function render() {
  renderWf();
  const sum = S.wf === 'summary';
  $('recover').hidden = !sum; $('steps').hidden = sum;
  if (sum) { for (const n of [1, 2, 3]) $('step' + n).hidden = true; renderRecover(); return; }
  if (!canGo(S.step)) S.step = [3, 2, 1].find(canGo);
  renderSteps();
  for (const n of [1, 2, 3]) $('step' + n).hidden = S.step !== n;
  ({ 1: renderStep1, 2: renderStep2, 3: renderStep3 })[S.step]();
}
(async function init() {
  $('privacy').textContent = T('privacy');
  try { const saved = await get(KEY); if (saved && saved.v === 1) { S = { ...blank(), ...saved, sum: { ...blank().sum, ...(saved.sum || {}) }, wb: { ...blank().wb, ...(saved.wb || {}) }, prs: { ...blank().prs, ...(saved.prs || {}) } }; status(T('restored', { when: new Date(saved.saved).toLocaleString(LOC) })); } } catch (e) { S = blank(); }
  render();
})();
