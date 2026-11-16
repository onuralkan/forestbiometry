// Taper equation fitting, stage SV-02/a3 (TOOLS_SPEC TP02). No DOM.
// Data: stem measurements (core/stems.js, stem-sections/1, the same import as the Stem Section Volume tool); the bark
// side is chosen ('ob' fits outside-bark diameters, 'ib' inside-bark ones); dbh (outside bark) and total height come
// from the tree. Points of trees in state 'error' and points without the chosen diameter are left out (counted).
//
// Scales (written into the result):
//   'd'      (default): nonlinear least squares on d (cm), unweighted, both forms.
//   'source': the scale of the source: mb76 → nonlinear least squares on y = d²/D² (Max and Burkhart 1976 fit y);
//             kozak02 → ordinary least squares on ln d, the model being linear in ln a0, a1, a2, b1…b6 on that scale
//             (Kozak 2004 fitted by this log-linearization; no back-transformation correction is applied here and
//             this is written into the result).
// Starting values: mb76: grid over the join points (a1 0.50…0.95, a2 0.02…0.30, step 0.05/0.02), the b's by linear
// least squares on y for each pair, best pair; kozak02: the log-linear fit. Then Levenberg–Marquardt (core/nls.js).
// Points at the tip (h ≥ H) are left out for kozak02 (X = 0: ln X undefined); their d is 0 by the model when the
// exponent at the tip is > 0.
// Standard errors: σ̂²(JᵀJ)⁻¹ assuming independent observations; the points of one tree are NOT independent, so they are
// labelled 'independent-observations' (no mixed-effects fit in this stage).
import { levenbergMarquardt, covariance, solve } from '../core/nls.js';
import { blankSet, newId } from '../core/coef.js';
import { FORMS, TOOL, volume as profileVolume } from './calc.js';
import { treeVolume } from '../secvol/calc.js';

const fin = x => typeof x === 'number' && Number.isFinite(x);
export const FIT_DEFAULTS = { form: 'mb76', bark: 'ib', scale: 'd', classes: 10 };

/** Observations from a stems result: [{ row, key, plot_id, tree_id, period, D, H, h, d }] and what was left out. */
export function observations(st, { bark = 'ib', form = 'mb76' } = {}) {
  const obs = [], left = { errorTrees: 0, noTree: 0, noDiameter: 0, tip: 0 };
  for (const T of st.trees) {
    if (T.state === 'error') { left.errorTrees++; continue; }
    if (!(T.dbh > 0 && T.height > 1.3)) { left.noTree++; continue; }
    for (const p of T.points) {
      const d = bark === 'ob' ? p.d : p.d_ib;
      if (!(fin(d) && fin(p.h))) { left.noDiameter++; continue; }
      if (p.h > T.height) { left.noDiameter++; continue; }
      if (form === 'kozak02' && p.h >= T.height) { left.tip++; continue; }
      obs.push({ row: p.row, key: T.key, plot_id: T.plot_id, tree_id: T.tree_id, period: T.period, D: T.dbh, H: T.height, h: p.h, d });
    }
  }
  return { obs, left };
}

/* ---- mb76: y = b1(x−1) + b2(x²−1) + b3(a1−x)²I1 + b4(a2−x)²I2 ---- */
const MB = FORMS.mb76;
const mbTerms = (a1, a2, x) => [x - 1, x * x - 1, x <= a1 ? (a1 - x) ** 2 : 0, x <= a2 ? (a2 - x) ** 2 : 0];
const mbP = th => ({ b1: th[0], b2: th[1], b3: th[2], b4: th[3], a1: th[4], a2: th[5] });
function mbModel(scale) {
  return {
    f: (th, o) => { const y = MB.y(mbP(th), o.h / o.H); return scale === 'source' ? y : y >= 0 ? o.D * Math.sqrt(y) : NaN; },
    grad: (th, o) => {
      const x = o.h / o.H, p = mbP(th), t = mbTerms(p.a1, p.a2, x);
      const g = [...t, x <= p.a1 ? 2 * p.b3 * (p.a1 - x) : 0, x <= p.a2 ? 2 * p.b4 * (p.a2 - x) : 0];
      if (scale === 'source') return g;
      const y = MB.y(p, x), k = y > 0 ? o.D / (2 * Math.sqrt(y)) : NaN;
      return g.map(v => v * k);
    },
  };
}
function mbStart(obs) {
  let best = null;
  for (let a1 = 0.5; a1 <= 0.95 + 1e-9; a1 += 0.05) for (let a2 = 0.02; a2 <= 0.30 + 1e-9; a2 += 0.02) {
    if (!(a2 < a1)) continue;
    const A = Array.from({ length: 4 }, () => Array(4).fill(0)), v = Array(4).fill(0);
    for (const o of obs) { const t = mbTerms(a1, a2, o.h / o.H), y = (o.d / o.D) ** 2; for (let j = 0; j < 4; j++) { v[j] += t[j] * y; for (let k = 0; k < 4; k++) A[j][k] += t[j] * t[k]; } }
    const b = solve(A, v); if (!b) continue;
    let sse = 0; for (const o of obs) { const t = mbTerms(a1, a2, o.h / o.H), r = (o.d / o.D) ** 2 - t.reduce((s, q, j) => s + q * b[j], 0); sse += r * r; }
    if (!best || sse < best.sse) best = { sse, theta: [...b, a1, a2] };
  }
  return best ? best.theta : null;
}

