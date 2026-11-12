"""Sample data of the Stand Structure tool (SIMULATED, not real measurements): assets/lab/structure/ornek/ornek-mescere.csv.

Three circular plots of 500 m² (radius √(500/π) = 12.616 m, coordinates in m from the plot centre), one period:
a regular-ish young stand, a clustered mixed stand and a random stand with large trees. Species codes are placeholders
(A, B, C), not real species; diameters and heights are drawn from simple distributions only to give the indices
something to show.
    python3 tests/ref/make_structure_sample.py
"""
import math
import pathlib

import numpy as np

rng = np.random.default_rng(20261116)
R = math.sqrt(500 / math.pi)
out = pathlib.Path(__file__).parents[2] / "assets" / "lab" / "structure" / "ornek" / "ornek-mescere.csv"


def inside(n, fn):
    pts = []
    while len(pts) < n:
        x, y = fn()
        if math.hypot(x, y) <= R - 0.05:
            pts.append((x, y))
    return pts


rows = ["alan,agac,tur,cap,boy,x,y,alan_buyuklugu"]
# 1. regular-ish: jittered grid, one species
g = [(x + rng.normal(0, 0.35), y + rng.normal(0, 0.35)) for x in np.arange(-11, 12, 2.4) for y in np.arange(-11, 12, 2.4)]
p1 = [(x, y) for x, y in g if math.hypot(x, y) <= R - 0.05]
# 2. clustered, mixed
cent = [(rng.uniform(-8, 8), rng.uniform(-8, 8)) for _ in range(5)]
p2 = inside(45, lambda: (lambda c: (c[0] + rng.normal(0, 1.6), c[1] + rng.normal(0, 1.6)))(cent[rng.integers(0, 5)]))
# 3. random, fewer and larger trees
p3 = inside(30, lambda: (rng.uniform(-R, R), rng.uniform(-R, R)))
for pid, pts, dpar, sp in [("1", p1, (6, 2.8), ["A"]), ("2", p2, (4, 5.0), ["A", "B", "C"]), ("3", p3, (8, 4.5), ["A", "B"])]:
    for i, (x, y) in enumerate(pts, start=1):
        d = round(float(rng.gamma(*dpar)) + 7, 1)
        h = round(1.3 + 30 * (1 - math.exp(-0.045 * d)) ** 1.3 + float(rng.normal(0, 0.9)), 1)
        rows.append(f"{pid},{i},{rng.choice(sp)},{d},{h},{x:.2f},{y:.2f},500")
out.write_text("\n".join(rows) + "\n")
print("written", out, len(rows) - 1, "trees")
