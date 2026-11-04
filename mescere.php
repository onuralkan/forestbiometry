<?php
require __DIR__ . '/inc/common.php';
require __DIR__ . '/inc/paper.php';
$c = paper_ctx(); $tr = $c['tr'];
paper_top([
    'title'   => $tr ? 'Meşcere Hesaplayıcı' : 'Stand Calculator',
    'desc'    => $tr ? 'Örnek alandaki çap ve boy ölçümlerinden hektardaki ağaç sayısı, göğüs yüzeyi, orta çap, üst boy ve hacmi hesaplayın.'
                     : 'Compute stems, basal area, mean diameter, top height and volume per hectare from plot measurements.',
    'compact' => true,
]);
?>
<main>
  <header class="sup-head">
    <p class="sc"><?= $tr ? 'Ek 1. Orman envanteri' : 'Supplement 1. Forest inventory' ?></p>
    <h1><?= $tr ? 'Meşcere Hesaplayıcı' : 'Stand Calculator' ?></h1>
    <p class="deck"><?= $tr ? 'Örnek alandaki ölçümlerinizi yapıştırın; gerisini gazetemiz hesaplasın.' : 'Paste your plot measurements; the paper does the arithmetic.' ?></p>
  </header>

  <div class="sup-grid">
    <form id="f" onsubmit="return false" aria-label="<?= $tr ? 'Ölçümler' : 'Measurements' ?>">
      <h2 class="box-h"><?= $tr ? 'Ölçümler' : 'Measurements' ?></h2>
      <label class="field"><span><?= $tr ? 'Örnek alan büyüklüğü (m²)' : 'Plot size (m²)' ?></span>
        <input id="area" type="number" min="10" step="any" value="400" inputmode="decimal"></label>
      <p class="hint" id="area-hint"></p>

      <label class="field"><span><?= $tr ? 'Çap (cm) ve boy (m), her satıra bir ağaç' : 'Diameter (cm) and height (m), one tree per line' ?></span>
        <textarea id="data" spellcheck="false" placeholder="<?= $tr ? "23,5\t18,2\n31\t21,4\n18,4\n…" : "23.5\t18.2\n31\t21.4\n18.4\n…" ?>"></textarea></label>
      <p class="hint"><?= $tr
        ? 'Excel\'den iki sütunu doğrudan yapıştırabilirsiniz. Boyu ölçülmeyen ağaçlarda ikinci sütunu boş bırakın; boyları ölçülen ağaçlardan uydurulan Näslund modeliyle tahmin edilir. Ondalık için virgül de nokta da olur.'
        : 'Paste two columns straight from Excel. Leave the second column empty for trees without a height; it will be predicted from a Näslund model fitted to the measured trees.' ?></p>

      <div class="row2">
        <label class="field"><span><?= $tr ? 'Çap basamağı genişliği' : 'Diameter class width' ?></span>
          <select id="cw"><option value="2">2 cm</option><option value="4" selected>4 cm</option><option value="5">5 cm</option></select></label>
        <label class="field"><span><?= $tr ? 'Üst boy için ağaç/ha' : 'Top-height trees/ha' ?></span>
          <input id="ntop" type="number" min="1" step="1" value="100"></label>
      </div>

      <fieldset class="plain">
        <legend><?= $tr ? 'Ağaç hacmi' : 'Tree volume' ?></legend>
        <label class="radio"><input type="radio" name="vm" value="f" checked> <?= $tr ? 'Biçim sayısıyla: v = g · h · f' : 'Form factor: v = g · h · f' ?></label>
        <div class="method-extra" data-for="f"><label class="field"><span><?= $tr ? 'f, biçim sayısı' : 'f, form factor' ?></span><input id="ff" type="text" inputmode="decimal" placeholder="<?= $tr ? 'kaynağınızdaki değer' : 'value from your source' ?>"></label></div>
        <label class="radio"><input type="radio" name="vm" value="eq"> <?= $tr ? 'Kendi denkleminizle: v = b₀ · dᵇ¹ · hᵇ²' : 'Your own equation: v = b₀ · dᵇ¹ · hᵇ²' ?></label>
        <div class="method-extra" data-for="eq" hidden>
          <div class="row3">
            <label class="field"><span>b₀</span><input id="b0" type="text" inputmode="decimal"></label>
            <label class="field"><span>b₁</span><input id="b1" type="text" inputmode="decimal"></label>
            <label class="field"><span>b₂</span><input id="b2" type="text" inputmode="decimal"></label>
          </div>
          <p class="hint"><?= $tr ? 'd cm, h m, v m³ olacak şekilde katsayıları ders notlarınızdaki tür ve yöreye ait hacim denkleminden girin. Site hazır katsayı vermez; hacim, girdiğiniz katsayılarla hesaplanır.'
                                  : 'Enter coefficients (d in cm, h in m, v in m³) from a volume equation for your species and region. The site provides no coefficients; volume is computed with the ones you enter.' ?></p>
        </div>
      </fieldset>

      <div class="btns">
        <button type="button" class="btn" id="calc"><?= $tr ? 'Hesapla' : 'Calculate' ?></button>
        <button type="button" class="btn ghost" id="sample"><?= $tr ? 'Örnek veri' : 'Sample data' ?></button>
        <button type="button" class="btn ghost" id="clear"><?= $tr ? 'Temizle' : 'Clear' ?></button>
      </div>
      <p class="msg" id="msg" role="status" aria-live="polite"></p>
    </form>

    <section id="out" aria-label="<?= $tr ? 'Sonuçlar' : 'Results' ?>">
      <h2 class="box-h"><?= $tr ? 'Sonuçlar, hektar başına' : 'Results per hectare' ?></h2>
      <div id="empty" class="hint"><?= $tr ? 'Soldaki kutuya ölçümlerinizi yapıştırın veya "Örnek veri" ile deneyin.' : 'Paste your measurements on the left, or try "Sample data".' ?></div>
      <div id="res" hidden>
        <div class="headline-nums" id="nums"></div>
        <div class="figures">
          <figure class="fig"><svg id="ch1" role="img"></svg><figcaption id="cap1"></figcaption></figure>
          <figure class="fig"><svg id="ch2" role="img"></svg><figcaption id="cap2"></figcaption></figure>
        </div>
        <div class="ledger-wrap"><table class="ledger" id="summary"></table></div>
        <div class="ledger-wrap"><table class="ledger" id="classes"></table></div>
        <div class="btns">
          <button type="button" class="btn ghost" id="dl-sum"><?= $tr ? 'Özet ve basamaklar (CSV)' : 'Summary and classes (CSV)' ?></button>
          <button type="button" class="btn ghost" id="dl-trees"><?= $tr ? 'Ağaç listesi (CSV)' : 'Tree list (CSV)' ?></button>
          <button type="button" class="btn ghost" onclick="print()"><?= $tr ? 'Yazdır' : 'Print' ?></button>
        </div>
        <p class="note"><?= $tr
          ? 'Hektara çevirme katsayısı 10 000 / örnek alan. Dg: kareli ortalama çap, √(Σd²/n). Lorey boyu: göğüs yüzeyi ağırlıklı ortalama boy, Σgh/Σg. Üst boy (h₁₀₀): hektardaki en kalın 100 ağacın ortalama boyu. Näslund modeli: h = 1,3 + d² / (a + b·d)², d / √(h − 1,3) = a + b·d doğrusal biçimiyle en küçük kareler yöntemiyle uydurulur. Reineke SDI = N · (Dg / 25)^1,605.'
          : 'Expansion factor = 10,000 / plot area. Dg: quadratic mean diameter, √(Σd²/n). Lorey height: basal-area weighted mean height, Σgh/Σg. Top height (h₁₀₀): mean height of the 100 thickest trees per hectare. Näslund model h = 1.3 + d²/(a + b·d)², fitted by least squares on its linear form d/√(h − 1.3) = a + b·d. Reineke SDI = N · (Dg/25)^1.605.' ?></p>
      </div>
    </section>
  </div>
