<?php
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];
site_top([
    'title'  => $tr ? 'Denklem Sistemleri' : 'Systems of Equations',
    'kicker' => $tr ? 'Görünüşte ilişkisiz regresyon (SUR) ve uyumlu sistemler' : 'Seemingly unrelated regression (SUR) and compatible systems',
    'lede'   => $tr ? 'Birbiriyle ilişkili birden çok denklemi birlikte uydurun: kendi formülleriniz, denklemler arasında ortak katsayılar (uyumlu sistemler), OLS, SUR ve yinelemeli SUR; denklem ve sistem uyum ölçütleri. Site hazır katsayı içermez.'
                    : 'Fit several related equations together: your own formulas, coefficients shared between equations (compatible systems), OLS, SUR and iterated SUR; equation and system fit measures. The site ships no coefficients.',
    'desc'   => $tr ? 'Denklem sistemleri: doğrusal ve doğrusal olmayan SUR (FGLS), yinelemeli SUR, denklemler arası kısıtlar, McElroy R²; tarayıcıda, veri sunucuya gitmez.'
                    : 'Systems of equations: linear and nonlinear SUR (FGLS), iterated SUR, cross-equation restrictions, McElroy R²; in the browser, data stay with you.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= $tr ? 'Bu araç JavaScript gerektirir.' : 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= $tr ? 'Adımlar' : 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
<?php site_bottom('<script type="module" src="assets/lab/eqsys/ui.js"></script>');
