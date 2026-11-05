// Tests for Relative Ranking (Module 7). Run: node tests/rank/test_rank.mjs
// References: hand values, and tests/ref/rank.json (numpy, independent code) on the synthetic sample workbook.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as C from '../../assets/lab/rank/calc.js';
import { tableFromSheet, tableFromText } from '../../assets/lab/core/table.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-10) => ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${m}: got ${a} expected ${b}`);
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);

/* 1. Eq. 10 by hand */
{
  const r = C.relativeRanks([1, 2, 4], 'min').R;
  near(r[0], 1, 'best = 1'); near(r[1], 1 + 2 / 3, '1 + (3 − 1)(2 − 1)/(4 − 1)'); near(r[2], 3, 'worst = m');
  eq(C.relativeRanks([0.9, 0.95, 0.8], 'max').R.map(x => +x.toFixed(10)), [1 + 2 * (0.95 - 0.9) / 0.15, 1, 3].map(x => +x.toFixed(10)), 'larger is better (R², FI)');
  eq(C.relativeRanks([-0.4, 0.1, 0.2], 'abs').R.map(x => +x.toFixed(10)), [3, 1, 1 + 2 * 0.1 / 0.3].map(x => +x.toFixed(10)), 'bias: closest to zero is best (|value|)');
  ok(C.relativeRanks([-0.4, 0.1, 0.2], 'abs').R[0] === 3, 'large negative bias is the worst, not the best');
  const c = C.relativeRanks([5, 5, 5], 'min'); ok(c.constant && c.R.every(x => x === 1), 'constant criterion: all 1, flagged (no division by zero)');
  eq(C.ordinal([1, 2.5, 2.5, 4]), [1, 2, 2, 4], 'competition ranking with ties');
}

/* 2. direction suggestions (user confirms; unknown → null) */
eq(['R²', 'r2', 'Fit Index', 'FI', 'Bias', 'bias(%)', 'RMSE', 'MAE', 'MAB', 'AAE', 'AIC', 'BIC', 'AICc', 'Adj R2', 'xyz'].map(C.suggestDirection),
  ['max', 'max', 'max', 'max', 'abs', 'abs', 'min', 'min', 'min', 'min', 'min', 'min', 'min', 'max', null], 'suggested directions');

/* 3. sample workbook against numpy */
const XLSX = createRequire(import.meta.url)(path.join(root, 'assets/vendor/sheetjs/xlsx.mini.min.js'));
const wb = XLSX.read(readFileSync(path.join(root, 'assets/lab/rank/ornek/ornek-olcutler.xlsx')), { type: 'buffer', cellFormula: false, cellNF: true, cellText: true });
const raw = tableFromSheet(XLSX, wb.Sheets[wb.SheetNames[0]], { header: false });
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/rank.json'), 'utf8'));
const hr = C.guessHeaderRow(raw.rows, '.');
eq(raw.rowNumbers[hr], 3, 'header row found below the title row (sheet row 3)');
const headers = raw.rows[hr].map(c => String(c.v ?? ''));
const crit = headers.slice(1).map((h, j) => ({ col: j + 1, dir: C.suggestDirection(h) }));
eq(crit.map(k => k.dir), Object.values(R.directions), 'directions suggested for the sample');
const data = C.readModels(raw, { headerRow: hr, modelCol: 0, criteria: crit, decimal: '.' });
eq(data.duplicates, [{ name: 'M07', count: 2 }], 'duplicate model name reported');
ok(data.models.filter(m => m.name === 'M07').every(m => /\(\d+\)$/.test(m.label)), 'duplicates labelled with their row number');
const cmp = (res, ref, tag) => {
  const byRow = new Map(res.rows.map(r => [r.row, r]));
  eq(res.rows.map(r => r.row).sort((a, b) => a - b), ref.rows.slice().sort((a, b) => a - b), `${tag}: models ranked`);
  ref.rows.forEach((row, i) => {
    const r = byRow.get(row);
    r.R.forEach((x, j) => near(x, ref.R[i][j], `${tag} row ${row} criterion ${j}`));
    near(r.sum, ref.sum[i], `${tag} row ${row} sum`); near(r.overall, ref.overall[i], `${tag} row ${row} overall`);
  });
};
{
  const res = C.rank(data);
  ok(res.problems.length === 0 && res.m === 13, 'm = 13 (one model with a missing value set apart)');
  eq(res.incomplete.map(i => data.models[i].label), ['M06'], 'incomplete model listed, not ranked');
  cmp(res, R.all, 'all');
  near(res.rows[0].overall, 1, 'best overall = 1'); near(res.rows[res.rows.length - 1].overall, res.m, 'worst overall = m');
  eq(res.sameRanks, [['R²', 'FI']], 'R² and FI give identical ranks: reported');
  const ex = C.rank(data, new Set([data.models.findIndex(m => m.name === 'M13')]));
  ok(ex.m === 12, 'excluding a model recomputes with m = 12');
  cmp(ex, R.excl, 'excl');
  const noMae = C.readModels(raw, { headerRow: hr, modelCol: 0, criteria: crit.filter(k => headers[k.col] !== 'MAE'), decimal: '.' });
  const r3 = C.rank(noMae); ok(r3.m === 14 && r3.incomplete.length === 0, 'dropping the criterion brings the model back');
  cmp(r3, R.noMAE, 'noMAE');
  const pick = C.pickForChart(res.rows, { best: 3, worst: 2 });
  eq(pick.map(r => r.index), [...res.rows.slice(0, 3), ...res.rows.slice(-2)].map(r => r.index), 'radar: best 3 and worst 2');
  eq(C.pickForChart(res.rows, { best: 1, extra: [res.rows[5].index] }).length, 2, 'radar: extra model added');
}

/* 4. problems are reported */
{
  const t = tableFromText('model;RMSE;XYZ\nA;1,2;5\nB;1,4;6\n', { delim: ';', header: false });
  const d = C.readModels(t, { headerRow: 0, modelCol: 0, criteria: [{ col: 1, dir: 'min' }, { col: 2, dir: null }], decimal: ',' });
  eq(C.rank(d).problems.map(p => p.code), ['no.direction'], 'unknown direction must be chosen');
  const d2 = C.readModels(t, { headerRow: 0, modelCol: 0, criteria: [{ col: 1, dir: 'min' }], decimal: ',' });
  eq(C.rank(d2, new Set([0])).problems.map(p => p.code), ['few.models'], 'fewer than 2 models');
  const d3 = C.readModels(t, { headerRow: 0, modelCol: 0, criteria: [{ col: 1, dir: 'min' }], decimal: '.' });
  eq(C.rank(d3).incomplete.length, 2, '"1,2" under point setting is unreadable, not 12');
}

console.log(`rank: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
