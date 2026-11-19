<section class="card guide-sec">
<?= $sec('model-degerlendirme', 'Model Başarısı Değerlendiricisi') ?>
<p>Gözlenen değerleri bir ya da daha fazla modelin tahminleriyle karşılaştırır: yanlılık (ē), MAE, RMSE ve tahmin R² (1 − SSE/SST); gözlenen–tahmin ve artık grafikleri; örnek alan, tür, çap sınıfı ve doğrulama katına göre tablolar. Hata işareti her yerde <b>e = gözlenen − tahmin</b>; negatif yanlılık modelin ortalamada fazla tahmin ettiğini gösterir. R² ilişki katsayısının karesi değildir, negatif olabilir.</p>
<p>İsteğe bağlı olarak ölçütler bir ağırlık sütunuyla ağırlıklı hesaplanır; ortalama hata (yanlılık) için güven aralığı, eşdeğerlik testleri (Robinson ve Froese 2004) ve yanlılık, MAE, RMSE ve R² için bootstrap güven aralıkları (yüzdelik ve BCa; DiCiccio ve Efron 1996) verilir.</p>
<p><b>Yapmadıkları:</b> AIC, düzeltilmiş R², parametre güven aralıkları ve model anlamlılığı hesaplanmaz (parametre sayısı bilinmez). Araç dış doğrulama olduğunu varsaymaz.</p>
<h3>Veri</h3>
<p>Her satır bir gözlem: gözlenen değer ve bir ya da daha fazla modelin tahmini. Örnek alan, tür, çap ve doğrulama katı sütunları isteğe bağlıdır. Tablo dosyadan, yapıştırarak ya da "Onaylanmış veriden al" ile Denetçi'nin onayladığı veriden gelebilir (eşleşmemiş sütunlar tahmin adayı olur).</p>
<h3>Sütunlar ve ayarlar</h3>
<ul>
<li><b>Gözlenen değer sütunu</b> ve <b>tahmin sütunları</b>: her model için bir ad ve <b>tahminlerin kaynağı</b> (belirtilmedi, eğitim verisi, bağımsız test verisi, çapraz doğrulama). Kaynak hesabı değiştirmez, raporda ve uyarılarda kullanılır.</li>
<li><b>Gruplar</b>: örnek alan, tür, doğrulama katı, çap sütunu ve çap sınıfı sınırları.</li>
<li><b>Hangi satırlar?</b> Varsayılan "ortak geçerli satırlar": bütün modellerin ve gözlenen değerin dolu olduğu satırlar; modeller aynı örneklemle karşılaştırılır. "Her model kendi geçerli satırlarıyla" seçilirse örneklemler farklı olabilir ve karşılaştırma doğrudan yapılamaz.</li>
<li><b>Bağıl ölçütler</b> (isteğe bağlı): gözlenen ortalamaya, aralığa ya da standart sapmaya göre yüzde.</li>
<li><b>Ağırlık</b> (isteğe bağlı): ör. örnekleme ağırlığı ya da hektara çevirme katsayısı. Her ortalama Σw·(…)/Σw olur. Ağırlığı boş, okunamayan, sıfır ya da negatif satırlar dışarıda kalır ve sayılır. Ağırlıklıyken standart sapmaya göre bağıl ölçüt tanımsızdır; güven aralığı ve eşdeğerlik testleri hesaplanmaz.</li>
<li><b>Yanlılık için çıkarım</b>: güven düzeyi (%90, %95, %99) ve isteğe bağlı eşdeğerlik testi. Eşdeğerlik sınırı ya veri biriminde (δ, ör. 0,5 m) ya da hataların standart sapmasına oranla (ε, ör. 0,25) girilir; test büyüklüğü α 0,01, 0,05 ya da 0,10.</li>
<li><b>Bootstrap güven aralıkları</b> (isteğe bağlı): yineleme sayısı B (1000, 2000, 5000) ve tohum. Çiftler yerine koyarak yeniden örneklenir; aynı tohum aynı sonucu verir. Yüzdelik aralık bootstrap tahminlerinin yüzdeliklerinden, BCa aralığı yanlılık düzeltmesi (ẑ₀) ve jackknife ivmesiyle (â) düzeltilmiş yüzdeliklerden kurulur. BCa genellikle daha isabetlidir; ẑ₀ ya da â tanımsızsa yalnız yüzdelik aralık verilir. "*" işareti, ucun en küçük ya da en büyük yinelemeden geldiğini gösterir: B'yi artırın.</li>
</ul>
<h3>Sonuçlar ve indirme</h3>
<p><b>Özet</b> (ölçütler, kaynak beyanı, satır hesabı: boş, okunamayan, kullanılan satırlar), <b>Çıkarım</b> (yanlılık için güven aralığı, bootstrap aralıkları ve eşdeğerlik testleri), <b>Grafikler</b> (gözlenen–tahmin, 1:1 çizgisiyle; artık–tahmin), <b>Gruplar</b> ve <b>İndir</b>: tam rapor (Excel), ölçüt tablosu, çıkarım tablosu, bootstrap tablosu, grup tablosu ve satır başına artıklar (CSV).</p>
<h3>Eşdeğerlik testi nasıl okunur?</h3>
<p>Klasik testte sıfır hipotezi "fark yok"tur; küçük ya da gürültülü bir örneklem bu hipotezi reddedemez ve model yanlışlıkla başarılı görünür. Eşdeğerlik testinde sıfır hipotezi "model yanlı"dır (|ortalama hata| ≥ δ); eşdeğerlik ancak veri bunu gösterirse kabul edilir. İki test verilir: <b>TOST</b> (1 − 2α güven aralığı ±δ içinde mi?) ve daha güçlü olan <b>eşdeğerlik için eşleştirilmiş t testi</b> (|t| &lt; C). "Gösterilemedi" modelin yanlı olduğunu kanıtlamaz; güç sütunu, gerçek yanlılık sıfırken eşdeğerliğin gösterilme olasılığıdır. Sonuç seçtiğiniz δ'ya bağlıdır; δ'yı veriye bakmadan, kullanım amacına göre belirleyin.</p>
<h3>Sık karşılaşılanlar</h3>
<ul>
<li>Kaynak "eğitim verisi" ya da "belirtilmedi" ise uyarı çıkar: eğitim verisindeki başarı yeni verideki başarıdan genellikle iyimserdir; kaynağı belirtilmemiş tahminler dış doğrulama gibi okunmamalıdır.</li>
<li>Gözlenen değerler sabitse R² tanımsızdır; bağıl ölçüt paydası sıfır ya da negatifse bağıl ölçüt tanımsız yazılır.</li>
<li>Güven aralığı ve testler çiftlerin bağımsız olduğunu varsayar; aynı örnek alandaki ağaçlar birbirine benzediği için aralık gerçekte olduğundan dar çıkabilir.</li>
<li>Bir satır birden çok nedenle dışarıda kalabilir; satır hesabındaki sayılar bu yüzden toplanmaz.</li>
</ul>
</section>
