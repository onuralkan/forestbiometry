// Shared infrastructure for the new tools, stage T01: coefficient library (model-coef/1), stem measurement table
// (stem-sections/1), key listing in the store, units, root scanner in core/roots.js.
//   node tests/core/test_t01.mjs
// These are data-handling rules, checked against hand-built cases; the numerical reference for the root scanner is the
// distribution engine's own SciPy-based tests (tests/dist/test_p06.mjs, test_p07.mjs), which must pass unchanged.
import * as C from '../../assets/lab/core/coef.js';
import { readStems, keyOf } from '../../assets/lab/core/stems.js';
import { put, keys, del } from '../../assets/lab/core/store.js';
import { UNITS, toInternal } from '../../assets/lab/core/num.js';
import { scanRoots } from '../../assets/lab/core/roots.js';
import { scanRoots as distScan } from '../../assets/lab/dist/recover/weibull.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
const codes = pr => pr.map(p => p.code);

/* 1. forms and validation (TEST forms; no real species coefficients anywhere) */
C.registerForm({ id: 't.pow', tool: 'test', params: [{ key: 'a' }, { key: 'b' }], inputs: { D: { unit: 'cm', bark: 'ob' } }, output: { name: 'B', unit: 'kg' }, formula: { tr: 'B = a·D^b', en: 'B = a·D^b' } });
C.registerForm({ id: 't.log', tool: 'test', params: [{ key: 'a' }, { key: 'b' }, { key: 'c' }], inputs: { D: { unit: 'cm' }, H: { unit: 'm' } }, output: { name: 'B', unit: 'kg' }, formula: { tr: 'ln B = a + b ln D + c ln H', en: 'ln B = a + b ln D + c ln H' }, transform: 'log' });
C.registerForm({ id: 't.log10', tool: 'test', params: [{ key: 'a' }, { key: 'b' }], inputs: { D: { unit: 'cm' } }, output: { name: 'B', unit: 'kg' }, formula: { tr: 'log10 B = a + b log10 D', en: 'log10 B = a + b log10 D' }, transform: 'log10' });
C.registerForm({ id: 'o.lin', tool: 'other', params: [{ key: 'k' }], inputs: { x: { unit: 'm' } }, output: { name: 'y', unit: 'm' }, formula: { tr: 'y = k·x', en: 'y = k·x' } });
for (const bad of [{}, { id: 't.pow', tool: 'test', params: [{ key: 'a' }], inputs: { D: { unit: 'cm' } }, output: { unit: 'kg' } }, { id: 'x', tool: 'test', params: [], inputs: { D: {} }, output: { unit: 'kg' } }, { id: 'y', tool: 'test', params: [{ key: 'a' }], inputs: {}, output: { unit: 'kg' } }]) {
  let e = null; try { C.registerForm(bad); } catch (x) { e = x; } ok(e, 'bad or duplicate form refused: ' + JSON.stringify(bad).slice(0, 60));
}
eq(C.formsFor('test').map(f => f.id), ['t.pow', 't.log', 't.log10'], 'forms of one tool');
const good = () => ({ ...C.blankSet('t.pow'), id: 'set1', params: { a: 0.0123, b: 2.4567 }, source: { citation: 'Test, not a real equation' } });
eq(C.validateCoef(good()), [], 'a complete set is valid');
const B = C.blankSet('t.log');
eq([B.transform, B.inputs, B.output, B.origin, B.schema], [{ kind: 'log', correction: 'none' }, { D: { unit: 'cm' }, H: { unit: 'm' } }, { name: 'B', unit: 'kg' }, 'user-entered', 'model-coef/1'], 'blank set takes units and scale from the form');
const cases = [
  [s => { s.source = { citation: '  ' }; }, 'source.missing', 'blank citation'],
  [s => { delete s.source; }, 'source.missing', 'no source'],
  [s => { s.form = 'nope'; }, 'form.unknown', 'unknown form'],
  [s => { s.form = 'o.lin'; }, 'form.tool', 'form of another tool'],
  [s => { delete s.params.b; }, 'param.missing', 'missing coefficient'],
  [s => { s.params.z = 1; }, 'param.extra', 'extra coefficient'],
  [s => { s.params.a = NaN; }, 'param.nonfinite', 'NaN coefficient'],
  [s => { s.params.a = '1.2'; }, 'param.nonfinite', 'coefficient as text'],
  [s => { s.inputs.D.unit = ''; }, 'unit.input', 'no input unit'],
  [s => { delete s.output.unit; }, 'unit.output', 'no output unit'],
  [s => { s.inputs.D.bark = 'xx'; }, 'bark', 'bad bark status'],
  [s => { s.valid = { D: [50, 10] }; }, 'valid.bad', 'min ≥ max'],
  [s => { s.valid = { D: [5] }; }, 'valid.bad', 'range of one number'],
  [s => { s.transform = { kind: 'log', correction: 'none' }; }, 'transform.bad', 'log transform on a linear form'],
  [s => { s.origin = 'builtin'; }, 'origin.bad', 'no built-in origin exists (K1)'],
  [s => { s.origin = 'fitted'; }, 'fit.missing', 'fitted set without a fit summary'],
  [s => { s.schema = 'model-coef/2'; }, 'schema', 'wrong schema'],
  [s => { s.id = ''; }, 'id', 'no id'],
];
for (const [mut, code, m] of cases) { const s = good(); mut(s); ok(codes(C.validateCoef(s)).includes(code), `${m} → ${code}: ${JSON.stringify(C.validateCoef(s))}`); }
{ const s = { ...C.blankSet('t.log'), id: 'L', params: { a: -2, b: 2.4, c: 0.5 }, source: { citation: 'Test' } }; eq(C.validateCoef(s), [], 'log form with transform'); delete s.transform; ok(codes(C.validateCoef(s)).includes('transform.bad'), 'log form without transform refused');
  s.transform = { kind: 'log', correction: 'baskerville' }; ok(codes(C.validateCoef(s)).includes('correction.value'), 'Baskerville without SEE refused');
  s.transform.value = 0.2; eq(C.validateCoef(s), [], 'Baskerville with SEE');
  ok(Math.abs(C.correctionFactor(s) - Math.exp(0.02)) < 1e-15, 'Baskerville factor exp(SEE²/2) (ln scale): ' + C.correctionFactor(s));
  s.transform = { kind: 'log', correction: 'none' }; ok(C.correctionFactor(s) === 1, 'no correction → 1'); }
{ const s = { ...C.blankSet('t.log10'), id: 'L10', params: { a: -1, b: 2.5 }, transform: { kind: 'log10', correction: 'baskerville', value: 0.1 }, source: { citation: 'Test' } };
  eq(C.validateCoef(s), [], 'log10 set valid'); ok(Math.abs(C.correctionFactor(s) - Math.exp((0.1 * Math.LN10) ** 2 / 2)) < 1e-15, 'log10: SEE converted to ln scale before exp(SEE²/2)');
  s.transform.kind = 'log'; ok(codes(C.validateCoef(s)).includes('transform.bad'), 'log10 form is never silently read as ln'); }
{ const s = good(); s.valid = { D: [8, 60] };
  eq(C.outsideValid(s, { D: 70 }), [{ key: 'D', value: 70, min: 8, max: 60 }], 'outside the validity range reported'); eq(C.outsideValid(s, { D: 30 }), [], 'inside'); s.valid = { D: [null, 60] }; eq(C.validateCoef(s), [], 'open-ended range allowed'); eq(C.outsideValid(s, { D: 1 }), [], 'open lower end'); }

