<?php
require __DIR__ . '/inc/common.php';
require __DIR__ . '/inc/paper.php';
$L  = lang();
$S  = settings();
$items = load_json('items', []);
$notes = array_values(array_filter($items, function ($i) { return $i['type'] === 'note'; }));
$pubs  = array_values(array_filter($items, function ($i) { return $i['type'] === 'pub'; }));

function slug(string $s): string { return strtolower(trim((string)preg_replace('/-+/', '-', safe_filename($s)), '-.')) ?: 'ders'; }
function fdate(string $d, string $L): string {
    $tr = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
    $en = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    $t = strtotime($d); if (!$t) return '';
    $m = (int)date('n', $t) - 1;
    return $L === 'tr' ? date('j', $t) . ' ' . $tr[$m] . ' ' . date('Y', $t) : date('j', $t) . ' ' . $en[$m] . ' ' . date('Y', $t);
}
function fsize(int $b, string $L): string {
    $s = human_size($b);
    return $L === 'tr' ? str_replace('.', ',', $s) : $s;
}
// "Onur Alkan" -> highlights "Alkan O." in author lists
function authors_html(string $a, string $name): string {
    $parts = preg_split('/\s+/u', trim($name));
    $out = h($a);
    if (count($parts) < 2) return $out;
    $sur = end($parts); $ini = mb_substr($parts[0], 0, 1);
    $re = '/(' . preg_quote(h($sur), '/') . ',?\s*' . preg_quote(h($ini), '/') . '\.(?:\s?[A-ZÇĞİÖŞÜ]\.)*)/iu';
    return (string)preg_replace($re, '<strong>$1</strong>', $out);
}
function ext_kind(string $e): string {
    if (in_array($e, ['ppt','pptx'], true)) return 'slides';
    if (in_array($e, ['doc','docx','txt'], true)) return 'doc';
    if (in_array($e, ['xls','xlsx','csv'], true)) return 'data';
    if (in_array($e, ['r','rmd','py','ipynb','sas'], true)) return 'code';
    return 'file';
}

// courses: name -> files (newest first), courses ordered by most recent upload
usort($notes, function ($a, $b) { return strcmp($b['date'], $a['date']); });
$courses = []; $cname = [];   // keyed by a language-independent slug, so shared links work in TR and EN
foreach ($notes as $n) { $k = slug($n['course_tr'] ?: $n['course_en']); $courses[$k][] = $n; if (!isset($cname[$k])) $cname[$k] = pick($n, 'course', $L) ?: '—'; }
$fresh = strtotime('-14 days');

usort($pubs, function ($a, $b) { return [(int)$b['year'], $b['date']] <=> [(int)$a['year'], $a['date']]; });
$years = [];
foreach ($pubs as $p) $years[(string)$p['year']][] = $p;
$kinds = array_values(array_unique(array_map(function ($p) { return $p['kind'] ?? 'article'; }, $pubs)));

$title  = ($L === 'tr' ? $S['title_tr'] : $S['title_en']);
$other  = $L === 'tr' ? 'en' : 'tr';
$photo  = is_file(UPLOAD_DIR . '/profile.jpg') ? 'files/profile.jpg?v=' . filemtime(UPLOAD_DIR . '/profile.jpg') : '';
$links  = array_filter(['Google Scholar' => $S['scholar'], 'ORCID' => $S['orcid'], 'ResearchGate' => $S['researchgate'], 'YÖKSİS / AVESİS' => $S['yoksis']]);
$tr = $L === 'tr';
$now = time();
$daysTr = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
$daysEn = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
$today  = ($tr ? $daysTr[(int)date('w', $now)] : $daysEn[(int)date('w', $now)]) . ', ' . fdate(date('Y-m-d', $now), $L);
$issue  = (int)date('z', $now) + 1;
$latest = array_slice($notes, 0, 6);
$paper  = $tr ? 'Meşcere Postası' : 'The Stand Gazette';
$ORN = '<svg class="orn" viewBox="0 0 90 18" aria-hidden="true"><path d="M2 9h30M58 9h30" stroke="currentColor" stroke-width="1"/><path d="M45 2 52 9 45 16 38 9z" fill="currentColor"/><circle cx="34" cy="9" r="2" fill="currentColor"/><circle cx="56" cy="9" r="2" fill="currentColor"/></svg>';
$ICON_DL  = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3v10m0 0-4-4m4 4 4-4M4 16h12"/></svg>';
$ICON_OUT = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 4H4v12h12v-4M11 3h6v6M17 3l-8 8"/></svg>';
?><?php paper_top(); ?>

