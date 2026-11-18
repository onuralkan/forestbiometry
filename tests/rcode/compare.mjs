// Compares what each R script wrote (FB_RCODE_OUT, <case>.out.csv) with the tool's numbers (<case>.expected.json).
//   node tests/rcode/compare.mjs <folder>
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
const dir = process.argv[2];
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
for (const name of readFileSync(path.join(dir, 'cases.txt'), 'utf8').split('\n').filter(Boolean)) {
  const exp = JSON.parse(readFileSync(path.join(dir, name + '.expected.json'), 'utf8')), fo = path.join(dir, name + '.out.csv');
  if (!existsSync(fo)) { ok(false, `${name}: R wrote no results`); continue; }
  const got = Object.fromEntries(readFileSync(fo, 'utf8').trim().split('\n').slice(1).map(l => { const m = l.match(/^"([^"]*)","?\s*([^"]*)"?$/); return m ? [m[1], Number(m[2])] : [l, NaN]; }));
  let bad = 0;
  for (const [k, [v, tol]] of Object.entries(exp)) {
    const g = got[k], good = Number.isFinite(g) && Math.abs(g - v) <= tol * Math.max(1, Math.abs(v));
    if (!good) { bad++; if (bad <= 15) console.log(`FAIL ${name}: ${k} tool ${v} R ${g} (tolerance ${tol})`); }
  }
  ok(bad === 0, `${name}: ${bad} of ${Object.keys(exp).length} numbers differ`);
  if (!bad) console.log(`✓ ${name}: ${Object.keys(exp).length} numbers agree with the tool`);
}
console.log(`R code: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
