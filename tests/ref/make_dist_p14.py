"""Reference for the diameter distribution engine, stage P14 (bootstrap; DIST_SPEC §2.4).

Re-implements the bootstrap from its definition with SciPy, using the SAME random stream as the JavaScript
(mulberry32, uniforms (k + 0.5)/2³², inverse-CDF draws, rounding floor(x/step + 0.5)·step) so that the simulated data
sets coincide; everything else is independent: refits with SciPy (norm.fit; weibull_min.fit(floc=0); exponential
r = 1/mean), statistics with scipy.stats.kstest / cramervonmises and AD from logcdf/logsf, Monte Carlo p-value
(1 + #{T_b ≥ T_0})/(B + 1), percentile intervals with numpy.quantile (linear = type 7).

    python3 tests/ref/make_dist_p14.py  →  tests/ref/dist_p14.json
"""
import json
import pathlib

import numpy as np
import scipy
from scipy import stats

here = pathlib.Path(__file__).parent
FX = json.loads((here.parent / "weibull" / "fixture.json").read_text())["samples"]


def mulberry32(seed):
    a = seed & 0xFFFFFFFF
    def imul(x, y): return (x * y) & 0xFFFFFFFF
    def nxt():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = imul(t ^ (t >> 15), t | 1)
        t ^= (t + imul(t ^ (t >> 7), t | 61)) & 0xFFFFFFFF
        t &= 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return nxt


uni = lambda r: (np.floor(r() * 4294967296) + 0.5) / 4294967296
rnd = lambda x, s: np.floor(x / s + 0.5) * s if s else x
FAM = {
    "normal": (lambda p: stats.norm(p["mu"], p["sigma"]), lambda d: dict(zip(["mu", "sigma"], stats.norm.fit(d))), ["mu", "sigma"]),
    "weibull": (lambda p: stats.weibull_min(p["c"], loc=0, scale=p["b"]), lambda d: (lambda c, l, b: {"a": 0.0, "b": b, "c": c})(*stats.weibull_min.fit(d, floc=0)), ["b", "c"]),
    "exponential": (lambda p: stats.expon(loc=0, scale=1 / p["r"]), lambda d: {"a": 0.0, "r": 1 / np.mean(d)}, ["r"]),
}


def stat(D, d):
    s = np.sort(d); n = len(s); i = np.arange(1, n + 1)
    return dict(ks=float(stats.kstest(s, D.cdf).statistic), ad=float(-n - np.sum((2 * i - 1) * (D.logcdf(s) + D.logsf(s[::-1]))) / n), cvm=float(stats.cramervonmises(s, D.cdf).statistic))


def gof(fam, d, step, B, seed):
    # a replicate with a diameter ≤ 0 after rounding is not a valid data set (diameters are > 0; for location a = 0 the
    # data must lie above a): it is counted as failed and left out, as in the tool
    mk, fit, _ = FAM[fam]; p0 = fit(d); T0 = stat(mk(p0), d); r = mulberry32(seed); ge = {k: 0 for k in T0}; ok = 0
    for _ in range(B):
        x = np.array([rnd(mk(p0).ppf(uni(r)), step) for _ in range(len(d))])
        if fam in ("weibull", "exponential") and np.min(x) <= 0:     # support d > a = 0; the normal accepts any value
            continue
        ok += 1
        Tb = stat(mk(fit(x)), x)
        for k in T0:
            ge[k] += Tb[k] >= T0[k]
    return dict(params=p0, t0=T0, ge=ge, completed=ok, p={k: (1 + ge[k]) / (ok + 1) for k in T0})


def ci(fam, d, step, B, seed, scheme, probs=(0.25, 0.5, 0.75, 0.95)):
    mk, fit, keys = FAM[fam]; p0 = fit(d); r = mulberry32(seed); est = {k: [] for k in keys + ["Q" + str(q) for q in probs]}; n = len(d)
    for _ in range(B):
        if scheme == "nonparametric":
            x = np.array([d[int(np.floor(uni(r) * n))] for _ in range(n)])
        else:
            x = np.array([rnd(mk(p0).ppf(uni(r)), step) for _ in range(n)])
        pb = fit(x)
        for k in keys:
            est[k].append(pb[k])
        for q in probs:
            est["Q" + str(q)].append(float(mk(pb).ppf(q)))
    return {k: dict(lo=float(np.quantile(v, 0.025, method="linear")), hi=float(np.quantile(v, 0.975, method="linear")), se=float(np.std(v, ddof=1))) for k, v in est.items()}


d_small, d_w2 = np.asarray(FX["small"], float), np.asarray(FX["w2"], float)
out = {"scipy": scipy.__version__, "numpy": np.__version__, "cases": [
    dict(id="normal-gof", family="normal", sample="small", step=0.1, B=99, seed=7, **gof("normal", d_small, 0.1, 99, 7)),
    dict(id="normal-ci", family="normal", sample="small", step=0.1, B=199, seed=3, scheme="parametric", ci=ci("normal", d_small, 0.1, 199, 3, "parametric")),
    dict(id="exp-gof", family="exponential", sample="w2", step=0.1, B=99, seed=5, **gof("exponential", d_w2, 0.1, 99, 5)),
    dict(id="exp-ci-np", family="exponential", sample="w2", step=None, B=199, seed=11, scheme="nonparametric", ci=ci("exponential", d_w2, None, 199, 11, "nonparametric")),
    dict(id="weibull-gof", family="weibull", sample="small", step=0.1, B=49, seed=2, **gof("weibull", d_small, 0.1, 49, 2)),
]}
(here / "dist_p14.json").write_text(json.dumps(out, indent=1, default=float))
print("wrote dist_p14.json:", [(c["id"], c.get("ge")) for c in out["cases"]])
