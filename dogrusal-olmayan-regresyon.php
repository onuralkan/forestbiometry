<?php
require __DIR__ . '/inc/site.php';
site_top([
    'title'  => 'Nonlinear Regression',
    'kicker' => 'Ready-made forms and free formulas',
    'lede'   => 'Fit nonlinear models to your own data: ready-made growth and power forms or a formula you write; weighted least squares, coefficient confidence intervals, mean and new-observation intervals, models compared on the same data. The site ships no coefficients.',
    'desc'   => 'Nonlinear regression (NLS): Chapman–Richards, Schumacher, Gompertz, logistic, Weibull, power forms or a free formula; weighted fitting, intervals, AIC; in the browser, data stay with you.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
<?php site_bottom('<script type="module" src="assets/lab/nlsreg/ui.js"></script>');
