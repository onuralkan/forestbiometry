<?php
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];
site_top([
    'title'  => $tr ? 'Rapor Üretici' : 'Report Generator',
    'kicker' => $tr ? 'Rapor üretici' : 'Report generator',
    'lede'   => $tr ? 'Bir veri paketini ve araçların çalışma kayıtlarını tek bir raporda toplayın: bölümleri seçin, başlık ve notlarınızı yazın, raporu yazdırın ya da PDF ya da HTML olarak kaydedin. Rapor Türkçe ya da İngilizce olabilir.'
                    : 'Gather a data package and the tools\' run records in one report: choose the sections, write your title and notes, print the report or save it as PDF or HTML. The report can be in Turkish or English.',
    'desc'   => $tr ? 'Rapor üretici: veri paketi özeti, grafikler, çalışma kayıtlarının ayarları ve sonuçları, kaynaklar, tekrarlanabilirlik eki; yazdırılabilir HTML ve PDF; tarayıcıda, veri sunucuya gitmez.'
                    : 'Report generator: data package summary, charts, settings and results of run records, references, reproducibility appendix; printable HTML and PDF; in the browser, data stay with you.',
]);
$trT = site_tools(true); $enT = site_tools(false); $tools = [];
foreach ($trT as $i => $t) $tools[$t['file']] = ['v' => $t['v'], 'tr' => $t['title'], 'en' => $enT[$i]['title']];
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= $tr ? 'Bu araç JavaScript gerektirir.' : 'This tool needs JavaScript.' ?></p></noscript>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <script type="application/json" id="tools-data"><?= json_encode($tools, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) ?></script>
  <div id="app" class="wide"></div>
<?php site_bottom('<script type="module" src="assets/lab/report/ui.js"></script>');
