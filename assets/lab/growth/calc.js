// Growth function fitter (SQ-03): forms, fitting and derived quantities. No DOM.
// Formulas and their reading status: docs/METHODS.md §18. The site ships NO coefficients (K1): curves are fitted to
// the user's own age–size data (height, diameter, volume, …; the variable and its unit are the user's).
//
//   cr    Chapman–Richards  y = b0·(1 − e^(−b1·t))^b2                   [B] Hernández-Cuevas et al. 2018, Cuadro 2
//   schu  Schumacher        y = b0·e^(−b1/t)                              [B] Hernández-Cuevas et al. 2018, Cuadro 2
//   gomp  Gompertz          y = b0·exp(−b1·e^(−b2·t))                     [A] Fekedulegn et al. 1999, Table 1 (+ worked example)
//   logi  logistic          y = b0 / (1 + b1·e^(−b2·t))                   [A] Fekedulegn et al. 1999; growthmodels
//   mono  monomolecular     y = b0·(1 − b1·e^(−b2·t))                     [A] Fekedulegn et al. 1999; growthmodels
//   weib  Weibull           y = b0 − b1·e^(−b2·t^b3)                      [A] Fekedulegn et al. 1999; growthmodels
// Derived (definitions): current annual increment CAI(t) = dy/dt, mean annual increment MAI(t) = y/t, the age of the
// inflection point (maximum CAI) and the age where MAI culminates (MAI = CAI with MAI turning from rising to falling,
// i.e. t·y'(t) − y(t) changing from + to −; a change from − to + is a minimum of MAI, not its culmination).
import { levenbergMarquardt, covariance } from '../core/nls.js';
import { brent } from '../core/roots.js';
import { registerForm } from '../core/coef.js';
import { lang } from '../core/i18n.js';

export const TOOL = { id: 'buyume-islevi', version: '1.0.0-beta.1' };
const fin = x => typeof x === 'number' && Number.isFinite(x);
const E = Math.exp;

