// Stand models (stage P16, DIST_SPEC §4.1): distribution parameters, or their recovery targets, predicted from stand
// variables with models trained on many plots. No DOM. Formulas and validation: docs/METHODS.md §12 P16.
//
//   PPM  parameter prediction: per training unit the Weibull scale b and shape c are estimated (maximum likelihood,
//        fixed location a); b and c are regressed on stand variables.
//   PRM  parameter recovery: per unit the targets of a recovery method are computed (moments, percentiles; Weibull
//        Poudel and Cao M2–M9, Johnson SB Parresol); the targets are regressed; a prediction recovers the parameters.
//
// Model form (Poudel and Cao 2013): y = exp(β₁ + β₂·RS + β₃·ln N + β₄·ln H + β₅/A) + ε, RS = √(10000/N)/H, additive
// error on the original scale. Fitted by NLS per response, by SUR (all responses jointly, residual covariance between
// equations), or by OLS on ln y (a different objective; reported as such, back-transformation stated).
import * as D from './index.js';
import { levenbergMarquardt, covariance, solve, inverse } from '../core/nls.js';
import { parseNumber } from '../core/num.js';
import { cellText } from '../core/table.js';

export const SCHEMA = 'dist-stand-model/1';
export const TERMS = ['RS', 'lnN', 'lnH', 'invA'];
const TERM_NEEDS = { RS: ['N', 'H'], lnN: ['N'], lnH: ['H'], invA: ['A'] };
/** Stand variables a set of terms needs (N trees/ha, H stand height in m, A age in years). */
export const needs = terms => [...new Set(terms.flatMap(t => TERM_NEEDS[t]))].sort((a, b) => 'NHA'.indexOf(a) - 'NHA'.indexOf(b));
/** Row of the design matrix: [1, RS, ln N, ln H, 1/A] restricted to the chosen terms. */
export function design(x, terms) {
  const v = { RS: Math.sqrt(10000 / x.N) / x.H, lnN: Math.log(x.N), lnH: Math.log(x.H), invA: 1 / x.A };
  return [1, ...terms.map(t => v[t])];
}
const dot = (b, z) => z.reduce((s, zi, j) => s + b[j] * zi, 0);

/* ---------------- response sets ---------------- */
const Q = { q25: 0.25, q31: 0.31, q50: 0.5, q63: 0.63, q95: 0.95 };
/**
 * id → { approach, family, keys (responses), method (recovery method id, PRM), label }.
 * PPM Weibull: b, c with a fixed. PRM Weibull Mk: the targets of method k (Poudel and Cao; Dmin added when the location
 * policy is a = 0.5·Dmin). PRM Parresol: mean, median, Dq (ξ fixed by the user).
 */
export function responseSet(id, opts = {}) {
  if (id === 'ppm.weibull') return { id, approach: 'ppm', family: 'weibull', keys: opts.ppmLoc === 'half-dmin' ? ['b', 'c', 'dmin'] : ['b', 'c'] };
  if (id === 'prm.parresol') return { id, approach: 'prm', family: 'johnsonsb', method: 'johnsonsb.parresol', keys: ['mean', 'median', 'dq'] };
  const m = /^prm\.weibull\.(m[2-9])$/.exec(id);
  if (m) { const meth = D.method('weibull.' + m[1]), keys = meth.needs.slice();
    if ((opts.loc ?? 'half-dmin') === 'half-dmin' && !keys.includes('dmin')) keys.push('dmin');
    return { id, approach: 'prm', family: 'weibull', method: meth.id, keys }; }
  throw new D.DistError('stand.set', { id });
}
export const SETS = ['ppm.weibull', 'prm.weibull.m2', 'prm.weibull.m3', 'prm.weibull.m4', 'prm.weibull.m5', 'prm.weibull.m6', 'prm.weibull.m7', 'prm.weibull.m8', 'prm.weibull.m9', 'prm.parresol'];

/** Training targets of one unit (diameters d, cm). Moment variance with divisor n; percentiles type 7. null = not computable. */
export function targets(d, set, opts = {}) {
  if (set.approach === 'ppm') {                     // M1: b, c by ML with a fixed: 0, or 0.5 × the unit's smallest diameter
    const half = opts.ppmLoc === 'half-dmin', dmin = Math.min(...d), r = D.runMethod('weibull.ml', { d }, { a: half ? 0.5 * dmin : opts.a ?? 0 });
    return r.status === 'ok' ? { b: r.params.b, c: r.params.c, ...(half ? { dmin } : {}) } : null;
  }
  const s = D.describe(d), srt = [...d].sort((x, y) => x - y), out = {};
  for (const k of set.keys) out[k] = k === 'mean' ? s.mean : k === 'variance' ? s.varN : k === 'dq' ? s.dq : k === 'dmin' ? s.min : k === 'median' ? D.quantile7(srt, 0.5) : D.quantile7(srt, Q[k]);
  return Object.values(out).every(v => Number.isFinite(v) && v > 0) ? out : null;
}

