<?php
// Account page of the AI interpretation service: sign in with ORCID, account state and this month's use, sign out,
// delete the account; for the administrator the list of accounts with approve / block (21 Nov 2026, user decision).
declare(strict_types=1);
require __DIR__ . '/inc/account.php';

$c = fb_config();
$msg = '';
if ($c && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $u = fb_user();
    if (!$u || !fb_csrf_ok($_POST['csrf'] ?? null)) { http_response_code(403); exit('The form expired. Reload the page and try again.'); }
    $act = (string)($_POST['act'] ?? '');
    if ($act === 'delete') {
        $db = fb_db();
        $db->prepare('DELETE FROM usage WHERE orcid = ?')->execute([$u['orcid']]);
        $db->prepare('DELETE FROM recent WHERE orcid = ?')->execute([$u['orcid']]);
        $db->prepare('DELETE FROM users WHERE orcid = ?')->execute([$u['orcid']]);
        fb_sign_out();
        header('Location: hesap.php?deleted=1'); exit;
    }
    if ($u['admin'] && in_array($act, ['approved', 'blocked', 'pending'], true) && preg_match('~^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$~', (string)($_POST['orcid'] ?? ''))
        && $_POST['orcid'] !== $u['orcid']) {
        fb_db()->prepare('UPDATE users SET status = ?, decided = ? WHERE orcid = ?')->execute([$act, gmdate('c'), $_POST['orcid']]);
        header('Location: hesap.php#accounts'); exit;
    }
}

require __DIR__ . '/inc/site.php';
$u = $c ? fb_user() : null;
site_top(['title' => 'Account', 'desc' => 'Sign in with ORCID to use the AI interpretation of results. The calculations stay in your browser.', 'robots' => 'noindex']);
$status = ['pending' => 'Waiting for approval', 'approved' => 'Approved', 'blocked' => 'Blocked'];
?>
  <section class="card about" aria-labelledby="h-acc">
    <h2 id="h-acc" class="b-h2">AI interpretation of results</h2>
    <p>Some tools can write a short interpretation of their results with Anthropic's Claude model. The calculations stay in your browser; only when you ask for an interpretation does the tool send the summary of that result (settings and result tables, no row data) to the service. The text is written by a language model: check it against the numbers before you use it.</p>
    <p>The service needs an account: sign in with ORCID; accounts are approved by the site's author. Each account can ask for <?= $c ? (int)$c['monthly_quota'] : 30 ?> interpretations a month. See the <a href="gizlilik.php">privacy notice</a>.</p>
<?php if (!$c): ?>
    <p class="note warn" id="acc-off">The interpretation service is not available on this server yet.</p>
<?php elseif (isset($_GET['deleted'])): ?>
    <p class="note ok" id="acc-deleted">Your account was deleted.</p>
<?php endif; ?>
<?php if ($c && !$u): ?>
    <?php if (($_GET['signin'] ?? '') === 'cancelled'): ?><p class="note warn">The sign-in was cancelled.</p><?php endif; ?>
    <p class="b-actions"><a class="btn" id="acc-signin" href="auth/orcid.php">Sign in with ORCID</a></p>
<?php elseif ($u): $used = fb_used($u['orcid']); ?>
    <dl class="kv" id="acc-info">
      <dt>Name</dt><dd><?= h($u['name']) ?></dd>
      <dt>ORCID</dt><dd><a href="https://orcid.org/<?= h($u['orcid']) ?>">https://orcid.org/<?= h($u['orcid']) ?></a></dd>
      <dt>State</dt><dd id="acc-status"><?= h($status[$u['status']] ?? $u['status']) ?><?= $u['admin'] ? ' (administrator)' : '' ?></dd>
      <dt>This month</dt><dd id="acc-used"><?= $used ?> of <?= (int)$c['monthly_quota'] ?> interpretations used</dd>
    </dl>
    <?php if ($u['status'] === 'pending'): ?><p class="note" id="acc-pending">Your account is waiting for approval. You can use every tool meanwhile; the interpretation button works once the account is approved.</p><?php endif; ?>
    <form method="post" action="auth/logout.php" class="b-actions"><input type="hidden" name="csrf" value="<?= h(fb_csrf()) ?>"><button type="submit" class="btn ghost" id="acc-signout">Sign out</button></form>
    <form method="post" action="hesap.php" class="b-actions" onsubmit="return confirm('Delete your account? Your ORCID iD, name and usage counts are removed from the server. This cannot be undone.');">
      <input type="hidden" name="csrf" value="<?= h(fb_csrf()) ?>"><input type="hidden" name="act" value="delete"><button type="submit" class="btn danger" id="acc-delete">Delete my account</button></form>
<?php endif; ?>
  </section>
<?php if ($u && $u['admin']):
    $rows = fb_db()->query("SELECT u.orcid, u.name, u.status, u.created, COALESCE(g.n, 0) AS used FROM users u LEFT JOIN usage g ON g.orcid = u.orcid AND g.month = '" . fb_month() . "' ORDER BY CASE u.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, u.created DESC")->fetchAll(); ?>
  <section class="card about" aria-labelledby="accounts">
    <h2 id="accounts" class="b-h2">Accounts</h2>
    <div class="tscroll"><table class="grid" id="acc-list"><thead><tr><th>Name</th><th>ORCID</th><th>Signed up (UTC)</th><th>State</th><th>This month</th><th></th></tr></thead><tbody>
    <?php foreach ($rows as $r): ?>
      <tr data-orcid="<?= h($r['orcid']) ?>"><td><?= h($r['name']) ?></td><td><a href="https://orcid.org/<?= h($r['orcid']) ?>"><?= h($r['orcid']) ?></a></td><td><?= h(substr($r['created'], 0, 16)) ?></td>
        <td><?= h($status[$r['status']] ?? $r['status']) ?></td><td><?= (int)$r['used'] ?></td>
        <td><?php if ($r['orcid'] !== $u['orcid']): foreach (['approved' => 'Approve', 'blocked' => 'Block', 'pending' => 'Set pending'] as $a => $l): if ($a === $r['status']) continue; ?>
          <form method="post" action="hesap.php" style="display:inline"><input type="hidden" name="csrf" value="<?= h(fb_csrf()) ?>"><input type="hidden" name="orcid" value="<?= h($r['orcid']) ?>"><input type="hidden" name="act" value="<?= $a ?>"><button type="submit" class="btn ghost small" data-act="<?= $a ?>"><?= $l ?></button></form>
        <?php endforeach; endif; ?></td></tr>
    <?php endforeach; ?>
    </tbody></table></div>
  </section>
<?php endif; ?>
<?php site_bottom();
