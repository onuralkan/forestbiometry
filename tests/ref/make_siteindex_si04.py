"""Reference for the site index tool, stage SI04: series-level bootstrap (TOOLS_SPEC SI04).

Uses the simulated series of tests/ref/siteindex_si03.json. The resampling order is the same as in the tool: one
mulberry32 stream (same generator as tests/ref/make_hd_reference.py), replicate after replicate, k draws floor(r·k).
Pairs are rebuilt by code written separately from the JS, each replicate is fitted with scipy.optimize.least_squares
('lm') from the full-data estimate; percentile intervals with numpy.quantile(method='linear') (= type 7).
    python3 tests/ref/make_siteindex_si04.py  →  tests/ref/siteindex_si04.json
"""
import json
import pathlib

import numpy as np
import scipy
from scipy import optimize

here = pathlib.Path(__file__).parent
SRC = json.loads((here / "siteindex_si03.json").read_text())


def mulberry32(seed):
    a = seed & 0xFFFFFFFF
    def imul(x, y): return (x * y) & 0xFFFFFFFF
    def nxt():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = imul(t ^ (t >> 15), t | 1)
        t ^= (t + imul(t ^ (t >> 7), t | 61)) & 0xFFFFFFFF
        t &= 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return nxt


L = lambda b1, A: np.log1p(-np.exp(-b1 * A))
F = {"cr.ada.b0": lambda th, A1, H1, A2: H1 * np.exp(th[1] * (L(th[0], A2) - L(th[0], A1))),
     "cr.ada.b2": lambda th, A1, H1, A2: th[0] * np.exp(np.log(H1 / th[0]) * L(th[1], A2) / L(th[1], A1)),
     "schu.ada": lambda th, A1, H1, A2: H1 * np.exp(th[0] * (1 / A2 - 1 / A1))}


def pairs(series, mode):
    P = []
    for s in series:
        p = sorted(s["points"], key=lambda q: q["A"])
        for i in range(len(p)):
            for j in range(i + 1, len(p)):
                if (mode == "consecutive" and j != i + 1) or (mode == "first" and i != 0) or not p[j]["A"] > p[i]["A"]:
                    continue
                P.append((p[i]["A"], p[i]["H"], p[j]["A"], p[j]["H"]))
    return np.array(P)


def fit(form, P, start):
    r = optimize.least_squares(lambda th: F[form](th, P[:, 0], P[:, 1], P[:, 2]) - P[:, 3], start, method="lm", xtol=1e-15, ftol=1e-15, gtol=1e-15, max_nfev=100000)
    return r.x


B, SEED, LEVEL, A0 = 40, 7, 0.95, 50.0
POINTS = [(30.0, 15.0), (60.0, 24.0)]
out = {"scipy": scipy.__version__, "numpy": np.__version__, "B": B, "seed": SEED, "level": LEVEL, "baseAge": A0, "points": POINTS, "cases": []}
for form, mode in [("cr.ada.b0", "consecutive"), ("cr.ada.b2", "first"), ("schu.ada", "all")]:
    ser = SRC["forms"][form]["series"]; k = len(ser)
    full = fit(form, pairs(ser, mode), SRC["start"][form])
    r = mulberry32(SEED)
    idx = [[int(np.floor(r() * k)) for _ in range(k)] for _ in range(B)]
    thetas = []
    for ix in idx:
        rs = [ser[i] for i in ix]
        thetas.append(fit(form, pairs(rs, mode), full).tolist())
    T = np.array(thetas); a = (1 - LEVEL) / 2
    si = []
    for A, H in POINTS:
        v = np.sort([F[form](th, A, H, A0) for th in T])
        si.append(dict(A=A, H=H, est=float(F[form](full, A, H, A0)), lo=float(np.quantile(v, a, method="linear")), hi=float(np.quantile(v, 1 - a, method="linear"))))
    out["cases"].append(dict(form=form, pairing=mode, full=full.tolist(), idx_first=idx[:3], thetas=thetas,
                             lo=np.quantile(T, a, axis=0, method="linear").tolist(), hi=np.quantile(T, 1 - a, axis=0, method="linear").tolist(), sd=T.std(axis=0, ddof=1).tolist(), si=si))
(here / "siteindex_si04.json").write_text(json.dumps(out, indent=1))
print("wrote siteindex_si04.json")
