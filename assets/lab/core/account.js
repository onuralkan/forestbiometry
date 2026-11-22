// Account state of the visitor for the page's scripts (22 Nov 2026): fetched once from api/interpret.php (signed in,
// status, use, form token), and the key that identifies a result summary on the server (an interpretation and a saved
// result of the same summary are linked by it). Used by core/interpret.js and core/record-ui.js.
let st = null;
export const state = () => st || {};

export async function getState(force = false) {
  if (st && !force) return st;
  if (!document.body.dataset.ai) return st = { configured: false };   // inc/site.php marks pages of a server with the service
  try { const r = await fetch('api/interpret.php', { credentials: 'same-origin', headers: { Accept: 'application/json' } }); st = r.ok ? await r.json() : { configured: false }; }
  catch (e) { st = { configured: false }; }
  return st;
}
// the record's own time stamp changes on every call: it is not part of what identifies a result
export const keyOf = o => { const s = JSON.stringify({ ...o, created: undefined }); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return s.length + ':' + h; };
