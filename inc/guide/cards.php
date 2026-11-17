<?php
// Task cards of the guide's start page (kilavuz.php): "what do you have / want to do" → the tools that do it.
// Ids are guide section ids (tool file names without .php); ids of tools not in site_tools() are skipped when drawn.
// tests/site/test_guide.mjs checks that every tool appears in at least one card.
function guide_cards(bool $tr): array {
    return [
        ['id' => 'veri', 'title' => $tr ? 'Ölçüm verimi denetleyip saklamak istiyorum' : 'I want to check and keep my measurement data',
         'text' => $tr ? 'Tabloyu okuyun, hataları düzeltin, onaylı paketi saklayın; paketten grafik ve rapor üretin.' : 'Read the table, fix errors, keep the approved package; make charts and a report from it.',
         'ids' => ['veri-denetcisi', 'veri-yoneticisi', 'pano', 'rapor']],
        ['id' => 'agac', 'title' => $tr ? 'Tek ağaç ölçtüm' : 'I measured single trees',
         'text' => $tr ? 'Boy, çap, biçim, yaş; seksiyonlardan ya da profil denklemiyle hacim; biyokütle ve karbon.' : 'Height, diameter, form, age; volume from sections or a taper equation; biomass and carbon.',
         'ids' => ['agac-olcumu', 'seksiyon-hacmi', 'govde-profili', 'hacim-denklemleri', 'tomruk-olcumu', 'biyokutle-karbon']],
        ['id' => 'mescere', 'title' => $tr ? 'Örnek alan ve meşcereyi özetlemek istiyorum' : 'I want to summarise plots and stands',
         'text' => $tr ? 'Hektarda ağaç sayısı ve göğüs yüzeyi, çap dağılımı, yapı ve rekabet; kaç örnek alan gerektiği.' : 'Trees and basal area per hectare, diameter distribution, structure and competition; how many plots are needed.',
         'ids' => ['ornek-alan', 'cap-dagilimi', 'mescere-yapisi', 'ornekleme']],
        ['id' => 'model', 'title' => $tr ? 'Model uydurmak ya da karşılaştırmak istiyorum' : 'I want to fit or compare models',
         'text' => $tr ? 'Boy–çap, büyüme ve bonitet modelleri; hazır biçim ya da kendi formülünüzle doğrusal olmayan regresyon; başarı ölçütleri ve modellerin sıralanması.' : 'Height–diameter, growth and site index models; nonlinear regression with a ready-made form or your own formula; goodness-of-fit criteria and ranking the models.',
         'ids' => ['boy-cap', 'buyume-islevi', 'dogrusal-olmayan-regresyon', 'karma-modeller', 'denklem-sistemleri', 'bonitet', 'model-degerlendirme', 'nispi-siralama']],
        ['id' => 'katsayi', 'title' => $tr ? 'Kaynaktan katsayı setim var' : 'I have a coefficient set from a source',
         'text' => $tr ? 'Setinizi kaynağıyla girin, kütüphanede saklayın ve araçlarda kullanın; site hazır katsayı vermez.' : 'Enter your set with its source, keep it in the library and use it in the tools; the site ships no coefficients.',
         'ids' => ['katsayi-kutuphanesi', 'bonitet', 'govde-profili', 'biyokutle-karbon']],
        ['id' => 'kayit', 'title' => $tr ? 'Sonucu belgelemek ve tekrarlamak istiyorum' : 'I want to document and reproduce a result',
         'text' => $tr ? 'Çalışma kaydını denetleyin, raporda toplayın; araçlar birlikte nasıl kullanılır.' : 'Check a run record, gather it in a report; how the tools work together.',
         'ids' => ['kayit-dogrulayici', 'rapor', 'is-akisi']],
    ];
}
