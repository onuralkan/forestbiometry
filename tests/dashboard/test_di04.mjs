// Data visualization (DI-04): assets/lab/dashboard/calc.js.
//   node tests/dashboard/test_di04.mjs
// References: counts and class frequencies by hand on a small package; per-plot N/ha and G/ha by hand
// (N = n · 10000/A, G = Σ π d²/40000 · 10000/A); the Weibull density in closed form, f(x) = (c/b)(x/b)^(c−1)
// exp(−(x/b)^c), and its conditional form inside a threshold, f(x)/S(L) with S(L) = exp(−(L/b)^c); the Näslund
// curve h = 1.3 + d²/(a + b·d)² written out. Fitted parameters come from the engines (tested in their own tests).
import * as C from '../../assets/lab/dashboard/calc.js';
import * as D from '../../assets/lab/dist/index.js';
import { seal } from '../../assets/lab/core/record.js';
import { sha256JSON } from '../../assets/lab/core/record.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, tol = 1e-12) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const ALL = C.ALL;

const ds = { schema: 'forest-dataset/1', created: '2026-11-16T10:00:00Z',
  plots: [{ plot_id: 'P1', plot_area: 400, stratum: 'A' }, { plot_id: 'P2', plot_area: 500, stratum: 'B' }, { plot_id: 'P10', plot_area: 400, stratum: 'A' }],
  trees: [
    { plot_id: 'P1', tree_id: '1', period: '2019', species: 'Abies', dbh: 20, height: 15 },
    { plot_id: 'P1', tree_id: '2', period: '2019', species: 'Fagus', dbh: 30, height: 20, x: 3, y: 4 },
    { plot_id: 'P1', tree_id: '1', period: '2024', species: 'Abies', dbh: 22, height: 16.5, height_source: 'estimated' },
    { plot_id: 'P2', tree_id: '1', period: '2024', species: 'Abies', dbh: 40, height: null },
    { plot_id: 'P2', tree_id: '2', period: '2024', species: null, dbh: 10, height: 8 } ] };

// options and filters
const o = C.options(ds);
ok(o.periods.join() === '2019,2024' && o.strata.join() === 'A,B' && o.species.join() === ',Abies,Fagus' && o.plots.join() === 'P1,P2,P10', 'filter options, natural plot order, blank species kept');
const f = (x = {}) => ({ ...C.blankFilter(), ...x });
ok(C.filterTrees(ds, f()).length === 5 && C.filterTrees(ds, f({ period: '2024' })).length === 3 && C.filterTrees(ds, f({ stratum: 'A' })).length === 3 && C.filterTrees(ds, f({ species: '' })).length === 1 && C.filterTrees(ds, f({ plot: 'P2', species: 'Abies' })).length === 1, 'filters: period, stratum (through the plot), blank species, plot + species');

// histogram
ok(C.niceWidth(30) === 5 && C.niceWidth(12) === 1 && C.niceWidth(200) === 20 && C.niceWidth(0) === 1, 'class width: about 12 classes, 1/2/5 × 10^k');
const h = C.histogram([10, 20, 22, 30, 40], 10);
ok(h.map(b => `${b.lo}-${b.hi}:${b.n}`).join() === '10-20:1,20-30:2,30-40:1,40-50:1', 'classes [lo, hi): 10 | 20 22 | 30 | 40');
ok(near(h.reduce((a, b) => a + b.dens * (b.hi - b.lo), 0), 1) && near(h[1].dens, 2 / 50), 'density bars integrate to 1');
ok(C.histogram([7.4, 7.9], 0.5).map(b => `${b.lo}:${b.n}`).join() === '7:1,7.5:1' && C.histogram([], 1).length === 0, 'start at a multiple of the width; empty input');

// species table
const sp = C.speciesTable(C.filterTrees(ds, f()));
const g = d => Math.PI * d * d / 40000;
ok(sp[0].species === 'Abies' && sp[0].n === 3 && near(sp[0].g, g(20) + g(22) + g(40)) && near(sp[0].shareG, (g(20) + g(22) + g(40)) / (g(20) + g(30) + g(22) + g(40) + g(10))) && near(sp[0].shareN, 3 / 5), 'species: count, basal area and shares');

// per-plot table (Plot & Stand engine): hand values
let pt = C.plotTable(ds, f({ period: '2019' }), 'unmeasured');
ok(pt.rows.length === 1 && pt.rows[0].plot === 'P1' && near(pt.rows[0].Nha, 2 * 25) && near(pt.rows[0].Gha, (g(20) + g(30)) * 25), '2019, combinations without records left out: P1 only, N = 50, G by hand');
pt = C.plotTable(ds, f({ period: '2019' }), 'empty');
ok(pt.rows.length === 3 && pt.rows.filter(r => r.Nha === 0).length === 2 && near(pt.mean.Nha, 50 / 3), '2019 as empty: P2 and P10 count with 0; mean over three plots');
pt = C.plotTable(ds, f({ period: '2024', species: 'Abies' }), 'unmeasured');
ok(pt.rows.map(r => `${r.plot}:${r.Nha}`).join() === 'P1:25,P2:20' && near(pt.rows[1].Gha, g(40) * 20), 'species filter: that species per hectare (P2: 1 tree on 500 m² → 20/ha)');
pt = C.plotTable(ds, f({ period: '2024', species: 'Fagus' }), 'unmeasured');
ok(pt.rows.every(r => r.Nha === 0 && r.Gha === 0) && pt.rows.length === 2, 'absent species: 0 on measured plots');
ok(C.plotTable(ds, f({ stratum: 'B' }), 'unmeasured').rows.every(r => r.plot === 'P2'), 'stratum filter on plots');

