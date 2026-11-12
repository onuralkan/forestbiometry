// Site index, stage SI03: fitting the difference equations to height–age series (pairing, Levenberg–Marquardt).
//   node tests/siteindex/test_si03.mjs
// Reference: tests/ref/siteindex_si03.json (tests/ref/make_siteindex_si03.py: simulated stem analyses, pairs built
// separately, scipy.optimize.least_squares 'lm' from the same fixed start, finite-difference Jacobian).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as S from '../../assets/lab/siteindex/calc.js';
import { parseNumber } from '../../assets/lab/core/num.js';
import { cellText } from '../../assets/lab/core/table.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-6) => ok(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1e-12), `${m}: got ${a} expected ${b}`);
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/siteindex_si03.json'), 'utf8'));

for (const [id, rec] of Object.entries(R.forms)) {
  const sizes = rec.series.map(s => s.points.length);
  for (const mode of S.PAIRINGS) {
    const P = S.makePairs(rec.series, mode), ref = rec.fits[mode], t = `${id} ${mode}`;
    /* pairs: counts from the definition and from the reference */
    const expect = mode === 'all' ? sizes.reduce((a, m) => a + m * (m - 1) / 2, 0) : sizes.reduce((a, m) => a + m - 1, 0);
    eq([P.length, ref.n], [expect, expect], `${t}: number of pairs`);
    ok(P.every(p => p.A2 > p.A1), `${t}: pairs forward in age`);
    /* fit from the reference's start = SciPy least_squares */
    const f = S.fitPairs(id, P, { start: R.start[id], nSeries: rec.series.length });
    ok(f.status === 'ok', `${t}: converged (${f.status} ${f.reason})`);
    S.FORMS[id].params.forEach((k, i) => near(f.params[k], ref.theta[i], `${t}: ${k} = SciPy`, 1e-6));
    near(f.sse, ref.sse, `${t}: SSE`, 1e-9); near(f.rmse, ref.rmse, `${t}: RMSE = √(SSE/n)`, 1e-9); near(f.bias, ref.bias, `${t}: bias = mean(pred − obs)`, 1e-5);
    S.FORMS[id].params.forEach((k, i) => near(f.se[k], ref.se[i], `${t}: SE ${k} (finite-difference Jacobian in SciPy)`, 1e-4));
    eq([f.seNote, f.startFrom, f.n, f.nSeries], ['independent-observations', 'user', ref.n, rec.series.length], `${t}: record`);
    ok(Math.abs(f.residuals.reduce((a, q) => a + q.e, 0) / f.n - f.bias) < 1e-12 && f.residuals.every(q => Math.abs(q.e - (q.pred - q.H2)) < 1e-12), `${t}: residual sign e = predicted − observed`);
    /* the automatic start (grid) reaches the same optimum */
    const g = S.fitPairs(id, P, { nSeries: rec.series.length });
    ok(g.status === 'ok' && g.startFrom === 'grid' && Array.isArray(g.start), `${t}: grid start recorded`);
    S.FORMS[id].params.forEach((k, i) => near(g.params[k], ref.theta[i], `${t}: ${k} from the grid start = SciPy`, 1e-6));
    /* simulated data: coefficients come back in a sensible range (within 10 % of the generating values) */
    S.FORMS[id].params.forEach((k, i) => ok(Math.abs(f.params[k] / R.true[id][i] - 1) < 0.1, `${t}: ${k} = ${f.params[k].toFixed(4)} near the generating ${R.true[id][i]}`));
  }
}

