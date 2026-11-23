<?php
require __DIR__ . '/inc/site.php';
site_top([
    'title'  => 'Report Generator',
    'kicker' => 'Report generator',
    'lede'   => 'Gather a data package and the tools\' run records in one report: choose the sections, write your title and notes, print the report or save it as PDF or HTML.',
    'desc'   => 'Report generator: data package summary, charts, settings and results of run records, references, reproducibility appendix; printable HTML and PDF; in the browser, data stay with you.',
]);
$tools = [];
foreach (site_tools() as $t) $tools[$t['file']] = ['v' => $t['v'], 'en' => $t['title']];
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= 'This tool needs JavaScript.' ?></p></noscript>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <script type="application/json" id="tools-data"><?= json_encode($tools, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) ?></script>
  <div id="app" class="wide"></div>
<?php site_bottom('<script type="module" src="assets/lab/report/ui.js"></script>');
