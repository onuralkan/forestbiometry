// Johnson SB all-parameter recovery, Fonseca, Marques and Parresol (2009) (DIST_SPEC P19). Kind 'recover', data type
// 'summary'. A method apart from Parresol (2003) (johnsonsb.parresol, ξ given): here ξ, λ, γ and δ are all recovered.
//   Inputs: median d50, mean d̄ (= m1), Dq (m2 = Dq²) and the basal-area-weighted mean diameter d̄_G = Σg·d / Σg
//           (= m3/m2, so m3 = d̄_G·Dq²). m3 is never made up from the mean and the variance.
//   Equations (source, eqs 6, 7, 9 and 11): γ = δ ln(1/y50 − 1), y50 = (d50 − ξ)/λ   (eliminates γ; the fitted median is d50)
//           ξ + λμ′1 = d̄,   ξ² + 2ξλμ′1 + λ²μ′2 = Dq²,   ξ³ + 3ξ²λμ′1 + 3ξλ²μ′2 + λ³μ′3 = d̄_G·Dq²
//           μ′r = E[Y^r], Y = logistic((Z − γ)/δ), Z ~ N(0, 1)  (johnsonsb.js sbMomentsY, quadrature).
// The source solves the three equations by a three-dimensional Levenberg–Marquardt with constraints "designed by
// optimisation theory" (details in Parresol et al. 2009, not read). Here, as tool rules:
//   region: 0 ≤ ξ < d50 (diameters are positive), λ > d50 − ξ, δ > 0, by construction: ξ = d50·σ(a), λ = (d50 − ξ)(1 + eᵇ),
//           δ = eᶜ (σ logistic);
//   solver: Newton with step halving on the scaled residuals (moment/target − 1), finite-difference Jacobian, from a
//           fixed grid of starts; every distinct converged solution is kept;
//   checks: moment admissibility (Dq > d̄; d̄_G·d̄ > Dq², i.e. m3·m1 > m2² for a positive variable); symmetric input
//           (d50 = d̄: the source notes that the method then reduces to three equations); conditioning of the
//           Jacobian at the solution (rank); one solution → ok, several → multiple (no parameters, candidates
//           listed), none → noconverge; a weakly determined solution (condition number above COND_MAX) is not given as a
//           single answer.
import { sbMomentsY } from '../families/johnsonsb.js';

export const RES_TOL = 1e-12, BACK_TOL = 1e-9, COND_MAX = 1e8, SYM_TOL = 1e-9;
const fin = x => typeof x === 'number' && Number.isFinite(x), pos = x => fin(x) && x > 0;
const sig = a => 1 / (1 + Math.exp(-a));

/** Inputs checked; m3 from d̄_G·Dq². { t, problems }. */
export function fonsecaTargets(s = {}) {
  const problems = [], t = { origin: s.origin === 'predicted' ? 'predicted' : 'measured' };
  for (const k of ['mean', 'median', 'dq', 'dg']) if (!pos(s[k])) problems.push({ code: 'wsum.missing', key: k, value: s[k] ?? null });
  if (problems.length) return { t, problems };
  Object.assign(t, { mean: s.mean, median: s.median, dq: s.dq, dg: s.dg, m1: s.mean, m2: s.dq * s.dq, m3: s.dg * s.dq * s.dq });
  if (s.from) t.from = s.from;
  if (!(s.dq > s.mean)) problems.push({ code: 'prs.dqbelow', dq: s.dq, mean: s.mean });
  if (!(t.m3 * t.m1 > t.m2 * t.m2)) problems.push({ code: 'fns.m3', dg: s.dg, min: t.m2 / t.m1 });
  if (Math.abs(s.median - s.mean) <= SYM_TOL * s.dq) problems.push({ code: 'fns.symmetric' });
  return { t, problems };
}
const params = (t, x) => { const xi = t.median * sig(x[0]), lambda = (t.median - xi) * (1 + Math.exp(x[1])), delta = Math.exp(x[2]);
  return { xi, lambda, delta, gamma: delta * Math.log((xi + lambda - t.median) / (t.median - xi)) }; };
