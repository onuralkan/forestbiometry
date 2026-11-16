"""Sample data of the Growth function fitter page: SIMULATED stem-analysis height series (not real trees).
Three series, Chapman-Richards curves with series-specific asymptotes + N(0, 0.3 m) noise, ages every 5 years;
numpy default_rng(20261120); decimal point.   python3 tests/ref/make_growth_sample.py -> assets/lab/growth/ornek/ornek-buyume.csv
"""
import pathlib
import numpy as np
rng = np.random.default_rng(20261120)
rows = ["seri;yas;boy_m"]
for sid, (a, k, c, tmax) in enumerate([(28, 0.03, 1.6, 80), (24, 0.028, 1.5, 70), (31, 0.032, 1.7, 90)], start=1):
    for t in range(5, tmax + 1, 5):
        h = a * (1 - np.exp(-k * t)) ** c + rng.normal(0, 0.3)
        rows.append(f"S{sid};{t};{max(h, 0.1):.2f}")
out = pathlib.Path(__file__).resolve().parents[2] / "assets/lab/growth/ornek/ornek-buyume.csv"
out.write_text("\n".join(rows) + "\n")
print("written", out, len(rows) - 1, "rows")
