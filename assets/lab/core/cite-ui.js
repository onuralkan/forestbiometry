// "Cite" dialog (all pages). Data come from the page (#cite-data, written by inc/site.php); strings from citation.js.
import { FORMATS, NAMES, cite, plain } from './citation.js';

const data = JSON.parse(document.getElementById('cite-data').textContent);
const ui = document.documentElement.lang === 'en' ? 'en' : 'tr';
const T = {
  tr: { h: 'Kaynak gösterme', scope: 'Neyi kaynak göstereceksiniz?', tool: t => `Bu araç: ${t}`, platform: 'Platformun tamamı', lang: 'Atıf dili', date: 'Erişim tarihi',
    copy: 'Kopyala', copied: 'Kopyalandı', dl: 'İndir', close: 'Kapat',
    note: 'Biçimler, kılavuzların yazılım ve web uygulamaları için verdiği genel kalıba göre hazırlanmıştır; derginizin kurallarıyla karşılaştırın. Kullandığınız aracı ve sürümünü yazın; araçtaki yöntemlerin özgün kaynaklarını (ör. model denklemlerinin yazarları) ayrıca gösterin. Platformun kaynak kodu Zenodo\'da arşivlenir; biçimlerdeki DOI bütün sürümleri kapsayan kavram DOI\'sidir, belirli bir arşiv sürümü için Zenodo kaydındaki sürüm DOI\'sini kullanın.' },
  en: { h: 'How to cite', scope: 'What are you citing?', tool: t => `This tool: ${t}`, platform: 'The whole platform', lang: 'Citation language', date: 'Date accessed',
    copy: 'Copy', copied: 'Copied', dl: 'Download', close: 'Close',
    note: 'The formats follow the general pattern the style guides give for software and web applications; check them against your journal\'s rules. State the tool and its version; cite the original sources of the methods in the tool (e.g. the authors of the model equations) as well. The source code of the platform is archived on Zenodo; the DOI in the formats is the concept DOI covering all versions; for one archived version use its version DOI on the Zenodo record.' },
}[ui];
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const st = { scope: data.tool ? 'tool' : 'platform', lang: ui, accessed: today() };
const dlg = document.getElementById('citedlg');

function input() { return { lang: st.lang, author: data.author, year: data.year, base: data.base, site: data.site, tool: st.scope === 'tool' ? data.tool : null, accessed: st.accessed, doi: data.doi || null }; }
function render() {
  const c = input();
  const blocks = FORMATS.map(f => {
    const html = cite(f, c), code = f === 'bibtex' || f === 'ris';
    return `<div class="cite-row" data-f="${f}"><div class="cite-name">${NAMES[f]}</div>
      ${code ? `<pre class="cite-code">${html}</pre>` : `<p class="cite-text">${html}</p>`}
      <div class="cite-acts"><button type="button" class="btn ghost small" data-copy="${f}">${T.copy}</button>${code ? `<button type="button" class="btn ghost small" data-dl="${f}">${T.dl} .${f === 'bibtex' ? 'bib' : 'ris'}</button>` : ''}</div></div>`;
  }).join('');
  dlg.innerHTML = `<div class="dlg-f cite"><div class="cite-head"><h2>${T.h}</h2><button type="button" class="b-iconbtn" id="citeclose" aria-label="${T.close}"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>
    <div class="cite-opts">${data.tool ? `<fieldset><legend>${T.scope}</legend><label><input type="radio" name="cscope" value="tool"${st.scope === 'tool' ? ' checked' : ''}> ${T.tool(data.tool[ui])} (v${data.tool.v})</label>
      <label><input type="radio" name="cscope" value="platform"${st.scope === 'platform' ? ' checked' : ''}> ${T.platform}</label></fieldset>` : ''}
      <fieldset><legend>${T.lang}</legend><label><input type="radio" name="clang" value="tr"${st.lang === 'tr' ? ' checked' : ''}> Türkçe</label><label><input type="radio" name="clang" value="en"${st.lang === 'en' ? ' checked' : ''}> English</label></fieldset>
      <label class="cite-date">${T.date} <input type="date" id="cdate" value="${st.accessed}" max="${today()}"></label></div>
    <div class="cite-list">${blocks}</div><p class="muted small">${T.note}</p></div>`;
  dlg.querySelector('#citeclose').addEventListener('click', () => dlg.close());
  dlg.querySelectorAll('input[name="cscope"]').forEach(x => x.addEventListener('change', () => { st.scope = x.value; render(); }));
  dlg.querySelectorAll('input[name="clang"]').forEach(x => x.addEventListener('change', () => { st.lang = x.value; render(); }));
  dlg.querySelector('#cdate').addEventListener('change', e => { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) { st.accessed = e.target.value; render(); dlg.querySelector('#cdate').focus(); } });
  dlg.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    const html = cite(b.dataset.copy, input()), text = plain(html);
    try {
      if (window.ClipboardItem && navigator.clipboard.write && !['bibtex', 'ris'].includes(b.dataset.copy)) await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]);
      else await navigator.clipboard.writeText(text);
      b.textContent = T.copied; setTimeout(() => { b.textContent = T.copy; }, 1500);
    } catch (e) {   // no clipboard permission: select the text so the user can copy it
      const el = b.closest('.cite-row').querySelector('.cite-text, .cite-code'), r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    }
  }));
  dlg.querySelectorAll('[data-dl]').forEach(b => b.addEventListener('click', () => {
    const f = b.dataset.dl, text = plain(cite(f, input())), a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text + (f === 'bibtex' ? '\n' : '\r\n')], { type: f === 'bibtex' ? 'application/x-bibtex' : 'application/x-research-info-systems' }));
    a.download = `${input().tool ? data.tool.file.replace(/\.php$/, '') : 'forestbiometry'}-${st.lang}.${f === 'bibtex' ? 'bib' : 'ris'}`;
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }));
}
function open() { render(); dlg.showModal(); }
document.querySelectorAll('[data-cite-open]').forEach(b => b.addEventListener('click', open));
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
// inline platform citation (About page)
const inl = document.getElementById('cite-inline');
if (inl) inl.innerHTML = cite('apa', { lang: ui, author: data.author, year: data.year, base: data.base, site: data.site, tool: null, accessed: today(), doi: data.doi || null });
