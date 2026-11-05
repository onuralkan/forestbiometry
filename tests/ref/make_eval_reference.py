"""Independent reference for Model Evaluation (Module 3), using scikit-learn and numpy.
Reads tests/eval/fixture.csv (synthetic) and writes tests/ref/eval.json.
Run: python3 tests/ref/make_eval_reference.py
"""
import csv, json, math, os
import numpy as np
import sklearn
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score

here = os.path.dirname(os.path.abspath(__file__))
rows = list(csv.DictReader(open(os.path.join(here, '..', 'eval', 'fixture.csv'), encoding='utf-8'), delimiter=';'))

def num(s):
    try: return float(s.replace(',', '.')) if s.strip() else None
    except ValueError: return None

def measures(o, p):
    o = np.asarray(o, float); p = np.asarray(p, float); e = p - o
    r = {'n': int(o.size), 'bias': float(e.mean()), 'mae': float(mean_absolute_error(o, p)), 'rmse': float(root_mean_squared_error(o, p))}
    # sklearn's r2_score returns a finite placeholder for constant y_true; the definition says undefined
    r['r2'] = None if np.ptp(o) == 0 else float(r2_score(o, p))
    r['rel_mean'] = {k: r[k] / o.mean() * 100 for k in ('bias', 'mae', 'rmse')} if o.mean() > 0 else None
    sd = o.std(ddof=1) if o.size > 1 else 0
    r['rel_sd'] = {k: r[k] / sd * 100 for k in ('bias', 'mae', 'rmse')} if sd > 0 else None
    r['rel_range'] = {k: r[k] / np.ptp(o) * 100 for k in ('bias', 'mae', 'rmse')} if np.ptp(o) > 0 else None
    return r

obs = [num(r['h_obs']) for r in rows]
m = {'h_m1': [num(r['h_m1']) for r in rows], 'h_m2': [num(r['h_m2']) for r in rows]}
common = [i for i in range(len(rows)) if obs[i] is not None and all(m[k][i] is not None for k in m)]
out = {'sklearn': sklearn.__version__, 'n_rows': len(rows), 'n_common': len(common), 'common': {}, 'own': {}, 'groups_common': {}}
for k in m:
    own = [i for i in range(len(rows)) if obs[i] is not None and m[k][i] is not None]
    out['common'][k] = measures([obs[i] for i in common], [m[k][i] for i in common])
    out['own'][k] = measures([obs[i] for i in own], [m[k][i] for i in own])
    for g in ('plot', 'species', 'fold'):
        labs = sorted(set(rows[i][g] for i in common))
        out['groups_common'].setdefault(k, {})[g] = {l: measures([obs[i] for i in common if rows[i][g] == l], [m[k][i] for i in common if rows[i][g] == l]) for l in labs}
# hand examples from the module prompt
out['acceptance'] = measures([10, 20, 30], [12, 18, 33])
out['perfect'] = measures([10, 20, 30], [10, 20, 30])
out['constant'] = measures([5, 5, 5], [4, 5, 7])
out['negative_r2'] = measures([10, 20, 30], [30, 10, 50])
json.dump(out, open(os.path.join(here, 'eval.json'), 'w'), indent=1)
print('wrote tests/ref/eval.json', out['n_common'], out['acceptance'])
