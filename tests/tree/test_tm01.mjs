// Tree height, stage TM-01/a1: assets/lab/tree/height.js.   node tests/tree/test_tm01.mjs
// Reference: tests/ref/height_tm01.json (tests/ref/make_height_tm01.py: readings computed from simulated geometry;
// Brandis closed form in mpmath). Worked example: Graves (1906) §65, two-pole method 6 × 30 / 4 = 45.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as Ht from '../../assets/lab/tree/height.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/height_tm01.json'), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
let worst = 0;
for (const [i, c] of R.cases.entries()) {
  const a = Ht.heightTangent({ D: c.D, top: c.top_deg, base: c.base_deg, unit: 'deg' });
  const b = Ht.heightTangent({ D: c.D, top: c.top_pct, base: c.base_pct, unit: 'pct' });
  const s = Ht.heightSlopeDistance({ S: c.S_base, top: c.top_deg, base: c.base_deg });
  const p = Ht.heightSlopeDistance({ S: c.S_point, top: c.top_deg, base: c.base_deg, pointAngle: c.point_deg });
  const e = Math.max(...[a, b, s, p].map(r => r.status === 'ok' ? rel(r.H, c.H) : Infinity)); worst = Math.max(worst, e);
  ok(e <= 1e-12, `case ${i}: H ${c.H.toFixed(3)} from degrees, percent, distance to the base and to a stem point (worst relative ${e.toExponential(2)})`);
  ok(Math.abs(a.above + a.below - a.H) < 1e-12 && (c.base_deg < 0 ? a.below > 0 : a.below < 0), `case ${i}: parts above and below the eye, signed as the sources add or subtract`);
  if (c.brandis_H != null) ok(rel(s.H, c.brandis_H) <= 1e-12, `case ${i}: slope distance = Brandis form S·sin(u + l)/cos u (Graves §72)`);
  ok((a.warnings.some(w => w.code === 'distance.short')) === (c.D / c.H < 1), `case ${i}: short-distance warning when D < H`);
}
console.log('worst relative error', worst.toExponential(2));
ok(Ht.heightTwoPoles({ bc: 6, AC: 30, Ac: 4 }).H === 45, 'two-pole method: Graves §65 worked example 6 × 30 / 4 = 45');
ok(Math.abs(Ht.heightShadow({ treeShadow: 24, pole: 2, poleShadow: 1.6 }).H - 30) < 1e-12, 'shadow method: 24 × 2 / 1.6 = 30');
ok(Math.abs(Ht.horizontalDistance(20, 30) - 20 * Math.sqrt(3) / 2) < 1e-12 && Math.abs(Ht.horizontalDistance(25, 75, 'pct') - 20) < 1e-12, 'horizontal distance from a slope distance (30° and 75 % slope: 3-4-5 triangle)');
ok(Math.abs(Ht.tanOf(45, 'deg') - 1) < 1e-15 && Ht.tanOf(100, 'pct') === 1 && Math.abs(Ht.degOf(100, 'pct') - 45) < 1e-12, 'degrees and percent: 45° = 100 %');
const codes = r => r.problems.map(q => q.code);
ok(codes(Ht.heightTangent({ D: 20, top: 10, base: 15 })).includes('order'), 'top sighted below the base refused');
ok(codes(Ht.heightTangent({ D: 0, top: 30, base: -5 })).includes('distance.bad') && codes(Ht.heightTangent({ D: 20, top: 95, base: -5 })).includes('top.range'), 'bad distance and an angle of 90° or more refused');
ok(codes(Ht.heightTangent({ D: 20, top: 30, base: -5, unit: 'gon' })).includes('unit.bad'), 'unknown unit refused');
ok(Ht.heightTangent({ D: 10, top: 70, base: -5 }).warnings.some(w => w.code === 'top.steep'), 'steep sight to the top warned');
ok(Ht.heightTwoPoles({ bc: 6, AC: 3, Ac: 4 }).status === 'invalid' && Ht.heightShadow({ treeShadow: 0, pole: 2, poleShadow: 1 }).status === 'invalid', 'bad similar-triangle inputs refused');
const m = Ht.meanReading([21.2, 21.6, null, 21.0]); ok(m.n === 3 && Math.abs(m.mean - 21.266666666666666) < 1e-12 && Math.abs(m.range - 0.6) < 1e-12, 'mean of repeated readings and their range (Hamilton §7)');
console.log(`tree height TM-01/a1: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
