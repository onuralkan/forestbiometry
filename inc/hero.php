<?php
/**
 * Home page showcase: small drawings of what the tools produce, one card per live tool (links to the tool).
 * Illustrations only, not data: curves come from textbook function shapes with arbitrary parameters, scatter and stem
 * positions from a fixed-seed generator (docs/METHODS.md §4). No coefficient here belongs to a species or region (K1);
 * the captions say "illustration". Every drawing is an inline SVG coloured by CSS variables (light and dark themes).
 */

/** Fixed-seed uniform generator (same LCG as before; deterministic page). */
function hero_rng(int $seed): callable {
    return function () use (&$seed) { $seed = ($seed * 1103515245 + 12345) % 2147483648; return $seed / 2147483648; };
}
/** Polyline path through points [[x, y], …], rounded to 0.1 px. */
function hero_path(array $p): string {
    $o = '';
    foreach ($p as $i => $q) $o .= ($i ? 'L' : 'M') . round($q[0], 1) . ' ' . round($q[1], 1);
    return $o;
}
/** Axes frame of a mini chart: baseline and left axis, W × H inner box with margins m. */
function hero_axes(float $W, float $H, float $l, float $b): string {
    return '<path class="hz-axis" d="M' . $l . ' 8V' . ($H - $b) . 'H' . ($W - 6) . '"/>';
}

/** Diameter distribution: histogram of class probabilities of a 3-parameter Weibull and its density curve. */
function hero_dist(): string {
    $W = 300; $H = 150; $l = 14; $b = 18; $a = 6; $sc = 21; $c = 2.3;   // location (cm), scale (cm), shape: illustration
    $F = function ($x) use ($a, $sc, $c) { return $x <= $a ? 0 : 1 - exp(-pow(($x - $a) / $sc, $c)); };
    $f = function ($x) use ($a, $sc, $c) { if ($x <= $a) return 0; $z = ($x - $a) / $sc; return $c / $sc * pow($z, $c - 1) * exp(-pow($z, $c)); };
    $x0 = 4; $x1 = 64; $px = ($W - $l - 10) / ($x1 - $x0);
    $ymax = 0; for ($x = $x0; $x <= $x1; $x += .25) $ymax = max($ymax, $f($x));
    $py = ($H - $b - 14) / ($ymax * 1.05); $Y = $H - $b;
    $o = hero_axes($W, $H, $l, $b);
    $i = 0;
    for ($lo = 5; $lo < 60; $lo += 5) {                               // 5 cm classes; bar height = class probability / width
        $p = ($F($lo + 5) - $F($lo)) / 5; $h = $p * $py;
        $o .= '<rect class="hz-bar" style="--i:' . $i++ . '" x="' . round($l + ($lo - $x0) * $px + 1, 1) . '" y="' . round($Y - $h, 1) . '" width="' . round(5 * $px - 2, 1) . '" height="' . round($h, 1) . '" rx="2"/>';
    }
    $pts = []; for ($x = $x0; $x <= $x1; $x += .5) $pts[] = [$l + ($x - $x0) * $px, $Y - $f($x) * $py];
    $o .= '<path class="hz-line hz-c1" pathLength="1" d="' . hero_path($pts) . '"/>';
    foreach ([10, 30, 50] as $t) $o .= '<text class="hz-tick" x="' . round($l + ($t - $x0) * $px, 1) . '" y="' . ($H - 4) . '" text-anchor="middle">' . $t . '</text>';
    return $o . '<text class="hz-unit" x="' . ($W - 8) . '" y="' . ($H - 4) . '" text-anchor="end">d (cm)</text>';
}