export const FORMS = {
  cr: { id: 'cr', name: 'Chapman–Richards', params: ['b0', 'b1', 'b2'], status: 'B', formula: 'y = b0·(1 − e^(−b1·t))^b2',
    f: (p, t) => p[0] * (1 - E(-p[1] * t)) ** p[2],
    grad: (p, t) => { const u = 1 - E(-p[1] * t), y = p[0] * u ** p[2]; return [u ** p[2], y * p[2] * t * E(-p[1] * t) / u, y * Math.log(u)]; },
    dy: (p, t) => { const u = 1 - E(-p[1] * t); return p[0] * p[2] * u ** (p[2] - 1) * p[1] * E(-p[1] * t); },
    ok: p => p[0] > 0 && p[1] > 0 && p[2] > 0,
    inflection: p => p[2] > 1 ? Math.log(p[2]) / p[1] : null, asymptote: p => p[0] },
  schu: { id: 'schu', name: 'Schumacher', params: ['b0', 'b1'], status: 'B', formula: 'y = b0·e^(−b1/t)',
    f: (p, t) => p[0] * E(-p[1] / t),
    grad: (p, t) => { const e = E(-p[1] / t); return [e, -p[0] * e / t]; },
    dy: (p, t) => p[0] * E(-p[1] / t) * p[1] / (t * t),
    ok: p => p[0] > 0 && p[1] > 0,
    inflection: p => p[1] / 2, asymptote: p => p[0] },
  gomp: { id: 'gomp', name: 'Gompertz', params: ['b0', 'b1', 'b2'], status: 'A', formula: 'y = b0·exp(−b1·e^(−b2·t))',
    f: (p, t) => p[0] * E(-p[1] * E(-p[2] * t)),
    grad: (p, t) => { const e = E(-p[2] * t), g = E(-p[1] * e); return [g, -p[0] * g * e, p[0] * g * p[1] * t * e]; },
    dy: (p, t) => { const e = E(-p[2] * t); return p[0] * E(-p[1] * e) * p[1] * p[2] * e; },
    ok: p => p[0] > 0 && p[1] > 0 && p[2] > 0,
    inflection: p => p[1] > 1 ? Math.log(p[1]) / p[2] : null, asymptote: p => p[0] },
  logi: { id: 'logi', name: lang === 'tr' ? 'Lojistik' : 'Logistic', names: { tr: 'Lojistik', en: 'Logistic' }, params: ['b0', 'b1', 'b2'], status: 'A', formula: 'y = b0 / (1 + b1·e^(−b2·t))',
    f: (p, t) => p[0] / (1 + p[1] * E(-p[2] * t)),
    grad: (p, t) => { const e = E(-p[2] * t), q = 1 + p[1] * e; return [1 / q, -p[0] * e / (q * q), p[0] * p[1] * t * e / (q * q)]; },
    dy: (p, t) => { const e = E(-p[2] * t), q = 1 + p[1] * e; return p[0] * p[1] * p[2] * e / (q * q); },
    ok: p => p[0] > 0 && p[1] > 0 && p[2] > 0,
    inflection: p => p[1] > 1 ? Math.log(p[1]) / p[2] : null, asymptote: p => p[0] },
  mono: { id: 'mono', name: lang === 'tr' ? 'Monomoleküler' : 'Monomolecular', names: { tr: 'Monomoleküler', en: 'Monomolecular' }, params: ['b0', 'b1', 'b2'], status: 'A', formula: 'y = b0·(1 − b1·e^(−b2·t))',
    f: (p, t) => p[0] * (1 - p[1] * E(-p[2] * t)),
    grad: (p, t) => { const e = E(-p[2] * t); return [1 - p[1] * e, -p[0] * e, p[0] * p[1] * t * e]; },
    dy: (p, t) => p[0] * p[1] * p[2] * E(-p[2] * t),
    ok: p => p[0] > 0 && p[1] > 0 && p[2] > 0,
    inflection: () => null, asymptote: p => p[0] },
  weib: { id: 'weib', name: 'Weibull', params: ['b0', 'b1', 'b2', 'b3'], status: 'A', formula: 'y = b0 − b1·e^(−b2·t^b3)',
    f: (p, t) => p[0] - p[1] * E(-p[2] * t ** p[3]),
    grad: (p, t) => { const tm = t ** p[3], e = E(-p[2] * tm); return [1, -e, p[1] * tm * e, p[1] * p[2] * tm * Math.log(t) * e]; },
    dy: (p, t) => { const tm = t ** p[3]; return p[1] * p[2] * p[3] * t ** (p[3] - 1) * E(-p[2] * tm); },
    ok: p => p[0] > 0 && p[1] > 0 && p[2] > 0 && p[3] > 0,
    inflection: p => p[3] > 1 ? ((p[3] - 1) / (p[2] * p[3])) ** (1 / p[3]) : null, asymptote: p => p[0] },
};
export const FORM_IDS = Object.keys(FORMS);
for (const f of Object.values(FORMS)) {
  try { registerForm({ id: 'growth.' + f.id, tool: 'growth', params: f.params.map(key => ({ key })), inputs: { t: { unit: 'yr' } }, output: { name: 'y', unit: '-' }, formula: { tr: f.formula, en: f.formula }, transform: 'none' }); }
  catch (e) { /* already registered */ }
}

