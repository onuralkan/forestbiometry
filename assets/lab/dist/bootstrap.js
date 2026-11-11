// Bootstrap for the diameter distribution engine (DIST_SPEC §2.4, stage P14). No DOM: runs in a Web Worker and in Node.
// Two separate operations:
//   bootstrapGOF  parametric bootstrap p-values of fit statistics: every replicate is drawn from the FITTED OBSERVATION
//                 MODEL (the conditional distribution for thresholded data; class counts for grouped data), with the same
//                 measurement rounding, refitted with the same method and options (fixed external bounds stay fixed) and
//                 its statistics recomputed against its own refit. p = (1 + #{T_b ≥ T_0})/(B_ok + 1).
//   bootstrapCI   percentile intervals of the estimated parameters and of diameter percentiles of the fitted
//                 distribution: parametric (as above) or non-parametric (trees resampled with replacement WITHIN the
//                 unit; resampling plots is a different scheme, for stand models, not done here).
// Reproducible: the generator is mulberry32(seed) (core/stats.js); uniforms u = (k + 0.5)/2³² never hit 0 or 1; draws
// are inverse-CDF. Replicates whose refit fails are counted by state (noconverge, boundary, multiple, invalid, error)
// and left out; the failure rate and the Monte Carlo standard error are reported. A method with several roots
// (state 'multiple') is never resolved by a rule inside the bootstrap: such a replicate is a failure, the same in
// every replicate. Unsupported combinations return { unsupported: code } instead of numbers.
import { rng } from '../core/stats.js';
import { method as methodOf, family as famOf, runMethod } from './registry.js';
import { truncated } from './truncate.js';
import { ks, ad, cvm } from './gof.js';
import { classOf } from './classes.js';
import { quantile7 } from './data.js';

export const FAIL_WARN = 0.05;                    // tool rule: warn above 5 % failed replicates
export const MIN_OK = 20;                         // tool rule: fewer completed replicates → no p-value / interval
const uni = r => (Math.floor(r() * 4294967296) + 0.5) / 4294967296;

/** Measurement resolution of the data: the largest step 1, 0.1, 0.01 or 0.001 cm all values are multiples of; else null. */
export function resolution(d) {
  for (const step of [1, 0.1, 0.01, 0.001]) if (d.every(v => Math.abs(v / step - Math.round(v / step)) < 1e-6)) return step;
  return null;
}
const roundTo = (x, step) => step ? Math.floor(x / step + 0.5) * step : x;
/** The distribution the observations follow under a result: conditional inside thresholds, else the family itself. */
export function observedModel(r) {
  const fam = famOf(r.family);
  return r.truncation && r.truncation.logMass != null ? truncated(fam, r.params, r.truncation) : fam;
}
/** Which results can be bootstrapped; { ok: true } or { unsupported: code }. */
export function support(r, input) {
  if (r.status !== 'ok') return { unsupported: 'boot.notok' };
  if (r.kind !== 'fit') return { unsupported: 'boot.kind' };                         // recovery from summaries: no data process here
  if ((input.type || 'raw') === 'classes') {
    if (input.countType !== 'count') return { unsupported: 'boot.perha' };            // the number of trees is unknown
    if (input.outside !== 'unrecorded') return { unsupported: 'boot.zero' };          // "measured, no trees" outside: see METHODS
  }
  return { ok: true };
}
/** One simulated data set from the fitted observation model of r (same size, same rounding, same classes). */
export function simulate(r, input, step, next) {
  const G = observedModel(r), p = r.params;
  if ((input.type || 'raw') === 'classes') {
    const cl = input.classes, n = cl.reduce((a, c) => a + c.n, 0), counts = cl.map(() => 0);
    const H = truncated(famOf(r.family), p, { lower: cl[0].lo, upper: cl[cl.length - 1].hi === Infinity ? null : cl[cl.length - 1].hi });
    for (let i = 0; i < n;) { const x = H.quantile(uni(next), p), j = classOf(cl, x); if (j >= 0 && j < cl.length) { counts[j]++; i++; } }   // draws in a gap are redrawn (conditional on the listed classes)
    return { ...input, classes: cl.map((c, j) => ({ ...c, n: counts[j] })) };
  }
  const n = input.d.length, d = new Array(n);
  for (let i = 0; i < n; i++) d[i] = roundTo(G.quantile(uni(next), p), step);
  return { ...input, d };
}
/** Fit statistics of a result on its data (raw: KS, AD, CvM against the observation model; classes: Pearson X²). */
export function stats(r, input) {
  const G = observedModel(r);
  if ((input.type || 'raw') === 'classes') {
    const cl = input.classes, n = cl.reduce((a, c) => a + c.n, 0), H = truncated(famOf(r.family), r.params, { lower: cl[0].lo, upper: cl[cl.length - 1].hi === Infinity ? null : cl[cl.length - 1].hi });
    const pr = cl.map(c => H.cdf(c.hi === Infinity ? Infinity : c.hi) - H.cdf(c.lo)), tot = pr.reduce((a, b) => a + b, 0);
    return { x2: cl.reduce((s, c, j) => { const e = n * pr[j] / tot; return s + (c.n - e) ** 2 / e; }, 0) };
  }
  return { ks: ks(G, r.params, input.d), ad: ad(G, r.params, input.d), cvm: cvm(G, r.params, input.d) };
}
function fail(failed, st) { failed[st] = (failed[st] || 0) + 1; }
const freeParams = r => r.free || famOf(r.family).params.map(q => q.key).filter(k => !(r.fixed || {})[k]);

