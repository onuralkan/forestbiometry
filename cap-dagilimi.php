<?php
// Diameter Distribution Lab on the new engine (assets/lab/dist/, docs/DIST_SPEC.md). Published at stage P08 by the
// user's decision (10 November 2026); the Weibull-only 1.0.0 tool is kept in legacy/weibull/ (not uploaded).
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];
site_top([
    'title'  => $tr ? 'Çap Dağılımı Laboratuvarı' : 'Diameter Distribution Lab',
    'kicker' => $tr ? 'Araç 4 · Çap dağılımları' : 'Tool 4 · Diameter distributions',
    'lede'   => $tr ? 'Tek ağaç çaplarına Weibull, normal, lognormal, gamma, sabit sınırlı beta, Johnson SB, üstel ve log-lojistik dağılımlarını uydurun; her örnek alan ve dönem ayrı. Ortalama ile varyans ya da Dq\'dan parametre geri kazanımı Weibull için Poudel ve Cao (2013) M2–M10 ve Johnson SB için Parresol (2003) yöntemleri ayrı bir iş akışıdır. Sonuçlar ölçüm eşiğine, çap sınıflarına, model karşılaştırmasına ve bootstrap belirsizliğine kadar uzanır; Excel, CSV ve JSON olarak indirilir.'
                    : 'Fit the Weibull, normal, lognormal, gamma, fixed-bound beta, Johnson SB, exponential and log-logistic distributions to individual tree diameters, each plot and period separately. Parameter recovery from the mean and the variance or Dq, the Poudel and Cao (2013) M2–M10 methods for the Weibull and the Parresol (2003) method for the Johnson SB are a separate workflow. Results extend to measurement thresholds, diameter classes, model comparison and bootstrap uncertainty, and can be downloaded as Excel, CSV and JSON.',
    'desc'   => $tr ? 'Çap dağılımları: Weibull, normal, lognormal, gamma, beta, Johnson SB, üstel, log-lojistik; en çok olabilirlik, momentler, yüzdelikler; özetlerden geri kazanım.' : 'Diameter distributions: Weibull, normal, lognormal, gamma, beta, Johnson SB, exponential, log-logistic; maximum likelihood, moments, percentiles; recovery from summaries.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= $tr ? 'Bu araç JavaScript gerektirir.' : 'This tool needs JavaScript.' ?></p></noscript>
  <div id="wf"></div>
  <nav class="steps" id="steps" aria-label="<?= $tr ? 'Adımlar' : 'Steps' ?>"></nav>
  <div id="loadfail" class="note warn" role="alert" hidden>
    <?= $tr ? 'Araç yüklenemedi: tarayıcı aracın program dosyalarını alamadı (bağlantı kesintisi ya da sunucunun güvenlik kontrolü olabilir). Verileriniz bu tarayıcıda saklanır; sayfayı yenileyin.'
            : 'The tool could not be loaded: the browser did not receive its program files (a connection problem or the server\'s security check). Your data stay in this browser; reload the page.' ?>
    <button type="button" class="btn small" onclick="location.reload()"><?= $tr ? 'Sayfayı yenile' : 'Reload the page' ?></button>
  </div>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
  <section id="recover" class="step" hidden></section>
<?php
// Load watchdog: the interface is an ES module tree; if any file of it fails (offline, or the host's bot check serving an
// HTML page instead of JavaScript) the page would otherwise stay empty without a word. ui.js sets window.__distReady.
site_bottom('<script>function __distFail(){if(!window.__distReady){var e=document.getElementById("loadfail");if(e)e.hidden=false;}}setTimeout(__distFail,15000);</script>'
  . '<script type="module" src="assets/lab/dist/ui.js?v=19" onerror="__distFail()"></script>');
