// Nonlinear least squares (no DOM): Levenberg–Marquardt with Marquardt's diagonal scaling and Nielsen's damping update,
// small dense linear algebra and the asymptotic covariance σ̂²(JᵀJ)⁻¹. Definitions: docs/METHODS.md §10.
// Checked against SciPy least_squares / curve_fit in tests/hd/test_hd.mjs.

/** Solves the symmetric system M x = v (p ≤ ~10) by Gauss–Jordan with partial pivoting. Returns null when singular. */
export function solve(M, v) {
  const p = v.length, A = M.map((r, i) => [...r, v[i]]);
  const scale = Math.max(...M.map((r, i) => Math.abs(r[i]))) || 1;
  for (let c = 0; c < p; c++) {
    let piv = c; for (let r = c + 1; r < p; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    if (!(Math.abs(A[piv][c]) > 1e-14 * scale)) return null;
    [A[c], A[piv]] = [A[piv], A[c]];
    for (let r = 0; r < p; r++) if (r !== c) { const k = A[r][c] / A[c][c]; for (let j = c; j <= p; j++) A[r][j] -= k * A[c][j]; }
  }
  return A.map((r, i) => r[p] / r[i]);
}
/** Inverse of a small symmetric matrix (null when singular). */
export function inverse(M) {
  const p = M.length, cols = [];
  for (let j = 0; j < p; j++) { const e = Array(p).fill(0); e[j] = 1; const c = solve(M, e); if (!c) return null; cols.push(c); }
  return M.map((_, i) => cols.map(c => c[i]));
}

/** Sum of squares, JᵀJ and Jᵀr at theta. model = { f(θ, x), grad(θ, x) → [∂f/∂θ_j] }. */
function evalAt(model, theta, x, y) {
  const n = x.length, p = theta.length, A = Array.from({ length: p }, () => Array(p).fill(0)), g = Array(p).fill(0);
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const fi = model.f(theta, x[i]); if (!Number.isFinite(fi)) return null;
    const r = y[i] - fi, J = model.grad(theta, x[i]);
    sse += r * r;
    for (let j = 0; j < p; j++) { if (!Number.isFinite(J[j])) return null; g[j] += J[j] * r; for (let k = 0; k <= j; k++) A[j][k] += J[j] * J[k]; }
  }
  for (let j = 0; j < p; j++) for (let k = 0; k < j; k++) A[k][j] = A[j][k];
  return { sse, A, g };
}
function sseAt(model, theta, x, y) {
  let s = 0;
  for (let i = 0; i < x.length; i++) { const fi = model.f(theta, x[i]); if (!Number.isFinite(fi)) return Infinity; const r = y[i] - fi; s += r * r; }
  return s;
}

/**
 * Levenberg–Marquardt. opts: { maxIter = 500, xtol = 1e-10, ftol = 1e-14, gtol = 1e-8, valid(θ) → bool, blowup(θ) → bool }.
 * status: 'ok' (converged), 'noconverge' (iteration limit or damping exhausted), 'diverged' (blowup(θ) became true),
 *         'invalid' (model undefined at the start).
 * Convergence (any): relative step ‖δ‖∞ ≤ xtol·(‖θ‖∞ + xtol); relative decrease of SSE ≤ ftol on an accepted step together with
 * relative step ≤ 1e-6; scaled gradient max_j |gⱼ| / √(Aⱼⱼ·SSE) ≤ gtol (the cosine between the residual vector and each Jacobian
 * column, as in MINPACK/SciPy). If every further step is rejected (damping exhausted, no decrease possible in floating point),
 * the point counts as converged only when that scaled gradient is ≤ 1e-6; otherwise 'noconverge'.
 */
