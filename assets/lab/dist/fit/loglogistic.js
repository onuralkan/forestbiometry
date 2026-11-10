// Log-logistic (Fisk) direct estimation (DIST_SPEC §3.9, stage P10). No DOM. b = scale (cm), c = shape; no location.
//   loglogistic.ml      maximum likelihood, numerical. With y = ln d, z = c·y − β (β = c ln b) the log-likelihood
//                       ℓ = n ln c + Σ h(z_i) − Σ y_i, h = ln of the standard logistic density, is jointly concave in
//                       (β, c) (h is concave, z linear in (β, c), ln c concave): one maximum, Newton with step halving
//                       reaches it. Started from the log-moment estimate. Solver: Newton (exact Hessian).
//   loglogistic.pct     two sample percentiles p < r (closed form):  c = [logit r − logit p]/ln(Q_r/Q_p),
//                       b = Q_p/[p/(1 − p)]^(1/c);  sample quantiles type 7; default pair 0.25/0.75 (tool rule)
//   loglogistic.logmom  log-moments (NOT the ordinary method of moments): b = exp[mean(ln d)],
//                       c = π/√[3·var_n(ln d)] (divisor n); matches the mean and variance of ln D (a logistic variable)
// The ordinary method of moments (mean and variance of D) is not offered: it exists only for c > 2.
// Every result carries diagnostics.moments: whether E[D] (c > 1) and Var[D] (c > 2) exist, and their values if so.
import { checkBasic, meanVar } from './common.js';
import { checkPercentiles } from './weibull.js';
import { loglogistic, logisticF, llMoments } from '../families/loglogistic.js';
import { quantile7 } from '../data.js';
import { logLik } from '../gof.js';

export const LL_PAIR = { p: 0.25, r: 0.75 };
export const C_MAX = 1e6;                           // shape beyond this: degenerate sample (tool rule)
const nonPositive = d => { const bad = d.filter(v => !(v > 0)); return bad.length ? [{ code: 'd.nonpos', count: bad.length, example: bad[0] }] : []; };
const logit = q => Math.log(q) - Math.log1p(-q);
function start(d, settings) {
  const s = checkBasic(d), base = { settings, warnings: s.notices }, problems = [...nonPositive(d), ...s.problems];
  return { base, problems };
}
const done = (base, p, d, extra = {}) => ({ ...base, status: 'ok', params: p, logLik: logLik(loglogistic, p, d), diagnostics: { moments: llMoments(p) }, ...extra });

/** Closed form from two percentiles 0 < p < r < 1 (also the recovery from theoretical percentiles); null where undefined. */
export function llPercentileParams(qp, qr, p, r) {
  if (!(qp > 0) || !(qr > qp) || !(p > 0 && p < r && r < 1)) return null;
  const c = (logit(r) - logit(p)) / Math.log(qr / qp);
  return { b: qp / Math.exp(logit(p) / c), c };
}
/** Log-moments of ln d (divisor n). */
export function llLogMoments(y) { const { m, v } = meanVar(y, 'n'); return { b: Math.exp(m), c: Math.PI / Math.sqrt(3 * v), m, v }; }

export function fitLLlogmom(d) {
  const S = start(d, {}); if (S.problems.length) return { ...S.base, status: 'invalid', problems: S.problems };
  const e = llLogMoments(d.map(Math.log));
  return done(S.base, { b: e.b, c: e.c }, d, { targets: { meanLog: e.m, varianceLog: e.v, varDivisor: 'n' }, convergence: { iter: 0 } });
}
export function fitLLpct(d, opts = {}) {
  const p = opts.p ?? LL_PAIR.p, r = opts.r ?? LL_PAIR.r, S = start(d, { p, r, quantile: 'type7' });
  const problems = [...S.problems, ...checkPercentiles(p, r)];
  if (problems.length) return { ...S.base, status: 'invalid', problems };
  const srt = [...d].sort((u, v) => u - v), qp = quantile7(srt, p), qr = quantile7(srt, r);
  S.base.targets = { qp, qr, p, r, quantile: 'type7' };
  const est = llPercentileParams(qp, qr, p, r);
  if (!est) return { ...S.base, status: 'invalid', problems: [{ code: 'q.tied', p, r, q: qp }] };
  return done(S.base, est, d, { convergence: { iter: 0 } });
}

