// Mixed-effects models (PLATFORM_PLAN SM-03, 17 Nov 2026; user decisions: linear and nonlinear mixed models together,
// calibration of a new group, variance and covariance structures, model comparison, coefficient library). No DOM.
// METHODS §27. Sources [B]: Pinheiro, J.C., Bates, D.M. 2000. Mixed-Effects Models in S and S-PLUS. Springer:
//  LME (§2.2, Eq. 2.4–2.23): y_i = X_iβ + Z_ib_i + ε_i, b_i ~ N(0, Ψ), ε_i ~ N(0, σ²Λ_i); marginal form (2.14) y_i ~
//  N(X_iβ, σ²Σ_i), Σ_i = Λ_i + Z_iΨZ_iᵀ/σ²; β̂(θ) = (ΣXᵀΣ⁻¹X)⁻¹ΣXᵀΣ⁻¹y; σ̂² = rᵀΣ⁻¹r/N (ML) or /(N − p) (REML);
//  ML log-likelihood −N/2·log(2πσ²) − rᵀΣ⁻¹r/(2σ²) − ½Σlog|Σ_i|; REML −(N − p)/2·log(2πσ²) − rᵀΣ⁻¹r/(2σ²) −
//  ½Σlog|Σ_i| − ½log|ΣXᵀΣ⁻¹X| (2.23; |R00|² = |ΣXᵀΣ⁻¹X|, Σlog(|Δ|/|R11(i)|) = −½Σlog|Σ_i|); profiled on β and σ²,
//  optimized over θ (relative covariance and variance parameters). Variance function power of a covariate (§5.2):
//  Var(ε_ij) = σ²|v_ij|^(2δ). Random-effect predictions (BLUP) b̂_i = ΨZ_iᵀ(σ²Σ_i)⁻¹(y_i − X_iβ̂).
//  NLME (§7.2, Eq. 7.10–7.13; Lindstrom and Bates 1990, Biometrics 46: 673–687): alternating PNLS step (β and the
//  conditional modes b_i minimizing Σ[‖y_i − f_i(β, b_i)‖²_Λ + ‖Δb_i‖²] for fixed Δ) and LME step (the LME likelihood
//  of the working response ŵ_i = y_i − f_i + X̂_iβ̂ + Ẑ_ib̂_i with X̂_i = ∂f_i/∂βᵀ, Ẑ_i = ∂f_i/∂b_iᵀ, maximized over the
//  variance–covariance parameters); repeated to convergence; the log-likelihood, AIC and BIC of the final LME step.
// Calibration of a new group ([A], Vonesh and Chinchilli 1997 as given by Raptis et al. 2021, Trees 35: 1167–1183, and
//  Ciceu et al. 2020, For. Ecol. Manage. 477: 118507): b̂ ≈ DẐᵀ(R̂ + ẐDẐᵀ)⁻¹ê, Ẑ = ∂f/∂b at b = 0, ê = y − f(β̂, 0)
//  (exact BLUP for a linear model); option (tool rule): the conditional mode, iterating that step (PNLS with β̂ fixed).
// AIC = −2ℓ + 2k, BIC = −2ℓ + k·ln(N) (ML) or ln(N − p) (REML, as nlme); k = fixed effects + covariance parameters +
// variance parameters + 1 (σ). Likelihood-ratio test 2(ℓ1 − ℓ0) against χ² with the difference in k (ML fits only).
import { gammaQ } from '../core/stats.js';
import { parse as parseExpr, evaluate as evalExpr, evalGrad as gradExpr, toText as exprText } from '../core/expr.js';
import { registerForm, form as coefForm } from '../core/coef.js';

export const TOOL = { id: 'karma-modeller', version: '1.0.0-beta.1' };
const fin = x => typeof x === 'number' && Number.isFinite(x);

