// Model Evaluation: pure logic (no DOM). Definitions: docs/METHODS.md §7.
// Sign convention everywhere: e = predicted − observed.
import { parseNumber } from '../core/num.js';
import { cellText } from '../core/table.js';
import { classIndex } from '../stand/calc.js';
import { tQuantile, tCdf, ncF1Quantile } from '../core/stats.js';

export const TOOL = { id: 'model-degerlendirme', version: '1.2.0-beta.1' };
export const ROLES = ['unknown', 'training', 'test', 'cv'];       // user's statement about where predictions come from
export const NORMS = ['mean', 'range', 'sd'];                    // denominators for relative measures
export const LEVELS = [0.9, 0.95, 0.99];                          // confidence levels of the interval for the bias
export const ALPHAS = [0.01, 0.05, 0.1];                          // sizes of the equivalence tests
export const MARGINS = ['abs', 'rel'];                            // equivalence margin: data units, or a fraction of s_e

/** Read one cell as a number. XLSX numeric cells need no decimal setting; text uses the user's choice. */
export function readNum(cell, decimal) {
  if (!cell) return { status: 'empty' };
  if (cell.t === 'n') return Number.isFinite(cell.v) ? { status: 'ok', value: cell.v } : { status: 'bad' };
  if (cell.t !== 's') return { status: 'bad' };
  const r = parseNumber(cell.v, decimal);
  return r.status === 'ok' ? { status: 'ok', value: r.value } : r.status === 'empty' ? { status: 'empty' } : { status: 'bad', reason: r.reason };
}

/* ---------------- metrics of one set of pairs ---------------- */
/**
 * obs, pred: equal-length arrays of finite numbers; w: optional positive weights of the same length (null = unweighted).
 * Weighted measures replace every average by Σw·(…)/Σw (with w ≡ 1 they are the unweighted ones). Null fields where a
 * measure is undefined.
 */
export function metrics(obs, pred, norm = null, w = null) {
  const n = obs.length;
  const out = { n, weighted: !!w, sumW: null, bias: null, mae: null, rmse: null, sse: null, sst: null, r2: null, r2Reason: null, meanObs: null, meanPred: null, eMin: null, eMax: null, rel: null };
  if (!n) { out.r2Reason = 'n0'; return out; }
  let W = 0, se = 0, sa = 0, ss = 0, so = 0, sp = 0, eMin = Infinity, eMax = -Infinity, oMin = Infinity, oMax = -Infinity;
  for (let i = 0; i < n; i++) {
    const e = pred[i] - obs[i], wi = w ? w[i] : 1;
    W += wi; se += wi * e; sa += wi * Math.abs(e); ss += wi * e * e; so += wi * obs[i]; sp += wi * pred[i];
    if (e < eMin) eMin = e; if (e > eMax) eMax = e; if (obs[i] < oMin) oMin = obs[i]; if (obs[i] > oMax) oMax = obs[i];
  }
  const mo = so / W;
  let sst = 0; for (let i = 0; i < n; i++) sst += (w ? w[i] : 1) * (obs[i] - mo) ** 2;
  Object.assign(out, { sumW: W, bias: se / W, mae: sa / W, rmse: Math.sqrt(ss / W), sse: ss, sst, meanObs: mo, meanPred: sp / W, eMin, eMax });
  // R² = 1 − SSE/SST (not the squared correlation). Undefined when every observed value is the same.
  if (oMax === oMin || !(sst > 0)) out.r2Reason = 'constant'; else out.r2 = 1 - ss / sst;
  if (norm) out.rel = relative(out, norm, obs, oMin, oMax);
  return out;
}
/** Relative measures = measure / denominator × 100. The denominator is reported; unsuitable → undefined. */
export function relative(m, norm, obs, oMin, oMax) {
  let den = null, reason = null;
  if (norm === 'mean') { den = m.meanObs; if (!(den > 0)) reason = 'mean-nonpositive'; }
  else if (norm === 'range') { den = oMax - oMin; if (!(den > 0)) reason = 'range-zero'; }
  else if (norm === 'sd') {
    if (m.weighted) reason = 'sd-weighted';                       // no weighted standard deviation is defined here
    else if (m.n < 2) reason = 'sd-n'; else { den = Math.sqrt(m.sst / (m.n - 1)); if (!(den > 0)) reason = 'sd-zero'; }
  }
  const ok = !reason;
  return { norm, den, reason, bias: ok ? m.bias / den * 100 : null, mae: ok ? m.mae / den * 100 : null, rmse: ok ? m.rmse / den * 100 : null };
}

