<?php
// Home page = the tools index. Built for finding a tool: a short statement of what the platform is, a search box with
// module and task filters, then every tool as a compact card grouped by module. Data from inc/home.php.
require __DIR__ . '/inc/site.php';
require __DIR__ . '/inc/home.php';
$tr = site_ctx()['tr'];

site_top([
    'desc' => $tr ? 'Orman envanteri ve biyometri verileri için tarayıcıda çalışan araçlar: veri denetimi, meşcere değerleri, örnekleme, çap dağılımları, boy–çap modelleri, model değerlendirme.'
                  : 'Browser-based tools for forest inventory and biometrics: data checking, stand metrics, sampling, diameter distributions, height–diameter models, model evaluation.',
]);
$dir = home_directory($tr); $tasks = home_tasks($tr);
$nTools = array_sum(array_map(function ($m) { return count($m['tools']); }, $dir));
$titleOf = []; foreach ($dir as $m) foreach ($m['tools'] as $t) $titleOf[$t['file']] = $t['short'];
$magnifier = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/></svg>';
?>
  <section class="hm-intro" aria-labelledby="hero-h">
    <div class="hm-intro-text">
      <h1 id="hero-h"><?= $tr ? 'Ormancılık Biyometrisi Araçları' : 'Forest Biometrics Tools' ?></h1>
      <p class="hm-lede"><?= $tr ? 'Orman envanteri ve ağaç ölçümleri için hesap ve modelleme araçları: veri denetimi, ağaç ve meşcere değerleri, hacim, biyokütle, çap dağılımları, bonitet ve istatistiksel modeller. Araştırmacılar, mühendisler ve öğrenciler için.'
                                     : 'Calculation and modelling tools for forest inventory and tree measurements: data checking, tree and stand values, volume, biomass, diameter distributions, site index and statistical models. For researchers, forest engineers and students.' ?></p>
      <ul class="hm-facts">
        <li><?= $tr ? '<b>Tarayıcıda çalışır</b><span class="hm-fd">: veriniz sunucuya gönderilmez</span>' : '<b>Runs in your browser</b><span class="hm-fd">: your data are not sent to a server</span>' ?></li>
        <li><?= $tr ? '<b>Kaynaklı</b><span class="hm-fd">: her formülün kaynağı yazılı</span>' : '<b>Sourced</b><span class="hm-fd">: every formula cites its source</span>' ?></li>
        <li><?= $tr ? '<b>Yerleşik katsayı yok</b><span class="hm-fd">: katsayıları kaynağıyla siz girersiniz</span>' : '<b>No built-in coefficients</b><span class="hm-fd">: you enter them with their source</span>' ?></li>
        <li><?= $tr ? '<b>Açık kaynak</b>' : '<b>Open source</b>' ?><?php if (SITE_DOI !== ''): ?> · <a href="https://doi.org/<?= h(SITE_DOI) ?>">DOI <?= h(SITE_DOI) ?></a><?php endif; ?></li>
      </ul>
    </div>
    <div class="hm-start">
      <p class="hm-start-h"><?= $tr ? 'İlk kez mi kullanıyorsunuz?' : 'New here?' ?></p>
      <a class="btn" href="veri-denetcisi.php"><?= site_icon('checker') ?><?= $tr ? 'Veriyi denetleyerek başlayın' : 'Start by checking your data' ?></a>
      <a class="btn ghost" href="kilavuz.php"><?= site_icon('guide') ?><?= $tr ? 'Kullanım kılavuzu' : 'User guide' ?></a>
      <p class="muted small"><?= $tr ? 'Her araç kendi başına da çalışır; tablonuzu doğrudan araca yükleyebilirsiniz.' : 'Every tool also works on its own; you can load your table straight into a tool.' ?></p>
    </div>
  </section>

  <section class="hm-find" role="search" aria-label="<?= $tr ? 'Araç bul' : 'Find a tool' ?>">
    <label class="hm-q" for="tool-q"><?= $magnifier ?><span class="vh"><?= $tr ? 'Araç ara' : 'Search the tools' ?></span>
      <input type="search" id="tool-q" autocomplete="off" spellcheck="false" placeholder="<?= $tr ? 'Araç ara: ör. Weibull, gövde profili, biyokütle, bonitet, karma model…' : 'Search tools: e.g. Weibull, taper, biomass, site index, mixed model…' ?>" aria-describedby="tool-count">
      <kbd class="hm-kbd" title="<?= $tr ? 'Aramaya git' : 'Go to search' ?>">/</kbd></label>
    <div class="hm-chips" role="group" aria-label="<?= $tr ? 'Modüle göre süz' : 'Filter by module' ?>">
      <button type="button" class="hm-chip" data-mod="" aria-pressed="true"><?= $tr ? 'Tümü' : 'All' ?> <span><?= $nTools ?></span></button>
      <?php foreach ($dir as $m): ?><button type="button" class="hm-chip" data-mod="<?= h($m['id']) ?>" aria-pressed="false"><?= h($m['title']) ?> <span><?= count($m['tools']) ?></span></button><?php endforeach; ?>
    </div>
    <p id="tool-count" class="hm-count muted small" aria-live="polite"><?= $tr ? $nTools . ' araç' : $nTools . ' tools' ?></p>
  </section>

  <div class="hm-layout">
    <div class="hm-main">
      <section class="hm-recent" id="hm-recent" aria-labelledby="hm-recent-h" hidden>
        <h2 id="hm-recent-h" class="hm-h"><?= $tr ? 'Son kullandıklarınız' : 'Recently used' ?></h2>
        <ul class="hm-recent-list" id="hm-recent-list"></ul>
      </section>

      <section class="card" id="handoff" aria-live="polite" hidden>
        <h2><?= $tr ? 'Etkin veri paketi' : 'Active data package' ?></h2>
        <p id="handoff-text"></p>
        <p class="b-actions"><a class="btn" href="ornek-alan.php"><?= $tr ? 'Örnek Alan ve Meşcere Hesaplayıcısı\'nda kullan' : 'Use in Plot & Stand Metrics' ?></a>
          <a class="btn ghost" href="veri-yoneticisi.php"><?= $tr ? 'Envanter Verisi Yöneticisi' : 'Inventory Data Manager' ?></a>
          <button type="button" class="btn ghost" id="handoff-clear"><?= $tr ? 'Etkin paketi bırak' : 'Deactivate' ?></button></p>
      </section>

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
      <section class="hm-reset" id="hm-sessions" aria-labelledby="hm-sessions-h">
        <p class="hm-reset-h" id="hm-sessions-h"><?= $tr ? 'Baştan başlamak mı istiyorsunuz?' : 'Start over?' ?></p>
        <p class="muted small" id="hm-sessions-text"><?= $tr ? 'Araçlar tablonuzu, ayarları ve sonuçları bu tarayıcıda saklar; onaylanmış veri paketi araçlara etkin paket olarak gider.' : 'The tools keep your table, settings and results in this browser; an approved data package goes to the tools as the active package.' ?></p>
        <button type="button" class="btn danger" id="hm-sessions-reset"><?= site_icon('delete') ?><?= $tr ? 'Tüm araç oturumlarını sıfırla' : 'Reset all tool sessions' ?></button>
      </section>
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
import { get, del, keys } from './assets/lab/core/store.js';
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
// ---- recently used tools (kept by every tool page in this browser; see site_bottom)
{ let r = []; try { r = JSON.parse(localStorage.getItem('recentTools') || '[]'); } catch (e) {}
  r = r.filter(f => D.titles[f]).slice(0, 4);
  if (r.length) { const ul = $('hm-recent-list');
    for (const f of r) { const src = document.querySelector(`.hm-item[data-file="${CSS.escape(f)}"] .hm-ico`), li = document.createElement('li'), a = document.createElement('a');
      a.href = f; a.className = 'hm-chip hm-rec'; if (src) a.innerHTML = src.innerHTML; a.append(D.titles[f]); li.append(a); ul.append(li); }
    $('hm-recent').hidden = false; } }
