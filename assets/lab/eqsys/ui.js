// Systems of equations (SM-04): user interface. All arithmetic in calc.js (tested in tests/eqsys/).
import * as Q from './calc.js';
import { T } from './i18n.js';
import { lang, fmtNum, esc, LIST_SEP } from '../core/i18n.js';
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

const BASE = './', KEY = 'session:' + Q.TOOL.id, LOC = lang === 'tr' ? 'tr-TR' : 'en-GB', $ = id => document.getElementById(id);
const f = (x, d = 4) => x == null || !Number.isFinite(x) ? '–' : fmtNum(x, d);
function sig(x) { return x == null || !Number.isFinite(x) ? '–' : x === 0 ? '0' : Math.abs(x) >= 1e-4 && Math.abs(x) < 1e6 ? fmtNum(Number(x.toPrecision(7)), 14) : x.toExponential(6); }
const num = t => { const r = parseNumber(String(t ?? '').trim(), '.'); return r.status === 'ok' ? r.value : NaN; };
let S = blank(), R = null;
function blank() { return { v: 1, step: 1, tbl: null, eqs: [{ y: null, expr: '' }, { y: null, expr: '' }], map: {}, starts: {}, method: 'SUR', resid: 'geomean', cit: '', sp: '', units: {} }; }
const AS = autosave(KEY, () => ({ ...S, saved: new Date().toISOString() }));
function save() { AS.save(); }
function flush() { return AS.flush(); }
function status(m, k = '') { const s = $('status'); s.className = 'status ' + k; s.textContent = m || ''; }
const headers = () => S.tbl && S.tbl.src ? S.tbl.src.headers.map(h => String(h)) : [];
const colName = c => c == null ? '–' : headers()[c] ?? '–';
const eqLabel = i => T('eq.label', { i: i + 1 });

/* ---------------- step 1: data ---------------- */
function setTable(st) {
  if (!st.src) { S.tbl = null; save(); renderStep1(); return; }
  S.tbl = { imp: st.imp, src: st.src, decimal: null, decChosen: false }; R = null;
  status(''); save(); renderStep1();
}
function dataRows() {
  const t = S.tbl, src = t.src;
  return src.rows.map((r, i) => ({ row: src.rowNumbers[i], cols: src.headers.map((_, c) => { const x = r[c]; if (x && x.t === 'n') return x.v; const p = parseNumber(cellText(x), t.decimal || '.'); return p.status === 'ok' ? p.value : null; }) }));
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
    const buf = await (await fetch(BASE + 'assets/lab/eqsys/ornek/ornek-sistem.csv')).arrayBuffer();
    const imp = { kind: 'csv', name: lang === 'tr' ? 'ornek-sistem.csv (benzetim)' : 'ornek-sistem.csv (simulated)', buf, encoding: 'utf-8', delim: null, header: true, sheet: null };
    setTable({ imp, src: await readImport(imp, BASE) }); S.tbl.decimal = ','; S.tbl.decChosen = true;
    const H = headers().map(x => x.toLowerCase());
    S.eqs = [{ y: H.indexOf('h_m'), expr: '1.3 + a*(1-exp(-b*D_cm))^c' }, { y: H.indexOf('v_m3'), expr: 'k*D_cm^p*(1.3 + a*(1-exp(-b*D_cm))^c)^q' }];
    S.map = { D_cm: H.indexOf('d_cm') }; S.starts = { a: '30', b: '0.04', c: '1.2', k: '0.00006', p: '1.9', q: '1' };
    save(); renderStep1();
  });
  $('reset').addEventListener('click', async () => { S = blank(); R = null; status(''); render(); await del(KEY); });
  $('to2').addEventListener('click', () => go(2));
}

