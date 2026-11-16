// Project and inventory data manager (DI-03): assets/lab/core/projects.js.
//   node tests/projects/test_di03.mjs
// No scientific computation: counts along the plot → period → tree hierarchy (expected values counted by hand on the
// sample data package assets/lab/stand/ornek/ornek-veri.json and on small hand-made packages), import plans, and the
// storage rules (Node has no IndexedDB: core/store.js falls back to memory, same keys).
import { readFile } from 'node:fs/promises';
import * as P from '../../assets/lab/core/projects.js';
import { get, put } from '../../assets/lab/core/store.js';
import { sha256JSON } from '../../assets/lab/core/record.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const sample = JSON.parse(await readFile(new URL('../../assets/lab/stand/ornek/ornek-veri.json', import.meta.url), 'utf8'));

// hand-made package: 3 plots (one empty), periods 2019 and 2024 and one record without period, 2 stems of one tree
const ds = { schema: 'forest-dataset/1', created: '2026-11-16T10:00:00Z', source: { trees: { name: 'Bolu-2024.csv' } },
  plots: [{ plot_id: '10', plot_area: 400, stratum: 'A' }, { plot_id: '2', plot_area: 400, stratum: 'B' }, { plot_id: '3', plot_area: 600, stratum: null }],
  trees: [
    { row: 2, plot_id: '2', tree_id: '1', stem_id: null, period: '2019', species: 'Abies', dbh: 20, height: 15 },
    { row: 3, plot_id: '2', tree_id: '1', stem_id: null, period: '2024', species: 'Abies', dbh: 23, height: 17, height_source: 'estimated' },
    { row: 4, plot_id: '10', tree_id: '7', stem_id: 'a', period: '2024', species: 'Fagus', dbh: 31.5, height: null, x: 1, y: 2 },
    { row: 5, plot_id: '10', tree_id: '7', stem_id: 'b', period: '2024', species: 'Fagus', dbh: 12, height: null, age: 60 },
    { row: 6, plot_id: '10', tree_id: '8', stem_id: null, period: null, species: '', dbh: 8, height: 7 } ],
  warnings: [{ code: 'x', accepted: 'ok' }, { code: 'y', accepted: null }], excluded: [9, 11], changelog: [{ seq: 1 }] };
ok(P.datasetProblems(ds).length === 0 && P.datasetProblems(sample).length === 0, 'valid packages pass');
const s = P.summarize(ds);
ok(s.plots === 3 && s.emptyPlots === 1 && s.records === 5 && s.trees === 4, `plots 3 (1 empty), 5 records, 4 distinct plot+tree+stem: ${s.plots} ${s.emptyPlots} ${s.records} ${s.trees}`);
ok(JSON.stringify(s.periods) === JSON.stringify([null, '2019', '2024']), 'periods sorted, missing period kept as null: ' + JSON.stringify(s.periods));
ok(s.species.map(x => x.species + x.n).join() === 'Abies2,Fagus2,1', 'species by count, ties by name, blank species kept');
ok(s.dbh.min === 8 && s.dbh.max === 31.5 && s.heights.measured === 2 && s.heights.estimated === 1 && s.ages === 1 && s.xy === 1, 'dbh range, measured / estimated heights, ages, coordinates');
ok(s.area.min === 400 && s.area.max === 600 && s.area.total === 1400 && s.strata.join() === 'A,B', 'plot areas and strata');
ok(s.warnings === 2 && s.open === 1 && s.excluded === 2 && s.changes === 1, 'warnings (1 open), excluded rows, change log');
ok(s.byPlot.map(b => b.plot_id).join() === '2,3,10' && s.byPlot[0].n['2019'] === 1 && s.byPlot[0].n['2024'] === 1 && s.byPlot[2].n[''] === 1 && s.byPlot[2].n['2024'] === 2 && !Object.keys(s.byPlot[1].n).length, 'records per plot and period, natural plot order');
const ss = P.summarize(sample);
ok(ss.plots === sample.plots.length && ss.records === sample.trees.length && ss.byPlot.reduce((a, b) => a + Object.values(b.n).reduce((x, y) => x + y, 0), 0) === sample.trees.length, 'sample package: every record counted once');

