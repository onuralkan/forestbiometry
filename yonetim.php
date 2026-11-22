<?php
// Administration panel (22 Nov 2026, user request; plan in docs/ADMIN_PLAN.md): the administrator of the private config
// (admin_orcid) manages the accounts and the interpretation service. Views: Overview, Accounts, one account, Usage
// (call log: outcomes, tokens, estimated cost from the administrator's prices, failures, top accounts, retention),
// Settings, Audit log. Stage 3: switches of the interpretation service on the Overview (whole service and each tool of
// inc/ai-tools.php) and a state for several accounts at once on the Accounts list. Privacy (gizlilik.php): the panel shows counts, sizes, dates and states, never the content of a user's saved
// results or interpretations. Every change is written to the audit log; destructive actions ask for confirmation.
// Server-rendered forms with the form token, no script needed. (admin.php is not used: the old site's admin.php must
// keep answering 404.)
declare(strict_types=1);
require __DIR__ . '/inc/account.php';
require __DIR__ . '/inc/ai-tools.php';   // FB_TOOLS: the tools with the interpretation (one switch each)

$c = fb_config();
$u = $c ? fb_user() : null;
if (!$c || !$u || !$u['admin']) { http_response_code($c && $u ? 403 : 404); header('Content-Type: text/plain; charset=utf-8'); exit($c && !$u ? 'Sign in first.' : 'Not found.'); }

$ORCID = '~^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$~';
$STATES = ['approved' => 'Approved', 'pending' => 'Waiting for approval', 'rejected' => 'Not approved', 'blocked' => 'Blocked'];
$me = $u['orcid']; $db = fb_db();
$int = function ($v) { $v = trim((string)$v); return $v === '' ? null : (preg_match('~^\d{1,6}$~', $v) ? (int)$v : false); };
$back = function (string $q, string $done = '') { header('Location: yonetim.php' . ($q !== '' ? '?' . $q : '') . ($done !== '' ? ($q !== '' ? '&' : '?') . 'done=' . $done : '')); exit; };

/* ---------------- downloads ---------------- */
if (($_GET['view'] ?? '') === 'audit' && isset($_GET['csv'])) {
    header('Content-Type: text/csv; charset=utf-8'); header('Content-Disposition: attachment; filename="audit-log-' . gmdate('Y-m-d') . '.csv"'); header('Cache-Control: no-store');
    $o = fopen('php://output', 'w'); fwrite($o, "\xEF\xBB\xBF");
    fputcsv($o, ['time (UTC)', 'by', 'action', 'account', 'detail']);
    foreach ($db->query('SELECT at, admin, action, orcid, detail FROM audit ORDER BY id DESC') as $r) fputcsv($o, [$r['at'], $r['admin'], $r['action'], $r['orcid'], $r['detail']]);
    exit;
}
if (($_GET['view'] ?? '') === 'usage' && isset($_GET['csv'])) {
    header('Content-Type: text/csv; charset=utf-8'); header('Content-Disposition: attachment; filename="calls-' . gmdate('Y-m-d') . '.csv"'); header('Cache-Control: no-store');
    $o = fopen('php://output', 'w'); fwrite($o, "\xEF\xBB\xBF");
    fputcsv($o, ['time (UTC)', 'account', 'tool', 'outcome', 'input tokens', 'output tokens', 'ms', 'model', 'detail']);
    foreach ($db->query('SELECT at, orcid, tool, outcome, tok_in, tok_out, ms, model, detail FROM calls ORDER BY id DESC') as $r) fputcsv($o, array_values($r));
    exit;
}
if (($_GET['view'] ?? '') === 'accounts' && isset($_GET['csv'])) {
    header('Content-Type: text/csv; charset=utf-8'); header('Content-Disposition: attachment; filename="accounts-' . gmdate('Y-m-d') . '.csv"'); header('Cache-Control: no-store');
    $o = fopen('php://output', 'w'); fwrite($o, "\xEF\xBB\xBF");
    fputcsv($o, ['orcid', 'name', 'state', 'signed up', 'last seen', 'used this month', 'monthly quota', 'daily quota', 'saved results', 'interpretations', 'bytes']);
    foreach ($db->query('SELECT * FROM users ORDER BY created') as $r) {
        $l = fb_limits($r); $s = fb_storage($r['orcid']);
        fputcsv($o, [$r['orcid'], $r['name'], $r['status'], $r['created'], $r['last_seen'], fb_used($r['orcid']), $l['month'], $l['day'], $s['results'], $s['interpretations'], $s['bytes']]);
    }
    exit;
}

