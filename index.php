<?php
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];

/**
 * Stem map of one circular plot, drawn for the home page only (illustration, not data): 500 m² plot (r = 12.62 m),
 * tree positions and diameters from a fixed-seed generator (docs/METHODS.md §4). Circles are diameters × 12 so they show.
 */
function stem_map(bool $tr): string {
    $seed = 20261109; $rnd = function () use (&$seed) { $seed = ($seed * 1103515245 + 12345) % 2147483648; return $seed / 2147483648; };
    $R = 12.62; $S = 13.6; $px = 15.5;                         // plot radius (m), drawing half-width (m), pixels per metre
    $trees = []; $tries = 0;
    while (count($trees) < 34 && $tries++ < 4000) {
        $r = $R * sqrt($rnd()); $a = 2 * M_PI * $rnd(); $x = $r * cos($a); $y = $r * sin($a);
        $d = 8 + 46 * pow($rnd(), 2.1);                         // dbh, cm
        $ok = true; foreach ($trees as $t) if (hypot($t[0] - $x, $t[1] - $y) < ($t[2] + $d) * 0.012 * 6 + 0.35) { $ok = false; break; }
        if ($ok) $trees[] = [$x, $y, $d, $rnd() < 0.68 ? 1 : 2];
    }
    $W = 2 * $S * $px; $c = $W / 2; $o = '';
    $o .= '<circle class="sm-plot" cx="' . $c . '" cy="' . $c . '" r="' . round($R * $px, 1) . '"/>';
    $o .= '<path class="sm-axis" d="M' . ($c - 7) . ' ' . $c . 'h14M' . $c . ' ' . ($c - 7) . 'v14"/>';
    usort($trees, function ($a, $b) { return $b[2] <=> $a[2]; });
    foreach ($trees as $i => $t) {
        $rr = round($t[2] / 100 * 12 / 2 * $px, 1);              // radius in px: diameter × 12, halved
        $o .= '<circle class="sm-t sm-s' . $t[3] . '" style="--i:' . $i . '" cx="' . round($c + $t[0] * $px, 1) . '" cy="' . round($c - $t[1] * $px, 1) . '" r="' . $rr . '"/>';
    }
    $o .= '<g class="sm-north" transform="translate(' . ($W - 26) . ' 30)"><path d="M0 -14 6 6 0 2 -6 6Z"/><text y="22" text-anchor="middle">' . ($tr ? 'K' : 'N') . '</text></g>';
    $bar = 5 * $px;
    $o .= '<g class="sm-scale" transform="translate(14 ' . ($W - 18) . ')"><path d="M0 0h' . $bar . 'M0 -4v8M' . $bar . ' -4v8"/><text x="' . ($bar / 2) . '" y="-8" text-anchor="middle">5 m</text></g>';
    $lab = $tr ? 'Dairesel bir örnek alanın gövde haritası: çizim, gerçek ölçüm değil' : 'Stem map of a circular plot: illustration, not real measurements';
    return '<svg class="stemmap" viewBox="0 0 ' . $W . ' ' . $W . '" role="img" aria-label="' . h($lab) . '"><title>' . h($lab) . '</title>' . $o . '</svg>';
}

