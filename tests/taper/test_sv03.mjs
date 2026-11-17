// SV-03: log-length limit of the merchantable stem (assets/lab/taper/calc.js logCount, logLimit).
//   node tests/taper/test_sv03.mjs
// Reference: tests/ref/taper_sv03.json (make_taper_sv03.py, standard library, written apart: the book's form of the log
// count, Simpson volumes on the Max and Burkhart 1976 Model 4 profile). Rule: Kershaw, Ducey, Beers, Husch 2016 §6.4.1,
// §7.4.1, §7.4.3 [B]; the worked example of the book (72 ft, 1 ft stump, 16-ft logs, 0.3 ft trim → 4 logs).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as TP from '../../assets/lab/taper/calc.js';
import { blankSet } from '../../assets/lab/core/coef.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const R = JSON.parse(readFileSync(path.join(root, 'tests/ref/taper_sv03.json'), 'utf8'));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const near = (a, b, t = 1e-10) => Math.abs(a - b) <= t * Math.max(1e-6, Math.abs(b));
const set = { ...blankSet('taper.mb76'), id: 't', params: R.params, output: { name: 'd', unit: 'cm', bark: 'ib' }, source: { citation: 'Max and Burkhart 1976, Table 3 (test values only)' }, origin: 'user-entered' };

// the book's worked example (lengths in feet; the rule is unit-free)
ok(TP.logCount(R.book.hTop - R.book.stump, R.book.L, R.book.trim) === 4 && R.book.n === 4, `Husch et al. 2016 §6.4.1 example: ((72 − 17.3)/16.3) + 1 = ${R.book.q.toFixed(2)} → 4 sixteen-foot logs`);
ok(TP.logCount(6.3, 2, 0.1) === 3 && TP.logCount(6.29, 2, 0.1) === 2 && TP.logCount(0, 2, 0.1) === 0, 'exact multiple of L + trim counts as whole logs; just below does not');

let bad = 0, n = 0, bal = 0;
for (const c of R.cases) {
  const r = TP.logLimit(set, c.D, c.H, { stump: c.stump, hTop: c.hTop, L: c.L, trim: c.trim, minLen: c.minLen, shortTop: c.short }), o = c.out;
  n++;
  const same = r.status === 'ok' && r.n === o.n && (r.code || null) === o.code && r.logs.length === o.logs.length
    && r.logs.every((q, i) => near(q.h1, o.logs[i].h1, 1e-12) && near(q.h2, o.logs[i].h2, 1e-12) && near(q.V, o.logs[i].V) && near(q.dSmall, o.logs[i].dSmall))
    && (r.short === null) === (o.short === null) && (!r.short || (near(r.short.V, o.short.V) && near(r.short.h2, o.short.h2, 1e-12)))
    && ['logs', 'short', 'trims', 'rest', 'merch'].every(k => near(r.V[k], o.V[k]));
  if (!same) { bad++; if (bad < 4) console.log('case', JSON.stringify({ ...c, out: undefined }), JSON.stringify(r.V), JSON.stringify(o.V), r.n, o.n); }
  if (Math.abs(r.V.logs + r.V.short + r.V.trims + r.V.rest - r.V.merch) > 1e-12 * Math.max(1, r.V.merch)) bal++;
}
ok(bad === 0, `${n} trees: number of logs, log ends, log volumes, small-end diameters, short top, trims and rest equal the Python reference`);
ok(bal === 0, 'logs + short top + trims + rest = merchantable volume from the stump to the top limit (every tree)');
ok(R.cases.some(c => c.out.short) && R.cases.some(c => c.short === 'keep' && !c.out.short) && R.cases.some(c => c.out.code === 'log.belowmin'), 'the reference covers a kept short top, a short top below the minimum, and logs shorter than the minimum');
{ const m = TP.merchantable(set, 30, 25, { stump: 0.3, dTop: 10 }), r = TP.logLimit(set, 30, 25, { stump: 0.3, hTop: m.hTop, L: 2, trim: 0.1 });
  ok(near(r.V.merch, m.merch) && r.logs.every(q => q.dSmall >= 10 - 1e-9), 'with the top-diameter limit: the merchantable volume is the same, every log ends at or above the top diameter'); }
ok(TP.logLimit(set, 30, 25, { L: 0 }).code === 'log.L' && TP.logLimit(set, 30, 25, { L: 2, trim: -1 }).code === 'log.trim' && TP.logLimit(set, 30, 25, { L: 2, minLen: 0 }).code === 'log.min' && TP.logLimit(set, 30, 25, { L: 2, shortTop: 'x' }).code === 'log.short', 'invalid settings are refused with a code');
ok(TP.TOOL.version === '1.0.0-beta.3', 'tool version 1.0.0-beta.3 (merchantable volume gains the log-length limit)');
console.log(`SV-03 log-length limit: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
