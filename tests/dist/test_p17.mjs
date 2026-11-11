// Diameter distribution engine, stage P17: CDFR and modified CDFR for stand models (DIST_SPEC §4.2).
//   node tests/dist/test_p17.mjs
// References: hand-computed objectives on a small data set below; tests/ref/dist_p17.json (tests/ref/make_dist_p17.py:
// NumPy/SciPy objectives and least_squares optimisation on the sample stand data).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as D from '../../assets/lab/dist/index.js';
import { tableFromText } from '../../assets/lab/core/table.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/dist_p17.json'), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
const S = D.stand;
const X = S.extractStandUnits(tableFromText(readFileSync(path.join(root, 'assets/lab/dist/ornek/ornek-mescere.csv'), 'utf8'), { delim: ',' }), { dcol: 2, pcol: 0, percol: 1, decimal: '.', unit: 'cm', cols: { N: 3, H: 4, A: 5 } });

/* 1. hand-computed objectives: unit 1 d = 10, 12, 12, 15 with Weibull(0, 13, 4); unit 2 d = 20, 25 with Weibull(0, 22, 5) */
{ const F = (x, b, c) => 1 - Math.exp(-((x / b) ** c));
  const u = [{ d: [15, 12, 10, 12] }, { d: [25, 20] }], P = [{ a: 0, b: 13, c: 4 }, { a: 0, b: 22, c: 5 }];
  // CDFR: positions (j − 0.5)/n on the sorted diameters (equal 12s take j = 2 and 3), weight 1/n
  const c1 = ((0.125 - F(10, 13, 4)) ** 2 + (0.375 - F(12, 13, 4)) ** 2 + (0.625 - F(12, 13, 4)) ** 2 + (0.875 - F(15, 13, 4)) ** 2) / 4;
  const c2 = ((0.25 - F(20, 22, 5)) ** 2 + (0.75 - F(25, 22, 5)) ** 2) / 2;
  ok(rel(S.cdfObjective(u, P, 'cdfr').value, c1 + c2) < 1e-14, `CDFR by hand: ${c1 + c2}`);
  // modified CDFR, width 2: unit 1 classes [10,12) 1, [12,14) 2, [14,16) 1 → C = 0.25, 0.75 at u = 12, 14 (last class out), weight 1/(3 − 1)
  //                        unit 2 classes [20,22) 1, [22,24) 0, [24,26) 1 → C = 0.5, 0.5 at u = 22, 24, weight 1/2
  const m1 = ((0.25 - F(12, 13, 4)) ** 2 + (0.75 - F(14, 13, 4)) ** 2) / 2, m2 = ((0.5 - F(22, 22, 5)) ** 2 + (0.5 - F(24, 22, 5)) ** 2) / 2;
  ok(rel(S.cdfObjective(u, P, 'mcdfr', 2).value, m1 + m2) < 1e-14, `modified CDFR by hand (true upper bounds, last class out, 1/(m − 1)): ${m1 + m2}`);
  // width 4 (different from the source's 2 cm): unit 1 [8,12) 1, [12,16) 3 → C = 0.25 at 12, weight 1; unit 2 [20,24) 1, [24,28) 1 → C = 0.5 at 24
  ok(rel(S.cdfObjective(u, P, 'mcdfr', 4).value, (0.25 - F(12, 13, 4)) ** 2 + (0.5 - F(24, 22, 5)) ** 2) < 1e-14, 'modified CDFR with another class width (4 cm)');
  const cl = S.unitClasses(u[0].d, 2); ok(cl.length === 3 && cl.map(c => c.n).join() === '1,2,1' && cl.reduce((s, c) => s + c.n, 0) === 4 && cl[2].hi === 16, 'class table keeps the last class; counts add up to n');
  ok(S.cdfObjective([{ d: [10, 10.5] }], [{ a: 0, b: 13, c: 4 }], 'mcdfr', 2).value === 0 && S.cdfObjective([{ d: [10, 10.5] }], [null], 'cdfr').failed, 'one class: no term in the modified CDFR; missing parameters: objective not available'); }

/* 2. against the NumPy/SciPy reference */
const CFG = { 'ppm-cdfr': { set: 'ppm.weibull', fit: 'cdfr' }, 'ppm-mcdfr-2': { set: 'ppm.weibull', fit: 'mcdfr', width: 2 }, 'ppm-mcdfr-4': { set: 'ppm.weibull', fit: 'mcdfr', width: 4 },
  'ppm-cdfr-half': { set: 'ppm.weibull', fit: 'cdfr', ppmLoc: 'half-dmin' }, 'm2-cdfr': { set: 'prm.weibull.m2', fit: 'cdfr' }, 'm2-mcdfr-3': { set: 'prm.weibull.m2', fit: 'mcdfr', width: 3 } };
