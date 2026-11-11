<?php
// User guide (TR/EN): what each tool does and how to use it. Content in inc/guide/{tr,en}.php; formulas stay in the
// tools' "Details" disclosures and in docs/METHODS.md. Section ids are the tools' file names (kilavuz.php#cap-dagilimi).
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];
site_top([
    'title' => $tr ? 'Kullanım kılavuzu' : 'User guide',
    'lede'  => $tr ? 'Araçların ne yaptığı, hangi veriyi beklediği ve sonuçların nasıl okunacağı. Formüller ve kaynaklar her aracın "Ayrıntılar" kutularında ve "Yöntemler, birimler ve kaynaklar" panelindedir.'
                   : 'What each tool does, which data it expects and how to read the results. Formulas and sources are in each tool\'s "Details" disclosures and its "Methods, units and sources" panel.',
    'desc'  => $tr ? 'Ormancılık Biyometrisi Araçları kullanım kılavuzu: veri hazırlama, örnek alan ve meşcere ölçüleri, model başarısı, çap dağılımları, boy–çap modelleri, örnekleme planı, nispi sıralama.'
                   : 'User guide of the Forest Biometrics Tools: data checking, plot and stand metrics, model evaluation, diameter distributions, height–diameter models, sampling planning, relative ranking.',
]);
$tools = site_tools();
$toc = array_merge([['id' => 'genel', 't' => $tr ? 'Genel' : 'General'], ['id' => 'is-akisi', 't' => $tr ? 'Araçlar birlikte' : 'Tools together']],
    array_map(function ($t) { return ['id' => basename($t['file'], '.php'), 't' => $t['title']]; }, $tools));
?>
  <div class="guide">
    <nav class="guide-toc card" aria-label="<?= $tr ? 'İçindekiler' : 'Contents' ?>">
      <p class="b-cat"><?= $tr ? 'İçindekiler' : 'Contents' ?></p>
      <ol><?php foreach ($toc as $x): ?><li><a href="#<?= h($x['id']) ?>"><?= h($x['t']) ?></a></li><?php endforeach; ?></ol>
    </nav>
    <div class="guide-body">
<?php
$V = []; foreach ($tools as $t) $V[basename($t['file'], '.php')] = $t['v'];   // versions shown next to each tool's heading
$sec = function (string $id, string $title) use ($V, $tr) {
    $v = isset($V[$id]) ? ' <span class="b-ver">' . ($tr ? 'sürüm ' : 'version ') . h($V[$id]) . '</span>' : '';
    $link = isset($V[$id]) ? ' <a class="guide-open" href="' . h($id) . '.php">' . ($tr ? 'Aracı aç' : 'Open the tool') . ' →</a>' : '';
    return '<h2 id="' . h($id) . '" class="b-h2">' . h($title) . $v . '</h2>' . ($link ? '<p class="small">' . $link . '</p>' : '');
};
require __DIR__ . '/inc/guide/' . ($tr ? 'tr' : 'en') . '.php';
?>
    </div>
  </div>
<?php site_bottom();
