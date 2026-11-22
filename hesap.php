<?php
// Account pages (21–22 Nov 2026, user decisions): sign in with ORCID; tabs Profile (state, use, storage, export, delete),
// Interpretations and Saved results (the account's library, api/library.php keeps the same rules), and for the
// administrator Accounts (approve / block, storage per account, database backup). Server-rendered forms, no script needed.
declare(strict_types=1);
require __DIR__ . '/inc/account.php';

$c = fb_config();
$ID = '~^[0-9a-f]{24}$~';
if ($c && isset($_GET['backup'])) {                      // administrator: the newest backup, else a fresh copy of the database
    $u = fb_user();
    if (!$u || !$u['admin']) { http_response_code(403); exit; }
    $files = glob(fb_private_dir() . '/backups/fb-*.sqlite.gz') ?: [];
    rsort($files);
    $f = $files[0] ?? null;
    if (!$f) { require __DIR__ . '/inc/backup.php'; $f = fb_backup(); }
    header('Content-Type: application/gzip'); header('Content-Disposition: attachment; filename="' . basename($f) . '"'); header('Cache-Control: no-store');
    readfile($f); exit;
}
if ($c && isset($_GET['download']) && preg_match($ID, (string)$_GET['download'])) {   // one saved result as its run record
    $u = fb_user();
    if (!$u) { http_response_code(403); exit; }
    $st = fb_db()->prepare('SELECT tool, created, body FROM results WHERE id = ? AND orcid = ?'); $st->execute([$_GET['download'], $u['orcid']]);
    $r = $st->fetch(); if (!$r) { http_response_code(404); exit; }
    header('Content-Type: application/json; charset=utf-8'); header('Content-Disposition: attachment; filename="' . $r['tool'] . '-' . substr($r['created'], 0, 10) . '.json"');
    echo json_encode(json_decode($r['body'], true), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); exit;
}
if ($c && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $u = fb_user();
    if (!$u || !fb_csrf_ok($_POST['csrf'] ?? null)) { http_response_code(403); exit('The form expired. Reload the page and try again.'); }
    $act = (string)($_POST['act'] ?? ''); $db = fb_db(); $me = $u['orcid']; $id = (string)($_POST['id'] ?? '');
    if ($act === 'delete') { fb_delete_account($me); fb_sign_out(); header('Location: hesap.php?deleted=1'); exit; }
    if ($act === 'delete-library') {
        $db->prepare('DELETE FROM results WHERE orcid = ?')->execute([$me]); $db->prepare('DELETE FROM interpretations WHERE orcid = ?')->execute([$me]);
        header('Location: hesap.php?done=library'); exit;
    }
    if ($act === 'del-result' && preg_match($ID, $id)) {
        $db->prepare('DELETE FROM results WHERE id = ? AND orcid = ?')->execute([$id, $me]);
        $db->prepare('UPDATE interpretations SET result_id = NULL WHERE result_id = ? AND orcid = ?')->execute([$id, $me]);
        header('Location: hesap.php?tab=results&done=deleted'); exit;
    }
    if ($act === 'del-interp' && preg_match($ID, $id)) {
        $db->prepare('DELETE FROM interpretations WHERE id = ? AND orcid = ?')->execute([$id, $me]);
        header('Location: hesap.php?tab=interpretations&done=deleted'); exit;
    }
    if ($act === 'edit-result' && preg_match($ID, $id)) {
        $t = trim(preg_replace('/\s+/u', ' ', (string)($_POST['title'] ?? '')));
        if ($t !== '') $db->prepare('UPDATE results SET title = ?, note = ? WHERE id = ? AND orcid = ?')
            ->execute([mb_substr($t, 0, 160), mb_substr(trim((string)($_POST['note'] ?? '')), 0, 2000), $id, $me]);
        header('Location: hesap.php?tab=results&id=' . $id . '&done=saved'); exit;
    }
    if ($u['admin'] && in_array($act, ['approved', 'blocked', 'pending'], true) && preg_match('~^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$~', (string)($_POST['orcid'] ?? ''))
        && $_POST['orcid'] !== $me) {
        $db->prepare('UPDATE users SET status = ?, decided = ? WHERE orcid = ?')->execute([$act, gmdate('c'), $_POST['orcid']]);
        header('Location: hesap.php?tab=accounts'); exit;
    }
    header('Location: hesap.php'); exit;
}

