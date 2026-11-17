// Nonlinear regression (PLATFORM_PLAN SM-02, 17 Nov 2026; user decisions: ready-made forms and free formulas, weighted
// NLS, intervals, model comparison, coefficient library). No DOM. METHODS §26.
// Fitting: Levenberg–Marquardt of core/nls.js (METHODS §10) on the weighted problem y/√ψ = f/√ψ, with exact Jacobians
// from core/expr.js. Sources [B]: Parresol, B.R. 2001. Additivity of nonlinear biomass equations. Can. J. For. Res. 31:
// 865–878: additive-error model (Eq. 1), variance function σ²_t = σ²·ψ_t (Eq. 2–3), ψ = X^θ with θ from the OLS
// regression ln e²_t = ln σ² + θ·ln X_t on the unweighted residuals (Eq. 4–5), EGNLS cov(b) = σ̂²[ZᵀΨ⁻¹Z]⁻¹ with
// σ̂² = S(b)/(T − K) (Eq. 7, 9a–b), mean variance z(b)ᵀs²(b)z(b) (Eq. 10) and new-observation variance
// σ̂²ψ + z(b)ᵀs²(b)z(b) (Eq. 11); coefficient intervals b ± t·SE ("in an analogous manner to linear least squares").
// Ready-made forms: the growth forms of SQ-03 (METHODS §18, with their reading status) and the power forms a·x^b and
// a·x1^b·x2^c (Parresol 2001 Eq. 15). Fit measures: the Model Evaluation tool's own definitions (eval/calc.js metrics,
// METHODS §7; bias = mean(ŷ − y)). AIC (tool rule): Gaussian likelihood with variance σ²ψ_t, σ² at its maximum S/n,
// AIC = 2k − 2 ln L, k = number of coefficients + 1 (θ of an estimated weight not counted; stated).
import { levenbergMarquardt, covariance, solve } from '../core/nls.js';
import { tQuantile } from '../core/stats.js';
import { registerForm, form as formOf } from '../core/coef.js';
import { parse, evaluate, evalGrad, toText } from '../core/expr.js';
import { metrics } from '../eval/calc.js';

export const TOOL = { id: 'dogrusal-olmayan-regresyon', version: '1.0.0-beta.1' };
const fin = x => typeof x === 'number' && Number.isFinite(x);

/** Ready-made forms: expression, variables, parameters, reading status of the source (METHODS §26). */
export const READY = {
  cr: { name: 'Chapman–Richards', expr: 'b0*(1-exp(-b1*x))^b2', vars: ['x'], status: 'B', src: 'growth' },
  schu: { name: 'Schumacher', expr: 'b0*exp(-b1/x)', vars: ['x'], status: 'B', src: 'growth' },
  gomp: { name: 'Gompertz', expr: 'b0*exp(-b1*exp(-b2*x))', vars: ['x'], status: 'A', src: 'growth' },
  logi: { name: 'Logistic', expr: 'b0/(1+b1*exp(-b2*x))', vars: ['x'], status: 'A', src: 'growth' },
  mono: { name: 'Monomolecular', expr: 'b0*(1-b1*exp(-b2*x))', vars: ['x'], status: 'A', src: 'growth' },
  weib: { name: 'Weibull', expr: 'b0-b1*exp(-b2*x^b3)', vars: ['x'], status: 'A', src: 'growth' },
  pow: { name: 'Power', expr: 'a*x^b', vars: ['x'], status: 'B', src: 'parresol2001' },
  pow2: { name: 'Power, two variables', expr: 'a*x1^b*x2^c', vars: ['x1', 'x2'], status: 'B', src: 'parresol2001' },
};
export const READY_IDS = Object.keys(READY);

/* ---------- model definitions ---------- */
/**
 * A model from its definition. def = { kind: 'ready', ready: id } | { kind: 'formula', expr, vars: [names] } (names of
 * the formula that are data columns; every other name is a coefficient).
 * → { ok: true, ast, text, vars, params } | { ok: false, code, … }
 */
