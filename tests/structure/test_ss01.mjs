// Stand structure, stage SS01: distance-free structure and density measures.
//   node tests/structure/test_ss01.mjs
// Reference: tests/ref/structure_ss01.json (tests/ref/make_structure_ss01.py: Gini as mean absolute difference without
// sorting, scipy.stats.entropy, scipy.stats skew/kurtosis, brute-force BAL, all expansion-factor weighted) and the
// closed values of TOOLS_SPEC §8.3.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as S from '../../assets/lab/structure/calc.js';
import { buildUnits, unitMetrics } from '../../assets/lab/stand/calc.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-12) => ok(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1), `${m}: got ${a} expected ${b}`);
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/structure_ss01.json'), 'utf8'));

/* 1. TOOLS_SPEC §8.3 */
near(S.sdi(800, 20), 559.177149815208, 'SDI, N = 800, Dq = 20, β = 1.605', 1e-14);
near(S.sdi(800, 20), R.spec.sdi, 'SDI = Python', 1e-14);
near(S.relSpacing(800, 20), 17.677669529664, 'S%, square', 1e-12);
near(S.relSpacing(800, 20, 'triangular'), 18.995892141290, 'S%, triangular', 1e-12);
near(S.relSpacing(800, 20, 'triangular'), R.spec.rsTri, 'S% triangular = Python', 1e-14);
ok(S.sdi(0, 20) === null && S.sdi(800, null) === null && S.relSpacing(800, null) === null && S.relSpacing(0, 20) === null, 'undefined density measures are null, not numbers');

/* 2. simulated plots against the independent reference */
const ds = { schema: 'forest-dataset/1', plots: R.cases.map(c => ({ plot_id: c.plot.plot_id, plot_area: c.plot.area })), trees: [] };
let row = 2;
for (const c of R.cases) c.plot.dbh.forEach((d, i) => ds.trees.push({ row: row++, plot_id: c.plot.plot_id, tree_id: String(i + 1), dbh: d, species: c.plot.species[i] }));
const findUnit = (all, id) => all.find(r => r.plot_id === id);
for (const ties of ['strict', 'ties']) for (const st of R.sets) for (const wt of ['ba', 'n']) {
  const all = S.structureAll(ds, { classWidth: st.width, classStart: st.start, shannonWeight: wt, balTies: ties });
  for (const c of R.cases) {
    const r = findUnit(all, c.plot.plot_id), t = `${c.plot.plot_id} w${st.width}/s${st.start}/${wt}/${ties}`;
    const sh = c.shannon.find(x => x.width === st.width && x.start === st.start && x.weight === wt);
    ok(r.status === 'ok', `${t}: computed`);
    near(r.shannon.H, sh.H, `${t}: Shannon H′ = scipy.stats.entropy`);
    eq([r.shannon.S, r.shannon.below], [sh.S, sh.below], `${t}: occupied classes, trees below the start`);
    if (sh.J == null) ok(r.shannon.J === null, `${t}: J′ undefined for one class`); else near(r.shannon.J, sh.J, `${t}: evenness J′`);
    eq([r.shannon.weight, r.shannon.width, r.shannon.start, r.settings.balTies], [wt, st.width, st.start, ties], `${t}: settings recorded in the result`);
    const ref = ties === 'ties' ? c.balTies : c.balStrict;
    let worst = 0; r.trees.forEach((x, i) => { worst = Math.max(worst, Math.abs(x.bal - ref[i])); });
    ok(worst <= 1e-12, `${t}: BAL = brute-force double loop (worst ${worst.toExponential(2)} m²/ha)`);
  }
}
const all = S.structureAll(ds);
for (const c of R.cases) {
  const r = findUnit(all, c.plot.plot_id), t = c.plot.plot_id;
  near(r.ef, c.ef, `${t}: expansion factor 10000/A`); near(r.Nha, c.Nha, `${t}: N/ha`); near(r.Gha, c.Gha, `${t}: G m²/ha`); near(r.Dq, c.Dq, `${t}: Dq`);
  near(r.moments.mean, c.mean, `${t}: mean`); near(r.moments.sd, c.sd, `${t}: sd (n − 1)`); near(r.moments.cv, c.cv, `${t}: CV`);
  near(r.moments.skew, c.skew, `${t}: skewness (divisor n) = scipy`, 1e-10); near(r.moments.kurt, c.kurt, `${t}: excess kurtosis (divisor n) = scipy`, 1e-10);
  near(r.gini, c.gini, `${t}: Gini of basal area = mean absolute difference / 2·mean`); near(r.giniD, c.giniD, `${t}: Gini of diameter`);
  near(S.giniPairs(r.trees.map(x => x.g)), c.gini, `${t}: pairwise and sorted Gini formulas agree`);
  near(r.species.shannonN.H, c.species.HN, `${t}: species Shannon by stems`); near(r.species.shannonG.H, c.species.HG, `${t}: species Shannon by basal area`);
  near(r.species.simpsonN, c.species.simpN, `${t}: species Simpson by stems`); near(r.species.simpsonG, c.species.simpG, `${t}: species Simpson by basal area`);
  eq(r.species.k, c.species.k, `${t}: number of species`);
  r.trees.forEach((x, i) => { near(x.relDq, c.relDq[i], `${t} tree ${i + 1}: d/Dq`); near(x.relG, c.relG[i], `${t} tree ${i + 1}: g/ḡ`); near(x.relG, x.relDq ** 2, `${t} tree ${i + 1}: g/ḡ = (d/Dq)²`); });
  for (const s of c.sdi) near(S.unitStructure(buildUnits(ds).units.find(u => u.plot_id === t), { sdiExp: s.exp }).sdi.value, s.value, `${t}: SDI with β = ${s.exp}`);
  ok(r.warnings.some(w => w.code === 'h0.none') && r.rs.value === null, `${t}: no heights → H0 missing, relative spacing not a number`);
}

