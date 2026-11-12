"""Sample data of the stem section volume tool (SIMULATED, not real measurements): assets/lab/secvol/ornek/ornek-seksiyon.csv.

Three plots of 400 m², 4–5 trees each; points at the cut height (0.3 m), 1.3 m and every 2 m above it ("ends" layout),
diameters over bark from a smooth taper curve with small noise, double bark thickness in mm, dbh = the diameter at 1.3 m. Tree 3-5 has a single
point (to show how an unusable tree is reported). numpy default_rng(20261112).
    python3 tests/ref/make_secvol_sample.py
"""
import pathlib

import numpy as np

root = pathlib.Path(__file__).resolve().parents[2]
rng = np.random.default_rng(20261112)
rows = ["alan;agac;h_m;cap_cm;kabuk_mm;dbh;boy_m;kesim_m;alan_m2"]
for plot, n in [("1", 4), ("2", 5), ("3", 5)]:
    for t in range(1, n + 1):
        H = round(float(rng.uniform(14, 28)), 1)
        dbh = float(rng.uniform(18, 45))
        stump = 0.3
        hs = [stump, 1.3] + [round(1.3 + 2 * k, 1) for k in range(1, 30) if 1.3 + 2 * k < 0.85 * H]
        if plot == "3" and t == 5:
            hs = [1.3]
        prev = None
        pts = []
        for h in hs:
            d = dbh * ((H - h) / (H - 1.3)) ** 0.75 + rng.normal(0, 0.2)
            d = round(float(d if prev is None else min(d, prev)), 1)
            prev = d
            bark = round(float(np.clip(0.06 * d * 10 + rng.normal(0, 1), 2, None)), 0)
            pts.append((h, d, bark))
        d13 = next(d for h, d, _ in pts if abs(h - 1.3) < 1e-9)          # dbh = the diameter measured at 1.3 m
        for h, d, bark in pts:
            rows.append(";".join([plot, f"{plot}-{t}", f"{h:.1f}".replace(".", ","), f"{d:.1f}".replace(".", ","), f"{bark:.0f}",
                                  f"{d13:.1f}".replace(".", ","), f"{H:.1f}".replace(".", ","), f"{stump:.1f}".replace(".", ","), "400"]))
(root / "assets/lab/secvol/ornek/ornek-seksiyon.csv").write_text("\n".join(rows) + "\n", encoding="utf-8")
print(len(rows) - 1, "rows")
