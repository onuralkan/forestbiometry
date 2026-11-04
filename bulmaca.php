<?php
require __DIR__ . '/inc/common.php';
require __DIR__ . '/inc/paper.php';
$c = paper_ctx(); $tr = $c['tr'];
paper_top([
    'title'   => $tr ? 'Bulmaca Köşesi' : 'Crossword Corner',
    'desc'    => $tr ? 'Her gün yeni bir ormancılık bulmacası.' : 'A new forestry crossword every day.',
    'compact' => true,
]);
?>
<main>
  <header class="sup-head">
    <p class="sc"><?= $tr ? 'Ek 3. Eğlence' : 'Supplement 3. Leisure' ?></p>
    <h1><?= $tr ? 'Bulmaca Köşesi' : 'Crossword Corner' ?></h1>
    <p class="deck" id="xw-sub"></p>
  </header>

  <div style="border-top:3px double var(--ink);padding-top:14px">
    <div class="xw-meta">
      <span id="xw-no"></span>
      <span><?= $tr ? 'Süre' : 'Time' ?>: <b id="xw-time" class="num">0:00</b></span>
    </div>
    <div class="btns" role="toolbar" aria-label="<?= $tr ? 'Bulmaca araçları' : 'Puzzle tools' ?>">
      <button type="button" class="btn" data-act="check"><?= $tr ? 'Kontrol et' : 'Check' ?></button>
      <button type="button" class="btn ghost" data-act="letter"><?= $tr ? 'Harf göster' : 'Reveal letter' ?></button>
      <button type="button" class="btn ghost" data-act="word"><?= $tr ? 'Kelimeyi göster' : 'Reveal word' ?></button>
      <button type="button" class="btn ghost" data-act="all"><?= $tr ? 'Çözümü göster' : 'Reveal all' ?></button>
      <button type="button" class="btn ghost" data-act="clear"><?= $tr ? 'Temizle' : 'Clear' ?></button>
      <button type="button" class="btn ghost" data-act="print"><?= $tr ? 'Yazdır' : 'Print' ?></button>
      <button type="button" class="btn ghost" data-act="random"><?= $tr ? 'Rastgele bulmaca' : 'Random puzzle' ?></button>
      <button type="button" class="btn ghost" data-act="today" hidden><?= $tr ? 'Bugünün bulmacası' : 'Today\'s puzzle' ?></button>
    </div>
    <p class="msg" id="xw-msg" role="status" aria-live="polite"></p>
    <div id="xw-done" class="xw-done" hidden></div>
    <div class="xw-wrap">
      <div id="xw-host">
        <div class="xw" id="xw" role="grid" aria-label="<?= $tr ? 'Bulmaca ızgarası' : 'Crossword grid' ?>"></div>
        <p class="xw-cur" id="xw-cur" aria-live="polite"></p>
      </div>
      <div class="xw-clues">
        <h3><?= $tr ? 'Soldan sağa' : 'Across' ?></h3><ol id="cl-a"></ol>
        <h3><?= $tr ? 'Yukarıdan aşağı' : 'Down' ?></h3><ol id="cl-d"></ol>
      </div>
    </div>
    <p class="note"><?= $tr
      ? 'Bir kareye tıklayıp yazmaya başlayın. Aynı kareye tekrar tıklamak veya Enter yön değiştirir; ok tuşları gezdirir, Tab bir sonraki kelimeye geçer. Bulmaca her gün yenilenir; bütün sınıf aynı bulmacayı çözer.'
      : 'Click a square and start typing. Click it again or press Enter to switch direction; arrow keys move, Tab jumps to the next word. A new puzzle appears every day, and the whole class gets the same one.' ?></p>
  </div>
