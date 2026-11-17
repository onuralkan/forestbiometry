<section class="card guide-sec">
<?= $sec('model-degerlendirme', 'Model Başarısı Değerlendiricisi') ?>
<p>Gözlenen değerleri bir ya da daha fazla modelin tahminleriyle karşılaştırır: yanlılık (ē), MAE, RMSE ve tahmin R² (1 − SSE/SST); gözlenen–tahmin ve artık grafikleri; örnek alan, tür, çap sınıfı ve doğrulama katına göre tablolar. Hata işareti her yerde <b>e = tahmin − gözlenen</b>; pozitif yanlılık modelin ortalamada fazla tahmin ettiğini gösterir. R² ilişki katsayısının karesi değildir, negatif olabilir.</p>
<p><b>Yapmadıkları:</b> AIC, düzeltilmiş R², parametre güven aralıkları ve model anlamlılığı hesaplanmaz (parametre sayısı bilinmez). Araç dış doğrulama olduğunu varsaymaz.</p>
<h3>Veri</h3>
<p>Her satır bir gözlem: gözlenen değer ve bir ya da daha fazla modelin tahmini. Örnek alan, tür, çap ve doğrulama katı sütunları isteğe bağlıdır. Tablo dosyadan, yapıştırarak ya da "Onaylanmış veriden al" ile Denetçi'nin onayladığı veriden gelebilir (eşleşmemiş sütunlar tahmin adayı olur).</p>
<h3>Sütunlar ve ayarlar</h3>
<ul>
<li><b>Gözlenen değer sütunu</b> ve <b>tahmin sütunları</b>: her model için bir ad ve <b>tahminlerin kaynağı</b> (belirtilmedi, eğitim verisi, bağımsız test verisi, çapraz doğrulama). Kaynak hesabı değiştirmez, raporda ve uyarılarda kullanılır.</li>
<li><b>Gruplar</b>: örnek alan, tür, doğrulama katı, çap sütunu ve çap sınıfı sınırları.</li>
<li><b>Hangi satırlar?</b> Varsayılan "ortak geçerli satırlar": bütün modellerin ve gözlenen değerin dolu olduğu satırlar; modeller aynı örneklemle karşılaştırılır. "Her model kendi geçerli satırlarıyla" seçilirse örneklemler farklı olabilir ve karşılaştırma doğrudan yapılamaz.</li>
<li><b>Bağıl ölçütler</b> (isteğe bağlı): gözlenen ortalamaya, aralığa ya da standart sapmaya göre yüzde.</li>
</ul>
<h3>Sonuçlar ve indirme</h3>
<p><b>Özet</b> (ölçütler, kaynak beyanı, satır hesabı: boş, okunamayan, kullanılan satırlar), <b>Grafikler</b> (gözlenen–tahmin, 1:1 çizgisiyle; artık–tahmin), <b>Gruplar</b> ve <b>İndir</b>: tam rapor (Excel), ölçüt tablosu, grup tablosu ve satır başına artıklar (CSV).</p>
<h3>Sık karşılaşılanlar</h3>
<ul>
<li>Kaynak "eğitim verisi" ya da "belirtilmedi" ise uyarı çıkar: eğitim verisindeki başarı yeni verideki başarıdan genellikle iyimserdir; kaynağı belirtilmemiş tahminler dış doğrulama gibi okunmamalıdır.</li>
<li>Gözlenen değerler sabitse R² tanımsızdır; bağıl ölçüt paydası sıfır ya da negatifse bağıl ölçüt tanımsız yazılır.</li>
<li>Bir satır birden çok nedenle dışarıda kalabilir; satır hesabındaki sayılar bu yüzden toplanmaz.</li>
</ul>
</section>
