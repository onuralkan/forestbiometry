// R code of Mixed-Effects Models (assets/lab/mixed/rcode.js): cases for scripts/rcode-check.sh (needs the R package
// nlme). Each case is the tool's own computation on a table (as the page does it: compute() and fitOne() of ui.js), the
// R script the page would download, the data file and the numbers R must give back. Data: the tool's simulated sample
// (assets/lab/mixed/ornek/ornek-karma.csv; 25 plots, decimal comma), a few cells blanked so that rows are left out.
// Tolerances as in tests/mixed/test_sm03.mjs (the same nlme comparison): the variance parameters are located less sharply
// than the fixed effects, the nonlinear fits less sharply than the linear ones. Nonlinear models by ML only: nlme's
// REML for nlme stops at the ML relative precision (test_sm03).
import { readFileSync } from 'node:fs';
import * as MX from '../../assets/lab/mixed/calc.js';
import * as NL from '../../assets/lab/nlsreg/calc.js';
import { buildR } from '../../assets/lab/mixed/rcode.js';
import { tableFromText, detectDelimiter, cellText } from '../../assets/lab/core/table.js';
import { parseNumber } from '../../assets/lab/core/num.js';
import { parse } from '../../assets/lab/core/expr.js';

const csv0 = readFileSync(new URL('../../assets/lab/mixed/ornek/ornek-karma.csv', import.meta.url), 'utf8').trim().split('\n');
const csv = csv0.map((l, i) => i === 30 ? l.replace(/;[^;]*$/, ';') : i === 77 ? l.replace(/^[^;]*;/, ';') : i === 150 ? l.replace(/^([^;]*;[^;]*);[^;]*;/, '$1;;') : l).join('\n') + '\n';
const num = t => { const r = parseNumber(String(t ?? '').trim(), '.'); return r.status === 'ok' ? r.value : NaN; };

/** The page's compute() and fitOne() (ui.js), without the DOM. */
function compute(src, decimal, G, Y, models, vname) {
  const rows = src.rows.map((r, i) => ({ row: src.rowNumbers[i], g: String(cellText(r[G]) ?? '').trim(), cols: src.headers.map((_, c) => { const p = parseNumber(cellText(r[c]), decimal); return p.status === 'ok' ? p.value : null; }) }));
  const defs = models.map((md, i) => {
    const vcol = md.vvar === '' ? null : +md.vvar;
    if (md.kind === 'linear') return { md, i, cols: [...md.terms.map(t => t.col), ...(vcol != null ? [vcol] : [])], vcol };
    const r = parse(md.expr), vars = r.names.filter(n => md.map[n] != null), nm = MX.nonlinearModel(md.expr, vars).model;
    return { md, i, nm, start: nm.params.map(p => num(md.starts[p])), cols: [...nm.vars.map(v => md.map[v]), ...(vcol != null ? [vcol] : [])], vcol };
  });
  const used = new Set([Y, ...defs.flatMap(d => d.cols)]), keep = [], dropped = [];
  for (const r of rows) { const bad = r.g == null || r.g === '' ? 'group' : [...used].find(c => !Number.isFinite(r.cols[c])); if (bad != null) dropped.push({ row: r.row }); else keep.push(r); }
  const fits = defs.map(d => {
    const md = d.md, label = 'M' + (d.i + 1);
    if (md.kind === 'linear') {
      const terms = md.terms.map(t => ({ name: vname(t.col), tf: t.tf })), random = { intercept: md.rInt, terms: md.rTerms.map((b, j) => b ? j : -1).filter(j => j >= 0) };
      const vals = r => Object.fromEntries(md.terms.map(t => [vname(t.col), r.cols[t.col]]));
      const b = MX.buildLinear(keep.map(r => ({ row: r.row, g: r.g, y: r.cols[Y], vals: vals(r) })), terms, random, d.vcol != null ? vname(d.vcol) : null);
      const q = b.rnames.length, fit = MX.fitLMM(b.groups, { cov: q > 1 ? md.cov : 'diag', q, power: d.vcol != null, method: md.method });
      const vars = [...new Set(md.terms.map(t => vname(t.col)))];
      return { i: d.i, label, kind: 'linear', md, b, fit, text: b.text, params: b.names, rnames: b.rnames, vars, varCols: vars.map(v => md.terms.find(t => vname(t.col) === v).col) };
    }
    const nm = d.nm, varCols = nm.vars.map(v => md.map[v]);
    const b = MX.buildNonlinear(keep.map(r => ({ row: r.row, g: r.g, y: r.cols[Y], vals: Object.fromEntries(nm.vars.map((v, j) => [v, r.cols[varCols[j]]])) })), nm.vars, d.vcol != null ? nm.vars[varCols.indexOf(d.vcol)] : null);
    const random = nm.params.map((p, j) => md.rpar[p] ? j : -1).filter(j => j >= 0), model = { ...nm, random };
    const X = b.groups.flatMap(g => g.x), y = b.groups.flatMap(g => g.y), comp = NL.compile({ kind: 'formula', expr: md.expr, vars: nm.vars });
    let start = d.start; const pf = NL.fitModel(comp, X, y, { start: d.start }); if (pf.status === 'ok') start = comp.params.map(p => pf.theta[comp.params.indexOf(p)]);
    const fit = MX.fitNLME(model, b.groups, { cov: random.length > 1 ? md.cov : 'diag', power: d.vcol != null, method: md.method }, { start });
    return { i: d.i, label, kind: 'nonlinear', md, b, fit, model, start, text: nm.text, params: nm.params, rnames: random.map(j => nm.params[j]), vars: nm.vars, varCols };
  });
  return { fits, dropped, n: keep.length };
}

