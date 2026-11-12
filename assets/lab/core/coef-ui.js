// Shared coefficient-set editor (model-coef/1; docs/TOOLS_SPEC.md §1.3, stage T01). Used by the site index, biomass
// and taper tools. The user picks one of the tool's registered equation forms, enters the coefficients, units,
// validity ranges, back-transformation correction (log forms) and the source; the source is mandatory (K1).
// Coefficients are read with a decimal POINT (also 1.2e-5); nothing is rounded or guessed.
import * as C from './coef.js';
import { lang, makeT, esc } from './i18n.js';
import { downloadJSON } from './export.js';

const T = makeT({
  tr: {
    h: 'Katsayı setleri', sub: 'Bu araç hiçbir tür ya da yöre katsayısı içermez. Setleri siz girersiniz; kaynak alanı zorunludur. Setler yalnızca bu tarayıcıda saklanır.',
    none: 'Henüz kayıtlı set yok.', form: 'Denklem biçimi', new: 'Yeni set', edit: 'Düzenle', del: 'Sil', delq: 'Bu set silinsin mi?',
    save: 'Seti kaydet', cancel: 'Vazgeç', exp: 'Setleri indir (JSON)', imp: 'JSON\'dan yükle',
    params: 'Katsayılar', units: 'Birimler', input: 'Girdi', output: 'Çıktı', valid: 'Geçerlilik aralığı (isteğe bağlı)', vmin: 'en küçük', vmax: 'en büyük',
    meta: 'Kapsam', species: 'Tür', region: 'Yöre', component: 'Bileşen',
    tr_h: 'Geri dönüşüm düzeltmesi', 'corr.none': 'yok', 'corr.baskerville': 'Baskerville, exp(SEE²/2)', 'corr.snowdon': 'Snowdon oranı', 'corr.user': 'kullanıcı etkeni',
    see: p => p.kind === 'log10' ? 'SEE (log10 ölçeğinde)' : 'SEE (ln ölçeğinde)', fac: 'Etken',
    src: 'Kaynak', cit: 'Künye (zorunlu)', doi: 'DOI', page: 'Sayfa', table: 'Tablo', note: 'Not',
    cith: 'Ör. Yazar (yıl), dergi, cilt: sayfa; ya da "Kendi verim, yayımlanmamış".',
    saved: 'Set kaydedildi.', imported: p => `${p.n} set yüklendi.`, rejected: p => `${p.n} set geçersiz olduğu için yüklenmedi: ${p.why}`,
    th_form: 'Biçim', th_scope: 'Kapsam', th_src: 'Kaynak', th_mod: 'Değişti', origin_fitted: 'uydurulan',
    'p.schema': 'şema geçersiz', 'p.id': 'kimlik yok', 'p.tool': 'araç yok', 'p.form.unknown': 'biçim tanınmıyor', 'p.form.tool': 'biçim bu araca ait değil',
    'p.param.missing': p => `${p.key} katsayısı girilmedi`, 'p.param.extra': p => `${p.key} bu biçimde yok`, 'p.param.nonfinite': p => `${p.key} sayı değil`,
    'p.unit.input': p => `${p.key} girdisinin birimi yok`, 'p.unit.output': 'çıktı birimi yok', 'p.bark': 'kabuk durumu ob ya da ib olmalı',
    'p.valid.bad': p => `${p.key ?? ''} geçerlilik aralığı geçersiz (en küçük < en büyük olmalı)`, 'p.transform.bad': 'dönüşüm biçimle uyuşmuyor',
    'p.correction.bad': 'düzeltme türü geçersiz', 'p.correction.value': 'düzeltme için pozitif bir değer girin', 'p.source.missing': 'kaynak künyesi zorunlu',
    'p.origin.bad': 'köken geçersiz', 'p.fit.missing': 'uydurma özeti yok', 'p.library.schema': 'dosya bir katsayı kütüphanesi değil', 'p.num': p => `${p.what}: sayı okunamadı ("${p.text}")`,
  },
  en: {
    h: 'Coefficient sets', sub: 'This tool contains no species or regional coefficients. You enter the sets; the source is mandatory. Sets are stored in this browser only.',
    none: 'No set saved yet.', form: 'Equation form', new: 'New set', edit: 'Edit', del: 'Delete', delq: 'Delete this set?',
    save: 'Save the set', cancel: 'Cancel', exp: 'Download the sets (JSON)', imp: 'Load from JSON',
    params: 'Coefficients', units: 'Units', input: 'Input', output: 'Output', valid: 'Validity range (optional)', vmin: 'min', vmax: 'max',
    meta: 'Scope', species: 'Species', region: 'Region', component: 'Component',
    tr_h: 'Back-transformation correction', 'corr.none': 'none', 'corr.baskerville': 'Baskerville, exp(SEE²/2)', 'corr.snowdon': 'Snowdon ratio', 'corr.user': 'user factor',
    see: p => p.kind === 'log10' ? 'SEE (log10 scale)' : 'SEE (ln scale)', fac: 'Factor',
    src: 'Source', cit: 'Citation (required)', doi: 'DOI', page: 'Page', table: 'Table', note: 'Note',
    cith: 'E.g. Author (year), journal, volume: pages; or "Own data, unpublished".',
    saved: 'Set saved.', imported: p => `${p.n} set(s) loaded.`, rejected: p => `${p.n} set(s) not loaded because they are invalid: ${p.why}`,
    th_form: 'Form', th_scope: 'Scope', th_src: 'Source', th_mod: 'Changed', origin_fitted: 'fitted',
    'p.schema': 'invalid schema', 'p.id': 'no id', 'p.tool': 'no tool', 'p.form.unknown': 'unknown form', 'p.form.tool': 'the form belongs to another tool',
    'p.param.missing': p => `coefficient ${p.key} missing`, 'p.param.extra': p => `${p.key} is not in this form`, 'p.param.nonfinite': p => `${p.key} is not a number`,
    'p.unit.input': p => `no unit for input ${p.key}`, 'p.unit.output': 'no output unit', 'p.bark': 'bark status must be ob or ib',
    'p.valid.bad': p => `invalid validity range ${p.key ?? ''} (min must be below max)`, 'p.transform.bad': 'the transformation does not match the form',
    'p.correction.bad': 'invalid correction', 'p.correction.value': 'enter a positive value for the correction', 'p.source.missing': 'the citation is required',
    'p.origin.bad': 'invalid origin', 'p.fit.missing': 'no fit summary', 'p.library.schema': 'the file is not a coefficient library', 'p.num': p => `${p.what}: number not readable ("${p.text}")`,
  },
});
export const problemText = q => T('p.' + q.code, q);
const RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;
/** Coefficient text → number (decimal point only); '' → null; otherwise NaN (reported, never guessed). */
export const readNum = t => { const s = String(t ?? '').trim().replace(/−/g, '-'); return s === '' ? null : RE.test(s) ? Number(s) : NaN; };
const show = v => v == null ? '' : String(v);              // full precision as stored

