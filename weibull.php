<?php
require __DIR__ . '/inc/common.php';
require __DIR__ . '/inc/paper.php';
$c = paper_ctx(); $tr = $c['tr'];
paper_top([
    'title'   => $tr ? 'Çap Dağılımı Laboratuvarı' : 'Diameter Distribution Laboratory',
    'desc'    => $tr ? 'Weibull, gamma, normal, lognormal ve Johnson SB dağılımlarıyla oynayın; kendi çap verinizi beş dağılımla uydurup karşılaştırın.'
                     : 'Explore the Weibull, gamma, normal, lognormal and Johnson SB distributions, and fit and compare them on your own diameter data.',
    'compact' => true,
]);
$dists = ['weibull' => 'Weibull', 'gamma' => 'Gamma', 'normal' => 'Normal', 'lognormal' => 'Lognormal', 'sb' => 'Johnson SB'];
?>
<main>
  <header class="sup-head">
    <p class="sc"><?= $tr ? 'Ek 2. Çap dağılımları' : 'Supplement 2. Diameter distributions' ?></p>
    <h1><?= $tr ? 'Çap Dağılımı Laboratuvarı' : 'Diameter Distribution Laboratory' ?></h1>
    <p class="deck"><?= $tr ? 'Beş dağılım, bir meşcere. Bir dağılım seçin, kaydırıcıları oynatın, ormanın nasıl şekil değiştirdiğini izleyin.' : 'Five distributions, one stand. Pick a distribution, move the sliders and watch the forest change shape.' ?></p>
  </header>

  <div class="sup-grid">
    <div>
      <h2 class="box-h"><?= $tr ? 'Dağılım' : 'Distribution' ?></h2>
      <div class="dist-pick" role="group" aria-label="<?= $tr ? 'Dağılım seçimi' : 'Choose a distribution' ?>">
        <?php foreach ($dists as $k => $n): ?><button type="button" class="chip" data-dist="<?= $k ?>" aria-pressed="false"><?= h($n) ?></button><?php endforeach; ?>
      </div>
      <p class="hint" id="about"></p>
      <h2 class="box-h"><?= $tr ? 'Parametreler' : 'Parameters' ?></h2>
      <div id="sliders"></div>
      <p class="verdict" id="verdict" aria-live="polite"></p>
      <table class="ledger" id="mom"></table>
      <div class="btns">
        <button type="button" class="btn ghost" id="reseed"><?= $tr ? 'Yeni ağaçlar' : 'New trees' ?></button>
        <button type="button" class="btn ghost" id="share"><?= $tr ? 'Bu ayarın bağlantısını kopyala' : 'Copy link to these settings' ?></button>
      </div>
      <p class="note" id="formula"></p>
    </div>
    <div>
      <figure class="fig"><svg id="pdf" role="img"></svg><figcaption id="pdf-cap"></figcaption></figure>
      <figure class="stand" id="stand" style="margin-top:14px">
        <svg role="img" aria-label="<?= $tr ? 'Seçilen dağılımla üretilmiş meşcere' : 'Stand generated from the chosen distribution' ?>"></svg>
        <div class="tip" hidden></div>
        <figcaption><span id="stand-cap"></span></figcaption>
      </figure>
    </div>
  </div>

  <section class="page" id="uydur" aria-labelledby="h-fit">
    <div class="page-head"><h2 id="h-fit"><?= $tr ? 'Kendi verinizi uydurun' : 'Fit your own data' ?></h2></div>
    <p class="page-sub"><?= $tr ? 'Beş dağılım, sekiz tahmin; hangisi verinize en iyi uyuyor?' : 'Five distributions, eight estimators: which one fits your data best?' ?></p>
    <div class="sup-grid">
      <form onsubmit="return false">
        <label class="field"><span><?= $tr ? 'Göğüs çapları (cm), her satıra bir tane' : 'Diameters (cm), one per line' ?></span>
          <textarea id="fd" spellcheck="false" style="min-height:170px" placeholder="18,4&#10;22,1&#10;…"></textarea></label>
        <p class="hint"><?= $tr ? 'Birden çok sütun yapıştırırsanız ilk sütun kullanılır. En az 10 ağaç gerekir.' : 'If you paste several columns, the first one is used. At least 10 trees are needed.' ?></p>
        <fieldset class="plain">
          <legend><?= $tr ? 'Uydurulacak dağılımlar' : 'Distributions to fit' ?></legend>
          <div class="dist-checks"><?php foreach ($dists as $k => $n): ?><label class="radio"><input type="checkbox" name="fdist" value="<?= $k ?>" checked> <?= h($n) ?></label><?php endforeach; ?></div>
        </fieldset>
        <div class="row2">
          <label class="field"><span><?= $tr ? 'Konum γ (cm)' : 'Location γ (cm)' ?></span><input id="fg" type="text" inputmode="decimal"></label>
          <label class="field"><span><?= $tr ? 'Çap basamağı' : 'Class width' ?></span><select id="fcw"><option value="1">1 cm</option><option value="2" selected>2 cm</option><option value="4">4 cm</option></select></label>
        </div>
        <p class="hint"><?= $tr ? 'Weibull, gamma ve lognormal için ortak konum. Boş bırakırsanız en küçük çapın yarısı alınır.' : 'Shared location for Weibull, gamma and lognormal. Leave empty to use half the smallest diameter.' ?></p>
        <div class="row2">
          <label class="field"><span><?= $tr ? 'Weibull yüzdeliği p₁' : 'Weibull percentile p₁' ?></span><input id="p1" type="text" inputmode="decimal" value="<?= $tr ? '0,24' : '0.24' ?>"></label>
          <label class="field"><span><?= $tr ? 'Weibull yüzdeliği p₂' : 'Weibull percentile p₂' ?></span><input id="p2" type="text" inputmode="decimal" value="<?= $tr ? '0,93' : '0.93' ?>"></label>
        </div>
        <div class="row2">
          <label class="field"><span><?= $tr ? 'SB alt sınırı ξ (cm)' : 'SB lower bound ξ (cm)' ?></span><input id="fxi" type="text" inputmode="decimal"></label>
          <label class="field"><span><?= $tr ? 'SB genişliği λ (cm)' : 'SB range λ (cm)' ?></span><input id="flm" type="text" inputmode="decimal"></label>
        </div>
        <p class="hint"><?= $tr ? 'Boş bırakırsanız ξ en küçük çapın 1 cm altı, ξ + λ en büyük çapın 1 cm üstü alınır; γ ve δ bu sınırlarla en çok olabilirlik yöntemiyle tahmin edilir.' : 'Left empty, ξ is 1 cm below the smallest diameter and ξ + λ 1 cm above the largest; γ and δ are then estimated by maximum likelihood.' ?></p>
        <div class="btns">
          <button type="button" class="btn" id="fit"><?= $tr ? 'Uydur' : 'Fit' ?></button>
          <button type="button" class="btn ghost" id="fsample"><?= $tr ? 'Örnek veri' : 'Sample data' ?></button>
        </div>
        <p class="msg" id="fmsg" role="status" aria-live="polite"></p>
      </form>
      <div id="fout" hidden>
        <figure class="fig"><svg id="fchart" role="img" style="height:320px"></svg><figcaption id="fcap"></figcaption></figure>
        <div class="ledger-wrap" style="margin-top:14px"><table class="ledger fit-table" id="ftab"></table></div>
        <p class="note" id="fnote"></p>
      </div>
    </div>
  </section>