require __DIR__ . '/inc/site.php';
$u = $c ? fb_user() : null;
$tab = $u ? (string)($_GET['tab'] ?? 'profile') : 'profile';
if (!in_array($tab, ['profile', 'interpretations', 'results', 'accounts'], true) || ($tab === 'accounts' && !$u['admin'])) $tab = 'profile';
site_top(['title' => 'Account', 'desc' => 'Sign in with ORCID for the AI interpretation of results and to keep results in your account. Calculations stay in your browser; raw data are never sent.', 'robots' => 'noindex']);
$status = ['pending' => 'Waiting for approval', 'approved' => 'Approved', 'blocked' => 'Blocked'];
$toolName = []; foreach (site_tools() as $t) $toolName[basename($t['file'], '.php')] = $t['title'];
$tn = function ($id) use ($toolName) { return $toolName[$id] ?? $id; };
$when = function ($iso) { return h(str_replace('T', ' ', substr((string)$iso, 0, 16))) . ' UTC'; };
$mb = function ($b) { return $b <= 0 ? '0 kB' : ($b >= 1e6 ? number_format($b / 1e6, 1) . ' MB' : number_format(max(1, $b / 1e3), 0) . ' kB'); };
/** The model's plain text: headings on their own line, paragraphs; escaped. */
function acc_text(string $t): string {
    $out = '';
    foreach (preg_split('/\n\s*\n/', trim($t)) as $block) {
        $lines = array_values(array_filter(array_map('trim', explode("\n", $block)), 'strlen'));
        if (!$lines) continue;
        $first = trim(str_replace('**', '', preg_replace('/^#+\s*/', '', $lines[0])));
        if (preg_match('/^(summary|comparison|uncertainty|limits):?$/i', $first)) { $out .= '<h4>' . h(rtrim($first, ':')) . '</h4>'; array_shift($lines); }
        if ($lines) $out .= '<p>' . implode('<br>', array_map(function ($x) { return h(str_replace('**', '', $x)); }, $lines)) . '</p>';
    }
    return $out;
}
$csrf = $u ? fb_csrf() : '';
$form = function ($act, $label, $extra = '', $cls = 'btn ghost small', $confirm = '') use ($csrf) {
    return '<form method="post" action="hesap.php" class="inline-form"' . ($confirm !== '' ? ' onsubmit="return confirm(' . h(json_encode($confirm)) . ');"' : '') . '><input type="hidden" name="csrf" value="' . h($csrf) . '"><input type="hidden" name="act" value="' . h($act) . '">' . $extra . '<button type="submit" class="' . $cls . '" data-act="' . h($act) . '">' . h($label) . '</button></form>';
};
?>
<?php if (!$c): ?>
  <section class="card about"><p class="note warn" id="acc-off">Accounts and the interpretation service are not available on this server yet.</p></section>
