# Yeni araçlar: teknik şartname ve aşamalı geliştirme promptları

Hazırlanma tarihi: 12 Kasım 2026
Durum: **onaylandı** (12 Kasım 2026, kullanıcı); T00 raporunun §5'teki 1–3 düzeltmeleri işlendi (12 Kasım 2026, kullanıcı onayı). Bölüm 0'daki K1–K9 kararları bağlayıcıdır; CLAUDE.md'de bağlantısı vardır.
Kapsam: kullanıcının istediği sırayla beş yeni araç (12 Kasım 2026):

1. Seksiyon hacmi hesaplayıcısı / Stem Section Volume
2. Bonitet hesaplayıcısı / Site Index
3. Meşcere yapısı ve rekabet / Stand Structure & Competition
4. Biyokütle ve karbon hesaplayıcısı / Biomass & Carbon
5. Gövde profili ve ürün hacmi / Taper & Assortment

Bu belge `docs/DIST_SPEC.md` ile aynı biçimdedir: önce ortak kurallar ve araç başına teknik şartname, sonra her aşama için kodlama yapacak yapay zekâya tek tek verilecek promptlar. Bölüm 8'deki referans sayıları bu belge yazılırken SciPy/NumPy ile hesaplandı. Bu, sitedeki kodun test edildiği anlamına gelmez. Bölüm 9'daki kaynakların **hiçbiri bu belge için okunmadı**: künyeler bilgiden yazıldı, durumları **[D]** (doğrulanacak). Bir kaynağın denklemi uygulanmadan önce okunup METHODS.md'de **[B]** olarak işaretlenmelidir.

## 0. Kararlar (K1–K9, 12 Kasım 2026 kullanıcı onayı; bağlayıcı)

| No | Karar | Karar metni | Gerekçe |
|---|---|---|---|
| K1 | Yerleşik katsayı | **Hiçbir araçta yerleşik tür/yöre katsayısı yok.** Bonitet eğrileri, biyokütle denklemleri, karbon oranı, odun yoğunluğu, kabuk modeli ve gövde profili katsayılarını kullanıcı girer ya da kendi verisinden uydurur. Katsayı seti, kaynak alanı zorunlu bir "katsayı kaydı"nda tutulur (T01). | PROJECT.md §5 kural 4; uydurma katsayı riski sıfır. Yerleşik bir set istenirse, kaynağı okunup [B] olarak işaretlendikten sonra **ayrı bir aşama** olarak eklenir. |
| K2 | Sayfa ve klasör adları | `seksiyon-hacmi.php` → `assets/lab/secvol/`; `bonitet.php` → `assets/lab/siteindex/`; `mescere-yapisi.php` → `assets/lab/structure/`; `biyokutle-karbon.php` → `assets/lab/biomass/`; `govde-profili.php` → `assets/lab/taper/` | Mevcut adlandırmayla aynı (Türkçe sayfa adı, İngilizce kod klasörü). |
| K3 | Kenar çubuğu kategorileri | Yeni kategori **"Ağaç ve gövde / Tree and stem"**: seksiyon hacmi, gövde profili, biyokütle ve karbon. Bonitet ve meşcere yapısı için yeni kategori **"Meşcere ve yetişme ortamı / Stand and site"**. | Mevcut dört kategori bu araçlara uymuyor. |
| K4 | Sürüm | Her araç `1.0.0-beta.1` ile başlar. Hesaplanan yöntem kümesi değişen her yayında beta numarası artar (çap dağılımı kuralı). İlk tam sürüm, aracın son aşamasının kabulüyle `1.0.0` olur. | Atıf sürümü aracın yaptığını göstermeli. |
| K5 | Sıra | T00 → T01 → SV01 → SV02 → SV03 → SI01 → SI02 → SI03 → SI04 → SS01 → SS02 → SS03 → SS04 → BC01 → BC02 → BC03 → TP01 → TP02 → TP03 → TP04. İsteğe bağlı: SV04, BC04, TP05. | Kullanıcının araç sırası korunur. Ortak altyapı (T01) baştadır, çünkü dört araç katsayı kaydını, iki araç gövde ölçüm sözleşmesini paylaşır. |
| K6 | Gövde ölçüm verisi | Seksiyon hacmi ve gövde profili aynı veri sözleşmesini (`stem-sections/1`, Bölüm 1.2) kullanır. Profil aracı seksiyon aracının hesabını yeniden yazmaz, içe aktarır. | Aynı veri iki kez girilmez (arayüz ilkesi 4). |
| K7 | Uç seksiyon | Son ölçüm noktasından tepeye kadarki parça için geometrik cisim **kullanıcı seçimi** olur: koni, paraboloit ya da neiloit. Araç varsayılanı **koni**dur; bu bir araç kuralıdır, kaynaktan alınmış bir zorunluluk değildir ve sonuçta yazılır. | Uygulamada en sık kullanılan seçenek konidir ama tek doğru değildir. |
| K8 | Bonitette yaş | Yaş türü (toplam yaş / göğüs yüksekliği yaşı) her veri setinde **açıkça seçilir**. Eğri katsayıları hangi yaş türüyle üretildiyse o türle kullanılır; araç yaş türlerini birbirine çevirmez. | Karıştırılırsa bonitet sistematik olarak kayar. |
| K9 | Karbon ve CO₂ | Karbon oranı (CF) kullanıcı girer (bileşen başına). CO₂ eşdeğeri = C × 44/12 (molar kütle oranı; katsayı değil, sabit). | K1 ile tutarlı. 44/12 kimyasal bir sabittir. |

## Nasıl kullanılmalı?

1. Bu belgeyi kodlama yapacak yapay zekâya proje referansı olarak ver. `CLAUDE.md`, `docs/PROJECT.md` ve `docs/METHODS.md` her zaman geçerlidir.
2. İlk mesajda Bölüm 7'deki "Ortak geliştirme talimatı"nı ve T00'ı gönder.
3. Sonraki her mesajda yalnızca sıradaki promptu gönder ("SV01'e geçelim" yeterli). Bir aşamanın kabul ölçütleri sağlanmadan sonrakine geçilmez.
4. Her aracın ilk yayına çıkışı, o aracın ilk "kabul" ölçütleri sağlandığında ve kılavuz bölümü yazıldığında yapılır (PROJECT.md §6: kılavuzsuz araç yayına çıkmaz). Yayına alma ayrı kullanıcı kararıdır.
5. Bir araçta öngörülmeyen bir bilimsel karar gerekirse aşama durdurulur ve kullanıcıya sorulur; tahminle ilerlenmez.

## 1. Ortak çerçeve

### 1.1. Bütün araçlar için

