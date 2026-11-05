<?php
// Shared masthead / footer for every public page of the gazette.
// Usage: paper_top(['title' => 'Page title', 'compact' => true, 'desc' => '...']); ... paper_bottom();

function paper_ctx(): array {
    static $c = null;
    if ($c) return $c;
    $L = lang(); $S = settings(); $tr = $L === 'tr';
    $now = time();
    $mTr = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
    $mEn = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    $dTr = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
    $dEn = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    $m = (int)date('n', $now) - 1; $w = (int)date('w', $now);
    $c = [
        'L' => $L, 'S' => $S, 'tr' => $tr, 'other' => $tr ? 'en' : 'tr',
        'paper' => $tr ? 'Meşcere Postası' : 'The Stand Gazette',
        'title' => $tr ? $S['title_tr'] : $S['title_en'],
        'today' => ($tr ? $dTr[$w] : $dEn[$w]) . ', ' . date('j', $now) . ' ' . ($tr ? $mTr[$m] : $mEn[$m]) . ' ' . date('Y', $now),
        'issue' => (int)date('z', $now) + 1, 'year' => date('Y', $now),
    ];
    return $c;
}

const PAPER_ORN = '<svg class="orn" viewBox="0 0 90 18" aria-hidden="true"><path d="M2 9h30M58 9h30" stroke="currentColor" stroke-width="1"/><path d="M45 2 52 9 45 16 38 9z" fill="currentColor"/><circle cx="34" cy="9" r="2" fill="currentColor"/><circle cx="56" cy="9" r="2" fill="currentColor"/></svg>';