/* ---------------- training units from a tree table ---------------- */
/**
 * Units (plot × period) with their diameters and stand variables. spec = extractUnits spec + { cols: { N, H, A } } (column
 * indices or null). A stand variable must be one positive number within a unit (the value is repeated on every tree row);
 * a unit where it is missing, unreadable, not positive or not constant is listed with the reason and left out.
 */
export function extractStandUnits(tbl, spec) {
  const X = D.extractUnits(tbl, { ...spec, mode: 'each' }), idx = new Map(tbl.rowNumbers.map((n, i) => [n, i])), out = [], refused = [];
  const vars = Object.entries(spec.cols || {}).filter(([, c]) => c != null);
  for (const u of X.units) {
    const x = {}, why = [];
    for (const [k, c] of vars) {
      const vals = new Set(); let bad = 0;
      for (const rn of u.rows) { const cell = tbl.rows[idx.get(rn)][c], v = cell == null ? { status: 'empty' } : cell.t === 'n' ? parseNumber(cell.v, spec.decimal) : parseNumber(cellText(cell), spec.decimal); if (v.status !== 'ok') bad++; else vals.add(v.value); }
      if (bad || !vals.size) why.push({ code: 'stand.var.missing', key: k });
      else if (vals.size > 1) why.push({ code: 'stand.var.varies', key: k, values: [...vals].slice(0, 3) });
      else { const v = [...vals][0]; if (!(v > 0)) why.push({ code: 'stand.var.nonpos', key: k, value: v }); else x[k] = v; }
    }
    if (why.length) refused.push({ plot: u.plot, period: u.period, problems: why }); else out.push({ id: u.id, plot: u.plot, period: u.period, d: u.d, x });
  }
  return { units: out, refused, acc: X.acc };
}

/* ---------------- regression ---------------- */
const expModel = terms => ({ f: (b, x) => Math.exp(dot(b, design(x, terms))), grad: (b, x) => { const z = design(x, terms), e = Math.exp(dot(b, z)); return z.map(v => v * e); } });
/** Multiple OLS of v on the design rows (normal equations). null when singular. */
function olsMulti(Z, v) {
  const p = Z[0].length, A = Array.from({ length: p }, () => Array(p).fill(0)), g = Array(p).fill(0);
  Z.forEach((z, i) => { for (let j = 0; j < p; j++) { g[j] += z[j] * v[i]; for (let k = 0; k < p; k++) A[j][k] += z[j] * z[k]; } });
  return solve(A, g);
}
/**
 * OLS on ln y. A different objective from the NLS of the source form (error multiplicative on the original scale).
 * Back-transformation: exp(Zβ) estimates the median of y; under normal errors on the log scale the mean is
 * exp(Zβ + s²/2), s² = Σ residuals² / (n − p). Both are recorded; predictions use the stated choice (default: median).
 */
