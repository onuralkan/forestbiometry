"""Reference for the diameter distribution engine, stage P13 (model comparison and diagnostics; DIST_SPEC §2.4).

SciPy/NumPy only: KS two-sided (scipy.stats.kstest), Cramér–von Mises (scipy.stats.cramervonmises), Anderson–Darling
from scipy logcdf/logsf, ln L from scipy logpdf (the lognormal on the diameter scale, Jacobian included) and the same
statistics for a conditional (truncated) distribution with a custom cdf; Q–Q and P–P points with plotting position
(i − 0.5)/n. Distributions at fixed parameter values on the samples of tests/weibull/fixture.json.

    python3 tests/ref/make_dist_p13.py  →  tests/ref/dist_p13.json
"""
import json
import pathlib

import numpy as np
import scipy
from scipy import stats

here = pathlib.Path(__file__).parent
FX = json.loads((here.parent / "weibull" / "fixture.json").read_text())["samples"]
CASES = [("weibull", {"a": 0, "b": 25, "c": 2.4}, lambda p: stats.weibull_min(p["c"], loc=p["a"], scale=p["b"])),
         ("normal", {"mu": 22, "sigma": 9}, lambda p: stats.norm(p["mu"], p["sigma"])),
         ("lognormal", {"mu": 3.0, "sigma": 0.45}, lambda p: stats.lognorm(p["sigma"], scale=np.exp(p["mu"]))),
         ("gamma", {"k": 4.5, "theta": 5}, lambda p: stats.gamma(p["k"], scale=p["theta"]))]
out = {"scipy": scipy.__version__, "numpy": np.__version__, "cases": []}
for name, d in FX.items():
    d = np.sort(np.asarray(d, float)); n = len(d)
    if n < 5:
        continue
    for fam, p, mk in CASES:
        D = mk(p); i = np.arange(1, n + 1)
        ad = float(-n - np.sum((2 * i - 1) * (D.logcdf(d) + D.logsf(d[::-1]))) / n)
        pp = (i - 0.5) / n
        out["cases"].append(dict(sample=name, family=fam, params=p, ks=float(stats.kstest(d, D.cdf).statistic), cvm=float(stats.cramervonmises(d, D.cdf).statistic), ad=ad,
                                 logLik=float(np.sum(D.logpdf(d))), qq=[[float(D.ppf(q)), float(x)] for q, x in zip(pp[::max(1, n // 10)], d[::max(1, n // 10)])],
                                 pp=[[float(D.cdf(x)), float(q)] for q, x in zip(pp[::max(1, n // 10)], d[::max(1, n // 10)])]))
    # conditional (truncated below at the 20th percentile of the sample) Weibull
    L = float(np.quantile(d, 0.2)); dt = d[d >= L]; D = stats.weibull_min(2.4, scale=25); m = D.sf(L)
    F = lambda x: (D.cdf(x) - D.cdf(L)) / m
    out["cases"].append(dict(sample=name, family="weibull", params={"a": 0, "b": 25, "c": 2.4}, lower=L, d=dt.tolist(), ks=float(stats.kstest(dt, F).statistic),
                             cvm=float(stats.cramervonmises(dt, F).statistic), logLik=float(np.sum(D.logpdf(dt)) - len(dt) * np.log(m))))
(here / "dist_p13.json").write_text(json.dumps(out, indent=1))
print("wrote dist_p13.json:", len(out["cases"]), "cases")
