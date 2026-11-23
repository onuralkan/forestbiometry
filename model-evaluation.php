<?php
require __DIR__ . '/inc/site.php';
site_top([
    'title'  => 'Model Evaluation',
    'kicker' => 'Model validation',
    'lede'   => 'Compare observed values with the predictions of one or more models: bias, MAE, RMSE and prediction R²; observed–predicted and residual plots, tables by plot, species, diameter class and validation fold. The error sign is e = observed − predicted everywhere.',
    'desc'   => 'Bias, MAE, RMSE, R², plots and group tables from observed and predicted values.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
<?php site_bottom('<script type="module" src="assets/lab/eval/ui.js?v=2"></script>');
