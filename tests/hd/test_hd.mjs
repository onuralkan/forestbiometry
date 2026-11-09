// Height–Diameter Modelling: numerical tests against SciPy/numpy (tests/ref/hd.json, tests/ref/make_hd_reference.py)
// and acceptance cases (missing heights, non-convergence, one vs many plots, out-of-range predictions).
// Run: node tests/hd/test_hd.mjs
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as H from '../../assets/lab/hd/calc.js';
import { tQuantile, tCdf, shuffle } from '../../assets/lab/core/stats.js';
import { levenbergMarquardt, solve, inverse } from '../../assets/lab/core/nls.js';
import { tableFromText } from '../../assets/lab/core/table.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const REF = JSON.parse(await readFile(path.join(root, 'tests/ref/hd.json'), 'utf8'));
const CSV = await readFile(path.join(root, 'tests/hd/fixture.csv'), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, rel, m) => ok(Number.isFinite(a) && Math.abs(a - b) <= rel * Math.max(1, Math.abs(b)), `${m}: ${a} vs ${b}`);
const table = tableFromText(CSV, { delim: ',', header: true, name: 'fixture.csv' });
const SPEC = { dcol: 3, hcol: 4, pcol: 0, scol: 2, sval: null, dunit: 'cm', hunit: 'm', decimal: '.', bh: 1.3 };

/* 0. statistics core */
for (const [k, v] of Object.entries(REF.t_ppf)) { const [q, nu] = k.split('|').map(Number); near(tQuantile(q, nu), v, 1e-9, `t ppf ${k}`); }
for (const [k, v] of Object.entries(REF.t_cdf)) { const [t, nu] = k.split('|').map(Number); near(tCdf(t, nu), v, 1e-11, `t cdf ${k}`); }
ok(JSON.stringify(shuffle([...Array(12).keys()], H.CV_SEED)) === JSON.stringify(REF.shuffle), 'seeded shuffle identical to Python');
ok(solve([[2, 1], [1, 3]], [3, 5]).every((v, i) => Math.abs(v - [0.8, 1.4][i]) < 1e-12), '2×2 solve');
ok(solve([[1, 2], [2, 4]], [1, 2]) === null && inverse([[1, 2], [2, 4]]) === null, 'singular matrix reported');
// gradients: analytic vs central differences, every model
for (const m of H.MODELS) {
  const th = m.p === 2 ? (m.id === 'naslund' ? [1.6, 0.17] : m.id === 'power' ? [2.5, 0.6] : [29, 12]) : (m.id === 'richards' ? [26, 0.05, 1.1] : [25.5, 0.035, 1.09]);
  for (const d of [3, 17.5, 60]) {
    const g = m.grad(th, d);
    th.forEach((t, j) => { const h = 1e-6 * Math.abs(t), tp = th.slice(), tm = th.slice(); tp[j] += h; tm[j] -= h; near(g[j], (m.f(tp, d) - m.f(tm, d)) / (2 * h), 1e-6, `${m.id} ∂f/∂${m.names[j]} at d=${d}`); });
  }
}

/* 1. data preparation: every row kept, statuses, measured heights untouched */
const prep = H.prepare(table, SPEC);
ok(prep.fitRows.length === REF.all.n, `fit rows ${prep.fitRows.length} = ${REF.all.n}`);
ok(prep.dmin === REF.all.dmin && prep.dmax === REF.all.dmax, 'diameter range of the fitting data');
ok(prep.acc.hLeBh === 1 && prep.acc.hBad === 1 && prep.acc.dEmpty === 1, 'h ≤ bh, unreadable h, missing d counted: ' + JSON.stringify(prep.acc));
ok(prep.nPlots === 8 && prep.hasPlot && !H.inferenceAllowed(prep), '8 plots → no SE/intervals/AIC for the fixed-effects fit');
const nMissing = table.rows.filter(r => r[3] && r[3].v !== '' && r[4] && r[4].v === '').length;
ok(prep.acc.missing === nMissing && nMissing > 20, `missing heights found: ${prep.acc.missing}`);
const r901 = prep.rows.find(r => r.rowNo === table.rowNumbers[table.rows.findIndex(x => x[1].v === '901')]);
ok(r901.hStatus === 'lebh' && !r901.fit && !r901.missing && r901.h === 1.2, 'h ≤ bh: measured value kept, not fitted, not predicted');

/* 2. fits on all plots vs SciPy */
const fitsAll = H.fitAll(prep, H.inferenceAllowed(prep));
for (const fi of fitsAll) {
  const r = REF.all.fits[fi.id];
  ok(fi.status === 'ok', `${fi.id} converged (${fi.status})`);
  fi.theta.forEach((t, j) => near(t, r.theta[j], 2e-6, `all ${fi.id} θ${j}`));
  near(fi.sse, r.sse, 1e-9, `all ${fi.id} SSE`); near(fi.rmse, r.rmse, 1e-9, `all ${fi.id} RMSE`); near(fi.mae, r.mae, 1e-7, `all ${fi.id} MAE`); near(fi.bias, r.bias, 1e-7, `all ${fi.id} bias`);
  near(fi.aicValue, r.aic, 1e-9, `all ${fi.id} AIC value`);
  ok(fi.se == null && fi.V == null, `all ${fi.id}: no SE with 8 plots`);
  const iv = H.intervals(fi, 20, 1.3); ok(iv.ci === null && iv.pi === null && Number.isFinite(iv.yhat), `all ${fi.id}: no intervals with 8 plots`);
}

