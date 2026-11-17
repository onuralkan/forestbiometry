// Biomass components, nonlinear additive system (PLATFORM_PLAN BC-02/a2, 17 Nov 2026): power-form component equations and
// the total-tree equation fitted jointly by nonlinear seemingly unrelated regressions (NSUR). No DOM. METHODS §22 (BC-02/a2).
// Source [B]: Parresol, B.R. 2001. Additivity of nonlinear biomass equations. Canadian Journal of Forest Research 31:
// 865–878. Additive-error model y = f(x, β) + ε (Eq. 1); variance function σ²_t = σ²·exp(g_tᵀθ) (Eq. 2), θ from the OLS
// regression ln e²_t = ln σ² + g_tᵀθ on the unweighted residuals (Eq. 4–5); estimated generalized nonlinear least squares
// by Gauss–Newton (Eq. 6–8), cov(b) = σ̂²[ZᵀΨ⁻¹Z]⁻¹, σ̂² = S(b)/(T − K) (Eq. 9a–b). Procedure 1 (Eq. 12): total = sum of
// the separately fitted components. Procedure 2 (Eq. 14, 18): the total equation is the sum of the component functions
// with the same coefficients (additivity by restriction); σ̂_ij = e_iᵀΔ_iΔ_j e_j / √((T − K_i)(T − K_j)) from the
// single-equation (EGNLS) residuals (Eq. 21), the total's residual from the sum of the component fits and K_total = the
// number of coefficients in the system; Gauss–Newton NSUR iteration (Eq. 24), Σ̂_b = [FᵀΔ(Σ̂⁻¹⊗I)ΔF]⁻¹ (Eq. 25),
// σ̂²_NSUR = R(b)/(MT − K) (Eq. 26); mean variance S² = fᵢᵀΣ̂_b fᵢ (Eq. 27), confidence interval ŷ ± t·S (Eq. 28b),
// prediction interval ŷ ± t·√(S² + σ̂²_NSUR·σ̂_ii·ψ_i) (Eq. 28c). Example 2 (Eq. 32): every equation on the ln scale,
// ln y_total = ln(Σ f_i), no weights (ψ = 1), interval on the ln scale then back-transformed.
// Checked against Parresol's Table 2 (EGNLS), Table 3 (weighted NSUR), Table 4 (FI) and the D = 20 cm, H = 17 m worked
// example (Eq. 16, 30, 31) in tests/biomass/test_bc02n.mjs (slash pine, n = 40). The printed crown weight
// D^7.322·e^(−0.006185·H) reproduces Table 2 only as D^7.322·e^(−0.006185·H²) (METHODS §22); the log column of Table 3
// is not reproduced to the printed digits (the Σ̂ used for Example 2 is not stated; METHODS §22).
import { inverse, solve } from '../core/nls.js';
import { tQuantile } from '../core/stats.js';
import { fitStats } from './sur.js';

const fin = x => typeof x === 'number' && Number.isFinite(x);
const VARS = { d: (D) => D, h: (D, H) => H, d2h: (D, H) => D * D * H };
/** Component forms: the registered biomass power forms (calc.js FORMS), parameters a, b(, c). */
export const NL_FORMS = {
  'pow.d2h': { vars: ['d2h'], params: ['a', 'b'], needsH: true, text: 'a·(D²H)^b' },
  'pow.d': { vars: ['d'], params: ['a', 'b'], needsH: false, text: 'a·D^b' },
  'pow.dh': { vars: ['d', 'h'], params: ['a', 'b', 'c'], needsH: true, text: 'a·D^b·H^c' },
};
export const NL_FORM_ORDER = Object.keys(NL_FORMS);
/** Variables g of the variance function ψ = exp(gᵀθ) (Parresol 2001 Eq. 2). */
export const G_TERMS = {
  lnd: { needsH: false, f: (D) => Math.log(D) }, lnh: { needsH: true, f: (D, H) => Math.log(H) },
  lnd2h: { needsH: true, f: (D, H) => Math.log(D * D * H) }, lndh: { needsH: true, f: (D, H) => Math.log(D * H) },
  h: { needsH: true, f: (D, H) => H }, h2: { needsH: true, f: (D, H) => H * H },
};
/** Weight functions offered: none, X^θ, D^θ1·e^(θ2·H), D^θ1·e^(θ2·H²) (the forms of Parresol's Table 2 and Eq. 19). */
export const WEIGHTS = { none: [], d: ['lnd'], h: ['lnh'], d2h: ['lnd2h'], dh: ['lndh'], 'd.h': ['lnd', 'h'], 'd.h2': ['lnd', 'h2'] };
export const WEIGHT_ORDER = Object.keys(WEIGHTS);
const num = (v, d = 4) => { const s = Number(v).toPrecision(d); return s.includes('e') ? s : String(Number(s)); };
/** Text of a weight function, with θ when given: e.g. (D²H)^2.114, D^7.322·e^(−0.006185·H²). */
export function weightText(code, theta = null) {
  const th = i => (theta ? num(theta[i]) : 'θ' + (WEIGHTS[code].length > 1 ? i + 1 : '')).replace('-', '−');
  switch (code) {
    case 'none': return '1';
    case 'd': return `D^${th(0)}`; case 'h': return `H^${th(0)}`; case 'd2h': return `(D²H)^${th(0)}`; case 'dh': return `(D·H)^${th(0)}`;
    case 'd.h': return `D^${th(0)}·e^(${th(1)}·H)`; case 'd.h2': return `D^${th(0)}·e^(${th(1)}·H²)`;
    default: return '?';
  }
}
export const weightNeedsH = code => (WEIGHTS[code] || []).some(g => G_TERMS[g].needsH);

