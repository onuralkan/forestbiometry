// Model comparison for one analysis unit (DIST_SPEC §2.4, stage P13). No DOM.
// Results are grouped by the observation process (data type, thresholds, grouped-data options): fits of different
// processes are never ranked together. Inside a group, likelihood fits (maximum likelihood with a log-likelihood on the
// diameter scale, the same n) are compared with AIC/BIC; moment, percentile and recovery-type fits are compared only
// descriptively (KS, AD, CvM, class errors; their ln L is shown as a log-score, never with AIC). There is no composite
// "best model" score: the user picks the criterion and the table shows which one sorts it. No p-values.
import { aicc } from './gof.js';

/** Key of the observation process a result belongs to. */
export function obsKey(r) {
  const t = r.truncation, s = r.settings || {};
  return JSON.stringify({ type: r.data.type, lower: t ? t.lower ?? null : null, upper: t ? t.upper ?? null : null, outside: s.outside ?? null, countType: s.countType ?? null });
}
export const CRITERIA = { aic: 1, bic: 1, aicc: 1, logLik: -1, ks: 1, ad: 1, cvm: 1, l1: 1, ei: 1 };     // 1: smaller is better
/**
 * results: the unit's results (with r.gof = { ks, ad, cvm, aic, bic }); classErr(r) → { l1, ei } from the common class
 * edges (or null). Returns [{ key, ml: [row], desc: [row], failed: [row] }].
 */
export function compareUnit(results, classErr = () => null) {
  const groups = new Map();
  for (const r of results) {
    const key = obsKey(r); if (!groups.has(key)) groups.set(key, { key, process: JSON.parse(key), ml: [], desc: [], failed: [] });
    const g = groups.get(key);
    if (r.status !== 'ok') { g.failed.push({ r, status: r.status }); continue; }
    const gof = r.gof || {}, ce = classErr(r) || {}, n = r.data.n, k = r.free ? r.free.length : null;
    const lik = r.likelihoodMaximised && r.logLik != null && n != null;
    const row = { r, n, k, logLik: r.logLik ?? null, ks: gof.ks ?? null, ad: gof.ad ?? null, cvm: gof.cvm ?? null, l1: ce.l1 ?? null, ei: ce.ei ?? null,
      aic: lik ? gof.aic : null, bic: lik ? gof.bic : null, aicc: lik ? aicc(r.logLik, k, n) : null };
    (lik ? g.ml : g.desc).push(row);
  }
  for (const g of groups.values()) {
    const minA = Math.min(...g.ml.map(x => x.aic)), minB = Math.min(...g.ml.map(x => x.bic));
    for (const x of g.ml) { x.dAIC = x.aic - minA; x.dBIC = x.bic - minB; }
  }
  return [...groups.values()];
}
/** Rows sorted by one criterion (direction from CRITERIA); rows without the value go last, in their original order. */
export function sortRows(rows, crit) {
  const dir = CRITERIA[crit] || 1;
  return rows.map((x, i) => [x, i]).sort(([a, i], [b, j]) => {
    const va = a[crit], vb = b[crit];
    if (va == null && vb == null) return i - j; if (va == null) return 1; if (vb == null) return -1;
    return dir * (va - vb) || i - j;
  }).map(([x]) => x);
}
/** Q–Q points [theoretical Q((i − 0.5)/n), observed d(i)] (both cm) for the observed distribution G (family-like). */
export function qqPoints(G, p, d) { const s = [...d].sort((a, b) => a - b), n = s.length; return s.map((x, i) => [G.quantile((i + 0.5) / n, p), x]); }
/** P–P points [F(d(i)), (i − 0.5)/n] (both probabilities). */
export function ppPoints(G, p, d) { const s = [...d].sort((a, b) => a - b), n = s.length; return s.map((x, i) => [G.cdf(x, p), (i + 0.5) / n]); }
