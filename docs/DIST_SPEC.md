# Çap dağılımı aracı: araştırma, teknik şartname ve aşamalı geliştirme promptları

Hazırlanma tarihi: 10 Kasım 2026  
Hedef: Mevcut Weibull aracını, ormancılık araştırmalarında kullanılabilecek, Türkçe ve İngilizce çalışan bir çap dağılımı analiz aracına dönüştürmek.

Bu belge bir literatür değerlendirmesi ve geliştirme şartnamesidir. Özgün metin, web sitesinin kaynak kodu incelenmeden yazılmıştır; mevcut koda göre düzeltmeler Bölüm 0'da ve ilgili promptlarda **[Rev]** ile işaretlidir (10 Kasım 2026, kullanıcı onayıyla). Belgedeki referans sayıları bağımsız Python/SciPy hesaplamalarıyla kontrol edilmiştir; bunlar mevcut web uygulamasının test edildiği anlamına gelmez.

## 0. Revizyon notları ve kararlar (10 Kasım 2026)

Özgün belge kullanıcı tarafından hazırlandı; aşağıdaki düzeltmeler mevcut kod ve yüklenen iki kaynak (Poudel ve Cao 2013; Parresol 2003, ikisi de okundu) incelenerek, kullanıcı onayıyla işlendi. Bölüm 8'deki bütün referans sayıları SciPy 1.18.1 ile yeniden hesaplanıp doğrulandı (PDF/CDF/medyan 12 basamak; M8 kökleri 0.1915 ve 2.5, M9 kökleri 0.3986 ve 2.5; M10 → a = 5; Parresol girdileri).