// height–diameter points and positions
const hp = C.hdPoints(C.filterTrees(ds, f()));
ok(hp.measured.length === 3 && hp.estimated.length === 1 && hp.estimated[0][1] === 16.5, 'measured and estimated heights apart; missing heights left out');
ok(C.positions(C.filterTrees(ds, f())).length === 1, 'positions only where x and y exist');

// run records: Diameter Distribution (plain and conditional Weibull), Height–Diameter
const d = [10, 12, 15, 18, 20, 22, 25, 28, 30, 35, 40];
const rml = D.runMethod('weibull.ml', { d, plot: D.POOL, period: '2024' }), rt = D.runMethod('weibull.tml', { d, plot: 'P1', period: '2024' }, { trunc: { lower: 8 } });
const pkgSha = await sha256JSON(ds);
const distRec = JSON.parse(JSON.stringify(await seal({ format: 'run-record/1', tool: { id: 'cap-dagilimi', version: '2.2.0', ids: ['SS-03'], page: 'diameter-distribution.php' }, build: { commit: null, site: null }, created: '2026-11-16T12:00:00Z', lang: 'tr',
  inputs: [{ role: 'data', kind: 'file', name: 'x.csv', sha256: 'ab' }], results: [rml, rt, { ...rml, status: 'error', params: null }] })));
const rr = await C.readRecord(distRec, pkgSha);
ok(rr.ok && rr.kind === 'dist' && rr.seal === true && rr.fromPackage === null, 'distribution record read: sealed, made from a file (cannot tell whether from this package)');
const xs = C.grid(5, 50, 46);
const pooled = C.distCurves(distRec, f({ period: '2024' }), xs);
const wb = (x, b, c) => x <= 0 ? 0 : (c / b) * (x / b) ** (c - 1) * Math.exp(-((x / b) ** c));
ok(pooled.length === 1 && pooled[0].pts.every(([x, y]) => near(y, wb(x, rml.params.b, rml.params.c), 1e-10)), 'pooled unit: plain Weibull density = closed form');
ok(C.distCurves(distRec, f({ period: '2019' }), xs).length === 0 && C.distCurves(distRec, f(), xs).length === 0, 'other period, or all periods: no curve from per-period results');
const one = C.distCurves(distRec, f({ period: '2024', plot: 'P1' }), xs);
const S8 = Math.exp(-((8 / rt.params.b) ** rt.params.c));
ok(one.length === 1 && one[0].truncated && one[0].pts.every(([x, y]) => near(y, x < 8 ? 0 : wb(x, rt.params.b, rt.params.c) / S8, 1e-10)), 'plot P1, threshold 8 cm: conditional density f(x)/S(8), 0 below the threshold');
const fine = C.grid(8, 400, 40000); let area = 0; const fp = C.distCurves(distRec, f({ period: '2024', plot: 'P1' }), fine)[0].pts;
for (let i = 1; i < fp.length; i++) area += (fp[i][0] - fp[i - 1][0]) * (fp[i][1] + fp[i - 1][1]) / 2;
ok(Math.abs(area - 1) < 1e-4, 'conditional density integrates to 1 above the threshold: ' + area.toFixed(6));

const hdRec = { format: 'run-record/1', tool: { id: 'boy-cap', version: '1.1.0' }, created: 'x', inputs: [{ role: 'dataset', kind: 'dataset', sha256: pkgSha }],
  settings: { breastHeight: 1.3, model: 'naslund' }, fits: [{ id: 'naslund', status: 'ok', theta: [1.8, 0.21] }, { id: 'curtis', status: 'failed' }, { id: 'nope', status: 'ok', theta: [1] }] };
const hr = await C.readRecord(hdRec, pkgSha);
ok(hr.ok && hr.kind === 'hd' && hr.fromPackage === true && hr.seal === null, 'height record: made from this package (dataset fingerprint), unsealed record reported');
ok((await C.readRecord(hdRec, 'other')).fromPackage === false, 'dataset input with another fingerprint: not from this package');
const hc = C.hdCurves(hdRec, [5, 20, 50]);
ok(hc.length === 1 && hc[0].chosen && hc[0].pts.every(([dd, hh]) => near(hh, 1.3 + dd * dd / (1.8 + 0.21 * dd) ** 2)), 'Näslund curve = h = 1.3 + d²/(a + b·d)²; failed and unknown models skipped');
ok((await C.readRecord({ format: 'run-record/1', tool: { id: 'bonitet', version: '1' }, inputs: [] }, pkgSha)).kind === 'other', 'other tools: listed, not drawn');
ok(!(await C.readRecord({ schema: 'forest-dataset/1', plots: [], trees: [] }, pkgSha)).ok, 'a data package is not a record');

console.log(`DI-04 dashboard: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