<main>
  <!-- ================= FRONT PAGE ================= -->
  <section class="front" aria-label="<?= $tr ? 'Ön sayfa' : 'Front page' ?>">
    <article class="about">
      <p class="kicker sc"><?= $tr ? 'Künye' : 'Masthead' ?></p>
      <h2 class="h-col"><?= h($S['name']) ?></h2>
      <p class="byline"><b><?= h($title) ?></b>, <?= h(pick($S, 'affil', $L)) ?></p>
      <?php if ($photo): ?>
        <div class="oldprint"><img class="portrait" src="<?= h($photo) ?>" alt="<?= h($S['name']) ?>" width="300" height="375"></div>
        <p class="portrait-cap"><?= h($S['name']) ?>, <?= $tr ? 'arşiv fotoğrafı' : 'archive photograph' ?></p>
      <?php endif; ?>
      <div class="copy"><p class="drop"><?= nl2br(h(pick($S, 'bio', $L))) ?></p></div>
      <?php if ($ints = pick($S, 'interests', $L)): ?><p class="fields"><b><?= $tr ? 'Çalışma alanları:' : 'Research interests:' ?></b> <?= h($ints) ?>.</p><?php endif; ?>
      <?php if ($links): ?><ul class="ids"><?php foreach ($links as $k => $u): ?><li><a href="<?= h($u) ?>" target="_blank" rel="noopener"><?= h($k) ?></a></li><?php endforeach; ?></ul><?php endif; ?>
    </article>

    <article class="lead">
      <p class="lead-kicker sc"><?= $tr ? 'Bilim ve orman' : 'Science and forestry' ?></p>
      <h2 class="headline"><?= $tr ? 'Meşcerede çaplar Weibull dağılımına uydu' : 'Stand diameters found to follow Weibull distribution' ?></h2>
      <p class="deck"><?= $tr ? 'Sayfa her açıldığında yeni bir orman kuruluyor, ağaçlar Chapman–Richards modeline göre boy atıyor.'
                               : 'A new forest is raised every time the page opens, and its trees grow by the Chapman–Richards model.' ?></p>
      <figure class="stand" id="stand">
        <svg role="img" aria-label="<?= $tr ? 'Rastgele üretilmiş bir orman meşceresinin gravür tarzı çizimi' : 'Engraving-style drawing of a randomly generated forest stand' ?>"></svg>
        <div class="tip" hidden></div>
        <figcaption><span id="stand-cap"><b><?= $tr ? 'Şekil 1.' : 'Fig. 1.' ?></b></span>
          <button type="button" class="resample" id="resample"><?= $tr ? 'Yeni baskı al' : 'Print a new edition' ?></button></figcaption>
      </figure>
      <div class="copy cols2">
        <?php if ($tr): ?>
          <p class="drop">ISPARTA. Gazetemizin ön sayfasındaki orman, her ziyarette yeniden üretiliyor. Ağaç çapları üç parametreli Weibull dağılımından çekiliyor, boylar ise çapa bağlı Chapman–Richards boy–çap modeliyle hesaplanıyor. Gövdelerin uca doğru incelmesi de gövde çapı modellerine küçük bir selam.</p>
          <p>Okurlar herhangi bir ağacın üzerine gelerek göğüs çapını ve boyunu görebiliyor. Dağılım parametreleri her baskıda rastgele seçildiği için aynı meşcereye iki kez rastlamak pek olası değil. Parametrelerle kendiniz oynamak isterseniz <a href="araclar/cap-dagilimi.php">Çap Dağılımı Laboratuvarı</a>'nın eğri gezginine bakın. Ders notları sayfa 2'de, yayınlar sayfa 3'te.</p>
        <?php else: ?>
          <p class="drop">ISPARTA. The forest on our front page is regenerated on every visit. Tree diameters are drawn from a three-parameter Weibull distribution, while heights follow a Chapman–Richards height–diameter model. The taper of each stem is a small nod to stem taper models.</p>
          <p>Readers may hover over any tree to see its diameter at breast height and its total height. Because the parameters change with every edition, the same stand is unlikely to appear twice. To play with the parameters yourself, see the curve explorer in our <a href="araclar/cap-dagilimi.php">Diameter Distribution Lab</a>. Lecture notes on page 2, publications on page 3.</p>
        <?php endif; ?>
      </div>
    </article>

    <aside class="side">
      <div class="breaking">
        <h2><?= $tr ? 'Son Dakika' : 'Latest' ?></h2>
        <p class="sub"><?= $tr ? 'En son yüklenen ders notları' : 'Most recently posted lecture notes' ?></p>
        <?php if (!$latest): ?><p class="empty"><?= $tr ? 'Henüz ders notu yok.' : 'No notes yet.' ?></p><?php else: ?>
        <ol>
          <?php foreach ($latest as $n): $e = strtolower((string)($n['ext'] ?? '')); ?>
          <li><span class="crs sc"><?= h(pick($n, 'course', $L)) ?></span>
            <a href="files/<?= rawurlencode($n['file']) ?>" download><?= h(pick($n, 'title', $L)) ?></a>
            <span class="when"><?= h(fdate($n['date'], $L)) ?>, <?= h(strtoupper($e)) ?></span></li>
          <?php endforeach; ?>
        </ol>
        <?php endif; ?>
      </div>
      <div class="breaking tools-box" id="ekler">
        <h2><?= $tr ? 'Ekler' : 'Supplements' ?></h2>
        <p class="sub"><?= $tr ? 'Hesaplayıcılar, laboratuvarlar ve bulmaca' : 'Calculators, laboratories and a crossword' ?></p>
        <ol>
          <?php foreach (paper_supplements() as $sp): ?>
          <li><span class="crs sc"><?= h($sp[1]) ?></span>
            <a href="<?= $sp[0] ?>"><?= h($sp[2]) ?></a>
            <span class="when"><?= h($sp[4]) ?></span></li>
          <?php endforeach; ?>
        </ol>
      </div>
      <div class="ad">
        <h3><?= $tr ? 'Öğrencilerin Dikkatine!' : 'Notice to Students' ?></h3>
        <p><?= $tr ? 'Tüm ders notları, sunumlar ve kodlar sayfa 2\'de derslere göre ayrılmıştır.' : 'All notes, slides and code are filed by course on page 2.' ?></p>
        <p class="big"><a href="#dersler"><?= $tr ? 'Ders notlarına git' : 'Go to lecture notes' ?></a></p>
        <?php if ($S['email']): ?><p><?= $tr ? 'Sorular için:' : 'Questions:' ?> <a href="mailto:<?= h($S['email']) ?>"><?= h($S['email']) ?></a></p><?php endif; ?>
      </div>
    </aside>
  </section>

  <!-- ================= PAGE 2: NOTES ================= -->
  <section class="page" id="dersler" aria-labelledby="h-notes">
    <div class="page-head"><h2 id="h-notes"><?= $tr ? 'Ders Notları' : 'Lecture Notes' ?></h2></div>
    <p class="page-sub"><?= $tr ? 'Sayfa 2. Dosyalarını görmek için bir ders seçin.' : 'Page 2. Choose a course to see its files.' ?></p>
    <?php if (!$courses): ?>
      <p class="empty-page"><?= $tr ? 'Henüz ders notu yüklenmedi.' : 'No lecture notes have been posted yet.' ?></p>
    <?php else: ?>
    <div class="notes">
      <div class="index-col">
        <h3><?= $tr ? 'Dersler' : 'Courses' ?></h3>
        <ul class="courses" role="tablist" aria-label="<?= $tr ? 'Dersler' : 'Courses' ?>">
          <?php $i = 0; foreach ($courses as $sl => $list): $c = $cname[$sl]; ?>
          <li role="presentation"><button type="button" role="tab" id="tab-<?= h($sl) ?>" aria-controls="ders-<?= h($sl) ?>" aria-selected="<?= $i++ === 0 ? 'true' : 'false' ?>" data-slug="<?= h($sl) ?>">
            <span class="nm"><?= h($c) ?></span><span class="dots"></span><span class="num"><?= count($list) ?></span></button></li>
          <?php endforeach; ?>
        </ul>
      </div>
      <div>
        <?php foreach ($courses as $sl => $list): $c = $cname[$sl]; ?>
        <div class="panel" role="tabpanel" id="ders-<?= h($sl) ?>" aria-labelledby="tab-<?= h($sl) ?>">
          <h3><?= h($c) ?></h3>
          <p class="share"><?= count($list) ?> <?= $tr ? 'dosya' : (count($list) === 1 ? 'file' : 'files') ?>. <button type="button" data-copy="#ders-<?= h($sl) ?>"><?= $tr ? 'Bu dersin bağlantısını kopyala' : 'Copy link to this course' ?></button></p>
          <ul class="files">
            <?php foreach ($list as $n): $e = strtolower((string)($n['ext'] ?? '')); $href = 'files/' . rawurlencode($n['file']); ?>
            <li>
              <p class="ftitle"><a href="<?= $href ?>" download><?= h(pick($n, 'title', $L)) ?></a><?php if (strtotime($n['date']) > $fresh): ?><span class="fnew"><?= $tr ? 'YENİ' : 'NEW' ?></span><?php endif; ?></p>
              <?php if ($d = pick($n, 'desc', $L)): ?><p class="fdesc"><?= h($d) ?></p><?php endif; ?>
              <p class="fmeta"><span><?= h(fdate($n['date'], $L)) ?></span><a href="<?= $href ?>" download><?= $tr ? 'İndir' : 'Download' ?> (<?= h(strtoupper($e)) ?>, <?= h(fsize((int)$n['size'], $L)) ?>)</a></p>
            </li>
            <?php endforeach; ?>
          </ul>
        </div>
        <?php endforeach; ?>
      </div>
    </div>
    <?php endif; ?>
  </section>

  <!-- ================= PAGE 3: PUBLICATIONS ================= -->
  <section class="page" id="yayinlar" aria-labelledby="h-pubs">
    <div class="page-head"><h2 id="h-pubs"><?= $tr ? 'Yayınlar' : 'Publications' ?></h2></div>
    <p class="page-sub"><?= $tr ? 'Sayfa 3. ' . count($pubs) . ' yayın, yeniden eskiye.' : 'Page 3. ' . count($pubs) . ' publications, newest first.' ?></p>
    <?php if (!$pubs): ?>
      <p class="empty-page"><?= $tr ? 'Yayın listesi hazırlanıyor.' : 'The publication list is being prepared.' ?></p>
    <?php else: ?>
    <div class="pfilter">
      <input type="search" id="q" placeholder="<?= $tr ? 'Başlık, yazar veya dergi ara…' : 'Search titles, authors or journals…' ?>" aria-label="<?= $tr ? 'Yayınlarda ara' : 'Search publications' ?>">
      <?php if (count($kinds) > 1): ?>
        <button type="button" class="chip" aria-pressed="true" data-k=""><?= t('all', $L) ?></button>
        <?php foreach ($kinds as $k): ?><button type="button" class="chip" aria-pressed="false" data-k="<?= h($k) ?>"><?= t($k, $L) ?></button><?php endforeach; ?>
      <?php endif; ?>
    </div>
    <div class="plist-wrap" id="plist">
      <?php foreach ($years as $y => $list): ?>
        <h3 class="yhead num"><?= h($y) ?></h3>
        <?php foreach ($list as $p): $k = $p['kind'] ?? 'article';
          $cite = trim(($p['authors'] ? $p['authors'] . ' ' : '') . '(' . $p['year'] . '). ' . pick($p, 'title', $L) . '. ' . ($p['venue'] ? $p['venue'] . '. ' : '') . (!empty($p['doi']) ? 'https://doi.org/' . $p['doi'] : '')); ?>
        <article class="pub" data-k="<?= h($k) ?>" data-y="<?= h($y) ?>">
          <p class="ptype"><?= t($k, $L) ?></p>
          <h4 class="ptitle"><?= h(pick($p, 'title', $L)) ?></h4>
          <?php if (!empty($p['authors'])): ?><p class="authors"><?= authors_html($p['authors'], $S['name']) ?></p><?php endif; ?>
          <?php if (!empty($p['venue'])): ?><p class="venue"><?= h($p['venue']) ?></p><?php endif; ?>
          <ul class="plinks">
            <?php if (!empty($p['file'])): ?><li><a href="files/<?= rawurlencode($p['file']) ?>" download>PDF (<?= h(fsize((int)$p['size'], $L)) ?>)</a></li><?php endif; ?>
            <?php if (!empty($p['url'])): ?><li><a href="<?= h(https_url($p['url'])) ?>" target="_blank" rel="noopener"><?= $tr ? 'Tam metin' : 'Full text' ?></a></li><?php endif; ?>
            <?php if (!empty($p['doi'])): ?><li><a href="https://doi.org/<?= h($p['doi']) ?>" target="_blank" rel="noopener">DOI</a></li><?php endif; ?>
            <li><a href="#" data-cite="<?= h($cite) ?>"><?= $tr ? 'Kaynak bilgisini kopyala' : 'Copy citation' ?></a></li>
          </ul>
        </article>
        <?php endforeach; ?>
      <?php endforeach; ?>
    </div>
    <p class="noresult" hidden><?= $tr ? 'Aramanızla eşleşen yayın yok. Farklı bir kelime deneyin.' : 'No publications match your search. Try a different word.' ?></p>
    <?php endif; ?>
  </section>

  <!-- ================= PAGE 4: CONTACT ================= -->
  <section class="page" id="iletisim" aria-labelledby="h-contact">
    <div class="page-head"><h2 id="h-contact"><?= $tr ? 'İletişim' : 'Contact' ?></h2></div>
    <p class="page-sub"><?= $tr ? 'Sayfa 4.' : 'Page 4.' ?></p>
    <div class="contact-ad">
      <?= $ORN ?>
      <h3><?= h($title . ' ' . $S['name']) ?></h3>
      <p><?= h(pick($S, 'affil', $L)) ?></p>
      <?php if ($o = pick($S, 'office', $L)): ?><p><?= nl2br(h($o)) ?></p><?php endif; ?>
      <?php if ($S['email']): ?><a class="mail" href="mailto:<?= h($S['email']) ?>"><?= h($S['email']) ?></a><?php endif; ?>
      <?php if ($links): ?><ul class="ids"><?php foreach ($links as $k => $u): ?><li><a href="<?= h($u) ?>" target="_blank" rel="noopener"><?= h($k) ?></a></li><?php endforeach; ?></ul><?php endif; ?>
    </div>
  </section>
