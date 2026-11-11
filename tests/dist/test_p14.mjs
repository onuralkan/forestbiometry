// Diameter distribution engine, stage P14: bootstrap p-values and percentile intervals.
//   node tests/dist/test_p14.mjs
// Reference: tests/ref/dist_p14.json (tests/ref/make_dist_p14.py: the same mulberry32 stream and inverse-CDF draws,
// refits and statistics with SciPy — norm.fit, weibull_min.fit, kstest, cramervonmises — and numpy type-7 quantiles).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as D from '../../assets/lab/dist/index.js';
import * as BT from '../../assets/lab/dist/bootstrap.js';
import { rng } from '../../assets/lab/core/stats.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-12) => ok(Number.isFinite(a) && Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1), `${m}: got ${a} expected ${b}`);
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/dist_p14.json'), 'utf8'));
const FX = JSON.parse(readFileSync(path.join(root, 'tests/weibull/fixture.json'), 'utf8')).samples;
const MID = { normal: 'normal.ml', weibull: 'weibull.ml', exponential: 'exponential.ml' };

/* 1. against the SciPy re-implementation on the same random stream */
for (const c of R.cases) {
  const d = FX[c.sample], r = D.runMethod(MID[c.family], { d }, c.family === 'normal' ? {} : { a: 0 }), tag = c.id;
  ok(BT.resolution(d) === 0.1, `${tag}: measurement resolution 0.1 cm detected`);
  if (c.ge) {
    const g = BT.bootstrapGOF({ result: r, input: { d }, opts: c.family === 'normal' ? {} : { a: 0 }, B: c.B, seed: c.seed, step: c.step });
    eq([g.completed, g.step], [c.completed, c.step], `${tag}: ${c.completed} of ${c.B} replicates refitted (the others have a diameter ≤ 0 after rounding)`);
    if (c.completed < c.B) ok(g.failed.invalid === c.B - c.completed && g.warn, `${tag}: failed replicates counted as invalid and flagged`);
    for (const k of ['ks', 'ad', 'cvm']) {
      near(g.stats[k].t0, c.t0[k], `${tag} ${k}: T0 = SciPy`, c.family === 'weibull' ? 1e-5 : 1e-10);
      eq(g.stats[k].ge, c.ge[k], `${tag} ${k}: replicates with T ≥ T0 = SciPy`); near(g.stats[k].p, c.p[k], `${tag} ${k}: p = (1 + ge)/(B + 1)`, 1e-15);
      near(g.stats[k].mcse, Math.sqrt(c.p[k] * (1 - c.p[k]) / c.completed), `${tag} ${k}: Monte Carlo standard error`, 1e-14);
    }
  } else {
    const ci = BT.bootstrapCI({ result: r, input: { d }, opts: c.family === 'normal' ? {} : { a: 0 }, B: c.B, seed: c.seed, step: c.step, scheme: c.scheme });
    eq([ci.completed, ci.scheme, ci.interval], [c.B, c.scheme, 'percentile (type 7)'], `${tag}: completed, scheme, interval type`);
    for (const [k, v] of Object.entries(c.ci)) { near(ci.intervals[k].lo, v.lo, `${tag} ${k}: lower 2.5 %`, 1e-10); near(ci.intervals[k].hi, v.hi, `${tag} ${k}: upper 97.5 %`, 1e-10); near(ci.intervals[k].se, v.se, `${tag} ${k}: bootstrap SE`, 1e-9); }
  }
}

/* 2. reproducibility and re-estimation in every replicate */
{ const d = FX.small, r = D.runMethod('normal.ml', { d }), a = BT.bootstrapGOF({ result: r, input: { d }, B: 49, seed: 42 }), b = BT.bootstrapGOF({ result: r, input: { d }, B: 49, seed: 42 }), c = BT.bootstrapGOF({ result: r, input: { d }, B: 49, seed: 43 });
  eq(a, b, 'same seed → identical result'); ok(JSON.stringify(a.stats) !== JSON.stringify(c.stats), 'another seed → another Monte Carlo result');
  ok(a.refitsSample.length === 5 && new Set(a.refitsSample.map(x => x.join())).size === 5 && a.refitsSample.every(x => x[0] !== r.params.mu), 're-estimated in every replicate (different estimates, none equal to the original)');
  let calls = 0; const orig = D.method('normal.ml').run; D.method('normal.ml').run = (i, o) => { calls++; return orig(i, o); };
  BT.bootstrapCI({ result: r, input: { d }, B: 30, seed: 1 }); D.method('normal.ml').run = orig; eq(calls, 30, 'the method runs once per replicate'); }

