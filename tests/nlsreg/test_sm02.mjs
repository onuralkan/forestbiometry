// Nonlinear regression (PLATFORM_PLAN SM-02): assets/lab/core/expr.js and assets/lab/nlsreg/calc.js.
//   node tests/nlsreg/test_sm02.mjs
// 1. Formula parser: grammar and precedence, refusals, canonical text, exact derivatives against central differences.
// 2. Published reference: Parresol (2001, Can. J. For. Res. 31: 865–878) Table 2, slash pine (Table 1 data,
//    tests/ref/parresol2001_slashpine.json): unweighted and weighted (EGNLS) coefficients, SEs and σ̂² of the wood,
//    bark and crown equations written as a formula and as the ready-made power forms; the weight exponents of Eq. 4;
//    the procedure-1 example at D = 20 cm, H = 17 m: var(ŷ_wood) = 8.46 kg² (Eq. 10) and var(ŷ_wood(new)) = 304.94 kg² (Eq. 11).
// 3. Against tests/ref/nlsreg_sm02.json (make_nlsreg_sm02.py, NumPy, model functions written out by hand, Jacobian by
//    central differences): five fits of the page's sample, with estimated and column weights, AIC, measures, intervals.
// 4. Common rows, forms for the coefficient library, states.
import { readFile } from 'node:fs/promises';
import * as E from '../../assets/lab/core/expr.js';
import * as N from '../../assets/lab/nlsreg/calc.js';
import { validateCoef, form as formOf } from '../../assets/lab/core/coef.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const close = (a, b, r = 1e-6) => Math.abs(a - b) <= r * Math.max(1e-12, Math.abs(b));
const digits = (a, b) => { const s = String(b).replace(/e.*$/, ''), dec = s.includes('.') ? s.split('.')[1].length : 0, ex = /e/.test(String(b)) ? +String(b).split('e')[1] : 0; return Math.abs(a - b) <= 0.5 * 10 ** (ex - dec) * (1 + 1e-9); };

// 1. parser
{
  const v = (s, env = {}) => { const r = E.parse(s); return r.ok ? E.evaluate(r.ast, env) : r.code; };
  ok(v('2^3^2') === 512 && v('-x^2', { x: 3 }) === -9 && v('2*3+4') === 10 && v('2*(3+4)') === 14 && v('8/2/2') === 2 && v('2^-1') === 0.5 && v('-2^2') === -4, 'precedence: ^ right-associative and above unary minus; left-associative / ');
  ok(v('a · x − b', { a: 2, x: 3, b: 1 }) === 5 && v('1.5e2 + .5') === 150.5 && Math.abs(v('pi') - Math.PI) < 1e-15, '· and − accepted, number forms, pi');
  ok(v('exp(ln(x)) + sqrt(x^2) + abs(-x) + log10(100)', { x: 3 }) === 3 + 3 + 3 + 2, 'functions exp, ln, sqrt, abs, log10');
  const codes = ['log(x)', 'foo(x)', 'a*(x', 'a+', '3x', 'a $ b', '', 'exp(a,b)', 'exp*2', 'x'.repeat(501)].map(s => E.parse(s).code);
  ok(codes.join() === 'log,func,end,end,trailing,char,empty,args,funcname,long', 'refusals: ' + codes.join());
  ok(E.parse('a*D^b*H^c').names.join() === 'a,D,b,H,c' && E.parse('pi*d^2/4').names.join() === 'd', 'names in first-use order; pi is not a name');
  const canon = ['a - (b - c)', '(a/b)/c', 'a/(b/c)', '(-x)^2', '-(x^2)', 'a^(b^c)', '(a^b)^c', '2*(x+1)', 'exp(-b*x)*a'].map(s => E.toText(E.parse(s).ast));
  ok(canon.join(' | ') === 'a-(b-c) | a/b/c | a/(b/c) | (-x)^2 | -x^2 | a^b^c | (a^b)^c | 2*(x+1) | exp(-b*x)*a', 'canonical text: ' + canon.join(' | '));
  ok(canon.every((t, i) => { const a = E.parse(t), b = E.parse(['a - (b - c)', '(a/b)/c', 'a/(b/c)', '(-x)^2', '-(x^2)', 'a^(b^c)', '(a^b)^c', '2*(x+1)', 'exp(-b*x)*a'][i]), env = { a: 1.7, b: 0.6, c: 2.3, x: 1.9 }; return Math.abs(E.evaluate(a.ast, env) - E.evaluate(b.ast, env)) < 1e-12; }), 'canonical text evaluates as the original');
  const cases = [['b0*(1-exp(-b1*x))^b2', { b0: 30, b1: 0.04, b2: 1.2, x: 20 }], ['a/(1+b*exp(-c*x))', { a: 30, b: 5, c: 0.07, x: 25 }], ['a*x^b*ln(x)^c + sqrt(d*x) - log10(e+x)/abs(a-x)', { a: 2, b: 0.8, c: 1.3, d: 0.5, e: 3, x: 7 }], ['b0-b1*exp(-b2*x^b3)', { b0: 25, b1: 20, b2: 0.01, b3: 1.4, x: 30 }], ['(a*x)^(b*x)/x^2', { a: 0.3, b: 0.2, x: 4 }]];
  let worst = 0;
  for (const [s, env] of cases) {
    const r = E.parse(s), wrt = r.names.filter(n => n !== 'x'), g = E.evalGrad(r.ast, env, wrt);
    ok(Math.abs(g.v - E.evaluate(r.ast, env)) < 1e-12 * Math.abs(g.v), `value of ${s}`);
    wrt.forEach((n, j) => { const h = 1e-6 * Math.abs(env[n]), fd = (E.evaluate(r.ast, { ...env, [n]: env[n] + h }) - E.evaluate(r.ast, { ...env, [n]: env[n] - h })) / (2 * h); worst = Math.max(worst, Math.abs(g.d[j] - fd) / Math.max(1e-8, Math.abs(fd))); });
  }
  ok(worst < 1e-6, `exact derivatives agree with central differences (worst relative difference ${worst.toExponential(2)})`);
  const g0 = E.evalGrad(E.parse('a*x^2').ast, { a: 2, x: -3 }, ['a']);
  ok(g0.v === 18 && g0.d[0] === 9, 'constant exponent on a negative base: no ln of a negative number');
}

