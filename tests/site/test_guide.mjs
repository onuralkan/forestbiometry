// User guide (kilavuz.php, inc/guide/{tr,en}.php): structure and agreement with the tools.
//   node tests/site/test_guide.mjs
// Every tool has a section in both languages (same ids, same order, same number of subsections); interface labels the
// guide names (buttons, tabs, options) are present in the tools' own interface strings, so a renamed label breaks the
// test instead of leaving the guide wrong; the DOI is the site's.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rd = f => readFile(path.join(root, f), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

const G = { tr: await rd('inc/guide/tr.php'), en: await rd('inc/guide/en.php') }, site = await rd('inc/site.php');
const ids = s => [...s.matchAll(/\$sec\('([a-z-]+)'/g)].map(m => m[1]);
const tools = [...site.matchAll(/'file' => '([a-z-]+)\.php', 'v' =>/g)].map(m => m[1]);
ok(tools.length >= 7 && tools.length === (site.match(/'file' => '[a-z0-9-]+\.php'/g) || []).length, `tools read from site_tools(): ${tools.length}`);
ok(ids(G.tr).join() === ids(G.en).join(), 'same sections in the same order in both languages: ' + ids(G.tr));
ok(['genel', 'is-akisi', ...tools].every(id => ids(G.tr).includes(id)), 'a section for the general part, the workflow and every tool');
const subs = s => s.split(/<section /).slice(1).map(x => (x.match(/<h3>/g) || []).length);
ok(subs(G.tr).join() === subs(G.en).join(), 'same number of subsections per section: ' + subs(G.tr) + ' / ' + subs(G.en));
const doi = (site.match(/const SITE_DOI = '([^']+)'/) || [])[1];
ok(doi && G.tr.includes(doi) && G.en.includes(doi), 'the DOI in the guide is the site\'s');
ok(/href="kilavuz\.php#<\?= h\(basename\(\$cur\['file'\], '\.php'\)\) \?>"/.test(site), 'every tool header links to its own section');

// labels named in the guide must exist in the tool's interface strings (TR guide ↔ TR strings, EN ↔ EN)
const L = {
  'assets/lab/core/importer.js': [['İlk satır başlık', 'First row is a header'], ['Karakter kodlaması', 'Text encoding']],
  'assets/lab/checker/i18n.js': [['Veriyi onayla ve kaydet', 'Approve and save'], ['Değişiklik günlüğü', 'Change log'], ['Varsayılanlara dön', 'Restore defaults'], ['Kontrolleri çalıştır', 'Run checks'], ['Karakter kodlaması', 'Text encoding']],
  'assets/lab/stand/i18n.js': [['Bu veriyi kullan', 'Use these data'], ['Sayılacak kayıtlar', 'Records to count'], ['Ölçüldü, ağaç yok (N = 0, G = 0)', 'Measured, no trees (N = 0, G = 0)'], ['Alanlar arası özet', 'Between-plot summary'], ['Orman tahmini', 'Forest estimate'], ['Tam rapor (Excel)', 'Full report (Excel)']],
  'assets/lab/eval/i18n.js': [['Onaylanmış veriden al', 'Use approved data'], ['Hangi satırlar?', 'Which rows?'], ['Gözlenen değer sütunu', 'Observed value column']],
  'assets/lab/dist/i18n.js': [['Ölçülmüş çaplardan uydurma', null], ['Özetlerden geri kazanım', 'Recovery from summaries'], ['Ölçüm eşiği', 'Measurement threshold'], ['Belirsizlik', 'Uncertainty'], ['Bütün ölçütler', 'All criteria'], ['Yöntemler, birimler ve kaynaklar', 'Methods, units and sources'], ['Sınıflar', 'Classes'], ['Analiz birimi', 'Unit of analysis'], ['Sabit konum a', 'Fixed location a'], ['Meşcere modeli', 'Stand model'], ['Modeli indir (JSON)', 'Download the model (JSON)'], ['Modelle tahmin', 'Predict with a model'], ['Yaklaşım ve yanıtlar', 'Approach and responses'], ['Regresyon yöntemi', 'Regression method'], ['Sınıf genişliği (cm)', 'Class width (cm)']],
  'assets/lab/hd/i18n.js': [['Göğüs yüksekliği', 'Breast height'], ['Çapraz doğrulama', 'Cross-validation'], ['Sütunlar ve birimler', 'Columns and units']],
  'assets/lab/sampling/i18n.js': [['Örnekleme çerçevesi', 'Sampling frame'], ['Mevcut örnek alanlar', 'Existing plots'], ['Varsayım özeti (TXT)', 'Assumption summary (TXT)']],
  'assets/lab/secvol/i18n.js': [['Onaylanmış veriyi bağla', 'Link the approved data'], ['Ağaç hacimleri', 'Tree volumes'], ['Ağaç ayrıntısı', 'Tree details'], ['Excel raporu', 'Excel report'], ['Kontrol eşikleri', 'Check thresholds']],
  'assets/lab/rank/i18n.js': [['Radar grafiği', 'Radar chart'], ['Sıralamaya kat', 'Use in ranking'], ['İyi olan', 'Better is']],
};
for (const [file, pairs] of Object.entries(L)) {
  const src = await rd(file);
  for (const [tr, en] of pairs) {
    ok(src.includes(tr) && G.tr.includes(tr), `"${tr}": in ${file} and in the Turkish guide`);
    if (en) ok(src.includes(en) && G.en.includes(en), `"${en}": in ${file} and in the English guide`);
  }
}
// numbers the guide states, against the code
const chk = await rd('assets/lab/checker/calc.js'), hd = await rd('assets/lab/hd/ui.js'), smp = await rd('assets/lab/sampling/ui.js');
ok(/dbhMin: 1, dbhMax: 200, hMin: 2, hMax: 60, slMin: 15, slMax: 200/.test(chk) && G.tr.includes('1–200 cm') && G.en.includes('1–200 cm'), 'checker default diameter limits 1–200 cm');
ok(/bh:\s*'1\.3'|bh: 1\.3|'1\.3'/.test(hd) && G.tr.includes('1.3 m') && G.en.includes('1.3 m'), 'breast height default 1.3 m');
ok(/eText:\s*'10'/.test(smp) && /level(Text)?:\s*'95'/.test(smp), 'sampling defaults E = 10 %, 95 %');
console.log(`guide: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
