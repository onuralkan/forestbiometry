// Tests for Model Evaluation (Module 3). Run: node tests/eval/test_eval.mjs
// References: hand values from the module prompt, and tests/ref/eval.json (scikit-learn, independent code).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as E from '../../assets/lab/eval/calc.js';
import { tableFromText } from '../../assets/lab/core/table.js';
import { classesFromBreaks } from '../../assets/lab/stand/calc.js';
import { ncF1Quantile, tCdf } from '../../assets/lab/core/stats.js';

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

/* 1.2.0: weighted measures, interval for the bias, equivalence tests (reference: tests/ref/eval_inference.R, base R) */
const ri = JSON.parse(readFileSync(path.join(root, 'tests/ref/eval_inference.json'), 'utf8'));
{
  // weights = dbh column; common rows of both models
  const sp = { ...spec('common'), weight: col('dbh') };
  const r = E.evaluate(tb, sp);
  ok(r.weighted, 'weighted run flagged');
  r.models.forEach((m, k) => {
    const x = ri.weighted[k ? 'h_m2' : 'h_m1'], o = m.overall;
    eq(o.n, x.n, `weighted ${m.name}: n`);
    for (const f of ['sumW', 'bias', 'mae', 'rmse', 'r2', 'meanObs', 'meanPred']) near(o[f], x[f], `weighted ${m.name}: ${f} = R`, 1e-12);
    for (const f of ['bias', 'mae', 'rmse']) near(o.rel[f], x.rel_mean[f], `weighted ${m.name}: relative ${f} (weighted mean) = R`, 1e-12);
    eq(m.infer, null, 'no inference without spec.infer');
  });
  const rr = E.evaluate(tb, { ...sp, norm: 'range' });
  for (const f of ['bias', 'mae', 'rmse']) near(rr.models[0].overall.rel[f], ri.weighted.h_m1.rel_range[f], `weighted relative ${f} (range) = R`, 1e-12);
  eq(E.evaluate(tb, { ...sp, norm: 'sd' }).models[0].overall.rel.reason, 'sd-weighted', 'relative to SD undefined under weights');
  // unit weights reproduce the unweighted measures
  const o = [10, 20, 30], q = [12, 18, 33], u = E.metrics(o, q, 'mean', [1, 1, 1]), plain = E.metrics(o, q, 'mean');
  for (const f of ['bias', 'mae', 'rmse', 'r2']) near(u[f], plain[f], `unit weights = unweighted ${f}`, 1e-15);
  // a hand example: w = [1, 2, 1], e = [2, −2, 3] → bias = (2 − 4 + 3)/4 = 0.25, RMSE = √((4 + 8 + 9)/4)
  const h = E.metrics(o, q, null, [1, 2, 1]);
  near(h.bias, 0.25, 'hand: weighted bias 0.25'); near(h.rmse, Math.sqrt(21 / 4), 'hand: weighted RMSE √(21/4)'); near(h.mae, 9 / 4, 'hand: weighted MAE (2 + 4 + 3)/4');
  near(h.r2, 1 - 21 / 200, 'hand: weighted R² = 1 − 21/200 (weighted mean of y is 20)');
  // weights: empty, unreadable, zero and negative weights leave the row out and are counted
  const t2 = tableFromText('y;p;w\n1;1,5;2\n2;2,5;\n3;2;x\n4;4,5;0\n5;5;-1\n6;6,5;1', { delim: ';' });
  const r2 = E.evaluate(t2, { obs: 0, models: [{ col: 1, name: 'P', role: 'test' }], decimal: ',', rowSet: 'common', norm: null, weight: 2, infer: { level: 0.95 } });
  eq([r2.models[0].acc.wEmpty, r2.models[0].acc.wBad, r2.models[0].acc.used, r2.models[0].acc.dropped], [1, 3, 2, 4], 'weights: 1 empty, 3 unreadable or ≤ 0, 2 used');
  eq(r2.models[0].infer.reason, 'weighted', 'inference not computed under weights');
}
{
  const r = E.evaluate(tb, { ...spec('common'), infer: { level: 0.95, alpha: 0.05, margin: null } });
  r.models.forEach((m, k) => {
    const x = ri.inference[k ? 'h_m2' : 'h_m1'], I = m.infer;
    eq(I.n, x.n, `${m.name}: n`);
    for (const f of ['mean', 'sd', 'se']) near(I[f], x[f], `${m.name}: ${f} = R`, 1e-12);
    near(I.ci.lo, x.ci95[0], `${m.name}: 95% interval lower = t.test`, 1e-11); near(I.ci.hi, x.ci95[1], `${m.name}: 95% interval upper = t.test`, 1e-11);
    for (const [lv, key] of [[0.9, 'ci90'], [0.99, 'ci99']]) {
      const J = E.inference(m.pred.map((p, j) => p - m.obs[j]), { level: lv });
      near(J.ci.lo, x[key][0], `${m.name}: ${key} lower = t.test`, 1e-11); near(J.ci.hi, x[key][1], `${m.name}: ${key} upper = t.test`, 1e-11);
    }
    for (const q of x.equiv) {
      const J = E.inference(m.pred.map((p, j) => p - m.obs[j]), { level: 0.95, alpha: q.alpha, margin: { type: q.type, value: q.value } }), Q = J.equiv;
      const lab = `${m.name} ${q.type} ${q.value} α=${q.alpha}`;
      near(Q.delta, q.delta, `${lab}: δ`, 1e-12); near(Q.eps, q.eps, `${lab}: ε`, 1e-12);
      near(Q.tost.lo, q.tost_lo, `${lab}: TOST interval lower = t.test(1 − 2α)`, 1e-11); near(Q.tost.hi, q.tost_hi, `${lab}: TOST upper`, 1e-11);
      eq(Q.tost.equivalent, q.tost_equivalent, `${lab}: TOST decision`);
      near(Q.wellek.psi2, q.psi2, `${lab}: ψ²`, 1e-12); near(Q.wellek.C, q.C, `${lab}: cut-off C = √qf(α, 1, n − 1, ψ²)`, 1e-8);
      near(Q.wellek.t, q.t, `${lab}: t`, 1e-12); eq(Q.wellek.equivalent, q.wellek_equivalent, `${lab}: equivalence decision`);
      near(Q.wellek.power, q.power, `${lab}: power = 2·pt(C) − 1`, 1e-8);
    }
  });
  // Robinson and Froese (2004), Table 1 (n = 3393 trees, s = 1.9 cm; n = 549 plots, s = 10.6 m³/ha; α = 0.01):
  // the cut-offs printed to two decimals (absolute criteria within 0.05: the paper divides by the unrounded s), and the same
  // values from R to full precision. The printed 27.77 for diameter 50 % is not reproduced (R and this code: 26.68).
  const T1 = [['d_abs025', 3393, 0.25 / 1.9, 5.33], ['d_abs050', 3393, 0.5 / 1.9, 12.96], ['d_rel10', 3393, 0.1, 3.50], ['d_rel25', 3393, 0.25, 12.21],
    ['d_rel50', 3393, 0.5, null], ['v_abs1', 549, 1 / 10.6, 0.14], ['v_abs5', 549, 5 / 10.6, 8.69], ['v_rel10', 549, 0.1, 0.19], ['v_rel25', 549, 0.25, 3.52], ['v_rel50', 549, 0.5, 9.30]];
  for (const [key, n, e, paper] of T1) {
    const C = Math.sqrt(ncF1Quantile(0.01, n - 1, n * e * e));
    near(C, ri.table1[key][0], `Table 1 ${key}: cut-off = R`, 1e-8);
    if (paper != null) ok(Math.abs(C - paper) <= (key.includes('abs') ? 0.05 : 0.0051), `Table 1 ${key}: cut-off ${C.toFixed(4)} ≈ printed ${paper}`);
    near(2 * tCdf(C, n - 1) - 1, ri.table1[key][1], `Table 1 ${key}: power = R`, 1e-8);
  }
  // printed power 0.11 and 0.15 for the two low-power volume rows
  ok(Math.abs(2 * tCdf(Math.sqrt(ncF1Quantile(0.01, 548, 549 / 10.6 ** 2)), 548) - 1 - 0.11) < 0.005, 'Table 1 volume 1 m³/ha: power ≈ 0.11');
  ok(Math.abs(2 * tCdf(Math.sqrt(ncF1Quantile(0.01, 548, 549 * 0.01)), 548) - 1 - 0.15) < 0.005, 'Table 1 volume 10 %: power ≈ 0.15');
  // the decisions of Table 1 for diameter (mean −0.19, s 1.9, n 3393: t = −5.72 to two decimals)
  const tD = -0.19 / (1.9 / Math.sqrt(3393));
  ok(Math.abs(tD + 5.82) < 0.01, 'Table 1: t from the rounded mean and s (−5.82; the paper prints −5.72 from unrounded values)');
  // undefined cases
  eq(E.inference([1]).reason, 'n', 'n < 2: nothing');
  eq(E.inference([1, 1, 1], { margin: { type: 'abs', value: 1 } }).equiv.reason, 'sd-zero', 's = 0: equivalence undefined');
  eq(E.inference([1, 2, 4], { margin: { type: 'abs', value: 0 } }).equiv.reason, 'margin', 'margin must be positive');
  eq(E.inference([1, 2, 4], { margin: { type: 'abs', value: -1 } }).equiv.reason, 'margin', 'negative margin rejected');
}

