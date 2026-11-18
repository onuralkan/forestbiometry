// R code of Height–Diameter Modelling (assets/lab/hd/rcode.js): cases for scripts/rcode-check.sh. Each case is the
// tool's own computation on a table (as the page does it), the R script the page would download, the data file and the
// numbers R must give back. Data: the tool's simulated sample (assets/lab/hd/ornek/ornek-boy-cap.csv), some heights
// blanked to exercise the predictions.
import { readFileSync } from 'node:fs';
import * as H from '../../assets/lab/hd/calc.js';
import { buildR } from '../../assets/lab/hd/rcode.js';
import { tableFromText, detectDelimiter } from '../../assets/lab/core/table.js';

const csv0 = readFileSync(new URL('../../assets/lab/hd/ornek/ornek-boy-cap.csv', import.meta.url), 'utf8');
// blank the height of every 25th tree (the measured column is never changed by the tool; these get predictions)
const csv = csv0.trim().split('\n').map((l, i) => i > 0 && i % 25 === 0 ? l.replace(/,[^,]*$/, ',') : l).join('\n') + '\n';

function run(caseName, settings, newD) {
  const imp = { kind: 'csv', name: caseName + '.csv', encoding: 'utf-8', delim: null, detected: detectDelimiter(csv).delim, header: true, sheet: null };
  const src = tableFromText(csv, { delim: imp.detected, header: true });
  const s = { imp, src, dunit: 'cm', hunit: 'm', decimal: '.', fcol: null, fval: null, scol: null, sval: null, ...settings };
  const spec = { dcol: s.dcol, hcol: s.hcol, pcol: s.pcol, scol: s.scol, sval: s.sval, dunit: s.dunit, hunit: s.hunit, decimal: s.decimal, bh: 1.3 };
  const prep = H.prepare(src, spec), inference = H.inferenceAllowed(prep), fits = H.fitAll(prep, inference);
  let cv = null;
  if (s.cv !== 'none') { const plan = H.cvPlan(prep, s.cv); const folds = plan.folds.map(f => H.cvFold(prep, f)); cv = { mode: plan.mode, lopo: plan.lopo, k: folds.length, folds, sum: H.cvSummary(prep, folds) }; }
  const R = { prep, inference, fits, cv };
  const script = buildR(s, R, newD, { lang: 'en', created: 'test', version: H.TOOL.version });
  // expected numbers, with the tolerance each must meet (relative to max(1, |value|))
  const exp = {};
  for (const f of fits.filter(x => x.status === 'ok')) {
    const m = H.modelById(f.id);
    m.names.forEach((nm, j) => { exp[`${f.id}.${nm}`] = [f.theta[j], 1e-6]; if (f.se) { exp[`${f.id}.se.${nm}`] = [f.se[j], 1e-5]; exp[`${f.id}.lo.${nm}`] = [f.ci[j][0], 1e-5]; exp[`${f.id}.hi.${nm}`] = [f.ci[j][1], 1e-5]; } });
    for (const [k, v] of [['n', f.n], ['sse', f.sse], ['bias', f.bias], ['mae', f.mae], ['rmse', f.rmse], ['sigma', f.sigma], ['aic', f.aicValue], ['bic', f.bicValue]]) exp[`${f.id}.${k}`] = [v, 1e-7];
  }
  if (cv) { H.MODELS.forEach((m, k) => { exp[`cv.${m.id}.rmse`] = [cv.sum.models[k].rmse, 1e-6]; exp[`cv.${m.id}.bias`] = [cv.sum.models[k].bias, 1e-5]; exp[`cv.${m.id}.mae`] = [cv.sum.models[k].mae, 1e-6]; });
    exp['cv.selection.rmse'] = [cv.sum.selection.rmse, 1e-6]; exp['cv.n'] = [cv.sum.selection.n, 0]; }
  const sel = fits.find(f => f.id === s.model);
  const miss = H.predictMissing(prep, sel);
  if (miss.length) { exp['pred.missing.n'] = [miss.length, 0]; exp['pred.missing.sum'] = [miss.reduce((a, r) => a + r.h, 0), 1e-7]; }
  newD.forEach((d, j) => { const iv = H.intervals(sel, d, prep.bh); exp[`nd.${j + 1}.h_pred`] = [iv.yhat, 1e-7];
    if (iv.ci) { exp[`nd.${j + 1}.ci_lo`] = [iv.ci[0], 1e-5]; exp[`nd.${j + 1}.ci_hi`] = [iv.ci[1], 1e-5]; exp[`nd.${j + 1}.pi_lo`] = [iv.pi[0], 1e-5]; exp[`nd.${j + 1}.pi_hi`] = [iv.pi[1], 1e-5]; } });
  return { name: caseName, script, files: { [imp.name]: csv }, expected: exp, n: fits.filter(f => f.status === 'ok').length };
}

export default function cases() {
  return [
    // several plots: no standard errors or AIC in the tool, plot-level cross-validation (leave one plot out)
    run('hd-plots', { dcol: 3, hcol: 4, pcol: 0, cv: 'plot', model: 'weibull' }, [12, 35.5]),
    // no plot column: trees independent, standard errors, t intervals, tree-level 10-fold cross-validation
    run('hd-trees', { dcol: 3, hcol: 4, pcol: null, cv: 'tree', model: 'naslund' }, [8, 22.4, 60]),
  ];
}