- Hesap (`calc.js` ya da motor dosyaları) arayüzden (`ui.js`) ve metinlerden (`i18n.js`) ayrıdır; hesap dosyaları DOM'a dokunmaz ve Node testlerinde çalışır.
- Girdi: ortak içe aktarma paneli (`core/importer.js`), Veri Denetçisi'nin onaylanmış verisi (`forest-dataset/1`, PROJECT.md §4b) ya da elle giriş. Örnek alan × dönem birimi ve gezgini (`core/unitnav.js`) çok birimli verilerde ortak davranıştır.
- Çıktı: ekranda tek bir genel tablo, ayrıntılar açılırda. Excel/CSV/JSON dışa aktarma (`core/export.js`). Excel'in "Bilgi" sayfası araç, sürüm, tarih, dil, ayarlar ve **kullanılan katsayı setlerinin kaynaklarını** içerir.
- Sonuç kaydı: çap dağılımındaki `dist-result/1` ilkeleri genelleştirilir. Her hesaplanan değer için durum (`ok`, `invalid`, `boundary`, `noconverge`, `error`), sorunlar ve uyarılar kod olarak, birimler, kullanılan ayarlar ve katsayı setinin kimliği kayda yazılır. Hesaplanamayan değer sayı gibi gösterilmez (boş ya da "–" ve nedeni).
- Birimler: çap cm, boy ve uzunluk m, alan m² (ekranda ha dönüşümü açıkça), hacim m³, kütle kg (ağaç) ve Mg/ha (meşcere), karbon Mg C/ha, CO₂ Mg CO₂/ha. Dönüşümler ekranda yazılır.
- Kabuklu/kabuksuz ayrımı her çap ve hacim değerinde bir alanla taşınır (`bark: 'ob' | 'ib'`). İkisi hiçbir yerde sessizce karışmaz.
- Ekstrapolasyon: katsayı setinin geçerlilik aralığı (ör. denklemin uydurulduğu çap ve boy aralığı) girildiyse, dışındaki ağaçlar hesaplanır ama **uyarıyla** işaretlenir ve sayıları raporlanır.
- Kılavuz: her araç için `inc/guide/tr.php` ve `en.php` bölümü (formül tekrarlanmaz), `tests/site/test_guide.mjs` kapsamına girer.
- Atıf: `site_tools()` satırındaki `v` ile aracın `TOOL.version`'ı aynıdır (`tests/site/test_cite.mjs`).
- Test: her bilimsel hesap için `tests/ref/make_<araç>_<aşama>.py` (SciPy/NumPy; JS'deki formülün kopyası değil, bağımsız yol: sayısal integral, genel optimizasyon, kaba kuvvet arama…) ve `tests/<araç>/test_<aşama>.mjs`; arayüz için `tests/<araç>/e2e.mjs`. Yeni testler `.github/workflows/deploy.yml`'e eklenir.

### 1.2. Gövde ölçüm verisi: `stem-sections/1`

Seksiyon hacmi ve gövde profili için ikinci bir tablo türü. Her satır bir ağacın bir ölçüm noktasıdır.

| Alan | Tür | Birim | Not |
|---|---|---|---|
| `row` | tamsayı | – | Kaynak satır numarası |
| `plot_id`, `tree_id`, `period` | metin | – | Ağaç tablosuyla aynı kimlik kuralları (metin olarak korunur) |
| `h` | sayı | m | Ölçüm noktasının yerden yüksekliği (kesim yüzeyinden değil, **zeminden**; kesim yüksekliği ayrı alan) |
| `d` | sayı | cm | Çap. İki çapraz ölçüm varsa `d1`, `d2` eşlenir; birleştirme kuralı ayardır (aritmetik ortalama ya da alanların ortalaması: d = √((d1² + d2²)/2)) ve sonuçta yazılır |
| `bark` | metin | – | `ob` (kabuklu) ya da `ib` (kabuksuz); tablo düzeyinde de verilebilir |
| `bark_t` | sayı | mm | İsteğe bağlı **çift** kabuk kalınlığı; verilirse d_ib = d_ob − bark_t/10 |
| `kind` | metin | – | İsteğe bağlı: `section` (seksiyon ortası ya da ucu), `stump`, `dbh`, `top` |

Ağaç düzeyinde (ağaç tablosundan ya da aynı tablonun ağaç sütunlarından): `dbh` (cm), `height` (m, toplam boy), `stump_h` (m, kesim yüksekliği), isteğe bağlı `top_d` ve `top_h` (kullanılabilir tepe). Ağaç tablosu ile seksiyon tablosu `plot_id` + `tree_id` (+ `period`) ile birleştirilir; eşleşmeyen satırlar sayılır ve satır numarasıyla raporlanır.

Kontroller (hesaptan önce, Denetçi'deki önem düzeyleriyle): aynı ağaçta yinelenen `h`; `h` < 0 ya da `h` > toplam boy; boydan büyük kesim yüksekliği; yükseklikle **artan** çap (kök şişkinliği dışındaki artışlar uyarı; kök şişkinliği bölgesi ayar olarak tanımlanır, varsayılan h < 1.3 m); 1.30 m'deki ölçülen çap ile `dbh` arasında büyük fark (eşik ayar); tek ölçüm noktalı ağaç (hesaplanmaz).

### 1.3. Katsayı kaydı: `model-coef/1`

Bonitet, biyokütle, gövde profili (ve kabuk modeli) katsayı setleri ortak bir kayıtta tutulur.

```
{ schema: 'model-coef/1', id, tool: 'siteindex'|'biomass'|'taper'|'bark'|…, form: '<kayıtlı biçim kimliği>',
  params: { <ad>: sayı }, inputs: { <değişken>: { unit, bark? } }, output: { name, unit, bark? },
  valid: { <değişken>: [en küçük, en büyük] } | null, species, region, component?,
  transform: { kind: 'none'|'log'|'log10', correction: 'none'|'baskerville'|'snowdon'|'user', value? } | null,
  source: { citation (zorunlu), doi?, page?, table?, note? }, origin: 'user-entered'|'fitted',
  fit?: { data: 'açıklama', n, method, rmse, created } , created, modified }
```

- **Biçim kaydı:** her araç desteklediği denklem biçimlerini (ör. `B = a·D^b`) kimlik, parametre adları ve açık formülle kaydeder; kullanıcı yalnızca kayıtlı bir biçime katsayı girer. Serbest formül yazımı (ifade ayrıştırıcı) bu pakette yoktur.
- **Kaynak alanı zorunludur.** "Kendi verim, yayımlanmamış" gibi bir ifade geçerlidir, ama boş bırakılamaz. Sonuç tablosu ve dışa aktarma "kullanıcı katsayılarıyla üretildi: <kaynak>" notunu taşır.
- Saklama: IndexedDB (`forestbiometry` deposu); JSON olarak indirilebilir ve geri yüklenebilir. Sunucuya gitmez.
- Uydurulan setler (`origin: 'fitted'`) uydurma özetini (`fit`) taşır ve aynı kayda yazılabilir.

## 2. Seksiyon hacmi (Stem Section Volume)

Amaç: ölçülmüş seksiyon çaplarından tek ağaç gövde hacmi (kabuklu ve/veya kabuksuz), seksiyon dökümü, biçim sayısı; örnek alan verisi varsa hektara genişletme.

### 2.1. Denklemler

g(d) = (π/4)·(d/100)² (m², d cm). Seksiyon uzunluğu L (m).

| Yöntem | Ölçüm | Hacim |
|---|---|---|
| Huber | seksiyon ortasında d_m | V = g_m·L |
| Smalian | iki uçta d₁, d₂ | V = (g₁ + g₂)/2·L |
| Newton | iki uç ve orta | V = L/6·(g₁ + 4g_m + g₂) |
| Hohenadl (5 seksiyon) | 0.1H, 0.3H, 0.5H, 0.7H, 0.9H | V = (H/5)·Σ g_i (eşit uzunlukta beş Huber seksiyonu) |

- **Dip kütük (stump):** zemin ile kesim yüksekliği arasındaki hacim ayrı satırdır ve toplam gövde hacmine katılıp katılmayacağı ayardır (varsayılan: katılmaz; kesim yüksekliğinden tepeye gövde). Kütük silindir olarak, kesim yüzeyindeki çapla hesaplanır.
- **Uç seksiyon (K7):** son ölçüm noktasından tepeye; koni V = g·L/3, paraboloit V = g·L/2, neiloit V = g·L/4. Tepe boyu bilinmiyorsa uç seksiyon hesaplanmaz ve hacim "son ölçüm noktasına kadar" diye etiketlenir.
- **Eşit olmayan seksiyonlar** desteklenir; her seksiyonun kendi L'si vardır. Huber için ölçüm noktası seksiyonun ortası olmalıdır; araç seksiyon sınırlarını ölçüm noktalarından nasıl türettiğini açıkça yazar (iki ayrı veri düzeni: "uç ölçümleri" ve "orta ölçümleri"; kullanıcı seçer, araç tahmin etmez).
- **Kullanılabilir hacim:** kullanıcı bir tepe çapı (ör. 7 cm) verirse, bu çapın aşıldığı noktanın yüksekliği iki ölçüm arasında **doğrusal aradeğerle** (çapta) bulunur; kullanılabilir hacim o noktaya kadardır. Aradeğer kuralı sonuçta yazılır.
- **Biçim sayısı:** f₁.₃ = V / (g₁.₃·H) (gerçek biçim sayısı değil, göğüs yüksekliği biçim sayısı; tanım sonuçta yazılır). V'nin dip kütüğü içerip içermediği aynı satırda belirtilir.
- **Kabuk:** kabuklu ve kabuksuz hacim ayrı sütunlardır; kabuk hacmi = fark, kabuk yüzdesi = fark / kabuklu hacim.

### 2.2. Bilinen davranış (test edilebilir özellikler)

Kesit alanı yükseklikle g(h) = g₀(1 − h/L)^r değişiyorsa: r = 1 paraboloit, r = 2 koni, r = 3 neiloit. Huber, Smalian ve Newton paraboloitte **tam**dır; Newton, kesit alanı yüksekliğin en çok üçüncü dereceden polinomu olan her cisimde tamdır (koni ve neiloit dahil); koni ve neiloitte Huber eksik, Smalian fazla tahmin eder ve seksiyon sayısı arttıkça ikisi de tam değere yaklaşır. Sayılar Bölüm 8.1'de.

### 2.3. Promptlar

### SV01 — Seksiyon hacmi çekirdeği

~~~text
TOOLS_SPEC Bölüm 1.2 ve 2.1'e göre seksiyon hacmi hesap çekirdeğini yaz (assets/lab/secvol/calc.js, DOM'suz).

Huber, Smalian, Newton ve Hohenadl (beş seksiyon) yöntemlerini ayrı kimliklerle uygula. Eşit olmayan seksiyon uzunluklarını destekle. "Uç ölçümleri" ve "orta ölçümleri" iki ayrı veri düzenidir; kullanıcı seçer, araç tahmin etmez. Newton için her seksiyonda uç ve orta ölçümler gerekir; eksikse o seksiyon hesaplanmaz ve nedeni yazılır.

Dip kütük (silindir, kesim yüzeyi çapıyla) ve uç seksiyon (koni, paraboloit, neiloit; varsayılan koni, araç kuralı olarak etiketli) ayrı satırlardır. Tepe boyu yoksa uç seksiyon hesaplanmaz ve hacim "son ölçüm noktasına kadar" olarak etiketlenir.

Her ağaç için seksiyon dökümü (alt/üst yükseklik, ölçüm(ler), uzunluk, hacim, yöntem), toplam hacim, biçim sayısı f1.3 (tanımıyla) ve durum/sorun kayıtlarını üret. Kabuklu ve kabuksuz hacmi ayrı hesapla; çift kabuk kalınlığı verildiyse d_ib = d_ob − bark_t/10. İki çapraz çapın birleştirme kuralı ayardır ve sonuca yazılır.

Bölüm 1.2'deki veri kontrollerini uygula (yinelenen h, boydan yüksek ölçüm, yükseklikle artan çap, 1.30 m çapı ile dbh farkı, tek ölçüm noktası).

Kabul: Bölüm 8.1'deki paraboloit, koni ve neiloit değerleri tek ve dört seksiyonla 1e−12 göreli toleransla geçmeli; Newton koni ve neiloitte tam olmalı. Bağımsız referans: tests/ref/make_secvol_sv01.py, kesit alanı fonksiyonunun scipy.integrate.quad ile integrali ve eşit olmayan uzunluklu rastgele seksiyonlarda ayrı yazılmış toplama. Eksik/çelişkili veride sayı yerine durum ve neden dönmeli.
~~~

### SV02 — Arayüz, ağaç ve örnek alan düzeyi

~~~text
Seksiyon hacmi aracının sayfasını (seksiyon-hacmi.php) ve arayüzünü ekle. Adımlar: veri (gövde ölçüm tablosu ve isteğe bağlı ağaç tablosu; içe aktarma paneli; sütun eşleme; veri düzeni seçimi), ayarlar (yöntem, uç seksiyon cismi, dip kütük dahil mi, çap birleştirme kuralı, kullanılabilir tepe çapı), sonuçlar.

Sonuç ekranı: ağaç başına tek tablo (ağaç, yöntem, kabuklu ve kabuksuz hacim, biçim sayısı, durum); seçili ağacın seksiyon dökümü ve gövde profil çizimi (yükseklik–çap, ölçüm noktaları ve seksiyon sınırları) ayrıntılar açılırında. Birden çok yöntem seçilirse aynı ağaçta yöntemler yan yana ve aralarındaki fark yüzde olarak gösterilir. Kullanılabilir tepe çapı verildiyse kullanılabilir hacim ve o çapın yüksekliği (doğrusal aradeğer, kural yazılı).

Ağaç tablosunda örnek alan alanı varsa ağaç hacimleri genişletme faktörüyle hektara toplanır (m³/ha); seksiyon ölçümü olmayan ağaçlar bu toplama sessizce katılmaz: sayıları ve "ölçülmemiş" durumu raporlanır (hacim modeli ile tamamlama bu aşamada yok).

Excel/CSV/JSON dışa aktarma, kılavuz bölümü (TR/EN), site_tools satırı (K2, K3, K4), simge; "Ağaç ve gövde" kategorisi bu araçla birlikte site_cats()'a eklenir. Örnek veri benzetimdir ve öyle etiketlenir (tests/ref altında üretici betikle).

Kabul: e2e testinde bilinen cisimlerden üretilmiş örnek veriyle ekrandaki hacimler motorla aynı; uç seksiyon ve dip kütük seçenekleri değerleri doğru değiştirir; eksik veri satır numarasıyla raporlanır; telefon genişliğinde yatay kaydırma yok; TR/EN aynı sayılar.
~~~

### SV03 — Kalite kontrolleri ve yöntem karşılaştırması

~~~text
Seksiyon hacmi aracına veri kalitesi ve yöntem farkı raporunu ekle.

Her ağaç için profilin tutarlılığını raporla: yükseklikle artan çaplar (kök şişkinliği bölgesi ayarı dışında), seksiyon uzunluklarının dağılımı, uç seksiyonun toplam hacimdeki payı (ayarlanabilir eşik üstü uyarı: uç seksiyon cismi seçimi sonuca duyarlı demektir), 1.30 m çapı ile dbh farkı.

Birden çok yöntem hesaplandıysa yöntemler arası farkın özetini ver (ağaç başına ve toplamda, yüzde). Hiçbir yöntemi "doğru" ilan etme; Bölüm 2.2'deki bilinen davranışı ayrıntılar açılırında açıkla.

Kabul: bilinen cisimlerde yöntem farkları Bölüm 8.1 ile aynı; uyarı eşikleri ayarla değişiyor ve sonuçta yazılıyor.
~~~

### SV04 — İsteğe bağlı: hacim denklemi uydurma

~~~text
(İsteğe bağlı.) Seksiyon hacimleri hesaplanmış ağaçlardan kullanıcının seçtiği kayıtlı hacim denklemi biçimlerini (ör. V = b0 + b1·D²H; ln V = b0 + b1 ln D + b2 ln H) uydur. Logaritmik biçimde geri dönüşüm düzeltmesi açık bir seçenektir. Uydurulan set katsayı kaydına (model-coef/1, origin 'fitted') yazılabilir. Model başarısı değerlendirmesi için Model Başarısı aracına aktarma yolu ver; kendi başarı ölçütü hesaplarını o araçla aynı tanımlarla yap.

Kabul: katsayılar ve standart hatalar SciPy/statsmodels referansıyla aynı; logaritmik biçimde düzeltme etkeni elle hesaplanan değere eşit.
~~~

## 3. Bonitet (Site Index)

Amaç: üst boy ve yaştan bonitet endeksi (seçilen dayanak yaşındaki üst boy), bonitet sınıfı ve bonitet eğrisi; kullanıcının katsayılarıyla ya da kendi gövde analizi / tekrarlı ölçüm verisinden uydurulan dinamik denklemle.

### 3.1. Kavramlar

- **Üst boy:** platformda baskın boy H0 (hektardaki en büyük 100 ağacın boy ortalaması; Örnek Alan ve Meşcere aracı, METHODS §6). Bonitet aracı H0'ı o araçla **aynı tanımla** hesaplar ya da kullanıcının verdiği üst boyu kullanır; tanım sonuçta yazılır. Eğri katsayıları farklı bir üst boy tanımıyla üretildiyse araç bunu düzeltemez; kullanıcıya not olarak gösterilir.
- **Yaş türü (K8)** ve **dayanak yaş** A₀ (ör. 50 ya da 100) ayardır ve her sonuçta yazılır.
- **Dinamik (fark) denklemleri:** H₂ = f(A₂, A₁, H₁). İstenen özellikler: tutarlılık H₁ = f(A₁, A₁, H₁), dayanak yaştan bağımsızlık (base-age invariance) ve yol bağımsızlığı f(A₃, A₂, f(A₂, A₁, H₁)) = f(A₃, A₁, H₁). Bonitet endeksi SI = f(A₀, A, H).
- Eğri biçimi **anamorfik** (eğriler birbirinin katı) ya da **polimorfik** olabilir; bu, biçimin özelliğidir ve arayüzde yazılır.

### 3.2. Biçimler (ilk kapsam)

Her biçim parametreleri, hangi parametrenin yetişme ortamına özgü olduğu (serbest parametre) ve fark denklemi türetimiyle METHODS.md'ye yazılır; türetim aşağıdaki özdeşlik testleriyle doğrulanır.

| Kimlik | Temel model | Fark denklemi (serbest parametre) | Tür |
|---|---|---|---|
| `cr.ada.b0` | Chapman–Richards H = b₀(1 − e^(−b₁A))^b₂ | H₂ = H₁·[(1 − e^(−b₁A₂))/(1 − e^(−b₁A₁))]^b₂ (b₀ yere özgü) | anamorfik |
| `cr.ada.b2` | aynı | H₂ = b₀·(H₁/b₀)^(ln(1 − e^(−b₁A₂))/ln(1 − e^(−b₁A₁))) (b₂ yere özgü) | polimorfik |
| `schu.ada` | Schumacher ln H = b₀ + b₁/A | ln H₂ = ln H₁ + b₁(1/A₂ − 1/A₁) (b₀ yere özgü) | anamorfik |
| `gada.*` | Cieszewski–Bailey GADA ailesi | **kaynaktan okunup** biçim bazında eklenir | polimorfik |

GADA biçimleri uygulanmadan önce Cieszewski ve Bailey (2000) okunmalıdır; bu belgede denklem yazılmadı (uydurma riski).

### 3.3. Uydurma (kullanıcının kendi verisinden)

- Veri: gövde analizi (bir ağacın yaş–boy dizisi) ya da tekrarlı ölçülen örnek alanların üst boy–yaş dizisi. Dizi kimliği (ağaç ya da örnek alan) zorunludur.
- Fark denklemi uydurmada **eşleştirme biçimi** sonucu etkiler: ardışık eşler, ilk ölçüm ile sonrakiler, bütün eşler. Seçim ayardır ve sonuçta yazılır. Aynı dizinin gözlemleri bağımsız değildir; bu yüzden standart hatalar "gözlemler bağımsız varsayımıyla" diye etiketlenir ya da dizi düzeyinde bootstrap ile verilir (SI04).
- Alternatif: yere özgü parametreyi her dizi için ayrı kestiren "dummy değişken" yaklaşımı; bu ayrı bir yöntem kimliğidir ve kaynakla doğrulanmadan eklenmez.
- Çözücü: `core/nls.js` (Levenberg–Marquardt). Başarısızlık durumları ayrı raporlanır; başarısız uydurma katsayı kaydına yazılamaz.

### 3.4. Bonitet sınıfları

Sınıflar **kullanıcı tanımlıdır**: sınıf sayısı ve dayanak yaştaki SI aralıkları (eşit aralık ya da elle sınırlar), sınıf adları (I, II, … ya da serbest). Hasılat tablolarından sınıf sınırları ancak kullanıcı girerse kullanılır; araç hiçbir hasılat tablosunu gömmez (K1).

### 3.5. Promptlar

### SI01 — Dinamik denklem çekirdeği

~~~text
TOOLS_SPEC Bölüm 3.1–3.2'ye göre bonitet hesap çekirdeğini yaz (assets/lab/siteindex/calc.js, DOM'suz). Biçim kaydı: cr.ada.b0, cr.ada.b2, schu.ada. Her biçim için H2 = f(A2, A1, H1), SI = f(A0, A, H), eğri üretimi (verilen SI için A ızgarasında H) ve parametre geçerlilik kontrolleri.

