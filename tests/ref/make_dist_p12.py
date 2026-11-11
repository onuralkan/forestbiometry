"""Reference for the diameter distribution engine, stage P12 (diameter classes and grouped data; DIST_SPEC §2.3).

SciPy/NumPy only; nothing shared with the JavaScript code:
  - class probabilities p_j = cdf(hi) − cdf(lo) with scipy.stats (unequal widths, open last class), tails, totals
  - grouped ML: maximise Σ n_j ln p_j (outside = 'zero') or Σ n_j ln(p_j / Σ p_k) (outside = 'unrecorded') with
    scipy.optimize.minimize (Nelder–Mead from three starts, then Powell), positive parameters on the log scale
  - class frequencies from simulated diameters (numpy default_rng(20261112); NOT real measurements) binned into
    unequal classes with an open last class; also the same classes with frequencies expanded per hectare (× 25)

    python3 tests/ref/make_dist_p12.py  →  tests/ref/dist_p12.json
"""
import json
import pathlib

import numpy as np
import scipy
from scipy import optimize, stats

here = pathlib.Path(__file__).parent
rng = np.random.default_rng(20261112)
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
EDGES = [4, 8, 12, 16, 20, 26, 32, 40, None]          # unequal widths, last class open (None = ∞)


def probs(D, edges):
    return [float((D.sf(lo) - (D.sf(hi) if hi is not None else 0.0))) for lo, hi in zip(edges[:-1], edges[1:])]


def fit(fam, edges, n, outside):
    make, free, logk, fixed, truth = FAM[fam]
    def P(x):
        p = dict(fixed); p.update({k: (np.exp(v) if k in logk else v) for k, v in zip(free, x)}); return p
    def nll(x):
        try:
            pj = np.array(probs(make(P(x)), edges))
            if np.any(pj[np.array(n) > 0] <= 0):
                return 1e300
            ll = float(np.sum(np.array(n)[np.array(n) > 0] * np.log(pj[np.array(n) > 0])))
            if outside == "unrecorded":
                ll -= float(np.sum(n)) * np.log(np.sum(pj))
            return -ll
        except Exception:
            return 1e300
    x_t = [np.log(truth[k]) if k in logk else truth[k] for k in free]
    best = None
    for shift in (0.0, 0.25, -0.25):
        r = optimize.minimize(nll, [v + shift for v in x_t], method="Nelder-Mead", options=dict(xatol=1e-12, fatol=1e-13, maxiter=40000, maxfev=40000))
        r = optimize.minimize(nll, r.x, method="Powell", options=dict(xtol=1e-12, ftol=1e-14, maxiter=40000))
        if best is None or r.fun < best.fun:
            best = r
    return dict(params={k: float(v) for k, v in P(best.x).items()}, logLik=float(-best.fun))


out = {"scipy": scipy.__version__, "numpy": np.__version__, "seed": 20261112, "edges": EDGES, "cases": [], "tables": []}
for fam, (make, free, logk, fixed, truth) in FAM.items():
    D = make({**fixed, **truth})
    d = D.rvs(500, random_state=rng)
    n = [int(np.sum((d >= lo) & ((d < hi) if hi is not None else True))) for lo, hi in zip(EDGES[:-1], EDGES[1:])]
    below = int(np.sum(d < EDGES[0]))
    for outside in ("zero", "unrecorded"):
        r = fit(fam, EDGES, n, outside)
        out["cases"].append(dict(family=fam, outside=outside, n=n, below=below, fixed=fixed, **r))
        print(fam, outside, r["params"], flush=True)
    rp = fit(fam, EDGES, [25 * v for v in n], "zero")       # expanded frequencies: same parameters expected
    out["cases"].append(dict(family=fam, outside="zero", perha=True, n=[25 * v for v in n], fixed=fixed, **rp))
    # class table at the true parameters: probabilities, tails, totals
    pj = probs(D, EDGES)
    out["tables"].append(dict(family=fam, params={**fixed, **truth}, probs=pj, below=float(D.cdf(EDGES[0])), total=float(np.sum(pj) + D.cdf(EDGES[0]))))
# closed last class and a gap between classes
D = stats.weibull_min(2.5, scale=20)
out["gapcase"] = dict(edges=[[4, 8], [8, 12], [16, 20], [20, 30]], probs=[float(D.cdf(h) - D.cdf(l)) for l, h in [[4, 8], [8, 12], [16, 20], [20, 30]]],
                      below=float(D.cdf(4)), above=float(D.sf(30)), gap=float(D.cdf(16) - D.cdf(12)))
(here / "dist_p12.json").write_text(json.dumps(out, indent=1))
print("wrote dist_p12.json:", len(out["cases"]), "grouped fits")
