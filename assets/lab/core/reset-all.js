// Reset every tool session at once, and the active data package (MR-003; moved from the home page to the tools on
// 20 Nov 2026, user decision). On every tool page a red button stands next to the tool's own "Reset session" button
// (#reset); pages without one get it at the end of the page. What it deletes is unchanged:
//   - every 'session:<tool>' key (the same keys each tool's own reset deletes): loaded tables, settings, results;
//   - the active data package: 'project:active', 'dataset:approved' and the active project (as projects.deleteProject).
// Other kept packages, the coefficient library, downloaded files and preferences (theme, language, recent tools) stay.
// The open tool must not write its session back: store.js holds every 'session:' write once the reset has started
// (globalThis.__fbSessionsHeld), then the page reloads into the tools' starting state.
import { get, del, keys } from './store.js';

const tr = document.documentElement.lang !== 'en';
const T = tr ? {
  sessions: 'Tüm araç oturumlarını sıfırla', both: 'Tüm oturumları ve etkin paketi sil',
  titleS: 'Bütün araçların kayıtlı oturumlarını siler (bu aracınki de dahil).', titleB: 'Bütün araçların kayıtlı oturumlarını ve etkin veri paketini siler.',
  none: 'Silinecek kayıtlı oturum ya da etkin paket yok.', unnamed: 'adsız paket',
  pkg: p => `\n\nEtkin veri paketi "${p}" etkisizleştirilip bu tarayıcıdan SİLİNECEK; araçlar onaylanmış veri görmez. Gerekiyorsa önce Envanter Verisi Yöneticisi'nden yedek alın.`,
  ask: (n, pk) => `Bütün araçların kayıtlı oturumları (${n}) silinecek: yüklenen tablolar, ayarlar ve sonuçlar; bu araç dahil her araç başlangıç durumunda açılır.${pk}\n\nEnvanter Verisi Yöneticisi'ndeki öteki paketler, Katsayı Kütüphanesi ve indirdiğiniz dosyalar silinmez. Başka bir sekmede açık araç varsa önce onu kapatın; yoksa o araç oturumunu yeniden kaydeder.\n\nBu işlem geri alınamaz. Devam edilsin mi?`,
  done: (n, p) => `${n} araç oturumu sıfırlandı${p ? ', etkin veri paketi silindi' : ''}. Araç başlangıç durumunda.`,
} : {
  sessions: 'Reset all tool sessions', both: 'Delete all sessions and the active package',
  titleS: 'Deletes the saved sessions of all tools (this one included).', titleB: 'Deletes the saved sessions of all tools and the active data package.',
  none: 'No saved session or active package to delete.', unnamed: 'unnamed package',
  pkg: p => `\n\nThe active data package "${p}" will be deactivated and DELETED from this browser; the tools will see no approved data. Make a backup in the Inventory Data Manager first if you need it.`,
  ask: (n, pk) => `The saved sessions of all tools (${n}) will be deleted: loaded tables, settings and results; every tool, this one included, opens in its starting state.${pk}\n\nOther packages in the Inventory Data Manager, the Coefficient Library and files you downloaded are not deleted. Close any tool open in another tab first; otherwise it saves its session again.\n\nThis cannot be undone. Continue?`,
  done: (n, p) => `${n} tool session(s) reset${p ? ', active data package deleted' : ''}. The tool is in its starting state.`,
};
const DONE = 'fb-reset-all-done';

/** What the reset would delete now: session keys, the active project id and the active package's name (or null). */
export async function scan() {
  const k = await keys('session:'), ds = await get('dataset:approved'), id = await get('project:active'), p = id ? await get('project:' + id) : null;
  const pkg = ds || p ? (p && p.name) || (ds && ds.source && ds.source.trees && ds.source.trees.name) || T.unnamed : null;
  return { k, id, pkg };
}
/** Deletes what scan() found. Session writes of this page are held first, so the open tool cannot write its state back. */
export async function wipe(s) {
  globalThis.__fbSessionsHeld = true;
  for (const x of s.k) await del(x);
  if (s.id) await del('project:' + s.id);
  await del('project:active'); await del('dataset:approved');
}

const buttons = new Set();
async function refresh() {
  const s = await scan(), any = s.k.length > 0 || !!s.pkg;
  for (const b of buttons) {
    if (!b.isConnected) { buttons.delete(b); continue; }
    const label = s.pkg ? T.both : T.sessions;                  // only real changes: a rewrite would wake the observer again
    if (b.textContent !== label) b.textContent = label;
    b.title = any ? (s.pkg ? T.titleB : T.titleS) : T.none; b.disabled = !any;
  }
}
function button() {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'btn danger b-resetall'; b.textContent = T.sessions;
  b.addEventListener('click', async () => {
    const s = await scan();
    if (!s.k.length && !s.pkg) { refresh(); return; }
    if (!confirm(T.ask(s.k.length, s.pkg ? T.pkg(s.pkg) : ''))) return;   // cancelled: nothing is written or deleted
    await wipe(s);
    try { sessionStorage.setItem(DONE, JSON.stringify({ n: s.k.length, p: !!s.pkg })); } catch (e) {}
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
    const d = JSON.parse(sessionStorage.getItem(DONE) || 'null');
    if (d) {
      sessionStorage.removeItem(DONE);
      const p = document.createElement('p'); p.className = 'note ok small'; p.id = 'resetall-done'; p.setAttribute('role', 'status'); p.textContent = T.done(d.n, d.p);
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
