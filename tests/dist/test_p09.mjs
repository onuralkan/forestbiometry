// Diameter distribution engine, stage P09: Johnson SB recovery, Parresol (2003), ξ fixed.
//   node tests/dist/test_p09.mjs
// Reference: tests/ref/dist_p09.json (tests/ref/make_dist_p09.py: scipy.integrate.quad moments, least_squares from a
// 7 × 7 grid of starts, all distinct solutions kept; not the JavaScript quadrature or Newton).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as D from '../../assets/lab/dist/index.js';
import * as PR from '../../assets/lab/dist/recover/parresol.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-12) => ok(Number.isFinite(a) && Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1), `${m}: got ${a} expected ${b}`);
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/dist_p09.json'), 'utf8'));
const run = s => D.runMethod('johnsonsb.parresol', { type: 'summary', summary: s });
const SB = D.family('johnsonsb');

/* 1. registry */
{ const m = D.method('johnsonsb.parresol');
  eq([m.family, m.kind, m.dataTypes, m.group, m.free, m.likelihoodMaximised], ['johnsonsb', 'recover', ['summary'], 'parresol', undefined, false], 'Parresol: Johnson SB recovery from summaries');
  ok(m.options.length === 1 && m.options[0].key === 'xi' && m.options[0].policies.join() === 'user', 'ξ is user-fixed: three-parameter recovery'); }
near(PR.K, Math.PI / 40000, 'K = π/40000');

/* 2. DIST_SPEC §8.3: λ = 40, γ = 0.6, δ = 1.3; m, median and Dq re-checked */
{ const c = R.cases.find(x => x.name === 'spec83'), s = { xi: c.xi, nha: c.nha, g: c.g, mean: c.mean, median: c.median };
  const r = run(s);
  ok(r.status === 'ok' && r.convergence.solutions === 1, '§8.3: one solution');
  near(r.params.lambda, 40, '§8.3 λ', 1e-12); near(r.params.gamma, 0.6, '§8.3 γ', 1e-12); near(r.params.delta, 1.3, '§8.3 δ', 1e-12); ok(r.params.xi === 5, '§8.3 ξ kept');
  near(r.targets.dq, c.dq, '§8.3 Dq from N and G = printed Dq', 1e-14);
  near(r.diagnostics.backMean, c.mean, '§8.3 mean re-checked', 1e-13); near(r.diagnostics.backMedian, c.median, '§8.3 median re-checked', 1e-13); near(r.diagnostics.backDq, c.dq, '§8.3 Dq re-checked', 1e-13);
  near(SB.quantile(0.5, r.params), c.median, '§8.3 median of the family = target', 1e-12); near(SB.mean(r.params), c.mean, '§8.3 mean of the family = target', 1e-12);
  ok(c.sols.length === 1, '§8.3: SciPy (49 starts) also finds a single solution');
  near(r.params.lambda, c.sols[0].lambda, '§8.3 λ = SciPy', 1e-10);
  eq([r.fixed.xi, r.free, r.targets.source], [{ value: 5, origin: 'user' }, ['lambda', 'gamma', 'delta'], 'NG'], '§8.3 record: ξ user-fixed, three free parameters, Dq from N and G');
  const both = run({ ...s, dq: c.dq }); ok(both.status === 'ok' && both.targets.source === 'both', 'N, G and Dq together, consistent: accepted');
  const dqOnly = run({ xi: 5, mean: c.mean, median: c.median, dq: c.dq }); ok(dqOnly.status === 'ok' && dqOnly.targets.source === 'dq' && Math.abs(dqOnly.params.lambda - 40) < 1e-10, 'Dq instead of N and G'); }