/* 3. the observation process is repeated: thresholds, classes, rounding; fixed bounds stay fixed */
{ const d = FX.w2.filter(v => v >= 8), r = D.runMethod('weibull.tml', { d }, { a: 0, trunc: { lower: 8 } }), nx = rng(5);
  const sims = Array.from({ length: 20 }, () => BT.simulate(r, { d }, 0.1, nx).d);
  ok(sims.every(s => s.length === d.length && s.every(v => v >= 8 && Math.abs(v * 10 - Math.round(v * 10)) < 1e-9)), 'thresholded fit: replicates drawn from the conditional model, all ≥ L, rounded to 0.1 cm');
  const g = BT.bootstrapGOF({ result: r, input: { d }, opts: { a: 0, trunc: { lower: 8 } }, B: 25, seed: 3 });
  ok(g.completed + Object.values(g.failed).reduce((a, b) => a + b, 0) === 25 && g.stats.ks.p != null, 'conditional ML refitted in the replicates'); }
{ const cl = D.classes.makeClasses({ edges: [4, 8, 12, 16, 20, 26, 32, 40, Infinity] }), cnt = D.classes.countRaw(cl, FX.w2.filter(v => v >= 4)).counts, cls = cl.map((c, j) => ({ ...c, n: cnt[j] }));
  const inp = { type: 'classes', classes: cls, countType: 'count', outside: 'unrecorded' }, r = D.runMethod('weibull.gml', inp, { a: 0 });
  const s = BT.simulate(r, inp, null, rng(9)); ok(s.classes.reduce((a, c) => a + c.n, 0) === cls.reduce((a, c) => a + c.n, 0) && s.classes.every((c, j) => c.lo === cls[j].lo && Number.isInteger(c.n)), 'grouped: replicate counts on the same classes, same total');
  const g = BT.bootstrapGOF({ result: r, input: inp, opts: { a: 0 }, B: 25, seed: 4 }); ok(Object.keys(g.stats).join() === 'x2' && g.stats.x2.p > 0 && g.stats.x2.p <= 1, 'grouped: Pearson X² bootstrap p-value');
  eq(BT.bootstrapGOF({ result: r, input: { ...inp, countType: 'perha' }, B: 5 }).unsupported, 'boot.perha', 'per-hectare frequencies: unsupported, stated');
  eq(BT.bootstrapGOF({ result: r, input: { ...inp, outside: 'zero' }, B: 5 }).unsupported, 'boot.zero', 'outside "measured, no trees": unsupported, stated');
  eq(BT.bootstrapCI({ result: r, input: inp, B: 5, scheme: 'nonparametric' }).unsupported, 'boot.npclasses', 'non-parametric resampling of classes: unsupported'); }
{ const d = FX.small, r = D.runMethod('beta.ml', { d }, { L: 0, U: 41 }), g = BT.bootstrapGOF({ result: r, input: { d }, opts: { L: 0, U: 41 }, B: 40, seed: 2 });
  ok(r.params.L === 0 && r.params.U === 41, 'beta: fixed external bounds');
  ok(g.completed + Object.values(g.failed).reduce((a, b) => a + b, 0) === 40, 'every replicate counted (completed or failed by state)');
  ok(g.failed.invalid > 0 && g.warn === (g.failRate > 0.05), `replicates rounded onto the fixed bound U are refused, counted (${JSON.stringify(g.failed)}) and flagged`); }

/* 4. guards */
{ const d = FX.small, r = D.runMethod('normal.ml', { d });
  ok(BT.bootstrapGOF({ result: r, input: { d }, B: 10, seed: 1 }).stats.ks.p === null, 'fewer than 20 completed replicates: no p-value');
  eq(BT.bootstrapGOF({ result: { ...r, status: 'invalid' }, input: { d }, B: 10 }).unsupported, 'boot.notok', 'failed fit: no bootstrap');
  const rr = D.runMethod('weibull.m2', { type: 'summary', summary: D.weibullSummary(d) }, { loc: 'user', a: 0 }); eq(BT.bootstrapGOF({ result: rr, input: { type: 'summary' }, B: 10 }).unsupported, 'boot.kind', 'recovery methods: unsupported (no data process in the summary workflow)');
  ok(BT.resolution([20.13, 20.2]) === 0.01 && BT.resolution([20, 21]) === 1 && BT.resolution([Math.PI]) === null, 'resolution: 0.01, 1, none'); }

console.log(`dist P14: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
