// Report generator (DI-05): assets/lab/report/calc.js and render.js.
//   node tests/report/test_di05.mjs
// No new science: the report copies values from the package (counts by hand below), from the dashboard engine
// (tested in tests/dashboard/test_di04.mjs) and from run records (values put in here by hand). Checks: number and
// cell text, table columns, record sections of several tools, sources, citations (core/citation.js), escaping of
// user text, sections on and off, the default English title, the standalone file.
import { readFile } from 'node:fs/promises';
import * as R from '../../assets/lab/report/calc.js';
import { renderReport, standalone, para } from '../../assets/lab/report/render.js';
import { seal, sha256JSON } from '../../assets/lab/core/record.js';
import { cite } from '../../assets/lab/core/citation.js';
import * as D from '../../assets/lab/dist/index.js';
import { blankFilter } from '../../assets/lab/dashboard/calc.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

// numbers and cells
ok(R.num(0.1234567) === '0.123457' && R.num(12345.678) === '12345.7' && R.num(3) === '3' && R.num(1.5e-7) === '1.5000e-7' && R.num(NaN) === 'NaN' && R.num(null) === '', 'numbers: 6 significant digits, decimal point, exponent only for extremes');
ok(R.cell(null) === '–' && R.cell([1.5, 2]) === '1.5; 2' && R.cell(true) === '✓' && R.cell({ a: 1 }) === '{"a":1}' && R.cell('\u0000pool') === '*', 'cells: missing, arrays, booleans, objects, the pooled unit');
// columns
const rows = [{ id: 'a', p: { x: 1, y: { z: 2 } }, v: [1, 2], o: [{ q: 1 }] }, { id: 'b', p: { w: 3 } }];
ok(R.columns(rows, ['*']).join() === 'id,p.x,v,p.w' && R.columns(rows, ['p.*']).join() === 'p.x,p.w' && R.columns(rows, ['id', 'nope']).join() === 'id', 'columns: *, a.*, missing paths dropped');
const tb = R.table('t', Array.from({ length: 70 }, (_, i) => ({ i, v: i / 3 })), ['i', 'v'], { maxRows: 60 });
ok(tb.total === 70 && tb.shown === 60 && tb.rows[3].join() === '3,1', 'table: rows capped, values as text');

// package
const sample = JSON.parse(await readFile(new URL('../../assets/lab/stand/ornek/ornek-veri.json', import.meta.url), 'utf8'));
const project = { name: 'Bolu <test>', year: 2024, location: 'Aladağ', description: '', sha256: await sha256JSON(sample), dataset: sample };
// records
const d24 = sample.trees.filter(t => t.period === '2024').map(t => t.dbh);
const wr = D.runMethod('weibull.ml', { d: d24, plot: D.POOL, period: '2024' });
const distRec = await seal({ format: 'run-record/1', tool: { id: 'cap-dagilimi', version: '2.2.0', ids: ['SS-03'], page: 'diameter-distribution.php' }, build: { commit: 'a'.repeat(40), site: 'https://forestbiometry.online/' }, created: '2026-11-16T12:00:00Z', lang: 'tr',
  inputs: [{ role: 'data', kind: 'file', name: 'agaclar.csv', bytes: 100, sha256: 'ff'.repeat(32) }], settings: { unit: 'cm', mode: 'fit' },
  results: [wr], sources: { methods: {}, references: { R3: { cite: 'Bailey, R.L., Dell, T.R. 1973. Quantifying diameter distributions with the Weibull function.', status: 'B' } } } });
const hdRec = { format: 'run-record/1', tool: { id: 'boy-cap', version: '1.1.0', page: 'height-diameter.php' }, created: '2026-11-16T12:05:00Z', inputs: [{ role: 'dataset', kind: 'dataset', sha256: project.sha256 }],
  settings: { breastHeight: 1.3, model: 'naslund' }, data: { fitted: 12 }, fits: [{ id: 'naslund', status: 'ok', theta: [1.9, 0.2], se: [0.1, 0.01], n: 12, rmse: 1.234567, mae: 1, bias: 0.01, aic: 40 }] };
const siRec = { format: 'run-record/1', tool: { id: 'bonitet', version: '1.0.0-beta.3', page: 'site-index.php' }, created: 'x', inputs: [], set: { source: { citation: 'Kullanıcı, A. 2020. Bonitet tablosu.' } }, results: [{ unit: 'P1', A: 40, H: 18, SI: 21.5 }] };
const secs = [];
for (const [n, o] of [['dist.json', distRec], ['hd.json', hdRec], ['si.json', siRec]]) secs.push(await R.recordSection(n, o, project.sha256));
ok(await R.recordSection('x', { schema: 'forest-dataset/1' }, null) === null, 'a data package is not a record section');
ok(secs[0].seal === true && secs[0].fromPackage === null && secs[0].tables[0].cols.join() === 'data.plot,data.period,data.n,family,method,status,params.a,params.b,params.c,logLik', 'distribution record: sealed, from a file, result table with parameters');
ok(secs[0].tables[0].rows[0][0] === '*' && secs[0].tables[0].rows[0][6] === R.num(wr.params.a) && secs[0].tables[0].rows[0][7] === R.num(wr.params.b), 'pooled unit shown as *, parameters copied');
ok(secs[0].refs.length === 1 && secs[0].refs[0].status === 'B' && secs[0].settings.some(([k, v]) => k === 'mode' && v === 'fit'), 'references and settings of the record');
ok(secs[1].fromPackage === true && secs[1].seal === null && secs[1].tables[0].rows[0].join() === 'naslund,ok,1.9; 0.2,0.1; 0.01,12,1.23457,1,0.01,40' && secs[1].blocks[0].rows[0].join() === 'fitted,12', 'height record: from this package, unsealed, fit table and data block');
ok(secs[2].tables[0].cols.join() === 'unit,A,H,SI' && secs[2].coefSources[0] === 'Kullanıcı, A. 2020. Bonitet tablosu.', 'other tools: generic table, user coefficient source');