/* ---------------- changes (POST) ---------------- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!fb_csrf_ok($_POST['csrf'] ?? null)) { http_response_code(403); exit('The form expired. Reload the page and try again.'); }
    $act = (string)($_POST['act'] ?? ''); $o = (string)($_POST['orcid'] ?? ''); $why = trim(mb_substr((string)($_POST['reason'] ?? ''), 0, 500));
    $from = (string)($_POST['from'] ?? ''); $ret = $from === 'overview' ? '' : 'view=account&orcid=' . rawurlencode($o);
    if ($act === 'settings') {
        $s = fb_settings(); $new = [];
        foreach (['monthly_quota', 'daily_quota', 'per_minute', 'site_cap'] as $k) { $v = $int($_POST[$k] ?? ''); if ($v === false || $v === null || ($k === 'per_minute' && $v < 1)) $back('view=settings', 'bad-number'); $new[$k] = $v; }
        $tk = trim((string)($_POST['site_cap_tokens'] ?? '')); if (!preg_match('~^\d{1,12}$~', $tk)) $back('view=settings', 'bad-number'); $new['site_cap_tokens'] = (int)$tk;
        foreach (['price_in', 'price_out'] as $k) { $v = str_replace(',', '.', trim((string)($_POST[$k] ?? ''))); if ($v !== '' && !preg_match('~^\d{1,6}(\.\d{1,6})?$~', $v)) $back('view=settings', 'bad-price'); $new[$k] = $v; }
        $new['signup'] = in_array($_POST['signup'] ?? '', ['approval', 'auto', 'closed'], true) ? $_POST['signup'] : 'approval';
        $new['ai_enabled'] = !empty($_POST['ai_enabled']) ? 1 : 0;
        $new['ai_off_message'] = trim(mb_substr((string)($_POST['ai_off_message'] ?? ''), 0, 300));
        $new['announcement'] = trim(mb_substr((string)($_POST['announcement'] ?? ''), 0, 500));
        $ch = [];
        foreach ($new as $k => $v) if ((string)$s[$k] !== (string)$v) { fb_set_setting($k, $v); $ch[] = "$k: " . json_encode($s[$k], JSON_UNESCAPED_UNICODE) . ' → ' . json_encode($v, JSON_UNESCAPED_UNICODE); }
        if ($ch) fb_audit($me, 'settings', null, implode('; ', $ch));
        $back('view=settings', 'saved');
    }
    if ($act === 'service') {   // quick switches (Overview): the whole service, or one tool
        $s = fb_settings(); $tool = (string)($_POST['tool'] ?? ''); $on = ($_POST['on'] ?? '') === '1';
        if ($tool === '') {
            if ((bool)$s['ai_enabled'] !== $on) { fb_set_setting('ai_enabled', $on ? 1 : 0); fb_audit($me, 'service', null, 'interpretation service ' . ($on ? 'switched on' : 'switched off') . ($why !== '' ? '; reason: ' . $why : '')); }
        } elseif (isset(FB_TOOLS[$tool])) {
            $off = fb_tools_off(); $was = !in_array($tool, $off, true);
            if ($was !== $on) {
                $off = $on ? array_values(array_diff($off, [$tool])) : array_merge($off, [$tool]);
                fb_set_setting('tools_off', implode(',', array_unique($off)));
                fb_audit($me, 'service', null, 'interpretation in ' . $tool . ' ' . ($on ? 'switched on' : 'switched off') . ($why !== '' ? '; reason: ' . $why : ''));
            }
        }
        $back('', 'saved');
    }
    if ($act === 'bulk') {   // stage 3: one state for the selected accounts (never the administrator's own)
        $to = (string)($_POST['status'] ?? ''); $list = array_values(array_filter((array)($_POST['orcids'] ?? []), function ($x) use ($ORCID, $me) { return is_string($x) && preg_match($ORCID, $x) && $x !== $me; }));
        if (!isset($STATES[$to])) $back('view=accounts', 'bad-state');
        if (!$list) $back('view=accounts', 'none-selected');
        $n = 0;
        foreach ($list as $x) {
            $r = fb_account($x); if (!$r || $r['status'] === $to) continue;
            $reason = in_array($to, ['blocked', 'rejected'], true) && $why !== '' ? $why : null;
            $db->prepare('UPDATE users SET status = ?, reason = ?, until = NULL, decided = ? WHERE orcid = ?')->execute([$to, $reason, gmdate('c'), $x]);
            fb_audit($me, 'status', $x, $r['status'] . ' → ' . $to . ' (bulk)' . ($why !== '' ? '; reason: ' . $why : '')); $n++;
        }
        $back('view=accounts', 'bulk-' . $n);
    }
    if ($act === 'purge') {
        $n = fb_purge(true);
        fb_audit($me, 'retention', null, "retention rule run by hand: $n account(s) not signed in for 24 months deleted");
        $back('view=usage', 'purged-' . $n);
    }
    if (!preg_match($ORCID, $o) || !($r = fb_account($o))) $back('view=accounts', 'unknown');
    if ($o === $me && in_array($act, ['status', 'delete'], true)) $back($ret, 'self');
    if ($act === 'status') {
        $to = (string)($_POST['status'] ?? '');
        if (!isset($STATES[$to])) $back($ret, 'bad-state');
        $until = null;
        if ($to === 'blocked' && trim((string)($_POST['until'] ?? '')) !== '') {
            $d = (string)$_POST['until'];
            if (!preg_match('~^\d{4}-\d{2}-\d{2}$~', $d) || $d <= gmdate('Y-m-d')) $back($ret, 'bad-date');
            $until = $d . 'T00:00:00+00:00';
        }
        $reason = in_array($to, ['blocked', 'rejected'], true) && $why !== '' ? $why : null;
        $db->prepare('UPDATE users SET status = ?, reason = ?, until = ?, decided = ? WHERE orcid = ?')->execute([$to, $reason, $until, gmdate('c'), $o]);
        fb_audit($me, 'status', $o, $r['status'] . ' → ' . $to . ($until ? ' until ' . substr($until, 0, 10) : '') . ($why !== '' ? '; reason: ' . $why : ''));
        $back($ret, 'saved');
    }
    if ($act === 'limits') {
        $qm = $int($_POST['q_month'] ?? ''); $qd = $int($_POST['q_day'] ?? ''); $ex = $int($_POST['extra'] ?? '');
        if ($qm === false || $qd === false || $ex === false) $back($ret, 'bad-number');
        $exNow = ($r['extra_month'] ?? '') === fb_month() ? (int)$r['extra'] : 0;
        $db->prepare('UPDATE users SET q_month = ?, q_day = ?, extra = ?, extra_month = ? WHERE orcid = ?')->execute([$qm, $qd, (int)$ex, $ex ? fb_month() : null, $o]);
        $f = function ($v) { return $v === null || $v === '' ? 'default' : (string)$v; };
        fb_audit($me, 'limits', $o, 'monthly ' . $f($r['q_month']) . ' → ' . $f($qm) . '; daily ' . $f($r['q_day']) . ' → ' . $f($qd) . '; extra this month ' . $exNow . ' → ' . (int)$ex . ($why !== '' ? '; reason: ' . $why : ''));
        $back($ret, 'saved');
    }
    if ($act === 'reset') {
        $what = ($_POST['what'] ?? '') === 'day' ? 'day' : 'month';
        $was = $what === 'day' ? fb_used_day($o) : fb_used($o);
        if ($what === 'day') $db->prepare('DELETE FROM usage_day WHERE orcid = ? AND day = ?')->execute([$o, fb_day()]);
        else $db->prepare('DELETE FROM usage WHERE orcid = ? AND month = ?')->execute([$o, fb_month()]);
        fb_audit($me, 'reset', $o, ($what === 'day' ? "today's" : "this month's") . " use $was → 0" . ($why !== '' ? '; reason: ' . $why : ''));
        $back($ret, 'saved');
    }
    if ($act === 'note') {
        $n = trim(mb_substr((string)($_POST['note'] ?? ''), 0, 2000));
        $db->prepare('UPDATE users SET note = ? WHERE orcid = ?')->execute([$n === '' ? null : $n, $o]);
        fb_audit($me, 'note', $o, 'administrator note changed');
        $back($ret, 'saved');
    }
    if ($act === 'delete') {
        if (trim((string)($_POST['confirm'] ?? '')) !== $o) $back($ret, 'confirm');
        $s = fb_storage($o);
        fb_delete_account($o);
        fb_audit($me, 'delete', $o, 'account deleted with ' . $s['results'] . ' saved results and ' . $s['interpretations'] . ' interpretations' . ($why !== '' ? '; reason: ' . $why : ''));
        $back('view=accounts', 'deleted');
    }
    $back($ret);
}

/* ---------------- pages ---------------- */
require __DIR__ . '/inc/site.php';
$view = (string)($_GET['view'] ?? 'overview');
if (!in_array($view, ['overview', 'accounts', 'account', 'usage', 'settings', 'audit'], true)) $view = 'overview';
site_top(['title' => 'Administration', 'desc' => 'Administration of accounts and the interpretation service.', 'robots' => 'noindex']);
$csrf = fb_csrf();
$tok = '<input type="hidden" name="csrf" value="' . h($csrf) . '">';
$when = function ($iso) { return $iso ? h(str_replace('T', ' ', substr((string)$iso, 0, 16))) : '–'; };
$mb = function ($b) { return $b <= 0 ? '0 kB' : ($b >= 1e6 ? number_format($b / 1e6, 1) . ' MB' : number_format(max(1, $b / 1e3), 0) . ' kB'); };
$set = fb_settings();
$done = ['saved' => ['ok', 'Saved.'], 'deleted' => ['ok', 'The account was deleted.'], 'self' => ['err', 'You cannot change the state of your own account or delete it here.'],
    'bad-number' => ['err', 'Enter whole numbers (0 or more; per minute at least 1).'], 'bad-date' => ['err', 'The end of a temporary block must be a date after today.'],
    'confirm' => ['err', 'Type the ORCID iD of the account to confirm the deletion.'], 'bad-price' => ['err', 'Prices: a number such as 3 or 15.5 (USD per million tokens), or empty.'], 'unknown' => ['err', 'No such account.'], 'bad-state' => ['err', 'Unknown state.']][$_GET['done'] ?? ''] ?? null;
