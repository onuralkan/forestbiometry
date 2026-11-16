// Biomass and carbon core (TOOLS_SPEC BC01): assets/lab/biomass/calc.js.
//   node tests/biomass/test_bc01.mjs
// Reference: tests/ref/biomass_bc01.json from tests/ref/make_biomass_bc01.py (plain Python; log10 equations evaluated
// on the ln scale; stand totals by explicit loops); TOOLS_SPEC §8.4 constants (44/12, Baskerville at SEE = 0.2).
// Coefficients are random test numbers, not the coefficients of any species.
import { readFile } from 'node:fs/promises';
import * as B from '../../assets/lab/biomass/calc.js';
import { blankSet, correctionFactor, formsFor } from '../../assets/lab/core/coef.js';

const REF = JSON.parse(await readFile(new URL('../ref/biomass_bc01.json', import.meta.url), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const rel = (a, b) => Math.abs(a - b) / Math.max(1e-300, Math.abs(b));
const mk = (formId, params, transform = null, extra = {}) => {
  const s = blankSet('biomass.' + formId);
  return { ...s, params, transform: transform ?? (B.FORMS[formId].scale === 'none' ? null : { kind: B.FORMS[formId].scale, correction: 'none' }), source: { citation: 'test values only' }, origin: 'user-entered', ...extra };
};

// forms
ok(formsFor('biomass').length === 8 && Object.keys(B.FORMS).every(id => formsFor('biomass').some(f => f.id === 'biomass.' + id)), 'eight forms registered (six of TOOLS_SPEC 5.1 and the two log10 forms)');
ok(formsFor('biomass').filter(f => f.transform === 'log10').length === 2 && formsFor('biomass').filter(f => f.transform === 'log').length === 2, 'ln and log10 forms kept apart');

// every case of the reference
let worst = 0;
for (const c of REF.cases) {
  const r = B.treeBiomass(mk(c.form, c.params, c.transform), { D: c.D, H: c.H });
  const e = r.status === 'ok' ? rel(r.value, c.B) : Infinity; worst = Math.max(worst, e);
  if (!(e < 1e-12)) console.log('  case', c.form, c.D, c.H, r.status, r.value, c.B);
}
ok(worst < 1e-12, `${REF.cases.length} trees over 8 forms, corrections none / Snowdon / user: max rel. error ${worst.toExponential(2)}`);

// constants
ok(B.CO2_PER_C === REF.co2_per_c && Math.abs(B.CO2_PER_C - 3.666666666667) < 1e-12, 'CO₂/C = 44/12 = 3.666666666667');
ok(Math.abs(correctionFactor({ transform: { kind: 'log', correction: 'baskerville', value: 0.2 } }) - REF['baskerville_see_0.2']) < 1e-15 && Math.abs(REF['baskerville_see_0.2'] - 1.020201340027) < 1e-12, 'Baskerville factor exp(0.2²/2) = 1.020201340027 in the shared core');
const bask = B.treeBiomass(mk('log.d', { a: -2, b: 2.4 }, { kind: 'log', correction: 'baskerville', value: 0.2 }), { D: 30 });
ok(bask.status === 'ok' && rel(bask.value, Math.exp(-2 + 2.4 * Math.log(30)) * REF['baskerville_see_0.2']) < 1e-12 && rel(bask.cf, 1.020201340027) < 1e-12, 'Baskerville on the ln scale: exp(a + b·ln D) · exp(SEE²/2), SEE = 0.2 → factor 1.020201340027');
const bask10 = B.treeBiomass(mk('log10.d', { a: -1, b: 2.4 }, { kind: 'log10', correction: 'baskerville', value: 0.1 }), { D: 30 });
ok(bask10.status === 'unsupported' && bask10.problems[0].code === 'correction.baskerville.log10.source' && bask10.value === null, 'Baskerville on a log10 equation waits for its source: not computed, reason given');

// states
const dh = mk('pow.dh', { a: 0.05, b: 2, c: 0.7 });
ok(B.treeBiomass(dh, { D: 30, H: null }).status === 'noheight', 'missing height on an H form: not computed');
ok(B.treeBiomass(mk('pow.d', { a: 0.1, b: 2.3 }), { D: 30, H: null }).status === 'ok', 'D-only form needs no height');
const est = B.treeBiomass(dh, { D: 30, H: 20, heightSource: 'estimated' });
ok(est.status === 'ok' && est.estimatedHeight === true, 'estimated height flagged');
ok(B.treeBiomass(dh, { D: 0, H: 20 }).problems[0].code === 'input.D' && B.treeBiomass(dh, { D: 30, H: -1 }).problems[0].code === 'input.H', 'bad D and H rejected');
const neg = B.treeBiomass(mk('lin.d2h', { a: -50, b: 0.01 }), { D: 10, H: 8 });
ok(neg.status === 'invalid' && neg.problems[0].code === 'result.nonpositive' && neg.value === null, 'a negative mass from a linear form is not shown as a number');
ok(B.treeBiomass({ ...dh, source: { citation: '' } }, { D: 30, H: 20 }).problems[0].code === 'set.invalid', 'set without a source refused');
ok(B.treeBiomass({ ...dh, output: { name: 'B', unit: 'g' } }, { D: 30, H: 20 }).problems[0].code === 'unit.output', 'other output unit refused, not converted silently');
const val = mk('pow.d', { a: 0.1, b: 2.3 }, null, { valid: { D: [10, 50] } });
const out = B.treeBiomass(val, { D: 60 });
ok(out.status === 'ok' && out.warnings[0].code === 'valid.outside' && out.warnings[0].items[0].key === 'D', 'outside the validity range: computed with a warning');
const cnt = B.countStates([out, B.treeBiomass(dh, { D: 30, H: null }), est, B.treeBiomass(val, { D: 20 })]);
ok(cnt.n === 4 && cnt.ok === 3 && cnt.noheight === 1 && cnt.outside === 1 && cnt.estimatedHeight === 1, 'counts: computed, without height, outside, with estimated height');

// components, total, additivity
const comps = [{ component: 'stem', set: mk('pow.d', { a: 0.08, b: 2.4 }) }, { component: 'branch', set: mk('pow.d', { a: 0.02, b: 2.2 }) }];
const tc = B.treeComponents({ D: 25 }, comps, mk('pow.d', { a: 0.1, b: 2.4 }));
const s = 0.08 * 25 ** 2.4 + 0.02 * 25 ** 2.2, tot = 0.1 * 25 ** 2.4;
ok(rel(tc.sum, s) < 1e-14 && rel(tc.total.value, tot) < 1e-14 && rel(tc.additivity.diff, tot - s) < 1e-12, 'components summed; total equation and its difference from the sum (additivity not assumed)');
ok(B.treeComponents({ D: 25, H: null }, [...comps, { component: 'foliage', set: dh }]).sum === null, 'sum only when every component is computed');

// conversion from volume
for (const v of REF.volume) {
  const a = B.fromVolume({ V: v.V, bark: 'ob' }, { mode: 'bef', bark: 'ob', D: v.D, BEF: v.BEF, R: v.R }), b = B.fromVolume({ V: v.V, bark: 'ib' }, { mode: 'bcef', bark: 'ib', BCEF: v.BCEF, R: v.R });
  if (!(rel(a.agb, v.agb_bef) < 1e-14 && rel(a.total, v.total_bef) < 1e-14 && rel(b.agb, v.agb_bcef) < 1e-14 && rel(b.total, v.total_bcef) < 1e-14 && rel(a.bgb, v.agb_bef * v.R) < 1e-14)) { ok(false, 'volume case ' + JSON.stringify(v)); }
}
ok(true, `${REF.volume.length} volume conversions, V·D·BEF·(1 + R) and V·BCEF·(1 + R)`);
const mm = B.fromVolume({ V: 1, bark: 'ib' }, { mode: 'bef', bark: 'ob', D: 0.5, BEF: 1.3, R: 0.2 });
ok(mm.status === 'invalid' && mm.problems[0].code === 'bark.mismatch' && mm.total === null, 'under-bark volume with over-bark factors: not computed');
ok(B.fromVolume({ V: 1, bark: 'ob' }, { mode: 'bef', bark: 'ob', D: 0.5, R: 0.2 }).problems[0].code === 'factor.BEF' && B.fromVolume({ V: 1, bark: 'ob' }, { mode: 'bcef', bark: 'ob', BCEF: 0.7 }).problems[0].code === 'factor.R', 'missing factors: not computed');

// carbon
let cw = 0; for (const c of REF.carbon) { const r = B.carbon(c.B, c.CF); cw = Math.max(cw, rel(r.C, c.C), rel(r.CO2, c.CO2)); }
ok(cw < 1e-14, 'C = B·CF and CO₂ = C·44/12');
ok(B.carbon(100, 0).status === 'invalid' && B.carbon(100, 1.2).status === 'invalid' && B.carbon(-1, 0.5).status === 'invalid', 'carbon fraction must lie in (0, 1]');

// stand totals (Mg/ha)
const st = REF.stand, ds = { schema: 'forest-dataset/1', plots: st.plots, trees: st.trees.map(t => ({ ...t })) };
const values = new Map(ds.trees.map(t => [t, t.kg]));
const tot2 = B.standTotals(ds, values);
let sw = 0; for (const r of st.totals) { const u = tot2.find(x => x.plot_id === r.plot_id && x.period === r.period); sw = Math.max(sw, rel(u.perHa, r.Mg_ha)); if (u.n !== r.n) sw = Infinity; }
ok(sw < 1e-12 && tot2.length === st.totals.length, 'stand: Σ kg · 10000 / area / 1000 = Mg/ha per plot × period');
values.set(ds.trees[0], null);
const part = B.standTotals(ds, values).find(x => x.plot_id === ds.trees[0].plot_id && x.period === ds.trees[0].period);
ok(part.perHa === null && part.nMissing === 1, 'a unit with a tree not computed gets no total (no partial sum shown as the total)');

console.log(`BC01 biomass: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