/* 2. JSON library: bit-identical round trip; invalid sets listed, never dropped silently */
{ const sets = [good(), { ...C.blankSet('t.log'), id: 'L', params: { a: -2.302585092994046, b: 2.4000000000000004, c: 1e-300 }, transform: { kind: 'log', correction: 'user', value: 1.0000000000000002 }, valid: { D: [8, 60], H: [null, 40] }, species: 'X', source: { citation: 'Test', doi: '10.0/x', page: '3' }, created: '2026-11-12T00:00:00.000Z', modified: '2026-11-12T00:00:00.000Z' }];
  const lib = C.exportLibrary(sets, '2026-11-12T00:00:00.000Z'), text = JSON.stringify(lib), back = JSON.parse(text);
  ok(JSON.stringify(back) === text, 'JSON round trip: identical text');
  const r = C.importLibrary(back); ok(r.rejected.length === 0 && r.sets.length === 2 && r.sets[1].params.b === 2.4000000000000004 && r.sets[1].params.c === 1e-300 && r.sets[1].transform.value === 1.0000000000000002, 'numbers survive bit for bit');
  back.sets.push({ ...good(), id: 'bad', source: { citation: '' } });
  const r2 = C.importLibrary(back); ok(r2.sets.length === 2 && r2.rejected.length === 1 && r2.rejected[0].id === 'bad' && codes(r2.rejected[0].problems).includes('source.missing'), 'invalid set reported with its problems');
  ok(C.importLibrary(good()).sets.length === 1, 'a single set file is accepted');
  ok(C.importLibrary({ foo: 1 }).rejected[0].problems[0].code === 'library.schema', 'not a library'); }

