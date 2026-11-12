// Site index, stage SI04: series-level bootstrap and the delta method for user sets with a covariance matrix.
//   node tests/siteindex/test_si04.mjs
// Reference: tests/ref/siteindex_si04.json (tests/ref/make_siteindex_si04.py: the same mulberry32 stream and resampling
// order, pairs rebuilt separately, scipy least_squares per replicate, numpy quantile 'linear').
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as S from '../../assets/lab/siteindex/calc.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-6) => ok(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1e-12), `${m}: got ${a} expected ${b}`);
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/siteindex_si04.json'), 'utf8'));
const SRC = JSON.parse(readFileSync(path.join(root, 'tests/ref/siteindex_si03.json'), 'utf8'));

/* 1. bootstrap = the Python implementation with the same seed and resampling order */
for (const c of R.cases) {
  const ser = SRC.forms[c.form].series, t = `${c.form} ${c.pairing}`;
  const full = S.fitPairs(c.form, S.makePairs(ser, c.pairing), { start: SRC.start[c.form] });
  S.FORMS[c.form].params.forEach((k, i) => near(full.theta[i], c.full[i], `${t}: full-data fit = SciPy`, 1e-6));
  eq(S.resampleIndices(ser.length, R.B, R.seed).slice(0, 3), c.idx_first, `${t}: the same resampled series (seed ${R.seed})`);
  const b = S.bootstrapSeries(c.form, ser, c.pairing, full, { B: R.B, seed: R.seed, level: R.level, points: R.points.map(([A, H]) => ({ A, H })), baseAge: R.baseAge });
  eq([b.B, b.seed, b.level, b.nOk, b.nFail, b.failRate, b.resampling], [R.B, R.seed, R.level, R.B, 0, 0, 'series'], `${t}: replicates, seed and failure rate recorded`);
  let worst = 0; b.thetas.forEach((th, j) => th.forEach((v, i) => { worst = Math.max(worst, Math.abs(v - c.thetas[j][i]) / Math.abs(c.thetas[j][i])); }));
  ok(worst < 1e-6, `${t}: every replicate's coefficients = SciPy (worst relative ${worst.toExponential(2)})`);
  S.FORMS[c.form].params.forEach((k, i) => { near(b.params[k].lo, c.lo[i], `${t}: ${k} lower percentile`, 1e-6); near(b.params[k].hi, c.hi[i], `${t}: ${k} upper percentile`, 1e-6); near(b.params[k].sd, c.sd[i], `${t}: ${k} bootstrap SD`, 1e-5); });
  b.si.forEach((s, i) => { near(s.est, c.si[i].est, `${t}: SI at (${s.A}, ${s.H})`, 1e-9); near(s.lo, c.si[i].lo, `${t}: SI lower`, 1e-6); near(s.hi, c.si[i].hi, `${t}: SI upper`, 1e-6); ok(s.lo <= s.est && s.est <= s.hi, `${t}: interval contains the estimate`); });
  // reproducible: the same seed gives the same result; another seed another one
  const b2 = S.bootstrapSeries(c.form, ser, c.pairing, full, { B: R.B, seed: R.seed });
  ok(JSON.stringify(b2.thetas) === JSON.stringify(b.thetas), `${t}: same seed → identical replicates`);
  const b3 = S.bootstrapSeries(c.form, ser, c.pairing, full, { B: R.B, seed: R.seed + 1 }); ok(JSON.stringify(b3.thetas) !== JSON.stringify(b.thetas), `${t}: another seed → other replicates`);
}
{ let prog = 0; const ser = SRC.forms['schu.ada'].series, full = S.fitPairs('schu.ada', S.makePairs(ser, 'consecutive'), { start: [-10] });
  S.bootstrapSeries('schu.ada', ser, 'consecutive', full, { B: 7, onProgress: b => { prog = b; } }); eq(prog, 7, 'progress reported per replicate');
  eq(S.bootstrapSeries('schu.ada', ser.slice(0, 1), 'consecutive', full, { B: 5 }).problem, 'boot.fewseries', 'one series: no bootstrap');
  eq(S.bootstrapSeries('schu.ada', ser, 'consecutive', { status: 'noconverge' }, { B: 5 }).problem, 'boot.nofit', 'no full fit: no bootstrap'); }
{ // every replicate is counted as a success or a failure; intervals only from the successful ones (four series)
  const ser = SRC.forms['cr.ada.b0'].series.slice(0, 4);
  const full = S.fitPairs('cr.ada.b0', S.makePairs(ser, 'all'), { start: [0.03, 1.3] }), b = S.bootstrapSeries('cr.ada.b0', ser, 'all', full, { B: 20, seed: 3 });
  ok(full.status === 'ok' && b.nOk + b.nFail === 20 && b.failRate === b.nFail / 20 && b.thetas.length === b.nOk, `every replicate counted (${b.nOk} ok, ${b.nFail} failed); intervals only from successful ones`); }
