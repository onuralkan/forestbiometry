// Systems of equations (PLATFORM_PLAN SM-04, 17 Nov 2026; user decisions: general SUR/NSUR with the user's formulas,
// cross-equation restrictions by shared coefficient names, systemfit as the numerical reference, a separate page). No DOM.
// METHODS §28. Sources [B]: Henningsen, A., Hamann, J.D. 2007. systemfit: a package for estimating systems of simultaneous
// equations in R. Journal of Statistical Software 23(4) (CRAN vignette of systemfit 1.1-30): stacked system y = Xβ + u,
// E[uuᵀ] = Σ ⊗ I_T (Eq. 1–6); β̂ = (XᵀΩ̂⁻¹X)⁻¹XᵀΩ̂⁻¹y and cov(β̂) = (XᵀΩ̂⁻¹X)⁻¹ (Eq. 7–8); OLS (Ω̂ = I for the
// estimates; covariance with σ̂ per equation, or one pooled σ̂² under cross-equation restrictions, §2.1, §2.5); SUR =
// FGLS with Ω̂ = Σ̂ ⊗ I from the first-step OLS residuals (§2.1, §2.4), optionally iterated (each step's Σ̂ from the
// previous residuals; log-likelihood with Σ̂ = residuals/T, df K + 1 for OLS and K + G(G + 1)/2 otherwise, as systemfit); residual covariance σ̂_ij = ûᵢᵀûⱼ/T (Eq. 37), /√((T − Kᵢ)(T − Kⱼ)) (Eq. 38, default) or
// /(T − max(Kᵢ, Kⱼ)) (Eq. 39); R² per equation (Eq. 42) and McElroy's system R² (Eq. 43); likelihood-ratio statistic
// T(log|Σ̂_r| − log|Σ̂_u|) with Eq. 37 (Eq. 48). Nonlinear equations: Parresol, B.R. 2001, Can. J. For. Res. 31:
// 865–878, Eq. 20–26 (NSUR: R(β) = εᵀ(Σ̂⁻¹ ⊗ I)ε minimized by Gauss–Newton, cov = [Fᵀ(Σ̂⁻¹ ⊗ I)F]⁻¹), the linear case
// being the same estimator. Formulas are parsed by core/expr.js (exact derivatives); a coefficient name that occurs in
// several equations is one coefficient (a cross-equation restriction).
import { parse, evaluate, evalGrad, toText } from '../core/expr.js';
import { gammaQ } from '../core/stats.js';
import { registerForm, form as coefForm } from '../core/coef.js';

export const TOOL = { id: 'denklem-sistemleri', version: '1.0.0-beta.1' };
const fin = x => typeof x === 'number' && Number.isFinite(x);

/* ---------- small linear algebra ---------- */
function chol(A) { const n = A.length, L = Array.from({ length: n }, () => new Array(n).fill(0)); for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) { let s = A[i][j]; for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k]; if (i === j) { if (!(s > 0)) return null; L[i][i] = Math.sqrt(s); } else L[i][j] = s / L[j][j]; } return L; }
const cholSolve = (L, b) => { const n = L.length, x = new Array(n); for (let i = 0; i < n; i++) { let s = b[i]; for (let k = 0; k < i; k++) s -= L[i][k] * x[k]; x[i] = s / L[i][i]; } for (let i = n - 1; i >= 0; i--) { let s = x[i]; for (let k = i + 1; k < n; k++) s -= L[k][i] * x[k]; x[i] = s / L[i][i]; } return x; };
function inv(A) { const L = chol(A); if (!L) return null; const n = A.length, cols = []; for (let j = 0; j < n; j++) { const e = new Array(n).fill(0); e[j] = 1; cols.push(cholSolve(L, e)); } return A.map((_, i) => cols.map(c => c[i])); }
const logdet = A => { const L = chol(A); return L ? 2 * L.reduce((s, r, i) => s + Math.log(r[i]), 0) : NaN; };

/* ---------- system definition ---------- */
/**
 * eqs: [{ name, y (column name), expr }]; vars: names that are data columns. → { ok, eqs: [{ name, y, ast, text, vars,
 * params }], params: [all coefficients, first-use order], shared: [names used by more than one equation] } | { ok: false, code, eq }
 */
export function compileSystem(eqs, vars) {
  const out = [], params = [];
  for (const [i, e] of eqs.entries()) {
    const r = parse(e.expr); if (!r.ok) return { ok: false, code: 'parse', eq: i, parse: r };
    const ps = r.names.filter(n => !vars.includes(n)), vs = r.names.filter(n => vars.includes(n));
    if (!ps.length) return { ok: false, code: 'params.none', eq: i };
    for (const p of ps) if (!params.includes(p)) params.push(p);
    out.push({ name: e.name, y: e.y, ast: r.ast, text: toText(r.ast), vars: vs, params: ps });
  }
  if (out.length < 2) return { ok: false, code: 'eqs.few' };
  const shared = params.filter(p => out.filter(e => e.params.includes(p)).length > 1);
  return { ok: true, eqs: out, params, shared };
}

