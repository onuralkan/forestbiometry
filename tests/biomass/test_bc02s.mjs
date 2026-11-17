// Additive biomass system (PLATFORM_PLAN BC-02/a1): assets/lab/biomass/sur.js.
//   node tests/biomass/test_bc02s.mjs
// 1. Published reference: Parresol (1999, Forest Science 45: 573–593) Table 4, restricted SUR (RSUR) and weighted
//    restricted SUR (WRSUR) of the willow oak system (Table 1 data, n = 39, in tests/ref/parresol1999_willow.json):
//    every coefficient and standard error to the digits printed. The crown weight exponent is not legible in the PDF
//    text; 1.646 (found by matching b30) reproduces all eleven WRSUR estimates and standard errors.
// 2. fitAdditive against tests/ref/biomass_bc02s.json (make_biomass_bc02s.py, standard library, written apart):
//    estimated variance exponent, restricted coefficients and standard errors, Σ̂.
// 3. Additivity, forms for the coefficient library, states.
import { readFile } from 'node:fs/promises';
import * as S from '../../assets/lab/biomass/sur.js';
import * as B from '../../assets/lab/biomass/calc.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const W = JSON.parse(await readFile(new URL('../ref/parresol1999_willow.json', import.meta.url), 'utf8'));
const digits = (a, b) => { const s = String(b), dec = s.includes('.') ? s.split('.')[1].length : 0; return Math.abs(a - b) <= 0.5 * 10 ** -dec + 1e-12; };

// 1. willow oak
const rows = W.rows, d2h = r => r[0] * r[0] * r[1], cl = r => d2h(r) * r[2] / 1000;
const X = [r => [1, d2h(r)], r => [1, d2h(r)], r => [1, cl(r), r[1]], r => [1, d2h(r), cl(r), r[1]]], Y = [r => r[4], r => r[5], r => r[6], r => r[7]];
const R = [[1, 0, 1, 0, 1, 0, 0, -1, 0, 0, 0], [0, 1, 0, 1, 0, 0, 0, 0, -1, 0, 0], [0, 0, 0, 0, 0, 1, 0, 0, 0, -1, 0], [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, -1]];
const sys = psi => X.map((f, i) => ({ X: rows.map(f), y: rows.map(Y[i]), psi2: rows.map(psi[i]) }));
for (const [name, psi] of [['RSUR', [() => 1, () => 1, () => 1, () => 1]], ['WRSUR', [r => d2h(r) ** 1.95, r => d2h(r) ** 1.745, r => cl(r) ** 1.646 * Math.exp(-0.00406 * r[1] ** 2), r => d2h(r) ** 1.844]]]) {
  const f = S.restrictedSUR(sys(psi), R, [0, 0, 0, 0]), ref = W.table4[name];
  let bad = []; ref.forEach(([b, se], k) => { if (!digits(f.b[k], b)) bad.push(`b${k} ${f.b[k]} vs ${b}`); if (!digits(Math.sqrt(f.cov[k][k]), se)) bad.push(`se${k} ${Math.sqrt(f.cov[k][k])} vs ${se}`); });
  ok(!bad.length, `Parresol 1999 Table 4 ${name}: 11 coefficients and standard errors to the printed digits ${bad.join('; ')}`);
  ok(Math.abs(f.b[0] + f.b[2] + f.b[4] - f.b[7]) < 1e-8 && Math.abs(f.b[1] + f.b[3] - f.b[8]) < 1e-12 && Math.abs(f.b[5] - f.b[9]) < 1e-12 && Math.abs(f.b[6] - f.b[10]) < 1e-12, `${name}: restrictions hold (b40 = b10 + b20 + b30, b41 = b11 + b21, b42 = b31, b43 = b32)`);
}
// prediction example of the paper (WRSUR, D = 30 cm, H = 18 m, LCL = 10 m: 583.8 kg)
{ const f = S.restrictedSUR(sys([r => d2h(r) ** 1.95, r => d2h(r) ** 1.745, r => cl(r) ** 1.646 * Math.exp(-0.00406 * r[1] ** 2), r => d2h(r) ** 1.844]), R, [0, 0, 0, 0]);
  const x = [1, 16200, 162, 18], y = x.reduce((s, v, a) => s + v * f.b[7 + a], 0); ok(Math.abs(y - 583.8) < 0.05, `paper example: total for D 30 cm, H 18 m, LCL 10 m = ${y.toFixed(2)} kg (583.8)`); }