/* ---------- one power function f = a·Π v_j^b_j ---------- */
const powF = (b, V, t) => { let y = b[0]; for (let j = 0; j < V.length; j++) y *= V[j][t] ** b[j + 1]; return y; };
const powJ = (b, V, t) => { const y = powF(b, V, t); return [y / b[0], ...V.map(v => y * Math.log(v[t]))]; };

/** Starting values by OLS on the ln scale (rows with y > 0). → [a, b…] | null */
export function logStart(V, y) {
  const rows = y.map((v, t) => t).filter(t => y[t] > 0), k = V.length + 1;
  if (rows.length <= k) return null;
  const A = Array.from({ length: k }, () => new Array(k).fill(0)), g = new Array(k).fill(0);
  for (const t of rows) { const x = [1, ...V.map(v => Math.log(v[t]))], ly = Math.log(y[t]); for (let a = 0; a < k; a++) { g[a] += x[a] * ly; for (let c = 0; c < k; c++) A[a][c] += x[a] * x[c]; } }
  const c = solve(A, g); if (!c) return null;
  return [Math.exp(c[0]), ...c.slice(1)];
}

/**
 * Gauss–Newton with step halving (Parresol 2001 Eq. 7–8) for one power function. psi: weights (variance function values,
 * 1 = unweighted); log: fit ln y = ln f (Example 2). → { b, se, cov, s2, e (residuals on the fit scale), S, iter } | null
 */
export function gnFit(V, y, psi, b0, { log = false, maxIter = 500 } = {}) {
  const T = y.length, k = b0.length, yy = log ? y.map(Math.log) : y;
  const res = b => { const e = new Array(T); let S = 0; for (let t = 0; t < T; t++) { const f = powF(b, V, t), p = log ? Math.log(f) : f; if (!fin(p)) return null; e[t] = yy[t] - p; S += e[t] * e[t] / psi[t]; } return { e, S }; };
  let b = b0.slice(), cur = res(b); if (!cur) return null;
  let iter = 0;
  for (; iter < maxIter; iter++) {
    const A = Array.from({ length: k }, () => new Array(k).fill(0)), g = new Array(k).fill(0);
    for (let t = 0; t < T; t++) { let z = powJ(b, V, t); if (log) { const f = powF(b, V, t); z = z.map(v => v / f); } for (let a = 0; a < k; a++) { g[a] += z[a] * cur.e[t] / psi[t]; for (let c = 0; c < k; c++) A[a][c] += z[a] * z[c] / psi[t]; } }
    const d = solve(A, g); if (!d) return null;
    let l = 1, next = null;
    while (l > 1e-12) { const bn = b.map((v, a) => v + l * d[a]), r = res(bn); if (r && r.S <= cur.S) { next = { b: bn, r }; break; } l /= 2; }
    if (!next) break;
    const rel = Math.max(...d.map((v, a) => Math.abs(l * v) / (Math.abs(next.b[a]) + 1e-300)));
    b = next.b; cur = next.r;
    if (rel < 1e-12) break;
  }
  const A = Array.from({ length: k }, () => new Array(k).fill(0));
  for (let t = 0; t < T; t++) { let z = powJ(b, V, t); if (log) { const f = powF(b, V, t); z = z.map(v => v / f); } for (let a = 0; a < k; a++) for (let c = 0; c < k; c++) A[a][c] += z[a] * z[c] / psi[t]; }
  const Ai = inverse(A); if (!Ai) return null;
  const s2 = cur.S / (T - k), cov = Ai.map(r => r.map(v => v * s2));
  return { b, se: cov.map((r, a) => Math.sqrt(Math.max(0, r[a]))), cov, s2, e: cur.e, S: cur.S, iter };
}