function paper_top(array $o = []): void {
    $c = paper_ctx(); $tr = $c['tr']; $S = $c['S'];
    $home = basename($_SERVER['SCRIPT_NAME'] ?? '') === 'index.php';
    $pre = $home ? '' : './';
    $pageTitle = ($o['title'] ?? '') !== '' ? $o['title'] . ' | ' . $c['paper'] : $c['paper'] . ' | ' . $c['title'] . ' ' . $S['name'];
    $desc = $o['desc'] ?? pick($S, 'bio', $c['L']);
    $q = $_GET; $q['lang'] = $c['other']; $langHref = '?' . http_build_query($q);
    ?><!doctype html>
<html lang="<?= $c['L'] ?>">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= h($pageTitle) ?></title>
<meta name="description" content="<?= h($desc) ?>">
<meta property="og:title" content="<?= h($pageTitle) ?>">
<meta property="og:description" content="<?= h($desc) ?>">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
<link rel="preload" href="assets/fonts/playfair-display-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/old-standard-tt-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/site.css?v=10">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' fill='%23000'/><text x='16' y='24' font-family='Georgia,serif' font-weight='900' font-size='22' fill='%23fff' text-anchor='middle'>M</text></svg>">
<script>try { var t = localStorage.getItem('theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) {} document.documentElement.classList.add('js');</script>
<?= $o['head'] ?? '' ?>
</head>
<body>
<div class="sheet">
<header class="mast<?= !empty($o['compact']) ? ' compact' : '' ?>" id="top">
  <div class="ears">
    <span><?= $tr ? 'Orman biyometrisi, ders notları ve yayınlar' : 'Forest biometrics, lecture notes and publications' ?></span>
    <?= PAPER_ORN ?>
    <span><?= $tr ? 'Öğrencilere ücretsiz dağıtılır' : 'Free to all students' ?></span>
  </div>
  <<?= $home ? 'h1' : 'p' ?> class="title"><a href="./" style="text-decoration:none"><?= h($c['paper']) ?></a></<?= $home ? 'h1' : 'p' ?>>
  <div class="dateline">
    <span class="num"><?= $tr ? ($c['year'] . ' yılı, sayı ' . $c['issue']) : ('Year ' . $c['year'] . ', No. ' . $c['issue']) ?></span>
    <span><?= h(($S['city'] ?? '') ?: 'Isparta') ?>, <?= h($c['today']) ?></span>
    <nav aria-label="<?= $tr ? 'Bölümler' : 'Sections' ?>">
      <a href="<?= $pre ?>#dersler"><?= $tr ? 'Ders notları' : 'Lecture notes' ?></a>
      <a href="<?= $pre ?>#yayinlar"><?= $tr ? 'Yayınlar' : 'Publications' ?></a>
      <a href="<?= $pre ?>#ekler"><?= $tr ? 'Ekler' : 'Supplements' ?></a>
      <a href="<?= $pre ?>#iletisim"><?= $tr ? 'İletişim' : 'Contact' ?></a>
      <span class="tools">
        <button type="button" id="theme" aria-label="<?= $tr ? 'Siyah zemin / beyaz zemin' : 'Black page / white page' ?>"><svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 1.5a6.5 6.5 0 0 1 0 13z" fill="currentColor"/></svg></button>
        <a href="<?= h($langHref) ?>" hreflang="<?= $c['other'] ?>" lang="<?= $c['other'] ?>" aria-label="<?= $c['other'] === 'en' ? 'English' : 'Türkçe' ?>"><?= strtoupper($c['other']) ?></a>
      </span>
    </nav>
  </div>
</header>
<?php
}

/** The supplements (tools): [file, label, title, long description, short description].
    Listed in the front-page sidebar under "Son Dakika" and in the footer of each tool. Add new tools here. */
function paper_supplements(): array {
    $tr = paper_ctx()['tr'];
    return [
        ['araclar/', $tr ? 'Yeni bölüm' : 'New section', $tr ? 'Ormancılık Biyometrisi Araçları' : 'Forest Biometrics Tools',
         $tr ? 'Tarayıcıda çalışan araç tezgâhı. İlk araç: Ormancılık Verisi Denetçisi; ağaç ve örnek alan tablolarını denetler, düzeltmeleri gerekçesiyle kaydeder.'
             : 'A workbench of in-browser tools. First tool: the Forest Data Checker, which checks tree and plot tables and logs every fix with its reason.',
         $tr ? 'Veri Denetçisi ve sıradaki araçlar' : 'Data Checker and the tools to come'],
        ['mescere.php', $tr ? 'Ek 1' : 'Supplement 1', $tr ? 'Meşcere Hesaplayıcı' : 'Stand Calculator',
         $tr ? 'Çap ve boy listesini yapıştırın; hektardaki ağaç sayısı, göğüs yüzeyi, orta çap, üst boy ve hacim hemen hesaplansın.'
             : 'Paste a list of diameters and heights; stems, basal area, mean diameter, top height and volume per hectare are computed at once.',
         $tr ? 'Çap ve boydan hektarda N, G, Dg, üst boy ve hacim' : 'N, G, Dg, top height and volume per ha from d and h'],
        ['araclar/cap-dagilimi.php', $tr ? 'Ek 2' : 'Supplement 2', $tr ? 'Çap Dağılımı Laboratuvarı' : 'Diameter Distribution Lab',
         $tr ? 'Araçlar bölümüne taşındı. Weibull sürümü: kendi çaplarınıza en çok olabilirlik ve momentlerle uydurun, sınıf frekanslarını kuyruklarıyla görün, eğri gezgininde a, b, c ile oynayın.'
             : 'Moved to the tools section. Weibull version: fit your own diameters by maximum likelihood and moments, see class frequencies with their tails, play with a, b, c in the curve explorer.',
         $tr ? 'Weibull: uydurma, sınıflar, eğri gezgini' : 'Weibull: fitting, classes, curve explorer'],
        ['bulmaca.php', $tr ? 'Ek 3' : 'Supplement 3', $tr ? 'Bulmaca Köşesi' : 'Crossword Corner',
         $tr ? 'Her gün yeni bir ormancılık bulmacası. Ağaç türleri, ölçüm aletleri, silvikültür ve biraz da istatistik.'
             : 'A new forestry crossword every day. Tree species, measuring instruments, silviculture and a little statistics.',
         $tr ? 'Her gün yeni bir ormancılık bulmacası' : 'A new forestry crossword every day'],
    ];
}

function paper_bottom(string $script = ''): void {
    $c = paper_ctx(); $tr = $c['tr'];
    $self = basename($_SERVER['SCRIPT_NAME'] ?? '');
    if ($self !== 'index.php') {
        echo '<aside class="more-sup"><p class="sc">' . ($tr ? 'Bu sayının diğer ekleri' : 'Other supplements in this issue') . '</p><ul>';
        foreach (paper_supplements() as $s) if ($s[0] !== $self) echo '<li><a href="' . $s[0] . '"><b>' . h($s[2]) . '</b></a> ' . h($s[3]) . '</li>';
        echo '<li><a href="./"><b>' . ($tr ? 'Ön sayfaya dön' : 'Back to the front page') . '</b></a></li></ul></aside>';
    }
    ?>
<footer class="foot">
  <span><?= h($c['paper']) ?>, <?= $tr ? 'Isparta\'da yayımlanır.' : 'published in Isparta.' ?> © <?= date('Y') ?> <?= h($c['S']['name']) ?></span>
  <a href="#top"><?= $tr ? 'Başa dön' : 'Back to top' ?></a>
</footer>
</div>
<script>
document.getElementById('theme').addEventListener('click', () => {
  const root = document.documentElement;
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
});
// switching language keeps page state kept in the URL hash (Weibull parameters, random puzzle)
document.querySelector('.tools a[hreflang]').addEventListener('click', e => { if (location.hash) e.currentTarget.href = e.currentTarget.getAttribute('href') + location.hash; });
</script>
<?= $script ?>
</body>
</html>
<?php
}
