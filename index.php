<?php
// Home page (20 Nov 2026, user decision): a short statement of what the platform does, a search over every tool,
// recently used tools, six direct links in three groups (an editorial choice of different basic tasks, not a ranking),
// the way to the full tools index (tools.php), first-use guidance and where the scientific basis is documented.
// The full catalogue, module and task filters live in tools.php; old links of this page (?q=, ?m=, ?task=,
// #mod-XX) are sent there with the same meaning. Data: inc/home.php.
require __DIR__ . '/inc/site.php';
require __DIR__ . '/inc/home.php';
if (isset($_GET['q']) || isset($_GET['m']) || isset($_GET['task'])) {        // links to the old directory on this page
    header('Location: tools.php?' . http_build_query($_GET), true, 302); exit;
}
site_top([
    'desc' => 'Forest Biometry: browser-based calculation and modelling tools for forest inventory and tree measurements, with their methods, assumptions and sources.',
]);
$dir = home_directory(); $tasks = home_tasks(); $picks = home_picks();
$all = []; foreach ($dir as $m) foreach ($m['tools'] as $t) $all[] = $t + ['modTitle' => $m['title']];
$nTools = count($all);
$titleOf = array_column($all, 'short', 'file');
$magnifier = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/></svg>';
?>
  <div class="hp-hero">
  <div class="hp-hero-main">
  <section class="hp-intro" aria-labelledby="hp-h">
    <h1 id="hp-h"><?= 'Calculation and modelling for your forest measurements.' ?></h1>
    <p class="hp-lede"><?= 'Analyse your tree and stand data in the browser. See each tool\'s methods, assumptions and sources.' ?></p>
    <p class="hp-data"><?= 'Your raw data are not sent to a server.' ?> <a href="privacy.php"><?= 'Details' ?></a></p>
  </section>

  <section class="hp-find" role="search" aria-labelledby="hp-q-l">
    <label class="hp-qlabel" id="hp-q-l" for="tool-q"><?= 'Find a tool or method' ?></label>
    <span class="hm-q"><?= $magnifier ?>
      <input type="search" id="tool-q" autocomplete="off" spellcheck="false" aria-describedby="tool-count" aria-controls="hp-results" placeholder="<?= 'E.g. Weibull, site index, RMSE' ?>">
      <kbd class="hm-kbd" title="<?= 'Go to search' ?>">/</kbd></span>
    <div class="hp-results" id="hp-results" hidden>
      <p id="tool-count" class="muted small" aria-live="polite"></p>
      <ul class="hp-res">
        <?php foreach ($all as $t): ?>
        <li class="hm-item" data-file="<?= h($t['file']) ?>" data-name="<?= h(home_fold($t['short'] . ' ' . $t['title'])) ?>" data-search="<?= h($t['search']) ?>" hidden><a href="<?= h($t['file']) ?>"><span class="hp-res-ico"><?= site_icon($t['icon']) ?></span><span><b><?= h($t['short']) ?></b> <span class="muted small"><?= h($t['cap']) ?></span></span></a></li>
        <?php endforeach; ?>
      </ul>
      <div class="hm-none" id="hm-none" hidden>
        <p><b><?= 'No tool matches your search.' ?></b>
          <?= 'Try another word (e.g. "volume", "distribution", "regression") or browse <a href="tools.php">all tools</a>.' ?></p>
      </div>
    </div>
    <div class="hp-recent" id="hm-recent" hidden>
      <h2 class="hp-recent-h" id="hm-recent-h"><?= 'Recently used' ?></h2>
      <ul class="hm-recent-list" id="hm-recent-list" aria-labelledby="hm-recent-h"></ul>
    </div>
  </section>
  </div>
  <?php /* the brand mark (assets/brand, 48 grid), drawn once on load: frame corners, then the three stems grow and
     their crowns appear (22 Nov 2026, user request); decorative, hidden on narrow screens */ ?>
  <div class="hp-hero-mark" aria-hidden="true"><svg class="hp-mark" viewBox="0 0 48 48" focusable="false">
    <path class="hm-frame" pathLength="1" d="M5.5 17V9A3.5 3.5 0 0 1 9 5.5H19"/><path class="hm-frame hm-f2" pathLength="1" d="M42.5 31V39A3.5 3.5 0 0 1 39 42.5H29"/>
    <path class="hm-stem hm-t1" pathLength="1" d="M14 38.5V25"/><path class="hm-stem hm-t2" pathLength="1" d="M24 37V14"/><path class="hm-stem hm-t3" pathLength="1" d="M34 35.5V20"/>
    <circle class="hm-crown hm-t1" cx="14" cy="24.6" r="4.7"/><circle class="hm-crown hm-t2" cx="24" cy="13.4" r="5.6"/><circle class="hm-crown hm-t3" cx="34" cy="19.8" r="4.7"/>
  </svg></div>
  </div>

  <section class="hp-picks" aria-labelledby="hp-picks-h">
    <div class="hp-picks-head">
      <h2 id="hp-picks-h"><?= 'Start with a tool' ?></h2>
      <a class="btn hp-all" href="tools.php"><?= 'Browse all tools' ?> <span class="hp-n">(<?= $nTools ?>)</span></a>
    </div>
    <div class="hp-groups">
      <?php foreach ($picks as $g): ?>
      <div class="hp-group">
        <h3><?= h($g['title']) ?></h3>
        <ul>
          <?php foreach ($g['tools'] as $t): ?>
          <li><a href="<?= h($t['file']) ?>"><span class="hp-ico"><?= site_icon($t['icon']) ?></span><span class="hp-tn"><?= h($t['name']) ?></span></a><p><?= h($t['desc']) ?></p></li>
          <?php endforeach; ?>
        </ul>
      </div>
      <?php endforeach; ?>
    </div>
  </section>

  <div class="hp-two">
    <section class="hp-start" aria-labelledby="hp-start-h">
      <h2 id="hp-start-h"><?= 'Which tool suits my data?' ?></h2>
      <p><?= 'Pick what you measured or what you want to do; the tools index shows the tools for it. Each task is explained in the <a href="guide.php">guide</a>.' ?></p>
      <ul class="hp-tasks">
        <?php foreach ($tasks as $k): ?>
        <li><a href="tools.php?task=<?= h($k['id']) ?>" title="<?= h($k['text']) ?>"><?= h($k['title']) ?></a></li>
        <?php endforeach; ?>
      </ul>
      <p class="small"><?= 'You can load your table straight into a tool. To check your measurements, or to use the same data in several tools, you can start with the <a href="data-checker.php">Data Checker</a>; the package you approve goes to the tools that read approved data.' ?></p>
      <p class="small hp-keep"><?= 'Data and records:' ?> <a href="data-manager.php"><?= 'Data Manager' ?></a> · <a href="coefficient-library.php"><?= 'Coefficient Library' ?></a> · <a href="report-generator.php"><?= 'Report Generator' ?></a> · <a href="record-verifier.php"><?= 'Record Verifier' ?></a></p>
      <p class="note small hp-pkg" id="handoff" aria-live="polite" hidden><span id="handoff-text"></span> <a href="data-manager.php"><?= 'Manage packages' ?></a> · <button type="button" class="linkbtn" id="handoff-clear"><?= 'Deactivate' ?></button></p>
    </section>

    <section class="hp-sci" aria-labelledby="hp-sci-h">
      <h2 id="hp-sci-h"><?= 'Scientific basis' ?></h2>
      <ul>
        <li><a href="guide.php"><?= 'Review the method' ?></a>
          <p><?= 'Each tool\'s guide section explains its inputs, units and settings, the assumptions of its methods and what it does not do.' ?></p></li>
        <li><a href="references.php"><?= 'Check the sources' ?></a>
          <p><?= 'Every method follows a published source: forest mensuration textbooks, journal articles and the documentation of R packages. The site contains no species or regional coefficients; you enter your own, with their source.' ?></p></li>
        <li><a href="about.php#h-cite"><?= 'Cite it in your work' ?></a>
          <p><?= 'State the tool and its version; the DOI makes the version traceable. Cite the method\'s original source too.' ?></p></li>
      </ul>
    </section>
  </div>

  <script type="application/json" id="hm-data"><?= json_encode(['titles' => $titleOf, 'n' => $nTools], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) ?></script>
