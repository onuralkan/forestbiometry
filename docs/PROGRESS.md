# PROGRESS.md: Durum, kontroller, eksikler, sıradaki adım

Son güncelleme: 5 Kasım 2026, Modül 3 (Model Başarısı Değerlendiricisi)

## Tamamlananlar
| Bölüm | Durum | Kontroller |
|---|---|---|
| Gazete sitesi (ön sayfa, ders notları, yayınlar, iletişim, TR/EN, koyu tema) | Canlıda | Masaüstü/telefon/koyu tema ekran kontrolü |
| Admin paneli: dosya yükleme, yayın ekleme/düzenleme, DOI/ORCID/JSON içe aktarma | Canlıda | Uçtan uca tarayıcı testleri; içe aktarmada mükerrer kontrolü |
| Güvenlik: CSRF, giriş kilidi, yükleme filtresi, HTTPS + yönlendirme, TOTP 2FA + kurtarma kodları | Canlıda (2FA paketi kullanıcıya teslim edildi) | RFC 6238 test vektörleri; 12 adımlı 2FA akış testi |
| Ek 1 Meşcere Hesaplayıcı | Teslim edildi | numpy ile bağımsız hesap karşılaştırması |
| Ek 2 Çap Dağılımı Laboratuvarı (5 dağılım, 8 tahmin, KS/EI/AIC) | Teslim edildi | `tests/test_math.js`: 53/53 (SciPy referansı) |
| Ek 3 Bulmaca Köşesi | Teslim edildi | 10 bulmacada ızgara tutarlılığı; klavyeyle çözüm testi |
| Modül 3: Model Başarısı Değerlendiricisi (`araclar/model-degerlendirme.php`), saçılım grafiği, ortak içe aktarma paneli (`assets/lab/core/importer.js`) | Tamam, canlıya yüklenmedi | `tests/eval/test_eval.mjs` 178/178 (kabul örneği, mükemmel tahmin, sabit gözlenen, negatif R², bağıl ölçüt paydaları, eksik/okunamayan çiftler, iki modelde ortak/kendi satırlar, gruplar; scikit-learn referansı `tests/ref/eval.json`); `tests/eval/e2e.mjs` 22/22 (Chromium: TR/EN değerler ve CSV başlıkları, grafikler ve SVG, gruplar, örneklem farkı uyarısı, Excel, telefon + koyu tema) |
| Modül 2: Örnek Alan ve Meşcere Hesaplayıcısı (`araclar/ornek-alan.php`), SVG grafik çekirdeği (`assets/lab/core/chart.js`) | Tamam, canlıya yüklenmedi | `tests/stand/test_stand.mjs` 414/414 (kabul örneği + numpy referansı `tests/ref/stand.json`: birim ölçüleri, sınıflar, tür payları, boylar, alanlar arası özet, basit rastgele ve tabakalı tahmin); `tests/stand/e2e.mjs` 23/23 (Chromium: kabul örneği TR/EN ve CSV, örnek paket, karar bekleyen birleşimler, çakışan sınıf reddi, grafikler, Excel, tabakalı tahmin, telefon + koyu tema); 20 000 kayıt / 600 birim ≈ 45 ms |
| Modül 1: Ormancılık Verisi Denetçisi + araçlar bölümü (`araclar/`), tezgâh düzeni, ortak çekirdek (`assets/lab/core/`), SheetJS | Tamam, canlıya yüklenmedi | `tests/checker/test_checker.mjs` 87/87 (kabul örnekleri, XLSX, kodlama, dil bağımsızlığı); `tests/checker/e2e.mjs` 33/33 (Chromium: örnek veri → düzeltme → onay → dışa aktarma, dil değişimi, belirsiz ondalık, XLSX yükleme, 10 000 satır, telefon + koyu tema) |
| Modül 0: çalışma zemini | Tamam | `docs/` kayıtları, `tests/` (53/53 geçiyor), `scripts/build-zip.sh`, GitHub deposu, `CLAUDE.md` |