export function compile(def) {
  const isReady = def && def.kind === 'ready';
  if (isReady && !READY[def.ready]) return { ok: false, code: 'ready.unknown' };
  const src = isReady ? READY[def.ready].expr : def && def.expr, vars = isReady ? READY[def.ready].vars : (def && def.vars) || [];
  const r = parse(src);
  if (!r.ok) return { ok: false, code: 'parse', parse: r };
  const unknownVar = vars.find(v => !r.names.includes(v));
  if (unknownVar) return { ok: false, code: 'var.absent', name: unknownVar };
  const params = r.names.filter(n => !vars.includes(n)), used = r.names.filter(n => vars.includes(n));
  if (!params.length) return { ok: false, code: 'params.none' };
  if (!used.length) return { ok: false, code: 'vars.none' };
  if (params.length > 12) return { ok: false, code: 'params.many' };
  return { ok: true, ast: r.ast, text: toText(r.ast), vars: used, params };
}

/* ---------- starting values (tool rule) ---------- */
function olsMulti(X, y) {
  const k = X[0].length, A = Array.from({ length: k }, () => new Array(k).fill(0)), g = new Array(k).fill(0);
  for (let t = 0; t < y.length; t++) for (let a = 0; a < k; a++) { g[a] += X[t][a] * y[t]; for (let c = 0; c < k; c++) A[a][c] += X[t][a] * X[t][c]; }
  return solve(A, g);
}
/** Candidate starts of a ready-made form from the data: a grid around the data's range (growth forms, as SQ-03) or OLS on ln–ln (power forms). */
export function autoStarts(id, X, y) {
  const x = X.map(r => r[0]), xmax = Math.max(...x), ymax = Math.max(...y), ymin = Math.min(...y), out = [];
  if (id === 'pow' || id === 'pow2') {
    const rows = X.map((r, t) => t).filter(t => y[t] > 0 && X[t].every(v => v > 0));
    if (rows.length <= X[0].length + 1) return [];
    const c = olsMulti(rows.map(t => [1, ...X[t].map(Math.log)]), rows.map(t => Math.log(y[t])));
    return c ? [[Math.exp(c[0]), ...c.slice(1)]] : [];
  }
  const A = [1.05, 1.3, 1.7, 2.5, 4].map(k => k * ymax), K = [0.2, 0.5, 1, 2, 4].map(k => k / xmax);
  if (id === 'cr') for (const a of A) for (const k of K) for (const c of [0.6, 1, 1.5, 2.5, 4]) out.push([a, k, c]);
  if (id === 'schu') for (const a of A) for (const b of [0.2, 0.5, 1, 2, 4].map(k => k * xmax)) out.push([a, b]);
  if (id === 'gomp' || id === 'logi') for (const a of A) for (const k of K) for (const b of [0.5, 1.5, 3, 8, 20]) out.push([a, b, k]);
  if (id === 'mono') for (const a of A) for (const k of K) for (const b of [0.3, 0.7, 0.95, 1, 1.2]) out.push([a, b, k]);
  if (id === 'weib') for (const a of A) for (const m of [0.7, 1, 1.5, 2, 3]) for (const k of [0.2, 1, 4].map(q => q / xmax ** m)) out.push([a, a - Math.max(ymin * 0.5, 1e-9), k, m]);
  return out;
}

/* ---------- fitting ---------- */
const LM = { maxIter: 2000, xtol: 1e-15, ftol: 1e-15, gtol: 1e-12 };
function lmModel(m, psi) {
  const env = (th, i, X) => { const e = {}; m.params.forEach((p, j) => { e[p] = th[j]; }); m.vars.forEach((v, j) => { e[v] = X[i][j]; }); return e; };
  return { f: (th, o) => evaluate(m.ast, env(th, o.i, o.X)) / Math.sqrt(psi[o.i]), grad: (th, o) => evalGrad(m.ast, env(th, o.i, o.X), m.params).d.map(v => v / Math.sqrt(psi[o.i])) };
}
const sseOf = (m, th, X, y, psi) => { const md = lmModel(m, psi); let s = 0; for (let i = 0; i < y.length; i++) { const r = y[i] / Math.sqrt(psi[i]) - md.f(th, { i, X }); s += r * r; } return Number.isFinite(s) ? s : Infinity; };
function runLM(m, X, y, psi, starts) {
  const md = lmModel(m, psi), obs = y.map((_, i) => ({ i, X })), ys = y.map((v, i) => v / Math.sqrt(psi[i]));
  let best = null;
  for (const th0 of starts) {
    if (!Number.isFinite(sseOf(m, th0, X, y, psi))) continue;
    const r = levenbergMarquardt(md, obs, ys, th0, LM);
    if (r.status === 'invalid') continue;
    if (!best || (r.status === 'ok' && (best.status !== 'ok' || r.sse < best.sse - 1e-12 * best.sse))) best = { ...r, start: th0 };
  }
  return best ? { ...best, md, obs } : null;
}

