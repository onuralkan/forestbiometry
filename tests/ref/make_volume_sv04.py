"""Reference for the volume equations (SV-04): python3 tests/ref/make_volume_sv04.py

Written apart from assets/lab/volume/calc.js, standard library only (own Gauss-Jordan inverse). Simulated sample trees
(random test numbers; no species' values): V from a power function of D and H with multiplicative noise. Forms of
Kershaw et al. 2016 §6.2: (6.22) V = b1 D^2 H, (6.23) V = b0 + b1 D^2 H, (6.25) ln V = ln b1 + b2 ln D + b3 ln H,
local V = b0 + b1 D^2 and (6.29) ln V = ln b0 + b1 ln D. Weighted fits: sigma^2 proportional to X^k with k given or from
the OLS residuals (slope of ln e^2 on ln X). Coefficients, standard errors s^2 (X'WX)^-1, Baskerville exp(s^2/2) on the
ln forms, and on the volume scale bias, MAE, RMSE, R^2 = 1 - SSE/SST with e = predicted - observed.
Writes tests/ref/volume_sv04.json.
"""
import json, math, os, random
rnd = random.Random(2016)
trees = []
for i in range(40):
    D = round(rnd.uniform(10, 55), 1); H = round(6 + 0.42 * D + rnd.gauss(0, 2.5), 1)
    V = round(0.000062 * D ** 1.85 * H ** 1.05 * math.exp(rnd.gauss(0, 0.07)), 4)
    trees.append({"row": i + 2, "D": D, "H": H, "V": V})
trees[3]["H"] = None; trees[7]["V"] = None
def inv(A):
    n = len(A); M = [r[:] + [1.0 if i == j else 0.0 for j in range(n)] for i, r in enumerate(A)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c])); M[c], M[p] = M[p], M[c]
        v = M[c][c]; M[c] = [x / v for x in M[c]]
        for r in range(n):
            if r != c:
                f = M[r][c]; M[r] = [a - f * b for a, b in zip(M[r], M[c])]
    return [r[n:] for r in M]
def wls(X, y, w):
    n, p = len(y), len(X[0])
    A = [[sum(w[t] * X[t][a] * X[t][b] for t in range(n)) for b in range(p)] for a in range(p)]
    g = [sum(w[t] * X[t][a] * y[t] for t in range(n)) for a in range(p)]
    Ai = inv(A); b = [sum(Ai[a][j] * g[j] for j in range(p)) for a in range(p)]
    e = [y[t] - sum(X[t][j] * b[j] for j in range(p)) for t in range(n)]
    s2 = sum(w[t] * e[t] ** 2 for t in range(n)) / (n - p)
    return b, [math.sqrt(s2 * Ai[j][j]) for j in range(p)], s2, e
def slope(e, X):
    lx = [math.log(v) for v in X]; ly = [math.log(v * v) for v in e]; n = len(lx); mx = sum(lx) / n; my = sum(ly) / n
    return sum((a - mx) * (b - my) for a, b in zip(lx, ly)) / sum((a - mx) ** 2 for a in lx)
def metr(o, p):
    n = len(o); e = [p[i] - o[i] for i in range(n)]; mo = sum(o) / n
    sse = sum(x * x for x in e); sst = sum((x - mo) ** 2 for x in o)
    return {"bias": sum(e) / n, "mae": sum(abs(x) for x in e) / n, "rmse": math.sqrt(sse / n), "r2": 1 - sse / sst}
F = {
 "cf": (True, lambda t: [t["D"] ** 2 * t["H"]], lambda t: t["V"], "d2h", lambda c: {"b1": c[0]}, lambda p, t: p["b1"] * t["D"] ** 2 * t["H"], False),
 "cv": (True, lambda t: [1.0, t["D"] ** 2 * t["H"]], lambda t: t["V"], "d2h", lambda c: {"b0": c[0], "b1": c[1]}, lambda p, t: p["b0"] + p["b1"] * t["D"] ** 2 * t["H"], False),
 "ln": (True, lambda t: [1.0, math.log(t["D"]), math.log(t["H"])], lambda t: math.log(t["V"]), None, lambda c: {"b1": math.exp(c[0]), "b2": c[1], "b3": c[2]}, lambda p, t: p["b1"] * t["D"] ** p["b2"] * t["H"] ** p["b3"], True),
 "loc": (False, lambda t: [1.0, t["D"] ** 2], lambda t: t["V"], "d2", lambda c: {"b0": c[0], "b1": c[1]}, lambda p, t: p["b0"] + p["b1"] * t["D"] ** 2, False),
 "locln": (False, lambda t: [1.0, math.log(t["D"])], lambda t: math.log(t["V"]), None, lambda c: {"b0": math.exp(c[0]), "b1": c[1]}, lambda p, t: p["b0"] * t["D"] ** p["b1"], True),
}
WV = {"d2h": lambda t: t["D"] ** 2 * t["H"], "d2": lambda t: t["D"] ** 2}
out = {}
for fid, (needH, xf, yf, wv, tp, vf, islog) in F.items():
    use = [t for t in trees if t["D"] and t["V"] and (not needH or t["H"])]
    X = [xf(t) for t in use]; y = [yf(t) for t in use]
    runs = [("plain", None, "none")]
    if wv: runs += [("w_est", "est", "none"), ("w_given", 1.7, "none")]
    if islog: runs += [("bask", None, "baskerville")]
    res = {}
    for name, k, corr in runs:
        w = [1.0] * len(use); kk = None
        if k is not None:
            kk = slope(wls(X, y, w)[3], [WV[wv](t) for t in use]) if k == "est" else k
            w = [1 / WV[wv](t) ** kk for t in use]
        b, se, s2, _ = wls(X, y, w); par = tp(b); cf = math.exp(s2 / 2) if corr == "baskerville" else 1.0
        pred = [vf(par, t) * cf for t in use]; obs = [t["V"] for t in use]
        res[name] = {"k": kk, "coef": b, "se": se, "s": math.sqrt(s2), "params": par, "cf": cf, "metrics": metr(obs, pred), "n": len(use)}
    out[fid] = res
json.dump({"trees": trees, "fits": out}, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "volume_sv04.json"), "w"), indent=1)
print("wrote volume_sv04.json:", {k: v["plain"]["n"] for k, v in out.items()})