</main>
<?php ob_start(); ?>
<script src="assets/tools.js?v=2"></script>
<script>
(() => {
  const T = MP, TR = T.lang === 'tr', $ = id => document.getElementById(id), f = T.fmt;
  const L = TR ? {
    n: 'Ağaç sayısı', nu: 'ağaç/ha', g: 'Göğüs yüzeyi', gu: 'm²/ha', dg: 'Orta çap (Dg)', lorey: 'Lorey boyu', htop: 'Üst boy (h₁₀₀)', v: 'Hacim', vu: 'm³/ha',
    sum: 'Meşcere özeti', plotN: 'Örnek alandaki ağaç', measH: 'boyu ölçülen', dbar: 'Aritmetik ortalama çap', dsd: 'Çapların standart sapması', cv: 'Değişim katsayısı',
    range: 'En küçük – en büyük çap', d100: 'Üst çap (d₁₀₀)', hbar: 'Ölçülen boyların ortalaması', nas: 'Näslund katsayıları', rmse: 'boy RMSE', sdi: 'Reineke sıklık indeksi (SDI)',
    cls: 'Çap basamakları', clsH: ['Basamak (cm)', 'Orta değer', 'ağaç/ha', 'm²/ha', 'm³/ha', 'ort. boy (m)'], tot: 'Toplam',
    c1: '<b>Şekil 1.</b> Çap dağılımı, hektarda ağaç sayısı', c2: '<b>Şekil 2.</b> Boy–çap ilişkisi', meas: 'ölçülen', est: 'tahmin edilen', curve: 'Näslund eğrisi',
    xd: 'Göğüs çapı (cm)', yn: 'ağaç/ha', yh: 'Boy (m)',
    noData: 'Geçerli ölçüm bulunamadı. Her satıra en az bir çap değeri girin.', fewH: 'Boy tahmini için en az 3 ağacın boyu ölçülmüş olmalı. Hacim ve boy değerleri hesaplanamadı.',
    skipped: n => `${n} satır okunamadı veya geçersizdi (çap 0'dan büyük, boy 1,3 m'den büyük olmalı); hesaba katılmadı.`,
    estN: (k, n) => `${n} ağacın ${k} tanesinin boyu Näslund modeliyle tahmin edildi.`, areaHint: r => `Daire biçimli alan için yarıçap ${f(r, 2)} m.`,
    trees: 'ağac', file: 'mescere',
    needF: 'Hacim için biçim sayısını (f) girin; türünüz ve yörenize ait değeri kaynağınızdan alın.', needEq: 'Hacim için denklemin üç katsayısını da girin.',
    vbasis: 'Hacmin dayanağı', volF: ff => `Kullanıcının girdiği biçim sayısı, f = ${f(ff, 3)}`, volEq: (a, b, c) => `Kullanıcının girdiği denklem: v = ${String(a).replace('.', ',')} · d^${String(b).replace('.', ',')} · h^${String(c).replace('.', ',')}`
  } : {
    n: 'Stems', nu: 'trees/ha', g: 'Basal area', gu: 'm²/ha', dg: 'Mean diameter (Dg)', lorey: 'Lorey height', htop: 'Top height (h₁₀₀)', v: 'Volume', vu: 'm³/ha',
    sum: 'Stand summary', plotN: 'Trees in plot', measH: 'with measured height', dbar: 'Arithmetic mean diameter', dsd: 'SD of diameters', cv: 'Coefficient of variation',
    range: 'Min – max diameter', d100: 'Top diameter (d₁₀₀)', hbar: 'Mean measured height', nas: 'Näslund coefficients', rmse: 'height RMSE', sdi: 'Reineke stand density index (SDI)',
    cls: 'Diameter classes', clsH: ['Class (cm)', 'Midpoint', 'trees/ha', 'm²/ha', 'm³/ha', 'mean h (m)'], tot: 'Total',
    c1: '<b>Fig. 1.</b> Diameter distribution, trees per hectare', c2: '<b>Fig. 2.</b> Height–diameter relationship', meas: 'measured', est: 'predicted', curve: 'Näslund curve',
    xd: 'Diameter at breast height (cm)', yn: 'trees/ha', yh: 'Height (m)',
    noData: 'No valid measurements found. Enter at least one diameter per line.', fewH: 'At least 3 measured heights are needed to predict heights. Volume and heights could not be computed.',
    skipped: n => `${n} line(s) could not be read or were invalid (diameter must be > 0, height > 1.3 m) and were ignored.`,
    estN: (k, n) => `Heights of ${k} of ${n} trees were predicted with the Näslund model.`, areaHint: r => `For a circular plot the radius is ${f(r, 2)} m.`,
    trees: 'trees', file: 'stand',
    needF: 'Enter a form factor (f) to compute volume; take the value for your species and region from your source.', needEq: 'Enter all three coefficients to compute volume.',
    vbasis: 'Basis of volume', volF: ff => `User-entered form factor, f = ${f(ff, 3)}`, volEq: (a, b, c) => `User-entered equation: v = ${a} · d^${b} · h^${c}`
  };
  const LS = 'mescere-v2';   // v1 stored example coefficients; do not restore them
  const els = ['area', 'data', 'cw', 'ntop', 'ff', 'b0', 'b1', 'b2'];
  try { const s = JSON.parse(localStorage.getItem(LS) || 'null'); if (s) { els.forEach(k => { if (s[k] != null) $(k).value = s[k]; }); if (s.vm) document.querySelector(`[name=vm][value=${s.vm}]`).checked = true; } } catch (e) {}
  const vm = () => document.querySelector('[name=vm]:checked').value;
  const syncVm = () => document.querySelectorAll('.method-extra').forEach(d => d.hidden = d.dataset.for !== vm());
  syncVm();
  let last = null;

  function run() {
    const area = +$('area').value, cw = +$('cw').value, ntop = Math.max(1, +$('ntop').value || 100);
    $('area-hint').textContent = area > 0 ? L.areaHint(Math.sqrt(area / Math.PI)) : '';
    try { const s = { vm: vm() }; els.forEach(k => s[k] = $(k).value); localStorage.setItem(LS, JSON.stringify(s)); } catch (e) {}
    const lines = $('data').value.split(/\r?\n/).filter(s => s.trim()).length;
    const rows = T.parseRows($('data').value);
    const trees = [];
    rows.forEach(r => { const d = r[0], h = r.length > 1 ? r[1] : null; if (d > 0 && d < 400 && (h == null || (h > 1.3 && h < 90))) trees.push({ d, h }); });
    const msgs = [], skipped = lines - trees.length;
    if (!trees.length || !(area > 0)) { $('res').hidden = true; $('empty').hidden = false; setMsg(lines ? L.noData : '', !!lines); return; }
    if (skipped > 0) msgs.push(L.skipped(skipped));

    const ef = 10000 / area;
    const nas = T.fitNaslund(trees.filter(t => t.h != null).map(t => [t.d, t.h]));
    const nMeasured = trees.filter(t => t.h != null).length;
    // Volume only from values the user entered (no built-in coefficients)
    const num = id => { const v = String($(id).value).trim().replace(',', '.'); return v === '' ? NaN : Number(v); };
    let vol = null, volNote = '';
    if (vm() === 'f') { const ff = num('ff'); if (ff > 0 && ff <= 1.5) { vol = (d, h, g) => g * h * ff; volNote = L.volF(ff); } }
    else { const b0 = num('b0'), b1 = num('b1'), b2 = num('b2'); if ([b0, b1, b2].every(isFinite)) { vol = (d, h) => b0 * d ** b1 * h ** b2; volNote = L.volEq(b0, b1, b2); } }
    trees.forEach(t => {
      t.g = Math.PI / 4 * (t.d / 100) ** 2;
      t.est = t.h == null;
      t.H = t.est ? (nas ? nas.predict(t.d) : NaN) : t.h;
      t.v = vol ? vol(t.d, t.H, t.g) : NaN;
    });
    const kEst = trees.filter(t => t.est).length;
    if (kEst && !nas) msgs.push(L.fewH); else if (kEst) msgs.push(L.estN(kEst, trees.length));
    if (!vol) msgs.push(vm() === 'f' ? L.needF : L.needEq);

    const n = trees.length, ds = trees.map(t => t.d).sort((a, b) => a - b);
    const hasH = trees.every(t => isFinite(t.H));
    const G = T.sum(trees.map(t => t.g)) * ef, N = n * ef, dg = Math.sqrt(T.mean(trees.map(t => t.d * t.d)));
    const lorey = hasH ? T.sum(trees.map(t => t.g * t.H)) / T.sum(trees.map(t => t.g)) : NaN;
    const k = Math.min(n, Math.max(1, Math.round(ntop / ef)));
    const top = [...trees].sort((a, b) => b.d - a.d).slice(0, k);
    const htop = hasH ? T.mean(top.map(t => t.H)) : NaN, d100 = T.mean(top.map(t => t.d));
    const V = hasH && vol ? T.sum(trees.map(t => t.v)) * ef : NaN;
    const dbar = T.mean(ds), dsd = n > 1 ? T.sd(ds) : 0, sdi = N * (dg / 25) ** 1.605;

    $('nums').innerHTML = [[L.n, f(N, 0), L.nu], [L.g, f(G, 2), L.gu], [L.dg, f(dg, 1), 'cm'], [L.lorey, f(lorey, 1), 'm'], [L.htop, f(htop, 1), 'm'], [L.v, f(V, 1), L.vu]]
      .map(([a, b, u]) => `<div><b>${b}</b><span>${a}, ${u}</span></div>`).join('');

    const S = [
      [L.plotN, `${n} (${nMeasured} ${L.measH})`], [L.dbar, f(dbar, 1) + ' cm'], [L.dg, f(dg, 1) + ' cm'], [L.dsd, f(dsd, 2) + ' cm'],
      [L.cv, TR ? '%' + f(dsd / dbar * 100, 1) : f(dsd / dbar * 100, 1) + '%'], [L.range, f(ds[0], 1) + ' – ' + f(ds[n - 1], 1) + ' cm'], [L.d100 + ` (${k} ${L.trees})`, f(d100, 1) + ' cm'],
      [L.hbar, nMeasured ? f(T.mean(trees.filter(t => !t.est).map(t => t.h)), 1) + ' m' : '–'],
      [L.nas, nas ? `a = ${f(nas.a, 4)}, b = ${f(nas.b, 4)}; ${L.rmse} ${f(nas.rmse, 2)} m` : '–'], [L.sdi, f(sdi, 0)], [L.vbasis, vol ? volNote : '–']
    ];
    $('summary').innerHTML = `<caption>${L.sum}</caption><tbody>` + S.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('') + '</tbody>';

    // diameter classes
    const lo0 = Math.floor(ds[0] / cw) * cw, cls = [];
    for (let lo = lo0; lo <= ds[n - 1]; lo += cw) {
      const inC = trees.filter(t => t.d >= lo && t.d < lo + cw);
      cls.push({ lo, hi: lo + cw, mid: lo + cw / 2, n: inC.length * ef, g: T.sum(inC.map(t => t.g)) * ef, v: hasH ? T.sum(inC.map(t => t.v)) * ef : NaN, h: inC.length && hasH ? T.mean(inC.map(t => t.H)) : NaN });
    }
    $('classes').innerHTML = `<caption>${L.cls}</caption><thead><tr>${L.clsH.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>` +
      cls.map(c => `<tr><td>${f(c.lo, 0)}–${f(c.hi, 0)}</td><td>${f(c.mid, 0)}</td><td>${f(c.n, 0)}</td><td>${f(c.g, 2)}</td><td>${f(c.v, 1)}</td><td>${f(c.h, 1)}</td></tr>`).join('') +
      `</tbody><tfoot><tr><td>${L.tot}</td><td></td><td>${f(N, 0)}</td><td>${f(G, 2)}</td><td>${f(V, 1)}</td><td></td></tr></tfoot>`;

    $('res').hidden = false; $('empty').hidden = true;   // must be visible before drawing so charts get their real width
    // Fig 1: histogram
    const c1 = T.chart($('ch1'), { x: [lo0, cls[cls.length - 1].hi], y: [0, Math.max(...cls.map(c => c.n)) * 1.12], xlab: L.xd, ylab: L.yn });
    cls.forEach(c => { if (c.n > 0) T.el('rect', { x: c1.X(c.lo) + 1, y: c1.Y(c.n), width: Math.max(1, c1.X(c.hi) - c1.X(c.lo) - 2), height: c1.Y(0) - c1.Y(c.n), class: 'bar', fill: c1.hatch('A') }, c1.g); });
    $('cap1').innerHTML = L.c1;
    $('ch1').setAttribute('aria-label', L.c1.replace(/<[^>]+>/g, ''));

    // Fig 2: h–d
    const hs = trees.filter(t => isFinite(t.H)).map(t => t.H);
    if (hs.length) {
      const c2 = T.chart($('ch2'), { x: [0, Math.ceil(ds[n - 1] / 10) * 10], y: [0, Math.ceil(Math.max(...hs) / 5) * 5 + 2], xlab: L.xd, ylab: L.yh });
      if (nas) { const pts = []; for (let d = Math.max(1, ds[0] * .6); d <= ds[n - 1] * 1.05; d += .5) pts.push([c2.X(d), c2.Y(nas.predict(d))]); T.el('path', { d: T.path(pts), class: 'curve' }, c2.g); }
      trees.forEach(t => { if (isFinite(t.H)) T.el('circle', { cx: c2.X(t.d), cy: c2.Y(t.H), r: 3.4, class: t.est ? 'dot open' : 'dot' }, c2.g); });
      $('cap2').innerHTML = L.c2 + `<span class="legend"><span><svg viewBox="0 0 30 10"><circle cx="15" cy="5" r="3.4" class="dot"/></svg>${L.meas}</span><span><svg viewBox="0 0 30 10"><circle cx="15" cy="5" r="3.4" class="dot open"/></svg>${L.est}</span>${nas ? `<span><svg viewBox="0 0 30 10"><path d="M0 5h30" class="curve"/></svg>${L.curve}</span>` : ''}</span>`;
    } else { $('ch2').textContent = ''; $('cap2').innerHTML = L.c2 + ' –'; }

    last = { trees, cls, S, N, G, dg, lorey, htop, V };
    $('res').hidden = false; $('empty').hidden = true;
    setMsg(msgs.join(' '), kEst && !nas);
  }
  function setMsg(t, err) { $('msg').textContent = t; $('msg').className = 'msg' + (err ? ' err' : ''); }

  let timer; const later = () => { clearTimeout(timer); timer = setTimeout(run, 250); };
  els.forEach(k => $(k).addEventListener('input', later));
  document.querySelectorAll('[name=vm]').forEach(r => r.addEventListener('change', () => { syncVm(); run(); }));
  $('calc').addEventListener('click', run);
  $('clear').addEventListener('click', () => { $('data').value = ''; run(); $('data').focus(); });
  $('sample').addEventListener('click', () => {
    const rng = T.rng((Math.random() * 2 ** 32) >>> 0), a = 2.2 + rng() * 1.2, b = 12 + rng() * 8, g = 6 + rng() * 3;
    const Hmax = 24 + rng() * 8, n = Math.round(+$('area').value / 10000 * (550 + rng() * 350)) || 28, out = [];
    for (let i = 0; i < n; i++) {
      const d = Math.round(T.weibull.sample(rng, a, b, g) * 10) / 10;
      const h = Math.round((T.chapmanRichards(d, Hmax, .045, 1.3) + T.randn(rng) * 1.1) * 10) / 10;
      const s = i % 3 === 0 ? `${d}\t${Math.max(1.4, h)}` : `${d}`;
      out.push(TR ? s.replace(/\./g, ',') : s);
    }
    $('data').value = out.join('\n'); run();
  });
  const stamp = () => new Date().toISOString().slice(0, 10);
  $('dl-sum').addEventListener('click', () => {
    if (!last) return;
    const rows = [[L.sum, ''], ...last.S.map(r => [r[0], r[1]]), [L.n + ' (' + L.nu + ')', last.N], [L.g + ' (' + L.gu + ')', last.G], [L.lorey + ' (m)', last.lorey], [L.htop + ' (m)', last.htop], [L.v + ' (' + L.vu + ')', last.V], [],
      L.clsH, ...last.cls.map(c => [`${c.lo}-${c.hi}`, c.mid, c.n, c.g, c.v, c.h])];
    T.download(`${L.file}-${stamp()}.csv`, T.csv(rows));
  });
  $('dl-trees').addEventListener('click', () => {
    if (!last) return;
    const H = TR ? ['çap (cm)', 'boy (m)', 'boy tahmini mi', 'göğüs yüzeyi (m²)', 'hacim (m³)'] : ['dbh (cm)', 'height (m)', 'height predicted', 'basal area (m²)', 'volume (m³)'];
    T.download(`${L.file}-${TR ? 'agaclar' : 'trees'}-${stamp()}.csv`, T.csv([H, ...last.trees.map(t => [t.d, t.H, t.est ? (TR ? 'evet' : 'yes') : (TR ? 'hayır' : 'no'), t.g, t.v])]));
  });
  let rw = innerWidth; addEventListener('resize', () => { if (Math.abs(innerWidth - rw) > 40) { rw = innerWidth; if (last) run(); } });
  run();
})();
</script>
<?php paper_bottom(ob_get_clean());
