// Builds assets/lab/stand/ornek/ornek-veri.json: the checker's synthetic sample files, fixed and
// approved with the checker's own logic (same fixes as tests/checker). Synthetic data, not measurements.
// Run: node scripts/make-stand-sample.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { tableFromText } from '../assets/lab/core/table.js';
import * as C from '../assets/lab/checker/calc.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rd = f => readFileSync(path.join(root, 'assets/lab/checker/ornek', f), 'utf8');
const sources = { trees: tableFromText(rd('agaclar.csv'), { delim: ';', name: 'agaclar.csv (örnek / sample)' }), plots: tableFromText(rd('ornek-alanlar.csv'), { delim: ';', name: 'ornek-alanlar.csv (örnek / sample)' }) };
const mapping = { trees: C.suggestMapping(sources.trees.headers, C.TREE_FIELDS).map, plots: C.suggestMapping(sources.plots.headers, C.PLOT_FIELDS).map };
const settings = { decimal: ',', units: { ...C.DEFAULT_UNITS }, limits: { ...C.DEFAULT_LIMITS } };
const work = C.buildWork(sources, mapping);
C.editField(sources, work, 'trees', 11, 'dbh', '27,4', 'Örnek düzeltme / sample fix');
C.setExcluded(work, 'trees', 9, true, 'Mükerrer kayıt / duplicate record');
let ev = C.evaluate(sources, work, settings);
C.applyChoice(sources, work, ev.issues.find(i => i.code === 'area.conflict'), 800, 'Alan tablosuyla uyumlu / matches plot table', settings);
ev = C.evaluate(sources, work, settings);
for (const i of ev.issues.filter(i => i.suggestion)) C.editField(sources, work, i.table, i.rec, i.field, i.suggestion.value, 'Tür kodu birleştirildi / species code unified', i.code);
ev = C.evaluate(sources, work, settings);
for (const i of ev.issues.filter(i => i.severity === 'warning')) C.acceptIssue(work, i, 'Örnek veri / sample data');
ev = C.evaluate(sources, work, settings);
const ds = C.approve(sources, work, mapping, settings, ev, { note: 'SYNTHETIC SAMPLE, NOT REAL DATA / UYDURMA ÖRNEK, GERÇEK VERİ DEĞİL' });
ds.created = '2026-11-05T00:00:00.000Z';
ds.changelog.forEach(e => { e.time = ds.created; });
writeFileSync(path.join(root, 'assets/lab/stand/ornek/ornek-veri.json'), JSON.stringify(ds, null, 1) + '\n');
console.log(`ornek-veri.json: ${ds.trees.length} trees, ${ds.plots.length} plots`);