// 2. fitAdditive against the Python reference
const REF = JSON.parse(await readFile(new URL('../ref/biomass_bc02s.json', import.meta.url), 'utf8'));
const spec = { comps: [{ key: 'wood', label: 'wood', terms: ['d2h'], weight: { kind: 'power', v: 'd2h', k: null } }, { key: 'bark', label: 'bark', terms: ['d2'], weight: { kind: 'none' } }, { key: 'br', label: 'br', terms: ['h', 'd2h'], weight: { kind: 'none' } }],
  total: { from: 'sum', weight: { kind: 'power', v: 'd2h', k: 1.8 } } };
const F = S.fitAdditive(REF.trees, spec);
ok(F.status === 'ok' && F.n === REF.n && F.dropped.length === 1 && F.dropped[0].row === 7 && F.dropped[0].why === 'H', 'tree without H (needed) left out with its row');
ok(Math.abs(F.equations[0].weight.k - REF.k_wood) < 1e-10 && F.equations[0].weight.estimated && F.equations[3].weight.k === 1.8 && !F.equations[3].weight.estimated, `variance exponent from ln e² on ln X: ${F.equations[0].weight.k.toFixed(4)}; given exponent kept`);
const flat = F.equations.flatMap(e => e.sur.b), flatSe = F.equations.flatMap(e => e.sur.se);
ok(flat.every((v, k) => Math.abs(v - REF.b[k]) <= 1e-8 * Math.max(1, Math.abs(REF.b[k]))) && flatSe.every((v, k) => Math.abs(v - REF.se[k]) <= 1e-7 * Math.max(1e-6, REF.se[k])), 'restricted SUR coefficients and standard errors equal the Python reference');
ok(F.sigma.every((r, i) => r.every((v, j) => Math.abs(v - REF.sigma[i][j]) <= 1e-9 * Math.max(1, Math.abs(REF.sigma[i][j])))), 'Σ̂ (Eq. 32) equals the reference');
ok(F.equations.slice(0, 3).every((e, i) => e.single.b.every((v, k) => Math.abs(v - REF.single[i][k]) <= 1e-8 * Math.max(1, Math.abs(REF.single[i][k])))), 'separate (weighted) least-squares fits equal the reference');
{ const [w, b, r, t] = F.equations.map(e => e.sur.b); ok(Math.abs(w[0] + b[0] + r[0] - t[0]) < 1e-8 && Math.abs(b[1] - t[1]) < 1e-12 && Math.abs(w[1] + r[1] - t[2]) < 1e-12 && Math.abs(r[2] - t[3]) < 1e-12, 'total = Σ components term by term (D², D²H, H)'); }
// predictions are additive tree by tree with the registered forms
{ const set = (e) => ({ form: 'biomass.' + S.formIdOf(e.terms), params: Object.fromEntries(e.sur.b.map((v, i) => ['b' + i, v])) });
  const fs = F.equations.map(e => ({ s: set(e), f: B.FORMS[S.formIdOf(e.terms)] }));
  const dev = REF.trees.filter(t => t.H).map(t => fs.slice(0, 3).reduce((s, q) => s + q.f.f(q.s.params, t.D, t.H), 0) - fs[3].f.f(fs[3].s.params, t.D, t.H));
  ok(dev.every(v => Math.abs(v) < 1e-8) && B.FORMS['lt.d2.d2h.h'].params.join() === 'b0,b1,b2,b3', 'registered linear forms (lt.*): component predictions add up to the total prediction'); }
ok(F.equations[0].sur.stats.Se > 0 && F.equations[3].sur.stats.FI > 0.9 && Math.abs(F.equations[3].sur.stats.bias) < 50 && F.corr[0][0] === 1, 'fit statistics (Se, bias, fit index) and correlations');
ok(F.range.D[0] > 0 && F.range.H[1] > F.range.H[0], 'validity range of the sample');

// 3. states
ok(S.fitAdditive(REF.trees, { ...spec, comps: spec.comps.slice(0, 1) }).problems.includes('comps.few'), 'one component: refused');
ok(S.fitAdditive(REF.trees.slice(0, 4), spec).problems.includes('n.few'), 'too few trees: refused');
{ const t2 = REF.trees.map((t, i) => i === 3 ? { ...t, y: { ...t.y, bark: null } } : t), f2 = S.fitAdditive(t2, spec); ok(f2.dropped.some(d => d.row === 5 && d.why === 'comp'), 'missing component mass: tree left out with its row'); }
{ const tc = REF.trees.map(t => ({ ...t, total: t.y.wood + t.y.bark + t.y.br })), f3 = S.fitAdditive(tc, { ...spec, total: { ...spec.total, from: 'column' } });
  ok(f3.status === 'ok' && Math.abs(f3.equations[3].sur.b[0] - F.equations[3].sur.b[0]) < 1e-6, 'total from a column equal to the sum gives the same fit'); }
ok(S.formIdOf(['h', 'd2']) === 'lt.d2.h', 'form id in canonical term order');
console.log(`BC-02 additive system: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
