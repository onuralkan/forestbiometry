// R code of the Growth Function Fitter (assets/lab/growth/rcode.js): cases for scripts/rcode-check.sh. Each case is the
// tool's own computation on a table (as the page does it), the R script the page would download, the data file and the
// numbers R must give back. Data: the tool's simulated sample (assets/lab/growth/ornek/ornek-buyume.csv), one size
// blanked, one age set to 0 and one empty row added, so that rows are left out.
import { readFileSync } from 'node:fs';
import * as G from '../../assets/lab/growth/calc.js';
import { buildR } from '../../assets/lab/growth/rcode.js';
import { tableFromText, detectDelimiter, cellText } from '../../assets/lab/core/table.js';
import { parseNumber } from '../../assets/lab/core/num.js';

const csv0 = readFileSync(new URL('../../assets/lab/growth/ornek/ornek-buyume.csv', import.meta.url), 'utf8').trim().split('\n');
const edit = csv0.map((l, i) => i === 6 ? l.replace(/;[^;]*$/, ';') : i === 11 ? l.replace(/^([^;]*);[^;]*;/, '$1;0;') : l);
edit.splice(20, 0, ';;');

function run(name, { decimal, forms, sel, step }) {
  const text = (decimal === ',' ? edit.map(l => l.replace(/(\d)\.(\d)/g, '$1,$2')) : edit).join('\n') + '\n';
  const imp = { kind: 'csv', name: name + '.csv', encoding: 'utf-8', delim: null, detected: detectDelimiter(text).delim, header: true, sheet: null };
  const src = tableFromText(text, { delim: imp.detected, header: true }), map = { series: 0, t: 1, y: 2 };
  const { obs, problems } = G.readSeries(src, map, decimal, parseNumber, cellText);
  if (problems.length !== 2) throw new Error(`${name}: expected 2 rows left out, got ${problems.length}`);
  const tMax = Math.max(...obs.map(o => o.t));
  const fits = forms.map(id => { const r = G.fitGrowth(obs, id); return { ...r, derived: r.status === 'ok' ? G.derived(id, r.theta, tMax) : null }; });
  const R = { tMax, obs, fits };
  const script = buildR({ imp, src, map, decimal, sel, step }, R, { lang: 'en', created: 'test', version: G.TOOL.version });
  const exp = {};
  for (const q of fits) {
    if (q.status !== 'ok') throw new Error(`${name} ${q.form}: ${q.status}`);
    const id = q.form, d = q.derived;
    G.FORMS[id].params.forEach(p => { exp[`${id}.${p}`] = [q.params[p], 1e-6]; exp[`${id}.se.${p}`] = [q.se[p], 1e-5]; });
    for (const [k, v, tol] of [['n', q.n, 0], ['sse', q.sse, 1e-7], ['rmse', q.rmse, 1e-7], ['bias', q.bias, 1e-6], ['rse', q.rse, 1e-7], ['aic', q.aic, 1e-7], ['asymptote', d.asymptote, 1e-6],
      ['inflection', d.inflection, 1e-6], ['cai_max', d.caiMax, 1e-6], ['mai_culmination', d.maiCulmination, 1e-6], ['mai_max', d.maiMax, 1e-6]]) if (v != null) exp[`${id}.${k}`] = [v, tol];
  }
  const s = fits.find(q => q.form === sel), tab = G.curve(sel, s.theta, tMax * 1.25, step);
  exp['curve.n'] = [tab.length, 0]; exp['curve.y'] = [tab.reduce((a, c) => a + c.y, 0), 1e-6]; exp['curve.cai'] = [tab.reduce((a, c) => a + c.cai, 0), 1e-6]; exp['curve.mai'] = [tab.reduce((a, c) => a + c.mai, 0), 1e-6];
  return { name, script, files: { [imp.name]: text }, expected: exp };
}

export default function cases() {
  return [
    // all six forms, decimal point, the table of Chapman–Richards in 5-year steps
    run('growth-all', { decimal: '.', forms: G.FORM_IDS, sel: 'cr', step: 5 }),
    // decimal comma, three forms, the table of Gompertz in 2.5-year steps
    run('growth-comma', { decimal: ',', forms: ['gomp', 'logi', 'weib'], sel: 'gomp', step: 2.5 }),
  ];
}
