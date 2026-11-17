// Tree age and increment, stage TM-05/a1: assets/lab/tree/age.js.   node tests/tree/test_tm05.mjs
// Reference: tests/ref/age_tm05.json (tests/ref/make_age_tm05.py: exact fractions). Worked examples: Graves (1906)
// §139 (40 in at 1 in per 4 years → 160 years) and §141 (economic age 70 + 14 = 84).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as Ag from '../../assets/lab/tree/age.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/age_tm05.json'), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-12);

ok(Ag.treeAge({ rings: 53, yearsToHeight: 5 }).age === 58 && Ag.treeAge({ rings: 53 }).age === 53, 'age = rings + years to the counting height (Graves §137)');
ok(Ag.economicAge({ ringsOutside: 70, coreAge: 14 }).age === 84, 'economic age: Graves §141 example 70 + 14 = 84');
ok(Ag.ageFromGrowth({ D: 40, mai: 1 / 4 }).age === 160, 'tree without rings: Graves §139 example 40 / ¼ = 160 years');
ok(Ag.treeAge({ rings: 5.5 }).status === 'invalid' && Ag.treeAge({ rings: 10, yearsToHeight: -1 }).status === 'invalid', 'non-integer ring count or negative years refused');
for (const [i, s] of R.stands.entries()) for (const m of ['arithmetic', 'number', 'basal', 'volume']) {
  const r = Ag.standAge(s.groups, m); ok(r.status === 'ok' && rel(r.A, s[m]) < 1e-13, `stand ${i}: ${m} mean age ${r.A.toFixed(3)} = exact ${s[m].toFixed(3)} (Graves §140)`);
}
ok(Ag.standAge([{ a: 50, n: 0 }, { a: 80, n: 10 }], 'number').A === 80 && Ag.standAge([], 'number').status === 'invalid' && Ag.standAge([{ a: 50 }], 'x').status === 'invalid', 'groups missing the weight are skipped; empty and unknown method refused');
for (const [i, g] of R.growth.entries()) {
  const a = ['past', 'present', 'mean'].map(pr => Ag.growthPercent({ now: g.V, then: g.v, n: g.n, principal: pr }).p);
  ok(rel(a[0], g.past) < 1e-13 && rel(a[1], g.present) < 1e-13 && rel(a[2], g.mean) < 1e-13 && a[1] < a[2] && a[2] < a[0], `pair ${i}: growth percent with past, present and mean principal = exact; present < mean < past`);
  const q = g.V / (g.V - g.v);
  ok(rel(Ag.presslerDiameter(g.V, g.v, g.n), g.pressler_d) < 1e-12 && rel(Ag.presslerRelative(q, g.n), g.pressler_d) < 1e-10, `pair ${i}: Pressler from diameters and through the relative diameter q (Graves §174) = exact`);
}
ok(Ag.annualPercent(0.5, 25) === 2 && Ag.meanAnnual(120, 60) === 2 && Ag.periodicAnnual(30, 25, 10) === 0.5, 'growth percent 100·a/D, mean annual and periodic annual growth (Graves §142)');
ok(Ag.growthPercent({ now: 10, then: 12, n: 5 }).warnings[0].code === 'growth.negative' && Ag.growthPercent({ now: 10, then: 8, n: 5, principal: 'x' }).status === 'invalid', 'a decrease warned; unknown principal refused');
for (const [i, c] of R.cores.entries()) {
  const r = Ag.coreSeries({ widths: c.widths, D: c.D, doubleBark: c.bark, yearsToBh: c.yearsToBh });
  ok(r.status === 'ok' && r.ageNow === c.ageNow && r.series.length === c.d.length && r.series.every((s, k) => Math.abs(s.d - c.d[k]) < 1e-11 && s.age === c.ageNow - k), `core ${i}: age ${c.ageNow}, ${c.widths.length} past diameters = exact sums`);
  ok(r.decades.every(s => s.yearsAgo % 10 === 0) && r.decades.length === Math.floor(c.widths.length / 10) + 1, `core ${i}: decade table`);
}
ok(Ag.coreSeries({ widths: [10, 10], D: 3 }).warnings[0].code === 'core.longer' && Ag.coreSeries({ widths: [1, 1], D: 30 }).warnings[0].code === 'core.short' && Ag.coreSeries({ widths: [1, 1], D: 30, reachesPith: false }).warnings.some(w => w.code === 'core.no-pith'), 'core longer than the radius, short of the pith, or not reaching it: warned');
ok(Ag.coreSeries({ widths: [1, -1], D: 30 }).status === 'invalid' && Ag.coreSeries({ widths: [1], D: 3, doubleBark: 3 }).status === 'invalid', 'negative widths and bark ≥ diameter refused');
console.log(`tree age TM-05/a1: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
