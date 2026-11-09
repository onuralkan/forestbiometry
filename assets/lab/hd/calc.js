// Height–Diameter Modelling (fixed-effects version): pure logic (no DOM). Definitions and sources: docs/METHODS.md §10.
// Units inside: d in cm, h in m, breast height bh in m. Every model is h = bh + f(d; θ); it is fitted to z = h − bh
// by nonlinear least squares (Levenberg–Marquardt). Sign convention for errors everywhere: e = predicted − observed.
import { levenbergMarquardt, covariance, quadForm, ols } from '../core/nls.js';
import { tQuantile, shuffle } from '../core/stats.js';
import { readNum } from '../eval/calc.js';
import { cellText } from '../core/table.js';
import { UNITS } from '../core/num.js';

export const TOOL = { id: 'boy-cap', version: '1.0.0' };
export const DIVERGE_FACTOR = 50;      // asymptote above 50 × the largest observed (h − bh): "not identified by the data" (tool rule)
export const CV_SEED = 20261109;       // fixed seed: folds are reproducible
export const CV_K = 10;                // folds for random tree-level CV and for grouped CV with many plots
export const LOPO_MAX = 20;            // up to this many plots: leave-one-plot-out; above: CV_K grouped folds
export const LEVEL = 0.95;

/* ---------------- models: f(θ, d) = h − bh; gradients are analytic ---------------- */
const pos = t => t.every(v => v > 0);
export const MODELS = [
  { id: 'naslund', p: 2, names: ['a', 'b'], formula: 'h = bh + d² / (a + b·d)²', ref: 'naslund',
    f: ([a, b], d) => { const u = a + b * d; return d * d / (u * u); },
    grad: ([a, b], d) => { const u = a + b * d, k = -2 * d * d / (u * u * u); return [k, k * d]; },
    asym: ([, b]) => b > 0 ? 1 / (b * b) : null,
    valid: ([a, b], ds) => ds.every(d => a + b * d > 0),
    starts(d, z) { const w = d.map((v, i) => v / Math.sqrt(z[i])), c = ols(d, w); const zm = Math.max(...z); return [c, [1, 1 / Math.sqrt(zm * 1.2)]].filter(Boolean); } },
  { id: 'michailoff', p: 2, names: ['a', 'b'], formula: 'h = bh + a·exp(−b / d)', ref: 'michailoff',
    f: ([a, b], d) => a * Math.exp(-b / d),
    grad: ([a, b], d) => { const e = Math.exp(-b / d); return [e, -a * e / d]; },
    asym: ([a]) => a > 0 ? a : null,
    starts(d, z) { const c = ols(d.map(v => 1 / v), z.map(Math.log)); return c ? [[Math.exp(c[0]), -c[1]]] : [[Math.max(...z) * 1.2, 10]]; } },
  { id: 'curtis', p: 2, names: ['a', 'b'], formula: 'h = bh + a·(d / (1 + d))^b', ref: 'curtis',
    f: ([a, b], d) => a * (d / (1 + d)) ** b,
    grad: ([a, b], d) => { const q = d / (1 + d), e = q ** b; return [e, a * e * Math.log(q)]; },
    asym: ([a]) => a > 0 ? a : null,
    starts(d, z) { const c = ols(d.map(v => Math.log(v / (1 + v))), z.map(Math.log)); return c ? [[Math.exp(c[0]), c[1]]] : [[Math.max(...z), 1]]; } },
  { id: 'power', p: 2, names: ['a', 'b'], formula: 'h = bh + a·d^b', ref: 'power',
    f: ([a, b], d) => a * d ** b,
    grad: ([a, b], d) => { const e = d ** b; return [e, a * e * Math.log(d)]; },
    asym: () => null,
    starts(d, z) { const c = ols(d.map(Math.log), z.map(Math.log)); return c ? [[Math.exp(c[0]), c[1]]] : [[1, 0.5]]; } },
  { id: 'richards', p: 3, names: ['a', 'b', 'c'], formula: 'h = bh + a·(1 − exp(−b·d))^c', ref: 'richards',
    f: ([a, b, c], d) => a * (-Math.expm1(-b * d)) ** c,
    grad: ([a, b, c], d) => { const E = Math.exp(-b * d), g = -Math.expm1(-b * d), gc = g ** c; return [gc, a * c * g ** (c - 1) * d * E, a * gc * Math.log(g)]; },
    asym: ([a]) => a > 0 ? a : null,
    valid: ([, b]) => b > 0,
    starts(d, z) {
      const zm = Math.max(...z), out = [];
      for (const k of [1.05, 1.3, 1.8, 3]) for (const c of [0.6, 1, 1.5, 2.5]) {
        const a = k * zm; let num = 0, den = 0;
        for (let i = 0; i < d.length; i++) { const u = (z[i] / a) ** (1 / c); if (u < 1) { num += d[i] * -Math.log1p(-u); den += d[i] * d[i]; } }
        if (den > 0 && num > 0) out.push([a, num / den, c]);
      }
      return out;
    } },
  { id: 'weibull', p: 3, names: ['a', 'b', 'c'], formula: 'h = bh + a·(1 − exp(−b·d^c))', ref: 'weibull',
    f: ([a, b, c], d) => -a * Math.expm1(-b * d ** c),
    grad: ([a, b, c], d) => { const dc = d ** c, E = Math.exp(-b * dc); return [-Math.expm1(-b * dc), a * E * dc, a * E * b * dc * Math.log(d)]; },
    asym: ([a]) => a > 0 ? a : null,
    valid: ([, b]) => b > 0,
    starts(d, z) {
      const zm = Math.max(...z), out = [];
      for (const k of [1.05, 1.3, 1.8, 3]) {
        const a = k * zm, c = ols(d.map(Math.log), z.map(v => Math.log(-Math.log1p(-v / a))));
        if (c && Number.isFinite(c[0]) && Number.isFinite(c[1])) out.push([a, Math.exp(c[0]), c[1]]);
      }
      return out;
    } },
];
export const modelById = id => MODELS.find(m => m.id === id);

