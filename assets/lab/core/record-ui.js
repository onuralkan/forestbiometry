// Run-record downloads for the tool pages (DI-07). The record itself is built in core/record.js; this file adds what
// only the page knows: the deployed commit and catalogue ids (#cite-data, inc/site.php), the interface language and
// the "include the input data" choice, shared by every JSON button of the page and remembered in this browser.
import { makeT, lang, esc } from './i18n.js';
import { makeRecord, describeInput } from './record.js';
import { download } from './export.js';
import { getState, keyOf } from './account.js';

const T = makeT({
  en: { embed: 'Include the input data in the record', embedHelp: 'Unchecked, the JSON record holds only the SHA-256 fingerprint of each input file; checked, the data itself goes in too and the record reproduces on its own. If you share the record, you share the data.',
    fail: 'The record could not be prepared', btn: 'Run record (JSON)',
    save: 'Save to my account', saveHelp: 'Keeps this result (settings and result tables, no input data; tree-level result tables can repeat measured values of each tree) in your account on this site: Account → Saved results.',
    saving: 'Saving…', saved: 'Saved to your account.', open: 'Open', notReady: 'Compute a result first.',
    'raw-data': 'Not saved: the record holds input data, which the server never keeps.', 'storage-full': 'Not saved: your account\'s storage is full; delete saved results first.',
    'too-large': 'Not saved: this result is larger than 2 MB.', rate: 'Too many saves in a minute; wait a moment.', signin: 'Your session has ended; sign in again.',
    pending: 'Your account is waiting for approval.', blocked: 'Your account cannot save results.', token: 'The page is out of date; reload it.', network: 'No connection to the server.', other: 'Not saved.' },
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
  // the save button shows only for approved accounts (inc/site.php sets body[data-acct]; lab.css)
  return `<label class="chk rec-embed" title="${esc(T('embedHelp'))}"><input type="checkbox" data-rec-embed${pref ? ' checked' : ''}> ${T('embed')}</label>`
    + `<button type="button" class="btn ghost rec-save" data-rec-save title="${esc(T('saveHelp'))}">${T('save')}</button><span class="rec-save-msg small" aria-live="polite"></span>`;
}
/** A run-record button (for tools whose own strings have no JSON label) with the data option. */
export const recordButton = id => `<button type="button" class="btn ghost" id="${id}">${T('btn')}</button>${recordOption()}`;
if (typeof document !== 'undefined') document.addEventListener('change', e => {
  const b = e.target.closest && e.target.closest('[data-rec-embed]'); if (!b) return;
  pref = b.checked;
  document.querySelectorAll('[data-rec-embed]').forEach(x => { x.checked = pref; });
  try { localStorage.setItem(PREF, pref ? '1' : '0'); } catch (err) { /* ignore */ }
});

/*
 * "Save to my account" (22 Nov 2026, user decision): presses the JSON button of the same export row in save mode, so the
 * tool builds its record exactly as for the download; downloadRecord() then sends it to api/library.php instead,
 * always without input data (the server refuses raw data).
 */
let saveTo = null;
if (typeof document !== 'undefined') document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-rec-save]'); if (!b) return;
  const msg = b.nextElementSibling, row = b.parentElement;
  const json = row && (row.querySelector('[id$="-json"]') || [...row.querySelectorAll('button:not([data-rec-save])')].reverse().find(x => /json/i.test(x.textContent)));
  if (!json || json.disabled) { if (msg) msg.textContent = T('notReady'); return; }
  saveTo = { b, msg }; json.click();
  if (saveTo) { saveTo = null; if (msg) msg.textContent = T('notReady'); }   // the tool did not build a record
});
async function saveRecord(rec, payload, to) {
  const say = (t, cls) => { if (to.msg) { to.msg.className = 'rec-save-msg small ' + (cls || ''); to.msg.innerHTML = t; } };
  to.b.disabled = true; say(esc(T('saving')), 'muted');
  let j;
  try {
    const st = await getState(true);
    const r = await fetch('api/library.php', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF': st.csrf || '' },
      body: JSON.stringify({ act: 'save', record: JSON.stringify(rec), key: keyOf(payload) }) });   // as text: kept byte for byte, the seal holds
    j = await r.json();
  } catch (e) { j = { error: 'network' }; }
  to.b.disabled = false;
  if (j && j.id) say(`${esc(T('saved'))} <a href="hesap.php?tab=results&amp;id=${esc(j.id)}">${esc(T('open'))}</a>`, 'ok');
  else say(esc(T(j && T(j.error) !== j.error ? j.error : 'other')), 'err');
  return j;
}

/**
 * Builds the run record of a result and downloads it. payload: the tool's own JSON object (kept as it was);
 * tool: { id, version }; inputs: [[role, importState | { kind:'dataset', dataset } | { kind:'table', name, value }], …].
 * Returns the record (tests, the verifier page).
 */
export async function buildRecord(payload, tool, inputs = [], embed = pref) {
  const d = page();
  const desc = [];
  for (const [role, src] of inputs) desc.push(await describeInput(role, src, embed));
  return makeRecord(payload, { tool, ids: d.ids || [], page: d.tool ? d.tool.file : null, commit: d.commit || null, site: d.base || null, lang, inputs: desc });
}
export async function downloadRecord(name, payload, tool, inputs = [], onError) {
  const to = saveTo; saveTo = null;
  try {
    const rec = await buildRecord(payload, tool, inputs, to ? false : pref);
    if (to) { await saveRecord(rec, payload, to); return rec; }
    download(name, JSON.stringify(rec, null, 1), 'application/json');
    return rec;
  } catch (e) {
    const m = T('fail') + (e && e.message ? ': ' + e.message : '');
    if (onError) onError(m); else console.error(m, e);
    return null;
  }
}
