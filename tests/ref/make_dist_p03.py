"""Reference for the diameter distribution engine, stage P03 (two-parameter gamma; docs/DIST_SPEC.md).

SciPy/NumPy only; nothing shared with the JavaScript code:
  - scipy.stats.gamma(a=k, scale=θ) (shape and SCALE; rate = 1/θ) pdf/logpdf/cdf/logcdf/sf/logsf/ppf on grids reaching
    both tails, small and large shapes; scipy.special.digamma; scipy.special.gammaincinv
  - ML: scipy.stats.gamma.fit(floc=0) and, separately, Nelder–Mead minimisation of −Σ gamma.logpdf over (ln k, ln θ)
  - moments (divisor n and n − 1): joint least_squares of gamma.stats('mv') = (m, v)
  - recovery from (mean, variance) and (mean, Dq): joint least_squares on mean and E[D²]
  - DIST_SPEC §8.1 gamma row
Samples: tests/weibull/fixture.json and simulated samples (numpy default_rng(20261112); NOT real measurements).

    python3 tests/ref/make_dist_p03.py  →  tests/ref/dist_p03.json
"""
import json
import pathlib

import numpy as np
import scipy
from scipy import optimize, special, stats

here = pathlib.Path(__file__).parent
FX = json.loads((here.parent / "weibull" / "fixture.json").read_text())["samples"]
rng = np.random.default_rng(20261112)
SIM = {
    "sim_gamma_n100": np.round(stats.gamma(3.5, scale=6).rvs(100, random_state=rng), 1),
    "sim_gamma_small_k_n200": np.round(stats.gamma(0.8, scale=15).rvs(200, random_state=rng), 2) + 0.01,
    "sim_narrow_n50": np.round(stats.norm(60, 0.6).rvs(50, random_state=rng), 2),      # tiny CV: very large shape
}
out = {"scipy": scipy.__version__, "numpy": np.__version__, "seed": 20261112, "sim": {k: v.tolist() for k, v in SIM.items()}}
G = lambda k, th: stats.gamma(k, scale=th)

qs = [1e-12, 1e-6, 0.01, 0.25, 0.5, 0.9, 0.999, 1 - 1e-9]
grid = []
for k, th in [(2, 8), (0.3, 10), (1, 5), (7.5, 3), (60, 0.5), (900, 0.05)]:
    D = G(k, th); m, sd = D.mean(), D.std()
    xs = sorted({float(x) for x in [D.ppf(1e-14), D.ppf(1e-6), D.ppf(0.05), m - 0.5 * sd, m, m + sd, D.ppf(0.999), D.isf(1e-12), D.isf(1e-30)] if x > 0})
    grid.append(dict(k=k, theta=th, x=xs, pdf=D.pdf(xs).tolist(), logpdf=D.logpdf(xs).tolist(), cdf=D.cdf(xs).tolist(), logcdf=D.logcdf(xs).tolist(),
                     sf=D.sf(xs).tolist(), logsf=D.logsf(xs).tolist(), q=qs, ppf=D.ppf(qs).tolist(), mean=float(D.mean()), var=float(D.var())))
out["gamma"] = grid
xs = [1e-4, 0.01, 0.3, 1, 2.5, 9.99, 10, 10.01, 37, 1e3, 1e6, 1e9]
out["digamma"] = dict(x=xs, psi=special.digamma(xs).tolist(), lnMinusPsi=[float(np.log(x) - special.digamma(x)) if x < 1e3 else None for x in xs])
# ln x − ψ(x) for large x via the mpmath-free identity with polygamma is not available; use the asymptotic check in JS
out["gammaincinv"] = [dict(a=a, p=p, x=float(special.gammaincinv(a, p))) for a in (0.3, 2, 45, 900) for p in (1e-200, 1e-10, 0.05, 0.5, 0.95, 1 - 1e-12)]
out["spec81"] = dict(pdf=float(G(2, 8).pdf(20)), cdf=float(G(2, 8).cdf(20)), q50=float(G(2, 8).ppf(0.5)))


