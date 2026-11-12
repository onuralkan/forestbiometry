// Site index, stage SI01: dynamic (ADA) site equations cr.ada.b0, cr.ada.b2, schu.ada.
//   node tests/siteindex/test_si01.mjs
// Reference: tests/ref/siteindex_si01.json (tests/ref/make_siteindex_si01.py: the BASE model solved for its
// site-specific parameter with scipy.optimize.brentq; no difference equation used). Identities of TOOLS_SPEC §8.2 on
// 1000 random cases per form.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as S from '../../assets/lab/siteindex/calc.js';
import { rng } from '../../assets/lab/core/stats.js';
import { formsFor, form } from '../../assets/lab/core/coef.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-12) => ok(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1e-300), `${m}: got ${a} expected ${b}`);
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/siteindex_si01.json'), 'utf8'));

/* 1. against the base model solved by brentq (independent of the difference equations) */
for (const [id, cases] of Object.entries(R.cases)) {
  let worst = 0;
  for (const c of cases) {
    const m = { form: id, params: c.p, baseAge: c.A0, ageType: 'total' }, t = `${id} A1 = ${c.A1.toFixed(2)}`;
    const p = S.project(m, c.A2, c.A1, c.H1), si = S.siteIndex(m, c.A1, c.H1), sp = S.siteParameter(m, c.A1, c.H1);
    ok(p.status === 'ok' && si.status === 'ok' && sp.status === 'ok', `${t}: computed`);
    near(p.value, c.H2, `${t}: H2 = base model through the solved site parameter`, 1e-11);
    near(si.value, c.SI, `${t}: SI at A0 = ${c.A0.toFixed(1)}`, 1e-11);
    near(sp.value, c.site, `${t}: site parameter ${sp.name} = brentq`, 1e-11);
    worst = Math.max(worst, Math.abs(p.value - c.H2) / c.H2);
  }
  ok(worst < 1e-11, `${id}: largest relative difference to the reference ${worst.toExponential(2)}`);
}
for (const [id, c] of Object.entries(R.curves)) {
  const cv = S.curve({ form: id, params: c.p, baseAge: c.A0 }, c.SI, c.ages);
  cv.forEach(([a, h], i) => near(h, c.H[i], `${id} curve of SI ${c.SI} at age ${a}`, 1e-11));
  near(cv[c.ages.indexOf(c.A0)][1], c.SI, `${id}: the curve passes through SI at the base age`, 1e-15);
}

/* 2. TOOLS_SPEC §8.2 identities on 1000 random cases per form: consistency, base-age invariance, path invariance */
const r = rng(20261112), U = (a, b) => a + (b - a) * r();
const PAR = { 'cr.ada.b0': () => ({ b1: U(0.01, 0.06), b2: U(0.9, 2.2) }), 'cr.ada.b2': () => ({ b0: U(25, 55), b1: U(0.01, 0.06) }), 'schu.ada': () => ({ b1: -U(5, 60) }) };
for (const id of S.FORM_IDS) {
  let w1 = 0, w2 = 0, w3 = 0, w4 = 0, n = 0;
  for (let i = 0; i < 1000; i++) {
    const p = PAR[id](), m = { form: id, params: p, baseAge: 50 };
    // H1 from the base model with a plausible site parameter (as in the reference), so no height underflows to 0
    const [A1, A2, A3] = [U(5, 150), U(5, 150), U(5, 150)], H1 = id === 'cr.ada.b2' ? p.b0 * (1 - Math.exp(-p.b1 * A1)) ** U(0.6, 3) : U(1, 45);
    const P = (a2, a1, h1) => S.project(m, a2, a1, h1).value;
    const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
    w1 = Math.max(w1, rel(P(A1, A1, H1), H1));                                                  // consistency
    const H2 = P(A2, A1, H1); w2 = Math.max(w2, rel(P(A3, A2, H2), P(A3, A1, H1)));               // path invariance
    const si50 = S.siteIndex(m, A1, H1).value, si100 = S.siteIndex({ ...m, baseAge: 100 }, A1, H1).value;
    w3 = Math.max(w3, rel(P(100, 50, si50), si100));                                             // base-age invariance
    w4 = Math.max(w4, rel(S.siteIndex(m, A2, H2).value, si50));                                  // every point of a curve gives the same SI
    n++;
  }
  ok(n === 1000 && w1 <= 1e-12, `${id}: consistency f(A1, A1, H1) = H1 (worst ${w1.toExponential(2)})`);
  ok(w2 <= 1e-12, `${id}: path invariance (worst ${w2.toExponential(2)})`);
  ok(w3 <= 1e-12, `${id}: base-age invariance SI100 = f(100, 50, SI50) (worst ${w3.toExponential(2)})`);
  ok(w4 <= 1e-12, `${id}: every point of a curve has the same SI (worst ${w4.toExponential(2)})`);
}
/* anamorphic forms: curves are multiples of each other; the polymorphic form is not */
{ const ages = [10, 30, 80], ratio = (id, p) => { const m = { form: id, params: p, baseAge: 50 }; const a = S.curve(m, 15, ages), b = S.curve(m, 30, ages); return a.map((x, i) => b[i][1] / x[1]); };
  for (const [id, p] of [['cr.ada.b0', { b1: 0.03, b2: 1.4 }], ['schu.ada', { b1: -25 }]]) { const q = ratio(id, p); ok(q.every(x => Math.abs(x - 2) < 1e-12), `${id}: anamorphic (SI 30 curve = 2 × SI 15 curve)`); }
  const q = ratio('cr.ada.b2', { b0: 40, b1: 0.03 }); ok(Math.abs(q[0] - q[2]) > 0.1, 'cr.ada.b2: polymorphic (ratio of curves changes with age)');
  eq(S.FORM_IDS.map(id => S.FORMS[id].kind), ['anamorphic', 'polymorphic', 'anamorphic'], 'curve type recorded with each form'); }

