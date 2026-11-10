"""Reference for the diameter distribution engine, stage P02 (normal and two-parameter lognormal; docs/DIST_SPEC.md).

SciPy/NumPy only; nothing shared with the JavaScript code:
  - pdf/logpdf/cdf/logcdf/sf/logsf/ppf of scipy.stats.norm and scipy.stats.lognorm(s=σ, scale=e^μ) on grids reaching
    both tails, plus the standard normal quantile far into the tails
  - fits: normal ML by scipy.stats.norm.fit; lognormal ML by direct Nelder–Mead minimisation of −Σ lognorm.logpdf
    (diameter scale, Jacobian included) and by lognorm.fit(floc=0); lognormal moments by a joint least_squares solve
    of lognorm.stats('mv') = (m, v), divisor n and n − 1
  - recovery from (mean, variance) and (mean, Dq): joint least_squares on the distribution's mean and E[D²]
  - DIST_SPEC §8.1 normal and lognormal rows
Samples: tests/weibull/fixture.json and simulated samples (numpy default_rng(20261111); NOT real measurements).

    python3 tests/ref/make_dist_p02.py  →  tests/ref/dist_p02.json
"""
import json
import pathlib

import numpy as np
import scipy
from scipy import optimize, stats

here = pathlib.Path(__file__).parent
FX = json.loads((here.parent / "weibull" / "fixture.json").read_text())["samples"]
rng = np.random.default_rng(20261111)
SIM = {
    "sim_norm_n80": np.round(stats.norm(25, 6).rvs(80, random_state=rng), 1),
    "sim_lnorm_n300": np.round(stats.lognorm(0.35, scale=np.exp(3)).rvs(300, random_state=rng), 1),
    "sim_lnorm_wide_n120": np.round(stats.lognorm(0.9, scale=np.exp(2.5)).rvs(120, random_state=rng), 2),
}
out = {"scipy": scipy.__version__, "numpy": np.__version__, "seed": 20261111, "sim": {k: v.tolist() for k, v in SIM.items()}}
LN = lambda mu, s: stats.lognorm(s, scale=np.exp(mu))


def funcs(D, xs, qs):
    return dict(x=list(xs), pdf=D.pdf(xs).tolist(), logpdf=D.logpdf(xs).tolist(), cdf=D.cdf(xs).tolist(), logcdf=D.logcdf(xs).tolist(),
                sf=D.sf(xs).tolist(), logsf=D.logsf(xs).tolist(), q=qs, ppf=D.ppf(qs).tolist(), mean=float(D.mean()), var=float(D.var()))


qs = [1e-12, 1e-6, 0.01, 0.25, 0.5, 0.9, 0.999, 1 - 1e-9]
out["normal"] = [dict(mu=mu, sigma=s, **funcs(stats.norm(mu, s), [mu + s * k for k in (-30, -8, -3, -1, -0.2, 0, 0.5, 2, 6, 9)], qs))
                 for mu, s in [(20, 5), (0, 1), (3.5, 12), (40, 0.3)]]
out["lognormal"] = [dict(mu=mu, sigma=s, **funcs(LN(mu, s), [float(np.exp(mu + s * k)) for k in (-30, -8, -3, -1, -0.2, 0, 0.5, 2, 6, 9)], qs))
                    for mu, s in [(3, 0.4), (0, 1), (2.2, 0.08), (3.5, 1.5)]]
