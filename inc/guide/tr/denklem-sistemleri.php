<section class="card guide-sec">
<?= $sec('denklem-sistemleri', 'Denklem Sistemleri') ?>
<p>Aynı gözlemlerde birbiriyle ilişkili birden çok denklemi birlikte fit eder (ör. bir ağacın boyu ve hacmi). Denklemlerin hataları birbiriyle ilişkili olduğunda birlikte kestirim daha etkindir; denklemler arasında ortak katsayılar uyumlu sistemler kurar. Site hazır katsayı vermez.</p>
<p><b>Yapmadıkları:</b> içsel açıklayıcı değişkenler için araç değişkenli yöntemler (2SLS, 3SLS), denklem başına farklı gözlem sayısı, hataların ağırlıklandırılması, katsayılar üzerinde eşitlik dışındaki doğrusal kısıtlar.</p>
<h3>Sistem</h3>
<ul>
<li><b>Veri tablosu</b>: her satır bir gözlem; bütün denklemlerin değişkenleri sütun olarak. Bir denklemde değeri eksik olan satır bütün sistemden çıkarılır (her denklemde aynı gözlemler).</li>
<li><b>Denklemler</b>: her biri için bağımlı değişken ve formül (ör. <code>1.3 + a*(1-exp(-b*D_cm))^c</code>). Sütun başlığıyla aynı ad sütuna eşlenir; öteki adlar katsayıdır. Birden çok denklemde aynı adla geçen katsayı tek katsayıdır: örneğin hacim denkleminde boy yerine boy denkleminin kendisi yazılırsa (<code>k*D_cm^p*(1.3 + a*(1-exp(-b*D_cm))^c)^q</code>) iki denklem uyumlu olur.</li>
<li><b>Başlangıç değerleri</b>: doğrusal denklemlerde 0 yeterlidir; doğrusal olmayan katsayılara makul değerler girin.</li>
<li><b>Yöntem</b>: OLS (denklemler eşit ağırlıkta, ortak katsayılarla birlikte), SUR (birinci adım OLS artıklarından kestirilen kovaryansla genelleştirilmiş en küçük kareler) ya da yinelemeli SUR. <b>Artık kovaryansı</b>: T, √((T − Kᵢ)(T − Kⱼ)) ya da T − max(Kᵢ, Kⱼ) ile (Henningsen ve Hamann 2007).</li>
</ul>
<h3>Sonuçlar</h3>
<ul>
<li>Katsayılar (kestirim, standart hata, t; hangi denklemlerde geçtiği, ortak olup olmadığı), denklem başına R², SSR ve σ̂, sistem için OLS R² ve McElroy R², log L, denklemler arası artık korelasyonu, her denklem için gözlenen–tahmin grafiği.</li>
<li><b>Ortak katsayıların testi</b>: sistem ortak katsayılar her denklemde ayrı olacak biçimde yeniden fit edilir ve olabilirlik oranı testi yapılır (iki fit etme da yinelemeli SUR, en çok olabilirlik); küçük p, ortak katsayı kısıtının veriyle uyuşmadığını gösterir. Test yalnızca kısıtsız sistem veriyle belirlenebiliyorsa güvenilirdir; araç bunu denetler (1.0.0-beta.2): kısıtsız log L kısıtlıdan küçük çıkarsa, ayrılan katsayılar uç değerlere kaçarsa, ölçekli bilgi matrisinin koşul sayısı 10⁸'i aşarsa ya da farklı başlangıçlar farklı en büyük olabilirliğe giderse "test güvenilir değil" der, gerekçeleri yazar ve p-değeri vermez. Örnek verideki uyumlu boy–hacim sistemi böyledir: hacim denkleminin ayrılan a, b, c ve q katsayıları veriyle ayrılamaz.</li>
<li><b>Zayıf belirlenme</b>: ana fit'te koşul sayısı 10⁸'i aşarsa veri hangi katsayı bileşimini ayıramadığıyla birlikte uyarı verilir; standart hatası kestiriminden büyük katsayılar ayrıca not edilir.</li>
<li><b>Yöntem karşılaştırması</b>: aynı sistem OLS, SUR ve yinelemeli SUR ile; katsayılar ve standart hataları yan yana.</li>
<li><b>Setleri kaydet</b>: her denklem ayrı bir set olarak, ortak katsayıları ve kovaryansıyla, aynı sistem kimliğiyle kaydedilir. İndirme: Excel (Bilgi, Katsayılar, Denklemler, Gözlemler), CSV, JSON çalışma kaydı. <b>R kodu (.R)</b>: aynı çalıştırmayı temel R ile yeniden yapan betik; aynı satırlar, denklemler (R diline çevrilmiş) ve ortak katsayılar, aynı yöntem ve artık kovaryansı, ortak katsayı varsa olabilirlik oranı testi. Kestirici (Σ̂⁻¹ ile ağırlıklı en küçük kareler, sönümlü Gauss–Newton) betikte açıkça yazılıdır, türevler R'ın <code>deriv</code> fonksiyonuyla; <code>systemfit</code>'in doğrusal olmayan fonksiyonu SUR adımında ilerlemediği için kullanılmaz. Betik LR testinin güvenilirlik denetimlerini de aynı kurallarla yapar. Veri gömülmez; betiğin başındaki dosya adını kendi dosyanızın yoluyla değiştirirsiniz. Sitenin testleri bu kodun aracın sayılarını verdiğini her yayında R'da denetler.</li>
</ul>
</section>
