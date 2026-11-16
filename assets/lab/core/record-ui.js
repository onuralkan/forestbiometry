// Run-record downloads for the tool pages (DI-07). The record itself is built in core/record.js; this file adds what
// only the page knows: the deployed commit and catalogue ids (#cite-data, inc/site.php), the interface language and
// the "include the input data" choice, shared by every JSON button of the page and remembered in this browser.
import { makeT, lang, esc } from './i18n.js';
import { makeRecord, describeInput } from './record.js';
import { download } from './export.js';

const T = makeT({
  tr: { embed: 'Girdi verisini kayda ekle', embedHelp: 'İşaretli değilse JSON kaydında girdi dosyalarının yalnızca SHA-256 parmak izi bulunur; işaretliyse verinin kendisi de girer ve kayıt tek başına yeniden üretilebilir. Kaydı paylaşırsanız veriyi de paylaşmış olursunuz.',
    fail: 'Kayıt hazırlanamadı', btn: 'Çalışma kaydı (JSON)' },
  en: { embed: 'Include the input data in the record', embedHelp: 'Unchecked, the JSON record holds only the SHA-256 fingerprint of each input file; checked, the data itself goes in too and the record reproduces on its own. If you share the record, you share the data.',
    fail: 'The record could not be prepared', btn: 'Run record (JSON)' },
});
const PREF = 'recEmbed';
let pref = false;
try { pref = localStorage.getItem(PREF) === '1'; } catch (e) { /* private window */ }

function page() {
  try { return JSON.parse(document.getElementById('cite-data').textContent); } catch (e) { return {}; }
}
export const embedOn = () => pref;

/** Checkbox for the "include input data" choice; put it next to a JSON button. All copies on the page stay in step. */
export function recordOption() {
  return `<label class="chk rec-embed" title="${esc(T('embedHelp'))}"><input type="checkbox" data-rec-embed${pref ? ' checked' : ''}> ${T('embed')}</label>`;
}
/** A run-record button (for tools whose own strings have no JSON label) with the data option. */
export const recordButton = id => `<button type="button" class="btn ghost" id="${id}">${T('btn')}</button>${recordOption()}`;
if (typeof document !== 'undefined') document.addEventListener('change', e => {
  const b = e.target.closest && e.target.closest('[data-rec-embed]'); if (!b) return;
  pref = b.checked;
  document.querySelectorAll('[data-rec-embed]').forEach(x => { x.checked = pref; });
  try { localStorage.setItem(PREF, pref ? '1' : '0'); } catch (err) { /* ignore */ }
});

/**
 * Builds the run record of a result and downloads it. payload: the tool's own JSON object (kept as it was);
 * tool: { id, version }; inputs: [[role, importState | { kind:'dataset', dataset } | { kind:'table', name, value }], …].
 * Returns the record (tests, the verifier page).
 */
export async function buildRecord(payload, tool, inputs = []) {
  const d = page(), embed = pref;
  const desc = [];
  for (const [role, src] of inputs) desc.push(await describeInput(role, src, embed));
  return makeRecord(payload, { tool, ids: d.ids || [], page: d.tool ? d.tool.file : null, commit: d.commit || null, site: d.base || null, lang, inputs: desc });
}
export async function downloadRecord(name, payload, tool, inputs = [], onError) {
  try {
    const rec = await buildRecord(payload, tool, inputs);
    download(name, JSON.stringify(rec, null, 1), 'application/json');
    return rec;
  } catch (e) {
    const m = T('fail') + (e && e.message ? ': ' + e.message : '');
    if (onError) onError(m); else console.error(m, e);
    return null;
  }
}