export function fitLogOLS(xs, y, terms) {
  const Z = xs.map(x => design(x, terms)), p = Z[0].length, n = y.length;
  if (n <= p) return { status: 'invalid', reason: 'few' };
  const beta = olsMulti(Z, y.map(Math.log)); if (!beta) return { status: 'invalid', reason: 'singular' };
  const res = Z.map((z, i) => Math.log(y[i]) - dot(beta, z)), s2 = res.reduce((s, r) => s + r * r, 0) / (n - p);
  return { status: 'ok', beta, s2Log: s2, sse: y.reduce((s, yi, i) => s + (yi - Math.exp(dot(beta, Z[i]))) ** 2, 0), n, p };
}
/** NLS of the source form on the original scale (Levenberg–Marquardt; start: log-OLS). */
export function fitNLS(xs, y, terms) {
  const st = fitLogOLS(xs, y, terms); if (st.status !== 'ok') return st;
  const M = expModel(terms), r = levenbergMarquardt(M, xs, y, st.beta, { maxIter: 1000, xtol: 1e-12, ftol: 1e-15, gtol: 1e-10 });
  if (r.status !== 'ok') return { status: r.status, iter: r.iter };
  const cov = covariance(M, r.theta, xs, r.sse);
  return { status: 'ok', beta: r.theta, sse: r.sse, n: y.length, p: r.theta.length, iter: r.iter, se: cov ? cov.se : null, sigma2: r.sse / (y.length - r.theta.length) };
}
/** Upper-triangular U with UᵀU = A⁻¹ … here: Cholesky L of a symmetric positive definite matrix (A = LLᵀ). */
function cholesky(A) {
  const n = A.length, L = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let s = A[i][j]; for (let k = 0; k < j; k++) s -= L[i][k] * L[j][k];
    if (i === j) { if (!(s > 0)) return null; L[i][i] = Math.sqrt(s); } else L[i][j] = s / L[j][j];
  }
  return L;
}
/**
 * Seemingly unrelated regressions for the K responses (same design, separate coefficients): minimises
 * Σᵢ rᵢᵀ Σ⁻¹ rᵢ over all coefficients, rᵢ = yᵢ − f(xᵢ; β), with Σ the residual covariance between equations
 * (divisor n). Feasible GLS: Σ from equation-by-equation NLS, then the joint fit on residuals whitened with
 * W = L⁻¹ (Σ = LLᵀ), Σ re-estimated from the joint residuals and the fit repeated until the coefficients change by less
 * than 1e-10 (relative) or 100 rounds: iterated SUR. Returns the coefficients per response, Σ, its correlations, rounds.
 */
export function fitSUR(xs, Y, terms, opts = {}) {
  const K = Y[0].length, n = Y.length, maxRounds = opts.maxRounds ?? 100;
  const eqs = Array.from({ length: K }, (_, k) => fitNLS(xs, Y.map(r => r[k]), terms));
  if (eqs.some(e => e.status !== 'ok')) return { status: 'noconverge', stage: 'nls', eqs };
  const p = eqs[0].beta.length, M = expModel(terms);
  let beta = eqs.map(e => e.beta.slice()), rounds = 0, Sigma = null, last = null;
  const resid = B => Y.map((y, i) => y.map((yk, k) => yk - M.f(B[k], xs[i])));
  const cov = R => Array.from({ length: K }, (_, a) => Array.from({ length: K }, (_, b) => R.reduce((s, r) => s + r[a] * r[b], 0) / n));
  while (rounds < maxRounds) {
    rounds++;
    Sigma = cov(resid(beta)); const L = cholesky(Sigma); if (!L) return { status: 'invalid', reason: 'sigma', Sigma };
    const W = inverse(L);                                                   // whitening: W r has identity covariance
    // stacked problem: observation (i, k) → target Σ_l W_kl y_il, mean Σ_l W_kl f_l(x_i)
    const obs = [], tgt = [];
    for (let i = 0; i < n; i++) for (let k = 0; k < K; k++) { obs.push({ i, k }); tgt.push(W[k].reduce((s, w, l) => s + w * Y[i][l], 0)); }
    const split = th => Array.from({ length: K }, (_, k) => th.slice(k * p, (k + 1) * p));
    const SM = { f: (th, o) => { const B = split(th); return W[o.k].reduce((s, w, l) => s + (w ? w * M.f(B[l], xs[o.i]) : 0), 0); },
      grad: (th, o) => { const B = split(th), g = Array(K * p).fill(0); W[o.k].forEach((w, l) => { if (!w) return; const gl = M.grad(B[l], xs[o.i]); for (let j = 0; j < p; j++) g[l * p + j] = w * gl[j]; }); return g; } };
    const r = levenbergMarquardt(SM, obs, tgt, beta.flat(), { maxIter: 1000, xtol: 1e-12, ftol: 1e-15, gtol: 1e-10 });
    if (r.status !== 'ok') return { status: r.status, stage: 'sur', rounds };
    const nb = split(r.theta), change = Math.max(...nb.flat().map((v, j) => Math.abs(v - beta.flat()[j]) / Math.max(Math.abs(beta.flat()[j]), 1e-8)));
    beta = nb; last = r;
    if (!opts.iterate && rounds === 1) break;                                // two-step FGLS when iterate is false
    if (change < 1e-10) break;
  }
  const R = resid(beta), S = cov(R), corr = S.map((r, a) => r.map((v, b) => v / Math.sqrt(S[a][a] * S[b][b])));
  return { status: 'ok', beta, Sigma: S, corr, rounds, n, p, sse: S.map((r, k) => r[k] * n), objective: last ? last.sse : null };
}

