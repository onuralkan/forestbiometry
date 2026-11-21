// Volume equations (PLATFORM_PLAN SV-04, TOOLS_SPEC SV04): fitting tree volume equations to the user's trees (D, H, V).
// No DOM. METHODS §24. The site ships no coefficients (K1): sets come only from the user's data or the user's source.
//
// Forms [B]: Kershaw, J.A., Ducey, M.J., Beers, T.W., Husch, B. 2016. Forest Mensuration, 5th ed., Wiley, §6.2
// (p. 157–158): standard functions eq. (6.22) constant form factor V = b1·D²H, (6.23) combined variable V = b0 + b1·D²H,
// (6.24) V = b1·D^b2·H^b3 with its logarithmic form (6.25) ln V = ln b1 + b2 ln D + b3 ln H (the book prints the left side
// of (6.25) as "V"; the transformed form of (6.24) is ln V; noted in METHODS); local functions (§6.2.2): V = b0 + b1·D²
// (after Prodan) and (6.29) V = b0·D^b1 linearized as ln V = ln b0 + b1 ln D. D dbh (cm), H total height (m), V (m³).
// Weights for the forms on the volume scale (optional): σ²_t ∝ X_t^k, k given or the slope of ln e² on ln X of the OLS
// residuals (Parresol 1999, Forest Science 45: 573–593, Eq. 11–16 [B], as in BC-02). Log forms: back-transformation
// correction none or Baskerville exp(s²/2), s the residual standard error on the ln scale ([A], METHODS §22).
// Fit measures on the volume scale with the Model Evaluation tool's own definitions (eval/calc.js metrics, METHODS §7).
import { registerForm, correctionFactor } from '../core/coef.js';
import { inverse } from '../core/nls.js';
import { metrics } from '../eval/calc.js';

export const TOOL = { id: 'hacim-denklemleri', version: '1.0.0-beta.2' };
const fin = x => typeof x === 'number' && Number.isFinite(x);

/**
 * Forms: params (names as in the book), needsH, scale ('none' | 'log'), the regression it is fitted by (y and X rows),
 * the weight variable of the volume-scale forms, the volume of a tree from the parameters (without correction).
 */
export const FORMS = {
  cf: { eq: '6.22', params: ['b1'], needsH: true, scale: 'none', wvar: 'd2h', formula: 'V = b1·D²H',
    y: t => t.V, x: t => [t.D * t.D * t.H], toParams: c => ({ b1: c[0] }), V: (p, D, H) => p.b1 * D * D * H },
  cv: { eq: '6.23', params: ['b0', 'b1'], needsH: true, scale: 'none', wvar: 'd2h', formula: 'V = b0 + b1·D²H',
    y: t => t.V, x: t => [1, t.D * t.D * t.H], toParams: c => ({ b0: c[0], b1: c[1] }), V: (p, D, H) => p.b0 + p.b1 * D * D * H },
  ln: { eq: '6.24–6.25', params: ['b1', 'b2', 'b3'], needsH: true, scale: 'log', formula: 'ln V = ln b1 + b2·ln D + b3·ln H',
    y: t => Math.log(t.V), x: t => [1, Math.log(t.D), Math.log(t.H)], toParams: c => ({ b1: Math.exp(c[0]), b2: c[1], b3: c[2] }), V: (p, D, H) => p.b1 * D ** p.b2 * H ** p.b3 },
  loc: { eq: '§6.2.2', params: ['b0', 'b1'], needsH: false, scale: 'none', wvar: 'd2', formula: 'V = b0 + b1·D²',
    y: t => t.V, x: t => [1, t.D * t.D], toParams: c => ({ b0: c[0], b1: c[1] }), V: (p, D) => p.b0 + p.b1 * D * D },
  locln: { eq: '6.29', params: ['b0', 'b1'], needsH: false, scale: 'log', formula: 'ln V = ln b0 + b1·ln D',
    y: t => Math.log(t.V), x: t => [1, Math.log(t.D)], toParams: c => ({ b0: Math.exp(c[0]), b1: c[1] }), V: (p, D) => p.b0 * D ** p.b1 },
};
export const FORM_IDS = Object.keys(FORMS);
const WVAR = { d2h: t => t.D * t.D * t.H, d2: t => t.D * t.D };
for (const [id, f] of Object.entries(FORMS)) {
  try {
    registerForm({ id: 'volume.' + id, tool: 'volume', params: f.params.map(key => ({ key })), inputs: f.needsH ? { D: { unit: 'cm' }, H: { unit: 'm' } } : { D: { unit: 'cm' } },
      output: { name: 'V', unit: 'm3' }, formula: { en: f.formula }, transform: f.scale });
  } catch (e) { /* already registered (module loaded twice in one page) */ }
}

