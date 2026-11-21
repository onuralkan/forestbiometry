// Shared number display: decimal point, no thousands separator (English only; 20 Nov 2026); CSV and the import
// defaults are independent of the interface.
//   node tests/site/test_format.mjs
let pass = 0, fail = 0;
const eq = (a, b, m) => { const A = JSON.stringify(a), B = JSON.stringify(b); if (A === B) pass++; else { fail++; console.log('FAIL', m, 'got', A, 'expected', B); } };

const base = new URL('../../assets/lab/core/', import.meta.url).href;
const i18n = await import(base + 'i18n.js'), ex = await import(base + 'export.js');
eq(i18n.lang, 'en', 'interface language is English');

// [value, digits, expected]: point, no grouping, at most `digits` decimals, trailing zeros dropped
const cases = [[24.5, 2, '24.5'], [1234567.891, 2, '1234567.89'], [0.12345, 3, '0.123'], [2.675, 2, '2.68'], [-0.0001, 2, '0'],
  [-12.3456, 1, '-12.3'], [1e-7, 3, '0'], [100, 0, '100'], [0.5, 0, '1'], [1.30, 2, '1.3'], [NaN, 2, '–'], [null, 2, '–'], [Infinity, 2, '–']];
for (const [x, d, want] of cases) eq(i18n.fmtNum(x, d), want, `fmtNum ${x},${d}`);
for (let i = 0; i < 500; i++) {                                         // random values: never a comma, at most one point
  const x = (Math.random() - 0.5) * 10 ** (Math.random() * 8 - 2), d = i % 6, s = i18n.fmtNum(x, d);
  if (s.includes(',') || (s.match(/\./g) || []).length > 1) { eq(s, 'a number with a point', 'random ' + x); continue; }
  pass++;
}
eq([i18n.SCREEN_DECIMAL, i18n.LIST_SEP, i18n.DECIMAL], ['.', ', ', '.'], 'screen decimal, list separator, CSV decimal');

const rows = [['plot', 'd'], ['001', 24.5], ['002', 1234.125]];
eq(ex.csvText(rows).split(/\r?\n/)[1], '001,24.5', 'CSV: comma columns, point decimals');

const num = await import(new URL('../../assets/lab/core/num.js', import.meta.url).href);
eq([num.defaultDecimal('dot'), num.defaultDecimal('comma'), num.defaultDecimal('none'), num.defaultDecimal('ambiguous'), num.defaultDecimal('conflict')],
  ['.', ',', '.', '.', '.'], 'import default: point unless the file clearly uses a comma');
eq(num.parseNumber('24,5', ',').value, 24.5, 'comma import still parsed');
eq(num.parseNumber('24.5', '.').value, 24.5, 'point import parsed');

console.log(`format: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