/* ---------------- training ---------------- */
/**
 * units: from extractStandUnits. cfg: { set: id, terms: [...], fit: 'nls'|'sur'|'logols', a (PPM location, default 0),
 * loc: 'half-dmin'|'user' and a (PRM Weibull), xi (Parresol), back: 'median'|'mean' (log-OLS) }.
 * Returns the model (coefficients per response, training scope) and the unit list with their targets.
 */
export function train(units, cfg) {
  if (cfg.fit === 'cdfr' || cfg.fit === 'mcdfr') return trainCDF(units, cfg);
  const set = responseSet(cfg.set, cfg), terms = cfg.terms.slice(), nv = needs(terms);
  const rows = [], skipped = [];
  for (const u of units) {
    if (nv.some(k => !(u.x[k] > 0))) { skipped.push({ plot: u.plot, period: u.period, code: 'stand.x.missing' }); continue; }
    const t = targets(u.d, set, cfg); if (!t) { skipped.push({ plot: u.plot, period: u.period, code: 'stand.target.none' }); continue; }
    rows.push({ u, t });
  }
  const plots = new Set(rows.map(r => r.u.plot)), p = 1 + terms.length;
  const base = { schema: SCHEMA, tool: D.TOOL.id + ' ' + D.TOOL.version, set: set.id, approach: set.approach, family: set.family, method: set.method ?? null, keys: set.keys, terms, fit: cfg.fit,
    options: { a: set.approach === 'ppm' ? (cfg.ppmLoc === 'half-dmin' ? null : cfg.a ?? 0) : null, ppmLoc: set.approach === 'ppm' ? (cfg.ppmLoc ?? 'zero') : null, loc: set.family === 'weibull' && set.approach === 'prm' ? (cfg.loc ?? 'half-dmin') : null, aUser: cfg.loc === 'user' ? (cfg.a ?? 0) : null, xi: set.family === 'johnsonsb' ? cfg.xi ?? null : null, back: cfg.fit === 'logols' ? (cfg.back ?? 'median') : null },
    units: { d: 'cm', N: 'trees/ha', H: 'm', A: 'years' }, hColumn: cfg.hColumn ?? null,
    scope: { units: rows.length, plots: plots.size, ranges: Object.fromEntries(nv.map(k => [k, [Math.min(...rows.map(r => r.u.x[k])), Math.max(...rows.map(r => r.u.x[k]))]])), targets: Object.fromEntries(set.keys.map(k => [k, [Math.min(...rows.map(r => r.t[k])), Math.max(...rows.map(r => r.t[k]))]])) },
    skipped };
  if (plots.size < 2 || rows.length <= p) return { ...base, status: 'invalid', problems: [{ code: 'stand.few', units: rows.length, plots: plots.size, p }] };
  if (set.family === 'johnsonsb' && !(Number.isFinite(cfg.xi) && cfg.xi >= 0)) return { ...base, status: 'invalid', problems: [{ code: 'stand.xi' }] };
  const xs = rows.map(r => r.u.x), Y = rows.map(r => set.keys.map(k => r.t[k]));
  let eq;
  if (cfg.fit === 'sur') { const s = fitSUR(xs, Y, terms, { iterate: cfg.iterate !== false }); if (s.status !== 'ok') return { ...base, status: s.status, problems: [{ code: 'stand.fit', stage: s.stage }] };
    eq = set.keys.map((k, j) => ({ key: k, beta: s.beta[j], sigma2: s.Sigma[j][j] })); base.sur = { Sigma: s.Sigma, corr: s.corr, rounds: s.rounds, iterate: cfg.iterate !== false }; }
  else {
    eq = [];
    for (const [j, k] of set.keys.entries()) { const y = Y.map(r => r[j]), e = cfg.fit === 'logols' ? fitLogOLS(xs, y, terms) : fitNLS(xs, y, terms);
      if (e.status !== 'ok') return { ...base, status: e.status, problems: [{ code: 'stand.fit', key: k }] };
      eq.push({ key: k, beta: e.beta, se: e.se ?? null, sigma2: e.sigma2 ?? null, s2Log: e.s2Log ?? null, iter: e.iter ?? null }); }
  }
  // fit statistics on the training data (original scale)
  for (const [j, e] of eq.entries()) { const pr = xs.map(x => predictKey({ ...base, equations: eq }, e, x)), res = Y.map((r, i) => r[j] - pr[i]);
    e.rmse = Math.sqrt(res.reduce((s, v) => s + v * v, 0) / res.length); e.bias = -res.reduce((s, v) => s + v, 0) / res.length; }
  return { ...base, status: 'ok', equations: eq, trainingUnits: rows.map(r => ({ plot: r.u.plot, period: r.u.period, x: r.u.x, targets: r.t })) };
}
const predictKey = (model, e, x) => { const z = design(x, model.terms), m = dot(e.beta, z); return model.fit === 'logols' && model.options.back === 'mean' ? Math.exp(m + e.s2Log / 2) : Math.exp(m); };