for (const c of R.cases) {
  const cfg = { terms: S.TERMS, ...CFG[c.name] }, m = S.train(X.units, cfg), tag = c.name;
  ok(m.status === 'ok', `${tag}: trained (${m.status})`); if (m.status !== 'ok') continue;
  // objective at the reference's start coefficients (same β → same value)
  const at = beta => { const free = m.keys.filter(k => k !== 'dmin'), mm = { ...m, equations: m.equations.map(e => e.key === 'dmin' ? { ...e, beta: c.dmin_beta } : { ...e, beta: beta.slice(free.indexOf(e.key) * 5, free.indexOf(e.key) * 5 + 5) }) };
    return S.cdfObjective(X.units, X.units.map(u => S.predict(mm, u.x).params), c.fit, c.width).value; };
  ok(rel(at(c.start_beta), c.start) < 1e-10, `${tag}: objective at the reference start = ${c.start}`);
  ok(rel(at(c.beta), c.objective) < 1e-10, `${tag}: objective at the reference optimum = ${c.objective}`);
  ok(m.cdf.objective <= c.objective * (1 + 1e-8) && m.cdf.objective >= c.objective * (1 - 1e-6), `${tag}: our optimum ${m.cdf.objective} vs reference ${c.objective}`);
  ok(m.cdf.objective < m.cdf.start, `${tag}: the objective decreases from the NLS start (${m.cdf.start} → ${m.cdf.objective})`);
  const free = m.equations.filter(e => e.key !== 'dmin').flatMap(e => e.beta);
  ok(free.every((b, i) => Math.abs(b - c.beta[i]) <= 2e-3 * Math.max(1, Math.abs(c.beta[i]))), `${tag}: coefficients close to the reference`);
  ok(m.cdf.weights === (c.fit === 'cdfr' ? '1/n_i' : '1/(m_i - 1)') && (c.fit === 'cdfr' ? m.cdf.position.startsWith('(j - 0.5)/n_i') : m.cdf.width === c.width && m.cdf.position.includes('last class excluded from the objective only')), `${tag}: weights, positions and class width recorded`);
  if (m.keys.includes('dmin')) { const nls = S.train(X.units, { ...cfg, fit: 'nls' }), e = m.equations.find(q => q.key === 'dmin');
    ok(e.fittedBy === 'nls' && e.beta.every((b, i) => b === nls.equations.find(q => q.key === 'dmin').beta[i]) && m.cdf.dmin === 'NLS, held fixed', `${tag}: Dmin equation from NLS, held fixed (location policy a = 0.5·Dmin)`); }
}
{ const m = S.train(X.units, { terms: S.TERMS, set: 'ppm.weibull', fit: 'cdfr', ppmLoc: 'half-dmin' }), p = S.predict(m, X.units[0].x);
  ok(rel(p.params.a, 0.5 * p.responses.dmin) < 1e-15 && m.options.ppmLoc === 'half-dmin', 'M1 location policy a = 0.5 × predicted Dmin applied and recorded');
  const z = S.train(X.units, { terms: S.TERMS, set: 'ppm.weibull', fit: 'cdfr' }); ok(S.predict(z, X.units[0].x).params.a === 0 && z.options.ppmLoc === 'zero' && !z.keys.includes('dmin'), 'M1 with a = 0: no Dmin equation'); }

/* 3. nested recovery failures are traceable; several solutions are never resolved by a rule */
{ const m = S.train(X.units, { terms: S.TERMS, set: 'prm.weibull.m8', fit: 'cdfr' });
  ok(m.status === 'invalid' && m.problems[0].code === 'stand.cdf.startfail' && m.cdf.failuresAtStart.multiple === R.units, `M8: several recovery solutions in every unit at the start → no model, counted (${JSON.stringify(m.cdf.failuresAtStart)})`);
  ok(/unique recovery solution is required/.test(m.cdf.rootPolicy), 'root policy recorded'); }
{ const m = S.train(X.units, { terms: S.TERMS, set: 'prm.weibull.m2', fit: 'cdfr' }); ok(Number.isInteger(m.cdf.rejected) && m.cdf.iter > 0, `rejected infeasible steps counted (${m.cdf.rejected}), iterations ${m.cdf.iter}`); }
{ const one = X.units.map((u, i) => i === 0 ? { ...u, d: u.d.map((_, j) => 20.1 + (j % 4) * 0.4) } : u), m = S.train(one, { terms: S.TERMS, set: 'ppm.weibull', fit: 'mcdfr', width: 2 });
  ok(m.status === 'ok' && m.cdf.excludedUnits.length === 1 && m.cdf.excludedUnits[0].plot === X.units[0].plot && m.cdf.excludedUnits[0].code === 'stand.cdf.oneclass', 'a unit whose diameters fall in one class has no modified CDFR term: left out of that objective with the reason (m > 1 required)'); }

/* 4. plot-level validation works with the CDF fits; model file */
{ const cfg = { terms: S.TERMS, set: 'ppm.weibull', fit: 'mcdfr', width: 2 }, cv = S.crossValidate(X.units, cfg, 5);
  ok(cv.status === 'ok' && cv.summary.units === R.units && cv.folds.every(f => f.status === 'ok'), `plot-level cross-validation with modified CDFR: ${cv.summary.ok} of ${cv.summary.units} predicted`);
  const m = S.train(X.units, cfg), file = JSON.parse(JSON.stringify(S.exportModel(m, cv))), im = S.importModel(file);
  ok(file.fit === 'mcdfr' && file.cdf.width === 2 && im.model && JSON.stringify(S.predict(im.model, X.units[2].x).params) === JSON.stringify(S.predict(m, X.units[2].x).params), 'model file keeps the CDF fit settings; imported model predicts the same'); }

console.log(`dist P17: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
