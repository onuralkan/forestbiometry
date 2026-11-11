// Diameter distribution engine, stage P11: measurement thresholds (truncation) and conditional maximum likelihood.
//   node tests/dist/test_p11.mjs
// Reference: tests/ref/dist_p11.json (tests/ref/make_dist_p11.py: simulated truncated samples, conditional likelihood
// with SciPy's own cdf/sf/logpdf maximised by Nelder–Mead + Powell; far-tail masses with mpmath at 50 digits).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as D from '../../assets/lab/dist/index.js';
import * as TR from '../../assets/lab/dist/truncate.js';
import { gaussLegendre } from '../../assets/lab/core/quad.js';
import { nelderMead } from '../../assets/lab/core/optim.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-12) => ok(Number.isFinite(a) && Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1), `${m}: got ${a} expected ${b}`);
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/dist_p11.json'), 'utf8'));
const FAMS = ['weibull', 'normal', 'lognormal', 'gamma', 'beta', 'johnsonsb', 'exponential', 'loglogistic'];

/* 1. registry: one conditional ML per family; closed forms are not marked for truncated data */
eq(D.methodsFor({ kind: 'fit' }).filter(m => m.truncation).map(m => m.id).sort(), FAMS.map(f => f + '.tml').sort(), 'one truncated-ML method per family');
ok(D.methodsFor({ kind: 'fit' }).filter(m => !m.truncation).every(m => !m.id.endsWith('.tml')), 'the untruncated methods carry no truncation flag (disabled when a threshold is declared)');
ok(D.methodsFor({ kind: 'fit' }).filter(m => m.truncation).every(m => m.estimator === 'ml' && m.likelihoodMaximised && m.solver === 'nelder-mead'), 'truncated ML: estimator, solver');
eq(D.method('beta.tml').options.map(o => o.key), ['L', 'U'], 'beta: bounds stay user-fixed under truncation');
eq(D.method('weibull.tml').options.map(o => o.key), ['a'], 'Weibull: location option kept');

/* 2. numerics: optimiser, stable masses in far tails (mpmath) */
{ const r = nelderMead(x => (x[0] - 1) ** 2 + 100 * (x[1] - x[0] ** 2) ** 2, [-1.2, 1]); ok(r.status === 'ok' && Math.abs(r.x[0] - 1) < 1e-6 && Math.abs(r.x[1] - 1) < 1e-6, 'Nelder–Mead: Rosenbrock minimum'); }
near(TR.log1mexp(-1e-20), Math.log(1e-20), 'ln(1 − e^x) for tiny x', 1e-12); near(TR.log1mexp(-50), -Math.exp(-50), 'ln(1 − e^x) for large |x|', 1e-12);
for (const t of R.tails) { const fam = D.family(t.family); near(TR.logMass(fam, t.params, t.lower, t.upper), t.logMass, `ln mass ${t.family} ${JSON.stringify(t.params)} [${t.lower}, ${t.upper}] = mpmath`, 1e-11); }

/* 3. conditional distribution: density integrates to 1, CDF and quantile consistent, outside 0/1 */
const GL = gaussLegendre(20);
const integrate = (f, a, b, panels = 400) => { let s = 0; const h = (b - a) / panels; for (let i = 0; i < panels; i++) { const c = a + (i + 0.5) * h; for (let j = 0; j < 20; j++) s += GL.w[j] * h / 2 * f(c + h / 2 * GL.x[j]); } return s; };
for (const c of R.cases) {
  const fam = D.family(c.family), p = c.params, t = { lower: c.lower, upper: c.upper }, T = TR.truncated(fam, p, t), tag = `${c.family} [${c.lower}, ${c.upper}]`;
  const hi = c.upper ?? fam.quantile(1 - 1e-13, p);
  const total = c.upper != null ? integrate(T.pdf, c.lower, hi, 800) : integrate(u => T.pdf(Math.exp(u)) * Math.exp(u), Math.log(c.lower), Math.log(hi), 800);   // open upper end: on ln d
  near(total, 1, `${tag}: conditional density integrates to 1`, 2e-9);
  ok(T.cdf(c.lower - 1) === 0 && T.cdf(c.lower) === 0 && (c.upper == null || T.cdf(c.upper + 1) === 1) && T.pdf(c.lower - 0.01) === 0, `${tag}: 0 below L, 1 above U, no density outside`);
  for (const q of [1e-6, 0.01, 0.25, 0.5, 0.75, 0.99, 0.999999]) near(T.cdf(T.quantile(q)), q, `${tag}: F_T(Q_T(${q}))`, 1e-8);
  for (const x of [c.lower + 1, (c.lower + hi) / 2, hi - 1]) near(T.cdf(x) + T.sf(x), 1, `${tag}: F_T + S_T = 1 at ${x.toFixed(2)}`, 1e-13);
  near(TR.truncLogLik(fam, p, c.d, t), c.logLik, `${tag}: conditional ln L at the SciPy estimate = SciPy`, 1e-10);
  near(T.logMass, c.logMass, `${tag}: ln mass at the SciPy estimate = SciPy`, 1e-10);
}