/**
 * Fits one model. X: T × (vars of m) values, y: T values, opts = { start: [per parameter] | null (ready forms: automatic),
 * weight: { kind: 'none' } | { kind: 'power', X: T values (> 0), theta: number | null (null = estimated, Eq. 4) } |
 * { kind: 'column', psi: T values (> 0) }, readyId, level: 0.95 }.
 * → { status: 'ok' | 'noconverge' | 'bad', code?, theta, se, ci, cov, s2, df, n, p, pred, res, metrics, aic, weight, psi, start, iter }
 */
export function fitModel(m, X, y, opts = {}) {
  const n = y.length, p = m.params.length, level = opts.level ?? 0.95;
  if (n <= p + 1) return { status: 'bad', code: 'n.few', n, p };
  if (opts.start && (opts.start.length !== p || !opts.start.every(fin))) return { status: 'bad', code: 'start.missing', n, p };
  let starts = opts.start ? [opts.start] : opts.readyId ? autoStarts(opts.readyId, X, y).map(s => ({ s, v: sseOf(m, s, X, y, y.map(() => 1)) })).filter(q => Number.isFinite(q.v)).sort((a, b) => a.v - b.v).slice(0, 5).map(q => q.s) : [];
  if (!starts.length) return { status: 'bad', code: opts.readyId ? 'start.none' : 'start.missing', n, p };
  const w = opts.weight || { kind: 'none' }, ones = y.map(() => 1);
  let psi = ones, weight = { kind: 'none' };
  if (w.kind === 'power') {
    if (!w.X || w.X.length !== n || w.X.some(v => !(fin(v) && v > 0))) return { status: 'bad', code: 'weight.var', n, p };
    let th = w.theta, estimated = false;
    if (th == null) {
      const u = runLM(m, X, y, ones, starts); if (!u || u.status !== 'ok') return { status: 'bad', code: 'weight.unweighted', n, p };
      const e = y.map((v, i) => v - evaluate(m.ast, Object.fromEntries([...m.params.map((q, j) => [q, u.theta[j]]), ...m.vars.map((q, j) => [q, X[i][j]])])));
      const rows = e.map((_, i) => i).filter(i => e[i] !== 0 && fin(e[i]));
      const c = rows.length > 2 ? olsMulti(rows.map(i => [1, Math.log(w.X[i])]), rows.map(i => Math.log(e[i] * e[i]))) : null;
      if (!c || !fin(c[1])) return { status: 'bad', code: 'weight.theta', n, p };
      th = c[1]; estimated = true; starts = [u.theta];
    }
    if (!fin(th)) return { status: 'bad', code: 'weight.theta', n, p };
    psi = w.X.map(v => v ** th); weight = { kind: 'power', theta: th, estimated };
  } else if (w.kind === 'column') {
    if (!w.psi || w.psi.length !== n || w.psi.some(v => !(fin(v) && v > 0))) return { status: 'bad', code: 'weight.col', n, p };
    psi = w.psi.slice(); weight = { kind: 'column' };
  }
  const r = runLM(m, X, y, psi, starts);
  if (!r) return { status: 'bad', code: 'start.invalid', n, p };
  const theta = r.theta, S = r.sse, cv = covariance(r.md, theta, r.obs, S);
  const pred = X.map((_, i) => evaluate(m.ast, Object.fromEntries([...m.params.map((q, j) => [q, theta[j]]), ...m.vars.map((q, j) => [q, X[i][j]])])));
  const res = y.map((v, i) => v - pred[i]), df = n - p, tq = tQuantile(1 - (1 - level) / 2, df);
  const se = cv ? cv.se : null, k = p + 1, lnL = -n / 2 * Math.log(2 * Math.PI * S / n) - 0.5 * psi.reduce((s, v) => s + Math.log(v), 0) - n / 2;
  return { status: r.status === 'ok' ? (cv ? 'ok' : 'singular') : 'noconverge', reason: r.reason, theta, se, cov: cv ? cv.V : null, corr: cv ? cv.corr : null,
    ci: se ? theta.map((v, j) => [v - tq * se[j], v + tq * se[j]]) : null, t: tq, level, s2: S / df, S, df, n, p, pred, res, psi, weight,
    metrics: metrics(y, pred), aic: 2 * k - 2 * lnL, k, start: r.start, iter: r.iter };
}

