<section class="card guide-sec">
<?= $sec('buyume-islevi', 'Büyüme İşlevi Uydurma') ?>
<p>Yaş–büyüklük verinize (boy, çap, hacim…) altı büyüme işlevini aynı anda uydurur ve karşılaştırır: Chapman–Richards, Schumacher, Gompertz, logistik, monomoleküler ve Weibull. Katsayılar sizin verinizden gelir; site hazır eğri vermez.</p>
<p><b>Yapmadıkları:</b> Korf işlevi (kaynağı henüz okunmadı); dizi ya da örnek alan düzeyinde rastgele etkiler (bütün gözlemlere tek eğri uydurulur); bonitet eğrisi (bunun için Bonitet aracı).</p>
<h3>Veri ve modeller</h3>
<ul>
<li>Tablo ya da yapıştırma: <b>Yaş (yıl)</b> ve <b>Büyüklük</b> sütunları zorunlu, dizi sütunu isteğe bağlı. Değişkenin adı ve birimi grafiklerde ve indirmelerde yazılır. Okunamayan satırlar numaralarıyla bildirilir.</li>
<li><b>Uydurulacak modeller</b>: istediğiniz biçimleri seçin; her biçimin yanında kaynak durumu yazılır.</li>
</ul>
<h3>Sonuçlar</h3>
<ul>
<li><b>Model karşılaştırması</b>: katsayılar ve standart hataları, RMSE, yanlılık, σ̂, AIC (en küçüğü ★), asimptot, dönüm noktası yaşı ve ortalama artımın doruk yaşı. Standart hatalar bağımsız gözlem varsayımıyla hesaplanır.</li>
<li>Gözlemler ve bütün eğrilerin grafiği; seçilen model için cari ve ortalama artım grafiği, artıklar ve eğri tablosu. Seçilen eğri kaynak yazılarak katsayı kütüphanesine kaydedilebilir.</li>
<li>İndirme: Excel (Bilgi, Karşılaştırma, Tahminler, Eğriler), CSV ve JSON.</li>
</ul>
</section>
