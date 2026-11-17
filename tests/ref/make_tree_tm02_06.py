"""Reference for diameter/basal area (TM-02/a1) and form factors (TM-06/a1).

Written apart from the JavaScript code (assets/lab/tree/diameter.js, form.js).
- Solids of revolution d(x)^2 = D^2 * (x/H)^r (x measured from the tip; Graves 1906 §97) for random r and H: the
  volume by scipy.integrate.quad (no closed form), the breast-height, absolute, absolute-above-breast-height and
  normal (d at H/20) form factors from it; two diameters on the body give back r.
- Trees with random diameters and counts: sum of basal areas, arithmetic mean diameter and the diameter of the tree
  of average basal area, with mpmath at 40 digits.
Random values (numpy default_rng(20261118)); no field data.
    python3 tests/ref/make_tree_tm02_06.py  ->  tests/ref/tree_tm02_06.json
"""
import json
import math
import pathlib

import mpmath as mp
import numpy as np
from scipy.integrate import quad

mp.mp.dps = 40
here = pathlib.Path(__file__).parent
rng = np.random.default_rng(20261118)
BH = 1.3
bodies = []
for k in range(60):
    r = float([0.0, 1.0, 2.0, 3.0][k] if k < 4 else rng.uniform(0.2, 3.2))
    H = float(rng.uniform(6, 40))
    D = float(rng.uniform(15, 70))               # diameter at the base, cm
    d = lambda h: D * ((H - h) / H) ** (r / 2)    # h from the ground
    V, _ = quad(lambda h: math.pi / 40000 * d(h) ** 2, 0, H, epsabs=0, epsrel=1e-13, limit=200)
    Vabove, _ = quad(lambda h: math.pi / 40000 * d(h) ** 2, BH, H, epsabs=0, epsrel=1e-13, limit=200)
    area = lambda dd: math.pi / 40000 * dd ** 2
    h1, h2 = float(rng.uniform(0, 0.3 * H)), float(rng.uniform(0.4 * H, 0.9 * H))
    bodies.append(dict(r=r, H=H, D=D, V=V, Vabove=Vabove, d_bh=d(BH), d_norm=d(H / 20), d_mid=d(H / 2),
                       F_breast=V / (area(d(BH)) * H), F_abs=V / (area(D) * H), F_abs_above=Vabove / (area(d(BH)) * (H - BH)),
                       F_norm=V / (area(d(H / 20)) * H), y1=d(h1), x1=H - h1, y2=d(h2), x2=H - h2))
trees = []
for k in range(40):
    m = int(rng.integers(1, 30))
    ds = [float(x) for x in np.round(rng.uniform(4, 80, m), 1)]
    ns = [int(x) for x in rng.integers(1, 6, m)]
    G = mp.fsum(n * mp.pi / 40000 * mp.mpf(dd) ** 2 for dd, n in zip(ds, ns))
    N = sum(ns)
    trees.append(dict(d=ds, n=ns, N=N, G=float(G), dMean=float(mp.fsum(n * mp.mpf(dd) for dd, n in zip(ds, ns)) / N),
                      dg=float(mp.sqrt(40000 * (G / N) / mp.pi))))
json.dump({"source": "tests/ref/make_tree_tm02_06.py", "bh": BH, "bodies": bodies, "trees": trees}, open(here / "tree_tm02_06.json", "w"), indent=1)
print(len(bodies), "bodies,", len(trees), "tree lists")
