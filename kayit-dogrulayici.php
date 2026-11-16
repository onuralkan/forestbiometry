<?php
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];
site_top([
    'title'  => $tr ? 'Kayıt Doğrulayıcı' : 'Record Verifier',
    'kicker' => $tr ? 'Tekrarlanabilirlik katmanı' : 'Reproducibility layer',
    'lede'   => $tr ? 'Araçların indirdiği çalışma kaydını açın: indirildiğinden beri değişmediğini, hangi aracın hangi sürümüyle ve hangi kaynak koduyla üretildiğini, hangi ayarların kullanıldığını görün; elinizdeki veri dosyalarının kayıttaki girdilerle aynı olduğunu doğrulayın.'
                    : 'Open the run record a tool downloaded: see that it has not changed since, which tool, version and source code produced it and which settings were used; confirm that the data files you have are the inputs of the record.',
    'desc'   => $tr ? 'Çalışma kaydı doğrulayıcı: SHA-256 mührü, araç sürümü ve commit, ayarlar, girdi dosyalarının parmak izi karşılaştırması; tarayıcıda, veri sunucuya gitmez.'
                    : 'Run record verifier: SHA-256 seal, tool version and commit, settings, fingerprint comparison of the input files; in the browser, data stay with you.',
]);
$tools = array_map(function ($t) {
    $ids = array_values(array_column(array_filter(site_catalog(), function ($e) use ($t) { return $e['page'] === $t['file']; }), 'id'));
    return ['file' => $t['file'], 'v' => $t['v'], 'title' => $t['title'], 'ids' => $ids];
}, site_tools());
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= $tr ? 'Bu araç JavaScript gerektirir.' : 'This tool needs JavaScript.' ?></p></noscript>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <script type="application/json" id="tools-data"><?= json_encode($tools, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) ?></script>
  <div id="app" class="wide"></div>
<?php site_bottom('<script type="module" src="assets/lab/record/ui.js"></script>');