/**
 * Mean and new-observation intervals at a point (Parresol 2001 Eq. 10–11). point: { name: value } for the model's
 * variables; psi: the weight value at the point (1 when unweighted; X^θ for a power weight). → { yhat, S2, ci, pi } | null
 */
export function interval(m, fit, point, psi = 1) {
  if (!fit || fit.status !== 'ok' || !fit.cov || !m.vars.every(v => fin(point[v])) || !(fin(psi) && psi > 0)) return null;
  const env = { ...Object.fromEntries(m.params.map((q, j) => [q, fit.theta[j]])), ...point }, g = evalGrad(m.ast, env, m.params);
  if (!fin(g.v) || !g.d.every(fin)) return null;
  let S2 = 0; for (let a = 0; a < m.params.length; a++) for (let c = 0; c < m.params.length; c++) S2 += g.d[a] * fit.cov[a][c] * g.d[c];
  const c = fit.t * Math.sqrt(S2), q = fit.t * Math.sqrt(S2 + fit.s2 * psi);
  return { yhat: g.v, S2, ci: [g.v - c, g.v + c], pi: [g.v - q, g.v + q] };
}

/**
 * Data rows for a set of models: the response and every column any model or weight uses must be a finite number
 * (weight columns > 0), so that all models are compared on the same trees. table rows: [{ row, vals: [number|null] }].
 * → { use: [rowIndex], dropped: [{ row, col }] }
 */
export function commonRows(rows, cols) {
  const use = [], dropped = [];
  rows.forEach((r, i) => { const bad = cols.find(c => !(fin(r.vals[c.col]) && (!c.positive || r.vals[c.col] > 0))); if (bad) dropped.push({ row: r.row, col: bad.col }); else use.push(i); });
  return { use, dropped };
}

/* ---------- coefficient library ---------- */
const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
/** Registered form of a model ('nls.<ready id>' or 'nls.expr.<hash of the canonical formula and its variables>'). → form id */
export function ensureForm(m, readyId = null) {
  const id = readyId ? 'nls.' + readyId : 'nls.expr.' + fnv(m.text + '|' + m.vars.join(',') + '|' + m.params.join(','));
  if (!formOf(id)) {
    try { registerForm({ id, tool: 'nls', params: m.params.map(key => ({ key })), inputs: Object.fromEntries(m.vars.map(v => [v, { unit: '-' }])), output: { name: 'y', unit: '-' }, formula: { tr: 'y = ' + m.text, en: 'y = ' + m.text }, transform: 'none' }); }
    catch (e) { /* registered meanwhile */ }
  }
  return id;
}
for (const id of READY_IDS) ensureForm(compile({ kind: 'ready', ready: id }), id);
/** Registers the formula forms of stored sets (fit.expr, fit.vars), so the library can check and show them. */
export function registerStoredForms(sets) {
  for (const s of sets || []) {
    if (!s || typeof s.form !== 'string' || !s.form.startsWith('nls.expr.') || formOf(s.form) || !s.fit || typeof s.fit.expr !== 'string' || !Array.isArray(s.fit.vars)) continue;
    const m = compile({ kind: 'formula', expr: s.fit.expr, vars: s.fit.vars });
    if (m.ok) ensureForm(m);
  }
}
/** Prediction of a stored set (any 'nls.*' form) at a point { var: value }. → number | null */
export function predictSet(set, point) {
  const fm = formOf(set && set.form); if (!fm || fm.tool !== 'nls') return null;
  const r = parse(fm.formula.en.replace(/^y = /, '')); if (!r.ok) return null;
  const v = evaluate(r.ast, { ...set.params, ...point }); return fin(v) ? v : null;
}
