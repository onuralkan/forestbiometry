<?php
// Home page (tools index): data for the directory, the search and the task filters. Presentation only; the tools, their
// modules and statuses come from site_tools() (inc/site.php) and the catalogue (inc/catalog.php), the tasks from
// guide_cards() (inc/guide/cards.php); only the one-line captions of the cards are kept here (home_captions()).
require_once __DIR__ . '/guide/cards.php';

/** One-line caption (≤ 90 characters) of each tool's card, keyed by the tool's page. A new tool adds its line here. */
function home_captions(): array {
    return [
        'veri-denetcisi.php' => 'Format errors and suspect measurements; logged fixes and approval',
        'katsayi-kutuphanesi.php' => 'Every tool\'s coefficient sets with their sources',
        'kayit-dogrulayici.php' => 'Seal, version and input fingerprints of a run record',
        'veri-yoneticisi.php' => 'Approved packages, the active one, plot × period overview',
        'pano.php' => 'Filtered panels with curves from run records',
        'rapor.php' => 'Printable report from a package and records; PDF and HTML',
        'ornek-alan.php' => 'N and G per hectare, diameter classes, design-based estimate',
        'model-degerlendirme.php' => 'Bias, MAE, RMSE, prediction R²; residual plots',
        'cap-dagilimi.php' => 'Weibull and seven more; fitting and recovery',
        'boy-cap.php' => 'Six nonlinear models, cross-validation',
        'ornekleme.php' => 'Number of plots for a target error',
        'nispi-siralama.php' => 'Overall rank from fit criteria, radar chart',
        'seksiyon-hacmi.php' => 'Huber, Smalian, Newton, Hohenadl; tree and per-hectare volume',
        'bonitet.php' => 'Difference equations with your coefficients, site classes',
        'mescere-yapisi.php' => 'Diameter structure, density, spatial pattern, competition',
        'govde-profili.php' => 'Max–Burkhart and Kozak; merchantable volume, bucking',
        'hacim-denklemleri.php' => 'Constant form factor, combined variable, logarithmic and local equations',
        'dogrusal-olmayan-regresyon.php' => 'Ready-made forms or a free formula; weights, intervals, AIC',
        'karma-modeller.php' => 'Linear and nonlinear; ML/REML, calibration of a new plot',
        'denklem-sistemleri.php' => 'Your own formulas; shared coefficients, OLS, SUR, iterated SUR',
        'tomruk-olcumu.php' => 'Scribner, Doyle, International; Smalian, Huber, Newton',
        'biyokutle-karbon.php' => 'Component biomass, carbon and CO₂ with your coefficients',
        'buyume-islevi.php' => 'Six growth functions; increments and culmination',
        'agac-olcumu.php' => 'Height with a clinometer, diameter and basal area, bark, crown, form factor',
    ];
}


/** Lower case, accents removed, Turkish ı/İ as i: the same folding as the page's search script. */
function home_fold(string $s): string {
    $s = strtr($s, ['İ' => 'i', 'I' => 'i', 'ı' => 'i', 'Ç' => 'c', 'ç' => 'c', 'Ğ' => 'g', 'ğ' => 'g', 'Ö' => 'o', 'ö' => 'o', 'Ş' => 's', 'ş' => 's', 'Ü' => 'u', 'ü' => 'u',
        'Â' => 'a', 'â' => 'a', 'Î' => 'i', 'î' => 'i', 'Û' => 'u', 'û' => 'u', 'é' => 'e', 'É' => 'e', '–' => ' ', '—' => ' ', '&' => ' ']);
    $s = strtolower($s);                                                   // ASCII only: no mbstring needed
    return trim(preg_replace('/\s+/u', ' ', $s));
}

/**
 * The directory: modules in display order, each with its tools (cards) and planned items (not links). A tool is
 * { file, title, short, icon, cap (one line), desc, ids (catalogue ids it covers), search (folded text), mod }. A planned item is { id, name }. Modules without tools or planned items are left out.
 */
