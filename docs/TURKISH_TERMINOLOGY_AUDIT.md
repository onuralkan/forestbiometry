# Ormancılık Biyometrisi Araçları: Türkçe Terim ve Dil Denetimi

Tarih: 19 Kasım 2026 · Dal: `claude/nifty-hamilton-oi0q51` · Talimat: `docs/TERMINOLOJI_DENETIMI_PROMPT.md`

Bu belge yalnız editoryal bir denetimdir. Uygulamada hiçbir metin, hesap ya da dosya değiştirilmemiştir. Önerilen düzeltmelerin uygulanıp uygulanmayacağına ve terim tercihlerine yazar karar verecektir.

---

## 1. Yönetici Özeti

Platformun Türkçe arayüzü genel olarak yüksek nitelikli, bilimsel açıdan dikkatli ve büyük ölçüde tutarlıdır:

- "fit et-" kuralı arayüz metinlerinde tutarlı biçimde uygulanmış.
- "rastgele etki", "karma etkili model", "endeks", "sürüm", "ayrıntı" gibi terimler bütün platformda tek biçimde kullanılmış.
- Ormancılık terimlerinin çoğu (göğüs çapı, göğüs yüzeyi, örnek alan, meşcere, bonitet, artım, kabuklu/kabuksuz hacim, dip kütük) yerleşik kullanımla uyumlu.

Bununla birlikte denetimde **194 ham bulgu** çıkmış, yinelenenler birleştirilince **154 benzersiz bulgu** kalmıştır. Bunların önemli bir bölümü tek tek sözcük seçiminden çok, **aynı kavramın araçtan araca farklı adlarla ya da farklı tanımlarla verilmesinden** kaynaklanıyor (bkz. Bölüm 4, X-bulguları).

**En önemli beş sorun:**

1. **Yanlılığın (bias) işareti araçtan araca ters (X-01, Kritik).**
   - Model Başarısı, Hacim Denklemleri ve Bonitet aracında yanlılık = tahmin − gözlenen.
   - Büyüme İşlevi ve Gövde Profili'nde yanlılık = gözlenen − tahmin.
   - Biyokütle aracında işaret yazılmamış.
   - Aynı "Yanlılık" etiketi ters işaretli sayılar gösterdiği için okur sonucu ters yorumlayabilir. Bu yalnız bir terim sorunu değil, içerik tutarsızlığıdır. İngilizce metinlerde de aynısı var.
2. **"Dayanak yaş" (X-02, Major).** Bonitet aracında, sayfasında, kılavuzunda ve katalog açıklamasında yaklaşık 20 yerde "base age" karşılığı olarak geçiyor. Bütün geçişler bonitet endeksinin okunduğu yaşı, yani projenin "standart yaş" kavramını anlatıyor. Meşcere Yapısı'ndaki "dayanak çap" ise Reineke SDI'sinin referans çapıdır; "standart yaş"a eşlenmemelidir.
3. **Biyokütle genişletme faktörü (BEF) "dönüşüm etkeni" olarak adlandırılmış (X-03, Kritik).** Katalog ve sayfa üst başlığı "dönüşüm etkeni (BEF)" diyor, araç ve kılavuz "genişletme etkeni" diyor. IPCC sisteminde BEF (genişletme) ile BCEF (dönüşüm ve genişletme) ayrı katsayılardır; "dönüşüm" sözcüğü bu ikisini karıştırır.
4. **Türkçe arayüzde İngilizce görünen metinler (X-04, Major/Kritik).**
   - Örnek Alan ve Meşcere'de bir başlık, anahtar Türkçe nesnede iki kez tanımlandığı için İngilizce görünüyor. Bu bir program hatasıdır (MS-03).
   - Meşcere Yapısı'nın "Tanımlar ve kaynaklar" kutusu yalnız İngilizce (MS-06).
   - Büyüme İşlevi'nde "Logistic" ve "Monomolecular" model adları İngilizce (MS-07).
   - Çap Dağılımı'nda "Seed" ve "Modified CDFR" çevrilmemiş.
   - Bunlar TR/EN eksiksizlik kuralına aykırıdır.
5. **"Ters J biçimli (alaşımlı, çok yaşlı) meşcereler" (DD-01, Kritik).** "Alaşım" bir metalurji terimidir; "çok yaşlı" ise "çok ihtiyar" diye okunur. Kastedilen "değişik yaşlı (uneven-aged) meşcere"dir.

**Öteki kesişen sorunlar:**
- Kavram çiftleri ve terim seçimleri:
  - "tahmin" ile "kestirim" ayrımı (estimate/estimation ve prediction);
  - "kalıntı" ile "artık";
  - "geri dönüşüm" (recycling çağrışımı) ile "ters dönüşüm";
  - "biçim sayısı" ile "şekil katsayısı";
  - "ürün bölme" ile "boylama";
  - "kullanılabilir hacim" ile "ticari hacim";
  - "üst boy" ile "baskın boy".
- Biçim ve yazım tutarsızlıkları:
  - bootstrap'ta "tekrar" ile "yineleme" (iterasyonla çakışıyor);
  - "p değeri" ile "p-değeri";
  - "logistik" ile "lojistik";
  - açılmamış "ÇK" kısaltması;
  - Türkçe metinlerde ondalık virgül ile noktanın karışık kullanımı.
- Güncelliğini yitirmiş metinler: kılavuzda ve katalogda "sonraki aşamada" diye anılan, oysa artık başka araçta bulunan ya da plandan çıkarılmış özellikler.

**Önerilen editoryal öncelik:**
1. Önce bilimsel anlamı bozan ve İngilizce kalan metinler: X-01, X-03, DD-01, X-04, MS-19.
2. Sonra yazarın bir kez karar vermesi gereken terim tercihleri (Bölüm 9.3), ardından bunların bütün platforma tek seferde uygulanması.
3. En son dil bilgisi ve üslup düzeltmeleri.

Terim tercihleri her araçta ayrı ayrı değil, bir sözlük kararıyla (Bölüm 6) bütün platformda birlikte değiştirilmelidir.

---

## 2. İnceleme Kapsamı

**Yöntem:** Türkçe kullanıcı metinleri beş konu alanına bölündü ve her alan ayrı bir inceleme geçişinde okundu. Kapsamdaki kaynaklar:
- her aracın `assets/lab/*/i18n.js` dosyasındaki `tr` nesnesi;
- sayfa PHP dosyaları;
- `inc/guide/tr/*.php` kılavuz sayfaları;
- `inc/site.php`, `inc/catalog.php`, `inc/home.php`;
- indirilen R betiklerine yazılan Türkçe yorumlar;
- `report/render.js` ile `core/*.js` içindeki kullanıcıya görünen metinler.

İngilizce metinler yalnız anlamı belirlemek için okundu. Bütün alıntılar ve satır numaraları `grep -n` ile doğrulandı. Tutarlılık sayımları `grep -o` ile alındı (Bölüm 4).

**Kapsam:** 26 araç modülü, platform kabuğu ve ortak bileşenler. Türkçe metin içeren yaklaşık 120 dosya incelendi:
- 27 `i18n.js`;
- 26 kılavuz sayfası;
- 30 sayfa PHP dosyası;
- `inc/*.php`;
- 15 civarında `core/*.js`;
- R betiği üreticileri (`*/rcode*.js`);
- `report/render.js`;
- örnek veri notları.

