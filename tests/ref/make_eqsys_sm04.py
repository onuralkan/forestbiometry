"""Reference for nonlinear systems of equations (SM-04): python3 tests/ref/make_eqsys_sm04.py

Written apart from assets/lab/eqsys/calc.js (NumPy; the model functions and their Jacobians by central differences are
written out here). systemfit's nlsystemfit did not fit the volume equation of this sample (its nlm optimizer stalls with
coefficients of very different size; tests/ref/eqsys_sm04.json), so the nonlinear cases are referenced here instead.
Estimator: Parresol 2001 (Can. J. For. Res. 31: 865-878) Eq. 20-26 with the residual covariance of Henningsen and
Hamann 2007 Eq. 38 (geomean) or 37: first step joint OLS (shared coefficients), then Gauss-Newton on u'(S^-1 x I)u,
cov = [F'(S^-1 x I)F]^-1; iterated SUR repeats with S from the previous residuals. Also McElroy's R2 (Eq. 43) of the
linear systems of tests/ref/sm04_systems.R (systemfit reports the system OLS R2, not McElroy's).
Data: assets/lab/eqsys/ornek/ornek-sistem.csv. Writes tests/ref/eqsys_sm04_nl.json.
"""
import json, math, os
import numpy as np
here = os.path.dirname(os.path.abspath(__file__))
rows = [l.strip().split(';') for l in open(os.path.join(here, '..', '..', 'assets', 'lab', 'eqsys', 'ornek', 'ornek-sistem.csv'), encoding='utf-8')][1:]
A = np.array([[float(c.replace(',', '.')) for c in r[1:]] for r in rows if r and r[0]])
D, H, V = A[:, 0], A[:, 1], A[:, 2]
T = len(D)

def ht(p, D): return 1.3 + p['a'] * (1 - np.exp(-p['b'] * D)) ** p['c']
SYSTEMS = {
  # names of the coefficients, equations as functions of a dict of coefficients, responses, coefficients per equation
  'free': (['a', 'b', 'c', 'k', 'p', 'q'], [lambda p: ht(p, D), lambda p: p['k'] * D ** p['p'] * H ** p['q']], [H, V], [3, 3]),
  'compatible': (['a', 'b', 'c', 'k', 'p', 'q'], [lambda p: ht(p, D), lambda p: p['k'] * D ** p['p'] * ht(p, D) ** p['q']], [H, V], [3, 6]),
}
START = {'a': 30, 'b': 0.04, 'c': 1.2, 'k': 0.00006, 'p': 1.9, 'q': 1.0}

def fit(name, method, resid):
    names, fs, Y, K = SYSTEMS[name]; G = len(fs); P = len(names)
    def F(b): p = dict(zip(names, b)); return [f(p) for f in fs]
    def J(b):
        out = [np.zeros((T, P)) for _ in range(G)]
        for j in range(P):
            h = 1e-6 * max(abs(b[j]), 1e-12); bp = b.copy(); bm = b.copy(); bp[j] += h; bm[j] -= h
            fp, fm = F(bp), F(bm)
            for i in range(G): out[i][:, j] = (fp[i] - fm[i]) / (2 * h)
        return out
    def R(b, Si):
        f = F(b); U = [Y[i] - f[i] for i in range(G)]
        return sum(Si[i, j] * (U[i] @ U[j]) for i in range(G) for j in range(G)), U
    def gls(b, Si):
        for _ in range(500):
            R0, U = R(b, Si); Jm = J(b)
            A_ = sum(Si[i, j] * Jm[i].T @ Jm[j] for i in range(G) for j in range(G)); g = sum(Si[i, j] * Jm[i].T @ U[j] for i in range(G) for j in range(G))
            d = np.linalg.solve(A_, g); l = 1.0
            while l > 1e-12:
                bn = b + l * d; Rn, _ = R(bn, Si)
                if np.isfinite(Rn) and Rn <= R0: break
                l /= 2
            b = bn
            if np.max(np.abs(l * d) / (np.abs(b) + 1e-12)) < 1e-13: break
        Jm = J(b); A_ = sum(Si[i, j] * Jm[i].T @ Jm[j] for i in range(G) for j in range(G))
        return b, R(b, Si)[1], A_
    def sig(U):
        S = np.array([[U[i] @ U[j] for j in range(G)] for i in range(G)])
        if resid == 'noDfCor': return S / T
        return np.array([[S[i, j] / math.sqrt((T - K[i]) * (T - K[j])) for j in range(G)] for i in range(G)])
    b = np.array([START[n] for n in names], dtype=float)
    b, U, A_ = gls(b, np.eye(G))
    S = None; it = 0
    if method != 'OLS':
        S = sig(U)
        for it in range(1, 1001):
            bn, U, A_ = gls(b, np.linalg.inv(S))
            ch = math.sqrt(((bn - b) ** 2).sum() / (bn ** 2).sum()); b = bn
            if method == 'SUR' or ch < 1e-12: break
            S = sig(U)
    cov = np.linalg.inv(A_) if method != 'OLS' else None
    return {"coef": b.tolist(), "se": None if cov is None else np.sqrt(np.diag(cov)).tolist(), "sigmaUsed": None if S is None else S.tolist(),
            "ssr": [float(u @ u) for u in U], "residCov": sig(U).tolist()}

out = {}
for name in SYSTEMS:
    for method in ('OLS', 'SUR', 'ISUR'):
        out[f"{name}_{method}"] = fit(name, method, 'geomean')
    out[f"{name}_ISURml"] = fit(name, 'ISUR', 'noDfCor')
# McElroy R2 (Eq. 43) of the linear systems, from systemfit's own coefficients and the Sigma it used (first-step OLS residuals)
L = json.load(open(os.path.join(here, 'eqsys_sm04.json')))
lnD, lnH, lnV = np.log(D), np.log(H), np.log(V)
def mcelroy(c, restricted=False):
    u1 = lnH - (c[0] + c[1] * lnD); u2 = lnV - (c[2] + c[3] * lnD + c[4] * lnD ** 2)
    o = L['linear']['OLSr' if restricted else 'OLS']['coef']
    e1 = lnH - (o[0] + o[1] * lnD); e2 = lnV - (o[2] + o[3] * lnD + o[4] * lnD ** 2)
    K = [2, 2 if restricted else 3]
    S = np.array([[e1 @ e1, e1 @ e2], [e2 @ e1, e2 @ e2]]); S = np.array([[S[i, j] / math.sqrt((T - [2, 3][i]) * (T - [2, 3][j])) for j in range(2)] for i in range(2)])
    Si = np.linalg.inv(S); y = [lnH - lnH.mean(), lnV - lnV.mean()]; u = [u1, u2]
    num = sum(Si[i, j] * (u[i] @ u[j]) for i in range(2) for j in range(2)); den = sum(Si[i, j] * (y[i] @ y[j]) for i in range(2) for j in range(2))
    return 1 - num / den
out['mcelroy_SUR'] = mcelroy(L['linear']['SUR']['coef'])
json.dump(out, open(os.path.join(here, 'eqsys_sm04_nl.json'), 'w'), indent=1)
for k, v in out.items():
    if isinstance(v, dict): print(k, np.round(v['coef'], 8), None if v['se'] is None else np.round(v['se'], 6))
    else: print(k, v)
