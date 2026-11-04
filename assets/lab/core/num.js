// Number parsing for forestry tables. Pure functions (no DOM), usable in Node tests.
// Rules (docs/PROJECT.md §4, METHODS.md §5):
//  - The decimal separator is a user setting ('.' or ','); it never depends on the UI language.
//  - Thousands separators and internal spaces are NOT accepted: such values are reported, never guessed.
//  - Empty text is "missing" (null), never 0.

const RE_DOT = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
const RE_COMMA = /^[+-]?(\d+,?\d*|,\d+)([eE][+-]?\d+)?$/;

/** @returns {{status:'ok', value:number} | {status:'empty'} | {status:'bad', reason:string}} */
export function parseNumber(input, decimal) {
  if (input == null) return { status: 'empty' };
  if (typeof input === 'number') return Number.isFinite(input) ? { status: 'ok', value: input } : { status: 'bad', reason: 'not-finite' };
  const t = String(input).trim().replace(/−/g, '-');
  if (t === '') return { status: 'empty' };
  if (/\s/.test(t)) return { status: 'bad', reason: 'space' };
  if (decimal === ',') {
    if (RE_COMMA.test(t)) return { status: 'ok', value: Number(t.replace(',', '.')) };
    return { status: 'bad', reason: t.includes('.') ? 'other-separator' : 'not-number' };
  }
  if (decimal === '.') {
    if (RE_DOT.test(t)) return { status: 'ok', value: Number(t) };
    return { status: 'bad', reason: t.includes(',') ? 'other-separator' : 'not-number' };
  }
  return { status: 'bad', reason: 'no-decimal-setting' };
}

/**
 * Looks at text values of numeric columns and reports what the decimal separator could be.
 * "1,234" / "1.234" (1–3 digits, separator, exactly 3 digits) are ambiguous: they could be a
 * decimal value or a thousands-grouped integer. They never decide the setting on their own.
 * @returns {{verdict:'dot'|'comma'|'ambiguous'|'conflict'|'none', dot:number, comma:number, ambiguous:number, both:number, examples:{dot:string[],comma:string[],ambiguous:string[]}}}
 */
export function detectDecimal(values) {
  const r = { dot: 0, comma: 0, ambiguous: 0, both: 0, examples: { dot: [], comma: [], ambiguous: [] } };
  const push = (k, v) => { r[k]++; if (r.examples[k] && r.examples[k].length < 3) r.examples[k].push(v); };
  for (const raw of values) {
    if (raw == null || typeof raw === 'number') continue;
    const t = String(raw).trim();
    if (!t) continue;
    const c = (t.match(/,/g) || []).length, d = (t.match(/\./g) || []).length;
    if (c && d) { r.both++; continue; }
    if (/^[+-]?\d{1,3}[.,]\d{3}$/.test(t)) { push('ambiguous', t); continue; }
    if (c === 1 && RE_COMMA.test(t)) push('comma', t);
    else if (d === 1 && RE_DOT.test(t)) push('dot', t);
  }
  r.verdict = r.dot && r.comma ? 'conflict' : r.dot ? 'dot' : r.comma ? 'comma' : r.ambiguous ? 'ambiguous' : 'none';
  return r;
}

/** Unit conversion to internal units: dbh cm, height m, area m², coordinates m. */
export const UNITS = {
  dbh: { cm: 1, mm: 0.1, m: 100 },
  height: { m: 1, dm: 0.1, cm: 0.01 },
  area: { m2: 1, ha: 10000 },
  xy: { m: 1 },
};
export function toInternal(kind, unit, v) {
  const f = UNITS[kind] && UNITS[kind][unit];
  if (f == null) throw new Error(`unknown unit ${kind}/${unit}`);
  return v == null ? null : v * f;
}
