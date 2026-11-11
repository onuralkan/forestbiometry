// Diameter distribution engine, stage P16: stand models (PPM, PRM; NLS, SUR, log-OLS; plot-level validation; model files).
//   node tests/dist/test_p16.mjs
// Reference: tests/ref/dist_p16.json (tests/ref/make_dist_p16.py: NumPy/SciPy re-implementation on the simulated sample
// assets/lab/dist/ornek/ornek-mescere.csv; NLS and SUR with scipy least_squares, log-OLS with lstsq, scipy logpdf/kstest).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as D from '../../assets/lab/dist/index.js';
import { tableFromText } from '../../assets/lab/core/table.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/dist_p16.json'), 'utf8'));
const csv = readFileSync(path.join(root, 'assets/lab/dist/ornek/ornek-mescere.csv'), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-12);
const S = D.stand, spec = { dcol: 2, pcol: 0, percol: 1, decimal: '.', unit: 'cm', cols: { N: 3, H: 4, A: 5 } };
const tbl = tableFromText(csv, { delim: ',' }), X = S.extractStandUnits(tbl, spec);

/* 1. training units */
ok(X.units.length === R.units && new Set(X.units.map(u => u.plot)).size === R.plots && X.units.reduce((s, u) => s + u.d.length, 0) === R.trees && !X.refused.length, `units ${X.units.length}/${R.units}, plots, trees`);
{ const t2 = tableFromText(csv.replace(/\nA03,2019,([\d.]+),(\d+),/, (m, d, n) => `\nA03,2019,${d},${+n + 1},`).replace(/\nA05,2019,([\d.]+),(\d+),([\d.]+),/, (m, d, n) => `\nA05,2019,${d},${n},,`), { delim: ',' });
  const Y = S.extractStandUnits(t2, spec), r3 = Y.refused.find(r => r.plot === 'A03'), r5 = Y.refused.find(r => r.plot === 'A05');
  ok(r3 && r3.problems[0].code === 'stand.var.varies' && r3.problems[0].key === 'N' && r5 && r5.problems[0].code === 'stand.var.missing' && r5.problems[0].key === 'H' && Y.units.length === R.units - 2,
    'a stand variable that varies within a unit, or is missing, leaves the unit out with the reason (never averaged or guessed)'); }
ok(S.needs(['RS', 'invA']).join() === 'N,H,A' && S.needs(['lnH']).join() === 'H', 'stand variables needed by the chosen terms');
{ const x = { N: 800, H: 20, A: 40 }, z = S.design(x, S.TERMS); ok(z[0] === 1 && rel(z[1], Math.sqrt(10000 / 800) / 20) < 1e-15 && z[2] === Math.log(800) && z[3] === Math.log(20) && z[4] === 1 / 40, 'design row [1, RS, ln N, ln H, 1/A], RS = √(10000/N)/H'); }

