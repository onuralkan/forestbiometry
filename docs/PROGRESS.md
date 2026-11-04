# PROGRESS.md: Durum, kontroller, eksikler, sıradaki adım

Son güncelleme: 5 Kasım 2026, Modül 0 + hacim katsayısı düzeltmesi + Git deposu

## Tamamlananlar
| Bölüm | Durum | Kontroller |
|---|---|---|
| Gazete sitesi (ön sayfa, ders notları, yayınlar, iletişim, TR/EN, koyu tema) | Canlıda | Masaüstü/telefon/koyu tema ekran kontrolü |
| Admin paneli: dosya yükleme, yayın ekleme/düzenleme, DOI/ORCID/JSON içe aktarma | Canlıda | Uçtan uca tarayıcı testleri; içe aktarmada mükerrer kontrolü |
| Güvenlik: CSRF, giriş kilidi, yükleme filtresi, HTTPS + yönlendirme, TOTP 2FA + kurtarma kodları | Canlıda (2FA paketi kullanıcıya teslim edildi) | RFC 6238 test vektörleri; 12 adımlı 2FA akış testi |
| Ek 1 Meşcere Hesaplayıcı | Teslim edildi | numpy ile bağımsız hesap karşılaştırması |
| Ek 2 Çap Dağılımı Laboratuvarı (5 dağılım, 8 tahmin, KS/EI/AIC) | Teslim edildi | `tests/test_math.js`: 53/53 (SciPy referansı) |
| Ek 3 Bulmaca Köşesi | Teslim edildi | 10 bulmacada ızgara tutarlılığı; klavyeyle çözüm testi |
| **Modül 0: çalışma zemini** | **Bu tur** | `docs/` kayıtları, `tests/` (53/53 geçiyor), `scripts/build-zip.sh` |

## Bilinen eksikler ve çelişkiler (karar bekleyenler ⚑)
1. ✔ Giderildi (5 Kasım 2026): `mescere.php` içindeki kaynaksız örnek hacim katsayıları ve f = 0,50 varsayılanı kaldırıldı. Hacim yalnızca kullanıcının girdiği değerlerle hesaplanıyor; dayanağı özet tablosunda yazıyor. Eski tarayıcı kayıtlarındaki örnek değerler geri yüklenmiyor (`localStorage` anahtarı v2). Test: katsayısız → hacim yok; f = 0,5 ve b₀ = 0,0001, b₁ = 2, b₂ = 0,8 → numpy ile aynı (146,4 ve 201,8 m³/ha).
2. (1. maddeyle birlikte giderildi.)
3. Laboratuvarda yüzdelik çifti notu "Dubey (1967)'nin önerdiği klasik seçim" diyor. Doğru ama eksik: çift, **ölçek + şekil birlikte** tahmini için en verimli olanı (METHODS.md §2). Modül 4'te metin düzeltilecek.
4. Laboratuvarda konum (γ = dmin/2) ve SB sınırı (±1 cm) varsayılanları literatür önerisi değil; ekranda "varsayılan" olarak yazıyor, METHODS.md'de belirtildi.
5. KS sınırı 1,36/√n, tahmin edilmiş parametrelerle yaklaşık. Ekranda ve METHODS.md'de belirtildi.
6. METHODS.md'de **[D]** ile işaretli künyeler doğrulanmadı.
7. Tarayıcı düzeyi (Playwright) testleri geliştirme sırasında çalıştırıldı ama betikleri projeye kaydedilmedi; modül bazında eklenecek.
8. Excel (XLSX) kütüphanesi seçilmedi. npm'deki `xlsx` 0.18.5 güvenlik açıkları nedeniyle kullanılmayacak. Adaylar `@e965/xlsx` 0.20.3 ve `exceljs` 4.4.0. Karar Modül 1'de.

## Riskler
- ⚑ **Kaynak kodun tek kopyası geçici geliştirme ortamında ve kullanıcıya verilen zip'lerde.** Uzun soluklu proje için özel bir Git deposu (ör. GitHub, private) önerilir. Depo olmadan her yeni oturum, sunucudaki veya son zip'teki dosyalardan başlamak zorunda kalır. Belgeler (`docs/`) ayrıca claude.ai projesinde saklanıyor.
- Sunucu PHP 7.4 (güvenlik desteği bitmiş). 8.2+ önerildi; kod 7.4 uyumlu tutuluyor.

## Sıradaki adım
**Modül 1: Ormancılık Verisi Denetçisi / Forest Data Checker.** Kullanıcının promptuyla birlikte araçlar bölümü dizini (`araclar/`), tezgâh düzeni, içe aktarma, sütun eşleme, renk paleti ve dışa aktarma çekirdeği kurulacak.
