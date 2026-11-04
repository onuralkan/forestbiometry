<?php
// "Workbench" layout for the Forest Biometrics Tools section (araclar/).
// A small gazette masthead links the section to the paper; below it the tools use their own,
// colour-capable design (assets/lab/lab.css). Pages live one level down, so $base = '../'.
// Usage: bench_top(['title' => ..., 'desc' => ..., 'kicker' => ...]); ...; bench_bottom('<script ...>');

const BENCH_BASE = '../';

/** Tools of the section. 'file' null = planned (no link, no placeholder page). */
function bench_tools(): array {
    $tr = paper_ctx()['tr'];
    return [
        ['n' => 1, 'file' => 'veri-denetcisi.php', 'title' => $tr ? 'Ormancılık Verisi Denetçisi' : 'Forest Data Checker',
         'desc' => $tr ? 'Ağaç ve örnek alan tablolarınızı içe aktarın, sütunları eşleyin, biçim hatalarını ve şüpheli ölçümleri bulun; düzeltmeleri gerekçesiyle kaydedip veriyi onaylayın.'
                       : 'Import tree and plot tables, map the columns, find format errors and suspect measurements; record every fix with a reason and approve the data.'],
        ['n' => 2, 'file' => null, 'title' => $tr ? 'Örnek Alan ve Meşcere Hesaplayıcısı' : 'Plot & Stand Metrics', 'desc' => ''],
        ['n' => 3, 'file' => null, 'title' => $tr ? 'Model Başarısı Değerlendiricisi' : 'Model Evaluation', 'desc' => ''],
        ['n' => 4, 'file' => null, 'title' => $tr ? 'Çap Dağılımı Laboratuvarı' : 'Diameter Distribution Lab', 'desc' => ''],
        ['n' => 5, 'file' => null, 'title' => $tr ? 'Boy–Çap Modelleme' : 'Height–Diameter Modelling', 'desc' => ''],
        ['n' => 6, 'file' => null, 'title' => $tr ? 'Envanter Örnekleme Planlayıcısı' : 'Inventory Sampling Planner', 'desc' => ''],
    ];
}

function bench_top(array $o = []): void {
    $c = paper_ctx(); $tr = $c['tr']; $b = BENCH_BASE;
    $section = $tr ? 'Ormancılık Biyometrisi Araçları' : 'Forest Biometrics Tools';
    $pageTitle = ($o['title'] ?? '') !== '' ? $o['title'] . ' | ' . $section : $section . ' | ' . $c['paper'];
    $q = $_GET; $q['lang'] = $c['other']; $langHref = '?' . http_build_query($q);
    ?><!doctype html>
<html lang="<?= $c['L'] ?>">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= h($pageTitle) ?></title>
<meta name="description" content="<?= h($o['desc'] ?? '') ?>">
<meta name="theme-color" content="#f3f1ec" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#14161a" media="(prefers-color-scheme: dark)">
<link rel="preload" href="<?= $b ?>assets/fonts/playfair-display-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="<?= $b ?>assets/lab/lab.css?v=1">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%23155e63'/><text x='16' y='23' font-family='Georgia,serif' font-weight='900' font-size='20' fill='%23fff' text-anchor='middle'>A</text></svg>">
<script>try { var t = localStorage.getItem('theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) {}</script>
</head>
<body class="bench">
<a class="skip" href="#main"><?= $tr ? 'İçeriğe geç' : 'Skip to content' ?></a>
<header class="b-mast">
  <div class="b-mast-in">
    <a class="b-paper" href="<?= $b ?>"><?= h($c['paper']) ?></a>
    <span class="b-sep" aria-hidden="true">/</span>
    <a class="b-section" href="<?= $b ?>araclar/"><?= h($section) ?></a>
    <span class="b-tools">
      <button type="button" id="theme" aria-label="<?= $tr ? 'Koyu / açık tema' : 'Dark / light theme' ?>"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 1.5a6.5 6.5 0 0 1 0 13z" fill="currentColor"/></svg></button>
      <a id="langlink" href="<?= h($langHref) ?>" hreflang="<?= $c['other'] ?>" lang="<?= $c['other'] ?>"><?= $c['other'] === 'en' ? 'English' : 'Türkçe' ?></a>
    </span>
  </div>
</header>
<main id="main" class="b-main">
<?php if (!empty($o['kicker']) || !empty($o['title'])): ?>
  <header class="b-head">
    <?php if (!empty($o['kicker'])): ?><p class="b-kicker"><?= h($o['kicker']) ?></p><?php endif; ?>
    <h1><?= h($o['title'] ?? $section) ?></h1>
    <?php if (!empty($o['lede'])): ?><p class="b-lede"><?= h($o['lede']) ?></p><?php endif; ?>
  </header>
<?php endif;
}

function bench_bottom(string $script = ''): void {
    $c = paper_ctx(); $tr = $c['tr']; $b = BENCH_BASE;
    ?>
</main>
<footer class="b-foot">
  <span><?= h($c['paper']) ?> · <?= $tr ? 'Ormancılık Biyometrisi Araçları' : 'Forest Biometrics Tools' ?> · © <?= date('Y') ?> <?= h($c['S']['name']) ?></span>
  <span><a href="<?= $b ?>araclar/"><?= $tr ? 'Araçlar dizini' : 'Tools index' ?></a> · <a href="<?= $b ?>"><?= $tr ? 'Ön sayfa' : 'Front page' ?></a></span>
</footer>
<script>
document.getElementById('theme').addEventListener('click', () => {
  const root = document.documentElement;
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
});
</script>
<?= $script ?>
</body>
</html>
<?php
}
