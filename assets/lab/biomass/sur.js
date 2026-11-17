// Biomass components, additive system (PLATFORM_PLAN BC-02/a1, 17 Nov 2026): fitting linear component equations and the
// total-tree equation jointly with restricted seemingly unrelated regressions. No DOM. METHODS §22 (BC-02).
// Source [B]: Parresol, B.R. 1999. Assessing tree and stand biomass: a review with examples and critical comparisons.
// Forest Science 45: 573–593: §1.1.3 weighting (Eq. 11–16: variance function σ²_t = σ²·X_t^k, k from the regression
// ln e²_t = a1 + a2·ln X_t on OLS residuals, Eq. 15; weighted least squares), §1.1.4 additivity, procedure 3 (Eq. 23:
// each component with its own variables, the total a function of all of them, additivity by linear restrictions on the
// coefficients) and §1.1.5 (Eq. 31–35): σ̂_ij = e_iᵀe_j / √((T − K_i)(T − K_j)) from the (weighted) single-equation
// residuals; β̂ = [Xᵀ(Σ̂⁻¹⊗I)X]⁻¹Xᵀ(Σ̂⁻¹⊗I)y on the weighted data; restricted β* = β̂ + CRᵀ(RCRᵀ)⁻¹(r − Rβ̂), C =
// [Xᵀ(Σ̂⁻¹⊗I)X]⁻¹, Cov(β*) = C − CRᵀ(RCRᵀ)⁻¹RC. Checked against Parresol's Table 4 (RSUR and WRSUR, willow oak, n = 39)
// in tests/biomass/test_bc02s.mjs.
import { inverse } from '../core/nls.js';

/** Terms of the linear component equations (D in cm, H in m; an intercept b0 is always present). */
export const TERMS = {
  d: { label: 'D', needsH: false, f: (D) => D },
  d2: { label: 'D²', needsH: false, f: (D) => D * D },
  d2h: { label: 'D²H', needsH: true, f: (D, H) => D * D * H },
  h: { label: 'H', needsH: true, f: (D, H) => H },
};
export const TERM_ORDER = ['d', 'd2', 'd2h', 'h'];
/** Weight variables of the variance function σ²_t ∝ X_t^k (Parresol 1999 Eq. 12 with one explanatory variable). */
export const WEIGHT_VARS = TERM_ORDER;
const fin = x => typeof x === 'number' && Number.isFinite(x);
export const canonTerms = terms => TERM_ORDER.filter(t => terms.includes(t));
export const formIdOf = terms => 'lt.' + canonTerms(terms).join('.');

/**
 * Restricted (weighted) SUR, Parresol 1999 Eq. 31–35. eqs: [{ X: T×K_i rows, y: T values, psi2: T values (variance
 * function values; 1 = unweighted) }], R: q × P, r: q (Σ K_i = P). → { b, cov, bUnres, sigma, single: [{ b, e }] } or
 * { problem }. Every equation uses the same T observations.
 */