Tanımsız durumları ayrı raporla (ör. 1 − e^(−b1·A) ≤ 0, H ≤ 0, A ≤ 0, H1 ≥ b0 olan polimorfik biçim). Yaş türü ve dayanak yaş her sonucun ayarlarında yer alsın.

Kabul: her biçimde tutarlılık, dayanak yaştan bağımsızlık ve yol bağımsızlığı rastgele 1000 durumda 1e−12 göreli toleransla sağlanmalı. Bağımsız referans: tests/ref/make_siteindex_si01.py, temel modeli SI'ya göre scipy.optimize.brentq ile çözüp eğriyi oradan hesaplayan ayrı yol (fark denkleminin kendisi kullanılmadan). Bölüm 8.2 değerleri geçmeli.
~~~

### SI02 — Katsayı kaydı ile bonitet hesabı ve arayüz

~~~text
Bonitet aracının sayfasını (bonitet.php) ekle. Kullanıcı T01 katsayı kaydından bir set seçer ya da yeni set girer (biçim, katsayılar, yaş türü, dayanak yaş, üst boy tanımı, geçerlilik aralığı, kaynak zorunlu).

Girdi: tek ağaç/örnek alan için elle (yaş, üst boy) ya da tablo (örnek alan, dönem, yaş, üst boy). Ağaç tablosundan üst boy hesaplanacaksa Örnek Alan ve Meşcere aracının H0 tanımı aynen kullanılır (kodu yeniden yazılmaz, paylaşılır) ve tanım sonuçta yazılır.

