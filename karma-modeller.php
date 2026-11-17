<?php
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];
site_top([
    'title'  => $tr ? 'Karma Etkili Modeller' : 'Mixed-Effects Models',
    'kicker' => $tr ? 'Doğrusal ve doğrusal olmayan karma modeller' : 'Linear and nonlinear mixed models',
    'lede'   => $tr ? 'Gruplanmış verinize (ör. örnek alanlardaki ağaçlar) doğrusal ve doğrusal olmayan karma etkili modeller fit edin: grup başına rastgele etkiler, ML ya da REML, varyans ve kovaryans yapıları, AIC/BIC ve olabilirlik oranı testi; yeni bir grubu birkaç ölçümle kalibre edin. Site hazır katsayı içermez.'
                    : 'Fit linear and nonlinear mixed-effects models to your grouped data (e.g. trees in plots): random effects per group, ML or REML, variance and covariance structures, AIC/BIC and the likelihood-ratio test; calibrate a new group from a few measurements. The site ships no coefficients.',
    'desc'   => $tr ? 'Karma etkili modeller: doğrusal (LME) ve doğrusal olmayan (NLME, Lindstrom–Bates), ML/REML, varPower, rastgele etki kovaryansı, yeni örnek alan kalibrasyonu; tarayıcıda, veri sunucuya gitmez.'
                    : 'Mixed-effects models: linear (LME) and nonlinear (NLME, Lindstrom–Bates), ML/REML, varPower, random-effect covariance, calibration of a new plot; in the browser, data stay with you.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= $tr ? 'Bu araç JavaScript gerektirir.' : 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= $tr ? 'Adımlar' : 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
<?php site_bottom('<script type="module" src="assets/lab/mixed/ui.js"></script>');