const LM = o => ({ kind: 'linear', method: 'REML', cov: 'diag', terms: [{ col: 2, tf: 'ln' }], rInt: true, rTerms: [false], vvar: '', ...o });
const NLM = o => ({ kind: 'nonlinear', method: 'ML', cov: 'diag', expr: '1.3 + a*(1-exp(-b*D_cm))^c', map: { D_cm: 2 }, starts: { a: '28', b: '0.045', c: '1.2' }, rpar: { a: true }, vvar: '', ...o });

function run(name, models, cal, lrt, nonlinear) {
  const imp = { kind: 'csv', name: name + '.csv', encoding: 'utf-8', delim: null, detected: detectDelimiter(csv).delim, header: true, sheet: null };
  const src = tableFromText(csv, { delim: imp.detected, header: true }), decimal = ',', vname = c => String(src.headers[c]);
  const R = compute(src, decimal, 0, 3, models, vname);
  if (R.dropped.length !== 3) throw new Error(`${name}: expected 3 rows left out, got ${R.dropped.length}`);
  const script = buildR({ imp, src, decimal, g: 0, y: 3, vname }, R, cal, lrt, { lang: 'en', created: 'test', version: MX.TOOL.version });
  const exp = {}, T = nonlinear ? { b: 2e-6, se: 2e-4, sigma: 2e-5, D: 1e-3, ll: 2e-7, re: 1e-4, cal: 2e-4 } : { b: 1e-6, se: 1e-5, sigma: 2e-5, D: 2e-4, ll: 1e-8, re: 1e-5, cal: 1e-4 };
  for (const q of R.fits) {
    const x = q.fit, id = 'm' + (q.i + 1); if (x.status !== 'ok') throw new Error(`${name} ${id}: ${x.code}`);
    x.beta.forEach((v, j) => { exp[`${id}.b.${j + 1}`] = [v, T.b]; exp[`${id}.se.${j + 1}`] = [x.se[j], T.se]; });
    exp[`${id}.sigma`] = [x.sigma, T.sigma]; if (x.power) exp[`${id}.delta`] = [x.delta, 1e-4];
    const dmax = Math.max(...x.D.flat().map(Math.abs)); x.D.forEach((r, a) => r.forEach((v, c) => { exp[`${id}.D.${a + 1}.${c + 1}`] = [v, T.D * Math.max(dmax, 1)]; }));
    exp[`${id}.ll`] = [x.ll, T.ll]; exp[`${id}.k`] = [x.k, 0]; exp[`${id}.aic`] = [x.aic, T.ll]; exp[`${id}.bic`] = [x.bic, T.ll];
    for (const r of x.ranef) r.b.forEach((v, l) => { exp[`${id}.re.${r.id}.${l + 1}`] = [v, T.re]; });
  }
  if (lrt) { const [a, b] = lrt.map(i => R.fits[i].fit), [s0, s1] = a.k <= b.k ? [a, b] : [b, a], t = MX.lrt(s0, s1); exp['lrt.L'] = [t.L, nonlinear ? 1e-3 : 1e-5]; exp['lrt.df'] = [t.df, 0]; exp['lrt.p'] = [t.p, 1e-4]; }
  if (cal) {
    const q = R.fits[cal.idx], nv = q.vars.length, vIdx = q.fit.power ? (q.kind === 'linear' ? q.vars.indexOf(vname(+q.md.vvar)) : q.varCols.indexOf(+q.md.vvar)) : -1;
    let res, predict;
    if (q.kind === 'linear') {
      const tf = q.md.terms.map(t => MX.TRANSFORMS[t.tf].f), xOf = vals => q.md.terms.map((t, j) => tf[j](vals[q.vars.indexOf(vname(t.col))]));
      const zOf = x => [...(q.md.rInt ? [1] : []), ...q.md.rTerms.map((b, j) => b ? x[j] : null).filter(v => v !== null)];
      res = MX.calibrateLinear(q.fit, cal.lines.map(r => { const x = xOf(r); return { y: r[nv], X: [1, ...x], Z: zOf(x), v: vIdx >= 0 ? r[vIdx] : 1 }; }));
      predict = (vals, b) => { const x = xOf(vals), f0 = [1, ...x].reduce((s, v, j) => s + v * q.fit.beta[j], 0); return [f0, f0 + zOf(x).reduce((s, v, l) => s + v * b[l], 0)]; };
    } else {
      res = MX.calibrateNonlinear(q.model, q.fit, cal.lines.map(r => ({ y: r[nv], x: r.slice(0, nv), v: vIdx >= 0 ? r[vIdx] : 1 })), { iterate: cal.iterate });
      predict = (vals, b) => { const ph = q.fit.beta.slice(); q.model.random.forEach((j, l) => { ph[j] += b[l]; }); return [q.model.f(q.fit.beta, vals), q.model.f(ph, vals)]; };
    }
    res.b.forEach((v, l) => { exp[`cal.b${l + 1}`] = [v, T.cal]; });
    const po = cal.lines.map(r => predict(r.slice(0, nv), res.b)); exp['cal.fixed.sum'] = [po.reduce((s, p) => s + p[0], 0), T.cal]; exp['cal.cal.sum'] = [po.reduce((s, p) => s + p[1], 0), T.cal];
    cal.pts.forEach((p, j) => { exp[`cal.pt.${j + 1}`] = [predict(p, res.b)[1], T.cal]; });
  }
  return { name, script, files: { [imp.name]: csv }, expected: exp };
}

const newPlot = [[12.4, 11.2], [24.8, 18.9], [37.5, 23.1]];   // a "new" plot: D_cm, H_m (made up for the test)
export default function cases() {
  return [
    // linear: random intercept (REML); intercept and slope, general, varPower(D) (REML); intercept and slope, diagonal (ML);
    // random intercept (ML) for the likelihood-ratio test; BLUP calibration under the varPower model
    run('mixed-linear', [LM({}), LM({ rTerms: [true], cov: 'symm', vvar: '2' }), LM({ method: 'ML', rTerms: [true], cov: 'diag' }), LM({ method: 'ML' })],
      { idx: 1, lines: newPlot, pts: [[15], [30], [45]], iterate: false }, [3, 2], false),
    // nonlinear (ML): random a; random a and b, general; random a with varPower(D); likelihood-ratio test; calibration by
    // the conditional mode
    run('mixed-nonlinear', [NLM({}), NLM({ rpar: { a: true, b: true }, cov: 'symm' }), NLM({ vvar: '2' })],
      { idx: 1, lines: newPlot, pts: [[15], [45]], iterate: true }, [0, 1], true),
  ];
}
