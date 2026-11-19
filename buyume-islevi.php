<?php
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];
site_top([
    'title'  => $tr ? 'Büyüme Fonksiyonu Fit Etme' : 'Growth Function Fitter',
    'kicker' => $tr ? 'Büyüme fonksiyonları' : 'Growth functions',
    'lede'   => $tr ? 'Kendi yaş–büyüklük verinize (boy, çap, hacim) Chapman–Richards, Schumacher, Gompertz, lojistik, monomoleküler ve Weibull büyüme fonksiyonlarını fit edin; modelleri karşılaştırın, cari yıllık ve ortalama yıllık artımı, dönüm noktası yaşını ve ortalama yıllık artımın doruk yaşını görün.'
                    : 'Fit Chapman–Richards, Schumacher, Gompertz, logistic, monomolecular and Weibull growth functions to your own age–size data (height, diameter, volume); compare the models, see the current and mean annual increment, the inflection point and the culmination of the mean annual increment.',
    'desc'   => $tr ? 'Büyüme fonksiyonu fit etme: Chapman–Richards, Schumacher, Gompertz, lojistik, monomoleküler, Weibull; model karşılaştırması, CAI, MAI, dönüm noktası yaşı, MAI doruk yaşı.'
                    : 'Growth function fitting: Chapman–Richards, Schumacher, Gompertz, logistic, monomolecular, Weibull; model comparison, CAI, MAI, inflection point, MAI culmination.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= $tr ? 'Bu araç JavaScript gerektirir.' : 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= $tr ? 'Adımlar' : 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
<?php site_bottom('<script type="module" src="assets/lab/growth/ui.js"></script>');
