<?php
require __DIR__ . '/inc/site.php';
site_top([
    'title'  => 'Stand Structure & Competition',
    'kicker' => 'Structure, density and competition indices',
    'lede'   => 'For every plot and period: diameter structure (CV, skewness, Gini, Lorenz), diversity (Shannon, Simpson), density (SDI, Curtis RD, relative spacing, CCF) and tree-level BAL; with coordinates, the spatial structure (Clark–Evans, W, M, T, U) and the Hegyi competition index, with the edge correction you choose.',
    'desc'   => 'Stand structure and competition: diameter structure, Gini and Lorenz, Shannon and Simpson, SDI, Curtis RD, relative spacing, CCF, BAL, Clark–Evans, W, M, T, U and Hegyi.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
<?php site_bottom('<script type="module" src="assets/lab/structure/ui.js"></script>');
