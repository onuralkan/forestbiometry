<?php
// Home page (tools index): data for the directory, the search and the task filters. Presentation only; the tools, their
// modules and statuses come from site_tools() (inc/site.php) and the catalogue (inc/catalog.php), the tasks from
// guide_cards() (inc/guide/cards.php); only the one-line captions of the cards are kept here (home_captions()).
require_once __DIR__ . '/guide/cards.php';

/** One-line caption (≤ 90 characters) of each tool's card, keyed by the tool's page. A new tool adds its line here. */
function home_captions(bool $tr): array {
    return [
        'veri-denetcisi.php' => $tr ? 'Biçim hataları ve şüpheli ölçümler; gerekçeli düzeltme ve onay' : 'Format errors and suspect measurements; logged fixes and approval',
        'katsayi-kutuphanesi.php' => $tr ? 'Bütün araçların katsayı setleri, kaynaklarıyla tek yerde' : 'Every tool\'s coefficient sets with their sources',
        'kayit-dogrulayici.php' => $tr ? 'Çalışma kaydının mührü, sürümü ve girdi parmak izleri' : 'Seal, version and input fingerprints of a run record',
        'veri-yoneticisi.php' => $tr ? 'Onaylanmış paketler, etkin paket, örnek alan × dönem özeti' : 'Approved packages, the active one, plot × period overview',
        'pano.php' => $tr ? 'Süzgeçli paneller; çalışma kayıtlarından eğriler' : 'Filtered panels with curves from run records',
        'rapor.php' => $tr ? 'Paket ve kayıtlardan yazdırılabilir rapor; PDF ve HTML' : 'Printable report from a package and records; PDF and HTML',
        'ornek-alan.php' => $tr ? 'Hektarda N ve G, çap sınıfları, tasarıma dayalı kestirim' : 'N and G per hectare, diameter classes, design-based estimate',
        'model-degerlendirme.php' => $tr ? 'Yanlılık, MAE, RMSE, tahmin R²; artık grafikleri' : 'Bias, MAE, RMSE, prediction R²; residual plots',
        'cap-dagilimi.php' => $tr ? 'Weibull ve yedi dağılım daha; fit etme ve geri kazanım' : 'Weibull and seven more; fitting and recovery',
        'boy-cap.php' => $tr ? 'Altı doğrusal olmayan model, çapraz doğrulama' : 'Six nonlinear models, cross-validation',
        'ornekleme.php' => $tr ? 'Hedef hataya göre örnek alan sayısı' : 'Number of plots for a target error',
        'nispi-siralama.php' => $tr ? 'Başarı ölçütlerinden genel sıra, radar grafiği' : 'Overall rank from fit criteria, radar chart',
        'seksiyon-hacmi.php' => $tr ? 'Huber, Smalian, Newton, Hohenadl; ağaç ve hektar hacmi' : 'Huber, Smalian, Newton, Hohenadl; tree and per-hectare volume',
        'bonitet.php' => $tr ? 'Fark denklemleri, kendi katsayılarınız, bonitet sınıfları' : 'Difference equations with your coefficients, site classes',
        'mescere-yapisi.php' => $tr ? 'Çap yapısı, sıklık, mekânsal desen ve rekabet' : 'Diameter structure, density, spatial pattern, competition',
        'govde-profili.php' => $tr ? 'Max–Burkhart ve Kozak; ticari hacim, boylama' : 'Max–Burkhart and Kozak; merchantable volume, bucking',
        'hacim-denklemleri.php' => $tr ? 'Sabit şekil katsayısı, birleşik değişken, logaritmik ve yerel denklemler' : 'Constant form factor, combined variable, logarithmic and local equations',
        'dogrusal-olmayan-regresyon.php' => $tr ? 'Hazır biçimler ya da serbest formül; ağırlık, aralıklar, AIC' : 'Ready-made forms or a free formula; weights, intervals, AIC',
        'karma-modeller.php' => $tr ? 'Doğrusal ve doğrusal olmayan; ML/REML, yeni alan kalibrasyonu' : 'Linear and nonlinear; ML/REML, calibration of a new plot',
        'denklem-sistemleri.php' => $tr ? 'Kendi formülleriniz; ortak katsayılar, OLS, SUR, yinelemeli SUR' : 'Your own formulas; shared coefficients, OLS, SUR, iterated SUR',
        'tomruk-olcumu.php' => $tr ? 'Scribner, Doyle, International; Smalian, Huber, Newton' : 'Scribner, Doyle, International; Smalian, Huber, Newton',
        'biyokutle-karbon.php' => $tr ? 'Bileşen biyokütlesi, karbon ve CO₂; kendi katsayılarınızla' : 'Component biomass, carbon and CO₂ with your coefficients',
        'buyume-islevi.php' => $tr ? 'Altı büyüme fonksiyonu; artımlar ve doruk yaşı' : 'Six growth functions; increments and culmination',
        'agac-olcumu.php' => $tr ? 'Eğim ölçerle boy, çap ve göğüs yüzeyi, kabuk, tepe, şekil katsayısı' : 'Height with a clinometer, diameter and basal area, bark, crown, form factor',
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
 * { file, title, short, icon, cap (one line), desc, ids (catalogue ids it covers), search (folded text in both
 * languages), mod }. A planned item is { id, name }. Modules without tools or planned items are left out.
 */
function home_directory(bool $tr): array {
    $tools = site_tools(); $other = site_tools(!$tr); $cat = site_catalog(); $cap = home_captions($tr);
    $byFile = []; foreach ($other as $t) $byFile[$t['file']] = $t;
    $out = [];
    foreach (site_modules() as $m) {
        $it = site_module_items($m['id'], $tools, $cat); $cards = [];
        foreach ($it['home'] as $t) {
            $cov = array_values(array_filter($cat, function ($c) use ($t) { return $c['page'] === $t['file'] && $c['status'] !== 'out'; }));
            $o = $byFile[$t['file']] ?? null;
            $text = implode(' ', array_merge([$t['title'], $t['short'], $t['desc'], $cap[$t['file']] ?? '', $m['title']], array_column($cov, 'name'), array_column($cov, 'id'),
                $o ? [$o['title'], $o['short'], $o['desc']] : []));
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
function home_tasks(bool $tr): array {
    $files = array_column(site_tools(), 'file');
    return array_values(array_filter(array_map(function ($c) use ($files) {
        $f = array_values(array_filter(array_map(function ($id) { return $id . '.php'; }, $c['ids']), function ($x) use ($files) { return in_array($x, $files, true); }));
        return $f ? ['id' => $c['id'], 'title' => $c['title'], 'text' => $c['text'], 'files' => $f] : null;
    }, guide_cards($tr))));
}
