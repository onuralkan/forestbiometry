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
