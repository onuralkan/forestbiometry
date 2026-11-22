<?php
// The account's saved analysis results and interpretations (22 Nov 2026, user decision: the server may keep analysis
// results for their owner, never raw data). Approved accounts only; every query is limited to the signed-in owner.
//   GET  ?list=results | ?list=interpretations          → items without their bodies, newest first
//   GET  ?result=<id> | ?interpretation=<id>            → one item with its body
//   GET  ?export=1                                      → everything the account keeps, as one JSON download
//   POST {act:'save', record, title?, note?, key?}      → {id}   (a run record without input data; X-CSRF header)
//   POST {act:'update', id, title, note}                → {ok}
//   POST {act:'delete', kind:'result'|'interpretation', id} → {ok}
//   POST {act:'delete-all'}                             → {ok}   (saved results and interpretations; the account stays)
// Limits: 200 saved results, 20 MB in all, 2 MB per record (private config can change them), 10 saves a minute.
declare(strict_types=1);
require __DIR__ . '/../inc/account.php';

$c = fb_config();
if (!$c) fb_json(['error' => 'not-configured'], 503);
$u = fb_user();
if (!$u) fb_json(['error' => 'signin'], 401);
if ($u['status'] !== 'approved') fb_json(['error' => $u['status'] === 'blocked' ? 'blocked' : 'pending'], 403);
$db = fb_db(); $me = $u['orcid'];

function fb_title(string $s, int $n): string { $s = trim(preg_replace('/\s+/u', ' ', $s)); return function_exists('mb_substr') ? mb_substr($s, 0, $n) : substr($s, 0, $n); }

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (($_GET['list'] ?? '') === 'results') {
        $st = $db->prepare('SELECT r.id, r.tool, r.version, r.title, r.note, r.created, r.size, (SELECT COUNT(*) FROM interpretations i WHERE i.result_id = r.id AND i.orcid = r.orcid) AS interpretations FROM results r WHERE r.orcid = ? ORDER BY r.created DESC');
        $st->execute([$me]); fb_json(['items' => $st->fetchAll(), 'storage' => fb_storage($me)]);
    }
    if (($_GET['list'] ?? '') === 'interpretations') {
        $st = $db->prepare('SELECT id, tool, version, model, result_id, created, size, substr(text, 1, 240) AS excerpt FROM interpretations WHERE orcid = ? ORDER BY created DESC');
        $st->execute([$me]); fb_json(['items' => $st->fetchAll(), 'storage' => fb_storage($me)]);
    }
    if (isset($_GET['result'])) {
        $st = $db->prepare('SELECT id, tool, version, title, note, created, size, body FROM results WHERE id = ? AND orcid = ?'); $st->execute([(string)$_GET['result'], $me]);
        $r = $st->fetch(); if (!$r) fb_json(['error' => 'not-found'], 404);
        $r['record'] = json_decode($r['body'], true); unset($r['body']);
        $st = $db->prepare('SELECT id, model, created FROM interpretations WHERE result_id = ? AND orcid = ? ORDER BY created DESC'); $st->execute([$r['id'], $me]);
        $r['interpretations'] = $st->fetchAll(); fb_json($r);
    }
    if (isset($_GET['interpretation'])) {
        $st = $db->prepare('SELECT id, tool, version, model, result_id, created, text, summary FROM interpretations WHERE id = ? AND orcid = ?'); $st->execute([(string)$_GET['interpretation'], $me]);
        $r = $st->fetch(); if (!$r) fb_json(['error' => 'not-found'], 404);
        $r['summary'] = json_decode($r['summary'], true); fb_json($r);
    }
    if (isset($_GET['export'])) {
        $a = $db->prepare('SELECT orcid, name, status, created, last_seen FROM users WHERE orcid = ?'); $a->execute([$me]);
        $r = $db->prepare('SELECT id, tool, version, title, note, created, body FROM results WHERE orcid = ? ORDER BY created'); $r->execute([$me]);
        $i = $db->prepare('SELECT id, tool, version, model, result_id, created, text, summary FROM interpretations WHERE orcid = ? ORDER BY created'); $i->execute([$me]);
        $g = $db->prepare('SELECT month, n FROM usage WHERE orcid = ? ORDER BY month'); $g->execute([$me]);
        $out = ['format' => 'forest-biometry-account-export/1', 'exported' => gmdate('c'), 'account' => $a->fetch(), 'usage' => $g->fetchAll(),
            'results' => array_map(function ($x) { $x['record'] = json_decode($x['body'], true); unset($x['body']); return $x; }, $r->fetchAll()),
            'interpretations' => array_map(function ($x) { $x['summary'] = json_decode($x['summary'], true); return $x; }, $i->fetchAll())];
        header('Content-Disposition: attachment; filename="forest-biometry-account-' . gmdate('Y-m-d') . '.json"');
        fb_json($out);
    }
    fb_json(['error' => 'bad-request'], 400);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') fb_json(['error' => 'method'], 405);
