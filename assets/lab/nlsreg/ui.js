// Nonlinear regression (SM-02): user interface. All arithmetic in calc.js and core/expr.js (tested in tests/nlsreg/);
// fit measures from the Model Evaluation tool's own function.
import * as NL from './calc.js';
import { T } from './i18n.js';
import { lang, fmtNum, esc } from '../core/i18n.js';
import { put, get, del, autosave } from '../core/store.js';
import { saveCoef, blankSet } from '../core/coef.js';
import { parse } from '../core/expr.js';
import { renderImport, readImport } from '../core/importer.js';
import { cellText } from '../core/table.js';
import { parseNumber, detectDecimal, defaultDecimal } from '../core/num.js';
import { download, downloadCSV, xlsxBlob, loadXLSX } from '../core/export.js';
import { scatterChart } from '../core/chart.js';
import { downloadRecord, recordOption } from '../core/record-ui.js';
import { buildR } from './rcode.js';
import { tableCsv, csvName } from '../core/rcode.js';

const BASE = './', KEY = 'session:' + NL.TOOL.id, LOC = 'en-GB', $ = id => document.getElementById(id);
const f = (x, d = 4) => x == null || !Number.isFinite(x) ? '–' : fmtNum(x, d);
function sig(x) { return x == null || !Number.isFinite(x) ? '–' : x === 0 ? '0' : Math.abs(x) >= 1e-4 && Math.abs(x) < 1e6 ? fmtNum(Number(x.toPrecision(7)), 14) : x.toExponential(6); }
const num = t => { const r = parseNumber(String(t ?? '').trim(), '.'); return r.status === 'ok' ? r.value : NaN; };
let S = blank(), R = null;
function blank() { return { v: 1, step: 1, tbl: null, y: null, models: [newModel()], cit: '', sp: '', saveIdx: 0, units: {}, ivIdx: 0, iv: {} }; }
function newModel() { return { kind: 'ready', ready: 'cr', expr: '', map: {}, starts: {}, w: { kind: 'none', col: null, theta: '' } }; }
const AS = autosave(KEY, () => ({ ...S, saved: new Date().toISOString() }));
function save() { AS.save(); }
function flush() { return AS.flush(); }
function status(m, k = '') { const s = $('status'); s.className = 'status ' + k; s.textContent = m || ''; }
const headers = () => S.tbl && S.tbl.src ? S.tbl.src.headers.map(h => String(h)) : [];
const colName = c => c == null ? '–' : headers()[c] ?? '–';
const mLabel = i => T('m.label', { i: i + 1 });

/* ---------------- step 1: data ---------------- */
function setTable(st) {
  if (!st.src) { S.tbl = null; save(); renderStep1(); return; }
  S.tbl = { imp: st.imp, src: st.src, decimal: null, decChosen: false }; S.y = null; R = null;
  status(''); save(); renderStep1();
}
function dataRows() {
  const t = S.tbl, src = t.src;
  return src.rows.map((r, i) => ({ row: src.rowNumbers[i], vals: src.headers.map((_, c) => { const x = r[c]; if (x && x.t === 'n') return x.v; const p = parseNumber(cellText(x), t.decimal || '.'); return p.status === 'ok' ? p.value : null; }) }));
}
function renderStep1() {
  const el = $('step1'), t = S.tbl;
  let h = `<div id="tblbox"></div>`;
  if (t && t.src) {
    const dv = detectDecimal(t.src.rows.flatMap(r => r.filter(x => x && x.t === 's').map(x => x.v)).slice(0, 4000));
    if (!t.decChosen) t.decimal = defaultDecimal(dv.verdict);
    h += `<div class="card"><p class="note ok" id="dsinfo">${esc(T('tb.info', { name: t.imp ? t.imp.name : '', n: t.src.rows.length, c: t.src.headers.length }))}</p>
      <div class="radios"><span class="small">${T('dec.h')}:</span> <label class="small"><input type="radio" name="tdec" value="."${t.decimal === '.' ? ' checked' : ''}> ${T('dec.dot')}</label><label class="small"><input type="radio" name="tdec" value=","${t.decimal === ',' ? ' checked' : ''}> ${T('dec.comma')}</label></div></div>`;
  }
  h += `<div class="card"><p><button type="button" class="btn ghost" id="sample">${T('sample')}</button> <span class="muted small">${T('sample.note')}</span></p></div>
    <div class="nav"><button type="button" class="btn ghost" id="reset">${T('reset')}</button><button type="button" class="btn" id="to2"${t && t.src ? '' : ' disabled'}>${T('next')}</button>${t && t.src ? '' : `<span class="muted small">${T('need.data')}</span>`}</div>`;
  el.innerHTML = h;
  renderImport($('tblbox'), { imp: t && t.imp, src: t && t.src }, { base: BASE, title: T('tb.h'), sub: T('tb.sub'), onChange: setTable, onError: m => status(m, 'err') });
  el.querySelectorAll('input[name="tdec"]').forEach(x => x.addEventListener('change', () => { S.tbl.decimal = x.value; S.tbl.decChosen = true; R = null; save(); }));
  $('sample').addEventListener('click', async () => {
    const buf = await (await fetch(BASE + 'assets/lab/nlsreg/ornek/ornek-nls.csv')).arrayBuffer();
    const imp = { kind: 'csv', name: 'ornek-nls.csv (simulated)', buf, encoding: 'utf-8', delim: null, header: true, sheet: null };
    setTable({ imp, src: await readImport(imp, BASE) }); S.tbl.decimal = ','; S.tbl.decChosen = true;
    const H = headers().map(x => x.toLowerCase()); S.y = H.indexOf('h_m') >= 0 ? H.indexOf('h_m') : null;
    S.models = [{ ...newModel(), ready: 'cr', map: { x: H.indexOf('d_cm') } }, { ...newModel(), kind: 'formula', expr: '1.3 + b0*(1-exp(-b1*D))^b2', map: { D: H.indexOf('d_cm') }, starts: { b0: '30', b1: '0.03', b2: '1' } }];
    save(); renderStep1();
  });
  $('reset').addEventListener('click', async () => { S = blank(); R = null; status(''); render(); await del(KEY); });
  $('to2').addEventListener('click', () => go(2));
}

