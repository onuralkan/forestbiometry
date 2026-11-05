// Shared single-table import panel (file / paste, delimiter, encoding, header row, worksheet, preview).
// Same rules as the Data Checker: nothing is converted here; the raw table keeps every cell as read.
import { makeT, lang, esc } from './i18n.js';
import { tableFromText, tableFromSheet, detectDelimiter, decodeBytes, utf8Suspicious, cellText } from './table.js';
import { loadXLSX, XLSX_READ_OPTS } from './export.js';

const T = makeT({
  tr: { file: 'Dosya seç (CSV, TXT, TSV, XLSX)', paste: 'veya Excel\'den yapıştırın', take: 'Yapıştırılanı al', clear: 'Kaldır', delim: 'Sütun ayırıcı',
    auto: p => `algılanan: ${p.d}`, header: 'İlk satır başlık', enc: 'Karakter kodlaması', sheet: 'Çalışma sayfası', pasted: 'yapıştırılan tablo',
    encwarn: 'Dosya UTF-8 olarak okunduğunda bozuk karakterler var; Türkçe Excel CSV\'leri çoğunlukla Windows-1254\'tür.',
    xlsxnote: 'Excel dosyasındaki formüller ve makrolar çalıştırılmaz; yalnızca kayıtlı son değerler okunur.', xls: 'Eski .xls biçimi desteklenmiyor; .xlsx veya CSV olarak kaydedin.',
    fail: 'Dosya okunamadı.', preview: p => `Önizleme: ilk ${p.k} / ${p.n} kayıt, ${p.c} sütun`, row: 'Satır',
    comma: 'virgül', semi: 'noktalı virgül', tab: 'sekme' },
  en: { file: 'Choose a file (CSV, TXT, TSV, XLSX)', paste: 'or paste from Excel', take: 'Use pasted table', clear: 'Remove', delim: 'Delimiter',
    auto: p => `detected: ${p.d}`, header: 'First row is a header', enc: 'Text encoding', sheet: 'Worksheet', pasted: 'pasted table',
    encwarn: 'Reading the file as UTF-8 produced broken characters; Turkish Excel CSV files are often Windows-1254.',
    xlsxnote: 'Formulas and macros in the Excel file are not run; only the last saved values are read.', xls: 'The old .xls format is not supported; save as .xlsx or CSV.',
    fail: 'The file could not be read.', preview: p => `Preview: first ${p.k} of ${p.n} records, ${p.c} columns`, row: 'Row',
    comma: 'comma', semi: 'semicolon', tab: 'tab' },
});
const DN = () => ({ ',': T('comma'), ';': T('semi'), '\t': T('tab'), '|': '|' });

