"""Reference for the diameter distribution engine, stage P10 (exponential and log-logistic/Fisk; docs/DIST_SPEC.md §3.9).

SciPy/NumPy/mpmath only; nothing shared with the JavaScript code:
  - scipy.stats.expon(loc = a, scale = 1/r): pdf/logpdf/cdf/logcdf/sf/logsf/ppf on grids reaching both tails
  - log-logistic functions: mpmath at 40 digits on grids reaching both tails (SciPy's fisk loses digits in the upper
    tail: sf = 1 − cdf); scipy.stats.fisk(c, scale = b) in the body of the distribution as a cross-check
  - exponential ML: expon.fit(floc = a) and, separately, minimize_scalar of −Σ expon.logpdf over ln r
  - log-logistic ML: fisk.fit(floc = 0) and, separately, Nelder–Mead on −Σ fisk.logpdf over (ln b, ln c)
  - two percentiles: joint least_squares of fisk.ppf(p) = Q_p, fisk.ppf(r) = Q_r (not the closed form)
  - log-moments: least_squares of scipy.stats.logistic.stats('mv') = (mean, var_n) of ln d (ln D is logistic)
  - recovery from theoretical percentiles: fisk.ppf of known (b, c)
  - moments of the log-logistic: mpmath quadrature of ∫ d^k f(d) dd (independent of the closed form), with existence
  - DIST_SPEC §8.1 exponential and log-logistic rows
Samples: tests/weibull/fixture.json and simulated samples (numpy default_rng(20261113); NOT real measurements).

    python3 tests/ref/make_dist_p10.py  →  tests/ref/dist_p10.json
"""
import json
import pathlib

import mpmath as mp
import numpy as np
import scipy
from scipy import optimize, stats

here = pathlib.Path(__file__).parent
FX = json.loads((here.parent / "weibull" / "fixture.json").read_text())["samples"]
rng = np.random.default_rng(20261113)
SIM = {
    "sim_fisk_c35_n150": np.round(stats.fisk(3.5, scale=25).rvs(150, random_state=rng), 1),
    "sim_fisk_c16_n200": np.round(stats.fisk(1.6, scale=18).rvs(200, random_state=rng), 2) + 0.005,   # mean exists, variance not
    "sim_fisk_c09_n120": np.round(stats.fisk(0.9, scale=15).rvs(120, random_state=rng), 2) + 0.005,   # no mean
    "sim_expon_a7_n200": np.round(7 + stats.expon(scale=12.5).rvs(200, random_state=rng), 1) + 0.05,  # reverse J above 7 cm
}
out = {"scipy": scipy.__version__, "numpy": np.__version__, "mpmath": mp.__version__, "seed": 20261113, "sim": {k: v.tolist() for k, v in SIM.items()}}
qs = [1e-12, 1e-6, 0.01, 0.25, 0.5, 0.9, 0.999, 1 - 1e-9]


def grid(D, xs):
    xs = sorted({float(x) for x in xs})
    return dict(x=xs, pdf=D.pdf(xs).tolist(), logpdf=D.logpdf(xs).tolist(), cdf=D.cdf(xs).tolist(), logcdf=D.logcdf(xs).tolist(),
                sf=D.sf(xs).tolist(), logsf=D.logsf(xs).tolist(), q=qs, ppf=D.ppf(qs).tolist())


out["expon"] = []
for a, r in [(0, 0.1), (7, 0.08), (5, 2.5), (0, 1e-3)]:
    D = stats.expon(loc=a, scale=1 / r)
    g = grid(D, [a + 1e-10 / r, a + 1e-6 / r, D.ppf(0.05), D.mean(), D.ppf(0.9), D.isf(1e-12), D.isf(1e-200)])
    out["expon"].append(dict(a=a, r=r, mean=float(D.mean()), var=float(D.var()), **g))
# Log-logistic: SciPy computes sf as 1 − cdf and ppf through the Burr XII form, which loses digits in the upper tail,
# so the tail reference is mpmath at 40 digits (the definition F = 1/(1 + (b/d)^c), evaluated at the exact double
# inputs); SciPy is kept for the body of the distribution (fisk_scipy) as an independent cross-check.
mp.mp.dps = 40


def fisk_mp(b, c, xs):
    b, c = mp.mpf(b), mp.mpf(c)
    rows = dict(pdf=[], logpdf=[], cdf=[], logcdf=[], sf=[], logsf=[])
    for x in xs:
        x = mp.mpf(x); u = (x / b) ** c                       # u = (d/b)^c
        F, S = u / (1 + u), 1 / (1 + u)
        f = c / x * u / (1 + u) ** 2
        for k, v in [("pdf", f), ("logpdf", mp.log(f)), ("cdf", F), ("logcdf", mp.log(F)), ("sf", S), ("logsf", mp.log(S))]:
            rows[k].append(float(v))
    q = [mp.mpf(v) for v in qs]
    rows["ppf"] = [float(b * (v / (1 - v)) ** (1 / c)) for v in q]
    return rows


out["fisk"] = []
for b, c in [(20, 3), (15, 0.9), (18, 1.6), (25, 3.5), (30, 12), (40, 500)]:
    D = stats.fisk(c, scale=b)
    xs = sorted({float(x) for x in [D.ppf(1e-14), D.ppf(1e-6), D.ppf(0.05), b, D.ppf(0.75), D.isf(1e-6), D.isf(1e-14)]})
    body = [float(D.ppf(0.05)), float(b), float(D.ppf(0.75))]
    out["fisk"].append(dict(b=b, c=c, x=xs, q=qs, **fisk_mp(b, c, xs),
                            scipy=dict(x=body, pdf=D.pdf(body).tolist(), cdf=D.cdf(body).tolist(), logpdf=D.logpdf(body).tolist())))
