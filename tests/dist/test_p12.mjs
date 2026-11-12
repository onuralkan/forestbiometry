// Diameter distribution engine, stage P12: diameter classes, class tables and grouped-data maximum likelihood.
//   node tests/dist/test_p12.mjs
// Reference: tests/ref/dist_p12.json (tests/ref/make_dist_p12.py: scipy.stats cdf differences; grouped likelihood
// maximised with Nelder–Mead + Powell) and hand-computed probabilities and likelihoods below.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as D from '../../assets/lab/dist/index.js';
import * as C from '../../assets/lab/dist/classes.js';
import { groupedLogLik, checkGrouped } from '../../assets/lab/dist/fit/grouped.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-12) => ok(Number.isFinite(a) && Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1), `${m}: got ${a} expected ${b}`);
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/dist_p12.json'), 'utf8'));
const W = D.family('weibull'), wp = { a: 0, b: 20, c: 2.5 };
const edges = R.edges.map(e => e ?? Infinity), CL = C.makeClasses({ edges });

/* 1. registry */
eq(D.methodsFor({ dataType: 'classes' }).filter(m => !m.optional).map(m => m.id).sort(), ['beta', 'exponential', 'gamma', 'johnsonsb', 'loglogistic', 'lognormal', 'normal', 'weibull'].map(f => f + '.gml').sort(), 'grouped ML for every family, data type "classes" only');
ok(D.methodsFor({ dataType: 'classes' }).every(m => m.grouped && m.estimator === 'ml' && !m.dataTypes.includes('raw')), 'grouped methods are not offered for raw data');
ok(D.methodsFor({ dataType: 'raw' }).every(m => !m.dataTypes.includes('classes')), 'raw-data methods are not offered for classes (no mid-point replication)');

/* 2. hand-computed probabilities and likelihood: Weibull(0, 20, 2.5), classes [0, 10), [10, 20), [20, ∞), counts 3, 5, 2 */
{ const F = x => 1 - Math.exp(-((x / 20) ** 2.5)), hp = [F(10), F(20) - F(10), 1 - F(20)], cl = C.makeClasses({ edges: [0, 10, 20, Infinity] });
  const t = C.classTable(W, wp, cl, [3, 5, 2], { n: 10 });
  t.rows.forEach((r, j) => near(r.prob, hp[j], `hand: p${j + 1} = F(hi) − F(lo)`, 1e-14));
  near(t.totalProb, 1, 'hand: classes cover the support → total probability 1', 1e-15); near(t.rows.reduce((s, r) => s + r.exp, 0), 10, 'hand: expected total = n', 1e-14);
  near(groupedLogLik(W, wp, cl.map((c, j) => ({ ...c })), [3, 5, 2]), 3 * Math.log(hp[0]) + 5 * Math.log(hp[1]) + 2 * Math.log(hp[2]), 'hand: ln L = Σ n_j ln p_j', 1e-14);
  // unequal widths: [10, 12) and [10, 14) are exact CDF differences, no "+1" correction
  const t2 = C.classTable(W, wp, C.makeClasses({ edges: [10, 12, 14] }), [0, 0], { n: 1 });
  near(t2.rows[0].prob, F(12) - F(10), 'width 2: p = F(12) − F(10)', 1e-13); near(t2.rows[0].prob + t2.rows[1].prob, F(14) - F(10), 'two classes add up to the merged class', 1e-13);
  const merged = C.classTable(W, wp, C.makeClasses({ edges: [10, 14] }), [0], { n: 1 }); near(merged.rows[0].prob, F(14) - F(10), 'width 4: no width-dependent constant', 1e-13); }

/* 3. class probabilities against SciPy (unequal widths, open last class) */
for (const t of R.tables) {
  const fam = D.family(t.family), tab = C.classTable(fam, t.params, CL, CL.map(() => 0), { n: 500, perHa: 25 });
  t.probs.forEach((p, j) => near(tab.rows[j].prob, p, `${t.family}: p of [${CL[j].lo}, ${CL[j].hi}) = SciPy`, 1e-11));
  near(tab.lower.prob, t.below, `${t.family}: P(D < ${CL[0].lo}) = SciPy`, 1e-11); eq(tab.upper.prob, 0, `${t.family}: open last class → no upper tail`);
  near(tab.totalProb, 1, `${t.family}: total probability 1 (support covered with the lower tail)`, 1e-12);
  near(tab.rows.reduce((s, r) => s + r.expHa, 0) + tab.lower.expHa, 500 * 25, `${t.family}: expected N/ha adds up to N`, 1e-11);
}
{ const g = R.gapcase, cl = g.edges.map(([lo, hi]) => ({ lo, hi })), tab = C.classTable(W, wp, cl, [0, 0, 0, 0], { n: 1 });
  g.probs.forEach((p, j) => near(tab.rows[j].prob, p, `gap case p${j + 1}`, 1e-12));
  near(tab.gaps.prob, g.gap, 'probability in the gap [12, 16) computed from its own CDF difference', 1e-12); near(tab.upper.prob, g.above, 'upper tail above a closed last class', 1e-12);
  near(tab.totalProb, 1, 'classes + gap + tails = 1', 1e-13);
  const rc = C.countRaw(cl, [3, 5, 9, 13, 15, 17, 25, 30, 31]); eq([rc.counts, rc.below, rc.gap, rc.above], [[1, 1, 1, 1], 1, 2, 2], 'raw counts: below, in classes, in the gap, above (30 is above [20, 30))'); }

