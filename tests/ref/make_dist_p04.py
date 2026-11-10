"""Reference for the diameter distribution engine, stage P04 (location–scale beta with fixed bounds; docs/DIST_SPEC.md).

SciPy/NumPy only; nothing shared with the JavaScript code:
  - scipy.stats.beta(α, β, loc=L, scale=U − L): pdf/logpdf/cdf/logcdf/sf/logsf/ppf on grids reaching both tails
  - scipy.special.digamma and polygamma(1, ·) (trigamma)
  - ML with fixed bounds: scipy.stats.beta.fit(floc=L, fscale=U − L) and, separately, Nelder–Mead minimisation of
    −Σ beta.logpdf (diameter scale) over (ln α, ln β)
  - moments (divisor n and n − 1): joint least_squares of beta.stats('mv') = (m, v)
  - DIST_SPEC §8.1 beta row
Samples: tests/weibull/fixture.json with stated bounds, and simulated samples (numpy default_rng(20261113); NOT real
measurements). The bounds below are test inputs chosen for the check, not a rule for real data.

    python3 tests/ref/make_dist_p04.py  →  tests/ref/dist_p04.json
"""
import json
import pathlib

import numpy as np
import scipy
from scipy import optimize, special, stats

here = pathlib.Path(__file__).parent
FX = json.loads((here.parent / "weibull" / "fixture.json").read_text())["samples"]
rng = np.random.default_rng(20261113)
SIM = {
    "sim_beta_2_5": (np.round(stats.beta(2, 5, loc=5, scale=40).rvs(150, random_state=rng), 1), 5.0, 45.0),
    "sim_beta_small_shape": (np.round(stats.beta(0.7, 1.4, loc=0, scale=50).rvs(120, random_state=rng), 2), 0.0, 50.0),
    "sim_beta_large_shape": (np.round(stats.beta(40, 60, loc=10, scale=30).rvs(80, random_state=rng), 2), 10.0, 40.0),
}
BOUNDS = {"w2": (0.0, 60.0), "w3": (0.0, 80.0), "small": (10.0, 45.0), "skewed": (0.0, 70.0)}
out = {"scipy": scipy.__version__, "numpy": np.__version__, "seed": 20261113,
       "sim": {k: dict(d=v[0].tolist(), L=v[1], U=v[2]) for k, v in SIM.items()}, "bounds": BOUNDS}
B = lambda a, b, L, U: stats.beta(a, b, loc=L, scale=U - L)

qs = [1e-12, 1e-6, 0.01, 0.25, 0.5, 0.9, 0.999, 1 - 1e-9]


def side_eval(a, b, L, U, x):
    """SciPy evaluated on the short side: near U it is called on the reflected Beta(β, α) at z = (U − x)/S, so 1 − y is
    never formed as 1 − (x − L)/S (SciPy loses digits there; the reflection is an identity, not the JS formula)."""
    S = U - L; y = (x - L) / S; z = (U - x) / S
    if y <= 0.5:
        D = stats.beta(a, b)
        return dict(pdf=D.pdf(y) / S, logpdf=D.logpdf(y) - np.log(S), cdf=D.cdf(y), logcdf=D.logcdf(y), sf=D.sf(y), logsf=D.logsf(y))
    D = stats.beta(b, a)
    return dict(pdf=D.pdf(z) / S, logpdf=D.logpdf(z) - np.log(S), cdf=D.sf(z), logcdf=D.logsf(z), sf=D.cdf(z), logsf=D.logcdf(z))


grid = []
for a, b, L, U in [(2, 5, 5, 45), (0.5, 0.5, 0, 1), (0.7, 1.4, 0, 50), (40, 60, 10, 40), (3, 1.2, 2, 30), (1, 1, 0, 10)]:
    D = B(a, b, L, U); S = U - L
    xs = sorted({float(L + S * y) for y in (1e-12, 1e-6, 0.01, 0.2, 0.5, 0.8, 0.99)} | {float(U - S * z) for z in (1e-6, 1e-12)})
    ev = [side_eval(a, b, L, U, x) for x in xs]
    ppf = [float(L + S * stats.beta(a, b).ppf(q)) if q <= 0.5 else float(U - S * stats.beta(b, a).ppf(1 - q)) for q in qs]
    grid.append(dict(alpha=a, beta=b, L=L, U=U, x=xs, **{k: [float(e[k]) for e in ev] for k in ev[0]}, q=qs, ppf=ppf,
                     isf_small=[float(U - S * stats.beta(b, a).ppf(1 - (1 - 1e-9))), float(U - S * stats.beta(b, a).ppf(1 - (1 - 1e-12)))],   # 1 − q of the double q, as JS
                     mean=float(D.mean()), var=float(D.var())))