/* ---- kozak02: d = a0·D^a1·H^a2·X^E ---- */
const KZ = FORMS.kozak02;
const kzP = th => ({ a0: th[0], a1: th[1], a2: th[2], b1: th[3], b2: th[4], b3: th[5], b4: th[6], b5: th[7], b6: th[8] });
const kzParts = o => { const z = o.h / o.H, X = (1 - Math.cbrt(z)) / (1 - Math.cbrt(1.3 / o.H)), Q = 1 - Math.cbrt(z); return { X, t: [z ** 4, 1 / Math.exp(o.D / o.H), X ** 0.1, 1 / o.D, o.H ** Q, X] }; };
const kzD = (th, o) => o.D * Math.sqrt(KZ.y(kzP(th), o.h / o.H, o.D, o.H));
const kzModel = {
  f: kzD,
  grad: (th, o) => { const d = kzD(th, o), { X, t } = kzParts(o), lx = Math.log(X); return [d / th[0], d * Math.log(o.D), d * Math.log(o.H), ...t.map(q => d * lx * q)]; },
};
/** OLS on ln d: ln d = c0 + a1 ln D + a2 ln H + Σ b_k t_k ln X (Kozak 2004's estimation scale). */
function kzLogLinear(obs) {
  const rows = obs.filter(o => o.d > 0).map(o => { const { X, t } = kzParts(o), lx = Math.log(X); return { z: [1, Math.log(o.D), Math.log(o.H), ...t.map(q => q * lx)], y: Math.log(o.d) }; });
  const p = 9, A = Array.from({ length: p }, () => Array(p).fill(0)), v = Array(p).fill(0);
  for (const r of rows) for (let j = 0; j < p; j++) { v[j] += r.z[j] * r.y; for (let k = 0; k < p; k++) A[j][k] += r.z[j] * r.z[k]; }
  const c = solve(A, v); if (!c) return null;
  let sse = 0; for (const r of rows) { const e = r.y - r.z.reduce((s, q, j) => s + q * c[j], 0); sse += e * e; }
  return { theta: [Math.exp(c[0]), ...c.slice(1)], sseLog: sse, n: rows.length };
}

/**
 * Fits a form to a stems result. opts: FIT_DEFAULTS (+ { secvol: settings of the Stem Section Volume tool for the volume
 * comparison }). Returns { schema: 'taper-fit/1', status: 'ok'|'invalid'|'noconverge', form, bark, scale, method,
 * params, se, seNote, n, nTrees, left, iter, rmse, bias, byClass: [{ lo, hi, n, bias, rmse }], residuals, volumes }.
 * rmse, bias and the classes are always on the d scale (cm), whatever the fitting scale.
 */
