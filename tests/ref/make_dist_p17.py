"""Reference for the diameter distribution engine, stage P17 (CDFR and modified CDFR for stand models; DIST_SPEC §4.2).

Independent NumPy/SciPy re-implementation on the sample stand data assets/lab/dist/ornek/ornek-mescere.csv (written by
make_dist_p16.py): units plot × period; start coefficients from NLS (scipy least_squares on y − exp(Zβ), start log-OLS);
objectives
  CDFR           Σᵢ (1/nᵢ) Σⱼ [(j − 0.5)/nᵢ − F(dᵢ₍ⱼ₎)]²            (sorted diameters, equal values consecutive j)
  modified CDFR  Σᵢ 1/(mᵢ − 1) Σ_{j<mᵢ} [Cᵢⱼ − F(uᵢⱼ)]²             (classes of width w from floor(min/w)·w, true upper
                                                                    bounds, last class out of the objective only)
with F the Weibull CDF (scipy.stats.weibull_min) of the parameters the model predicts for unit i: PPM b, c (a = 0, or
a = 0.5·predicted Dmin with the Dmin equation from NLS held fixed); PRM M2: predicted mean, variance (and Dmin, NLS,
fixed) → c by brentq, b = (m − a)/Γ(1 + 1/c), a = 0.5·Dmin. Minimised with scipy least_squares (2-point Jacobian).
Run: python3 tests/ref/make_dist_p17.py  (writes tests/ref/dist_p17.json)
"""
import json, math, csv, os
import numpy as np
from scipy import stats, optimize, special

root = os.path.join(os.path.dirname(__file__), '..', '..')
units = {}
with open(os.path.join(root, 'assets/lab/dist/ornek/ornek-mescere.csv')) as fh:
    for r in csv.DictReader(fh):
        u = units.setdefault((r['alan_no'], r['donem']), {'plot': r['alan_no'], 'period': r['donem'], 'd': [], 'x': {'N': float(r['N_ha']), 'H': float(r['H_m']), 'A': float(r['yas'])}})
        u['d'].append(float(r['cap_cm']))
U = sorted(units.values(), key=lambda u: ((u['plot'][0], int(u['plot'][1:])), u['period']))
for u in U: u['d'] = np.array(u['d'])
TERMS = ['RS', 'lnN', 'lnH', 'invA']
def design(x):
    return [1.0, math.sqrt(10000 / x['N']) / x['H'], math.log(x['N']), math.log(x['H']), 1 / x['A']]
Z = np.array([design(u['x']) for u in U])
def ml_b_c(d, a):
    x = d - a; lx = np.log(x); g = lambda c: np.sum(x ** c * lx) / np.sum(x ** c) - 1 / c - lx.mean()
    c = optimize.brentq(g, 0.05, 50, xtol=1e-15, rtol=1e-15); return np.mean(x ** c) ** (1 / c), c
def nls(y):
    b0, *_ = np.linalg.lstsq(Z, np.log(y), rcond=None)
    return optimize.least_squares(lambda b: y - np.exp(Z @ b), b0, method='lm', xtol=1e-15, ftol=1e-15, gtol=1e-15, max_nfev=20000).x
def rows_of(fit, w):
    out = []
    for i, u in enumerate(U):
        d = np.sort(u['d']); n = len(d)
        if fit == 'cdfr':
            for j, v in enumerate(d): out.append((i, v, (j + 0.5) / n, 1 / n))
        else:
            lo = math.floor(d.min() / w) * w; m = int(math.floor((d.max() - lo) / w)) + 1
            cnt = np.zeros(m)
            for v in d: cnt[min(m - 1, int(math.floor((v - lo) / w)))] += 1
            cum = np.cumsum(cnt) / n
            for j in range(m - 1): out.append((i, lo + (j + 1) * w, cum[j], 1 / (m - 1)))
    return out
def m2_params(mean, var, dmin):
    a = 0.5 * dmin; G = lambda r, c: special.gamma(1 + r / c)
    c = optimize.brentq(lambda c: G(2, c) / G(1, c) ** 2 - 1 - var / (mean - a) ** 2, 0.05, 200, xtol=1e-15, rtol=1e-15)
    return a, (mean - a) / G(1, c), c
def case(name, kind, fit, w=2, loc='zero'):
    if kind == 'ppm':
        T = [];
        for u in U:
            a = 0.5 * u['d'].min() if loc == 'half' else 0.0; b, c = ml_b_c(u['d'], a); T.append((b, c, u['d'].min()))
        T = np.array(T); B0 = [nls(T[:, 0]), nls(T[:, 1])]; Bd = nls(T[:, 2]) if loc == 'half' else None
        def params(th):
            Bb, Bc = th[:5], th[5:]; P = []
            for i in range(len(U)):
                a = 0.5 * math.exp(Z[i] @ Bd) if loc == 'half' else 0.0
                P.append((a, math.exp(Z[i] @ Bb), math.exp(Z[i] @ Bc)))
            return P
    else:
        T = np.array([(u['d'].mean(), u['d'].var(), u['d'].min()) for u in U]); B0 = [nls(T[:, 0]), nls(T[:, 1])]; Bd = nls(T[:, 2])
        def params(th):
            return [m2_params(math.exp(Z[i] @ th[:5]), math.exp(Z[i] @ th[5:]), math.exp(Z[i] @ Bd)) for i in range(len(U))]
    R = rows_of(fit, w); idx = np.array([r[0] for r in R]); xv = np.array([r[1] for r in R]); yv = np.array([r[2] for r in R]); sw = np.sqrt(np.array([r[3] for r in R]))
    def res(th):
        P = params(th); a = np.array([P[i][0] for i in idx]); b = np.array([P[i][1] for i in idx]); c = np.array([P[i][2] for i in idx])
        F = np.where(xv > a, 1 - np.exp(-((np.maximum(xv - a, 0)) / b) ** c), 0.0)
        return sw * (yv - F)
    th0 = np.concatenate(B0); s0 = float(np.sum(res(th0) ** 2))
    r = optimize.least_squares(res, th0, method='lm', xtol=1e-14, ftol=1e-14, gtol=1e-14, max_nfev=20000)
    return {'name': name, 'kind': kind, 'fit': fit, 'width': w, 'loc': loc, 'start_beta': th0.tolist(), 'start': s0, 'beta': r.x.tolist(), 'objective': float(np.sum(r.fun ** 2)),
            'dmin_beta': Bd.tolist() if Bd is not None else None, 'rows': len(R)}
out = {'units': len(U), 'cases': [case('ppm-cdfr', 'ppm', 'cdfr'), case('ppm-mcdfr-2', 'ppm', 'mcdfr', 2), case('ppm-mcdfr-4', 'ppm', 'mcdfr', 4),
                                  case('ppm-cdfr-half', 'ppm', 'cdfr', loc='half'), case('m2-cdfr', 'm2', 'cdfr'), case('m2-mcdfr-3', 'm2', 'mcdfr', 3)]}
import scipy
out['versions'] = {'numpy': np.__version__, 'scipy': scipy.__version__}
json.dump(out, open(os.path.join(root, 'tests/ref/dist_p17.json'), 'w'), indent=1)
for c in out['cases']: print(c['name'], c['rows'], c['start'], '→', c['objective'])
