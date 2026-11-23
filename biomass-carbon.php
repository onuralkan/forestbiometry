<?php
require __DIR__ . '/inc/site.php';
site_top([
    'title'  => 'Biomass and Carbon',
    'kicker' => 'Allometric biomass, expansion factors, carbon and CO₂',
    'lede'   => 'Component biomass, carbon and CO₂ equivalent from your tree data: allometric equations with your own coefficient sets or conversion from volume; Mg/ha per plot and period. The site contains no species coefficients, wood densities, expansion factors or carbon fractions.',
    'desc'   => 'Biomass and carbon: allometric equations (your coefficients, species mapping), conversion from volume (IPCC 2006), carbon and CO₂, Mg/ha per plot × period; in the browser, data stay with you.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
<?php site_bottom('<script type="module" src="assets/lab/biomass/ui.js"></script>');
