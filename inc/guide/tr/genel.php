<section class="card guide-sec">
<?= $sec('genel', 'Genel') ?>
<h3>Verileriniz</h3>
<p>Bütün hesaplar tarayıcınızda yapılır. Yüklediğiniz dosyalar sunucuya gönderilmez, sunucuda kullanıcı verisi tutulmaz. Her aracın oturumu (yüklenen tablo, ayarlar) yalnızca bu tarayıcıda (IndexedDB) saklanır ve sayfaya döndüğünüzde "Önceki oturum geri yüklendi" iletisiyle açılır. Her araçtaki <b>Oturumu sıfırla</b> düğmesi o aracın kaydını siler; yanındaki kırmızı <b>Tüm araç oturumlarını sıfırla</b> düğmesi bütün araçların kayıtlı oturumlarını, etkin bir veri paketi varsa onu da (düğme o zaman <b>Tüm oturumları ve etkin paketi sil</b> der) onaydan sonra siler; Envanter Verisi Yöneticisi'ndeki öteki paketler ve Katsayı Kütüphanesi kalır. Başka bir tarayıcı ya da bilgisayar bu kayıtları görmez.</p>
<h3>Veri yükleme</h3>
<ul>
<li><b>Dosya seç</b>: CSV, TXT, TSV ve Excel (XLSX). Eski .xls biçimi okunmaz; Excel'de .xlsx olarak kaydedin. Excel dosyasındaki formüller ve makrolar çalıştırılmaz, yalnızca kayıtlı son değerler okunur; birden çok çalışma sayfası varsa sayfayı seçebilirsiniz.</li>
<li><b>Excel'den yapıştırın</b>: hücreleri kopyalayıp kutuya yapıştırın.</li>
<li>Metin dosyalarında sütun ayırıcı algılanır (değiştirilebilir). <b>Karakter kodlaması</b> utf-8, windows-1254 ya da iso-8859-9 seçilebilir; Türkçe harfler bozuk görünüyorsa kodlamayı değiştirin. <b>İlk satır başlık</b> kutusu başlık satırını belirler.</li>
<li>Sütunlar başlık adlarından önerilir (ör. <code>cap_cm</code>, <code>dbh</code>, <code>alan_no</code>, <code>plot</code>); öneriyi her zaman denetleyin.</li>
</ul>
<h3>Ondalık ayırıcı</h3>
<p>Ekranda sayılar Türkçede ondalık virgülle, İngilizcede noktayla gösterilir; dosyalardaki sayıların okunması ise arayüz dilinden bağımsızdır. Araç metin hücrelerine bakıp nokta mı virgül mü kullanıldığını söyler, ama kararı size bırakır: <b>Nokta (24.5)</b> ya da <b>Virgül (24,5)</b>. "1.234" gibi hem ondalık hem binlik ayırıcı olabilecek değerler "belirsiz" diye bildirilir. Seçiminize uymayan değerler okunamaz sayılır ve satır numaralarıyla raporlanır; hiçbir değer sessizce atlanmaz. Excel'in sayı hücreleri bu ayardan etkilenmez.</p>
<h3>Örnek veri</h3>
<p>Her araçta bir örnek veri düğmesi vardır. Örnek veriler benzetimdir (rastgele sayılarla üretilmiştir), gerçek ölçüm değildir; aracı denemek ve sınır durumlarını görmek içindir.</p>
<h3>Dışa aktarma</h3>
<ul>
<li><b>Excel raporu</b>: sayılar sayı hücresi olarak, tam duyarlıkla yazılır; ilk sayfada (çoğu araçta Bilgi, Veri Denetçisi'nde Ozet) araç, sürüm, tarih ve ayarlar bulunur.</li>
<li><b>CSV</b>: her iki dilde sütun ayırıcı virgül, ondalık ayırıcı noktadır. Türkçe bölge ayarlı Excel CSV dosyasını tek sütunda açabilir; o durumda Excel raporunu kullanın.</li>
<li><b>Grafikler</b> SVG olarak indirilir.</li>
</ul>
<h3>Kaynak gösterme</h3>
<p>Her sayfanın üstündeki <b>Atıf</b> düğmesi, araç sayfasında o aracı ve sürümünü, ana sayfada platformun tamamını APA, MLA, Chicago, Harvard, IEEE, Vancouver, BibTeX ve RIS biçimlerinde verir. Atıflarda platformun Zenodo arşivinin kavram DOI'si (10.5281/zenodo.24135603) bulunur. Aracın sürümü sayfa başlığında yazar. Araçtaki yöntemlerin özgün kaynaklarını ayrıca gösterin; araçlar bunları listeler.</p>
</section>
