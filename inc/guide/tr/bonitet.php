<section class="card guide-sec">
<?= $sec('bonitet', 'Bonitet Hesaplayıcısı') ?>
<p>Üst boy ve yaştan, sizin girdiğiniz katsayı setiyle standart yaştaki bonitet endeksini (o yaştaki üst boyu) hesaplar; bonitet sınıflarını tanımlarsanız sınıfı verir ve eğri demetini çizer.</p>
<p><b>Yapmadıkları:</b> hiçbir tür ya da yöre katsayısı ve hasılat tablosu içermez; yaş türlerini (toplam yaş, göğüs yüksekliği yaşı) birbirine çevirmez; karma etkili model bu sürümde yoktur.</p>
<h3>Model</h3>
<ul>
<li><b>Katsayı setleri</b>: biçim (Chapman–Richards anamorfik ya da polimorfik, Schumacher), katsayılar, <b>yaş türü</b> ve <b>üst boy tanımı</b> (zorunlu), isteğe bağlı geçerlilik aralığı ve kaynak künyesi (zorunlu). Setler yalnızca bu tarayıcıda saklanır, JSON olarak indirilip yüklenebilir.</li>
<li>Schumacher biçimi ln H = b₀ + b₁/A olarak yazılmıştır; büyüyen bir eğri için b₁ negatiftir. Kaynağınız H = b₀·exp(−b₁/A) yazıyorsa katsayıyı −b₁ olarak girin.</li>
<li><b>Kendi verime fit et</b> sekmesi (Model adımında, <b>Kaynaktan katsayı seti</b> sekmesinin yanında): gövde analizi ya da tekrarlı üst boy ölçümleri (dizi kimliği, yaş, boy). Denemek için benzetim bir örnek veri yüklenebilir; ürettiği katsayılar hiçbir tür ya da yöreye ait değildir. Denklem aynı dizinin gözlem çiftlerine fit edilir; çiftler ardışık, ilk gözlemden ya da bütün çiftler olabilir ve sonucu değiştirir. Başlangıç değerleri otomatik ya da sizin; standart hatalar gözlemler bağımsız varsayımıyla verilir (aynı dizinin gözlemleri bağımsız değildir). Sonuç; yaş türü, üst boy tanımı ve kaynak künyesiyle katsayı kaydına "fit edilen" set olarak yazılır, verinin yaş ve boy aralığı geçerlilik aralığı olur.</li>
<li><b>Belirsizlik: dizi düzeyinde bootstrap</b>: diziler (tek tek gözlemler değil) yeniden örneklenir ve denklem her tekrarda yeniden fit edilir; katsayıların %95 yüzdelik aralığı, başarısız tekrar oranı, B ve tohum gösterilir. Bootstrap yapılmış bir set kaydedilirse sonuçlarda her noktanın bonitet endeksi için %95 aralığı verilir. Kendi girdiğiniz setlerde aralık yalnızca kaynağın verdiği kovaryans matrisini girerseniz (delta yöntemi) hesaplanır; yoksa "belirsizlik bilgisi yok" yazılır.</li>
<li><b>Standart yaş</b>: varsayılanı yoktur; kullandığınız sınıflandırmanın standart yaşını girin. Fark denklemleri standart yaştan bağımsızdır, yani standart yaş eğrileri değil endeksin okunduğu yaşı değiştirir.</li>
<li><b>Bonitet sınıfları</b> (isteğe bağlı): eşit aralıklı ya da sınırları sizin yazdığınız sınıflar; I en iyi ya da en kötü bonitet olabilir. Sınıfların dışında kalan endeks "sınıf dışı" yazılır.</li>
</ul>
<h3>Veri</h3>
<ul>
<li>Tek nokta (yaş ve üst boy), tablo (örnek alan, dönem, yaş, üst boy) ya da onaylanmış ağaç verisi. Onaylanmış veride H0, Örnek Alan ve Meşcere aracıyla aynı tanımla (hektardaki en uzun 100 ağaç) ve yalnızca ölçülmüş boylardan hesaplanır; yaş, yaşı kayıtlı ağaçların ortalamasıdır.</li>
<li><b>Verideki yaşın türü</b>: siz seçersiniz; denklemin yaş türüyle aynı değilse hesap yapılmaz.</li>
</ul>
<h3>Sonuçlar ve indirme</h3>
<p>Her nokta için bonitet endeksi, sınıf ve notlar (setin geçerlilik aralığı dışındaki noktalar hesaplanır ve işaretlenir); eğri demeti grafiği (sınıf sınırlarındaki endeksler ya da hesaplanan endekslerin en küçüğü, ortancası, en büyüğü). Her sonuç denklemi, standart yaşı, yaş türünü, üst boy tanımını ve "kullanıcı katsayılarıyla üretildi" notunu taşır. <b>Excel raporu</b> (Bilgi, Bonitet, Eğriler), CSV ve JSON.</p>
</section>