/* 3. undefined situations are states, never numbers */
const bad = (res, code, m) => ok(res.status === 'invalid' && !('value' in res && Number.isFinite(res.value)) && res.problems.some(p => p.code === code), `${m}: ${code} ${JSON.stringify(res.problems || res)}`);
bad(S.siteIndex({ form: 'cr.ada.b0', params: { b1: 0, b2: 1.4 }, baseAge: 50 }, 30, 15), 'par.b1pos', 'b1 ≤ 0 (1 − e^(−b1·A) ≤ 0)');
bad(S.siteIndex({ form: 'cr.ada.b0', params: { b1: 0.03, b2: -1 }, baseAge: 50 }, 30, 15), 'par.b2pos', 'b2 ≤ 0');
bad(S.siteIndex({ form: 'cr.ada.b2', params: { b0: 0, b1: 0.03 }, baseAge: 50 }, 30, 15), 'par.b0pos', 'b0 ≤ 0');
bad(S.siteIndex({ form: 'cr.ada.b2', params: { b0: 30, b1: 0.03 }, baseAge: 50 }, 30, 30), 'h.aboveasym', 'polymorphic: H1 = b0');
bad(S.siteIndex({ form: 'cr.ada.b2', params: { b0: 30, b1: 0.03 }, baseAge: 50 }, 30, 35), 'h.aboveasym', 'polymorphic: H1 > b0');
bad(S.siteIndex({ form: 'schu.ada', params: { b1: 25 }, baseAge: 50 }, 30, 15), 'par.b1neg', 'Schumacher with b1 > 0 (sign convention of exp(−b1/A) sources)');
bad(S.siteIndex({ form: 'cr.ada.b0', params: { b1: 0.03 }, baseAge: 50 }, 30, 15), 'par.missing', 'missing coefficient');
bad(S.siteIndex({ form: 'nope', params: {}, baseAge: 50 }, 30, 15), 'form.unknown', 'unknown form');
for (const [A, H, code] of [[0, 15, 'a.bad'], [-5, 15, 'a.bad'], [30, 0, 'h.bad'], [30, -1, 'h.bad'], [NaN, 15, 'a.bad'], [30, null, 'h.bad']]) bad(S.siteIndex({ form: 'cr.ada.b0', params: { b1: 0.03, b2: 1.4 }, baseAge: 50 }, A, H), code, `A = ${A}, H = ${H}`);
bad(S.siteIndex({ form: 'cr.ada.b0', params: { b1: 0.03, b2: 1.4 }, baseAge: 0 }, 30, 15), 'a0.bad', 'base age 0');
bad(S.siteIndex({ form: 'cr.ada.b0', params: { b1: 0.03, b2: 1.4 } }, 30, 15), 'a0.bad', 'no base age');
bad(S.project({ form: 'cr.ada.b0', params: { b1: 0.03, b2: 1.4 } }, 0, 30, 15), 'a.bad', 'projection to age 0');
bad(S.siteIndex({ form: 'cr.ada.b0', params: { b1: 0.03, b2: 1.4 }, baseAge: 50, ageType: 'stump' }, 30, 15), 'agetype.bad', 'unknown age type');
{ const cv = S.curve({ form: 'cr.ada.b0', params: { b1: 0.03, b2: 1.4 }, baseAge: 50 }, 20, [0, 30]); ok(cv[0][1] === null && cv[1][1] > 0, 'curve: an invalid age gives null, not a number'); }
{ const r1 = S.siteIndex({ form: 'cr.ada.b0', params: { b1: 0.03, b2: 1.4 }, baseAge: 50, ageType: 'bh' }, 30, 15);
  eq(r1.settings, { form: 'cr.ada.b0', baseAge: 50, ageType: 'bh' }, 'age type and base age carried into every result (K8)'); eq(r1.input, { A: 30, H: 15 }, 'input recorded'); }

/* 4. numerics and the coefficient library */
for (const x of [1e-300, 1e-12, 1e-6, 0.3, Math.LN2, 2, 40, 800]) {
  // reference by series where the direct formula cancels: ln x − x/2 + x²/24 for tiny x, −e^(−x) − e^(−2x)/2 for large x
  const v = S.lnOneMinusExp(x), ref = x < 1e-5 ? Math.log(x) - x / 2 + x * x / 24 : x > 20 ? -Math.exp(-x) - Math.exp(-2 * x) / 2 : Math.log(1 - Math.exp(-x));
  ok(Number.isFinite(v) || x === 800, `ln(1 − e^(−x)) finite at ${x}`); if (x < 50) near(v, ref, `ln(1 − e^(−x)) at ${x}`, x < 1e-5 ? 1e-12 : 1e-13);
}
ok(S.lnOneMinusExp(800) === -0 || S.lnOneMinusExp(800) === 0, 'ln(1 − e^(−800)) = 0 (no cancellation error)');
eq(formsFor('siteindex').map(f => f.id), ['si.cr.ada.b0', 'si.cr.ada.b2', 'si.schu.ada'], 'forms registered in the coefficient library (model-coef/1) under tool siteindex');
eq([form('si.cr.ada.b2').params.map(p => p.key), form('si.cr.ada.b2').inputs, form('si.cr.ada.b2').output], [['b0', 'b1'], { A: { unit: 'yr' }, H: { unit: 'm' } }, { name: 'H', unit: 'm' }], 'library form: global parameters, units');
eq(S.TOOL, { id: 'bonitet', version: '1.0.0-beta.1' }, 'tool id and version (K4)');

console.log(`siteindex SI01: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
