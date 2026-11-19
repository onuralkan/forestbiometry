<section class="card guide-sec">
<?= $sec('karma-modeller', 'Karma Etkili Modeller') ?>
<p>Gruplanmış veriye (ör. örnek alanlardaki ağaçlar) karma etkili modeller fit eder: sabit etkiler bütün gruplar için ortaktır, rastgele etkiler grup başına sapmalardır. Doğrusal (LME) ve doğrusal olmayan (NLME) modeller aynı sayfadadır. Site hazır katsayı vermez.</p>
<p><b>Yapmadıkları:</b> iç içe birden çok grup düzeyi (ör. bölge › örnek alan), otokorelasyonlu hatalar, genelleştirilmiş karma modeller (ikili ya da sayım verisi), ölçüm hatalı değişkenler.</p>
<h3>Veri ve modeller</h3>
<ul>
<li><b>Veri tablosu</b>: grup sütunu, bağımlı değişken ve açıklayıcı değişkenler. Benzetim tablosu (25 örnek alan, boy–çap) yalnızca denemek içindir.</li>
<li><b>Doğrusal karma model</b>: sabit terim ve seçtiğiniz sütunlar (dönüşüm x, ln x ya da x²); rastgele etki sabit terimde ve/veya seçilen terimlerde.</li>
<li><b>Doğrusal olmayan karma model</b>: hazır biçimlerden biri ya da serbest formül (ör. <code>1.3 + a*(1-exp(-b*D))^c</code>); rastgele etki seçilen katsayılara grup başına eklenir. Başlangıç değerleri boşsa önce bütün veriye doğrusal olmayan en küçük karelerle fit edilir.</li>
<li><b>Kestirim</b>: ML ya da REML. <b>Kovaryans</b>: köşegen (bağımsız) ya da genel (ilişkili) rastgele etkiler. <b>Hata varyansı</b>: sabit ya da σ²·|v|^(2δ) (varPower; v modelin bir değişkeni, δ kestirilir).</li>
</ul>
<h3>Sonuçlar</h3>
<ul>
<li><b>Karşılaştırma</b>: k, log L, AIC, BIC ve σ̂; bütün modeller aynı satırlara fit edilir. REML olabilirliklerini yalnız sabit etkileri aynı modeller arasında karşılaştırın; sabit etkileri farklı modelleri ML ile karşılaştırın.</li>
<li><b>Olabilirlik oranı testi</b>: iç içe iki ML modeli için L = 2(log L₁ − log L₀), χ² dağılımı.</li>
<li>Her model için sabit etkiler (kestirim, standart hata, t), varyans bileşenleri (standart sapmalar, korelasyon, σ, δ), grupların rastgele etkileri, grup düzeyinde gözlenen–tahmin ve artık grafikleri.</li>
<li><b>Yeni bir grubu kalibre et</b>: fit işleminde olmayan bir grubun birkaç ölçümünden (ör. yeni örnek alanda üç ağacın boyu) rastgele etkiler öngörülür ve eğri o gruba uyarlanır. Doğrusal olmayan modelde tek adımlı yaklaşım ya da yinelemeli koşullu mod seçilir.</li>
<li><b>Seti kaydet</b>: sabit etkiler katsayı olarak; rastgele etkilerin kovaryansı, σ ve δ sete yazılır. İndirme: Excel (Bilgi, Karşılaştırma, Sabit etkiler, Rastgele etkiler, Gözlemler), CSV, JSON çalışma kaydı. <b>R kodu (.R)</b>: aynı çalıştırmayı <code>nlme</code> paketiyle (<code>lme</code>, <code>nlme</code>) yeniden yapan betik; aynı satırlar, rastgele etkiler, kovaryans yapısı (<code>pdDiag</code>/<code>pdSymm</code>), varyans fonksiyonu (<code>varPower</code>) ve yöntem, olabilirlik oranı testi ve kalibrasyon kartındaki grup. Doğrusal olmayan REML'de <code>nlme</code> REML optimumuna gitmeyebilir; betik bunu yazar. Veri gömülmez; betiğin başındaki dosya adını kendi dosyanızın yoluyla değiştirirsiniz. Sitenin testleri bu kodun aracın sayılarını verdiğini her yayında R'da denetler.</li>
</ul>
</section>
