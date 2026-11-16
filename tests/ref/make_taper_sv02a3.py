"""Reference for the Taper tool, stage SV-02/a3 (TOOLS_SPEC TP02): fitting taper equations to stem measurements.

Written apart from the JavaScript code: models written again (Max and Burkhart 1976 Model 4; Kozak 2004 Model 02),
fitted by scipy.optimize.least_squares (method 'lm', tolerances 1e-15, analytic Jacobian not supplied: SciPy's own
finite differences) from its own starting point (true values x 1.05), and by numpy.linalg.lstsq for Kozak's ln d scale.
Data are SIMULATED (numpy default_rng(20261118)): 30 trees, D 12-50 cm, H 10-30 m, points at 0.15 m, 1.3 m and every
1 m up to the top; "true" coefficients are test values (Max and Burkhart Table 3 plantation set; an arbitrary Kozak
set), not shipped with the site (K1). Two data sets per form: noise-free (the coefficients must come back) and with
N(0, 0.4 cm) noise (the fitted coefficients of the tool and of SciPy must agree).
    python3 tests/ref/make_taper_sv02a3.py  ->  tests/ref/taper_sv02a3.json
"""
import json
import math
import pathlib

import numpy as np
import scipy
from scipy.optimize import least_squares

here = pathlib.Path(__file__).parent
rng = np.random.default_rng(20261118)
MB = dict(b1=-3.0257, b2=1.4586, b3=-1.4464, b4=39.1081, a1=0.7431, a2=0.1125)
KZ = dict(a0=1.0, a1=0.95, a2=0.02, b1=0.4, b2=-0.3, b3=0.45, b4=1.5, b5=0.05, b6=-0.25)
MBK, KZK = list(MB), list(KZ)


def mb_y(p, x):
    return (p["b1"] * (x - 1) + p["b2"] * (x * x - 1) + (p["b3"] * (p["a1"] - x) ** 2 if x <= p["a1"] else 0.0)
            + (p["b4"] * (p["a2"] - x) ** 2 if x <= p["a2"] else 0.0))


def kz_d(p, D, H, h):
    z = h / H; X = (1 - z ** (1 / 3)) / (1 - (1.3 / H) ** (1 / 3)); Q = 1 - z ** (1 / 3)
    E = p["b1"] * z ** 4 + p["b2"] / math.exp(D / H) + p["b3"] * X ** 0.1 + p["b4"] / D + p["b5"] * H ** Q + p["b6"] * X
    return p["a0"] * D ** p["a1"] * H ** p["a2"] * X ** E


trees = []
for i in range(30):
    D = float(np.round(rng.uniform(12, 50), 1)); H = float(np.round(rng.uniform(10, 30), 1))
    hs = [0.15, 1.3] + [float(h) for h in np.arange(2.3, H - 0.3, 1.0)]
    trees.append(dict(tree_id=f"T{i + 1}", D=D, H=H, h=hs, noise=rng.normal(0, 0.4, len(hs)).tolist()))


def data(form, noisy):
    out = []
    for t in trees:
        for h, e in zip(t["h"], t["noise"]):
            d = t["D"] * math.sqrt(mb_y(MB, h / t["H"])) if form == "mb76" else kz_d(KZ, t["D"], t["H"], h)
            out.append((t["tree_id"], t["D"], t["H"], h, d + (e if noisy else 0.0)))
    return out


def fit(form, obs, scale):
    D = np.array([o[1] for o in obs]); H = np.array([o[2] for o in obs]); h = np.array([o[3] for o in obs]); d = np.array([o[4] for o in obs])
    if form == "mb76":
        def res(th):
            p = dict(zip(MBK, th)); y = np.array([mb_y(p, hi / Hi) for hi, Hi in zip(h, H)])
            return y - (d / D) ** 2 if scale == "source" else D * np.sqrt(np.maximum(y, 0)) - d
        x0 = np.array([MB[k] for k in MBK]) * 1.05
    else:
        def res(th):
            p = dict(zip(KZK, th)); return np.array([kz_d(p, Di, Hi, hi) for Di, Hi, hi in zip(D, H, h)]) - d
        x0 = np.array([KZ[k] for k in KZK]) * 1.05
    r = least_squares(res, x0, method="lm", xtol=1e-15, ftol=1e-15, gtol=1e-15, max_nfev=200000)
    return dict(params=dict(zip(MBK if form == "mb76" else KZK, r.x.tolist())), sse=float(np.sum(r.fun ** 2)), status=int(r.status))


def kz_loglinear(obs):
    rows, ys = [], []
    for _, D, H, h, d in obs:
        z = h / H; X = (1 - z ** (1 / 3)) / (1 - (1.3 / H) ** (1 / 3)); Q = 1 - z ** (1 / 3); lx = math.log(X)
        rows.append([1, math.log(D), math.log(H), z ** 4 * lx, lx / math.exp(D / H), X ** 0.1 * lx, lx / D, H ** Q * lx, X * lx]); ys.append(math.log(d))
    c, *_ = np.linalg.lstsq(np.array(rows), np.array(ys), rcond=None)
    return dict(zip(KZK, [math.exp(c[0])] + c[1:].tolist()))


out = {"numpy": np.__version__, "scipy": scipy.__version__, "seed": 20261118, "trees": trees, "true": {"mb76": MB, "kozak02": KZ}, "fits": []}
for form in ("mb76", "kozak02"):
    for noisy in (False, True):
        obs = data(form, noisy)
        rec = dict(form=form, noisy=noisy, d=[o[4] for o in obs])
        rec["d_scale"] = fit(form, obs, "d")
        if form == "mb76": rec["source_scale"] = fit(form, obs, "source")
        else: rec["source_scale"] = dict(params=kz_loglinear(obs))
        out["fits"].append(rec)
(here / "taper_sv02a3.json").write_text(json.dumps(out, indent=1))
print("written", here / "taper_sv02a3.json", [(f["form"], f["noisy"], f["d_scale"]["status"]) for f in out["fits"]])
