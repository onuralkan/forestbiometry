// Diameter distribution tool: export tables (assets/lab/dist/report.js) for Excel and CSV.
//   node tests/dist/test_export.mjs
// Checks that every number written is the engine's own value at full precision (no rounding, no locale formatting),
// that failed fits carry no parameters but a reason, that labels never change numbers, and that the CSV text
// (core/export.js) reads back to the same numbers.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as D from '../../assets/lab/dist/index.js';
import * as REP from '../../assets/lab/dist/report.js';
import { T as TR } from '../../assets/lab/dist/i18n.js';
import { csvText } from '../../assets/lab/core/export.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
const FX = JSON.parse(readFileSync(path.join(root, 'tests/weibull/fixture.json'), 'utf8')).samples;

// the same computation the interface runs: every chosen method on every unit, fit statistics for 'ok' results
const cell = v => typeof v === 'number' ? { t: 'n', v, w: String(v) } : { t: 's', v: String(v) };
const rows = [...FX.w2.map(d => ['P1', 2019, d]), ...FX.small.map(d => ['P1', 2024, d]), ...[20, 20, 20].map(d => ['P2', 2019, d]), ['P2', 2019, 'x']];
const tbl = { headers: ['plot', 'year', 'dbh'], rows: rows.map(r => r.map(cell)), rowNumbers: rows.map((_, i) => i + 2) };
const X = D.extractUnits(tbl, { dcol: 2, unit: 'cm', decimal: '.', pcol: 0, percol: 1, mode: 'each' });
const RUNS = [['weibull.ml', { a: 0 }], ['weibull.ml', { a: 1.1 }], ['weibull.mom', { a: 0, varDivisor: 'n-1' }], ['weibull.pct', { a: 0 }], ['normal.ml', {}], ['lognormal.mom', {}], ['gamma.ml', {}],
  ['beta.ml', { L: 0, U: 70 }], ['johnsonsb.cml', { xi: 0, lambda: 70 }], ['johnsonsb.mom', { xi: 0, lambda: 70 }]];
for (const u of X.units) {
  u.desc = D.describe(u.d);
  u.results = RUNS.map(([id, o]) => { const r = D.runMethod(id, { d: u.d, plot: u.plot, period: u.period }, o), fam = D.family(r.family);
    if (r.status === 'ok') { r.gof = { ks: D.gof.ks(fam, r.params, u.d), ad: D.gof.ad(fam, r.params, u.d) }; if (r.likelihoodMaximised) Object.assign(r.gof, D.gof.aicBic(r.logLik, r.free.length, u.d.length)); }
    return r; });
  u.state = u.results.some(r => r.status === 'ok') ? 'ok' : 'error';
}
const notes = r => [...(r.problems || []).map(p => 'pr.' + p.code), ...(r.warnings || []).map(w => 'w.' + w.code)];
const hTR = { T: TR, methodName: r => TR('m.' + r.method), notes, poolLabel: TR('unit.pool') };
const ID = (k, p) => k + (p ? JSON.stringify(p) : '');                              // labels = keys: a "language" with no words
const hID = { T: ID, methodName: r => r.method, notes, poolLabel: 'pool' };

