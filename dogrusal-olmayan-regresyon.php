<?php
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];
site_top([
    'title'  => $tr ? 'Doğrusal Olmayan Regresyon' : 'Nonlinear Regression',
    'kicker' => $tr ? 'Hazır biçimler ve serbest formüller' : 'Ready-made forms and free formulas',
    'lede'   => $tr ? 'Kendi verinize doğrusal olmayan modeller fit edin: hazır büyüme ve kuvvet biçimleri ya da kendi yazdığınız formül; ağırlıklı en küçük kareler, katsayı güven aralıkları, ortalama ve yeni gözlem aralıkları, modellerin aynı veride karşılaştırılması. Site hazır katsayı içermez.'
                    : 'Fit nonlinear models to your own data: ready-made growth and power forms or a formula you write; weighted least squares, coefficient confidence intervals, mean and new-observation intervals, models compared on the same data. The site ships no coefficients.',
    'desc'   => $tr ? 'Doğrusal olmayan regresyon (NLS): Chapman–Richards, Schumacher, Gompertz, lojistik, Weibull, kuvvet biçimleri ya da serbest formül; ağırlıklı fit etme, aralıklar, AIC; tarayıcıda, veri sunucuya gitmez.'
                    : 'Nonlinear regression (NLS): Chapman–Richards, Schumacher, Gompertz, logistic, Weibull, power forms or a free formula; weighted fitting, intervals, AIC; in the browser, data stay with you.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= $tr ? 'Bu araç JavaScript gerektirir.' : 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= $tr ? 'Adımlar' : 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
<?php site_bottom('<script type="module" src="assets/lab/nlsreg/ui.js"></script>');
