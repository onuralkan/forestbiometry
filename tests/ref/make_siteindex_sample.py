"""Sample data of the Site Index tool, coefficient fitting (SIMULATED, not real measurements):
assets/lab/siteindex/ornek/ornek-yas-boy.csv.

Stem analyses of 8 dominant trees: height at the ages 10, 20, …, 80 years. Heights follow a Chapman–Richards curve
H = a·(1 − e^(−b·A))^c with a tree-specific asymptote a (18–31 m) and b = 0.035, c = 1.3, plus normal noise (sd 0.3 m),
heights kept increasing. These numbers only generate a plausible-looking example; they are NOT coefficients of any
species or region and must not be used as such (TOOLS_SPEC K1).

    python3 tests/ref/make_siteindex_sample.py
"""
import pathlib

import numpy as np

rng = np.random.default_rng(20261112)
out = pathlib.Path(__file__).parents[2] / "assets" / "lab" / "siteindex" / "ornek" / "ornek-yas-boy.csv"
lines = ["agac,yas,boy"]
for k, a in enumerate(np.linspace(18, 31, 8), start=1):
    prev = 0.0
    for A in range(10, 90, 10):
        h = a * (1 - np.exp(-0.035 * A)) ** 1.3 + rng.normal(0, 0.3)
        h = max(h, prev + 0.1)
        prev = h
        lines.append(f"T{k},{A},{h:.1f}")
out.write_text("\n".join(lines) + "\n")
print("written", out)