function home_directory(): array {
    $tools = site_tools(); $cat = site_catalog(); $cap = home_captions();
    $out = [];
    foreach (site_modules() as $m) {
        $it = site_module_items($m['id'], $tools, $cat); $cards = [];
        foreach ($it['home'] as $t) {
            $cov = array_values(array_filter($cat, function ($c) use ($t) { return $c['page'] === $t['file'] && $c['status'] !== 'out'; }));
            $text = implode(' ', array_merge([$t['title'], $t['short'], $t['desc'], $cap[$t['file']] ?? '', $m['title']], array_column($cov, 'name'), array_column($cov, 'id')));
            $cards[] = ['file' => $t['file'], 'title' => $t['title'], 'short' => $t['short'], 'icon' => $t['icon'], 'cap' => $cap[$t['file']] ?? '', 'desc' => $t['desc'],
                'ids' => array_column($cov, 'id'), 'search' => home_fold($text), 'mod' => $m['id']];
        }
        $planned = array_map(function ($c) { return ['id' => $c['id'], 'name' => $c['name'], 'status' => $c['status']]; }, $it['planned']);
        if ($cards || $planned) $out[] = ['id' => $m['id'], 'title' => $m['title'], 'desc' => $m['desc'], 'tools' => $cards, 'planned' => $planned];
    }
    return $out;
}

/** Catalogue ids as a short label: consecutive numbers of one module joined (TM-01 … TM-06 → "TM-01–06"). */
function home_ids(array $ids): string {
    if (!$ids) return '';
    $runs = []; $prev = null;
    foreach ($ids as $id) {
        [$m, $n] = explode('-', $id); $n = (int)$n;
        if ($prev && $prev[0] === $m && $prev[2] === $n - 1) { $runs[count($runs) - 1][2] = $n; $prev[2] = $n; continue; }
        $runs[] = [$m, $n, $n]; $prev = [$m, $n, $n];
    }
    return implode(' · ', array_map(function ($r) { return sprintf('%s-%02d', $r[0], $r[1]) . ($r[2] > $r[1] ? sprintf('–%02d', $r[2]) : ''); }, $runs));
}

/** Tasks of the guide's start page, with the tool files they lead to (only existing tools). */
function home_tasks(): array {
    $files = array_column(site_tools(), 'file');
    return array_values(array_filter(array_map(function ($c) use ($files) {
        $f = array_values(array_filter(array_map(function ($id) { return $id . '.php'; }, $c['ids']), function ($x) use ($files) { return in_array($x, $files, true); }));
        return $f ? ['id' => $c['id'], 'title' => $c['title'], 'text' => $c['text'], 'files' => $f] : null;
    }, guide_cards())));
}

/**
 * The home page's direct links (20 Nov 2026, user decision): three groups, six tools that stand for different basic
 * tasks. An editorial choice, not a ranking: there are no usage data. Names and pages come from site_tools(); only the
 * one-line scope (what it computes, from what input) is written here.
 */
function home_picks(): array {
    $g = [
        ['Stands and distributions', [
            'ornek-alan.php' => 'From tree lists of fixed-area plots: stems and basal area per hectare, diameter classes, design-based estimate.',
            'cap-dagilimi.php' => 'Fits Weibull and seven more distributions to measured diameters; parameter recovery and stand models.']],
        ['Volume and site productivity', [
            'seksiyon-hacmi.php' => 'Stem volume from measured section diameters by Huber, Smalian, Newton and Hohenadl; tree and per-hectare totals.',
            'bonitet.php' => 'Site index from top height and age, with a coefficient set you enter with its source or coefficients estimated from your data.']],
        ['Modelling and evaluation', [
            'boy-cap.php' => 'Fits and compares six nonlinear models on measured heights and diameters; cross-validation, predictions for missing heights.',
            'model-degerlendirme.php' => 'Bias, MAE, RMSE and prediction R² from observed and predicted values; intervals and residual plots.']],
    ];
    $byFile = []; foreach (site_tools() as $t) $byFile[$t['file']] = $t;
    return array_map(function ($x) use ($byFile) {
        return ['title' => $x[0], 'tools' => array_values(array_filter(array_map(function ($f, $d) use ($byFile) {
            return isset($byFile[$f]) ? ['file' => $f, 'name' => $byFile[$f]['short'], 'icon' => $byFile[$f]['icon'], 'desc' => $d] : null;
        }, array_keys($x[1]), $x[1])))];
    }, $g);
}
