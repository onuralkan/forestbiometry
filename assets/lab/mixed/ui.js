// Mixed-effects models (SM-03): user interface. All arithmetic in calc.js (tested in tests/mixed/).
import * as MX from './calc.js';
import * as NL from '../nlsreg/calc.js';
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

const BASE = './', KEY = 'session:' + MX.TOOL.id, LOC = lang === 'tr' ? 'tr-TR' : 'en-GB', $ = id => document.getElementById(id);
const f = (x, d = 4) => x == null || !Number.isFinite(x) ? '–' : fmtNum(x, d);
function sig(x) { return x == null || !Number.isFinite(x) ? '–' : x === 0 ? '0' : Math.abs(x) >= 1e-4 && Math.abs(x) < 1e6 ? fmtNum(Number(x.toPrecision(7)), 14) : x.toExponential(6); }
const num = t => { const r = parseNumber(String(t ?? '').trim(), '.'); return r.status === 'ok' ? r.value : NaN; };
let S = blank(), R = null;
function blank() { return { v: 1, step: 1, tbl: null, g: null, y: null, models: [newModel()], cit: '', sp: '', saveIdx: 0, units: {}, cal: { idx: 0, text: '', pts: '', iterate: false }, lrt: [0, 1] }; }
function newModel(kind = 'linear') { return { kind, method: 'REML', cov: 'diag', terms: [{ col: null, tf: 'ln' }], rInt: true, rTerms: [false], ready: 'cr', expr: '', map: {}, starts: {}, rpar: {}, vvar: '' }; }
const AS = autosave(KEY, () => ({ ...S, saved: new Date().toISOString() }));
function save() { AS.save(); }
function flush() { return AS.flush(); }
function status(m, k = '') { const s = $('status'); s.className = 'status ' + k; s.textContent = m || ''; }
const headers = () => S.tbl && S.tbl.src ? S.tbl.src.headers.map(h => String(h)) : [];
const colName = c => c == null ? '–' : headers()[c] ?? '–';
const mLabel = i => T('m.label', { i: i + 1 });
/** A name usable in a formula for column c (the heading if it is one, else x<c+1>). */
const vname = c => { const h = colName(c).trim(); return /^[A-Za-z_][A-Za-z0-9_]*$/.test(h) && !['exp', 'ln', 'log', 'log10', 'sqrt', 'abs', 'pi'].includes(h) ? h : 'x' + (c + 1); };

/* ---------------- step 1: data ---------------- */
function setTable(st) {
  if (!st.src) { S.tbl = null; save(); renderStep1(); return; }
  S.tbl = { imp: st.imp, src: st.src, decimal: null, decChosen: false }; S.g = null; S.y = null; R = null;
  status(''); save(); renderStep1();
}
function dataRows() {
  const t = S.tbl, src = t.src;
  return src.rows.map((r, i) => ({ row: src.rowNumbers[i], g: S.g == null ? null : String(cellText(r[S.g]) ?? '').trim(),
    cols: src.headers.map((_, c) => { const x = r[c]; if (x && x.t === 'n') return x.v; const p = parseNumber(cellText(x), t.decimal || '.'); return p.status === 'ok' ? p.value : null; }) }));
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
    const buf = await (await fetch(BASE + 'assets/lab/mixed/ornek/ornek-karma.csv')).arrayBuffer();
    const imp = { kind: 'csv', name: lang === 'tr' ? 'ornek-karma.csv (benzetim)' : 'ornek-karma.csv (simulated)', buf, encoding: 'utf-8', delim: null, header: true, sheet: null };
    setTable({ imp, src: await readImport(imp, BASE) }); S.tbl.decimal = ','; S.tbl.decChosen = true;
    const H = headers().map(x => x.toLowerCase()); S.g = H.indexOf('alan'); S.y = H.indexOf('h_m');
    const D = H.indexOf('d_cm');
    S.models = [{ ...newModel('linear'), terms: [{ col: D, tf: 'ln' }], rTerms: [true], cov: 'symm' },
      { ...newModel('nonlinear'), kind: 'nonlinear', method: 'ML', ready: 'formula', expr: '1.3 + a*(1-exp(-b*D_cm))^c', map: { D_cm: D }, starts: { a: '28', b: '0.045', c: '1.2' }, rpar: { a: true } }];
    save(); renderStep1();
  });
  $('reset').addEventListener('click', async () => { S = blank(); R = null; status(''); render(); await del(KEY); });
  $('to2').addEventListener('click', () => go(2));
}

