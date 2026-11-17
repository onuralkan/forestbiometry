// Crown competition factor (SS-02, CCF): assets/lab/structure/ccf.js against tests/ref/ccf_ss02.json
// (tests/ref/make_ccf_ss02.py: mpmath, Kershaw's expanded eq. 8.27, numpy.polyfit), plus hand cases and the run.
//   node tests/structure/test_ccf.mjs
import { readFile } from 'node:fs/promises';
import * as C from '../../assets/lab/structure/ccf.js';
import { blankSet, validateCoef, formsFor } from '../../assets/lab/core/coef.js';
import { analyse } from '../../assets/lab/structure/run.js';

const R = JSON.parse(await readFile(new URL('../ref/ccf_ss02.json', import.meta.url), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const rel = (a, b, t = 1e-11) => Number.isFinite(a) && Math.abs(a - b) <= t * Math.max(1, Math.abs(b));
const mk = (form, p, extra = {}) => ({ ...blankSet('ccf.' + form), params: p, source: { citation: 'test values only' }, ...extra });

ok(formsFor('ccf').length === 2, 'two CCF forms registered (crown width, crown area)');
for (const [i, s] of R.stands.entries()) {
  const sets = Object.fromEntries(Object.entries(s.sets).map(([sp, q]) => [sp, mk(q.form, q.p)]));
  ok(Object.values(sets).every(x => validateCoef(x).length === 0), `stand ${i}: valid model-coef/1 sets`);
  const trees = s.d.map((d, j) => ({ dbh: d, species: s.sp[j], row: j + 2 }));
  const r = C.ccfUnit(trees, s.w, { bySpecies: sets, all: null });
  ok(r.status === 'ok' && rel(r.ccf, s.ccf) && rel(r.fraction, s.ccf / 100) && r.trees.every((t, j) => rel(t.mca, s.mca[j])), `stand ${i} (${s.d.length} trees, three species, ${Object.values(s.sets)[0].form}): CCF ${s.ccf.toFixed(2)} % and every MCA = mpmath`);
  if (s.ccfAllA != null) { const a = C.ccfUnit(trees, s.w, { all: sets.A, bySpecies: {} }); ok(rel(a.ccf, s.ccfAllA), `stand ${i}: one set for all trees = Kershaw's expanded eq. 8.27`); }
}
for (const [i, s] of R.fits.entries()) {
  const r = C.fitCW(s.d.map((d, j) => ({ d, cw: s.cw[j] })));
  ok(r.status === 'ok' && rel(r.b0, s.b0, 1e-8) && rel(r.b1, s.b1, 1e-9) && rel(r.r2, s.r2, 1e-9) && rel(r.se, s.se, 1e-8), `fit ${i}: CW = b0 + b1·d, R², SE = numpy.polyfit`);
}

// hand cases
ok(rel(100 * Math.PI / 4 / 10000, 0.007853981633974483) && rel(C.mcaPct(Math.PI / 4 * 4), 0.0314159265358979), "SI constant 100·π/(4·10 000) = 0.00785 (Kershaw: 0.0078·CW²)");
const k1961 = mk('cw', { b0: 3.12, b1: 1.829 }), m = C.mcaOf(k1961, 10);
ok(rel(m.cw, 21.41) && rel(100 * m.mca / 43560, 0.0018030 * 21.41 ** 2, 1e-4), "Krajicek's line CW = 3.12 + 1.829d (imperial): MCA% = 0.0018·CW² with A = 43 560 ft² (Kershaw's constant to its printed digits)");
const one = mk('cw', { b0: 0, b1: 0.2 });
ok(rel(C.ccfUnit([{ dbh: 50 }], 10000 / (Math.PI / 4 * 100), { all: one }).ccf, 100), 'trees of crown area π/4·10² m² at 10000/that per hectare cover exactly one hectare: CCF = 100');
const part = C.ccfUnit([{ dbh: 20, species: 'A' }, { dbh: 25, species: 'X' }], 400, { bySpecies: { A: one }, all: null });
ok(part.status === 'incomplete' && part.ccf === null && part.missing.join() === 'X', 'a species without a set: CCF not given, the species named (no partial sum)');
const neg = C.ccfUnit([{ dbh: 20 }, { dbh: 30, row: 7 }], 400, { all: mk('cw', { b0: 9, b1: -0.3 }) });
ok(neg.status === 'incomplete' && neg.bad[0].row === 7 && neg.bad[0].code === 'ccf.cw.neg', 'an equation giving a non-positive crown width: refused for that tree, CCF not given');
ok(C.ccfUnit([], 400, { all: one }).ccf === 0 && C.ccfUnit([{ dbh: 20 }], 400, null).status === 'off', 'measured plot without trees: CCF 0; no method: off');
const val = mk('cw', { b0: 1, b1: 0.2 }, { valid: { D: [10, 40] } });
ok(C.ccfUnit([{ dbh: 50 }, { dbh: 20 }], 100, { all: val }).outside === 1 && C.mcaOf(mk('cw', { b0: 1, b1: 0.2 }, { source: { citation: '' } }), 20).problems[0].code === 'ccf.set.bad', 'outside the validity range counted; a set without a source not used (K1)');
ok(C.setFor({ all: one, bySpecies: { A: k1961 } }, 'A') === k1961 && C.setFor({ all: one, bySpecies: { A: k1961 } }, 'B') === one && C.setFor({ all: null, bySpecies: {} }, 'B') === null, "species' own set first, then the set for all species");
ok(C.fitCW([{ d: 10, cw: 3 }, { d: 20, cw: 5 }]).status === 'few' && C.fitCW([{ d: 10, cw: 3 }, { d: 10, cw: 4 }, { d: 10, cw: 5 }]).status === 'flat' && C.fitCW([{ d: 10, cw: 3 }, null, { d: -1, cw: 4 }, { d: 20, cw: 5 }, { d: 30, cw: 7 }]).bad.join() === '3', 'fit: fewer than three trees, equal diameters, a bad row by number (empty rows keep the numbering)');

// through the run: per-hectare weight from the plot area
const ds = { plots: [{ plot_id: 'P1', plot_area: 400 }, { plot_id: 'P2', plot_area: 400 }], trees: [{ row: 2, plot_id: 'P1', dbh: 20, species: 'A', period: null }, { row: 3, plot_id: 'P1', dbh: 30, species: 'A', period: null }] };
try {
  const run = analyse(ds, { ccf: { all: one, bySpecies: {} } }), u1 = run.units.find(u => u.plot_id === 'P1');
  ok(u1 && rel(u1.ccf.ccf, 25 * (C.mcaPct(Math.PI / 4 * 16) + C.mcaPct(Math.PI / 4 * 36))), 'run: CCF of a 400 m² plot = 25 × Σ MCA% (expansion factor of the plot)');
  const u2 = run.units.find(u => u.plot_id === 'P2'); ok(!u2 || u2.ccf.ccf === 0, 'run: a plot measured without trees has CCF 0');
  ok(analyse(ds, {}).units.every(u => u.ccf.status === 'off'), 'run without a method: off');
} catch (e) { ok(false, 'run: ' + e.message); }

console.log(`CCF SS-02: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
