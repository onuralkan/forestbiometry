"""Reference for the stand structure tool, stage SS01: distance-free structure and density measures.

Simulated plots (numpy default_rng(20261114); NOT real measurements), diameters rounded to 0.5 cm so that equal
diameters occur. Every measure is written here separately from the JS code:
  Gini        mean absolute difference / (2 · mean)  (np.abs(x[:, None] − x).mean(); no sorting)
  Shannon     scipy.stats.entropy on class sums (classes by floor((d − start)/width), half-open [lo, hi))
  Simpson     Σ p² on species shares
  moments     scipy.stats.skew / kurtosis with bias=True (divisor n), CV with the n − 1 standard deviation
  BAL         brute-force double loop over trees, × 10000/A (m²/ha); strict d_j > d_i and ties d_j ≥ d_i, j ≠ i
  SDI, S%     closed formulas of TOOLS_SPEC §8.3
    python3 tests/ref/make_structure_ss01.py  →  tests/ref/structure_ss01.json
"""
import json
import math
import pathlib

import numpy as np
import scipy
from scipy import stats

here = pathlib.Path(__file__).parent
rng = np.random.default_rng(20261114)
BA = lambda d: math.pi * d * d / 40000


def plot(pid, area, n, sp):
    d = np.round(rng.weibull(2.2, n) * rng.uniform(15, 35) + rng.uniform(4, 9), 0) / 1
    d = np.round(d * 2) / 2
    s = rng.choice(sp, n, p=rng.dirichlet(np.ones(len(sp))))
    return dict(plot_id=pid, area=area, dbh=[float(x) for x in d], species=[str(x) for x in s])


plots = [plot("P1", 400.0, 37, ["A", "B", "C"]), plot("P2", 500.0, 61, ["A", "B"]), plot("P3", 1000.0, 120, ["A", "B", "C", "D"]),
         plot("P4", 250.0, 9, ["A"])]
SET = [dict(width=5.0, start=0.0), dict(width=2.0, start=8.0), dict(width=4.0, start=6.0)]


def gini_mad(x):
    x = np.asarray(x, float)
    return float(np.abs(x[:, None] - x[None, :]).mean() / (2 * x.mean()))


def shannon(d, w, width, start):
    d = np.asarray(d); k = np.floor((d - start) / width + 1e-12).astype(int)
    keep = d >= start
    sums = {}
    for kk, ww in zip(k[keep], np.asarray(w)[keep]):
        sums[kk] = sums.get(kk, 0.0) + ww
    p = np.array(list(sums.values()))
    H = float(stats.entropy(p)); S = int((p > 0).sum())
    return dict(H=H, S=S, J=H / math.log(S) if S > 1 else None, below=int((~keep).sum()))


def bal(d, ef, ties):
    out = []
    for i, di in enumerate(d):
        s = 0.0
        for j, dj in enumerate(d):
            if j == i:
                continue
            if dj > di or (ties and dj == di):
                s += BA(dj)
        out.append(s * ef)
    return out


cases = []
for P in plots:
    d = np.array(P["dbh"]); g = np.array([BA(x) for x in d]); ef = 10000 / P["area"]; n = len(d)
    dq = math.sqrt((d ** 2).mean()); Nha = n * ef
    sp = {}
    for s_, gg in zip(P["species"], g):
        a = sp.setdefault(s_, [0, 0.0]); a[0] += 1; a[1] += gg
    pn = np.array([v[0] for v in sp.values()]) / n; pg = np.array([v[1] for v in sp.values()]) / g.sum()
    c = dict(plot=P, ef=ef, Nha=Nha, Gha=float(g.sum() * ef), Dq=dq,
             mean=float(d.mean()), sd=float(d.std(ddof=1)), cv=float(d.std(ddof=1) / d.mean()),
             skew=float(stats.skew(d, bias=True)), kurt=float(stats.kurtosis(d, bias=True)),
             gini=gini_mad(g), giniD=gini_mad(d),
             shannon=[dict(**st, weight=wt, **shannon(d, g if wt == "ba" else np.ones(n), st["width"], st["start"])) for st in SET for wt in ("ba", "n")],
             species=dict(k=len(sp), HN=float(stats.entropy(pn)), HG=float(stats.entropy(pg)), simpN=float((pn ** 2).sum()), simpG=float((pg ** 2).sum())),
             balStrict=bal(d, ef, False), balTies=bal(d, ef, True),
             relDq=[float(x / dq) for x in d], relG=[float(x / g.mean()) for x in g],
             sdi=[dict(exp=b, value=Nha * (dq / 25) ** b) for b in (1.605, 1.6, 1.87)])
    cases.append(c)

spec = dict(sdi=800 * (20 / 25) ** 1.605, rsSquare=100 * math.sqrt(10000 / 800) / 20,
            rsTri=100 * math.sqrt(2 * 10000 / (800 * math.sqrt(3))) / 20)
out = dict(generator="tests/ref/make_structure_ss01.py", scipy=scipy.__version__, numpy=np.__version__, seed=20261114,
           note="simulated data, not measurements", sets=SET, cases=cases, spec=spec)
(here / "structure_ss01.json").write_text(json.dumps(out, indent=1))
print("ok", len(cases), spec)