/* ---------------- data ---------------- */
/**
 * table: raw table (core/table.js). spec = { dcol, hcol, pcol?, scol?, sval?, dunit:'cm'|'mm', hunit:'m'|'dm'|'cm', decimal, bh }.
 * Every source row is kept with its status; the measured height is never changed.
 *   dStatus: ok | empty | bad | nonpos;  hStatus: ok | empty | bad | lebh (h ≤ bh: cannot have a diameter at breast height)
 *   fit: row used for fitting (d ok and h ok);  missing: d ok and h empty (gets a separate predicted height).
 */
export function prepare(table, spec) {
  const fd = UNITS.dbh[spec.dunit], fh = UNITS.height[spec.hunit], bh = spec.bh;
  const acc = { rows: table.rows.length, species: 0, dEmpty: 0, dBad: 0, dNonpos: 0, hBad: 0, hLeBh: 0, missing: 0, fit: 0 };
  const rows = [];
  table.rows.forEach((r, i) => {
    const species = spec.scol != null ? cellText(r[spec.scol]).trim() : '';
    if (spec.scol != null && spec.sval != null && species !== spec.sval) { acc.species++; return; }
    const plot = spec.pcol != null ? cellText(r[spec.pcol]).trim() : '';
    const dv = readNum(r[spec.dcol], spec.decimal), hv = readNum(r[spec.hcol], spec.decimal);
    const row = { i, rowNo: table.rowNumbers ? table.rowNumbers[i] : i + 2, plot, species, d: null, h: null, dStatus: 'ok', hStatus: 'ok', fit: false, missing: false };
    if (dv.status === 'empty') row.dStatus = 'empty'; else if (dv.status !== 'ok') row.dStatus = 'bad';
    else { row.d = dv.value * fd; if (!(row.d > 0)) row.dStatus = 'nonpos'; }
    if (hv.status === 'empty') row.hStatus = 'empty'; else if (hv.status !== 'ok') row.hStatus = 'bad';
    else { row.h = hv.value * fh; if (!(row.h > bh)) row.hStatus = 'lebh'; }
    if (row.dStatus === 'empty') acc.dEmpty++; else if (row.dStatus === 'bad') acc.dBad++; else if (row.dStatus === 'nonpos') acc.dNonpos++;
    if (row.dStatus === 'ok') {
      if (row.hStatus === 'ok') { row.fit = true; acc.fit++; }
      else if (row.hStatus === 'empty') { row.missing = true; acc.missing++; }
      else if (row.hStatus === 'bad') acc.hBad++; else acc.hLeBh++;
    }
    rows.push(row);
  });
  const fitRows = rows.filter(r => r.fit);
  const plots = [...new Set(fitRows.map(r => r.plot))].sort(natural);
  const d = fitRows.map(r => r.d);
  return { rows, fitRows, acc, bh, plots, hasPlot: spec.pcol != null, nPlots: spec.pcol != null ? plots.length : 0,
    dmin: d.length ? Math.min(...d) : null, dmax: d.length ? Math.max(...d) : null };
}

