// Stand Structure: comparison with R packages (spatstat, forestSAS, siplab) for the measures whose sources are not in
// hand (U, Donnelly's correction) and for Hegyi ([A]). METHODS §16 SS02 and SS-07.
//   Rscript tests/ref/ss02_check.R   (writes tests/ref/structure_ss02_r.json; run by the user, R is not in CI)
//   node tests/structure/test_ss02_r.mjs
// Without the JSON the test is skipped (exit 0) and says how to produce it.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as SP from '../../assets/lab/structure/spatial.js';
import { hegyi } from '../../assets/lab/structure/competition.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const fr = path.join(root, 'tests/ref/structure_ss02_r.json');
if (!existsSync(fr)) { console.log('structure SS02 vs R: skipped (no tests/ref/structure_ss02_r.json; run Rscript tests/ref/ss02_check.R)'); process.exit(0); }
const RR = JSON.parse(readFileSync(fr, 'utf8')), REF = JSON.parse(readFileSync(path.join(root, 'tests/ref/structure_ss02.json'), 'utf8'));
let pass = 0, fail = 0, skipped = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, m, tol = 1e-9) => ok(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${m}: got ${a} expected ${b}`);
console.log(`R ${RR.R}; ${Object.entries(RR.packages).map(([k, v]) => `${k} ${v}`).join(', ')}`);

RR.cases.forEach((r, k) => {
  const c = REF.cases[k], tag = `${c.geom.shape} ${k + 1} (n = ${c.x.length})`;
  const trees = c.x.map((x, i) => ({ row: i + 2, x, y: c.y[i], dbh: c.dbh[i], species: c.species[i] }));
  const s = SP.spatialUnit(trees, c.geom, { edge: 'none' });
  // neighbours: spatstat's nnwhich (1-based) against the tool's
  ok(s.trees.every((t, i) => t.neighbours.join() === r.nn[i].map(j => j + 1).join()), `${tag}: 4 nearest neighbours = spatstat nnwhich`);
  ok(s.trees.every((t, i) => t.U === r.U[i]), `${tag}: U per tree = forestSAS::dominance`);
  if (r.R !== undefined) {
    near(s.ce.R, r.R, `${tag}: Clark–Evans R = spatstat clarkevans (none)`);
    near(s.ce.RD, r.RD, `${tag}: Clark–Evans R, Donnelly = spatstat clarkevans (Donnelly)`);
    if (!Array.isArray(r.hegyi) || r.hegyi.length !== c.x.length) { skipped++; console.log(`SKIP ${tag}: Hegyi not in the R output (re-run Rscript tests/ref/ss02_check.R; written since 18 Nov 2026)`); }
    else { const h = hegyi(trees, c.geom, { mode: 'radius', radius: RR.hegyiRadius, edge: 'none' });
      ok(h.status === 'ok' && h.trees.every((t, i) => Math.abs(t.hegyi - r.hegyi[i]) <= 1e-9 * Math.max(1, r.hegyi[i])), `${tag}: Hegyi (radius ${RR.hegyiRadius} m) = siplab pairwise powers_ker`); }
  }
});
console.log(`structure SS02 vs R: ${pass} passed, ${fail} failed${skipped ? `, ${skipped} not checked` : ''}`);
process.exit(fail ? 1 : 0);
