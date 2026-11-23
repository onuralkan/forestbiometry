// Diameter Distribution, stage P26 (23 Nov 2026): comparison of stand-model methods as in Poudel and Cao (2013):
// method 10 in the stand model, per-equation terms and backward elimination, AD/KS/mLogL/EI on validation units,
// repeated fit/validation splits, relative ranks (dist/stand.js, dist/standcmp.js).
//   node tests/dist/test_p26.mjs
// Reference: tests/ref/dist_p26.json from tests/ref/make_dist_p26.py (SciPy, written from the definitions).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as D from '../../assets/lab/dist/index.js';
import { tableFromText } from '../../assets/lab/core/table.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/dist_p26.json'), 'utf8'));
const csv = readFileSync(path.join(root, 'assets/lab/dist/ornek/ornek-mescere.csv'), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-12);
const S = D.stand, C = D.standcmp, spec = { dcol: 2, pcol: 0, percol: 1, decimal: '.', unit: 'cm', cols: { N: 3, H: 4, A: 5 } };
const X = S.extractStandUnits(tableFromText(csv, { delim: ',' }), spec), U = X.units;
const unit = (pl, pe) => U.find(u => u.plot === pl && String(u.period) === String(pe));
ok(U.length === R.units && U.every(u => u.x.n === u.d.length), 'units; n = trees measured on the unit');

/* 1. statistics of a validation unit (Eqs. 6–9) */
for (const e of R.evals) { const u = unit(e.plot, e.period), g = C.evalUnit(e.params, u.d, u.x.N, 2);
  ok(rel(g.ad, e.ad) < 1e-8 && rel(g.ks, e.ks) < 1e-10 && rel(g.mlogl, e.mlogl) < 1e-10 && rel(g.ei, e.ei) < 1e-10, `${e.plot}/${e.period}: AD, KS, mLogL, EI as SciPy (${g.ad.toFixed(4)}, ${g.ks.toFixed(4)}, ${g.mlogl.toFixed(3)}, ${g.ei.toFixed(3)})`); }
{ const u = U[0]; ok(C.evalUnit({ a: 0, b: 15, c: 2 }, u.d, 0).ei === null, 'EI needs N: null without it');
  const g = C.evalUnit({ a: Math.min(...u.d) + 1, b: 15, c: 2 }, u.d, u.x.N); ok(g.mlogl === Infinity, 'a tree below the location: mLogL infinite (the unit drops out of the comparison)'); }

/* 2. backward elimination at 5 % */
{ const set = S.responseSet('prm.weibull.m2', { loc: 'half-dmin' }), rows = U.map(u => ({ u, t: S.targets(u.d, set) }));
  const el = S.eliminate(rows, set.keys, S.TERMS, 0.05);
  for (const k of ['mean', 'variance', 'dmin']) { const r = R.elimination[k], st = el.steps.filter(s => s.key === k);
    ok(el.termsBy[k].join() === r.terms.join() && st.map(s => s.term).join() === r.steps.map(s => s.term).join() && st.every((s, i) => rel(s.p, r.steps[i].p) < 1e-5),
      `${k}: dropped ${st.map(s => s.term + ' (p ' + s.p.toFixed(3) + ')').join(', ')}, kept ${el.termsBy[k].join(', ')} as SciPy`); }
  const m = S.train(U, { set: 'prm.weibull.m2', terms: S.TERMS, fit: 'nls', loc: 'half-dmin', eliminate: true, alpha: 0.05 });
  ok(m.status === 'ok' && m.elimination && m.elimination.steps.length === el.steps.length, 'train with elimination records the steps');
  for (const e of m.equations) ok(e.terms.join() === R.elimination[e.key].terms.join() && e.beta.length === 1 + e.terms.length && e.beta.every((b, j) => rel(b, R.elimination[e.key].beta[j]) < 1e-6), `${e.key}: NLS coefficients of the reduced equation as SciPy`);
  const x = unit('A01', 2019).x, pr = S.predict(m, x);
  ok(pr.status === 'ok' && rel(pr.responses.mean, Math.exp(S.design(x, m.equations[0].terms).reduce((a, z, j) => a + m.equations[0].beta[j] * z, 0))) < 1e-14, 'prediction uses each equation\'s own terms');
  const back = S.importModel(JSON.parse(JSON.stringify(S.exportModel(m))));
  ok(back.model && back.model.equations.every((e, i) => e.terms.join() === m.equations[i].terms.join()), 'model file keeps the per-equation terms');
  const bad = JSON.parse(JSON.stringify(S.exportModel(m))); bad.equations[0].beta.push(0.1);
  ok(!!S.importModel(bad).problems, 'model file with a coefficient count that does not match its equation\'s terms is refused');
  // SUR with per-equation terms: the same terms everywhere give the shared-terms fit
  const xs = rows.map(r => r.u.x), Y = rows.map(r => set.keys.map(k => r.t[k])), a = S.fitSUR(xs, Y, S.TERMS), b = S.fitSUR(xs, Y, set.keys.map(() => S.TERMS));
  ok(a.status === 'ok' && b.status === 'ok' && a.beta.flat().every((v, j) => rel(v, b.beta.flat()[j]) < 1e-12), 'SUR: per-equation terms, all equal, give the shared fit');
  const sm = S.train(U, { set: 'prm.weibull.m2', terms: S.TERMS, fit: 'sur', loc: 'half-dmin', eliminate: true });
  ok(sm.status === 'ok' && sm.equations.every(e => e.terms.join() === R.elimination[e.key].terms.join() && e.beta.length === 1 + e.terms.length), 'SUR with the eliminated terms per equation'); }

