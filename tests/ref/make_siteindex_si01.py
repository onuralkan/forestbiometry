"""Reference for the site index tool, stage SI01 (docs/TOOLS_SPEC.md §3.1–3.2).

Independent of the difference equations: for an observation (A1, H1) the BASE model is solved for its site-specific
parameter with scipy.optimize.brentq, and the projected height / site index / curve is the base model evaluated with
that parameter. Random parameters and ages; the site parameter is drawn from a plausible range, H1 computed from it and the parameter
solved back (numpy default_rng(20261112); not real data).
    python3 tests/ref/make_siteindex_si01.py  →  tests/ref/siteindex_si01.json
"""
import json
import pathlib

import numpy as np
import scipy
from scipy import optimize

here = pathlib.Path(__file__).parent
rng = np.random.default_rng(20261112)


def cr(b0, b1, b2, A):
    return b0 * (1 - np.exp(-b1 * A)) ** b2


def schu(b0, b1, A):
    return np.exp(b0 + b1 / A)


def solve(f, lo, hi):
    return optimize.brentq(f, lo, hi, xtol=1e-300, rtol=4 * np.finfo(float).eps, maxiter=500)


cases = {"cr.ada.b0": [], "cr.ada.b2": [], "schu.ada": []}
for _ in range(300):
    # site parameters from plausible ranges; H1 from the base model, then the parameter is SOLVED back from (A1, H1)
    A1, A2, A0 = rng.uniform(5, 150, 3)
    b1, b2 = rng.uniform(0.01, 0.06), rng.uniform(0.9, 2.2)
    H1 = float(cr(rng.uniform(15, 50), b1, b2, A1))
    s = solve(lambda b0: cr(b0, b1, b2, A1) - H1, 1e-6, 1e7)                       # b0 site-specific
    cases["cr.ada.b0"].append(dict(p=dict(b1=b1, b2=b2), A1=A1, H1=H1, A2=A2, A0=A0, site=s, H2=float(cr(s, b1, b2, A2)), SI=float(cr(s, b1, b2, A0))))
    b0 = rng.uniform(25, 55); H1b = float(cr(b0, b1, rng.uniform(0.6, 3.0), A1))
    s = float(np.exp(solve(lambda t: np.log(cr(b0, b1, np.exp(t), A1)) - np.log(H1b), -20, 20)))   # b2 site-specific, solved on ln b2
    cases["cr.ada.b2"].append(dict(p=dict(b0=b0, b1=b1), A1=A1, H1=H1b, A2=A2, A0=A0, site=s, H2=float(cr(b0, b1, s, A2)), SI=float(cr(b0, b1, s, A0))))
    c1 = -rng.uniform(5, 60); H1s = float(schu(np.log(rng.uniform(8, 40)) - c1 / 50, c1, A1))
    s = solve(lambda c0: np.log(schu(c0, c1, A1)) - np.log(H1s), -100, 100)        # b0 site-specific (log scale)
    cases["schu.ada"].append(dict(p=dict(b1=c1), A1=A1, H1=H1s, A2=A2, A0=A0, site=s, H2=float(schu(s, c1, A2)), SI=float(schu(s, c1, A0))))
for v in cases.values():
    for c in v:
        for k in ("A1", "A2", "A0", "H1", "site"):
            c[k] = float(c[k])
# one curve per form: SI = 20 m at A0 = 50, ages 5…150
ages = [5.0, 10.0, 20.0, 30.0, 50.0, 80.0, 120.0, 150.0]
curves = {}
for form, p, base in [("cr.ada.b0", dict(b1=0.03, b2=1.4), lambda s, A: cr(s, 0.03, 1.4, A)), ("cr.ada.b2", dict(b0=35.0, b1=0.03), lambda s, A: cr(35.0, 0.03, s, A)),
                      ("schu.ada", dict(b1=-25.0), lambda s, A: schu(s, -25.0, A))]:
    lo, hi = {"cr.ada.b0": (1e-6, 1e7), "cr.ada.b2": (1e-9, 1e4), "schu.ada": (-100, 100)}[form]
    s = solve(lambda q: base(q, 50.0) - 20.0, lo, hi)                                # bracket checked for these parameters
    curves[form] = dict(p=p, SI=20.0, A0=50.0, ages=ages, H=[float(base(s, a)) for a in ages])
out = {"scipy": scipy.__version__, "numpy": np.__version__, "seed": 20261112, "cases": cases, "curves": curves}
(here / "siteindex_si01.json").write_text(json.dumps(out, indent=1))
print("wrote siteindex_si01.json")
