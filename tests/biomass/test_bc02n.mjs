// Nonlinear additive biomass system (PLATFORM_PLAN BC-02/a2): assets/lab/biomass/nsur.js.
//   node tests/biomass/test_bc02n.mjs
// 1. Published reference: Parresol (2001, Can. J. For. Res. 31: 865–878), slash pine, Table 1 data (n = 40,
//    tests/ref/parresol2001_slashpine.json): Table 2 unweighted and weighted (EGNLS) coefficients, standard errors and
//    σ̂²; the variance-function exponents (Eq. 4, 19); Table 3 weighted NSUR; Table 4 fit index; the D = 20 cm, H = 17 m
//    example (procedure 1: 268.1 kg, var(ŷ_wood) 8.46; NSUR: bark 34.7 ± 1.3, total 264.2 ± 6.3 and ± 41.8, σ̂²_NSUR
//    0.933, σ̂_44 8.46 × 10⁻⁷). The crown weight is printed D^7.322·e^(−0.006185·H); Table 2 is reproduced only with H²
//    in the exponent (used here). The total's S² is printed 0.44 in Eq. 30 but 9.77 in Eq. 31 (9.77 is reproduced).
// 2. fitNonlinearAdditive against tests/ref/biomass_bc02n.json (make_biomass_bc02n.py, NumPy, written apart): θ
//    estimated, EGNLS, Σ̂, NSUR coefficients and standard errors, σ̂²_NSUR, fit statistics, intervals; the ln-scale
//    system (Example 2); a second case with a total column, an unweighted component and the weight D^θ1·e^(θ2·H).
// 3. Additivity, forms for the coefficient library, states.
import { readFile } from 'node:fs/promises';
import * as N from '../../assets/lab/biomass/nsur.js';
import * as B from '../../assets/lab/biomass/calc.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const P01 = JSON.parse(await readFile(new URL('../ref/parresol2001_slashpine.json', import.meta.url), 'utf8'));
const REF = JSON.parse(await readFile(new URL('../ref/biomass_bc02n.json', import.meta.url), 'utf8'));
const digits = (a, b) => { const s = String(b).replace(/e.*$/, ''), dec = s.includes('.') ? s.split('.')[1].length : 0, ex = /e/.test(String(b)) ? +String(b).split('e')[1] : 0; return Math.abs(a - b) <= 0.5 * 10 ** (ex - dec) * (1 + 1e-9); };
const sig = (a, b, n) => Math.abs(a - b) <= 0.5 * 10 ** (Math.floor(Math.log10(Math.abs(b))) - n + 1) * (1 + 1e-9);
const close = (a, b, r = 1e-6) => Math.abs(a - b) <= r * Math.max(1, Math.abs(b));
const rows = P01.rows, D = rows.map(r => r[0]), H = rows.map(r => r[1]), Y = [4, 5, 6].map(c => rows.map(r => r[c])), YT = rows.map(r => r[7]);
const V = [[D.map((d, t) => d * d * H[t])], [D], [D, H]], ones = D.map(() => 1);
const trees = rows.map((r, i) => ({ row: i + 2, D: r[0], H: r[1], y: { wood: r[4], bark: r[5], crown: r[6] }, total: r[7] }));
const comps = (w = ['d2h', 'd', 'd.h2']) => [{ key: 'wood', label: 'wood', form: 'pow.d2h', weight: w[0] }, { key: 'bark', label: 'bark', form: 'pow.d', weight: w[1] }, { key: 'crown', label: 'crown', form: 'pow.dh', weight: w[2] }];