if (!fb_csrf_ok($_SERVER['HTTP_X_CSRF'] ?? null)) fb_json(['error' => 'token'], 403);
$raw = file_get_contents('php://input', false, null, 0, (int)$c['max_record_bytes'] + 4096);
if ($raw === false || strlen($raw) > (int)$c['max_record_bytes'] + 4096) fb_json(['error' => 'too-large', 'storage' => fb_storage($me)], 413);
$in = json_decode($raw, true);
if (!is_array($in)) fb_json(['error' => 'bad-request'], 400);
$act = (string)($in['act'] ?? '');

if ($act === 'save') {
    $rec = $in['record'] ?? null;
    if (!is_array($rec) || ($rec['format'] ?? '') !== 'run-record/1' || !isset($rec['tool']['id']) || !is_string($rec['tool']['id'])) fb_json(['error' => 'not-a-record'], 400);
    if (fb_has_raw_data($rec)) fb_json(['error' => 'raw-data'], 422);
    $body = json_encode($rec, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $s = fb_storage($me);
    if (strlen($body) > $s['maxRecord']) fb_json(['error' => 'too-large', 'storage' => $s], 413);
    if ($s['results'] >= $s['maxResults'] || $s['bytes'] + strlen($body) > $s['maxBytes']) fb_json(['error' => 'storage-full', 'storage' => $s], 409);
    $st = $db->prepare('SELECT COUNT(*) FROM results WHERE orcid = ? AND created > ?'); $st->execute([$me, gmdate('c', time() - 60)]);
    if ((int)$st->fetchColumn() >= 10) fb_json(['error' => 'rate'], 429);
    $tool = substr($rec['tool']['id'], 0, 60); $ver = substr((string)($rec['tool']['version'] ?? ''), 0, 40);
    $title = fb_title((string)($in['title'] ?? ''), 160);
    if ($title === '') $title = $tool . ' · ' . gmdate('Y-m-d H:i');
    $key = substr((string)($in['key'] ?? ''), 0, 80); $id = fb_id();
    $db->prepare('INSERT INTO results (id, orcid, tool, version, title, note, skey, created, size, body) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute([$id, $me, $tool, $ver, $title, fb_title((string)($in['note'] ?? ''), 2000), $key, gmdate('c'), strlen($body), $body]);
    if ($key !== '') $db->prepare('UPDATE interpretations SET result_id = ? WHERE orcid = ? AND tool = ? AND skey = ? AND result_id IS NULL')->execute([$id, $me, $tool, $key]);
    fb_json(['id' => $id, 'storage' => fb_storage($me)]);
}
if ($act === 'update') {
    $title = fb_title((string)($in['title'] ?? ''), 160);
    if ($title === '') fb_json(['error' => 'title'], 400);
    $st = $db->prepare('UPDATE results SET title = ?, note = ? WHERE id = ? AND orcid = ?'); $st->execute([$title, fb_title((string)($in['note'] ?? ''), 2000), (string)($in['id'] ?? ''), $me]);
    fb_json($st->rowCount() ? ['ok' => true] : ['error' => 'not-found'], $st->rowCount() ? 200 : 404);
}
if ($act === 'delete') {
    $kind = (string)($in['kind'] ?? ''); $id = (string)($in['id'] ?? '');
    if ($kind === 'result') {
        $st = $db->prepare('DELETE FROM results WHERE id = ? AND orcid = ?'); $st->execute([$id, $me]);
        $db->prepare('UPDATE interpretations SET result_id = NULL WHERE result_id = ? AND orcid = ?')->execute([$id, $me]);   // the interpretations stay, unlinked
    } elseif ($kind === 'interpretation') {
        $st = $db->prepare('DELETE FROM interpretations WHERE id = ? AND orcid = ?'); $st->execute([$id, $me]);
    } else fb_json(['error' => 'bad-request'], 400);
    fb_json($st->rowCount() ? ['ok' => true, 'storage' => fb_storage($me)] : ['error' => 'not-found'], $st->rowCount() ? 200 : 404);
}
if ($act === 'delete-all') {
    $db->prepare('DELETE FROM results WHERE orcid = ?')->execute([$me]);
    $db->prepare('DELETE FROM interpretations WHERE orcid = ?')->execute([$me]);
    fb_json(['ok' => true, 'storage' => fb_storage($me)]);
}
fb_json(['error' => 'bad-request'], 400);
