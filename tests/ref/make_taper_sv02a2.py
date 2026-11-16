"""Reference for the Taper tool, stage SV-02/a2: Kozak (2004) Model 02 (The Forestry Chronicle 80: 507-515, eq. 4).

Written apart from the JavaScript code: the profile is written again from the paper; volumes by scipy.integrate.quad
(epsrel 1e-12; the slope is infinite at the tip, quad's extrapolation handles it), heights of given diameters by a
dense sign scan refined with scipy.optimize.brentq. The paper gives no coefficients: the sets are RANDOM test values
around an arbitrary nominal set (numpy default_rng(20261117)), not any species; trees are random, not real trees.
One set has a negative exponent at the tip (diameter not finite there).
    python3 tests/ref/make_taper_sv02a2.py  ->  tests/ref/taper_sv02a2.json
"""
import json
import math
import pathlib

import numpy as np
import scipy
from scipy.integrate import quad
from scipy.optimize import brentq

here = pathlib.Path(__file__).parent
rng = np.random.default_rng(20261117)
NOMINAL = dict(a0=1.0, a1=0.95, a2=0.02, b1=0.4, b2=-0.3, b3=0.45, b4=1.5, b5=0.05, b6=-0.25)   # arbitrary test values


def d_hat(p, D, H, h):
    """d = a0 D^a1 H^a2 X^(b1 z^4 + b2/e^(D/H) + b3 X^0.1 + b4/D + b5 H^Q + b6 X); X = (1-z^(1/3))/(1-p^(1/3)),
    Q = 1-z^(1/3), z = h/H, p = 1.3/H."""
    z = h / H
    X = (1 - z ** (1 / 3)) / (1 - (1.3 / H) ** (1 / 3))
    Q = 1 - z ** (1 / 3)
    E = p["b1"] * z ** 4 + p["b2"] / math.exp(D / H) + p["b3"] * X ** 0.1 + p["b4"] / D + p["b5"] * H ** Q + p["b6"] * X
    if X == 0:
        base = 0.0 if E > 0 else (1.0 if E == 0 else math.inf)
    else:
        base = X ** E
    return p["a0"] * D ** p["a1"] * H ** p["a2"] * base


def vol(p, D, H, h1, h2):
    v, err = quad(lambda h: d_hat(p, D, H, h) ** 2, h1, h2, epsabs=0, epsrel=1e-12, limit=500)
    return math.pi / 40000 * v


def heights(p, D, H, d):
    g = lambda h: d_hat(p, D, H, h) ** 2 - d * d
    hs = np.linspace(0, H, 20001); v = np.array([g(h) for h in hs]); out = []
    for i in range(len(hs) - 1):
        if not (np.isfinite(v[i]) and np.isfinite(v[i + 1])): continue
        if v[i] == 0: out.append(float(hs[i]))
        elif v[i] * v[i + 1] < 0: out.append(brentq(g, hs[i], hs[i + 1], xtol=1e-14, rtol=1e-15))
    return out


sets = [dict(name="nominal (arbitrary)", params=NOMINAL)]
for k in range(5):
    sets.append(dict(name=f"random {k + 1}", params={key: val * (1 + rng.uniform(-0.25, 0.25)) for key, val in NOMINAL.items()}))
neg = dict(NOMINAL); neg.update(b1=-0.8, b5=-0.2)                       # exponent at the tip < 0: d(H) not finite
sets.append(dict(name="negative tip exponent (constructed)", params=neg))
cases = []
for s in sets:
    p = s["params"]
    for t in range(3):
        D = float(np.round(rng.uniform(10, 60), 1)); H = float(np.round(rng.uniform(8, 35), 1))
        tipE = p["b1"] + p["b2"] / math.exp(D / H) + p["b4"] / D + p["b5"]
        hs = sorted([0.0, 0.15, 1.3, H] + list(np.round(rng.uniform(0, H, 6), 3)))
        dd = []
        for h in hs:
            v = d_hat(p, D, H, h); dd.append(v if math.isfinite(v) else None)
        top = H if tipE > 0 else 0.98 * H                                # the integral to the tip only when it converges
        pairs = [(0.15, top), (0.0, 1.3), (1.3, 0.5 * H), (0.3 * H, top), (0.5 * H, 0.9 * H)]
        V = [dict(h1=a, h2=b, V=vol(p, D, H, a, b)) for a, b in pairs]
        hd = [dict(d=ds, h=heights(p, D, H, ds)) for ds in (1.1 * D, 0.9 * D, 0.5 * D, 0.2 * D, 5.0)]
        cases.append(dict(set=s["name"], params=p, D=D, H=H, tipExponent=tipE, heights=hs, d=dd, volumes=V, heightOf=hd))
out = {"numpy": np.__version__, "scipy": scipy.__version__, "seed": 20261117, "cases": cases}
(here / "taper_sv02a2.json").write_text(json.dumps(out, indent=1))
print("written", here / "taper_sv02a2.json", len(cases), "cases")
