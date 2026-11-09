// Plot & Stand Metrics: user interface. All arithmetic lives in calc.js.
import * as C from './calc.js';
import { T } from './i18n.js';
import { lang, fmtNum, esc } from '../core/i18n.js';
import { put, get, del } from '../core/store.js';
import { download, downloadCSV, xlsxBlob, loadXLSX } from '../core/export.js';
import { barChart, svgForDownload } from '../core/chart.js';

const BASE = './', KEY = 'session:' + C.TOOL.id;
const $ = id => document.getElementById(id);
const LOC = lang === 'tr' ? 'tr-TR' : 'en-GB';
const f = (x, d = 2) => fmtNum(x, d);
const perLabel = p => p == null ? T('per.none') : p;
const when = iso => iso ? new Date(iso).toLocaleString(LOC) : '–';

let S = blank(), R = null, approved = null;
function blank() {
  return { v: 1, step: 1, tab: 'units', ds: null, dsSrc: null, scopeOk: false, status: null, emptyCombos: null,
    cls: null, design: { type: 'none', forestArea: '', strata: {} }, sel: 0 };
}
let saveT = null;
function save() { clearTimeout(saveT); saveT = setTimeout(flush, 250); }
async function flush() { clearTimeout(saveT); saveT = null; await put(KEY, { ...S, saved: new Date().toISOString() }); }
$('langlink') && $('langlink').addEventListener('click', async e => { e.preventDefault(); const h = e.currentTarget.href; await flush(); location.href = h; });
function status(m, k = '') { const s = $('status'); s.className = 'status ' + k; s.textContent = m || ''; }
const num = v => { const x = parseFloat(String(v).replace(',', '.')); return Number.isFinite(x) ? x : NaN; };

/* ---------------- step 1: data ---------------- */
function dsInfo(ds, name) {
  return T('src.info', { name: esc(name || (ds.source && ds.source.trees && ds.source.trees.name) || '–'), trees: fmtNum(ds.trees.length, 0), plots: fmtNum(ds.plots.length, 0), periods: C.periodsOf(ds).filter(p => p != null).length || 1, when: when(ds.created) });
}
function useDataset(ds, src) {
  const probs = C.validateDataset(ds);
  if (probs.length) { status(T('src.bad', { codes: probs.join(', ') }), 'err'); return; }
  S.ds = ds; S.dsSrc = src; S.status = null; S.emptyCombos = null; S.cls = defaultClasses(ds); S.sel = 0; R = null;
  const strata = [...new Set(ds.plots.map(p => p.stratum).filter(Boolean))];
  S.design = { type: 'none', forestArea: '', strata: Object.fromEntries(strata.map(h => [h, ''])) };
  status(''); save(); render();
}
function defaultClasses(ds) {
  const d = ds.trees.map(t => t.dbh), w = 4;
  if (!d.length) return { mode: 'width', start: 8, width: w, end: 60, openTop: false, breaks: '', hint: null };
  const mn = Math.min(...d), mx = Math.max(...d);
  return { mode: 'width', start: Math.floor(mn / w) * w, width: w, end: Math.max(Math.floor(mx / w) * w + w, Math.floor(mn / w) * w + w), openTop: false, breaks: '', hint: { min: mn, max: mx } };
}
function renderStep1() {
  const el = $('step1');
  let h = `<div class="card"><h2>${T('src.h')}</h2><p class="muted">${T('src.sub')}</p>`;
  if (approved) h += `<div class="srcbox"><b>${T('src.approved')}</b><p class="small">${dsInfo(approved)}</p><button type="button" class="btn" id="useapp">${T('src.use')}</button></div>`;
  else h += `<p class="note">${T('src.none')} <a href="veri-denetcisi.php">${T('src.checker')}</a></p>`;
  h += `<div class="srcrow"><label class="filebtn small"><input type="file" accept=".json,application/json" id="dsfile"><span>${T('src.filebtn')}</span></label>
    <button type="button" class="btn ghost" id="sample">${T('src.sample')}</button></div><p class="muted small">${T('src.sample.note')}</p>`;
  if (S.ds) {
    h += `<p class="note ok"><b>${T('src.current')}:</b> ${dsInfo(S.ds, S.dsSrc && S.dsSrc.name)}</p>`;
    if (approved && S.dsSrc && S.dsSrc.kind === 'approved' && approved.created !== S.ds.created) h += `<p class="note warn">${T('src.newer')}</p>`;
  }
  h += `</div><div class="card"><h2>${T('scope.h')}</h2><p>${T('scope.sub')}</p><p class="note warn">${T('scope.no')}</p>
    <label class="chk"><input type="checkbox" id="scope"${S.scopeOk ? ' checked' : ''}> ${T('scope.ok')}</label></div>
    <div class="nav"><button type="button" class="btn ghost" id="reset">${T('reset')}</button><button type="button" class="btn" id="to2"${S.ds && S.scopeOk ? '' : ' disabled'}>${T('next')}</button>
    ${!S.ds ? `<span class="muted small">${T('need.ds')}</span>` : !S.scopeOk ? `<span class="muted small">${T('need.scope')}</span>` : ''}</div>`;
  el.innerHTML = h;
  $('useapp') && $('useapp').addEventListener('click', () => useDataset(approved, { kind: 'approved', name: approved.source && approved.source.trees && approved.source.trees.name }));
  $('dsfile').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    try { useDataset(JSON.parse(await file.text()), { kind: 'file', name: file.name }); } catch (err) { status(T('src.readfail'), 'err'); }
  });
  $('sample').addEventListener('click', async () => {
    const ds = await (await fetch(BASE + 'assets/lab/stand/ornek/ornek-veri.json')).json();
    useDataset(ds, { kind: 'sample', name: lang === 'tr' ? 'örnek veri paketi (uydurma)' : 'sample data package (made up)' });
  });
  $('scope').addEventListener('change', e => { S.scopeOk = e.target.checked; save(); renderStep1(); renderSteps(); });
  $('reset').addEventListener('click', async () => { S = blank(); R = null; status(''); render(); await del(KEY); });
  $('to2').addEventListener('click', () => go(2));
}

