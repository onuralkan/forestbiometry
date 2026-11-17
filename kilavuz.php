<?php
// User guide (TR/EN): what each tool does and how to use it. One page per section: kilavuz.php?k=<id>, the id being the
// tool's file name (or genel / is-akisi); without k, the start page with task cards (inc/guide/cards.php). Content in
// inc/guide/{tr,en}/<id>.php, one file per section and language, so that work on one tool touches one file.
// Old links (kilavuz.php#<id>) are sent on by a small script, since the part after # never reaches the server.
// Formulas stay in the tools' "Details" disclosures and in docs/METHODS.md.
require __DIR__ . '/inc/site.php';
require __DIR__ . '/inc/guide/cards.php';
$tr = site_ctx()['tr']; $L = $tr ? 'tr' : 'en';
$tools = site_tools();
$byId = []; foreach ($tools as $t) $byId[basename($t['file'], '.php')] = $t;
$start = [['id' => 'genel', 't' => $tr ? 'Genel' : 'General'], ['id' => 'is-akisi', 't' => $tr ? 'Araçlar birlikte' : 'Tools together'], ['id' => 'sorun-giderme', 't' => $tr ? 'Sorun giderme' : 'Troubleshooting']];
$order = array_merge(array_column($start, 'id'), array_keys($byId));
$titleOf = function (string $id) use ($start, $byId) { foreach ($start as $x) if ($x['id'] === $id) return $x['t']; return isset($byId[$id]) ? $byId[$id]['title'] : $id; };
$k = isset($_GET['k']) && is_string($_GET['k']) ? $_GET['k'] : '';
$ok = $k !== '' && in_array($k, $order, true) && is_file(__DIR__ . "/inc/guide/$L/$k.php");
$unknown = $k !== '' && !$ok;
if (!$ok) $k = '';
site_top([
    'title' => $k ? $titleOf($k) . ($tr ? ' · Kullanım kılavuzu' : ' · User guide') : ($tr ? 'Kullanım kılavuzu' : 'User guide'),
    'lede'  => $k ? '' : ($tr ? 'Araçların ne yaptığı, hangi veriyi beklediği ve sonuçların nasıl okunacağı. Elinizdeki işe göre başlayın ya da soldaki listeden bir araç seçin. Formüller ve kaynaklar her aracın "Ayrıntılar" bölümlerinde ve yöntem belgesindedir.'
                              : 'What each tool does, which data it expects and how to read the results. Start from what you want to do, or choose a tool from the list on the left. Formulas and sources are in each tool\'s "Details" disclosures and in the methods document.'),
    'desc'  => $k ? ($tr ? 'Kullanım kılavuzu: ' : 'User guide: ') . $titleOf($k)
                  : ($tr ? 'Ormancılık Biyometrisi Araçları kullanım kılavuzu: veri hazırlama, ağaç ve meşcere ölçüleri, modeller, katsayılar, tekrarlanabilirlik.'
                         : 'User guide of the Forest Biometrics Tools: data checking, tree and stand measures, models, coefficients, reproducibility.'),
    'query' => $k ? 'k=' . $k : '',
]);
$V = []; foreach ($byId as $id => $t) $V[$id] = $t['v'];   // versions shown next to each tool's heading
$sec = function (string $id, string $title) use ($V, $tr) {
    $v = isset($V[$id]) ? ' <span class="b-ver">' . ($tr ? 'sürüm ' : 'version ') . h($V[$id]) . '</span>' : '';
    $link = isset($V[$id]) ? ' <a class="guide-open" href="' . h($id) . '.php">' . ($tr ? 'Aracı aç' : 'Open the tool') . ' →</a>' : '';
    return '<h2 id="' . h($id) . '" class="b-h2">' . h($title) . $v . '</h2>' . ($link ? '<p class="small">' . $link . '</p>' : '');
};
$href = function (string $id) { return 'kilavuz.php?k=' . rawurlencode($id); };
// navigation: getting started, then the modules of the catalogue with their tools, in the sidebar's order
$groups = [['id' => 'start', 'title' => $tr ? 'Başlarken' : 'Getting started', 'ids' => array_column($start, 'id')]];
foreach (site_modules() as $m) { $ids = array_keys(array_filter($byId, function ($t) use ($m) { return $t['cat'] === $m['id']; })); if ($ids) $groups[] = ['id' => $m['id'], 'title' => $m['title'], 'ids' => $ids]; }
?>
  <script>
  (function () { var id = decodeURIComponent((location.hash || '').slice(1)); var q = new URLSearchParams(location.search);
    if (id && !q.get('k') && /^[a-z0-9-]+$/.test(id)) { q.set('k', id); location.replace('kilavuz.php?' + q.toString()); } })();
  </script>
  <div class="guide">
    <nav class="guide-toc card" aria-label="<?= $tr ? 'Kılavuz bölümleri' : 'Guide sections' ?>">
      <p class="b-cat"><a href="kilavuz.php"<?= $k ? '' : ' aria-current="page"' ?>><?= $tr ? 'Kılavuz ana sayfası' : 'Guide home' ?></a></p>
      <label class="guide-find"><span class="vh"><?= $tr ? 'Bölüm ara' : 'Find a section' ?></span><input type="search" id="guide-find" placeholder="<?= $tr ? 'Bölüm ara…' : 'Find a section…' ?>" autocomplete="off"></label>
