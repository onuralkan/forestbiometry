// Tests for Plot & Stand Metrics (Module 2). Run: node tests/stand/test_stand.mjs
// References: the acceptance example (values given in the module prompt, recomputed by hand)
// and tests/ref/stand.json from tests/ref/make_stand_reference.py (numpy, independent code).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as C from '../../assets/lab/stand/calc.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-10) => ok(a === b || (a != null && b != null && Math.abs(a - b) <= tol * Math.max(1, Math.abs(b))), `${m}: got ${a} expected ${b}`);
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);

const tree = (plot_id, tree_id, dbh, extra = {}) => ({ row: 0, plot_id, tree_id, stem_id: null, period: null, species: 'Pb', dbh, height: null, status: null, extra: {}, ...extra });
const DS = (plots, trees) => ({ schema: C.SCHEMA, plots, trees });

/* 1. acceptance example: 500 m², d = 10, 20, 30 cm */
{
  const ds = DS([{ plot_id: 'K', plot_area: 500 }], [tree('K', '1', 10), tree('K', '2', 20), tree('K', '3', 30)]);
  eq(C.validateDataset(ds), [], 'valid dataset');
  const m = C.computeAll(ds, {}, null, null).metrics[0];
  near(m.Nha, 60, 'N = 60 trees/ha');
  near(m.Gha, 2.1991148575128552, 'G = 2.1991148575 m²/ha');       // π(100+400+900)/40000 × 20 = 0.7π
  near(m.Gha, 0.7 * Math.PI, 'G = 0.7π');
  near(m.d_mean, 20, 'arithmetic mean diameter 20 cm');
  near(m.dq, Math.sqrt(1400 / 3), 'Dq = √(1400/3)');
  near(m.dq, 21.6024689947, 'Dq ≈ 21.6024689947 cm', 1e-11);
  near(m.d_sd, 10, 'sd = 10 cm');
  near(m.ef, 20, 'expansion factor 10000/500');
  eq([m.d_min, m.d_max], [10, 30], 'min/max');
}

/* 2. empty but valid plot: N = G = 0, diameters undefined */
{
  const ds = DS([{ plot_id: 'E', plot_area: 400 }, { plot_id: 'K', plot_area: 500 }], [tree('K', '1', 10)]);
  const r = C.computeAll(ds, {}, null, null), e = r.metrics.find(x => x.plot_id === 'E');
  eq([e.state, e.n, e.Nha, e.Gha], ['empty', 0, 0, 0], 'empty plot: N and G are zero');
  eq([e.d_mean, e.dq, e.d_min, e.d_max, e.d_sd], [null, null, null, null, null], 'empty plot: diameter means undefined (null), not 0');
  eq(e.species, [], 'no species shares');
  near(r.metrics.find(x => x.plot_id === 'K').d_sd, null, 'sd undefined for n = 1');
}

/* 3. classes: half-open, never overlapping; validation */
{
  const { classes } = C.classesFromBreaks([8, 12, 16], true);
  eq(classes.map(c => [c.lo, c.hi]), [[8, 12], [12, 16], [16, Infinity]], 'breaks → classes');
  eq([7.99, 8, 11.999, 12, 16, 99].map(d => C.classIndex(classes, d)), [-1, 0, 0, 1, 2, 2], 'boundary goes to the upper class');
  eq(C.classesFromBreaks([8, 12, 12]).problem, 'cls.order', 'equal breaks rejected (would overlap)');
  eq(C.classesFromBreaks([8, 16, 12]).problem, 'cls.order', 'decreasing breaks rejected');
  eq(C.classesFromBreaks([8]).problem, 'cls.few', 'one break without open top rejected');
  eq(C.breaksFromWidth(8, 4, 30), [8, 12, 16, 20, 24, 28, 32], 'width 4 from 8 covering 30');
  eq(C.breaksFromWidth(0, 2.5, 5), [0, 2.5, 5], 'width 2.5');
  eq(C.breaksFromWidth(0.1, 0.2, 0.7), [0.1, 0.3, 0.5, 0.7], 'no floating drift');
  const ds = DS([{ plot_id: 'K', plot_area: 500 }], [tree('K', '1', 7), tree('K', '2', 12), tree('K', '3', 20)]);
  const m = C.computeAll(ds, {}, C.classesFromBreaks([8, 12, 16]).classes, null).metrics[0];
  eq([m.below, m.classes.map(c => c.n), m.above], [1, [0, 1], 1], 'out-of-range trees counted separately');
  near(m.classes[1].Nha, 20, 'class N/ha');
}

