// R code of Nonlinear Regression (assets/lab/nlsreg/rcode.js): cases for scripts/rcode-check.sh. Each case is the tool's
// own computation on a table (as the page does it: the same rows, models, starts and weights), the R script the page
// would download, the data file and the numbers R must give back. Data: the tool's simulated sample
// (assets/lab/nlsreg/ornek/ornek-nls.csv; semicolon, decimal comma), a few cells blanked so that rows are left out.
import { readFileSync } from 'node:fs';
import * as NL from '../../assets/lab/nlsreg/calc.js';
import { buildR } from '../../assets/lab/nlsreg/rcode.js';
import { tableFromText, detectDelimiter, cellText } from '../../assets/lab/core/table.js';
import { parseNumber } from '../../assets/lab/core/num.js';
import { parse } from '../../assets/lab/core/expr.js';

const csv0 = readFileSync(new URL('../../assets/lab/nlsreg/ornek/ornek-nls.csv', import.meta.url), 'utf8');
// blank H_m in row 7 and V_m3 in row 13 (rows the common-row rule leaves out)
const csv = csv0.trim().split('\n').map((l, i) => i === 7 ? l.replace(/;[^;]*;([^;]*)$/, ';;$1') : i === 13 ? l.replace(/;[^;]*$/, ';') : l).join('\n') + '\n';

const num = t => { const r = parseNumber(String(t ?? '').trim(), '.'); return r.status === 'ok' ? r.value : NaN; };
/** The page's compute() (ui.js) on the given settings. */
function compute(src, decimal, y, models) {
  const rows = src.rows.map((r, i) => ({ row: src.rowNumbers[i], vals: src.headers.map((_, c) => { const p = parseNumber(cellText(r[c]), decimal); return p.status === 'ok' ? p.value : null; }) }));
  const ms = models.map((md, i) => {
    let def;
    if (md.kind === 'ready') def = { kind: 'ready', ready: md.ready };
    else { const r = parse(md.expr); def = { kind: 'formula', expr: md.expr, vars: r.names.filter(n => md.map[n] != null && md.map[n] >= 0) }; }
    const c = NL.compile(def); if (!c.ok) throw new Error('compile ' + c.code);
    const st = c.params.map(p => String(md.starts[p] ?? '').trim()), given = st.some(x => x !== '');
    return { md, i, def, c, start: md.kind === 'formula' || given ? st.map(num) : null };
  });
  const cols = [{ col: y }];
  for (const x of ms) { for (const v of x.c.vars) cols.push({ col: x.md.map[v] }); if (x.md.w.kind !== 'none') cols.push({ col: x.md.w.col, positive: true }); }
  const { use, dropped } = NL.commonRows(rows, cols), U = use.map(i => rows[i]), yy = U.map(r => r.vals[y]);
  const fits = ms.map(x => {
    const X = U.map(r => x.c.vars.map(v => r.vals[x.md.map[v]])), w = x.md.w;
    const weight = w.kind === 'power' ? { kind: 'power', X: U.map(r => r.vals[w.col]), theta: w.theta === '' ? null : num(w.theta) } : w.kind === 'column' ? { kind: 'column', psi: U.map(r => r.vals[w.col]) } : { kind: 'none' };
    const fit = NL.fitModel(x.c, X, yy, { start: x.start, readyId: x.md.kind === 'ready' ? x.md.ready : null, weight });
    return { i: x.i, label: 'M' + (x.i + 1), md: x.md, c: x.c, def: x.def, X, fit, wcol: w.kind !== 'none' ? w.col : null };
  });
  return { rows: U.map(r => r.row), y: yy, dropped, fits };
}

