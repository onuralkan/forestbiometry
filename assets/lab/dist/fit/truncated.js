// Conditional (truncated) maximum likelihood for measured diameters recorded only within L ≤ d ≤ U (DIST_SPEC §2.3,
// stage P11). No DOM. One method per family, '<family>.tml':
//   maximise  Σ ln f(d; θ) − n ln[F(U; θ) − F(L; θ)]  over the free parameters θ of the family,
// with the family's fixed parameters (Weibull/exponential location a, beta L/U, Johnson SB ξ/λ) handled exactly as in
// its untruncated methods. Parameters bounded below by 0 are optimised on the log scale, the others as they are.
// Start: the family's untruncated ML estimate on the same data (a start only; it is NOT the answer for truncated data).
// Solver: Nelder–Mead with restarts (core/optim.js). The closed-form ML/MOM/percentile/recovery methods assume
// untruncated data and are not offered when a threshold is declared.
import { nelderMead } from '../../core/optim.js';
import { truncLogLik, logMass, checkTrunc } from '../truncate.js';
import { checkBasic } from './common.js';
import { family as famOf, method as methodOf } from '../registry.js';

export const LOG_BOUND = 60;                       // |ln θ| beyond this → the optimum ran off to a boundary (tool rule)
const has = v => v != null && Number.isFinite(v);

/** Build the truncated-ML method of a family from its untruncated ML method (start values, fixed parameters). */
export function makeTML(famId, baseId) {
  const base = methodOf(baseId);
  const fixedOpts = (base.options || []).filter(o => o.type === 'fixed-param');
  return {
    id: famId + '.tml', family: famId, kind: 'fit', estimator: 'ml', solver: 'nelder-mead', dataTypes: ['raw'], likelihoodMaximised: true,
    truncation: 'conditional', needsInput: !!base.needsInput, options: fixedOpts, base: baseId,
    checkOptions: o => [...(base.checkOptions ? base.checkOptions(o) : []), ...checkTrunc(o.trunc || {})],
    source: famId + '.tml', run: (input, opts = {}) => fitTML(famId, baseId, input.d, opts),
  };
}
export function fitTML(famId, baseId, d, opts = {}) {
  const fam = famOf(famId), t = opts.trunc || {}, L = has(t.lower) ? t.lower : null, U = has(t.upper) ? t.upper : null;
  const tr = { lower: L, upper: U };
  const s0 = checkBasic(d), problems = [...checkTrunc(t), ...s0.problems];
  const out = d.filter(v => (L != null && v < L) || (U != null && v > U));
  if (out.length) problems.push({ code: 'trunc.outside', count: out.length, example: out[0], lower: L, upper: U });
  const baseRun = methodOf(baseId).run({ d }, opts);
  const meta = { fixed: baseRun.fixed || {}, settings: { ...(baseRun.settings || {}), truncLower: L, truncUpper: U, nScope: opts.nScope === 'population' ? 'population' : 'observed' }, warnings: s0.notices };
  if (problems.length) return { ...meta, status: 'invalid', problems, truncation: { ...tr } };
  if (baseRun.status !== 'ok') return { ...meta, status: 'invalid', problems: [{ code: 'trunc.nostart', base: baseId, status: baseRun.status }, ...(baseRun.problems || [])], truncation: { ...tr } };
  const fixedKeys = Object.keys(baseRun.fixed || {}), free = fam.params.filter(q => !fixedKeys.includes(q.key));
  const logScale = q => q.min === 0;                                   // positive parameters on the log scale
  const toP = x => { const p = { ...baseRun.params }; free.forEach((q, i) => { p[q.key] = logScale(q) ? Math.exp(x[i]) : x[i]; }); return p; };
  const nll = x => { if (x.some(v => !Number.isFinite(v) || Math.abs(v) > LOG_BOUND * 2)) return Infinity; const ll = truncLogLik(fam, toP(x), d, tr); return Number.isFinite(ll) ? -ll : Infinity; };
  const x0 = free.map(q => logScale(q) ? Math.log(baseRun.params[q.key]) : baseRun.params[q.key]);
  const r = nelderMead(nll, x0, { step: 0.2 });
  const p = toP(r.x), conv = { iter: r.iter, restarts: r.restarts, tol: 1e-13, tolKind: 'relative objective spread', start: baseId, transform: free.map(q => `${q.key}: ${logScale(q) ? 'log' : 'identity'}`).join(', ') };
  if (r.status !== 'ok' || !Number.isFinite(r.f)) return { ...meta, status: 'noconverge', convergence: conv, warnings: [...meta.warnings, { code: 'trunc.noconverge', why: r.status }], truncation: { ...tr } };
  if (free.some((q, i) => logScale(q) && Math.abs(r.x[i]) > LOG_BOUND)) return { ...meta, status: 'boundary', convergence: conv, warnings: [...meta.warnings, { code: 'trunc.boundary' }], truncation: { ...tr } };
  const lm = logMass(fam, p, L, U), ll = -r.f, mass = Math.exp(lm);
  return { ...meta, status: 'ok', params: p, free: free.map(q => q.key), logLik: ll, objective: { name: 'logLik (conditional)', value: ll }, convergence: conv,
    truncation: { ...tr, logMass: lm, mass, nObserved: d.length, nPopulation: d.length / mass },
    diagnostics: { pObserved: mass, nPopulation: d.length / mass, startLogLik: truncLogLik(fam, baseRun.params, d, tr) } };
}
