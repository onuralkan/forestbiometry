<?php
require __DIR__ . '/../inc/common.php';
require __DIR__ . '/../inc/paper.php';
require __DIR__ . '/../inc/bench.php';
$c = paper_ctx(); $tr = $c['tr'];
bench_top([
    'title'  => $tr ? 'Ormancılık Biyometrisi Araçları' : 'Forest Biometrics Tools',
    'kicker' => $tr ? 'Meşcere Postası\'nın araç tezgâhı' : 'The workbench of The Stand Gazette',
    'lede'   => $tr ? 'Orman envanteri ve biyometri verileri için tarayıcıda çalışan araçlar. Verileriniz sunucuya gönderilmez; katsayılar ve denklemler sizin girdiklerinizdir.'
                    : 'Browser-based tools for forest inventory and biometrics data. Your data are not sent to the server; coefficients and equations are the ones you enter.',
    'desc'   => $tr ? 'Orman envanteri ve biyometri verileri için tarayıcıda çalışan araçlar.' : 'Browser-based tools for forest inventory and biometrics data.',
]);
?>
  <section class="card" id="handoff" aria-live="polite" hidden>
    <h2><?= $tr ? 'Onaylanmış veri' : 'Approved dataset' ?></h2>
    <p id="handoff-text"></p>
    <p class="b-actions"><a class="btn" href="veri-denetcisi.php"><?= $tr ? 'Denetçide aç' : 'Open in the checker' ?></a>
      <button type="button" class="btn ghost" id="handoff-clear"><?= $tr ? 'Bu tarayıcıdan sil' : 'Remove from this browser' ?></button></p>
  </section>

  <section aria-labelledby="h-tools">
    <h2 id="h-tools" class="b-h2"><?= $tr ? 'Araçlar' : 'Tools' ?></h2>
    <ol class="toollist">
      <?php foreach (bench_tools() as $t): ?>
      <li class="<?= $t['file'] ? 'ready' : 'planned' ?>">
        <span class="tn"><?= $t['n'] ?></span>
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
    </ol>
  </section>

  <section aria-labelledby="h-old">
    <h2 id="h-old" class="b-h2"><?= $tr ? 'Gazetenin önceki ekleri' : 'Earlier supplements of the paper' ?></h2>
    <p class="muted"><?= $tr ? 'Bu araçlar yeni bölümdeki karşılıkları hazır olana kadar eski adreslerinde çalışmaya devam eder.' : 'These keep working at their old addresses until their counterparts in this section are ready.' ?></p>
    <ul class="oldlist">
      <li><a href="../mescere.php"><?= $tr ? 'Meşcere Hesaplayıcı' : 'Stand Calculator' ?></a></li>
      <li><a href="../weibull.php"><?= $tr ? 'Çap Dağılımı Laboratuvarı' : 'Diameter Distribution Lab' ?></a></li>
      <li><a href="../bulmaca.php"><?= $tr ? 'Bulmaca Köşesi' : 'Crossword Corner' ?></a></li>
    </ul>
  </section>
<?php
ob_start(); ?>
<script type="module">
import { get, del } from '../assets/lab/core/store.js';
const tr = document.documentElement.lang !== 'en';
const box = document.getElementById('handoff');
async function show() {
  const ds = await get('dataset:approved');
  if (!ds || ds.schema !== 'forest-dataset/1') { box.hidden = true; return; }
  const when = new Date(ds.created).toLocaleString(tr ? 'tr-TR' : 'en-GB');
  const src = ds.source && ds.source.trees ? ds.source.trees.name : '';
  document.getElementById('handoff-text').textContent = tr
    ? `${src ? '"' + src + '", ' : ''}${ds.trees.length} ağaç kaydı, ${ds.plots.length} örnek alan; ${when} tarihinde onaylandı. Bu veri yalnızca bu tarayıcıda saklanıyor; hazır olduğunda sonraki araçlar kullanmayı önerecek.`
    : `${src ? '"' + src + '", ' : ''}${ds.trees.length} tree records, ${ds.plots.length} plots; approved ${when}. Stored only in this browser; the next tools will offer to use it once they are ready.`;
  box.hidden = false;
}
document.getElementById('handoff-clear').addEventListener('click', async () => { await del('dataset:approved'); show(); });
show();
</script>
<?php bench_bottom(ob_get_clean());
