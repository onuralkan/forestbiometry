"""Reference for bark thickness and under-bark diameter (TM-03/a1).

Written apart from the JavaScript code (assets/lab/tree/bark.js).
- Points: random over-bark diameters and bark readings; the under-bark diameter, the bark area, its share and the
  log volumes (mid diameter x length) with mpmath at 40 digits; girths over and under bark give the peripheral
  thickness (c_ob - c_ub)/(2 pi).
- Sample trees: the ratio-of-means bark factor sum(d_ub)/sum(d_ob) and the least-squares line d_ub = a + b d_ob by
  numpy.polyfit (a different algorithm from the closed form in the code), R^2 and the residual standard error.
- Equations: the six registered forms evaluated with random coefficients (ln forms with a correction factor).
Random values (numpy default_rng(20261119)); no field data, no published coefficients.
    python3 tests/ref/make_bark_tm03.py  ->  tests/ref/bark_tm03.json
"""
import json
import pathlib

import mpmath as mp
import numpy as np

mp.mp.dps = 40
here = pathlib.Path(__file__).parent
rng = np.random.default_rng(20261119)
PI = mp.pi
ga = lambda d: PI / 40000 * mp.mpf(d) ** 2

points = []
for k in range(80):
    dob = float(rng.uniform(5, 90))
    reads = [float(x) for x in rng.uniform(0.5, min(40, dob * 2.5), int(rng.integers(1, 6)))]
    L = float(rng.uniform(1, 12)) if k % 2 else None
    B1 = mp.fsum([mp.mpf(x) for x in reads]) / len(reads)
    dub = mp.mpf(dob) - 2 * B1 / 10
    gob, gub = ga(dob), ga(dub)
    r = {'dob': dob, 'reads': reads, 'L': L, 'B1': float(B1), 'dub': float(dub), 'gob': float(gob), 'gub': float(gub),
         'gBark': float(gob - gub), 'pct': float((gob - gub) / gob * 100)}
    if L is not None:
        r.update({'Vob': float(gob * L), 'Vub': float(gub * L), 'Vbark': float((gob - gub) * L)})
    points.append(r)

girths = []
for k in range(40):
    cub = float(rng.uniform(15, 250)); cob = cub + float(rng.uniform(0.2, 25))
    girths.append({'cob': cob, 'cub': cub, 'B1': float((mp.mpf(cob) - cub) / (2 * PI) * 10),
                   'dob': float(mp.mpf(cob) / PI), 'dub': float(mp.mpf(cub) / PI)})

samples = []
for k in range(30):
    n = int(rng.integers(3, 60))
    dob = rng.uniform(8, 70, n)
    dub = dob * rng.uniform(0.82, 0.97) - rng.uniform(0, 1.2) + rng.normal(0, 0.4, n)
    dub = np.minimum(dub, dob)
    k_ = float(mp.fsum([mp.mpf(float(x)) for x in dub]) / mp.fsum([mp.mpf(float(x)) for x in dob]))
    b, a = np.polyfit(dob, dub, 1)
    res = dub - (a + b * dob)
    sse = float(np.sum(res ** 2)); syy = float(np.sum((dub - dub.mean()) ** 2))
    samples.append({'dob': dob.tolist(), 'dub': dub.tolist(), 'k': k_, 'a': float(a), 'b': float(b), 'r2': 1 - sse / syy, 'se': (sse / (n - 2)) ** 0.5})

forms = []
for k in range(60):
    D = float(rng.uniform(5, 80))
    kind = ['ratio', 'lin', 'b1.lin', 'b2.lin', 'b1.loglog', 'b2.loglog'][k % 6]
    if kind == 'ratio':
        p = {'k': float(rng.uniform(0.8, 0.97))}; dub = mp.mpf(p['k']) * D; cf = None
    elif kind == 'lin':
        p = {'a': float(rng.uniform(-1.5, 0)), 'b': float(rng.uniform(0.85, 0.97))}; dub = mp.mpf(p['a']) + mp.mpf(p['b']) * D; cf = None
    elif kind.endswith('.lin'):
        p = {'a': float(rng.uniform(0, 4)), 'b': float(rng.uniform(0.1, 0.4))}; y = mp.mpf(p['a']) + mp.mpf(p['b']) * D
        dub = D - (2 * y if kind == 'b1.lin' else y) / 10; cf = None
    else:
        p = {'a': float(rng.uniform(-0.5, 0.8)), 'b': float(rng.uniform(0.6, 1.0))}; cf = float(rng.uniform(1.0, 1.05))
        y = mp.e ** (mp.mpf(p['a']) + mp.mpf(p['b']) * mp.log(D)) * cf
        dub = D - (2 * y if kind == 'b1.loglog' else y) / 10
    forms.append({'form': kind, 'p': p, 'D': D, 'cf': cf, 'dub': float(dub)})

out = {'points': points, 'girths': girths, 'samples': samples, 'forms': forms}
(here / 'bark_tm03.json').write_text(json.dumps(out, indent=None))
print('bark_tm03.json:', len(points), 'points,', len(girths), 'girth pairs,', len(samples), 'samples,', len(forms), 'equations')
