"""Reference for product bucking, stage SV-06/a1 (TOOLS_SPEC TP03): exhaustive search over every cut sequence.

Written apart from the JavaScript code (assets/lab/taper/bucking.js): the taper profiles are written again here
(Max and Burkhart 1976 Model 4; Kozak 2004 Model 02), volumes by scipy.integrate.quad, the usable top by a sign scan
refined with scipy.optimize.brentq. On the grid of step 0.5 m from the stump cut, EVERY sequence of moves is
enumerated (a move is one step of waste or one product piece of length + trim whose top diameter is not below the
product's minimum and whose top is inside the usable stem); the best total value (and the best total volume) is the
maximum over all sequences, with no recursion shared with the JavaScript dynamic programming. The priority (greedy)
method is replayed by its rule. Usable stems are at most 8 m (TP03 acceptance).
Coefficients: Max and Burkhart Table 3 (plantation, natural; test values only, never shipped with the site, K1) and an
arbitrary Kozak set (as in make_taper_sv02a2.py); products and values are ARBITRARY test values, not prices.
    python3 tests/ref/make_bucking_sv06.py  ->  tests/ref/bucking_sv06.json
"""
import json
import math
import pathlib

import numpy as np
import scipy
from scipy.integrate import quad
from scipy.optimize import brentq

here = pathlib.Path(__file__).parent
rng = np.random.default_rng(20261118)
STEP = 0.5
MB = {"plantation": dict(b1=-3.0257, b2=1.4586, b3=-1.4464, b4=39.1081, a1=0.7431, a2=0.1125),
      "natural": dict(b1=-4.2844, b2=2.0870, b3=-2.3287, b4=86.7575, a1=0.7965, a2=0.0884)}
KOZAK = dict(a0=1.0, a1=0.95, a2=0.02, b1=0.4, b2=-0.3, b3=0.45, b4=1.5, b5=0.05, b6=-0.25)


def d_mb(p, D, H, h):
    x = h / H
    y = p["b1"] * (x - 1) + p["b2"] * (x * x - 1) + (p["b3"] * (p["a1"] - x) ** 2 if x <= p["a1"] else 0) + (p["b4"] * (p["a2"] - x) ** 2 if x <= p["a2"] else 0)
    return D * math.sqrt(max(y, 0.0))


def d_kozak(p, D, H, h):
    z = h / H
    X = (1 - z ** (1 / 3)) / (1 - (1.3 / H) ** (1 / 3))
    Q = 1 - z ** (1 / 3)
    E = p["b1"] * z ** 4 + p["b2"] / math.exp(D / H) + p["b3"] * X ** 0.1 + p["b4"] / D + p["b5"] * H ** Q + p["b6"] * X
    return p["a0"] * D ** p["a1"] * H ** p["a2"] * (0.0 if X == 0 else X ** E)


class Tree:
    def __init__(self, form, p, D, H):
        self.d = (lambda h: d_mb(p, D, H, h)) if form == "mb76" else (lambda h: d_kozak(p, D, H, h))
        self.pts = [a * H for a in (p["a1"], p["a2"])] if form == "mb76" else []
        self.H = H
        self.cache = {}

    def vol(self, h1, h2):
        key = (round(h1, 12), round(h2, 12))
        if key not in self.cache:
            pts = [t for t in self.pts if h1 < t < h2]
            v, _ = quad(lambda h: self.d(h) ** 2, h1, h2, points=pts or None, epsabs=0, epsrel=1e-13, limit=500)
            self.cache[key] = math.pi / 40000 * v
        return self.cache[key]

    def top(self, stump, dtop):
        """Highest height above the stump where d = dtop (sign scan + brentq)."""
        if dtop is None: return self.H
        if self.d(stump) < dtop: return stump
        g = lambda h: self.d(h) - dtop
        hs = np.linspace(stump, self.H, 40001); v = [g(h) for h in hs]; roots = []
        for i in range(len(hs) - 1):
            if v[i] == 0: roots.append(float(hs[i]))
            elif v[i] * v[i + 1] < 0: roots.append(brentq(g, hs[i], hs[i + 1], xtol=1e-14, rtol=1e-15))
        return roots[-1] if roots else stump