zq = [1e-300, 1e-100, 1e-12, 1e-6, 0.01, 0.3, 0.7, 0.975, 1 - 1e-9, 1 - 1e-15]
out["normQuantile"] = dict(p=zq, z=stats.norm.ppf(zq).tolist())
out["spec81"] = dict(normal=dict(pdf=float(stats.norm(20, 5).pdf(20)), cdf=float(stats.norm(20, 5).cdf(20)), q50=float(stats.norm(20, 5).ppf(0.5))),
                     lognormal=dict(pdf=float(LN(3, 0.4).pdf(20)), cdf=float(LN(3, 0.4).cdf(20)), q50=float(LN(3, 0.4).ppf(0.5))))


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
    mu, sd = stats.norm.fit(d)
    rec["normal"] = dict(mu=float(mu), sigma=float(sd), pBelowZero=float(stats.norm.cdf(0, mu, sd)), **gof(d, stats.norm(mu, sd)))
    nll = lambda th: -np.sum(LN(th[0], np.exp(th[1])).logpdf(d))
    best = None
    for st in ([np.log(d.mean()), np.log(0.3)], [1.0, 0.0], [4.0, np.log(0.05)]):
        r = optimize.minimize(nll, st, method="Nelder-Mead", options=dict(xatol=1e-13, fatol=1e-13, maxiter=40000, maxfev=40000))
        if best is None or r.fun < best.fun:
            best = r
    s_f, _, sc_f = stats.lognorm.fit(d, floc=0)
    m_nm, s_nm = float(best.x[0]), float(np.exp(best.x[1]))
    rec["lognormal_ml"] = dict(mu=m_nm, sigma=s_nm, mu_fit=float(np.log(sc_f)), sigma_fit=float(s_f), **gof(d, LN(m_nm, s_nm)))
    for ddof, key in [(0, "lognormal_mom_n"), (1, "lognormal_mom_n1")]:
        m, v = d.mean(), d.var(ddof=ddof)

        def res(th, m=m, v=v):
            mm, vv = LN(th[0], np.exp(th[1])).stats(moments="mv")
            return [(mm - m) / m, (vv - v) / v]
        (a, b), r = lsq(res, [[np.log(m), np.log(0.3)], [np.log(m) - 1, 0.0]])
        rec[key] = dict(mu=float(a), sigma=float(np.exp(b)), mean=float(m), var=float(v), resid=r, **gof(d, LN(a, np.exp(b))))
    fits[name] = rec
out["fits"] = fits

# recovery: (mean, variance with divisor n or n − 1) and (mean, Dq); solve mean and E[D²] jointly
cases = [dict(mean=22.745276350061506, variance=57.65867565204488, varDivisor="n"),        # DIST_SPEC §8.2 moments
         dict(mean=20.0, dq=21.0), dict(mean=31.2, variance=40.0, varDivisor="n-1", n=30), dict(mean=12.0, dq=17.5, n=45),
         dict(mean=8.0, variance=60.0, varDivisor="n")]
rec_out = []
for c in cases:
    m = c["mean"]
    v = (c["dq"] ** 2 - m ** 2) if "dq" in c else (c["variance"] * (c["n"] - 1) / c["n"] if c.get("varDivisor") == "n-1" else c["variance"])
    m2 = m * m + v
    res_n = lambda th: [stats.norm(th[0], np.exp(th[1])).mean() / m - 1, (stats.norm(th[0], np.exp(th[1])).moment(2)) / m2 - 1]
    (a, b), rn = lsq(res_n, [[m, np.log(np.sqrt(v))], [m * 0.5, 0.0]])
    res_l = lambda th: [LN(th[0], np.exp(th[1])).mean() / m - 1, LN(th[0], np.exp(th[1])).moment(2) / m2 - 1]
    (c2, d2), rl = lsq(res_l, [[np.log(m), np.log(0.3)], [np.log(m) - 1, 0.0]])
    rec_out.append(dict(input=c, v=float(v), dq=float(np.sqrt(m2)),
                        normal=dict(mu=float(a), sigma=float(np.exp(b)), resid=rn, pBelowZero=float(stats.norm.cdf(0, a, np.exp(b)))),
                        lognormal=dict(mu=float(c2), sigma=float(np.exp(d2)), resid=rl)))
out["recover"] = rec_out
(here / "dist_p02.json").write_text(json.dumps(out, indent=1))
print("wrote dist_p02.json:", len(fits), "samples,", len(rec_out), "recovery cases")