/** Maximum likelihood: Newton on (β, c) with y centred (y − ȳ) for conditioning; b = exp(ȳ + β/c). */
export function fitLLml(d) {
  const S = start(d, {}); if (S.problems.length) return { ...S.base, status: 'invalid', problems: S.problems };
  const n = d.length, y0 = d.map(Math.log), ybar = y0.reduce((a, b) => a + b, 0) / n, y = y0.map(v => v - ybar);
  const st = llLogMoments(y0);
  // ℓ without the constant −Σ ln d (added back by logLik at the end)
  const ell = (be, c) => { let s = n * Math.log(c); for (const v of y) { const a = Math.abs(c * v - be); s += -a - 2 * Math.log1p(Math.exp(-a)); } return s; };
  let be = 0, c = st.c, f = ell(be, c), iter = 0, gnorm = Infinity, status = 'noconverge';
  for (; iter < 200; iter++) {
    let gb = 0, gc = n / c, hbb = 0, hbc = 0, hcc = -n / (c * c);
    for (const v of y) {
      const F = logisticF(c * v - be), h1 = 1 - 2 * F, h2 = -2 * F * (1 - F);
      gb -= h1; gc += h1 * v; hbb += h2; hbc -= h2 * v; hcc += h2 * v * v;
    }
    gnorm = Math.max(Math.abs(gb), Math.abs(gc * c)) / n;
    if (gnorm < 1e-14) { status = 'ok'; break; }
    const det = hbb * hcc - hbc * hbc;
    if (!(det > 0) || !(hbb < 0)) break;                                  // not concave here: cannot happen for valid data
    let db = -(hcc * gb - hbc * gc) / det, dc = -(hbb * gc - hbc * gb) / det, t = 1, nb, nc, nf;
    for (let k = 0; k < 60; k++, t /= 2) { nb = be + t * db; nc = c + t * dc; if (nc > 0 && (nf = ell(nb, nc)) >= f) break; }
    if (!(nc > 0) || !(nf >= f)) { if (gnorm < 1e-11) status = 'ok'; break; }   // no ascent left: at the optimum to rounding
    const small = Math.abs(nb - be) < 1e-15 * Math.max(1, Math.abs(be)) && Math.abs(nc - c) < 1e-15 * c;
    be = nb; c = nc; f = nf;
    if (c > C_MAX) { status = 'boundary'; break; }
    if (small) { status = 'ok'; iter++; break; }
  }
  const conv = { iter, tol: 1e-14, tolKind: 'max |score| per tree', score: gnorm, start: { b: st.b, c: st.c, from: 'log-moments' } };
  if (status === 'boundary') return { ...S.base, status, convergence: conv, warnings: [...S.base.warnings, { code: 'll.boundary', c }] };
  if (status !== 'ok') return { ...S.base, status, convergence: conv, warnings: [...S.base.warnings, { code: 'll.noconverge' }] };
  const p = { b: Math.exp(ybar + be / c), c }, r = done(S.base, p, d, { convergence: conv });
  r.objective = { name: 'logLik', value: r.logLik };
  return r;
}

const base = { family: 'loglogistic', kind: 'fit', dataTypes: ['raw'] };
export const llML = { ...base, id: 'loglogistic.ml', estimator: 'ml', solver: 'newton', likelihoodMaximised: true, options: [], source: 'loglogistic.ml', run: i => fitLLml(i.d) };
export const llPCT = { ...base, id: 'loglogistic.pct', estimator: 'quantile', solver: 'closed form', likelihoodMaximised: false,
  options: [{ key: 'p', type: 'prob', default: LL_PAIR.p }, { key: 'r', type: 'prob', default: LL_PAIR.r }],
  checkOptions: o => checkPercentiles(o.p ?? LL_PAIR.p, o.r ?? LL_PAIR.r), source: 'loglogistic.pct', run: (i, o = {}) => fitLLpct(i.d, o) };
export const llLOGMOM = { ...base, id: 'loglogistic.logmom', estimator: 'logmom', solver: 'closed form', likelihoodMaximised: false, options: [], source: 'loglogistic.logmom', run: i => fitLLlogmom(i.d) };