/** Weighted least squares y = Xβ with weights w (1/σ² up to a constant). → { b, se, cov, s2, e (unweighted residuals) } | null */
export function wls(X, y, w) {
  const n = y.length, p = X[0].length, A = Array.from({ length: p }, () => new Array(p).fill(0)), g = new Array(p).fill(0);
  for (let t = 0; t < n; t++) for (let a = 0; a < p; a++) { g[a] += w[t] * X[t][a] * y[t]; for (let b = 0; b < p; b++) A[a][b] += w[t] * X[t][a] * X[t][b]; }
  const Ai = inverse(A); if (!Ai) return null;
  const b = Ai.map(row => row.reduce((s, v, j) => s + v * g[j], 0));
  const e = y.map((v, t) => v - X[t].reduce((s, x, j) => s + x * b[j], 0));
  const s2 = e.reduce((s, v, t) => s + w[t] * v * v, 0) / (n - p);
  const cov = Ai.map(row => row.map(v => v * s2));
  return { b, se: cov.map((r, j) => Math.sqrt(r[j])), cov, s2, e };
}
/** k of σ² ∝ X^k: slope of ln e² on ln X over the OLS residuals (Parresol 1999 Eq. 15); null when not estimable. */
export function varianceExponent(e, X) {
  const pts = e.map((v, t) => [Math.log(X[t]), Math.log(v * v)]).filter(([a, b]) => fin(a) && fin(b));
  if (pts.length < 3) return null;
  const n = pts.length, mx = pts.reduce((s, q) => s + q[0], 0) / n, my = pts.reduce((s, q) => s + q[1], 0) / n;
  let sxx = 0, sxy = 0; for (const [x, y] of pts) { sxx += (x - mx) ** 2; sxy += (x - mx) * (y - my); }
  return sxx > 0 ? sxy / sxx : null;
}

/**
 * Trees usable for a form: D > 0, V > 0, H > 0 when the form needs it. trees: [{ row, D, H, V }].
 * → { use, dropped: [{ row, why: 'D' | 'H' | 'V' }] }
 */
export function usable(trees, needsH) {
  const use = [], dropped = [];
  for (const t of trees) {
    const why = !(fin(t.D) && t.D > 0) ? 'D' : needsH && !(fin(t.H) && t.H > 0) ? 'H' : !(fin(t.V) && t.V > 0) ? 'V' : null;
    if (why) dropped.push({ row: t.row ?? null, why }); else use.push(t);
  }
  return { use, dropped };
}

/**
 * Fit one form. opts = { weight: { kind: 'none' } | { kind: 'power', k: number | null }, correction: 'none' | 'baskerville' }.
 * → { status: 'ok', form, n, dropped, coef (regression scale), se, cov, params (book's parameters), s (residual SE on
 *     the fit scale; weighted forms: of the weighted residuals), weight { kind, var, k, estimated }, cf (log forms),
 *     pred: [V̂], obs: [V], rows, metrics (eval/calc.js, volume scale) } | { status: 'bad', code, dropped }
 */
export function fitForm(id, trees, opts = {}) {
  const f = FORMS[id]; if (!f) return { status: 'bad', code: 'form.unknown', dropped: [] };
  const { use, dropped } = usable(trees, f.needsH), p = f.params.length;
  if (use.length < p + 2) return { status: 'bad', code: 'n.few', dropped, n: use.length };
  const X = use.map(f.x), y = use.map(f.y);
  let w = use.map(() => 1), weight = { kind: 'none' };
  const wo = opts.weight || { kind: 'none' };
  if (wo.kind === 'power') {
    if (f.scale !== 'none') return { status: 'bad', code: 'weight.log', dropped };
    const Xv = use.map(WVAR[f.wvar]);
    let k = wo.k, estimated = false;
    if (k == null) { const o = wls(X, y, w); if (!o) return { status: 'bad', code: 'singular', dropped }; k = varianceExponent(o.e, Xv); estimated = true; }
    if (!fin(k)) return { status: 'bad', code: 'weight.k', dropped };
    w = Xv.map(v => 1 / v ** k); weight = { kind: 'power', var: f.wvar, k, estimated };
  }
  const r = wls(X, y, w); if (!r) return { status: 'bad', code: 'singular', dropped };
  const params = f.toParams(r.b), s = Math.sqrt(r.s2);
  let cf = null;
  if (f.scale === 'log') { const c = opts.correction || 'none'; if (!['none', 'baskerville'].includes(c)) return { status: 'bad', code: 'correction', dropped }; cf = c === 'baskerville' ? Math.exp(r.s2 / 2) : 1; }
  const pred = use.map(t => f.V(params, t.D, t.H) * (cf ?? 1)), obs = use.map(t => t.V);
  return { status: 'ok', form: id, eq: f.eq, n: use.length, dropped, coef: r.b, se: r.se, cov: r.cov, params, s, weight, cf, correction: f.scale === 'log' ? (opts.correction || 'none') : null,
    rows: use.map(t => t.row ?? null), D: use.map(t => t.D), H: use.map(t => t.H ?? null), obs, pred, metrics: metrics(obs, pred) };
}

/** Volume of a tree from a saved set; log forms apply the set's back-transformation factor (core/coef.js correctionFactor:
 * Baskerville exp(SEE²/2) with transform.value = SEE on the ln scale). → number | null */
export function predict(set, D, H) {
  const id = String(set.form || '').replace(/^volume\./, ''), f = FORMS[id]; if (!f) return null;
  if (!(fin(D) && D > 0) || (f.needsH && !(fin(H) && H > 0))) return null;
  const v = f.V(set.params, D, H), cf = f.scale === 'log' ? (correctionFactor(set) ?? 1) : 1;
  return fin(v) ? v * cf : null;
}
