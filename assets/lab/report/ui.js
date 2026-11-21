// Report generator (DI-05): user interface. Content in calc.js, HTML in render.js; the preview is the report itself,
// printed through the browser (PDF: "Save as PDF") or saved as a standalone HTML file. Nothing leaves the browser.
import * as R from './calc.js';
import { renderReport, standalone, REPORT_CSS } from './render.js';
import { T } from './i18n.js';
import { lang, esc } from '../core/i18n.js';
import { get, put } from '../core/store.js';
import { listProjects, activeId, adoptApproved } from '../core/projects.js';
import { sha256JSON } from '../core/record.js';
import { download } from '../core/export.js';
import * as P from '../dashboard/calc.js';

const BASE = './', KEY = 'session:rapor', $ = id => document.getElementById(id), ALL = P.ALL;
const CITE = (() => { try { return JSON.parse($('cite-data').textContent); } catch (e) { return {}; } })();
const TOOLS = (() => { try { return JSON.parse($('tools-data').textContent); } catch (e) { return {}; } })();
let S = blank(), projects = [], active = null, project = null, recs = [], sections = [], timer = null;
function blank() { return { v: 1, pid: null, sample: false, f: P.blankFilter(), ec: 'unmeasured', width: '', lang, meta: R.blankMeta(), on: Object.fromEntries(R.SECTIONS.map(s => [s, true])), recs: [] }; }
const save = () => put(KEY, { ...S, saved: new Date().toISOString() });
function status(m, k = '') { const s = $('status'); s.className = 'status ' + k; s.textContent = m || ''; }
const perLabel = v => v === '' ? T('f.noper') : v, spLabel = v => v === '' ? T('f.nosp') : v;

async function loadProject() {
  project = null;
  if (S.sample) { const ds = await (await fetch(BASE + 'assets/lab/stand/ornek/ornek-veri.json')).json(); project = { name: T('p.sample'), year: null, location: '', description: '', sha256: await sha256JSON(ds), dataset: ds }; }
  else if (S.pid) project = projects.find(p => p.id === S.pid) || null;
  if (project) { const o = P.options(project.dataset); for (const [k, list] of [['period', o.periods], ['stratum', o.strata], ['species', o.species], ['plot', o.plots]]) if (S.f[k] !== ALL && !list.includes(S.f[k])) S.f[k] = ALL; }
  await loadRecords();
}
async function loadRecords() {
  const sha = project ? project.sha256 : null;
  sections = []; recs = [];
  for (const r of S.recs) { const s = await R.recordSection(r.name, r.obj, sha); if (s) { sections.push(s); recs.push(await P.readRecord(r.obj, sha).then(x => ({ kind: x.kind, obj: r.obj }))); } }
}
function model() {
  const w = parseFloat(String(S.width).replace(',', '.'));
  return { lang: S.lang, meta: S.meta, sections: S.on, pkg: project ? R.packagePart(project, S.f, S.ec, w > 0 ? w : 0, recs) : null, records: sections,
    cite: { author: CITE.author, year: CITE.year, base: CITE.base, site: CITE.site, doi: CITE.doi }, tools: TOOLS, generated: { at: new Date().toISOString(), commit: CITE.commit || null, version: R.TOOL.version } };
}
function preview() { $('preview').innerHTML = renderReport(model()); }
const later = () => { clearTimeout(timer); timer = setTimeout(preview, 300); };

