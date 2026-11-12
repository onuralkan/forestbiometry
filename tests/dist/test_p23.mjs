// Diameter distribution engine, stage P23: empirical basal area diameter distribution (descriptive).
//   node tests/dist/test_p23.mjs
// Reference: a hand-computed example and tests/ref/dist_p23.json (tests/ref/make_dist_p23.py: NumPy; percentiles by
// numpy.percentile with weights g and method 'inverted_cdf', classes by numpy.digitize).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as D from '../../assets/lab/dist/index.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/dist_p23.json'), 'utf8'));
const B = D.basal;
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-13) => ok(a === b || (Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1)), `${m}: got ${a} expected ${b}`);

/* 1. hand-computed: d = 10, 20, 30 cm; g ∝ 1 : 4 : 9 → F_G = 1/14, 5/14, 1 */
{ const d = [30, 10, 20], e = B.baEcdf(d), g = B.gOf;
  near(g(10), Math.PI / 400, 'g = π d²/40000 m² (d = 10 cm: 0.00785398…)');
  ok(e.x.join() === '10,20,30' && e.FN.every((v, i) => Math.abs(v - [1, 2, 3][i] / 3) < 1e-15) && e.FG.every((v, i) => Math.abs(v - [1, 5, 14][i] / 14) < 1e-15), 'hand: F_N = 1/3, 2/3, 1; F_G = 1/14, 5/14, 1');
  const p = B.baPercentiles(d, [0, 0.05, 1 / 14, 0.1, 0.3, 5 / 14, 0.4, 0.5, 1]);
  ok(p.d.join() === '10,10,10,20,20,20,30,30,30' && p.dgM === 30, 'hand: percentiles (smallest d with F_G ≥ p) and dgM = 30 (half the basal area is above 20 cm): ' + p.d);
  ok(p.def === B.BA_DEF && /inverted_cdf/.test(p.def), 'percentile definition recorded');
  const t = B.baClassTable([{ lo: 0, hi: 15 }, { lo: 15, hi: 25 }, { lo: 25, hi: 35 }], d, 10000 / 100);
  near(t.rows[0].b, g(10) * 100, 'hand: b_k = Σg × 10000/area (m²/ha)'); near(t.rows[2].share, 9 / 14, 'hand: share 9/14');
  ok(t.rows.every(r => Math.abs(r.fObs - 100) < 1e-12), 'hand: f_k = b_k / ḡ_k(observed) = 100 trees/ha each (one tree on 100 m²)');
  near(t.rows[0].fMid, 100 * (10 / 7.5) ** 2, 'hand: mid-diameter approximation f_k = b_k / g(7.5) = 177.78 (approximation, not the count)');
  ok(t.unit === 'm2/ha' && B.baClassTable([{ lo: 0, hi: 15 }], d, null).unit === 'm2 (plot)', 'unit: m²/ha with an area, m² on the plot without'); }

/* 2. against NumPy */
for (const c of R.cases) {
  const d = R.samples[c.sample], tag = c.sample, e = B.baEcdf(d);
  ok(e.x.length === c.x.length && e.x.every((v, i) => v === c.x[i]) && e.FN.every((v, i) => Math.abs(v - c.FN[i]) < 1e-14) && e.FG.every((v, i) => Math.abs(v - c.FG[i]) < 1e-13), `${tag}: F_N and F_G at the distinct diameters = NumPy`);
  near(e.G, c.G, `${tag}: G`);
  const p = B.baPercentiles(d);
  ok(p.probs.join() === R.probs.join() && p.d.every((v, i) => v === c.pct[i]), `${tag}: percentiles 0, 10, …, 90, 95, 100 % = numpy inverted_cdf: ${p.d} vs ${c.pct}`);
  ok(p.dgM === c.pct[5], `${tag}: dgM = the 50 % percentile (${p.dgM} cm)`);
  const cl = D.classes.makeClasses({ edges: c.edges.map(v => v == null ? Infinity : v) }), k = c.area ? 10000 / c.area : null, t = B.baClassTable(cl, d, k);
  t.rows.forEach((r, i) => { const q = c.rows[i], l = `${tag} [${q.lo}, ${q.hi ?? '∞'})`;
    ok(r.n === q.n, `${l}: n`); near(r.b, q.b, `${l}: b_k`); near(r.share, q.share, `${l}: share`);
    if (q.gObs != null) near(r.gObs, q.gObs, `${l}: ḡ_k observed`); near(r.fObs, q.fObs, `${l}: f_k = b_k/ḡ_k`, 1e-12);
    ok(Math.abs(r.fObs - r.nHa) <= 1e-12 * Math.max(1, r.nHa), `${l}: f_k from the observed ḡ_k = the observed count (×10000/area) exactly`);
    if (q.fMid == null) ok(r.fMid === null, `${l}: no mid-diameter for the open class`); else near(r.fMid, q.fMid, `${l}: f_k from the mid-diameter (approximation)`, 1e-12); });
  ok(t.below.n === c.below.n && t.above.n === c.above.n && Math.abs(t.below.b - c.below.b) < 1e-14 && Math.abs(t.above.b - c.above.b) < 1e-14, `${tag}: trees below and above the classes kept apart`);
  const sb = t.rows.reduce((a, r) => a + r.b, 0) + t.below.b + t.above.b + t.gaps.b, sf = t.rows.reduce((a, r) => a + r.fObs, 0) + t.below.fObs + t.above.fObs + t.gaps.fObs;
  near(sb, t.total.b, `${tag}: Σ b_k (with tails) = total G`, 1e-13); near(sf, t.total.nHa, `${tag}: Σ f_k (with tails) = total N`, 1e-12);
  near(t.rows.reduce((a, r) => a + r.share, 0) + t.below.share + t.above.share + t.gaps.share, 1, `${tag}: shares sum to 1`, 1e-14);
}

/* 3. tree-number class tables are unchanged by this stage (same function, same numbers) */
{ const d = R.samples.w2, cl = D.classes.makeClasses({ edges: [4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48] }), r = D.runMethod('weibull.ml', { d }, { a: 0 });
  const o = D.classes.countRaw(cl, d), t = B.baClassTable(cl, d, 25);
  ok(o.counts.every((n, i) => n === t.rows[i].n) && o.below === t.below.n && o.above === t.above.n, 'class counts of the basal area table = the tree-number class table');
  ok(D.classes.classTable(D.family('weibull'), r.params, cl, o.counts, { n: d.length, perHa: 25 }).rows.every((x, i) => x.obsHa === o.counts[i] * 25), 'tree-number class table as before'); }
ok(B.checkBasal([10, 0, 12]).some(p => p.code === 'd.nonpos'), 'non-positive diameters refused');

console.log(`dist P23: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
