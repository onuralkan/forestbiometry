<?php
require __DIR__ . '/inc/site.php';
site_top([
    'title'  => 'Site Index',
    'kicker' => 'Dynamic site index equations',
    'lede'   => 'Compute the site index at a base age and a site class you define from top height and age, with your own coefficient set (and its source); see the curve family. You can also fit the coefficients to your own stem analyses or repeated measurements; confidence intervals come from a bootstrap or the covariance matrix of the source. The tool contains no species or regional coefficients and no yield table. From approved tree data the top height is computed with the same definition as the Plot & Stand tool.',
    'desc'   => 'Site index: Chapman–Richards (anamorphic, polymorphic) and Schumacher difference equations, base age, age type, user-defined classes, curve family, fitting to your own data, confidence intervals.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
<?php site_bottom('<script type="module" src="assets/lab/siteindex/ui.js?v=2"></script>');
