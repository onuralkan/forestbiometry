// Model Evaluation: pure logic (no DOM). Definitions: docs/METHODS.md §7.
// Sign convention everywhere: e = predicted − observed.
import { parseNumber } from '../core/num.js';
import { cellText } from '../core/table.js';
import { classIndex } from '../stand/calc.js';

export const TOOL = { id: 'model-degerlendirme', version: '1.0.0' };
export const ROLES = ['unknown', 'training', 'test', 'cv'];       // user's statement about where predictions come from
export const NORMS = ['mean', 'range', 'sd'];                    // denominators for relative measures

/** Read one cell as a number. XLSX numeric cells need no decimal setting; text uses the user's choice. */
export function readNum(cell, decimal) {
  if (!cell) return { status: 'empty' };
  if (cell.t === 'n') return Number.isFinite(cell.v) ? { status: 'ok', value: cell.v } : { status: 'bad' };
  if (cell.t !== 's') return { status: 'bad' };
  const r = parseNumber(cell.v, decimal);
  return r.status === 'ok' ? { status: 'ok', value: r.value } : r.status === 'empty' ? { status: 'empty' } : { status: 'bad', reason: r.reason };
}

/* ---------------- metrics of one set of pairs ---------------- */
/** obs, pred: equal-length arrays of finite numbers. Returns null fields where a measure is undefined. */
export function metrics(obs, pred, norm = null) {
  const n = obs.length;
  const out = { n, bias: null, mae: null, rmse: null, sse: null, sst: null, r2: null, r2Reason: null, meanObs: null, meanPred: null, eMin: null, eMax: null, rel: null };
  if (!n) { out.r2Reason = 'n0'; return out; }
  let se = 0, sa = 0, ss = 0, so = 0, sp = 0, eMin = Infinity, eMax = -Infinity, oMin = Infinity, oMax = -Infinity;
  for (let i = 0; i < n; i++) {
    const e = pred[i] - obs[i];
    se += e; sa += Math.abs(e); ss += e * e; so += obs[i]; sp += pred[i];
    if (e < eMin) eMin = e; if (e > eMax) eMax = e; if (obs[i] < oMin) oMin = obs[i]; if (obs[i] > oMax) oMax = obs[i];
  }
  const mo = so / n;
  let sst = 0; for (let i = 0; i < n; i++) sst += (obs[i] - mo) ** 2;
  Object.assign(out, { bias: se / n, mae: sa / n, rmse: Math.sqrt(ss / n), sse: ss, sst, meanObs: mo, meanPred: sp / n, eMin, eMax });
  // R² = 1 − SSE/SST (not the squared correlation). Undefined when every observed value is the same.
  if (oMax === oMin) out.r2Reason = 'constant'; else out.r2 = 1 - ss / sst;
  if (norm) out.rel = relative(out, norm, obs, oMin, oMax);
  return out;
}
/** Relative measures = measure / denominator × 100. The denominator is reported; unsuitable → undefined. */
export function relative(m, norm, obs, oMin, oMax) {
  let den = null, reason = null;
  if (norm === 'mean') { den = m.meanObs; if (!(den > 0)) reason = 'mean-nonpositive'; }
  else if (norm === 'range') { den = oMax - oMin; if (!(den > 0)) reason = 'range-zero'; }
  else if (norm === 'sd') {
    if (m.n < 2) reason = 'sd-n'; else { den = Math.sqrt(m.sst / (m.n - 1)); if (!(den > 0)) reason = 'sd-zero'; }
  }
  const ok = !reason;
  return { norm, den, reason, bias: ok ? m.bias / den * 100 : null, mae: ok ? m.mae / den * 100 : null, rmse: ok ? m.rmse / den * 100 : null };
}

/* ---------------- rows, models, row sets ---------------- */
/**
 * table: raw table (core/table.js). spec = {
 *   obs: colIndex, models: [{ col, name, role }], decimal,
 *   groups: { plot?: col, species?: col, dclass?: { col, classes }, fold?: col },
 *   rowSet: 'common' | 'own', norm: null | 'mean' | 'range' | 'sd' }
 */
export function evaluate(table, spec) {
  const rows = table.rows, N = rows.length;
  const obs = rows.map(r => readNum(r[spec.obs], spec.decimal));
  const preds = spec.models.map(m => rows.map(r => readNum(r[m.col], spec.decimal)));
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
  const validFor = preds.map(p => rows.map((_, i) => obs[i].status === 'ok' && p[i].status === 'ok'));
  const common = rows.map((_, i) => validFor.every(v => v[i]));
  const nCommon = common.filter(Boolean).length;
  const models = spec.models.map((m, k) => {
    const p = preds[k];
    const acc = { rows: N, obsEmpty: 0, obsBad: 0, predEmpty: 0, predBad: 0, ownValid: 0, notCommon: 0 };
    for (let i = 0; i < N; i++) {
      if (obs[i].status === 'empty') acc.obsEmpty++; else if (obs[i].status === 'bad') acc.obsBad++;
      if (p[i].status === 'empty') acc.predEmpty++; else if (p[i].status === 'bad') acc.predBad++;
      if (validFor[k][i]) { acc.ownValid++; if (!common[i]) acc.notCommon++; }
    }
    const use = spec.rowSet === 'own' ? validFor[k] : common;
    const idx = []; for (let i = 0; i < N; i++) if (use[i]) idx.push(i);
    const o = idx.map(i => obs[i].value), q = idx.map(i => p[i].value);
    acc.used = idx.length; acc.dropped = N - idx.length;
    const groups = {};
    for (const key of ['plot', 'species', 'dclass', 'fold']) {
      if (!g[key]) continue;
      const by = new Map();
      for (const i of idx) { const lab = g[key][i]; if (!by.has(lab)) by.set(lab, []); by.get(lab).push(i); }
      let labels = [...by.keys()];
      labels = key === 'dclass' ? g.dclassOrder.filter(l => by.has(l)).concat(by.has('') ? [''] : []) : labels.sort(natural);
      groups[key] = labels.map(lab => ({ label: lab, ...metrics(by.get(lab).map(i => obs[i].value), by.get(lab).map(i => p[i].value), spec.norm) }));
    }
    return { ...m, index: k, acc, idx, obs: o, pred: q, overall: metrics(o, q, spec.norm), groups };
  });
  // sample overlap between models (only differs in 'own' mode)
  let overlap = null;
  if (models.length > 1) {
    overlap = models.map(a => models.map(b => { let c = 0; const sb = new Set(b.idx); for (const i of a.idx) if (sb.has(i)) c++; return c; }));
  }
  const sameSample = models.every(m => m.acc.used === (models[0] ? models[0].acc.used : 0)) && (!overlap || overlap.every((r, i) => r.every(c => c === models[i].acc.used)));
  return { N, nCommon, rowSet: spec.rowSet, models, overlap, sameSample, rowNumbers: table.rowNumbers };
}
function natural(a, b) {
  const na = /^-?\d+(\.\d+)?$/.test(a), nb = /^-?\d+(\.\d+)?$/.test(b);
  if (na && nb) return +a - +b || (a < b ? -1 : a > b ? 1 : 0);
  return a < b ? -1 : a > b ? 1 : 0;
}