/** Observations from a raw table: { obs: [{ row, series, t, y }], problems: [{ code, row }] }. t > 0 and y > 0 required. */
export function readSeries(tbl, map, decimal, parseNumber, cellText) {
  const obs = [], problems = [];
  const val = (r, c) => { const x = r[c]; if (x == null) return { s: 'empty' }; if (x.t === 'n') return { s: 'ok', v: x.v }; const t = String(cellText(x) ?? '').trim(); if (!t) return { s: 'empty' }; const p = parseNumber(t, decimal); return p.status === 'ok' ? { s: 'ok', v: p.value } : { s: 'bad', text: t }; };
  tbl.rows.forEach((r, i) => {
    const row = tbl.rowNumbers[i];
    if (r.every(c => c == null || (c.t !== 'n' && String(cellText(c) ?? '').trim() === ''))) return;
    const a = val(r, map.t), b = val(r, map.y);
    if (a.s !== 'ok' || b.s !== 'ok') { problems.push({ code: a.s === 'empty' || b.s === 'empty' ? 'cell.empty' : 'cell.bad', row }); return; }
    if (!(a.v > 0)) { problems.push({ code: 't.nonpos', row, value: a.v }); return; }
    if (!(b.v > 0)) { problems.push({ code: 'y.nonpos', row, value: b.v }); return; }
    const sid = map.series != null ? String(cellText(r[map.series]) ?? '').trim() || null : null;
    obs.push({ row, series: sid, t: a.v, y: b.v });
  });
  return { obs, problems };
}

/** Starting values (tool rule): a small grid around the data's range; the best grid point by SSE. */
function starts(id, obs) {
  const tmax = Math.max(...obs.map(o => o.t)), ymax = Math.max(...obs.map(o => o.y)), ymin = Math.min(...obs.map(o => o.y));
  const A = [1.05, 1.3, 1.7, 2.5, 4].map(k => k * ymax), K = [0.2, 0.5, 1, 2, 4].map(k => k / tmax), out = [];
  if (id === 'cr') for (const a of A) for (const k of K) for (const c of [0.6, 1, 1.5, 2.5, 4]) out.push([a, k, c]);
  if (id === 'schu') for (const a of A) for (const b of [0.2, 0.5, 1, 2, 4].map(k => k * tmax)) out.push([a, b]);
  if (id === 'gomp' || id === 'logi') for (const a of A) for (const k of K) for (const b of [0.5, 1.5, 3, 8, 20]) out.push([a, b, k]);
  if (id === 'mono') for (const a of A) for (const k of K) for (const b of [0.3, 0.7, 0.95, 1, 1.2]) out.push([a, b, k]);
  if (id === 'weib') for (const a of A) for (const m of [0.7, 1, 1.5, 2, 3]) for (const k of [0.2, 1, 4].map(q => q / tmax ** m)) out.push([a, a - Math.max(ymin * 0.5, 1e-9), k, m]);
  const F = FORMS[id], sse = p => { let s = 0; for (const o of obs) { const r = o.y - F.f(p, o.t); s += r * r; } return Number.isFinite(s) ? s : Infinity; };
  return out.filter(F.ok).map(p => ({ p, s: sse(p) })).sort((a, b) => a.s - b.s).map(x => x.p);
}

/**
 * Fits one form to observations [{ t, y }]: Levenberg–Marquardt (core/nls.js) with analytic gradients from the best
 * grid start (or opts.start). Returns { form, status: 'ok'|'noconverge'|'invalid', params: { b0… }, theta, se,
 * seNote: 'independent-observations', n, p, sse, rmse, bias (observed − predicted), rse (√(SSE/(n − p))), aic (Gaussian,
 * k = p + 1), residuals, start }.
 */
