<?php
require __DIR__ . '/inc/site.php';
site_top([
    'title'  => 'Plot & Stand Metrics',
    'kicker' => 'Forest inventory',
    'lede'   => 'From your approved data, for every plot and measurement period: stems and basal area per hectare, arithmetic and quadratic mean diameter, diameter class distribution and species composition. The descriptive between-plot summary and the design-based forest estimate are kept apart.',
    'desc'   => 'N, G, mean diameter, Dq, diameter classes, species composition and design-based forest estimates from fixed-area plots.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
<?php site_bottom('<script type="module" src="assets/lab/stand/ui.js?v=4"></script>');