/* 3. properties: Lorenz curve, Gini bounds, equal trees, BAL extremes */
{ const r = findUnit(all, 'P3'), L = r.lorenz;
  eq([L[0], L[L.length - 1]], [[0, 0], [1, 1]], 'Lorenz curve from (0, 0) to (1, 1)');
  ok(L.every((p, i) => i === 0 || (p[0] > L[i - 1][0] && p[1] >= L[i - 1][1])), 'Lorenz curve increasing');
  // Gini = 1 − 2·(area under the Lorenz curve, trapezoids) for the same ranking
  let A = 0; for (let i = 1; i < L.length; i++) A += (L[i][0] - L[i - 1][0]) * (L[i][1] + L[i - 1][1]) / 2;
  near(1 - 2 * A, r.gini, 'Gini = 1 − 2·area under the Lorenz curve'); }
eq([S.gini([7, 7, 7, 7]), S.giniPairs([7, 7, 7, 7])], [0, 0], 'Gini of equal values is 0');
near(S.gini([0, 0, 0, 5]), 3 / 4, 'Gini of one positive value among n is (n − 1)/n');
ok(S.gini([5]) === null && S.gini([0, 0]) === null, 'Gini undefined for n < 2 or zero sum');
{ const b = S.bal([30, 20, 20, 10], 25, 'strict'), bt = S.bal([30, 20, 20, 10], 25, 'ties'), g = d => Math.PI * d * d / 40000;
  near(b[0], 0, 'largest tree has BAL 0'); ok(b[0] === 0, 'BAL of the largest tree exactly 0');
  near(b[1], g(30) * 25, 'strict: equal diameters excluded'); near(bt[1], (g(30) + g(20)) * 25, 'ties: the other equal tree included, itself not');
  near(b[3], (g(30) + 2 * g(20)) * 25, 'smallest tree: all others'); }
{ const sh = S.shannon([1]); eq([sh.H, sh.S, sh.J], [0, 1, null], 'one class: H′ = 0, J′ undefined'); near(S.shannon([0.25, 0.25, 0.25, 0.25]).J, 1, 'uniform: J′ = 1'); near(S.simpson([0.5, 0.5]), 0.5, 'Simpson of two equal shares'); }

/* 4. dominant height, relative spacing and states */
{ const d2 = { schema: 'forest-dataset/1', plots: [{ plot_id: 'H', plot_area: 400 }], trees: [[36, 26], [31, 24], [28, 23.5], [22, 19], [18, 17], [14, 14]].map(([d, h], i) => ({ row: i + 2, plot_id: 'H', tree_id: String(i + 1), dbh: d, height: h })) };
  const u = buildUnits(d2).units[0], m = unitMetrics(u), r = S.unitStructure(u);
  ok(m.dom.d.H0 > 0, 'H0 from the Plot & Stand tool'); near(r.H0, m.dom.d.H0, 'H0 is the shared dominant height', 0);
  near(r.rs.value, 100 * Math.sqrt(10000 / m.Nha) / m.dom.d.H0, 'S% = 100·√(10000/N)/H0 (square)');
  near(S.unitStructure(u, { spacing: 'triangular' }).rs.value, 100 * Math.sqrt(2 * 10000 / (m.Nha * Math.sqrt(3))) / m.dom.d.H0, 'S% triangular');
  eq([r.rs.spacing, r.rs.rank, r.sdi.exp, r.sdi.ref], ['square', 'dbh', 1.605, 25], 'spacing, H0 ranking, β and reference diameter recorded');
  ok(r.species === null, 'no species column → no species measures');
  near(r.D0, m.dom.d.D0, 'D0 shared', 0); r.trees.forEach((x, i) => near(x.relDom, x.dbh / m.dom.d.D0, `tree ${i + 1}: d/D0`)); near(r.trees[0].relMax, 1, 'thickest tree: d/dmax = 1'); }
{ const d3 = { schema: 'forest-dataset/1', plots: [{ plot_id: 'B', plot_area: 400 }], trees: [[12, 'A'], [3, 'A'], [9, null], [20, 'B']].map(([d, s], i) => ({ row: i + 2, plot_id: 'B', tree_id: String(i + 1), dbh: d, species: s })) };
  const r = S.structureAll(d3, { classStart: 8 })[0];
  ok(r.warnings.some(w => w.code === 'cls.below' && w.n === 1), 'trees below the class start reported, not silently dropped');
  ok(r.warnings.some(w => w.code === 'sp.missing' && w.n === 1), 'tree without species reported');
  ok(S.structureAll(d3, { classWidth: 0 })[0].problems.some(p => p.code === 'cls.bad') && S.structureAll(d3, { classWidth: 0 })[0].shannon === null, 'invalid class width: no Shannon number');
  const e = S.unitStructure({ plot_id: 'E', period: null, state: 'empty', area: 400, trees: [] }); eq([e.status, e.n, e.Nha], ['empty', 0, 0], 'empty unit');
  ok(S.unitStructure({ plot_id: 'X', state: 'unknown', area: 400, trees: [] }).status === 'invalid', 'unit of unknown state not computed'); }
eq(S.TOOL, { id: 'mescere-yapisi', version: '1.0.0-beta.1' }, 'tool id and version (K4)');

console.log(`structure SS01: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