/* ---------------- prediction ---------------- */
const ORDER = ['q25', 'q31', 'q50', 'q63', 'q95'];
/**
 * Predicted responses for stand variables x, consistency checks and the parameters. Nothing is clipped: an
 * inconsistent prediction (percentiles out of order, Dq not above the mean, median outside the support…) is reported
 * with status 'invalid' and no parameters. Extrapolation outside the training ranges is flagged.
 */
export function predict(model, x) {
  if (!model || model.status !== 'ok') throw new D.DistError('stand.model');
  const nv = needs(model.terms), miss = nv.filter(k => !(x[k] > 0));
  if (miss.length) return { status: 'invalid', problems: [{ code: 'stand.x.missing', keys: miss }], responses: null, params: null };
  const responses = Object.fromEntries(model.equations.map(e => [e.key, predictKey(model, e, x)]));
  const outside = nv.filter(k => x[k] < model.scope.ranges[k][0] || x[k] > model.scope.ranges[k][1]);
  const problems = [];
  const ord = ORDER.filter(k => k in responses); for (let i = 1; i < ord.length; i++) if (!(responses[ord[i]] > responses[ord[i - 1]])) problems.push({ code: 'stand.order', lo: ord[i - 1], hi: ord[i] });
  if ('dq' in responses && 'mean' in responses && !(responses.dq > responses.mean)) problems.push({ code: 'stand.dq' });
  if ('dmin' in responses && ord.length && !(responses.dmin < responses[ord[0]])) problems.push({ code: 'stand.dmin' });
  let result = null;
  if (!problems.length) {
    if (model.approach === 'ppm') {
      const params = { a: model.options.ppmLoc === 'half-dmin' ? 0.5 * responses.dmin : model.options.a, b: responses.b, c: responses.c };
      result = { status: 'ok', params };
    } else if (model.family === 'weibull') {
      const s = { ...responses, origin: 'predicted' }; if ('variance' in s) s.varDivisor = 'n';
      const o = model.options.loc === 'user' ? { loc: 'user', a: model.options.aUser } : { loc: 'half-dmin' };
      const r = D.runMethod(model.method, { type: 'summary', summary: s }, o); result = r.status === 'ok' ? { status: 'ok', params: r.params, recovery: r } : { status: r.status, recovery: r };
    } else {
      const r = D.runMethod('johnsonsb.parresol', { type: 'summary', summary: { xi: model.options.xi, mean: responses.mean, median: responses.median, dq: responses.dq, origin: 'predicted' } }, { xi: model.options.xi });
      result = r.status === 'ok' ? { status: 'ok', params: r.params, recovery: r } : { status: r.status, recovery: r };
    }
  }
  return { status: problems.length ? 'invalid' : result.status, problems, responses, params: result && result.status === 'ok' ? result.params : null, recovery: result ? result.recovery ?? null : null, outside };
}

/* ---------------- validation by plot ---------------- */
/**
 * K-fold cross-validation with plots as the unit of assignment: plots in natural order, plot j to fold j mod K, so all
 * periods of a plot stay in one fold. Each fold: the model is trained on the other folds only (targets computed from the
 * training units; nothing chosen from the held-out units) and the held-out units are predicted. Per held-out unit:
 * negative log-likelihood of its diameters under the predicted distribution (total and per tree) and KS D. Failed
 * predictions (inconsistent, no recovery) are counted, never dropped silently.
 */
