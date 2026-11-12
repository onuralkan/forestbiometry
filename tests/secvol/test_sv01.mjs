// Stem section volume, stage SV01: Huber, Smalian, Newton, Hohenadl; layouts; stump; top solid; merchantable volume.
//   node tests/secvol/test_sv01.mjs
// Reference: tests/ref/secvol_sv01.json (tests/ref/make_secvol_sv01.py: scipy.integrate.quad on geometric solids,
// separately written section sums on random trees, brentq/quad in the top piece). TOOLS_SPEC §8.1 values are also
// checked as printed.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as V from '../../assets/lab/secvol/calc.js';
import { readStems } from '../../assets/lab/core/stems.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-12) => ok(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol * Math.max(Math.abs(b), 1e-300), `${m}: got ${a} expected ${b}`);
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/secvol_sv01.json'), 'utf8'));
/** A stem-sections/1 tree record (as readStems builds it). */
const tree = (hs, ds, o = {}) => ({ tree_id: '1', plot_id: 'P', period: null, state: 'ok', height: o.H ?? null, stump_h: o.stump ?? null, dbh: o.dbh ?? null,
  points: hs.map((h, i) => ({ row: i + 2, h, d: o.ib ? null : ds[i], d_ib: o.dib ? o.dib[i] : o.ib ? ds[i] : null, bark: o.ib ? 'ib' : 'ob', kind: (o.kinds || [])[i] ?? null })) });
const vol = (t, s) => V.treeVolume(t, s);
const codes = r => [...r.problems, ...(r.ob ? r.ob.problems : [])].map(p => p.code);

/* 1. TOOLS_SPEC §8.1: solids with base diameter 30 cm, length 20 m */
const SPEC81 = { paraboloid: [0.706858347058, 0.706858347058, 0.706858347058, 0.706858347058, 0.706858347058, 0.706858347058], cone: [0.471238898038, 0.353429173529, 0.706858347058, 0.471238898038, 0.463875790257, 0.485965113602], neiloid: [0.353429173529, 0.176714586764, 0.706858347058, 0.353429173529, 0.342384511856, 0.375518496874] };
for (const s of R.solids) {
  const d = h => s.d_at[String(h)], t = s.name, H = 20;
  const h1 = vol(tree([10], [d(10)], { H, stump: 0 }), { method: 'huber', layout: 'mids' }).ob.total;
  const s1 = vol(tree([0, 20], [d(0), 0], { H, stump: 0 }), { method: 'smalian', layout: 'ends' }).ob.total;
  const n1 = vol(tree([0, 10, 20], [d(0), d(10), 0], { H, stump: 0 }), { method: 'newton', layout: 'triples' }).ob.total;
  const h4 = vol(tree([2.5, 7.5, 12.5, 17.5], [2.5, 7.5, 12.5, 17.5].map(d), { H, stump: 0 }), { method: 'huber', layout: 'mids' }).ob.total;
  const s4 = vol(tree([0, 5, 10, 15, 20], [d(0), d(5), d(10), d(15), 0], { H, stump: 0 }), { method: 'smalian', layout: 'ends' }).ob.total;
  const n4 = vol(tree([0, 2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20], [0, 2.5, 5, 7.5, 10, 12.5, 15, 17.5].map(d).concat([0]), { H, stump: 0 }), { method: 'newton', layout: 'triples' }).ob.total;
  const ho = vol(tree([2, 6, 10, 14, 18], [2, 6, 10, 14, 18].map(d), { H }), { method: 'hohenadl' }).ob;
  near(h1, s.huber1, `${t} Huber, one section = SciPy`); near(s1, s.smalian1, `${t} Smalian, one section`); near(n1, s.newton1, `${t} Newton, one section`);
  near(h4, s.huber4, `${t} Huber, four sections`); near(s4, s.smalian4, `${t} Smalian, four sections`); near(n4, s.newton4, `${t} Newton, four sections`);
  near(ho.total, s.hohenadl, `${t} Hohenadl`); eq(ho.label, 'ground-to-top', `${t} Hohenadl covers ground to top`);
  [s.exact, h1, s1, n1, h4, s4].forEach((v, i) => near(v, SPEC81[t][i], `${t} §8.1 column ${i}`, 1e-11));
  near(n1, s.exact, `${t}: Newton exact (area polynomial of degree ≤ 3)`, 1e-12); near(n4, s.exact, `${t}: Newton exact with four sections`, 1e-12);
  if (t === 'paraboloid') { near(h1, s.exact, 'paraboloid: Huber exact'); near(s1, s.exact, 'paraboloid: Smalian exact'); }
  else ok(h4 < s.exact && s4 > s.exact && h1 < h4 && s1 > s4, `${t}: Huber below, Smalian above, both closer with more sections`);
  // top solid of the right shape from 10 m reproduces the exact remainder; merchantable to 7 cm inside the top piece
  const tt = vol(tree([0, 10], [d(0), d(10)], { H, stump: 0 }), { method: 'smalian', layout: 'ends', top: t, dTop: 7 }).ob;
  near(tt.top, s.top_from10, `${t}: top piece as a ${t} = quad of the area from 10 m`, 1e-12);
  near(tt.merch.h, s.merch7_top.h, `${t}: height of 7 cm in the top piece = brentq on the profile`, 1e-12);
  near(tt.merch.volume - tt.stem, s.merch7_top.vtop, `${t}: merchantable part of the top piece = quad`, 1e-11);
  eq(tt.merch.rule, 'top-solid', `${t}: rule recorded`);
}
near(V.solidVolume(V.ba(30), 20, 2), Math.PI / 4 * 0.09 * 20 / 3, 'cone gL/3'); near(V.solidVolume(V.ba(30), 20, 1), Math.PI / 4 * 0.09 * 10, 'paraboloid gL/2'); near(V.solidVolume(V.ba(30), 20, 3), Math.PI / 4 * 0.09 * 5, 'neiloid gL/4');