<?php
ob_start(); ?>
<script type="module">
import { get, del } from './assets/lab/core/store.js';
import { currentPage } from './assets/lab/core/renamed.js';
const $ = id => document.getElementById(id);
const D = JSON.parse($('hm-data').textContent);
// old links to a module of the directory that was on this page (#mod-XX) go to the tools index
if (/^#mod-[A-Z]{2}$/.test(location.hash)) location.replace('tools.php?m=' + location.hash.slice(5));
// ---- search every tool: words (all must occur; case, accents and Turkish ı/İ ignored); names, methods and catalogue ids
const fold = s => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/[–—&]/g, ' ');
const q = $('tool-q'), resBox = $('hp-results'), items = [...document.querySelectorAll('.hp-res .hm-item')];
function apply() {
  const words = fold(q.value).split(/\s+/).filter(Boolean);
  resBox.hidden = !words.length;
  let n = 0;
  for (const it of items) { const ok = words.length > 0 && words.every(w => it.dataset.search.includes(w)); it.hidden = !ok; if (ok) n++; }
  // tools whose name holds the words come first, then the others in catalogue order
  const named = it => words.length > 0 && words.every(w => it.dataset.name.includes(w));
  const list = items[0].parentElement; [...items.filter(named), ...items.filter(it => !named(it))].forEach(it => list.append(it));
  $('hm-none').hidden = n > 0;
  $('tool-count').textContent = !words.length ? '' : `${n} of ${D.n} tools`;
}
q.addEventListener('input', apply);
q.addEventListener('keydown', e => {
  if (e.key === 'Escape' && q.value) { q.value = ''; apply(); e.stopPropagation(); }
  if (e.key === 'Enter') { const first = document.querySelector('.hp-res .hm-item:not([hidden]) a'); if (first) { e.preventDefault(); first.focus(); } }
});
document.addEventListener('keydown', e => { if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && !e.ctrlKey && !e.metaKey) { e.preventDefault(); q.focus(); q.select(); } });
apply();
// ---- recently used tools (kept by every tool page in this browser; see site_bottom)
{ let r = []; try { r = JSON.parse(localStorage.getItem('recentTools') || '[]'); } catch (e) {}
  r = [...new Set(r.map(currentPage))].filter(f => D.titles[f]).slice(0, 4);   // old page names (before 23 Nov 2026) mapped   // only real history; nothing is shown without it
  if (r.length) { const ul = $('hm-recent-list');
    for (const f of r) { const src = document.querySelector(`.hm-item[data-file="${CSS.escape(f)}"] .hp-res-ico`), li = document.createElement('li'), a = document.createElement('a');
      a.href = f; a.className = 'hm-chip hm-rec'; if (src) a.innerHTML = src.innerHTML; a.append(D.titles[f]); li.append(a); ul.append(li); }
    $('hm-recent').hidden = false; } }
// ---- the active data package (keys of core/projects.js, DI-03, read directly to keep this page light)
const box = $('handoff');
async function show() {
  const ds = await get('dataset:approved');
  if (!ds || ds.schema !== 'forest-dataset/1') { box.hidden = true; return; }
  const when = new Date(ds.created).toLocaleString('en-GB');
  const id = await get('project:active'), p = id ? await get('project:' + id) : null;
  const src = p ? p.name : ds.source && ds.source.trees ? ds.source.trees.name : '';
  $('handoff-text').textContent = `Active data package: ${src ? '"' + src + '", ' : ''}${ds.trees.length} tree records, ${ds.plots.length} plots (approved ${when}); in this browser only.`;
  box.hidden = false;
}
$('handoff-clear').addEventListener('click', async () => { await del('project:active'); await del('dataset:approved'); show(); });
show();
</script>
<?php site_bottom(ob_get_clean());
