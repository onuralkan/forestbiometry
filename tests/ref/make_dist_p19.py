"""Reference for the diameter distribution engine, stage P19: Johnson SB all-parameter recovery, Fonseca, Marques and
Parresol (2009), Forest Science 55(4): 367-373 (read: eqs 6, 7, 9, 10, 11; appendix A1-A3).

Independent of the JavaScript: μ′r(Y) by mpmath quadrature of the source's eq. 10, μ′r = (1/√(2π)) ∫ [1 + e^{−(z−γ)/δ}]^{−r}
e^{−z²/2} dz (30 digits); summaries (mean, median, Dq, d̄_G = m3/m2) from known parameters; recovery by scipy
least_squares on the three moment equations with γ eliminated by the median (eq. 6), from a grid of starts, distinct
solutions collected; a simulated stand (fixed seed) for raw-data targets with d̄_G = Σ g·d / Σ g, g = π d²/40000;
condition numbers of the scaled Jacobian at the true parameters as γ → 0 (symmetric case).
Run: python3 tests/ref/make_dist_p19.py  (writes tests/ref/dist_p19.json)
"""
import json, math, os
import numpy as np
import mpmath as mp
from scipy import optimize, stats

mp.mp.dps = 30
root = os.path.join(os.path.dirname(__file__), '..', '..')
def mu(r, g, d):
    f = lambda z: (1 + mp.e ** (-(z - g) / d)) ** (-r) * mp.e ** (-z * z / 2)
    return float(mp.quad(f, [-mp.inf, g - 4 * d, g, g + 4 * d, mp.inf]) / mp.sqrt(2 * mp.pi))
def summ(p):
    x, l, g, d = p['xi'], p['lambda'], p['gamma'], p['delta']; u1, u2, u3 = mu(1, g, d), mu(2, g, d), mu(3, g, d)
    m1 = x + l * u1; m2 = x * x + 2 * x * l * u1 + l * l * u2; m3 = x ** 3 + 3 * x * x * l * u1 + 3 * x * l * l * u2 + l ** 3 * u3
    return {'mean': m1, 'median': x + l / (1 + math.exp(g / d)), 'dq': math.sqrt(m2), 'dg': m3 / m2}
def recover(s):
    M, m1, m2, m3 = s['median'], s['mean'], s['dq'] ** 2, s['dg'] * s['dq'] ** 2
    def par(v):
        xi, lam, de = v; return xi, lam, de, de * math.log((xi + lam - M) / (M - xi))
    def res(v):
        xi, lam, de, ga = par(v)
        if not (0 <= xi < M and lam > M - xi and de > 0): return [1e3, 1e3, 1e3]
        u1, u2, u3 = mu(1, ga, de), mu(2, ga, de), mu(3, ga, de)
        return [(xi + lam * u1) / m1 - 1, (xi * xi + 2 * xi * lam * u1 + lam * lam * u2) / m2 - 1, (xi ** 3 + 3 * xi * xi * lam * u1 + 3 * xi * lam * lam * u2 + lam ** 3 * u3) / m3 - 1]
    sols = []
    for f0 in [0.2, 0.5, 0.8]:
        for r0 in [0.5, 2, 8]:
            for d0 in [0.5, 1.5]:
                xi0 = f0 * M; v0 = [xi0, (M - xi0) * (1 + r0), d0]
                try: r = optimize.least_squares(res, v0, method='lm', xtol=1e-15, ftol=1e-15, gtol=1e-15, max_nfev=4000, diff_step=1e-8)
                except Exception: continue
                if max(abs(np.array(r.fun))) < 1e-10:
                    xi, lam, de, ga = par(r.x)
                    if not any(abs(q['xi'] - xi) < 1e-6 * max(1, xi) and abs(q['lambda'] - lam) < 1e-6 * lam for q in sols): sols.append({'xi': xi, 'lambda': lam, 'gamma': ga, 'delta': de})
    return sols
def condition(p):
    s = summ(p); M, t = s['median'], [s['mean'], s['dq'] ** 2, s['dg'] * s['dq'] ** 2]
    def f(v):
        xi, lam, de = v; ga = de * math.log((xi + lam - M) / (M - xi)); u1, u2, u3 = mu(1, ga, de), mu(2, ga, de), mu(3, ga, de)
        return np.array([(xi + lam * u1) / t[0], (xi * xi + 2 * xi * lam * u1 + lam * lam * u2) / t[1], (xi ** 3 + 3 * xi * xi * lam * u1 + 3 * xi * lam * lam * u2 + lam ** 3 * u3) / t[2]])
    v = np.array([p['xi'], p['lambda'], p['delta']]); f0 = f(v); h = 1e-6
    J = np.column_stack([(f(v + h * np.eye(3)[j] * max(1, abs(v[j]))) - f0) / (h * max(1, abs(v[j]))) for j in range(3)])
    sv = np.linalg.svd(J, compute_uv=False); return float(sv[0] / sv[-1])
out = {'cases': [], 'symmetry': []}
for p in [{'xi': 4.0, 'lambda': 40.0, 'gamma': 0.8, 'delta': 1.4}, {'xi': 8.0, 'lambda': 30.0, 'gamma': -0.6, 'delta': 0.9}, {'xi': 2.0, 'lambda': 55.0, 'gamma': 1.5, 'delta': 2.2}]:
    s = summ(p); out['cases'].append({'kind': 'exact', 'true': p, 'summary': s, 'solutions': recover(s)})
s = summ({'xi': 4.0, 'lambda': 40.0, 'gamma': 0.8, 'delta': 1.4}); sr = {k: round(v, 2) for k, v in s.items()}
out['cases'].append({'kind': 'rounded', 'true': None, 'summary': sr, 'solutions': recover(sr)})
rng = np.random.default_rng(20261119); z = rng.standard_normal(400); y = 1 / (1 + np.exp(-(z - 0.7) / 1.2)); d = np.round(6 + 38 * y, 1)
g = math.pi * d ** 2 / 40000; sraw = {'mean': float(d.mean()), 'median': float(np.quantile(d, 0.5)), 'dq': float(math.sqrt((d ** 2).mean())), 'dg': float(np.sum(g * d) / np.sum(g))}
out['cases'].append({'kind': 'raw', 'true': None, 'summary': sraw, 'd': d.tolist(), 'solutions': recover(sraw)})
for gm in [0.1, 0.01, 0.001]:
    out['symmetry'].append({'gamma': gm, 'cond': condition({'xi': 5.0, 'lambda': 40.0, 'gamma': gm, 'delta': 1.3})})
out['versions'] = {'numpy': np.__version__, 'mpmath': mp.__version__}
json.dump(out, open(os.path.join(root, 'tests/ref/dist_p19.json'), 'w'), indent=1)
for c in out['cases']: print(c['kind'], len(c['solutions']), c['solutions'][:1])
print([(q['gamma'], round(q['cond'])) for q in out['symmetry']])