def moves(products):
    """(product index, nominal L, steps) in priority order, longest length first."""
    order = sorted(range(len(products)), key=lambda i: (products[i]["priority"], i))
    out = []
    for i in order:
        p = products[i]
        Ls = [p["L"]] if p["Lmax"] is None else [round(p["L"] + k * p["Lstep"], 10) for k in range(int(math.floor((p["Lmax"] - p["L"]) / p["Lstep"] + 1e-9)) + 1)]
        for L in sorted(Ls, reverse=True):
            out.append((i, L, int(round((L + p["trim"] / 100) / STEP))))
    return out


def solve(tree, stump, dtop, products):
    htop = tree.top(stump, dtop)
    M = int(math.floor((htop - stump) / STEP + 1e-9))
    hs = [stump + j * STEP for j in range(M + 1)]
    dj = [tree.d(h) for h in hs]
    mv = moves(products)
    best = {"value": -1.0, "volume": -1.0}
    count = 0

    def walk(j, val, vol):
        nonlocal count
        if j == M:
            count += 1
            best["value"] = max(best["value"], val); best["volume"] = max(best["volume"], vol)
            return
        walk(j + 1, val, vol)                       # one step of waste
        for i, L, k in mv:
            if j + k <= M and dj[j + k] >= products[i]["dMin"]:
                v = tree.vol(hs[j], hs[j + k])
                walk(j + k, val + products[i]["value"] * v, vol + v)

    walk(0, 0.0, 0.0)
    # priority: at each position the first move that fits; stop when none fits
    j, greedy = 0, []
    while True:
        hit = next(((i, L, k) for i, L, k in mv if j + k <= M and dj[j + k] >= products[i]["dMin"]), None)
        if hit is None: break
        i, L, k = hit
        greedy.append(dict(product=i, L=L, h1=hs[j], h2=hs[j + k], dSmall=dj[j + k], V=tree.vol(hs[j], hs[j + k])))
        j += k
    return dict(hTop=htop, M=M, sequences=count, best_value=best["value"], best_volume=best["volume"], greedy=greedy,
                total=tree.vol(0, tree.H), stump_v=tree.vol(0, stump), usable=tree.vol(stump, htop) if htop > stump else 0.0)


def product_sets():
    """Two arbitrary product lists (inside or outside bark as the set): fixed and variable lengths, trims on the grid."""
    a = [dict(id="saw", name="saw log", dMin=14.0, L=3.0, Lmax=None, Lstep=None, trim=0, priority=1, value=100.0),
         dict(id="short", name="short log", dMin=10.0, L=1.5, Lmax=2.5, Lstep=0.5, trim=50, priority=2, value=70.0),
         dict(id="pulp", name="pulpwood", dMin=5.0, L=2.0, Lmax=None, Lstep=None, trim=0, priority=3, value=30.0)]
    b = [dict(id="veneer", name="veneer", dMin=18.0, L=2.0, Lmax=None, Lstep=None, trim=50, priority=1, value=180.0),
         dict(id="saw", name="saw log", dMin=12.0, L=2.0, Lmax=4.0, Lstep=0.5, trim=0, priority=2, value=95.0),
         dict(id="pulp", name="pulpwood", dMin=6.0, L=1.0, Lmax=3.0, Lstep=1.0, trim=0, priority=3, value=25.0)]
    return {"A": a, "B": b}


sets = [("mb76", "plantation", MB["plantation"]), ("mb76", "natural", MB["natural"]), ("kozak02", "arbitrary", KOZAK)]
PS = product_sets()
cases = []
for form, name, p in sets:
    for k in range(6):
        D = float(np.round(rng.uniform(16, 34), 1)); H = float(np.round(rng.uniform(6.0, 8.3), 2))
        stump = 0.3; dtop = None if k % 3 == 0 else float(np.round(rng.uniform(3, 7), 1))
        for pname, prods in PS.items():
            tree = Tree(form, p, D, H)
            r = solve(tree, stump, dtop, prods)
            cases.append(dict(form=form, set=name, params=p, D=D, H=H, stump=stump, dTop=dtop, step=STEP, products=pname, **r))

json.dump({"source": "tests/ref/make_bucking_sv06.py", "scipy": scipy.__version__, "step": STEP, "products": PS, "cases": cases},
          open(here / "bucking_sv06.json", "w"), indent=1)
print(len(cases), "cases; sequences per case:", min(c["sequences"] for c in cases), "to", max(c["sequences"] for c in cases))
