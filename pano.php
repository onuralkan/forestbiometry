<?php
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];
site_top([
    'title'  => $tr ? 'Görselleştirme Panosu' : 'Visualization Dashboard',
    'kicker' => $tr ? 'Görselleştirme panosu' : 'Visualization dashboard',
    'lede'   => $tr ? 'Onaylanmış bir veri paketini tek sayfada görün; süzgeçlerle daraltın; araçların çalışma kayıtlarındaki çap dağılımı yoğunluklarını ve boy–çap eğrilerini verinin üstüne çizin.'
                    : 'See an approved data package on one page; narrow it with filters; draw the diameter densities and height curves of the tools\' run records over the data.',
    'desc'   => $tr ? 'Görselleştirme panosu: çap dağılımı, tür katılımı, N/ha, G/ha, boy–çap ve ağaç haritası; dönem, tabaka, tür ve örnek alan süzgeçleri; çalışma kayıtlarından eğriler; tarayıcıda, veri sunucuya gitmez.'
                    : 'Visualization dashboard: diameter distribution, species composition, N/ha, G/ha, height–diameter and tree map; period, stratum, species and plot filters; curves from run records; in the browser, data stay with you.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= $tr ? 'Bu araç JavaScript gerektirir.' : 'This tool needs JavaScript.' ?></p></noscript>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <div id="app" class="wide"></div>
<?php site_bottom('<script type="module" src="assets/lab/dashboard/ui.js"></script>');
