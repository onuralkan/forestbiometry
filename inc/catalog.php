<?php
// Tool catalogue of the platform (docs/PLATFORM_PLAN.md). Stable tool ids MODULE-NN; a tool page (site_tools()) can
// cover several ids. status: 'live' (a page covers it), 'dev' (being built, no page yet), 'planned', 'out' (out of
// scope, kept only in the plan; not shown on the site). The sidebar and the tools index are drawn from here.

/** Modules in display order: id, icon, TR/EN title and one line of description. */
function site_modules(): array {
    $tr = site_ctx()['tr'];
    return [
        ['id' => 'DI', 'title' => $tr ? 'Veri altyapısı' : 'Data infrastructure', 'desc' => $tr ? 'Ölçüm verisini denetleme, onaylama, saklama ve raporlama.' : 'Checking, approving, keeping and reporting measurement data.'],
        ['id' => 'TM', 'title' => $tr ? 'Ağaç ölçümü' : 'Tree measurement', 'desc' => $tr ? 'Tek ağaç ölçümlerinden boy, çap, tepe tacı, yaş ve biçim.' : 'Height, diameter, crown, age and form from single-tree measurements.'],
        ['id' => 'SV', 'title' => $tr ? 'Gövde hacmi ve profili' : 'Stem volume and taper', 'desc' => $tr ? 'Seksiyon hacmi, gövde profili, kullanılabilir hacim ve ürün bölme.' : 'Section volume, taper, merchantable volume and bucking.'],
        ['id' => 'BC', 'title' => $tr ? 'Biyokütle ve karbon' : 'Biomass and carbon', 'desc' => $tr ? 'Allometrik biyokütle, dönüşüm etkenleri, karbon ve CO₂ (katsayılar sizden).' : 'Allometric biomass, expansion factors, carbon and CO₂ (coefficients are yours).'],
        ['id' => 'SS', 'title' => $tr ? 'Meşcere yapısı ve sıklığı' : 'Stand structure and density', 'desc' => $tr ? 'Meşcere özeti, çap dağılımı, sıklık, çeşitlilik, mekânsal yapı ve rekabet.' : 'Stand summary, diameter distribution, density, diversity, spatial pattern and competition.'],
        ['id' => 'SQ', 'title' => $tr ? 'Yetişme ortamı verimliliği' : 'Site quality and productivity', 'desc' => $tr ? 'Bonitet endeksi, bonitet eğrileri ve büyüme işlevleri.' : 'Site index, site curves and growth functions.'],
        ['id' => 'SI', 'title' => $tr ? 'Örnekleme ve envanter' : 'Sampling and inventory', 'desc' => $tr ? 'Örnek büyüklüğü, örnekleme tasarımları ve tasarıma dayalı kestirim.' : 'Sample size, sampling designs and design-based estimation.'],
        ['id' => 'GY', 'title' => $tr ? 'Büyüme ve hasılat' : 'Growth and yield', 'desc' => $tr ? 'Meşcere ve ağaç düzeyinde büyüme, ölüm ve aralama senaryoları.' : 'Stand- and tree-level growth, mortality and thinning scenarios.'],
        ['id' => 'SM', 'title' => $tr ? 'İstatistiksel modelleme' : 'Statistical modelling', 'desc' => $tr ? 'Model uydurma, karşılaştırma, değerlendirme ve belirsizlik.' : 'Model fitting, comparison, evaluation and uncertainty.'],
        ['id' => 'ML', 'title' => $tr ? 'Makine öğrenmesi ve mekânsal tahmin' : 'Machine learning and spatial prediction', 'desc' => $tr ? 'Makine öğrenmesi, atama, mekânsal ara değerleme ve küçük alan kestirimi.' : 'Machine learning, imputation, spatial interpolation and small-area estimation.'],
        ['id' => 'DS', 'title' => $tr ? 'Karar destek ve uygulamalar' : 'Decision support and applications', 'desc' => $tr ? 'Değerleme, üretim planlama, ölü odun, zarar ve kent ağaçları.' : 'Valuation, harvest scheduling, deadwood, damage and urban trees.'],
    ];
}

/**
 * Every tool id: [id, status, TR name, EN name, page (file of the tool that covers it) or null].
 * Out-of-scope ids are listed (the plan keeps them) but never drawn.
 */
