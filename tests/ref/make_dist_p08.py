"""Reference for the diameter distribution engine, stage P08 (Johnson SB with fixed ξ, λ; docs/DIST_SPEC.md).

SciPy/NumPy/mpmath only; nothing shared with the JavaScript code:
  - scipy.stats.johnsonsb(a=γ, b=δ, loc=ξ, scale=λ) on grids reaching both bounds. Near the upper bound SciPy forms
    1 − (x − ξ)/λ and loses digits, so there it is called on the reflected distribution johnsonsb(−γ, δ, loc=0, scale=λ)
    at U − x (an identity of the SB family, not the JavaScript formula)
  - moments E[D], Var[D] with mpmath.quad at 40 digits (SciPy's johnsonsb.stats is only ~1e-8 accurate here)
  - CML: Nelder–Mead on −Σ johnsonsb.logpdf over (γ, ln δ) and johnsonsb.fit(floc, fscale)
  - percentiles: least_squares on ppf(p) = Q_p, ppf(r) = Q_r (numpy type-7 sample quantiles)
  - moments: least_squares on (E[D], Var[D]) = (m, v), the moments by scipy.integrate.quad over z (epsrel 1e-13)
  - DIST_SPEC §8.1 Johnson SB row
Samples: tests/weibull/fixture.json with stated bounds and simulated SB samples (numpy default_rng(20261114); NOT real
measurements). The bounds are test inputs, not a rule for real data.

    python3 tests/ref/make_dist_p08.py  →  tests/ref/dist_p08.json
"""
import json
import pathlib

import mpmath as mp
import numpy as np
import scipy
from scipy import integrate, optimize, stats

mp.mp.dps = 40
here = pathlib.Path(__file__).parent
FX = json.loads((here.parent / "weibull" / "fixture.json").read_text())["samples"]
rng = np.random.default_rng(20261114)
SB = lambda g, dl, xi, lam: stats.johnsonsb(g, dl, loc=xi, scale=lam)
SIM = {
    "sim_sb_asym": (np.round(SB(0.6, 1.3, 5, 40).rvs(150, random_state=rng), 2), 5.0, 40.0),
    "sim_sb_sym": (np.round(SB(0.0, 2.0, 0, 60).rvs(100, random_state=rng), 2), 0.0, 60.0),
    "sim_sb_left": (np.round(SB(-1.5, 0.9, 2, 50).rvs(120, random_state=rng), 3), 2.0, 50.0),
}
near_bound = SIM["sim_sb_asym"][0]
SIM["sim_near_bounds"] = (near_bound, float(near_bound.min()) - 0.01, float(near_bound.max() - near_bound.min()) + 0.02)   # bounds 0.01 cm outside the data
BOUNDS = {"w2": (0.0, 60.0), "w3": (0.0, 80.0), "small": (10.0, 35.0), "skewed": (0.0, 70.0)}
out = {"scipy": scipy.__version__, "numpy": np.__version__, "mpmath": mp.__version__, "seed": 20261114,
       "sim": {k: dict(d=v[0].tolist(), xi=v[1], lambda_=v[2]) for k, v in SIM.items()}, "bounds": BOUNDS}


def side_eval(g, dl, xi, lam, x):
    U = xi + lam
    if x - xi <= U - x:
        D = SB(g, dl, xi, lam)
        return dict(pdf=D.pdf(x), logpdf=D.logpdf(x), cdf=D.cdf(x), logcdf=D.logcdf(x), sf=D.sf(x), logsf=D.logsf(x))
    D, y = SB(-g, dl, 0, lam), U - x
    return dict(pdf=D.pdf(y), logpdf=D.logpdf(y), cdf=D.sf(y), logcdf=D.logsf(y), sf=D.cdf(y), logsf=D.logcdf(y))


def mp_moments(g, dl):
    g, dl = mp.mpf(g), mp.mpf(dl)
    f = lambda z, k: (1 / (1 + mp.e ** (-(z - g) / dl))) ** k * mp.npdf(z)
    pts = [-mp.inf, g - 4 * dl, g - dl, g, g + dl, g + 4 * dl, mp.inf]
    m1 = mp.quad(lambda z: f(z, 1), pts); m2 = mp.quad(lambda z: f(z, 2), pts)
    return float(m1), float(m2 - m1 * m1)


qs = [1e-12, 1e-6, 0.01, 0.25, 0.5, 0.9, 0.999, 1 - 1e-9]
grid = []
for g, dl, xi, lam in [(0.6, 1.3, 5, 40), (0.0, 1.0, 0, 1), (2.5, 0.7, 0, 50), (-1.5, 0.9, 2, 48), (0.3, 0.05, 10, 30), (0.0, 25.0, 0, 60)]:
    U = xi + lam
    xs = sorted({float(xi + lam * y) for y in (1e-9, 1e-4, 0.05, 0.3, 0.5, 0.7, 0.95)} | {float(U - lam * z) for z in (1e-4, 1e-9)})
    ev = [side_eval(g, dl, xi, lam, x) for x in xs]
    w = [(stats.norm.ppf(q) - g) / dl for q in qs]
    m1, vy = mp_moments(g, dl)
    grid.append(dict(gamma=g, delta=dl, xi=xi, lambda_=lam, x=xs, **{k: [float(e[k]) for e in ev] for k in ev[0]}, q=qs,
                     ppf=[float(SB(g, dl, xi, lam).ppf(q)) if q <= 0.5 else float(U - lam * stats.logistic.sf(wi)) for q, wi in zip(qs, w)],
                     meanY=m1, varY=vy, mean=xi + lam * m1, var=lam * lam * vy))