// 2. Parresol 2001 Table 2
const P01 = JSON.parse(await readFile(new URL('../ref/parresol2001_slashpine.json', import.meta.url), 'utf8'));
const D = P01.rows.map(r => r[0]), H = P01.rows.map(r => r[1]), XDH = P01.rows.map(r => [r[0], r[1]]), T2 = P01.table2;
const wood = N.compile({ kind: 'formula', expr: 'a*(D^2*H)^b', vars: ['D', 'H'] }), bark = N.compile({ kind: 'ready', ready: 'pow' }), crown = N.compile({ kind: 'ready', ready: 'pow2' });
ok(wood.ok && wood.params.join() === 'a,b' && wood.vars.join() === 'D,H' && crown.params.join() === 'a,b,c' && crown.vars.join() === 'x1,x2', 'models compiled: coefficients and variables');
const yW = P01.rows.map(r => r[4]), yB = P01.rows.map(r => r[5]), yC = P01.rows.map(r => r[6]), d2h = D.map((d, i) => d * d * H[i]);
const fits = {
  unweighted: [N.fitModel(wood, XDH, yW, { start: [0.02, 1] }), N.fitModel(bark, D.map(d => [d]), yB, { readyId: 'pow' }), N.fitModel(crown, XDH, yC, { readyId: 'pow2' })],
  weighted: [N.fitModel(wood, XDH, yW, { start: [0.02, 1], weight: { kind: 'power', X: d2h, theta: 2.114 } }), N.fitModel(bark, D.map(d => [d]), yB, { readyId: 'pow', weight: { kind: 'power', X: D, theta: 3.715 } }),
    N.fitModel(crown, XDH, yC, { readyId: 'pow2', weight: { kind: 'column', psi: D.map((d, i) => d ** 7.322 * Math.exp(-0.006185 * H[i] ** 2)) } })],
};
for (const kind of ['unweighted', 'weighted']) ['wood', 'bark', 'crown'].forEach((k, i) => {
  const f = fits[kind][i], bad = [];
  T2[kind][k].forEach(([b, se], a) => { if (!(digits(f.theta[a], b) || (kind === 'unweighted' && k === 'crown' && Math.abs(f.theta[a] - b) < 1e-4 * Math.abs(b)))) bad.push(`b${a} ${f.theta[a]} vs ${b}`); if (!digits(f.se[a], se)) bad.push(`se${a} ${f.se[a]} vs ${se}`); });
  const s2 = T2[kind].s2[i]; if (!(kind === 'unweighted' ? digits(f.s2, s2) : Math.abs(f.s2 / s2 - 1) < 2e-4)) bad.push(`s2 ${f.s2} vs ${s2}`);
  ok(f.status === 'ok' && !bad.length, `Table 2 ${kind} ${k}: coefficients, SEs and σ̂² as printed ${bad.join('; ')}`);
});
{
  const est = [N.fitModel(wood, XDH, yW, { start: [0.02, 1], weight: { kind: 'power', X: d2h, theta: null } }), N.fitModel(bark, D.map(d => [d]), yB, { readyId: 'pow', weight: { kind: 'power', X: D, theta: null } })];
  ok(est.every(f => f.weight.estimated) && digits(est[0].weight.theta, 2.114) && digits(est[1].weight.theta, 3.715), `θ estimated from the unweighted residuals (Eq. 4): ${est[0].weight.theta.toFixed(4)} (2.114), ${est[1].weight.theta.toFixed(4)} (3.715)`);
  const iv = N.interval(wood, fits.weighted[0], { D: 20, H: 17 }, 6800 ** 2.114);
  ok(digits(iv.yhat, 186.4) && digits(iv.S2, 8.46), `Eq. 10: ŷ_wood ${iv.yhat.toFixed(2)} kg (186.4), var ${iv.S2.toFixed(3)} kg² (8.46)`);
  const vnew = fits.weighted[0].s2 * 6800 ** 2.114 + iv.S2;
  ok(Math.abs(vnew - 304.94) < 0.05, `Eq. 11: var(ŷ_wood(new)) = ${vnew.toFixed(2)} kg² (304.94)`);
  ok(Math.abs((iv.pi[1] - iv.yhat) / fits.weighted[0].t - Math.sqrt(vnew)) < 1e-9 && fits.weighted[0].df === 38, 'prediction interval half-width = t·√var(new), df = n − p = 38');
}

