"""Synthetic sample and independent reference for Relative Ranking (Module 7).
Writes assets/lab/rank/ornek/ornek-olcutler.xlsx (made-up goodness-of-fit table, NOT real results) and
tests/ref/rank.json computed with numpy from Poudel & Cao (2013) Eq. 10.
Run: python3 tests/ref/make_rank_reference.py
"""
import json, os
import numpy as np, openpyxl

here = os.path.dirname(os.path.abspath(__file__)); root = os.path.join(here, '..', '..')
rng = np.random.default_rng(7)
names = [f'M{i:02d}' for i in range(1, 15)]; names[9] = 'M07'          # duplicate name on purpose
m = len(names)
rmse = np.round(rng.uniform(1.8, 2.6, m), 4); rmse[12] = 4.9                 # one clearly worse model
r2 = np.round(1 - (rmse / 6.5) ** 2, 5)
fi = r2.copy()                                                               # FI = 1 − SSE/SST: same as prediction R² here
bias = np.round(rng.normal(0, 0.15, m), 4); bias[3] = -0.42
mae = np.round(rmse * rng.uniform(0.74, 0.82, m), 4)
aic = np.round(400 * np.log(rmse) + rng.uniform(-6, 6, m) + 2 * rng.integers(2, 5, m), 3)
bic = np.round(aic + rng.uniform(4, 14, m), 3)
cols = ['R²', 'FI', 'Bias', 'RMSE', 'MAE', 'AIC', 'BIC']
X = np.column_stack([r2, fi, bias, rmse, mae, aic, bic])
missing = (5, 'MAE')                                                         # model M06 has no MAE value

wb = openpyxl.Workbook(); ws = wb.active; ws.title = 'girdi'
ws['A1'] = 'Uydurma örnek / made-up example: başarı ölçütleri (goodness-of-fit statistics)'
ws.append([]); ws.append(['Model'] + cols)
for i, n in enumerate(names):
    row = [n] + [float(v) for v in X[i]]
    if i == missing[0]: row[1 + cols.index(missing[1])] = None
    ws.append(row)
ws2 = wb.create_sheet('not'); ws2['A1'] = 'Bu dosya uydurmadır; gerçek bir çalışmanın sonuçları değildir. This file is synthetic.'
wb.save(os.path.join(root, 'assets', 'lab', 'rank', 'ornek', 'ornek-olcutler.xlsx'))

DIR = {'R²': 'max', 'FI': 'max', 'Bias': 'abs', 'RMSE': 'min', 'MAE': 'min', 'AIC': 'min', 'BIC': 'min'}
def rr(s, d):
    v = np.abs(s) if d == 'abs' else s
    if np.ptp(v) == 0: return np.ones_like(v)
    best, worst = (v.max(), v.min()) if d == 'max' else (v.min(), v.max())
    return 1 + (v.size - 1) * (v - best) / (worst - best)
def scenario(use_idx, use_cols):
    S = X[np.ix_(use_idx, [cols.index(c) for c in use_cols])]
    R = np.column_stack([rr(S[:, j], DIR[c]) for j, c in enumerate(use_cols)])
    tot = R.sum(1); ov = rr(tot, 'min')
    return {'models': [names[i] + (f' ({i + 4})' if names.count(names[i]) > 1 else '') for i in use_idx], 'rows': [int(i + 4) for i in use_idx],
            'R': R.tolist(), 'sum': tot.tolist(), 'overall': ov.tolist()}
allc = list(cols)
base = [i for i in range(m) if i != missing[0]]                                # incomplete model left out
ref = {'numpy': np.__version__, 'directions': DIR,
       'all': scenario(base, allc),
       'excl': scenario([i for i in base if i != 12], allc),                    # user excludes the extreme model M13
       'noMAE': scenario(list(range(m)), [c for c in allc if c != 'MAE'])}     # dropping MAE brings M06 back
json.dump(ref, open(os.path.join(here, 'rank.json'), 'w'), indent=1)
print('ok', m, 'models; best (all):', ref['all']['models'][int(np.argmin(ref['all']['overall']))])
