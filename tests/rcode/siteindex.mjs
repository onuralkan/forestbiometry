// R code of the Site Index fit (assets/lab/siteindex/rcode.js): cases for scripts/rcode-check.sh. Each case is the tool's
// own fit on a table (as the page does it), the R script the page would download, the data file and the numbers R must
// give back. Data: the tool's simulated sample (assets/lab/siteindex/ornek/ornek-yas-boy.csv); in one case a plot column
// is added, the decimal comma is used, one height is blanked and one age is unreadable, so that rows are left out.
import { readFileSync } from 'node:fs';
import * as S from '../../assets/lab/siteindex/calc.js';
import { buildR } from '../../assets/lab/siteindex/rcode.js';
import { tableFromText, detectDelimiter, cellText } from '../../assets/lab/core/table.js';
import { parseNumber } from '../../assets/lab/core/num.js';

const csv0 = readFileSync(new URL('../../assets/lab/siteindex/ornek/ornek-yas-boy.csv', import.meta.url), 'utf8').trim().split('\n');

function run(name, { text, map, decimal, form, pairing }) {
  const imp = { kind: 'csv', name: name + '.csv', encoding: 'utf-8', delim: null, detected: detectDelimiter(text).delim, header: true, sheet: null };
  const src = tableFromText(text, { delim: imp.detected, header: true });
  const { series } = S.seriesFromTable(src, map, decimal, parseNumber, cellText), pairs = S.makePairs(series, pairing);
  const FR = { ...S.fitPairs(form, pairs, { nSeries: series.length }), series, pairing };
  if (FR.status !== 'ok') throw new Error(`${name}: ${FR.status}`);
  const script = buildR({ imp, src, map, decimal, form, pairing }, FR, { lang: 'en', created: 'test', version: S.TOOL.version });
  const exp = {};
  for (const k of S.FORMS[form].params) { exp[k] = [FR.params[k], 1e-6]; exp['se.' + k] = [FR.se[k], 1e-5]; }
  for (const [k, v, tol] of [['n', FR.n, 0], ['series', FR.nSeries, 0], ['sse', FR.sse, 1e-7], ['rmse', FR.rmse, 1e-7], ['bias', FR.bias, 1e-6], ['sigma', FR.sigma, 1e-7]]) exp[k] = [v, tol];
  return { name, script, files: { [imp.name]: text }, expected: exp };
}

export default function cases() {
  const plain = csv0.join('\n') + '\n';
  // plot column added (two plots), decimal comma, ';' delimiter, one height blanked, one age unreadable
  const withPlot = ['alan;' + csv0[0].replace(/,/g, ';'), ...csv0.slice(1).map((l, i) => `${i % 2 ? 'P2' : 'P1'};` + l.replace(/,/g, ';').replace(/(\d)\.(\d)/g, '$1,$2'))];
  withPlot[5] = withPlot[5].replace(/;[^;]*$/, ';'); withPlot[9] = withPlot[9].replace(/^([^;]*;[^;]*;)[^;]*/, '$1x');
  return [
    run('si-cr-b0-consecutive', { text: plain, map: { series: 0, plot: null, A: 1, H: 2 }, decimal: '.', form: 'cr.ada.b0', pairing: 'consecutive' }),
    run('si-cr-b2-all', { text: plain, map: { series: 0, plot: null, A: 1, H: 2 }, decimal: '.', form: 'cr.ada.b2', pairing: 'all' }),
    run('si-schu-first-plot', { text: withPlot.join('\n') + '\n', map: { series: 1, plot: 0, A: 2, H: 3 }, decimal: ',', form: 'schu.ada', pairing: 'first' }),
  ];
}