/* analytic gradients = central differences */
for (const [id, th] of [['cr.ada.b0', [0.031, 1.37]], ['cr.ada.b2', [37.5, 0.036]], ['schu.ada', [-21.7]]]) {
  for (const x of [{ A1: 12, H1: 6.5, A2: 47 }, { A1: 55, H1: 22, A2: 9 }, { A1: 3, H1: 1.1, A2: 120 }]) {
    const g = S.GRAD[id](th, x);
    th.forEach((v, i) => { const h = 1e-6 * Math.max(1, Math.abs(v)), up = th.slice(), dn = th.slice(); up[i] += h; dn[i] -= h;
      const pr = q => S.project({ form: id, params: Object.fromEntries(S.FORMS[id].params.map((k, j) => [k, q[j]])) }, x.A2, x.A1, x.H1).value;
      near(g[i], (pr(up) - pr(dn)) / (2 * h), `${id}: ∂H2/∂${S.FORMS[id].params[i]} at A1 = ${x.A1}`, 1e-6); });
  }
}

/* pairing edge cases and refusals */
{ const ser = [{ id: 'a', points: [{ A: 10, H: 5 }, { A: 30, H: 12 }, { A: 20, H: 9 }, { A: 20, H: 9.2 }] }, { id: 'b', points: [{ A: 15, H: 7 }] }];
  eq(S.makePairs(ser, 'consecutive').map(p => [p.A1, p.A2]), [[10, 20], [20, 30]], 'unsorted input sorted; equal ages give no pair; a single point gives none');
  eq(S.makePairs(ser, 'first').map(p => [p.A1, p.A2]), [[10, 20], [10, 20], [10, 30]], 'first: from the first observation');
  eq(S.makePairs(ser, 'all').length, 5, 'all: every forward pair with different ages'); }
{ const f = S.fitPairs('cr.ada.b0', [{ id: 'a', A1: 10, H1: 5, A2: 20, H2: 9 }, { id: 'a', A1: 20, H1: 9, A2: 30, H2: 12 }]); ok(f.status === 'invalid' && f.problems[0].code === 'fit.few', 'two pairs for two parameters: refused'); }
{ // heights that shrink with age: the Schumacher fit lands on b1 > 0 and is refused as a usable set
  const P = [[10, 20, 30, 12], [20, 18, 40, 11], [15, 25, 45, 15], [12, 16, 24, 13]].map(([A1, H1, A2, H2]) => ({ id: 'x', A1, H1, A2, H2 }));
  const f = S.fitPairs('schu.ada', P, { start: [10] }); ok(f.status !== 'ok' && (f.problems || []).length > 0, `shrinking heights: no usable set (${f.status} ${JSON.stringify(f.problems)})`); }
ok(S.fitPairs('nope', []).problems[0].code === 'form.unknown', 'unknown form');
/* series from a table: ids as text, plot joined, unreadable rows and repeated ages reported with their rows */
{ const cell = v => v === '' ? null : typeof v === 'number' ? { t: 'n', v, w: String(v) } : { t: 's', v };
  const rows = [['P1', '01', 10, 5.2], ['P1', '01', 20, '9,4'], ['P1', '1', 10, 5], ['P1', '01', 20, 9.5], ['P2', '01', 'x', 7], ['P2', '', 10, 7], ['P2', '02', 15, 0]];
  const tbl = { rows: rows.map(r => r.map(cell)), rowNumbers: rows.map((_, i) => i + 2) };
  const r = S.seriesFromTable(tbl, { plot: 0, series: 1, A: 2, H: 3 }, ',', parseNumber, cellText);
  eq(r.series.map(x => [x.id, x.points.length]), [['P1 / 01', 3], ['P1 / 1', 1]], 'ids are text ("01" ≠ "1"), plot joined to the series id');
  ok(Math.abs(r.series[0].points[1].H - 9.4) < 1e-12, 'decimal comma read with the comma setting');
  eq(r.problems.map(q => [q.code, q.row]), [['ser.dup', 5], ['ser.a', 6], ['ser.id', 7], ['ser.h', 8]], 'repeated age, unreadable age, empty id and zero height reported with rows');
  eq(S.makePairs(r.series, 'all').length, 2, 'repeated ages give no pair (10→20 twice)'); }

console.log(`siteindex SI03: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
