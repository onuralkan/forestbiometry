// Taper, stage SV-02/a3 (TOOLS_SPEC TP02): fitting taper equations to stem measurements.
//   node tests/taper/test_sv02a3.mjs
// Reference: tests/ref/taper_sv02a3.json (tests/ref/make_taper_sv02a3.py: scipy.optimize.least_squares from its own
// start, numpy lstsq for Kozak's ln d scale; simulated stems, test coefficients only).
// Acceptance (TP02): coefficients = SciPy within 1e−6 (relative); noise-free simulated data give the true coefficients back.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as FIT from '../../assets/lab/taper/fit.js';
import { checkSet } from '../../assets/lab/taper/calc.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/taper_sv02a3.json'), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const relErr = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-8);
const worst = (P, Q) => Math.max(...Object.keys(Q).map(k => relErr(P[k], Q[k])));

/** stems-like structure (core/stems.js) from the simulated trees and one column of diameters (inside bark). */
function stems(dvals) {
  let i = 0, row = 2;
  return { schema: 'stem-sections/1', trees: R.trees.map(t => ({ key: t.tree_id, plot_id: null, tree_id: t.tree_id, period: null, state: 'ok', dbh: t.D, height: t.H, stump_h: 0.15,
    points: t.h.map(h => ({ row: row++, plot_id: null, tree_id: t.tree_id, period: null, h, d: null, d_ib: dvals[i++], bark: 'ib', bark_t: null, kind: null })) })) };
}

for (const F of R.fits) {
  const tag = `${F.form}, ${F.noisy ? 'noisy' : 'noise-free'}`, st = stems(F.d);
  for (const scale of ['d', 'source']) {
    const r = FIT.fitTaper(st, { form: F.form, bark: 'ib', scale }), ref = scale === 'd' ? F.d_scale : F.source_scale;
    const w = r.status === 'ok' ? worst(r.params, ref.params) : Infinity;
    ok(r.status === 'ok' && w <= 1e-6, `${tag}, scale ${scale} (${r.method}): coefficients = SciPy, worst relative ${w.toExponential(2)}`);
    if (!F.noisy) { const wt = worst(r.params, R.true[F.form]); ok(wt <= 1e-6, `${tag}, scale ${scale}: true coefficients recovered (worst ${wt.toExponential(2)})`); }
    if (scale === 'd' && ref.sse != null) ok(Math.abs(r.sse - ref.sse) <= 1e-8 * Math.max(1, ref.sse), `${tag}: SSE = SciPy (${r.sse} vs ${ref.sse})`);
    if (scale === 'd') {
      ok(r.n === F.d.length - (F.form === 'kozak02' ? 0 : 0) && r.nTrees === R.trees.length && r.seNote === 'independent-observations' && r.se && Object.values(r.se).every(v => v > 0), `${tag}: n, trees, standard errors labelled as assuming independent observations`);
      const nC = r.byClass.reduce((s, c) => s + c.n, 0); ok(nC === r.n - r.nUndefined && r.byClass.length === 10, `${tag}: residuals by relative height class cover every point`);
      const m = r.residuals.filter(q => q.res != null); ok(Math.abs(r.rmse - Math.sqrt(m.reduce((s, q) => s + q.res * q.res, 0) / m.length)) < 1e-12, `${tag}: RMSE on the d scale`);
      ok(r.volumes.length === R.trees.length && r.volumes.every(v => v.sectionV > 0 && v.profileV > 0 && Math.abs(v.rel) < 0.2), `${tag}: profile volume against the section volume for every tree (|difference| < 20%)`);
      const set = FIT.fitToSet(r, { citation: 'own data (test)' });
      ok(set && set.origin === 'fitted' && set.fit.n === r.n && set.output.bark === 'ib' && checkSet(set).length === 0, `${tag}: a successful fit becomes a valid fitted coefficient set`);
      ok(FIT.fitToSet(r, {}) && checkSet(FIT.fitToSet(r, {})).some(q => q.code === 'source.missing'), `${tag}: a fitted set still needs a citation`);
    }
  }
}
{ const F = R.fits[0], st = stems(F.d); st.trees[0].state = 'error'; const r = FIT.fitTaper(st, { form: 'mb76' });
  ok(r.left.errorTrees === 1 && r.nTrees === R.trees.length - 1, 'trees in state error are left out and counted');
  ok(FIT.fitTaper({ trees: st.trees.slice(1, 2) }, { form: 'mb76' }).status === 'invalid', 'one tree: no fit'); }
console.log(`taper SV-02/a3 (fitting): ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