const M = (o) => ({ kind: 'ready', ready: 'cr', expr: '', map: {}, starts: {}, w: { kind: 'none', col: null, theta: '' }, ...o, w: { kind: 'none', col: null, theta: '', ...(o.w || {}) } });
function run(name, y, models, iv) {
  const imp = { kind: 'csv', name: name + '.csv', encoding: 'utf-8', delim: null, detected: detectDelimiter(csv).delim, header: true, sheet: null };
  const src = tableFromText(csv, { delim: imp.detected, header: true }), decimal = ',';
  const R = compute(src, decimal, y, models);
  const script = buildR({ imp, src, decimal, y }, R, iv, { lang: 'en', created: 'test', version: NL.TOOL.version });
  const exp = {};
  for (const q of R.fits) {
    const x = q.fit, id = 'm' + (q.i + 1);
    if (x.status !== 'ok' && x.status !== 'singular') throw new Error(`${name} ${id}: ${x.status} ${x.code || ''}`);
    q.c.params.forEach((p, j) => { exp[`${id}.${p}`] = [x.theta[j], 1e-6]; if (x.se) { exp[`${id}.se.${p}`] = [x.se[j], 1e-5]; exp[`${id}.lo.${p}`] = [x.ci[j][0], 1e-5]; exp[`${id}.hi.${p}`] = [x.ci[j][1], 1e-5]; } });
    for (const [k, v] of [['n', x.n], ['rmse', x.metrics.rmse], ['bias', x.metrics.bias], ['mae', x.metrics.mae], ['r2', x.metrics.r2], ['sigma', Math.sqrt(x.s2)], ['aic', x.aic]]) exp[`${id}.${k}`] = [v, k === 'n' ? 0 : 1e-7];
    if (x.weight.kind === 'power' && x.weight.estimated) exp[`${id}.theta_w`] = [x.weight.theta, 1e-5];
  }
  if (iv) {
    const q = R.fits[iv.idx], w = q.fit.weight, psi = w.kind === 'none' ? 1 : w.kind === 'power' ? iv.wv ** w.theta : iv.wv, r = NL.interval(q.c, q.fit, iv.point, psi);
    exp['iv.yhat'] = [r.yhat, 1e-7]; exp['iv.ci_lo'] = [r.ci[0], 1e-5]; exp['iv.ci_hi'] = [r.ci[1], 1e-5]; exp['iv.pi_lo'] = [r.pi[0], 1e-5]; exp['iv.pi_hi'] = [r.pi[1], 1e-5];
  }
  if (!R.dropped.length) throw new Error(`${name}: no row left out`);
  return { name, script, files: { [imp.name]: csv }, expected: exp };
}

export default function cases() {
  // columns of the sample: 0 agac, 1 D_cm, 2 H_m, 3 V_m3
  return [
    // height on diameter: ready-made forms with automatic starts, free formulas, a power form with θ estimated (Eq. 4–5)
    run('nls-height', 2, [
      M({ ready: 'cr', map: { x: 1 } }),
      M({ kind: 'formula', expr: '1.3 + b0*(1-exp(-b1*D))^b2', map: { D: 1 }, starts: { b0: '30', b1: '0.03', b2: '1' } }),
      M({ ready: 'pow', map: { x: 1 }, w: { kind: 'power', col: 1, theta: '' } }),
      M({ ready: 'weib', map: { x: 1 } }),
      // abs is not in R's derivatives table: nls falls back to numerical derivatives
      M({ kind: 'formula', expr: '1.3 + a*abs(D)^b', map: { D: 1 }, starts: { a: '2', b: '0.6' } }),
    ], { idx: 2, point: { x: 31.5 }, wv: 31.5 }),
    // volume on diameter and height: two-variable power form with a column weight, a free formula with ln, sqrt, an
    // underscore name (backquoted in R) and a fixed θ, interval at a point
    run('nls-volume', 3, [
      M({ ready: 'pow2', map: { x1: 1, x2: 2 }, w: { kind: 'column', col: 1 } }),
      M({ kind: 'formula', expr: 'exp(_a + b*ln(D) - c/sqrt(D)) * H^d', map: { D: 1, H: 2 }, starts: { _a: '-9', b: '2', c: '0.1', d: '1' }, w: { kind: 'power', col: 1, theta: '2' } }),
    ], { idx: 1, point: { D: 30, H: 20 }, wv: 30 }),
  ];
}
