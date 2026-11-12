"""Reference for the diameter distribution engine, stage P20, part 1: generalized gamma (docs/DIST_SPEC.md P20).

SciPy/NumPy/mpmath only; nothing shared with the JavaScript code (which profiles the likelihood over c):
  - functions: mpmath at 40 digits from the definition f = c/(bΓ(a))·(d/b)^(ac−1)·exp[−(d/b)^c], F = P(a, (d/b)^c),
    on grids reaching both tails; scipy.stats.gengamma(a, c, scale = b) in the body as a cross-check
  - special cases: scipy.stats.gamma(a, scale = b) (c = 1) and scipy.stats.weibull_min(c, scale = b) (a = 1)
  - moments: mpmath quadrature of ∫ d^r f(d) dd (independent of the Γ-ratio formula)
  - ML: Nelder–Mead on −Σ gengamma.logpdf over (ln a, ln b, ln c) from several starts, then the three score
    equations solved by mpmath.findroot at 30 digits from the best point; gengamma.fit(floc = 0) recorded as a
    cross-check; gamma and Weibull ML log-likelihoods (nested models) from their own score equations
  - conditional ML above a threshold L: Nelder–Mead on −[Σ ln f − n ln(1 − F(L))]
  - grouped ML (2 cm classes, counts, outside = zero): Nelder–Mead on −Σ n_j ln[F(hi) − F(lo)]
  - a sample whose ln d is right-skewed: the profile log-likelihood (score equations in a, b at fixed c, mpmath) rises
    as c → 0
Samples: tests/weibull/fixture.json and simulated samples (numpy default_rng(20261120); NOT real measurements).

    python3 tests/ref/make_dist_p20.py  →  tests/ref/dist_p20.json
"""
import json
import pathlib

import mpmath as mp
import numpy as np
import scipy
from scipy import optimize, special, stats

here = pathlib.Path(__file__).parent
FX = json.loads((here.parent / "weibull" / "fixture.json").read_text())["samples"]
rng = np.random.default_rng(20261120)
SIM = {
    "sim_gg_a25_c16": np.round(stats.gengamma(2.5, 1.6, scale=12).rvs(300, random_state=rng), 1),
    "sim_gg_a08_c28": np.round(stats.gengamma(0.8, 2.8, scale=25).rvs(200, random_state=rng), 1),
    "sim_logskew": np.round(np.exp(2.3 + stats.gamma(2.0, scale=0.25).rvs(150, random_state=rng)), 2),   # ln d right-skewed
}
out = {"scipy": scipy.__version__, "numpy": np.__version__, "mpmath": mp.__version__, "seed": 20261120, "sim": {k: v.tolist() for k, v in SIM.items()}}
qs = [1e-12, 1e-6, 0.01, 0.25, 0.5, 0.9, 0.999, 1 - 1e-9]
mp.mp.dps = 40


def gg_mp(a, b, c, xs):
    a, b, c = mp.mpf(a), mp.mpf(b), mp.mpf(c)
    rows = dict(pdf=[], logpdf=[], cdf=[], logcdf=[], sf=[], logsf=[])
    for x in xs:
        x = mp.mpf(x); u = (x / b) ** c
        lf = mp.log(c) - mp.log(b) - mp.loggamma(a) + (a * c - 1) * mp.log(x / b) - u
        F = mp.gammainc(a, 0, u, regularized=True); S = mp.gammainc(a, u, mp.inf, regularized=True)
        for k, v in [("pdf", mp.exp(lf)), ("logpdf", lf), ("cdf", F), ("logcdf", mp.log(F)), ("sf", S), ("logsf", mp.log(S))]:
            rows[k].append(float(v))
    # quantile: invert P(a, u) = q in mpmath (independent of the JavaScript inverse)
    ppf = []
    for q in qs:
        q = mp.mpf(q)
        g = lambda t: mp.log(mp.gammainc(a, 0, mp.exp(t), regularized=True)) - mp.log(q) if q <= 0.5 else mp.log(mp.gammainc(a, mp.exp(t), mp.inf, regularized=True)) - mp.log(1 - q)
        t0 = mp.log(mp.mpf(special.gammaincinv(float(a), float(q))))
        t = mp.findroot(g, t0)
        ppf.append(float(b * mp.exp(t / c)))
    rows["ppf"] = ppf
    return rows


