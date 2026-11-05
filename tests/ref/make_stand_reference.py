"""Independent reference for the Plot & Stand Metrics tool (Module 2).
Reads tests/stand/fixture.json and writes tests/ref/stand.json using numpy only.
Formulas from the textbook definitions (docs/METHODS.md §6), written separately from assets/lab/stand/calc.js.
Run: python3 tests/ref/make_stand_reference.py
"""
import json, math, os
import numpy as np

here = os.path.dirname(os.path.abspath(__file__))
ds = json.load(open(os.path.join(here, '..', 'stand', 'fixture.json'), encoding='utf-8'))
BREAKS = np.arange(8, 61, 4.0)          # 8,12,...,60 plus an open top class [60, inf)
SCEN = {
    'all_empty': {'status': None, 'empty': True},
    'live_unmeasured': {'status': {'canli', ''}, 'empty': False},
}
FOREST_HA = 120.0
STRATA_HA = {'A': 70.0, 'B': 50.0}

def plot_unit(pl, trees):
    A = pl['plot_area']; ef = 1e4 / A
    d = np.array([t['dbh'] for t in trees], float); n = d.size
    g = np.pi * d ** 2 / 4 / 1e4
    out = {'plot_id': pl['plot_id'], 'n': n, 'Nha': n * ef, 'G_m2': float(g.sum()), 'Gha': float(g.sum()) * ef}
    out['d_mean'] = float(d.mean()) if n else None
    out['dq'] = float(np.sqrt((d ** 2).mean())) if n else None
    out['d_sd'] = float(d.std(ddof=1)) if n > 1 else None
    out['d_min'] = float(d.min()) if n else None
    out['d_max'] = float(d.max()) if n else None
    edges = np.append(BREAKS, np.inf)
    cnt, _ = np.histogram(d, bins=edges)      # numpy bins are [a,b) except the last which is [a,b]; last is inf so fine
    out['class_n'] = cnt.tolist(); out['below'] = int((d < BREAKS[0]).sum())
    sp = sorted(set(t['species'] for t in trees))
    out['species'] = {s: {'n': sum(1 for t in trees if t['species'] == s),
                          'shareN': sum(1 for t in trees if t['species'] == s) / n,
                          'shareG': float(sum(np.pi * t['dbh'] ** 2 / 4e4 for t in trees if t['species'] == s) / g.sum())} for s in sp}
    hm = np.array([t['height'] for t in trees if t['height'] is not None and t.get('height_source') != 'estimated'], float)
    he = np.array([t['height'] for t in trees if t['height'] is not None and t.get('height_source') == 'estimated'], float)
    out['h_measured_n'] = int(hm.size); out['h_measured_mean'] = float(hm.mean()) if hm.size else None
    out['h_estimated_n'] = int(he.size); out['h_estimated_mean'] = float(he.mean()) if he.size else None
    return out

ref = {'breaks': BREAKS.tolist(), 'forest_ha': FOREST_HA, 'strata_ha': STRATA_HA, 'scenarios': {}}
periods = sorted(set(t['period'] for t in ds['trees']))
for name, sc in SCEN.items():
    res = {}
    for per in periods:
        units = []
        for pl in ds['plots']:
            recs = [t for t in ds['trees'] if t['plot_id'] == pl['plot_id'] and t['period'] == per]
            if not recs and not sc['empty']:
                continue
            trees = [t for t in recs if sc['status'] is None or (t['status'] or '') in sc['status']]
            u = plot_unit(pl, trees); u['stratum'] = pl['stratum']; units.append(u)
        N = np.array([u['Nha'] for u in units]); G = np.array([u['Gha'] for u in units]); m = len(units)
        srs = {k: {'mean': float(v.mean()), 'se': float(v.std(ddof=1) / math.sqrt(m)), 'total': float(v.mean() * FOREST_HA)} for k, v in (('Nha', N), ('Gha', G))} if m > 1 else None
        strat = None
        strata = sorted(set(u['stratum'] for u in units))
        if all(sum(1 for u in units if u['stratum'] == h) > 1 for h in strata):
            A = sum(STRATA_HA[h] for h in strata); strat = {}
            for k in ('Nha', 'Gha'):
                mean = 0.0; var = 0.0
                for h in strata:
                    v = np.array([u[k] for u in units if u['stratum'] == h]); W = STRATA_HA[h] / A
                    mean += W * v.mean(); var += W ** 2 * v.var(ddof=1) / v.size
                strat[k] = {'mean': mean, 'se': math.sqrt(var)}
        between = {k: {'mean': float(v.mean()), 'sd': float(v.std(ddof=1)), 'median': float(np.median(v))} for k, v in (('Nha', N), ('Gha', G))} if m > 1 else None
        res[per] = {'units': units, 'srs': srs, 'strat': strat, 'between': between}
    ref['scenarios'][name] = res
ref['numpy'] = np.__version__
json.dump(ref, open(os.path.join(here, 'stand.json'), 'w'), indent=1)
print('wrote tests/ref/stand.json')
