<?php
// Accounts (21 Nov 2026, user decision; exception to PLATFORM_PLAN P1): sign in with ORCID only, accounts approved by
// the administrator, a monthly quota of AI interpretations per account. Data policy (22 Nov 2026, user decision): the
// calculations stay in the browser and raw data (tables, files, a run record's embedded input data) are never sent or
// kept; the server keeps the account (ORCID iD, name, status, usage counts) and, for approved accounts, the analysis
// results the owner saves (run records without input data) and the interpretations asked for, until the owner deletes
// them or the account is inactive for 24 months. api/library.php and hesap.php serve them, only to their owner.
//
// Private files live OUTSIDE the web root (never in the repository, never touched by the deploy script):
//   <private>/config.php   returns the settings array (template: scripts/private-config.example.php)
//   <private>/fb.sqlite    accounts, usage, saved results and interpretations (created on first use)
//   <private>/backups/     nightly copies by inc/backup.php (cron)
// <private> is the FB_PRIVATE environment variable, else <parent of the document root>/forestbiometry-private.
declare(strict_types=1);

const FB_SESSION = 'fbsess';

if (!function_exists('mb_substr')) {   // hosts without mbstring: cut by UTF-8 characters
    function mb_substr(string $s, int $start, ?int $n = null): string { return implode('', array_slice(preg_split('//u', $s, -1, PREG_SPLIT_NO_EMPTY) ?: [], $start, $n)); }
}

function fb_private_dir(): string {
    $env = getenv('FB_PRIVATE');
    if ($env !== false && $env !== '') return rtrim($env, '/');
    // on the command line (cron: inc/backup.php) DOCUMENT_ROOT is an empty string, not missing: use the site folder
    $doc = (string)($_SERVER['DOCUMENT_ROOT'] ?? '');
    $root = rtrim($doc !== '' ? $doc : dirname(__DIR__), '/');
    return dirname($root) . '/forestbiometry-private';
}

/** Settings, or null when the service is not configured on this server (then every page works as before). */
function fb_config(): ?array {
    static $c = false;
    if ($c !== false) return $c;
    $f = fb_private_dir() . '/config.php';
    if (!is_file($f)) return $c = null;
    // a broken config (e.g. a missing quote) must never take the site down: the service is then simply off
    try { $v = require $f; } catch (Throwable $e) { error_log('forestbiometry: private config unreadable: ' . $e->getMessage()); return $c = null; }
    if (!is_array($v)) return $c = null;
    $c = $v + [
        'anthropic_key' => '', 'anthropic_model' => 'claude-opus-5-5', 'anthropic_version' => '2023-06-01', 'anthropic_mock' => false,
        'orcid_client_id' => '', 'orcid_client_secret' => '', 'orcid_base' => 'https://orcid.org', 'orcid_mock' => false,
        'admin_orcid' => '', 'monthly_quota' => 30, 'per_minute' => 3, 'max_request_bytes' => 60000, 'max_output_tokens' => 3000,
        'max_results' => 200, 'max_storage_bytes' => 20000000, 'max_record_bytes' => 2000000,
    ];
    return $c;
}

