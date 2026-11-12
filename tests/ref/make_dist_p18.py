"""Reference for the diameter distribution engine, stage P18 (L-moments, general QME, MGE; DIST_SPEC P18).

Independent of the JavaScript: sample L-moments from their combinatorial definition ℓ2 = ½·C(n,2)⁻¹ Σ_{i<j}(x₍ⱼ₎ − x₍ᵢ₎)
(not from probability-weighted moments); the theoretical L-moment ratios λ2/λ1 of the Weibull (1 − 2^(−1/c)) and of the
gamma (Γ(k+½)/(√π Γ(k+1))) checked by numerical integration λ2 = ∫ x (2F(x) − 1) f(x) dx (scipy.integrate.quad);
L-moment fits by solving λ2/λ1 = ℓ2/ℓ1 with brentq; QME with scipy least_squares on √wᵢ (ppf(pᵢ; θ) − q̂ᵢ) (numpy.quantile
'linear' = type 7); MGE by minimising scipy.stats.kstest / cramervonmises statistics and an Anderson–Darling A² from
logcdf/logsf, Nelder–Mead and Powell from several starts, best value kept.
Run: python3 tests/ref/make_dist_p18.py  (writes tests/ref/dist_p18.json)
"""
import json, math, os
import numpy as np
from scipy import stats, optimize, special, integrate

root = os.path.join(os.path.dirname(__file__), '..', '..')
rng = np.random.default_rng(20261118)
samples = {
    'g60': np.round(stats.gamma.rvs(6.5, scale=3.2, size=60, random_state=rng), 1),
    'w45': np.round(stats.weibull_min.rvs(2.3, scale=24, size=45, random_state=rng) + 5, 1),
}
out = {'samples': {k: v.tolist() for k, v in samples.items()}, 'lmom': {}, 'theory': [], 'lmomfit': [], 'qme': [], 'mge': []}
def lmom(x):
    x = np.sort(x); n = len(x); s = 0.0
    for j in range(n):
        s += np.sum(x[j] - x[:j])
    return x.mean(), 0.5 * s / (n * (n - 1) / 2)
for k, v in samples.items(): l1, l2 = lmom(v); out['lmom'][k] = {'l1': l1, 'l2': l2}
# theoretical ratios by integration
for (fam, p) in [('weibull', {'b': 20.0, 'c': 2.5}), ('weibull', {'b': 7.0, 'c': 0.8}), ('gamma', {'k': 6.5, 'theta': 3.2}), ('gamma', {'k': 0.7, 'theta': 10.0})]:
    D = stats.weibull_min(p['c'], scale=p['b']) if fam == 'weibull' else stats.gamma(p['k'], scale=p['theta'])
    lam2 = integrate.quad(lambda x: x * (2 * D.cdf(x) - 1) * D.pdf(x), 0, np.inf, epsabs=1e-13, epsrel=1e-13, limit=500)[0]
    out['theory'].append({'family': fam, 'params': p, 'lam1': D.mean(), 'lam2': lam2})
def wb_lmom(x, a):
    l1, l2 = lmom(x - a); t = l2 / l1; c = -math.log(2) / math.log(1 - t); return {'a': a, 'b': l1 / special.gamma(1 + 1 / c), 'c': c}
def ga_lmom(x):
    l1, l2 = lmom(x); t = l2 / l1
    g = lambda u: special.gammaln(math.exp(u) + 0.5) - special.gammaln(math.exp(u) + 1) - 0.5 * math.log(math.pi) - math.log(t)
    k = math.exp(optimize.brentq(g, math.log(1e-4), math.log(1e8), xtol=1e-15)); return {'k': k, 'theta': l1 / k}
out['lmomfit'] = [{'id': 'weibull.lmom', 's': 'w45', 'opts': {'a': 0}, 'params': wb_lmom(samples['w45'], 0)}, {'id': 'weibull.lmom', 's': 'w45', 'opts': {'a': 5}, 'params': wb_lmom(samples['w45'], 5)},
                  {'id': 'gamma.lmom', 's': 'g60', 'opts': {}, 'params': ga_lmom(samples['g60'])}]
