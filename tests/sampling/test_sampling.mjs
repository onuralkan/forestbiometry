// Inventory Sampling Planner: tests against scipy/numpy (tests/ref/sampling.json, tests/ref/make_sampling_reference.py)
// and the acceptance cases. Run: node tests/sampling/test_sampling.mjs
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as P from '../../assets/lab/sampling/calc.js';
import { normQuantile, normCdf, gammaP } from '../../assets/lab/core/stats.js';
import { tableFromText } from '../../assets/lab/core/table.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const REF = JSON.parse(await readFile(path.join(root, 'tests/ref/sampling.json'), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, rel, m) => ok(Number.isFinite(a) && Math.abs(a - b) <= rel * Math.max(1, Math.abs(b)), `${m}: ${a} vs ${b}`);
const tbl = async f => tableFromText(await readFile(path.join(root, f), 'utf8'), { delim: ',', header: true });

/* 0. normal quantiles */
for (const [l, z] of Object.entries(REF.z)) near(P.zFor(+l), z, 1e-12, `z for ${l}%`);
near(normCdf(1.959963984540054), 0.975, 1e-14, 'Φ(1.96)'); near(gammaP(0.5, 2), 0.9544997361036416, 1e-13, 'P(½, 2)');
ok(Number.isNaN(P.zFor(100)) && Number.isNaN(P.zFor(0)) && Number.isNaN(normQuantile(1)), 'invalid levels give no z');

/* 1. acceptance: z = 1.96, CV = 30 %, E = 10 %, no finite correction → about 35 plots */
const a = P.n0Raw(1.96, 30, 10);
near(a, REF.acceptance.z196.n0Raw, 1e-14, 'n0 with z = 1.96'); ok(P.ceilN(a) === 35, 'z = 1.96: 35 plots');
const p95 = P.plan({ cv: 30, e: 10, level: 95, fpc: false });
near(p95.n0Raw, REF.acceptance.z95.n0Raw, 1e-12, 'n0 with z(95 %)'); ok(p95.n === 35 && p95.n0 === 35 && !p95.fpc && p95.M === null, '95 %: 35 plots, no correction applied');
ok(P.ceilN(35.000000000001) === 35 && P.ceilN(35.0001) === 36 && P.ceilN(0.2) === 1, 'rounding up ignores float noise only');
// CV and E on the same percent scale: 30/10 is the same as 0.3/0.1, not 30/0.1
near(P.n0Raw(1.96, 0.3, 0.1), a, 1e-12, 'scale-free ratio CV/E');

/* 2. E decreases → n increases; finite correction only when chosen */
let prev = Infinity;
for (const [e, r] of Object.entries(REF.grid_cv30_95).sort((x, y) => +x[0] - +y[0])) {
  const inf = P.plan({ cv: 30, e: +e, level: 95, fpc: false }), m500 = P.plan({ cv: 30, e: +e, level: 95, fpc: true, M: 500 }), m60 = P.plan({ cv: 30, e: +e, level: 95, fpc: true, M: 60 });
  near(inf.nRaw, r.inf.nRaw, 1e-12, `E ${e}: n0`); ok(inf.n === r.inf.n, `E ${e}: n = ${inf.n}`);
  near(m500.nRaw, r.M500.nRaw, 1e-12, `E ${e}: n with M = 500`); ok(m500.n === r.M500.n && m500.n0 === r.inf.n0, `E ${e}, M = 500: n = ${m500.n}, n0 kept`);
  ok(m60.n === r.M60.n && m60.n <= 60, `E ${e}, M = 60: n = ${m60.n} ≤ M`);
  ok(m500.n <= inf.n && m60.n <= m500.n, `E ${e}: correction never increases n`);
  ok(inf.n <= prev, `E ${e}: n does not increase when E grows`); prev = inf.n;
}
const g = P.grid({ cv: 30, level: 95, fpc: false }, [8]);
ok(g.some(r => r.e === 8) && g.every((r, i) => i === 0 || r.n <= g[i - 1].n) && g.every((r, i) => i === 0 || r.e > g[i - 1].e), 'grid sorted by E, user E included, n monotone');
ok(P.grid({ cv: 30, level: 95, fpc: false }).every(r => !r.fpc), 'grid without correction stays uncorrected');
ok(P.plan({ cv: 30, e: 10, level: 95, fpc: false, M: 60 }).n === 35, 'a frame size typed but correction not chosen is ignored');

/* 3. existing sample that belongs to the design */
const ad = P.plan({ cv: 30, e: 10, level: 95, fpc: false, nPilot: 12, pilotInDesign: true });
ok(ad.additional === 23, 'pilot of 12 inside the design → 23 more');
ok(P.plan({ cv: 30, e: 10, level: 95, fpc: false, nPilot: 50, pilotInDesign: true }).additional === 0, 'pilot already large enough → 0 more');
ok(P.plan({ cv: 30, e: 10, level: 95, fpc: false, nPilot: 12, pilotInDesign: false }).additional === undefined, 'pilot outside the design → no "additional" number');

