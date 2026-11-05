// Tests for Model Evaluation (Module 3). Run: node tests/eval/test_eval.mjs
// References: hand values from the module prompt, and tests/ref/eval.json (scikit-learn, independent code).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as E from '../../assets/lab/eval/calc.js';
import { tableFromText } from '../../assets/lab/core/table.js';
import { classesFromBreaks } from '../../assets/lab/stand/calc.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-10) => ok(a === b || (a != null && b != null && Math.abs(a - b) <= tol * Math.max(1, Math.abs(b))), `${m}: got ${a} expected ${b}`);
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
const ref = JSON.parse(readFileSync(path.join(root, 'tests/ref/eval.json'), 'utf8'));

/* 1. acceptance example */
{
  const m = E.metrics([10, 20, 30], [12, 18, 33], 'mean');
  near(m.bias, 1, 'bias = 1 (e = predicted − observed)');
  near(m.mae, 2.3333333333, 'MAE = 2.3333333333', 1e-10);
  near(m.mae, 7 / 3, 'MAE = 7/3');
  near(m.rmse, 2.3804761428, 'RMSE ≈ 2.3804761428', 1e-10);
  near(m.rmse, Math.sqrt(17 / 3), 'RMSE = √(17/3) (denominator n)');
  near(m.r2, 0.915, 'R² = 1 − 17/200 = 0.915');
  eq([m.sse, m.sst], [17, 200], 'SSE, SST');
  for (const k of ['bias', 'mae', 'rmse', 'r2']) near(m[k], ref.acceptance[k], `acceptance ${k} = scikit-learn`);
  near(m.rel.den, 20, 'relative: denominator = mean observed 20');
  near(m.rel.rmse, ref.acceptance.rel_mean.rmse, 'relative RMSE %');
  // R² is not the squared correlation
  const r = 0.9707253433941508;  // Pearson r from numpy.corrcoef; r² = 0.9423 ≠ R² = 0.915
  ok(Math.abs(m.r2 - r * r) > 0.02, 'R² differs from squared correlation');
  // sign: over-prediction gives positive bias
  ok(E.metrics([10], [12]).bias === 2, 'positive bias = over-prediction');
}

/* 2. perfect prediction, constant observed, negative R² */
{
  const p = E.metrics([10, 20, 30], [10, 20, 30], 'mean');
  eq([p.bias, p.mae, p.rmse, p.r2], [0, 0, 0, 1], 'perfect: 0, 0, 0, R² = 1');
  const c = E.metrics([5, 5, 5], [4, 5, 7], 'sd');
  eq([c.r2, c.r2Reason], [null, 'constant'], 'constant observed: R² undefined');
  near(c.bias, ref.constant.bias, 'constant: bias still defined'); near(c.rmse, ref.constant.rmse, 'constant: RMSE still defined');
  eq([c.rel.den, c.rel.reason, c.rel.rmse], [0, 'sd-zero', null], 'relative to SD with SD = 0 → undefined');
  eq(E.metrics([5, 5, 5], [4, 5, 7], 'range').rel.reason, 'range-zero', 'range = 0 → undefined');
  eq(E.metrics([-2, 1, 1], [0, 0, 0], 'mean').rel.reason, 'mean-nonpositive', 'mean ≤ 0 → undefined');
  eq(E.metrics([7], [8], 'sd').rel.reason, 'sd-n', 'SD needs n ≥ 2');
  const neg = E.metrics([10, 20, 30], [30, 10, 50]);
  near(neg.r2, ref.negative_r2.r2, 'negative R² = scikit-learn'); ok(neg.r2 < 0, 'negative R² is not clipped to 0');
  const z = E.metrics([], []);
  eq([z.n, z.bias, z.rmse, z.r2], [0, null, null, null], 'no pairs: everything undefined');
}

/* 3. fixture: missing/unreadable pairs, two models, common vs own row sets, groups */
const tb = tableFromText(readFileSync(path.join(here, 'fixture.csv'), 'utf8'), { delim: ';' });
const col = h => tb.headers.indexOf(h);
const spec = rowSet => ({ obs: col('h_obs'), decimal: ',', rowSet, norm: 'mean',
  models: [{ col: col('h_m1'), name: 'M1', role: 'unknown' }, { col: col('h_m2'), name: 'M2', role: 'cv' }],
  groups: { plot: col('plot'), species: col('species'), fold: col('fold'), dclass: { col: col('dbh'), classes: classesFromBreaks([8, 20, 32, 44], true).classes } } });
{
  const r = E.evaluate(tb, spec('common'));
  ok(r.N === 60 && r.nCommon === ref.n_common, `common rows ${r.nCommon} = ${ref.n_common}`);
  const [a, b] = r.models;
  eq([a.acc.obsEmpty, a.acc.predEmpty, a.acc.predBad, a.acc.ownValid, a.acc.used, a.acc.dropped], [2, 1, 0, 57, 53, 7], 'M1 accounting');
  eq([b.acc.obsEmpty, b.acc.predEmpty, b.acc.predBad, b.acc.ownValid, b.acc.used, b.acc.dropped], [2, 3, 1, 54, 53, 7], 'M2 accounting (unreadable counted apart)');
  ok(r.sameSample, 'common: same sample');
  for (const [m, k] of [[a, 'h_m1'], [b, 'h_m2']]) {
    for (const x of ['n', 'bias', 'mae', 'rmse', 'r2']) near(m.overall[x], ref.common[k][x], `common ${k} ${x}`);
    near(m.overall.rel.rmse, ref.common[k].rel_mean.rmse, `common ${k} relative RMSE`);
    for (const g of ['plot', 'species', 'fold']) for (const row of m.groups[g]) for (const x of ['n', 'bias', 'mae', 'rmse', 'r2']) near(row[x], ref.groups_common[k][g][row.label][x], `${k} ${g}=${row.label} ${x}`);
  }
  eq(a.groups.dclass.map(x => x.label), ['[8, 20)', '[20, 32)', '[32, 44)', '≥ 44'], 'diameter classes as groups, in class order');
  eq(a.groups.dclass.reduce((s, x) => s + x.n, 0), 53, 'class groups add up to n');
}
{
  const r = E.evaluate(tb, spec('own'));
  const [a, b] = r.models;
  for (const [m, k] of [[a, 'h_m1'], [b, 'h_m2']]) for (const x of ['n', 'bias', 'mae', 'rmse', 'r2']) near(m.overall[x], ref.own[k][x], `own ${k} ${x}`);
  ok(!r.sameSample, 'own: samples differ and this is reported');
  eq(r.overlap, [[57, 53], [53, 54]], 'overlap matrix (rows in common)');
  eq([a.acc.notCommon, b.acc.notCommon], [4, 1], 'rows only one model uses');
}

/* 4. XLSX-style numeric cells need no decimal setting; bad text is counted, not guessed */
{
  const t = { headers: ['o', 'p'], rowNumbers: [2, 3, 4], rows: [[{ t: 'n', v: 10 }, { t: 'n', v: 12 }], [{ t: 's', v: '1.234' }, { t: 's', v: '1,5' }], [{ t: 's', v: '' }, { t: 'n', v: 3 }]] };
  const r = E.evaluate(t, { obs: 0, decimal: ',', rowSet: 'common', norm: null, models: [{ col: 1, name: 'p', role: 'unknown' }], groups: {} });
  eq([r.models[0].acc.obsBad, r.models[0].acc.obsEmpty, r.models[0].acc.used], [1, 1, 1], '"1.234" under comma setting is unreadable, not 1234');
}

console.log(`eval: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