/* 2. references: targets, coefficients, objective, validation */
const SET = { ppm: 'ppm.weibull', m2: 'prm.weibull.m2', parresol: 'prm.parresol' };
const sseOf = (beta, key, terms, units, set) => units.reduce((s, u) => { const t = S.targets(u.d, set, {}); return s + (t[key] - Math.exp(S.design(u.x, terms).reduce((a, z, j) => a + beta[j] * z, 0))) ** 2; }, 0);
for (const c of R.cases) {
  const cfg = { set: SET[c.kind], terms: c.terms, fit: c.fit, xi: 0 }, set = S.responseSet(cfg.set, cfg), m = S.train(X.units, cfg), tag = c.name;
  ok(m.status === 'ok', `${tag}: trained (${m.status})`); if (m.status !== 'ok') continue;
  ok(m.keys.join() === c.keys.join(), `${tag}: responses ${m.keys}`);
  const t0 = S.targets(X.units[0].d, set, {});
  ok(c.keys.every(k => rel(t0[k], c.targets0[k]) < (c.kind === 'ppm' ? 1e-9 : 1e-12)), `${tag}: unit targets = reference (Weibull ML, moments n, type-7 percentiles)`);
  m.equations.forEach((e, j) => {
    ok(e.beta.every((b, i) => Math.abs(b - c.beta[j][i]) <= 2e-5 * Math.max(1, Math.abs(c.beta[j][i]))), `${tag} ${e.key}: β = reference: ${e.beta.map(v => v.toFixed(6))} vs ${c.beta[j].map(v => v.toFixed(6))}`);
    if (c.fit === 'nls') { const sj = sseOf(e.beta, e.key, c.terms, X.units, set), sr = sseOf(c.beta[j], e.key, c.terms, X.units, set);
      ok(sj <= sr * (1 + 1e-9), `${tag} ${e.key}: SSE at our β not above the reference optimum (${sj} vs ${sr})`); }
    if (c.fit === 'logols') ok(rel(e.s2Log, c.s2Log[j]) < 1e-9, `${tag} ${e.key}: log-scale residual variance`);
  });
  if (c.fit === 'sur') {
    ok(m.sur.Sigma.every((r, a) => r.every((v, b) => Math.abs(v - c.Sigma[a][b]) <= 1e-5 * Math.sqrt(c.Sigma[a][a] * c.Sigma[b][b]))), `${tag}: residual covariance Σ between equations = reference`);
    ok(Math.abs(m.sur.corr[0][1]) > 0.05, `${tag}: equations correlated (|r| = ${Math.abs(m.sur.corr[0][1]).toFixed(3)}), so SUR differs from NLS`);
    const nlsM = S.train(X.units, { ...cfg, fit: 'nls' });
    ok(m.equations.some((e, j) => e.beta.some((b, i) => Math.abs(b - nlsM.equations[j].beta[i]) > 1e-6 * Math.max(1, Math.abs(b)))), `${tag}: SUR coefficients are not the equation-by-equation NLS ones`);
    // GLS objective with the final Σ: SUR minimum not above the NLS coefficients
    const Si = (() => { const s = m.sur.Sigma, K = s.length; if (K === 2) { const det = s[0][0] * s[1][1] - s[0][1] ** 2; return [[s[1][1] / det, -s[0][1] / det], [-s[0][1] / det, s[0][0] / det]]; } return null; })();
    const obj = B => X.units.reduce((acc, u) => { const t = S.targets(u.d, set, {}), r = m.keys.map((k, j) => t[k] - Math.exp(S.design(u.x, c.terms).reduce((a, z, i) => a + B[j][i] * z, 0))); let q = 0; if (Si) for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) q += r[a] * Si[a][b] * r[b]; return acc + q; }, 0);
    if (Si) ok(obj(m.equations.map(e => e.beta)) <= obj(nlsM.equations.map(e => e.beta)) * (1 + 1e-12), `${tag}: GLS objective at SUR ≤ at NLS (same Σ)`);
  }
  if (c.kind !== 'parresol') {
    const cv = S.crossValidate(X.units, cfg, 5);
    const byKey = new Map(cv.units.map(u => [u.plot + '|' + u.period, u]));
    let okN = 0, outN = 0, worst = 0;
    for (const r of c.cv) { const u = byKey.get(r.plot + '|' + r.period);
      if (r.outside) { if (u.status === 'outside') outN++; continue; }
      if (u.status === 'ok') { okN++; worst = Math.max(worst, rel(u.nll, r.nll), Math.abs(u.ks - r.ks)); } }
    ok(okN === c.cv.filter(r => !r.outside).length && outN === c.cv.filter(r => r.outside).length && worst < 1e-5, `${tag}: validation per held-out unit (−ln L, KS) = reference; ${outN} units outside the predicted support counted (worst ${worst.toExponential(1)})`);
    ok(cv.summary.units === R.units && cv.summary.ok + cv.summary.failed === R.units, `${tag}: every held-out unit counted (${cv.summary.ok} ok, ${cv.summary.failed} failed)`);
  }
}

/* 3. validation by plot: periods of a plot stay together; nothing from the test fold enters training */
{ const cfg = { set: 'ppm.weibull', terms: S.TERMS, fit: 'nls' }, cv = S.crossValidate(X.units, cfg, 5);
  const perPlot = new Map(); for (const u of cv.units) { if (!perPlot.has(u.plot)) perPlot.set(u.plot, new Set()); perPlot.get(u.plot).add(u.fold); }
  ok([...perPlot.values()].every(s => s.size === 1) && cv.folds.every(f => f.trainUnits + f.testUnits === R.units), 'all periods of a plot in one fold; train + test = all units in each fold');
  ok(cv.K === 5 && Object.keys(cv.assignment).length === R.plots, 'fold assignment recorded per plot');
  const again = S.crossValidate(X.units, cfg, 5); ok(JSON.stringify(again.summary) === JSON.stringify(cv.summary), 'deterministic (no random split)'); }

