"""Reference for the nonlinear additive biomass system (BC-02/a2): python3 tests/ref/make_biomass_bc02n.py

Written apart from assets/lab/biomass/nsur.js (NumPy). Data: Parresol (2001) Table 1, slash pine, n = 40
(tests/ref/parresol2001_slashpine.json). Components wood = a(D2H)^b, bark = aD^b, crown = aD^b H^c (Eq. 15/18).
Weighted method: unweighted Gauss-Newton fits from ln-scale OLS starts; theta from OLS of ln e^2 on [1, g] (Eq. 4) with
g = ln D2H (wood), ln D (bark), [ln D, H^2] (crown), ln(D H) (total, residuals of the sum of the unweighted fits, Eq. 19);
EGNLS refits (Eq. 7-9); Sigma (Eq. 21) from the weighted residuals, the total's from the sum of the EGNLS fits with
K_total = 7; Gauss-Newton NSUR (Eq. 24-26); intervals at D = 20 cm, H = 17 m (Eq. 27-28) with t = 2 as in the paper.
Log method (Example 2, Eq. 32): every equation on the ln scale, psi = 1, Sigma from the ln-scale OLS residuals and
ln(total) - ln(sum of their fits). A second case uses a total column with one value changed and the crown with the
weight D^theta1 e^(theta2 H). Writes tests/ref/biomass_bc02n.json.
"""
import json, os
import numpy as np

here = os.path.dirname(os.path.abspath(__file__))
data = json.load(open(os.path.join(here, 'parresol2001_slashpine.json')))
R = np.array(data['rows'], dtype=float)
D, H = R[:, 0], R[:, 1]
T = len(D)

def f(vs, b):
    y = np.full(T if np.ndim(vs[0]) else 1, b[0], dtype=float)
    for v, e in zip(vs, b[1:]): y = y * np.asarray(v, dtype=float) ** e
    return y

def jac(vs, b):
    y = f(vs, b); return np.column_stack([y / b[0]] + [y * np.log(v) for v in vs])

def start(vs, y):
    X = np.column_stack([np.ones(T)] + [np.log(v) for v in vs]); c = np.linalg.lstsq(X, np.log(y), rcond=None)[0]
    c[0] = np.exp(c[0]); return c

def gn(vs, y, psi, b, log=False):
    w = 1 / psi; yy = np.log(y) if log else y
    def res(b):
        p = f(vs, b); return yy - (np.log(p) if log else p)
    for _ in range(500):
        r = res(b); Z = jac(vs, b)
        if log: Z = Z / f(vs, b)[:, None]
        d = np.linalg.solve(Z.T @ (Z * w[:, None]), Z.T @ (w * r)); S0 = (w * r * r).sum(); l = 1.0
        while l > 1e-12:
            bn = b + l * d; rn = res(bn)
            if np.all(np.isfinite(rn)) and (w * rn * rn).sum() <= S0: break
            l /= 2
        b = bn
        if np.max(np.abs(l * d) / np.abs(b)) < 1e-12: break
    r = res(b); Z = jac(vs, b)
    if log: Z = Z / f(vs, b)[:, None]
    K = len(b); s2 = (w * r * r).sum() / (T - K); cov = s2 * np.linalg.inv(Z.T @ (Z * w[:, None]))
    return b, np.sqrt(np.diag(cov)), s2, r

def theta(r, G):
    X = np.column_stack([np.ones(T)] + G); return np.linalg.lstsq(X, np.log(r * r), rcond=None)[0][1:]

def fit_stats(y, yh, K):
    r = y - yh; sse = r @ r; return {"Se": float(np.sqrt(sse / (T - K))), "bias": float(r.mean()), "FI": float(1 - sse / ((y - y.mean()) ** 2).sum())}

