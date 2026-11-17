// Diameter and basal area (TM-02/a1) and form factors (TM-06/a1): assets/lab/tree/diameter.js, form.js.
//   node tests/tree/test_tm02_06.mjs
// Reference: tests/ref/tree_tm02_06.json (scipy quad on solids of revolution; mpmath sums). Worked example: Graves (1906)
// §97 form exponent (its printed logarithm of 1.25 is wrong; see below).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as Dm from '../../assets/lab/tree/diameter.js';
import * as Fm from '../../assets/lab/tree/form.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/tree_tm02_06.json'), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);

// TM-02: diameter, girth, basal area
ok(Math.abs(Dm.diameterFromGirth(100) - 31.830988618379067) < 1e-12 && Math.abs(Dm.girthFromDiameter(Dm.diameterFromGirth(137.2)) - 137.2) < 1e-12, 'girth ↔ diameter: d = c/π');
ok(Math.abs(Dm.basalArea(30) - 0.07068583470577035) < 1e-17 && Math.abs(Dm.diameterFromArea(Dm.basalArea(47.3)) - 47.3) < 1e-12, 'basal area π/4·d² (d in m) and back');
ok(Dm.toCm(10, 'in') === 25.4 && Dm.toCm(253, 'mm') === 25.3 && Dm.toCm(0.3, 'm') === 30 && Dm.toCm(1, 'ft') === null, 'units: inch 2.54 cm (Hamilton §9), mm, m; unknown unit refused');
const two = Dm.stemDiameter([{ kind: 'diameter', value: 32 }, { kind: 'diameter', value: 28 }]);
ok(two.d === 30 && two.mean === 'arithmetic', 'two diameters at right angles: arithmetic mean (Graves §114)');
const el = Dm.stemDiameter([{ kind: 'diameter', value: 32 }, { kind: 'diameter', value: 28 }], { mean: 'ellipse' });
ok(Math.abs(el.d - Math.sqrt(32 * 28)) < 1e-12 && Math.abs(el.g - Math.PI * 0.16 * 0.14) < 1e-15, 'ellipse: area π·a·b (Hamilton §8), equal-area diameter √(d₁d₂)');
ok(Dm.stemDiameter([{ kind: 'diameter', value: 32 }], { mean: 'ellipse' }).problems[0].code === 'ellipse.two', 'ellipse needs exactly two diameters');
const gr = Dm.stemDiameter([{ kind: 'girth', value: 94.5 }], { round: 'down' });
ok(gr.d === 30 && Math.abs(gr.dRaw - 94.5 / Math.PI) < 1e-12, 'girth 94.5 cm → 30.08 cm, rounded down to 30 (Hamilton §2)');
ok(Dm.roundDiameter(30, 'down') === 30 && Dm.roundDiameter(29.999999999999996, 'down') === 30 && Dm.roundDiameter(30.96, 'down') === 30 && Dm.roundDiameter(30.96, 'nearest-mm') === 31, 'rounding down: a value on the class boundary stays in the upper class');
ok(Dm.stemDiameter([{ kind: 'diameter', value: 10, unit: 'in' }, { kind: 'diameter', value: 254, unit: 'mm' }]).d === 25.4, 'readings in inches and millimetres');
ok(Dm.stemDiameter([{ kind: 'diameter', value: -3 }]).status === 'invalid' && Dm.stemDiameter([]).problems[0].code === 'reading.none', 'bad or missing readings refused');
for (const [i, t] of R.trees.entries()) {
  const s = Dm.treeSummary(t.d.map((d, k) => ({ d, n: t.n[k] })));
  ok(s.N === t.N && rel(s.G, t.G) < 1e-13 && rel(s.dMean, t.dMean) < 1e-13 && rel(s.dg, t.dg) < 1e-13, `tree list ${i}: N, ΣG, mean diameter, diameter of the tree of average basal area (Graves §127) = mpmath`);
}
const sk = Dm.treeSummary([{ d: 20 }, { d: null }, { d: 30, n: 0 }]); ok(sk.N === 1 && sk.skipped === 2, 'trees without a diameter or with a zero count are skipped and counted');

// TM-06: form factors on solids of revolution
for (const [i, b] of R.bodies.entries()) {
  const fb = Fm.formFactor({ V: b.V, d: b.d_bh, H: b.H, kind: 'breast' }), fa = Fm.formFactor({ V: b.V, d: b.D, H: b.H, kind: 'absolute' });
  const fu = Fm.formFactor({ V: b.Vabove, d: b.d_bh, H: b.H, kind: 'absolute-above-bh' }), fn = Fm.formFactor({ V: b.V, d: b.d_norm, H: b.H, kind: 'normal' });
  ok(rel(fb.F, b.F_breast) < 1e-12 && rel(fa.F, b.F_abs) < 1e-12 && rel(fu.F, b.F_abs_above) < 1e-12 && rel(fn.F, b.F_norm) < 1e-12, `body ${i} (r ${b.r.toFixed(3)}): breast-height, absolute, above-breast-height and normal form factors = quad`);
  ok(rel(fa.F, 1 / (b.r + 1)) < 1e-11 && rel(Fm.breastFormFactorFromExponent(b.r, b.H), b.F_breast) < 1e-11, `body ${i}: absolute F = 1/(r + 1) and the breast-height formula of Graves §97 = quad`);
  const e = Fm.formExponent({ d1: b.y1, x1: b.x1, d2: b.y2, x2: b.x2 });
  ok(Math.abs(e.r - b.r) < 1e-11, `body ${i}: form exponent from two diameters = ${b.r.toFixed(4)}`);
  ok(rel(Fm.volumeFromFormFactor(b.d_bh, b.H, fb.F), b.V) < 1e-12 && Math.abs(fb.formHeight - fb.F * b.H) < 1e-12, `body ${i}: V = B·H·F and form height`);
}
ok(['cylinder', 'paraboloid', 'cone', 'neiloid'].every((n, k) => Fm.bodyOf(R.bodies[k].r) === n) && Fm.bodyOf(1.5) === null, 'exponents 0, 1, 2, 3: cylinder, paraboloid, cone, neiloid (Graves §97)');
const g = Fm.formExponent({ d1: 18, x1: 61, d2: 15, x2: 45 });
ok(Math.abs(g.r - 1.1986504919597858) < 1e-12, `Graves §97 example (18 and 15 in at 61 and 45 ft): r = ${g.r.toFixed(4)}; the book prints 1.35 because it uses log 1.25 = 0.086910 instead of 0.096910`);
ok(Math.abs(2 * 0.089181 / 0.132117 - 1.35) < 0.001 && Math.abs(Math.log10(1.25) - 0.096910) < 1e-6, "the book's 1.35 follows from its misprinted logarithm (check of the diagnosis)");
const q = Fm.formQuotient({ dMid: 21, D: 30, c: 0.2 });
ok(Math.abs(q.q - 0.7) < 1e-15 && Math.abs(q.F - 0.5) < 1e-15 && Fm.formQuotient({ dMid: 21, D: 30 }).F === null, 'form quotient q = d/D; F = q − c only with the constant the user gives (Graves §100)');
ok(Fm.formFactor({ V: 1, d: 30, H: 1.2 }).problems.some(p => p.code === 'height.below-bh') && Fm.formFactor({ V: 3, d: 30, H: 20 }).warnings[0].code === 'factor.above-one', 'height below breast height refused; F > 1 warned');
ok(Fm.formExponent({ d1: 15, x1: 45, d2: 18, x2: 61 }).status === 'invalid', 'exponent needs the lower diameter farther from the tip');
console.log(`tree TM-02/a1 + TM-06/a1: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
