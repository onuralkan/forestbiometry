<?php
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];
site_top([
    'title'  => $tr ? 'Envanter Örnekleme Planlayıcısı' : 'Inventory Sampling Planner',
    'kicker' => $tr ? 'Araç 6 · Örnek alan sayısı · Basit rastgele örnekleme' : 'Tool 6 · Number of plots · Simple random sampling',
    'lede'   => $tr ? 'Örnek alan düzeyindeki pilot ölçümlerden veya bildiğiniz bir değişim katsayısından, bir ortalamayı hedeflediğiniz bağıl hatayla tahmin etmek için yaklaşık kaç örnek alan gerektiğini hesaplayın. Yaklaşım, varsayımlar ve farklı hata hedefleri raporlanır.'
                    : 'From plot-level pilot measurements or a coefficient of variation you know, compute about how many plots are needed to estimate a mean with the relative error you aim for. The approach, the assumptions and other error targets are reported.',
    'desc'   => $tr ? 'Basit rastgele örneklemede ortalama için örnek alan sayısı: n₀ = z²(CV/E)², isteğe bağlı sonlu çerçeve düzeltmesi.' : 'Number of plots for a mean under simple random sampling: n₀ = z²(CV/E)², optional finite-frame correction.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= $tr ? 'Bu araç JavaScript gerektirir.' : 'This tool needs JavaScript.' ?></p></noscript>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <div id="app" class="planner"></div>
<?php site_bottom('<script type="module" src="assets/lab/sampling/ui.js?v=1"></script>');