def ad_stat(d, D):
    s = np.sort(d); n = len(s); i = np.arange(1, n + 1)
    return float(-n - np.sum((2 * i - 1) * (D.logcdf(s) + D.logsf(s[::-1]))) / n)


def gof(d, D):
    return dict(logLik=float(np.sum(D.logpdf(d))), ks=float(stats.kstest(d, D.cdf).statistic), ad=ad_stat(d, D))


def lsq(res, starts):
    best = None
    for s0 in starts:
        r = optimize.least_squares(res, s0, xtol=1e-15, ftol=1e-15, gtol=1e-15, max_nfev=20000)
        if best is None or r.cost < best.cost:
            best = r
    return best.x, float(np.max(np.abs(best.fun)))


fits = {}
for name, d in {**{k: np.asarray(v, float) for k, v in FX.items()}, **SIM}.items():
    if len(d) < 5 or len(set(d.tolist())) < 3:
        continue
    rec = dict(sample=name, n=int(len(d)))
    k_f, _, th_f = stats.gamma.fit(d, floc=0)
    nll = lambda t: -np.sum(G(np.exp(t[0]), np.exp(t[1])).logpdf(d))
    m, v = d.mean(), d.var()
    best = None
    for st in ([np.log(m * m / v), np.log(v / m)], [0.0, np.log(m)], [np.log(k_f) + 0.3, np.log(th_f) - 0.3]):
        r = optimize.minimize(nll, st, method="Nelder-Mead", options=dict(xatol=1e-13, fatol=1e-13, maxiter=40000, maxfev=40000))
        if best is None or r.fun < best.fun:
            best = r
    k_n, th_n = np.exp(best.x)
    rec["ml"] = dict(k=float(k_n), theta=float(th_n), k_fit=float(k_f), theta_fit=float(th_f), logLik_fit=float(np.sum(G(k_f, th_f).logpdf(d))), **gof(d, G(k_n, th_n)))
    for ddof, key in [(0, "mom_n"), (1, "mom_n1")]:
        mm, vv = d.mean(), d.var(ddof=ddof)

        def res(t, mm=mm, vv=vv):
            a, b = G(np.exp(t[0]), np.exp(t[1])).stats(moments="mv")
            return [a / mm - 1, b / vv - 1]
        (a, b), r = lsq(res, [[np.log(mm * mm / vv) + 0.2, np.log(vv / mm) - 0.2], [0.0, np.log(mm)]])
        rec[key] = dict(k=float(np.exp(a)), theta=float(np.exp(b)), mean=float(mm), var=float(vv), resid=r, **gof(d, G(np.exp(a), np.exp(b))))
    fits[name] = rec
out["fits"] = fits

cases = [dict(mean=16.0, variance=128.0, varDivisor="n"),     # k = 2, θ = 8 (DIST_SPEC §8.1 parameters)
         dict(mean=20.0, dq=21.0), dict(mean=31.2, variance=40.0, varDivisor="n-1", n=30), dict(mean=8.0, variance=60.0, varDivisor="n")]
rec_out = []
for c in cases:
    m = c["mean"]
    v = (c["dq"] ** 2 - m ** 2) if "dq" in c else (c["variance"] * (c["n"] - 1) / c["n"] if c.get("varDivisor") == "n-1" else c["variance"])
    m2 = m * m + v
    res = lambda t: [G(np.exp(t[0]), np.exp(t[1])).mean() / m - 1, G(np.exp(t[0]), np.exp(t[1])).moment(2) / m2 - 1]
    (a, b), r = lsq(res, [[0.0, np.log(m)], [np.log(m * m / v) + 0.3, np.log(v / m)]])
    rec_out.append(dict(input=c, v=float(v), dq=float(np.sqrt(m2)), k=float(np.exp(a)), theta=float(np.exp(b)), resid=r))
out["recover"] = rec_out
(here / "dist_p03.json").write_text(json.dumps(out, indent=1))
print("wrote dist_p03.json:", len(grid), "grids,", len(fits), "samples,", len(rec_out), "recovery cases")
