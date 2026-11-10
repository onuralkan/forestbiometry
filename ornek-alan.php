<?php
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];
site_top([
    'title'  => $tr ? 'Örnek Alan ve Meşcere Hesaplayıcısı' : 'Plot & Stand Metrics',
    'kicker' => $tr ? 'Araç 2 · Orman envanteri' : 'Tool 2 · Forest inventory',
    'lede'   => $tr ? 'Onaylanmış verinizden her örnek alan ve ölçüm dönemi için hektardaki ağaç sayısı, göğüs yüzeyi, ortalama ve kuadratik ortalama çap, çap sınıfı dağılımı ve tür katılımı. Örnek alanlar arası betimsel özet ile orman için tasarıma dayalı tahmin ayrı tutulur.'
                    : 'From your approved data, for every plot and measurement period: stems and basal area per hectare, arithmetic and quadratic mean diameter, diameter class distribution and species composition. The descriptive between-plot summary and the design-based forest estimate are kept apart.',
    'desc'   => $tr ? 'Sabit alanlı örnek alanlardan hektarda N, G, ortalama çap, Dq, çap sınıfları, tür katılımı ve tasarıma dayalı orman tahmini.'
                    : 'N, G, mean diameter, Dq, diameter classes, species composition and design-based forest estimates from fixed-area plots.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= $tr ? 'Bu araç JavaScript gerektirir.' : 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= $tr ? 'Adımlar' : 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
<?php site_bottom('<script type="module" src="assets/lab/stand/ui.js?v=3"></script>');
