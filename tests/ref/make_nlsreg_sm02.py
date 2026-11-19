"""Reference for nonlinear regression (SM-02): python3 tests/ref/make_nlsreg_sm02.py

Written apart from assets/lab/nlsreg/calc.js and core/expr.js (NumPy; the model functions are written out by hand and
the Jacobian is taken by central differences, Gauss-Newton with step halving). Data: the simulated sample of the page,
assets/lab/nlsreg/ornek/ornek-nls.csv (random test numbers, no species' values). Cases:
  cr      H = b0 (1 - exp(-b1 D))^b2                         unweighted
  crh     H = 1.3 + b0 (1 - exp(-b1 D))^b2                   unweighted, start [30, 0.03, 1]
  logi    H = b0 / (1 + b1 exp(-b2 D))                       unweighted
  pow2w   V = a D^b H^c, psi = D^theta, theta from ln e^2 = c + theta ln D on the unweighted residuals (Parresol 2001 Eq. 4)
  powc    V = a D^b H^c, psi = (D^2 H)^2 given as a weight column
For each: coefficients, SE (sigma^2 (Z' Psi^-1 Z)^-1, sigma^2 = S/(n - p)), sigma^2, AIC (Gaussian, variance sigma^2 psi,
k = p + 1), RMSE, bias (mean of y - yhat; 19 Nov 2026), R2 = 1 - SSE/SST, and intervals at D = 30 cm, H = 20 m with Student t
(0.975, n - p): mean z' V z, new observation sigma^2 psi + z' V z. Writes tests/ref/nlsreg_sm02.json.
"""
import json, math, os
import numpy as np

here = os.path.dirname(os.path.abspath(__file__))
rows = [l.strip().split(';') for l in open(os.path.join(here, '..', '..', 'assets', 'lab', 'nlsreg', 'ornek', 'ornek-nls.csv'), encoding='utf-8')][1:]
data = np.array([[float(c.replace(',', '.')) for c in r[1:]] for r in rows if r and r[0]])
D, H, V = data[:, 0], data[:, 1], data[:, 2]
n = len(D)

def t975(df):
    # Student t quantile by bisection on the cdf (regularized incomplete beta via continued fraction)
    def betacf(a, b, x):
        qab, qap, qam = a + b, a + 1, a - 1; c, d = 1.0, 1 - qab * x / qap; d = 1 / d; h = d
        for m in range(1, 300):
            m2 = 2 * m; aa = m * (b - m) * x / ((qam + m2) * (a + m2)); d = 1 + aa * d; c = 1 + aa / c; d = 1 / d; h *= d * c
            aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2)); d = 1 + aa * d; c = 1 + aa / c; d = 1 / d; de = d * c; h *= de
            if abs(de - 1) < 1e-15: break
        return h
    def ibeta(a, b, x):
        if x <= 0: return 0.0
        if x >= 1: return 1.0
        bt = math.exp(math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b) + a * math.log(x) + b * math.log(1 - x))
        return bt * betacf(a, b, x) / a if x < (a + 1) / (a + b + 2) else 1 - bt * betacf(b, a, 1 - x) / b
    cdf = lambda t: 1 - 0.5 * ibeta(df / 2, 0.5, df / (df + t * t))
    lo, hi = 0.0, 10.0
    for _ in range(200):
        m = (lo + hi) / 2
        if cdf(m) < 0.975: lo = m
        else: hi = m
    return (lo + hi) / 2

