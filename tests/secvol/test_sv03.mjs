// Stem section volume, stage SV03: data quality report and method comparison.
//   node tests/secvol/test_sv03.mjs
// Reference: tests/ref/secvol_sv01.json (scipy.integrate.quad and separately written sums on the geometric solids) and
// TOOLS_SPEC §8.1; quality flags against hand-built trees.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as V from '../../assets/lab/secvol/calc.js';
import { readStems } from '../../assets/lab/core/stems.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-10) => ok(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1), `${m}: got ${a} expected ${b}`);
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/secvol_sv01.json'), 'utf8'));
const cell = v => typeof v === 'number' ? { t: 'n', v, w: String(v) } : { t: 's', v };
const read = (rows, map, spec = {}) => readStems({ headers: [], rows: rows.map(r => r.map(cell)), rowNumbers: rows.map((_, i) => i + 2) }, map, { decimal: '.', ...spec });
const M = { plot: 0, tree: 1, h: 2, d: 3, dbh: 4, height: 5, stump_h: 6 };

/* 1. method comparison on the solids of TOOLS_SPEC §8.1: four sections, end–middle–end, Newton exact */
const SPEC81 = { paraboloid: [0.706858347058, 0.706858347058], cone: [0.463875790257, 0.485965113602], neiloid: [0.342384511856, 0.375518496874] };
for (const s of R.solids) {
  // volumes of the four-section sums from the SciPy reference (d = 0 at the tip is not a measurement, so the stem-table
  // path is checked separately below with a tip diameter of practically zero)
  const c = V.methodComparison({ huber: [fake(s.huber4)], smalian: [fake(s.smalian4)], newton: [fake(s.newton4)] }, 'newton');
  near(c.trees[0].diff.huber, 100 * (s.huber4 - s.exact) / s.exact, `${s.name}: Huber − Newton (%) = (Huber − exact)/exact`);
  near(c.trees[0].diff.smalian, 100 * (s.smalian4 - s.exact) / s.exact, `${s.name}: Smalian − Newton (%)`);
  near(c.total.huber, SPEC81[s.name][0], `${s.name}: Huber four sections = §8.1`, 1e-11); near(c.total.smalian, SPEC81[s.name][1], `${s.name}: Smalian four sections = §8.1`, 1e-11);
  if (s.name === 'paraboloid') ok(Math.abs(c.trees[0].diff.huber) < 1e-10 && Math.abs(c.trees[0].diff.smalian) < 1e-10, 'paraboloid: no difference between methods');
  else ok(c.trees[0].diff.huber < 0 && c.trees[0].diff.smalian > 0, `${s.name}: Huber below, Smalian above Newton`);
}
function fake(v) { return { status: 'ok', tree: { plot_id: 'P', tree_id: 'x', period: null }, ob: { status: 'ok', total: v }, ib: null }; }
// the same comparison computed end to end from stem tables (exact cone with the tip measured as a point is impossible,
// d = 0 is refused): sections 0–20 m of a cone measured at 0, 2.5, …, 20 with a tiny tip diameter instead of 0
{ const s = R.solids.find(x => x.name === 'cone'), hs = [0, 2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20];
  const d = h => 30 * (1 - h / 20.000001), rows = hs.map(h => ['P', 'cone', h, d(h), 30, 20.000001, 0]);
  const st = read(rows, M), res = Object.fromEntries(['huber', 'smalian', 'newton'].map(m => [m, V.allTrees(st, { method: m, layout: 'triples' })]));
  const c = V.methodComparison(res, 'newton');
  near(c.trees[0].diff.huber, 100 * (s.huber4 - s.exact) / s.exact, 'cone from a stem table: Huber − Newton (%) = §8.1', 1e-4);
  near(c.trees[0].diff.smalian, 100 * (s.smalian4 - s.exact) / s.exact, 'cone from a stem table: Smalian − Newton (%) = §8.1', 1e-4);
  eq([c.ref, c.nCommon, c.bark], ['newton', 1, ['ob']], 'reference, common trees and bark side recorded'); }

