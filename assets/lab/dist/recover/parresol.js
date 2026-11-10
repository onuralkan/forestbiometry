// Johnson SB parameter recovery, Parresol (2003) (DIST_SPEC §3.8, stage P09). Kind 'recover', data type 'summary'.
// "Recovery of three parameters with ξ fixed": the lower bound ξ is GIVEN (by the user); λ, γ, δ are recovered.
// Parresol's species-specific regressions, his starting equations and the lower-bound extrapolation from the three
// smallest diameters are NOT part of this method.
//   Inputs: ξ (cm), mean diameter m, median M, and the quadratic mean diameter q either from N (trees/ha) and
//           G (m²/ha): q² = G/(K·N), K = π/40000, or given directly as Dq. With both, they must agree.
//   Median: γ = δ ln[(ξ + λ − M)/(M − ξ)]   (so the fitted median is M exactly; needs λ > M − ξ)
//   Moments (Z ~ N(0, 1), Y = logistic((Z − γ)/δ), u_r = E[Y^r]):
//           ξ + λ u1 = m,   ξ² + 2ξλu1 + λ²u2 = q²   → solved for λ and δ.
// Solver: two-variable Newton (finite-difference Jacobian, step halving) on s, t with λ = (M − ξ) + e^s, δ = e^t
// (positivity by construction), scaled residuals (r1 = moment 1/m − 1, r2 = moment 2/q² − 1), several starts.
// Distinct solutions are collected: one → 'ok'; several → 'multiple' (candidates, no parameters); none → 'noconverge'.
// Every accepted solution is re-checked in the original units (m, M, Dq back-calculated).
import { sbMomentsY } from '../families/johnsonsb.js';

export const K = Math.PI / 40000;                 // G (m²/ha) = K · Σd² (cm²) per ha
export const DQ_TOL = 1e-3;                       // tool rule: relative agreement of Dq from N, G with a given Dq
export const RES_TOL = 1e-12;                     // convergence on the scaled residuals
export const BACK_TOL = 1e-9;                     // re-check in original units (relative)
const fin = x => typeof x === 'number' && Number.isFinite(x);
const pos = x => fin(x) && x > 0;

/** Inputs checked and q derived. { t, problems }. */
export function parresolTargets(s = {}) {
  const problems = [], t = { origin: s.origin === 'predicted' ? 'predicted' : 'measured' };
  if (!fin(s.xi) || s.xi < 0) problems.push({ code: 'prs.xi', value: s.xi ?? null });
  for (const k of ['mean', 'median']) if (!pos(s[k])) problems.push({ code: 'wsum.missing', key: k, value: s[k] ?? null });
  const hasNG = s.nha != null || s.g != null, hasDq = s.dq != null;
  let qNG = null;
  if (hasNG) {
    if (!pos(s.nha)) problems.push({ code: 'wsum.missing', key: 'nha', value: s.nha ?? null });
    if (!pos(s.g)) problems.push({ code: 'wsum.missing', key: 'g', value: s.g ?? null });
    if (pos(s.nha) && pos(s.g)) qNG = Math.sqrt(s.g / (K * s.nha));
  }
  if (hasDq && !pos(s.dq)) problems.push({ code: 'wsum.missing', key: 'dq', value: s.dq });
  if (!hasNG && !hasDq) problems.push({ code: 'prs.noq' });
  if (problems.length) return { t, problems };
  let q = hasDq ? s.dq : qNG;
  if (hasDq && qNG != null && Math.abs(qNG / s.dq - 1) > DQ_TOL) problems.push({ code: 'prs.dqmismatch', dq: s.dq, dqNG: qNG, rel: qNG / s.dq - 1 });
  Object.assign(t, { xi: s.xi, mean: s.mean, median: s.median, dq: q, source: hasDq && qNG != null ? 'both' : hasDq ? 'dq' : 'NG' });
  if (qNG != null) Object.assign(t, { nha: s.nha, g: s.g, dqNG: qNG });
  if (!(s.mean > s.xi)) problems.push({ code: 'prs.meanbelow', mean: s.mean, xi: s.xi });
  if (!(s.median > s.xi)) problems.push({ code: 'prs.medianbelow', median: s.median, xi: s.xi });
  if (!(q > s.mean)) problems.push({ code: 'prs.dqbelow', dq: q, mean: s.mean });     // q² ≥ m², and > for a spread
  return { t, problems };
}
/** Fitted mean, median, Dq of an SB with these parameters. */
function backOf(p) {
  const u = sbMomentsY(p.gamma, p.delta), mean = p.xi + p.lambda * u.m1, m2 = p.xi * p.xi + 2 * p.xi * p.lambda * u.m1 + p.lambda * p.lambda * u.m2;
  const w = -p.gamma / p.delta, med = p.xi + p.lambda / (1 + Math.exp(-w));
  return { backMean: mean, backMedian: med, backDq: Math.sqrt(m2), backVariance: Math.max(0, m2 - mean * mean) };
}
function solveFrom(t, s0, t0) {
  const { xi, mean: m, median: M, dq: q } = t, base = M - xi;
  const par = (s, tt) => { const lambda = base + Math.exp(s), delta = Math.exp(tt); return { xi, lambda, delta, gamma: delta * Math.log((xi + lambda - M) / base) }; };
  const F = (s, tt) => { const p = par(s, tt), u = sbMomentsY(p.gamma, p.delta); return [(xi + p.lambda * u.m1) / m - 1, (xi * xi + 2 * xi * p.lambda * u.m1 + p.lambda * p.lambda * u.m2) / (q * q) - 1]; };
  let s = s0, tt = t0, f = F(s, tt), nrm = Math.hypot(...f), it = 0;
  for (it = 1; it <= 100 && nrm > RES_TOL; it++) {
    const h = 1e-7, fs = F(s + h, tt), ft = F(s, tt + h);
    const J = [[(fs[0] - f[0]) / h, (ft[0] - f[0]) / h], [(fs[1] - f[1]) / h, (ft[1] - f[1]) / h]], det = J[0][0] * J[1][1] - J[0][1] * J[1][0];
    if (!fin(det) || det === 0) return { status: 'singular', iter: it };
    const ds = -(J[1][1] * f[0] - J[0][1] * f[1]) / det, dt = -(-J[1][0] * f[0] + J[0][0] * f[1]) / det;
    let lam = 1, moved = false;
    for (let k = 0; k < 40; k++) {
      const ns = s + lam * ds, nt = tt + lam * dt; if (!fin(ns) || !fin(nt) || Math.abs(ns) > 60 || Math.abs(nt) > 30) { lam /= 2; continue; }
      const nf = F(ns, nt), nn = Math.hypot(...nf);
      if (fin(nn) && nn < nrm) { s = ns; tt = nt; f = nf; nrm = nn; moved = true; break; }
      lam /= 2;
    }
    if (!moved) break;
  }
  if (!(nrm <= RES_TOL)) return { status: 'noconverge', iter: it, nrm };
  // conditioning of the scaled system at the solution (identifiability)
  const h = 1e-6, fs = F(s + h, tt), ft = F(s, tt + h), J = [[(fs[0] - f[0]) / h, (ft[0] - f[0]) / h], [(fs[1] - f[1]) / h, (ft[1] - f[1]) / h]];
  const a = J[0][0] ** 2 + J[1][0] ** 2, b = J[0][0] * J[0][1] + J[1][0] * J[1][1], c = J[0][1] ** 2 + J[1][1] ** 2, tr = a + c, disc = Math.sqrt(Math.max(0, (a - c) ** 2 + 4 * b * b));
  const cond = Math.sqrt((tr + disc) / Math.max(tr - disc, 1e-300));
  return { status: 'ok', p: par(s, tt), iter: it, nrm, cond };
}
export const STARTS = (() => { const out = []; for (const ls of [0.25, 1, 4, 16]) for (const d of [0.3, 1, 3]) out.push([ls, d]); return out; })();   // (λ − (M − ξ))/(M − ξ), δ
export const COND_MAX = 1e8;                      // tool rule: larger condition numbers are reported as weak identifiability

