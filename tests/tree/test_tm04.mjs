// Crown metrics (TM-04/a1): assets/lab/tree/crown.js against tests/ref/crown_tm04.json (tests/ref/make_crown_tm04.py:
// surfaces and volumes of revolution by numerical integration, mpmath), plus hand cases.
//   node tests/tree/test_tm04.mjs
import { readFile } from 'node:fs/promises';
import * as C from '../../assets/lab/tree/crown.js';

const R = JSON.parse(await readFile(new URL('../ref/crown_tm04.json', import.meta.url), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const rel = (a, b, t = 1e-11) => Number.isFinite(a) && Math.abs(a - b) <= t * Math.max(1, Math.abs(b));

for (const [i, s] of R.solids.entries()) {
  const r = C.crownSolid(s.shape, s.W, s.L);
  ok(r.status === 'ok' && rel(r.V, s.V, 1e-11) && rel(r.S, s.S, 1e-9), `solid ${i} (${s.shape}, W ${s.W.toFixed(2)}, L ${s.L.toFixed(2)}): volume and lateral surface = numerical integration`);
}
for (const [i, s] of R.radii.entries()) {
  const r = C.crownFromRadii(s.r);
  ok(r.status === 'ok' && r.n === s.r.length && rel(r.rMean, s.mean) && rel(r.width, 2 * s.mean) && rel(r.rq, s.rq) && rel(r.area, s.area) && (s.r.length < 4) === (r.warnings.length === 1), `radii ${i} (n ${s.r.length}): mean, width, quadratic mean radius, equivalent-circle area; warning below 4 radii`);
}
for (const [i, s] of R.diams.entries()) {
  const r = C.crownFromDiameters(s.d1, s.d2);
  ok(r.status === 'ok' && rel(r.areaCircle, s.circle) && rel(r.areaEllipse, s.ellipse, 1e-10), `diameters ${i}: circle of the mean diameter and ellipse (numerical area)`);
}
for (const [i, s] of R.covers.entries()) {
  const r = C.crownCover(s.w, s.A);
  ok(r.status === 'ok' && rel(r.total, s.total) && rel(r.cover, s.cover) && rel(r.perHa, s.cover * 1e4) && (s.cover > 1) === (r.warnings.length === 1), `plot ${i}: crown cover ${s.cover.toFixed(3)} ha/ha, overlap warning above 1`);
}

// hand cases
const p = C.crownSolid('paraboloid', 6, 8), vanLaar = Math.PI * 6 / (12 * 64) * (4 * 64 + 9) ** 1.5;
ok(rel(p.S, Math.PI * 3 / (6 * 64) * ((9 + 256) ** 1.5 - 27)) && vanLaar - p.S > 0 && rel(vanLaar - p.S, Math.PI * 27 * 3 / 384), "paraboloid: Hamilton's formula; van Laar's printed form is larger by exactly πr⁴/(6L²) (the missing −r³ term)");
ok(Math.abs(C.crownSolid('paraboloid', 4, 1e-6).S - Math.PI * 4) < 1e-9 && C.crownSolid('paraboloid', 4, 1e-6).S > Math.PI * 4, 'a very short paraboloid has the surface of its base disc (π r²), as it should');
ok(rel(C.crownSolid('cone', 6, 4).S, Math.PI * 3 * 5) && rel(C.crownSolid('cone', 6, 4).slant, 5) && rel(C.crownSolid('cone', 6, 4).V, Math.PI * 36 * 4 / 12), 'cone 6 m × 4 m: slant 5, S = π·3·5 (Kershaw π·d·L/2), V = π·36·4/12');
ok(C.crownSolid('sphere', 1, 1).problems[0].code === 'shape.bad' && C.crownSolid('cone', 0, 1).problems[0].code === 'solid.bad', 'unknown shape, zero width refused');
const rr = C.crownFromRadii([2, 3, 2, 3]);
ok(rr.width === 5 && rel(rr.rq, Math.sqrt(6.5)) && rel(rr.area, Math.PI * 6.5) && rr.warnings.length === 0, 'radii 2, 3, 2, 3: width 5 m, area π·6.5 m² (quadratic mean)');
ok(C.crownFromRadii([]).problems[0].code === 'radii.none' && C.crownFromRadii([2, NaN, -1]).problems[0].rows.join() === '2,3' && C.crownFromRadii([0, 0]).problems[0].code === 'radii.zero', 'no radii; bad radii by number; all zero');
ok(C.crownFromDiameters(4, 0).problems[0].code === 'diam.bad', 'zero diameter refused');
const L = C.crownLength({ H: 24, base: 9, dbh: 32, width: 5.6 });
ok(L.L === 15 && L.ratio === 62.5 && rel(L.cwd, 17.5), 'H 24, base 9: crown length 15 m, ratio 62.5 %, crown diameter / dbh 5.6 / 0.32 = 17.5');
ok(C.crownLength({ H: 20, base: 20 }).problems[0].code === 'base.gt' && C.crownLength({ H: 0, base: 1 }).problems[0].code === 'H.bad' && C.crownLength({ H: 20, base: 5 }).cwd === null, 'base at the top refused; no dbh → no ratio');
const cv = C.crownCover([4, NaN, 6], 400);
ok(cv.n === 2 && cv.bad.join() === '2' && rel(cv.cover, Math.PI / 4 * 52 / 400) && C.crownCover([], 400).problems[0].code === 'widths.none' && C.crownCover([3], 0).problems[0].code === 'plot.bad', 'crown cover: unreadable width reported, empty list and zero plot refused');

console.log(`crown TM-04: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
