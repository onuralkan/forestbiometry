<?php
require __DIR__ . '/../inc/common.php';
require __DIR__ . '/../inc/paper.php';
require __DIR__ . '/../inc/bench.php';
$c = paper_ctx(); $tr = $c['tr'];
bench_top([
    'title'  => $tr ? 'Çap Dağılımı Laboratuvarı' : 'Diameter Distribution Lab',
    'kicker' => $tr ? 'Araç 4 · Çap dağılımları · Weibull sürümü' : 'Tool 4 · Diameter distributions · Weibull version',
    'lede'   => $tr ? 'Tek ağaç çaplarına iki parametreli Weibull\'u en çok olabilirlik ve momentlerle, üç parametreli biçimi sizin sabitlediğiniz konumla uydurun; histogram, birikimli dağılım ve sınıf frekanslarını kuyruklarıyla birlikte görün. Eğri gezgini, veriden ayrı bir gösterimdir.'
                    : 'Fit the two-parameter Weibull to individual tree diameters by maximum likelihood and moments, and the three-parameter form with a location you fix; see the histogram, cumulative distribution and class frequencies with their tails. The curve explorer is a separate illustration.',
    'desc'   => $tr ? 'Weibull çap dağılımı: en çok olabilirlik ve moment tahmini, sabit konum, sınıf frekansları, örnek alan bazında uydurma.' : 'Weibull diameter distribution: maximum likelihood and moments, fixed location, class frequencies, per-plot fitting.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= $tr ? 'Bu araç JavaScript gerektirir.' : 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= $tr ? 'Adımlar' : 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
  <section id="explore" class="explore" aria-label="<?= $tr ? 'Eğri gezgini' : 'Curve explorer' ?>"></section>
<?php bench_bottom('<script type="module" src="../assets/lab/weibull/ui.js?v=2"></script>');