/* ---------------- fitting ---------------- */
/** Fits one model to (d, z = h − bh). opts.inference: compute SE/covariance (only when the observations may be treated as independent). */
export function fitModel(m, d, z, opts = {}) {
  const n = d.length, uniq = new Set(d).size, out = { id: m.id, p: m.p, n, status: 'ok', theta: null, warn: [] };
  if (n < m.p + 2 || uniq < m.p + 1) return { ...out, status: 'toofew' };
  const zmax = Math.max(...z);
  const valid = th => th.every(Number.isFinite) && (!m.valid || m.valid(th, d));
  const blowup = th => th.some(v => Math.abs(v) > 1e8) || (m.asym(th) != null && m.asym(th) > DIVERGE_FACTOR * zmax);
  const starts = m.starts(d, z).filter(valid);
  if (!starts.length) return { ...out, status: 'nostart' };
  // try a few starts (cheapest first), keep the best converged solution
  const ranked = starts.map(s => ({ s, sse: d.reduce((acc, v, i) => acc + (z[i] - m.f(s, v)) ** 2, 0) })).filter(r => Number.isFinite(r.sse)).sort((a, b) => a.sse - b.sse).slice(0, 4);
  let best = null, lastBad = null;
  let agree = 0;
  for (const { s } of ranked) {
    const r = levenbergMarquardt(m, d, z, s, { valid, blowup, maxIter: 1000 });
    if (r.status === 'ok') {
      if (best && Math.abs(r.sse - best.sse) <= 1e-10 * best.sse) agree++;     // two starts reached the same minimum: stop
      if (!best || r.sse < best.sse) best = r;
      if (agree) break;
    } else if (!lastBad || r.status === 'diverged') lastBad = r;
  }
  if (!best) { const r = lastBad || { status: 'noconverge', iter: 0 }; return { ...out, status: r.status, iter: r.iter, theta: r.theta || null }; }
  const th = best.theta, sse = best.sse;
  Object.assign(out, { theta: th, sse, iter: best.iter, asym: m.asym(th) });
  if (blowup(th)) return { ...out, status: 'diverged' };
  if (!th.every(v => v > 0)) out.warn.push({ code: 'sign', params: m.names.filter((_, j) => !(th[j] > 0)) });
  const e = d.map((v, i) => m.f(th, v) - z[i]);            // predicted − observed
  out.bias = e.reduce((s, v) => s + v, 0) / n; out.mae = e.reduce((s, v) => s + Math.abs(v), 0) / n; out.rmse = Math.sqrt(sse / n);
  out.sigma = Math.sqrt(sse / (n - m.p));                   // residual standard error, df = n − p
  out.df = n - m.p;
  const ll = -n / 2 * (Math.log(2 * Math.PI) + Math.log(sse / n) + 1), k = m.p + 1;
  out.logLik = ll; out.aicValue = 2 * k - 2 * ll; out.bicValue = k * Math.log(n) - 2 * ll;   // reported only when the likelihood suits the data
  if (opts.inference) {
    const cv = covariance(m, th, d, sse);
    if (!cv) out.warn.push({ code: 'singular' });
    else {
      out.V = cv.V; out.se = cv.se; out.corr = cv.corr;
      const tq = tQuantile(1 - (1 - LEVEL) / 2, n - m.p);
      out.tq = tq; out.ci = th.map((t, j) => [t - tq * cv.se[j], t + tq * cv.se[j]]);
      for (let j = 0; j < m.p; j++) for (let k2 = 0; k2 < j; k2++) if (Math.abs(cv.corr[j][k2]) > 0.99) { out.warn.push({ code: 'corr', pair: [m.names[k2], m.names[j]], r: cv.corr[j][k2] }); }
    }
  }
  return out;
}
/** Fits every model to the same fitting rows. inference: data may be treated as independent (no plot column, or one plot). */
export function fitAll(prep, inference) {
  const d = prep.fitRows.map(r => r.d), z = prep.fitRows.map(r => r.h - prep.bh);
  return MODELS.map(m => fitModel(m, d, z, { inference }));
}
/** Whether standard errors, intervals and AIC are offered: only when trees may be treated as independent observations. */
export function inferenceAllowed(prep) { return !prep.hasPlot || prep.nPlots <= 1; }