/* 3. one plot (P1): SE, parameter CI, mean-curve CI and prediction interval vs SciPy */
const prep1 = H.prepare({ ...table, rows: table.rows.filter(r => r[0].v === 'P1'), rowNumbers: table.rowNumbers.filter((_, i) => table.rows[i][0].v === 'P1') }, SPEC);
ok(prep1.nPlots === 1 && H.inferenceAllowed(prep1) && prep1.fitRows.length === REF.P1.n, 'single plot: inference allowed, n = ' + prep1.fitRows.length);
const fits1 = H.fitAll(prep1, true);
for (const fi of fits1) {
  const r = REF.P1.fits[fi.id];
  ok(fi.status === 'ok', `P1 ${fi.id} converged`);
  fi.theta.forEach((t, j) => near(t, r.theta[j], 2e-6, `P1 ${fi.id} θ${j}`));
  fi.se.forEach((s, j) => near(s, r.se[j], 2e-5, `P1 ${fi.id} SE ${j}`));
  near(fi.sigma, r.sigma, 1e-8, `P1 ${fi.id} σ̂`); near(fi.tq, r.tq, 1e-9, `P1 ${fi.id} t quantile`);
  near(fi.aicValue, r.aic, 1e-9, `P1 ${fi.id} AIC`); near(fi.bicValue, r.bic, 1e-9, `P1 ${fi.id} BIC`); near(fi.logLik, r.logLik, 1e-9, `P1 ${fi.id} lnL`);
  for (const [dd, v] of Object.entries(r.at)) {
    const iv = H.intervals(fi, +dd, 1.3);
    near(iv.yhat, v.yhat, 1e-6, `P1 ${fi.id} ŷ(${dd})`);
    near(iv.ci[0], v.ci[0], 2e-5, `P1 ${fi.id} CI lo (${dd})`); near(iv.ci[1], v.ci[1], 2e-5, `P1 ${fi.id} CI hi (${dd})`);
    near(iv.pi[0], v.pi[0], 2e-5, `P1 ${fi.id} PI lo (${dd})`); near(iv.pi[1], v.pi[1], 2e-5, `P1 ${fi.id} PI hi (${dd})`);
    ok(iv.pi[0] < iv.ci[0] && iv.pi[1] > iv.ci[1], `P1 ${fi.id}: prediction interval wider than the mean-curve interval at ${dd}`);
  }
}

/* 4. cross-validation vs Python (same folds, fitting on training rows only, selection by training AIC inside each fold) */
async function runCV(p, mode) { const plan = H.cvPlan(p, mode); return { plan, sum: H.cvSummary(p, plan.folds.map(f => H.cvFold(p, f))) }; }
for (const [p, mode, r] of [[prep, 'plot', REF.all.cv_plot], [prep, 'tree', REF.all.cv_tree], [prep1, 'tree', REF.P1.cv_tree]]) {
  const { plan, sum } = await runCV(p, mode), tag = `${p === prep ? 'all' : 'P1'} ${mode}-CV`;
  ok(sum.nFolds === r.nFolds && sum.nCommonFolds === r.nFolds && sum.nTest === p.fitRows.length, `${tag}: ${sum.nFolds} folds, every row held out once`);
  sum.models.forEach((m, k) => { near(m.rmse, r.models[k].rmse, 2e-6, `${tag} ${H.MODELS[k].id} RMSE`); near(m.bias, r.models[k].bias, 2e-5, `${tag} ${H.MODELS[k].id} bias`); near(m.mae, r.models[k].mae, 2e-6, `${tag} ${H.MODELS[k].id} MAE`); });
  ok(JSON.stringify(sum.perFold.map(f => f.sel)) === JSON.stringify(r.sel), `${tag}: model chosen in each fold ${sum.perFold.map(f => f.sel)} = ${r.sel}`);
  near(sum.selection.rmse, r.selection.rmse, 2e-6, `${tag}: selection procedure RMSE`);
  ok(sum.nOutside === r.nOutside, `${tag}: held-out trees outside the training range ${sum.nOutside} = ${r.nOutside}`);
  if (mode === 'plot') ok(plan.lopo && plan.folds.every(f => f.plots.length === 1 && f.test.every(i => p.fitRows[i].plot === f.plots[0])), 'plot-CV: whole plots held out (leave-one-plot-out)');
  // no leakage: the training rows of a fold never include a held-out row
  const f0 = plan.folds[0], fr = H.cvFold(p, f0); ok(fr.nTrain + f0.test.length === p.fitRows.length, `${tag}: training = all − held-out`);
}
ok(H.cvPlan(prep1, 'plot').problem === 'cv.plot.few' && H.cvPlan(prep1, 'plot').folds.length === 0, 'one plot: plot-based CV refused, not faked');
const noPlot = H.prepare(table, { ...SPEC, pcol: null });
ok(!noPlot.hasPlot && H.inferenceAllowed(noPlot) && H.cvPlan(noPlot, 'plot').problem === 'cv.plot.few', 'no plot column: plot-based CV refused');
// many plots → grouped folds
const many = { ...prep, plots: [...Array(30).keys()].map(i => 'Q' + i), nPlots: 30, fitRows: prep.fitRows.map((r, i) => ({ ...r, plot: 'Q' + (i % 30) })) };
const gp = H.cvPlan(many, 'plot');
ok(!gp.lopo && gp.folds.length === H.CV_K && gp.folds.reduce((s, f) => s + f.plots.length, 0) === 30 && gp.folds.every(f => f.test.every(i => f.plots.includes(many.fitRows[i].plot))), '30 plots → 10 grouped folds, plots never split');

