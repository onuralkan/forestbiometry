// Taper, stage SV-02/a2: Kozak (2004) Model 02 (taper.kozak02): profile, volume (adaptive Gauss–Legendre, no closed
// form), heights of a diameter.   node tests/taper/test_sv02a2.mjs
// Reference: tests/ref/taper_sv02a2.json (tests/ref/make_taper_sv02a2.py: equation written again from the paper,
// scipy quad, scan + brentq). The paper gives no coefficients: the sets are random test values, not any species.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as TP from '../../assets/lab/taper/calc.js';
import { form, blankSet } from '../../assets/lab/core/coef.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/taper_sv02a2.json'), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const rel = (a, b) => Math.abs(a - b) / Math.max(1e-300, Math.abs(b));
const mkSet = params => ({ ...blankSet('taper.kozak02'), id: 'test', params, output: { name: 'd', unit: 'cm', bark: 'ib' }, source: { citation: 'random test values' } });

ok(form('taper.kozak02') && form('taper.kozak02').params.map(p => p.key).join() === 'a0,a1,a2,b1,b2,b3,b4,b5,b6', 'form taper.kozak02 registered with the parameters of the paper');
{ const s = mkSet(R.cases[0].params), r = TP.evaluateTree(s, 30, 22), p = s.params;
  ok(r.status === 'ok' && r.consistency.dTip === 0 && r.consistency.negative.length === 0, 'positive tip exponent: d = 0 at the tip, never negative');
  ok(Math.abs(r.consistency.d13 - p.a0 * 30 ** p.a1 * 22 ** p.a2) <= 1e-12 * r.consistency.d13, 'X = 1 at 1.3 m: d(1.3) = a0·D^a1·H^a2');
  const v = r.volume(0.15, 22); ok(v.status === 'ok' && v.method === 'numeric', 'volume by adaptive Gauss–Legendre (no closed form)'); }
{ const c = R.cases.find(q => q.tipExponent < 0), r = TP.evaluateTree(mkSet(c.params), c.D, c.H);
  ok(r.consistency.dTip === null && r.warnings.some(w => w.code === 'tip.nonfinite'), 'negative tip exponent: d(H) not shown as a number, warned'); }

let nv = 0, worstV = 0, worstH = 0;
for (const c of R.cases) {
  const s = mkSet(c.params), tag = `${c.set}, D = ${c.D}, H = ${c.H}`;
  c.heights.forEach((h, i) => { const r = TP.diameterAt(s, c.D, c.H, h);
    ok(c.d[i] === null ? r.d === null && r.status === 'nonfinite' : r.status === 'ok' && rel(r.d, c.d[i]) <= 1e-12, `${tag}: d(${h}) = ${r.d} vs ${c.d[i]}`); });
  for (const v of c.volumes) { const a = TP.volume(s, c.D, c.H, v.h1, v.h2); nv++; worstV = Math.max(worstV, rel(a.V, v.V));
    ok(a.status === 'ok' && rel(a.V, v.V) <= 1e-10, `${tag}: V(${v.h1}, ${v.h2}) = scipy quad (${a.V} vs ${v.V})`); }
  for (const t of c.heightOf) { const r = TP.heightOf(s, c.D, c.H, t.d);
    ok(r.heights.length === t.h.length && r.heights.every((x, i) => Math.abs(x - t.h[i]) <= 1e-9), `${tag}: heights of d = ${t.d.toFixed(3)}: ${r.heights} vs ${t.h}`);
    for (const x of r.heights) { const b = TP.diameterAt(s, c.D, c.H, x); worstH = Math.max(worstH, rel(b.d, t.d)); ok(rel(b.d, t.d) <= 1e-10, `${tag}: d(h(d)) = d`); } }
}
console.log(`checked ${nv} volumes; worst relative: V vs quad ${worstV.toExponential(2)}, d(h(d)) ${worstH.toExponential(2)}`);
console.log(`taper SV-02/a2 (Kozak 02): ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