/* 4. grouped ML against SciPy */
const byFam = {};
for (const c of R.cases) {
  const cls = CL.map((k, j) => ({ ...k, n: c.n[j] })), o = { ...(c.family === 'beta' ? { L: 0, U: 80 } : {}), ...(c.family === 'johnsonsb' ? { xi: 0, lambda: 80 } : {}) };
  const r = D.runMethod(c.family + '.gml', { type: 'classes', classes: cls, countType: c.perha ? 'perha' : 'count', outside: c.outside }, o), tag = `${c.family} ${c.outside}${c.perha ? ' per ha' : ''}`;
  ok(r.status === 'ok', `${tag}: converged (${r.status})`); if (r.status !== 'ok') continue;
  for (const k of Object.keys(c.params)) near(r.params[k], c.params[k], `${tag} ${k} = SciPy`, 5e-6);
  const wll = groupedLogLik(D.family(c.family), r.params, cls, c.n, c.outside);
  ok(wll >= c.logLik - 1e-7 * Math.abs(c.logLik), `${tag}: Σ n ln p not below SciPy's optimum`);
  if (c.perha) { ok(r.logLik === null && r.data.n === null && r.warnings.some(w => w.code === 'grp.perha'), `${tag}: expanded frequencies → no ln L and no n`);
    const base = byFam[c.family]; for (const k of Object.keys(c.params)) near(r.params[k], base.params[k], `${tag}: ${k} the same as with the counts (scale-free)`, 2e-6); }
  else { near(r.logLik, c.logLik, `${tag}: ln L`, 1e-8); ok(r.data.n === c.n.reduce((a, b) => a + b, 0), `${tag}: n = Σ n_j`); if (c.outside === 'zero') byFam[c.family] = r; }
}
{ // mid-point replication is a different estimate (only the start)
  const c = R.cases.find(x => x.family === 'weibull' && x.outside === 'zero' && !x.perha), cls = CL.map((k, j) => ({ ...k, n: c.n[j] }));
  const mids = []; cls.forEach((k, j) => { const w = k.hi === Infinity ? cls[j - 1].hi - cls[j - 1].lo : k.hi - k.lo; for (let i = 0; i < k.n; i++) mids.push(k.lo + w / 2); });
  const mp = D.runMethod('weibull.ml', { d: mids }), g = D.runMethod('weibull.gml', { type: 'classes', classes: cls, countType: 'count', outside: 'zero' }, { a: 0 });
  ok(Math.abs(mp.params.c / g.params.c - 1) > 1e-3, `mid-point replication (c = ${mp.params.c.toFixed(4)}) is not the grouped ML (c = ${g.params.c.toFixed(4)})`);
  ok(g.convergence.start.includes('start only'), 'mid-points recorded as the start only');
  // AIC from grouped ln L with k free parameters and n = Σ n_j
  const a = D.gof.aicBic(g.logLik, g.free.length, g.data.n); near(a.aic, 4 - 2 * g.logLik, 'grouped AIC = 2k − 2 ln L', 1e-14); }

/* 5. checks */
eq(C.checkClasses([{ lo: 0, hi: 10 }, { lo: 8, hi: 20 }])[0].code, 'cls.overlap', 'overlapping classes refused');
eq(C.checkClasses([{ lo: 0, hi: Infinity }, { lo: 10, hi: 20 }])[0].code, 'cls.open', 'open class only last');
eq(C.checkClasses([{ lo: 10, hi: 10 }])[0].code, 'cls.bad', 'empty class refused');
eq(checkGrouped([{ lo: 0, hi: 10, n: 2.5 }, { lo: 10, hi: 20, n: 3 }], 'count')[0].code, 'grp.notint', 'tree counts must be integers');
eq(checkGrouped([{ lo: 0, hi: 10, n: 2.5 }, { lo: 10, hi: 20, n: 3 }], 'perha'), [], 'expanded frequencies may be fractional');
eq(checkGrouped([{ lo: 0, hi: 10, n: -1 }, { lo: 10, hi: 20, n: 3 }], 'count')[0].code, 'grp.freq', 'negative frequency refused');
eq(checkGrouped([{ lo: 0, hi: 10, n: 0 }, { lo: 10, hi: 20, n: 3 }], 'count')[0].code, 'grp.few', 'one occupied class is not enough');
{ const r = D.runMethod('weibull.gml', { type: 'classes', classes: [{ lo: 0, hi: 10, n: 4 }, { lo: 8, hi: 20, n: 3 }], countType: 'count' }, { a: 0 }); ok(r.status === 'invalid' && r.params === null && r.problems[0].code === 'cls.overlap', 'grouped fit: invalid classes → no parameters'); }
{ const zero = CL.map((k, j) => ({ ...k, n: j === 3 ? 0 : 10 + j })), r = D.runMethod('gamma.gml', { type: 'classes', classes: zero, countType: 'count', outside: 'zero' });
  ok(r.status === 'ok' && r.settings.outside === 'zero', 'a measured class with zero trees is kept as a class (contributes its probability through the others)'); }
eq(C.makeClasses({ start: 4, width: 4, max: 15 }), [{ lo: 4, hi: 8 }, { lo: 8, hi: 12 }, { lo: 12, hi: 16 }], 'classes from start and width up to the maximum (15 inside the last class)');
ok(C.makeClasses({ start: 4, width: 4, max: 15, openLast: true })[2].hi === Infinity, 'open last class on request');
eq(C.makeClasses({ start: 4, width: 4, max: 15, openLast: true }).length, 3, 'class count');

console.log(`dist P12: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
