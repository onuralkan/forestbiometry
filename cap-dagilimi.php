<?php
// Diameter Distribution Lab on the new engine (assets/lab/dist/, docs/DIST_SPEC.md). Published at stage P08 by the
// user's decision (10 November 2026); the Weibull-only 1.0.0 tool is kept in legacy/weibull/ (not uploaded).
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];
site_top([
    'title'  => $tr ? 'Çap Dağılımı Laboratuvarı' : 'Diameter Distribution Lab',
    'kicker' => $tr ? 'Araç 4 · Çap dağılımları' : 'Tool 4 · Diameter distributions',
    'lede'   => $tr ? 'Tek ağaç çaplarına Weibull, normal, lognormal, gamma, sabit sınırlı beta, Johnson SB, üstel ve log-lojistik dağılımlarını uydurun; her örnek alan ve dönem ayrı. Ortalama ile varyans ya da Dq\'dan parametre geri kazanımı ve Weibull için Poudel ve Cao (2013) M2–M10 yöntemleri ayrı bir iş akışıdır. Araç aşamalı olarak genişletiliyor.'
                    : 'Fit the Weibull, normal, lognormal, gamma, fixed-bound beta, Johnson SB, exponential and log-logistic distributions to individual tree diameters, each plot and period separately. Parameter recovery from the mean and the variance or Dq, and the Poudel and Cao (2013) M2–M10 methods for the Weibull, are a separate workflow. The tool is being extended in stages.',
    'desc'   => $tr ? 'Çap dağılımları: Weibull, normal, lognormal, gamma, beta, Johnson SB, üstel, log-lojistik; en çok olabilirlik, momentler, yüzdelikler; özetlerden geri kazanım.' : 'Diameter distributions: Weibull, normal, lognormal, gamma, beta, Johnson SB, exponential, log-logistic; maximum likelihood, moments, percentiles; recovery from summaries.',
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
<?php site_bottom('<script type="module" src="assets/lab/dist/ui.js?v=17"></script>');
