<?php
require __DIR__ . '/inc/site.php';
site_top([
    'title'  => 'Stem Section Volume',
    'kicker' => 'Section methods',
    'lede'   => 'Compute single-tree stem volume from measured section diameters by the Huber, Smalian, Newton or Hohenadl method: stump and top piece apart, over and under bark apart, form factor and optional merchantable volume; per-hectare totals when plot sizes are given. You choose the data layout (whether diameters were taken at section ends or middles).',
    'desc'   => 'Stem section volume: Huber, Smalian, Newton, Hohenadl; stump, top piece (cone, paraboloid, neiloid), over- and under-bark volume, form factor, merchantable volume, per-hectare totals.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
<?php site_bottom('<script type="module" src="assets/lab/secvol/ui.js?v=2"></script>');
