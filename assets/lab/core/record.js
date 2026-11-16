// Reproducibility layer (DI-07): the shared run record 'run-record/1' that every tool writes as its JSON download.
// No DOM; runs in the browser and in Node (tests/record/test_di07.mjs). Uses only Web Crypto (crypto.subtle) and
// TextEncoder, both standard in browsers (secure context) and in Node ≥ 19.
//
// A record is the tool's own JSON payload with reserved envelope keys added at the top level (old keys stay, so
// files written before DI-07 keep their shape):
//   format    'run-record/1'
//   tool      { id, version, ids: [catalogue ids], page }
//   build     { commit: git commit of the deployed site | null (development), site: canonical URL }
//   created   ISO time, lang 'tr'|'en'
//   inputs    [{ role, kind: 'file'|'paste'|'dataset'|'table', name?, bytes?, sha256, …, data?: { encoding, value } }]
//   integrity { algorithm: 'SHA-256', canonicalization: 'RFC 8785 (JCS)', value }: digest of the canonical record
//             without the integrity key. It shows whether the file was changed after download (no signature: anyone
//             can recompute it, so it detects accidents and edits, not forgery).
// Fingerprints: a file → SHA-256 of its bytes exactly as read; pasted text → SHA-256 of its UTF-8 bytes; a JSON
// object (approved data set, table typed into the page) → SHA-256 of its canonical form (RFC 8785).

export const FORMAT = 'run-record/1';
export const RESERVED = ['format', 'tool', 'build', 'created', 'lang', 'inputs', 'integrity'];
const enc = new TextEncoder();

/** JSON as it is written to a file and read back: undefined dropped, non-finite numbers → null, dates → strings. */
export const normalize = v => v === undefined ? null : JSON.parse(JSON.stringify(v));

/**
 * RFC 8785 JSON Canonicalization Scheme of a JSON value (call normalize() first for arbitrary JS values):
 * no whitespace, object keys sorted by UTF-16 code units, numbers in ECMAScript shortest form, strings escaped as
 * JSON.stringify does (ES2019 well-formed).
 */
