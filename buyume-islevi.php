<?php
require __DIR__ . '/inc/site.php';
site_top([
    'title'  => 'Growth Function Fitter',
    'kicker' => 'Growth functions',
    'lede'   => 'Fit Chapman–Richards, Schumacher, Gompertz, logistic, monomolecular and Weibull growth functions to your own age–size data (height, diameter, volume); compare the models, see the current and mean annual increment, the inflection point and the culmination of the mean annual increment.',
    'desc'   => 'Growth function fitting: Chapman–Richards, Schumacher, Gompertz, logistic, monomolecular, Weibull; model comparison, CAI, MAI, inflection point, MAI culmination.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
<?php site_bottom('<script type="module" src="assets/lab/growth/ui.js"></script>');
