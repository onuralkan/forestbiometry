# P15 raporu: ilk kullanılabilir sürüm (Çap Dağılımı Laboratuvarı 2.0.0)

11 Kasım 2026. Şartname `docs/DIST_SPEC.md` P15. Kod `assets/lab/dist/`, sayfa `cap-dagilimi.php`.

## 1. Tamamlanan kapsam (P00–P15)

| Alan | Ne var | Aşama |
|---|---|---|
| Aileler | Weibull (a sabit), normal, iki parametreli lognormal, gamma, sabit sınırlı beta, Johnson SB (ξ, λ sabit), üstel (a sabit), log-lojistik (Fisk) | P05, P02, P03, P04, P08, P10 |
| Ham veriden uydurma | En çok olabilirlik; momentler (n bölen varsayılan, n − 1 seçenek); yüzdelikler (Weibull Dubey çifti, SB 50/95 ve kullanıcı çifti, log-lojistik); log-momentler (log-lojistik) | aynı |
| Özetlerden geri kazanım | Normal, lognormal, gamma (ortalama + varyans ya da Dq); Weibull M2–M10 (Poudel ve Cao 2013); Johnson SB, ξ sabit (Parresol 2003) | P06, P07, P09 |
| Ölçüm eşiği | Sekiz aile için koşullu en çok olabilirlik; uyum ölçütleri koşullu dağılımla | P11 |
| Çap sınıfları | Sınıf tabloları; sınıf sıklıklarından en çok olabilirlik (sekiz aile), ağaç sayısı / hektar sıklığı ayrımı | P12 |
| Karşılaştırma | KS, AD, CvM, AIC, BIC, AICc, sınıf hataları, EI; gözlem sürecine göre gruplar; Q–Q, P–P | P13 |
| Belirsizlik | Parametrik bootstrap p değerleri; parametrik / parametrik olmayan yüzdelik aralıklar; seed; Web Worker | P14 |
| Arayüz ve çıktı | İki iş akışı; örnek alan × dönem gezgini bütün sekmelerde aynı birim; TR/EN; erişilebilir kontroller; telefon görünümü; her sonucun yöntemi, birimleri, destek ve gözlem politikası ve kaynakları; Excel (Bilgi, Uydurmalar, Parametreler, Örnek alanlar, Sınıflar, Karşılaştırma, Bootstrap, Kaynaklar), CSV, JSON, SVG (sürüm, ayarlar, parametreler ve seed dosyanın içinde); yüklenme uyarısı | P15 |

**Çalışan ve çalışmayan sonuçların ayrımı.** Yalnızca "tamam" durumundaki sonuç parametre gösterir. Öteki durumlar (sınırda, yakınsamadı, birden çok çözüm, hesaplanmadı, hata) parametre vermez; nedeni sözcükle yazılır ve her birimde sayılır ("n sonuç hesaplandı; m sonuç hesaplanamadı ya da desteklenmiyor"). Desteklenmeyen birleşimler sayı yerine açıklamayla gösterilir: eşikli veride eşiksiz yöntemler, sınıflı veride ham veri yöntemleri, bootstrap'ta geri kazanım, hektar sıklığı ve "ölçüldü, ağaç yok" seçeneği.

**Doğrulama.** Her hesap bağımsız bir referansla (SciPy, mpmath, elle hesap) test edildi: `tests/dist/test_p01.mjs` … `test_p15.mjs` ve `test_export.mjs`, toplam 9 233 kontrol. Tarayıcı testi `tests/dist/e2e.mjs` 168/168 kontrol. Tarayıcı testinin P15 bölümleri şunları kapsar:
- örnek veride sekiz ailenin bütün yöntemleri; küçük alanlarda başarısız sonuçlar;
- seçili alanın bütün sekmelerde korunması;
- boş ve eksik veri; virgüllü veri yalnızca virgül seçiliyken okunur;
- eşit çaplar;
- dışa aktarılan dosyalarda sürüm, ayarlar, parametreler ve seed;
- yükleme hatası.

## 2. Bilerek yapılmayanlar
- **Eğri gezgini.** Eski Weibull aracındaki parametre kaydırıcıları taşınmadı. P01'de P15'e bırakılmıştı, ama P15 metninde yok. İstenirse ayrı bir iş olarak eklenir.
- **Konum ya da sınır tahmini** (üç parametreli Weibull, serbest beta L/U ve SB ξ/λ): şartname kararı gereği yok.
- **Göğüs yüzeyiyle ağırlıklı uydurma ve hektar ağırlıklı birleştirme:** kapsam dışı (şartname Bölüm 0, karar 3).
- **Canlı tarayıcı testi.** Barındırma hizmetinin bot koruması başsız tarayıcıyı zaman zaman "One moment, please..." sayfasında tutuyor. Sunucudaki dosyalar yerelle karşılaştırılarak denetleniyor. Kullanıcı tarafında bu durum artık "araç yüklenemedi" uyarısıyla gösteriliyor. Kalıcı çözüm barındırma tarafında beyaz listedir.

## 3. Kalan aşamalar
- **P16–P17:** meşcere düzeyinde model geliştirme, yani dağılım parametrelerinin meşcere değişkenlerinden tahmini (2.1.0). "Meşcere modeli" iş akışı bunlarla eklenir.
- **P18–P23:** isteğe bağlı genişletmeler. P23, göğüs yüzeyi çap dağılımı ve yalnızca betimseldir. Ayrıntı için şartnamenin ilgili bölümlerine bakın.