/* ---------------- inference on the mean error (unweighted pairs) ---------------- */
/**
 * e: errors ŷ − y of one model. opts = { level, alpha, margin: null | { type: 'abs' | 'rel', value } }.
 * Interval for the bias: ē ± t(1 − (1 − level)/2; n − 1)·s/√n, s with divisor n − 1.
 * Equivalence (Robinson and Froese 2004): the null hypothesis is dissimilarity, |μ_e| ≥ δ; rejecting it means the
 * mean error is shown to lie within ±δ. δ is in data units ('abs') or δ = ε·s ('rel'). Two tests:
 *   TOST: the 1 − 2α interval ē ± t(1 − α; n − 1)·s/√n lies strictly inside (−δ, δ);
 *   paired t-test of equivalence (Wellek): ε = δ/s, ψ² = nε², C = √F⁻¹(α; 1, n − 1, ψ²) (non-central F),
 *   t = ē/(s/√n); dissimilarity is rejected when |t| < C; power at μ_e = 0 is 2F_t(C; n − 1) − 1.
 */
export function inference(e, opts = {}) {
  const n = e.length, level = opts.level || 0.95, alpha = opts.alpha || 0.05, margin = opts.margin || null;
  const out = { n, level, alpha, mean: null, sd: null, se: null, ci: null, equiv: null, reason: null };
  if (n < 2) { out.reason = 'n'; return out; }
  let s = 0; for (const x of e) s += x; const mean = s / n;
  let v = 0; for (const x of e) v += (x - mean) ** 2; const sd = Math.sqrt(v / (n - 1)), se = sd / Math.sqrt(n);
  const tc = tQuantile(1 - (1 - level) / 2, n - 1);
  Object.assign(out, { mean, sd, se, ci: { t: tc, lo: mean - tc * se, hi: mean + tc * se } });
  if (!margin) return out;
  const eq = { type: margin.type, value: margin.value, delta: null, eps: null, tost: null, wellek: null, reason: null };
  out.equiv = eq;
  if (!(margin.value > 0) || !Number.isFinite(margin.value) || !MARGINS.includes(margin.type)) { eq.reason = 'margin'; return out; }
  if (!(sd > 0)) { eq.reason = 'sd-zero'; return out; }
  eq.delta = margin.type === 'abs' ? margin.value : margin.value * sd;
  eq.eps = eq.delta / sd;
  const tq = tQuantile(1 - alpha, n - 1), lo = mean - tq * se, hi = mean + tq * se;
  eq.tost = { t: tq, lo, hi, equivalent: lo > -eq.delta && hi < eq.delta };
  const psi2 = n * eq.eps * eq.eps, C = Math.sqrt(ncF1Quantile(alpha, n - 1, psi2)), t = mean / se;
  eq.wellek = { psi2, C, t, equivalent: Math.abs(t) < C, power: 2 * tCdf(C, n - 1) - 1 };
  return out;
}

/* ---------------- rows, models, row sets ---------------- */
/**
 * table: raw table (core/table.js). spec = {
 *   obs: colIndex, models: [{ col, name, role }], decimal,
 *   groups: { plot?: col, species?: col, dclass?: { col, classes }, fold?: col },
 *   rowSet: 'common' | 'own', norm: null | 'mean' | 'range' | 'sd',
 *   weight?: colIndex (positive weights; rows with an empty, unreadable or non-positive weight are left out),
 *   infer?: { level, alpha, margin } (see inference; not computed when weights are chosen) }
 */
