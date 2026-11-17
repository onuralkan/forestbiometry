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