/* 4. invalid inputs */
const pr = x => P.plan(x).problems;
ok(pr({ e: 10, level: 95 }).includes('cv.missing') && pr({ cv: 0, e: 10, level: 95 }).includes('cv.nonpos') && pr({ cv: -5, e: 10, level: 95 }).includes('cv.nonpos'), 'missing, zero, negative CV rejected');
ok(pr({ cv: 30, level: 95 }).includes('e.missing') && pr({ cv: 30, e: 0, level: 95 }).includes('e.range') && pr({ cv: 30, e: 100, level: 95 }).includes('e.range') && pr({ cv: 30, e: -1, level: 95 }).includes('e.range'), 'missing / out-of-range E rejected');
ok(pr({ cv: 30, e: 10, level: 100 }).includes('level.range') && pr({ cv: 30, e: 10, level: 40 }).includes('level.range'), 'confidence level outside (50, 100) rejected');
ok(pr({ cv: 30, e: 10, level: 95, fpc: true }).includes('M.missing') && pr({ cv: 30, e: 10, level: 95, fpc: true, M: 12.5 }).includes('M.int') && pr({ cv: 30, e: 10, level: 95, fpc: true, M: 1 }).includes('M.int'), 'frame size: missing, not integer, < 2 rejected');
ok(pr({ cv: 30, e: 10, level: 95, fpc: true, M: 10, nPilot: 12, pilotInDesign: true }).includes('M.pilot'), 'frame smaller than the existing sample rejected');
ok(P.plan({ cv: 30, e: 10, level: 95 }).problems.length === 0 && P.plan({ cv: 1, e: 25, level: 95 }).notes.includes('n.below2'), 'n < 2 noted');

/* 5. pilot data */
const s = await tbl('assets/lab/sampling/ornek/ornek-pilot.csv'), rs = P.readPilot(s, { vcol: 1, pcol: 0, decimal: '.' }), ss = P.pilotStats(rs.values);
ok(rs.acc.empty === 1 && rs.values.length === REF.sample.n && !rs.dups.length && !rs.treeLevelName, 'sample: one empty cell counted, 13 plots');
near(ss.mean, REF.sample.mean, 1e-13, 'sample mean'); near(ss.sd, REF.sample.sd, 1e-12, 'sample sd (n − 1)'); near(ss.cv, REF.sample.cv, 1e-12, 'sample CV %');
for (const [l, r] of Object.entries(REF.sample_plan)) { const q = P.plan({ cv: ss.cv, e: 8, level: +l, fpc: false }); near(q.n0Raw, r.n0Raw, 1e-11, `sample plan ${l}%`); ok(q.n === r.n, `sample plan ${l}%: n = ${q.n}`); }
const f = await tbl('tests/sampling/fixture.csv');
const fa = P.readPilot(f, { vcol: 2, pcol: 0, decimal: '.' });
ok(fa.dups.length === 3 && fa.dups.every(d => d.c === 2), 'two periods without filter: duplicated plot ids reported');
const f23 = P.readPilot(f, { vcol: 2, pcol: 0, fcol: 1, fval: '2023', decimal: '.' }), s23 = P.pilotStats(f23.values);
ok(!f23.dups.length && f23.acc.neg === 1 && f23.acc.bad === 1 && f23.acc.empty === 1 && f23.acc.filter === 3, 'filtered to 2023: negative, unreadable and empty counted; ' + JSON.stringify(f23.acc));
ok(f23.negRows.join() === '4' && f23.badRows.join() === '5', 'row numbers of the negative and unreadable values');
near(s23.cv, REF.fixture2023.cv, 1e-12, 'CV of the 2023 plots (zero value kept)');
ok(P.pilotStats([]).problem === 'n.zero' && P.pilotStats([5]).problem === 'n.few', 'empty and single-plot pilots');
const z0 = P.pilotStats([0, 0, 0]); ok(z0.problem === 'mean.nonpos' && z0.cv === null, 'mean 0 → CV and relative error undefined');
ok(P.pilotStats([3, -3, 0]).problem === 'mean.nonpos', 'mean ≤ 0 → undefined');
ok(P.pilotStats([7, 7, 7]).problem === 'sd.zero', 'no variation → CV 0 reported, no plan');
ok(P.readPilot({ headers: ['dbh'], rows: [[{ t: 'n', v: 20 }]], rowNumbers: [2] }, { vcol: 0, decimal: '.' }).treeLevelName, 'tree-level column name recognised (warning)');

console.log(`sampling: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
