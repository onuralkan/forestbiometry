// Volume equations (SV-04): assets/lab/volume/calc.js.
//   node tests/volume/test_sv04.mjs
// Reference: tests/ref/volume_sv04.json (make_volume_sv04.py, standard library, written apart): coefficients, standard
// errors, residual SE, estimated variance exponent, Baskerville factor and the volume-scale fit measures of the five
// forms of Kershaw et al. 2016 §6.2 (eq. 6.22, 6.23, 6.25, local V = b0 + b1·D², 6.29 in ln form).
import { readFile } from 'node:fs/promises';
import * as VOL from '../../assets/lab/volume/calc.js';
import * as E from '../../assets/lab/eval/calc.js';
import { form, blankSet, validateCoef } from '../../assets/lab/core/coef.js';

const R = JSON.parse(await readFile(new URL('../ref/volume_sv04.json', import.meta.url), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, t = 1e-9) => a != null && b != null && Math.abs(a - b) <= t * Math.max(1e-12, Math.abs(b));

ok(VOL.FORM_IDS.join() === 'cf,cv,ln,loc,locln' && VOL.FORM_IDS.every(id => form('volume.' + id) && form('volume.' + id).tool === 'volume'), 'five forms registered in the coefficient library (tool volume)');
ok(form('volume.ln').transform === 'log' && form('volume.cf').transform === 'none' && form('volume.ln').params.map(p => p.key).join() === 'b1,b2,b3', 'log forms on their own scale; parameter names as in the book');
for (const [id, runs] of Object.entries(R.fits)) for (const [name, ref] of Object.entries(runs)) {
  const weight = name === 'w_est' ? { kind: 'power', k: null } : name === 'w_given' ? { kind: 'power', k: 1.7 } : { kind: 'none' };
  const f = VOL.fitForm(id, R.trees, { weight, correction: name === 'bask' ? 'baskerville' : 'none' });
  const good = f.status === 'ok' && f.n === ref.n && f.coef.every((v, i) => near(v, ref.coef[i])) && f.se.every((v, i) => near(v, ref.se[i], 1e-8)) && near(f.s, ref.s, 1e-9)
    && Object.entries(ref.params).every(([k, v]) => near(f.params[k], v)) && (ref.k == null || near(f.weight.k, ref.k)) && near(f.cf ?? 1, ref.cf)
    && ['bias', 'mae', 'rmse', 'r2'].every(k => Math.abs(f.metrics[k] - ref.metrics[k]) <= 1e-8 * Math.max(Math.abs(ref.metrics[k]), ref.metrics.rmse));   // bias ≈ 0 with an intercept: compared on the RMSE scale
  ok(good, `${id} ${name}: coefficients, SE, s, parameters${ref.k != null ? ', k' : ''}${name === 'bask' ? ', Baskerville factor' : ''} and fit measures equal the reference`);
}
{ const f = VOL.fitForm('ln', R.trees, { correction: 'baskerville' }); ok(near(f.cf, Math.exp(f.s * f.s / 2), 1e-15), `Baskerville factor = exp(s²/2) by hand (${f.cf.toFixed(6)})`);
  const m = E.metrics(f.obs, f.pred); ok(m.rmse === f.metrics.rmse && m.r2 === f.metrics.r2, 'fit measures are the Model Evaluation tool\'s own (same function, e = predicted − observed)'); }
{ const f = VOL.fitForm('cv', R.trees); ok(f.dropped.some(d => d.row === 5 && d.why === 'H') && f.dropped.some(d => d.row === 9 && d.why === 'V'), 'trees without H (needed) or V left out with their rows');
  const g = VOL.fitForm('loc', R.trees); ok(!g.dropped.some(d => d.why === 'H') && g.n === 39, 'the local form does not need height'); }
ok(VOL.fitForm('ln', R.trees, { weight: { kind: 'power', k: null } }).code === 'weight.log' && VOL.fitForm('cv', R.trees.slice(0, 3)).code === 'n.few', 'weights only on volume-scale forms; too few trees refused');
// a saved set predicts the fitted volume (log form with the Baskerville correction stored as SEE)
{ const f = VOL.fitForm('ln', R.trees, { correction: 'baskerville' });
  const set = { ...blankSet('volume.ln'), id: 's', params: f.params, transform: { kind: 'log', correction: 'baskerville', value: f.s }, source: { citation: 'test' }, origin: 'fitted', fit: {} };
  ok(validateCoef(set).length === 0 && near(VOL.predict(set, R.trees[0].D, R.trees[0].H), f.pred[0], 1e-12), 'saved ln set with Baskerville SEE predicts the fitted volume');
  const c = VOL.fitForm('cf', R.trees), sc = { ...blankSet('volume.cf'), id: 'c', params: c.params, source: { citation: 'test' }, origin: 'fitted', fit: {} };
  ok(near(VOL.predict(sc, 30, 22), c.params.b1 * 900 * 22, 1e-15) && VOL.predict(sc, 30, null) === null, 'constant form factor set: V = b1·D²H; no height, no volume'); }
ok(VOL.TOOL.id === 'hacim-denklemleri' && VOL.TOOL.version === '1.0.0-beta.1', 'tool id and first version (K4)');
console.log(`SV-04 volume equations: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
