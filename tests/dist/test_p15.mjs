// Diameter distribution tool, stage P15: sources of every method, export rows of sources and bootstrap runs, version.
//   node tests/dist/test_p15.mjs
// Reference for the sources: the project documents themselves (docs/DIST_SPEC.md reference list, docs/METHODS.md):
// every citation, link and reading status shown by the tool must be found there (nothing invented).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as D from '../../assets/lab/dist/index.js';
import * as SRC from '../../assets/lab/dist/sources.js';
import * as REP from '../../assets/lab/dist/report.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SPEC = readFileSync(path.join(root, 'docs/DIST_SPEC.md'), 'utf8'), METH = readFileSync(path.join(root, 'docs/METHODS.md'), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

/* 1. every registered method has its sources and a documentation section that exists */
const ids = D.methodsFor().map(m => m.id);
for (const id of ids) {
  const s = SRC.methodSources(id);
  ok(s.refs.length > 0 && s.refs.every(k => SRC.REFS[k]), `${id}: at least one known reference`);
  ok(new RegExp(`^### ${s.section}:`, 'm').test(METH), `${id}: METHODS.md §12 ${s.section} exists`);
}
ok(SRC.methodSources('weibull.m2').refs.join() === 'R1' && SRC.methodSources('weibull.m2').section === 'P06' && SRC.methodSources('weibull.m8').section === 'P07', 'Poudel and Cao M2–M5 (P06), hybrids (P07)');
ok(SRC.methodSources('johnsonsb.parresol').refs.join() === 'R2' && SRC.methodSources('johnsonsb.parresol').section === 'P09', 'Parresol recovery: [R2], P09');
ok(SRC.methodSources('weibull.pct').refs.includes('DUBEY') && SRC.methodSources('johnsonsb.kb').refs.includes('KB91'), 'percentile pairs: Dubey (Weibull), Knoebel–Burkhart (SB 50/95)');
ok(SRC.methodSources('gamma.tml').section === 'P11' && SRC.methodSources('gamma.gml').section === 'P12', 'threshold and grouped methods documented in P11 and P12');
ok(SRC.BOOT_SOURCES.refs.join() === 'R9' && SRC.BOOT_SOURCES.section === 'P14', 'bootstrap: [R9], P14');

/* 2. nothing invented: each reference is in the project documents, with its link and reading status */
const token = { R8: 'fitdistrplus_vignette', R1: '10.5849/forsci.12-001', R2: 'SRS–31', R6: 'fitWeibull', R7: 'fitJSB', R9: 'goodness_of_fit', R10: 'eda3661', R11: 'eda3669', R12: 'eda366b', R14: 'eda366h', R15: 'eda3667', R16: 'scipy.stats.fisk',
  DUBEY: 'Technometrics* 9(1): 119–129', KB91: 'Biometrics* 47: 241–253', HF96: 'The American Statistician* 50(4): 361–365' };
for (const [k, x] of Object.entries(SRC.REFS)) {
  ok(token[k] && (SPEC.includes(token[k]) || METH.includes(token[k])), `${k}: found in the project documents (${token[k]})`);
  if (x.url) ok(SPEC.includes(x.url), `${k}: link copied from DIST_SPEC.md`);
  if (/^R\d+$/.test(k)) ok(SPEC.includes(`**[${k}]`), `${k}: in the DIST_SPEC reference list`);
}
ok(Object.entries(SRC.REFS).filter(([, x]) => x.status === 'B').map(([k]) => k).sort().join() === 'DUBEY,R1,R2', 'read ([B]) only where METHODS.md says so: Poudel and Cao, Parresol, Dubey');
ok(/Dubey, S\.D\. 1967[^\n]*\*\*\[B\]\*\*/.test(METH) && /Knoebel[^\n]*\*\*\[D\]\*\*/.test(METH) && /Hyndman[^\n]*\*\*\[D\]\*\*/.test(METH), 'statuses agree with the marks in METHODS.md');
ok(SRC.refsOf(['weibull.ml', 'weibull.m2'], ['R9']).join() === 'R1,R6,R9', 'reference list: distinct, in a fixed order');

