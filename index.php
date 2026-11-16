<?php
require __DIR__ . '/inc/site.php';
require __DIR__ . '/inc/hero.php';
$tr = site_ctx()['tr'];

site_top([
    'desc' => $tr ? 'Orman envanteri ve biyometri verileri için tarayıcıda çalışan araçlar: veri denetimi, meşcere değerleri, örnekleme, çap dağılımları, boy–çap modelleri, model değerlendirme.'
                  : 'Browser-based tools for forest inventory and biometrics: data checking, stand metrics, sampling, diameter distributions, height–diameter models, model evaluation.',
]);
$tools = site_tools();
?>
  <?php $cat = site_catalog(); $nLive = count(array_filter($cat, function ($c) { return $c['status'] === 'live'; })); $nAll = count($cat); ?>
  <section class="hero" aria-labelledby="hero-h">
    <div class="hz-glow" aria-hidden="true"></div>
    <div class="hero-text">
      <p class="hz-pill"><span class="hz-dotlive" aria-hidden="true"></span><?= $tr ? 'Açık kaynak · Veriniz tarayıcıdan çıkmaz' : 'Open source · Your data stay in your browser' ?><?php if (SITE_DOI !== ''): ?> · <a href="https://doi.org/<?= h(SITE_DOI) ?>">DOI</a><?php endif; ?></p>
      <h1 id="hero-h"><?= $tr ? 'Ormancılık Biyometrisi <span class="hz-grad">Araçları</span>' : 'Forest Biometrics <span class="hz-grad">Tools</span>' ?></h1>
      <p class="hero-lede"><?= $tr ? 'Ağaç ve örnek alan ölçümlerinizi denetleyin, meşcere değerlerini hesaplayın, dağılım ve boy–çap modelleri kurun, modelleri karşılaştırın. Her formülün kaynağı yazılı; katsayıları siz girersiniz.'
                                       : 'Check your tree and plot measurements, compute stand values, fit distributions and height–diameter models, compare models. Every formula has its source written down; coefficients are yours to enter.' ?></p>
      <p class="b-actions"><a class="btn" href="veri-denetcisi.php"><?= site_icon('checker') ?><?= $tr ? 'Veriyi denetleyerek başla' : 'Start by checking your data' ?></a>
        <a class="btn ghost" href="#h-tools"><?= $tr ? 'Bütün araçlar' : 'All tools' ?></a></p>
      <ul class="hz-stats">
        <li><b><?= $nLive ?></b><span><?= $tr ? 'araç yayında' : 'tools live' ?></span></li>
        <li><b><?= $nAll ?></b><span><?= $tr ? 'araçlık plan' : 'tools in the plan' ?></span></li>
        <li><b><?= count(site_modules()) ?></b><span><?= $tr ? 'modül' : 'modules' ?></span></li>
        <li><b>0</b><span><?= $tr ? 'sunucuya giden ölçüm' : 'measurements sent to a server' ?></span></li>
      </ul>
    </div>
    <div class="hz-show"><?= hero_showcase($tr) ?></div>
  </section>

  <section class="card" id="handoff" aria-live="polite" hidden>
    <h2><?= $tr ? 'Etkin veri paketi' : 'Active data package' ?></h2>
    <p id="handoff-text"></p>
    <p class="b-actions"><a class="btn" href="ornek-alan.php"><?= $tr ? 'Örnek Alan ve Meşcere Hesaplayıcısı\'nda kullan' : 'Use in Plot & Stand Metrics' ?></a>
      <a class="btn ghost" href="veri-yoneticisi.php"><?= $tr ? 'Envanter Verisi Yöneticisi' : 'Inventory Data Manager' ?></a>
      <button type="button" class="btn ghost" id="handoff-clear"><?= $tr ? 'Etkinliği kaldır' : 'Deactivate' ?></button></p>
  </section>

  <section class="dir" aria-labelledby="h-tools">
    <h2 id="h-tools" class="b-h2"><?= $tr ? 'Araçlar' : 'Tools' ?></h2>
    <p class="muted dir-note"><?= $tr ? 'Araçlar on bir modülde toplanır; her kart bir araca götürür, kartlardaki çizimler aracın çıktı türünü gösteren temsilî çizimlerdir (veri değildir). Modüller başlıklarına tıklayınca açılır. Soluk kartlar henüz yayında olmayan araçlardır: "Yolda" olanlar geliştiriliyor, "Yakında" olanlar planlı. Planın tamamı ve kimlikleri: proje deposundaki docs/PLATFORM_PLAN.md.' : 'Tools are grouped in eleven modules; each card opens a tool, its drawing illustrates the kind of output (it is not data). Modules open when you click their heading. Faded cards are tools not yet live: "In progress" ones are being built, "Soon" ones are planned. The full plan and the tool ids: docs/PLATFORM_PLAN.md in the project repository.' ?></p>
    <p class="dir-all"><button type="button" class="btn ghost small" id="dir-open"><?= $tr ? 'Tümünü aç' : 'Open all' ?></button> <button type="button" class="btn ghost small" id="dir-close"><?= $tr ? 'Tümünü kapat' : 'Close all' ?></button></p>
    <?php $catalog = site_catalog(); foreach (site_modules() as $mod): $it = site_module_items($mod['id'], $tools, $catalog); $nl = count($it['home']); $np = count($it['planned']); ?>
    <div class="dir-group" id="mod-<?= $mod['id'] ?>" data-mod="<?= $mod['id'] ?>">
      <button type="button" class="dir-cat" aria-expanded="true" aria-controls="dir-<?= $mod['id'] ?>">
        <span class="dir-t"><span class="dir-h"><?= h($mod['title']) ?></span><span class="dir-d"><?= h($mod['desc']) ?></span></span>
        <span class="dir-n"><?= $nl ? '<span class="dir-live">' . $nl . ' ' . ($tr ? 'yayında' : 'live') . '</span>' : '' ?><?= $np ? '<span>' . $np . ' ' . ($tr ? 'yolda ve planlı' : 'coming') . '</span>' : '' ?></span>
        <?= site_icon('chev', 'ico chev') ?>
      </button>
      <div class="dir-body" id="dir-<?= $mod['id'] ?>">
      <?php if ($it['home'] || $it['planned']): ?>
      <div class="dir-cards" role="list" aria-label="<?= h($mod['title']) ?>">
        <?php foreach ($it['home'] as $t) echo tool_card($t, $tr); foreach ($it['planned'] as $c) echo soon_card($c, $tr); ?>
      </div>
      <?php endif; if ($it['also']): ?>
      <p class="dir-also"><?= $tr ? 'Bu modülde ayrıca' : 'Also in this module' ?>: <?= implode(', ', array_map(function ($c) { return '<a href="' . h($c['page']) . '">' . h($c['name']) . '</a>'; }, $it['also'])) ?></p>
      <?php endif; ?>
      </div>
    </div>
    <?php endforeach; ?>
  </section>