/* 3. storage (Node: the store falls back to memory; same API) */
{ await put('dataset:approved', { x: 1 }); await put('session:x', 1);
  const s1 = await C.saveCoef(good(), '2026-11-12T10:00:00.000Z'), s2 = await C.saveCoef({ ...good(), id: 'set2' }, '2026-11-12T11:00:00.000Z');
  const o = await C.saveCoef({ ...C.blankSet('o.lin'), id: 'o1', params: { k: 2 }, source: { citation: 'Test' } }, '2026-11-12T12:00:00.000Z');
  ok(s1.ok && s2.ok && o.ok && s1.set.created === '2026-11-12T10:00:00.000Z', 'valid sets saved with timestamps');
  const r = await C.saveCoef({ ...good(), id: 'set3', source: {} }); ok(!r.ok && codes(r.problems).includes('source.missing') && !(await C.loadCoef('set3')), 'invalid set not saved');
  eq(await keys('coef:'), ['coef:o1', 'coef:set1', 'coef:set2'], 'store.keys(prefix) lists only that prefix, sorted');
  eq((await C.listCoefs('test')).map(s => s.id), ['set2', 'set1'], 'sets of one tool, newest first');
  eq((await C.listCoefs()).length, 3, 'all sets');
  await C.deleteCoef('set2'); eq((await C.listCoefs('test')).map(s => s.id), ['set1'], 'deleted');
  ok((await C.loadCoef('set1')).params.a === 0.0123, 'loaded set intact');
  for (const k of await keys('coef:')) await del(k); eq(await keys('coef:'), [], 'cleared'); }

/* 4. units */
ok(toInternal('bark', 'mm', 12) === 12 && toInternal('bark', 'cm', 1.2) === 12 && toInternal('age', 'yr', 50) === 50 && UNITS.dbh.cm === 1, 'bark thickness in mm, age in years');

/* 5. stem-sections/1: reader and checks, every problem with its source row */
const cell = v => v === '' || v == null ? null : typeof v === 'number' ? { t: 'n', v, w: String(v) } : { t: 's', v };
const table = (headers, rows, first = 2) => ({ headers, rows: rows.map(r => r.map(cell)), rowNumbers: rows.map((_, i) => first + i) });
const H = ['plot', 'tree', 'h', 'd', 'dbh', 'height', 'stump'], M = { plot: 0, tree: 1, h: 2, d: 3, dbh: 4, height: 5, stump_h: 6 };
{ // a clean tree: points sorted, units converted, tree attributes kept
  const t = table(H, [['P1', '7', 5.3, 21.2, 24, 18, 0.3], ['P1', '7', 1.3, 24, 24, 18, 0.3], ['P1', '7', 0.3, 27, 24, 18, 0.3], ['P1', '7', 9.3, 17, 24, 18, 0.3]]);
  const r = readStems(t, M, { decimal: '.' });
  eq(r.problems, [], 'clean tree: no problems');
  const T = r.trees[0]; eq([r.schema, T.tree_id, T.plot_id, T.points.map(p => p.h), T.dbh, T.height, T.stump_h, T.state], ['stem-sections/1', '7', 'P1', [0.3, 1.3, 5.3, 9.3], 24, 18, 0.3, 'ok'], 'tree record');
  eq(T.points[0], { row: 4, plot_id: 'P1', tree_id: '7', period: null, h: 0.3, d: 27, d_ib: null, bark: 'ob', bark_t: null, kind: null }, 'point record (over bark, no bark thickness)'); }
{ // units: h in cm, d in mm, bark thickness in mm → d_ib = d − bark_t/10
  const t = table(['tree', 'h', 'd', 'bt'], [['1', 130, 240, 18], ['1', 530, 212, 14]]);
  const r = readStems(t, { tree: 0, h: 1, d: 2, bark_t: 3 }, { decimal: '.', units: { h: 'cm', d: 'mm', bark_t: 'mm' } });
  const p = r.trees[0].points; ok(p[0].h === 1.3 && p[0].d === 24 && Math.abs(p[0].d_ib - 22.2) < 1e-12 && Math.abs(p[1].d - 21.2) < 1e-12 && Math.abs(p[1].d_ib - 19.8) < 1e-12, 'units converted, d_ib = d − double bark thickness/10'); }
{ // two cross diameters: arithmetic or quadratic (equal-area) mean, as set
  const t = table(['tree', 'h', 'd1', 'd2'], [['1', 1.3, 20, 30], ['1', 5, 18, 22]]), m = { tree: 0, h: 1, d1: 2, d2: 3 };
  ok(readStems(t, m, { decimal: '.' }).trees[0].points[0].d === 25, 'arithmetic mean of two diameters (default)');
  ok(Math.abs(readStems(t, m, { decimal: '.', combine: 'quadratic' }).trees[0].points[0].d - Math.sqrt(650)) < 1e-12, 'quadratic mean √((d1² + d2²)/2)');
  const r = readStems(table(['tree', 'h', 'd1', 'd2'], [['1', 1.3, 20, ''], ['1', 5, 18, 22]]), m, { decimal: '.' });
  ok(codes(r.problems).includes('req.d12') && r.trees[0].state === 'error', 'one of two diameters missing: error, tree not computed'); }
{ // decimal comma setting and unreadable values
  const r = readStems(table(['tree', 'h', 'd'], [['1', '1,3', '24,5'], ['1', '5.3', '20,1'], ['1', '9,3', 'x']]), { tree: 0, h: 1, d: 2 }, { decimal: ',' });
  ok(r.trees[0].points[0].d === 24.5 && r.problems.filter(p => p.code === 'num.bad').map(p => p.row).join() === '3,4', 'decimal comma read; "5.3" and "x" reported by row, never guessed');
  ok(r.trees[0].state === 'error', 'a lost point makes the tree unusable'); }