/* ---------------- step 2: settings ---------------- */
function currentClasses() {
  const c = S.cls;
  if (c.mode === 'width') {
    const b = C.breaksFromWidth(num(c.start), num(c.width), num(c.end));
    if (!b) return { problem: 'cls.width.bad' };
    return C.classesFromBreaks(b, c.openTop);
  }
  const parts = String(c.breaks).trim().split(/[;\s]+/).filter(Boolean).map(num);
  return C.classesFromBreaks(parts, c.openTop);
}
function clsLabel(k) { return k.hi === Infinity ? `≥ ${f(k.lo, 3)}` : `[${f(k.lo, 3)}, ${f(k.hi, 3)})`; }
function missingCombos() {
  const { units, noPeriod } = C.buildUnits(S.ds, { status: null, emptyCombos: null });
  return noPeriod ? [] : units.filter(u => u.state === 'unknown');
}
function renderStep2() {
  const el = $('step2'), ds = S.ds, stats = C.statusesOf(ds), c = S.cls, cl = currentClasses();
  let h = `<div class="card"><h2>${T('st.h')}</h2>`;
  if (stats.length === 1 && stats[0] === '') h += `<p class="muted">${T('st.none')}</p>`;
  else h += `<p class="muted">${T('st.sub')}</p><div class="radios">${stats.map(s => `<label><input type="checkbox" data-st="${esc(s)}"${!S.status || S.status.includes(s) ? ' checked' : ''}> ${s === '' ? T('st.blank') : esc(s)}</label>`).join('')}</div>`;
  h += '</div>';
  const miss = missingCombos();
  if (miss.length) {
    h += `<div class="card"><h2>${T('ec.h')}</h2><p class="muted">${T('ec.sub', { k: miss.length, ex: miss.slice(0, 4).map(u => `${esc(u.plot_id)} / ${esc(perLabel(u.period))}`).join(', ') })}</p>
      <div class="radios col">${['empty', 'unmeasured'].map(v => `<label><input type="radio" name="ec" value="${v}"${S.emptyCombos === v ? ' checked' : ''}> ${T('ec.' + v)}</label>`).join('')}</div>
      ${S.emptyCombos ? '' : `<p class="note warn">${T('ec.undecided')}</p>`}</div>`;
  }
  h += `<div class="card"><h2>${T('cls.h')}</h2><p class="muted">${T('cls.sub')}</p>
    <div class="radios"><label><input type="radio" name="cm" value="width"${c.mode === 'width' ? ' checked' : ''}> ${T('cls.width')}</label><label><input type="radio" name="cm" value="list"${c.mode === 'list' ? ' checked' : ''}> ${T('cls.list')}</label></div>`;
  if (c.mode === 'width') h += `<div class="lims"><label>${T('cls.start')} <input type="text" inputmode="decimal" data-c="start" value="${esc(c.start)}" size="6"></label>
      <label>${T('cls.w')} <input type="text" inputmode="decimal" data-c="width" value="${esc(c.width)}" size="6"></label>
      <label>${T('cls.end')} <input type="text" inputmode="decimal" data-c="end" value="${esc(c.end)}" size="6"></label></div>`;
  else h += `<label class="field"><span>${T('cls.breaks')}</span><input type="text" data-c="breaks" value="${esc(c.breaks)}" placeholder="8 12 16 20 30 50"></label>`;
  h += `<label class="chk"><input type="checkbox" id="opentop"${c.openTop ? ' checked' : ''}> ${T('cls.open')}</label>
    <p class="small" id="clsprev">${clsPreview(cl)}</p>${c.hint ? `<p class="muted small">${T('cls.suggest', { min: f(c.hint.min, 1), max: f(c.hint.max, 1) })}</p>` : ''}</div>`;
  const strata = Object.keys(S.design.strata);
  h += `<div class="card"><h2>${T('des.h')}</h2><p class="muted">${T('des.sub')}</p><div class="radios col">
    ${['none', 'srs', 'strat'].map(v => `<label><input type="radio" name="des" value="${v}"${S.design.type === v ? ' checked' : ''}${v === 'strat' && !strata.length ? ' disabled' : ''}> ${T('des.' + v)}</label>`).join('')}</div>`;
  if (!strata.length) h += `<p class="muted small">${T('des.nostrata')}</p>`;
  if (S.design.type === 'srs') h += `<p class="muted small">${T('des.srs.note')}</p><label class="field"><span>${T('des.area')}</span><input type="text" inputmode="decimal" id="farea" value="${esc(S.design.forestArea)}" size="10"></label>`;
  if (S.design.type === 'strat') h += `<p class="small"><b>${T('des.strata')}</b></p><div class="lims">${strata.map(s => `<label>${esc(s)} <input type="text" inputmode="decimal" data-stratum="${esc(s)}" value="${esc(S.design.strata[s])}" size="8"></label>`).join('')}</div>`;
  h += `</div><div class="nav"><button type="button" class="btn ghost" id="back1">${T('back')}</button><button type="button" class="btn" id="calc"${cl.problem ? ' disabled' : ''}>${T('calc')}</button></div>`;
  el.innerHTML = h;
  el.querySelectorAll('[data-st]').forEach(x => x.addEventListener('change', () => {
    const on = [...el.querySelectorAll('[data-st]')].filter(i => i.checked).map(i => i.dataset.st);
    S.status = on.length === stats.length ? null : on; R = null; save();
  }));
  el.querySelectorAll('input[name="ec"]').forEach(x => x.addEventListener('change', () => { S.emptyCombos = x.value; R = null; save(); renderStep2(); }));
  el.querySelectorAll('input[name="cm"]').forEach(x => x.addEventListener('change', () => {
    if (x.value === 'list' && !c.breaks) { const b = C.breaksFromWidth(num(c.start), num(c.width), num(c.end)); c.breaks = b ? b.map(v => String(v)).join(' ') : ''; }
    c.mode = x.value; R = null; save(); renderStep2();
  }));
  el.querySelectorAll('[data-c]').forEach(x => x.addEventListener('input', () => {
    c[x.dataset.c] = x.value; R = null; save();
    const k = currentClasses(); $('clsprev').innerHTML = clsPreview(k); $('calc').disabled = !!k.problem;
  }));
  $('opentop').addEventListener('change', e => { c.openTop = e.target.checked; R = null; save(); renderStep2(); });
  el.querySelectorAll('input[name="des"]').forEach(x => x.addEventListener('change', () => { S.design.type = x.value; R = null; save(); renderStep2(); }));
  $('farea') && $('farea').addEventListener('input', e => { S.design.forestArea = e.target.value; R = null; save(); });
  el.querySelectorAll('[data-stratum]').forEach(x => x.addEventListener('input', () => { S.design.strata[x.dataset.stratum] = x.value; R = null; save(); }));
  $('back1').addEventListener('click', () => go(1));
  $('calc').addEventListener('click', () => { compute(); S.tab = 'units'; go(3); });
}
function clsPreview(k) {
  if (k.problem) return `<span class="note err">${T(k.problem)}</span>`;
  const list = k.classes.length > 14 ? [...k.classes.slice(0, 6).map(clsLabel), '…', ...k.classes.slice(-3).map(clsLabel)] : k.classes.map(clsLabel);
  return T('cls.preview', { k: k.classes.length, list: list.join(', ') });
}
function designObj() {
  const d = S.design;
  if (d.type === 'srs') { const a = num(d.forestArea); return { type: 'srs', forestArea_ha: Number.isFinite(a) && a > 0 ? a : undefined }; }
  if (d.type === 'strat') return { type: 'strat', strataArea_ha: Object.fromEntries(Object.entries(d.strata).map(([k, v]) => [k, num(v)])) };
  return { type: 'none' };
}
function compute() {
  const cl = currentClasses();
  R = C.computeAll(S.ds, { status: S.status, emptyCombos: S.emptyCombos }, cl.classes, designObj());
  R.classes = cl.classes;
  if (S.sel >= R.metrics.length) S.sel = 0;
}

