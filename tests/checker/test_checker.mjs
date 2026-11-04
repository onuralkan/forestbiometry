// Acceptance tests for the Forest Data Checker (Module 1). Run: node tests/checker/test_checker.mjs
// Expected values are written by hand from the fixtures below (independent of the implementation).
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseNumber, detectDecimal, toInternal } from '../../assets/lab/core/num.js';
import { tableFromText, tableFromSheet, detectDelimiter, decodeBytes, parseDelimited } from '../../assets/lab/core/table.js';
import { csvText } from '../../assets/lab/core/export.js';
import * as C from '../../assets/lab/checker/calc.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('FAIL', msg); } };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
const near = (a, b, msg, tol = 1e-12) => ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${msg}: got ${a} expected ${b}`);

const S = (limits = C.DEFAULT_LIMITS) => ({ decimal: ',', units: { ...C.DEFAULT_UNITS }, limits: { ...limits } });
function run(treesText, plotsText, settings, delim = ';') {
  const sources = { trees: tableFromText(treesText, { delim, name: 't.csv' }) };
  if (plotsText) sources.plots = tableFromText(plotsText, { delim, name: 'p.csv' });
  const mapping = { trees: C.suggestMapping(sources.trees.headers, C.TREE_FIELDS).map, plots: sources.plots ? C.suggestMapping(sources.plots.headers, C.PLOT_FIELDS).map : {} };
  const work = C.buildWork(sources, mapping);
  return { sources, mapping, work, settings, ev: () => C.evaluate(sources, work, settings) };
}
const codes = (ev, code) => ev.issues.filter(i => i.code === code);

/* 1. numbers: no silent guessing */
eq(parseNumber('24,5', ','), { status: 'ok', value: 24.5 }, 'comma decimal');
eq(parseNumber('24.5', ',').status, 'bad', 'dot rejected under comma setting');
eq(parseNumber('1,234', '.').reason, 'other-separator', '"1,234" under dot setting is reported');
eq(parseNumber('1 234', ',').reason, 'space', 'grouped with space reported');
eq(parseNumber('1.234,5', ',').status, 'bad', 'thousands grouping not accepted');
eq(parseNumber('', ',').status, 'empty', 'empty is missing, not 0');
eq(parseNumber('12', null).reason, 'no-decimal-setting', 'no setting → no parse');
eq(detectDecimal(['1,234', '2,500', '12,750']).verdict, 'ambiguous', 'only d,ddd values → ambiguous');
eq(detectDecimal(['1,234', '24,5']).verdict, 'comma', 'one unambiguous comma value decides');
eq(detectDecimal(['1.5', '2,5']).verdict, 'conflict', 'mixed separators → conflict');
eq(detectDecimal(['12', '30']).verdict, 'none', 'integers → none');
near(toInternal('dbh', 'mm', 245), 24.5, 'mm→cm');
near(toInternal('area', 'ha', 0.04), 400, 'ha→m²');

/* 2. ambiguous-decimal file: evidence is ambiguous; result depends only on the user's choice */
{
  const t = 'plot;tree;species;dbh;height;area\nA;1;Pb;1,250;12;400\nA;2;Pb;2,500;14;400\n';
  const r = run(t, null, S());
  eq(C.decimalEvidence(r.sources, r.mapping).verdict, 'ambiguous', 'ambiguous file detected');
  r.settings.decimal = ','; let ev = r.ev();
  near(ev.vals.trees[0].dbh.value, 1.25, 'comma choice → 1.25 cm');
  eq(codes(ev, 'dbh.range').length, 0, '1.25 cm is inside default 1–200');
  r.settings.decimal = '.'; ev = r.ev();
  eq(ev.vals.trees[0].dbh.status, 'bad', 'dot choice → "1,250" is a format error, not 1250');
  eq(codes(ev, 'num.bad').length, 2, 'both values reported under dot choice');
  ok(!ev.summary.approvable, 'not approvable with format errors');
}

/* 3. leading-zero IDs stay distinct text; 4. same tree two periods is not a duplicate */
const treesTxt = readFileSync(path.join(root, 'assets/lab/checker/ornek/agaclar.csv'), 'utf8');
const plotsTxt = readFileSync(path.join(root, 'assets/lab/checker/ornek/ornek-alanlar.csv'), 'utf8');
{
  eq(detectDelimiter(treesTxt).delim, ';', 'sample delimiter detected');
  const r = run(treesTxt, plotsTxt, S());
  eq(r.mapping.trees, { plot_id: 0, tree_id: 1, species: 2, dbh: 3, height: 4, period: 5, plot_area: 6 }, 'suggested tree mapping');
  eq(C.suggestMapping(r.sources.trees.headers, C.TREE_FIELDS).units, { dbh: 'cm', height: 'm', area: 'm2' }, 'units read from header suffixes');
  eq(C.decimalEvidence(r.sources, r.mapping).verdict, 'comma', 'sample decimal = comma');
  const ev = r.ev();
  const ids = ev.plots.map(p => p.plot_id);
  ok(ids.includes('001') && ids.includes('1'), '"001" and "1" are both kept');
  eq(ev.plots.find(p => p.plot_id === '1').n_records, 2, 'plot "1" has its own 2 records');
  eq(ev.plots.find(p => p.plot_id === '001').n_records, 7, 'plot "001" has 7 records');
  const dups = codes(ev, 'key.dup');
  eq(dups.map(d => d.row).sort((a, b) => a - b), [11, 12], 'only 002/3/2019 is a duplicate (rows 11,12)');
  ok(!dups.some(d => d.params.key[0] === '001'), 'tree 001/1 in 2019 and 2024 is not a duplicate');
  // 5. conflicting areas
  const ac = codes(ev, 'area.conflict');
  eq(ac.length, 1, 'one area conflict');
  eq(ac[0].plot, '003', 'conflict in plot 003');
  eq(ac[0].params.values.map(v => v.value), [800, 600], 'values 800 and 600');
  eq(ac[0].params.values[1].rows, [{ table: 'trees', row: 16 }], '600 comes from tree row 16');
  // 6. empty plot
  eq(codes(ev, 'plot.empty').map(i => i.plot), ['004'], 'plot 004 reported as empty (info)');
  eq(codes(ev, 'plot.empty')[0].severity, 'info', 'empty plot is info, not error');
  eq(ev.plots.find(p => p.plot_id === '004').plot_area, 400, 'empty plot keeps its area');
  // other planted issues
  eq(codes(ev, 'num.bad').map(i => [i.row, i.field]), [[13, 'dbh']], '"27,x" format error');
  eq(codes(ev, 'dbh.range').map(i => i.row), [17], '245 cm outside screening range');
  eq(codes(ev, 'dbh.range')[0].category, 'biological', 'range = biological');
  eq(codes(ev, 'num.bad')[0].kind, 'hard', 'format = hard error');
  eq(codes(ev, 'dbh.range')[0].kind, 'suspect', 'range = suspect');
  ok(codes(ev, 'sl.range').some(i => i.row === 11), 'h=2.1 m, d=36 cm → slenderness 5.8 flagged');
  eq(codes(ev, 'sp.variant').map(i => [i.row, i.suggestion.value]), [[8, 'Pb']], '"pb " → suggest "Pb"');
  eq(ev.summary.errors, 1 + 2 + 1, 'errors: format + 2 duplicate rows + area conflict');
  ok(!ev.summary.approvable, 'sample not approvable before fixes');
  eq(ev.summary.periods, 2, 'two periods');

  // fixes: every change logged with old/new/reason; nothing deleted automatically
  ok((() => { try { C.editField(r.sources, r.work, 'trees', 11, 'dbh', '27,4', ''); return false; } catch (e) { return e.message === 'reason-required'; } })(), 'reason required');
  const e1 = C.editField(r.sources, r.work, 'trees', 11, 'dbh', '27,4', 'Saha föyü kontrol edildi');
  eq([e1.old, e1.new, e1.row, e1.field, e1.column], ['27,x', '27,4', 13, 'dbh', 'cap_cm'], 'edit logged with old/new');
  C.setExcluded(r.work, 'trees', 9, true, 'Boy 2,1 yazım hatası; 12. satır doğru kayıt');
  let ev2 = C.evaluate(r.sources, r.work, r.settings);
  eq(codes(ev2, 'key.dup').length, 0, 'excluding one record resolves the duplicate');
  eq(r.work.trees.length, 18, 'excluded record is kept in the work table');
  C.applyChoice(r.sources, r.work, codes(ev2, 'area.conflict')[0], 800, 'Alan tablosuyla uyumlu', r.settings);
  ev2 = C.evaluate(r.sources, r.work, r.settings);
  eq(codes(ev2, 'area.conflict').length, 0, 'area conflict resolved');
  eq(r.work.changelog.at(-1).old + '→' + r.work.changelog.at(-1).new, '600→800', 'choice written in source units');
  eq(ev2.summary.errors, 0, 'no errors left');
  ok(ev2.summary.approvable, 'approvable with open warnings');
  const w = codes(ev2, 'dbh.range')[0];
  C.acceptIssue(r.work, w, '245 cm: kontrol edildi, anıt ağaç');
  ev2 = C.evaluate(r.sources, r.work, r.settings);
  ok(codes(ev2, 'dbh.range')[0].accepted, 'warning marked accepted');
  const ds = C.approve(r.sources, r.work, r.mapping, r.settings, ev2);
  eq(ds.schema, 'forest-dataset/1', 'schema id');
  eq(ds.trees.length, 17, '17 approved records (1 excluded)');
  eq(ds.excluded, [11], 'excluded source row listed');
  eq(ds.trees.find(t => t.row === 13).dbh, 27.4, 'edited value used');
  eq(ds.trees.find(t => t.row === 2).plot_id, '001', 'ID kept as text "001"');
  eq(ds.trees.find(t => t.row === 7).height, null, 'missing height is null, not 0');
  near(ds.derived.trees.find(t => t.row === 2).basal_area_m2, Math.PI / 4 * 0.245 ** 2, 'basal area');
  near(ds.derived.plots.find(p => p.plot_id === '003').expansion_factor, 12.5, 'expansion factor 10000/800');
  eq(ds.plots.find(p => p.plot_id === '004').n_records, 0, 'empty plot carried into dataset');
  eq(ds.changelog.length, 4, 'changelog: edit, exclude, choice, accept');
  ok(!('basal_area_m2' in ds.trees[0]), 'derived values kept apart from measured data');
}

/* 7. language does not change values (UI language only formats; CSV export separators only) */
{
  const r = run(treesTxt, plotsTxt, S());
  const a = JSON.stringify(r.ev().vals);
  globalThis.document = { documentElement: { lang: 'en' } };
  const b = JSON.stringify(r.ev().vals);
  delete globalThis.document;
  eq(a, b, 'parsed values identical under TR/EN');
  const rows = [['001', 24.5, 'Pb']];
  const tr = parseDelimited(csvText(rows, 'tr'), ';')[0], en = parseDelimited(csvText(rows, 'en'), ',')[0];
  eq([tr[0], parseNumber(tr[1], ',').value], ['001', 24.5], 'TR CSV round-trip');
  eq([en[0], parseNumber(en[1], '.').value], ['001', 24.5], 'EN CSV round-trip');
}

/* 8. plots table missing an area; plot only in tree table; unit choice applied as chosen */
{
  const t = 'plot;tree;species;dbh\nP1;1;Pb;245\nP9;1;Pb;300\n';
  const p = 'plot;area\nP1;0,04\n';
  const r = run(t, p, { decimal: ',', units: { dbh: 'mm', height: 'm', area: 'ha', xy: 'm' }, limits: { ...C.DEFAULT_LIMITS } });
  const ev = r.ev();
  near(ev.vals.trees[0].dbh.value, 24.5, '245 mm chosen → 24.5 cm');
  eq(ev.plots.find(x => x.plot_id === 'P1').plot_area, 400, '0,04 ha → 400 m²');
  eq(codes(ev, 'plot.unknown').map(i => i.row), [3], 'P9 not in plot table');
  const r2 = run(t, p, S());
  eq(codes(r2.ev(), 'dbh.range').map(i => i.row), [2, 3], 'unit not auto-switched: 245 "cm" flagged, not converted');
}

/* 9. trees only, no plot table, area column; whitespace in ids; plots table duplicate */
{
  const t = 'plot,tree,species,dbh,area\n 7,1,Pb,20,400\n7,1,Pb,21,400\n';
  const r = run(t, null, { ...S(), decimal: '.' }, ',');
  const ev = r.ev();
  eq(codes(ev, 'text.space').map(i => i.suggestion.value), ['7'], 'leading space in ID flagged with trim suggestion');
  eq(codes(ev, 'key.dup').length, 0, '" 7" and "7" are not merged automatically');
  eq(ev.plots.length, 2, 'two different plots until the user trims');
  const p = run('plot;tree;species;dbh\nA;1;Pb;20\n', 'plot;area\nA;400\nA;500\n', S());
  eq(codes(p.ev(), 'plot.dup').length, 2, 'duplicate plot_id in plot table');
  eq(codes(p.ev(), 'area.conflict').length, 1, 'and its areas conflict');
  eq(C.mappingProblems({ trees: p.sources.trees }, { trees: { plot_id: 0, tree_id: 1, species: 2, dbh: 3 } }).map(x => x.code), ['map.noarea'], 'no area source → mapping problem');
}

/* 10. XLSX: numbers stay numbers, IDs as shown text, dates as ISO, formulas never evaluated */
{
  const require = createRequire(import.meta.url);
  const XLSX = require(path.join(root, 'assets/vendor/sheetjs/xlsx.mini.min.js'));
  const ws = XLSX.utils.aoa_to_sheet([['plot', 'tree', 'species', 'dbh', 'date', 'area'], ['001', 1, 'Pb', 24.5, null, 400], ['1', 2, 'Pb', 30, null, 400]]);
  ws.E2 = { t: 'n', v: 45474, z: 'yyyy-mm-dd' };                 // 2024-07-01
  ws.E3 = { t: 'n', v: 45474, z: 'dd.mm.yyyy' };
  ws.F3 = { t: 'n', v: 400, f: 'F2*1' };                           // formula with cached value
  ws.B3 = { t: 'n', v: 2, z: '000' };                              // number shown as "002"
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'T');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const rd = XLSX.read(buf, { type: 'array', cellFormula: false, cellHTML: false, bookVBA: false, cellNF: true, cellText: true, cellDates: false });
  const tb = tableFromSheet(XLSX, rd.Sheets.T, { name: 'x.xlsx', sheet: 'T' });
  ok(!Object.values(rd.Sheets.T).some(c => c && c.f), 'formulas not read');
  eq(tb.rowNumbers, [2, 3], 'sheet row numbers');
  const m = C.suggestMapping(tb.headers, C.TREE_FIELDS).map;
  const src = { trees: tb }, work = C.buildWork(src, { trees: m, plots: {} });
  const ev = C.evaluate(src, work, { ...S(), decimal: null });
  eq([ev.vals.trees[0].plot_id.value, ev.vals.trees[1].plot_id.value], ['001', '1'], 'XLSX text IDs kept');
  eq(ev.vals.trees[1].tree_id.value, '002', 'number formatted "000" → ID as displayed');
  eq([ev.vals.trees[0].period.value, ev.vals.trees[1].period.value], ['2024-07-01', '2024-07-01'], 'dates → ISO regardless of display format');
  eq(ev.vals.trees[0].dbh.value, 24.5, 'numeric cell needs no decimal setting');
  eq(ev.vals.trees[1].plot_area.value, 400, 'formula cell → cached value only');
}

/* 11. encodings */
{
  const bytes = Uint8Array.from([0x61, 0x67, 0x61, 0xe7, 0x3b, 0xfd]);   // "agaç;ı" in windows-1254
  eq(decodeBytes(bytes, 'windows-1254'), 'agaç;ı', 'windows-1254 decoded');
  eq(decodeBytes(Uint8Array.from([0xef, 0xbb, 0xbf, 0x41])), 'A', 'BOM stripped');
}

console.log(`checker: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
