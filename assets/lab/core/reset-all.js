// Reset the whole site in this browser, like a factory reset (MR-003; on the tool pages since 20 Nov 2026; made a full
// reset the same day, user decision: after it nothing the site keeps in this browser is left). On every tool page a red
// button stands next to the tool's own "Reset session" button (#reset); pages without one get it at the end of the page.
// After the confirmation it deletes:
//   - everything in the site's browser store (IndexedDB 'forestbiometry', core/store.js): every tool session, every data
//     package of the Inventory Data Manager and the active one, every coefficient set of the Coefficient Library;
//   - the site's preferences in localStorage: theme, sidebar width and open modules, recently used tools.
// Kept: files you downloaded (they are not in the browser store) and the language (a cookie; the page reloads in it).
// The open tool must not write anything back: store.js holds every write once the reset has started
// (globalThis.__fbSessionsHeld), then the page reloads into the tools' starting state.
import { get, del, keys } from './store.js';

const T = {
  label: 'Delete all data and reset the site', title: 'Deletes everything the site keeps in this browser: sessions, data packages, coefficient sets and preferences.',
  none: 'Nothing to delete in this browser.', unnamed: 'unnamed package',
  ask: s => `The site will return to the state of its first visit in this browser. To be DELETED:\n`
    + `• the sessions of all tools (${s.sessions}): loaded tables, settings, results\n`
    + `• the data packages of the Inventory Data Manager (${s.packages})${s.pkg ? `, the active package "${s.pkg}" included` : ''}\n`
    + `• the coefficient sets of the Coefficient Library (${s.coefs})\n`
    + `• preferences: theme, sidebar, recently used tools\n\n`
    + `Files you downloaded and the language stay. To keep packages and coefficient sets, download backups from the Inventory Data Manager and the Coefficient Library first. Close any tool open in another tab first; otherwise it saves its session again.\n\n`
    + `This cannot be undone. Continue?`,
  done: 'The site was reset: sessions, data packages, coefficient sets and preferences deleted. The tool is in its starting state.',
};
const DONE = 'fb-reset-all-done', PREFS = ['theme', 'side', 'sideMods', 'recentTools'];
const isPkg = k => k.startsWith('project:') && k !== 'project:active';

/** Everything the site keeps in this browser: store keys (with counts by kind), the active package's name, preferences. */
export async function scan() {
  const all = await keys(''), ds = await get('dataset:approved'), id = await get('project:active'), p = id ? await get('project:' + id) : null;
  const pkg = ds || p ? (p && p.name) || (ds && ds.source && ds.source.trees && ds.source.trees.name) || T.unnamed : null;
  let prefs = []; try { prefs = PREFS.filter(k => localStorage.getItem(k) !== null); } catch (e) {}
  return { all, pkg, prefs, sessions: all.filter(k => k.startsWith('session:')).length, packages: all.filter(isPkg).length, coefs: all.filter(k => k.startsWith('coef:')).length };
}
/** Deletes everything scan() found. Every store write of this page is held first, so the open tool cannot write back. */
export async function wipe(s) {
  globalThis.__fbSessionsHeld = true;
  for (const x of s.all) await del(x);
  for (const x of await keys('')) await del(x);          // anything written meanwhile
  try { for (const k of PREFS) localStorage.removeItem(k); } catch (e) {}
}

const buttons = new Set();
async function refresh() {
  // recently used tools are written by every tool page on load, so they alone do not enable the button
  const s = await scan(), any = s.all.length > 0 || s.prefs.some(k => k !== 'recentTools');
  for (const b of buttons) {
    if (!b.isConnected) { buttons.delete(b); continue; }
    if (b.textContent !== T.label) b.textContent = T.label;    // only real changes: a rewrite would wake the observer again
    b.title = any ? T.title : T.none; b.disabled = !any;
  }
}
function button() {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'btn danger b-resetall'; b.textContent = T.label;
  b.addEventListener('click', async () => {
    const s = await scan();
    if (!s.all.length && !s.prefs.some(k => k !== 'recentTools')) { refresh(); return; }
    if (!confirm(T.ask(s))) return;                              // cancelled: nothing is written or deleted
    await wipe(s);
    try { sessionStorage.setItem(DONE, '1'); } catch (e) {}
    location.reload();
  });
  buttons.add(b); return b;
}
/** Next to every #reset (in one group with it, so the two stay together and wrap together); else at the end of main. */
function place() {
  let added = false;
  const r = document.getElementById('reset');
  if (r && !(r.parentElement.classList.contains('b-resetgrp') && r.parentElement.querySelector('.b-resetall'))) {
    const g = document.createElement('span'); g.className = 'b-resetgrp';
    r.replaceWith(g); g.append(r, button()); added = true;
  }
  if (r) document.querySelectorAll('.b-resetrow').forEach(x => x.remove());
  const main = document.getElementById('main');
  if (!r && main && !document.querySelector('.b-resetall')) {
    const row = document.createElement('div'); row.className = 'b-resetrow'; row.append(button());
    main.append(row); added = true;
  }
  if (added) refresh();
}

export function mount() {
  if (!document.body.dataset.tool) return;                     // tool pages only (inc/site.php marks them)
  try {
    if (sessionStorage.getItem(DONE)) {
      sessionStorage.removeItem(DONE);
      const p = document.createElement('p'); p.className = 'note ok small'; p.id = 'resetall-done'; p.setAttribute('role', 'status'); p.textContent = T.done;
      const st = document.getElementById('status'); (st ? st.parentElement : document.getElementById('main')).insertBefore(p, st || null);
    }
  } catch (e) {}
  place();
  // the tool redraws after it loads or changes data (and saves its session): place the button again and read the state anew
  let t = 0;
  new MutationObserver(() => { place(); clearTimeout(t); t = setTimeout(refresh, 250); }).observe(document.getElementById('main') || document.body, { childList: true, subtree: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
}
mount();
