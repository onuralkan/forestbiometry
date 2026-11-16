# Fikir notu: araçlara eklenebilecek, literatürde sık kullanılan yöntemler

Hazırlanma: 17 Kasım 2026, kullanıcı isteği (yan iş).

**Bu belge bir plan değildir.** PLATFORM_PLAN, TOOLS_SPEC, PROGRESS ya da KAYNAK_LISTESI'ne bağlı değildir, hiçbir karar ya da sıra içermez. Yalnızca "ileride ne eklenebilir" sorusuna hazır bir ad listesidir.

- Adlar bellekten derlendi; hiçbiri kaynaktan okunmadı. Durumları [D]'dir; biçim, künye ve yazımı doğrulanmadı.
- Bir yöntem sisteme alınacaksa her zamanki kural geçerlidir: kaynak sağlanır, okunur, [B]/[A]/[P] işaretlenir, sonra uygulanır.
- ✓ işareti, yöntemin bu notun yazıldığı gün sitede zaten bulunduğunu gösterir.
- Kapsam dışı araçlar (P4) ve hesap yöntemi olmayan altyapı araçları (DI) listede yok.

## TM — Ağaç ölçümü

**TM-01 Boy hesaplayıcı**
- Trigonometrik (açı + yatay uzaklık; tanjant yöntemi)
- Sinüs yöntemi (eğik uzaklık)
- Benzer üçgenler (Christen boyölçeri, Merritt cetveli)
- Eğimli arazide düzeltme
- Eğik ağaç düzeltmesi

**TM-02 Çap ve göğüs yüzeyi**
- Çevreden çap
- Çapraz iki çap: aritmetik, geometrik ve karesel ortalama
- Göğüs yüzeyi g = π/4·d²
- Göğüs yüksekliği tanımı: 1.3 m, 1.37 m (4.5 ft); eğimde üst taraftan ölçme
- Çatallı ve kök şişkinlikli ağaçlarda ölçme yeri kuralları

**TM-03 Kabuk kalınlığı ve kabuksuz çap**
- Doğrusal kabuk oranı (k = d_ub/d_ob)
- Kabuk kalınlığı = a + b·d
- Kabuk yüzdesi ile göğüs yüzeyi ilişkisi
- Meyer kabuk oranı yöntemi
- Gövde boyunca kabuk modelleri: Cao ve Pepper; Laasasenaho, Melkas ve Aldén

**TM-04 Tepe tacı ölçüleri**
- Tepe çapı
  - iki dik çaptan ortalama
  - sekiz ya da dört yönlü tepe yarıçapı
  - poligon alanı
- Tepe izdüşüm alanı
- Tepe oranı (CR)
- Tepe boyu
- Tepe yüzey alanı ve hacmi: koni, paraboloit, silindir ve elipsoit varsayımları
- Tepe rekabet etkeni (CCF): Krajicek, Brinkman ve Gingrich
- En büyük tepe genişliği (MCW) modelleri
- Tepe dibi yüksekliği modelleri: Ritchie ve Hann; Hasenauer ve Monserud

**TM-05 Ağaç yaşı ve çap artımı**
- Halka sayımı ve göğüs yüksekliği yaşı düzeltmesi
- Burgu örneğinden çap artımı
- Periyodik ve yıllık ortalama artım
- Çapraz tarihleme: COFECHA mantığı
- Halka genişliği standartlaştırma
  - negatif üstel eğri
  - spline
  - RCS
- Göğüs yüzeyi artımına çevirme
- Pressler artım yüzdesi
- Schneider artım yüzdesi formülü

**TM-06 Biçim sayısı ve biçim bölümü**
- Yapay ve doğal (göğüs yüksekliği ve h/10) biçim sayıları
- Biçim bölümleri
  - Schiffel
  - Girard
  - mutlak biçim bölümü (Jonson)
  - Hohenadl (✓)
- Biçim yüksekliği (f·h)

## SV — Gövde hacmi ve profili