/* ---------------- step 2: models ---------------- */
/** Definition of model md (index i): the columns it uses and the problems that keep it from being fitted. */
function modelOf(md, i) {
  const m = mLabel(i), probs = [];
  if (md.kind === 'linear') {
    if (!md.terms.length || md.terms.some(t => t.col == null || t.col < 0)) probs.push(T('p.terms', { m }));
    if (!md.rInt && !md.rTerms.some(Boolean)) probs.push(T('p.rand', { m }));
    const vcol = md.vvar === '' ? null : +md.vvar;
    if (vcol != null && !md.terms.some(t => t.col === vcol)) probs.push(T('p.vcol', { m }));
    return { probs, cols: [...md.terms.map(t => t.col), ...(vcol != null ? [vcol] : [])], vcol };
  }
  let expr, vars;
  if (md.ready !== 'formula') { const R0 = NL.READY[md.ready]; expr = R0.expr; vars = R0.vars; for (const v of vars) if (md.map[v] == null || md.map[v] < 0) probs.push(T('p.var', { m, v })); }
  else { const r = parse(md.expr); if (!r.ok) return { probs: [T('p.expr', { m, why: T('px.' + r.code, r) })] }; expr = md.expr; vars = r.names.filter(n => md.map[n] != null && md.map[n] >= 0); }
  const nm = MX.nonlinearModel(expr, vars);
  if (!nm.ok) return { probs: [...probs, T('p.compile', { m, why: nm.code === 'parse' ? T('px.' + nm.parse.code, nm.parse) : T('c.' + nm.code) })] };
  const params = nm.model.params, st = params.map(p => String(md.starts[p] ?? '').trim()), given = st.some(s => s !== '');
  if (md.ready === 'formula' || given) { const miss = params.filter((p, j) => st[j] === ''); if (miss.length) probs.push(T('p.start', { m, p: miss.join(', ') })); else if (st.some(s => !Number.isFinite(num(s)))) probs.push(T('p.startnum', { m })); }
  if (!params.some(p => md.rpar[p])) probs.push(T('p.rand', { m }));
  const vcol = md.vvar === '' ? null : +md.vvar;
  if (vcol != null && !nm.model.vars.some(v => md.map[v] === vcol)) probs.push(T('p.vcol', { m }));
  return { probs, nm: nm.model, start: md.ready === 'formula' || given ? st.map(num) : null, cols: [...nm.model.vars.map(v => md.map[v]), ...(vcol != null ? [vcol] : [])], vcol };
}
function step2Problems() {
  const p = [];
  if (S.g == null) p.push(T('p.g'));
  if (S.y == null) p.push(T('p.y'));
  if (!S.models.length) p.push(T('p.models'));
  S.models.forEach((md, i) => p.push(...modelOf(md, i).probs));
  return p;
}
function renderStep2() {
  const el = $('step2'), H = headers();
  const opts = (cur, none = T('none')) => `<option value="">${none}</option>` + H.map((x, i) => `<option value="${i}"${cur === i ? ' selected' : ''}>${esc(x)}</option>`).join('');
  let h = `<div class="card"><div class="lims"><label>${T('g.h')} <select id="gsel">${opts(S.g)}</select></label><label>${T('y.h')} <select id="ysel">${opts(S.y)}</select></label></div></div><div class="card"><h2>${T('m.h')}</h2><p class="muted small">${T('m.sub')}</p>`;
  S.models.forEach((md, i) => {
    const def = modelOf(md, i);
    h += `<fieldset class="fam mdl" data-m="${i}"><legend>${mLabel(i)}</legend><div class="lims"><label>${T('m.kind')} <select data-k="kind">${['linear', 'nonlinear'].map(k => `<option value="${k}"${md.kind === k ? ' selected' : ''}>${T('k.' + k)}</option>`).join('')}</select></label>
      <label>${T('m.method')} <select data-k="method">${['REML', 'ML'].map(k => `<option${md.method === k ? ' selected' : ''}>${k}</option>`).join('')}</select></label>
      ${S.models.length > 1 ? `<button type="button" class="btn ghost small" data-k="rm">${T('m.rm')}</button>` : ''}</div>`;
    let varCols = [];
    if (md.kind === 'linear') {
      h += `<div class="tscroll"><table class="grid" data-k="terms"><thead><tr><th>${T('l.term')}</th><th>${T('l.tf')}</th><th>${T('l.rand')}</th><th></th></tr></thead><tbody>
        ${md.terms.map((t, j) => `<tr><td><select data-tcol="${j}">${opts(t.col)}</select></td><td><select data-ttf="${j}">${['x', 'ln', 'sq'].map(k => `<option value="${k}"${t.tf === k ? ' selected' : ''}>${T('tf.' + k)}</option>`).join('')}</select></td>
          <td><input type="checkbox" data-trand="${j}"${md.rTerms[j] ? ' checked' : ''}></td><td>${md.terms.length > 1 ? `<button type="button" class="btn ghost small" data-trm="${j}">${T('m.rm')}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>
        <p><label class="chk small"><input type="checkbox" data-k="rint"${md.rInt ? ' checked' : ''}> ${T('l.rint')}</label> <button type="button" class="btn ghost small" data-k="tadd">${T('l.add')}</button></p><p class="muted small">${T('l.terms')}</p>`;
      varCols = md.terms.map(t => t.col).filter(c => c != null);
    } else {
      h += `<div class="lims"><label>${T('n.form')} <select data-k="ready">${NL.READY_IDS.map(id => `<option value="${id}"${md.ready === id ? ' selected' : ''}>${esc(NL.READY[id].name)}: y = ${esc(NL.READY[id].expr)}</option>`).join('')}<option value="formula"${md.ready === 'formula' ? ' selected' : ''}>${T('n.formula')}</option></select></label></div>`;
      let names = [];
      if (md.ready === 'formula') {
        h += `<label class="field"><span>${T('n.expr')}</span><input type="text" data-k="expr" value="${esc(md.expr)}" placeholder="${esc(T('n.expr.ph'))}" spellcheck="false" autocomplete="off"></label><p class="muted small">${T('n.syntax')}</p>`;
        const r = parse(md.expr); if (r.ok) names = r.names; else if (md.expr.trim()) h += `<p class="note err small" data-k="perr">${esc(T('px.' + r.code, r))}</p>`;
      } else names = [...NL.READY[md.ready].vars, ...NL.compile({ kind: 'ready', ready: md.ready }).params];
      if (names.length) {
        const isVar = n => md.ready === 'formula' ? md.map[n] != null && md.map[n] >= 0 : NL.READY[md.ready].vars.includes(n);
        h += `<div class="tscroll"><table class="grid" data-k="names"><thead><tr><th>${T('n.names')}</th><th>${T('n.role')}</th><th>${T('n.start')}</th><th>${T('n.rand')}</th></tr></thead><tbody>
          ${names.map(n => `<tr><th><code>${esc(n)}</code></th><td>${md.ready === 'formula' || isVar(n) ? `<select data-map="${esc(n)}">${opts(md.map[n] ?? null, md.ready === 'formula' ? T('n.par') : T('none'))}</select>` : `<span class="muted small">${T('n.par')}</span>`}</td>
            <td>${isVar(n) ? '' : `<input type="text" inputmode="decimal" size="9" data-start="${esc(n)}" value="${esc(md.starts[n] ?? '')}" placeholder="${md.ready === 'formula' ? '' : esc(T('n.auto'))}">`}</td>
            <td>${isVar(n) ? '' : `<input type="checkbox" data-rpar="${esc(n)}"${md.rpar[n] ? ' checked' : ''}>`}</td></tr>`).join('')}</tbody></table></div>`;
        varCols = names.filter(isVar).map(n => md.map[n]).filter(c => c != null && c >= 0);
      }
    }
    const nr = md.kind === 'linear' ? (md.rInt ? 1 : 0) + md.rTerms.filter(Boolean).length : Object.values(md.rpar).filter(Boolean).length;
    h += `<div class="lims">${nr > 1 ? `<label>${T('m.cov')} <select data-k="cov">${['diag', 'symm'].map(k => `<option value="${k}"${md.cov === k ? ' selected' : ''}>${T('cov.' + k)}</option>`).join('')}</select></label>` : ''}
      <label>${T('m.var')} <select data-k="vvar"><option value="">${T('var.none')}</option>${[...new Set(varCols)].map(c => `<option value="${c}"${md.vvar === String(c) ? ' selected' : ''}>${esc(T('var.power', { v: colName(c) }))}</option>`).join('')}</select></label></div></fieldset>`;
    void def;
  });
  h += `<p><button type="button" class="btn ghost small" id="madd">${T('m.add')}</button></p></div>`;
  const pr = step2Problems();
  h += `<div class="nav"><button type="button" class="btn ghost" id="back1">${T('back')}</button><button type="button" class="btn" id="calc"${pr.length ? ' disabled' : ''}>${T('calc')}</button>${pr.length ? `<span class="muted small" id="s2prob">${pr.map(esc).join(' · ')}</span>` : ''}</div>`;
  el.innerHTML = h;
  const re = () => { R = null; save(); renderStep2(); renderSteps(); };
  $('gsel').addEventListener('change', e => { S.g = e.target.value === '' ? null : +e.target.value; re(); });
  $('ysel').addEventListener('change', e => { S.y = e.target.value === '' ? null : +e.target.value; re(); });
  el.querySelectorAll('fieldset.mdl').forEach(fs => {
    const i = +fs.dataset.m, md = S.models[i], q = s => fs.querySelector(s), on = (s, ev, fn) => { const x = q(s); if (x) x.addEventListener(ev, fn); };
    on('[data-k="kind"]', 'change', e => { S.models[i] = { ...newModel(e.target.value), method: md.method }; re(); });
    on('[data-k="method"]', 'change', e => { md.method = e.target.value; re(); });
    on('[data-k="rm"]', 'click', () => { S.models.splice(i, 1); re(); });
    on('[data-k="cov"]', 'change', e => { md.cov = e.target.value; re(); });
    on('[data-k="vvar"]', 'change', e => { md.vvar = e.target.value; re(); });
    on('[data-k="rint"]', 'change', e => { md.rInt = e.target.checked; re(); });
    on('[data-k="tadd"]', 'click', () => { md.terms.push({ col: null, tf: 'x' }); md.rTerms.push(false); re(); });
    fs.querySelectorAll('[data-tcol]').forEach(x => x.addEventListener('change', () => { md.terms[+x.dataset.tcol].col = x.value === '' ? null : +x.value; re(); }));
    fs.querySelectorAll('[data-ttf]').forEach(x => x.addEventListener('change', () => { md.terms[+x.dataset.ttf].tf = x.value; re(); }));
    fs.querySelectorAll('[data-trand]').forEach(x => x.addEventListener('change', () => { md.rTerms[+x.dataset.trand] = x.checked; re(); }));
    fs.querySelectorAll('[data-trm]').forEach(x => x.addEventListener('click', () => { md.terms.splice(+x.dataset.trm, 1); md.rTerms.splice(+x.dataset.trm, 1); re(); }));
    on('[data-k="ready"]', 'change', e => { md.ready = e.target.value; md.map = {}; md.starts = {}; md.rpar = {}; re(); });
    on('[data-k="expr"]', 'change', e => {
      md.expr = e.target.value; const r = parse(md.expr);
      if (r.ok) { const HL = headers().map(x => x.trim().toLowerCase()); for (const n of r.names) if (!(n in md.map)) { const k = HL.indexOf(n.toLowerCase()); md.map[n] = k >= 0 ? k : null; } }
      re();
    });
    fs.querySelectorAll('[data-map]').forEach(x => x.addEventListener('change', () => { md.map[x.dataset.map] = x.value === '' ? null : +x.value; re(); }));
    fs.querySelectorAll('[data-start]').forEach(x => x.addEventListener('change', () => { md.starts[x.dataset.start] = x.value.trim(); re(); }));
    fs.querySelectorAll('[data-rpar]').forEach(x => x.addEventListener('change', () => { md.rpar[x.dataset.rpar] = x.checked; re(); }));
  });
  $('madd').addEventListener('click', () => { S.models.push(newModel()); re(); });
  $('back1').addEventListener('click', () => go(1));
  $('calc').addEventListener('click', () => { status(T('busy')); setTimeout(() => { compute(); status(''); go(3); }, 30); });
}

/* ---------------- step 3: results ---------------- */
function compute() {
  const rows = dataRows(), defs = S.models.map((md, i) => ({ md, i, ...modelOf(md, i) }));
  const used = new Set([S.y, ...defs.flatMap(d => d.cols)]);
  const keep = [], dropped = [];
  for (const r of rows) { const bad = r.g == null || r.g === '' ? 'group' : [...used].find(c => !Number.isFinite(r.cols[c])); if (bad != null && bad !== undefined) dropped.push({ row: r.row }); else keep.push(r); }
  const fits = defs.map(d => fitOne(d, keep));
  // rows dropped by a model's own validity (ln of x ≤ 0, non-positive variance covariate) are the same for all models
  R = { created: new Date().toISOString(), data: S.tbl.imp ? S.tbl.imp.name : '', yName: colName(S.y), gName: colName(S.g), dropped, fits, n: keep.length, groups: new Set(keep.map(r => r.g)).size };
  if (!R.fits[S.saveIdx] || R.fits[S.saveIdx].fit.status !== 'ok') S.saveIdx = Math.max(0, R.fits.findIndex(q => q.fit.status === 'ok'));
  if (!R.fits[S.cal.idx] || R.fits[S.cal.idx].fit.status !== 'ok') S.cal.idx = S.saveIdx;
}
function fitOne(d, rows) {
  const md = d.md, label = mLabel(d.i);
  if (md.kind === 'linear') {
    const terms = md.terms.map(t => ({ name: vname(t.col), tf: t.tf })), random = { intercept: md.rInt, terms: md.rTerms.map((b, j) => b ? j : -1).filter(j => j >= 0) };
    const vals = r => Object.fromEntries(md.terms.map(t => [vname(t.col), r.cols[t.col]]));
    const b = MX.buildLinear(rows.map(r => ({ row: r.row, g: r.g, y: r.cols[S.y], vals: vals(r) })), terms, random, d.vcol != null ? vname(d.vcol) : null);
    const q = b.rnames.length;
    const fit = b.groups.length < 3 ? { status: 'bad', code: 'groups' } : MX.fitLMM(b.groups, { cov: q > 1 ? md.cov : 'diag', q, power: d.vcol != null, method: md.method });
    const vars = [...new Set(md.terms.map(t => vname(t.col)))];
    return { i: d.i, label, kind: 'linear', md: JSON.parse(JSON.stringify(md)), b, fit, text: b.text, params: b.names, rnames: b.rnames, vars, varCols: vars.map(v => md.terms.find(t => vname(t.col) === v).col),
      fitted: fit.status === 'ok' ? MX.lmmFitted(b.groups, fit) : null };
  }
  const nm = d.nm, varCols = nm.vars.map(v => md.map[v]);
  const b = MX.buildNonlinear(rows.map(r => ({ row: r.row, g: r.g, y: r.cols[S.y], vals: Object.fromEntries(nm.vars.map((v, j) => [v, r.cols[varCols[j]]])) })), nm.vars, d.vcol != null ? nm.vars[varCols.indexOf(d.vcol)] : null);
  const random = nm.params.map((p, j) => md.rpar[p] ? j : -1).filter(j => j >= 0), model = { ...nm, random };
  // start: a pooled nonlinear least-squares fit (SM-02 engine) from the given or automatic starting values
  const X = b.groups.flatMap(g => g.x), y = b.groups.flatMap(g => g.y), comp = NL.compile(md.ready === 'formula' ? { kind: 'formula', expr: md.expr, vars: nm.vars } : { kind: 'ready', ready: md.ready });
  let start = d.start;
  if (comp.ok) { const pf = NL.fitModel(comp, X, y, { start: d.start, readyId: md.ready === 'formula' ? null : md.ready }); if (pf.status === 'ok') start = comp.params.map(p => pf.theta[comp.params.indexOf(p)]); }
  if (start && md.ready !== 'formula' && comp.ok) start = nm.params.map(p => start[comp.params.indexOf(p)]);
  const fit = !start ? { status: 'bad', code: 'start' } : b.groups.length < 3 ? { status: 'bad', code: 'groups' } : MX.fitNLME(model, b.groups, { cov: random.length > 1 ? md.cov : 'diag', power: d.vcol != null, method: md.method }, { start });
  let fitted = null;
  if (fit.status === 'ok') fitted = b.groups.map((g, i) => g.x.map(x => { const ph = fit.beta.slice(); random.forEach((j, l) => { ph[j] += fit.ranef[i].b[l]; }); return [model.f(fit.beta, x), model.f(ph, x)]; }));
  return { i: d.i, label, kind: 'nonlinear', md: JSON.parse(JSON.stringify(md)), b, fit, model, start, text: nm.text, params: nm.params, rnames: random.map(j => nm.params[j]), vars: nm.vars, varCols, fitted };
}
const rowsText = rows => { const r = rows.filter(x => x != null); return r.length > 25 ? r.slice(0, 25).join(', ') + ' …' : r.join(', '); };
const modelText = q => `${q.label}: y = ${q.text}`;
const stText = q => q.fit.status === 'ok' ? T('st.ok') : `${T('st.bad')}: ${T('e.' + q.fit.code)}`;
const covText = q => `${q.fit.method}, ${q.rnames.join(', ')}${q.rnames.length > 1 ? ' · ' + T('cov.' + q.fit.cov) : ''}${q.fit.power ? ' · δ' : ''}`;
function renderStep3() {
  if (!R) compute();
  const el = $('step3'), ok = R.fits.filter(q => q.fit.status === 'ok');
  let h = `<div class="card"><h2>${T('r.cmp')}</h2><p class="small" id="r-n">${esc(T('r.n', { n: R.n, g: R.groups }))}</p>${R.dropped.length ? `<p class="note warn small" id="r-drop">${esc(T('r.drop', { n: R.dropped.length, rows: rowsText(R.dropped.map(d => d.row)) }))}</p>` : ''}
    <div class="tscroll"><table class="grid" id="cmptab"><thead><tr><th>${T('r.model')}</th><th>${T('r.method')}</th><th>${T('r.k')}</th><th>${T('r.ll')}</th><th>${T('r.aic')}</th><th>${T('r.bic')}</th><th>${T('r.sigma')}</th><th>${T('r.st')}</th></tr></thead><tbody>
    ${R.fits.map(q => `<tr data-m="${q.i}"><th class="small">${esc(modelText(q))}</th>${q.fit.status === 'ok' ? `<td class="small">${esc(covText(q))}</td><td class="num">${q.fit.k}</td><td class="num" data-k="ll">${f(q.fit.ll, 4)}</td><td class="num" data-k="aic">${f(q.fit.aic, 3)}</td><td class="num">${f(q.fit.bic, 3)}</td><td class="num">${sig(q.fit.sigma)}</td>` : '<td colspan="6"></td>'}<td class="small" data-k="st">${esc(stText(q))}</td></tr>`).join('')}</tbody></table></div>
    <p class="muted small">${T('r.cmpnote')}</p></div>`;
  if (ok.length > 1) h += `<div class="card" id="lrtcard"><h2>${T('lrt.h')}</h2><p class="muted small">${T('lrt.sub')}</p><div class="lims">${[0, 1].map(k => `<select data-lrt="${k}">${ok.map(q => `<option value="${q.i}"${S.lrt[k] === q.i ? ' selected' : ''}>${esc(q.label)}</option>`).join('')}</select>`).join(' ')}<button type="button" class="btn ghost small" id="lrt-go">${T('lrt.go')}</button></div><div id="lrt-out"></div></div>`;
  for (const q of ok) {
    const x = q.fit, sd = x.D.map((r, i) => Math.sqrt(r[i]));
    h += `<div class="card" data-fit="${q.i}"><h2>${esc(modelText(q))}</h2><p class="muted small">${esc(covText(q))}</p>
      <h3>${T('f.h')}</h3><div class="tscroll"><table class="grid" data-fix="${q.i}"><thead><tr><th></th><th>${T('f.est')}</th><th>${T('f.se')}</th><th>${T('f.t')}</th></tr></thead><tbody>
      ${q.params.map((p, j) => `<tr><th><code>${esc(p)}</code></th><td class="num" data-k="b${j}">${sig(x.beta[j])}</td><td class="num">${sig(x.se[j])}</td><td class="num">${f(x.beta[j] / x.se[j], 3)}</td></tr>`).join('')}</tbody></table></div>
      <h3>${T('r.h')}</h3><div class="tscroll"><table class="grid" data-vc="${q.i}"><thead><tr><th></th><th>${T('r.sd')}</th>${q.rnames.length > 1 ? `<th>${T('r.corr')}</th>` : ''}</tr></thead><tbody>
      ${q.rnames.map((n, j) => `<tr><th><code>${esc(n)}</code></th><td class="num" data-k="sd${j}">${sig(sd[j])}</td>${q.rnames.length > 1 ? `<td class="num">${q.rnames.map((_, l) => l < j ? f(x.D[j][l] / (sd[j] * sd[l]), 3) : '').filter(Boolean).join(' ')}</td>` : ''}</tr>`).join('')}
      <tr><th>${T('r.resid')}</th><td class="num" data-k="sigma">${sig(x.sigma)}</td>${q.rnames.length > 1 ? '<td></td>' : ''}</tr>${x.power ? `<tr><th>${T('r.delta')}</th><td class="num" data-k="delta">${sig(x.delta)}</td>${q.rnames.length > 1 ? '<td></td>' : ''}</tr>` : ''}</tbody></table></div>
      <details class="more"><summary>${T('re.h', { n: x.ranef.length })}</summary><div class="tscroll"><table class="grid"><thead><tr><th>${T('re.g')}</th>${q.rnames.map(n => `<th>${esc(n)}</th>`).join('')}</tr></thead><tbody>${x.ranef.map(r => `<tr><th>${esc(r.id)}</th>${r.b.map(v => `<td class="num">${sig(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>
      <div class="charts2"><figure class="chartbox">${scatterChart({ title: T('ch.obs', { m: q.label }), points: q.b.groups.flatMap((g, i) => g.y.map((o, t) => [o, q.fitted[i][t][1]])), xLabel: T('ch.xo'), yLabel: T('ch.yo'), equal: true, fmt: v => fmtNum(v, 3), width: 420, height: 340 })}</figure>
      <figure class="chartbox">${scatterChart({ title: T('ch.res', { m: q.label }), points: q.b.groups.flatMap((g, i) => g.y.map((o, t) => [q.fitted[i][t][1], q.fitted[i][t][1] - o])), xLabel: T('ch.x'), yLabel: T('ch.y'), hline: 0, fmt: v => fmtNum(v, 3), width: 420, height: 340 })}</figure></div></div>`;
  }
  if (ok.length) {
    const cq = R.fits[S.cal.idx], cols = [...cq.vars.map(v => `${v} (${colName(cq.varCols[cq.vars.indexOf(v)])})`), `y (${R.yName})`].join(', ');
    h += `<div class="card" id="calcard"><h2>${T('cal.h')}</h2><p class="muted small">${esc(T('cal.sub', { cols }))}</p><div class="lims"><label>${T('cal.model')} <select id="cal-m">${ok.map(q => `<option value="${q.i}"${S.cal.idx === q.i ? ' selected' : ''}>${esc(q.label)}</option>`).join('')}</select></label>
      ${cq.kind === 'nonlinear' ? `<label class="chk small"><input type="checkbox" id="cal-it"${S.cal.iterate ? ' checked' : ''}> ${T('cal.iter')}</label>` : ''}</div>
      <label class="field"><span>${T('cal.obs')}</span><textarea id="cal-obs" rows="4" spellcheck="false">${esc(S.cal.text)}</textarea></label>
      ${cq.vars.length === 1 ? `<label class="field"><span>${esc(T('cal.pts', { v: cq.vars[0] }))}</span><input type="text" id="cal-pts" value="${esc(S.cal.pts)}"></label>` : ''}
      <div class="nav"><button type="button" class="btn ghost" id="cal-go">${T('cal.go')}</button></div><div id="cal-out"></div><p class="muted small">${T('cal.note1')} ${cq.kind === 'nonlinear' ? T('cal.note2') : ''}</p></div>
      <div class="card" id="savecard"><h2>${T('save.h')}</h2><div class="lims"><label>${T('save.model')} <select id="sv-m">${ok.map(q => `<option value="${q.i}"${S.saveIdx === q.i ? ' selected' : ''}>${esc(q.label)}</option>`).join('')}</select></label>
      <label>${T('save.sp')} <input type="text" size="14" id="sv-sp" value="${esc(S.sp)}"></label></div><div class="lims" id="sv-units"></div>
      <label class="field"><span>${T('save.cit')}</span><input type="text" id="sv-cit" value="${esc(S.cit)}" placeholder="${esc(T('save.cit.ph'))}"></label><p class="muted small">${T('save.note')}</p>
      <div class="nav"><button type="button" class="btn" id="sv-save">${T('save.btn')}</button></div><div id="sv-msg"></div></div>`;
  }
  h += `<div class="card"><h2>${T('x.h')}</h2><div class="exports"><button type="button" class="btn" id="x-xlsx">${T('x.xlsx')}</button><button type="button" class="btn ghost" id="x-csv">${T('x.csv')}</button><button type="button" class="btn ghost" id="x-json">${T('x.json')}</button><button type="button" class="btn ghost" id="x-r">${T('x.r')}</button>${recordOption()}</div><p class="muted small">${T('x.r.note')}</p></div>
    <div class="nav"><button type="button" class="btn ghost" id="back2">${T('back')}</button></div>`;
  el.innerHTML = h;
  $('back2').addEventListener('click', () => go(2));
  if ($('lrt-go')) {
    el.querySelectorAll('[data-lrt]').forEach(x => x.addEventListener('change', () => { S.lrt[+x.dataset.lrt] = +x.value; save(); }));
    $('lrt-go').addEventListener('click', () => {
      const a = R.fits[S.lrt[0]], b = R.fits[S.lrt[1]], out = $('lrt-out');
      if (a.fit.method !== 'ML' || b.fit.method !== 'ML') { out.innerHTML = `<p class="note err small" id="lrt-bad">${T('lrt.ml')}</p>`; return; }
      const [s, l] = a.fit.k <= b.fit.k ? [a, b] : [b, a], r = MX.lrt(s.fit, l.fit);
      out.innerHTML = `<p class="note small" id="lrt-res">${esc(T('lrt.res', { L: f(r.L, 4), df: r.df, p: r.p == null ? '–' : r.p < 1e-4 ? '< 0.0001' : f(r.p, 4) }))}</p>`;
    });
  }
  if (ok.length) {
    $('cal-m').addEventListener('change', e => { S.cal.idx = +e.target.value; save(); renderStep3(); });
    $('cal-it') && $('cal-it').addEventListener('change', e => { S.cal.iterate = e.target.checked; save(); });
    $('cal-go').addEventListener('click', () => { S.cal.text = $('cal-obs').value; if ($('cal-pts')) S.cal.pts = $('cal-pts').value; save(); renderCal(); });
    if (S.cal.text.trim()) renderCal();
    $('sv-m').addEventListener('change', e => { S.saveIdx = +e.target.value; save(); renderUnits(); });
    $('sv-sp').addEventListener('change', e => { S.sp = e.target.value.trim(); save(); });
    $('sv-cit').addEventListener('change', e => { S.cit = e.target.value; save(); });
    $('sv-save').addEventListener('click', saveSet);
    renderUnits();
  }
  const name = ext => `${lang === 'tr' ? 'karma-modeller' : 'mixed-models'}-${new Date().toISOString().slice(0, 10)}.${ext}`;
  $('x-csv').addEventListener('click', () => downloadCSV(name('csv'), obsTable(), lang));
  $('x-r').addEventListener('click', () => {
    const imp = S.tbl.imp, file = imp && imp.kind !== 'dataset' && imp.kind !== 'paste' ? imp.name : null, cq = R.fits[S.cal.idx];
    // the calibration card's group, as the card reads it (only when it can be computed)
    let cal = null;
    if (cq && cq.fit.status === 'ok' && S.cal.text.trim()) {
      const nv = cq.vars.length, lines = S.cal.text.split('\n').map(l => l.trim()).filter(Boolean).map(l => l.split(/[\s;]+/).map(v => num(v.replace(',', '.'))));
      if (lines.length && lines.every(r => r.length >= nv + 1 && r.slice(0, nv + 1).every(Number.isFinite)))
        cal = { idx: S.cal.idx, lines: lines.map(r => r.slice(0, nv + 1)), pts: nv === 1 ? S.cal.pts.split(/[\s;]+/).map(v => num(v.replace(',', '.'))).filter(Number.isFinite).map(v => [v]) : [], iterate: !!S.cal.iterate };
    }
    download(name('R'), buildR({ imp, src: S.tbl.src, decimal: S.tbl.decimal || '.', g: S.g, y: S.y, vname }, R, cal, S.lrt, { lang, created: new Date().toISOString(), version: MX.TOOL.version, fileName: file }), 'text/plain;charset=utf-8');
    // a table that was not read from a file (approved package, pasted cells) goes along as CSV for the script to read
    if (!file) download(csvName(imp), tableCsv(S.tbl.src, cellText, S.tbl.decimal || '.'), 'text/csv;charset=utf-8');
  });
  $('x-xlsx').addEventListener('click', async () => {
    let XLSX; try { XLSX = await loadXLSX(BASE); } catch (e) { status(T('x.fail'), 'err'); return; }
    download(name('xlsx'), xlsxBlob(XLSX, [{ name: T('x.info'), rows: infoRows(), widths: [28, 100] }, { name: T('x.cmp'), rows: cmpRows() }, { name: T('x.fix'), rows: fixRows() }, { name: T('x.re'), rows: reRows() }, { name: T('x.obs'), rows: obsTable() }]));
  });
  $('x-json').addEventListener('click', () => downloadRecord(name('json'), { tool: MX.TOOL, created: R.created, data: R.data, group: R.gName, response: R.yName, n: R.n, groups: R.groups, dropped: R.dropped,
    fits: R.fits.map(q => ({ model: q.label, kind: q.kind, formula: q.text, vars: Object.fromEntries(q.vars.map((v, j) => [v, colName(q.varCols[j])])), random: q.rnames, status: q.fit.status, code: q.fit.code ?? null,
      ...(q.fit.status === 'ok' ? { method: q.fit.method, cov: q.fit.cov, beta: q.fit.beta, se: q.fit.se, vcov: q.fit.vcov, D: q.fit.D, sigma: q.fit.sigma, delta: q.fit.delta, logLik: q.fit.ll, k: q.fit.k, AIC: q.fit.aic, BIC: q.fit.bic, ranef: q.fit.ranef } : {}) })) },
    MX.TOOL, S.tbl ? [['data', S.tbl.imp]] : [], m => status(m, 'err')));
}
function renderCal() {
  const q = R.fits[S.cal.idx], box = $('cal-out'); if (!q || q.fit.status !== 'ok' || !box) return;
  const lines = S.cal.text.split('\n').map(l => l.trim()).filter(Boolean).map(l => l.split(/[\s;]+/).map(v => num(v.replace(',', '.'))));
  const nv = q.vars.length;
  if (!lines.length || lines.some(r => r.length < nv + 1 || r.slice(0, nv + 1).some(v => !Number.isFinite(v)))) { box.innerHTML = `<p class="note err small" id="cal-bad">${T('cal.bad')}</p>`; return; }
  const vIdx = q.fit.power ? q.vars.indexOf(q.kind === 'linear' ? vname(+q.md.vvar) : q.vars[q.varCols.indexOf(+q.md.vvar)]) : -1;
  let res, predict;
  if (q.kind === 'linear') {
    const tf = q.md.terms.map(t => MX.TRANSFORMS[t.tf].f), xOf = vals => q.md.terms.map((t, j) => tf[j](vals[q.vars.indexOf(vname(t.col))]));
    const obs = lines.map(r => { const x = xOf(r); return { y: r[nv], X: [1, ...x], Z: [...(q.md.rInt ? [1] : []), ...q.md.rTerms.map((b, j) => b ? x[j] : null).filter(v => v !== null)], v: vIdx >= 0 ? r[vIdx] : 1 }; });
    res = MX.calibrateLinear(q.fit, obs);
    predict = (vals, b) => { const x = xOf(vals), f0 = [1, ...x].reduce((s, v, j) => s + v * q.fit.beta[j], 0); const z = [...(q.md.rInt ? [1] : []), ...q.md.rTerms.map((bb, j) => bb ? x[j] : null).filter(v => v !== null)]; return [f0, f0 + z.reduce((s, v, l) => s + v * b[l], 0)]; };
  } else {
    const obs = lines.map(r => ({ y: r[nv], x: r.slice(0, nv), v: vIdx >= 0 ? r[vIdx] : 1 }));
    res = MX.calibrateNonlinear(q.model, q.fit, obs, { iterate: S.cal.iterate });
    predict = (vals, b) => { const ph = q.fit.beta.slice(); q.model.random.forEach((j, l) => { ph[j] += b[l]; }); return [q.model.f(q.fit.beta, vals), q.model.f(ph, vals)]; };
  }
  if (!res) { box.innerHTML = `<p class="note err small" id="cal-bad">${T('cal.bad')}</p>`; return; }
  const pts = nv === 1 ? S.cal.pts.split(/[\s;]+/).map(v => num(v.replace(',', '.'))).filter(Number.isFinite).map(v => [v]) : [];
  const pr = [...lines.map(r => r.slice(0, nv)), ...pts];
  box.innerHTML = `<div class="tscroll"><table class="grid" id="cal-b"><thead><tr>${q.rnames.map(n => `<th>${esc(n)}</th>`).join('')}</tr></thead><tbody><tr>${res.b.map((v, l) => `<td class="num" data-k="b${l}">${sig(v)}</td>`).join('')}</tr></tbody></table></div>
    <div class="tscroll"><table class="grid" id="cal-p"><thead><tr>${q.vars.map(v => `<th>${esc(v)}</th>`).join('')}<th>${T('cal.fix')}</th><th>${T('cal.cal')}</th></tr></thead><tbody>
    ${pr.map(vals => { const [a, c] = predict(vals, res.b); return `<tr>${vals.map(v => `<td class="num">${f(v, 3)}</td>`).join('')}<td class="num">${f(a, 3)}</td><td class="num" data-k="cal">${f(c, 3)}</td></tr>`; }).join('')}</tbody></table></div>`;
}
function renderUnits() {
  const q = R.fits[S.saveIdx], box = $('sv-units'); if (!q || !box) return;
  const items = [...q.vars.map((v, j) => ({ k: 'c' + q.varCols[j], label: `${v} (${colName(q.varCols[j])})` })), { k: 'c' + S.y, label: `y (${R.yName})` }];
  box.innerHTML = items.map(x => `<label>${esc(T('save.unit', { v: x.label }))} <input type="text" size="6" data-unit="${x.k}" value="${esc(S.units[x.k] ?? '')}"></label>`).join('');
  box.querySelectorAll('[data-unit]').forEach(x => x.addEventListener('change', () => { S.units[x.dataset.unit] = x.value.trim(); save(); }));
}
async function saveSet() {
  const cit = String(S.cit).trim(), msg = $('sv-msg');
  $('sv-units').querySelectorAll('[data-unit]').forEach(x => { S.units[x.dataset.unit] = x.value.trim(); });
  if (!cit) { msg.innerHTML = `<p class="note err small">${T('save.cit.miss')}</p>`; return; }
  const q = R.fits[S.saveIdx], x = q.fit, unit = c => S.units['c' + c];
  if (q.varCols.some(c => !unit(c)) || !unit(S.y)) { msg.innerHTML = `<p class="note err small">${T('save.unit.miss')}</p>`; return; }
  const formId = MX.ensureForm(q.text, q.vars, q.params);
  const valid = Object.fromEntries(q.vars.map((v, j) => { const vals = R.fits[S.saveIdx].b.groups.flatMap(g => q.kind === 'linear' ? [] : g.x.map(xx => xx[j])); return [v, vals.length ? [Math.min(...vals), Math.max(...vals)] : null]; }).filter(e => e[1]));
  const set = { ...blankSet(formId), params: Object.fromEntries(q.params.map((p, j) => [p, x.beta[j]])), inputs: Object.fromEntries(q.vars.map((v, j) => [v, { unit: unit(q.varCols[j]) }])),
    output: { name: R.yName, unit: unit(S.y) }, valid: Object.keys(valid).length ? valid : null, species: S.sp || null, source: { citation: cit }, origin: 'fitted',
    meta: { columns: Object.fromEntries(q.vars.map((v, j) => [v, colName(q.varCols[j])])), group: R.gName, random: q.rnames.join(' '), D: x.D.map(r => r.map(v => String(v)).join(' ')).join('; '), sigma: x.sigma, ...(x.power ? { delta: x.delta } : {}) },
    fit: { method: `${q.kind === 'linear' ? 'linear' : 'nonlinear (Lindstrom–Bates)'} mixed model, ${x.method}`, expr: q.text, vars: q.vars, random: q.rnames, cov: x.cov, D: x.D, sigma: x.sigma, delta: x.delta,
      data: R.data, n: R.n, groups: R.groups, se: x.se, vcov: x.vcov, logLik: x.ll, k: x.k, AIC: x.aic, BIC: x.bic, created: R.created } };
  const r = await saveCoef(set); await flush();
  msg.innerHTML = r.ok ? `<p class="note ok small" id="sv-ok">${T('save.ok')}</p>` : `<p class="note err small">${esc(r.problems.map(p => p.code).join(', '))}</p>`;
}
function obsTable() {
  const ok = R.fits.filter(q => q.fit.status === 'ok'), head = ['row', 'group', 'y', ...ok.flatMap(q => [q.label + '_fixed', q.label + '_group'])];
  const byRow = new Map();
  for (const [k, q] of ok.entries()) q.b.groups.forEach((g, i) => g.rows.forEach((row, t) => { if (!byRow.has(row)) byRow.set(row, { row, group: g.id, y: g.y[t], v: [] }); byRow.get(row).v[k] = q.fitted[i][t]; }));
  return [head, ...[...byRow.values()].sort((a, b) => a.row - b.row).map(r => [r.row, r.group, r.y, ...ok.flatMap((_, k) => r.v[k] ? r.v[k] : [null, null])])];
}
function cmpRows() { return [[T('r.model'), T('r.method'), 'k', 'logLik', 'AIC', 'BIC', 'sigma', T('r.st')], ...R.fits.map(q => q.fit.status === 'ok' ? [modelText(q), covText(q), q.fit.k, q.fit.ll, q.fit.aic, q.fit.bic, q.fit.sigma, stText(q)] : [modelText(q), '', null, null, null, null, null, stText(q)])]; }
function fixRows() { const rows = [[T('r.model'), '', T('f.est'), T('f.se')]]; for (const q of R.fits.filter(z => z.fit.status === 'ok')) q.params.forEach((p, j) => rows.push([q.label, p, q.fit.beta[j], q.fit.se[j]])); return rows; }
function reRows() {
  const rows = [[T('r.model'), T('re.g'), 'effect', 'value']];
  for (const q of R.fits.filter(z => z.fit.status === 'ok')) {
    q.rnames.forEach((n, j) => rows.push([q.label, 'D', n, q.fit.D[j].join(' ')])); rows.push([q.label, 'sigma', '', q.fit.sigma]); if (q.fit.power) rows.push([q.label, 'delta', '', q.fit.delta]);
    for (const r of q.fit.ranef) q.rnames.forEach((n, j) => rows.push([q.label, r.id, n, r.b[j]]));
  }
  return rows;
}
function infoRows() {
  return [[T('x.k'), T('x.v')], [T('x.tool'), `${MX.TOOL.id} ${MX.TOOL.version}`], [T('x.date'), R.created], [T('x.data'), `${R.data}; ${R.gName}; y = ${R.yName}; n = ${R.n}; ${R.groups}`],
    ...R.fits.map(q => [q.label, `y = ${q.text}; ${covText(q)}; ${q.vars.map((v, j) => `${v} = ${colName(q.varCols[j])}`).join(', ')}`]),
    [T('x.src'), 'Pinheiro, J.C., Bates, D.M. 2000. Mixed-Effects Models in S and S-PLUS. Springer (§2.2, §5.2, §7.2)'], [T('x.src'), 'Lindstrom, M.J., Bates, D.M. 1990. Biometrics 46: 673–687'],
    [T('x.src'), 'Calibration: Vonesh and Chinchilli 1997, as given by Raptis et al. 2021 (Trees 35: 1167–1183) and Ciceu et al. 2020 (For. Ecol. Manage. 477: 118507)'], [T('x.rule'), T('r.cmpnote')]];
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
  if (S.step === 3 && !R) { status(T('busy')); setTimeout(() => { renderStep3(); status(''); }, 30); return; }
  ({ 1: renderStep1, 2: renderStep2, 3: renderStep3 })[S.step]();
}
(async function init() {
  $('privacy').textContent = T('privacy');
  try {
    const saved = await get(KEY);
    if (saved && saved.v === 1) { S = { ...blank(), ...saved, cal: { ...blank().cal, ...(saved.cal || {}) }, models: (saved.models || []).map(m => ({ ...newModel(m.kind || 'linear'), ...m })) }; status(T('restored', { when: new Date(saved.saved).toLocaleString(LOC) })); }
    if (S.tbl && S.tbl.imp && S.tbl.imp.buf && !S.tbl.src) S.tbl.src = await readImport(S.tbl.imp, BASE).catch(() => null);
  } catch (e) { S = blank(); }
  render();
})();
