<section class="card guide-sec">
<?= $sec('seksiyon-hacmi', 'Seksiyon Hacmi Hesaplayıcısı') ?>
<p>Ölçülmüş seksiyon çaplarından tek ağaç gövde hacmini Huber, Smalian, Newton ya da Hohenadl yöntemiyle hesaplar; dip kütüğü ve uç seksiyonu ayrı satırlarda gösterir, kabuklu ve kabuksuz hacmi ayrı verir, şekil katsayısını ve isteğe bağlı kullanılabilir hacmi hesaplar, örnek alan büyüklüğü verilirse hektara toplar.</p>
<p><b>Yapmadıkları:</b> hacim denklemi ya da gövde profili denklemi kullanmaz; gövdesi ölçülmemiş ağaçların hacmini tahmin etmez (hektar değerleri yalnızca hesaplanan ağaçların toplamıdır); kabuk kalınlığı girilmemişse kabuksuz hacmi tahmin etmez.</p>
<h3>Veri ve ayarlar</h3>
<ul>
<li><b>Gövde ölçüm tablosu</b>: her satır bir ağacın bir ölçüm noktası. Ağaç, ölçüm yüksekliği (yerden; kesim yüzeyinden değil) ve çap zorunlu; örnek alan, dönem, çift kabuk kalınlığı, dbh, toplam boy, kesim yüksekliği ve örnek alan büyüklüğü isteğe bağlı. İki çapraz çap ölçtüyseniz birleştirme kuralını seçin.</li>
<li><b>Onaylanmış veriyi bağla</b>: Veri Denetçisi'nde onaylanan ağaç tablosundan eksik dbh ve boylar eklenir, örnek alan büyüklükleri alınır, gövdesi ölçülmemiş ağaçlar sayılır.</li>
<li><b>Yöntem ve veri düzeni</b>: ölçümleri seksiyon sınırlarında (Smalian), ortalarında (Huber), uç–orta–uç sırasıyla (Newton; Huber ve Smalian da hesaplanabilir) ya da 0,1H…0,9H yüksekliklerinde (Hohenadl) almış olabilirsiniz. Düzeni siz seçersiniz; uymayan yöntem listelenmez.</li>
<li><b>Uç seksiyon</b>: son noktadan tepeye koni (varsayılan), paraboloit ya da neiloit. Toplam boy yoksa uç seksiyon yoktur ve hacim "son ölçüm noktasına kadar" diye yazılır. Dip kütük isterseniz toplama katılır.</li>
<li><b>Ticari tepe çapı</b> verilirse o çapa kadar olan hacim ve çapın yüksekliği hesaplanır. Hohenadl beş eşit seksiyonla çalıştığı için bu hacmi vermez; hesaplanamadığı her durumda nedeni Veri sorunları listesinde yazılır.</li>
<li><b>Hektara genişletme</b>: tablodaki büyüklük sütunundan, bütün alanlar için tek bir büyüklükten ya da onaylanmış veriden.</li>
<li><b>Kontrol eşikleri</b>: kök şişkinliği bölgesi, 1,30 m çapı ile dbh farkı, uç seksiyonun hacimdeki payı, orta nokta ve Hohenadl toleransları; hepsi araç kuralıdır ve rapora yazılır.</li>
</ul>
<h3>Sonuçlar</h3>
<ul>
<li><b>Ağaç hacimleri</b>: yöntem başına kabuklu hacim, kabuksuz hacim, birden çok yöntemde yüzde fark, şekil katsayısı, kapsam ("kesimden tepeye", "son ölçüm noktasına kadar", Hohenadl'da "yerden tepeye"; dip kütük katıldıysa "+ kütük") ve durum. Kesim yüksekliğinin altında ölçüm noktası varsa o kısım yalnızca dip kütük sayılır, seksiyonlara katılmaz. Hohenadl'da ayrıca gerçek şekil bölümleri ve λ₀,₉ (Heger 1965) verilir.</li>
<li><b>Örnek alanlar</b>: hesaplanan ve hesaplanamayan ağaç sayıları ile m³/ha. Eksik ağaç varsa durum "eksik ağaç var" olur.</li>
<li><b>Veri kalitesi</b>: kök şişkinliği bölgesi dışında yükseklikle artan çaplar, seksiyon uzunlukları, uç seksiyonun hacimdeki payı (eşiğin üstündeyse sonuç seçilen uç cismine duyarlıdır) ve 1,30 m çapı ile dbh farkı; eşikler Kontrol eşikleri altında değiştirilir ve sonuçta yazılır.</li>
<li><b>Yöntemler arası fark</b> (birden çok yöntem seçildiyse): toplam hacim ve ağaç başına fark, referans yönteme göre yüzde. Referans yalnızca paydadır; hiçbir yöntem doğru ilan edilmez, bilinen davranış ayrıntılarda açıklanır.</li>
<li><b>Ağaç ayrıntısı</b>: seksiyon dökümü (kütük, seksiyonlar, uç) ve gövde profili grafiği; bir satıra tıklamak o ağacı açar.</li>
<li><b>Veri sorunları</b>: satır numaralı hatalar ve uyarılar. Hatalı ağaçlar hesaplanmaz; bir noktası okunamayan ağacın tamamı dışarıda kalır, çünkü eksik nokta hacmi sessizce küçültürdü.</li>
</ul>
<h3>İndirme</h3>
<p><b>Biyokütle ve Karbon aracına aktar</b>: onaylanmış veri bağlıysa seçilen yöntemin ağaç hacimleri (kabuklu ve kabuksuz) bu tarayıcıda paketin parmak iziyle ayrı bir kayıt olarak yazılır; paket değişmez. Ağaçlar örnek alan × ağaç × dönemle eşleşir; pakette birden çok ağaçla eşleşen anahtarlar yazılmaz.</p>
<p><b>Excel raporu</b> (Bilgi, Ağaçlar, Örnek alanlar, Kalite, Yöntem farkı, Seksiyonlar, Sorunlar), ağaç hacimleri CSV ve sonuç kayıtları JSON.</p>
</section>