/** θ of ψ = exp(gᵀθ): OLS of ln e² on [1, g] (Parresol 2001 Eq. 4); rows with e = 0 are skipped. → θ (no intercept) | null */
export function varianceTheta(e, G) {
  const p = G.length + 1, A = Array.from({ length: p }, () => new Array(p).fill(0)), g = new Array(p).fill(0);
  let n = 0;
  for (let t = 0; t < e.length; t++) {
    if (!(e[t] !== 0 && fin(e[t]))) continue;
    const x = [1, ...G.map(c => c[t])], ly = Math.log(e[t] * e[t]); n++;
    for (let a = 0; a < p; a++) { g[a] += x[a] * ly; for (let c = 0; c < p; c++) A[a][c] += x[a] * x[c]; }
  }
  if (n <= p) return null;
  const c = solve(A, g); return c ? c.slice(1) : null;
}

/**
 * NSUR Gauss–Newton (Parresol 2001 Eq. 23–26). eqs: [{ pred(β) → T values, jac(β) → T × P }] on the fit scale, y on the
 * fit scale, psi per equation, Sig (M × M). → { b, cov, R, s2, e, iter } | { problem }
 */
export function nsurFit(eqs, ys, psis, Sig, beta0, { maxIter = 500 } = {}) {
  const M = eqs.length, T = ys[0].length, P = beta0.length, Si = inverse(Sig);
  if (!Si) return { problem: 'sigma.singular' };
  const w = (i, j, t) => Si[i][j] / Math.sqrt(psis[i][t] * psis[j][t]);
  const resid = b => { const e = []; for (let i = 0; i < M; i++) { const p = eqs[i].pred(b); if (p.some(v => !fin(v))) return null; e.push(ys[i].map((v, t) => v - p[t])); } return e; };
  const Rof = e => { let R = 0; for (let t = 0; t < T; t++) for (let i = 0; i < M; i++) for (let j = 0; j < M; j++) R += e[i][t] * w(i, j, t) * e[j][t]; return R; };
  const normal = (b, e) => {
    const J = eqs.map(q => q.jac(b)), A = Array.from({ length: P }, () => new Array(P).fill(0)), g = new Array(P).fill(0);
    for (let t = 0; t < T; t++) for (let i = 0; i < M; i++) for (let j = 0; j < M; j++) {
      const wij = w(i, j, t); if (wij === 0) continue;
      const zi = J[i][t], zj = J[j][t];
      for (let a = 0; a < P; a++) { if (zi[a] === 0) continue; const za = zi[a] * wij; g[a] += za * e[j][t]; for (let c = 0; c < P; c++) A[a][c] += za * zj[c]; }
    }
    return { A, g };
  };
  let b = beta0.slice(), e = resid(b); if (!e) return { problem: 'start' };
  let R = Rof(e), iter = 0;
  for (; iter < maxIter; iter++) {
    const { A, g } = normal(b, e), d = solve(A, g); if (!d) return { problem: 'singular' };
    let l = 1, next = null;
    while (l > 1e-12) { const bn = b.map((v, a) => v + l * d[a]), en = resid(bn); if (en) { const Rn = Rof(en); if (Rn <= R) { next = { b: bn, e: en, R: Rn }; break; } } l /= 2; }
    if (!next) break;
    const rel = Math.max(...d.map((v, a) => Math.abs(l * v) / (Math.abs(next.b[a]) + 1e-300)));
    ({ b, e, R } = next);
    if (rel < 1e-12) break;
  }
  const { A } = normal(b, e), cov = inverse(A); if (!cov) return { problem: 'singular' };
  return { b, cov, R, s2: R / (M * T - P), e, iter, converged: iter < maxIter };
}

