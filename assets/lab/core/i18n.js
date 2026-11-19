// Tiny i18n helper. The UI language only changes words on screen. Numbers are shown the same way in both
// languages (decimal point, no thousands separator); the language never changes how data are parsed or stored.
export const lang = (typeof document !== 'undefined' && document.documentElement.lang === 'en') ? 'en' : 'tr';
export function makeT(dict) {
  return (key, p) => {
    const s = (dict[lang] && dict[lang][key]) ?? dict.tr[key];
    if (s == null) return key;
    return typeof s === 'function' ? s(p || {}) : s;
  };
}
/**
 * The one number formatter for screens, charts and texts: no thousands separator, at most maxDigits decimals
 * (trailing zeros dropped), the same rounding as before (Intl, half away from zero). Decimal separator by interface
 * language: comma in Turkish, point in English (19 Nov 2026, user decision). '−' is not used: negative numbers keep
 * the ASCII minus so they can be copied. Data files are never formatted with this (exports write full precision,
 * CSV with a decimal point, R code with the decimal the user chose).
 */
const NF = new Map();
/** Decimal separator on screen (and in on-screen texts); exports keep their own rules. */
export const SCREEN_DECIMAL = lang === 'tr' ? ',' : '.';
/** Separator for lists of numbers in texts: '; ' in Turkish (the comma is the decimal separator), ', ' in English. */
export const LIST_SEP = lang === 'tr' ? '; ' : ', ';
export function fmtNum(x, maxDigits = 3) {
  if (x == null || !Number.isFinite(x)) return '–';
  let nf = NF.get(maxDigits);
  if (!nf) { nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: maxDigits, useGrouping: false }); NF.set(maxDigits, nf); }
  const s = nf.format(x);
  return s === '-0' ? '0' : SCREEN_DECIMAL === ',' ? s.replace('.', ',') : s;
}
/** Decimal separator of CSV exports (both languages). */
export const DECIMAL = '.';
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