export function levenbergMarquardt(model, x, y, theta0, opts = {}) {
  const maxIter = opts.maxIter ?? 500, xtol = opts.xtol ?? 1e-10, ftol = opts.ftol ?? 1e-14, gtol = opts.gtol ?? 1e-8;
  const valid = opts.valid || (() => true), blowup = opts.blowup || (() => false);
  let theta = theta0.slice(), cur = valid(theta) ? evalAt(model, theta, x, y) : null;
  if (!cur) return { status: 'invalid', theta, sse: null, iter: 0 };
  const p = theta.length;
  let lambda = 1e-3 * Math.max(...cur.A.map((r, i) => r[i])), nu = 2, iter = 0;
  const gradOk = s => cur.g.every((gj, j) => Math.abs(gj) <= gtol * Math.sqrt(Math.max(cur.A[j][j], 1e-300) * Math.max(s, 1e-300)));
  if (gradOk(cur.sse)) return { status: 'ok', theta, sse: cur.sse, iter: 0, reason: 'gradient' };
  while (iter < maxIter) {
    iter++;
    const D = cur.A.map((r, i) => Math.max(r[i], 1e-12 * (Math.max(...cur.A.map((q, k) => q[k])) || 1)));
    const M = cur.A.map((r, i) => r.map((v, j) => i === j ? v + lambda * D[i] : v));
    const delta = solve(M, cur.g);
    if (!delta) { lambda *= nu; nu *= 2; if (lambda > 1e30) break; continue; }
    const cand = theta.map((t, j) => t + delta[j]);
    const sNew = valid(cand) ? sseAt(model, cand, x, y) : Infinity;
    const pred = delta.reduce((s, d, j) => s + d * (lambda * D[j] * d + cur.g[j]), 0);
    const rho = Number.isFinite(sNew) && pred > 0 ? (cur.sse - sNew) / pred : -1;
    const stepRel = Math.max(...delta.map(Math.abs)) / (Math.max(...theta.map(Math.abs)) + xtol);
    if (rho > 0) {
      const old = cur.sse;
      theta = cand; cur = evalAt(model, theta, x, y);
      if (!cur) return { status: 'noconverge', theta, sse: sNew, iter, reason: 'undefined' };
      lambda *= Math.max(1 / 3, 1 - (2 * rho - 1) ** 3); nu = 2;
      if (blowup(theta)) return { status: 'diverged', theta, sse: cur.sse, iter };
      if (stepRel <= xtol) return { status: 'ok', theta, sse: cur.sse, iter, reason: 'step' };
      if ((old - cur.sse) <= ftol * old && stepRel <= 1e-6) return { status: 'ok', theta, sse: cur.sse, iter, reason: 'sse' };
      if (gradOk(cur.sse)) return { status: 'ok', theta, sse: cur.sse, iter, reason: 'gradient' };
    } else {
      lambda *= nu; nu *= 2;
      if (lambda > 1e30) {
        const stalledOk = cur.g.every((gj, j) => Math.abs(gj) <= 1e-6 * Math.sqrt(Math.max(cur.A[j][j], 1e-300) * Math.max(cur.sse, 1e-300)));
        if (stalledOk && !blowup(theta)) return { status: 'ok', theta, sse: cur.sse, iter, reason: 'stalled' };
        break;
      }
    }
  }
  return { status: blowup(theta) ? 'diverged' : 'noconverge', theta, sse: cur.sse, iter, reason: iter >= maxIter ? 'maxiter' : 'damping' };
}

/** Asymptotic covariance V = σ̂²(JᵀJ)⁻¹ with σ̂² = SSE/(n − p). null when n ≤ p or JᵀJ is singular. */
export function covariance(model, theta, x, sse) {
  const n = x.length, p = theta.length;
  if (n <= p) return null;
  const A = Array.from({ length: p }, () => Array(p).fill(0));
  for (let i = 0; i < n; i++) { const J = model.grad(theta, x[i]); for (let j = 0; j < p; j++) for (let k = 0; k < p; k++) A[j][k] += J[j] * J[k]; }
  const inv = inverse(A); if (!inv) return null;
  const s2 = sse / (n - p), V = inv.map(r => r.map(v => v * s2));
  if (V.some((r, i) => !(r[i] > 0))) return null;
  return { V, s2, se: V.map((r, i) => Math.sqrt(r[i])), corr: V.map((r, i) => r.map((v, j) => v / Math.sqrt(V[i][i] * V[j][j]))) };
}
/** gᵀVg for the gradient of the mean function at x (delta method). */
export function quadForm(V, g) { let s = 0; for (let i = 0; i < g.length; i++) for (let j = 0; j < g.length; j++) s += g[i] * V[i][j] * g[j]; return s; }

/** Ordinary least squares y = b0 + b1·x (needs ≥ 2 distinct x). */
export function ols(x, y) {
  const n = x.length; if (n < 2) return null;
  let mx = 0, my = 0; for (let i = 0; i < n; i++) { mx += x[i]; my += y[i]; } mx /= n; my /= n;
  let sxx = 0, sxy = 0; for (let i = 0; i < n; i++) { sxx += (x[i] - mx) ** 2; sxy += (x[i] - mx) * (y[i] - my); }
  if (!(sxx > 0)) return null;
  const b1 = sxy / sxx; return [my - b1 * mx, b1];
}