// 1a. Table 2, unweighted
const T2 = P01.table2, names = ['wood', 'bark', 'crown'];
const unw = names.map((k, i) => N.gnFit(V[i], Y[i], ones, N.logStart(V[i], Y[i])));
names.forEach((k, i) => {
  // crown: the last printed digit of b1 (0.012317) and b3 (−0.33691) differs from the least-squares optimum (0.0123175,
  // −0.336893; SAS convergence), so the crown coefficients are compared to 1e-4 relative
  const bad = []; T2.unweighted[k].forEach(([b, se], a) => { if (!(digits(unw[i].b[a], b) || (k === 'crown' && Math.abs(unw[i].b[a] - b) < 1e-4 * Math.abs(b)))) bad.push(`b${a} ${unw[i].b[a]} vs ${b}`); if (!digits(unw[i].se[a], se)) bad.push(`se${a} ${unw[i].se[a]} vs ${se}`); });
  if (!digits(unw[i].s2, T2.unweighted.s2[i])) bad.push(`s2 ${unw[i].s2}`);
  ok(!bad.length, `Table 2 unweighted ${k}: coefficients${k === 'crown' ? ' (to 1e-4 relative)' : ''}, SEs and σ̂² to the printed digits ${bad.join('; ')}`);
});
// 1b. variance functions (Eq. 4) from the unweighted residuals
{
  const lnd2h = V[0][0].map(Math.log), lnd = D.map(Math.log), h2 = H.map(h => h * h);
  const tw = N.varianceTheta(unw[0].e, [lnd2h]), tb = N.varianceTheta(unw[1].e, [lnd]), tc = N.varianceTheta(unw[2].e, [lnd, h2]);
  const sumU = D.map((_, t) => unw.reduce((s, f, i) => s + f.b[0] * V[i].reduce((p, v, j) => p * v[t] ** f.b[j + 1], 1), 0));
  const tt = N.varianceTheta(YT.map((y, t) => y - sumU[t]), [D.map((d, t) => Math.log(d * H[t]))]);
  ok(digits(tw[0], 2.114) && digits(tb[0], 3.715), `θ wood ${tw[0].toFixed(4)} (2.114), bark ${tb[0].toFixed(4)} (3.715)`);
  ok(digits(tc[0], 7.322) && Math.abs(tc[1] + 0.006185) < 1.5e-6, `θ crown with g = [ln D, H²]: ${tc[0].toFixed(4)} (7.322), ${tc[1].toFixed(7)} (−0.006185)`);
  ok(Math.abs(tt[0] - 3.450) < 0.003, `θ total, ln(D·H) on the residuals of the summed unweighted fits: ${tt[0].toFixed(4)} (3.450, Eq. 19)`);
  const withH = N.varianceTheta(unw[2].e, [lnd, H]);
  ok(Math.abs(withH[1] + 0.006185) > 0.1, `the printed e^(−0.006185·H) is not what Eq. 4 gives with H (θ2 = ${withH[1].toFixed(4)}), hence H²`);
}
// 1c. Table 2, weighted, with the printed weight functions
const PSI = [V[0][0].map(v => v ** 2.114), D.map(d => d ** 3.715), D.map((d, t) => d ** 7.322 * Math.exp(-0.006185 * H[t] * H[t])), D.map((d, t) => (d * H[t]) ** 3.45)];
const wtd = names.map((k, i) => N.gnFit(V[i], Y[i], PSI[i], unw[i].b));
names.forEach((k, i) => {
  const bad = []; T2.weighted[k].forEach(([b, se], a) => { if (!digits(wtd[i].b[a], b)) bad.push(`b${a} ${wtd[i].b[a]} vs ${b}`); if (!digits(wtd[i].se[a], se)) bad.push(`se${a} ${wtd[i].se[a]} vs ${se}`); });
  if (!sig(wtd[i].s2, T2.weighted.s2[i], 4)) bad.push(`s2 ${wtd[i].s2} vs ${T2.weighted.s2[i]}`);
  ok(!bad.length, `Table 2 weighted ${k}: coefficients, SEs and σ̂² to the printed digits ${bad.join('; ')}`);
});
// procedure 1 example (Eq. 10, 12): ŷ_total = 268.1 kg, var(ŷ_wood) = 8.46 kg²
{
  const x = [[6800], [20], [20, 17]], y = wtd.map((f, i) => f.b[0] * x[i].reduce((p, v, j) => p * v ** f.b[j + 1], 1));
  const z = [6800 ** wtd[0].b[1], wtd[0].b[0] * 6800 ** wtd[0].b[1] * Math.log(6800)], v = z[0] * z[0] * wtd[0].cov[0][0] + 2 * z[0] * z[1] * wtd[0].cov[0][1] + z[1] * z[1] * wtd[0].cov[1][1];
  ok(digits(y[0], 186.4) && digits(y[1], 34.7) && digits(y[2], 47.0) && digits(y[0] + y[1] + y[2], 268.1), `procedure 1 at D 20, H 17: ${y.map(v => v.toFixed(2)).join(' + ')} = ${(y[0] + y[1] + y[2]).toFixed(2)} kg (268.1)`);
  ok(digits(v, 8.46), `procedure 1: var(ŷ_wood) = ${v.toFixed(3)} kg² (8.46)`);
}
// 1d. Table 3 weighted NSUR with the printed weights
const given = [{ code: 'd2h', theta: [2.114] }, { code: 'd', theta: [3.715] }, { code: 'd.h2', theta: [7.322, -0.006185] }], gTot = { code: 'dh', theta: [3.45] };
const FW = N.fitNonlinearAdditive(trees, { method: 'weighted', comps: comps(given), total: { from: 'column', weight: gTot } });
ok(FW.status === 'ok' && FW.n === 40 && FW.P === 7 && FW.M === 4 && FW.df === 153, `weighted system fitted: n ${FW.n}, P ${FW.P}, df ${FW.df}`);
{
  const T3 = P01.table3.weighted, bad = [], near = [];
  T3.forEach(([b, se], k) => {
    if (!digits(Math.sqrt(FW.cov[k][k]), se)) bad.push(`se${k} ${Math.sqrt(FW.cov[k][k])} vs ${se}`);
    if (k < 4 && !digits(FW.beta[k], b)) bad.push(`b${k} ${FW.beta[k]} vs ${b}`);
    if (k >= 4 && !(Math.abs(FW.beta[k] - b) / Math.abs(b) < 3e-4)) near.push(`b${k} ${FW.beta[k]} vs ${b}`);
  });
  ok(!bad.length, `Table 3 weighted NSUR: wood and bark coefficients and all seven SEs to the printed digits ${bad.join('; ')}`);
  ok(!near.length, `Table 3 weighted NSUR: crown coefficients within 0.03 % of the printed values (${FW.beta.slice(4).map(v => v.toFixed(6)).join(', ')}) ${near.join('; ')}`);
  ok(sig(FW.sigma[3][3], 8.46e-7, 3) && digits(FW.s2, 0.933), `σ̂_44 = ${FW.sigma[3][3].toExponential(3)} (8.46e-7), σ̂²_NSUR = ${FW.s2.toFixed(4)} (0.933)`);
  const fi = FW.equations.map(e => e.nsur.stats.FI);
  ok(fi.every((v, i) => digits(v, P01.table4.weighted_FI[i])), `Table 4 weighted FI: ${fi.map(v => v.toFixed(4)).join(', ')} (0.984, 0.961, 0.909, 0.988)`);
  const iv = N.intervals(FW, 20, 17, { t: 2 }), bk = iv.rows[1], tt = iv.rows[3];
  ok(digits(bk.yhat, 34.7) && digits(bk.S2, 0.44) && digits(bk.ci[1] - bk.yhat, 1.3), `bark at D 20: ${bk.yhat.toFixed(2)} kg, S² ${bk.S2.toFixed(3)}, ± ${(bk.ci[1] - bk.yhat).toFixed(2)} (34.7, 0.44, ±1.3)`);
  ok(digits(tt.yhat, 264.2) && digits(tt.S2, 9.77) && digits(tt.ci[1] - tt.yhat, 6.3) && digits(tt.pi[1] - tt.yhat, 41.8), `total at D 20, H 17: ${tt.yhat.toFixed(2)} kg, S² ${tt.S2.toFixed(3)}, CI ± ${(tt.ci[1] - tt.yhat).toFixed(2)}, PI ± ${(tt.pi[1] - tt.yhat).toFixed(2)} (264.2, 9.77, 6.3, 41.8)`);
  ok(digits(tt.pi[0], 222.4) && digits(tt.pi[1], 306.0), `prediction interval [${tt.pi[0].toFixed(1)}, ${tt.pi[1].toFixed(1)}] ([222.4, 306.0])`);
  const iv2 = N.intervals(FW, 20, 17); ok(iv2.df === 153 && Math.abs(iv2.t - 1.9756) < 1e-3, `default t: Student t, MT − K = 153 df, t = ${iv2.t.toFixed(4)}`);
}
// 1e. Example 2, ln scale: the Σ̂ the paper used is not stated; the point estimate is near the printed one
const FL = N.fitNonlinearAdditive(trees, { method: 'log', comps: comps(), total: { from: 'column' } });
{
  const iv = N.intervals(FL, 20, 17, { t: 2 });
  ok(Math.abs(iv.rows[3].lnyhat - 5.5782) < 0.005 && Math.abs(iv.rows[3].yhat - 264.6) < 1.5, `ln-scale system at D 20, H 17: ln ŷ ${iv.rows[3].lnyhat.toFixed(4)} (5.5782), ŷ ${iv.rows[3].yhat.toFixed(1)} kg (264.6); coefficients differ from Table 3 by ≤ 3 %`);
  ok(iv.rows[3].pi[0] < iv.rows[3].yhat && iv.rows[3].yhat - iv.rows[3].pi[0] < iv.rows[3].pi[1] - iv.rows[3].yhat, 'ln-scale interval is asymmetric on the kg scale (Eq. 33)');
}