/* 1. fits: one row per unit × result, numbers exactly the engine's */
const F = REP.fitRows(X.units, hTR), H = F[0], col = name => H.indexOf(name);
const all = X.units.flatMap(u => u.results.map(r => [u, r]));
ok(F.length === 1 + all.length && F.every(r => r.length === H.length), `fits: ${F.length - 1} rows, ${H.length} columns, rectangular`);
eq([H[0], H[1], H[2], H[5], H[8]], ['Örnek alan', 'Dönem', 'n', 'method_id', 'status'], 'fits: header (Turkish labels, machine codes)');
all.forEach(([u, r], i) => {
  const row = F[i + 1], fam = D.family(r.family), tag = `${u.plot}/${u.period} ${r.method}`;
  eq([row[0], row[1], row[2], row[5], row[8]], [u.plot, u.period, u.d.length, r.method, r.status], `${tag}: unit, n, method, status`);
  if (r.status === 'ok') {
    fam.params.forEach((q, j) => ok(row[10 + 2 * j] === (q.label ?? q.key) && row[11 + 2 * j] === r.params[q.key], `${tag}: ${q.key} written exactly (${row[11 + 2 * j]})`));
    ok(row[col('ln L')] === r.logLik && row[col('KS D')] === r.gof.ks && row[col('AD A²')] === r.gof.ad, `${tag}: ln L, KS, AD exact`);
    ok(r.likelihoodMaximised ? row[col('AIC')] === r.gof.aic && row[col('BIC')] === r.gof.bic && row[col('k')] === 2 : row[col('AIC')] === null && row[col('k')] === null, `${tag}: AIC/BIC/k only where the likelihood is maximised`);
    ok(r.family === 'normal' ? row[col('P(D < 0)')] === r.diagnostics.pBelowZero : row[col('P(D < 0)')] === null, `${tag}: P(D < 0) only for the normal`);
  } else {
    ok(row.slice(10, 18).every((v, j) => j % 2 === 1 ? v === null : true) && row[col('ln L')] === null && typeof row[9] === 'string' && row[9].length > 0, `${tag}: failed fit → no numbers, reason "${row[9]}"`);
  }
});
{ const r = F.find(x => x[5] === 'weibull.mom'); ok(/varDivisor = n-1/.test(r[H.length - 1]), 'moment divisor written in the settings column: ' + r[H.length - 1]); }
{ const r = F.find(x => x[5] === 'weibull.ml' && x[0] === 'P1' && x[1] === '2019' && /1\.1/.test(x[col('Sabit parametreler')] || ''));
  ok(r && /a = 1\.1 \(kullanıcı\)/.test(r[col('Sabit parametreler')]), 'fixed location written with its origin'); }
ok(F.filter(x => x[0] === 'P2').every(x => x[8] === 'invalid' && x[9].includes('pr.constant')), 'equal diameters: every method invalid with the reason');

/* 2. labels never change numbers: Turkish labels vs keys-only "language" */
const FI = REP.fitRows(X.units, hID);
ok(F.length === FI.length && F.slice(1).every((r, i) => r.every((v, j) => typeof v === 'number' ? v === FI[i + 1][j] : true)) && F.slice(1).every((r, i) => r.filter(v => typeof v === 'number').length === FI[i + 1].filter(v => typeof v === 'number').length), 'fits: identical numbers whatever the labels');
ok(F.slice(1).every(r => r[5] === FI[F.indexOf(r)][5] && r[8] === FI[F.indexOf(r)][8]), 'machine codes identical across languages');

/* 3. parameters in long form */
const P = REP.paramRows(X.units, hTR), okRes = all.filter(([, r]) => r.status === 'ok');
ok(P.length === 1 + okRes.reduce((s, [, r]) => s + D.family(r.family).params.length, 0), `parameters: one row per estimated or fixed parameter (${P.length - 1})`);
{ let i = 1, good = true;
  for (const [u, r] of okRes) for (const q of D.family(r.family).params) { const row = P[i++]; if (row[0] !== u.plot || row[4] !== r.method || row[6] !== q.key || row[7] !== r.params[q.key]) good = false; }
  ok(good, 'parameters: values exact, in order'); }
ok(P.some(r => r[4] === 'beta.ml' && r[6] === 'L' && r[10] === 'kullanıcı') && P.some(r => r[4] === 'beta.ml' && r[6] === 'alpha' && r[10] === 'tahmin edildi'), 'parameters: fixed bounds marked user, shapes marked estimated');
ok(P.some(r => r[4] === 'weibull.ml' && r[6] === 'a' && r[7] === 0 && r[10] === 'sıfır (iki parametreli biçim)'), 'parameters: a = 0 marked as the two-parameter form');
ok(P.some(r => r[4] === 'lognormal.mom' && r[6] === 'mu' && r[8] === 'ln cm') && P.some(r => r[4] === 'lognormal.mom' && r[6] === 'sigma' && r[8] === 'log ölçek'), 'parameters: lognormal units on the log scale');

/* 4. units */
const U = REP.unitRows(X.units, hTR);
X.units.forEach((u, i) => eq(U[i + 1].slice(0, 10), [u.plot, u.period, u.desc.n, u.desc.unique, u.desc.min, u.desc.max, u.desc.mean, u.desc.dq, u.desc.varN, u.desc.varN1], `unit ${u.plot}/${u.period}: descriptive values exact`));

