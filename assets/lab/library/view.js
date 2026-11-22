// A saved run record shown as tables (22 Nov 2026, user decision; Account → Saved results). Tools with their own view
// (VIEWS) draw their result as in the tool; every other tool gets the generic view: the settings as a list and every
// table of the record (arrays of objects) as a table, nested parts as sections. Pure HTML strings, no DOM (tests:
// tests/library/test_view.mjs). Nothing is computed: values are shown as the record holds them.
import { esc } from '../core/i18n.js';
import { viewRecord as evalView } from '../eval/view.js';
import { viewRecord as distView } from '../dist/view.js';
import { viewRecord as rankView } from '../rank/view.js';
import { viewRecord as standView } from '../stand/view.js';
import { viewRecord as hdView } from '../hd/view.js';

export const VIEWS = { 'model-degerlendirme': evalView, 'cap-dagilimi': distView, 'nispi-siralama': rankView, 'ornek-alan-mescere': standView, 'boy-cap': hdView };
const ENVELOPE = ['format', 'tool', 'build', 'created', 'lang', 'inputs', 'integrity'];
const MAX_ROWS = 200, MAX_COLS = 16, MAX_DEPTH = 4;

/** Number as text: up to 6 significant digits, exponent only for very small or large sizes. */
export function num(x) {
  if (Number.isInteger(x)) return String(x);
  const a = Math.abs(x);
  if (a !== 0 && (a < 1e-4 || a >= 1e9)) return x.toExponential(4);
  return String(Number(x.toPrecision(6)));
}
const isObj = v => v != null && typeof v === 'object' && !Array.isArray(v);
const isPrim = v => v == null || typeof v !== 'object';
const isTable = v => Array.isArray(v) && v.length > 0 && v.every(x => isObj(x));
/** "dClass" / "d_mean" / "rankBootstrap" → "D class" / "D mean" / "Rank bootstrap". */
export function label(k) {
  const s = String(k).replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, (m, a, b) => a + ' ' + b.toLowerCase()).trim();
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
/** One value as cell text (escaped). */
export function cell(v) {
  if (v == null || v === '') return '–';
  if (typeof v === 'number') return Number.isFinite(v) ? num(v) : esc(String(v));
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (Array.isArray(v)) {
    if (v.every(isPrim)) return v.length > 24 ? esc(`${v.slice(0, 24).map(x => typeof x === 'number' ? num(x) : x ?? '–').join('; ')} … (${v.length} values)`) : esc(v.map(x => typeof x === 'number' ? num(x) : x ?? '–').join('; '));
    return esc(`${v.length} items`);
  }
  if (isObj(v)) { const e = Object.entries(v); return e.every(([, x]) => isPrim(x)) && e.length <= 6 ? esc(e.map(([k, x]) => `${k}: ${typeof x === 'number' ? num(x) : x ?? '–'}`).join(', ')) : esc(`${e.length} fields`); }
  return esc(String(v));
}
/** Columns of a table: primitive fields, and primitive fields one level down ("overall.rmse"). */
function columns(rows) {
  const out = [], add = p => { if (!out.includes(p)) out.push(p); };
  for (const r of rows) for (const [k, v] of Object.entries(r)) {
    if (isPrim(v) || (Array.isArray(v) && v.length && v.every(isPrim) && !rows.some(o => isTable(o[k])))) add(k);
    else if (isObj(v) && Object.values(v).every(x => isPrim(x) || (Array.isArray(x) && x.every(isPrim)))) for (const k2 of Object.keys(v)) add(k + '.' + k2);
  }
  return out.slice(0, MAX_COLS);
}
const at = (o, p) => p.split('.').reduce((a, k) => a == null ? undefined : a[k], o);
function table(rows, title, depth) {
  const cols = columns(rows), shown = rows.slice(0, MAX_ROWS);
  let h = `<div class="tscroll"><table class="grid rv-table"><thead><tr>${cols.map(c => `<th>${esc(c.split('.').map(label).join(' · '))}</th>`).join('')}</tr></thead><tbody>`
    + shown.map(r => `<tr>${cols.map(c => { const v = at(r, c); return `<td${typeof v === 'number' ? ' class="num"' : ''}>${cell(v)}</td>`; }).join('')}</tr>`).join('') + '</tbody></table></div>';
  if (rows.length > shown.length) h += `<p class="muted small">First ${shown.length} of ${rows.length} rows; the whole table is in the run record.</p>`;
  // nested tables and sections of the rows (e.g. each fit's own table), under the row's name
  if (depth < MAX_DEPTH) shown.forEach((r, i) => {
    const name = r.name ?? r.label ?? r.id ?? r.form ?? r.family ?? `${title} ${i + 1}`;
    for (const [k, v] of Object.entries(r)) if (!cols.some(c => c === k || c.startsWith(k + '.')) && (isTable(v) || (isObj(v) && Object.keys(v).length))) h += section(v, `${name} · ${label(k)}`, depth + 1);
  });
  return h;
}
function section(v, title, depth) {
  const H = `h${Math.min(6, 3 + depth)}`;
  if (isTable(v)) return `<${H}>${esc(title)}</${H}>` + table(v, title, depth);
  if (!isObj(v)) return '';
  const prim = Object.entries(v).filter(([, x]) => isPrim(x) || (Array.isArray(x) && !isTable(x)) || (isObj(x) && Object.values(x).every(isPrim) && Object.keys(x).length <= 6));
  const rest = Object.entries(v).filter(([k]) => !prim.some(([p]) => p === k));
  let h = `<${H}>${esc(title)}</${H}>`;
  if (prim.length) h += `<dl class="kv small">${prim.map(([k, x]) => `<dt>${esc(label(k))}</dt><dd>${cell(x)}</dd>`).join('')}</dl>`;
  if (depth < MAX_DEPTH) for (const [k, x] of rest) h += section(x, label(k), depth + 1);
  else if (rest.length) h += `<p class="muted small">${rest.map(([k]) => esc(label(k))).join(', ')}: see the run record.</p>`;
  return h;
}
/** The generic view of a record's content (everything but the envelope). */
export function genericView(rec) {
  const body = Object.fromEntries(Object.entries(rec).filter(([k]) => !ENVELOPE.includes(k)));
  const top = Object.entries(body).filter(([, v]) => !(isTable(v) || (isObj(v) && Object.keys(v).length)));
  let h = '';
  if (body.settings) h += `<section class="rv-sec">${section(body.settings, 'Settings', 0)}</section>`;
  if (top.length) h += `<section class="rv-sec"><h3>Values</h3><dl class="kv small">${top.map(([k, v]) => `<dt>${esc(label(k))}</dt><dd>${cell(v)}</dd>`).join('')}</dl></section>`;
  for (const [k, v] of Object.entries(body)) if (k !== 'settings' && (isTable(v) || (isObj(v) && Object.keys(v).length))) h += `<section class="rv-sec">${section(v, label(k), 0)}</section>`;
  return h || '<p class="muted">The record holds no result tables.</p>';
}
/** The record's inputs (fingerprints only). */
export function inputsView(rec) {
  const ins = Array.isArray(rec.inputs) ? rec.inputs : [];
  if (!ins.length) return '';
  return `<h3>Inputs</h3><div class="tscroll"><table class="grid" id="rv-inputs"><thead><tr><th>Role</th><th>Kind</th><th>Name</th><th>Rows</th><th>SHA-256</th></tr></thead><tbody>${ins.map(i => `<tr><td>${esc(i.role)}</td><td>${esc(i.kind)}</td><td>${esc(i.name ?? '–')}</td><td class="num">${i.rows ?? '–'}</td><td><code class="small">${esc(String(i.sha256 || '–').slice(0, 16))}…</code></td></tr>`).join('')}</tbody></table></div>`;
}
/** → { html, kind: 'tool' | 'generic' }; a tool view that fails or has nothing to show falls back to the generic view. */
export function viewOf(rec) {
  const v = VIEWS[rec && rec.tool && rec.tool.id];
  // a tool view returns HTML, or { html, rest: [keys] } to leave parts of the record to the generic view
  if (v) { try { const h = v(rec); if (h) { if (typeof h === 'string') return { html: h, kind: 'tool' };
    const part = Object.fromEntries((h.rest || []).filter(k => rec[k] != null && !(Array.isArray(rec[k]) && !rec[k].length)).map(k => [k, rec[k]]));
    return { html: h.html + (Object.keys(part).length ? `<details class="rv-rest"><summary>${esc(Object.keys(part).map(label).join(', '))}</summary>${genericView(part)}</details>` : ''), kind: 'tool' }; } } catch (e) { console.error('record view', e); } }
  return { html: genericView(rec || {}), kind: 'generic' };
}
