<section class="card guide-sec">
<?= $sec('rapor', 'Rapor Üretici') ?>
<p>Bir veri paketini ve araçların çalışma kayıtlarını tek bir raporda toplar. Rapor sayfada önizlenir; tarayıcının yazdırma penceresinden kâğıda ya da "PDF olarak kaydet" ile PDF'e, <b>HTML indir</b> ile tek başına açılan bir dosyaya çıkar. Paket, kayıtlar ve notlar tarayıcıdan çıkmaz.</p>
<p><b>Yapmadıkları:</b> yeni hesap yapmaz (değerler paketten, panonun hesabından ve kayıtlardan aynen alınır); kayıtlarda olmayan bir kaynağı eklemez; Word ya da başka bir dosya biçimi üretmez.</p>
<h3>İçerik</h3>
<ul>
<li><b>Rapor bilgileri</b>: başlık, hazırlayan, kurum, tarih, giriş metni ve <b>Rapor dili</b> (Türkçe ya da İngilizce; arayüz dilinden bağımsız).</li>
<li><b>Veri paketi</b>: Envanter Verisi Yöneticisi'ndeki bir paket (ya da benzetim örnek paket); süzgeçler Görselleştirme Panosu'ndakilerle aynıdır ve yalnızca grafikleri etkiler.</li>
<li><b>Çalışma kayıtları</b>: <b>Kayıt ekle (.json)</b> ya da <b>Panodaki kayıtları al</b>; sıraları değiştirilebilir. Her kayıt için araç, sürüm, mühür, verinin kaynağı, ayarlar ve sonuç tabloları (uzun tablolarda ilk 60 satır) yazılır.</li>
</ul>
<h3>Bölümler ve çıktı</h3>
<ul>
<li>Bölümler (veri paketi, grafikler, çalışma kayıtları, kaynaklar, tekrarlanabilirlik eki) açılıp kapatılabilir ve her birine not eklenebilir; numaralar kendiliğinden düzenlenir.</li>
<li><b>Kaynaklar</b>: platformun ve kullanılan araçların atıfları (APA, raporun tarihi erişim tarihi olarak), kayıtlarda adı geçen kaynaklar okunma durumlarıyla, kullanıcı katsayı setlerinin kaynakları.</li>
<li><b>Ek: Tekrarlanabilirlik</b>: raporu üreten sitenin ve her kaydın commit'i, mühürler, veri paketinin ve girdi dosyalarının parmak izleri.</li>
<li><b>Yazdır / PDF olarak kaydet</b> yalnızca raporu A4 sayfalara dizer; <b>HTML indir</b> stilleri ve grafikleri içinde taşıyan tek bir dosya verir.</li>
</ul>
</section>
