// Mixed-effects models (PLATFORM_PLAN SM-03): assets/lab/mixed/calc.js.
//   node tests/mixed/test_sm03.mjs
// Reference [P]: R package nlme 3.1-168 (R 4.5.2), tests/ref/mixed_sm03.json from tests/ref/sm03_mixed.R (run by the
// user, 17 Nov 2026) on the simulated sample assets/lab/mixed/ornek/ornek-karma.csv (25 plots, 441 trees):
//  LME (Pinheiro and Bates 2000 §2.2, §5.2): H = b0 + b1·ln D with random intercept, random intercept and slope (general
//  and diagonal), varPower(D), REML and ML: fixed effects, SEs, σ, D, δ, log-likelihood, AIC, BIC, BLUPs, fitted values;
//  likelihood-ratio test; calibration (BLUP) of a new plot.
//  NLME (Lindstrom–Bates, §7.2): H = 1.3 + a(1 − e^(−bD))^c with random a, random a and b (diagonal, general),
//  varPower(D), by ML; calibration of a new plot (one-step and conditional mode).
//  REML NLME: nlme's fit N1r stopped at the ML relative precision (σ² and D are the ML values × N/(N − p), β the ML β);
//  the test checks the REML log-likelihood of Eq. 7.13 at nlme's estimates and that the tool's REML optimum is higher.
import { readFile } from 'node:fs/promises';
import * as M from '../../assets/lab/mixed/calc.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const rel = (a, b, r) => Math.abs(a - b) <= r * Math.max(Math.abs(b), 1e-300);
const allRel = (a, b, r) => a.length === b.length && a.every((v, i) => rel(v, b[i], r));
const REF = JSON.parse(await readFile(new URL('../ref/mixed_sm03.json', import.meta.url), 'utf8'));
const rows = (await readFile(new URL('../../assets/lab/mixed/ornek/ornek-karma.csv', import.meta.url), 'utf8')).trim().split('\n').slice(1).map(l => l.split(';').map(c => +c.replace(',', '.')));
ok(rows.length === REF.n && new Set(rows.map(r => r[0])).size === REF.groups, `sample: ${rows.length} trees, ${REF.groups} plots (as in the R run)`);
const by = new Map(); for (const r of rows) { const k = String(r[0]); if (!by.has(k)) by.set(k, []); by.get(k).push(r); }
const linG = q => [...by].map(([id, rs]) => ({ id, y: rs.map(r => r[3]), X: rs.map(r => [1, Math.log(r[2])]), Z: rs.map(r => q === 1 ? [1] : [1, Math.log(r[2])]), v: rs.map(r => r[2]) }));
const nlG = [...by].map(([id, rs]) => ({ id, y: rs.map(r => r[3]), x: rs.map(r => r[2]), v: rs.map(r => r[2]) }));
// nlme's random effects: rows in the order of ranefGroups, keyed 1…M by position
const reArr = R => R.ranefGroups.map((g, i) => { const v = R.ranef[String(i + 1)]; return Array.isArray(v) ? v : [v]; });
const reRow = (R, i) => reArr(R)[i];

