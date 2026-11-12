// Stand Structure, stage SS02: spatial structure (Clark–Evans with and without Donnelly, W, M, T, U, edge handling).
//   node tests/structure/test_ss02.mjs
// Reference: tests/ref/structure_ss02.json (tests/ref/make_structure_ss02.py: scipy.spatial.cKDTree, also periodic;
// azimuths by numpy) and TOOLS_SPEC §8.3. Definitions provisional until their sources are read (METHODS §16 SS02).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as SP from '../../assets/lab/structure/spatial.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/structure_ss02.json'), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-12) => ok(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${m}: got ${a} expected ${b}`);
const close = (a, b, tol = 1e-12) => a.length === b.length && a.every((v, i) => (v === null && b[i] === null) || Math.abs(v - b[i]) <= tol);

/* 1. TOOLS_SPEC §8.3: lattices without edge effect (toroidal) */
{ const T = []; for (let i = 0; i < 20; i++) for (let j = 0; j < 20; j++) T.push({ row: T.length + 2, x: i + 0.5, y: j + 0.5, dbh: 20, species: 'A' });
  const r = SP.spatialUnit(T, { shape: 'rect', x0: 0, y0: 0, x1: 20, y1: 20 }, { edge: 'toroidal' });
  near(r.ce.R, 2, '§8.3 Clark–Evans R, square lattice', 1e-13); near(r.ce.R, R.lattice.squareR, 'square lattice = cKDTree (periodic)', 1e-13);
  ok(r.means.W === 0 && R.lattice.squareW === 0, '§8.3 W = 0, square lattice, k = 4, standard angle 72°');
  ok(r.means.M === 0 && r.means.T === 0 && r.means.U === 1, 'one species, equal diameters: M = 0, T = 0, U = 1 (equal counts as not smaller)');
  const h = Math.sqrt(3) / 2, H = []; for (let a = 0; a < 20; a++) for (let c = 0; c < 20; c++) H.push({ x: c + (a % 2) * 0.5 + 0.25, y: a * h + h / 2, dbh: 20, species: 'A' });
  const rh = SP.spatialUnit(H, { shape: 'rect', x0: 0, y0: 0, x1: 20, y1: 20 * h }, { edge: 'toroidal', k: 1 });
  near(rh.ce.R, 2.149139863647, '§8.3 Clark–Evans R, hexagonal lattice', 1e-11); near(rh.ce.R, R.lattice.hexR, 'hexagonal lattice = cKDTree', 1e-12); }

/* 2. random patterns: neighbours and every index against cKDTree */
R.cases.forEach((c, k) => {
  const tag = `${c.geom.shape} ${k + 1} (n = ${c.x.length})`, trees = c.x.map((x, i) => ({ row: i + 2, x, y: c.y[i], dbh: c.dbh[i], species: c.species[i] }));
  const r = SP.spatialUnit(trees, c.geom, { edge: 'none' });
  ok(r.status === 'ok' && r.trees.every((t, i) => t.neighbours.join() === c.idx[i].map(j => j + 2).join()), `${tag}: 4 nearest neighbours = cKDTree`);
  ok(close(r.trees.map(t => t.nn1), c.nn1) && close(r.trees.map(t => t.edgeDist), c.edgeDist, 1e-12), `${tag}: nearest-neighbour and boundary distances`);
  for (const q of ['W', 'M', 'T', 'U']) ok(close(r.trees.map(t => t[q]), c[q], 1e-12), `${tag}: ${q} per tree`);
  ok(r.trees.every((t, i) => t.edge === c.edge[i]) && r.nEdge === c.edge.filter(Boolean).length, `${tag}: edge trees flagged (closer to the boundary than to the 4th neighbour)`);
  near(r.ce.R, c.ce.R, `${tag}: Clark–Evans R`); near(r.ce.RD, c.ce.RD, `${tag}: Clark–Evans R, Donnelly`);
  const b = SP.spatialUnit(trees, c.geom, { edge: 'buffer', buffer: 5 });
  ok(b.trees.every((t, i) => t.ref === c.ref[i]) && b.nRef === c.ref.filter(Boolean).length, `${tag}: buffer 5 m: reference trees`);
  near(b.ce.R, c.ceBuffer.R, `${tag}: buffer R (reference trees, λ of the whole plot)`); near(b.means.W, c.ceBuffer.W, `${tag}: buffer W`); near(b.ce.RD, c.ce.RD, `${tag}: Donnelly R unchanged by the buffer (all trees)`);
  if (c.torus) { const t = SP.spatialUnit(trees, c.geom, { edge: 'toroidal' });
    ok(t.trees.every((q, i) => q.neighbours.join() === c.torus.idx[i].map(j => j + 2).join()), `${tag}: toroidal neighbours = cKDTree(boxsize)`);
    near(t.ce.R, c.torus.R, `${tag}: toroidal R`); for (const q of ['W', 'M', 'T', 'U']) near(t.means[q], c.torus[q], `${tag}: toroidal ${q}`); }
});

