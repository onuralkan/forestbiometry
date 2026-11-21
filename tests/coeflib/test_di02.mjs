// Coefficient and equation library (DI-02): assets/lab/coeflib/calc.js.
//   node tests/coeflib/test_di02.mjs
// No scientific computation here: the checks are on bookkeeping (filters, duplicates, copies, backup and restore plans)
// with hand-made sets of every registered form; coefficient values are arbitrary test numbers.
import * as L from '../../assets/lab/coeflib/calc.js';
import { blankSet, formsFor, validateCoef, importLibrary } from '../../assets/lab/core/coef.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

const mk = (formId, extra = {}) => {
  const s = blankSet(formId);
  for (const [i, q] of formsFor(s.tool).find(f => f.id === formId).params.entries()) s.params[q.key] = 0.1 + i / 7;
  return { ...s, source: { citation: 'test values only' }, created: '2026-11-01T00:00:00Z', modified: '2026-11-02T00:00:00Z', ...extra };
};
// one set of every registered form of the three tools
const all = L.TOOLS.flatMap(t => formsFor(t.tool).map(f => mk(f.id, { species: t.tool === 'taper' ? 'Pinus brutia' : 'Abies', region: t.tool === 'growth' ? 'Isparta' : 'Bolu' })));
// mixed-model forms exist only once a set is fitted or restored (registered from the set's own formula)
ok(L.TOOLS.every(t => t.tool === 'mixed' || t.tool === 'eqsys' || formsFor(t.tool).length > 0) && all.length === L.TOOLS.reduce((n, t) => n + formsFor(t.tool).length, 0), `forms of every library tool registered (${all.length} forms: ${L.TOOLS.map(t => t.tool + ' ' + formsFor(t.tool).length).join(', ')})`);
// taper sets need a bark side in the tool's own check; mb76 needs join points inside (0, 1)
for (const s of all) if (s.tool === 'taper') { s.output.bark = 'ib'; s.meta = { bark: 'ib' }; if (s.form === 'taper.mb76') Object.assign(s.params, { a1: 0.7, a2: 0.1 }); }
ok(all.every(s => L.problemsOf(s).length === 0), 'every hand-made set passes the schema check: ' + JSON.stringify(all.map(s => [s.form, L.problemsOf(s)]).filter(x => x[1].length)));

// problems: schema, unknown tool, the tool's own fields through the callback
const bad = { ...all[0], source: { citation: '' } };
ok(L.problemsOf(bad).some(q => q.code === 'source.missing'), 'missing citation reported');
const extraCheck = (tool, s) => tool === 'siteindex' && !(s.meta && s.meta.ageType) ? [{ code: 'extra.missing', what: 'ageType' }] : [];
ok(L.problemsOf(all.find(s => s.tool === 'siteindex'), extraCheck).some(q => q.code === 'extra.missing'), "a tool's own required field is checked through the callback (site-index age type, K8)");
ok(validateCoef({ ...all[0], tool: 'nope' }).length > 0, 'a set of an unknown tool is invalid');

// filters
const f1 = L.filterSets(all, { q: 'STEM taper' });
ok(f1.length === all.filter(s => s.tool === 'taper').length && f1.length > 0, 'search is case- and accent-insensitive and matches the tool name (stem taper → taper sets)');
ok(L.filterSets(all, { tool: 'growth' }).every(s => s.tool === 'growth') && L.filterSets(all, { tool: 'growth', q: 'isparta' }).length === formsFor('growth').length, 'tool filter and region search combine');
ok(['ISPARTA', 'ısparta', 'İsparta'].every(q => L.filterSets(all, { q }).length === formsFor('growth').length), 'Turkish I/ı/İ/i are the same letter in a search');
ok(L.filterSets(all, { q: 'abies bolu' }).length === formsFor('siteindex').length + formsFor('biomass').length + formsFor('bark').length + formsFor('ccf').length + formsFor('volume').length + formsFor('nls').length && L.filterSets(all, { q: 'abies istanbul' }).length === 0, 'all words must occur');
ok(L.filterSets([...all, bad], { problems: true }).length === 1 && L.filterSets(all, { origin: 'fitted' }).length === 0, 'only sets with problems; origin filter');

// duplicates and copies
const c = L.copySet(all[0], 'copy1');
ok(c.id === 'copy1' && c.copyOf === all[0].id && c.created === null && JSON.stringify(c.params) === JSON.stringify(all[0].params) && c.params !== all[0].params, 'copy: new id, same coefficients (deep copy), dates cleared, origin recorded');
const c2 = { ...L.copySet(all[1], 'copy2'), source: { citation: 'another source' }, species: 'other' };
const dg = L.duplicates([...all, c, c2]);
ok(dg.length === 2 && dg.some(g => g.includes(all[0].id) && g.includes('copy1')) && dg.some(g => g.includes(all[1].id) && g.includes('copy2')), 'same coefficients under another id and source are found as duplicates');
const c3 = { ...L.copySet(all[0], 'copy3'), params: { ...all[0].params, [Object.keys(all[0].params)[0]]: all[0].params[Object.keys(all[0].params)[0]] + 1e-12 } };
ok(L.duplicates([all[0], c3]).length === 0, 'a coefficient differing in the 12th decimal is not a duplicate (exact comparison, nothing rounded)');

// backup and restore plans
const B = L.backup(all, '2026-11-16T00:00:00Z');
ok(B.schema === 'model-coef-library/1' && B.writer.startsWith('katsayi-kutuphanesi') && importLibrary(JSON.parse(JSON.stringify(B))).sets.length === all.length, 'backup is a model-coef-library/1 file every tool page can read');
const back = JSON.parse(JSON.stringify(B));
ok(back.sets.every((s, i) => JSON.stringify(s.params) === JSON.stringify(all[i].params)), 'coefficients survive the JSON round trip exactly');
const P0 = L.planRestore([], back);
ok(P0.ok && P0.add === all.length && P0.replace === 0 && P0.reject === 0, 'restore into an empty library: everything added');
const P1 = L.planRestore(all, back);
ok(P1.same === all.length && P1.add === 0, 'restore of the same library: nothing to do (dates ignored)');
const changed = JSON.parse(JSON.stringify(B)); changed.sets[0].source.citation = 'corrected citation'; changed.sets[1].modified = '2027-01-01T00:00:00Z';
const P2 = L.planRestore(all, changed);
ok(P2.replace === 1 && P2.items[0].action === 'replace' && P2.items[1].action === 'same', 'changed source: replace; changed date only: same');
const withDup = { schema: 'model-coef-library/1', sets: [L.copySet(all[2], 'newcopy'), { ...bad, id: 'badone' }, all[3], all[3]] };
const P3 = L.planRestore(all, withDup);
ok(P3.add === 1 && P3.items[0].dupOf === all[2].id && P3.reject === 2 && P3.items[1].problems.some(q => q.code === 'source.missing') && P3.items[3].problems[0].code === 'id.repeated', 'restore: duplicate content flagged, invalid and repeated ids rejected (never dropped silently)');
ok(L.planRestore(all, { schema: 'x' }).ok === false && L.planRestore(all, all[0]).items.length === 1, 'wrong file refused; a single set is read as a library of one');

// listing rows at full precision
const rows = L.tableRows([all[0], bad]);
ok(rows.length === 3 && JSON.parse(rows[1][3])[Object.keys(all[0].params)[1]] === all[0].params[Object.keys(all[0].params)[1]] && rows[2][14].includes('source.missing'), 'listing rows: coefficients at full precision, problems by code');

console.log(`coefficient library DI-02: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
