<?php
// Shared shell of forestbiometry.online: language, header, footer, tool list, author details.
// Not web-accessible (see inc/.htaccess). No database, no sessions, no server-side user data.
// Usage: site_top(['title' => ..., 'desc' => ..., 'kicker' => ..., 'lede' => ...]); ...; site_bottom('<script ...>');
declare(strict_types=1);

date_default_timezone_set('Europe/Istanbul');

/** Author and responsible person, shown on the About page and in the footer. Empty values are not shown. */
const SITE_AUTHOR = [
    'name'  => 'Onur Alkan',
    'email' => 'onuralkan@isparta.edu.tr',
    'orcid' => '0000-0001-5798-3421',   // shown only when filled in
];

function h(?string $s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

/** ?lang= wins and is remembered in a cookie; otherwise the cookie, otherwise the browser language. */
function lang(): string {
    if (isset($_GET['lang']) && in_array($_GET['lang'], ['tr', 'en'], true)) {
        setcookie('lang', $_GET['lang'], ['expires' => time() + 31536000, 'path' => '/', 'samesite' => 'Lax', 'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off']);
        return $_GET['lang'];
    }
    if (isset($_COOKIE['lang']) && in_array($_COOKIE['lang'], ['tr', 'en'], true)) return $_COOKIE['lang'];
    $al = strtolower($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '');
    return substr($al, 0, 2) === 'tr' ? 'tr' : 'en';
}

function site_ctx(): array {
    static $c = null;
    if ($c) return $c;
    $L = lang(); $tr = $L === 'tr';
    $c = ['L' => $L, 'tr' => $tr, 'other' => $tr ? 'en' : 'tr',
          'site' => $tr ? 'Ormancılık Biyometrisi Araçları' : 'Forest Biometrics Tools'];
    return $c;
}

/** Tools of the platform. 'file' null = planned (no link, no placeholder page). */
function site_tools(): array {
    $tr = site_ctx()['tr'];
    return [
        ['n' => 1, 'file' => 'veri-denetcisi.php', 'title' => $tr ? 'Ormancılık Verisi Denetçisi' : 'Forest Data Checker',
         'desc' => $tr ? 'Ağaç ve örnek alan tablolarınızı içe aktarın, sütunları eşleyin, biçim hatalarını ve şüpheli ölçümleri bulun; düzeltmeleri gerekçesiyle kaydedip veriyi onaylayın.'
                       : 'Import tree and plot tables, map the columns, find format errors and suspect measurements; record every fix with a reason and approve the data.'],
        ['n' => 2, 'file' => 'ornek-alan.php', 'title' => $tr ? 'Örnek Alan ve Meşcere Hesaplayıcısı' : 'Plot & Stand Metrics',
         'desc' => $tr ? 'Onaylanmış veriden her örnek alan ve dönem için hektarda ağaç sayısı ve göğüs yüzeyi, ortalama çaplar, çap sınıfları ve tür katılımı; örnek alanlar arası özet ve tasarıma dayalı orman tahmini.'
                       : 'From approved data, per plot and period: stems and basal area per hectare, mean diameters, diameter classes and species composition; between-plot summary and design-based forest estimate.'],
        ['n' => 3, 'file' => 'model-degerlendirme.php', 'title' => $tr ? 'Model Başarısı Değerlendiricisi' : 'Model Evaluation',
         'desc' => $tr ? 'Gözlenen ve tahmin edilen değerlerden yanlılık, MAE, RMSE ve tahmin R²; gözlenen–tahmin ve artık grafikleri, gruplara göre başarı tabloları.'
                       : 'Bias, MAE, RMSE and prediction R² from observed and predicted values; observed–predicted and residual plots, performance tables by group.'],
        ['n' => 4, 'file' => 'cap-dagilimi.php', 'title' => $tr ? 'Çap Dağılımı Laboratuvarı' : 'Diameter Distribution Lab',
         'desc' => $tr ? 'Weibull sürümü: tek ağaç çaplarından en çok olabilirlik ve moment tahmini, sabit konumlu üç parametreli biçim, sınıf frekansları ve kuyruklar, örnek alan bazında uydurma, eğri gezgini. Diğer dağılımlar sonraki sürümlerde.'
                       : 'Weibull version: maximum likelihood and moment estimation from tree diameters, three-parameter form with a fixed location, class frequencies with tails, per-plot fits, curve explorer. Other distributions in later versions.'],
        ['n' => 5, 'file' => 'boy-cap.php', 'title' => $tr ? 'Boy–Çap Modelleme' : 'Height–Diameter Modelling',
         'desc' => $tr ? 'Sabit etkili sürüm: Näslund, Michailoff, Curtis, kuvvet, Chapman–Richards ve Weibull denklemlerini doğrusal olmayan en küçük karelerle uydurun; aynı ağaçlar üzerinde karşılaştırma, örnek alan bazında çapraz doğrulama, eksik boylar için ayrı tahmin sütunu. Karma etkili modeller sonraki aşamada.'
                       : 'Fixed-effects version: fit the Näslund, Michailoff, Curtis, power, Chapman–Richards and Weibull equations by nonlinear least squares; comparison on the same trees, plot-based cross-validation, a separate prediction column for missing heights. Mixed-effects models in a later stage.'],
        ['n' => 6, 'file' => null, 'title' => $tr ? 'Envanter Örnekleme Planlayıcısı' : 'Inventory Sampling Planner', 'desc' => ''],
        ['n' => 7, 'file' => 'nispi-siralama.php', 'title' => $tr ? 'Nispi Sıralama' : 'Relative Ranking',
         'desc' => $tr ? 'Başarı ölçütleri tablosundan (R², FI, RMSE, MAE, Bias, AIC, BIC…) ölçüt bazında ve genel nispi sıralar; en iyi ve en kötü modellerin radar grafiği.'
                       : 'Relative ranks per criterion and overall from a goodness-of-fit table (R², FI, RMSE, MAE, Bias, AIC, BIC…); radar chart of the best and worst models.'],
    ];
}

function site_top(array $o = []): void {
    $c = site_ctx(); $tr = $c['tr'];
    $pageTitle = ($o['title'] ?? '') !== '' && $o['title'] !== $c['site'] ? $o['title'] . ' | ' . $c['site'] : $c['site'] . ' | forestbiometry.online';
    $q = $_GET; $q['lang'] = $c['other']; $langHref = '?' . http_build_query($q);
    $here = basename($_SERVER['SCRIPT_NAME'] ?? '');
    ?><!doctype html>
<html lang="<?= $c['L'] ?>">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= h($pageTitle) ?></title>
<meta name="description" content="<?= h($o['desc'] ?? '') ?>">
<meta name="author" content="<?= h(SITE_AUTHOR['name']) ?>">
<meta name="theme-color" content="#f3f1ec" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#14161a" media="(prefers-color-scheme: dark)">
<link rel="preload" href="assets/fonts/playfair-display-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/lab/lab.css?v=7">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%23155e63'/><text x='16' y='23' font-family='Georgia,serif' font-weight='900' font-size='20' fill='%23fff' text-anchor='middle'>F</text></svg>">
<script>try { var t = localStorage.getItem('theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) {}</script>
</head>
<body class="bench">
<a class="skip" href="#main"><?= $tr ? 'İçeriğe geç' : 'Skip to content' ?></a>
<header class="b-mast">
  <div class="b-mast-in">
    <a class="b-paper" href="./"><?= h($c['site']) ?></a>
    <nav class="b-nav" aria-label="<?= $tr ? 'Site' : 'Site' ?>">
      <a href="./"<?= $here === 'index.php' ? ' aria-current="page"' : '' ?>><?= $tr ? 'Araçlar' : 'Tools' ?></a>
      <a href="hakkinda.php"<?= $here === 'hakkinda.php' ? ' aria-current="page"' : '' ?>><?= $tr ? 'Hakkında' : 'About' ?></a>
    </nav>
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
    <h1><?= h($o['title'] ?? $c['site']) ?></h1>
    <?php if (!empty($o['lede'])): ?><p class="b-lede"><?= h($o['lede']) ?></p><?php endif; ?>
  </header>
<?php endif;
}

function site_bottom(string $script = ''): void {
    $c = site_ctx(); $tr = $c['tr'];
    ?>
</main>
<footer class="b-foot">
  <span>forestbiometry.online · © <?= date('Y') ?> · <?= $tr ? 'Yazar ve sorumlu' : 'Author and responsible person' ?>: <a href="hakkinda.php"><?= h(SITE_AUTHOR['name']) ?></a></span>
  <span><a href="./"><?= $tr ? 'Araçlar dizini' : 'Tools index' ?></a> · <a href="hakkinda.php"><?= $tr ? 'Hakkında' : 'About' ?></a></span>
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
