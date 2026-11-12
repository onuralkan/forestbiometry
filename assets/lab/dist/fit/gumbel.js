// Gumbel (maximum form) direct estimation (DIST_SPEC P20, NIST [R19]). No DOM. μ location (cm), β > 0 scale (cm).
//   gumbel.ml   the ML equations  β = d̄ − Σ d e^(−d/β) / Σ e^(−d/β),  μ = −β ln[(1/n) Σ e^(−d/β)].
//               h(β) = β − d̄ + Σ d w/Σ w (w = e^(−(d − d_min)/β), shifted so that no weight overflows) has derivative
//               1 + var_w(d)/β² > 0 and runs from d_min − d̄ < 0 (β → 0) to +∞: one root, Brent on a bracket grown
//               from the moment estimate.
//   gumbel.mom  β = √(6v)/π,  μ = d̄ − γ_E β;  v with divisor n (default) or n − 1.
// Every result reports the probability of a diameter below zero, F(0) = exp[−exp(μ/β)] (support: all real numbers).
// Measurement thresholds: the conditional likelihood (gumbel.tml, P11 machinery), never these untruncated equations.
import { brent } from '../../core/roots.js';
import { checkBasic, meanVar, VAR_DIVISOR } from './common.js';
import { gumbel, EULER_GAMMA } from '../families/gumbel.js';
import { logLik } from '../gof.js';

const done = (base, p, d, extra = {}) => ({ ...base, status: 'ok', params: p, logLik: logLik(gumbel, p, d), diagnostics: gumbel.diagnostics(p), ...extra });
/** Moment estimate (also the start of ML). */
export const gumbelMomParams = (m, v) => { const beta = Math.sqrt(6 * v) / Math.PI; return { mu: m - EULER_GAMMA * beta, beta }; };

export function fitGumbelMoments(d, opts = {}) {
  const div = opts.varDivisor === 'n-1' ? 'n-1' : 'n', s = checkBasic(d);
  const base = { settings: { varDivisor: div }, warnings: [...s.notices, ...(div === 'n-1' ? [{ code: 'var.n1s' }] : [])] };
  if (s.problems.length) return { ...base, status: 'invalid', problems: s.problems };
  const { m, v } = meanVar(d, div);
  return done(base, gumbelMomParams(m, v), d, { targets: { mean: m, variance: v, varDivisor: div }, convergence: { iter: 0 } });
}
export function fitGumbelML(d) {
  const s = checkBasic(d), base = { settings: {}, warnings: s.notices };
  if (s.problems.length) return { ...base, status: 'invalid', problems: s.problems };
  const n = d.length, { m, v } = meanVar(d, 'n'), mn = s.min, x = d.map(q => q - mn), xbar = m - mn;
  const wsum = beta => { let W = 0, WX = 0; for (const q of x) { const w = Math.exp(-q / beta); W += w; WX += q * w; } return { W, WX }; };
  const h = beta => { const r = wsum(beta); return beta - xbar + r.WX / r.W; };
  const b0 = gumbelMomParams(m, v).beta; let lo = b0 / 2, hi = b0 * 2, k = 0;
  while (h(lo) > 0 && k++ < 200) lo /= 2;
  k = 0; while (h(hi) < 0 && k++ < 200) hi *= 2;
  const r = brent(h, lo, hi, { xtol: 1e-15 * b0 });
  const conv = { iter: r.iter, tol: 1e-15, tolKind: 'relative on β (moment estimate)', start: { beta: b0, from: 'moments' } };
  if (r.status !== 'ok' || !(r.root > 0)) return { ...base, status: 'noconverge', convergence: conv, warnings: [...base.warnings, { code: 'gb.noconverge', why: r.status }] };
  const beta = r.root, mu = mn - beta * Math.log(wsum(beta).W / n), out = done(base, { mu, beta }, d, { convergence: { ...conv, score: h(beta) / beta } });
  out.objective = { name: 'logLik', value: out.logLik };
  return out;
}
const fit = { family: 'gumbel', kind: 'fit', dataTypes: ['raw'], optional: true };
export const gumbelML = { ...fit, id: 'gumbel.ml', estimator: 'ml', solver: 'brent', likelihoodMaximised: true, options: [], source: 'gumbel.ml', run: i => fitGumbelML(i.d) };
export const gumbelMoments = { ...fit, id: 'gumbel.mom', estimator: 'mom', solver: 'closed form', likelihoodMaximised: false, options: [VAR_DIVISOR], source: 'gumbel.mom', run: (i, o = {}) => fitGumbelMoments(i.d, o) };