/* 3. export rows */
const T = (k, p) => k + (p ? JSON.stringify(p) : ''), h = { T, methodName: r => 'M:' + r.method, notes: () => [], poolLabel: 'POOL' };
{ const rows = REP.sourceRows(['weibull.ml', 'weibull.ml', 'johnsonsb.parresol'], h, ['R9']);
  ok(rows[1][0] === 'weibull.ml' && rows[2][0] === 'johnsonsb.parresol' && rows[3][0] === 'bootstrap' && rows[1][5] === 'METHODS.md §12 P05' && rows[2][6] === 'R2', 'source sheet: one row per method, section and references');
  const refRows = rows.slice(rows.findIndex(r => r.length === 0) + 2);
  ok(refRows.map(r => r[0]).join() === 'R2,R6,R9' && refRows[0][1] === SRC.REFS.R2.cite && refRows[0][2] === 'src.st.B' && refRows[1][3] === SRC.REFS.R6.url, 'source sheet: reference list with citation, status and link'); }
{ const d = [12.3, 15.1, 18.2, 22.0, 25.5, 31.4, 9.4, 14.0, 27.1, 20.1, 16.6, 23.3, 19.9, 21.7, 17.5, 24.8, 13.2, 28.6, 11.9, 26.4];
  const r = D.runMethod('weibull.ml', { d }, { a: 0 }), g = D.boot.bootstrapGOF({ result: r, input: { d }, opts: { a: 0 }, B: 49, seed: 123, step: 'auto' });
  const c = D.boot.bootstrapCI({ result: r, input: { d }, opts: { a: 0 }, B: 49, seed: 9, step: 'auto', scheme: 'nonparametric' });
  const un = D.boot.bootstrapGOF({ result: D.runMethod('normal.rec', { type: 'summary', summary: { mean: 20, variance: 16 } }), input: {}, opts: {}, B: 49, seed: 1 });
  const rows = REP.bootRows([{ unit: { plot: 'A', period: 2019 }, r, kind: 'gof', result: g }, { unit: { plot: null, period: null }, r, kind: 'ci', result: c }, { unit: { plot: 'B', period: null }, r: D.runMethod('normal.rec', { type: 'summary', summary: { mean: 20, variance: 16 } }), kind: 'gof', result: un }], h);
  const head = rows[0], col = k => head.indexOf(k);
  const gr = rows.filter(x => x[6] === 'gof' && x[0] === 'A'), cr = rows.filter(x => x[6] === 'ci');
  ok(gr.length === 3 && gr.every(x => x[col('bt.seed')] === 123 && x[col('B')] === 49 && x[col('bx.done')] === g.completed), 'bootstrap sheet: seed, B and completed replicates on every row');
  ok(gr.every(x => x[col('p')] === g.stats[x[col('bx.q')]].p && x[col('T0')] === g.stats[x[col('bx.q')]].t0 && x[col('bt.ge')] === g.stats[x[col('bx.q')]].ge), 'bootstrap sheet: T0, count and p as numbers, full precision');
  ok(cr.length === Object.keys(c.intervals).length && cr.every(x => x[0] === 'POOL' && x[col('bx.scheme')] === 'nonparametric' && x[col('bt.seed')] === 9) && cr.find(x => x[col('bx.q')] === 'c')[col('bt.lo')] === c.intervals.c.lo, 'bootstrap sheet: intervals with scheme and seed');
  const ur = rows.find(x => x[0] === 'B'); ok(un.unsupported && ur[col('bt.seed')] == null && String(ur[ur.length - 1]).startsWith('bt.'), 'bootstrap sheet: unsupported run as a reason, no numbers'); }

/* 4. version */
const site = readFileSync(path.join(root, 'inc/site.php'), 'utf8');
ok(D.TOOL.version === '2.2.0-beta.1' && site.includes(`'file' => 'cap-dagilimi.php', 'v' => '2.2.0-beta.1'`), 'version 2.0.1 in the engine and in the site index');

console.log(`dist P15: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
