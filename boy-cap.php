<?php
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];
site_top([
    'title'  => $tr ? 'Boy–Çap Modelleme' : 'Height–Diameter Modelling',
    'kicker' => $tr ? 'Araç 5 · Boy–çap ilişkisi · Sabit etkili modeller' : 'Tool 5 · Height–diameter relationship · Fixed-effects models',
    'lede'   => $tr ? 'Ölçülen boylara altı yaygın boy–çap denklemini doğrusal olmayan en küçük karelerle uydurun; parametreleri, artıkları ve aynı ağaçlar üzerindeki karşılaştırmayı görün, modelleri örnek alan bazında çapraz doğrulamayla sınayın. Boyu ölçülmemiş ağaçlar için tahmin ayrı bir sütuna yazılır; veri aralığı dışındaki tahminler işaretlenir.'
                    : 'Fit six common height–diameter equations to measured heights by nonlinear least squares; see parameters, residuals and a comparison on the same trees, and test the models with plot-based cross-validation. Predictions for trees without a measured height go to a separate column; predictions outside the data range are flagged.',
    'desc'   => $tr ? 'Boy–çap modelleri: Näslund, Michailoff, Curtis, kuvvet, Chapman–Richards, Weibull; doğrusal olmayan uydurma, çapraz doğrulama, eksik boy tahmini.' : 'Height–diameter models: Näslund, Michailoff, Curtis, power, Chapman–Richards, Weibull; nonlinear fitting, cross-validation, prediction of missing heights.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= $tr ? 'Bu araç JavaScript gerektirir.' : 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= $tr ? 'Adımlar' : 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
<?php site_bottom('<script type="module" src="assets/lab/hd/ui.js?v=2"></script>');
