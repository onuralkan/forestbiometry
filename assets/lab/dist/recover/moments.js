// Parameter recovery from summary values (kind 'recover', data type 'summary'; DIST_SPEC §2.1, §3.1–3.2, stage P02).
// No raw diameters: there is no likelihood and no goodness of fit, only the parameters and a back-calculation.
//
// summary = { mean m (cm), and EXACTLY ONE of
//               variance (cm²) with varDivisor 'n' (moment variance v) or 'n-1' (sample variance s², needs n), or
//               dq (quadratic mean diameter, cm),
//             n? (number of trees, optional unless s² is given) }
// Normalised to the moment variance: v = s²(n − 1)/n, or v = Dq² − m²; then Dq = √(m² + v).
import { normal } from '../families/normal.js';
import { lognormal } from '../families/lognormal.js';

const pos = x => typeof x === 'number' && Number.isFinite(x) && x > 0;
/** Returns { m, v, dq, source, problems }. Problems are never turned into numbers. */
export function normSummary(s = {}) {
  const problems = [], hasV = s.variance != null, hasQ = s.dq != null, div = s.varDivisor === 'n-1' ? 'n-1' : 'n';
  if (!pos(s.mean)) problems.push({ code: 'sum.mean', value: s.mean ?? null });
  if (hasV === hasQ) problems.push({ code: hasV ? 'sum.both' : 'sum.none' });
  if (s.n != null && !(Number.isInteger(s.n) && s.n >= 2)) problems.push({ code: 'sum.n', value: s.n });
  if (hasV && !hasQ) {
    if (!pos(s.variance)) problems.push({ code: 'sum.var', value: s.variance });
    if (div === 'n-1' && s.n == null) problems.push({ code: 'sum.nneed' });
  }
  if (hasQ && !hasV && !pos(s.dq)) problems.push({ code: 'sum.dqbad', value: s.dq });
  if (problems.length) return { problems };
  const m = s.mean;
  if (hasV) { const v = div === 'n-1' ? s.variance * (s.n - 1) / s.n : s.variance; return { m, v, dq: Math.sqrt(m * m + v), source: 'variance', varDivisor: div, n: s.n ?? null, problems }; }
  if (!(s.dq > m)) return { problems: [{ code: 'sum.dq', dq: s.dq, mean: m }] };          // Dq² = m² + v with v > 0
  return { m, v: (s.dq - m) * (s.dq + m), dq: s.dq, source: 'dq', varDivisor: null, n: s.n ?? null, problems };
}
function recover(fam, toParams, input) {
  const S = normSummary(input.summary);
  if (S.problems.length) return { status: 'invalid', problems: S.problems, settings: {} };
  const p = toParams(S.m, S.v), mean = fam.mean(p), variance = fam.variance(p);
  const diagnostics = { backMean: mean, backVariance: variance, backDq: Math.sqrt(mean * mean + variance), ...(fam.diagnostics ? fam.diagnostics(p) : {}) };
  return { status: 'ok', params: p, settings: { source: S.source }, targets: { mean: S.m, variance: S.v, dq: S.dq, source: S.source, varDivisor: S.varDivisor, n: S.n }, diagnostics, data: { type: 'summary', n: S.n }, convergence: { iter: 0 } };
}
/** Normal: μ = m, σ = √v. */
export const normalRecover = {
  id: 'normal.rec', family: 'normal', kind: 'recover', estimator: 'moments', solver: 'closed form', dataTypes: ['summary'], likelihoodMaximised: false,
  options: [], source: 'normal.rec', run: input => recover(normal, (m, v) => ({ mu: m, sigma: Math.sqrt(v) }), input),
};
/** Lognormal: σ² = ln(1 + v/m²), μ = ln m − σ²/2. */
export const lognormalRecover = {
  id: 'lognormal.rec', family: 'lognormal', kind: 'recover', estimator: 'moments', solver: 'closed form', dataTypes: ['summary'], likelihoodMaximised: false,
  options: [], source: 'lognormal.rec', run: input => recover(lognormal, (m, v) => { const s2 = Math.log1p(v / (m * m)); return { mu: Math.log(m) - s2 / 2, sigma: Math.sqrt(s2) }; }, input),
};