/* ---------------- predictions ---------------- */
export const predict = (fit, d, bh) => bh + modelById(fit.id).f(fit.theta, d);
export const outside = (prep, d) => d < prep.dmin || d > prep.dmax;
/**
 * Mean-curve confidence interval and single-tree prediction interval at d (delta method, t with n − p df).
 * Both assume independent errors with constant variance; the prediction interval also assumes normal errors.
 * Returns null intervals when the fit has no covariance (inference not allowed or singular).
 */
export function intervals(fit, d, bh) {
  const m = modelById(fit.id), yhat = bh + m.f(fit.theta, d);
  if (!fit.V) return { yhat, ci: null, pi: null };
  const g = m.grad(fit.theta, d), v = quadForm(fit.V, g), s2 = fit.sigma * fit.sigma, t = fit.tq;
  return { yhat, se: Math.sqrt(v), ci: [yhat - t * Math.sqrt(v), yhat + t * Math.sqrt(v)], pi: [yhat - t * Math.sqrt(s2 + v), yhat + t * Math.sqrt(s2 + v)] };
}
/** Predicted heights for rows whose height is missing (separate column; the measured column is never touched). */
export function predictMissing(prep, fit) {
  return prep.rows.filter(r => r.missing).map(r => ({ row: r, h: predict(fit, r.d, prep.bh), outside: outside(prep, r.d) }));
}

/* ---------------- residual diagnostics ---------------- */
export function residuals(prep, fit) {
  return prep.fitRows.map(r => { const yhat = predict(fit, r.d, prep.bh); return { d: r.d, plot: r.plot, obs: r.h, fit: yhat, e: yhat - r.h }; });
}
/** Residual spread in thirds of the fitted values (informational; constant variance is an assumption of the intervals). */
export function spreadByThirds(res) {
  const s = res.slice().sort((a, b) => a.fit - b.fit), n = s.length, out = [];
  for (let k = 0; k < 3; k++) {
    const part = s.slice(Math.floor(k * n / 3), Math.floor((k + 1) * n / 3)); if (part.length < 2) { out.push(null); continue; }
    const m = part.reduce((a, r) => a + r.e, 0) / part.length;
    out.push({ lo: part[0].fit, hi: part[part.length - 1].fit, n: part.length, sd: Math.sqrt(part.reduce((a, r) => a + (r.e - m) ** 2, 0) / (part.length - 1)) });
  }
  return out;
}
export function byPlot(res) {
  const m = new Map();
  for (const r of res) { if (!m.has(r.plot)) m.set(r.plot, []); m.get(r.plot).push(r.e); }
  return [...m.keys()].sort(natural).map(p => { const e = m.get(p), n = e.length; return { plot: p, n, bias: e.reduce((a, v) => a + v, 0) / n, rmse: Math.sqrt(e.reduce((a, v) => a + v * v, 0) / n) }; });
}
export function errMetrics(e) {
  const n = e.length; if (!n) return { n: 0, bias: null, mae: null, rmse: null };
  return { n, bias: e.reduce((a, v) => a + v, 0) / n, mae: e.reduce((a, v) => a + Math.abs(v), 0) / n, rmse: Math.sqrt(e.reduce((a, v) => a + v * v, 0) / n) };
}

/* ---------------- cross-validation ---------------- */
/**
 * Folds over the fitting rows (indices into prep.fitRows).
 *  'plot': whole plots are held out together (generalisation to new plots). ≤ LOPO_MAX plots: leave-one-plot-out;
 *          more: plots shuffled with CV_SEED and dealt round-robin into CV_K folds. Needs ≥ 2 plots.
 *  'tree': trees shuffled with CV_SEED and dealt into min(CV_K, n) folds (new trees from the same plots).
 */