export function canonical(v) {
  if (v === null || typeof v === 'boolean') return String(v);
  if (typeof v === 'number') { if (!Number.isFinite(v)) throw new Error('JCS: non-finite number'); return JSON.stringify(v); }
  if (typeof v === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (typeof v === 'object') {
    const keys = Object.keys(v).filter(k => v[k] !== undefined).sort();   // default sort = UTF-16 code-unit order
    return '{' + keys.map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
  }
  throw new Error('JCS: unsupported value');
}

const toBytes = x => typeof x === 'string' ? enc.encode(x) : x instanceof ArrayBuffer ? new Uint8Array(x) : ArrayBuffer.isView(x) ? new Uint8Array(x.buffer, x.byteOffset, x.byteLength) : null;
/** SHA-256 of bytes (ArrayBuffer, typed array) or of a string's UTF-8 bytes → lower-case hex. */
export async function sha256Hex(x) {
  const b = toBytes(x); if (!b) throw new Error('sha256: bytes or string expected');
  const d = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', b));
  return Array.from(d, n => n.toString(16).padStart(2, '0')).join('');
}
/** Fingerprint of a JSON value: SHA-256 of its canonical form. */
export const sha256JSON = v => sha256Hex(canonical(normalize(v)));

/** Base64 of bytes (chunked, no stack overflow on large files) and back. */
export function toBase64(x) {
  const b = toBytes(x); let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(s);
}
export function fromBase64(s) { const t = atob(s), b = new Uint8Array(t.length); for (let i = 0; i < t.length; i++) b[i] = t.charCodeAt(i); return b; }

/**
 * Input descriptor from an import state of core/importer.js (imp = { kind: 'csv'|'xlsx'|'paste'|'dataset', … }),
 * or from { kind: 'dataset', dataset } / { kind: 'table', name, value }. role: what the input is for ('trees',
 * 'plots', 'stems', 'data'…). embed: put the data into the record so that it reproduces on its own.
 */
export async function describeInput(role, src, embed = false) {
  if (!src) return null;
  if (src.kind === 'csv' || src.kind === 'xlsx') {
    const b = toBytes(src.buf);
    const d = { role, kind: 'file', name: src.name, format: src.kind, bytes: b.length, sha256: await sha256Hex(b) };
    if (src.kind === 'csv') Object.assign(d, { encoding: src.encoding || 'utf-8', delimiter: src.delim || src.detected || null });
    else d.sheet = src.sheet || null;
    if (src.header != null) d.header = !!src.header;
    if (embed) d.data = { encoding: 'base64', value: toBase64(b) };
    return d;
  }
  if (src.kind === 'paste') {
    const t = String(src.text ?? '');
    const d = { role, kind: 'paste', name: src.name || null, chars: t.length, bytes: enc.encode(t).length, sha256: await sha256Hex(t), delimiter: src.delim || src.detected || null };
    if (src.header != null) d.header = !!src.header;
    if (embed) d.data = { encoding: 'utf-8', value: t };
    return d;
  }
  if ((src.kind === 'dataset' && !src.dataset) || (src.kind === 'table' && src.value === undefined)) return null;   // e.g. an import state that only names the data set
  if (src.kind === 'dataset' || src.kind === 'table') {
    const v = normalize(src.kind === 'dataset' ? src.dataset : src.value);
    const d = { role, kind: src.kind, name: src.name || null, sha256: await sha256JSON(v) };
    if (src.kind === 'dataset' && v) Object.assign(d, { schema: v.schema || null, created: v.created || null, trees: Array.isArray(v.trees) ? v.trees.length : null });
    if (embed) d.data = { encoding: 'json', value: v };
    return d;
  }
  return null;
}

/**
 * The record: payload (the tool's own JSON object) + envelope. ctx = { tool: {id, version}, ids, page, commit, site,
 * lang, created?, inputs: [descriptors] }. Returns a sealed, normalized object (async: digest).
 */
export async function makeRecord(payload, ctx) {
  const p = normalize(payload || {});
  const rec = {
    format: FORMAT,
    tool: { ...(p.tool || {}), id: ctx.tool.id, version: ctx.tool.version, ids: ctx.ids || [], page: ctx.page || null },
    build: { commit: ctx.commit || null, site: ctx.site || null },
    created: ctx.created || p.created || new Date().toISOString(),
    lang: ctx.lang || null,
    inputs: (ctx.inputs || []).filter(Boolean),
  };
  for (const [k, v] of Object.entries(p)) if (!RESERVED.includes(k)) rec[k] = v;
  return seal(rec);
}
/** Adds (or replaces) the integrity digest. */
export async function seal(rec) {
  const { integrity, ...body } = normalize(rec);
  return { ...body, integrity: { algorithm: 'SHA-256', canonicalization: 'RFC 8785 (JCS)', value: await sha256Hex(canonical(body)) } };
}

/**
 * Checks a parsed JSON file. → { kind: 'record'|'legacy'|'other', format, tool, created, build, seal: true|false|null,
 * expected, actual, inputs: [{ …descriptor without data, embedded: bool, embeddedOk: true|false|null }], problems: [codes] }
 * 'legacy': a tool's JSON written before DI-07 (tool + created, no envelope); 'other': not a run record.
 */
export async function verifyRecord(obj) {
  const out = { kind: 'other', format: null, tool: null, created: null, build: null, seal: null, expected: null, actual: null, inputs: [], problems: [] };
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) { out.problems.push('not-object'); return out; }
  out.tool = obj.tool && typeof obj.tool === 'object' ? obj.tool : null; out.created = obj.created || null;
  if (obj.format !== FORMAT) {
    if (typeof obj.format === 'string' && /^run-record\//.test(obj.format)) { out.format = obj.format; out.problems.push('format-version'); return out; }
    if (obj.schema) out.problems.push('other-schema');                     // a data format (forest-dataset/1, model-coef…), even with a tool field
    else if (out.tool && out.tool.id) { out.kind = 'legacy'; out.problems.push('no-envelope'); }
    else out.problems.push('not-record');
    out.format = obj.schema || null;
    return out;
  }
  out.kind = 'record'; out.format = FORMAT; out.build = obj.build || null;
  if (!out.tool || !out.tool.id || !out.tool.version) out.problems.push('tool-missing');
  if (!Array.isArray(obj.inputs)) out.problems.push('inputs-missing');
  if (obj.integrity && typeof obj.integrity.value === 'string') {
    const { integrity, ...body } = obj;
    out.expected = obj.integrity.value.toLowerCase();
    try { out.actual = await sha256Hex(canonical(body)); out.seal = out.actual === out.expected; }
    catch (e) { out.seal = false; out.problems.push('not-canonical'); }
    if (out.seal === false) out.problems.push('seal-mismatch');
  } else out.problems.push('seal-missing');
  for (const inp of Array.isArray(obj.inputs) ? obj.inputs : []) {
    const { data, ...d } = inp || {};
    const r = { ...d, embedded: !!(data && data.value != null), embeddedOk: null };
    if (r.embedded) {
      try { r.embeddedOk = (await embeddedHash(data)) === String(d.sha256 || '').toLowerCase(); } catch (e) { r.embeddedOk = false; }
      if (!r.embeddedOk) out.problems.push('embedded-mismatch');
    }
    out.inputs.push(r);
  }
  return out;
}
async function embeddedHash(data) {
  if (data.encoding === 'base64') return sha256Hex(fromBase64(data.value));
  if (data.encoding === 'utf-8') return sha256Hex(String(data.value));
  if (data.encoding === 'json') return sha256JSON(data.value);
  throw new Error('encoding');
}
/** The embedded data of an input as { name, bytes: Uint8Array, type } for download, or null. */
export function embeddedFile(inp) {
  const data = inp && inp.data; if (!data || data.value == null) return null;
  const base = inp.name || inp.role || 'input';
  if (data.encoding === 'base64') return { name: base, bytes: fromBase64(data.value), type: inp.format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/plain' };
  if (data.encoding === 'utf-8') return { name: base.replace(/\.[a-z0-9]+$/i, '') + '.txt', bytes: enc.encode(String(data.value)), type: 'text/plain' };
  if (data.encoding === 'json') return { name: base.replace(/\.json$/i, '') + '.json', bytes: enc.encode(JSON.stringify(data.value, null, 1)), type: 'application/json' };
  return null;
}

/**
 * Fingerprints of a file the user offers for comparison: its bytes, and, if it is JSON, its canonical form too (an
 * approved data set downloaded from the Data Checker matches a 'dataset' input). → [hex…]
 */
export async function fileFingerprints(bytes) {
  const b = toBytes(bytes), out = [await sha256Hex(b)];
  try { out.push(await sha256JSON(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(b).replace(/^﻿/, '')))); } catch (e) { /* not JSON */ }
  return out;
}
/** Which inputs of a record (verifyRecord(...).inputs) a fingerprint list matches: indices. */
export const matchInputs = (inputs, fps) => inputs.map((x, i) => fps.includes(String(x.sha256 || '').toLowerCase()) ? i : -1).filter(i => i >= 0);
