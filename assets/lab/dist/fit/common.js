// Sample checks shared by the direct estimation methods (no DOM). Thresholds are tool rules, not literature values.
export const FEW_UNIQUE = 10;
/** n, distinct values, range; problems (no estimate possible) and notices (estimate given, read with care). */
export function checkBasic(d) {
  const n = d.length, uniq = new Set(d).size;
  let mn = Infinity, mx = -Infinity; for (const v of d) { if (v < mn) mn = v; if (v > mx) mx = v; }
  const problems = [], notices = [];
  if (n < 2) problems.push({ code: 'n.few', n });
  else if (uniq < 2) problems.push({ code: 'constant', value: mn });
  if (n >= 2 && uniq >= 2 && uniq < FEW_UNIQUE) notices.push({ code: 'few.unique', unique: uniq, n });
  if (n >= 20 && uniq <= 15 && uniq / n < 0.2) notices.push({ code: 'looks.grouped', unique: uniq, n });
  return { n, unique: uniq, min: n ? mn : null, max: n ? mx : null, problems, notices };
}
/** Mean and variance with the stated divisor ('n' = moment variance, 'n-1' = sample variance). */
export function meanVar(x, div = 'n') {
  const n = x.length, m = x.reduce((p, q) => p + q, 0) / n;
  return { m, v: x.reduce((p, q) => p + (q - m) ** 2, 0) / (div === 'n-1' ? n - 1 : n) };
}
export const VAR_DIVISOR = { key: 'varDivisor', type: 'choice', values: ['n', 'n-1'], default: 'n' };