export function cvPlan(prep, mode) {
  const rows = prep.fitRows, n = rows.length;
  if (mode === 'plot') {
    if (!prep.hasPlot || prep.nPlots < 2) return { mode, folds: [], problem: 'cv.plot.few' };
    const plots = prep.plots, groups = plots.length <= LOPO_MAX ? plots.map(p => [p]) : (() => {
      const sh = shuffle(plots, CV_SEED), g = Array.from({ length: CV_K }, () => []); sh.forEach((p, i) => g[i % CV_K].push(p)); return g;
    })();
    const folds = groups.map(g => { const s = new Set(g); return { label: g.join(', '), plots: g, test: rows.map((r, i) => s.has(r.plot) ? i : -1).filter(i => i >= 0) }; });
    return { mode, lopo: plots.length <= LOPO_MAX, folds };
  }
  const K = Math.min(CV_K, n), order = shuffle(rows.map((_, i) => i), CV_SEED), folds = Array.from({ length: K }, (_, k) => ({ label: String(k + 1), test: [] }));
  order.forEach((idx, pos) => folds[pos % K].test.push(idx));
  folds.forEach(f => f.test.sort((a, b) => a - b));
  return { mode, folds };
}
/** One fold: every model is fitted to the training rows only (its own starting values); held-out rows are predicted. */
export function cvFold(prep, fold) {
  const rows = prep.fitRows, test = new Set(fold.test), tr = rows.filter((_, i) => !test.has(i));
  const d = tr.map(r => r.d), z = tr.map(r => r.h - prep.bh), dmin = Math.min(...d), dmax = Math.max(...d);
  const fits = MODELS.map(m => fitModel(m, d, z));
  const preds = fits.map((fi, k) => fi.status === 'ok' ? fold.test.map(i => prep.bh + MODELS[k].f(fi.theta, rows[i].d)) : null);
  // model selection inside the fold: smallest training AIC (n·ln(SSE/n) + 2k form) among converged models
  let sel = -1; fits.forEach((fi, k) => { if (fi.status === 'ok' && (sel < 0 || fi.aicValue < fits[sel].aicValue)) sel = k; });
  return { label: fold.label, plots: fold.plots, nTrain: tr.length, test: fold.test, status: fits.map(f => f.status), preds, sel,
    outside: fold.test.map(i => rows[i].d < dmin || rows[i].d > dmax) };
}
/** Pools held-out predictions. Models are compared on the same held-out rows: rows of folds where any model failed are left out. */
export function cvSummary(prep, folds) {
  const rows = prep.fitRows, M = MODELS.length;
  const common = folds.filter(f => f.preds.every(p => p));
  const eModel = Array.from({ length: M }, () => []), eSel = [], eSelAll = [];
  let nOut = 0;
  for (const f of common) f.test.forEach((i, j) => { for (let k = 0; k < M; k++) eModel[k].push(f.preds[k][j] - rows[i].h); if (f.outside[j]) nOut++; });
  for (const f of folds) if (f.sel >= 0) f.test.forEach((i, j) => eSelAll.push(f.preds[f.sel][j] - rows[i].h));
  for (const f of common) f.test.forEach((i, j) => eSel.push(f.preds[f.sel][j] - rows[i].h));
  const perFold = folds.map(f => ({ label: f.label, nTrain: f.nTrain, nTest: f.test.length, nOutside: f.outside.filter(Boolean).length, sel: f.sel,
    status: f.status, rmse: f.preds.map(p => p ? errMetrics(p.map((v, j) => v - rows[f.test[j]].h)).rmse : null) }));
  const chosen = MODELS.map((_, k) => folds.filter(f => f.sel === k).length);
  return { nFolds: folds.length, nCommonFolds: common.length, dropped: folds.filter(f => !f.preds.every(p => p)).map(f => f.label),
    nTest: eModel[0].length, nOutside: nOut, models: eModel.map(errMetrics), selection: errMetrics(eSel), selectionAll: errMetrics(eSelAll), chosen, perFold };
}

/* ---------------- new diameters ---------------- */
/** Parses a list of diameters (cm after unit conversion) typed by the user; separators: space, newline, ';'. Decimal per setting. */
export function parseDiameters(text, decimal, dunit) {
  const out = [], bad = [];
  for (const t of String(text).split(/[\s;]+/).filter(Boolean)) {
    const r = readNum({ t: 's', v: t }, decimal);
    if (r.status === 'ok' && r.value > 0) out.push(r.value * UNITS.dbh[dunit]); else bad.push(t);
  }
  return { d: out, bad };
}

function natural(a, b) {
  const na = /^-?\d+(\.\d+)?$/.test(a), nb = /^-?\d+(\.\d+)?$/.test(b);
  if (na && nb) return +a - +b || (a < b ? -1 : a > b ? 1 : 0);
  return a < b ? -1 : a > b ? 1 : 0;
}
export { natural };