/* ---------------- step 3: results ---------------- */
const TABS = ['units', 'detail', 'between', 'forest', 'export'];
function renderStep3() {
  if (!R) compute();
  const el = $('step3');
  el.innerHTML = `<div class="tabs" role="tablist">${TABS.map(t => `<button type="button" role="tab" id="tab-${t}" aria-selected="${S.tab === t}" aria-controls="panel" data-tab="${t}">${T('tab.' + t)}</button>`).join('')}</div>
    <div id="panel" class="panel" role="tabpanel" aria-labelledby="tab-${S.tab}"></div><div class="nav"><button type="button" class="btn ghost" id="back2">${T('back')}</button></div>`;
  el.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { S.tab = b.dataset.tab; save(); renderStep3(); }));
  el.querySelector('.tabs').addEventListener('keydown', e => {
    const i = TABS.indexOf(S.tab), d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return; S.tab = TABS[(i + d + TABS.length) % TABS.length]; renderStep3(); $('tab-' + S.tab).focus();
  });
  $('back2').addEventListener('click', () => go(2));
  ({ units: tabUnits, detail: tabDetail, between: tabBetween, forest: tabForest, export: tabExport })[S.tab]($('panel'));
}
const UNIT_COLS = [['plot', m => esc(m.plot_id), 'code'], ['per', m => esc(perLabel(m.period))], ['state', m => T('s.' + m.state)], ['c.area', m => f(m.area_m2, 2), 'num'],
  ['c.n', m => fmtNum(m.n, 0), 'num'], ['c.Nha', m => f(m.Nha, 1), 'num'], ['c.Gha', m => f(m.Gha, 3), 'num'], ['c.dmean', m => f(m.d_mean, 2), 'num'], ['c.dq', m => f(m.dq, 2), 'num'],
  ['c.dmin', m => f(m.d_min, 1), 'num'], ['c.dmax', m => f(m.d_max, 1), 'num'], ['c.dsd', m => f(m.d_sd, 2), 'num'], ['c.hm', m => fmtNum(m.h_measured.n, 0), 'num'],
  ['c.hmean', m => f(m.h_measured.mean, 2), 'num'], ['c.he', m => fmtNum(m.h_estimated.n, 0), 'num']];
