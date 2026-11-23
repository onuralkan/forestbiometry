<?php
require __DIR__ . '/inc/site.php';
site_top([
    'title'  => 'Coefficient Library',
    'kicker' => 'Coefficient and equation library',
    'lede'   => 'See, search, edit, copy and delete the coefficient sets of every tool in one place; find sets saved twice with the same coefficients and sets with problems; back up and restore the whole library in one file. The site ships no coefficients.',
    'desc'   => 'Coefficient and equation library: the coefficient sets of ten tools (Site Index, Growth Functions, Stem Taper, Biomass and Carbon, Volume Equations, Nonlinear Regression, Mixed-Effects Models, Systems of Equations, Stand Structure: CCF, Tree Measurement: bark); search, sources, duplicate and problem checks, backup and restore.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= 'This tool needs JavaScript.' ?></p></noscript>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <div id="app" class="wide"></div>
<?php site_bottom('<script type="module" src="assets/lab/coeflib/ui.js"></script>');
