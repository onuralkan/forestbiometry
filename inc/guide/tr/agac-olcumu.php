<section class="card guide-sec">
<?= $sec('agac-olcumu', 'Ağaç Ölçümü') ?>
<p>Tek ağaç ölçümlerinden boy, çap ve göğüs yüzeyi, kabuk, biçim sayısı, yaş ve artımı hesaplar. Formüller ölçme kitaplarından alınmıştır: Hamilton (1975) <i>Forest Mensuration Handbook</i>, Graves (1906) <i>Forest Mensuration</i> ve van Laar ve Akça (2007) <i>Forest Mensuration</i>. Beş sekme vardır; sonuçlar alanlar değiştikçe güncellenir.</p>
<p><b>Yapmadıkları:</b> eğik ağacın gövde uzunluğu (kaynakta formül yok); tepe tacı (kaynağı bekleniyor); gövde boyunca kabuk modelleri; gövde analizi (bütün gövde boyunca kesitler); türe özgü biçim sayısı tabloları ya da biçim bölümü sabitleri (site hazır değer vermez).</p>
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
<li>İndirme: Excel (Bilgi, Boy, Gövde, Ağaç listesi, Kabuk, Biçim, Yaş ve artım, Burgu) ve JSON çalışma kaydı.</li>
</ul>
<h3>Kabuk</h3>
<ul>
<li><b>Bir noktada kabuk</b>: kabuklu çap ve birkaç yönden kabuk ölçer okumaları (tek taraf, mm; ortalanır), aynı yerde kabuklu ve kabuksuz çevre (çevre kabuk kalınlığı (c<sub>kabuklu</sub> − c<sub>kabuksuz</sub>)/2π) ya da kabuksuz çap ve kabuk okumaları. Sonuç: tek ve çift kabuk kalınlığı, kabuksuz çap (kabuklu çap − çift kabuk), iki göğüs yüzeyi, kabuk alanı ve payı. Tomruk boyu girilirse çaplar tomruğun orta çapı sayılır ve kabuk hacmi kabuklu ile kabuksuz hacmin farkıdır (Hamilton).</li>
<li><b>Örnek ağaçlardan kabuk oranı</b>: aynı meşcereden ağaçların kabuklu ve kabuksuz çapları (yazarak ya da <b>İki sütun yapıştır</b> ile). k = Σd<sub>kabuksuz</sub>/Σd<sub>kabuklu</sub> (Meyer; oranların ortalaması, van Laar ve Akça), ters oran 1/k ve en az üç ağaçla en küçük kareler doğrusu. Kabuksuz çapı kabukludan büyük satırlar numarasıyla bildirilir, hesaba girmez.</li>
<li><b>Kabuksuz çapı hesapla</b>: elle girilen k, örnek ağaçlardan k, örnek ağaçlardan doğru ya da bir <b>katsayı seti</b>. Setin biçimleri: d<sub>kabuksuz</sub> = k·D, d<sub>kabuksuz</sub> = a + b·D, tek ya da çift kabuk kalınlığı (mm) = a + b·D ve ln(kabuk, mm) = a + b·ln D (geri dönüşüm düzeltmesiyle). D cm'dir; kaynağınız başka birim kullanıyorsa katsayıları çevirerek girin. Setler Katsayı Kütüphanesi'nde de görünür. Yöntem tek çapa ve "Çap ve göğüs yüzeyi" sekmesinde yüklenen ağaç listesine uygulanır: kabuklu ve kabuksuz toplam göğüs yüzeyi ve kabuk payı; hesaplanamayan ağaçlar satır numarasıyla bildirilir.</li>
<li>Site hiçbir kabuk katsayısı ya da kabuk tablosu içermez: k ve denklemler sizin örnek ağaçlarınızdan ya da künyesini girdiğiniz bir kaynaktan gelir.</li>
</ul>
<h3>Yaş ve artım</h3>
<ul>
<li><b>Ağaç yaşı</b>: sayılan halka + ağacın o yüksekliğe ulaşma süresi (süreyi kendi verinizden girin). Lorey'in <b>ekonomik yaşı</b> (baskı çekirdeği dışındaki halka + o çaptaki çekirdeklerin ortalama yaşı) ve halkası olmayan ağaçta çap / yıllık ortalama çap artımı.</li>
<li><b>Burgu örneği</b>: göğüs yüksekliğinden alınan örnekte halka genişlikleri, kabuktan öze, mm. Şimdiki çap, kabukluysa çift kabuk kalınlığı ve 1.3 m'ye ulaşma süresiyle her yılın kabuksuz çapı ve yaşı (tablo on yılda bir, bütün yıllar Excel'de); seçilen n yıl için periyodik yıllık çap artımı ve Pressler artım yüzdesi. Örnek öze ulaşmıyorsa yaş bir alt sınırdır; genişlikler yarıçapı aşarsa uyarı verilir.</li>
<li><b>Meşcerenin ortalama yaşı</b>: çap grupları; aritmetik, ağaç sayısıyla, göğüs yüzeyiyle ya da hacimle (Smalian) ağırlıklı. <b>Artım yüzdesi</b>: şimdiki ve n yıl önceki değerden üç ana parayla (geçmiş, şimdiki, ortalama/Pressler); ortalama yıllık artım.</li>
</ul>
</section>
