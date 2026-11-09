// Citation strings for the platform and for each tool (no DOM). Tested in tests/site/test_cite.mjs.
// Input c = { lang:'tr'|'en', author:{ family, given }, year, base (canonical URL with trailing '/'), site:{tr,en},
//             tool: null | { file, v, tr, en }, accessed: 'YYYY-MM-DD' }.
// Formats follow the general patterns of the style guides for software / web applications; journals may differ.
// HTML output only adds <i> for titles that the style sets in italics; plain text is the same without tags.

const MON_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MON_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const MLA_EN = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
const IEEE_EN = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sep.', 'Oct.', 'Nov.', 'Dec.'];
const VAN_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SHORT_TR = ['Oca.', 'Şub.', 'Mar.', 'Nis.', 'May.', 'Haz.', 'Tem.', 'Ağu.', 'Eyl.', 'Eki.', 'Kas.', 'Ara.'];
const VAN_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export const FORMATS = ['apa', 'mla', 'chicago', 'harvard', 'ieee', 'vancouver', 'bibtex', 'ris'];
export const NAMES = { apa: 'APA 7', mla: 'MLA 9', chicago: 'Chicago (author-date)', harvard: 'Harvard', ieee: 'IEEE', vancouver: 'Vancouver', bibtex: 'BibTeX', ris: 'RIS' };