if (!$done && preg_match('~^purged-(\d+)$~', (string)($_GET['done'] ?? ''), $mm)) $done = ['ok', 'Retention rule run: ' . $mm[1] . ' account(s) deleted.'];
if (!$done && preg_match('~^bulk-(\d+)$~', (string)($_GET['done'] ?? ''), $mm)) $done = ['ok', 'State changed for ' . $mm[1] . ' account(s).'];
if (($_GET['done'] ?? '') === 'none-selected') $done = ['err', 'Select at least one account (tick its box).'];
$usd = function (?float $v) { return $v === null ? '–' : '$' . number_format($v, $v < 10 ? 2 : 0); };
$ktok = function (int $n) { return $n >= 1e6 ? number_format($n / 1e6, 2) . ' M' : ($n >= 1e3 ? number_format($n / 1e3, 1) . ' k' : (string)$n); };
$FAIL = ['upstream', 'refusal', 'empty'];
$toolName = []; foreach (site_tools() as $t) $toolName[basename($t['file'], '.php')] = $t['title'];
$tn = function ($id) use ($toolName) { return h($toolName[$id] ?? $id); };
$link = function ($v, $l) use ($view) { return '<a href="yonetim.php' . ($v === 'overview' ? '' : '?view=' . $v) . '" id="adm-tab-' . $v . '"' . ($view === $v || ($view === 'account' && $v === 'accounts') ? ' aria-current="page"' : '') . '>' . h($l) . '</a>'; };
$pending = (int)$db->query("SELECT COUNT(*) FROM users WHERE status = 'pending'")->fetchColumn();
?>
  <nav class="tabs acc-tabs" aria-label="Administration">
    <?= $link('overview', 'Overview') ?><?= $link('accounts', 'Accounts' . ($pending ? " ($pending waiting)" : '')) ?><?= $link('usage', 'Usage') ?><?= $link('settings', 'Settings') ?><?= $link('audit', 'Audit log') ?>
    <a href="hesap.php">My account</a>
  </nav>
  <?php if ($done): ?><p class="note <?= $done[0] ?>" id="adm-done"><?= h($done[1]) ?></p><?php endif; ?>