Çıktı: SI, bonitet sınıfı (Bölüm 3.4; sınıf tanımı kullanıcıdan), eğri demeti grafiği (sınıf sınırları ve gözlemler), geçerlilik aralığı dışı uyarıları. Excel/CSV/JSON, kılavuz, site_tools satırı; "Meşcere ve yetişme ortamı" kategorisi bu araçla birlikte site_cats()'a eklenir.

Kabul: e2e'de ekrandaki SI motorla aynı; yaş türü ve dayanak yaş sonuçta görünür; kaynak alanı boş set kaydedilemez; sınıf sınırları değişince sınıflar değişir, SI değişmez.
~~~

### SI03 — Kendi verisinden uydurma

~~~text
Bölüm 3.3'e göre gövde analizi ve tekrarlı ölçüm verisinden fark denklemi uydurmayı ekle. Eşleştirme biçimi (ardışık, ilk-ile-sonrakiler, bütün eşler) ayardır. Uydurma core/nls.js ile yapılır; başlangıç değerleri ve durdurma ölçütü sonuçta yazılır. Standart hatalar "gözlemler bağımsız varsayımıyla" etiketlenir.

Çıktı: katsayılar, RMSE ve yanlılık (Model Başarısı aracıyla aynı tanımlar), artıklar–yaş grafiği, uydurulan eğrilerin gözlem dizileri üzerine çizimi. Başarılı set katsayı kaydına (origin 'fitted', veri özeti ve eşleştirme biçimiyle) yazılabilir.

