<?php
// Diameter Distribution Lab on the new engine (assets/lab/dist/, docs/DIST_SPEC.md). Published at stage P08 by the
// user's decision (10 November 2026); the Weibull-only 1.0.0 tool is kept in legacy/weibull/ (not uploaded).
require __DIR__ . '/inc/site.php';
site_top([
    'title'  => 'Diameter Distribution Lab',
    'kicker' => 'Diameter distributions',
    'lede'   => 'Fit eight probability distributions to individual tree diameters or diameter classes, or recover their parameters from summary values; each plot and period is computed separately.',
    'desc'   => 'Diameter distributions: Weibull, normal, lognormal, gamma, beta, Johnson SB, exponential, log-logistic; maximum likelihood, moments, percentiles; recovery from summaries.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= 'This tool needs JavaScript.' ?></p></noscript>
  <div id="wf"></div>
  <nav class="steps" id="steps" aria-label="<?= 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
  <section id="recover" class="step" hidden></section>
  <section id="standwf" class="step" hidden></section>
<?php
// the shell's boot watchdog (site_bottom) warns if the module tree does not load
site_bottom(''
  . '<script type="module" src="assets/lab/dist/ui.js?v=28"></script>');
