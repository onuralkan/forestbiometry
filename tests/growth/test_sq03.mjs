// Growth function fitter (SQ-03): forms, fitting, derived ages.   node tests/growth/test_sq03.mjs
// Reference: tests/ref/growth_sq03.json (tests/ref/make_growth_sq03.py: models written again, scipy least_squares,
// numerical derivatives + brentq). Fekedulegn et al. (1999) Table 11 predictions check the formulas ([A], worked example).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as G from '../../assets/lab/growth/calc.js';
import { validateCoef, form } from '../../assets/lab/core/coef.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/growth_sq03.json'), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const rel = (a, b) => Math.abs(a - b) / Math.max(Math.abs(b), 1e-12);
const worst = (a, b) => Math.max(...b.map((v, i) => rel(a[i], v)));

ok(G.FORM_IDS.join() === 'cr,schu,gomp,logi,mono,weib' && G.FORM_IDS.every(id => form('growth.' + id)), 'six forms, registered in the coefficient library');
/* 1. Fekedulegn et al. 1999: formulas reproduce Table 11 from the published estimates (2-decimal table, so |Δ| ≤ 0.005
   plus the rounding of the printed estimates). The monomolecular column deviates systematically by up to 0.011 m (the
   table was probably printed from another iteration); its formula rests on two sources (Fekedulegn; growthmodels). */
const K = R.fekedulegn, obs = K.t.map((t, i) => ({ t, y: K.y[i], row: i + 2 }));
for (const [id, pub] of Object.entries(K.published)) {
  const dev = K.t.map((t, i) => Math.abs(G.FORMS[id].f(pub, t) - K.table11[id][i]));
  const tol = id === 'mono' ? 0.011 : 0.006;
  ok(dev.every(d => d <= tol), `${id}: published estimates give the Table 11 predictions (|Δ| ≤ ${tol} m; worst ${Math.max(...dev).toFixed(4)})`);
}
/* 2. fits to the published data = scipy optimum */
for (const [id, ref] of Object.entries(K.fits)) {
  const r = G.fitGrowth(obs, id), w = r.status === 'ok' ? worst(r.theta, ref.params) : Infinity;
  ok(r.status === 'ok' && w <= 1e-6, `Fekedulegn data, ${id}: coefficients = SciPy (worst relative ${w.toExponential(2)})`);
  ok(r.status === 'ok' && rel(r.sse, ref.sse) <= 1e-9, `Fekedulegn data, ${id}: SSE = SciPy (${r.sse} vs ${ref.sse})`);
  const d = G.derived(id, ref.params, 64), rd = ref.derived;   // derived ages from the SciPy coefficients: the function alone is checked
  ok(id === 'mono' ? d.inflection === null : (rd.inflection == null ? d.inflection == null : rel(d.inflection, rd.inflection) <= 1e-7), `${id}: inflection age (${d.inflection}) = numerical (${rd.inflection})`);
  ok(rd.maiCulmination == null ? d.maiCulmination == null : rel(d.maiCulmination, rd.maiCulmination) <= 1e-7, `${id}: MAI culmination (${d.maiCulmination}) = numerical (${rd.maiCulmination})`);
}
{ const g = G.fitGrowth(obs, 'gomp'), pubSSE = K.t.reduce((s, t, i) => s + (K.y[i] - G.FORMS.gomp.f(K.published.gomp, t)) ** 2, 0);
  ok(g.sse < pubSSE, `Gompertz: the least-squares optimum (SSE ${g.sse.toFixed(5)}) is below the published estimates' SSE (${pubSSE.toFixed(5)}): the paper's fit stopped short`); }