/* 2. delta method: gradient = central differences of SI in the parameters; interval = est ± z·se */
for (const [form, params, cov] of [['cr.ada.b0', { b1: 0.031, b2: 1.41 }, [[1.9e-6, 3.1e-5], [3.1e-5, 8.1e-4]]], ['cr.ada.b2', { b0: 37.4, b1: 0.036 }, [[0.4, -1e-3], [-1e-3, 9e-6]]], ['schu.ada', { b1: -22 }, [[0.25]]]]) {
  const m = { form, params, baseAge: 50, ageType: 'total' }, d = S.deltaSI(m, cov, 30, 15);
  const keys = S.FORMS[form].params, th = keys.map(k => params[k]);
  const SI = q => S.siteIndex({ ...m, params: Object.fromEntries(keys.map((k, i) => [k, q[i]])) }, 30, 15).value;
  const g = th.map((v, i) => { const h = 1e-6 * Math.max(1, Math.abs(v)), u = th.slice(), w = th.slice(); u[i] += h; w[i] -= h; return (SI(u) - SI(w)) / (2 * h); });
  g.forEach((v, i) => near(d.gradient[i], v, `${form}: ∂SI/∂${keys[i]} = central difference`, 1e-6));
  let v = 0; g.forEach((gi, i) => g.forEach((gj, j) => { v += gi * cov[i][j] * gj; }));
  near(d.se, Math.sqrt(v), `${form}: se = √(gᵀΣg)`, 1e-6); near(d.est, SI(th), `${form}: estimate`, 1e-15);
  near(d.hi - d.est, 1.959963984540054 * d.se, `${form}: 95 % interval = est ± 1.95996·se`, 1e-9); near(d.est - d.lo, d.hi - d.est, `${form}: symmetric`, 1e-12);
  eq(d.method, 'delta', `${form}: method recorded`);
}
for (const [cov, code] of [[[[1, 0]], 'cov.shape'], [[[0, 0], [0, 1]], 'cov.diag'], [[[1, 0.5], [0.4, 1]], 'cov.sym'], [[[1, 2], [2, 1]], 'cov.notpsd'], [null, 'cov.shape']])
  eq(S.deltaSI({ form: 'cr.ada.b0', params: { b1: 0.03, b2: 1.4 }, baseAge: 50 }, cov, 30, 15).problem, code, `covariance refused: ${code}`);
eq(S.deltaSI({ form: 'cr.ada.b2', params: { b0: 30, b1: 0.03 }, baseAge: 50 }, [[1, 0], [0, 1e-6]], 30, 35).problem, 'si.invalid', 'no SI (height above the asymptote): no interval');
eq(S.parseCov('1.9e-6 3.1e-5; 3.1e-5 8.1e-4'), [[1.9e-6, 3.1e-5], [3.1e-5, 8.1e-4]], 'covariance text parsed (rows by ";")'); eq(S.parseCov(''), null, 'empty covariance → none');

console.log(`siteindex SI04: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