/**
 * Mounts the library + editor into el. opts = { tool, onChange?(sets) }. Returns { refresh() }.
 * Every control has a stable id prefixed with 'cf-' so tools and tests can address it.
 */
export function mountCoefEditor(el, opts) {
  const tool = opts.tool, forms = C.formsFor(tool);
  let sets = [], draft = null, text = null, msg = null;          // text: the typed strings of the draft
  const refresh = async () => { sets = await C.listCoefs(tool); render(); opts.onChange && opts.onChange(sets); };
  const startDraft = (s) => {
    draft = JSON.parse(JSON.stringify(s));
    const f = C.form(draft.form);
    text = { params: Object.fromEntries(f.params.map(q => [q.key, show(draft.params[q.key])])),
      valid: Object.fromEntries(Object.keys(f.inputs).map(k => [k, (draft.valid && draft.valid[k] || [null, null]).map(show)])),
      corrValue: show(draft.transform && draft.transform.value) };
    msg = null; render();
  };
  function collect() {
    const f = C.form(draft.form), bad = [];
    const n = (t, what) => { const v = readNum(t); if (Number.isNaN(v)) bad.push({ code: 'num', what, text: t }); return v; };
    draft.params = {};
    for (const q of f.params) { const v = n(text.params[q.key], q.label ?? q.key); if (v != null && !Number.isNaN(v)) draft.params[q.key] = v; }
    const valid = {};
    for (const k of Object.keys(f.inputs)) { const [a, b] = text.valid[k].map((t, i) => n(t, `${k} ${i ? T('vmax') : T('vmin')}`)); if (a != null || b != null) valid[k] = [Number.isNaN(a) ? null : a, Number.isNaN(b) ? null : b]; }
    draft.valid = Object.keys(valid).length ? valid : null;
    if (draft.transform) {
      const c = draft.transform.correction;
      if (c === 'none') delete draft.transform.value; else { const v = n(text.corrValue, T('fac')); if (v != null && !Number.isNaN(v)) draft.transform.value = v; else delete draft.transform.value; }
    }
    return bad;
  }
  function render() {
    const row = s => { const f = C.form(s.form);
      return `<tr data-id="${esc(s.id)}"><td>${esc(f ? (f.formula[lang] || f.formula.tr) : s.form)}</td><td>${esc([s.species, s.region, s.component].filter(Boolean).join(' · ') || '–')}${s.origin === 'fitted' ? ` <span class="muted small">(${T('origin_fitted')})</span>` : ''}</td>
        <td class="small">${esc(s.source.citation)}</td><td class="small">${esc(String(s.modified || '').slice(0, 10))}</td>
        <td><button type="button" class="btn ghost small" data-act="edit">${T('edit')}</button> <button type="button" class="btn ghost small" data-act="del">${T('del')}</button></td></tr>`; };
    let h = `<div class="card coefcard"><h2>${T('h')}</h2><p class="muted small">${T('sub')}</p>
      ${sets.length ? `<div class="tscroll"><table class="grid" id="cf-list"><thead><tr><th>${T('th_form')}</th><th>${T('th_scope')}</th><th>${T('th_src')}</th><th>${T('th_mod')}</th><th></th></tr></thead><tbody>${sets.map(row).join('')}</tbody></table></div>` : `<p class="small" id="cf-none">${T('none')}</p>`}
      <div class="lims"><label>${T('form')} <select id="cf-form">${forms.map(f => `<option value="${esc(f.id)}">${esc(f.formula[lang] || f.formula.tr)}</option>`).join('')}</select></label>
        <button type="button" class="btn ghost small" id="cf-new"${forms.length ? '' : ' disabled'}>${T('new')}</button>
        <button type="button" class="btn ghost small" id="cf-exp"${sets.length ? '' : ' disabled'}>${T('exp')}</button>
        <label class="btn ghost small">${T('imp')} <input type="file" id="cf-imp" accept=".json,application/json" hidden></label></div>
      ${msg ? `<p class="note ${msg.kind}" id="cf-msg">${esc(msg.text)}</p>` : ''}
      ${draft ? editor() : ''}</div>`;
    el.innerHTML = h; bind();
  }
  function editor() {
    const f = C.form(draft.form), inp = (id, v, lab, size = 12) => `<label>${lab} <input type="text" inputmode="decimal" size="${size}" id="${id}" value="${esc(v)}"></label>`;
    const tx = draft.transform;
    return `<form id="cf-edit" class="coefedit" novalidate><h3>${esc(f.formula[lang] || f.formula.tr)}</h3>
      <h3>${T('params')}</h3><div class="lims">${f.params.map(q => inp('cf-p-' + q.key, text.params[q.key], esc(q.label ?? q.key))).join('')}</div>
      <h3>${T('units')}</h3><p class="small">${Object.entries(draft.inputs).map(([k, v]) => `${T('input')} ${esc(k)}: ${esc(v.unit)}${v.bark ? ` (${esc(v.bark)})` : ''}`).join('; ')}; ${T('output')} ${esc(draft.output.name || '')}: ${esc(draft.output.unit)}${draft.output.bark ? ` (${esc(draft.output.bark)})` : ''}</p>
      <h3>${T('valid')}</h3><div class="lims">${Object.keys(f.inputs).map(k => `${inp(`cf-v-${k}-0`, text.valid[k][0], `${esc(k)} ${T('vmin')}`, 7)} ${inp(`cf-v-${k}-1`, text.valid[k][1], T('vmax'), 7)}`).join('')}</div>
      ${tx ? `<h3>${T('tr_h')}</h3><div class="radios">${['none', 'baskerville', 'snowdon', 'user'].map(c => `<label><input type="radio" name="cf-corr" value="${c}"${tx.correction === c ? ' checked' : ''}> ${T('corr.' + c)}</label>`).join('')}</div>
        ${tx.correction !== 'none' ? `<div class="lims">${inp('cf-corrv', text.corrValue, tx.correction === 'baskerville' ? T('see', tx) : T('fac'), 9)}</div>` : ''}` : ''}
      <h3>${T('meta')}</h3><div class="lims">${['species', 'region', 'component'].map(k => `<label>${T(k)} <input type="text" size="14" id="cf-${k}" value="${esc(draft[k] ?? '')}"></label>`).join('')}</div>
      <h3>${T('src')}</h3><label class="field"><span>${T('cit')}</span><input type="text" id="cf-cit" value="${esc(draft.source.citation)}" placeholder="${esc(T('cith'))}"></label>
      <div class="lims">${['doi', 'page', 'table', 'note'].map(k => `<label>${T(k)} <input type="text" size="${k === 'note' ? 30 : 12}" id="cf-${k}" value="${esc(draft.source[k] ?? '')}"></label>`).join('')}</div>
      <div class="nav"><button type="submit" class="btn" id="cf-save">${T('save')}</button> <button type="button" class="btn ghost" id="cf-cancel">${T('cancel')}</button></div></form>`;
  }
  function bind() {
    const $ = id => el.querySelector('#' + id);
    $('cf-new') && $('cf-new').addEventListener('click', () => startDraft(C.blankSet($('cf-form').value)));
    el.querySelectorAll('#cf-list [data-act]').forEach(b => b.addEventListener('click', async () => {
      const id = b.closest('tr').dataset.id, s = sets.find(x => x.id === id);
      if (b.dataset.act === 'edit') startDraft(s);
      else if (confirm(T('delq'))) { await C.deleteCoef(id); if (draft && draft.id === id) draft = null; await refresh(); }
    }));
    $('cf-exp') && $('cf-exp').addEventListener('click', () => downloadJSON(`katsayi-setleri-${tool}-${new Date().toISOString().slice(0, 10)}.json`, C.exportLibrary(sets)));
    $('cf-imp') && $('cf-imp').addEventListener('change', async e => {
      const file = e.target.files[0]; if (!file) return;
      let obj; try { obj = JSON.parse(await file.text()); } catch (err) { msg = { kind: 'err', text: problemText({ code: 'library.schema' }) }; render(); return; }
      const r = C.importLibrary(obj), mine = r.sets.filter(s => s.tool === tool);
      for (const s of mine) await C.saveCoef(s, s.modified || undefined);
      const rej = r.rejected.length + (r.sets.length - mine.length);
      msg = rej ? { kind: 'warn', text: T('imported', { n: mine.length }) + ' ' + T('rejected', { n: rej, why: [...new Set(r.rejected.flatMap(x => x.problems.map(problemText)).concat(r.sets.length - mine.length ? [problemText({ code: 'form.tool' })] : []))].join('; ') }) } : { kind: 'ok', text: T('imported', { n: mine.length }) };
      await refresh();
    });
    if (!draft) return;
    const ed = $('cf-edit');
    ed.querySelectorAll('input[id^="cf-p-"]').forEach(x => x.addEventListener('input', () => { text.params[x.id.slice(5)] = x.value; }));
    ed.querySelectorAll('input[id^="cf-v-"]').forEach(x => x.addEventListener('input', () => { const m = x.id.match(/^cf-v-(.+)-([01])$/); text.valid[m[1]][+m[2]] = x.value; }));
    ed.querySelectorAll('input[name="cf-corr"]').forEach(x => x.addEventListener('change', () => { collectMeta(); draft.transform.correction = x.value; render(); }));
    $('cf-corrv') && $('cf-corrv').addEventListener('input', e => { text.corrValue = e.target.value; });
    const collectMeta = () => {
      for (const k of ['species', 'region', 'component']) draft[k] = $('cf-' + k).value.trim() || null;
      draft.source = { citation: $('cf-cit').value.trim() };
      for (const k of ['doi', 'page', 'table', 'note']) { const v = $('cf-' + k).value.trim(); if (v) draft.source[k] = v; }
    };
    $('cf-cancel').addEventListener('click', () => { draft = null; msg = null; render(); });
    ed.addEventListener('submit', async e => {
      e.preventDefault(); collectMeta();
      const bad = collect(), r = bad.length ? { ok: false, problems: bad } : await C.saveCoef(draft);
      if (!r.ok) { msg = { kind: 'err', text: r.problems.map(problemText).join('; ') }; render(); return; }
      draft = null; msg = { kind: 'ok', text: T('saved') }; await refresh();
    });
  }
  refresh();
  return { refresh };
}