**SV-01 Seksiyon hacmi**
- Huber ✓
- Smalian ✓
- Newton ✓
- Hohenadl ✓
- Riecke formülü
- Bruce düzeltmesi (Smalian için)
- Kesik koni, kesik paraboloit ve kesik neiloit formülleri
- Seksiyon uzunluğu ve konumu kuralları: 1 m, 2 m, göreli seksiyonlar

**SV-02 Gövde profili denklemleri**
- Tek denklemli
  - Kozak, Munro ve Smith (1969)
  - Demaerschalk (1972)
  - Ormerod (1973)
- Parçalı
  - Max ve Burkhart (1976) ✓
  - Fang, Borders ve Bailey (2000)
  - Clark, Souter ve Schlaegel (1991)
  - Parresol, Hotvedt ve Cao (1987)
- Değişken üslü
  - Kozak (1988)
  - Kozak (2004) ✓
  - Lee ve ark. (2003)
  - Newnham (1992)
  - Bi (2000)
  - Muhairwe (1999)
- Jiang, Brooks ve Wang (2005): Max–Burkhart ve Fang tabanlı uyumlu sistem
- Riemer, Gadow ve Sloboda (1995)
- Sharma ve Oderwald (2001), boyutsal uyumlu
- Karma etkili profil modelleri (ağaç düzeyinde rastgele etki)

**SV-03 Kullanılabilir hacim**
- Tepe çapına kadar profil integrali ✓
- Kullanılabilir yükseklik modelleri
- Kullanılabilir hacim oranı denklemleri
  - Burkhart (1977)
  - Van Deusen, Sullivan ve Matney (1981)
  - Cao ve Burkhart (1980)
- Tomruk boyu sınırlı hacim

**SV-04 Hacim denklemleri**
- Spurr birleşik değişken: V = a + b·D²H
- Schumacher–Hall: V = a·D^b·H^c
- Logaritmik Spurr
- Berkhout: V = a·D^b
- Kopezky–Gehrhardt: V = a + b·D²
- Hohenadl–Krenn: V = a + b·D + c·D²
- Meyer
- Stoate (birleşik değişkenli varyant)
- Ogaya
- Takata
- Naslund hacim denklemi
- Honer (1965)
- Tek ve çift girişli hacim tabloları (yerel ve genel hacim tabloları)

**SV-05 Tomruk ölçüm kuralları**
- Doyle
- Scribner ve Scribner Decimal C
- International ¼-inch
- Huber/Smalian kübik ölçüm
- Hoppus
- JAS kuralı
- Türkiye için TS ölçüm ve sınıflandırma standartları (tomruk, maden direği, kağıtlık)

**SV-06 Ürün bölme (sortiman) eniyileme**
- Dinamik programlama
  - Pnevmaticos ve Mann
  - Grondin ✓
  - Bennemann ve ark. (BuckR) ✓
- Öncelik (açgözlü) kuralı ✓
- Ağ çözümlemesi ve en kısa yol (Sessions)
- Doğrusal programlama ile meşcere düzeyinde sortiman
- Pazar kısıtlı bölme (talep oranlarına uyma; Laroze ve Greber)
- Sezgisel yöntemler: tabu arama, genetik algoritma (Kivinen)
- Kalite (kusur, eğrilik) dikkate alan bölme

## BC — Biyokütle ve karbon

**BC-01 Allometrik biyokütle**
- Kuvvet (log–log) modeli: B = a·D^b
- D²H birleşik değişkenli modeller
- Chave ve ark. (2005, 2014) pantropikal modeller
- Jenkins ve ark. (2003) ulusal ölçek denklemleri
- Muukkonen (2007) genelleştirilmiş denklemler
- Zianis ve ark. (2005) Avrupa denklem derlemesi
- Geri dönüşüm düzeltmeleri
  - Baskerville ✓ (ln ölçeği)
  - Sprugel
  - Snowdon oranı
  - smearing (Duan)