/* 3. Poisson patterns: the plain R is biased upwards by the edge; Donnelly's expectation reduces the bias */
{ const P = R.poisson, Rs = [], RDs = [];
  for (const set of P.sets) { const r = SP.spatialUnit(set.map(([x, y]) => ({ x, y, dbh: 20, species: 'A' })), { shape: 'rect', x0: 0, y0: 0, x1: 30, y1: 30 }); Rs.push(r.ce.R); RDs.push(r.ce.RD); }
  const mR = Rs.reduce((a, b) => a + b, 0) / Rs.length, mRD = RDs.reduce((a, b) => a + b, 0) / RDs.length;
  near(mR, P.meanR, 'Poisson (400 × 50 trees): mean plain R = Python', 1e-12); near(mRD, P.meanRD, 'mean Donnelly R = Python', 1e-12);
  ok(mR > 1.03 && Math.abs(mRD - 1) < Math.abs(mR - 1) / 3, `edge effect: mean R = ${mR.toFixed(4)} > 1; Donnelly ${mRD.toFixed(4)} much closer to 1`); }

/* 4. problems: nothing computed from a partial or impossible map */
{ const g = { shape: 'circle', cx: 0, cy: 0, r: 10 }, base = [{ row: 2, x: 0, y: 0, dbh: 20 }, { row: 3, x: 3, y: 1, dbh: 25 }, { row: 4, x: -4, y: 2, dbh: 15 }, { row: 5, x: 1, y: -6, dbh: 30 }, { row: 6, x: 5, y: 5, dbh: 22 }, { row: 7, x: -2, y: -3, dbh: 18 }];
  ok(SP.spatialUnit(base.map(t => ({ ...t, x: null, y: null })), g).status === 'nocoord', 'no coordinates at all: "no coordinates" state, not zeros');
  const o = SP.spatialUnit([...base, { row: 8, x: 12, y: 0, dbh: 20 }], g); ok(o.status === 'invalid' && o.problems.some(p => p.code === 'xy.outside' && p.rows.includes(8)), 'a tree outside the plot: problem with its row, nothing computed');
  const m = SP.spatialUnit([...base, { row: 9, x: null, y: 1, dbh: 20 }], g); ok(m.status === 'invalid' && m.problems.some(p => p.code === 'xy.missing' && p.rows.includes(9)), 'a tree without coordinates: problem with its row');
  ok(SP.spatialUnit(base, g, { edge: 'toroidal' }).problems.some(p => p.code === 'sp.torus.shape'), 'toroidal translation only for rectangles');
  ok(SP.spatialUnit(base.slice(0, 4), g).problems.some(p => p.code === 'sp.few'), 'fewer than k + 1 trees: not computed');
  ok(SP.spatialUnit(base, g, { edge: 'buffer', buffer: 20 }).problems.some(p => p.code === 'sp.noref'), 'buffer wider than the plot: no reference tree, not computed');
  const s = SP.spatialUnit([...base, { row: 10, x: 3, y: 1, dbh: 21 }], g); ok(s.status === 'ok' && s.warnings.some(w => w.code === 'xy.same' && w.rows.join() === '3,10'), 'two trees at the same position: reported with both rows');
  const a = SP.spatialUnit(base, g, { areaRecorded: 500 }); ok(a.warnings.some(w => w.code === 'geom.area'), 'plot area of the geometry differs from the recorded area: warned');
  ok(SP.spatialUnit(base, g).settings.edge === 'none' && SP.spatialUnit(base, g).settings.k === 4, 'settings (edge handling, k, geometry) written into the result'); }

/* 5. speed: 10 000 trees */
{ let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647, P = Array.from({ length: 10000 }, () => ({ x: rnd() * 100, y: rnd() * 100, dbh: 10 + 30 * rnd(), species: rnd() < 0.5 ? 'A' : 'B' }));
  const t0 = Date.now(), r = SP.spatialUnit(P, { shape: 'rect', x0: 0, y0: 0, x1: 100, y1: 100 }), ms = Date.now() - t0;
  ok(r.status === 'ok' && ms < 3000, `10 000 trees in ${ms} ms (grid neighbour search)`); }

console.log(`structure SS02: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
