// Saved-result views (22 Nov 2026): the generic view of any tool's run record and the Model Evaluation view.
// Usage: node tests/library/test_view.mjs
import { genericView, viewOf, inputsView, cell, label, num } from '../../assets/lab/library/view.js';
import * as D from '../../assets/lab/dist/index.js';
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

// Diameter Distribution view: fits from the engine itself, curves from the saved parameters, bootstrap left to the generic part
const dA = [12.5, 15, 18.2, 22, 25.5, 31, 9.4, 14, 27, 20.1, 16.6, 23.3], dB = [30, 34.5, 28, 41, 37.2, 33, 29.5, 45, 38, 36];
const fits = [['A', dA], ['B', dB]].flatMap(([plot, d]) => ['weibull.ml', 'normal.ml', 'exponential.ml'].map(id => { const r = D.runMethod(id, { d, plot }); const { gof, ...x } = r; return { ...x, fit: { ks: D.gof.ks(D.family(r.family), r.params, d), aic: 2 } }; }));
const dr = { format: 'run-record/1', tool: { id: 'cap-dagilimi', version: '2.2.1' }, source: 'sim.csv', settings: { unit: 'cm', dataType: 'raw', methods: { 'weibull.ml': null, 'normal.ml': null } }, results: fits,
  bootstrap: [{ unit: 'A', fit: 'weibull.ml', B: 99, seed: 1, p: 0.4 }], sources: { methods: { 'weibull.ml': { refs: ['R6'] } } } };
const dv = viewOf(dr);
ok(dv.kind === 'tool' && count(dv.html, /class="rv-unit"/g) === 2 && dv.html.includes('Plot A') && dv.html.includes('Plot B'), 'distribution: one section per plot');
ok(count(dv.html, /class="chart"/g) === 4 && dv.html.includes('Fitted densities') && dv.html.includes('Fitted cumulative'), 'distribution: density and cumulative curves per plot from the saved parameters');
ok(dv.html.includes('Weibull · Maximum likelihood') && dv.html.includes('rv-keys'), 'distribution: fits named as in the tool, with a legend');
ok(dv.html.includes('class="rv-rest"') && dv.html.includes('Bootstrap, Sources'), 'distribution: bootstrap runs and sources folded below, from the generic view');
ok(dv.html.includes('Q–Q and P–P plots need the diameters'), 'distribution: says which plots need the data');
const failed = viewOf({ ...dr, results: [{ ...fits[0], status: 'error', params: null, error: { code: 'fit.failed' } }] });
ok(failed.kind === 'tool' && !failed.html.includes('class="chart"') && failed.html.includes('fit.failed'), 'distribution: a failed fit is listed with its error, no curve');

// Relative Ranking view
const rr = { format: 'run-record/1', tool: { id: 'nispi-siralama', version: '1.2.0' }, settings: { excluded: [{ row: 9, label: 'M9' }] }, m: 4, incomplete: ['M6'], sameRanks: [['R²', 'FI']],
  criteria: ['R²', 'FI', 'RMSE'].map((name, j) => ({ name, dir: j < 2 ? 'max' : 'min', weight: 1, best: 0.9, worst: 0.4, constant: false })),
  ranks: ['M1', 'M2', 'M3', 'M4'].map((label, i) => ({ ordinal: i + 1, label, row: i + 2, values: [0.9 - i / 10, 0.9 - i / 10, 1 + i], R: [1 + i, 1 + i, 1 + i], sum: 3 + 3 * i, overall: 1 + i })) };
const rv = viewOf(rr);
ok(rv.kind === 'tool' && rv.html.includes('id="rv-ranks"') && count(rv.html, /<tr><td class="num">\d<\/td><th>M\d/g) === 4, 'ranking: the ranking table with every model');
ok(rv.html.includes('id="rv-crit"') && rv.html.includes('M6') && rv.html.includes('R² = FI') && rv.html.includes('Left out of the ranking: M9'), 'ranking: criteria, incomplete models, equal criteria and left-out models');
ok(count(rv.html, /class="chart"/g) === 2 && rv.html.includes('Relative ranks by criterion'), 'ranking: overall-rank bars and the radar chart');
ok(!viewOf({ ...rr, criteria: rr.criteria.slice(0, 2) }).html.includes('Relative ranks by criterion'), 'ranking: no radar with fewer than 3 criteria');
console.log(`library view: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