/* ---------------- step 2: system ---------------- */
function namesOf() { const out = []; for (const e of S.eqs) { const r = parse(e.expr); if (r.ok) for (const n of r.names) if (!out.includes(n)) out.push(n); } return out; }
const isVar = n => S.map[n] != null && S.map[n] >= 0;
function systemOf() {
  const probs = [];
  if (S.eqs.length < 2) probs.push(T('p.eqs'));
  S.eqs.forEach((e, i) => { if (e.y == null || e.y < 0) probs.push(T('p.y', { i: i + 1 })); const r = parse(e.expr); if (!r.ok) probs.push(T('eq.perr', { i: i + 1, why: T('px.' + r.code, r) })); else if (!r.names.some(n => !isVar(n))) probs.push(T('p.nocoef', { i: i + 1 })); });
  if (probs.length) return { probs };
  const vars = namesOf().filter(isVar), sys = Q.compileSystem(S.eqs.map((e, i) => ({ name: eqLabel(i), y: '__y' + i, expr: e.expr })), vars);
  if (!sys.ok) return { probs: [T('eq.perr', { i: (sys.eq ?? 0) + 1, why: sys.code })] };
  if (sys.params.some(p => String(S.starts[p] ?? '').trim() !== '' && !Number.isFinite(num(S.starts[p])))) return { probs: [T('p.startnum')] };
  return { probs: [], sys, vars };
}
function renderStep2() {
  const el = $('step2'), H = headers(), opts = (cur, none = T('none')) => `<option value="">${none}</option>` + H.map((x, i) => `<option value="${i}"${cur === i ? ' selected' : ''}>${esc(x)}</option>`).join('');
  let h = `<div class="card"><h2>${T('eq.h')}</h2><p class="muted small">${T('eq.sub')}</p>`;
  S.eqs.forEach((e, i) => {
    const r = parse(e.expr);
    h += `<fieldset class="fam" data-e="${i}"><legend>${eqLabel(i)}</legend><div class="lims"><label>${T('eq.y')} <select data-k="y">${opts(e.y)}</select></label>${S.eqs.length > 2 ? `<button type="button" class="btn ghost small" data-k="rm">${T('eq.rm')}</button>` : ''}</div>
      <label class="field"><span>${T('eq.expr')}</span><input type="text" data-k="expr" value="${esc(e.expr)}" spellcheck="false" autocomplete="off"></label>${!r.ok && e.expr.trim() ? `<p class="note err small" data-k="perr">${esc(T('px.' + r.code, r))}</p>` : ''}</fieldset>`;
  });
  h += `<p><button type="button" class="btn ghost small" id="eadd">${T('eq.add')}</button></p><p class="muted small">${T('eq.syntax')}</p>`;
  const names = namesOf();
  if (names.length) {
    h += `<h3>${T('n.h')}</h3><div class="tscroll"><table class="grid" id="ntab"><thead><tr><th>${T('n.name')}</th><th>${T('n.role')}</th><th>${T('n.start')}</th><th>${T('n.eqs')}</th></tr></thead><tbody>
      ${names.map(n => { const where = S.eqs.map((e, i) => { const r = parse(e.expr); return r.ok && r.names.includes(n) ? i + 1 : null; }).filter(Boolean);
        return `<tr><th><code>${esc(n)}</code></th><td><select data-map="${esc(n)}">${opts(S.map[n] ?? null, T('n.par'))}</select></td><td>${isVar(n) ? '' : `<input type="text" inputmode="decimal" size="10" data-start="${esc(n)}" value="${esc(S.starts[n] ?? '')}" placeholder="0">`}</td>
          <td class="small">${where.join(', ')}${!isVar(n) && where.length > 1 ? ` <b>(${T('n.shared')})</b>` : ''}</td></tr>`; }).join('')}</tbody></table></div>`;
  }
  h += `</div><div class="card"><h2>${T('m.h')}</h2><div class="lims"><label>${T('m.method')} <select id="msel">${['OLS', 'SUR', 'ISUR'].map(m => `<option value="${m}"${S.method === m ? ' selected' : ''}>${T('m.' + m)}</option>`).join('')}</select></label>
    <label>${T('m.resid')} <select id="rsel">${['geomean', 'noDfCor', 'max'].map(m => `<option value="${m}"${S.resid === m ? ' selected' : ''}>${T('r.' + m)}</option>`).join('')}</select></label></div><p class="muted small">${T('m.note')}</p></div>`;
  const pr = systemOf().probs;
  h += `<div class="nav"><button type="button" class="btn ghost" id="back1">${T('back')}</button><button type="button" class="btn" id="calc"${pr.length ? ' disabled' : ''}>${T('calc')}</button>${pr.length ? `<span class="muted small" id="s2prob">${pr.map(esc).join(' · ')}</span>` : ''}</div>`;
  el.innerHTML = h;
  const re = () => { R = null; save(); renderStep2(); renderSteps(); };
  el.querySelectorAll('fieldset[data-e]').forEach(fs => {
    const i = +fs.dataset.e, e = S.eqs[i];
    fs.querySelector('[data-k="y"]').addEventListener('change', x => { e.y = x.target.value === '' ? null : +x.target.value; re(); });
    fs.querySelector('[data-k="expr"]').addEventListener('change', x => {
      e.expr = x.target.value; const r = parse(e.expr);
      if (r.ok) { const HL = headers().map(z => z.trim().toLowerCase()); for (const n of r.names) if (!(n in S.map)) { const k = HL.indexOf(n.toLowerCase()); S.map[n] = k >= 0 ? k : null; } }
      re();
    });
    const rm = fs.querySelector('[data-k="rm"]'); if (rm) rm.addEventListener('click', () => { S.eqs.splice(i, 1); re(); });
  });
  el.querySelectorAll('[data-map]').forEach(x => x.addEventListener('change', () => { S.map[x.dataset.map] = x.value === '' ? null : +x.value; re(); }));
  el.querySelectorAll('[data-start]').forEach(x => x.addEventListener('change', () => { S.starts[x.dataset.start] = x.value.trim(); re(); }));
  $('eadd').addEventListener('click', () => { S.eqs.push({ y: null, expr: '' }); re(); });
  $('msel').addEventListener('change', e => { S.method = e.target.value; re(); });
  $('rsel').addEventListener('change', e => { S.resid = e.target.value; re(); });
  $('back1').addEventListener('click', () => go(1));
  $('calc').addEventListener('click', () => { compute(); go(3); });
}