/**
 * Fits a system. sys from compileSystem; rows: [{ row, vals: { name: number } }] (response and variable columns);
 * opts = { method: 'OLS'|'SUR'|'ISUR', resid: 'noDfCor'|'geomean'|'max', start: { coef: number } }.
 * Rows with a missing value in any equation are left out (the system needs the same T observations in every equation).
 * → { status, method, coef, se, vcov, names, sigmaUsed, residCov, iter, eq: [{ name, K, ssr, r2, fitted, resid }],
 *     mcelroy, logLik, df, T, G, K, dropped } | { status: 'bad', code }
 */
export function fitSystem(sys, rows, opts = {}) {
  const method = opts.method || 'SUR', rc = opts.resid || 'geomean', G = sys.eqs.length, P = sys.params, K = P.length;
  const need = [...new Set(sys.eqs.flatMap(e => [e.y, ...e.vars]))], use = [], dropped = [];
  for (const r of rows) { const bad = need.find(n => !fin(r.vals[n])); if (bad) dropped.push({ row: r.row, col: bad }); else use.push(r); }
  const T = use.length; if (T <= Math.max(...sys.eqs.map(e => e.params.length)) + 1) return { status: 'bad', code: 'n.few', dropped };
  const idx = new Map(P.map((p, j) => [p, j])), Y = sys.eqs.map(e => use.map(r => r.vals[e.y]));
  const envOf = (b, r) => { const e = { ...r.vals }; P.forEach((p, j) => { e[p] = b[j]; }); return e; };
  const pred = b => sys.eqs.map(e => use.map(r => evaluate(e.ast, envOf(b, r))));
  const jac = b => sys.eqs.map(e => use.map(r => { const g = evalGrad(e.ast, envOf(b, r), e.params).d, row = new Array(K).fill(0); e.params.forEach((p, l) => { row[idx.get(p)] = g[l]; }); return row; }));
  const resid = b => { const f = pred(b); return Y.map((y, i) => y.map((v, t) => v - f[i][t])); };
  const Rof = (U, Si) => { let s = 0; for (let t = 0; t < T; t++) for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) if (Si[i][j]) s += U[i][t] * Si[i][j] * U[j][t]; return Number.isFinite(s) ? s : Infinity; };
  /** Gauss–Newton for the GLS objective with a fixed Σ⁻¹ (Parresol 2001 Eq. 24); a linear system converges in one step. */
  const gls = (b0, Si) => {
    let b = b0.slice(), U = resid(b), R = Rof(U, Si);
    if (!Number.isFinite(R)) return null;
    for (let it = 0; it < 500; it++) {
      const J = jac(b), A = Array.from({ length: K }, () => new Array(K).fill(0)), g = new Array(K).fill(0);
      for (let t = 0; t < T; t++) for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) { const s = Si[i][j]; if (!s) continue; const zi = J[i][t], zj = J[j][t]; for (let a = 0; a < K; a++) { if (!zi[a]) continue; g[a] += zi[a] * s * U[j][t]; for (let c = 0; c < K; c++) A[a][c] += zi[a] * s * zj[c]; } }
      const L = chol(A); if (!L) return null;
      const d = cholSolve(L, g); let l = 1, next = null;
      while (l > 1e-12) { const bn = b.map((v, a) => v + l * d[a]), Un = resid(bn), Rn = Rof(Un, Si); if (Rn <= R) { next = { bn, Un, Rn }; break; } l /= 2; }
      if (!next) break;
      const rel = Math.max(...d.map((v, a) => Math.abs(l * v) / (Math.abs(next.bn[a]) + 1e-12)));
      b = next.bn; U = next.Un; R = next.Rn;
      if (rel < 1e-13) break;
    }
    const J = jac(b), A = Array.from({ length: K }, () => new Array(K).fill(0));
    for (let t = 0; t < T; t++) for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) { const s = Si[i][j]; if (!s) continue; for (let a = 0; a < K; a++) for (let c = 0; c < K; c++) A[a][c] += J[i][t][a] * s * J[j][t][c]; }
    return { b, U, A, R };
  };
  const Ki = sys.eqs.map(e => e.params.length);
  const sigmaOf = U => U.map((a, i) => U.map((c, j) => { const s = a.reduce((x, v, t) => x + v * c[t], 0); return rc === 'noDfCor' ? s / T : rc === 'max' ? s / (T - Math.max(Ki[i], Ki[j])) : s / Math.sqrt((T - Ki[i]) * (T - Ki[j])); }));
  const I = Array.from({ length: G }, (_, i) => Array.from({ length: G }, (_, j) => i === j ? 1 : 0));
  let b0 = P.map(p => fin(opts.start && opts.start[p]) ? opts.start[p] : 0);
  // first step: OLS (Ω = I), restricted if coefficients are shared
  const ols = gls(b0, I); if (!ols) return { status: 'bad', code: 'converge', dropped };
  let fit = ols, Sig = null, iter = 0;
  if (method === 'OLS') {
    // covariance: σ̂ per equation without cross-equation restrictions; one pooled σ̂² with them (§2.5; systemfit default)
    const restricted = sys.shared.length > 0, s = sigmaOf(ols.U);
    Sig = restricted ? I.map((r, i) => r.map((v) => v * ols.U.reduce((x, u) => x + u.reduce((y, w) => y + w * w, 0), 0) / (G * T - K))) : I.map((r, i) => r.map((v, j) => i === j ? s[i][i] : 0));
    const fitS = gls(ols.b, inv(Sig)); fit = { ...ols, A: fitS.A };
  } else {
    Sig = sigmaOf(ols.U);
    for (iter = 1; iter <= (method === 'ISUR' ? 1000 : 1); iter++) {
      const Si = inv(Sig); if (!Si) return { status: 'bad', code: 'sigma.singular', dropped };
      const f = gls(fit.b, Si); if (!f) return { status: 'bad', code: 'converge', dropped };
      const change = Math.sqrt(f.b.reduce((s, v, a) => s + (v - fit.b[a]) ** 2, 0) / f.b.reduce((s, v) => s + v * v, 0));
      fit = f;
      if (method !== 'ISUR') break;
      const Sn = sigmaOf(f.U);
      if (change < 1e-12) break;
      Sig = Sn;
    }
  }
  const vcov = inv(fit.A); if (!vcov) return { status: 'bad', code: 'singular', dropped };
  const U = fit.U, f = pred(fit.b), residCov = sigmaOf(U);
  const eq = sys.eqs.map((e, i) => { const ssr = U[i].reduce((s, v) => s + v * v, 0), m = Y[i].reduce((s, v) => s + v, 0) / T, sst = Y[i].reduce((s, v) => s + (v - m) ** 2, 0); return { name: e.name, y: e.y, text: e.text, K: Ki[i], ssr, r2: 1 - ssr / sst, fitted: f[i], resid: U[i] }; });
  // McElroy's R² (Eq. 43) with the Σ̂ used for estimation
  const Si = inv(Sig), Yc = Y.map(y => { const m = y.reduce((s, v) => s + v, 0) / T; return y.map(v => v - m); });
  const mcelroy = 1 - Rof(U, Si) / Rof(Yc, Si);
  // system OLS R² = 1 − ΣSSR/ΣSST (systemfit's ols.r.squared)
  const olsR2 = 1 - eq.reduce((s, e) => s + e.ssr, 0) / Yc.reduce((s, y) => s + y.reduce((a, v) => a + v * v, 0), 0);
  // log-likelihood of the multivariate normal with Σ̂ = residuals/T (Eq. 37), as systemfit
  const S37 = U.map(a => U.map(c => a.reduce((x, v, t) => x + v * c[t], 0) / T)), ll = -G * T / 2 * Math.log(2 * Math.PI) - T / 2 * logdet(S37) - G * T / 2;
  return { status: 'ok', method, resid: rc, names: P, coef: fit.b, se: vcov.map((r, i) => Math.sqrt(r[i])), vcov, sigmaUsed: Sig, residCov, iter: method === 'OLS' ? null : iter,
    eq, mcelroy, olsR2, logLik: ll, df: method === 'OLS' ? K + 1 : K + G * (G + 1) / 2, T, G, K, dropped, rows: use.map(r => r.row) };
}