**BC-02 Biyokütle bileşenleri**
- Bileşen modelleri: gövde, kabuk, dal, yaprak/ibre, kök
- Toplanabilirlik (additivity): Parresol (1999, 2001), NSUR ile eşanlı kestirim
- Kök/gövde oranı (R/S)
- Kök biyokütlesi denklemleri: Cairns ve ark. (1997), Mokany ve ark. (2006)

**BC-03 Biyokütle dönüşüm etkeni (BEF)**
- BEF, BCEF, kök/gövde oranı
- Sabit ve yaşa/sıklığa bağlı BEF
- Lehtonen ve ark. (2004)
- Fang ve Wang tipi hacme bağlı BEF

**BC-04 Karbon stoku ve CO₂ eşdeğeri**
- Karbon oranı yaklaşımı (kullanıcı değeri)
- CO₂ = C × 44/12 ✓ (tanım)
- Odun yoğunluğu ile hacimden kütleye çevirme ✓

**BC-05 IPCC karbon hesabı**
- Kazanç–kayıp yöntemi (gain–loss)
- Stok farkı yöntemi (stock-difference)
- Katman (tier) 1, 2 ve 3 yaklaşımları
- Ölü odun, döküntü ve toprak havuzları

**BC-06 Karbon belirsizliği**
- Hata yayılımı (IPCC Yaklaşım 1)
- Monte Carlo (IPCC Yaklaşım 2)
- Model belirsizliği dahil yayılım: Picard ve ark., Molto ve ark.

## SS — Meşcere yapısı ve sıklığı

**SS-01 Meşcere özeti**
- N/ha, G/ha
- Aritmetik ve karesel ortalama çap (dg)
- Göğüs yüzeyi ağırlıklı ortalama çap
- Üst boy tanımları
  - Assmann üst boyu (100 kalın ağaç/ha)
  - Weise
  - Lorey ortalama boyu
  - dominant/kodominant ortalama
- Hacim/ha

**SS-02 Meşcere sıklık endeksleri**
- Reineke SDI ✓
- Toplama yöntemiyle SDI (Zeide; Shaw)
- Curtis RD ✓
- Hart–Becking göreli aralık ✓
- Tepe rekabet etkeni (CCF)
- Wilson aralık etkeni
- Yoda –3/2 kuralı
- Kuvvet kanunu sıklık ölçüleri
- Stand Density Management Diagram göstergeleri (Drew ve Flewelling)

**SS-03 Çap dağılımı**
- Dağılım ailesi
  - Weibull (2 ve 3 parametre) ✓
  - Johnson SB ✓
  - gamma ✓
  - beta ✓
  - lognormal ✓
  - normal ✓
  - genelleştirilmiş gamma ✓
  - Gumbel ✓
  - Burr XII
  - Dagum
  - sonlu karışımlar (iki Weibull)
- Uydurma ve geri kazanım yöntemleri
  - parametre tahmin (PPM) ✓
  - parametre geri kazanım (PRM) ✓
  - CDFR ✓
  - yüzdelik eşleştirme ✓
  - moment ✓
  - L-moment ✓
- Parametresiz yöntemler: çekirdek yoğunluğu, k-NN atama (Haara, Maltamo ve Kangas)
- Matris ve sınıf kaydırma (bkz. GY-02)

**SS-04 Çeşitlilik endeksleri**
- Shannon ✓
- Simpson ✓
- Pielou eşitliği
- Berger–Parker
- Margalef
- Menhinick
- Hill sayıları
- Rényi ailesi
- Fisher α
- Seyreltme eğrileri (rarefaction)
- Chao1, ACE kestiricileri
- β çeşitliliği: Jaccard, Sørensen, Bray–Curtis

