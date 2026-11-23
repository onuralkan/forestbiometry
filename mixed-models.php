<?php
require __DIR__ . '/inc/site.php';
site_top([
    'title'  => 'Mixed-Effects Models',
    'kicker' => 'Linear and nonlinear mixed models',
    'lede'   => 'Fit linear and nonlinear mixed-effects models to your grouped data (e.g. trees in plots): random effects per group, ML or REML, variance and covariance structures, AIC/BIC and the likelihood-ratio test; calibrate a new group from a few measurements. The site ships no coefficients.',
    'desc'   => 'Mixed-effects models: linear (LME) and nonlinear (NLME, Lindstrom–Bates), ML/REML, varPower, random-effect covariance, calibration of a new plot; in the browser, data stay with you.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
<?php site_bottom('<script type="module" src="assets/lab/mixed/ui.js"></script>');
