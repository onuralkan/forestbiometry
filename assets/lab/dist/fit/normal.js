// Direct estimation for the normal and the two-parameter lognormal (DIST_SPEC §3.1–3.2, stage P02). Closed forms; no DOM.
//   normal.ml      μ = m, σ² = v = Σ(d − m)²/n. The method of moments gives the SAME equations (the first two moments
//                  of the normal are μ and σ²), so one method is registered, not two identical rows. σ from the n − 1
//                  sample variance is neither the ML nor the moment estimate and is not offered.
//   lognormal.ml   μ = mean(ln d), σ² = Σ(ln d − μ)²/n  (ML of ln D; the likelihood is evaluated on the diameter scale)
//   lognormal.mom  σ² = ln(1 + v/m²), μ = ln m − σ²/2 on the diameters; v with divisor n (default) or n − 1
// Measurement thresholds (truncated data) are not supported yet (P11): these closed forms assume untruncated data.
import { checkBasic, meanVar, VAR_DIVISOR } from './common.js';
import { normal } from '../families/normal.js';
import { lognormal } from '../families/lognormal.js';
import { logLik } from '../gof.js';

const nonPositive = d => { const bad = d.filter(v => !(v > 0)); return bad.length ? [{ code: 'd.nonpos', count: bad.length, example: bad[0] }] : []; };

export function fitNormal(d) {
  const s = checkBasic(d), base = { settings: {}, warnings: s.notices };
  if (s.problems.length) return { ...base, status: 'invalid', problems: s.problems };
  const { m, v } = meanVar(d, 'n'), p = { mu: m, sigma: Math.sqrt(v) }, ll = logLik(normal, p, d);
  return { ...base, status: 'ok', params: p, logLik: ll, objective: { name: 'logLik', value: ll }, targets: { mean: m, variance: v, varDivisor: 'n' }, diagnostics: normal.diagnostics(p), convergence: { iter: 0 } };
}
export function fitLognormalML(d) {
  const s = checkBasic(d), base = { settings: {}, warnings: s.notices }, problems = [...nonPositive(d), ...s.problems];
  if (problems.length) return { ...base, status: 'invalid', problems };
  const { m, v } = meanVar(d.map(Math.log), 'n'), p = { mu: m, sigma: Math.sqrt(v) }, ll = logLik(lognormal, p, d);
  return { ...base, status: 'ok', params: p, logLik: ll, objective: { name: 'logLik', value: ll }, targets: { meanLog: m, varianceLog: v, varDivisor: 'n' }, convergence: { iter: 0 } };
}
export function fitLognormalMoments(d, opts = {}) {
  const div = opts.varDivisor === 'n-1' ? 'n-1' : 'n', s = checkBasic(d);
  const base = { settings: { varDivisor: div }, warnings: [...s.notices, ...(div === 'n-1' ? [{ code: 'var.n1s' }] : [])] }, problems = [...nonPositive(d), ...s.problems];
  if (problems.length) return { ...base, status: 'invalid', problems };
  const { m, v } = meanVar(d, div), s2 = Math.log1p(v / (m * m)), p = { mu: Math.log(m) - s2 / 2, sigma: Math.sqrt(s2) };
  return { ...base, status: 'ok', params: p, logLik: logLik(lognormal, p, d), targets: { mean: m, variance: v, varDivisor: div }, convergence: { iter: 0 } };
}
export const normalML = {
  id: 'normal.ml', family: 'normal', kind: 'fit', estimator: 'ml', solver: 'closed form', dataTypes: ['raw'], likelihoodMaximised: true,
  options: [], source: 'normal.ml', run: input => fitNormal(input.d),
};
export const lognormalML = {
  id: 'lognormal.ml', family: 'lognormal', kind: 'fit', estimator: 'ml', solver: 'closed form', dataTypes: ['raw'], likelihoodMaximised: true,
  options: [], source: 'lognormal.ml', run: input => fitLognormalML(input.d),
};
export const lognormalMoments = {
  id: 'lognormal.mom', family: 'lognormal', kind: 'fit', estimator: 'mom', solver: 'closed form', dataTypes: ['raw'], likelihoodMaximised: false,
  options: [VAR_DIVISOR], source: 'lognormal.mom', run: (input, opts = {}) => fitLognormalMoments(input.d, opts),
};