/* ---------------- step 2: models ---------------- */
/** The model's definition and compiled form, or the problems that keep it from being fitted. */
function modelOf(md, i) {
  const m = mLabel(i), probs = [];
  let def;
  if (md.kind === 'ready') {
    const R0 = NL.READY[md.ready]; for (const v of R0.vars) if (md.map[v] == null || md.map[v] < 0) probs.push(T('p.var', { m, v }));
    def = { kind: 'ready', ready: md.ready };
  } else {
    const r = parse(md.expr);
    if (!r.ok) return { probs: [T('p.expr', { m, why: T('px.' + r.code, r) })] };
    def = { kind: 'formula', expr: md.expr, vars: r.names.filter(n => md.map[n] != null && md.map[n] >= 0) };
  }
  const c = NL.compile(def);
  if (!c.ok) return { probs: [...probs, T('p.compile', { m, why: c.code === 'parse' ? T('px.' + c.parse.code, c.parse) : T('c.' + c.code) })] };
  const st = c.params.map(p => String(md.starts[p] ?? '').trim()), given = st.some(s => s !== '');
  if (md.kind === 'formula' || given) { const miss = c.params.filter((p, j) => st[j] === ''); if (miss.length) probs.push(T('p.start', { m, p: miss.join(', ') })); else if (st.some(s => !Number.isFinite(num(s)))) probs.push(T('p.startnum', { m })); }
  if (md.w.kind !== 'none' && (md.w.col == null || md.w.col < 0)) probs.push(T('p.wcol', { m }));
  if (md.w.kind === 'power' && md.w.theta !== '' && !Number.isFinite(num(md.w.theta))) probs.push(T('p.theta', { m }));
  return { probs, def, c, start: md.kind === 'formula' || given ? st.map(num) : null };
}
function step2Problems() {
  const p = [];
  if (S.y == null) p.push(T('p.y'));
  if (!S.models.length) p.push(T('p.models'));
  S.models.forEach((md, i) => p.push(...modelOf(md, i).probs));
  return p;
}
function renderStep2() {
  const el = $('step2'), H = headers();
  const opts = (cur, none = T('none')) => `<option value="">${none}</option>` + H.map((x, i) => `<option value="${i}"${cur === i ? ' selected' : ''}>${esc(x)}</option>`).join('');
  let h = `<div class="card"><label>${T('y.h')} <select id="ysel">${opts(S.y)}</select></label></div><div class="card"><h2>${T('m.h')}</h2><p class="muted small">${T('m.sub')}</p>`;
  S.models.forEach((md, i) => {
    h += `<fieldset class="fam mdl" data-m="${i}"><legend>${mLabel(i)}</legend><div class="lims"><label>${T('m.type')} <select data-k="type">${NL.READY_IDS.map(id => `<option value="${id}"${md.kind === 'ready' && md.ready === id ? ' selected' : ''}>${esc(T('rf.' + id))}: y = ${esc(NL.READY[id].expr)}</option>`).join('')}<option value="formula"${md.kind === 'formula' ? ' selected' : ''}>${T('m.formula')}</option></select></label>
      ${S.models.length > 1 ? `<button type="button" class="btn ghost small" data-k="rm">${T('m.rm')}</button>` : ''}</div>`;
    let names = [], params = [];
    if (md.kind === 'ready') { names = NL.READY[md.ready].vars; const c = NL.compile({ kind: 'ready', ready: md.ready }); params = c.params; }
    else {
      h += `<label class="field"><span>${T('m.expr')}</span><input type="text" data-k="expr" value="${esc(md.expr)}" placeholder="${esc(T('m.expr.ph'))}" spellcheck="false" autocomplete="off"></label><p class="muted small">${T('m.syntax')}</p>`;
      const r = parse(md.expr);
      if (r.ok) { names = r.names; params = r.names.filter(n => !(md.map[n] != null && md.map[n] >= 0)); }
      else if (md.expr.trim()) h += `<p class="note err small" data-k="perr">${esc(T('px.' + r.code, r))}</p>`;
    }
    if (names.length) {
      h += `<div class="tscroll"><table class="grid" data-k="names"><thead><tr><th>${T('m.names')}</th><th>${md.kind === 'ready' ? T('w.col') : T('m.role')}</th><th>${T('m.start')}</th></tr></thead><tbody>`;
      for (const n of (md.kind === 'ready' ? [...names, ...params] : names)) {
        const isVar = md.kind === 'ready' ? names.includes(n) : md.map[n] != null && md.map[n] >= 0;
        h += `<tr><th><code>${esc(n)}</code></th><td>${md.kind === 'ready' ? (isVar ? `<select data-map="${esc(n)}">${opts(md.map[n] ?? null)}</select>` : `<span class="muted small">${T('m.par')}</span>`) : `<select data-map="${esc(n)}">${opts(md.map[n] ?? null, T('m.par'))}</select>`}</td>
          <td>${isVar ? '' : `<input type="text" inputmode="decimal" size="10" data-start="${esc(n)}" value="${esc(md.starts[n] ?? '')}" placeholder="${md.kind === 'ready' ? esc(T('m.auto')) : ''}">`}</td></tr>`;
      }
      h += `</tbody></table></div>`;
    }
    h += `<div class="lims"><label>${T('w.h')} <select data-k="wkind">${['none', 'power', 'column'].map(k => `<option value="${k}"${md.w.kind === k ? ' selected' : ''}>${T('w.' + k)}</option>`).join('')}</select></label>
      ${md.w.kind !== 'none' ? `<label>${T('w.col')} <select data-k="wcol">${opts(md.w.col)}</select></label>` : ''}${md.w.kind === 'power' ? `<label>${T('w.theta')} <input type="text" inputmode="decimal" size="8" data-k="wtheta" value="${esc(md.w.theta)}" placeholder="${esc(T('w.auto'))}"></label>` : ''}</div></fieldset>`;
  });
  h += `<p><button type="button" class="btn ghost small" id="madd">${T('m.add')}</button></p><p class="muted small">${T('w.note')}</p></div>`;
  const pr = step2Problems();
  h += `<div class="nav"><button type="button" class="btn ghost" id="back1">${T('back')}</button><button type="button" class="btn" id="calc"${pr.length ? ' disabled' : ''}>${T('calc')}</button>${pr.length ? `<span class="muted small" id="s2prob">${pr.map(esc).join(' · ')}</span>` : ''}</div>`;
  el.innerHTML = h;
  const re = () => { R = null; save(); renderStep2(); renderSteps(); };
  $('ysel').addEventListener('change', e => { S.y = e.target.value === '' ? null : +e.target.value; re(); });
  el.querySelectorAll('fieldset.mdl').forEach(fs => {
    const md = S.models[+fs.dataset.m], q = s => fs.querySelector(s);
    q('[data-k="type"]').addEventListener('change', e => {
      const v = e.target.value; md.starts = {};
      if (v === 'formula') { md.kind = 'formula'; md.map = {}; }
      else { md.kind = 'ready'; md.ready = v; md.map = {}; }
      re();
    });
    q('[data-k="rm"]') && q('[data-k="rm"]').addEventListener('click', () => { S.models.splice(+fs.dataset.m, 1); re(); });
    q('[data-k="expr"]') && q('[data-k="expr"]').addEventListener('change', e => {
      md.expr = e.target.value; const r = parse(md.expr);
      if (r.ok) { const HL = headers().map(x => x.trim().toLowerCase()); for (const n of r.names) if (!(n in md.map)) { const k = HL.indexOf(n.toLowerCase()); md.map[n] = k >= 0 ? k : null; } }
      re();
    });
    fs.querySelectorAll('[data-map]').forEach(x => x.addEventListener('change', () => { md.map[x.dataset.map] = x.value === '' ? null : +x.value; re(); }));
    fs.querySelectorAll('[data-start]').forEach(x => x.addEventListener('change', () => { md.starts[x.dataset.start] = x.value.trim(); re(); }));
    q('[data-k="wkind"]').addEventListener('change', e => { md.w.kind = e.target.value; re(); });
    q('[data-k="wcol"]') && q('[data-k="wcol"]').addEventListener('change', e => { md.w.col = e.target.value === '' ? null : +e.target.value; re(); });
    q('[data-k="wtheta"]') && q('[data-k="wtheta"]').addEventListener('change', e => { md.w.theta = e.target.value.trim(); re(); });
  });
  $('madd').addEventListener('click', () => { S.models.push(newModel()); re(); });
  $('back1').addEventListener('click', () => go(1));
  $('calc').addEventListener('click', () => { compute(); go(3); });
}