**SS-05 Yapısal çeşitlilik endeksleri**
- Gini katsayısı ✓
- Lorenz eğrisi ✓
- Çap ve boy farklılaşması (T) ✓
- Uniform açı endeksi (W) ✓
- Karışım (M) ✓
- Baskınlık (U) ✓
- Structural complexity index (Zenner ve Hibbs)
- Stand Structural Complexity Index
- Shannon yapı endeksi (çap sınıflarına göre)
- Latham ve ark. boy farklılaşması
- Staudhammer ve LeMay endeksleri
- Jaehne ve Dohrenbusch endeksi
- Pretzsch'in A endeksi (dikey tür profili)

**SS-06 Mekânsal desen çözümlemesi**
- Clark–Evans ✓ (Donnelly düzeltmesiyle ✓)
- Ripley K ve Besag L işlevleri
- Çift korelasyon işlevi g(r)
- Morisita endeksi
- Varyans/ortalama oranı
- Hopkins ve Skellam
- Pielou rastgelelik endeksi
- Kenar düzeltmeleri: Ripley, Ohser, sınır şeridi
- İşaret korelasyon işlevleri
- Nearest-neighbour G, F ve J işlevleri
- Eş ve iki değişkenli desen (Lotwick–Silverman)

**SS-07 Rekabet endeksleri**
- Uzaklıktan bağımsız
  - BAL ✓
  - göreli boyut ✓
  - Glover–Hool
  - CCF temelli endeksler
- Uzaklığa bağlı
  - Hegyi ✓
  - Martin–Ek
  - Bella
  - Lorimer
  - Daniels
  - Rouvinen ve Kuuluvainen
  - Pukkala ve Kolström
- Alan örtüşmesi (ZOI): Gerrard; Bella
- Rekabet etki alanı ve rakip seçimi
  - sabit yarıçap
  - k komşu ✓
  - açı sayımı (BAF)
- Voronoi ve Dirichlet poligon alanları
- Işık temelli endeksler (tepe izdüşümü, gölgeleme)

## SQ — Yetişme ortamı verimliliği

**SQ-01 / SQ-02 Bonitet endeksi ve eğrisi**
- Kılavuz eğri yöntemi
- Cebirsel fark yaklaşımı (ADA) ✓
- Genelleştirilmiş cebirsel fark yaklaşımı (GADA): Cieszewski ve Bailey
- Bailey ve Clutter (1974)
- Chapman–Richards temelli ADA ✓
- Schumacher temelli ADA ✓
- Hossfeld IV
- Korf
- McDill–Amateis
- Cieszewski (2001, 2002) GADA biçimleri
- Parametre tahmin ve parametre geri kazanım yaklaşımları
- Karma etkili bonitet modelleri
- Boy artımına dayalı bonitet (growth intercept)
- Yaş türü: toplam yaş / göğüs yaşı ✓ (K8)

**SQ-03 Büyüme işlevi uydurma**
- Chapman–Richards ✓
- Schumacher ✓
- Gompertz ✓
- Logistik ✓
- Monomoleküler (Mitscherlich) ✓
- Weibull ✓
- Korf
- Hossfeld (I–IV)
- Levaković (I, III)
- Yoshida I
- Sloboda
- von Bertalanffy
- Richards (dört parametreli)
- Lundqvist–Matérn
- Schnute
- Zeide'nin LTD/TD biçimleri
- Prodan

## SI — Örnekleme ve envanter

**SI-01 Örnek büyüklüğü**
- Basit rastgele (n₀ = z²(CV/E)²) ✓
- Sonlu kitle düzeltmesi ✓
- Tabakalı örneklemede dağıtım: orantılı, Neyman, en uygun (maliyetli)
- Sistematik örnekleme varyans yaklaşımları
- Küme örneklemesi
- Freese ve Cochran formülleri

**SI-02 Örnekleme tasarımı üretici**
- Basit rastgele
- Sistematik ızgara (kare, üçgen)
- Tabakalı rastgele
- Küme örneklemesi
- Dengeli örnekleme: küp yöntemi (Deville ve Tillé)
- Mekânsal dengeli örnekleme
  - GRTS
  - yerel pivot yöntemi (LPM)
- Halton ve BAS
- Olasılık–boyutla orantılı (PPS)

