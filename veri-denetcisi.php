<?php
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];
site_top([
    'title'  => $tr ? 'Ormancılık Verisi Denetçisi' : 'Forest Data Checker',
    'kicker' => $tr ? 'Araç 1 · Veri hazırlığı' : 'Tool 1 · Data preparation',
    'lede'   => $tr ? 'Ağaç ve örnek alan tablolarınızı denetleyin: biçim hataları, eksik ve mükerrer kayıtlar, çelişen alan büyüklükleri ve şüpheli çap–boy değerleri. Hiçbir şey kendiliğinden silinmez ya da değiştirilmez; her düzeltme gerekçesiyle günlüğe yazılır.'
                    : 'Check your tree and plot tables: format errors, missing and duplicate records, conflicting plot sizes and suspect diameter–height values. Nothing is deleted or changed automatically; every fix is logged with its reason.',
    'desc'   => $tr ? 'Orman envanteri verileri için tarayıcıda çalışan veri denetimi: içe aktarma, sütun eşleme, kontroller, gerekçeli düzeltme ve onay.'
                    : 'In-browser data checking for forest inventory data: import, column mapping, checks, logged fixes and approval.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= $tr ? 'Bu araç JavaScript gerektirir.' : 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= $tr ? 'Adımlar' : 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step" data-step="1"></section>
  <section id="step2" class="step" data-step="2" hidden></section>
  <section id="step3" class="step" data-step="3" hidden></section>
  <section id="step4" class="step wide" data-step="4" hidden></section>
  <dialog id="dlg" class="dlg"></dialog>
<?php site_bottom('<script type="module" src="assets/lab/checker/ui.js?v=3"></script>');
