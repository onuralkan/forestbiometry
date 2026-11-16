// Record Verifier (DI-07): user interface. Checking lives in core/record.js (shared with the tools' downloads),
// page logic in calc.js. Nothing leaves the browser.
import * as V from './calc.js';
import { T } from './i18n.js';
import { lang, esc } from '../core/i18n.js';
import { verifyRecord, fileFingerprints, matchInputs, embeddedFile, RESERVED } from '../core/record.js';
import { download } from '../core/export.js';

const $ = id => document.getElementById(id);
let TOOLS = [];
try { TOOLS = JSON.parse($('tools-data').textContent); } catch (e) { TOOLS = []; }

let rec = null, chk = null, fileName = '', checked = [];
function status(m, k = '') { const s = $('status'); s.className = 'status ' + k; s.textContent = m || ''; }
const roleText = r => { const k = 'role.' + r, t = T(k); return t === k ? String(r || '') : t; };
const short = h => h ? `<code title="${esc(h)}">${esc(h.slice(0, 12))}…${esc(h.slice(-6))}</code>` : '–';
const when = iso => { const d = new Date(iso); return isNaN(d) ? esc(iso || '–') : `${esc(d.toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-GB'))} <span class="muted small">(${esc(iso)})</span>`; };

function readingText(x) {
  const out = [];
  if (x.encoding) out.push(`${T('read.enc')} ${x.encoding}`);
  if (x.delimiter) out.push(`${T('read.delim')} ${x.delimiter === '\t' ? 'TAB' : x.delimiter}`);
  if (x.header != null) out.push(`${T('read.header')}: ${T(x.header ? 'yes' : 'no')}`);
  if (x.sheet) out.push(`${T('read.sheet')} ${x.sheet}`);
  if (x.schema) out.push(x.schema);
  if (x.trees != null) out.push(`${x.trees} ${T('read.trees')}`);
  return out.join(', ') || '–';
}

function render() {
  let h = `<div class="card" id="incard"><h2>${T('in.h')}</h2><p class="muted small">${T('in.sub')}</p><div class="exports">
    <label class="btn">${T('in.file')}<input type="file" id="recfile" accept=".json,application/json" hidden></label>${rec ? `<button type="button" class="btn ghost" id="recclear">${T('clear')}</button>` : ''}</div>
    ${rec ? '' : `<p class="small muted" id="nonote">${T('in.none')}</p>`}</div>`;
  if (rec && chk) h += summaryHTML() + (chk.kind === 'record' ? inputsHTML() + contentHTML() : '');
  $('app').innerHTML = h;
  bind();
}

function summaryHTML() {
  const t = chk.tool || {}, ts = V.toolStatus(rec, TOOLS), cu = V.commitURL(chk.build && chk.build.commit);
  let h = `<div class="card" id="sumcard"><h2>${T('sum.h')}</h2>`;
  if (chk.kind === 'other') return h + `<p class="note warn" id="kindnote">${esc(chk.problems.includes('format-version') ? T('fmtver', { f: chk.format }) : T('other', { f: chk.format || '' }))}</p></div>`;
  if (chk.kind === 'record') {
    h += chk.seal === true ? `<p class="note ok" id="seal" data-seal="ok"><b>✔</b> ${T('seal.ok')}</p>`
      : chk.seal === false ? `<p class="note err" id="seal" data-seal="bad"><b>✘</b> ${T('seal.bad')}</p>` : `<p class="note warn" id="seal" data-seal="none">${T('seal.none')}</p>`;
  } else h += `<p class="note warn" id="kindnote" data-kind="legacy">${T('legacy')}</p>`;
  const verNote = ts.state === 'same' ? `<p class="note ok small" id="vernote" data-ver="same">${T('ver.same')}</p>` : ts.state === 'changed' ? `<p class="note warn small" id="vernote" data-ver="changed">${esc(T('ver.changed', { r: ts.recorded, c: ts.current }))}</p>` : `<p class="note warn small" id="vernote" data-ver="unknown">${T('ver.unknown')}</p>`;
  const rows = [[T('k.file'), esc(fileName)], [T('k.format'), esc(chk.format || '–')],
    [T('k.tool'), ts.tool ? `<a href="${esc(ts.tool.file)}">${esc(ts.tool.title)}</a> <span class="muted small">(${esc(t.id || '')})</span>` : esc(t.id || '–')],
    [T('k.ids'), esc((t.ids && t.ids.length ? t.ids : ts.tool ? ts.tool.ids : []).join(' · ') || '–')],
    [T('k.ver'), esc(t.version || '–')], [T('k.now'), esc(ts.current || '–')], [T('k.created'), when(chk.created)]];
  if (chk.kind === 'record') rows.push([T('k.lang'), esc(rec.lang || '–')], [T('k.build'), cu ? `<a href="${esc(cu)}" rel="noopener" target="_blank"><code>${esc(chk.build.commit.slice(0, 12))}</code></a>` : T('k.build.none')], [T('k.site'), esc(chk.build && chk.build.site || '–')]);
  h += `<dl class="kv" id="sumkv">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>${verNote}`;
  if (chk.kind === 'record' && chk.expected) h += `<details class="more"><summary>SHA-256</summary><dl class="kv"><dt>${T('seal.exp')}</dt><dd><code class="hash" id="hexp">${esc(chk.expected)}</code></dd><dt>${T('seal.act')}</dt><dd><code class="hash" id="hact">${esc(chk.actual || '–')}</code></dd></dl><p class="muted small">${T('seal.how')}</p></details>`;
  const other = chk.problems.filter(p => !['seal-mismatch', 'seal-missing', 'no-envelope'].includes(p));
  if (other.length) h += `<p class="note warn small" id="probs">${other.map(p => esc(T('p.' + p))).join('; ')}</p>`;
  return h + `</div>`;
}

