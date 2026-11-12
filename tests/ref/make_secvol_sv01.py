"""Reference for the stem section volume tool, stage SV01 (docs/TOOLS_SPEC.md §2, §8.1).

NumPy/SciPy only; written separately from the JavaScript code:
  - geometric solids g(h) = g0(1 − h/L)^r (paraboloid r = 1, cone 2, neiloid 3): exact volume by scipy.integrate.quad
    of the area function; Huber, Smalian, Newton, Hohenadl sums written directly from their definitions
  - random trees (numpy default_rng(20261112); NOT real measurements): unequal sections, ends / middles / triples
    layouts, stump cylinder, top solid, merchantable volume (crossing height by numpy.interp on the reversed profile;
    top-piece crossing checked by brentq on the solid's profile and its volume by quad)
    python3 tests/ref/make_secvol_sv01.py  →  tests/ref/secvol_sv01.json
"""
import json
import pathlib

import numpy as np
import scipy
from scipy import integrate, optimize

here = pathlib.Path(__file__).parent
G = lambda d: np.pi / 4 * (np.asarray(d, float) / 100) ** 2
out = {"scipy": scipy.__version__, "numpy": np.__version__, "seed": 20261112}

# 1. solids, D0 = 30 cm, L = 20 m (TOOLS_SPEC §8.1)
D0, L = 30.0, 20.0
sol = []
for name, r in [("paraboloid", 1), ("cone", 2), ("neiloid", 3)]:
    g = lambda h, r=r: G(D0) * (1 - h / L) ** r
    d = lambda h, r=r: D0 * (1 - h / L) ** (r / 2)
    exact = integrate.quad(g, 0, L, epsabs=0, epsrel=1e-13)[0]
    e4 = np.linspace(0, L, 5)
    sol.append(dict(name=name, r=r, exact=exact,
                    huber1=float(g(L / 2) * L), smalian1=float((g(0) + g(L)) / 2 * L), newton1=float(L / 6 * (g(0) + 4 * g(L / 2) + g(L))),
                    huber4=float(sum(g((a + b) / 2) * (b - a) for a, b in zip(e4[:-1], e4[1:]))),
                    smalian4=float(sum((g(a) + g(b)) / 2 * (b - a) for a, b in zip(e4[:-1], e4[1:]))),
                    newton4=float(sum((b - a) / 6 * (g(a) + 4 * g((a + b) / 2) + g(b)) for a, b in zip(e4[:-1], e4[1:]))),
                    hohenadl=float(sum(g(f * L) for f in (0.1, 0.3, 0.5, 0.7, 0.9)) * L / 5),
                    d_at={str(h): float(d(h)) for h in (0, 2, 2.5, 5, 6, 7.5, 10, 12.5, 14, 15, 17.5, 18, 20)}))
    # top solid alone: from h0 = 10 with base d(10), length 10, shape r
    g10 = float(g(10.0)); sol[-1]["top_from10"] = integrate.quad(g, 10, L, epsabs=0, epsrel=1e-13)[0]
    # merchantable to dTop = 7 cm inside the top piece of the same solid (start at 10 m): crossing and volume
    hm = optimize.brentq(lambda h: d(h) - 7.0, 10, L - 1e-12, xtol=1e-15)
    sol[-1]["merch7_top"] = dict(h=hm, vtop=integrate.quad(g, 10, hm, epsabs=0, epsrel=1e-13)[0])
out["solids"] = sol

# 2. random trees
rng = np.random.default_rng(20261112)
trees = []
for k in range(40):
    n_sec = int(rng.integers(2, 9))
    H = float(np.round(rng.uniform(12, 32), 2))
    stump = float(np.round(rng.uniform(0.1, 0.4), 2))
    top_end = float(np.round(rng.uniform(0.55, 0.9) * H, 2))
    ends = np.sort(np.round(rng.uniform(stump, top_end, n_sec - 1), 2))
    ends = np.unique(np.concatenate([[stump], ends, [top_end]]))
    d_base = rng.uniform(18, 60)
    shape = rng.uniform(0.55, 0.85)
    dfun = lambda h, s=shape: d_base * (1 - h / (H + 0.3)) ** s + rng.normal(0, 0.15)
    mids = (ends[:-1] + ends[1:]) / 2
    trip_h = np.empty(2 * len(ends) - 1); trip_h[0::2] = ends; trip_h[1::2] = mids
    trip_d = np.round([dfun(h) for h in trip_h], 1)
    trip_d = np.minimum.accumulate(trip_d)               # non-increasing above the stump (no warnings in the reference)
    de, dm = trip_d[0::2], trip_d[1::2]
    Ls = np.diff(ends)
    smal = float(np.sum((G(de[:-1]) + G(de[1:])) / 2 * Ls))
    hub = float(np.sum(G(dm) * Ls))
    newt = float(np.sum(Ls / 6 * (G(de[:-1]) + 4 * G(dm) + G(de[1:]))))
    stump_v = float(G(de[0]) * stump)
    tops = {name: float(G(de[-1]) * (H - ends[-1]) / (r + 1)) for name, r in [("paraboloid", 1), ("cone", 2), ("neiloid", 3)]}
    rec = dict(H=H, stump=stump, ends=ends.tolist(), mids=mids.tolist(), trip_h=trip_h.tolist(), trip_d=trip_d.tolist(),
               smalian=smal, huber=hub, newton=newt, stump_v=stump_v, tops=tops)
    # merchantable to dTop between the measured points (Smalian on the ends layout): crossing by numpy.interp
    dTop = float(np.round(rng.uniform(de[-1] + 0.5, de[0] - 0.5), 1)) if de[0] - de[-1] > 2 else None
    if dTop is not None:
        hs, ds = ends, de
        i = int(np.argmax(ds < dTop))                     # first boundary below dTop (ds non-increasing)
        hm = float(np.interp(dTop, [ds[i], ds[i - 1]], [hs[i], hs[i - 1]]))
        v = float(np.sum((G(ds[:i - 1]) + G(ds[1:i])) / 2 * np.diff(hs[:i])))
        v += float((G(ds[i - 1]) + G(dTop)) / 2 * (hm - hs[i - 1]))
        rec["merch"] = dict(dTop=dTop, h=hm, smalian=v)
    trees.append(rec)
out["trees"] = trees
(here / "secvol_sv01.json").write_text(json.dumps(out, indent=1))
print("wrote secvol_sv01.json:", len(trees), "trees")
