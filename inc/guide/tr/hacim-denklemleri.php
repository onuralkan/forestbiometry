<section class="card guide-sec">
<?= $sec('hacim-denklemleri', 'Hacim Denklemleri') ?>
<p>Hacmi bilinen ağaçlarınızdan (göğüs çapı D, boy H, hacim V) ağaç hacim denklemi fit eder. Biçimler Kershaw ve ark. (2016) §6.2'deki standart ve yerel hacim denklemleridir; site hazır katsayı vermez.</p>
<p><b>Yapmadıkları:</b> biçim (form) değişkenli denklemler, doğrusal olmayan fit etme (V = b1·D^b2·H^b3 logaritmik biçimiyle fit edilir), karma etkili modeller, hacim tablosu basımı.</p>
<h3>Veri</h3>
<ul>
<li><b>Ağaç tablosu</b>: D (cm), H (m; yerel denklemlerde gerekmez), V (m³) sütunları ve hacmin kabuk tarafı. Benzetim tablosu yalnızca denemek içindir.</li>
<li>Ya da <b>Aktarılan hacimleri kullan</b>: Seksiyon Hacmi aracında onaylanmış veriyi bağlayıp "Hacimleri aktar"ı kullandıysanız etkin paketin ağaçları (D, H) aktarılan kabuklu ya da kabuksuz hacimlerle birleşir.</li>
</ul>
<h3>Denklemler ve sonuçlar</h3>
<ul>
<li>Biçimler: <b>sabit biçim sayısı</b> V = b1·D²H, <b>birleşik değişken</b> V = b0 + b1·D²H, <b>logaritmik</b> ln V = ln b1 + b2·ln D + b3·ln H, <b>yerel</b> V = b0 + b1·D² ve <b>yerel logaritmik</b> ln V = ln b0 + b1·ln D. Birden çoğunu seçip karşılaştırabilirsiniz.</li>
<li>Hacim ölçeğindeki biçimlerde isteğe bağlı <b>ağırlık</b>: hata varyansı X^k ile orantılı (X = D²H ya da D²); k boş bırakılırsa artıklardan kestirilir (Parresol 1999). Logaritmik biçimlerde geri dönüşüm düzeltmesi seçilir: yok ya da Baskerville exp(s²/2).</li>
<li>Sonuçlar: karşılaştırma tablosu (RMSE, yanlılık, MAE, R²; Model Başarısı aracıyla aynı tanımlar, hacim ölçeğinde), her biçimin katsayıları ve standart hataları, gözlenen–tahmin ve artık grafikleri. Değeri eksik ağaçlar satır numarasıyla dışarıda bırakılır.</li>
<li><b>Seti kaydet</b>: seçilen biçim kaynak açıklamasıyla katsayı kütüphanesine kaydedilir (geçerlilik aralığı örneğin D ve H aralığı). <b>Aktar ve Model Başarısı aracını aç</b>: gözlenen ve tahmin edilen hacimler Model Başarısı aracına sütunları seçili olarak aktarılır.</li>
<li>İndirme: Excel (Bilgi, Karşılaştırma, Katsayılar, Ağaçlar), ağaçlar ve tahminler CSV, JSON çalışma kaydı. <b>R kodu (.R)</b>: aynı çalıştırmayı temel R ile (<code>lm</code>) yeniden yapan betik; her biçim için aynı ağaçlar, ağırlıklar (k tahmin ediliyorsa ağırlıksız artıklardan) ve geri dönüşüm düzeltmesi, hacim ölçeğinde aynı ölçütler. Veri gömülmez; betiğin başındaki dosya adını kendi dosyanızın yoluyla değiştirirsiniz (Seksiyon Hacmi sonuçları betikle birlikte CSV olarak iner). Sitenin testleri bu kodun aracın sayılarını verdiğini her yayında R'da denetler.</li>
</ul>
</section>