// 1. LME
const LM = { L1: [1, 'diag', false, 'REML'], L2: [2, 'symm', false, 'REML'], L3: [2, 'diag', false, 'REML'], L4: [2, 'symm', true, 'REML'], L1m: [1, 'diag', false, 'ML'], L2m: [2, 'symm', false, 'ML'], L4m: [2, 'symm', true, 'ML'] };
const FL = {};
for (const [k, [q, cov, power, method]] of Object.entries(LM)) {
  const R = REF.lme[k], G = linG(q), f = M.fitLMM(G, { cov, q, power, method }); FL[k] = { f, G };
  const bad = [];
  if (!allRel(f.beta, R.fixef, 1e-7)) bad.push('beta ' + f.beta + ' vs ' + R.fixef);
  if (!allRel(f.se, R.se, 1e-5)) bad.push('se ' + f.se + ' vs ' + R.se);
  const tol = power ? 2e-5 : 1e-6;   // varPower adds a parameter: the optimum is located a little less sharply
  if (!rel(f.sigma, R.sigma, tol)) bad.push('sigma');
  const Dr = R.ranefCov.D.flat(), Df = f.D.flat(); if (!Df.every((v, i) => Math.abs(v - Dr[i]) <= 2 * tol * 10 * Math.max(...Dr.map(Math.abs)))) bad.push('D ' + Df + ' vs ' + Dr);
  if (power && !rel(f.delta, R.power[0] ?? R.power, 1e-5)) bad.push('delta ' + f.delta + ' vs ' + R.power);
  if (Math.abs(f.ll - R.logLik) > 1e-6) bad.push(`logLik ${f.ll} vs ${R.logLik}`);
  if (f.k !== R.df || Math.abs(f.aic - R.AIC) > 1e-5 || Math.abs(f.bic - R.BIC) > 1e-5) bad.push(`k/AIC/BIC ${f.k} ${f.aic} ${f.bic} vs ${R.df} ${R.AIC} ${R.BIC}`);
  const re = reArr(R), mine = R.ranefGroups.map(g => f.ranef.find(r => r.id === g).b);
  if (!re.every((v, i) => v.every((x, j) => Math.abs(x - mine[i][j]) <= 1e-5 * Math.max(1, Math.abs(x))))) bad.push('ranef');
  const fit = M.lmmFitted(G, f), f0 = fit[0].map(x => x[0]).slice(0, 10), f1 = fit[0].map(x => x[1]).slice(0, 10);
  if (!allRel(f0, R.fitted0, 1e-7) || !allRel(f1, R.fitted1, 1e-6)) bad.push('fitted');
  ok(!bad.length, `LME ${k} (${method}, ${q === 1 ? 'random intercept' : cov === 'symm' ? 'general 2 × 2' : 'diagonal 2 × 2'}${power ? ', varPower(D)' : ''}): β, SE, σ, D${power ? ', δ' : ''}, log L, k, AIC, BIC, BLUPs, fitted values = nlme ${bad.join('; ')}`);
}
{ const t = M.lrt(FL.L1m.f, FL.L2m.f); ok(Math.abs(t.L - REF.lrt.L) < 1e-5 && t.df === REF.lrt.df[1] - REF.lrt.df[0] && rel(t.p, REF.lrt.p, 1e-4), `likelihood-ratio test L1m vs L2m: L = ${t.L.toFixed(5)}, df ${t.df}, p = ${t.p.toExponential(4)} (anova.lme)`); }
// calibration of a new plot: three trees of plot 3
{
  const nd = by.get('3').slice(0, 3), C = REF.calib_lme;
  for (const k of ['L2', 'L4']) {
    const f = FL[k].f, obs = nd.map(r => ({ y: r[3], X: [1, Math.log(r[2])], Z: [1, Math.log(r[2])], v: r[2] })), c = M.calibrateLinear(f, obs);
    const pred = [15, 30, 45].map(D => [1, Math.log(D)].reduce((s, x, j) => s + x * (f.beta[j] + c.b[j]), 0));
    ok(allRel(c.b, C[k].u, k === 'L4' ? 1e-4 : 1e-5) && allRel(pred, C[k].pred, 1e-6), `calibration (BLUP) of a new plot with ${k}: b = ${c.b.map(v => v.toFixed(6))} (R ${C[k].u.map(v => v.toFixed(6))}), predictions at 15, 30, 45 cm`);
  }
}

