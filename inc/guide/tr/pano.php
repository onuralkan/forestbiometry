<section class="card guide-sec">
<?= $sec('pano', 'Veri Görselleştirme') ?>
<p>Onaylanmış bir veri paketini tek sayfada gösterir: özet, çap dağılımı, tür katılımı, örnek alan başına N/ha ve G/ha, boy–çap ve ağaç haritası. Araçların çalışma kayıtlarındaki sonuçlar verinin üstüne çizilir. Paket ve kayıtlar tarayıcıdan çıkmaz.</p>
<p><b>Yapmadıkları:</b> yeni bir model fit etmez ve hesap yapmaz (N/ha ve G/ha Örnek Alan ve Meşcere aracının, yoğunluklar Çap Dağılımı'nın, eğriler Boy–Çap'ın hesap motorlarından gelir); paketi değiştirmez.</p>
<h3>Paket ve süzgeçler</h3>
<ul>
<li><b>Gösterilen paket</b>: Envanter Verisi Yöneticisi'ndeki paketlerden biri (varsayılan etkin paket); paket yoksa örnek paket (benzetim verisi) gösterilebilir.</li>
<li>Süzgeçler: <b>Dönem</b>, <b>Tabaka</b>, <b>Tür</b>, <b>Örnek alan</b>; bütün paneller birlikte güncellenir. Tür seçiliyken N/ha ve G/ha o türün payıdır (bulunmadığı alanda 0).</li>
<li><b>Kaydı olmayan örnek alan × dönem</b>: "ölçülmedi" (dışarıda bırakılır) ya da "boş" (N = G = 0). Ortalama N ve G, gösterilen örnek alan × dönemlerin ağırlıksız ortalamasıdır; tasarıma dayalı kestirim Örnek Alan aracındadır.</li>
<li>Çap dağılımı çubukları yoğunluktur (frekans / (n · sınıf genişliği)); sınıf genişliği otomatik ya da elle. Ağaç haritası tek bir örnek alan seçilince ve koordinat varsa çizilir. Her grafik SVG, verisi CSV olarak indirilir. Grafiklerin üstündeki düğme satırı sayfa kayarken üstte kalır: bir düğme o grafiğe götürür, ekrandaki grafiğin düğmesi vurgulanır; <b>↑ Süzgeçler</b> süzgeçlere döner.</li>
</ul>
<h3>Çalışma kayıtları</h3>
<ul>
<li><b>Kayıt ekle (.json)</b>: araçların indirdiği çalışma kayıtları. Mühür ve kaydın bu paketten üretilip üretilmediği gösterilir (paketten üretilen kayıtta paketin parmak izi bulunur; dosyadan üretilende eşleşme bilinemez).</li>
<li>Çap Dağılımı kayıtları: örnek alanı ve dönemi süzgeçle aynı olan sonuçların yoğunlukları histogramın üstüne çizilir ("hepsi" seçiliyken birleştirilmiş sonuç); eşikli fit işlemlerinde koşullu yoğunluk.</li>
<li>Boy–Çap kayıtları: fit edilen bütün modellerin eğrileri saçılım grafiğinin üstüne çizilir; seçilen model ★ ile. Öteki araçların kayıtları listelenir, çizilmez. <b>Çiz</b> kutusu bir kaydı gizler, <b>Kaldır</b> listeden çıkarır.</li>
</ul>
</section>
