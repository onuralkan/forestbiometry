// Diameter distribution engine, stage P13: comparison table and diagnostics (KS, AD, CvM, AIC/BIC/AICc, class errors,
// Q–Q and P–P points).   node tests/dist/test_p13.mjs
// Reference: tests/ref/dist_p13.json (tests/ref/make_dist_p13.py: scipy.stats.kstest, cramervonmises, logpdf).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as D from '../../assets/lab/dist/index.js';
import * as CMP from '../../assets/lab/dist/compare.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-12) => ok(Number.isFinite(a) && Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1), `${m}: got ${a} expected ${b}`);
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/dist_p13.json'), 'utf8'));
const FX = JSON.parse(readFileSync(path.join(root, 'tests/weibull/fixture.json'), 'utf8')).samples;

/* 1. statistics against SciPy (fixed parameters), conditional distribution included */
for (const c of R.cases) {
  const fam = D.family(c.family), d = c.d || FX[c.sample], tag = `${c.sample} ${c.family}${c.lower != null ? ' truncated' : ''}`;
  const G = c.lower != null ? D.trunc.truncated(fam, c.params, { lower: c.lower, upper: null }) : fam;
  near(D.gof.ks(G, c.params, d), c.ks, `${tag}: KS two-sided = scipy kstest`, 1e-12);
  near(D.gof.cvm(G, c.params, d), c.cvm, `${tag}: CvM = scipy cramervonmises`, 1e-10);
  if (c.ad != null) near(D.gof.ad(G, c.params, d), c.ad, `${tag}: AD`, 1e-10);
  const ll = c.lower != null ? D.trunc.truncLogLik(fam, c.params, d, { lower: c.lower, upper: null }) : D.gof.logLik(fam, c.params, d);
  near(ll, c.logLik, `${tag}: ln L on the diameter scale${c.family === 'lognormal' ? ' (Jacobian included)' : ''}`, 1e-11);
  if (c.qq) { const q = CMP.qqPoints(G, c.params, d), pp = CMP.ppPoints(G, c.params, d), st = Math.max(1, Math.floor(d.length / 10));
    c.qq.forEach(([t, o], j) => { near(q[j * st][0], t, `${tag}: Q–Q theoretical ${j}`, 1e-11); near(q[j * st][1], o, `${tag}: Q–Q observed ${j}`, 1e-15); });
    c.pp.forEach(([f, e], j) => { near(pp[j * st][0], f, `${tag}: P–P F ${j}`, 1e-12); near(pp[j * st][1], e, `${tag}: P–P position ${j}`, 1e-15); }); }
}
{ // the two-sided KS: D = max(D⁺, D⁻) with D⁺ = max(j/n − F), D⁻ = max(F − (j − 1)/n) — a hand case where D⁻ wins
  const U = { cdf: x => x }, d = [0.3, 0.9]; near(D.gof.ks(U, null, d), Math.max(0.5 - 0.3, 1 - 0.9, 0.3 - 0, 0.9 - 0.5), 'KS hand case (uniform): D = 0.4 from D⁻', 1e-15); }
{ // lognormal Jacobian: ln L(lognormal; d) = ln L(normal; ln d) − Σ ln d
  const d = FX.small, p = { mu: 3, sigma: 0.45 };
  near(D.gof.logLik(D.family('lognormal'), p, d), D.gof.logLik(D.family('normal'), p, d.map(Math.log)) - d.reduce((s, v) => s + Math.log(v), 0), 'lognormal ln L includes the Jacobian', 1e-12); }

