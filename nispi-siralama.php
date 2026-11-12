<?php
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];
site_top([
    'title'  => $tr ? 'Nispi Sıralama' : 'Relative Ranking',
    'kicker' => $tr ? 'Model karşılaştırma' : 'Model comparison',
    'lede'   => $tr ? 'Modellerinizin başarı ölçütleri tablosunu (R², FI, RMSE, MAE, Bias, AIC, BIC…) yükleyin; her ölçüt için ve genel olarak nispi sıraları (Poudel ve Cao 2013) hesaplayın, radar grafiğinde en iyi ve en kötü modelleri karşılaştırın.'
                    : 'Upload the goodness-of-fit table of your models (R², FI, RMSE, MAE, Bias, AIC, BIC…); compute relative ranks per criterion and overall (Poudel and Cao 2013) and compare the best and worst models on a radar chart.',
    'desc'   => $tr ? 'Başarı ölçütlerinden nispi sıralama ve radar grafiği.' : 'Relative ranking and radar chart from goodness-of-fit statistics.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= $tr ? 'Bu araç JavaScript gerektirir.' : 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= $tr ? 'Adımlar' : 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
<?php site_bottom('<script type="module" src="assets/lab/rank/ui.js?v=2"></script>');
