"""Independent reference for the Diameter Distribution Lab, Weibull version (Module 4).
Fixed-seed synthetic samples (numpy default_rng) and SciPy results, written to tests/weibull/fixture.json
and tests/ref/weibull.json. Run: python3 tests/ref/make_weibull_reference.py
Parameters: a = location, b = scale, c = shape (scipy: weibull_min(c, loc=a, scale=b)).
"""
import json, math, os
import numpy as np, scipy
from scipy import stats, optimize, special

here = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(20261105)
samples = {
    'w2': np.round(stats.weibull_min.rvs(2.3, loc=0, scale=24, size=150, random_state=rng), 1),     # 2-parameter
    'w3': np.round(stats.weibull_min.rvs(1.6, loc=7, scale=15, size=200, random_state=rng), 1),     # shifted
    'small': np.round(stats.weibull_min.rvs(3.5, loc=0, scale=30, size=12, random_state=rng), 1),
    'skewed': np.round(stats.weibull_min.rvs(0.8, loc=0, scale=10, size=80, random_state=rng), 2) + 0.01,
}
plots = []
for pid, (c, b, n) in {'P01': (2.0, 20, 40), 'P02': (3.2, 28, 55), '7': (1.4, 15, 25)}.items():
    plots += [{'plot_id': pid, 'dbh': float(v)} for v in np.round(stats.weibull_min.rvs(c, loc=0, scale=b, size=n, random_state=rng), 1)]
plots += [{'plot_id': 'K1', 'dbh': 20.0}, {'plot_id': 'K1', 'dbh': 20.0}, {'plot_id': 'K1', 'dbh': 20.0}]   # constant plot
plots += [{'plot_id': 'K2', 'dbh': 14.5}]                                                               # one tree

def ml(x, a):
    y = x - a; ly = np.log(y); u = y / y.max()          # scaled to avoid overflow of y**c
    g = lambda c: np.sum(u ** c * ly) / np.sum(u ** c) - 1 / c - ly.mean()
    c = optimize.brentq(g, 0.01, 1000, xtol=1e-14, rtol=4 * np.finfo(float).eps, maxiter=500)
    b = np.mean(y ** c) ** (1 / c)
    return c, b
def mom(x, a):
    y = x - a; cv2 = y.var(ddof=1) / y.mean() ** 2
    h = lambda c: math.exp(special.gammaln(1 + 2 / c) - 2 * special.gammaln(1 + 1 / c)) - 1 - cv2
    c = optimize.brentq(h, 0.01, 1000, xtol=1e-14, rtol=4 * np.finfo(float).eps, maxiter=500)
    return c, y.mean() / special.gamma(1 + 1 / c)
def stats_for(x, a, b, c):
    dist = stats.weibull_min(c, loc=a, scale=b); s = np.sort(x); n = s.size; i = np.arange(1, n + 1)
    A2 = -n - np.sum((2 * i - 1) * (dist.logcdf(s) + dist.logsf(s[::-1]))) / n
    ll = float(np.sum(dist.logpdf(x)))
    return {'ks': float(stats.kstest(x, dist.cdf).statistic), 'ad': float(A2), 'loglik': ll, 'aic': 4 - 2 * ll, 'bic': 2 * math.log(n) - 2 * ll,
            'mean': float(dist.mean()), 'sd': float(dist.std()), 'median': float(dist.median())}

ref = {'scipy': scipy.__version__, 'numpy': np.__version__, 'fits': {}}
A_FIXED = {'w2': None, 'w3': 6.0, 'small': 5.0, 'skewed': None}
for k, x in samples.items():
    r = {}
    for name, f, a in (('ml0', ml, 0.0), ('mom0', mom, 0.0)) + ((('mlA', ml, A_FIXED[k]), ('momA', mom, A_FIXED[k])) if A_FIXED[k] is not None else ()):
        c, b = f(x, a)
        r[name] = {'a': a, 'b': b, 'c': c, **stats_for(x, a, b, c)}
    # scipy's own optimiser as a looser cross-check of the ML root
    cs, _, bs = stats.weibull_min.fit(x, floc=0)
    r['ml0_scipy_fit'] = [float(cs), float(bs)]
    # class probabilities with tails: limits 8,12,...,40 for the first ML fit
    p = r['ml0']; dist = stats.weibull_min(p['c'], loc=0, scale=p['b']); br = np.arange(8, 41, 4.0)
    r['classes'] = {'breaks': br.tolist(), 'prob': np.diff(dist.cdf(br)).tolist(), 'below': float(dist.cdf(br[0])), 'above': float(dist.sf(br[-1])),
                    'obs': np.histogram(x, bins=br)[0].tolist(), 'obs_below': int((x < br[0]).sum()), 'obs_above': int((x >= br[-1]).sum())}
    ref['fits'][k] = r
per_plot = {}
for pid in sorted(set(t['plot_id'] for t in plots)):
    x = np.array([t['dbh'] for t in plots if t['plot_id'] == pid])
    if x.size < 2 or np.ptp(x) == 0: per_plot[pid] = None; continue
    c, b = ml(x, 0.0); per_plot[pid] = {'n': int(x.size), 'b': b, 'c': c}
ref['per_plot'] = per_plot
# CDF/pdf values at fixed points for a = 5, b = 12, c = 2.5
pts = [-1, 0, 5, 5.000001, 6, 10, 17, 30, 80, 200]
d0 = stats.weibull_min(2.5, loc=5, scale=12)
ref['points'] = {'p': {'a': 5, 'b': 12, 'c': 2.5}, 'x': pts, 'cdf': d0.cdf(pts).tolist(), 'sf': d0.sf(pts).tolist(), 'pdf': d0.pdf(pts).tolist(), 'ppf': {str(q): float(d0.ppf(q)) for q in (0.01, 0.25, 0.5, 0.9, 0.999)},
                 'mean': float(d0.mean()), 'sd': float(d0.std()), 'median': float(d0.median())}
json.dump({'samples': {k: v.tolist() for k, v in samples.items()}, 'plots': plots, 'a_fixed': A_FIXED}, open(os.path.join(here, '..', 'weibull', 'fixture.json'), 'w'), indent=1)
json.dump(ref, open(os.path.join(here, 'weibull.json'), 'w'), indent=1)
print('ok', {k: (round(v['ml0']['c'], 4), round(v['ml0']['b'], 4)) for k, v in ref['fits'].items()})