/* ---------------- step 3: results ---------------- */
function compute() {
  const d = systemOf(), rows = dataRows().map(r => ({ row: r.row, vals: { ...Object.fromEntries(d.vars.map(v => [v, r.cols[S.map[v]]])), ...Object.fromEntries(S.eqs.map((e, i) => ['__y' + i, r.cols[e.y]])) } }));
  const start = Object.fromEntries(d.sys.params.map(p => [p, String(S.starts[p] ?? '').trim() === '' ? 0 : num(S.starts[p])]));
  const run = m => Q.fitSystem(d.sys, rows, { method: m, resid: S.resid, start });
  const fits = Object.fromEntries(['OLS', 'SUR', 'ISUR'].map(m => [m, run(m)]));
  R = { created: new Date().toISOString(), data: S.tbl.imp ? S.tbl.imp.name : '', sys: d.sys, vars: d.vars, rows, start, method: S.method, resid: S.resid, fit: fits[S.method], fits,
    eqs: S.eqs.map((e, i) => ({ label: eqLabel(i), y: colName(e.y), ycol: e.y, text: d.sys.eqs[i].text, vars: d.sys.eqs[i].vars, params: d.sys.eqs[i].params })) };
}
const rowsText = rows => { const r = rows.filter(x => x != null); return r.length > 25 ? r.slice(0, 25).join(', ') + ' …' : r.join(', '); };
function renderStep3() {
  if (!R) compute();
  const el = $('step3'), x = R.fit, sys = R.sys;
  let h = `<div class="card"><h2>${esc(T('m.' + R.method))}</h2>`;
  if (x.status !== 'ok') { h += `<p class="note err" id="r-bad">${esc(T('r.bad', { why: T('e.' + x.code) }))}</p></div>`; }
  else {
    h += `<p class="small" id="r-sum">${esc(T('r.sum', { method: R.method, T: x.T, G: x.G, K: x.K, it: R.method === 'ISUR' ? x.iter : 0 }))}</p>${!x.converged ? `<p class="note warn small" id="r-noconv">${T('r.noconv')}</p>` : ''}${x.ident && x.ident.cond > Q.COND_MAX ? `<p class="note warn small" id="r-weak">${esc(T('r.weak', { cond: x.ident.cond === Infinity ? '∞' : x.ident.cond.toExponential(1), names: x.ident.weak.join(', ') }))}</p>` : ''}${x.se && x.names.some((n, j) => x.se[j] > Math.abs(x.coef[j])) ? `<p class="note small" id="r-sebig">${esc(T('r.sebig', { names: x.names.filter((n, j) => x.se[j] > Math.abs(x.coef[j])).join(', ') }))}</p>` : ''}${x.dropped.length ? `<p class="note warn small" id="r-drop">${esc(T('r.drop', { n: x.dropped.length, rows: rowsText(x.dropped.map(d => d.row)) }))}</p>` : ''}
      <ul class="small">${R.eqs.map(e => `<li>${esc(e.label)}: ${esc(e.y)} = ${esc(e.text)}</li>`).join('')}</ul>
      <h3>${T('r.coef')}</h3><div class="tscroll"><table class="grid" id="coeftab"><thead><tr><th>${T('r.name')}</th><th>${T('r.eqs')}</th><th>${T('r.est')}</th><th>${T('r.se')}</th><th>${T('r.t')}</th></tr></thead><tbody>
      ${x.names.map((n, j) => `<tr><th><code>${esc(n)}</code></th><td class="small">${sys.eqs.map((e, i) => e.params.includes(n) ? i + 1 : null).filter(Boolean).join(', ')}${sys.shared.includes(n) ? ' (' + T('n.shared') + ')' : ''}</td><td class="num" data-k="b${j}">${sig(x.coef[j])}</td><td class="num">${sig(x.se[j])}</td><td class="num">${f(x.coef[j] / x.se[j], 3)}</td></tr>`).join('')}</tbody></table></div>
      <h3>${T('r.eqh')}</h3><div class="tscroll"><table class="grid" id="eqtab"><thead><tr><th>${T('r.eq')}</th><th>${T('r.r2')}</th><th>${T('r.ssr')}</th><th>${T('r.s')}</th></tr></thead><tbody>
      ${x.eq.map((e, i) => `<tr><th>${esc(R.eqs[i].label)} (${esc(R.eqs[i].y)})</th><td class="num" data-k="r2">${f(e.r2, 5)}</td><td class="num">${sig(e.ssr)}</td><td class="num">${sig(Math.sqrt(x.residCov[i][i]))}</td></tr>`).join('')}</tbody></table></div>
      <p class="small" id="r-sys">${esc(T('r.sys', { ols: f(x.olsR2, 5), mc: f(x.mcelroy, 5), ll: f(x.logLik, 4), df: x.df }))}</p>
      <p class="small">${T('r.corr')}: ${x.eq.map((_, i) => x.eq.slice(i + 1).map((__, k) => { const j = i + 1 + k; return `${i + 1}–${j + 1} ${f(x.residCov[i][j] / Math.sqrt(x.residCov[i][i] * x.residCov[j][j]), 3)}`; }).join(LIST_SEP)).filter(Boolean).join(LIST_SEP)}</p>
      <p class="muted small">${T('r.note')}</p>
      <div class="charts2">${x.eq.map((e, i) => `<figure class="chartbox">${scatterChart({ title: T('ch.obs', { e: `${R.eqs[i].label} (${R.eqs[i].y})` }), points: e.fitted.map((p, t) => [p + e.resid[t], p]), xLabel: T('ch.xo'), yLabel: T('ch.yo'), equal: true, fmt: v => fmtNum(v, 3), width: 420, height: 340 })}</figure>`).join('')}</div></div>
      ${sys.shared.length ? `<div class="card" id="lrtcard"><h2>${T('lrt.h')}</h2><p class="muted small">${T('lrt.sub')}</p><button type="button" class="btn ghost" id="lrt-go">${T('lrt.go')}</button><div id="lrt-out"></div></div>` : ''}
      <div class="card"><h2>${T('r.cmp')}</h2><div class="tscroll"><table class="grid" id="cmptab"><thead><tr><th>${T('r.name')}</th>${['OLS', 'SUR', 'ISUR'].map(m => `<th>${m}</th>`).join('')}</tr></thead><tbody>
      ${x.names.map((n, j) => `<tr><th><code>${esc(n)}</code></th>${['OLS', 'SUR', 'ISUR'].map(m => { const g = R.fits[m]; return `<td class="num">${g.status === 'ok' ? `${sig(g.coef[j])} (${sig(g.se[j])})` : '–'}</td>`; }).join('')}</tr>`).join('')}
      <tr><th>log L</th>${['OLS', 'SUR', 'ISUR'].map(m => `<td class="num">${R.fits[m].status === 'ok' ? f(R.fits[m].logLik, 4) : '–'}</td>`).join('')}</tr></tbody></table></div><p class="muted small">${T('r.cmpnote')}</p></div>
      <div class="card" id="savecard"><h2>${T('save.h')}</h2><p class="muted small">${T('save.sub')}</p><div class="lims"><label>${T('save.sp')} <input type="text" size="14" id="sv-sp" value="${esc(S.sp)}"></label></div>
      <div class="lims" id="sv-units">${[...new Set([...R.vars.map(v => S.map[v]), ...S.eqs.map(e => e.y)])].map(c => `<label>${esc(T('save.unit', { v: colName(c) }))} <input type="text" size="6" data-unit="c${c}" value="${esc(S.units['c' + c] ?? '')}"></label>`).join('')}</div>
      <label class="field"><span>${T('save.cit')}</span><input type="text" id="sv-cit" value="${esc(S.cit)}" placeholder="${esc(T('save.cit.ph'))}"></label>
      <div class="nav"><button type="button" class="btn" id="sv-save">${T('save.btn')}</button></div><div id="sv-msg"></div></div>`;
  }
  h += `<div class="card"><h2>${T('x.h')}</h2><div class="exports"><button type="button" class="btn" id="x-xlsx"${x.status === 'ok' ? '' : ' disabled'}>${T('x.xlsx')}</button><button type="button" class="btn ghost" id="x-csv"${x.status === 'ok' ? '' : ' disabled'}>${T('x.csv')}</button><button type="button" class="btn ghost" id="x-json">${T('x.json')}</button><button type="button" class="btn ghost" id="x-r"${x.status === 'ok' ? '' : ' disabled'}>${T('x.r')}</button>${recordOption()}</div><p class="muted small">${T('x.r.note')}</p></div>
    <div class="nav"><button type="button" class="btn ghost" id="back2">${T('back')}</button></div>`;
  el.innerHTML = h;
  $('back2').addEventListener('click', () => go(2));
  if (x.status === 'ok') {
    el.querySelectorAll('[data-unit]').forEach(i => i.addEventListener('change', () => { S.units[i.dataset.unit] = i.value.trim(); save(); }));
    $('sv-sp').addEventListener('change', e => { S.sp = e.target.value.trim(); save(); });
    $('sv-cit').addEventListener('change', e => { S.cit = e.target.value; save(); });
    $('sv-save').addEventListener('click', saveSets);
    $('lrt-go') && $('lrt-go').addEventListener('click', () => {
      const t = Q.testRestrictions(R.sys, R.vars, R.rows, R.start), out = $('lrt-out');
      if (t.status === 'bad') { out.innerHTML = `<p class="note err small" id="lrt-bad">${esc(T('lrt.bad', { why: T('e.' + t.code) }))}</p>`; return; }
      if (t.status === 'unreliable') { out.innerHTML = `<div class="note warn small" id="lrt-unrel"><p><b>${T('lrt.unrel')}</b></p><ul>${t.reasons.map(q => `<li>${esc(T(q.code, { ...q, names: (q.names || []).join(', '), cond: q.cond != null ? q.cond.toExponential(1) : '', lls: (q.lls || []).map(v => f(v, 3)).join('; '), llu: f(q.llu, 4), llr: f(q.llr, 4) }))}</li>`).join('')}</ul>
        <p>${esc(T('lrt.unrel.info', { L: f(t.LR, 4), df: t.df, lr: f(t.restricted.logLik, 4), lu: f(t.unrestricted.logLik, 4) }))}</p></div><p class="muted small">${esc(T('lrt.names', { n: Object.entries(t.renamed).map(([k, v]) => `${k} → ${v.join(', ')}`).join('; ') }))}</p>`; return; }
      out.innerHTML = `<p class="note small" id="lrt-res">${esc(T('lrt.res', { L: f(t.LR, 4), df: t.df, p: t.p == null ? '–' : t.p < 1e-4 ? '< 0.0001' : f(t.p, 4), lr: f(t.restricted.logLik, 4), lu: f(t.unrestricted.logLik, 4) }))}</p>
        ${t.restricted.converged && t.unrestricted.converged ? '' : `<p class="note warn small">${T('r.noconv')}</p>`}<p class="muted small">${esc(T('lrt.names', { n: Object.entries(t.renamed).map(([k, v]) => `${k} → ${v.join(', ')}`).join('; ') }))}</p>`;
    });
  }
  const name = ext => `${lang === 'tr' ? 'denklem-sistemleri' : 'equation-systems'}-${new Date().toISOString().slice(0, 10)}.${ext}`;
  $('x-r').addEventListener('click', () => {
    const imp = S.tbl.imp, file = imp && imp.kind !== 'dataset' && imp.kind !== 'paste' ? imp.name : null;
    download(name('R'), buildR({ imp, src: S.tbl.src, decimal: S.tbl.decimal || '.', eqs: S.eqs.map(e => ({ y: e.y })), map: S.map }, R, { lang, created: new Date().toISOString(), version: Q.TOOL.version, fileName: file }), 'text/plain;charset=utf-8');
    // a table that was not read from a file (approved package, pasted cells) goes along as CSV for the script to read
    if (!file) download(csvName(imp), tableCsv(S.tbl.src, cellText, S.tbl.decimal || '.'), 'text/csv;charset=utf-8');
  });
  $('x-csv').addEventListener('click', () => downloadCSV(name('csv'), obsTable(), lang));
  $('x-xlsx').addEventListener('click', async () => {
    let XLSX; try { XLSX = await loadXLSX(BASE); } catch (e) { status(T('x.fail'), 'err'); return; }
    download(name('xlsx'), xlsxBlob(XLSX, [{ name: T('x.info'), rows: infoRows(), widths: [28, 100] }, { name: T('x.coef'), rows: coefRows() }, { name: T('x.eq'), rows: eqRows() }, { name: T('x.obs'), rows: obsTable() }]));
  });
  $('x-json').addEventListener('click', () => downloadRecord(name('json'), { tool: Q.TOOL, created: R.created, data: R.data, method: R.method, residualCovariance: R.resid,
    equations: R.eqs.map(e => ({ equation: e.label, response: e.y, formula: e.text })), variables: Object.fromEntries(R.vars.map(v => [v, colName(S.map[v])])), shared: R.sys.shared,
    fits: Object.fromEntries(Object.entries(R.fits).map(([m, g]) => [m, g.status === 'ok' ? { coef: Object.fromEntries(g.names.map((n, j) => [n, g.coef[j]])), se: g.se, vcov: g.vcov, residCov: g.residCov, sigmaUsed: g.sigmaUsed, r2: g.eq.map(e => e.r2), olsR2: g.olsR2, mcelroy: g.mcelroy, logLik: g.logLik, df: g.df, T: g.T, iter: g.iter, dropped: g.dropped } : { status: g.status, code: g.code }])) },
    Q.TOOL, S.tbl ? [['data', S.tbl.imp]] : [], m => status(m, 'err')));
}
async function saveSets() {
  const cit = String(S.cit).trim(), msg = $('sv-msg'), x = R.fit;
  $('sv-units').querySelectorAll('[data-unit]').forEach(i => { S.units[i.dataset.unit] = i.value.trim(); });
  if (!cit) { msg.innerHTML = `<p class="note err small">${T('save.cit.miss')}</p>`; return; }
  const cols = [...new Set([...R.vars.map(v => S.map[v]), ...S.eqs.map(e => e.y)])];
  if (cols.some(c => !S.units['c' + c])) { msg.innerHTML = `<p class="note err small">${T('save.unit.miss')}</p>`; return; }
  const sysId = 'sys' + Date.now().toString(36); let n = 0;
  for (const [i, e] of R.eqs.entries()) {
    const id = Q.ensureForm(e.text, e.vars, e.params), jx = e.params.map(p => x.names.indexOf(p));
    const set = { ...blankSet(id), params: Object.fromEntries(e.params.map((p, l) => [p, x.coef[jx[l]]])), inputs: Object.fromEntries(e.vars.map(v => [v, { unit: S.units['c' + S.map[v]] }])),
      output: { name: e.y, unit: S.units['c' + e.ycol] }, species: S.sp || null, source: { citation: cit }, origin: 'fitted', component: e.label,
      meta: { columns: Object.fromEntries(e.vars.map(v => [v, colName(S.map[v])])), cov: jx.map(a => jx.map(b => String(x.vcov[a][b])).join(' ')).join('; '), shared: R.sys.shared.filter(p => e.params.includes(p)).join(' ') },
      fit: { method: `system of equations, ${R.method} (residual covariance ${R.resid})`, system: sysId, equations: R.eqs.map(q => `${q.y} = ${q.text}`), expr: e.text, vars: e.vars, data: R.data, n: x.T,
        se: jx.map(a => x.se[a]), r2: x.eq[i].r2, residCov: x.residCov, logLik: x.logLik, created: R.created, note: 'cross-equation covariances of the coefficients are not stored in the set' } };
    const r = await saveCoef(set); if (!r.ok) { msg.innerHTML = `<p class="note err small">${esc(r.problems.map(p => p.code).join(', '))}</p>`; return; }
    n++;
  }
  await flush();
  msg.innerHTML = `<p class="note ok small" id="sv-ok">${esc(T('save.ok', { n }))}</p>`;
}
function obsTable() { const x = R.fit; return [['row', ...R.eqs.flatMap(e => [e.y, e.y + '_pred'])], ...x.rows.map((row, t) => [row, ...x.eq.flatMap(e => [e.fitted[t] + e.resid[t], e.fitted[t]])])]; }
function coefRows() { const rows = [[T('r.name'), ...['OLS', 'SUR', 'ISUR'].flatMap(m => [m, m + ' SE'])]]; R.fit.names.forEach((n, j) => rows.push([n, ...['OLS', 'SUR', 'ISUR'].flatMap(m => R.fits[m].status === 'ok' ? [R.fits[m].coef[j], R.fits[m].se[j]] : [null, null])])); return rows; }
function eqRows() { const x = R.fit; return [[T('r.eq'), 'y', 'formula', 'R2', 'SSR', 'sigma'], ...x.eq.map((e, i) => [R.eqs[i].label, R.eqs[i].y, R.eqs[i].text, e.r2, e.ssr, Math.sqrt(x.residCov[i][i])]), [], ['OLS R2', x.olsR2], ['McElroy R2', x.mcelroy], ['logLik', x.logLik], ['df', x.df]]; }
function infoRows() {
  return [[T('x.k'), T('x.v')], [T('x.tool'), `${Q.TOOL.id} ${Q.TOOL.version}`], [T('x.date'), R.created], [T('x.data'), R.data], [T('m.method'), `${R.method}; ${T('r.' + R.resid)}`],
    ...R.eqs.map(e => [e.label, `${e.y} = ${e.text}`]), [T('n.shared'), R.sys.shared.join(', ')],
    [T('x.src'), 'Henningsen, A., Hamann, J.D. 2007. systemfit. Journal of Statistical Software 23(4)'], [T('x.src'), 'Parresol, B.R. 2001. Can. J. For. Res. 31: 865–878 (nonlinear systems, Eq. 20–26)'], [T('x.rule'), T('r.note')]];
}

/* ---------------- shell ---------------- */
function canGo(n) { if (n <= 1) return true; if (!S.tbl || !S.tbl.src) return false; if (n === 2) return true; return !systemOf().probs.length; }
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
    if (saved && saved.v === 1) { S = { ...blank(), ...saved }; status(T('restored', { when: new Date(saved.saved).toLocaleString(LOC) })); }
    if (S.tbl && S.tbl.imp && S.tbl.imp.buf && !S.tbl.src) S.tbl.src = await readImport(S.tbl.imp, BASE).catch(() => null);
  } catch (e) { S = blank(); }
  render();
})();
