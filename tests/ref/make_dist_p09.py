"""Reference for the diameter distribution engine, stage P09 (Johnson SB recovery, Parresol 2003; docs/DIST_SPEC.md §3.8).

SciPy/NumPy only; nothing shared with the JavaScript code:
  - u1 = E[Y], u2 = E[Y²], Y = logistic((Z − γ)/δ): scipy.integrate.quad over z (epsrel 1e-13, breakpoints at γ ± kδ,
    which small δ needs: a first version with a single breakpoint missed a genuine second root at δ ≈ 0.14)
  - λ, δ from ξ + λu1 = m and ξ² + 2ξλu1 + λ²u2 = q² with γ = δ ln[(ξ + λ − M)/(M − ξ)]: scipy.optimize.least_squares
    on (ln(λ − (M − ξ)), ln δ) from a 7 × 8 grid of starts, δ from 0.08 (the JavaScript uses 12 starts and its own
    Newton); all distinct solutions are kept, and each is re-evaluated with mpmath.quad at 40 digits (residual stored)
  - q from N and G: q² = G/(K N), K = π/40000
  - inputs generated from known SB parameters (median from scipy.stats.johnsonsb.ppf(0.5)), the DIST_SPEC §8.3 case,
    and summaries of tests/weibull/fixture.json (not SB data) with ξ = 0 and ξ = 0.5·min
Not real measurements.

    python3 tests/ref/make_dist_p09.py  →  tests/ref/dist_p09.json
"""
import json
import pathlib

import mpmath as mp
import numpy as np
import scipy
from scipy import integrate, optimize, stats

here = pathlib.Path(__file__).parent
FX = json.loads((here.parent / "weibull" / "fixture.json").read_text())["samples"]
K = np.pi / 40000


def u12(g, d):
    f = lambda z, k: (1 / (1 + np.exp(-(z - g) / d))) ** k * stats.norm.pdf(z)
    pts = sorted({float(g + k * d) for k in (-16, -8, -4, -2, -1, -0.5, 0, 0.5, 1, 2, 4, 8, 16) if -12 < g + k * d < 12})
    a = integrate.quad(lambda z: f(z, 1), -12, 12, points=pts, epsabs=0, epsrel=1e-13, limit=1000)[0]
    b = integrate.quad(lambda z: f(z, 2), -12, 12, points=pts, epsabs=0, epsrel=1e-13, limit=1000)[0]
    return a, b


mp.mp.dps = 40


def mp_resid(xi, m, M, q, lam, d):
    xi, m, M, q, lam, d = map(mp.mpf, (xi, m, M, q, lam, d)); g = d * mp.log((xi + lam - M) / (M - xi))
    f = lambda z, k: (1 / (1 + mp.e ** (-(z - g) / d))) ** k * mp.npdf(z)
    pts = [-mp.inf, g - 4 * d, g - d, g, g + d, g + 4 * d, mp.inf]
    u1 = mp.quad(lambda z: f(z, 1), pts); u2 = mp.quad(lambda z: f(z, 2), pts)
    return float(max(abs((xi + lam * u1) / m - 1), abs((xi * xi + 2 * xi * lam * u1 + lam * lam * u2) / q ** 2 - 1)))


def solve(xi, m, M, q):
    b0 = M - xi
    def par(v):
        lam = b0 + np.exp(v[0]); d = np.exp(v[1]); return lam, d, d * np.log((xi + lam - M) / b0)
    def res(v):
        lam, d, g = par(v); a, b = u12(g, d)
        return [(xi + lam * a) / m - 1, (xi * xi + 2 * xi * lam * a + lam * lam * b) / q ** 2 - 1]
    sols = []
    for ls in np.geomspace(0.1, 30, 7):
        for d0 in np.geomspace(0.08, 6, 8):
            try:
                r = optimize.least_squares(res, [np.log(ls * b0), np.log(d0)], xtol=1e-15, ftol=1e-15, gtol=1e-15, max_nfev=400)
            except Exception:
                continue
            if np.max(np.abs(r.fun)) < 1e-11:
                lam, d, g = par(r.x)
                if not any(abs(lam / s["lambda"] - 1) < 1e-6 and abs(d / s["delta"] - 1) < 1e-6 for s in sols):
                    sols.append(dict(xi=xi, **{"lambda": float(lam)}, gamma=float(g), delta=float(d), resid=float(np.max(np.abs(r.fun)))))
    for x in sols:
        x["mp_resid"] = mp_resid(xi, m, M, q, x["lambda"], x["delta"])
    sols.sort(key=lambda x: -x["delta"])
    return sols


cases = []
# from known SB parameters
for (g, d, xi, lam, nha) in [(0.6, 1.3, 5, 40, 500), (2.5, 0.7, 0, 50, 800), (-1.5, 0.9, 2, 48, 350), (0.0, 2.0, 0, 60, 1200), (0.3, 0.6, 10, 30, 600)]:
    a, b = u12(g, d); m = xi + lam * a; q = np.sqrt(xi * xi + 2 * xi * lam * a + lam * lam * b); M = float(stats.johnsonsb(g, d, loc=xi, scale=lam).ppf(0.5))
    cases.append(dict(name=f"sb({g},{d};{xi},{lam})", truth=dict(xi=xi, **{"lambda": lam}, gamma=g, delta=d), xi=xi, mean=float(m), median=M, dq=float(q), nha=nha, g=float(K * nha * q * q),
                      sols=solve(xi, m, M, q)))
    print(cases[-1]["name"], len(cases[-1]["sols"]), flush=True)
# DIST_SPEC §8.3 as printed
spec = dict(name="spec83", xi=5.0, nha=500, g=18.979383683389663, mean=20.972673017674087, median=20.464836861498966, dq=21.984222451746177)
spec["sols"] = solve(spec["xi"], spec["mean"], spec["median"], np.sqrt(spec["g"] / (K * spec["nha"])))
cases.append(spec)
# measured samples (not SB): ξ = 0 and ξ = 0.5·min
for name, d in FX.items():
    d = np.asarray(d, float)
    if len(d) < 5:
        continue
    m, M, q = float(d.mean()), float(np.median(d)), float(np.sqrt(np.mean(d * d)))
    for xi in (0.0, round(0.5 * float(d.min()), 2)):
        cases.append(dict(name=f"{name}|{xi}", xi=xi, mean=m, median=M, dq=q, sols=solve(xi, m, M, q)))
        print(cases[-1]["name"], len(cases[-1]["sols"]), flush=True)
out = {"scipy": scipy.__version__, "numpy": np.__version__, "K": K, "cases": cases}
(here / "dist_p09.json").write_text(json.dumps(out, indent=1))
print("wrote dist_p09.json:", len(cases), "cases")