/* 4. conditional ML against SciPy on simulated truncated samples */
for (const c of R.cases) {
  const o = { trunc: { lower: c.lower, upper: c.upper }, ...(c.family === 'beta' ? { L: c.fixed.L, U: c.fixed.U } : {}), ...(c.family === 'johnsonsb' ? { xi: c.fixed.xi, lambda: c.fixed.lambda } : {}) };
  const r = D.runMethod(c.family + '.tml', { d: c.d }, o), tag = `${c.family} [${c.lower}, ${c.upper}]`, fam = D.family(c.family);
  ok(r.status === 'ok', `${tag}: converged (${r.status})`); if (r.status !== 'ok') continue;
  for (const k of Object.keys(c.params)) near(r.params[k], c.params[k], `${tag} ${k} = SciPy`, 5e-6);
  ok(r.logLik >= c.logLik - 1e-8, `${tag}: ln L not below SciPy's optimum (${r.logLik} vs ${c.logLik})`); near(r.logLik, c.logLik, `${tag}: conditional ln L`, 1e-9);
  near(r.truncation.logMass, TR.logMass(fam, r.params, c.lower, c.upper), `${tag}: mass recorded`, 1e-13);
  near(r.truncation.nPopulation, c.d.length / r.truncation.mass, `${tag}: implied total = n / mass`, 1e-13);
  eq([r.truncation.lower, r.truncation.upper, r.truncation.nObserved, r.settings.truncLower, r.settings.truncUpper], [c.lower, c.upper, c.d.length, c.lower, c.upper], `${tag}: threshold kept apart from the parameters`);
  ok(Object.keys(r.fixed).every(k => c.fixed[k] === r.params[k]), `${tag}: fixed parameters unchanged`);
  // the untruncated ML on the same data is a different (biased) answer, not the conditional one
  const u = D.runMethod(D.method(c.family + '.tml').base, { d: c.d }, o);
  ok(u.status !== 'ok' || Object.keys(c.params).some(k => !c.fixed.hasOwnProperty(k) && Math.abs(u.params[k] / r.params[k] - 1) > 1e-3), `${tag}: untruncated ML differs from the conditional ML`);
}
{ // the truth is recovered better by the conditional fit (Weibull, lower threshold)
  const c = R.cases.find(x => x.family === 'weibull' && x.upper == null), r = D.runMethod('weibull.tml', { d: c.d }, { trunc: { lower: 8 } }), u = D.runMethod('weibull.ml', { d: c.d });
  ok(Math.abs(r.params.c - 2.5) < Math.abs(u.params.c - 2.5), `Weibull with d ≥ 8: conditional c (${r.params.c.toFixed(3)}) closer to 2.5 than untruncated (${u.params.c.toFixed(3)})`); }

/* 5. states */
{ const d = R.cases[0].d;
  for (const [o, code] of [[{ trunc: {} }, 'trunc.none'], [{ trunc: { lower: -1 } }, 'trunc.lower'], [{ trunc: { lower: 20, upper: 10 } }, 'trunc.order'], [{ trunc: { upper: -3 } }, 'trunc.upper']]) {
    const r = D.runMethod('weibull.tml', { d }, o); ok(r.status === 'invalid' && r.problems.some(p => p.code === code) && r.params === null, `${JSON.stringify(o)}: ${code}`); }
  const r = D.runMethod('weibull.tml', { d: [...d, 5, 6.5] }, { trunc: { lower: 8 } });
  ok(r.status === 'invalid' && r.problems.some(p => p.code === 'trunc.outside' && p.count === 2 && p.example === 5), 'observations below the declared threshold: counted, refused');
  const b = D.runMethod('beta.tml', { d }, { trunc: { lower: 8 } }); ok(b.status === 'invalid' && b.problems.some(p => p.code === 'bounds.missing'), 'beta: bounds still required');
  const s = D.runMethod('normal.tml', { d: [20, 20, 20] }, { trunc: { lower: 8 } }); ok(s.status === 'invalid' && s.problems.some(p => p.code === 'constant'), 'equal diameters'); }
{ const c = R.cases.find(x => x.family === 'gamma' && x.upper == null), r = D.runMethod('gamma.tml', { d: c.d }, { trunc: { lower: 8 }, nScope: 'population' });
  ok(r.settings.nScope === 'population' && D.runMethod('gamma.tml', { d: c.d }, { trunc: { lower: 8 } }).settings.nScope === 'observed', 'scope of N recorded (observed by default)'); }

console.log(`dist P11: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
