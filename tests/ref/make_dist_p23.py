"""Reference for the diameter distribution engine, stage P23: empirical basal area diameter distribution (descriptive;
Kangas and Maltamo 2000, §2.2–2.3; docs/DIST_SPEC.md P23).

NumPy only; nothing shared with the JavaScript code:
  - g = π d²/40000; F_N and F_G at the distinct diameters (numpy.unique, cumulative sums)
  - basal-area percentiles: numpy.percentile(d, 100 p, weights = g, method = 'inverted_cdf') (the smallest d with F_G ≥ p)
  - classes: numpy.digitize on the edges; b_k, share, observed ḡ_k and f_k = b_k/ḡ_k, mid-diameter ḡ_k and f_k
Samples: tests/weibull/fixture.json and a sample with tied diameters (NOT real measurements).

    python3 tests/ref/make_dist_p23.py  →  tests/ref/dist_p23.json
"""
import json
import pathlib

import numpy as np

here = pathlib.Path(__file__).parent
FX = json.loads((here.parent / "weibull" / "fixture.json").read_text())["samples"]
P = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1]
SAMPLES = {"w2": FX["w2"], "w3": FX["w3"], "small": FX["small"], "ties": [12, 14, 14, 14, 16, 18, 18, 20, 24, 24, 24, 24, 30, 36, 36]}
CLASSES = {
    "w2": dict(edges=[4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48], area=400.0),          # below 4 and above 48 → tails
    "w3": dict(edges=[8, 12, 16, 20, 30, 40, 50, np.inf], area=None),                     # unequal widths, open last
    "small": dict(edges=[16, 20, 24, 28, 32, 36, 40, 44], area=100.0),
    "ties": dict(edges=[10, 15, 20, 25, 30, 35, 40], area=250.0),
}
out = {"numpy": np.__version__, "probs": P, "samples": SAMPLES, "cases": []}
for name, d in SAMPLES.items():
    d = np.array(d, float); g = np.pi * d ** 2 / 40000; G = g.sum()
    x, inv = np.unique(d, return_inverse=True)
    FN = np.cumsum(np.bincount(inv)) / len(d); FG = np.cumsum(np.bincount(inv, weights=g)) / G
    pct = np.percentile(d, [100 * p for p in P], weights=g, method="inverted_cdf")
    C = CLASSES[name]; e = np.array(C["edges"], float); k = 10000 / C["area"] if C["area"] else 1.0
    j = np.digitize(d, e) - 1                                     # class j: e[j] ≤ d < e[j+1]
    rows = []
    for c in range(len(e) - 1):
        m = j == c; n = int(m.sum()); b = g[m].sum() * k
        mid = None if np.isinf(e[c + 1]) else (e[c] + e[c + 1]) / 2
        gm = None if mid is None else np.pi * mid ** 2 / 40000
        rows.append(dict(lo=e[c], hi=None if np.isinf(e[c + 1]) else e[c + 1], n=n, b=b, share=g[m].sum() / G,
                         gObs=(g[m].mean() if n else None), fObs=(b / g[m].mean() if n else 0.0), fMid=(None if gm is None else b / gm)))
    lo, hi = d < e[0], d >= e[-1]
    out["cases"].append(dict(sample=name, edges=[None if np.isinf(v) else v for v in e], area=C["area"], N=len(d), G=G, x=x.tolist(), FN=FN.tolist(), FG=FG.tolist(),
                             pct=pct.tolist(), rows=rows, below=dict(n=int(lo.sum()), b=g[lo].sum() * k), above=dict(n=int(hi.sum()), b=g[hi].sum() * k)))
(here / "dist_p23.json").write_text(json.dumps(out, indent=1))
print("written", here / "dist_p23.json")