Kabul: katsayılar scipy.optimize.least_squares referansıyla 1e−6 göreli toleransla aynı (aynı eşleştirme biçimi, aynı başlangıç); benzetim verisinde (bilinen katsayılarla üretilmiş, gürültülü) katsayılar makul aralıkta geri gelir; eşleştirme biçimi değişince eş sayısı doğru.
~~~

### SI04 — Belirsizlik

~~~text
Uydurulan bonitet modeli için dizi düzeyinde bootstrap ekle (diziler yeniden örneklenir, tek tek gözlemler değil). Katsayılar ve verilen bir (A, H) için SI'nın yüzdelik aralığı, başarısız tekrar oranı ve tohum sonuçta yazılır. Kullanıcı katsayısıyla girilen setlerde belirsizlik ancak kaynak kovaryans matrisini verirse (delta yöntemi) hesaplanır; yoksa "belirsizlik bilgisi yok" yazılır.

Kabul: sabit tohumla tekrarlanabilir; bağımsız Python bootstrap uygulamasıyla aynı tohum ve aynı yeniden örnekleme sırası kullanıldığında aynı sonuçlar; delta yöntemi sayısal türevle doğrulanır.
~~~

## 4. Meşcere yapısı ve rekabet (Stand Structure & Competition)

Amaç: örnek alan × dönem başına çap/boy yapısı, sıklık ölçüleri, (koordinat varsa) mekânsal yapı ve ağaç düzeyinde rekabet endeksleri.

### 4.1. Ölçüler

**Mekândan bağımsız (koordinat gerekmez):**

| Ölçü | Tanım | Not |
|---|---|---|
| Çap ÇK, çarpıklık, basıklık | ağaç düzeyinde, n bölen (tanım yazılır) | |
| Gini katsayısı | göğüs yüzeyi üzerinden (ağaç başına g); formül ve sıralama yönü METHODS'ta | çap üzerinden Gini ayrı seçenek, ayrı etiket |
| Shannon çeşitliliği | çap sınıfı oranları üzerinden H' = −Σ p ln p | sınıf genişliği ve başlangıcı ayar; sonuçta yazılır |
| Tür karışımı | tür oranları, Shannon ve Simpson | tür sütunu varsa |
| BAL | ağaçtan kalın ağaçların hektardaki göğüs yüzeyi toplamı (m²/ha) | eşit çaplar: dahil mi değil mi ayar ve yazılır |
| Göreli büyüklük | d_i / Dq ya da g_i / ortalama g | |
| SDI (Reineke) | SDI = N·(Dq/25)^β, varsayılan β = 1.605, kullanıcı değiştirebilir | metrik dayanak çap 25 cm; β'nın kaynağı yazılır |
| Göreli aralık (Hart–Becking) | S% = 100·a/H0; kare dikimde a = √(10000/N), üçgen dikimde a = √(2·10000/(N√3)) | dikim düzeni seçimi yazılır |
| Curtis göreli sıklığı | RD = G/√Dq | birimleri yazılır |

**Mekânsal (x, y ve örnek alan sınırı gerekir):** Clark–Evans R (sınır düzeltmesiz ve Donnelly düzeltmeli), düzgün açı endeksi W, karışım M, çap farklılaşması T, baskınlık U (k = 4 en yakın komşu varsayılan, k ayar), Hegyi rekabet endeksi CI_i = Σ_j (d_j/d_i)/dist_ij (yarıçap R içindeki komşular ya da k en yakın; seçim yazılır).

**Kenar etkisi:** seçenekler "düzeltme yok", "tampon" (sınıra belirli uzaklıktaki ağaçlar yalnızca komşu olur, endeks hesaplanmaz) ve dikdörtgen alanlarda "toroidal öteleme". Seçim her sonuçta yazılır; düzeltme yokken kenar ağaçları ayrıca işaretlenir.

Örnek alan geometrisi (daire: merkez ve yarıçap; dikdörtgen: köşeler) kullanıcı verir. Koordinatlar alan dışındaysa satır numarasıyla raporlanır.

### 4.2. Promptlar

### SS01 — Mekândan bağımsız yapı ve sıklık

~~~text
TOOLS_SPEC Bölüm 4.1'deki mekândan bağımsız ölçüleri yaz (assets/lab/structure/calc.js, DOM'suz). Örnek alan × dönem birimi ve genişletme faktörü Örnek Alan ve Meşcere aracıyla aynı tanımlardır; kod paylaşılır, yeniden yazılmaz. Her ölçünün tanımı, birimleri ve seçenekleri (sınıf genişliği, eşit çaplar kuralı, Reineke üssü, dikim düzeni) sonuç kaydına yazılır.

Kabul: Bölüm 8.3 değerleri geçmeli. Bağımsız referans tests/ref/make_structure_ss01.py: Gini için ayrı formül (ortalama mutlak fark / 2·ortalama) ile sıralamalı formülün eşitliği; Shannon için scipy.stats.entropy; BAL için kaba kuvvet çift döngü; ağırlıklı (genişletme faktörlü) hesaplar.
~~~

### SS02 — Mekânsal yapı

~~~text
Bölüm 4.1'deki mekânsal ölçüleri ekle: Clark–Evans (düzeltmesiz ve Donnelly), W, M, T, U ve kenar etkisi seçenekleri. Örnek alan geometrisi kullanıcıdan; koordinatlar alan dışında ise sorun olarak raporlanır. Komşu araması k-d ağacı ya da ızgara ile; n ≥ 10 000 ağaçta tarayıcı donmamalı (gerekirse Web Worker).

Kabul: düzenli ızgarada bilinen değerler (Bölüm 8.3: kare ızgarada R = 2, altıgen ızgarada R = 2.1491; kare ızgarada dört komşuyla W = 0); Poisson benzetiminde düzeltmesiz R'nin beklenen davranışı (kenar etkisi yüzünden 1'den büyük sapma) ve Donnelly düzeltmesinin bunu azalttığı gösterilir; bağımsız referans scipy.spatial.cKDTree ile ayrı yazılmış Python uygulaması.
~~~

### SS03 — Rekabet endeksleri

~~~text
Ağaç düzeyinde rekabet endekslerini ekle: mekândan bağımsız (BAL, göreli büyüklük) ve mekâna bağlı (Hegyi; yarıçap ya da k en yakın komşu). Kenar etkisi seçenekleri SS02 ile aynıdır. Çıktı ağaç tablosuna eklenmiş sütunlar olarak Excel'e yazılır (kaynak satırlar değişmeden, Örnek Alan aracının "ağaç verisine eklenmiş dışa aktarma" düzeniyle).

Kabul: Hegyi kaba kuvvet çift döngüyle aynı; tampon seçeneğinde tampondaki ağaçlara endeks verilmez ama komşu olarak sayılır; eşit konumlu iki ağaç (dist = 0) sorun olarak raporlanır, sonsuz endeks üretilmez.
~~~

### SS04 — Arayüz ve grafikler

~~~text
Meşcere yapısı aracının sayfasını (mescere-yapisi.php) ekle: veri (ağaç tablosu ya da onaylanmış veri; koordinatlar isteğe bağlı), ayarlar (ölçü grupları, örnek alan geometrisi, kenar etkisi, k ve yarıçap), sonuçlar (birim başına genel tablo; ayrıntılarda çap sınıfı histogramı, Lorenz eğrisi, koordinat varsa gövde haritası ve rekabet endeksi renklendirmesi). Gezgin (core/unitnav.js), Excel/CSV/JSON, kılavuz, site_tools satırı.

