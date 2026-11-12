// Stand Structure, page stage (TOOLS_SPEC SS04): the run over all units (run.js), the plot geometry, the Lorenz curve
// and the coordinates read by the shared table import (stand/calc.js tableToDataset).
//   node tests/structure/test_ss04.mjs
// Reference: the per-unit functions already tested against SciPy/brute force (test_ss01, test_ss02, test_ss07), hand
// cases, and the identity Gini = 1 − 2·(area under the Lorenz curve) checked by the trapezoid rule.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { tableFromText } from '../../assets/lab/core/table.js';
import { parseNumber, toInternal } from '../../assets/lab/core/num.js';
import { tableToDataset, buildUnits } from '../../assets/lab/stand/calc.js';
import * as RUN from '../../assets/lab/structure/run.js';
import * as S from '../../assets/lab/structure/calc.js';
import * as SP from '../../assets/lab/structure/spatial.js';
import * as C from '../../assets/lab/structure/competition.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-12) => ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${m}: got ${a} expected ${b}`);
const spec = { decimal: '.', dbhUnit: 'cm', hUnit: 'm', areaUnit: 'm2', areaConst: NaN };

/* 1. coordinates through the shared table import */
{ const tbl = tableFromText('plot,tree,dbh,area,x,y\nA,1,20,400,-3.5,2\nA,2,25,400,0,0\nA,3,30,400,,\n', { delim: ',' });
  const r = tableToDataset(tbl, { plot: 0, tree: 1, dbh: 2, area: 3, x: 4, y: 5 }, spec, parseNumber, toInternal);
  ok(!r.problems.length && r.ds.trees[0].x === -3.5 && r.ds.trees[0].y === 2 && r.ds.trees[1].x === 0 && r.ds.trees[2].x === null, 'x, y read (negative and zero allowed, empty = no coordinate)');
  const h = tableToDataset(tableFromText('plot,dbh,area,x,y\nA,20,400,1,\n', { delim: ',' }), { plot: 0, dbh: 1, area: 2, x: 3, y: 4 }, spec, parseNumber, toInternal);
  ok(h.ds === null && h.problems[0].code === 'row.xyhalf' && h.problems[0].row === 2, 'only one of x and y: problem with its row');
  const b = tableToDataset(tableFromText('plot,dbh,area,x,y\nA,20,400,a,1\n', { delim: ',' }), { plot: 0, dbh: 1, area: 2, x: 3, y: 4 }, spec, parseNumber, toInternal);
  ok(b.ds === null && b.problems[0].code === 'row.xy', 'unreadable coordinate: problem');
  const n = tableToDataset(tbl, { plot: 0, tree: 1, dbh: 2, area: 3 }, spec, parseNumber, toInternal);
  ok(!('x' in n.ds.trees[0]), 'without coordinate columns the records are as before (Plot & Stand unchanged)'); }