out["gg"] = []
for a, b, c in [(2.5, 12, 1.6), (0.7, 20, 3.2), (6, 5, 0.6), (1, 20, 2.5), (3, 6, 1), (40, 3, 0.3)]:
    D = stats.gengamma(a, c, scale=b)
    xs = sorted({float(x) for x in [D.ppf(1e-14), D.ppf(1e-6), D.ppf(0.05), D.median(), D.ppf(0.75), D.isf(1e-6), D.isf(1e-14)]})
    body = [float(D.ppf(0.05)), float(D.median()), float(D.ppf(0.75))]
    row = dict(a=a, b=b, c=c, x=xs, q=qs, **gg_mp(a, b, c, xs),
               scipy=dict(x=body, pdf=D.pdf(body).tolist(), cdf=D.cdf(body).tolist(), logpdf=D.logpdf(body).tolist(), ppf=D.ppf([0.05, 0.5, 0.75]).tolist()))
    # moments by quadrature of the density
    f = lambda x: mp.exp(mp.log(c) - mp.log(b) - mp.loggamma(a) + (a * c - 1) * mp.log(x / b) - (x / b) ** c)
    m1 = mp.quad(lambda x: x * f(x), [0, b, 10 * b, mp.inf]); m2 = mp.quad(lambda x: x * x * f(x), [0, b, 10 * b, mp.inf])
    row["mean"], row["var"] = float(m1), float(m2 - m1 * m1)
    if c == 1:
        G = stats.gamma(a, scale=b); row["special"] = dict(kind="gamma", x=body, pdf=G.pdf(body).tolist(), cdf=G.cdf(body).tolist())
    if a == 1:
        W = stats.weibull_min(c, scale=b); row["special"] = dict(kind="weibull", x=body, pdf=W.pdf(body).tolist(), cdf=W.cdf(body).tolist())
    out["gg"].append(row)


def nll(theta, d):
    a, b, c = np.exp(theta)
    v = stats.gengamma.logpdf(d, a, c, scale=b).sum()
    return -v if np.isfinite(v) else np.inf


def score_root(d, a, b, c):
    """The three ML score equations at 30 digits (mpmath.findroot from the Nelder–Mead point)."""
    mp.mp.dps = 30
    d = [mp.mpf(float(x)) for x in d]; n = len(d)

    def eqs(la, lb, lc):
        a, b, c = mp.exp(la), mp.exp(lb), mp.exp(lc)
        L = [mp.log(x / b) for x in d]; U = [mp.exp(c * l) for l in L]
        return [-n * mp.digamma(a) + c * mp.fsum(L), -a * n + mp.fsum(U), n / c + a * mp.fsum(L) - mp.fsum(u * l for u, l in zip(U, L))]
    r = mp.findroot(eqs, (mp.log(a), mp.log(b), mp.log(c)))
    a, b, c = [mp.exp(v) for v in r]
    ll = mp.fsum(mp.log(c) - mp.log(b) - mp.loggamma(a) + (a * c - 1) * mp.log(x / b) - (x / b) ** c for x in d)
    mp.mp.dps = 40
    return dict(a=float(a), b=float(b), c=float(c), logLik=float(ll))


def best_nm(fun, starts):
    best = None
    for s in starts:
        r = optimize.minimize(fun, s, method="Nelder-Mead", options=dict(xatol=1e-12, fatol=1e-14, maxiter=40000, maxfev=80000))
        r = optimize.minimize(fun, r.x, method="Nelder-Mead", options=dict(xatol=1e-12, fatol=1e-14, maxiter=40000, maxfev=80000))
        if best is None or r.fun < best.fun:
            best = r
    return best


