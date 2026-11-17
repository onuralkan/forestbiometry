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