/* ---------------- step 3: results ---------------- */
function compute() {
  const rows = dataRows(), ms = S.models.map((md, i) => ({ md, i, ...modelOf(md, i) }));
  const cols = [{ col: S.y }];
  for (const x of ms) { if (!x.c) continue; for (const v of x.c.vars) cols.push({ col: x.md.map[v] }); if (x.md.w.kind !== 'none') cols.push({ col: x.md.w.col, positive: true }); }
  const { use, dropped } = NL.commonRows(rows, cols), U = use.map(i => rows[i]), y = U.map(r => r.vals[S.y]);
  const fits = ms.map(x => {
    const X = U.map(r => x.c.vars.map(v => r.vals[x.md.map[v]])), w = x.md.w;
    const weight = w.kind === 'power' ? { kind: 'power', X: U.map(r => r.vals[w.col]), theta: w.theta === '' ? null : num(w.theta) } : w.kind === 'column' ? { kind: 'column', psi: U.map(r => r.vals[w.col]) } : { kind: 'none' };
    const fit = NL.fitModel(x.c, X, y, { start: x.start, readyId: x.md.kind === 'ready' ? x.md.ready : null, weight });
    return { i: x.i, label: mLabel(x.i), md: JSON.parse(JSON.stringify(x.md)), c: x.c, def: x.def, X, fit, wcol: w.kind !== 'none' ? w.col : null };
  });
  R = { created: new Date().toISOString(), data: S.tbl.imp ? S.tbl.imp.name : '', yName: colName(S.y), rows: U.map(r => r.row), y, dropped, fits };
  if (!R.fits[S.saveIdx] || R.fits[S.saveIdx].fit.status !== 'ok') S.saveIdx = Math.max(0, R.fits.findIndex(q => q.fit.status === 'ok'));
  if (!R.fits[S.ivIdx] || R.fits[S.ivIdx].fit.status !== 'ok') S.ivIdx = S.saveIdx;
}
const rowsText = rows => { const r = rows.filter(x => x != null); return r.length > 25 ? r.slice(0, 25).join(', ') + ' …' : r.join(', '); };
const modelText = q => `${q.label}: ${q.md.kind === 'ready' ? T('rf.' + q.md.ready) + ', ' : ''}y = ${q.c.text}`;
const varText = q => q.c.vars.map(v => `${v} = ${colName(q.md.map[v])}`).join(', ');
const wText = q => T('r.wtxt', { kind: q.fit.weight ? q.fit.weight.kind : 'none', col: colName(q.wcol), theta: q.fit.weight && q.fit.weight.theta != null ? fmtNum(q.fit.weight.theta, 4) : '', est: q.fit.weight && q.fit.weight.estimated });
const stText = q => q.fit.status === 'bad' ? `${T('st.bad')}: ${T('e.' + q.fit.code)}` : T('st.' + q.fit.status);
function renderStep3() {
  if (!R) compute();
  const el = $('step3'), ok = R.fits.filter(q => q.fit.status === 'ok');
  let h = `<div class="card"><h2>${T('r.cmp')}</h2>${R.dropped.length ? `<p class="note warn small" id="r-drop">${esc(T('r.drop', { n: R.dropped.length, rows: rowsText(R.dropped.map(d => d.row)) }))}</p>` : ''}
    <div class="tscroll"><table class="grid" id="cmptab"><thead><tr><th>${T('r.model')}</th><th>${T('r.n')}</th><th>${T('r.p')}</th><th>${T('r.rmse')}</th><th>${T('r.bias')}</th><th>${T('r.r2')}</th><th>${T('r.aic')}</th><th>${T('r.s')}</th><th>${T('r.w')}</th><th>${T('r.st')}</th></tr></thead><tbody>
    ${R.fits.map(q => { const x = q.fit, good = x.status === 'ok' || x.status === 'singular';
      return `<tr data-m="${q.i}"><th class="small">${esc(modelText(q))}<br><span class="muted">${esc(varText(q))}</span></th>${good ? `<td class="num">${x.n}</td><td class="num">${x.p}</td><td class="num" data-k="rmse">${f(x.metrics.rmse, 5)}</td><td class="num">${f(x.metrics.bias, 5)}</td><td class="num" data-k="r2">${f(x.metrics.r2, 4)}</td><td class="num" data-k="aic">${f(x.aic, 3)}</td><td class="num">${sig(Math.sqrt(x.s2))}</td><td class="small">${esc(wText(q))}</td>` : '<td colspan="8"></td>'}<td class="small" data-k="st">${esc(stText(q))}</td></tr>`; }).join('')}</tbody></table></div><p class="muted small">${T('r.cmpnote')}</p></div>`;
  for (const q of ok) {
    const x = q.fit;
    h += `<div class="card" data-fit="${q.i}"><h2>${esc(modelText(q))}</h2><p class="muted small">${esc(varText(q))} · ${esc(wText(q))}</p>
      <div class="tscroll"><table class="grid" data-coef="${q.i}"><thead><tr><th>${T('r.term')}</th><th>${T('r.est')}</th><th>${T('r.se')}</th><th>${T('r.ci', { l: Math.round(x.level * 100) })}</th></tr></thead><tbody>
      ${q.c.params.map((p, j) => `<tr><th><code>${esc(p)}</code></th><td class="num" data-k="b${j}">${sig(x.theta[j])}</td><td class="num">${sig(x.se[j])}</td><td class="num">${sig(x.ci[j][0])} – ${sig(x.ci[j][1])}</td></tr>`).join('')}</tbody></table></div>
      <p class="muted small">${T('r.cinote', { t: fmtNum(x.t, 4), df: x.df })}</p>
      <div class="charts2"><figure class="chartbox">${scatterChart({ title: T('ch.obs', { m: q.label }), points: R.y.map((o, i) => [o, x.pred[i]]), xLabel: T('ch.xo'), yLabel: T('ch.yo'), equal: true, fmt: v => fmtNum(v, 3), width: 420, height: 340 })}</figure>
      <figure class="chartbox">${scatterChart({ title: T('ch.res', { m: q.label }), points: x.pred.map((p, i) => [p, R.y[i] - p]), xLabel: T('ch.x'), yLabel: T('ch.y'), hline: 0, fmt: v => fmtNum(v, 3), width: 420, height: 340 })}</figure></div></div>`;
  }
  if (ok.length) {
    const iq = R.fits[S.ivIdx], ivars = iq.fit.status === 'ok' ? [...iq.c.vars.map(v => ({ key: v, label: `${v} (${colName(iq.md.map[v])})` })), ...(iq.wcol != null && !iq.c.vars.some(v => iq.md.map[v] === iq.wcol) ? [{ key: '__w', label: T('iv.psi', { v: colName(iq.wcol) }) }] : [])] : [];
    h += `<div class="card" id="ivcard"><h2>${T('iv.h')}</h2><div class="lims"><label>${T('iv.model')} <select id="iv-m">${ok.map(q => `<option value="${q.i}"${S.ivIdx === q.i ? ' selected' : ''}>${esc(q.label)}</option>`).join('')}</select></label>
      ${ivars.map(v => `<label>${esc(v.label)} <input type="text" inputmode="decimal" size="8" data-iv="${esc(v.key)}" value="${esc((S.iv[S.ivIdx] || {})[v.key] ?? '')}"></label>`).join('')}<button type="button" class="btn ghost small" id="iv-go">${T('iv.go')}</button></div><div id="iv-out"></div></div>
      <div class="card" id="savecard"><h2>${T('save.h')}</h2><div class="lims"><label>${T('save.model')} <select id="sv-m">${ok.map(q => `<option value="${q.i}"${S.saveIdx === q.i ? ' selected' : ''}>${esc(q.label)}</option>`).join('')}</select></label>
      <label>${T('save.sp')} <input type="text" size="14" id="sv-sp" value="${esc(S.sp)}"></label></div><div class="lims" id="sv-units"></div>
      <label class="field"><span>${T('save.cit')}</span><input type="text" id="sv-cit" value="${esc(S.cit)}" placeholder="${esc(T('save.cit.ph'))}"></label><p class="muted small">${T('save.note')}</p>
      <div class="nav"><button type="button" class="btn" id="sv-save">${T('save.btn')}</button></div><div id="sv-msg"></div></div>
      <div class="card" id="evcard"><h2>${T('ev.h')}</h2><p class="muted small">${T('ev.sub')}</p><button type="button" class="btn ghost" id="ev-send">${T('ev.btn')}</button></div>`;
  }
  h += `<div class="card"><h2>${T('x.h')}</h2><div class="exports"><button type="button" class="btn" id="x-xlsx">${T('x.xlsx')}</button><button type="button" class="btn ghost" id="x-csv">${T('x.csv')}</button><button type="button" class="btn ghost" id="x-json">${T('x.json')}</button><button type="button" class="btn ghost" id="x-r">${T('x.r')}</button>${recordOption()}</div><p class="muted small">${T('x.r.note')}</p></div>
    <div class="nav"><button type="button" class="btn ghost" id="back2">${T('back')}</button></div>`;
  el.innerHTML = h;
  $('back2').addEventListener('click', () => go(2));
  if (ok.length) {
    $('iv-m').addEventListener('change', e => { S.ivIdx = +e.target.value; save(); renderStep3(); });
    $('iv-go').addEventListener('click', () => { const o = {}; el.querySelectorAll('[data-iv]').forEach(x => { o[x.dataset.iv] = x.value.trim(); }); S.iv[S.ivIdx] = o; save(); renderIv(); });
    if (S.iv[S.ivIdx]) renderIv();
    $('sv-m').addEventListener('change', e => { S.saveIdx = +e.target.value; save(); renderUnits(); });
    $('sv-sp').addEventListener('change', e => { S.sp = e.target.value.trim(); save(); });
    $('sv-cit').addEventListener('change', e => { S.cit = e.target.value; save(); });
    $('sv-save').addEventListener('click', saveSet);
    $('ev-send').addEventListener('click', sendToEval);
    renderUnits();
  }
  const name = ext => `nonlinear-regression-${new Date().toISOString().slice(0, 10)}.${ext}`;
  $('x-csv').addEventListener('click', () => downloadCSV(name('csv'), predTable(), lang));
  $('x-r').addEventListener('click', () => {
    const imp = S.tbl.imp, file = imp && imp.kind !== 'dataset' && imp.kind !== 'paste' ? imp.name : null;
    download(name('R'), buildR({ imp, src: S.tbl.src, decimal: S.tbl.decimal || '.', y: S.y }, R, ivPoint(), { lang, created: new Date().toISOString(), version: NL.TOOL.version, fileName: file }), 'text/plain;charset=utf-8');
    // a table that was not read from a file (approved package, pasted cells) goes along as CSV for the script to read
    if (!file) download(csvName(imp), tableCsv(S.tbl.src, cellText, S.tbl.decimal || '.'), 'text/csv;charset=utf-8');
  });
  $('x-xlsx').addEventListener('click', async () => {
    let XLSX; try { XLSX = await loadXLSX(BASE); } catch (e) { status(T('x.fail'), 'err'); return; }
    download(name('xlsx'), xlsxBlob(XLSX, [{ name: T('x.info'), rows: infoRows(), widths: [28, 100] }, { name: T('x.cmp'), rows: cmpRows() }, { name: T('x.coef'), rows: coefRows() }, { name: T('x.obs'), rows: predTable() }]));
  });
  $('x-json').addEventListener('click', () => downloadRecord(name('json'), { tool: NL.TOOL, created: R.created, data: R.data, response: R.yName, rows: R.rows.length, dropped: R.dropped,
    fits: R.fits.map(q => ({ model: q.label, kind: q.md.kind, ready: q.md.kind === 'ready' ? q.md.ready : null, formula: q.c.text, vars: Object.fromEntries(q.c.vars.map(v => [v, colName(q.md.map[v])])), params: q.c.params,
      weight: q.fit.weight ? { ...q.fit.weight, column: q.wcol != null ? colName(q.wcol) : null } : null, status: q.fit.status, code: q.fit.code ?? null,
      ...(q.fit.status === 'ok' ? { theta: q.fit.theta, se: q.fit.se, ci: q.fit.ci, cov: q.fit.cov, s2: q.fit.s2, df: q.fit.df, aic: q.fit.aic, metrics: q.fit.metrics, start: q.fit.start, iter: q.fit.iter } : {}) })) },
    NL.TOOL, S.tbl ? [['data', S.tbl.imp]] : [], m => status(m, 'err')));
}
/** The point of the interval card { idx, point, wv (the weight variable's value; null when unweighted) }, or null. */
function ivPoint() {
  const q = R && R.fits[S.ivIdx], o = S.iv[S.ivIdx]; if (!q || q.fit.status !== 'ok' || !o) return null;
  const point = Object.fromEntries(q.c.vars.map(v => [v, num(o[v])]));
  const vv = q.c.vars.find(v => q.md.map[v] === q.wcol), wv = q.fit.weight.kind === 'none' ? null : vv ? point[vv] : num(o.__w);
  return { idx: S.ivIdx, point, wv };
}
function renderIv() {
  const q = R.fits[S.ivIdx], box = $('iv-out'); if (!q || q.fit.status !== 'ok' || !box) return;
  const ip = ivPoint(); if (!ip) return;
  const { point: pt, wv } = ip;
  let psi = 1;
  if (q.fit.weight.kind !== 'none') psi = q.fit.weight.kind === 'power' ? wv ** q.fit.weight.theta : wv;
  const r = NL.interval(q.c, q.fit, pt, psi);
  if (!r || !q.c.vars.every(v => pt[v] > 0)) { box.innerHTML = `<p class="note err small" id="iv-bad">${T('iv.bad')}</p>`; return; }
  const out = q.c.vars.some((v, j) => { const col = q.X.map(x => x[j]); return pt[v] < Math.min(...col) || pt[v] > Math.max(...col); });
  box.innerHTML = `<div class="tscroll"><table class="grid" id="iv-tab"><thead><tr><th>${T('iv.y')}</th><th>${T('iv.ci')}</th><th>${T('iv.pi')}</th></tr></thead><tbody><tr><td class="num" data-k="y">${sig(r.yhat)}</td><td class="num" data-k="ci">${sig(r.ci[0])} – ${sig(r.ci[1])}</td><td class="num" data-k="pi">${sig(r.pi[0])} – ${sig(r.pi[1])}</td></tr></tbody></table></div>
    <p class="muted small">${esc(T('iv.note', { t: fmtNum(q.fit.t, 4), df: q.fit.df }))}${out ? ' ' + esc(T('iv.out')) : ''}</p>`;
}
function renderUnits() {
  const q = R.fits[S.saveIdx], box = $('sv-units'); if (!q || !box) return;
  const items = [...q.c.vars.map(v => ({ k: 'c' + q.md.map[v], label: `${v} (${colName(q.md.map[v])})` })), { k: 'c' + S.y, label: `y (${colName(S.y)})` }];
  box.innerHTML = items.map(x => `<label>${esc(T('save.unit', { v: x.label }))} <input type="text" size="6" data-unit="${x.k}" value="${esc(S.units[x.k] ?? '')}"></label>`).join('');
  box.querySelectorAll('[data-unit]').forEach(x => x.addEventListener('change', () => { S.units[x.dataset.unit] = x.value.trim(); save(); }));
}
async function saveSet() {
  const cit = String(S.cit).trim(), msg = $('sv-msg');
  $('sv-units').querySelectorAll('[data-unit]').forEach(x => { S.units[x.dataset.unit] = x.value.trim(); });
  if (!cit) { msg.innerHTML = `<p class="note err small">${T('save.cit.miss')}</p>`; return; }
  const q = R.fits[S.saveIdx], x = q.fit, unit = c => S.units['c' + c];
  if (q.c.vars.some(v => !unit(q.md.map[v])) || !unit(S.y)) { msg.innerHTML = `<p class="note err small">${T('save.unit.miss')}</p>`; return; }
  const readyId = q.md.kind === 'ready' ? q.md.ready : null, formId = NL.ensureForm(q.c, readyId);
  const valid = Object.fromEntries(q.c.vars.map((v, j) => { const col = q.X.map(r => r[j]); return [v, [Math.min(...col), Math.max(...col)]]; }));
  const set = { ...blankSet(formId), params: Object.fromEntries(q.c.params.map((p, j) => [p, x.theta[j]])), inputs: Object.fromEntries(q.c.vars.map(v => [v, { unit: unit(q.md.map[v]) }])),
    output: { name: colName(S.y), unit: unit(S.y) }, valid, species: S.sp || null, source: { citation: cit }, origin: 'fitted',
    meta: { columns: Object.fromEntries(q.c.vars.map(v => [v, colName(q.md.map[v])])), cov: x.cov.map(r => r.map(v => String(v)).join(' ')).join('; ') },
    fit: { method: x.weight.kind === 'none' ? 'nonlinear least squares (Levenberg–Marquardt)' : 'weighted nonlinear least squares (EGNLS, Parresol 2001)', expr: q.c.text, vars: q.c.vars, ready: readyId,
      data: R.data, n: x.n, se: x.se, cov: x.cov, s2: x.s2, df: x.df, weight: { ...x.weight, column: q.wcol != null ? colName(q.wcol) : null }, aic: x.aic, metrics: { bias: x.metrics.bias, rmse: x.metrics.rmse, r2: x.metrics.r2 }, created: R.created } };
  const r = await saveCoef(set); await flush();
  msg.innerHTML = r.ok ? `<p class="note ok small" id="sv-ok">${T('save.ok')}</p>` : `<p class="note err small">${esc(r.problems.map(p => p.code).join(', '))}</p>`;
}
/** Observed y and the predictions of every fitted model, one row per observation used. */
function predTable() {
  const ok = R.fits.filter(q => q.fit.status === 'ok' || q.fit.status === 'singular' || q.fit.status === 'noconverge');
  const head = ['row', 'y_obs', ...ok.map(q => 'y_' + q.label)];
  return [head, ...R.rows.map((row, i) => [row, R.y[i], ...ok.map(q => q.fit.pred ? q.fit.pred[i] : null)])];
}
function cmpRows() { return [[T('r.model'), T('r.n'), T('r.p'), 'RMSE', 'bias', 'R2', 'AIC', 'sigma', T('r.w'), T('r.st')], ...R.fits.map(q => q.fit.metrics ? [modelText(q), q.fit.n, q.fit.p, q.fit.metrics.rmse, q.fit.metrics.bias, q.fit.metrics.r2, q.fit.aic, Math.sqrt(q.fit.s2), wText(q), stText(q)] : [modelText(q), null, null, null, null, null, null, null, '', stText(q)])]; }
function coefRows() {
  const rows = [[T('r.model'), T('r.term'), T('r.est'), T('r.se'), 'CI low', 'CI high']];
  for (const q of R.fits.filter(z => z.fit.status === 'ok')) q.c.params.forEach((p, j) => rows.push([q.label, p, q.fit.theta[j], q.fit.se[j], q.fit.ci[j][0], q.fit.ci[j][1]]));
  return rows;
}
function infoRows() {
  return [[T('x.k'), T('x.v')], [T('x.tool'), `${NL.TOOL.id} ${NL.TOOL.version}`], [T('x.date'), R.created], [T('x.data'), `${R.data}; y = ${R.yName}; n = ${R.rows.length}`],
    ...R.fits.map(q => [q.label, `${modelText(q)}; ${varText(q)}; ${wText(q)}`]),
    [T('x.src'), 'Parresol, B.R. 2001. Additivity of nonlinear biomass equations. Can. J. For. Res. 31: 865–878 (weights, Eq. 2–11)'], [T('x.rule'), T('r.cmpnote')], [T('x.rule'), T('w.note')]];
}
/** Hand-off to Model Evaluation (store key 'handoff:model-degerlendirme', read once by that page). */
async function sendToEval() {
  const rows = predTable(), text = rows.map(r => r.map(v => v == null ? '' : String(v)).join('\t')).join('\n');
  await put('handoff:model-degerlendirme', { name: ('nonlinear-regression') + '.tsv', text, obs: 'y_obs', models: rows[0].slice(2), role: 'training', created: new Date().toISOString() });
  await flush(); location.href = 'model-degerlendirme.php';
}

