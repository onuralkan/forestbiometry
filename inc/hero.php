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

/* ---------------- drawings of the other live tools (tools index cards; illustrations, no data) ---------------- */
/** Data Checker: a table with a format error, a suspect value and checked rows. */
function hero_checker(): string {
    $o = ''; $x0 = 22; $y0 = 16; $cw = [46, 46, 54, 54]; $rh = 18;
    $x = $x0; foreach ($cw as $w) { $o .= '<rect class="hz-hdr" x="' . $x . '" y="' . $y0 . '" width="' . ($w - 3) . '" height="' . ($rh - 4) . '" rx="3"/>'; $x += $w; }
    $flag = [1 => [2, 'hz-errc'], 3 => [3, 'hz-warnc']];
    for ($r = 1; $r <= 5; $r++) {
        $x = $x0; $y = $y0 + $r * $rh + 4;
        foreach ($cw as $c => $w) { $cls = isset($flag[$r]) && $flag[$r][0] === $c ? $flag[$r][1] : 'hz-cell'; $o .= '<rect class="' . $cls . '" x="' . $x . '" y="' . $y . '" width="' . ($w - 3) . '" height="' . ($rh - 4) . '" rx="3"/>'; $x += $w; }
        $st = $r === 1 ? 'hz-err' : ($r === 3 ? 'hz-warn' : 'hz-ok');
        $o .= '<circle class="' . $st . '" cx="' . ($x + 14) . '" cy="' . ($y + 7) . '" r="5"/>';
    }
    return $o . '<path class="hz-chk" d="M242 128l8 8 16-18"/>';
}
/** Plot & Stand: stems per hectare by diameter class (reverse J) with the plot outline. */
function hero_stand(): string {
    $W = 300; $H = 150; $l = 22; $b = 20; $o = hero_axes($W, $H, $l, $b); $Y = $H - $b; $i = 0;
    for ($k = 0; $k < 11; $k++) { $v = 92 * exp(-0.26 * $k) + 4; $o .= '<rect class="hz-bar" style="--i:' . $i++ . '" x="' . ($l + 4 + $k * 19) . '" y="' . round($Y - $v, 1) . '" width="16" height="' . round($v, 1) . '"/>'; }
    foreach ([[0, 10], [5, 30], [10, 50]] as [$k, $t]) $o .= '<text class="hz-tick" x="' . ($l + 12 + $k * 19) . '" y="' . ($H - 4) . '" text-anchor="middle">' . $t . '</text>';
    return $o . '<circle class="hz-plot" cx="252" cy="44" r="26"/><text class="hz-unit" x="252" y="48" text-anchor="middle">N/ha</text>';
}
/** Model evaluation: observed against predicted around the 1:1 line. */
function hero_eval(): string {
    $W = 300; $H = 150; $l = 22; $b = 20; $o = hero_axes($W, $H, $l, $b); $Y = $H - $b; $r = hero_rng(20261116);
    $o .= '<path class="hz-ref" d="M' . ($l + 4) . ' ' . ($Y - 4) . 'L' . ($W - 12) . ' 12"/>';
    for ($k = 0; $k < 40; $k++) { $u = $r(); $e = ($r() + $r() + $r() - 1.5) * 0.12; $x = $l + 10 + $u * 240; $y = $Y - 8 - ($u + $e) * 100; $o .= '<circle class="hz-pt" style="--i:' . $k . '" cx="' . round($x, 1) . '" cy="' . round(max(12, $y), 1) . '" r="2.6"/>'; }
    return $o . '<text class="hz-unit" x="' . ($W - 8) . '" y="' . ($H - 4) . '" text-anchor="end">ŷ</text><text class="hz-unit" x="' . ($l + 6) . '" y="18">y</text>';
}
/** Sampling planner: number of plots against the target relative error, n ∝ 1/E². */
function hero_sampling(): string {
    $W = 300; $H = 150; $l = 22; $b = 20; $o = hero_axes($W, $H, $l, $b); $Y = $H - $b; $px = 240 / 20; $pts = [];
    for ($e = 3; $e <= 20.01; $e += 0.25) $pts[] = [$l + $e * $px, $Y - min(116, 2600 / ($e * $e))];
    $o .= '<path class="hz-line hz-c1" pathLength="1" d="' . hero_path($pts) . '"/>';
    $xm = $l + 10 * $px; $ym = $Y - 26;
    $o .= '<path class="hz-ref" d="M' . $xm . ' ' . $Y . 'V' . $ym . 'H' . $l . '"/><circle class="hz-dot hz-s1" cx="' . $xm . '" cy="' . $ym . '" r="3.5"/>';
    foreach ([5, 10, 15, 20] as $t) $o .= '<text class="hz-tick" x="' . round($l + $t * $px, 1) . '" y="' . ($H - 4) . '" text-anchor="middle">' . $t . '</text>';
    return $o . '<text class="hz-unit" x="' . ($W - 8) . '" y="' . ($H - 4) . '" text-anchor="end">E %</text><text class="hz-unit" x="' . ($l + 6) . '" y="18">n</text>';
}
/** Relative ranking: radar of two models over six criteria. */
function hero_rank(): string {
    $cx = 150; $cy = 76; $R = 60; $o = '';
    $pt = function ($k, $v) use ($cx, $cy, $R) { $a = -M_PI / 2 + 2 * M_PI * $k / 6; return [$cx + $R * $v * cos($a), $cy + $R * $v * sin($a)]; };
    foreach ([1 / 3, 2 / 3, 1] as $g) $o .= '<path class="hz-axis" d="' . hero_path(array_map(function ($k) use ($pt, $g) { return $pt($k % 6, $g); }, range(0, 6))) . '"/>';
    for ($k = 0; $k < 6; $k++) { $p = $pt($k, 1); $o .= '<path class="hz-axis" d="M' . $cx . ' ' . $cy . 'L' . round($p[0], 1) . ' ' . round($p[1], 1) . '"/>'; }
    foreach ([[0, [.9, .8, .95, .7, .85, .9]], [1, [.5, .65, .4, .6, .45, .55]]] as [$j, $v]) $o .= '<path class="hz-area hz-a' . $j . '" d="' . hero_path(array_map(function ($k) use ($pt, $v) { return $pt($k, $v[$k]); }, range(0, 5))) . 'Z"/>';
    return $o;
}
/** Stem taper: over- and under-bark profile of a stem along its height. */
function hero_taper(): string {
    $W = 300; $H = 150; $l = 16; $L = 268; $cy = 70; $R = 34; $o = '';
    $rad = function ($x, $k) use ($R) { return $R * $k * (pow(1 - $x, 0.7) + 0.25 * exp(-$x * 30)); };
    foreach ([[1.0, 'hz-k0'], [0.86, 'hz-wood']] as [$k, $cls]) {
        $top = []; $bot = [];
        for ($i = 0; $i <= 60; $i++) { $x = $i / 60; $r = $rad($x, $k); $top[] = [$l + $x * $L, $cy - $r]; $bot[] = [$l + $x * $L, $cy + $r]; }
        $o .= '<path class="' . $cls . '" d="' . hero_path(array_merge($top, array_reverse($bot))) . 'Z"/>';
    }
    $o .= '<path class="hz-ref" d="M' . $l . ' ' . $cy . 'H' . ($l + $L) . '"/>';
    foreach ([[0, '0'], [0.5, 'h'], [1, 'H']] as [$x, $t]) $o .= '<text class="hz-tick" x="' . round($l + $x * $L, 1) . '" y="' . ($H - 6) . '" text-anchor="middle">' . $t . '</text>';
    return $o;
}
/** Tree measurement: a tree, the observer's lines of sight to its top and base, and the breast-height diameter. */
function hero_tree(): string {
    return soon_tree(210, 130, 112, 30) . '<path class="hz-ref" d="M48 104L210 18M48 104L210 130"/><circle class="hz-dot hz-s1" cx="48" cy="104" r="4"/>'
        . '<path class="hz-axis" d="M238 18V130"/><path class="hz-k0" d="M201 112H219" stroke-width="3"/><text class="hz-tick" x="246" y="78">H</text><text class="hz-tick" x="222" y="110">d</text>';
}
/** Growth function: a sigmoid growth curve through observations, with its inflection point. */
function hero_growth(): string {
    $W = 300; $H = 150; $l = 22; $b = 20; $o = hero_axes($W, $H, $l, $b); $Y = $H - $b; $px = 2.4; $r = hero_rng(20261117);
    $g = function ($t) { return 100 * pow(1 - exp(-0.035 * $t), 2.6); };
    $pts = []; for ($t = 0; $t <= 100; $t += 2) $pts[] = [$l + $t * $px, $Y - $g($t)];
    for ($k = 0; $k < 18; $k++) { $t = 6 + $k * 5.3; $o .= '<circle class="hz-pt" style="--i:' . $k . '" cx="' . round($l + $t * $px, 1) . '" cy="' . round($Y - $g($t) + ($r() - .5) * 10, 1) . '" r="2.6"/>'; }
    $o .= '<path class="hz-line hz-c2" pathLength="1" d="' . hero_path($pts) . '"/>';
    $ti = log(2.6) / 0.035; $o .= '<path class="hz-ref" d="M' . round($l + $ti * $px, 1) . ' ' . $Y . 'V14"/>';
    foreach ([25, 50, 75, 100] as $t) $o .= '<text class="hz-tick" x="' . round($l + $t * $px, 1) . '" y="' . ($H - 4) . '" text-anchor="middle">' . $t . '</text>';
    return $o . '<text class="hz-unit" x="' . ($W - 8) . '" y="' . ($H - 18) . '" text-anchor="end">t</text>';
}
/** Coefficient library: stacked coefficient sets, each with its parameters and a source line. */
function hero_coeflib(): string {
    $o = '';
    foreach ([[46, 28], [30, 18], [14, 8]] as $i => [$x, $y]) {
        $o .= '<rect class="hz-box" x="' . $x . '" y="' . $y . '" width="210" height="96" rx="8"/>';
        if ($i < 2) continue;
        $o .= '<rect class="hz-hdr" x="' . ($x + 12) . '" y="' . ($y + 12) . '" width="110" height="10" rx="3"/>';
        foreach (['a', 'b', 'c'] as $k => $n) { $cx = $x + 12 + $k * 52; $o .= '<rect class="hz-chip" x="' . $cx . '" y="' . ($y + 34) . '" width="44" height="20" rx="10"/><text class="hz-tick" x="' . ($cx + 22) . '" y="' . ($y + 48) . '" text-anchor="middle">' . $n . '</text>'; }
        $o .= '<rect class="hz-row" x="' . ($x + 12) . '" y="' . ($y + 66) . '" width="150" height="6" rx="3"/><rect class="hz-row" x="' . ($x + 12) . '" y="' . ($y + 78) . '" width="96" height="6" rx="3"/>';
    }
    return $o;
}
/** Record Verifier: a run record with its fingerprint line and a seal that holds. */
function hero_record(): string {
    $o = '<rect class="hz-box" x="60" y="12" width="150" height="126" rx="6"/><rect class="hz-hdr" x="72" y="24" width="80" height="9" rx="3"/>';
    foreach ([[42, 112], [56, 96], [70, 120], [84, 88]] as [$y, $w]) $o .= '<rect class="hz-row" x="72" y="' . $y . '" width="' . $w . '" height="6" rx="3"/>';
    $o .= '<text class="hz-mono" x="72" y="114">SHA-256 3f9a…c1</text>';
    return $o . '<circle class="hz-ok" cx="214" cy="104" r="22"/><path class="hz-chk" d="M203 104l8 8 14-16"/>';
}
/** Inventory Data Manager: plot × period record counts of a package. */
function hero_projects(): string {
    $o = ''; $x0 = 92; $y0 = 26; $cw = 54; $rh = 20; $v = [[3, 4, 2], [2, 0, 3], [4, 4, 4], [4, 1, 0], [0, 2, 3]];
    foreach (['t₁', 't₂', 't₃'] as $j => $t) $o .= '<text class="hz-tick" x="' . ($x0 + $j * $cw + 24) . '" y="' . ($y0 - 6) . '" text-anchor="middle">' . $t . '</text>';
    foreach ($v as $i => $row) {
        $y = $y0 + $i * $rh; $o .= '<text class="hz-tick" x="' . ($x0 - 10) . '" y="' . ($y + 13) . '" text-anchor="end">P' . ($i + 1) . '</text>';
        foreach ($row as $j => $n) $o .= '<rect class="hz-heat" style="--a:' . ($n / 4) . '" x="' . ($x0 + $j * $cw) . '" y="' . $y . '" width="' . ($cw - 4) . '" height="' . ($rh - 4) . '" rx="3"/>';
    }
    return $o;
}
/** Dashboard: four small panels. */
function hero_dashboard(): string {
    $o = ''; $p = [[14, 10], [154, 10], [14, 80], [154, 80]];
    foreach ($p as [$x, $y]) $o .= '<rect class="hz-box" x="' . $x . '" y="' . $y . '" width="132" height="62" rx="6"/>';
    foreach ([30, 46, 38, 22, 14] as $k => $h) $o .= '<rect class="hz-bar" style="--i:' . $k . '" x="' . (26 + $k * 22) . '" y="' . (64 - $h) . '" width="16" height="' . $h . '"/>';
    $pts = []; for ($t = 0; $t <= 20; $t++) $pts[] = [166 + $t * 5.4, 60 - 40 * (1 - exp(-$t / 6))];
    $o .= '<path class="hz-line hz-c1" pathLength="1" d="' . hero_path($pts) . '"/>';
    $r = hero_rng(7); for ($k = 0; $k < 16; $k++) { $u = $r(); $o .= '<circle class="hz-pt" style="--i:' . $k . '" cx="' . round(26 + $u * 108, 1) . '" cy="' . round(132 - $u * 40 - $r() * 10, 1) . '" r="2.2"/>'; }
    foreach ([[180, 'hz-a0', 0.58], [230, 'hz-a1', 0.32]] as [$cx, $cls, $f]) $o .= '<rect class="hz-area ' . $cls . '" x="' . ($cx - 18) . '" y="' . round(132 - 40 * $f / 0.6, 1) . '" width="36" height="' . round(40 * $f / 0.6, 1) . '" rx="3"/>';
    return $o;
}
/** Report Generator: a printable page with headings, text, a chart and a table. */
function hero_report(): string {
    $o = '<rect class="hz-box" x="80" y="6" width="140" height="138" rx="4"/><rect class="hz-title" x="92" y="16" width="86" height="9" rx="3"/>';
    foreach ([[32, 112], [42, 98]] as [$y, $w]) $o .= '<rect class="hz-row" x="92" y="' . $y . '" width="' . $w . '" height="5" rx="2.5"/>';
    foreach ([18, 30, 24, 12] as $k => $h) $o .= '<rect class="hz-bar" style="--i:' . $k . '" x="' . (96 + $k * 16) . '" y="' . (88 - $h) . '" width="11" height="' . $h . '"/>';
    $o .= '<path class="hz-axis" d="M92 88H170"/>';
    for ($r = 0; $r < 4; $r++) $o .= '<path class="hz-axis" d="M92 ' . (100 + $r * 10) . 'H208"/>';
    return $o . '<path class="hz-axis" d="M130 100V130M170 100V130"/>';
}

