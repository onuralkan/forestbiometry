<?php
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];
site_top([
    'title'  => $tr ? 'Hacim Denklemleri' : 'Volume Equations',
    'kicker' => $tr ? 'Ağaç hacim denklemi fit etme' : 'Fitting tree volume equations',
    'lede'   => $tr ? 'Hacmi bilinen ağaçlarınızdan (D, H, V) standart ve yerel hacim denklemleri fit edin: sabit biçim sayısı, birleşik değişken, logaritmik ve yerel biçimler; ağırlıklı en küçük kareler ve geri dönüşüm düzeltmesi seçimlik. Site hazır katsayı içermez.'
                    : 'Fit standard and local volume equations to your trees of known volume (D, H, V): constant form factor, combined variable, logarithmic and local forms; weighted least squares and back-transformation correction optional. The site ships no coefficients.',
    'desc'   => $tr ? 'Hacim denklemi fit etme: V = b1·D²H, V = b0 + b1·D²H, ln V = ln b1 + b2 ln D + b3 ln H, yerel denklemler; tarayıcıda, veri sunucuya gitmez.'
                    : 'Volume equation fitting: V = b1·D²H, V = b0 + b1·D²H, ln V = ln b1 + b2 ln D + b3 ln H, local equations; in the browser, data stay with you.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= $tr ? 'Bu araç JavaScript gerektirir.' : 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= $tr ? 'Adımlar' : 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
<?php site_bottom('<script type="module" src="assets/lab/volume/ui.js"></script>');