/* ---------- small dense linear algebra ---------- */
/** Cholesky factor L (lower) of a symmetric positive definite matrix; null if not positive definite. */
export function chol(A) {
  const n = A.length, L = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let s = A[i][j]; for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
    if (i === j) { if (!(s > 0)) return null; L[i][i] = Math.sqrt(s); } else L[i][j] = s / L[j][j];
  }
  return L;
}
const fwd = (L, b) => { const n = L.length, x = new Array(n); for (let i = 0; i < n; i++) { let s = b[i]; for (let k = 0; k < i; k++) s -= L[i][k] * x[k]; x[i] = s / L[i][i]; } return x; };
const bwd = (L, b) => { const n = L.length, x = new Array(n); for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k]; x[i] = s / L[i][i]; } return x; };
/** Solves A x = b with A's Cholesky factor. */
export const cholSolve = (L, b) => bwd(L, fwd(L, b));
const logdetL = L => 2 * L.reduce((s, r, i) => s + Math.log(r[i]), 0);
export function inv(A) { const L = chol(A); if (!L) return null; const n = A.length; const cols = []; for (let j = 0; j < n; j++) { const e = new Array(n).fill(0); e[j] = 1; cols.push(cholSolve(L, e)); } return A.map((_, i) => cols.map(c => c[i])); }
const matmul = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
const tr = A => A[0].map((_, j) => A.map(r => r[j]));

/* ---------- covariance parameterizations ---------- */
/** Relative covariance Ψ̃ (q × q) from parameters: 'diag' log standard deviations; 'symm' log-Cholesky (P&B §2.2.7). */
export function psiOf(kind, q, th) {
  if (kind === 'diag') return Array.from({ length: q }, (_, i) => Array.from({ length: q }, (_, j) => i === j ? Math.exp(2 * th[i]) : 0));
  const L = Array.from({ length: q }, () => new Array(q).fill(0)); let k = 0;
  for (let i = 0; i < q; i++) for (let j = 0; j <= i; j++) L[i][j] = i === j ? Math.exp(th[k++]) : th[k++];
  return matmul(L, tr(L));
}
export const nPsi = (kind, q) => kind === 'diag' ? q : q * (q + 1) / 2;
/** Parameters giving Ψ̃ (inverse of psiOf; Ψ̃ must be positive definite). */
export function thetaOfPsi(kind, P) {
  if (kind === 'diag') return P.map((r, i) => 0.5 * Math.log(r[i]));
  const L = chol(P); const th = []; for (let i = 0; i < P.length; i++) for (let j = 0; j <= i; j++) th.push(i === j ? Math.log(L[i][i]) : L[i][j]); return th;
}

/* ---------- LME likelihood for given θ ---------- */
/**
 * groups: [{ y: [n], X: [n × p], Z: [n × q], v: [n] (variance covariate; ignored when no power) }].
 * spec = { cov: 'diag'|'symm', q, power: bool, method: 'ML'|'REML' }; theta = [Ψ̃ params…, δ?].
 * → { ll, beta, sigma2, A (ΣXᵀΣ⁻¹X), Ls (Cholesky of Σ_i), Psi } | null
 */
export function lmeLik(groups, spec, theta) {
  const q = spec.q, np = nPsi(spec.cov, q), Psi = psiOf(spec.cov, q, theta.slice(0, np)), delta = spec.power ? theta[np] : 0;
  const p = groups[0].X[0].length, A = Array.from({ length: p }, () => new Array(p).fill(0)), c = new Array(p).fill(0);
  let N = 0, ldet = 0; const Ls = [];
  for (const g of groups) {
    const n = g.y.length; N += n;
    const S = Array.from({ length: n }, (_, a) => Array.from({ length: n }, (_, b) => {
      let s = 0; for (let k = 0; k < q; k++) for (let l = 0; l < q; l++) s += g.Z[a][k] * Psi[k][l] * g.Z[b][l];
      return s + (a === b ? (spec.power ? Math.abs(g.v[a]) ** (2 * delta) : 1) : 0);
    }));
    const L = chol(S); if (!L) return null; Ls.push(L); ldet += logdetL(L);
    const SX = tr(g.X).map(col => cholSolve(L, col));   // p × n
    for (let a = 0; a < p; a++) { c[a] += SX[a].reduce((s, v, t) => s + v * g.y[t], 0); for (let b = 0; b < p; b++) A[a][b] += SX[a].reduce((s, v, t) => s + v * g.X[t][b], 0); }
  }
  const LA = chol(A); if (!LA) return null;
  const beta = cholSolve(LA, c);
  let rss = 0;
  for (const [i, g] of groups.entries()) { const r = g.y.map((v, t) => v - g.X[t].reduce((s, x, k) => s + x * beta[k], 0)); const Sr = cholSolve(Ls[i], r); rss += r.reduce((s, v, t) => s + v * Sr[t], 0); }
  const reml = spec.method === 'REML', dfr = reml ? N - p : N, sigma2 = rss / dfr;
  let ll = -dfr / 2 * Math.log(2 * Math.PI * sigma2) - dfr / 2 - ldet / 2;
  if (reml) ll -= logdetL(LA) / 2;
  return { ll, beta, sigma2, A, Ls, Psi, delta, N, p };
}

