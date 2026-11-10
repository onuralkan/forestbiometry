// Shared number display and the decimal-separator defaults are independent of the interface language.
//   node tests/site/test_format.mjs
let pass = 0, fail = 0;
const eq = (a, b, m) => { const A = JSON.stringify(a), B = JSON.stringify(b); if (A === B) pass++; else { fail++; console.log('FAIL', m, 'got', A, 'expected', B); } };

async function load(l) {
  globalThis.document = { documentElement: { lang: l } };
  const base = new URL('../../assets/lab/core/', import.meta.url).href;
  const i18n = await import(base + 'i18n.js?l=' + l), ex = await import(base + 'export.js?l=' + l);
  delete globalThis.document;
  return { ...i18n, csvText: ex.csvText };
}
const tr = await load('tr'), en = await load('en');
eq([tr.lang, en.lang], ['tr', 'en'], 'two separate language instances');

// [value, digits, expected]: point, no grouping, at most `digits` decimals, trailing zeros dropped
const cases = [[24.5, 2, '24.5'], [1234567.891, 2, '1234567.89'], [0.12345, 3, '0.123'], [2.675, 2, '2.68'], [-0.0001, 2, '0'],
  [-12.3456, 1, '-12.3'], [1e-7, 3, '0'], [100, 0, '100'], [0.5, 0, '1'], [1.30, 2, '1.3'], [NaN, 2, '–'], [null, 2, '–'], [Infinity, 2, '–']];
for (const [x, d, want] of cases) {
  eq(tr.fmtNum(x, d), want, `fmtNum TR ${x},${d}`);
  eq(en.fmtNum(x, d), want, `fmtNum EN ${x},${d}`);
}
for (let i = 0; i < 500; i++) {                                         // random values: identical in both languages
  const x = (Math.random() - 0.5) * 10 ** (Math.random() * 8 - 2), d = i % 6;
  const a = tr.fmtNum(x, d);
  if (a !== en.fmtNum(x, d) || a.includes(',')) { eq(a, en.fmtNum(x, d), 'random ' + x); continue; }
  pass++;
}
eq([tr.DECIMAL, en.DECIMAL], ['.', '.'], 'DECIMAL constant');

const rows = [['plot', 'd'], ['001', 24.5], ['002', 1234.125]];
eq(tr.csvText(rows, 'tr'), en.csvText(rows, 'en'), 'CSV identical in both languages');
eq(tr.csvText(rows, 'tr').split(/\r?\n/)[1], '001,24.5', 'CSV: comma columns, point decimals');

const num = await import(new URL('../../assets/lab/core/num.js', import.meta.url).href);
eq([num.defaultDecimal('dot'), num.defaultDecimal('comma'), num.defaultDecimal('none'), num.defaultDecimal('ambiguous'), num.defaultDecimal('conflict')],
  ['.', ',', '.', '.', '.'], 'import default: point unless the file clearly uses a comma');
eq(num.parseNumber('24,5', ',').value, 24.5, 'comma import still parsed');
eq(num.parseNumber('24.5', '.').value, 24.5, 'point import parsed');

console.log(`format: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
