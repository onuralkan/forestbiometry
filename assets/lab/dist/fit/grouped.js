// Maximum likelihood from grouped data (class frequencies; DIST_SPEC §2.3, stage P12). No DOM.
// Input: classes [{ lo, hi, n }] ([lo, hi) cm, the last may be open), the count type and what the range outside the
// listed classes means:
//   countType 'count'  n_j are numbers of measured trees (integers): ln L = Σ n_j ln p_j (the multinomial constant
//                      ln[n!/Π n_j!] does not depend on the parameters and is left out, the same for every model on
//                      the same classes), AIC/BIC with n = Σ n_j
//   countType 'perha'  n_j are expanded frequencies (trees per hectare, not integers): the same function with weights
//                      gives the parameters (it does not depend on the scale of the weights), but the true number of
//                      trees is unknown, so no ln L, AIC or BIC is reported
//   outside 'zero'     the range outside the classes was measured and held no trees: p_j are unconditional
//   outside 'unrecorded' trees outside the listed classes were not recorded: p_j / Σ p_k (conditional likelihood)
// Mid-point replication (treating n_j trees at the class mid-point as raw diameters) is NOT used for the estimate; the
// mid-points only give a starting value. Solver: Nelder–Mead with restarts, positive parameters on the log scale.
import { nelderMead } from '../../core/optim.js';
import { logClassProbs, checkClasses } from '../classes.js';
import { family as famOf, method as methodOf } from '../registry.js';

const lse = a => { const m = Math.max(...a); return m === -Infinity ? -Infinity : m + Math.log(a.reduce((s, v) => s + Math.exp(v - m), 0)); };
/** Grouped log-likelihood Σ w_j ln p_j (conditional on the listed classes when outside = 'unrecorded'). */
export function groupedLogLik(fam, p, cl, w, outside = 'zero') {
  const lp = logClassProbs(fam, p, cl); let s = 0;
  for (let j = 0; j < cl.length; j++) { if (!w[j]) continue; if (!Number.isFinite(lp[j])) return -Infinity; s += w[j] * lp[j]; }
  if (outside === 'unrecorded') { const W = w.reduce((a, b) => a + b, 0), lt = lse(lp); if (!Number.isFinite(lt)) return -Infinity; s -= W * lt; }
  return s;
}
/** Problems of grouped input: classes, frequencies (non-negative; integers for counts), at least two occupied classes. */
export function checkGrouped(cl, countType) {
  const pr = [...checkClasses(cl)];
  if (pr.length) return pr;
  const bad = cl.filter(c => !(Number.isFinite(c.n) && c.n >= 0));
  if (bad.length) return [{ code: 'grp.freq', count: bad.length, example: bad[0].n ?? null }];
  if (countType === 'count') { const nonInt = cl.filter(c => !Number.isInteger(c.n)); if (nonInt.length) return [{ code: 'grp.notint', count: nonInt.length, example: nonInt[0].n }]; }
  if (cl.filter(c => c.n > 0).length < 2) return [{ code: 'grp.few', occupied: cl.filter(c => c.n > 0).length }];
  return [];
}
/** Start values only: the family's raw-data ML on class mid-points (open class: lo + the previous width). */
function midpoints(cl) {
  const d = [];
  cl.forEach((c, j) => { const w = c.hi === Infinity ? (j ? cl[j - 1].hi - cl[j - 1].lo : 1) : c.hi - c.lo, m = c.lo + w / 2, k = Math.min(Math.round(c.n), 5000); for (let i = 0; i < k; i++) d.push(m); });
  return d;
}
export function makeGML(famId, baseId) {
  const base = methodOf(baseId), fixedOpts = (base.options || []).filter(o => o.type === 'fixed-param');
  return {
    id: famId + '.gml', family: famId, kind: 'fit', estimator: 'ml', solver: 'nelder-mead', dataTypes: ['classes'], likelihoodMaximised: true, grouped: true,
    needsInput: !!base.needsInput, options: fixedOpts, base: baseId, checkOptions: base.checkOptions ? o => base.checkOptions(o) : undefined,
    source: famId + '.gml', run: (input, opts = {}) => fitGML(famId, baseId, input, opts),
  };
}
export function fitGML(famId, baseId, input, opts = {}) {
  const fam = famOf(famId), cl = input.classes || [], countType = input.countType === 'perha' ? 'perha' : 'count', outside = input.outside === 'unrecorded' ? 'unrecorded' : 'zero';
  const w = cl.map(c => c.n), W = w.reduce((a, b) => a + b, 0);
  const meta = { settings: { countType, outside, classes: cl.length }, data: { type: 'classes', n: countType === 'count' ? W : null }, warnings: [] };
  const pr = checkGrouped(cl, countType);
  if (pr.length) return { ...meta, status: 'invalid', problems: pr };
  const start = methodOf(baseId).run({ d: midpoints(cl) }, opts);
  meta.fixed = start.fixed || {};
  if (start.status !== 'ok') return { ...meta, status: 'invalid', problems: [{ code: 'grp.nostart', status: start.status }, ...(start.problems || [])] };
  const fixedKeys = Object.keys(start.fixed || {}), free = fam.params.filter(q => !fixedKeys.includes(q.key)), logScale = q => q.min === 0;
  // support: every occupied class must have positive probability (e.g. Weibull a, beta L/U inside the data range)
  const toP = x => { const p = { ...start.params }; free.forEach((q, i) => { p[q.key] = logScale(q) ? Math.exp(x[i]) : x[i]; }); return p; };
  const obj = x => { if (x.some(v => !Number.isFinite(v) || Math.abs(v) > 120)) return Infinity; const l = groupedLogLik(fam, toP(x), cl, w, outside); return Number.isFinite(l) ? -l / W : Infinity; };
  const x0 = free.map(q => logScale(q) ? Math.log(start.params[q.key]) : start.params[q.key]);
  if (!Number.isFinite(obj(x0))) return { ...meta, status: 'invalid', problems: [{ code: 'grp.support' }] };
  const r = nelderMead(obj, x0, { step: 0.2 });
  const conv = { iter: r.iter, restarts: r.restarts, tol: 1e-13, start: 'mid-points (start only)', transform: free.map(q => `${q.key}: ${logScale(q) ? 'log' : 'identity'}`).join(', ') };
  if (r.status !== 'ok') return { ...meta, status: 'noconverge', convergence: conv, warnings: [{ code: 'grp.noconverge' }] };
  if (free.some((q, i) => logScale(q) && Math.abs(r.x[i]) > 60)) return { ...meta, status: 'boundary', convergence: conv, warnings: [{ code: 'grp.boundary' }] };
  const p = toP(r.x), wll = groupedLogLik(fam, p, cl, w, outside);
  const out = { ...meta, status: 'ok', params: p, free: free.map(q => q.key), convergence: conv, diagnostics: { weightedLogLik: wll, totalWeight: W } };
  if (countType === 'count') { out.logLik = wll; out.objective = { name: 'logLik (grouped, multinomial without constant)', value: wll }; }
  else { out.logLik = null; out.objective = { name: 'weighted grouped log-likelihood (expanded frequencies; not a likelihood)', value: wll }; out.warnings = [{ code: 'grp.perha' }]; }
  return out;
}