**SI-03 Sabit alanlı örnek alan kestirimi**
- Alan genişletme etkeniyle hektara çevirme ✓
- Horvitz–Thompson
- Oran kestiricisi
- İç içe (nested) daireler
- Değişken alanlı alt örnek alanlar

**SI-04 Açı sayımı (Bitterlich)**
- Bitterlich açı sayımı (göğüs yüzeyi etkeni, BAF)
- Sınır ağaç kontrolü (limiting distance)
- Grosenbaugh'un boy açı sayımı (vertical point sampling)
- Big BAF (Marshall, Iles ve Bell)
- 3P örneklemesi
- İç içe sayım
- Strand hattı yöntemi

**SI-05 Kenar etkisi düzeltmesi**
- Yansıtma (mirage, Schmid–Haas)
- Walkthrough (Ducey, Gove ve Valentine)
- Kenar ağırlıkları
- Toroidal kaydırma
- Tampon şeridi
- Ripley kenar düzeltmesi

**SI-06 Hat kesişim örneklemesi**
- Line intersect sampling: Warren ve Olsen; Van Wagner; De Vries
- Kalıp kesişim (Gregoire ve Valentine)
- Transect relascope (Ståhl)
- Ölü odun hacmi için LIS formülleri

**SI-07 İki aşamalı ve çift örnekleme**
- Çift örnekleme ile oran ve regresyon kestiricisi
- Tabakalama için çift örnekleme
- İki aşamalı örnekleme (birincil/ikincil birimler)
- Çok aşamalı örnekleme

**SI-08 Tasarıma dayalı çıkarım**
- Horvitz–Thompson
- Hansen–Hurwitz
- Oran kestiricisi
- Regresyon kestiricisi
- Genelleştirilmiş regresyon (GREG)
- Kalibrasyon kestiricileri
- Jackknife ve bootstrap varyansları
- Sistematik örneklemede varyans yaklaşımları: ardışık farklar (Matérn)

**SI-09 Tekrarlı envanter çözümlemesi**
- Sürekli orman envanteri (CFI)
- Yerine koyma ile örnekleme (SRP)
- Kısmi değiştirme
- Büyüme bileşenleri
  - sağkalım
  - aralanma (ingrowth)
  - ölüm
  - kesim
  - ontogrowth
- Beers ve Miller yaklaşımları
- Martin (1982) değişim kestiricileri

## GY — Büyüme ve hasılat

**GY-01 Meşcere hasılat tablosu üretici**
- Normal hasılat tabloları (Schwappach, Wiedemann, Schober)
- Clutter (1963) uyumlu büyüme ve hasılat
- Buckman (1962)
- Sullivan ve Clutter (1972)
- Göğüs yüzeyi projeksiyon modelleri
- Langsaeter sıklık–artım ilişkisi
- Eichhorn kuralı

**GY-02 Çap sınıfı ve matris modeli**
- Usher matris modeli
- Buongiorno ve Michie
- Çap sınıfı ilerletme (stand table projection)
- Sabit ve dinamik geçiş olasılıkları
- Liang, Buongiorno ve Monserud

**GY-03 Tek ağaç büyüme benzetimi**
- Mesafeden bağımsız: Prognosis/FVS mantığı (Wykoff), Monserud ve Sterba
- Mesafeye bağlı: SILVA (Pretzsch), MOSES (Hasenauer)
- BWINPro
- Potansiyel × düzelticisi yaklaşımı
- Çap artımı modelleri (ln(DDS) biçimi)

**GY-04 Ölüm ve aralanma modelleri**
- Lojistik ölüm modelleri
- Hamilton ölüm modeli
- Monserud ve Sterba
- Kendiliğinden seyrelme temelli ölüm
- Sıfır şişkin (zero-inflated) ve hurdle aralanma modelleri
- Vanclay aralanma modeli