<?php elseif (!$u): ?>
  <section class="card about" aria-labelledby="h-acc">
    <h2 id="h-acc" class="b-h2">Account</h2>
    <?php if (isset($_GET['deleted'])): ?><p class="note ok" id="acc-deleted">Your account was deleted.</p><?php endif; ?>
    <?php if (($_GET['signin'] ?? '') === 'cancelled'): ?><p class="note warn">The sign-in was cancelled.</p><?php endif; ?>
    <p>An account lets you ask for an AI interpretation of results (Anthropic's Claude) and keep analysis results and interpretations on this site to open them again later. Calculations stay in your browser, and raw data (your tables and files) are never sent or stored. Sign in with ORCID; accounts are approved by the site's author. See the <a href="gizlilik.php">privacy notice</a>.</p>
    <p class="b-actions"><a class="btn" id="acc-signin" href="auth/orcid.php">Sign in with ORCID</a></p>
  </section>
<?php else: $used = fb_used($u['orcid']); $st = fb_storage($u['orcid']); ?>
  <nav class="tabs acc-tabs" aria-label="Account">
    <?php foreach (['profile' => 'Profile', 'interpretations' => 'Interpretations (' . $st['interpretations'] . ')', 'results' => 'Saved results (' . $st['results'] . ')'] + ($u['admin'] ? ['accounts' => 'Accounts'] : []) as $k => $l): ?>
    <a href="hesap.php?tab=<?= $k ?>" id="tab-<?= $k ?>"<?= $tab === $k ? ' aria-current="page"' : '' ?>><?= h($l) ?></a>
    <?php endforeach; ?>
  </nav>
<?php if ($tab === 'profile'): ?>
  <section class="card about" aria-labelledby="h-acc">
    <h2 id="h-acc" class="b-h2">Profile</h2>
    <?php if (($_GET['done'] ?? '') === 'library'): ?><p class="note ok" id="acc-libdel">Your saved results and interpretations were deleted.</p><?php endif; ?>
    <dl class="kv" id="acc-info">
      <dt>Name</dt><dd><?= h($u['name']) ?></dd>
      <dt>ORCID</dt><dd><a href="https://orcid.org/<?= h($u['orcid']) ?>">https://orcid.org/<?= h($u['orcid']) ?></a></dd>
      <dt>State</dt><dd id="acc-status"><?= h($status[$u['status']] ?? $u['status']) ?><?= $u['admin'] ? ' (administrator)' : '' ?></dd>
      <dt>Interpretations</dt><dd id="acc-used"><?= $used ?> of <?= (int)$c['monthly_quota'] ?> interpretations used this month</dd>
      <dt>Storage</dt><dd id="acc-storage"><?= $st['results'] ?> of <?= $st['maxResults'] ?> saved results, <?= $st['interpretations'] ?> interpretations; <?= $mb($st['bytes']) ?> of <?= $mb($st['maxBytes']) ?></dd>
    </dl>
    <?php if ($u['status'] === 'pending'): ?><p class="note" id="acc-pending">Your account is waiting for approval. You can use every tool meanwhile; interpretations and saving results work once the account is approved.</p><?php endif; ?>
    <p class="muted small">Saved results and interpretations stay until you delete them. An account not signed in for 24 months is deleted with everything it keeps.</p>
    <div class="b-actions">
      <a class="btn ghost" href="api/library.php?export=1" id="acc-export">Download all my data (JSON)</a>
      <form method="post" action="auth/logout.php" class="inline-form"><input type="hidden" name="csrf" value="<?= h($csrf) ?>"><button type="submit" class="btn ghost" id="acc-signout">Sign out</button></form>
    </div>
    <div class="b-actions acc-danger">
      <?= $form('delete-library', 'Delete my saved results and interpretations', '', 'btn ghost', 'Delete every saved result and interpretation of your account? This cannot be undone.') ?>
      <?= str_replace('data-act="delete"', 'data-act="delete" id="acc-delete"', $form('delete', 'Delete my account', '', 'btn danger', 'Delete your account? Your ORCID iD, name, usage counts, saved results and interpretations are removed from the server. This cannot be undone.')) ?>
    </div>
  </section>
<?php elseif ($tab === 'interpretations'):
  $id = (string)($_GET['id'] ?? '');
  if (preg_match($ID, $id)) { $q = fb_db()->prepare('SELECT * FROM interpretations WHERE id = ? AND orcid = ?'); $q->execute([$id, $u['orcid']]); $it = $q->fetch(); } else $it = null; ?>
  <section class="card about" aria-labelledby="h-int">
  <?php if ($it): ?>
    <p class="small"><a href="hesap.php?tab=interpretations">← All interpretations</a></p>
    <h2 id="h-int" class="b-h2">Interpretation: <?= h($tn($it['tool'])) ?></h2>
    <p class="muted small"><?= $when($it['created']) ?> · <?= h($it['tool']) ?> <?= h($it['version']) ?> · <?= h($it['model']) ?><?php if ($it['result_id']): ?> · <a href="hesap.php?tab=results&amp;id=<?= h($it['result_id']) ?>" id="int-result">saved result</a><?php endif; ?></p>
    <div class="ai-text" id="int-text"><?= acc_text($it['text']) ?></div>
    <p class="muted small">Written by a language model from the result summary below; check it against the numbers.</p>
    <details><summary>Result summary it was written from</summary><pre class="json"><?= h(json_encode(json_decode($it['summary'], true), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) ?></pre></details>
    <div class="b-actions"><?= $form('del-interp', 'Delete this interpretation', '<input type="hidden" name="id" value="' . h($it['id']) . '">', 'btn ghost', 'Delete this interpretation?') ?></div>
  <?php else:
    $q = fb_db()->prepare('SELECT id, tool, version, model, result_id, created, substr(text, 1, 400) AS ex FROM interpretations WHERE orcid = ? ORDER BY created DESC'); $q->execute([$u['orcid']]); $rows = $q->fetchAll(); ?>
    <h2 id="h-int" class="b-h2">Interpretations</h2>
    <?php if (($_GET['done'] ?? '') === 'deleted'): ?><p class="note ok">The interpretation was deleted.</p><?php endif; ?>
    <p class="muted small">Every interpretation you ask for is kept here with the result summary it was written from.</p>
    <?php if (!$rows): ?><p id="int-none">No interpretations yet. Tools that offer one show an "AI interpretation" card with their results.</p><?php else: ?>
    <ul class="acc-list" id="int-list">
      <?php foreach ($rows as $r): $ex = trim(preg_replace('/^(summary|comparison|uncertainty|limits):?\s*/im', '', preg_replace('/\s+/', ' ', $r['ex']))); ?>
      <li data-id="<?= h($r['id']) ?>"><a href="hesap.php?tab=interpretations&amp;id=<?= h($r['id']) ?>"><b><?= h($tn($r['tool'])) ?></b></a> <span class="muted small"><?= $when($r['created']) ?><?= $r['result_id'] ? ' · linked to a saved result' : '' ?></span>
        <p class="small"><?= h(mb_substr($ex, 0, 220)) ?>…</p></li>
      <?php endforeach; ?>
    </ul>
    <?php endif; ?>
  <?php endif; ?>
  </section>
<?php elseif ($tab === 'results'):
  $id = (string)($_GET['id'] ?? '');
  if (preg_match($ID, $id)) { $q = fb_db()->prepare('SELECT * FROM results WHERE id = ? AND orcid = ?'); $q->execute([$id, $u['orcid']]); $it = $q->fetch(); } else $it = null; ?>
  <section class="card about" aria-labelledby="h-res">
  <?php if ($it): $rec = json_decode($it['body'], true);
    $q = fb_db()->prepare('SELECT id, created, model FROM interpretations WHERE result_id = ? AND orcid = ? ORDER BY created DESC'); $q->execute([$it['id'], $u['orcid']]); $ints = $q->fetchAll(); ?>
    <p class="small"><a href="hesap.php?tab=results">← All saved results</a></p>
    <h2 id="h-res" class="b-h2"><?= h($it['title']) ?></h2>
    <?php if (($_GET['done'] ?? '') === 'saved'): ?><p class="note ok">Saved.</p><?php endif; ?>
    <p class="muted small"><?= h($tn($it['tool'])) ?> <?= h($it['version']) ?> · saved <?= $when($it['created']) ?> · <?= $mb((int)$it['size']) ?><?php if (!empty($rec['created'])): ?> · computed <?= $when($rec['created']) ?><?php endif; ?></p>
    <form method="post" action="hesap.php" class="acc-edit"><input type="hidden" name="csrf" value="<?= h($csrf) ?>"><input type="hidden" name="act" value="edit-result"><input type="hidden" name="id" value="<?= h($it['id']) ?>">
      <label>Title <input type="text" name="title" maxlength="160" value="<?= h($it['title']) ?>" required id="res-title"></label>
      <label>Note <textarea name="note" rows="3" maxlength="2000" id="res-note"><?= h($it['note']) ?></textarea></label>
      <button type="submit" class="btn ghost small" id="res-save">Save title and note</button></form>
    <?php if ($ints): ?><h3>Interpretations of this result</h3><ul id="res-ints"><?php foreach ($ints as $x): ?><li><a href="hesap.php?tab=interpretations&amp;id=<?= h($x['id']) ?>"><?= $when($x['created']) ?></a> <span class="muted small"><?= h($x['model']) ?></span></li><?php endforeach; ?></ul><?php endif; ?>
    <details open><summary>Result (run record)</summary><pre class="json" id="res-body"><?= h(json_encode($rec, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) ?></pre></details>
    <p class="muted small">Inputs are listed by their fingerprints (SHA-256) only: the record can be checked in the <a href="kayit-dogrulayici.php">Record Verifier</a> against your own files.</p>
    <div class="b-actions"><a class="btn ghost" href="hesap.php?download=<?= h($it['id']) ?>" id="res-download">Download the run record (JSON)</a>
      <?= $form('del-result', 'Delete this result', '<input type="hidden" name="id" value="' . h($it['id']) . '">', 'btn ghost', 'Delete this saved result? Its interpretations stay, unlinked.') ?></div>
  <?php else:
    $q = fb_db()->prepare('SELECT r.id, r.tool, r.version, r.title, r.note, r.created, r.size, (SELECT COUNT(*) FROM interpretations i WHERE i.result_id = r.id AND i.orcid = r.orcid) AS n FROM results r WHERE r.orcid = ? ORDER BY r.created DESC'); $q->execute([$u['orcid']]); $rows = $q->fetchAll(); ?>
    <h2 id="h-res" class="b-h2">Saved results</h2>
    <?php if (($_GET['done'] ?? '') === 'deleted'): ?><p class="note ok">The result was deleted.</p><?php endif; ?>
    <p class="muted small">Results you saved with "Save to my account" next to a tool's "Run record (JSON)" button: the tool's settings and result tables, without input data. <?= $st['results'] ?> of <?= $st['maxResults'] ?>; <?= $mb($st['bytes']) ?> of <?= $mb($st['maxBytes']) ?> used.</p>
    <?php if (!$rows): ?><p id="res-none">No saved results yet.</p><?php else: ?>
    <div class="tscroll"><table class="grid" id="res-list"><thead><tr><th>Title</th><th>Tool</th><th>Saved</th><th>Size</th><th>Interpretations</th></tr></thead><tbody>
      <?php foreach ($rows as $r): ?><tr data-id="<?= h($r['id']) ?>"><td><a href="hesap.php?tab=results&amp;id=<?= h($r['id']) ?>"><?= h($r['title']) ?></a><?= $r['note'] !== '' ? '<br><span class="muted small">' . h(mb_substr($r['note'], 0, 120)) . '</span>' : '' ?></td>
        <td><?= h($tn($r['tool'])) ?> <span class="muted small"><?= h($r['version']) ?></span></td><td class="small"><?= $when($r['created']) ?></td><td class="num"><?= $mb((int)$r['size']) ?></td><td class="num"><?= (int)$r['n'] ?></td></tr><?php endforeach; ?>
    </tbody></table></div>
    <?php endif; ?>
  <?php endif; ?>
  </section>
<?php elseif ($tab === 'accounts'):
  $rows = fb_db()->query("SELECT u.orcid, u.name, u.status, u.created, u.last_seen, COALESCE(g.n, 0) AS used,
      (SELECT COUNT(*) FROM results r WHERE r.orcid = u.orcid) AS nres, (SELECT COALESCE(SUM(size), 0) FROM results r WHERE r.orcid = u.orcid) + (SELECT COALESCE(SUM(size), 0) FROM interpretations i WHERE i.orcid = u.orcid) AS bytes
      FROM users u LEFT JOIN usage g ON g.orcid = u.orcid AND g.month = '" . fb_month() . "' ORDER BY CASE u.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, u.created DESC")->fetchAll();
  $bk = glob(fb_private_dir() . '/backups/fb-*.sqlite.gz') ?: []; rsort($bk); ?>
  <section class="card about" aria-labelledby="accounts">
    <h2 id="accounts" class="b-h2">Accounts</h2>
    <div class="tscroll"><table class="grid" id="acc-list"><thead><tr><th>Name</th><th>ORCID</th><th>Signed up</th><th>Last seen</th><th>State</th><th>This month</th><th>Saved</th><th></th></tr></thead><tbody>
    <?php foreach ($rows as $r): ?>
      <tr data-orcid="<?= h($r['orcid']) ?>"><td><?= h($r['name']) ?></td><td><a href="https://orcid.org/<?= h($r['orcid']) ?>"><?= h($r['orcid']) ?></a></td><td class="small"><?= h(substr($r['created'], 0, 10)) ?></td><td class="small"><?= h(substr((string)$r['last_seen'], 0, 10)) ?></td>
        <td><?= h($status[$r['status']] ?? $r['status']) ?></td><td class="num"><?= (int)$r['used'] ?></td><td class="num"><?= (int)$r['nres'] ?> · <?= $mb((int)$r['bytes']) ?></td>
        <td><?php if ($r['orcid'] !== $u['orcid']): foreach (['approved' => 'Approve', 'blocked' => 'Block', 'pending' => 'Set pending'] as $a => $l): if ($a === $r['status']) continue;
          echo $form($a, $l, '<input type="hidden" name="orcid" value="' . h($r['orcid']) . '">'); endforeach; endif; ?></td></tr>
    <?php endforeach; ?>
    </tbody></table></div>
    <h3>Backup</h3>
    <p class="small" id="acc-backup">The database is copied every night by the server's cron job (<code>inc/backup.php</code>; the last 30 copies are kept next to the database). <?= $bk ? 'Newest copy: ' . h(basename($bk[0])) . '.' : 'No copy yet: set up the cron job (see PROJECT.md §3).' ?> Download a copy now and then to keep one off the server.</p>
    <p class="b-actions"><a class="btn ghost" href="hesap.php?backup=1" id="acc-bkdl">Download the newest backup</a></p>
  </section>
<?php endif; ?>
<?php endif; ?>
<?php site_bottom();