/* 3. simulated series: every form against SciPy; derived ages */
for (const s of R.sims) {
  const o = s.t.map((t, i) => ({ t, y: s.y[i] })), r = G.fitGrowth(o, s.form), w = r.status === 'ok' ? worst(r.theta, s.params) : Infinity;
  ok(r.status === 'ok' && w <= 1e-6, `simulated ${s.form}: coefficients = SciPy (worst ${w.toExponential(2)})`);
  const tm = Math.max(...s.t), d = G.derived(s.form, s.params, tm), rd = s.derived;
  ok(s.form === 'mono' ? d.inflection === null : (rd.inflection == null ? d.inflection == null : rel(d.inflection, rd.inflection) <= 1e-7), `simulated ${s.form}: inflection age`);
  ok(rd.maiCulmination == null ? d.maiCulmination == null : rel(d.maiCulmination, rd.maiCulmination) <= 1e-7, `simulated ${s.form}: MAI culmination`);
  ok(r.seNote === 'independent-observations' && r.se && Object.values(r.se).every(v => v > 0) && Math.abs(r.rse - Math.sqrt(r.sse / (r.n - r.p))) < 1e-12, `simulated ${s.form}: SE labelled, RSE`);
  const c = G.curve(s.form, r.theta, 100, 1), F = G.FORMS[s.form], t0 = 37;
  ok(Math.abs(c[t0 - 1].cai - (F.f(r.theta, t0 + 1e-6) - F.f(r.theta, t0 - 1e-6)) / 2e-6) <= 1e-5 * Math.max(1, c[t0 - 1].cai) && Math.abs(c[t0 - 1].mai - c[t0 - 1].y / t0) < 1e-12, `simulated ${s.form}: CAI = dy/dt, MAI = y/t`);
}
/* 3b. MAI culmination is a maximum of MAI, never a minimum: Gompertz with y(0) > 0 (the page's sample fit) falls from
   +∞, has a minimum, then a maximum; and every reported culmination has MAI above its neighbours */
{ const th = [29.02995, 2.93288, 0.03814], F = G.FORMS.gomp, mai = t => F.f(th, t) / t, d = G.derived('gomp', th, 90);
  ok(d.maiCulmination != null && mai(d.maiCulmination) > mai(d.maiCulmination - 0.5) && mai(d.maiCulmination) > mai(d.maiCulmination + 0.5), `Gompertz with y(0) > 0: culmination at ${d.maiCulmination?.toFixed(2)} is a maximum of MAI`);
  ok(mai(17.3) < mai(16.8) || mai(17.3) < mai(17.8) ? Math.abs(d.maiCulmination - 17.3) > 1 : true, 'the minimum of MAI (about 17 years) is not reported as the culmination'); }
for (const s of [...R.sims, ...Object.entries(K.fits).map(([form, v]) => ({ form, params: v.params }))]) {
  const d = G.derived(s.form, s.params, 90), F = G.FORMS[s.form], mai = t => F.f(s.params, t) / t;
  if (d.maiCulmination != null) ok(mai(d.maiCulmination) >= mai(d.maiCulmination * 0.98) && mai(d.maiCulmination) >= mai(d.maiCulmination * 1.02), `${s.form}: reported MAI culmination is a local maximum`);
}
/* 4. data handling and sets */
ok(G.fitGrowth(obs.slice(0, 3), 'cr').status === 'invalid', 'too few observations: no fit');
{ const r = G.fitGrowth(obs, 'cr'), set = G.fitToSet(r, { citation: 'test', variable: 'H0', unit: 'm' });
  ok(set && validateCoef(set).length === 0 && set.origin === 'fitted', 'a fit becomes a valid fitted coefficient set');
  ok(validateCoef(G.fitToSet(r, {})).some(q => q.code === 'source.missing'), 'a fitted set needs a citation'); }
{ const tbl = { rows: [[{ t: 'n', v: 10 }, { t: 'n', v: 5 }], [{ t: 's', v: '0' }, { t: 'n', v: 1 }], [{ t: 's', v: 'x' }, { t: 'n', v: 1 }]], rowNumbers: [2, 3, 4] };
  const { parseNumber } = await import('../../assets/lab/core/num.js'), { cellText } = await import('../../assets/lab/core/table.js');
  const rd = G.readSeries(tbl, { t: 0, y: 1 }, '.', parseNumber, cellText);
  ok(rd.obs.length === 1 && rd.problems.some(q => q.code === 't.nonpos' && q.row === 3) && rd.problems.some(q => q.code === 'cell.bad' && q.row === 4), 'reading: age ≤ 0 and unreadable cells reported with their rows'); }
console.log(`growth SQ-03: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
