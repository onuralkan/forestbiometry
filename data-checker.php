<?php
require __DIR__ . '/inc/site.php';
site_top([
    'title'  => 'Forest Data Checker',
    'kicker' => 'Data preparation',
    'lede'   => 'Check your tree and plot tables: format errors, missing and duplicate records, conflicting plot sizes and suspect diameter–height values. Nothing is deleted or changed automatically; every fix is logged with its reason.',
    'desc'   => 'In-browser data checking for forest inventory data: import, column mapping, checks, logged fixes and approval.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step" data-step="1"></section>
  <section id="step2" class="step" data-step="2" hidden></section>
  <section id="step3" class="step" data-step="3" hidden></section>
  <section id="step4" class="step wide" data-step="4" hidden></section>
  <dialog id="dlg" class="dlg"></dialog>
<?php site_bottom('<script type="module" src="assets/lab/checker/ui.js?v=3"></script>');
