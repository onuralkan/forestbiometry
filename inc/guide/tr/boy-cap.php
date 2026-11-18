<section class="card guide-sec">
<?= $sec('boy-cap', 'Boy–Çap Modelleme') ?>
<p>Ölçülmüş boylara altı boy–çap denklemini doğrusal olmayan en küçük karelerle fit eder: Näslund, Michailoff, Curtis, Kuvvet (Stoffels ve van Soest), Chapman–Richards ve Weibull (Yang ve ark.). Modelleri aynı ağaçlar üzerinde karşılaştırır, örnek alan bazında çapraz doğrulamayla sınar ve boyu ölçülmemiş ağaçlar için boy tahmin eder.</p>
<p><b>Yapmadıkları:</b> karma etkili model yoktur (örnek alan etkileri sonraki aşamadadır); türler tek eğriyi paylaşır (farklıysa her türü ayrı çalıştırın); tahmin için model seçimini kendisi yapmaz; tahmin edilen boyları onaylanmış veriye geri yazmaz.</p>
<h3>Veri ve ayarlar</h3>
<ul>
<li>Kaynak: dosya, yapıştırma, onaylanmış veri ya da örnek veri.</li>
<li><b>Sütunlar ve birimler</b>: çap (cm/mm) ve boy (m/dm/cm) zorunlu; örnek alan, tür ve süzgeç isteğe bağlı. Çapı geçerli ama boy hücresi boş olan ağaçlar "boyu eksik" sayılır ve tahmin alır; okunamayan boylar dışarıda kalır.</li>
<li><b>Göğüs yüksekliği bh</b>: varsayılan 1.3 m. Boyu bh'ye eşit ya da küçük ağaçlar fit işlemine girmez.</li>
<li><b>Çapraz doğrulama</b>: örnek alan bazında (en az 2 alan varsa varsayılan), ağaç bazında (10 kat) ya da yok.</li>
</ul>
<h3>Sonuçlar</h3>
<ul>
<li><b>Modeller</b>: durum, parametreler, asimptot ve yineleme sayısı.</li>
<li><b>Karşılaştırma</b>: fit etme verisinde RMSE, MAE ve yanlılık; çapraz doğrulama sonuçları.</li>
<li><b>Grafikler</b>: veri ve eğriler, artıklar, örnek alan başına ortalama hata. Ayrıntılı grafikler ve tahmin için bir model seçilir.</li>
<li><b>Tahmin</b>: boyu eksik ağaçlar ve yazdığınız yeni çaplar için tahmin; fit etme verisinin çap aralığı dışındaki tahminler "aralık dışı" işaretlenir.</li>
</ul>
<p><b>Standart hatalar ne zaman verilmez?</b> Veride iki ya da daha fazla örnek alan varsa aynı alandaki ağaçlar bağımsız değildir; standart hatalar olduğundan küçük çıkar. Bu yüzden bu sürüm o durumda standart hata, güven ve tahmin aralıkları ile AIC/BIC vermez.</p>
<h3>İndirme</h3>
<p>Tam rapor (Excel); ağaç tablosu (ölçülen ve tahmin edilen boy ayrı sütunlarda), parametreler, çapraz doğrulama katları ve yeni çap tahminleri CSV olarak. <b>R kodu (.R)</b>: aynı çalıştırmayı temel R ile (<code>nls</code>) aynı ayarlarla, aynı başlangıç değerleri ve aynı çapraz doğrulama katlarıyla yeniden yapan betik; veri gömülmez, betiğin başındaki dosya adını kendi dosyanızın yoluyla değiştirirsiniz. Sitenin testleri bu kodun aracın sayılarını verdiğini her yayında R'da denetler.</p>
<h3>Sık karşılaşılanlar</h3>
<ul>
<li>"Yakınsamadı" ya da "ıraksadı" durumundaki modeller parametre vermez; ıraksama, asimptotun veriyle belirlenemediği anlamına gelir.</li>
<li>Bir çapraz doğrulama katı başarısız olursa o katın ağaçları bütün modellerden çıkarılır.</li>
</ul>
</section>