function tabUnits(p) {
  p.innerHTML = `<p class="muted">${T('units.note')}</p><div class="tscroll"><table class="grid units"><thead><tr>${UNIT_COLS.map(c => `<th>${T(c[0])}</th>`).join('')}</tr></thead><tbody>
    ${R.metrics.map((m, i) => `<tr class="st-${m.state}"><td><button type="button" class="linkbtn" data-sel="${i}"><code>${esc(m.plot_id)}</code></button></td>${UNIT_COLS.slice(1).map(c => `<td class="${c[2] || ''}">${C.isValidUnit(m) || c[0] === 'per' || c[0] === 'state' || c[0] === 'c.area' ? c[1](m) : '–'}</td>`).join('')}</tr>`).join('')}
    </tbody></table></div>`;
  p.querySelectorAll('[data-sel]').forEach(b => b.addEventListener('click', () => { S.sel = +b.dataset.sel; S.tab = 'detail'; save(); renderStep3(); }));
}
function chartBox(id, svg, name) { return `<figure class="chartbox" id="${id}">${svg}<figcaption><button type="button" class="btn ghost small" data-svg="${id}" data-name="${esc(name)}">${T('ch.svg')}</button></figcaption></figure>`; }
function bindSvg(p) {
  p.querySelectorAll('[data-svg]').forEach(b => b.addEventListener('click', () => download(b.dataset.name + '.svg', svgForDownload($(b.dataset.svg).querySelector('svg')), 'image/svg+xml')));
}
function tabDetail(p) {
  const m = R.metrics[S.sel], unitName = `${m.plot_id} / ${perLabel(m.period)}`, valid = C.isValidUnit(m);
  let h = `<label class="field inline"><span>${T('det.pick')}</span><select id="sel">${R.metrics.map((x, i) => `<option value="${i}"${i === S.sel ? ' selected' : ''}>${esc(x.plot_id)} / ${esc(perLabel(x.period))} (${T('s.' + x.state)})</option>`).join('')}</select></label>`;
  const tile = (v, l) => `<div class="tile"><b>${v}</b><span>${l}</span></div>`;
  h += `<h3>${T('det.metrics')}</h3><div class="tiles">${tile(fmtNum(m.n, 0), T('c.n'))}${tile(valid ? f(m.Nha, 1) : '–', T('c.Nha'))}${tile(valid ? f(m.Gha, 3) : '–', T('c.Gha'))}
    ${tile(f(m.d_mean, 2), T('c.dmean'))}${tile(f(m.dq, 2), T('c.dq'))}${tile(f(m.d_sd, 2), T('c.dsd'))}${tile(m.d_min == null ? '–' : `${f(m.d_min, 1)}–${f(m.d_max, 1)}`, T('c.drange'))}${tile(f(m.ef, 4), T('det.ef'))}</div>
    <p class="muted small">${T('c.area')}: ${f(m.area_m2, 2)} · ${T('c.G')}: ${f(m.G_m2, 5)} · ${T('state')}: ${T('s.' + m.state)}</p>`;
  if (!valid) { p.innerHTML = h + `<p class="note warn">${T('units.note')}</p>`; bindDetail(p); return; }
  // classes
  const cls = m.classes;
  h += `<h3>${T('det.cls')}</h3><div class="two"><div class="tscroll"><table class="grid"><thead><tr><th>${T('cl.class')}</th><th>${T('cl.mid')}</th><th>${T('cl.n')}</th><th>${T('cl.Nha')}</th><th>${T('cl.Gha')}</th></tr></thead><tbody>
    ${cls.map(k => `<tr><td class="nowrap">${clsLabel(k)}</td><td class="num">${k.hi === Infinity ? '–' : f((k.lo + k.hi) / 2, 3)}</td><td class="num">${fmtNum(k.n, 0)}</td><td class="num">${f(k.Nha, 1)}</td><td class="num">${f(k.Gha, 4)}</td></tr>`).join('')}</tbody></table></div><div>`;
  h += chartBox('ch-cls', barChart({ title: T('ch.cls', { u: unitName }), categories: cls.map(k => k.hi === Infinity ? `≥${f(k.lo, 1)}` : f(k.lo, 1)), series: [{ name: T('ch.y.Nha'), values: cls.map(k => k.Nha) }], xLabel: T('ch.x.cls'), yLabel: T('ch.y.Nha'), fmt: v => f(v, 1) }), `cap-siniflari-${m.plot_id}-${perLabel(m.period)}`);
  if (m.below) h += `<p class="small note warn">${T('cl.below', { b: f(R.classes[0].lo, 3), n: m.below })}</p>`;
  if (m.above) h += `<p class="small note warn">${T('cl.above', { b: f(R.classes[R.classes.length - 1].hi, 3), n: m.above })}</p>`;
  h += '</div></div>';
  // species
  h += `<h3>${T('det.sp')}</h3>`;
  if (!m.n) h += `<p class="muted">${T('sp.none')}</p>`;
  else {
    h += `<p class="small">${T('sp.den', { n: fmtNum(m.shareDen.n, 0), g: f(m.shareDen.G_m2, 5) })}</p><div class="two"><div class="tscroll"><table class="grid"><thead><tr><th>${T('sp.sp')}</th><th>${T('c.n')}</th><th>${T('c.Nha')}</th><th>${T('sp.shareN')}</th><th>${T('c.G')}</th><th>${T('c.Gha')}</th><th>${T('sp.shareG')}</th></tr></thead><tbody>
      ${m.species.map(s => `<tr><td>${esc(s.species)}</td><td class="num">${fmtNum(s.n, 0)}</td><td class="num">${f(s.Nha, 1)}</td><td class="num">${f(s.shareN * 100, 1)}</td><td class="num">${f(s.g, 5)}</td><td class="num">${f(s.Gha, 3)}</td><td class="num">${f(s.shareG * 100, 1)}</td></tr>`).join('')}</tbody></table></div><div>`;
    h += chartBox('ch-sp', barChart({ title: T('ch.sp', { u: unitName }), categories: m.species.map(s => s.species), series: [{ name: T('sp.shareN'), values: m.species.map(s => s.shareN * 100) }, { name: T('sp.shareG'), values: m.species.map(s => s.shareG * 100) }], yLabel: T('ch.y.pct'), fmt: v => f(v, 1) }), `tur-katilimi-${m.plot_id}-${perLabel(m.period)}`);
    h += '</div></div>';
  }
  // heights
  const hr = (lbl, s) => `<tr><th>${lbl}</th><td class="num">${fmtNum(s.n, 0)}</td><td class="num">${f(s.mean, 2)}</td><td class="num">${f(s.sd, 2)}</td><td class="num">${f(s.min, 1)}</td><td class="num">${f(s.max, 1)}</td></tr>`;
  h += `<h3>${T('det.h')}</h3><div class="tscroll"><table class="grid"><thead><tr><th>${T('h.kind')}</th><th>n</th><th>${T('h.mean')}</th><th>${T('h.sd')}</th><th>${T('h.min')}</th><th>${T('h.max')}</th></tr></thead><tbody>
    ${hr(T('h.meas'), m.h_measured)}${hr(T('h.est'), m.h_estimated)}<tr><th>${T('h.none')}</th><td class="num">${fmtNum(m.h_missing, 0)}</td><td colspan="4"></td></tr></tbody></table></div><p class="muted small">${T('h.note')}</p>`;
  p.innerHTML = h; bindDetail(p); bindSvg(p);
}
function bindDetail(p) { $('sel').addEventListener('change', e => { S.sel = +e.target.value; save(); tabDetail(p); }); }
function tabBetween(p) {
  let h = `<p class="note">${T('bt.note')}</p>`;
  for (const b of R.byPeriod) {
    const bt = b.between, row = (k, s, d) => `<tr><th>${T('v.' + k)}</th><td class="num">${fmtNum(s.n, 0)}</td><td class="num">${f(s.mean, d)}</td><td class="num">${f(s.sd, d)}</td><td class="num">${f(s.min, d)}</td><td class="num">${f(s.median, d)}</td><td class="num">${f(s.max, d)}</td></tr>`;
    h += `<h3>${T('per')}: ${esc(perLabel(b.period))} · ${T('bt.m', { m: bt.m, e: bt.mEmpty })}</h3>`;
    if (b.unknown || b.unmeasured) h += `<p class="small note warn">${T('bt.excl', { u: b.unknown, x: b.unmeasured })}</p>`;
    h += `<div class="tscroll"><table class="grid"><thead><tr><th>${T('bt.var')}</th><th>${T('bt.k')}</th><th>${T('bt.mean')}</th><th>${T('bt.sd')}</th><th>${T('bt.min')}</th><th>${T('bt.med')}</th><th>${T('bt.max')}</th></tr></thead><tbody>
      ${row('Nha', bt.Nha, 1)}${row('Gha', bt.Gha, 3)}${row('dmean', bt.d_mean, 2)}${row('dq', bt.dq, 2)}${row('area', bt.area_m2, 1)}</tbody></table></div>`;
  }
  p.innerHTML = h + `<p class="muted small">${T('bt.dnote')}</p>`;
}
function feRows(est, keys, label) {
  const tot = keys.some(k => est[k].total != null);
  return `<div class="tscroll"><table class="grid"><thead><tr><th>${T('fe.var')}</th><th>${T('fe.est')}</th><th>${T('fe.se')}</th><th>${T('fe.rse')}</th><th>${T('fe.m')}</th>${est[keys[0]].df != null ? `<th>${T('fe.df')}</th>` : ''}${tot ? `<th>${T('fe.total')}</th><th>${T('fe.setotal')}</th>` : ''}</tr></thead><tbody>
    ${keys.map(k => { const e = est[k], d = k.startsWith('G') ? 3 : 1; return `<tr><th>${label(k)}</th><td class="num">${f(e.mean, d)}</td><td class="num">${f(e.se, d)}</td><td class="num">${f(e.rse == null ? null : e.rse * 100, 1)}</td><td class="num">${e.m}</td>${e.df != null ? `<td class="num">${e.df}</td>` : ''}${tot ? `<td class="num">${f(e.total, d)}</td><td class="num">${f(e.se_total, d)}</td>` : ''}</tr>`; }).join('')}</tbody></table></div>`;
}
function tabForest(p) {
  if (S.design.type === 'none') { p.innerHTML = `<p class="note">${T('fe.none')}</p>`; return; }
  let h = `<p class="note">${T(S.design.type === 'srs' ? 'fe.design.srs' : 'fe.design.strat')}</p>`;
  for (const b of R.byPeriod) {
    const fe = b.forest;
    h += `<h3>${T('per')}: ${esc(perLabel(b.period))}</h3>`;
    if (!fe.estimate) { h += fe.problems.map(pr => `<p class="note err">${T('fe.p.' + pr.code, pr)}</p>`).join(''); continue; }
    const est = fe.estimate;
    h += feRows(est, ['Nha', 'Gha'], k => T('v.' + k));
    if (fe.species.length > 1) h += `<p class="small"><b>${T('fe.sp')}</b></p>` + feRows(est, fe.species.flatMap(s => [`Nha:${s}`, `Gha:${s}`]), k => `${esc(k.split(':').slice(1).join(':'))}: ${T('v.' + k.split(':')[0])}`);
    if (est.Nha.strata) h += `<p class="small"><b>${T('fe.strata')}</b></p><div class="tscroll"><table class="grid"><thead><tr><th></th><th>${T('fe.ha')}</th><th>${T('fe.W')}</th><th>m_h</th><th>ȳ N/ha</th><th>s N/ha</th><th>ȳ G/ha</th><th>s G/ha</th></tr></thead><tbody>
      ${Object.entries(est.Nha.strata).map(([hh, s]) => `<tr><th>${esc(hh)}</th><td class="num">${f(s.area_ha, 2)}</td><td class="num">${f(s.W, 4)}</td><td class="num">${s.m}</td><td class="num">${f(s.mean, 1)}</td><td class="num">${f(s.s, 1)}</td><td class="num">${f(est.Gha.strata[hh].mean, 3)}</td><td class="num">${f(est.Gha.strata[hh].s, 3)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  p.innerHTML = h + `<p class="muted small">${T('fe.nci')}</p>`;
}

/* ---------------- exports ---------------- */
const fname = (a, b) => `${lang === 'tr' ? a : b}-${new Date().toISOString().slice(0, 10)}`;
function unitRows() {
  return [['plot_id', 'period', 'state', 'stratum', 'area_m2', 'expansion_factor', 'n', 'N_ha', 'G_m2', 'G_m2_ha', 'd_mean_cm', 'dq_cm', 'd_min_cm', 'd_max_cm', 'd_sd_cm', 'h_measured_n', 'h_measured_mean_m', 'h_estimated_n', 'h_estimated_mean_m', 'h_missing_n', 'below_classes_n', 'above_classes_n'],
    ...R.metrics.map(m => { const v = C.isValidUnit(m); return [m.plot_id, m.period, m.state, m.stratum, m.area_m2, m.ef, v ? m.n : null, v ? m.Nha : null, v ? m.G_m2 : null, v ? m.Gha : null, m.d_mean, m.dq, m.d_min, m.d_max, m.d_sd,
      m.h_measured.n, m.h_measured.mean, m.h_estimated.n, m.h_estimated.mean, v ? m.h_missing : null, m.below, m.above]; })];
}
function classRows() {
  return [['plot_id', 'period', 'class_lower_cm', 'class_upper_cm', 'n', 'N_ha', 'G_m2_ha'],
    ...R.metrics.filter(C.isValidUnit).flatMap(m => m.classes.map(k => [m.plot_id, m.period, k.lo, k.hi === Infinity ? null : k.hi, k.n, k.Nha, k.Gha]))];
}
function speciesRows() {
  return [['plot_id', 'period', 'species', 'n', 'N_ha', 'share_of_n', 'n_denominator', 'g_m2', 'G_m2_ha', 'share_of_g', 'g_denominator_m2'],
    ...R.metrics.filter(C.isValidUnit).flatMap(m => m.species.map(s => [m.plot_id, m.period, s.species, s.n, s.Nha, s.shareN, m.shareDen.n, s.g, s.Gha, s.shareG, m.shareDen.G_m2]))];
}
function betweenRows() {
  const out = [['period', 'variable', 'plots', 'mean', 'sd', 'min', 'median', 'max']];
  for (const b of R.byPeriod) for (const [k, key] of [['N_ha', 'Nha'], ['G_m2_ha', 'Gha'], ['d_mean_cm', 'd_mean'], ['dq_cm', 'dq'], ['area_m2', 'area_m2']]) { const s = b.between[key]; out.push([b.period, k, s.n, s.mean, s.sd, s.min, s.median, s.max]); }
  return out;
}
function forestRows() {
  const out = [['period', 'design', 'variable', 'estimate_per_ha', 'se', 'relative_se', 'plots_m', 'df', 'total', 'se_total', 'problem']];
  for (const b of R.byPeriod) {
    const fe = b.forest; if (!fe) continue;
    if (!fe.estimate) { out.push([b.period, S.design.type, null, null, null, null, null, null, null, null, fe.problems.map(x => x.code + (x.stratum ? ':' + x.stratum : '')).join(' ')]); continue; }
    for (const [k, e] of Object.entries(fe.estimate)) out.push([b.period, S.design.type, k, e.mean, e.se, e.rse, e.m, e.df ?? null, e.total ?? null, e.se_total ?? null, null]);
  }
  return out;
}
function infoRows() {
  const c = S.cls;
  return [[T('x.k'), T('x.v')], [T('x.tool'), `${C.TOOL.id} ${C.TOOL.version}`], [T('x.date'), new Date().toISOString()], [T('x.src'), `${S.dsSrc ? S.dsSrc.name || S.dsSrc.kind : ''} (${S.ds.created})`],
    [T('x.status'), S.status ? S.status.map(s => s || T('st.blank')).join(', ') : T('x.all')], [T('x.ec'), S.emptyCombos ? T('ec.' + S.emptyCombos) : T('ec.undecided')],
    [T('x.cls'), R.classes.map(clsLabel).join(' ')], [T('x.design'), T('des.' + S.design.type)], ['', T('x.formulas')], ['', T('scope.no')]];
}
function tabExport(p) {
  p.innerHTML = `<div class="exports"><button type="button" class="btn" id="x-xlsx">${T('ex.xlsx')}</button><button type="button" class="btn ghost" id="x-units">${T('ex.units')}</button>
    <button type="button" class="btn ghost" id="x-cls">${T('ex.cls')}</button><button type="button" class="btn ghost" id="x-sp">${T('ex.sp')}</button></div><p class="muted small">${T('ex.note')}</p>`;
  $('x-units').addEventListener('click', () => downloadCSV(fname('ornek-alanlar', 'plots') + '.csv', unitRows(), lang));
  $('x-cls').addEventListener('click', () => downloadCSV(fname('cap-siniflari', 'diameter-classes') + '.csv', classRows(), lang));
  $('x-sp').addEventListener('click', () => downloadCSV(fname('tur-katilimi', 'species') + '.csv', speciesRows(), lang));
  $('x-xlsx').addEventListener('click', async () => {
    let XLSX; try { status(T('busy')); XLSX = await loadXLSX(BASE); status(''); } catch (e) { status('XLSX', 'err'); return; }
    const sheets = [{ name: T('sheet.info'), rows: infoRows(), widths: [30, 90] }, { name: T('sheet.units'), rows: unitRows() }, { name: T('sheet.cls'), rows: classRows() },
      { name: T('sheet.sp'), rows: speciesRows() }, { name: T('sheet.between'), rows: betweenRows() }];
    if (S.design.type !== 'none') sheets.push({ name: T('sheet.forest'), rows: forestRows() });
    download(fname('ornek-alan-mescere', 'plot-stand-metrics') + '.xlsx', xlsxBlob(XLSX, sheets));
  });
}

/* ---------------- shell ---------------- */
function canGo(n) { if (n <= 1) return true; if (!S.ds || !S.scopeOk) return false; if (n === 2) return true; return !currentClasses().problem; }
function go(n) { if (!canGo(n)) return; S.step = n; save(); render(); scrollTo({ top: $('steps').offsetTop - 8, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
function renderSteps() {
  $('steps').innerHTML = `<ol class="n3">${[1, 2, 3].map(n => `<li><button type="button" data-go="${n}"${S.step === n ? ' aria-current="step"' : ''}${canGo(n) ? '' : ' disabled'}><b>${n}</b> ${T('step.' + n)}</button></li>`).join('')}</ol>`;
  $('steps').querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(+b.dataset.go)));
}
function render() {
  if (!canGo(S.step)) S.step = [3, 2, 1].find(canGo);
  renderSteps();
  for (const n of [1, 2, 3]) $('step' + n).hidden = S.step !== n;
  ({ 1: renderStep1, 2: renderStep2, 3: renderStep3 })[S.step]();
}
(async function init() {
  $('privacy').textContent = T('privacy');
  try {
    const a = await get('dataset:approved');
    if (a && !C.validateDataset(a).length) approved = a;
    const saved = await get(KEY);
    if (saved && saved.v === 1) { S = { ...blank(), ...saved }; status(T('restored', { when: when(saved.saved) })); }
  } catch (e) { S = blank(); }
  render();
})();
