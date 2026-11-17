"""Reference values for the biomass page logic (TOOLS_SPEC BC02): python3 tests/ref/make_biomass_bc02.py

A small package (two plots, two periods, three species) with random test coefficients (no species' values,
TOOLS_SPEC §8.4). Species "A" and "B" have a set for each component, species "C" has none (its trees must not be
computed with another species' equation). One tree of "A" has no height (its branch form needs H). The volume path
gives every tree a volume but one. Everything is computed tree by tree and summed per plot × period with explicit
loops; Mg/ha = Σ kg · 10000 / area / 1000, C = B · CF, CO2 = C · 44/12. Writes tests/ref/biomass_bc02.json.
"""
import json, math, random, os

rng = random.Random(20261117)
plots = [{"plot_id": "P1", "plot_area": 400.0}, {"plot_id": "P2", "plot_area": 500.0}]
trees = []
row = 2
for pl in ("P1", "P2"):
    for per in ("2020", "2025"):
        for i in range(rng.randint(4, 7)):
            sp = rng.choice(["A", "A", "B", "B", "C"])
            trees.append({"row": row, "plot_id": pl, "tree_id": str(i + 1), "period": per, "species": sp,
                          "dbh": round(rng.uniform(8, 60), 1), "height": round(rng.uniform(6, 32), 1), "V": round(rng.uniform(0.02, 2.5), 4)})
            row += 1
a_trees = [t for t in trees if t["species"] == "A"]
a_trees[0]["height"] = None                 # no height: the branch form of A needs H
trees[-1]["V"] = None                       # no volume for the last tree

sets = {
    "A.stem": {"form": "pow.d", "params": {"a": rng.uniform(0.05, 0.15), "b": rng.uniform(2.2, 2.5)}, "transform": None},
    "A.branch": {"form": "log.dh", "params": {"a": rng.uniform(-4.5, -3.5), "b": rng.uniform(1.8, 2.2), "c": rng.uniform(0.3, 0.7)}, "transform": {"kind": "log", "correction": "snowdon", "value": 1.03}},
    "B.stem": {"form": "pow.dh", "params": {"a": rng.uniform(0.02, 0.05), "b": rng.uniform(1.8, 2.1), "c": rng.uniform(0.6, 1.0)}, "transform": None},
    "B.branch": {"form": "pow.d", "params": {"a": rng.uniform(0.005, 0.02), "b": rng.uniform(2.2, 2.6)}, "transform": None},
}
CF = {"stem": 0.5, "branch": 0.48}

def B(setid, D, H):
    s = sets[setid]; p = s["params"]; f = s["form"]
    if f == "pow.d": return p["a"] * D ** p["b"]
    if f == "pow.dh": return None if H is None else p["a"] * D ** p["b"] * H ** p["c"]
    if f == "log.dh": return None if H is None else math.exp(p["a"] + p["b"] * math.log(D) + p["c"] * math.log(H)) * s["transform"]["value"]

per_tree = []
for t in trees:
    r = {"row": t["row"]}
    for c in ("stem", "branch"):
        k = t["species"] + "." + c
        r[c] = B(k, t["dbh"], t["height"]) if k in sets else None
    per_tree.append(r)

units = []
for pl in plots:
    for per in ("2020", "2025"):
        ts = [(t, r) for t, r in zip(trees, per_tree) if t["plot_id"] == pl["plot_id"] and t["period"] == per]
        u = {"plot_id": pl["plot_id"], "period": per, "n": len(ts)}
        for c in ("stem", "branch"):
            vals = [r[c] for _, r in ts]
            u[c] = None if any(v is None for v in vals) else sum(vals) * 10000.0 / pl["plot_area"] / 1000.0
        sums = [None if (r["stem"] is None or r["branch"] is None) else r["stem"] + r["branch"] for _, r in ts]
        u["B"] = None if any(v is None for v in sums) else sum(sums) * 10000.0 / pl["plot_area"] / 1000.0
        cs = [None if (r["stem"] is None or r["branch"] is None) else r["stem"] * CF["stem"] + r["branch"] * CF["branch"] for _, r in ts]
        u["C"] = None if any(v is None for v in cs) else sum(cs) * 10000.0 / pl["plot_area"] / 1000.0
        u["CO2"] = None if u["C"] is None else u["C"] * 44.0 / 12.0
        units.append(u)

# volume path: AGB = V·D·BEF, total = AGB·(1 + R), kg = Mg · 1000; C = total · CF
fac = {"mode": "bef", "bark": "ob", "D": 0.52, "BEF": 1.3, "R": 0.24}
CFv = 0.49
vunits = []
for pl in plots:
    for per in ("2020", "2025"):
        ts = [t for t in trees if t["plot_id"] == pl["plot_id"] and t["period"] == per]
        tot = [None if t["V"] is None else t["V"] * fac["D"] * fac["BEF"] * (1 + fac["R"]) * 1000.0 for t in ts]
        u = {"plot_id": pl["plot_id"], "period": per}
        u["B"] = None if any(v is None for v in tot) else sum(tot) * 10000.0 / pl["plot_area"] / 1000.0
        u["C"] = None if u["B"] is None else u["B"] * CFv
        u["CO2"] = None if u["C"] is None else u["C"] * 44.0 / 12.0
        vunits.append(u)

out = {"note": "random test numbers, not species coefficients", "plots": plots, "trees": trees, "sets": sets, "CF": CF, "per_tree": per_tree, "units": units,
       "volume": {"factors": fac, "CF": CFv, "units": vunits}, "unmapped_rows": [t["row"] for t in trees if t["species"] == "C"], "noheight_row": a_trees[0]["row"]}
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "biomass_bc02.json")
with open(p, "w") as f: json.dump(out, f, indent=1)
print("wrote", p, len(trees), "trees")
