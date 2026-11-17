// Biomass and carbon, stage BC04 (TOOLS_SPEC §5, optional; PLATFORM_PLAN BC-06): Monte Carlo uncertainty of the
// allometric approach, tree and plot × period level. No DOM. METHODS §22 (BC04).
//
// Only what the source of a coefficient set gives is simulated (user decision, 17 Nov 2026: compute what is given and
// label it): the covariance matrix of the coefficients (set.meta.cov) and the residual standard error on the scale of
// the equation (set.meta.rse: kg for linear forms, ln B or log10 B for log forms). A set with neither is held at its
// point value and listed; when no set used has either, nothing is computed ("no uncertainty information").
// Per replicate: one coefficient draw θ_b = θ̂ + L·z per set (L the Cholesky factor of the covariance), shared by every
// tree that uses the set; one residual draw ε ~ N(0, rse²) per tree and component, independent, added on the scale of
// the equation. With a residual the log forms are back-transformed without a correction factor (the residual itself
// carries the mean of exp(ε)); without one the set's own correction factor is applied, as in the point estimate.
// Assumptions written into the result: normal coefficient errors, normal residuals, independence between trees,
// between components and between sets. Intervals: percentiles (sample quantile type 7) of the replicates.
import { rng, normQuantile } from '../core/stats.js';
import { correctionFactor } from '../core/coef.js';
import { buildUnits } from '../stand/calc.js';
import { formOf, CO2_PER_C } from './calc.js';

export const MC_DEFAULTS = { B: 1000, seed: 20261117, level: 0.95 };   // tool rules, written into the result
export const MC_LIMITS = { Bmin: 100, Bmax: 20000 };
export const ASSUMPTIONS = ['normal-coefficients', 'normal-residuals', 'independent-trees', 'independent-components', 'independent-sets'];
const fin = x => typeof x === 'number' && Number.isFinite(x);

/** Covariance text "v11 v12; v21 v22" (rows by ';', decimal point) → matrix, or null when empty. */
export function parseCov(text) {
  const t = String(text ?? '').trim(); if (!t) return null;
  return t.split(';').map(r => r.trim().split(/\s+/).map(Number));
}
/** Lower Cholesky factor of a covariance matrix of size p, or { problem }. Same checks as the site-index delta method. */
export function cholesky(cov, p) {
  if (!Array.isArray(cov) || cov.length !== p || cov.some(r => !Array.isArray(r) || r.length !== p || r.some(v => !fin(v)))) return { problem: 'cov.shape' };
  for (let i = 0; i < p; i++) { if (!(cov[i][i] > 0)) return { problem: 'cov.diag' }; for (let j = 0; j < i; j++) if (Math.abs(cov[i][j] - cov[j][i]) > 1e-12 * Math.max(Math.abs(cov[i][j]), 1e-300)) return { problem: 'cov.sym' }; }
  const L = Array.from({ length: p }, () => new Array(p).fill(0));
  for (let i = 0; i < p; i++) for (let j = 0; j <= i; j++) {
    let v = cov[i][j]; for (let k = 0; k < j; k++) v -= L[i][k] * L[j][k];
    if (i === j) { if (!(v > 0)) return { problem: 'cov.notpd' }; L[i][i] = Math.sqrt(v); } else L[i][j] = v / L[j][j];
  }
  return { L };
}
/** What a set's source gives for the simulation. → { L | null, rse | null, parts: ['coef'?, 'resid'?], problems: [code] } */
export function setUncertainty(set) {
  const f = formOf(set), m = set.meta || {}, out = { L: null, rse: null, parts: [], problems: [] };
  if (!f) { out.problems.push('form.unknown'); return out; }
  const cov = typeof m.cov === 'string' ? parseCov(m.cov) : Array.isArray(m.cov) ? m.cov : null;
  if (cov) { const c = cholesky(cov, f.params.length); if (c.problem) out.problems.push(c.problem); else { out.L = c.L; out.parts.push('coef'); } }
  if (m.rse != null && m.rse !== '') { if (fin(m.rse) && m.rse > 0) { out.rse = m.rse; out.parts.push('resid'); } else out.problems.push('rse.bad'); }
  return out;
}
/** Sample quantile type 7 of a sorted array. */
export function quantile7(sorted, p) {
  const n = sorted.length; if (!n) return null; const h = (n - 1) * p, lo = Math.floor(h), hi = Math.min(n - 1, lo + 1);
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}
/** mean, sd (n − 1), cv (sd / mean), lower and upper percentile of a sample. */
export function summary(arr, level) {
  const n = arr.length; let s = 0; for (let i = 0; i < n; i++) s += arr[i];
  const mean = s / n; let v = 0; for (let i = 0; i < n; i++) v += (arr[i] - mean) ** 2;
  const sd = n > 1 ? Math.sqrt(v / (n - 1)) : 0, srt = Float64Array.from(arr).sort(), a = (1 - level) / 2;
  return { mean, sd, cv: mean !== 0 ? sd / Math.abs(mean) : null, lo: quantile7(srt, a), hi: quantile7(srt, 1 - a) };
}

