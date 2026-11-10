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


/* D0, H0 (100 largest trees per hectare, by diameter or by height), hm, dm, N, BA, age, Dq
   reference: tests/ref/stand_dominant.json from tests/ref/make_stand_dominant_reference.py (numpy, stems per hectare) */
{
  const REF = JSON.parse(readFileSync(path.join(root, 'tests/ref/stand_dominant.json'), 'utf8'));
  for (const c of REF.cases) {
    const trees = c.dbh.map((d, i) => tree('P', String(i + 1), d, { height: c.h[i], age: c.age[i] }));
    const ds = DS([{ plot_id: 'P', plot_area: c.area }], trees);
    eq(C.validateDataset(ds), [], c.name + ': valid');
    const m = C.computeAll(ds, {}, null, null).metrics[0];
    near(m.dom.k, c.k, c.name + ': k');
    near(m.dom.d.D0, c.D0_dbh, c.name + ': D0 by diameter', 1e-12); near(m.dom.d.H0, c.H0_dbh, c.name + ': H0 by diameter', 1e-12);
    near(m.dom.h.D0, c.D0_height, c.name + ': D0 by height', 1e-12); near(m.dom.h.H0, c.H0_height, c.name + ': H0 by height', 1e-12);
    near(m.age.mean, c.age_mean, c.name + ': mean age of aged trees', 1e-12); eq(m.age.n, c.age_n, c.name + ': aged trees');
    near(m.h_measured.mean, c.hm, c.name + ': hm', 1e-12); near(m.d_mean, c.dm, c.name + ': dm', 1e-12); near(m.dq, c.dq, c.name + ': Dq', 1e-12);
    near(m.Nha, c.N, c.name + ': N', 1e-12); near(m.Gha, c.BA, c.name + ': BA', 1e-12);
    // row order must not matter (ties at the boundary share the weight)
    const rev = C.computeAll(DS([{ plot_id: 'P', plot_area: c.area }], trees.slice().reverse()), {}, null, null).metrics[0];
    near(rev.dom.d.H0, c.H0_dbh, c.name + ': H0 by diameter, reversed rows', 1e-12); near(rev.dom.h.D0, c.D0_height, c.name + ': D0 by height, reversed rows', 1e-12);
  }
  // hand examples
  const t = (d, h) => tree('A', String(d) + '-' + h, d, { height: h });
  let m = C.computeAll(DS([{ plot_id: 'A', plot_area: 1250 }], Array.from({ length: 20 }, (_, i) => t(20 + i, 10 + i / 2))), {}, null, null).metrics[0];
  near(m.dom.d.D0, 415.5 / 12.5, 'hand: 1250 m², 12 trees + half of the 13th');
  m = C.computeAll(DS([{ plot_id: 'A', plot_area: 400 }], [t(50, 18), t(48, 17), t(30, 24), t(29, 23), t(28, 22), t(20, 10)]), {}, null, null).metrics[0];
  near(m.dom.d.D0, (50 + 48 + 30 + 29) / 4, 'hand: by diameter takes the 4 thickest'); near(m.dom.h.H0, (24 + 23 + 22 + 18) / 4, 'hand: by height takes the 4 tallest');
  ok(m.dom.d.short === false && m.dom.d.nSel === 4, 'hand: 4 selected, not short');
  m = C.computeAll(DS([{ plot_id: 'A', plot_area: 1800 }], [t(30, 15), t(25, 13)]), {}, null, null).metrics[0];
  ok(m.dom.d.short === true && m.dom.d.D0 === 27.5, 'fewer trees than k: all trees, flagged');
  m = C.computeAll(DS([{ plot_id: 'A', plot_area: 400 }], [t(50, 21), tree('A', 'x', 48), t(46, 19), t(44, 18), t(20, 15)]), {}, null, null).metrics[0];
  ok(m.dom.d.D0 === 47 && m.dom.d.H0 === null && m.dom.d.why === 'h.sel', 'H0 not given when a dominant tree has no measured height');
  ok(m.dom.h.D0 === null && m.dom.h.why === 'h.rank', 'selection by height impossible when a height is missing');
  m = C.computeAll(DS([{ plot_id: 'A', plot_area: 400 }], [t(50, 21), tree('A', 'e', 48, { height: 30, height_source: 'estimated' }), t(46, 19), t(44, 18), t(20, 15)]), {}, null, null).metrics[0];
  ok(m.dom.d.H0 === null && m.dom.h.D0 === null, 'estimated heights are not used for H0');
  m = C.computeAll(DS([{ plot_id: 'E', plot_area: 400 }], []), {}, null, null).metrics[0];
  ok(m.dom.d.D0 === null && m.dom.d.why === 'empty' && m.age.mean === null, 'empty plot: no D0, H0, age');
  eq(C.validateDataset(DS([{ plot_id: 'A', plot_area: 400 }], [tree('A', '1', 20, { age: -3 })])), ['ds.age'], 'negative age rejected');
}

