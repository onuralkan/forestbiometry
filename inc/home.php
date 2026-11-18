<?php
// Home page (tools index): data for the directory, the search and the task filters. Presentation only; the tools, their
// modules and statuses come from site_tools() (inc/site.php) and the catalogue (inc/catalog.php), the one-line captions
// from tool_card_data() (inc/hero.php) and the tasks from guide_cards() (inc/guide/cards.php), so nothing is listed
// twice.
require_once __DIR__ . '/hero.php';
require_once __DIR__ . '/guide/cards.php';

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
    $tools = site_tools(); $other = site_tools(!$tr); $cat = site_catalog(); $cap = tool_card_data($tr);
    $byFile = []; foreach ($other as $t) $byFile[$t['file']] = $t;
    $out = [];
    foreach (site_modules() as $m) {
        $it = site_module_items($m['id'], $tools, $cat); $cards = [];
        foreach ($it['home'] as $t) {
            $cov = array_values(array_filter($cat, function ($c) use ($t) { return $c['page'] === $t['file'] && $c['status'] !== 'out'; }));
            $o = $byFile[$t['file']] ?? null;
            $text = implode(' ', array_merge([$t['title'], $t['short'], $t['desc'], $cap[$t['file']][1] ?? '', $m['title']], array_column($cov, 'name'), array_column($cov, 'id'),
                $o ? [$o['title'], $o['short'], $o['desc']] : []));
            $cards[] = ['file' => $t['file'], 'title' => $t['title'], 'short' => $t['short'], 'icon' => $t['icon'], 'cap' => $cap[$t['file']][1] ?? '', 'desc' => $t['desc'],
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
