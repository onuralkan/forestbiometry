"""Reference for the Stand Structure tool, SS-07/a1 (TOOLS_SPEC SS03): Hegyi competition index.

Brute-force double loop over all pairs (no neighbour search), written apart from the JavaScript code; toroidal distances
by the minimum image. Definition as in METHODS §16 (SS-07): CI_i = Σ_j (d_j/d_i)/dist_ij over the trees within R or the
k nearest; source Hegyi (1974) not read yet (provisional definition exception).
Random patterns (numpy default_rng(20261115); NOT real trees) in a rectangle and a circle.
    python3 tests/ref/make_structure_ss07.py  →  tests/ref/structure_ss07.json
"""
import json
import math
import pathlib

import numpy as np

here = pathlib.Path(__file__).parent
rng = np.random.default_rng(20261115)


def dist(a, b, box):
    dx, dy = abs(a[0] - b[0]), abs(a[1] - b[1])
    if box:
        dx, dy = min(dx, box[0] - dx), min(dy, box[1] - dy)
    return math.hypot(dx, dy)


def hegyi(xy, d, mode, par, box=None):
    n = len(d); out = []
    for i in range(n):
        ds = sorted((dist(xy[i], xy[j], box), j) for j in range(n) if j != i)
        comp = [(r, j) for r, j in ds if r <= par] if mode == "radius" else ds[:par]
        out.append(sum(d[j] / d[i] / r for r, j in comp))
    return out


cases = []
for shape in ["rect", "circle"]:
    n = 70
    if shape == "rect":
        geom = dict(shape="rect", x0=0.0, y0=0.0, x1=40.0, y1=30.0); xy = np.column_stack([rng.uniform(0, 40, n), rng.uniform(0, 30, n)])
        bd = np.minimum.reduce([xy[:, 0], 40 - xy[:, 0], xy[:, 1], 30 - xy[:, 1]]); box = (40.0, 30.0)
    else:
        geom = dict(shape="circle", cx=0.0, cy=0.0, r=17.84); rr = 17.84 * np.sqrt(rng.uniform(0, 1, n)); th = rng.uniform(0, 2 * math.pi, n)
        xy = np.column_stack([rr * np.cos(th), rr * np.sin(th)]); bd = 17.84 - np.hypot(xy[:, 0], xy[:, 1]); box = None
    d = np.round(rng.gamma(5, 5, n), 1) + 1
    c = dict(geom=geom, x=xy[:, 0].tolist(), y=xy[:, 1].tolist(), dbh=d.tolist(), edgeDist=bd.tolist(),
             knn4=hegyi(xy, d, "knn", 4), knn6=hegyi(xy, d, "knn", 6), r6=hegyi(xy, d, "radius", 6.0), r6n=[sum(1 for j in range(n) if j != i and dist(xy[i], xy[j], None) <= 6.0) for i in range(n)],
             buffer=(bd >= 5.0).tolist())
    if box:
        c["torus_r6"] = hegyi(xy, d, "radius", 6.0, box); c["torus_knn4"] = hegyi(xy, d, "knn", 4, box)
    cases.append(c)
(here / "structure_ss07.json").write_text(json.dumps(dict(numpy=np.__version__, seed=20261115, cases=cases)))
print("written", here / "structure_ss07.json")
