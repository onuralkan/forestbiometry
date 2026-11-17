"""Reference for the biomass Monte Carlo (TOOLS_SPEC BC04): python3 tests/ref/make_biomass_bc04.py

Written separately from assets/lab/biomass/mc.js with the standard library only: the same seeded generator
(mulberry32, as in tests/ref/make_hd_reference.py), normal deviates z = NormalDist().inv_cdf(u + 2^-33), the same
documented draw order (coefficients: replicate, then set id; residuals: tree, then component, then replicate),
coefficient draws theta = theta_hat + L z with L the Cholesky factor (computed here with its own loop), residuals on the
scale of the equation, back-transformation without a correction factor when a residual is simulated. Per tree and per
plot x period: mean, sd (n - 1), sample quantiles type 7. Coefficients are random test numbers, not any species'.
Writes tests/ref/biomass_bc04.json.
"""
import json, math, os, random
from statistics import NormalDist

ND = NormalDist()
def mulberry32(seed):
    a = seed & 0xFFFFFFFF
    def nxt():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return nxt

rnd = random.Random(4)
plots = [{"plot_id": "P1", "plot_area": 400.0}, {"plot_id": "P2", "plot_area": 500.0}]
trees, row = [], 1
for pl in ("P1", "P2"):
    for i in range(6):
        sp = ["A", "B", "C"][i % 3]
        trees.append({"row": row, "plot_id": pl, "tree_id": str(i + 1), "period": None, "species": sp,
                      "dbh": round(rnd.uniform(10, 50), 1), "height": round(rnd.uniform(8, 30), 1)})
        row += 1
# A: ln form with coefficient covariance and residual; B: linear D2H with covariance only; C: power form, residual only;
# D: ln form with neither (held at its point value, Snowdon factor applied)
sets = {
    "sA": {"form": "log.dh", "params": {"a": -2.9, "b": 2.1, "c": 0.6}, "cov": [[0.04, -0.008, -0.004], [-0.008, 0.0025, 0.0004], [-0.004, 0.0004, 0.0016]], "rse": 0.3, "corr": 1.05},
    "sB": {"form": "lin.d2h", "params": {"a": 5.0, "b": 0.021}, "cov": [[4.0, -0.002], [-0.002, 4e-6]], "rse": None, "corr": None},
    "sC": {"form": "pow.d", "params": {"a": 0.09, "b": 2.4}, "cov": None, "rse": 12.0, "corr": None},
    "sD": {"form": "log.d", "params": {"a": -3.2, "b": 2.3}, "cov": None, "rse": None, "corr": 1.02},
}
comps = [("c1", 0.5), ("c2", 0.47)]
mapping = {"A": {"c1": "sA", "c2": "sD"}, "B": {"c1": "sB", "c2": "sD"}, "C": {"c1": "sC", "c2": "sD"}}
keys = {"log.dh": ["a", "b", "c"], "lin.d2h": ["a", "b"], "pow.d": ["a", "b"], "log.d": ["a", "b"]}
scale = {"log.dh": "log", "lin.d2h": "none", "pow.d": "none", "log.d": "log"}
def f(form, p, D, H):
    if form == "log.dh": return p["a"] + p["b"] * math.log(D) + p["c"] * math.log(H)
    if form == "lin.d2h": return p["a"] + p["b"] * D * D * H
    if form == "pow.d": return p["a"] * D ** p["b"]
    if form == "log.d": return p["a"] + p["b"] * math.log(D)
def point(sid, D, H):
    s = sets[sid]; y = f(s["form"], s["params"], D, H)
    return y if scale[s["form"]] == "none" else math.exp(y) * (s["corr"] or 1)
def chol(A):
    n = len(A); L = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1):
            s = sum(L[i][k] * L[j][k] for k in range(j))
            if i == j: L[i][i] = math.sqrt(A[i][i] - s)
            else: L[i][j] = (A[i][j] - s) / L[j][j]
    return L
def q7(xs, p):
    xs = sorted(xs); n = len(xs); h = (n - 1) * p; lo = math.floor(h); hi = min(n - 1, lo + 1)
    return xs[lo] + (h - lo) * (xs[hi] - xs[lo])
def summ(xs, level):
    n = len(xs); m = sum(xs) / n; sd = math.sqrt(sum((x - m) ** 2 for x in xs) / (n - 1)); a = (1 - level) / 2
    return {"mean": m, "sd": sd, "lo": q7(xs, a), "hi": q7(xs, 1 - a)}

def run(B, seed, level):
    r = mulberry32(seed); z = lambda: ND.inv_cdf(r() + 2 ** -33)
    used = sorted({mapping[t["species"]][c] for t in trees for c, _ in comps})
    Ls = {sid: chol(sets[sid]["cov"]) for sid in used if sets[sid]["cov"]}
    th = {sid: [] for sid in used}
    for b in range(B):
        for sid in used:
            k = keys[sets[sid]["form"]]; v = [sets[sid]["params"][x] for x in k]
            if sid in Ls:
                zz = [z() for _ in k]; L = Ls[sid]
                v = [v[i] + sum(L[i][j] * zz[j] for j in range(i + 1)) for i in range(len(k))]
            th[sid].append(dict(zip(k, v)))
    tB, tC = [], []
    for t in trees:
        bb, cc = [0.0] * B, [0.0] * B
        for c, cf in comps:
            sid = mapping[t["species"]][c]; s = sets[sid]; sc = scale[s["form"]]
            corr = (s["corr"] or 1) if (sc != "none" and s["rse"] is None) else 1
            for b in range(B):
                y = f(s["form"], th[sid][b], t["dbh"], t["height"])
                if s["rse"] is not None: y += s["rse"] * z()
                v = (y if sc == "none" else math.exp(y)) * corr
                bb[b] += v; cc[b] += v * cf
        tB.append(bb); tC.append(cc)
    out_t = [{"row": t["row"], "B": {"point": sum(point(mapping[t["species"]][c], t["dbh"], t["height"]) for c, _ in comps), **summ(tB[i], level)}, "C": summ(tC[i], level)} for i, t in enumerate(trees)]
    out_u = []
    for pl in plots:
        idx = [i for i, t in enumerate(trees) if t["plot_id"] == pl["plot_id"]]; ef = 10000.0 / pl["plot_area"] / 1000.0
        ub = [sum(tB[i][b] for i in idx) * ef for b in range(B)]; uc = [sum(tC[i][b] for i in idx) * ef for b in range(B)]
        out_u.append({"plot_id": pl["plot_id"], "B": summ(ub, level), "C": summ(uc, level), "CO2": summ([c * 44.0 / 12.0 for c in uc], level)})
    return {"B": B, "seed": seed, "level": level, "trees": out_t, "units": out_u}

res = run(400, 20261117, 0.95)
json.dump({"plots": plots, "trees": trees, "sets": sets, "comps": comps, "mapping": mapping, "run": res},
          open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "biomass_bc04.json"), "w"), indent=1)
print("wrote biomass_bc04.json", len(trees), "trees")