/* 3. method 10 */
{ const set = S.responseSet('prm.weibull.m10'); ok(set.keys.join() === 'dq,q25,q50,q95,dmin' && set.m10, 'method 10 responses: Dq, Q25, Q50, Q95, Dmin (n from the unit)');
  const m = S.train(U, { set: 'prm.weibull.m10', terms: S.TERMS, fit: 'nls' });
  ok(m.status === 'ok' && S.modelNeeds(m).join() === 'N,H,A', 'method 10 model trained by NLS');
  let checked = 0;   // on the simulated sample the predicted Dmin is small, so a < 0 is reported (never moved to zero)
  for (const u of U) { const pr = S.predict(m, u.x), k = Math.cbrt(u.x.n), a = pr.responses ? (k * pr.responses.dmin - pr.responses.q50) / (k - 1) : NaN;
    const got = pr.status === 'ok' ? pr.params.a : (pr.recovery && (pr.recovery.problems || []).find(q => q.code === 'm10.aneg') || {}).a;
    if (rel(got, a) < 1e-12 && (pr.status === 'ok' || a < 0)) checked++; }
  ok(checked === U.length, `a = (n^(1/3)·Dmin − Q50)/(n^(1/3) − 1) from the predicted Dmin, Q50 and the unit's n, reported when negative (${checked}/${U.length} units)`);
  const { n, ...x } = U[0].x; ok(S.predict(m, x).problems[0].code === 'stand.n', 'method 10 without n: not predicted');
  const c = S.train(U, { set: 'prm.weibull.m10', terms: ['lnN', 'lnH'], fit: 'cdfr' });
  ok(c.cdf && c.cdf.fixedKeys.join() === 'dmin,q50', `CDFR method 10: the Dmin and Q50 equations held fixed from NLS (status ${c.status})`);
  if (c.status === 'ok') { const nl = S.train(U, { set: 'prm.weibull.m10', terms: ['lnN', 'lnH'], fit: 'nls' });
    ok(['dmin', 'q50'].every(k => c.equations.find(e => e.key === k).beta.every((v, j) => v === nl.equations.find(e => e.key === k).beta[j])), 'CDFR method 10: Dmin and Q50 coefficients are the NLS ones'); } }

/* 4. splits */
{ const plots = U.map(u => u.plot), all = [...new Set(plots)], sp = C.splits(plots, 4, 0.5, 7), sp2 = C.splits(plots, 4, 0.5, 7);
  ok(sp.every(s => s.fit.size === Math.round(all.length / 2) && s.fit.size + s.val.size === all.length && [...s.fit].every(p => !s.val.has(p))), 'each split: half the plots fit, the rest validate, no plot on both sides');
  ok(JSON.stringify(sp.map(s => [...s.fit])) === JSON.stringify(sp2.map(s => [...s.fit])) && new Set(sp.map(s => [...s.fit].sort().join())).size > 1, 'seeded: the same seed gives the same splits; the repetitions differ'); }

