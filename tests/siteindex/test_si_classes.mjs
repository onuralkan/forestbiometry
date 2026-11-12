// Site Index: user-defined site classes (equal widths or breaks; half-open, last class closed; I = highest or lowest)
// and the validity-range warnings of evaluate(). Hand-written expected values.
//   node tests/siteindex/test_si_classes.mjs
import * as S from '../../assets/lab/siteindex/calc.js';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} expected ${JSON.stringify(b)}`);

/* 1. equal widths, I = highest (default) */
{ const { classes, problems } = S.classesOf({ mode: 'equal', start: 10, width: 4, n: 4 });
  eq(problems, [], 'equal: no problems');
  eq(classes, [{ lo: 10, hi: 14, name: 'IV' }, { lo: 14, hi: 18, name: 'III' }, { lo: 18, hi: 22, name: 'II' }, { lo: 22, hi: 26, name: 'I' }], 'equal widths, I = highest site index');
  eq([9.99, 10, 13.999, 14, 21.99, 22, 26, 26.01].map(v => S.classify(v, classes)), [null, 'IV', 'IV', 'III', 'II', 'I', 'I', null], 'half-open [lo, hi), the last class includes its upper bound, outside → none (never the nearest)'); }
/* 2. breaks, I = lowest */
{ const { classes } = S.classesOf({ mode: 'breaks', breaks: [8, 12, 20], order: 'asc' });
  eq(classes.map(c => [c.lo, c.hi, c.name]), [[8, 12, 'I'], [12, 20, 'II']], 'breaks, unequal widths, I = lowest');
  eq([12, 20, 7.9].map(v => S.classify(v, classes)), ['II', 'II', null], 'boundary 12 belongs to the upper class; 20 to the last'); }
/* 3. bad definitions refused, never repaired */
ok(S.classesOf({ mode: 'breaks', breaks: [8, 12, 12] }).problems[0].code === 'cls.order', 'non-increasing breaks refused');
ok(S.classesOf({ mode: 'breaks', breaks: [5] }).problems[0].code === 'cls.breaks', 'one break: no class');
ok(S.classesOf({ mode: 'equal', start: 10, width: 0, n: 3 }).problems[0].code === 'cls.equal', 'zero width refused');
ok(S.classesOf({ mode: 'equal', start: -1, width: 2, n: 3 }).problems[0].code === 'cls.equal', 'negative start refused');
eq(S.classesOf({ mode: 'none' }), { classes: [], problems: [] }, 'no classes'); ok(S.classify(15, []) === null, 'no classes: no class name');

/* 4. evaluate: points outside the validity range are computed and warned */
{ const m = { form: 'cr.ada.b0', params: { b1: 0.03, b2: 1.4 }, baseAge: 50, ageType: 'total' }, cls = S.classesOf({ mode: 'equal', start: 0, width: 50, n: 2 }).classes;
  const rows = S.evaluate(m, [{ key: 'a', A: 30, H: 15 }, { key: 'b', A: 120, H: 30 }, { key: 'c', A: 30, H: 2 }], { valid: { A: [10, 80], H: [5, null] }, classes: cls });
  ok(rows.every(r => r.status === 'ok' && r.si > 0), 'all points computed');
  eq(rows.map(r => r.warnings.map(w => w.code)), [[], ['valid.A'], ['valid.H']], 'age above the range and height below it warned; open upper height limit not checked');
  ok(rows[1].warnings[0].value === 120 && rows[1].warnings[0].max === 80, 'warning carries the value and the limit');
  ok(rows.every(r => r.cls === S.classify(r.si, cls)), 'class of every point from its site index'); }

console.log(`siteindex classes: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
