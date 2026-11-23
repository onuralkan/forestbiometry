// Diameter Distribution, stage P24 (23 Nov 2026): three-parameter Weibull maximum likelihood (weibull.ml3).
// Reference: tests/ref/dist_p24_ml3.json from tests/ref/dist_p24_ml3.R (ForestFit 2.4.3 fitWeibull, location = TRUE,
// method "ml"; Nelder–Mead, best of several starts). The package allows a < 0; the tool keeps 0 ≤ a < Dmin.
import { readFileSync } from 'node:fs';
import * as D from '../../assets/lab/dist/index.js';
import { fitML3, fitML } from '../../assets/lab/dist/fit/weibull.js';
import * as SRC from '../../assets/lab/dist/sources.js';
const REF = JSON.parse(readFileSync(new URL('../ref/dist_p24_ml3.json', import.meta.url), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const rel = (x, y) => Math.abs(x / y - 1);

for (const k of ['sim_a5', 'sim_a10', 'true_a0']) {
  const { d, ff } = REF[k], r = D.runMethod('weibull.ml3', { d }), p = r.params;
  ok(r.status === 'ok' && r.free.join() === 'a,b,c' && Object.keys(r.fixed).length === 0, `${k}: estimated, three free parameters`);
  ok(r.logLik >= ff.logLik - 1e-6, `${k}: log-likelihood ${r.logLik} not below ForestFit's ${ff.logLik}`);
  ok(Math.abs(p.a - ff.a) < 0.01 && rel(p.b, ff.b) < 1e-3 && rel(p.c, ff.c) < 1e-3, `${k}: a, b, c as ForestFit (a ${p.a} vs ${ff.a}; b ${p.b} vs ${ff.b}; c ${p.c} vs ${ff.c})`);
  const nb = [-1e-3, 1e-3].map(h => fitML(d, { a: p.a + h }).logLik);
  ok(nb.every(v => v <= r.logLik + 1e-9) && p.a > 0 && p.a < Math.min(...d) && p.c > 1, `${k}: a profile maximum inside (0, Dmin) with c > 1`);
}
{ // the package's optimum is a < 0: the tool stays at a = 0, the two-parameter fit, and says so
  const { d, ff } = REF.sample, r = fitML3(d), two = fitML(d, { a: 0 });
  ok(ff.a < 0 && r.status === 'ok' && r.params.a === 0 && r.warnings.some(w => w.code === 'ml3.atzero'), 'sample data: ForestFit a < 0 → a = 0 with a warning');
  ok(Math.abs(r.logLik - two.logLik) < 1e-9 && Math.abs(r.params.c - two.params.c) < 1e-9 && r.logLik <= ff.logLik + 1e-9, 'sample data: equal to the two-parameter ML; not above the unconstrained optimum');
}
{ // c < 1: the likelihood grows without bound as a → Dmin; no estimate
  const r = fitML3(REF.shape_below1.d);
  ok(r.status === 'boundary' && !r.params && r.warnings.some(w => w.code === 'ml3.edge' || w.code === 'ml3.cle1'), 'shape below 1: boundary state, no parameters (ForestFit stops at a = Dmin)');
}
ok(fitML3([12, 15]).status === 'invalid' && fitML3([-1, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16]).status === 'invalid', 'too few or non-positive diameters: invalid');
{ const m = D.method('weibull.ml3'), s = SRC.methodSources('weibull.ml3');
  ok(m.optional === true && m.likelihoodMaximised && m.options.length === 0 && s.refs.join() === 'R6' && s.section === 'P24', 'registry: optional (starts unchecked), likelihood maximised, no fixed-location option, source R6, METHODS P24');
  ok(SRC.REFS.R6.status === 'P', 'ForestFit fitWeibull: package-documentation status [P]'); }
console.log(`dist P24: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
