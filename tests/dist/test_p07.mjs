// Diameter distribution engine, stage P07: Weibull hybrid recovery M6–M10 (Poudel and Cao 2013).
//   node tests/dist/test_p07.mjs
// Reference: tests/ref/dist_p07.json (tests/ref/make_dist_p07.py: shapes and scales as roots of equations in
// scipy.stats.weibull_min quantities, all roots of M8/M9 on a 4000-point grid; not the closed forms of the JavaScript).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as D from '../../assets/lab/dist/index.js';
import * as WR from '../../assets/lab/dist/recover/weibull.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-12) => ok(Number.isFinite(a) && Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1), `${m}: got ${a} expected ${b}`);
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/dist_p07.json'), 'utf8'));
const run = (k, s, o = {}) => D.runMethod('weibull.' + k, { type: 'summary', summary: s }, o);
const HY = ['m6', 'm7', 'm8', 'm9', 'm10'];
const BK = { mean: 'backMean', variance: 'backVariance', dq: 'backDq', q25: 'backQ25', q31: 'backQ31', q50: 'backQ50', q63: 'backQ63', q95: 'backQ95' };

/* 1. registry: the inputs of every method */
eq(D.methodsFor({ family: 'weibull', kind: 'recover' }).map(m => m.id), ['weibull.m2', 'weibull.m3', 'weibull.m4', 'weibull.m5', 'weibull.m6', 'weibull.m7', 'weibull.m8', 'weibull.m9', 'weibull.m10'], 'Weibull recovery methods M2–M10');
eq(HY.map(k => D.method('weibull.' + k).needs), [['dq', 'q25', 'q95'], ['dq', 'q31', 'q63'], ['mean', 'q95'], ['dq', 'q95'], ['dq', 'q25', 'q50', 'q95', 'dmin', 'n']], 'inputs of M6–M10 (M10: Dmin and n required)');
eq(HY.map(k => D.method('weibull.' + k).exact), [['dq', 'ratio'], ['dq', 'ratio'], ['mean', 'q95'], ['dq', 'q95'], ['dq', 'ratio']], 'targets matched by construction');
ok(HY.every(k => D.method('weibull.' + k).hybrid) && !['m2', 'm3', 'm4', 'm5'].some(k => D.method('weibull.' + k).hybrid), 'M6–M10 marked as hybrids');
eq(D.method('weibull.m10').options, [], 'M10: own location rule, no location option');
ok(['m6', 'm7', 'm8', 'm9'].every(k => D.method('weibull.' + k).options.some(o => o.key === 'loc')), 'M6–M9: location policy option (a = 0.5·Dmin or the user\'s a)');

/* 2. DIST_SPEC §8.2: a = 5, b = 20, c = 2.5 */
{ const S = R.spec, t = S.targets;
  for (const k of ['m6', 'm7']) { const r = run(k, t, { loc: 'user', a: 5 }); ok(r.status === 'ok', `§8.2 ${k} ok`); near(r.params.c, 2.5, `§8.2 ${k} c`, 1e-12); near(r.params.b, 20, `§8.2 ${k} b`, 1e-12); }
  for (const [k, c0] of [['m8', 0.191476498065], ['m9', 0.398620001976]]) {
    const r = run(k, t, { loc: 'user', a: 5 }), cs = r.diagnostics.candidates;
    ok(r.status === 'multiple' && r.params === null && cs.length === 2, `§8.2 ${k}: two positive roots, state multiple, no single parameter set`);
    near(cs[0].c, c0, `§8.2 ${k} first root (spec table)`, 1e-11); near(cs[1].c, 2.5, `§8.2 ${k} second root`, 1e-12);
    S.sol[k].forEach((x, i) => { near(cs[i].c, x.c, `§8.2 ${k} root ${i + 1} = SciPy`, 1e-11); near(cs[i].b, x.b, `§8.2 ${k} scale ${i + 1} = SciPy`, 1e-10); });
    ok(cs.every(c => Math.abs(c.residuals.q95) < 1e-12 && Math.abs(c.residuals[k === 'm8' ? 'mean' : 'dq']) < 1e-12), `§8.2 ${k}: both candidates match the method's targets (they differ elsewhere)`);
    ok(Math.abs(cs[0].residuals.q50 ?? 1) > 0.01 || cs[0].residuals.q50 === undefined, `§8.2 ${k}: the candidates are genuinely different distributions`);
    eq([r.convergence.interval, r.convergence.roots, /no hidden c > 1/.test(r.convergence.selection)], [[0.05, 200], 2, true], `§8.2 ${k}: interval, number of roots and selection rule in the record`);
  }
  near(S.a10, 5, '§8.2 M10 location (SciPy side)', 1e-12);
  const r10 = run('m10', t);
  ok(r10.status === 'ok' && r10.fixed.a.policy === 'm10' && r10.fixed.a.n === 125 && r10.fixed.a.dmin === t.dmin, '§8.2 M10 ok, location rule recorded with Dmin and n');
  near(r10.params.a, 5, '§8.2 M10 a = 5', 1e-12); near(r10.params.c, 2.5, '§8.2 M10 c', 1e-12); near(r10.params.b, 20, '§8.2 M10 b', 1e-12);
  { const r = run('m10', t, { loc: 'user', a: 0 }); near(r.params.a, 5, 'M10 ignores a location option', 1e-12); }
}