/**
 * Monte Carlo over a package. ds, cfg, sets as for computeAllometric; allo = its result (the point estimate: only the
 * tree × component values with status 'ok' are simulated). opts = { B, seed, level }.
 * Draw order (fixed, so a seed always gives the same numbers): one stream rng(seed); z = Φ⁻¹(u + 2⁻³³);
 *   1. coefficients: for b = 1…B, for every set with a covariance (sorted by id): p values of z;
 *   2. residuals: for every tree (package order), every component (cfg order) computed with a set that has a
 *      residual standard error: B values of z.
 * → { status: 'ok'|'noinfo'|'bad', problems: [{ set, code }], B, seed, level, interval, assumptions,
 *     sets: [{ id, parts }], fixed: [set ids held at their point value], negative (draws below zero),
 *     trees: [{ row, B: summary + point, C: summary + point } | null], units: [{ plot_id, period, n, B, C, CO2 } (summary
 *     + point, Mg/ha) | null values where the unit has a tree not computed] }
 */
export function monteCarlo(ds, cfg, sets, allo, opts = {}) {
  const { B, seed, level } = { ...MC_DEFAULTS, ...opts }, comps = cfg.components || [];
  const used = [...new Set(allo.trees.flatMap(x => comps.map(c => x.comps[c.key]).filter(r => r.status === 'ok').map(r => r.setId)))].sort();
  const U = new Map(), problems = [];
  for (const id of used) { const u = setUncertainty(sets.get(id)); U.set(id, u); for (const code of u.problems) problems.push({ set: id, code }); }
  const base = { B, seed, level, interval: 'percentile (type 7)', assumptions: ASSUMPTIONS, sets: used.map(id => ({ id, parts: U.get(id).parts })), fixed: used.filter(id => !U.get(id).parts.length) };
  if (!(Number.isInteger(B) && B >= MC_LIMITS.Bmin && B <= MC_LIMITS.Bmax)) problems.push({ set: null, code: 'B.range' });
  if (!(Number.isInteger(seed) && seed >= 0 && seed <= 4294967295)) problems.push({ set: null, code: 'seed.range' });
  if (!(level > 0 && level < 1)) problems.push({ set: null, code: 'level.range' });
  if (problems.length) return { ...base, status: 'bad', problems };
  if (used.every(id => !U.get(id).parts.length)) return { ...base, status: 'noinfo', problems: [] };
  const r = rng(seed), z = () => normQuantile(r() + 2 ** -33);
  // 1. coefficient draws
  const thetas = new Map(used.map(id => [id, []]));
  for (let b = 0; b < B; b++) for (const id of used) {
    const u = U.get(id), s = sets.get(id), keys = formOf(s).params, th = keys.map(k => s.params[k]);
    if (u.L) { const zz = keys.map(() => z()); for (let i = 0; i < keys.length; i++) for (let j = 0; j <= i; j++) th[i] += u.L[i][j] * zz[j]; }
    thetas.get(id).push(Object.fromEntries(keys.map((k, i) => [k, th[i]])));
  }
  // units of the package (as standTotals)
  const { units: all } = buildUnits(ds, { status: null, emptyCombos: cfg.emptyCombos || 'unmeasured' });
  const units = all.filter(u => u.state === 'measured' || u.state === 'empty'), where = new Map();
  units.forEach((u, ui) => { for (const t of u.trees) where.set(t, { ui, ef: 10000 / u.area / 1000 }); });
  const uB = units.map(() => new Float64Array(B)), uC = units.map(() => new Float64Array(B)), uMiss = units.map(() => 0);
  // 2. trees
  let negative = 0;
  const trees = allo.trees.map(x => {
    const tb = new Float64Array(B), tc = new Float64Array(B), ok = comps.length && comps.every(c => x.comps[c.key].status === 'ok');
    for (const c of comps) {
      const res = x.comps[c.key]; if (res.status !== 'ok') continue;
      const s = sets.get(res.setId), f = formOf(s), u = U.get(res.setId), th = thetas.get(res.setId), D = x.t.dbh, H = x.t.height ?? null;
      const corr = f.scale !== 'none' && u.rse == null ? (correctionFactor(s) ?? 1) : 1;
      for (let b = 0; b < B; b++) {
        let y = f.f(th[b], D, H); if (u.rse != null) y += u.rse * z();
        const v = (f.scale === 'none' ? y : f.scale === 'log' ? Math.exp(y) : 10 ** y) * corr;
        if (v < 0) negative++;
        tb[b] += v; tc[b] += v * c.CF;
      }
    }
    const w = where.get(x.t);
    if (!ok) { if (w) uMiss[w.ui]++; return null; }
    if (w) for (let b = 0; b < B; b++) { uB[w.ui][b] += tb[b] * w.ef; uC[w.ui][b] += tc[b] * w.ef; }
    return { row: x.row, B: { point: x.sum, ...summary(tb, level) }, C: { point: x.C, ...summary(tc, level) } };
  });
  const out = units.map((u, i) => {
    const p = allo.units[i], miss = uMiss[i] > 0;
    const co2 = miss ? null : uC[i].map(v => v * CO2_PER_C);
    return { plot_id: u.plot_id, period: u.period, n: u.trees.length, B: miss ? null : { point: p.B, ...summary(uB[i], level) }, C: miss ? null : { point: p.C, ...summary(uC[i], level) }, CO2: miss ? null : { point: p.CO2, ...summary(co2, level) } };
  });
  return { ...base, status: 'ok', problems: [], negative, trees, units: out };
}