def fit(f, y, b, psi):
    w = 1 / psi
    def jac(b):
        J = np.zeros((n, len(b)))
        for j in range(len(b)):
            h = 1e-6 * max(abs(b[j]), 1e-8); bp = b.copy(); bm = b.copy(); bp[j] += h; bm[j] -= h
            J[:, j] = (f(bp) - f(bm)) / (2 * h)
        return J
    for _ in range(1000):
        r = y - f(b); J = jac(b); d = np.linalg.solve(J.T @ (J * w[:, None]), J.T @ (w * r)); S0 = (w * r * r).sum(); l = 1.0
        while l > 1e-14:
            bn = b + l * d; rn = y - f(bn)
            if np.all(np.isfinite(rn)) and (w * rn * rn).sum() <= S0: break
            l /= 2
        b = bn
        if np.max(np.abs(l * d) / (np.abs(b) + 1e-300)) < 1e-13: break
    r = y - f(b); J = jac(b); S = (w * r * r).sum(); p = len(b); s2 = S / (n - p)
    cov = s2 * np.linalg.inv(J.T @ (J * w[:, None]))
    yh = f(b); lnL = -n / 2 * math.log(2 * math.pi * S / n) - 0.5 * np.log(psi).sum() - n / 2
    return b, cov, s2, yh, 2 * (p + 1) - 2 * lnL

cases = {}
def case(name, fmodel, fpoint, y, b0, psi, psi_point, theta=None):
    b, cov, s2, yh, aic = fit(fmodel, y, np.array(b0, dtype=float), psi)
    p = len(b); t = t975(n - p)
    # gradient at the point by central differences
    g = np.array([(fpoint(b + e * 1e-6 * max(abs(b[j]), 1e-8)) - fpoint(b - e * 1e-6 * max(abs(b[j]), 1e-8))) / (2e-6 * max(abs(b[j]), 1e-8)) for j, e in enumerate(np.eye(p))])
    S2 = g @ cov @ g; yhat = fpoint(b)
    cases[name] = {"theta": b.tolist(), "se": np.sqrt(np.diag(cov)).tolist(), "s2": s2, "aic": aic, "t": t,
                   "rmse": float(np.sqrt(((yh - y) ** 2).mean())), "bias": float((y - yh).mean()), "r2": float(1 - ((y - yh) ** 2).sum() / ((y - y.mean()) ** 2).sum()),
                   "weight_theta": theta, "point": {"yhat": yhat, "S2": S2, "ci": [yhat - t * math.sqrt(S2), yhat + t * math.sqrt(S2)], "pi": [yhat - t * math.sqrt(S2 + s2 * psi_point), yhat + t * math.sqrt(S2 + s2 * psi_point)]}}

one = np.ones(n)
cr = lambda b, d=None: b[0] * (1 - np.exp(-b[1] * (D if d is None else d))) ** b[2]
case('cr', lambda b: cr(b), lambda b: float(cr(b, 30.0)), H, [30, 0.04, 1.1], one, 1.0)
case('crh', lambda b: 1.3 + cr(b), lambda b: float(1.3 + cr(b, 30.0)), H, [30, 0.03, 1], one, 1.0)
lg = lambda b, d=None: b[0] / (1 + b[1] * np.exp(-b[2] * (D if d is None else d)))
case('logi', lambda b: lg(b), lambda b: float(lg(b, 30.0)), H, [30, 5, 0.08], one, 1.0)
pw = lambda b, d=None, h=None: b[0] * (D if d is None else d) ** b[1] * (H if h is None else h) ** b[2]
# weight theta (Eq. 4) from the unweighted fit
bu, _, _, yhu, _ = fit(lambda b: pw(b), V, np.array([6e-5, 2.0, 1.0]), one)
e = V - yhu; X = np.column_stack([one, np.log(D)]); th = float(np.linalg.lstsq(X, np.log(e * e), rcond=None)[0][1])
case('pow2w', lambda b: pw(b), lambda b: float(pw(b, 30.0, 20.0)), V, bu, D ** th, 30.0 ** th, th)
case('powc', lambda b: pw(b), lambda b: float(pw(b, 30.0, 20.0)), V, [6e-5, 2.0, 1.0], (D * D * H) ** 2, (900 * 20.0) ** 2)
json.dump({"n": n, "cases": cases}, open(os.path.join(here, 'nlsreg_sm02.json'), 'w'), indent=1)
for k, c in cases.items(): print(k, np.round(c["theta"], 8), 'aic', round(c["aic"], 4), 'pi', np.round(c["point"]["pi"], 5))
