// Citation strings (assets/lab/core/citation.js) and the tool versions shown by the site.
// Run: node tests/site/test_cite.mjs
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { cite, plain, FORMATS } from '../../assets/lab/core/citation.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const eq = (a, b, m) => ok(a === b, `${m}\n   got: ${a}\n  want: ${b}`);
const base = { author: { family: 'Alkan', given: 'Onur' }, year: 2026, base: 'https://forestbiometry.online/', site: { tr: 'Ormancılık Biyometrisi Araçları', en: 'Forest Biometrics Tools' }, accessed: '2026-11-10' };
const tool = { file: 'boy-cap.php', v: '1.0.0', tr: 'Boy–Çap Modelleme', en: 'Height–Diameter Modelling' };
const en = { ...base, lang: 'en', tool }, tr = { ...base, lang: 'tr', tool }, pl = { ...base, lang: 'en', tool: null };

// expected strings (patterns of the style guides for software / web applications)
eq(plain(cite('apa', en)), 'Alkan, O. (2026). Height–Diameter Modelling (Version 1.0.0) [Web application]. Forest Biometrics Tools. Retrieved November 10, 2026, from https://forestbiometry.online/boy-cap.php', 'APA, tool, EN');
eq(cite('apa', en).match(/<i>(.*?)<\/i>/)[1], 'Height–Diameter Modelling', 'APA: title in italics');
eq(plain(cite('apa', tr)), 'Alkan, O. (2026). Boy–Çap Modelleme (Sürüm 1.0.0) [Web uygulaması]. Ormancılık Biyometrisi Araçları. 10 Kasım 2026 tarihinde https://forestbiometry.online/boy-cap.php adresinden erişildi.', 'APA, tool, TR');
eq(plain(cite('apa', pl)), 'Alkan, O. (2026). Forest Biometrics Tools [Web application]. Retrieved November 10, 2026, from https://forestbiometry.online/', 'APA, platform: no version, no container');
eq(plain(cite('mla', en)), 'Alkan, Onur. Height–Diameter Modelling. Version 1.0.0, Forest Biometrics Tools, 2026, forestbiometry.online/boy-cap.php. Accessed 10 Nov. 2026.', 'MLA');
eq(plain(cite('chicago', en)), 'Alkan, Onur. 2026. Height–Diameter Modelling. Version 1.0.0. Forest Biometrics Tools. Accessed November 10, 2026. https://forestbiometry.online/boy-cap.php.', 'Chicago');
eq(plain(cite('harvard', en)), 'Alkan, O. (2026) Height–Diameter Modelling (version 1.0.0). Forest Biometrics Tools. Available at: https://forestbiometry.online/boy-cap.php (Accessed: 10 November 2026).', 'Harvard');
eq(plain(cite('ieee', en)), 'O. Alkan, “Height–Diameter Modelling,” Forest Biometrics Tools, ver. 1.0.0, 2026. [Online]. Available: https://forestbiometry.online/boy-cap.php (accessed Nov. 10, 2026).', 'IEEE');
eq(plain(cite('vancouver', en)), 'Alkan O. Height–Diameter Modelling [Internet]. Version 1.0.0. Forest Biometrics Tools; 2026 [cited 2026 Nov 10]. Available from: https://forestbiometry.online/boy-cap.php', 'Vancouver');
const bib = plain(cite('bibtex', en));
ok(bib.startsWith('@misc{alkan2026boycap,') && bib.includes('title        = {{Height--Diameter Modelling}}') && bib.includes('urldate      = {2026-11-10}') && bib.trim().endsWith('}'), 'BibTeX entry');
ok(plain(cite('bibtex', pl)).startsWith('@misc{alkan2026forestbiometry,') && !plain(cite('bibtex', pl)).includes('version'), 'BibTeX, platform without version');
const ris = plain(cite('ris', tr)).split('\r\n');
ok(ris[0] === 'TY  - COMP' && ris.includes('AU  - Alkan, Onur') && ris.includes('Y2  - 2026/11/10') && ris.includes('N1  - Sürüm 1.0.0') && ris.at(-1) === 'ER  - ', 'RIS record');
// months, escaping, every format non-empty in both languages
ok(plain(cite('mla', { ...en, accessed: '2026-06-03' })).endsWith('Accessed 3 June 2026.'), 'MLA keeps June unabbreviated');
ok(plain(cite('ieee', { ...en, accessed: '2026-09-21' })).endsWith('(accessed Sep. 21, 2026).'), 'IEEE month abbreviation');
ok(cite('apa', { ...en, tool: { ...tool, en: 'A <b> & C' } }).includes('A &lt;b&gt; &amp; C'), 'HTML escaped');
for (const l of [en, tr, pl]) for (const f of FORMATS) ok(plain(cite(f, l)).length > 40, `${f} ${l.lang} ${l.tool ? 'tool' : 'platform'} non-empty`);

// DOI (Zenodo concept DOI of the platform archive): last element of each style; BibTeX doi, RIS DO; absent → unchanged
const DOI = '10.5281/zenodo.24135603', dn = { ...en, doi: DOI }, dt = { ...tr, doi: DOI };
eq(plain(cite('apa', dn)), plain(cite('apa', en)) + '. https://doi.org/' + DOI, 'APA EN with DOI');
eq(plain(cite('apa', dt)), plain(cite('apa', tr)) + ' https://doi.org/' + DOI, 'APA TR with DOI');
eq(plain(cite('ieee', dn)), plain(cite('ieee', en)) + ' doi: ' + DOI + '.', 'IEEE with DOI');
eq(plain(cite('vancouver', dn)), plain(cite('vancouver', en)) + '. doi:' + DOI, 'Vancouver with DOI');
for (const f of ['mla', 'chicago', 'harvard']) eq(plain(cite(f, dn)), plain(cite(f, en)) + ' https://doi.org/' + DOI + '.', f + ' with DOI');
ok(plain(cite('bibtex', dn)).includes(`doi          = {${DOI}}`) && !plain(cite('bibtex', en)).includes('doi'), 'BibTeX doi field only with a DOI');
ok(plain(cite('ris', dt)).split('\r\n').includes('DO  - ' + DOI) && !plain(cite('ris', tr)).includes('DO  -'), 'RIS DO field only with a DOI');
{ const site = await readFile(path.join(root, 'inc/site.php'), 'utf8'), cff = await readFile(path.join(root, 'CITATION.cff'), 'utf8'), readme = await readFile(path.join(root, 'README.md'), 'utf8');
  const sd = (site.match(/const SITE_DOI = '([^']*)'/) || [])[1];
  ok(sd === DOI && cff.includes(`doi: "${DOI}"`) && readme.includes(`https://doi.org/${DOI}`), 'the same concept DOI in inc/site.php, CITATION.cff and README.md'); }

// versions shown on the site equal TOOL.version of each tool's calc.js
const php = await readFile(path.join(root, 'inc/site.php'), 'utf8');
const rows = [...php.matchAll(/'file' => '([^']+)', 'v' => '([^']+)', 'lab' => '([^']+)'/g)];
ok(rows.length === 7, '7 tools with versions in inc/site.php');
for (const [, file, v, lab] of rows) {
  const f = lab === 'dist' ? 'registry.js' : 'calc.js';     // the distribution engine keeps TOOL in its registry
  const js = await readFile(path.join(root, 'assets/lab', lab, f), 'utf8'), m = js.match(/export const TOOL = \{ id: '[^']+', version: '([^']+)' \}/);
  ok(m && m[1] === v, `${file}: site shows v${v}, ${lab}/${f} has v${m && m[1]}`);
}
console.log(`cite: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
