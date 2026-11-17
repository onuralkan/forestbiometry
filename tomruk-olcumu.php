<?php
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];
site_top([
    'title'  => $tr ? 'Tomruk Ölçümü' : 'Log Scaling',
    'kicker' => $tr ? 'Board-foot tomruk kuralları ve kübik tomruk hacmi' : 'Board-foot log rules and cubic log volume',
    'lede'   => $tr ? 'Tomruklarınızın ince uç çapı ve boyundan Scribner, Doyle ve International (⅛ ve ¼ inç) kurallarıyla board foot, uç ve orta çaplardan Smalian, Huber ve Newton ile m³ hacim. Ölçüler cm ve m girilir; board-foot kuralları için inç ve feet\'e çevrilir.'
                    : 'Board feet by the Scribner, Doyle and International (⅛ and ¼ inch) rules from the small-end diameter and length of your logs, and m³ volume by Smalian, Huber and Newton from the end and middle diameters. Measurements are entered in cm and m and converted to inches and feet for the board-foot rules.',
    'desc'   => $tr ? 'Tomruk ölçümü: Scribner, Doyle, International ⅛ ve ¼ inç board-foot kuralları; Smalian, Huber, Newton kübik hacim; tarayıcıda, veri sunucuya gitmez.'
                    : 'Log scaling: Scribner, Doyle, International ⅛ and ¼ inch board-foot rules; Smalian, Huber, Newton cubic volume; in the browser, data stay with you.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= $tr ? 'Bu araç JavaScript gerektirir.' : 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= $tr ? 'Adımlar' : 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
<?php site_bottom('<script type="module" src="assets/lab/logscale/ui.js"></script>');
