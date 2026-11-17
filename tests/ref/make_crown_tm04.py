"""Reference for crown metrics (TM-04/a1).

Written apart from the JavaScript code (assets/lab/tree/crown.js).
- Crown solids as surfaces of revolution: radius profile rho(z) from the apex (cone rho = r z/L, paraboloid
  rho = r sqrt(z/L), cylinder rho = r); volume = integral of pi rho^2 and lateral surface = integral of
  2 pi rho sqrt(1 + rho'^2) dz by scipy.integrate.quad (paraboloid: substitution z = t^2 removes the singularity at the
  apex). No closed form used, so the check of Hamilton's paraboloid formula is independent.
- Ellipse area by quad of 4 b sqrt(1 - x^2/a^2); radii statistics and crown cover with mpmath at 40 digits.
Random values (numpy default_rng(20261120)); no field data.
    python3 tests/ref/make_crown_tm04.py  ->  tests/ref/crown_tm04.json
"""
import json
import math
import pathlib

import mpmath as mp
import numpy as np
from scipy.integrate import quad

mp.mp.dps = 40
here = pathlib.Path(__file__).parent
rng = np.random.default_rng(20261120)
Q = dict(epsabs=0, epsrel=1e-13, limit=200)

solids = []
for k in range(45):
    W = float(rng.uniform(0.5, 16)); L = float(rng.uniform(0.3, 25)); r = W / 2
    shape = ['cone', 'paraboloid', 'cylinder'][k % 3]
    if shape == 'cone':
        V, _ = quad(lambda z: math.pi * (r * z / L) ** 2, 0, L, **Q)
        S, _ = quad(lambda z: 2 * math.pi * (r * z / L) * math.sqrt(1 + (r / L) ** 2), 0, L, **Q)
    elif shape == 'paraboloid':
        V, _ = quad(lambda z: math.pi * r * r * z / L, 0, L, **Q)
        # z = t^2: rho = r t / sqrt(L), d rho/dz = r / (2 t sqrt(L)), dz = 2 t dt
        S, _ = quad(lambda t: 2 * math.pi * (r * t / math.sqrt(L)) * math.sqrt(1 + (r / (2 * t * math.sqrt(L))) ** 2) * 2 * t if t > 0 else 0.0, 0, math.sqrt(L), **Q)
    else:
        V, _ = quad(lambda z: math.pi * r * r, 0, L, **Q)
        S, _ = quad(lambda z: 2 * math.pi * r, 0, L, **Q)
    solids.append({'shape': shape, 'W': W, 'L': L, 'V': V, 'S': S})

radii = []
for k in range(40):
    n = int(rng.integers(1, 17)); rs = [float(x) for x in rng.uniform(0.2, 8, n)]
    m = mp.fsum([mp.mpf(x) for x in rs]) / n; rq = mp.sqrt(mp.fsum([mp.mpf(x) ** 2 for x in rs]) / n)
    radii.append({'r': rs, 'mean': float(m), 'rq': float(rq), 'area': float(mp.pi * rq ** 2)})

diams = []
for k in range(30):
    d1 = float(rng.uniform(0.5, 15)); d2 = float(rng.uniform(0.5, 15)); a, b = d1 / 2, d2 / 2
    E, _ = quad(lambda x: 4 * b * math.sqrt(max(0.0, 1 - (x / a) ** 2)), 0, a, **Q)
    D = (mp.mpf(d1) + d2) / 2
    diams.append({'d1': d1, 'd2': d2, 'circle': float(mp.pi / 4 * D ** 2), 'ellipse': E})

covers = []
for k in range(20):
    n = int(rng.integers(1, 80)); ws = [float(x) for x in rng.uniform(1, 14, n)]; A = float(rng.uniform(100, 2000))
    tot = mp.fsum([mp.pi / 4 * mp.mpf(w) ** 2 for w in ws])
    covers.append({'w': ws, 'A': A, 'total': float(tot), 'cover': float(tot / A)})

(here / 'crown_tm04.json').write_text(json.dumps({'solids': solids, 'radii': radii, 'diams': diams, 'covers': covers}))
print('crown_tm04.json:', len(solids), 'solids,', len(radii), 'radius sets,', len(diams), 'diameter pairs,', len(covers), 'plots')