/** Height–diameter: Näslund-type curve h = 1.3 + d²/(a + b·d)² with a seeded scatter around it. */
function hero_hd(): string {
    $W = 300; $H = 150; $l = 14; $b = 18; $A = 1.1; $B = 0.17;         // illustration parameters
    $h = function ($d) use ($A, $B) { return 1.3 + $d * $d / pow($A + $B * $d, 2); };
    $px = ($W - $l - 10) / 62; $py = ($H - $b - 12) / 34; $Y = $H - $b;
    $o = hero_axes($W, $H, $l, $b); $r = hero_rng(20261116);
    for ($k = 0; $k < 46; $k++) {
        $d = 6 + 54 * pow($r(), 1.2); $e = ($r() + $r() + $r() - 1.5) * 2.6;
        $o .= '<circle class="hz-pt" style="--i:' . $k . '" cx="' . round($l + $d * $px, 1) . '" cy="' . round($Y - ($h($d) + $e) * $py, 1) . '" r="2.6"/>';
    }
    $pts = []; for ($d = 1; $d <= 62; $d += 1) $pts[] = [$l + $d * $px, $Y - $h($d) * $py];
    $o .= '<path class="hz-line hz-c2" pathLength="1" d="' . hero_path($pts) . '"/>';
    foreach ([20, 40, 60] as $t) $o .= '<text class="hz-tick" x="' . round($l + $t * $px, 1) . '" y="' . ($H - 4) . '" text-anchor="middle">' . $t . '</text>';
    return $o;
}

/** Site index: anamorphic family of Chapman–Richards-shaped curves through H(50) = SI. */
function hero_site(): string {
    $W = 300; $H = 150; $l = 14; $b = 18; $k = 0.035; $p = 1.4; $ref = 50;   // illustration parameters
    $px = ($W - $l - 10) / 100; $py = ($H - $b - 12) / 38; $Y = $H - $b;
    $o = hero_axes($W, $H, $l, $b);
    $o .= '<path class="hz-ref" d="M' . round($l + $ref * $px, 1) . ' 10V' . $Y . '"/>';
    foreach ([16, 20, 24, 28] as $j => $si) {
        $pts = []; for ($t = 0; $t <= 100; $t += 2) $pts[] = [$l + $t * $px, $Y - $si * pow((1 - exp(-$k * $t)) / (1 - exp(-$k * $ref)), $p) * $py];
        $o .= '<path class="hz-line hz-s' . $j . '" style="--i:' . $j . '" pathLength="1" d="' . hero_path($pts) . '"/>';
        $o .= '<circle class="hz-dot hz-s' . $j . '" cx="' . round($l + $ref * $px, 1) . '" cy="' . round($Y - $si * $py, 1) . '" r="3"/>';
    }
    foreach ([25, 50, 75, 100] as $t) $o .= '<text class="hz-tick" x="' . round($l + $t * $px, 1) . '" y="' . ($H - 4) . '" text-anchor="middle">' . $t . '</text>';
    return $o . '<text class="hz-unit" x="' . ($W - 8) . '" y="18" text-anchor="end">SI</text>';
}

/** Stem sections: a felled stem drawn lying, cut into 2 m sections with their mid diameters (Huber). */
function hero_stem(): string {
    $W = 300; $H = 150; $L = 26; $R = 0.30; $l = 12; $px = ($W - 2 * $l) / $L; $cy = 70;   // 26 m stem, 30 cm butt radius
    $rad = function ($h) use ($L, $R) { $x = 1 - $h / $L; return $R * (pow($x, 0.62) + 0.22 * exp(-$h * 2.2)); };  // drawing shape
    $s = 115;                                                         // px per metre of radius (exaggerated for view)
    $o = '';
    for ($h0 = 0, $i = 0; $h0 < $L; $h0 += 2, $i++) {
        $h1 = min($L, $h0 + 2); $top = []; $bot = [];
        for ($h = $h0; $h <= $h1 + 1e-9; $h += .25) { $top[] = [$l + $h * $px, $cy - $rad($h) * $s]; $bot[] = [$l + $h * $px, $cy + $rad($h) * $s]; }
        $o .= '<path class="hz-sec hz-k' . ($i % 2) . '" style="--i:' . $i . '" d="' . hero_path(array_merge($top, array_reverse($bot))) . 'Z"/>';
        $m = ($h0 + $h1) / 2; $rm = $rad($m) * $s;
        $o .= '<path class="hz-mid" d="M' . round($l + $m * $px, 1) . ' ' . round($cy - $rm, 1) . 'V' . round($cy + $rm, 1) . '"/>';
    }
    $o .= '<path class="hz-tape" d="M' . $l . ' 128H' . ($l + 10 * $px) . 'M' . $l . ' 124v8M' . ($l + 10 * $px) . ' 124v8"/>';
    return $o . '<text class="hz-tick" x="' . round($l + 5 * $px, 1) . '" y="144" text-anchor="middle">10 m</text>';
}

