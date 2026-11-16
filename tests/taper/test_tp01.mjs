// Taper, stage SV-02/a1 (TOOLS_SPEC TP01): Max and Burkhart (1976) Model 4 profile, volume and height of a diameter.
//   node tests/taper/test_tp01.mjs
// Reference: tests/ref/taper_tp01.json (tests/ref/make_taper_tp01.py: the equation written again from the paper,
// scipy.integrate.quad for volumes, dense scan + brentq for heights). Table 3 coefficients of the paper are test values
// only (TOOLS_SPEC K1: nothing is shipped).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as TP from '../../assets/lab/taper/calc.js';
import { form, blankSet } from '../../assets/lab/core/coef.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/taper_tp01.json'), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const rel = (a, b) => Math.abs(a - b) / Math.max(1e-300, Math.abs(b));
const mkSet = (params, bark = 'ib') => ({ ...blankSet('taper.mb76'), id: 'test', params, output: { name: 'd', unit: 'cm', bark }, source: { citation: 'Max and Burkhart 1976, Table 3 (test values only)' } });

/* registry and checks */
ok(form('taper.mb76') && form('taper.mb76').tool === 'taper' && form('taper.mb76').params.map(p => p.key).join() === 'b1,b2,b3,b4,a1,a2', 'form taper.mb76 registered with the parameters of the paper');
{ const s = mkSet(R.cases[0].params); ok(TP.checkSet(s).length === 0, 'a complete set has no problems');
  ok(TP.checkSet({ ...s, output: { name: 'd', unit: 'cm' } }).some(q => q.code === 'bark.missing'), 'output bark (ob/ib) required');
  ok(TP.checkSet({ ...s, source: { citation: '' } }).some(q => q.code === 'source.missing'), 'source required (K1)');
  ok(TP.checkSet({ ...s, params: { ...s.params, a1: 1.2 } }).some(q => q.code === 'param.join'), 'join point outside (0, 1) rejected');
  ok(TP.checkTree(25, 1.2).some(q => q.code === 'tree.H') && TP.checkTree(0, 20).some(q => q.code === 'tree.D'), 'tree D > 0 and H > 1.3 m');
  const r = TP.evaluateTree(s, 25, 20); ok(r.status === 'ok' && r.set.bark === 'ib' && r.units.V === 'm3' && r.consistency.dTip === 0, 'result carries bark side, units; d = 0 at the tip');
  ok(TP.evaluateTree({ ...s, valid: { D: [10, 20], H: [5, 30] } }, 25, 20).warnings.some(w => w.code === 'valid.outside' && w.key === 'D'), 'outside the valid range: warning');
  ok(TP.diameterAt(s, 25, 20, 21).status === 'outside' && TP.volume(s, 25, 20, 5, 3).status === 'order' && TP.volume(s, 25, 20, 5, 5).V === 0, 'outside heights, reversed and empty intervals'); }

/* against the reference */
let nd = 0, nv = 0, nvn = 0, nh = 0, worstV = 0, worstQ = 0, worstH = 0;
for (const c of R.cases) {
  const s = mkSet(c.params), tag = `${c.set}, D = ${c.D}, H = ${c.H}`;
  c.heights.forEach((h, i) => { const r = TP.diameterAt(s, c.D, c.H, h); nd++;
    ok(c.d[i] === null ? r.status === 'negative' && r.d === null : r.status === 'ok' && Math.abs(r.d - c.d[i]) <= 1e-12 * Math.max(1, c.d[i]), `${tag}: d(${h})`); });
  for (const v of c.volumes) {
    const a = TP.volume(s, c.D, c.H, v.h1, v.h2);
    if (v.V === null) { nvn++; ok(a.status === 'negative' && a.V === null, `${tag}: y < 0 in [${v.h1}, ${v.h2}]: no volume`); continue; }
    nv++; const q = TP.volumeNumeric(s, c.D, c.H, v.h1, v.h2);
    worstV = Math.max(worstV, rel(a.V, v.V)); worstQ = Math.max(worstQ, rel(a.V, q.V));
    ok(a.status === 'ok' && rel(a.V, v.V) <= 1e-10, `${tag}: V(${v.h1}, ${v.h2}) closed form = scipy quad (${a.V} vs ${v.V})`);
    ok(rel(a.V, q.V) <= 1e-10, `${tag}: closed form = Gauss–Legendre on d² (TP01 acceptance)`);
  }
  for (const t of c.heightOf) {
    const r = TP.heightOf(s, c.D, c.H, t.d); nh++;
    ok(r.heights.length === t.h.length && r.heights.every((x, i) => Math.abs(x - t.h[i]) <= 1e-9), `${tag}: heights of d = ${t.d.toFixed(3)}: ${r.heights.map(x => x.toFixed(6))} vs ${t.h.map(x => x.toFixed(6))}`);
    ok(r.status === (t.h.length === 0 ? 'none' : t.h.length > 1 ? 'multiple' : 'ok'), `${tag}: height status for d = ${t.d.toFixed(3)}`);
    for (const x of r.heights) { const back = TP.diameterAt(s, c.D, c.H, x); worstH = Math.max(worstH, Math.abs(back.d - t.d) / Math.max(1, t.d));
      ok(back.status === 'ok' && Math.abs(back.d - t.d) <= 1e-10 * Math.max(1, t.d), `${tag}: d(h(d)) = d (TP01 acceptance)`); }
  }
}
ok(R.cases.some(c => c.heightOf.some(t => t.h.length === 2)), 'reference includes a diameter reached twice (all roots reported)');
/* merchantable part (page): stump 0.15 m, top diameter 0.2·D: highest height of dTop, volume from the stump to it */
let nm = 0;
for (const c of R.cases) {
  const m = TP.merchantable(mkSet(c.params), c.D, c.H, { stump: c.merch.stump, dTop: c.merch.dTop }), tag = `${c.set}, D = ${c.D}, H = ${c.H}`;
  if (c.merch.hTop === null) { ok(m.hTop === null, `${tag}: no top height`); continue; }
  ok(Math.abs(m.hTop - c.merch.hTop) <= 1e-9, `${tag}: merchantable height ${m.hTop} vs ${c.merch.hTop}`);
  if (c.merch.V !== null) { nm++; ok(rel(m.merch, c.merch.V) <= 1e-10, `${tag}: merchantable volume = quad (${m.merch} vs ${c.merch.V})`); } else ok(m.merch === null, `${tag}: y < 0 below the top height: no merchantable volume`);
  const t = c.volumes.find(v => v.h1 === 0.15 && v.h2 === c.H); if (t) ok(t.V === null ? m.total === null : rel(m.total, t.V) <= 1e-10, `${tag}: total from the stump = V(0.15, H)`);
}
{ const s = mkSet(R.cases[0].params); ok(TP.merchantable(s, 25, 20, { stump: 0.3, dTop: 200 }).note === 'below-at-stump' && TP.merchantable(s, 25, 20, { stump: 25 }).status === 'invalid', 'top diameter above the stump diameter: nothing merchantable; stump above the tip rejected'); }
console.log(`merchantable checks: ${nm} volumes`);
console.log(`checked ${nd} diameters, ${nv} volumes (+${nvn} with y < 0), ${nh} height searches; worst relative: V vs quad ${worstV.toExponential(2)}, closed vs Gauss–Legendre ${worstQ.toExponential(2)}, d(h(d)) ${worstH.toExponential(2)}`);
console.log(`taper TP01: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
