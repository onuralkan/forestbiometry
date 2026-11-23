// Diameter Distribution, stage P25 (23 Nov 2026): per-hectare stand table (descriptive), dist/hatable.js.
// Reference: tests/ref/dist_p25.json from tests/ref/make_dist_p25.py (NumPy, written from the definition).
import { readFileSync } from 'node:fs';
import * as D from '../../assets/lab/dist/index.js';
const REF = JSON.parse(readFileSync(new URL('../ref/dist_p25.json', import.meta.url), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const close = (a, b) => (a == null && b == null) || Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));

const cl = REF.edges.slice(0, -1).map((lo, i) => ({ lo, hi: REF.edges[i + 1] }));
const t = D.hatable.haTable(REF.plots, cl);
ok(t.problems.length === 0 && t.m === REF.plots.length, 'five plots of different sizes');
ok(t.rows.every((r, i) => close(r.mean, REF.rows[i].mean) && close(r.se, REF.rows[i].se)), 'per class: mean N/ha and SE as NumPy (1e-9)');
ok(close(t.outside.mean, REF.outside.mean) && close(t.outside.se, REF.outside.se) && close(t.total.mean, REF.total.mean) && close(t.total.se, REF.total.se), 'outside the classes and the total as NumPy');
ok(close(t.rows.reduce((a, r) => a + r.mean, 0) + t.outside.mean, t.total.mean), 'the class means add up to the total');
{ // not the pooled count over the total area: plots of different sizes are not one area
  const pooled = REF.plots.reduce((a, p) => a + p.d.length, 0) * REF.pooledFactor;
  ok(Math.abs(pooled - t.total.mean) > 1, `mean of the plots (${t.total.mean.toFixed(2)}) differs from the pooled ratio (${pooled.toFixed(2)}) when the areas differ`); }
{ const one = D.hatable.haTable([REF.plots[0]], cl);
  ok(one.m === 1 && one.total.se === null && close(one.total.mean, REF.plots[0].d.length * 10000 / REF.plots[0].area), 'one plot: N/ha, no standard error'); }
{ const pa = D.hatable.plotAreas([{ plot: 'A', area: 400 }, { plot: 'A', area: 500 }, { plot: 'B', area: NaN }, { plot: 'C', area: 250 }]);
  ok(pa.problems.map(p => p.code).join() === 'ha.conflict,ha.missing' && pa.problems[0].plots.join() === 'A' && pa.problems[1].plots.join() === 'B' && pa.areas.get('C') === 250, 'area column: different values within a plot and missing areas reported');
  const pc = D.hatable.plotAreas([{ plot: 'A', area: NaN }, { plot: 'B', area: 7 }], 400);
  ok(!pc.problems.length && pc.areas.get('A') === 400 && pc.areas.get('B') === 400, 'common area: the same for every plot'); }
ok(D.hatable.haTable([{ plot: 'A', d: [10], area: 0 }], cl).problems[0].code === 'ha.area', 'zero area refused');
console.log(`dist P25: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
