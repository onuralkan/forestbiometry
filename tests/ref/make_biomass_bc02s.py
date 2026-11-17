"""Reference for the additive biomass system (BC-02/a1): python3 tests/ref/make_biomass_bc02s.py

Written apart from assets/lab/biomass/sur.js, standard library only (own Gauss-Jordan inverse). Simulated destructive
sample (random test numbers, no species' values): wood ~ D2H, bark ~ D2, branches ~ D2H + H; total = sum of the
components. Weights: wood sigma^2 = (D2H)^k with k from the slope of ln e^2 on ln(D2H) of its OLS residuals
(Parresol 1999 Eq. 15), total sigma^2 = (D2H)^1.8 given, others unweighted. Restricted SUR as Parresol 1999 Eq. 31-35.
Writes tests/ref/biomass_bc02s.json.
"""
import json, math, os, random
rnd = random.Random(1999)
trees = []
for i in range(30):
    D = rnd.uniform(12, 60); H = 8 + 0.35 * D + rnd.gauss(0, 2)
    wood = 0.025 * D * D * H * math.exp(rnd.gauss(0, 0.08)) + 10
    bark = 3 + 0.09 * D * D + rnd.gauss(0, 4 + 0.01 * D * D)
    br = 15 + 0.004 * D * D * H - 1.1 * H + rnd.gauss(0, 6)
    trees.append({"row": i + 2, "D": round(D, 1), "H": round(H, 1), "y": {"wood": round(wood, 2), "bark": round(max(bark, 0.5), 2), "br": round(max(br, 0.5), 2)}})
trees[5]["H"] = None   # dropped: H needed
terms = {"d2": lambda D, H: D * D, "d2h": lambda D, H: D * D * H, "h": lambda D, H: H}
comps = [("wood", ["d2h"]), ("bark", ["d2"]), ("br", ["d2h", "h"])]
allt = ["d2", "d2h", "h"]
use = [t for t in trees if t["H"] is not None]
T = len(use)
def inv(A):
    n = len(A); M = [row[:] + [1.0 if i == j else 0.0 for j in range(n)] for i, row in enumerate(A)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c])); M[c], M[p] = M[p], M[c]
        v = M[c][c]; M[c] = [x / v for x in M[c]]
        for r in range(n):
            if r != c:
                f = M[r][c]; M[r] = [a - f * b for a, b in zip(M[r], M[c])]
    return [row[n:] for row in M]
eqs = []
for key, ts in comps: eqs.append((key, ts, [t["y"][key] for t in use]))
eqs.append(("total", allt, [sum(t["y"][k] for k, _ in comps) for t in use]))
X = [[[1.0] + [terms[k](t["D"], t["H"]) for k in ts] for t in use] for _, ts, _ in eqs]
Y = [y for _, _, y in eqs]
def wls(Xi, yi, w):
    k = len(Xi[0]); A = [[sum(Xi[t][a] * Xi[t][b] / w[t] for t in range(T)) for b in range(k)] for a in range(k)]
    g = [sum(Xi[t][a] * yi[t] / w[t] for t in range(T)) for a in range(k)]
    Ai = inv(A); b = [sum(Ai[a][j] * g[j] for j in range(k)) for a in range(k)]
    e = [(yi[t] - sum(Xi[t][a] * b[a] for a in range(k))) / math.sqrt(w[t]) for t in range(T)]
    return b, e
d2h = [t["D"] ** 2 * t["H"] for t in use]
b0, e0 = wls(X[0], Y[0], [1.0] * T)
lx = [math.log(v) for v in d2h]; le = [math.log(v * v) for v in e0]
mx = sum(lx) / T; my = sum(le) / T
kw = sum((a - mx) * (b - my) for a, b in zip(lx, le)) / sum((a - mx) ** 2 for a in lx)
W = [[v ** kw for v in d2h], [1.0] * T, [1.0] * T, [v ** 1.8 for v in d2h]]
single = [wls(X[i], Y[i], W[i]) for i in range(4)]
K = [len(X[i][0]) for i in range(4)]; P = sum(K); off = [sum(K[:i]) for i in range(4)]
S = [[sum(single[i][1][t] * single[j][1][t] for t in range(T)) / math.sqrt((T - K[i]) * (T - K[j])) for j in range(4)] for i in range(4)]
Si = inv(S)
XtX = [[0.0] * P for _ in range(P)]; Xty = [0.0] * P
for t in range(T):
    for i in range(4):
        for j in range(4):
            for a in range(K[i]):
                xa = X[i][t][a] / math.sqrt(W[i][t]) * Si[i][j]
                Xty[off[i] + a] += xa * Y[j][t] / math.sqrt(W[j][t])
                for b in range(K[j]): XtX[off[i] + a][off[j] + b] += xa * X[j][t][b] / math.sqrt(W[j][t])
C = inv(XtX); bh = [sum(C[a][j] * Xty[j] for j in range(P)) for a in range(P)]
names = ["b0"] + allt; R = []
for j, nm in enumerate(names):
    rr = [0.0] * P; rr[off[3] + j] = -1.0
    for i, (_, ts) in enumerate(comps):
        if nm == "b0": rr[off[i]] = 1.0
        elif nm in ts: rr[off[i] + 1 + ts.index(nm)] = 1.0
    R.append(rr)
q = len(R)
CRt = [[sum(C[a][j] * R[c][j] for j in range(P)) for c in range(q)] for a in range(P)]
RCRt = [[sum(R[a][j] * CRt[j][c] for j in range(P)) for c in range(q)] for a in range(q)]
Mi = inv(RCRt); dvec = [-sum(R[a][j] * bh[j] for j in range(P)) for a in range(q)]
bs = [bh[a] + sum(CRt[a][c] * sum(Mi[c][e] * dvec[e] for e in range(q)) for c in range(q)) for a in range(P)]
cov = [[C[a][b] - sum(CRt[a][c] * sum(Mi[c][e] * CRt[b][e] for e in range(q)) for c in range(q)) for b in range(P)] for a in range(P)]
json.dump({"trees": trees, "k_wood": kw, "b": bs, "se": [math.sqrt(max(0, cov[a][a])) for a in range(P)], "single": [s[0] for s in single], "sigma": S, "n": T},
          open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "biomass_bc02s.json"), "w"), indent=1)
print("wrote biomass_bc02s.json, n =", T, "k_wood =", round(kw, 4))
