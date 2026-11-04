"""Generates tests/ref/distributions.json: independent reference values from SciPy for the
diameter-distribution maths in assets/tools.js. Run: python3 tests/ref/make_reference.py"""
import json, pathlib
import numpy as np
from scipy import stats, optimize, special

out = pathlib.Path(__file__).with_name('distributions.json')
ks = lambda x, cdf: float(stats.kstest(x, cdf).statistic)

# sample 1: Weibull data (fixed seed) for the three Weibull estimators
rng = np.random.default_rng(7)
xw = np.round(stats.weibull_min.rvs(2.9, loc=7.5, scale=15.5, size=180, random_state=rng), 1)
gw = round(float(xw.min()) / 2, 1); yw = xw - gw
# ML: solve the score equation exactly (SciPy's generic .fit() stops ~1e-6 short; kept as a cross-check)
lyw = np.log(yw)
c = optimize.brentq(lambda a: (yw**a * lyw).sum() / (yw**a).sum() - 1 / a - lyw.mean(), .1, 50, xtol=1e-15, rtol=1e-15)
sc = ((yw**c).mean()) ** (1 / c)
c_fit, _, sc_fit = stats.weibull_min.fit(xw, floc=gw)
cv2 = (yw.std() / yw.mean()) ** 2
am = optimize.brentq(lambda a: np.exp(special.gammaln(1 + 2 / a) - 2 * special.gammaln(1 + 1 / a)) - 1 - cv2, .1, 50)
q1, q2 = np.percentile(xw, [24, 93])
ap = np.log(np.log(1 - .24) / np.log(1 - .93)) / np.log((q1 - gw) / (q2 - gw)); bp = (q2 - gw) / (-np.log(1 - .93)) ** (1 / ap)
weib = {'x': xw.tolist(), 'g': gw,
        'moments': [am, yw.mean() / special.gamma(1 + 1 / am)], 'mle': [c, sc], 'mle_scipy_fit': [c_fit, sc_fit], 'percentile': [ap, bp],
        'ks_mle': ks(xw, lambda v: stats.weibull_min.cdf(v, c, gw, sc))}

# sample 2: gamma data for gamma / normal / lognormal / Johnson SB
rng = np.random.default_rng(11)
x = np.round(stats.gamma.rvs(3.2, loc=6, scale=4.1, size=220, random_state=rng), 1)
g = round(float(x.min()) / 2, 1); xi = max(0.0, float(x.min()) - 1); lm = float(x.max()) + 1 - xi
k, _, th = stats.gamma.fit(x, floc=g)
m, v = (x - g).mean(), (x - g).var()
mu, sd = stats.norm.fit(x)
s, _, scl = stats.lognorm.fit(x, floc=g)
a, b, _, _ = stats.johnsonsb.fit(x, floc=xi, fscale=lm)
other = {'x': x.tolist(), 'g': g, 'xi': xi, 'lm': lm,
         'gammaMLE': [k, th, ks(x, lambda v: stats.gamma.cdf(v, k, g, th)), float(stats.gamma.logpdf(x, k, g, th).sum())],
         'gammaMoments': [m * m / v, v / m],
         'normal': [mu, sd, ks(x, lambda v: stats.norm.cdf(v, mu, sd)), float(stats.norm.logpdf(x, mu, sd).sum())],
         'lognormal': [float(np.log(scl)), s, ks(x, lambda v: stats.lognorm.cdf(v, s, g, scl)), float(stats.lognorm.logpdf(x, s, g, scl).sum())],
         'sb': [a, b, ks(x, lambda v: stats.johnsonsb.cdf(v, a, b, xi, lm)), float(stats.johnsonsb.logpdf(x, a, b, xi, lm).sum())]}
funcs = {'norm_ppf': {str(p): float(stats.norm.ppf(p)) for p in (1e-6, .01, .3, .5, .97, .999999)},
         'gamma_ppf_k07_th2_g3': {str(p): float(stats.gamma.ppf(p, 0.7, 3, 2)) for p in (.001, .2, .5, .9, .999)},
         'gamma_fn': {str(z): float(special.gamma(z)) for z in (0.5, 1.5, 5, 7.3)},
         'sb_stats_0.5_1.2_6_35': [float(t) for t in stats.johnsonsb.stats(0.5, 1.2, 6, 35, moments='mvs')],
         'lognorm_stats_0.45_6_e2.6': [float(t) for t in stats.lognorm.stats(0.45, 6, np.exp(2.6), moments='mvs')]}
json.dump({'generated_with': f'scipy {__import__("scipy").__version__}, numpy {np.__version__}', 'weibull': weib, 'other': other, 'functions': funcs},
          open(out, 'w'), indent=1)
print('wrote', out)