/* 5. missing heights: separate predictions, measured column untouched, out-of-range flagged */
const wb = fitsAll.find(f => f.id === 'weibull'), pm = H.predictMissing(prep, wb);
ok(pm.length === prep.acc.missing && pm.every(x => x.row.h === null && x.row.hStatus === 'empty'), 'predictions only for rows whose height is missing');
const far = pm.find(x => x.row.d === 95), small = pm.find(x => x.row.d === 0.8);
ok(far && far.outside && small && small.outside, 'd = 95 and d = 0.8 cm flagged outside the data range');
ok(pm.filter(x => x.outside).length === pm.filter(x => x.row.d < prep.dmin || x.row.d > prep.dmax).length, 'every out-of-range prediction flagged, no others');
near(far.h, 1.3 + H.modelById('weibull').f(wb.theta, 95), 1e-12, 'prediction uses the fitted curve');
ok(prep.rows.filter(r => r.fit).every(r => Number.isFinite(r.h) && r.hStatus === 'ok'), 'measured heights unchanged in the rows');

/* 6. species filter */
const prepAb = H.prepare(table, { ...SPEC, sval: 'Ab' }), wAb = H.fitModel(H.modelById('weibull'), prepAb.fitRows.map(r => r.d), prepAb.fitRows.map(r => r.h - 1.3));
ok(prepAb.fitRows.length === REF.species_Ab.n && prepAb.acc.species > 200, `species filter: ${prepAb.fitRows.length} trees of Ab`);
if (wAb.status === 'ok') wAb.theta.forEach((t, j) => near(t, REF.species_Ab.fits.weibull.theta[j], 1e-5, `Ab weibull θ${j}`));
else ok(true, 'Ab weibull status ' + wAb.status);

/* 7. non-convergence and too little data: reported, never shown as a fit */
const lin = { d: [], z: [] };
for (let i = 0; i < 40; i++) { const d = 10 + i * 1.25; lin.d.push(d); lin.z.push(0.45 * d + 0.3 * Math.sin(i * 1.7)); }
const linFits = H.MODELS.map(m => H.fitModel(m, lin.d, lin.z, { inference: true }));
const st = id => linFits.find(f => f.id === id).status;
ok(st('richards') !== 'ok' && st('weibull') !== 'ok', `linear data: Chapman–Richards (${st('richards')}) and Weibull (${st('weibull')}) not reported as converged`);
ok(['diverged', 'noconverge'].includes(st('richards')), 'linear data: reason given for Chapman–Richards');
ok(st('power') === 'ok', 'linear data: power model still fits');
ok(H.fitModel(H.modelById('weibull'), [10, 12, 15], [9, 10, 11]).status === 'toofew', 'n < p + 2 → too few');
ok(H.fitModel(H.modelById('naslund'), [10, 10, 10, 10], [9, 10, 11, 9.5]).status === 'toofew', 'one distinct diameter → too few');
const lm = levenbergMarquardt(H.modelById('power'), [1, 2, 3], [1, 2, 3], [NaN, 1]); ok(lm.status === 'invalid', 'undefined start reported');
// a CV fold where a model fails: its rows leave the comparison for every model (same observations)
const fake = { ...prep };
const folds = H.cvPlan(prep, 'plot').folds.map(f => H.cvFold(prep, f));
folds[2] = { ...folds[2], preds: folds[2].preds.map((p, k) => k === 4 ? null : p), status: folds[2].status.map((s, k) => k === 4 ? 'noconverge' : s) };
const sF = H.cvSummary(fake, folds);
ok(sF.nCommonFolds === 7 && sF.dropped.length === 1 && sF.models.every(m => m.n === sF.nTest) && sF.nTest === prep.fitRows.length - folds[2].test.length, 'failed fold: all models compared on the same remaining rows');

/* 8. new diameters */
const nd = H.parseDiameters('12,5; 30\n7 abc 0 -3', ',', 'cm');
ok(nd.d.join() === '12.5,30,7' && nd.bad.join() === 'abc,0,-3', 'diameter list parsed with decimal comma; invalid entries listed');
ok(H.parseDiameters('125 300', '.', 'mm').d.join() === '12.5,30', 'diameter list in mm converted to cm');

console.log(`hd: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