// 2. NLME
const E = Math.exp, CR = { params: ['a', 'b', 'c'], f: (p, D) => 1.3 + p[0] * (1 - E(-p[1] * D)) ** p[2], grad: (p, D) => { const u = 1 - E(-p[1] * D), y = p[0] * u ** p[2]; return [u ** p[2], y * p[2] * D * E(-p[1] * D) / u, y * Math.log(u)]; } };
const NM = { N1: [[0], 'diag', false, 'ML'], N2: [[0, 1], 'diag', false, 'ML'], N3: [[0, 1], 'symm', false, 'ML'], N4: [[0], 'diag', true, 'ML'] };
const FN = {};
for (const [k, [random, cov, power, method]] of Object.entries(NM)) {
  const R = REF.nlme[k], f = M.fitNLME({ ...CR, random }, nlG, { cov, power, method }, { start: [28, 0.045, 1.2] }); FN[k] = f;
  const bad = [];
  if (f.status !== 'ok') bad.push('status ' + f.status);
  else {
    if (!allRel(f.beta, R.fixef, 2e-6)) bad.push('beta ' + f.beta + ' vs ' + R.fixef);
    if (!allRel(f.se, R.se, 2e-4)) bad.push('se ' + f.se + ' vs ' + R.se);
    if (!rel(f.sigma, R.sigma, 2e-5)) bad.push('sigma ' + f.sigma + ' vs ' + R.sigma);
    const Dr = R.ranefCov.D.flat(), Df = f.D.flat(); if (!Df.every((v, i) => Math.abs(v - Dr[i]) <= 1e-3 * Math.abs(Dr[i]) + 1e-9)) bad.push('D ' + Df + ' vs ' + Dr);
    if (power && !rel(f.delta, R.power[0] ?? R.power, 1e-4)) bad.push('delta');
    if (Math.abs(f.ll - R.logLik) > 2e-4) bad.push(`logLik ${f.ll} vs ${R.logLik}`);
    if (f.k !== R.df || Math.abs(f.aic - R.AIC) > 5e-4 || Math.abs(f.bic - R.BIC) > 5e-4) bad.push('k/AIC/BIC');
    const re = R.ranefGroups.map((g, i) => reRow(R, i)), mine = R.ranefGroups.map(g => f.ranef.find(r => String(r.id) === g).b);
    if (!re.every((v, i) => v.every((x, j) => Math.abs(x - mine[i][j]) <= 1e-4 * Math.max(Math.abs(x), j ? 1e-3 : 1)))) bad.push('ranef');
  }
  ok(!bad.length, `NLME ${k} (ML, random ${random.map(j => 'abc'[j]).join(' + ')}${random.length > 1 ? ', ' + cov : ''}${power ? ', varPower(D)' : ''}): β, SE, σ, D${power ? ', δ' : ''}, log L, k, AIC, BIC, random effects = nlme${R.warnings && R.warnings.length ? ' (nlme warned: LME step false convergence)' : ''} ${bad.join('; ')}`);
}
{ const t = M.lrt(FN.N1, FN.N3); ok(Math.abs(t.L - REF.nlrt.L) < 5e-4 && t.df === REF.nlrt.df[1] - REF.nlrt.df[0], `likelihood-ratio test N1 vs N3: L = ${t.L.toFixed(4)} (anova.nlme ${REF.nlrt.L.toFixed(4)}), df ${t.df}`); }
// REML (Eq. 7.13)
{
  const R = REF.nlme.N1r, beta = R.fixef, re = reArr(R), bs = nlG.map(g => re[R.ranefGroups.indexOf(g.id)]);
  const lin = nlG.map((g, i) => { const ph = beta.slice(); ph[0] += bs[i][0]; const X = [], Z = [], w = []; g.x.forEach((D, t) => { const gr = CR.grad(ph, D); X.push(gr); Z.push([gr[0]]); w.push(g.y[t] - CR.f(ph, D) + gr.reduce((a, v, j) => a + v * beta[j], 0) + gr[0] * bs[i][0]); }); return { id: g.id, y: w, X, Z, v: g.v }; });
  const at = M.lmeLik(lin, { cov: 'diag', q: 1, power: false, method: 'REML' }, [0.5 * Math.log(R.ranefCov.D[0][0] / R.sigma ** 2)]);
  ok(Math.abs(at.ll - R.logLik) < 1e-6 && rel(Math.sqrt(at.sigma2), R.sigma, 1e-7), `REML log-likelihood (Eq. 7.13) at nlme's N1r estimates: ${at.ll.toFixed(6)} (nlme ${R.logLik.toFixed(6)}), σ ${Math.sqrt(at.sigma2).toFixed(7)}`);
  const ML = REF.nlme.N1, k = REF.n / (REF.n - 3);
  ok(rel(R.sigma ** 2, ML.sigma ** 2 * k, 1e-6) && rel(R.ranefCov.D[0][0], ML.ranefCov.D[0][0] * k, 1e-6) && allRel(R.fixef, ML.fixef, 1e-7), "nlme's N1r kept the ML relative precision (σ², D = ML × N/(N − p); β = ML β): not a REML optimum");
  const f = M.fitNLME({ ...CR, random: [0] }, nlG, { cov: 'diag', power: false, method: 'REML' }, { start: [28, 0.045, 1.2] });
  ok(f.status === 'ok' && f.ll > R.logLik + 1e-3, `the tool's REML fit reaches a higher REML log-likelihood: ${f.ll.toFixed(5)} > ${R.logLik.toFixed(5)} (D = ${f.D[0][0].toFixed(4)}, σ = ${f.sigma.toFixed(6)})`);
}
// calibration of the new plot (one step and conditional mode)
{
  const nd = by.get('3').slice(0, 3).map(r => ({ y: r[3], x: r[2], v: r[2] })), C = REF.calib_nlme;
  for (const [k, random] of [['N1', [0]], ['N3', [0, 1]], ['N4', [0]]]) {
    const f = FN[k], m = { ...CR, random }, one = M.calibrateNonlinear(m, f, nd), it = M.calibrateNonlinear(m, f, nd, { iterate: true });
    const u1 = Array.isArray(C[k].u1) ? C[k].u1 : [C[k].u1], u = Array.isArray(C[k].u) ? C[k].u : [C[k].u];
    const pr = b => [15, 30, 45].map(D => { const ph = f.beta.slice(); random.forEach((j, l) => { ph[j] += b[l]; }); return CR.f(ph, D); });
    ok(one.b.every((v, l) => Math.abs(v - u1[l]) <= 2e-4 * Math.max(Math.abs(u1[l]), l ? 1e-3 : 1)) && allRel(pr(one.b), C[k].pred1, 2e-5), `calibration ${k}, one step (Vonesh–Chinchilli): b = ${one.b.map(v => v.toPrecision(6))} (R ${u1.map(v => v.toPrecision(6))})`);
    ok(it.b.every((v, l) => Math.abs(v - u[l]) <= 2e-4 * Math.max(Math.abs(u[l]), l ? 1e-3 : 1)) && allRel(pr(it.b), C[k].pred, 2e-5), `calibration ${k}, conditional mode: b = ${it.b.map(v => v.toPrecision(6))} (R ${u.map(v => v.toPrecision(6))})`);
  }
}

