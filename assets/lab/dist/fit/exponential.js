// Exponential with a fixed location (DIST_SPEC §3.9, stage P10). No DOM.
//   exponential.ml   r = 1/(m − a), m = sample mean, a = 0 or a value the user fixes (never estimated, never the sample
//                    minimum). The method of moments gives the SAME equation (E[D] = a + 1/r), so one method is
//                    registered, not two identical rows (as for the normal). The estimate is the RATE r (1/cm); the
//                    scale 1/r = m − a (cm) is reported separately in diagnostics.
// Not offered: a straight line fitted to the logarithm of class frequencies (that is a regression on grouped counts,
// not the maximum likelihood estimate from the measured diameters).
import { checkSample } from './weibull.js';
import { exponential } from '../families/exponential.js';
import { logLik } from '../gof.js';

export function fitExponential(d, opts = {}) {
  const a = opts.a ?? 0, user = (opts.a != null && opts.a !== 0) || opts.aOrigin === 'user';
  const fixed = { a: { value: a, origin: user ? 'user' : 'zero' } }, s = checkSample(d, a), base = { fixed, free: ['r'], settings: {}, warnings: s.notices };
  if (s.problems.length) return { ...base, status: 'invalid', problems: s.problems };
  const m = d.reduce((p, q) => p + q, 0) / d.length, p = { a, r: 1 / (m - a) }, ll = logLik(exponential, p, d);
  return { ...base, status: 'ok', params: p, logLik: ll, objective: { name: 'logLik', value: ll }, targets: { mean: m }, diagnostics: exponential.diagnostics(p), convergence: { iter: 0 } };
}
const LOC = { key: 'a', type: 'fixed-param', param: 'a', policies: ['zero', 'user'] };
export const exponentialML = {
  id: 'exponential.ml', family: 'exponential', kind: 'fit', estimator: 'ml', solver: 'closed form', dataTypes: ['raw'], likelihoodMaximised: true,
  options: [LOC], source: 'exponential.ml', run: (input, opts = {}) => fitExponential(input.d, opts),
};
