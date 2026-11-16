// Visualization dashboard (DI-04): user interface. Counts, filters and record reading in calc.js; storage of the
// packages in core/projects.js (DI-03). Nothing leaves the browser.
import * as C from './calc.js';
import { T } from './i18n.js';
import { lang, fmtNum, esc } from '../core/i18n.js';
import { get, put } from '../core/store.js';
import { listProjects, activeId, adoptApproved } from '../core/projects.js';
import { sha256JSON } from '../core/record.js';
import { download, downloadCSV } from '../core/export.js';
import { plotChart, barChart, scatterChart, svgForDownload } from '../core/chart.js';

const BASE = './', KEY = 'session:pano', $ = id => document.getElementById(id), ALL = C.ALL, LOC = lang === 'tr' ? 'tr-TR' : 'en-GB';
let S = blank(), projects = [], active = null, ds = null, pkgSha = null, recInfo = [];
function blank() { return { v: 1, pid: null, sample: false, f: C.blankFilter(), ec: 'unmeasured', width: '', est: false, recs: [] }; }
// Every change is a single choice (no typing), so it is written at once: a delayed write could be lost on reload.
function save() { return put(KEY, { ...S, saved: new Date().toISOString() }); }
function status(m, k = '') { const s = $('status'); s.className = 'status ' + k; s.textContent = m || ''; }
const f2 = (x, d = 2) => x == null || !Number.isFinite(x) ? '–' : fmtNum(x, d);
const fname = (a, b) => `${lang === 'tr' ? a : b}-${new Date().toISOString().slice(0, 10)}`;
const perLabel = v => v === '' || v == null ? T('f.noper') : v;
const spLabel = v => v === '' ? T('f.nosp') : v;

async function loadPackage() {
  ds = null; pkgSha = null;
  if (S.sample) ds = await (await fetch(BASE + 'assets/lab/stand/ornek/ornek-veri.json')).json();
  else {
    const p = projects.find(x => x.id === S.pid) || projects.find(x => x.id === active) || projects[0];
    if (p) { S.pid = p.id; ds = p.dataset; pkgSha = p.sha256; }
  }
  if (ds && !pkgSha) pkgSha = await sha256JSON(ds);
  if (ds) { const o = C.options(ds); for (const [k, list] of [['period', o.periods], ['stratum', o.strata], ['species', o.species], ['plot', o.plots]]) if (S.f[k] !== ALL && !list.includes(S.f[k])) S.f[k] = ALL; }
  recInfo = await Promise.all(S.recs.map(r => C.readRecord(r.obj, pkgSha)));
}

