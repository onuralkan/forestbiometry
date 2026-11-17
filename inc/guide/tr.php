<?php
// Kullanım kılavuzu, Türkçe. Yalnızca araçların gerçekte yaptığını anlatır (arayüz metinleri ve kod; METHODS.md).
// Formüller burada tekrarlanmaz. Bölüm kimlikleri araç dosya adlarıdır. İngilizce karşılığı: en.php (aynı yapı).
?>
<section class="card guide-sec">
<?= $sec('genel', 'Genel') ?>
<h3>Verileriniz</h3>
<p>Bütün hesaplar tarayıcınızda yapılır. Yüklediğiniz dosyalar sunucuya gönderilmez, sunucuda kullanıcı verisi tutulmaz. Her aracın oturumu (yüklenen tablo, ayarlar) yalnızca bu tarayıcıda (IndexedDB) saklanır ve sayfaya döndüğünüzde "Önceki oturum geri yüklendi" iletisiyle açılır. Her araçtaki <b>Oturumu sıfırla</b> düğmesi o aracın kaydını siler. Başka bir tarayıcı ya da bilgisayar bu kayıtları görmez.</p>
<h3>Veri yükleme</h3>
<ul>
<li><b>Dosya seç</b>: CSV, TXT, TSV ve Excel (XLSX). Eski .xls biçimi okunmaz; Excel'de .xlsx olarak kaydedin. Excel dosyasındaki formüller ve makrolar çalıştırılmaz, yalnızca kayıtlı son değerler okunur; birden çok çalışma sayfası varsa sayfayı seçebilirsiniz.</li>
<li><b>Excel'den yapıştırın</b>: hücreleri kopyalayıp kutuya yapıştırın.</li>
<li>Metin dosyalarında sütun ayırıcı algılanır (değiştirilebilir). <b>Karakter kodlaması</b> utf-8, windows-1254 ya da iso-8859-9 seçilebilir; Türkçe harfler bozuk görünüyorsa kodlamayı değiştirin. <b>İlk satır başlık</b> kutusu başlık satırını belirler.</li>
<li>Sütunlar başlık adlarından önerilir (ör. <code>cap_cm</code>, <code>dbh</code>, <code>alan_no</code>, <code>plot</code>); öneriyi her zaman denetleyin.</li>
</ul>
<h3>Ondalık ayırıcı</h3>
<p>Ondalık ayırıcı arayüz dilinden bağımsızdır. Araç metin hücrelerine bakıp nokta mı virgül mü kullanıldığını söyler, ama kararı size bırakır: <b>Nokta (24.5)</b> ya da <b>Virgül (24,5)</b>. "1.234" gibi hem ondalık hem binlik ayırıcı olabilecek değerler "belirsiz" diye bildirilir. Seçiminize uymayan değerler okunamaz sayılır ve satır numaralarıyla raporlanır; hiçbir değer sessizce atlanmaz. Excel'in sayı hücreleri bu ayardan etkilenmez.</p>
<h3>Örnek veri</h3>
<p>Her araçta bir örnek veri düğmesi vardır. Örnek veriler benzetimdir (uydurulmuştur), gerçek ölçüm değildir; aracı denemek ve sınır durumlarını görmek içindir.</p>
<h3>Dışa aktarma</h3>
<ul>
<li><b>Excel raporu</b>: sayılar sayı hücresi olarak, tam duyarlıkla yazılır; ilk sayfada (Bilgi) araç, sürüm, tarih ve ayarlar bulunur.</li>
<li><b>CSV</b>: her iki dilde sütun ayırıcı virgül, ondalık ayırıcı noktadır. Türkçe bölge ayarlı Excel CSV dosyasını tek sütunda açabilir; o durumda Excel raporunu kullanın.</li>
<li><b>Grafikler</b> SVG olarak indirilir.</li>
</ul>
<h3>Kaynak gösterme</h3>
<p>Her sayfanın üstündeki <b>Atıf</b> düğmesi, araç sayfasında o aracı ve sürümünü, ana sayfada platformun tamamını APA, MLA, Chicago, Harvard, IEEE, Vancouver, BibTeX ve RIS biçimlerinde verir. Atıflarda platformun Zenodo arşivinin kavram DOI'si (10.5281/zenodo.24135603) bulunur. Aracın sürümü sayfa başlığında yazar. Araçtaki yöntemlerin özgün kaynaklarını ayrıca gösterin; araçlar bunları listeler.</p>
</section>

<section class="card guide-sec">
<?= $sec('is-akisi', 'Araçlar birlikte') ?>
<p>Araçlar tek başına kullanılabilir; birlikte kullanıldığında veri bir kez denetlenir ve sonraki araçlar aynı veriyi okur.</p>
<ol>
<li><b>Ormancılık Verisi Denetçisi</b>: ağaç ve örnek alan tablolarını denetleyin, düzeltmeleri gerekçesiyle kaydedin ve veriyi <b>onaylayın</b>. Onaylanan veri bu tarayıcıda saklanır; birden çok onaylı paket <b>Envanter Verisi Yöneticisi</b>'nde tutulur ve biri etkin seçilir.</li>
<li>Onaylanmış veriyi doğrudan okuyan araçlar: <b>Örnek Alan ve Meşcere Hesaplayıcısı</b> ("Denetçide onaylanmış veri"), <b>Boy–Çap Modelleme</b> ve <b>Model Başarısı Değerlendiricisi</b> ("Onaylanmış veriden al"). Bu araçlar ayrıca doğrudan tablo da kabul eder.</li>
<li><b>Envanter Örnekleme Planlayıcısı</b>, örnek alan düzeyindeki değerleri bekler: Örnek Alan ve Meşcere Hesaplayıcısı'nın "Örnek alan tablosu (CSV)" çıktısı bunun için kullanılabilir.</li>
<li><b>Çap Dağılımı Laboratuvarı</b> ve <b>Nispi Sıralama</b> kendi tablolarını yükler (çap listesi ya da sınıf tablosu; başarı ölçütleri tablosu).</li>
</ol>
</section>

<section class="card guide-sec">
<?= $sec('veri-denetcisi', 'Ormancılık Verisi Denetçisi') ?>
<p>Ağaç ve örnek alan tablolarınızı denetler: biçim hataları, eksik ve mükerrer kayıtlar, çelişen alan büyüklükleri ve şüpheli çap–boy değerleri. Hiçbir şey kendiliğinden silinmez ya da değiştirilmez; her düzeltme gerekçesiyle günlüğe yazılır. Onayladığınız veri öteki araçlar tarafından okunur.</p>
<p><b>Yapmadıkları:</b> bilimsel hesap yapmaz (okur, dönüştürür, tarar); birimi değerlerin büyüklüğüne bakarak değiştirmez; binlik ayırıcı tahmin etmez. Kontrol sınırları ayarlanabilir tarama eşikleridir, literatür değerleri değildir.</p>
<h3>1. Veri</h3>
<p><b>Ağaç / ölçüm tablosu</b> zorunludur: her satır bir ağacın bir dönemdeki ölçümü. <b>Örnek alan tablosu</b> isteğe bağlıdır: alan büyüklükleri ve boş örnek alanlar için.</p>
<h3>2. Sütunlar ve birimler</h3>
<ul>
<li>Ağaç tablosunda zorunlu: örnek alan kimliği, ağaç kimliği, tür, göğüs çapı. İsteğe bağlı: boy, dönem, gövde kimliği, örnek alan büyüklüğü, tabaka, durum, X ve Y koordinatı, ağaç yaşı (yıl; Bonitet aracı onaylanmış veriden yaşı buradan alır; yaşın türü orada seçilir). Örnek alan büyüklüğü ağaç tablosunda ya da örnek alan tablosunda bulunmalıdır.</li>
<li>Öneriler yalnızca birebir başlık eşleşmesinden gelir (ör. <code>alan_no</code>, <code>agac_no</code>, <code>tur</code>, <code>cap_cm</code>); <code>_cm</code>, <code>_m2</code> gibi ekler birimi de önerir.</li>
<li>Birimler: çap cm/mm/m, boy m/dm/cm, alan m²/ha. Seçiminize göre çevrilmiş en küçük, ortanca ve en büyük değerler gösterilir; birimi bunlara bakarak denetleyin.</li>
</ul>
<h3>3. Kontrol ayarları</h3>
<p>Çap (varsayılan 1–200 cm), boy (2–60 m) ve incelik h/d (15–200) sınırları; "Varsayılanlara dön" ve "Kontrolleri çalıştır".</p>
<h3>4. Sonuçlar</h3>
<ul>
<li><b>Hatalar</b> (onayı engeller): okunamayan sayı, boş zorunlu alan, sıfır ya da negatif değer, mükerrer kayıt (aynı ağacın farklı dönemleri mükerrer değildir), örnek alan tablosunda olmayan alan, aynı alan için farklı büyüklük ya da tabaka, büyüklüğü olmayan alan.</li>
<li><b>Uyarılar</b>: baştaki ya da sondaki boşluk, farklı yazılmış aynı tür kodu, dönemler arasında değişen tür, sınır dışı çap, boy ya da incelik, çapı ölçülmüş ama 1.3 m'den kısa ağaç.</li>
<li><b>Bilgi</b>: ağacı olmayan örnek alan (hektarda 0 ağaçla veride kalır).</li>
</ul>
<p><b>Sorunlar</b> sekmesinde her satır için: Düzelt, öneriyi uygula, kaydı dışla (silinmez), geri al, uyarıyı kabul et, çelişkide değer seç, alan büyüklüğü gir. Her işlem bir gerekçe ister ve <b>Değişiklik günlüğü</b>ne yazılır; ham değerler korunur. <b>Veri</b> sekmesinde hücreye tıklayarak da düzeltilir.</p>
<p><b>Onay ve dışa aktarma</b>: hata kalmadığında "Veriyi onayla ve kaydet" etkinleşir; açık uyarılar veriyle birlikte saklanır. Onaylanan veri bu tarayıcıda saklanır, <b>Envanter Verisi Yöneticisi</b>'nin listesine eklenir ve etkin paket olur; onaylanmış veriyi okuyan araçlar etkin paketi kullanır. Onaydan sonra veri değişirse yeniden onaylamanız istenir. "Oturumu sıfırla" onaylanmış veriyi silmez.</p>
<h3>İndirme</h3>
<p>Sorun tablosu ve değişiklik günlüğü (CSV); onaydan sonra onaylanmış veri (CSV), veri paketi (JSON) ve tam rapor (Excel). CSV dosyasını Excel'de açarken baştaki sıfırlar (ör. 001) kaybolabilir.</p>
<h3>Sık karşılaşılanlar</h3>
<ul>
<li>Türkçe harfler bozuksa dosya büyük olasılıkla windows-1254 kodlamalıdır; "Karakter kodlaması"nı değiştirin.</li>
<li>"001" ile "1" farklı örnek alanlardır; araç bunları birleştirmez.</li>
<li>Zorunlu bir alan eşlenmemişse ya da bir sütun iki alana eşlenmişse devam edilemez.</li>
</ul>
</section>

