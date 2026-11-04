// Numerical checks of assets/tools.js against SciPy reference values (tests/ref/distributions.json)
// and against closed-form / hand-checkable results. Run: node tests/test_math.js
const path = require('path');
global.window = global; global.document = { documentElement: { lang: 'en' } };
require(path.join(__dirname, '..', 'assets', 'tools.js'));
const T = window.MP, W = T.weibull, D = T.dists, R = require('./ref/distributions.json');
let fails = 0, n = 0;
function near(name, got, want, rel = 1e-6) {
  n++; const err = Math.abs(got - want) / Math.max(1, Math.abs(want));
  if (!(err <= rel)) { fails++; console.log(`FAIL ${name}: got ${got}, want ${want} (rel err ${err.toExponential(2)})`); }
}
// special functions
for (const [z, v] of Object.entries(R.functions.gamma_fn)) near(`Γ(${z})`, T.gamma(+z), v, 1e-10);
for (const [p, v] of Object.entries(R.functions.norm_ppf)) near(`Φ⁻¹(${p})`, T.PhiInv(+p), v, 1e-8);
for (const [p, v] of Object.entries(R.functions.gamma_ppf_k07_th2_g3)) near(`gamma q(${p})`, D.gamma.q(+p, { k: .7, t: 2, g: 3 }), v, 1e-9);
// Weibull estimators (γ fixed)
const w = R.weibull;
[['moments', W.fitMoments(w.x, w.g)], ['mle', W.fitMLE(w.x, w.g)], ['percentile', W.fitPercentile(w.x, w.g, .24, .93)]]
  .forEach(([k, f]) => { near(`Weibull ${k} α`, f.a, w[k][0]); near(`Weibull ${k} β`, f.b, w[k][1]); });
const wm = W.fitMLE(w.x, w.g); near('Weibull KS', W.ks(w.x, wm.a, wm.b, w.g), w.ks_mle, 1e-8);
near('Weibull ML vs scipy .fit() α', wm.a, w.mle_scipy_fit[0], 1e-5); near('Weibull ML vs scipy .fit() β', wm.b, w.mle_scipy_fit[1], 1e-5);
near('Weibull skew≈0 at α=3.602', W.moments(3.602, 10, 0).skew, 0, 1e-3);
// other distributions
const o = R.other, ll = (name, p) => T.logLikGen(o.x, v => D[name].pdf(v, p)), K = (name, p) => T.ksGen(o.x, v => D[name].cdf(v, p));
let p = T.fit.gammaMLE(o.x, o.g); near('gamma ML k', p.k, o.gammaMLE[0], 1e-8); near('gamma ML θ', p.t, o.gammaMLE[1], 1e-8); near('gamma KS', K('gamma', p), o.gammaMLE[2]); near('gamma logL', ll('gamma', p), o.gammaMLE[3], 1e-9);
p = T.fit.gammaMoments(o.x, o.g); near('gamma MM k', p.k, o.gammaMoments[0], 1e-12); near('gamma MM θ', p.t, o.gammaMoments[1], 1e-12);
p = T.fit.normal(o.x); near('normal μ', p.m, o.normal[0], 1e-12); near('normal σ', p.s, o.normal[1], 1e-12); near('normal KS', K('normal', p), o.normal[2]); near('normal logL', ll('normal', p), o.normal[3], 1e-7);
p = T.fit.lognormal(o.x, o.g); near('lognormal μ', p.m, o.lognormal[0], 1e-12); near('lognormal σ', p.s, o.lognormal[1], 1e-12); near('lognormal KS', K('lognormal', p), o.lognormal[2]); near('lognormal logL', ll('lognormal', p), o.lognormal[3], 1e-7);
// SciPy fits SB numerically; ours is the closed-form conditional ML, so allow the optimiser's tolerance
p = T.fit.sb(o.x, o.xi, o.lm); near('SB γ', p.gm, o.sb[0], 1e-4); near('SB δ', p.dl, o.sb[1], 1e-4); near('SB KS', K('sb', p), o.sb[2], 1e-4); near('SB logL', ll('sb', p), o.sb[3], 1e-8);
let s = D.sb.stats({ gm: .5, dl: 1.2, xi: 6, lm: 35 }), r = R.functions['sb_stats_0.5_1.2_6_35'];
near('SB mean (numeric)', s.mean, r[0], 1e-5); near('SB var (numeric)', s.sd ** 2, r[1], 1e-4); near('SB skew (numeric)', s.skew, r[2], 1e-3);
s = D.lognormal.stats({ m: 2.6, s: .45, g: 6 }); r = R.functions['lognorm_stats_0.45_6_e2.6'];
near('lognormal mean', s.mean, r[0], 1e-12); near('lognormal var', s.sd ** 2, r[1], 1e-12); near('lognormal skew', s.skew, r[2], 1e-12);
// Näslund recovers an exact curve; type-7 quantile; Turkish decimal parsing
const pr = []; for (let x = 8; x < 60; x += 2) pr.push([x, 1.3 + (x / (1.6 + .22 * x)) ** 2]);
const nf = T.fitNaslund(pr); near('Näslund a', nf.a, 1.6, 1e-10); near('Näslund b', nf.b, .22, 1e-10);
near('quantile type 7', T.quantile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], .24), 3.16, 1e-12);
const rows = T.parseRows('Çap\tBoy\n23,5\t18,2\n24.1;19\n17,25\n\nfoo');
n++; if (JSON.stringify(rows) !== '[[23.5,18.2],[24.1,19],[17.25]]') { fails++; console.log('FAIL parseRows', JSON.stringify(rows)); }
console.log(`${n - fails}/${n} checks passed` + (fails ? '' : ' (reference: ' + R.generated_with + ')'));
process.exit(fails ? 1 : 0);