// the report
const pkg = R.packagePart(project, { ...blankFilter(), period: '2024' }, 'unmeasured', 0, [{ kind: 'dist', obj: distRec }, { kind: 'hd', obj: hdRec }]);
ok(pkg.trees === d24.length && pkg.hist.curves.length === 1 && pkg.hd.curves.length === 1, 'package part: 2024 records, one density and one height curve from the records');
const citeData = { author: { family: 'Alkan', given: 'Onur' }, year: 2026, base: 'https://forestbiometry.online/', site: { en: 'Forest Biometrics Tools' }, doi: '10.5281/zenodo.24135603' };
const tools = { 'diameter-distribution.php': { v: '2.2.0', en: 'Diameter Distribution Lab' }, 'height-diameter.php': { v: '1.1.0', en: 'Height–Diameter Modelling' }, 'site-index.php': { v: '1.0.0-beta.3', en: 'Site Index' }, 'report-generator.php': { v: '1.0.0-beta.1', en: 'Report Generator' } };
const meta = { ...R.blankMeta(), title: 'Deneme <b>raporu</b>', author: 'A. Yazar', date: '2026-11-16', intro: 'Birinci paragraf.\n\nİkinci <script>alert(1)</script>', notes: { ...R.blankMeta().notes, charts: 'Grafik notu' } };
const model = { lang: 'en', meta, sections: Object.fromEntries(R.SECTIONS.map(s => [s, true])), pkg, records: secs, cite: citeData, tools, generated: { at: '2026-11-16T21:30:00.000Z', commit: 'b'.repeat(40), version: '1.0.0-beta.1' } };
const html = renderReport(model);
ok(!html.includes('<script>') && html.includes('&lt;script&gt;') && html.includes('Deneme &lt;b&gt;raporu&lt;/b&gt;') && html.includes('Bolu &lt;test&gt;'), 'user text escaped everywhere');
ok((html.match(/<section class="r-sec"/g) || []).length === 5 && html.includes('<h2>1. Data package</h2>') && html.includes('<h2>5. Appendix: Reproducibility</h2>'), 'five numbered sections');
ok(html.includes('<p>Birinci paragraf.</p><p>İkinci') && html.includes('<div class="r-note"><p>Grafik notu</p></div>'), 'intro paragraphs and a section note');
ok((html.match(/<svg/g) || []).length === 5 && html.includes('weibull · weibull.ml'), 'five charts; density from the record named under the histogram');
ok(html.includes(cite('apa', { ...citeData, accessed: '2026-11-16', tool: null })) && html.includes(cite('apa', { ...citeData, accessed: '2026-11-16', tool: { file: 'height-diameter.php', ...tools['height-diameter.php'] } })), 'platform and tool citations as the Cite dialog writes them (APA, report date as access date)');
ok(html.includes('Bailey, R.L., Dell, T.R. 1973') && html.includes('[B] checked in the primary source') && html.includes('Kullanıcı, A. 2020. Bonitet tablosu.'), 'literature from the records with its status; user coefficient source');
ok(html.includes('b'.repeat(40)) && html.includes('a'.repeat(40)) && html.includes(project.sha256) && html.includes(distRec.integrity.value) && html.includes('ff'.repeat(32)), 'appendix: report and record commits, package fingerprint, seal, input fingerprints');
const off = renderReport({ ...model, sections: { package: true, charts: false, records: false, sources: false, repro: false } });
ok((off.match(/<section/g) || []).length === 1 && !off.includes('<svg'), 'sections can be left out');
const en = renderReport({ ...model, lang: 'en', meta: { ...meta, title: '' } });
ok(en.includes('<h1>Inventory report</h1>') && en.includes('<h2>1. Data package</h2>') && en.includes('Retrieved November 16, 2026') && en.includes('lang="en"'), 'English report: default title, headings, citation in English');
const none = renderReport({ ...model, pkg: null, records: [] });
ok(!none.includes('r-package') && none.includes('No run records were added to the report.'), 'no package, no records: said so');
const file = standalone(html, 'Deneme', 'en');
ok(file.startsWith('<!doctype html>') && file.includes('<meta charset="utf-8">') && file.includes('.ch-l0{stroke:#0072b2}') && file.includes('@page{size:A4'), 'standalone file: doctype, charset, chart colours and page size written in');
ok(para('a\nb\n\nc') === '<p>a<br>b</p><p>c</p>' && para('  ') === '', 'notes: paragraphs and line breaks');

console.log(`DI-05 report: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
