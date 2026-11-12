"""Reference for the Stand Structure tool, stage SS02: spatial structure (docs/TOOLS_SPEC.md §4.1, §8.3).

Written apart from the JavaScript code: neighbours by scipy.spatial.cKDTree (boxsize for the toroidal case), azimuths by
numpy.arctan2. Definitions as in METHODS §16 (SS02); their sources are not read yet (provisional definition exception).
  - square and hexagonal lattices on a torus: Clark–Evans R = 2 and 2.149139863647 (TOOLS_SPEC §8.3), W = 0 (square, k = 4)
  - random patterns in a rectangle and a circle (numpy default_rng(20261114); NOT real trees): per tree the k nearest
    neighbours, W, M, T, U, distance to the boundary, edge flag, buffer reference set; Clark–Evans R and Donnelly R
  - Poisson simulation: 400 patterns of 50 trees in a 30 × 30 m plot; mean R without correction and with Donnelly's
    expectation (the edge effect makes the plain R larger than 1; Donnelly's correction reduces it)
    python3 tests/ref/make_structure_ss02.py  →  tests/ref/structure_ss02.json
"""
import json
import math
import pathlib

import numpy as np
import scipy
from scipy.spatial import cKDTree

here = pathlib.Path(__file__).parent
rng = np.random.default_rng(20261114)
out = {"numpy": np.__version__, "scipy": scipy.__version__, "seed": 20261114}


def indices(xy, sp, d, k, box=None):
    tree = cKDTree(xy, boxsize=box)
    dist, idx = tree.query(xy, k=k + 1)
    dist, idx = dist[:, 1:], idx[:, 1:]                              # drop the point itself
    a0 = 2 * math.pi / (k + 1)
    W, M, T, U = [], [], [], []
    for i in range(len(xy)):
        dx = xy[idx[i], 0] - xy[i, 0]; dy = xy[idx[i], 1] - xy[i, 1]
        if box is not None:
            dx = (dx + box[0] / 2) % box[0] - box[0] / 2; dy = (dy + box[1] / 2) % box[1] - box[1] / 2
        az = np.sort(np.mod(np.arctan2(dy, dx), 2 * math.pi))
        gaps = np.diff(np.append(az, az[0] + 2 * math.pi)); ang = np.minimum(gaps, 2 * math.pi - gaps)
        W.append(float(np.mean(ang < a0 - 1e-12)))
        M.append(float(np.mean(sp[idx[i]] != sp[i])))
        T.append(float(np.mean(1 - np.minimum(d[idx[i]], d[i]) / np.maximum(d[idx[i]], d[i]))))
        U.append(float(np.mean(~(d[idx[i]] < d[i]))))
    return dist, idx, W, M, T, U


def ce(nn, n, A, P):
    rA = float(np.mean(nn)); rE = 0.5 / math.sqrt(n / A); rED = 0.5 * math.sqrt(A / n) + (0.0514 + 0.041 / math.sqrt(n)) * P / n
    return dict(rA=rA, R=rA / rE, RD=rA / rED)


# 1. lattices on a torus
sq = np.array([[i + 0.5, j + 0.5] for i in range(20) for j in range(20)])
dist, idx, W, *_ = indices(sq, np.zeros(400), np.full(400, 20.0), 4, box=(20, 20))
h = math.sqrt(3) / 2
hx = np.array([[c + (r % 2) * 0.5 + 0.25, r * h + h / 2] for r in range(20) for c in range(20)])
dh, *_ = indices(hx, np.zeros(400), np.full(400, 20.0), 1, box=(20, 20 * h))
out["lattice"] = dict(squareR=ce(dist[:, 0], 400, 400, 80)["R"], squareW=float(np.mean(W)), hexR=float(np.mean(dh[:, 0]) / (0.5 / math.sqrt(400 / (20 * 20 * h)))))

# 2. random patterns
cases = []
for shape in ["rect", "circle", "rect"]:
    n = int(rng.integers(40, 90))
    if shape == "rect":
        geom = dict(shape="rect", x0=0.0, y0=0.0, x1=40.0, y1=25.0); xy = np.column_stack([rng.uniform(0, 40, n), rng.uniform(0, 25, n)])
        A, P = 1000.0, 130.0; bd = np.minimum.reduce([xy[:, 0], 40 - xy[:, 0], xy[:, 1], 25 - xy[:, 1]])
    else:
        geom = dict(shape="circle", cx=0.0, cy=0.0, r=17.84); rr = 17.84 * np.sqrt(rng.uniform(0, 1, n)); th = rng.uniform(0, 2 * math.pi, n)
        xy = np.column_stack([rr * np.cos(th), rr * np.sin(th)]); A, P = math.pi * 17.84 ** 2, 2 * math.pi * 17.84; bd = 17.84 - np.hypot(xy[:, 0], xy[:, 1])
    d = np.round(rng.gamma(5, 5, n), 3); sp = rng.choice(["Ps", "Ab", "Fo"], n)
    dist, idx, W, M, T, U = indices(xy, sp, d, 4)
    ref = bd >= 5.0
    case = dict(geom=geom, x=xy[:, 0].tolist(), y=xy[:, 1].tolist(), dbh=d.tolist(), species=sp.tolist(), idx=idx.tolist(), nn1=dist[:, 0].tolist(),
                W=W, M=M, T=T, U=U, edgeDist=bd.tolist(), edge=(bd < dist[:, -1]).tolist(), ref=ref.tolist(), ce=ce(dist[:, 0], n, A, P),
                ceBuffer=dict(R=float(np.mean(dist[ref, 0])) / (0.5 / math.sqrt(n / A)), W=float(np.mean(np.array(W)[ref]))))
    if shape == "rect":
        dt, it, Wt, Mt, Tt, Ut = indices(xy, sp, d, 4, box=(40, 25))
        case["torus"] = dict(idx=it.tolist(), R=float(np.mean(dt[:, 0])) / (0.5 / math.sqrt(n / A)), W=float(np.mean(Wt)), M=float(np.mean(Mt)), T=float(np.mean(Tt)), U=float(np.mean(Ut)))
    cases.append(case)
out["cases"] = cases

# 3. Poisson simulation: edge effect and Donnelly
sims, Rs, RDs = [], [], []
for _ in range(400):
    xy = np.column_stack([rng.uniform(0, 30, 50), rng.uniform(0, 30, 50)]).round(6); nn = cKDTree(xy).query(xy, k=2)[0][:, 1]
    c = ce(nn, 50, 900.0, 120.0); Rs.append(c["R"]); RDs.append(c["RD"]); sims.append(xy.round(6).tolist())
out["poisson"] = dict(n=50, size=30, sets=sims, meanR=float(np.mean(Rs)), meanRD=float(np.mean(RDs)))
(here / "structure_ss02.json").write_text(json.dumps(out))
print("written", here / "structure_ss02.json", out["lattice"], out["poisson"]["meanR"], out["poisson"]["meanRD"])
