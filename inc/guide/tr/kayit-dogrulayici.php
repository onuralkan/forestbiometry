<section class="card guide-sec">
<?= $sec('kayit-dogrulayici', 'Kayıt Doğrulayıcı') ?>
<p>Araçların sonuçları JSON olarak indirildiğinde ortak bir <b>çalışma kaydı</b> (<code>run-record/1</code>) yazılır: aracın kimliği ve sürümü, sitenin yayındaki kaynak kodunun commit'i, zaman, dil, ayarlar, sonuçlar, her girdi dosyasının SHA-256 parmak izi ve kaydın mührü. Bu sayfa böyle bir kaydı açar ve denetler. Kayıt ve dosyalar tarayıcıdan çıkmaz.</p>
<p><b>Yapmadıkları:</b> hesabı yeniden yapmaz (aynı girdi ve ayarlarla aracın kendi sayfasında yapılır); mühür bir imza değildir, değişikliği gösterir ama sahteciliği önlemez; veri paketleri, katsayı kütüphanesi ve meşcere modeli dosyaları kayıt değildir, kendi araçlarında açılır.</p>
<h3>Kayıt indirme (bütün araçlar)</h3>
<ul>
<li>Araçların JSON düğmesi (JSON düğmesi olmayan araçlarda <b>Çalışma kaydı (JSON)</b>) kaydı indirir. Eski JSON içeriği aynen korunur; ortak alanlar eklenir.</li>
<li><b>Girdi verisini kayda ekle</b> işaretli değilse kayıtta girdinin yalnızca parmak izi bulunur; işaretliyse verinin kendisi de girer ve kayıt tek başına yeniden üretilebilir. Seçim sayfadaki bütün JSON düğmeleri için geçerlidir ve bu tarayıcıda hatırlanır. Kaydı paylaşırsanız veriyi de paylaşmış olursunuz.</li>
<li>Parmak izi: dosyanın okunduğu hâliyle baytlarının SHA-256'sı; yapıştırılan tablo için metnin UTF-8 baytları; onaylanmış veri paketi için kanonik JSON biçimi (RFC 8785).</li>
</ul>
<h3>Doğrulama</h3>
<ul>
<li><b>Kayıt seç (.json)</b>: mühür denetlenir (kayıt indirildiğinden beri değişmiş mi), araç, sürüm, araç kimlikleri ve commit gösterilir; aracın sitedeki sürümü farklıysa bildirilir. Commit bağlantısı kaydı üreten kaynak koduna gider.</li>
<li><b>Girdiler</b> tablosu her girdinin rolünü, boyutunu, parmak izini ve okuma ayarlarını (kodlama, ayırıcı, başlık satırı, çalışma sayfası) gösterir. Kayıtta veri varsa parmak iziyle uyuştuğu denetlenir ve dosya indirilebilir.</li>
<li><b>Elinizdeki dosyaları denetleyin</b>: özgün veri dosyalarınızı seçin; her biri kayıttaki girdilerle karşılaştırılır. Tek bir bayt farkı eşleşmeyi bozar (ör. Excel'de açılıp yeniden kaydedilen CSV).</li>
<li>DI-07 öncesi indirilen JSON dosyaları da açılır: aracı, sürümü ve zamanı okunur; mühür ve parmak izi yoktur.</li>
</ul>
</section>