/* ---------- optimizer: BFGS with central-difference gradients and backtracking ---------- */
export function bfgs(fn, x0, { maxIter = 600, gtol = 1e-9, h = 1e-6 } = {}) {
  const n = x0.length, f = x => { const v = fn(x); return Number.isFinite(v) ? v : Infinity; };
  const grad = x => x.map((_, i) => { const e = x.slice(), d = x.slice(); e[i] += h; d[i] -= h; return (f(e) - f(d)) / (2 * h); });
  let x = x0.slice(), fx = f(x); if (!Number.isFinite(fx)) return { x, f: fx, ok: false, iter: 0 };
  let g = grad(x), H = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 1 : 0)), it = 0;
  for (; it < maxIter; it++) {
    if (Math.max(...g.map(Math.abs)) < gtol) break;
    let d = H.map(r => -r.reduce((s, v, j) => s + v * g[j], 0)), slope = d.reduce((s, v, i) => s + v * g[i], 0);
    if (!(slope < 0)) { H = H.map((r, i) => r.map((_, j) => i === j ? 1 : 0)); d = g.map(v => -v); slope = -g.reduce((s, v) => s + v * v, 0); }
    let t = 1, xn, fn2;
    for (let k = 0; k < 60; k++) { xn = x.map((v, i) => v + t * d[i]); fn2 = f(xn); if (fn2 <= fx + 1e-4 * t * slope) break; t /= 2; }
    if (!(fn2 < fx)) break;
    const gn = grad(xn), s = xn.map((v, i) => v - x[i]), y = gn.map((v, i) => v - g[i]), sy = s.reduce((a, v, i) => a + v * y[i], 0);
    const small = Math.abs(fx - fn2) <= 1e-14 * Math.max(1, Math.abs(fx)) && Math.max(...s.map(Math.abs)) < 1e-10;
    x = xn; fx = fn2; g = gn;
    if (sy > 1e-12) {
      const Hy = H.map(r => r.reduce((a, v, j) => a + v * y[j], 0)), yHy = y.reduce((a, v, i) => a + v * Hy[i], 0);
      H = H.map((r, i) => r.map((v, j) => v + ((sy + yHy) * s[i] * s[j]) / (sy * sy) - (Hy[i] * s[j] + s[i] * Hy[j]) / sy));
    }
    if (small) break;
  }
  return { x, f: fx, ok: true, iter: it };
}

/* ---------- LMM fit ---------- */
/**
 * Fits a linear mixed model. groups as lmeLik (with id). spec = { cov: 'diag'|'symm', q, power, method }.
 * opts.start: θ start (default Ψ̃ = I, δ = 0). → { status, method, beta, vcov, se, sigma, D (σ²Ψ̃), delta, ll, k, aic,
 * bic, N, p, ranef: [{ id, b }], fitted0, fitted1, theta } | { status: 'bad', code }
 */