<?php if ($view === 'overview'):
  $by = []; foreach ($db->query('SELECT status, COUNT(*) AS n FROM users GROUP BY status') as $r) $by[$r['status']] = (int)$r['n'];
  $today = (int)$db->query("SELECT COALESCE(SUM(n), 0) FROM usage_day WHERE day = '" . fb_day() . "'")->fetchColumn();
  $month = (int)$db->query("SELECT COALESCE(SUM(n), 0) FROM usage WHERE month = '" . fb_month() . "'")->fetchColumn();
  $store = $db->query('SELECT (SELECT COUNT(*) FROM results) AS r, (SELECT COUNT(*) FROM interpretations) AS i, (SELECT COALESCE(SUM(size), 0) FROM results) + (SELECT COALESCE(SUM(size), 0) FROM interpretations) AS b')->fetch();
  $bk = glob(fb_private_dir() . '/backups/fb-*.sqlite.gz') ?: []; rsort($bk);
  $bkAge = $bk ? (int)floor((time() - filemtime($bk[0])) / 86400) : null;
  $soon = $db->prepare('SELECT COUNT(*) FROM users WHERE COALESCE(last_seen, created) < ? AND orcid <> ?'); $soon->execute([gmdate('c', strtotime('-23 months')), $me]);
  $waiting = $db->query("SELECT orcid, name, created FROM users WHERE status = 'pending' ORDER BY created LIMIT 50")->fetchAll();
  $sm = fb_site_month();
  $fails = (int)$db->query("SELECT COUNT(*) FROM calls WHERE outcome IN ('upstream', 'refusal', 'empty') AND at >= '" . fb_day() . "'")->fetchColumn(); ?>
  <section class="card about" aria-labelledby="adm-h">
    <h2 id="adm-h" class="b-h2">Overview</h2>
    <?php if (!$set['ai_enabled']): ?><p class="note warn" id="adm-paused">The interpretation service is paused for everyone (Settings).</p><?php endif; ?>
    <dl class="kv" id="adm-stats">
      <dt>Accounts</dt><dd><?= array_sum($by) ?>: <?php $p = []; foreach ($STATES as $k => $l) $p[] = h($l) . ' ' . ($by[$k] ?? 0); echo implode(' · ', $p); ?></dd>
      <dt>Interpretations</dt><dd id="adm-use"><?= $today ?> today, <?= $month ?> this month (UTC)<?= $set['site_cap'] > 0 ? ' of a site-wide cap of ' . $set['site_cap'] : '' ?><?= $fails ? ' · <a class="bad" href="yonetim.php?view=usage">' . $fails . ' failed call(s) today</a>' : '' ?></dd>
      <dt>Tokens this month</dt><dd id="adm-tok"><?= $ktok($sm['in']) ?> in, <?= $ktok($sm['out']) ?> out<?= $set['site_cap_tokens'] > 0 ? ' (cap ' . $ktok($set['site_cap_tokens']) . ')' : '' ?> · estimated cost <?= $usd(fb_cost($sm['in'], $sm['out'])) ?><?= fb_cost(0, 0) === null ? ' <span class="muted small">(enter prices in Settings)</span>' : '' ?></dd>
      <dt>Storage</dt><dd><?= (int)$store['r'] ?> saved results, <?= (int)$store['i'] ?> interpretations, <?= $mb((int)$store['b']) ?></dd>
      <dt>Sign-up</dt><dd><?= h(['approval' => 'new accounts wait for approval', 'auto' => 'new accounts are approved automatically', 'closed' => 'closed to new accounts'][$set['signup']] ?? $set['signup']) ?></dd>
      <dt>Default limits</dt><dd><?= $set['monthly_quota'] ?> a month, <?= $set['daily_quota'] > 0 ? $set['daily_quota'] . ' a day' : 'no daily limit' ?>, <?= $set['per_minute'] ?> a minute</dd>
      <dt>Backup</dt><dd id="adm-backup"><?php if ($bk): ?><?= h(basename($bk[0])) ?> (<?= $bkAge === 0 ? 'today' : $bkAge . ' day' . ($bkAge === 1 ? '' : 's') . ' old' ?>)<?= $bkAge > 2 ? ' <span class="bad">· the nightly cron job may have stopped</span>' : '' ?><?php else: ?><span class="bad">no copy yet: set up the cron job (PROJECT.md §3)</span><?php endif; ?> · <a href="hesap.php?backup=1" id="adm-bkdl">download the newest copy</a></dd>
      <dt>Retention</dt><dd><?= (int)$soon->fetchColumn() ?> account(s) not signed in for 23 months (deleted at 24 months)</dd>
    </dl>
    <h3>Interpretation service</h3>
    <p class="small muted">Switch the AI interpretation off for every tool (for example when the API balance runs out) or for one tool. Users then see that it is paused, with the message from Settings; saved items stay available. Each switch is written to the audit log.</p>
    <div class="tscroll"><table class="grid" id="adm-service"><thead><tr><th>Where</th><th>State</th><th></th></tr></thead><tbody>
      <?php $off = fb_tools_off(); $sw = function ($tool, $on, $label) use ($tok) { return '<form method="post" action="yonetim.php" class="inline-form"' . ($on ? '' : ' onsubmit="return confirm(' . h(json_encode('Switch the interpretation off: ' . $label . '?')) . ');"') . '>' . $tok . '<input type="hidden" name="act" value="service"><input type="hidden" name="tool" value="' . h($tool) . '"><input type="hidden" name="on" value="' . ($on ? '1' : '0') . '"><button type="submit" class="btn ' . ($on ? '' : 'danger ') . 'small" data-switch="' . h($tool === '' ? 'all' : $tool) . '">' . ($on ? 'Switch on' : 'Switch off') . '</button></form>'; }; ?>
      <tr data-tool="all"><td><b>Whole service</b> (every tool)</td><td><?= $set['ai_enabled'] ? '<span class="ok">on</span>' : '<span class="bad">off</span>' ?></td><td><?= $sw('', !$set['ai_enabled'], 'every tool') ?></td></tr>
      <?php foreach (FB_TOOLS as $id => $t): $on = !in_array($id, $off, true); ?><tr data-tool="<?= h($id) ?>"><td><?= h(preg_replace('/\s*\(Forest Biometry\)$/', '', $t['name'])) ?></td><td><?= $on ? ($set['ai_enabled'] ? '<span class="ok">on</span>' : '<span class="muted">on (service off)</span>') : '<span class="bad">off</span>' ?></td><td><?= $sw($id, !$on, $t['name']) ?></td></tr><?php endforeach; ?>
    </tbody></table></div>
    <h3>Waiting for approval</h3>
    <?php if (!$waiting): ?><p class="muted" id="adm-nowait">No account is waiting.</p><?php else: ?>
    <div class="tscroll"><table class="grid" id="adm-wait"><thead><tr><th>Name</th><th>ORCID</th><th>Signed up</th><th></th></tr></thead><tbody>
    <?php foreach ($waiting as $r): ?><tr data-orcid="<?= h($r['orcid']) ?>"><td><a href="yonetim.php?view=account&amp;orcid=<?= h($r['orcid']) ?>"><?= h($r['name']) ?></a></td><td><a href="https://orcid.org/<?= h($r['orcid']) ?>" rel="noopener"><?= h($r['orcid']) ?></a></td><td class="small"><?= $when($r['created']) ?></td>
      <td><?php foreach (['approved' => 'Approve', 'rejected' => 'Reject'] as $s => $l): ?><form method="post" action="yonetim.php" class="inline-form"><?= $tok ?><input type="hidden" name="act" value="status"><input type="hidden" name="from" value="overview"><input type="hidden" name="orcid" value="<?= h($r['orcid']) ?>"><input type="hidden" name="status" value="<?= $s ?>"><button type="submit" class="btn <?= $s === 'approved' ? '' : 'ghost ' ?>small" data-quick="<?= $s ?>"><?= $l ?></button></form> <?php endforeach; ?></td></tr>
    <?php endforeach; ?></tbody></table></div><?php endif; ?>
  </section>