export function crossValidate(units, cfg, K = 5) {
  const plots = [...new Set(units.map(u => u.plot))].sort(D.natural);
  if (plots.length < 2) return { status: 'invalid', problems: [{ code: 'stand.cv.few' }] };
  const k = Math.min(K, plots.length), fold = new Map(plots.map((pl, j) => [pl, j % k])), rows = [], folds = [];
  for (let f = 0; f < k; f++) {
    const tr = units.filter(u => fold.get(u.plot) !== f), te = units.filter(u => fold.get(u.plot) === f);
    const m = train(tr, cfg); folds.push({ fold: f, trainUnits: m.scope.units, testUnits: te.length, status: m.status });
    for (const u of te) {
      if (m.status !== 'ok') { rows.push({ plot: u.plot, period: u.period, fold: f, status: 'nomodel' }); continue; }
      const pr = predict(m, u.x);
      if (pr.status !== 'ok') { rows.push({ plot: u.plot, period: u.period, fold: f, status: pr.status, problems: pr.problems }); continue; }
      const fam = D.family(m.family); let nll = 0; for (const d of u.d) nll -= fam.logpdf(d, pr.params);
      rows.push({ plot: u.plot, period: u.period, fold: f, status: Number.isFinite(nll) ? 'ok' : 'outside', n: u.d.length, nll, nllPerTree: nll / u.d.length, ks: D.gof.ks(fam, pr.params, u.d), params: pr.params });
    }
  }
  const ok = rows.filter(r => r.status === 'ok'), mean = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
  return { status: 'ok', K: k, assignment: Object.fromEntries(fold), folds, units: rows,
    summary: { units: rows.length, ok: ok.length, failed: rows.length - ok.length, nll: ok.reduce((s, r) => s + r.nll, 0), nllPerTree: mean(ok.map(r => r.nllPerTree)), ks: mean(ok.map(r => r.ks)) } };
}

/* ---------------- export / import ---------------- */
export function exportModel(model, cv) {
  const { trainingUnits, ...m } = model;
  return { ...m, created: new Date().toISOString(), validation: cv ? { K: cv.K, summary: cv.summary, assignment: cv.assignment } : null, trainingUnits };
}
/** Checks a model file; returns { model } or { problems }. Only models with this schema and a complete structure are accepted. */
export function importModel(obj) {
  const p = [];
  if (!obj || obj.schema !== SCHEMA) p.push({ code: 'stand.import.schema' });
  else {
    if (!Array.isArray(obj.terms) || obj.terms.some(t => !TERMS.includes(t))) p.push({ code: 'stand.import.terms' });
    if (!SETS.includes(obj.set)) p.push({ code: 'stand.import.set' });
    if (!Array.isArray(obj.equations) || obj.equations.some(e => !Array.isArray(e.beta) || e.beta.length !== 1 + (obj.terms || []).length || e.beta.some(v => !Number.isFinite(v)))) p.push({ code: 'stand.import.coef' });
    if (!obj.scope || !obj.scope.ranges) p.push({ code: 'stand.import.scope' });
    if (obj.status !== 'ok') p.push({ code: 'stand.import.status' });
  }
  return p.length ? { problems: p } : { model: obj };
}

