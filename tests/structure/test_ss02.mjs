// Stand structure, stage SS02: spatial structure (Clark–Evans with and without Donnelly, W, M, U, T, edge options).
//   node tests/structure/test_ss02.mjs
// Reference: tests/ref/structure_ss02.json (tests/ref/make_structure_ss02.py: scipy.spatial.cKDTree, periodic boxsize
// for the torus, separately written definitions), TOOLS_SPEC §8.3 grid values and Dixon's (2002) worked example.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as S from '../../assets/lab/structure/spatial.js';
import { rng } from '../../assets/lab/core/stats.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-12) => ok(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1), `${m}: got ${a} expected ${b}`);
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/structure_ss02.json'), 'utf8'));
const unit = (trees, area = null) => ({ plot_id: 'P', period: null, area, trees });

/* 1. TOOLS_SPEC §8.3: infinite grids (torus) */
const square = (m, a = 1) => { const t = []; for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) t.push({ row: t.length + 2, x: (i + 0.5) * a, y: (j + 0.5) * a, dbh: 20 + ((i + j) % 3), species: (i + j) % 2 ? 'A' : 'B' }); return t; };
{ const r = S.unitSpatial(unit(square(20)), { shape: 'rect', x0: 0, y0: 0, x1: 20, y1: 20 }, { edge: 'torus' });
  near(r.clarkEvans.R, 2, 'square grid, torus: R = 2', 1e-14); ok(r.W === 0, 'square grid, k = 4, α0 = 72°: W = 0 exactly');
  ok(r.M === 1, 'checkerboard species: every neighbour of another species (M = 1)');
  const r90 = S.unitSpatial(unit(square(20)), { shape: 'rect', x0: 0, y0: 0, x1: 20, y1: 20 }, { edge: 'torus', alpha0: 90 });
  ok(r90.W === 0, 'square grid, α0 = 90° (= 360°/4, Pommerening 2002): α = 90° is not smaller, W = 0'); }
{ const a = 2, h = a * Math.sqrt(3) / 2, m = 24, t = [];
  for (let j = 0; j < m; j++) for (let i = 0; i < m; i++) t.push({ row: t.length + 2, x: i * a + (j % 2) * a / 2, y: j * h, dbh: 20 });
  const g = { shape: 'rect', x0: -a / 4, y0: -h / 2, x1: m * a - a / 4, y1: m * h - h / 2 };
  const r = S.unitSpatial(unit(t), g, { edge: 'torus', k: 6, alpha0: 72 });
  near(r.clarkEvans.R, 2.149139863647, 'hexagonal grid, torus: R = 2.149139863647', 1e-12); near(r.clarkEvans.R, R.grids.hexagonal, 'hexagonal R = Python', 1e-13);
  ok(r.W === 1, 'hexagonal grid, six neighbours, α0 = 72°: all six 60° angles smaller → W = 1 (α0 must suit k; recorded)'); }

/* 2. Donnelly: Dixon's (2002) worked example (630 trees in 200 m × 50 m: E = 1.992 m uncorrected, 2.034 m corrected) */
{ const c = S.clarkEvans(2, 630, 10000, 500);
  near(c.E, R.dixon.E, 'E(r) uncorrected = Python'); near(c.donnelly.E, R.dixon.Ed, 'E(r) Donnelly = Python');
  ok(c.E.toFixed(3) === '1.992' && c.donnelly.E.toFixed(3) === '2.034', `E(r) as printed by Dixon: 1.992 and 2.034 (got ${c.E.toFixed(3)}, ${c.donnelly.E.toFixed(3)})`); }