/**
 * Nonlinear additive system from destructive-sample trees. trees: [{ row, D, H, y: { compKey: kg }, total: kg | null }].
 * spec: { method: 'weighted' | 'log', comps: [{ key, label, form: NL_FORMS id, weight }], total: { from: 'column' | 'sum',
 *         weight } }; weight = WEIGHTS code (θ estimated, Eq. 4) or { code, theta: [θ…] | null } (θ given or estimated).
 *         The weights apply to the 'weighted' method only.
 * → { status: 'ok', method, n, dropped, P, M, equations: [{ key, label, form, params, K, weight: { code, theta, estimated },
 *     single: { b, se, stats } (total: b null, stats of the sum = procedure 1), nsur: { b, se, cov, stats } (total: b null) }],
 *     beta, cov (P × P), sigma, corr, s2, df, range, iterations } | { status: 'bad', problems: [code], dropped }
 */
export function fitNonlinearAdditive(trees, spec) {
  const comps = spec.comps || [], problems = [], dropped = [], log = spec.method === 'log';
  if (!['weighted', 'log'].includes(spec.method)) problems.push('method');
  if (comps.length < 2) problems.push('comps.few');
  for (const c of comps) if (!NL_FORMS[c.form]) problems.push('form');
  const wspec = log ? [] : [...comps.map(c => c.weight), spec.total.weight].map(w => typeof w === 'object' && w ? { code: w.code, theta: w.theta ?? null } : { code: w || 'none', theta: null });
  const wcodes = wspec.map(w => w.code);
  if (wcodes.some(w => !WEIGHTS[w])) problems.push('weight');
  else if (wspec.some(w => w.theta != null && !(Array.isArray(w.theta) && w.theta.length === WEIGHTS[w.code].length && w.theta.every(fin)))) problems.push('weight.theta');
  // unweighted additive errors with total = Σ components: the total's residual is the sum of the component residuals and Σ̂
  // is singular (the total equation adds nothing)
  if (!log && !problems.length && spec.total.from === 'sum' && wcodes.every(w => w === 'none')) problems.push('sum.unweighted');
  if (problems.length) return { status: 'bad', problems: [...new Set(problems)], dropped };
  const needsH = comps.some(c => NL_FORMS[c.form].needsH) || wcodes.some(weightNeedsH);
  const ok = v => fin(v) && (log ? v > 0 : v >= 0), use = [];
  for (const t of trees) {
    const why = !(fin(t.D) && t.D > 0) ? 'D' : needsH && !(fin(t.H) && t.H > 0) ? 'H' : comps.some(c => !ok(t.y[c.key])) ? 'comp'
      : spec.total.from === 'column' && !ok(t.total) ? 'total' : null;
    if (why) dropped.push({ row: t.row, why }); else use.push(t);
  }
  const T = use.length, K = comps.map(c => NL_FORMS[c.form].params.length), P = K.reduce((a, b) => a + b, 0), M = comps.length + 1;
  const off = K.map((_, i) => K.slice(0, i).reduce((a, b) => a + b, 0));
  if (T <= P + 1) return { status: 'bad', problems: ['n.few'], dropped, n: T };
  const V = comps.map(c => NL_FORMS[c.form].vars.map(v => use.map(t => VARS[v](t.D, t.H))));
  const Y = comps.map(c => use.map(t => t.y[c.key])), yTot = use.map((t, k) => spec.total.from === 'column' ? t.total : Y.reduce((s, y) => s + y[k], 0));
  const ones = use.map(() => 1), G = code => WEIGHTS[code].map(g => use.map(t => G_TERMS[g].f(t.D, t.H)));
  const psiOf = (code, th) => { const g = G(code); return use.map((_, t) => Math.exp(g.reduce((s, col, j) => s + col[t] * th[j], 0))); };
  const sumPred = bs => use.map((_, t) => bs.reduce((s, b, i) => s + powF(b, V[i], t), 0));
  // separate fits (EGNLS, or OLS on the ln scale for Example 2)
  const starts = comps.map((_, i) => logStart(V[i], Y[i]));
  if (starts.some(s => !s)) return { status: 'bad', problems: ['start'], dropped };
  const single = [], weights = [], psis = [];
  if (log) {
    for (let i = 0; i < comps.length; i++) { const f = gnFit(V[i], Y[i], ones, starts[i], { log: true }); if (!f) return { status: 'bad', problems: ['converge'], dropped }; single.push(f); psis.push(ones); weights.push({ code: 'log', theta: null, estimated: false }); }
    psis.push(ones); weights.push({ code: 'log', theta: null, estimated: false });
  } else {
    const unw = [];
    for (let i = 0; i < comps.length; i++) { const f = gnFit(V[i], Y[i], ones, starts[i]); if (!f) return { status: 'bad', problems: ['converge'], dropped }; unw.push(f); }
    const su = sumPred(unw.map(f => f.b)), eTotU = yTot.map((v, t) => v - su[t]);
    for (let i = 0; i < M; i++) {
      const code = wcodes[i]; if (code === 'none') { psis.push(ones); weights.push({ code, theta: null, estimated: false }); continue; }
      const given = wspec[i].theta, th = given ? given.slice() : varianceTheta(i < comps.length ? unw[i].e : eTotU, G(code));
      if (!th || th.some(v => !fin(v))) return { status: 'bad', problems: ['weight.theta'], dropped };
      const psi = psiOf(code, th); if (psi.some(v => !(v > 0 && fin(v)))) return { status: 'bad', problems: ['weight.theta'], dropped };
      psis.push(psi); weights.push({ code, theta: th, estimated: !given });
    }
    for (let i = 0; i < comps.length; i++) { const f = gnFit(V[i], Y[i], psis[i], unw[i].b); if (!f) return { status: 'bad', problems: ['converge'], dropped }; single.push(f); }
  }
  // Σ̂ (Eq. 21): weighted single-equation residuals; the total's from the sum of the component fits, K_total = P
  const sum1 = sumPred(single.map(f => f.b));
  const eTot = log ? yTot.map((v, t) => Math.log(v) - Math.log(sum1[t])) : yTot.map((v, t) => v - sum1[t]);
  if (eTot.some(v => !fin(v))) return { status: 'bad', problems: ['converge'], dropped };
  const E = [...single.map(f => f.e), eTot], Kx = [...K, P];
  const Ew = E.map((e, i) => e.map((v, t) => v / Math.sqrt(psis[i][t])));
  const sigma = Ew.map((a, i) => Ew.map((c, j) => a.reduce((s, v, t) => s + v * c[t], 0) / Math.sqrt((T - Kx[i]) * (T - Kx[j]))));
  // NSUR
  const blockJ = (b, i, t) => { const z = new Array(P).fill(0), zi = powJ(b.slice(off[i], off[i] + K[i]), V[i], t); for (let a = 0; a < K[i]; a++) z[off[i] + a] = zi[a]; return z; };
  const compPred = (b, i) => use.map((_, t) => powF(b.slice(off[i], off[i] + K[i]), V[i], t));
  const totPred = b => use.map((_, t) => comps.reduce((s, _c, i) => s + powF(b.slice(off[i], off[i] + K[i]), V[i], t), 0));
  const eqs = [];
  for (let i = 0; i < comps.length; i++) eqs.push(log
    ? { pred: b => compPred(b, i).map(Math.log), jac: b => use.map((_, t) => { const f = powF(b.slice(off[i], off[i] + K[i]), V[i], t); return blockJ(b, i, t).map(v => v / f); }) }
    : { pred: b => compPred(b, i), jac: b => use.map((_, t) => blockJ(b, i, t)) });
  const totJ = (b, t) => { const z = new Array(P).fill(0); for (let i = 0; i < comps.length; i++) { const zi = blockJ(b, i, t); for (let a = 0; a < P; a++) z[a] += zi[a]; } return z; };
  eqs.push(log
    ? { pred: b => totPred(b).map(Math.log), jac: b => { const u = totPred(b); return use.map((_, t) => totJ(b, t).map(v => v / u[t])); } }
    : { pred: totPred, jac: b => use.map((_, t) => totJ(b, t)) });
  const ys = [...Y, yTot].map(y => log ? y.map(Math.log) : y), beta0 = single.flatMap(f => f.b);
  const fit = nsurFit(eqs, ys, psis, sigma, beta0);
  if (fit.problem) return { status: 'bad', problems: [fit.problem], dropped };
  const equations = comps.map((c, i) => {
    const b = fit.b.slice(off[i], off[i] + K[i]), cov = Array.from({ length: K[i] }, (_, a) => Array.from({ length: K[i] }, (_, d) => fit.cov[off[i] + a][off[i] + d]));
    return { key: c.key, label: c.label, form: c.form, params: NL_FORMS[c.form].params, K: K[i], weight: weights[i],
      single: { b: single[i].b, se: single[i].se, stats: fitStats(Y[i], use.map((_, t) => powF(single[i].b, V[i], t)), K[i]) },
      nsur: { b, se: cov.map((r, a) => Math.sqrt(Math.max(0, r[a]))), cov, stats: fitStats(Y[i], compPred(fit.b, i), K[i]) } };
  });
  equations.push({ key: 'total', label: null, form: null, params: null, K: P, weight: weights[comps.length],
    single: { b: null, se: null, stats: fitStats(yTot, sum1, P) }, nsur: { b: null, se: null, cov: null, stats: fitStats(yTot, totPred(fit.b), P) } });
  const corr = sigma.map((r, i) => r.map((v, j) => v / Math.sqrt(sigma[i][i] * sigma[j][j])));
  const rng = f => { const v = use.map(f).filter(fin); return v.length ? [Math.min(...v), Math.max(...v)] : null; };
  return { status: 'ok', method: spec.method, n: T, dropped, P, M, off, equations, beta: fit.b, cov: fit.cov, sigma, corr, s2: fit.s2, df: M * T - P,
    iterations: fit.iter, converged: fit.converged, range: { D: rng(t => t.D), H: needsH ? rng(t => t.H) : null },
    methodText: log ? 'NSUR, ln scale (Parresol 2001, Example 2, Eq. 32)' : 'weighted NSUR (Parresol 2001, procedure 2, Eq. 18–28)' };
}

