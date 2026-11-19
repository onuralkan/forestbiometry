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
<p>Gerekli örnek alan sayısı (yukarı yuvarlanmış), hesap satırları, farklı hata hedefleri tablosu ve grafiği; varsayımlar açılır kutuda. Örnek: CV = %30, E = %10, %95 güven, düzeltme yok → n₀ = 34,573, gereken 35 örnek alan. İndirme: <b>Varsayım özeti (TXT)</b>, hata hedefleri (CSV), tam rapor (Excel), grafik (SVG).</p>
<h3>Sık karşılaşılanlar</h3>
<ul>
<li>Aynı örnek alan kimliği birden çok satırda varsa hesaplanmaz; bir dönemi seçmek için süzgeci kullanın.</li>
<li>Pilot ortalaması sıfır ya da negatifse, ya da bütün değerler eşitse CV tanımsızdır.</li>
<li>10'dan az pilot alanla CV'nin kendisi belirsizdir; uyarı çıkar. Sütun adı çap ya da boy gibi görünüyorsa ağaç düzeyinde veri uyarısı çıkar.</li>
</ul>
</section>
