// Relative Ranking (Nispi Sıralama): pure logic (no DOM). Definitions: docs/METHODS.md §9.
// Poudel & Cao (2013), Eq. 10: R_i = 1 + (m − 1)(S_i − S_best)/(S_worst − S_best); best = 1, worst = m.
import { cellText } from '../core/table.js';
import { readNum } from '../eval/calc.js';

export const TOOL = { id: 'nispi-siralama', version: '1.0.0' };
export const DIRS = ['max', 'min', 'abs'];       // larger is better | smaller is better | closest to zero is better (|value|)

/* ---------------- direction suggestion from the column name (the user confirms) ---------------- */
const norm = h => String(h).toLocaleLowerCase('tr').replace(/²/g, '2').replace(/[çğıöşü]/g, c => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' }[c])).replace(/[^a-z0-9%]/g, '');
const MAX = ['r2', 'rsq', 'rsquare', 'rsquared', 'adjr2', 'r2adj', 'radj', 'adjustedr2', 'pseudor2', 'fi', 'fitindex', 'ef', 'nse', 'modelefficiency', 'belirlilikkatsayisi', 'uyumindeksi'];
const ABS = ['bias', 'e', 'me', 'meanerror', 'meanbias', 'bias%', 'mb', 'mpe', 'pbias', 'yanlilik', 'ortalamahata', 'sapma', 'bias(%)'];
const MIN = ['rmse', 'rmse%', 'rrmse', 'mse', 'mae', 'mae%', 'mab', 'aae', 'aad', 'mad', 'mape', 'aic', 'aicc', 'bic', 'sbc', 'sse', 'rss', 'see', 'rse', 'sigma', 'ks', 'ksd', 'ad', 'a2', 'ei', 'errorindex', 'nll', 'mlogl', '2logl', '-2logl', 'deviance', 'cv', 'cv%', 'chi2', 'hataindeksi'];
export function suggestDirection(header) {
  const h = norm(header);
  if (MAX.includes(h)) return 'max';
  if (ABS.includes(h)) return 'abs';
  if (MIN.includes(h)) return 'min';
  if (/^r2/.test(h) || /^adjr2/.test(h)) return 'max';
  if (/^(rmse|mae|aic|bic|mse|mab|aae|mape)/.test(h)) return 'min';
  if (/^(bias|me%?$|mpe)/.test(h)) return 'abs';
  return null;                                     // unknown: the user must choose
}

/* ---------------- reading the table ---------------- */
/** Picks a header row: first row with a text first cell and ≥ 2 other text cells, followed by a row with a number. */
export function guessHeaderRow(rows, decimal = '.') {
  for (let i = 0; i + 1 < rows.length && i < 30; i++) {
    const r = rows[i], txt = r.map(c => cellText(c).trim());
    const textCells = txt.filter((t, j) => t && readNum(r[j], decimal).status !== 'ok').length;
    const next = rows[i + 1], nums = next.filter(c => { const v = readNum(c, decimal); return v.status === 'ok'; }).length;
    if (txt[0] && textCells >= 3 && nums >= 2) return i;
    if (txt[0] && textCells >= 2 && nums >= 1 && r.length === 2) return i;
  }
  return 0;
}
/**
 * raw: table read with every row as data. spec = { headerRow, modelCol, criteria:[{ col, dir }], decimal }.
 * Returns models (with source row numbers and display labels) and the value matrix; problems per cell.
 */
export function readModels(raw, spec) {
  const H = raw.rows[spec.headerRow] || [];
  const headers = H.map((c, j) => cellText(c).trim() || `#${j + 1}`);
  const models = [];
  for (let i = spec.headerRow + 1; i < raw.rows.length; i++) {
    const r = raw.rows[i], name = cellText(r[spec.modelCol]).trim();
    const vals = spec.criteria.map(k => readNum(r[k.col], spec.decimal));
    if (!name && vals.every(v => v.status === 'empty')) continue;           // blank line
    models.push({ row: raw.rowNumbers[i], name, values: vals.map(v => v.status === 'ok' ? v.value : null), bad: vals.map(v => v.status) });
  }
  // duplicate or empty names get the source row number, so every model stays identifiable
  const count = new Map(); for (const m of models) count.set(m.name, (count.get(m.name) || 0) + 1);
  for (const m of models) m.label = !m.name ? `(${m.row})` : count.get(m.name) > 1 ? `${m.name} (${m.row})` : m.name;
  const duplicates = [...count].filter(([n, c]) => n && c > 1).map(([n, c]) => ({ name: n, count: c }));
  return { headers, criteria: spec.criteria.map(k => ({ ...k, name: headers[k.col] })), models, duplicates };
}

/* ---------------- relative ranks ---------------- */
/** S: values; dir: 'max' | 'min' | 'abs'. Returns { R, best, worst, constant }. m = S.length. */
export function relativeRanks(S, dir) {
  const v = dir === 'abs' ? S.map(Math.abs) : S, m = v.length;
  let lo = Infinity, hi = -Infinity; for (const x of v) { if (x < lo) lo = x; if (x > hi) hi = x; }
  const best = dir === 'max' ? hi : lo, worst = dir === 'max' ? lo : hi;
  if (hi === lo) return { R: v.map(() => 1), best, worst, constant: true };   // every model equal on this criterion
  return { R: v.map(x => 1 + (m - 1) * (x - best) / (worst - best)), best, worst, constant: false };
}
/** Competition ranking (1, 2, 2, 4) of ascending values; ties within 1e-12 relative. */
export function ordinal(v) {
  const idx = v.map((x, i) => i).sort((a, b) => v[a] - v[b]), out = new Array(v.length);
  idx.forEach((i, k) => { out[i] = k > 0 && Math.abs(v[i] - v[idx[k - 1]]) <= 1e-12 * Math.max(1, Math.abs(v[i])) ? out[idx[k - 1]] : k + 1; });
  return out;
}
/**
 * data: result of readModels. excluded: Set of model indices left out by the user.
 * Models with a missing or unreadable value in any criterion cannot be ranked and are listed apart.
 */
export function rank(data, excluded = new Set()) {
  const crit = data.criteria, problems = [];
  if (!crit.length) problems.push({ code: 'no.criteria' });
  if (crit.some(k => !DIRS.includes(k.dir))) problems.push({ code: 'no.direction', names: crit.filter(k => !DIRS.includes(k.dir)).map(k => k.name) });
  const incomplete = [], used = [];
  data.models.forEach((md, i) => {
    if (excluded.has(i)) return;
    if (md.values.some(v => v == null)) incomplete.push(i); else used.push(i);
  });
  if (used.length < 2) problems.push({ code: 'few.models', m: used.length });
  if (problems.length) return { problems, used, incomplete, excluded: [...excluded], m: used.length };
  const m = used.length;
  const per = crit.map((k, j) => ({ ...relativeRanks(used.map(i => data.models[i].values[j]), k.dir), name: k.name, dir: k.dir }));
  const sums = used.map((_, r) => per.reduce((s, p) => s + p.R[r], 0));
  const overall = relativeRanks(sums, 'min');
  const ord = ordinal(overall.R);
  const rows = used.map((i, r) => ({ index: i, label: data.models[i].label, row: data.models[i].row, values: data.models[i].values, R: per.map(p => p.R[r]), sum: sums[r], overall: overall.R[r], ordinal: ord[r] }))
    .sort((a, b) => a.overall - b.overall || a.row - b.row);
  // criteria giving identical relative ranks for every model (e.g. FI = 1 − SSE/SST and prediction R², or RMSE and MSE): equal weighting counts them twice
  const same = [];
  for (let a = 0; a < per.length; a++) for (let b = a + 1; b < per.length; b++) if (!per[a].constant && per[a].R.every((x, r) => Math.abs(x - per[b].R[r]) <= 1e-9 * m)) same.push([per[a].name, per[b].name]);
  return { problems, m, per: per.map(p => ({ name: p.name, dir: p.dir, best: p.best, worst: p.worst, constant: p.constant })), rows, used, incomplete, excluded: [...excluded], sameRanks: same, overallConstant: overall.constant };
}
/** Models for the radar chart: best n and/or worst n by overall rank, plus any picked by name. */
export function pickForChart(rows, { best = 0, worst = 0, extra = [] } = {}) {
  const set = new Set();
  rows.slice(0, best).forEach(r => set.add(r.index));
  if (worst > 0) rows.slice(-worst).forEach(r => set.add(r.index));
  extra.forEach(i => { if (rows.some(r => r.index === i)) set.add(i); });
  return rows.filter(r => set.has(r.index));
}
