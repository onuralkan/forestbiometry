"""Reference for the stand-model comparison of the Diameter Distribution tool (stage P26, METHODS §12 P26).

Written from the definitions (Poudel and Cao 2013, Eqs. 6-9; backward elimination at the 5% level), not from the tool's
code, on the simulated sample assets/lab/dist/ornek/ornek-mescere.csv:
1. Statistics of a unit under given three-parameter Weibull parameters (scipy.stats.weibull_min): AD (Eq. 6),
   KS D (Eq. 7, scipy.stats.kstest), mLogL = -sum logpdf (Eq. 8), EI = sum_k |n_k N/n - N [F(hi_k) - F(lo_k)]|
   over classes of width 2 cm from floor(min/2)*2 (Eq. 9, trees per hectare).
2. Backward elimination for the method-2 responses (mean, variance with divisor n) and Dmin on all units with the four
   terms RS, ln N, ln H, 1/A: NLS of y = exp(Z b) (scipy least_squares, start: lstsq on ln y), SE from sigma2 (J'J)^-1
   with sigma2 = SSE/(n - p), two-sided p of t = b/SE with df = n - p (scipy.stats.t); the term with the largest p is
   dropped while p > 0.05.
Run from the repository root: python3 tests/ref/make_dist_p26.py  (writes tests/ref/dist_p26.json)
"""
import csv, json
import numpy as np
from scipy import stats, optimize

rows = list(csv.reader(open('assets/lab/dist/ornek/ornek-mescere.csv')))[1:]
units = {}
for r in rows:
    k = (r[0], r[1])
    u = units.setdefault(k, {'plot': r[0], 'period': r[1], 'd': [], 'N': float(r[3]), 'H': float(r[4]), 'A': float(r[5])})
    u['d'].append(float(r[2]))
U = list(units.values())

def ad(d, a, b, c):
    s = np.sort(d); n = len(s); i = np.arange(1, n + 1)
    lF = stats.weibull_min.logcdf(s, c, loc=a, scale=b); lS = stats.weibull_min.logsf(s[::-1], c, loc=a, scale=b)
    return float(-n - np.sum((2 * i - 1) * (lF + lS)) / n)

def ei(d, N, a, b, c, w=2.0):
    d = np.asarray(d); n = len(d); lo0 = np.floor(d.min() / w) * w; m = int(np.floor((d.max() - lo0) / w)) + 1
    k = np.minimum(m - 1, np.floor((d - lo0) / w).astype(int)); s = 0.0
    for j in range(m):
        lo, hi = lo0 + j * w, lo0 + (j + 1) * w
        F = stats.weibull_min.cdf([lo, hi], c, loc=a, scale=b)
        s += abs(np.sum(k == j) * N / n - N * (F[1] - F[0]))
    return float(s)

evals = []
for j, (b, c) in zip([0, 5, 11, 20], [(14.0, 2.1), (18.5, 3.0), (11.0, 1.6), (22.0, 2.6)]):
    u = U[j]; d = np.array(u['d']); a = 0.5 * d.min()
    evals.append({'plot': u['plot'], 'period': u['period'], 'params': {'a': a, 'b': b, 'c': c},
                  'ad': ad(d, a, b, c), 'ks': float(stats.kstest(d, 'weibull_min', args=(c, a, b)).statistic),
                  'mlogl': float(-np.sum(stats.weibull_min.logpdf(d, c, loc=a, scale=b))), 'ei': ei(d, u['N'], a, b, c)})

def Zrow(u, terms):
    v = {'RS': np.sqrt(10000 / u['N']) / u['H'], 'lnN': np.log(u['N']), 'lnH': np.log(u['H']), 'invA': 1 / u['A']}
    return [1.0] + [v[t] for t in terms]

def nls(y, terms):
    Z = np.array([Zrow(u, terms) for u in U]); b0 = np.linalg.lstsq(Z, np.log(y), rcond=None)[0]
    r = optimize.least_squares(lambda b: np.exp(Z @ b) - y, b0, xtol=1e-15, ftol=1e-15, gtol=1e-15, max_nfev=20000)
    b = r.x; J = Z * np.exp(Z @ b)[:, None]; n, p = Z.shape; s2 = np.sum((y - np.exp(Z @ b)) ** 2) / (n - p)
    se = np.sqrt(np.diag(s2 * np.linalg.inv(J.T @ J))); return b, se, n - p

targets = {'mean': np.array([np.mean(u['d']) for u in U]), 'variance': np.array([np.var(u['d']) for u in U]),
           'dmin': np.array([np.min(u['d']) for u in U])}
elim = {}
for k, y in targets.items():
    terms, steps = ['RS', 'lnN', 'lnH', 'invA'], []
    while terms:
        b, se, df = nls(y, terms); pv = 2 * stats.t.sf(np.abs(b[1:] / se[1:]), df); w = int(np.argmax(pv))
        if not pv[w] > 0.05: break
        steps.append({'term': terms[w], 'p': float(pv[w])}); terms = [t for i, t in enumerate(terms) if i != w]
    b, se, df = nls(y, terms) if terms else (None, None, None)
    elim[k] = {'terms': terms, 'steps': steps, 'beta': b.tolist() if b is not None else None}
json.dump({'units': len(U), 'evals': evals, 'elimination': elim}, open('tests/ref/dist_p26.json', 'w'), indent=1)
print('wrote tests/ref/dist_p26.json', {k: (v['terms'], [s['term'] for s in v['steps']]) for k, v in elim.items()})