export function fitTaper(st, opts = {}) {
  const s = { ...FIT_DEFAULTS, ...opts }, f = FORMS[s.form];
  const head = { schema: 'taper-fit/1', tool: `${TOOL.id} ${TOOL.version}`, form: 'taper.' + s.form, bark: s.bark, scale: s.scale, units: { d: 'cm', h: 'm', V: 'm3' } };
  if (!f) return { ...head, status: 'invalid', problems: [{ code: 'form.unknown', form: s.form }] };
  if (!['ob', 'ib'].includes(s.bark) || !['d', 'source'].includes(s.scale)) return { ...head, status: 'invalid', problems: [{ code: 'fit.settings' }] };
  const { obs, left } = observations(st, s), keys = new Set(obs.map(o => o.key)), p = f.params.length;
  if (obs.length <= p + 1 || keys.size < 2) return { ...head, status: 'invalid', left, n: obs.length, nTrees: keys.size, problems: [{ code: 'fit.few', n: obs.length, trees: keys.size, p }] };
  let theta, sse, iter = 0, status = 'ok', method, model;
  if (s.form === 'mb76') {
    const th0 = mbStart(obs); if (!th0) return { ...head, status: 'invalid', left, problems: [{ code: 'fit.start' }] };
    model = mbModel(s.scale);
    const yv = obs.map(o => s.scale === 'source' ? (o.d / o.D) ** 2 : o.d);
    const r = levenbergMarquardt(model, obs, yv, th0, { valid: th => th[4] > 0 && th[4] < 1 && th[5] > 0 && th[5] < 1, maxIter: 1000 });
    theta = r.theta; sse = r.sse; iter = r.iter; status = r.status === 'ok' ? 'ok' : 'noconverge';
    method = s.scale === 'source' ? 'nls-y' : 'nls-d';
    const cov = status === 'ok' ? covariance(model, theta, obs, sse) : null;
    head.se = cov ? Object.fromEntries(f.params.map((k, j) => [k, cov.se[j]])) : null;
  } else {
    const ll = kzLogLinear(obs); if (!ll) return { ...head, status: 'invalid', left, problems: [{ code: 'fit.start' }] };
    if (s.scale === 'source') {
      theta = ll.theta; method = 'ols-lnd'; sse = null;
      // standard errors on the ln scale for c0 = ln a0, a1, a2, b1…b6 (OLS, independent observations)
      head.se = null; head.note = 'no-backtransform-correction';
    } else {
      model = kzModel;
      const r = levenbergMarquardt(model, obs, obs.map(o => o.d), ll.theta, { valid: th => th[0] > 0, maxIter: 1000 });
      theta = r.theta; sse = r.sse; iter = r.iter; status = r.status === 'ok' ? 'ok' : 'noconverge'; method = 'nls-d';
      const cov = status === 'ok' ? covariance(model, theta, obs, sse) : null;
      head.se = cov ? Object.fromEntries(f.params.map((k, j) => [k, cov.se[j]])) : null;
    }
  }
  const params = Object.fromEntries(f.params.map((k, j) => [k, theta[j]]));
  const set = { schema: 'model-coef/1', id: 'fit', tool: 'taper', form: 'taper.' + s.form, params, output: { name: 'd', unit: 'cm', bark: s.bark } };
  const pred = o => { const y = f.y(params, o.h / o.H, o.D, o.H); return y >= 0 ? o.D * Math.sqrt(y) : null; };
  const residuals = obs.map(o => { const q = pred(o); return { row: o.row, plot_id: o.plot_id, tree_id: o.tree_id, period: o.period, h: o.h, rel: o.h / o.H, d: o.d, pred: q, res: q == null ? null : o.d - q }; });
  const ok = residuals.filter(r => r.res != null), mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  const byClass = Array.from({ length: s.classes }, (_, i) => { const lo = i / s.classes, hi = (i + 1) / s.classes, r = ok.filter(q => q.rel >= lo && (q.rel < hi || (i === s.classes - 1 && q.rel <= hi)));
    return { lo, hi, n: r.length, bias: r.length ? mean(r.map(q => q.res)) : null, rmse: r.length ? Math.sqrt(mean(r.map(q => q.res * q.res))) : null }; });
  return { ...head, status, method, params, seNote: 'independent-observations', n: obs.length, nTrees: keys.size, left, iter, sse,
    rmse: ok.length ? Math.sqrt(mean(ok.map(q => q.res * q.res))) : null, bias: ok.length ? mean(ok.map(q => q.res)) : null, nUndefined: residuals.length - ok.length,
    byClass, residuals, volumes: compareVolumes(st, set, s.bark, s.secvol || {}), problems: [] };
}

/**
 * Per tree: the Stem Section Volume tool's volume (its settings; default Smalian with ends and a cone top) against the
 * profile integral over the same height range (ground to tip when the section volume includes the stump, otherwise
 * from the cut height). Returns [{ tree_id, plot_id, period, sectionV, profileV, diff, rel, label, range }].
 */
export function compareVolumes(st, set, bark, secvolSettings = {}) {
  const out = [];
  for (const T of st.trees) {
    if (T.state === 'error' || !(T.dbh > 0 && T.height > 1.3)) continue;
    const r = treeVolume(T, secvolSettings), part = r[bark];
    if (!part || part.status !== 'ok' || !(part.total > 0) || part.label === 'to-last-boundary') continue;
    const lo = part.label === 'ground-to-top' || part.includeStump ? 0 : (T.stump_h ?? 0);
    const pv = profileVolume(set, T.dbh, T.height, lo, T.height);
    out.push({ tree_id: T.tree_id, plot_id: T.plot_id, period: T.period, sectionV: part.total, profileV: pv.status === 'ok' ? pv.V : null,
      diff: pv.status === 'ok' ? pv.V - part.total : null, rel: pv.status === 'ok' ? (pv.V - part.total) / part.total : null, label: part.label, range: [lo, T.height] });
  }
  return out;
}

/** A coefficient set (model-coef/1, origin 'fitted') from a successful fit; the citation is the user's (required). */
export function fitToSet(fit, { citation, species = null, region = null, dataNote = '' } = {}, now = new Date().toISOString()) {
  if (!fit || fit.status !== 'ok') return null;
  const s = blankSet(fit.form);
  return { ...s, id: newId(), params: { ...fit.params }, output: { name: 'd', unit: 'cm', bark: fit.bark }, species, region,
    source: { citation: citation || '' }, origin: 'fitted',
    fit: { data: dataNote, n: fit.n, trees: fit.nTrees, method: fit.method, scale: fit.scale, rmse: fit.rmse, bias: fit.bias, seNote: fit.seNote, se: fit.se || null, created: now },
    created: now, modified: now };
}
