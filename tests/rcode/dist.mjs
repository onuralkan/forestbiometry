// R code of the Diameter Distribution Lab, stage 1 (assets/lab/dist/rcode.js): cases for scripts/rcode-check.sh (needs
// the R package fitdistrplus). Each case is the tool's own fitting run on a table (as compute() of ui.js does it: units,
// methods, the location variants a = 0 and a = the user's value, the statistics), the R script the page would download,
// the data file and the numbers R must give back. Data: the tool's simulated samples (assets/lab/dist/ornek/).
import { readFileSync } from 'node:fs';
import * as D from '../../assets/lab/dist/index.js';
import { buildR } from '../../assets/lab/dist/rcode.js';
import { tableFromText, detectDelimiter } from '../../assets/lab/core/table.js';

const read = f => readFileSync(new URL('../../assets/lab/dist/ornek/' + f, import.meta.url), 'utf8');

/** The page's compute() (ui.js) without the DOM. ms = [[method id, options]], a = the user's location (or null). */
function compute(src, s, ms, a) {
  const g = s.dtype === 'classes', X = g ? D.extractClassUnits(src, s) : D.extractUnits(src, s);
  for (const u of X.units) {
    u.results = [];
    for (const [id, mo] of ms) {
      const m = D.method(id), variants = (m.options || []).some(o => o.key === 'a') ? [{ a: 0 }, ...(a != null && a !== 0 ? [{ a }] : [])] : [{}];
      for (const o of variants) {
        const inp = g ? { type: 'classes', classes: u.classes, countType: s.countType, outside: s.outside } : { d: u.d };
        const r = D.runMethod(id, { ...inp, plot: u.plot === D.POOL ? null : u.plot, period: u.period }, { ...o, ...mo });
        if (r.status === 'ok' && g) r.gof = r.logLik != null ? D.gof.aicBic(r.logLik, r.free.length, r.data.n) : {};
        else if (r.status === 'ok') {
          const G = r.truncation && r.truncation.logMass != null ? D.trunc.truncated(D.family(r.family), r.params, r.truncation) : D.family(r.family);
          r.gof = { ks: D.gof.ks(G, r.params, u.d), ad: D.gof.ad(G, r.params, u.d), cvm: D.gof.cvm(G, r.params, u.d) };
          if (r.likelihoodMaximised && r.logLik != null) Object.assign(r.gof, D.gof.aicBic(r.logLik, r.free.length, u.d.length));
        }
        u.results.push(r);
      }
    }
  }
  return { ...X, grouped: g };
}

function run(name, text, s, ms, a, tol = {}) {
  const imp = { kind: 'csv', name: name + '.csv', encoding: 'utf-8', delim: null, detected: detectDelimiter(text).delim, header: true, sheet: null };
  const src = tableFromText(text, { delim: imp.detected, header: true }), R = compute(src, s, ms, a);
  const script = buildR({ imp, src, ...s }, R, D.POOL, { lang: 'en', created: 'test', version: D.TOOL.version });
  const exp = {}, T = { p: 1e-6, ll: 1e-9, gof: 1e-6, ...tol }; let n = 0;
  R.units.forEach((u, k) => u.results.forEach((r, j) => {
    if (r.status !== 'ok') return; n++;
    const key = `u${k + 1}.r${j + 1}`, tp = (tol.byMethod || {})[r.method] ?? T.p;
    for (const p of D.family(r.family).params) exp[`${key}.${p.key}`] = [r.params[p.key], r.free.includes(p.key) ? tp : 0];
    if (r.logLik != null) exp[`${key}.ll`] = [r.logLik, (tol.byMethod || {})[r.method] ? tp : T.ll];
    for (const g of ['ks', 'ad', 'cvm']) if (Number.isFinite(r.gof[g])) exp[`${key}.${g}`] = [r.gof[g], Math.max(T.gof, tp)];
    if (r.gof.aic != null) { exp[`${key}.aic`] = [r.gof.aic, T.ll]; exp[`${key}.bic`] = [r.gof.bic, T.ll]; }
  }));
  if (n < 3) throw new Error(`${name}: only ${n} results`);
  return { name, script, files: { [imp.name]: text }, expected: exp };
}

const caplar = read('ornek-caplar.csv'), mescere = read('ornek-mescere.csv');
const mescereT = mescere.trim().split('\n').filter((l, i) => !i || (+l.split(',')[2] >= 8 && +l.split(',')[2] <= 60)).join('\n') + '\n';
const B = { L: 0, U: 80 }, SB = { xi: 0, lambda: 80 };
// classes of the pooled sample (5 cm), as a class table: lower, upper (last open), frequency, and the same per hectare
const dAll = caplar.trim().split('\n').slice(1).map(l => +l.split(';')[1].replace(',', '.'));
const cls = Array.from({ length: 10 }, (_, i) => [5 + 5 * i, i === 9 ? '' : 10 + 5 * i]);
const counts = cls.map(([lo, hi]) => dAll.filter(v => v >= lo && (hi === '' || v < hi)).length);
const clsText = (scale, dec) => ['alt;ust;n', ...cls.map(([lo, hi], i) => `${lo};${hi};${String(+(counts[i] * scale).toFixed(4)).replace('.', dec)}`)].join('\n') + '\n';

