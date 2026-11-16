<?php
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];
site_top([
    'title'  => $tr ? 'Envanter Verisi Yöneticisi' : 'Inventory Data Manager',
    'kicker' => $tr ? 'Proje ve envanter verisi yöneticisi' : 'Project and inventory data manager',
    'lede'   => $tr ? 'Onaylanmış veri paketlerinizi bu tarayıcıda proje olarak saklayın; adını, yerini, yılını ve notlarını yazın, örnek alan ve dönem yapısını görün, birini etkin yapın: onaylanmış veriyi okuyan araçlar etkin paketi kullanır.'
                    : 'Keep your approved data packages in this browser as projects; give them a name, place, year and notes, see their plot and period structure and make one active: the tools that read approved data use the active package.',
    'desc'   => $tr ? 'Envanter verisi yöneticisi: birden çok onaylanmış veri paketi (forest-dataset/1), etkin paket, örnek alan × dönem özeti, proje bilgileri, içe/dışa aktarma ve yedek; tarayıcıda, veri sunucuya gitmez.'
                    : 'Inventory data manager: several approved data packages (forest-dataset/1), the active package, plot × period overview, project details, import/export and backup; in the browser, data stay with you.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= $tr ? 'Bu araç JavaScript gerektirir.' : 'This tool needs JavaScript.' ?></p></noscript>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <div id="app" class="wide"></div>
<?php site_bottom('<script type="module" src="assets/lab/projects/ui.js"></script>');
