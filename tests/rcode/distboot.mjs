// R code of the Diameter Distribution Lab, stage 3a (bootstrap; assets/lab/dist/rcode.js buildBootR): cases for
// scripts/rcode-check.sh. The tool's bootstrap (bootstrap.js, generator mulberry32) is run on fits of the page; the R
// script uses the same generator in 32-bit arithmetic, so the same seed gives the same replicates: the counts T_b ≥ T_0
// must agree exactly, the intervals to the precision of the refits. Data: the tool's simulated samples.
import { readFileSync } from 'node:fs';
import * as D from '../../assets/lab/dist/index.js';
import { buildBootR } from '../../assets/lab/dist/rcode.js';
import { tableFromText, detectDelimiter } from '../../assets/lab/core/table.js';

const read = f => readFileSync(new URL('../../assets/lab/dist/ornek/' + f, import.meta.url), 'utf8');
function run(name, text, s, id, mo, runs) {
  const imp = { kind: 'csv', name: name + '.csv', encoding: 'utf-8', delim: null, detected: detectDelimiter(text).delim, header: true, sheet: null };
  const src = tableFromText(text, { delim: imp.detected, header: true }), g = s.dtype === 'classes', X = g ? D.extractClassUnits(src, s) : D.extractUnits(src, s), u = X.units[0];
  const input = g ? { type: 'classes', classes: u.classes, countType: s.countType, outside: s.outside } : { d: u.d };
  const r = D.runMethod(id, input, mo); if (r.status !== 'ok') throw new Error(`${name}: ${r.status}`);
  u.results = [r]; const R = { ...X, grouped: g }, exp = {}, done = [];
  for (const run of runs) {
    const args = { result: r, input, opts: mo, B: run.B, seed: run.seed, step: g ? null : 'auto', scheme: run.scheme || 'parametric', level: 0.95 };
    const res = run.kind === 'gof' ? D.boot.bootstrapGOF(args) : D.boot.bootstrapCI(args);
    done.push({ kind: run.kind, B: run.B, seed: run.seed, step: res.step ?? null, scheme: args.scheme, level: 0.95 });
    if (run.kind === 'gof') { exp['gof.completed'] = [res.completed, 0]; for (const [k, v] of Object.entries(res.stats)) { exp[`gof.${k}.ge`] = [v.ge, 0]; exp[`gof.${k}.p`] = [v.p, 1e-12]; } }
    else { const tag = `ci.${args.scheme === 'nonparametric' ? 'np' : 'p'}`; exp[`${tag}.completed`] = [res.completed, 0];
      for (const [k, v] of Object.entries(res.intervals)) for (const q of ['lo', 'hi', 'se', 'mean']) exp[`${tag}.${k}.${q}`] = [v[q], 1e-5]; }
  }
  return { name, script: buildBootR({ imp, src, ...s }, R, D.POOL, 0, r, done, { lang: 'en', created: 'test', version: D.TOOL.version }), files: { [imp.name]: text }, expected: exp };
}
const caplar = read('ornek-caplar.csv'), dAll = caplar.trim().split('\n').slice(1).map(l => +l.split(';')[1].replace(',', '.'));
const cls = Array.from({ length: 9 }, (_, i) => [5 + 5 * i, 10 + 5 * i]);
const clsText = ['alt;ust;n', ...cls.map(([lo, hi]) => `${lo};${hi};${dAll.filter(v => v >= lo && v < hi).length}`)].join('\n') + '\n';
const raw = { dtype: 'raw', decimal: ',', unit: 'cm', dcol: 1, pcol: 0, percol: null, fcol: null, fval: null, mode: 'pool' };
export default function cases() {
  return [
    // Weibull ML (a = 0) on the pooled sample (diameters to 0.1 cm): p-values, parametric and non-parametric intervals
    run('boot-weibull', caplar, raw, 'weibull.ml', { a: 0 }, [{ kind: 'gof', B: 99, seed: 7 }, { kind: 'ci', B: 99, seed: 11 }, { kind: 'ci', B: 99, seed: 3, scheme: 'nonparametric' }]),
    // gamma, moments with the n − 1 divisor: p-values
    run('boot-gamma', caplar, raw, 'gamma.mom', { varDivisor: 'n-1' }, [{ kind: 'gof', B: 59, seed: 2026 }]),
    // classes (tree counts, outside not recorded): Weibull grouped ML, Pearson X² p-value and intervals
    run('boot-classes', clsText, { dtype: 'classes', decimal: ',', unit: 'cm', lcol: 0, ucol: 1, ncol: 2, pcol: null, percol: null, fcol: null, fval: null, mode: 'pool', countType: 'count', outside: 'unrecorded' },
      'weibull.gml', {}, [{ kind: 'gof', B: 49, seed: 5 }, { kind: 'ci', B: 49, seed: 9 }]),
  ];
}