export function restrictedSUR(eqs, R, r) {
  const M = eqs.length, T = eqs[0].y.length, K = eqs.map(e => e.X[0].length), P = K.reduce((a, b) => a + b, 0);
  const off = K.map((_, i) => K.slice(0, i).reduce((a, b) => a + b, 0));
  const Wx = eqs.map(e => e.X.map((row, t) => row.map(v => v / Math.sqrt(e.psi2[t])))), Wy = eqs.map(e => e.y.map((v, t) => v / Math.sqrt(e.psi2[t])));
  // single-equation (weighted) least squares: b_i and weighted residuals e_i (EGLS, Eq. 16)
  const single = [];
  for (let i = 0; i < M; i++) {
    const k = K[i], A = Array.from({ length: k }, () => new Array(k).fill(0)), g = new Array(k).fill(0);
    for (let t = 0; t < T; t++) for (let a = 0; a < k; a++) { g[a] += Wx[i][t][a] * Wy[i][t]; for (let b = 0; b < k; b++) A[a][b] += Wx[i][t][a] * Wx[i][t][b]; }
    const Ai = inverse(A); if (!Ai) return { problem: 'singular', equation: i };
    const b = Ai.map(row => row.reduce((s, v, j) => s + v * g[j], 0));
    const e = Wy[i].map((v, t) => v - Wx[i][t].reduce((s, x, j) => s + x * b[j], 0));
    const s2 = e.reduce((s, v) => s + v * v, 0) / (T - k);
    single.push({ b, e, se: Ai.map((row, j) => Math.sqrt(s2 * row[j])), s2 });
  }
  const sigma = single.map((a, i) => single.map((c, j) => a.e.reduce((s, v, t) => s + v * c.e[t], 0) / Math.sqrt((T - K[i]) * (T - K[j]))));
  const Si = inverse(sigma); if (!Si) return { problem: 'sigma.singular' };
  const XtX = Array.from({ length: P }, () => new Array(P).fill(0)), Xty = new Array(P).fill(0);
  for (let t = 0; t < T; t++) for (let i = 0; i < M; i++) for (let j = 0; j < M; j++) {
    const s = Si[i][j]; if (s === 0) continue;
    for (let a = 0; a < K[i]; a++) { const xa = Wx[i][t][a] * s; Xty[off[i] + a] += xa * Wy[j][t]; for (let b = 0; b < K[j]; b++) XtX[off[i] + a][off[j] + b] += xa * Wx[j][t][b]; }
  }
  const C = inverse(XtX); if (!C) return { problem: 'singular' };
  const bh = C.map(row => row.reduce((s, v, j) => s + v * Xty[j], 0));
  const q = R.length, CRt = C.map(row => R.map(rr => rr.reduce((s, v, j) => s + v * row[j], 0)));            // P × q
  const RCRt = R.map(rr => R.map((_, b) => rr.reduce((s, v, j) => s + v * CRt[j][b], 0)));
  if (!q) { const cov0 = C.map(row => row.slice()); return { b: bh, cov: cov0, bUnres: bh, sigma, single, K, off, q }; }
  const Mi = inverse(RCRt); if (!Mi) return { problem: 'restrictions.singular' };
  const d = R.map((rr, a) => r[a] - rr.reduce((s, v, j) => s + v * bh[j], 0)), Md = Mi.map(row => row.reduce((s, v, j) => s + v * d[j], 0));
  const b = bh.map((v, k) => v + CRt[k].reduce((s, x, a) => s + x * Md[a], 0));
  const CRtM = CRt.map(row => Mi[0].map((_, b2) => row.reduce((s, v, a) => s + v * Mi[a][b2], 0)));
  const cov = C.map((row, a) => row.map((v, c) => v - CRtM[a].reduce((s, x, k) => s + x * CRt[c][k], 0)));
  return { b, cov, bUnres: bh, sigma, single, K, off, q };
}

/** k of σ² ∝ X^k from OLS residuals: slope of ln e² on ln X (Parresol 1999 Eq. 15). null when it cannot be estimated. */
export function varianceExponent(e, X) {
  const pts = e.map((v, t) => [Math.log(X[t]), Math.log(v * v)]).filter(([a, b]) => fin(a) && fin(b));
  if (pts.length < 3) return null;
  const n = pts.length, mx = pts.reduce((s, p) => s + p[0], 0) / n, my = pts.reduce((s, p) => s + p[1], 0) / n;
  let sxx = 0, sxy = 0; for (const [x, y] of pts) { sxx += (x - mx) ** 2; sxy += (x - mx) * (y - my); }
  return sxx > 0 ? sxy / sxx : null;
}

/** Fit statistics in kg (unweighted residuals): Se = √(SSE/(T − K)), bias = mean(y − ŷ), FI = 1 − SSE/SST (fit index). */
export function fitStats(y, yhat, K) {
  const T = y.length, res = y.map((v, t) => v - yhat[t]), sse = res.reduce((s, v) => s + v * v, 0), my = y.reduce((s, v) => s + v, 0) / T;
  const sst = y.reduce((s, v) => s + (v - my) ** 2, 0);
  return { n: T, Se: Math.sqrt(sse / (T - K)), bias: res.reduce((s, v) => s + v, 0) / T, FI: sst > 0 ? 1 - sse / sst : null, sse };
}

/**
 * Additive system from destructive-sample trees. trees: [{ row, D, H, y: { compKey: kg }, total: kg | null }].
 * spec: { comps: [{ key, label, terms: [codes], weight: { kind: 'none'|'power', v, k: number|null (null = estimated) } }],
 *         total: { from: 'column'|'sum', weight } }. The total equation has an intercept and every term of the components;
 * restrictions: b_total,0 = Σ b_i,0 and b_total,τ = Σ_{i with τ} b_i,τ. Trees with a missing or invalid value are left
 * out and listed. → { status: 'ok', n, dropped, equations: [{ key, label, terms, weight, single, sur }], sigma, corr,
 *   cov, method } | { status: 'bad', problems: [code], dropped }
 */