<section class="card guide-sec">
<?= $sec('ornek-alan', 'Örnek Alan ve Meşcere Hesaplayıcısı') ?>
<p>Her örnek alan ve ölçüm dönemi için hektarda ağaç sayısı (N/ha) ve göğüs yüzeyi (G/ha), aritmetik ortalama çap ve kuadratik ortalama çap (Dq), çapın standart sapması, en küçük ve en büyük çap, çap sınıfı dağılımı, tür katılımı, baskın çap ve boy (D0, H0: hektardaki en büyük 100 ağaç), ölçülmüş boyların ortalaması ve ortalama yaş. Ayrıca örnek alanlar arası betimsel özet ve, bir örnekleme tasarımı belirtilirse, orman için tasarıma dayalı tahmin.</p>
<p><b>Yapmadıkları:</b> boy tahmin etmez (veride "tahmini" işaretli boylar ölçülmüşlerle birleştirilmeden ayrı gösterilir); güven aralığı vermez; yalnızca sabit alanlı örnek alanlar içindir (iç içe alanlar ve açı sayımı kapsam dışıdır, araç bunları kendiliğinden düzeltmez); basit rastgele tasarımda sonlu popülasyon düzeltmesi uygulamaz. Örnek alanlar arası tablo bir orman tahmini değildir.</p>
<h3>Veri</h3>
<ul>
<li><b>Denetçide onaylanmış veri</b>: "Bu veriyi kullan". Önerilen yol budur.</li>
<li><b>Veri paketi (.json)</b>: Denetçi'nin dışa aktardığı paket.</li>
<li><b>Ağaç tablosu (Excel, CSV)</b>: her satır bir ağaç. Zorunlu: örnek alan, çap, örnek alan büyüklüğü (sütun ya da bütün alanlar için tek değer). İsteğe bağlı: boy, yaş, ağaç no, tür, dönem, tabaka, durum. Birimler: çap cm/mm, alan m²/ha, boy m/dm/cm. Doğrudan yüklenen tabloda Denetçi'nin kodlama ve birim denetimleri yapılmaz; yalnızca okunamayan değerler bildirilir.</li>
</ul>
<p>Devam etmek için kapsam beyanını işaretleyin: veriler sabit alanlı örnek alanlardan gelir, iç içe alan ya da açı sayımı kullanılmamıştır.</p>
<h3>Ayarlar</h3>
<ul>
<li><b>Sayılacak kayıtlar</b>: veride durum bilgisi varsa hangi durumların sayılacağı (varsayılan hepsi).</li>
<li><b>Kaydı olmayan örnek alan–dönem birleşimleri</b>: bazı alanların bazı dönemlerde hiç ağaç kaydı yoksa siz karar verirsiniz: "Ölçüldü, ağaç yok (N = 0, G = 0)" ya da "Ölçülmedi". Karar verilmezse bu birleşimler hesap dışında kalır ve o dönem için orman tahmini yapılmaz.</li>
<li><b>Baskın çap ve boy</b>: "en büyük" ağaçların çapa göre, boya göre ya da ikisine göre ayrı ayrı seçilmesi. H0 yalnızca ölçülmüş boylarla hesaplanır.</li>
<li><b>Çap sınıfları</b>: eşit genişlik (varsayılan 4 cm) ya da sınır listesi; sınıflar [alt, üst) yarı açıktır; son sınırın üstü isteğe bağlı açık sınıf.</li>
<li><b>Orman için tahmin</b>: tasarım belirtilmezse orman tahmini yapılmaz. "Basit rastgele" (sistematik ızgara için yaklaşık) ve isteğe bağlı orman alanı (toplamlar için); "Tabakalı rastgele" ve tabaka alanları (veride tabaka varsa).</li>
</ul>
<h3>Sonuçlar</h3>
<ul>
<li><b>Örnek alanlar</b>: her alan × dönem için bir satır ve durumu (ölçüldü, boş, ölçülmedi, karar bekliyor). Alan kimliğine tıklayınca ayrıntı açılır.</li>
<li><b>Ayrıntı</b>: temel ölçüler (genişletme çarpanı 10000/A dahil), baskın ağaçlar ve yaş, çap sınıfı dağılımı ve grafiği, tür katılımı (paylar ve paydaları), boylar. Soldaki gezgin arama, sıralama ve "yalnızca sorunlu" süzgeci sunar; ← → tuşlarıyla alanlar arasında gezilir.</li>
<li><b>Alanlar arası özet</b>: dönem başına örnek alan sayısı, ortalama, standart sapma, en küçük, ortanca, en büyük (alan büyüklüğüyle ağırlıklandırılmaz).</li>
<li><b>Orman tahmini</b>: N/ha ve G/ha için tahmin, standart hata, bağıl standart hata ve (alan girildiyse) toplamlar; birden çok tür varsa tür başına; tabakalı tasarımda tabaka tablosu.</li>
</ul>
<h3>İndirme</h3>
<p>"Ağaç verisi + meşcere parametreleri (Excel)" ağaç tablosunu değiştirmeden alan düzeyindeki sonuçları ekler; "Tam rapor (Excel)"; örnek alan tablosu, çap sınıfları ve tür katılımı CSV olarak.</p>
<h3>Sık karşılaşılanlar</h3>
<ul>
<li>"Sorun bulundu; tablo kullanılmadı": aynı alan için farklı büyüklükler ya da aynı dönemde tekrarlanan ağaç numarası gibi sorunlar satır numaralarıyla listelenir.</li>
<li>Sınıf sınırları kesin artan değilse ya da sınıf sayısı çok fazlaysa hesaplanmaz.</li>
<li>Tabakalı tasarımda alanı girilmemiş tabaka ya da tabakada tek örnek alan varsa standart hata verilmez.</li>
</ul>
</section>

<section class="card guide-sec">
<?= $sec('model-degerlendirme', 'Model Başarısı Değerlendiricisi') ?>
<p>Gözlenen değerleri bir ya da daha fazla modelin tahminleriyle karşılaştırır: yanlılık (ē), MAE, RMSE ve tahmin R² (1 − SSE/SST); gözlenen–tahmin ve artık grafikleri; örnek alan, tür, çap sınıfı ve doğrulama katına göre tablolar. Hata işareti her yerde <b>e = tahmin − gözlenen</b>; pozitif yanlılık modelin ortalamada fazla tahmin ettiğini gösterir. R² ilişki katsayısının karesi değildir, negatif olabilir.</p>
<p><b>Yapmadıkları:</b> AIC, düzeltilmiş R², parametre güven aralıkları ve model anlamlılığı hesaplanmaz (parametre sayısı bilinmez). Araç dış doğrulama olduğunu varsaymaz.</p>
<h3>Veri</h3>
<p>Her satır bir gözlem: gözlenen değer ve bir ya da daha fazla modelin tahmini. Örnek alan, tür, çap ve doğrulama katı sütunları isteğe bağlıdır. Tablo dosyadan, yapıştırarak ya da "Onaylanmış veriden al" ile Denetçi'nin onayladığı veriden gelebilir (eşleşmemiş sütunlar tahmin adayı olur).</p>
<h3>Sütunlar ve ayarlar</h3>
<ul>
<li><b>Gözlenen değer sütunu</b> ve <b>tahmin sütunları</b>: her model için bir ad ve <b>tahminlerin kaynağı</b> (belirtilmedi, eğitim verisi, bağımsız test verisi, çapraz doğrulama). Kaynak hesabı değiştirmez, raporda ve uyarılarda kullanılır.</li>
<li><b>Gruplar</b>: örnek alan, tür, doğrulama katı, çap sütunu ve çap sınıfı sınırları.</li>
<li><b>Hangi satırlar?</b> Varsayılan "ortak geçerli satırlar": bütün modellerin ve gözlenen değerin dolu olduğu satırlar; modeller aynı örneklemle karşılaştırılır. "Her model kendi geçerli satırlarıyla" seçilirse örneklemler farklı olabilir ve karşılaştırma doğrudan yapılamaz.</li>
<li><b>Bağıl ölçütler</b> (isteğe bağlı): gözlenen ortalamaya, aralığa ya da standart sapmaya göre yüzde.</li>
</ul>
<h3>Sonuçlar ve indirme</h3>
<p><b>Özet</b> (ölçütler, kaynak beyanı, satır hesabı: boş, okunamayan, kullanılan satırlar), <b>Grafikler</b> (gözlenen–tahmin, 1:1 çizgisiyle; artık–tahmin), <b>Gruplar</b> ve <b>İndir</b>: tam rapor (Excel), ölçüt tablosu, grup tablosu ve satır başına artıklar (CSV).</p>
<h3>Sık karşılaşılanlar</h3>
<ul>
<li>Kaynak "eğitim verisi" ya da "belirtilmedi" ise uyarı çıkar: eğitim verisindeki başarı yeni verideki başarıdan genellikle iyimserdir; kaynağı belirtilmemiş tahminler dış doğrulama gibi okunmamalıdır.</li>
<li>Gözlenen değerler sabitse R² tanımsızdır; bağıl ölçüt paydası sıfır ya da negatifse bağıl ölçüt tanımsız yazılır.</li>
<li>Bir satır birden çok nedenle dışarıda kalabilir; satır hesabındaki sayılar bu yüzden toplanmaz.</li>
</ul>
</section>

