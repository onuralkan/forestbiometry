# PROJECT.md: Mimari, veri sözleşmesi, ortak kararlar

Proje: **forestbiometry.online**, bağımsız **Ormancılık Biyometrisi Araçları / Forest Biometrics Tools** platformu. Yazar ve sorumlu: Onur Alkan.
Geçmiş (9 Kasım 2026, kullanıcı kararı): araçlar onuralkan.com.tr kişisel sitesinin bir bölümüydü. Kişisel site (gazete ön sayfası, ders notları, yayınlar, yönetim paneli, 2FA, Bulmaca Köşesi) ve onuralkan.com.tr alan adı **tamamen kapatılıyor**; yalnızca araçlar bu alan adına taşınıyor. Eski sitenin son hâli git geçmişinde `8a002d2` commit'inde duruyor.
Hedef kullanıcı: araştırmacılar, öğrenciler, uygulayıcılar. Diller: Türkçe ve İngilizce.

## 1. Barındırma ve teknoloji
| Konu | Durum |
|---|---|
| Sunucu | Güzel Hosting, cPanel (`fr-collins.guzelhosting.com`, hesap `forestbi`). PHP sürümü cPanel'in "Select PHP Version" ekranından seçilir (8.3 önerildi; site 8.3 ile test edildi); SSL kurulumu hosting firmasında; kod PHP 7.4 ile uyumlu tutulur (8.x'te de çalışır) |
| HTTPS | `.htaccess` ile http → https yönlendirmesi (sertifika cPanel'de kurulu olmalı) |
| Veritabanı | **Yok.** Sunucuda kullanıcı verisi, hesap, oturum yok. Tek çerez: dil tercihi (`lang`) |
| Sayfa katmanı | Sade PHP; ortak kabuk `inc/site.php` (dil, başlık, gezinme, altbilgi, araç listesi, yazar bilgisi `SITE_AUTHOR`) |
| İstemci | Bağımlılıksız ES modülleri (`assets/lab/`); SVG grafikler elle çiziliyor |
| Yazı tipleri | Kendi sunucumuzda: Playfair Display |
| Yayına alma | `main` dalına push → GitHub Actions (`.github/workflows/deploy.yml`) sayısal testleri çalıştırır → geçerse `.github/deploy-cpanel.sh` dosyaları cPanel UAPI ile HTTPS (2083) üzerinden yükler (`Fileman::upload_files`; yeni klasörler API2 `Fileman::mkdir`). Son yüklenen commit sunucuda `deploy-commit.txt` dosyasında tutulur (`.htaccess` ile dışarıya kapalı); sonraki yüklemeler yalnızca o commit'ten beri değişen dosyaları gönderir. Yalnızca git'te izlenen dosyalar gider; `docs/`, `tests/`, `scripts/`, `legacy/`, `.github/`, `CLAUDE.md`, `README.md` gitmez; sunucuda **hiçbir şey silinmez**. **Güvenlik kontrolü:** hedef klasörde `inc/site.php` varsa ya da klasör boş bir cPanel kökü ise (yalnızca `cgi-bin`, `.well-known`, `.htaccess`, varsayılan `index.html`) yüklenir; aksi hâlde hiçbir şey gönderilmez. `.htaccess` değiştirilirken sunucudaki cPanel PHP işleyici bloğu (MultiPHP sürüm seçimi) korunur. Gizli değer `CPANEL_TOKEN` (yeni hesabın API anahtarı); sunucu `fr-collins.guzelhosting.com` (164.132.247.15; cPanel'e bu adla geçerli sertifikayla erişilir, IP ile değil), hesap `forestbi`, klasör `/home/forestbi/public_html` iş akışında yazılı; biri boşaltılırsa yükleme atlanır. Boş kök sayılan dosyalar: `cgi-bin`, `.well-known`, `.htaccess`, cPanel'in PHP ayar dosyaları `.user.ini` ve `php.ini`, `error_log`, varsayılan `index.html`. Eski sunucu (`mt-enchant.guzelhosting.com`, port 3131 SSH ve TLS'siz FTP) deneyimi: 2083 portu GitHub makinelerinden erişilebilir, SSH/FTPS değil. Yedek yol: `scripts/build-zip.sh` + cPanel Dosya Yöneticisi. |
| Kaynak kod | GitHub, depo `onuralkan/forestbiometry` (11 Kasım 2026'da `onuralkan-site`'tan yeniden adlandırıldı, kullanıcı; GitHub eski adresi yönlendirir; dal: `main`). Her modül ayrı commit |
| Lisans (10 Kasım 2026, kullanıcı kararı) | Kaynak kod Apache-2.0 (`LICENSE`), belgeler (`docs/`, `README.md`) CC BY 4.0 (`LICENSE-docs`), telif ve üçüncü taraf notları `NOTICE` (SheetJS kendi Apache-2.0 lisansıyla). Metinler resmî kaynaklardan değiştirilmeden alındı. Yeni bağımlılık eklenirse lisansı Apache-2.0 ile uyumlu olmalı ve `NOTICE`'a yazılır |

## 2. Dizin yapısı
```
index.php                    Ana sayfa = araç dizini (TR/EN, ?lang=); onaylanmış veri durumunu gösterir
hakkinda.php                 Hakkında: yazar ve sorumlu (ad, e-posta, ORCID doluysa), veri beyanı
veri-denetcisi.php           Araç 1: Ormancılık Verisi Denetçisi (ince PHP kabuğu)
ornek-alan.php               Araç 2: Örnek Alan ve Meşcere Hesaplayıcısı
model-degerlendirme.php      Araç 3: Model Başarısı Değerlendiricisi
cap-dagilimi.php             Araç 4: Çap Dağılımı Laboratuvarı (Weibull sürümü)
boy-cap.php                  Araç 5: Boy–Çap Modelleme (sabit etkili sürüm)
ornekleme.php                Araç 6: Envanter Örnekleme Planlayıcısı (basit rastgele örnekleme, ilk sürüm; tek sayfa, adım yok)
nispi-siralama.php           Araç 7: Nispi Sıralama / Relative Ranking (5 ve 6'dan önce yapıldı)
inc/site.php                 Ortak kabuk: site_top(), site_bottom(), site_tools(), SITE_AUTHOR (web erişimine kapalı)
legacy/                      Yayınlanmaz. Eski sitenin test edilmiş hesap kodu (tools.js: gamma, normal, lognormal, SB, Weibull yüzdelik) ve testi; sonraki modüllere taşınacak
docs/, tests/, scripts/      Yayınlanmaz
assets/lab/lab.css           Tezgâh düzeni stilleri, renk ve önem düzeyi paleti (açık/koyu)
assets/lab/core/num.js       Sayı okuma (ondalık ayarı), ondalık kanıtı, birim dönüştürme
assets/lab/core/table.js     CSV/TSV/yapıştırma ayrıştırıcı, ayırıcı algılama, kodlama, XLSX → ham tablo
assets/lab/core/store.js     IndexedDB anahtar–değer deposu (oturum + veri aktarımı)
assets/lab/core/export.js    CSV (`,` ve `.`, dilden bağımsız), XLSX yazma, JSON indirme, SheetJS tembel yükleme
assets/lab/core/i18n.js      Dil, tek ortak sayı biçimleyici (`fmtNum`, dilden bağımsız), HTML kaçışı
assets/lab/core/unitnav.js   Örnek alan gezgini (liste, arama, sıralama, sorunlu süzgeci, önceki/sonraki, ← →); Çap Dağılımı ve Meşcere araçlarında ortak
assets/lab/core/chart.js     SVG çubuk, saçılım, sürekli eksenli (histogram + eğri/basamak) ve radar grafikleri (kütüphanesiz), tema renkleriyle SVG indirme
assets/lab/core/importer.js  Tek tablo içe aktarma paneli (dosya/yapıştırma/ayırıcı/kodlama/sayfa/önizleme); Modül 3'ten itibaren. `rawRows` seçeneği başlık satırını aracın seçmesine bırakır (Modül 7)
assets/lab/checker/          calc.js (saf), ui.js, i18n.js, ornek/ (uydurma örnek CSV'ler)
assets/lab/stand/            calc.js (saf), ui.js, i18n.js, ornek/ornek-veri.json (scripts/make-stand-sample.mjs ile üretilir)
assets/lab/eval/             calc.js (saf), ui.js, i18n.js, ornek/ornek-tahminler.csv (uydurma)
assets/lab/rank/             calc.js (saf), ui.js, i18n.js, ornek/ornek-olcutler.xlsx (uydurma)
legacy/weibull/              Eski Çap Dağılımı 1.0.0 (Weibull): calc.js (saf; tests/weibull regresyon referansı), ui.js, i18n.js, e2e.mjs (emekli); 10 Kasım 2026 yeni motorla değiştirildi
assets/lab/core/special.js   lnGamma (tools.js'ten değişmeden taşındı)
assets/lab/core/stats.js     Düzenlenmiş eksik beta ve gamma, normal ve Student t dağılımı ve yüzdelikleri (Modül 6'da normal eklendi), tohumlu üreteç (mulberry32) ve karıştırma (Modül 5)
assets/lab/core/nls.js       Levenberg–Marquardt, küçük doğrusal cebir, σ̂²(JᵀJ)⁻¹ kovaryansı, delta yöntemi, OLS (Modül 5)
assets/lab/core/roots.js     Brent kök bulucu ve geometrik ikiye bölme, durum bildirimli (çap dağılımı revizyonu P01, P05)
assets/lab/core/quad.js      Gauss–Legendre düğümleri, standart normal altında beklenen değer (çap dağılımı revizyonu P08)
assets/lab/dist/             Yeni çap dağılımı motoru: registry.js (aile/yöntem kaydı, sonuç sözleşmesi, hatalar), families/ (weibull, normal, lognormal, gamma, beta, johnsonsb, exponential, loglogistic), fit/ (doğrudan tahmin), recover/ (moments.js: normal, lognormal, gamma; weibull.js: Poudel ve Cao M2–M5) (özetlerden geri kazanım), gof.js, data.js, ui.js, i18n.js; sayfa cap-dagilimi.php (2.0.0-beta.1; cap-dagilimi-2.php yalnızca yönlendirme); eski Weibull aracı legacy/weibull/
assets/lab/sampling/         calc.js (saf), ui.js, i18n.js, ornek/ornek-pilot.csv (tests/ref/make_sampling_reference.py ile üretilen benzetim)
assets/lab/hd/               calc.js (saf), ui.js, i18n.js, ornek/ornek-boy-cap.csv (tests/ref/make_hd_reference.py ile üretilen benzetim)
assets/vendor/sheetjs/       SheetJS CE 0.20.3 mini (Apache-2.0), README'de köken ve sağlama
```
Henüz yok (ilgili modülle gelecek): karma etkili model çekirdeği (Modül 5'in sonraki aşaması), ileri örnekleme tasarımları (tabakalı dağıtım, sistematik, kümeli; Modül 6'nın sonraki sürümleri). `plotChart` Modül 5'te isteğe bağlı nokta katmanı ve noktalı çizgi seçeneği kazandı (geriye uyumlu). Veri Denetçisi kendi içe aktarma panelini kullanır; ortak `importer.js`'e geçirilmesi, o modül yeniden açılırsa yapılır.

## 3. Veri akışı (dürüst beyan)
- **Araçlar:** Kullanıcının dosyası tarayıcıda (`File.arrayBuffer`) okunur ve **sunucuya gönderilmez**. Bütün hesaplar tarayıcıda yapılır. Sunucu yalnızca sayfayı ve JS dosyalarını verir.
  Bir araç ileride sunucu tarafı hesap gerektirirse, veri akışı o aracın sayfasında ve burada açıkça yazılır; "cihazdan çıkmaz" ifadesi kullanılmaz.
- **Sitede başka veri akışı yok:** hesap, form, dış kaynak (CDN, yazı tipi servisi, analiz kodu) yoktur. Barındırıcının olağan erişim günlükleri dışında sunucu hiçbir şey kaydetmez.
- **Tarayıcı depolaması:** Araç oturumları ve onaylanmış veri IndexedDB'de (her araçta silme düğmesi var); tema `localStorage`'da; dil bir çerezde. IndexedDB alan adına bağlıdır: eski onuralkan.com.tr oturumları yeni alan adına taşınmaz.

## 4. Veri sözleşmesi (ağaç tablosu)
Bütün araçlar içe aktarılan tabloyu, sütun eşleme ekranından sonra bu **kanonik alanlara** dönüştürür. İç birimler sabittir; dönüştürme açıkça gösterilir.

| Alan | Tür | İç birim | Not |
|---|---|---|---|
| `row` | tamsayı | – | Kaynak dosyadaki satır numarası (başlık = 1). Bütün hata ve uyarılar bu numarayla raporlanır |
| `plot_id` | metin | – | Örnek alan kimliği |
| `tree_id` | metin | – | Örnek alan içinde ağaç kimliği |
| `period` | metin/sayı | – | Ölçüm dönemi veya yılı |
| `species` | metin | – | Kullanıcının tür kodu; site kendi kod listesini **dayatmaz**, kullanıcı eşleme tablosu verebilir |
| `dbh` | sayı | cm | Göğüs çapı (1,30 m). mm/m girişleri eşleme ekranında çevrilir |
| `height` | sayı | m | Toplam boy. Ölçülmemişse `null` |
| `plot_area` | sayı | m² | Satır veya örnek alan düzeyinde; ha girilirse çevrilir |
| `status` | metin | – | Canlı, ölü, kesilmiş vb. (kullanıcı tanımlı değerler) |
| `x`, `y` | sayı | m | İsteğe bağlı koordinatlar |
| `extra.*` | – | – | Eşlenmeyen sütunlar korunur, dışa aktarmada geri yazılır |

Ek alanlar (Modül 1): `stem_id` (metin, çok gövdeli ağaçlar), `stratum` (metin, tabaka). Kimlikler (`plot_id`, `tree_id`, `stem_id`) **metin olarak** korunur: "001" ile "1" farklıdır, boşluklar kendiliğinden kırpılmaz (uyarı + öneri). XLSX'te kimlik hücrenin görünen metnidir; tarih biçimli hücreler ISO metne (YYYY-AA-GG) çevrilir.

Kurallar: Eksik değer `null`'dur, **asla 0 değildir**. Tahmin edilen değerler (örneğin boy) ölçülenlerden ayrı bir bayrakla işaretlenir. Ondalık ayırıcı virgül de nokta da olabilir; içeride sayıya çevrilir.

## 4b. Araçlar arası veri aktarımı (`forest-dataset/1`)
Veri Denetçisi'nde onaylanan veri, tarayıcının IndexedDB deposunda (`forestbiometry` / `kv`; 9 Kasım 2026'ya kadar adı `onuralkan-lab` idi) **`dataset:approved`** anahtarıyla saklanır ve JSON olarak indirilebilir. Sonraki araçlar bu nesneyi okur; sunucuya gitmez. Katmanlar ayrıdır:
- **Ham veri:** Kullanıcının dosyası; hiç değiştirilmez (oturumda `sources`).
- **Onaylanmış veri:** Düzeltmeler uygulanmış, dışlananlar çıkarılmış, iç birimlere çevrilmiş ölçümler (`plots`, `trees`).
- **Türetilen değerler:** `derived` altında, ölçülen veriden ayrı.
```
{ schema: 'forest-dataset/1', created: ISO, tool: {id, version},
  units: {dbh:'cm', height:'m', plot_area:'m2', x:'m', y:'m'},
  source: {trees:{name,kind,meta,records}, plots:{…}|null, mapping:{trees:{alan:başlık}, plots:{…}},
           settings:{decimal, units (kaynak birimleri), limits}, lang},
  plots: [{plot_id, plot_area, stratum, area_source:'plots'|'trees'|'plots+trees', n_records}],
  trees: [{row, plot_id, tree_id, stem_id, period, species, dbh, height, status, stratum, x, y, extra:{başlık:metin}}],
  derived: {note, trees:[{row, basal_area_m2}], plots:[{plot_id, expansion_factor}]},
  warnings: [{code, table, row, plot, field, accepted: gerekçe|null}],
  excluded: [kaynak satır no], changelog: [{seq, time, action, table, row, field, column, old, new, reason, issue}] }
```
Boş örnek alanlar `plots` içinde `n_records: 0` ile yer alır. İsteğe bağlı ağaç alanı `age` (yıl; Örnek Alan ve Meşcere aracının doğrudan tablo yüklemesi doldurur, Denetçi henüz eşlemiyor). İsteğe bağlı ağaç alanı `height_source: 'measured'|'estimated'` (yoksa ölçülmüş sayılır); tüketen araçlar tahmini boyları ayrı tutar. Modül 5'in ilk sürümü tahminleri yalnızca dışa aktarmada ayrı sütuna yazar; onaylanmış veri paketine yazma (yeni sürüm numarasıyla) henüz yok. Onay ancak **hata sayısı 0** iken verilir; açık uyarılar `warnings` içinde kalır. Şema değişirse sürüm numarası artar (`forest-dataset/2`) ve okuyucu araçlar eski sürümü reddeder veya çevirir.

Oturum (`session:veri-denetcisi`) aynı depoda tutulur; dil değiştirmek sayfayı yeniden yükler ve oturum geri gelir.

## 5. Ortak kurallar (her modül)
1. Bir turda yalnızca istenen modül uygulanır; tamamlanmış modüller yeniden yazılmaz.
2. Arayüz, yardım, doğrulama mesajları, grafik etiketleri ve indirilen raporlar TR/EN.
3. Hesaplama (`calc.js`) arayüzden (`ui.js`) ayrıdır. Formül, birim, varsayım ve kaynaklar METHODS.md'ye yazılır.
4. Veri, denklem, katsayı, kaynak, anlamlılık veya belirsizlik değeri **uydurulmaz**. Tür/yöre denklemlerinin katsayılarını **kullanıcı girer**; site denklem biçimini gösterir, çıktılara "kullanıcı katsayılarıyla üretildi" notu düşer.
5. Her bilimsel hesap bağımsız bir referansla (SciPy, R veya elle doğrulanabilir örnek) test edilir; test `tests/` altına kaydedilir.
6. Hesaplar tarayıcıda yapılır (bkz. §3).
7. Çalışmayan düğme, rastgele sonuç veya bitmiş gibi duran yer tutucu yoktur. Örnek veri düğmeleri, verinin örnek olduğunu açıkça söyler.
8. Mevcut içerik korunur. `main`'e push canlıya çıkıştır (sunucu bilgileri doldurulduktan sonra otomatik yükleme); push'tan önce testler çalıştırılır.
9. Rutin teknik kararlar alınır ve buraya yazılır; yalnızca işi durduran eksikler için soru sorulur.

## 6. Arayüz kuralları
- **Kabuk (9 Kasım 2026, arayüz turu):** üstte ince şerit (site adı ve işareti, Araçlar / Hakkında, tema, dil); solda **kenar çubuğu**: araçlar kategorilere göre (`site_cats()`: Veri hazırlığı; Envanter ve örnekleme; Dağılımlar; Modelleme ve değerlendirme), her araç simgesi ve kısa adıyla, geçerli araç işaretli; altta Hakkında ve veri beyanı. Masaüstünde daraltılabilir (yalnızca simgeler; tercih `localStorage` `side`), 900 px altında menü düğmesiyle açılan çekmece (Escape ve arka plan tıklamasıyla kapanır). Yeni araç = `site_tools()`'a bir satır (`cat`, `icon`, `short`); yeni kategori = `site_cats()`'a bir satır. Araç sayfalarında başlığın yanında aracın simgesi. Araç içi düzen değişmedi: araç başlığı → adımlar → sekmeli sonuçlar.
- **Ana sayfa:** solda başlık, kısa tanım, yerel işlem beyanı ve iki eylem; sağda 500 m²'lik dairesel bir örnek alanın **gövde haritası çizimi** (sabit tohumlu benzetim, METHODS §4; açıkça "çizim" diye etiketli; yüklenirken ağaçlar bir kez büyür, hareketi azalt tercihinde durağan). Altında kategorilere göre araç dizini (kategori adı ve açıklaması solda, araç kartları sağda). Araç numaraları gösterilmez (sıra bildirmiyorlar).
- **Kaynak gösterme (10 Kasım 2026):** her sayfada üst şeritte "Atıf" düğmesi bir pencere açar (`core/cite-ui.js`, metinler `core/citation.js`): araç sayfasında varsayılan o araç ve sürümü, ana sayfada platformun tamamı; atıf dili TR/EN; erişim tarihi seçilebilir; APA 7, MLA 9, Chicago (yazar-tarih), Harvard, IEEE, Vancouver, BibTeX (`@misc`, .bib iner), RIS (`TY - COMP`, .ris iner). Kopyalama italikli HTML ve düz metin yazar. Kurallı adres `SITE_BASE` = https://forestbiometry.online/, yıl `SITE_YEAR` = 2026, yazar `SITE_AUTHOR` (`inc/site.php`). Araç sürümü `site_tools()`'taki `v`, aracın `calc.js`'indeki `TOOL.version` ile aynı olmalıdır (`tests/site/test_cite.mjs` denetler): bir araç değiştiğinde ikisi birlikte artırılır. DOI yok (ekranda yazılı). Hakkında sayfasında platformun APA atfı.
- **Simgeler:** `site_icon()` içinde siteye özgü 24 × 24 çizgi simgeler (veri denetimi = pano ve onay, örnek alan = kesikli daire ve gövdeler, model başarısı = 1:1 doğrusu ve noktalar, dağılım = histogram ve eğri, boy–çap = ağaç ve ölçü çubuğu, örnekleme = ızgara ve seçili noktalar, sıralama = radar). Vurgu çizgisi kabuk kahvesi (`--bark`).
- **Renk:** `assets/lab/lab.css` değişkenleri: zemin serin liken grisi `--bg` #eef1ec (koyu #121814), kenar çubuğu `--side`, vurgu ladin yeşili `--acc` #1d5b45 (koyu temada #6cc4a1), ikinci renk kabuk kahvesi `--bark` #8a5a2b (koyu #d39a5c); önem düzeyleri Okabe–Ito paletinden türetildi (yazı kontrastı için koyulaştırıldı): hata `--err` (kırmızı-turuncu, ◆), uyarı `--warn` (koyu sarı, ▲), bilgi `--info` (mavi, ●), tamam `--ok` (mavimsi yeşil). Her düzey renkle birlikte **şekil ve sözcükle** gösterilir; yalnız renge dayanılmaz.
- **Sayı biçimi (küresel standart, 10 Kasım 2026, kullanıcı kararı):** Ekranda, kutucuklarda, tablolarda, grafiklerde ve metinlerde her iki dilde ondalık **nokta**, binlik ayırıcı yok (ör. 1234.5); dil seçimi değeri, basamak sayısını ve ayırıcıyı değiştirmez. Tek ortak biçimleyici `core/i18n.js` `fmtNum` (yuvarlama ve en çok basamak eskisiyle aynı). İçe aktarmada varsayılan ondalık nokta (`core/num.js` `defaultDecimal`); dosya açıkça virgül kullanıyorsa virgül önerilir, virgüllü okuma desteklenir. Okuma ile gösterim ayrıdır; CSV sütun ayırıcısı ile ondalık ayırıcı ayrı kavramlardır. CSV her iki dilde `,` sütun ayırıcı ve `.` ondalık (yalnızca başlıklar dile göre). XLSX hücreleri sayısal kalır.
- **Erişilebilirlik:** Klavyeyle kullanılabilir, görünür odak, hareketi azalt tercihine uyum, telefonda yatay kaydırma yok.

## 7. Ortak çekirdek (Modül 1 ile kurulacak)
1. ✔ İçe aktarma: CSV/TSV/yapıştırma kendi RFC 4180 ayrıştırıcımızla; XLSX için **SheetJS CE 0.20.3 mini** (Apache-2.0), npm `@e965/xlsx` yeniden yayımından alındı, `assets/vendor/sheetjs/` altında, yalnızca gerektiğinde yüklenir. Okuma ayarları formül, VBA ve HTML'yi kapatır; yalnızca kayıtlı hücre değerleri okunur. npm `xlsx` 0.18.5 (CVE-2023-30533, CVE-2024-22363) kullanılmadı. Risk: üçüncü taraf yeniden yayımı; sağlama toplamı README'de. Resmî SheetJS dağıtımına erişilebildiğinde aynı sürümle karşılaştırılmalı. Eski `.xls` desteklenmez.
2. ✔ Sütun eşleme ve birim dönüştürme ekranı (Veri Denetçisi içinde; öneriler yalnızca birebir başlık eşleşmesinden). Eşleme oturumla birlikte hatırlanır. Diğer araçlar onaylanmış veriyi kullanacağı için eşlemeyi tekrar istemez.
3. ✔ Dışa aktarma: CSV (iki dilde `,`/`.`), çok sayfalı XLSX raporu (araç, sürüm, tarih, dil, ayarlar özet sayfasında), JSON veri paketi. Yazdırılabilir rapor henüz yok.
4. ✔ Doğrusal olmayan en küçük kareler (Levenberg–Marquardt), standart hatalarla (`core/nls.js`, Modül 5; SciPy ile doğrulandı).
5. `legacy/tools.js` içindeki test edilmiş matematik ES modüllerine **taşınır** (yeniden yazılmaz; testleri korunur). lnGamma taşındı (`core/special.js`).

## 8. Kapatılan kişisel siteden kalanlar (9 Kasım 2026, kullanıcı kararı)
- Gazete, ders notları, yayınlar, yönetim paneli, 2FA ve Bulmaca Köşesi kapatıldı; geri gelmeyecek. Kodları `8a002d2` commit'inde.
- Eski **Meşcere Hesaplayıcı**'nın Modül 2'de karşılığı olmayan kısımları **sonraki modüllerde yeniden yazılmak üzere planda**: üst boy, Näslund boy tahmini (Modül 5 ile), kullanıcı katsayılı hacim. Eski sayfa yayından kalktı; yeniden yazım bağımsız referans testleriyle yapılır.
- Eski Çap Dağılımı ekinin gamma, normal, lognormal ve Johnson SB uydurmaları Modül 4'ün sonraki sürümlerine taşınacak; kod ve SciPy testleri `legacy/` içinde.
- Eski adreslerden (onuralkan.com.tr) yönlendirme yapılmaz. 11 Kasım 2026 (kullanıcı): eski kişisel site ayrı bir barındırmaya taşındı ve bu projeden tamamen bağımsızdır.

## 9. Uygulama planı
**Çap dağılımı aracı revizyonu (10 Kasım 2026):** sekiz dağılım ailesi, doğrudan tahmin, özetlerden geri kazanım, kesilmiş/sınıflı veri, karşılaştırma, bootstrap ve meşcere modelleri. Şartname, kararlar ve prompt sırası: `docs/DIST_SPEC.md`. Yeni motor `assets/lab/dist/`; 10 Kasım 2026'dan beri yayında (2.0.0-beta.1), eski Weibull aracı `legacy/weibull/`.

| Sıra | Modül | İçerik / bağımlılık |
|---|---|---|
| 0 | Çalışma zemini | Bu belge, METHODS.md, PROGRESS.md, `tests/`, paketleme betiği ✔ |
| 1 | Ormancılık Verisi Denetçisi / Forest Data Checker | + araçlar bölümü dizini, tezgâh düzeni, içe aktarma, sütun eşleme, dışa aktarma, renk paleti ✔ |
| 2 | Örnek Alan ve Meşcere Hesaplayıcısı / Plot & Stand Metrics | Çekirdeği kullanır ✔ |
| 3 | Model Başarısı Değerlendiricisi / Model Evaluation | Gözlenen–tahmin; kırılımlar ✔ |
| 4 | Çap Dağılımı Laboratuvarı / Diameter Distribution Lab | Weibull sürümü ✔ (ML, momentler, sabit a, sınıflar, kuyruklar, eğri gezgini); gamma, normal, lognormal, SB, kesilmiş ve gruplanmış veri sonraki turlarda |
| 5 | Boy–Çap Modelleme / Height–Diameter Modelling | Sabit etkili sürüm ✔ (altı model, LM, örnek alan bazında ÇD, eksik boy tahmini; eski Näslund tahmini bunun içinde). Karma etkili modeller (örnek alan rastgele etkisi, EBLUP kalibrasyonu) sonraki aşama |
| 6 | Envanter Örnekleme Planlayıcısı / Inventory Sampling Planner | İlk sürüm ✔: basit rastgele örneklemede ortalama için örnek alan sayısı, z yaklaşımı, isteğe bağlı sonlu çerçeve düzeltmesi. Sonraki: t ile yineleme, tabakalı (orantılı/Neyman dağıtım), sistematik ve kümeli tasarımlar, örnek alan büyüklüğü seçimi, maliyet |
| 7 | Nispi Sıralama / Relative Ranking | Başarı ölçütleri tablosundan Poudel ve Cao (2013) nispi sıraları ve radar grafiği ✔ (kullanıcının isteğiyle 5 ve 6'dan önce yapıldı) |
| plan | "R kodunu da ver" düğmesi (10 Kasım 2026, kullanıcı kararı) | Her araç, yaptığı analizin R karşılığını aynı ayarlarla (sütunlar, birimler, süzgeçler, başlangıç değerleri, katlar ve tohum, güven düzeyi) bir `.R` dosyası olarak verir; kullanıcı sonucu R'da yeniden üretebilir. Kod veriyi gömmez: kullanıcının kendi dosyasını okur (dosya adı ve okuma ayarları koda yazılır); veri tarayıcıdan çıkmaz. Kullanılan paketler ve sürümleri kodun başında yazılır; R karşılığı olmayan veya farklı tanımlı adımlar (ör. RMSE paydası, yuvarlama kuralı) kodda yorumla açıklanır. Her araç için R çıktısının araçla aynı sonucu verdiği test edilir (R ortamı gerekir; bugünkü test ortamında R yok, SciPy referansı kullanılıyor). Başlangıç: Boy–Çap Modelleme'nin karma etkili aşamasıyla birlikte (`nls`/`nlme`); sonra öteki araçlar |
| plan | Zenodo ile DOI (10 Kasım 2026, kullanıcı kararı) | GitHub deposu Zenodo'ya bağlanır; her GitHub sürümü (release) arşivlenip sürüme özgü DOI ve bütün sürümleri kapsayan bir "kavram DOI'si" alır. Depoya `CITATION.cff` ve `.zenodo.json` (yazar, ORCID, lisans, anahtar sözcükler) eklenir; lisans seçildi: Apache-2.0 + CC BY 4.0 (10 Kasım 2026). **Zamanlama (10 Kasım 2026, kullanıcı kararı): ilk DOI çap dağılımı aracının 2.0.0 sürümünde (P15).** Depo açılacaksa önce git geçmişi (kapatılan kişisel sitenin kodu dahil) sır ve kişisel veri açısından taranır. Atıf penceresi (`core/citation.js`) DOI'yi bütün biçimlere ekler; sürüm etiketleri araç sürümleriyle (`TOOL.version`) eşleştirilir. **11 Kasım 2026, kullanıcı kararı:** depo açık (public) yapılır ve Zenodo'nun GitHub bağlantısı kullanılır; P16–P17 bekletilir. Release etiketleri **takvim sürümü** (`vYYYY.MM.N`, ilki `v2026.11.0`); bir etiket platformun tamamını kapsar, release notu (`docs/releases/`) her aracın sürümünü listeler, atıfta aracın kendi sürümü kullanılır. Yazar kaydında kurum **yazılmaz** (kullanıcı kararı): ad ve ORCID. `CITATION.cff` (CFF 1.2.0 şemasıyla doğrulandı) ve `.zenodo.json` (Zenodo bunu önceler) eklendi; ikisi de sunucuya yüklenmez. Açılmadan önce git geçmişi tarandı (sır yok; ayrıntı PROGRESS.md). DOI alındıktan sonra atıf penceresine (`core/citation.js`) kavram DOI'si eklenecek |
| sonra | Üst boy (eski hesaplayıcıdan, Modül 2'ye ek), kullanıcı katsayılı hacim (eski hesaplayıcıdan), Seksiyon hacmi, Gövde profili, Biyokütle–karbon, Tekrarlı ölçüm, Meşcere yapısı, Bonitet | Katsayı gerektirenlerde kullanıcı girişi |

## 10. Bir modülün "bitti" sayılma ölçütü
- TR/EN eksiksiz; boş veri, hatalı veri ve büyük veri (≥ 10 000 satır) denendi.
- `calc.js` için `tests/` altında bağımsız referanslı test var ve geçiyor.
- METHODS.md ve PROGRESS.md güncellendi.
- Masaüstü + telefon + koyu tema ekran kontrolü yapıldı.
- Testler geçti ve `main`'e push edildi; Actions çalışmasının başarılı olduğu (ve yüklemenin gerçekten yapıldığı, atlanmadığı) kontrol edildi.
