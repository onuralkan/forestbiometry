// Stand Structure, stage SS01: non-spatial structure and density.
//   node tests/structure/test_ss01.mjs
// Reference: tests/ref/structure_ss01.json (tests/ref/make_structure_ss01.py: NumPy/SciPy; Gini by a double loop over
// pairs, BAL by brute force, Shannon by scipy.stats.entropy, H0 recomputed in Python) and TOOLS_SPEC §8.3.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as S from '../../assets/lab/structure/calc.js';
import { buildUnits, unitMetrics } from '../../assets/lab/stand/calc.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/structure_ss01.json'), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-12) => ok(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${m}: got ${a} expected ${b}`);

/* 1. TOOLS_SPEC §8.3 */
near(S.sdi(800, 20), 559.177149815208, '§8.3 SDI, N = 800, Dq = 20 cm, β = 1.605', 1e-14);
near(S.spacing(800, 20).pct, 17.677669529664, '§8.3 Hart–Becking S%, square', 1e-12); near(S.spacing(800, 20, 'triangular').pct, 18.995892141290, '§8.3 S%, triangular', 1e-12);
const Dn = R.density; near(S.sdi(800, 20, 1.605, 25.4), Dn.sdi254, 'SDI with Reineke\'s own reference 10 in = 25.4 cm'); near(S.curtisRD(30, 20), Dn.rd05, 'Curtis RD = G/√Dq'); near(S.curtisRD(30, 20, 0.4), Dn.rd04, 'RD with b = 0.4');
ok(S.spacing(0, 20) === null && S.spacing(800, null).pct === null, 'no trees: no spacing; no H0: no S% (never 0)');

/* 2. generic weighted functions against independent implementations */
R.generic.forEach((c, k) => {
  const m = S.moments(c.x, c.w), tag = `sample ${k + 1} (n = ${c.x.length}${c.w.some(v => v !== 1) ? ', unequal weights' : ''})`;
  for (const q of ['mean', 'sd', 'cv', 'skew', 'kurt']) near(m[q], c.moments[q], `${tag} ${q} = numpy weighted`, 1e-11);
  if (c.scipy) { near(m.skew, c.scipy.skew, `${tag} skewness = scipy.stats.skew(bias=True)`, 1e-11); near(m.kurt, c.scipy.kurt, `${tag} excess kurtosis = scipy`, 1e-11); near(m.cv, c.scipy.cv, `${tag} CV (n divisor)`, 1e-13); }
  near(S.gini(c.x, c.w), c.gini, `${tag} Gini: sorted form = double loop over pairs`, 1e-12);
  const be = S.bal(c.x, c.w, 'exclude'), bi = S.bal(c.x, c.w, 'include');
  ok(be.every((v, i) => Math.abs(v - c.bal_ex[i]) < 1e-12) && bi.every((v, i) => Math.abs(v - c.bal_in[i]) < 1e-12), `${tag} BAL = brute force (equal diameters excluded and included)`);
  near(S.shannon(c.p), c.shannon, `${tag} Shannon = scipy.stats.entropy`, 1e-13); near(S.simpson(c.p).index, c.simpson, `${tag} Simpson 1 − Σp²`, 1e-13);
});
near(S.gini([5, 5, 5, 5]), 0, 'Gini of equal values = 0', 1e-15); near(S.gini([0, 0, 0, 10]), R.gini_limits.one, 'Gini, one tree holds everything: 1 − 1/n = 0.75', 1e-15);
ok(S.moments([7, 7, 7]).skew === null && S.moments([7, 7, 7]).cv === 0, 'equal diameters: CV 0, skewness and kurtosis undefined (null, not 0)');

/* 3. plot × period units: shared Plot & Stand definitions, every measure */
const ds = { schema: 'forest-dataset/1', units: { dbh: 'cm', height: 'm' }, plots: R.dataset.plots, trees: R.dataset.trees };
const { units } = buildUnits(ds, { emptyCombos: 'empty' });
for (const ref of R.units) {
  const u = units.find(x => x.plot_id === ref.plot_id && x.period === ref.period), r = S.structureUnit(u), tag = `${ref.plot_id}/${ref.period}`, m = r.measures;
  const um = unitMetrics(u);
  ok(r.status === 'ok' && r.Nha === um.Nha && r.Gha === um.Gha && r.Dq === um.dq && r.H0 === um.dom.d.H0, `${tag}: N/ha, G/ha, Dq and H0 are the Plot & Stand values`);
  near(r.Nha, ref.Nha, `${tag} N/ha`); near(r.Gha, ref.Gha, `${tag} G/ha`); near(r.Dq, ref.Dq, `${tag} Dq`); near(r.H0, ref.H0, `${tag} H0 (Python, 100 thickest per ha)`, 1e-12);
  for (const q of ['cv', 'skew', 'kurt']) near(m[q], ref.moments[q], `${tag} ${q}`, 1e-11);
  near(m.gini, ref.gini_g, `${tag} Gini on basal area`); near(S.structureUnit(u, { giniOn: 'd' }).measures.gini, ref.gini_d, `${tag} Gini on diameter (option)`);
  near(m.shannonD, ref.shannonD, `${tag} Shannon over 4 cm classes from 0`, 1e-13); near(m.shannonSp, ref.shannonSp, `${tag} species Shannon`, 1e-13); near(m.simpson, ref.simpson, `${tag} species Simpson`, 1e-13);
  near(m.sdi, ref.sdi, `${tag} SDI`); near(m.rd, ref.rd, `${tag} Curtis RD`); near(m.hartPct, ref.hartSquare, `${tag} relative spacing, square`, 1e-12);
  near(S.structureUnit(u, { spacing: 'triangular' }).measures.hartPct, ref.hartTri, `${tag} relative spacing, triangular`, 1e-12);
  ok(r.trees.every((t, i) => Math.abs(t.bal - ref.bal[i]) < 1e-12 && Math.abs(t.relD - ref.relD[i]) < 1e-13 && Math.abs(t.relG - ref.relG[i]) < 1e-12), `${tag}: BAL, d/Dq and g/ḡ per tree`);
  ok(Math.abs(r.classes.reduce((a, c) => a + c.Nha, 0) - r.Nha) < 1e-9 && r.classes[r.classes.length - 1].hi === Infinity, `${tag}: classes cover every tree, the last one open`);
}

/* 4. settings, empty units, missing heights: recorded, nothing made up */
{ const u = units[0], r = S.structureUnit(u, { sdiBeta: 1.5, sdiRef: 25.4, balTies: 'include' });
  ok(r.settings.sdiBeta === 1.5 && r.settings.sdiRef === 25.4 && /25.4/.test(r.definitions.sdi) && /included/.test(r.definitions.bal), 'settings and definitions written into the result');
  ok(S.structureUnit(u, { classWidth: 0 }).status === 'invalid' && S.structureUnit(u, { spacing: 'hex' }).problems[0].code === 'set.spacing', 'bad settings: invalid, not repaired');
  const noH = { ...u, trees: u.trees.map((t, i) => i ? t : { ...t, height: null }) }, rh = S.structureUnit(noH);
  ok(rh.status === 'ok' && (rh.H0 === null ? rh.measures.hartPct === null && rh.warnings.some(w => w.code === 'h0.none') : true), 'missing heights among the dominant trees: no H0, no S%, a warning');
  const empty = { plot_id: 'E', period: null, area: 400, state: 'empty', trees: [] }, re = S.structureUnit(empty);
  ok(re.status === 'empty' && re.measures === null && re.Nha === 0, 'empty plot: status empty, no measures (not zeros)');
  ok(S.structureUnit({ ...empty, state: 'unknown' }).status === 'invalid', 'undecided plot–period combination: not computed');
  const low = S.structureUnit(u, { classStart: 20 }); ok(low.warnings.some(w => w.code === 'cls.below'), 'trees below the first class reported'); }

console.log(`structure SS01: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