</main>
<?php ob_start(); ?>
<script src="assets/tools.js?v=2"></script>
<script src="assets/bulmaca-kelimeler.js?v=1"></script>
<script>
(() => {
  const T = MP, TR = T.lang === 'tr', $ = id => document.getElementById(id);
  const LIST = (window.BULMACA && BULMACA[TR ? 'tr' : 'en']) || [];
  const up = s => TR ? s.toLocaleUpperCase('tr') : s.toUpperCase();
  const LETTER = TR ? /[A-ZÇĞİIÖŞÜ]/ : /[A-Z]/;
  const L = TR ? {
    sub: 'Ağaç türleri, ölçüm aletleri, silvikültür ve biraz da istatistik.', daily: n => `Bulmaca No. ${n}, günün bulmacası`, random: 'Rastgele bulmaca',
    a: 'Soldan sağa', d: 'Yukarıdan aşağı', bad: n => n ? `${n} harf yanlış; üzerleri çizildi.` : 'Şimdiye kadar yazdıklarınızın hepsi doğru.',
    sure: 'Bütün çözüm gösterilsin mi?', done: t => `Tebrikler! Bulmacayı ${t} sürede çözdünüz.`, doneHelp: t => `Bulmaca tamam (${t}), ama birkaç harfe yardım aldınız. Yarın yardımsız deneyin.`,
    cell: (n, ch) => `${n}. kare`, empty: 'Kelime listesi bulunamadı.'
  } : {
    sub: 'Tree species, measuring instruments, silviculture and a little statistics.', daily: n => `Puzzle No. ${n}, today's puzzle`, random: 'Random puzzle',
    a: 'Across', d: 'Down', bad: n => n ? `${n} letter(s) wrong; they are struck through.` : 'Everything you have entered so far is correct.',
    sure: 'Reveal the whole solution?', done: t => `Well done! You solved it in ${t}.`, doneHelp: t => `Puzzle complete (${t}), with a little help. Try it unaided tomorrow.`,
    cell: (n) => `square ${n}`, empty: 'Word list not found.'
  };
  $('xw-sub').textContent = L.sub;

  /* ---------- generator ---------- */
  function generate(seedStr) {
    const rng = T.rng(T.seed(seedStr));
    const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const MAX = 13, TARGET = 14;   // same size everywhere, so the whole class gets the same puzzle
    let best = null;
    for (let t = 0; t < 40; t++) {
      const pool = shuffle(LIST).map(([w, clue]) => ({ w: Array.from(up(w)), clue })).filter(x => x.w.length >= 3 && x.w.length <= MAX);
      const grid = new Map(), dirs = new Map(), placed = [], used = new Set();
      let box = { r0: 0, r1: 0, c0: 0, c1: 0 }, crossings = 0;
      const fits = (w, r, c, d) => {
        const dr = d === 'd' ? 1 : 0, dc = d === 'a' ? 1 : 0; let cross = 0;
        if (grid.has((r - dr) + ',' + (c - dc)) || grid.has((r + dr * w.length) + ',' + (c + dc * w.length))) return -1;
        for (let i = 0; i < w.length; i++) {
          const rr = r + dr * i, cc = c + dc * i, k = rr + ',' + cc, ex = grid.get(k);
          if (ex !== undefined) { if (ex !== w[i] || (dirs.get(k) || '').includes(d)) return -1; cross++; }
          else if (grid.has(d === 'a' ? (rr - 1) + ',' + cc : rr + ',' + (cc - 1)) || grid.has(d === 'a' ? (rr + 1) + ',' + cc : rr + ',' + (cc + 1))) return -1;
        }
        return cross;
      };
      const boxWith = (n, r, c, d) => ({ r0: Math.min(box.r0, r), c0: Math.min(box.c0, c), r1: Math.max(box.r1, d === 'd' ? r + n - 1 : r), c1: Math.max(box.c1, d === 'a' ? c + n - 1 : c) });
      const put = p => {
        p.w.forEach((ch, i) => { const k = (p.r + (p.d === 'd' ? i : 0)) + ',' + (p.c + (p.d === 'a' ? i : 0)); grid.set(k, ch); dirs.set(k, (dirs.get(k) || '') + p.d); });
        box = placed.length ? boxWith(p.w.length, p.r, p.c, p.d) : { r0: 0, c0: 0, r1: p.d === 'd' ? p.w.length - 1 : 0, c1: p.d === 'a' ? p.w.length - 1 : 0 };
        placed.push(p); used.add(p.w.join(''));
      };
      const first = [...pool.slice(0, 6)].sort((x, y) => y.w.length - x.w.length)[0];
      put({ ...first, r: 0, c: 0, d: rng() < .5 ? 'a' : 'd' });
      for (let pass = 0; pass < 3 && placed.length < TARGET; pass++) {
        for (const it of pool) {
          if (placed.length >= TARGET) break;
          if (used.has(it.w.join(''))) continue;
          let cand = null;
          for (const P of placed) for (let i = 0; i < P.w.length; i++) for (let j = 0; j < it.w.length; j++) {
            if (it.w[j] !== P.w[i]) continue;
            const d = P.d === 'a' ? 'd' : 'a', r = P.d === 'a' ? P.r - j : P.r + i, c = P.d === 'a' ? P.c + i : P.c - j;
            const cr = fits(it.w, r, c, d); if (cr < 1) continue;
            const nb = boxWith(it.w.length, r, c, d), wdt = nb.c1 - nb.c0 + 1, hgt = nb.r1 - nb.r0 + 1;
            if (wdt > MAX || hgt > MAX) continue;
            const grow = wdt * hgt - (box.c1 - box.c0 + 1) * (box.r1 - box.r0 + 1);
            const score = cr * 10 - grow / 6 - Math.abs(wdt - hgt) / 2 + rng();
            if (!cand || score > cand.score) cand = { score, r, c, d, cr };
          }
          if (cand) { put({ ...it, r: cand.r, c: cand.c, d: cand.d }); crossings += cand.cr; }
        }
      }
      const area = (box.c1 - box.c0 + 1) * (box.r1 - box.r0 + 1);
      const score = placed.length * 100 + crossings * 8 - area / 4;
      if (!best || score > best.score) best = { placed: placed.map(p => ({ ...p })), box, score };
    }
    const { placed, box } = best, rows = box.r1 - box.r0 + 1, cols = box.c1 - box.c0 + 1;
    placed.forEach(p => { p.r -= box.r0; p.c -= box.c0; });
    const starts = new Map(); let n = 0;
    [...placed].sort((x, y) => x.r - y.r || x.c - y.c).forEach(p => { const k = p.r + ',' + p.c; if (!starts.has(k)) starts.set(k, ++n); p.num = starts.get(k); });
    const cells = new Map();
    placed.forEach(p => p.w.forEach((ch, i) => {
      const r = p.r + (p.d === 'd' ? i : 0), c = p.c + (p.d === 'a' ? i : 0), k = r + ',' + c;
      const cell = cells.get(k) || { r, c, ch, w: {} }; cell.w[p.d] = p; cells.set(k, cell);
      p.keys = p.keys || []; p.keys.push(k);
    }));
    return { rows, cols, placed, cells, starts };
  }

  /* ---------- state ---------- */
  let P, seed, cur = null, dir = 'a', vals = {}, shown = new Set(), elapsed = 0, timer = null, solved = false, inputs = new Map();
  const pad = s => String(s).padStart(2, '0'), clock = s => Math.floor(s / 60) + ':' + pad(s % 60);
  const todaySeed = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const dayNo = () => { const d = new Date(), s = new Date(d.getFullYear(), 0, 0); return Math.floor((d - s) / 864e5); };
  const store = () => { try { localStorage.setItem('xw:' + seed, JSON.stringify({ vals, shown: [...shown], elapsed, solved })); } catch (e) {} };

  function build() {
    const m = location.hash.match(/s=([\w-]+)/);
    seed = (m ? 'r-' + m[1] : todaySeed()) + '-' + (TR ? 'tr' : 'en');
    document.querySelector('[data-act=today]').hidden = !m;
    $('xw-no').textContent = m ? L.random : L.daily(dayNo());
    if (!LIST.length) { $('xw-msg').textContent = L.empty; return; }
    P = generate(seed);
    vals = {}; shown = new Set(); elapsed = 0; solved = false; cur = null; dir = 'a';
    try { const s = JSON.parse(localStorage.getItem('xw:' + seed) || 'null'); if (s) { vals = s.vals || {}; shown = new Set(s.shown || []); elapsed = s.elapsed || 0; solved = !!s.solved; } } catch (e) {}
    clearInterval(timer); timer = null; $('xw-time').textContent = clock(elapsed);
    $('xw-done').hidden = true; $('xw-msg').textContent = '';
    const g = $('xw'); g.innerHTML = ''; inputs = new Map();
    g.style.gridTemplateColumns = `repeat(${P.cols}, var(--cell))`;
    sizeCells();
    for (let r = 0; r < P.rows; r++) for (let c = 0; c < P.cols; c++) {
      const k = r + ',' + c, cell = P.cells.get(k), div = document.createElement('div');
      div.className = 'c' + (cell ? ' on' : ''); div.setAttribute('role', 'gridcell');
      if (cell) {
        if (P.starts.has(k)) { const s = document.createElement('span'); s.className = 'n'; s.textContent = P.starts.get(k); div.append(s); }
        const inp = document.createElement('input');
        Object.assign(inp, { maxLength: 2, autocomplete: 'off', spellcheck: false, value: vals[k] || '' });
        inp.setAttribute('autocapitalize', 'characters'); inp.setAttribute('aria-label', (P.starts.has(k) ? P.starts.get(k) + '. ' : '') + L.cell(r * P.cols + c + 1));
        inp.dataset.k = k; div.append(inp); inputs.set(k, inp);
        if (shown.has(k)) div.classList.add('shown');
        inp.addEventListener('pointerdown', ev => { if (cur === k) { ev.preventDefault(); toggle(); } });
        inp.addEventListener('focus', () => select(k));
        inp.addEventListener('input', () => onInput(k, inp));
        inp.addEventListener('keydown', ev => onKey(ev, k, inp));
      }
      g.append(div);
    }
    ['a', 'd'].forEach(d => {
      $('cl-' + d).innerHTML = '';
      P.placed.filter(p => p.d === d).sort((x, y) => x.num - y.num).forEach(p => {
        const li = document.createElement('li'); li.innerHTML = `<b>${p.num}</b><span></span>`; li.lastChild.textContent = p.clue; p.li = li;
        li.addEventListener('click', () => { dir = d; focus(p.keys.find(k => !vals[k]) || p.keys[0]); });
        $('cl-' + d).append(li);
      });
    });
    paint(); if (solved) finish(true);
  }
  function sizeCells() { const w = $('xw-host').clientWidth || 600; $('xw').style.setProperty('--cell', Math.max(22, Math.min(40, Math.floor((w - 4) / P.cols))) + 'px'); }

  const wordAt = (k, d) => { const c = P.cells.get(k); return c && c.w[d]; };
  function select(k) { if (!wordAt(k, dir)) dir = dir === 'a' ? 'd' : 'a'; cur = k; paint(); }
  function toggle() { const o = dir === 'a' ? 'd' : 'a'; if (wordAt(cur, o)) { dir = o; paint(); } }
  function focus(k) { const i = inputs.get(k); if (i) { cur = k; i.focus({ preventScroll: true }); select(k); } }
  function paint() {
    const w = cur && wordAt(cur, dir), on = new Set(w ? w.keys : []);
    inputs.forEach((inp, k) => { const d = inp.parentNode; d.classList.toggle('word', on.has(k)); d.classList.toggle('cur', k === cur); });
    P.placed.forEach(p => { p.li.classList.toggle('act', p === w); p.li.classList.toggle('done', p.keys.every(k => vals[k])); });
    $('xw-cur').innerHTML = w ? `<b>${w.num} ${dir === 'a' ? L.a : L.d}.</b> ` : '&nbsp;';
    if (w) $('xw-cur').append(document.createTextNode(w.clue + ` (${w.w.length})`));
  }
  function step(k, delta) { const w = wordAt(k, dir); if (!w) return null; const i = w.keys.indexOf(k) + delta; return w.keys[i] || null; }
  function setVal(k, v) { vals[k] = v; if (!v) delete vals[k]; inputs.get(k).value = v; inputs.get(k).parentNode.classList.remove('bad'); }
  function startTimer() { if (timer || solved) return; timer = setInterval(() => { elapsed++; $('xw-time').textContent = clock(elapsed); if (elapsed % 5 === 0) store(); }, 1000); }
  function onInput(k, inp) {
    const chars = Array.from(up(inp.value)).filter(ch => LETTER.test(ch)), v = chars[chars.length - 1] || '';
    setVal(k, v); if (v) { startTimer(); const n = step(k, 1); if (n) focus(n); }
    paint(); store(); check(false);
  }
  function onKey(ev, k, inp) {
    const move = { ArrowRight: [0, 1, 'a'], ArrowLeft: [0, -1, 'a'], ArrowDown: [1, 0, 'd'], ArrowUp: [-1, 0, 'd'] }[ev.key];
    if (move) {
      ev.preventDefault();
      if (dir !== move[2] && wordAt(k, move[2])) { dir = move[2]; paint(); return; }
      let [r, c] = k.split(',').map(Number);
      for (let i = 0; i < Math.max(P.rows, P.cols); i++) { r += move[0]; c += move[1]; if (inputs.has(r + ',' + c)) return focus(r + ',' + c); }
      return;
    }
    if (ev.key === 'Backspace') { ev.preventDefault(); if (vals[k]) setVal(k, ''); else { const p = step(k, -1); if (p) { setVal(p, ''); focus(p); } } paint(); store(); return; }
    if (ev.key === 'Delete') { ev.preventDefault(); setVal(k, ''); paint(); store(); return; }
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(); return; }
    if (ev.key === 'Tab') {
      ev.preventDefault();
      const order = [...P.placed].sort((x, y) => (x.d === y.d ? 0 : x.d === 'a' ? -1 : 1) || x.num - y.num);
      const w = wordAt(k, dir), i = order.indexOf(w), nx = order[(i + (ev.shiftKey ? -1 : 1) + order.length) % order.length];
      dir = nx.d; focus(nx.keys.find(q => !vals[q]) || nx.keys[0]);
    }
  }
  function check(mark) {
    let bad = 0, full = true;
    P.cells.forEach((c, k) => { const v = vals[k]; if (!v) full = false; else if (v !== c.ch) { bad++; if (mark) inputs.get(k).parentNode.classList.add('bad'); } });
    if (mark) $('xw-msg').textContent = L.bad(bad);
    if (full && !bad && !solved) { solved = true; finish(false); }
  }
  function finish(quiet) {
    clearInterval(timer); timer = null; store();
    $('xw-done').textContent = shown.size ? L.doneHelp(clock(elapsed)) : L.done(clock(elapsed)); $('xw-done').hidden = false;
    if (!quiet) $('xw-done').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function reveal(keys) { keys.forEach(k => { if (vals[k] !== P.cells.get(k).ch) { setVal(k, P.cells.get(k).ch); shown.add(k); inputs.get(k).parentNode.classList.add('shown'); } }); paint(); store(); check(false); }

  document.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => {
    const a = b.dataset.act, w = cur && wordAt(cur, dir);
    if (a === 'check') check(true);
    if (a === 'letter' && cur) reveal([cur]);
    if (a === 'word' && w) reveal(w.keys);
    if (a === 'all' && confirm(L.sure)) reveal([...P.cells.keys()]);
    if (a === 'clear') { [...inputs.keys()].forEach(k => { setVal(k, ''); inputs.get(k).parentNode.classList.remove('shown'); }); shown = new Set(); solved = false; elapsed = 0; clearInterval(timer); timer = null; $('xw-time').textContent = '0:00'; $('xw-done').hidden = true; $('xw-msg').textContent = ''; paint(); store(); }
    if (a === 'print') print();
    if (a === 'random') location.hash = 's=' + Math.random().toString(36).slice(2, 8);
    if (a === 'today') history.pushState(null, '', location.pathname + location.search), build();
  }));
  addEventListener('hashchange', build);
  addEventListener('visibilitychange', () => { if (document.hidden) { store(); clearInterval(timer); timer = null; } });
  let rw = innerWidth; addEventListener('resize', () => { if (P && Math.abs(innerWidth - rw) > 30) { rw = innerWidth; sizeCells(); } });
  build();
})();
</script>
<?php paper_bottom(ob_get_clean());
