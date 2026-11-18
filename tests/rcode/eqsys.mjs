// R code of Systems of Equations (assets/lab/eqsys/rcode.js): cases for scripts/rcode-check.sh. Each case is the tool's
// own computation on a table (as the page does it: compute() of ui.js), the R script the page would download, the data
// file and the numbers R must give back. Data: the tool's simulated sample (assets/lab/eqsys/ornek/ornek-sistem.csv; 80
// trees, decimal comma), two cells blanked so that rows are left out.
import { readFileSync } from 'node:fs';
import * as Q from '../../assets/lab/eqsys/calc.js';
import { buildR } from '../../assets/lab/eqsys/rcode.js';
import { tableFromText, detectDelimiter, cellText } from '../../assets/lab/core/table.js';
import { parseNumber } from '../../assets/lab/core/num.js';

const csv0 = readFileSync(new URL('../../assets/lab/eqsys/ornek/ornek-sistem.csv', import.meta.url), 'utf8').trim().split('\n');
const csv = csv0.map((l, i) => i === 12 ? l.replace(/;[^;]*$/, ';') : i === 40 ? l.replace(/^([^;]*;[^;]*);[^;]*;/, '$1;;') : l).join('\n') + '\n';

function run(name, eqs, map, starts, method, resid, iterated, lrt = true) {
  const imp = { kind: 'csv', name: name + '.csv', encoding: 'utf-8', delim: null, detected: detectDelimiter(csv).delim, header: true, sheet: null };
  const src = tableFromText(csv, { delim: imp.detected, header: true }), decimal = ',';
  const rowsRaw = src.rows.map((r, i) => ({ row: src.rowNumbers[i], cols: src.headers.map((_, c) => { const p = parseNumber(cellText(r[c]), decimal); return p.status === 'ok' ? p.value : null; }) }));
  const vars = Object.keys(map), sys = Q.compileSystem(eqs.map((e, i) => ({ name: 'Eq' + (i + 1), y: '__y' + i, expr: e.expr })), vars);
  if (!sys.ok) throw new Error(name + ' ' + sys.code);
  const rows = rowsRaw.map(r => ({ row: r.row, vals: { ...Object.fromEntries(vars.map(v => [v, r.cols[map[v]]])), ...Object.fromEntries(eqs.map((e, i) => ['__y' + i, r.cols[e.y]])) } }));
  const start = Object.fromEntries(sys.params.map(p => [p, starts[p] ?? 0]));
  const fits = Object.fromEntries(['OLS', 'SUR', 'ISUR'].map(m => [m, Q.fitSystem(sys, rows, { method: m, resid, start })])), fit = fits[method];
  if (fit.status !== 'ok' || fit.dropped.length !== 2) throw new Error(`${name}: ${fit.status} ${fit.code} dropped ${fit.dropped && fit.dropped.length}`);
  const R = { sys, vars, start, method, resid, fit, fits };
  const script = buildR({ imp, src, decimal, eqs, map }, R, { lang: 'en', created: 'test', version: Q.TOOL.version });
  const tb = iterated ? 1e-6 : 1e-7, exp = {};
  fit.names.forEach((p, j) => { exp[`b.${p}`] = [fit.coef[j], tb]; exp[`se.${p}`] = [fit.se[j], 1e-5]; });
  // iterated SUR stops when the relative change of the coefficients is below 1e-12 (both); the last iterates of two
  // implementations agree to about 1e-7 in the residual quantities
  const tq = iterated ? 1e-6 : 1e-8;
  fit.eq.forEach((e, i) => { exp[`eq${i + 1}.ssr`] = [e.ssr, tq]; exp[`eq${i + 1}.r2`] = [e.r2, tq]; fit.residCov[i].forEach((v, j) => { exp[`rcov.${i + 1}.${j + 1}`] = [v, tq]; }); });
  exp.mcelroy = [fit.mcelroy, 1e-7]; exp.ols_r2 = [fit.olsR2, tq]; exp.logLik = [fit.logLik, 1e-8]; exp.df = [fit.df, 0];
  if (sys.shared.length && lrt) {
    const t = Q.testRestrictions(sys, vars, rows, start); if (t.status !== 'ok') throw new Error(name + ' lrt ' + t.code);
    exp['lrt.LR'] = [t.LR, 1e-5]; exp['lrt.df'] = [t.df, 0]; exp['lrt.p'] = [t.p, 1e-5]; exp['lrt.llr'] = [t.restricted.logLik, 1e-8]; exp['lrt.llu'] = [t.unrestricted.logLik, 1e-8];
  }
  return { name, script, files: { [imp.name]: csv }, expected: exp };
}

// columns of the sample: 0 agac, 1 D_cm, 2 H_m, 3 V_m3
const H = { y: 2, expr: '1.3 + a*(1-exp(-b*D_cm))^c' };
export default function cases() {
  return [
    // the page's sample: compatible height and volume equations sharing a, b, c; SUR, residual covariance Eq. 38. The
    // likelihood-ratio test is not compared here: without the restriction the volume equation's a_2, b_2, c_2, q are not
    // identified on these data (the tool stops at c_2 ≈ 1e16, R elsewhere on the same flat likelihood; 18 Nov 2026)
    run('eqsys-compatible', [H, { y: 3, expr: 'k*D_cm^p*(1.3 + a*(1-exp(-b*D_cm))^c)^q' }], { D_cm: 1 }, { a: 30, b: 0.04, c: 1.2, k: 0.00006, p: 1.9, q: 1 }, 'SUR', 'geomean', false, false),
    // free height and volume equations, iterated SUR with Eq. 39 (no shared coefficients)
    run('eqsys-isur', [H, { y: 3, expr: 'k*D_cm^p*H_m^q' }], { D_cm: 1, H_m: 2 }, { a: 30, b: 0.04, c: 1.2, k: 0.00006, p: 1.9, q: 1 }, 'ISUR', 'max', true),
    // log-linear equations with a shared slope, OLS (pooled σ² under the restriction), Eq. 37, some starts left empty (0);
    // likelihood-ratio test of the shared slope
    run('eqsys-linear', [{ y: 2, expr: 'exp(h0 + s*ln(D_cm))' }, { y: 3, expr: 'exp(v0 + s*ln(D_cm) + v2*ln(H_m))' }], { D_cm: 1, H_m: 2 }, { h0: 1, v0: -9 }, 'OLS', 'noDfCor', false),
  ];
}