function inputsHTML() {
  const ins = chk.inputs;
  let h = `<div class="card" id="inputs"><h2>${T('in2.h')}</h2>`;
  if (!ins.length) return h + `<p class="small" id="noinputs">${T('in2.none')}</p></div>`;
  const matchOf = i => checked.filter(c => c.matches.includes(i)).map(c => c.name);
  h += `<div class="tscroll"><table class="grid" id="intab"><thead><tr><th>${T('c.role')}</th><th>${T('c.kind')}</th><th>${T('c.name')}</th><th>${T('c.size')}</th><th>${T('c.sha')}</th><th>${T('c.read')}</th><th>${T('c.emb')}</th><th>${T('c.match')}</th></tr></thead><tbody>
    ${ins.map((x, i) => { const m = matchOf(i); return `<tr data-i="${i}" data-emb="${x.embedded ? (x.embeddedOk ? 'ok' : 'bad') : 'no'}" data-match="${m.length ? 'yes' : 'no'}"><td>${esc(roleText(x.role))}</td><td>${esc(T('kind.' + x.kind))}</td><td>${esc(x.name || '–')}</td>
      <td class="num">${esc(V.bytesText(x.bytes))}</td><td>${short(x.sha256)}</td><td class="small">${esc(readingText(x))}</td>
      <td>${x.embedded ? `${x.embeddedOk ? T('emb.ok') : `<b class="err">${T('emb.bad')}</b>`} <button type="button" class="btn ghost small" data-dl="${i}">${T('emb.dl')}</button>` : T('emb.no')}</td>
      <td>${m.length ? `<span class="ok">✔ ${esc(T('m.ok', { f: m.join(', ') }))}</span>` : T('m.none')}</td></tr>`; }).join('')}</tbody></table></div>`;
  h += `<h3>${T('chk.h')}</h3><p class="muted small">${T('chk.sub')}</p><div class="exports"><label class="btn ghost">${T('chk.file')}<input type="file" id="chkfiles" multiple hidden></label></div>`;
  if (checked.length) h += `<ul class="small" id="chklist">${checked.map(c => `<li data-match="${c.matches.length ? 'yes' : 'no'}"><b>${esc(c.name)}</b> (${esc(V.bytesText(c.bytes))}): ${c.matches.length ? `<span class="ok">✔ ${esc(T('chk.yes', { list: c.matches.map(i => `${roleText(ins[i].role)} (${ins[i].name || T('kind.' + ins[i].kind)})`).join(', ') }))}</span>` : `<span class="err">✘ ${T('chk.no')}</span>`}</li>`).join('')}</ul>`;
  return h + `</div>`;
}

function contentHTML() {
  const keys = V.contentKeys(rec, RESERVED);
  let h = `<div class="card" id="content"><h2>${T('cnt.h')}</h2><p class="muted small">${T('cnt.sub')}</p>`;
  h += `<table class="grid" id="cnttab"><thead><tr><th>${T('cnt.key')}</th><th>${T('cnt.kind')}</th><th>${T('cnt.size')}</th></tr></thead><tbody>${keys.map(k => `<tr><td><code>${esc(k.key)}</code></td><td>${T('kk.' + k.kind)}</td><td class="num">${k.size ?? '–'}</td></tr>`).join('')}</tbody></table>`;
  const set = ['settings', 'reading', 'input', 'summary'].filter(k => rec[k] != null);
  if (set.length) h += `<details class="more" open><summary>${T('cnt.settings')}</summary><pre class="json" id="settings">${esc(JSON.stringify(Object.fromEntries(set.map(k => [k, rec[k]])), null, 2))}</pre></details>`;
  return h + `</div>`;
}

function bind() {
  $('recfile').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    let obj; try { obj = JSON.parse((await f.text()).replace(/^﻿/, '')); } catch (err) { status(T('in.bad'), 'err'); return; }
    rec = obj; fileName = f.name; checked = []; chk = await verifyRecord(obj); status(''); render();
  });
  $('recclear') && $('recclear').addEventListener('click', () => { rec = chk = null; checked = []; fileName = ''; status(''); render(); });
  $('chkfiles') && $('chkfiles').addEventListener('change', async e => {
    for (const f of e.target.files) {
      const b = new Uint8Array(await f.arrayBuffer());
      checked = checked.filter(c => c.name !== f.name);
      checked.push({ name: f.name, bytes: b.length, matches: matchInputs(chk.inputs, await fileFingerprints(b)) });
    }
    render();
  });
  document.querySelectorAll('[data-dl]').forEach(b => b.addEventListener('click', () => {
    const x = embeddedFile(rec.inputs[+b.dataset.dl]); if (x) download(x.name, new Blob([x.bytes], { type: x.type }));
  }));
}

$('privacy').textContent = T('privacy');
render();