def dist(fam, th, L=0, U=60):
    if fam == 'normal': return stats.norm(th[0], math.exp(th[1])), {'mu': th[0], 'sigma': math.exp(th[1])}
    if fam == 'gamma': return stats.gamma(math.exp(th[0]), scale=math.exp(th[1])), {'k': math.exp(th[0]), 'theta': math.exp(th[1])}
    return stats.beta(math.exp(th[0]), math.exp(th[1]), loc=L, scale=U - L), {'L': L, 'U': U, 'alpha': math.exp(th[0]), 'beta': math.exp(th[1])}
def start(fam, x, L=0, U=60):
    m, v = x.mean(), x.var()
    if fam == 'normal': return [m, math.log(math.sqrt(v))]
    if fam == 'gamma': return [math.log(m * m / v), math.log(v / m)]
    mu = (m - L) / (U - L); vy = v / (U - L) ** 2; t = mu * (1 - mu) / vy - 1; return [math.log(mu * t), math.log((1 - mu) * t)]
for fam, s, probs, w in [('normal', 'g60', [0.1, 0.25, 0.5, 0.75, 0.9], None), ('gamma', 'g60', [0.1, 0.25, 0.5, 0.75, 0.9], [1, 2, 4, 2, 1]), ('gamma', 'g60', [0.25, 0.75], None), ('beta', 'w45', [0.1, 0.25, 0.5, 0.75, 0.9], None)]:
    x = samples[s]; q = np.quantile(x, probs); wv = np.ones(len(probs)) if w is None else np.array(w, float)
    r = optimize.least_squares(lambda th: np.sqrt(wv) * (dist(fam, th)[0].ppf(probs) - q), start(fam, x), xtol=1e-15, ftol=1e-15, gtol=1e-15, max_nfev=20000)
    out['qme'].append({'family': fam, 's': s, 'probs': probs, 'weights': w, 'L': 0 if fam == 'beta' else None, 'U': 60 if fam == 'beta' else None, 'params': dist(fam, r.x)[1], 'objective': float(np.sum(r.fun ** 2))})
def stat(g, D, x):
    if g == 'ks': return stats.kstest(x, D.cdf).statistic
    if g == 'cvm': return stats.cramervonmises(x, D.cdf).statistic
    s = np.sort(x); n = len(s); i = np.arange(1, n + 1)
    return -n - np.sum((2 * i - 1) * (D.logcdf(s) + D.logsf(s[::-1]))) / n
for fam, s, g in [('normal', 'g60', 'cvm'), ('normal', 'g60', 'ks'), ('gamma', 'g60', 'ad'), ('gamma', 'g60', 'cvm'), ('beta', 'w45', 'cvm'), ('beta', 'w45', 'ad')]:
    x = samples[s]; best = None; f = lambda th: stat(g, dist(fam, th)[0], x) if np.all(np.isfinite(th)) else np.inf
    st0 = np.array(start(fam, x))
    for shift in [[0, 0], [0.1, -0.1], [-0.1, 0.1], [0.2, 0.2], [-0.2, -0.2]]:
        for meth in ['Nelder-Mead', 'Powell']:
            r = optimize.minimize(f, st0 + np.array(shift), method=meth, options={'xatol': 1e-12, 'fatol': 1e-15, 'maxiter': 40000, 'maxfev': 80000} if meth == 'Nelder-Mead' else {'xtol': 1e-12, 'ftol': 1e-15, 'maxiter': 40000})
            if best is None or r.fun < best[0]: best = (float(r.fun), r.x)
    out['mge'].append({'family': fam, 's': s, 'gof': g, 'L': 0 if fam == 'beta' else None, 'U': 60 if fam == 'beta' else None, 'params': dist(fam, best[1])[1], 'objective': best[0]})
import scipy
out['versions'] = {'numpy': np.__version__, 'scipy': scipy.__version__}
json.dump(out, open(os.path.join(root, 'tests/ref/dist_p18.json'), 'w'), indent=1)
print('ok', {k: len(v) for k, v in out.items() if isinstance(v, list)})
