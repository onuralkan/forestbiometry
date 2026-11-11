"""Reference for the diameter distribution engine, stage P16 (stand models; DIST_SPEC §4.1).

1. Simulated training data (fixed seed): plots with stand variables N (trees/ha), H (m), A (years), one or two periods,
   Weibull diameters (a = 0) whose scale and shape depend on the stand variables. Written as the tool's sample file
   assets/lab/dist/ornek/ornek-mescere.csv (made up, not measurements) and used as the test fixture.
2. Independent re-implementation with NumPy/SciPy of: per-unit targets (Weibull ML with a = 0: the profile likelihood equation solved by brentq, checked not to be
   worse than scipy weibull_min.fit(floc=0); moments with
   divisor n; numpy.quantile 'linear' = type 7); the source model y = exp(Zβ) + ε fitted by NLS (scipy least_squares,
   start from OLS on ln y); OLS on ln y (numpy lstsq); iterated SUR (feasible GLS: Σ from equation-wise residuals,
   divisor n; residuals whitened with L⁻¹, Σ = LLᵀ; joint least_squares; repeat until the relative change < 1e-10);
   plot-level K-fold cross-validation (plots in natural order, fold = j mod K) with the negative log-likelihood
   (scipy logpdf) and KS (scipy kstest) of each held-out unit; Weibull M2 recovery (brentq) for the PRM case.
Run: python3 tests/ref/make_dist_p16.py  (writes the sample CSV and tests/ref/dist_p16.json)
"""
import json, math, csv, os
import numpy as np
from scipy import stats, optimize, special

root = os.path.join(os.path.dirname(__file__), '..', '..')
rng = np.random.default_rng(20261116)
rows = []
for j in range(36):
    plot = f'A{j + 1:02d}'
    N0 = rng.uniform(350, 1500); A0 = rng.uniform(20, 70); site = rng.uniform(0.8, 1.2)
    for per, (dN, dA) in enumerate([(1.0, 0), (0.88, 5)] if j % 2 == 0 else [(1.0, 0)]):
        N = round(N0 * dN); A = round(A0 + dA); H = round(32 * site * (1 - math.exp(-0.035 * A)) ** 1.1, 1)
        RS = math.sqrt(10000 / N) / H
        b = math.exp(2.9 - 0.30 * math.log(N / 1000) + 0.45 * math.log(H / 20) - 5.0 / A + rng.normal(0, 0.05))
        c = math.exp(0.95 - 0.8 * RS + 0.12 * math.log(H / 20) + rng.normal(0, 0.06))
        n = max(8, round(N * 0.04))
        d = np.round(stats.weibull_min.rvs(c, scale=b, size=n, random_state=rng), 1)
        d = d[d > 0]
        for v in d: rows.append((plot, 2019 + 5 * per, float(v), N, H, A))
os.makedirs(os.path.join(root, 'assets/lab/dist/ornek'), exist_ok=True)
with open(os.path.join(root, 'assets/lab/dist/ornek/ornek-mescere.csv'), 'w', newline='') as fh:
    w = csv.writer(fh); w.writerow(['alan_no', 'donem', 'cap_cm', 'N_ha', 'H_m', 'yas'])
    for r in rows: w.writerow([r[0], r[1], f'{r[2]:.1f}', r[3], f'{r[4]:.1f}', r[5]])

# units
units = {}
for plot, per, d, N, H, A in rows:
    units.setdefault((plot, per), {'plot': plot, 'period': str(per), 'd': [], 'x': {'N': N, 'H': H, 'A': A}})['d'].append(d)
def natkey(s): return (s[0], int(s[1:]))
U = sorted(units.values(), key=lambda u: (natkey(u['plot']), u['period']))
for u in U: u['d'] = np.array(u['d'])

def design(x, terms):
    v = {'RS': math.sqrt(10000 / x['N']) / x['H'], 'lnN': math.log(x['N']), 'lnH': math.log(x['H']), 'invA': 1 / x['A']}
    return [1.0] + [v[t] for t in terms]
def targets(d, kind):
    if kind == 'ppm':   # ML with a = 0: profile equation for c solved by brentq (scipy's fit() stops at a looser tolerance)
        lx = np.log(d); g = lambda c: np.sum(d ** c * lx) / np.sum(d ** c) - 1 / c - lx.mean()
        c = optimize.brentq(g, 0.05, 50, xtol=1e-15, rtol=1e-15); b = np.mean(d ** c) ** (1 / c)
        c0, _, b0 = stats.weibull_min.fit(d, floc=0)
        assert -np.sum(stats.weibull_min.logpdf(d, c, scale=b)) <= -np.sum(stats.weibull_min.logpdf(d, c0, scale=b0)) + 1e-9   # not worse than scipy's fit
        return {'b': b, 'c': c}
    if kind == 'm2': return {'mean': d.mean(), 'variance': d.var(), 'dmin': d.min()}
    if kind == 'parresol': return {'mean': d.mean(), 'median': np.quantile(d, 0.5), 'dq': math.sqrt((d ** 2).mean())}
def logols(Z, y):
    beta, *_ = np.linalg.lstsq(Z, np.log(y), rcond=None); r = np.log(y) - Z @ beta
    return beta, float(r @ r / (len(y) - Z.shape[1]))
