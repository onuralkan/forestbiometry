// Coefficient and equation library (DI-02): user interface. Bookkeeping lives in calc.js; storage and the schema in
// core/coef.js; the editor is the shared one (core/coef-ui.js) with each tool's own fields.
import * as L from './calc.js';
import { T } from './i18n.js';
import { lang, esc } from '../core/i18n.js';
import { listCoefs, saveCoef, deleteCoef, form } from '../core/coef.js';
import { mountCoefEditor, metaProblems, problemText } from '../core/coef-ui.js';
import { download, downloadCSV, downloadJSON, xlsxBlob, loadXLSX } from '../core/export.js';
import { EXTRA as TAPER_EXTRA } from '../taper/coef-extra.js';
import { EXTRA as SI_EXTRA } from '../siteindex/coef-extra.js';
import { EXTRA as BIOMASS_EXTRA } from '../biomass/coef-extra.js';

const BASE = './', $ = id => document.getElementById(id);
const EXTRAS = { taper: TAPER_EXTRA, siteindex: SI_EXTRA, growth: [], biomass: BIOMASS_EXTRA, bark: [], ccf: [] };
const extraCheck = (tool, s) => metaProblems(EXTRAS[tool] || [], s);
const probs = s => L.problemsOf(s, extraCheck);
const ptext = q => { const own = 'p.' + q.code, t = T(own, q); return t !== own ? t : problemText(q); };
const tname = t => { const i = L.toolInfo(t); return i ? i.name[lang] || i.name.tr : t; };

let sets = [], F = { tool: '', q: '', origin: '', problems: false }, open = new Set(), plan = null, editor = null, edTool = L.TOOLS[0].tool;
function status(m, k = '') { const s = $('status'); s.className = 'status ' + k; s.textContent = m || ''; }
async function refresh() { sets = await listCoefs(); render(); }