**GY-05 Aralama senaryoları**
- Aralama türleri: alttan, üstten, seçme, karma
- Aralama oranı tanımları: N, G ya da V oranı
- Aralama ağırlığı göstergeleri
  - Reineke SDI hedefi
  - Hart–Becking aralığı
  - A-değeri (Wilson)
- Aralama etkisi modelleri (Hynynen, Pukkala)

**GY-06 Meşcere sıklığı yönetim diyagramı**
- SDMD: Drew ve Flewelling (1979); McCarter ve Long (1986); Newton
- Ando'nun SDMD'si
- Yoda –3/2 kuralı
- Tepe kapanması ve rekabet eşikleri (Long)

**GY-07 Kendiliğinden seyrelme doğrusu**
- Reineke (–1.605)
- Yoda (–3/2)
- Sınır doğrusu tahmin yöntemleri
  - kantil regresyon
  - stokastik sınır (stochastic frontier)
  - en büyük yoğunluk noktaları seçimi
  - indirgenmiş ana eksen
- Zeide modelleri

## SM — İstatistiksel modelleme

**SM-01 Boy–çap modelleri**
- Näslund ✓
- Michailoff ✓
- Curtis ✓
- Kuvvet ✓
- Chapman–Richards ✓
- Weibull ✓
- Petterson
- Prodan
- Korf
- Wykoff
- Schnute
- Henricksen
- Meyer
- Logistik
- Gompertz
- Sloboda
- Genelleştirilmiş boy–çap modelleri: meşcere değişkenleriyle, ör. Cañadas, Sharma ve Parton, Mehtätalo
- Karma etkili boy–çap modelleri ve kalibrasyon (ölçülmüş birkaç boyla)

**SM-02 Doğrusal olmayan regresyon**
- Gauss–Newton
- Levenberg–Marquardt ✓
- Ağırlıklı en küçük kareler (varyans işlevleri: kuvvet, üstel)
- Başlangıç değeri stratejileri (ızgara, doğrusallaştırma)
- Profil olabilirlik güven aralıkları
- Bootstrap güven aralıkları

**SM-03 Karma etkili modeller**
- Doğrusal karma modeller (REML, ML)
- Doğrusal olmayan karma modeller (Lindstrom–Bates)
- Rastgele etki kalibrasyonu (BLUP; Lappi)
- İç içe ve çapraz rastgele etkiler
- Varyans ve korelasyon yapıları: AR(1), CAR

**SM-04 Eşanlı ve uyumlu sistemler**
- Görünüşte ilişkisiz regresyon (SUR)
- Doğrusal olmayan SUR (NSUR)
- Üç aşamalı en küçük kareler (3SLS)
- Tam bilgi en çok olabilirlik (FIML)
- Uyumlu profil–hacim sistemleri
- Toplanabilir biyokütle sistemleri (Parresol)

**SM-05 Ölüm ve sağkalım modelleri**
- Lojistik regresyon (ağaç düzeyi)
- Complementary log–log (farklı ölçüm aralıkları için)
- Cox orantılı tehlikeler
- Weibull sağkalım
- Parametrik ve yarı parametrik sağkalım
- Zero-inflated modeller