export function recoverParresol(s) {
  const T = parresolTargets(s), t = T.t;
  const base = { fixed: t.xi != null ? { xi: { value: t.xi, origin: 'user' } } : {}, free: ['lambda', 'gamma', 'delta'], settings: { method: 'xi-fixed three-parameter recovery', K },
    targets: t, data: { type: 'summary', n: null } };
  if (T.problems.length) return { ...base, status: 'invalid', problems: T.problems };
  const sols = [], b0 = t.median - t.xi; let iter = 0;
  for (const [ls, d] of STARTS) {
    const r = solveFrom(t, Math.log(ls * b0), Math.log(d)); iter += r.iter || 0;
    if (r.status !== 'ok') continue;
    if (!sols.some(x => Math.abs(x.p.lambda / r.p.lambda - 1) < 1e-7 && Math.abs(x.p.delta / r.p.delta - 1) < 1e-7)) sols.push(r);
  }
  const conv = { iter, starts: STARTS.length, solutions: sols.length, tol: RES_TOL, solver: 'newton', transform: 'lambda = (M - xi) + e^s, delta = e^t', residuals: 'scaled' };
  if (!sols.length) return { ...base, status: 'noconverge', convergence: conv, warnings: [{ code: 'prs.noconverge', starts: STARTS.length }] };
  const cands = sols.map(x => ({ ...x.p, ...backOf(x.p), cond: x.cond }));
  if (cands.length > 1) return { ...base, status: 'multiple', convergence: conv, diagnostics: { candidates: cands }, warnings: [{ code: 'wsum.multiple', count: cands.length }] };
  const p = sols[0].p, bk = backOf(p), res = { mean: bk.backMean / t.mean - 1, median: bk.backMedian / t.median - 1, dq: bk.backDq / t.dq - 1 };
  const worst = Math.max(...Object.values(res).map(Math.abs)), warnings = [];
  if (sols[0].cond > COND_MAX) warnings.push({ code: 'prs.ident', cond: sols[0].cond });
  if (!(worst <= BACK_TOL)) return { ...base, status: 'noconverge', convergence: conv, diagnostics: { ...bk, residuals: res }, warnings: [{ code: 'wsum.resid', worst }] };
  return { ...base, status: 'ok', params: { xi: p.xi, lambda: p.lambda, gamma: p.gamma, delta: p.delta }, convergence: { ...conv, cond: sols[0].cond }, diagnostics: { ...bk, residuals: res, cond: sols[0].cond }, warnings };
}
export const parresolRecover = {
  id: 'johnsonsb.parresol', family: 'johnsonsb', kind: 'recover', group: 'parresol', estimator: 'recovery', solver: 'newton', dataTypes: ['summary'], likelihoodMaximised: false,
  needs: ['xi', 'mean', 'median', 'dq|nha+g'], options: [{ key: 'xi', type: 'fixed-param', param: 'xi', policies: ['user'] }], source: 'parresol2003',
  run: input => recoverParresol(input.summary || {}),
};
