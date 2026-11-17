# Platform planı: modüller ve araç kataloğu

Kullanıcının 12 Kasım 2026'da yüklediği "Forest Biometry Online — Platform Revision Plan" belgesinin, projenin
bağlayıcı kurallarına (CLAUDE.md, docs/PROJECT.md, TOOLS_SPEC K1–K9) göre düzenlenmiş hâli. Sitenin kenar çubuğu ve
araçlar dizini bu katalogdan çizilir (`inc/catalog.php`); bu belge ile o dosya birlikte güncellenir.

## 1. Vizyon ve ilkeler

Ormancılar, araştırmacılar ve öğrenciler için tek ağaçtan bütün envantere kadar ölçen, kestiren, modelleyen ve
raporlayan, yöntemleri şeffaf, kaynaklı ve tekrarlanabilir açık kaynaklı bir araç platformu.

- **Yalnızca hesap araçları:** her araç girdi alır, hesaplanmış, modellenmiş ya da görselleştirilmiş çıktı verir.
- **Ortak veri:** araçlar aynı veri sözleşmelerini okur ve yazar (`forest-dataset/1`, `stem-sections/1`,
  `model-coef/1`; PROJECT.md §4b, TOOLS_SPEC §1).
- **Şeffaf yöntem:** her denklemin formülü, kaynağı (METHODS.md'de [B]/[İ]/[P]/[A]/[D]), birimleri ve geçerlilik aralığı yazılır.
- **Tekrarlanabilirlik:** her sonuç girdileri, ayarları, yöntem sürümleri ve kaynaklarıyla dışa aktarılır; sürümlü
  arşiv Zenodo DOI'siyle.
- **Açıklık:** kaynak kodu Apache-2.0, belgeler CC BY 4.0.

## 2. Bağlayıcı kararlar (12 Kasım 2026, kullanıcı)

| No | Karar |
|---|---|
| P1 | **Sunucu yok:** REST API, sunucu tarafı hesap (Python/R), veritabanı (PostgreSQL/PostGIS) ve kullanıcı hesapları kapsam dışıdır. Hesaplar tarayıcıda (JS; ağır işler Web Worker'da) yapılır, veri tarayıcıdan çıkmaz. "Proje" tarayıcıda (IndexedDB) tutulur, dosya olarak dışa ve içe aktarılır. Hesap motorları DOM'suzdur ve Node'da da çalışır; bu, API'nin yerine geçen belgelenmiş yoldur. |
| P2 | **Yerleşik katsayı yok (K1 korunur):** "tür ve yöre seçmeli denklem veritabanı" kullanıcının kendi kaynaklı katsayı kütüphanesidir (`model-coef/1`, kaynak alanı zorunlu). Hazır bir set ancak kaynağı okunup [B] işaretlenince, ayrı bir aşama olarak eklenir. IPCC ve benzeri varsayılan değerler gömülmez. |
| P3 | **Kalıcı araç kimlikleri `MODÜL-NN`:** sayfalar, testler, belgeler ve sorunlar bu kimlikle anılır. Bir sayfa birden çok kimliği karşılayabilir. Aşamalar araç kimliğine bağlanır: `<KİMLİK>/a<n>` (ör. `SS-07/a1`). TOOLS_SPEC ve DIST_SPEC'teki eski aşama kodları (SV01, SI01, SS01, P01…) geçmiş kayıtlarda olduğu gibi kalır; eşlemeleri Bölüm 5'te. |
| P4 | **Kapsam dışı:** ML-02, ML-03, SQ-04, GY-08, DS-03 ve DI-06 (API). SV-05 düşük öncelikli. |
| P5 | **Birimler:** platform metriktir; gerekirse girişte birim dönüştürme yapılır, hesap ve çıktı metrik kalır. |
| P6 | **Sayfa adresleri değişmez** (DOI'li atıflar ve kılavuz bağlantıları). Yeni araçlar Türkçe sayfa adı ve İngilizce kod klasörüyle eklenir (K2). Plandaki uzun İngilizce yollar yalnızca belge kimliğidir. |
| P7 | **Çıktılar:** Excel, CSV, JSON (yöntem bilgileriyle) ve SVG grafik. PDF rapor DI-05 aşamasında ayrıca değerlendirilir (derleme adımı ve sunucu olmadan). DI-05/a1 (16 Kasım 2026): rapor yazdırılabilir HTML'dir; PDF tarayıcının yazdırma penceresinden ("PDF olarak kaydet") alınır, PDF kütüphanesi eklenmedi. |

Plandaki "Açık kararlar" bu kararlarla kapandı: teknoloji mevcut PHP 7.4+ ve tarayıcı JS (derleme adımı yok); hesap
yeri tarayıcı; veritabanı ve kullanıcı hesabı yok; lisans Apache-2.0 ve CC BY 4.0; başlangıç tür/yöre kapsamı yok (P2).

## 3. Durum anahtarı

**yayında** bir sayfa karşılıyor · **yolda** geliştiriliyor, sayfası yok · **planlı** · **kapsam dışı** sitede
gösterilmez. Kaynak sütunu, uygulamadan önce okunması gereken kaynakları ve durumlarını gösterir; "kullanıcıdan PDF"
yazan yerlerde aşamaya geçmeden önce kaynak istenir.

## 4. Araç kataloğu

### DI — Veri altyapısı

| Kimlik | Araç | Durum | Sayfa | Not ve kaynak |
|---|---|---|---|---|
| DI-01 | Veri içe aktarma ve denetim | yayında | `veri-denetcisi.php` | Ormancılık Verisi Denetçisi |
| DI-02 | Katsayı ve denklem kütüphanesi | yayında | `katsayi-kutuphanesi.php` | Kütüphane çekirdeği `core/coef.js`, `core/coef-ui.js`. DI-02/a1 (16 Kasım 2026, kullanıcı kararı: merkezî yönetim): bütün araçların setleri tek sayfada (`assets/lab/coeflib/`), süzme/arama, ayrıntı, aynı düzenleyiciyle düzenleme, kopya, silme, aynı katsayılı ve sorunlu setler, tek dosyayla yedek ve önizlemeli geri yükleme; 1.0.0-beta.1, yayına alındı (16 Kasım 2026, kullanıcı kararı). Yerleşik set yok (P2) |
| DI-03 | Proje ve envanter verisi yöneticisi | yayında | `veri-yoneticisi.php` | Tarayıcıda (P1); örnek alan–ağaç–ölçüm hiyerarşisi `forest-dataset/1` ile. DI-03/a1 (16 Kasım 2026, kullanıcı kararı: çoklu veri paketi + etkin paket; yalnızca üst bilgi düzenlenir): Envanter Verisi Yöneticisi 1.0.0-beta.1 (`forest-project/1`, PROJECT §4b): proje bilgileri, örnek alan × dönem özeti, etkin paket (`dataset:approved`, araçlar değişmedi), içe/dışa aktarma ve önizlemeli yedek, kopya, silme; Veri Denetçisi 1.2.0 onayları listeye ekler; yayına alındı (16 Kasım 2026, kullanıcı kararı). Sonraki: dönem birleştirme (SI-09'un zemini), paketi Denetçi'de yeniden açma. |
| DI-04 | Görselleştirme panosu | yayında | `pano.php` | DI-04/a1 (16 Kasım 2026, kullanıcı kararı: paket + çalışma kayıtları; hazır paneller + süzgeç): Görselleştirme Panosu 1.0.0-beta.1: özet, çap dağılımı, tür katılımı, örnek alan başına N/ha ve G/ha, boy–çap, ağaç haritası; dönem, tabaka, tür, örnek alan süzgeçleri; Çap Dağılımı kayıtlarından yoğunluklar, Boy–Çap kayıtlarından eğriler (METHODS §21). Yayına alındı (16 Kasım 2026, kullanıcı kararı). Sonraki: öteki araçların kayıtları (bonitet, meşcere yapısı), serbest grafik kurucu. |
| DI-05 | Rapor üretici | yayında | `rapor.php` | P7. DI-05/a1 (16 Kasım 2026, kullanıcı kararları: yazdırılabilir HTML; paket + çalışma kayıtları; seçilebilir bölümler + başlık ve notlar): Rapor Üretici 1.0.0-beta.1: rapor bilgileri, rapor dili TR/EN, veri paketi özeti ve örnek alan × dönem tablosu, pano grafikleri (süzgeçli, kayıt eğrileriyle), çalışma kayıtlarının ayarları ve sonuç tabloları, kaynaklar (platform ve araç atıfları, kayıtlardaki kaynaklar, kullanıcı katsayı kaynakları), tekrarlanabilirlik eki; tarayıcıdan yazdırma/PDF ve tek başına açılan HTML. Yayına alındı (16 Kasım 2026, kullanıcı kararı). |
| DI-06 | API ve betik arayüzü | kapsam dışı | – | P1; yerine Node'da çalışan motorlar ve planlı "R kodunu da ver" düğmesi. |
| DI-07 | Tekrarlanabilirlik katmanı | yayında | `kayit-dogrulayici.php` | DI-07/a1 (16 Kasım 2026, kullanıcı kararı: ortak kayıt + doğrulayıcı; girdi varsayılan olarak yalnızca parmak izi, veri gömme isteğe bağlı): bütün araçların JSON indirmesi `run-record/1` (PROJECT §4c, METHODS §20): araç, sürüm, katalog kimlikleri, yayındaki commit, ayarlar, girdi SHA-256'ları, RFC 8785 + SHA-256 mührü; JSON'u olmayan beş araca (boy–çap SM-01, model değerlendirme ve nispi sıralama SM-06, örnekleme SI-01, örnek alan SI-03) kayıt indirmesi. Kayıt Doğrulayıcı 1.0.0-beta.1; yayına alındı (16 Kasım 2026, kullanıcı kararı). Sonraki: kaydı aracında yeniden açıp hesabı tekrarlama ve karşılaştırma; Zenodo DOI. |

### TM — Ağaç ölçümü

Kararlar (17 Kasım 2026, kullanıcı): (1) TM araçlarına bir ölçme bilgisi kitabı (Kershaw ve ark. 2016, van Laar ve Akça 2007 ya da Türkçe bir ölçme bilgisi kitabı) Drive'a eklendikten sonra başlanır; tanım formülleri de ondan okunup [B] işaretlenir, tanım istisnası kullanılmaz. (2) TM-01, TM-02, TM-04 ve TM-06 tek "Ağaç Ölçümü" sayfasında; TM-03 (kabuk, katsayı seti ister) ve TM-05 (halka ve burgu verisi) ayrı sayfalar. (3) TM modülünü `claude/nifty-hamilton-oi0q51` oturumu yürütür; öteki oturumlar TM'ye dokunmaz.

| Kimlik | Araç | Durum | Not ve kaynak |
|---|---|---|---|
| TM-01 | Boy hesaplayıcı (eğim ölçer, tanjant, sinüs, eğim düzeltmesi) | yayında | Sayfa `agac-olcumu.php` (yayına alındı 17 Kasım 2026, kullanıcı kararı). TM-01/a1 (17 Kasım 2026): boy çekirdeği `assets/lab/tree/height.js`; Hamilton 1975 ve Graves 1906 [B] (METHODS §23). Sayfa "Ağaç Ölçümü" TM-02, TM-04, TM-06 ile birlikte |
| TM-02 | Çap ve göğüs yüzeyi (çevre ↔ çap, düzensiz gövde) | yayında | Sayfa `agac-olcumu.php` (yayına alındı 17 Kasım 2026, kullanıcı kararı). TM-02/a1 (17 Kasım 2026): `assets/lab/tree/diameter.js`; Hamilton 1975 ve Graves 1906 [B] (METHODS §23) |
| TM-03 | Kabuk kalınlığı ve kabuksuz çap | planlı | Katsayılar kullanıcıdan (K1) |
| TM-04 | Tepe tacı ölçüleri | planlı | |
| TM-05 | Ağaç yaşı ve çap artımı (halka ve burgu verisi) | planlı | |
| TM-06 | Biçim sayısı ve biçim bölümü | yayında | Sayfa `agac-olcumu.php` (yayına alındı 17 Kasım 2026, kullanıcı kararı). Seksiyon Hacmi biçim sayısını ve Hohenadl biçim bölümlerini (Heger 1965 [B]) zaten veriyor. TM-06/a1 (17 Kasım 2026): `assets/lab/tree/form.js`; Graves 1906 [B] bölüm XIII (METHODS §23; kitaptaki biçim üssü örneğinde aritmetik hata bulundu) |

### SV — Gövde hacmi ve profili

| Kimlik | Araç | Durum | Sayfa | Not ve kaynak |
|---|---|---|---|---|
| SV-01 | Seksiyon hacmi (Huber, Smalian, Newton, Hohenadl) | yayında | `seksiyon-hacmi.php` | Huber/Smalian/Newton tanım istisnası [D]; Hohenadl Heger (1965) [B] |
| SV-02 | Gövde profili denklemleri (Max ve Burkhart, Kozak, değişken üslü) | yayında | `govde-profili.php` | TOOLS_SPEC TP01–TP02. SV-02/a1 (16 Kasım 2026): Max ve Burkhart (1976) Model 4 çekirdeği [B] (`assets/lab/taper/calc.js`). SV-02/a2 (16 Kasım 2026): Kozak (2004) Model 02 [B]. SV-02/a3 (16 Kasım 2026): gövde ölçümlerinden uydurma (TP02). Sayfa (TP04) 16 Kasım 2026, 1.0.0-beta.1; tepe çapına kadar kullanılabilir hacim de sayfada (SV-03'ün temeli) |
| SV-03 | Kullanılabilir hacim (profil integrali, tepe çapı ve tomruk boyu sınırları) | planlı | – | TP01–TP03 |
| SV-04 | Hacim denklemleri | planlı | – | TOOLS_SPEC SV04 (isteğe bağlı); katsayılar kullanıcıdan |
| SV-05 | Tomruk ölçüm kuralları (Doyle, Scribner, International ¼″, kübik) | planlı, düşük öncelik | – | ABD'ye özgü; P4 |
| SV-06 | Ürün bölme (sortiman) eniyileme | yayında | `govde-profili.php` | TP03. SV-06/a1 (16 Kasım 2026): öncelik sırası ve dinamik programlama çekirdeği (`assets/lab/taper/bucking.js`); Grondin (1998) ve Bennemann ve ark. (2025) [B]; Pnevmaticos ve Mann (1972) aktarılan [D]. Sayfa: Gövde Profili'nde ürün bölme bölümü (`govde-profili.php`, 1.0.0-beta.2; 16 Kasım 2026); yayına alındı (16 Kasım 2026, kullanıcı kararı) |

### BC — Biyokütle ve karbon

| Kimlik | Araç | Durum | Not ve kaynak |
|---|---|---|---|
| BC-01 | Allometrik biyokütle | yayında | TOOLS_SPEC BC01–BC02. BC-01/a1 = BC01 (16 Kasım 2026): çekirdek `assets/lab/biomass/calc.js`; biçimler tanım istisnası [D] (kullanıcı kararı); Baskerville düzeltmesi ln ölçeğinde [A] (Chave ve ark. 2014, Baia ve ark. 2025); log₁₀'da Sprugel 1983 bekleniyor; Snowdon ve kullanıcı etkeni değer olarak. Sayfa `biyokutle-karbon.php` BC02 ile (17 Kasım 2026, 1.0.0-beta.1) |
| BC-02 | Biyokütle bileşenleri (gövde, dal, yaprak, kök; toplamsal sistemler) | planlı | Toplamsal sistemler SM-04 ile |
| BC-03 | Biyokütle dönüşüm etkeni (BEF) | yayında | TOOLS_SPEC BC03; etkenler kullanıcıdan. BC01'de hacimden dönüşüm çekirdeği: IPCC 2006 Cilt 4 Bölüm 2 Denklem 2.8b [B] |
| BC-04 | Karbon stoku ve CO₂ eşdeğeri | yayında | K9: CO₂ = C × 44/12 (IPCC 2006 §2.2.3 [B]), karbon oranı kullanıcıdan. BC01'de çekirdek |
| BC-05 | IPCC karbon hesabı (katman 1–3) | planlı | IPCC 2006 Cilt 4: kullanıcıdan PDF; varsayılan değer gömülmez (P2) |
| BC-06 | Karbon belirsizliği (Monte Carlo) | planlı | TOOLS_SPEC BC04 |

### SS — Meşcere yapısı ve sıklığı

| Kimlik | Araç | Durum | Sayfa | Not ve kaynak |
|---|---|---|---|---|
| SS-01 | Meşcere özeti (N/ha, G/ha, Dq, üst boy) | yayında | `ornek-alan.php` | Örnek Alan ve Meşcere |
| SS-02 | Meşcere sıklık endeksleri (Reineke SDI, göreli sıklık, CCF, Curtis RD) | yayında | `mescere-yapisi.php` | SDI ve RD hazır (Reineke 1933, Curtis 1982 [B]); göreli aralık tanım istisnası; CCF için Krajicek ve ark. (1961): kullanıcıdan PDF |
| SS-03 | Çap dağılımı (Weibull, gamma, Johnson SB…; geri kazanım) | yayında | `cap-dagilimi.php` | Çap Dağılımı Laboratuvarı 2.2.0 |
| SS-04 | Çeşitlilik endeksleri (Shannon, Simpson, tür zenginliği) | yayında | `mescere-yapisi.php` | İstatistiksel tanım |
| SS-05 | Yapısal çeşitlilik endeksleri (Gini, karışım, farklılaşma) | yayında | `mescere-yapisi.php` | Gini tanım; M, T, U Pommerening (2002): yüklendi, doğrulama bekliyor |
| SS-06 | Mekânsal desen çözümlemesi (Ripley K/L, çift korelasyon, Clark–Evans) | yayında | `mescere-yapisi.php` | Clark–Evans ve Donnelly hazır (yüklendi, doğrulama bekliyor); Ripley K/L ve çift korelasyon işlevi için kaynak: kullanıcıdan PDF |
| SS-07 | Rekabet endeksleri (Hegyi; uzaklığa bağlı ve bağımsız) | yayında | `mescere-yapisi.php` | SS-07/a1 hesabı hazır (`structure/competition.js`); Hegyi (1974) geçici istisna, kullanıcıdan PDF |

### SQ — Yetişme ortamı verimliliği

| Kimlik | Araç | Durum | Sayfa | Not ve kaynak |
|---|---|---|---|---|
| SQ-01 | Bonitet endeksi | yayında | `bonitet.php` | Hernández-Cuevas ve ark. (2018) [B]; eğri kütüphanesi kullanıcıdan (P2) |
| SQ-02 | Bonitet eğrisi kurma (ADA/GADA uydurma) | yayında (ADA) | `bonitet.php` | GADA için Cieszewski ve Bailey (2000): kullanıcıdan PDF |
| SQ-03 | Büyüme işlevi uydurma (Chapman–Richards, Schumacher, Gompertz, logistik, monomoleküler, Weibull) | yayında | `buyume-islevi.php` | CR ve Schumacher [B] (Hernández-Cuevas ve ark. 2018); diğerleri [A] (Fekedulegn ve ark. 1999 + `growthmodels`); Korf kaynak bekliyor |
| SQ-04 | Çevresel verilerden verimlilik | kapsam dışı | – | P4 |

### SI — Örnekleme ve envanter

| Kimlik | Araç | Durum | Sayfa | Not ve kaynak |
|---|---|---|---|---|
| SI-01 | Örnek büyüklüğü | yayında | `ornekleme.php` | Envanter Örnekleme Planlayıcısı |
| SI-02 | Örnekleme tasarımı üretici (rastgele, sistematik, tabakalı, kümeli) | planlı | – | |
| SI-03 | Sabit alanlı örnek alan kestirimi | yayında | `ornek-alan.php` | genişletme etkenleri, hektar değerleri |
| SI-04 | Açı sayımı (Bitterlich) | planlı | – | |
| SI-05 | Kenar etkisi düzeltmesi (ayna, walkthrough) | planlı | – | |
| SI-06 | Hat kesişim örneklemesi (kalın ölü odun) | planlı | – | |
| SI-07 | İki aşamalı ve çift örnekleme | planlı | – | |
| SI-08 | Tasarıma dayalı çıkarım (Horvitz–Thompson, tabakalı, GREG) | planlı | – | Örnek Alan aracının tasarıma dayalı orman kestirimi bunun bir kısmını karşılıyor |
| SI-09 | Tekrarlı envanter çözümlemesi (büyüme, ölüm, aralanma) | planlı | – | |

### GY — Büyüme ve hasılat

| Kimlik | Araç | Durum | Not |
|---|---|---|---|
| GY-01 | Meşcere hasılat tablosu üretici | planlı | Hasılat tablosu gömülmez (K1); kullanıcının modelinden üretilir |
| GY-02 | Çap sınıfı ve matris modeli | planlı | |
| GY-03 | Tek ağaç büyüme benzetimi | planlı | |
| GY-04 | Ölüm ve aralanma modelleri | planlı | |
| GY-05 | Aralama senaryoları | planlı | |
| GY-06 | Meşcere sıklığı yönetim diyagramı | planlı | |
| GY-07 | Kendiliğinden seyrelme doğrusu | planlı | |
| GY-08 | İklime duyarlı büyüme projeksiyonu | kapsam dışı | P4 |

### SM — İstatistiksel modelleme

| Kimlik | Araç | Durum | Sayfa | Not |
|---|---|---|---|---|
| SM-01 | Boy–çap modelleri | yayında | `boy-cap.php` | sabit etkili sürüm |
| SM-02 | Doğrusal olmayan regresyon (NLS, ağırlıklı) | planlı | – | çekirdek var (`core/nls.js`) |
| SM-03 | Karma etkili modeller | planlı | – | boy–çapın karma etkili aşaması |
| SM-04 | Eşanlı ve uyumlu sistemler (SUR, toplamsal biyokütle) | planlı | – | SUR çap dağılımı meşcere modellerinde var |
| SM-05 | Ölüm ve sağkalım modelleri | planlı | – | |
| SM-06 | Model değerlendirme | yayında | `model-degerlendirme.php` | Nispi Sıralama (`nispi-siralama.php`) da bu modülde, modelleri sıralamak için |
| SM-07 | Belirsizlik nicelemesi (bootstrap, Monte Carlo, Bayesçi) | planlı | – | bootstrap çap dağılımı ve bonitette var |

### ML — Makine öğrenmesi ve mekânsal tahmin

| Kimlik | Araç | Durum | Not |
|---|---|---|---|
| ML-01 | Makine öğrenmesi ile regresyon ve sınıflama | planlı | tarayıcıda |
| ML-02 | Derin öğrenmeyle tepe tacı ayırma | kapsam dışı | P4: büyük modeller, GPU, veri tarayıcıdan çıkmaz |
| ML-03 | Nokta bulutu segmentasyonu | kapsam dışı | P4 |
| ML-04 | k-NN atama | planlı | |
| ML-05 | Mekânsal ara değerleme (kriging, Gauss süreçleri) | planlı | |
| ML-06 | Mekânsal çapraz doğrulama | planlı | |
| ML-07 | Küçük alan kestirimi | planlı | |
| ML-08 | Model destekli çıkarım | planlı | |

### DS — Karar destek ve uygulamalar

| Kimlik | Araç | Durum | Not |
|---|---|---|---|
| DS-01 | Odun değerleme | planlı | fiyatlar kullanıcıdan |
| DS-02 | Üretim planlama eniyileme | planlı | doğrusal programlama tarayıcıda |
| DS-03 | Karbon projesi MRV | kapsam dışı | P4: biyometriden çok mevzuat |
| DS-04 | Ölü odun ve habitat yapısı | planlı | |
| DS-05 | Zarar değerlendirmesi | planlı | |
| DS-06 | Kent ağaçları envanteri | planlı | |

## 5. Eski aşama kodlarının kimliklere eşlemesi

| Eski kod (şartname) | Araç kimliği |
|---|---|
| DIST_SPEC P00–P23 | SS-03 |
| TOOLS_SPEC SV01–SV03 (SV04) | SV-01 (SV-04) |
| TOOLS_SPEC SI01–SI04 | SQ-01, SQ-02 (eski "SI" = bonitet; plandaki SI = örnekleme) |
| TOOLS_SPEC SS01 | SS-02, SS-04, SS-05 (`assets/lab/structure/calc.js`) |
| TOOLS_SPEC SS02 | SS-05, SS-06 (`assets/lab/structure/spatial.js`) |
| TOOLS_SPEC SS03 | SS-07 |
| TOOLS_SPEC SS04 | SS-02, SS-04…SS-07 sayfası (`mescere-yapisi.php`) |
| TOOLS_SPEC BC01–BC03 (BC04) | BC-01…BC-04 (BC-06) |
| TOOLS_SPEC TP01–TP04 (TP05) | SV-02, SV-03, SV-06 |

Bundan sonraki aşamalar `<KİMLİK>/a<n>` ile adlandırılır.

## 6. Yol haritası

Plandaki dört evre, yayındaki araçlara göre güncellendi. Sıra kullanıcının gönderdiği promptlarla belirlenir; bir
aşama kabul ölçütleri sağlanmadan sonrakine geçilmez.

1. **Sürmekte olan:** SS-07 (rekabet), meşcere yapısı sayfası (SS-02, SS-04…SS-07), SS-05/SS-06 kaynak doğrulaması.
2. **Ağaç ve gövde:** SV-02, SV-03, SV-06 (TP), BC-01…BC-04 (BC); TM-01…TM-06.
3. **Örnekleme ve envanter:** SI-02, SI-04…SI-09; DI-02…DI-05.
4. **Modelleme ve büyüme:** SM-02…SM-05, SM-07; SQ-03; GY-01…GY-07.
5. **İleri çözümleme:** ML-01, ML-04…ML-08; DS-01, DS-02, DS-04…DS-06.

Bağımlılıklar: DI bütün modüllere girdi verir; katsayı kütüphanesi (DI-02) SV, BC, SQ, GY'ye; SM'deki uydurma araçları
GY'ye ve SQ-03'e; SI kestiricileri ML-07, ML-08 ve DS'ye.

## 7. Araç başına şartname

Her yeni araç için kodlamadan önce şartname yazılır: ya TOOLS_SPEC biçiminde bir bölüm ya da `docs/tools/<KİMLİK>.md`
(amaç; girdiler ve birimleri; yöntemler ve denklemler; çıktılar; kaynaklar ve okunma durumu; doğrulama: bilinen
sonuçlu referans durumlar ve toleranslar; arayüz; bağımlılıklar). API bölümü yoktur (P1).

## 8. Ortak gereksinimler

Plandaki ortak gereksinimler PROJECT.md ve TOOLS_SPEC §1.1 kurallarıyla zaten karşılanır: birimler her değerle
taşınır (P5); tek kayıt ve toplu (CSV/Excel) kullanım; geçerlilik aralığı dışında uyarı; her bilimsel hesap bağımsız
referansla test edilir; her yöntem kaynağını gösterir; Excel/CSV/JSON dışa aktarma (P7); duyarlı düzen, TR/EN eksiksiz;
her araç için kılavuz bölümü.
