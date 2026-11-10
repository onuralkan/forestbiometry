"""Independent reference for dominant diameter / height (D0, H0) and plot age in Plot & Stand Metrics.

Definition (user, 10 Nov 2026): mean of the 100 largest trees per hectare, "largest" by diameter or by height.
This script works in stems per hectare instead of tree weights: every tree stands for ef = 10000 / A stems/ha;
the stems are taken from the largest down until 100 stems/ha are filled. A tie group (equal ranking value) is
filled as a whole and shares what is left equally. numpy only; no code shared with assets/lab/stand/calc.js.

    python3 tests/ref/make_stand_dominant_reference.py   →  tests/ref/stand_dominant.json
"""
import json
import pathlib

import numpy as np

OUT = pathlib.Path(__file__).with_name("stand_dominant.json")
rng = np.random.default_rng(20261110)


def dom(dbh, h, area, by):
    dbh, h = np.asarray(dbh, float), np.asarray(h, float)
    if dbh.size == 0:
        return None, None
    key = dbh if by == "dbh" else h
    if np.isnan(key).any():
        return None, None
    ef = 1e4 / area
    vals, inv = np.unique(-key, return_inverse=True)         # groups from the largest down
    need = 100.0                                             # stems per hectare still to fill
    stems = np.zeros(dbh.size)
    for g in range(vals.size):
        members = np.flatnonzero(inv == g)
        cap = members.size * ef
        take = min(need, cap)
        stems[members] = take / members.size
        need -= take
        if need <= 0:
            break
    sel = stems > 0
    D0 = float(np.sum(stems * dbh) / np.sum(stems))
    H0 = None if np.isnan(h[sel]).any() else float(np.sum(stems[sel] * h[sel]) / np.sum(stems[sel]))
    return D0, H0


cases = []
# fixed hand-made cases
cases.append(dict(name="k=12.5 no ties", area=1250, dbh=list(range(20, 40)), h=[10 + 0.5 * i for i in range(20)], age=[80] * 20))
cases.append(dict(name="k=5.3 tie at boundary", area=530, dbh=[40, 38, 36, 35, 34, 34, 34, 30, 20], h=[20, 19, 18, 18, 17.5, 16, 15, 14, 12], age=[90, None, 92, None, None, 95, None, None, None]))
cases.append(dict(name="k=3.15", area=315, dbh=[31, 45, 28, 45, 22, 50], h=[15, 21, 14, 19, 12, 22], age=[60] * 6))
cases.append(dict(name="short plot (fewer trees than k)", area=1800, dbh=[30, 25, 20], h=[15, 13, 11], age=[None, None, None]))
cases.append(dict(name="tallest are not the thickest", area=400, dbh=[50, 48, 30, 29, 28, 20], h=[18, 17, 24, 23, 22, 10], age=[100, 100, 100, 100, 100, 100]))
cases.append(dict(name="missing height off the dominant set", area=400, dbh=[50, 48, 46, 44, 20], h=[21, 20, 19, 18, None], age=[70] * 5))
cases.append(dict(name="missing height inside the dominant set", area=400, dbh=[50, 48, 46, 44, 20], h=[21, None, 19, 18, 15], age=[70] * 5))
cases.append(dict(name="all equal diameters", area=700, dbh=[30] * 10, h=[10, 11, 12, 13, 14, 15, 16, 17, 18, 19], age=[50] * 10))
cases.append(dict(name="k below one (50 m²)", area=50, dbh=[12, 30, 25], h=[8, 16, 14], age=[40, 40, 40]))
# random plots like field data
for i in range(40):
    area = float(rng.choice([250, 300, 315, 400, 450, 500, 530, 600, 700, 800, 1000, 1150, 1250, 1500, 1800]))
    n = int(rng.integers(3, 45))
    dbh = np.round(rng.gamma(9, 3.5, n) + 7, 1)
    if i % 5 == 0:                                           # force ties
        dbh[: n // 2] = np.round(dbh[: n // 2])
    h = np.round(1.3 + 25 * (1 - np.exp(-0.04 * dbh)) + rng.normal(0, 1.5, n), 1)
    h = np.maximum(h, 2.0)
    hh = [float(x) for x in h]
    if i % 7 == 3:
        hh[int(rng.integers(0, n))] = None
    ages = [float(a) if rng.random() < 0.6 else None for a in rng.integers(40, 140, n)]
    cases.append(dict(name=f"random {i}", area=area, dbh=[float(x) for x in dbh], h=hh, age=ages))

for c in cases:
    hn = np.array([np.nan if x is None else x for x in c["h"]], float)
    c["k"] = 100 * c["area"] / 1e4
    for by in ("dbh", "height"):
        D0, H0 = dom(c["dbh"], hn, c["area"], by)
        c[f"D0_{by}"], c[f"H0_{by}"] = D0, H0
    a = [x for x in c["age"] if x is not None]
    c["age_mean"], c["age_n"] = (float(np.mean(a)) if a else None), len(a)
    hm = hn[~np.isnan(hn)]
    c["hm"] = float(hm.mean()) if hm.size else None
    c["dm"] = float(np.mean(c["dbh"]))
    c["dq"] = float(np.sqrt(np.mean(np.square(c["dbh"]))))
    c["N"] = len(c["dbh"]) * 1e4 / c["area"]
    c["BA"] = float(np.sum(np.pi * np.square(c["dbh"]) / 40000) * 1e4 / c["area"])

OUT.write_text(json.dumps({"numpy": np.__version__, "cases": cases}, indent=1))
print("wrote", OUT, len(cases), "cases")
