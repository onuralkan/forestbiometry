<?php
require __DIR__ . '/inc/site.php';
site_top([
    'title'  => 'Systems of Equations',
    'kicker' => 'Seemingly unrelated regression (SUR) and compatible systems',
    'lede'   => 'Fit several related equations together: your own formulas, coefficients shared between equations (compatible systems), OLS, SUR and iterated SUR; equation and system fit measures. The site ships no coefficients.',
    'desc'   => 'Systems of equations: linear and nonlinear SUR (FGLS), iterated SUR, cross-equation restrictions, McElroy R²; in the browser, data stay with you.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
<?php site_bottom('<script type="module" src="assets/lab/eqsys/ui.js"></script>');
