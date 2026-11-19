<section class="card guide-sec">
<?= $sec('govde-profili', 'Gövde Profili') ?>
<p>Bir profil denklemiyle (Max ve Burkhart 1976, Model 4; Kozak 2004, Model 02) herhangi bir yükseklikteki çapı, bir çapın yüksekliğini, toplam hacmi ve tepe çapına kadar kullanılabilir hacmi hesaplar. Katsayıları siz girersiniz (kaynağıyla) ya da gövde ölçümlerinize fit edersiniz; site hazır katsayı vermez.</p>
<p><b>Yapmadıkları:</b> kabuk modeli (kabuklu ve kabuksuz profil ayrı katsayı setleridir); karma etkili fit etme; ürün bölmede kusur, eğrilik ya da kalite sınıfı (yalnızca çap ve boy).</p>
<h3>Model</h3>
<ul>
<li><b>Katsayı seti gir</b>: biçimi seçin, katsayıları ve kaynağı yazın; setin kabuklu mu kabuksuz mu çap verdiğini (<b>Kabuk</b>) seçmek zorunludur.</li>
<li><b>Gövde ölçümlerine fit et</b>: Seksiyon Hacmi aracıyla aynı gövde tablosu (ağaç, yükseklik, çap; göğüs çapı ve boy ağaç sütunlarından). Fit edilecek çap (kabuklu ya da kabuksuz), biçim ve <b>Fit etme ölçeği</b> seçilir. Sonuçta katsayılar, göreli yükseklik sınıflarına göre yanlılık ve RMSE, artık grafiği ve ağaç başına seksiyon hacmiyle profil hacmi karşılaştırması gösterilir; kaynak yazılarak set kütüphaneye kaydedilir. Standart hatalar bağımsız gözlem varsayımıyla hesaplanır.</li>
<li><b>Kullanılacak profil setleri</b>: bir kabuklu ve bir kabuksuz set seçilebilir; ikisi seçilirse sonuçlar ikisini de gösterir.</li>
</ul>
<h3>Ağaçlar ve sonuçlar</h3>
<ul>
<li><b>Tek ağaç</b> (göğüs çapı ve boy) ya da <b>Ağaç tablosu</b>; kesim yüksekliği, isteğe bağlı tepe çapı ve profil tablosu adımı.</li>
<li>Ağaç başına toplam hacim (kesimden tepeye), tepe çapının yüksekliği ve kullanılabilir hacim, d(1,3) ve notlar (geçerlilik aralığı dışı, çap tanımsız bölgeler). Seçilen ağacın gövde profili grafiği ve profil tablosu.</li>
<li><b>Tomruk boyu sınırı</b> (isteğe bağlı): tomruk boyu, tomruk başına kesim payı, isteğe bağlı en kısa tomruk ve kalan kısa parçanın sayılıp sayılmayacağı. Kesimden tepe sınırına (tepe çapı yüksekliği; tepe çapı yoksa tepe) kadar uzunluk tomruk boyu + kesim payına bölünür ve tam tomruklar sayılır (Kershaw, Ducey, Beers ve Husch 2016, §6.4.1, §7.4.1, §7.4.3). Sonuçta tomruk sayısı ve hacmi, kesim payları ve kalan hacim (toplamları kullanılabilir hacme eşit); seçilen ağacın tomruk listesi (uçlar, boy, ince uç çapı, hacim). Değerler sizin; kitaptaki örnek değerler varsayılan değildir.</li>
<li>İndirme: Excel (Bilgi, Ağaçlar, Profil), CSV ve JSON.</li>
</ul>
<h3>Ürün bölme (sortiman)</h3>
<ul>
<li><b>Gövdeyi ürünlere böl</b> kutusunu işaretleyin ve ürünlerinizi ekleyin: ad, en küçük ince uç çapı, boy (sabit ya da en çok boy ve boy adımıyla aralık), kesim payı, öncelik (1 en yüksek) ve m³ başına değer. Site hazır ürün ya da fiyat vermez. Ürün listesi JSON olarak indirilip yeniden yüklenebilir.</li>
<li><b>Ürünlerin çap tarafı</b> (kabuklu/kabuksuz) seçilen profil setininkiyle aynı olmalıdır; kesim yüksekliği ve tepe çapı hacim ayarlarından alınır.</li>
<li><b>Yöntem</b>: <b>en yüksek değer</b> (dinamik programlama; toplam değeri ya da toplam hacmi en büyükler) ya da <b>öncelik sırası</b> (dipten yukarı, sığan en yüksek öncelikli ürün). Parçalar kesimden yukarı <b>Bölme adımı</b> ızgarasındadır; boy + kesim payı adımın tam katı olmalıdır (ör. 5 cm kesim payı için adım 0,05 m). Parçanın hacmi ve değeri kesim payını da kapsar; ince uç çapı parçanın üst ucundaki çaptır.</li>
<li>Sonuçlar: ürün özeti (bütün ağaçlar), hacim dengesi (parçalar + dip kütük + artık + tepe = toplam gövde), ağaç başına parça sayısı, hacim ve değer; seçilen ağacın gövde çizimi (her ürün renk ve desenle) ve parça tablosu. İndirme: Excel'de Ürünler ve Parçalar sayfaları, parçalar CSV'si, JSON.</li>
</ul>
</section>
