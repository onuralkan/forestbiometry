"""Reference for the per-hectare stand table of the Diameter Distribution tool (stage P25, METHODS §12 P25).

Written from the definition, not from the tool's code: plots of different sizes; for each class [lo, hi) the trees per
hectare of every plot y_ik = n_ik * 10000 / A_i (numpy.digitize, right=False: a tree on a boundary goes to the upper
class), then the mean over the plots and SE = s / sqrt(m) with s the n-1 standard deviation (Cochran 1977, simple
random sampling, no finite population correction). Trees outside the classes in their own row.
Run from the repository root: python3 tests/ref/make_dist_p25.py  (writes tests/ref/dist_p25.json)
"""
import json
import numpy as np

rng = np.random.default_rng(20261123)
areas = [400.0, 400.0, 500.0, 1000.0, 250.0]
plots = []
for i, a in enumerate(areas):
    n = int(rng.integers(6, 30))
    d = np.round(5 + 30 * rng.weibull(2.2, n), 1)
    plots.append({'plot': f'P{i + 1}', 'area': a, 'd': d.tolist()})
edges = [8.0, 12.0, 16.0, 20.0, 24.0, 28.0, 32.0, 36.0]       # last class [32, 36); trees below 8 or from 36 are outside
m = len(plots)
Y = np.zeros((m, len(edges) - 1))
out = np.zeros(m)
tot = np.zeros(m)
for i, p in enumerate(plots):
    d = np.array(p['d'])
    k = np.digitize(d, edges, right=False) - 1                 # class index; -1 below, len-1.. above
    f = 10000.0 / p['area']
    for j in range(len(edges) - 1):
        Y[i, j] = np.sum(k == j) * f
    out[i] = np.sum((k < 0) | (k >= len(edges) - 1)) * f
    tot[i] = len(d) * f
se = lambda v: float(np.std(v, ddof=1) / np.sqrt(len(v)))
res = {'edges': edges, 'plots': plots,
       'rows': [{'lo': edges[j], 'hi': edges[j + 1], 'mean': float(Y[:, j].mean()), 'se': se(Y[:, j])} for j in range(len(edges) - 1)],
       'outside': {'mean': float(out.mean()), 'se': se(out)}, 'total': {'mean': float(tot.mean()), 'se': se(tot)},
       'pooledFactor': 10000.0 / sum(areas)}
json.dump(res, open('tests/ref/dist_p25.json', 'w'), indent=1)
print('wrote tests/ref/dist_p25.json', m, 'plots')