**SM-06 Model değerlendirme**
- Model başarı ölçütleri
  - Bias ✓
  - RMSE ✓
  - MAE ✓
  - R² = 1 − SSE/SST ✓
  - modelleme etkinliği (EF)
  - AIC ✓ (Büyüme İşlevi'nde)
  - BIC
- Theil U
- Freese χ² doğruluk testi
- Reynolds testi
- Eşdeğerlik testleri (Robinson ve Froese)
- Çapraz doğrulama: k-katlı, LOO, örnek alan bazında ✓
- Bağıl sıralama (Poudel ve Cao) ✓

**SM-07 Belirsizlik nicelemesi**
- Delta yöntemi
- Bootstrap: parametrik, parametresiz, artık bootstrap
- Monte Carlo hata yayılımı
- Bayesçi kestirim (MCMC)
- Tahmin aralıkları ve güven aralıkları ayrımı

## ML — Makine öğrenmesi ve mekânsal tahmin

**ML-01 Makine öğrenmesi ile regresyon ve sınıflama**
- Rastgele orman
- Gradyan artırma: XGBoost, LightGBM
- Destek vektör makineleri
- Yapay sinir ağları (MLP)
- Kübist (Cubist)
- MARS
- GAM
- Değişken önemi: permütasyon, SHAP

**ML-04 k-NN atama**
- k-NN: öklit, Mahalanobis
- MSN (Moeur ve Stage)
- GNN (Ohmann ve Gregory)
- Rastgele orman temelli yakınlık (RF-kNN)
- Ağırlıklandırma şemaları

**ML-05 Mekânsal ara değerleme**
- Ters uzaklık ağırlıklı (IDW)
- Basit, olağan ve evrensel kriging
- Regresyon kriging
- Ko-kriging
- Varyogram modelleri: küresel, üstel, Gauss, Matérn
- Spline (thin-plate)

**ML-06 Mekânsal çapraz doğrulama**
- Blok çapraz doğrulama
- Tampon ile LOO
- Kümelenmiş k-katlı (spatial k-fold)
- Uzaklığa dayalı katlar (Roberts ve ark.)
- Uygulanabilirlik alanı (Meyer ve Pebesma)

**ML-07 Küçük alan kestirimi**
- Doğrudan kestirici
- Sentetik kestirici
- Fay–Herriot (alan düzeyi)
- Battese–Harter–Fuller (birim düzeyi)
- EBLUP
- Hiyerarşik Bayes

**ML-08 Model destekli çıkarım**
- Model destekli GREG
- Fark kestiricisi
- Lidar destekli envanter kestiricileri (Gregoire ve ark.; Næsset)
- Hibrit çıkarım (Ståhl ve ark.)
- Model tabanlı çıkarım ve tasarım tabanlı çıkarım karşılaştırması

## DS — Karar destek ve uygulamalar

**DS-01 Odun değerleme**
- Net bugünkü değer (NPV)
- Faustmann (arazi beklenti değeri, LEV)
- İç verim oranı
- Eşdeğer yıllık gelir
- Stumpage değeri (artık değer yöntemi)
- Optimum idare süresi
  - Faustmann
  - en büyük ortalama artım
  - en büyük ormancılık rantı

**DS-02 Üretim planlama eniyileme**
- Model I ve Model II (Johnson ve Scheurman)
- Doğrusal ve tamsayılı programlama
- Hedef programlama
- Komşuluk kısıtları: URM, ARM
- Sezgisel yöntemler: tabu arama, benzetilmiş tavlama, genetik algoritma
- Alan ve hacim kontrolü yöntemleri

**DS-04 Ölü odun ve habitat yapısı**
- Ölü odun hacmi: hat kesişim, sabit alan
- Çürüklük sınıfları (Maser; Hunter)
- Habitat ağacı tipolojisi (Larrieu ve ark.)
- Index of Biodiversity Potential (IBP)
- Yaşlı orman göstergeleri

**DS-05 Zarar değerlendirmesi**
- Yangın şiddeti ölçüleri: kabuk yanık yüksekliği, tepe kavrulması, ölüm olasılığı (Ryan ve Reinhardt)
- Rüzgar zararı riski: GALES, HWIND
- Böcek zararı sınıflaması
- Tepe sağlığı ve yaprak kaybı sınıfları (ICP Forests)
- Zararlı odun hacmi ve değer kaybı kestirimi

**DS-06 Kent ağaçları envanteri**
- i-Tree Eco ve Streets yaklaşımları
- Kent ağacı biyokütle denklemleri (Nowak; McHale)
- Ağaç değerleme
  - CTLA (Council of Tree and Landscape Appraisers)
  - Burnley
  - Helliwell
- Risk değerlendirme: ISA TRAQ
- Ekosistem hizmeti kestirimleri: yağış tutma, hava kirliliği giderimi