/* 3. measured samples: inconsistent targets, location a = 0.5·Dmin (M6–M9) and the M10 rule */
for (const [name, smp] of Object.entries(R.samples)) {
  const t = smp.targets;
  for (const k of HY) {
    const r = run(k, t, { loc: 'half-dmin' }), ref = smp.sol[k], tag = `${name} ${k}`;
    if (k === 'm10' && !ref.length) { ok(r.status === 'invalid' && r.params === null && r.problems.length > 0, `${tag}: rule location not usable (a = ${smp.a10.toFixed(4)}) → invalid: ${r.problems.map(p => p.code)}`); continue; }
    if (ref.length === 1) {
      ok(r.status === 'ok', `${tag}: one solution`);
      near(r.params.c, ref[0].c, `${tag} c = SciPy`, 1e-10); near(r.params.b, ref[0].b, `${tag} b = SciPy`, 1e-10); near(r.params.a, ref[0].a, `${tag} a`, 1e-13);
      for (const [key, b] of Object.entries(BK)) if (r.diagnostics[b] != null) near(r.diagnostics[b], ref[0].back[key], `${tag} back-calculated ${key}`, 1e-9);
      // exact by construction; the other targets are allowed to differ (hybrid)
      ok(D.method('weibull.' + k).exact.every(e => Math.abs(r.diagnostics.residuals[e]) < 1e-9), `${tag}: constructed targets matched`);
      const others = D.method('weibull.' + k).needs.filter(e => BK[e] && !D.method('weibull.' + k).exact.includes(e));
      if (others.length) ok(others.some(e => Math.abs(r.diagnostics.residuals[e]) > 1e-6), `${tag}: the other targets (${others}) are not forced to match (largest residual ${Math.max(...others.map(e => Math.abs(r.diagnostics.residuals[e]))).toExponential(2)})`);
    } else {
      ok(r.status === 'multiple' && r.params === null && r.diagnostics.candidates.length === ref.length, `${tag}: ${ref.length} roots → multiple`);
      ref.forEach((x, i) => { near(r.diagnostics.candidates[i].c, x.c, `${tag} root ${i + 1} c`, 1e-10); near(r.diagnostics.candidates[i].b, x.b, `${tag} root ${i + 1} b`, 1e-10); });
    }
  }
}

/* 4. states: no root, invalid M10 location, missing inputs, N per hectare not accepted as n */
{ const t = R.spec.targets;
  const nr = run('m8', { ...t, mean: 6 }, { loc: 'user', a: 5 });                   // below the smallest mean any shape gives with this Q95
  ok(nr.status === 'invalid' && nr.problems[0].code === 'wsum.noroot' && nr.params === null, 'M8: no root in the interval → invalid, reason');
  const neg = run('m10', { ...t, dmin: 5, q50: 15, n: 8 });                        // (2·5 − 15)/(2 − 1) = −5
  ok(neg.status === 'invalid' && neg.problems[0].code === 'm10.aneg' && neg.problems[0].a === -5 && neg.params === null, 'M10: negative location reported, not moved to zero');
  const n1 = run('m10', { ...t, n: 1 }); ok(n1.status === 'invalid' && n1.problems.some(p => p.code === 'sum.n'), 'M10: n = 1 refused');
  const nn = run('m10', { ...t, n: undefined }); ok(nn.status === 'invalid' && nn.problems.some(p => p.code === 'wsum.missing' && p.key === 'n'), 'M10: n required');
  const nf = run('m10', { ...t, n: 812.5 }); ok(nf.status === 'invalid' && nf.problems.some(p => p.code === 'sum.n'), 'M10: a non-integer per-hectare count is not a tree count');
  const nd = run('m10', { ...t, dmin: undefined }); ok(nd.status === 'invalid' && nd.problems.some(p => p.key === 'dmin' || p.code === 'wsum.dmin'), 'M10: Dmin required');
  const ab = run('m10', { ...t, dmin: 20, q50: 22.27, n: 125 });                   // a = (5·20 − 22.27)/4 = 19.43 < Q25? no
  ok(ab.status === 'invalid' && ab.problems[0].code === 'wsum.qbelow', 'M10: location above Q25 → invalid');
  for (const k of ['m6', 'm7', 'm8', 'm9']) { const r = run(k, { ...t, q95: undefined, q25: undefined, q63: undefined, dq: undefined, mean: undefined }, { loc: 'user', a: 5 }); ok(r.status === 'invalid' && r.problems.every(p => p.code === 'wsum.missing'), `${k}: missing targets listed`); }
  ok(run('m6', { ...t, q25: 40 }, { loc: 'user', a: 5 }).problems[0].code === 'wsum.qorder', 'M6: Q95 ≤ Q25 refused');
  ok(run('m9', t, { loc: 'half-dmin' }).fixed.a.policy === 'half-dmin', 'M9: source location policy recorded');
}

/* 5. raw-data targets include Q25 (type 7) */
{ const d = Object.values(JSON.parse(readFileSync(path.join(root, 'tests/weibull/fixture.json'), 'utf8')).samples)[0], s = D.weibullSummary(d), t = R.samples[Object.keys(R.samples)[0]].targets;
  near(s.q25, t.q25, 'raw summary Q25 (type 7) = numpy', 1e-14); ok(run('m6', s, { loc: 'half-dmin' }).targets.from === 'raw', 'targets from raw data recorded'); }

console.log(`dist P07: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