/** Parametric bootstrap p-values. args: { result, input, opts, B, seed, step ('auto' | number | null), onProgress } */
export function bootstrapGOF({ result: r, input, opts = {}, B = 199, seed = 1, step = 'auto', onProgress }) {
  const sup = support(r, input); if (sup.unsupported) return { kind: 'gof', ...sup };
  const st = step === 'auto' ? ((input.type || 'raw') === 'classes' ? null : resolution(input.d)) : step;
  const T0 = stats(r, input), keys = Object.keys(T0), ge = Object.fromEntries(keys.map(k => [k, 0])), failed = {}, next = rng(seed);
  let ok = 0; const refits = [];
  for (let b = 0; b < B; b++) {
    const sim = simulate(r, input, st, next), rb = runMethod(r.method, sim, opts);
    if (rb.status !== 'ok') { fail(failed, rb.status); }
    else { ok++; const Tb = stats(rb, sim); for (const k of keys) if (Tb[k] >= T0[k]) ge[k]++; if (refits.length < 5) refits.push(freeParams(rb).map(k => rb.params[k])); }
    if (onProgress && (b % 5 === 4 || b === B - 1)) onProgress(b + 1, B);
  }
  const out = { kind: 'gof', method: r.method, seed, B, completed: ok, failed, failRate: (B - ok) / B, step: st, refitsSample: refits, minOk: MIN_OK, warn: (B - ok) / B > FAIL_WARN };
  out.stats = Object.fromEntries(keys.map(k => { if (ok < MIN_OK) return [k, { t0: T0[k], p: null, ge: ge[k] }]; const p = (1 + ge[k]) / (ok + 1); return [k, { t0: T0[k], ge: ge[k], p, mcse: Math.sqrt(p * (1 - p) / ok) }]; }));
  return out;
}
/** Bootstrap percentile intervals. args: { result, input, opts, B, seed, step, scheme: 'parametric'|'nonparametric', level, probs, onProgress } */
export function bootstrapCI({ result: r, input, opts = {}, B = 199, seed = 1, step = 'auto', scheme = 'parametric', level = 0.95, probs = [0.25, 0.5, 0.75, 0.95], onProgress }) {
  const sup = support(r, input); if (sup.unsupported) return { kind: 'ci', ...sup };
  if (scheme === 'nonparametric' && (input.type || 'raw') !== 'raw') return { kind: 'ci', unsupported: 'boot.npclasses' };
  const st = step === 'auto' ? ((input.type || 'raw') === 'classes' ? null : resolution(input.d)) : step;
  const fam = famOf(r.family), keys = freeParams(r), next = rng(seed), failed = {}, est = Object.fromEntries([...keys, ...probs.map(q => 'Q' + q)].map(k => [k, []]));
  for (let b = 0; b < B; b++) {
    let sim;
    if (scheme === 'nonparametric') { const n = input.d.length, d = new Array(n); for (let i = 0; i < n; i++) d[i] = input.d[Math.floor(uni(next) * n)]; sim = { ...input, d }; }
    else sim = simulate(r, input, st, next);
    const rb = runMethod(r.method, sim, opts);
    if (rb.status !== 'ok') fail(failed, rb.status);
    else { for (const k of keys) est[k].push(rb.params[k]); for (const q of probs) est['Q' + q].push(fam.quantile(q, rb.params)); }
    if (onProgress && (b % 5 === 4 || b === B - 1)) onProgress(b + 1, B);
  }
  const ok = est[keys[0]].length, a = (1 - level) / 2;
  const summ = v => { const s = [...v].sort((x, y) => x - y), m = v.reduce((p, q) => p + q, 0) / v.length; return { lo: quantile7(s, a), hi: quantile7(s, 1 - a), se: Math.sqrt(v.reduce((p, q) => p + (q - m) ** 2, 0) / (v.length - 1)), mean: m }; };
  const point = Object.fromEntries([...keys.map(k => [k, r.params[k]]), ...probs.map(q => ['Q' + q, fam.quantile(q, r.params)])]);
  return { kind: 'ci', method: r.method, scheme, seed, B, completed: ok, failed, failRate: (B - ok) / B, step: scheme === 'parametric' ? st : null, level, warn: (B - ok) / B > FAIL_WARN,
    intervals: ok < MIN_OK ? null : Object.fromEntries(Object.entries(est).map(([k, v]) => [k, { est: point[k], ...summ(v) }])), interval: 'percentile (type 7)' };
}