/* 2. totals and per-tree statistics over the trees computed by every method; reference is only a denominator */
{ const a = [fake(1.0), fake(2.0), { status: 'invalid', tree: { tree_id: 'z' }, ob: null, ib: null }], b = [fake(1.1), fake(1.8), fake(5)];
  const c = V.methodComparison({ newton: a, huber: b }, 'newton');
  eq(c.nCommon, 2, 'a tree not computed by every method is left out of the comparison');
  near(c.total.newton, 3, 'total of the reference'); near(c.total.huber, 2.9, 'total of the other method'); near(c.totalDiff.huber, 100 * (2.9 - 3) / 3, 'difference of the totals (%)');
  near(c.treeDiff.huber.min, -10, 'smallest per-tree difference'); near(c.treeDiff.huber.max, 10, 'largest per-tree difference'); near(c.treeDiff.huber.mean, 0, 'mean per-tree difference');
  ok(c.trees[2].diff === null && c.trees[2].v === null, 'no difference for the tree left out (never 0)');
  const c2 = V.methodComparison({ newton: a, huber: b }, 'huber'); near(c2.trees[0].diff.newton, 100 * (1 - 1.1) / 1.1, 'another reference: only the denominator changes'); }
{ const ib = { status: 'ok', tree: { tree_id: 'u' }, ob: null, ib: { status: 'ok', total: 2 } }, ib2 = { ...ib, ib: { status: 'ok', total: 2.2 } };
  const c = V.methodComparison({ newton: [ib], smalian: [ib2] }, 'newton'); eq([c.bark, c.trees[0].bark], [['ib'], 'ib'], 'under bark when there is no over-bark volume'); near(c.trees[0].diff.smalian, 10, 'under-bark difference'); }

/* 3. quality report: increasing diameters, section lengths, share of the top piece, 1.3 m diameter vs dbh */
const rows = [
  ['P', 'A', 0.3, 30, 25, 20, 0.3], ['P', 'A', 1.3, 25, 25, 20, 0.3], ['P', 'A', 3.3, 26, 25, 20, 0.3], ['P', 'A', 5.3, 22, 25, 20, 0.3], ['P', 'A', 9.3, 18, 25, 20, 0.3], ['P', 'A', 15.3, 9, 25, 20, 0.3],   // one increase at 3.3 m
  ['P', 'B', 0.3, 30, 25, 25, 0.3], ['P', 'B', 1.3, 25, 25, 25, 0.3], ['P', 'B', 3.3, 23, 25, 25, 0.3],                                                                                       // large top piece
  ['P', 'C', 0.3, 30, 29, 20, 0.3], ['P', 'C', 1.3, 25, 29, 20, 0.3], ['P', 'C', 5.3, 21, 29, 20, 0.3], ['P', 'C', 9.3, 16, 29, 20, 0.3], ['P', 'C', 13.3, 11, 29, 20, 0.3], ['P', 'C', 17.3, 5, 29, 20, 0.3],   // dbh 29 vs 25 at 1.3 m
  ['P', 'E', 1.3, 25, 25, 20, 0.3]];                                                                                                                                                        // single point: error
const st = read(rows, M), res = V.allTrees(st, { method: 'smalian', layout: 'ends' });
{ const q = V.qualityReport(st, res), by = id => q.trees.find(t => t.tree_id === id);
  eq(q.thresholds, { topShareMax: 0.1, dbhTol: 0.1, buttressH: 1.3 }, 'thresholds recorded (tool rules)');
  eq([by('A').nIncrease, by('A').flags], [1, ['d.increase']], 'A: one diameter increase above the buttress zone');
  near(by('B').topShare, res[1].ob.top / res[1].ob.total, 'B: share of the top piece'); ok(by('B').topShare > 0.5 && by('B').flags.includes('top.share'), 'B: top piece above 10 % flagged');
  near(by('C').dbhRel, (25 - 29) / 29, 'C: relative difference 1.3 m diameter vs dbh'); ok(by('C').flags.includes('dbh.mismatch'), 'C: beyond 10 % flagged');
  eq([by('A').sections.n, by('A').sections.min, by('A').sections.max], [5, 1, 6], 'A: section lengths (1, 2, 2, 4, 6 m)'); near(by('A').sections.mean, 15 / 5, 'A: mean section length');
  eq([by('E').flags, by('E').topShare, by('E').sections.n], [['tree.error'], null, 0], 'E: not computed, no numbers');
  eq([q.summary.n, q.summary.increase, q.summary.topShare, q.summary.dbh, q.summary.error], [4, 1, 1, 1, 1], 'summary counts');
  eq(by('A').bark, 'ob', 'over-bark volume used for the share'); }
{ const q = V.qualityReport(st, res, { topShareMax: 0.9 }); ok(!q.trees.find(t => t.tree_id === 'B').flags.includes('top.share') && q.thresholds.topShareMax === 0.9, 'top share threshold is a setting and recorded');
  const st2 = read(rows, M, { dbhTol: 0.2 }), q2 = V.qualityReport(st2, V.allTrees(st2, { method: 'smalian', layout: 'ends' }));
  ok(!q2.trees.find(t => t.tree_id === 'C').flags.includes('dbh.mismatch') && q2.thresholds.dbhTol === 0.2, 'dbh tolerance is a setting and recorded');
  const st3 = read(rows, M, { buttressH: 4 }), q3 = V.qualityReport(st3, V.allTrees(st3, { method: 'smalian', layout: 'ends' }));
  ok(q3.trees.find(t => t.tree_id === 'A').nIncrease === 0 && q3.thresholds.buttressH === 4, 'buttress zone is a setting: the increase at 3.3 m is inside a 4 m zone'); }

console.log(`secvol SV03: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