/** imp = { kind:'csv'|'paste'|'xlsx', name, buf?, text?, encoding, delim, header, sheet } → raw table (async for XLSX). */
export async function readImport(imp, base) {
  imp.warn = null;
  if (imp.kind === 'xlsx') {
    const XLSX = await loadXLSX(base);
    const wb = XLSX.read(new Uint8Array(imp.buf), XLSX_READ_OPTS);
    imp.sheets = wb.SheetNames;
    if (!imp.sheet || !wb.SheetNames.includes(imp.sheet)) imp.sheet = wb.SheetNames[0];
    return tableFromSheet(XLSX, wb.Sheets[imp.sheet], { header: imp.header, name: imp.name, sheet: imp.sheet });
  }
  const text = imp.kind === 'paste' ? imp.text : decodeBytes(new Uint8Array(imp.buf), imp.encoding);
  if (imp.kind !== 'paste' && imp.encoding === 'utf-8' && utf8Suspicious(new Uint8Array(imp.buf))) imp.warn = 'encwarn';
  imp.detected = detectDelimiter(text).delim;
  return tableFromText(text, { delim: imp.delim || imp.detected, header: imp.header, kind: imp.kind, name: imp.name });
}
export async function fileToImport(file) {
  const ext = file.name.toLowerCase().split('.').pop();
  if (ext === 'xls') throw new Error(T('xls'));
  const buf = await file.arrayBuffer();
  const zip = new Uint8Array(buf.slice(0, 2)).join() === '80,75';
  return { kind: ext === 'xlsx' || ext === 'xlsm' || zip ? 'xlsx' : 'csv', name: file.name, buf, encoding: 'utf-8', delim: null, header: true, sheet: null };
}
export function previewHTML(src, k = 6) {
  const rows = src.rows.slice(0, k);
  return `<p class="muted small">${T('preview', { k: rows.length, n: src.rows.length, c: src.headers.length })}</p><div class="tscroll"><table class="grid"><thead><tr><th>${T('row')}</th>${src.headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r, i) => `<tr><td class="rn">${src.rowNumbers[i]}</td>${r.map(c => `<td>${esc(cellText(c))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
/**
 * Renders the panel into el. state = { imp, src } (mutated). onChange(state) after every successful read;
 * onError(message) when a file cannot be read. rawRows: read every row as data (no header) and hide the header option.
 */
export function renderImport(el, state, { base, title, sub = '', onChange, onError, rawRows = false }) {
  const imp = state.imp, src = state.src, dn = DN();
  let h = `<div class="card imp"><h2>${title}</h2>${sub ? `<p class="muted">${sub}</p>` : ''}<div class="imp-in">
    <label class="filebtn"><input type="file" accept=".csv,.txt,.tsv,.xlsx,.xlsm" data-act="file"><span>${T('file')}</span></label>
    <details${imp && imp.kind === 'paste' ? ' open' : ''}><summary>${T('paste')}</summary><textarea rows="5" spellcheck="false" data-act="pastebox">${imp && imp.kind === 'paste' ? esc(imp.text) : ''}</textarea>
    <button type="button" class="btn small" data-act="paste">${T('take')}</button></details></div>`;
  if (imp && src) {
    h += `<div class="imp-opts"><strong class="fname">${esc(imp.name)}</strong>`;
    if (imp.kind === 'xlsx') h += `<label>${T('sheet')} <select data-act="sheet">${(imp.sheets || []).map(s => `<option${s === imp.sheet ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select></label>`;
    else if (imp.kind !== 'dataset') {
      h += `<label>${T('delim')} <select data-act="delim"><option value="">${T('auto', { d: dn[imp.detected] })}</option>${Object.entries(dn).map(([d, n]) => `<option value="${esc(d)}"${imp.delim === d ? ' selected' : ''}>${n}</option>`).join('')}</select></label>`;
      if (imp.kind === 'csv') h += `<label>${T('enc')} <select data-act="enc">${['utf-8', 'windows-1254', 'iso-8859-9'].map(e => `<option${imp.encoding === e ? ' selected' : ''}>${e}</option>`).join('')}</select></label>`;
    }
    if (imp.kind !== 'dataset' && !rawRows) h += `<label class="chk"><input type="checkbox" data-act="header"${imp.header ? ' checked' : ''}> ${T('header')}</label>`;
    h += `<button type="button" class="btn ghost small" data-act="clear">${T('clear')}</button></div>`;
    if (imp.warn) h += `<p class="note warn">${T(imp.warn)}</p>`;
    if (imp.kind === 'xlsx') h += `<p class="note">${T('xlsxnote')}</p>`;
    h += previewHTML(src);
  }
  el.innerHTML = h + '</div>';
  const q = a => el.querySelector(`[data-act="${a}"]`);
  const reread = async next => {
    if (rawRows) next.header = false;          // the tool picks the header row itself
    try { state.imp = next; state.src = await readImport(next, base); onChange(state); }
    catch (e) { onError(e.message || T('fail')); }
  };
  q('file').addEventListener('change', async e => { const f = e.target.files[0]; if (!f) return; try { reread(await fileToImport(f)); } catch (err) { onError(err.message); } });
  q('paste').addEventListener('click', () => { const text = q('pastebox').value; if (text.trim()) reread({ kind: 'paste', name: T('pasted'), text, delim: null, header: true }); });
  if (!imp || !src) return;
  q('clear').addEventListener('click', () => { state.imp = null; state.src = null; onChange(state); });
  q('header') && q('header').addEventListener('change', e => reread({ ...imp, header: e.target.checked }));
  q('sheet') && q('sheet').addEventListener('change', e => reread({ ...imp, sheet: e.target.value }));
  q('delim') && q('delim').addEventListener('change', e => reread({ ...imp, delim: e.target.value || null }));
  q('enc') && q('enc').addEventListener('change', e => reread({ ...imp, encoding: e.target.value }));
}
export { T as importT };
