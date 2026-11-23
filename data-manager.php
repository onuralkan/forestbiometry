<?php
require __DIR__ . '/inc/site.php';
site_top([
    'title'  => 'Inventory Data Manager',
    'kicker' => 'Project and inventory data manager',
    'lede'   => 'Keep your approved data packages in this browser as projects; give them a name, place, year and notes, see their plot and period structure and make one active: the tools that read approved data use the active package.',
    'desc'   => 'Inventory data manager: several approved data packages (forest-dataset/1), the active package, plot × period overview, project details, import/export and backup; in the browser, data stay with you.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= 'This tool needs JavaScript.' ?></p></noscript>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <div id="app" class="wide"></div>
<?php site_bottom('<script type="module" src="assets/lab/projects/ui.js"></script>');
