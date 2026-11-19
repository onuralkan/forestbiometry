<section class="card guide-sec">
<?= $sec('cap-dagilimi', 'Çap Dağılımı Laboratuvarı') ?>
<p>Tek ağaç çaplarına ya da çap sınıflarına sekiz olasılık dağılımı fit eder: Weibull, normal, lognormal, gamma, sabit sınırlı beta, Johnson SB, üstel ve log-lojistik; isteğe bağlı olarak <b>Genelleştirilmiş gamma (konumsuz)</b> ve <b>Gumbel (maksimum biçimi)</b>. Her örnek alan ve dönem ayrı hesaplanır. Ayrı bir iş akışı, ham veri olmadan özet değerlerden parametre geri kazanır.</p>
<p><b>Yapmadıkları:</b> konum ve sınır parametrelerini tahmin etmez (Weibull ve üstelde a, beta'da L ve U, Johnson SB'de ξ ve λ sizin verdiğiniz sabit değerlerdir, veriden alınmaz); göğüs yüzeyiyle ağırlıklı fit etme yapmaz; makalelerden kopyalanmış katsayılarla tahmin yapmaz (meşcere modeli yalnızca sizin verinizle eğitilir).</p>
<h3>Üç iş akışı</h3>
<ul>
<li><b>Ölçülmüş çaplara fit etme</b>: Veri, Ayarlar, Sonuçlar adımları.</li>
<li><b>Özetlerden geri kazanım</b>: ortalama çap, varyans ya da Dq, yüzdelikler ve benzeri özetlerden parametreler.</li>
<li><b>Meşcere modeli</b>: çok sayıda örnek alandan bir model eğitip ağaç sayısı, meşcere boyu ve yaştan dağılım tahmin etme.</li>
</ul>
<h3>1. Veri</h3>
<p>Her satır bir ağaç (çap sütunu zorunlu; örnek alan ve dönem isteğe bağlı) ya da her satır bir çap sınıfı (alt sınır, üst sınır, sıklık). Başlıkta alt/üst/sıklık sütunları bulunursa tablo sınıf tablosu olarak tanınır.</p>
<h3>2. Ayarlar</h3>
<ul>
<li><b>Veri türü</b>: tek ağaç çapları ya da sınıflandırılmış sıklıklar. Sınıflı veride sıklığın türü (ölçülen ağaç sayısı ya da hektara genişletilmiş sıklık) ve sınıfların dışı ("ölçüldü, ağaç yok" ya da "kayıt dışı") belirtilir.</li>
<li><b>Sütunlar</b>: çap ve birimi (cm, mm), örnek alan, dönem, isteğe bağlı süzgeç.</li>
<li><b>Analiz birimi</b>: her örnek alan ayrı ya da bütün ağaçlar birlikte (havuz).</li>
<li><b>Ölçüm eşiği</b>: yalnızca belli bir çapın üstündeki (ya da iki eşik arasındaki) ağaçlar ölçüldüyse burada bildirin; fit etme koşullu olabilirlikle yapılır. Eşik, dağılımın destek sınırıyla ya da verideki en küçük çapla aynı şey değildir.</li>
<li><b>Dağılımlar ve tahmin yöntemleri</b>: en çok olabilirlik, momentler, yüzdelikler ve log-momentler. Her ailenin formülleri ve notları "Ayrıntılar" kutusundadır. Moment varyansında varsayılan bölen n'dir; n − 1 seçenektir. Varsayılan olarak seçili gelmeyen ek yöntemler: <b>L-momentler</b> (Weibull, gamma), <b>Genel yüzdelik eşleştirme (QME)</b> (seçtiğiniz olasılıklar ve ağırlıklarla) ve <b>En küçük uzaklık (MGE)</b> (KS, Cramér–von Mises ya da Anderson–Darling) (normal, gamma, beta). Bunlar olabilirliği en büyüklemediği için AIC tablosuna girmez; bir MGE satırı, fit edildiği ölçütle sıralanan tabloda † ile işaretlenir. Genelleştirilmiş gamma da varsayılan olarak seçili gelmez: gamma (c = 1) ve Weibull (a = 1) onun özel durumlarıdır, bu yüzden ln L değeri onlarınkinden küçük olamaz; bu, daha iyi bir model olduğu anlamına gelmez. Gumbel bütün reel sayılarda tanımlıdır; fit edilen modelin negatif çaplara verdiği olasılık F(0) her sonuçta yazılır.</li>
<li><b>Sabit konum a</b> (Weibull, üstel): a = 0 her zaman hesaplanır; bir değer yazarsanız o konumla da hesaplanır. <b>Beta L, U</b> ve <b>Johnson SB ξ, λ</b> bu aileler seçildiğinde istenir.</li>
</ul>
<h3>3. Sonuçlar</h3>
<ul>
<li><b>Sonuçlar</b>: birim özeti; bütün fit işlemlerinin sıralanabilir tablosu (AIC, BIC, KS, AD ve öteki ölçütler; olabilirliği en büyükleyen yöntemler ile betimsel yöntemler ayrı); notlar ve uyarılar; "Yöntemler, birimler ve kaynaklar" paneli; aile başına bütün sütunlu tablolar açılır kutuda. "Bütün ölçütler" anahtarı BIC, AICc, CvM, sınıf hataları, EI ve çözücüyü gösterir.</li>
<li><b>Grafikler</b>: histogram ve yoğunluklar (yoğunluk ya da ağaç sayısı ölçeğinde), birikimli dağılım, Q–Q ve P–P.</li>
<li><b>Sınıflar</b>: gözlenen ve beklenen sınıf sıklıkları; örnek alan büyüklüğü girilirse hektarda değerler. Aynı sekmedeki <b>Göğüs yüzeyi çap dağılımı (betimsel)</b> kartı, ağaçların göğüs yüzeyiyle ağırlıklandığı birikimli dağılımı ağaç sayısına göre olanın yanında çizer. Göğüs yüzeyinin %0, 10, …, 90, 95 ve 100 yüzdeliklerindeki çapları ve dgM'yi (göğüs yüzeyinin yarısının üstünde kaldığı çap) verir. Sınıf göğüs yüzeyini, payını ve ağaç sayısına dönüşümünü (f = G/ḡ) gösterir. Hiçbir dağılım bu ağırlıklı veriye fit edilmez; ham çap gerektirir.</li>
<li><b>Belirsizlik</b>: parametrik bootstrap ile uyum testi p değerleri; parametre ve yüzdelik aralıkları. Aynı seed aynı sonucu verir; hesap iptal edilebilir.</li>
</ul>
<p>Bir sonuç yalnızca "tamam" durumunda parametre gösterir. Öteki durumlarda (arama aralığının sınırında, yakınsamadı, birden çok çözüm, hesaplanmadı, hata) parametre verilmez ve nedeni yazılır.</p>
<h3>Özetlerden geri kazanım</h3>
<p>Üstteki tablo hangi özetlerle hangi yöntemin kullanılabileceğini gösterir. Üç grup ayrı sekmelerdedir: normal, lognormal ve gamma (ortalama ve varyans ya da Dq); Weibull, Poudel ve Cao (2013) M2–M10 (ortalama, Dq, varyans, yüzdelikler; konum için Dmin ya da sabit a); Johnson SB, Parresol (2003) (ξ, ortalama, medyan ve Dq ya da N/ha ile G); <b>Johnson SB (Fonseca, 4 parametre)</b>, Fonseca ve ark. (2009) (ortalama, medyan, Dq ve göğüs yüzeyi ağırlıklı ortalama çap d̄_G; ξ de geri kazanılır; simetrik ya da zayıf belirlenen girdilerde tek sonuç verilmez). Bir sekmede girilen ortalama, varyans, Dq ve n öteki sekmelere de yazılır. Ham veri yüklüyse Weibull ve Parresol hedefleri o veriden hesaplanabilir.</p>
<h3>Meşcere modeli</h3>
<p><b>Model eğit</b> sekmesinde eğitim verisi, her satırı bir ağaç olan ve meşcere değişkenlerini (N ağaç/ha, H m, yaş) her ağaç satırında o alanın değeriyle tekrarlayan bir tablodur; Örnek Alan ve Meşcere Hesaplayıcısı'nın "Ağaç verisi + meşcere parametreleri (Excel)" çıktısı bu biçimdedir. Örnek alan sütunu zorunludur. H olarak hangi sütunu kullandığınızı siz seçersiniz (Poudel ve Cao'nun H'si baskın ve ortak baskın ağaçların ortalama boyudur; Örnek Alan aracının H0'ı aynı tanım değildir) ve seçim modele kaydedilir.</p>
<ul>
<li><b>Yaklaşım ve yanıtlar</b>: PPM (Weibull b ve c doğrudan) ya da PRM (Weibull M2–M9 ya da Johnson SB Parresol hedefleri; tahminde parametreler bu hedeflerden geri kazanılır).</li>
<li><b>Terimler</b>: RS, ln N, ln H, 1/A (Poudel ve Cao'nun biçimi).</li>
<li><b>Regresyon yöntemi</b>: NLS (her yanıt ayrı), SUR (yanıtlar birlikte, denklemler arası kovaryansla), log-OLS (ln y üzerinde; farklı bir amaç fonksiyonu, geri dönüş seçilir), CDFR ya da modified CDFR (Weibull yolları: katsayılar bütün alanlarda gözlenen ve tahmin edilen birikimli dağılımlar arasındaki uzaklığı en küçükler; modified CDFR, <b>Sınıf genişliği (cm)</b> alanında seçtiğiniz genişlikte çap sınıflarıyla çalışır). CDFR'de geri kazanımı çözülemeyen ya da birden çok çözümü olan adımlar reddedilir ve sayılır; PPM'de konum a = 0 ya da a = 0.5 × tahmin edilen Dmin seçilir.</li>
<li><b>Doğrulama</b> örnek alan düzeyindedir: bir alanın bütün dönemleri aynı kattadır. Her birim için tahmin edilen dağılımın gözlenen ağaçlardaki −ln L ve KS değeri verilir; tahmin edilemeyen birimler sayılır.</li>
</ul>
<p><b>Modeli indir (JSON)</b> katsayıları, eğitim kapsamını, birimleri, sürümü ve doğrulama sonuçlarını kaydeder. <b>Modelle tahmin</b> sekmesinde bu oturumda eğitilen modeli ya da bir model dosyasını seçip N, H ve yaşı girersiniz. Tahmin edilen yüzdelikler sıralı değilse ya da Dq ortalama çaptan büyük değilse parametre verilmez (değerler kırpılmaz); eğitim aralığı dışındaki girdiler dışa değerleme olarak işaretlenir.</p>
<h3>İndirme</h3>
<p>Excel raporu (Bilgi, Fit işlemleri, Parametreler, Örnek alanlar, Sınıflar, GY dağılımı, Karşılaştırma, Bootstrap, Kaynaklar), fit işlemleri ve parametreler CSV olarak, sonuç kayıtları JSON olarak; grafikler SVG olarak (dosyanın içinde sürüm, ayarlar ve parametreler).</p>
<p><b>R kodu (.R)</b> (Parametreler sekmesi): fit etme çalıştırmasını <code>fitdistrplus</code> paketiyle yeniden yapan betik; aynı birimler, çaplar ya da sınıflar, sabit parametreler, seçenekler ve ölçüm eşikleri. Dağılımlar betikte aracın parametreleriyle yazılıdır (R'ın aynı adlı işlevleri başka parametre kullanabilir); ML, momentler, iki yüzdelik ve en küçük uzaklık <code>fitdistrplus</code> ile, L-momentler, log-momentler, ağırlıklı yüzdelik eşleme ve sınıflanmış veri olabilirliği betikte açıkça. R'ın eniyileyicisi aracın sonucunun iki anlamlı basamağından başlar, optimumu kendisi bulur. Geri kazanım kartlarının (momentler, Weibull M2–M10, Johnson SB Parresol ve Fonseca) kendi R kodu düğmesi vardır: kartın özetleri betiğe yazılır, aynı denklemler R'da çözülür (Johnson SB'de <code>nleqslv</code> paketiyle). Bootstrap sekmesindeki <b>R kodu (.R)</b>, o fit için yaptığınız bootstrap çalıştırmalarını R'da yeniden yapar: üreteç aracınkidir (mulberry32), aynı tohum aynı yinelemeleri verir; çekilişler aracın tahminlerinden yapılır, R'ın kendi tahmini yanında yazdırılır; p-değerleri ve aralıklar araçla aynı çıkar. Meşcere modelinin eğitim sonuçlarındaki <b>R kodu (.R)</b>, eğitimi ve örnek alan katlı çapraz doğrulamayı R'da yeniden yapar: aynı birimler ve meşcere değişkenleri, aynı hedefler (PPM'de birim başına Weibull ML, PRM'de özetler), NLS (<code>nls</code>), yinelemeli SUR, log-OLS ya da CDFR / değiştirilmiş CDFR (Levenberg–Marquardt betikte açıkça, her adımda geri kazanım); çapraz doğrulamada aracın kat ataması; tahmin sekmesinde bir tahmin yaptıysanız o meşcere için yanıtlar ve geri kazanılan parametreler. Veri gömülmez; betiğin başındaki dosya adını kendi dosyanızın yoluyla değiştirirsiniz. Sitenin testleri bu kodun aracın sayılarını verdiğini her yayında R'da denetler.</p>
<h3>Sık karşılaşılanlar</h3>
<ul>
<li>Çok az ağaçlı ya da bütün çapları eşit bir örnek alanda sonuçlar "hesaplanmadı" olur; neden notlarda yazar.</li>
<li>Beta ya da Johnson SB seçilip sınırlar girilmezse hesaplanamaz; sınırların dışında kalan ya da sınıra eşit çaplar reddedilir.</li>
<li>Ölçüm eşiği seçildiğinde eşiksiz yöntemler kapanır; yalnızca koşullu en çok olabilirlik kullanılır.</li>
<li>Okunabilir çap yoksa sonuç sayfası boş kalmaz, neyin denetleneceği yazılır.</li>
</ul>
</section>