out["beta"] = grid
xs = [1e-4, 0.3, 1, 2.5, 9.99, 10, 37, 1e3, 1e6]
out["poly"] = dict(x=xs, trigamma=special.polygamma(1, xs).tolist())
out["spec81"] = dict(pdf=float(B(2, 5, 5, 45).pdf(20)), cdf=float(B(2, 5, 5, 45).cdf(20)), q50=float(B(2, 5, 5, 45).ppf(0.5)))


def ad_stat(d, D):
    s = np.sort(d); n = len(s); i = np.arange(1, n + 1)
    return float(-n - np.sum((2 * i - 1) * (D.logcdf(s) + D.logsf(s[::-1]))) / n)


def gof(d, D):
    return dict(logLik=float(np.sum(D.logpdf(d))), ks=float(stats.kstest(d, D.cdf).statistic), ad=ad_stat(d, D))


def lsq(res, starts):
    best = None
    for s0 in starts:
        r = optimize.least_squares(res, s0, xtol=1e-15, ftol=1e-15, gtol=1e-15, max_nfev=20000)
        if best is None or r.cost < best.cost:
            best = r
    return best.x, float(np.max(np.abs(best.fun)))


fits = {}
samples = {**{k: (np.asarray(v, float), *BOUNDS[k]) for k, v in FX.items() if k in BOUNDS}, **SIM}
for name, (d, L, U) in samples.items():
    a_f, b_f, _, _ = stats.beta.fit(d, floc=L, fscale=U - L)
    nll = lambda t: -np.sum(B(np.exp(t[0]), np.exp(t[1]), L, U).logpdf(d))
    best = None
    for st in ([0.0, 0.0], [np.log(a_f) + 0.2, np.log(b_f) - 0.2], [1.0, 1.5]):
        r = optimize.minimize(nll, st, method="Nelder-Mead", options=dict(xatol=1e-13, fatol=1e-13, maxiter=40000, maxfev=40000))
        if best is None or r.fun < best.fun:
            best = r
    a_n, b_n = np.exp(best.x)
    rec = dict(sample=name, L=L, U=U, n=int(len(d)),
               ml=dict(alpha=float(a_n), beta=float(b_n), alpha_fit=float(a_f), beta_fit=float(b_f), logLik_fit=float(np.sum(B(a_f, b_f, L, U).logpdf(d))), **gof(d, B(a_n, b_n, L, U))))
    for ddof, key in [(0, "mom_n"), (1, "mom_n1")]:
        m, v = d.mean(), d.var(ddof=ddof)

        def res(t, m=m, v=v):
            mm, vv = B(np.exp(t[0]), np.exp(t[1]), L, U).stats(moments="mv")
            return [mm / m - 1, vv / v - 1]
        (x0, x1), r = lsq(res, [[0.0, 0.0], [np.log(a_f), np.log(b_f)]])
        rec[key] = dict(alpha=float(np.exp(x0)), beta=float(np.exp(x1)), mean=float(m), var=float(v), resid=r, **gof(d, B(np.exp(x0), np.exp(x1), L, U)))
    fits[name] = rec
out["fits"] = fits


def finite(o):   # SciPy underflows some far-tail logs to ±inf; those points are written as null and checked separately in JS
    if isinstance(o, float):
        return o if np.isfinite(o) else None
    if isinstance(o, list):
        return [finite(v) for v in o]
    if isinstance(o, dict):
        return {k: finite(v) for k, v in o.items()}
    return o


(here / "dist_p04.json").write_text(json.dumps(finite(out), indent=1))
print("wrote dist_p04.json:", len(grid), "grids,", len(fits), "samples")