Kabul: e2e'de değerler motorla aynı; koordinatsız veride mekânsal ölçüler "koordinat yok" durumuyla gösterilir, boş ya da sıfır değil; telefon ve koyu tema kontrolü.
~~~

## 5. Biyokütle ve karbon (Biomass & Carbon)

Amaç: tek ağaç ve meşcere düzeyinde bileşen biyokütlesi (gövde, dal, yaprak/ibre, kök…), karbon ve CO₂ eşdeğeri; kullanıcının katsayılarıyla.

### 5.1. Yaklaşımlar

**A. Allometrik denklemler (ağaç düzeyi).** Kayıtlı biçimler (ilk kapsam):

| Kimlik | Biçim |
|---|---|
| `pow.d` | B = a·D^b |
| `pow.dh` | B = a·D^b·H^c |
| `pow.d2h` | B = a·(D²H)^b |
| `lin.d2h` | B = a + b·D²H |
| `log.d` | ln B = a + b·ln D |
| `log.dh` | ln B = a + b·ln D + c·ln H |

Logaritmik biçimlerde geri dönüşüm düzeltmesi açık bir seçimdir: yok; Baskerville CF = exp(SEE²/2) (SEE kaynaktan, doğal logaritma ölçeğinde); Snowdon oranı (kaynaktan); kullanıcı tanımlı etken. log10 ile verilmiş denklemler ayrı `transform.kind` ile tutulur; ln'ye sessizce çevrilmez. Her bileşen ayrı katsayı setidir; "toplam" ayrıca bir denklemse, bileşenlerin toplamıyla farkı uyarı olarak gösterilir (toplanabilirlik garanti değildir).

**B. Hacimden dönüşüm (meşcere ya da ağaç).** B = V × ρ × BEF × (1 + R): V gövde hacmi (m³; Seksiyon hacmi aracından ya da elle; Örnek Alan ve Meşcere aracında hacim hesabı yoktur, T00 §5), ρ temel odun yoğunluğu (Mg kuru madde / m³ taze hacim), BEF biyokütle genişletme faktörü (gövde → toprak üstü), R kök/gövde oranı. Hepsi kullanıcı girişi (K1). Hacmin kabuklu/kabuksuz olduğu ve katsayıların hangisiyle tanımlandığı eşleşmelidir; eşleşmezse hesaplanmaz.

**Karbon:** C = B × CF (bileşen başına CF kullanıcıdan), CO₂ = C × 44/12. Meşcere düzeyinde genişletme faktörüyle Mg/ha.

### 5.2. Promptlar

### BC01 — Biyokütle çekirdeği ve katsayı biçimleri

~~~text
TOOLS_SPEC Bölüm 5.1'e göre biyokütle ve karbon hesap çekirdeğini yaz (assets/lab/biomass/calc.js). Allometrik biçimler kayıtlı kimliklerle; logaritmik biçimlerde düzeltme seçenekleri ve log10/ln ayrımı açık. Hacimden dönüşüm yaklaşımı ayrı yöntemdir. Karbon ve CO2 dönüşümleri. Bileşen başına sonuç, toplam, toplanabilirlik farkı.

Geçerlilik aralığı dışındaki ağaçlar hesaplanır ve uyarı alır; sayıları raporlanır. Eksik boy (H gereken biçimlerde) "hesaplanmadı" durumudur; boy tahmini Boy–Çap aracında yapılır ve tahmini boylar height_source ile ayrı işaretlenir, sonuçta kaç ağacın tahmini boyla hesaplandığı yazılır.

Kabul: her biçim için elle doğrulanabilir değerler (Bölüm 8.4); Baskerville etkeni exp(s²/2) ile; log10 biçimi ln biçimine çevrilerek hesaplanan bağımsız Python referansıyla aynı; birimler (kg ağaç, Mg/ha meşcere) testli.
~~~

### BC02 — Arayüz

~~~text
Biyokütle ve karbon aracının sayfasını (biyokutle-karbon.php) ekle. Veri: ağaç tablosu ya da onaylanmış veri; tür eşlemesi (veri türü kodu → katsayı seti; eşlenmeyen türler raporlanır, sessizce başka türün denklemiyle hesaplanmaz). Ayarlar: yaklaşım, bileşenler, katsayı setleri (T01 kaydından), karbon oranları. Sonuç: örnek alan × dönem başına bileşen biyokütlesi, karbon, CO2 (Mg/ha); ağaç tablosuna eklenmiş dışa aktarma; her sayının hangi katsayı setinden geldiği.

Kabul: e2e'de değerler motorla aynı; eşlenmeyen tür ve eksik boy durumları satır numarasıyla; kaynak alanı Excel "Bilgi" sayfasında.
~~~

### BC03 — Seksiyon hacmi aracıyla bağlantı

