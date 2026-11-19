<?php
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];
site_top([
    'title'  => $tr ? 'Meşcere Yapısı ve Rekabet' : 'Stand Structure & Competition',
    'kicker' => $tr ? 'Yapı, sıklık ve rekabet endeksleri' : 'Structure, density and competition indices',
    'lede'   => $tr ? 'Her örnek alan ve dönem için çap yapısı (CV: değişim katsayısı, çarpıklık, Gini, Lorenz), çeşitlilik (Shannon, Simpson), sıklık (SDI, Curtis RD, göreli aralık, CCF) ve ağaç düzeyinde BAL; koordinatlar varsa mekânsal yapı (Clark–Evans; W düzenli açı, M karışım, T çap farklılaşma ve U baskınlık endeksleri) ve Hegyi rekabet endeksi, seçilen kenar etkisi düzeltmesiyle.'
                    : 'For every plot and period: diameter structure (CV, skewness, Gini, Lorenz), diversity (Shannon, Simpson), density (SDI, Curtis RD, relative spacing, CCF) and tree-level BAL; with coordinates, the spatial structure (Clark–Evans, W, M, T, U) and the Hegyi competition index, with the edge correction you choose.',
    'desc'   => $tr ? 'Meşcere yapısı ve rekabet: çap yapısı, Gini ve Lorenz, Shannon ve Simpson, SDI, Curtis RD, göreli aralık, CCF, BAL, Clark–Evans, düzenli açı (W), karışım (M), çap farklılaşma (T), baskınlık (U) ve Hegyi.'
                    : 'Stand structure and competition: diameter structure, Gini and Lorenz, Shannon and Simpson, SDI, Curtis RD, relative spacing, CCF, BAL, Clark–Evans, W, M, T, U and Hegyi.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= $tr ? 'Bu araç JavaScript gerektirir.' : 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= $tr ? 'Adımlar' : 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
<?php site_bottom('<script type="module" src="assets/lab/structure/ui.js"></script>');
