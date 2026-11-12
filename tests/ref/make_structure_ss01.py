"""Reference for the Stand Structure tool, stage SS01: non-spatial structure and density (docs/TOOLS_SPEC.md §4.1, §8.3).

NumPy/SciPy only; written apart from the JavaScript code:
  - weighted moments with numpy (divisor Σw); unweighted cross-check with scipy.stats.skew/kurtosis (bias=True)
  - Gini: double loop over all ordered pairs, Σ_i Σ_j w_i w_j |x_i − x_j| / (2 W² x̄)  (the JS uses the sorted form)
  - Shannon: scipy.stats.entropy (natural log); Simpson 1 − Σp²
  - BAL: brute-force double loop, equal diameters excluded and included
  - SDI (Reineke 1933), RD (Curtis 1982), relative spacing; DIST_SPEC-style table values of TOOLS_SPEC §8.3
  - simulated plots (numpy default_rng(20261113); NOT real measurements): per plot × period N/ha, G/ha, Dq, H0 (the
    100 thickest trees per hectare, fractional last tree), class shares, species shares, all measures
    python3 tests/ref/make_structure_ss01.py  →  tests/ref/structure_ss01.json
"""
import json
import math
import pathlib

import numpy as np
import scipy
from scipy import stats

here = pathlib.Path(__file__).parent
rng = np.random.default_rng(20261113)
out = {"numpy": np.__version__, "scipy": scipy.__version__, "seed": 20261113}
G = lambda d: math.pi / 4 * (d / 100) ** 2


def wmom(x, w):
    x, w = np.asarray(x, float), np.asarray(w, float); W = w.sum(); m = (w * x).sum() / W
    m2, m3, m4 = [(w * (x - m) ** k).sum() / W for k in (2, 3, 4)]
    return dict(mean=m, sd=math.sqrt(m2), cv=math.sqrt(m2) / m, skew=m3 / m2 ** 1.5, kurt=m4 / m2 ** 2 - 3)


def gini_pairs(x, w):
    W = sum(w); mean = sum(a * b for a, b in zip(w, x)) / W
    s = sum(wi * wj * abs(xi - xj) for xi, wi in zip(x, w) for xj, wj in zip(x, w))
    return s / (2 * W * W * mean)


def bal_brute(d, w, ties):
    return [sum(w[j] * G(d[j]) for j in range(len(d)) if j != i and (d[j] > d[i] or (ties == "include" and d[j] == d[i]))) for i in range(len(d))]


# 1. generic functions on random weighted data (unequal weights) and with ties
gen = []
for k in range(4):
    n = [7, 25, 60, 12][k]
    x = np.round(rng.gamma(4, 5, n), 0 if k == 3 else 1)          # k = 3: many ties
    w = rng.uniform(0.5, 3, n) if k % 2 else np.ones(n)
    row = dict(x=x.tolist(), w=w.tolist(), moments=wmom(x, w), gini=gini_pairs(x.tolist(), w.tolist()),
               bal_ex=bal_brute(x.tolist(), w.tolist(), "exclude"), bal_in=bal_brute(x.tolist(), w.tolist(), "include"))
    if k % 2 == 0:
        row["scipy"] = dict(skew=float(stats.skew(x, bias=True)), kurt=float(stats.kurtosis(x, fisher=True, bias=True)), cv=float(np.std(x) / np.mean(x)))
    p = rng.dirichlet(np.ones(5)); row["p"] = p.tolist(); row["shannon"] = float(stats.entropy(p)); row["simpson"] = float(1 - (p ** 2).sum())
    gen.append(row)
out["generic"] = gen
out["gini_limits"] = dict(equal=gini_pairs([5, 5, 5, 5], [1] * 4), one=gini_pairs([0, 0, 0, 10], [1] * 4))   # 0 and 1 − 1/n

# 2. TOOLS_SPEC §8.3 and the density formulas
out["density"] = dict(sdi=800 * (20 / 25) ** 1.605, sdi254=800 * (20 / 25.4) ** 1.605, hartSquare=100 * math.sqrt(10000 / 800) / 20,
                      hartTri=100 * math.sqrt(2 * 10000 / (800 * math.sqrt(3))) / 20, rd05=30 / 20 ** 0.5, rd04=30 / 20 ** 0.4)

# 3. simulated plots: plot × period units with species, heights (all measured), fixed areas
plots = [("P1", 400.0), ("P2", 1250.0), ("P3", 600.0)]
trees, row = [], 2
for pid, area in plots:
    for per in ["2020", "2025"]:
        n = int(rng.integers(12, 40))
        d = np.round(rng.weibull(2.2, n) * 22 + 6, 1)
        h = np.round(1.3 + 28 * (1 - np.exp(-0.05 * d)) ** 1.2 + rng.normal(0, 0.8, n), 1)
        spp = rng.choice(["Ps", "Ab", "Fo"], n, p=[0.6, 0.3, 0.1])
        for i in range(n):
            trees.append(dict(row=row, plot_id=pid, tree_id=str(i + 1), period=per, species=str(spp[i]), dbh=float(d[i]), height=float(h[i]))); row += 1
out["dataset"] = dict(plots=[dict(plot_id=p, plot_area=a) for p, a in plots], trees=trees)


def h0(ds, area):
    """mean height of the 100 thickest trees per hectare; the last one with a fractional weight (no ties assumed)"""
    k = 100 * area / 10000; s = sorted(ds, key=lambda t: -t["dbh"]); left, sw, sh = k, 0.0, 0.0
    for t in s:
        if left <= 0: break
        wt = min(1.0, left); sw += wt; sh += wt * t["height"]; left -= wt
    return sh / sw


units = []
for pid, area in plots:
    for per in ["2020", "2025"]:
        T = [t for t in trees if t["plot_id"] == pid and t["period"] == per]
        d = np.array([t["dbh"] for t in T]); ef = 10000 / area; w = np.full(len(d), ef)
        N, Gha = len(d) * ef, sum(G(x) for x in d) * ef; Dq = math.sqrt((d ** 2).mean()); H0 = h0(T, area)
        edges = np.arange(0, math.ceil(d.max() / 4) * 4 + 4, 4.0)                 # 4 cm classes from 0, last open
        cnt = np.histogram(d, np.append(edges, np.inf))[0]; pc = cnt / cnt.sum()
        sp = {}
        for t in T: sp[t["species"]] = sp.get(t["species"], 0) + 1
        ps = np.array(sorted(sp.values(), reverse=True), float) / len(T)
        gi = [G(x) for x in d]
        units.append(dict(plot_id=pid, period=per, Nha=N, Gha=Gha, Dq=Dq, H0=H0, moments=wmom(d, w), gini_g=gini_pairs(gi, w.tolist()), gini_d=gini_pairs(d.tolist(), w.tolist()),
                          shannonD=float(stats.entropy(pc[pc > 0])), shannonSp=float(stats.entropy(ps)), simpson=float(1 - (ps ** 2).sum()),
                          sdi=N * (Dq / 25) ** 1.605, rd=Gha / Dq ** 0.5, hartSquare=100 * math.sqrt(10000 / N) / H0, hartTri=100 * math.sqrt(2 * 10000 / (N * math.sqrt(3))) / H0,
                          bal=bal_brute(d.tolist(), w.tolist(), "exclude"), relD=(d / Dq).tolist(), relG=(np.array(gi) / np.mean(gi)).tolist()))
out["units"] = units
(here / "structure_ss01.json").write_text(json.dumps(out, indent=1))
print("written", here / "structure_ss01.json")
