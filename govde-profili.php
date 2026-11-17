<?php
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];
site_top([
    'title'  => $tr ? 'Gövde Profili' : 'Stem Taper',
    'kicker' => $tr ? 'Gövde profili denklemleri' : 'Taper equations',
    'lede'   => $tr ? 'Kendi katsayı setinizle (kaynağıyla) ya da gövde ölçümlerinize fit ettiğiniz profil denklemiyle herhangi bir yükseklikteki çapı, bir çapın yüksekliğini, toplam hacmi ve tepe çapına kadar kullanılabilir hacmi hesaplayın, gövdeyi kendi ürünlerinize en yüksek değerle bölün; kabuklu ve kabuksuz profili birlikte görün.'
                    : 'With your own coefficient set (and its source), or a taper equation fitted to your stem measurements, compute the diameter at any height, the height of a diameter, the total volume and the merchantable volume to a top diameter, and buck the stem into your own products for the highest value; see the outside- and inside-bark profiles together.',
    'desc'   => $tr ? 'Gövde profili: Max ve Burkhart (1976) ve Kozak (2004) denklemleri, katsayı kütüphanesi, gövde ölçümlerine fit etme, toplam ve kullanılabilir hacim, profil grafiği, ürün bölme (dinamik programlama).'
                    : 'Stem taper: Max and Burkhart (1976) and Kozak (2004) equations, coefficient library, fitting to stem measurements, total and merchantable volume, profile chart, product bucking (dynamic programming).',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= $tr ? 'Bu araç JavaScript gerektirir.' : 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= $tr ? 'Adımlar' : 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
<?php site_bottom('<script type="module" src="assets/lab/taper/ui.js"></script>');