// 3. building from a table, forms, states
{
  const rs = [{ row: 2, g: 'A', y: 10, vals: { D: 20 } }, { row: 3, g: 'A', y: 12, vals: { D: 0 } }, { row: 4, g: '', y: 9, vals: { D: 18 } }, { row: 5, g: 'B', y: null, vals: { D: 15 } }, { row: 6, g: 'B', y: 8, vals: { D: 12 } }];
  const b = M.buildLinear(rs, [{ name: 'D', tf: 'ln' }], { intercept: true, terms: [0] });
  ok(b.text === 'b0 + b1*ln(D)' && b.groups.length === 2 && b.dropped.map(d => d.row + d.why).join() === '3x,4group,5y', 'linear model from a table: formula text, groups, dropped rows (ln of 0, no group, no y)');
  const n = M.nonlinearModel('1.3 + a*(1-exp(-b*D))^c', ['D']);
  ok(n.ok && n.model.params.join() === 'a,b,c' && Math.abs(n.model.f([28, 0.045, 1.2], [30]) - CR.f([28, 0.045, 1.2], 30)) < 1e-12 && n.model.grad([28, 0.045, 1.2], [30]).every((v, j) => Math.abs(v - CR.grad([28, 0.045, 1.2], 30)[j]) < 1e-10), 'formula model: coefficients, value and exact gradient');
  const id = M.ensureForm(n.model.text, n.model.vars, n.model.params);
  ok(/^mixed\.[0-9a-f]{8}$/.test(id) && M.ensureForm('1.3+a*(1-exp(-b*D))^c', ['D'], ['a', 'b', 'c']) === id, `library form ${id}`);
  ok(M.calibrateLinear(FL.L2.f, []) === null && M.calibrateNonlinear({ ...CR, random: [0] }, FN.N1, []) === null, 'calibration without observations: null');
  const P = M.psiOf('symm', 2, [0.3, -0.4, 0.1]), th = M.thetaOfPsi('symm', P);
  ok(th.every((v, i) => Math.abs(v - [0.3, -0.4, 0.1][i]) < 1e-12), 'log-Cholesky parameters round-trip');
}

console.log(`SM-03 mixed-effects models: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