/* 3. SB inputs and measured samples against SciPy */
for (const c of R.cases) {
  if (c.name === 'spec83') continue;
  const r = run({ xi: c.xi, mean: c.mean, median: c.median, dq: c.dq }), tag = c.name;
  ok(c.sols.every(x => x.mp_resid < 1e-12), `${tag}: every SciPy solution confirmed by mpmath at 40 digits (${c.sols.map(x => x.mp_resid.toExponential(1))})`);
  if (c.sols.length === 1) {
    ok(r.status === 'ok', `${tag}: one solution → ok (${r.status})`);
    if (r.status === 'ok') { for (const k of ['lambda', 'gamma', 'delta']) near(r.params[k], c.sols[0][k], `${tag} ${k} = SciPy`, 1e-8);
      ok(Math.max(...Object.values(r.diagnostics.residuals).map(Math.abs)) < 1e-9, `${tag}: m, median, Dq re-checked in cm`);
      if (c.truth) for (const k of ['lambda', 'gamma', 'delta']) near(r.params[k], c.truth[k], `${tag} ${k} = generating value`, 1e-9); }
  } else if (c.sols.length === 0) ok(r.status !== 'ok' && r.params === null, `${tag}: no solution → not presented as a result (${r.status})`);
  else {
    const cs = r.status === 'multiple' ? [...r.diagnostics.candidates].sort((a, b) => b.delta - a.delta) : [];
    ok(r.status === 'multiple' && r.params === null && cs.length === c.sols.length, `${tag}: ${c.sols.length} solutions → multiple, no single parameter set (${r.status}, ${cs.length})`);
    cs.forEach((x, i) => { near(x.lambda, c.sols[i].lambda, `${tag} candidate ${i + 1} λ = SciPy`, 1e-8); near(x.delta, c.sols[i].delta, `${tag} candidate ${i + 1} δ = SciPy`, 1e-8);
      ok(Math.abs(x.backMean / c.mean - 1) < 1e-9 && Math.abs(x.backDq / c.dq - 1) < 1e-9 && Math.abs(x.backMedian / c.median - 1) < 1e-12, `${tag} candidate ${i + 1}: reproduces m, median, Dq`); });
    if (c.truth) ok(cs.some(x => Math.abs(x.lambda - c.truth.lambda) < 1e-8 && Math.abs(x.delta - c.truth.delta) < 1e-9), `${tag}: the generating parameters are among the candidates`);
  }
}

/* 4. input checks: never a number from inconsistent inputs */
{ const c = R.cases.find(x => x.name === 'spec83'), b = { xi: 5, mean: c.mean, median: c.median };
  for (const [s, code] of [[{ ...b }, 'prs.noq'], [{ ...b, dq: c.dq, xi: -1 }, 'prs.xi'], [{ ...b, xi: undefined, dq: c.dq }, 'prs.xi'], [{ ...b, dq: c.dq, nha: 500, g: 19.5 }, 'prs.dqmismatch'],
    [{ ...b, nha: 500 }, 'wsum.missing'], [{ ...b, nha: -5, g: 19 }, 'wsum.missing'], [{ ...b, dq: c.dq, mean: 4 }, 'prs.meanbelow'], [{ ...b, dq: c.dq, median: 5 }, 'prs.medianbelow'],
    [{ ...b, dq: c.mean }, 'prs.dqbelow'], [{ ...b, dq: c.dq, median: undefined }, 'wsum.missing']]) {
    const r = run(s); ok(r.status === 'invalid' && r.params === null && r.problems.some(p => p.code === code), `${JSON.stringify(s)}: ${code} (${r.problems.map(p => p.code)})`);
  }
  const mm = run({ ...b, dq: c.dq, nha: 500, g: 19.5 }).problems.find(p => p.code === 'prs.dqmismatch'); ok(mm && Math.abs(mm.rel) > 1e-3 && mm.dqNG > c.dq, 'mismatch reported with both Dq values');
  ok(run({ ...b, dq: c.dq * (1 + 5e-4), nha: 500, g: 18.979383683389663 }).targets.source === 'both', 'difference within 10⁻³: accepted, the Dq entered is used'); }
{ // necessary conditions met, no SB with these moments: median far above the mean with a small spread
  const r = run({ xi: 0, mean: 20, median: 30, dq: 20.05 });
  ok(r.status === 'noconverge' && r.params === null && r.warnings.some(w => w.code === 'prs.noconverge'), 'conditions met but no solution: did not converge, no parameters'); }
ok(PR.STARTS.length === 12, 'several starts (identifiability check)');

console.log(`dist P09: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
