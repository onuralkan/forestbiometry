<section class="card guide-sec">
<?= $sec('veri-yoneticisi', 'Envanter Verisi Yöneticisi') ?>
<p>Veri Denetçisi'nde onayladığınız veri paketlerini (<code>forest-dataset/1</code>) bu tarayıcıda proje olarak tutar. Paketlerden biri <b>etkin</b>dir: Örnek Alan ve Meşcere, Meşcere Yapısı, Boy–Çap, Bonitet, Seksiyon Hacmi, Hacim Denklemleri, Biyokütle ve Karbon ve Model Başarısı araçları onaylanmış veri olarak etkin paketi okur; Veri Görselleştirme ve Rapor Üretici de ilk olarak etkin paketi açar. Paketler yalnızca bu tarayıcıda saklanır.</p>
<p><b>Yapmadıkları:</b> ağaç ve örnek alan kayıtlarını değiştirmez (ölçüm düzeltmeleri Veri Denetçisi'nde gerekçesiyle yapılır ve yeniden onaylanır); iki paketi birleştirmez; paketleri başka bir cihaza kendiliğinden taşımaz (yedek dosyasıyla taşınır).</p>
<h3>Paketler</h3>
<ul>
<li>Veri Denetçisi'nde her onay listeye eklenir ve etkin olur; aynı paket ikinci kez eklenmez (paketin SHA-256 parmak iziyle tanınır). DI-03'ten önce onaylanmış veri ilk açılışta "önceki onay" olarak listeye alınır.</li>
<li><b>Etkin yap</b> paketi araçlara verir; açık araç sayfalarını yenileyin. Araçlar dizinindeki <b>Etkin paketi bırak</b> paketi silmez, yalnızca araçların görmesini durdurur.</li>
<li><b>Ayrıntı</b>: proje bilgileri (ad, envanter yılı, yer, açıklama, notlar; ad zorunlu, yıl dört haneli), paketin özeti (örnek alanlar, dönemler, kayıtlar, türler, çap aralığı, ölçülmüş ve tahmini boylar, yaş, koordinat, tabakalar, uyarılar, dışlanan satırlar, değişiklik günlüğü, onay zamanı, parmak izi) ve örnek alan × dönem kayıt sayıları.</li>
<li><b>Kopyala</b> aynı paketle yeni bir proje oluşturur; <b>Sil</b> onay ister ve geri alınamaz. Etkin paket silinirse araçlar onaylanmış veri görmez.</li>
</ul>
<h3>İçe ve dışa aktarma</h3>
<ul>
<li><b>Veri paketi (JSON)</b>: paketin kendisi (Veri Denetçisi'nin JSON'uyla aynı biçim); Örnek Alan ve Meşcere aracına dosya olarak da yüklenebilir.</li>
<li><b>Yedek indir (JSON)</b>: bütün projeler bilgileriyle tek dosyada (<code>forest-project-library/1</code>).</li>
<li><b>İçe aktar (JSON)</b>: veri paketi, tek proje ya da yedek. Önce bir önizleme gösterilir: yeni, zaten var (aynı paket; atlanır) ve geçersiz (nedeniyle); <b>Uygula</b>'ya basmadan hiçbir şey değişmez.</li>
</ul>
</section>
