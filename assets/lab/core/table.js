// Reading tables (CSV/TSV text, Excel paste, XLSX) into a neutral "raw table". Pure functions.
// A raw table keeps every cell as read; nothing is converted here.
//   { kind:'csv'|'paste'|'xlsx', name, headers:[string], rows:[[cell]], rowNumbers:[int], meta:{...} }
//   cell = { t:'s', v:'text' }                       (text formats)
//        | { t:'n', v:number, w:'shown text', date?:'YYYY-MM-DD' }  (XLSX numeric / date)
//        | { t:'b'|'e', v, w }                          (XLSX boolean / error)
// Row numbers follow the source: CSV/paste = record number with the header as 1; XLSX = sheet row.

export const DELIMS = [',', ';', '\t', '|'];

/** Decode bytes; strips a UTF-8 BOM. encoding: 'utf-8' | 'windows-1254' | 'iso-8859-9' */
export function decodeBytes(buf, encoding = 'utf-8') {
  const txt = new TextDecoder(encoding, { fatal: false }).decode(buf);
  return txt.charCodeAt(0) === 0xfeff ? txt.slice(1) : txt;
}
/** Share of U+FFFD replacement chars when read as UTF-8: hint that the file is not UTF-8. */
export function utf8Suspicious(buf) {
  const t = new TextDecoder('utf-8', { fatal: false }).decode(buf);
  return (t.match(/�/g) || []).length > 0;
}

/** RFC 4180 style parser (quotes, doubled quotes, CR/LF inside quotes). Returns records of strings. */
export function parseDelimited(text, delim) {
  const out = []; let row = [], field = '', q = false, i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i += 2; continue; } q = false; i++; continue; }
      field += ch; i++; continue;
    }
    if (ch === '"' && field === '') { q = true; i++; continue; }
    if (ch === delim) { row.push(field); field = ''; i++; continue; }
    if (ch === '\r') { i++; if (text[i] === '\n') i++; row.push(field); out.push(row); row = []; field = ''; continue; }
    if (ch === '\n') { i++; row.push(field); out.push(row); row = []; field = ''; continue; }
    field += ch; i++;
  }
  if (field !== '' || row.length) { row.push(field); out.push(row); }
  return out;
}

/** Picks the delimiter whose field count is most consistent (and > 1) over the first 30 records. */
export function detectDelimiter(text) {
  const sample = text.split(/\r?\n/).filter(l => l.trim()).slice(0, 30).join('\n');
  let best = null;
  for (const d of DELIMS) {
    const recs = parseDelimited(sample, d).filter(r => r.some(c => c.trim()));
    if (!recs.length) continue;
    const counts = recs.map(r => r.length), mode = modeOf(counts), share = counts.filter(c => c === mode).length / counts.length;
    if (mode < 2) continue;
    const score = share * 100 + Math.min(mode, 50) / 100;
    if (!best || score > best.score) best = { delim: d, score, fields: mode, consistent: share };
  }
  return best || { delim: ',', score: 0, fields: 1, consistent: 1 };
}
function modeOf(a) { const m = new Map(); a.forEach(x => m.set(x, (m.get(x) || 0) + 1)); let b = a[0], bc = 0; m.forEach((c, k) => { if (c > bc) { bc = c; b = k; } }); return b; }

/** Text (CSV/TSV/paste) → raw table. */
export function tableFromText(text, { delim, header = true, kind = 'csv', name = '' } = {}) {
  const recs = parseDelimited(text, delim);
  const width = Math.max(0, ...recs.map(r => r.length));
  let headers, start = 0;
  if (header && recs.length) { headers = padTo(recs[0], width).map((h, i) => (h || '').trim() || colName(i)); start = 1; }
  else headers = Array.from({ length: width }, (_, i) => colName(i));
  const rows = [], rowNumbers = [];
  for (let r = start; r < recs.length; r++) {
    const rec = recs[r];
    if (!rec.some(c => c.trim() !== '')) continue;
    rows.push(padTo(rec, width).map(v => ({ t: 's', v })));
    rowNumbers.push(r + 1);
  }
  return { kind, name, headers: dedupeHeaders(headers), rows, rowNumbers, meta: { delim, header, width } };
}

/** XLSX worksheet → raw table. XLSX is the SheetJS object; ws a worksheet read WITHOUT formulas. */
export function tableFromSheet(XLSX, ws, { header = true, name = '', sheet = '' } = {}) {
  if (!ws || !ws['!ref']) return { kind: 'xlsx', name, headers: [], rows: [], rowNumbers: [], meta: { sheet, header } };
  const rg = XLSX.utils.decode_range(ws['!ref']);
  const grid = [];
  for (let r = rg.s.r; r <= rg.e.r; r++) {
    const row = [];
    for (let c = rg.s.c; c <= rg.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      row.push(cellOf(XLSX, cell));
    }
    grid.push({ r: r + 1, row });
  }
  const width = rg.e.c - rg.s.c + 1;
  let headers, start = 0;
  if (header && grid.length) { headers = grid[0].row.map((c, i) => (cellText(c).trim() || colName(i))); start = 1; }
  else headers = Array.from({ length: width }, (_, i) => colName(i));
  const rows = [], rowNumbers = [];
  for (let i = start; i < grid.length; i++) {
    if (!grid[i].row.some(c => cellText(c).trim() !== '')) continue;
    rows.push(grid[i].row); rowNumbers.push(grid[i].r);
  }
  return { kind: 'xlsx', name, headers: dedupeHeaders(headers), rows, rowNumbers, meta: { sheet, header, width } };
}
function cellOf(XLSX, cell) {
  if (!cell || cell.t === 'z' || cell.v == null) return { t: 's', v: '' };
  if (cell.t === 'n') {
    const out = { t: 'n', v: cell.v, w: cell.w != null ? String(cell.w) : String(cell.v) };
    if (cell.z && XLSX.SSF.is_date(cell.z)) {          // Excel date: keep an unambiguous ISO text
      const p = XLSX.SSF.parse_date_code(cell.v);
      if (p) out.date = `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
    }
    return out;
  }
  if (cell.t === 's') return { t: 's', v: String(cell.v) };
  if (cell.t === 'd') return { t: 's', v: cell.v instanceof Date ? cell.v.toISOString().slice(0, 10) : String(cell.v) };
  return { t: cell.t, v: cell.v, w: cell.w != null ? String(cell.w) : String(cell.v) };
}
/** What a person sees in the cell (used for IDs, codes, dates and the preview). */
export function cellText(c) {
  if (!c) return '';
  if (c.t === 'n') return c.date || c.w;
  if (c.t === 's') return c.v;
  return c.w != null ? c.w : String(c.v);
}
function padTo(a, n) { const r = a.slice(); while (r.length < n) r.push(''); return r; }
function colName(i) { return (typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'Column ' : 'Sütun ') + (i + 1); }
function dedupeHeaders(h) { const seen = new Map(); return h.map(x => { const k = seen.get(x) || 0; seen.set(x, k + 1); return k ? `${x} (${k + 1})` : x; }); }
