// R code of Volume Equations (assets/lab/volume/rcode.js): cases for scripts/rcode-check.sh. Each case is the tool's own
// computation on a table (as the page does it: useTable, then fitForm with the page's options), the R script the page
// would download, the data file and the numbers R must give back. Data: the tool's simulated sample
// (assets/lab/volume/ornek/ornek-hacim.csv), a height and a diameter blanked so that each form leaves out its own rows.
import { readFileSync } from 'node:fs';
import * as VOL from '../../assets/lab/volume/calc.js';
import { buildR } from '../../assets/lab/volume/rcode.js';
import { tableFromText, detectDelimiter, cellText } from '../../assets/lab/core/table.js';
import { parseNumber } from '../../assets/lab/core/num.js';
import { tableCsv, csvName } from '../../assets/lab/core/rcode.js';

const csv0 = readFileSync(new URL('../../assets/lab/volume/ornek/ornek-hacim.csv', import.meta.url), 'utf8').trim().split('\n');
const edit = csv0.map((l, i) => i === 5 ? l.replace(/^([^,]*,[^,]*),[^,]*,/, '$1,,') : i === 9 ? l.replace(/^([^,]*),[^,]*,/, '$1,,') : l);

function run(name, { decimal, opts }) {
  const text = (decimal === ',' ? edit.map(l => l.replace(/,/g, ';').replace(/(\d)\.(\d)/g, '$1,$2')) : edit).join('\n') + '\n';
  const imp = { kind: 'csv', name: name + '.csv', encoding: 'utf-8', delim: null, detected: detectDelimiter(text).delim, header: true, sheet: null };
  const src = tableFromText(text, { delim: imp.detected, header: true }), map = { id: 0, D: 1, H: 2, V: 3 };
  const val = (r, c) => { const x = r[c]; if (x && x.t === 'n') return x.v; const p = parseNumber(cellText(x), decimal); return p.status === 'ok' ? p.value : null; };
  const trees = src.rows.map((r, i) => ({ row: src.rowNumbers[i], D: val(r, map.D), H: val(r, map.H), V: val(r, map.V) }));
  const fits = Object.entries(opts).map(([id, o]) => ({ id, opts: o, ...VOL.fitForm(id, trees, o) }));
  const script = buildR({ imp, src, map, decimal }, { fits }, { lang: 'en', created: 'test', version: VOL.TOOL.version });
  const exp = {};
  for (const x of fits) {
    if (x.status !== 'ok') throw new Error(`${name} ${x.id}: ${x.code}`);
    if (!x.dropped.length) throw new Error(`${name} ${x.id}: no tree left out`);
    x.coef.forEach((v, j) => { exp[`${x.id}.c${j + 1}`] = [v, 1e-9]; exp[`${x.id}.se${j + 1}`] = [x.se[j], 1e-8]; });
    for (const [k, v] of Object.entries(x.params)) exp[`${x.id}.${k}`] = [v, 1e-9];
    exp[`${x.id}.s`] = [x.s, 1e-9]; exp[`${x.id}.cf`] = [x.cf ?? 1, 1e-12];
    if (x.weight.kind === 'power') exp[`${x.id}.k`] = [x.weight.k, 1e-9];
    for (const k of ['n', 'rmse', 'bias', 'mae', 'r2']) exp[`${x.id}.${k}`] = [x.metrics[k], k === 'n' ? 0 : 1e-9];
  }
  return { name, script, files: { [imp.name]: text }, expected: exp };
}

// trees not read from a file (Stem Section Volume results): the page writes them as a CSV file with the script
function runSent(name, opts) {
  const csv = edit.slice(1).map(l => l.split(',')), num = v => v === '' ? null : +v;
  const trees = csv.map((r, i) => ({ row: i + 2, id: r[0], D: num(r[1]), H: num(r[2]), V: num(r[3]) * 0.9 }));
  const n = v => v == null ? null : { t: 'n', v };
  const src = { headers: ['row', 'tree', 'D_cm', 'H_m', 'V_m3'], rows: trees.map(t => [n(t.row), { t: 's', v: t.id }, n(t.D), n(t.H), n(t.V)]) }, imp = { kind: 'dataset', name: name };
  const fits = Object.entries(opts).map(([id, o]) => ({ id, opts: o, ...VOL.fitForm(id, trees, o) }));
  const script = buildR({ imp, src, map: { D: 2, H: 3, V: 4 }, decimal: '.', note: 'test' }, { fits }, { lang: 'tr', created: 'test', version: VOL.TOOL.version });
  const exp = {};
  for (const x of fits) { x.coef.forEach((v, j) => { exp[`${x.id}.c${j + 1}`] = [v, 1e-9]; }); for (const k of ['n', 'rmse', 'r2']) exp[`${x.id}.${k}`] = [x.metrics[k], k === 'n' ? 0 : 1e-9]; }
  return { name, script, files: { [csvName(imp)]: tableCsv(src, () => '', '.') }, expected: exp };
}

export default function cases() {
  return [
    // all five forms: weights with k estimated and k fixed, Baskerville and no correction
    run('volume-all', { decimal: '.', opts: { cf: { weight: { kind: 'power', k: 2 } }, cv: { weight: { kind: 'power', k: null } }, ln: { correction: 'baskerville' }, loc: { weight: { kind: 'none' } }, locln: { correction: 'none' } } }),
    // semicolon and decimal comma; unweighted combined variable, weighted local form with k estimated
    // under-bark volumes sent by Stem Section Volume: the trees go along as CSV (full precision), Turkish script
    runSent('volume-sent', { cv: { weight: { kind: 'power', k: null } }, ln: { correction: 'baskerville' } }),
    run('volume-comma', { decimal: ',', opts: { cv: { weight: { kind: 'none' } }, loc: { weight: { kind: 'power', k: null } }, locln: { correction: 'baskerville' } } }),
  ];
}