~~~text
Hacimden dönüşüm yaklaşımı için girdi olarak Seksiyon hacmi aracının ağaç hacimlerini tarayıcı deposu üzerinden okumayı ekle (Örnek Alan ve Meşcere aracında hacim hesabı yoktur; T00 §5) (forest-dataset/1 'derived' bölümüne yeni bir sürüm numarasıyla yazılır; şema değişikliği PROJECT.md §4b'ye işlenir). Kabuklu/kabuksuz eşleşmesi zorunlu.

Kabul: aynı ağaçlar için iki yol (allometrik ve hacimden) ayrı satırlarda; araçlar arası aktarımda değerler bit düzeyinde aynı; eski şema sürümü okunabiliyor.
~~~

### BC04 — İsteğe bağlı: belirsizlik

~~~text
(İsteğe bağlı.) Katsayı kovaryansı ve artık varyansı kaynakta verilmişse Monte Carlo ile ağaç ve örnek alan düzeyinde belirsizlik. Verilmemişse hesaplama yapılmaz ve "belirsizlik bilgisi yok" yazılır. Tohum, tekrar sayısı ve varsayımlar (normal hata, bağımsızlık) sonuçta yazılır.
~~~

## 6. Gövde profili ve ürün hacmi (Taper & Assortment)

Amaç: gövde profili denklemiyle herhangi bir yükseklikteki çap, herhangi bir çapın yüksekliği, parça hacimleri ve kullanıcı tanımlı ürün (sortiman) bölmesi.

### 6.1. Profil denklemleri

İlk kapsam, kaynağı okunduktan sonra eklenecek biçimler:

| Kimlik | Biçim | Not |
|---|---|---|
| `mb76` | Max ve Burkhart (1976) parçalı polinom: y = d²/D², x = h/H; y = b₁(x − 1) + b₂(x² − 1) + b₃(a₁ − x)²·I₁ + b₄(a₂ − x)²·I₂, I_i = 1 (x ≤ a_i) | hacim integrali kapalı biçimde; **künye ve biçim kaynaktan doğrulanacak [D]** |
| `kozak04` | Kozak (2004) değişken üslü model | biçim bu belgeye yazılmadı; kaynaktan birebir alınacak |

- d(h) kabuklu ya da kabuksuz tanımlıdır (katsayı setinin `output.bark`'ı). Kabuk modeli ayrı bir katsayı setidir (`tool: 'bark'`).
- Hacim: V(h₁, h₂) = (π/40000)·∫ d(h)² dh. Kapalı biçim varsa o, yoksa uyarlamalı Gauss–Legendre; ikisi testte karşılaştırılır.
- Verilen çapın yüksekliği: d(h) = d* denkleminin kökü (Brent; d(h) yükseklikle azalmıyorsa birden çok kök olabilir, hepsi raporlanır).
- Tutarlılık kontrolleri (biçime göre): d(H) = 0, d(1.3) ≈ D (bazı biçimlerde tam değildir; fark raporlanır).

### 6.2. Ürün bölme (sortiman)

- Ürün tanımı (kullanıcı): ad, en küçük ince uç çapı (kabuklu/kabuksuz), boy (sabit ya da en az–en çok ve adım), kesim payı (trim, cm), öncelik ve isteğe bağlı birim değer (para birimi kullanıcıdan; araç fiyat önermez).
- Dip kütük yüksekliği ve kullanılabilir tepe çapı ayardır.
- Algoritmalar: (1) **öncelik sırası (açgözlü):** dipten başlayarak sıradaki en yüksek öncelikli ürün sığdığı sürece; (2) **en yüksek değer (dinamik programlama):** gövde uzunluğu adım (varsayılan 0.1 m, ayar) ızgarasında, ürünlerin değer toplamını en büyükleyen kesim. İkisi ayrı yöntemdir; seçilen yöntem ve adım sonuçta yazılır.
- Çıktı: ağaç başına parçalar (alt/üst yükseklik, ince uç çapı, uzunluk, hacim, ürün), ürün başına toplam hacim ve sayı, artık (kullanılamayan) hacim.

### 6.3. Promptlar

### TP01 — Profil çekirdeği

~~~text
TOOLS_SPEC Bölüm 6.1'e göre gövde profili çekirdeğini yaz (assets/lab/taper/calc.js). Önce Max ve Burkhart (1976) kaynağını oku; biçimi ve parametre adlarını kaynakla karşılaştır, METHODS.md'de [B] olarak işaretle. Kaynak okunamazsa biçimi ekleme, kullanıcıya bildir. d(h), h(d), V(h1, h2), kabuk modeli uygulaması, tutarlılık kontrolleri.

Kabul: kapalı biçim hacim ile sayısal integral 1e−10 göreli içinde aynı; h(d) kökü d(h)'yi 1e−10 içinde geri verir; bağımsız referans tests/ref/make_taper_tp01.py (scipy.integrate.quad, brentq; denklemi ayrı yazılmış Python). Kozak (2004) ancak kaynağı okunduktan sonra, ayrı bir alt aşamada aynı kabul ölçütleriyle eklenir.
~~~

### TP02 — Profil denklemi uydurma

~~~text
Gövde ölçüm verisinden (stem-sections/1, Seksiyon hacmi aracıyla aynı içe aktarma) profil denklemi uydurmayı ekle (core/nls.js). Aynı ağacın ölçümleri bağımsız değildir: standart hatalar "bağımsız varsayımıyla" etiketlenir; karma etkili uydurma bu pakette yok. Çıktı: katsayılar, RMSE ve yanlılık (yükseklik sınıflarına göre), artık grafikleri, Seksiyon hacmi aracının Newton/Smalian hacimleriyle profil integrali hacminin ağaç başına karşılaştırması. Başarılı set katsayı kaydına yazılabilir.

Kabul: katsayılar scipy.optimize.least_squares ile 1e−6 göreli içinde aynı; bilinen katsayılarla üretilmiş benzetim verisinde katsayılar geri gelir.
~~~

### TP03 — Ürün bölme

~~~text
Bölüm 6.2'ye göre ürün bölmeyi ekle: öncelik sırası ve dinamik programlama yöntemleri, kesim payı, dip kütük, kullanılabilir tepe çapı. Ürün tanımları JSON olarak kaydedilip yüklenebilir.

Kabul: dinamik programlama küçük örneklerde (≤ 8 m gövde, 0.5 m adım) bütün kesim kombinasyonlarını deneyen kaba kuvvet aramayla aynı en yüksek değeri bulur (bağımsız Python referansı); parça hacimlerinin toplamı + artık hacim = toplam gövde hacmi (1e−10); her parçanın ince uç çapı ürünün en küçük çapından küçük değildir.
~~~

### TP04 — Arayüz

~~~text
Gövde profili aracının sayfasını (govde-profili.php) ekle: katsayı seti seçimi ya da uydurma; tek ağaç (D, H) ya da ağaç tablosu girdisi; profil grafiği (kabuklu ve kabuksuz), parça çizimi (ürünler renkli ve desenli; yalnız renge dayanmadan), ürün özeti tablosu, Excel/CSV/JSON, kılavuz, site_tools satırı.

Kabul: e2e'de değerler motorla aynı; ürün tanımı değişince bölme değişir; telefon ve koyu tema kontrolü.
~~~

### TP05 — İsteğe bağlı: meşcere düzeyi ürün tablosu

~~~text
(İsteğe bağlı.) Örnek alan ağaç tablosunun bütün ağaçlarını bölüp hektara genişletilmiş ürün tablosu üret (ürün × çap sınıfı). Boyu ölçülmemiş ağaçlar Boy–Çap aracının tahminleriyle ancak kullanıcı seçerse ve ayrı işaretlenerek kullanılır.
~~~

## 7. Ortak geliştirme talimatı

İlk mesajda T00 ile birlikte gönder:

~~~text
Platforma TOOLS_SPEC.md'deki beş yeni aracı aşamalı ekleyeceğiz. CLAUDE.md, PROJECT.md (özellikle §5 ortak kurallar ve §6 arayüz ilkeleri) ve METHODS.md bağlayıcıdır. Önce mevcut kodu incele; mevcut çekirdeği (içe aktarma, gezgin, grafik, dışa aktarma, nls, roots, quad, stats) yeniden kullan, yeniden yazma.

Her mesajda yalnızca belirtilen promptun kapsamını uygula. Tür/yöre katsayısı, hasılat tablosu, karbon oranı, odun yoğunluğu veya kaynak uydurma; katsayıları kullanıcı girer (TOOLS_SPEC K1). Bir kaynağın denklemini uygulamadan önce kaynağı oku ve METHODS.md'de [B] olarak işaretle; okuyamıyorsan dur ve bildir.

Hesap arayüzden ayrıdır. Her bilimsel hesabı bağımsız referansla doğrula (tests/ref altında Python üretici + tests altında test); yalnızca kendi fonksiyonunu yineleyen testlerle yetinme. Hesaplanamayan değeri sayı gibi gösterme. Kabuklu/kabuksuz, yaş türü, birimler ve seçilen kurallar her sonuçta yazılsın.

Her aşama sonunda: değişen davranış, çalıştırılan testler, bilinen sınırlamalar; METHODS.md ve PROGRESS.md güncellenir, ayrı commit. Yayına alma (main'e birleştirme) ayrı kullanıcı kararıdır; push'tan önce bütün testler çalıştırılır.
~~~

### T00 — İnceleme (kod değişmez)

~~~text
TOOLS_SPEC'teki beş araç için mevcut kodu incele ve docs/TOOLS_T00.md raporunu yaz: yeniden kullanılacak çekirdek modüller ve eksikleri; Örnek Alan ve Meşcere aracında paylaşılması gereken hesaplar (genişletme faktörü, H0, D0, birim × dönem gruplama) ve bunların paylaşılabilir hâle getirilmesi için gereken en küçük değişiklik; forest-dataset/1 ve yeni stem-sections/1 ile model-coef/1 sözleşmelerinin mevcut koda etkisi; site_cats/site_tools/kılavuz/atıf testlerine etkileri; Bölüm 0 kararlarıyla çelişen bir durum varsa listesi. Kod değiştirme.
~~~

### T01 — Ortak altyapı: katsayı kaydı ve gövde ölçüm sözleşmesi

~~~text
TOOLS_SPEC Bölüm 1.2 ve 1.3'ü uygula: model-coef/1 kaydı (core/coef.js: doğrulama, IndexedDB'de saklama, JSON içe/dışa aktarma, kaynak alanı zorunlu, biçim kaydı arayüzü) ve ortak katsayı seti düzenleyici bileşeni (core/coef-ui.js; biçimin formülünü gösterir, parametreleri, birimleri, geçerlilik aralığını, dönüşüm/düzeltmeyi ve kaynağı alır). stem-sections/1 okuyucusu ve kontrolleri (core/stems.js). core/store.js'e anahtar önekiyle listeleme; core/num.js UNITS'e kabuk kalınlığı (mm) ve yaş; dağılım motorundaki çoklu kök tarayıcısını (scanRoots) davranışı değişmeden core/roots.js'e taşı. Örnek Alan aracının paylaşılacak işlevleri (validateDataset, buildUnits, unitMetrics, dominantWeights/dominant, sınıf işlevleri, tableToDataset) taşınmaz: yeni araçlar ../stand/calc.js'ten doğrudan içe aktarır; bu işlevlerin girdi/çıktı sözleşmesi METHODS §6'ya yazılır (T00 §2). tests/site/test_guide.mjs ve test_cite.mjs'teki sabit araç sayısını site_tools() satırlarından okunacak hâle getir. Kenar çubuğu kategorileri bu aşamada eklenmez; her kategori ilk aracıyla (SV02, SI02) eklenir (T00 §5).

Kabul: model-coef/1 doğrulayıcısı geçersiz setleri (kaynak yok, bilinmeyen biçim, eksik parametre, birim yok) reddeder; JSON gidiş-dönüş bit düzeyinde aynı; stem-sections kontrolleri Bölüm 1.2'deki her durum için satır numarasıyla sorun üretir; katsayı düzenleyicisi yayınlanmayan bir test sayfasında tarayıcı testinden geçer; dağılım, Örnek Alan ve site testleri değişmeden geçer.
~~~

## 8. Bağımsız sayısal referanslar

Bu değerler 12 Kasım 2026'da Python (SciPy 1.18.1, NumPy 2.5.3) ile hesaplandı. Sitedeki koda ait değildir; geliştirilecek kodun karşılaştıracağı referanslardır.

### 8.1. Seksiyon hacmi: bilinen cisimler

Dip çapı 30 cm, boy L = 20 m; g(h) = g₀(1 − h/L)^r. Hacimler m³.

| Cisim | Tam | Huber (1 seksiyon) | Smalian (1) | Newton (1) | Huber (4 × 5 m) | Smalian (4 × 5 m) |
|---|---:|---:|---:|---:|---:|---:|
| Paraboloit (r = 1) | 0.706858347058 | 0.706858347058 | 0.706858347058 | 0.706858347058 | 0.706858347058 | 0.706858347058 |
| Koni (r = 2) | 0.471238898038 | 0.353429173529 | 0.706858347058 | 0.471238898038 | 0.463875790257 | 0.485965113602 |
| Neiloit (r = 3) | 0.353429173529 | 0.176714586764 | 0.706858347058 | 0.353429173529 | 0.342384511856 | 0.375518496874 |

Hohenadl (beş seksiyon) koni üzerinde: 0.466526509058 m³.

### 8.2. Bonitet: özdeşlikler

Sayısal değer yerine özellik testleri (her biçim, rastgele 1000 durum): f(A₁, A₁, H₁) = H₁; f(A₃, A₂, f(A₂, A₁, H₁)) = f(A₃, A₁, H₁); SI₅₀ ve SI₁₀₀ arasında f(100, 50, SI₅₀) = SI₁₀₀. Referans betiği temel modelden (fark denklemi kullanmadan) aynı değerleri üretir.

### 8.3. Meşcere yapısı

| Durum | Değer |
|---|---:|
| SDI, N = 800 ağaç/ha, Dq = 20 cm, β = 1.605 | 559.177149815208 |
| Hart–Becking S%, N = 800, H0 = 20 m, kare dikim | 17.677669529664 |
| Hart–Becking S%, aynı, üçgen dikim | 18.995892141290 |
| Clark–Evans R, sonsuz kare ızgara | 2 |
| Clark–Evans R, sonsuz altıgen ızgara | 2.149139863647 |
| W, kare ızgara, k = 4, standart açı 72° | 0 |

Izgara değerleri sınır etkisi olmayan (ya da toroidal düzeltmeli) durum içindir.

### 8.4. Biyokütle ve karbon

| Durum | Değer |
|---|---:|
| CO₂/C molar kütle oranı | 44/12 = 3.666666666667 |
| Baskerville etkeni, SEE = 0.2 (ln ölçeği) | exp(0.02) = 1.020201340027 |

Allometrik biçimlerin kendisi için test değerleri, bağımsız referans betiğinde (`tests/ref/make_biomass_bc01.py`) rastgele katsayı ve ağaçlarla üretilir; burada sabit katsayı verilmez (gerçek bir türün katsayısı izlenimi vermemek için).

## 9. Kaynaklar (hepsi [D]: okunmadı, künye bilgiden; uygulamadan önce okunacak)

- Avery, T.E., Burkhart, H.E. *Forest Measurements* (5. baskı, 2002). Seksiyon formülleri, biçim sayısı, bonitet kavramları. (Huber, Smalian ve Newton formülleri için ders kitabı tanımı istisnası, 12 Kasım 2026 kullanıcı kararı: METHODS §14. Hohenadl: Heger 1965 okundu [B].)
- Kershaw, J.A., Ducey, M.J., Beers, T.W., Husch, B. *Forest Mensuration* (5. baskı, 2016). Seksiyon hacmi, gövde profili, meşcere sıklığı.
- West, P.W. *Tree and Forest Measurement* (2. baskı, 2009). Seksiyon formülleri, biyokütle.
- Burkhart, H.E., Tomé, M. *Modeling Forest Trees and Stands* (2012). Bonitet (fark denklemleri), gövde profili, rekabet endeksleri.
- Bailey, R.L., Clutter, J.L. 1974. Base-age invariant polymorphic site curves. *Forest Science* 20: 155–159.
- Cieszewski, C.J., Bailey, R.L. 2000. Generalized algebraic difference approach: theory based derivation of dynamic site equations with polymorphism and variable asymptotes. *Forest Science* 46: 116–126.
- Clark, P.J., Evans, F.C. 1954. Distance to nearest neighbor as a measure of spatial relationships in populations. *Ecology* 35: 445–453.
- Donnelly, K.P. 1978. Simulations to determine the variance and edge effect of total nearest-neighbour distance. (Hodder, I. (ed.), *Simulation Studies in Archaeology*, Cambridge University Press.)
- Pommerening, A. 2002. Approaches to quantifying forest structures. *Forestry* 75: 305–324. (W, M, T, U ve kenar düzeltmeleri.)
- Hegyi, F. 1974. A simulation model for managing jack-pine stands. (Fries, J. (ed.), *Growth Models for Tree and Stand Simulation*, Royal College of Forestry, Stockholm.)
- Reineke, L.H. 1933. Perfecting a stand-density index for even-aged forests. *Journal of Agricultural Research* 46: 627–638.
- Curtis, R.O. 1982. A simple index of stand density for Douglas-fir. *Forest Science* 28: 92–94.
- Max, T.A., Burkhart, H.E. 1976. Segmented polynomial regression applied to taper equations. *Forest Science* 22: 283–289.
- Kozak, A. 2004. My last words on taper equations. *The Forestry Chronicle* 80: 507–515.
- Baskerville, G.L. 1972. Use of logarithmic regression in the estimation of plant biomass. *Canadian Journal of Forest Research* 2: 49–53.
- Sprugel, D.G. 1983. Correcting for bias in log-transformed allometric equations. *Ecology* 64: 209–210.
- Snowdon, P. 1991. A ratio estimator for bias correction in logarithmic regressions. *Canadian Journal of Forest Research* 21: 720–724.
- IPCC 2006. *2006 IPCC Guidelines for National Greenhouse Gas Inventories*, Cilt 4 (AFOLU), Bölüm 4 (Forest Land). Hacimden biyokütleye dönüşüm ve karbon oranı kavramları; varsayılan değerleri bu araçlara gömülmez (K1).
- Pnevmaticos, S.M., Mann, S.H. 1972. Dynamic programming in tree bucking. *Forest Products Journal* 22(2): 26–30.
