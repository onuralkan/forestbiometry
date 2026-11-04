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
| Yayına alma | `scripts/build-zip.sh` ile paket → kullanıcı cPanel'den yükler. **Geliştirme turları canlıya yayın yapmaz.** |
| Kaynak kodun kalıcılığı | ⚠ Sürüm kontrolü yok; geliştirme ortamı geçici. Bkz. PROGRESS.md "Riskler". |

## 2. Dizin yapısı
```
index.php            Gazete ön sayfası (ders notları, yayınlar, iletişim)
admin.php            Yönetim paneli (dosya yükleme, yayın içe aktarma, profil, 2FA)
mescere.php          Ek 1: Meşcere Hesaplayıcı (eski "ekler"; araçlar bölümüne taşınacak)
weibull.php          Ek 2: Çap Dağılımı Laboratuvarı (eski "ekler"; taşınacak)
bulmaca.php          Ek 3: Bulmaca Köşesi (gazete bölümünde kalır)
inc/                 PHP yardımcıları (web erişimine kapalı)
assets/              CSS, JS, yazı tipleri
data/, files/        İçerik ve yüklenen dosyalar (koruma .htaccess'leri var)
docs/                PROJECT.md, METHODS.md, PROGRESS.md (yayın paketine girmez)
tests/               Sayısal doğrulama testleri (yayın paketine girmez)
scripts/             Paketleme betikleri (yayın paketine girmez)
```
**Planlanan (Modül 1 ile kurulacak):**
```
araclar/index.php            Araçlar bölümü dizini (TR/EN, ?lang=)
araclar/<arac>.php           Her araç için ince PHP kabuğu (başlık, dil, tezgâh düzeni)
inc/bench.php                Tezgâh düzeni (adımlar, sekmeli sonuçlar) + ortak <head>
assets/lab/core/*.js         Ortak çekirdek (ES modülleri): içe aktarma, sütun eşleme, birimler,
                             istatistik, NLS (Levenberg–Marquardt), grafik, dışa aktarma, i18n
assets/lab/<arac>/calc.js    Saf hesaplama (DOM yok; Node'da test edilebilir)
assets/lab/<arac>/ui.js      Arayüz
assets/lab/<arac>/i18n.js    TR/EN metinler
assets/vendor/               Dışarıdan alınan kütüphaneler (sürüm ve lisans dosya başında)
```

## 3. Veri akışı (dürüst beyan)
- **Araçlar:** Kullanıcının dosyası tarayıcıda `FileReader` ile okunur ve **sunucuya gönderilmez**. Bütün hesaplar tarayıcıda yapılır. Sunucu yalnızca sayfayı ve JS dosyalarını verir.
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

Kurallar: Eksik değer `null`'dur, **asla 0 değildir**. Tahmin edilen değerler (örneğin boy) ölçülenlerden ayrı bir bayrakla işaretlenir. Ondalık ayırıcı virgül de nokta da olabilir; içeride sayıya çevrilir.

## 5. Ortak kurallar (her modül)
1. Bir turda yalnızca istenen modül uygulanır; tamamlanmış modüller yeniden yazılmaz.
2. Arayüz, yardım, doğrulama mesajları, grafik etiketleri ve indirilen raporlar TR/EN.
3. Hesaplama (`calc.js`) arayüzden (`ui.js`) ayrıdır. Formül, birim, varsayım ve kaynaklar METHODS.md'ye yazılır.
4. Veri, denklem, katsayı, kaynak, anlamlılık veya belirsizlik değeri **uydurulmaz**. Tür/yöre denklemlerinin katsayılarını **kullanıcı girer**; site denklem biçimini gösterir, çıktılara "kullanıcı katsayılarıyla üretildi" notu düşer.
5. Her bilimsel hesap bağımsız bir referansla (SciPy, R veya elle doğrulanabilir örnek) test edilir; test `tests/` altına kaydedilir.
6. Hesaplar tarayıcıda yapılır (bkz. §3).
7. Çalışmayan düğme, rastgele sonuç veya bitmiş gibi duran yer tutucu yoktur. Örnek veri düğmeleri, verinin örnek olduğunu açıkça söyler.
8. Mevcut içerik korunur; geliştirme turu canlıya yayın değildir.
9. Rutin teknik kararlar alınır ve buraya yazılır; yalnızca işi durduran eksikler için soru sorulur.

