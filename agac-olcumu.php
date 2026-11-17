<?php
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];
site_top([
    'title'  => $tr ? 'Ağaç Ölçümü' : 'Tree Measurement',
    'kicker' => $tr ? 'Boy, çap, biçim sayısı, yaş ve artım' : 'Height, diameter, form factor, age and increment',
    'lede'   => $tr ? 'Eğim ölçer ya da mesafe ölçer okumalarından ağaç boyu; çap ya da çevreden göğüs yüzeyi ve ağaç listesi özeti; biçim sayısı, biçim üssü ve biçim bölümü; ağaç yaşı, burgu örneğinden geçmiş çaplar ve artım. Formüller ölçme kitaplarından (Hamilton 1975; Graves 1906; van Laar ve Akça 2007).'
                    : 'Tree height from clinometer or rangefinder readings; basal area from a diameter or girth and a summary of a tree list; form factor, form exponent and form quotient; tree age, past diameters from an increment core and increment. Formulas from mensuration books (Hamilton 1975; Graves 1906; van Laar and Akça 2007).',
    'desc'   => $tr ? 'Ağaç ölçümü: tanjant ve mesafe ölçer yöntemleriyle boy, çap ve göğüs yüzeyi, ortalama göğüs yüzeyli ağacın çapı, biçim sayıları, biçim üssü, biçim bölümü, yaş, burgu örneği, artım yüzdesi.'
                    : 'Tree measurement: height by the tangent and rangefinder methods, diameter and basal area, diameter of the tree of mean basal area, form factors, form exponent, form quotient, age, increment core, growth percent.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= $tr ? 'Bu araç JavaScript gerektirir.' : 'This tool needs JavaScript.' ?></p></noscript>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <div id="app"></div>
<?php site_bottom('<script type="module" src="assets/lab/tree/ui.js"></script>');
