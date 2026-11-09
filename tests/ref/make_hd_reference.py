"""Reference values for the Height–Diameter Modelling tool (tests/hd/test_hd.mjs).

Independent of the JavaScript code: own starting values, SciPy least_squares (method='lm', numerical Jacobian),
covariance from a central-difference Jacobian, numpy for metrics, scipy.stats.t for quantiles.
Writes:
  tests/hd/fixture.csv                    synthetic multi-plot data (fixed seed; NOT real measurements)
  assets/lab/hd/ornek/ornek-boy-cap.csv  the same data as the tool's sample file
  tests/ref/hd.json                       reference values
Run: python3 tests/ref/make_hd_reference.py
"""
import json, os, csv
import numpy as np
from scipy.optimize import least_squares
from scipy import stats

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BH = 1.3

# ---------------- models (same parametrisations as lmfor::HDmodels, bh added outside) ----------------
def f_naslund(t, d): a, b = t; return d**2 / (a + b*d)**2
def f_michailoff(t, d): a, b = t; return a*np.exp(-b/d)
def f_curtis(t, d): a, b = t; return a*(d/(1+d))**b
def f_power(t, d): a, b = t; return a*d**b
def f_richards(t, d): a, b, c = t; return a*(1-np.exp(-b*d))**c
def f_weibull(t, d): a, b, c = t; return a*(1-np.exp(-b*d**c))
MODELS = [('naslund', f_naslund, 2), ('michailoff', f_michailoff, 2), ('curtis', f_curtis, 2), ('power', f_power, 2),
          ('richards', f_richards, 3), ('weibull', f_weibull, 3)]

def starts(name, d, z):
    zm = z.max()
    if name == 'naslund':   # d/sqrt(z) = a + b d
        b, a = np.polyfit(d, d/np.sqrt(z), 1); return [[a, b]]
    if name == 'michailoff':
        b1, b0 = np.polyfit(1/d, np.log(z), 1); return [[np.exp(b0), -b1]]
    if name == 'curtis':
        b1, b0 = np.polyfit(np.log(d/(1+d)), np.log(z), 1); return [[np.exp(b0), b1]]
    if name == 'power':
        b1, b0 = np.polyfit(np.log(d), np.log(z), 1); return [[np.exp(b0), b1]]
    out = []
    for k in (1.1, 1.5, 2.5):
        a = k*zm
        if name == 'weibull':
            c, lb = np.polyfit(np.log(d), np.log(-np.log(1 - z/a)), 1); out.append([a, np.exp(lb), c])
        else:
            for c in (0.8, 1.3, 2.0):
                u = (z/a)**(1/c); b = np.sum(d*-np.log1p(-u))/np.sum(d*d); out.append([a, b, c])
    return out

def fit(name, f, p, d, z):
    best = None
    for s in starts(name, d, z):
        try:
            r = least_squares(lambda t: f(t, d) - z, s, method='lm', xtol=1e-15, ftol=1e-15, gtol=1e-15, max_nfev=20000)
        except Exception:
            continue
        if not np.all(np.isfinite(r.x)): continue
        sse = float(np.sum(r.fun**2))
        if best is None or sse < best[1]: best = (r.x, sse)
    return best

def jac_cd(f, t, d):
    t = np.asarray(t, float); J = np.empty((len(d), len(t)))
    for j in range(len(t)):
        h = 1e-6*max(abs(t[j]), 1e-3); tp = t.copy(); tm = t.copy(); tp[j] += h; tm[j] -= h
        J[:, j] = (f(tp, d) - f(tm, d))/(2*h)
    return J