function moments(p) { const u = sbMomentsY(p.gamma, p.delta), x = p.xi, l = p.lambda;
  return { u, m1: x + l * u.m1, m2: x * x + 2 * x * l * u.m1 + l * l * u.m2, m3: x ** 3 + 3 * x * x * l * u.m1 + 3 * x * l * l * u.m2 + l ** 3 * u.m3 }; }
const resid = (t, x) => { const m = moments(params(t, x)); return [m.m1 / t.m1 - 1, m.m2 / t.m2 - 1, m.m3 / t.m3 - 1]; };
const norm = v => Math.hypot(...v);
function solve3(A, b) {          // Cramer's rule for 3×3
  const det = M => M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]);
  const d = det(A); if (!fin(d) || d === 0) return null;
  return [0, 1, 2].map(j => det(A.map((r, i) => r.map((v, k) => k === j ? b[i] : v))) / d);
}
const jac = (t, x, f, h = 1e-7) => { const J = [[], [], []]; for (let j = 0; j < 3; j++) { const y = x.slice(); y[j] += h; const g = resid(t, y); for (let i = 0; i < 3; i++) J[i][j] = (g[i] - f[i]) / h; } return J; };
/** Condition number of a 3×3 matrix (singular values from the eigenvalues of JᵀJ, Jacobi rotations). */
export function cond3(J) {
  const A = [0, 1, 2].map(i => [0, 1, 2].map(j => J[0][i] * J[0][j] + J[1][i] * J[1][j] + J[2][i] * J[2][j]));
  for (let sweep = 0; sweep < 50; sweep++) {
    let off = 0; for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) off += A[i][j] ** 2; if (off < 1e-30) break;
    for (let p = 0; p < 3; p++) for (let q = p + 1; q < 3; q++) { if (Math.abs(A[p][q]) < 1e-300) continue;
      const th = (A[q][q] - A[p][p]) / (2 * A[p][q]), tt = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(tt * tt + 1), s = tt * c;
      for (let k = 0; k < 3; k++) { const akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s * akq; A[k][q] = s * akp + c * akq; }
      for (let k = 0; k < 3; k++) { const apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s * aqk; A[q][k] = s * apk + c * aqk; } }
  }
  const ev = [A[0][0], A[1][1], A[2][2]].map(v => Math.max(v, 0));
  return Math.sqrt(Math.max(...ev) / Math.max(Math.min(...ev), 1e-300));
}
function solveFrom(t, x0) {
  let x = x0.slice(), f = resid(t, x), n = norm(f), it = 0;
  if (!f.every(fin)) return { status: 'undefined' };
  for (it = 1; it <= 100 && n > RES_TOL; it++) {
    const J = jac(t, x, f), d = solve3(J, f.map(v => -v)); if (!d) return { status: 'singular', iter: it };
    let lam = 1, moved = false;
    for (let k = 0; k < 40; k++) { const y = x.map((v, j) => v + lam * d[j]);
      if (y.every(v => fin(v) && Math.abs(v) < 40)) { const g = resid(t, y), m = norm(g); if (g.every(fin) && m < n) { x = y; f = g; n = m; moved = true; break; } }
      lam /= 2; }
    if (!moved) break;
  }
  if (!(n <= RES_TOL)) return { status: 'noconverge', iter: it, nrm: n };
  return { status: 'ok', x, p: params(t, x), iter: it, nrm: n, cond: cond3(jac(t, x, f, 1e-6)) };
}
export const STARTS = (() => { const o = []; for (const s of [0.1, 0.4, 0.7, 0.9]) for (const r of [0.25, 1, 4, 16]) for (const d of [0.3, 1, 3]) o.push([Math.log(s / (1 - s)), Math.log(r), Math.log(d)]); return o; })();
function back(p) { const m = moments(p), w = -p.gamma / p.delta;
  return { backMean: m.m1, backMedian: p.xi + p.lambda * sig(w), backDq: Math.sqrt(m.m2), backDg: m.m3 / m.m2, backVariance: Math.max(0, m.m2 - m.m1 * m.m1) }; }