<section class="card guide-sec">
<?= $sec('cap-dagilimi', 'Çap Dağılımı Laboratuvarı') ?>
<p>Tek ağaç çaplarına ya da çap sınıflarına sekiz olasılık dağılımı uydurur: Weibull, normal, lognormal, gamma, sabit sınırlı beta, Johnson SB, üstel ve log-lojistik; isteğe bağlı olarak <b>Genelleştirilmiş gamma (konumsuz)</b> ve <b>Gumbel (maksimum biçimi)</b>. Her örnek alan ve dönem ayrı hesaplanır. Ayrı bir iş akışı, ham veri olmadan özet değerlerden parametre geri kazanır.</p>
<p><b>Yapmadıkları:</b> konum ve sınır parametrelerini tahmin etmez (Weibull ve üstelde a, beta'da L ve U, Johnson SB'de ξ ve λ sizin verdiğiniz sabit değerlerdir, veriden alınmaz); göğüs yüzeyiyle ağırlıklı uydurma yapmaz; makalelerden kopyalanmış katsayılarla tahmin yapmaz (meşcere modeli yalnızca sizin verinizle eğitilir).</p>
<h3>Üç iş akışı</h3>
<ul>
<li><b>Ölçülmüş çaplardan uydurma</b>: Veri, Ayarlar, Sonuçlar adımları.</li>
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
<li><b>Ölçüm eşiği</b>: yalnızca belli bir çapın üstündeki (ya da iki eşik arasındaki) ağaçlar ölçüldüyse burada bildirin; uydurma koşullu olabilirlikle yapılır. Eşik, dağılımın destek sınırıyla ya da verideki en küçük çapla aynı şey değildir.</li>
<li><b>Dağılımlar ve tahmin yöntemleri</b>: en çok olabilirlik, momentler, yüzdelikler ve log-momentler. Her ailenin formülleri ve notları "Ayrıntılar" kutusundadır. Moment varyansında varsayılan bölen n'dir; n − 1 seçenektir. Varsayılan olarak seçili gelmeyen ek yöntemler: <b>L-momentler</b> (Weibull, gamma), <b>Genel yüzdelik eşleştirme (QME)</b> (seçtiğiniz olasılıklar ve ağırlıklarla) ve <b>En küçük uzaklık (MGE)</b> (KS, Cramér–von Mises ya da Anderson–Darling) (normal, gamma, beta). Bunlar olabilirliği en büyüklemediği için AIC tablosuna girmez; bir MGE satırı, uydurulduğu ölçütle sıralanan tabloda † ile işaretlenir. Genelleştirilmiş gamma da varsayılan olarak seçili gelmez: gamma (c = 1) ve Weibull (a = 1) onun özel durumlarıdır, bu yüzden ln L değeri onlarınkinden küçük olamaz; bu, daha iyi bir model olduğu anlamına gelmez. Gumbel bütün reel sayılarda tanımlıdır; uydurulan modelin negatif çaplara verdiği olasılık F(0) her sonuçta yazılır.</li>
<li><b>Sabit konum a</b> (Weibull, üstel): a = 0 her zaman hesaplanır; bir değer yazarsanız o konumla da hesaplanır. <b>Beta L, U</b> ve <b>Johnson SB ξ, λ</b> bu aileler seçildiğinde istenir.</li>
</ul>
<h3>3. Sonuçlar</h3>
<ul>
<li><b>Sonuçlar</b>: birim özeti; bütün uydurmaların sıralanabilir tablosu (AIC, BIC, KS, AD ve öteki ölçütler; olabilirliği en büyükleyen yöntemler ile betimsel yöntemler ayrı); notlar ve uyarılar; "Yöntemler, birimler ve kaynaklar" paneli; aile başına bütün sütunlu tablolar açılır kutuda. "Bütün ölçütler" anahtarı BIC, AICc, CvM, sınıf hataları, EI ve çözücüyü gösterir.</li>
<li><b>Grafikler</b>: histogram ve yoğunluklar (yoğunluk ya da ağaç sayısı ölçeğinde), birikimli dağılım, Q–Q ve P–P.</li>
<li><b>Sınıflar</b>: gözlenen ve beklenen sınıf sıklıkları; örnek alan büyüklüğü girilirse hektarda değerler. Aynı sekmedeki <b>Göğüs yüzeyi çap dağılımı (betimsel)</b> kartı, ağaçların göğüs yüzeyiyle ağırlıklandığı birikimli dağılımı ağaç sayısına göre olanın yanında çizer. Göğüs yüzeyinin %0, 10, …, 90, 95 ve 100 yüzdeliklerindeki çapları ve dgM'yi (göğüs yüzeyinin yarısının üstünde kaldığı çap) verir. Sınıf göğüs yüzeyini, payını ve ağaç sayısına dönüşümünü (f = G/ḡ) gösterir. Hiçbir dağılım bu ağırlıklı veriye uydurulmaz; ham çap gerektirir.</li>
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
<p>Excel raporu (Bilgi, Uydurmalar, Parametreler, Örnek alanlar, Sınıflar, GY dağılımı, Karşılaştırma, Bootstrap, Kaynaklar), uydurmalar ve parametreler CSV olarak, sonuç kayıtları JSON olarak; grafikler SVG olarak (dosyanın içinde sürüm, ayarlar ve parametreler).</p>
<h3>Sık karşılaşılanlar</h3>
<ul>
<li>Çok az ağaçlı ya da bütün çapları eşit bir örnek alanda sonuçlar "hesaplanmadı" olur; neden notlarda yazar.</li>
<li>Beta ya da Johnson SB seçilip sınırlar girilmezse hesaplanamaz; sınırların dışında kalan ya da sınıra eşit çaplar reddedilir.</li>
<li>Ölçüm eşiği seçildiğinde eşiksiz yöntemler kapanır; yalnızca koşullu en çok olabilirlik kullanılır.</li>
<li>Okunabilir çap yoksa sonuç sayfası boş kalmaz, neyin denetleneceği yazılır.</li>
</ul>
</section>

<section class="card guide-sec">
<?= $sec('boy-cap', 'Boy–Çap Modelleme') ?>
<p>Ölçülmüş boylara altı boy–çap denklemini doğrusal olmayan en küçük karelerle uydurur: Näslund, Michailoff, Curtis, Kuvvet (Stoffels ve van Soest), Chapman–Richards ve Weibull (Yang ve ark.). Modelleri aynı ağaçlar üzerinde karşılaştırır, örnek alan bazında çapraz doğrulamayla sınar ve boyu ölçülmemiş ağaçlar için boy tahmin eder.</p>
<p><b>Yapmadıkları:</b> karma etkili model yoktur (örnek alan etkileri sonraki aşamadadır); türler tek eğriyi paylaşır (farklıysa her türü ayrı çalıştırın); tahmin için model seçimini kendisi yapmaz; tahmin edilen boyları onaylanmış veriye geri yazmaz.</p>
<h3>Veri ve ayarlar</h3>
<ul>
<li>Kaynak: dosya, yapıştırma, onaylanmış veri ya da örnek veri.</li>
<li><b>Sütunlar ve birimler</b>: çap (cm/mm) ve boy (m/dm/cm) zorunlu; örnek alan, tür ve süzgeç isteğe bağlı. Çapı geçerli ama boy hücresi boş olan ağaçlar "boyu eksik" sayılır ve tahmin alır; okunamayan boylar dışarıda kalır.</li>
<li><b>Göğüs yüksekliği bh</b>: varsayılan 1.3 m. Boyu bh'ye eşit ya da küçük ağaçlar uydurmaya girmez.</li>
<li><b>Çapraz doğrulama</b>: örnek alan bazında (en az 2 alan varsa varsayılan), ağaç bazında (10 kat) ya da yok.</li>
</ul>
<h3>Sonuçlar</h3>
<ul>
<li><b>Modeller</b>: durum, parametreler, asimptot ve yineleme sayısı.</li>
<li><b>Karşılaştırma</b>: uydurma verisinde RMSE, MAE ve yanlılık; çapraz doğrulama sonuçları.</li>
<li><b>Grafikler</b>: veri ve eğriler, artıklar, örnek alan başına ortalama hata. Ayrıntılı grafikler ve tahmin için bir model seçilir.</li>
<li><b>Tahmin</b>: boyu eksik ağaçlar ve yazdığınız yeni çaplar için tahmin; uydurma verisinin çap aralığı dışındaki tahminler "aralık dışı" işaretlenir.</li>
</ul>
<p><b>Standart hatalar ne zaman verilmez?</b> Veride iki ya da daha fazla örnek alan varsa aynı alandaki ağaçlar bağımsız değildir; standart hatalar olduğundan küçük çıkar. Bu yüzden bu sürüm o durumda standart hata, güven ve tahmin aralıkları ile AIC/BIC vermez.</p>
<h3>İndirme</h3>
<p>Tam rapor (Excel); ağaç tablosu (ölçülen ve tahmin edilen boy ayrı sütunlarda), parametreler, çapraz doğrulama katları ve yeni çap tahminleri CSV olarak.</p>
<h3>Sık karşılaşılanlar</h3>
<ul>
<li>"Yakınsamadı" ya da "ıraksadı" durumundaki modeller parametre vermez; ıraksama, asimptotun veriyle belirlenemediği anlamına gelir.</li>
<li>Bir çapraz doğrulama katı başarısız olursa o katın ağaçları bütün modellerden çıkarılır.</li>
</ul>
</section>