/* ---------------- cards ---------------- */
function sourceHTML() {
  let h = `<div class="card" id="srccard"><h2>${T('src.h')}</h2>`;
  if (projects.length) h += `<div class="lims"><label>${T('src.pick')} <select id="pkg">${projects.map(p => `<option value="${esc(p.id)}"${!S.sample && p.id === S.pid ? ' selected' : ''}>${esc(p.name)}${p.year ? ' · ' + p.year : ''}${p.id === active ? ` (${T('src.active')})` : ''}</option>`).join('')}${S.sample ? '<option selected value="">–</option>' : ''}</select></label></div>`;
  else if (!S.sample) h += `<p class="small" id="srcnone">${T('src.none')}</p><p><a class="btn ghost" href="veri-denetcisi.php">${T('src.checker')}</a> <a class="btn ghost" href="veri-yoneticisi.php">${T('src.manager')}</a></p>`;
  if (S.sample) h += `<p class="note warn small" id="samplenote">${T('src.samplenote')}</p>`;
  else h += `<p><button type="button" class="btn ghost small" id="sample">${T('src.sample')}</button></p>`;
  return h + `</div>`;
}
function filterHTML() {
  const o = C.options(ds), sel = (k, list, lab) => `<label>${T('f.' + k)} <select data-f="${k}"><option value="${ALL}">${T('f.all')}</option>${list.map(v => `<option value="${esc(v)}"${S.f[k] === v ? ' selected' : ''}>${esc(lab ? lab(v) : v)}</option>`).join('')}</select></label>`;
  return `<div class="card" id="fcard"><h2>${T('f.h')}</h2><div class="lims">${sel('period', o.periods, perLabel)}${o.strata.length ? sel('stratum', o.strata) : ''}${sel('species', o.species, spLabel)}${sel('plot', o.plots)}</div>
    <div class="lims"><label>${T('f.width')} <input type="text" inputmode="decimal" size="5" id="width" value="${esc(S.width)}" placeholder="${T('f.auto')}"></label>
    <span class="radios"><span class="small">${T('f.ec')}:</span> ${['unmeasured', 'empty'].map(v => `<label class="small"><input type="radio" name="ec" value="${v}"${S.ec === v ? ' checked' : ''}> ${T('f.ec.' + v)}</label>`).join(' ')}</span></div></div>`;
}
function recordsHTML() {
  let h = `<div class="card" id="reccard"><h2>${T('r.h')}</h2><p class="muted small">${T('r.sub')}</p><div class="exports"><label class="btn ghost">${T('r.file')}<input type="file" id="recfile" accept=".json,application/json" multiple hidden></label></div>`;
  if (!S.recs.length) return h + `<p class="small muted" id="recnone">${T('r.none')}</p></div>`;
  h += `<div class="tscroll"><table class="grid" id="rectab"><thead><tr><th>${T('r.c.file')}</th><th>${T('r.c.tool')}</th><th>${T('r.c.when')}</th><th>${T('r.c.seal')}</th><th>${T('r.c.src')}</th><th>${T('r.c.show')}</th><th></th></tr></thead><tbody>`;
  S.recs.forEach((r, i) => {
    const x = recInfo[i] || {}, seal = x.seal === true ? T('seal.ok') : x.seal === false ? `<b class="err">${T('seal.bad')}</b>` : T('seal.none');
    const src = x.fromPackage === true ? T('src.yes') : x.fromPackage === false ? `<b class="err">${T('src.no')}</b>` : T('src.unk');
    h += `<tr data-i="${i}" data-kind="${x.kind}"><td>${esc(r.name)}</td><td>${esc(x.tool ? `${x.tool.id} ${x.tool.version || ''}` : '–')} <span class="muted small">(${T('k.' + x.kind)})</span></td><td class="small">${x.created ? esc(new Date(x.created).toLocaleString(LOC)) : '–'}</td>
      <td>${seal}</td><td class="small">${src}</td><td>${x.kind === 'other' ? '–' : `<input type="checkbox" data-show="${i}"${r.show ? ' checked' : ''} aria-label="${esc(T('r.c.show'))}">`}</td><td><button type="button" class="btn ghost small" data-rm="${i}">${T('r.rm')}</button></td></tr>`;
  });
  return h + `</tbody></table></div></div>`;
}
const fig = (id, chart, note = '') => `<figure class="chartbox" id="${id}">${chart}<figcaption>${note ? `<span class="muted small">${note}</span> ` : ''}<button type="button" class="btn ghost small" data-svg="${id}">${T('svg')}</button> <button type="button" class="btn ghost small" data-csv="${id}">${T('csv')}</button></figcaption></figure>`;

