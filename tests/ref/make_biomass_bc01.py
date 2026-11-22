"""Reference values for the biomass core (TOOLS_SPEC BC01): python3 tests/ref/make_biomass_bc01.py

Independent of the JavaScript: plain Python math, random coefficients and trees from a fixed seed (they are test
numbers, not the coefficients of any species: TOOLS_SPEC §8.4). Log10 equations are evaluated by converting them to
the natural-log scale first (ln B = a·ln 10 + b·ln D + c·ln H), the JavaScript evaluates them as 10^(...). Stand
totals are summed with explicit loops per plot and period. Writes tests/ref/biomass_bc01.json.
"""
import json, math, random, os

rng = random.Random(20261116)
LN10 = math.log(10.0)

def tree():
    return {"D": round(rng.uniform(8, 70), 1), "H": round(rng.uniform(6, 35), 1)}

cases = []
def add(form, p, transform=None):
    for _ in range(6):
        t = tree()
        D, H = t["D"], t["H"]
        cf = 1.0
        if transform and transform.get("correction") in ("snowdon", "user"):
            cf = transform["value"]
        if form == "pow.d": B = p["a"] * D ** p["b"]
        elif form == "pow.dh": B = p["a"] * D ** p["b"] * H ** p["c"]
        elif form == "pow.d2h": B = p["a"] * (D * D * H) ** p["b"]
        elif form == "lin.d2h": B = p["a"] + p["b"] * D * D * H
        elif form == "log.d": B = math.exp(p["a"] + p["b"] * math.log(D)) * cf
        elif form == "log.dh": B = math.exp(p["a"] + p["b"] * math.log(D) + p["c"] * math.log(H)) * cf
        elif form == "log10.d": B = math.exp(p["a"] * LN10 + p["b"] * math.log(D)) * cf          # log10 → ln
        elif form == "log10.dh": B = math.exp(p["a"] * LN10 + p["b"] * math.log(D) + p["c"] * math.log(H)) * cf
        cases.append({"form": form, "params": p, "transform": transform, "D": D, "H": H, "B": B})

add("pow.d", {"a": rng.uniform(0.02, 0.2), "b": rng.uniform(2.0, 2.7)})
add("pow.dh", {"a": rng.uniform(0.01, 0.1), "b": rng.uniform(1.6, 2.2), "c": rng.uniform(0.4, 1.0)})
add("pow.d2h", {"a": rng.uniform(0.01, 0.06), "b": rng.uniform(0.8, 1.0)})
add("lin.d2h", {"a": rng.uniform(1, 10), "b": rng.uniform(0.01, 0.03)})
add("log.d", {"a": rng.uniform(-3, -1.5), "b": rng.uniform(2.0, 2.6)}, {"kind": "log", "correction": "none"})
add("log.dh", {"a": rng.uniform(-4, -2.5), "b": rng.uniform(1.6, 2.2), "c": rng.uniform(0.5, 1.0)}, {"kind": "log", "correction": "snowdon", "value": round(rng.uniform(1.01, 1.08), 4)})
add("log10.d", {"a": rng.uniform(-1.3, -0.7), "b": rng.uniform(2.0, 2.6)}, {"kind": "log10", "correction": "user", "value": round(rng.uniform(1.0, 1.05), 4)})
add("log10.dh", {"a": rng.uniform(-1.7, -1.1), "b": rng.uniform(1.6, 2.2), "c": rng.uniform(0.5, 1.0)}, {"kind": "log10", "correction": "none"})

# conversion from volume (IPCC 2006 Eq. 2.8b): AGB = V·D·BEF or V·BCEF; total = AGB·(1 + R)
vol = []
for _ in range(5):
    V, D, BEF, R = rng.uniform(0.05, 3), rng.uniform(0.3, 0.7), rng.uniform(1.1, 1.6), rng.uniform(0.15, 0.35)
    BCEF = rng.uniform(0.5, 1.2)
    vol.append({"V": V, "D": D, "BEF": BEF, "BCEF": BCEF, "R": R,
                "agb_bef": V * D * BEF, "total_bef": V * D * BEF * (1 + R), "agb_bcef": V * BCEF, "total_bcef": V * BCEF * (1 + R)})

# carbon and CO2: C = B·CF, CO2 = C·44/12
carb = []
for _ in range(5):
    B, CF = rng.uniform(10, 3000), rng.uniform(0.45, 0.52)
    carb.append({"B": B, "CF": CF, "C": B * CF, "CO2": B * CF * 44.0 / 12.0})

# stand totals: plots of 400 and 500 m², two periods; Mg/ha = Σ kg · 10000 / area / 1000
plots = [{"plot_id": "A", "plot_area": 400.0}, {"plot_id": "B", "plot_area": 500.0}]
trees = []
for pl in ("A", "B"):
    for per in ("2020", "2025"):
        for i in range(rng.randint(3, 7)):
            trees.append({"plot_id": pl, "tree_id": str(i + 1), "period": per, "dbh": round(rng.uniform(8, 60), 1), "kg": rng.uniform(5, 2500)})
stand = []
for pl in plots:
    for per in ("2020", "2025"):
        s = 0.0
        n = 0
        for t in trees:
            if t["plot_id"] == pl["plot_id"] and t["period"] == per:
                s += t["kg"]; n += 1
        stand.append({"plot_id": pl["plot_id"], "period": per, "n": n, "Mg_ha": s * 10000.0 / pl["plot_area"] / 1000.0})

out = {"note": "random test numbers, not species coefficients", "co2_per_c": 44.0 / 12.0, "baskerville_see_0.2": math.exp(0.2 ** 2 / 2),
       "baskerville_log10_see_0.1": math.exp((0.1 * math.log(10)) ** 2 / 2),  # Sprugel 1983: SEE(log10) · ln 10
      
       "cases": cases, "volume": vol, "carbon": carb, "stand": {"plots": plots, "trees": trees, "totals": stand}}
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "biomass_bc01.json")
with open(p, "w") as f:
    json.dump(out, f, indent=1)
print("wrote", p, len(cases), "cases")
