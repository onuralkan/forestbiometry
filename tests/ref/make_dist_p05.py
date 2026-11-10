"""Reference for the diameter distribution engine, stage P05 (Weibull direct estimation; docs/DIST_SPEC.md).

SciPy/NumPy only; nothing shared with the JavaScript code, and no closed forms copied from it:
  - moments (divisor n and n − 1): the two equations mean = a + bΓ(1 + 1/c), var = b²[Γ(1 + 2/c) − Γ²(1 + 1/c)]
    solved jointly for (b, c) with scipy.optimize.least_squares on scipy.stats.weibull_min.stats
    (the JavaScript reduces them to one CV² equation and bisects)
  - percentiles: sample percentiles with numpy.quantile(method='linear') (= Hyndman–Fan type 7); then
    weibull_min.ppf(p) = Q_p, weibull_min.ppf(r) = Q_r solved with least_squares (the JavaScript uses the closed form)
  - maximum likelihood with fixed location: scipy.stats.weibull_min.fit(floc=a) and, separately, direct Nelder–Mead
    minimisation of −ln L
  - DIST_SPEC §8.2 (a = 5, b = 20, c = 2.5): theoretical percentiles, mean, variance
Samples: tests/weibull/fixture.json plus simulated Weibull samples (numpy default_rng(20261110); NOT real measurements).

    python3 tests/ref/make_dist_p05.py  →  tests/ref/dist_p05.json
"""
import json
import pathlib

import numpy as np
import scipy
from scipy import optimize, stats

here = pathlib.Path(__file__).parent
FX = json.loads((here.parent / "weibull" / "fixture.json").read_text())["samples"]
rng = np.random.default_rng(20261110)
SIM = {
    "sim_2p_n60": np.round(stats.weibull_min(2.5, loc=0, scale=20).rvs(60, random_state=rng), 1),
    "sim_2p_n500": np.round(stats.weibull_min(2.5, loc=0, scale=20).rvs(500, random_state=rng), 1),
    "sim_loc5_n200": np.round(stats.weibull_min(1.3, loc=5, scale=15).rvs(200, random_state=rng), 1),
    "sim_reverseJ_n150": np.round(stats.weibull_min(0.9, loc=0, scale=12).rvs(150, random_state=rng) + 0.05, 2),
}
PAIRS = [(0.24, 0.93), (0.25, 0.95), (0.31, 0.63), (0.5, 0.95), (0.1, 0.9)]
out = {"scipy": scipy.__version__, "numpy": np.__version__, "seed": 20261110, "pairs": PAIRS,
       "sim": {k: v.tolist() for k, v in SIM.items()}}


def ad_stat(d, W):
    s = np.sort(d); n = len(s); i = np.arange(1, n + 1)
    return float(-n - np.sum((2 * i - 1) * (W.logcdf(s) + W.logsf(s[::-1]))) / n)


def stats_of(d, W):
    return dict(logLik=float(np.sum(W.logpdf(d))), ks=float(stats.kstest(d, W.cdf).statistic), ad=ad_stat(d, W))


def solve2(resid, start):
    best = None
    for s0 in start:
        r = optimize.least_squares(resid, np.log(s0), xtol=1e-15, ftol=1e-15, gtol=1e-15, max_nfev=20000)
        if best is None or r.cost < best.cost:
            best = r
    return np.exp(best.x), float(np.max(np.abs(best.fun)))


def nll(theta, x):
    b, c = np.exp(theta)
    return -np.sum(np.log(c / b) + (c - 1) * np.log(x / b) - (x / b) ** c)


fits = {}
samples = {**{k: np.asarray(v, float) for k, v in FX.items()}, **SIM}
for name, d in samples.items():
    if len(d) < 5 or len(set(d.tolist())) < 3:
        continue
    locs = [0.0, round(float(d.min()) / 2, 1)] + ([5.0] if name == "sim_loc5_n200" else [])
    for a in locs:
        x = d - a
        rec = dict(sample=name, a=a, n=int(len(d)))
        # maximum likelihood: SciPy's own fit, and direct minimisation of −ln L
        c_s, _, b_s = stats.weibull_min.fit(d, floc=a)
        best = None
        for b0, c0 in [(x.mean(), 1.0), (x.mean(), 3.0), (np.median(x), 8.0)]:
            r = optimize.minimize(nll, np.log([b0, c0]), args=(x,), method="Nelder-Mead",
                                  options=dict(xatol=1e-13, fatol=1e-13, maxiter=20000, maxfev=20000))
            if best is None or r.fun < best.fun:
                best = r
        b_n, c_n = np.exp(best.x)
        rec["ml"] = dict(b=float(b_n), c=float(c_n), b_scipyfit=float(b_s), c_scipyfit=float(c_s),
                         **stats_of(d, stats.weibull_min(c_n, loc=a, scale=b_n)))
        # moments, both divisors: joint solve of mean and variance
        for ddof, key in [(0, "mom_n"), (1, "mom_n1")]:
            m, v = x.mean(), x.var(ddof=ddof)

            def res(th, m=m, v=v):
                b, c = np.exp(th)
                mu, var = stats.weibull_min(c, scale=b).stats(moments="mv")
                return [(mu - m) / m, (var - v) / v]
            (b, c), r = solve2(res, [(m, 1.0), (m, 3.0), (m, 0.5), (m, 10.0)])
            rec[key] = dict(b=float(b), c=float(c), mean=float(m + a), var=float(v), resid=r,
                            **stats_of(d, stats.weibull_min(c, loc=a, scale=b)))
        # percentiles (type 7), several pairs: solve ppf(p) = Qp, ppf(r) = Qr
        rec["pct"] = []
        for p, q in PAIRS:
            Qp, Qr = np.quantile(d, [p, q], method="linear")
            if not Qr > Qp:
                rec["pct"].append(dict(p=p, r=q, qp=float(Qp), qr=float(Qr), tied=True)); continue

            def res(th, Qp=Qp, Qr=Qr, p=p, q=q):
                b, c = np.exp(th)
                W = stats.weibull_min(c, loc=a, scale=b)
                return [(W.ppf(p) - Qp) / Qp, (W.ppf(q) - Qr) / Qr]
            (b, c), r = solve2(res, [(Qr - a, 1.0), (Qr - a, 3.0), (Qr - a, 8.0)])
            rec["pct"].append(dict(p=p, r=q, qp=float(Qp), qr=float(Qr), b=float(b), c=float(c), resid=r,
                                   **stats_of(d, stats.weibull_min(c, loc=a, scale=b))))
        fits[f"{name}|{a}"] = rec
out["fits"] = fits

# sample quantiles (type 7) on awkward positions
out["q7"] = [dict(d=sorted(v.tolist() if hasattr(v, "tolist") else v), p=pp, q=float(np.quantile(np.asarray(v, float), pp, method="linear")))
             for v in (FX["small"], [3.0, 1.0, 2.0], [5.0, 7.0], SIM["sim_2p_n60"].tolist()) for pp in (0, 0.01, 0.24, 0.5, 0.93, 0.999, 1)]

# DIST_SPEC §8.2
W = stats.weibull_min(2.5, loc=5, scale=20)
out["spec82"] = dict(a=5, b=20, c=2.5, mean=float(W.mean()), var=float(W.var()),
                     q={str(p): float(W.ppf(p)) for p in (0.24, 0.25, 0.31, 0.5, 0.63, 0.93, 0.95)})
(here / "dist_p05.json").write_text(json.dumps(out, indent=1))
print("wrote dist_p05.json:", len(fits), "sample × location cases")