export function fitLMM(groups, spec, opts = {}) {
  const p = groups[0].X[0].length, np = nPsi(spec.cov, spec.q);
  const th0 = opts.start || [...(spec.cov === 'diag' ? new Array(spec.q).fill(0) : thetaOfPsi('symm', Array.from({ length: spec.q }, (_, i) => Array.from({ length: spec.q }, (_, j) => i === j ? 1 : 0)))), ...(spec.power ? [0] : [])];
  const nll = th => { const r = lmeLik(groups, spec, th); return r ? -r.ll : Infinity; };
  let best = bfgs(nll, th0);
  // restart from the optimum (BFGS memory reset) to polish
  for (let k = 0; k < 3; k++) { const r = bfgs(nll, best.x); if (r.f < best.f - 1e-12) best = r; else break; }
  const L = lmeLik(groups, spec, best.x);
  if (!L) return { status: 'bad', code: 'converge' };
  return summarizeLME(groups, spec, L, best.x, np, p);
}
function summarizeLME(groups, spec, L, theta, np, p) {
  const Ai = inv(L.A), vcov = Ai.map(r => r.map(v => v * L.sigma2));
  const D = L.Psi.map(r => r.map(v => v * L.sigma2)), k = p + np + (spec.power ? 1 : 0) + 1;
  const ranef = groups.map((g, i) => {
    const r = g.y.map((v, t) => v - g.X[t].reduce((s, x, j) => s + x * L.beta[j], 0)), Sr = cholSolve(L.Ls[i], r);
    return { id: g.id, b: L.Psi.map(row => row.reduce((s, v, l) => s + v * g.Z.reduce((a, z, t) => a + z[l] * Sr[t], 0), 0)) };
  });
  const N = L.N, nlog = spec.method === 'REML' ? Math.log(N - p) : Math.log(N);
  return { status: 'ok', method: spec.method, cov: spec.cov, power: spec.power, beta: L.beta, vcov, se: vcov.map((r, i) => Math.sqrt(r[i])), sigma: Math.sqrt(L.sigma2),
    D, delta: spec.power ? L.delta : null, ll: L.ll, k, aic: -2 * L.ll + 2 * k, bic: -2 * L.ll + k * nlog, N, p, ranef, theta };
}
/** Fitted values at level 0 (fixed part) and level 1 (with the group's predicted random effects) of a linear fit. */
export function lmmFitted(groups, fit) {
  return groups.map((g, i) => g.X.map((x, t) => { const f0 = x.reduce((s, v, j) => s + v * fit.beta[j], 0); return [f0, f0 + g.Z[t].reduce((s, z, l) => s + z * fit.ranef[i].b[l], 0)]; }));
}

/* ---------- NLME (Lindstrom–Bates) ---------- */
/**
 * model = { f(phi, x) → number, grad(phi, x) → [∂f/∂phi_j], params: [names], random: [indices of phi with a random
 * effect] }; phi = β + (b on the random indices). groups: [{ id, y, x: [covariates per obs], v }].
 * spec = { cov, power, method }. opts = { start: β0 }.
 * → { status, beta, vcov, se, sigma, D, delta, ll, k, aic, bic, ranef, iter, N, p }
 */
