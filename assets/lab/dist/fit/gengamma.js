// Generalized gamma, maximum likelihood (DIST_SPEC P20). No DOM. Parameters a (shape), b (scale, cm), c > 0 (power).
// If D follows the generalized gamma, D^c follows a two-parameter gamma with shape a and scale b^c.
// So for a fixed c the ML of (a, b) is the gamma ML on x = d^c, and the likelihood is profiled over c alone:
//   ỹ_i = ln d_i − ȳ (ȳ = mean ln d),  s(c) = ln mean(e^(c ỹ)) (> 0 unless the diameters are equal),
//   a(c) solves ln a − ψ(a) = s(c)  (as in gamma.ml),   ln b(c) = ȳ + [s(c) − ln a(c)]/c,
//   ℓp(c) = n[a ln a − a − lnΓ(a) − a·s(c) + ln c] − n ȳ.
// Its derivative (envelope theorem) is the score in c:  dℓp/dc = n[1/c − a(c)·w(c)],  w(c) = Σ ỹ e^(c ỹ)/Σ e^(c ỹ).
// Solver (tool rule): ℓp on a grid of GRID points of ln c over C_RANGE, then Brent on the score between the grid
// neighbours of the best grid point. The optimum on the edge of C_RANGE, or a(c) outside the shape interval of gamma.ml,
// is reported as 'boundary' (the likelihood keeps rising towards a limiting family, e.g. the lognormal as c → 0), never
// as an estimate. The number of local maxima seen on the grid is recorded.
import { lnGamma, lnMinusDigamma } from '../../core/special.js';
import { brent } from '../../core/roots.js';
import { checkBasic } from './common.js';
import { K_RANGE } from './gamma.js';
import { gengamma } from '../families/gengamma.js';
import { logLik } from '../gof.js';

export const C_RANGE = [0.01, 100], GRID = 121;
const nonPositive = d => { const bad = d.filter(v => !(v > 0)); return bad.length ? [{ code: 'd.nonpos', count: bad.length, example: bad[0] }] : []; };

/** a with ln a − ψ(a) = s (s > 0), Brent on ln a inside K_RANGE; { a } or { side } when the root is outside. */
export function shapeFromS(s) {
  const f = t => lnMinusDigamma(Math.exp(t)) - s, L = Math.log(K_RANGE[0]), H = Math.log(K_RANGE[1]);
  if (!(s > 0)) return { side: 'above' };
  const k0 = (3 - s + Math.sqrt((s - 3) ** 2 + 24 * s)) / (12 * s);
  let lo = Math.max(L, Math.log(k0) - 1), hi = Math.min(H, Math.log(k0) + 1);
  while (f(lo) < 0 && lo > L) lo = Math.max(L, lo - 2);
  while (f(hi) > 0 && hi < H) hi = Math.min(H, hi + 2);
  if (f(lo) < 0) return { side: 'below' };
  if (f(hi) > 0) return { side: 'above' };
  const r = brent(f, lo, hi, { xtol: 1e-15 });
  return r.status === 'ok' ? { a: Math.exp(r.root) } : { side: 'noconverge' };
}
/** Profile of the log-likelihood in c for centred logs ỹ (Σ ỹ = 0); ȳ is added back by the caller. */
export function ggProfile(y, c) {
  const n = y.length; let mx = -Infinity; for (const v of y) mx = Math.max(mx, c * v);
  let S = 0, W = 0; for (const v of y) { const e = Math.exp(c * v - mx); S += e; W += v * e; }
  // s = ln mean(e^(cỹ)); for small c·|ỹ| through log1p(mean(expm1)) to keep the digits of a small s
  let s; if (c * Math.max(...y.map(Math.abs)) < 1) { let m = 0; for (const v of y) m += Math.expm1(c * v); s = Math.log1p(m / n); } else s = mx + Math.log(S / n);
  const k = shapeFromS(s);
  if (k.a == null) return { c, s, side: k.side, ell: -Infinity, score: NaN };
  const a = k.a, ell = n * (a * Math.log(a) - a - lnGamma(a) - a * s + Math.log(c));
  return { c, s, a, ell, score: n * (1 / c - a * W / S), w: W / S };
}

export function fitGGml(d) {
  const s0 = checkBasic(d), base = { settings: {}, warnings: s0.notices }, problems = [...nonPositive(d), ...s0.problems];
  if (!problems.length && s0.unique < 3) problems.push({ code: 'gg.few', unique: s0.unique });
  if (problems.length) return { ...base, status: 'invalid', problems };
  const n = d.length, ly = d.map(Math.log), ybar = ly.reduce((p, q) => p + q, 0) / n, y = ly.map(v => v - ybar);
  const T0 = Math.log(C_RANGE[0]), T1 = Math.log(C_RANGE[1]), ts = Array.from({ length: GRID }, (_, i) => T0 + (T1 - T0) * i / (GRID - 1));
  const prof = ts.map(t => ggProfile(y, Math.exp(t)));
  let best = 0; prof.forEach((q, i) => { if (q.ell > prof[best].ell) best = i; });
  let localMaxima = 0; for (let i = 0; i < GRID; i++) { const l = prof[i].ell; if (Number.isFinite(l) && (i === 0 || l > prof[i - 1].ell) && (i === GRID - 1 || l >= prof[i + 1].ell)) localMaxima++; }
  const conv = { iter: GRID, tol: 1e-14, tolKind: 'absolute on ln c', grid: GRID, cRange: C_RANGE, localMaxima, profile: 'c (a and b profiled out by the gamma ML of d^c)' };
  if (!Number.isFinite(prof[best].ell)) return { ...base, status: 'boundary', convergence: conv, warnings: [...base.warnings, { code: 'gg.ashape' }] };
  if (best === 0 || best === GRID - 1) return { ...base, status: 'boundary', convergence: conv, warnings: [...base.warnings, { code: 'gg.cedge', side: best === 0 ? 'low' : 'high', c: Math.exp(ts[best]) }] };
  const g = t => ggProfile(y, Math.exp(t)).score;
  const r = brent(g, ts[best - 1], ts[best + 1], { xtol: 1e-14 });
  if (r.status !== 'ok') return { ...base, status: 'noconverge', convergence: { ...conv, why: r.status }, warnings: [...base.warnings, { code: 'gg.noconverge', why: r.status }] };
  const q = ggProfile(y, Math.exp(r.root));
  if (q.a == null || !(q.ell >= prof[best].ell - 1e-9 * Math.max(1, Math.abs(prof[best].ell)))) return { ...base, status: 'noconverge', convergence: conv, warnings: [...base.warnings, { code: 'gg.noconverge', why: 'profile' }] };
  const p = { a: q.a, b: Math.exp(ybar + (q.s - Math.log(q.a)) / q.c), c: q.c }, ll = logLik(gengamma, p, d);
  if (!Number.isFinite(ll)) return { ...base, status: 'noconverge', convergence: conv, warnings: [...base.warnings, { code: 'gg.noconverge', why: 'nonfinite' }] };
  if (localMaxima > 1) base.warnings = [...base.warnings, { code: 'gg.multimodal', count: localMaxima }];
  return { ...base, status: 'ok', params: p, logLik: ll, objective: { name: 'logLik', value: ll }, convergence: { ...conv, iter: GRID + r.iter, score: q.score / n, profileLogLik: q.ell - n * ybar } };
}
export const ggML = {
  id: 'gengamma.ml', family: 'gengamma', kind: 'fit', estimator: 'ml', solver: 'profile', dataTypes: ['raw'], likelihoodMaximised: true, optional: true,
  options: [], source: 'gengamma.ml', run: input => fitGGml(input.d),
};
