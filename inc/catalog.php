<?php
// Tool catalogue of the platform (docs/PLATFORM_PLAN.md). Stable tool ids MODULE-NN; a tool page (site_tools()) can
// cover several ids. status: 'live' (a page covers it), 'dev' (being built, no page yet), 'planned', 'out' (out of
// scope, kept only in the plan; not shown on the site). The sidebar and the tools index are drawn from here.
// 17 Nov 2026, user decision: 27 planned ids removed from the plan (status 'out', ids kept for history; PLATFORM_PLAN §"Çıkarılanlar");
// the modules GY, ML and DS, left without a tool, are no longer listed.

/** Modules in display order: id, icon, TR/EN title and one line of description. */
function site_modules(): array {
    return [
        ['id' => 'DI', 'title' => 'Data preparation and management', 'desc' => 'Checking, approving, keeping and reporting measurement data.'],
        ['id' => 'TM', 'title' => 'Tree measurement', 'desc' => 'Height, diameter, crown, age and form from single-tree measurements.'],
        ['id' => 'SV', 'title' => 'Stem volume and taper', 'desc' => 'Section volume, taper, merchantable volume and bucking.'],
        ['id' => 'BC', 'title' => 'Biomass and carbon', 'desc' => 'Allometric biomass, expansion factors, carbon and CO₂ (coefficients are yours).'],
        ['id' => 'SS', 'title' => 'Stand structure and density', 'desc' => 'Stand summary, diameter distribution, density, diversity, spatial pattern and competition.'],
        ['id' => 'SQ', 'title' => 'Site quality and productivity', 'desc' => 'Site index, site curves and growth functions.'],
        ['id' => 'SI', 'title' => 'Sampling and inventory', 'desc' => 'Sample size and fixed-area plot estimation.'],
        ['id' => 'SM', 'title' => 'Statistical modelling', 'desc' => 'Model fitting, comparison and evaluation.'],
    ];
}

/**
 * Every tool id: [id, status, TR name, EN name, page (file of the tool that covers it) or null].
 * Out-of-scope ids are listed (the plan keeps them) but never drawn.
 */
