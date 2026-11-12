<?php
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];
site_top([
    'title'  => $tr ? 'Bonitet Hesaplayıcısı' : 'Site Index',
    'kicker' => $tr ? 'Dinamik bonitet denklemleri' : 'Dynamic site index equations',
    'lede'   => $tr ? 'Üst boy ve yaştan, kendi katsayı setinizle (kaynağıyla) dayanak yaştaki bonitet endeksini ve kendi tanımladığınız bonitet sınıfını hesaplayın; eğri demetini görün. Katsayıları kendi gövde analizi ya da tekrarlı ölçüm verinizden de uydurabilirsiniz; bootstrap ya da kaynağın kovaryans matrisiyle güven aralığı verilir. Araç hiçbir tür ya da yöre katsayısı ve hasılat tablosu içermez. Onaylanmış ağaç verisinden üst boy Örnek Alan ve Meşcere aracıyla aynı tanımla hesaplanır.'
                    : 'Compute the site index at a base age and a site class you define from top height and age, with your own coefficient set (and its source); see the curve family. You can also fit the coefficients to your own stem analyses or repeated measurements; confidence intervals come from a bootstrap or the covariance matrix of the source. The tool contains no species or regional coefficients and no yield table. From approved tree data the top height is computed with the same definition as the Plot & Stand tool.',
    'desc'   => $tr ? 'Bonitet: Chapman–Richards (anamorfik, polimorfik) ve Schumacher fark denklemleri, dayanak yaş, yaş türü, kullanıcı tanımlı sınıflar, eğri demeti, kendi verinizden katsayı uydurma, güven aralığı.' : 'Site index: Chapman–Richards (anamorphic, polymorphic) and Schumacher difference equations, base age, age type, user-defined classes, curve family, fitting to your own data, confidence intervals.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= $tr ? 'Bu araç JavaScript gerektirir.' : 'This tool needs JavaScript.' ?></p></noscript>
  <nav class="steps" id="steps" aria-label="<?= $tr ? 'Adımlar' : 'Steps' ?>"></nav>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <section id="step1" class="step"></section>
  <section id="step2" class="step" hidden></section>
  <section id="step3" class="step wide" hidden></section>
<?php site_bottom('<script type="module" src="assets/lab/siteindex/ui.js?v=2"></script>');
