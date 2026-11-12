// Stand Structure, SS-07/a1: competition indices (Hegyi with a radius or the k nearest, edge handling; BAL and
// relative size from SS01; appended tree-table columns).
//   node tests/structure/test_ss07.mjs
// Reference: tests/ref/structure_ss07.json (tests/ref/make_structure_ss07.py: brute-force double loop over all pairs).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as C from '../../assets/lab/structure/competition.js';
import * as S from '../../assets/lab/structure/calc.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/structure_ss07.json'), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const close = (a, b, tol = 1e-11) => a.length === b.length && a.every((v, i) => v != null && Math.abs(v - b[i]) <= tol * Math.max(1, Math.abs(b[i])));

/* 1. Hegyi against the brute-force double loop */
for (const c of R.cases) {
  const tag = c.geom.shape, trees = c.x.map((x, i) => ({ row: i + 2, x, y: c.y[i], dbh: c.dbh[i] }));
  const k4 = C.hegyi(trees, c.geom), k6 = C.hegyi(trees, c.geom, { k: 6 }), r6 = C.hegyi(trees, c.geom, { mode: 'radius', radius: 6 });
  ok(k4.status === 'ok' && close(k4.trees.map(t => t.hegyi), c.knn4), `${tag}: Hegyi, 4 nearest = brute force`);
  ok(close(k6.trees.map(t => t.hegyi), c.knn6), `${tag}: Hegyi, 6 nearest = brute force`);
  ok(close(r6.trees.map(t => t.hegyi), c.r6) && r6.trees.every((t, i) => t.nComp === c.r6n[i]), `${tag}: Hegyi, radius 6 m = brute force (and the number of competitors)`);
  ok(r6.trees.every((t, i) => t.edge === (c.edgeDist[i] < 6)) && r6.nEdge === c.edgeDist.filter(e => e < 6).length, `${tag}: no correction: trees closer to the boundary than R flagged as edge trees`);
  const b = C.hegyi(trees, c.geom, { mode: 'radius', radius: 6, edge: 'buffer', buffer: 5 });
  ok(b.trees.every((t, i) => c.buffer[i] ? Math.abs(t.hegyi - c.r6[i]) <= 1e-11 * Math.max(1, c.r6[i]) : t.hegyi === null && t.why === 'buffer'), `${tag}: buffer 5 m: no index in the buffer, the same index elsewhere (buffer trees still compete)`);
  if (c.torus_r6) { const t = C.hegyi(trees, c.geom, { mode: 'radius', radius: 6, edge: 'toroidal' }), tk = C.hegyi(trees, c.geom, { edge: 'toroidal' });
    ok(close(t.trees.map(q => q.hegyi), c.torus_r6), `${tag}: toroidal, radius 6 m = brute force (minimum image)`); ok(close(tk.trees.map(q => q.hegyi), c.torus_knn4), `${tag}: toroidal, 4 nearest = brute force`); }
}

/* 2. hand case: subject 20 cm; competitors 30 cm at 2 m and 10 cm at 4 m → (30/20)/2 + (10/20)/4 = 0.875 */
{ const g = { shape: 'rect', x0: 0, y0: 0, x1: 20, y1: 20 }, T = [{ row: 2, x: 10, y: 10, dbh: 20 }, { row: 3, x: 12, y: 10, dbh: 30 }, { row: 4, x: 10, y: 14, dbh: 10 }, { row: 5, x: 1, y: 1, dbh: 25 }];
  const r = C.hegyi(T, g, { mode: 'radius', radius: 5 }); ok(Math.abs(r.trees[0].hegyi - 0.875) < 1e-15, 'hand: CI = (30/20)/2 + (10/20)/4 = 0.875');
  ok(r.trees[3].hegyi === 0 && r.trees[3].nComp === 0 && r.warnings.some(w => w.code === 'ci.nocomp'), 'no competitor within R: CI = 0, reported');
  const s = C.hegyi([...T, { row: 6, x: 12, y: 10, dbh: 18 }], g, { mode: 'radius', radius: 5 });
  ok(s.status === 'ok' && s.samePosition.length === 1 && s.samePosition[0].rows.join() === '3,6', 'two trees at the same position: reported with both rows');
  ok(s.trees[1].hegyi === null && s.trees[4].hegyi === null && s.trees.every(t => t.hegyi === null || Number.isFinite(t.hegyi)), 'no infinite index: the two trees get none');
  ok(Math.abs(s.trees[0].hegyi - (0.875 + 18 / 20 / 2)) < 1e-15, 'they still compete with the other trees');
  ok(C.hegyi(T, g, { mode: 'radius' }).problems[0].code === 'ci.radius', 'radius mode without a radius: refused (no default radius)');
  ok(C.hegyi(T, g, { mode: 'radius', radius: 12, edge: 'toroidal' }).problems.some(p => p.code === 'ci.torus.radius'), 'toroidal with R ≥ half the side: refused');
  ok(C.hegyi(T.map(t => ({ ...t, x: null, y: null })), g).status === 'nocoord', 'no coordinates: "no coordinates", not zeros');
  ok(C.hegyi([...T, { row: 7, x: 25, y: 3, dbh: 20 }], g, { mode: 'radius', radius: 5 }).problems.some(p => p.code === 'xy.outside' && p.rows.includes(7)), 'a tree outside the plot: problem with its row'); }

/* 3. a unit: BAL and relative size from SS01, Hegyi added; appended tree-table columns */
{ const c = R.cases[0], trees = c.x.map((x, i) => ({ row: i + 2, plot_id: 'A', tree_id: String(i + 1), species: 'Ps', dbh: c.dbh[i], x, y: c.y[i] }));
  const u = { plot_id: 'A', period: null, area: 1200, state: 'measured', trees }, r = C.competitionUnit(u, c.geom, {}, { mode: 'radius', radius: 6 }), st = S.structureUnit(u);
  ok(r.status === 'ok' && r.trees.every((t, i) => t.bal === st.trees[i].bal && t.relD === st.trees[i].relD) && close(r.trees.map(t => t.hegyi), c.r6), 'unit: BAL and d/Dq as SS01, Hegyi as the brute force');
  const n = C.competitionUnit(u, null); ok(n.status === 'ok' && n.spatial.status === 'nogeom' && n.trees.every(t => t.hegyi === null && t.bal != null), 'no plot geometry: BAL and relative size only, Hegyi not given');
  const head = ['plot', 'tree', 'dbh', 'BAL'], body = [['A', '1', 20.5, 'x'], ['A', '2', 18, 'y']], per = new Map([[2, { bal: 1.25, hegyi: 0.5 }]]);
  const rows = C.appendColumns(head, body, [2, 3], per, [['BAL', 'bal'], ['Hegyi', 'hegyi']]);
  ok(rows[0].join() === 'plot,tree,dbh,BAL,BAL_ci,Hegyi' && rows[1].join() === 'A,1,20.5,x,1.25,0.5' && rows[2].slice(4).every(v => v === null), 'appended columns: source rows unchanged, a taken name gets "_ci", rows without values empty'); }

/* 4. speed */
{ let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, P = Array.from({ length: 10000 }, (_, i) => ({ row: i, x: rnd() * 100, y: rnd() * 100, dbh: 10 + 30 * rnd() }));
  const t0 = Date.now(), r = C.hegyi(P, { shape: 'rect', x0: 0, y0: 0, x1: 100, y1: 100 }, { mode: 'radius', radius: 5 }), ms = Date.now() - t0; ok(r.status === 'ok' && ms < 3000, `10 000 trees, radius 5 m: ${ms} ms`); }

console.log(`structure SS-07: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
