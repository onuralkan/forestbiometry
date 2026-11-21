<?php
require __DIR__ . '/inc/site.php';
site_top([
    'title'  => 'Data Visualization',
    'kicker' => 'Data visualization',
    'lede'   => 'See an approved data package on one page; narrow it with filters; draw the diameter densities and height curves of the tools\' run records over the data.',
    'desc'   => 'Data visualization: diameter distribution, species composition, N/ha, G/ha, height–diameter and tree map; period, stratum, species and plot filters; curves from run records; in the browser, data stay with you.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= 'This tool needs JavaScript.' ?></p></noscript>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <div id="app" class="wide"></div>
<?php site_bottom('<script type="module" src="assets/lab/dashboard/ui.js"></script>');
