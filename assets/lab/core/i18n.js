// Tiny i18n helper. The site is English only (20 Nov 2026; Turkish removed from the code 21 Nov 2026): `lang` is
// always 'en' and every dictionary has a single `en` table. Numbers on screen use a decimal point and no thousands
// separator; the interface never changes how data are parsed or stored.
export const lang = 'en';
export function makeT(dict) {
  return (key, p) => {
    const s = dict.en[key];
    if (s == null) return key;
    return typeof s === 'function' ? s(p || {}) : s;
  };
}
/**
 * The one number formatter for screens, charts and texts: no thousands separator, at most maxDigits decimals
 * (trailing zeros dropped), the same rounding as before (Intl, half away from zero). Decimal separator by interface
 * point (English only). '−' is not used: negative numbers keep
 * the ASCII minus so they can be copied. Data files are never formatted with this (exports write full precision,
 * CSV with a decimal point, R code with the decimal the user chose).
 */
const NF = new Map();
/** Decimal separator on screen (and in on-screen texts); exports keep their own rules. */
export const SCREEN_DECIMAL = '.';
/** Separator for lists of numbers in texts: '; ' in Turkish (the comma is the decimal separator), ', ' in English. */
export const LIST_SEP = ', ';
export function fmtNum(x, maxDigits = 3) {
  if (x == null || !Number.isFinite(x)) return '–';
  let nf = NF.get(maxDigits);
  if (!nf) { nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: maxDigits, useGrouping: false }); NF.set(maxDigits, nf); }
  const s = nf.format(x);
  return s === '-0' ? '0' : s;
}
/** Decimal separator of CSV exports. */
export const DECIMAL = '.';
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
