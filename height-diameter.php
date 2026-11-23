<?php
require __DIR__ . '/inc/site.php';
site_top([
    'title'  => 'Height–Diameter Modelling',
    'kicker' => 'Fixed-effects models',
    'lede'   => 'Fit six common height–diameter equations to measured heights by nonlinear least squares; see parameters, residuals and a comparison on the same trees, and test the models with plot-based cross-validation. Predictions for trees without a measured height go to a separate column; predictions outside the data range are flagged.',
    'desc'   => 'Height–diameter models: Näslund, Michailoff, Curtis, power, Chapman–Richards, Weibull; nonlinear fitting, cross-validation, prediction of missing heights.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
<?php site_bottom('<script type="module" src="assets/lab/hd/ui.js?v=3"></script>');
