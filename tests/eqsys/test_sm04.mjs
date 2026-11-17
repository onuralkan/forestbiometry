// Systems of equations (PLATFORM_PLAN SM-04): assets/lab/eqsys/calc.js.
//   node tests/eqsys/test_sm04.mjs
// 1. Reference [P]: R package systemfit 1.1-30 (R 4.5.2), tests/ref/eqsys_sm04.json from tests/ref/sm04_systems.R (run by
//    the user, 17 Nov 2026) on the simulated sample assets/lab/eqsys/ornek/ornek-sistem.csv (80 trees): the linear system
//    ln H = h0 + h1 ln D, ln V = v0 + v1 ln D + v2 (ln D)² by OLS, SUR (residual covariance Eq. 37, 38, 39), iterated SUR
//    (Eq. 38 and 37), and with the cross-equation restriction h1 = v1 (OLS, SUR): coefficients, SEs, residual covariance,
//    R² per equation, system OLS R², log-likelihood and its df; the likelihood-ratio test (Eq. 48).
// 2. Nonlinear systems (Chapman–Richards height with a power volume equation, free and compatible): systemfit's
//    nlsystemfit OLS coefficients, and tests/ref/eqsys_sm04_nl.json (make_eqsys_sm04.py, NumPy, written apart) for OLS,
//    SUR and iterated SUR (nlsystemfit's SUR did not move from OLS on these data); McElroy's R² (Eq. 43).
// 3. Compiling systems, shared coefficients, states.
import { readFile } from 'node:fs/promises';
import * as Q from '../../assets/lab/eqsys/calc.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const md = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i]) / Math.max(Math.abs(b[i]), 1e-300)));
const REF = JSON.parse(await readFile(new URL('../ref/eqsys_sm04.json', import.meta.url), 'utf8'));
const NL = JSON.parse(await readFile(new URL('../ref/eqsys_sm04_nl.json', import.meta.url), 'utf8'));
const rows = (await readFile(new URL('../../assets/lab/eqsys/ornek/ornek-sistem.csv', import.meta.url), 'utf8')).trim().split('\n').slice(1)
  .map((l, i) => { const c = l.split(';').map(x => +x.replace(',', '.')); return { row: i + 2, vals: { D: c[1], H: c[2], V: c[3], lnD: Math.log(c[1]), lnH: Math.log(c[2]), lnV: Math.log(c[3]) } }; });
ok(rows.length === REF.n, `sample: ${rows.length} trees (as in the R run)`);
const vars = ['lnD', 'lnH', 'lnV', 'D', 'H', 'V'];

// 1. linear systems against systemfit
const un = Q.compileSystem([{ name: 'height', y: 'lnH', expr: 'h0 + h1*lnD' }, { name: 'volume', y: 'lnV', expr: 'v0 + v1*lnD + v2*lnD^2' }], vars);
const re = Q.compileSystem([{ name: 'height', y: 'lnH', expr: 'h0 + s*lnD' }, { name: 'volume', y: 'lnV', expr: 'v0 + s*lnD + v2*lnD^2' }], vars);
ok(un.ok && un.params.join() === 'h0,h1,v0,v1,v2' && !un.shared.length && re.shared.join() === 's', 'systems compiled; the shared name s is a cross-equation restriction');
const cases = { OLS: [un, 'OLS', 'geomean'], SUR: [un, 'SUR', 'geomean'], SURnoDf: [un, 'SUR', 'noDfCor'], SURmax: [un, 'SUR', 'max'], ISUR: [un, 'ISUR', 'geomean'], ISURml: [un, 'ISUR', 'noDfCor'], SURr: [re, 'SUR', 'geomean'], OLSr: [re, 'OLS', 'geomean'] };
const F = {};
for (const [k, [s, m, r]] of Object.entries(cases)) {
  const f = Q.fitSystem(s, rows, { method: m, resid: r }), R = REF.linear[k]; F[k] = f;
  const ex = v => s === re ? [v[0], v[1], v[2], v[1], v[3]] : v, it = m === 'ISUR', bad = [];
  if (md(ex(f.coef), R.coef) > (it ? 1e-6 : 1e-9)) bad.push('coef');
  if (md(ex(f.se), R.se) > (it ? 1e-6 : 1e-9)) bad.push('se');
  if (md(f.residCov.flat(), R.residCov.flat()) > (it ? 1e-6 : 1e-9)) bad.push('residCov');
  if (md(f.eq.map(e => e.r2), R.r2) > 1e-9 || Math.abs(f.olsR2 - R.mcelroy) > 1e-9) bad.push('R²');
  if (Math.abs(f.logLik - R.logLik) > (it ? 1e-6 : 1e-8) || f.df !== R.df) bad.push(`logLik ${f.logLik} df ${f.df} vs ${R.logLik} ${R.df}`);
  ok(!bad.length, `systemfit ${k} (${m}${m !== 'OLS' ? ', residual covariance ' + r : ''}${s === re ? ', h1 = v1' : ''}): coefficients, SEs, residual covariance, R² per equation and system OLS R², log L and df ${bad.join('; ')}`);
}
ok(F.ISUR.iter > 1 && F.SUR.iter === 1 && F.OLS.iter === null, `iterated SUR iterates (${F.ISUR.iter} steps; systemfit ${REF.linear.ISUR.iter} with its own stopping rule)`);
{ const r = Q.fitSystem(re, rows, { method: 'ISUR', resid: 'noDfCor' }), t = Q.lrtSystems(r, F.ISURml);
  ok(Math.abs(t.LR - REF.lrt.LR) < 1e-5 && t.df === REF.lrt.df && Math.abs(t.p / REF.lrt.p - 1) < 1e-4, `likelihood-ratio test of h1 = v1 (iterated SUR, Eq. 48): LR = ${t.LR.toFixed(5)} (lrtest ${REF.lrt.LR.toFixed(5)}), df ${t.df}, p ${t.p.toExponential(3)}`); }