out["johnsonsb"] = grid
D = SB(0.6, 1.3, 5, 40)
out["spec81"] = dict(pdf=float(D.pdf(20)), cdf=float(D.cdf(20)), q50=float(D.ppf(0.5)))
out["mom_cases"] = [dict(gamma=g, delta=dl, meanY=m, varY=v) for g, dl in [(0.6, 1.3), (0, 1), (2.5, 0.7), (-1.5, 0.9), (0.3, 0.05), (0, 25), (4, 3), (-0.2, 0.2)] for m, v in [mp_moments(g, dl)]]


def quad_moments(g, dl):
    f = lambda z, k: (1 / (1 + np.exp(-(z - g) / dl))) ** k * stats.norm.pdf(z)
    m1 = integrate.quad(lambda z: f(z, 1), -12, 12, points=[g], epsabs=0, epsrel=1e-13, limit=400)[0]
    m2 = integrate.quad(lambda z: f(z, 2), -12, 12, points=[g], epsabs=0, epsrel=1e-13, limit=400)[0]
    return m1, m2 - m1 * m1


def gof(d, D):
    s = np.sort(d); n = len(s); i = np.arange(1, n + 1)
    return dict(logLik=float(np.sum(D.logpdf(d))), ks=float(stats.kstest(d, D.cdf).statistic),
                ad=float(-n - np.sum((2 * i - 1) * (D.logcdf(s) + D.logsf(s[::-1]))) / n))


def lsq(res, starts):
    best = None
    for s0 in starts:
        r = optimize.least_squares(res, s0, xtol=1e-15, ftol=1e-15, gtol=1e-15, max_nfev=5000)
        if best is None or r.cost < best.cost:
            best = r
    return best.x, float(np.max(np.abs(best.fun)))


fits = {}
samples = {**{k: (np.asarray(v, float), *BOUNDS[k]) for k, v in FX.items() if k in BOUNDS}, **SIM}
for name, (d, xi, lam) in samples.items():
    U = xi + lam
    nll = lambda t: -np.sum(SB(t[0], np.exp(t[1]), xi, lam).logpdf(d))
    best = None
    for st in ([0.0, 0.0], [1.0, 0.5], [-1.0, -0.5]):
        r = optimize.minimize(nll, st, method="Nelder-Mead", options=dict(xatol=1e-13, fatol=1e-13, maxiter=40000, maxfev=40000))
        if best is None or r.fun < best.fun:
            best = r
    g_f, dl_f, _, _ = stats.johnsonsb.fit(d, floc=xi, fscale=lam)
    rec = dict(sample=name, xi=xi, lambda_=lam, n=int(len(d)),
               cml=dict(gamma=float(best.x[0]), delta=float(np.exp(best.x[1])), gamma_fit=float(g_f), delta_fit=float(dl_f), **gof(d, SB(best.x[0], np.exp(best.x[1]), xi, lam))))
    rec["pct"] = []
    for p, q in [(0.5, 0.95), (0.25, 0.75), (0.1, 0.9)]:
        Qp, Qr = np.quantile(d, [p, q], method="linear")

        def res(t, Qp=Qp, Qr=Qr, p=p, q=q):
            D = SB(t[0], np.exp(t[1]), xi, lam)
            return [(D.ppf(p) - Qp) / lam, (D.ppf(q) - Qr) / lam]
        (a, b), r = lsq(res, [[0.0, 0.0], [1.0, 0.3]])
        rec["pct"].append(dict(p=p, r=q, qp=float(Qp), qr=float(Qr), gamma=float(a), delta=float(np.exp(b)), resid=r, **gof(d, SB(a, np.exp(b), xi, lam))))
    rec["mom"] = {}
    for ddof, key in [(0, "n"), (1, "n-1")]:
        m, v = d.mean(), d.var(ddof=ddof); mu, vy = (m - xi) / lam, v / lam ** 2

        def res(t, mu=mu, vy=vy):
            a, b = quad_moments(t[0], np.exp(t[1]))
            return [a - mu, (b - vy) / vy]
        (a, b), r = lsq(res, [[rec["cml"]["gamma"], np.log(rec["cml"]["delta"])], [0.0, 0.0]])
        m1, v1 = mp_moments(a, np.exp(b))
        rec["mom"][key] = dict(gamma=float(a), delta=float(np.exp(b)), mean=float(m), var=float(v), resid=r,
                               check_meanY=m1, check_varY=v1, **gof(d, SB(a, np.exp(b), xi, lam)))
    fits[name] = rec
    print(name, "done", flush=True)
out["fits"] = fits


def finite(o):
    if isinstance(o, float):
        return o if np.isfinite(o) else None
    if isinstance(o, list):
        return [finite(v) for v in o]
    if isinstance(o, dict):
        return {k: finite(v) for k, v in o.items()}
    return o


(here / "dist_p08.json").write_text(json.dumps(finite(out), indent=1))
print("wrote dist_p08.json:", len(grid), "grids,", len(fits), "samples")
