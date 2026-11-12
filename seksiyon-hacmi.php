<?php
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];
site_top([
    'title'  => $tr ? 'Seksiyon Hacmi Hesaplayıcısı' : 'Stem Section Volume',
    'kicker' => $tr ? 'Araç 8 · Ağaç ve gövde · Seksiyon yöntemleri' : 'Tool 8 · Tree and stem · Section methods',
    'lede'   => $tr ? 'Ölçülmüş seksiyon çaplarından tek ağaç gövde hacmini Huber, Smalian, Newton ya da Hohenadl yöntemiyle hesaplayın: dip kütük ve uç seksiyon ayrı, kabuklu ve kabuksuz hacim ayrı, biçim sayısı ve isteğe bağlı kullanılabilir hacim; örnek alan büyüklüğü verilirse hektara toplam. Veri düzenini (ölçümlerin seksiyon uçlarında mı ortalarında mı alındığı) siz seçersiniz.'
                    : 'Compute single-tree stem volume from measured section diameters by the Huber, Smalian, Newton or Hohenadl method: stump and top piece apart, over and under bark apart, form factor and optional merchantable volume; per-hectare totals when plot sizes are given. You choose the data layout (whether diameters were taken at section ends or middles).',
    'desc'   => $tr ? 'Seksiyon hacmi: Huber, Smalian, Newton, Hohenadl; dip kütük, uç seksiyon (koni, paraboloit, neiloit), kabuklu ve kabuksuz hacim, biçim sayısı, kullanılabilir hacim, hektara genişletme.' : 'Stem section volume: Huber, Smalian, Newton, Hohenadl; stump, top piece (cone, paraboloid, neiloid), over- and under-bark volume, form factor, merchantable volume, per-hectare totals.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= $tr ? 'Bu araç JavaScript gerektirir.' : 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= $tr ? 'Adımlar' : 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
<?php site_bottom('<script type="module" src="assets/lab/secvol/ui.js?v=2"></script>');