export function recoverFonseca(s) {
  const T = fonsecaTargets(s), t = T.t;
  const base = { free: ['xi', 'lambda', 'gamma', 'delta'], settings: { method: 'all-parameter recovery (median and three noncentral moments)', region: '0 <= xi < d50, lambda > d50 - xi, delta > 0' }, targets: t, data: { type: 'summary', n: null } };
  if (T.problems.length) return { ...base, status: 'invalid', problems: T.problems };
  const sols = []; let iter = 0;
  for (const x0 of STARTS) { const r = solveFrom(t, x0); iter += r.iter || 0; if (r.status !== 'ok') continue;
    if (!sols.some(q => ['xi', 'lambda', 'delta'].every(k => Math.abs(q.p[k] - r.p[k]) <= 1e-6 * Math.max(1, Math.abs(r.p[k]))))) sols.push(r); }
  const conv = { iter, starts: STARTS.length, solutions: sols.length, tol: RES_TOL, solver: 'newton', transform: 'xi = d50·logistic(a), lambda = (d50 - xi)(1 + e^b), delta = e^c', residuals: 'scaled', condMax: COND_MAX };
  if (!sols.length) return { ...base, status: 'noconverge', convergence: conv, warnings: [{ code: 'prs.noconverge', starts: STARTS.length }] };
  const cands = sols.map(q => ({ ...q.p, ...back(q.p), cond: q.cond }));
  if (cands.length > 1) return { ...base, status: 'multiple', convergence: conv, diagnostics: { candidates: cands }, warnings: [{ code: 'wsum.multiple', count: cands.length }] };
  const q = sols[0], bk = back(q.p), res = { mean: bk.backMean / t.mean - 1, median: bk.backMedian / t.median - 1, dq: bk.backDq / t.dq - 1, dg: bk.backDg / t.dg - 1 };
  if (!(q.cond <= COND_MAX)) return { ...base, status: 'invalid', convergence: { ...conv, cond: q.cond }, diagnostics: { candidates: cands }, problems: [{ code: 'fns.weak', cond: q.cond }] };
  const worst = Math.max(...Object.values(res).map(Math.abs));
  if (!(worst <= BACK_TOL)) return { ...base, status: 'noconverge', convergence: conv, diagnostics: { ...bk, residuals: res }, warnings: [{ code: 'wsum.resid', worst }] };
  return { ...base, status: 'ok', params: { xi: q.p.xi, lambda: q.p.lambda, gamma: q.p.gamma, delta: q.p.delta }, convergence: { ...conv, cond: q.cond }, diagnostics: { ...bk, residuals: res, cond: q.cond } };
}
/** Targets from raw diameters: mean, median (type 7), Dq, d̄_G = Σd³/Σd² (basal area ∝ d²). */
export function fonsecaFromRaw(d, quantile7) {
  const s = [...d].sort((a, b) => a - b), n = s.length; let s1 = 0, s2 = 0, s3 = 0;
  for (const v of s) { s1 += v; s2 += v * v; s3 += v * v * v; }
  return { mean: s1 / n, median: quantile7(s, 0.5), dq: Math.sqrt(s2 / n), dg: s3 / s2 };
}
export const fonsecaRecover = {
  id: 'johnsonsb.fonseca', family: 'johnsonsb', kind: 'recover', group: 'fonseca', estimator: 'recovery', solver: 'newton', dataTypes: ['summary'], likelihoodMaximised: false,
  needs: ['mean', 'median', 'dq', 'dg'], options: [], source: 'fonseca2009',
  run: input => recoverFonseca(input.summary || {}),
};
