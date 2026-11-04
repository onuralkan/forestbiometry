// Browser-local storage for the tools section (IndexedDB, falls back to memory).
// Nothing here leaves the browser. Keys in use:
//   'session:<tool>'     autosaved working state of a tool (survives reloads and language switches)
//   'dataset:approved'   the last dataset approved in the Data Checker (handoff to other tools; schema in docs/PROJECT.md §4b)
const DB = 'onuralkan-lab', OS = 'kv';
const mem = new Map();
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise(res => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(OS);
      r.onsuccess = () => res(r.result);
      r.onerror = () => res(null);
    } catch (e) { res(null); }
  });
  return dbp;
}
async function tx(mode, fn) {
  const d = await db();
  if (!d) return fn(null);
  return new Promise((res, rej) => {
    try { const t = d.transaction(OS, mode), s = t.objectStore(OS), r = fn(s); t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error); }
    catch (e) { rej(e); }
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
export async function del(key) {
  try { const d = await db(); mem.delete(key); if (d) await tx('readwrite', s => s.delete(key)); } catch (e) { mem.delete(key); }
}
