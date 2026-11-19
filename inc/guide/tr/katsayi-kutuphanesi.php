<section class="card guide-sec">
<?= $sec('katsayi-kutuphanesi', 'Katsayı Kütüphanesi') ?>
<p>Bonitet, Büyüme Fonksiyonu, Gövde Profili, Biyokütle ve Karbon, Hacim Denklemleri, Doğrusal Olmayan Regresyon, Karma Etkili Modeller, Denklem Sistemleri, Meşcere Yapısı (CCF) ve Ağaç Ölçümü (kabuk) araçlarında girdiğiniz ya da fit ettiğiniz bütün katsayı setlerini tek yerde gösterir. Setler yalnızca bu tarayıcıda saklanır; site hazır katsayı vermez ve bu sayfa hiçbir set eklemez.</p>
<p><b>Yapmadıkları:</b> setleri başka bir cihaza ya da kişiye kendiliğinden taşımaz (yedek dosyasıyla taşınır); denklemle hesap yapmaz (hesap aracın kendi sayfasında).</p>
<h3>Kütüphane</h3>
<ul>
<li>Araç başına set sayısı; aynı katsayıları taşıyan set grupları ve sorunlu setler ayrıca belirtilir.</li>
<li><b>Yedek indir (JSON)</b>: bütün kütüphane tek dosyada (araçların kendi sayfalarındaki JSON düğmeleriyle aynı biçim, <code>model-coef-library/1</code>). Tarayıcı verisi silinirse setler de silinir; yedeği saklayın.</li>
<li><b>Yedekten geri yükle</b>: önce bir <b>Geri yükleme önizlemesi</b> gösterilir: yeni, değişen (üzerine yazılır), aynı (atlanır) ve geçersiz (yüklenmez, nedeniyle) setler; kütüphanede aynı katsayılarla zaten bulunan setler not edilir. <b>Uygula</b>'ya basmadan hiçbir şey değişmez.</li>
<li>Liste Excel ya da CSV olarak indirilebilir (katsayılar saklandığı duyarlıkla).</li>
</ul>
<h3>Setler ve düzenleme</h3>
<ul>
<li>Araca, kökene (girilen/fit edilen) göre süzme ve arama (biçim, tür, yöre, bileşen, kaynak; büyük-küçük harf ve Türkçe karakter farkı gözetilmez); <b>yalnızca sorunlular</b>.</li>
<li><b>Ayrıntı</b>: kimlik, katsayılar, birimler, geçerlilik aralığı, dönüşüm, aracın alanları (ör. bonitette yaş türü, gövde profilinde kabuk), kaynak, fit etme özeti, tarihler ve sorunlar.</li>
<li><b>Düzenle</b> seti aşağıdaki <b>Set düzenleyici</b>de açar; düzenleyici aracın kendi sayfasındakiyle aynıdır (aynı denetimler, zorunlu kaynak). Yeni set de buradan girilebilir. <b>Kopyala</b> aynı katsayılarla yeni bir set oluşturur (ör. başka bir yöre için kaynağını ya da kapsamını değiştirmek üzere); <b>Sil</b> onay ister ve geri alınamaz.</li>
</ul>
</section>