/** Stem map: a circular plot with seeded tree positions, circle size from dbh. */
function hero_map(): string {
    $W = 300; $H = 150; $cx = 150; $cy = 75; $R = 62; $r = hero_rng(20261109); $o = '';
    $o .= '<circle class="hz-plot" cx="' . $cx . '" cy="' . $cy . '" r="' . $R . '"/>';
    $trees = []; $tries = 0;
    while (count($trees) < 30 && $tries++ < 3000) {
        $q = $R * sqrt($r()); $a = 2 * M_PI * $r(); $x = $cx + $q * cos($a); $y = $cy + $q * sin($a);
        $d = 2.2 + 6.5 * pow($r(), 2.2); $ok = true;
        foreach ($trees as $t) if (hypot($t[0] - $x, $t[1] - $y) < $t[2] + $d + 1.2) { $ok = false; break; }
        if ($ok) $trees[] = [$x, $y, $d, $r() < .65 ? 3 : 4];
    }
    foreach ($trees as $i => $t) $o .= '<circle class="hz-tree hz-s' . $t[3] . '" style="--i:' . $i . '" cx="' . round($t[0], 1) . '" cy="' . round($t[1], 1) . '" r="' . round($t[2], 1) . '"/>';
    return $o . '<path class="hz-axis" d="M' . ($cx - 6) . ' ' . $cy . 'h12M' . $cx . ' ' . ($cy - 6) . 'v12"/>';
}

/** The showcase: cards linking to the live tools. */
function hero_showcase(bool $tr): string {
    $cards = [
        ['dist',     'cap-dagilimi.php',  'wide', $tr ? 'Çap dağılımı' : 'Diameter distribution', $tr ? 'Weibull ve yedi dağılım daha; uydurma ve geri kazanım' : 'Weibull and seven more; fitting and recovery', hero_dist()],
        ['hd',       'boy-cap.php',       '',     $tr ? 'Boy–çap' : 'Height–diameter',              $tr ? 'Doğrusal olmayan modeller' : 'Nonlinear models',                        hero_hd()],
        ['siteindex','bonitet.php',       '',     $tr ? 'Bonitet' : 'Site index',                   $tr ? 'Eğri ailesi, referans yaş' : 'Curve family, reference age',              hero_site()],
        ['secvol',   'seksiyon-hacmi.php','',     $tr ? 'Seksiyon hacmi' : 'Section volume',        $tr ? 'Huber, Smalian, Newton, Hohenadl' : 'Huber, Smalian, Newton, Hohenadl', hero_stem()],
        ['structure','mescere-yapisi.php','',     $tr ? 'Meşcere yapısı' : 'Stand structure',       $tr ? 'Mekânsal desen ve rekabet' : 'Spatial pattern and competition',         hero_map()],
    ];
    $o = '';
    foreach ($cards as $c) {
        $o .= '<a class="hz-card ' . $c[2] . '" href="' . h($c[1]) . '"><span class="hz-head"><span class="hz-ico">' . site_icon($c[0]) . '</span><b>' . h($c[3]) . '</b>'
            . site_icon('chev', 'ico hz-go') . '</span><svg class="hz-fig" viewBox="0 0 300 150" aria-hidden="true" focusable="false">' . $c[5] . '</svg><span class="hz-sub">' . h($c[4]) . '</span></a>';
    }
    $cap = $tr ? 'Çizimler araçların ürettiği çıktı türlerini gösterir; eğriler örnek parametrelerle çizildi, noktalar benzetimdir.'
               : 'Drawings of the kinds of output the tools produce; curves use example parameters, points are simulated.';
    return '<div class="hz-grid" role="list">' . str_replace('<a class="hz-card', '<a role="listitem" class="hz-card', $o) . '</div><p class="hz-cap">' . h($cap) . '</p>';
}