function formHTML() {
  const M = S.meta, inp = (k, size = 40) => `<label>${T('m.' + k)} <input type="text" data-m="${k}" size="${size}" value="${esc(M[k])}"></label>`;
  let h = `<div class="card" id="metacard"><h2>${T('m.h')}</h2><div class="lims">${inp('title', 48)}${inp('author', 28)}${inp('org', 32)}<label>${T('m.date')} <input type="date" data-m="date" value="${esc(M.date)}"></label>
</div>
    <label class="blk">${T('m.intro')} <textarea data-m="intro" rows="3">${esc(M.intro)}</textarea></label></div>`;
  h += `<div class="card" id="pkgcard"><h2>${T('p.h')}</h2><div class="lims"><label>${T('p.pick')} <select id="pkg"><option value="">${T('p.none')}</option>${projects.map(p => `<option value="${esc(p.id)}"${!S.sample && S.pid === p.id ? ' selected' : ''}>${esc(p.name)}${p.year ? ' · ' + p.year : ''}</option>`).join('')}<option value="#sample"${S.sample ? ' selected' : ''}>${T('p.sample')}</option></select></label></div>`;
  if (!projects.length) h += `<p class="muted small">${T('p.empty')}</p>`;
  if (S.sample) h += `<p class="note warn small" id="samplenote">${T('p.samplenote')}</p>`;
  if (project) {
    const o = P.options(project.dataset), sel = (k, list, lab) => `<label>${T('f.' + k)} <select data-f="${k}"><option value="${ALL}">${T('f.all')}</option>${list.map(v => `<option value="${esc(v)}"${S.f[k] === v ? ' selected' : ''}>${esc(lab ? lab(v) : v)}</option>`).join('')}</select></label>`;
    h += `<div class="lims">${sel('period', o.periods, perLabel)}${o.strata.length ? sel('stratum', o.strata) : ''}${sel('species', o.species, spLabel)}${sel('plot', o.plots)}</div>
      <div class="lims"><label>${T('f.width')} <input type="text" inputmode="decimal" size="5" id="width" value="${esc(S.width)}" placeholder="${T('f.auto')}"></label>
      <span class="radios"><span class="small">${T('f.ec')}:</span> ${['unmeasured', 'empty'].map(v => `<label class="small"><input type="radio" name="ec" value="${v}"${S.ec === v ? ' checked' : ''}> ${T('f.ec.' + v)}</label>`).join(' ')}</span></div>`;
  }
  h += `</div><div class="card" id="reccard"><h2>${T('r.h')}</h2><div class="exports"><label class="btn ghost">${T('r.file')}<input type="file" id="recfile" accept=".json,application/json" multiple hidden></label><button type="button" class="btn ghost" id="frompano">${T('r.pano')}</button></div>`;
  h += S.recs.length ? `<ol class="small" id="reclist">${S.recs.map((r, i) => `<li data-i="${i}">${esc(r.name)} <span class="muted">${esc(sections[i] && sections[i].tool ? `${sections[i].tool.id} ${sections[i].tool.version || ''}` : '')}</span> ${i ? `<button type="button" class="btn ghost small" data-up="${i}">${T('r.up')}</button>` : ''} <button type="button" class="btn ghost small" data-rm="${i}">${T('r.rm')}</button></li>`).join('')}</ol>` : `<p class="small muted" id="recnone">${T('r.none')}</p>`;
  h += `</div><div class="card" id="seccard"><h2>${T('s.h')}</h2>${R.SECTIONS.map(s => `<div class="secrow"><label class="chk"><input type="checkbox" data-on="${s}"${S.on[s] ? ' checked' : ''}> <b>${T('s.' + s)}</b></label>
      <label class="blk small">${T('s.note')} <textarea data-note="${s}" rows="2">${esc(S.meta.notes[s] || '')}</textarea></label></div>`).join('')}</div>`;
  h += `<div class="card" id="actcard"><div class="exports"><button type="button" class="btn" id="print">${T('print')}</button><button type="button" class="btn ghost" id="html">${T('html')}</button></div><p class="muted small">${T('print.note')}</p></div>`;
  return h + `<h2 class="prevh">${T('preview')}</h2><div id="preview" class="r-preview"></div>`;
}
function render() { $('app').innerHTML = formHTML(); bind(); preview(); }

