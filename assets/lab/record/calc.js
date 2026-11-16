// Record Verifier (DI-07): page logic without DOM. Checking itself lives in core/record.js (shared with the tools).
export const TOOL = { id: 'kayit-dogrulayici', version: '1.0.0-beta.1' };
export const REPO = 'https://github.com/onuralkan/forestbiometry';

/**
 * The tool that wrote a record, against the tools of this site (tools = [{ file, v, title, ids }]): the page named in
 * the record (DI-07), else a page named after the tool id (JSON files written before DI-07). →
 * { tool: entry | null, state: 'same' | 'changed' | 'unknown', recorded, current }
 */
export function toolStatus(rec, tools) {
  const t = rec && rec.tool || {}, page = t.page || (t.id ? t.id + '.php' : null);
  const cur = tools.find(x => x.file === page) || null;
  if (!cur) return { tool: null, state: 'unknown', recorded: t.version || null, current: null };
  return { tool: cur, state: cur.v === t.version ? 'same' : 'changed', recorded: t.version || null, current: cur.v };
}
/** Top-level content of a record besides the envelope: [{ key, kind: 'object'|'array'|'value', size }]. */
export function contentKeys(obj, reserved) {
  return Object.entries(obj || {}).filter(([k]) => !reserved.includes(k)).map(([k, v]) => ({ key: k, kind: Array.isArray(v) ? 'array' : v && typeof v === 'object' ? 'object' : 'value',
    size: Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v).length : null }));
}
/** Commit link (40 hex digits only). */
export const commitURL = c => typeof c === 'string' && /^[0-9a-f]{40}$/.test(c) ? `${REPO}/commit/${c}` : null;
/** Human-readable size (decimal point on screen, as everywhere on the site). */
export const bytesText = n => n == null ? '–' : n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} kB` : `${(n / 1048576).toFixed(2)} MB`;