export function fitNLME(model, groups, spec, opts = {}) {
  const P = model.params.length, R = model.random, q = R.length, np = nPsi(spec.cov, q), N = groups.reduce((s, g) => s + g.y.length, 0);
  let beta = opts.start.slice(), bs = groups.map(() => new Array(q).fill(0));
  let theta = [...(spec.cov === 'diag' ? new Array(q).fill(0) : thetaOfPsi('symm', Array.from({ length: q }, (_, i) => Array.from({ length: q }, (_, j) => i === j ? 1 : 0)))), ...(spec.power ? [0] : [])];
  const phiOf = (b, u) => { const ph = b.slice(); R.forEach((j, l) => { ph[j] += u[l]; }); return ph; };
  // initial scale of Ψ̃ from a fixed-effects fit (relative variances 1 are a poor start when the parameters differ in size)
  { const s0 = pnls(model, groups, beta, bs.map(() => new Array(q).fill(0)), null, spec, theta, true); beta = s0.beta;
    const scale = R.map(j => Math.max(Math.abs(beta[j]) * 0.1, 1e-6)) , res = s0.rss / N;
    theta = [...(spec.cov === 'diag' ? scale.map(s => Math.log(s / Math.sqrt(res))) : thetaOfPsi('symm', scale.map((s, i) => scale.map((_, j) => i === j ? s * s / res : 0)))), ...(spec.power ? [0] : [])]; }
  let last = null, it = 0, lin = null;
  for (; it < 200; it++) {
    const Psi = psiOf(spec.cov, q, theta.slice(0, np));
    const s = pnls(model, groups, beta, bs, Psi, spec, theta, false); if (!s) return { status: 'bad', code: 'pnls' };
    beta = s.beta; bs = s.bs;
    // LME step on the linearized model
    lin = groups.map((g, i) => {
      const n = g.y.length, ph = phiOf(beta, bs[i]), X = [], Z = [], w = [];
      for (let t = 0; t < n; t++) { const gr = model.grad(ph, g.x[t]); X.push(gr); Z.push(R.map(j => gr[j])); w.push(g.y[t] - model.f(ph, g.x[t]) + gr.reduce((a, v, j) => a + v * beta[j], 0) + R.reduce((a, j, l) => a + gr[j] * bs[i][l], 0)); }
      return { id: g.id, y: w, X, Z, v: g.v };
    });
    const lspec = { cov: spec.cov, q, power: spec.power, method: spec.method };
    const nll = th => { const r = lmeLik(lin, lspec, th); return r ? -r.ll : Infinity; };
    let o = bfgs(nll, theta); for (let k = 0; k < 2; k++) { const r2 = bfgs(nll, o.x); if (r2.f < o.f - 1e-12) o = r2; else break; }
    const change = Math.max(...o.x.map((v, i) => Math.abs(v - theta[i]))), bchange = last ? Math.max(...beta.map((v, i) => Math.abs(v - last[i]) / (Math.abs(v) + 1e-8))) : Infinity;
    theta = o.x; last = beta.slice();
    if (change < 1e-7 && bchange < 1e-8) break;
  }
  // final PNLS at the final θ and the final LME step quantities
  const Psi = psiOf(spec.cov, q, theta.slice(0, np));
  const s = pnls(model, groups, beta, bs, Psi, spec, theta, false); beta = s.beta; bs = s.bs;
  lin = groups.map((g, i) => {
    const n = g.y.length, ph = phiOf(beta, bs[i]), X = [], Z = [], w = [];
    for (let t = 0; t < n; t++) { const gr = model.grad(ph, g.x[t]); X.push(gr); Z.push(R.map(j => gr[j])); w.push(g.y[t] - model.f(ph, g.x[t]) + gr.reduce((a, v, j) => a + v * beta[j], 0) + R.reduce((a, j, l) => a + gr[j] * bs[i][l], 0)); }
    return { id: g.id, y: w, X, Z, v: g.v };
  });
  const L = lmeLik(lin, { cov: spec.cov, q, power: spec.power, method: spec.method }, theta);
  if (!L) return { status: 'bad', code: 'converge' };
  const out = summarizeLME(lin, { ...spec, q }, L, theta, np, P);
  return { ...out, beta, ranef: groups.map((g, i) => ({ id: g.id, b: bs[i] })), iter: it, converged: it < 200, linBeta: L.beta };
}
/**
 * PNLS step: β and b_i minimizing Σ_i [Σ_t (y_it − f(φ_i, x_it))²/λ_it + b_iᵀΨ̃⁻¹b_i] (Gauss–Newton with step halving);
 * fixedOnly: b = 0 and no penalty (plain NLS for β).
 */
