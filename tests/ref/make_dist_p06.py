"""Reference for the diameter distribution engine, stage P06 (Weibull recovery, Poudel and Cao 2013 M2–M5; DIST_SPEC §3.6).

SciPy/NumPy only; nothing shared with the JavaScript code (no G-function reduction, no B_q formula, no closed forms):
  - targets of known Weibulls from scipy.stats.weibull_min(c, loc = a, scale = b): mean, var, E[D²], ppf
  - M2: joint least_squares of weibull_min.stats('mv') = (m, v) over (ln b, ln c)
  - M3: joint least_squares of (var, mean² + var) = (v, Dq²)
  - M4/M5: joint least_squares of ppf(p) = Q_p, ppf(r) = Q_r
  - root count of M2/M3 on [0.05, 200]: brentq on a 4000-point grid of the scale-eliminated equation written from
    weibull_min.stats (b fitted for each c by least_squares on the first target, then the second target's residual)
  - targets from measured diameters: numpy mean, var (ddof 0), sqrt(mean² + var), min, quantile(method = 'linear')
  - DIST_SPEC §8.2 targets for a = 5, b = 20, c = 2.5
Samples: tests/weibull/fixture.json (simulated, not real measurements).

    python3 tests/ref/make_dist_p06.py  →  tests/ref/dist_p06.json
"""
import json
import pathlib

import numpy as np
import scipy
from scipy import optimize, stats

here = pathlib.Path(__file__).parent
FX = json.loads((here.parent / "weibull" / "fixture.json").read_text())["samples"]
W = lambda a, b, c: stats.weibull_min(c, loc=a, scale=b)
out = {"scipy": scipy.__version__, "numpy": np.__version__}


def targets(a, b, c):
    D = W(a, b, c); m, v = D.stats("mv")
    return dict(mean=float(m), variance=float(v), dq=float(np.sqrt(m * m + v)), q31=float(D.ppf(0.31)), q63=float(D.ppf(0.63)), q50=float(D.ppf(0.5)), q95=float(D.ppf(0.95)))


def solve(a, t, method, start):
    def res(x):
        b, c = np.exp(x); D = W(a, b, c)
        if method == "m2":
            m, v = D.stats("mv"); return [m / t["mean"] - 1, v / t["variance"] - 1]
        if method == "m3":
            m, v = D.stats("mv"); return [v / t["variance"] - 1, (m * m + v) / t["dq"] ** 2 - 1]
        p, r, kp, kr = (0.31, 0.63, "q31", "q63") if method == "m4" else (0.5, 0.95, "q50", "q95")
        return [D.ppf(p) / t[kp] - 1, D.ppf(r) / t[kr] - 1]
    best = None
    for s0 in start:
        r = optimize.least_squares(res, np.log(s0), xtol=1e-15, ftol=1e-15, gtol=1e-15, max_nfev=5000)
        if best is None or r.cost < best.cost:
            best = r
    b, c = np.exp(best.x)
    return dict(b=float(b), c=float(c), resid=float(np.max(np.abs(best.fun))))


def root_count(a, t, method):
    """Number of shape roots in [0.05, 200] of the second moment equation with b eliminated by the first (from stats)."""
    def g(c):
        if method == "m2":
            b = (t["mean"] - a) / float(W(0, 1, c).mean())               # E[D] = a + b·E[unit Weibull]
        else:
            m1, v1 = W(0, 1, c).stats("mv"); e2 = v1 + m1 * m1       # unit moments
            b = (-a * m1 + np.sqrt(a * a * m1 * m1 + e2 * (t["dq"] ** 2 - a * a))) / e2
        return float(W(a, b, c).var()) / t["variance"] - 1
    cs = np.geomspace(0.05, 200, 4001); gs = [g(c) for c in cs]
    return int(sum(1 for i in range(len(cs) - 1) if gs[i] * gs[i + 1] < 0))


cases = []
for a, b, c in [(5, 20, 2.5), (0, 20, 2.5), (0, 15, 1.1), (3, 12, 0.8), (8, 25, 6), (0, 30, 40), (10, 5, 1.5)]:
    t = targets(a, b, c)
    rec = dict(a=a, b=b, c=c, targets=t, solve={m: solve(a, t, m, [(b * 0.8, c * 1.3), (b, 2.0)]) for m in ("m2", "m3", "m4", "m5")},
               roots={m: root_count(a, t, m) for m in ("m2", "m3")})
    cases.append(rec)
out["cases"] = cases
out["spec82"] = targets(5, 20, 2.5)

raw = {}
for name, d in FX.items():
    d = np.asarray(d, float)
    s = dict(n=int(len(d)), mean=float(d.mean()), variance=float(d.var()), dq=float(np.sqrt(np.mean(d * d))), dmin=float(d.min()),
             q31=float(np.quantile(d, 0.31, method="linear")), q63=float(np.quantile(d, 0.63, method="linear")),
             q50=float(np.quantile(d, 0.5, method="linear")), q95=float(np.quantile(d, 0.95, method="linear")))
    rec = dict(summary=s, fits={})
    for pol, a in [("half-dmin", 0.5 * s["dmin"]), ("zero", 0.0)]:
        rec["fits"][pol] = dict(a=a, **{m: solve(a, s, m, [(s["mean"] - a, 3.0), (s["mean"], 1.5)]) for m in ("m2", "m3", "m4", "m5")},
                                roots={m: root_count(a, s, m) for m in ("m2", "m3")})
    raw[name] = rec
out["raw"] = raw
(here / "dist_p06.json").write_text(json.dumps(out, indent=1))
print("wrote dist_p06.json")
