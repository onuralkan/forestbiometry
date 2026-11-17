"""Reference for SV-03, the log-length limit of the merchantable stem: python3 tests/ref/make_taper_sv03.py

Written apart from assets/lab/taper/calc.js, standard library only. Rule from Kershaw, Ducey, Beers, Husch 2016,
Forest Mensuration 5th ed., §6.4.1 step 3 (p. 168-169): whole logs n = integer part of
((hTop - stump - (L + trim)) / (L + trim)) + 1, written here in that form (the JavaScript uses the equivalent
floor((hTop - stump) / (L + trim))); trim allowance §7.4.1; minimum log length §7.4.3. Volumes from the Max and
Burkhart (1976) Model 4 profile by Simpson's rule with the join points as breakpoints (exact: the profile is quadratic
in x on every piece). Coefficients: Max and Burkhart Table 3 (plantation), test values only (K1). Trees random.
Writes tests/ref/taper_sv03.json.
"""
import json, math, os, random

P = dict(b1=-3.0257, b2=1.4586, b3=-1.4464, b4=39.1081, a1=0.7431, a2=0.1125)
def y(x):
    return (P["b1"] * (x - 1) + P["b2"] * (x * x - 1) + (P["b3"] * (P["a1"] - x) ** 2 if x <= P["a1"] else 0)
            + (P["b4"] * (P["a2"] - x) ** 2 if x <= P["a2"] else 0))
def vol(D, H, h1, h2):
    if h2 <= h1: return 0.0
    x1, x2 = h1 / H, h2 / H
    cuts = [x1] + sorted(a for a in (P["a1"], P["a2"]) if x1 < a < x2) + [x2]
    s = 0.0
    for a, b in zip(cuts, cuts[1:]):
        m = (a + b) / 2
        s += (b - a) / 6 * (y(a) + 4 * y(m) + y(b))
    return math.pi / 40000 * D * D * H * s
def dia(D, H, h): return D * math.sqrt(max(0.0, y(h / H)))

def case(D, H, stump, hTop, L, trim, minLen, short):
    top = H if hTop is None else hTop
    span = max(0.0, top - stump); total = vol(D, H, stump, max(stump, top))
    if minLen is not None and L < minLen:
        return dict(n=0, logs=[], short=None, V=dict(logs=0, short=0, trims=0, rest=total, merch=total), code="log.belowmin")
    q = (span - (L + trim)) / (L + trim) + 1          # the book's form
    n = max(0, int(math.floor(q + 1e-9 * max(1, abs(q)))))
    logs, trims = [], 0.0
    for i in range(n):
        h1 = stump + i * (L + trim); h2 = h1 + L
        logs.append(dict(h1=h1, h2=h2, V=vol(D, H, h1, h2), dSmall=dia(D, H, h2)))
        trims += vol(D, H, h2, min(h2 + trim, top))
    used = stump + n * (L + trim); r = top - used; sh = None
    if short == "keep" and r - trim > 1e-9 and (minLen is None or r - trim >= minLen - 1e-9):
        h2 = used + r - trim; sh = dict(h1=used, h2=h2, V=vol(D, H, used, h2), dSmall=dia(D, H, h2)); trims += vol(D, H, h2, top)
    rest = 0.0 if sh else vol(D, H, min(used, top), top)
    return dict(n=n, logs=logs, short=sh, V=dict(logs=sum(l["V"] for l in logs), short=sh["V"] if sh else 0.0, trims=trims, rest=rest, merch=total), code=None)

rnd = random.Random(20261117); cases = []
for k in range(40):
    D = round(rnd.uniform(15, 55), 1); H = round(rnd.uniform(14, 34), 1); stump = round(rnd.choice([0.1, 0.2, 0.3, 0.5]), 2)
    hTop = None if k % 5 == 0 else round(rnd.uniform(0.4, 0.9) * H, 2)
    L = rnd.choice([1.0, 2.0, 2.5, 3.0, 4.0, 5.0]); trim = rnd.choice([0.0, 0.05, 0.1, 0.15])
    minLen = rnd.choice([None, 1.0, 2.0, 2.5]); short = rnd.choice(["drop", "keep"])
    cases.append(dict(D=D, H=H, stump=stump, hTop=hTop, L=L, trim=trim, minLen=minLen, short=short, out=case(D, H, stump, hTop, L, trim, minLen, short)))
# exact multiple: 3 logs of 2 m + 0.1 m trim end exactly at hTop
cases.append(dict(D=30.0, H=25.0, stump=0.3, hTop=0.3 + 3 * 2.1, L=2.0, trim=0.1, minLen=None, short="keep", out=case(30.0, 25.0, 0.3, 0.3 + 3 * 2.1, 2.0, 0.1, None, "keep")))
# full logs shorter than the minimum length
cases.append(dict(D=30.0, H=25.0, stump=0.3, hTop=15.0, L=1.0, trim=0.0, minLen=2.0, short="drop", out=case(30.0, 25.0, 0.3, 15.0, 1.0, 0.0, 2.0, "drop")))
book = (72 - 17.3) / 16.3 + 1
json.dump(dict(params=P, cases=cases, book=dict(hTop=72, stump=1, L=16, trim=0.3, q=book, n=int(book))),
          open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "taper_sv03.json"), "w"), indent=1)
print("wrote taper_sv03.json:", len(cases), "cases; book example", round(book, 3), "->", int(book), "logs")