export function fitGrowth(obs, id, opts = {}) {
  const F = FORMS[id];
  if (!F) return { form: id, status: 'invalid', problems: [{ code: 'form.unknown' }] };
  const n = obs.length, p = F.params.length;
  if (n <= p) return { form: id, status: 'invalid', n, p, problems: [{ code: 'fit.few', n, p }] };
  const model = { f: (th, o) => F.f(th, o.t), grad: (th, o) => F.grad(th, o.t) }, y = obs.map(o => o.y);
  const cands = opts.start ? [opts.start] : starts(id, obs).slice(0, 5);
  let best = null;
  for (const th0 of cands) {
    const r = levenbergMarquardt(model, obs, y, th0, { valid: F.ok, maxIter: 2000, xtol: 1e-15, ftol: 1e-15, gtol: 1e-12 });
    if (r.status === 'invalid') continue;
    if (!best || (r.status === 'ok' && (best.status !== 'ok' || r.sse < best.sse - 1e-12 * best.sse))) best = { ...r, start: th0 };
  }
  if (!best) return { form: id, status: 'invalid', n, p, problems: [{ code: 'fit.start' }] };
  const theta = best.theta, status = best.status === 'ok' ? 'ok' : 'noconverge', sse = best.sse;
  const cov = status === 'ok' ? covariance(model, theta, obs, sse) : null;
  const residuals = obs.map(o => { const q = F.f(theta, o.t); return { row: o.row ?? null, series: o.series ?? null, t: o.t, y: o.y, pred: q, res: o.y - q }; });
  const mean = a => a.reduce((s, v) => s + v, 0) / a.length;
  const ll = -n / 2 * (Math.log(2 * Math.PI * sse / n) + 1);
  return { form: id, status, params: Object.fromEntries(F.params.map((k, j) => [k, theta[j]])), theta, start: best.start, iter: best.iter,
    se: cov ? Object.fromEntries(F.params.map((k, j) => [k, cov.se[j]])) : null, seNote: 'independent-observations',
    n, p, sse, rmse: Math.sqrt(sse / n), bias: mean(residuals.map(r => r.res)), rse: Math.sqrt(sse / (n - p)), aic: 2 * (p + 1) - 2 * ll, residuals, problems: [] };
}

/**
 * Derived quantities of a fitted curve: asymptote, inflection age (maximum CAI; null when the form has none for these
 * parameters), CAI at it, and the age where MAI culminates (MAI = CAI; t·y' − y on (0, tMax·10],
 * the first change from + to −, i.e. a maximum of MAI; null when MAI has no maximum there). tMax: the oldest observation.
 */
export function derived(id, theta, tMax) {
  const F = FORMS[id], ti = F.inflection(theta), g = t => t * F.dy(theta, t) - F.f(theta, t);
  let tm = null; const hi = tMax * 10, k = 4000;
  for (let i = 1; i < k; i++) {
    const a = hi * i / k, b = hi * (i + 1) / k, ga = g(a), gb = g(b);
    if (Number.isFinite(ga) && Number.isFinite(gb) && ga > 0 && gb < 0) { const r = brent(g, a, b, { xtol: 1e-12 }); if (r.status === 'ok') { tm = r.root; break; } }
  }
  return { asymptote: F.asymptote(theta), inflection: ti != null && ti > 0 ? ti : null, caiMax: ti != null && ti > 0 ? F.dy(theta, ti) : null,
    maiCulmination: tm, maiMax: tm != null ? F.f(theta, tm) / tm : null };
}
/** Curve, CAI and MAI on t = step, 2·step, … tEnd. */
export function curve(id, theta, tEnd, step) {
  const F = FORMS[id], out = [];
  for (let t = step; t <= tEnd + 1e-9; t += step) { const y = F.f(theta, t); out.push({ t: +t.toFixed(10), y, cai: F.dy(theta, t), mai: y / t }); }
  return out;
}

/** A coefficient set (model-coef/1, tool 'growth', origin 'fitted') from a fit; the user's citation is required. */
export function fitToSet(fit, { citation = '', variable = '', unit = '', dataNote = '' } = {}, now = new Date().toISOString()) {
  if (!fit || fit.status !== 'ok') return null;
  return { schema: 'model-coef/1', id: 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), tool: 'growth', form: 'growth.' + fit.form, params: { ...fit.params },
    inputs: { t: { unit: 'yr' } }, output: { name: variable || 'y', unit: unit || '-' }, valid: null, species: null, region: null, transform: null,
    source: { citation }, origin: 'fitted', fit: { data: dataNote, n: fit.n, method: 'nls', rmse: fit.rmse, bias: fit.bias, seNote: fit.seNote, se: fit.se, created: now }, created: now, modified: now };
}
