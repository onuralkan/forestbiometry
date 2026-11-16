<?php
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];
site_top([
    'title'  => $tr ? 'Katsayı Kütüphanesi' : 'Coefficient Library',
    'kicker' => $tr ? 'Katsayı ve denklem kütüphanesi' : 'Coefficient and equation library',
    'lede'   => $tr ? 'Bütün araçlardaki katsayı setlerinizi tek yerde görün, arayın, düzenleyin, kopyalayın ve silin; aynı katsayılarla iki kez kaydedilmiş setleri ve sorunlu setleri bulun; kütüphanenin tamamını tek dosyayla yedekleyip geri yükleyin. Site hazır katsayı vermez.'
                    : 'See, search, edit, copy and delete the coefficient sets of every tool in one place; find sets saved twice with the same coefficients and sets with problems; back up and restore the whole library in one file. The site ships no coefficients.',
    'desc'   => $tr ? 'Katsayı ve denklem kütüphanesi: bonitet, büyüme işlevi ve gövde profili katsayı setleri; arama, kaynak, tekrar ve sorun denetimi, yedekleme ve geri yükleme.'
                    : 'Coefficient and equation library: site index, growth function and taper coefficient sets; search, sources, duplicate and problem checks, backup and restore.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= $tr ? 'Bu araç JavaScript gerektirir.' : 'This tool needs JavaScript.' ?></p></noscript>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <div id="app" class="wide"></div>
<?php site_bottom('<script type="module" src="assets/lab/coeflib/ui.js"></script>');
