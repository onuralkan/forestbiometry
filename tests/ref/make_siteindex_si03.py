"""Reference for the site index tool, stage SI03: fitting ADA difference equations to height–age series.

Simulated stem-analysis series (numpy default_rng(20261113); NOT real measurements): each tree has its own site
parameter, global parameters are known, heights get multiplicative noise. Pairs are built for the three pairing modes
(written separately from the JS code) and the difference equation is fitted with scipy.optimize.least_squares
(method 'lm', analytic-free: SciPy's own finite-difference Jacobian) from a FIXED start that the JS test also uses.
Standard errors: sqrt(diag(s²(JᵀJ)⁻¹)) with s² = SSE/(n − p) and J from SciPy at the optimum.
    python3 tests/ref/make_siteindex_si03.py  →  tests/ref/siteindex_si03.json
"""
import json
import pathlib

import numpy as np
import scipy
from scipy import optimize

here = pathlib.Path(__file__).parent
rng = np.random.default_rng(20261113)
L = lambda b1, A: np.log1p(-np.exp(-b1 * A))
FORMS = {
    "cr.ada.b0": (lambda th, A1, H1, A2: H1 * np.exp(th[1] * (L(th[0], A2) - L(th[0], A1))), [0.03, 1.4]),
    "cr.ada.b2": (lambda th, A1, H1, A2: th[0] * np.exp(np.log(H1 / th[0]) * L(th[1], A2) / L(th[1], A1)), [38.0, 0.035]),
    "schu.ada": (lambda th, A1, H1, A2: H1 * np.exp(th[0] * (1 / A2 - 1 / A1)), [-22.0]),
}
TRUE = {"cr.ada.b0": (0.03, 1.4), "cr.ada.b2": (38.0, 0.035), "schu.ada": (-22.0,)}
START = {"cr.ada.b0": [0.02, 1.0], "cr.ada.b2": [45.0, 0.02], "schu.ada": [-10.0]}


def series_for(form, k=25):
    out = []
    for t in range(k):
        ages = np.arange(rng.integers(3, 8), rng.integers(60, 110), rng.integers(5, 11)).astype(float)
        if form == "cr.ada.b0":
            s = rng.uniform(18, 40); H = s * (1 - np.exp(-0.03 * ages)) ** 1.4
        elif form == "cr.ada.b2":
            s = rng.uniform(0.9, 2.2); H = 38.0 * (1 - np.exp(-0.035 * ages)) ** s
        else:
            s = np.log(rng.uniform(12, 32)) + 22.0 / 50; H = np.exp(s - 22.0 / ages)
        H = np.round(H * np.exp(rng.normal(0, 0.03, len(ages))), 2)
        out.append(dict(id=f"T{t + 1}", points=[dict(A=float(a), H=float(h)) for a, h in zip(ages, H) if h > 0]))
    return out


def pairs(series, mode):
    P = []
    for s in series:
        p = sorted(s["points"], key=lambda q: q["A"])
        for i in range(len(p)):
            js = [i + 1] if mode == "consecutive" else (range(1, len(p)) if mode == "first" and i == 0 else ([] if mode == "first" else range(i + 1, len(p))))
            for j in js:
                if j < len(p):
                    P.append((p[i]["A"], p[i]["H"], p[j]["A"], p[j]["H"]))
    return np.array(P)


out = {"scipy": scipy.__version__, "numpy": np.__version__, "seed": 20261113, "true": TRUE, "start": START, "forms": {}}
for form, (f, _) in FORMS.items():
    ser = series_for(form)
    rec = dict(series=ser, fits={})
    for mode in ("consecutive", "first", "all"):
        P = pairs(ser, mode)
        res = optimize.least_squares(lambda th: f(th, P[:, 0], P[:, 1], P[:, 2]) - P[:, 3], START[form], method="lm", xtol=1e-15, ftol=1e-15, gtol=1e-15, max_nfev=100000)
        n, p = len(P), len(START[form]); sse = float(np.sum(res.fun ** 2)); s2 = sse / (n - p)
        J = res.jac; se = np.sqrt(np.diag(s2 * np.linalg.inv(J.T @ J)))
        e = res.fun
        rec["fits"][mode] = dict(n=int(n), theta=res.x.tolist(), sse=sse, rmse=float(np.sqrt(sse / n)), bias=float(np.mean(e)), se=se.tolist())
    out["forms"][form] = rec
(here / "siteindex_si03.json").write_text(json.dumps(out, indent=1))
for form, r in out["forms"].items():
    print(form, {m: (v["n"], [round(x, 5) for x in v["theta"]]) for m, v in r["fits"].items()})
