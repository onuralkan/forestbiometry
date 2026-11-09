"""Reference values for the Inventory Sampling Planner (tests/sampling/test_sampling.mjs).
Independent of the JavaScript code: scipy.stats.norm.ppf for z, numpy for pilot statistics, plain Python for
n0 = z²(CV/E)², the finite-frame form n0 / [1 + (n0 − 1)/M] and rounding up.
Writes assets/lab/sampling/ornek/ornek-pilot.csv (synthetic, fixed seed; NOT real measurements), tests/sampling/fixture.csv
(edge cases) and tests/ref/sampling.json.  Run: python3 tests/ref/make_sampling_reference.py
"""
import json, os, csv, math
import numpy as np
from scipy import stats
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def ceil_n(x): return math.ceil(x - 1e-9*max(1, abs(x)))
def plan(z, cv, e, M=None):
    n0 = z*z*(cv/e)**2
    n = n0/(1 + (n0 - 1)/M) if M else n0
    return dict(n0Raw=n0, n0=ceil_n(n0), nRaw=n, n=ceil_n(n))

def main():
    rng = np.random.default_rng(20261109)
    # sample pilot: 14 plots, volume per hectare (lognormal), one empty cell
    vol = np.round(rng.lognormal(np.log(220), 0.32, 14), 1)
    rows = [[f'A{i+1:02d}', f'{v:.1f}'] for i, v in enumerate(vol)]
    rows[5][1] = ''
    with open(os.path.join(ROOT, 'assets/lab/sampling/ornek/ornek-pilot.csv'), 'w', newline='', encoding='utf-8') as fh:
        w = csv.writer(fh); w.writerow(['ornek_alan', 'hacim_m3_ha']); w.writerows(rows)
    sample = np.array([float(r[1]) for r in rows if r[1]])
    # edge-case fixture: two periods (duplicate ids unless filtered), a negative value, an unreadable value, an empty value
    fx = [['P1', '2023', '210.5'], ['P2', '2023', '180.0'], ['P3', '2023', '-12'], ['P4', '2023', 'abc'], ['P5', '2023', ''], ['P6', '2023', '240.25'],
          ['P7', '2023', '0'], ['P1', '2024', '220.0'], ['P2', '2024', '190.5'], ['P6', '2024', '251.0']]
    with open(os.path.join(ROOT, 'tests/sampling/fixture.csv'), 'w', newline='', encoding='utf-8') as fh:
        w = csv.writer(fh); w.writerow(['plot_id', 'period', 'V_m3_ha']); w.writerows(fx)
    f23 = np.array([210.5, 180.0, 240.25, 0.0])
    def st(a): return dict(n=len(a), mean=float(a.mean()), sd=float(a.std(ddof=1)), cv=float(a.std(ddof=1)/a.mean()*100))
    ref = dict(note='Synthetic data (numpy default_rng(20261109)); not real measurements.',
               z={str(l): float(stats.norm.ppf(1 - (1 - l/100)/2)) for l in (80, 90, 95, 99, 99.9, 75)},
               sample=st(sample), fixture2023=st(f23))
    z95 = ref['z']['95']
    ref['acceptance'] = dict(z196=plan(1.96, 30, 10), z95=plan(z95, 30, 10))
    grid = {}
    for e in (2.5, 5, 7.5, 10, 12.5, 15, 20, 25, 30):
        grid[str(e)] = dict(inf=plan(z95, 30, e), M500=plan(z95, 30, e, 500), M60=plan(z95, 30, e, 60))
    ref['grid_cv30_95'] = grid
    cs = ref['sample']['cv']
    ref['sample_plan'] = {str(l): plan(ref['z'][str(l)], cs, 8) for l in (80, 90, 95, 99)}
    ref['versions'] = dict(numpy=np.__version__, scipy=__import__('scipy').__version__)
    json.dump(ref, open(os.path.join(ROOT, 'tests/ref/sampling.json'), 'w'), indent=1)
    print(json.dumps(ref['acceptance']), ref['sample'])

if __name__ == '__main__': main()
