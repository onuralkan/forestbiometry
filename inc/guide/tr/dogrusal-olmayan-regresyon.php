<section class="card guide-sec">
<?= $sec('dogrusal-olmayan-regresyon', 'Doğrusal Olmayan Regresyon') ?>
<p>Kendi verinize doğrusal olmayan modeller uydurur: hazır bir biçim seçersiniz ya da formülü kendiniz yazarsınız. Birden çok model aynı satırlara uydurulup karşılaştırılır. Site hazır katsayı vermez.</p>
<p><b>Yapmadıkları:</b> karma etkili modeller (örnek alan etkisi), denklem sistemleri (bunlar için Biyokütle ve Karbon aracındaki toplamsal sistem), kısıtlı parametreler, otokorelasyonlu hatalar, profil olabilirliği aralıkları.</p>
<h3>Veri ve modeller</h3>
<ul>
<li><b>Veri tablosu</b>: her satır bir gözlem; bağımlı değişken ve açıklayıcı değişkenler sütun olarak. Benzetim tablosu yalnızca denemek içindir.</li>
<li><b>Hazır biçimler</b>: Chapman–Richards, Schumacher, Gompertz, lojistik, monomoleküler, Weibull (Büyüme İşlevi aracındaki biçimler) ve üs biçimleri y = a·x^b, y = a·x1^b·x2^c (Parresol 2001). Değişkenleri sütunlarla eşleyin; başlangıç değerleri boş bırakılırsa veriden bulunur.</li>
<li><b>Serbest formül</b>: ör. <code>a*D^b*H^c</code> ya da <code>1.3 + b0*(1-exp(-b1*D))^b2</code>. İşlemler + − * / ^ ve ayraçlar; işlevler exp, ln, log10, sqrt, abs; sabit pi. Formüldeki her ad ya bir sütunla eşlenir ya da katsayıdır; adı bir sütun başlığıyla aynıysa sütun olarak eşlenir. Katsayıların başlangıç değerleri zorunludur. Türevler formülden tam olarak hesaplanır.</li>
<li><b>Ağırlık</b> (isteğe bağlı, model başına): hata varyansı σ²·ψ; ψ = X^θ (X bir sütun, θ verilir ya da ağırlıksız uydurmanın artıklarından kestirilir) ya da ψ bir sütunun değeri (Parresol 2001).</li>
</ul>
<h3>Sonuçlar</h3>
<ul>
<li><b>Karşılaştırma</b>: n, katsayı sayısı, RMSE, yanlılık, R² (Model Başarısı aracıyla aynı tanımlar), AIC, σ̂, ağırlık ve yakınsama durumu. Bütün modeller aynı satırlara uydurulur; kullanılan bir sütunda değeri eksik satırlar satır numarasıyla dışarıda bırakılır. Yakınsamayan model gizlenmez, durumu yazılır.</li>
<li>Her model için katsayılar, asimptotik standart hatalar ve %95 güven aralıkları, gözlenen–tahmin ve artık grafikleri.</li>
<li><b>Güven ve tahmin aralığı</b>: girilen değişken değerlerinde ortalama için güven aralığı ve yeni gözlem için tahmin aralığı (ağırlıklı modelde ağırlık değişkeninin değeri de istenir).</li>
<li><b>Seti kaydet</b>: seçilen model formülü, katsayıları, kovaryansı, birimleri ve kaynak açıklamasıyla katsayı kütüphanesine kaydedilir. <b>Aktar ve Model Başarısı aracını aç</b>: gözlenen y ve modellerin tahminleri Model Başarısı aracına aktarılır.</li>
<li>İndirme: Excel (Bilgi, Karşılaştırma, Katsayılar, Gözlemler), CSV, JSON çalışma kaydı.</li>
</ul>
</section>
