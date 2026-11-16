"""Reference for the Growth function fitter (SQ-03).

Written apart from the JavaScript code: each model written again (Hernandez-Cuevas et al. 2018 Cuadro 2 for
Chapman-Richards and Schumacher; Fekedulegn et al. 1999 Table 1 for Gompertz, logistic, monomolecular, Weibull),
fitted by scipy.optimize.least_squares (method 'lm', SciPy's own finite-difference Jacobian, tolerances 1e-15) from its
own start; derived ages by numerical derivatives (central differences) and brentq, not by the closed forms.
  1. Fekedulegn et al. 1999, Table 11: top height of Norway spruce by age (published data, used here as a worked
     example only; CC BY-SA 4.0) and their estimates (Tables 9 and 10) for the forms that the paper fits.
  2. Simulated series per form (numpy default_rng(20261119)): known curves + N(0, sd) noise; NOT real data.
    python3 tests/ref/make_growth_sq03.py  ->  tests/ref/growth_sq03.json
"""
import json
import math
import pathlib

import numpy as np
import scipy
from scipy.optimize import least_squares, brentq

here = pathlib.Path(__file__).parent
rng = np.random.default_rng(20261119)

def cr(p, t): return p[0] * (1 - np.exp(-p[1] * t)) ** p[2]
def schu(p, t): return p[0] * np.exp(-p[1] / t)
def gomp(p, t): return p[0] * np.exp(-p[1] * np.exp(-p[2] * t))
def logi(p, t): return p[0] / (1 + p[1] * np.exp(-p[2] * t))
def mono(p, t): return p[0] * (1 - p[1] * np.exp(-p[2] * t))
def weib(p, t): return p[0] - p[1] * np.exp(-p[2] * t ** p[3])
F = dict(cr=cr, schu=schu, gomp=gomp, logi=logi, mono=mono, weib=weib)


def fit(form, t, y, x0):
    r = least_squares(lambda p: F[form](p, t) - y, x0, method="lm", xtol=1e-15, ftol=1e-15, gtol=1e-15, max_nfev=200000)
    return r.x.tolist(), float(np.sum(r.fun ** 2))


import mpmath as mp
mp.mp.dps = 40
MF = dict(cr=lambda p, t: p[0] * (1 - mp.e ** (-p[1] * t)) ** p[2], schu=lambda p, t: p[0] * mp.e ** (-p[1] / t),
          gomp=lambda p, t: p[0] * mp.e ** (-p[1] * mp.e ** (-p[2] * t)), logi=lambda p, t: p[0] / (1 + p[1] * mp.e ** (-p[2] * t)),
          mono=lambda p, t: p[0] * (1 - p[1] * mp.e ** (-p[2] * t)), weib=lambda p, t: p[0] - p[1] * mp.e ** (-p[2] * t ** p[3]))


def derived(form, p, tmax):
    """Inflection (sign change of y'' from + to -) and MAI culmination (sign change of t*y' - y), both by mpmath's
    numerical differentiation at 40 digits, a scan on (0, 10*tmax] and findroot (no closed forms)."""
    P = [mp.mpf(x) for x in p]; f = lambda t: MF[form](P, t)
    d1 = lambda t: mp.diff(f, t); d2 = lambda t: mp.diff(f, t, 2); g = lambda t: t * d1(t) - f(t)
    ts = [mp.mpf(tmax) * 10 * i / 4000 for i in range(1, 4001)]
    def first(fun, cond):
        prev = None
        for t in ts:
            v = fun(t)
            if prev is not None and cond(prev[1], v):
                return float(mp.findroot(fun, (prev[0], t), solver="anderson"))
            prev = (t, v)
        return None
    infl = first(d2, lambda a, b: a > 0 and b < 0)
    mai = first(g, lambda a, b: a * b < 0)
    return dict(inflection=infl, maiCulmination=mai)


out = {"numpy": np.__version__, "scipy": scipy.__version__, "seed": 20261119}
age = np.array([20, 25, 30, 35, 40, 45, 50, 55, 60, 64.0])
h = np.array([7.3, 9.0, 10.9, 12.6, 13.9, 15.4, 16.9, 18.2, 19.0, 20.0])
published = {"mono": [34.48863145, 1.05406148, 0.01438658], "gomp": [25.67476848, 2.57813001, 0.03626337],
             "logi": [22.86432616, 6.70940179, 0.05909335], "weib": [27.222914, 26.243522, 0.0051663, 1.3263582]}
# Table 11: the paper's predicted top heights (2 decimals) from its published estimates: a check of the formulas
table11 = {"mono": [7.22, 9.11, 10.87, 12.51, 14.04, 15.46, 16.78, 18.00, 19.15, 20.01], "gomp": [7.37, 9.06, 10.77, 12.44, 14.03, 15.51, 16.86, 18.08, 19.16, 19.93],
           "logi": [7.48, 9.03, 10.69, 12.37, 14.02, 15.56, 16.94, 18.14, 19.16, 19.83], "weib": [7.28, 9.08, 10.83, 12.49, 14.04, 15.49, 16.83, 18.05, 19.15, 19.96]}
fek = dict(t=age.tolist(), y=h.tolist(), published=published, table11=table11, fits={})
for form, pub in published.items():
    x, sse = fit(form, age, h, np.array(pub) * 1.1)
    fek["fits"][form] = dict(params=x, sse=sse)
for form, x0 in (("cr", [30, 0.02, 1.5]), ("schu", [30, 20])):
    x, sse = fit(form, age, h, np.array(x0)); fek["fits"][form] = dict(params=x, sse=sse)
for form in fek["fits"]:
    fek["fits"][form]["derived"] = derived(form, np.array(fek["fits"][form]["params"]), 64)
out["fekedulegn"] = fek

TRUE = {"cr": [30, 0.03, 1.8], "schu": [35, 25], "gomp": [28, 3.0, 0.04], "logi": [26, 8.0, 0.07], "mono": [40, 1.0, 0.012], "weib": [30, 29, 0.002, 1.5]}
sims = []
for form, p in TRUE.items():
    t = np.sort(rng.uniform(5, 90, 40)); y = F[form](np.array(p), t) + rng.normal(0, 0.4, len(t))
    x, sse = fit(form, t, y, np.array(p) * 1.15)
    sims.append(dict(form=form, true=p, t=t.tolist(), y=y.tolist(), params=x, sse=sse, derived=derived(form, np.array(x), float(t.max()))))
out["sims"] = sims
(here / "growth_sq03.json").write_text(json.dumps(out, indent=1))
print("written", here / "growth_sq03.json")
for f, v in fek["fits"].items(): print(f, [round(a, 6) for a in v["params"]], round(v["sse"], 5), v["derived"])