let CSV = {};
function panelsHTML() {
  const trees = C.filterTrees(ds, S.f), pt = C.plotTable(ds, S.f, S.ec), sp = C.speciesTable(trees);
  CSV = {};
  let h = `<div class="card" id="panels"><h2>${T('p.tiles')}</h2><div class="tiles">
    <div class="tile" id="t-plots"><span>${T('t.plots')}</span><b>${pt.rows.length}</b></div><div class="tile" id="t-rec"><span>${T('t.records')}</span><b>${trees.length}</b></div>
    <div class="tile" id="t-sp"><span>${T('t.species')}</span><b>${sp.length}</b></div>
    <div class="tile" id="t-N"><span>${T('t.Nha')}</span><b>${f2(pt.mean.Nha, 1)}</b><em>${esc(T('t.sub', { n: pt.mean.n }))}</em></div><div class="tile" id="t-G"><span>${T('t.Gha')}</span><b>${f2(pt.mean.Gha, 2)}</b><em>${esc(T('t.sub', { n: pt.mean.n }))}</em></div></div>`;
  if (!trees.length && !pt.rows.length) return h + `<p class="note" id="noch">${T('ch.empty')}</p></div>`;
  // diameter distribution + record densities
  const d = trees.map(t => t.dbh), dmin = Math.min(...d), dmax = Math.max(...d);
  const wIn = parseFloat(String(S.width).replace(',', '.')), w = wIn > 0 ? wIn : C.niceWidth(dmax - dmin), bins = C.histogram(d, w);
  let charts = '';
  if (bins.length) {
    const xmin = bins[0].lo, xmax = bins[bins.length - 1].hi, xs = C.grid(Math.max(0.01, xmin), xmax, 200), curves = [];
    S.recs.forEach((r, i) => { if (r.show && recInfo[i] && recInfo[i].kind === 'dist') for (const c of C.distCurves(r.obj, S.f, xs)) curves.push({ ...c, rec: r.name }); });
    const lines = curves.slice(0, 6).map((c, k) => ({ name: `${c.family} ${c.method}${c.truncated ? ' *' : ''}`, k, dash: c.estimator && c.estimator !== 'ml', pts: c.pts }));
    const note = esc(T('ch.hist.note', { n: d.length, w: fmtNum(w, 3) })) + ' ' + (curves.length ? esc(T('ch.curves', { list: curves.map(c => `${c.family} · ${c.method}${c.truncated ? ' (' + T('ch.trunc') + ')' : ''}`).join('; ') })) : S.recs.some((r, i) => r.show && recInfo[i] && recInfo[i].kind === 'dist') ? esc(T('ch.nocurve')) : '');
    charts += fig('ch-hist', plotChart({ title: T('ch.hist'), xmin, xmax, bars: bins.map(b => ({ lo: b.lo, hi: b.hi, v: b.dens })), lines, xLabel: T('ch.d'), yLabel: T('ch.dens'), fmt: v => fmtNum(v, 3) }), note);
    CSV['ch-hist'] = [[T('x.class'), T('x.classhi'), T('x.count'), T('x.dens')], ...bins.map(b => [b.lo, b.hi, b.n, b.dens])];
  }
  if (sp.length) {
    charts += fig('ch-sp', barChart({ title: T('ch.sp'), categories: sp.map(s => spLabel(s.species)), series: [{ name: T('ch.byN'), values: sp.map(s => s.shareN * 100) }, { name: T('ch.byG'), values: sp.map(s => s.shareG * 100) }], yLabel: T('ch.share'), fmt: v => fmtNum(v, 1) }));
    CSV['ch-sp'] = [[T('f.species'), 'n', 'g (m²)', `${T('ch.byN')} (%)`, `${T('ch.byG')} (%)`], ...sp.map(s => [s.species, s.n, s.g, s.shareN * 100, s.shareG * 100])];
  }
  if (pt.rows.length) {
    const cat = pt.rows.map(r => S.f.period === ALL ? `${r.plot} · ${perLabel(r.period ?? '')}` : r.plot);
    charts += fig('ch-N', barChart({ title: T('ch.N'), categories: cat, series: [{ name: T('ch.Nha'), values: pt.rows.map(r => r.Nha) }], yLabel: T('ch.Nha'), fmt: v => fmtNum(v, 1) }));
    charts += fig('ch-G', barChart({ title: T('ch.G'), categories: cat, series: [{ name: T('ch.Gha'), values: pt.rows.map(r => r.Gha) }], yLabel: T('ch.Gha'), fmt: v => fmtNum(v, 2) }));
    CSV['ch-N'] = CSV['ch-G'] = [[T('f.plot'), T('f.period'), 'n', T('ch.Nha'), T('ch.Gha')], ...pt.rows.map(r => [r.plot, r.period, r.n, r.Nha, r.Gha])];
  }
  const hp = C.hdPoints(trees), pts = S.est ? [...hp.measured, ...hp.estimated] : hp.measured;
  if (pts.length) {
    const xmax = Math.max(...pts.map(p => p[0])) * 1.05, xs = C.grid(Math.max(0.5, Math.min(...pts.map(p => p[0])) * 0.9), xmax, 120), curves = [];
    S.recs.forEach((r, i) => { if (r.show && recInfo[i] && recInfo[i].kind === 'hd') curves.push(...C.hdCurves(r.obj, xs)); });
    const lines = curves.slice(0, 6).map((c, k) => ({ name: `${c.name}${c.chosen ? ' ★' : ''}`, k, pts: c.pts, dash: !c.chosen }));
    const note = esc(T('ch.hd.note', { m: hp.measured.length, e: hp.estimated.length, show: S.est })) + (curves.length ? ' ' + esc(T('ch.hd.curves', { list: curves.map(c => c.name + (c.chosen ? ' ★' : '')).join(', ') })) : '')
      + (hp.estimated.length ? ` <label class="small"><input type="checkbox" id="est"${S.est ? ' checked' : ''}> ${T('f.est')}</label>` : '');
    charts += fig('ch-hd', plotChart({ title: T('ch.hd'), xmin: 0, xmax, ymin: 0, points: pts, lines, xLabel: T('ch.d'), yLabel: T('ch.h'), fmt: v => fmtNum(v, 1) }), note);
    CSV['ch-hd'] = [[T('ch.d'), T('ch.h'), 'height_source'], ...hp.measured.map(p => [...p, 'measured']), ...hp.estimated.map(p => [...p, 'estimated'])];
  }
  if (S.f.plot === ALL) charts += `<div class="chartbox" id="ch-map"><p class="muted small">${T('ch.map.need')}</p></div>`;
  else {
    const pos = C.positions(trees);
    if (pos.length) {
      charts += fig('ch-map', scatterChart({ title: T('ch.map'), points: pos.map(p => [p.x, p.y]), equal: true, xLabel: T('ch.x'), yLabel: T('ch.y'), fmt: v => fmtNum(v, 1) }));
      CSV['ch-map'] = [['x', 'y', 'dbh', T('f.species')], ...pos.map(p => [p.x, p.y, p.dbh, p.species])];
    } else charts += `<div class="chartbox" id="ch-map"><p class="muted small">${T('ch.map.none')}</p></div>`;
  }
  return h + `<div class="charts2">${charts}</div></div>`;
}

