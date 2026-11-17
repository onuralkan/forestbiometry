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
        case 'height':   return soon_tree(200, 128, 108, 30) . '<path class="hz-ref" d="M40 128L200 20M40 128L200 128"/><circle class="hz-dot hz-s1" cx="40" cy="128" r="4"/><path class="hz-axis" d="M228 20V128"/>';
        case 'dbh':      return '<circle class="hz-wood" cx="150" cy="75" r="52"/><circle class="hz-ringl" cx="150" cy="75" r="52"/><path class="hz-tape" d="M98 75H202"/><text class="hz-tick" x="150" y="68" text-anchor="middle">d</text>';
        case 'bark':     return '<circle class="hz-k0" cx="150" cy="75" r="58"/><circle class="hz-wood" cx="150" cy="75" r="48"/><path class="hz-tape" d="M198 75H208"/>';
        case 'crown':    return soon_tree(150, 132, 120, 62) . '<path class="hz-tape" d="M88 30H212M88 25v10M212 25v10"/>';
        case 'rings':    { $o = '<circle class="hz-wood" cx="150" cy="75" r="60"/>'; for ($k = 1; $k <= 9; $k++) $o .= '<circle class="hz-ringl" cx="' . (150 + $k * .6) . '" cy="75" r="' . round(6.4 * $k * (1 + .04 * sin($k)), 1) . '"/>'; return $o . '<path class="hz-tape" d="M150 75H210"/>'; }
        case 'form':     return '<path class="hz-ref" d="M20 52H280V98H20Z"/>' . '<path class="hz-k0" d="' . hero_path(array_merge(array_map(function ($i) { $x = $i / 40; return [20 + $x * 260, 75 - 23 * pow(1 - $x, .6)]; }, range(0, 40)), array_map(function ($i) { $x = 1 - $i / 40; return [20 + $x * 260, 75 + 23 * pow(1 - $x, .6)]; }, range(0, 40)))) . 'Z"/>';
        case 'merch':    return '<path class="hz-k0" d="' . hero_path(array_merge(array_map(function ($i) { $x = $i / 40; return [20 + $x * 260, 75 - 26 * pow(1 - $x, .6)]; }, range(0, 40)), array_map(function ($i) { $x = 1 - $i / 40; return [20 + $x * 260, 75 + 26 * pow(1 - $x, .6)]; }, range(0, 40)))) . 'Z"/><path class="hz-cut" d="M212 40V110"/><text class="hz-tick" x="212" y="128" text-anchor="middle">d_top</text>';
        case 'power':    return $ax . soon_pts(11, 30, function ($u) { return 100 * pow($u, 1.9); }) . soon_curve(function ($u) { return 100 * pow($u, 1.9); }, 22, 288, 130, 'hz-line hz-c2');
        case 'logs':     return '<rect class="hz-k0" x="40" y="58" width="200" height="34" rx="4"/><ellipse class="hz-wood" cx="240" cy="75" rx="10" ry="17"/><ellipse class="hz-ringl" cx="240" cy="75" rx="10" ry="17"/><path class="hz-tape" d="M40 110H240M40 105v10M240 105v10"/><text class="hz-tick" x="140" y="128" text-anchor="middle">L</text>';
        case 'stack':    { $o = $ax; foreach ([[40, 30, 14], [52, 36, 18], [64, 40, 22], [74, 46, 26]] as $k => $v) { $y = 130; foreach ($v as $j => $h) { $o .= '<rect class="hz-st' . $j . '" x="' . (50 + $k * 60) . '" y="' . ($y - $h) . '" width="34" height="' . $h . '"/>'; $y -= $h; } } return $o; }
        case 'convert':  return '<rect class="hz-box" x="30" y="45" width="70" height="60" rx="6"/><text class="hz-tick" x="65" y="80" text-anchor="middle">V</text><path class="hz-arrow" d="M108 75H186M178 68l8 7-8 7"/><rect class="hz-st0" x="196" y="35" width="70" height="80" rx="6"/><text class="hz-tick" x="231" y="80" text-anchor="middle">B</text><text class="hz-tick" x="147" y="66" text-anchor="middle">×BEF</text>';
        case 'co2':      return $ax . '<rect class="hz-bar" x="70" y="95" width="50" height="35"/><rect class="hz-st1" x="170" y="2" width="50" height="128"/><text class="hz-tick" x="95" y="88" text-anchor="middle">C</text><text class="hz-tick" x="195" y="145" text-anchor="middle">CO₂</text>';
        case 'tiers':    return soon_bars([30, 62, 100], 'hz-bar', 50, 60) . '<text class="hz-tick" x="80" y="145" text-anchor="middle">1</text><text class="hz-tick" x="160" y="145" text-anchor="middle">2</text><text class="hz-tick" x="240" y="145" text-anchor="middle">3</text>';
        case 'band':     { $f = function ($u) { return 20 + 80 * $u; }; $up = []; $lo = []; for ($i = 0; $i <= 40; $i++) { $u = $i / 40; $up[] = [22 + $u * 266, 130 - $f($u) - 8 - 22 * $u]; $lo[] = [22 + $u * 266, 130 - $f($u) + 8 + 22 * $u]; } return $ax . '<path class="hz-bandf" d="' . hero_path(array_merge($up, array_reverse($lo))) . 'Z"/>' . soon_curve($f); }
        case 'design':   { $o = '<path class="hz-plotr" d="M40 20L250 14L278 120L60 136Z"/>'; for ($i = 0; $i < 6; $i++) for ($j = 0; $j < 4; $j++) $o .= '<circle class="hz-tree hz-s3" cx="' . (74 + $i * 33 + $j * 5) . '" cy="' . (38 + $j * 26) . '" r="4.5"/>'; return $o; }
        case 'angle':    { $o = '<circle class="hz-dot hz-s1" cx="150" cy="75" r="4"/>'; foreach ([[60, 40, 9, 1], [220, 30, 6, 0], [240, 110, 12, 1], [80, 120, 5, 0], [180, 125, 8, 1], [110, 20, 4, 0]] as $t) $o .= '<circle class="hz-tree ' . ($t[3] ? 'hz-s3' : 'hz-s0') . '" cx="' . $t[0] . '" cy="' . $t[1] . '" r="' . $t[2] . '"/>'; return $o . '<path class="hz-ref" d="M150 75L60 40M150 75L240 110M150 75L180 125"/>'; }
        case 'edge':     return '<path class="hz-plotr" d="M10 10H190V140H10Z"/><circle class="hz-plot" cx="175" cy="75" r="50"/><path class="hz-cut" d="M190 10V140"/>' . '<text class="hz-tick" x="240" y="78" text-anchor="middle">×</text>';
        case 'transect': { $o = '<path class="hz-tape" d="M20 75H280"/>'; foreach ([[50, 50, 30], [110, 95, -20], [170, 40, 55], [230, 85, 12], [90, 30, 70]] as $l) { $a = $l[2] * M_PI / 180; $o .= '<path class="hz-log" d="M' . round($l[0] - 34 * cos($a), 1) . ' ' . round($l[1] - 34 * sin($a), 1) . 'L' . round($l[0] + 34 * cos($a), 1) . ' ' . round($l[1] + 34 * sin($a), 1) . '"/>'; } return $o; }
        case 'twophase': { $o = ''; for ($k = 0; $k < 60; $k++) $o .= '<circle class="hz-pt" cx="' . round(24 + $r() * 252, 1) . '" cy="' . round(14 + $r() * 122, 1) . '" r="2"/>'; for ($k = 0; $k < 8; $k++) $o .= '<circle class="hz-plot" cx="' . round(34 + $r() * 232, 1) . '" cy="' . round(24 + $r() * 102, 1) . '" r="9"/>'; return $o; }
        case 'ci':       { $o = $ax; foreach ([70, 92, 58, 80] as $k => $h) { $x = 60 + $k * 60; $o .= '<rect class="hz-bar" x="' . ($x - 15) . '" y="' . (130 - $h) . '" width="30" height="' . $h . '"/><path class="hz-tape" d="M' . $x . ' ' . (130 - $h - 14) . 'V' . (130 - $h + 14) . 'M' . ($x - 6) . ' ' . (130 - $h - 14) . 'H' . ($x + 6) . 'M' . ($x - 6) . ' ' . (130 - $h + 14) . 'H' . ($x + 6) . '"/>'; } return $o; }
        case 'paired':   { $o = $ax; for ($k = 0; $k < 9; $k++) { $x = 40 + $k * 28; $a = 40 + $r() * 50; $b = $a + 8 + $r() * 22; $o .= '<path class="hz-ref" d="M' . $x . ' ' . round(130 - $a, 1) . 'V' . round(130 - $b, 1) . '"/><circle class="hz-dot hz-s0" cx="' . $x . '" cy="' . round(130 - $a, 1) . '" r="3"/><circle class="hz-dot hz-s1" cx="' . $x . '" cy="' . round(130 - $b, 1) . '" r="3"/>'; } return $o; }
        case 'table':    { $o = '<rect class="hz-box" x="20" y="12" width="260" height="126" rx="6"/><rect class="hz-hdr" x="28" y="20" width="244" height="14" rx="3"/>'; for ($i = 0; $i < 6; $i++) for ($j = 0; $j < 5; $j++) $o .= '<rect class="hz-cell" x="' . (28 + $j * 49) . '" y="' . (42 + $i * 15) . '" width="44" height="10" rx="2"/>'; return $o; }
        case 'matrix':   { $o = ''; for ($i = 0; $i < 5; $i++) for ($j = 0; $j < 5; $j++) { $a = $i === $j ? .8 : ($i === $j + 1 ? .45 : 0); $o .= '<rect class="hz-heat" style="--a:' . $a . '" x="' . (90 + $j * 25) . '" y="' . (14 + $i * 25) . '" width="22" height="22" rx="3"/>'; } return $o; }
        case 'grow':     { $o = '<circle class="hz-plot" cx="150" cy="75" r="62"/>'; foreach ([[120, 50, 8], [170, 60, 11], [140, 100, 6], [185, 105, 9], [105, 85, 7]] as $t) $o .= '<circle class="hz-ringl" cx="' . $t[0] . '" cy="' . $t[1] . '" r="' . ($t[2] + 6) . '"/><circle class="hz-tree hz-s3" cx="' . $t[0] . '" cy="' . $t[1] . '" r="' . $t[2] . '"/>'; return $o; }
        case 'decay':    return $ax . soon_bars([100, 70, 50, 34, 24, 16, 11, 8]) . soon_curve(function ($u) { return 100 * exp(-2.6 * $u) + 8; }, 22, 288, 130, 'hz-line hz-c2');
        case 'thin':     { $p = []; $n = 105; for ($t = 0; $t <= 10; $t++) { $x = 22 + $t * 26.6; $p[] = [$x, 130 - $n]; if (in_array($t, [3, 6, 8])) { $n *= .62; $p[] = [$x, 130 - $n]; } else $n *= .97; } return $ax . '<path class="hz-line hz-c1" d="' . hero_path($p) . '"/>'; }
        case 'sdmd':     { $o = $ax; foreach ([1, .75, .5, .3] as $k => $f) $o .= '<path class="hz-ref" d="M' . (40) . ' ' . round(20 + (1 - $f) * 90, 1) . 'L280 ' . round(60 + (1 - $f) * 70, 1) . '"/>'; return $o . soon_curve(function ($u) { return 100 - 70 * $u; }, 40, 280, 130, 'hz-line hz-c2'); }
        case 'selfthin': return $ax . soon_pts(21, 34, function ($u) { return 100 - 80 * $u; }, 12) . '<path class="hz-line hz-c2" d="M30 14L286 112"/>';
        case 'nlreg':    return $ax . soon_pts(31, 34, function ($u) { return 100 * (1 - exp(-3 * $u)); }) . soon_curve(function ($u) { return 100 * (1 - exp(-3 * $u)); });
        case 'mixed':    { $o = $ax; foreach ([[.8, 0], [1, 1], [1.2, 2], [.9, 3]] as [$a, $k]) $o .= soon_curve(function ($u) use ($a) { return $a * 95 * (1 - exp(-2.5 * $u)); }, 22, 288, 130, 'hz-line hz-s' . $k); return $o; }
        case 'system':   { $o = $ax; foreach ([[.35, 0], [.65, 1], [1, 2]] as [$a, $k]) $o .= soon_curve(function ($u) use ($a) { return $a * 100 * pow($u, 1.6); }, 22, 288, 130, 'hz-line hz-s' . $k); return $o; }
        case 'survival': { $p = [[22, 20]]; $s = 110; for ($k = 0; $k < 10; $k++) { $x = 22 + ($k + 1) * 26.6; $p[] = [$x, 130 - $s]; $s *= .82; $p[] = [$x, 130 - $s]; } return $ax . '<path class="hz-line hz-c1" d="' . hero_path($p) . '"/>'; }
        case 'mltree':   { $o = ''; $n = [[150, 22], [90, 70], [210, 70], [60, 118], [120, 118], [190, 118], [240, 118]]; foreach ([[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]] as [$a, $b]) $o .= '<path class="hz-tape" d="M' . $n[$a][0] . ' ' . $n[$a][1] . 'L' . $n[$b][0] . ' ' . $n[$b][1] . '"/>'; foreach ($n as $k => $q) $o .= $k < 3 ? '<rect class="hz-box" x="' . ($q[0] - 22) . '" y="' . ($q[1] - 10) . '" width="44" height="20" rx="5"/>' : '<circle class="hz-tree ' . ($k % 2 ? 'hz-s3' : 'hz-s4') . '" cx="' . $q[0] . '" cy="' . $q[1] . '" r="9"/>'; return $o; }
        case 'knn':      { $o = ''; $q = [150, 75]; $pts = []; for ($k = 0; $k < 26; $k++) $pts[] = [24 + $r() * 252, 14 + $r() * 122]; usort($pts, function ($a, $b) use ($q) { return hypot($a[0] - $q[0], $a[1] - $q[1]) <=> hypot($b[0] - $q[0], $b[1] - $q[1]); }); foreach (array_slice($pts, 0, 4) as $p) $o .= '<path class="hz-ref" d="M150 75L' . round($p[0], 1) . ' ' . round($p[1], 1) . '"/>'; foreach ($pts as $p) $o .= '<circle class="hz-pt" cx="' . round($p[0], 1) . '" cy="' . round($p[1], 1) . '" r="3"/>'; return $o . '<circle class="hz-dot hz-s1" cx="150" cy="75" r="5"/>'; }
        case 'heat':     { $o = ''; for ($i = 0; $i < 6; $i++) for ($j = 0; $j < 10; $j++) { $a = .5 + .45 * sin($i * .9 + 1) * cos($j * .55); $o .= '<rect class="hz-heat" style="--a:' . round($a, 2) . '" x="' . (22 + $j * 26) . '" y="' . (12 + $i * 21) . '" width="24" height="19"/>'; } return $o; }
        case 'blocks':   { $o = ''; for ($i = 0; $i < 4; $i++) for ($j = 0; $j < 6; $j++) $o .= '<rect class="' . (($i + $j) % 4 === 1 ? 'hz-st1' : 'hz-cell') . '" x="' . (36 + $j * 40) . '" y="' . (14 + $i * 31) . '" width="37" height="28" rx="3"/>'; return $o; }
        case 'regions':  return '<path class="hz-heat" style="--a:.7" d="M30 20L120 14L130 70L40 80Z"/><path class="hz-heat" style="--a:.35" d="M120 14L230 22L210 76L130 70Z"/><path class="hz-heat" style="--a:.55" d="M230 22L280 40L270 120L210 76Z"/><path class="hz-heat" style="--a:.2" d="M40 80L130 70L150 136L50 130Z"/><path class="hz-heat" style="--a:.85" d="M130 70L210 76L270 120L150 136Z"/>';
        case 'assisted': return $ax . soon_pts(41, 30, function ($u) { return 15 + 90 * $u; }, 10) . '<path class="hz-line hz-c2" d="M22 115L288 25"/>';
        case 'value':    return $ax . soon_bars([40, 90, 64, 28], 'hz-st1') . '<text class="hz-tick" x="230" y="20" text-anchor="end">/ m³</text>';
        case 'gantt':    { $o = ''; foreach ([[0, 80], [50, 60], [110, 90], [20, 50], [170, 70]] as $k => [$x, $w]) $o .= '<rect class="hz-st' . ($k % 3) . '" x="' . (30 + $x) . '" y="' . (20 + $k * 22) . '" width="' . $w . '" height="14" rx="3"/>'; return $o . '<path class="hz-axis" d="M30 132H280"/>'; }
        case 'deadwood': return '<path class="hz-ground" d="M10 122H290"/>' . soon_tree(120, 122, 84, 24) . '<path class="hz-trunk" d="M226 122V58H234V122Z"/><path class="hz-log" d="M24 116L92 110"/><path class="hz-log" d="M150 117L206 112"/><path class="hz-log" d="M248 116L284 106"/>';
        case 'damage':   { $o = ''; for ($k = 0; $k < 22; $k++) { $x = 30 + $r() * 240; $y = 20 + $r() * 110; $o .= '<circle class="hz-tree ' . ($x > 170 && $y < 90 ? 'hz-s4' : 'hz-s3') . '" cx="' . round($x, 1) . '" cy="' . round($y, 1) . '" r="6"/>'; } return '<path class="hz-dmg" d="M170 14H284V92H170Z"/>' . $o; }
        case 'urban':    { $o = '<rect class="hz-cell" x="10" y="112" width="280" height="18"/><path class="hz-ref" d="M10 121H290"/>'; foreach ([45, 115, 185, 255] as $x) $o .= soon_tree($x, 110, 80, 22); return $o; }
    }
    return '';
}
/** Drawing kind and short caption of every planned or in-progress tool (keyed by catalogue id). */
function soon_card_data(bool $tr): array {
    $d = [
        'TM-01' => ['height', 'Eğim ölçerle boy: tanjant ve sinüs yöntemi, eğim düzeltmesi', 'Height with a clinometer: tangent and sine methods, slope correction'],
        'TM-02' => ['dbh', 'Çevreden çap, göğüs yüzeyi, düzensiz gövde', 'Diameter from girth, basal area, irregular stems'],
        'TM-03' => ['bark', 'Kabuk kalınlığı ve kabuksuz çap', 'Bark thickness and under-bark diameter'],
        'TM-04' => ['crown', 'Tepe genişliği, tepe uzunluğu ve oranları', 'Crown width, crown length and ratios'],
        'TM-05' => ['rings', 'Halka sayımından yaş ve çap artımı', 'Age and diameter increment from ring counts'],
        'TM-06' => ['form', 'Biçim sayısı ve biçim bölümü', 'Form factor and form quotient'],
        'SV-03' => ['merch', 'Tepe çapına kadar kullanılabilir hacim', 'Merchantable volume to a top diameter'],
        'SV-04' => ['power', 'Kendi verinizle hacim denklemi uydurma', 'Fitting volume equations to your data'],
        'SV-05' => ['logs', 'Tomruk hacmi ölçüm kuralları', 'Log volume scaling rules'],
        'BC-01' => ['power', 'Kendi katsayılarınızla ağaç biyokütlesi', 'Tree biomass with your coefficients'],
        'BC-02' => ['stack', 'Gövde, dal, yaprak ve kök biyokütlesi', 'Stem, branch, foliage and root biomass'],
        'BC-03' => ['convert', 'Hacimden biyokütleye: yoğunluk, BEF, kök oranı', 'From volume to biomass: density, BEF, root ratio'],
        'BC-04' => ['co2', 'Karbon stoku ve CO₂ eşdeğeri (44/12)', 'Carbon stock and CO₂ equivalent (44/12)'],
        'BC-05' => ['tiers', 'IPCC katman 1–3 karbon hesabı', 'IPCC tier 1–3 carbon accounting'],
        'BC-06' => ['band', 'Karbon kestiriminin belirsizliği', 'Uncertainty of carbon estimates'],
        'SI-02' => ['design', 'Rastgele, sistematik, tabakalı ve kümeli tasarımlar', 'Random, systematic, stratified and cluster designs'],
        'SI-04' => ['angle', 'Açı sayımıyla göğüs yüzeyi (Bitterlich)', 'Basal area by angle count (Bitterlich)'],
        'SI-05' => ['edge', 'Ayna ve walkthrough ile kenar etkisi düzeltmesi', 'Edge correction by mirage and walkthrough'],
        'SI-06' => ['transect', 'Hat kesişimiyle kalın ölü odun', 'Coarse woody debris by line intersect'],
        'SI-07' => ['twophase', 'İki aşamalı ve çift örnekleme', 'Two-phase and double sampling'],
        'SI-08' => ['ci', 'Horvitz–Thompson, tabakalı ve GREG kestirimi', 'Horvitz–Thompson, stratified and GREG estimators'],
        'SI-09' => ['paired', 'Tekrarlı envanterde büyüme, ölüm ve aralanma', 'Growth, mortality and removals in remeasurements'],
        'GY-01' => ['table', 'Kendi modelinizden meşcere hasılat tablosu', 'Yield tables from your own model'],
        'GY-02' => ['matrix', 'Çap sınıfı geçiş matrisi', 'Diameter-class transition matrix'],
        'GY-03' => ['grow', 'Tek ağaç düzeyinde büyüme benzetimi', 'Individual-tree growth simulation'],
        'GY-04' => ['decay', 'Ölüm ve aralanma modelleri', 'Mortality and ingrowth models'],
        'GY-05' => ['thin', 'Aralama senaryolarının karşılaştırılması', 'Comparing thinning scenarios'],
        'GY-06' => ['sdmd', 'Meşcere sıklığı yönetim diyagramı', 'Stand density management diagram'],
        'GY-07' => ['selfthin', 'Kendiliğinden seyrelme doğrusu', 'Self-thinning line'],
        'SM-02' => ['nlreg', 'Genel doğrusal olmayan regresyon', 'General nonlinear regression'],
        'SM-03' => ['mixed', 'Karma etkili modeller (örnek alan etkisi)', 'Mixed-effects models (plot effects)'],
        'SM-04' => ['system', 'Eşanlı ve toplamsal denklem sistemleri', 'Simultaneous and additive equation systems'],
        'SM-05' => ['survival', 'Ölüm ve sağkalım modelleri', 'Mortality and survival models'],
        'SM-07' => ['band', 'Model ve tahmin belirsizliği', 'Model and prediction uncertainty'],
        'ML-01' => ['mltree', 'Makine öğrenmesiyle regresyon ve sınıflama', 'Regression and classification with machine learning'],
        'ML-04' => ['knn', 'En yakın komşu ile atama', 'Nearest-neighbour imputation'],
        'ML-05' => ['heat', 'Mekânsal ara değerleme', 'Spatial interpolation'],
        'ML-06' => ['blocks', 'Blok yapılı mekânsal çapraz doğrulama', 'Blocked spatial cross-validation'],
        'ML-07' => ['regions', 'Küçük alan kestirimi', 'Small-area estimation'],
        'ML-08' => ['assisted', 'Model destekli çıkarım', 'Model-assisted inference'],
        'DS-01' => ['value', 'Ürün ve fiyatlarla odun değerleme', 'Timber valuation from products and prices'],
        'DS-02' => ['gantt', 'Üretim planlama eniyilemesi', 'Harvest scheduling optimisation'],
        'DS-04' => ['deadwood', 'Ölü odun hacmi ve habitat yapısı', 'Deadwood volume and habitat structure'],
        'DS-05' => ['damage', 'Rüzgâr, yangın ve böcek zararı', 'Wind, fire and insect damage'],
        'DS-06' => ['urban', 'Kent ağaçları envanteri', 'Urban tree inventory'],
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
