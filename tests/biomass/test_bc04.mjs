// Biomass Monte Carlo uncertainty (TOOLS_SPEC BC04): assets/lab/biomass/mc.js.
//   node tests/biomass/test_bc04.mjs
// 1. Against tests/ref/biomass_bc04.json from tests/ref/make_biomass_bc04.py (standard-library Python written apart:
//    same generator, same draw order): tree and plot summaries to 1e-9 (relative).
// 2. Against closed forms with many replicates: a linear form with coefficient covariance only has Var(B) = xᵀΣx,
//    x = (1, D²H); a ln form with a residual only has mean exp(η + σ²/2) and median exp(η); coefficient draws are
//    shared by the trees of a set (plot variance > sum of tree variances for a positive gradient).
// 3. "No uncertainty information", partial information labelled, bad covariance refused, same seed → same numbers.
import { readFile } from 'node:fs/promises';
import * as B from '../../assets/lab/biomass/calc.js';
import * as M from '../../assets/lab/biomass/mc.js';
import { blankSet } from '../../assets/lab/core/coef.js';

const REF = JSON.parse(await readFile(new URL('../ref/biomass_bc04.json', import.meta.url), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const rel = (a, b, tol = 1e-9) => a != null && b != null && Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

const mkSet = (id, s) => ({ ...blankSet('biomass.' + s.form), id, params: s.params, source: { citation: 'test values only' }, origin: 'user-entered',
  transform: B.FORMS[s.form].scale === 'none' ? null : { kind: B.FORMS[s.form].scale, correction: s.corr ? 'user' : 'none', ...(s.corr ? { value: s.corr } : {}) },
  meta: { ...(s.cov ? { cov: s.cov.map(r => r.join(' ')).join('; ') } : {}), ...(s.rse != null ? { rse: s.rse } : {}) } });
const sets = new Map(Object.entries(REF.sets).map(([id, s]) => [id, mkSet(id, s)]));
const ds = { schema: 'forest-dataset/1', plots: REF.plots.map(p => ({ ...p, stratum: null, area_source: 'plots', n_records: 6 })), trees: REF.trees.map(t => ({ ...t, extra: {} })) };
const cfg = { components: REF.comps.map(([key, CF]) => ({ key, CF })), map: REF.mapping, emptyCombos: 'unmeasured' };
const allo = B.computeAllometric(ds, cfg, sets);
ok(allo.trees.every(x => x.sum != null), 'point estimate: every tree computed');

// 1. reference
const R = REF.run, mc = M.monteCarlo(ds, cfg, sets, allo, { B: R.B, seed: R.seed, level: R.level });
ok(mc.status === 'ok' && mc.B === R.B && mc.seed === R.seed && mc.interval === 'percentile (type 7)' && mc.assumptions.length === 5, 'run settings and assumptions in the result');
ok(JSON.stringify(mc.sets) === JSON.stringify([{ id: 'sA', parts: ['coef', 'resid'] }, { id: 'sB', parts: ['coef'] }, { id: 'sC', parts: ['resid'] }, { id: 'sD', parts: [] }]) && mc.fixed.join() === 'sD', 'what each set contributes is labelled; a set without information is held at its point value and listed');
let bt = 0; mc.trees.forEach((t, i) => { const r = R.trees[i]; for (const k of ['mean', 'sd', 'lo', 'hi']) { if (!rel(t.B[k], r.B[k])) bt++; if (!rel(t.C[k], r.C[k])) bt++; } if (!rel(t.B.point, r.B.point, 1e-12)) bt++; });
ok(bt === 0, `${mc.trees.length} trees: mean, sd, percentile limits of B and C equal the Python reference`);
let bu = 0; mc.units.forEach((u, i) => { const r = R.units[i]; if (u.plot_id !== r.plot_id) bu++; for (const q of ['B', 'C', 'CO2']) for (const k of ['mean', 'sd', 'lo', 'hi']) if (!rel(u[q][k], r[q][k])) bu++; });
ok(bu === 0 && mc.units.length === 2, 'plot level Mg/ha: B, C, CO₂ summaries equal the Python reference');
ok(mc.units.every((u, i) => rel(u.B.point, allo.units[i].B, 1e-12)), 'point estimates beside the intervals are those of the deterministic run');
const again = M.monteCarlo(ds, cfg, sets, allo, { B: R.B, seed: R.seed, level: R.level }), other = M.monteCarlo(ds, cfg, sets, allo, { B: R.B, seed: R.seed + 1, level: R.level });
ok(JSON.stringify(again) === JSON.stringify(mc) && other.units[0].B.mean !== mc.units[0].B.mean, 'same seed → identical numbers; another seed → other numbers');

// 2. closed forms (many replicates)
const one = (form, params, meta, D, H, corr = null) => {
  const s = mkSet('s', { form, params, corr }); s.meta = meta;
  const d = { schema: 'forest-dataset/1', plots: [{ plot_id: 'P', plot_area: 10000, stratum: null, area_source: 'plots', n_records: 2 }], trees: [{ row: 1, plot_id: 'P', tree_id: '1', period: null, species: 'X', dbh: D, height: H, extra: {} }, { row: 2, plot_id: 'P', tree_id: '2', period: null, species: 'X', dbh: D * 1.3, height: H, extra: {} }] };
  const c = { components: [{ key: 'k', CF: 0.5 }], map: { X: { k: 's' } } }, m = new Map([['s', s]]), a = B.computeAllometric(d, c, m);
  return { a, r: M.monteCarlo(d, c, m, a, { B: 20000, seed: 7, level: 0.95 }) };
};
{ const cov = [[4.0, -0.002], [-0.002, 4e-6]], D = 30, H = 20, x = [1, D * D * H];
  const { a, r } = one('lin.d2h', { a: 5, b: 0.021 }, { cov: '4 -0.002; -0.002 4e-6' }, D, H);
  const v = x[0] * x[0] * cov[0][0] + 2 * x[0] * x[1] * cov[0][1] + x[1] * x[1] * cov[1][1];
  ok(Math.abs(r.trees[0].B.sd / Math.sqrt(v) - 1) < 0.02 && Math.abs(r.trees[0].B.mean / a.trees[0].sum - 1) < 0.002, `linear form, coefficients only: sd ${r.trees[0].B.sd.toFixed(3)} vs √(xᵀΣx) ${Math.sqrt(v).toFixed(3)}, mean at the point value`);
  const x2 = [1, (D * 1.3) ** 2 * H], vt = (y) => y[0] * y[0] * cov[0][0] + 2 * y[0] * y[1] * cov[0][1] + y[1] * y[1] * cov[1][1], vsum = vt([2, x[1] + x2[1]]);
  ok(Math.abs(r.units[0].B.sd / (Math.sqrt(vsum) / 1000) - 1) < 0.02 && r.units[0].B.sd ** 2 > (r.trees[0].B.sd ** 2 + r.trees[1].B.sd ** 2) / 1e6 * 1.5, 'coefficient draws shared by the trees: plot variance = (Σx)ᵀΣ(Σx), larger than the sum of tree variances'); }
{ const s2 = 0.3 ** 2, eta = -2.9 + 2.1 * Math.log(25) + 0.6 * Math.log(18);
  const { r } = one('log.dh', { a: -2.9, b: 2.1, c: 0.6 }, { rse: 0.3 }, 25, 18, 1.2);
  ok(Math.abs(r.trees[0].B.mean / Math.exp(eta + s2 / 2) - 1) < 0.01, `ln form, residual only: mean ${r.trees[0].B.mean.toFixed(2)} ≈ exp(η + σ²/2) ${Math.exp(eta + s2 / 2).toFixed(2)} (no correction factor on top of the residual)`);
  const lo = Math.exp(eta - 1.959963984540054 * 0.3), hi = Math.exp(eta + 1.959963984540054 * 0.3);
  ok(Math.abs(r.trees[0].B.lo / lo - 1) < 0.01 && Math.abs(r.trees[0].B.hi / hi - 1) < 0.01, 'ln form, residual only: 95 % limits ≈ exp(η ± 1.96σ)');
  ok(Math.abs(r.units[0].B.sd ** 2 / ((r.trees[0].B.sd ** 2 + r.trees[1].B.sd ** 2) / 1e6) - 1) < 0.05, 'residuals independent between trees: plot variance = sum of tree variances'); }
{ const { a, r } = one('log.d', { a: -3, b: 2.4 }, { cov: '0.01 -0.002; -0.002 0.0005' }, 30, null, 1.1);
  ok(Math.abs(Math.log(r.trees[0].B.lo / a.trees[0].sum) + Math.log(r.trees[0].B.hi / a.trees[0].sum)) < 0.02, 'ln form, coefficients only: the set\'s correction factor is kept, interval symmetric on the log scale around the point value'); }

// 3. states
{ const s = new Map([...sets].map(([id, x]) => [id, { ...x, meta: {} }]));
  const r = M.monteCarlo(ds, cfg, s, allo, {}); ok(r.status === 'noinfo' && !r.units && r.fixed.length === 4, 'no set gives covariance or residual: "no uncertainty information", nothing computed'); }
{ const s = new Map(sets); s.set('sB', { ...sets.get('sB'), meta: { cov: '4 1; 2 4' } });
  const r = M.monteCarlo(ds, cfg, s, allo, {}); ok(r.status === 'bad' && r.problems.some(p => p.set === 'sB' && p.code === 'cov.sym'), 'asymmetric covariance refused, set named'); }
{ const s = new Map(sets); s.set('sB', { ...sets.get('sB'), meta: { cov: '4 3; 3 1' } });
  ok(M.monteCarlo(ds, cfg, s, allo, {}).problems.some(p => p.code === 'cov.notpd'), 'covariance not positive definite refused'); }
{ const s = new Map(sets); s.set('sB', { ...sets.get('sB'), meta: { cov: '4 0 0; 0 1 0; 0 0 1' } });
  ok(M.monteCarlo(ds, cfg, s, allo, {}).problems.some(p => p.code === 'cov.shape'), 'covariance of the wrong size refused'); }
{ const s = new Map(sets); s.set('sC', { ...sets.get('sC'), meta: { rse: -1 } });
  ok(M.monteCarlo(ds, cfg, s, allo, {}).problems.some(p => p.code === 'rse.bad'), 'negative residual standard error refused'); }
ok(M.monteCarlo(ds, cfg, sets, allo, { B: 10 }).problems.some(p => p.code === 'B.range') && M.monteCarlo(ds, cfg, sets, allo, { seed: -1 }).problems.some(p => p.code === 'seed.range'), 'replicate count and seed checked');
{ const d2 = { ...ds, trees: ds.trees.map((t, i) => i === 0 ? { ...t, height: null } : t) }, a2 = B.computeAllometric(d2, cfg, sets), r = M.monteCarlo(d2, cfg, sets, a2, { B: 200 });
  ok(r.trees[0] === null && r.units[0].B === null && r.units[1].B != null, 'a tree not computed (no height): no tree interval and no interval for its plot, as for the point total'); }
ok(M.quantile7([1, 2, 3, 4], 0.25) === 1.75 && M.quantile7([5], 0.9) === 5, 'quantile type 7');
console.log(`BC04 biomass Monte Carlo: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