/* ---------------- CDFR and modified CDFR (stage P17, DIST_SPEC §4.2) ---------------- */
// The coefficients β shared by all plots are fitted by minimising a distance between observed and predicted cumulative
// distributions over all training units; θᵢ(β) are the parameters the model predicts for unit i (PPM directly, PRM by
// recovering them from the predicted targets with the verified recovery methods).
//   CDFR (source):          Σᵢ (1/nᵢ) Σⱼ [ (j − 0.5)/nᵢ − F(dᵢ₍ⱼ₎; θᵢ) ]²      (diameters sorted; equal diameters take
//                            consecutive j: tool rule)
//   modified CDFR (source): Σᵢ 1/(mᵢ − 1) Σ_{j=1}^{mᵢ−1} [ Cᵢⱼ − F(uᵢⱼ; θᵢ) ]²   (classes of width w from ⌊min/w⌋·w; uᵢⱼ the
//                            true upper bound, Cᵢⱼ the observed cumulative proportion; the last class is left out of this
//                            objective only, it stays in the class table and in the tree count; mᵢ > 1 required)
// The Dmin equation (location policy a = 0.5·Dmin) is fitted by NLS beforehand and held fixed. A recovery that fails or
// has several solutions at some β makes that β infeasible (never resolved by a rule): such steps are rejected and counted.
/** Classes of width w for one unit: [lo, hi) with counts (the last class included; counts add up to n). */
export function unitClasses(d, w) {
  const lo0 = Math.floor(Math.min(...d) / w) * w, m = Math.floor((Math.max(...d) - lo0) / w) + 1, cl = Array.from({ length: m }, (_, j) => ({ lo: lo0 + j * w, hi: lo0 + (j + 1) * w, n: 0 }));
  for (const v of d) cl[Math.min(m - 1, Math.floor((v - lo0) / w))].n++;
  return cl;
}
/** Observation rows of the objective for each unit: { i, x (diameter or class upper bound), y (target), w (weight) }. */
function cdfRows(units, fit, width) {
  const rows = [], excluded = [];
  units.forEach((u, i) => {
    if (fit === 'cdfr') { const s = [...u.d].sort((a, b) => a - b), n = s.length; s.forEach((v, j) => rows.push({ i, x: v, y: (j + 0.5) / n, w: 1 / n })); return; }
    const cl = unitClasses(u.d, width), m = cl.length, n = u.d.length;
    if (m < 2) { excluded.push({ plot: u.plot, period: u.period, code: 'stand.cdf.oneclass' }); return; }
    let cum = 0; for (let j = 0; j < m - 1; j++) { cum += cl[j].n; rows.push({ i, x: cl[j].hi, y: cum / n, w: 1 / (m - 1) }); }
  });
  return { rows, excluded };
}
/** Objective value for given parameters per unit (params[i] or null when not available). Exported for the hand checks. */
export function cdfObjective(units, params, fit, width = 2) {
  const fam = D.family('weibull'), { rows } = cdfRows(units, fit, width); let v = 0;
  for (const r of rows) { const p = params[r.i]; if (!p) return { value: Infinity, failed: true }; v += r.w * (r.y - fam.cdf(r.x, p)) ** 2; }
  return { value: v, failed: false };
}
function trainCDF(units, cfg) {
  const fit = cfg.fit, width = cfg.width ?? 2, start = train(units, { ...cfg, fit: 'nls' });
  if (start.status !== 'ok') return { ...start, fit, problems: [...(start.problems || []), { code: 'stand.cdf.start' }] };
  if (start.family !== 'weibull') return { ...start, fit, status: 'invalid', problems: [{ code: 'stand.cdf.family' }] };
  const keys = start.keys, free = keys.filter(k => k !== 'dmin'), p = 1 + start.terms.length;
  const used = units.filter(u => start.trainingUnits.some(t => t.plot === u.plot && t.period === u.period));
  const { rows, excluded } = cdfRows(used, fit, width);
  const inc = [...new Set(rows.map(r => r.i))], fam = D.family('weibull');
  const asModel = th => ({ ...start, equations: start.equations.map(e => free.includes(e.key) ? { ...e, beta: th.slice(free.indexOf(e.key) * p, (free.indexOf(e.key) + 1) * p) } : e) });
  // θᵢ(β) for every unit, cached per β (LM evaluates many observations at one β); failures counted by state
  let cacheKey = null, cache = null;
  const thetas = th => { const k = th.join(','); if (k === cacheKey) return cache; const m = asModel(th), fails = {};
    const ps = used.map(u => { const pr = predict(m, u.x); if (pr.status !== 'ok') { const st = pr.problems.length ? 'invalid' : pr.status; fails[st] = (fails[st] || 0) + 1; return null; } return pr.params; });
    cacheKey = k; cache = { ps, fails }; return cache; };
  const sw = rows.map(r => Math.sqrt(r.w));
  const resid = th => { const { ps, fails } = thetas(th); if (Object.keys(fails).length) return null; return rows.map((r, o) => sw[o] * (r.y - fam.cdf(r.x, ps[r.i]))); };
  const th0 = free.flatMap(k => start.equations.find(e => e.key === k).beta);
  const s0 = thetas(th0), base = { ...start, fit, cdf: { width: fit === 'mcdfr' ? width : null, weights: fit === 'cdfr' ? '1/n_i' : '1/(m_i - 1)', position: fit === 'cdfr' ? '(j - 0.5)/n_i, equal diameters consecutive' : 'class upper bound, last class excluded from the objective only',
    dmin: keys.includes('dmin') ? 'NLS, held fixed' : null, rootPolicy: 'a unique recovery solution is required; failures and several solutions make β infeasible', excludedUnits: excluded, start: null, objective: null, iter: null, failuresAtStart: s0.fails, rejected: 0 } };
  if (Object.keys(s0.fails).length) return { ...base, status: 'invalid', problems: [{ code: 'stand.cdf.startfail', fails: s0.fails }] };
  base.cdf.start = cdfObjective(used, s0.ps, fit, width).value;
  const r = lmVector(resid, th0, base.cdf);
  if (r.status !== 'ok') return { ...base, status: r.status, problems: [{ code: 'stand.fit' }] };
  const m = asModel(r.theta), fin = thetas(r.theta);
  base.cdf.objective = cdfObjective(used, fin.ps, fit, width).value; base.cdf.iter = r.iter; base.cdf.units = inc.length;
  for (const e of m.equations) { const j = keys.indexOf(e.key), pr = used.map(u => predictKey(m, e, u.x)), res = start.trainingUnits.map((t, i) => t.targets[e.key] - pr[i]);
    e.rmse = Math.sqrt(res.reduce((s2, v) => s2 + v * v, 0) / res.length); e.bias = -res.reduce((s2, v) => s2 + v, 0) / res.length; if (free.includes(e.key)) { e.se = null; e.fittedBy = fit; } else e.fittedBy = 'nls'; void j; }
  return { ...base, status: 'ok', equations: m.equations };
}

