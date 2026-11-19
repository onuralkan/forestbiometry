// R code of the Diameter Distribution Lab, stage 2 (assets/lab/dist/rcode-rec.js): cases for scripts/rcode-check.sh
// (the Johnson SB cards need the R package nleqslv). Each case is a recovery card of the page run by the tool on a
// summary, the R script the card would download and the numbers R must give back. The summaries come from the tool's
// simulated sample (assets/lab/dist/ornek/ornek-caplar.csv) as the cards' "compute from data" gives them, or are typed.
import { readFileSync } from 'node:fs';
import * as D from '../../assets/lab/dist/index.js';
import { buildRecoverR } from '../../assets/lab/dist/rcode-rec.js';
import { quantile7 } from '../../assets/lab/dist/data.js';

const d = readFileSync(new URL('../../assets/lab/dist/ornek/ornek-caplar.csv', import.meta.url), 'utf8').trim().split('\n').slice(1).map(l => +l.split(';')[1].replace(',', '.'));
const o = { lang: 'en', created: 'test', version: D.TOOL.version };

function card(name, kind, ids, summary, opts = {}) {
  const results = ids.map(id => D.runMethod(id, { type: 'summary', summary }, opts)), exp = {};
  for (const r of results) {
    if (kind === 'mom' && r.status === 'ok') for (const [k, v] of Object.entries(r.params)) exp[`${r.family}.${k}`] = [v, 1e-12];
    if (kind === 'weibull') { const id = r.method.replace('weibull.', '');
      if (r.status === 'ok') { exp[`${id}.roots`] = [1, 0]; for (const k of ['a', 'b', 'c']) exp[`${id}.${k}`] = [r.params[k], 1e-9]; }
      if (r.status === 'multiple') { const c = r.diagnostics.candidates; exp[`${id}.roots`] = [c.length, 0]; c.forEach((p, j) => { exp[`${id}.c${j + 1}`] = [p.c, 1e-9]; }); } }
    if ((kind === 'parresol' || kind === 'fonseca') && (r.status === 'ok' || r.status === 'multiple')) {
      exp.solutions = [r.status === 'ok' ? 1 : r.diagnostics.candidates.length, 0];
      if (r.status === 'ok') for (const k of ['xi', 'lambda', 'gamma', 'delta']) exp[k] = [r.params[k], 1e-6]; }
  }
  if (!Object.keys(exp).length) throw new Error(name + ': no result to compare');
  return { name, script: buildRecoverR(kind, summary, opts, results, o), files: {}, expected: exp };
}

const W = D.weibullSummary(d), s = [...d].sort((a, b) => a - b);
const P19 = JSON.parse(readFileSync(new URL('../ref/dist_p19.json', import.meta.url), 'utf8'));
const MOM = ['normal.rec', 'lognormal.rec', 'gamma.rec'], WB = ['m2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10'].map(k => 'weibull.' + k);
export default function cases() {
  return [
    // moments: the mean with a sample variance (n − 1, needs n), and the mean with Dq
    card('rec-moments-var', 'mom', MOM, { mean: 21.4, variance: 92.25, varDivisor: 'n-1', n: 124 }),
    card('rec-moments-dq', 'mom', MOM, { mean: W.mean, dq: W.dq }),
    // Weibull M2–M10 from the sample's summaries (computed as the card does), location Dmin/2 and a user location of 4 cm
    card('rec-weibull-half', 'weibull', WB, { ...W, from: 'raw' }, { loc: 'half-dmin' }),
    card('rec-weibull-user', 'weibull', WB, { ...W, from: 'raw' }, { loc: 'user', a: 4 }),
    // Johnson SB: Parresol (2003) with ξ = 2 cm and Dq given; Fonseca et al. (2009) from the sample's median, mean, Dq, d̄_G
    card('rec-parresol', 'parresol', ['johnsonsb.parresol'], { xi: 2, mean: W.mean, median: quantile7(s, 0.5), dq: W.dq }),
    // (the sample is nearly symmetric, so Fonseca's system has no solution there; summaries of a known Johnson SB with
    // ξ = 4, λ = 40, γ = 0.8, δ = 1.4, from tests/ref/dist_p19.json, are used instead)
    card('rec-fonseca', 'fonseca', ['johnsonsb.fonseca'], P19.cases[0].summary),
  ];
}