/* ---------------- shell ---------------- */
function canGo(n) { if (n <= 1) return true; if (!S.tbl || !S.tbl.src) return false; if (n === 2) return true; return !step2Problems().length; }
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
    if (saved && saved.v === 1) { S = { ...blank(), ...saved, models: (saved.models || []).map(m => ({ ...newModel(), ...m, w: { ...newModel().w, ...(m.w || {}) } })) }; status(T('restored', { when: new Date(saved.saved).toLocaleString(LOC) })); }
    if (S.tbl && S.tbl.imp && S.tbl.imp.buf && !S.tbl.src) S.tbl.src = await readImport(S.tbl.imp, BASE).catch(() => null);
    await takeHandoff();
  } catch (e) { S = blank(); }
  render();
})();
/** A table handed over by Height–Diameter Modelling (store key 'handoff:<this page>', schema 'hd-handoff/1'; read once).
 * Loads the table, chooses the response (and the group), records the units and starts from the same model as the sample. */
async function takeHandoff() {
  const ho = await get('handoff:' + NL.TOOL.id);
  if (!ho || ho.schema !== 'hd-handoff/1' || typeof ho.text !== 'string') return;
  await del('handoff:' + NL.TOOL.id);
  const imp = { kind: 'paste', name: ho.name || 'handoff', text: ho.text, encoding: 'utf-8', delim: '\t', header: true, sheet: null }, src = await readImport(imp, BASE);
  S = blank(); S.tbl = { imp, src, decimal: '.', decChosen: true }; R = null;
  const y = src.headers.indexOf(ho.y), d = src.headers.indexOf(ho.d);
  S.y = y >= 0 ? y : null;
  if (d >= 0) S.models = [{ ...newModel(), ready: 'cr', map: { x: d } }];
  for (const [k, u] of Object.entries(ho.units || {})) { const c = src.headers.indexOf(k); if (c >= 0) S.units['c' + c] = u; }
  S.step = 2; save(); status(T('handoff', { name: imp.name, n: src.rows.length }), 'ok');
}