/* 5. ranks (Eq. 10) and the overall rank, hand check */
{ const st = (ad, ks, ml, ei) => ({ ad: { mean: ad }, ks: { mean: ks }, mlogl: { mean: ml }, ei: { mean: ei } });
  const ms = [{ id: 'A', stats: st(1, 0.1, 100, 50) }, { id: 'B', stats: st(2, 0.2, 90, 70) }, { id: 'C', stats: st(3, 0.15, 110, 60) }];
  const r = C.rankMethods(ms);
  // A: 1, 1, 2, 1 → 5; B: 2, 3, 1, 3 → 9; C: 3, 2, 3, 2 → 10; overall 1 + 2 (s − 5)/5
  ok(r.R.ad.A === 1 && Math.abs(r.R.ks.C - 2) < 1e-12 && r.R.mlogl.A === 2 && r.R.ei.C === 2 && r.sum.A === 5 && r.sum.B === 9 && r.sum.C === 10 && Math.abs(r.overall.B - 2.6) < 1e-12 && r.overall.A === 1 && r.overall.C === 3, 'relative ranks per statistic, overall rank = relative rank of their sum');
  const r2 = C.rankMethods(ms, ['C']); ok(r2.ranked.join() === 'A,B' && r2.overall.A === 1 && r2.overall.B === 2, 'excluded methods are left out of the ranks');
  ms[1].stats.ei.mean = null; ok(C.rankMethods(ms).stats.join() === 'ad,ks,mlogl', 'EI only when every ranked method has it'); }

/* 6. the comparison run, common units */
{ const cf = [{ id: 'm1', label: 'M1 NLS', cfg: { set: 'ppm.weibull', ppmLoc: 'half-dmin', terms: S.TERMS, fit: 'nls' } },
    { id: 'm2', label: 'M2 NLS', cfg: { set: 'prm.weibull.m2', loc: 'half-dmin', terms: S.TERMS, fit: 'nls' } },
    { id: 'm3', label: 'M3 SUR', cfg: { set: 'prm.weibull.m3', loc: 'half-dmin', terms: S.TERMS, fit: 'sur' } }];
  let prog = 0; const res = C.compareStand(U, cf, { reps: 2, share: 0.5, seed: 3 }, () => prog++);
  ok(prog === 6 && res.methods.length === 3 && res.splits.length === 2, 'progress per repetition × method');
  ok(res.methods.every(m => m.models.ok + m.models.failed === 2 && m.evaluated + Object.values(m.failed).reduce((a, v) => a + v, 0) === res.settings.valUnits), 'every validation unit is evaluated or counted with its reason');
  const common = res.commonUnits; ok(common > 0 && res.methods.every(m => m.units === common), `default: the units common to all methods (${common})`);
  const own = C.summarise(res, { rowSet: 'own' }); ok(own.methods.every(m => m.units === m.evaluated), 'own units: each method on everything it evaluated');
  const ex = C.summarise(res, { exclude: ['m1'] }); ok(!('m1' in ex.ranks.overall) && ex.commonUnits >= common, 'exclusion recomputes the common units and ranks without refitting');
  // the mean over the common units by hand
  const m = res.methods[1], keys = [...res.methods[0].byUnit.keys()].filter(k => res.methods.every(q => q.byUnit.has(k)));
  ok(rel(m.stats.ks.mean, keys.reduce((a, k) => a + m.byUnit.get(k).ks, 0) / keys.length) < 1e-12, 'mean KS over the common units');
  const viaEntries = C.summarise({ ...res, methods: res.methods.map(q => ({ ...q, byUnit: [...q.byUnit.entries()] })) });
  ok(viaEntries.commonUnits === common && Math.abs(viaEntries.ranks.overall.m2 - res.ranks.overall.m2) < 1e-15, 'summary also from the entries of a worker message'); }

console.log(`dist P26: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
