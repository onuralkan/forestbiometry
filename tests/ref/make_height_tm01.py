"""Reference for tree height (TM-01/a1): heights recovered from simulated field geometry.

Written apart from the JavaScript code (assets/lab/tree/height.js): a tree of known height H stands on the ground
(base at elevation zb, top at zb + H) at horizontal distance D from an observer whose eye is at elevation ze. The
readings an instrument would give are computed from the geometry (atan2 for the angles, 100 * rise / run for the
percent scale, the Euclidean distance from the eye to the base or to a point of the stem for a rangefinder); the
JavaScript methods must return H from these readings. A second, closed-form path checks the slope-distance case with
the Brandis formula as Graves (1906) §72 writes it: H = S * sin(u + l) / cos(u) (eye above the base; S the distance
from the eye to the base, u the angle up to the top, l the angle down to the base), evaluated with mpmath (50 digits).
Random cases (numpy default_rng(20261117)); no field data.
    python3 tests/ref/make_height_tm01.py  ->  tests/ref/height_tm01.json
"""
import json
import math
import pathlib

import numpy as np
import mpmath as mp

mp.mp.dps = 50
here = pathlib.Path(__file__).parent
rng = np.random.default_rng(20261117)
cases = []
for k in range(200):
    H = float(rng.uniform(2, 55))
    D = float(rng.uniform(0.6, 2.0) * H)
    ze = float(rng.uniform(-6, 6))            # eye elevation relative to the ground at the observer
    zb = float(rng.uniform(-8, 8))            # ground at the base of the tree
    if k % 7 == 0:                            # eye above the top of a short tree is not allowed; keep the base below or above the eye
        zb = ze + float(rng.uniform(0.2, 3))  # base above the eye (sloping ground, observer below)
    top = math.degrees(math.atan2(zb + H - ze, D))
    base = math.degrees(math.atan2(zb - ze, D))
    zp = zb + float(rng.uniform(0.5, 0.6 * H))   # a point P of the stem for a rangefinder
    angP = math.degrees(math.atan2(zp - ze, D))
    S_base = math.hypot(D, zb - ze)
    S_p = math.hypot(D, zp - ze)
    case = dict(H=H, D=D, top_deg=top, base_deg=base, top_pct=100 * (zb + H - ze) / D, base_pct=100 * (zb - ze) / D,
                S_base=S_base, S_point=S_p, point_deg=angP)
    if zb < ze:   # Brandis closed form (base below the eye)
        u, l = mp.radians(mp.mpf(top)), mp.radians(-mp.mpf(base))
        case["brandis_H"] = float(mp.mpf(S_base) * mp.sin(u + l) / mp.cos(u))
    cases.append(case)
json.dump({"source": "tests/ref/make_height_tm01.py", "cases": cases}, open(here / "height_tm01.json", "w"), indent=1)
print(len(cases), "cases;", sum('brandis_H' in c for c in cases), "with the Brandis form;", sum(c['base_deg'] > 0 for c in cases), "with the base above the eye")
