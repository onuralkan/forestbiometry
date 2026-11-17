<section class="card guide-sec">
<?= $sec('sorun-giderme', 'Sorun giderme') ?>
<h3>Sayfa yüklenmiyor ya da yarım kalıyor</h3>
<p>Bazı ağlarda ve tarayıcılarda sayfa hiç açılmayabilir, boş ya da biçimsiz (stil dosyaları eksik) görünebilir, bir araç düğmelere tepki vermeyebilir. Tarayıcının geliştirici konsolunda (F12 → Console) <code>net::ERR_QUIC_PROTOCOL_ERROR</code> görüyorsanız sorun sitenin kodunda değil, tarayıcının sunucuyla konuşmak için kullandığı <b>QUIC</b> (HTTP/3) bağlantısındadır. QUIC UDP üzerinden çalışır; bazı kurum, okul ve otel ağları, güvenlik duvarları ya da VPN'ler bu trafiği keser ya da bozar. Tarayıcı çoğu zaman eski bağlantıya (HTTP/2, TCP) kendiliğinden döner, ama her zaman değil.</p>
<p>Önce şunları deneyin: sayfayı yeniden yükleyin (Ctrl+F5 / Cmd+Shift+R), başka bir ağdan (ör. telefonun mobil verisinden) açın ya da VPN'i kapatın. Sorun sürüyorsa tarayıcıda QUIC'i kapatın. Bu ayar bütün siteler için geçerlidir; tarayıcı yine güvenli HTTPS (HTTP/2) ile bağlanır, yalnızca bazı sitelerde bağlantı kurulumu biraz yavaşlayabilir. İstediğiniz zaman aynı yoldan geri açabilirsiniz.</p>
<h3>Chrome, Edge, Brave, Opera, Vivaldi (Chromium tabanlı)</h3>
<ol>
<li>Adres çubuğuna tarayıcınıza göre şunu yazıp Enter'a basın:
<ul>
<li>Chrome: <code>chrome://flags/#enable-quic</code></li>
<li>Edge: <code>edge://flags/#enable-quic</code></li>
<li>Brave: <code>brave://flags/#enable-quic</code></li>
<li>Opera: <code>opera://flags/#enable-quic</code></li>
<li>Vivaldi: <code>vivaldi://flags/#enable-quic</code></li>
</ul></li>
<li>Vurgulanan <b>Experimental QUIC protocol</b> satırındaki seçimi <b>Disabled</b> yapın.</li>
<li>Sayfanın altında çıkan <b>Relaunch</b> (Yeniden başlat) düğmesine basın. Açık sekmeler yeniden açılır.</li>
</ol>
<p>Android'deki Chrome'da da aynı adres (<code>chrome://flags/#enable-quic</code>) çalışır. Geri açmak için seçimi <b>Default</b> yapın. Bu "flags" sayfası deneysel ayarlar içindir; tarayıcının ileriki sürümlerinde ayarın adı değişebilir ya da kaldırılabilir.</p>
<h3>Firefox</h3>
<ol>
<li>Adres çubuğuna <code>about:config</code> yazın ve uyarıyı <b>Riski kabul et ve devam et</b> ile geçin.</li>
<li>Arama kutusuna <code>network.http.http3.enable</code> yazın (eski sürümlerde adı <code>network.http.http3.enabled</code>).</li>
<li>Satırın sağındaki değiştirme düğmesiyle değeri <b>false</b> yapın. Yeniden başlatma gerekmez; açık sekmeyi yenileyin.</li>
</ol>
<p>Geri açmak için değeri yeniden <b>true</b> yapın ya da satırdaki sıfırlama düğmesine basın.</p>
<h3>Safari ve iPhone/iPad'deki tarayıcılar</h3>
<p>Safari'de QUIC'i kapatmak için desteklenen bir ayar yoktur. iPhone ve iPad'de bütün tarayıcılar (Chrome ve Edge dahil) Safari'nin motorunu kullandığından orada da bu ayar bulunmaz. Bu cihazlarda başka bir ağ deneyin, VPN'i ya da iCloud Özel Geçiş'i (iCloud Private Relay) geçici olarak kapatın; Mac'te Chrome, Edge ya da Firefox'u yukarıdaki gibi ayarlayarak kullanabilirsiniz.</p>
<h3>Sorun sürerse</h3>
<p>Yukarıdakiler işe yaramazsa tarayıcınızın adını ve sürümünü, işletim sisteminizi, hangi ağdan bağlandığınızı ve konsoldaki hata iletisini bildirin. Sitedeki araçlar bir kez yüklendikten sonra hesapları tarayıcınızda yapar; bağlantı sorunu girdiğiniz verileri etkilemez, oturumunuz bu tarayıcıda saklanmaya devam eder.</p>
</section>