def system(Y, ytot, V, Gc, method):
    comps = len(V); K = [len(v) + 1 for v in V]; P = sum(K); off = [sum(K[:i]) for i in range(comps)]; M = comps + 1
    log = method == 'log'; ones = np.ones(T)
    st = [start(V[i], Y[i]) for i in range(comps)]
    if log:
        single = [gn(V[i], Y[i], ones, st[i].copy(), log=True) for i in range(comps)]; psis = [ones] * M; ths = [None] * M
    else:
        unw = [gn(V[i], Y[i], ones, st[i].copy()) for i in range(comps)]
        eTU = ytot - sum(f(V[i], unw[i][0]) for i in range(comps))
        ths = [(theta(unw[i][3], Gc[i]) if Gc[i] else None) for i in range(comps)] + [theta(eTU, Gc[comps]) if Gc[comps] else None]
        psis = [np.exp(np.column_stack(Gc[i]) @ ths[i]) if Gc[i] else ones for i in range(M)]
        single = [gn(V[i], Y[i], psis[i], unw[i][0].copy()) for i in range(comps)]
    s1 = sum(f(V[i], single[i][0]) for i in range(comps))
    eT = np.log(ytot) - np.log(s1) if log else ytot - s1
    E = [single[i][3] for i in range(comps)] + [eT]; Kx = K + [P]
    Ew = [E[i] / np.sqrt(psis[i]) for i in range(M)]
    Sig = np.array([[Ew[i] @ Ew[j] / np.sqrt((T - Kx[i]) * (T - Kx[j])) for j in range(M)] for i in range(M)])
    Si = np.linalg.inv(Sig)
    ys = [np.log(y) for y in Y + [ytot]] if log else Y + [ytot]
    def F(beta):
        fs, Js = [], []
        for i in range(comps):
            b = beta[off[i]:off[i] + K[i]]; J = np.zeros((T, P)); J[:, off[i]:off[i] + K[i]] = jac(V[i], b); fs.append(f(V[i], b)); Js.append(J)
        fs.append(sum(fs)); Js.append(sum(Js))
        if log: Js = [J / x[:, None] for J, x in zip(Js, fs)]; fs = [np.log(x) for x in fs]
        return fs, Js
    def Rof(e): return sum(Si[i, j] * ((e[i] / np.sqrt(psis[i])) @ (e[j] / np.sqrt(psis[j]))) for i in range(M) for j in range(M))
    beta = np.concatenate([s[0] for s in single])
    for _ in range(500):
        fs, Js = F(beta); e = [ys[i] - fs[i] for i in range(M)]; R0 = Rof(e)
        A = np.zeros((P, P)); g = np.zeros(P)
        for i in range(M):
            for j in range(M):
                wij = Si[i, j] / np.sqrt(psis[i] * psis[j]); A += Js[i].T @ (Js[j] * wij[:, None]); g += Js[i].T @ (wij * e[j])
        d = np.linalg.solve(A, g); l = 1.0
        while l > 1e-12:
            bn = beta + l * d; fn = F(bn)[0]
            if all(np.all(np.isfinite(x)) for x in fn) and Rof([ys[i] - fn[i] for i in range(M)]) <= R0: break
            l /= 2
        beta = bn
        if np.max(np.abs(l * d) / np.abs(beta)) < 1e-12: break
    fs, Js = F(beta); e = [ys[i] - fs[i] for i in range(M)]
    A = np.zeros((P, P))
    for i in range(M):
        for j in range(M): A += Js[i].T @ (Js[j] * (Si[i, j] / np.sqrt(psis[i] * psis[j]))[:, None])
    cov = np.linalg.inv(A); s2 = Rof(e) / (M * T - P)
    kg = [f(V[i], beta[off[i]:off[i] + K[i]]) for i in range(comps)]; kg.append(sum(kg))
    out = {"theta": [None if t is None else t.tolist() for t in ths], "single_b": [s[0].tolist() for s in single], "single_se": [s[1].tolist() for s in single],
           "sigma": Sig.tolist(), "beta": beta.tolist(), "se": np.sqrt(np.diag(cov)).tolist(), "s2": float(s2),
           "stats": [fit_stats((Y + [ytot])[i], kg[i], Kx[i]) for i in range(M)], "proc1": fit_stats(ytot, s1, P)}
    # intervals at D = 20, H = 17, t = 2 (paper) — equations in order, total last
    Dp, Hp = 20.0, 17.0
    VV = [[np.array([x]) for x in vv] for vv in VP]
    z = []; fp = []
    for i in range(comps):
        b = beta[off[i]:off[i] + K[i]]; row = np.zeros(P); row[off[i]:off[i] + K[i]] = jac(VV[i], b)[0]; z.append(row); fp.append(f(VV[i], b)[0])
    z.append(sum(z)); fp.append(sum(fp))
    iv = []
    for i in range(M):
        zi = z[i] / fp[i] if log else z[i]; S2 = zi @ cov @ zi
        psi = 1.0 if log or ths[i] is None else float(np.exp(np.array(GP[i]) @ ths[i]))
        c = 2 * np.sqrt(S2); p = 2 * np.sqrt(S2 + s2 * Sig[i, i] * psi)
        if log: m = np.log(fp[i]); iv.append({"yhat": fp[i], "S2": S2, "ci": [np.exp(m - c), np.exp(m + c)], "pi": [np.exp(m - p), np.exp(m + p)]})
        else: iv.append({"yhat": fp[i], "S2": S2, "ci": [fp[i] - c, fp[i] + c], "pi": [fp[i] - p, fp[i] + p]})
    out["intervals"] = [{k: (float(v) if not isinstance(v, list) else [float(x) for x in v]) for k, v in r.items()} for r in iv]
    return out

Y = [R[:, 4], R[:, 5], R[:, 6]]
V = [[D * D * H], [D], [D, H]]
VP = [[20.0 ** 2 * 17], [20.0], [20.0, 17.0]]
out = {}
Gc = [[np.log(D * D * H)], [np.log(D)], [np.log(D), H * H], [np.log(D * H)]]
GP = [[np.log(6800)], [np.log(20)], [np.log(20), 289.0], [np.log(340)]]
out["weighted"] = system(Y, R[:, 7], V, Gc, 'weighted')
out["log"] = system(Y, R[:, 7], V, Gc, 'log')
# second case: total column with tree 10 changed to 75.0 kg, bark unweighted, crown weight D^theta1 e^(theta2 H)
ytot2 = R[:, 7].copy(); ytot2[9] = 75.0
GP = [[np.log(6800)], [], [np.log(20), 17.0], [np.log(340)]]
out["case2"] = system(Y, ytot2, V, [[np.log(D * D * H)], [], [np.log(D), H], [np.log(D * H)]], 'weighted')
json.dump(out, open(os.path.join(here, 'biomass_bc02n.json'), 'w'), indent=1)
print('weighted beta', np.round(out["weighted"]["beta"], 6), 's2', out["weighted"]["s2"])
print('log beta', np.round(out["log"]["beta"], 6))
print('case2 beta', np.round(out["case2"]["beta"], 6))
print('intervals', out["weighted"]["intervals"][3])