<section class="card guide-sec">
<?= $sec('ornekleme', 'Envanter Örnekleme Planlayıcısı') ?>
<p>Tek bir soruyu yanıtlar: basit rastgele örneklemede, örnek alan düzeyindeki bir değişkenin (ör. hektarda hacim) ortalamasını hedeflediğiniz bağıl hatayla tahmin etmek için yaklaşık kaç örnek alan gerekir. Hesap n₀ = z²(CV/E)², isteğe bağlı sonlu popülasyon düzeltmesiyle.</p>
<p><b>Yapmadıkları:</b> hipotez testi için güç analizi değildir; tabakalı örneklemede tabakalara dağıtım, sistematik örneklemenin varyansı, kümeli ya da çok aşamalı örnekleme bu formülle çözülmez.</p>
<h3>Kartlar</h3>
<ol>
<li><b>Değişkenlik (CV)</b>: pilot ölçümlerden hesaplayın (her satır bir örnek alanın değeri; ağaç düzeyinde ölçüm değil) ya da CV'yi kendiniz girin (kaynağıyla birlikte). Pilot verisi için değer sütunu, isteğe bağlı örnek alan kimliği (tekrar denetimi) ve süzgeç (ör. dönem) seçilir; standart sapma n − 1 bölenle hesaplanır. Pilotla hesaplamak için beyan kutusunu işaretleyin.</li>
<li><b>Hedef</b>: bağıl hata E (%) ve güven düzeyi (varsayılan %10 ve %95).</li>
<li><b>Örnekleme çerçevesi</b>: sonlu, listelenmiş bir çerçeve (M birim) yoksa düzeltme uygulanmaz. Orman alanını örnek alan büyüklüğüne bölmek bir çerçeve oluşturmaz.</li>
<li><b>Mevcut örnek alanlar</b>: pilot alanlar aynı tasarımın parçasıysa yalnızca ek gereken sayı gösterilir.</li>
</ol>
<h3>Sonuç ve indirme</h3>
<p>Gerekli örnek alan sayısı (yukarı yuvarlanmış), hesap satırları, farklı hata hedefleri tablosu ve grafiği; varsayımlar açılır kutuda. Örnek: CV = %30, E = %10, %95 güven, düzeltme yok → n₀ = 34.573, gereken 35 örnek alan. İndirme: <b>Varsayım özeti (TXT)</b>, hata hedefleri (CSV), tam rapor (Excel), grafik (SVG).</p>
<h3>Sık karşılaşılanlar</h3>
<ul>
<li>Aynı örnek alan kimliği birden çok satırda varsa hesaplanmaz; bir dönemi seçmek için süzgeci kullanın.</li>
<li>Pilot ortalaması sıfır ya da negatifse, ya da bütün değerler eşitse CV tanımsızdır.</li>
<li>10'dan az pilot alanla CV'nin kendisi belirsizdir; uyarı çıkar. Sütun adı çap ya da boy gibi görünüyorsa ağaç düzeyinde veri uyarısı çıkar.</li>
</ul>
</section>

<section class="card guide-sec">
<?= $sec('nispi-siralama', 'Nispi Sıralama') ?>
<p>Modellerinizin başarı ölçütleri tablosundan ölçüt bazında ve genel nispi sıraları hesaplar (Poudel ve Cao 2013) ve en iyi ile en kötü modelleri radar grafiğinde karşılaştırır. En iyi model 1, en kötü model m (model sayısı) alır; aradakiler değerlerine orantılı sıralanır.</p>
<p><b>Yapmadıkları:</b> başarı ölçütlerini hesaplamaz (tabloyu siz getirirsiniz); ağırlıklar her zaman eşittir; aynı sıralamayı veren iki ölçütten birini kendiliğinden düşürmez; AIC ve BIC'nin karşılaştırılabilir olup olmadığını denetleyemez (yalnızca aynı veriye uydurulmuş modeller için karşılaştırılabilir).</p>
<h3>Veri</h3>
<p>Her satır bir model, her sütun bir başarı ölçütü. Başlık satırı ve model adı sütunu önerilir, değiştirilebilir. Yalnızca sayı içeren sütunlar ölçüt olur.</p>
<h3>Ölçütler</h3>
<p>Her ölçüt için <b>Sıralamaya kat</b> ve <b>İyi olan</b>: en büyük (R², FI), en küçük (RMSE, MAE, AIC, BIC…) ya da sıfıra en yakın, |değer| (Bias, ME…). Yön sütun adından önerilir; tanınmayan adlarda yönü siz seçersiniz.</p>
<h3>Sonuçlar ve indirme</h3>
<p><b>Sıralama</b> tablosunda modeller sıralamadan çıkarılıp geri alınabilir (sıralar kalan modellerle yeniden hesaplanır); <b>Radar grafiği</b> en iyi ve en kötü modelleri gösterir (merkez 1 = en iyi, küçük alan daha iyi). İndirme: tam rapor (Excel) ve sıralama tablosu (CSV).</p>
<h3>Sık karşılaşılanlar</h3>
<ul>
<li>Eksik ya da okunamayan değeri olan modeller sıralanmaz; o ölçütü dışarıda bırakmak onları geri getirir.</li>
<li>Aynı sıraları veren ölçütler iki kez sayılmış olur (ör. FI = tahmin R²); birini bırakmayı düşünün.</li>
<li>Çok kötü tek bir model ötekileri birbirine yaklaştırır. Radar grafiği için en az 3 ölçüt gerekir.</li>
</ul>
</section>

