<?php
// Literature box of the tool pages (inc/literature.php), administrator only. Everyone else gets 404, as if it did not exist.
//   GET  ?tool=<id>&sort=recent|cited[&refresh=1]  → {tool, query, custom, sort, fetched, total, entries, cached} or {error}
//   POST {tool, query} with header X-CSRF          → saves the tool's query ('' = back to the default); {query, custom}
declare(strict_types=1);
require __DIR__ . '/../inc/literature.php';

$u = fb_config() ? fb_user() : null;
if (!$u || empty($u['admin']) || !fb_lit_on()) fb_json(['error' => 'not-found'], 404);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!fb_csrf_ok($_SERVER['HTTP_X_CSRF'] ?? null)) fb_json(['error' => 'token'], 403);
    $in = json_decode((string)file_get_contents('php://input', false, null, 0, 5000), true);
    $tool = is_array($in) ? (string)($in['tool'] ?? '') : '';
    if (!isset(FB_LIT_DEFAULT[$tool]) || !is_string($in['query'] ?? null)) fb_json(['error' => 'bad-request'], 400);
    $q = trim(preg_replace('/\s+/u', ' ', $in['query']));
    if (strlen($q) > 1000) fb_json(['error' => 'too-long'], 400);
    if ($q === FB_LIT_DEFAULT[$tool]) $q = '';
    fb_lit_set_query($tool, $q);
    fb_audit($u['orcid'], 'literature-query', null, $tool . ': ' . ($q === '' ? 'default' : $q));
    [$nq, $custom] = fb_lit_query($tool);
    fb_json(['query' => $nq, 'custom' => $custom]);
}
if ($_SERVER['REQUEST_METHOD'] !== 'GET') fb_json(['error' => 'method'], 405);
$tool = (string)($_GET['tool'] ?? '');
if (!isset(FB_LIT_DEFAULT[$tool])) fb_json(['error' => 'bad-request'], 400);
$sort = ($_GET['sort'] ?? '') === 'cited' ? 'cited' : 'recent';
$r = fb_lit_list($tool, $sort, !empty($_GET['refresh']));
fb_json($r, $r['ok'] ? 200 : 502);