STARTS = [np.log([a, b, c]) for a, b, c in [(1, 15, 2), (3, 10, 1), (0.5, 25, 4), (8, 4, 0.5)]]
out["ml"] = []
for name in ["sim_gg_a25_c16", "sim_gg_a08_c28", "w2", "skewed"]:
    d = np.array(SIM[name] if name in SIM else FX[name], float)
    r = best_nm(lambda t: nll(t, d), STARTS)
    sol = score_root(d, *np.exp(r.x))
    a_, c_, l_, s_ = stats.gengamma.fit(d, floc=0)
    g = stats.gamma.fit(d, floc=0); gl = stats.gamma.logpdf(d, g[0], scale=g[2]).sum()
    # Weibull ML: profile equation for the shape (brentq), not weibull_min.fit (imprecise)
    lnd = np.log(d)
    h = lambda k: (d ** k * lnd).sum() / (d ** k).sum() - 1 / k - lnd.mean()
    k = optimize.brentq(h, 0.05, 50, xtol=1e-15); lam = ((d ** k).mean()) ** (1 / k)
    wl = stats.weibull_min.logpdf(d, k, scale=lam).sum()
    out["ml"].append(dict(sample=name, **sol, nm=dict(a=float(np.exp(r.x[0])), b=float(np.exp(r.x[1])), c=float(np.exp(r.x[2])), logLik=float(-r.fun)),
                          scipyfit=dict(a=a_, c=c_, b=s_, logLik=float(stats.gengamma.logpdf(d, a_, c_, scale=s_).sum())), gammaLogLik=float(gl), weibullLogLik=float(wl)))

# conditional ML above L = 8 cm (left threshold) on the first simulated sample
d = np.array(SIM["sim_gg_a25_c16"], float); L = 8.0; dt = d[d >= L]
tn = lambda t: (lambda a, b, c: -(stats.gengamma.logpdf(dt, a, c, scale=b).sum() - len(dt) * stats.gengamma.logsf(L, a, c, scale=b)))(*np.exp(t))
r = best_nm(tn, STARTS)
out["tml"] = dict(sample="sim_gg_a25_c16", lower=L, d=dt.tolist(), a=float(np.exp(r.x[0])), b=float(np.exp(r.x[1])), c=float(np.exp(r.x[2])), logLik=float(-r.fun))

# grouped ML: 2 cm classes from 0, counts, the last class open, outside = zero
edges = np.arange(0, 2 * np.ceil(d.max() / 2) + 2, 2.0); cnt = np.histogram(d, edges)[0]
lo, hi = edges[:-1], np.append(edges[1:-1], np.inf)


def gn(t):
    a, b, c = np.exp(t)
    p = stats.gengamma.cdf(hi, a, c, scale=b) - stats.gengamma.cdf(lo, a, c, scale=b)
    if np.any((cnt > 0) & (p <= 0)):
        return np.inf
    return -(cnt[cnt > 0] * np.log(p[cnt > 0])).sum()


r = best_nm(gn, STARTS)
out["gml"] = dict(sample="sim_gg_a25_c16", classes=[dict(lo=float(a), hi=(None if b == np.inf else float(b)), n=int(k)) for a, b, k in zip(lo, hi, cnt)],
                  a=float(np.exp(r.x[0])), b=float(np.exp(r.x[1])), c=float(np.exp(r.x[2])), logLik=float(-r.fun))

# right-skewed ln d: profile log-likelihood at fixed c rises as c decreases. At fixed c the two score equations
# Σ(d/b)^c = n a and ψ(a) = c·mean ln(d/b) are solved at 30 digits (b eliminated: ln a − ψ(a) = ln mean d^c − c·mean ln d);
# Nelder–Mead in (a, b) is not reliable here (a runs to the thousands as c → 0).
d = np.array(SIM["sim_logskew"], float)
prof = []
mp.mp.dps = 30
dm = [mp.mpf(float(x)) for x in d]; n = len(dm)
for c in [1.0, 0.3, 0.1, 0.03, 0.012]:
    cm = mp.mpf(c); S = mp.fsum(x ** cm for x in dm) / n; ml = mp.fsum(mp.log(x) for x in dm) / n; s = mp.log(S) - cm * ml
    la = mp.findroot(lambda t: t - mp.digamma(mp.exp(t)) - s, mp.log(1 / (2 * s)))
    a = mp.exp(la); b = (S / a) ** (1 / cm)
    ll = mp.fsum(mp.log(cm) - mp.log(b) - mp.loggamma(a) + (a * cm - 1) * mp.log(x / b) - (x / b) ** cm for x in dm)
    prof.append(dict(c=c, a=float(a), b=float(b), logLik=float(ll)))
mp.mp.dps = 40
out["logskew"] = dict(sample="sim_logskew", skewLog=float(stats.skew(np.log(d))), profile=prof, lognormalLogLik=float(stats.lognorm.logpdf(d, np.log(d).std(), scale=np.exp(np.log(d).mean())).sum()))

(here / "dist_p20.json").write_text(json.dumps(out, indent=1))
print("written", here / "dist_p20.json")