function pnls(model, groups, beta0, bs0, Psi, spec, theta, fixedOnly) {
  const P = beta0.length, R = model.random, q = R.length, M = groups.length, np = nPsi(spec.cov, q), delta = spec.power ? theta[np] : 0;
  const Pinv = fixedOnly ? null : inv(Psi); if (!fixedOnly && !Pinv) return null;
  const lam = groups.map(g => g.y.map((_, t) => spec.power ? Math.abs(g.v[t]) ** (2 * delta) : 1));
  const K = fixedOnly ? P : P + M * q;
  const obj = (beta, bs) => { let s = 0, rss = 0; for (const [i, g] of groups.entries()) { const ph = beta.slice(); R.forEach((j, l) => { ph[j] += bs[i][l]; }); for (let t = 0; t < g.y.length; t++) { const r = g.y[t] - model.f(ph, g.x[t]); if (!Number.isFinite(r)) return { s: Infinity, rss: Infinity }; s += r * r / lam[i][t]; rss += r * r / lam[i][t]; } if (!fixedOnly) for (let a = 0; a < q; a++) for (let c = 0; c < q; c++) s += bs[i][a] * Pinv[a][c] * bs[i][c]; } return { s, rss }; };
  let beta = beta0.slice(), bs = bs0.map(b => b.slice()), cur = obj(beta, bs);
  for (let it = 0; it < 500; it++) {
    const H = Array.from({ length: K }, () => new Array(K).fill(0)), g = new Array(K).fill(0);
    for (const [i, gr] of groups.entries()) {
      const ph = beta.slice(); R.forEach((j, l) => { ph[j] += bs[i][l]; });
      for (let t = 0; t < gr.y.length; t++) {
        const d = model.grad(ph, gr.x[t]), r = gr.y[t] - model.f(ph, gr.x[t]), w = 1 / lam[i][t];
        const J = new Array(K).fill(0); for (let j = 0; j < P; j++) J[j] = d[j]; if (!fixedOnly) R.forEach((j, l) => { J[P + i * q + l] = d[j]; });
        const nz = []; for (let a = 0; a < K; a++) if (J[a] !== 0) nz.push(a);
        for (const a of nz) { g[a] += J[a] * r * w; for (const c of nz) H[a][c] += J[a] * J[c] * w; }
      }
      if (!fixedOnly) for (let a = 0; a < q; a++) { for (let c = 0; c < q; c++) H[P + i * q + a][P + i * q + c] += Pinv[a][c]; g[P + i * q + a] -= Pinv[a].reduce((s, v, c) => s + v * bs[i][c], 0); }
    }
    const LH = chol(H); if (!LH) return null;
    const step = cholSolve(LH, g);
    let l = 1, next = null;
    while (l > 1e-12) { const nb = beta.map((v, j) => v + l * step[j]), nbs = bs.map((b, i) => fixedOnly ? b : b.map((v, a) => v + l * step[P + i * q + a])), o = obj(nb, nbs); if (o.s <= cur.s) { next = { nb, nbs, o }; break; } l /= 2; }
    if (!next) break;
    const rel = Math.max(...step.map((v, a) => Math.abs(l * v) / (Math.abs(a < P ? next.nb[a] : 1) + 1e-10)));
    beta = next.nb; bs = next.nbs; cur = next.o;
    if (rel < 1e-12) break;
  }
  return { beta, bs, rss: cur.rss };
}

/* ---------- calibration of a new group ---------- */
/**
 * Random effects of a group not in the fit, from its observations. Linear: BLUP. Nonlinear: one-step approximation
 * (Vonesh and Chinchilli) or the conditional mode (iterated). obs: [{ y, x | X, Z, v }].
 * → { b, iterated: bool } | null
 */