</main>
<?php ob_start(); ?>
<script src="assets/tools.js?v=2"></script>
<script>
(() => {
  const T = MP, D = T.dists, W = T.weibull, TR = T.lang === 'tr', f = T.fmt, $ = id => document.getElementById(id);
  const L = TR ? {
    about: {
      weibull: 'Esnek biçimi ve kapalı formdaki birikimli fonksiyonu sayesinde çap dağılımı modellemesinde en çok kullanılan dağılım.',
      gamma: 'Hep sağa çarpık ya da ters J biçimli; şekil parametresi k büyüdükçe simetriğe yaklaşır.',
      normal: 'Simetrik. Düzenli, aynı yaşlı meşcerelerde bazen yeterli, ama çarpıklığı yakalayamaz ve sol kuyruğu negatif çaplara uzanabilir.',
      lognormal: 'Çapın (x − γ) logaritması normal dağılır; her zaman sağa çarpıktır.',
      sb: 'İki yandan sınırlı (ξ ile ξ + λ arası), dört parametreli; çarpıklıkta ve basıklıkta en esnek seçeneklerden biri. γ çarpıklığı, δ basıklığı yönetir.' },
    formula: {
      weibull: 'f(x) = (α/β) · ((x − γ)/β)^(α−1) · exp(−((x − γ)/β)^α),  x > γ',
      gamma: 'f(x) = (x − γ)^(k−1) · exp(−(x − γ)/θ) / (Γ(k) · θ^k),  x > γ',
      normal: 'f(x) = exp(−(x − μ)² / (2σ²)) / (σ√(2π))',
      lognormal: 'f(x) = exp(−(ln(x − γ) − μ)² / (2σ²)) / ((x − γ) · σ√(2π)),  x > γ',
      sb: 'f(x) = δλ / (√(2π) · (x − ξ)(ξ + λ − x)) · exp(−½ [γ + δ · ln((x − ξ)/(ξ + λ − x))]²),  ξ < x < ξ + λ' },
    shape: { revj: 'Ters J biçimi: ince ağaçlar çoğunlukta, sayı çap arttıkça azalıyor. Değişik yaşlı, seçme ormanlarının tipik görüntüsü.',
      j: 'J biçimi: ağaç sayısı çapla birlikte artıyor. Gerçek meşcerelerde pek görülmez.',
      u: 'U biçimi: ince ve kalın ağaçlar bol, orta çaplılar az. Gerçek meşcerelerde nadirdir.',
      bi: 'İki tepeli: iki ayrı çap grubu var; iki katlı ya da iki nesilli meşcereleri andırır. SB\'de γ sıfıra yakın ve δ < 0,71 iken ortaya çıkar.',
      sym: 'Neredeyse simetrik: ağaçlar ortalama çapın iki yanına dengeli dağılmış.',
      right: 'Sağa çarpık: ağaçların çoğu ortalamanın altında, birkaç kalın ağaç kuyruğu uzatıyor. Genç, aynı yaşlı meşcerelerde sık görülür.',
      left: 'Sola çarpık: kalın ağaçlar çoğunlukta, ince ağaç az. Alttan aralama yapılmış ya da yaşlı, aynı yaşlı meşcerelerde görülebilir.',
      neg: ' Dikkat: bu ayarlarla ağaçların bir kısmı sıfırın altında, yani olmayan çaplarda kalıyor.' },
    mean: 'Aritmetik ortalama çap', dq: 'Kareli ortalama çap (Dq)', med: 'Medyan', mode: 'Tepe değer (mod)', sd: 'Standart sapma', skew: 'Çarpıklık', q95: 'Ağaçların %95\'i şundan ince',
    cap: '<b>Şekil 1.</b> Olasılık yoğunluk fonksiyonu', stand: (n) => `<b>Şekil 2.</b> Bu dağılımdan ${n} ağaçlık bir meşcere. Boylar Chapman–Richards modelinden. Bir ağacın üzerine gelin.`,
    copied: 'Bağlantı kopyalandı', x: 'Göğüs çapı (cm)', y: 'Olasılık yoğunluğu',
    m: { mom: 'momentler', ml: 'en çok olabilirlik', pct: 'yüzdelik' },
    th: ['Dağılım, yöntem', 'Parametreler', 'KS D', 'Hata ind.', 'AIC', 'Grafik', ''], try: 'Dene',
    fcap: n => `<b>Şekil 3.</b> ${n} ağacın çap dağılımı (çubuklar) ve uydurulan dağılımlar`,
    few: 'En az 10 geçerli çap gerekli.', gbad: d => `Konum γ en küçük çaptan (${f(d, 1)} cm) küçük olmalı.`, pbad: 'Yüzdelikler 0 < p₁ < p₂ < 1 olmalı.',
    sbbad: (a, b) => `SB sınırları bütün çapları kapsamalı: ξ < ${f(a, 1)} ve ξ + λ > ${f(b, 1)} cm olmalı.`, none: 'En az bir dağılım seçin.',
    note: (n, crit) => `KS D: gözlenen ve uydurulan birikimli dağılımlar arasındaki en büyük fark. Hata indeksi (Reynolds ve ark. 1988): basamaklardaki gözlenen ve beklenen ağaç sayısı farklarının mutlak toplamı. AIC = 4 − 2·ln L; konum ve SB sınırları sabit tutulduğu için her dağılımda iki parametre tahmin edildi, bu yüzden AIC'ler doğrudan karşılaştırılabilir. Üçünde de küçük olan iyidir (★ en küçük). D < 1,36/√n ≈ ${f(crit, 3)} ise uyum %5 düzeyinde reddedilmez; parametreler aynı veriden tahmin edildiği için bu sınır yaklaşıktır (n = ${n}).`,
    truth: (name, s) => `Örnek veri ${name} dağılımından üretildi (${s}). Bakalım hangi dağılım ve yöntem tanıyacak.`, obs: 'gözlenen'
  } : {
    about: {
      weibull: 'The most widely used distribution in diameter modelling, thanks to its flexible shape and closed-form cumulative function.',
      gamma: 'Always right-skewed or reverse-J; it becomes more symmetric as the shape k grows.',
      normal: 'Symmetric. Sometimes adequate for regular even-aged stands, but it cannot capture skewness and its left tail can reach negative diameters.',
      lognormal: 'The logarithm of (x − γ) is normally distributed; always right-skewed.',
      sb: 'Bounded on both sides (between ξ and ξ + λ) with four parameters; one of the most flexible in skewness and kurtosis. γ governs skewness, δ kurtosis.' },
    formula: {
      weibull: 'f(x) = (α/β)·((x − γ)/β)^(α−1)·exp(−((x − γ)/β)^α),  x > γ',
      gamma: 'f(x) = (x − γ)^(k−1)·exp(−(x − γ)/θ) / (Γ(k)·θ^k),  x > γ',
      normal: 'f(x) = exp(−(x − μ)²/(2σ²)) / (σ√(2π))',
      lognormal: 'f(x) = exp(−(ln(x − γ) − μ)²/(2σ²)) / ((x − γ)·σ√(2π)),  x > γ',
      sb: 'f(x) = δλ / (√(2π)·(x − ξ)(ξ + λ − x)) · exp(−½[γ + δ·ln((x − ξ)/(ξ + λ − x))]²),  ξ < x < ξ + λ' },
    shape: { revj: 'Reverse J: thin trees dominate and numbers fall as diameter grows. Typical of uneven-aged, selection forests.',
      j: 'J-shaped: numbers rise with diameter. Rarely seen in real stands.',
      u: 'U-shaped: many thin and many thick trees, few in between. Rare in real stands.',
      bi: 'Bimodal: two separate diameter groups, like a two-storeyed or two-cohort stand. In SB it appears when γ is near zero and δ < 0.71.',
      sym: 'Nearly symmetric: trees are balanced on both sides of the mean diameter.',
      right: 'Right-skewed: most trees are below the mean, a few thick trees stretch the tail. Common in young even-aged stands.',
      left: 'Left-skewed: thick trees dominate, few thin ones. Seen after thinning from below or in old even-aged stands.',
      neg: ' Careful: with these settings part of the stand falls below zero, at diameters that cannot exist.' },
    mean: 'Arithmetic mean diameter', dq: 'Quadratic mean diameter (Dq)', med: 'Median', mode: 'Mode', sd: 'Standard deviation', skew: 'Skewness', q95: '95% of trees are thinner than',
    cap: '<b>Fig. 1.</b> Probability density function', stand: (n) => `<b>Fig. 2.</b> A stand of ${n} trees from this distribution, heights from a Chapman–Richards model. Hover over a tree.`,
    copied: 'Link copied', x: 'Diameter at breast height (cm)', y: 'Probability density',
    m: { mom: 'moments', ml: 'maximum likelihood', pct: 'percentile' },
    th: ['Distribution, method', 'Parameters', 'KS D', 'Error index', 'AIC', 'Plot', ''], try: 'Try',
    fcap: n => `<b>Fig. 3.</b> Diameter distribution of ${n} trees (bars) and fitted distributions`,
    few: 'At least 10 valid diameters are needed.', gbad: d => `Location γ must be smaller than the smallest diameter (${f(d, 1)} cm).`, pbad: 'Percentiles must satisfy 0 < p₁ < p₂ < 1.',
    sbbad: (a, b) => `SB bounds must contain every diameter: ξ < ${f(a, 1)} and ξ + λ > ${f(b, 1)} cm.`, none: 'Select at least one distribution.',
    note: (n, crit) => `KS D: largest gap between observed and fitted cumulative distributions. Error index (Reynolds et al. 1988): sum of absolute differences between observed and expected trees per class. AIC = 4 − 2·ln L; with the location and SB bounds fixed, every distribution has two estimated parameters, so the AICs are directly comparable. Smaller is better in all three (★ smallest). If D < 1.36/√n ≈ ${f(crit, 3)} the fit is not rejected at the 5% level; this bound is approximate because the parameters come from the same data (n = ${n}).`,
    truth: (name, s) => `Sample data drawn from a ${name} distribution (${s}). Let's see which distribution and method recognises it.`, obs: 'observed'
  };

  /* ---------- playground state ---------- */
  let dist = 'weibull';
  const P = {}; Object.keys(D).forEach(k => { P[k] = {}; D[k].params.forEach(p => P[k][p.k] = p.def); });
  function readHash() {      // #d=gamma&k=4&t=3.5&g=6 ; old links #a=..&b=..&g=.. mean Weibull
    const h0 = new URLSearchParams(location.hash.slice(1));
    if (D[h0.get('d')]) dist = h0.get('d'); else if (h0.has('a')) dist = 'weibull'; else return false;
    D[dist].params.forEach(p => { const v = parseFloat(h0.get(p.k)); if (isFinite(v)) P[dist][p.k] = Math.min(p.max, Math.max(p.min, v)); });
    return true;
  }
  readHash();

  let raf = 0; const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); };
  function buildSliders() {
    const box = $('sliders'); box.innerHTML = '';
    D[dist].params.forEach(p => {
      const row = document.createElement('div'); row.className = 'slider';
      row.innerHTML = `<label for="r-${p.k}">${p.sym}<small></small></label><input type="range" id="r-${p.k}" min="${p.min}" max="${p.max}" step="${p.step}"><input type="text" inputmode="decimal" class="inline-num" id="n-${p.k}">`;
      row.querySelector('small').textContent = p.name; row.querySelector('.inline-num').setAttribute('aria-label', p.name);
      box.append(row);
      const r = row.querySelector('[type=range]'), n = row.querySelector('.inline-num'), dig = p.step < 0.05 ? 2 : p.step < 0.1 ? 2 : 1;
      const set = (v, from) => { v = Math.min(p.max, Math.max(p.min, v)); if (!isFinite(v)) return; P[dist][p.k] = v; if (from !== 'r') r.value = v; if (from !== 'n') n.value = f(+v.toFixed(dig), dig); schedule(); };
      r.addEventListener('input', () => set(+r.value, 'r'));
      n.addEventListener('input', () => { const v = parseFloat(n.value.replace(',', '.')); if (isFinite(v)) set(v, 'n'); });
      p.set = set; set(P[dist][p.k]);
    });
    document.querySelectorAll('.dist-pick .chip').forEach(b => b.setAttribute('aria-pressed', b.dataset.dist === dist));
    $('about').textContent = L.about[dist]; $('formula').textContent = L.formula[dist];
  }
  document.querySelectorAll('.dist-pick .chip').forEach(b => b.addEventListener('click', () => { dist = b.dataset.dist; buildSliders(); }));
  function setDist(name, vals) { dist = name; Object.assign(P[name], vals); buildSliders(); }

  /* stand: fixed uniforms per tree so dragging morphs the same trees */
  let U = [], trees = [];
  const reseed = () => { const rng = T.rng((Math.random() * 2 ** 32) >>> 0); U = Array.from({ length: 70 }, () => ({ u: .001 + rng() * .998, x: rng(), z: Math.floor(rng() * 3), e: T.randn(rng), cr: .32 + rng() * .13 })).sort((p, q) => p.z - q.z); };
  reseed();

  function shapeOf(dd, p, lo, hi) {
    const N = 300, y = []; for (let i = 0; i <= N; i++) y.push(dd.pdf(lo + (hi - lo) * i / N, p));
    let maxima = 0, minima = 0;
    for (let i = 1; i < N; i++) { if (y[i] > y[i - 1] && y[i] >= y[i + 1]) maxima++; if (y[i] < y[i - 1] && y[i] <= y[i + 1]) minima++; }
    if (maxima >= 2) return 'bi';
    if (maxima === 0) return minima ? 'u' : (y[0] >= y[N] ? 'revj' : 'j');
    return null;
  }
  function draw() {
    const dd = D[dist], p = P[dist], s = dd.stats(p), med = dd.q(.5, p), q95 = dd.q(.95, p);
    const lo = dd.q(.001, p), hi = dd.q(.999, p);
    let sh = shapeOf(dd, p, lo, hi);
    if (!sh) sh = Math.abs(s.skew) < 0.15 ? 'sym' : s.skew > 0 ? 'right' : 'left';
    $('verdict').textContent = L.shape[sh] + (lo < 0 ? L.shape.neg : '');
    $('mom').innerHTML = '<tbody>' + [[L.mean, f(s.mean, 1) + ' cm'], [L.dq, f(Math.sqrt(s.mean ** 2 + s.sd ** 2), 1) + ' cm'], [L.med, f(med, 1) + ' cm'], [L.mode, f(s.mode, 1) + ' cm'],
      [L.sd, f(s.sd, 2) + ' cm'], [L.skew, f(s.skew, 2)], [L.q95, f(q95, 1) + ' cm']].map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('') + '</tbody>';
    const xmin = Math.min(0, Math.floor(dd.q(.005, p) / 10) * 10), xmax = Math.max(30, Math.min(150, Math.ceil(dd.q(.995, p) / 10) * 10));
    const pts = []; let ymax = 0;
    for (let i = 0; i <= 500; i++) { const x = xmin + i / 500 * (xmax - xmin), y = dd.pdf(x, p); pts.push([x, y]); if (x > lo && x < hi && isFinite(y)) ymax = Math.max(ymax, y); }
    ymax = ymax * 1.15 || 1;
    const c = T.chart($('pdf'), { x: [xmin, xmax], y: [0, ymax], xlab: L.x, ylab: L.y, ydig: 3 });
    const P2 = pts.map(q => [c.X(q[0]), c.Y(Math.min(q[1], ymax))]);
    T.el('path', { d: T.path(P2) + `L${c.X(xmax)} ${c.Y(0)}L${c.X(xmin)} ${c.Y(0)}Z`, fill: c.hatch('A'), stroke: 'none', opacity: .55 }, c.g);
    T.el('path', { d: T.path(P2), class: 'curve' }, c.g);
    const meanLeft = s.mean <= med;
    [[s.mean, 'x̄', meanLeft], [med, 'Md', !meanLeft]].forEach(([v, lab, left]) => {
      T.el('line', { x1: c.X(v), x2: c.X(v), y1: c.Y(0), y2: c.Y(ymax * .9), stroke: 'currentColor', 'stroke-dasharray': '3 3' }, c.g);
      T.el('text', { x: c.X(v) + (left ? -4 : 4), y: c.Y(ymax * .9) + 4, 'text-anchor': left ? 'end' : 'start', fill: 'currentColor', 'font-size': 13, 'font-style': 'italic' }, c.g).textContent = lab;
    });
    $('pdf-cap').innerHTML = L.cap + ' (' + D[dist].name + ')';
    trees = U.map(t => { const d = Math.max(0.5, dd.q(t.u, p)); return { d, h: Math.max(1.5, T.chapmanRichards(d, 30, .045, 1.3) + t.e * .9), x: t.x, z: t.z, cr: t.cr }; });
    T.drawStand($('stand').querySelector('svg'), trees, { hMax: 33 });
    $('stand-cap').innerHTML = L.stand(trees.length);
    history.replaceState(null, '', '#d=' + dist + '&' + D[dist].params.map(q => q.k + '=' + +P[dist][q.k].toFixed(3)).join('&'));
  }
  T.standTooltip($('stand').querySelector('svg'), $('stand').querySelector('.tip'), () => trees);
  $('reseed').addEventListener('click', () => { reseed(); draw(); });
  $('share').addEventListener('click', async e => { try { await navigator.clipboard.writeText(location.href); e.target.textContent = L.copied; } catch (err) {} });
  buildSliders();
  addEventListener('hashchange', () => { if (readHash()) buildSliders(); });   // a shared link opened in the same tab
  let rw = innerWidth; addEventListener('resize', () => { if (Math.abs(innerWidth - rw) > 30) { rw = innerWidth; draw(); if (lastFit) renderFit(); } });

  /* ---------- fitting ---------- */
  let lastFit = null;
  const DASH = ['', '7 4', '1.5 3.5', '10 3 2 3', '14 5', '3 2'];
  const num = id => parseFloat(String($(id).value).replace(',', '.'));
  const pstr = (name, p) => D[name].params.map(q => `${q.sym} = ${f(p[q.k], q.k === 'a' || q.k === 'k' || q.k === 'gm' || q.k === 'dl' || q.k === 's' || q.k === 'm' && name === 'lognormal' ? 3 : 2)}`).join('; ');
  function msg(t, err) { $('fmsg').textContent = t; $('fmsg').className = 'msg' + (err ? ' err' : ''); }
  function fit() {
    const d = T.parseRows($('fd').value).map(r => r[0]).filter(v => v > 0 && v < 400);
    const keep = $('fmsg').dataset.keep; delete $('fmsg').dataset.keep;
    if (d.length < 10) { $('fout').hidden = true; lastFit = null; return msg(d.length || $('fd').value.trim() ? L.few : '', !!$('fd').value.trim()); }
    const chosen = [...document.querySelectorAll('[name=fdist]:checked')].map(c => c.value);
    if (!chosen.length) { $('fout').hidden = true; return msg(L.none, true); }
    const dmin = Math.min(...d), dmax = Math.max(...d);
    const g = $('fg').value.trim() === '' ? Math.round(dmin / 2 * 10) / 10 : num('fg');
    const needG = chosen.some(k => ['weibull', 'gamma', 'lognormal'].includes(k));
    if (needG && !(g >= 0 && g < dmin)) { $('fout').hidden = true; return msg(L.gbad(dmin), true); }
    const p1 = num('p1'), p2 = num('p2');
    if (chosen.includes('weibull') && !(p1 > 0 && p2 < 1 && p1 < p2)) { $('fout').hidden = true; return msg(L.pbad, true); }
    const xi = $('fxi').value.trim() === '' ? Math.max(0, Math.round((dmin - 1) * 10) / 10) : num('fxi');
    const lm = $('flm').value.trim() === '' ? Math.round((dmax + 1 - xi) * 10) / 10 : num('flm');
    if (chosen.includes('sb') && !(xi < dmin && xi + lm > dmax && lm > 0)) { $('fout').hidden = true; return msg(L.sbbad(dmin, dmax), true); }
    $('fg').placeholder = f(g, 1); $('fxi').placeholder = f(xi, 1); $('flm').placeholder = f(lm, 1);

    const rows = [], add = (name, method, p, plot) => rows.push({ name, method, p, plot });
    if (chosen.includes('weibull')) {
      const m = W.fitMoments(d, g), ml = W.fitMLE(d, g), pc = W.fitPercentile(d, g, p1, p2);
      add('weibull', 'mom', m, false); add('weibull', 'ml', ml, true); add('weibull', 'pct', pc, false);
    }
    if (chosen.includes('gamma')) { add('gamma', 'mom', T.fit.gammaMoments(d, g), false); add('gamma', 'ml', T.fit.gammaMLE(d, g), true); }
    if (chosen.includes('normal')) add('normal', 'ml', T.fit.normal(d), true);
    if (chosen.includes('lognormal')) add('lognormal', 'ml', T.fit.lognormal(d, g), true);
    if (chosen.includes('sb')) add('sb', 'ml', T.fit.sb(d, xi, lm), true);
    const cw = +$('fcw').value, n = d.length, cls = [];
    for (let lo = Math.floor(dmin / cw) * cw; lo <= dmax; lo += cw) cls.push({ lo, hi: lo + cw, k: d.filter(v => v >= lo && v < lo + cw).length });
    rows.forEach(r => {
      const dd = D[r.name], cdf = x => dd.cdf(x, r.p), pdf = x => dd.pdf(x, r.p);
      r.ks = T.ksGen(d, cdf);
      r.ei = T.sum(cls.map(c => Math.abs(c.k - n * (cdf(c.hi) - cdf(c.lo)))));
      r.aic = 4 - 2 * T.logLikGen(d, pdf);
    });
    lastFit = { d, rows, cls, n, dmin, dmax, cw };
    renderFit();
    msg(keep ? $('fmsg').textContent : '');
  }
  function renderFit() {
    const { d, rows, cls, n, dmin, dmax, cw } = lastFit;
    const best = k => Math.min(...rows.map(r => r[k]));
    const bKS = best('ks'), bEI = best('ei'), bAIC = best('aic');
    $('ftab').innerHTML = `<thead><tr>${L.th.map(t => `<th>${t}</th>`).join('')}</tr></thead><tbody>` + rows.map((r, i) =>
      `<tr><td>${D[r.name].name}, <i>${L.m[r.method]}</i></td><td class="params">${pstr(r.name, r.p)}</td>` +
      `<td class="${r.ks === bKS ? 'best' : ''}">${f(r.ks, 4)}</td><td class="${r.ei === bEI ? 'best' : ''}">${f(r.ei, 1)}</td><td class="${r.aic === bAIC ? 'best' : ''}">${f(r.aic, 1)}</td>` +
      `<td><input type="checkbox" data-plot="${i}" ${r.plot ? 'checked' : ''} aria-label="${L.th[5]}"></td>` +
      `<td><button type="button" class="btn ghost small-btn" data-i="${i}" title="${TR ? 'Bu parametreleri yukarıdaki oyun alanında aç' : 'Open these parameters in the playground above'}">${L.try}</button></td></tr>`).join('') + '</tbody>';
    $('ftab').querySelectorAll('[data-plot]').forEach(cb => cb.addEventListener('change', () => { rows[+cb.dataset.plot].plot = cb.checked; renderFit(); }));
    $('ftab').querySelectorAll('button[data-i]').forEach(b => b.addEventListener('click', () => { const r = rows[+b.dataset.i]; setDist(r.name, r.p); $('top').scrollIntoView({ behavior: 'smooth' }); }));
    $('fout').hidden = false;   // visible before drawing so the chart gets its real width
    const x0 = Math.max(0, Math.floor(dmin / cw) * cw - cw), xmax = Math.ceil(dmax / cw) * cw + cw, dens = cls.map(c => c.k / (n * cw));
    let ymax = Math.max(...dens);
    const shown = rows.filter(r => r.plot);
    const curves = shown.map(r => { const pts = []; for (let i = 0; i <= 400; i++) { const x = x0 + (xmax - x0) * i / 400, y = D[r.name].pdf(x, r.p); pts.push([x, y]); if (isFinite(y) && x > dmin - cw && x < dmax + cw) ymax = Math.max(ymax, Math.min(y, Math.max(...dens) * 3)); } return pts; });
    const c = T.chart($('fchart'), { x: [x0, xmax], y: [0, ymax * 1.12], xlab: L.x, ylab: L.y, ydig: 3 });
    cls.forEach((cl, i) => { if (cl.k) T.el('rect', { x: c.X(cl.lo) + .5, y: c.Y(dens[i]), width: Math.max(1, c.X(cl.hi) - c.X(cl.lo) - 1), height: c.Y(0) - c.Y(dens[i]), class: 'bar', fill: c.hatch('C'), opacity: .8 }, c.g); });
    curves.forEach((pts, i) => T.el('path', { d: T.path(pts.map(q => [c.X(q[0]), c.Y(Math.min(q[1], ymax * 1.12))])), class: 'curve', 'stroke-dasharray': DASH[i % DASH.length], 'stroke-width': DASH[i % DASH.length] === '1.5 3.5' ? 2.4 : 2 }, c.g));
    const sw = i => `<svg viewBox="0 0 30 10"><path d="M0 5h30" class="curve" stroke-dasharray="${DASH[i % DASH.length]}"/></svg>`;
    $('fcap').innerHTML = L.fcap(n) + `<span class="legend"><span><svg viewBox="0 0 30 10"><rect x="8" y="0" width="14" height="10" class="bar" fill="${c.hatch('C')}"/></svg>${L.obs}</span>` +
      shown.map((r, i) => `<span>${sw(i)}${D[r.name].name}, ${L.m[r.method]}</span>`).join('') + '</span>';
    $('fnote').textContent = L.note(n, 1.36 / Math.sqrt(n));
  }
  $('fit').addEventListener('click', fit);
  let ft; ['fd', 'fg', 'p1', 'p2', 'fcw', 'fxi', 'flm'].forEach(id => $(id).addEventListener('input', () => { clearTimeout(ft); ft = setTimeout(fit, 350); }));
  document.querySelectorAll('[name=fdist]').forEach(cb => cb.addEventListener('change', fit));
  $('fsample').addEventListener('click', () => {
    const rng = T.rng((Math.random() * 2 ** 32) >>> 0), pick = Object.keys(D)[Math.floor(rng() * 5)], n = 120 + Math.floor(rng() * 120), U2 = () => .0005 + rng() * .999;
    const par = { weibull: { a: 1.8 + rng() * 2.4, b: 10 + rng() * 12, g: 4 + rng() * 6 }, gamma: { k: 2 + rng() * 8, t: 1.5 + rng() * 3, g: 4 + rng() * 5 },
      normal: { m: 20 + rng() * 15, s: 4 + rng() * 4 }, lognormal: { m: 2.2 + rng() * .8, s: .3 + rng() * .3, g: 4 + rng() * 5 }, sb: { gm: -1 + rng() * 2.5, dl: .8 + rng() * 1.2, xi: 6 + rng() * 4, lm: 25 + rng() * 25 } }[pick];
    $('fd').value = Array.from({ length: n }, () => { const v = String(Math.max(1, Math.round(D[pick].q(U2(), par) * 10) / 10)); return TR ? v.replace('.', ',') : v; }).join('\n');
    ['fg', 'fxi', 'flm'].forEach(id => $(id).value = '');
    msg(L.truth(D[pick].name, pstr(pick, par))); $('fmsg').dataset.keep = 1; fit();
  });
})();
</script>
<?php paper_bottom(ob_get_clean());