/* 5. CSV: decimal point, quoting, reads back to the same numbers */
{ const txt = csvText(F), parse = s => { const out = []; let row = [], f = '', q = false; for (let i = 0; i < s.length; i++) { const c = s[i];
      if (q) { if (c === '"' && s[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
      else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\r' && s[i + 1] === '\n') { row.push(f); out.push(row); row = []; f = ''; i++; } else f += c; }
    row.push(f); out.push(row); return out; };
  const back = parse(txt);
  ok(back.length === F.length && back.every(r => r.length === H.length), 'CSV: same shape after reading back');
  let same = true; F.forEach((r, i) => r.forEach((v, j) => { if (typeof v === 'number' && Number(back[i][j]) !== v) same = false; if (v === null && back[i][j] !== '') same = false; })); ok(same, 'CSV: every number reads back exactly; empty cells for missing values');
  const nums = F.slice(1).flat().filter(v => typeof v === 'number' && !Number.isInteger(v));
  ok(nums.length > 100 && nums.every(v => back.flat().includes(String(v))) && nums.some(v => String(v).length > 15), 'CSV: each number is written as its shortest exact decimal (decimal point, full precision)'); }

/* 6. recovery tables (moment recovery and Weibull M2–M5), including invalid and multiple results */
{ const S1 = { mean: 20, dq: 21, n: 30 }, rr = ['normal.rec', 'lognormal.rec', 'gamma.rec'].map(id => D.runMethod(id, { type: 'summary', summary: S1 }));
  rr.push(D.runMethod('gamma.rec', { type: 'summary', summary: { mean: 20, dq: 19 } }));
  const Rr = REP.recoverRows(rr, hTR), h = Rr[0];
  ok(Rr.length === 5 && Rr.every(r => r.length === h.length), 'recovery: rows and rectangular columns');
  ok(rr.slice(0, 3).every((r, i) => D.family(r.family).params.every((q, j) => Rr[i + 1][6 + 2 * j] === (q.label ?? q.key) && Rr[i + 1][7 + 2 * j] === r.params[q.key])), 'recovery: parameters exact');
  const tm = h.indexOf('Hedef: mean'), bm = h.indexOf('Geri hesap: backMean'), bq = h.indexOf('Geri hesap: backDq');
  ok(tm > 0 && bm > 0 && rr.slice(0, 3).every((r, i) => Rr[i + 1][tm] === 20 && Rr[i + 1][bm] === r.diagnostics.backMean && Rr[i + 1][bq] === r.diagnostics.backDq), 'recovery: targets and back-calculated values exact');
  ok(Rr[4][4] === 'invalid' && Rr[4][7] === null && Rr[4][5].includes('pr.sum.dq'), 'recovery: inconsistent summary → no numbers, reason'); }
{ const s = D.weibullSummary(FX.w2), ws = ['weibull.m2', 'weibull.m3', 'weibull.m4', 'weibull.m5'].filter(id => { try { D.method(id); return true; } catch (e) { return false; } });
  const rw = ws.map(id => D.runMethod(id, { type: 'summary', summary: s }, { loc: 'half-dmin' }));
  const Rw = REP.recoverRows(rw, hTR), h = Rw[0];
  ok(ws.length === 4 && rw.every(r => r.status === 'ok'), 'Weibull M2–M5 from raw-data targets');
  ok(rw.every((r, i) => Rw[i + 1][7] === r.params.a && Rw[i + 1][9] === r.params.b && Rw[i + 1][11] === r.params.c), 'Weibull recovery: a, b, c exact');
  ok(rw.every((r, i) => /a = .*half-dmin, Dmin = /.test(Rw[i + 1][h.indexOf('Sabit parametreler')])), 'Weibull recovery: location policy and Dmin written');
  ok(rw.every((r, i) => /origin = measured/.test(Rw[i + 1][h.length - 1]) && /from = raw/.test(Rw[i + 1][h.length - 1])), 'Weibull recovery: origin of the targets written');
  // a 'multiple' result: candidates listed, no single parameter set
  const mult = { ...rw[0], status: 'multiple', params: null, diagnostics: { candidates: [{ a: 1, b: 20, c: 2.5, backMean: 18 }, { a: 1, b: 31, c: 0.4, backMean: 18 }] } };
  const Rm = REP.recoverRows([mult], hTR)[1];
  ok(Rm[4] === 'multiple' && Rm[9] === null && /b = 20, c = 2\.5 \| .*b = 31, c = 0\.4/.test(Rm[REP.recoverRows([mult], hTR)[0].indexOf('Aday çözümler')]), 'multiple solutions: candidates listed, no parameters'); }

/* 7. info sheet */
eq(REP.infoRows([['A', 1], null, ['B', null]], TR), [['Ayar', 'Değer'], ['A', 1], ['B', '–']], 'info rows: header, skipped entries, empty value as –');

console.log(`dist export: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
