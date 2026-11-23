<?php
require __DIR__ . '/inc/site.php';
site_top([
    'title'  => 'Log Scaling',
    'kicker' => 'Board-foot log rules and cubic log volume',
    'lede'   => 'Board feet by the Scribner, Doyle and International (⅛ and ¼ inch) rules from the small-end diameter and length of your logs, and m³ volume by Smalian, Huber and Newton from the end and middle diameters. Measurements are entered in cm and m and converted to inches and feet for the board-foot rules.',
    'desc'   => 'Log scaling: Scribner, Doyle, International ⅛ and ¼ inch board-foot rules; Smalian, Huber, Newton cubic volume; in the browser, data stay with you.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
<?php site_bottom('<script type="module" src="assets/lab/logscale/ui.js"></script>');