site_top([
    'desc' => $tr ? 'Orman envanteri ve biyometri verileri için tarayıcıda çalışan araçlar: veri denetimi, meşcere değerleri, örnekleme, çap dağılımları, boy–çap modelleri, model değerlendirme.'
                  : 'Browser-based tools for forest inventory and biometrics: data checking, stand metrics, sampling, diameter distributions, height–diameter models, model evaluation.',
]);
$tools = site_tools();
?>
  <section class="hero" aria-labelledby="hero-h">
    <div class="hero-text">
      <h1 id="hero-h"><?= $tr ? 'Ormancılık Biyometrisi Araçları' : 'Forest Biometrics Tools' ?></h1>
      <p class="hero-lede"><?= $tr ? 'Ağaç ve örnek alan ölçümlerinizi denetleyin, meşcere değerlerini hesaplayın, dağılım ve boy–çap modelleri kurun, modelleri karşılaştırın. Her formülün kaynağı yazılı; katsayıları siz girersiniz.'
                                     : 'Check your tree and plot measurements, compute stand values, fit distributions and height–diameter models, compare models. Every formula has its source written down; coefficients are yours to enter.' ?></p>
      <p class="hero-local"><?= $tr ? 'Dosyalarınız bu tarayıcıda açılır ve işlenir; sunucuya gönderilmez.' : 'Your files are opened and processed in this browser; they are not sent to the server.' ?></p>
      <p class="b-actions"><a class="btn" href="veri-denetcisi.php"><?= site_icon('checker') ?><?= $tr ? 'Veriyi denetleyerek başla' : 'Start by checking your data' ?></a>
        <a class="btn ghost" href="#h-tools"><?= $tr ? 'Bütün araçlar' : 'All tools' ?></a></p>
    </div>
    <figure class="hero-map">
      <?= stem_map($tr) ?>
      <figcaption><span class="sm-key"><i class="sm-s1"></i><?= $tr ? 'tür A' : 'species A' ?></span><span class="sm-key"><i class="sm-s2"></i><?= $tr ? 'tür B' : 'species B' ?></span>
        <span><?= $tr ? '500 m²\'lik bir örnek alanın gövde haritası. Daireler göğüs çapıyla orantılıdır (12 kat büyütülmüş). Çizimdir; ağaçlar benzetimdir.' : 'Stem map of a 500 m² plot. Circles are proportional to diameter at breast height (enlarged 12×). An illustration; the trees are simulated.' ?></span></figcaption>
    </figure>
  </section>

  <section class="card" id="handoff" aria-live="polite" hidden>
    <h2><?= $tr ? 'Onaylanmış veri' : 'Approved dataset' ?></h2>
    <p id="handoff-text"></p>
    <p class="b-actions"><a class="btn" href="ornek-alan.php"><?= $tr ? 'Örnek Alan ve Meşcere Hesaplayıcısı\'nda kullan' : 'Use in Plot & Stand Metrics' ?></a>
      <a class="btn ghost" href="veri-denetcisi.php"><?= $tr ? 'Denetçide aç' : 'Open in the checker' ?></a>
      <button type="button" class="btn ghost" id="handoff-clear"><?= $tr ? 'Bu tarayıcıdan sil' : 'Remove from this browser' ?></button></p>
  </section>

  <section class="dir" aria-labelledby="h-tools">
    <h2 id="h-tools" class="b-h2"><?= $tr ? 'Araçlar' : 'Tools' ?></h2>
    <?php foreach (site_cats() as $cat): $list = array_values(array_filter($tools, function ($t) use ($cat) { return $t['cat'] === $cat['id']; })); if (!$list) continue; ?>
    <div class="dir-group">
      <div class="dir-cat"><h3><?= h($cat['title']) ?></h3><p><?= h($cat['desc']) ?></p></div>
      <ul class="toollist">
        <?php foreach ($list as $t): ?>
        <li class="<?= $t['file'] ? 'ready' : 'planned' ?>">
          <span class="tico" aria-hidden="true"><?= site_icon($t['icon']) ?></span>
          <div>
            <?php if ($t['file']): ?>
            <h3><a href="<?= h($t['file']) ?>"><?= h($t['title']) ?></a></h3>
            <p><?= h($t['desc']) ?></p>
            <?php else: ?>
            <h3><?= h($t['title']) ?></h3>
            <p class="muted"><?= $tr ? 'Hazırlanıyor; henüz kullanıma açık değil.' : 'In preparation; not available yet.' ?></p>
            <?php endif; ?>
          </div>
        </li>
        <?php endforeach; ?>
      </ul>
    </div>
    <?php endforeach; ?>
  </section>

<?php
ob_start(); ?>
<script type="module">
import { get, del } from './assets/lab/core/store.js';
const tr = document.documentElement.lang !== 'en';
const box = document.getElementById('handoff');
async function show() {
  const ds = await get('dataset:approved');
  if (!ds || ds.schema !== 'forest-dataset/1') { box.hidden = true; return; }
  const when = new Date(ds.created).toLocaleString(tr ? 'tr-TR' : 'en-GB');
  const src = ds.source && ds.source.trees ? ds.source.trees.name : '';
  document.getElementById('handoff-text').textContent = tr
    ? `${src ? '"' + src + '", ' : ''}${ds.trees.length} ağaç kaydı, ${ds.plots.length} örnek alan; ${when} tarihinde onaylandı. Bu veri yalnızca bu tarayıcıda saklanıyor; Örnek Alan ve Meşcere Hesaplayıcısı bu veriyi kullanır.`
    : `${src ? '"' + src + '", ' : ''}${ds.trees.length} tree records, ${ds.plots.length} plots; approved ${when}. Stored only in this browser; Plot & Stand Metrics uses it.`;
  box.hidden = false;
}
document.getElementById('handoff-clear').addEventListener('click', async () => { await del('dataset:approved'); show(); });
show();
</script>
<?php site_bottom(ob_get_clean());
