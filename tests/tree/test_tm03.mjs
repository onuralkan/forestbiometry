// Bark thickness and under-bark diameter (TM-03/a1): assets/lab/tree/bark.js against tests/ref/bark_tm03.json
// (tests/ref/make_bark_tm03.py: mpmath and numpy.polyfit, written apart from the code), plus hand cases.
//   node tests/tree/test_tm03.mjs
import { readFile } from 'node:fs/promises';
import * as B from '../../assets/lab/tree/bark.js';
import { blankSet, validateCoef, formsFor } from '../../assets/lab/core/coef.js';

const R = JSON.parse(await readFile(new URL('../ref/bark_tm03.json', import.meta.url), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const rel = (a, b, t = 1e-11) => Number.isFinite(a) && Math.abs(a - b) <= t * Math.max(1, Math.abs(b));

for (const [i, p] of R.points.entries()) {
  const r = B.measurePoint({ mode: 'gauge', dob: p.dob, readings: p.reads, L: p.L });
  ok(r.status === 'ok' && rel(r.B1, p.B1) && rel(r.dub, p.dub) && rel(r.gob, p.gob) && rel(r.gub, p.gub) && rel(r.gBark, p.gBark, 1e-9) && rel(r.pctArea, p.pct, 1e-9) && rel(r.B2, 2 * p.B1), `point ${i}: thickness, under-bark diameter, areas, share`);
  if (p.L != null) ok(rel(r.Vob, p.Vob) && rel(r.Vub, p.Vub) && rel(r.Vbark, p.Vbark, 1e-9) && rel(r.pctVol, p.pct, 1e-9), `point ${i}: log volumes over, under bark and of bark`);
  const back = B.measurePoint({ mode: 'inside', dub: p.dub, readings: p.reads });
  ok(back.status === 'ok' && rel(back.dob, p.dob, 1e-12), `point ${i}: from inside the bark, adding the bark gives the over-bark diameter back`);
}
for (const [i, g] of R.girths.entries()) {
  const r = B.measurePoint({ mode: 'girths', girthOb: g.cob, girthUb: g.cub });
  ok(r.status === 'ok' && rel(r.B1, g.B1, 1e-10) && rel(r.dob, g.dob) && rel(r.dub, g.dub) && rel(B.barkFromGirths(g.cob, g.cub), g.B1, 1e-10), `girths ${i}: peripheral bark thickness (c_ob − c_ub)/2π`);
}
for (const [i, s] of R.samples.entries()) {
  const r = B.fitBark(s.dob.map((d, j) => ({ dob: d, dub: s.dub[j] })));
  ok(r.status === 'ok' && r.n === s.dob.length && rel(r.k, s.k, 1e-12) && rel(r.kInv, 1 / s.k, 1e-12), `sample ${i}: k = Σd_ub/Σd_ob (ratio of means) and 1/k`);
  ok(r.line && rel(r.line.a, s.a, 1e-8) && rel(r.line.b, s.b, 1e-9) && rel(r.line.r2, s.r2, 1e-9) && rel(r.line.se, s.se, 1e-7), `sample ${i}: least-squares line, R², residual SE (numpy.polyfit)`);
}
const mkSet = (form, p, cf) => { const s = blankSet('bark.' + form); s.params = p; s.source = { citation: 'test values only' }; if (cf != null) s.transform = { kind: 'log', correction: 'user', value: cf }; return s; };
for (const [i, e] of R.forms.entries()) {
  const s = mkSet(e.form, e.p, e.cf);
  ok(validateCoef(s).length === 0, `equation ${i}: a valid model-coef/1 set of form bark.${e.form}`);
  const r = B.applyBark({ kind: 'set', set: s }, e.D);
  ok(r.status === 'ok' && rel(r.dub, e.dub, 1e-11) && rel(r.B1, (e.D - e.dub) * 5, 1e-9), `equation ${i} (${e.form}): under-bark diameter`);
}

// hand cases
ok(formsFor('bark').length === 6, 'six bark forms registered');
ok(B.underBark(30, 10) === 28 && B.overBark(28, 10) === 30, 'd_ub = d_ob − 2B: 30 cm with 10 mm bark → 28 cm, and back');
const q = B.barkAt(40, 36, 5);
ok(q.status === 'ok' && rel(q.gob, Math.PI * 0.04) && rel(q.gub, Math.PI * 0.0324) && rel(q.pctArea, 19) && rel(q.Vbark, Math.PI * 0.0076 * 5) && q.B2 === 40 && q.k === 0.9, '40 / 36 cm: bark area 19 % of the basal area, double thickness 40 mm, k 0.9');
ok(B.barkAt(30, 31).problems[0].code === 'dub.gt' && B.barkAt(30, 20, 0).problems[0].code === 'len.bad', 'under-bark larger than over-bark, zero length: refused');
ok(B.measurePoint({ mode: 'gauge', dob: 30, readings: [] }).problems[0].code === 'readings.none' && B.measurePoint({ mode: 'gauge', dob: 30, readings: [5, NaN, -1] }).problems[0].rows.join() === '2,3', 'no readings; bad readings reported by number');
ok(B.measurePoint({ mode: 'gauge', dob: 3, readings: [20] }).problems[0].code === 'dub.bad', 'bark thicker than the radius: refused');
ok(B.measurePoint({ mode: 'girths', girthOb: 90, girthUb: 95 }).problems[0].code === 'dub.gt' && B.measurePoint({ mode: 'x' }).problems[0].code === 'mode.bad', 'girth under bark larger; unknown mode');
const f2 = B.fitBark([{ dob: 20, dub: 18 }, { dob: 30, dub: 27 }]);
ok(f2.status === 'ok' && rel(f2.k, 0.9) && f2.line === null, 'two trees: k only, no line');
const f3 = B.fitBark([{ dob: 20, dub: 18 }, { dob: 20, dub: 21 }, { dob: 0, dub: 1 }, { dob: 20, dub: 17 }, { dob: 20, dub: 18.5 }]);
ok(f3.bad.join() === '2,3' && f3.n === 3 && f3.line === null, 'rows with d_ub > d_ob or zero reported; equal diameters: no line');
ok(B.fitBark([]).status === 'empty', 'no trees');
ok(B.applyBark({ kind: 'k', k: 0.9 }, 30).dub === 27 && B.applyBark({ kind: 'k', k: 1.1 }, 30).problems[0].code === 'k.bad' && B.applyBark({ kind: 'k', k: 0.9 }, -1).problems[0].code === 'dob.bad', 'apply k; k above 1 and bad diameters refused');
const ln = B.applyBark({ kind: 'line', a: -0.5, b: 0.95, min: 10, max: 50 }, 60);
ok(ln.status === 'ok' && rel(ln.dub, 56.5) && ln.warnings[0].code === 'outside' && B.applyBark({ kind: 'line', a: NaN, b: 1 }, 20).problems[0].code === 'line.bad', 'fitted line applied; outside the sample range a warning');
const big = mkSet('b2.lin', { a: 50, b: 1 });
ok(B.applyBark({ kind: 'set', set: big }, 4).problems[0].code === 'dub.range', 'an equation giving more bark than diameter: refused, not clipped');
ok(B.applyBark({ kind: 'set', set: mkSet('b1.lin', { a: -20, b: 0 }) }, 30).problems[0].code === 'bark.neg', 'negative bark thickness: refused');
const nosrc = mkSet('lin', { a: 0, b: 0.9 }); nosrc.source = { citation: '' };
ok(B.applyBark({ kind: 'set', set: nosrc }, 30).problems[0].code === 'set.bad', 'a set without a source is not applied (K1)');
const v = mkSet('ratio', { k: 0.9 }); v.valid = { D: [10, 50] };
ok(B.applyBark({ kind: 'set', set: v }, 60).warnings.some(w => w.code === 'outside' && w.key === 'D') && B.applyBark({ kind: 'set', set: v }, 60).status === 'ok', 'outside the validity range: computed with a warning');
const ln0 = mkSet('b1.loglog', { a: Math.log(5), b: 0 }); ln0.transform = { kind: 'log', correction: 'none' };
ok(rel(B.applyBark({ kind: 'set', set: ln0 }, 30).dub, 29) && B.applyBark({ kind: 'set', set: ln0 }, 30).cf === 1, 'ln form, no correction: B = 5 mm → 29 cm');
const L = B.barkList({ kind: 'k', k: 0.9 }, [{ d: 20, n: 2, row: 2 }, { d: -1, row: 3 }, { d: 40, row: 4 }]);
ok(L.N === 3 && L.skipped.join() === '3' && rel(L.Gob, Math.PI / 40000 * (2 * 400 + 1600)) && rel(L.pct, 19), 'tree list: counts, bad rows left out, bark share 1 − k² of the basal area');

console.log(`bark TM-03: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