// 3. Python reference on the page's sample
const csv = (await readFile(new URL('../../assets/lab/nlsreg/ornek/ornek-nls.csv', import.meta.url), 'utf8')).trim().split('\n').slice(1).map(l => l.split(';').slice(1).map(c => +c.replace(',', '.')));
const REF = JSON.parse(await readFile(new URL('../ref/nlsreg_sm02.json', import.meta.url), 'utf8'));
const sD = csv.map(r => r[0]), sH = csv.map(r => r[1]), sV = csv.map(r => r[2]);
const cr = N.compile({ kind: 'ready', ready: 'cr' }), crh = N.compile({ kind: 'formula', expr: '1.3 + b0*(1-exp(-b1*D))^b2', vars: ['D'] }), lg = N.compile({ kind: 'ready', ready: 'logi' });
const pw = N.compile({ kind: 'formula', expr: 'a*D^b*H^c', vars: ['D', 'H'] });
const S = {
  cr: [cr, N.fitModel(cr, sD.map(d => [d]), sH, { readyId: 'cr' }), { x: 30 }, 1],
  crh: [crh, N.fitModel(crh, sD.map(d => [d]), sH, { start: [30, 0.03, 1] }), { D: 30 }, 1],
  logi: [lg, N.fitModel(lg, sD.map(d => [d]), sH, { readyId: 'logi' }), { x: 30 }, 1],
  pow2w: [pw, N.fitModel(pw, csv.map(r => [r[0], r[1]]), sV, { start: [6e-5, 2, 1], weight: { kind: 'power', X: sD, theta: null } }), { D: 30, H: 20 }, null],
  powc: [pw, N.fitModel(pw, csv.map(r => [r[0], r[1]]), sV, { start: [6e-5, 2, 1], weight: { kind: 'column', psi: sD.map((d, i) => (d * d * sH[i]) ** 2) } }), { D: 30, H: 20 }, (900 * 20) ** 2],
};
for (const [k, [m, f, pt, psi0]] of Object.entries(S)) {
  const R = REF.cases[k], bad = [];
  if (f.status !== 'ok') bad.push('status ' + f.status);
  else {
    if (!f.theta.every((v, j) => close(v, R.theta[j], 2e-7))) bad.push('theta ' + f.theta + ' vs ' + R.theta);
    if (!f.se.every((v, j) => close(v, R.se[j], 2e-5))) bad.push('se');
    if (!close(f.s2, R.s2, R.weight_theta != null ? 1e-5 : 1e-7)) bad.push(`s2 ${f.s2} vs ${R.s2}`);   // ψ = D^θ: σ̂² carries the θ difference of the two fits (~1e-8) times ln D
    if (!close(f.aic, R.aic, 1e-7)) bad.push(`aic ${f.aic} vs ${R.aic}`);
    if (!(close(f.metrics.rmse, R.rmse, 1e-7) && Math.abs(f.metrics.bias - R.bias) < 1e-8 * Math.max(1, Math.abs(R.rmse)) && close(f.metrics.r2, R.r2, 1e-9))) bad.push('measures');
    if (!close(f.t, R.t, 1e-9)) bad.push('t');
    if (R.weight_theta != null && !close(f.weight.theta, R.weight_theta, 1e-6)) bad.push('weight θ');
    const psi = psi0 ?? 30 ** f.weight.theta, iv = N.interval(m, f, pt, psi);
    if (!(close(iv.yhat, R.point.yhat, 1e-7) && close(iv.S2, R.point.S2, 5e-5) && close(iv.ci[0], R.point.ci[0], 1e-6) && close(iv.pi[1], R.point.pi[1], 1e-6))) bad.push('interval');
  }
  ok(!bad.length, `${k}: coefficients, SEs, σ̂², AIC, RMSE/bias/R², t, intervals match the Python reference ${bad.join('; ')}`);
}
ok(S.crh[1].aic > S.cr[1].aic - 5 && S.logi[1].aic > S.cr[1].aic, `AIC orders the sample's height models: Chapman–Richards ${S.cr[1].aic.toFixed(2)}, logistic ${S.logi[1].aic.toFixed(2)}`);

