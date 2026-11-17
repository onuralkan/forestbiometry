// Biomass and carbon over a package (TOOLS_SPEC BC02): computeAllometric and computeVolume in assets/lab/biomass/calc.js.
//   node tests/biomass/test_bc02.mjs
// Reference: tests/ref/biomass_bc02.json from tests/ref/make_biomass_bc02.py (plain Python, tree by tree and unit by
// unit with explicit loops). Coefficients are random test numbers, not the coefficients of any species.
import { readFile } from 'node:fs/promises';
import * as B from '../../assets/lab/biomass/calc.js';
import { blankSet } from '../../assets/lab/core/coef.js';

const REF = JSON.parse(await readFile(new URL('../ref/biomass_bc02.json', import.meta.url), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const same = (a, b) => a === null || b === null ? a === b : Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(b));

const sets = new Map();
for (const [id, s] of Object.entries(REF.sets)) {
  const z = blankSet('biomass.' + s.form);
  sets.set(id, { ...z, id, params: s.params, transform: s.transform ?? (B.FORMS[s.form].scale === 'none' ? null : { kind: B.FORMS[s.form].scale, correction: 'none' }), source: { citation: 'test values only' }, origin: 'user-entered' });
}
const ds = { schema: 'forest-dataset/1', plots: REF.plots, trees: REF.trees.map(t => ({ ...t })) };
const cfg = { components: [{ key: 'stem', CF: REF.CF.stem }, { key: 'branch', CF: REF.CF.branch }], map: { A: { stem: 'A.stem', branch: 'A.branch' }, B: { stem: 'B.stem', branch: 'B.branch' } } };
const R = B.computeAllometric(ds, cfg, sets);

// species
ok(B.speciesOf(ds).map(x => x.species).sort().join() === 'A,B,C', 'species of the package');
// trees
let bad = 0;
R.trees.forEach((x, i) => { const r = REF.per_tree[i]; for (const c of ['stem', 'branch']) { const v = x.comps[c].status === 'ok' ? x.comps[c].value : null; if (!same(v, r[c])) bad++; } });
ok(bad === 0, `${R.trees.length} trees × 2 components equal the reference (computed or not)`);
ok(R.unmapped.length === 2 && R.unmapped.every(u => u.species === 'C' && JSON.stringify(u.rows) === JSON.stringify(REF.unmapped_rows)), 'species without sets: listed per component with their row numbers, never computed with another species\' equation');
ok(R.noheight.length === 1 && R.noheight[0].component === 'branch' && R.noheight[0].rows.join() === String(REF.noheight_row), 'tree without height: branch not computed, row number given');
ok(R.counts.stem.unmapped === REF.unmapped_rows.length && R.counts.branch.noheight === 1 && R.counts.stem.ok === REF.trees.length - REF.unmapped_rows.length, 'counts per component');
// units
let ub = 0;
for (const u of REF.units) { const v = R.units.find(x => x.plot_id === u.plot_id && x.period === u.period); if (!v || !same(v.comps.stem.perHa, u.stem) || !same(v.comps.branch.perHa, u.branch) || !same(v.B, u.B) || !same(v.C, u.C) || !same(v.CO2, u.CO2) || v.n !== u.n) ub++; }
ok(ub === 0 && R.units.length === REF.units.length, 'plot × period: component Mg/ha, total, C and CO₂ equal the reference; no total where a tree is missing');
ok(R.units.some(u => u.B === null) && R.units.some(u => u.B !== null), 'the reference has units with and without a total');
// separate total equation and additivity
const tot = B.computeAllometric(ds, { ...cfg, total: { B: 'B.stem' } }, sets);
const bt = tot.trees.find(x => x.species === 'B' && x.sum != null);
ok(bt && bt.total.status === 'ok' && same(bt.additivity.diff, bt.total.value - bt.sum), 'a separate total equation and its difference from the component sum');
// a set id pointing nowhere
const gone = B.computeAllometric(ds, { ...cfg, map: { ...cfg.map, A: { stem: 'nope', branch: 'A.branch' } } }, sets);
ok(gone.trees.find(x => x.species === 'A').comps.stem.problems[0].code === 'set.missing', 'a deleted set: not computed, reason given');

// volume path
const V = REF.volume, vr = B.computeVolume(ds, t => t.V, { bark: 'ob', factors: V.factors, CF: V.CF });
let vb = 0; for (const u of V.units) { const v = vr.units.find(x => x.plot_id === u.plot_id && x.period === u.period); if (!same(v.B, u.B) || !same(v.C, u.C) || !same(v.CO2, u.CO2)) vb++; }
ok(vb === 0, 'volume path: Mg/ha, C and CO₂ equal the reference');
ok(vr.missing.length === 1 && vr.missing[0] === REF.trees[REF.trees.length - 1].row, 'tree without volume: listed, its unit has no total');
const vm = B.computeVolume(ds, t => t.V, { bark: 'ib', factors: V.factors, CF: V.CF });
ok(vm.trees.every(x => x.status !== 'ok') && vm.units.every(u => u.B === null), 'volumes under bark with over-bark factors: nothing computed');

console.log(`BC02 biomass package: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