/**
 * Mean and new-tree intervals at (D, H) for every equation of a fitted system (Eq. 27–28; Example 2 on the ln scale,
 * back-transformed). opts = { level: 0.95, t: number | null (null = Student t with MT − K df) }.
 * → { t, df, level, rows: [{ key, yhat, S2, ci: [lo, hi], pi: [lo, hi] }] } | null (invalid D or H)
 */
export function intervals(fit, D, H, { level = 0.95, t = null } = {}) {
  const needsH = fit.range && fit.range.H != null;
  if (!(fin(D) && D > 0) || (needsH && !(fin(H) && H > 0))) return null;
  const log = fit.method === 'log', comps = fit.equations.filter(e => e.key !== 'total'), P = fit.P;
  const tq = t != null ? t : tQuantile(1 - (1 - level) / 2, fit.df);
  const z = [], f = [];
  comps.forEach((e, i) => { const V = NL_FORMS[e.form].vars.map(v => [VARS[v](D, H)]), b = fit.beta.slice(fit.off[i], fit.off[i] + e.K); const row = new Array(P).fill(0); powJ(b, V, 0).forEach((v, a) => { row[fit.off[i] + a] = v; }); z.push(row); f.push(powF(b, V, 0)); });
  z.push(z.reduce((s, r) => s.map((v, a) => v + r[a]), new Array(P).fill(0))); f.push(f.reduce((s, v) => s + v, 0));
  const rows = fit.equations.map((e, i) => {
    const zi = log ? z[i].map(v => v / f[i]) : z[i];
    let S2 = 0; for (let a = 0; a < P; a++) for (let c = 0; c < P; c++) S2 += zi[a] * fit.cov[a][c] * zi[c];
    let psi = 1;
    if (!log && e.weight.code !== 'none') psi = Math.exp(WEIGHTS[e.weight.code].reduce((s, g, j) => s + G_TERMS[g].f(D, H) * e.weight.theta[j], 0));
    const c = tq * Math.sqrt(S2), p = tq * Math.sqrt(S2 + fit.s2 * fit.sigma[i][i] * psi);
    if (log) { const m = Math.log(f[i]); return { key: e.key, yhat: f[i], lnyhat: m, S2, ci: [Math.exp(m - c), Math.exp(m + c)], pi: [Math.exp(m - p), Math.exp(m + p)], halfLn: { ci: c, pi: p } }; }
    return { key: e.key, yhat: f[i], S2, ci: [f[i] - c, f[i] + c], pi: [f[i] - p, f[i] + p], psi };
  });
  return { t: tq, df: fit.df, level, rows };
}