<section class="card guide-sec">
<?= $sec('seksiyon-hacmi', 'Seksiyon Hacmi Hesaplayıcısı') ?>
<p>Ölçülmüş seksiyon çaplarından tek ağaç gövde hacmini Huber, Smalian, Newton ya da Hohenadl yöntemiyle hesaplar; dip kütüğü ve uç seksiyonu ayrı satırlarda gösterir, kabuklu ve kabuksuz hacmi ayrı verir, biçim sayısını ve isteğe bağlı kullanılabilir hacmi hesaplar, örnek alan büyüklüğü verilirse hektara toplar.</p>
<p><b>Yapmadıkları:</b> hacim denklemi ya da gövde profili denklemi kullanmaz; gövdesi ölçülmemiş ağaçların hacmini tahmin etmez (hektar değerleri yalnızca hesaplanan ağaçların toplamıdır); kabuk kalınlığı girilmemişse kabuksuz hacmi tahmin etmez.</p>
<h3>Veri ve ayarlar</h3>
<ul>
<li><b>Gövde ölçüm tablosu</b>: her satır bir ağacın bir ölçüm noktası. Ağaç, ölçüm yüksekliği (yerden; kesim yüzeyinden değil) ve çap zorunlu; örnek alan, dönem, çift kabuk kalınlığı, dbh, toplam boy, kesim yüksekliği ve örnek alan büyüklüğü isteğe bağlı. İki çapraz çap ölçtüyseniz birleştirme kuralını seçin.</li>
<li><b>Onaylanmış veriyi bağla</b>: Veri Denetçisi'nde onaylanan ağaç tablosundan eksik dbh ve boylar eklenir, örnek alan büyüklükleri alınır, gövdesi ölçülmemiş ağaçlar sayılır.</li>
<li><b>Yöntem ve veri düzeni</b>: ölçümleri seksiyon sınırlarında (Smalian), ortalarında (Huber), uç–orta–uç sırasıyla (Newton; Huber ve Smalian da hesaplanabilir) ya da 0.1H…0.9H yüksekliklerinde (Hohenadl) almış olabilirsiniz. Düzeni siz seçersiniz; uymayan yöntem listelenmez.</li>
<li><b>Uç seksiyon</b>: son noktadan tepeye koni (varsayılan), paraboloit ya da neiloit. Toplam boy yoksa uç seksiyon yoktur ve hacim "son ölçüm noktasına kadar" diye yazılır. Dip kütük isterseniz toplama katılır.</li>
<li><b>Kullanılabilir tepe çapı</b> verilirse o çapa kadar olan hacim ve çapın yüksekliği hesaplanır. Hohenadl beş eşit seksiyonla çalıştığı için bu hacmi vermez; hesaplanamadığı her durumda nedeni Veri sorunları listesinde yazılır.</li>
<li><b>Hektara genişletme</b>: tablodaki büyüklük sütunundan, bütün alanlar için tek bir büyüklükten ya da onaylanmış veriden.</li>
<li><b>Kontrol eşikleri</b>: kök şişkinliği bölgesi, 1.30 m çapı ile dbh farkı, uç seksiyonun hacimdeki payı, orta nokta ve Hohenadl toleransları; hepsi araç kuralıdır ve rapora yazılır.</li>
</ul>
<h3>Sonuçlar</h3>
<ul>
<li><b>Ağaç hacimleri</b>: yöntem başına kabuklu hacim, kabuksuz hacim, birden çok yöntemde yüzde fark, biçim sayısı, kapsam ("kesimden tepeye", "son ölçüm noktasına kadar", Hohenadl'da "yerden tepeye"; dip kütük katıldıysa "+ kütük") ve durum. Kesim yüksekliğinin altında ölçüm noktası varsa o kısım yalnızca dip kütük sayılır, seksiyonlara katılmaz. Hohenadl'da ayrıca gerçek biçim bölümleri ve λ₀.₉ (Heger 1965) verilir.</li>
<li><b>Örnek alanlar</b>: hesaplanan ve hesaplanamayan ağaç sayıları ile m³/ha. Eksik ağaç varsa durum "eksik ağaç var" olur.</li>
<li><b>Veri kalitesi</b>: kök şişkinliği bölgesi dışında yükseklikle artan çaplar, seksiyon uzunlukları, uç seksiyonun hacimdeki payı (eşiğin üstündeyse sonuç seçilen uç cismine duyarlıdır) ve 1.30 m çapı ile dbh farkı; eşikler Kontrol eşikleri altında değiştirilir ve sonuçta yazılır.</li>
<li><b>Yöntemler arası fark</b> (birden çok yöntem seçildiyse): toplam hacim ve ağaç başına fark, referans yönteme göre yüzde. Referans yalnızca paydadır; hiçbir yöntem doğru ilan edilmez, bilinen davranış ayrıntılarda açıklanır.</li>
<li><b>Ağaç ayrıntısı</b>: seksiyon dökümü (kütük, seksiyonlar, uç) ve gövde profili grafiği; bir satıra tıklamak o ağacı açar.</li>
<li><b>Veri sorunları</b>: satır numaralı hatalar ve uyarılar. Hatalı ağaçlar hesaplanmaz; bir noktası okunamayan ağacın tamamı dışarıda kalır, çünkü eksik nokta hacmi sessizce küçültürdü.</li>
</ul>
<h3>İndirme</h3>
<p><b>Excel raporu</b> (Bilgi, Ağaçlar, Örnek alanlar, Kalite, Yöntem farkı, Seksiyonlar, Sorunlar), ağaç hacimleri CSV ve sonuç kayıtları JSON.</p>
</section>

<section class="card guide-sec">
<?= $sec('bonitet', 'Bonitet Hesaplayıcısı') ?>
<p>Üst boy ve yaştan, sizin girdiğiniz katsayı setiyle dayanak yaştaki bonitet endeksini (o yaştaki üst boyu) hesaplar; bonitet sınıflarını tanımlarsanız sınıfı verir ve eğri demetini çizer.</p>
<p><b>Yapmadıkları:</b> hiçbir tür ya da yöre katsayısı ve hasılat tablosu içermez; yaş türlerini (toplam yaş, göğüs yüksekliği yaşı) birbirine çevirmez; karma etkili model bu sürümde yoktur.</p>
<h3>Model</h3>
<ul>
<li><b>Katsayı setleri</b>: biçim (Chapman–Richards anamorfik ya da polimorfik, Schumacher), katsayılar, <b>yaş türü</b> ve <b>üst boy tanımı</b> (zorunlu), isteğe bağlı geçerlilik aralığı ve kaynak künyesi (zorunlu). Setler yalnızca bu tarayıcıda saklanır, JSON olarak indirilip yüklenebilir.</li>
<li>Schumacher biçimi ln H = b₀ + b₁/A olarak yazılmıştır; büyüyen bir eğri için b₁ negatiftir. Kaynağınız H = b₀·exp(−b₁/A) yazıyorsa katsayıyı −b₁ olarak girin.</li>
<li><b>Kendi verimden uydur</b> sekmesi (Model adımında, <b>Kaynaktan katsayı seti</b> sekmesinin yanında): gövde analizi ya da tekrarlı üst boy ölçümleri (dizi kimliği, yaş, boy). Denemek için benzetim bir örnek veri yüklenebilir; ürettiği katsayılar hiçbir tür ya da yöreye ait değildir. Denklem aynı dizinin gözlem çiftlerine uydurulur; çiftler ardışık, ilk gözlemden ya da bütün çiftler olabilir ve sonucu değiştirir. Başlangıç değerleri otomatik ya da sizin; standart hatalar gözlemler bağımsız varsayımıyla verilir (aynı dizinin gözlemleri bağımsız değildir). Sonuç; yaş türü, üst boy tanımı ve kaynak künyesiyle katsayı kaydına "uydurulan" set olarak yazılır, verinin yaş ve boy aralığı geçerlilik aralığı olur.</li>
<li><b>Belirsizlik: dizi düzeyinde bootstrap</b>: diziler (tek tek gözlemler değil) yeniden örneklenir ve denklem her tekrarda yeniden uydurulur; katsayıların %95 yüzdelik aralığı, başarısız tekrar oranı, B ve tohum gösterilir. Bootstrap yapılmış bir set kaydedilirse sonuçlarda her noktanın bonitet endeksi için %95 aralığı verilir. Kendi girdiğiniz setlerde aralık yalnızca kaynağın verdiği kovaryans matrisini girerseniz (delta yöntemi) hesaplanır; yoksa "belirsizlik bilgisi yok" yazılır.</li>
<li><b>Dayanak yaş</b>: varsayılanı yoktur; kullandığınız sınıflandırmanın dayanak yaşını girin. Fark denklemleri dayanak yaştan bağımsızdır, yani dayanak yaş eğrileri değil endeksin okunduğu yaşı değiştirir.</li>
<li><b>Bonitet sınıfları</b> (isteğe bağlı): eşit aralıklı ya da sınırları sizin yazdığınız sınıflar; I en yüksek ya da en düşük bonitet olabilir. Sınıfların dışında kalan endeks "sınıf dışı" yazılır.</li>
</ul>
<h3>Veri</h3>
<ul>
<li>Tek nokta (yaş ve üst boy), tablo (örnek alan, dönem, yaş, üst boy) ya da onaylanmış ağaç verisi. Onaylanmış veride H0, Örnek Alan ve Meşcere aracıyla aynı tanımla (hektarda en kalın ya da en uzun 100 ağaç) ve yalnızca ölçülmüş boylardan hesaplanır; yaş, yaşı kayıtlı ağaçların ortalamasıdır.</li>
<li><b>Verideki yaşın türü</b>: siz seçersiniz; denklemin yaş türüyle aynı değilse hesap yapılmaz.</li>
</ul>
<h3>Sonuçlar ve indirme</h3>
<p>Her nokta için bonitet endeksi, sınıf ve notlar (setin geçerlilik aralığı dışındaki noktalar hesaplanır ve işaretlenir); eğri demeti grafiği (sınıf sınırlarındaki endeksler ya da hesaplanan endekslerin en küçüğü, ortancası, en büyüğü). Her sonuç denklemi, dayanak yaşı, yaş türünü, üst boy tanımını ve "kullanıcı katsayılarıyla üretildi" notunu taşır. <b>Excel raporu</b> (Bilgi, Bonitet, Eğriler), CSV ve JSON.</p>
</section>

<section class="card guide-sec">
<?= $sec('mescere-yapisi', 'Meşcere Yapısı ve Rekabet') ?>
<p>Her örnek alan ve dönem için çap yapısını, çeşitliliği ve sıklığı, ağaç düzeyinde BAL'ı; ağaçların koordinatları varsa mekânsal yapıyı ve Hegyi rekabet endeksini hesaplar. Birim, hektar değerleri ve H0, Örnek Alan ve Meşcere aracıyla aynı tanımlardır.</p>
<p><b>Yapmadıkları:</b> açı sayımı ve iç içe örnek alanlar (yalnızca sabit alanlı örnek alanlar); Ripley K/L ve çift korelasyon işlevi; büyüme ya da ölüm tahmini. Kenar etkisini kendisi seçmez: seçimi siz yaparsınız ve sonuca yazılır.</p>
<h3>Veri ve ayarlar</h3>
<ul>
<li><b>Ağaç tablosu</b>: örnek alan, göğüs çapı ve örnek alan büyüklüğü zorunlu; ağaç, tür, boy, dönem ve x, y koordinatları (m) isteğe bağlı. Onaylanmış veri ya da benzetim örnek veri de kullanılabilir.</li>
<li><b>Yapı ve sıklık</b>: Shannon için çap sınıfları, Gini'nin göğüs yüzeyi ya da çap üzerinden olması, BAL'da eşit çaplar, SDI eğimi ve dayanak çapı (25 cm ya da Reineke'nin 25.4 cm'si), Curtis RD üssü, göreli aralık için dikim düzeni (kare ya da üçgen) ve H0 seçimi.</li>
<li><b>Örnek alan geometrisi</b>: daire (yarıçap kayıtlı alandan ya da girilir) ya da dikdörtgen; koordinatlar bütün örnek alanlarda aynı çerçevede olmalıdır. Alan dışındaki ya da koordinatı eksik ağaç satır numarasıyla bildirilir ve o alanın mekânsal hesabı yapılmaz.</li>
<li><b>Kenar etkisi</b>: düzeltme yok (kenar ağaçları işaretlenir), tampon (tampondaki ağaçlar yalnızca komşu ya da rakip olur) ya da toroidal öteleme (yalnızca dikdörtgen). Komşu sayısı k, W standart açısı (360°/k, Pommerening 2002; ya da 360°/(k + 1)) ve Hegyi rakipleri (en yakın k ağaç ya da sizin gireceğiniz yarıçap içindekiler).</li>
</ul>
<h3>Sonuçlar</h3>
<ul>
<li><b>Örnek alanlar</b>: N/ha, G, Dq, H0, ÇK, Gini, Shannon, Simpson, SDI, Curtis RD; koordinat varsa Clark–Evans R (düzeltmesiz ve Donnelly), W, M, T. <b>Bütün sütunlar</b> çarpıklık, basıklık, tür Shannon'ı, göreli aralık, T1 (en yakın komşuyla çap farklılaşması), U ve ortalama Hegyi'yi de gösterir. Hesaplanamayan değer "–" olarak yazılır.</li>
<li><b>Ayrıntı</b>: çap sınıfı histogramı, Lorenz eğrisi, gövde haritası (renk Hegyi değeri), notlar ve ağaç tablosu (BAL, d/Dq, Hegyi, kenar).</li>
</ul>
<p>Clark–Evans R ile W, M, T ve T1 özgün kaynaklarında okunmuştur; Hegyi endeksi iki ikincil kaynağın aktardığı biçimdedir (özgün endekste uzaklığa 1 ft eklendiği bildirilir, bu araç eklemez). U ve Donnelly düzeltmesi, kaynakları okunana kadar geçici tanım istisnasıyla uygulanmaktadır.</p>
<h3>İndirme</h3>
<p><b>Excel raporu</b> (Bilgi, Örnek alanlar, Ağaçlar, Sınıflar, Türler), ağaç tablosunuza rekabet sütunları eklenmiş Excel, örnek alanlar CSV ve sonuç kayıtları JSON.</p>
</section>

<section class="card guide-sec">
<?= $sec('govde-profili', 'Gövde Profili') ?>
<p>Bir profil denklemiyle (Max ve Burkhart 1976, Model 4; Kozak 2004, Model 02) herhangi bir yükseklikteki çapı, bir çapın yüksekliğini, toplam hacmi ve tepe çapına kadar kullanılabilir hacmi hesaplar. Katsayıları siz girersiniz (kaynağıyla) ya da gövde ölçümlerinizden uydurursunuz; site hazır katsayı vermez.</p>
<p><b>Yapmadıkları:</b> kabuk modeli (kabuklu ve kabuksuz profil ayrı katsayı setleridir); karma etkili uydurma; ürün bölmede kusur, eğrilik ya da kalite sınıfı (yalnızca çap ve boy).</p>
<h3>Model</h3>
<ul>
<li><b>Katsayı seti gir</b>: biçimi seçin, katsayıları ve kaynağı yazın; setin kabuklu mu kabuksuz mu çap verdiğini (<b>Kabuk</b>) seçmek zorunludur.</li>
<li><b>Gövde ölçümlerinden uydur</b>: Seksiyon Hacmi aracıyla aynı gövde tablosu (ağaç, yükseklik, çap; göğüs çapı ve boy ağaç sütunlarından). Uydurulacak çap (kabuklu ya da kabuksuz), biçim ve <b>Uydurma ölçeği</b> seçilir. Sonuçta katsayılar, göreli yükseklik sınıflarına göre yanlılık ve RMSE, artık grafiği ve ağaç başına seksiyon hacmiyle profil hacmi karşılaştırması gösterilir; kaynak yazılarak set kütüphaneye kaydedilir. Standart hatalar bağımsız gözlem varsayımıyla hesaplanır.</li>
<li><b>Kullanılacak profil setleri</b>: bir kabuklu ve bir kabuksuz set seçilebilir; ikisi seçilirse sonuçlar ikisini de gösterir.</li>
</ul>
<h3>Ağaçlar ve sonuçlar</h3>
<ul>
<li><b>Tek ağaç</b> (göğüs çapı ve boy) ya da <b>Ağaç tablosu</b>; kesim yüksekliği, isteğe bağlı tepe çapı ve profil tablosu adımı.</li>
<li>Ağaç başına toplam hacim (kesimden tepeye), tepe çapının yüksekliği ve kullanılabilir hacim, d(1.3) ve notlar (geçerlilik aralığı dışı, çap tanımsız bölgeler). Seçilen ağacın gövde profili grafiği ve profil tablosu.</li>
<li>İndirme: Excel (Bilgi, Ağaçlar, Profil), CSV ve JSON.</li>
</ul>
<h3>Ürün bölme (sortiman)</h3>
<ul>
<li><b>Gövdeyi ürünlere böl</b> kutusunu işaretleyin ve ürünlerinizi ekleyin: ad, en küçük ince uç çapı, boy (sabit ya da en çok boy ve boy adımıyla aralık), kesim payı, öncelik (1 en yüksek) ve m³ başına değer. Site hazır ürün ya da fiyat vermez. Ürün listesi JSON olarak indirilip yeniden yüklenebilir.</li>
<li><b>Ürünlerin çap tarafı</b> (kabuklu/kabuksuz) seçilen profil setininkiyle aynı olmalıdır; kesim yüksekliği ve tepe çapı hacim ayarlarından alınır.</li>
<li><b>Yöntem</b>: <b>en yüksek değer</b> (dinamik programlama; toplam değeri ya da toplam hacmi en büyükler) ya da <b>öncelik sırası</b> (dipten yukarı, sığan en yüksek öncelikli ürün). Parçalar kesimden yukarı <b>Bölme adımı</b> ızgarasındadır; boy + kesim payı adımın tam katı olmalıdır (ör. 5 cm kesim payı için adım 0.05 m). Parçanın hacmi ve değeri kesim payını da kapsar; ince uç çapı parçanın üst ucundaki çaptır.</li>
<li>Sonuçlar: ürün özeti (bütün ağaçlar), hacim dengesi (parçalar + dip kütük + artık + tepe = toplam gövde), ağaç başına parça sayısı, hacim ve değer; seçilen ağacın gövde çizimi (her ürün renk ve desenle) ve parça tablosu. İndirme: Excel'de Ürünler ve Parçalar sayfaları, parçalar CSV'si, JSON.</li>
</ul>
</section>


<section class="card guide-sec">
<?= $sec('buyume-islevi', 'Büyüme İşlevi Uydurma') ?>
<p>Yaş–büyüklük verinize (boy, çap, hacim…) altı büyüme işlevini aynı anda uydurur ve karşılaştırır: Chapman–Richards, Schumacher, Gompertz, logistik, monomoleküler ve Weibull. Katsayılar sizin verinizden gelir; site hazır eğri vermez.</p>
<p><b>Yapmadıkları:</b> Korf işlevi (kaynağı henüz okunmadı); dizi ya da örnek alan düzeyinde rastgele etkiler (bütün gözlemlere tek eğri uydurulur); bonitet eğrisi (bunun için Bonitet aracı).</p>
<h3>Veri ve modeller</h3>
<ul>
<li>Tablo ya da yapıştırma: <b>Yaş (yıl)</b> ve <b>Büyüklük</b> sütunları zorunlu, dizi sütunu isteğe bağlı. Değişkenin adı ve birimi grafiklerde ve indirmelerde yazılır. Okunamayan satırlar numaralarıyla bildirilir.</li>
<li><b>Uydurulacak modeller</b>: istediğiniz biçimleri seçin; her biçimin yanında kaynak durumu yazılır.</li>
</ul>
<h3>Sonuçlar</h3>
<ul>
<li><b>Model karşılaştırması</b>: katsayılar ve standart hataları, RMSE, yanlılık, σ̂, AIC (en küçüğü ★), asimptot, dönüm noktası yaşı ve ortalama artımın doruk yaşı. Standart hatalar bağımsız gözlem varsayımıyla hesaplanır.</li>
<li>Gözlemler ve bütün eğrilerin grafiği; seçilen model için cari ve ortalama artım grafiği, artıklar ve eğri tablosu. Seçilen eğri kaynak yazılarak katsayı kütüphanesine kaydedilebilir.</li>
<li>İndirme: Excel (Bilgi, Karşılaştırma, Tahminler, Eğriler), CSV ve JSON.</li>
</ul>
</section>

<section class="card guide-sec">
<?= $sec('katsayi-kutuphanesi', 'Katsayı Kütüphanesi') ?>
<p>Bonitet, Büyüme İşlevi ve Gövde Profili araçlarında girdiğiniz ya da uydurduğunuz bütün katsayı setlerini tek yerde gösterir. Setler yalnızca bu tarayıcıda saklanır; site hazır katsayı vermez ve bu sayfa hiçbir set eklemez.</p>
<p><b>Yapmadıkları:</b> setleri başka bir cihaza ya da kişiye kendiliğinden taşımaz (yedek dosyasıyla taşınır); denklemle hesap yapmaz (hesap aracın kendi sayfasında).</p>
<h3>Kütüphane</h3>
<ul>
<li>Araç başına set sayısı; aynı katsayıları taşıyan set grupları ve sorunlu setler ayrıca belirtilir.</li>
<li><b>Yedek indir (JSON)</b>: bütün kütüphane tek dosyada (araçların kendi sayfalarındaki JSON düğmeleriyle aynı biçim, <code>model-coef-library/1</code>). Tarayıcı verisi silinirse setler de silinir; yedeği saklayın.</li>
<li><b>Yedekten geri yükle</b>: önce bir <b>Geri yükleme önizlemesi</b> gösterilir: yeni, değişen (üzerine yazılır), aynı (atlanır) ve geçersiz (yüklenmez, nedeniyle) setler; kütüphanede aynı katsayılarla zaten bulunan setler not edilir. <b>Uygula</b>'ya basmadan hiçbir şey değişmez.</li>
<li>Liste Excel ya da CSV olarak indirilebilir (katsayılar saklandığı duyarlılıkla).</li>
</ul>
<h3>Setler ve düzenleme</h3>
<ul>
<li>Araca, kökene (girilen/uydurulan) göre süzme ve arama (biçim, tür, yöre, bileşen, kaynak; büyük-küçük harf ve Türkçe karakter farkı gözetilmez); <b>yalnızca sorunlular</b>.</li>
<li><b>Ayrıntı</b>: kimlik, katsayılar, birimler, geçerlilik aralığı, dönüşüm, aracın alanları (ör. bonitette yaş türü, gövde profilinde kabuk), kaynak, uydurma özeti, tarihler ve sorunlar.</li>
<li><b>Düzenle</b> seti aşağıdaki <b>Set düzenleyici</b>de açar; düzenleyici aracın kendi sayfasındakiyle aynıdır (aynı denetimler, zorunlu kaynak). Yeni set de buradan girilebilir. <b>Kopyala</b> aynı katsayılarla yeni bir set oluşturur (ör. başka bir yöre için kaynağını ya da kapsamını değiştirmek üzere); <b>Sil</b> onay ister ve geri alınamaz.</li>
</ul>
</section>

<section class="card guide-sec">
<?= $sec('kayit-dogrulayici', 'Kayıt Doğrulayıcı') ?>
<p>Araçların sonuçları JSON olarak indirildiğinde ortak bir <b>çalışma kaydı</b> (<code>run-record/1</code>) yazılır: aracın kimliği ve sürümü, sitenin yayındaki kaynak kodunun commit'i, zaman, dil, ayarlar, sonuçlar, her girdi dosyasının SHA-256 parmak izi ve kaydın mührü. Bu sayfa böyle bir kaydı açar ve denetler. Kayıt ve dosyalar tarayıcıdan çıkmaz.</p>
<p><b>Yapmadıkları:</b> hesabı yeniden yapmaz (aynı girdi ve ayarlarla aracın kendi sayfasında yapılır); mühür bir imza değildir, değişikliği gösterir ama sahteciliği önlemez; veri paketleri, katsayı kütüphanesi ve meşcere modeli dosyaları kayıt değildir, kendi araçlarında açılır.</p>
<h3>Kayıt indirme (bütün araçlar)</h3>
<ul>
<li>Araçların JSON düğmesi (JSON düğmesi olmayan araçlarda <b>Çalışma kaydı (JSON)</b>) kaydı indirir. Eski JSON içeriği aynen korunur; ortak alanlar eklenir.</li>
<li><b>Girdi verisini kayda ekle</b> işaretli değilse kayıtta girdinin yalnızca parmak izi bulunur; işaretliyse verinin kendisi de girer ve kayıt tek başına yeniden üretilebilir. Seçim sayfadaki bütün JSON düğmeleri için geçerlidir ve bu tarayıcıda hatırlanır. Kaydı paylaşırsanız veriyi de paylaşmış olursunuz.</li>
<li>Parmak izi: dosyanın okunduğu hâliyle baytlarının SHA-256'sı; yapıştırılan tablo için metnin UTF-8 baytları; onaylanmış veri paketi için kanonik JSON biçimi (RFC 8785).</li>
</ul>
<h3>Doğrulama</h3>
<ul>
<li><b>Kayıt seç (.json)</b>: mühür denetlenir (kayıt indirildiğinden beri değişmiş mi), araç, sürüm, araç kimlikleri ve commit gösterilir; aracın sitedeki sürümü farklıysa bildirilir. Commit bağlantısı kaydı üreten kaynak koduna gider.</li>
<li><b>Girdiler</b> tablosu her girdinin rolünü, boyutunu, parmak izini ve okuma ayarlarını (kodlama, ayırıcı, başlık satırı, çalışma sayfası) gösterir. Kayıtta veri varsa parmak iziyle tuttuğu denetlenir ve dosya indirilebilir.</li>
<li><b>Elinizdeki dosyaları denetleyin</b>: özgün veri dosyalarınızı seçin; her biri kayıttaki girdilerle karşılaştırılır. Tek bir bayt farkı eşleşmeyi bozar (ör. Excel'de açılıp yeniden kaydedilen CSV).</li>
<li>DI-07 öncesi indirilen JSON dosyaları da açılır: aracı, sürümü ve zamanı okunur; mühür ve parmak izi yoktur.</li>
</ul>
</section>

<section class="card guide-sec">
<?= $sec('veri-yoneticisi', 'Envanter Verisi Yöneticisi') ?>
<p>Veri Denetçisi'nde onayladığınız veri paketlerini (<code>forest-dataset/1</code>) bu tarayıcıda proje olarak tutar. Paketlerden biri <b>etkin</b>dir: Örnek Alan ve Meşcere, Meşcere Yapısı, Boy–Çap, Bonitet, Seksiyon Hacmi ve Model Başarısı araçları onaylanmış veri olarak etkin paketi okur. Paketler yalnızca bu tarayıcıda saklanır.</p>
<p><b>Yapmadıkları:</b> ağaç ve örnek alan kayıtlarını değiştirmez (ölçüm düzeltmeleri Veri Denetçisi'nde gerekçesiyle yapılır ve yeniden onaylanır); iki paketi birleştirmez; paketleri başka bir cihaza kendiliğinden taşımaz (yedek dosyasıyla taşınır).</p>
<h3>Paketler</h3>
<ul>
<li>Veri Denetçisi'nde her onay listeye eklenir ve etkin olur; aynı paket ikinci kez eklenmez (paketin SHA-256 parmak iziyle tanınır). DI-03'ten önce onaylanmış veri ilk açılışta "önceki onay" olarak listeye alınır.</li>
<li><b>Etkin yap</b> paketi araçlara verir; açık araç sayfalarını yenileyin. Araçlar dizinindeki <b>Etkinliği kaldır</b> paketi silmez, yalnızca araçların görmesini durdurur.</li>
<li><b>Ayrıntı</b>: proje bilgileri (ad, envanter yılı, yer, açıklama, notlar; ad zorunlu, yıl dört haneli), paketin özeti (örnek alanlar, dönemler, kayıtlar, türler, çap aralığı, ölçülmüş ve tahmini boylar, yaş, koordinat, tabakalar, uyarılar, dışlanan satırlar, değişiklik günlüğü, onay zamanı, parmak izi) ve örnek alan × dönem kayıt sayıları.</li>
<li><b>Kopyala</b> aynı paketle yeni bir proje oluşturur; <b>Sil</b> onay ister ve geri alınamaz. Etkin paket silinirse araçlar onaylanmış veri görmez.</li>
</ul>
<h3>İçe ve dışa aktarma</h3>
<ul>
<li><b>Veri paketi (JSON)</b>: paketin kendisi (Veri Denetçisi'nin JSON'uyla aynı biçim); Örnek Alan ve Meşcere aracına dosya olarak da yüklenebilir.</li>
<li><b>Yedek indir (JSON)</b>: bütün projeler bilgileriyle tek dosyada (<code>forest-project-library/1</code>).</li>
<li><b>İçe aktar (JSON)</b>: veri paketi, tek proje ya da yedek. Önce bir önizleme gösterilir: yeni, zaten var (aynı paket; atlanır) ve geçersiz (nedeniyle); <b>Uygula</b>'ya basmadan hiçbir şey değişmez.</li>
</ul>
</section>

<section class="card guide-sec">
<?= $sec('pano', 'Görselleştirme Panosu') ?>
<p>Onaylanmış bir veri paketini tek sayfada gösterir: özet, çap dağılımı, tür katılımı, örnek alan başına N/ha ve G/ha, boy–çap ve ağaç haritası. Araçların çalışma kayıtlarındaki sonuçlar verinin üstüne çizilir. Paket ve kayıtlar tarayıcıdan çıkmaz.</p>
<p><b>Yapmadıkları:</b> yeni bir model uydurmaz ve hesap yapmaz (N/ha ve G/ha Örnek Alan ve Meşcere aracının, yoğunluklar Çap Dağılımı'nın, eğriler Boy–Çap'ın hesap motorlarından gelir); paketi değiştirmez.</p>
<h3>Paket ve süzgeçler</h3>
<ul>
<li><b>Gösterilen paket</b>: Envanter Verisi Yöneticisi'ndeki paketlerden biri (varsayılan etkin paket); paket yoksa uydurma örnek paket gösterilebilir.</li>
<li>Süzgeçler: <b>Dönem</b>, <b>Tabaka</b>, <b>Tür</b>, <b>Örnek alan</b>; bütün paneller birlikte güncellenir. Tür seçiliyken N/ha ve G/ha o türün payıdır (bulunmadığı alanda 0).</li>
<li><b>Kaydı olmayan örnek alan × dönem</b>: "ölçülmedi" (dışarıda bırakılır) ya da "boş" (N = G = 0). Ortalama N ve G, gösterilen örnek alan × dönemlerin ağırlıksız ortalamasıdır; tasarıma dayalı kestirim Örnek Alan aracındadır.</li>
<li>Çap dağılımı çubukları yoğunluktur (sıklık / (n · sınıf genişliği)); sınıf genişliği otomatik ya da elle. Ağaç haritası tek bir örnek alan seçilince ve koordinat varsa çizilir. Her grafik SVG, verisi CSV olarak indirilir.</li>
</ul>
<h3>Çalışma kayıtları</h3>
<ul>
<li><b>Kayıt ekle (.json)</b>: araçların indirdiği çalışma kayıtları. Mühür ve kaydın bu paketten üretilip üretilmediği gösterilir (paketten üretilen kayıtta paketin parmak izi bulunur; dosyadan üretilende eşleşme bilinemez).</li>
<li>Çap Dağılımı kayıtları: örnek alanı ve dönemi süzgeçle aynı olan sonuçların yoğunlukları histogramın üstüne çizilir ("hepsi" seçiliyken birleştirilmiş sonuç); eşikli uydurmalarda koşullu yoğunluk.</li>
<li>Boy–Çap kayıtları: uydurulan bütün modellerin eğrileri saçılmanın üstüne çizilir; seçilen model ★ ile. Öteki araçların kayıtları listelenir, çizilmez. <b>Çiz</b> kutusu bir kaydı gizler, <b>Kaldır</b> listeden çıkarır.</li>
</ul>
</section>

<section class="card guide-sec">
<?= $sec('rapor', 'Rapor Üretici') ?>
<p>Bir veri paketini ve araçların çalışma kayıtlarını tek bir raporda toplar. Rapor sayfada önizlenir; tarayıcının yazdırma penceresinden kâğıda ya da "PDF olarak kaydet" ile PDF'e, <b>HTML indir</b> ile tek başına açılan bir dosyaya çıkar. Paket, kayıtlar ve notlar tarayıcıdan çıkmaz.</p>
<p><b>Yapmadıkları:</b> yeni hesap yapmaz (değerler paketten, panonun hesabından ve kayıtlardan aynen alınır); kayıtlarda olmayan bir kaynağı eklemez; Word ya da başka bir dosya biçimi üretmez.</p>
<h3>İçerik</h3>
<ul>
<li><b>Rapor bilgileri</b>: başlık, hazırlayan, kurum, tarih, giriş metni ve <b>Rapor dili</b> (Türkçe ya da İngilizce; arayüz dilinden bağımsız).</li>
<li><b>Veri paketi</b>: Envanter Verisi Yöneticisi'ndeki bir paket (ya da uydurma örnek paket); süzgeçler Görselleştirme Panosu'ndakilerle aynıdır ve yalnızca grafikleri etkiler.</li>
<li><b>Çalışma kayıtları</b>: <b>Kayıt ekle (.json)</b> ya da <b>Panodaki kayıtları al</b>; sıraları değiştirilebilir. Her kayıt için araç, sürüm, mühür, verinin kaynağı, ayarlar ve sonuç tabloları (uzun tablolarda ilk 60 satır) yazılır.</li>
</ul>
<h3>Bölümler ve çıktı</h3>
<ul>
<li>Bölümler (veri paketi, grafikler, çalışma kayıtları, kaynaklar, tekrarlanabilirlik eki) açılıp kapatılabilir ve her birine not eklenebilir; numaralar kendiliğinden düzenlenir.</li>
<li><b>Kaynaklar</b>: platformun ve kullanılan araçların atıfları (APA, raporun tarihi erişim tarihi olarak), kayıtlarda adı geçen kaynaklar okunma durumlarıyla, kullanıcı katsayı setlerinin kaynakları.</li>
<li><b>Ek: Tekrarlanabilirlik</b>: raporu üreten sitenin ve her kaydın commit'i, mühürler, veri paketinin ve girdi dosyalarının parmak izleri.</li>
<li><b>Yazdır / PDF olarak kaydet</b> yalnızca raporu A4 sayfalara dizer; <b>HTML indir</b> stilleri ve grafikleri içinde taşıyan tek bir dosya verir.</li>
</ul>
</section>

<section class="card guide-sec">
<?= $sec('agac-olcumu', 'Ağaç Ölçümü') ?>
<p>Tek ağaç ölçümlerinden boy, çap ve göğüs yüzeyi ile biçim sayısını hesaplar. Formüller ölçme kitaplarından alınmıştır: Hamilton (1975) <i>Forest Mensuration Handbook</i>, Graves (1906) <i>Forest Mensuration</i> ve van Laar ve Akça (2007) <i>Forest Mensuration</i>. Dört sekme vardır; sonuçlar alanlar değiştikçe güncellenir.</p>
<p><b>Yapmadıkları:</b> eğik ağacın gövde uzunluğu (kaynakta formül yok); kabuk ve tepe tacı (kaynakları bekleniyor); gövde analizi (bütün gövde boyunca kesitler); türe özgü biçim sayısı tabloları ya da biçim bölümü sabitleri (site hazır değer vermez).</p>
<h3>Boy</h3>
<ul>
<li><b>Tanjant</b>: yatay uzaklık ve tepeye ve dibe açılar, derece ya da yüzde. Açılar yataydan ölçülür; dip gözün altındaysa dibe açı eksi girilir. Uzaklık eğimli zeminde ölçüldüyse kutuyu işaretleyip zeminin eğimini girin, yatay uzaklığa çevrilir.</li>
<li><b>Mesafe ölçer</b>: gözden dibe (ya da gövdedeki bir noktaya) bakış doğrusu boyunca uzaklık; yatay uzaklık bu uzaklık ve o noktaya açıdan bulunur (Hamilton Şekil 19).</li>
<li><b>Gölge</b> ve <b>iki sırık</b> yöntemleri (Graves): benzer üçgenler.</li>
<li>Birden çok satır girerseniz ortalama boy ve okumaların açıklığı verilir (Hamilton: iki üç okuma alıp ortalayın). Uzaklık boydan kısaysa ya da tepeye bakış çok dikse not düşülür.</li>
</ul>
<h3>Çap, göğüs yüzeyi ve biçim sayısı</h3>
<ul>
<li><b>Tek gövde</b>: bir ya da birkaç okuma, çap ya da çevre, cm, mm, m ya da inç. Birden çok çap aritmetik ortalanır ya da iki çap bir elipsin eksenleri sayılır. Yuvarlama: yok, milimetreye ya da tam santimetreye aşağı (Hamilton). Göğüs çapı ölçme kuralları sekmede yazılıdır.</li>
<li><b>Ağaç listesi</b>: tablo ya da yapıştırma; çap ya da çevre sütunu, isteğe bağlı ağaç sayısı sütunu. Ağaç sayısı, toplam ve ortalama göğüs yüzeyi, aritmetik ortalama çap ve ortalama göğüs yüzeyli ağacın çapı (Graves).</li>
<li><b>Biçim sayısı</b> F = V/(B·H): göğüs yüksekliği, mutlak, 1.3 m üstü mutlak ve normal; biçim yüksekliği F·H. <b>Biçim üssü</b>: iki çap ve tepeye uzaklıklarından r, cismin adı, 1/(r + 1) ve boy girilirse göğüs yüksekliği biçim sayısı. <b>Biçim bölümü</b> q = d/D; türe özgü sabit c girilirse F = q − c.</li>
<li>İndirme: Excel (Bilgi, Boy, Gövde, Ağaç listesi, Biçim, Yaş ve artım, Burgu) ve JSON çalışma kaydı.</li>
</ul>
<h3>Yaş ve artım</h3>
<ul>
<li><b>Ağaç yaşı</b>: sayılan halka + ağacın o yüksekliğe ulaşma süresi (süreyi kendi verinizden girin). Lorey'in <b>ekonomik yaşı</b> (baskı çekirdeği dışındaki halka + o çaptaki çekirdeklerin ortalama yaşı) ve halkası olmayan ağaçta çap / yıllık ortalama çap artımı.</li>
<li><b>Burgu örneği</b>: göğüs yüksekliğinden alınan örnekte halka genişlikleri, kabuktan öze, mm. Şimdiki çap, kabukluysa çift kabuk kalınlığı ve 1.3 m'ye ulaşma süresiyle her yılın kabuksuz çapı ve yaşı (tablo on yılda bir, bütün yıllar Excel'de); seçilen n yıl için periyodik yıllık çap artımı ve Pressler artım yüzdesi. Örnek öze ulaşmıyorsa yaş bir alt sınırdır; genişlikler yarıçapı aşarsa uyarı verilir.</li>
<li><b>Meşcerenin ortalama yaşı</b>: çap grupları; aritmetik, ağaç sayısıyla, göğüs yüzeyiyle ya da hacimle (Smalian) ağırlıklı. <b>Artım yüzdesi</b>: şimdiki ve n yıl önceki değerden üç ana parayla (geçmiş, şimdiki, ortalama/Pressler); ortalama yıllık artım.</li>
</ul>
</section>

<section class="card guide-sec">
<?= $sec('biyokutle-karbon', 'Biyokütle ve Karbon') ?>
<p>Ağaç verinizden bileşen biyokütlesi (kg ağaç, Mg/ha örnek alan × dönem), karbon ve CO₂ eşdeğeri hesaplar. Site hiçbir tür katsayısı, odun yoğunluğu, genişletme etkeni, kök oranı ya da karbon oranı içermez; hepsini siz girersiniz ve kaynakları sonuçla birlikte yazılır.</p>
<p><b>Yapmadıkları:</b> eksik boyu tahmin etmez (Boy–Çap aracında yapılır); seti seçilmeyen türü başka bir türün denklemiyle hesaplamaz; bileşenlerin toplanabilirliğini varsaymaz; hacim tanımının etkenlerle uyumunu denetleyemez.</p>
<h3>Veri ve yaklaşım</h3>
<ul>
<li>Veri: <b>Ağaç tablosu</b> (örnek alan, göğüs çapı ve alan büyüklüğü zorunlu; ağaç, tür, boy, dönem isteğe bağlı) ya da etkin onaylanmış veri paketi. Benzetim tablosu yalnızca denemek içindir; katsayı içermez.</li>
<li><b>Allometrik denklemler</b>: bileşenleri (ör. gövde, dal, yaprak) ve her birinin karbon oranını (CF, 0–1) girin. <b>Tür → katsayı seti</b> tablosunda her tür ve bileşen için bir set seçin; "Bu sütunu bütün türlere uygula" seçimi açıkça yapar. İsteğe bağlı ayrı toplam denklemi seçilirse bileşen toplamıyla farkı yazılır. Setler sayfadaki düzenleyiciden ya da Katsayı Kütüphanesi'nden gelir; ln ve log₁₀ biçimleri ayrıdır, log₁₀ denkleminde Baskerville düzeltmesi uygulanmaz (kaynak bekleniyor).</li>
<li><b>Hacimden dönüşüm</b>: ağaç başına hacim sütunu (m³), hacmin ve etkenlerin kabuk tarafı (farklıysa hesap yapılmaz), D ve BEF ya da BCEF, R (toprak altı / toprak üstü), CF ve etkenlerin kaynağı (zorunlu). Hacim tanımı etkenlerin tanımıyla aynı olmalıdır.</li>
</ul>
<h3>Sonuçlar</h3>
<ul>
<li>Seti seçilmemiş türler, boyu eksik ağaçlar ve hacmi eksik ağaçlar satır numaralarıyla; tahmini boyla hesaplanan ve geçerlilik aralığı dışındaki ağaçların sayısı.</li>
<li>Örnek alan × dönem tablosunda bileşenler, toplam, C ve CO₂ (Mg/ha). Hesaplanamayan ağacı olan birimin toplamı verilmez (–). Kaydı olmayan örnek alan × dönem "ölçülmedi" ya da "boş" sayılır.</li>
<li>İndirme: Excel (Bilgi sayfasında setlerin kaynakları ve kurallar, Birimler, Ağaçlar), ağaçlar CSV ve JSON çalışma kaydı.</li>
</ul>
</section>
