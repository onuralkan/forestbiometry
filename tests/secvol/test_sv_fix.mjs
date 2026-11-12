// Stem Section Volume: cut height in the 'ends'/'triples' layouts (no double stump), Hohenadl form quotients after
// Heger (1965), merchantable volume refused for Hohenadl, per-hectare totals (plotTotals, plotAreas).
//   node tests/secvol/test_sv_fix.mjs
// References: hand-computed values (cylinders and frusta written out below) and Heger (1965), Figure 1
// (η = .333, .577, .745, .882, 1.000 → λ0.9 = .555).
import * as V from '../../assets/lab/secvol/calc.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-12) => ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${m}: got ${a} expected ${b}`);
const g = d => Math.PI / 4 * (d / 100) ** 2;
const tree = (pts, o = {}) => ({ plot_id: 'P', tree_id: 't', period: null, state: 'ok', dbh: 30, height: 12, stump_h: 0.3, points: pts.map(([h, d], i) => ({ h, d, d_ib: null, kind: null, row: i + 2 })), ...o });

/* 1. 'ends' with a point at the ground and at the cut height: the 0–0.3 m piece is the stump only */
{ const t = tree([[0, 40], [0.3, 36], [2.3, 30], [6.3, 22]], { height: 10 });
  const off = V.treeVolume(t, { method: 'smalian', layout: 'ends', includeStump: false }).ob, on = V.treeVolume(t, { method: 'smalian', layout: 'ends', includeStump: true }).ob;
  const stem = (g(36) + g(30)) / 2 * 2 + (g(30) + g(22)) / 2 * 4, top = g(22) * 3.7 / 3, stump = g(36) * 0.3;
  near(off.stem, stem, 'sections start at the cut height (0.3 m), not at the ground');
  near(off.total, stem + top, 'stump excluded: total = sections + top (cut to tip)'); near(on.total, stem + top + stump, 'stump included once: + cylinder with the cut diameter');
  ok(off.warnings.some(w => w.code === 'base.split' && w.n === 1) && off.sections.filter(q => q.kind === 'section')[0].lo === 0.3, 'the point below the cut is reported and not used for sections'); }
/* 2. no point at the cut height, sections start below it: reported, no stump */
{ const r = V.treeVolume(tree([[0, 40], [2.3, 30], [6.3, 22]], { height: 10 }), { method: 'smalian', layout: 'ends', includeStump: true }).ob;
  ok(r.stump === null && r.warnings.some(w => w.code === 'base.below' && w.first === 0 && w.cut === 0.3), 'no diameter at the cut: stump not separated, start below the cut reported'); }
/* 3. points starting at the cut height: unchanged behaviour */
{ const r = V.treeVolume(tree([[0.3, 36], [2.3, 30], [6.3, 22]], { height: 10 }), { method: 'smalian', layout: 'ends' }).ob;
  ok(!r.warnings.some(w => /^base\./.test(w.code)), 'data starting at the cut: no warning'); }

/* 4. Hohenadl: λ0.9 = 0.2 Σ η², V = (π/4) d0.9² H λ0.9; Heger's Figure 1 series */
{ const eta = [1, 0.882, 0.745, 0.577, 0.333], d09 = 30, H = 20;                     // from the base: 0.1H (= d0.9 from the apex) … 0.9H
  const t = tree(eta.map((e, i) => [(0.1 + 0.2 * i) * H, d09 * e]), { height: H, stump_h: null });
  const r = V.treeVolume(t, { method: 'hohenadl', dTop: 12 }).ob;
  near(r.formQuotients.lambda09, 0.2 * eta.reduce((a, x) => a + x * x, 0), 'λ0.9 = 0.2 Σ η²');
  ok(Math.abs(r.formQuotients.lambda09 - 0.555) < 5e-4, `Heger (1965) Figure 1: λ0.9 = .555 (got ${r.formQuotients.lambda09.toFixed(4)})`);
  near(r.total, Math.PI / 4 * (d09 / 100) ** 2 * H * r.formQuotients.lambda09, 'V = (π/4) d0.9² H λ0.9 (Heger 1965) = (π/4)·0.2H·Σ d²');
  ok(r.merch && r.merch.status === 'invalid' && r.merch.code === 'merch.hoh', 'a top diameter with Hohenadl: refused with a reason, not a silent blank'); }

/* 5. per-hectare totals */
{ const res = (plot, per, v, st = 'ok') => ({ tree: { plot_id: plot, tree_id: 'x', period: per }, status: st, ob: st === 'ok' ? { status: 'ok', total: v, label: 'to-top' } : null, ib: null });
  const R = [res('A', null, 0.5), res('A', null, 0.25), res('B', null, 0.4), res('B', null, null, 'invalid')];
  const area = { A: 400, B: 500, C: 250, D: 300 }, un = { A: 0, B: 1, C: 3, D: 0 };
  const T = V.plotTotals(R, p => area[p], p => un[p], [{ plot_id: 'A', period: null }, { plot_id: 'C', period: null }, { plot_id: 'D', period: null }]);
  const by = Object.fromEntries(T.map(x => [x.plot_id, x]));
  near(by.A.obHa, 0.75 * 25, 'A: Σ V × 10000/400 = 18.75 m³/ha'); ok(by.A.status === 'ok' && by.A.nComputed === 2, 'A: complete');
  near(by.B.ob, 0.4, 'B: only the computed tree is summed'); ok(by.B.status === 'partial' && by.B.nFailed === 1 && by.B.unmeasured === 1, 'B: failed and unmeasured trees counted, never filled in');
  ok(by.C && by.C.nTrees === 0 && by.C.unmeasured === 3 && by.C.obHa === null && by.C.status === 'partial', 'C: plot of the tree list without stem measurements listed, volume not given');
  ok(by.D && by.D.ob === 0 && by.D.obHa === 0 && by.D.status === 'ok', 'D: plot without trees: zero volume');
  ok(T.map(x => x.plot_id).join() === 'A,B,C,D', 'order: measured plots first, then the others of the tree list'); }
{ const cell = v => v == null ? null : { t: typeof v === 'number' ? 'n' : 's', v };
  const tbl = { rows: [['A', 400], ['A', 400], ['B', '500,5'], ['C', -3], ['D', 300], ['D', 320]].map(r => r.map(cell)), rowNumbers: [2, 3, 4, 5, 6, 7] };
  const r = V.plotAreas(tbl, 0, 1, ',');
  ok(r.areaOf('A') === 400 && r.areaOf('B') === 500.5, 'plot sizes read once per plot (decimal comma)');
  ok(r.areaOf('C') === null && r.problems.some(p => p.code === 'area.bad' && p.row === 5), 'non-positive size: error with its row, no size');
  ok(r.areaOf('D') === null && r.problems.some(p => p.code === 'area.conflict' && p.row === 7), 'conflicting sizes: error, no size (never the first value)'); }

console.log(`secvol fixes: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