| Modül / alan | Dosyalar | Durum |
|---|---|---|
| Çap Dağılımı | `dist/i18n.js` (`tr` tamamı), `dist/rcode*.js` (Türkçe `T()` metinleri), `dist/ui.js`, `stand.js`, `report.js`, `bootstrap.js` (tarandı), `cap-dagilimi.php`, kılavuz | Tam |
| Ağaç Ölçümü | `tree/i18n.js`, `ui.js` ve modüller (tarandı), `agac-olcumu.php`, kılavuz | Tam |
| Örnek Alan ve Meşcere | `stand/i18n.js`, `ui.js`/`calc.js` (tarandı), `ornek-alan.php`, kılavuz, `stand/ornek/ornek-veri.json` | Tam |
| Meşcere Yapısı | `structure/i18n.js`, `calc.js` (tanım metinleri), `ui.js` (tarandı), `mescere-yapisi.php`, kılavuz | Tam |
| Örnekleme Planlayıcısı | `sampling/i18n.js`, `ornekleme.php`, kılavuz | Tam |
| Bonitet | `siteindex/i18n.js`, `calc.js` (formül etiketleri), `coef-extra.js`, `bonitet.php`, kılavuz | Tam |
| Büyüme İşlevi | `growth/i18n.js`, `calc.js` (model adları), `rcode.js`, `buyume-islevi.php`, kılavuz | Tam |
| Seksiyon Hacmi | `secvol/i18n.js`, `seksiyon-hacmi.php`, kılavuz | Tam |
| Gövde Profili | `taper/i18n.js`, `calc.js:36`, `coef-extra.js`, `govde-profili.php`, kılavuz | Tam |
| Hacim Denklemleri | `volume/i18n.js`, `volume/rcode.js`, `hacim-denklemleri.php`, kılavuz | Tam |
| Tomruk Ölçümü | `logscale/i18n.js`, `tomruk-olcumu.php`, kılavuz | Tam |
| Biyokütle ve Karbon | `biomass/i18n.js`, `coef-extra.js`, `nsur.js`/`sur.js` (tarandı), `biyokutle-karbon.php`, kılavuz | Tam |
| Boy–Çap | `hd/i18n.js`, `hd/rcode.js`, `boy-cap.php`, kılavuz | Tam |
| Doğrusal Olmayan Regresyon | `nlsreg/i18n.js`, `rcode.js`, sayfa, kılavuz | Tam |
| Karma Etkili Modeller | `mixed/i18n.js`, `rcode.js`, sayfa, kılavuz | Tam |
| Denklem Sistemleri | `eqsys/i18n.js`, `rcode.js`, sayfa, kılavuz | Tam |
| Model Başarısı | `eval/i18n.js`, sayfa, kılavuz, `eval/ornek/README.md` | Tam |
| Nispi Sıralama | `rank/i18n.js`, sayfa, kılavuz | Tam |
| Veri Denetçisi | `checker/i18n.js`, `ui.js`/`calc.js` (tarandı), sayfa, kılavuz | Tam |
| Katsayı Kütüphanesi | `coeflib/i18n.js`, `core/coef-ui.js`, sayfa, kılavuz | Tam |
| Kayıt Doğrulayıcı | `record/i18n.js`, `core/record-ui.js`, sayfa, kılavuz | Tam |
| Veri Yöneticisi | `projects/i18n.js`, sayfa, kılavuz | Tam |
| Pano | `dashboard/i18n.js`, sayfa, kılavuz | Tam |
| Rapor Üretici | `report/i18n.js`, `render.js`, sayfa, kılavuz | Tam |
| Platform kabuğu | `inc/site.php`, `inc/catalog.php`, `inc/home.php`, `inc/guide/cards.php`, `index.php`, `hakkinda.php`, `kilavuz.php`, `kaynakca.php`, kılavuz genel/iş akışı/sorun giderme | Tam |
| Ortak bileşenler | `core/importer.js`, `citation.js`, `cite-ui.js`, `coef-ui.js`, `record-ui.js`, `i18n.js`, `unitnav.js`, `store.js`, `table.js`, `num.js`, `derived.js`, `export.js`, `rcode.js`, `nls.js`, `expr.js`, `optim.js` | Tam (çoğunda Türkçe metin yok ya da çok az) |
| Kısmen incelenen | `ui.js`/`calc.js` dosyaları satır satır değil, Türkçe karakter, `lang === 'tr'` ve `$tr ?` aramalarıyla tarandı; örnek CSV dosyaları açılmadı | Kısmen |
| İncelenmeyen | `assets/build/*` (kaynaktan üretilir); `docs/*.md` (kullanıcıya doğrudan görünmez; yalnız `METHODS.md`'de "dayanak yaş" ve kaynak durum etiketleri karşılaştırma için okundu); İngilizce metinlerin kendi kalitesi | Kapsam dışı |

**Sınırlamalar:**
- Arayüz tarayıcıda çalıştırılarak her dinamik ileti tek tek üretilmedi. Dinamik metinler şablonlarından değerlendirildi.
- Dış kaynaklar: bazı terimler için web araması yapıldı, ancak bulunan yayınların tam metinleri açılıp okunmadı (Bölüm 9). Bu yüzden terim önerilerinin çoğu "editoryal değerlendirme" olarak işaretlendi.

---

## 3. Kritik Terminoloji Hataları

Bilimsel olarak yanlış ya da yanıltıcı ifadeler. Ayrıntılı kayıtlar Bölüm 7'de, kesişenler Bölüm 4'te.

| ID | Modül | Dosya / Konum | Mevcut Türkçe | İngilizce | Önerilen Türkçe | Tür | Önem | Güven | Açıklama | Kaynak |
|---|---|---|---|---|---|---|---|---|---|---|
| X-01 | Model Başarısı, Hacim Denklemleri, Bonitet ↔ Büyüme İşlevi, Gövde Profili, Biyokütle | `eval/i18n.js:28, 50`; `volume/i18n.js:22`; `volume/rcode.js:29`; `siteindex/i18n.js:41` ↔ `growth/i18n.js:17`; `taper/i18n.js:23, 28`; `biomass/i18n.js:50` | "e = tahmin − gözlenen" ↔ "Yanlılık = gözlenen − tahmin"; "Yanlılık (kg)" (işaretsiz) | bias | Platformda tek işaret kuralı (Model Başarısı'nınki: e = tahmin − gözlenen) ve her "Yanlılık" etiketinde işaretin açıkça yazılması | tutarlılık (içerik) | Kritik | Yüksek | Aynı etiket araçtan araca ters işaretli değer gösteriyor; kullanıcı fazla tahmini eksik tahmin sanabilir. Hesap kodunu da ilgilendirdiği için düzeltme dil düzeltmesinden ayrı ele alınmalı. | Kod ve metin incelemesi |
| X-03 | Biyokütle ve Karbon, katalog | `inc/catalog.php:15, 52`; `biyokutle-karbon.php:6` ↔ `biyokutle-karbon.php:7`; `biomass/i18n.js:6, 26, 29, 72–77, 82, 90`; kılavuz `biyokutle-karbon.php:3, 4, 11, 19` | "Biyokütle dönüşüm etkeni (BEF)", "dönüşüm etkenleri" ↔ "genişletme etkeni", "Etkenler" | biomass expansion factor (BEF); BCEF | "biyokütle genişletme faktörü (BEF)"; "dönüşüm ve genişletme faktörü (BCEF)" yalnız BCEF için | terminoloji | Kritik | Yüksek | BEF ile BCEF IPCC'de ayrı katsayılardır; "dönüşüm (BEF)" ikisini karıştırır. "Etken" mi "faktör" mü sorusu ayrıca bir terim kararıdır (Bölüm 9.3). | Editoryal değerlendirme (IPCC 2006 tanımı; bu denetimde birincil belge açılmadı) |
| DD-01 | Çap Dağılımı | `dist/i18n.js:192` | "Ters J biçimli (alaşımlı, çok yaşlı) meşcereler için" | reverse-J (uneven-aged) stands | "Ters J biçimli (değişik yaşlı) meşcereler için" | çeviri/terminoloji | Kritik | Yüksek | "Alaşım" metalurji terimidir; "çok yaşlı" "çok ihtiyar" diye okunur. Türk ormancılık yazınında karşılık "değişik yaşlı meşcere"dir. | Web aramasında "değişik yaşlı meşcere … ters J" kullanımı görüldü (DergiPark); tam metin okunmadı |
| MS-03 | Örnek Alan ve Meşcere | `stand/i18n.js:98–99` | 99. satırdaki İngilizce `'more'` ve `'dom.hnote.h'` tanımları `tr` nesnesinin içinde | How is it computed? | 99. satır `en` nesnesine taşınmalı | çeviri (program hatası) | Kritik | Yüksek | Aynı anahtar `tr` nesnesinde iki kez tanımlı; ikinci tanım birincisini ezdiği için Türkçe arayüzde başlık İngilizce çıkıyor (`stand/ui.js:165, 167`). | Kod incelemesi |
| X-04 | Meşcere Yapısı, Büyüme İşlevi | `structure/calc.js:138–140` (gösterim: `structure/ui.js:288, 321`); `growth/calc.js:41, 47` | "divisor n (weighted…)", "natural log; …"; "Logistic", "Monomolecular" | – | Tanım metinleri TR/EN olarak verilmeli; "Lojistik", "Monomoleküler" | çeviri | Kritik | Yüksek | Türkçe arayüzdeki tanım kutusu, Excel "Tanımlar" satırları ve model adları yalnız İngilizce. TR/EN eksiksizlik kuralına aykırı. | Kod incelemesi |

---

## 4. Önemli Terminoloji ve Tutarlılık Sorunları

### 4.1 Kesişen (birden çok modülde görülen) bulgular

| ID | Kavram | Mevcut biçimler ve sayımlar | Temsilî konumlar | Önerilen | Önem | Güven | Açıklama |
|---|---|---|---|---|---|---|---|
| X-02 | base age (bonitet) | "dayanak yaş" (~20) | `siteindex/i18n.js:14, 15 (×4), 16, 58, 64, 68, 71`; `bonitet.php:7, 9`; kılavuz `bonitet.php:3, 11 (×3)`; `inc/site.php:74` | "standart yaş (A₀)" | Major | Yüksek | Bütün geçişler bonitet endeksinin okunduğu yaştır, yani "standart yaş" bağlamı. Mekanik değişim yapılmamalı. Meşcere Yapısı'ndaki "dayanak çap" (`structure/i18n.js:25`; kılavuz `mescere-yapisi.php:8`) Reineke'nin referans çapıdır: "referans çap" önerilir (MS-02). `docs/METHODS.md:943, 955, 963, 967, 970, 994`'te de "dayanak yaş" geçer. |
| X-05 | estimate / estimation ↔ prediction | tahmin ~340, kestir- ~40 | Parametre sütunu "Tahmin" (`hd/i18n.js:37`, `nlsreg:30`, `mixed:28`, `eqsys:23`) ile tahmin sekmesi (`hd/i18n.js:27`) yan yana; "Kestirim" (`mixed:14, 23`; `eqsys:16`); "kestirilsin/kestirilen" (`nlsreg:17, 25`; `volume:18, 25, 26`; `biomass:44–64`; `dist:316`) ↔ "tahmin edilen θ" (`nlsreg/rcode.js:47, 97`); "tasarıma dayalı tahmin" (`site.php:52`; `ornek-alan.php:7, 9`) ↔ "kestirim" (`home.php:16`; `catalog.php:18, 69`; `pano.php:9`; `render.js:17`) | Bir kez karar verilmeli (Bölüm 9.3). İki tutarlı seçenek: (a) proje kuralını izleyerek parametreler için "tahmin edilen", yeni değerler için "tahmin edilen değer"; "kestir-" kaldırılır. (b) estimation = "kestirim", prediction = "tahmin". | Major | Yüksek (tutarsızlık) / Orta (seçim) | Aynı araçta aynı sözcük hem parametre kestirimi hem boy tahmini için kullanılıyor; Model Başarısı'nda üçüncü bir anlam da var ("Tahmin yapılmadı" = guess, `eval/i18n.js:21`). CLAUDE.md'deki terim kararı "tahmin edilen parametreler (fitted parameters)" der; (a) bu karara uyar. |
| X-06 | residual | artık ~42, kalıntı ~15 | `eqsys/i18n.js:16, 17, 22, 25–27, 41`; `eqsys/rcode.js:24, 39, 60`; `hd/rcode.js:32`; `nlsreg/rcode.js:47`; `volume/rcode.js:29`; `eval/i18n.js:29`; `inc/site.php:119`; kılavuz `denklem-sistemleri.php:10, 14, 18` | "artık" | Major | Yüksek | Platformun baskın terimi "artık"; `eqsys/rcode.js:24` aynı notta ikisini birlikte kullanıyor. |
| X-07 | back-transformation (correction) | "geri dönüşüm" ~12, "geri dönüş" 4 | `core/coef-ui.js:16`; `volume/i18n.js:18, 19, 30`; `volume/rcode.js:29`; `taper/i18n.js:19, 26`; `biomass/i18n.js:28, 59, 61`; `hacim-denklemleri.php:7`; `inc/site.php:107`; kılavuz `hacim-denklemleri.php:13, 16`; "geri dönüş" `dist/i18n.js:278, 290 (×2)`, kılavuz `cap-dagilimi.php:37` | "ters dönüşüm (düzeltmesi)" (ya da "geri dönüştürme") | Major | Orta | "Geri dönüşüm" günlük dilde recycling; "geri dönüş" return anlamında. Raporlardan biri "geri dönüşüm"ü önerdi, üçü "ters dönüşüm"ü; okunuş belirsizliği nedeniyle "ters dönüşüm" seçildi. |
| X-08 | power model y = a·x^b | "Kuvvet" (Boy–Çap) / "Üs" (Doğrusal Olmayan Regresyon) | `hd/i18n.js:33–34`; kılavuz `boy-cap.php:3` ↔ `nlsreg/i18n.js:12`; kılavuz `dogrusal-olmayan-regresyon.php:8`; `dogrusal-olmayan-regresyon.php:7, 9` | "Kuvvet (modeli)" | Major | Yüksek | "Üs" tek başına üstel (exp) modeli çağrıştırır. |
| X-09 | additivity ↔ additive error | "toplamsal" iki anlamda; "eklemeli" (`dist/i18n.js:276`) | `biomass/i18n.js:42, 50, 51, 53`; kılavuz `biyokutle-karbon.php:4, 9, 10`; `dist/i18n.js:276` ↔ `dist/rcode-stand.js:154` | additivity = "toplanabilirlik", additive system = "toplanabilir sistem"; additive error = "toplamsal hata" (her yerde) | Major | Orta | Aynı paragrafta iki kavram aynı sözcükle geçiyor. Bir rapor "eklemeli hata"yı önerdi; Türkçe istatistikte "toplamsal hata" daha yerleşik olduğu için o seçildi. |
| X-10 | form factor | "biçim sayısı" ~10 | `secvol/i18n.js:48, 81`; `volume/i18n.js:17`; `tree/i18n.js:34`; `seksiyon-hacmi.php:7, 9`; `hacim-denklemleri.php:7`; kılavuzlar `seksiyon-hacmi.php:3, 17`, `hacim-denklemleri.php:12` | "şekil katsayısı" (göğüs yüksekliği şekil katsayısı f1,30; gerçek şekil katsayısı λ₀,₉; şekil bölümü) | Major | Orta | Türkçe dendrometri yayınlarında "şekil katsayısı" yaygın görünüyor; "biçim" araçta ayrıca "denklem biçimi" anlamında kullanılıyor. Yazarın tercihi gerekir. |
| X-11 | merchantable volume / top diameter | "kullanılabilir hacim" ~26 / "ticari gövde" 1 | `secvol/i18n.js:29, 48, 64, 79`; `taper/i18n.js:35, 41, 45, 47, 52, 70`; sayfalar; kılavuzlar; `catalog.php:46` ↔ `biomass/i18n.js:74` | "ticari hacim", "ticari tepe çapı" | Major | Orta | Aynı kavram iki adla geçiyor. |
| X-12 | bucking / optimal bucking | "ürün bölme" ~12 | `taper/i18n.js:55, 58, 62, 66, 68`; `govde-profili.php:9`; kılavuz `govde-profili.php:4, 18, 20, 22`; `catalog.php:49` | "boylama", "optimum boylama", "boylama adımı" | Major | Orta–Yüksek | Orman üretimi yazınında bucking karşılığı "boylama"dır. |
| X-13 | top height / dominant height (H0) | "üst boy" ~31 (Bonitet) / "baskın boy" (Örnek Alan) | `stand/i18n.js:97, 106, 114`; kılavuz `ornek-alan.php:3, 16` ↔ `siteindex/i18n.js:12, 49–53, 61`; `dist/i18n.js:282` | H0 için her yerde "üst boy (H0)" ve tanımın (100 en kalın / 100 en uzun) yanında yazılması; D0 için "baskın çap" (proje kararı) korunur | Major | Yüksek (tutarsızlık) / Orta (seçim) | Aynı H0 iki araçta iki adla anılıyor. Bonitet tanımı en uzun 100 ağaca, Örnek Alan tanımı en kalın 100 ağaca dayanıyor; ikisi aynı adı taşırsa fark açıkça yazılmalı (MS-05). Çap Dağılımı'ndaki "baskın ve ortak baskın" için Kraft sınıflarında yerleşik "hâkim / ortak hâkim" düşünülebilir (DD-32, Düşük güven). |
| X-14 | relative | nispi 23 / bağıl 21 / göreli 14 | Nispi Sıralama (araç adı); "bağıl ölçüt" (Model Başarısı); "göreli aralık" (Meşcere Yapısı), "göreli kesinlik" (`mixed/rcode.js:25, 90`) | Araç adı korunarak yeni metinde tek tercih; aynı araç içinde tek terim | Opsiyonel | Yüksek | Yerleşik adlar var; anlam karışıklığı yok, yalnız biçim birliği. |
| X-15 | bootstrap replicate ↔ iteration | "tekrar" (Çap Dağılımı UI) / "yineleme" (Çap Dağılımı R ve kılavuz, Model Başarısı) / "İterasyon" (1) | `dist/i18n.js:25, 31, 36–38, 409` ↔ `dist/i18n.js:131`; `dist/rcode.js:264`; kılavuz `cap-dagilimi.php:43`; `eval/i18n.js:76, 82`; kılavuz `model-degerlendirme.php:16` ↔ iterasyon: `hd/i18n.js:37`, `dist/i18n.js:147, 315, 369` | bootstrap için "tekrar" (B: tekrar sayısı), optimizasyon için "yineleme" | Minor | Yüksek | "Yineleme" iki ayrı anlamda kullanılıyor. |
| X-16 | p-value | "p değeri" / "p-değeri" | `dist/i18n.js:131`; `dist/rcode.js:182, 276`; `eqsys/i18n.js:28, 31, 32`; kılavuzlar `cap-dagilimi.php:43`, `denklem-sistemleri.php:15` ↔ `dist/i18n.js:24, 28, 48, 142, 393, 409`; `mixed/i18n.js:25` | "p değeri" | Minor | Yüksek | Baskın biçim tiresiz. |
| X-17 | seed | "Seed" / "tohum" | `dist/i18n.js:25 (×2), 36, 402`; kılavuz `cap-dagilimi.php:27` ↔ `dist/i18n.js:131`; `dist/rcode.js:262, 276, 277`; `eval/i18n.js` | "tohum (seed)" ilk geçişte, sonra "tohum" | Major | Yüksek | Aynı sayfada çevrilmemiş İngilizce ile Türkçe karşılık yan yana. |
| X-18 | finite population correction | "sonlu popülasyon düzeltmesi" / "sonlu çerçeve düzeltmesi" | `sampling/i18n.js:28, 41`; kılavuz `ornekleme.php:3`, `ornek-alan.php:4` ↔ `inc/site.php:64`; `ornekleme.php:9` | "sonlu popülasyon düzeltmesi" | Major | Yüksek | Aracın kendisi ve kılavuzu "popülasyon" diyor. |
| X-19 | per-hectare expansion (10000/A) | "hektara çevirme katsayısı" / "genişletme çarpanı" / "hektara genişletme" | `stand/i18n.js:49`; `checker/i18n.js:87, 97`; `biomass/i18n.js:84` ↔ kılavuz `ornek-alan.php:23` ↔ `secvol/i18n.js:30`; `seksiyon-hacmi.php:9`; kılavuz `seksiyon-hacmi.php:12` | "hektara çevirme katsayısı" | Minor | Yüksek | Üç ad var; "genişletme" BEF'teki genişletmeyle de karışıyor. |
| X-20 | CV (coefficient of variation) | "ÇK" / "değişim katsayısı (CV)" / "CV" | `structure/i18n.js:47`; `mescere-yapisi.php:7`; kılavuz `mescere-yapisi.php:15` ↔ `sampling/i18n.js:8, 25`; biomass | "DK (değişim katsayısı)" ya da her yerde "CV" | Major | Yüksek | "ÇK" hiçbir yerde açılmıyor. |
| X-21 | logistic | "lojistik" 9 / "logistik" 4 | `inc/site.php:83`; `buyume-islevi.php:7, 9`; kılavuz `buyume-islevi.php:3` | "lojistik" | Minor | Yüksek | Türkçe yazımı "lojistik". |
| X-22 | "Tür" = kind/type | "Tür" sütun ve etiketleri | `tree/i18n.js:34` (`f.kind`); `mixed/i18n.js:13`; `checker/i18n.js:96`, `71` ("Bu türdeki"); `record/i18n.js:21, 27`; `report/render.js:23` | Bağlama göre "Biçim/şekil katsayısı türü", "Model türü", "Sorun türü", "Girdi tipi", "Nitelik"; "Bu çeşit … öneri" | Major | Yüksek | Ormancılık verisinde "Tür" ağaç türü (species) demektir; aynı tabloda ya da aynı araçta karışabilir. |
| X-23 | uneven precision vs sensitivity | "duyarlık" 4 / "duyarlılık" 3 (precision için) | `coeflib/i18n.js:20`; kılavuz `katsayi-kutuphanesi.php:10`; `stand/i18n.js:76` ↔ kılavuz `genel.php:18`; `dist/i18n.js:135, 145, 189` | precision için "duyarlık" | Minor | Orta | "Duyarlılık" sensitivity karşılığıdır. |
| X-24 | quantile matching; grouped data | "yüzdelik eşleştirme" / "eşleme"; "sınıflı/sınıflandırılmış/sınıflanmış veri" | `dist/rcode.js:180, 182`; kılavuz `cap-dagilimi.php:43` ↔ `dist/i18n.js:81, 321, 330, 365`; kılavuz `cap-dagilimi.php:19` | "yüzdelik eşleştirme"; "sınıflandırılmış (sınıflı) veri" | Minor | Yüksek | Arayüz ile R betiği arasında terim farkı. |
| X-25 | decimal separator in Turkish formulas | virgül ve nokta karışık | `dist/i18n.js:202, 212` ↔ `168, 169, 196, 227, 369`; `structure/i18n.js:44` ↔ `25, 26`; kılavuz `mescere-yapisi.php:8` ↔ `19` | Türkçe metinde formül sayılarında tek kural (ekran kuralı noktaysa nokta; değilse virgül) | Minor | Yüksek | Platform ekran sayılarında bilinçli olarak nokta kullanıyor (`core/i18n.js`); metin içi sayılar için kural belirlenmeli. |
| X-26 | güncel olmayan "sonraki aşama" anlatımları | – | `inc/site.php:61` ("Karma etkili modeller sonraki aşamada"), `64` ("Tabakalı, sistematik ve kümeli tasarımlar sonraki sürümlerde"); `hd/i18n.js:30, 66`; kılavuz `boy-cap.php:4`, `dogrusal-olmayan-regresyon.php:4`; kılavuz `agac-olcumu.php:4` (CCF "Meşcere Yapısı'na gelecek"); `stand/i18n.js:68` ("Modül 6 ile") | İlgili araca yönlendirme ("…için Karma Etkili Modeller aracını kullanın") ya da cümlenin silinmesi | Major | Yüksek | SM-03, SM-04 yayında; SI-02 vb. plandan çıkarıldı (P8). İngilizce metinlerde de aynı. |
| X-27 | yasak "uydur-" kalıntıları | 2 | `stand/ornek/ornek-veri.json:69` ("UYDURMA ÖRNEK"); `eval/ornek/README.md:2, 3` ("uydurma bir tablodur", "iki uydurma modelin") | "BENZETİM ÖRNEK…", "benzetim tablosu" | Minor | Yüksek | Proje terim kuralı. Arayüz metinlerinde "uydur-" kalmamış. |
| X-28 | "benzetim" bir cümlede iki kez | – | `sampling/i18n.js:10`; `hd/i18n.js:9` | "…üretilmiş benzetimdir (gerçek ölçüm değildir)" | Minor | Yüksek | Gereksiz yineleme. |
| X-29 | "Bias" Türkçe metinde | – | `rank/i18n.js:7, 16`; `nispi-siralama.php:7`; kılavuz `nispi-siralama.php:8`; `inc/site.php:67` | "yanlılık (Bias)" | Minor | Orta | Platform genelinde "yanlılık". |
| X-30 | "seçimlik" | – | `volume/i18n.js:19`; `hacim-denklemleri.php:7` | "isteğe bağlı" | Opsiyonel | Yüksek | Platform genelinde "isteğe bağlı". |
| X-31 | factor (çarpan) | "etken" | `core/coef-ui.js:16–17` ("kullanıcı etkeni", "Etken"); `structure/i18n.js:29` ("Tepe rekabet etkeni") | çarpan anlamında "çarpan"; adlandırılmış ölçülerde "faktör" (CCF: "tepe rekabet faktörü") | Minor | Orta | "Etken" Türkçede neden/etmen anlamı taşır. X-03'teki BEF kararıyla birlikte verilmeli. |
| X-32 | goodness-of-fit criteria | "başarı ölçütleri" ~10 / "uyum ölçütleri" 6 | `rank/i18n.js:6`; `nispi-siralama.php:9` ↔ `nlsreg/i18n.js:34`; `mixed/i18n.js:34`; `denklem-sistemleri.php:7` | Bağlama göre: veri uyumu için "uyum ölçütleri", tahmin başarısı için "başarı ölçütleri" | Opsiyonel | Orta | Anlam kayması küçük. |
| X-33 | "veya" ↔ "ya da"; "onaylı" ↔ "onaylanmış" | ya da 418 / veya 58; onaylanmış 45 / onaylı 7 | `checker/i18n.js` (çeşitli); `core/importer.js:8, 11`; `inc/home.php:13`; `inc/guide/cards.php:8`; kılavuz `is-akisi.php:5` | "ya da"; "onaylanmış" | Opsiyonel | Yüksek | Üslup birliği. |

### 4.2 Modüllere özgü önemli (Major) sorunlar

Ayrıntılar Bölüm 7'de. Özet:
- **Dil ve bilgi kayması:**
  - MS-19: "n₀ = 34.573" Türkçede otuz dört bin diye okunur.
  - MS-14: açılmamış "ÇK" kısaltması.
  - DD-05: "eğit-/eğitim verisi" makine öğrenmesi jargonu.
- **Terim seçimi:**
  - SM-07: "bağımsız değişken" burada fonksiyon argümanı anlamında kullanılmış.
  - SM-19: "iki yanlı", yanlılıkla karışıyor.
  - SM-20: bootstrap'ta "tahmin" sözcüğü üç anlamda kullanılmış.
  - SM-04: "artık" ŷ − y olarak tanımlanmış; R'daki y − ŷ ile ters.
- **Platform metinleri:**
  - PL-01, PL-02: kaynak durum etiketleri, özellikle [İ] "İncelendi" yanlış açıklanıyor.
  - PL-07, PL-08: araç listeleri eksik.
- **Hacim ve biyokütle:**
  - VB-11: odun yoğunluğunun simgesi D, göğüs çapıyla çakışıyor.
  - VB-14: "standart/yerel" yerine "çift girişli/tek girişli" hacim denklemi.

---

## 5. Dil Bilgisi ve Anlatım Sorunları

Temsilî örnekler; tam liste Bölüm 7'de "dil bilgisi" ve "açıklık" türündeki bulgulardır.

| ID | Konum | Mevcut | Önerilen | Açıklama |
|---|---|---|---|---|
| DD-06, DD-07, SM-17 | `dist/i18n.js:24, 33, 34, 70, 378, 394`; `dist/rcode.js:262`; `eqsys/i18n.js:27`; kılavuz `denklem-sistemleri.php:15` | "Bu fit etme için…", "bir fit'inin", "iki fit etme da" | "Bu fit işlemi için…", "bir fit işleminin", "iki fit işlemi de" | "Fit etme" eylem adı; sayılabilir sonuç için "fit işlemi". "da/de" ünlü uyumu. |
| DD-08 | `dist/i18n.js:54` | "En çok olabilirlik fit işlemlerini (…)" | "…fit işlemleri (…)" | Başlıkta gereksiz belirtme eki. |
| DD-09 | `dist/i18n.js:81–88` | "tahmin orta noktaları ham çap sayan bir yöntem değildir" | "tahminde sınıf orta noktaları ham çap gibi kullanılmaz" | Bozuk cümle. |
| DD-12 | `dist/rcode.js:264` | "Yeniden fit edemeyen yinelemeler" | "Yeniden fit edilemeyen tekrarlar" | Edilgen çatı. |
| DD-20 | `dist/i18n.js:317, 318` | "Katsayılar … uzaklığı en küçüklüyor" | "…en küçükleyecek biçimde tahmin edilir" | Özne–yüklem uyumsuzluğu. |
| DD-22 | `dist/i18n.js:191` | "logaritmasına doğru fit etmek" | "logaritmasına bir doğru fit etmek" | "doğru" yönelme gibi okunuyor. |
| DD-27 | `dist/i18n.js:237` | "dönüşmüş değerlerin" | "dönüştürülmüş değerlerin" | Çatı. |
| SM-11 | `mixed/i18n.js:24`; kılavuz `karma-modeller.php:14` | "yalnız sabit etkileri aynı modeller arasında" | "…sabit etkileri aynı olan modeller arasında karşılaştırılabilir" | Eksik sıfat-fiil. |
| SM-36 | `rank/i18n.js:31` | "Küçük alan iyi modeldir." | "Alanı küçük olan model daha iyidir." | Mantık düşüklüğü. |
| VB-20 | `taper/i18n.js:58`; kılavuz `govde-profili.php:22` | "En büyüklenen" | "Amaç (en büyüklenecek)" | Sıfat-fiil zamanı. |
| VB-21 | `taper/calc.js:36` | "I_i = 1 eğer x ≤ a_i" | "x ≤ a_i ise I_i = 1, değilse 0" | İngilizce söz dizimi. |
| MS-22 | `sampling/i18n.js:6` | "hipotez testi güç analizi değildir" | "hipotez testi için güç analizi değildir" | Eksik tamlama. |
| MS-36 | `structure/i18n.js:25` | "Reineke'nin 10 inç'i" | "Reineke'nin 10 inçi" | Cins isme kesme işareti konmaz. |
| PL-16 | kılavuz `rapor.php:3` | "PDF'e" | "PDF'ye" | Kısaltmaya ek, okunuşa göre. |
| PL-25 | kılavuz `pano.php:7`, `rapor.php:8`; `report/i18n.js:9` | "benzetim örnek paket" | "örnek paket (benzetim verisi)" | Eksik tamlama. |
| PL-27 | `inc/catalog.php:49` | "Ürün bölme (sortiman) eniyileme" | "…eniyilemesi" (X-12 ile birlikte "Optimum boylama") | Belirtisiz ad tamlaması. |
| PL-32 | `report/render.js:9` | "Bu rapor ${site} (${url}) Rapor Üretici ${v} ile … üretildi." | "Bu rapor, ${site} (${url}) Rapor Üretici aracının ${v} sürümüyle … üretildi." | Kopuk cümle. |
| PL-36 | `dashboard/i18n.js:29` | "Sınıf alt (cm)" | "Sınıf alt sınırı (cm)" | Eksik ad. |
| PL-41 | `record/i18n.js:25` | "…veri paketi (JSON) biçiminden bağımsız olarak eşleşir." | "…indirilmiş bir veri paketi (JSON), biçimlendirmesi ne olursa olsun eşleşir." | Belirsiz özne. |

---

## 6. Önerilen Terminoloji Sözlüğü

"Karar" sütunu: ✓ mevcut kullanım korunur; → değiştirilmesi önerilir; ? yazarın kararı gerekir (Bölüm 9.3).

### 6.1 Ölçme ve envanter

| İngilizce | Mevcut | Önerilen | Karar |
|---|---|---|---|
| diameter at breast height (dbh) | göğüs çapı, d1.30; Seksiyon Hacmi'nde "dbh" | göğüs çapı (d1,30) | → (VB-19) |
| basal area | göğüs yüzeyi (G) | göğüs yüzeyi | ✓ |
| quadratic mean diameter | kuadratik ortalama çap / kareli ortalama / ortalama göğüs yüzeyli ağacın çapı | kareli ortalama çap (Dq; ortalama göğüs yüzeyli ağacın çapı) | → (MS-25) |
| top height H0 | üst boy / baskın boy | üst boy (H0), tanımıyla | ? (X-13) |
| dominant diameter D0 | baskın çap | baskın çap | ✓ (proje kararı) |
| smallest diameter Dmin | Dmin | Dmin | ✓ (proje kararı) |
| stand density | meşcere sıklığı | meşcere sıklığı | ✓ |
| reference diameter (SDI) | dayanak çap | referans çap | → (MS-02) |
| crown competition factor | tepe rekabet etkeni | tepe rekabet faktörü | ? (X-31) |
| plot / sample plot | örnek alan | örnek alan | ✓ |
| finite population correction | sonlu popülasyon / sonlu çerçeve | sonlu popülasyon düzeltmesi | → (X-18) |
| per-hectare expansion factor | hektara çevirme katsayısı / genişletme çarpanı / hektara genişletme | hektara çevirme katsayısı | → (X-19) |
| design-based estimate | tasarıma dayalı tahmin / kestirim | X-05 kararına göre | ? |
| coefficient of variation | ÇK / CV / değişim katsayısı | değişim katsayısı (CV) | → (X-20) |
| radial increment | çap artımı (katalog) | yarıçap artımı | → (PL-28) |
| current / mean annual increment | cari (CAI), ortalama (MAI) artım | cari yıllık artım (CAI), ortalama yıllık artım (MAI) | → (MS-11) |
| inflection point (age) | dönüm yaşı / dönüm noktası / bükülme | dönüm noktası (yaşı) | → (MS-10) |
| culmination | doruk | doruk | ✓ |
| uneven-aged stand | alaşımlı, çok yaşlı | değişik yaşlı meşcere | → (DD-01) |
| whorl | çevrel / dal halkası | dal çevreli (tek terim) | → (MS-30) |

### 6.2 Bonitet ve büyüme

| İngilizce | Mevcut | Önerilen | Karar |
|---|---|---|---|
| site index | bonitet endeksi | bonitet endeksi | ✓ |
| base age | dayanak yaş | standart yaş (A₀) | → (X-02) |
| site class / site index curves | bonitet sınıfı / bonitet eğrileri | aynı | ✓ |
| anamorphic / polymorphic | anamorfik / polimorfik | aynı | ✓ |
| breast-height age / total age | göğüs yüksekliği yaşı / toplam yaş | aynı | ✓ |
| site-specific (parameter) | yere özgü | yetişme ortamına özgü | → (MS-13) |
| growth function | büyüme işlevi | büyüme işlevi / büyüme fonksiyonu | ? (MS-38, X-34) |
| logistic, monomolecular | logistik / Logistic, Monomolecular | lojistik, monomoleküler | → (X-21, X-04) |
| index | endeks (36), indeks (0) | endeks | ✓ |

### 6.3 Hacim, gövde ve ürün

| İngilizce | Mevcut | Önerilen | Karar |
|---|---|---|---|
| form factor / form quotient | biçim sayısı / biçim bölümü | şekil katsayısı / şekil bölümü | ? (X-10) |
| merchantable volume / top diameter | kullanılabilir hacim / tepe çapı | ticari hacim / ticari tepe çapı | → (X-11) |
| bucking, optimal bucking | ürün bölme | boylama, optimum boylama | → (X-12) |
| stump / stump height | dip kütük, kütük / kesim yüksekliği | dip kütük; kütük yüksekliği | → (VB-15, VB-16) |
| taper equation | gövde profili denklemi | gövde profili (gövde çapı, taper) denklemi | ? (VB-23) |
| standard / local volume equation | standart / yerel | çift girişli / tek girişli hacim denklemi | → (VB-14) |
| over / under bark | kabuklu / kabuksuz | aynı | ✓ |
| top section (cone, paraboloid, neiloid) | uç seksiyon (koni, paraboloit, neiloit) | aynı (TDK yazımı "-oit") | ✓ (MS-31: "-oid" isteğe bağlı) |
| back-transformation correction | geri dönüşüm (düzeltmesi), geri dönüş | ters dönüşüm düzeltmesi | → (X-07) |
| board foot, log rule | board foot | aynı | ✓ (proje istisnası) |

### 6.4 Biyokütle ve karbon

| İngilizce | Mevcut | Önerilen | Karar |
|---|---|---|---|
| biomass expansion factor (BEF) | dönüşüm etkeni / genişletme etkeni | biyokütle genişletme faktörü (BEF) | → / ? (X-03, "etken"/"faktör") |
| BCEF | – | biyokütle dönüşüm ve genişletme faktörü (BCEF) | → |
| root-to-shoot ratio | R (toprak altı / toprak üstü); kök oranı | kök/gövde oranı (R) | → (VB-12) |
| basic wood density | temel odun yoğunluğu D | temel odun yoğunluğu (simge D olmamalı) | → (VB-11) |
| carbon fraction | karbon oranı (CF) | aynı | ✓ |
| additivity / additive system | toplamsallık / toplamsal sistem | toplanabilirlik / toplanabilir sistem | → (X-09) |
| additive error | toplamsal / eklemeli hata | toplamsal hata | → (X-09) |
| above / below ground | toprak üstü / toprak altı | aynı | ✓ |
| SUR / NSUR | görünüşte ilişkisiz regresyon (doğrusal olmayan) | aynı | ✓ |

### 6.5 İstatistik ve modelleme

| İngilizce | Mevcut | Önerilen | Karar |
|---|---|---|---|
| fit / fitting / fitted values | fit et-, fit işlemi, fit etme, modelden hesaplanan | fit et-; sayılabilir sonuç için "fit işlemi"; fitted values "modelden hesaplanan değerler" | ✓ / → (DD-06, SM-39) |
| train / training data | eğit-, eğitim verisi | model kurma verisi; "fit et-" | ? (DD-05) |
| estimate / estimation / prediction | tahmin / kestirim | X-05 kararı | ? |
| estimator | tahminci / tahmin ilkesi | X-05 kararına göre ("tahminci" ya da "kestirici") | ? |
| residual | artık / kalıntı | artık | → (X-06) |
| residual sign | ŷ − y | ya "hata e = ŷ − y" ya da işaret uyarısıyla "artık" | ? (SM-04, X-01) |
| bias | yanlılık; "Bias" | yanlılık (işaretiyle) | → (X-01, X-29) |
| standard error | standart hata / Std. hata / SH | standart hata | → (SM-31) |
| confidence / prediction interval | güven aralığı / tahmin aralığı | aynı | ✓ |
| maximum likelihood / REML | en çok olabilirlik; REML açılmıyor | + "kısıtlı en çok olabilirlik (REML)" | → (SM-16) |
| fixed / random effect | sabit / rastgele etki | aynı | ✓ |
| mixed-effects model | karma etkili model | aynı ("karışık etkili" de kullanılır) | ✓ |
| BLUP / EBLUP | tahmin edilen rastgele etkiler; BLUP | öngörülen rastgele etkiler (EBLUP) | → (SM-09, SM-10) |
| penalized least squares | ceza terimli | cezalı (en küçük kareler) | → (SM-12) |
| variance function | varyans işlevi | aynı | ✓ |
| convergence | yakınsadı / ıraksadı | aynı | ✓ |
| identifiability / condition number | belirlenebilirlik / koşul sayısı | aynı | ✓ |
| likelihood ratio test | olabilirlik oranı testi | aynı | ✓ |
| cross-validation / fold | çapraz doğrulama / kat | aynı | ✓ |
| function argument | bağımsız değişken | argüman (girdi) | → (SM-07) |
| power model | Kuvvet / Üs | kuvvet modeli | → (X-08) |
| equivalence test / TOST | eşdeğerlik testi / TOST | aynı | ✓ |
| noncentral (F) | merkezîlik dışı | merkezî olmayan | → (SM-22) |
| two-sided | iki yanlı | iki yönlü | → (SM-19) |
| test size α | test büyüklüğü | anlamlılık düzeyi α | → (SM-23) |
| bootstrap replicate | tekrar / yineleme | tekrar | → (X-15) |
| with replacement | iadeli / yerine koyarak | iadeli (yerine koyarak) | → (DD-10) |
| seed | Seed / tohum | tohum | → (X-17) |
| BCa | yanlılık düzeltmeli ve ivmeli | yanlılığı düzeltilmiş ve hızlandırılmış (BCa) | ? (SM-25) |
| p-value | p değeri / p-değeri | p değeri | → (X-16) |
| real numbers | reel / gerçek sayılar | gerçel sayılar | → (DD-16) |
| plotting position | konum | çizim konumu | → (DD-21) |
| approximation | yaklaşım | yaklaştırma, yaklaşık değer | → (DD-23) |
| correlation coefficient | ilişki katsayısı | korelasyon katsayısı | → (SM-26) |
| percentile / quantile | yüzdelik | yüzdelik | ✓ |
| function / işlev | işlev 43 / fonksiyon 10 | araç adlarında ve genel metinde tek tercih; "amaç fonksiyonu" gibi yerleşik birleşikler korunabilir | ? (X-34) |
| relative | nispi / bağıl / göreli | X-14 | ? |

### 6.6 Platform

| İngilizce | Mevcut | Önerilen | Karar |
|---|---|---|---|
| approved data | onaylanmış / onaylı | onaylanmış veri | → (X-33) |
| column mapping | sütun eşleme | aynı | ✓ |
| run record / seal / fingerprint | çalışma kaydı / mühür / parmak izi | aynı; "tutuyor" yerine "uyuşuyor" | ✓ / → (PL-40) |
| build id | derleme kimliği / commit | "commit" (tek terim) | → (PL-40) |
| coefficient set | katsayı seti | aynı | ✓ |
| deactivate | Etkinliği kaldır | Etkin paketi bırak | → (PL-39) |
| scatter plot | saçılma | saçılım grafiği | → (PL-26) |
| frequency (histogram) | sıklık | frekans / ağaç sayısı | ? (PL-46) |
| kind | Tür | bağlama göre "tip", "sorun türü", "nitelik" | → (X-22) |
| filter | süzgeç 31 / filtre 1 | süzgeç | → (DD-25) |

---

## 7. Modül Bazında Bulgular

Kesişen bulgular (X-…) burada yinelenmez; ilgili modüller Bölüm 4'teki konumlarda listelenmiştir. Kısaltmalar: Önem K = Kritik, M = Major, m = Minor, O = Opsiyonel; Güven Y = Yüksek, O = Orta, D = Düşük. "Kaynak" sütunu boşsa değerlendirme editoryaldir.

### 7.1 Çap Dağılımı (DD)

| ID | Dosya / Konum | Mevcut Türkçe | İngilizce | Önerilen Türkçe | Tür | Önem | Güven | Açıklama |
|---|---|---|---|---|---|---|---|---|
| DD-01 | `dist/i18n.js:192` | alaşımlı, çok yaşlı | uneven-aged | değişik yaşlı | terminoloji | K | Y | Bkz. Bölüm 3. |
| DD-02 | `dist/i18n.js:276`; `dist/rcode-stand.js:154` | hata orijinal ölçekte eklemeli / özgün ölçekte toplamsal | additive error on the original scale | hata özgün ölçekte toplamsal | tutarlılık | M | Y | X-09. |
| DD-03 | `dist/i18n.js:278, 290 (×2)`; kılavuz `cap-dagilimi.php:37` | geri dönüş | back-transformation | ters dönüşüm | terminoloji | M | Y | X-07. |
| DD-04 | `dist/i18n.js:25, 36, 402`; kılavuz `:27` | Seed | seed | tohum | çeviri/tutarlılık | M | Y | X-17. |
| DD-05 | `dist/i18n.js:130, 274–280, 291, 294, 302, 303, 305, 309, 314`; `dist/rcode-stand.js:154, 168, 170, 179`; kılavuz `:9, 33, 40, 43` (temsilî; `tr`'de 22 geçiş) | Model eğit, Eğitim verisi, Eğitim aralığı | train, training data | Modeli fit et / Model kur; model kurma verisi; veri aralığı | terminoloji | M | O | Makine öğrenmesi jargonu; regresyon yazınında "model kurma/geliştirme verisi" ve "doğrulama verisi". Yazarın kararı gerekir. |
| DD-06 | `dist/i18n.js:24, 33, 34, 70, 378, 394` | fit etme (sayılabilir ad) | the fit | fit işlemi | dil bilgisi | m | Y | Aynı dosyada 9 kez "fit işlemi" var. |
| DD-07 | `dist/i18n.js:131`; `dist/rcode.js:262` | bu fit'in, bir fit'inin | this fit | bu fit işleminin | dil bilgisi | m | O | |
| DD-08 | `dist/i18n.js:54` | fit işlemlerini (başlık) | ML fits | fit işlemleri | dil bilgisi | m | Y | |
| DD-09 | `dist/i18n.js:81–88` | tahmin orta noktaları ham çap sayan bir yöntem değildir | – | tahminde sınıf orta noktaları ham çap gibi kullanılmaz | açıklık | m | Y | |
| DD-10 | `dist/i18n.js:30` ↔ `dist/rcode.js:264` | iadeli ↔ yerine koyarak | with replacement | iadeli (yerine koyarak) | tutarlılık | m | Y | |
| DD-11 | `dist/i18n.js:131`; `dist/rcode.js:264`; kılavuz `:43` | yineleme (bootstrap) | replicate | tekrar | tutarlılık | m | Y | X-15. |
| DD-12 | `dist/rcode.js:264` | fit edemeyen yinelemeler | – | fit edilemeyen tekrarlar | dil bilgisi | m | Y | |
| DD-13 | `dist/i18n.js:131`; `dist/rcode.js:182, 276`; kılavuz `:43` | p-değerleri | p-values | p değerleri | tutarlılık | m | Y | X-16. |
| DD-14 | `dist/i18n.js:312, 314`; kılavuz `:37 (×2)` | Modified CDFR | Modified CDFR | Değiştirilmiş CDFR | çeviri | m | Y | R betiği zaten "Değiştirilmiş". |
| DD-15 | `dist/rcode.js:180, 182`; kılavuz `:43` | ağırlıklı yüzdelik eşleme; sınıflanmış veri | – | yüzdelik eşleştirme; sınıflandırılmış veri | tutarlılık | m | Y | X-24. |
| DD-16 | `dist/i18n.js:210, 213, 405`; kılavuz `:19` ↔ `:261` | reel sayılar ↔ gerçek sayılar | real numbers | gerçel sayılar | tutarlılık | m | O | |
| DD-17 | `dist/i18n.js:154 (×5)` ↔ `:351` | hibrid ↔ hibrit | hybrid | hibrit | yazım | m | Y | |
| DD-18 | `dist/i18n.js:169 (×2), 185, 287` | politikası | policy | kuralı / yaklaşımı | çeviri | m | Y | `rcode-rec.js:79` "kaynağın kuralı" diyor. |
| DD-19 | `dist/i18n.js:316` | kestirildi | estimated | tahmin edildi (X-05'e göre) | tutarlılık | m | Y | Dosyada 75 "tahmin", 1 "kestir-". |
| DD-20 | `dist/i18n.js:317, 318` | en küçüklüyor | minimising | en küçükleyecek biçimde tahmin edilir | dil bilgisi | m | Y | |
| DD-21 | `dist/i18n.js:46, 317` | Konum (i − 0.5)/n | plotting position | çizim konumu | terminoloji | m | O | "Konum" ayrıca konum parametresi a. |
| DD-22 | `dist/i18n.js:191` | logaritmasına doğru fit etmek | fit a straight line | bir doğru fit etmek | açıklık | m | Y | |
| DD-23 | `dist/i18n.js:222, 324` | yaklaşım | approximation | yaklaştırma / yaklaşık değer | açıklık | m | O | |
| DD-24 | `dist/i18n.js:194, 197, 365`; `dist/rcode.js:180` | Log-momentler / log-moment / log momentleri | log-moments | log-momentler | tutarlılık | m | Y | |
| DD-25 | `dist/i18n.js:397` ↔ `:13, 137` | filtreyi ↔ Süzgeç | filter | süzgeç | tutarlılık | m | Y | |
| DD-26 | `dist/i18n.js:202, 212` ↔ `:168, 169, 196, 227, 369` | 0,01 ↔ 0.5 | – | tek ondalık ayırıcı | tutarlılık | m | Y | X-25. |
| DD-27 | `dist/i18n.js:237` | dönüşmüş değerler | transformed values | dönüştürülmüş değerler | dil bilgisi | m | Y | |
| DD-28 | `dist/i18n.js:296` | bağımsız başarı için | independent performance | bağımsız verideki başarım için | açıklık | m | O | |
| DD-29 | kılavuz `cap-dagilimi.php:43` (EN'de de) | (Parametreler sekmesi) | (Parameters tab) | (Sonuçlar sekmesi) | tutarlılık | m | O | `tab.params` = "Sonuçlar" (`dist/i18n.js:374`). |
| DD-30 | `dist/i18n.js:35, 61, 75`; kılavuz `:15` | Kayıt dışı | unrecorded | Kaydedilmedi | terminoloji | O | O | "Kayıt dışı ekonomi" çağrışımı; R betiği "kaydedilmedi" diyor. |
| DD-31 | `dist/i18n.js:40` ↔ `:409` | Büyüklük ↔ İstatistik / nicelik | Quantity | tek terim | tutarlılık | O | O | |
| DD-32 | `dist/i18n.js:282`; kılavuz `:33` | baskın ve ortak baskın ağaçlar | dominant and codominant | hâkim ve ortak hâkim (Kraft 1–2) | terminoloji | O | D | X-13. |

### 7.2 Ağaç Ölçümü, Örnek Alan ve Meşcere, Meşcere Yapısı, Örnekleme, Bonitet, Büyüme İşlevi (MS)

| ID | Dosya / Konum | Mevcut Türkçe | İngilizce | Önerilen Türkçe | Tür | Önem | Güven | Açıklama |
|---|---|---|---|---|---|---|---|---|
| MS-01 | Bonitet (bkz. X-02) | dayanak yaş | base age | standart yaş | terminoloji | M | Y | X-02. |
| MS-02 | `structure/i18n.js:25`; kılavuz `mescere-yapisi.php:8` | Dayanak çap | reference diameter | Referans çap (D_ref) | terminoloji | m | O | Yaşla ilgisi yok. |
| MS-03 | `stand/i18n.js:98–99` | İngilizce tanımlar `tr` içinde | – | `en`'e taşınmalı | program hatası | K | Y | Bölüm 3. |
| MS-04 | Örnek Alan ↔ Bonitet (bkz. X-13) | Baskın boy ↔ Üst boy | dominant / top height | üst boy (H0) | tutarlılık | M | Y | X-13. |
| MS-05 | `siteindex/i18n.js:12` | en uzun 100 ağacın ortalama boyu (platformun H0'ı) | – | "… (H0, boya göre seçim; Assmann tanımından farklıdır)" | açıklık | m | O | |
| MS-06 | `structure/calc.js:138–140` | yalnız İngilizce tanımlar | – | TR/EN | çeviri | K | Y | X-04. |
| MS-07 | `growth/calc.js:41, 47` | Logistic, Monomolecular | – | Lojistik, Monomoleküler | çeviri | K | Y | X-04. |
| MS-08 | `buyume-islevi.php:7, 9`; kılavuz `:3`; `inc/site.php:83` | logistik | logistic | lojistik | yazım | m | Y | X-21. |
| MS-09 | `growth/i18n.js:17` ↔ `siteindex/i18n.js:41` | Yanlılık = gözlenen − tahmin | bias | tek işaret | tutarlılık | K | Y | X-01. |
| MS-10 | `growth/i18n.js:15`; kılavuz `buyume-islevi.php:12, 14`; `buyume-islevi.php:7, 9` | dönüm yaşı / dönüm noktası / bükülme | inflection point/age | dönüm noktası (yaşı) | tutarlılık | m | Y | |
| MS-11 | `growth/i18n.js:15, 18` | MAI doruk yaşı; Cari (CAI) ve ortalama (MAI) artım | – | cari yıllık artım, ortalama yıllık artımın doruk yaşı | terminoloji | m | O | `growth/rcode.js:33` doğru biçimi kullanıyor. |
| MS-12 | `siteindex/i18n.js:43` | Tahmin edilen yaş A₂ | predicted age | Hedef yaş A₂ (boyun tahmin edildiği yaş) | açıklık | m | O | EN'de de aynı. |
| MS-13 | `siteindex/calc.js:26, 35, 45` | b₀ yere özgü | site-specific | yetişme ortamına özgü | terminoloji | m | O | |
| MS-14 | `structure/i18n.js:47`; `mescere-yapisi.php:7`; kılavuz `:15` | ÇK | CV | değişim katsayısı (CV) | tutarlılık | M | Y | X-20. |
| MS-15 | `structure/i18n.js:44, 49`; kılavuz `:15, 19`; `mescere-yapisi.php:7, 9` | W, M, T, T1, U (yalnız harf) | uniform angle index, mingling, diameter differentiation, dominance | ilk geçişte adlarıyla | açıklık | m | O | |
| MS-16 | `structure/i18n.js:47` | Basıklık (fazlalık) | excess kurtosis | Fazla basıklık (basıklık − 3) | dil bilgisi | m | O | |
| MS-17 | `structure/i18n.js:29`; kılavuzlar | Tepe rekabet etkeni (CCF) | crown competition factor | Tepe rekabet faktörü | terminoloji | O | D | X-31. |
| MS-18 | `structure/i18n.js:44` ↔ `:25, 26` | 0,3048 ↔ 25.4 | – | tek ayırıcı | tutarlılık | m | Y | X-25. |
| MS-19 | kılavuz `ornekleme.php:13` | n₀ = 34.573 | 34.573 | n₀ = 34,57 | açıklık | M | Y | Türkçede otuz dört bin diye okunur; "35 örnek alan" ile çelişir. |
| MS-20 | `inc/site.php:64`; `ornekleme.php:9` | sonlu çerçeve düzeltmesi | finite population correction | sonlu popülasyon düzeltmesi | tutarlılık | M | Y | X-18. |
| MS-21 | `sampling/i18n.js:10` | benzetimdir (benzetim; …) | – | benzetimdir (gerçek ölçüm değildir) | dil bilgisi | m | Y | X-28. |
| MS-22 | `sampling/i18n.js:6` | hipotez testi güç analizi | – | hipotez testi için güç analizi | dil bilgisi | m | Y | |
| MS-23 | `stand/ornek/ornek-veri.json:69` | UYDURMA ÖRNEK | synthetic sample | BENZETİM ÖRNEK | terminoloji | m | Y | X-27. |
| MS-24 | kılavuz `ornek-alan.php:23` ↔ `stand/i18n.js:49` | genişletme çarpanı ↔ hektara çevirme katsayısı | expansion factor | hektara çevirme katsayısı | tutarlılık | m | Y | X-19. |
| MS-25 | `stand/i18n.js:116`; `ornek-alan.php:7`; kılavuz `:3` ↔ `tree/i18n.js:78`; kılavuz `agac-olcumu.php:28` | Kuadratik ortalama çap ↔ kareli ortalama | quadratic mean | kareli ortalama çap (Dq) | tutarlılık | m | O | |
| MS-26 | `stand/i18n.js:66`; sayfa ↔ `inc/home.php:16`; `inc/catalog.php:69` | tahmin ↔ kestirim | estimate | X-05 | tutarlılık | m | O | |
| MS-27 | `stand/i18n.js:67` | sd (df) | df | s.d. ya da serbestlik derecesi | açıklık | O | O | "sd" standart sapma gibi okunur; VB-27 ile aynı. |
| MS-28 | `stand/i18n.js:68` | (… Modül 6 ile) | – | kaldırılmalı ya da araç adı | açıklık | m | O | X-26. |
| MS-29 | `tree/i18n.js:34` | Tür (f.kind) | Kind | Şekil katsayısı türü | açıklık | m | Y | X-22. |
| MS-30 | `tree/i18n.js:83` | çevrel … dal halkası | whorl | tek terim | tutarlılık | m | Y | |
| MS-31 | `tree/i18n.js:39, 85, 87`; kılavuz `agac-olcumu.php:30` | paraboloit, neiloit | paraboloid, neiloid | (isteğe bağlı) paraboloid, neiloid | terminoloji | O | D | TDK "-oit" yazar; mevcut biçim yanlış değil. |
| MS-32 | kılavuz `agac-olcumu.php:37` | üç ana parayla | three principals | üç esasa göre (geçmiş değer, şimdiki değer, ortalama/Pressler) | çeviri | m | Y | "Ana para" finans terimi. |
| MS-33 | kılavuz `agac-olcumu.php:4` | CCF … Meşcere Yapısı'na gelecek | – | CCF Meşcere Yapısı aracındadır | açıklık | m | Y | X-26. |
| MS-34 | kılavuz `agac-olcumu.php:3` | Forest Mensuration van Laar | – | virgül | dil bilgisi | m | Y | |
| MS-35 | `tree/i18n.js:19` | boy kadar, az değil çok | – | boy kadar; daha az değil, daha çok | dil bilgisi | O | O | |
| MS-36 | `structure/i18n.js:25` | 10 inç'i | – | 10 inçi | dil bilgisi | m | Y | |
| MS-37 | `siteindex/i18n.js:20` | I en yüksek bonitet | best site | I en iyi bonitet | açıklık | O | O | |
| MS-38 | `buyume-islevi.php:5–9`; `inc/site.php:82–83`; `inc/catalog.php:65`; kılavuz | Büyüme İşlevi | growth function | büyüme fonksiyonu (?) | terminoloji | O | D | X-34; bilinçli Türkçeleştirme olabilir. |

### 7.3 Seksiyon Hacmi, Gövde Profili, Hacim Denklemleri, Tomruk Ölçümü, Biyokütle ve Karbon (VB)

| ID | Dosya / Konum | Mevcut Türkçe | İngilizce | Önerilen Türkçe | Tür | Önem | Güven | Açıklama |
|---|---|---|---|---|---|---|---|---|
| VB-01 | `biomass/i18n.js:6, 26, 29, 72–77, 82, 90`; kılavuz `biyokutle-karbon.php:3, 4, 11, 19` | genişletme etkeni, Etkenler | expansion factors | biyokütle genişletme faktörü (BEF), faktörler | terminoloji | M | Y | X-03. |
| VB-02 | `biomass/i18n.js:42, 50, 51, 53`; kılavuz `:4, 9, 10` | toplamsal bileşen sistemi, toplamsallık kısıtı | additive system, additivity | toplanabilir sistem, toplanabilirlik kısıtı | tutarlılık | M | Y | X-09. |
| VB-03 | `volume/i18n.js:22`; `volume/rcode.js:29`; `taper/i18n.js:23, 28`; `biomass/i18n.js:50` | yanlılık işaretleri farklı | bias | tek işaret | tutarlılık | K | Y | X-01. |
| VB-04 | `taper/i18n.js:55, 58, 62, 66, 68`; kılavuz; `catalog.php:49` | Ürün bölme | bucking | Boylama | terminoloji | M | O–Y | X-12. |
| VB-05 | `secvol/i18n.js:48`; `volume/i18n.js:17`; sayfalar; kılavuzlar | Biçim sayısı f1.3 | form factor | şekil katsayısı f1,30 | terminoloji | M | O | X-10. |
| VB-06 | `secvol/i18n.js:81`; kılavuz `seksiyon-hacmi.php:17` | gerçek biçim bölümleri, gerçek silindirik biçim sayısı | true form quotients, true form factor | gerçek şekil bölümleri, gerçek şekil katsayısı | terminoloji | m | O | X-10. |
| VB-07 | `secvol/i18n.js:29, 48, 64, 79`; `taper/i18n.js:35, 41, 45, 47, 52, 70`; sayfalar; kılavuzlar; `catalog.php:46` ↔ `biomass/i18n.js:74` | Kullanılabilir hacim / ticari gövde | merchantable | ticari hacim | terminoloji | M | O | X-11. |
| VB-08 | `volume/i18n.js:18, 19, 30`; `taper/i18n.js:19, 26`; `biomass/i18n.js:28, 59, 61`; sayfa; kılavuz | Geri dönüşüm | back-transformation | ters dönüşüm | çeviri | m | O | X-07. |
| VB-09 | `volume/i18n.js:18, 23, 25, 26`; `biomass/i18n.js:44, 46, 49, 54, 64`; kılavuz `hacim-denklemleri.php:13` ↔ `:16`; `volume/rcode.js:52` | kestir- / tahmin; "Tahmin" (katsayı) ↔ "Tahmin V" | estimate / predicted | X-05; sütunlarda "Katsayı tahmini" ve "Tahmin edilen V" | tutarlılık | m | Y | X-05. |
| VB-10 | `volume/rcode.js:29` | kalıntı standart hatası | residual standard error | artık standart hatası | tutarlılık | m | Y | X-06. |
| VB-11 | `biomass/i18n.js:18, 72, 73`; kılavuz `:11` | V · D · BEF; Temel odun yoğunluğu D | basic wood density D | WD ya da ρ; ya da "D (odun yoğunluğu; göğüs çapı değil)" | açıklık | M | Y | Aynı araçta D göğüs çapı da (B = a·D^b). |
| VB-12 | `biomass/i18n.js:73`; kılavuz `:3, 11` | R, toprak altı / toprak üstü ↔ kök oranı | root-to-shoot ratio | kök/gövde oranı (R) | terminoloji | m | O | |
| VB-13 | `biyokutle-karbon.php:6` | dönüşüm etkenleri | expansion factors | biyokütle genişletme faktörleri | çeviri | K | Y | X-03. |
| VB-14 | `volume/i18n.js:16, 17`; `hacim-denklemleri.php:7, 9`; kılavuz `:3, 12` | standart ve yerel hacim denklemleri | standard / local | çift girişli (standart) ve tek girişli (yerel) | terminoloji | m | O | |
| VB-15 | `secvol/i18n.js:7, 17`; `taper/i18n.js:16, 44, 46`; kılavuzlar | Kesim yüksekliği | stump height | Kütük yüksekliği (kesim yüksekliği) | terminoloji | O | D–O | |
| VB-16 | `secvol/i18n.js:50, 54` | kütük ↔ dip kütük | stump | dip kütük | tutarlılık | O | Y | |
| VB-17 | `secvol/i18n.js:30`; sayfa; kılavuz ↔ `biomass/i18n.js:84` | Hektara genişletme ↔ Hektara çevirme | per hectare | Hektara çevirme | tutarlılık | m | Y | X-19. |
| VB-18 | `secvol/i18n.js:15` | alanların ortalaması √((d1² + d2²)/2) | mean of the areas | kesit alanlarının ortalamasına karşılık gelen çap (karesel ortalama) | açıklık | m | O | Sonuç alan değil çap. |
| VB-19 | `secvol/i18n.js:8, 16, 17, 32, 35–38, 71`; kılavuz `:7, 8, 13, 19` | dbh | dbh | göğüs çapı (d1,30) | tutarlılık | m | Y | |
| VB-20 | `taper/i18n.js:58`; kılavuz `:22` | En büyüklenen | Maximise | Amaç (en büyüklenecek) | dil bilgisi | m | O | |
| VB-21 | `taper/calc.js:36` | I_i = 1 eğer x ≤ a_i | – | x ≤ a_i ise I_i = 1, değilse 0 | dil bilgisi | m | Y | |
| VB-22 | kılavuz `biyokutle-karbon.php:10` | ortalama güven aralığı ile yeni ağaç tahmin aralığı | – | ortalama için güven aralığı ile yeni bir ağaç için tahmin aralığı | açıklık | m | Y | |
| VB-23 | `govde-profili.php:5, 6`; `catalog.php:45` | Gövde Profili | Stem taper | Gövde Profili (gövde çapı / taper denklemleri) | terminoloji | O | O | Web aramasında "gövde çapı denklemleri" kullanımı görüldü; tam metin okunmadı. |
| VB-24 | `seksiyon-hacmi.php:5`; kılavuz `:2` ↔ `catalog.php:44` | Seksiyon Hacmi Hesaplayıcısı / Seksiyon Hacmi | – | Seksiyon Hacmi | tutarlılık | O | Y | |
| VB-25 | kılavuz `hacim-denklemleri.php:15` | (geçerlilik aralığı örneğin D ve H aralığı) | – | (geçerlilik aralığı, ör. D ve H aralığı, setle birlikte kaydedilir) | açıklık | m | O | Eksik yüklem. |
| VB-26 | `biomass/i18n.js:34` | örnek yüzdelik tipi 7 | sample quantile type 7 | örneklem yüzdeliği, tip 7 (Hyndman–Fan) | çeviri | m | O | |
| VB-27 | `biomass/i18n.js:56, 61` ↔ `:38` | sd (df) ↔ SS (std. sapma) | df | s.d. / serb. der. | açıklık | O | O | MS-27 ile aynı. |
| VB-28 | `taper/i18n.js:9` | Katsayı setine ulaşma yolu | How to get a coefficient set | Katsayı setinin kaynağı | açıklık | O | O | |
| VB-29 | kılavuz `tomruk-olcumu.php:4` | kusur düşümü | defect deduction | kusur indirimi | dil | O | D | |
| VB-30 | `volume/i18n.js:19`; `hacim-denklemleri.php:7` | seçimlik | optional | isteğe bağlı | tutarlılık | O | Y | X-30. |

### 7.4 Boy–Çap, Doğrusal Olmayan Regresyon, Karma Etkili Modeller, Denklem Sistemleri, Model Başarısı, Nispi Sıralama (SM)

| ID | Dosya / Konum | Mevcut Türkçe | İngilizce | Önerilen Türkçe | Tür | Önem | Güven | Açıklama |
|---|---|---|---|---|---|---|---|---|
| SM-01 | `hd/i18n.js:27, 37`; `nlsreg/i18n.js:30`; `mixed/i18n.js:28`; `eqsys/i18n.js:23`; `eval/i18n.js:78` | Tahmin (parametre sütunu ve tahmin sekmesi) | Estimate / Prediction | X-05 | tutarlılık | M | Y | X-05. |
| SM-02 | `mixed/i18n.js:14, 23, 28`; `eqsys/i18n.js:16, 23`; `nlsreg/i18n.js:17, 25` ↔ `nlsreg/rcode.js:47, 97` | Kestirim ↔ Tahmin | estimation / estimate | X-05 | tutarlılık | M | Y | X-05. |
| SM-03 | `eqsys/i18n.js:16–41`; `eqsys/rcode.js:24, 39, 60`; `hd/rcode.js:32`; `nlsreg/rcode.js:47`; `eval/i18n.js:29`; kılavuz `denklem-sistemleri.php:10, 14, 18` | kalıntı | residual | artık | tutarlılık | M | Y | X-06. |
| SM-04 | `hd/i18n.js:60, 61, 82`; `nlsreg/i18n.js:32`; `eval/i18n.js:43` | artık e = tahmin − gözlenen | residual | "hata e = tahmin − ölçülen" ya da işaret uyarılı "artık" | terminoloji | M | O | Ders kitapları ve R `residuals()` y − ŷ. X-01 ile birlikte karara bağlanmalı. |
| SM-05 | `hd/i18n.js:30, 66`; kılavuz `boy-cap.php:4`, `dogrusal-olmayan-regresyon.php:4` | karma etkili modeller sonraki aşamadadır; Biyokütle aracındaki toplamsal sistem | – | Karma Etkili Modeller / Denklem Sistemleri aracını kullanın | açıklık | M | Y | X-26. |
| SM-06 | `nlsreg/i18n.js:12`; kılavuz; sayfa ↔ `hd/i18n.js:33–34` | Üs ↔ Kuvvet | power | Kuvvet | tutarlılık | M | Y | X-08. |
| SM-07 | `nlsreg/i18n.js:22`; `mixed/i18n.js:21`; `eqsys/i18n.js:20` | işlevler tek bağımsız değişken alır | one argument | tek argüman (girdi) alır | terminoloji | M | Y | Regresyonda "bağımsız değişken" açıklayıcı değişkendir. |
| SM-08 | `mixed/i18n.js:13` | Tür (m.kind) | Type | Model türü | açıklık | m | Y | X-22. |
| SM-09 | `mixed/i18n.js:30, 32`; kılavuz `karma-modeller.php:17` | rastgele etkiler tahmin edilir | predicted | rastgele etkiler öngörülür; "Öngörülen rastgele etkiler (BLUP)" | terminoloji | m | O | Aynı kart "öngörü (BLUP)" diyor. |
| SM-10 | `mixed/i18n.js:32` | en iyi doğrusal yansız öngörüdür (BLUP) | BLUP | … deneysel BLUP (EBLUP) | bilimsel kesinlik | m | O | D ve σ veriden tahmin ediliyor. EN'de de aynı. |
| SM-11 | `mixed/i18n.js:24`; kılavuz `:14` | sabit etkileri aynı modeller | – | sabit etkileri aynı olan modeller | dil bilgisi | m | Y | |
| SM-12 | `mixed/i18n.js:26` | ceza terimli doğrusal olmayan adım | penalized nonlinear step | cezalı doğrusal olmayan en küçük kareler (PNLS) adımı | terminoloji | m | O | `mixed/rcode.js:128` "cezalı" diyor. |
| SM-13 | `mixed/i18n.js:32` | (sabit etkiler sabit; araç kuralı) | – | (sabit etkiler değiştirilmez; …) | açıklık | m | Y | |
| SM-14 | `mixed/rcode.js:25, 90` | ML göreli kesinliğinde durur | relative precision | ML için kullanılan göreli yakınsama toleransında durur | açıklık | m | O | |
| SM-15 | `mixed/rcode.js:83` | havuzlanmış doğrusal olmayan EKK | – | … en küçük kareler | tutarlılık | O | Y | |
| SM-16 | `mixed/i18n.js:14`; kılavuz `:10` | ML / REML açılımsız | ML/REML | ML (en çok olabilirlik) / REML (kısıtlı en çok olabilirlik) | açıklık | O | Y | |
| SM-17 | kılavuz `denklem-sistemleri.php:15`; `eqsys/i18n.js:27` | iki fit etme da | both fits | iki fit işlemi de | dil bilgisi | m | Y | |
| SM-18 | `eqsys/i18n.js:30`; kılavuz `:15` | farklı en büyük olabilirliklere gidiyor; tek bir en büyük bulunamadı | different maxima | farklı yerel en büyük değerlere yakınsıyor; tek bir küresel en büyük bulunamadı | açıklık | m | O | |
| SM-19 | `eval/i18n.js:63` | iki yanlı değeri | two-sided | iki yönlü (çift kuyruklu) | terminoloji | M | Y | "Yanlı" bu araçta bias anlamında. |
| SM-20 | `eval/i18n.js:78, 81, 82`; kılavuz `model-degerlendirme.php:16` | bootstrap tahminleri, tahminden küçük | estimate / replicates | örneklem değeri (θ̂), bootstrap kopyaları (θ*) | açıklık | M | Y | "Tahmin" burada ŷ ile karışıyor. |
| SM-21 | `eval/i18n.js:21` | Tahmin yapılmadı | No guess was made | Otomatik algılama yapılmadı | açıklık | m | Y | |
| SM-22 | `eval/i18n.js:68` | merkezîlik dışı parametresi | noncentrality parameter | merkezî olmayan F dağılımı, merkezîlik parametresi ψ² | terminoloji | m | O | |
| SM-23 | `eval/i18n.js:61`; kılavuz `:15` | Test büyüklüğü α | test size α | Anlamlılık düzeyi α | terminoloji | m | O | |
| SM-24 | `eval/i18n.js:76, 82`; kılavuz `:16` | Yineleme sayısı B | replications | Tekrar sayısı B | tutarlılık | m | O | X-15. |
| SM-25 | `eval/i18n.js:75` | yanlılık düzeltmeli ve ivmeli | bias-corrected and accelerated | yanlılığı düzeltilmiş ve hızlandırılmış | terminoloji | O | D | |
| SM-26 | kılavuz `model-degerlendirme.php:3` | ilişki katsayısının karesi | correlation coefficient | korelasyon katsayısının karesi | terminoloji | m | Y | |
| SM-27 | `eval/i18n.js:59` | yük modeldedir | burden of proof | ispat yükü modeldedir | açıklık | m | Y | |
| SM-28 | `eval/i18n.js:25, 49`; kılavuz `:13, 14, 25`; rank; `mixed/rcode.js` | bağıl / nispi / göreli | relative | X-14 | tutarlılık | O | Y | X-14. |
| SM-29 | `core/coef-ui.js:16` | Geri dönüşüm düzeltmesi | back-transformation correction | Ters dönüşüm düzeltmesi | terminoloji | M | Y | X-07. |
| SM-30 | `core/coef-ui.js:16–17` | kullanıcı etkeni, Etken | user factor | kullanıcı çarpanı, Çarpan | terminoloji | m | O | X-31. |
| SM-31 | `nlsreg/i18n.js:30`; `hd/i18n.js:37` | b ± t·SH; Std. hata | SE | standart hata | tutarlılık | O | Y | |
| SM-32 | `eqsys/i18n.js:28, 31, 32`; kılavuz `:15` ↔ `mixed/i18n.js:25` | p-değeri ↔ p değeri | p-value | p değeri | tutarlılık | O | Y | X-16. |
| SM-33 | `rank/i18n.js:20` | Eş. 10 | Eq. 10 | Denklem 10 | tutarlılık | O | Y | |
| SM-34 | `rank/i18n.js:23`; kılavuz `nispi-siralama.php:14` | tahmin R² | prediction R² | R² (1 − SSE/SST) | açıklık | m | O | PRESS tabanlı "tahmin R²" ile karışabilir. |
| SM-35 | `rank/i18n.js:7, 16`; sayfa; kılavuz `:8` | Bias | Bias | Yanlılık (Bias) | açıklık | m | O | X-29. |
| SM-36 | `rank/i18n.js:31` | Küçük alan iyi modeldir. | – | Alanı küçük olan model daha iyidir. | dil bilgisi | m | Y | |
| SM-37 | `rank/i18n.js:6`; sayfa ↔ `nlsreg/i18n.js:34`; `mixed/i18n.js:34`; `denklem-sistemleri.php:7` | başarı ölçütleri ↔ uyum ölçütleri | – | X-32 | tutarlılık | O | O | X-32. |
| SM-38 | `hd/i18n.js:45` | a ile b arasındaki tahmin korelasyonu | correlation between estimates | a ile b parametre tahminleri arasındaki korelasyon | açıklık | m | Y | |
| SM-39 | `hd/i18n.js:60, 61` | Tahmin edilen boy (fitted) | fitted | Modelden hesaplanan boy | terminoloji | O | O | Proje terim kuralı (fitted values). |
| SM-40 | `hd/i18n.js:9` | benzetimdir (benzetim; …) | – | benzetimdir (gerçek ölçüm değildir) | dil bilgisi | m | Y | X-28. |
| SM-41 | `nlsreg/rcode.js:59` | aynı ağaçlarda | same trees | aynı satırlarda (gözlemlerde) | açıklık | m | Y | Genel amaçlı araç. |
| SM-42 | `nlsreg/rcode.js:57`; `mixed/rcode.js:41`; `eqsys/rcode.js:34` | yanıt | response | bağımlı değişken | tutarlılık | O | O | |
| SM-43 | `hd/rcode.js:32` ↔ `hd/i18n.js:47` | gözlem ↔ ölçülen ↔ gözlenen | observed | araç içinde tek terim | tutarlılık | O | O | |
| SM-44 | `eval/ornek/README.md:2, 3` | uydurma | – | benzetim | terminoloji | m | Y | X-27. |
| SM-45 | `eval/i18n.js:68` | eşdeğerlik der | declares | eşdeğerliğe karar verilir | dil bilgisi | O | Y | |

### 7.5 Platform kabuğu ve veri altyapısı (PL)

| ID | Dosya / Konum | Mevcut Türkçe | İngilizce | Önerilen Türkçe | Tür | Önem | Güven | Açıklama |
|---|---|---|---|---|---|---|---|---|
| PL-01 | `kaynakca.php:57` | 'İ' => 'İncelendi' | Reviewed | künye doğrulandı | terminoloji | M | Y | `docs/METHODS.md:5`: [İ] = ikincil bir kaynağın kaynakçasında künyesi doğrulandı. "İncelendi" okunduğu izlenimi veriyor. |
| PL-02 | `kaynakca.php:57` ↔ `report/render.js:22` | iki ayrı etiket açıklaması | – | METHODS:4–8'e göre tek etiket sözlüğü | tutarlılık | M | Y | |
| PL-03 | `inc/catalog.php:15, 52`; `biyokutle-karbon.php:6` | dönüşüm etkeni (BEF) | BEF | genişletme faktörü | terminoloji | K | Y | X-03. |
| PL-04 | `inc/site.php:64`; `ornekleme.php:9` | sonlu çerçeve düzeltmesi | – | sonlu popülasyon düzeltmesi | tutarlılık | M | Y | X-18. |
| PL-05 | `inc/site.php:61` | Karma etkili modeller sonraki aşamada. | – | … Karma Etkili Modeller aracını kullanın. | açıklık | M | Y | X-26. |
| PL-06 | `inc/site.php:64` | Tabakalı, sistematik ve kümeli tasarımlar sonraki sürümlerde. | – | silinmeli | açıklık | M | O | X-26; P8 kararı. |
| PL-07 | `projects/i18n.js:8`; kılavuz `veri-yoneticisi.php:3`, `is-akisi.php:6` | onaylanmış veriyi okuyan araç listeleri eksik | – | Biyokütle ve Karbon, Hacim Denklemleri (ve iş akışında Meşcere Yapısı, Bonitet, Seksiyon Hacmi, Pano, Rapor) eklenmeli | açıklık | M | Y | Kod incelemesi. |
| PL-08 | `katsayi-kutuphanesi.php:9`; kılavuz `:3` | bonitet, büyüme işlevi ve gövde profili katsayı setleri | – | bütün araçların katsayı setleri (10 araç) | açıklık | M | Y | `coeflib/calc.js:19–30`. |
| PL-09 | `checker/i18n.js:71, 96`; `record/i18n.js:21, 27`; `report/render.js:23` | Tür; Bu türdeki | Kind | Sorun türü / Girdi tipi / Nitelik; Bu çeşit | terminoloji | M | Y | X-22. |
| PL-10 | `inc/guide/cards.php:7`; `core/coef-ui.js:19` | Ölçüm verimi; Kendi verim | my data | Ölçüm verilerimi; Kendi verilerim | açıklık | m | Y | Ormancılıkta "verim" = hasılat. |
| PL-11 | `inc/site.php:83`; sayfa; kılavuz | logistik | logistic | lojistik | yazım | m | Y | X-21. |
| PL-12 | `inc/site.php:119` | kalıntı kovaryansı | residual covariance | artık kovaryansı | tutarlılık | m | Y | X-06. |
| PL-13 | `inc/site.php:52`; `ornek-alan.php:7, 9` ↔ `inc/home.php:16`; kılavuz `pano.php:9`; `report/render.js:17` | tasarıma dayalı orman tahmini ↔ kestirim | design-based estimate | X-05 | tutarlılık | m | O | "orman tahmini" öngörü gibi okunuyor. |
| PL-14 | `mescere-yapisi.php:7` | ÇK | CV | X-20 | tutarlılık | m | O | X-20. |
| PL-15 | `inc/site.php:58`; `cap-dagilimi.php:11` | gamma | gamma | gama | yazım | O | O | Türkçe istatistik metinlerinde "gama dağılımı". |
| PL-16 | kılavuz `rapor.php:3` | PDF'e | to PDF | PDF'ye | dil bilgisi | m | Y | |
| PL-17 | kılavuz `katsayi-kutuphanesi.php:10`; `coeflib/i18n.js:20` ↔ kılavuz `genel.php:18` | duyarlılıkla ↔ duyarlıkla | precision | duyarlıkla | tutarlılık | m | O | X-23. |
| PL-18 | `checker/i18n.js:81` | uygulanmış hali | – | uygulanmış hâli | yazım | O | O | |
| PL-19 | `checker/i18n.js:65` | Başvuru (kategori) | Reference | Bağlantı / Başvuru bütünlüğü | çeviri | m | O | "Başvuru" = application. |
| PL-20 | `checker/i18n.js:67, 96` | Gerekçe (sorun açıklaması) | Reason | Açıklama | açıklık | m | O | Kullanıcının kabul gerekçesiyle aynı ad. |
| PL-21 | `core/coef-ui.js:16`; `inc/site.php:107`; `hacim-denklemleri.php:7` | Geri dönüşüm düzeltmesi | – | Ters dönüşüm düzeltmesi | terminoloji | m | O | X-07. |
| PL-22 | `core/coef-ui.js:16–17`; `inc/site.php:77` | etken | factor | çarpan / faktör | terminoloji | O | D | X-31. |
| PL-23 | `kaynakca.php:68` (`inc/kaynakca.json` "tools") | METHODS §10 (height–diameter), legacy Weibull | – | Türkçe karşılık ya da yalnız "§10" | çeviri | m | Y | TR sayfada İngilizce not. |
| PL-24 | `kaynakca.php:26, 43` | İçinde <i>X</i> (s. …); (2. baskı) | In X (pp.), 2nd ed. | <i>X</i> içinde (ss. …); (2. bs.) | dil bilgisi | O | O | Türkçe APA uyarlamalarında yaygın kalıp. |
| PL-25 | kılavuz `pano.php:7`, `rapor.php:8`; `report/i18n.js:9` | benzetim örnek paket | – | örnek paket (benzetim verisi) | dil bilgisi | m | Y | |
| PL-26 | `dashboard/i18n.js:13`; kılavuz `pano.php:16` | saçılmanın üstüne | over the scatter | saçılım grafiğinin üstüne | terminoloji | m | O | |
| PL-27 | `inc/catalog.php:49` | Ürün bölme (sortiman) eniyileme | – | Optimum boylama (X-12) | dil bilgisi | m | Y | |
| PL-28 | `inc/catalog.php:42` | Ağaç yaşı ve çap artımı | radial increment | yarıçap artımı | çeviri | m | O | Çap artımı yarıçap artımının iki katıdır. |
| PL-29 | `inc/catalog.php:89` ↔ `inc/site.php:54` ↔ `model-degerlendirme.php:6` | Model değerlendirme / Model Başarısı Değerlendiricisi / Model doğrulama | – | tek ad | tutarlılık | m | O | |
| PL-30 | `inc/site.php:104` | Site katsayı, yoğunluk ya da karbon oranı içermez. | – | Platform hiçbir katsayı, odun yoğunluğu ya da karbon oranı içermez. | açıklık | m | Y | "Site" bonitetle, "yoğunluk" olasılık yoğunluğuyla karışıyor. |
| PL-31 | `inc/site.php:71, 101, 110` | dik iki çap; hektara toplam; Ölçüler cm ve m girilir | – | birbirine dik iki çap; hektara çevrilmiş toplam; cm ve m cinsinden girilir | dil bilgisi | O | Y | |
| PL-32 | `report/render.js:9` | … Rapor Üretici ${v} ile … | – | … Rapor Üretici aracının ${v} sürümüyle … | dil bilgisi | m | Y | |
| PL-33 | `projects/i18n.js:24`; `report/render.js:11` | Ayrı ağaç | Distinct trees | Farklı ağaç sayısı | çeviri | O | O | |
| PL-34 | `coeflib/i18n.js:16`; `core/coef-ui.js:22` | Değişti (sütun) | Changed | Son değişiklik | dil bilgisi | O | Y | |
| PL-35 | `core/coef-ui.js:25` | ob ya da ib | – | kabuklu (ob) ya da kabuksuz (ib) | açıklık | m | Y | |
| PL-36 | `dashboard/i18n.js:29` | Sınıf alt / üst (cm) | – | Sınıf alt / üst sınırı (cm) | dil bilgisi | m | Y | |
| PL-37 | kılavuz `genel.php:18` | ilk sayfada (Bilgi) | – | … (çoğu araçta Bilgi, Veri Denetçisi'nde Ozet) | açıklık | m | O | |
| PL-38 | `hakkinda.php:31` | yalnızca dil ve tema tercihiniz tarayıcınızda saklanır | – | …; bunlar dışında yalnızca dil ve tema tercihiniz saklanır | açıklık | m | O | Cümle başı oturumların saklandığını söylüyor; "yalnızca" çelişiyor (EN'de de). |
| PL-39 | `index.php:60`; kılavuz `veri-yoneticisi.php:8` | Etkinliği kaldır | Deactivate | Etkin paketi bırak | açıklık | O | O | |
| PL-40 | `record/i18n.js:14, 23–24`; kılavuz `kayit-dogrulayici.php:14` | derleme kimliği; parmak iziyle tuttuğu | build id; matches | commit; parmak iziyle uyuştuğu | tutarlılık | O | O | |
| PL-41 | `record/i18n.js:25` | … biçiminden bağımsız olarak eşleşir | – | … biçimlendirmesi ne olursa olsun eşleşir | açıklık | m | O | |
| PL-42 | `checker/i18n.js:17, 22, 42, 66, 103, 106, 107`; `core/importer.js:8, 11`; ledeler | veya | or | ya da | üslup | O | Y | X-33. |
| PL-43 | `inc/home.php:13`; `inc/guide/cards.php:8`; kılavuz `is-akisi.php:5` | onaylı | approved | onaylanmış | tutarlılık | O | O | X-33. |
| PL-44 | `hacim-denklemleri.php:7` | seçimlik | optional | isteğe bağlı | tutarlılık | O | Y | X-30. |
| PL-45 | `checker/i18n.js:87, 97` ↔ kılavuz `ornek-alan.php:23` ↔ `seksiyon-hacmi.php:9` | üç ad | per-hectare factor | hektara çevirme katsayısı | tutarlılık | m | O | X-19. |
| PL-46 | `inc/catalog.php:16, 57`; `inc/home.php:24` ↔ `dashboard/i18n.js:21`; `report/render.js:15`; kılavuz `pano.php:10` | sıklık (density ve frequency) | density / frequency | meşcere için "sıklık"; histogramda "frekans" ya da "ağaç sayısı" | açıklık | O | O | |
| PL-47 | `inc/site.php:67`; `nispi-siralama.php:7` | Bias | Bias | yanlılık (Bias) | çeviri | O | O | X-29. |
| PL-48 | `inc/catalog.php:17` | Yetişme ortamı verimliliği | site productivity | Yetişme ortamı verim gücü | terminoloji | O | D | "Verim gücü" yerleşik; mevcut biçim de yanlış değil. |
| PL-49 | `inc/site.php:238` | yolda (rozet) | soon | yakında | üslup | O | Y | Şu an gösterilmiyor. |

### 7.6 Ek kesişen bulgu

| ID | Kavram | Konum | Mevcut | Önerilen | Önem | Güven | Açıklama |
|---|---|---|---|---|---|---|---|
| X-34 | function | işlev 43 / fonksiyon 10 (`biomass/i18n.js:53, 54, 57`; `dist/i18n.js:278, 289, 315, 316`; kılavuzlar `biyokutle-karbon.php:10`, `cap-dagilimi.php:37`) | işlev / fonksiyon | Genel metinde tek tercih ("işlev" baskın); "amaç fonksiyonu", "olabilirlik fonksiyonu" gibi yerleşik birleşikler korunabilir; araç adı "Büyüme İşlevi" için MS-38 | Opsiyonel | Orta | Platform bilinçli olarak "işlev"i seçmiş görünüyor; yalnız tutarlılık. |

---

## 8. Önceliklendirilmiş Düzeltme Planı

1. **Hesap ve anlamla ilgili, hemen** (yazar onayıyla; bir kısmı hesap kodunu da ilgilendirir):
   - **X-01 (yanlılık işareti):** önce platform kuralı seçilmeli; ardından Büyüme İşlevi, Gövde Profili ve Biyokütle hesap ve metinleri, Excel/CSV başlıkları, kılavuzlar ve testler. Hesap değişikliği olduğu için kendi testleri ve sürüm notuyla ayrı bir iş olarak yapılmalıdır.
   - **MS-03:** `stand/i18n.js`'te `tr` içindeki İngilizce satır. Program hatası, tek satır.
   - **X-04 (MS-06, MS-07):** İngilizce kalan tanımlar ve model adları.
   - **X-03 (BEF):** katalog ve sayfa başlığındaki "dönüşüm" sözcüğü.
   - **DD-01:** "alaşımlı, çok yaşlı" ifadesi.
   - **MS-19:** "n₀ = 34.573".
2. **Terim kararları** (Bölüm 9.3): yazar bir kez karar verir, sonra her biri bütün platformda tek seferde uygulanır. Sıra:
   - X-02 (standart yaş);
   - X-05 (tahmin/kestirim);
   - X-06 (artık);
   - X-07 (ters dönüşüm);
   - X-13 (üst boy);
   - X-10, X-11, X-12 (şekil katsayısı, ticari hacim, boylama);
   - X-03/X-31 (faktör/etken/çarpan);
   - X-08 (kuvvet);
   - DD-05 (eğitim verisi);
   - SM-04 (artık işareti).
   
   Her kararın uygulamasında `assets/build/` yeniden üretilmeli ve e2e testlerindeki Türkçe metin denetimleri güncellenmelidir.
3. **Güncellik:** X-26, PL-05…PL-08, PL-38 (eskimiş "sonraki aşama" anlatımları, eksik araç listeleri).
4. **Tutarlılık (biçim):**
   - X-15…X-25 ve X-28…X-30 (tohum, tekrar, p değeri, lojistik, ÇK, hektara çevirme vb.);
   - PL-01/PL-02 (kaynak durum etiketleri).
5. **Dil bilgisi ve açıklık:** Bölüm 5 ve Bölüm 7'deki Minor bulgular. Her aracın i18n dosyası bir geçişte düzeltilebilir.
6. **Opsiyonel üslup:** X-14, X-32, X-33, X-34 ve "O" önemli bulgular. Zaman buldukça.

Not: CLAUDE.md'deki "her turda yalnızca gönderilen modül" ve minör revizyon kurallarıyla uyumlu olmak için bu planın her adımı ayrı bir kullanıcı kararıyla uygulanmalıdır.

---

## 9. Kaynaklar ve Doğrulama Durumu

### 9.1 Başvurulan kaynaklar

- **Proje içi belgeler** (doğrulandı):
  - `docs/METHODS.md`: kaynak durum etiketlerinin tanımı (satır 4–8) ve "dayanak yaş" geçişleri.
  - `CLAUDE.md`: "fit et-" ve "benzetim" kuralı; "tahmin edilen parametreler"; D0/Dmin tanımları; P8 kapsam kararları; board-foot istisnası.
  - `docs/TERMINOLOJI_DENETIMI_PROMPT.md`: "dayanak yaş" → "standart yaş" örneği.
  - Kodun kendisi: işaret kuralları, i18n anahtarlarının çakışması, araç listeleri.
- **Web aramaları** (yalnız arama sonuç listesi görüldü; bulunan yayınların tam metni açılıp okunmadı; bu yüzden ilgili öneriler "doğrulanmış" değil, "editoryal değerlendirme" olarak işaretlendi):
  - "değişik yaşlı meşcere … ters J" kullanımı: DergiPark makaleleri (https://dergipark.org.tr/en/download/article-file/265244; https://dergipark.org.tr/en/pub/tjf/article/1731355).
  - "biyokütle genişletme faktörü (BEF)": Bartın Üniversitesi açık erişim ve OGM e-kütüphane belgeleri (başlıklar görüldü).
  - "optimum boylama": Turkish Journal of Agriculture and Forestry 24(3) ve TR Dizin kaydı (başlıklar görüldü).
  - "şekil katsayısı", "ticari gövde hacmi", "gövde çapı denklemleri": DergiPark ve YÖK Açık Bilim kayıtları (başlıklar görüldü).
  - "karışık etkili çap-boy modelleri": Turkish Journal of Forestry (https://dergipark.org.tr/tr/pub/tjf/article/1564710; başlık görüldü). Sitenin "karma etkili" terimi tutarlı olduğu için değişiklik önerilmedi.
- **Erişilemeyen kaynaklar:** TDK Güncel Türkçe Sözlük ve Yazım Kılavuzu, IPCC 2006 Kılavuzu, Türkçe dendrometri ve orman hasılat bilgisi ders kitapları ile ormancılık terim sözlükleri bu denetim sırasında açılmadı. Bunlara dayanan öneriler (ör. PL-16 "PDF'ye", MS-31 "-oit", X-10 "şekil katsayısı", X-13 "üst boy") editoryal değerlendirmedir.

### 9.2 Doğrulanmış bulgular (kodla ya da proje belgesiyle kesin)

MS-03 (yinelenen anahtar), X-01 (işaret tanımları), X-02 (proje terim kararı), X-04 (İngilizce metinler), X-26 (eskimiş anlatımlar), X-27 ("uydur-" kalıntıları), PL-01 (METHODS tanımı), PL-07/PL-08 (araç listeleri), MS-19 (sayı okuması), DD-29 (sekme adı) ve bütün tutarlılık sayımları.

### 9.3 Uzman ya da yazar kararı gerektiren konular

1. **X-05: tahmin ve kestirim.** Proje kuralı "tahmin edilen parametreler" der. İstatistik yazınındaki estimation (kestirim) ve prediction (tahmin) ayrımına geçilecek mi?
2. **X-01 ve SM-04: işaret kuralları.** Yanlılık ve artık için platform kuralı ne olacak? Mevcut kural e = ŷ − y; ders kitapları ve R'daki artık tanımı y − ŷ. Hesap kodunu ilgilendiriyor.
3. **X-13: üst boy ve baskın boy.** H0'ın iki tanımı (100 en kalın / 100 en uzun) aynı adı mı taşıyacak?
4. **X-10, X-11, X-12: hacim terimleri.** "Biçim sayısı" mı "şekil katsayısı" mı; "kullanılabilir" mi "ticari hacim" mi; "ürün bölme" mi "boylama" mı? Türkçe dendrometri ders kitaplarıyla doğrulanmalı.
5. **X-03 ve X-31: "etken", "faktör", "çarpan".** BEF için hangisi kullanılacak?
6. **DD-05: model kurma verisi.** "Eğitim verisi" yerine "model kurma verisi" kullanılacak mı?
7. **MS-38 ve X-34: işlev ve fonksiyon.** "Büyüme İşlevi" ve "işlev" tercihi bilinçli mi?
8. **Tek tek bulgular:**
   - DD-32: Kraft sınıfları için "hâkim / ortak hâkim";
   - PL-15: "gama";
   - MS-31: "-oid";
   - SM-25: BCa için "hızlandırılmış".
   
   Bunlar Düşük güvenli; uzman görüşü önerilir.
9. **X-25: ondalık ayırıcı.** Türkçe metin içi sayılarda virgül mü, ekranla aynı biçimde nokta mı kullanılacak?

---

### Sayısal özet

| | Sayı |
|---|---|
| İncelenen dosya (Türkçe metin içeren) | yaklaşık 120 |
| İncelenen modül | 26 araç + platform kabuğu + ortak bileşenler |
| Ham bulgu (beş inceleme geçişi) | 194 |
| Benzersiz bulgu (kesişenler birleştirilmiş) | 154 (34 kesişen X-bulgusu + 120 modüle özgü bulgu) |
| Kritik | 5 (X-01, X-03, X-04, DD-01, MS-03) |
| Major | 25 |
| Minor | 86 |
| Opsiyonel | 38 |

Önem sayımları şöyle yapıldı:
- Birleştirilmiş X-bulguları (34 adet) birer kez sayıldı.
- Modül tablolarındaki satırlardan yalnız bir X-bulgusuna bağlanmayanlar eklendi (120 adet).
- Bir X-bulgusuna bağlanan 74 modül satırı ayrıca sayılmadı; bunlar o X-bulgusunun konum listesidir.
