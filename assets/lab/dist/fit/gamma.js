// Direct estimation for the two-parameter gamma (DIST_SPEC §3.3, stage P03). No DOM. No location parameter: a gamma
// with a free location is a different model and is not offered here.
//   gamma.ml    s = ln m − mean(ln d) > 0;  solve ln k − ψ(k) = s for k (decreasing in k, so one root);  θ = m/k
//               solver: Brent on ln k, bracket grown from Minka's (2002) starting value; ln k − ψ(k) is evaluated
//               directly (core/special.js lnMinusDigamma), not as a difference of two large numbers
//   gamma.mom   k = m²/v, θ = v/m;  v with divisor n (default) or n − 1
// States are kept apart: non-positive diameters and too few / equal diameters → invalid; s not positive in floating
// point although the diameters differ, or k outside the search interval → boundary (overflow of the shape);
// Brent failure → noconverge. A failed ML fit never falls back to the moment estimate.
import { lnMinusDigamma } from '../../core/special.js';
import { brent } from '../../core/roots.js';
import { checkBasic, meanVar, VAR_DIVISOR } from './common.js';
import { gamma } from '../families/gamma.js';
import { logLik } from '../gof.js';

export const K_RANGE = [1e-4, 1e8];                  // search interval for the shape k (tool rule)
const nonPositive = d => { const bad = d.filter(v => !(v > 0)); return bad.length ? [{ code: 'd.nonpos', count: bad.length, example: bad[0] }] : []; };
const conv = (r, extra = {}) => ({ iter: r.iter, tol: 1e-15, tolKind: 'absolute on ln k', interval: K_RANGE, ...extra });

export function fitGammaML(d) {
  const s0 = checkBasic(d), base = { settings: {}, warnings: s0.notices }, problems = [...nonPositive(d), ...s0.problems];
  if (problems.length) return { ...base, status: 'invalid', problems };
  const n = d.length, m = d.reduce((p, q) => p + q, 0) / n, mlog = d.reduce((p, q) => p + Math.log(q), 0) / n, s = Math.log(m) - mlog;
  base.targets = { mean: m, meanLog: mlog, s };
  if (!(s > 0)) return { ...base, status: 'boundary', warnings: [...base.warnings, { code: 'k.overflow', s }] };
  const f = t => lnMinusDigamma(Math.exp(t)) - s;                                   // decreasing in t = ln k
  const k0 = (3 - s + Math.sqrt((s - 3) ** 2 + 24 * s)) / (12 * s), L = Math.log(K_RANGE[0]), H = Math.log(K_RANGE[1]);
  let lo = Math.max(L, Math.log(k0) - 1), hi = Math.min(H, Math.log(k0) + 1);
  while (f(lo) < 0 && lo > L) lo = Math.max(L, lo - 2);
  while (f(hi) > 0 && hi < H) hi = Math.min(H, hi + 2);
  if (f(lo) < 0) return { ...base, status: 'boundary', warnings: [...base.warnings, { code: 'k.boundary', side: 'below', k: K_RANGE[0] }], convergence: conv({ iter: 0 }) };
  if (f(hi) > 0) return { ...base, status: 'boundary', warnings: [...base.warnings, { code: 'k.overflow', s, side: 'above', k: K_RANGE[1] }], convergence: conv({ iter: 0 }) };
  const r = brent(f, lo, hi, { xtol: 1e-15 });
  if (r.status !== 'ok') return { ...base, status: 'noconverge', warnings: [...base.warnings, { code: 'k.noconverge', why: r.status }], convergence: conv(r) };
  const k = Math.exp(r.root), p = { k, theta: m / k }, ll = logLik(gamma, p, d);
  if (!Number.isFinite(ll)) return { ...base, status: 'noconverge', warnings: [...base.warnings, { code: 'k.noconverge', why: 'nonfinite' }], convergence: conv(r) };
  return { ...base, status: 'ok', params: p, logLik: ll, objective: { name: 'logLik', value: ll }, convergence: conv(r, { score: f(r.root), start: k0 }) };
}
export function fitGammaMoments(d, opts = {}) {
  const div = opts.varDivisor === 'n-1' ? 'n-1' : 'n', s0 = checkBasic(d);
  const base = { settings: { varDivisor: div }, warnings: [...s0.notices, ...(div === 'n-1' ? [{ code: 'var.n1s' }] : [])] }, problems = [...nonPositive(d), ...s0.problems];
  if (problems.length) return { ...base, status: 'invalid', problems };
  const { m, v } = meanVar(d, div), p = { k: m * m / v, theta: v / m };
  base.targets = { mean: m, variance: v, varDivisor: div };
  if (!(p.k > 0 && Number.isFinite(p.k) && p.theta > 0)) return { ...base, status: 'boundary', warnings: [...base.warnings, { code: 'k.overflow' }] };
  return { ...base, status: 'ok', params: p, logLik: logLik(gamma, p, d), convergence: { iter: 0 } };
}
export const gammaML = {
  id: 'gamma.ml', family: 'gamma', kind: 'fit', estimator: 'ml', solver: 'brent', dataTypes: ['raw'], likelihoodMaximised: true,
  options: [], source: 'gamma.ml', run: input => fitGammaML(input.d),
};
export const gammaMoments = {
  id: 'gamma.mom', family: 'gamma', kind: 'fit', estimator: 'mom', solver: 'closed form', dataTypes: ['raw'], likelihoodMaximised: false,
  options: [VAR_DIVISOR], source: 'gamma.mom', run: (input, opts = {}) => fitGammaMoments(input.d, opts),
};