/* 4. numpy reference on the fixture (two periods, different areas, empty plot, status filter, strata) */
const ds = JSON.parse(readFileSync(path.join(here, 'fixture.json'), 'utf8'));
const ref = JSON.parse(readFileSync(path.join(root, 'tests/ref/stand.json'), 'utf8'));
eq(C.validateDataset(ds), [], 'fixture valid');
eq(C.periodsOf(ds), ['2019', '2024'], 'periods');
const classes = C.classesFromBreaks(ref.breaks, true).classes;
const scen = { all_empty: { status: null, emptyCombos: 'empty' }, live_unmeasured: { status: ['canli', ''], emptyCombos: 'unmeasured' } };
for (const [name, opts] of Object.entries(scen)) {
  const r = C.computeAll(ds, opts, classes, { type: 'srs', forestArea_ha: ref.forest_ha });
  const rs = C.computeAll(ds, opts, classes, { type: 'strat', strataArea_ha: ref.strata_ha });
  for (const [per, R] of Object.entries(ref.scenarios[name])) {
    const ms = r.metrics.filter(m => m.period === per && C.isValidUnit({ state: m.state }));
    eq(ms.map(m => m.plot_id), R.units.map(u => u.plot_id), `${name} ${per}: units`);
    for (const u of R.units) {
      const m = ms.find(x => x.plot_id === u.plot_id), tag = `${name} ${per} ${u.plot_id}`;
      ok(m.n === u.n, `${tag} n`);
      for (const k of ['Nha', 'G_m2', 'Gha', 'd_mean', 'dq', 'd_sd', 'd_min', 'd_max']) near(m[k], u[k], `${tag} ${k}`);
      eq(m.classes.map(c => c.n), u.class_n, `${tag} class counts`); ok(m.below === u.below, `${tag} below`);
      for (const [sp, s] of Object.entries(u.species)) { const x = m.species.find(y => y.species === sp); ok(x.n === s.n, `${tag} ${sp} n`); near(x.shareN, s.shareN, `${tag} ${sp} %N`); near(x.shareG, s.shareG, `${tag} ${sp} %G`); }
      ok(m.h_measured.n === u.h_measured_n && m.h_estimated.n === u.h_estimated_n, `${tag} height counts (measured/estimated apart)`);
      near(m.h_measured.mean, u.h_measured_mean, `${tag} measured height mean`); near(m.h_estimated.mean, u.h_estimated_mean, `${tag} estimated height mean`);
    }
    const bp = r.byPeriod.find(b => b.period === per);
    if (R.between) for (const k of ['Nha', 'Gha']) { near(bp.between[k].mean, R.between[k].mean, `${name} ${per} between ${k} mean`); near(bp.between[k].sd, R.between[k].sd, `${name} ${per} between ${k} sd`); near(bp.between[k].median, R.between[k].median, `${name} ${per} between ${k} median`); }
    if (R.srs) for (const k of ['Nha', 'Gha']) { const e = bp.forest.estimate[k]; near(e.mean, R.srs[k].mean, `${name} ${per} SRS ${k}`); near(e.se, R.srs[k].se, `${name} ${per} SRS SE ${k}`); near(e.total, R.srs[k].total, `${name} ${per} total ${k}`); }
    else ok(bp.forest.estimate === null && bp.forest.problems.some(p => p.code === 'est.few'), `${name} ${per}: no SRS estimate with < 2 plots`);
    const bs = rs.byPeriod.find(b => b.period === per);
    if (R.strat) for (const k of ['Nha', 'Gha']) { near(bs.forest.estimate[k].mean, R.strat[k].mean, `${name} ${per} strat ${k}`); near(bs.forest.estimate[k].se, R.strat[k].se, `${name} ${per} strat SE ${k}`); }
    else ok(bs.forest.estimate === null, `${name} ${per}: no stratified estimate when a stratum has < 2 plots`);
  }
}

/* 5. undecided plot–period combinations block the forest estimate; descriptive summary leaves them out */
{
  const r = C.computeAll(ds, { status: null, emptyCombos: null }, classes, { type: 'srs' });
  const b24 = r.byPeriod.find(b => b.period === '2024');
  ok(b24.unknown === 5, '5 undecided combinations in 2024');
  ok(b24.forest.estimate === null && b24.forest.problems[0].code === 'est.unknown', 'forest estimate blocked while undecided');
  ok(b24.between.m === 1, 'descriptive summary uses decided plots only');
}

/* 6. not pooling trees: plots of different size are not merged into one "forest plot" */
{
  const d2 = DS([{ plot_id: 'a', plot_area: 100 }, { plot_id: 'b', plot_area: 1000 }], [tree('a', '1', 20), tree('b', '1', 20), tree('b', '2', 20)]);
  const r = C.computeAll(d2, {}, null, { type: 'srs' });
  near(r.byPeriod[0].forest.estimate.Nha.mean, (100 + 20) / 2, 'mean of per-plot N/ha (60), not pooled 3 trees / 0.11 ha (27.3)');
  near(r.byPeriod[0].forest.estimate.Nha.se, Math.sqrt(((100 - 60) ** 2 + (20 - 60) ** 2) / 1 / 2), 'SE from plots (m = 2), not from trees');
  ok(r.byPeriod[0].forest.estimate.Nha.m === 2 && r.byPeriod[0].forest.estimate.Nha.df === 1, 'm = number of plots');
}

/* 7. stratified: problems are reported, not guessed */
{
  const r = C.computeAll(ds, { status: null, emptyCombos: 'empty' }, null, { type: 'strat', strataArea_ha: { A: 70 } });
  ok(r.byPeriod[0].forest.problems.some(p => p.code === 'est.noarea' && p.stratum === 'B'), 'missing stratum area reported');
  const d3 = DS([{ plot_id: 'a', plot_area: 100 }, { plot_id: 'b', plot_area: 100, stratum: 'X' }], []);
  ok(C.computeAll(d3, {}, null, { type: 'strat', strataArea_ha: { X: 1 } }).byPeriod[0].forest.problems.some(p => p.code === 'est.nostratum'), 'plot without stratum reported');
}

/* 8. dataset validation */
eq(C.validateDataset({ schema: 'x', plots: [], trees: [] }), ['ds.schema'], 'wrong schema');
eq(C.validateDataset(DS([{ plot_id: 'a', plot_area: 0 }], [tree('z', '1', -1)])), ['ds.plotarea', 'ds.treeplot', 'ds.dbh'], 'bad plot area, unknown plot, bad dbh');

console.log(`stand: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
