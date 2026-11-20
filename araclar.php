<?php
// Tools index (20 Nov 2026, user decision): every tool of the catalogue, grouped by module, with the search, the module
// filters and the task filters that were on the home page before. The home page (index.php) now introduces the
// platform and leads to a tool; its old links (?q=, ?m=, ?task=, #mod-XX) come here with the same meaning.
// Data: inc/home.php (site_tools(), the catalogue and the guide's task cards); nothing is listed twice.
require __DIR__ . '/inc/site.php';
require __DIR__ . '/inc/home.php';
$tr = site_ctx()['tr'];
$dir = home_directory($tr); $tasks = home_tasks($tr);
$nTools = array_sum(array_map(function ($m) { return count($m['tools']); }, $dir));
$titleOf = []; foreach ($dir as $m) foreach ($m['tools'] as $t) $titleOf[$t['file']] = $t['short'];
site_top([
    'title' => $tr ? 'Araçlar' : 'Tools',
    'desc'  => $tr ? 'Forest Biometry araç dizini: modüllere ve görevlere göre bütün araçlar, araç ve yöntem araması.'
                   : 'Forest Biometry tools index: every tool by module and by task, with a tool and method search.',
    'lede'  => $tr ? 'Bütün araçlar modüllere göre. Bir araç ya da yöntem adıyla arayın, modüle ya da göreve göre süzün.'
                   : 'Every tool, by module. Search by a tool or method name, or filter by module or task.',
]);
$magnifier = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/></svg>';
?>
  <section class="hm-find" role="search" aria-label="<?= $tr ? 'Araç bul' : 'Find a tool' ?>">
    <label class="hp-qlabel" for="tool-q"><?= $tr ? 'Araç veya yöntem bulun' : 'Find a tool or method' ?></label>
    <span class="hm-q"><?= $magnifier ?>
      <input type="search" id="tool-q" autocomplete="off" spellcheck="false" aria-describedby="tool-count" placeholder="<?= $tr ? 'Örn. Weibull, bonitet, RMSE' : 'E.g. Weibull, site index, RMSE' ?>">
      <kbd class="hm-kbd" title="<?= $tr ? 'Aramaya git' : 'Go to search' ?>">/</kbd></span>
    <div class="hm-chips" role="group" aria-label="<?= $tr ? 'Modüle göre süz' : 'Filter by module' ?>">
      <button type="button" class="hm-chip" data-mod="" aria-pressed="true"><?= $tr ? 'Tümü' : 'All' ?> <span><?= $nTools ?></span></button>
      <?php foreach ($dir as $m): ?><button type="button" class="hm-chip" data-mod="<?= h($m['id']) ?>" aria-pressed="false"><?= h($m['title']) ?> <span><?= count($m['tools']) ?></span></button><?php endforeach; ?>
    </div>
    <p id="tool-count" class="hm-count muted small" aria-live="polite"><?= $tr ? $nTools . ' araç' : $nTools . ' tools' ?></p>
  </section>


  <div class="hm-layout">
    <div class="hm-main">
      <h2 id="h-tools" class="vh"><?= $tr ? 'Araçlar' : 'Tools' ?></h2>
      <p class="hm-filter note small" id="hm-task-note" hidden><span id="hm-task-text"></span> <button type="button" class="btn ghost small" id="hm-task-clear"><?= $tr ? 'Süzgeci kaldır' : 'Clear the filter' ?></button></p>
      <?php foreach ($dir as $m): ?>
      <section class="hm-mod" id="mod-<?= h($m['id']) ?>" data-mod="<?= h($m['id']) ?>" aria-labelledby="hm-h-<?= h($m['id']) ?>">
        <header class="hm-mod-head"><h2 id="hm-h-<?= h($m['id']) ?>" class="hm-h"><?= h($m['title']) ?></h2><p class="muted small"><?= h($m['desc']) ?></p></header>
        <ul class="hm-grid">
          <?php foreach ($m['tools'] as $t): ?>
          <li class="hm-item" data-file="<?= h($t['file']) ?>" data-search="<?= h($t['search']) ?>"><a class="hm-tool" href="<?= h($t['file']) ?>" title="<?= h($t['desc']) ?>">
            <span class="hm-ico"><?= site_icon($t['icon']) ?></span>
            <span class="hm-tb"><span class="hm-tn"><?= h($t['title']) ?></span><span class="hm-tc"><?= h($t['cap']) ?></span><?php if ($t['ids']): ?><span class="hm-ti"><?= h(home_ids($t['ids'])) ?></span><?php endif; ?></span></a></li>
          <?php endforeach; foreach ($m['planned'] as $p): ?>
          <li class="hm-item hm-planned" data-search="<?= h(home_fold($p['name'] . ' ' . $p['id'])) ?>"><div class="hm-tool" aria-disabled="true">
            <span class="hm-tb"><span class="hm-tn"><?= h($p['name']) ?> <span class="hm-badge"><?= $tr ? 'Planlı' : 'Planned' ?></span></span><span class="hm-ti"><?= h($p['id']) ?></span></span></div></li>
          <?php endforeach; ?>
        </ul>
      </section>
      <?php endforeach; ?>
      <div class="hm-none" id="hm-none" hidden>
        <p><b><?= $tr ? 'Aramanıza uyan araç yok.' : 'No tool matches your search.' ?></b></p>
        <p class="muted small"><?= $tr ? 'Başka bir sözcük deneyin (ör. "hacim", "dağılım", "regresyon") ya da görevlerden birini seçin. Bir yöntemin hangi araçta olduğunu <a href="kilavuz.php">kılavuzda</a> bulabilirsiniz.'
                                          : 'Try another word (e.g. "volume", "distribution", "regression") or pick a task. The <a href="kilavuz.php">guide</a> tells which tool does what.' ?></p>
        <button type="button" class="btn ghost small" id="hm-reset"><?= $tr ? 'Bütün araçları göster' : 'Show all tools' ?></button>
      </div>
    </div>

    <aside class="hm-aside" aria-labelledby="hm-tasks-h">
      <section class="hm-tasks">
        <h2 id="hm-tasks-h" class="hm-h"><?= $tr ? 'Ne yapmak istiyorsunuz?' : 'What do you want to do?' ?></h2>
        <p class="muted small hm-tasks-sub"><?= $tr ? 'Bir göreve tıklayın: ona uyan araçlar süzülür.' : 'Pick a task to see the tools for it.' ?></p>
        <ul>
          <?php foreach ($tasks as $k): ?>
          <li><button type="button" class="hm-task" data-task="<?= h($k['id']) ?>" data-files="<?= h(implode(' ', $k['files'])) ?>" aria-pressed="false" title="<?= h($k['text']) ?>"><?= h($k['title']) ?><span class="hm-task-n"><?= count($k['files']) ?></span></button></li>
          <?php endforeach; ?>
        </ul>
      </section>
      <section class="hm-help">
        <h2 class="hm-h"><?= $tr ? 'Yardım ve kaynaklar' : 'Help and sources' ?></h2>
        <ul class="hm-links">
          <li><a href="kilavuz.php"><?= site_icon('guide') ?><?= $tr ? 'Kullanım kılavuzu' : 'User guide' ?></a></li>
          <li><a href="kilavuz.php?k=is-akisi"><?= site_icon('guide') ?><?= $tr ? 'Araçlar birlikte nasıl kullanılır' : 'How the tools work together' ?></a></li>
          <li><a href="kaynakca.php"><?= site_icon('about') ?><?= $tr ? 'Kaynakça (APA 7)' : 'References (APA 7)' ?></a></li>
          <li><a href="hakkinda.php"><?= site_icon('about') ?><?= $tr ? 'Hakkında ve atıf' : 'About and how to cite' ?></a></li>
        </ul>
      </section>
    </aside>
  </div>

  <script type="application/json" id="hm-data"><?= json_encode(['titles' => $titleOf, 'tasks' => array_column($tasks, 'title', 'id'), 'n' => $nTools], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) ?></script>