/* 3. simulated plots against the cKDTree reference */
for (const c of R.cases) {
  const trees = c.x.map((x, i) => ({ row: i + 2, tree_id: String(i + 1), x, y: c.y[i], dbh: c.dbh[i], species: c.species[i] }));
  for (const ref of c.results) {
    const t = `${c.geometry.shape} k${ref.k} α0 ${ref.alpha0} ${ref.edge}`;
    const r = S.unitSpatial(unit(trees, c.area), c.geometry, { k: ref.k, alpha0: ref.alpha0, edge: ref.edge, buffer: ref.buffer || 5 });
    ok(r.status === 'ok', `${t}: computed ${JSON.stringify(r.problems)}`);
    near(r.clarkEvans.R, ref.R, `${t}: Clark–Evans R`); near(r.clarkEvans.rObs, ref.rObs, `${t}: mean NN distance`); eq(r.nRef, ref.nRef, `${t}: reference trees`);
    if (ref.donnelly) near(r.clarkEvans.donnelly.R, ref.donnelly.R, `${t}: Donnelly R`); else ok(r.clarkEvans.donnelly === null && r.clarkEvans.donnellyWhy, `${t}: no Donnelly (${r.clarkEvans.donnellyWhy})`);
    near(r.W, ref.W, `${t}: mean W`); near(r.M, ref.M, `${t}: mean M`); near(r.U, ref.U, `${t}: mean U`);
    ref.T.forEach((v, j) => near(r.T[j], v, `${t}: T${j + 1}`));
    let bad = 0;
    r.trees.forEach((x, i) => {
      const w = ref.trees.W[i];
      if (w === null) { if (x.W !== null || x.core) bad++; return; }
      if (x.W !== w || x.M !== ref.trees.M[i] || x.U !== ref.trees.U[i] || x.T.some((v, j) => Math.abs(v - ref.trees.T[i][j]) > 1e-14) || Math.abs(x.nn - ref.trees.nn[i]) > 1e-12) bad++;
      if (ref.edge === 'none' && x.edgeK !== (ref.trees.edgeDist[i] < ref.trees.nbK[i])) bad++;
    });
    ok(bad === 0, `${t}: every tree's W, M, U, T, NN distance and edge flag as in Python (${bad} differ)`);
    eq(r.settings.edge + '/' + r.settings.k + '/' + r.settings.alpha0, `${ref.edge}/${ref.k}/${ref.alpha0}`, `${t}: settings recorded`);
    if (ref.edge === 'none') ok(r.nEdge > 0 && r.nEdge === r.trees.filter(x => x.edgeK).length, `${t}: edge trees flagged without correction (${r.nEdge})`);
  }
}

/* 4. Poisson simulation: uncorrected R is biased upwards by the edge, Donnelly and the torus reduce the bias */
{ const u = rng(20261115), reps = 600, n = 40; let sN = 0, sD = 0, sT = 0;
  for (let k = 0; k < reps; k++) {
    const t = Array.from({ length: n }, (_, i) => ({ row: i + 2, x: u() * 30, y: u() * 30, dbh: 20 }));
    const g = { shape: 'rect', x0: 0, y0: 0, x1: 30, y1: 30 };
    const a = S.unitSpatial(unit(t), g), b = S.unitSpatial(unit(t), g, { edge: 'torus' });
    sN += a.clarkEvans.R; sD += a.clarkEvans.donnelly.R; sT += b.clarkEvans.R;
  }
  const mN = sN / reps, mD = sD / reps, mT = sT / reps;
  console.log(`  Poisson, n = ${n}, ${reps} plots: mean R uncorrected ${mN.toFixed(4)}, Donnelly ${mD.toFixed(4)}, torus ${mT.toFixed(4)}`);
  ok(mN > 1.04, `uncorrected R biased above 1 (${mN.toFixed(4)})`);
  ok(Math.abs(mD - 1) < Math.abs(mN - 1) / 3, `Donnelly reduces the bias (${mD.toFixed(4)})`);
  ok(Math.abs(mT - 1) < Math.abs(mN - 1) / 3, `torus reduces the bias (${mT.toFixed(4)})`); }

/* 5. neighbour search: grid = brute force, also on a torus and with many equal distances; 10 000 trees fast */
{ const u = rng(7), n = 900, xs = [], ys = [];
  for (let i = 0; i < n; i++) { xs.push(i < 300 ? Math.round(u() * 20) : u() * 40); ys.push(i < 300 ? Math.round(u() * 20) : u() * 25); }   // clustered lattice part with ties
  for (const torus of [null, { w: 40, h: 25, x0: 0, y0: 0 }]) {
    const K = S.knn(xs, ys, 6, torus); let bad = 0;
    for (let i = 0; i < n; i++) {
      const all = []; for (let j = 0; j < n; j++) if (j !== i) { let dx = xs[j] - xs[i], dy = ys[j] - ys[i]; if (torus) { dx -= 40 * Math.round(dx / 40); dy -= 25 * Math.round(dy / 25); } all.push({ j, d: Math.hypot(dx, dy) }); }
      all.sort((a, b) => a.d - b.d || a.j - b.j);
      if (K[i].map(v => v.j).join() !== all.slice(0, 6).map(v => v.j).join()) bad++;
    }
    ok(bad === 0, `k-NN grid search = brute force (${torus ? 'torus' : 'plane'}, ties by index; ${bad} differ)`);
  }
  const big = Array.from({ length: 10000 }, (_, i) => ({ row: i + 2, x: u() * 100, y: u() * 100, dbh: 10 + 30 * u(), species: u() < 0.5 ? 'A' : 'B' }));
  const t0 = performance.now(), r = S.unitSpatial(unit(big, 10000), { shape: 'rect', x0: 0, y0: 0, x1: 100, y1: 100 }), ms = performance.now() - t0;
  ok(r.status === 'ok' && ms < 2000, `10 000 trees in ${ms.toFixed(0)} ms`); }

