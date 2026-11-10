"""Reference for the diameter distribution engine, stage P01 (docs/DIST_SPEC.md).

SciPy only; nothing shared with the JavaScript code.
  - Weibull pdf/logpdf/cdf/logcdf/sf/logsf/quantile/mean/variance on a grid that reaches both tails
  - standard normal cdf / logcdf / logsf far into the tails (core/stats.js)
  - roots for core/roots.js (brentq)
  - Weibull fits with fixed location on the samples of tests/weibull/fixture.json:
      maximum likelihood by direct minimisation of the negative log-likelihood (scipy.optimize.minimize),
      i.e. NOT the score equation the JavaScript solves; moments (divisor n − 1) by brentq; KS; A²
  - the Weibull row of DIST_SPEC §8.1

    python3 tests/ref/make_dist_p01.py  →  tests/ref/dist_p01.json
"""
import json
import pathlib

import numpy as np
import scipy
from scipy import optimize, special, stats

here = pathlib.Path(__file__).parent
FX = json.loads((here.parent / "weibull" / "fixture.json").read_text())["samples"]
out = {"scipy": scipy.__version__, "numpy": np.__version__}

# --- Weibull functions -------------------------------------------------------------------------
grid = []
for (a, b, c) in [(0, 20, 2.5), (5, 20, 2.5), (0, 8, 0.7), (3, 30, 6), (0, 1, 1), (10, 2, 12)]:
    W = stats.weibull_min(c, loc=a, scale=b)
    xs = [a + b * f for f in (1e-9, 1e-4, 0.01, 0.2, 0.7, 1.0, 1.5, 2.5, 4.0)]
    qs = [1e-12, 1e-6, 0.01, 0.25, 0.5, 0.9, 0.999, 1 - 1e-9]
    grid.append(dict(a=a, b=b, c=c, x=xs, pdf=W.pdf(xs).tolist(), logpdf=W.logpdf(xs).tolist(), cdf=W.cdf(xs).tolist(),
                     logcdf=W.logcdf(xs).tolist(), sf=W.sf(xs).tolist(), logsf=W.logsf(xs).tolist(),
                     q=qs, ppf=W.ppf(qs).tolist(), mean=float(W.mean()), var=float(W.var())))
out["weibull"] = grid
W = stats.weibull_min(2.5, loc=5, scale=20)
out["spec81"] = dict(pdf20=float(W.pdf(20)), cdf20=float(W.cdf(20)), q50=float(W.ppf(0.5)))

# --- normal tails --------------------------------------------------------------------------------
zs = [-40, -20, -10, -8, -5, -3, -1.8, -1.7320508, -1.7, -1, -0.3, 0, 0.3, 1, 1.7, 1.8, 3, 5, 8.3, 12]
out["normal"] = dict(z=zs, cdf=stats.norm.cdf(zs).tolist(), sf=stats.norm.sf(zs).tolist(),
                     logcdf=stats.norm.logcdf(zs).tolist(), logsf=stats.norm.logsf(zs).tolist())
gq = [(0.5, 0.2), (0.5, 3.0), (0.5, 50.0), (2.0, 0.5), (2.0, 9.0), (7.5, 30.0), (7.5, 2.0)]
out["gammaQ"] = [dict(a=a, x=x, q=float(special.gammaincc(a, x))) for a, x in gq]

# --- roots ---------------------------------------------------------------------------------------
out["roots"] = dict(cube2=float(optimize.brentq(lambda x: x ** 3 - 2, 0, 2, xtol=1e-15)),
                    cos=float(optimize.brentq(np.cos, 0, 3, xtol=1e-15)),
                    steep=float(optimize.brentq(lambda x: np.exp(x) - 1e6, 0, 30, xtol=1e-15)),
                    flat=1.25)   # triple root of (x − 1.25)³: known exactly

# --- fits ----------------------------------------------------------------------------------------
def nll(theta, x):
    b, c = np.exp(theta)
    return -np.sum(np.log(c / b) + (c - 1) * np.log(x / b) - (x / b) ** c)

def ad_stat(d, W):
    s = np.sort(d); n = len(s); i = np.arange(1, n + 1)
    return float(-n - np.sum((2 * i - 1) * (W.logcdf(s) + W.logsf(s[::-1]))) / n)

fits = {}
for name, d in FX.items():
    d = np.asarray(d, float)
    if len(d) < 5 or len(set(d.tolist())) < 3:
        continue
    for a in (0.0, round(float(d.min()) / 2, 1)):
        x = d - a
        best = None
        for b0, c0 in [(x.mean(), 1.0), (x.mean(), 3.0), (np.median(x), 8.0)]:
            r = optimize.minimize(nll, np.log([b0, c0]), args=(x,), method="Nelder-Mead",
                                  options=dict(xatol=1e-13, fatol=1e-13, maxiter=20000, maxfev=20000))
            if best is None or r.fun < best.fun:
                best = r
        b, c = np.exp(best.x)
        W = stats.weibull_min(c, loc=a, scale=b)
        m, s2 = x.mean(), x.var(ddof=1)
        g = lambda cc: special.gamma(1 + 2 / cc) / special.gamma(1 + 1 / cc) ** 2 - 1 - s2 / m ** 2
        cm = optimize.brentq(g, 0.05, 200, xtol=1e-15)
        bm = m / special.gamma(1 + 1 / cm)
        Wm = stats.weibull_min(cm, loc=a, scale=bm)
        fits[f"{name}|{a}"] = dict(sample=name, a=a, n=len(d),
                                   ml=dict(b=float(b), c=float(c), logLik=float(-best.fun), ks=float(stats.kstest(d, W.cdf).statistic), ad=ad_stat(d, W)),
                                   mom=dict(b=float(bm), c=float(cm), logLik=float(np.sum(Wm.logpdf(d))), ks=float(stats.kstest(d, Wm.cdf).statistic), ad=ad_stat(d, Wm)))
out["fits"] = fits
(here / "dist_p01.json").write_text(json.dumps(out, indent=1))
print("wrote dist_p01.json:", len(grid), "weibull grids,", len(fits), "fits")