1. **Dmin adı.** Poudel ve Cao'nun "D0"ı meşcerenin en küçük çapıdır. Platformda D0, Örnek Alan ve Meşcere aracında baskın çap anlamında kullanıldığı için bu araçta ve belgede en küçük çap **Dmin** olarak adlandırılır; kaynak gösterimi yalnızca açıklamada anılır.
2. **Varyans böleni.** Kullanıcı "Poudel'deki gibi" dedi; makale böleni belirtmiyor (yalnızca "diameter variance, Dvar"). Karar: varsayılan **n bölen** (v = Σ(d−m)²/n). Gerekçe: makalenin moment denklemleri (m = a + bG1, v = b²(G2 − G1²), Dq² = a² + 2abG1 + b²G2) kuramsal momentlerdir ve Dq² = m² + v özdeşliği yalnızca n bölenle sağlanır; M2 ile M3 ancak böyle aynı sonucu verir. n−1 bölenli s² seçenek olarak kalır. Sonuç: yayındaki 1.0.0 Weibull moment yöntemi n−1 kullanıyor; 2.0.0'da varsayılan sonuç (n−1)/n etkeni kadar değişir, sürüm notuna yazılır.
3. **Göğüs yüzeyi çap dağılımı: yalnızca betimsel, isteğe bağlı P23.** Poudel ve Cao ile Parresol'da yöntem yok. Kullanıcının sonradan yüklediği Kangas ve Maltamo (2000) [R23] okundu: göğüs yüzeyi çap dağılımını (ağaçların göğüs yüzeyiyle ağırlıklandığı dağılım; açı sayımı örneklemesinin doğal çıktısı) tanımlar, 12 göğüs yüzeyi yüzdeliğindeki çapları SUR ile kestirir, yüzdelikler arasında Späth rasyonel spline ile ara değer bulur ve sınıf göğüs yüzeyini sınıf ortalama ağacının göğüs yüzeyine bölerek ağaç sayısına çevirir (Denklem 1). Makale **parametrik bir dağılımın göğüs yüzeyi ağırlıklı veriye uydurulmasını içermez**; boyut yanlı olabilirlik için atıf yapılan Gove ve Patil (1998) okunmadı. Bu yüzden: (i) ampirik göğüs yüzeyi dağılımı, yüzdelikleri ve sınıf dönüşümü P23 olarak eklendi; (ii) parametrik ailelerin göğüs yüzeyi ağırlıklı uydurulması ve farklı büyüklükteki örnek alanların hektar ağırlıklı birleştirilmesi kapsam dışı kalır; (iii) makaledeki Finlandiya katsayıları araca gömülmez.
4. **Mevcut araçta olmayanlar.** Serbest üç parametreli Weibull ve yüzdelik tahmincisi yayındaki araçta yoktur (P05 buna göre düzeltildi). Ölçüm eşiği beyan edilirse araç şu an uydurmayı engeller; P11 bunu koşullu olabilirlikle değiştirir. Önceki "yalnızca Weibull" kararı (5 Kasım 2026) bu belgeyle kaldırılmıştır.
5. **Sıra.** P05, P01'in hemen ardından çalıştırılır (bkz. "Nasıl kullanılmalı?" madde 6).
6. **Yeniden yazım kararı.** Araç yeni bir motor üzerinde yeniden yazılır (`assets/lab/dist/`): mevcut arayüz tek dağılıma ve tek iş akışına göre kurulmuş, uyarlamak yeniden yazmaktan pahalı. Yeniden kullanılacaklar: `core/` (içe aktarma, sayı okuma, gezgin, grafik, dışa aktarma, istatistik işlevleri) ve mevcut Weibull hesap çekirdeğinin formülleri. Yayındaki araç (`assets/lab/weibull/`, `cap-dagilimi.php`) 2.0.0 yayımlanana kadar **değişmeden** kalır; testleri (368 birim, 28 tarayıcı) yeni motorun Weibull sonuçları için regresyon referansıdır. Yeni araç menüde listelenmeyen ayrı bir sayfada geliştirilir; P15 kabulünden sonra `cap-dagilimi.php` yerine geçer ve eski kod `legacy/`'ye taşınır.
7. **Kaynak durumu.** [R1] ve [R2] okundu ([B]). Tablo 2 dipnotunun b/c adlarını ters yazdığı ([R1]) ve Parresol'un ξ'yi geri kazanmadığı, üçüncü denklem denemesinin başarısız olduğu ([R2]) kaynakta doğrulandı. Diğer kaynaklar okunana kadar METHODS.md'de [İ] ya da [D] olarak işaretlenir.
8. **Yayın kuralı.** Her push canlıya çıktığı için bir dağılım ya da yöntem, kendi bağımsız referans testleri geçmeden hiçbir menüde görünmez.
9. **Erken yayın (10 Kasım 2026, kullanıcı kararı; karar 6'yı değiştirir).** Yeni araç P15'i beklemeden, P00, P01, P05, P02, P03, P04 ve P08 tamamlandıktan sonra `cap-dagilimi.php` adresinde **2.0.0-beta.1** olarak yayına alındı; eski Weibull aracı `legacy/weibull/`'ye taşındı. Yayında henüz olmayanlar araç içinde yazılıdır (sınıf tabloları, ölçüm eşiği, CSV/Excel, Weibull geri kazanımı, bootstrap/p değerleri). 2.0.0 sürüm adı P15 kabulüne kalır.

## Nasıl kullanılmalı?

1. Bu belgeyi kodlama yapacak yapay zekâya proje referansı olarak ver.
2. Önce “Ortak geliştirme talimatı”nı ve P00'ı gönder.
3. Sonraki mesajlarda yalnızca sıradaki promptu çalıştır. Bir prompt tamamlanıp ilgili kontroller geçmeden bir sonrakine geçme.
4. Yapay zekâ tüm belgeyi bağlamda tutamıyorsa, yalnızca ilgili teknik şartname bölümünü ve o aşamanın promptunu birlikte ver.
5. P00–P15 ilk kullanılabilir çok dağılımlı sürümü; P16–P17 meşcere düzeyinde model geliştirmeyi tamamlar. P18–P23 ayrı, isteğe bağlı genişletmelerdir.
6. **Çalıştırma sırası (Bölüm 0, karar 5):** P00 → P01 → P05 → P02 → P03 → P04 → P08 → P10 → P06 → P07 → P09 → P11 → P12 → P13 → P14 → P15 → P16 → P17.

Buradaki öncelik sırası bir ürün geliştirme önerisidir; dağılımların evrensel başarı sıralaması değildir.

## 1. Araştırmanın temel sonucu

Dağılım seçimi, parametre tahmini ve parametre geri kazanımı aynı şey değildir. Arayüz ve hesaplama motoru bunları ayrı ele almalıdır.

| Katman | Yanıtladığı soru | Örnek |
|---|---|---|
| Dağılım ailesi | Çapların olasılık modeli nedir? | Weibull, gamma, Johnson SB |
| Doğrudan parametre tahmini | Ölçülmüş çaplara bu dağılım nasıl uydurulur? | En çok olabilirlik, moment, yüzdelik |
| Parametre geri kazanımı | Ortalama, Dq veya yüzdelikler verilince parametreler nasıl bulunur? | Weibull moment/hibrid; Parresol SB |
| Meşcere düzeyinde kestirim | Başka meşcerenin dağılımı N, H, yaş gibi değişkenlerden nasıl öngörülür? | Parametre kestirim modelleri; özet istatistik modelleri + geri kazanım |
| Sayısal çözüm | Seçilen istatistiksel yöntemin denklemleri nasıl çözülür? | Brent, Newton–Raphson, kısıtlı optimizasyon |

Örneğin MLE ile Newton–Raphson aynı menünün eşdeğer seçenekleri değildir. MLE bir tahmin ilkesi, Newton–Raphson bir çözüm algoritmasıdır. Benzer şekilde SUR, tek bir örnek alanın çaplarına uygulanan MLE'nin alternatifi gibi sunulmamalıdır. Poudel ve Cao'daki SUR/CDFR yaklaşımları, çok sayıda örnek alandan meşcere modellerinin katsayılarını kestirme bağlamındadır. [R1]

### 1.1. İlk sürüm için dağılım ve yöntem matrisi

Kısaltmalar: MLE = en çok olabilirlik; MOM = momentler; CML = sabit sınırlar koşulunda en çok olabilirlik; QME = yüzdelik eşleştirme; MGE = minimum uzaklık; PRM = parametre geri kazanım modeli; PPM = parametre kestirim modeli.

| Dağılım | Temel parametreler | Doğrudan tahmin için uygulanabilir yöntemler | Özetlerden geri kazanım | Önerilen ilk uygulama |
|---|---|---|---|---|
| Weibull | Konum a, ölçek b, şekil c; 2P için a=0 | MLE, MOM, yüzdelik; ayrıca L-moment, olasılık grafiği regresyonları, MPS ve çeşitli modifiye tahminciler | Ortalama–varyans; Dq–varyans; yüzdelik çiftleri; moment–yüzdelik hibridleri | Mevcut yöntemleri koru; 2P/sabit a ile doğrudan uyum ve Poudel M2–M10 |
| Gamma | Şekil k, ölçek θ | MLE, MOM; ayrıca L-moment ve genel QME/MGE | Ortalama ve varyans veya ortalama ve Dq | 2P MLE + MOM |
| Johnson SB | Alt sınır ξ, aralık λ, şekiller γ ve δ | Sabit ξ, λ ile CML, moment ve yüzdelik; literatürde mod temelli yöntemler de vardır; serbest sınırlar için kısıtlı sayısal uyum ayrı problemdir | Parresol: ξ verilerek üç parametre; Fonseca: medyan ve ilk üç ham momentle dört parametre | Sabit sınırlarla doğrudan uyum + Parresol |
| Normal | μ, σ | MLE ve MOM; genel QME/MGE eklenebilir | Ortalama ve varyans | MLE/MOM; negatif çap olasılığı göstergesi |
| Lognormal | Log ölçekte μ, σ | Log çaplardan MLE; çap ölçeğinde MOM; yüzdelik | Ortalama ve varyans veya ortalama ve Dq | 2P MLE + MOM |
| Beta, konum–ölçek biçimi | Alt L, üst U; şekiller α, β | Sabit sınırlar altında MOM ve sayısal MLE; genel QME/MGE | Sınırlar + ortalama ve varyans | Sabit/açıkça belirlenmiş sınırlarla MOM + MLE |
| Negatif üstel / exponential | Hız r; isteğe bağlı sabit alt konum a | MLE ve MOM | Ortalama; a sabitse r=1/(ortalama−a) | Ters J biçimi için basit karşılaştırma modeli |
| Log-logistic / Fisk | Ölçek b, şekil c | Sayısal MLE; iki yüzdelik; log-moment; koşulları sağlanırsa sıradan momentler | İki yüzdelik; sonlu momentler koşulunda ortalama–varyans | MLE + iki yüzdelik |

Weibull, gamma, beta ve Johnson SB'nin ormancılık uygulamaları doğrudan karşılaştırmalı araştırmalarda ele alınmıştır. Normal ve lognormal de çap dağılımı literatüründeki klasik alternatiflerdir. Log-logistic, genelleştirilmiş gamma, Burr ve Dagum gibi aileler için de ormancılık uygulamaları vardır. Her veri setinde aynı dağılımın üstün olduğu sonucu çıkarılmamalıdır. [R3, R4, R5]

Tablodaki “genel QME/MGE” seçenekleri, dağılımın PDF/CDF/quantile işlevlerinden yararlanan genel istatistiksel genişletmelerdir; bunların her birinin aynı ormancılık makalesinde karşılaştırıldığı iddia edilmemektedir. [R8]

### 1.2. İkinci aşamadaki seçenekler

| Aile / yaklaşım | Tahmin yaklaşımı | Konumlandırma |
|---|---|---|
| Genelleştirilmiş gamma | Öncelikle sayısal MLE; yeterli bağımsız momentle sayısal MOM mümkün | Gamma ve Weibull'u kapsayan daha esnek pozitif aile; farklı parametreleştirmeler açıkça eşlenmeli |
| Burr XII | Sayısal MLE; tanımlı momentlerle MOM veya yüzdelik/MGE genişletmeleri | Uzun sağ kuyrukları modelleyebilir; momentlerin varlığı parametrelere bağlıdır |
| Dagum / Burr III | Sayısal MLE; tanımlı momentlerle MOM veya yüzdelik/MGE genişletmeleri | Burr XII ile aynı isim altında birleştirilmemeli |
| Gumbel | MLE, MOM, L-moment | Minimum ve maksimum biçimi belirtilmeli; negatif çap olasılığı ayrıca izlenmeli |
| Sonlu karışımlar | Karışım olabilirliği; EM veya kısıtlı doğrudan optimizasyon | Çok tepeli yapılar için; başlangıçta iki bileşenle sınırlı |
| KDE / ampirik yüzdelik yaklaşımı | Bant genişliği seçimi veya yüzdelik enterpolasyonu | Parametrik dağılımlardan ayrı, karşılaştırma ve keşif katmanı |

Rayleigh gibi özel durumlar yeni ve bağımsız bir yöntem gibi çoğaltılmamalıdır: Rayleigh, Weibull'un belirli şekilli bir özel durumudur. A-Charlier gibi seri yaklaşımları literatürde bulunsa da tüm parametrelerde negatif olmayan geçerli yoğunluk sağlamama riski nedeniyle ilk ürün kapsamına alınması önerilmemiştir.

**İsimlendirme tuzağı:** Bazı ormancılık yayınlarında “generalized beta”, konum ve ölçek eklenmiş dört parametreli beta için kullanılır. Bu, otomatik olarak GB1/GB2 gibi başka genelleştirilmiş beta aileleri demek değildir. Önce formülleri karşılaştır; aynı dağılımı iki farklı aile olarak listeleme. [R3]

## 2. Ortak bilimsel ve hesaplamalı şartname

### 2.1. Veri ve birimler

- Yanıt, ağaç sayısına göre çap dağılımıdır. Göğüs yüzeyi çap dağılımı yalnızca betimsel olarak P23'te ele alınır; parametrik ağırlıklı uydurma ve hektar ağırlıklı birleştirme **kapsam dışıdır** (Bölüm 0, karar 3).
- d: çap, cm. n: gerçekten gözlenmiş ağaç sayısı. N: hektardaki ağaç sayısı. G: göğüs yüzeyi, m²/ha. Örnek alan alanı: m².
- Ortalama m=Σd/n; ikinci ham moment m2=Σd²/n; Dq=√m2; moment varyansı v=Σ(d−m)²/n. Dolayısıyla m2=m²+v.
- n−1 bölenli örnek varyansı s² kullanılmışsa v=(n−1)s²/n dönüşümü kaydedilsin. **Karar (Bölüm 0, karar 2):** moment yöntemlerinde ve geri kazanımda varsayılan v, n bölenlidir; n−1 bölenli s² açık bir seçenektir ve sonuçta hangisinin kullanıldığı yazılır.
- Gerçek tamsayı frekansı, aynı çapta kaç ağaç gözlendiğini gösterir. Hektara genişletme katsayısı veya örnekleme ağırlığı, bağımsız gözlem sayısı değildir.
- n ve N, özellikle M10, olabilirlik, BIC ve bootstrap işlemlerinde birbirine dönüştürülerek kullanılmamalıdır.
- Örnek alan, dönem ve gerektiğinde tür alanları korunmalı; aynı alanın tekrar ölçümleri çapraz doğrulamada farklı katlara dağılmamalıdır.
- İçe aktarımda ondalık ayıracı ile CSV sütun ayıracı ayrı ayarlardır. Belirsiz binlik/ondalık yazımı sessizce tahmin edilmemeli; mevcut açık içe aktarma tercihi korunmalıdır.

### 2.2. Üç farklı sınır kavramı

1. **Dağılım desteği:** Weibull a, beta L/U, Johnson ξ ve ξ+λ.
2. **Ölçüm eşiği / truncation:** Örneğin yalnızca d≥8 cm ağaçların kaydedilmesi.
3. **Örneklem minimumu/maksimumu:** Yüklenen dosyada gözlenen en küçük/en büyük değer.

Bunlar aynı değildir. Örneklem minimumunu otomatik olarak gerçek dağılım alt sınırı kabul etme. Beta ve Johnson SB'de gözlemleri sınırın tam üzerine koymak dönüşüm/olabilirlik sorunlarına yol açabilir. Veriye dayalı bir sınır belirleme kuralı kullanılırsa kural, birim, ayar ve veri bağımlılığı görünür olsun; sabit sayıları bütün türlere evrensel kural gibi uygulama.

### 2.3. Truncation ve sınıflı veriler

L≤D≤U aralığı gözleniyorsa:

$$
f_T(d)=\frac{f(d)}{F(U)-F(L)},\qquad
F_T(d)=\frac{F(d)-F(L)}{F(U)-F(L)}.
$$

Sürekli dağılımda uç noktaların açık/kapalı yazımı olasılığı değiştirmez. U=∞ için F(U)=1. Uydurma işlemi de bu koşullu dağılımın olabilirliği üzerinden yapılmalıdır. Önce kesilmemiş dağılımı uydurup yalnızca grafiği kesmek doğru değildir. Kesilmiş örneklemin ortalama/percentillerini kesilmemiş geri kazanım denklemlerine doğrudan sokma; desteklenmiyorsa seçeneği kapat.

Çap sınıfı [l_j,u_j) için beklenen olasılık:

$$p_j=F(u_j)-F(l_j).$$

Koşullu modelde F yerine F_T kullanılır. Sınıflı gözlemlerde log-olabilirlik, parametrelerden bağımsız sabit hariç, Σn_j log(p_j)'dir. Sınıf orta noktalarını n_j kez çoğaltarak bunu ham çap MLE'si gibi sunma.

N_j=N×p_j. Sınıflar tüm ilgili desteği kapsıyorsa toplam beklenen sıklık N olmalıdır. Sonlu çizim aralığı dışında kalan kuyruk olasılığını ayrı göster; sessizce yeniden ölçekleme yapma. Gözlenmeyen sınıfların sıfır frekans mı, kayıt dışı mı olduğunu ayırt et.

### 2.4. Uyum ölçütleri ve belirsizlik

- Log-olabilirlik orijinal çap ölçeğinde hesaplanmalı. Log dönüşümü kullanılan modellerde Jacobian ihmal edilmemeli.
- AIC=2k−2ℓ, BIC=k ln(n)−2ℓ. Standart karşılaştırma, aynı gözlemler, aynı gözlem süreci, aynı birimler ve karşılaştırılabilir MLE uyumları için yapılmalı.
- MOM/geri kazanım için log-skor hesaplanabilir; bunları standart MLE-AIC sıralamasına gerekçesiz katma. Dışarıdan gelen modelin yerel parametre sayısı, bütün eğitim sürecinin karmaşıklığını temsil etmez.
- Gerçekten dışarıdan sabitlenmiş sınırla, aynı veriden seçilmiş sınır aynı değildir. Veriyle belirlenen sınırların karmaşıklığını yok sayarak düşük k üzerinden yanıltıcı avantaj üretme.
- AICc eklenecekse uygulanabilirlik ve küçük örnek düzeltmesinin varsayımları belirtilsin; n≤k+1 durumunda hesaplanmasın. Karışım ve uç nokta tahmini gibi düzenli olmayan problemlerde otomatik geçerli sayılmasın.
- KS, AD ve Cramér–von Mises istatistikleri verilebilir. Aynı veriden parametre tahmin edildiğinde standart, parametreleri bilinen dağılımın p-değerlerini kullanma.
- Parametrik bootstrap p-değeri için her örnekte aynı parametre tahmini ve veriyle belirlenen sınır/ölçüm/yuvarlama süreci tekrarlanmalı. Monte Carlo p=(1+başlangıçtan büyük/eşit istatistik sayısı)/(B+1).
- Ölçüm yuvarlaması bağlar oluşturuyorsa bootstrap örneklerine aynı yuvarlama uygulanmalı veya uygun aralık olabilirliği kullanılmalı. Bağları gizlemek için rastgele jitter ekleme.
- EI için Poudel tanımı: Σ_j |N_j,gözlenen−N_j,tahmin|, birimi ağaç/ha. Sınıflar ve kuyrukların ele alınışı modeller arasında aynı olmalı. Ham sayılarla hesaplanan L1 hataya farklı ad/birim ver.
- Optimizasyon başarısızlığı, tanımsız moment, sınır çözümü ve çoklu çözüm ayrı durumlar olarak raporlansın.
- Wald aralıklarını her modelde otomatik kullanma. Parametre belirsizliği için kullanılan yaklaşımın geçerliliği ve bootstrap başarısızlık oranı raporlansın.

KS'nin doğru çift taraflı tanımı, sıralı ham veride:

$$
D^+=\max_j\left[\frac{j}{n}-F(d_{(j)})\right],\quad
D^-=\max_j\left[F(d_{(j)})-\frac{j-1}{n}\right],\quad
D=\max(D^+,D^-).
$$

Bu bölümdeki koruyucu kurallar, kaynakların doğrudan alıntısı değil, araştırma amaçlı yazılım için hazırlanmış teknik tasarım önerileridir. Bootstrap yaklaşımının genel referansı [R9]'dur.

## 3. Dağılımlar için uygulama denklemleri

Aşağıdaki ifadeler, kaynaklardaki dağılım tanımlarının standart moment ve olabilirlik ilişkileriyle yazılmış uygulama biçimleridir. Belirli bir makaleye ait yöntemler ayrıca adlandırılmıştır; genel cebirsel türetimler makaleye özgü yeni yöntemler gibi sunulmamalıdır.

### 3.1. Normal

Parametreler μ∈R, σ>0. MLE: μ=m, σ²=v. MOM aynı parametreleri verir. Bu eşitlik arayüzde iki farklı sonuç varmış gibi gösterilmesin. Negatif çap olasılığı Φ(−μ/σ) raporlanmalı. Kesilmiş normal için bu kapalı formüller MLE değildir; koşullu olabilirlik optimize edilir. [R10]

### 3.2. Lognormal

Parametreler μ=E[ln D], σ>0. Buradaki μ, cm cinsinden aritmetik ortalama değildir.

MLE: μ=ortalama(ln d), σ²=ortalama[(ln d−μ)²].

MOM / geri kazanım:

$$
\sigma^2=\ln(1+v/m^2),\qquad \mu=\ln m-\sigma^2/2.
$$

E[D]=exp(μ+σ²/2), E[D²]=exp(2μ+2σ²). Verilen m ve Dq için v=Dq²−m² kullanılır. d≤0 kabul edilmez. İlk sürüm kaydırılmamış 2P biçimdir; üçüncü konum parametresi ayrı model/yöntem olarak eklenmelidir. [R11]

### 3.3. Gamma

Şekil k>0, ölçek θ>0:

$$f(d)=\frac{d^{k-1}e^{-d/\theta}}{\Gamma(k)\theta^k},\quad d>0.$$

MOM: k=m²/v, θ=v/m.

MLE: ln(k)−ψ(k)=ln(m)−ortalama(ln d) denklemini çöz; ardından θ=m/k. ψ digamma işlevidir. Şekil denklemi için k>0 kısıtı ve dejenere veri kontrolü gereklidir. Rate kullanan kütüphanelerde rate=1/θ dönüşümü açıkça yapılmalı. L-moment yöntemi eklenirse kendisine ait denklemler kullanılmalı; MOM etiketi değiştirilerek sunulmamalı. [R12, R13]

### 3.4. Konum–ölçek beta

Y=(D−L)/(U−L) ve Y~Beta(α,β). α,β>0; L<U.

S=U−L, μ_y=(m−L)/S, v_y=v/S²:

$$
t=\frac{\mu_y(1-\mu_y)}{v_y}-1,\quad
\alpha=\mu_y t,\quad \beta=(1-\mu_y)t.
$$

MOM için 0<μ_y<1 ve 0<v_y<μ_y(1−μ_y) olmalıdır. MLE sabit L/U altında beta log-olabilirliğini optimize eder; D ölçeğine geçerken −n ln(S) terimi bulunmalıdır. Serbest L/U tahmini, sabit sınır yönteminin gizli bir seçeneği yapılmamalıdır. [R14]

### 3.5. Weibull: doğrudan uyum

**Standart adlandırma:** a=konum, b=ölçek, c=şekil.

$$
F(d)=1-\exp[-((d-a)/b)^c],\quad d>a,\quad b,c>0.
$$

2P modelde a=0. Sabit a ile y_i=d_i−a>0:

$$
\frac1c+\overline{\ln y}
-\frac{\sum_i y_i^c\ln y_i}{\sum_i y_i^c}=0,\qquad
b=\left(\frac1n\sum_i y_i^c\right)^{1/c}.
$$

Bunlar sabit a altında MLE denklemleridir. Serbest a ile üç parametreli olabilirlik, özellikle a gözlenen minimuma yaklaşınca düzenli olmayan/sınırsız davranış gösterebilir. “Başarılı optimizasyon” tek başına geçerli küresel MLE kanıtı değildir. İlk sürümde mevcut 3P davranışı incelensin; yeni serbest 3P yöntemi ancak açık kısıt, çoklu başlangıç ve sınır tanılarıyla eklensin.

ForestFit belgeleri, 2P için MLE/MOM/yüzdelik/L-moment ve regresyon seçeneklerini; 3P için MLE, modifiye moment/olabilirlik, MPS ve T-L-moment seçeneklerini listeler. Bunların hepsini ilk sürüme taşımak gerekli değildir. Her yöntem, özgün tanımı ve geçerlilik koşulu doğrulanarak ayrı eklenmelidir. [R6]

### 3.6. Weibull: Poudel ve Cao (2013)

Kaynak: Yüklenen “Evaluation of Methods to Predict Weibull Parameters for Characterizing Diameter Distributions”, özellikle Tablo 2 ve basılı s.245–247. [R1]

G_r(c)=Γ(1+r/c), m=ortalama, v=varyans, q=Dq olsun:

$$
m=a+bG_1,\quad v=b^2(G_2-G_1^2),\quad
q^2=a^2+2abG_1+b^2G_2.
$$

Pozitif ölçek çözümü:

$$
B_q(c)=\frac{-aG_1+\sqrt{a^2G_1^2+G_2(q^2-a^2)}}{G_2}.
$$

Q_p p yüzdeliği, A_p=−ln(1−p) olsun. 0<p<r<1 için:

$$
C_{p,r}(a)=
\frac{\ln(A_r/A_p)}{\ln[(Q_r-a)/(Q_p-a)]},\qquad
b=\frac{Q_p-a}{A_p^{1/c}}.
$$

| Kaynak yöntemi | Gerekli hedefler | İşlem |
|---|---|---|
| M1 | a, b, c için eğitim hedefleri ve meşcere açıklayıcıları | Doğrudan parametre kestirimi; PRM değildir |
| M2 | m, v; a politikası | b=(m−a)/G1; b²(G2−G1²)=v denklemini c için çöz |
| M3 | q, v; a politikası | b=Bq(c); b²(G2−G1²)=v denklemini c için çöz |
| M4 | Q31, Q63; a politikası | c=C.31,.63(a); yüzdelik denklemiyle b |
| M5 | Q50, Q95; a politikası | c=C.50,.95(a); yüzdelik denklemiyle b |
| M6 | q, Q25, Q95; a politikası | c=C.25,.95(a); b=Bq(c) |
| M7 | q, Q31, Q63; a politikası | c=C.31,.63(a); b=Bq(c) |
| M8 | m, Q95; a politikası | b=(Q95−a)/A.95^(1/c); a+bG1=m denklemini çöz |
| M9 | q, Q95; a politikası | Aynı b; a²+2abG1+b²G2=q² denklemini çöz |
| M10 | q, Q25, Q50, Q95, Dmin ve n | a=(n^(1/3)Dmin−Q50)/(n^(1/3)−1); c=C.25,.95(a); b=Bq(c) |

M2–M9 için kaynakta a=0.5×tahmin edilen Dmin kullanılır. Dmin, meşcerenin minimum çap hedefidir (kaynak gösterimi D0; bkz. Bölüm 0, karar 1); matematiksel Q(0)=a ile eş anlamlı değildir. Kullanıcının doğrudan a vermesi, aynı geri kazanım denklemlerini kullanabilir ancak “kaynakla aynı konum politikası” diye etiketlenmemelidir.

M10 başlığında görünenden fazla girdiye ihtiyaç duyar: Dmin ve örnek alandaki n zorunludur; n>1 olmalıdır. Konum formülünün ürettiği geçersiz değer sessizce sıfıra çekilmemelidir.

M6/M7/M10'da şekil yüzdelik oranından, ölçek Dq'dan gelir. Çelişkili hedeflerde bütün yüzdeliklerin birebir sağlanması beklenmez. Hedef ve geri hesaplanan değerleri göster.

**Çoklu kök:** M8 ve M9 her girdi için tek çözüm garanti etmez. Bölüm 8'deki örnekte her ikisinin de iki pozitif şekil çözümü vardır. Başlangıç değerine göre bulunan kökü tek doğru sonuç gibi verme. Aranan parametre aralığını ve bulunan adayları raporla. Ham veri varsa ek uyum ölçütüyle seçim yapılabilir; yoksa ek kısıt/tercih olmadan belirsizliği koru.

**Kaynak aktarımında düzeltilmesi gerekenler:**

- Tablo 2 dipnotu b/c adlarını ters yazıyor; ana dağılım denklemiyle tutarlı biçimde b=ölçek, c=şekil kullanılmalı.
- Basılı K–S Denklem 7'nin ikinci terimindeki parantez düzeni hatalı görünüyor; Bölüm 2.4'teki standart tanım uygulanmalı.
- mLogL “ortalama log-olabilirlik” değil, negatif log-olabilirliktir. Kod alanı negative_log_likelihood olsun.
- M1'in SUR açıklamasında a,b,c hedeflenirken CDFR bölümünde modeller 1–9 için a'nın Dmin'dan hesaplandığı belirtilir. Kaynak yaklaşımı seçilince bu ayrım açıkça tanımlanmalı; hepsine aynı a politikası uygulanmamalı.

### 3.7. Johnson SB: doğrudan uyum

ξ alt sınır, λ>0 aralık, δ>0 ve γ∈R şekil parametreleri:

$$
z=\gamma+\delta\ln\frac{d-\xi}{\xi+\lambda-d},\quad
F(d)=\Phi(z),
$$

$$
f(d)=\phi(z)\frac{\delta\lambda}{(d-\xi)(\xi+\lambda-d)},\quad
Q_p=\xi+\lambda\,\operatorname{logistic}
\left(\frac{\Phi^{-1}(p)-\gamma}{\delta}\right).
$$

Sabit ξ ve λ altında t_i=ln[(d_i−ξ)/(ξ+λ−d_i)]:

$$\delta=1/s_t,\qquad\gamma=-\bar t/s_t.$$

Burada s_t², n bölenli dönüşmüş varyanstır. Bu, iki şekil parametresinin koşullu MLE'sidir; dört parametrenin birlikte MLE'si değildir.

Sabit sınırlar ve iki yüzdelikle t_p=logit[(Q_p−ξ)/λ], z_p=Φ⁻¹(p):

$$\delta=(z_r-z_p)/(t_r-t_p),\qquad\gamma=z_p-\delta t_p.$$

50/95 seçimi Knoebel–Burkhart yaklaşımının ilgili uygulaması olarak kullanılabilir. Moment yöntemi, sabit sınırlar altında dönüşmüş normal integrallerinden ortalama/varyansı eşleştiren sayısal çözüm gerektirir.

ForestFit'teki CML/MM/KB ve Bayesian seçenekler, belgede ξ ve λ önceden belirlenerek çalıştırılır. Paket, veriye dayalı belirli sınır sabitleri kullanır; bu sabitler tür, birim ve veri kapsamından bağımsız bir ürün varsayımı yapılmamalıdır. Bayesian yöntem ayrıca önsel, zincir yakınsaması ve belirsizlik tasarımı gerektirdiğinden bu paketin ilk kapsamına alınmamıştır. [R7]

Mod temelli Johnson SB yöntemleri de ormancılık literatüründe yer alır. Örneklem modunun sınıflama/bant genişliğine duyarlılığı ve birden fazla tepe olasılığı nedeniyle bu yöntem için ayrıca tanım ve doğrulama gerekir; burada öncelik CML, moment, yüzdelik ve geri kazanım yaklaşımlarındadır. [R3]

### 3.8. Johnson SB: Parresol (2003) geri kazanımı

Kaynak: Yüklenen “Recovering Parameters of Johnson's SB Distribution”, özellikle basılı s.3–5, Denklem 9–16. [R2]

Girdiler: N, G, ortalama çap m, medyan M ve önceden verilen/tahmin edilen ξ. Alternatif olarak N/G yerine doğrudan Dq girilebilir.

$$K=\pi/40000,\qquad q^2=Dq^2=\frac{G}{KN}.$$

Medyan koşulundan:

$$\gamma=\delta\ln\left(\frac{\xi+\lambda-M}{M-\xi}\right).$$

Z~N(0,1), Y=logistic[(Z−γ)/δ], u_r=E[Y^r] olsun:

$$
\xi+\lambda u_1=m,\qquad
\xi^2+2\xi\lambda u_1+\lambda^2u_2=q^2.
$$

Bu iki denklem λ ve δ için çözülür; γ medyandan hesaplanır. **Parresol bu adımda ξ'yi geri kazanmıyor.** Alt sınır dışarıdan verildiğinde aralık ve iki şekil olmak üzere üç parametreyi geri kazanıyor.

u1 ve u2 normal ağırlıklı integrallerdir. Kararlı kuadratür ve pozitif parametre dönüşümleri kullanılabilir. Kaynakta iki değişkenli Newton–Raphson vardır; aynı denklemleri sağlayan başka güvenilir çözücü, ayrı algoritma bilgisiyle kullanılabilir. Farklı birimli iki artık için ölçeklendirilmiş yakınsama ve sonradan özgün birimlerde doğrulama yapılmalı.

Kontroller: N>0, G>0, m>ξ, M>ξ, q²≥m²; çözümde λ>M−ξ, δ>0. Bunlar gerekli koşullardır, her girdi için geçerli/tek çözüm garantisi değildir. Çoklu başlangıç ve tanımlanabilirlik kontrolü yap.

Kaynakta en küçük üç çaptan alt sınır ekstrapolasyonu ve türe/veri setine özgü meşcere denklemleri de vardır. Bunları genel varsayılan yapma. Alt sınır sezgiseli istenirse ayrı kaynak doğrulamasıyla eklenmeli. Ortalama, varyans ve ikinci ham moment bağımsız üç bilgi değildir; sadece bunları kullanarak eksik dördüncü parametreyi çözdüğünü iddia etme.

### 3.9. Exponential ve log-logistic

Exponential için sabit a ile F(d)=1−exp[−r(d−a)], r>0. MLE ve MOM aynı sonucu verir: r=1/(m−a). Hız r ile ölçek 1/r karıştırılmamalı. Sınıf sıklığının logaritmasına doğrusal regresyon yapıp bunu ham veri MLE'si diye adlandırma. [R15]

Log-logistic/Fisk:

$$F(d)=\frac1{1+(b/d)^c},\qquad Q_p=b\left(\frac{p}{1-p}\right)^{1/c}.$$

İki yüzdelikle:

$$
c=\frac{\operatorname{logit}(r)-\operatorname{logit}(p)}
{\ln(Q_r/Q_p)},\qquad
b=\frac{Q_p}{[p/(1-p)]^{1/c}}.
$$

MLE sayısaldır. Sıradan ortalama c>1, varyans c>2 koşulunda vardır. Dolayısıyla ortalama–varyans MOM/geri kazanımı c>2 ile sınırlandırılmalıdır. Log-moment yaklaşımı farklıdır: b=exp[ortalama(ln d)], c=π/√[3 var_n(ln d)]. Bu yöntem “log-moment” adıyla gösterilmeli. [R16]

## 4. Meşcere değişkenlerinden tahmin

### 4.1. PPM, PRM ve regresyon

PPM, örnek alanlardan kestirilmiş dağılım parametrelerini meşcere değişkenlerine bağlar. PRM, önce moment/yüzdelik gibi hedefleri kestirir, ardından bunlardan dağılım parametrelerini geri kazanır. Kullanıcı sadece özetleri elle giriyorsa regresyon eğitimi gerekmez.

Poudel ve Cao'nun genel meşcere denklem biçimi:

$$
y=\exp[\beta_1+\beta_2RS+\beta_3\ln N+\beta_4\ln H+\beta_5/A]+\varepsilon,
\quad RS=\frac{\sqrt{10000/N}}{H}.
$$

H baskın/ortak baskın boyu temsil eder; A yaştır. Makalenin orijinal ölçekte eklemeli hatalı denklemiyle ln(y) üzerinde OLS aynı amaç fonksiyonu değildir. Özgün modele uygun NLS ve çok yanıtlı SUR ayrı; log-OLS ayrı tanımlansın.

SUR'da yanıt denklemlerinin artık kovaryansı hesaba katılmalıdır. Her hedef için bağımsız regresyon yapıp “SUR” deme. Tek alanla regresyon modeli eğitme; yeterli bağımsız alan ve doğrulama gereklidir. Tür/bölge değiştiğinde makaledeki katsayıları evrensel tahmin modeli olarak kullanma.

### 4.2. CDFR ve modified CDFR

CDFR için i alanında sıralı j ağacın gözlenen kümülatif konumu (j−0.5)/n_i:

$$
\sum_i\frac1{n_i}\sum_j
\left[\frac{j-0.5}{n_i}-F(d_{ij};\theta_i(\beta))\right]^2.
$$

Burada optimize edilenler çok alanlı meşcere modelinin β katsayılarıdır. Tek alanın parametrelerine CDF uzaklığı uydurmak, ayrı bir minimum uzaklık yöntemidir; bu meşcere CDFR uygulamasıyla aynı ad altında karıştırılmamalıdır.

Modified CDFR:

$$
\sum_i\frac1{m_i-1}\sum_{j=1}^{m_i-1}
[C_{ij}-F(u_{ij};\theta_i(\beta))]^2.
$$

C_ij gözlenen kümülatif sınıf oranı, u_ij sınıf üst sınırıdır. Kaynak 2 cm sınıf için orta noktaya +1 ekler; yazılımda genel üst sınır kullan. Son sınıfı dışlama yalnızca bu kaynak amaç fonksiyonuna aittir. Histogramda, toplam ağaç sayısında ve sınıflı MLE'de son sınıf kaybolmamalıdır. m_i>1 zorunludur.

Alan başına normalize edilmiş ağırlıklandırmayı koru. Eşit çapların sıralaması/plotting position kuralı ve sınıf kenarları kaydedilsin. Kaynak moduyla farklı bir ağırlıklandırma veya kesilmiş CDF kullanılırsa sonuç “genişletilmiş CDFR” olarak açıkça tanımlansın.

## 5. Ortak geliştirme talimatı

İlk mesajda P00 ile birlikte gönder:

~~~text
Mevcut çap dağılımı aracını bu belgedeki teknik şartnameye göre aşamalı geliştireceğiz. Önce mevcut kodu ve proje talimatlarını incele. Teknoloji yığınını varsayma; mevcut mimariye uyum sağla.

Her mesajda yalnızca belirtilen promptun kapsamını uygula. Çalışan Weibull özelliklerini ve mevcut örnek alan/dönem gezintisini koruyarak yeniden kullanılabilir bileşenlere bağla. Büyük, ilgisiz yeniden yazımlar yapma.

Dağılım ailesi, istatistiksel tahmin yöntemi, parametre geri kazanımı, meşcere regresyonu ve sayısal çözücü ayrı kavramlar olsun. Henüz uygulanmamış yöntemleri çalışıyormuş gibi menüye ekleme.

Türkçe ve İngilizce arayüzlerde varsayılan ondalık ayıracı nokta olsun. Sayısal değerleri hesaplama boyunca sayı olarak sakla; biçimlendirmeyi sunum katmanında yap. Mevcut açık kullanıcı tercihleri varsa koru.

Formüllerde parametre tanımı, destek, birim, sabit/serbest parametreler ve geçerlilik koşulları açık olsun. Kaynak katsayılarını farklı tür ve bölgelere evrensel model gibi aktarma. Çözülemeyen veya belirsiz sonuçları başarılı sonuç gibi gösterme.

Her aşama sonunda değişen davranışı, çalıştırılan kontrolleri ve bilinen sınırlamaları kısa raporla. Hesaplama değişikliklerini bağımsız referanslarla doğrula; yalnızca kendi fonksiyonunu yineleyen testlerle yetinme. Tamamlanmamış hesaplamayı sahte veri veya placeholder sonuçlarla kapatma.
~~~

## 6. Ana geliştirme promptları

### P00 — Mevcut uygulamanın incelenmesi

~~~text
Yalnızca mevcut çap dağılımı aracını incele ve bu revizyon için uygulanabilir bir değişiklik haritası hazırla.

Weibull'un mevcut parametreleştirmesini, desteklenen tahmin/geri kazanım yöntemlerini, veri içe aktarmayı, örnek alan/dönem gruplamasını, çap sınıflarını, uyum ölçütlerini, grafik ve dışa aktarma bileşenlerini belirle. Sayı biçimlendirme ve TR/EN çevirilerinin nereden yönetildiğini bul.

Bu belgede istenen özellikleri “mevcut”, “değişmeli”, “eklenecek” olarak eşleştir. Mevcut davranışta kaynak formülleriyle uyuşmayan bir yer varsa açıkça göster. Kaynak PDF'ler erişilebilir değilse okunmuş gibi davranma; belgedeki doğrulanmış teknik şartnameyi referans al.

Kullanılan sayısal kütüphanenin gamma/digamma, normal CDF/quantile, optimizasyon ve integral yeteneklerini değerlendir. Gerekiyorsa küçük bir bağımlılık öner; teknoloji yığınını değiştirmeyi varsayma.

Çıktı: ilgili dosyalar, korunacak davranışlar, yapılacak değişiklikler, aşama bağımlılıkları ve kısa bir uygulama notu. Bu aşamada büyük kod değişikliği yapma.

[Rev] Bölüm 0'daki bilinen durumu (mevcut araçta serbest 3P ve yüzdelik tahmincisi yok; MOM n−1 bölen kullanıyor; eşik beyanında uydurma engelleniyor) doğrula ve yeni motorun dosya düzenini (assets/lab/dist/) öner.
~~~

### P01 — Ortak dağılım motoru ve veri sözleşmesi

~~~text
P00 bulgularına göre ortak dağılım arayüzünü ve yöntem kayıt sistemini uygula.

Her dağılım kendi kimliği, parametre şeması, destek sınırları, pdf/logpdf, cdf/logcdf, survival/log-survival, quantile ve uygun moment işlevlerini sunsun. Parametre tahmini, özetlerden geri kazanım ve meşcere modeli bağlantıları ayrı yetenekler olarak kaydedilsin.

Sonuç sözleşmesine kullanılan veri/örnek alan/dönem, yöntem, sabit/serbest parametreler, sınır politikası, birimler, örnek büyüklüğü, amaç değeri, yakınsama, uyarılar ve kaynak kimliği ekle. İlgisiz alanları zorunlu yapma.

Sayısal işlemlerde kararlı logaritmik hesaplamaları kullan. Destek dışı veri veya tanımsız moment için yapılandırılmış hata üret. Yoğunluğa gelişigüzel küçük sabit ekleyerek hatayı gizleme.

Mevcut Weibull'u bu arayüze adaptörle bağla. Yöntem seçicisi yalnızca desteklenen veri/yöntem kombinasyonlarını göstersin. Ortak ondalık biçimlendirme varsayılanını nokta yap.

[Rev] Ondalık standardı ve ortak örnek alan gezgini (core/unitnav.js) hazırdır; yeniden yazma, kullan. Yeni araç assets/lab/dist/ altında, yayındaki Weibull aracına dokunmadan ve menüde listelenmeyen ayrı bir sayfada geliştirilir (Bölüm 0, karar 6). Uzun hesaplar (P14 bootstrap, P17 eğitim) için hesap çekirdeği Web Worker içinde çalışabilecek biçimde DOM'dan bağımsız tutulur.

Kabul: Mevcut Weibull sonuçları tolerans içinde korunmalı; destek/parametre doğrulaması çalışmalı; dağılım ailesi eklemek mevcut arayüzü yeniden yazmayı gerektirmemeli.
~~~

### P02 — Normal ve lognormal

~~~text
Bölüm 3.1–3.2'ye göre normal ve iki parametreli lognormal dağılımlarını ekle.

Normal için MLE/MOM, lognormal için MLE ve MOM yöntemlerini uygula. Ortalama–varyans veya ortalama–Dq girdilerinden geri kazanımı ayrı iş akışına bağla. Lognormal μ ve σ'nın log ölçeğinde olduğunu etiketle.

Moment varyansı ile n−1 bölenli örnek varyansını ayırt et. Sıfır varyans, yetersiz veri ve lognormalde sıfır/negatif çap için açık doğrulama ekle. Normal modelin negatif çap olasılığını göster.

Orijinal çap ölçeğinde log-olabilirlik kullan; log dönüşümünün Jacobian'ını ihmal etme. Truncation desteklenene kadar kesilmiş veriyle kapalı form MLE seçeneğini destekleniyor gibi sunma.

Kabul: Bölüm 8'deki normal/lognormal PDF, CDF ve quantile referansları sağlanmalı. Moment geri kazanımı verilen m ve Dq değerlerini yeniden üretmeli. Normal MLE/MOM aynı sonucu veriyorsa bunun nedenini kısa yöntem açıklamasında belirt.
~~~

### P03 — Gamma

~~~text
Bölüm 3.3'e göre iki parametreli gamma dağılımını ekle.

MOM için k=m²/v ve θ=v/m kullan. MLE için pozitif şekil parametresinin digamma denklemini kararlı biçimde çöz; ölçeği m/k olarak hesapla. Kullanılan kütüphane rate bekliyorsa dönüşümü açıkça yap.

PDF/logpdf, CDF ve quantile işlevlerini ortak arayüze bağla. Ortalama–varyans ve ortalama–Dq girdilerinden MOM geri kazanımını ekle. Serbest konumlu gamma'yı bu yöntemle aynı model olarak sunma.

Sıfır/negatif çap, sıfır varyans, taşma ve yakınsamama durumlarını ayır. Çözücü başarısız olduğunda MOM sonucunu MLE etiketiyle sessizce döndürme.

Kabul: Bölüm 8 referansı geçmeli. MLE için bağımsız bir istatistik kütüphanesiyle aynı örnek veri üzerinde parametre ve log-olabilirlik karşılaştırması yap. Şekil/ölçek birimleri ve tanımları TR/EN arayüzde tutarlı olsun.
~~~

### P04 — Beta ve sınır politikası

~~~text
Bölüm 3.4'e göre konum–ölçek beta dağılımını uygula. İlk kapsam, açıkça belirtilmiş sabit L ve U altında iki şekil parametresinin MOM ve MLE ile tahminidir.

Kullanıcı sınırları belirleyebilsin; otomatik sınır önerisi varsa kullanılan kural ve veri bağımlılığı görünür olsun. Empirik minimum/maksimumu açıklamasız biçimde gerçek destek sınırına dönüştürme. Sınır üzerindeki gözlemleri sessiz epsilon/jitter ile oynatma.

MOM uygunluk eşitsizliklerini kontrol et. MLE'yi orijinal çap ölçeğinde, ölçek dönüşümü dahil hesapla. Sınır dışındaki gözlemleri hata olarak bildir.

Aynı konum–ölçek beta formülünü “beta” ve “generalized beta” adlarıyla iki ayrı model olarak çoğaltma. GB1/GB2 bu aşamanın kapsamı değildir.

Kabul: Bilinen α, β, L, U parametrelerinden üretilen momentler geri kazanılmalı; Bölüm 8 referansı sağlanmalı; uygun olmayan sınır/moment kombinasyonları hesaplanmış sonuç gibi görünmemeli.
~~~

### P05 — Weibull doğrudan tahmininin düzenlenmesi

~~~text
Mevcut Weibull işlevlerini Bölüm 3.5 ile karşılaştır ve ortak motorla uyumlu hale getir.

Adlandırmayı a=konum, b=ölçek, c=şekil olarak standardize et; dış kütüphanenin adlarını adaptörde eşleştir. İki parametreli a=0 ve kullanıcı tarafından sabitlenen a seçenekleri açık olsun.

Sabit a altında MLE ve mevcut doğrudan MOM yöntemini koru ve doğrula. [Rev] Mevcut araçta yüzdelik tahmincisi ve serbest üç parametreli yöntem yoktur: iki yüzdelikle doğrudan tahmini (Bölüm 3.6'daki C_{p,r}(a) ve b bağıntısı, kullanıcı tanımlı p<r) yeni yöntem olarak ekle; serbest konum optimizasyonu ekleme. MOM varyansında varsayılan n bölendir (karar 2); mevcut 1.0.0 sonuçlarıyla fark yalnızca bu etkenden kaynaklanmalı ve testte n−1 seçeneğiyle eski sonuçlar birebir üretilmelidir.

Yöntem ile sayısal çözücü adını ayrı tut. İterasyon, tolerans, yakınsama ve sınır uyarılarını raporla. Yeniden adlandırma eski kayıtları bozuyorsa açık bir uyumluluk dönüşümü sağla.

Kabul: Mevcut işlevlerde regresyon oluşmamalı. Bilinen Weibull parametrelerinde PDF/CDF/quantile doğrulanmalı; sabit konumlu MLE bağımsız referansla karşılaştırılmalı. Gösterilen ondalık ayıracı TR/EN'de nokta olmalı.
~~~

### P06 — Weibull moment ve yüzdelik geri kazanımı

~~~text
Bölüm 3.6'daki Poudel M2, M3, M4 ve M5 geri kazanım yöntemlerini ayrı kimliklerle uygula.

M2: ortalama–varyans. M3: Dq–varyans. M4: Q31–Q63. M5: Q50–Q95. Gerekli girdileri yönteme göre göster; gereksiz alan isteme.

Konum politikası ayrıca seçilsin: kaynakla uyumlu a=0.5×tahmin edilen Dmin veya açıkça verilen a. Arayüzde ad Dmin'dir; açıklamada "Poudel ve Cao'da D0" notu bulunur. Dmin ile teorik sıfırıncı yüzdeliği karıştırma. Tüm girdi hedeflerinin ölçülmüş mü tahmin edilmiş mi olduğu kaydedilsin.

Moment köklerini pozitif c aralığında ara, geçerli b ve artık kontrolleri yap. Yüzdeliklerde sıralama, p/r aralığı ve Qp>a koşulunu doğrula. Empirik yüzdelik hesaplanıyorsa kullanılan quantile tanımını kaydet.

Kabul: Bölüm 8'deki sentetik Weibull hedeflerinden a=5, b=20, c=2.5 geri elde edilmeli. Aynı yöntem ham veriden özet hesaplayarak da çalışabilmeli; bu akışla meşcere regresyonu birbirine karıştırılmamalı.
~~~

### P07 — Weibull hibrid geri kazanımı

~~~text
Bölüm 3.6'daki M6–M10 yöntemlerini ekle. Her yöntemin gerekli girdileri ve a politikası doğru tanımlansın.

M6/M7'de c yüzdelik oranından, b Dq'dan hesaplansın. M8/M9'da Q95 ile moment denklemleri birlikte çözülsün. M10 için Dmin, Q50 ve örnek alandaki n de zorunlu olsun; N/ha kullanılmasın.

M8/M9 için tek başlangıçlı çözücünün ilk kökünü tek sonuç diye sunma. Belirtilmiş aralıkta kök adaylarını ara, tekrarlanan kökleri birleştir ve çoklu çözüm durumunu koru. Parametre aralığı ve seçim kuralı sonuç metadatasında bulunsun. Gizli c>1 kısıtı ekleme.

Girdi hedefleri ile modelin geri hesapladığı moment/yüzdelikleri göster. Hibrid yöntemlerde bütün hedeflerin tam eşleşmesini zorunlu sanma.

Kabul: Bölüm 8 örneğinde M8 ve M9'un iki pozitif kökü tespit edilmeli. M10 referansı geçmeli. Çözümsüz, çok çözümlü ve geçerli tek çözümlü sonuçlar arayüzde ayırt edilmeli.
~~~

### P08 — Johnson SB doğrudan uyum

~~~text
Bölüm 3.7'ye göre Johnson SB dağılımını ekle: ξ alt sınır, λ aralık, γ ve δ şekil; δ>0.

Önce sabit ξ ve λ altında CML, iki yüzdelik ve sayısal moment yöntemlerini uygula. CML'de logit dönüşümünün n bölenli varyansını kullan. 50/95 yüzdelik seçeneğini kaynak bilgisiyle sun; kullanıcı tanımlı çift varsa genel yüzdelik yöntemi olarak ayır.

Moment uyumunda normal ağırlıklı integralleri kararlı hesapla. Dört parametrenin birlikte tahmin edildiği iddiasında bulunma. Destek uçlarındaki ve dışındaki gözlemleri, dejenere dönüşümü ve uygunsuz momentleri denetle.

Sınırları belirleyen paket sabitlerini evrensel varsayılan yapma. Uydurulan parametrelerden PDF, CDF ve quantile elde edildiğini bağımsız referanslarla doğrula.

Kabul: Bölüm 8'deki ξ=5, λ=40, γ=0.6, δ=1.3 referansı sağlanmalı. Simetrik/asimetrik ve sınır yakınındaki örneklerde sayısal hatalar başarı olarak sunulmamalı.
~~~

### P09 — Johnson SB Parresol geri kazanımı

~~~text
Bölüm 3.8'deki Parresol (2003) yöntemini özetlerden geri kazanım iş akışına ekle.

Girdiler N/ha, G m²/ha, ortalama çap, medyan ve ξ olsun. N/G yerine Dq girilebilen alternatif sun; ikisi birlikte girilirse tutarlılığı kontrol et.

Medyan denkleminden γ'yı ifade et. λ ve δ'yı birinci ve ikinci ham moment denklemlerinden çöz. Parametre dönüşümleriyle pozitifliği koru; artıkları ölçeklendir ve sonucu özgün birimlerde tekrar doğrula.

Bu yöntemi “ξ sabitken üç parametre geri kazanımı” olarak tanımla. Parresol'un türe özgü regresyon katsayılarını ve başlangıç denklemlerini genel model gibi gömme. Gerekli koşulların sağlanmasının tek/uygun çözümü garanti etmediğini hesaplama durumlarında ele al.

Kabul: Bölüm 8'deki Parresol girdilerinden λ=40, γ=0.6, δ=1.3 elde edilmeli; m, medyan ve Dq geri doğrulanmalı. Yakınsamama veya tanımlanabilirlik sorununda açık başarısızlık/belirsizlik sonucu dönmeli.
~~~

### P10 — Exponential ve log-logistic

~~~text
Bölüm 3.9'a göre exponential ve log-logistic/Fisk dağılımlarını ekle.

Exponential için a=0 veya açıkça sabitlenen a altında MLE/MOM uygula. Hız r ile ölçek 1/r etiketlerini ayır. Ters J dağılımı için kullanılabilecek basit karşılaştırma modeli olarak sun.

Log-logistic için sayısal MLE ve iki yüzdelik tahmini uygula. İsteğe bağlı log-moment seçeneğini sıradan MOM'dan ayrı adlandır. Ortalama için c>1, varyans için c>2 koşulunu kontrol et; tanımsız momentleri NaN veya yanıltıcı sayıyla gösterme.

Her iki dağılımı kayıt sistemine, grafiklere ve çıktı sözleşmesine bağla. Parametre kısıtlarını açıkça uygula; pozitif destek koşullarını kontrol et.

Kabul: Bölüm 8 referansları geçmeli. Log-logistic yüzdelik geri kazanımı teorik girdilerle doğru parametreleri vermeli; c≤1 ve 1<c≤2 durumlarında moment uygunluğu doğru raporlanmalı.
~~~

### P11 — Ölçüm eşiği ve kesilmiş dağılımlar

~~~text
Bölüm 2.2–2.3'e göre ölçüm eşiğini dağılım destek sınırından ayrı modelle.

Önce ham veride alt eşik ve gerekiyorsa üst eşik altında koşullu PDF/CDF/log-olabilirliği uygula. Dağılım uydurma seçilen truncation modelinin olabilirliğiyle yapılmalı; yalnızca grafiği kesmekle yetinme.

Kesilmemiş dağılım için geçerli kapalı form MLE/MOM/geri kazanım yöntemleri, kesilmiş gözlemlerde otomatik geçerli sayılmasın. Henüz koşullu sürümü uygulanmayan kombinasyonları açıklamayla devre dışı bırak.

Uç kuyruklarda F(U)−F(L) farkını kararlı hesapla. Sonuçlarda temel dağılım parametreleri, gözlenen koşullu dağılım ve eşik bilgisi ayrı olsun. N'nin eşik üstündeki ağaçları mı bütün popülasyonu mu temsil ettiği açıkça seçilsin.

Kabul: Seçilen gözlem aralığında koşullu yoğunluğun integrali 1 olmalı; koşullu CDF/quantile tutarlı olmalı. Simüle edilmiş kesilmiş veride bağımsız koşullu olabilirlik hesabıyla sonuçlar karşılaştırılmalı.
~~~

### P12 — Çap sınıfları ve gruplandırılmış veri

~~~text
Bölüm 2.3'e göre sınıf alt/üst sınırı ve gerçek gözlem sayısıyla veri girişini ekle.

Sınıf olasılıklarını CDF farkından hesapla. Sayısal MLE için Σn_j log(p_j) kullan. Orta nokta çoğaltmayı ham veri MLE'si gibi sunma. Eşit olmayan sınıf genişlikleri ve açık uçlu son sınıf desteklenebiliyorsa açıkça tanımla.

Tamsayı gözlem frekansı ile hektara genişletilmiş ağırlıkları ayır. Yalnızca genişletilmiş sıklık verilmişse bilinmeyen gerçek n'yi uydurma; standart AIC/BIC/p-değeri seçeneklerini geçerlilik durumuna göre sınırla.

Sıfır frekanslı fakat gözlenen sınıflar ve kayıt dışı aralıklar ayrı ele alınsın. Histogram, beklenen sayılar, N/ha ve kuyruk olasılığı aynı sınıf kenarlarından üretilsin.

Kabul: Destek tamamını kapsayan sınıflarda toplam olasılık 1 ve beklenen toplam N olmalı. Aynı sınıflar için elle hesaplanan olasılık/olabilirlik referansı sağlanmalı; sınıf genişliği değişince yanlış +1 sabiti kullanılmamalı.
~~~

### P13 — Model karşılaştırma ve tanı grafikleri

~~~text
Bölüm 2.4'e uygun bir karşılaştırma tablosu ve tanı görünümü oluştur.

Dağılım, tahmin yöntemi, parametreler, sınır/truncation politikası, n, yakınsama, log-olabilirlik, uygun olduğunda AIC/BIC, KS/AD/CvM ve sınıf hatalarını göster. Aynı veriyi ve gözlem sürecini kullanmayan sonuçları aynı sıralamada karıştırma.

MLE karşılaştırmasını MOM/geri kazanım sonuçlarının betimsel karşılaştırmasından ayır. Varsayılan olarak tüm modeller için tek bir gizli bileşik “en iyi model” puanı üretme; kullanıcı hangi ölçüte göre sıraladığını görsün.

Histogram üzerinde yoğunluk veya beklenen sınıf sayısı, ampirik/teorik CDF, Q–Q ve P–P grafikleri ekle. Grafik eksen birimleriyle yoğunluk/sayı ölçeklerini karıştırma. Sınıf karşılaştırmaları ortak kenarlar kullanmalı.

Kabul: KS çift taraflı formülü ve Poudel EI birimi doğru olmalı. Bootstrap tamamlanana kadar tahmin edilmiş parametrelere ait standart KS/AD p-değerleri gösterilmemeli. Lognormal log-olabilirliğinde Jacobian kontrolü yapılmalı.
~~~

### P14 — Bootstrap ve belirsizlik

~~~text
Uygun dağılım/yöntem kombinasyonları için tekrar üretilebilir bootstrap altyapısını ekle.

Uyum testi için parametrik bootstrap'ta her örneği fitted gözlem modelinden üret, aynı yöntemle yeniden uydur ve istatistiği yeniden hesapla. Veriden belirlenen sınırlar, truncation, sınıflama ve ölçüm yuvarlaması aynı süreçte tekrarlansın. Sabit dış sınırlar sabit kalmalı.

Parametre/quantile aralıkları ile uyum testi p-değerlerini ayrı işlemler olarak tasarla. Ham veri içi yeniden örnekleme ile çok alanlı modellerde alan düzeyinde yeniden örneklemeyi karıştırma.

Seed, tekrar sayısı, tamamlanan/başarısız tekrarlar ve Monte Carlo belirsizliği kaydedilsin. İşlem ilerlemesi ve iptal sağla; uzun hesaplar arayüzü dondurmasın. Yüksek başarısızlık oranını sessizce yok sayma.

Kabul: Aynı seed aynı sonucu üretmeli. Her bootstrap örneğinde yeniden tahmin yapıldığı kontrol edilmeli. M8/M9 gibi çok çözümlü yöntemlerde kullanılan seçim kuralı tekrarlar boyunca aynı kalmalı; desteklenmeyen kombinasyonlar açıkça belirtilmeli.
~~~

### P15 — Arayüz, çıktı ve ilk sürüm doğrulaması

~~~text
P01–P14 işlevlerini mevcut aracın tasarımına uygun şekilde birleştir.

Ana iş akışları “Veriden dağılım uydur” ve “Özetlerden parametre geri kazan” olsun. Meşcere modeli iş akışı uygulanınca ayrıca eklensin. Yöntem seçimi dağılıma ve veri tipine göre değişsin.

Mevcut örnek alan/dönem gezintisini yeniden kullan. Çoklu dağılım sonuçları aynı seçili alan/dönemle senkronize olsun. TR/EN açıklamalar, erişilebilir kontroller ve mobil görünüm sağla.

Her sonuçta kullanılan yöntem, birimler, destek/eşik politikası ve kaynak bulunabilsin. Tablo/grafik dışa aktarımında uygulama sürümü, ayarlar, model parametreleri ve varsa seed korunmalı. CSV gibi metin çıktılarında nokta kullan; elektronik tablo çıktılarında sayısal hücreleri metne çevirmeden sakla.

Örnek verilerle sekiz aileyi ve geri kazanım akışlarını uçtan uca kontrol et. Boş/eksik veri, eşit çaplar, virgüllü içe aktarma tercihi, alan değiştirme ve başarısız uyum senaryolarını doğrula.

Kabul: Çalışan sonuçlar ile desteklenmeyen/belirsiz sonuçlar ayırt edilmeli. İlk kullanılabilir sürümün tamamlanan kapsamını ve kalan aşamaları kısa raporla.
~~~

### P16 — Meşcere modelleri: PPM, PRM, NLS ve SUR

~~~text
Bölüm 4.1'e göre ayrı bir “Meşcere değişkenlerinden tahmin” iş akışı ekle.

Çok alanlı eğitim verisinde doğrudan parametre kestirimi PPM ile moment/yüzdelik kestirimi + geri kazanımı PRM olarak ayır. Başlangıçta Weibull ve Parresol hedeflerine odaklan.

Poudel'in orijinal ölçekte eklemeli hatalı üstel denklem biçimi için NLS uygula. SUR eklendiğinde denklemler arası artık kovaryansını gerçekten hesaba kat. Log-OLS sunulursa farklı hata/amaç tanımını açıkla; log dönüşümünden geri dönüşte yanlılık yaklaşımını belirt.

Eğitim/doğrulama ayrımını alan düzeyinde yap; aynı alanın dönemleri aynı grupta kalsın. Hedef üretme ve veriyle seçilen işlemler eğitim katı içinde yürüsün. Tahmin edilen yüzdelik sıralaması ve moment tutarlılığı kontrol edilsin; gizli kırpma yapma.

Katsayıları, eğitim kapsamını, birimleri, model sürümünü ve doğrulama sonuçlarını kaydet. Kullanıcı doğrulanmış modeli dışa/içe aktarabilsin.

[Rev] Meşcere açıklayıcıları (N, H, yaş, Dq vb.) ağaç tablosuyla birlikte gelen sütunlardan ya da Örnek Alan ve Meşcere aracının (sürüm 1.1.0) "ağaç verisi + meşcere parametreleri" çıktısından okunur; ayrı bir veri düzeni icat etme. Poudel'in H'si baskın/ortak baskın ağaçların ortalama boyudur; o aracın H0 sütunu (hektardaki en büyük 100 ağaç) aynı tanım değildir, hangi sütunun H olarak kullanıldığını kullanıcı seçer ve kaydedilir.

Kabul: Bağımsız örnekle NLS/SUR hesapları doğrulanmalı; model eğitimi olmadan rastgele veya makaleden kopyalanmış katsayılarla tahmin yapılmamalı.
~~~

### P17 — CDFR ve modified CDFR

~~~text
Bölüm 4.2'deki Poudel ve Cao CDFR/modified CDFR amaçlarını meşcere modeli eğitimine ekle.

Optimize edilen değişkenler örnek alanlar arasında ortak regresyon katsayıları olsun. Seçilen M1–M10 yoluna göre parametreler doğrudan kestirilsin veya hedeflerden geri kazanılsın. M1 için kaynak yaklaşımlarındaki konum politikası farkını açıkça uygula.

CDFR'de alan başına 1/n_i ağırlığı ve (j−0.5)/n_i plotting position kullan. Modified CDFR'de gerçek sınıf üst sınırı ve 1/(m_i−1) ağırlığı kullan; yalnızca bu amaçta son sınıfı dışla.

İç içe geri kazanım çözücülerindeki başarısızlıkları izlenebilir hale getir. Optimizasyonun çoklu kökler arasında açıklamasız atlamasına izin verme; önceden tanımlı seçim/parametre bölgesi politikasını kaydet.

Kaynak yeniden üretimi ile yeni truncation/ağırlık genişletmelerini ayrı adlandır. Alan düzeyinde çapraz doğrulama ve kaynak sınıf genişliğinden farklı örneklerle kontrol yap.

Kabul: Küçük veri üzerinde elle hesaplanan iki amaç fonksiyonu değerleri sağlanmalı. Histogram ve toplam ağaç sayısında son sınıf kaybolmamalı.
~~~

## 7. İsteğe bağlı ileri aşamalar

### P18 — L-moment, genel yüzdelik ve minimum uzaklık

~~~text
Temel sürüm tamamlandıktan sonra ek tahmin yöntemlerini kontrollü biçimde genişlet.

İlk olarak 2P/sabit konum Weibull ve 2P gamma için kaynakla doğrulanmış L-moment yöntemlerini ekle. Weibull'da y=d−a için c=−ln(2)/ln(1−L2/L1), b=L1/Γ(1+1/c); L1/L2 örnek L-momentleridir. Örnek L-moment hesabını bağımsız referansla kontrol et. Gamma için lmomco dokümantasyonunu referans al.

Genel QME'de seçilmiş yüzdelik ve ağırlıkları; MGE'de minimize edilen KS/CvM/AD ölçütünü açıkça kaydet. Her dağılımda bütün seçenekleri otomatik açma: yeterli bilgi, parametre tanımlanabilirliği ve destek kontrolleri yap.

Bu yöntemlerin sonuçlarını standart MLE-AIC sıralamasına otomatik katma. Aynı ölçütle uydurup aynı ölçütte değerlendirme yapıldığını kullanıcının görebilmesini sağla.

Kabul: L-moment, MOM ve MLE'nin farklı tanımları korunmalı; seçilen yöntem gerçekten uygulanmalı. Yeni yöntemler bağımsız örneklerle doğrulanmalı; başarısız sonuçlarda başka yönteme gizli geçiş olmamalı.
~~~

### P19 — Johnson SB: Fonseca ve arkadaşları (2009)

Bu, Parresol (2003)'ten ayrı bir yöntemdir. Fonseca, Marques ve Parresol'un çalışması medyan ve ilk üç ham momentten dört parametre geri kazanımı önerir. Üçüncü ham moment m3, göğüs yüzeyine göre ağırlıklı ortalama çap ile Dq² çarpımına eşittir. [R17]

Uygulama için Parresol gösterimini genişleten moment eşitliği:

$$
E[D^3]=\xi^3+3\xi^2\lambda u_1+
3\xi\lambda^2u_2+\lambda^3u_3=m_3.
$$

Medyan denklemiyle γ elimine edilip ξ, λ, δ için üç moment denklemi çözülür. Bu cebirsel ifade, belgedeki uygulama çıkarımıdır. Dört özetin sayıca dört olması her koşulda tek ve kararlı çözüm anlamına gelmez; özellikle simetrik durumlar ayrıca incelenmelidir.

~~~text
Fonseca–Marques–Parresol (2009) dört parametre geri kazanımını ayrı bir gelişmiş yöntem olarak ekle.

Girdiler medyan, m1, m2 ve m3 olsun. Dq²=m2 ve göğüs yüzeyi ağırlıklı ortalama=m3/m2 ilişkilerini doğru kullan. Parresol'un sabit ξ yönteminin üstüne aynı isimle yazma.

Medyan ve üç moment denklemine kısıtlı, çok başlangıçlı çözüm uygula. Fiziksel destek, moment uygunluğu, Jacobian rank/koşulluluk ve çoklu çözüm denetimi yap. Gerekli girdi bulunmadığında m3'ü ortalama ve varyanstan uydurma.

Kabul: Bilinen asimetrik parametrelerden üretilen özetlerin geri kazanımı doğrulanmalı. Simetrik veya zayıf tanımlanan girdilerde yapay tek çözüm üretmemeli. Kaynak ve yakınsama ayrıntıları kaydedilmeli.
~~~

### P20 — Genelleştirilmiş gamma ve Gumbel

Genelleştirilmiş gamma için bu aşamanın açık parametreleştirmesi:

$$
f(d)=\frac{c}{b\Gamma(a)}
\left(\frac d b\right)^{ac-1}
\exp[-(d/b)^c],\quad a,b,c>0.
$$

E[D^r]=b^r Γ(a+r/c)/Γ(a). c=1 gamma, a=1 Weibull özel durumudur. Buradaki a, Weibull'daki konum parametresi değildir; aileye özgü parametre şeması kullanılmalıdır. Bu sürüm pozitif c ile sınırlıdır; c<0 sağlayan daha geniş tanımla aynı kapsam iddia edilmemelidir. [R18]

Gumbel maksimum biçimi için F(d)=exp{−exp[−(d−μ)/β]}, β>0. MOM: β=√(6v)/π, μ=m−γ_E β; γ_E Euler–Mascheroni sabitidir. Minimum biçimin yönü ve ortalama bağıntısı farklıdır. [R19]

~~~text
Bu aşamayı iki küçük değişiklik halinde uygula: önce genelleştirilmiş gamma, sonra Gumbel.

Genelleştirilmiş gamma için yukarıdaki pozitif-c parametreleştirmesiyle MLE ekle. Üç parametreli kaydırılmış gamma ile karıştırma. Gamma/Weibull özel durumlarını doğrulama örnekleri olarak kullan.

Gumbel için maksimum biçimini açık adla, MLE ve MOM yöntemleriyle ekle. Negatif çap olasılığını raporla; truncation seçeneklerine bağlanıyorsa doğru koşullu olabilirlik kullan.

Her aileyi ancak kendi PDF/CDF/quantile, kısıt ve bağımsız sayısal kontrolleri tamamlanınca kullanıcıya aç. Parametre sayısını artırmanın otomatik olarak daha iyi biyolojik model anlamına gelmediğini karşılaştırma ekranının tasarımında koru.
~~~

### P21 — Burr XII ve Dagum

Kullanılacak iki ayrı CDF:

$$
F_{\text{Burr XII}}(d)=1-[1+(d/b)^c]^{-k},
\quad
F_{\text{Dagum}}(d)=[1+(d/b)^{-c}]^{-k},
$$

b,c,k>0, d>0. Burr XII'de r'nci pozitif moment için ck>r; Dagum'da c>r gerekir. Standart birimlerin eşlenmesi kütüphane adaptöründe açık olmalıdır. [R20, R21]

~~~text
Burr XII ve Dagum/Burr III ailelerini ayrı kimliklerle, başlangıçta sabit sıfır konum ve sayısal MLE ile ekle.

Yukarıdaki CDF tanımlarından parametre eşleştirmesini doğrula. Çoklu başlangıç, kararlı kuyruk hesapları ve destek kontrolleri kullan. Moment varlığı koşullarını sonuçlara yansıt; tanımsız ortalama/varyansı sayısal taşmayla karıştırma.

k=1 olduğunda her iki modelin log-logistic özel durumuna indirgenmesini test et. Ortak karşılaştırma ve bootstrap altyapısını yalnızca desteklenen kombinasyonlar için kullan.

Kabul: Bağımsız SciPy/R referanslarıyla PDF/CDF/quantile ve MLE karşılaştırmaları geçmeli. İki aile veya bunların parametre adları birbirine karışmamalı.
~~~

### P22 — İki bileşenli karışım dağılımları

~~~text
Tek dağılımlı sürüm kararlı hale geldikten sonra, ayrı bir gelişmiş analiz olarak iki bileşenli karışım ekle. Önce iki lognormal veya iki gamma bileşeni seç; tüm aile kombinasyonlarını tek aşamada uygulama.

f(d)=π f1(d)+(1−π)f2(d), 0<π<1. Karışım log-olabilirliğini log-sum-exp ile hesapla. EM veya kısıtlı doğrudan optimizasyon kullan; çoklu başlangıç, bileşen çökmesi ve çok küçük ağırlık kontrolleri ekle.

Bileşenlerin rapor sırasını ortalama/medyan gibi belirli bir kuralla standardize et. Bileşenleri otomatik olarak tür, yaş sınıfı veya biyolojik alt popülasyon diye yorumlama.

Tek bileşenle karşılaştırmayı destekle. Karışımlarda düzenli olmayan çıkarım sorunları nedeniyle standart olabilirlik oranı p-değeri veya otomatik AICc güvencesi verme; tahmin performansı ve alan düzeyinde doğrulama öncelikli olsun.

Kabul: İki tepeli sentetik örnekte bileşenler kararlı bulunmalı; tek tepeli örnekte aşırı uyum ve çökme tanıları çalışmalı. Bu aşamayı diğer tüm dağılımların tamamlanması için ön koşul yapma.
~~~

Karışım uyumunun ormancılık yazılımı bağlamındaki uygulama referansı: ForestFit fitmixture dokümantasyonu. [R22]

### P23 — Ampirik göğüs yüzeyi çap dağılımı (betimsel)

Kaynak: Kangas ve Maltamo (2000) [R23], Bölüm 2.2–2.3. Göğüs yüzeyi çap dağılımı, her ağacın g=πd²/40000 ile ağırlıklandığı dağılımdır. Sabit alanlı örnek alanda ampirik işlev:

$$F_G(x)=\frac{\sum_{d_i\le x} g_i}{\sum_i g_i}.$$

Sınıf k'nin göğüs yüzeyi b_k (m²/ha) ise ağaç sayısı f_k=b_k/ḡ_k; ḡ_k sınıfın ortalama ağacının göğüs yüzeyidir (kaynak Denklem 1). Ham çaplar varken ḡ_k gözlenen ağaçlardan hesaplanır; yalnızca sınıf sınırları biliniyorsa sınıf orta çapının göğüs yüzeyi bir yaklaşımdır ve böyle etiketlenir.

~~~text
Tek dağılımlı sürüm tamamlandıktan sonra, ayrı ve betimsel bir görünüm olarak ampirik göğüs yüzeyi çap dağılımını ekle.

Seçili örnek alan için ağaç sayısına göre ve göğüs yüzeyine göre ampirik kümülatif dağılımları birlikte göster. Göğüs yüzeyinin %0, 10, 20, …, 90, 95 ve 100 yüzdeliklerindeki çapları ve göğüs yüzeyi orta çapını (dgM, %50) ver; kullanılan yüzdelik tanımını kaydet. Çap sınıfı tablosuna sınıf göğüs yüzeyini (m²/ha) ve payını ekle.

Sınıf göğüs yüzeyinden ağaç sayısına dönüşümü f_k=b_k/ḡ_k ile uygula; ḡ_k'nin gözlenen ortalamadan mı sınıf orta çapından mı geldiğini belirt. Dönüşümün ham veriyle birebir tutarlı olduğunu doğrula.

Parametrik bir aileyi göğüs yüzeyi ağırlıklı veriye uydurma, boyut yanlı (size-biased) olabilirlik, açı sayımı verisi ve yüzdelik kestirim modelleri bu aşamanın kapsamında değildir; kaynaktaki tür katsayılarını gömme. Rasyonel spline ara değerlemesi ancak yüzdeliklerden dağılım kurma akışı eklenirse ve monotonluk denetimiyle birlikte uygulanır.

Kabul: Elle hesaplanan küçük örnekte F_G, yüzdelik çapları ve sınıf payları sağlanmalı; Σb_k toplam G'ye, Σf_k toplam N'ye eşit olmalı; ağaç sayısı dağılımı sonuçları değişmemeli.
~~~

## 8. Bağımsız sayısal referanslar

Bu değerler 10 Kasım 2026'da Python, NumPy 2.3.5 ve SciPy 1.17.0 kullanılarak hesaplandı. Sekiz modelde yoğunluk integrali ve F(Q.50)=0.5 kontrol edildi. Weibull geri kazanım denklemleri kök taramasıyla, Parresol örneği normal ağırlıklı sayısal integral ve bağımsız least-squares çözümüyle doğrulandı.

Bu kontroller web sitesine ait değildir; geliştirilecek kodun karşılaştırabileceği referanslardır. Tablo yuvarlamaları için yaklaşık 1e−8 mutlak tolerans uygundur. Parametre tahmini kontrollerinde problem ölçeğine uygun ayrıca bağıl tolerans belirlenmelidir.

### 8.1. PDF, CDF ve medyan

Tüm satırlarda değerlendirme noktası d=20 cm'dir.

| Dağılım ve parametreler | PDF(20) | CDF(20) | Q.50 |
|---|---:|---:|---:|
| Normal μ=20, σ=5 | 0.079788456080 | 0.500000000000 | 20.000000000000 |
| Lognormal μ=3, σ=0.4 | 0.049864946799 | 0.495743639452 | 20.085536923188 |
| Gamma k=2, θ=8 | 0.025651562070 | 0.712702504816 | 13.426775920133 |
| Weibull a=5, b=20, c=2.5 | 0.049881557187 | 0.385618549980 | 22.272698012047 |
| Beta L=5, U=45, α=2, β=5 | 0.042915344238 | 0.725818634033 | 15.577999331826 |
| Johnson SB ξ=5, λ=40, γ=0.6, δ=1.3 | 0.055206557626 | 0.474455926493 | 20.464836861499 |
| Exponential a=0, r=0.1 | 0.013533528324 | 0.864664716763 | 6.931471805599 |
| Log-logistic b=20, c=3 | 0.037500000000 | 0.500000000000 | 20.000000000000 |

### 8.2. Weibull geri kazanımı

a=5, b=20, c=2.5 için:

| Hedef | Değer |
|---|---:|
| Ortalama | 22.745276350061506 |
| Moment varyansı | 57.65867565204488 |
| İkinci ham moment | 575.0062718927121 |
| Dq | 23.979288394210368 |
| Q25 | 17.150527008986376 |
| Q31 | 18.45269745606343 |
| Q50 | 22.272698012047496 |
| Q63 | 24.95393865551951 |
| Q95 | 36.01924299565496 |

M2–M9 kontrollerinde a açıkça 5 verilmiştir. Kaynağın a=0.5Dmin politikası ayrıca denenecekse bu kontrol için hedef Dmin=10 girilir; bu değer teorik Q0 olarak yorumlanmaz.

0.15≤c≤50 aralığında bulunan kökler:

| Yöntem | Şekil parametresi adayları |
|---|---|
| M2 | 2.500000000000 |
| M3 | 2.500000000000 |
| M8 | 0.191476498065 ve 2.500000000000 |
| M9 | 0.398620001976 ve 2.500000000000 |

Bu, M8/M9'da tek kök varsayımının yanlış olabileceğini gösteren hesaplanmış bir örnektir; makaleden aktarılmış deney sonucu değildir. Adaylar ilgili ölçek formülleriyle birlikte değerlendirilmelidir.

M10 için ayrı konum kontrolü: n=125 ve Dmin=8.4545396024095 kullanıldığında, yukarıdaki Q50 ile a=5 elde edilir. Dmin burada formülü sınamak için üretilmiş bir hedeftir; M2–M9'un konum politikasıyla aynı Dmin olmak zorunda değildir.

### 8.3. Parresol geri kazanımı

| Girdi | Değer |
|---|---:|
| ξ | 5 |
| N, ağaç/ha | 500 |
| G, m²/ha | 18.979383683389663 |
| Ortalama çap | 20.972673017674087 |
| Medyan | 20.464836861498966 |
| Dq | 21.984222451746177 |
| İkinci ham moment | 483.30603680786066 |

Beklenen parametreler: ξ=5, λ=40, γ=0.6, δ=1.3. Bağımsız çözümde λ=39.99999999999997, γ=0.5999999999999978, δ=1.299999999999999 bulundu. En büyük ölçeklendirilmiş moment artığı yaklaşık 2.4×10⁻¹⁶ idi. Bu tek örnek, tüm veri kombinasyonlarında aynı kesinlik veya benzersizlik garantisi değildir.

### 8.4. Sınır ve yöntem uygunluğu kontrolleri

- Boş veri; tek gözlem; tüm çapların eşit olması.
- Sıfır/negatif değer ve seçilen desteğin dışındaki gözlem.
- Ayrı bir yuvarlama politikası bulunan tekrarlı çaplar.
- Ortalama–Dq uyumsuzluğu; sırasız veya eşit yüzdelikler.
- Beta ve Johnson SB'de sınır üzerindeki gözlemler.
- Weibull M8/M9 çoklu kökleri; M10'da n=1.
- Truncation eşiği değişirken destek parametresinin kendiliğinden değişmemesi.
- Birim dönüşümünde parametre ve yoğunluk dönüşümleri; aynı birimde model karşılaştırması.
- Hektara genişletme katsayısı değişirken bağımsız gözlem sayısının değişmemesi.
- Sınıf genişlikleri ve sınıf sayısı değişirken toplam olasılığın doğru kalması.
- TR/EN geçişinde sayısal hesapların ve varsayılan nokta gösteriminin korunması.

## 9. Kaynaklar ve hangi amaçla kullanıldıkları

### Yüklenen ve incelenen kaynaklar

- **[R1] Poudel, K. P. & Cao, Q. V. (2013).** Evaluation of Methods to Predict Weibull Parameters for Characterizing Diameter Distributions. Forest Science, 59(2), 243–252. [Yayın bağlantısı](https://academic.oup.com/forestscience/article-abstract/59/2/243/4583693), DOI: 10.5849/forsci.12-001. Yüklenen PDF'nin ana yöntem bölümü ve Tablo 2 incelendi; Tablo 2 ve K–S denkleminin bulunduğu sayfalar görsel olarak kontrol edildi. M1–M10, SUR/CDFR ayrımı ve EI/mLogL tanımları için temel kaynak.
- **[R2] Parresol, B. R. (2003).** Recovering Parameters of Johnson's SB Distribution. USDA Forest Service, Southern Research Station, Research Paper SRS–31. [Kurum PDF'si](https://www.srs.fs.usda.gov/pubs/rp/rp_srs031.pdf). Yüklenen PDF'nin yöntem bölümü ve integral/geri kazanım denklemleri incelendi. Sabit ξ koşulunda λ, γ ve δ geri kazanımı için temel kaynak.

### Dağılım seçimi ve ormancılık uygulamaları

- **[R3] Gorgoso-Varela, J. J., Adedapo, S. M. & Ogana, F. N. (2024).** A Comparison of Probability Density Functions Fitted by Moments and Maximum Likelihood Estimation Methods Used for Diameter Distribution Estimation. Forests, 15(3), 425. [Makale](https://www.mdpi.com/1999-4907/15/3/425). Dağılım/yöntem çeşitliliği ve MOM–MLE uygulamaları; tek veri setindeki başarıyı evrensel sıralamaya çevirmek için kullanılmadı.
- **[R4] Hafley, W. L. & Schreuder, H. T. (1977).** Statistical distributions for fitting diameter and height data in even-aged stands. Canadian Journal of Forest Research, 7, 481–487. [Özgün makale PDF'si](https://www.u-cursos.cl/forestal/2010/1/MF004/1/material_docente/bajar?id_material=483164). Normal, lognormal, gamma, beta, Weibull ve Johnson SB'nin klasik ormancılık karşılaştırması.
- **[R5] Binoti, D. H. B. ve arkadaşları (2012).** Probability density functions for description of diameter distribution in thinned stands of Tectona grandis. CERNE, 18(2). [Makale](https://www.scielo.br/j/cerne/a/M55XHDVw4LKSjns7m5jFNjQ/?lang=en), [dergi kaydı](https://cerne.ufla.br/site/index.php/CERNE/article/view/814). Log-logistic, genelleştirilmiş gamma, Burr, Dagum ve diğer alternatiflerin ormancılıkta MLE uygulaması.

### Yöntem ve hesaplama belgeleri

- **[R6] ForestFit — fitWeibull.** [Resmî paket belgesi](https://search.r-project.org/CRAN/refmans/ForestFit/html/fitWeibull.html). 2P/3P Weibull tahmin yöntemleri envanteri; parametre adı eşleştirmesi.
- **[R7] ForestFit — fitJSB.** [Resmî paket belgesi](https://search.r-project.org/CRAN/refmans/ForestFit/html/fitJSB.html). Johnson SB'de sabit sınırlar altında CML/MM/KB/Bayesian ayrımı.
- **[R8] fitdistrplus vignette.** [Geliştirici belgesi](https://lbbe-software.github.io/fitdistrplus/articles/fitdistrplus_vignette.html). MLE, moment, quantile ve minimum uzaklık yaklaşımlarının genel çerçevesi.
- **[R9] SciPy — goodness_of_fit.** [Resmî belge](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.goodness_of_fit.html). Parametrelerin tekrar tahmin edildiği Monte Carlo/parametrik bootstrap uyum değerlendirmesi.
- **[R10] NIST — Normal Distribution.** [Teknik el kitabı](https://www.itl.nist.gov/div898/handbook/eda/section3/eda3661.htm).
- **[R11] NIST — Lognormal Distribution.** [Teknik el kitabı](https://www.itl.nist.gov/div898/handbook/eda/section3/eda3669.htm).
- **[R12] NIST — Gamma Distribution.** [Teknik el kitabı](https://www.itl.nist.gov/div898/handbook/eda/section3/eda366b.htm).
- **[R13] lmomco — pargam.** [Resmî paket belgesi](https://search.r-project.org/CRAN/refmans/lmomco/html/pargam.html). Gamma için L-moment parametre tahmini.
- **[R14] NIST — Beta Distribution.** [Teknik el kitabı](https://www.itl.nist.gov/div898/handbook/eda/section3/eda366h.htm).
- **[R15] NIST — Exponential Distribution.** [Teknik el kitabı](https://www.itl.nist.gov/div898/handbook/eda/section3/eda3667.htm).
- **[R16] SciPy — fisk.** [Resmî belge](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.fisk.html). Log-logistic parametreleştirmesi.
- **[R17] Fonseca, T. F., Marques, C. P. & Parresol, B. R. (2009).** Describing Maritime Pine Diameter Distributions with Johnson's SB Distribution Using a New All-Parameter Recovery Approach. Forest Science, 55(4), 367–373. [Özgün makale PDF'si](https://capsis.cirad.fr/capsis/_media/help/describing_maritime_pine_with_sb_distribution.pdf). Medyan ve ilk üç ham momentle dört parametre geri kazanımı.
- **[R18] SciPy — gengamma.** [Resmî belge](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.gengamma.html).
- **[R19] NIST — Extreme Value Type I / Gumbel.** [Teknik el kitabı](https://www.itl.nist.gov/div898/handbook/eda/section3/eda366g.htm).
- **[R20] SciPy — burr12.** [Resmî belge](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.burr12.html).
- **[R21] SciPy — burr.** [Resmî belge](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.burr.html). Burr III / Dagum.
- **[R23] Kangas, A. & Maltamo, M. (2000).** Percentile based basal area diameter distribution models for Scots pine, Norway spruce and birch species. Silva Fennica, 34(4), 371–380. Yüklenen PDF okundu. Göğüs yüzeyi çap dağılımının tanımı, yüzdelik yöntemi ve sınıf göğüs yüzeyinden ağaç sayısına dönüşüm (P23) için kaynak.
- **[R22] ForestFit — fitmixture.** [Resmî paket belgesi](https://search.r-project.org/CRAN/refmans/ForestFit/html/fitmixture.html). Karışım dağılımları için EM uygulamaları.

Kaynaklar 10 Kasım 2026 araştırmasında erişilen sürümlerdir. Resmî paket sayfaları yöntem ve parametreleştirme referansıdır; mevcut projede o paketin veya aynı programlama dilinin zorunlu olarak kullanılmasını gerektirmez.