export function calibrateLinear(fit, obs) {
  const n = obs.length; if (!n) return null;
  const R = obs.map((o, a) => obs.map((_, c) => a === c ? fit.sigma ** 2 * (fit.power ? Math.abs(o.v) ** (2 * fit.delta) : 1) : 0));
  const V = obs.map((o, a) => obs.map((u, c) => R[a][c] + o.Z.reduce((s, z, k) => s + z * fit.D[k].reduce((t, d, l) => t + d * u.Z[l], 0), 0)));
  const L = chol(V); if (!L) return null;
  const e = obs.map(o => o.y - o.X.reduce((s, x, j) => s + x * fit.beta[j], 0)), Ve = cholSolve(L, e);
  return { b: fit.D.map(row => row.reduce((s, d, k) => s + d * obs.reduce((t, o, a) => t + o.Z[k] * Ve[a], 0), 0)) };
}
export function calibrateNonlinear(model, fit, obs, { iterate = false } = {}) {
  const R = model.random, q = R.length, n = obs.length; if (!n) return null;
  const lam = obs.map(o => fit.power ? Math.abs(o.v) ** (2 * fit.delta) : 1), s2 = fit.sigma ** 2;
  const phi = u => { const p = fit.beta.slice(); R.forEach((j, l) => { p[j] += u[l]; }); return p; };
  const Zat = u => obs.map(o => { const g = model.grad(phi(u), o.x); return R.map(j => g[j]); });
  // one step: b = D Z' (R + Z D Z')^-1 e at b = 0
  const Z0 = Zat(new Array(q).fill(0)), e0 = obs.map(o => o.y - model.f(fit.beta, o.x));
  const V = obs.map((_, a) => obs.map((_, c) => (a === c ? s2 * lam[a] : 0) + Z0[a].reduce((s, z, k) => s + z * fit.D[k].reduce((t, d, l) => t + d * Z0[c][l], 0), 0)));
  const L = chol(V); if (!L) return null;
  const Ve = cholSolve(L, e0); let b = fit.D.map(row => row.reduce((s, d, k) => s + d * Z0.reduce((t, z, a) => t + z[k] * Ve[a], 0), 0));
  if (!iterate) return { b, iterated: false };
  const Di = inv(fit.D); if (!Di) return null;
  let u = new Array(q).fill(0);
  for (let it = 0; it < 200; it++) {
    const Z = Zat(u), r = obs.map((o, a) => o.y - model.f(phi(u), o.x));
    const H = Di.map((row, a) => row.map((v, c) => v + Z.reduce((s, z, t) => s + z[a] * z[c] / (s2 * lam[t]), 0)));
    const g = Di.map((row, a) => Z.reduce((s, z, t) => s + z[a] * r[t] / (s2 * lam[t]), 0) - row.reduce((s, v, c) => s + v * u[c], 0));
    const LH = chol(H); if (!LH) return null;
    const du = cholSolve(LH, g); u = u.map((v, a) => v + du[a]);
    if (Math.max(...du.map(Math.abs)) < 1e-12) break;
  }
  return { b: u, iterated: true, oneStep: b };
}

/** Likelihood-ratio test of two nested ML fits (larger k second). → { L, df, p } */
export function lrt(f0, f1) {
  const L = 2 * (f1.ll - f0.ll), df = f1.k - f0.k;
  return { L, df, p: df > 0 && L >= 0 ? gammaQ(df / 2, L / 2) : null };
}

/* ---------- building models from a table (no DOM) ---------- */
export const TRANSFORMS = { x: { f: v => v, text: n => n }, ln: { f: v => Math.log(v), text: n => `ln(${n})` }, sq: { f: v => v * v, text: n => `${n}^2` } };
/**
 * Groups for a linear mixed model. rows: [{ row, g (group id), y, vals: { name: number } }]; terms: [{ name, tf }]
 * (fixed effects besides the intercept); random: { intercept: bool, terms: [indices into terms] }; vcol: name | null.
 * Rows with a missing or invalid value (ln of a non-positive number, non-positive variance covariate) are dropped.
 * → { groups, dropped: [{ row, why }], names: [fixed names], rnames: [random names], text }
 */
