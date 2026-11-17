"""Reference for tree age and increment (TM-05/a1), computed apart from assets/lab/tree/age.js with exact fractions.

- Stand mean ages (Graves 1906 §140) for random groups: arithmetic, number-weighted, basal-area-weighted and
  Smalian's volume formula, in fractions.Fraction (exact), then as floats.
- Growth percents (Graves §172, §174) with the past, present and mean (Pressler) principals, and Pressler's
  diameter form, exactly.
- Increment cores: random ring widths (mm), diameter, bark and years to breast height; the past diameters by
  explicit summation in Fraction.
Random values (numpy default_rng(20261120)); no field data.
    python3 tests/ref/make_age_tm05.py  ->  tests/ref/age_tm05.json
"""
import json
import pathlib
from fractions import Fraction as Fr

import numpy as np

here = pathlib.Path(__file__).parent
rng = np.random.default_rng(20261120)
f = lambda x: Fr(repr(float(x)))   # exact value of the decimal text written to JSON
stands = []
for k in range(30):
    m = int(rng.integers(1, 8))
    g = [dict(a=round(float(rng.uniform(20, 140)), 1), n=int(rng.integers(1, 60)), b=round(float(rng.uniform(0.05, 9)), 4), v=round(float(rng.uniform(0.5, 120)), 3)) for _ in range(m)]
    A = [f(x["a"]) for x in g]
    res = dict(arithmetic=sum(A) / len(A),
               number=sum(x["n"] * a for x, a in zip(g, A)) / sum(x["n"] for x in g),
               basal=sum(f(x["b"]) * a for x, a in zip(g, A)) / sum(f(x["b"]) for x in g),
               volume=sum(f(x["v"]) for x in g) / sum(f(x["v"]) / a for x, a in zip(g, A)))
    stands.append(dict(groups=g, **{k2: float(v) for k2, v in res.items()}))
growth = []
for k in range(40):
    V, v, n = round(float(rng.uniform(1, 100)), 4), round(float(rng.uniform(0.2, 1)) * 0, 4), int(rng.integers(1, 21))
    v = round(V * float(rng.uniform(0.3, 0.98)), 4)
    FV, Fv = f(V), f(v)
    growth.append(dict(V=V, v=v, n=n, past=float(100 * (FV - Fv) / (Fv * n)), present=float(100 * (FV - Fv) / (FV * n)),
                       mean=float(Fr(200, n) * (FV - Fv) / (FV + Fv)), pressler_d=float(Fr(200, n) * (FV ** 2 - Fv ** 2) / (FV ** 2 + Fv ** 2))))
cores = []
for k in range(25):
    r = int(rng.integers(5, 90))
    w = [round(float(x), 2) for x in rng.uniform(0.3, 6.0, r)]
    bark = round(float(rng.uniform(0, 3)), 1)
    D = round(float(2 * sum(w) / 10 + bark + rng.uniform(0, 0.4)), 1)
    y = int(rng.integers(0, 12))
    dib = f(D) - f(bark)
    cum, ds = Fr(0), [float(dib)]
    for x in w:
        cum += f(x) / 10
        ds.append(float(dib - 2 * cum))
    cores.append(dict(widths=w, D=D, bark=bark, yearsToBh=y, ageNow=r + y, d=ds))
json.dump({"source": "tests/ref/make_age_tm05.py", "stands": stands, "growth": growth, "cores": cores}, open(here / "age_tm05.json", "w"), indent=1)
print(len(stands), "stands,", len(growth), "growth pairs,", len(cores), "cores")