// 2. against the Python reference
const cmp = (F, R, label) => {
  const bad = [];
  if (R.theta) F.equations.forEach((e, i) => { const r = R.theta[i]; if (r == null ? e.weight.theta != null && e.weight.code !== 'log' : !e.weight.theta.every((v, j) => close(v, r[j], 1e-6))) bad.push('theta' + i); });
  F.equations.slice(0, -1).forEach((e, i) => { if (!e.single.b.every((v, a) => close(v, R.single_b[i][a], 1e-7))) bad.push('single_b' + i); if (!e.single.se.every((v, a) => close(v, R.single_se[i][a], 1e-6))) bad.push('single_se' + i); });
  if (!F.sigma.every((r, i) => r.every((v, j) => close(v, R.sigma[i][j], 1e-7)))) bad.push('sigma');
  if (!F.beta.every((v, k) => close(v, R.beta[k], 1e-7))) bad.push('beta ' + F.beta + ' vs ' + R.beta);
  if (!F.cov.every((r, k) => close(Math.sqrt(r[k]), R.se[k], 1e-6))) bad.push('se');
  if (!close(F.s2, R.s2, 1e-7)) bad.push('s2');
  F.equations.forEach((e, i) => ['Se', 'bias', 'FI'].forEach(k => { if (!(Math.abs(e.nsur.stats[k] - R.stats[i][k]) <= 1e-5 * Math.max(1, Math.abs(R.stats[i][k])))) bad.push(`stats${i}.${k}`); }));
  if (!['Se', 'FI'].every(k => close(F.equations[F.equations.length - 1].single.stats[k], R.proc1[k], 1e-7))) bad.push('proc1');
  const iv = N.intervals(F, 20, 17, { t: 2 });
  iv.rows.forEach((r, i) => { const q = R.intervals[i]; if (!(close(r.yhat, q.yhat, 1e-7) && close(r.S2, q.S2, 1e-5) && close(r.ci[0], q.ci[0], 1e-7) && close(r.pi[1], q.pi[1], 1e-6))) bad.push('interval' + i); });
  ok(!bad.length, `${label}: θ, EGNLS, Σ̂, NSUR coefficients and SEs, σ̂²_NSUR, Se/bias/FI, procedure 1, intervals match the Python reference ${bad.join('; ')}`);
};
const FE = N.fitNonlinearAdditive(trees, { method: 'weighted', comps: comps(), total: { from: 'sum', weight: 'dh' } });
ok(FE.equations.every(e => e.weight.code === 'none' || e.weight.estimated), 'weights estimated when θ is not given');
cmp(FE, REF.weighted, 'weighted, θ estimated');
cmp(FL, REF.log, 'ln scale (Example 2)');
{
  const t2 = trees.map((t, i) => i === 9 ? { ...t, total: 75.0 } : t);
  const F2 = N.fitNonlinearAdditive(t2, { method: 'weighted', comps: comps(['d2h', 'none', 'd.h']), total: { from: 'column', weight: 'dh' } });
  cmp(F2, REF.case2, 'total column, unweighted bark, D^θ1·e^(θ2·H)');
  ok(F2.equations[1].weight.code === 'none' && F2.equations[1].weight.theta === null, 'unweighted component has no θ');
}