def summarise(name, f, p, d, z, inference=True):
    th, sse = fit(name, f, p, d, z)
    n = len(d); e = f(th, d) - z
    out = dict(theta=list(map(float, th)), sse=sse, n=n, rmse=float(np.sqrt(sse/n)), mae=float(np.mean(np.abs(e))), bias=float(np.mean(e)),
               sigma=float(np.sqrt(sse/(n-p))))
    ll = -n/2*(np.log(2*np.pi) + np.log(sse/n) + 1); k = p + 1
    out.update(logLik=float(ll), aic=float(2*k - 2*ll), bic=float(k*np.log(n) - 2*ll))
    if inference:
        J = jac_cd(f, th, d); V = np.linalg.inv(J.T @ J) * sse/(n-p)
        tq = stats.t.ppf(0.975, n-p)
        out.update(se=list(map(float, np.sqrt(np.diag(V)))), tq=float(tq))
        pts = {}
        for dd in (8.0, 20.0, 35.0, 60.0):
            g = jac_cd(f, th, np.array([dd]))[0]; v = float(g @ V @ g); y = BH + float(f(th, np.array([dd]))[0])
            pts[str(dd)] = dict(yhat=y, ci=[y - tq*np.sqrt(v), y + tq*np.sqrt(v)], pi=[y - tq*np.sqrt(sse/(n-p) + v), y + tq*np.sqrt(sse/(n-p) + v)])
        out['at'] = pts
    return out

# ---------------- mulberry32 + Fisher–Yates (same as assets/lab/core/stats.js) ----------------
def mulberry32(seed):
    a = seed & 0xFFFFFFFF
    def imul(x, y): return (x*y) & 0xFFFFFFFF
    def nxt():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = imul(t ^ (t >> 15), t | 1)
        t ^= (t + imul(t ^ (t >> 7), t | 61)) & 0xFFFFFFFF
        t &= 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF)/4294967296
    return nxt
def shuffle(arr, seed):
    a = list(arr); r = mulberry32(seed)
    for i in range(len(a)-1, 0, -1):
        j = int(r()*(i+1)); a[i], a[j] = a[j], a[i]
    return a

def cv(d, z, plots, mode):
    n = len(d)
    if mode == 'plot':
        ups = sorted(set(plots), key=lambda s: (0, int(s)) if s.isdigit() else (1, s))
        folds = [[i for i in range(n) if plots[i] == p] for p in ups]; labels = ups
    else:
        K = min(10, n); order = shuffle(list(range(n)), 20261109)
        folds = [sorted(order[k::K]) for k in range(K)]; labels = [str(k+1) for k in range(K)]
    per = []
    for lab, test in zip(labels, folds):
        ts = set(test); tr = [i for i in range(n) if i not in ts]
        dt, zt = d[tr], z[tr]
        res = []
        for name, f, p in MODELS:
            th, sse = fit(name, f, p, dt, zt)
            ntr = len(tr); ll = -ntr/2*(np.log(2*np.pi) + np.log(sse/ntr) + 1)
            res.append((th, 2*(p+1) - 2*ll))
        sel = int(np.argmin([r[1] for r in res]))
        preds = [list(map(float, BH + f(r[0], d[test]))) for (name, f, p), r in zip(MODELS, res)]
        per.append(dict(label=lab, test=test, preds=preds, sel=sel, nOutside=int(np.sum((d[test] < dt.min()) | (d[test] > dt.max())))))
    allE = [[] for _ in MODELS]; selE = []
    for fo in per:
        for j, i in enumerate(fo['test']):
            for k in range(len(MODELS)): allE[k].append(fo['preds'][k][j] - (z[i] + BH))
            selE.append(fo['preds'][fo['sel']][j] - (z[i] + BH))
    met = lambda e: dict(n=len(e), bias=float(np.mean(e)), mae=float(np.mean(np.abs(e))), rmse=float(np.sqrt(np.mean(np.square(e)))))
    return dict(models=[met(np.array(e)) for e in allE], selection=met(np.array(selE)), sel=[fo['sel'] for fo in per],
                nOutside=sum(fo['nOutside'] for fo in per), nFolds=len(per))

