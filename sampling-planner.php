<?php
require __DIR__ . '/inc/site.php';
site_top([
    'title'  => 'Inventory Sampling Planner',
    'kicker' => 'Simple random sampling',
    'lede'   => 'From plot-level pilot measurements or a coefficient of variation you know, compute about how many plots are needed to estimate a mean with the relative error you aim for. The approach, the assumptions and other error targets are reported.',
    'desc'   => 'Number of plots for a mean under simple random sampling: n₀ = z²(CV/E)², optional finite-frame correction.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= 'This tool needs JavaScript.' ?></p></noscript>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <div id="app" class="planner"></div>
<?php site_bottom('<script type="module" src="assets/lab/sampling/ui.js?v=3"></script>');
