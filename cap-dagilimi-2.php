<?php
// Development page of the new diameter distribution engine (docs/DIST_SPEC.md). Not listed in the tool index,
// not indexed by search engines; it replaces cap-dagilimi.php when stage P15 is accepted.
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];
site_top([
    'title'  => $tr ? 'Çap Dağılımı Laboratuvarı (geliştirme sürümü)' : 'Diameter Distribution Lab (development version)',
    'kicker' => $tr ? 'Çap dağılımları · yeni motor · geliştirme' : 'Diameter distributions · new engine · development',
    'lede'   => $tr ? 'Yeni dağılım motorunun aşamalı kurulumu. Şimdilik Weibull (en çok olabilirlik, momentler, iki yüzdelik; konum sabit), normal, lognormal ve gamma (en çok olabilirlik, momentler; özetlerden geri kazanım), sabit sınırlı beta (en çok olabilirlik, momentler). Diğer dağılımlar bağımsız referanslarla sınandıkça eklenecek.'
                    : 'Staged build of the new distribution engine. For now the Weibull (maximum likelihood, moments, two percentiles; fixed location), the normal, the lognormal and the gamma (maximum likelihood, moments; recovery from summaries), the beta with fixed bounds (maximum likelihood, moments). Other distributions are added as they pass independent reference checks.',
    'desc'   => $tr ? 'Çap dağılımı aracı, geliştirme sürümü.' : 'Diameter distribution tool, development version.',
    'robots' => 'noindex, nofollow',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= $tr ? 'Bu araç JavaScript gerektirir.' : 'This tool needs JavaScript.' ?></p></noscript>
  <div id="wf"></div>
  <nav class="steps" id="steps" aria-label="<?= $tr ? 'Adımlar' : 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
  <section id="recover" class="step" hidden></section>
<?php site_bottom('<script type="module" src="assets/lab/dist/ui.js?v=5"></script>');
