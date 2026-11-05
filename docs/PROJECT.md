# PROJECT.md: Mimari, veri sözleşmesi, ortak kararlar

Proje: onuralkan.com.tr kişisel akademik site + **Ormancılık Biyometrisi Araçları / Forest Biometrics Tools** bölümü.
Hedef kullanıcı: araştırmacılar, öğrenciler, uygulayıcılar. Diller: Türkçe ve İngilizce.

## 1. Barındırma ve teknoloji
| Konu | Durum |
|---|---|
| Sunucu | Güzel Hosting, cPanel, LiteSpeed, **PHP 7.4.33** (8.x'e yükseltme önerildi; kod 7.4 ile uyumlu tutulur) |
| HTTPS | Let's Encrypt (hosting kuruyor), `.htaccess` ile http → https yönlendirmesi |
| Veritabanı | **Yok.** İçerik `data/*.php` içinde JSON (ilk satırı `exit` olan koruma başlığıyla) |
| Sayfa katmanı | Sade PHP; ortak gazete başlığı `inc/paper.php`; yardımcılar `inc/common.php` |
| İstemci | Bağımlılıksız JavaScript; SVG grafikler elle çiziliyor (`assets/tools.js`) |
| Yazı tipleri | Kendi sunucumuzda: Playfair Display, Old Standard TT |
| Yayına alma | **5 Kasım 2026'dan beri otomatik (kullanıcı kararı):** `main` dalına push → GitHub Actions (`.github/workflows/deploy.yml`) sayısal testleri çalıştırır → geçerse `.github/deploy-cpanel.sh` dosyaları cPanel UAPI ile HTTPS (2083) üzerinden yükler (`Fileman::upload_files`; yeni klasörler API2 `Fileman::mkdir`). Son yüklenen commit sunucuda `deploy-commit.txt` dosyasında tutulur (`.htaccess` ile dışarıya kapalı); sonraki yüklemeler yalnızca o commit'ten beri değişen dosyaları gönderir. Yalnızca git'te izlenen dosyalar gider; `data/`, `files/`, `docs/`, `tests/`, `scripts/`, `.github/`, `CLAUDE.md` gitmez; sunucuda **hiçbir şey silinmez**. Yüklemeden önce hedefte `inc/paper.php` aranır (aynı hesaptaki diğer alan adına yüklemeyi önler). Tek gizli değer `CPANEL_TOKEN` (cPanel API anahtarı, `github_deploy`); sunucu `mt-enchant.guzelhosting.com`, hesap `zirveolu`, klasör `/home/zirveolu/public_html/onuralkan.com.tr` iş akışında yazılı. Denenip bırakılanlar: FTPS (sunucuda TLS yok), SSH (22/3131 GitHub makinelerine kapalı; 21 ve 2083 açık). Yedek yol: `scripts/build-zip.sh` + panel. |
| Kaynak kod | GitHub, özel depo: `onuralkan/onuralkan-site` (dal: `main`). Her modül ayrı commit |

## 2. Dizin yapısı
```
index.php            Gazete ön sayfası (ders notları, yayınlar, iletişim)
admin.php            Yönetim paneli (dosya yükleme, yayın içe aktarma, profil, 2FA)
mescere.php          Ek 1: Meşcere Hesaplayıcı (eski "ekler"; araçlar bölümüne taşınacak)
weibull.php          Yönlendirme (301) → araclar/cap-dagilimi.php
bulmaca.php          Ek 3: Bulmaca Köşesi (gazete bölümünde kalır)
inc/                 PHP yardımcıları (web erişimine kapalı)
assets/              CSS, JS, yazı tipleri
data/, files/        İçerik ve yüklenen dosyalar (koruma .htaccess'leri var)
docs/                PROJECT.md, METHODS.md, PROGRESS.md (yayın paketine girmez)
CLAUDE.md            Yeni oturumlar için kısa çalışma kuralları (yayın paketine girmez)
tests/               Sayısal doğrulama testleri (yayın paketine girmez)
scripts/             Paketleme betikleri (yayın paketine girmez)
```
**Araçlar bölümü (Modül 1 ile kuruldu):**
```
araclar/index.php            Araçlar bölümü dizini (TR/EN, ?lang=); onaylanmış veri durumunu gösterir
araclar/veri-denetcisi.php   Araç 1: Ormancılık Verisi Denetçisi (ince PHP kabuğu)
araclar/ornek-alan.php       Araç 2: Örnek Alan ve Meşcere Hesaplayıcısı
araclar/model-degerlendirme.php  Araç 3: Model Başarısı Değerlendiricisi
araclar/nispi-siralama.php   Araç 7: Nispi Sıralama / Relative Ranking (5 ve 6'dan önce yapıldı)
araclar/cap-dagilimi.php     Araç 4: Çap Dağılımı Laboratuvarı (Weibull sürümü); eski weibull.php buraya 301 ile yönlenir
inc/bench.php                Tezgâh düzeni: küçük gazete başlığı, araç başlığı, altbilgi; bench_tools() listesi
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
assets/vendor/sheetjs/       SheetJS CE 0.20.3 mini (Apache-2.0), README'de köken ve sağlama
```
Henüz yok (ilgili modülle gelecek): istatistik çekirdeği (t dağılımı vb.), NLS (Levenberg–Marquardt), çizgi grafikleri. Veri Denetçisi kendi içe aktarma panelini kullanır; ortak `importer.js`'e geçirilmesi, o modül yeniden açılırsa yapılır.

## 3. Veri akışı (dürüst beyan)
- **Araçlar:** Kullanıcının dosyası tarayıcıda (`File.arrayBuffer`) okunur ve **sunucuya gönderilmez**. Bütün hesaplar tarayıcıda yapılır. Sunucu yalnızca sayfayı ve JS dosyalarını verir.
  Bir araç ileride sunucu tarafı hesap gerektirirse, veri akışı o aracın sayfasında ve burada açıkça yazılır; "cihazdan çıkmaz" ifadesi kullanılmaz.
- **İstisnalar (araç dışı):** Admin panelindeki yayın içe aktarma, DOI ve ORCID numaralarını Crossref/ORCID/Unpaywall'a gönderir (tarayıcıdan veya sunucu üzerinden). Profil e-postası Unpaywall isteğine eklenir.
- **Tarayıcı depolaması:** Yalnızca kolaylık amaçlı (tema, son girilen form değerleri). Kalıcılık beklenmez.

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
Veri Denetçisi'nde onaylanan veri, tarayıcının IndexedDB deposunda (`onuralkan-lab` / `kv`) **`dataset:approved`** anahtarıyla saklanır ve JSON olarak indirilebilir. Sonraki araçlar bu nesneyi okur; sunucuya gitmez. Katmanlar ayrıdır:
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
Boş örnek alanlar `plots` içinde `n_records: 0` ile yer alır. İsteğe bağlı ağaç alanı `height_source: 'measured'|'estimated'` (yoksa ölçülmüş sayılır); boy tahmin eden araçlar (Modül 5) bunu yazar, tüketen araçlar tahmini boyları ayrı tutar. Onay ancak **hata sayısı 0** iken verilir; açık uyarılar `warnings` içinde kalır. Şema değişirse sürüm numarası artar (`forest-dataset/2`) ve okuyucu araçlar eski sürümü reddeder veya çevirir.

Oturum (`session:veri-denetcisi`) aynı depoda tutulur; dil değiştirmek sayfayı yeniden yükler ve oturum geri gelir.

## 5. Ortak kurallar (her modül)
1. Bir turda yalnızca istenen modül uygulanır; tamamlanmış modüller yeniden yazılmaz.
2. Arayüz, yardım, doğrulama mesajları, grafik etiketleri ve indirilen raporlar TR/EN.
3. Hesaplama (`calc.js`) arayüzden (`ui.js`) ayrıdır. Formül, birim, varsayım ve kaynaklar METHODS.md'ye yazılır.
4. Veri, denklem, katsayı, kaynak, anlamlılık veya belirsizlik değeri **uydurulmaz**. Tür/yöre denklemlerinin katsayılarını **kullanıcı girer**; site denklem biçimini gösterir, çıktılara "kullanıcı katsayılarıyla üretildi" notu düşer.
5. Her bilimsel hesap bağımsız bir referansla (SciPy, R veya elle doğrulanabilir örnek) test edilir; test `tests/` altına kaydedilir.
6. Hesaplar tarayıcıda yapılır (bkz. §3).
7. Çalışmayan düğme, rastgele sonuç veya bitmiş gibi duran yer tutucu yoktur. Örnek veri düğmeleri, verinin örnek olduğunu açıkça söyler.
8. Mevcut içerik korunur. `main`'e push canlıya çıkıştır (otomatik yükleme); push'tan önce testler çalıştırılır.
9. Rutin teknik kararlar alınır ve buraya yazılır; yalnızca işi durduran eksikler için soru sorulur.

## 6. Arayüz kuralları
- **İki katlı tasarım:** Gazete bölümü (ön sayfa, notlar, yayınlar, bulmaca) siyah beyaz kalır. **Araçlar bölümü** ortak bir "tezgâh" düzeni kullanır: küçük gazete başlığı → araç başlığı → adımlar (1 Veri, 2 Sütun eşleme, 3 Ayarlar, 4 Sonuçlar) → tam genişlikte, sekmeli sonuçlar.
- **Renk:** Araçlar bölümünde serbest. `assets/lab/lab.css` değişkenleri: vurgu `--acc` (koyu deniz yeşili #155e63 / koyu temada #4fb3b0); önem düzeyleri Okabe–Ito paletinden türetildi (yazı kontrastı için koyulaştırıldı): hata `--err` (kırmızı-turuncu, ◆), uyarı `--warn` (koyu sarı, ▲), bilgi `--info` (mavi, ●), tamam `--ok` (mavimsi yeşil). Her düzey renkle birlikte **şekil ve sözcükle** gösterilir; yalnız renge dayanılmaz.
- **Sayı biçimi:** Ekranda dile göre (TR: 1.234,5; EN: 1,234.5). CSV: TR'de `;` ayırıcı ve `,` ondalık, EN'de `,` ve `.`. XLSX hücreleri sayısal kalır.
- **Erişilebilirlik:** Klavyeyle kullanılabilir, görünür odak, hareketi azalt tercihine uyum, telefonda yatay kaydırma yok.

## 7. Ortak çekirdek (Modül 1 ile kurulacak)
1. ✔ İçe aktarma: CSV/TSV/yapıştırma kendi RFC 4180 ayrıştırıcımızla; XLSX için **SheetJS CE 0.20.3 mini** (Apache-2.0), npm `@e965/xlsx` yeniden yayımından alındı, `assets/vendor/sheetjs/` altında, yalnızca gerektiğinde yüklenir. Okuma ayarları formül, VBA ve HTML'yi kapatır; yalnızca kayıtlı hücre değerleri okunur. npm `xlsx` 0.18.5 (CVE-2023-30533, CVE-2024-22363) kullanılmadı. Risk: üçüncü taraf yeniden yayımı; sağlama toplamı README'de. Resmî SheetJS dağıtımına erişilebildiğinde aynı sürümle karşılaştırılmalı. Eski `.xls` desteklenmez.
2. ✔ Sütun eşleme ve birim dönüştürme ekranı (Veri Denetçisi içinde; öneriler yalnızca birebir başlık eşleşmesinden). Eşleme oturumla birlikte hatırlanır. Diğer araçlar onaylanmış veriyi kullanacağı için eşlemeyi tekrar istemez.
3. ✔ Dışa aktarma: CSV (TR `;`/`,`; EN `,`/`.`), çok sayfalı XLSX raporu (araç, sürüm, tarih, dil, ayarlar özet sayfasında), JSON veri paketi. Yazdırılabilir rapor henüz yok.
4. Doğrusal olmayan en küçük kareler (Levenberg–Marquardt), standart hatalarla. **Modül 5 ile birlikte** kurulur.
5. Mevcut `assets/tools.js` içindeki test edilmiş matematik ES modüllerine **taşınır** (yeniden yazılmaz; testleri korunur).

## 8. Eski "Ekler" ve yeni bölüm
- Meşcere Hesaplayıcı ve Çap Dağılımı Laboratuvarı, yeni bölümdeki Modül 2 ve 4'ün öncülleridir. Modül 2 (5 Kasım 2026) N, G, ortalama çaplar ve sınıflar için eski hesaplayıcının yerini aldı; ancak eski sayfadaki üst boy, Näslund boy tahmini ve kullanıcı katsayılı hacim yeni araçta yok. Bu yüzden `mescere.php` yönlendirilmedi; yönlendirme, boy (Modül 5) ve hacim taşındıktan sonra yapılacak.
- Çap Dağılımı Laboratuvarı (5 Kasım 2026, kullanıcı kararı): eski `weibull.php` yeni araca 301 ile yönlendirildi; kopya araç tutulmadı. Gamma, normal, lognormal ve Johnson SB, yeni araca taşınana kadar sitede yok. Eski hesap kodu ve testleri `assets/tools.js` / `tests/test_math.js` içinde duruyor (taşımada kullanılacak).
- Genel kural: eski ekler, karşılıkları hazır olana kadar olduğu gibi kalır; sonra eski adresler yeni araçlara yönlendirilir. Hesap kodları testleriyle birlikte taşınır.
- Bulmaca Köşesi gazete bölümünde kalır.
- ✔ Ön sayfadaki "Ekler" kutusunun ilk maddesi araçlar bölümü dizinine bağlanır (`paper_supplements()`).

## 9. Uygulama planı
| Sıra | Modül | İçerik / bağımlılık |
|---|---|---|
| 0 | Çalışma zemini | Bu belge, METHODS.md, PROGRESS.md, `tests/`, paketleme betiği ✔ |
| 1 | Ormancılık Verisi Denetçisi / Forest Data Checker | + araçlar bölümü dizini, tezgâh düzeni, içe aktarma, sütun eşleme, dışa aktarma, renk paleti ✔ |
| 2 | Örnek Alan ve Meşcere Hesaplayıcısı / Plot & Stand Metrics | Çekirdeği kullanır ✔ (eski hesaplayıcının üst boy ve hacim kısmı henüz taşınmadı) |
| 3 | Model Başarısı Değerlendiricisi / Model Evaluation | Gözlenen–tahmin; kırılımlar ✔ |
| 4 | Çap Dağılımı Laboratuvarı / Diameter Distribution Lab | Weibull sürümü ✔ (ML, momentler, sabit a, sınıflar, kuyruklar, eğri gezgini); gamma, normal, lognormal, SB, kesilmiş ve gruplanmış veri sonraki turlarda |
| 5 | Boy–Çap Modelleme / Height–Diameter Modelling | Levenberg–Marquardt çekirdeği burada kurulur |
| 6 | Envanter Örnekleme Planlayıcısı / Inventory Sampling Planner | Basit rastgele → tabakalı |
| 7 | Nispi Sıralama / Relative Ranking | Başarı ölçütleri tablosundan Poudel ve Cao (2013) nispi sıraları ve radar grafiği ✔ (kullanıcının isteğiyle 5 ve 6'dan önce yapıldı) |
| sonra | Seksiyon hacmi, Gövde profili, Biyokütle–karbon, Tekrarlı ölçüm, Meşcere yapısı, Bonitet | Katsayı gerektirenlerde kullanıcı girişi |

## 10. Bir modülün "bitti" sayılma ölçütü
- TR/EN eksiksiz; boş veri, hatalı veri ve büyük veri (≥ 10 000 satır) denendi.
- `calc.js` için `tests/` altında bağımsız referanslı test var ve geçiyor.
- METHODS.md ve PROGRESS.md güncellendi.
- Masaüstü + telefon + koyu tema ekran kontrolü yapıldı.
- Testler geçti ve `main`'e push edildi (otomatik yükleme); Actions çalışmasının başarılı olduğu kontrol edildi.
