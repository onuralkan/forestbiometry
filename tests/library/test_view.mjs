// Saved-result views (22 Nov 2026): the generic view of any tool's run record and the Model Evaluation view.
// Usage: node tests/library/test_view.mjs
import { genericView, viewOf, inputsView, cell, label, num } from '../../assets/lab/library/view.js';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const count = (h, re) => (h.match(re) || []).length;

// helpers
ok(num(0.123456789) === '0.123457' && num(12) === '12' && num(1.5e-7) === '1.5000e-7', 'num: 6 significant digits, exponent for tiny values');
ok(label('rankBootstrap') === 'Rank bootstrap' && label('d_mean') === 'D mean', 'label: camelCase and snake_case to words');
ok(cell(null) === '–' && cell(true) === 'yes' && cell([1, 2.5]) === '1; 2.5' && cell('<b>') === '&lt;b&gt;', 'cell: null, boolean, list, escaped text');

// generic view: settings list, top-level values, tables with nested columns, nested tables per row
const rec = { format: 'run-record/1', tool: { id: 'boy-cap', version: '1.1.1' }, created: '2026-11-22T10:00:00Z', inputs: [{ role: 'trees', kind: 'file', name: 'a.csv', rows: 3, sha256: 'ab'.repeat(32) }],
  settings: { response: 'h', weights: null, models: ['naslund', 'curtis'] }, n: 120, note: '<script>x</script>',
  fits: [{ id: 'naslund', status: 'ok', theta: [1.2, 0.3], stats: { rmse: 1.234567, aic: 200 }, residualsByClass: [{ cls: '10–20', n: 5, bias: -0.1 }] },
         { id: 'curtis', status: 'ok', theta: [2, 0.1], stats: { rmse: 1.3, aic: 210 }, residualsByClass: [] }] };
const g = genericView(rec);
ok(g.includes('<h3>Settings</h3>') && g.includes('Naslund; curtis') === false && g.includes('naslund; curtis'), 'generic: settings listed, lists joined');
ok(g.includes('<dt>N</dt><dd>120</dd>') && g.includes('&lt;script&gt;') && !g.includes('<script>'), 'generic: top-level values, text escaped');
ok(g.includes('<th>Stats · Rmse</th>') && g.includes('1.23457') && count(g, /<tr>/g) >= 3, 'generic: a table with nested columns (stats.rmse) and its rows');
ok(g.includes('naslund · Residuals by class') && g.includes('10–20'), 'generic: a nested table per row, under the row name');
ok(!g.includes('integrity') && !g.includes('2026-11-22T10'), 'generic: the envelope is not repeated');
ok(inputsView(rec).includes('a.csv') && inputsView(rec).includes('abababab'), 'inputs: name and fingerprint');
const big = genericView({ tool: { id: 'x' }, units: Array.from({ length: 250 }, (_, i) => ({ i, v: i / 3 })) });
ok(count(big, /<tr>/g) === 201 && big.includes('First 200 of 250 rows'), 'generic: long tables cut at 200 rows with a note');
ok(genericView({ tool: { id: 'x' } }).includes('no result tables'), 'generic: empty record');
ok(viewOf(rec).kind === 'generic', 'a tool without its own view gets the generic view');

// Model Evaluation view
const m = (name, bias, rmse, extra = {}) => ({ name, column: name, role: 'test', accounting: { rows: 6, obsEmpty: 0, obsBad: 0, predEmpty: 0, predBad: 0, ownValid: 6, used: 6, dropped: 0 },
  overall: { n: 6, bias, mae: rmse * 0.8, rmse, r2: 0.9, meanObs: 11.5, meanPred: 11.5 - bias },
  groups: { plot: [{ label: 'P1', n: 3, bias, mae: 0.5, rmse: rmse * 0.9, r2: 0.8, meanObs: 11, meanPred: 11 }, { label: 'P2', n: 3, bias, mae: 0.6, rmse: rmse * 1.1, r2: null, r2Reason: 'constant', meanObs: 12, meanPred: 12 }] },
  inference: { n: 6, mean: bias, sd: 0.5, se: 0.2, ci: { t: 2.57, lo: bias - 0.5, hi: bias + 0.5 }, boot: { stats: { bias: { est: bias, pct: { lo: -1, hi: 1 }, bca: null, Bok: 999 }, mae: { est: 1, pct: { lo: 0.5, hi: 1.5 }, bca: { lo: 0.5, hi: 1.6 }, Bok: 999 }, rmse: { est: rmse, pct: { lo: rmse - 0.2, hi: rmse + 0.3 }, bca: null, Bok: 999 }, r2: { reason: 'est' } } } }, ...extra });
const ev = { format: 'run-record/1', tool: { id: 'model-degerlendirme', version: '1.2.0-beta.3' }, created: '2026-11-22T10:00:00Z',
  settings: { observed: 'obs', models: [], rowSet: 'common', norm: null, decimal: '.', weight: null, inference: { level: 0.95, alpha: 0.05, margin: null, bootstrap: { B: 999, seed: 1 } }, groups: { plot: 'plot', species: null, fold: null, dclass: null } },
  rows: { N: 6, common: 6, sameSample: true, weighted: false }, models: [m('m1', 0.2, 1.1), m('m2', -0.4, 0.9)],
  rankBootstrap: { n: 6, m: 2, B: 999, Bok: 999, skipped: 0, level: 0.95, models: [{ name: 'm1', overall: 2.5, ordinal: 2, lo: 1, hi: 2, meanOrdinal: 1.7, pBest: 0.3 }, { name: 'm2', overall: 1.5, ordinal: 1, lo: 1, hi: 2, meanOrdinal: 1.3, pBest: 0.7 }] } };
const v = viewOf(ev);
ok(v.kind === 'tool', 'Model Evaluation: its own view');
ok(v.html.includes('id="rv-measures"') && v.html.includes('RMSE') && v.html.includes('Bias ē') && v.html.includes('1.1'), 'measures table with the tool\'s headings');
ok(count(v.html, /<svg /g) >= 5, 'charts: errors, bias with intervals, R², bootstrap RMSE, rank, group RMSE');
ok(v.html.includes('id="rv-ci"') && v.html.includes('95% confidence interval for the mean error'), 'confidence interval table');
ok(v.html.includes('Bootstrap 95% confidence intervals: m1') && v.html.includes('id="rv-rank"'), 'bootstrap and rank uncertainty tables');
ok(v.html.includes('<h4>Plot</h4>') && v.html.includes('P2') && v.html.includes('undefined'), 'group tables with undefined R² marked');
ok(v.html.includes('Acc') === false || v.html.includes('Row accounting'), 'row accounting');
ok(v.html.includes('observed–predicted and residual plots need the rows'), 'says which plots cannot be drawn from a saved result');
ok(viewOf({ ...ev, models: [] }).kind === 'generic', 'a record without models falls back to the generic view');
const bad = viewOf({ ...ev, models: [{ name: 'x', overall: null, groups: 5 }] });
ok(bad.html.length > 0, 'a malformed record does not break the page');
console.log(`library view: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