export function fitAdditive(trees, spec) {
  const comps = spec.comps || [], problems = [], dropped = [];
  if (comps.length < 2) problems.push('comps.few');
  const allTerms = canonTerms([...new Set(comps.flatMap(c => c.terms))]);
  for (const c of comps) if (!c.terms.length) problems.push('terms.none');
  if (problems.length) return { status: 'bad', problems, dropped };
  const needsH = allTerms.some(t => TERMS[t].needsH) || [...comps.map(c => c.weight), spec.total.weight].some(w => w && w.kind === 'power' && TERMS[w.v].needsH);
  const use = [];
  for (const t of trees) {
    const why = !(fin(t.D) && t.D > 0) ? 'D' : needsH && !(fin(t.H) && t.H > 0) ? 'H' : comps.some(c => !(fin(t.y[c.key]) && t.y[c.key] >= 0)) ? 'comp'
      : spec.total.from === 'column' && !(fin(t.total) && t.total >= 0) ? 'total' : null;
    if (why) dropped.push({ row: t.row, why }); else use.push(t);
  }
  const T = use.length, K = [...comps.map(c => c.terms.length + 1), allTerms.length + 1];
  if (T <= Math.max(...K) + 1) return { status: 'bad', problems: ['n.few'], dropped, n: T };
  const row = (terms, t) => [1, ...canonTerms(terms).map(k => TERMS[k].f(t.D, t.H))];
  const yTot = use.map(t => spec.total.from === 'column' ? t.total : comps.reduce((s, c) => s + t.y[c.key], 0));
  const eqDefs = [...comps.map(c => ({ key: c.key, label: c.label, terms: canonTerms(c.terms), weight: c.weight, y: use.map(t => t.y[c.key]) })),
    { key: 'total', label: null, terms: allTerms, weight: spec.total.weight, y: yTot }];
  const eqs = eqDefs.map(e => ({ X: use.map(t => row(e.terms, t)), y: e.y }));
  // weights: σ² ∝ X^k; k given, or from the OLS residuals (Eq. 15)
  const weights = [];
  for (const [i, e] of eqDefs.entries()) {
    const w = e.weight || { kind: 'none' };
    if (w.kind !== 'power') { weights.push({ kind: 'none' }); eqs[i].psi2 = use.map(() => 1); continue; }
    const Xv = use.map(t => TERMS[w.v].f(t.D, t.H));
    if (Xv.some(v => !(v > 0))) return { status: 'bad', problems: ['weight.var'], dropped };
    let k = w.k, estimated = false;
    if (k == null) {
      const o = restrictedSUR([{ X: eqs[i].X, y: eqs[i].y, psi2: use.map(() => 1) }], [], []);
      if (o.problem) return { status: 'bad', problems: ['singular'], dropped };
      k = varianceExponent(o.single[0].e, Xv); estimated = true;
      if (k == null) return { status: 'bad', problems: ['weight.k'], dropped };
    }
    if (!fin(k)) return { status: 'bad', problems: ['weight.k'], dropped };
    weights.push({ kind: 'power', v: w.v, k, estimated }); eqs[i].psi2 = Xv.map(v => v ** k);
  }
  // restrictions
  const P = K.reduce((a, b) => a + b, 0), off = K.map((_, i) => K.slice(0, i).reduce((a, b) => a + b, 0)), tot = comps.length, R = [];
  const restr = ['b0', ...allTerms].map((name, j) => { const rr = new Array(P).fill(0); rr[off[tot] + j] = -1;
    comps.forEach((c, i) => { const idx = name === 'b0' ? 0 : canonTerms(c.terms).indexOf(name) + 1; if (idx > 0 || name === 'b0') rr[off[i] + idx] = 1; }); return rr; });
  R.push(...restr);
  const fit = restrictedSUR(eqs, R, R.map(() => 0));
  if (fit.problem) return { status: 'bad', problems: [fit.problem], dropped };
  const equations = eqDefs.map((e, i) => {
    const bS = fit.b.slice(off[i], off[i] + K[i]), seS = bS.map((_, a) => Math.sqrt(Math.max(0, fit.cov[off[i] + a][off[i] + a])));
    const pred = b => eqs[i].X.map(x => x.reduce((s, v, a) => s + v * b[a], 0)), sg = fit.single[i];
    return { key: e.key, label: e.label, terms: e.terms, weight: weights[i],
      single: { b: sg.b, se: sg.se, stats: fitStats(e.y, pred(sg.b), K[i]) },
      sur: { b: bS, se: seS, stats: fitStats(e.y, pred(bS), K[i]), cov: Array.from({ length: K[i] }, (_, a) => Array.from({ length: K[i] }, (_, c) => fit.cov[off[i] + a][off[i] + c])) } };
  });
  const sg = fit.sigma, corr = sg.map((r, i) => r.map((v, j) => v / Math.sqrt(sg[i][i] * sg[j][j])));
  const rng = f => { const v = use.map(f).filter(fin); return v.length ? [Math.min(...v), Math.max(...v)] : null; };
  return { status: 'ok', n: T, dropped, equations, sigma: sg, corr, cov: fit.cov, restrictions: R.length, method: 'restricted SUR (Parresol 1999, Eq. 31–35)',
    range: { D: rng(t => t.D), H: needsH ? rng(t => t.H) : null } };
}