out["spec81"] = dict(expon=dict(pdf=float(stats.expon(scale=10).pdf(20)), cdf=float(stats.expon(scale=10).cdf(20)), q50=float(stats.expon(scale=10).ppf(0.5))),
                     fisk=dict(pdf=float(stats.fisk(3, scale=20).pdf(20)), cdf=float(stats.fisk(3, scale=20).cdf(20)), q50=float(stats.fisk(3, scale=20).ppf(0.5))))

# moments of the log-logistic by quadrature (existence: the integral diverges for k ≥ c)
mom = []
for b, c in [(20, 0.9), (20, 1.0), (18, 1.6), (20, 2.0), (20, 3.0), (25, 3.5), (30, 12), (40, 500)]:
    f = lambda x: (mp.mpf(c) / b) * (x / b) ** (c - 1) / (1 + (x / b) ** c) ** 2
    rec = dict(b=b, c=c, meanDefined=c > 1, varianceDefined=c > 2, mean=None, variance=None)
    if c > 1:
        m1 = mp.quad(lambda x: x * f(x), [0, b, mp.inf])
        rec["mean"] = float(m1)
        if c > 2:
            rec["variance"] = float(mp.quad(lambda x: (x - m1) ** 2 * f(x), [0, b, mp.inf]))
    mom.append(rec)
out["moments"] = mom
# recovery from theoretical percentiles
out["recover"] = [dict(b=b, c=c, p=p, r=r, qp=float(stats.fisk(c, scale=b).ppf(p)), qr=float(stats.fisk(c, scale=b).ppf(r)))
                  for b, c in [(20, 3), (15, 0.9), (18, 1.6), (40, 500), (0.5, 7)] for p, r in [(0.25, 0.75), (0.1, 0.9), (0.5, 0.95), (1e-4, 0.3)]]


def ad_stat(d, D):
    s = np.sort(d); n = len(s); i = np.arange(1, n + 1)
    return float(-n - np.sum((2 * i - 1) * (D.logcdf(s) + D.logsf(s[::-1]))) / n)


def gof(d, D):
    return dict(logLik=float(np.sum(D.logpdf(d))), ks=float(stats.kstest(d, D.cdf).statistic), ad=ad_stat(d, D))


def q7(d, p):
    return float(np.quantile(d, p, method="linear"))


fits = {}
for name, d in {**{k: np.asarray(v, float) for k, v in FX.items()}, **SIM}.items():
    rec = dict(sample=name, n=int(len(d)))
    # exponential, a = 0 and a = 5 (if below the data); a = 7 for the simulated reverse J
    rec["expon"] = []
    for a in sorted({0.0, 5.0, 7.0 if name.startswith("sim_expon") else 0.0}):
        if not d.min() > a:
            continue
        _, sc = stats.expon.fit(d, floc=a)
        res = optimize.minimize_scalar(lambda t: -np.sum(stats.expon(loc=a, scale=np.exp(-t)).logpdf(d)), bracket=(-5, -2), tol=1e-14)
        rec["expon"].append(dict(a=a, r_fit=float(1 / sc), r_min=float(np.exp(res.x)), **gof(d, stats.expon(loc=a, scale=sc))))
    # log-logistic ML
    c_f, _, b_f = stats.fisk.fit(d, floc=0)
    nll = lambda t: -np.sum(stats.fisk(np.exp(t[1]), scale=np.exp(t[0])).logpdf(d))
    best = None
    for st in ([np.log(np.median(d)), np.log(2.0)], [np.log(b_f) + 0.2, np.log(c_f) - 0.2]):
        r = optimize.minimize(nll, st, method="Nelder-Mead", options=dict(xatol=1e-13, fatol=1e-13, maxiter=40000, maxfev=40000))
        if best is None or r.fun < best.fun:
            best = r
    b_n, c_n = np.exp(best.x)
    rec["ml"] = dict(b=float(b_n), c=float(c_n), b_fit=float(b_f), c_fit=float(c_f), **gof(d, stats.fisk(c_n, scale=b_n)))
    # two percentiles, solved jointly with ppf (not the closed form)
    rec["pct"] = []
    for p, r in [(0.25, 0.75), (0.1, 0.9), (0.24, 0.93)]:
        qp, qr = q7(d, p), q7(d, r)
        res = optimize.least_squares(lambda t: [stats.fisk(np.exp(t[1]), scale=np.exp(t[0])).ppf(p) / qp - 1, stats.fisk(np.exp(t[1]), scale=np.exp(t[0])).ppf(r) / qr - 1],
                                     [np.log(np.median(d)), np.log(3.0)], xtol=1e-15, ftol=1e-15, gtol=1e-15)
        rec["pct"].append(dict(p=p, r=r, qp=qp, qr=qr, b=float(np.exp(res.x[0])), c=float(np.exp(res.x[1]))))
    # log-moments: logistic(loc = ln b, scale = 1/c) matched to mean and var_n of ln d
    y = np.log(d); my, vy = y.mean(), y.var()
    res = optimize.least_squares(lambda t: [stats.logistic(loc=t[0], scale=np.exp(t[1])).stats("m") - my, stats.logistic(loc=t[0], scale=np.exp(t[1])).stats("v") / vy - 1],
                                 [my, 0.0], xtol=1e-15, ftol=1e-15, gtol=1e-15)
    b_l, c_l = float(np.exp(res.x[0])), float(np.exp(-res.x[1]))
    rec["logmom"] = dict(b=b_l, c=c_l, **gof(d, stats.fisk(c_l, scale=b_l)))
    fits[name] = rec
out["fits"] = fits
(here / "dist_p10.json").write_text(json.dumps(out, indent=1))
print("wrote dist_p10.json:", len(fits), "samples")