/* 2. random trees: unequal sections, three layouts, stump, top, merchantable */
for (const [k, t] of R.trees.entries()) {
  const de = t.trip_d.filter((_, i) => i % 2 === 0), dm = t.trip_d.filter((_, i) => i % 2 === 1), tag = `tree ${k}`;
  const ends = tree(t.ends, de, { H: t.H, stump: t.stump });
  const sm = vol(ends, { method: 'smalian', layout: 'ends' });
  ok(sm.status === 'ok' && sm.ob.label === 'to-top', `${tag} Smalian ok`);
  near(sm.ob.stem, t.smalian, `${tag} Smalian on unequal sections`, 1e-12);
  near(sm.ob.stump, t.stump_v, `${tag} stump cylinder`, 1e-12);
  near(sm.ob.top, t.tops.cone, `${tag} top cone (default)`, 1e-12);
  near(sm.ob.total, t.smalian + t.tops.cone, `${tag} total without stump (default)`, 1e-12);
  near(vol(ends, { method: 'smalian', layout: 'ends', includeStump: true, top: 'neiloid' }).ob.total, t.smalian + t.tops.neiloid + t.stump_v, `${tag} with stump, neiloid top`, 1e-12);
  near(vol(ends, { method: 'smalian', layout: 'ends', top: 'paraboloid' }).ob.top, t.tops.paraboloid, `${tag} paraboloid top`, 1e-12);
  const mids = tree([...t.mids, t.ends[t.ends.length - 1]], [...dm, de[de.length - 1]], { H: t.H, stump: t.stump, kinds: [...t.mids.map(() => null), 'top'] });
  const hu = vol(mids, { method: 'huber', layout: 'mids' });
  ok(hu.status === 'ok', `${tag} Huber (middles) ok: ${JSON.stringify(codes(hu))}`);
  near(hu.ob.stem, t.huber, `${tag} Huber, boundaries derived from the cut height`, 1e-10);
  hu.ob.sections.filter(q => q.kind === 'section').forEach((q, i) => near(q.hi, t.ends[i + 1], `${tag} derived boundary ${i + 1}`, 1e-10));
  near(hu.ob.top, t.tops.cone, `${tag} Huber: top from the 'top' point at the last boundary`, 1e-9);
  const tr = tree(t.trip_h, t.trip_d, { H: t.H, stump: t.stump });
  near(vol(tr, { method: 'newton', layout: 'triples' }).ob.stem, t.newton, `${tag} Newton`, 1e-12);
  near(vol(tr, { method: 'huber', layout: 'triples' }).ob.stem, t.huber, `${tag} Huber from triples = Huber from middles`, 1e-12);
  near(vol(tr, { method: 'smalian', layout: 'triples' }).ob.stem, t.smalian, `${tag} Smalian from triples = Smalian from ends`, 1e-12);
  if (t.merch) {
    const m = vol(ends, { method: 'smalian', layout: 'ends', dTop: t.merch.dTop }).ob.merch;
    near(m.h, t.merch.h, `${tag} height of dTop = ${t.merch.dTop} cm (linear interpolation)`, 1e-12);
    near(m.volume, t.merch.smalian, `${tag} merchantable volume (Smalian)`, 1e-12);
    ok(m.volume < sm.ob.stem + 1e-15, `${tag} merchantable ≤ stem`);
  }
}