function site_catalog(): array {
    $L = function (array $rows) { return array_map(function ($r) { return ['id' => $r[0], 'status' => $r[1], 'name' => $r[2], 'page' => $r[3] ?? null]; }, $rows); };
    return $L([
        ['DI-01', 'live', 'Data import and validation', 'data-checker.php'],
        ['DI-02', 'live', 'Coefficient and equation library', 'coefficient-library.php'],
        ['DI-03', 'live', 'Project and inventory data manager', 'data-manager.php'],
        ['DI-04', 'live', 'Data visualization', 'data-visualization.php'],
        ['DI-05', 'live', 'Report generator', 'report-generator.php'],
        ['DI-06', 'out', 'API and scripting interface'],
        ['DI-07', 'live', 'Reproducibility layer', 'record-verifier.php'],
        ['TM-01', 'live', 'Height calculator', 'tree-measurement.php'],
        ['TM-02', 'live', 'DBH and basal area', 'tree-measurement.php'],
        ['TM-03', 'live', 'Bark thickness and under-bark diameter', 'tree-measurement.php'],
        ['TM-04', 'live', 'Crown metrics', 'tree-measurement.php'],
        ['TM-05', 'live', 'Tree age and radial increment', 'tree-measurement.php'],
        ['TM-06', 'live', 'Form factor and form quotient', 'tree-measurement.php'],
        ['SV-01', 'live', 'Sectional volume', 'section-volume.php'],
        ['SV-02', 'live', 'Taper models', 'stem-taper.php'],
        ['SV-03', 'live', 'Merchantable volume', 'stem-taper.php'],
        ['SV-04', 'live', 'Volume equations', 'volume-equations.php'],
        ['SV-05', 'live', 'Log scaling rules', 'log-scaling.php'],
        ['SV-06', 'live', 'Log bucking optimizer', 'stem-taper.php'],
        ['BC-01', 'live', 'Allometric biomass', 'biomass-carbon.php'],
        ['BC-02', 'live', 'Biomass components', 'biomass-carbon.php'],
        ['BC-03', 'live', 'Biomass expansion factor (BEF)', 'biomass-carbon.php'],
        ['BC-04', 'live', 'Carbon stock and CO₂ equivalent', 'biomass-carbon.php'],
        ['BC-05', 'out', 'IPCC carbon accounting (tier 1–3)'],
        ['BC-06', 'live', 'Carbon uncertainty', 'biomass-carbon.php'],
        ['SS-01', 'live', 'Stand summary', 'plot-stand-metrics.php'],
        ['SS-02', 'live', 'Stand density indices', 'stand-structure.php'],
        ['SS-03', 'live', 'Diameter distribution', 'diameter-distribution.php'],
        ['SS-04', 'live', 'Diversity indices', 'stand-structure.php'],
        ['SS-05', 'live', 'Structural diversity indices', 'stand-structure.php'],
        ['SS-06', 'live', 'Spatial pattern analysis', 'stand-structure.php'],
        ['SS-07', 'live', 'Competition indices', 'stand-structure.php'],
        ['SQ-01', 'live', 'Site index', 'site-index.php'],
        ['SQ-02', 'live', 'Site index curve builder', 'site-index.php'],
        ['SQ-03', 'live', 'Growth function fitter', 'growth-functions.php'],
        ['SQ-04', 'out', 'Productivity from environmental data'],
        ['SI-01', 'live', 'Sample size', 'sampling-planner.php'],
        ['SI-02', 'out', 'Sampling design generator'],
        ['SI-03', 'live', 'Fixed-area plot estimator', 'plot-stand-metrics.php'],
        ['SI-04', 'out', 'Point sampling (Bitterlich)'],
        ['SI-05', 'out', 'Edge-effect correction'],
        ['SI-06', 'out', 'Line-intersect sampling'],
        ['SI-07', 'out', 'Two-phase and double sampling'],
        ['SI-08', 'out', 'Design-based inference'],
        ['SI-09', 'out', 'Repeated inventory analysis'],
        ['GY-01', 'out', 'Whole-stand yield table generator'],
        ['GY-02', 'out', 'Diameter-class and matrix model'],
        ['GY-03', 'out', 'Individual-tree growth simulator'],
        ['GY-04', 'out', 'Mortality and ingrowth models'],
        ['GY-05', 'out', 'Thinning scenarios'],
        ['GY-06', 'out', 'Stand density management diagram'],
        ['GY-07', 'out', 'Self-thinning line'],
        ['GY-08', 'out', 'Climate-sensitive growth projection'],
        ['SM-01', 'live', 'Height–diameter models', 'height-diameter.php'],
        ['SM-02', 'live', 'Nonlinear regression', 'nonlinear-regression.php'],
        ['SM-03', 'live', 'Mixed-effects models', 'mixed-models.php'],
        ['SM-04', 'live', 'Simultaneous and compatible systems', 'equation-systems.php'],
        ['SM-05', 'out', 'Mortality and survival models'],
        ['SM-06', 'live', 'Model evaluation', 'model-evaluation.php'],
        ['SM-06', 'live', 'Model evaluation: relative ranking', 'relative-ranking.php'],   // 19 Nov 2026, user decision: Relative Ranking under SM-06, own page
        ['SM-07', 'out', 'Uncertainty quantification'],
        ['ML-01', 'out', 'ML regression and classification'],
        ['ML-02', 'out', 'Deep-learning crown delineation'],
        ['ML-03', 'out', 'Point-cloud segmentation'],
        ['ML-04', 'out', 'k-NN imputation'],
        ['ML-05', 'out', 'Spatial interpolation'],
        ['ML-06', 'out', 'Spatial cross-validation'],
        ['ML-07', 'out', 'Small-area estimation'],
        ['ML-08', 'out', 'Model-assisted inference'],
        ['DS-01', 'out', 'Timber valuation'],
        ['DS-02', 'out', 'Harvest scheduling'],
        ['DS-03', 'out', 'Carbon project MRV'],
        ['DS-04', 'out', 'Deadwood and habitat structure'],
        ['DS-05', 'out', 'Disturbance damage assessment'],
        ['DS-06', 'out', 'Urban tree inventory'],
    ]);
}

/**
 * What the sidebar and the index draw for one module: the tool pages whose home module it is (site_tools() 'cat'),
 * links to pages at home elsewhere that also cover an id of this module, and the not-yet-built ids (greyed).
 */
function site_module_items(string $mod, array $tools, array $catalog): array {
    $home = array_values(array_filter($tools, function ($t) use ($mod) { return $t['cat'] === $mod; }));
    // a tool listed under another tool's id stands right after it ('after'; Relative Ranking after Model Evaluation, SM-06)
    foreach ($home as $i => $t) if (!empty($t['after'])) { $j = array_search($t['after'], array_column($home, 'file'), true);
        if ($j !== false) { array_splice($home, $i, 1); $j = array_search($t['after'], array_column($home, 'file'), true); array_splice($home, $j + 1, 0, [$t]); } }
    $homeFiles = array_column($home, 'file');
    $cover = []; $planned = [];
    foreach ($catalog as $c) {
        if (strpos($c['id'], $mod . '-') !== 0 || $c['status'] === 'out') continue;
        if ($c['page']) { if (!in_array($c['page'], $homeFiles, true) && !isset($cover[$c['page']])) $cover[$c['page']] = $c; }
        else $planned[] = $c;
    }
    return ['home' => $home, 'also' => array_values($cover), 'planned' => $planned];
}
