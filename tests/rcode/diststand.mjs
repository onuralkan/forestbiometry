// R code of the Diameter Distribution Lab, stage 3b (stand models; assets/lab/dist/rcode-stand.js): cases for
// scripts/rcode-check.sh. Each case trains a stand model with the tool (stand.js, as the page's worker does) on the
// tool's simulated stand sample (assets/lab/dist/ornek/ornek-mescere.csv: 54 plot × period units with N, H, age), predicts
// for one stand, and checks that the R script gives the same coefficients, training RMSE and bias, predicted responses
// and recovered parameters, the plot-level cross-validation (stage 3c) and the CDF fits (stage 3c).
import { readFileSync } from 'node:fs';
import * as D from '../../assets/lab/dist/index.js';
import { buildStandR } from '../../assets/lab/dist/rcode-stand.js';
import { tableFromText, detectDelimiter } from '../../assets/lab/core/table.js';

const text = readFileSync(new URL('../../assets/lab/dist/ornek/ornek-mescere.csv', import.meta.url), 'utf8');
function run(name, cfg, x) {
  const imp = { kind: 'csv', name: name + '.csv', encoding: 'utf-8', delim: null, detected: detectDelimiter(text).delim, header: true, sheet: null };
  const src = tableFromText(text, { delim: imp.detected, header: true }), s = { imp, src, decimal: '.', unit: 'cm', dcol: 2, pcol: 0, percol: 1, fcol: null, fval: null, cols: { N: 3, H: 4, A: 5 } };
  const X = D.stand.extractStandUnits(src, s), m = D.stand.train(X.units, cfg); if (m.status !== 'ok') throw new Error(name + ' ' + m.status);
  const pred = D.stand.predict(m, x); if (pred.status !== 'ok') throw new Error(name + ' prediction ' + pred.status);
  const cv = D.stand.crossValidate(X.units, cfg, 5); if (cv.status !== 'ok') throw new Error(name + ' cv');
  const tb = cfg.fit === 'logols' ? 1e-9 : 1e-6, exp = {};
  // iterated SUR: the objective is flat along the weakly determined coefficients (here the one of 1/A); the tool's
  // Levenberg–Marquardt and R's nls stop about 1e-5 apart there (the fitted values and the prediction agree to 1e-6)
  const tbeta = cfg.fit === 'sur' ? 1e-4 : tb;
  for (const e of m.equations) { e.beta.forEach((b, j) => { exp[`${e.key}.b${j + 1}`] = [b, tbeta]; }); exp[`${e.key}.rmse`] = [e.rmse, tb]; exp[`${e.key}.bias`] = [e.bias, tb * 10]; }
  for (const [k, v] of Object.entries(pred.responses)) exp[`pred.${k}`] = [v, tb];
  if (m.approach === 'ppm') for (const [k, v] of Object.entries(pred.params)) exp[`pred.param.${k}`] = [v, tb];
  else if (m.family === 'weibull') { const id = m.method.replace('weibull.', ''); exp[`${id}.roots`] = [1, 0]; for (const k of ['a', 'b', 'c']) exp[`${id}.${k}`] = [pred.params[k], 1e-6]; }
  else { exp.solutions = [1, 0]; for (const k of ['xi', 'lambda', 'gamma', 'delta']) exp[k] = [pred.params[k], 1e-6]; }
  const cs = cv.summary; exp['cv.units'] = [cs.units, 0]; exp['cv.ok'] = [cs.ok, 0]; exp['cv.nll'] = [cs.nll, 1e-6]; exp['cv.nllPerTree'] = [cs.nllPerTree, 1e-6]; exp['cv.ks'] = [cs.ks, 1e-5];
  if (m.cdf) { exp['cdf.start'] = [m.cdf.start, 1e-6]; exp['cdf.objective'] = [m.cdf.objective, 1e-6]; }
  return { name, script: buildStandR(s, cfg, D.stand.exportModel(m, cv), x, pred, { lang: 'en', created: 'test', version: D.TOOL.version }, cv), files: { [imp.name]: text }, expected: exp };
}
const x = { N: 600, H: 22, A: 45 };
export default function cases() {
  return [
    // PPM: Weibull b and c (a = 0) by NLS on RS, ln N, ln H
    run('stand-ppm-nls', { set: 'ppm.weibull', terms: ['RS', 'lnN', 'lnH'], fit: 'nls', a: 0, ppmLoc: 'zero' }, x),
    // PRM Weibull M3 (Dq, variance, Dmin for a = Dmin/2) by iterated SUR on ln N, ln H, 1/A; prediction recovered by M3
    run('stand-prm-m3-sur', { set: 'prm.weibull.m3', terms: ['lnN', 'lnH', 'invA'], fit: 'sur', loc: 'half-dmin' }, x),
    // PRM Johnson SB (Parresol, ξ = 2 cm) by OLS on ln y with the mean back-transformation; prediction recovered by Parresol
    run('stand-prm-parresol-logols', { set: 'prm.parresol', terms: ['RS', 'lnH'], fit: 'logols', back: 'mean', xi: 2 }, x),
    // stage 3c: PPM by modified CDFR (2 cm classes) and PRM Weibull M5 (Q50, Q95, Dmin) by CDFR, with their cross-validation
    run('stand-ppm-mcdfr', { set: 'ppm.weibull', terms: ['RS', 'lnN', 'lnH', 'invA'], fit: 'mcdfr', width: 2, a: 0, ppmLoc: 'zero' }, x),
    run('stand-prm-m5-cdfr', { set: 'prm.weibull.m5', terms: ['lnN', 'lnH'], fit: 'cdfr', loc: 'half-dmin' }, x),
  ];
}