export function evaluate(table, spec) {
  const rows = table.rows, N = rows.length;
  const obs = rows.map(r => readNum(r[spec.obs], spec.decimal));
  const preds = spec.models.map(m => rows.map(r => readNum(r[m.col], spec.decimal)));
  const wcol = spec.weight == null ? null : spec.weight;
  const wt = wcol == null ? null : rows.map(r => { const v = readNum(r[wcol], spec.decimal); return v.status === 'ok' && !(v.value > 0) ? { status: 'nonpos' } : v; });
  const wOk = i => !wt || wt[i].status === 'ok';
  // group labels per row
  const g = {};
  for (const k of ['plot', 'species', 'fold']) if (spec.groups && spec.groups[k] != null) g[k] = rows.map(r => cellText(r[spec.groups[k]]).trim());
  if (spec.groups && spec.groups.dclass) {
    const dc = spec.groups.dclass, cl = dc.classes;
    g.dclass = rows.map(r => {
      const v = readNum(r[dc.col], spec.decimal); if (v.status !== 'ok') return '';
      const i = classIndex(cl, v.value);
      return i < 0 ? `< ${cl[0].lo}` : i >= cl.length ? `≥ ${cl[cl.length - 1].hi}` : cl[i].hi === Infinity ? `≥ ${cl[i].lo}` : `[${cl[i].lo}, ${cl[i].hi})`;
    });
    g.dclassOrder = [`< ${cl[0].lo}`, ...cl.map(c => c.hi === Infinity ? `≥ ${c.lo}` : `[${c.lo}, ${c.hi})`), `≥ ${cl[cl.length - 1].hi}`];
  }
  // per-model valid rows and accounting of dropped pairs
  const validFor = preds.map(p => rows.map((_, i) => obs[i].status === 'ok' && p[i].status === 'ok' && wOk(i)));
  const common = rows.map((_, i) => validFor.every(v => v[i]));
  const nCommon = common.filter(Boolean).length;
  const models = spec.models.map((m, k) => {
    const p = preds[k];
    const acc = { rows: N, obsEmpty: 0, obsBad: 0, predEmpty: 0, predBad: 0, wEmpty: 0, wBad: 0, ownValid: 0, notCommon: 0 };
    for (let i = 0; i < N; i++) {
      if (obs[i].status === 'empty') acc.obsEmpty++; else if (obs[i].status === 'bad') acc.obsBad++;
      if (p[i].status === 'empty') acc.predEmpty++; else if (p[i].status === 'bad') acc.predBad++;
      if (wt) { if (wt[i].status === 'empty') acc.wEmpty++; else if (wt[i].status !== 'ok') acc.wBad++; }
      if (validFor[k][i]) { acc.ownValid++; if (!common[i]) acc.notCommon++; }
    }
    const use = spec.rowSet === 'own' ? validFor[k] : common;
    const idx = []; for (let i = 0; i < N; i++) if (use[i]) idx.push(i);
    const o = idx.map(i => obs[i].value), q = idx.map(i => p[i].value), w = wt ? idx.map(i => wt[i].value) : null;
    const wOf = list => wt ? list.map(i => wt[i].value) : null;
    acc.used = idx.length; acc.dropped = N - idx.length;
    const groups = {};
    for (const key of ['plot', 'species', 'dclass', 'fold']) {
      if (!g[key]) continue;
      const by = new Map();
      for (const i of idx) { const lab = g[key][i]; if (!by.has(lab)) by.set(lab, []); by.get(lab).push(i); }
      let labels = [...by.keys()];
      labels = key === 'dclass' ? g.dclassOrder.filter(l => by.has(l)).concat(by.has('') ? [''] : []) : labels.sort(natural);
      groups[key] = labels.map(lab => ({ label: lab, ...metrics(by.get(lab).map(i => obs[i].value), by.get(lab).map(i => p[i].value), spec.norm, wOf(by.get(lab))) }));
    }
    const infer = !spec.infer ? null : wt ? { n: o.length, reason: 'weighted' } : inference(q.map((x, j) => x - o[j]), spec.infer);
    return { ...m, index: k, acc, idx, obs: o, pred: q, w, overall: metrics(o, q, spec.norm, w), groups, infer };
  });
  // sample overlap between models (only differs in 'own' mode)
  let overlap = null;
  if (models.length > 1) {
    overlap = models.map(a => models.map(b => { let c = 0; const sb = new Set(b.idx); for (const i of a.idx) if (sb.has(i)) c++; return c; }));
  }
  const sameSample = models.every(m => m.acc.used === (models[0] ? models[0].acc.used : 0)) && (!overlap || overlap.every((r, i) => r.every(c => c === models[i].acc.used)));
  return { N, nCommon, rowSet: spec.rowSet, weighted: !!wt, models, overlap, sameSample, rowNumbers: table.rowNumbers };
}
function natural(a, b) {
  const na = /^-?\d+(\.\d+)?$/.test(a), nb = /^-?\d+(\.\d+)?$/.test(b);
  if (na && nb) return +a - +b || (a < b ? -1 : a > b ? 1 : 0);
  return a < b ? -1 : a > b ? 1 : 0;
}