/* 6. problems are reported with row numbers, never turned into numbers */
const G = { shape: 'circle', cx: 0, cy: 0, r: 10 };
const T5 = [[0, 0], [3, 1], [-4, 2], [1, -5], [6, 6], [-2, -3]].map(([x, y], i) => ({ row: i + 2, x, y, dbh: 20 + i, species: 'A' }));
{ const r = S.unitSpatial(unit([...T5, { row: 9, x: 20, y: 0, dbh: 30 }]), G);
  ok(r.status === 'ok' && r.problems.some(p => p.code === 'xy.outside' && p.rows.join() === '9') && r.n === 6, 'tree outside the plot: row reported, left out'); }
{ const r = S.unitSpatial(unit([...T5, { row: 9, x: null, y: 0, dbh: 30 }]), G); ok(r.status === 'invalid' && r.problems[0].code === 'xy.missing' && r.problems[0].rows.join() === '9', 'some trees without coordinates: not computed, rows reported'); }
{ const r = S.unitSpatial(unit(T5.map(t => ({ ...t, x: null, y: null }))), G); ok(r.status === 'nocoords' && !('W' in r), 'no coordinates at all: state "nocoords", no numbers'); }
{ const r = S.unitSpatial(unit([...T5, { row: 9, x: 3, y: 1, dbh: 30 }]), G);
  ok(r.problems.some(p => p.code === 'xy.dup' && p.pairs.some(q => q.join() === '3,9')), 'two trees at the same position reported (rows 3 and 9)');
  ok(r.trees.find(t => t.row === 9).W === null && r.trees.find(t => t.row === 3).W === null, 'W undefined for both, not a number'); }
ok(S.unitSpatial(unit(T5), G, { edge: 'torus' }).problems[0].code === 'edge.torusrect', 'torus only for rectangles');
ok(S.unitSpatial(unit(T5), G, { edge: 'buffer', buffer: 50 }).problems.some(p => p.code === 'edge.nocore'), 'buffer wider than the plot: no reference trees reported');
{ const r = S.unitSpatial(unit(T5.slice(0, 4)), G); ok(r.problems.some(p => p.code === 'k.few') && r.W === null && r.clarkEvans.R > 0, 'n ≤ k: neighbourhood measures not computed, Clark–Evans still'); }
for (const [g, code] of [[null, 'geom.none'], [{ shape: 'circle', cx: 0, cy: 0, r: 0 }, 'geom.size'], [{ shape: 'rect', x0: 0, y0: 0, x1: 0, y1: 5 }, 'geom.size'], [{ shape: 'tri' }, 'geom.shape'], [{ shape: 'circle', cx: 0, cy: '0', r: 5 }, 'geom.bad']])
  ok(S.unitSpatial(unit(T5), g).problems[0].code === code, `geometry problem ${code}`);
for (const [s, code] of [[{ k: 1 }, 'k.bad'], [{ k: 13 }, 'k.bad'], [{ alpha0: 0 }, 'alpha0.bad'], [{ edge: 'mirror' }, 'edge.bad'], [{ edge: 'buffer', buffer: 0 }, 'edge.buffer']])
  ok(S.unitSpatial(unit(T5), G, s).problems[0].code === code, `setting problem ${code}`);
ok(S.unitSpatial(unit(T5, 500), G).warnings.some(w => w.code === 'geom.area'), 'geometry area differing from the plot area by > 1 % is warned');
{ const r = S.unitSpatial(unit(T5.map(t => ({ ...t, species: null }))), G); ok(r.M === null && r.species === false && r.W !== null, 'no species: M not computed, W still'); }
ok(S.unitSpatial(unit([]), G).status === 'empty', 'empty unit');
{ const r = S.unitSpatial(unit(square(6)), { shape: 'rect', x0: 0, y0: 0, x1: 6, y1: 6 }, { k: 5 }); ok(r.warnings.some(w => w.code === 'knn.tie'), 'ties at the k-th distance counted (grid, k = 5)'); }
{ const g = S.geometry({ shape: 'rect', x0: 5, y0: 9, x1: 1, y1: 2 }); eq(g, { shape: 'rect', x0: 1, y0: 2, x1: 5, y1: 9 }, 'rectangle corners in any order');
  near(S.areaOf(g), 28, 'rectangle area'); near(S.perimeterOf(g), 22, 'rectangle perimeter'); near(S.edgeDist(G, 3, 4), 5, 'distance to a circle boundary'); }

console.log(`structure SS02: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