ok(Math.abs(F.SUR.mcelroy - NL.mcelroy_SUR) < 1e-9, `McElroy's R² (Eq. 43) of the SUR fit: ${F.SUR.mcelroy.toFixed(6)} (Python ${NL.mcelroy_SUR.toFixed(6)})`);

// 2. nonlinear systems
const st = { a: 30, b: 0.04, c: 1.2, k: 0.00006, p: 1.9, q: 1 };
const free = Q.compileSystem([{ name: 'height', y: 'H', expr: '1.3 + a*(1-exp(-b*D))^c' }, { name: 'volume', y: 'V', expr: 'k*D^p*H^q' }], vars);
const comp = Q.compileSystem([{ name: 'height', y: 'H', expr: '1.3 + a*(1-exp(-b*D))^c' }, { name: 'volume', y: 'V', expr: 'k*D^p*(1.3 + a*(1-exp(-b*D))^c)^q' }], vars);
ok(comp.shared.join() === 'a,b,c', 'compatible system: a, b, c shared by the height and volume equations');
for (const [nm, s, rOLS] of [['free', free, REF.nonlinear.OLS], ['compatible', comp, REF.nonlinear.OLSc]]) {
  const o = Q.fitSystem(s, rows, { method: 'OLS', start: st });
  const so = Q.fitSystem(s, rows, { method: 'SUR', start: st }).se;
  ok(Math.max(...o.coef.map((v, j) => Math.abs(v - rOLS.coef[j]) / so[j])) < 1e-3, `${nm} system, OLS: coefficients = nlsystemfit within 1e-3 SE (${o.coef.map(v => v.toPrecision(6)).join(', ')})`);
  for (const [m, r, key] of [['OLS', 'geomean', 'OLS'], ['SUR', 'geomean', 'SUR'], ['ISUR', 'geomean', 'ISUR'], ['ISUR', 'noDfCor', 'ISURml']]) {
    const f = Q.fitSystem(s, rows, { method: m, resid: r, start: st }), R = NL[`${nm}_${key}`], bad = [];
    // coefficients within 1e-4 standard errors (the compatible system is ill-conditioned: q ≈ 0, k and p collinear, so the
    // reference's finite-difference Jacobian sets the attainable relative agreement), SSR to 1e-7
    const se = R.se || f.se, dz = Math.max(...f.coef.map((v, j) => Math.abs(v - R.coef[j]) / se[j]));
    if (dz > 1e-4) bad.push('coef ' + dz.toExponential(2) + ' SE');
    if (R.se && md(f.se, R.se) > 1e-4) bad.push('se ' + md(f.se, R.se));
    if (md(f.eq.map(e => e.ssr), R.ssr) > 1e-7) bad.push('ssr');
    if (R.sigmaUsed && m === 'SUR' && md(f.sigmaUsed.flat(), R.sigmaUsed.flat()) > 1e-7) bad.push('Σ');
    ok(f.status === 'ok' && !bad.length, `${nm} system, ${key}: coefficients${R.se ? ', SEs' : ''}, SSR per equation${m === 'SUR' ? ', Σ̂ of the first step' : ''} = Python reference ${bad.join('; ')}`);
  }
}
{ const f = Q.fitSystem(comp, rows, { method: 'SUR', start: st });
  const p = Object.fromEntries(f.names.map((n, j) => [n, f.coef[j]])), d = 30, h = 1.3 + p.a * (1 - Math.exp(-p.b * d)) ** p.c;
  ok(Math.abs(f.eq[1].fitted[0] - p.k * rows[0].vals.D ** p.p * (1.3 + p.a * (1 - Math.exp(-p.b * rows[0].vals.D)) ** p.c) ** p.q) < 1e-12 && h > 0, 'compatible system: the volume equation uses the same height curve as the height equation'); }

// 3. states
{
  const bad = s => Q.compileSystem(s, vars).code;
  ok([bad([{ name: 'a', y: 'H', expr: '1 + a*D' }]), bad([{ name: 'a', y: 'H', expr: 'a*(D' }, { name: 'b', y: 'V', expr: 'b*D' }]), bad([{ name: 'a', y: 'H', expr: 'D*2' }, { name: 'b', y: 'V', expr: 'b*D' }])].join() === 'eqs.few,parse,params.none', 'compile states: one equation, parse error, no coefficient');
  const r2 = rows.map((r, i) => i === 3 ? { ...r, vals: { ...r.vals, V: null } } : r), f = Q.fitSystem(un, r2.map(r => ({ ...r, vals: { ...r.vals, lnV: r.vals.V == null ? NaN : r.vals.lnV } })), { method: 'SUR' });
  ok(f.status === 'ok' && f.T === 79 && f.dropped.length === 1 && f.dropped[0].row === 5, 'a tree with a missing value is left out of every equation (same T)');
  ok(Q.fitSystem(un, rows.slice(0, 3), { method: 'SUR' }).code === 'n.few', 'too few observations');
  const id = Q.ensureForm('k*D^p*H^q', ['D', 'H'], ['k', 'p', 'q']);
  ok(/^eqsys\.[0-9a-f]{8}$/.test(id), 'library form id ' + id);
}

console.log(`SM-04 systems of equations: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