/* 2. AICc and EI units */
near(D.gof.aicc(-100, 2, 50), 204 + 12 / 47, 'AICc = AIC + 2k(k + 1)/(n − k − 1)', 1e-14); ok(D.gof.aicc(-10, 2, 3) === null, 'AICc not computed for n ≤ k + 1');
{ // EI (Poudel and Cao): Σ|N_obs − N_exp| in trees per hectare; the raw L1 is in trees
  const W = D.family('weibull'), p = { a: 0, b: 20, c: 2.5 }, cl = D.classes.makeClasses({ edges: [0, 10, 20, Infinity] }), t = D.classes.classTable(W, p, cl, [3, 5, 2], { n: 10, perHa: 25 });
  const F = x => 1 - Math.exp(-((x / 20) ** 2.5)), e = [10 * F(10), 10 * (F(20) - F(10)), 10 * (1 - F(20))], l1 = Math.abs(3 - e[0]) + Math.abs(5 - e[1]) + Math.abs(2 - e[2]);
  near(t.absDiff, l1, 'raw L1 = Σ|n_obs − n_exp| (trees)', 1e-13); near(t.rows.reduce((s, r) => s + Math.abs(r.obsHa - r.expHa), 0), 25 * l1, 'EI = Σ|N_obs − N_exp| per hectare = L1 × 10000/area', 1e-12); }

/* 3. comparison table: groups by observation process, ML vs descriptive, failures apart, no composite score */
{ const d = FX.w2, res = [];
  for (const [id, o] of [['weibull.ml', { a: 0 }], ['weibull.mom', { a: 0 }], ['weibull.pct', { a: 0 }], ['normal.ml', {}], ['gamma.ml', {}], ['lognormal.mom', {}], ['beta.ml', { L: 0, U: 60 }], ['weibull.ml', { a: 100 }]]) {
    const r = D.runMethod(id, { d }, o), fam = D.family(r.family);
    if (r.status === 'ok') { r.gof = { ks: D.gof.ks(fam, r.params, d), ad: D.gof.ad(fam, r.params, d), cvm: D.gof.cvm(fam, r.params, d) }; if (r.likelihoodMaximised) Object.assign(r.gof, D.gof.aicBic(r.logLik, r.free.length, d.length)); }
    res.push(r);
  }
  const tr = D.runMethod('weibull.tml', { d: d.filter(v => v >= 8) }, { a: 0, trunc: { lower: 8 } }); tr.gof = { aic: D.gof.aicBic(tr.logLik, 2, tr.data.n).aic, bic: 0 }; res.push(tr);
  const G = CMP.compareUnit(res, r => ({ l1: 1, ei: null }));
  eq(G.length, 2, 'untruncated and truncated fits are separate groups (different observation process)');
  const g0 = G[0];
  eq(g0.ml.map(x => x.r.method), ['weibull.ml', 'normal.ml', 'gamma.ml', 'beta.ml'], 'likelihood group: ML fits only');
  eq(g0.desc.map(x => x.r.method), ['weibull.mom', 'weibull.pct', 'lognormal.mom'], 'descriptive group: moments and percentiles');
  ok(g0.desc.every(x => x.aic == null && x.bic == null && x.aicc == null) && g0.desc.every(x => x.ks != null && x.cvm != null), 'no AIC/BIC for descriptive fits; KS, CvM given');
  eq(g0.failed.map(x => [x.r.method, x.status]), [['weibull.ml', 'invalid']], 'failed fits listed apart with their state');
  ok(Math.min(...g0.ml.map(x => x.dAIC)) === 0 && g0.ml.every(x => x.dAIC >= 0 && x.k === 2 && x.n === d.length), 'ΔAIC relative to the smallest in the group; k, n');
  const s = CMP.sortRows(g0.ml, 'aic'); ok(s.every((x, i) => !i || x.aic >= s[i - 1].aic), 'sorted by AIC (ascending)');
  const sl = CMP.sortRows(g0.ml, 'logLik'); ok(sl.every((x, i) => !i || x.logLik <= sl[i - 1].logLik), 'sorted by ln L (descending)');
  ok(g0.ml.every(x => !('score' in x) && !('rank' in x)), 'no composite score or rank field');
  ok(!Object.keys(g0.ml[0]).some(k => /^p_?val|pvalue/i.test(k)), 'no p-values'); }

console.log(`dist P13: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
