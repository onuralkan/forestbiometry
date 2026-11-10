// Weibull direct estimation: adapter from the published tool's estimators (assets/lab/weibull/calc.js, checked
// against SciPy in tests/weibull) to the engine's result contract. The location is never estimated: it is 0
// (two-parameter form) or a value the user fixes. P05 reorganises these methods; results must stay the same.
import * as W from '../../weibull/calc.js';

function adapt(r) {
  const fixed = { a: { value: r.a, origin: r.aKind === 'fixed' ? 'user' : 'zero' } };
  const conv = { iter: r.iter ?? null, tol: 1e-14, interval: W.C_RANGE };
  if (r.status === 'problem') return { status: 'invalid', fixed, problems: r.problems, warnings: r.notices, convergence: conv };
  if (r.status !== 'ok') return { status: r.status, fixed, problems: [], warnings: [...r.notices, { code: r.status === 'boundary' ? 'c.boundary' : 'c.noconverge', side: r.side ?? null, c: r.c ?? null }], convergence: conv };
  return { status: 'ok', fixed, params: { a: r.a, b: r.b, c: r.c }, logLik: r.logLik, warnings: r.notices, convergence: conv };
}
const loc = opts => ({ a: opts.a ?? 0, kind: opts.a != null && opts.a !== 0 ? 'fixed' : (opts.aOrigin === 'user' ? 'fixed' : 'zero') });
const OPTIONS = [{ key: 'a', type: 'fixed-param', param: 'a', policies: ['zero', 'user'] }];

export const weibullML = {
  id: 'weibull.ml', family: 'weibull', kind: 'fit', estimator: 'ml', solver: 'bisection', dataTypes: ['raw'], likelihoodMaximised: true,
  options: OPTIONS, source: 'weibull.ml',
  run(input, opts = {}) { const l = loc(opts), r = adapt(W.fitML(input.d, l.a, l.kind)); if (r.status === 'ok') r.objective = { name: 'logLik', value: r.logLik }; return r; },
};
export const weibullMoments = {
  id: 'weibull.mom', family: 'weibull', kind: 'fit', estimator: 'mom', solver: 'bisection', dataTypes: ['raw'], likelihoodMaximised: false,
  options: OPTIONS, source: 'weibull.mom',
  // variance divisor: n − 1, as in the published tool; P05 makes n the default with n − 1 as an option (DIST_SPEC §0, decision 2)
  run(input, opts = {}) { const l = loc(opts), r = adapt(W.fitMoments(input.d, l.a, l.kind)); r.warnings = [...(r.warnings || []), { code: 'var.n1' }]; return r; },
};