<?php
ob_start(); ?>
<script type="module">
const tr = document.documentElement.lang !== 'en', $ = id => document.getElementById(id);
const D = JSON.parse($('hm-data').textContent);
// ---- find a tool: words (all must occur; case, accents and Turkish ı/İ ignored), a module chip or a task
const fold = s => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i').replace(/[–—&]/g, ' ');
const q = $('tool-q'), items = [...document.querySelectorAll('.hm-item')], mods = [...document.querySelectorAll('.hm-mod')];
const chips = [...document.querySelectorAll('.hm-chip')], tasks = [...document.querySelectorAll('.hm-task')];
let mod = '', task = null;
function apply(push = true) {
  const words = fold(q.value).split(/\s+/).filter(Boolean), files = task ? new Set(task.dataset.files.split(' ')) : null;
  let n = 0;
  for (const it of items) {
    const ok = (!mod || it.closest('.hm-mod').dataset.mod === mod) && (!files || files.has(it.dataset.file)) && words.every(w => it.dataset.search.includes(w));
    it.hidden = !ok; if (ok && !it.classList.contains('hm-planned')) n++;
  }
  for (const m of mods) m.hidden = !m.querySelector('.hm-item:not([hidden])');
  chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.mod === mod && !task)));
  tasks.forEach(t => t.setAttribute('aria-pressed', String(t === task)));
  const all = !words.length && !mod && !task;
  $('tool-count').textContent = all ? (tr ? `${D.n} araç` : `${D.n} tools`) : (tr ? `${D.n} araçtan ${n} tanesi gösteriliyor` : `Showing ${n} of ${D.n} tools`);
  $('hm-none').hidden = n > 0;
  $('hm-task-note').hidden = !task; if (task) $('hm-task-text').textContent = (tr ? 'Görev: ' : 'Task: ') + D.tasks[task.dataset.task];
  if (push) { const u = new URL(location.href); words.length ? u.searchParams.set('q', q.value.trim()) : u.searchParams.delete('q'); mod ? u.searchParams.set('m', mod) : u.searchParams.delete('m');
    task ? u.searchParams.set('task', task.dataset.task) : u.searchParams.delete('task'); u.hash = ''; history.replaceState(null, '', u); }
}
q.addEventListener('input', () => apply());
q.addEventListener('keydown', e => { if (e.key === 'Escape' && q.value) { q.value = ''; apply(); e.stopPropagation(); }
  if (e.key === 'Enter') { const first = document.querySelector('.hm-item:not([hidden]):not(.hm-planned) a'); if (first) { e.preventDefault(); first.focus(); } } });