// 4. rows, library, states
{
  const rows = [{ row: 2, vals: [10, 5, 1] }, { row: 3, vals: [null, 5, 1] }, { row: 4, vals: [10, 0, 1] }, { row: 5, vals: [12, 6, 2] }];
  const r = N.commonRows(rows, [{ col: 0 }, { col: 1, positive: true }, { col: 2 }]);
  ok(r.use.join() === '0,3' && r.dropped.map(d => d.row + ':' + d.col).join() === '3:0,4:1', 'common rows: every used column finite (weights positive); dropped with row and column');
  const id = N.ensureForm(pw), id2 = N.ensureForm(N.compile({ kind: 'formula', expr: 'a * D ^ b * H ^ c', vars: ['D', 'H'] }));
  ok(/^nls\.expr\.[0-9a-f]{8}$/.test(id) && id === id2 && id !== 'nls.expr.' && formOf(id).params.map(p => p.key).join() === 'a,b,c', `formula form ${id}: same canonical formula, same form`);
  ok(formOf('nls.cr') && formOf('nls.pow2').params.length === 3 && formOf('nls.cr').formula.en === 'y = b0*(1-exp(-b1*x))^b2', 'ready-made forms registered as nls.<id>');
  const set = { schema: 'model-coef/1', id: 'x1', tool: 'nls', form: id, params: { a: 6.8e-5, b: 1.8, c: 1.05 }, inputs: { D: { unit: 'cm' }, H: { unit: 'm' } }, output: { name: 'V', unit: 'm3' }, source: { citation: 'test' }, origin: 'fitted', fit: { expr: pw.text, vars: pw.vars } };
  ok(!validateCoef(set).length && Math.abs(N.predictSet(set, { D: 30, H: 20 }) - 6.8e-5 * 30 ** 1.8 * 20 ** 1.05) < 1e-12, 'a formula set validates and predicts');
  const other = { ...set, form: 'nls.expr.0badc0de', fit: { expr: 'q*D^r', vars: ['D'] } };
  N.registerStoredForms([other]);
  ok(!formOf('nls.expr.0badc0de'), 'a stored set whose formula does not hash to its form id is not registered');
  const good = { ...set, form: N.ensureForm(N.compile({ kind: 'formula', expr: 'q*D^r', vars: ['D'] })), params: { q: 1, r: 2 }, inputs: { D: { unit: 'cm' } }, fit: { expr: 'q*D^r', vars: ['D'] } };
  ok(!validateCoef(good).length, 'stored formula sets re-register by their own text');
  const cm = s => N.compile(s).code;
  ok([cm({ kind: 'ready', ready: 'zz' }), cm({ kind: 'formula', expr: 'a*(x', vars: ['x'] }), cm({ kind: 'formula', expr: 'a*x', vars: ['y'] }), cm({ kind: 'formula', expr: 'x*2', vars: ['x'] }), cm({ kind: 'formula', expr: 'a*b', vars: [] })].join() === 'ready.unknown,parse,var.absent,params.none,vars.none', 'compile states');
  const few = N.fitModel(pw, csv.slice(0, 4).map(r => [r[0], r[1]]), sV.slice(0, 4), { start: [6e-5, 2, 1] });
  const nost = N.fitModel(pw, csv.map(r => [r[0], r[1]]), sV, {});
  const bw = N.fitModel(pw, csv.map(r => [r[0], r[1]]), sV, { start: [6e-5, 2, 1], weight: { kind: 'power', X: sD.map(() => 0), theta: 1 } });
  const bs = N.fitModel(pw, csv.map(r => [r[0], r[1]]), sV, { start: [6e-5, 2] });
  ok(few.code === 'n.few' && nost.code === 'start.missing' && bw.code === 'weight.var' && bs.code === 'start.missing', 'fit states: n.few, start.missing, weight.var');
  const P = N.fitModel(cr, D.map(d => [d]), H, { readyId: 'cr' });
  ok(P.status !== 'ok' || Number.isFinite(P.aic), `a form that does not suit the data is reported, not hidden (status ${P.status})`);
  ok(N.interval(pw, S.powc[1], { D: 30 }, 1) === null && N.interval(pw, S.powc[1], { D: 30, H: 20 }, 0) === null, 'interval: missing variable or non-positive weight → null');
}

console.log(`SM-02 nonlinear regression: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
