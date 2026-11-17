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