chips.forEach(c => c.addEventListener('click', () => { mod = c.dataset.mod; task = null; apply(); }));
tasks.forEach(t => t.addEventListener('click', () => { task = task === t ? null : t; mod = ''; apply();
  // on narrow screens the task list sits above the tools: bring the filtered tools into view
  if (task && matchMedia('(max-width: 1099px)').matches) document.querySelector('.hm-main').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }));
$('hm-task-clear').addEventListener('click', () => { task = null; apply(); });
$('hm-reset').addEventListener('click', () => { q.value = ''; mod = ''; task = null; apply(); q.focus(); });
document.addEventListener('keydown', e => { if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) && !e.ctrlKey && !e.metaKey) { e.preventDefault(); q.focus(); q.select(); } });
{ // state from the address: ?q=, ?m=, ?task=, or an old #mod-XX link
  const u = new URL(location.href), h = location.hash.replace('#mod-', '');
  q.value = u.searchParams.get('q') || ''; mod = u.searchParams.get('m') || (mods.some(m => m.dataset.mod === h) ? h : '');
  if (!chips.some(c => c.dataset.mod === mod)) mod = '';
  task = tasks.find(t => t.dataset.task === u.searchParams.get('task')) || null;
  apply(false);
}
</script>
<?php site_bottom(ob_get_clean());