// 3. additivity, forms, states
{
  const iv = N.intervals(FW, 31.2, 24.5);
  ok(Math.abs(iv.rows[0].yhat + iv.rows[1].yhat + iv.rows[2].yhat - iv.rows[3].yhat) < 1e-9, 'NSUR component predictions add up to the total prediction');
  for (const [i, e] of FW.equations.slice(0, 3).entries()) {
    const f = B.FORMS[e.form], p = Object.fromEntries(e.params.map((k, a) => [k, e.nsur.b[a]]));
    ok(f && f.scale === 'none' && f.params.join() === N.NL_FORMS[e.form].params.join() && Math.abs(f.f(p, 31.2, 24.5) - iv.rows[i].yhat) < 1e-9, `${e.key}: saved as the registered form biomass.${e.form} with the same prediction`);
  }
  const sumFit = FW.equations[3].nsur.stats, sumSep = FW.equations[3].single.stats;
  ok(sumFit.FI > sumSep.FI - 0.01 && Number.isFinite(sumSep.Se), `total: NSUR FI ${sumFit.FI.toFixed(4)}, procedure 1 FI ${sumSep.FI.toFixed(4)}`);
}
{
  const t3 = trees.map((t, i) => i === 4 ? { ...t, H: null } : i === 7 ? { ...t, y: { ...t.y, crown: 0 } } : t);
  const Fw = N.fitNonlinearAdditive(t3, { method: 'weighted', comps: comps(), total: { from: 'sum', weight: 'dh' } });
  const Fl = N.fitNonlinearAdditive(t3, { method: 'log', comps: comps(), total: { from: 'sum' } });
  ok(Fw.status === 'ok' && Fw.n === 39 && Fw.dropped.length === 1 && Fw.dropped[0].row === 6 && Fw.dropped[0].why === 'H', 'weighted: tree without H left out with its row; a zero mass is kept');
  ok(Fl.status === 'ok' && Fl.n === 38 && Fl.dropped.map(d => d.row + d.why).join() === '6H,9comp', 'ln scale: zero mass left out as well');
  const Fd = N.fitNonlinearAdditive(trees, { method: 'log', comps: [{ key: 'wood', form: 'pow.d' }, { key: 'bark', form: 'pow.d' }], total: { from: 'sum' } });
  ok(Fd.status === 'ok' && Fd.range.H === null && N.intervals(Fd, 20, null) !== null, 'D-only system: H not needed');
  const Fs = N.fitNonlinearAdditive(trees, { method: 'weighted', comps: comps(['none', 'none', 'none']), total: { from: 'sum', weight: 'none' } });
  ok(Fs.status === 'bad' && Fs.problems[0] === 'sum.unweighted', 'weighted method, no weights and the total = the sum of the components: Σ̂ singular, stated (sum.unweighted)');
}
const bad = (spec, code) => { const r = N.fitNonlinearAdditive(trees, spec); ok(r.status === 'bad' && r.problems.includes(code), `state ${code}`); };
bad({ method: 'weighted', comps: comps().slice(0, 1), total: { from: 'sum' } }, 'comps.few');
bad({ method: 'weighted', comps: [{ key: 'wood', form: 'lt.d', weight: 'none' }, ...comps().slice(1)], total: { from: 'sum' } }, 'form');
bad({ method: 'weighted', comps: comps([{ code: 'd.h2', theta: [1] }, 'd', 'd']), total: { from: 'sum' } }, 'weight.theta');
bad({ method: 'nls', comps: comps(), total: { from: 'sum' } }, 'method');
{ const r = N.fitNonlinearAdditive(trees.slice(0, 8), { method: 'weighted', comps: comps(), total: { from: 'sum', weight: 'none' } }); ok(r.status === 'bad' && r.problems[0] === 'n.few', 'state n.few'); }
ok(N.weightText('d.h2', [7.322, -0.006185]) === 'D^7.322·e^(−0.006185·H²)' && N.weightText('d2h', [2.114]) === '(D²H)^2.114' && N.weightText('dh') === '(D·H)^θ', `weight texts: ${N.weightText('d.h2', [7.322, -0.006185])}`);
ok(N.intervals(FW, 0, 17) === null && N.intervals(FW, 20, null) === null, 'intervals: invalid D or missing H → null');

console.log(`BC-02/a2 nonlinear additive system: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