const one = (rows, extra = {}, map = M, spec = { decimal: '.' }, trees = null) => readStems(table(H, rows), map, { ...spec, ...extra }, trees);
const has = (r, code, row, sev) => r.problems.some(p => p.code === code && (row == null || p.row === row) && (!sev || p.severity === sev));
{ const r = one([['P', '1', 1.3, 24, 24, 18, 0.3], ['P', '1', 1.3, 23, 24, 18, 0.3]]); ok(has(r, 'h.dup', 3, 'error') && r.trees[0].state === 'error', 'repeated height: error with row'); }
{ const r = one([['P', '1', -1, 24, 24, 18, 0.3], ['P', '1', 5, 20, 24, 18, 0.3]]); ok(has(r, 'h.neg', 2, 'error'), 'negative height'); }
{ const r = one([['P', '1', 1.3, 24, 24, 18, 0.3], ['P', '1', 19, 4, 24, 18, 0.3]]); ok(has(r, 'h.abovetop', 3, 'error') && r.trees[0].state === 'error', 'point above the total height'); }
{ const r = one([['P', '1', 1.3, 24, 24, 18, 18.5], ['P', '1', 5, 20, 24, 18, 18.5]]); ok(has(r, 'stump.abovetop', 2, 'error'), 'stump height not below the total height'); }
{ const r = one([['P', '1', 0.3, 30, 24, 18, 0.3], ['P', '1', 1, 33, 24, 18, 0.3], ['P', '1', 1.3, 24, 24, 18, 0.3], ['P', '1', 5.3, 25, 24, 18, 0.3]]);
  ok(!has(r, 'd.increase', 3) && has(r, 'd.increase', 5, 'warning') && r.trees[0].state === 'ok', 'increase inside the buttress zone (< 1.3 m) accepted; above it a warning, tree still usable');
  const r2 = one([['P', '1', 0.3, 30, 24, 18, 0.3], ['P', '1', 1, 33, 24, 18, 0.3], ['P', '1', 1.3, 24, 24, 18, 0.3]], { buttressH: 0.2 });
  ok(has(r2, 'd.increase', 3), 'buttress zone is a setting'); }
{ const r = one([['P', '1', 1.3, 30, 24, 18, 0.3], ['P', '1', 5, 20, 24, 18, 0.3]]); ok(has(r, 'dbh.mismatch', 2, 'warning'), 'diameter at 1.3 m differs from dbh by more than 10 %');
  ok(!has(one([['P', '1', 1.3, 26, 24, 18, 0.3], ['P', '1', 5, 20, 24, 18, 0.3]]), 'dbh.mismatch'), 'within the tolerance');
  ok(has(one([['P', '1', 1.3, 26, 24, 18, 0.3], ['P', '1', 5, 20, 24, 18, 0.3]], { dbhTol: 0.05 }), 'dbh.mismatch'), 'tolerance is a setting'); }
{ const r = one([['P', '1', 1.3, 24, 24, 18, 0.3]]); ok(has(r, 'tree.single', 2, 'error') && r.trees[0].state === 'error', 'single measurement point: not computed'); }
{ const r = one([['P', '1', 1.3, 24, 24, 18, 0.3], ['P', '1', 5, 20, 25, 18, 0.3]]); ok(has(r, 'tree.conflict', 3, 'error'), 'dbh differing between rows of one tree'); }
{ const r = one([['P', '', 1.3, 24, 24, 18, 0.3]]); ok(has(r, 'req.tree', 2, 'error'), 'missing tree id'); }
{ const r = one([['P', '1', '', 24, 24, 18, 0.3], ['P', '1', 5, 20, 24, 18, 0.3]]); ok(has(r, 'req.h', 2), 'missing height'); }
{ const r = one([['P', '1', 1.3, 0, 24, 18, 0.3], ['P', '1', 5, 20, 24, 18, 0.3]]); ok(has(r, 'd.nonpos', 2), 'zero diameter'); }
{ const t = table(['tree', 'h', 'd', 'bt'], [['1', 1.3, 2, 30], ['1', 5, 1.5, 5]]); const r = readStems(t, { tree: 0, h: 1, d: 2, bark_t: 3 }, { decimal: '.' }); ok(has(r, 'bark.thick', 2), 'bark thicker than the diameter'); }
{ const t = table(['tree', 'h', 'd', 'bk'], [['1', 1.3, 24, 'ob'], ['1', 5, 20, 'ib'], ['1', 7, 18, 'xx']]); const r = readStems(t, { tree: 0, h: 1, d: 2, bark: 3 }, { decimal: '.' });
  ok(has(r, 'bark.bad', 4) && has(r, 'bark.mixed', 2, 'warning'), 'bad bark code; mixed over/under bark inside one tree warned');
  ok(r.trees[0].points[1].d === null && r.trees[0].points[1].d_ib === 20, 'under-bark point keeps d_ib only (never mixed into d)'); }
{ ok(readStems(table(['a'], [['1']]), { tree: 0 }, { decimal: '.' }).problems[0].code === 'map.need', 'tree, height and diameter columns are required'); }
{ // tree attributes from a tree list (forest-dataset/1 trees), attached BEFORE the checks
  const t = table(['plot', 'tree', 'h', 'd'], [['P', '1', 1.3, 24], ['P', '1', 19, 3], ['P', '2', 1.3, 30], ['P', '2', 5, 25]]), map = { plot: 0, tree: 1, h: 2, d: 3 };
  const r = readStems(t, map, { decimal: '.' }, [{ plot_id: 'P', tree_id: '1', period: null, dbh: 24, height: 18 }]);
  ok(r.trees[0].height === 18 && has(r, 'h.abovetop', 3) && has(r, 'tree.nomatch', 4, 'warning'), 'height from the tree list used by the checks; tree without a record warned');
  const r2 = readStems(table(['plot', 'tree', 'h', 'd', 'H'], [['P', '1', 1.3, 24, 20], ['P', '1', 5, 20, 20]]), { ...map, height: 4 }, { decimal: '.' }, [{ plot_id: 'P', tree_id: '1', height: 18 }]);
  ok(has(r2, 'tree.conflict') && r2.trees[0].state === 'error', 'stem table and tree list disagree: error, never merged'); }
{ const t = table(['plot', 'tree', 'per', 'h', 'd'], [['P', '1', '2019', 1.3, 24], ['P', '1', '2019', 5, 20], ['P', '1', '2024', 1.3, 26], ['P', '1', '2024', 5, 22]]);
  const r = readStems(t, { plot: 0, tree: 1, period: 2, h: 3, d: 4 }, { decimal: '.' });
  ok(r.trees.length === 2 && r.trees.every(T => T.points.length === 2), 'same tree in two periods: two records (never merged)');
  ok(keyOf('P', '01', null) !== keyOf('P', '1', null), 'ids are text: "01" ≠ "1"'); }

/* 6. root scanner moved to core/roots.js: same results as the distribution engine's wrapper */
for (const f of [c => (c - 0.2) * (c - 2.5), c => Math.sin(c) , c => c - 1e3, c => (c - 1) ** 2 - 1e-6]) {
  const a = scanRoots(f, 0.05, 200, 600), b = distScan(f);
  ok(JSON.stringify(a) === JSON.stringify(b), 'core scanRoots = dist wrapper: ' + f);
}
{ const s = scanRoots(h => 30 * (1 - h / 20) - 7, 0, 20, 200, { grid: 'linear' }); ok(s.roots.length === 1 && Math.abs(s.roots[0] - 20 * (1 - 7 / 30)) < 1e-12, 'linear grid from 0 (for heights)'); }

console.log(`core T01: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