## Bilinen eksikler ve çelişkiler (karar bekleyenler ⚑)
1. ✔ Giderildi (5 Kasım 2026): `mescere.php` içindeki kaynaksız örnek hacim katsayıları ve f = 0,50 varsayılanı kaldırıldı. Hacim yalnızca kullanıcının girdiği değerlerle hesaplanıyor; dayanağı özet tablosunda yazıyor. Eski tarayıcı kayıtlarındaki örnek değerler geri yüklenmiyor (`localStorage` anahtarı v2). Test: katsayısız → hacim yok; f = 0,5 ve b₀ = 0,0001, b₁ = 2, b₂ = 0,8 → numpy ile aynı (146,4 ve 201,8 m³/ha).
2. (1. maddeyle birlikte giderildi.)
3. Laboratuvarda yüzdelik çifti notu "Dubey (1967)'nin önerdiği klasik seçim" diyor. Doğru ama eksik: çift, **ölçek + şekil birlikte** tahmini için en verimli olanı (METHODS.md §2). Modül 4'te metin düzeltilecek.
4. Laboratuvarda konum (γ = dmin/2) ve SB sınırı (±1 cm) varsayılanları literatür önerisi değil; ekranda "varsayılan" olarak yazıyor, METHODS.md'de belirtildi.
5. KS sınırı 1,36/√n, tahmin edilmiş parametrelerle yaklaşık. Ekranda ve METHODS.md'de belirtildi.
6. METHODS.md'de **[D]** ile işaretli künyeler doğrulanmadı.
7. Tarayıcı testleri: Modül 1'den itibaren betik olarak kayıtlı (`tests/checker/e2e.mjs`). Eski ekler (Meşcere, Laboratuvar, Bulmaca) için kayıtlı betik yok; taşındıklarında eklenecek.
8. ✔ Karar verildi (Modül 1): SheetJS CE 0.20.3 mini, npm `@e965/xlsx` yeniden yayımından (PROJECT.md §7). ⚑ Resmî SheetJS dağıtımıyla karşılaştırma yapılamadı (derleme ortamından cdn.sheetjs.com'a erişilemedi).
9. Veri Denetçisi eksikleri: (a) Yazdırılabilir rapor yok (Excel raporu var). (b) Düzeltmeyi geri almak için ayrı "geri al" yok; aynı alan yeniden düzeltilerek veya dışlama geri alınarak düzeltilir, hepsi günlüğe yazılır. (c) Tür kodu eşleme tablosu (kullanıcı kodu → tam ad) yok. (d) Koordinat ve durum alanları okunuyor ama denetlenmiyor (yalnızca biçim). (e) Kaynak dosya yeniden yüklenirse önceki düzeltmeler bırakılır. (f) CSV'de "001" gibi kimlikleri Excel açarken bozabilir; ekranda uyarılıyor, Excel raporu güvenli. (g) Ölçüm tarihi metin olarak karşılaştırılır; "2024" ile "2024-07-01" farklı dönemdir.
10. Eşik varsayılanları (çap 1–200 cm, boy 2–60 m, incelik 15–200) literatür değeri değil, ayarlanabilir tarama eşikleri; ekranda ve METHODS.md §5'te böyle yazıyor.
11. Örnek Alan ve Meşcere Hesaplayıcısı eksikleri: (a) Güven aralığı yok (yalnız SH; t dağılımı Modül 6). (b) Üst boy, Lorey boyu, hacim ve boy tahmini yok; eski `mescere.php` bu yüzden yönlendirilmedi. (c) İç içe alan / açı sayımı desteklenmiyor; yalnızca kullanıcı onayıyla sabit alan varsayılıyor. (d) Dönemler arası değişim (büyüme, ölüm, giriş) hesaplanmıyor ("Tekrarlı ölçüm" modülü). (e) Varsayılan çap sınıfı başlangıcı veriden önerilir (4 cm genişlik); literatür değeri değil, ekranda öneri olarak yazıyor. (f) Sistematik örnekleme SH'si basit rastgele formülüyle yaklaşık; ekranda ve METHODS.md §6'da yazıyor. (g) Cochran (1977) künyesi [D].
12. Model Başarısı Değerlendiricisi eksikleri: (a) Güven aralığı, eşdeğerlik testi veya bootstrap yok. (b) Ağırlıklı ölçütler (ör. örnekleme ağırlıklı RMSE) yok. (c) Grafiklerde grup renklendirmesi yok; gruplar tabloda. (d) Satır bazında artık tablosu ekranda yok, Excel/CSV'de var. (e) Kaynak beyanı (eğitim/test/çapraz doğrulama) hesapları değiştirmez; kullanıcının beyanıdır, doğrulanmaz.

## Riskler
- ✔ Giderildi (5 Kasım 2026): kaynak kod GitHub'da, özel depo `onuralkan/onuralkan-site`. `data/` ve `files/` içeriği `.gitignore` ile dışarıda; depoda kullanıcı verisi ve sır yok (kontrol edildi). Belgeler ayrıca claude.ai projesinde.
- Sunucu PHP 7.4 (güvenlik desteği bitmiş). 8.2+ önerildi; kod 7.4 uyumlu tutuluyor.

## Sıradaki adım
1. Kullanıcı paketi (`scripts/build-zip.sh`) cPanel'den yükleyip `/araclar/model-degerlendirme.php` adresini denetler.
2. **Modül 4: Çap Dağılımı Laboratuvarı** (kullanıcının promptuyla; `weibull.php` kodu testleriyle taşınacak, ⚑ 3. madde düzeltilecek).
