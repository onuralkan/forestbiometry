<?php
// Shared shell of forestbiometry.online: language, header, footer, tool list, author details.
// Not web-accessible (see inc/.htaccess). No database, no sessions, no server-side user data.
// Usage: site_top(['title' => ..., 'desc' => ..., 'kicker' => ..., 'lede' => ...]); ...; site_bottom('<script ...>');
declare(strict_types=1);

date_default_timezone_set('Europe/Istanbul');

/** Author and responsible person, shown on the About page and in the footer. Empty values are not shown. */
/** For citations: canonical address and the year the platform was first published. */
const SITE_BASE = 'https://forestbiometry.online/';
const SITE_YEAR = 2026;

const SITE_AUTHOR = [
    'name'  => 'Onur Alkan',
    'email' => 'onuralkan@isparta.edu.tr',
    'orcid' => '0000-0001-5798-3421',
    'family' => 'Alkan', 'given' => 'Onur',      // for citations   // shown only when filled in
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

/** Tools of the platform. 'file' null = planned (no link, no placeholder page). 'cat' = sidebar group, 'icon' = site_icon() name, 'short' = sidebar label. */
function site_tools(?bool $tr = null): array {
    $tr = $tr ?? site_ctx()['tr'];
    return [
        ['n' => 1, 'cat' => 'data', 'icon' => 'checker', 'short' => $tr ? 'Veri Denetçisi' : 'Data Checker', 'file' => 'veri-denetcisi.php', 'v' => '1.0.0', 'lab' => 'checker', 'title' => $tr ? 'Ormancılık Verisi Denetçisi' : 'Forest Data Checker',
         'desc' => $tr ? 'Ağaç ve örnek alan tablolarınızı içe aktarın, sütunları eşleyin, biçim hatalarını ve şüpheli ölçümleri bulun; düzeltmeleri gerekçesiyle kaydedip veriyi onaylayın.'
                       : 'Import tree and plot tables, map the columns, find format errors and suspect measurements; record every fix with a reason and approve the data.'],
        ['n' => 2, 'cat' => 'inventory', 'icon' => 'plot', 'short' => $tr ? 'Örnek Alan ve Meşcere' : 'Plot & Stand Metrics', 'file' => 'ornek-alan.php', 'v' => '1.1.0', 'lab' => 'stand', 'title' => $tr ? 'Örnek Alan ve Meşcere Hesaplayıcısı' : 'Plot & Stand Metrics',
         'desc' => $tr ? 'Onaylanmış veriden her örnek alan ve dönem için hektarda ağaç sayısı ve göğüs yüzeyi, ortalama çaplar, çap sınıfları ve tür katılımı; örnek alanlar arası özet ve tasarıma dayalı orman tahmini.'
                       : 'From approved data, per plot and period: stems and basal area per hectare, mean diameters, diameter classes and species composition; between-plot summary and design-based forest estimate.'],
        ['n' => 3, 'cat' => 'model', 'icon' => 'eval', 'short' => $tr ? 'Model Başarısı' : 'Model Evaluation', 'file' => 'model-degerlendirme.php', 'v' => '1.0.0', 'lab' => 'eval', 'title' => $tr ? 'Model Başarısı Değerlendiricisi' : 'Model Evaluation',
         'desc' => $tr ? 'Gözlenen ve tahmin edilen değerlerden yanlılık, MAE, RMSE ve tahmin R²; gözlenen–tahmin ve artık grafikleri, gruplara göre başarı tabloları.'
                       : 'Bias, MAE, RMSE and prediction R² from observed and predicted values; observed–predicted and residual plots, performance tables by group.'],
        ['n' => 4, 'cat' => 'dist', 'icon' => 'dist', 'short' => $tr ? 'Çap Dağılımı' : 'Diameter Distribution', 'file' => 'cap-dagilimi.php', 'v' => '2.0.0', 'lab' => 'dist', 'title' => $tr ? 'Çap Dağılımı Laboratuvarı' : 'Diameter Distribution Lab',
         'desc' => $tr ? 'Weibull, normal, lognormal, gamma, sabit sınırlı beta, Johnson SB, üstel ve log-lojistik: en çok olabilirlik, momentler ve yüzdeliklerle doğrudan uydurma, örnek alan ve dönem bazında; ortalama ile varyans ya da Dq\'dan geri kazanım; Weibull için Poudel ve Cao M2–M10, Johnson SB için Parresol; Excel ve CSV çıktısı. Ölçüm eşiğinde koşullu en çok olabilirlik; sınıf tabloları ve sınıflandırılmış sıklıklardan uydurma; model karşılaştırma, Q–Q ve P–P grafikleri; bootstrap p değerleri ve aralıklar.'
                       : 'Weibull, normal, lognormal, gamma, fixed-bound beta, Johnson SB, exponential and log-logistic: direct fitting by maximum likelihood, moments and percentiles, per plot and period; recovery from the mean and the variance or Dq; Poudel and Cao M2–M10 for the Weibull, Parresol for the Johnson SB; Excel and CSV output. Conditional maximum likelihood for measurement thresholds; class tables and fitting from class frequencies; model comparison, Q–Q and P–P plots; bootstrap p-values and intervals.'],
        ['n' => 5, 'cat' => 'model', 'icon' => 'hd', 'short' => $tr ? 'Boy–Çap Modelleme' : 'Height–Diameter', 'file' => 'boy-cap.php', 'v' => '1.0.0', 'lab' => 'hd', 'title' => $tr ? 'Boy–Çap Modelleme' : 'Height–Diameter Modelling',
         'desc' => $tr ? 'Sabit etkili sürüm: Näslund, Michailoff, Curtis, kuvvet, Chapman–Richards ve Weibull denklemlerini doğrusal olmayan en küçük karelerle uydurun; aynı ağaçlar üzerinde karşılaştırma, örnek alan bazında çapraz doğrulama, eksik boylar için ayrı tahmin sütunu. Karma etkili modeller sonraki aşamada.'
                       : 'Fixed-effects version: fit the Näslund, Michailoff, Curtis, power, Chapman–Richards and Weibull equations by nonlinear least squares; comparison on the same trees, plot-based cross-validation, a separate prediction column for missing heights. Mixed-effects models in a later stage.'],
        ['n' => 6, 'cat' => 'inventory', 'icon' => 'sampling', 'short' => $tr ? 'Örnekleme Planlayıcısı' : 'Sampling Planner', 'file' => 'ornekleme.php', 'v' => '1.0.0', 'lab' => 'sampling', 'title' => $tr ? 'Envanter Örnekleme Planlayıcısı' : 'Inventory Sampling Planner',
         'desc' => $tr ? 'Basit rastgele örneklemede bir ortalamayı hedeflenen bağıl hatayla tahmin etmek için yaklaşık örnek alan sayısı: pilot ölçümlerden veya girilen CV\'den, isteğe bağlı sonlu çerçeve düzeltmesiyle. Tabakalı, sistematik ve kümeli tasarımlar sonraki sürümlerde.'
                       : 'Approximate number of plots to estimate a mean with a target relative error under simple random sampling: from pilot measurements or a CV you enter, with an optional finite-frame correction. Stratified, systematic and cluster designs in later versions.'],
        ['n' => 7, 'cat' => 'model', 'icon' => 'rank', 'short' => $tr ? 'Nispi Sıralama' : 'Relative Ranking', 'file' => 'nispi-siralama.php', 'v' => '1.0.0', 'lab' => 'rank', 'title' => $tr ? 'Nispi Sıralama' : 'Relative Ranking',
         'desc' => $tr ? 'Başarı ölçütleri tablosundan (R², FI, RMSE, MAE, Bias, AIC, BIC…) ölçüt bazında ve genel nispi sıralar; en iyi ve en kötü modellerin radar grafiği.'
                       : 'Relative ranks per criterion and overall from a goodness-of-fit table (R², FI, RMSE, MAE, Bias, AIC, BIC…); radar chart of the best and worst models.'],
    ];
}

/** Sidebar groups, in display order. A tool belongs to one group ('cat'); new groups only need a line here. */
function site_cats(): array {
    $tr = site_ctx()['tr'];
    return [
        ['id' => 'data', 'title' => $tr ? 'Veri hazırlığı' : 'Data preparation',
         'desc' => $tr ? 'Ölçüm tablolarını denetleyin, düzeltin ve öteki araçlar için onaylayın.' : 'Check, correct and approve measurement tables for the other tools.'],
        ['id' => 'inventory', 'title' => $tr ? 'Envanter ve örnekleme' : 'Inventory and sampling',
         'desc' => $tr ? 'Örnek alan ve meşcere değerleri; kaç örnek alan gerektiği.' : 'Plot and stand values; how many plots are needed.'],
        ['id' => 'dist', 'title' => $tr ? 'Dağılımlar' : 'Distributions',
         'desc' => $tr ? 'Tek ağaç çaplarına dağılım uydurma ve sınıf frekansları.' : 'Fitting distributions to tree diameters, class frequencies.'],
        ['id' => 'model', 'title' => $tr ? 'Modelleme ve değerlendirme' : 'Modelling and evaluation',
         'desc' => $tr ? 'Model kurma, tahmin başarısını ölçme ve modelleri sıralama.' : 'Fitting models, measuring prediction performance, ranking models.'],
    ];
}

/** Line icons (24 × 24, stroke = currentColor). Drawn for this site; each shows what the tool works on. */
function site_icon(string $name, string $cls = 'ico'): string {
    $p = [
        'checker'  => '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.8h6V4"/><path d="m8.5 13 2.4 2.4 4.6-5"/>',
        'plot'     => '<circle cx="12" cy="12" r="8.6" stroke-dasharray="2.2 1.8"/><circle cx="9" cy="10" r="1.9" class="f"/><circle cx="14.6" cy="8.6" r="1.2" class="f"/><circle cx="13.4" cy="14.6" r="2.3" class="f"/><circle cx="8.4" cy="15.2" r="1" class="f"/><path d="M12 11.2v1.6M11.2 12h1.6"/>',
        'eval'     => '<path d="M4 3.5V20h16.5"/><path d="M6.5 17.5 19 5" stroke-dasharray="2 2"/><circle cx="8.6" cy="13.6" r="1.1" class="f"/><circle cx="11.2" cy="12.8" r="1.1" class="f"/><circle cx="13" cy="9.2" r="1.1" class="f"/><circle cx="16.4" cy="8.4" r="1.1" class="f"/>',
        'dist'     => '<path d="M3.5 20.5h17"/><path d="M5 20.5v-5h3v5M8 20.5v-10h3v10M11 20.5V8h3v12.5M14 20.5v-7h3v7"/><path d="M3 19.5C6.5 19 7.5 5.5 12.5 5.5S18 16.5 21 18.5" class="acc"/>',
        'hd'       => '<circle cx="9.5" cy="8" r="5"/><path d="M9.5 13v8M6.5 21h6"/><path d="M18.5 3v18M16.8 3h3.4M16.8 21h3.4M17.5 12h2" class="acc"/>',
        'sampling' => '<circle cx="6" cy="6" r="1" class="f"/><circle cx="12" cy="6" r="1" class="f"/><circle cx="18" cy="6" r="1" class="f"/><circle cx="6" cy="12" r="1" class="f"/><circle cx="18" cy="12" r="1" class="f"/><circle cx="6" cy="18" r="1" class="f"/><circle cx="12" cy="18" r="1" class="f"/><circle cx="12" cy="12" r="3.2" class="acc"/><circle cx="18" cy="18" r="3.2" class="acc"/>',
        'rank'     => '<path d="m12 3 7.8 4.5v9L12 21l-7.8-4.5v-9Z"/><path d="m12 7.2 4.6 2.6-.9 5.1-4.3 1.6-3.6-3.9Z" class="acc"/><path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" stroke-width=".8" opacity=".45"/>',
        'cite'     => '<path d="M5 11.5h4.5V17H5v-5.5Zm0 0c0-3 1-4.6 3.2-5.5M14.5 11.5H19V17h-4.5v-5.5Zm0 0c0-3 1-4.6 3.2-5.5"/>',
        'about'    => '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r=".9" class="f"/>',
        'home'     => '<circle cx="12" cy="12" r="8.6" stroke-dasharray="2.2 1.8"/><circle cx="10" cy="10.5" r="2" class="f"/><circle cx="14.5" cy="14" r="1.4" class="f"/>',
        'menu'     => '<path d="M4 7h16M4 12h16M4 17h16"/>',
        'collapse' => '<path d="m14.5 6-6 6 6 6"/><path d="M19 5v14" opacity=".5"/>',
        'close'    => '<path d="m6 6 12 12M18 6 6 18"/>',
    ][$name] ?? '';
    return '<svg class="' . $cls . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . $p . '</svg>';
}

/** The tool whose page is being shown (null on the home and About pages). */
function site_current_tool(): ?array {
    $here = basename($_SERVER['SCRIPT_NAME'] ?? '');
    foreach (site_tools() as $t) if ($t['file'] === $here) return $t;
    return null;
}

function site_top(array $o = []): void {
    $c = site_ctx(); $tr = $c['tr'];
    $pageTitle = ($o['title'] ?? '') !== '' && $o['title'] !== $c['site'] ? $o['title'] . ' | ' . $c['site'] : $c['site'] . ' | forestbiometry.online';
    $q = $_GET; $q['lang'] = $c['other']; $langHref = '?' . http_build_query($q);
    $here = basename($_SERVER['SCRIPT_NAME'] ?? ''); $cur = site_current_tool();
    $tools = site_tools();
    ?><!doctype html>
<html lang="<?= $c['L'] ?>">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= h($pageTitle) ?></title>
<meta name="description" content="<?= h($o['desc'] ?? '') ?>">
<?php if (!empty($o['robots'])): ?><meta name="robots" content="<?= h($o['robots']) ?>">
<?php endif; ?><meta name="author" content="<?= h(SITE_AUTHOR['name']) ?>">
<meta name="theme-color" content="#eef1ec" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#121814" media="(prefers-color-scheme: dark)">
<link rel="preload" href="assets/fonts/playfair-display-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/lab/lab.css?v=17">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='7' fill='%231d5b45'/><circle cx='16' cy='16' r='10.5' fill='none' stroke='%23fff' stroke-width='1.6' stroke-dasharray='3 2.4'/><circle cx='13' cy='14' r='3' fill='%23fff'/><circle cx='19.5' cy='19' r='2' fill='%23fff'/></svg>">
<script>try { var t = localStorage.getItem('theme'); if (t) document.documentElement.dataset.theme = t; if (localStorage.getItem('side') === 'narrow') document.documentElement.classList.add('side-narrow'); } catch (e) {}</script>
</head>
<body class="bench">
<a class="skip" href="#main"><?= $tr ? 'İçeriğe geç' : 'Skip to content' ?></a>
<header class="b-top">
  <button type="button" class="b-iconbtn b-menu" id="navopen" aria-controls="side" aria-expanded="false" aria-label="<?= $tr ? 'Araç menüsünü aç' : 'Open the tools menu' ?>"><?= site_icon('menu') ?></button>
  <a class="b-brand" href="./"><span class="b-mark" aria-hidden="true"><?= site_icon('home') ?></span><span><?= h($c['site']) ?></span></a>
  <nav class="b-nav" aria-label="<?= $tr ? 'Site' : 'Site' ?>">
    <a href="./"<?= $here === 'index.php' ? ' aria-current="page"' : '' ?>><?= $tr ? 'Araçlar' : 'Tools' ?></a>
    <a href="hakkinda.php"<?= $here === 'hakkinda.php' ? ' aria-current="page"' : '' ?>><?= $tr ? 'Hakkında' : 'About' ?></a>
  </nav>
  <span class="b-tools">
    <button type="button" class="b-citebtn" id="citebtn" data-cite-open aria-haspopup="dialog"><?= site_icon('cite') ?><span><?= $tr ? 'Atıf' : 'Cite' ?></span></button>
    <button type="button" id="theme" class="b-iconbtn" aria-label="<?= $tr ? 'Koyu / açık tema' : 'Dark / light theme' ?>"><svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 1.5a6.5 6.5 0 0 1 0 13z" fill="currentColor"/></svg></button>
    <a id="langlink" href="<?= h($langHref) ?>" hreflang="<?= $c['other'] ?>" lang="<?= $c['other'] ?>"><?= $c['other'] === 'en' ? 'English' : 'Türkçe' ?></a>
  </span>
</header>
<div class="b-shell">
<aside class="b-side" id="side" aria-label="<?= $tr ? 'Araçlar' : 'Tools' ?>">
  <div class="b-side-head">
    <span class="b-side-title"><?= $tr ? 'Araçlar' : 'Tools' ?></span>
    <button type="button" class="b-iconbtn b-narrow" id="sidenarrow" aria-pressed="false" aria-label="<?= $tr ? 'Kenar çubuğunu daralt / genişlet' : 'Narrow / widen the sidebar' ?>"><?= site_icon('collapse') ?></button>
    <button type="button" class="b-iconbtn b-close" id="navclose" aria-label="<?= $tr ? 'Menüyü kapat' : 'Close the menu' ?>"><?= site_icon('close') ?></button>
  </div>
  <nav class="b-side-nav" aria-label="<?= $tr ? 'Araçlar, kategorilere göre' : 'Tools by category' ?>">
    <?php foreach (site_cats() as $cat): $list = array_filter($tools, function ($t) use ($cat) { return $t['cat'] === $cat['id']; }); if (!$list) continue; ?>
    <div class="b-group">
      <p class="b-cat" id="cat-<?= $cat['id'] ?>"><?= h($cat['title']) ?></p>
      <ul aria-labelledby="cat-<?= $cat['id'] ?>">
        <?php foreach ($list as $t): ?>
        <li><?php if ($t['file']): ?><a href="<?= h($t['file']) ?>" title="<?= h($t['title']) ?>"<?= $cur && $cur['file'] === $t['file'] ? ' aria-current="page"' : '' ?>><?= site_icon($t['icon']) ?><span><?= h($t['short']) ?></span></a>
        <?php else: ?><span class="b-planned" title="<?= h($t['title']) ?>"><?= site_icon($t['icon']) ?><span><?= h($t['short']) ?></span></span><?php endif; ?></li>
        <?php endforeach; ?>
      </ul>
    </div>
    <?php endforeach; ?>
  </nav>
  <div class="b-side-foot">
    <a href="hakkinda.php" title="<?= $tr ? 'Hakkında' : 'About' ?>"<?= $here === 'hakkinda.php' ? ' aria-current="page"' : '' ?>><?= site_icon('about') ?><span><?= $tr ? 'Hakkında' : 'About' ?></span></a>
    <p><?= $tr ? 'Hesaplar tarayıcınızda yapılır; veriniz sunucuya gitmez.' : 'Calculations run in your browser; your data stay with you.' ?></p>
  </div>
</aside>
<div class="b-scrim" id="scrim" hidden></div>
<main id="main" class="b-main">
<?php if (!empty($o['kicker']) || !empty($o['title'])): ?>
  <header class="b-head<?= $cur ? ' has-ico' : '' ?>">
    <?php if ($cur): ?><span class="b-headico" aria-hidden="true"><?= site_icon($cur['icon']) ?></span><?php endif; ?>
    <div>
    <?php if (!empty($o['kicker'])): ?><p class="b-kicker"><?= h($o['kicker']) ?></p><?php endif; ?>
    <h1><?= h($o['title'] ?? $c['site']) ?></h1>
    <?php if (!empty($o['lede'])): ?><p class="b-lede"><?= h($o['lede']) ?></p><?php endif; ?>
    </div>
  </header>
<?php endif;
}

function site_bottom(string $script = ''): void {
    $c = site_ctx(); $tr = $c['tr'];
    ?>
</main>
</div>
<footer class="b-foot">
  <span>forestbiometry.online · © <?= date('Y') ?> · <?= $tr ? 'Yazar ve sorumlu' : 'Author and responsible person' ?>: <a href="hakkinda.php"><?= h(SITE_AUTHOR['name']) ?></a></span>
  <span><a href="./"><?= $tr ? 'Araçlar dizini' : 'Tools index' ?></a> · <a href="hakkinda.php"><?= $tr ? 'Hakkında' : 'About' ?></a></span>
</footer>
<script>
(function () {
  var root = document.documentElement, $ = function (id) { return document.getElementById(id); };
  $('theme').addEventListener('click', function () {
    var dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
  });
  // desktop: narrow (icons only) or wide sidebar, remembered in this browser
  var nb = $('sidenarrow'); nb.setAttribute('aria-pressed', root.classList.contains('side-narrow'));
  nb.addEventListener('click', function () {
    var on = root.classList.toggle('side-narrow'); nb.setAttribute('aria-pressed', on);
    try { localStorage.setItem('side', on ? 'narrow' : 'wide'); } catch (e) {}
  });
  // small screens: the sidebar is a drawer
  var side = $('side'), scrim = $('scrim'), openBtn = $('navopen');
  function open() { root.classList.add('side-open'); scrim.hidden = false; openBtn.setAttribute('aria-expanded', 'true'); var a = side.querySelector('[aria-current], a'); if (a) a.focus(); }
  function close(back) { root.classList.remove('side-open'); scrim.hidden = true; openBtn.setAttribute('aria-expanded', 'false'); if (back) openBtn.focus(); }
  openBtn.addEventListener('click', open);
  $('navclose').addEventListener('click', function () { close(true); });
  scrim.addEventListener('click', function () { close(true); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.classList.contains('side-open')) close(true); });
})();
</script>
<?php
    $cur = site_current_tool(); $en = site_tools(false); $trT = site_tools(true); $ct = null;
    if ($cur) foreach ($trT as $i => $t) if ($t['file'] === $cur['file']) $ct = ['file' => $t['file'], 'v' => $t['v'], 'tr' => $t['title'], 'en' => $en[$i]['title']];
    $cd = ['author' => ['family' => SITE_AUTHOR['family'], 'given' => SITE_AUTHOR['given']], 'year' => SITE_YEAR, 'base' => SITE_BASE,
           'site' => ['tr' => 'Ormancılık Biyometrisi Araçları', 'en' => 'Forest Biometrics Tools'], 'tool' => $ct];
?>
<dialog id="citedlg" class="dlg citedlg" aria-label="<?= $tr ? 'Kaynak gösterme' : 'How to cite' ?>"></dialog>
<script type="application/json" id="cite-data"><?= json_encode($cd, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) ?></script>
<script type="module" src="assets/lab/core/cite-ui.js?v=1"></script>
<?= $script ?>
</body>
</html>
<?php
}
