// Tiny i18n helper. The UI language only changes words and number formatting on screen;
// it never changes how data are parsed or stored.
export const lang = (typeof document !== 'undefined' && document.documentElement.lang === 'en') ? 'en' : 'tr';
export function makeT(dict) {
  return (key, p) => {
    const s = (dict[lang] && dict[lang][key]) ?? dict.tr[key];
    if (s == null) return key;
    return typeof s === 'function' ? s(p || {}) : s;
  };
}
export function fmtNum(x, maxDigits = 3) {
  if (x == null || !Number.isFinite(x)) return '–';
  return x.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-GB', { maximumFractionDigits: maxDigits });
}
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
