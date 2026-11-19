<section class="card guide-sec">
<?= $sec('ornek-alan', 'Örnek Alan ve Meşcere Hesaplayıcısı') ?>
<p>Her örnek alan ve ölçüm dönemi için hektarda ağaç sayısı (N/ha) ve göğüs yüzeyi (G/ha), aritmetik ortalama çap ve kuadratik ortalama çap (Dq), çapın standart sapması, en küçük ve en büyük çap, çap sınıfı dağılımı, tür katılımı, baskın çap D0 (hektardaki en kalın 100 ağacın ortalama çapı) ve üst boy H0 (hektardaki en uzun 100 ağacın ortalama boyu), ölçülmüş boyların ortalaması ve ortalama yaş. Ayrıca örnek alanlar arası betimsel özet ve, bir örnekleme tasarımı belirtilirse, orman için tasarıma dayalı kestirim.</p>
<p><b>Yapmadıkları:</b> boy tahmin etmez (veride "tahmini" işaretli boylar ölçülmüşlerle birleştirilmeden ayrı gösterilir); güven aralığı vermez; yalnızca sabit alanlı örnek alanlar içindir (iç içe alanlar ve açı sayımı kapsam dışıdır, araç bunları kendiliğinden düzeltmez); basit rastgele tasarımda sonlu popülasyon düzeltmesi uygulamaz. Örnek alanlar arası tablo bir orman kestirimi değildir.</p>
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
<li><b>Kaydı olmayan örnek alan–dönem birleşimleri</b>: bazı alanların bazı dönemlerde hiç ağaç kaydı yoksa siz karar verirsiniz: "Ölçüldü, ağaç yok (N = 0, G = 0)" ya da "Ölçülmedi". Karar verilmezse bu birleşimler hesap dışında kalır ve o dönem için orman kestirimi yapılmaz.</li>
<li><b>Baskın çap ve üst boy</b>: D0 en kalın, H0 en uzun 100 ağaçtan (hektarda) hesaplanır; seçim yapılmaz. H0 yalnızca ölçülmüş boylarla hesaplanır.</li>
<li><b>Çap sınıfları</b>: eşit genişlik (varsayılan 4 cm) ya da sınır listesi; sınıflar [alt, üst) yarı açıktır; son sınırın üstü isteğe bağlı açık sınıf.</li>
<li><b>Orman için kestirim</b>: tasarım belirtilmezse orman kestirimi yapılmaz. "Basit rastgele" (sistematik ızgara için yaklaşık) ve isteğe bağlı orman alanı (toplamlar için); "Tabakalı rastgele" ve tabaka alanları (veride tabaka varsa).</li>
</ul>
<h3>Sonuçlar</h3>
<ul>
<li><b>Örnek alanlar</b>: her alan × dönem için bir satır ve durumu (ölçüldü, boş, ölçülmedi, karar bekliyor). Alan kimliğine tıklayınca ayrıntı açılır.</li>
<li><b>Ayrıntı</b>: temel ölçüler (genişletme çarpanı 10000/A dahil), baskın ağaçlar ve yaş, çap sınıfı dağılımı ve grafiği, tür katılımı (paylar ve paydaları), boylar. Soldaki gezgin arama, sıralama ve "yalnızca sorunlu" süzgeci sunar; ← → tuşlarıyla alanlar arasında gezilir.</li>
<li><b>Alanlar arası özet</b>: dönem başına örnek alan sayısı, ortalama, standart sapma, en küçük, ortanca, en büyük (alan büyüklüğüyle ağırlıklandırılmaz).</li>
<li><b>Orman kestirimi</b>: N/ha ve G/ha için kestirim, standart hata, bağıl standart hata ve (alan girildiyse) toplamlar; birden çok tür varsa tür başına; tabakalı tasarımda tabaka tablosu.</li>
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