/* 3. bark: over and under bark separately; never mixed */
{ const t = tree([0.3, 1.3, 5.3, 9.3], [30, 26, 22, 17], { H: 18, stump: 0.3, dib: [28, 24.4, 20.6, 15.8] });
  const r = vol(t, { method: 'smalian', layout: 'ends' });
  ok(r.ob && r.ib && r.ib.total < r.ob.total && r.warnings.length === 0, 'over and under bark computed separately');
  near(r.ib.stem, [[28, 24.4, 1], [24.4, 20.6, 4], [20.6, 15.8, 4]].reduce((a, [x, y, L]) => a + (V.ba(x) + V.ba(y)) / 2 * L, 0), 'under-bark Smalian by hand');
  const o = vol(tree([0.3, 1.3, 5.3], [30, 26, 22], { H: 18 }), { method: 'smalian', layout: 'ends' });
  ok(o.ob && o.ib === null && o.warnings.some(w => w.code === 'ib.none'), 'no under-bark diameters: no under-bark volume (not guessed)');
  const i = vol(tree([0.3, 1.3, 5.3], [30, 26, 22], { H: 18, ib: true }), { method: 'smalian', layout: 'ends' });
  ok(i.ob === null && i.ib && i.ib.status === 'ok' && i.formFactor === null, 'under-bark-only table: no over-bark volume, no form factor'); }

/* 4. form factor f1.3 = V/(g1.3·H), with the volume definition recorded */
{ const t = tree([0.3, 1.3, 5.3, 9.3, 13.3], [30, 26, 22, 17, 12], { H: 18, stump: 0.3, dbh: 26 });
  const r = vol(t, { method: 'smalian', layout: 'ends' });
  near(r.formFactor.value, r.ob.total / (V.ba(26) * 18), 'form factor'); eq([r.formFactor.volume, r.formFactor.def], ['from-cut', 'f1.3 = V / (g1.3 · H)'], 'form factor definition recorded');
  eq(vol(t, { method: 'smalian', layout: 'ends', includeStump: true }).formFactor.volume, 'stump-included', 'stump included in the form factor volume when chosen');
  ok(vol(tree([0.3, 1.3, 5.3], [30, 26, 22], { dbh: 26 }), { method: 'smalian', layout: 'ends' }).formFactor === null, 'no total height: no form factor'); }

