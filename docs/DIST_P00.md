# P00: Mevcut çap dağılımı aracının incelenmesi ve değişiklik haritası

Tarih: 10 Kasım 2026. Şartname: `docs/DIST_SPEC.md`. Bu aşamada kod değiştirilmedi.
İncelenen sürüm: `cap-dagilimi` 1.0.0 (`assets/lab/weibull/`, `cap-dagilimi.php`), testler `tests/weibull/` (368 birim, 28 tarayıcı).

## 1. İlgili dosyalar

| Dosya | İçerik | Yeni araçta |
|---|---|---|
| `assets/lab/weibull/calc.js` (152 satır) | Weibull pdf/cdf/sf/quantile/moment, `fitML`, `fitMoments`, `ks`, `ad`, `aicBic`, `classTable`, `ecdf`, `analyse`, `solveMonotone` | Formüller yeni motora taşınır; dosya 2.0.0'a kadar değişmez |
| `assets/lab/weibull/ui.js` (375 satır) | 3 adım (veri, ayarlar, sonuçlar); sekmeler: parametreler, grafikler, sınıflar, örnek alanlar, indir; eğri gezgini | Yeniden yazılır |
| `assets/lab/weibull/i18n.js` | TR/EN metinler (`makeT`) | Yeni `dist/i18n.js` |
| `assets/lab/core/importer.js`, `table.js`, `num.js` | Dosya/yapıştırma, ayırıcı, kodlama, XLSX; sayı okuma, ondalık kanıtı, `defaultDecimal` | Aynen kullanılır |
| `assets/lab/core/i18n.js` | `lang`, `makeT`, `fmtNum` (dilden bağımsız, nokta), `esc` | Aynen |
| `assets/lab/core/unitnav.js` | Örnek alan gezgini (liste, arama, sıralama, önceki/sonraki, tuşlar) | Aynen |
| `assets/lab/core/chart.js` | `barChart`, `scatterChart`, `plotChart` (çubuk + çizgi, sürekli eksen), `radarChart`, SVG indirme | Kullanılır; Q–Q/P–P için `scatterChart` yeterli görünüyor (P13'te doğrulanacak) |
| `assets/lab/core/export.js`, `store.js` | CSV (`,` ve `.`), XLSX, JSON; IndexedDB oturumu | Aynen |
| `assets/lab/core/special.js` | `lnGamma`, `gammaFn` | Genişletilir (bkz. §4) |
| `assets/lab/core/stats.js` | `betaInc`, `gammaP`, `normCdf`, `normQuantile`, `tCdf`, `tQuantile`, tohumlu üreteç | Kullanılır; normal kuyruk düzeltilir (bkz. §3) |
| `assets/lab/core/nls.js` | Levenberg–Marquardt, kovaryans, OLS | P16–P17'de genişletilir |
| `assets/lab/stand/calc.js` → `classIndex` | Çap sınıfı dizini; Weibull aracı buradan içe aktarıyor | `core/`'a taşınır (araçlar arası bağımlılık kalkar) |

## 2. Mevcut davranış

- **Parametreleştirme:** a = konum, b = ölçek, c = şekil; F(d) = 1 − exp(−((d − a)/b)^c). Şartnameyle aynı.
- **Konum:** hiçbir zaman tahmin edilmez; 0 ya da kullanıcının sabitlediği a (a ≥ 0 ve a < min d).
- **Yöntemler:** sabit a ile en çok olabilirlik (profil skor denklemi, c için geometrik ikiye bölme, 0.01–1000) ve momentler (ortalama + varyans). Yüzdelik tahmincisi, serbest üç parametreli uyum ve özetlerden geri kazanım **yok**.
- **Analiz birimi:** örnek alan sütunu seçilirse her alan ayrı ya da bütün ağaçlar havuzda (eşit ağırlık). İsteğe bağlı tek süzgeç sütunu (ör. dönem). **Dönem ayrı bir boyut değildir**; şartnamedeki "örnek alan/dönem gezintisi" bu araçta yalnızca örnek alan gezintisidir. Dönem boyutu yeni araçta eklenmeli (bkz. §5, P01).
- **Ölçüm eşiği:** kullanıcıya sorulur; "eşik var" denirse uydurma engellenir.
- **Sınıflar:** yarı açık [alt, üst), eşit genişlik ya da sınır listesi; beklenen = n·[F(üst) − F(alt)]; alt ve üst kuyruk ayrı gösterilir, yeniden ölçekleme yok.
- **Uyum:** KS D, Anderson–Darling A², ln L; AIC/BIC yalnızca en çok olabilirlik uyumlarında (k = 2). p değeri ve kritik değer yok.
- **Tanılar:** n < 2, sabit veri, a ≥ min, az farklı değer, gruplanmış görünen veri; şekil çözümü aralık sınırında ya da yakınsamadı ayrı durumlar.
- **Grafik ve çıktı:** histogram + yoğunluk eğrileri, ampirik/kuramsal CDF, sınıf tablosu, eğri gezgini; parametre ve sınıf CSV'si, Excel raporu (Bilgi, Parametreler, Sınıflar).
- **Sayı biçimi ve çeviri:** `core/i18n.js` (`fmtNum`), araç metinleri `weibull/i18n.js`; içe aktarmada varsayılan nokta.

## 3. Şartnameyle uyuşmayan ya da değişmesi gereken yerler

| # | Mevcut | Şartname | Yapılacak |
|---|---|---|---|
| 1 | Moment yöntemi örnek varyansını **n − 1** bölenle kullanır | Varsayılan n bölen (karar 2) | P05: varsayılan n; n − 1 seçenek; eski sonuçlar seçenekle birebir üretilir |
| 2 | Yüzdelik tahmincisi yok | İki yüzdelikle doğrudan tahmin | P05'te eklenir |
| 3 | Eşik beyanında uydurma engellenir | Koşullu olabilirlik | P11 |
| 4 | Sınıf beklenenleri ham sayı (n·p) | Poudel EI'si ağaç/ha (N·p); ham sayıyla L1 hataya ayrı ad | P12–P13 |
| 5 | Sonuç nesnesinde birim, sınır politikası, kaynak kimliği, amaç değeri yok | Sonuç sözleşmesi | P01 |
| 6 | `normCdf` alt kuyrukta duyarlılık kaybediyor: Φ(−8) = 6.11·10⁻¹⁶ (doğrusu 6.22·10⁻¹⁶), Φ(−10) = 0 | Kararlı logcdf / log-survival | P01: erfc tabanlı kuyruk ve `logNormCdf`; mevcut kullanıcılar (boy–çap, örnekleme) etkilenmeden |
| 7 | Dönem boyutu yok | Örnek alan + dönem birimi; tekrar ölçümler aynı katta | P01 veri sözleşmesi |
| 8 | Havuz: her ağaç eşit ağırlık | Hektar ağırlıklı birleştirme kapsam dışı | Değişmez; ekranda açık kalır |
| 9 | `classIndex` başka aracın `calc.js`'inden | Bağımsız motor | `core/`'a taşınır |

Kaynakla karşılaştırma (Poudel ve Cao 2013, okundu): KS'nin araçtaki tanımı doğru çift taraflı biçimdir; makalenin basılı Denklem 7'sinde ikinci terimin parantezi hatalıdır. Tablo 2 dipnotu b ve c adlarını ters yazar; araçtaki adlar ana denklemle uyumludur. Uyuşmazlık yok.

## 4. Sayısal altyapı

Dış bağımlılık önerilmiyor: gerekenlerin hepsi küçük, saf JS işlevleri olarak yazılabilir ve SciPy ile sınanabilir (proje kuralı: veri tarayıcıdan çıkmaz, derleme adımı yok).

| Gereken | Durum | Aşama |
|---|---|---|
| ln Γ, eksik gamma P(a, x), eksik beta, normal CDF/quantile, t dağılımı, tohumlu üreteç | Var | — |
| Kararlı normal kuyruk (erfc), log Φ | **Eksik** | P01 |
| Digamma ψ, trigamma | **Eksik** | P03 |
| Ters eksik gamma (gamma quantile), ters eksik beta (beta quantile) | **Eksik** | P03, P04 |
| Kök bulma: Brent + aralık taraması ve kök birleştirme | Yalnızca tek kök için monoton ikiye bölme var | P01 (Brent), P07 (tarama) |
| Sınırlı çok değişkenli en küçükleme (dönüştürülmüş parametrelerle Nelder–Mead ya da BFGS) | **Eksik** | P04, P10 |
| Gauss–Hermite / Gauss–Legendre integrali (Johnson SB momentleri) | **Eksik** | P08 |
| İki değişkenli doğrusal olmayan denklem çözücü (Parresol) | LM var (`core/nls.js`), artık biçimine uyarlanır | P09 |
| Cramér–von Mises | **Eksik** | P13 |
| Web Worker (bootstrap, model eğitimi) | Projede hiç kullanılmadı; ES modülü worker, `php -S` ve cPanel'de ek ayar gerektirmez | P14 |
| Çok yanıtlı NLS, SUR (artık kovaryansı) | **Eksik** | P16 |

## 5. Önerilen dosya düzeni

```
assets/lab/core/special.js      + digamma, trigamma, erfc, ters eksik gamma/beta
assets/lab/core/roots.js        Brent, aralık taraması (yeni)
assets/lab/core/optim.js        sınırlı en küçükleme (yeni)
assets/lab/core/quad.js         Gauss–Hermite, Gauss–Legendre (yeni)
assets/lab/core/classes.js      classIndex, sınıf kurma (stand/calc.js'ten taşınır; stand yeniden dışa aktarır)
assets/lab/dist/registry.js     dağılım ve yöntem kaydı, sonuç sözleşmesi, yapılandırılmış hatalar
assets/lab/dist/families/*.js   her aile: şema, destek, pdf/logpdf, cdf/logcdf, sf/logsf, quantile, momentler
assets/lab/dist/fit/*.js        doğrudan tahmin yöntemleri (aileye göre)
assets/lab/dist/recover/*.js    özetlerden geri kazanım (Weibull M2–M10, Parresol)
assets/lab/dist/gof.js          KS, AD, CvM, ln L, AIC/BIC, sınıf hataları
assets/lab/dist/observe.js      ölçüm eşiği, sınıflı veri olabilirliği
assets/lab/dist/ui.js, i18n.js  arayüz
cap-dagilimi-2.php              menüde listelenmeyen geliştirme sayfası (noindex); P15'ten sonra cap-dagilimi.php'nin yerine geçer
tests/dist/test_*.mjs, e2e.mjs  birim ve tarayıcı testleri
tests/ref/make_dist_*.py        SciPy referansları (ilk dosya: şartname Bölüm 8 tablosu)
```

Hesap çekirdeği (`registry`, `families`, `fit`, `recover`, `gof`, `observe`) DOM'a dokunmaz; Node testlerinde ve Web Worker'da aynı dosyalar çalışır.

## 6. Korunacak davranışlar

1. a, b, c adları ve anlamları; konumun kendiliğinden tahmin edilmemesi.
2. Sabit a ile en çok olabilirlik ve moment sonuçları (moment: n − 1 seçeneğiyle birebir).
3. Çözüm durumlarının ayrı raporlanması (sınırda, yakınsamadı, veri sorunu); başarısız uyumun sayı gibi gösterilmemesi.
4. p değeri verilmemesi (P14 bootstrap'a kadar); AIC/BIC'in yalnızca olabilirliği en büyüklenen uyumlarda verilmesi.
5. Sınıf tablosunda kuyrukların ayrı gösterilmesi, yeniden ölçekleme yapılmaması.
6. Örnek alan gezgini, seçimin sekmeler arasında korunması, eğri gezgini.
7. İçe aktarma kuralları, varsayılan ondalık nokta, TR/EN, oturumun tarayıcıda saklanması, verinin tarayıcıdan çıkmaması.
8. CSV ve Excel çıktılarında araç sürümü ve ayarlar.

## 7. Şartname ↔ mevcut durum eşlemesi

| İstenen | Durum |
|---|---|
| Weibull 2P / sabit a, MLE, MOM | Mevcut (MOM böleni değişmeli) |
| KS, AD, ln L, AIC/BIC kuralları, kuyruklu sınıf tablosu, durum ayrımı | Mevcut |
| Varsayılan ondalık nokta, ortak gezgin, TR/EN, CSV/Excel | Mevcut |
| Weibull yüzdelik tahmini; ölçüm eşiği; dönem boyutu; sonuç sözleşmesi; normal kuyruk | Değişmeli / eklenmeli |
| Dağılım kayıt sistemi; normal, lognormal, gamma, beta, Johnson SB, exponential, log-logistic | Eklenecek |
| Özetlerden geri kazanım (M2–M10, Parresol); sınıflı veri; CvM; Q–Q/P–P; bootstrap | Eklenecek |
| Meşcere modelleri (PPM/PRM, NLS, SUR, CDFR) | Eklenecek (P16–P17) |

## 8. Aşama bağımlılıkları

```
P01 ─ P05 ─┬─ P02 ─ P03 ─ P04 ─ P08 ─ P10 ─┬─ P11 ─ P12 ─ P13 ─ P14 ─ P15 (2.0.0)
           └─ P06 ─ P07                    │
                    P09 (P08'e bağlı) ─────┘
P16 (P06, P07, P09, P15) ─ P17
```

P03 digamma ve ters eksik gamma, P04 ters eksik beta ve en küçükleyici, P08 integral gerektirir; P11 her ailenin cdf/sf'sine, P14 her yöntemin yeniden çalıştırılabilir olmasına bağlıdır. Çalıştırma sırası şartnamedeki gibidir.

## 9. Uygulama notu

- Yeni oturum anahtarı `session:cap-dagilimi-2`; 1.0.0 oturumları yeni araca taşınmaz (yalnızca ayarlar içerir, veri yeniden yüklenir).
- Yeni sayfa `site_tools()` listesine girmez; atıf menüsü ve sürüm denetimi (`tests/site/test_cite.mjs`) P15'te güncellenir.
- Her aşamada: `tests/ref/make_dist_<aşama>.py` → `tests/dist/test_<aşama>.mjs` → yayın iş akışına eklenir; mevcut `tests/weibull/` her aşamada değişmeden geçmelidir.
- Kaynak durumu: Poudel ve Cao (2013), Parresol (2003), Kangas ve Maltamo (2000) okundu [B]; diğerleri ilgili aşamada okunursa [B], aksi hâlde [İ]/[D].
