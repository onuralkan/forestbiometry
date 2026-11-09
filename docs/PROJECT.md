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
| Kaynak kod | GitHub, özel depo: `onuralkan/onuralkan-site` (dal: `main`; yeni adı önerildi: `forestbiometry`, adı kullanıcı değiştirir). Her modül ayrı commit |

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
assets/lab/core/export.js    CSV (dile göre ayırıcı), XLSX yazma, JSON indirme, SheetJS tembel yükleme
assets/lab/core/i18n.js      Dil, sayı biçimi, HTML kaçışı
assets/lab/core/chart.js     SVG çubuk, saçılım, sürekli eksenli (histogram + eğri/basamak) ve radar grafikleri (kütüphanesiz), tema renkleriyle SVG indirme
assets/lab/core/importer.js  Tek tablo içe aktarma paneli (dosya/yapıştırma/ayırıcı/kodlama/sayfa/önizleme); Modül 3'ten itibaren. `rawRows` seçeneği başlık satırını aracın seçmesine bırakır (Modül 7)
assets/lab/checker/          calc.js (saf), ui.js, i18n.js, ornek/ (uydurma örnek CSV'ler)
assets/lab/stand/            calc.js (saf), ui.js, i18n.js, ornek/ornek-veri.json (scripts/make-stand-sample.mjs ile üretilir)
assets/lab/eval/             calc.js (saf), ui.js, i18n.js, ornek/ornek-tahminler.csv (uydurma)
assets/lab/rank/             calc.js (saf), ui.js, i18n.js, ornek/ornek-olcutler.xlsx (uydurma)
assets/lab/weibull/          calc.js (saf), ui.js, i18n.js, ornek/ornek-caplar.csv (sabit tohumlu benzetim)
assets/lab/core/special.js   lnGamma (tools.js'ten değişmeden taşındı)
assets/lab/core/stats.js     Düzenlenmiş eksik beta ve gamma, normal ve Student t dağılımı ve yüzdelikleri (Modül 6'da normal eklendi), tohumlu üreteç (mulberry32) ve karıştırma (Modül 5)
assets/lab/core/nls.js       Levenberg–Marquardt, küçük doğrusal cebir, σ̂²(JᵀJ)⁻¹ kovaryansı, delta yöntemi, OLS (Modül 5)
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
Boş örnek alanlar `plots` içinde `n_records: 0` ile yer alır. İsteğe bağlı ağaç alanı `height_source: 'measured'|'estimated'` (yoksa ölçülmüş sayılır); tüketen araçlar tahmini boyları ayrı tutar. Modül 5'in ilk sürümü tahminleri yalnızca dışa aktarmada ayrı sütuna yazar; onaylanmış veri paketine yazma (yeni sürüm numarasıyla) henüz yok. Onay ancak **hata sayısı 0** iken verilir; açık uyarılar `warnings` içinde kalır. Şema değişirse sürüm numarası artar (`forest-dataset/2`) ve okuyucu araçlar eski sürümü reddeder veya çevirir.

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
- **Tezgâh düzeni (bütün site):** ince üst şerit (site adı, Araçlar / Hakkında, tema, dil) → araç başlığı → adımlar (1 Veri, 2 Sütun eşleme, 3 Ayarlar, 4 Sonuçlar) → tam genişlikte, sekmeli sonuçlar.
- **Renk:** serbest. `assets/lab/lab.css` değişkenleri: vurgu `--acc` (koyu deniz yeşili #155e63 / koyu temada #4fb3b0); önem düzeyleri Okabe–Ito paletinden türetildi (yazı kontrastı için koyulaştırıldı): hata `--err` (kırmızı-turuncu, ◆), uyarı `--warn` (koyu sarı, ▲), bilgi `--info` (mavi, ●), tamam `--ok` (mavimsi yeşil). Her düzey renkle birlikte **şekil ve sözcükle** gösterilir; yalnız renge dayanılmaz.
- **Sayı biçimi:** Ekranda dile göre (TR: 1.234,5; EN: 1,234.5). CSV: TR'de `;` ayırıcı ve `,` ondalık, EN'de `,` ve `.`. XLSX hücreleri sayısal kalır.
- **Erişilebilirlik:** Klavyeyle kullanılabilir, görünür odak, hareketi azalt tercihine uyum, telefonda yatay kaydırma yok.

## 7. Ortak çekirdek (Modül 1 ile kurulacak)
1. ✔ İçe aktarma: CSV/TSV/yapıştırma kendi RFC 4180 ayrıştırıcımızla; XLSX için **SheetJS CE 0.20.3 mini** (Apache-2.0), npm `@e965/xlsx` yeniden yayımından alındı, `assets/vendor/sheetjs/` altında, yalnızca gerektiğinde yüklenir. Okuma ayarları formül, VBA ve HTML'yi kapatır; yalnızca kayıtlı hücre değerleri okunur. npm `xlsx` 0.18.5 (CVE-2023-30533, CVE-2024-22363) kullanılmadı. Risk: üçüncü taraf yeniden yayımı; sağlama toplamı README'de. Resmî SheetJS dağıtımına erişilebildiğinde aynı sürümle karşılaştırılmalı. Eski `.xls` desteklenmez.
2. ✔ Sütun eşleme ve birim dönüştürme ekranı (Veri Denetçisi içinde; öneriler yalnızca birebir başlık eşleşmesinden). Eşleme oturumla birlikte hatırlanır. Diğer araçlar onaylanmış veriyi kullanacağı için eşlemeyi tekrar istemez.
3. ✔ Dışa aktarma: CSV (TR `;`/`,`; EN `,`/`.`), çok sayfalı XLSX raporu (araç, sürüm, tarih, dil, ayarlar özet sayfasında), JSON veri paketi. Yazdırılabilir rapor henüz yok.
4. ✔ Doğrusal olmayan en küçük kareler (Levenberg–Marquardt), standart hatalarla (`core/nls.js`, Modül 5; SciPy ile doğrulandı).
5. `legacy/tools.js` içindeki test edilmiş matematik ES modüllerine **taşınır** (yeniden yazılmaz; testleri korunur). lnGamma taşındı (`core/special.js`).

## 8. Kapatılan kişisel siteden kalanlar (9 Kasım 2026, kullanıcı kararı)
- Gazete, ders notları, yayınlar, yönetim paneli, 2FA ve Bulmaca Köşesi kapatıldı; geri gelmeyecek. Kodları `8a002d2` commit'inde.
- Eski **Meşcere Hesaplayıcı**'nın Modül 2'de karşılığı olmayan kısımları **sonraki modüllerde yeniden yazılmak üzere planda**: üst boy, Näslund boy tahmini (Modül 5 ile), kullanıcı katsayılı hacim. Eski sayfa yayından kalktı; yeniden yazım bağımsız referans testleriyle yapılır.
- Eski Çap Dağılımı ekinin gamma, normal, lognormal ve Johnson SB uydurmaları Modül 4'ün sonraki sürümlerine taşınacak; kod ve SciPy testleri `legacy/` içinde.
- Eski adreslerden (onuralkan.com.tr) yönlendirme yapılmaz; alan adı kapatılıyor.

## 9. Uygulama planı
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
| sonra | Üst boy (eski hesaplayıcıdan, Modül 2'ye ek), kullanıcı katsayılı hacim (eski hesaplayıcıdan), Seksiyon hacmi, Gövde profili, Biyokütle–karbon, Tekrarlı ölçüm, Meşcere yapısı, Bonitet | Katsayı gerektirenlerde kullanıcı girişi |

## 10. Bir modülün "bitti" sayılma ölçütü
- TR/EN eksiksiz; boş veri, hatalı veri ve büyük veri (≥ 10 000 satır) denendi.
- `calc.js` için `tests/` altında bağımsız referanslı test var ve geçiyor.
- METHODS.md ve PROGRESS.md güncellendi.
- Masaüstü + telefon + koyu tema ekran kontrolü yapıldı.
- Testler geçti ve `main`'e push edildi; Actions çalışmasının başarılı olduğu (ve yüklemenin gerçekten yapıldığı, atlanmadığı) kontrol edildi.