export default function cases() {
  const raw = { dtype: 'raw', decimal: ',', unit: 'cm', dcol: 1, pcol: 0, percol: null, fcol: null, fval: null, mode: 'pool' };
  return [
    // all plots pooled: every family's fitting methods, the Weibull and exponential location 0 and 2 cm
    run('dist-raw', caplar, raw, [
      ['weibull.ml', {}], ['weibull.mom', { varDivisor: 'n' }], ['weibull.mom', { varDivisor: 'n-1' }], ['weibull.pct', { p: 0.24, r: 0.93 }], ['weibull.lmom', {}], ['normal.ml', {}],
      ['normal.qme', { probs: [0.1, 0.5, 0.9], weights: [1, 2, 1] }], ['normal.mge', { gof: 'cvm' }], ['lognormal.ml', {}], ['lognormal.mom', { varDivisor: 'n' }], ['gamma.ml', {}],
      ['gamma.mom', { varDivisor: 'n-1' }], ['gamma.lmom', {}], ['gamma.mge', { gof: 'ad' }], ['beta.ml', B], ['beta.mom', { ...B, varDivisor: 'n' }], ['beta.qme', { ...B, probs: [0.25, 0.5, 0.75] }],
      ['johnsonsb.cml', SB], ['johnsonsb.mom', { ...SB, varDivisor: 'n' }], ['johnsonsb.kb', SB], ['johnsonsb.pct', { ...SB, p: 0.25, r: 0.75 }], ['exponential.ml', {}],
      ['loglogistic.ml', {}], ['loglogistic.pct', { p: 0.25, r: 0.75 }], ['loglogistic.logmom', {}], ['gengamma.ml', {}], ['gumbel.ml', {}], ['gumbel.mom', { varDivisor: 'n' }],
    ], 2, { byMethod: { 'gengamma.ml': 1e-5, 'normal.qme': 1e-5, 'beta.qme': 1e-5, 'normal.mge': 1e-5, 'gamma.mge': 1e-5,
      // moments: the tool solves the equations (closed form or a root); fitdistrplus's mme minimises the squared differences
      'weibull.mom': 1e-6, 'lognormal.mom': 1e-6, 'gamma.mom': 1e-6, 'beta.mom': 1e-6, 'johnsonsb.mom': 1e-6, 'gumbel.mom': 1e-6 } }),
    // plots of the 2019 inventory (filter) with a lower measurement threshold of 8 cm (the trees below it taken out of
    // the sample, as if never recorded; the normal also with an upper threshold of 60 cm): conditional ML of four families
    run('dist-trunc', mescereT, { dtype: 'raw', decimal: '.', unit: 'cm', dcol: 2, pcol: 0, percol: 1, fcol: 1, fval: '2019', mode: 'each' },
      [['weibull.tml', { trunc: { lower: 8, upper: null }, nScope: 'observed' }], ['gamma.tml', { trunc: { lower: 8, upper: null }, nScope: 'observed' }],
        ['lognormal.tml', { trunc: { lower: 8, upper: null }, nScope: 'observed' }], ['normal.tml', { trunc: { lower: 8, upper: 60 }, nScope: 'observed' }]], null, { p: 1e-5, ll: 1e-8 }),
    // classes (tree counts; outside measured and empty)
    run('dist-classes', clsText(1, ','), { dtype: 'classes', decimal: ',', unit: 'cm', lcol: 0, ucol: 1, ncol: 2, pcol: null, percol: null, fcol: null, fval: null, mode: 'pool', countType: 'count', outside: 'zero' },
      [['weibull.gml', {}], ['normal.gml', {}], ['gamma.gml', {}], ['lognormal.gml', {}], ['loglogistic.gml', {}]], null, { p: 1e-5, ll: 1e-8 }),
    // the same classes per hectare (not integers), trees outside the classes not recorded: parameters only
    run('dist-classes-ha', clsText(25 / 3, '.'), { dtype: 'classes', decimal: '.', unit: 'cm', lcol: 0, ucol: 1, ncol: 2, pcol: null, percol: null, fcol: null, fval: null, mode: 'pool', countType: 'perha', outside: 'unrecorded' },
      [['weibull.gml', {}], ['gamma.gml', {}], ['lognormal.gml', {}]], null, { p: 1e-5 }),
  ];
}