<?php elseif ($view === 'accounts'):
  $q = trim((string)($_GET['q'] ?? '')); $fs = (string)($_GET['state'] ?? ''); $sort = (string)($_GET['sort'] ?? 'created');
  $order = ['created' => 'u.created DESC', 'seen' => 'COALESCE(u.last_seen, u.created) DESC', 'use' => 'used DESC, u.created DESC', 'name' => 'u.name COLLATE NOCASE'][$sort] ?? 'u.created DESC';
  $w = []; $args = [];
  if ($q !== '') { $w[] = '(u.name LIKE ? OR u.orcid LIKE ?)'; $args[] = '%' . $q . '%'; $args[] = '%' . $q . '%'; }
  if (isset($STATES[$fs])) { $w[] = 'u.status = ?'; $args[] = $fs; }
  $st = $db->prepare("SELECT u.*, COALESCE(g.n, 0) AS used, (SELECT COUNT(*) FROM results r WHERE r.orcid = u.orcid) AS nres,
      (SELECT COALESCE(SUM(size), 0) FROM results r WHERE r.orcid = u.orcid) + (SELECT COALESCE(SUM(size), 0) FROM interpretations i WHERE i.orcid = u.orcid) AS bytes
      FROM users u LEFT JOIN usage g ON g.orcid = u.orcid AND g.month = '" . fb_month() . "'" . ($w ? ' WHERE ' . implode(' AND ', $w) : '') . " ORDER BY $order LIMIT 500");
  $st->execute($args); $rows = $st->fetchAll(); ?>
  <section class="card about" aria-labelledby="adm-h">
    <h2 id="adm-h" class="b-h2">Accounts</h2>
    <form method="get" action="yonetim.php" class="adm-filter" id="adm-filter"><input type="hidden" name="view" value="accounts">
      <label class="field inline"><span>Search</span><input type="search" name="q" value="<?= h($q) ?>" placeholder="name or ORCID iD"></label>
      <label class="field inline"><span>State</span><select name="state"><option value="">all</option><?php foreach ($STATES as $k => $l): ?><option value="<?= $k ?>"<?= $fs === $k ? ' selected' : '' ?>><?= h($l) ?></option><?php endforeach; ?></select></label>
      <label class="field inline"><span>Order</span><select name="sort"><?php foreach (['created' => 'newest first', 'seen' => 'last seen', 'use' => 'use this month', 'name' => 'name'] as $k => $l): ?><option value="<?= $k ?>"<?= $sort === $k ? ' selected' : '' ?>><?= $l ?></option><?php endforeach; ?></select></label>
      <button type="submit" class="btn ghost small">Show</button> <a class="btn ghost small" href="yonetim.php?view=accounts&amp;csv=1" id="adm-csv">Download all (CSV)</a>
    </form>
    <p class="muted small"><?= count($rows) ?> account(s)<?= count($rows) === 500 ? ' (first 500)' : '' ?>.</p>
    <form method="post" action="yonetim.php" id="adm-bulk"><?= $tok ?><input type="hidden" name="act" value="bulk">
    <div class="adm-bulkbar"><label class="field inline"><span>Selected accounts</span><select name="status"><?php foreach ($STATES as $k => $l): ?><option value="<?= $k ?>"><?= h('Set: ' . $l) ?></option><?php endforeach; ?></select></label>
      <label class="field inline"><span>Reason (shown to the user when not approved or blocked)</span><input type="text" name="reason" maxlength="500"></label>
      <button type="submit" class="btn small" onclick="return confirm('Change the state of the selected accounts?');">Apply to selected</button></div>
    <div class="tscroll"><table class="grid" id="adm-list"><thead><tr><th><input type="checkbox" id="adm-all" aria-label="Select all" onclick="document.querySelectorAll('#adm-list [name=\'orcids[]\']').forEach(function (b) { b.checked = this.checked; }, this)"></th><th>Name</th><th>ORCID</th><th>State</th><th>Signed up</th><th>Last seen</th><th>This month</th><th>Limits</th><th>Saved</th></tr></thead><tbody>
    <?php foreach ($rows as $r): $l = fb_limits($r); ?>
      <tr data-orcid="<?= h($r['orcid']) ?>"><td><?= $r['orcid'] === $me ? '' : '<input type="checkbox" name="orcids[]" value="' . h($r['orcid']) . '" aria-label="Select ' . h($r['name']) . '">' ?></td><td><a href="yonetim.php?view=account&amp;orcid=<?= h($r['orcid']) ?>"><?= h($r['name']) ?></a><?= $r['orcid'] === $me ? ' <span class="muted small">(you)</span>' : '' ?><?= $r['note'] ? ' <span class="muted small" title="' . h($r['note']) . '">✎</span>' : '' ?></td>
        <td class="small"><?= h($r['orcid']) ?></td><td><?= h($STATES[$r['status']] ?? $r['status']) ?><?= $r['until'] ? '<br><span class="small">until ' . h(substr($r['until'], 0, 10)) . '</span>' : '' ?></td>
        <td class="small"><?= h(substr($r['created'], 0, 10)) ?></td><td class="small"><?= h(substr((string)$r['last_seen'], 0, 10)) ?></td>
        <td class="num"><?= (int)$r['used'] ?> / <?= $l['month'] ?></td><td class="small"><?= $l['personalMonth'] ? 'own monthly' : 'default' ?><?= $l['day'] > 0 ? ', ' . $l['day'] . '/day' : '' ?><?= $l['extra'] ? ', +' . $l['extra'] : '' ?></td>
        <td class="num"><?= (int)$r['nres'] ?> · <?= $mb((int)$r['bytes']) ?></td></tr>
    <?php endforeach; ?></tbody></table></div></form>
  </section>
<?php elseif ($view === 'account'):
  $o = (string)($_GET['orcid'] ?? ''); $r = preg_match($ORCID, $o) ? fb_account($o) : null;
  if (!$r): ?><section class="card about"><p class="note err">No such account. <a href="yonetim.php?view=accounts">All accounts</a></p></section><?php else:
  $l = fb_limits($r); $s = fb_storage($o); $self = $o === $me;
  $months = $db->prepare('SELECT month, n FROM usage WHERE orcid = ? ORDER BY month DESC LIMIT 12'); $months->execute([$o]); $months = $months->fetchAll();
  $days = $db->prepare('SELECT day, n FROM usage_day WHERE orcid = ? AND day >= ? ORDER BY day DESC'); $days->execute([$o, gmdate('Y-m-d', strtotime('-29 days'))]); $days = $days->fetchAll();
  $log = $db->prepare('SELECT at, admin, action, detail FROM audit WHERE orcid = ? ORDER BY id DESC LIMIT 50'); $log->execute([$o]); $log = $log->fetchAll();
  $cm = $db->prepare("SELECT COUNT(*) AS n, SUM(outcome = 'ok') AS ok, COALESCE(SUM(tok_in), 0) AS i, COALESCE(SUM(tok_out), 0) AS t FROM calls WHERE orcid = ? AND at >= ?"); $cm->execute([$o, fb_month() . '-01']); $cm = $cm->fetch();
  $hidden = $tok . '<input type="hidden" name="orcid" value="' . h($o) . '">'; ?>
  <section class="card about" aria-labelledby="adm-h">
    <p class="small"><a href="yonetim.php?view=accounts">← All accounts</a></p>
    <h2 id="adm-h" class="b-h2"><?= h($r['name']) ?></h2>
    <dl class="kv" id="adm-acc">
      <dt>ORCID</dt><dd><a href="https://orcid.org/<?= h($o) ?>" rel="noopener">https://orcid.org/<?= h($o) ?></a></dd>
      <dt>State</dt><dd id="adm-state"><?= h($STATES[$r['status']] ?? $r['status']) ?><?= $r['until'] ? ' until ' . h(substr($r['until'], 0, 10)) : '' ?><?= $r['reason'] ? ' · reason shown to the user: “' . h($r['reason']) . '”' : '' ?><?= $self ? ' (administrator)' : '' ?></dd>
      <dt>Signed up</dt><dd><?= $when($r['created']) ?> UTC · decided <?= $when($r['decided']) ?> · last seen <?= $when($r['last_seen']) ?></dd>
      <dt>Use</dt><dd id="adm-accuse"><?= fb_used($o) ?> of <?= $l['month'] ?> this month<?= $l['extra'] ? ' (including ' . $l['extra'] . ' extra)' : '' ?>; <?= fb_used_day($o) ?><?= $l['day'] > 0 ? ' of ' . $l['day'] : '' ?> today</dd>
      <dt>Calls this month</dt><dd id="adm-acccalls"><?= (int)$cm['n'] ?> request(s), <?= (int)$cm['ok'] ?> answered; <?= $ktok((int)$cm['i']) ?> tokens in, <?= $ktok((int)$cm['t']) ?> out · estimated <?= $usd(fb_cost((int)$cm['i'], (int)$cm['t'])) ?></dd>
      <dt>Storage</dt><dd><?= $s['results'] ?> saved results, <?= $s['interpretations'] ?> interpretations, <?= $mb($s['bytes']) ?> (contents are private to the account)</dd>
    </dl>
  </section>
  <?php if (!$self): ?>
  <section class="card about" aria-labelledby="adm-hs">
    <h3 id="adm-hs">State</h3>
    <form method="post" action="yonetim.php" id="adm-status"><?= $hidden ?><input type="hidden" name="act" value="status">
      <div class="radios"><?php foreach ($STATES as $k => $lab): ?><label><input type="radio" name="status" value="<?= $k ?>"<?= $r['status'] === $k ? ' checked' : '' ?>> <?= h($lab) ?></label><?php endforeach; ?></div>
      <label class="field"><span>Block until (optional; empty = until lifted)</span><input type="date" name="until" value="<?= h(substr((string)$r['until'], 0, 10)) ?>"></label>
      <label class="field"><span>Reason (shown to the user when not approved or blocked; written to the audit log)</span><input type="text" name="reason" maxlength="500" value="<?= h((string)$r['reason']) ?>"></label>
      <button type="submit" class="btn small">Save the state</button></form>
  </section>
  <?php endif; ?>
  <section class="card about" aria-labelledby="adm-hl">
    <h3 id="adm-hl">Limits</h3>
    <form method="post" action="yonetim.php" id="adm-limits"><?= $hidden ?><input type="hidden" name="act" value="limits">
      <label class="field inline"><span>Monthly quota (empty = default <?= $set['monthly_quota'] ?>)</span><input type="number" min="0" name="q_month" value="<?= $l['personalMonth'] ? (int)$r['q_month'] : '' ?>"></label>
      <label class="field inline"><span>Daily quota (empty = default <?= $set['daily_quota'] > 0 ? $set['daily_quota'] : 'none' ?>; 0 = none)</span><input type="number" min="0" name="q_day" value="<?= $l['personalDay'] ? (int)$r['q_day'] : '' ?>"></label>
      <label class="field inline"><span>Extra interpretations this month</span><input type="number" min="0" name="extra" value="<?= $l['extra'] ?>"></label>
      <label class="field"><span>Reason (optional, audit log)</span><input type="text" name="reason" maxlength="500"></label>
      <button type="submit" class="btn small">Save the limits</button></form>
    <div class="b-actions">
      <?php foreach (['month' => "Reset this month's use", 'day' => "Reset today's use"] as $k => $lab): ?><form method="post" action="yonetim.php" class="inline-form" onsubmit="return confirm(<?= h(json_encode($lab . '?')) ?>);"><?= $hidden ?><input type="hidden" name="act" value="reset"><input type="hidden" name="what" value="<?= $k ?>"><button type="submit" class="btn ghost small" data-reset="<?= $k ?>"><?= h($lab) ?></button></form> <?php endforeach; ?>
    </div>
  </section>
  <section class="card about" aria-labelledby="adm-hn">
    <h3 id="adm-hn">Administrator note</h3>
    <form method="post" action="yonetim.php" id="adm-note"><?= $hidden ?><input type="hidden" name="act" value="note">
      <label class="field"><span>Private note (never shown to the user)</span><textarea name="note" rows="3" maxlength="2000"><?= h((string)$r['note']) ?></textarea></label>
      <button type="submit" class="btn ghost small">Save the note</button></form>
  </section>
  <section class="card about" aria-labelledby="adm-hu">
    <h3 id="adm-hu">Use</h3>
    <div class="tscroll"><table class="grid small" id="adm-months"><thead><tr><th>Month</th><th>Interpretations</th></tr></thead><tbody>
      <?php foreach ($months as $m): ?><tr><td><?= h($m['month']) ?></td><td class="num"><?= (int)$m['n'] ?></td></tr><?php endforeach; ?><?= $months ? '' : '<tr><td colspan="2" class="muted">none</td></tr>' ?></tbody></table></div>
    <p class="small muted">Last 30 days: <?= $days ? implode(', ', array_map(function ($d) { return h(substr($d['day'], 5)) . ': ' . (int)$d['n']; }, $days)) : 'none' ?>.</p>
  </section>
  <section class="card about" aria-labelledby="adm-ha">
    <h3 id="adm-ha">Audit log of this account</h3>
    <?php if (!$log): ?><p class="muted">No entries.</p><?php else: ?><div class="tscroll"><table class="grid small" id="adm-acclog"><thead><tr><th>Time (UTC)</th><th>By</th><th>Action</th><th>Detail</th></tr></thead><tbody>
      <?php foreach ($log as $e): ?><tr><td class="nowrap"><?= $when($e['at']) ?></td><td><?= h($e['admin'] === $me ? 'you' : $e['admin']) ?></td><td><?= h($e['action']) ?></td><td><?= h($e['detail']) ?></td></tr><?php endforeach; ?></tbody></table></div><?php endif; ?>
  </section>
  <?php if (!$self): ?>
  <section class="card about acc-danger" aria-labelledby="adm-hd">
    <h3 id="adm-hd">Delete the account</h3>
    <p class="small">Removes the account and everything it keeps (saved results, interpretations, use counts). The audit log keeps the entry. Nightly backups keep a copy for up to 30 days. The person can sign in again later and gets a new account.</p>
    <form method="post" action="yonetim.php" id="adm-delete"><?= $hidden ?><input type="hidden" name="act" value="delete">
      <label class="field inline"><span>Type the ORCID iD to confirm</span><input type="text" name="confirm" autocomplete="off" spellcheck="false"></label>
      <label class="field inline"><span>Reason (audit log)</span><input type="text" name="reason" maxlength="500"></label>
      <button type="submit" class="btn danger small">Delete the account</button></form>
  </section>
  <?php endif; endif; ?>
<?php elseif ($view === 'usage'):
  $from = gmdate('Y-m-d', strtotime('-29 days'));
  $days = $db->prepare("SELECT substr(at, 1, 10) AS d, SUM(outcome = 'ok') AS ok, SUM(outcome IN ('upstream', 'refusal', 'empty')) AS bad,
      SUM(outcome IN ('off', 'cap', 'rate', 'daily', 'quota')) AS lim, COALESCE(SUM(tok_in), 0) AS i, COALESCE(SUM(tok_out), 0) AS o, AVG(CASE WHEN outcome = 'ok' THEN ms END) AS ms
      FROM calls WHERE at >= ? GROUP BY d ORDER BY d DESC"); $days->execute([$from]); $days = $days->fetchAll();
  $mon = fb_month() . '-01';
  $outc = $db->prepare('SELECT outcome, COUNT(*) AS n FROM calls WHERE at >= ? GROUP BY outcome ORDER BY n DESC'); $outc->execute([$mon]); $outc = $outc->fetchAll();
  $top = $db->prepare("SELECT c.orcid, u.name, SUM(c.outcome = 'ok') AS ok, COUNT(*) AS n, COALESCE(SUM(c.tok_in), 0) AS i, COALESCE(SUM(c.tok_out), 0) AS o FROM calls c LEFT JOIN users u ON u.orcid = c.orcid
      WHERE c.at >= ? GROUP BY c.orcid ORDER BY ok DESC, o DESC LIMIT 20"); $top->execute([$mon]); $top = $top->fetchAll();
  $tools = $db->prepare("SELECT tool, SUM(outcome = 'ok') AS ok, COALESCE(SUM(tok_in), 0) AS i, COALESCE(SUM(tok_out), 0) AS o FROM calls WHERE at >= ? GROUP BY tool ORDER BY ok DESC"); $tools->execute([$mon]); $tools = $tools->fetchAll();
  $probs = $db->query("SELECT c.at, c.orcid, u.name, c.tool, c.outcome, c.detail FROM calls c LEFT JOIN users u ON u.orcid = c.orcid WHERE c.outcome <> 'ok' ORDER BY c.id DESC LIMIT 50")->fetchAll();
  $old = $db->prepare('SELECT orcid, name, COALESCE(last_seen, created) AS seen FROM users WHERE COALESCE(last_seen, created) < ? AND orcid <> ? ORDER BY seen LIMIT 100'); $old->execute([gmdate('c', strtotime('-23 months')), $me]); $old = $old->fetchAll();
  $sm = fb_site_month();
  $who = function ($o, $n) { return $n !== null ? '<a href="yonetim.php?view=account&amp;orcid=' . h($o) . '">' . h($n) . '</a>' : h($o) . ' <span class="muted small">(deleted)</span>'; }; ?>
  <section class="card about" aria-labelledby="adm-h">
    <h2 id="adm-h" class="b-h2">Usage</h2>
    <p class="muted small">Every interpretation request is logged (time, account, tool, outcome, tokens reported by the API, duration; never the summary or the text), kept 13 months. Costs are estimates from the prices entered in Settings; the Anthropic Console shows the real bill. <a href="yonetim.php?view=usage&amp;csv=1" id="adm-callscsv">Download the call log (CSV)</a></p>
    <dl class="kv" id="adm-month">
      <dt>This month</dt><dd><?= $sm['n'] ?> interpretation(s)<?= $set['site_cap'] > 0 ? ' of ' . $set['site_cap'] . ' (site-wide cap)' : '' ?>; <?= $ktok($sm['in']) ?> tokens in, <?= $ktok($sm['out']) ?> out<?= $set['site_cap_tokens'] > 0 ? ' of ' . $ktok($set['site_cap_tokens']) : '' ?>; estimated <?= $usd(fb_cost($sm['in'], $sm['out'])) ?></dd>
      <dt>Outcomes</dt><dd id="adm-outcomes"><?= $outc ? implode(' · ', array_map(function ($x) { return h($x['outcome']) . ' ' . (int)$x['n']; }, $outc)) : 'none' ?></dd>
    </dl>
    <p class="muted small">Outcomes: ok = answered; upstream / refusal / empty = the model call failed (not charged to the user); off / cap / rate / daily / quota = refused by a limit before any call.</p>
    <h3>Last 30 days</h3>
    <div class="tscroll"><table class="grid small" id="adm-days"><thead><tr><th>Day</th><th>Answered</th><th>Failed</th><th>Refused by a limit</th><th>Tokens in</th><th>Tokens out</th><th>Estimated cost</th><th>Mean time</th></tr></thead><tbody>
      <?php foreach ($days as $d): ?><tr><td><?= h($d['d']) ?></td><td class="num"><?= (int)$d['ok'] ?></td><td class="num<?= $d['bad'] ? ' bad' : '' ?>"><?= (int)$d['bad'] ?></td><td class="num"><?= (int)$d['lim'] ?></td><td class="num"><?= $ktok((int)$d['i']) ?></td><td class="num"><?= $ktok((int)$d['o']) ?></td><td class="num"><?= $usd(fb_cost((int)$d['i'], (int)$d['o'])) ?></td><td class="num"><?= $d['ms'] !== null ? number_format((float)$d['ms'] / 1000, 1) . ' s' : '–' ?></td></tr><?php endforeach; ?>
      <?= $days ? '' : '<tr><td colspan="8" class="muted">No requests.</td></tr>' ?></tbody></table></div>
    <h3>Accounts this month</h3>
    <div class="tscroll"><table class="grid small" id="adm-top"><thead><tr><th>Account</th><th>Answered</th><th>Requests</th><th>Tokens in</th><th>Tokens out</th><th>Estimated cost</th></tr></thead><tbody>
      <?php foreach ($top as $t): ?><tr data-orcid="<?= h($t['orcid']) ?>"><td><?= $who($t['orcid'], $t['name']) ?></td><td class="num"><?= (int)$t['ok'] ?></td><td class="num"><?= (int)$t['n'] ?></td><td class="num"><?= $ktok((int)$t['i']) ?></td><td class="num"><?= $ktok((int)$t['o']) ?></td><td class="num"><?= $usd(fb_cost((int)$t['i'], (int)$t['o'])) ?></td></tr><?php endforeach; ?>
      <?= $top ? '' : '<tr><td colspan="6" class="muted">No requests this month.</td></tr>' ?></tbody></table></div>
    <h3>Tools this month</h3>
    <div class="tscroll"><table class="grid small" id="adm-tools"><thead><tr><th>Tool</th><th>Answered</th><th>Tokens in</th><th>Tokens out</th></tr></thead><tbody>
      <?php foreach ($tools as $t): ?><tr><td><?= $tn($t['tool']) ?></td><td class="num"><?= (int)$t['ok'] ?></td><td class="num"><?= $ktok((int)$t['i']) ?></td><td class="num"><?= $ktok((int)$t['o']) ?></td></tr><?php endforeach; ?>
      <?= $tools ? '' : '<tr><td colspan="4" class="muted">None.</td></tr>' ?></tbody></table></div>
    <h3>Recent problems and refusals</h3>
    <?php if (!$probs): ?><p class="muted" id="adm-noprob">None.</p><?php else: ?>
    <div class="tscroll"><table class="grid small" id="adm-probs"><thead><tr><th>Time (UTC)</th><th>Account</th><th>Tool</th><th>Outcome</th><th>Detail</th></tr></thead><tbody>
      <?php foreach ($probs as $p): ?><tr><td class="nowrap"><?= $when($p['at']) ?></td><td><?= $who($p['orcid'], $p['name']) ?></td><td><?= $tn($p['tool']) ?></td><td<?= in_array($p['outcome'], $FAIL, true) ? ' class="bad"' : '' ?>><?= h($p['outcome']) ?></td><td><?= h((string)$p['detail']) ?></td></tr><?php endforeach; ?></tbody></table></div><?php endif; ?>
  </section>
  <section class="card about" aria-labelledby="adm-hr">
    <h3 id="adm-hr">Retention</h3>
    <p class="small">Accounts not signed in for 24 months are deleted with everything they keep (checked once a day). Not signed in for 23 months or more:</p>
    <?php if (!$old): ?><p class="muted" id="adm-noold">None.</p><?php else: ?><ul class="small" id="adm-old"><?php foreach ($old as $x): ?><li><?= $who($x['orcid'], $x['name']) ?>: last seen <?= h(substr($x['seen'], 0, 10)) ?></li><?php endforeach; ?></ul><?php endif; ?>
    <form method="post" action="yonetim.php" onsubmit="return confirm('Delete every account not signed in for 24 months now?');"><?= $tok ?><input type="hidden" name="act" value="purge"><button type="submit" class="btn ghost small" id="adm-purge">Run the retention rule now</button></form>
  </section>
<?php elseif ($view === 'settings'): ?>
  <section class="card about" aria-labelledby="adm-h">
    <h2 id="adm-h" class="b-h2">Settings</h2>
    <p class="muted small">Stored in the database; they override the defaults of the private config file. The API key and the ORCID client stay in the config file only.</p>
    <form method="post" action="yonetim.php" id="adm-settings"><?= $tok ?><input type="hidden" name="act" value="settings">
      <h3>Default limits</h3>
      <label class="field inline"><span>Interpretations per account per month</span><input type="number" min="0" name="monthly_quota" value="<?= $set['monthly_quota'] ?>" required></label>
      <label class="field inline"><span>Per day (0 = no daily limit)</span><input type="number" min="0" name="daily_quota" value="<?= $set['daily_quota'] ?>" required></label>
      <label class="field inline"><span>Per minute (at least 1)</span><input type="number" min="1" name="per_minute" value="<?= $set['per_minute'] ?>" required></label>
      <p class="muted small">An account's own limits (account page) take precedence. Months and days are counted in UTC.</p>
      <h3>Site-wide monthly caps</h3>
      <label class="field inline"><span>Interpretations per month for the whole site (0 = no cap)</span><input type="number" min="0" name="site_cap" value="<?= $set['site_cap'] ?>" required></label>
      <label class="field inline"><span>Tokens per month, input and output together (0 = no cap)</span><input type="number" min="0" name="site_cap_tokens" value="<?= $set['site_cap_tokens'] ?>" required></label>
      <p class="muted small">When a cap is reached, nobody can ask for an interpretation until the next month (UTC). Keep the spend limit of the API workspace in the Anthropic Console as the last safeguard.</p>
      <h3>Prices for the cost estimate</h3>
      <label class="field inline"><span>USD per million input tokens</span><input type="text" inputmode="decimal" name="price_in" value="<?= h($set['price_in']) ?>" placeholder="e.g. from the Anthropic price list"></label>
      <label class="field inline"><span>USD per million output tokens</span><input type="text" inputmode="decimal" name="price_out" value="<?= h($set['price_out']) ?>"></label>
      <p class="muted small">No prices are built in: enter those of the model in use (config: <?= h((string)$c['anthropic_model']) ?>). Empty = no estimate.</p>
      <h3>Sign-up</h3>
      <div class="radios"><?php foreach (['approval' => 'New accounts wait for approval', 'auto' => 'New accounts are approved automatically', 'closed' => 'Closed to new accounts (existing accounts can still sign in)'] as $k => $lab): ?><label><input type="radio" name="signup" value="<?= $k ?>"<?= $set['signup'] === $k ? ' checked' : '' ?>> <?= h($lab) ?></label><?php endforeach; ?></div>
      <h3>Interpretation service</h3>
      <label class="check"><input type="checkbox" name="ai_enabled" value="1"<?= $set['ai_enabled'] ? ' checked' : '' ?>> The service is on (off: nobody can ask for an interpretation; saved items stay available)</label>
      <label class="field"><span>Message shown while the service is off</span><input type="text" name="ai_off_message" maxlength="300" value="<?= h($set['ai_off_message']) ?>"></label>
      <h3>Announcement</h3>
      <label class="field"><span>Shown to signed-in users on the Account page and in the interpretation card (empty = none)</span><textarea name="announcement" rows="2" maxlength="500"><?= h($set['announcement']) ?></textarea></label>
      <button type="submit" class="btn">Save the settings</button>
    </form>
  </section>
<?php else:
  $rows = $db->query('SELECT a.at, a.admin, a.action, a.orcid, a.detail, u.name FROM audit a LEFT JOIN users u ON u.orcid = a.orcid ORDER BY a.id DESC LIMIT 300')->fetchAll(); ?>
  <section class="card about" aria-labelledby="adm-h">
    <h2 id="adm-h" class="b-h2">Audit log</h2>
    <p class="muted small">Every change made in this panel, and the automatic ones (approval in automatic mode, the end of a temporary block). Kept for 24 months. <a href="yonetim.php?view=audit&amp;csv=1" id="adm-auditcsv">Download all (CSV)</a></p>
    <?php if (!$rows): ?><p class="muted" id="adm-noaudit">No entries yet.</p><?php else: ?>
    <div class="tscroll"><table class="grid small" id="adm-audit"><thead><tr><th>Time (UTC)</th><th>By</th><th>Action</th><th>Account</th><th>Detail</th></tr></thead><tbody>
    <?php foreach ($rows as $e): ?><tr><td class="nowrap"><?= $when($e['at']) ?></td><td><?= h($e['admin'] === $me ? 'you' : $e['admin']) ?></td><td><?= h($e['action']) ?></td>
      <td><?= $e['orcid'] ? ($e['name'] !== null ? '<a href="yonetim.php?view=account&amp;orcid=' . h($e['orcid']) . '">' . h($e['name']) . '</a>' : h($e['orcid']) . ' <span class="muted small">(deleted)</span>') : '–' ?></td><td><?= h($e['detail']) ?></td></tr>
    <?php endforeach; ?></tbody></table></div><?php endif; ?>
  </section>
<?php endif; ?>
<?php site_bottom();
