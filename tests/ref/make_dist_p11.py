"""Reference for the diameter distribution engine, stage P11 (measurement thresholds, truncated ML; DIST_SPEC §2.3).

SciPy/NumPy/mpmath only; nothing shared with the JavaScript code:
  - simulated truncated samples: draws from scipy.stats distributions kept only inside [L, U] (rejection), rounded to
    0.1 cm (numpy default_rng(20261111); NOT real measurements)
  - conditional log-likelihood Σ logpdf − n·ln(P(L ≤ D ≤ U)) with SciPy's own cdf/sf/logsf, maximised with
    scipy.optimize.minimize (Nelder–Mead from several starts, then Powell polish), parameters on the log scale where
    positive; the fixed parameters (Weibull/exponential location 0, beta bounds, Johnson SB ξ, λ) as in the tool
  - far-tail masses ln P(L ≤ D ≤ U) with mpmath (50 digits)

    python3 tests/ref/make_dist_p11.py  →  tests/ref/dist_p11.json
"""
import json
import pathlib

import mpmath as mp
import numpy as np
import scipy
from scipy import optimize, stats

here = pathlib.Path(__file__).parent
rng = np.random.default_rng(20261111)
mp.mp.dps = 50

# family: (scipy constructor from the tool's parameters, free keys, log-scale keys, fixed parameters, true values)
FAM = {
    "weibull": (lambda p: stats.weibull_min(p["c"], loc=p["a"], scale=p["b"]), ["b", "c"], ["b", "c"], {"a": 0.0}, {"b": 20.0, "c": 2.5}),
    "normal": (lambda p: stats.norm(p["mu"], p["sigma"]), ["mu", "sigma"], ["sigma"], {}, {"mu": 22.0, "sigma": 7.0}),
    "lognormal": (lambda p: stats.lognorm(p["sigma"], scale=np.exp(p["mu"])), ["mu", "sigma"], ["sigma"], {}, {"mu": 3.0, "sigma": 0.4}),
    "gamma": (lambda p: stats.gamma(p["k"], scale=p["theta"]), ["k", "theta"], ["k", "theta"], {}, {"k": 4.0, "theta": 5.0}),
    "exponential": (lambda p: stats.expon(loc=p["a"], scale=1 / p["r"]), ["r"], ["r"], {"a": 0.0}, {"r": 0.08}),
    "loglogistic": (lambda p: stats.fisk(p["c"], scale=p["b"]), ["b", "c"], ["b", "c"], {}, {"b": 20.0, "c": 4.0}),
    "beta": (lambda p: stats.beta(p["alpha"], p["beta"], loc=p["L"], scale=p["U"] - p["L"]), ["alpha", "beta"], ["alpha", "beta"], {"L": 0.0, "U": 80.0}, {"alpha": 4.0, "beta": 11.0}),
    "johnsonsb": (lambda p: stats.johnsonsb(p["gamma"], p["delta"], loc=p["xi"], scale=p["lambda"]), ["gamma", "delta"], ["delta"], {"xi": 0.0, "lambda": 80.0}, {"gamma": 2.0, "delta": 1.6}),
}


def logmass(D, L, U):
    if U is None:
        return float(D.logsf(L))
    if L is None:
        return float(D.logcdf(U))
    return float(np.log(D.cdf(U) - D.cdf(L))) if D.cdf(L) < 0.5 else float(np.log(D.sf(L) - D.sf(U)))


def fit(fam, d, L, U):
    make, free, logk, fixed, truth = FAM[fam]
    def P(x):
        p = dict(fixed); p.update({k: (np.exp(v) if k in logk else v) for k, v in zip(free, x)}); return p
    def nll(x):
        try:
            D = make(P(x)); lm = logmass(D, L, U); ll = np.sum(D.logpdf(d)) - len(d) * lm
            return -ll if np.isfinite(ll) else 1e300
        except Exception:
            return 1e300
    x_t = [np.log(truth[k]) if k in logk else truth[k] for k in free]
    best = None
    for shift in (0.0, 0.3, -0.3):
        x0 = [v + shift for v in x_t]
        r = optimize.minimize(nll, x0, method="Nelder-Mead", options=dict(xatol=1e-12, fatol=1e-12, maxiter=40000, maxfev=40000))
        r = optimize.minimize(nll, r.x, method="Powell", options=dict(xtol=1e-12, ftol=1e-14, maxiter=40000))
        if best is None or r.fun < best.fun:
            best = r
    p = P(best.x); D = make(p)
    return dict(params={k: float(v) for k, v in p.items()}, logLik=float(-best.fun), logMass=logmass(D, L, U))


cases = []
for fam, (make, free, logk, fixed, truth) in FAM.items():
    for (L, U) in [(8.0, None), (10.0, 40.0)]:
        D = make({**fixed, **truth}); d = []
        while len(d) < 250:
            x = D.rvs(4000, random_state=rng); x = x[(x >= L) & ((U is None) | (x <= (U if U is not None else np.inf)))]
            d.extend(np.round(x, 1).tolist())
        d = [v for v in d[:250] if v >= L and (U is None or v <= U)]
        res = fit(fam, np.asarray(d), L, U)
        cases.append(dict(family=fam, lower=L, upper=U, d=d, fixed=fixed, truth=truth, **res))
        print(fam, L, U, len(d), res["params"], flush=True)

# far-tail masses with mpmath
tails = []
for fam, p, L, U in [("normal", {"mu": 0, "sigma": 1}, 10, 12), ("normal", {"mu": 20, "sigma": 5}, 60, None), ("normal", {"mu": 20, "sigma": 5}, None, -20),
                     ("weibull", {"a": 0, "b": 20, "c": 2.5}, 90, None), ("weibull", {"a": 0, "b": 20, "c": 2.5}, 1e-3, 2e-3), ("gamma", {"k": 2, "theta": 8}, 300, 400),
                     ("exponential", {"a": 0, "r": 0.1}, 500, 600), ("lognormal", {"mu": 3, "sigma": 0.4}, 150, None)]:
    if fam == "normal":
        F = lambda x: mp.ncdf((mp.mpf(x) - p["mu"]) / p["sigma"])
    elif fam == "weibull":
        F = lambda x: 1 - mp.e ** (-((mp.mpf(x) - p["a"]) / p["b"]) ** p["c"])
    elif fam == "gamma":
        F = lambda x: mp.gammainc(p["k"], 0, mp.mpf(x) / p["theta"], regularized=True)
    elif fam == "exponential":
        F = lambda x: 1 - mp.e ** (-p["r"] * (mp.mpf(x) - p["a"]))
    else:
        F = lambda x: mp.ncdf((mp.log(x) - p["mu"]) / p["sigma"])
    S = lambda x: (mp.gammainc(p["k"], mp.mpf(x) / p["theta"], mp.inf, regularized=True) if fam == "gamma" else 1 - F(x))
    m = (S(L) - S(U)) if (L is not None and U is not None) else (S(L) if U is None else F(U))
    tails.append(dict(family=fam, params=p, lower=L, upper=U, logMass=float(mp.log(m))))
out = {"scipy": scipy.__version__, "numpy": np.__version__, "mpmath": mp.__version__, "seed": 20261111, "cases": cases, "tails": tails}
(here / "dist_p11.json").write_text(json.dumps(out, indent=1))
print("wrote dist_p11.json:", len(cases), "cases,", len(tails), "tail masses")
