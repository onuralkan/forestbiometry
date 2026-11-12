// Browser-local storage for the tools section (IndexedDB, falls back to memory).
// Nothing here leaves the browser. Keys in use:
//   'session:<tool>'     autosaved working state of a tool (survives reloads and language switches)
//   'dataset:approved'   the last dataset approved in the Data Checker (handoff to other tools; schema in docs/PROJECT.md §4b)
//   'coef:<id>'          one coefficient set of the shared coefficient library (model-coef/1, core/coef.js; TOOLS_SPEC §1.3)
const DB = 'forestbiometry', OS = 'kv';
// IndexedDB can stall without an error (a stuck backing store, another tab holding the database, a blocked open);
// every tool waits for its saved session before the first draw, so each step has a time limit and then falls back
// to memory for this page load: the page opens with an empty session instead of staying blank.
const OPEN_MS = 2500, TX_MS = 4000;
const mem = new Map();
let dbp = null;
/** false when this page load fell back to memory (nothing is kept after a reload). */
export let persistent = true;
function fallback(why) { if (persistent) { persistent = false; try { console.warn('store: IndexedDB unavailable (' + why + '); using memory for this page'); } catch (e) {} } return null; }
function db() {
  if (dbp) return dbp;
  dbp = new Promise(res => {
    let done = false;
    const finish = v => { if (!done) { done = true; clearTimeout(timer); res(v); } return done; };
    const timer = setTimeout(() => finish(fallback('open timed out')), OPEN_MS);
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(OS);
      r.onsuccess = () => {
        const d = r.result;
        d.onversionchange = () => d.close(); // never hold up a newer page that upgrades the database
        if (done) d.close(); else finish(d);   // opened after the time limit: this page already uses memory
      };
      r.onerror = () => finish(fallback('open failed'));
      r.onblocked = () => finish(fallback('open blocked'));
    } catch (e) { finish(fallback('no IndexedDB')); }
  });
  return dbp;
}
async function tx(mode, fn) {
  const d = await db();
  if (!d) return fn(null);
  return new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error('transaction timed out')), TX_MS);
    try {
      const t = d.transaction(OS, mode), s = t.objectStore(OS), r = fn(s);
      t.oncomplete = () => { clearTimeout(timer); res(r && r.result); };
      t.onerror = t.onabort = () => { clearTimeout(timer); rej(t.error || new Error('transaction aborted')); };
    } catch (e) { clearTimeout(timer); rej(e); }
  });
}
export async function put(key, value) {
  try { const d = await db(); if (!d) { mem.set(key, value); return; } await tx('readwrite', s => s.put(value, key)); }
  catch (e) { mem.set(key, value); }
}
export async function get(key) {
  try { const d = await db(); if (!d) return mem.get(key); return await tx('readonly', s => s.get(key)); }
  catch (e) { return mem.get(key); }
}
/** Keys starting with prefix, sorted (IndexedDB key range; the memory fallback is searched the same way). */
export async function keys(prefix = '') {
  const inMem = () => [...mem.keys()].filter(k => typeof k === 'string' && k.startsWith(prefix)).sort();
  try {
    const d = await db(); if (!d) return inMem();
    const range = prefix ? IDBKeyRange.bound(prefix, prefix + '\uffff') : undefined;
    const r = await tx('readonly', s => s.getAllKeys(range));
    return [...new Set([...(r || []), ...inMem()])].sort();
  } catch (e) { return inMem(); }
}
export async function del(key) {
  try { const d = await db(); mem.delete(key); if (d) await tx('readwrite', s => s.delete(key)); } catch (e) { mem.delete(key); }
}
