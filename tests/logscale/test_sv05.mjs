// Log scaling (SV-05): assets/lab/logscale/calc.js.
//   node tests/logscale/test_sv05.mjs
// 1. Kershaw et al. 2016 Table 7.1 (16-ft logs, 6–38 in.): Doyle exactly; International ¼-in. (Grosenbaugh 1952a)
//    rounded to the nearest 5 board feet equals the table's International ¼-in. column for all nine diameters; the
//    Scribner column is Scribner's original (unsmoothed) table, so eq. (7.3) is checked against the reference below.
// 2. tests/ref/logscale_sv05.json (make_logscale_sv05.py, standard library, written apart): scaling length, segments,
//    board feet by every rule, cubic volumes.
import { readFile } from 'node:fs/promises';
import * as LS from '../../assets/lab/logscale/calc.js';

const R = JSON.parse(await readFile(new URL('../ref/logscale_sv05.json', import.meta.url), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, t = 1e-11) => a == null || b == null ? a === b : Math.abs(a - b) <= t * Math.max(1, Math.abs(b));

const T71 = [[6, 20, 4], [10, 65, 36], [14, 135, 100], [18, 230, 196], [22, 355, 324], [26, 500, 484], [30, 675, 676], [34, 870, 900], [38, 1095, 1156]];
ok(T71.every(([D, , d]) => LS.boardFeet('doyle', D, 16).V === d), 'Table 7.1 Doyle column: (D − 4)² for 16-ft logs, all nine diameters');
ok(T71.every(([D, i]) => 5 * Math.round(LS.boardFeet('intl4', D, 16).V / 5) === i), 'Table 7.1 International ¼-in. column = Grosenbaugh equation rounded to 5 board feet, all nine diameters');
ok(near(LS.boardFeet('scribner', 20, 16).V, 0.79 * 400 - 40 - 4) && near(LS.boardFeet('intl8', 10, 16).V, 88 - 15.2 - 1.36), 'Scribner (7.3) and International ⅛-in. (7.9) by hand');
ok(LS.boardFeet('intl8', 10, 14).code === 'intl8.length' && LS.boardFeet('doyle', 4, 16).code === 'doyle.small' && LS.boardFeet('scribner', 2, 16).code === 'nonpositive', 'International ⅛-in. only for 8/12/16/20 ft; Doyle needs D > 4 in.; no non-positive volume');
ok(LS.CM_PER_IN === 2.54 && LS.M_PER_FT === 0.3048, 'exact unit conversions');

let bad = 0;
for (const c of R.cases) {
  const r = LS.scaleLog({ ds: c.ds, db: c.db, dm: c.dm, Lm: c.Lm }, LS.RULES, { roundD: c.roundD, lengthRule: c.lengthRule, maxFt: c.maxFt, round5: c.round5 });
  const same = r.status === 'ok' && r.Lft === c.Lft && r.segments.length === c.segs.length && r.segments.every((s, i) => s.from === c.segs[i][0] && s.L === c.segs[i][1] && near(s.Dcm, c.segs[i][2]) && near(s.Din, c.segs[i][3]))
    && LS.RULES.every(k => near(r.bf[k].V, c.bf[k], 1e-11)) && ['smalian', 'huber', 'newton'].every(k => near(r.cubic[k], c.cubic[k], 1e-12));
  if (!same) { bad++; if (bad < 3) console.log(JSON.stringify(c).slice(0, 300), JSON.stringify(r.bf), r.Lft); }
}
ok(bad === 0, `${R.cases.length} logs: scaling length, segments, board feet by four rules, Smalian/Huber/Newton equal the Python reference`);
ok(R.cases.some(c => c.segs.length > 1) && R.cases.some(c => c.bf.intl8 === null) && R.cases.some(c => c.round5), 'the reference covers split logs, lengths without an International ⅛-in. equation, and rounding to 5');
{ const r = LS.scaleLog({ ds: 30, db: 40, Lm: 30 * 0.3048 }, ['doyle'], { maxFt: 16 }); ok(r.segments.map(s => s.L).join() === '15,15' && r.segments[0].from === 0 && near(r.segments[0].Dcm, 35), 'a 30-ft log with a 16-ft maximum: two 15-ft segments; the butt segment\'s small end interpolated (35 cm)'); }
{ const r = LS.scaleLog({ ds: 30, db: 40, Lm: 33 * 0.3048 }, ['doyle'], { maxFt: 16 }); ok(r.segments.map(s => s.L).join() === '11,11,11' , '33 ft with a 16-ft maximum: three 11-ft segments'); }
{ const r = LS.scaleLog({ ds: 30, db: 40, Lm: 31 * 0.3048 }, ['doyle'], { maxFt: 16 }); ok(r.segments.map(s => s.L).join() === '16,15', '31 ft: butt segment takes the longer length (16 + 15)'); }
ok(LS.scaleLog({ ds: 30, Lm: 10 }, ['doyle'], { maxFt: 16 }).code === 'split.db' && LS.scaleLog({ ds: 30, db: 20, Lm: 5 }, ['doyle']).code === 'db', 'splitting needs the large-end diameter; large end below the small end refused');
ok(near(LS.cubic({ ds: 20, db: 30, dm: 25, Lm: 4 }).newton, 4 / 6 * Math.PI / 4 * (0.09 + 4 * 0.0625 + 0.04)), 'Newton by hand');
ok(LS.TOOL.id === 'tomruk-olcumu' && LS.TOOL.version === '1.0.0-beta.1', 'tool id and first version (K4)');
console.log(`SV-05 log scaling: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
