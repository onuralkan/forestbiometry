"""Reference for the Taper tool, stage SV-02/a1 (TOOLS_SPEC TP01): Max and Burkhart (1976) Model 4.

Written apart from the JavaScript code: the profile is written again from the paper (Forest Science 22: 283-289,
equation (4)), volumes by scipy.integrate.quad with the join points as breakpoints (no antiderivative), heights of
given diameters by a dense sign scan refined with scipy.optimize.brentq.
Coefficient sets: the two Table 3 sets of the paper (loblolly pine, inside bark; used ONLY as test values, never
shipped with the site, TOOLS_SPEC K1) and random perturbations of them (numpy default_rng(20261116)); trees are random
(D 10-60 cm, H 8-35 m), not real trees.
    python3 tests/ref/make_taper_tp01.py  ->  tests/ref/taper_tp01.json
"""
import json
import math
import pathlib

import numpy as np
import scipy
from scipy.integrate import quad
from scipy.optimize import brentq

here = pathlib.Path(__file__).parent
rng = np.random.default_rng(20261116)
TABLE3 = {"plantation": dict(b1=-3.0257, b2=1.4586, b3=-1.4464, b4=39.1081, a1=0.7431, a2=0.1125),
          "natural": dict(b1=-4.2844, b2=2.0870, b3=-2.3287, b4=86.7575, a1=0.7965, a2=0.0884)}


def y(p, x):
    """Model 4: y = d^2/D^2 = b1(x-1) + b2(x^2-1) + b3(a1-x)^2 I1 + b4(a2-x)^2 I2, I_i = 1 if a_i - x >= 0."""
    i1 = 1.0 if p["a1"] - x >= 0 else 0.0
    i2 = 1.0 if p["a2"] - x >= 0 else 0.0
    return p["b1"] * (x - 1) + p["b2"] * (x ** 2 - 1) + p["b3"] * (p["a1"] - x) ** 2 * i1 + p["b4"] * (p["a2"] - x) ** 2 * i2


def vol(p, D, H, h1, h2):
    pts = [a * H for a in (p["a1"], p["a2"]) if h1 < a * H < h2]
    v, err = quad(lambda h: D * D * y(p, h / H), h1, h2, points=pts or None, epsabs=0, epsrel=1e-13, limit=200)
    return math.pi / 40000 * v


def heights(p, D, H, d):
    g = lambda h: D * D * y(p, h / H) - d * d
    hs = np.linspace(0, H, 20001); v = np.array([g(h) for h in hs]); out = []
    for i in range(len(hs) - 1):
        if v[i] == 0: out.append(float(hs[i]))
        elif v[i] * v[i + 1] < 0: out.append(brentq(g, hs[i], hs[i + 1], xtol=1e-14, rtol=1e-15))
    return out


sets = []
for name, p in TABLE3.items():
    sets.append(dict(name=name, params=p))
for k in range(4):
    base = TABLE3["plantation" if k % 2 == 0 else "natural"]
    p = {key: val * (1 + rng.uniform(-0.15, 0.15)) for key, val in base.items()}
    sets.append(dict(name=f"perturbed {k + 1}", params=p))
# constructed, not realistic: a negative b4 makes y rise from the ground to a2 and fall above it, so a diameter just
# below the maximum is reached twice (every root must be reported)
sets.append(dict(name="non-monotone (constructed)", params=dict(b1=-3.0257, b2=1.4586, b3=-1.4464, b4=-30.0, a1=0.7431, a2=0.1125)))
cases = []
for s in sets:
    p = s["params"]
    for t in range(3):
        D = float(np.round(rng.uniform(10, 60), 1)); H = float(np.round(rng.uniform(8, 35), 1))
        hs = sorted([0.0, 0.15, 1.3, p["a2"] * H, p["a1"] * H, H] + list(np.round(rng.uniform(0, H, 6), 3)))
        dd = [D * math.sqrt(y(p, h / H)) if y(p, h / H) >= 0 else None for h in hs]
        pairs = [(0.15, H), (0.0, p["a2"] * H), (p["a2"] * H, p["a1"] * H), (1.3, 0.5 * H), (0.3 * H, H)]
        neg = lambda a, b: bool(min(y(p, h / H) for h in np.linspace(a, b, 100001)) < -1e-12)   # y < 0 somewhere: no volume
        V = [dict(h1=a, h2=b, V=None if neg(a, b) else vol(p, D, H, a, b)) for a, b in pairs]
        dstar = [1.1 * D, 0.9 * D, 0.5 * D, 0.2 * D, 5.0]
        if s["name"].startswith("non-monotone"):
            dstar.append(D * math.sqrt(y(p, 0.4 * p["a2"])))      # reached once below a2 and once above it
        hd = [dict(d=ds, h=heights(p, D, H, ds)) for ds in dstar]
        cases.append(dict(set=s["name"], params=p, D=D, H=H, heights=hs, d=dd, volumes=V, heightOf=hd))
out = {"numpy": np.__version__, "scipy": scipy.__version__, "seed": 20261116, "cases": cases}
(here / "taper_tp01.json").write_text(json.dumps(out, indent=1))
print("written", here / "taper_tp01.json", len(cases), "cases")