/** Biomass and carbon: biomass by component per plot (stacked), with carbon beside it. */
function hero_biomass(): string {
    $o = hero_axes(300, 150, 22, 20);
    foreach ([[60, 26, 12], [76, 32, 15], [52, 22, 10], [88, 38, 18]] as $k => $v) { $y = 130; foreach ($v as $j => $h) { $o .= '<rect class="hz-st' . $j . '" x="' . (40 + $k * 62) . '" y="' . ($y - $h) . '" width="34" height="' . $h . '"/>'; $y -= $h; } }
    return $o . '<text class="hz-unit" x="' . 292 . '" y="146" text-anchor="end">Mg/ha</text>';
}
/** Volume equations: volume against D²H with a fitted line (illustration; points simulated). */
function hero_volume(): string {
    $W = 300; $H = 150; $l = 22; $b = 20; $o = hero_axes($W, $H, $l, $b); $Y = $H - $b; $r = hero_rng(20261117);
    for ($k = 0; $k < 36; $k++) { $u = $r(); $e = ($r() + $r() + $r() - 1.5) * (0.02 + 0.06 * $u); $x = $l + 10 + $u * 250; $y = $Y - 6 - ($u + $e) * 100; $o .= '<circle class="hz-pt" style="--i:' . $k . '" cx="' . round($x, 1) . '" cy="' . round($y, 1) . '" r="2.6"/>'; }
    $o .= '<path class="hz-line hz-c1" d="M' . ($l + 10) . ' ' . ($Y - 6) . 'L' . ($l + 260) . ' ' . ($Y - 106) . '"/>';
    return $o . '<text class="hz-unit" x="' . ($W - 8) . '" y="' . ($H - 4) . '" text-anchor="end">D²H</text><text class="hz-unit" x="' . ($l + 6) . '" y="18">V</text>';
}
/** Drawing and short caption of each live tool's card (keyed by the tool's page; tools index). */
function tool_card_data(bool $tr): array {
    return [
        'veri-denetcisi.php' => ['hero_checker', $tr ? 'Biçim hataları ve şüpheli ölçümler; gerekçeli düzeltme ve onay' : 'Format errors and suspect measurements; logged fixes and approval'],
        'katsayi-kutuphanesi.php' => ['hero_coeflib', $tr ? 'Bütün araçların katsayı setleri, kaynaklarıyla tek yerde' : 'Every tool\'s coefficient sets with their sources'],
        'kayit-dogrulayici.php' => ['hero_record', $tr ? 'Çalışma kaydının mührü, sürümü ve girdi parmak izleri' : 'Seal, version and input fingerprints of a run record'],
        'veri-yoneticisi.php' => ['hero_projects', $tr ? 'Onaylı paketler, etkin paket, örnek alan × dönem özeti' : 'Approved packages, the active one, plot × period overview'],
        'pano.php' => ['hero_dashboard', $tr ? 'Süzgeçli paneller; çalışma kayıtlarından eğriler' : 'Filtered panels with curves from run records'],
        'rapor.php' => ['hero_report', $tr ? 'Paket ve kayıtlardan yazdırılabilir rapor; PDF ve HTML' : 'Printable report from a package and records; PDF and HTML'],
        'ornek-alan.php' => ['hero_stand', $tr ? 'Hektarda N ve G, çap sınıfları, tasarıma dayalı kestirim' : 'N and G per hectare, diameter classes, design-based estimate'],
        'model-degerlendirme.php' => ['hero_eval', $tr ? 'Yanlılık, MAE, RMSE, tahmin R²; artık grafikleri' : 'Bias, MAE, RMSE, prediction R²; residual plots'],
        'cap-dagilimi.php' => ['hero_dist', $tr ? 'Weibull ve yedi dağılım daha; uydurma ve geri kazanım' : 'Weibull and seven more; fitting and recovery'],
        'boy-cap.php' => ['hero_hd', $tr ? 'Altı doğrusal olmayan model, çapraz doğrulama' : 'Six nonlinear models, cross-validation'],
        'ornekleme.php' => ['hero_sampling', $tr ? 'Hedef hataya göre örnek alan sayısı' : 'Number of plots for a target error'],
        'nispi-siralama.php' => ['hero_rank', $tr ? 'Başarı ölçütlerinden genel sıra, radar grafiği' : 'Overall rank from fit criteria, radar chart'],
        'seksiyon-hacmi.php' => ['hero_stem', $tr ? 'Huber, Smalian, Newton, Hohenadl; ağaç ve hektar hacmi' : 'Huber, Smalian, Newton, Hohenadl; tree and per-hectare volume'],
        'bonitet.php' => ['hero_site', $tr ? 'Fark denklemleri, kendi katsayılarınız, bonitet sınıfları' : 'Difference equations with your coefficients, site classes'],
        'mescere-yapisi.php' => ['hero_map', $tr ? 'Çap yapısı, sıklık, mekânsal desen ve rekabet' : 'Diameter structure, density, spatial pattern, competition'],
        'govde-profili.php' => ['hero_taper', $tr ? 'Max–Burkhart ve Kozak; kullanılabilir hacim, ürün bölme' : 'Max–Burkhart and Kozak; merchantable volume, bucking'],
        'hacim-denklemleri.php' => ['hero_volume', $tr ? 'Sabit biçim sayısı, birleşik değişken, logaritmik ve yerel denklemler' : 'Constant form factor, combined variable, logarithmic and local equations'],
        'biyokutle-karbon.php' => ['hero_biomass', $tr ? 'Bileşen biyokütlesi, karbon ve CO₂; kendi katsayılarınızla' : 'Component biomass, carbon and CO₂ with your coefficients'],
        'buyume-islevi.php' => ['hero_growth', $tr ? 'Altı büyüme işlevi; artımlar ve doruk yaşı' : 'Six growth functions; increments and culmination'],
        'agac-olcumu.php' => ['hero_tree', $tr ? 'Eğim ölçerle boy, çap ve göğüs yüzeyi, kabuk, tepe, biçim sayısı' : 'Height with a clinometer, diameter and basal area, bark, crown, form factor'],
    ];
}
/** One tool card of the tools index: icon, short name, drawing, short caption; the full description as a tooltip. */
function tool_card(array $t, bool $tr): string {
    static $data = null; if ($data === null) $data = tool_card_data($tr);
    $d = $data[$t['file']] ?? null;
    $fig = $d ? '<svg class="hz-fig" viewBox="0 0 300 150" aria-hidden="true" focusable="false">' . call_user_func($d[0]) . '</svg>' : '';
    return '<a role="listitem" class="hz-card" href="' . h($t['file']) . '" title="' . h($t['desc']) . '"><span class="hz-head"><span class="hz-ico">' . site_icon($t['icon']) . '</span><b>' . h($t['short']) . '</b>'
        . site_icon('chev', 'ico hz-go') . '</span>' . $fig . '<span class="hz-sub">' . h($d ? $d[1] : $t['desc']) . '</span></a>';
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

/* ---------------- planned and in-progress tools: small drawings from a kit (tools index; illustrations, no data) ---------------- */
function soon_tree(float $x, float $base, float $h, float $w): string {
    return '<path class="hz-trunk" d="M' . ($x - 3) . ' ' . $base . 'V' . ($base - $h * .35) . 'H' . ($x + 3) . 'V' . $base . 'Z"/>'
        . '<ellipse class="hz-crown" cx="' . $x . '" cy="' . round($base - $h * .62, 1) . '" rx="' . $w . '" ry="' . round($h * .36, 1) . '"/>';
}
function soon_curve(callable $f, float $x0 = 22, float $x1 = 288, float $Y = 130, string $cls = 'hz-line hz-c1'): string {
    $p = []; for ($i = 0; $i <= 60; $i++) { $u = $i / 60; $p[] = [$x0 + $u * ($x1 - $x0), $Y - $f($u)]; }
    return '<path class="' . $cls . '" d="' . hero_path($p) . '"/>';
}
function soon_pts(int $seed, int $n, callable $f, float $sd = 8): string {
    $r = hero_rng($seed); $o = '';
    for ($k = 0; $k < $n; $k++) { $u = $r(); $o .= '<circle class="hz-pt" cx="' . round(22 + $u * 266, 1) . '" cy="' . round(130 - $f($u) + ($r() - .5) * 2 * $sd, 1) . '" r="2.6"/>'; }
    return $o;
}
function soon_bars(array $v, string $cls = 'hz-bar', float $x0 = 34, float $w = 0): string {
    $o = ''; $n = count($v); $w = $w ?: min(34, 230 / $n - 6);
    foreach ($v as $k => $h) $o .= '<rect class="' . $cls . '" x="' . round($x0 + $k * (240 / $n), 1) . '" y="' . round(130 - $h, 1) . '" width="' . round($w, 1) . '" height="' . round($h, 1) . '"/>';
    return $o;
}
function soon_figure(string $kind): string {
    $ax = hero_axes(300, 150, 22, 20); $r = hero_rng(crc32($kind) % 100000 + 7);
    switch ($kind) {
        case 'logs':     return '<rect class="hz-k0" x="40" y="58" width="200" height="34" rx="4"/><ellipse class="hz-wood" cx="240" cy="75" rx="10" ry="17"/><ellipse class="hz-ringl" cx="240" cy="75" rx="10" ry="17"/><path class="hz-tape" d="M40 110H240M40 105v10M240 105v10"/><text class="hz-tick" x="140" y="128" text-anchor="middle">L</text>';
        case 'nlreg':    return $ax . soon_pts(31, 34, function ($u) { return 100 * (1 - exp(-3 * $u)); }) . soon_curve(function ($u) { return 100 * (1 - exp(-3 * $u)); });
        case 'mixed':    { $o = $ax; foreach ([[.8, 0], [1, 1], [1.2, 2], [.9, 3]] as [$a, $k]) $o .= soon_curve(function ($u) use ($a) { return $a * 95 * (1 - exp(-2.5 * $u)); }, 22, 288, 130, 'hz-line hz-s' . $k); return $o; }
        case 'system':   { $o = $ax; foreach ([[.35, 0], [.65, 1], [1, 2]] as [$a, $k]) $o .= soon_curve(function ($u) use ($a) { return $a * 100 * pow($u, 1.6); }, 22, 288, 130, 'hz-line hz-s' . $k); return $o; }
        case 'survival': { $p = [[22, 20]]; $s = 110; for ($k = 0; $k < 10; $k++) { $x = 22 + ($k + 1) * 26.6; $p[] = [$x, 130 - $s]; $s *= .82; $p[] = [$x, 130 - $s]; } return $ax . '<path class="hz-line hz-c1" d="' . hero_path($p) . '"/>'; }
    }
    return '';
}
/** Drawing kind and short caption of every planned or in-progress tool (keyed by catalogue id). Ids removed from the plan
 * (17 Nov 2026, user decision) and tools already live have no entry. */
function soon_card_data(bool $tr): array {
    $d = [
        'SV-05' => ['logs', 'Tomruk hacmi ölçüm kuralları', 'Log volume scaling rules'],
        'SM-02' => ['nlreg', 'Genel doğrusal olmayan regresyon', 'General nonlinear regression'],
        'SM-03' => ['mixed', 'Karma etkili modeller (örnek alan etkisi)', 'Mixed-effects models (plot effects)'],
        'SM-04' => ['system', 'Eşanlı ve toplamsal denklem sistemleri', 'Simultaneous and additive equation systems'],
        'SM-05' => ['survival', 'Ölüm ve sağkalım modelleri', 'Mortality and survival models'],
    ];
    return array_map(function ($v) use ($tr) { return [$v[0], $tr ? $v[1] : $v[2]]; }, $d);
}
/** Card of a planned or in-progress tool: not a link; muted drawing; a corner badge. */
function soon_card(array $c, bool $tr): string {
    static $data = null; if ($data === null) $data = soon_card_data($tr);
    $d = $data[$c['id']] ?? null; $dev = $c['status'] === 'dev';
    $badge = $dev ? ($tr ? 'Yolda' : 'In progress') : ($tr ? 'Yakında' : 'Soon');
    $fig = $d ? '<svg class="hz-fig" viewBox="0 0 300 150" aria-hidden="true" focusable="false">' . soon_figure($d[0]) . '</svg>' : '';
    return '<div role="listitem" class="hz-card soon' . ($dev ? ' dev' : '') . '" title="' . h($c['id'] . ' · ' . $c['name']) . '"><span class="hz-head"><span class="hz-id">' . h($c['id']) . '</span><b>' . h($c['name']) . '</b>'
        . '<span class="hz-badge">' . h($badge) . '</span></span>' . $fig . '<span class="hz-sub">' . h($d ? $d[1] : $c['name']) . '</span></div>';
}