</main>

<?php ob_start(); ?>
<script>
(() => {
  const TR = <?= $tr ? 'true' : 'false' ?>;
  const fmt = (x, d) => x.toLocaleString(TR ? 'tr-TR' : 'en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
  async function copy(text, el) {
    try { await navigator.clipboard.writeText(text); } catch (e) { const t = document.createElement('textarea'); t.value = text; document.body.append(t); t.select(); document.execCommand('copy'); t.remove(); }
    const old = el.textContent; el.textContent = TR ? 'Kopyalandı' : 'Copied'; setTimeout(() => el.textContent = old, 1600);
  }

  // ---------- the stand, drawn as an engraving ----------
  const fig = document.getElementById('stand'), svg = fig.querySelector('svg'), tip = fig.querySelector('.tip');
  const NS = 'http://www.w3.org/2000/svg';
  let trees = [], par = {};
  const U = (a, b) => a + Math.random() * (b - a);
  function sample() {
    par = { a: U(2.2, 3.6), b: U(12, 20), g: U(6, 10), H: U(26, 34), k: U(.035, .055), c: U(1.1, 1.5) };
    const n = Math.max(30, Math.min(80, Math.round(svg.clientWidth / 9)));
    trees = Array.from({ length: n }, () => {
      const d = par.g + par.b * Math.pow(-Math.log(1 - Math.random()), 1 / par.a);           // Weibull(α, β, γ)
      const h = (1.3 + par.H * Math.pow(1 - Math.exp(-par.k * d), par.c)) * U(.92, 1.08);       // Chapman–Richards + noise
      return { x: Math.random(), d, h, z: Math.floor(Math.random() * 3) };                      // z: depth layer 0 (far) – 2 (near)
    }).sort((p, q) => p.z - q.z);
    document.getElementById('stand-cap').innerHTML = (TR
      ? `<b>Şekil 1.</b> ${n} ağaçlık meşcere. Çaplar Weibull(α = ${fmt(par.a, 2)}, β = ${fmt(par.b, 1)}, γ = ${fmt(par.g, 1)} cm). Bir ağacın üzerine gelin.`
      : `<b>Fig. 1.</b> A stand of ${n} trees. Diameters ~ Weibull(α = ${fmt(par.a, 2)}, β = ${fmt(par.b, 1)}, γ = ${fmt(par.g, 1)} cm). Hover over a tree.`);
  }
  function el(tag, attrs) { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; }
  function draw(animate) {
    const W = svg.clientWidth, Hpx = svg.clientHeight;
    const hMax = Math.max(...trees.map(t => t.h)), sy = (Hpx - 6) / hMax, sx = Math.max(.12, Math.min(.3, W / 3000));
    svg.setAttribute('viewBox', `0 0 ${W} ${Hpx}`);
    svg.textContent = '';
    const defs = el('defs', {});
    [7, 4.5, 2.6].forEach((gap, i) => {          // engraving hatches: sparse far away, dense up close
      const p = el('pattern', { id: 'hatch' + i, width: gap, height: gap, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(' + (i === 1 ? -40 : 40) + ')' });
      p.appendChild(el('line', { x1: 0, y1: 0, x2: 0, y2: gap, stroke: 'currentColor', 'stroke-width': i === 2 ? 1.1 : .9 }));
      defs.appendChild(p);
    });
    svg.appendChild(defs);
    trees.forEach(t => {
      const cx = 6 + t.x * (W - 12), y = Hpx - t.h * sy;
      const w = Math.max(1.6, t.d * sx * 1.5), top = w * .45;
      const cw = Math.max(5, (1.2 + .16 * t.d) * sy * .55), cl = t.h * sy * U(.32, .45);
      const g = el('g', { class: 'tree' });
      g.appendChild(el('path', { d: `M${cx - w / 2} ${Hpx}L${cx - top / 2} ${y + cl * .5}L${cx + top / 2} ${y + cl * .5}L${cx + w / 2} ${Hpx}Z` }));
      const crown = el('rect', { x: cx - cw / 2, y, width: cw, height: cl, rx: cw / 2, class: 'crown', fill: `url(#hatch${t.z})` });
      g.appendChild(crown);
      if (animate) g.style.setProperty('--d', (t.x * .7).toFixed(2) + 's'); else g.style.animation = 'none';
      t.el = g; t.cx = cx; t.y = y; svg.appendChild(g);
    });
    svg.appendChild(el('line', { x1: 0, x2: W, y1: Hpx - 1, y2: Hpx - 1, class: 'ground' }));
  }
  let on = null;
  function pick(ev) {
    const r = svg.getBoundingClientRect(), x = ev.clientX - r.left;
    let best = null, bd = 1e9;
    trees.forEach(t => { const dd = Math.abs(t.cx - x) - t.z * 2; if (dd < bd) { bd = dd; best = t; } });
    if (!best) return;
    if (on) on.el.classList.remove('on'); on = best; best.el.classList.add('on');
    svg.appendChild(best.el); svg.appendChild(svg.querySelector('.ground'));
    tip.hidden = false; tip.style.left = (best.cx + 10) + 'px'; tip.style.top = (best.y + 10) + 'px';
    tip.innerHTML = `d = ${fmt(best.d, 1)} cm<br>h = ${fmt(best.h, 1)} m`;
  }
  svg.addEventListener('pointermove', pick);
  svg.addEventListener('pointerdown', pick);
  svg.addEventListener('pointerleave', () => { if (on) { on.el.classList.remove('on'); on = null; } tip.hidden = true; });
  document.getElementById('resample').addEventListener('click', () => { tip.hidden = true; on = null; sample(); draw(true); });
  let rw = 0; new ResizeObserver(() => { if (svg.clientWidth !== rw) { const first = !rw; rw = svg.clientWidth; if (first) { sample(); draw(true); } else draw(false); } }).observe(svg);

  // ---------- course tabs ----------
  const tabs = [...document.querySelectorAll('.courses [role=tab]')];
  function select(slug, focus) {
    const t = tabs.find(x => x.dataset.slug === slug) || tabs[0]; if (!t) return;
    tabs.forEach(x => { const sel = x === t; x.setAttribute('aria-selected', sel); x.tabIndex = sel ? 0 : -1;
      document.getElementById(x.getAttribute('aria-controls')).hidden = !sel; });
    if (focus) t.focus();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { select(t.dataset.slug); history.replaceState(null, '', '#ders-' + t.dataset.slug); });
    t.addEventListener('keydown', e => {
      const k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (k) { e.preventDefault(); const n = tabs[(i + k + tabs.length) % tabs.length]; select(n.dataset.slug, true); history.replaceState(null, '', '#ders-' + n.dataset.slug); }
    });
  });
  const fromHash = () => { const m = location.hash.match(/^#ders-(.+)$/); if (m) { select(decodeURIComponent(m[1])); document.getElementById('dersler').scrollIntoView(); } };
  select(tabs[0] && tabs[0].dataset.slug); fromHash(); addEventListener('hashchange', fromHash);
  document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => copy(location.origin + location.pathname + b.dataset.copy, b)));

  // ---------- publications ----------
  const q = document.getElementById('q');
  if (q) {
    let kind = '';
    const pubs = [...document.querySelectorAll('.pub')], heads = [...document.querySelectorAll('.yhead')], none = document.querySelector('.noresult');
    const norm = s => s.toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
    pubs.forEach(p => p._t = norm(p.textContent));
    function apply() {
      const words = norm(q.value).split(/\s+/).filter(Boolean);
      pubs.forEach(p => p.hidden = (kind && p.dataset.k !== kind) || !words.every(w => p._t.includes(w)));
      heads.forEach(hd => hd.hidden = !pubs.some(p => !p.hidden && p.dataset.y === hd.textContent.trim()));
      none.hidden = pubs.some(p => !p.hidden);
    }
    q.addEventListener('input', apply);
    document.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', x === c)); kind = c.dataset.k; apply();
    }));
  }
  document.querySelectorAll('[data-cite]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); copy(a.dataset.cite, a); }));
})();
</script>
<?php paper_bottom(ob_get_clean());