function render() {
  let h = sourceHTML();
  if (ds) h += filterHTML() + recordsHTML() + panelsHTML();
  $('app').innerHTML = h;
  bind();
}
function bind() {
  $('pkg') && $('pkg').addEventListener('change', async e => { if (!e.target.value) return; S.pid = e.target.value; S.sample = false; save(); await loadPackage(); render(); });
  $('sample') && $('sample').addEventListener('click', async () => { S.sample = true; save(); await loadPackage(); render(); });
  document.querySelectorAll('[data-f]').forEach(s => s.addEventListener('change', () => { S.f[s.dataset.f] = s.value; save(); render(); }));
  $('width') && $('width').addEventListener('change', e => { S.width = e.target.value.trim(); save(); render(); });
  document.querySelectorAll('input[name="ec"]').forEach(x => x.addEventListener('change', () => { S.ec = x.value; save(); render(); }));
  $('est') && $('est').addEventListener('change', e => { S.est = e.target.checked; save(); render(); });
  $('recfile') && $('recfile').addEventListener('change', async e => {
    const msgs = [];
    for (const file of e.target.files) {
      let obj; try { obj = JSON.parse((await file.text()).replace(/^﻿/, '')); } catch (err) { msgs.push(T('r.read', { f: file.name })); continue; }
      const info = await C.readRecord(obj, pkgSha);
      if (!info.ok) { msgs.push(T('r.bad', { f: file.name })); continue; }
      S.recs.push({ name: file.name, obj, show: info.kind !== 'other' });
    }
    status(msgs.join(' '), msgs.length ? 'err' : ''); save(); recInfo = await Promise.all(S.recs.map(r => C.readRecord(r.obj, pkgSha))); render();
  });
  document.querySelectorAll('[data-show]').forEach(x => x.addEventListener('change', () => { S.recs[+x.dataset.show].show = x.checked; save(); render(); }));
  document.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => { const i = +b.dataset.rm; S.recs.splice(i, 1); recInfo.splice(i, 1); save(); render(); }));
  document.querySelectorAll('[data-svg]').forEach(b => b.addEventListener('click', () => download(fname('pano-', 'dashboard-') + b.dataset.svg + '.svg', svgForDownload($(b.dataset.svg).querySelector('svg')), 'image/svg+xml')));
  document.querySelectorAll('[data-csv]').forEach(b => b.addEventListener('click', () => CSV[b.dataset.csv] && downloadCSV(fname('pano-', 'dashboard-') + b.dataset.csv + '.csv', CSV[b.dataset.csv], lang)));
}

(async function init() {
  $('privacy').textContent = T('privacy');
  try {
    const saved = await get(KEY); if (saved && saved.v === 1) S = { ...blank(), ...saved, f: { ...C.blankFilter(), ...(saved.f || {}) } };
    await adoptApproved(lang); projects = await listProjects(); active = await activeId();
    if (S.pid && !projects.some(p => p.id === S.pid)) S.pid = null;
    if (!S.pid) S.pid = active;
    await loadPackage();
  } catch (e) { console.warn('dashboard: saved state not restored', e); S = blank(); }
  render();
})();
