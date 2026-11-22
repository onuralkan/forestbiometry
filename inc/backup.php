<?php
// Backup of the accounts database (22 Nov 2026, user decision: the host's cPanel backup does not cover the private
// folder). Run nightly by a cPanel cron job:
//     php /home/<user>/public_html/inc/backup.php
// It writes a consistent copy of <private>/fb.sqlite to <private>/backups/fb-YYYY-MM-DD.sqlite.gz, keeps the newest 30
// copies, and applies the retention rule (accounts not seen for 24 months are deleted). Not reachable over the web
// (inc/.htaccess denies the folder, and the script refuses to run outside the command line unless included by
// hesap.php for the administrator's download).
declare(strict_types=1);
require_once __DIR__ . '/account.php';

/** Writes one backup and returns its path; keeps the newest $keep copies. */
function fb_backup(int $keep = 30): string {
    $dir = fb_private_dir() . '/backups';
    if (!is_dir($dir) && !mkdir($dir, 0700, true)) throw new RuntimeException('cannot create ' . $dir);
    $db = fb_db();
    $tmp = $dir . '/.fb-' . bin2hex(random_bytes(4)) . '.sqlite';
    try {
        $db->exec('VACUUM INTO ' . $db->quote($tmp));               // SQLite 3.27+: a consistent copy while others read
    } catch (Throwable $e) {                                         // older SQLite: copy the file under a write lock
        $db->exec('BEGIN IMMEDIATE');
        try { if (!copy(fb_private_dir() . '/fb.sqlite', $tmp)) throw new RuntimeException('copy failed'); }
        finally { $db->exec('COMMIT'); }
    }
    $out = $dir . '/fb-' . gmdate('Y-m-d') . '.sqlite.gz';
    $gz = gzencode((string)file_get_contents($tmp), 9);
    unlink($tmp);
    if ($gz === false || file_put_contents($out, $gz, LOCK_EX) === false) throw new RuntimeException('cannot write ' . $out);
    chmod($out, 0600);
    $all = glob($dir . '/fb-*.sqlite.gz') ?: [];
    rsort($all);
    foreach (array_slice($all, $keep) as $old) unlink($old);
    return $out;
}

if (PHP_SAPI === 'cli' && realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    if (!fb_config()) { fwrite(STDERR, "backup: the service is not configured (no " . fb_private_dir() . "/config.php)\n"); exit(1); }
    try {
        $f = fb_backup();
        $n = fb_purge(true);
        echo 'backup: ' . $f . ' (' . filesize($f) . " bytes)" . ($n ? "; $n inactive account(s) deleted" : '') . "\n";
    } catch (Throwable $e) { fwrite(STDERR, 'backup failed: ' . $e->getMessage() . "\n"); exit(1); }
}