## 6. Arayüz kuralları
- **İki katlı tasarım:** Gazete bölümü (ön sayfa, notlar, yayınlar, bulmaca) siyah beyaz kalır. **Araçlar bölümü** ortak bir "tezgâh" düzeni kullanır: küçük gazete başlığı → araç başlığı → adımlar (1 Veri, 2 Sütun eşleme, 3 Ayarlar, 4 Sonuçlar) → tam genişlikte, sekmeli sonuçlar.
- **Renk:** Araçlar bölümünde serbest; veri görselleştirme ve hata/uyarı/bilgi düzeyleri için renk körlüğüne dayanıklı tek bir palet (Modül 1'de tanımlanır).
- **Sayı biçimi:** Ekranda dile göre (TR: 1.234,5; EN: 1,234.5). CSV: TR'de `;` ayırıcı ve `,` ondalık, EN'de `,` ve `.`. XLSX hücreleri sayısal kalır.
- **Erişilebilirlik:** Klavyeyle kullanılabilir, görünür odak, hareketi azalt tercihine uyum, telefonda yatay kaydırma yok.

## 7. Ortak çekirdek (Modül 1 ile kurulacak)
1. İçe aktarma: CSV (papaparse veya kendi ayrıştırıcımız) ve XLSX. **Kütüphane kararı Modül 1'de:** npm'deki `xlsx` 0.18.5 bilinen açıklar içeriyor, kullanılmayacak; adaylar `@e965/xlsx` 0.20.3 (SheetJS CE yeniden yayımı, Apache-2.0) veya `exceljs` 4.4.0 (MIT).
2. Sütun eşleme ve birim dönüştürme ekranı (veri sözleşmesine göre), eşlemenin hatırlanması.
3. Dışa aktarma: CSV, XLSX, yazdırılabilir rapor (yöntem, sürüm, tarih, kullanılan ayarlar raporda yer alır).
4. Doğrusal olmayan en küçük kareler (Levenberg–Marquardt), standart hatalarla. **Modül 5 ile birlikte** kurulur.
5. Mevcut `assets/tools.js` içindeki test edilmiş matematik ES modüllerine **taşınır** (yeniden yazılmaz; testleri korunur).

## 8. Eski "Ekler" ve yeni bölüm
- Meşcere Hesaplayıcı ve Çap Dağılımı Laboratuvarı, yeni bölümdeki Modül 2 ve 4'ün öncülleridir. Bu modüller tamamlanana kadar olduğu gibi kalırlar; sonra eski adresler yeni araçlara yönlendirilir. Hesap kodları testleriyle birlikte taşınır.
- Bulmaca Köşesi gazete bölümünde kalır.
- Ön sayfadaki "Ekler" kutusu, araçlar bölümü açıldığında o bölümün dizinine bağlanır.

## 9. Uygulama planı
| Sıra | Modül | İçerik / bağımlılık |
|---|---|---|
| 0 | Çalışma zemini | Bu belge, METHODS.md, PROGRESS.md, `tests/`, paketleme betiği ✔ |
| 1 | Ormancılık Verisi Denetçisi / Forest Data Checker | + araçlar bölümü dizini, tezgâh düzeni, içe aktarma, sütun eşleme, dışa aktarma, renk paleti |
| 2 | Örnek Alan ve Meşcere Hesaplayıcısı / Plot & Stand Metrics | Çekirdeği kullanır; eski Meşcere Hesaplayıcı'nın yerini alır |
| 3 | Model Başarısı Değerlendiricisi / Model Evaluation | Gözlenen–tahmin; kırılımlar |
| 4 | Çap Dağılımı Laboratuvarı / Diameter Distribution Lab | Mevcut 5 dağılımlı kod taşınır; birikimli dağılım, beklenen ağaç sayısı tablosu |
| 5 | Boy–Çap Modelleme / Height–Diameter Modelling | Levenberg–Marquardt çekirdeği burada kurulur |
| 6 | Envanter Örnekleme Planlayıcısı / Inventory Sampling Planner | Basit rastgele → tabakalı |
| sonra | Seksiyon hacmi, Gövde profili, Biyokütle–karbon, Tekrarlı ölçüm, Meşcere yapısı, Bonitet | Katsayı gerektirenlerde kullanıcı girişi |

## 10. Bir modülün "bitti" sayılma ölçütü
- TR/EN eksiksiz; boş veri, hatalı veri ve büyük veri (≥ 10 000 satır) denendi.
- `calc.js` için `tests/` altında bağımsız referanslı test var ve geçiyor.
- METHODS.md ve PROGRESS.md güncellendi.
- Masaüstü + telefon + koyu tema ekran kontrolü yapıldı.
- Paket üretildi; canlıya yükleme kullanıcı tarafından yapılır.