# ---------------- synthetic data ----------------
def make_data():
    rng = np.random.default_rng(20261109)
    rows = []; tree = 0
    for p in range(1, 9):
        A = 24 + rng.normal(0, 3.0); k = int(rng.integers(26, 44))
        for _ in range(k):
            tree += 1
            d = round(float(4 + rng.gamma(3.0, 6.0)), 1)
            h = round(float(BH + A*(1 - np.exp(-0.06*d))**1.3 + rng.normal(0, 1.0)), 1)
            sp = 'Ab' if (p in (3, 6) and rng.random() < 0.3) else 'Pn'
            hs = '' if rng.random() < 0.15 else f'{h:.1f}'
            rows.append([f'P{p}', str(tree), sp, f'{d:.1f}', hs])
    # edge cases (documented in tests/hd/test_hd.mjs)
    rows.append(['P1', '901', 'Pn', '2.0', '1.2'])     # h <= bh: excluded from fitting
    rows.append(['P2', '902', 'Pn', '15.5', '?'])      # unreadable height
    rows.append(['P2', '903', 'Pn', '', '12.0'])       # missing diameter
    rows.append(['P4', '904', 'Pn', '95.0', ''])       # missing height, far above the diameter range
    rows.append(['P5', '905', 'Pn', '0.8', ''])        # missing height, below the diameter range
    return rows

def main():
    rows = make_data()
    head = ['ornek_alan', 'agac_no', 'tur', 'cap_cm', 'boy_m']
    for path in (os.path.join(ROOT, 'tests/hd/fixture.csv'), os.path.join(ROOT, 'assets/lab/hd/ornek/ornek-boy-cap.csv')):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w', newline='', encoding='utf-8') as fh:
            w = csv.writer(fh); w.writerow(head); w.writerows(rows)
    def usable(rr, species=None):
        out = [r for r in rr if r[3] and r[4] not in ('', '?') and (species is None or r[2] == species)]
        out = [r for r in out if float(r[4]) > BH and float(r[3]) > 0]
        return np.array([float(r[3]) for r in out]), np.array([float(r[4]) - BH for r in out]), [r[0][1:] for r in out]
    ref = {'note': 'Synthetic data (numpy default_rng(20261109)); not real measurements.', 'bh': BH}
    d, z, plots = usable(rows)
    ref['all'] = dict(n=len(d), dmin=float(d.min()), dmax=float(d.max()), fits={name: summarise(name, f, p, d, z, inference=False) for name, f, p in MODELS})
    ref['all']['cv_plot'] = cv(d, z, plots, 'plot')
    ref['all']['cv_tree'] = cv(d, z, plots, 'tree')
    one = [r for r in rows if r[0] == 'P1']
    d1, z1, p1 = usable(one)
    ref['P1'] = dict(n=len(d1), dmin=float(d1.min()), dmax=float(d1.max()), fits={name: summarise(name, f, p, d1, z1) for name, f, p in MODELS})
    ref['P1']['cv_tree'] = cv(d1, z1, p1, 'tree')
    ds, zs, ps = usable(rows, 'Ab')
    ref['species_Ab'] = dict(n=len(ds), fits={'weibull': summarise('weibull', f_weibull, 3, ds, zs, inference=False)})
    ref['t_ppf'] = {f'{q}|{nu}': float(stats.t.ppf(q, nu)) for q in (0.975, 0.95, 0.995, 0.6) for nu in (1, 2, 3, 5, 10, 29, 30, 100, 1000)}
    ref['t_cdf'] = {f'{t}|{nu}': float(stats.t.cdf(t, nu)) for t in (-3.1, -0.4, 0.0, 0.7, 2.2, 12.0) for nu in (1, 4, 17, 250)}
    ref['shuffle'] = shuffle(list(range(12)), 20261109)
    ref['versions'] = dict(numpy=np.__version__, scipy=__import__('scipy').__version__)
    with open(os.path.join(ROOT, 'tests/ref/hd.json'), 'w') as fh: json.dump(ref, fh, indent=1)
    print('n all', len(d), 'n P1', len(d1), 'n Ab', len(ds))

if __name__ == '__main__':
    main()