// problems
ok(P.datasetProblems({ schema: 'forest-dataset/1', plots: [{ plot_id: '1', plot_area: 0 }, { plot_id: '1', plot_area: 400 }], trees: [{ plot_id: '9', dbh: -1 }] }).sort().join() === 'ds.dbh,ds.plotarea,ds.plotdup,ds.treeplot', 'package problems: duplicate plot, area, unknown plot, dbh');
ok(P.datasetProblems({ schema: 'forest-dataset/2', plots: [], trees: [] }).includes('ds.schema') && P.datasetProblems([]).join() === 'ds.notobject', 'other schema and non-objects rejected');
ok(P.metaProblems({ name: ' ' }).includes('name.missing') && P.metaProblems({ name: 'a', year: '24' }).includes('year.bad') && P.metaProblems({ name: 'a', year: '2024' }).length === 0 && P.metaProblems({ name: 'a', year: '' }).length === 0, 'details: name required, year four digits or empty');
ok(P.cleanMeta({ name: ' Bolu ', year: ' 2024 ' }).year === 2024 && P.cleanMeta({ name: 'x', year: '' }).year === null, 'details cleaned');
ok(P.defaultName(ds) === 'Bolu-2024' && P.defaultName({}, 'en') === 'data package', 'default name from the tree file');

// projects and import plans
const p1 = await P.makeProject(ds, { name: 'Bolu', year: '2024', location: 'Aladağ' }, 'checker', '2026-11-16T11:00:00Z');
ok(p1.schema === 'forest-project/1' && p1.sha256 === await sha256JSON(ds) && p1.year === 2024 && p1.dataset === ds && p1.added === p1.modified, 'project: details, fingerprint of the package, package kept whole');
const cp = P.copyProject(p1, 'kopya'); ok(cp.id !== p1.id && cp.name === 'Bolu (kopya)' && cp.sha256 === p1.sha256 && cp.origin === 'copy', 'copy: new id, same package');
let pl = await P.planImport([p1], sample);
ok(pl.ok && pl.items.length === 1 && pl.items[0].action === 'add' && pl.items[0].project.origin === 'import' && pl.items[0].name === P.defaultName(sample), 'a data package imports as a new project');
pl = await P.planImport([p1], JSON.parse(JSON.stringify(ds, null, 2)));
ok(pl.items[0].action === 'same' && pl.items[0].other === 'Bolu', 'the same package (any formatting) is recognised, not doubled');
const lib = P.backup([p1, { ...p1, id: 'x', name: '', dataset: sample }, { ...p1, id: 'y', name: 'bozuk', dataset: { schema: 'forest-dataset/1', plots: [], trees: [{ plot_id: 'q', dbh: 3 }] } }]);
pl = await P.planImport([], JSON.parse(JSON.stringify(lib)));
ok(lib.schema === 'forest-project-library/1' && pl.items.map(i => i.action).join() === 'add,add,reject' && pl.items[1].name === P.defaultName(sample) && pl.items[2].reason.includes('ds.treeplot'), 'backup: valid projects added (missing name → default), broken package rejected with its reason');
ok(pl.items[0].project.name === 'Bolu' && pl.items[0].project.location === 'Aladağ' && pl.items[0].project.added === p1.added, 'backup keeps the details and the date added');
pl = await P.planImport([], { schema: 'forest-project-library/1', projects: [p1, { ...p1, id: 'z' }] });
ok(pl.items.map(i => i.action).join() === 'add,same', 'two copies of one package in a backup: the second is the same');
ok(!(await P.planImport([], { schema: 'model-coef-library/1' })).ok && !(await P.planImport([], null)).ok, 'other files are not imported');

// storage: register, adopt, activate, delete
await put('dataset:approved', sample);
const adopted = await P.adoptApproved('tr');
ok(adopted && adopted.origin === 'legacy' && await P.activeId() === adopted.id, 'package approved before DI-03 adopted once and made active');
ok((await P.adoptApproved('tr')).id === adopted.id && (await P.listProjects()).length === 1, 'adopting again adds nothing');
const reg = await P.registerApproved(ds, 'tr');
ok(reg.origin === 'checker' && reg.name === 'Bolu-2024' && await P.activeId() === reg.id && (await get('dataset:approved')) === ds, 'a new approval: added and active, the tools read it');
ok((await P.registerApproved(JSON.parse(JSON.stringify(ds)), 'tr')).id === reg.id && (await P.listProjects()).length === 2, 'approving the same package again does not double it');
ok(await P.setActive(adopted.id) && (await get('dataset:approved')) === sample && await P.activeId() === adopted.id, 'activating another project hands its package to the tools');
ok(!(await P.setActive('nope')), 'unknown project cannot be activated');
ok(!(await P.deleteProject(reg.id)) && (await get('dataset:approved')) === sample, 'deleting an inactive project leaves the active package');
ok(await P.deleteProject(adopted.id) && (await get('dataset:approved')) == null && (await P.activeId()) == null && (await P.listProjects()).length === 0, 'deleting the active project: no package is active');

console.log(`DI-03 projects: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
