<?php
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];
site_top([
    'title'  => $tr ? 'Biyokütle ve Karbon' : 'Biomass and Carbon',
    'kicker' => $tr ? 'Allometrik biyokütle, biyokütle genişletme faktörleri, karbon ve CO₂' : 'Allometric biomass, expansion factors, carbon and CO₂',
    'lede'   => $tr ? 'Ağaç verinizden bileşen biyokütlesi, karbon ve CO₂ eşdeğeri: kendi katsayı setlerinizle allometrik denklemler ya da hacimden dönüşüm; örnek alan ve dönem başına Mg/ha. Site hiçbir tür katsayısı, odun yoğunluğu, genişletme faktörü ya da karbon oranı içermez.'
                    : 'Component biomass, carbon and CO₂ equivalent from your tree data: allometric equations with your own coefficient sets or conversion from volume; Mg/ha per plot and period. The site contains no species coefficients, wood densities, expansion factors or carbon fractions.',
    'desc'   => $tr ? 'Biyokütle ve karbon: allometrik denklemler (kendi katsayılarınız, tür eşlemesi), hacimden dönüşüm (IPCC 2006), karbon ve CO₂, örnek alan × dönem Mg/ha; tarayıcıda, veri sunucuya gitmez.'
                    : 'Biomass and carbon: allometric equations (your coefficients, species mapping), conversion from volume (IPCC 2006), carbon and CO₂, Mg/ha per plot × period; in the browser, data stay with you.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= $tr ? 'Bu araç JavaScript gerektirir.' : 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= $tr ? 'Adımlar' : 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
<?php site_bottom('<script type="module" src="assets/lab/biomass/ui.js"></script>');