function render() {
  const dupGroups = L.duplicates(sets), dupOf = new Map(dupGroups.flatMap(g => g.map(id => [id, g.filter(x => x !== id)])));
  const nProb = sets.filter(s => probs(s).length).length;
  const per = L.TOOLS.map(t => [t, sets.filter(s => s.tool === t.tool).length]).filter(([, n]) => n);
  let h = `<div class="card" id="sumcard"><h2>${T('sum.h')}</h2>`;
  h += sets.length ? `<p id="sumline">${esc(T('sum.line', { n: sets.length, list: per.map(([t, n]) => `${tname(t.tool)} ${n}`).join(', ') }))}</p>${dupGroups.length ? `<p class="note warn small" id="sumdup">${esc(T('sum.dups', { n: dupGroups.length }))}</p>` : ''}${nProb ? `<p class="note err small" id="sumprob">${esc(T('sum.probs', { n: nProb }))}</p>` : ''}`
    : `<p class="small" id="sumnone">${T('sum.none')}</p>`;
  h += `<div class="exports"><button type="button" class="btn" id="b-backup"${sets.length ? '' : ' disabled'}>${T('backup')}</button><label class="btn ghost">${T('restore')}<input type="file" id="b-restore" accept=".json,application/json" hidden></label>
    <button type="button" class="btn ghost" id="b-xlsx"${sets.length ? '' : ' disabled'}>${T('excel')}</button><button type="button" class="btn ghost" id="b-csv"${sets.length ? '' : ' disabled'}>${T('csv')}</button></div>`;
  if (plan) h += planHTML();
  h += `</div>`;
  if (sets.length) {
    const shown = L.filterSets(sets, F, probs);
    h += `<div class="card" id="listcard"><h2>${T('f.h')}</h2><div class="lims"><label>${T('f.tool')} <select id="f-tool"><option value="">${T('f.all')}</option>${L.TOOLS.map(t => `<option value="${t.tool}"${F.tool === t.tool ? ' selected' : ''}>${esc(tname(t.tool))}</option>`).join('')}</select></label>
      <label>${T('f.q')} <input type="search" id="f-q" size="24" value="${esc(F.q)}"></label>
      <label>${T('f.origin')} <select id="f-origin"><option value="">${T('f.all')}</option>${['user-entered', 'fitted'].map(o => `<option value="${o}"${F.origin === o ? ' selected' : ''}>${T('f.origin.' + o)}</option>`).join('')}</select></label>
      <label><input type="checkbox" id="f-prob"${F.problems ? ' checked' : ''}> ${T('f.prob')}</label></div>
      <p class="muted small" id="fcount">${esc(T('f.count', { n: shown.length, total: sets.length }))}</p>
      <div class="tscroll"><table class="grid" id="libtab"><thead><tr><th>${T('c.tool')}</th><th>${T('c.form')}</th><th>${T('c.scope')}</th><th>${T('c.src')}</th><th>${T('c.origin')}</th><th>${T('c.mod')}</th><th>${T('c.state')}</th><th></th></tr></thead><tbody>
      ${shown.map(s => rowHTML(s, dupOf.get(s.id))).join('')}</tbody></table></div></div>`;
  }
  const keep = document.activeElement && document.activeElement.id === 'f-q' ? document.activeElement.selectionStart : null;
  $('top').innerHTML = h;
  if (keep != null) { const q = $('f-q'); q.focus(); q.setSelectionRange(keep, keep); }
  bind();
}
/** The editor card is drawn once and kept across list updates (a draft in progress is not lost); a new tool remounts it. */
function renderEditorCard() {
  $('edcard').innerHTML = `<h2>${T('e.h')}</h2><div class="lims"><label>${T('e.tool')} <select id="e-tool">${L.TOOLS.map(t => `<option value="${t.tool}"${edTool === t.tool ? ' selected' : ''}>${esc(tname(t.tool))}</option>`).join('')}</select></label></div>
    <p class="muted small">${T('e.note')}</p><div id="editor"></div>`;
  $('e-tool').addEventListener('change', e => { edTool = e.target.value; renderEditorCard(); });
  mountEditor();
}
function rowHTML(s, dups) {
  const f = form(s.form), pr = probs(s), info = L.toolInfo(s.tool);
  const state = pr.length ? `<span class="tag st-err" style="text-transform:none;letter-spacing:0">${T('st.prob')}</span>` : dups ? `<span class="tag st-warn" title="${esc(dups.join(', '))}">${T('st.dup')}</span>` : `<span class="tag">${T('st.ok')}</span>`;
  let h = `<tr data-id="${esc(s.id)}"><td>${esc(tname(s.tool))}${info ? ` <span class="muted small">${info.id}</span>` : ''}</td><td class="small">${esc(f ? f.formula[lang] || f.formula.tr : s.form)}</td>
    <td>${esc([s.species, s.region, s.component].filter(Boolean).join(' · ') || '–')}</td><td class="small">${esc(s.source ? s.source.citation : '')}</td><td class="small">${T('f.origin.' + s.origin) || esc(s.origin)}</td>
    <td class="small">${esc(String(s.modified || '').slice(0, 10))}</td><td>${state}</td>
    <td class="acts"><button type="button" class="btn ghost small" data-act="more" aria-expanded="${open.has(s.id)}">${T('more')}</button> <button type="button" class="btn ghost small" data-act="edit"${info ? '' : ' disabled'}>${T('edit')}</button> <button type="button" class="btn ghost small" data-act="copy"${pr.length ? ' disabled' : ''}>${T('copy')}</button> <button type="button" class="btn ghost small" data-act="del">${T('del')}</button>${info ? ` <a class="small" href="${info.page}">${T('open')}</a>` : ''}</td></tr>`;
  if (open.has(s.id)) h += `<tr class="detail" data-detail="${esc(s.id)}"><td colspan="8">${detailHTML(s, pr)}</td></tr>`;
  return h;
}
function detailHTML(s, pr) {
  const kv = (k, v) => v == null || v === '' ? '' : `<dt>${T(k)}</dt><dd>${v}</dd>`, j = o => `<code>${esc(JSON.stringify(o))}</code>`;
  const units = [...Object.entries(s.inputs || {}).map(([k, v]) => `${esc(k)}: ${esc(v.unit)}${v.bark ? ' (' + esc(v.bark) + ')' : ''}`), `→ ${esc(s.output ? (s.output.name || '') + ': ' + s.output.unit + (s.output.bark ? ' (' + s.output.bark + ')' : '') : '')}`].join('; ');
  const src = s.source ? [s.source.citation, s.source.doi && 'DOI ' + s.source.doi, s.source.page && 'p. ' + s.source.page, s.source.table, s.source.note].filter(Boolean).map(esc).join(' · ') : '';
  return `<dl class="kv small">${kv('d.id', esc(s.id))}${kv('d.params', `<table class="grid params"><tbody>${Object.entries(s.params || {}).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num">${esc(String(v))}</td></tr>`).join('')}</tbody></table>`)}
    ${kv('d.units', units)}${kv('d.valid', s.valid ? j(s.valid) : '')}${kv('d.transform', s.transform ? j(s.transform) : '')}${kv('d.meta', s.meta ? j(s.meta) : '')}${kv('d.source', src)}
    ${kv('d.fit', s.fit ? j(s.fit) : '')}${kv('d.copyOf', s.copyOf ? esc(s.copyOf) : '')}${kv('d.dates', esc(`${String(s.created || '–').slice(0, 19)} / ${String(s.modified || '–').slice(0, 19)}`))}
    ${kv('d.probs', pr.length ? esc(pr.map(ptext).join('; ')) : '')}</dl>`;
}
function planHTML() {
  if (!plan.ok) return `<p class="note err" id="rbad">${T('r.bad')}</p>`;
  return `<div id="rplan"><h3>${T('r.h')}</h3><p id="rsum">${esc(T('r.sum', plan))}</p><div class="tscroll"><table class="grid" id="rtab"><thead><tr><th>${T('r.col.act')}</th><th>${T('r.col.set')}</th><th>${T('r.col.note')}</th></tr></thead><tbody>
    ${plan.items.map(x => { const s = x.set, f = s && form(s.form); return `<tr data-act="${x.action}"><td>${T('r.' + x.action)}</td><td class="small">${s ? esc(`${tname(s.tool)} · ${f ? f.formula[lang] || f.formula.tr : s.form} · ${s.source.citation}`) : esc(String(x.id ?? '#' + (x.index + 1)))}</td>
      <td class="small">${esc(x.problems ? x.problems.map(ptext).join('; ') : x.dupOf ? T('r.dup', { id: x.dupOf }) : '')}</td></tr>`; }).join('')}</tbody></table></div>
    <div class="nav"><button type="button" class="btn" id="r-apply"${plan.add + plan.replace ? '' : ' disabled'}>${T('r.apply')}</button><button type="button" class="btn ghost" id="r-cancel">${T('r.cancel')}</button></div></div>`;
}
function mountEditor() {
  editor = mountCoefEditor($('editor'), { tool: edTool, extra: EXTRAS[edTool], compact: true, onChange: s => {
    const mine = x => x.id + '|' + x.modified, before = JSON.stringify(sets.filter(x => x.tool === edTool).map(mine));
    sets = [...sets.filter(x => x.tool !== edTool), ...s]; if (JSON.stringify(s.map(mine)) !== before) render(); } });
}
function bind() {
  const name = ext => `${lang === 'tr' ? 'katsayi-kutuphanesi' : 'coefficient-library'}-${new Date().toISOString().slice(0, 10)}.${ext}`;
  $('b-backup').addEventListener('click', () => downloadJSON(name('json'), L.backup(sets)));
  $('b-csv').addEventListener('click', () => downloadCSV(name('csv'), L.tableRows(sets, probs), lang));
  $('b-xlsx').addEventListener('click', async () => { const XLSX = await loadXLSX(BASE); download(name('xlsx'), xlsxBlob(XLSX, [{ name: T('f.h'), rows: L.tableRows(sets, probs) }]), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); });
  $('b-restore').addEventListener('change', async e => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    let obj = null; try { obj = JSON.parse(await file.text()); } catch (err) { obj = null; }
    plan = L.planRestore(sets, obj, probs); status(''); render();
  });
  $('r-apply') && $('r-apply').addEventListener('click', async () => {
    let n = 0; for (const x of plan.items) if (x.action === 'add' || x.action === 'replace') { const r = await saveCoef(x.set, x.set.modified || undefined); if (r.ok) n++; }
    plan = null; status(T('r.done', { n }), 'ok'); await refresh();
  });
  $('r-cancel') && $('r-cancel').addEventListener('click', () => { plan = null; render(); });
  if ($('f-tool')) {
    $('f-tool').addEventListener('change', e => { F.tool = e.target.value; render(); });
    $('f-q').addEventListener('input', e => { F.q = e.target.value; render(); });
    $('f-origin').addEventListener('change', e => { F.origin = e.target.value; render(); });
    $('f-prob').addEventListener('change', e => { F.problems = e.target.checked; render(); });
    document.querySelectorAll('#libtab [data-act]').forEach(b => b.addEventListener('click', async () => {
      const id = b.closest('tr').dataset.id, s = sets.find(x => x.id === id);
      if (b.dataset.act === 'more') { if (open.has(id)) open.delete(id); else open.add(id); render(); }
      else if (b.dataset.act === 'edit') { if (edTool !== s.tool) { edTool = s.tool; renderEditorCard(); } await editor.edit(id); $('edcard').scrollIntoView({ block: 'start' }); }
      else if (b.dataset.act === 'copy') { const r = await saveCoef(L.copySet(s)); if (r.ok) { status(T('copied'), 'ok'); open.add(r.set.id); } await refresh(); }
      else if (b.dataset.act === 'del' && confirm(T('delq'))) { await deleteCoef(id); open.delete(id); status(T('deleted'), 'ok'); await refresh(); }
    }));
  }
}

(async function init() {
  $('privacy').textContent = T('privacy');
  $('app').innerHTML = `<div id="top"></div><div class="card" id="edcard"></div>`;
  try { await refresh(); } catch (e) { sets = []; render(); }
  renderEditorCard();
})();
