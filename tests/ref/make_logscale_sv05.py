"""Reference for log scaling (SV-05): python3 tests/ref/make_logscale_sv05.py

Written apart from assets/lab/logscale/calc.js, standard library only. Rules of Kershaw et al. 2016 §7.3:
Scribner (7.3), Doyle (7.5), International 1/8-in. (7.7-7.10) and 1/4-in. (Grosenbaugh 1952a); scaling per §7.4.1:
diameter to the nearest inch, length in whole (or even) feet rounded down, logs over the maximum length split into
segments of whole feet (butt longer), separation diameter linear between the ends; cubic volume by Smalian, Huber and
Newton (Table 6.1). Random logs (test numbers). Writes tests/ref/logscale_sv05.json.
"""
import json, math, os, random
IN, FT = 2.54, 0.3048
def bf(rule, D, L):
    if rule == "scribner": v = (0.79 * D ** 2 - 2 * D - 4) * L / 16
    elif rule == "doyle":
        if D <= 4: return None
        v = ((D - 4) / 4) ** 2 * L
    elif rule == "intl8":
        c = {8: (0.44, 1.20, 0.30), 12: (0.66, 1.47, 0.79), 16: (0.88, 1.52, 1.36), 20: (1.10, 1.35, 1.90)}.get(L)
        if c is None: return None
        v = c[0] * D ** 2 - c[1] * D - c[2]
    else: v = 0.0497621 * L * D ** 2 + 0.006220 * L ** 2 * D - 0.185476 * L * D + 0.000259 * L ** 3 - 0.011592 * L ** 2 + 0.042222 * L
    return v if v > 0 else None
def scale(ds, db, Lm, rule_len, maxft, roundD, round5):
    ft = Lm / FT + 1e-9
    L = 2 * math.floor(ft / 2) if rule_len == "even" else math.floor(ft)
    k = 1 if not maxft else math.ceil(L / maxft - 1e-9)
    if k > 1:
        w = L // k; extra = L - w * k; lens = [w + (1 if i < extra else 0) for i in range(k)]
    else: lens = [L]
    segs, frm = [], 0
    for l in lens:
        top = frm + l
        dcm = ds if (k == 1 or abs(top - L) < 1e-9) else ds + (db - ds) * (L - top) / L
        Din = round(dcm / IN) if roundD else dcm / IN
        segs.append((frm, l, dcm, Din)); frm = top
    out = {}
    for r in ("scribner", "doyle", "intl8", "intl4"):
        vs = [bf(r, s[3], s[1]) for s in segs]
        if any(v is None for v in vs): out[r] = None
        else: out[r] = sum(5 * round(v / 5) if (round5 and r in ("intl8", "intl4")) else v for v in vs)
    return L, [list(s) for s in segs], out
def cubic(ds, db, dm, Lm):
    A = lambda d: math.pi / 4 * (d / 100) ** 2
    return {"smalian": Lm / 2 * (A(db) + A(ds)), "huber": A(dm) * Lm, "newton": Lm / 6 * (A(db) + 4 * A(dm) + A(ds))}
rnd = random.Random(1906); cases = []
for i in range(40):
    ds = round(rnd.uniform(15, 70), 1); db = round(ds + rnd.uniform(1, 12), 1); dm = round((ds + db) / 2 + rnd.uniform(-0.5, 0.5), 1)
    Lm = rnd.choice([2.44, 3.66, 4.88, 6.1, 2.5, 4.0, 5.2, 7.5, 9.9, 12.3])
    lr = rnd.choice(["whole", "even"]); mx = rnd.choice([None, 16, 40, 8]); rd = rnd.choice([True, False]); r5 = rnd.choice([False, True])
    L, segs, out = scale(ds, db, Lm, lr, mx, rd, r5)
    cases.append(dict(ds=ds, db=db, dm=dm, Lm=Lm, lengthRule=lr, maxFt=mx, roundD=rd, round5=r5, Lft=L, segs=segs, bf=out, cubic=cubic(ds, db, dm, Lm)))
json.dump({"cases": cases}, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "logscale_sv05.json"), "w"), indent=1)
print("wrote logscale_sv05.json:", len(cases), "logs")