def nls(Z, y):
    b0, _ = logols(Z, y)
    r = optimize.least_squares(lambda b: y - np.exp(Z @ b), b0, method='lm', xtol=1e-15, ftol=1e-15, gtol=1e-15, max_nfev=20000)
    return r.x
def sur(Z, Y, iterate=True):
    K = Y.shape[1]; B = np.array([nls(Z, Y[:, k]) for k in range(K)]); n = len(Y); rounds = 0
    while True:
        rounds += 1
        R = Y - np.exp(Z @ B.T); S = R.T @ R / n; L = np.linalg.cholesky(S); W = np.linalg.inv(L)
        def res(th):
            Bt = th.reshape(K, -1); return ((Y - np.exp(Z @ Bt.T)) @ W.T).ravel()
        r = optimize.least_squares(res, B.ravel(), method='lm', xtol=1e-15, ftol=1e-15, gtol=1e-15, max_nfev=50000)
        Bn = r.x.reshape(K, -1); ch = np.max(np.abs(Bn - B) / np.maximum(np.abs(B), 1e-8)); B = Bn
        if not iterate or ch < 1e-10 or rounds >= 100: break
    R = Y - np.exp(Z @ B.T); S = R.T @ R / n
    return B, S, rounds
def m2_recover(t, a):
    m, v = t['mean'], t['variance']; G = lambda r, c: special.gamma(1 + r / c)
    g = lambda c: G(2, c) / G(1, c) ** 2 - 1 - v / (m - a) ** 2
    c = optimize.brentq(g, 0.05, 200, xtol=1e-15, rtol=1e-15); return {'a': a, 'b': (m - a) / G(1, c), 'c': c}

TERMS = ['RS', 'lnN', 'lnH', 'invA']
out = {'units': len(U), 'plots': len({u['plot'] for u in U}), 'trees': len(rows), 'cases': []}
def case(name, kind, keys, terms, fit, K=5):
    Z = np.array([design(u['x'], terms) for u in U]); T = [targets(u['d'], kind) for u in U]
    Y = np.array([[t[k] for k in keys] for t in T])
    c = {'name': name, 'kind': kind, 'keys': keys, 'terms': terms, 'fit': fit, 'targets0': {k: float(T[0][k]) for k in keys}}
    def fitall(Zt, Yt):
        if fit == 'nls': return np.array([nls(Zt, Yt[:, k]) for k in range(len(keys))]), None
        if fit == 'logols': res = [logols(Zt, Yt[:, k]) for k in range(len(keys))]; return np.array([r[0] for r in res]), [r[1] for r in res]
        B, S, rounds = sur(Zt, Yt); return B, (S, rounds)
    B, extra = fitall(Z, Y)
    c['beta'] = B.tolist()
    if fit == 'logols': c['s2Log'] = extra
    if fit == 'sur': c['Sigma'] = extra[0].tolist(); c['rounds'] = extra[1]
    # cross-validation by plot
    plots = sorted({u['plot'] for u in U}, key=natkey); fold = {p: j % K for j, p in enumerate(plots)}; cv = []
    for f in range(K):
        tr = [i for i, u in enumerate(U) if fold[u['plot']] != f]; te = [i for i, u in enumerate(U) if fold[u['plot']] == f]
        Bf, ex = fitall(Z[tr], Y[tr])
        for i in te:
            pred = {k: float(np.exp(Z[i] @ Bf[j])) for j, k in enumerate(keys)}
            if kind == 'ppm': p = {'a': 0, 'b': pred['b'], 'c': pred['c']}
            elif kind == 'm2': p = m2_recover(pred, 0.5 * pred['dmin'])
            else: cv.append({'plot': U[i]['plot'], 'period': U[i]['period'], 'pred': pred}); continue
            d = U[i]['d']; nll = -float(np.sum(stats.weibull_min.logpdf(d, p['c'], loc=p['a'], scale=p['b'])))
            if not math.isfinite(nll): cv.append({'plot': U[i]['plot'], 'period': U[i]['period'], 'outside': True, 'below': int(np.sum(d <= p['a']))}); continue
            ks = float(stats.kstest(d, stats.weibull_min(p['c'], loc=p['a'], scale=p['b']).cdf).statistic)
            cv.append({'plot': U[i]['plot'], 'period': U[i]['period'], 'nll': nll, 'ks': ks, 'b': p['b'], 'c': p['c']})
    c['cv'] = cv
    out['cases'].append(c)
case('ppm-nls', 'ppm', ['b', 'c'], TERMS, 'nls')
case('ppm-sur', 'ppm', ['b', 'c'], TERMS, 'sur')
case('ppm-logols', 'ppm', ['b', 'c'], TERMS, 'logols')
case('ppm-nls-subset', 'ppm', ['b', 'c'], ['RS', 'lnH'], 'nls')
case('m2-nls', 'm2', ['mean', 'variance', 'dmin'], TERMS, 'nls')
case('m2-sur', 'm2', ['mean', 'variance', 'dmin'], TERMS, 'sur')
case('parresol-nls', 'parresol', ['mean', 'median', 'dq'], TERMS, 'nls')
import scipy
out['versions'] = {'numpy': np.__version__, 'scipy': scipy.__version__}
json.dump(out, open(os.path.join(root, 'tests/ref/dist_p16.json'), 'w'), indent=1)
print(out['units'], 'units', out['plots'], 'plots', out['trees'], 'trees; cases', [c['name'] for c in out['cases']])