/** Likelihood-ratio test of a restricted against an unrestricted fit (Eq. 48): T(log|Σ̂_r| − log|Σ̂_u|), Σ̂ by Eq. 37. */
export function lrtSystems(restricted, unrestricted) {
  const S = f => f.eq.map(a => f.eq.map(c => a.resid.reduce((x, v, t) => x + v * c.resid[t], 0) / f.T));
  const LR = restricted.T * (logdet(S(restricted)) - logdet(S(unrestricted))), df = unrestricted.K - restricted.K;
  return { LR, df, p: df > 0 && LR >= 0 ? gammaQ(df / 2, LR / 2) : null };
}

/* ---------- coefficient library: one set per equation, the system's shared coefficients included ---------- */
export function ensureForm(text, vars, params) {
  let h = 0x811c9dc5; const s = text + '|' + vars.join(',') + '|' + params.join(',');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  const id = 'eqsys.' + h.toString(16).padStart(8, '0');
  if (!coefForm(id)) { try { registerForm({ id, tool: 'eqsys', params: params.map(key => ({ key })), inputs: Object.fromEntries(vars.map(v => [v, { unit: '-' }])), output: { name: 'y', unit: '-' }, formula: { tr: 'y = ' + text, en: 'y = ' + text }, transform: 'none' }); } catch (e) { /* registered meanwhile */ } }
  return id;
}
export function registerStoredForms(sets) {
  for (const s of sets || []) if (s && typeof s.form === 'string' && s.form.startsWith('eqsys.') && !coefForm(s.form) && s.fit && typeof s.fit.expr === 'string' && Array.isArray(s.fit.vars)) {
    const r = parse(s.fit.expr); if (!r.ok) continue;
    ensureForm(toText(r.ast), r.names.filter(n => s.fit.vars.includes(n)), r.names.filter(n => !s.fit.vars.includes(n)));
  }
}