function bind() {
  document.querySelectorAll('[data-m]').forEach(x => { x.addEventListener('input', () => { S.meta[x.dataset.m] = x.value; later(); }); x.addEventListener('change', save); });
  document.querySelectorAll('[data-note]').forEach(x => { x.addEventListener('input', () => { S.meta.notes[x.dataset.note] = x.value; later(); }); x.addEventListener('change', save); });
  document.querySelectorAll('[data-on]').forEach(x => x.addEventListener('change', () => { S.on[x.dataset.on] = x.checked; save(); preview(); }));

  $('pkg').addEventListener('change', async e => { const v = e.target.value; S.sample = v === '#sample'; S.pid = S.sample || !v ? null : v; save(); await loadProject(); render(); });
  document.querySelectorAll('[data-f]').forEach(s => s.addEventListener('change', () => { S.f[s.dataset.f] = s.value; save(); preview(); }));
  $('width') && $('width').addEventListener('change', e => { S.width = e.target.value.trim(); save(); preview(); });
  document.querySelectorAll('input[name="ec"]').forEach(x => x.addEventListener('change', () => { S.ec = x.value; save(); preview(); }));
  $('recfile').addEventListener('change', async e => {
    const msgs = [];
    for (const file of e.target.files) {
      let obj; try { obj = JSON.parse((await file.text()).replace(/^﻿/, '')); } catch (err) { msgs.push(T('r.read', { f: file.name })); continue; }
      if (!(await R.recordSection(file.name, obj, null))) { msgs.push(T('r.bad', { f: file.name })); continue; }
      S.recs.push({ name: file.name, obj });
    }
    status(msgs.join(' '), msgs.length ? 'err' : ''); save(); await loadRecords(); render();
  });
  $('frompano').addEventListener('click', async () => {
    const p = await get('session:pano'), list = p && Array.isArray(p.recs) ? p.recs : [];
    let n = 0; for (const r of list) if (!S.recs.some(x => x.name === r.name && JSON.stringify(x.obj) === JSON.stringify(r.obj))) { S.recs.push({ name: r.name, obj: r.obj }); n++; }
    status(T('r.got', { n }), 'ok'); save(); await loadRecords(); render();
  });
  document.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', async () => { S.recs.splice(+b.dataset.rm, 1); save(); await loadRecords(); render(); }));
  document.querySelectorAll('[data-up]').forEach(b => b.addEventListener('click', async () => { const i = +b.dataset.up; [S.recs[i - 1], S.recs[i]] = [S.recs[i], S.recs[i - 1]]; save(); await loadRecords(); render(); }));
  $('print').addEventListener('click', () => { clearTimeout(timer); preview(); save(); print(); });
  $('html').addEventListener('click', () => {
    clearTimeout(timer); preview(); save();
    const title = S.meta.title || ('Inventory report');
    download(`${('report')}-${S.meta.date || new Date().toISOString().slice(0, 10)}.html`, standalone($('preview').innerHTML, title, S.lang), 'text/html;charset=utf-8');
  });
}

(async function init() {
  $('privacy').textContent = T('privacy');
  document.body.classList.add('report-page');
  const st = document.createElement('style'); st.textContent = REPORT_CSS; document.head.append(st);
  try {
    const saved = await get(KEY);
    if (saved && saved.v === 1) S = { ...blank(), ...saved, f: { ...P.blankFilter(), ...(saved.f || {}) }, meta: { ...R.blankMeta(), ...(saved.meta || {}), notes: { ...R.blankMeta().notes, ...((saved.meta || {}).notes || {}) } }, on: { ...blank().on, ...(saved.on || {}) } };
    S.lang = 'en';   // reports are written in English only (20 Nov 2026); an older session may hold 'tr'
    await adoptApproved(lang); projects = await listProjects(); active = await activeId();
    if (!saved && !S.sample) S.pid = active;
    if (S.pid && !projects.some(p => p.id === S.pid)) S.pid = null;
    await loadProject();
  } catch (e) { console.warn('report: saved state not restored', e); S = blank(); }
  render();
})();
