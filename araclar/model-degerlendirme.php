<?php
require __DIR__ . '/../inc/common.php';
require __DIR__ . '/../inc/paper.php';
require __DIR__ . '/../inc/bench.php';
$c = paper_ctx(); $tr = $c['tr'];
bench_top([
    'title'  => $tr ? 'Model Başarısı Değerlendiricisi' : 'Model Evaluation',
    'kicker' => $tr ? 'Araç 3 · Model doğrulama' : 'Tool 3 · Model validation',
    'lede'   => $tr ? 'Gözlenen değerleri bir veya daha fazla modelin tahminleriyle karşılaştırın: yanlılık, MAE, RMSE ve tahmin R²; gözlenen–tahmin ve artık grafikleri, örnek alan, tür, çap sınıfı ve doğrulama katına göre tablolar. Hata işareti her yerde e = tahmin − gözlenen.'
                    : 'Compare observed values with the predictions of one or more models: bias, MAE, RMSE and prediction R²; observed–predicted and residual plots, tables by plot, species, diameter class and validation fold. The error sign is e = predicted − observed everywhere.',
    'desc'   => $tr ? 'Gözlenen ve tahmin edilen değerlerden yanlılık, MAE, RMSE, R², grafikler ve grup tabloları.' : 'Bias, MAE, RMSE, R², plots and group tables from observed and predicted values.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= $tr ? 'Bu araç JavaScript gerektirir.' : 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= $tr ? 'Adımlar' : 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
<?php bench_bottom('<script type="module" src="../assets/lab/eval/ui.js?v=1"></script>');
