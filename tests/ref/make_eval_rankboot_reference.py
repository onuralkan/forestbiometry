"""Independent reference for the rank uncertainty of Model Evaluation (1.2.0-beta.3, 21 Nov 2026).

Written here from the definitions, not from the tool's code:
- bootstrap samples: n row indices drawn with replacement, floor(u * n) with u from mulberry32(seed) (the tool's
  generator, core/stats.js rng), the same rows for every model (DiCiccio and Efron 1996, section 6);
- criteria per model and sample: bias = mean(y - yhat), MAE, RMSE, R2 = 1 - SSE/SST (sample skipped if R2 undefined);
- relative rank per criterion (Poudel and Cao 2013, Eq. 10, generalised by direction as in Relative Ranking,
  METHODS section 9): R = 1 + (m - 1)(S - best)/(worst - best), |bias| and MAE/RMSE smaller, R2 larger; all equal -> 1;
- overall: sum of the criterion ranks rescaled the same way (smaller is better); rank number by competition ranking;
- percentile endpoint: the ceil(alpha * B)-th smallest replication (DiCiccio and Efron 1996, eq. 2.2).
Run from the repository root: python3 tests/ref/make_eval_rankboot_reference.py  (writes tests/ref/eval_rankboot.json)
"""
import json
import math
import numpy as np

M32 = 0xFFFFFFFF


def imul(a, b):
    return (a * b) & M32


def mulberry32(seed):
    state = [seed & M32]

    def nxt():
        state[0] = (state[0] + 0x6D2B79F5) & M32
        t = state[0]
        t = imul(t ^ (t >> 15), t | 1)
        t ^= (t + imul(t ^ (t >> 7), t | 61)) & M32
        return ((t ^ (t >> 14)) & M32) / 4294967296.0
    return nxt


def criteria(y, p):
    e = y - p
    sst = float(np.sum((y - y.mean()) ** 2))
    r2 = 1.0 - float(np.sum(e * e)) / sst if (y.max() > y.min() and sst > 0) else float('nan')
    return [float(e.mean()), float(np.abs(e).mean()), math.sqrt(float(np.mean(e * e))), r2]


def rel(S, direction):
    v = np.abs(S) if direction == 'abs' else np.asarray(S, dtype=float)
    lo, hi = float(v.min()), float(v.max())
    if hi == lo:
        return np.ones(len(v))
    best, worst = (hi, lo) if direction == 'max' else (lo, hi)
    return 1 + (len(v) - 1) * (v - best) / (worst - best)


def competition(v):
    order = sorted(range(len(v)), key=lambda i: v[i])
    out = [0] * len(v)
    for k, i in enumerate(order):
        j = order[k - 1] if k else None
        out[i] = out[j] if k and abs(v[i] - v[j]) <= 1e-12 * max(1.0, abs(v[i])) else k + 1
    return out


DIRS = ['abs', 'min', 'min', 'max']


def rank_models(y, P, idx):
    c = [criteria(y[idx], p[idx]) for p in P]
    if any(not math.isfinite(x) for row in c for x in row):
        return None
    per = [rel([row[k] for row in c], DIRS[k]) for k in range(4)]
    overall = rel(np.sum(per, axis=0), 'min')
    return overall, competition(list(overall))


def run(y, P, B, seed, level):
    y = np.asarray(y, float)
    P = [np.asarray(p, float) for p in P]
    n, m = len(y), len(P)
    est = rank_models(y, P, np.arange(n))
    r = mulberry32(seed)
    reps = [[] for _ in range(m)]
    best = [0] * m
    ords = [0] * m
    ok = skipped = 0
    for _ in range(B):
        idx = np.array([math.floor(r() * n) for _ in range(n)])
        res = rank_models(y, P, idx)
        if res is None:
            skipped += 1
            continue
        ok += 1
        for i in range(m):
            reps[i].append(float(res[0][i]))
            ords[i] += res[1][i]
            best[i] += res[1][i] == 1
    lo, hi = (1 - level) / 2, (1 + level) / 2

    def endpoint(s, a):
        k = min(len(s), max(1, math.ceil(a * len(s) - 1e-9)))
        return s[k - 1]
    models = []
    for i in range(m):
        s = sorted(reps[i])
        models.append({'overall': float(est[0][i]), 'ordinal': est[1][i], 'lo': endpoint(s, lo), 'hi': endpoint(s, hi),
                       'meanOrdinal': ords[i] / ok, 'pBest': best[i] / ok})
    return {'n': n, 'm': m, 'B': B, 'seed': seed, 'level': level, 'Bok': ok, 'skipped': skipped, 'models': models}


def read_sample():
    rows = open('assets/lab/eval/ornek/ornek-tahminler.csv', encoding='utf-8').read().strip().split('\n')
    head = rows[0].split(';')
    io, i1, i2 = head.index('h_obs'), head.index('h_m1'), head.index('h_m2')
    y, a, b = [], [], []
    for line in rows[1:]:
        c = line.split(';')

        def num(x):
            x = x.strip().replace(',', '.')
            try:
                return float(x)
            except ValueError:
                return None
        v = [num(c[io]) if io < len(c) else None, num(c[i1]) if i1 < len(c) else None, num(c[i2]) if i2 < len(c) else None]
        if None in v:
            continue
        y.append(v[0]); a.append(v[1]); b.append(v[2])
    return y, [a, b]


out = {}
y, P = read_sample()
out['sample'] = run(y, P, 1000, 1, 0.95)
# simulated: four models of different quality, one almost equal to another (ties in some samples)
g = np.random.default_rng(20261121)
d = g.uniform(8, 60, 60)
yt = 1.3 + 30 * (1 - np.exp(-0.04 * d)) ** 1.2
ys = np.round(yt + g.normal(0, 1.5, 60), 2)
sim = {'y': ys.tolist(), 'P': [np.round(yt, 3).tolist(), np.round(yt + 0.8, 3).tolist(), np.round(yt * 1.05 + g.normal(0, 1, 60), 3).tolist(),
                               np.round(yt + 0.8 + 1e-9, 3).tolist()]}
out['simulated'] = {'data': sim, 'result': run(sim['y'], sim['P'], 500, 7, 0.9)}
# constant observed values in a sample: R2 undefined -> skipped; tiny n makes that frequent
tiny = {'y': [10.0, 10.0, 12.0], 'P': [[10.5, 9.5, 11.0], [11.0, 10.0, 12.5]]}
out['tiny'] = {'data': tiny, 'result': run(tiny['y'], tiny['P'], 200, 3, 0.95)}
json.dump(out, open('tests/ref/eval_rankboot.json', 'w'), indent=1)
print('wrote tests/ref/eval_rankboot.json', {k: (v['Bok'] if 'Bok' in v else v['result']['Bok']) for k, v in out.items()})