/* direct table import (Excel/CSV without the Data Checker) */
{
  const { parseNumber, toInternal } = await import('../../assets/lab/core/num.js');
  const cell = v => v == null ? null : typeof v === 'number' ? { t: 'n', v } : { t: 's', v };
  const tbl = (rows, name = 'x.xlsx') => ({ name, headers: ['species', 'plot', 'treeno', 'dbh', 'age', 'h', 'plotsize'], rows: rows.map(r => r.map(cell)), rowNumbers: rows.map((_, i) => i + 2) });
  const map = { species: 0, plot: 1, tree: 2, dbh: 3, age: 4, height: 5, area: 6 }, spec = { decimal: '.', dbhUnit: 'cm', hUnit: 'm', areaUnit: 'm2' };
  let r = C.tableToDataset(tbl([[1, 1, 1, 28.5, 75, 14.5, 700], [1, 1, 2, 48.2, 75, 18.8, 700], [1, 2, 1, 30, null, '', 400]]), map, spec, parseNumber, toInternal);
  eq(r.problems, [], 'field file shape imported');
  eq(C.validateDataset(r.ds), [], 'imported dataset valid');
  eq(r.ds.plots, [{ plot_id: '1', plot_area: 700, stratum: null }, { plot_id: '2', plot_area: 400, stratum: null }], 'plots and areas from the plotsize column');
  eq([r.ds.trees[0].dbh, r.ds.trees[0].height, r.ds.trees[0].age, r.ds.trees[0].species, r.ds.trees[0].row], [28.5, 14.5, 75, '1', 2], 'tree values and source row');
  ok(r.ds.trees[2].height === null && r.ds.trees[2].age === null, 'empty height and age stay missing');
  r = C.tableToDataset(tbl([[1, 'A', 1, '24,5', '75', '14,5', '0,07']]), map, { ...spec, decimal: ',', areaUnit: 'ha' }, parseNumber, toInternal);
  eq([r.ds.trees[0].dbh, r.ds.trees[0].height], [24.5, 14.5], 'comma decimals'); near(r.ds.plots[0].plot_area, 700, 'hectare area → m²', 1e-12);
  r = C.tableToDataset(tbl([[1, 'A', 1, 245, 75, 145, 700]]), map, { ...spec, dbhUnit: 'mm', hUnit: 'dm' }, parseNumber, toInternal);
  near(r.ds.trees[0].dbh, 24.5, 'mm → cm'); near(r.ds.trees[0].height, 14.5, 'dm → m');
  r = C.tableToDataset(tbl([[1, 'A', 1, 20, 75, 14, 700], [1, 'A', 2, 22, 75, 15, 800], [1, 'A', 2, 23, 75, 15, 700], [1, '', 3, 20, 1, 1, 700], [1, 'B', 1, 'x', 1, 1, 700], [1, 'B', 2, 20, 1, -2, 700], [1, 'B', 3, 20, 'old', 1, 700], [1, 'B', 4, 20, 1, 1, '']]), map, spec, parseNumber, toInternal);
  ok(r.ds === null, 'problems block the import');
  eq(r.problems.map(p => [p.code, p.row]), [['row.areaconf', 3], ['row.dup', 4], ['row.plot', 5], ['row.dbh', 6], ['row.height', 7], ['row.age', 8], ['row.area', 9]], 'every problem listed with its source row');
  r = C.tableToDataset(tbl([[1, 'A', 1, 20, 75, 14, null]]), { ...map, area: null }, { ...spec, areaConst: 500 }, parseNumber, toInternal);
  eq(r.ds.plots[0].plot_area, 500, 'one area for every plot when no area column');
  eq(C.tableToDataset(tbl([[1, 'A', 1, 20, 75, 14, 700]]), { ...map, area: null }, spec, parseNumber, toInternal).problems, [{ code: 'map.area' }], 'no area column and no constant');
  eq(C.tableToDataset(tbl([[1, 'A', 1, 20, 75, 14, 700]]), { ...map, dbh: null }, spec, parseNumber, toInternal).problems, [{ code: 'map.need' }], 'diameter column required');
  r = C.tableToDataset(tbl([[1, 'A', 1, 20, 75, 14, 700], [1, 'A', 1, 21, 75, 14, 700]]), { ...map, tree: null }, spec, parseNumber, toInternal);
  eq(r.ds.trees.map(t => t.tree_id), ['2', '3'], 'without a tree column the row number is the tree id');
}

console.log(`stand: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
