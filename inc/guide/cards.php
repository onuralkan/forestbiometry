<?php
// Task cards of the guide's start page (kilavuz.php): "what do you have / want to do" → the tools that do it.
// Ids are guide section ids (tool file names without .php); ids of tools not in site_tools() are skipped when drawn.
// tests/site/test_guide.mjs checks that every tool appears in at least one card.
function guide_cards(): array {
    return [
        ['id' => 'veri', 'title' => 'I want to check and keep my measurement data',
         'text' => 'Read the table, fix errors, keep the approved package; make charts and a report from it.',
         'ids' => ['veri-denetcisi', 'veri-yoneticisi', 'pano', 'rapor']],
        ['id' => 'agac', 'title' => 'I measured single trees',
         'text' => 'Height, diameter, form, age; volume from sections or a taper equation; biomass and carbon.',
         'ids' => ['agac-olcumu', 'seksiyon-hacmi', 'govde-profili', 'hacim-denklemleri', 'tomruk-olcumu', 'biyokutle-karbon']],
        ['id' => 'mescere', 'title' => 'I want to summarise plots and stands',
         'text' => 'Trees and basal area per hectare, diameter distribution, structure and competition; how many plots are needed.',
         'ids' => ['ornek-alan', 'cap-dagilimi', 'mescere-yapisi', 'ornekleme']],
        ['id' => 'model', 'title' => 'I want to fit or compare models',
         'text' => 'Height–diameter, growth and site index models; nonlinear regression with a ready-made form or your own formula; goodness-of-fit criteria and ranking the models.',
         'ids' => ['boy-cap', 'buyume-islevi', 'dogrusal-olmayan-regresyon', 'karma-modeller', 'denklem-sistemleri', 'bonitet', 'model-degerlendirme', 'nispi-siralama']],
        ['id' => 'katsayi', 'title' => 'I have a coefficient set from a source',
         'text' => 'Enter your set with its source, keep it in the library and use it in the tools; the site ships no coefficients.',
         'ids' => ['katsayi-kutuphanesi', 'bonitet', 'govde-profili', 'biyokutle-karbon']],
        ['id' => 'kayit', 'title' => 'I want to document and reproduce a result',
         'text' => 'Check a run record, gather it in a report; how the tools work together.',
         'ids' => ['kayit-dogrulayici', 'rapor', 'is-akisi']],
    ];
}
