<?php
// Old page addresses (23 Nov 2026, user decision: English file names). Every page that had a Turkish file name keeps a
// small file under that name that calls fb_moved(): a permanent (301) redirect to the new page with the query string
// kept, and for the guide the old section keys (k=bonitet, k=genel …) turned into the new ones. The deploy never deletes
// files on the server, so the old names must stay as these stubs (otherwise the old pages would stay there unchanged).
declare(strict_types=1);
require_once __DIR__ . '/renamed.php';

function fb_moved(string $to): void {
    $q = [];
    parse_str((string)($_SERVER['QUERY_STRING'] ?? ''), $q);
    if ($to === 'guide.php' && isset($q['k']) && is_string($q['k'])) $q['k'] = SITE_GUIDE_RENAMED[$q['k']] ?? $q['k'];
    $qs = http_build_query($q);
    header('Location: ' . $to . ($qs !== '' ? '?' . $qs : ''), true, 301);
    header('Cache-Control: public, max-age=86400');
    exit;
}
