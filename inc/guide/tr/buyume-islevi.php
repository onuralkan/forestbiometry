<section class="card guide-sec">
<?= $sec('buyume-islevi', 'Büyüme Fonksiyonu Fit Etme') ?>
<p>Yaş–büyüklük verinize (boy, çap, hacim…) altı büyüme fonksiyonunu aynı anda fit eder ve karşılaştırır: Chapman–Richards, Schumacher, Gompertz, lojistik, monomoleküler ve Weibull. Katsayılar sizin verinizden gelir; site hazır eğri vermez.</p>
<p><b>Yapmadıkları:</b> Korf fonksiyonu (kaynağı henüz okunmadı); dizi ya da örnek alan düzeyinde rastgele etkiler (bütün gözlemlere tek eğri fit edilir); bonitet eğrisi (bunun için Bonitet aracı).</p>
<h3>Veri ve modeller</h3>
<ul>
<li>Tablo ya da yapıştırma: <b>Yaş (yıl)</b> ve <b>Büyüklük</b> sütunları zorunlu, dizi sütunu isteğe bağlı. Değişkenin adı ve birimi grafiklerde ve indirmelerde yazılır. Okunamayan satırlar numaralarıyla bildirilir.</li>
<li><b>Fit edilecek modeller</b>: istediğiniz biçimleri seçin; her biçimin yanında kaynak durumu yazılır.</li>
</ul>
<h3>Sonuçlar</h3>
<ul>
<li><b>Model karşılaştırması</b>: katsayılar ve standart hataları, RMSE, yanlılık, σ̂, AIC (en küçüğü ★), asimptot, dönüm noktası yaşı ve ortalama yıllık artımın doruk yaşı. Standart hatalar bağımsız gözlem varsayımıyla hesaplanır.</li>
<li>Gözlemler ve bütün eğrilerin grafiği; seçilen model için cari yıllık artım ve ortalama yıllık artım grafiği, artıklar ve eğri tablosu. Seçilen eğri kaynak yazılarak katsayı kütüphanesine kaydedilebilir.</li>
<li>İndirme: Excel (Bilgi, Karşılaştırma, Tahminler, Eğriler), CSV ve JSON. <b>R kodu (.R)</b>: aynı çalıştırmayı temel R ile (<code>nls</code>) yeniden yapan betik; aynı gözlemler, fonksiyonlar ve başlangıç değerleri, türevler ve cari yıllık artımlar (CAI) R'ın <code>deriv</code> fonksiyonuyla, dönüm noktası yaşı ve ortalama yıllık artımın (MAI) doruk yaşı, seçilen fonksiyonun tablosu. Veri gömülmez; betiğin başındaki dosya adını kendi dosyanızın yoluyla değiştirirsiniz. Sitenin testleri bu kodun aracın sayılarını verdiğini her yayında R'da denetler.</li>
</ul>
</section>