<?php
ob_start(); ?>
<script type="module">
import { get, del } from './assets/lab/core/store.js';
// module groups of the tools index open and close like the sidebar's; closed by default, remembered in this browser
{ let st = {}; try { st = JSON.parse(localStorage.getItem('dirMods') || '{}'); } catch (e) {}
  const groups = [...document.querySelectorAll('.dir-group[data-mod]')];
  const set = (g, open, keep = true) => { g.classList.toggle('collapsed', !open); g.querySelector('.dir-cat').setAttribute('aria-expanded', open ? 'true' : 'false'); if (keep) st[g.dataset.mod] = open ? 1 : 0; };
  const save = () => { try { localStorage.setItem('dirMods', JSON.stringify(st)); } catch (e) {} };
  const hash = location.hash.replace('#mod-', '');
  for (const g of groups) { set(g, g.dataset.mod === hash || !!st[g.dataset.mod], false); g.querySelector('.dir-cat').addEventListener('click', () => { set(g, g.classList.contains('collapsed')); save(); }); }
  document.getElementById('dir-open').addEventListener('click', () => { groups.forEach(g => set(g, true)); save(); });
  document.getElementById('dir-close').addEventListener('click', () => { groups.forEach(g => set(g, false)); save(); }); }   // keys of core/projects.js (DI-03), read directly to keep this page light
const tr = document.documentElement.lang !== 'en';
const box = document.getElementById('handoff');
async function show() {
  const ds = await get('dataset:approved');
  if (!ds || ds.schema !== 'forest-dataset/1') { box.hidden = true; return; }
  const when = new Date(ds.created).toLocaleString(tr ? 'tr-TR' : 'en-GB');
  const id = await get('project:active'), p = id ? await get('project:' + id) : null;
  const src = p ? p.name : ds.source && ds.source.trees ? ds.source.trees.name : '';
  document.getElementById('handoff-text').textContent = tr
    ? `${src ? '"' + src + '", ' : ''}${ds.trees.length} ağaç kaydı, ${ds.plots.length} örnek alan; ${when} tarihinde onaylandı. Bu veri yalnızca bu tarayıcıda saklanıyor; onaylanmış veriyi okuyan araçlar bu paketi kullanır. "Etkinliği kaldır" paketi silmez; Envanter Verisi Yöneticisi'nde kalır.`
    : `${src ? '"' + src + '", ' : ''}${ds.trees.length} tree records, ${ds.plots.length} plots; approved ${when}. Stored only in this browser; the tools that read approved data use this package. "Deactivate" does not delete it; it stays in the Inventory Data Manager.`;
  box.hidden = false;
}
document.getElementById('handoff-clear').addEventListener('click', async () => { await del('project:active'); await del('dataset:approved'); show(); });
show();
</script>
<?php site_bottom(ob_get_clean());
