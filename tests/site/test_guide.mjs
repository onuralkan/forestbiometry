// User guide (kilavuz.php, inc/guide/{tr,en}/<id>.php): structure and agreement with the tools.
//   node tests/site/test_guide.mjs
// One file per section and language; the sections in kilavuz.php's order (general, workflow, then site_tools()) are read
// and joined, so the checks below see the whole guide. Every tool has a section in both languages (same ids, same
// number of subsections); every section opens and closes once; interface labels the guide names (buttons, tabs,
// options) are present in the tools' own interface strings, so a renamed label breaks the test instead of leaving the
// guide wrong; the DOI is the site's; every tool is on at least one task card of the start page.
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rd = f => readFile(path.join(root, f), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };

const site = await rd('inc/site.php');
const tools = [...site.matchAll(/'file' => '([a-z-]+)\.php', 'v' =>/g)].map(m => m[1]);
ok(tools.length >= 7 && tools.length === (site.match(/'file' => '[a-z0-9-]+\.php'/g) || []).length, `tools read from site_tools(): ${tools.length}`);
const order = ['genel', 'is-akisi', 'sorun-giderme', ...tools];
const files = { tr: (await readdir(path.join(root, 'inc/guide/tr'))).sort(), en: (await readdir(path.join(root, 'inc/guide/en'))).sort() };
ok(files.tr.join() === files.en.join(), 'the same section files in both languages');
ok(order.every(id => files.tr.includes(id + '.php')) && files.tr.every(f => order.includes(f.replace(/\.php$/, ''))), 'a file for the general part, the workflow and every tool, and no other: ' + files.tr.filter(f => !order.includes(f.replace(/\.php$/, ''))));
const G = { tr: '', en: '' };
for (const l of ['tr', 'en']) for (const id of order) {
  if (!files[l].includes(id + '.php')) continue;
  const t = await rd(`inc/guide/${l}/${id}.php`);
  ok(t.startsWith('<section class="card guide-sec">\n<?= $sec(\'' + id + "'") && t.trimEnd().endsWith('</section>'), `${l}/${id}.php: one section whose heading id is the file name`);
  G[l] += t + '\n';
}
const ids = s => [...s.matchAll(/\$sec\('([a-z-]+)'/g)].map(m => m[1]);
ok(ids(G.tr).join() === ids(G.en).join() && ids(G.tr).join() === order.join(), 'same sections in the same order in both languages: ' + ids(G.tr));
const subs = s => s.split(/<section /).slice(1).map(x => (x.match(/<h3>/g) || []).length);
for (const [k, g] of Object.entries(G)) { const parts = g.split('<section ').slice(1); ok(parts.every(x => (x.match(/<\/section>/g) || []).length === 1), `${k}: every section closes before the next one opens (sections are not nested)`); }
ok(subs(G.tr).join() === subs(G.en).join(), 'same number of subsections per section: ' + subs(G.tr) + ' / ' + subs(G.en));
const doi = (site.match(/const SITE_DOI = '([^']+)'/) || [])[1];
ok(doi && G.tr.includes(doi) && G.en.includes(doi), 'the DOI in the guide is the site\'s');
ok(/href="kilavuz\.php\?k=<\?= h\(basename\(\$cur\['file'\], '\.php'\)\) \?>"/.test(site), 'every tool header links to its own guide page');
const cards = await rd('inc/guide/cards.php'), onCards = new Set([...cards.matchAll(/'ids' => \[([^\]]*)\]/g)].flatMap(m => [...m[1].matchAll(/'([a-z-]+)'/g)].map(x => x[1])));
ok(tools.every(t => onCards.has(t)), 'every tool is on at least one task card: missing ' + tools.filter(t => !onCards.has(t)));
ok([...onCards].every(id => order.includes(id)), 'task cards name only guide sections that exist');