export function buildLinear(rows, terms, random, vcol = null) {
  const groups = new Map(), dropped = [];
  for (const r of rows) {
    const x = terms.map(t => TRANSFORMS[t.tf].f(r.vals[t.name]));
    const why = !fin(r.y) ? 'y' : r.g == null || r.g === '' ? 'group' : x.some(v => !fin(v)) ? 'x' : vcol && !(fin(r.vals[vcol]) && r.vals[vcol] > 0) ? 'v' : null;
    if (why) { dropped.push({ row: r.row, why }); continue; }
    const X = [1, ...x], Z = [...(random.intercept ? [1] : []), ...random.terms.map(j => x[j])];
    if (!groups.has(r.g)) groups.set(r.g, { id: r.g, y: [], X: [], Z: [], v: [], rows: [] });
    const g = groups.get(r.g); g.y.push(r.y); g.X.push(X); g.Z.push(Z); g.v.push(vcol ? r.vals[vcol] : 1); g.rows.push(r.row);
  }
  const names = ['b0', ...terms.map((_, j) => 'b' + (j + 1))];
  const rnames = [...(random.intercept ? ['b0'] : []), ...random.terms.map(j => 'b' + (j + 1))];
  const text = names.map((n, j) => j === 0 ? n : `${n}*${TRANSFORMS[terms[j - 1].tf].text(terms[j - 1].name)}`).join(' + ');
  return { groups: [...groups.values()], dropped, names, rnames, text };
}
/**
 * A nonlinear model from a formula (core/expr.js): vars are data names, every other name a coefficient.
 * → { ok, model: { params, f, grad, vars, text }, … } | { ok: false, code }
 */
export function nonlinearModel(expr, vars) {
  const r = parseExpr(expr); if (!r.ok) return { ok: false, code: 'parse', parse: r };
  const params = r.names.filter(n => !vars.includes(n)), used = r.names.filter(n => vars.includes(n));
  if (!params.length) return { ok: false, code: 'params.none' };
  if (!used.length) return { ok: false, code: 'vars.none' };
  const env = (p, x) => { const e = {}; params.forEach((n, j) => { e[n] = p[j]; }); used.forEach((n, j) => { e[n] = x[j]; }); return e; };
  return { ok: true, model: { params, vars: used, text: exprText(r.ast), f: (p, x) => evalExpr(r.ast, env(p, x)), grad: (p, x) => gradExpr(r.ast, env(p, x), params).d } };
}
/** Groups for a nonlinear mixed model: x = values of the model's variables. */
export function buildNonlinear(rows, vars, vcol = null) {
  const groups = new Map(), dropped = [];
  for (const r of rows) {
    const x = vars.map(v => r.vals[v]);
    const why = !fin(r.y) ? 'y' : r.g == null || r.g === '' ? 'group' : x.some(v => !fin(v)) ? 'x' : vcol && !(fin(r.vals[vcol]) && r.vals[vcol] > 0) ? 'v' : null;
    if (why) { dropped.push({ row: r.row, why }); continue; }
    if (!groups.has(r.g)) groups.set(r.g, { id: r.g, y: [], x: [], v: [], rows: [] });
    const g = groups.get(r.g); g.y.push(r.y); g.x.push(x); g.v.push(vcol ? r.vals[vcol] : 1); g.rows.push(r.row);
  }
  return { groups: [...groups.values()], dropped };
}
/** Registered library form of a fitted mixed model (fixed part as a formula): 'mixed.<FNV-1a of text|vars|params>'. */
export function ensureForm(text, vars, params) {
  let h = 0x811c9dc5; const s = text + '|' + vars.join(',') + '|' + params.join(',');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  const id = 'mixed.' + h.toString(16).padStart(8, '0');
  if (!coefForm(id)) { try { registerForm({ id, tool: 'mixed', params: params.map(key => ({ key })), inputs: Object.fromEntries(vars.map(v => [v, { unit: '-' }])), output: { name: 'y', unit: '-' }, formula: { en: 'y = ' + text }, transform: 'none' }); } catch (e) { /* registered meanwhile */ } }
  return id;
}
/** Registers the forms of stored mixed-model sets (fit.expr, fit.vars) so the library can check them. */
export function registerStoredForms(sets) {
  for (const s of sets || []) if (s && typeof s.form === 'string' && s.form.startsWith('mixed.') && !coefForm(s.form) && s.fit && typeof s.fit.expr === 'string' && Array.isArray(s.fit.vars)) {
    const m = nonlinearModel(s.fit.expr, s.fit.vars); if (m.ok) ensureForm(m.model.text, m.model.vars, m.model.params);
  }
}