function site_catalog(): array {
    $tr = site_ctx()['tr'];
    $L = function (array $rows) use ($tr) { return array_map(function ($r) use ($tr) { return ['id' => $r[0], 'status' => $r[1], 'name' => $tr ? $r[2] : $r[3], 'page' => $r[4] ?? null]; }, $rows); };
    return $L([
        ['DI-01', 'live', 'Veri içe aktarma ve denetim', 'Data import and validation', 'veri-denetcisi.php'],
        ['DI-02', 'planned', 'Katsayı ve denklem kütüphanesi', 'Coefficient and equation library'],
        ['DI-03', 'planned', 'Proje ve envanter verisi yöneticisi', 'Project and inventory data manager'],
        ['DI-04', 'planned', 'Görselleştirme panosu', 'Visualization dashboard'],
        ['DI-05', 'planned', 'Rapor üretici', 'Report generator'],
        ['DI-06', 'out', 'API ve betik arayüzü', 'API and scripting interface'],
        ['DI-07', 'planned', 'Tekrarlanabilirlik katmanı', 'Reproducibility layer'],
        ['TM-01', 'planned', 'Boy hesaplayıcı', 'Height calculator'],
        ['TM-02', 'planned', 'Çap ve göğüs yüzeyi', 'DBH and basal area'],
        ['TM-03', 'planned', 'Kabuk kalınlığı ve kabuksuz çap', 'Bark thickness and under-bark diameter'],
        ['TM-04', 'planned', 'Tepe tacı ölçüleri', 'Crown metrics'],
        ['TM-05', 'planned', 'Ağaç yaşı ve çap artımı', 'Tree age and radial increment'],
        ['TM-06', 'planned', 'Biçim sayısı ve biçim bölümü', 'Form factor and form quotient'],
        ['SV-01', 'live', 'Seksiyon hacmi', 'Sectional volume', 'seksiyon-hacmi.php'],
        ['SV-02', 'planned', 'Gövde profili denklemleri', 'Taper models'],
        ['SV-03', 'planned', 'Kullanılabilir hacim', 'Merchantable volume'],
        ['SV-04', 'planned', 'Hacim denklemleri', 'Volume equations'],
        ['SV-05', 'planned', 'Tomruk ölçüm kuralları', 'Log scaling rules'],
        ['SV-06', 'planned', 'Ürün bölme (sortiman) eniyileme', 'Log bucking optimizer'],
        ['BC-01', 'planned', 'Allometrik biyokütle', 'Allometric biomass'],
        ['BC-02', 'planned', 'Biyokütle bileşenleri', 'Biomass components'],
        ['BC-03', 'planned', 'Biyokütle dönüşüm etkeni (BEF)', 'Biomass expansion factor (BEF)'],
        ['BC-04', 'planned', 'Karbon stoku ve CO₂ eşdeğeri', 'Carbon stock and CO₂ equivalent'],
        ['BC-05', 'planned', 'IPCC karbon hesabı (katman 1–3)', 'IPCC carbon accounting (tier 1–3)'],
        ['BC-06', 'planned', 'Karbon belirsizliği', 'Carbon uncertainty'],
        ['SS-01', 'live', 'Meşcere özeti', 'Stand summary', 'ornek-alan.php'],
        ['SS-02', 'live', 'Meşcere sıklık endeksleri', 'Stand density indices', 'mescere-yapisi.php'],
        ['SS-03', 'live', 'Çap dağılımı', 'Diameter distribution', 'cap-dagilimi.php'],
        ['SS-04', 'live', 'Çeşitlilik endeksleri', 'Diversity indices', 'mescere-yapisi.php'],
        ['SS-05', 'live', 'Yapısal çeşitlilik endeksleri', 'Structural diversity indices', 'mescere-yapisi.php'],
        ['SS-06', 'live', 'Mekânsal desen çözümlemesi', 'Spatial pattern analysis', 'mescere-yapisi.php'],
        ['SS-07', 'live', 'Rekabet endeksleri', 'Competition indices', 'mescere-yapisi.php'],
        ['SQ-01', 'live', 'Bonitet endeksi', 'Site index', 'bonitet.php'],
        ['SQ-02', 'live', 'Bonitet eğrisi kurma', 'Site index curve builder', 'bonitet.php'],
        ['SQ-03', 'planned', 'Büyüme işlevi uydurma', 'Growth function fitter'],
        ['SQ-04', 'out', 'Çevresel verilerden verimlilik', 'Productivity from environmental data'],
        ['SI-01', 'live', 'Örnek büyüklüğü', 'Sample size', 'ornekleme.php'],
        ['SI-02', 'planned', 'Örnekleme tasarımı üretici', 'Sampling design generator'],
        ['SI-03', 'live', 'Sabit alanlı örnek alan kestirimi', 'Fixed-area plot estimator', 'ornek-alan.php'],
        ['SI-04', 'planned', 'Açı sayımı (Bitterlich)', 'Point sampling (Bitterlich)'],
        ['SI-05', 'planned', 'Kenar etkisi düzeltmesi', 'Edge-effect correction'],
        ['SI-06', 'planned', 'Hat kesişim örneklemesi', 'Line-intersect sampling'],
        ['SI-07', 'planned', 'İki aşamalı ve çift örnekleme', 'Two-phase and double sampling'],
        ['SI-08', 'planned', 'Tasarıma dayalı çıkarım', 'Design-based inference'],
        ['SI-09', 'planned', 'Tekrarlı envanter çözümlemesi', 'Repeated inventory analysis'],
        ['GY-01', 'planned', 'Meşcere hasılat tablosu üretici', 'Whole-stand yield table generator'],
        ['GY-02', 'planned', 'Çap sınıfı ve matris modeli', 'Diameter-class and matrix model'],
        ['GY-03', 'planned', 'Tek ağaç büyüme benzetimi', 'Individual-tree growth simulator'],
        ['GY-04', 'planned', 'Ölüm ve aralanma modelleri', 'Mortality and ingrowth models'],
        ['GY-05', 'planned', 'Aralama senaryoları', 'Thinning scenarios'],
        ['GY-06', 'planned', 'Meşcere sıklığı yönetim diyagramı', 'Stand density management diagram'],
        ['GY-07', 'planned', 'Kendiliğinden seyrelme doğrusu', 'Self-thinning line'],
        ['GY-08', 'out', 'İklime duyarlı büyüme projeksiyonu', 'Climate-sensitive growth projection'],
        ['SM-01', 'live', 'Boy–çap modelleri', 'Height–diameter models', 'boy-cap.php'],
        ['SM-02', 'planned', 'Doğrusal olmayan regresyon', 'Nonlinear regression'],
        ['SM-03', 'planned', 'Karma etkili modeller', 'Mixed-effects models'],
        ['SM-04', 'planned', 'Eşanlı ve uyumlu sistemler', 'Simultaneous and compatible systems'],
        ['SM-05', 'planned', 'Ölüm ve sağkalım modelleri', 'Mortality and survival models'],
        ['SM-06', 'live', 'Model değerlendirme', 'Model evaluation', 'model-degerlendirme.php'],
        ['SM-07', 'planned', 'Belirsizlik nicelemesi', 'Uncertainty quantification'],
        ['ML-01', 'planned', 'Makine öğrenmesi ile regresyon ve sınıflama', 'ML regression and classification'],
        ['ML-02', 'out', 'Derin öğrenmeyle tepe tacı ayırma', 'Deep-learning crown delineation'],
        ['ML-03', 'out', 'Nokta bulutu segmentasyonu', 'Point-cloud segmentation'],
        ['ML-04', 'planned', 'k-NN atama', 'k-NN imputation'],
        ['ML-05', 'planned', 'Mekânsal ara değerleme', 'Spatial interpolation'],
        ['ML-06', 'planned', 'Mekânsal çapraz doğrulama', 'Spatial cross-validation'],
        ['ML-07', 'planned', 'Küçük alan kestirimi', 'Small-area estimation'],
        ['ML-08', 'planned', 'Model destekli çıkarım', 'Model-assisted inference'],
        ['DS-01', 'planned', 'Odun değerleme', 'Timber valuation'],
        ['DS-02', 'planned', 'Üretim planlama eniyileme', 'Harvest scheduling'],
        ['DS-03', 'out', 'Karbon projesi MRV', 'Carbon project MRV'],
        ['DS-04', 'planned', 'Ölü odun ve habitat yapısı', 'Deadwood and habitat structure'],
        ['DS-05', 'planned', 'Zarar değerlendirmesi', 'Disturbance damage assessment'],
        ['DS-06', 'planned', 'Kent ağaçları envanteri', 'Urban tree inventory'],
    ]);
}

/**
 * What the sidebar and the index draw for one module: the tool pages whose home module it is (site_tools() 'cat'),
 * links to pages at home elsewhere that also cover an id of this module, and the not-yet-built ids (greyed).
 */
function site_module_items(string $mod, array $tools, array $catalog): array {
    $home = array_values(array_filter($tools, function ($t) use ($mod) { return $t['cat'] === $mod; }));
    $homeFiles = array_column($home, 'file');
    $cover = []; $planned = [];
    foreach ($catalog as $c) {
        if (strpos($c['id'], $mod . '-') !== 0 || $c['status'] === 'out') continue;
        if ($c['page']) { if (!in_array($c['page'], $homeFiles, true) && !isset($cover[$c['page']])) $cover[$c['page']] = $c; }
        else $planned[] = $c;
    }
    return ['home' => $home, 'also' => array_values($cover), 'planned' => $planned];
}
