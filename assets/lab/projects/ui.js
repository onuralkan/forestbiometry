// Inventory Data Manager (DI-03): user interface. Storage and bookkeeping in core/projects.js (shared with the Data
// Checker, which adds every approved package here). Package content is shown, never edited.
import * as P from '../core/projects.js';
import { T } from './i18n.js';
import { lang, esc, fmtNum } from '../core/i18n.js';
import { downloadJSON } from '../core/export.js';

const $ = id => document.getElementById(id), LOC = 'en-GB';
let list = [], active = null, open = new Set(), plan = null;
const SUM = new Map();                                     // id → summary (packages do not change)
const sumOf = p => { if (!SUM.has(p.id)) SUM.set(p.id, P.summarize(p.dataset)); return SUM.get(p.id); };
const day = iso => { const d = new Date(iso); return isNaN(d) ? '–' : d.toLocaleDateString(LOC); };
const perLabel = v => v == null ? T('s.noper') : v;
function status(m, k = '') { const s = $('status'); s.className = 'status ' + k; s.textContent = m || ''; }
const fname = (a, b) => `${b}-${new Date().toISOString().slice(0, 10)}`;
const safe = s => String(s).toLocaleLowerCase('tr').replace(/[^a-z0-9ğüşöçı]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'package';

async function refresh() { list = await P.listProjects(); active = await P.activeId(); render(); }

function activeHTML() {
  const p = list.find(x => x.id === active);
  let h = `<div class="card" id="actcard"><h2>${T('act.h')}</h2>`;
  if (!p) return h + `<p class="small" id="actnone">${T('act.none')}</p><p><a class="btn ghost" href="veri-denetcisi.php">${T('act.checker')}</a></p></div>`;
  const s = sumOf(p);
  h += `<p id="actname"><b>${esc(p.name)}</b>${p.year ? ` · ${p.year}` : ''}${p.location ? ` · ${esc(p.location)}` : ''}</p>
    <p class="small" id="actline">${esc(`${T('s.plots')}: ${s.plots} · ${T('s.periods')}: ${s.periods.map(perLabel).join(', ')} · ${T('s.records')}: ${s.records}`)}</p>
    <p class="muted small">${T('act.note')}</p>`;
  return h + `</div>`;
}

function planHTML() {
  if (!plan.ok) return `<p class="note err" id="rbad">${T('r.bad')}</p>`;
  const n = a => plan.items.filter(x => x.action === a).length;
  return `<div id="rplan"><h3>${T('r.h')}</h3><p class="small" id="rsum">${esc(T('r.sum', { add: n('add'), same: n('same'), reject: n('reject') }))}</p>
    <ul class="small">${plan.items.map(x => `<li data-act="${x.action}"><b>${esc(x.name)}</b>: ${x.action === 'add' ? T('r.add') : x.action === 'same' ? esc(T('r.same', { o: x.other })) : `<span class="err">${T('r.reject')}</span> (${esc(x.reason.join(', '))})`}</li>`).join('')}</ul>
    <div class="exports"><button type="button" class="btn" id="r-apply"${n('add') ? '' : ' disabled'}>${T('r.apply')}</button><button type="button" class="btn ghost" id="r-cancel">${T('r.cancel')}</button></div></div>`;
}

function detailHTML(p) {
  const s = sumOf(p), probs = P.datasetProblems(p.dataset), ds = p.dataset;
  const rows = [[T('s.plots'), `${s.plots}${s.emptyPlots ? ` (${T('s.empty', { n: s.emptyPlots })})` : ''}`], [T('s.periods'), s.periods.map(perLabel).join(', ')], [T('s.records'), s.records], [T('s.trees'), s.trees],
    [T('s.species'), s.species.map(x => `${x.species || T('s.blank')} ${x.n}`).join(', ') || '–'], [T('s.dbh'), s.dbh ? `${fmtNum(s.dbh.min, 2)}–${fmtNum(s.dbh.max, 2)}` : '–'],
    [T('s.h2'), T('s.hval', { m: s.heights.measured, e: s.heights.estimated })], [T('s.age'), s.ages], [T('s.xy'), s.xy], [T('s.strata'), s.strata.join(', ') || '–'],
    [T('s.area'), s.area ? T('s.areaval', { min: fmtNum(s.area.min, 1), max: fmtNum(s.area.max, 1), t: fmtNum(s.area.total, 1) }) : '–'],
    [T('s.warn'), T('s.warnval', { n: s.warnings, o: s.open })], [T('s.exc'), s.excluded], [T('s.chg'), s.changes],
    [T('s.created'), ds.created ? new Date(ds.created).toLocaleString(LOC) : '–'], [T('s.src'), (ds.source && ds.source.trees && ds.source.trees.name) || '–']];
  const pers = s.periods.map(v => v == null ? '' : v);
  let h = `<div class="pdetail"><div class="charts2"><div><h3>${T('m.h')}</h3><form class="pmeta" data-id="${esc(p.id)}">
      <label>${T('m.name')} <input type="text" name="name" value="${esc(p.name)}" maxlength="200"></label>
      <label>${T('m.year')} <input type="text" name="year" inputmode="numeric" size="6" value="${p.year ?? ''}"></label>
      <label>${T('m.loc')} <input type="text" name="location" value="${esc(p.location || '')}" maxlength="200"></label>
      <label>${T('m.desc')} <textarea name="description" rows="2">${esc(p.description || '')}</textarea></label>
      <label>${T('m.notes')} <textarea name="notes" rows="3">${esc(p.notes || '')}</textarea></label>
      <p class="note warn small mprob" hidden></p><button type="submit" class="btn small">${T('m.save')}</button><p class="muted small">${T('m.note')}</p></form></div>
    <div><h3>${T('s.h')}</h3><dl class="kv">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}<dt>${T('s.sha')}</dt><dd><code class="hash">${esc(p.sha256)}</code></dd></dl>
    ${probs.length ? `<p class="note err small">${T('s.probs')}: ${esc(probs.join(', '))}</p>` : ''}</div></div>`;
  h += `<h3>${T('h.h')}</h3><div class="tscroll tall"><table class="grid htab"><thead><tr><th>${T('h.plot')}</th><th>${T('h.area')}</th><th>${T('h.stratum')}</th>${pers.map(v => `<th>${esc(perLabel(v === '' ? null : v))}</th>`).join('')}</tr></thead>
    <tbody>${s.byPlot.map(b => `<tr><th>${esc(b.plot_id)}</th><td class="num">${fmtNum(b.area, 1)}</td><td>${esc(b.stratum ?? '–')}</td>${pers.map(v => `<td class="num">${b.n[v] ?? '–'}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  return h;
}

function render() {
  let h = activeHTML();
  h += `<div class="card" id="listcard"><h2>${T('list.h')}</h2><p class="small" id="listline">${list.length ? esc(T('list.line', { n: list.length })) : T('list.none')}</p>
    <div class="exports"><button type="button" class="btn ghost" id="b-backup"${list.length ? '' : ' disabled'}>${T('backup')}</button><label class="btn ghost">${T('imp')}<input type="file" id="b-imp" accept=".json,application/json" hidden></label></div>
    <p class="muted small">${T('imp.sub')}</p>${plan ? planHTML() : ''}`;
  if (list.length) {
    h += `<div class="tscroll"><table class="grid" id="ptab"><thead><tr><th>${T('c.name')}</th><th>${T('c.year')}</th><th>${T('c.loc')}</th><th>${T('c.plots')}</th><th>${T('c.periods')}</th><th>${T('c.records')}</th><th>${T('c.added')}</th><th>${T('c.origin')}</th><th>${T('c.act')}</th></tr></thead><tbody>`;
    for (const p of list) {
      const s = sumOf(p), isA = p.id === active;
      h += `<tr data-id="${esc(p.id)}"${isA ? ' class="is-active" data-active="1"' : ''}><td><b>${esc(p.name)}</b>${isA ? ` <span class="tag">${T('active')}</span>` : ''}</td><td>${p.year ?? '–'}</td><td>${esc(p.location || '–')}</td>
        <td class="num">${s.plots}</td><td>${esc(s.periods.map(perLabel).join(', '))}</td><td class="num">${s.records}</td><td>${day(p.added)}</td><td>${T('o.' + p.origin)}</td>
        <td class="acts">${isA ? '' : `<button type="button" class="btn small" data-act="activate">${T('b.activate')}</button> `}<button type="button" class="btn ghost small" data-act="more" aria-expanded="${open.has(p.id)}">${T('b.more')}</button>
        <button type="button" class="btn ghost small" data-act="copy">${T('b.copy')}</button> <button type="button" class="btn ghost small" data-act="dl">${T('b.dl')}</button> <button type="button" class="btn ghost small" data-act="del">${T('b.del')}</button></td></tr>`;
      if (open.has(p.id)) h += `<tr class="more-row"><td colspan="9">${detailHTML(p)}</td></tr>`;
    }
    h += `</tbody></table></div>`;
  }
  $('app').innerHTML = h + `</div>`;
  bind();
}

function bind() {
  $('b-backup').addEventListener('click', () => downloadJSON(fname('envanter-paketleri', 'inventory-packages') + '.json', P.backup(list)));
  $('b-imp').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    let obj; try { obj = JSON.parse((await f.text()).replace(/^﻿/, '')); } catch (err) { status(T('r.read'), 'err'); return; }
    plan = await P.planImport(list, obj, { lang }); status(''); render();
  });
  $('r-apply') && $('r-apply').addEventListener('click', async () => {
    let n = 0; for (const x of plan.items) if (x.action === 'add') { await P.saveProject(x.project); n++; }
    plan = null; status(T('r.done', { n }), 'ok'); await refresh();
  });
  $('r-cancel') && $('r-cancel').addEventListener('click', () => { plan = null; render(); });
  document.querySelectorAll('#ptab [data-act]').forEach(b => b.addEventListener('click', async () => {
    const id = b.closest('tr').dataset.id, p = list.find(x => x.id === id), act = b.dataset.act;
    if (act === 'more') { if (open.has(id)) open.delete(id); else open.add(id); render(); }
    else if (act === 'activate') { await P.setActive(id); status(T('activated', { n: p.name }), 'ok'); await refresh(); }
    else if (act === 'copy') { const c = await P.saveProject(P.copyProject(p, T('copy'))); SUM.delete(c.id); status(T('copied'), 'ok'); await refresh(); }
    else if (act === 'dl') downloadJSON(`${safe(p.name)}-data-package.json`, p.dataset);
    else if (act === 'del' && confirm(T(id === active ? 'delqa' : 'delq'))) { await P.deleteProject(id); open.delete(id); SUM.delete(id); status(T('deleted'), 'ok'); await refresh(); }
  }));
  document.querySelectorAll('form.pmeta').forEach(f => f.addEventListener('submit', async e => {
    e.preventDefault();
    const m = Object.fromEntries(new FormData(f).entries()), probs = P.metaProblems(m), box = f.querySelector('.mprob');
    if (probs.length) { box.hidden = false; box.textContent = probs.map(c => T('p.' + c)).join(' '); return; }
    const p = list.find(x => x.id === f.dataset.id);
    await P.saveProject({ ...p, ...P.cleanMeta(m), modified: new Date().toISOString() }); status(T('saved'), 'ok'); await refresh();
  }));
}

(async function init() {
  $('privacy').textContent = T('privacy');
  try { await P.adoptApproved(lang); await refresh(); } catch (e) { list = []; render(); }
})();
