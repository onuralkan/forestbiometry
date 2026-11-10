"""Reference for the diameter distribution engine, stage P07 (Weibull hybrid recovery M6–M10, Poudel and Cao 2013).

SciPy/NumPy only; written from the equations, not from the JavaScript:
  - every shape is found as a root of an equation in scipy.stats.weibull_min quantities (ppf, mean, moment(2)),
    not with the closed forms the JavaScript uses:
      M6/M7/M10  c: weibull_min(c).ppf(r)/weibull_min(c).ppf(p) = (Q_r − a)/(Q_p − a)  (brentq);
                 b: weibull_min(c, loc=a, scale=b).moment(2) = Dq²                     (brentq)
      M8         b = (Q95 − a)/weibull_min(c).ppf(.95);  mean = m                      (all roots, 4000-point grid + brentq)
      M9         the same b;  moment(2) = Dq²                                          (all roots)
      M10        a = (n^(1/3)·Dmin − Q50)/(n^(1/3) − 1)
  - targets: DIST_SPEC §8.2 (a = 5, b = 20, c = 2.5; Dmin = 8.4545396024095 and n = 125 for M10) and the samples of
    tests/weibull/fixture.json summarised with numpy (divisor n, type-7 quantiles), location a = 0.5·Dmin for M6–M9
Not real measurements.

    python3 tests/ref/make_dist_p07.py  →  tests/ref/dist_p07.json
"""
import json
import pathlib

import numpy as np
import scipy
from scipy import optimize, stats

here = pathlib.Path(__file__).parent
FX = json.loads((here.parent / "weibull" / "fixture.json").read_text())["samples"]
LO, HI = 0.05, 200.0
Wm = lambda c, a=0.0, b=1.0: stats.weibull_min(c, loc=a, scale=b)


def all_roots(f):
    cs = np.geomspace(LO, HI, 4001); ys = np.array([f(c) for c in cs]); out = []
    for i in range(len(cs) - 1):
        if np.isfinite(ys[i]) and np.isfinite(ys[i + 1]) and ys[i] * ys[i + 1] < 0:
            out.append(optimize.brentq(f, cs[i], cs[i + 1], xtol=1e-15, rtol=1e-15))
    return out


def shape_from_ratio(p, r, qp, qr, a):
    target = (qr - a) / (qp - a)
    f = lambda c: Wm(c).ppf(r) / Wm(c).ppf(p) - target
    return optimize.brentq(f, LO, HI, xtol=1e-15, rtol=1e-15)


def scale_from_dq(c, a, dq):
    f = lambda b: Wm(c, a, b).moment(2) / dq ** 2 - 1
    return optimize.brentq(f, 1e-9, 10 * dq, xtol=1e-15, rtol=1e-15)


def back(c, a, b):
    D = Wm(c, a, b); m, v = float(D.mean()), float(D.var())
    return dict(mean=m, variance=v, dq=float(np.sqrt(D.moment(2))), q25=float(D.ppf(.25)), q31=float(D.ppf(.31)), q50=float(D.ppf(.5)), q63=float(D.ppf(.63)), q95=float(D.ppf(.95)))


def solve(meth, t, a):
    if meth in ("m6", "m7", "m10"):
        p, r = (0.31, 0.63) if meth == "m7" else (0.25, 0.95)
        qp, qr = t["q%d" % round(p * 100)], t["q%d" % round(r * 100)]
        c = shape_from_ratio(p, r, qp, qr, a); b = scale_from_dq(c, a, t["dq"])
        return [dict(a=a, b=b, c=c, back=back(c, a, b))]
    scale = lambda c: (t["q95"] - a) / Wm(c).ppf(0.95)
    f = (lambda c: Wm(c, a, scale(c)).mean() / t["mean"] - 1) if meth == "m8" else (lambda c: Wm(c, a, scale(c)).moment(2) / t["dq"] ** 2 - 1)
    return [dict(a=a, b=float(scale(c)), c=float(c), back=back(c, a, scale(c))) for c in all_roots(f)]


out = {"scipy": scipy.__version__, "numpy": np.__version__, "interval": [LO, HI]}
D = Wm(2.5, 5, 20)
spec = dict(mean=float(D.mean()), variance=float(D.var()), dq=float(np.sqrt(D.moment(2))), **{"q%d" % round(p * 100): float(D.ppf(p)) for p in (.25, .31, .5, .63, .95)}, dmin=8.4545396024095, n=125)
out["spec"] = dict(targets=spec, a10=(125 ** (1 / 3) * spec["dmin"] - spec["q50"]) / (125 ** (1 / 3) - 1),
                   sol={m: solve(m, spec, 5.0) for m in ("m6", "m7", "m8", "m9")})
out["spec"]["sol"]["m10"] = solve("m10", spec, out["spec"]["a10"])
samples = {}
for name, d in FX.items():
    d = np.asarray(d, float)
    if len(d) < 5:
        continue
    t = dict(mean=float(d.mean()), variance=float(d.var()), n=int(len(d)), dmin=float(d.min()),
             **{"q%d" % round(p * 100): float(np.quantile(d, p, method="linear")) for p in (.25, .31, .5, .63, .95)})
    t["dq"] = float(np.sqrt(t["mean"] ** 2 + t["variance"]))
    a = 0.5 * t["dmin"]; k = t["n"] ** (1 / 3); a10 = (k * t["dmin"] - t["q50"]) / (k - 1)
    sol = {m: solve(m, t, a) for m in ("m6", "m7", "m8", "m9")}
    sol["m10"] = solve("m10", t, a10) if a10 >= 0 and a10 < t["q25"] else []
    samples[name] = dict(targets=t, a=a, a10=a10, sol=sol)
out["samples"] = samples
(here / "dist_p07.json").write_text(json.dumps(out, indent=1))
print("wrote dist_p07.json;", {k: {m: len(v) for m, v in s["sol"].items()} for k, s in samples.items()}, {m: len(v) for m, v in out["spec"]["sol"].items()})