// ---- the active data package (keys of core/projects.js, DI-03, read directly to keep this page light)
const box = $('handoff');
async function show() {
  const ds = await get('dataset:approved');
  if (!ds || ds.schema !== 'forest-dataset/1') { box.hidden = true; return; }
  const when = new Date(ds.created).toLocaleString(tr ? 'tr-TR' : 'en-GB');
  const id = await get('project:active'), p = id ? await get('project:' + id) : null;
  const src = p ? p.name : ds.source && ds.source.trees ? ds.source.trees.name : '';
  $('handoff-text').textContent = tr
    ? `${src ? '"' + src + '", ' : ''}${ds.trees.length} ağaç kaydı, ${ds.plots.length} örnek alan; ${when} tarihinde onaylandı. Bu veri yalnızca bu tarayıcıda saklanıyor; onaylanmış veriyi okuyan araçlar bu paketi kullanır. "Etkin paketi bırak" paketi silmez; Envanter Verisi Yöneticisi'nde kalır.`
    : `${src ? '"' + src + '", ' : ''}${ds.trees.length} tree records, ${ds.plots.length} plots; approved ${when}. Stored only in this browser; the tools that read approved data use this package. "Deactivate" does not delete it; it stays in the Inventory Data Manager.`;
  box.hidden = false;
}
$('handoff-clear').addEventListener('click', async () => { await del('project:active'); await del('dataset:approved'); show(); });
show();
// ---- every tool session at once, and the active data package (MR-003): the 'session:<tool>' keys (the same keys each
// tool's "Reset session" deletes), then the active package is deactivated and deleted ('project:active',
// 'dataset:approved' and the active project, as core/projects.js deleteProject does). Other kept packages, the
// coefficient library and downloaded files stay.
const sBtn = $('hm-sessions-reset'), sText = $('hm-sessions-text'), sBase = sText.textContent;
async function scan() {
  const k = await keys('session:'), ds = await get('dataset:approved'), id = await get('project:active'), p = id ? await get('project:' + id) : null;
  const pkg = ds || p ? (p && p.name) || (ds && ds.source && ds.source.trees && ds.source.trees.name) || (tr ? 'adsız paket' : 'unnamed package') : null;
  return { k, id, pkg };
}
async function sessions() {
  const s = await scan();
  sText.textContent = sBase + ' ' + (s.k.length ? (tr ? `Kayıtlı oturum: ${s.k.length}.` : `Saved sessions: ${s.k.length}.`) : (tr ? 'Kayıtlı oturum yok.' : 'No saved sessions.'))
    + (s.pkg ? (tr ? ` Etkin veri paketi: "${s.pkg}".` : ` Active data package: "${s.pkg}".`) : '');
  sBtn.disabled = !s.k.length && !s.pkg; return s;
}
sBtn.addEventListener('click', async () => {
  const s = await sessions(); if (!s.k.length && !s.pkg) return;
  const pk = s.pkg ? (tr ? `\n\nEtkin veri paketi "${s.pkg}" etkisizleştirilip bu tarayıcıdan SİLİNECEK; araçlar onaylanmış veri görmez. Gerekiyorsa önce Envanter Verisi Yöneticisi'nden yedek alın.`
                        : `\n\nThe active data package "${s.pkg}" will be deactivated and DELETED from this browser; the tools will see no approved data. Make a backup in the Inventory Data Manager first if you need it.`) : '';
  if (!confirm(tr ? `Bütün araçların kayıtlı oturumları (${s.k.length}) silinecek: yüklenen tablolar, ayarlar ve sonuçlar. Her araç başlangıç durumunda açılır.${pk}\n\nEnvanter Verisi Yöneticisi'ndeki öteki paketler, Katsayı Kütüphanesi ve indirdiğiniz dosyalar silinmez. Başka bir sekmede açık araç varsa önce onu kapatın; yoksa o araç oturumunu yeniden kaydeder.\n\nBu işlem geri alınamaz. Devam edilsin mi?`
                  : `The saved sessions of all tools (${s.k.length}) will be deleted: loaded tables, settings and results. Every tool opens in its starting state.${pk}\n\nOther packages in the Inventory Data Manager, the Coefficient Library and files you downloaded are not deleted. Close any tool open in another tab first; otherwise it saves its session again.\n\nThis cannot be undone. Continue?`)) return;
  for (const x of s.k) await del(x);
  if (s.id) await del('project:' + s.id);
  await del('project:active'); await del('dataset:approved');
  await sessions(); show();
  sText.textContent += ' ' + (tr ? `${s.k.length} oturum sıfırlandı${s.pkg ? ', etkin veri paketi silindi' : ''}.` : `${s.k.length} session(s) reset${s.pkg ? ', active data package deleted' : ''}.`);
});
sessions();
</script>
<?php site_bottom(ob_get_clean());