// labels named in the guide must exist in the tool's interface strings (TR guide ↔ TR strings, EN ↔ EN)
const L = {
  'assets/lab/core/importer.js': [['İlk satır başlık', 'First row is a header'], ['Karakter kodlaması', 'Text encoding']],
  'assets/lab/checker/i18n.js': [['Veriyi onayla ve kaydet', 'Approve and save'], ['Değişiklik günlüğü', 'Change log'], ['Varsayılanlara dön', 'Restore defaults'], ['Kontrolleri çalıştır', 'Run checks'], ['Karakter kodlaması', 'Text encoding']],
  'assets/lab/stand/i18n.js': [['Bu veriyi kullan', 'Use these data'], ['Sayılacak kayıtlar', 'Records to count'], ['Ölçüldü, ağaç yok (N = 0, G = 0)', 'Measured, no trees (N = 0, G = 0)'], ['Alanlar arası özet', 'Between-plot summary'], ['Orman tahmini', 'Forest estimate'], ['Tam rapor (Excel)', 'Full report (Excel)']],
  'assets/lab/eval/i18n.js': [['Onaylanmış veriden al', 'Use approved data'], ['Hangi satırlar?', 'Which rows?'], ['Gözlenen değer sütunu', 'Observed value column']],
  'assets/lab/dist/i18n.js': [['Göğüs yüzeyi çap dağılımı (betimsel)', 'Basal area diameter distribution (descriptive)'], ['Genelleştirilmiş gamma (konumsuz)', 'Generalized gamma (no location)'], ['Gumbel (maksimum biçimi)', 'Gumbel (maximum form)'], ['Ölçülmüş çaplardan uydurma', null], ['Özetlerden geri kazanım', 'Recovery from summaries'], ['Ölçüm eşiği', 'Measurement threshold'], ['Belirsizlik', 'Uncertainty'], ['Bütün ölçütler', 'All criteria'], ['Yöntemler, birimler ve kaynaklar', 'Methods, units and sources'], ['Sınıflar', 'Classes'], ['Analiz birimi', 'Unit of analysis'], ['Sabit konum a', 'Fixed location a'], ['Meşcere modeli', 'Stand model'], ['Modeli indir (JSON)', 'Download the model (JSON)'], ['Modelle tahmin', 'Predict with a model'], ['Yaklaşım ve yanıtlar', 'Approach and responses'], ['Regresyon yöntemi', 'Regression method'], ['Sınıf genişliği (cm)', 'Class width (cm)'], ['Genel yüzdelik eşleştirme (QME)', 'General quantile matching (QME)'], ['En küçük uzaklık (MGE)', 'Minimum distance (MGE)'], ['L-momentler', 'L-moments'], ['Johnson SB (Fonseca, 4 parametre)', 'Johnson SB (Fonseca, 4 parameters)']],
  'assets/lab/hd/i18n.js': [['Göğüs yüksekliği', 'Breast height'], ['Çapraz doğrulama', 'Cross-validation'], ['Sütunlar ve birimler', 'Columns and units']],
  'assets/lab/sampling/i18n.js': [['Örnekleme çerçevesi', 'Sampling frame'], ['Mevcut örnek alanlar', 'Existing plots'], ['Varsayım özeti (TXT)', 'Assumption summary (TXT)']],
  'assets/lab/secvol/i18n.js': [['Onaylanmış veriyi bağla', 'Link the approved data'], ['Ağaç hacimleri', 'Tree volumes'], ['Ağaç ayrıntısı', 'Tree details'], ['Excel raporu', 'Excel report'], ['Kontrol eşikleri', 'Check thresholds'], ['Veri kalitesi', 'Data quality'], ['Yöntemler arası fark', 'Differences between methods']],
  'assets/lab/siteindex/i18n.js': [['Dayanak yaş', 'Base age'], ['Bonitet sınıfları', 'Site classes'], ['Verideki yaşın türü', 'Age type in the data'], ['Kendi verimden uydur', 'Fit to my own data'], ['Kaynaktan katsayı seti', 'Coefficient set from a source'], ['Belirsizlik: dizi düzeyinde bootstrap', 'Uncertainty: series-level bootstrap'], ['Excel raporu', 'Excel report']],
  'assets/lab/core/coef-ui.js': [['Katsayı setleri', 'Coefficient sets']],
  'assets/lab/core/record-ui.js': [['Girdi verisini kayda ekle', 'Include the input data in the record'], ['Çalışma kaydı (JSON)', 'Run record (JSON)']],
  'assets/lab/projects/i18n.js': [['Etkin yap', 'Make active'], ['Yedek indir (JSON)', 'Download a backup (JSON)'], ['İçe aktar (JSON)', 'Import (JSON)'], ['Veri paketi (JSON)', 'Data package (JSON)'], ['Ayrıntı', 'Details'], ['Kopyala', 'Copy'], ['Uygula', 'Apply']],
  'assets/lab/dashboard/i18n.js': [['Gösterilen paket', 'Package shown'], ['Dönem', 'Period'], ['Tabaka', 'Stratum'], ['Kaydı olmayan örnek alan × dönem', 'Plot × period without records'], ['Kayıt ekle (.json)', 'Add records (.json)'], ['Çiz', 'Draw'], ['Kaldır', 'Remove']],
  'assets/lab/volume/i18n.js': [['Aktarılan hacimleri kullan', 'Use the sent volumes'], ['Seti kaydet', 'Save the set'], ['Aktar ve Model Başarısı aracını aç', 'Send and open Model Evaluation']],
  'assets/lab/biomass/i18n.js': [['Ağaç tablosu', 'Tree table'], ['Tür → katsayı seti', 'Species → coefficient set'], ['Bu sütunu bütün türlere uygula', 'Apply this column to every species'], ['Allometrik denklemler', 'Allometric equations'], ['Hacimden dönüşüm', 'Conversion from volume']],
  'assets/lab/report/i18n.js': [['Rapor dili', 'Report language'], ['Kayıt ekle (.json)', 'Add records (.json)'], ['Panodaki kayıtları al', "Take the dashboard's records"], ['Yazdır / PDF olarak kaydet', 'Print / save as PDF'], ['HTML indir', 'Download HTML'], ['Rapor bilgileri', 'Report details']],
  'assets/lab/record/i18n.js': [['Kayıt seç (.json)', 'Choose a record (.json)'], ['Elinizdeki dosyaları denetleyin', 'Check the files you have'], ['Girdiler', 'Inputs']],
  'assets/lab/growth/i18n.js': [['Yaş (yıl)', 'Age (years)'], ['Büyüklük', 'Size'], ['Uydurulacak modeller', 'Models to fit'], ['Model karşılaştırması', 'Model comparison']],
  'assets/lab/taper/i18n.js': [['Katsayı seti gir', 'Enter a coefficient set'], ['Gövde ölçümlerinden uydur', 'Fit to stem measurements'], ['Uydurma ölçeği', 'Fitting scale'], ['Kullanılacak profil setleri', 'Profile sets to use'], ['Tek ağaç', 'One tree'], ['Ağaç tablosu', 'Tree table'], ['Kabuk', 'Bark']],
  'assets/lab/structure/i18n.js': [['Kenar etkisi', 'Edge effect'], ['Örnek alan geometrisi', 'Plot geometry'], ['Bütün sütunlar', 'All columns'], ['Ağaç tablosu', 'Tree table'], ['Tepe rekabet etkeni (CCF)', 'Crown competition factor (CCF)']],
  'assets/lab/coeflib/i18n.js': [['Yedek indir (JSON)', 'Download a backup (JSON)'], ['Yedekten geri yükle', 'Restore from a backup'], ['Geri yükleme önizlemesi', 'Restore preview'], ['Uygula', 'Apply'], ['Set düzenleyici', 'Set editor'], ['yalnızca sorunlular', 'only sets with problems'], ['Ayrıntı', 'Details'], ['Kopyala', 'Copy']],
  'assets/lab/tree/i18n.js': [['Ağaç listesi', 'Tree list'], ['Tek gövde', 'One stem'], ['Biçim üssü', 'Form exponent'], ['Gölge', 'Shadow'], ['Mesafe ölçer', 'Rangefinder'], ['Burgu örneği', 'Increment core'], ['Yaş ve artım', 'Age and increment'], ['Meşcerenin ortalama yaşı', 'Mean age of a stand'], ['İki sütun yapıştır', 'Paste two columns'], ['Kabuksuz çapı hesapla', 'Compute under-bark diameters'], ['Örnek ağaçlardan kabuk oranı', 'Bark factor from sample trees'], ['Tepe uzunluğu ve tepe oranı', 'Crown length and crown ratio'], ['Tepe yüzeyi ve hacmi', 'Crown surface and volume']],
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