/* 5. labels and states: never a number that looks complete when it is not */
{ const r = vol(tree([0.3, 1.3, 5.3], [30, 26, 22], { stump: 0.3 }), { method: 'smalian', layout: 'ends' });
  ok(r.status === 'ok' && r.ob.label === 'to-last-boundary' && r.ob.top === null && r.ob.warnings.some(w => w.code === 'top.noh'), 'no total height: volume to the last boundary, labelled'); }
{ const r = vol(tree([0.3, 1.3, 5.3], [30, 26, 22], { H: 18 }), { method: 'smalian', layout: 'ends' });
  ok(r.ob.stump === null && r.ob.warnings.some(w => w.code === 'stump.noh'), 'no cut height: no stump row, warned'); }
{ const r = vol(tree([1.3, 5.3], [26, 22], { H: 18, stump: 0.3 }), { method: 'smalian', layout: 'ends' });
  ok(r.ob.warnings.some(w => w.code === 'gap.base' && w.from === 0.3 && w.to === 1.3) && r.ob.warnings.some(w => w.code === 'stump.nod'), 'first point above the cut: gap and missing stump diameter reported, not filled'); }
{ const r = vol(tree([5, 9], [26, 22], { H: 18, stump: 0.3 }), { method: 'huber', layout: 'mids' });
  ok(r.status === 'invalid' && codes(r).includes('mids.order'), 'middles that do not fit the derived boundaries: refused'); }
{ const r = vol(tree([1, 3, 5], [26, 24, 22], { H: 18, stump: 0 }), { method: 'huber', layout: 'mids' });
  ok(r.ob.label === 'to-last-boundary' && r.ob.warnings.some(w => w.code === 'top.nod'), 'middles layout without a diameter at the last boundary: no top piece'); }
{ const r = vol(tree([1, 3, 5], [26, 24, 22], { H: 18 }), { method: 'huber', layout: 'mids' }); ok(codes(r).includes('mids.nostump'), 'middles layout needs the cut height'); }
{ const r = vol(tree([1, 3, 5, 15], [26, 24, 22, 10], { H: 18, stump: 0 }), { method: 'huber', layout: 'mids' }); ok(codes(r).includes('mids.beyondtop'), 'derived boundary above the total height'); }
{ const r = vol(tree([0, 2, 4, 6], [30, 28, 26, 24], { H: 18 }), { method: 'newton', layout: 'triples' }); ok(codes(r).includes('triples.count'), 'triples need an odd number of points'); }
{ const r = vol(tree([0, 1.5, 4], [30, 28, 26], { H: 18 }), { method: 'newton', layout: 'triples' }); ok(codes(r).includes('triples.mid'), 'middle point not at the middle (tolerance 0.01 m)');
  ok(vol(tree([0, 1.5, 4], [30, 28, 26], { H: 18 }), { method: 'newton', layout: 'triples', midTol: 0.6 }).status === 'ok', 'tolerance is a setting'); }
{ const r = vol(tree([2, 6, 10, 14], [27, 23, 19, 14], { H: 20 }), { method: 'hohenadl' }); ok(codes(r).includes('hoh.missing') && r.ob.problems.find(p => p.code === 'hoh.missing').at === 0.9, 'Hohenadl without the 0.9H point'); }
{ const r = vol(tree([2, 6, 10, 14, 18], [27, 23, 19, 14, 7]), { method: 'hohenadl' }); ok(codes(r).includes('hoh.noh'), 'Hohenadl needs the total height'); }
{ const r = vol(tree([2.03, 6, 10, 14, 18], [27, 23, 19, 14, 7], { H: 20 }), { method: 'hohenadl' }); ok(r.status === 'ok' && r.ob.sections[0].hMeasured === 2.03, 'Hohenadl within 0.05 m tolerance; measured height recorded'); }
for (const [s, code] of [[{ method: 'newton', layout: 'ends' }, 'layout.method'], [{ method: 'huber', layout: 'ends' }, 'layout.method'], [{ method: 'smalian', layout: 'mids' }, 'layout.method'], [{ method: 'x' }, 'method.bad'], [{ top: 'cylinder' }, 'top.bad'], [{ dTop: 0 }, 'dtop.bad']])
  ok(vol(tree([0, 5], [30, 25], { H: 18 }), s).problems.some(p => p.code === code), `setting refused: ${JSON.stringify(s)} → ${code}`);
{ const t = tree([0, 5], [30, 25], { H: 18 }); t.state = 'error'; const r = vol(t, {}); ok(r.status === 'invalid' && r.problems[0].code === 'tree.error' && r.ob === null, 'tree with data errors is not computed'); }
{ const r = vol(tree([0.3, 5.3, 9.3], [30, 22, 17], { H: 18 }), { method: 'smalian', layout: 'ends', dTop: 35 }); ok(r.ob.merch.volume === 0 && r.ob.merch.note === 'below-at-base', 'top diameter larger than the base: no merchantable volume'); }
{ const r = vol(tree([0.3, 5.3, 9.3], [30, 22, 17]), { method: 'smalian', layout: 'ends', dTop: 7 }); ok(r.ob.merch.status === 'invalid' && r.ob.merch.code === 'merch.notop', 'dTop beyond the measured stem without a top piece: not computed'); }
{ const r = vol(tree([0.3, 5.3, 8.3], [30, 22, 17], { H: 12 }), { method: 'smalian', layout: 'ends', top: 'cone' }); ok(r.status === 'ok' && r.ob.top > 0, 'top piece above 8.3 m'); const s = vol(tree([0.3, 5.3, 13], [30, 22, 17], { H: 12 }), { method: 'smalian', layout: 'ends' }); ok(codes(s).includes('top.below'), 'measurement above the total height: refused'); }

/* 6. through the stem table reader */
{ const cell = v => typeof v === 'number' ? { t: 'n', v, w: String(v) } : { t: 's', v };
  const rows = [['A', '1', 0.3, 31, 18, 0.3], ['A', '1', 1.3, 28, 18, 0.3], ['A', '1', 5.3, 23.5, 18, 0.3], ['A', '1', 9.3, 18, 18, 0.3], ['A', '2', 0.3, 25, 15, 0.3], ['A', '2', 4.3, 18, 15, 0.3], ['A', '3', 1.3, 20, 14, 0.3]];
  const st = readStems({ headers: [], rows: rows.map(r => r.map(cell)), rowNumbers: rows.map((_, i) => i + 2) }, { plot: 0, tree: 1, h: 2, d: 3, height: 4, stump_h: 5 }, { decimal: '.' });
  const all = V.allTrees(st, { method: 'smalian', layout: 'ends' });
  ok(all.length === 3 && all[0].status === 'ok' && all[1].status === 'ok' && all[2].status === 'invalid' && all[2].problems[0].code === 'tree.error', 'all trees: single-point tree not computed');
  near(all[0].ob.total, (V.ba(31) + V.ba(28)) / 2 + (V.ba(28) + V.ba(23.5)) / 2 * 4 + (V.ba(23.5) + V.ba(18)) / 2 * 4 + V.ba(18) * 8.7 / 3, 'tree 1 by hand: Smalian + cone');
  eq(all[0].tree, { plot_id: 'A', tree_id: '1', period: null }, 'tree ids in the result'); }
eq(V.TOOL, { id: 'seksiyon-hacmi', version: '1.0.0-beta.1' }, 'tool id and version (K4)');

console.log(`secvol SV01: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
