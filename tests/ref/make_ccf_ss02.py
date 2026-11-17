"""Reference for the crown competition factor (SS-02, CCF).

Written apart from the JavaScript code (assets/lab/structure/ccf.js).
- Stands of random trees (diameter, species, a per-hectare weight) with random crown-width or crown-area coefficients:
  CCF = sum w * 100 * MCA / 10000 in mpmath at 40 digits (Kershaw et al. 2016 eqs 8.26-8.27), and, for the crown-width
  form, the same total by Kershaw's expanded eq. 8.27: 100/(4A) * pi * (b0^2 sum n + 2 b0 b1 sum d n + b1^2 sum d^2 n).
- Open-grown trees: the least-squares line CW = b0 + b1 d by numpy.polyfit.
Random values (numpy default_rng(20261121)); no field data, no published coefficients.
    python3 tests/ref/make_ccf_ss02.py  ->  tests/ref/ccf_ss02.json
"""
import json
import pathlib

import mpmath as mp
import numpy as np

mp.mp.dps = 40
here = pathlib.Path(__file__).parent
rng = np.random.default_rng(20261121)
A = mp.mpf(10000)

stands = []
for k in range(40):
    n = int(rng.integers(1, 60)); w = float(rng.uniform(10, 1000))
    d = [float(x) for x in rng.uniform(5, 70, n)]; sp = [['A', 'B', 'C'][int(x)] for x in rng.integers(0, 3, n)]
    sets = {}
    for s in ['A', 'B', 'C']:
        if k % 2 == 0:
            sets[s] = {'form': 'cw', 'p': {'b0': float(rng.uniform(0.3, 2)), 'b1': float(rng.uniform(0.08, 0.25))}}
        else:
            sets[s] = {'form': 'mca', 'p': {'b0': float(rng.uniform(0.5, 3)), 'b1': float(rng.uniform(0.05, 0.6)), 'b2': float(rng.uniform(0.005, 0.06))}}
    tot = mp.mpf(0); mcas = []
    for di, si in zip(d, sp):
        q = sets[si]
        if q['form'] == 'cw':
            cw = mp.mpf(q['p']['b0']) + mp.mpf(q['p']['b1']) * di; m = mp.pi * cw ** 2 / 4
        else:
            m = mp.mpf(q['p']['b0']) + mp.mpf(q['p']['b1']) * di + mp.mpf(q['p']['b2']) * mp.mpf(di) ** 2
        mcas.append(float(m)); tot += w * 100 * m / A
    rec = {'d': d, 'sp': sp, 'w': w, 'sets': sets, 'mca': mcas, 'ccf': float(tot)}
    if k % 2 == 0:   # one species set for all trees: Kershaw's expanded form, independently
        b0, b1 = mp.mpf(sets['A']['p']['b0']), mp.mpf(sets['A']['p']['b1'])
        N = n * mp.mpf(w); Sd = mp.fsum([mp.mpf(x) for x in d]) * w; Sd2 = mp.fsum([mp.mpf(x) ** 2 for x in d]) * w
        rec['ccfAllA'] = float(100 / (4 * A) * mp.pi * (b0 ** 2 * N + 2 * b0 * b1 * Sd + b1 ** 2 * Sd2))
    stands.append(rec)

fits = []
for k in range(25):
    n = int(rng.integers(3, 50)); d = rng.uniform(5, 80, n); cw = 0.8 + 0.17 * d + rng.normal(0, 0.6, n); cw = np.abs(cw) + 0.1
    b1, b0 = np.polyfit(d, cw, 1); res = cw - (b0 + b1 * d); sse = float(np.sum(res ** 2)); syy = float(np.sum((cw - cw.mean()) ** 2))
    fits.append({'d': d.tolist(), 'cw': cw.tolist(), 'b0': float(b0), 'b1': float(b1), 'r2': 1 - sse / syy, 'se': (sse / (n - 2)) ** 0.5})

(here / 'ccf_ss02.json').write_text(json.dumps({'stands': stands, 'fits': fits}))
print('ccf_ss02.json:', len(stands), 'stands,', len(fits), 'fits')