function fb_db(): PDO {
    static $db = null;
    if ($db) return $db;
    $db = new PDO('sqlite:' . fb_private_dir() . '/fb.sqlite', null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    $db->exec('PRAGMA busy_timeout = 3000');
    $db->exec('CREATE TABLE IF NOT EXISTS users (orcid TEXT PRIMARY KEY, name TEXT NOT NULL, status TEXT NOT NULL, created TEXT NOT NULL, decided TEXT)');
    $db->exec('CREATE TABLE IF NOT EXISTS usage (orcid TEXT NOT NULL, month TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (orcid, month))');
    $db->exec('CREATE TABLE IF NOT EXISTS recent (orcid TEXT NOT NULL, at INTEGER NOT NULL)');
    // saved analysis results and interpretations (22 Nov 2026, user decision: the server may keep results, never raw data)
    $db->exec('CREATE TABLE IF NOT EXISTS results (id TEXT PRIMARY KEY, orcid TEXT NOT NULL, tool TEXT NOT NULL, version TEXT, title TEXT NOT NULL, note TEXT NOT NULL, skey TEXT, created TEXT NOT NULL, size INTEGER NOT NULL, body TEXT NOT NULL)');
    $db->exec('CREATE INDEX IF NOT EXISTS results_owner ON results (orcid, created)');
    $db->exec('CREATE TABLE IF NOT EXISTS interpretations (id TEXT PRIMARY KEY, orcid TEXT NOT NULL, tool TEXT NOT NULL, version TEXT, model TEXT, skey TEXT, result_id TEXT, created TEXT NOT NULL, size INTEGER NOT NULL, text TEXT NOT NULL, summary TEXT NOT NULL)');
    $db->exec('CREATE INDEX IF NOT EXISTS interp_owner ON interpretations (orcid, created)');
    $db->exec('CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT)');
    $cols = array_column($db->query('PRAGMA table_info(users)')->fetchAll(), 'name');
    if (!in_array('last_seen', $cols, true)) $db->exec('ALTER TABLE users ADD COLUMN last_seen TEXT');
    return $db;
}

/** Starts the session only when needed (signing in) or when the visitor already has one: no cookie for anonymous visitors. */
function fb_session(bool $create = false): bool {
    if (session_status() === PHP_SESSION_ACTIVE) return true;
    if (!$create && !isset($_COOKIE[FB_SESSION])) return false;
    if (headers_sent()) return false;
    $https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    session_name(FB_SESSION);
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Lax']);
    session_start();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
    return true;
}

/** The signed-in account { orcid, name, status, admin } or null. Status: pending | approved | blocked. */
function fb_user(): ?array {
    if (!fb_config() || !fb_session() || empty($_SESSION['orcid'])) return null;
    $st = fb_db()->prepare('SELECT orcid, name, status FROM users WHERE orcid = ?');
    $st->execute([$_SESSION['orcid']]);
    $u = $st->fetch();
    if (!$u) return null;
    $u['admin'] = $u['orcid'] === fb_config()['admin_orcid'];
    if ($u['admin']) $u['status'] = 'approved';
    fb_touch($u['orcid']);
    return $u;
}

/** Marks the account as seen today (once a day) and, once a day, runs the retention rule. */
function fb_touch(string $orcid): void {
    static $done = false;
    if ($done) return; $done = true;
    $day = gmdate('Y-m-d');
    if (($_SESSION['seen'] ?? '') !== $day) {
        fb_db()->prepare('UPDATE users SET last_seen = ? WHERE orcid = ?')->execute([gmdate('c'), $orcid]);
        $_SESSION['seen'] = $day;
    }
    fb_purge();
}

/**
 * Retention (22 Nov 2026, user decision): an account not signed in for 24 months is deleted with everything it saved.
 * Runs at most once a day; the administrator is never deleted. → number of accounts deleted.
 */
function fb_purge(bool $force = false): int {
    $db = fb_db(); $day = gmdate('Y-m-d');
    $st = $db->prepare("SELECT v FROM meta WHERE k = 'purged'"); $st->execute();
    if (!$force && $st->fetchColumn() === $day) return 0;
    $db->prepare("INSERT OR REPLACE INTO meta (k, v) VALUES ('purged', ?)")->execute([$day]);
    $cut = gmdate('c', strtotime('-24 months'));
    $st = $db->prepare('SELECT orcid FROM users WHERE COALESCE(last_seen, created) < ? AND orcid <> ?');
    $st->execute([$cut, (string)fb_config()['admin_orcid']]);
    $old = $st->fetchAll(PDO::FETCH_COLUMN);
    foreach ($old as $o) fb_delete_account($o);
    return count($old);
}

/** Removes an account and everything it saved. */
function fb_delete_account(string $orcid): void {
    $db = fb_db();
    foreach (['results', 'interpretations', 'usage', 'recent', 'users'] as $t) $db->prepare("DELETE FROM $t WHERE orcid = ?")->execute([$orcid]);
}

/** Random, unguessable id of a saved item. */
function fb_id(): string { return bin2hex(random_bytes(12)); }

/** Bytes an account keeps on the server (saved results and interpretations). */
function fb_storage(string $orcid): array {
    $db = fb_db();
    $a = $db->prepare('SELECT COUNT(*) AS n, COALESCE(SUM(size), 0) AS b FROM results WHERE orcid = ?'); $a->execute([$orcid]); $r = $a->fetch();
    $b = $db->prepare('SELECT COUNT(*) AS n, COALESCE(SUM(size), 0) AS b FROM interpretations WHERE orcid = ?'); $b->execute([$orcid]); $i = $b->fetch();
    $c = fb_config();
    return ['results' => (int)$r['n'], 'interpretations' => (int)$i['n'], 'bytes' => (int)$r['b'] + (int)$i['b'],
        'maxResults' => (int)$c['max_results'], 'maxBytes' => (int)$c['max_storage_bytes'], 'maxRecord' => (int)$c['max_record_bytes']];
}

/** Saves an interpretation (automatic, 22 Nov 2026 user decision); links it to a saved result of the same summary. → id */
function fb_save_interpretation(string $orcid, string $tool, string $version, string $model, string $skey, string $text, string $summary): string {
    $db = fb_db(); $id = fb_id();
    $st = $db->prepare('SELECT id FROM results WHERE orcid = ? AND tool = ? AND skey = ? ORDER BY created DESC LIMIT 1'); $st->execute([$orcid, $tool, $skey]);
    $rid = $skey !== '' ? ($st->fetchColumn() ?: null) : null;
    $db->prepare('INSERT INTO interpretations (id, orcid, tool, version, model, skey, result_id, created, size, text, summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute([$id, $orcid, $tool, $version, $model, $skey, $rid, gmdate('c'), strlen($text) + strlen($summary), $text, $summary]);
    return $id;
}

/**
 * A run record is accepted only without raw data: no input may carry its data (the "include the input data" option of
 * the record writes it into inputs[].data). The fingerprints (sha256) of the inputs may stay.
 */
function fb_has_raw_data(array $rec): bool {
    foreach ((array)($rec['inputs'] ?? []) as $in) if (is_array($in) && array_key_exists('data', $in)) return true;
    return false;
}

function fb_csrf(): string { fb_session(true); return $_SESSION['csrf']; }
function fb_csrf_ok(?string $t): bool { return fb_session() && is_string($t) && hash_equals($_SESSION['csrf'] ?? '', $t); }

/** Signs an ORCID account in, creating it as pending on its first visit (the administrator is approved at once). */
function fb_sign_in(string $orcid, string $name): void {
    $db = fb_db();
    $now = gmdate('c');
    $admin = $orcid === fb_config()['admin_orcid'];
    $st = $db->prepare('INSERT OR IGNORE INTO users (orcid, name, status, created, decided) VALUES (?, ?, ?, ?, ?)');
    $st->execute([$orcid, $name, $admin ? 'approved' : 'pending', $now, $admin ? $now : null]);
    $db->prepare('UPDATE users SET name = ? WHERE orcid = ?')->execute([$name, $orcid]);
    fb_session(true);
    session_regenerate_id(true);
    $_SESSION['orcid'] = $orcid;
}

function fb_sign_out(): void {
    if (!fb_session()) return;
    $_SESSION = [];
    $p = session_get_cookie_params();
    setcookie(FB_SESSION, '', ['expires' => 1, 'path' => '/', 'secure' => $p['secure'], 'httponly' => true, 'samesite' => 'Lax']);
    session_destroy();
}

function fb_month(): string { return gmdate('Y-m'); }

function fb_used(string $orcid): int {
    $st = fb_db()->prepare('SELECT n FROM usage WHERE orcid = ? AND month = ?');
    $st->execute([$orcid, fb_month()]);
    return (int)($st->fetchColumn() ?: 0);
}

/** Usage state shown to the browser: no data beyond the account's own. */
function fb_state(): array {
    $c = fb_config();
    if (!$c) return ['configured' => false];
    $u = fb_user();
    if (!$u) return ['configured' => true, 'signedIn' => false];
    return ['configured' => true, 'signedIn' => true, 'name' => $u['name'], 'orcid' => $u['orcid'], 'status' => $u['status'], 'admin' => $u['admin'],
        'used' => fb_used($u['orcid']), 'quota' => (int)$c['monthly_quota'], 'csrf' => fb_csrf()];
}

/** Takes one interpretation from the account's monthly quota and the per-minute limit, atomically. → '' or an error code. */
function fb_take(string $orcid): string {
    $c = fb_config(); $db = fb_db(); $now = time();
    $db->exec('BEGIN IMMEDIATE');
    try {
        $db->prepare('DELETE FROM recent WHERE at < ?')->execute([$now - 60]);
        $st = $db->prepare('SELECT COUNT(*) FROM recent WHERE orcid = ?'); $st->execute([$orcid]);
        if ((int)$st->fetchColumn() >= (int)$c['per_minute']) { $db->exec('ROLLBACK'); return 'rate'; }
        if (fb_used($orcid) >= (int)$c['monthly_quota']) { $db->exec('ROLLBACK'); return 'quota'; }
        $db->prepare('INSERT INTO recent (orcid, at) VALUES (?, ?)')->execute([$orcid, $now]);
        // (no UPSERT: older SQLite builds on shared hosts lack it)
        $db->prepare('INSERT OR IGNORE INTO usage (orcid, month, n) VALUES (?, ?, 0)')->execute([$orcid, fb_month()]);
        $db->prepare('UPDATE usage SET n = n + 1 WHERE orcid = ? AND month = ?')->execute([$orcid, fb_month()]);
        $db->exec('COMMIT');
        return '';
    } catch (Throwable $e) { $db->exec('ROLLBACK'); throw $e; }
}

/** Gives the interpretation back when the model call failed (the user is not charged for an error). */
function fb_give_back(string $orcid): void {
    fb_db()->prepare('UPDATE usage SET n = MAX(n - 1, 0) WHERE orcid = ? AND month = ?')->execute([$orcid, fb_month()]);
}

function fb_json($v, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
