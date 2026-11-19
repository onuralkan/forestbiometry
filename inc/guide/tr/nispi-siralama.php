<section class="card guide-sec">
<?= $sec('nispi-siralama', 'Nispi Sıralama') ?>
<p>Modellerinizin başarı ölçütleri tablosundan ölçüt bazında ve genel nispi sıraları hesaplar (Poudel ve Cao 2013) ve en iyi ile en kötü modelleri radar grafiğinde karşılaştırır. En iyi model 1, en kötü model m (model sayısı) alır; aradakiler değerlerine orantılı sıralanır.</p>
<p><b>Yapmadıkları:</b> başarı ölçütlerini hesaplamaz (tabloyu siz getirirsiniz); ağırlıklar her zaman eşittir; aynı sıralamayı veren iki ölçütten birini kendiliğinden düşürmez; AIC ve BIC'nin karşılaştırılabilir olup olmadığını denetleyemez (yalnızca aynı veriye fit edilmiş modeller için karşılaştırılabilir).</p>
<h3>Veri</h3>
<p>Her satır bir model, her sütun bir başarı ölçütü. Başlık satırı ve model adı sütunu önerilir, değiştirilebilir. Yalnızca sayı içeren sütunlar ölçüt olur.</p>
<h3>Ölçütler</h3>
<p>Her ölçüt için <b>Sıralamaya kat</b> ve <b>İyi olan</b>: en büyük (R², FI), en küçük (RMSE, MAE, AIC, BIC…) ya da sıfıra en yakın, |değer| (yanlılık (Bias), ME…). Yön sütun adından önerilir; tanınmayan adlarda yönü siz seçersiniz.</p>
<h3>Sonuçlar ve indirme</h3>
<p><b>Sıralama</b> tablosunda modeller sıralamadan çıkarılıp geri alınabilir (sıralar kalan modellerle yeniden hesaplanır); <b>Radar grafiği</b> en iyi ve en kötü modelleri gösterir (merkez 1 = en iyi; alanı küçük olan model daha iyidir). İndirme: tam rapor (Excel) ve sıralama tablosu (CSV).</p>
<h3>Sık karşılaşılanlar</h3>
<ul>
<li>Eksik ya da okunamayan değeri olan modeller sıralanmaz; o ölçütü dışarıda bırakmak onları geri getirir.</li>
<li>Aynı sıraları veren ölçütler iki kez sayılmış olur (ör. FI ile R², ikisi de 1 − SSE/SST); birini bırakmayı düşünün.</li>
<li>Çok kötü tek bir model ötekileri birbirine yaklaştırır. Radar grafiği için en az 3 ölçüt gerekir.</li>
</ul>
</section>
