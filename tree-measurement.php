<?php
require __DIR__ . '/inc/site.php';
site_top([
    'title'  => 'Tree Measurement',
    'kicker' => 'Height, diameter, bark, crown, form factor, age and increment',
    'lede'   => 'Tree height from clinometer or rangefinder readings; basal area from a diameter or girth and a summary of a tree list; bark thickness, under-bark diameter and the bark factor from sample trees; crown width, projection area, crown ratio, surface and volume; form factor, form exponent and form quotient; tree age, past diameters from an increment core and increment. Formulas from mensuration books (Hamilton 1975; Graves 1906; van Laar and Akça 2007; Kershaw et al. 2016).',
    'desc'   => 'Tree measurement: height by the tangent and rangefinder methods, diameter and basal area, diameter of the tree of mean basal area, bark thickness and under-bark diameter, crown width and crown ratio, form factors, form exponent, form quotient, age, increment core, growth percent.',
]);
?>
  <p class="privacy" id="privacy"></p>
  <noscript><p class="card"><?= 'This tool needs JavaScript.' ?></p></noscript>
  <div id="status" class="status" role="status" aria-live="polite"></div>
  <div id="app"></div>
  <div id="barkcoef" hidden></div>
  <div id="foot"></div>
<?php site_bottom('<script type="module" src="assets/lab/tree/ui.js"></script>');
