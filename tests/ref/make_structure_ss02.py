"""Reference for the stand structure tool, stage SS02: spatial structure measures.

Simulated Poisson plots (numpy default_rng(20261115); NOT real measurements). Written separately from the JS code:
neighbours with scipy.spatial.cKDTree (periodic boundaries with its `boxsize` argument for the torus), directions with
numpy.arctan2 of minimum-image differences. Definitions (METHODS §16, SS02):
  Clark–Evans  R = mean NN distance / (0.5·sqrt(A/N)); Donnelly E = 0.5·sqrt(A/N) + 0.0514·P/N + 0.041·P/N^1.5 (Dixon 2002)
  W  (1/k)·#{adjacent-direction angles α < α0}, α = min(θ, 360 − θ)        (Pommerening 2002; Li et al. 2024, α0 = 72°)
  M  (1/k)·#{neighbours of another species}                               (Pommerening 2002; Li et al. 2024)
  U  (1/k)·#{neighbours with larger dbh}                                  (Li et al. 2024)
  T_j  1 − min(d_i, d_j)/max(d_i, d_j) for the j-th nearest neighbour      (Pommerening 2002)
  buffer: reference trees only at distance ≥ b from the boundary; all trees are neighbours.
    python3 tests/ref/make_structure_ss02.py  →  tests/ref/structure_ss02.json
"""
import json
import math
import pathlib

import numpy as np
import scipy
from scipy.spatial import cKDTree

here = pathlib.Path(__file__).parent
rng = np.random.default_rng(20261115)


def make_plot(shape, n):
    if shape == "rect":
        g = dict(shape="rect", x0=10.0, y0=-5.0, x1=60.0, y1=35.0)
        x = rng.uniform(g["x0"], g["x1"], n); y = rng.uniform(g["y0"], g["y1"], n)
        A = 50.0 * 40.0; P = 2 * (50.0 + 40.0)
    else:
        g = dict(shape="circle", cx=3.0, cy=4.0, r=12.62)
        rr = g["r"] * np.sqrt(rng.uniform(0, 1, n)); t = rng.uniform(0, 2 * np.pi, n)
        x = g["cx"] + rr * np.cos(t); y = g["cy"] + rr * np.sin(t)
        A = math.pi * g["r"] ** 2; P = 2 * math.pi * g["r"]
    d = np.round(rng.gamma(4, 5, n) + 5, 1)
    sp = rng.choice(["A", "B", "C"], n, p=[0.5, 0.3, 0.2])
    return g, A, P, np.round(x, 3), np.round(y, 3), d, sp


def edge_dist(g, x, y):
    if g["shape"] == "circle":
        return g["r"] - np.hypot(x - g["cx"], y - g["cy"])
    return np.minimum.reduce([x - g["x0"], g["x1"] - x, y - g["y0"], g["y1"] - y])


def measures(g, A, P, x, y, d, sp, k, alpha0, edge, buf):
    n = len(x)
    if edge == "torus":
        w, h = g["x1"] - g["x0"], g["y1"] - g["y0"]
        tree = cKDTree(np.c_[x - g["x0"], y - g["y0"]], boxsize=[w, h])
    else:
        tree = cKDTree(np.c_[x, y])
    dist, idx = tree.query(np.c_[x - g["x0"], y - g["y0"]] if edge == "torus" else np.c_[x, y], k=k + 1)
    dist, idx = dist[:, 1:], idx[:, 1:]                       # column 0 is the tree itself (no equal positions here)
    ed = edge_dist(g, x, y)
    core = np.ones(n, bool) if edge != "buffer" else ed >= buf
    W, M, U, T = [], [], [], []
    for i in range(n):
        if not core[i]:
            W.append(None); M.append(None); U.append(None); T.append(None); continue
        dx = x[idx[i]] - x[i]; dy = y[idx[i]] - y[i]
        if edge == "torus":
            dx = dx - w * np.round(dx / w); dy = dy - h * np.round(dy / h)
        az = np.sort(np.degrees(np.arctan2(dy, dx)) % 360)
        th = np.diff(np.r_[az, az[0] + 360])
        a = np.minimum(th, 360 - th)
        W.append(float(np.mean(a < alpha0 - 1e-9)))
        M.append(float(np.mean(sp[idx[i]] != sp[i])))
        U.append(float(np.mean(d[idx[i]] > d[i])))
        T.append([float(1 - min(d[i], d[j]) / max(d[i], d[j])) for j in idx[i]])
    nn = dist[:, 0]
    E = 0.5 * math.sqrt(A / n)
    rObs = float(nn[core].mean())
    out = dict(k=k, alpha0=alpha0, edge=edge, buffer=buf, R=rObs / E, rObs=rObs, E=E, nRef=int(core.sum()),
               W=float(np.mean([v for v in W if v is not None])), M=float(np.mean([v for v in M if v is not None])),
               U=float(np.mean([v for v in U if v is not None])),
               T=[float(np.mean([t[j] for t in T if t is not None])) for j in range(k)],
               trees=dict(W=W, M=M, U=U, T=T, nn=[float(v) for v in nn], nbK=[float(v) for v in dist[:, k - 1]], edgeDist=[float(v) for v in ed]))
    if edge == "none" and g["shape"] == "rect":
        Ed = E + 0.0514 * P / n + 0.041 * P / n ** 1.5
        out["donnelly"] = dict(R=rObs / Ed, E=Ed)
    return out


cases = []
for shape, n, settings in [("rect", 150, [(4, 72, "none", 0), (4, 72, "buffer", 5.0), (4, 72, "torus", 0), (3, 90, "none", 0), (6, 60, "torus", 0)]),
                           ("circle", 70, [(4, 72, "none", 0), (4, 72, "buffer", 3.0), (5, 72, "none", 0)])]:
    g, A, P, x, y, d, sp = make_plot(shape, n)
    res = [measures(g, A, P, x, y, d, sp, *s) for s in settings]
    cases.append(dict(geometry=g, area=A, perimeter=P, x=x.tolist(), y=y.tolist(), dbh=d.tolist(), species=sp.tolist(), results=res))

# Dixon (2002) worked example: 630 trees in a 200 m × 50 m rectangle
dixon = dict(n=630, A=10000.0, P=500.0, E=0.5 * math.sqrt(10000 / 630), Ed=0.5 * math.sqrt(10000 / 630) + 0.0514 * 500 / 630 + 0.041 * 500 / 630 ** 1.5)
out = dict(generator="tests/ref/make_structure_ss02.py", scipy=scipy.__version__, numpy=np.__version__, seed=20261115,
           note="simulated data, not measurements", cases=cases, dixon=dixon,
           grids=dict(square=2.0, hexagonal=2 / math.sqrt(math.sqrt(3) / 2)))
(here / "structure_ss02.json").write_text(json.dumps(out))
print("ok", [len(c["results"]) for c in cases], dixon, out["grids"])