/* 4. prediction: consistency checks, no clipping, extrapolation flagged, recovery = the verified methods */
const m2 = S.train(X.units, { set: 'prm.weibull.m2', terms: S.TERMS, fit: 'nls' }), x0 = X.units[3].x;
{ const p = S.predict(m2, x0), rec = D.runMethod('weibull.m2', { type: 'summary', summary: { mean: p.responses.mean, variance: p.responses.variance, varDivisor: 'n', dmin: p.responses.dmin, origin: 'predicted' } }, { loc: 'half-dmin' });
  ok(p.status === 'ok' && rel(p.params.b, rec.params.b) < 1e-14 && rel(p.params.c, rec.params.c) < 1e-14 && rel(p.params.a, 0.5 * p.responses.dmin) < 1e-14, 'PRM Weibull M2: predicted targets → the verified M2 recovery, a = 0.5 × predicted Dmin');
  ok(!p.outside.length, 'inside the training ranges: no extrapolation flag');
  const far = S.predict(m2, { ...x0, N: m2.scope.ranges.N[1] * 3 }); ok(far.outside.join() === 'N', 'outside the training range of N: flagged'); }
{ const m4 = S.train(X.units, { set: 'prm.weibull.m4', terms: S.TERMS, fit: 'nls' }), bad = JSON.parse(JSON.stringify(m4));
  const iq = bad.keys.indexOf('q63'), i31 = bad.keys.indexOf('q31'); bad.equations[iq].beta = bad.equations[i31].beta.map((v, j) => j === 0 ? v - 0.2 : v);   // Q63 forced below Q31
  const p = S.predict(bad, x0); ok(p.status === 'invalid' && p.params === null && p.problems[0].code === 'stand.order' && p.responses.q63 < p.responses.q31, 'predicted percentiles out of order: no parameters, reported, values kept as predicted (no clipping)'); }
{ const mp = S.train(X.units, { set: 'prm.parresol', terms: S.TERMS, fit: 'nls', xi: 0 }), p = S.predict(mp, x0);
  const rec = D.runMethod('johnsonsb.parresol', { type: 'summary', summary: { xi: 0, mean: p.responses.mean, median: p.responses.median, dq: p.responses.dq, origin: 'predicted' } }, { xi: 0 });
  ok(p.recovery && p.recovery.status === rec.status && (rec.status !== 'ok' || ['lambda', 'gamma', 'delta'].every(k => rel(p.params[k], rec.params[k]) < 1e-14)), `PRM Parresol: predicted mean, median, Dq → the verified Parresol recovery (${rec.status})`);
  const bad = JSON.parse(JSON.stringify(mp)); bad.equations[bad.keys.indexOf('dq')].beta = bad.equations[bad.keys.indexOf('mean')].beta.map((v, j) => j === 0 ? v - 0.1 : v);
  ok(S.predict(bad, x0).problems.some(q => q.code === 'stand.dq'), 'predicted Dq not above the predicted mean: inconsistent, reported'); }
{ const mp = S.train(X.units, { set: 'prm.parresol', terms: S.TERMS, fit: 'nls' }); ok(mp.status === 'invalid' && mp.problems[0].code === 'stand.xi', 'Parresol needs ξ from the user'); }

/* 5. log-OLS back-transformation; training needs several plots; no model, no prediction */
{ const med = S.train(X.units, { set: 'ppm.weibull', terms: S.TERMS, fit: 'logols' }), mean = S.train(X.units, { set: 'ppm.weibull', terms: S.TERMS, fit: 'logols', back: 'mean' });
  const pm = S.predict(med, x0), pn = S.predict(mean, x0), e = med.equations[0];
  ok(rel(pn.responses.b / pm.responses.b, Math.exp(e.s2Log / 2)) < 1e-14 && med.options.back === 'median' && mean.options.back === 'mean', 'log-OLS: median exp(Zβ) by default; mean exp(Zβ + s²/2) on request; the choice is recorded'); }
{ const one = X.units.filter(u => u.plot === 'A01'), m = S.train(one, { set: 'ppm.weibull', terms: S.TERMS, fit: 'nls' });
  ok(m.status === 'invalid' && m.problems[0].code === 'stand.few', 'one plot: no model is trained'); }
{ let threw = false; try { S.predict(null, x0); } catch (e) { threw = e.code === 'stand.model'; } ok(threw, 'no trained or imported model: no prediction (no coefficients from elsewhere)'); }

/* 6. model record, export and import */
{ const cfg = { set: 'ppm.weibull', terms: S.TERMS, fit: 'sur', hColumn: 'H_m' }, m = S.train(X.units, cfg), cv = S.crossValidate(X.units, cfg, 5), file = JSON.parse(JSON.stringify(S.exportModel(m, cv)));
  ok(file.schema === 'dist-stand-model/1' && file.tool === D.TOOL.id + ' ' + D.TOOL.version && file.units.N === 'trees/ha' && file.units.H === 'm' && file.hColumn === 'H_m' && file.scope.units === R.units && file.scope.plots === R.plots && file.validation.K === 5 && file.sur.rounds >= 1,
    'model file: schema, tool version, units, H column, training scope, validation, SUR details');
  const im = S.importModel(file); ok(im.model && JSON.stringify(S.predict(im.model, x0).params) === JSON.stringify(S.predict(m, x0).params), 'imported model predicts exactly as the trained one');
  ok(S.importModel({ ...file, schema: 'x' }).problems[0].code === 'stand.import.schema', 'wrong schema refused');
  const bad = JSON.parse(JSON.stringify(file)); bad.equations[0].beta[1] = null; ok(S.importModel(bad).problems.some(p => p.code === 'stand.import.coef'), 'missing coefficient refused');
  const bad2 = JSON.parse(JSON.stringify(file)); bad2.equations[0].beta.pop(); ok(S.importModel(bad2).problems.some(p => p.code === 'stand.import.coef'), 'coefficient count not matching the terms refused'); }

console.log(`dist P16: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