/* 2. the sample data and the whole run */
const csv = readFileSync(path.join(root, 'assets/lab/structure/ornek/ornek-mescere.csv'), 'utf8'), tbl = tableFromText(csv, { delim: ',' });
const { ds } = tableToDataset(tbl, { plot: 0, tree: 1, species: 2, dbh: 3, height: 4, x: 5, y: 6, area: 7 }, spec, parseNumber, toInternal);
ok(ds && ds.trees.length === 158 && ds.plots.length === 3, 'sample: 158 trees in 3 plots of 500 m²');
const opts = { structure: {}, spatial: { k: 4, edge: 'none' }, geometry: { shape: 'circle-area', cx: 0, cy: 0 }, competition: { mode: 'radius', radius: 6 } }, R = RUN.analyse(ds, opts);
ok(R.hasXY && R.units.length === 3 && R.skipped.length === 0, 'three units, coordinates found');
const { units } = buildUnits(ds, { emptyCombos: 'unmeasured' });
R.units.forEach((u, i) => {
  const G = { shape: 'circle', cx: 0, cy: 0, r: Math.sqrt(500 / Math.PI) }, T = units[i].trees.map(t => ({ row: t.row, tree_id: t.tree_id, x: t.x, y: t.y, dbh: t.dbh, species: t.species }));
  ok(JSON.stringify(u.st.measures) === JSON.stringify(S.structureUnit(units[i]).measures), `plot ${u.plot_id}: structure = structureUnit`);
  ok(u.sp.status === 'ok' && u.sp.ce.R === SP.spatialUnit(T, G, { k: 4, edge: 'none' }).ce.R && u.sp.settings.geometry.r === G.r, `plot ${u.plot_id}: spatial = spatialUnit with a circle of radius √(A/π)`);
  ok(u.ci.status === 'ok' && u.ci.trees.every((t, j) => t.hegyi === C.hegyi(T, G, { mode: 'radius', radius: 6 }).trees[j].hegyi), `plot ${u.plot_id}: Hegyi = hegyi()`);
  const L = u.lorenz; let area = 0; for (let j = 1; j < L.length; j++) area += (L[j][0] - L[j - 1][0]) * (L[j][1] + L[j - 1][1]) / 2;
  ok(L[0][0] === 0 && L[0][1] === 0 && Math.abs(L[L.length - 1][0] - 1) < 1e-12 && Math.abs(L[L.length - 1][1] - 1) < 1e-12, `plot ${u.plot_id}: Lorenz curve from (0, 0) to (1, 1)`);
  near(1 - 2 * area, u.st.measures.gini, `plot ${u.plot_id}: Gini = 1 − 2·area under the Lorenz curve`, 1e-12);
});
ok(R.units[0].sp.ce.R > 1.4 && R.units[1].sp.ce.R < 1, `sample: the regular plot is regular (R = ${R.units[0].sp.ce.R.toFixed(3)}), the clustered one clustered (R = ${R.units[1].sp.ce.R.toFixed(3)})`);

/* 3. geometry choices, no coordinates, unmeasured combinations */
ok(JSON.stringify(RUN.geometryFor({ shape: 'rect', x0: 0, y0: 0, x1: 20, y1: 25 }, { area: 500 })) === '{"shape":"rect","x0":0,"y0":0,"x1":20,"y1":25}' && RUN.geometryFor({ shape: 'circle', cx: 1, cy: 2, r: 9 }, { area: 1 }).r === 9, 'rectangle and explicit circle as given');
{ const noxy = { ...ds, trees: ds.trees.map(({ x, y, ...t }) => t) }, r = RUN.analyse(noxy, { structure: {}, spatial: null });
  ok(!r.hasXY && r.units.every(u => u.st.status === 'ok' && u.sp.status === 'off' && u.ci.status === 'off'), 'no coordinates: structure computed, spatial part off'); }
{ const two = { ...ds, trees: ds.trees.map(t => ({ ...t, period: t.plot_id === '3' ? '2025' : '2020' })) }, r = RUN.analyse(two, opts);
  ok(r.units.length === 3 && r.skipped.length === 3 && r.skipped.every(x => x.state === 'unmeasured'), 'plot–period combinations without records: left out as not measured, listed'); }
{ const out = { ...ds, trees: ds.trees.map((t, i) => i === 0 ? { ...t, x: 30 } : t) }, r = RUN.analyse(out, opts);
  ok(r.units[0].sp.status === 'invalid' && r.units[0].sp.problems.some(p => p.code === 'xy.outside' && p.rows.includes(2)) && r.units[0].st.status === 'ok', 'a tree outside the plot: spatial part not computed for that plot, structure still given'); }
near(S.gini([1, 2, 3, 4]), 0.25, 'Gini(1, 2, 3, 4) = Σ|xi − xj|/(2n²x̄) = 20/(2·16·2.5)');

console.log(`structure SS04: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