/**
 * Levenberg–Marquardt on a residual vector R(θ) with a forward-difference Jacobian built column by column (one R per
 * column: the parameters of every unit are computed once per β). R(θ) = null marks an infeasible β (a recovery failed or
 * had several solutions): the step is rejected and counted in rec.rejected. Convergence: relative step ≤ 1e-10, relative
 * decrease ≤ 1e-14 with a small step, or scaled gradient ≤ 1e-8 (as in core/nls.js).
 */
function lmVector(R, th0, rec) {
  let th = th0.slice(), r = R(th); if (!r) return { status: 'invalid' };
  const p = th.length, ss = v => v.reduce((a, x) => a + x * x, 0);
  const jac = (th, r) => { const J = Array.from({ length: r.length }, () => Array(p)); for (let j = 0; j < p; j++) { let h = 1e-7 * Math.max(1, Math.abs(th[j])), t = th.slice(); t[j] += h; let rj = R(t);
      if (!rj) { h = -h; t[j] = th[j] + h; rj = R(t); } if (!rj) return null; for (let o = 0; o < r.length; o++) J[o][j] = (rj[o] - r[o]) / h; } return J; };
  let S = ss(r), J = jac(th, r); if (!J) return { status: 'invalid' };
  const normal = (J, r) => { const A = Array.from({ length: p }, () => Array(p).fill(0)), g = Array(p).fill(0);
    for (let o = 0; o < r.length; o++) { const Jo = J[o]; for (let a = 0; a < p; a++) { g[a] -= Jo[a] * r[o]; for (let b = 0; b <= a; b++) A[a][b] += Jo[a] * Jo[b]; } }
    for (let a = 0; a < p; a++) for (let b = 0; b < a; b++) A[b][a] = A[a][b]; return { A, g }; };
  let { A, g } = normal(J, r), lambda = 1e-3 * Math.max(...A.map((q, k) => q[k])), nu = 2, iter = 0;
  const gradOk = () => g.every((gj, j) => Math.abs(gj) <= 1e-8 * Math.sqrt(Math.max(A[j][j], 1e-300) * Math.max(S, 1e-300)));
  while (iter < 300) {
    iter++; if (gradOk()) return { status: 'ok', theta: th, iter };
    const M = A.map((q, a) => q.map((v, b) => a === b ? v + lambda * Math.max(v, 1e-12) : v)), d = solve(M, g);
    if (!d) { lambda *= nu; nu *= 2; continue; }
    const cand = th.map((t, j) => t + d[j]), rc = R(cand), Sc = rc ? ss(rc) : Infinity; if (!rc) rec.rejected++;
    const stepRel = Math.max(...d.map(Math.abs)) / (Math.max(...th.map(Math.abs)) + 1e-10);
    if (Sc < S) {
      const old = S; th = cand; r = rc; S = Sc; J = jac(th, r); if (!J) return { status: 'noconverge', theta: th, iter };
      ({ A, g } = normal(J, r)); lambda = Math.max(lambda / 3, 1e-12); nu = 2;
      if (stepRel <= 1e-10 || ((old - S) <= 1e-14 * old && stepRel <= 1e-6)) return { status: 'ok', theta: th, iter };
    } else { lambda *= nu; nu *= 2; if (lambda > 1e20) return gradOk() || stepRel <= 1e-8 ? { status: 'ok', theta: th, iter } : { status: 'noconverge', theta: th, iter }; }
  }
  return { status: 'noconverge', theta: th, iter };
}