<?php foreach ($groups as $g): $open = !$k || in_array($k, $g['ids'], true); ?>
      <details class="guide-grp"<?= $open ? ' open' : '' ?>><summary><?= h($g['title']) ?></summary>
        <ul><?php foreach ($g['ids'] as $id): ?><li><a href="<?= h($href($id)) ?>"<?= $id === $k ? ' aria-current="page"' : '' ?>><?= h($titleOf($id)) ?></a></li><?php endforeach; ?></ul>
      </details>
<?php endforeach; ?>
    </nav>
    <div class="guide-body">
<?php if ($k): $i = array_search($k, $order, true); $prev = $i > 0 ? $order[$i - 1] : null; $next = $i < count($order) - 1 ? $order[$i + 1] : null;
    require __DIR__ . "/inc/guide/$L/$k.php"; ?>
      <nav class="guide-pager" aria-label="<?= $tr ? 'Önceki ve sonraki bölüm' : 'Previous and next section' ?>">
        <?php if ($prev): ?><a class="btn ghost" rel="prev" href="<?= h($href($prev)) ?>">← <?= h($titleOf($prev)) ?></a><?php else: ?><span></span><?php endif; ?>
        <?php if ($next): ?><a class="btn ghost" rel="next" href="<?= h($href($next)) ?>"><?= h($titleOf($next)) ?> →</a><?php endif; ?>
      </nav>
<?php else: ?>
<?php if ($unknown): ?>      <p class="note warn" id="guide-unknown"><?= $tr ? 'İstenen bölüm bulunamadı; aşağıdan seçin.' : 'The section asked for was not found; choose one below.' ?></p>
<?php endif; ?>
      <p class="guide-intro"><?= $tr ? 'İlk kez kullanıyorsanız <a href="' . h($href('genel')) . '">Genel</a> bölümüyle başlayın: veri girme, ondalık ayırıcı, birimler, indirmeler ve örnek veriler bütün araçlarda aynıdır.'
                                     : 'If this is your first time, start with <a href="' . h($href('genel')) . '">General</a>: entering data, the decimal separator, units, downloads and sample data work the same in every tool.' ?></p>
      <p class="note"><?= $tr ? 'Sayfalar yüklenmiyor, boş ya da yarım görünüyorsa: <a href="' . h($href('sorun-giderme')) . '">Sorun giderme</a> (tarayıcıda QUIC\'i kapatma).'
                                : 'Pages do not load, or look blank or half-loaded? See <a href="' . h($href('sorun-giderme')) . '">Troubleshooting</a> (turning QUIC off in the browser).' ?></p>
      <div class="gcards" role="list">
<?php foreach (guide_cards($tr) as $c): $ids = array_values(array_filter($c['ids'], function ($id) use ($order) { return in_array($id, $order, true); })); if (!$ids) continue; ?>
        <section class="card gcard" role="listitem" data-card="<?= h($c['id']) ?>"><h2 class="b-h3"><?= h($c['title']) ?></h2><p class="muted small"><?= h($c['text']) ?></p>
          <ul><?php foreach ($ids as $id): ?><li><a href="<?= h($href($id)) ?>"><?= h($titleOf($id)) ?></a></li><?php endforeach; ?></ul></section>
<?php endforeach; ?>
      </div>
<?php endif; ?>
    </div>
  </div>
  <script>
  (function () { var f = document.getElementById('guide-find'); if (!f) return;
    var norm = function (s) { return s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i'); };
    f.addEventListener('input', function () { var q = norm(f.value.trim());
      document.querySelectorAll('.guide-grp').forEach(function (g) { var any = false;
        g.querySelectorAll('li').forEach(function (li) { var hit = !q || norm(li.textContent).indexOf(q) >= 0; li.hidden = !hit; any = any || hit; });
        g.hidden = !any; if (q && any) g.open = true; }); }); })();
  </script>
<?php site_bottom();
