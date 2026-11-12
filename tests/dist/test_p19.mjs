// Diameter distribution engine, stage P19: Johnson SB all-parameter recovery, Fonseca, Marques and Parresol (2009).
//   node tests/dist/test_p19.mjs
// Reference: tests/ref/dist_p19.json (tests/ref/make_dist_p19.py: the source's eq. 10 integrals with mpmath at 30
// digits, scipy least_squares from a grid of starts, a simulated stand for raw-data targets, conditioning as γ → 0).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as D from '../../assets/lab/dist/index.js';
import { sbMomentsY } from '../../assets/lab/dist/families/johnsonsb.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/dist_p19.json'), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1);
const run = s => D.runMethod('johnsonsb.fonseca', { type: 'summary', summary: s });
const K = ['xi', 'lambda', 'gamma', 'delta'];

/* 1. a separate method */
{ const m = D.method('johnsonsb.fonseca'), p = D.method('johnsonsb.parresol');
  ok(m.kind === 'recover' && m.dataTypes.join() === 'summary' && m.needs.join() === 'mean,median,dq,dg' && m.source === 'fonseca2009' && p.source === 'parresol2003' && p.needs.includes('xi') && !m.needs.includes('xi'),
    'Fonseca is its own method (ξ recovered) next to Parresol (ξ given)'); }

/* 2. third noncentral moment of Y (added for this stage) against mpmath via the reference summaries */
for (const c of R.cases.filter(x => x.kind === 'exact')) {
  const p = c.true, u = sbMomentsY(p.gamma, p.delta), m2 = p.xi ** 2 + 2 * p.xi * p.lambda * u.m1 + p.lambda ** 2 * u.m2, m3 = p.xi ** 3 + 3 * p.xi ** 2 * p.lambda * u.m1 + 3 * p.xi * p.lambda ** 2 * u.m2 + p.lambda ** 3 * u.m3;
  ok(rel(m3 / m2, c.summary.dg) < 1e-12 && rel(Math.sqrt(m2), c.summary.dq) < 1e-13, `${JSON.stringify(p)}: d̄_G = m3/m2 = mpmath reference (${m3 / m2})`); }

/* 3. recovery of known asymmetric parameters */
for (const c of R.cases.filter(x => x.kind === 'exact')) {
  const r = run(c.summary), tag = JSON.stringify(c.true);
  ok(c.solutions.length === 1 && r.status === 'ok' && r.convergence.solutions === 1, `${tag}: one solution (reference: ${c.solutions.length}; ours: ${r.convergence && r.convergence.solutions})`);
  ok(r.status === 'ok' && K.every(k => rel(r.params[k], c.true[k]) < 1e-9), `${tag}: true parameters recovered ${JSON.stringify(r.params)}`);
  ok(r.status === 'ok' && K.every(k => rel(r.params[k], c.solutions[0][k]) < 1e-7), `${tag}: = reference solution`);
  ok(r.status === 'ok' && Object.values(r.diagnostics.residuals).every(v => Math.abs(v) < 1e-9) && r.convergence.cond < 1e8, `${tag}: median, mean, Dq, d̄_G back-calculated; condition number ${r.convergence && r.convergence.cond.toExponential(2)}`);
  ok(r.targets.m3 === c.summary.dg * c.summary.dq ** 2 && r.targets.m2 === c.summary.dq ** 2, `${tag}: m2 = Dq², m3 = d̄_G·Dq² recorded`); }

/* 4. summaries typed with two decimals, and targets from a simulated stand */
for (const c of R.cases.filter(x => x.kind !== 'exact')) {
  const s = c.kind === 'raw' ? D.fonsecaFromRaw(c.d, D.quantile7) : c.summary, tag = c.kind;
  if (c.kind === 'raw') ok(['mean', 'median', 'dq', 'dg'].every(k => rel(s[k], c.summary[k]) < 1e-12), 'raw: mean, median (type 7), Dq and d̄_G = Σg·d/Σg (g ∝ d²) = reference');
  const r = run(s);
  ok(c.solutions.length === 1 ? r.status === 'ok' && K.every(k => rel(r.params[k], c.solutions[0][k]) < 1e-6) : r.status !== 'ok' && r.params === null,
    `${tag}: ${c.solutions.length} reference solution(s); ours ${r.status} ${JSON.stringify(r.params)} vs ${JSON.stringify(c.solutions)}`); }

/* 5. symmetric and weakly determined inputs: no made-up single solution */
{ const c = R.cases[0], s = { ...c.summary, median: c.summary.mean }, r = run(s);
  ok(r.status === 'invalid' && r.params === null && r.problems[0].code === 'fns.symmetric', 'median = mean (symmetric): reduces to three equations, no parameters'); }
{ const sy = R.symmetry; ok(sy[1].cond / sy[0].cond > 5 && sy[2].cond / sy[1].cond > 5, `reference: the condition number grows like 1/γ as γ → 0 (${sy.map(x => x.cond.toExponential(1)).join(', ')})`);
  const summ = g => { const p = { xi: 5, lambda: 40, gamma: g, delta: 1.3 }, u = sbMomentsY(g, 1.3), m1 = 5 + 40 * u.m1, m2 = 25 + 400 * u.m1 + 1600 * u.m2, m3 = 125 + 3000 * u.m1 + 24000 * u.m2 + 64000 * u.m3;
    return { mean: m1, median: 5 + 40 / (1 + Math.exp(g / 1.3)), dq: Math.sqrt(m2), dg: m3 / m2 }; };
  const c1 = run(summ(0.1)), c2 = run(summ(0.01)); ok(c1.status === 'ok' && c2.status === 'ok' && c2.convergence.cond / c1.convergence.cond > 5, `ours too: ${c1.convergence.cond.toExponential(1)} → ${c2.convergence.cond.toExponential(1)}`);
  for (const g of [1e-7, 1e-5, 1e-4]) { const r = run(summ(g)); ok(r.status !== 'ok' && r.params === null, `γ = ${g} (nearly symmetric): no single answer (${r.status}${r.problems && r.problems[0] ? ' ' + r.problems[0].code : ''})`); } }

/* 6. inputs: nothing made up */
{ const s = R.cases[0].summary;
  ok(run({ ...s, dg: undefined }).problems.some(p => p.code === 'wsum.missing' && p.key === 'dg'), 'without d̄_G nothing is computed (m3 is not made up from the mean and the variance)');
  ok(run({ ...s, dg: s.dq ** 2 / s.mean * 0.999 }).problems.some(p => p.code === 'fns.m3'), 'd̄_G ≤ Dq²/mean (m3·m1 ≤ m2²): inadmissible moments refused');
  ok(run({ ...s, dq: s.mean * 0.99 }).problems.some(p => p.code === 'prs.dqbelow'), 'Dq not above the mean: refused'); }

/* 7. region: 0 ≤ ξ < median, λ > median − ξ, δ > 0 */
{ const r = run(R.cases[1].summary); ok(r.params.xi >= 0 && r.params.xi < r.targets.median && r.params.xi + r.params.lambda > r.targets.median && r.params.delta > 0 && /0 <= xi < d50/.test(r.settings.region), 'solution inside the stated region; region and transform recorded'); }

console.log(`dist P19: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