/* 1.2.0-beta.2: bootstrap percentile and BCa intervals (reference: tests/ref/eval_boot.R, same generator and seed) */
const rb = JSON.parse(readFileSync(path.join(root, 'tests/ref/eval_boot.json'), 'utf8'));
{
  const r = E.evaluate(tb, { ...spec('common'), infer: { level: 0.95, alpha: 0.05, margin: null } });
  const cases = [['h_m1', r.models[0].obs, r.models[0].pred, 2000, 1, 0.95], ['h_m2', r.models[1].obs, r.models[1].pred, 2000, 1, 0.95],
    ['small', [10, 20, 30, 25, 14, 18, 40, 33], [12, 18, 33, 22, 15, 21, 36, 35], 2000, 7, 0.9], ['m2_b1000_s42_99', r.models[1].obs, r.models[1].pred, 1000, 42, 0.99]];
  for (const [key, o, q, B, seed, level] of cases) {
    const b = E.bootstrapCI(o, q, { B, seed, level });
    for (const st of E.BOOT_STATS) {
      const x = rb[key][st], y = b.stats[st], lab = `boot ${key} ${st}`;
      near(y.est, x.est, `${lab}: estimate`, 1e-12); eq(y.Bok, x.Bok, `${lab}: replications`);
      near(y.pct.lo, x.pct[0], `${lab}: percentile lower = R`, 1e-12); near(y.pct.hi, x.pct[1], `${lab}: percentile upper = R`, 1e-12);
      near(y.pct.lo, x.pct_q1[0], `${lab}: percentile lower = quantile(type = 1)`, 1e-12); near(y.pct.hi, x.pct_q1[1], `${lab}: percentile upper = quantile(type = 1)`, 1e-12);
      near(y.z0, x.z0, `${lab}: z0`, 1e-10); near(y.a, x.a, `${lab}: acceleration (jackknife, eq. 6.6–6.7)`, 1e-9);
      if (st === 'bias' || st === 'mae') near(y.a, x.a_empinf, `${lab}: acceleration = boot::empinf (linear statistic)`, 1e-9);
      near(y.bca.lo, x.bca[0], `${lab}: BCa lower = R`, 1e-12); near(y.bca.hi, x.bca[1], `${lab}: BCa upper = R`, 1e-12);
    }
  }
  // with a = z0 = 0 the BCa endpoint is the percentile endpoint (eq. 2.3)
  const b0 = E.bootstrapCI([1, 2, 3, 4, 5, 6], [1.5, 1.5, 3.5, 3.5, 5.5, 5.5], { B: 400, seed: 3 });
  ok(b0.stats.bias.pct.lo <= b0.stats.bias.pct.hi && b0.stats.r2.Bok <= 400, 'small sample: intervals ordered; R² replications with constant y left out');
  // constant observed values: R² undefined in every replication
  const bc = E.bootstrapCI([5, 5, 5, 5], [4, 5, 6, 7], { B: 200, seed: 1 });
  eq([bc.stats.r2.reason, bc.stats.bias.reason], ['est', null], 'constant observed: no R² interval, bias interval still given');
  eq(E.bootstrapCI([1], [2]).reason, 'n', 'bootstrap needs n ≥ 2');
  // same seed, same result; different seed, different draws
  const s1 = E.bootstrapCI(cases[2][1], cases[2][2], { B: 500, seed: 9 }), s2 = E.bootstrapCI(cases[2][1], cases[2][2], { B: 500, seed: 9 }), s3 = E.bootstrapCI(cases[2][1], cases[2][2], { B: 500, seed: 10 });
  eq(s1, s2, 'reproducible with the seed'); ok(JSON.stringify(s1) !== JSON.stringify(s3), 'another seed gives other draws');
  // through evaluate: only with weights off
  const rr = E.evaluate(tb, { ...spec('common'), infer: { level: 0.95, boot: { B: 2000, seed: 1 } } });
  near(rr.models[1].infer.boot.stats.rmse.bca.hi, rb.h_m2.rmse.bca[1], 'evaluate → bootstrap BCa upper RMSE = R', 1e-12);
  ok(!E.evaluate(tb, { ...spec('common'), weight: col('dbh'), infer: { level: 0.95, boot: { B: 200, seed: 1 } } }).models[0].infer.boot, 'no bootstrap under weights');
}

console.log(`eval: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