const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const it = s => `<i>${esc(s)}</i>`;
export const plain = html => html.replace(/<\/?i>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

function parts(c) {
  const [y, m, d] = c.accessed.split('-').map(Number), mi = m - 1, tr = c.lang === 'tr';
  const site = c.site[c.lang], tool = c.tool ? c.tool[c.lang] : null;
  return { tr, y, m, d, mi, site, title: tool || site, container: tool ? site : null, v: c.tool ? c.tool.v : null,
    url: c.base + (c.tool ? c.tool.file : ''), fam: c.author.family, given: c.author.given, ini: c.author.given.charAt(0) + '.', year: c.year };
}
const noScheme = u => u.replace(/^https?:\/\//, '').replace(/\/$/, '');

/** Formatted citation (HTML; plain(...) for text). */
export function cite(fmt, c) {
  const p = parts(c), tr = p.tr, v = p.v;
  switch (fmt) {
    case 'apa':
      return tr
        ? `${esc(p.fam)}, ${p.ini} (${p.year}). ${it(p.title)}${v ? ` (Sürüm ${v})` : ''} [Web uygulaması].${p.container ? ` ${esc(p.container)}.` : ''} ${p.d} ${MON_TR[p.mi]} ${p.y} tarihinde ${esc(p.url)} adresinden erişildi.`
        : `${esc(p.fam)}, ${p.ini} (${p.year}). ${it(p.title)}${v ? ` (Version ${v})` : ''} [Web application].${p.container ? ` ${esc(p.container)}.` : ''} Retrieved ${MON_EN[p.mi]} ${p.d}, ${p.y}, from ${esc(p.url)}`;
    case 'mla':
      return tr
        ? `${esc(p.fam)}, ${esc(p.given)}. ${it(p.title)}. ${v ? `Sürüm ${v}, ` : ''}${p.container ? `${esc(p.container)}, ` : ''}${p.year}, ${esc(noScheme(p.url))}. Erişim ${p.d} ${SHORT_TR[p.mi]} ${p.y}.`
        : `${esc(p.fam)}, ${esc(p.given)}. ${it(p.title)}. ${v ? `Version ${v}, ` : ''}${p.container ? `${esc(p.container)}, ` : ''}${p.year}, ${esc(noScheme(p.url))}. Accessed ${p.d} ${MLA_EN[p.mi]} ${p.y}.`;
    case 'chicago':
      return tr
        ? `${esc(p.fam)}, ${esc(p.given)}. ${p.year}. ${it(p.title)}. ${v ? `Sürüm ${v}. ` : ''}${p.container ? `${esc(p.container)}. ` : ''}Erişim ${p.d} ${MON_TR[p.mi]} ${p.y}. ${esc(p.url)}.`
        : `${esc(p.fam)}, ${esc(p.given)}. ${p.year}. ${it(p.title)}. ${v ? `Version ${v}. ` : ''}${p.container ? `${esc(p.container)}. ` : ''}Accessed ${MON_EN[p.mi]} ${p.d}, ${p.y}. ${esc(p.url)}.`;
    case 'harvard':
      return tr
        ? `${esc(p.fam)}, ${p.ini} (${p.year}) ${it(p.title)}${v ? ` (sürüm ${v})` : ''}.${p.container ? ` ${esc(p.container)}.` : ''} Erişim adresi: ${esc(p.url)} (Erişim tarihi: ${p.d} ${MON_TR[p.mi]} ${p.y}).`
        : `${esc(p.fam)}, ${p.ini} (${p.year}) ${it(p.title)}${v ? ` (version ${v})` : ''}.${p.container ? ` ${esc(p.container)}.` : ''} Available at: ${esc(p.url)} (Accessed: ${p.d} ${MON_EN[p.mi]} ${p.y}).`;
    case 'ieee': {
      const head = p.container ? `“${esc(p.title)},” ${it(p.container)}, ${tr ? 'sür.' : 'ver.'} ${v}, ` : `${it(p.title)}, `;
      return tr
        ? `${p.ini} ${esc(p.fam)}, ${head}${p.year}. [Çevrimiçi]. Erişim: ${esc(p.url)} (erişim tarihi: ${p.d} ${SHORT_TR[p.mi]} ${p.y}).`
        : `${p.ini} ${esc(p.fam)}, ${head}${p.year}. [Online]. Available: ${esc(p.url)} (accessed ${IEEE_EN[p.mi]} ${p.d}, ${p.y}).`;
    }
    case 'vancouver':
      return tr
        ? `${esc(p.fam)} ${p.given.charAt(0)}. ${esc(p.title)} [İnternet]. ${v ? `Sürüm ${v}. ` : ''}${esc(p.container || noScheme(c.base))}; ${p.year} [erişim ${p.y} ${VAN_TR[p.mi]} ${p.d}]. Erişim adresi: ${esc(p.url)}`
        : `${esc(p.fam)} ${p.given.charAt(0)}. ${esc(p.title)} [Internet]. ${v ? `Version ${v}. ` : ''}${esc(p.container || noScheme(c.base))}; ${p.year} [cited ${p.y} ${VAN_EN[p.mi]} ${p.d}]. Available from: ${esc(p.url)}`;
    case 'bibtex': {
      const key = `${p.fam.toLowerCase()}${p.year}${c.tool ? c.tool.file.replace(/\.php$/, '').replace(/[^a-z0-9]/g, '') : 'forestbiometry'}`;
      const tt = p.title.replace(/–/g, '--');
      const rows = [['author', `{${p.fam}, ${p.given}}`], ['title', `{{${tt}}}`], ['howpublished', `{${tr ? 'Web uygulaması' : 'Web application'}${p.container ? `, ${p.container}` : ''}}`],
        ['year', `{${p.year}}`], ...(v ? [['version', `{${v}}`]] : []), ['url', `{${p.url}}`], ['urldate', `{${c.accessed}}`],
        ['note', `{${v ? (tr ? `Sürüm ${v}. ` : `Version ${v}. `) : ''}${tr ? 'Erişim' : 'Accessed'} ${c.accessed}}`]];
      return esc(`@misc{${key},\n${rows.map(([k, x]) => `  ${k.padEnd(12)} = ${x}`).join(',\n')}\n}`);
    }
    case 'ris': {
      const L = [['TY', 'COMP'], ['AU', `${p.fam}, ${p.given}`], ['TI', p.title], ...(p.container ? [['T2', p.container]] : []), ['PY', String(p.year)],
        ...(v ? [['N1', `${tr ? 'Sürüm' : 'Version'} ${v}`]] : []), ['UR', p.url], ['Y2', c.accessed.replace(/-/g, '/')], ['PB', noScheme(c.base)], ['LA', tr ? 'tr' : 'en'], ['ER', '']];
      return esc(L.map(([k, x]) => `${k}  - ${x}`).join('\r\n'));
    }
  }
  return '';
}
