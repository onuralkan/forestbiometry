// Export helpers shared by all tools. Numbers are written at full precision with a decimal point and ','
// between fields, whatever the interface language (RFC 4180 CSV). XLSX keeps numeric cells.

/** rows → CSV text. The second argument (interface language) is accepted for old callers and ignored. */
export function csvText(rows, _lang) {
  const sep = ',';
  const cell = v => {
    if (v == null) return '';
    if (typeof v === 'number') return Number.isFinite(v) ? String(v) : '';
    const s = String(v);
    return /[";\n\r,\t]/.test(s) || /^\s|\s$/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return rows.map(r => r.map(cell).join(sep)).join('\r\n');
}
/** Text cells that look like numbers ("001") must stay text in CSV for Excel: prefix with nothing, but
 *  callers can pass {asText:true} rows; Excel still strips zeros on open, so XLSX is the safe format for IDs. */
export function download(name, data, type) {
  const blob = data instanceof Blob ? data : new Blob([type && type.startsWith('text/csv') ? '﻿' + data : data], { type: type || 'application/octet-stream' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
export function downloadCSV(name, rows, lang) { download(name, csvText(rows, lang), 'text/csv;charset=utf-8'); }
export function downloadJSON(name, obj) { download(name, JSON.stringify(obj, null, 1), 'application/json'); }

/** sheets: [{ name, rows: [[...]], textCols?: [index] }] → XLSX Blob. IDs passed as strings stay text cells. */
export function xlsxBlob(XLSX, sheets) {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.aoa_to_sheet(s.rows);
    if (s.widths) ws['!cols'] = s.widths.map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx', compression: true });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/** Lazily loads the vendored SheetJS build (only when a spreadsheet is opened or written). */
let xlsxP = null;
export function loadXLSX(base) {
  if (globalThis.XLSX) return Promise.resolve(globalThis.XLSX);
  if (!xlsxP) xlsxP = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = base + 'assets/vendor/sheetjs/xlsx.mini.min.js?v=0.20.3';
    s.onload = () => res(globalThis.XLSX); s.onerror = () => { xlsxP = null; rej(new Error('xlsx-load')); };
    document.head.append(s);
  });
  return xlsxP;
}
/** Safe read options: no formulas, no VBA, no HTML; cached cell values only. */
export const XLSX_READ_OPTS = { type: 'array', cellFormula: false, cellHTML: false, bookVBA: false, cellNF: true, cellText: true, cellDates: false, sheetStubs: false };
