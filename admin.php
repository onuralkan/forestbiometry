<?php
require __DIR__ . '/inc/common.php';
require __DIR__ . '/inc/totp.php';
header('X-Robots-Tag: noindex, nofollow');
header('X-Frame-Options: DENY');

$flash = $_SESSION['flash'] ?? null; unset($_SESSION['flash']);
function flash(string $msg, string $kind = 'ok'): void { $_SESSION['flash'] = [$kind, $msg]; }
function back(string $q = '') { header('Location: admin.php' . ($q ? "?$q" : '')); exit; }

$auth = auth();
$action = $_POST['action'] ?? '';

// Server rejected the whole request body (file bigger than post_max_size): PHP gives us an empty $_POST.
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$_POST && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
    flash('Dosya sunucunun izin verdiği boyuttan büyük (post_max_size = ' . ini_get('post_max_size') . '). Hosting panelinden PHP ayarlarını yükseltin.', 'err');
    back();
}

// ---------- first run: choose a password ----------
if (empty($auth['hash'])) {
    if ($action === 'setup' && csrf_ok()) {
        $p1 = (string)($_POST['p1'] ?? ''); $p2 = (string)($_POST['p2'] ?? '');
        if (strlen($p1) < 10)      { flash('Şifre en az 10 karakter olmalı.', 'err'); back(); }
        if ($p1 !== $p2)           { flash('Şifreler eşleşmiyor.', 'err'); back(); }
        save_json('auth', ['hash' => password_hash($p1, PASSWORD_DEFAULT), 'fails' => 0, 'locked_until' => 0]);
        session_regenerate_id(true);
        $_SESSION['admin'] = true; $_SESSION['ua'] = $_SERVER['HTTP_USER_AGENT'] ?? '';
        flash('Şifre ayarlandı. Hoş geldiniz.');
        back();
    }
    page_head('Kurulum');
    ?>
    <form method="post" class="card narrow">
      <h1>İlk kurulum</h1>
      <p class="muted">Yönetim paneli için bir şifre belirleyin. Bu ekran yalnızca bir kez görünür.</p>
      <?php show_flash($flash); ?>
      <?= csrf_field() ?><input type="hidden" name="action" value="setup">
      <label>Şifre (en az 10 karakter)<input type="password" name="p1" required minlength="10" autocomplete="new-password"></label>
      <label>Şifre tekrar<input type="password" name="p2" required minlength="10" autocomplete="new-password"></label>
      <button>Kaydet</button>
    </form>
    <?php page_foot(); exit;
}

// ---------- login / logout ----------
if ($action === 'logout' && csrf_ok()) { $_SESSION = []; session_destroy(); header('Location: admin.php'); exit; }

if (!is_admin()) {
    $locked = function () use (&$auth) {
        if (time() < (int)($auth['locked_until'] ?? 0)) {
            flash('Çok fazla hatalı deneme. ' . ceil(($auth['locked_until'] - time()) / 60) . ' dakika sonra tekrar deneyin.', 'err'); back();
        }
    };
    $fail = function (string $msg) use (&$auth) {
        $auth['fails'] = (int)($auth['fails'] ?? 0) + 1;
        if ($auth['fails'] >= 5) { $auth['locked_until'] = time() + 900; $auth['fails'] = 0; unset($_SESSION['pw_ok']); }
        save_json('auth', $auth);
        sleep(1);
        flash($msg, 'err'); back();
    };
    $grant = function () use (&$auth) {
        $auth['fails'] = 0; $auth['locked_until'] = 0;
        save_json('auth', $auth);
        unset($_SESSION['pw_ok']);
        session_regenerate_id(true);
        $_SESSION['admin'] = true; $_SESSION['ua'] = $_SERVER['HTTP_USER_AGENT'] ?? '';
        back();
    };
    $pwOk = !empty($auth['totp']) && isset($_SESSION['pw_ok']) && time() - (int)$_SESSION['pw_ok'] < 300;

    if ($action === 'cancel_2fa' && csrf_ok()) { unset($_SESSION['pw_ok']); back(); }

    if ($action === 'login' && csrf_ok()) {
        $locked();
        if (password_verify((string)($_POST['p'] ?? ''), $auth['hash'])) {
            if (password_needs_rehash($auth['hash'], PASSWORD_DEFAULT)) $auth['hash'] = password_hash($_POST['p'], PASSWORD_DEFAULT);
            if (empty($auth['totp'])) $grant();
            save_json('auth', $auth);
            session_regenerate_id(true);
            $_SESSION['pw_ok'] = time();          // step 1 of 2 done; valid for 5 minutes
            back();
        }
        $fail('Şifre hatalı.');
    }

    if ($action === 'verify_2fa' && csrf_ok()) {
        $locked();
        if (!$pwOk) { flash('Süre doldu, şifrenizi tekrar girin.', 'err'); unset($_SESSION['pw_ok']); back(); }
        $code = trim((string)($_POST['code'] ?? ''));
        $step = totp_verify($auth['totp'], $code, (int)($auth['totp_last'] ?? 0));
        if ($step !== null) { $auth['totp_last'] = $step; $grant(); }
        $h = recovery_hash($code);
        $idx = array_search($h, $auth['recovery'] ?? [], true);
        if (preg_match('/[A-Za-z]/', $code) && $idx !== false) {
            array_splice($auth['recovery'], (int)$idx, 1);
            $left = count($auth['recovery']);
            flash("Kurtarma koduyla giriş yapıldı. $left kod kaldı." . ($left <= 2 ? ' Profil sekmesinden yeni kodlar üretin.' : ''), $left <= 2 ? 'err' : 'ok');
            $f = $_SESSION['flash'];
            $auth['fails'] = 0; $auth['locked_until'] = 0; save_json('auth', $auth);
            unset($_SESSION['pw_ok']); session_regenerate_id(true);
            $_SESSION['admin'] = true; $_SESSION['ua'] = $_SERVER['HTTP_USER_AGENT'] ?? ''; $_SESSION['flash'] = $f;
            back('tab=profile');
        }
        $fail('Kod hatalı. Telefonunuzun saatinin doğru olduğundan emin olun.');
    }

    if ($pwOk) {
        page_head('Doğrulama');
        ?>
        <form method="post" class="card narrow" autocomplete="off">
          <h1>Doğrulama kodu</h1>
          <p class="muted">Kimlik doğrulama uygulamanızdaki 6 haneli kodu girin.</p>
          <?php show_flash($flash); ?>
          <?= csrf_field() ?><input type="hidden" name="action" value="verify_2fa">
          <label>Kod<input name="code" required autofocus inputmode="numeric" autocomplete="one-time-code" maxlength="12" class="otp" placeholder="123 456"></label>
          <button>Doğrula</button>
          <p class="muted small">Telefonunuz yanınızda değilse, kurtarma kodlarınızdan birini (ör. K7QD-M2XP) aynı kutuya yazabilirsiniz.</p>
        </form>
        <form method="post" class="narrow" style="text-align:center;margin-top:-8vh"><?= csrf_field() ?><input type="hidden" name="action" value="cancel_2fa"><button class="link">← Vazgeç</button></form>
        <?php page_foot(); exit;
    }

    page_head('Giriş');
    ?>
    <form method="post" class="card narrow">
      <h1>Yönetim girişi</h1>
      <?php show_flash($flash); ?>
      <?= csrf_field() ?><input type="hidden" name="action" value="login">
      <label>Şifre<input type="password" name="p" required autofocus autocomplete="current-password"></label>
      <button>Giriş</button>
      <p class="muted small"><a href="./">← Siteye dön</a></p>
    </form>
    <?php page_foot(); exit;
}

// ================= logged in =================
if ($action && !csrf_ok()) { flash('Oturum süresi doldu, tekrar deneyin.', 'err'); back(); }

$items = load_json('items', []);
$byId = []; foreach ($items as $k => $it) $byId[$it['id']] = $k;

/** Stores an uploaded file; returns [filename, size, ext] or throws. */
function store_upload(array $f): array {
    if ($f['error'] === UPLOAD_ERR_INI_SIZE || $f['error'] === UPLOAD_ERR_FORM_SIZE)
        throw new RuntimeException('Dosya çok büyük (sunucu sınırı: ' . ini_get('upload_max_filesize') . ').');
    if ($f['error'] !== UPLOAD_ERR_OK) throw new RuntimeException('Yükleme hatası (kod ' . $f['error'] . ').');
    if ($f['size'] > MAX_UPLOAD_MB * 1048576) throw new RuntimeException('Dosya ' . MAX_UPLOAD_MB . ' MB sınırını aşıyor.');
    $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ALLOWED_EXT, true)) throw new RuntimeException('Bu dosya türüne izin verilmiyor: .' . h($ext));
    $base = pathinfo($f['name'], PATHINFO_FILENAME);
    $base = str_replace('.', '-', safe_filename($base));           // no double extensions like x.php.pdf
    if (!is_dir(UPLOAD_DIR)) mkdir(UPLOAD_DIR, 0755, true);
    $name = "$base.$ext"; $i = 2;
    while (file_exists(UPLOAD_DIR . "/$name")) { $name = "$base-$i.$ext"; $i++; }
    if (!move_uploaded_file($f['tmp_name'], UPLOAD_DIR . "/$name"))
        throw new RuntimeException('Dosya kaydedilemedi — files/ klasörünün yazma izni var mı?');
    @chmod(UPLOAD_DIR . "/$name", 0644);
    return [$name, (int)$f['size'], $ext];
}

function title_key(string $t): string {
    $t = strtr($t, ['ç'=>'c','Ç'=>'c','ğ'=>'g','Ğ'=>'g','ı'=>'i','İ'=>'i','ö'=>'o','Ö'=>'o','ş'=>'s','Ş'=>'s','ü'=>'u','Ü'=>'u']);
    return substr((string)preg_replace('/[^a-z0-9]/', '', strtolower(strip_tags($t))), 0, 60);
}

function delete_file(?string $name): void {
    if ($name && basename($name) === $name && is_file(UPLOAD_DIR . "/$name")) @unlink(UPLOAD_DIR . "/$name");
}

// ---------- metadata proxy (fallback when the browser can't reach the APIs directly) ----------
function http_get_json(string $url, array $headers = []) {
    $headers[] = 'User-Agent: onuralkan.com.tr-publist/1.0 (mailto:' . settings()['email'] . ')';
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true, CURLOPT_TIMEOUT => 20,
                                CURLOPT_HTTPHEADER => $headers]);
        $body = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
    } else {
        $ctx = stream_context_create(['http' => ['header' => implode("\r\n", $headers), 'timeout' => 20, 'ignore_errors' => true]]);
        $body = @file_get_contents($url, false, $ctx);
        $code = 0; if (isset($http_response_header[0]) && preg_match('~\s(\d{3})\s~', $http_response_header[0], $m)) $code = (int)$m[1];
    }
    return [$code, $body === false ? null : $body];
}
if (isset($_GET['proxy'])) {
    header('Content-Type: application/json; charset=utf-8');
    $doi = trim((string)($_GET['doi'] ?? ''));
    $id  = trim((string)($_GET['id'] ?? ''));
    switch ($_GET['proxy']) {
        case 'crossref':  $url = 'https://api.crossref.org/works/' . rawurlencode($doi); $hd = []; break;
        case 'unpaywall': $url = 'https://api.unpaywall.org/v2/' . rawurlencode($doi) . '?email=' . rawurlencode(settings()['email']); $hd = []; break;
        case 'orcid':
            if (!preg_match('~^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$~', $id)) { http_response_code(400); echo '{}'; exit; }
            $url = "https://pub.orcid.org/v3.0/$id/works"; $hd = ['Accept: application/json']; break;
        default: http_response_code(400); echo '{}'; exit;
    }
    list($code, $body) = http_get_json($url, $hd);
    http_response_code($code ?: 502);
    echo $body ?: '{}';
    exit;
}

try {
    switch ($action) {
    case 'import_pubs':
        $in = json_decode((string)($_POST['pubs'] ?? '[]'), true);
        if (!is_array($in) || !$in) throw new RuntimeException('Eklenecek yayın seçilmedi.');
        $have = [];   // DOIs and title keys already on the site
        foreach ($items as $it) if ($it['type'] === 'pub') {
            if (!empty($it['doi'])) $have['doi:' . strtolower($it['doi'])] = true;
            foreach (['title_en', 'title_tr'] as $f) if (($k = title_key($it[$f] ?? '')) !== '') $have["t:$k"] = true;
        }
        $added = 0; $skipped = 0;
        foreach (array_slice($in, 0, 500) as $p) {
            if (!is_array($p)) continue;
            $doi = strtolower(trim((string)($p['doi'] ?? '')));
            $doi = preg_replace('~^(https?://(dx\.)?doi\.org/|doi:\s*)~i', '', $doi);
            $ten = mb_substr(trim(strip_tags((string)($p['title_en'] ?? $p['title'] ?? ''))), 0, 500);
            $ttr = mb_substr(trim(strip_tags((string)($p['title_tr'] ?? ''))), 0, 500);
            if ($ten === '' && $ttr === '') { $skipped++; continue; }
            $keys = array_filter([$doi !== '' ? "doi:$doi" : '', ($k = title_key($ten)) !== '' ? "t:$k" : '', ($k = title_key($ttr)) !== '' ? "t:$k" : '']);
            $dup = false; foreach ($keys as $k) if (isset($have[$k])) $dup = true;
            if ($dup) { $skipped++; continue; }
            $kind = in_array($p['kind'] ?? '', ['article','chapter','conference','thesis','other'], true) ? $p['kind'] : 'other';
            $url = https_url((string)($p['url'] ?? ''));
            if ($url !== '' && !preg_match('~^https?://~i', $url)) $url = '';
            $items[] = [
                'id' => bin2hex(random_bytes(6)), 'type' => 'pub', 'date' => date('Y-m-d H:i:s'),
                'title_en' => $ten, 'title_tr' => $ttr,
                'authors' => mb_substr(trim((string)($p['authors'] ?? '')), 0, 1000),
                'venue' => mb_substr(trim((string)($p['venue'] ?? '')), 0, 400),
                'year' => (string)((int)($p['year'] ?? 0) ?: date('Y')),
                'doi' => $doi, 'url' => $url, 'kind' => $kind,
            ];
            foreach ($keys as $k) $have[$k] = true;
            $added++;
        }
        save_json('items', array_values($items));
        flash("$added yayın eklendi" . ($skipped ? ", $skipped tanesi zaten vardı" : '') . '.');
        back('tab=pubs');

    case 'save_item':
        $type = $_POST['type'] === 'pub' ? 'pub' : 'note';
        $id = (string)($_POST['id'] ?? '');
        $editing = $id !== '' && isset($byId[$id]);
        $it = $editing ? $items[$byId[$id]] : ['id' => bin2hex(random_bytes(6)), 'type' => $type, 'date' => date('Y-m-d H:i:s')];
        $fields = $type === 'note'
            ? ['course_tr','course_en','title_tr','title_en','desc_tr','desc_en']
            : ['title_tr','title_en','authors','venue','year','doi','url','kind'];
        foreach ($fields as $fl) $it[$fl] = trim((string)($_POST[$fl] ?? ''));
        if ($type === 'pub') {
            $it['doi'] = preg_replace('~^(https?://(dx\.)?doi\.org/|doi:\s*)~i', '', $it['doi']);
            if ($it['url'] !== '' && !preg_match('~^https?://~i', $it['url'])) $it['url'] = 'https://' . $it['url'];
            if (!in_array($it['kind'], ['article','chapter','conference','thesis','other'], true)) $it['kind'] = 'article';
            $it['year'] = (string)(int)$it['year'] ?: date('Y');
        }
        if ($it['title_tr'] === '' && $it['title_en'] === '') throw new RuntimeException('En az bir dilde başlık girin.');
        if ($type === 'note' && $it['course_tr'] === '' && $it['course_en'] === '') throw new RuntimeException('Ders adını girin.');

        $hasFile = !empty($_FILES['file']) && $_FILES['file']['error'] !== UPLOAD_ERR_NO_FILE;
        if ($hasFile) {
            [$name, $size, $ext] = store_upload($_FILES['file']);
            if ($editing) delete_file($it['file'] ?? null);
            $it['file'] = $name; $it['size'] = $size; $it['ext'] = $ext;
        } elseif ($type === 'note' && empty($it['file'])) {
            throw new RuntimeException('Ders notu için dosya seçin.');
        }
        if ($editing) $items[$byId[$id]] = $it; else $items[] = $it;
        save_json('items', array_values($items));
        flash($editing ? 'Güncellendi.' : 'Eklendi: ' . ($it['title_tr'] ?: $it['title_en']));
        back('tab=' . ($type === 'pub' ? 'pubs' : 'notes'));

    case 'delete':
        $id = (string)($_POST['id'] ?? '');
        if (isset($byId[$id])) {
            $it = $items[$byId[$id]];
            delete_file($it['file'] ?? null);
            unset($items[$byId[$id]]);
            save_json('items', array_values($items));
            flash('Silindi.');
            back('tab=' . ($it['type'] === 'pub' ? 'pubs' : 'notes'));
        }
        back();

    case 'save_settings':
        $s = settings();
        foreach (array_keys(default_settings()) as $k) if (isset($_POST[$k])) $s[$k] = trim((string)$_POST[$k]);
        foreach (['scholar','orcid','researchgate','yoksis'] as $k)
            if ($s[$k] !== '' && !preg_match('~^https?://~i', $s[$k])) $s[$k] = 'https://' . $s[$k];
        if (!empty($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
            $info = @getimagesize($_FILES['photo']['tmp_name']);
            if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true))
                throw new RuntimeException('Fotoğraf JPG, PNG veya WEBP olmalı.');
            if (!is_dir(UPLOAD_DIR)) mkdir(UPLOAD_DIR, 0755, true);
            $dest = UPLOAD_DIR . '/profile.jpg';
            if (function_exists('imagecreatefromstring')) {   // re-encode: resizes and strips anything hidden in the file
                $src = imagecreatefromstring((string)file_get_contents($_FILES['photo']['tmp_name']));
                $w = imagesx($src); $hh = imagesy($src); $side = min($w, $hh);
                $out = imagecreatetruecolor(480, 480);
                imagecopyresampled($out, $src, 0, 0, (int)(($w - $side) / 2), (int)(($hh - $side) / 2), 480, 480, $side, $side);
                imagejpeg($out, $dest, 85);
            } elseif ($info[2] === IMAGETYPE_JPEG) {
                move_uploaded_file($_FILES['photo']['tmp_name'], $dest);
            } else throw new RuntimeException('Sunucuda GD yok; lütfen JPG yükleyin.');
        }
        if (!empty($_POST['remove_photo'])) @unlink(UPLOAD_DIR . '/profile.jpg');
        save_json('settings', $s);
        flash('Profil kaydedildi.');
        back('tab=profile');

    case 'totp_begin':
        $_SESSION['totp_pending'] = totp_new_secret();
        back('tab=profile#iki-adim');

    case 'totp_cancel':
        unset($_SESSION['totp_pending']);
        back('tab=profile#iki-adim');

    case 'totp_enable':
        $sec = (string)($_SESSION['totp_pending'] ?? '');
        if ($sec === '') throw new RuntimeException('Kurulum süresi doldu, baştan başlayın.');
        $step = totp_verify($sec, (string)($_POST['code'] ?? ''));
        if ($step === null) throw new RuntimeException('Kod tutmadı. Uygulamadaki güncel kodu girin; telefonun saati otomatik ayarda olmalı.');
        list($plain, $hashed) = recovery_codes();
        $auth['totp'] = $sec; $auth['totp_last'] = $step; $auth['recovery'] = $hashed;
        save_json('auth', $auth);
        unset($_SESSION['totp_pending']);
        $_SESSION['show_recovery'] = $plain;
        flash('İki adımlı doğrulama açıldı. Kurtarma kodlarınızı şimdi kaydedin.');
        back('tab=profile#iki-adim');

    case 'totp_regen':
        if (empty($auth['totp'])) back('tab=profile');
        $step = totp_verify($auth['totp'], (string)($_POST['code'] ?? ''), (int)($auth['totp_last'] ?? 0));
        if ($step === null) throw new RuntimeException('Kod hatalı.');
        list($plain, $hashed) = recovery_codes();
        $auth['totp_last'] = $step; $auth['recovery'] = $hashed;
        save_json('auth', $auth);
        $_SESSION['show_recovery'] = $plain;
        flash('Yeni kurtarma kodları üretildi. Eskiler artık geçersiz.');
        back('tab=profile#iki-adim');

    case 'totp_disable':
        if (!password_verify((string)($_POST['p'] ?? ''), $auth['hash'])) throw new RuntimeException('Şifre hatalı.');
        if (totp_verify($auth['totp'] ?? '', (string)($_POST['code'] ?? ''), (int)($auth['totp_last'] ?? 0)) === null)
            throw new RuntimeException('Kod hatalı.');
        unset($auth['totp'], $auth['totp_last'], $auth['recovery']);
        save_json('auth', $auth);
        flash('İki adımlı doğrulama kapatıldı.');
        back('tab=profile#iki-adim');

    case 'change_pw':
        if (!password_verify((string)($_POST['old'] ?? ''), $auth['hash'])) throw new RuntimeException('Mevcut şifre hatalı.');
        if (strlen((string)$_POST['p1']) < 10) throw new RuntimeException('Yeni şifre en az 10 karakter olmalı.');
        if ($_POST['p1'] !== $_POST['p2']) throw new RuntimeException('Yeni şifreler eşleşmiyor.');
        $auth['hash'] = password_hash((string)$_POST['p1'], PASSWORD_DEFAULT);
        save_json('auth', $auth);
        flash('Şifre değiştirildi.');
        back('tab=profile');
    }
} catch (RuntimeException $e) {
    flash($e->getMessage(), 'err');
    if (in_array($action, ['save_settings', 'change_pw', 'totp_enable', 'totp_regen', 'totp_disable'], true)) $tabBack = 'profile';
    elseif (($_POST['type'] ?? '') === 'pub') $tabBack = 'pubs';
    else $tabBack = 'notes';
    back(http_build_query(array_filter(['tab' => $tabBack, 'edit' => $_POST['id'] ?? null])) . (strpos($action, 'totp_') === 0 ? '#iki-adim' : ''));
}

// ---------- views ----------
$tab = $_GET['tab'] ?? 'notes';
$edit = isset($_GET['edit'], $byId[$_GET['edit']]) ? $items[$byId[$_GET['edit']]] : null;
if ($edit) $tab = $edit['type'] === 'pub' ? 'pubs' : 'notes';
$S = settings();

$notes = array_filter($items, fn($i) => $i['type'] === 'note');
$pubs  = array_filter($items, fn($i) => $i['type'] === 'pub');
usort($pubs, fn($a, $b) => [(int)$b['year'], $b['date']] <=> [(int)$a['year'], $a['date']]);
$courseNames = array_values(array_unique(array_filter(array_map(fn($n) => $n['course_tr'], $notes))));
$courseNamesEn = array_values(array_unique(array_filter(array_map(fn($n) => $n['course_en'], $notes))));
usort($notes, fn($a, $b) => [$a['course_tr'], $b['date']] <=> [$b['course_tr'], $a['date']]);

$v = fn(string $k) => h((string)($edit[$k] ?? ''));
$toMb = function (string $v): int { $n = (int)$v; if ($n <= 0) return PHP_INT_MAX; $u = strtoupper(substr(trim($v), -1));
    return $u === 'G' ? $n * 1024 : ($u === 'M' ? $n : ($u === 'K' ? max(1, intdiv($n, 1024)) : max(1, intdiv($n, 1048576)))); };
$limit = min(MAX_UPLOAD_MB, $toMb((string)ini_get('upload_max_filesize')), $toMb((string)ini_get('post_max_size'))) . ' MB';
$accept = '.' . implode(',.', ALLOWED_EXT);

page_head('Yönetim');
?>
<header class="bar">
  <strong>Yönetim paneli</strong>
  <nav class="tabs">
    <a href="?tab=notes" class="<?= $tab === 'notes' ? 'on' : '' ?>">Ders notları <span><?= count($notes) ?></span></a>
    <a href="?tab=pubs" class="<?= $tab === 'pubs' ? 'on' : '' ?>">Yayınlar <span><?= count($pubs) ?></span></a>
    <a href="?tab=profile" class="<?= $tab === 'profile' ? 'on' : '' ?>">Profil</a>
  </nav>
  <span class="grow"></span>
  <a href="./" target="_blank">Siteyi gör ↗</a>
  <form method="post" class="inline"><?= csrf_field() ?><input type="hidden" name="action" value="logout"><button class="link">Çıkış</button></form>
</header>
<main class="adm">
<?php show_flash($flash); ?>

<?php if ($tab === 'notes'): ?>
  <form method="post" enctype="multipart/form-data" class="card">
    <h2><?= $edit ? 'Ders notunu düzenle' : 'Yeni ders notu yükle' ?></h2>
    <?= csrf_field() ?><input type="hidden" name="action" value="save_item"><input type="hidden" name="type" value="note"><input type="hidden" name="id" value="<?= $v('id') ?>">
    <div class="grid2">
      <label>Ders adı (TR)<input name="course_tr" list="courses" value="<?= $v('course_tr') ?>" placeholder="Bilgi Teknolojileri ve Yapay Zeka"></label>
      <label>Ders adı (EN)<input name="course_en" list="courses_en" value="<?= $v('course_en') ?>" placeholder="Information Technologies and AI"></label>
      <label>Başlık (TR)<input name="title_tr" value="<?= $v('title_tr') ?>" placeholder="Hafta 3 – Regresyon"></label>
      <label>Başlık (EN)<input name="title_en" value="<?= $v('title_en') ?>" placeholder="Week 3 – Regression"></label>
      <label>Açıklama (TR, isteğe bağlı)<input name="desc_tr" value="<?= $v('desc_tr') ?>"></label>
      <label>Açıklama (EN, isteğe bağlı)<input name="desc_en" value="<?= $v('desc_en') ?>"></label>
    </div>
    <datalist id="courses"><?php foreach ($courseNames as $c): ?><option value="<?= h($c) ?>"><?php endforeach; ?></datalist>
    <datalist id="courses_en"><?php foreach ($courseNamesEn as $c): ?><option value="<?= h($c) ?>"><?php endforeach; ?></datalist>
    <label class="drop">
      <input type="file" name="file" accept="<?= $accept ?>" <?= $edit ? '' : 'required' ?>>
      <span><?= $edit ? 'Dosyayı değiştirmek için yeni dosya seçin (boş bırakırsanız mevcut dosya kalır: ' . $v('file') . ')' : 'Dosyayı buraya sürükleyin veya tıklayın' ?></span>
      <small>PDF, Office, ZIP, R/Python kodu… En fazla <?= h($limit) ?></small>
    </label>
    <p class="hint muted">Boş bıraktığınız dil alanında diğer dildeki metin gösterilir.</p>
    <div class="row"><button><?= $edit ? 'Kaydet' : 'Yükle' ?></button><?php if ($edit): ?><a href="?tab=notes">Vazgeç</a><?php endif; ?></div>
  </form>

  <div class="card">
    <h2>Yüklü ders notları</h2>
    <?php if (!$notes): ?><p class="muted">Henüz yok.</p><?php endif; ?>
    <table class="list">
      <?php $lc = null; foreach ($notes as $n): if ($n['course_tr'] !== $lc): $lc = $n['course_tr']; ?>
        <tr class="grp"><th colspan="4"><?= h($n['course_tr'] ?: $n['course_en']) ?></th></tr>
      <?php endif; ?>
        <tr>
          <td><a href="files/<?= rawurlencode($n['file']) ?>" target="_blank"><?= h($n['title_tr'] ?: $n['title_en']) ?></a></td>
          <td class="muted"><?= h(strtoupper($n['ext'])) ?> · <?= human_size((int)$n['size']) ?></td>
          <td class="muted"><?= h(substr($n['date'], 0, 10)) ?></td>
          <td class="acts"><a href="?edit=<?= h($n['id']) ?>">Düzenle</a> <?= del_btn($n) ?></td>
        </tr>
      <?php endforeach; ?>
    </table>
  </div>

<?php elseif ($tab === 'pubs'): ?>
  <?php if (!$edit):
    $orcidId = preg_match('~(\d{4}-\d{4}-\d{4}-\d{3}[\dX])~', $S['orcid'], $m) ? $m[1] : '';
    $haveDois = array_values(array_filter(array_map(function ($p) { return strtolower($p['doi'] ?? ''); }, $pubs)));
    $haveTitles = [];
    foreach ($pubs as $p) foreach (['title_en','title_tr'] as $f) if (($k = title_key($p[$f] ?? '')) !== '') $haveTitles[] = $k;
  ?>
  <div class="card" id="importer">
    <h2>DOI veya ORCID'den otomatik ekle</h2>
    <p class="muted small">Her satıra bir DOI (veya doi.org bağlantısı) yapıştırın ya da ORCID numaranızı yazın. Başlık, yazarlar, dergi, yıl ve tür Crossref'ten; açık erişim PDF bağlantısı Unpaywall'dan gelir.</p>
    <textarea id="imp-in" rows="4" placeholder="10.3390/f15010123&#10;https://doi.org/10.1016/j.foreco.2024.121999&#10;0000-0002-1825-0097"></textarea>
    <div class="row">
      <button type="button" id="imp-go">Getir</button>
      <?php if ($orcidId): ?><button type="button" class="link" id="imp-orcid" data-id="<?= h($orcidId) ?>">ORCID profilimdeki tüm yayınları getir (<?= h($orcidId) ?>)</button>
      <?php else: ?><span class="muted small">İpucu: Profil sekmesine ORCID bağlantınızı eklerseniz tek tıkla hepsini çekebilirsiniz.</span><?php endif; ?>
    </div>
    <p class="muted small" style="margin:10px 0 0">veya hazır bir yayın listesi dosyası (.json) yükleyin:
      <input type="file" id="imp-file" accept=".json,application/json" style="display:inline;width:auto;margin-left:6px"></p>
    <p id="imp-status" class="muted small"></p>
    <div id="imp-out" hidden>
      <table class="list" id="imp-table"></table>
      <form method="post" id="imp-form" class="row">
        <?= csrf_field() ?><input type="hidden" name="action" value="import_pubs"><input type="hidden" name="pubs" id="imp-json">
        <button>Seçilenleri ekle</button><span class="muted small" id="imp-count"></span>
      </form>
    </div>
  </div>
  <script>
  (() => {
    const HAVE = new Set(<?= json_encode($haveDois) ?>), HAVE_T = new Set(<?= json_encode(array_values(array_unique($haveTitles))) ?>);
    const TRMAP = { ç:'c', Ç:'c', ğ:'g', Ğ:'g', ı:'i', İ:'i', ö:'o', Ö:'o', ş:'s', Ş:'s', ü:'u', Ü:'u' };
    const tkey = s => (s || '').replace(/<[^>]*>/g, '').replace(/[çÇğĞıİöÖşŞüÜ]/g, c => TRMAP[c]).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
    const isDup = p => (p.doi && HAVE.has(p.doi.toLowerCase())) || [p.title_en, p.title_tr, p.title].some(t => tkey(t) && HAVE_T.has(tkey(t)));
    const $ = id => document.getElementById(id);
    const st = $('imp-status');
    let rows = [];

    async function getJSON(direct, proxy, headers) {
      try { const r = await fetch(direct, { headers }); if (r.ok) return await r.json(); if (r.status === 404) return null; } catch (e) {}
      const r = await fetch('admin.php?' + proxy, { credentials: 'same-origin' });   // fallback via our server
      return r.ok ? r.json() : null;
    }
    const cleanDoi = s => s.trim().replace(/^(https?:\/\/(dx\.)?doi\.org\/|doi:\s*)/i, '').replace(/[.,;]+$/, '').toLowerCase();
    const strip = s => { const d = document.createElement('div'); d.innerHTML = s || ''; return d.textContent.replace(/\s+/g, ' ').trim(); };
    const KIND = { 'journal-article': 'article', 'book-chapter': 'chapter', 'proceedings-article': 'conference',
                   'dissertation': 'thesis', 'book': 'other', 'posted-content': 'other' };

    async function crossref(doi) {
      const j = await getJSON('https://api.crossref.org/works/' + encodeURIComponent(doi), 'proxy=crossref&doi=' + encodeURIComponent(doi));
      if (!j || !j.message) return null;
      const m = j.message;
      const authors = (m.author || []).map(a => a.family
        ? a.family + ' ' + (a.given || '').split(/[\s-]+/).filter(Boolean).map(g => g[0] + '.').join('')
        : (a.name || '')).filter(Boolean).join(', ');
      const dp = (m['published-print'] || m['published-online'] || m.issued || {})['date-parts'];
      let venue = (m['container-title'] || [])[0] || m.publisher || '';
      if (m.volume) venue += ', ' + m.volume + (m.issue ? '(' + m.issue + ')' : '');
      if (m.page) venue += ', ' + m.page; else if (m['article-number']) venue += ', ' + m['article-number'];
      let title = strip((m.title || [])[0]);
      if (m.subtitle && m.subtitle[0]) title += ': ' + strip(m.subtitle[0]);
      return { doi, title, authors, venue, year: dp && dp[0] && dp[0][0] || '', kind: KIND[m.type] || 'other', url: '' };
    }
    async function unpaywall(p) {
      try {
        const em = <?= json_encode($S['email']) ?>;
        const j = await getJSON('https://api.unpaywall.org/v2/' + encodeURIComponent(p.doi) + '?email=' + encodeURIComponent(em),
                                'proxy=unpaywall&doi=' + encodeURIComponent(p.doi));
        const loc = j && j.best_oa_location;
        if (loc) p.url = loc.url_for_pdf || loc.url || '';
      } catch (e) {}
    }
    async function orcidDois(id) {
      const j = await getJSON('https://pub.orcid.org/v3.0/' + id + '/works', 'proxy=orcid&id=' + id, { Accept: 'application/json' });
      if (!j || !j.group) throw new Error('ORCID kaydı okunamadı (' + id + ').');
      const out = [];
      j.group.forEach(g => (g['external-ids'] && g['external-ids']['external-id'] || [])
        .forEach(x => { if (x['external-id-type'] === 'doi') out.push(cleanDoi(x['external-id-value'])); }));
      return [...new Set(out)];
    }

    async function run(lines) {
      $('imp-out').hidden = true; rows = [];
      let dois = [];
      for (const l of lines) {
        const o = l.match(/\d{4}-\d{4}-\d{4}-\d{3}[\dX]/);
        if (o && !/10\.\d{4,}/.test(l)) { st.textContent = 'ORCID okunuyor…'; dois.push(...await orcidDois(o[0])); }
        else if (/10\.\d{4,}\//.test(l)) dois.push(cleanDoi(l));
      }
      dois = [...new Set(dois)];
      if (!dois.length) { st.textContent = 'Geçerli bir DOI veya ORCID bulunamadı.'; return; }
      let done = 0, fail = [];
      const queue = dois.slice();
      async function worker() {
        while (queue.length) {
          const d = queue.shift();
          const p = await crossref(d).catch(() => null);
          if (p) { p.title_en = p.title; delete p.title; if (!HAVE.has(d)) await unpaywall(p); rows.push(p); } else fail.push(d);
          st.textContent = 'Getiriliyor… ' + (++done) + ' / ' + dois.length;
        }
      }
      await Promise.all([worker(), worker(), worker(), worker()]);
      rows.sort((a, b) => (b.year || 0) - (a.year || 0));
      render();
      st.textContent = rows.length + ' yayın bulundu' + (fail.length ? '. Bulunamayan: ' + fail.join(', ') : '.');
    }

    const KLBL = { article: 'Makale', chapter: 'Kitap bölümü', conference: 'Bildiri', thesis: 'Tez', other: 'Diğer' };
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    function render() {
      $('imp-table').innerHTML = rows.map((p, i) => {
        const dup = isDup(p);
        return `<tr class="${dup ? 'dup' : ''}"><td><input type="checkbox" data-i="${i}" ${dup ? 'disabled' : 'checked'} style="width:auto"></td>
          <td class="muted">${esc(p.year)}</td>
          <td><strong>${esc(p.title_tr && !p.title_en ? p.title_tr : (p.title_en || p.title || ''))}</strong>${p.title_en && p.title_tr ? '<br><span class="muted small">' + esc(p.title_tr) + '</span>' : ''}<br><span class="muted small">${esc(p.authors)}<br><em>${esc(p.venue)}</em></span></td>
          <td class="muted small">${dup ? 'Zaten ekli' : KLBL[p.kind]}${p.url && !dup ? '<br>Açık erişim ✓' : ''}</td></tr>`;
      }).join('');
      $('imp-out').hidden = !rows.length;
      count();
    }
    function count() { $('imp-count').textContent = $('imp-table').querySelectorAll('input:checked').length + ' seçili'; }
    $('imp-table').addEventListener('change', count);
    $('imp-form').addEventListener('submit', e => {
      const sel = [...$('imp-table').querySelectorAll('input:checked')].map(c => rows[+c.dataset.i]);
      if (!sel.length) { e.preventDefault(); return; }
      $('imp-json').value = JSON.stringify(sel);
    });
    async function go(lines) {
      const btn = $('imp-go'); btn.disabled = true;
      try { await run(lines); } catch (e) { st.textContent = e.message; } finally { btn.disabled = false; }
    }
    $('imp-file').addEventListener('change', async e => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        if (!Array.isArray(data)) throw new Error();
        rows = data.filter(p => p && (p.title_en || p.title_tr || p.title));
        rows.sort((a, b) => (b.year || 0) - (a.year || 0));
        render();
        const dups = rows.filter(isDup).length;
        st.textContent = rows.length + ' yayın okundu' + (dups ? ', ' + dups + ' tanesi zaten sitede.' : '.');
      } catch (err) { st.textContent = 'Dosya okunamadı: geçerli bir yayın listesi (JSON) değil.'; }
      e.target.value = '';
    });
    $('imp-go').addEventListener('click', () => go($('imp-in').value.split(/\n+/).filter(s => s.trim())));
    const ob = $('imp-orcid'); if (ob) ob.addEventListener('click', () => go([ob.dataset.id]));
  })();
  </script>
  <?php endif; ?>
  <form method="post" enctype="multipart/form-data" class="card">
    <h2><?= $edit ? 'Yayını düzenle' : 'Yeni yayın ekle' ?></h2>
    <?= csrf_field() ?><input type="hidden" name="action" value="save_item"><input type="hidden" name="type" value="pub"><input type="hidden" name="id" value="<?= $v('id') ?>">
    <div class="grid2">
      <label class="span2">Başlık (orijinal dilinde)<input name="title_en" value="<?= $v('title_en') ?>" placeholder="Comparing Weibull parameter estimation methods for Pinus nigra stands"></label>
      <label class="span2">Başlık çevirisi (isteğe bağlı — TR sayfada gösterilir)<input name="title_tr" value="<?= $v('title_tr') ?>"></label>
      <label class="span2">Yazarlar<input name="authors" value="<?= $v('authors') ?>" placeholder="Alkan O., Yılmaz A., …"></label>
      <label class="span2">Dergi / kitap / kongre<input name="venue" value="<?= $v('venue') ?>" placeholder="Forest Ecology and Management, 512, 120145"></label>
      <label>Yıl<input name="year" type="number" min="1980" max="2100" value="<?= $v('year') ?: date('Y') ?>"></label>
      <label>Tür
        <select name="kind"><?php foreach (['article'=>'Makale','chapter'=>'Kitap bölümü','conference'=>'Bildiri','thesis'=>'Tez','other'=>'Diğer'] as $k => $lbl): ?>
          <option value="<?= $k ?>" <?= ($edit['kind'] ?? 'article') === $k ? 'selected' : '' ?>><?= $lbl ?></option><?php endforeach; ?></select>
      </label>
      <label>DOI (isteğe bağlı)<input name="doi" value="<?= $v('doi') ?>" placeholder="10.1016/j.foreco.2026.120145"></label>
      <label>Bağlantı (isteğe bağlı)<input name="url" value="<?= $v('url') ?>" placeholder="https://…"></label>
    </div>
    <label class="drop">
      <input type="file" name="file" accept="<?= $accept ?>">
      <span><?= !empty($edit['file']) ? 'Mevcut dosya: ' . $v('file') . ' — değiştirmek için yeni dosya seçin' : 'PDF (isteğe bağlı) — yayıncının izin verdiği sürümü yükleyin' ?></span>
      <small>En fazla <?= h($limit) ?></small>
    </label>
    <div class="row"><button><?= $edit ? 'Kaydet' : 'Ekle' ?></button><?php if ($edit): ?><a href="?tab=pubs">Vazgeç</a><?php endif; ?></div>
  </form>

  <div class="card">
    <h2>Yayınlar</h2>
    <?php if (!$pubs): ?><p class="muted">Henüz yok.</p><?php endif; ?>
    <table class="list">
      <?php foreach ($pubs as $p): ?>
        <tr>
          <td class="muted"><?= h((string)$p['year']) ?></td>
          <td><?= h($p['title_en'] ?: $p['title_tr']) ?><br><span class="muted small"><?= h($p['venue']) ?></span></td>
          <td class="muted"><?= !empty($p['file']) ? 'PDF ✓' : '' ?></td>
          <td class="acts"><a href="?edit=<?= h($p['id']) ?>">Düzenle</a> <?= del_btn($p) ?></td>
        </tr>
      <?php endforeach; ?>
    </table>
  </div>

<?php else: ?>
  <form method="post" enctype="multipart/form-data" class="card">
    <h2>Profil</h2>
    <?= csrf_field() ?><input type="hidden" name="action" value="save_settings">
    <div class="grid2">
      <label class="span2">Ad Soyad<input name="name" value="<?= h($S['name']) ?>"></label>
      <label>Unvan (TR)<input name="title_tr" value="<?= h($S['title_tr']) ?>"></label>
      <label>Unvan (EN)<input name="title_en" value="<?= h($S['title_en']) ?>"></label>
      <label>Kurum (TR)<input name="affil_tr" value="<?= h($S['affil_tr']) ?>"></label>
      <label>Kurum (EN)<input name="affil_en" value="<?= h($S['affil_en']) ?>"></label>
      <label>Kısa özgeçmiş (TR)<textarea name="bio_tr" rows="5"><?= h($S['bio_tr']) ?></textarea></label>
      <label>Kısa özgeçmiş (EN)<textarea name="bio_en" rows="5"><?= h($S['bio_en']) ?></textarea></label>
      <label>Çalışma alanları (TR, virgülle)<textarea name="interests_tr" rows="2"><?= h($S['interests_tr']) ?></textarea></label>
      <label>Çalışma alanları (EN, virgülle)<textarea name="interests_en" rows="2"><?= h($S['interests_en']) ?></textarea></label>
      <label>Ofis (TR)<textarea name="office_tr" rows="2"><?= h($S['office_tr']) ?></textarea></label>
      <label>Ofis (EN)<textarea name="office_en" rows="2"><?= h($S['office_en']) ?></textarea></label>
      <label class="span2">E-posta<input name="email" type="email" value="<?= h($S['email']) ?>"></label>
      <label>Google Scholar<input name="scholar" value="<?= h($S['scholar']) ?>"></label>
      <label>ORCID<input name="orcid" value="<?= h($S['orcid']) ?>" placeholder="https://orcid.org/0000-…"></label>
      <label>ResearchGate<input name="researchgate" value="<?= h($S['researchgate']) ?>"></label>
      <label>YÖKSİS / AVESİS<input name="yoksis" value="<?= h($S['yoksis']) ?>"></label>
      <label class="span2">Profil fotoğrafı (kare kırpılır)<input type="file" name="photo" accept="image/jpeg,image/png,image/webp">
        <?php if (is_file(UPLOAD_DIR . '/profile.jpg')): ?><span class="small"><input type="checkbox" name="remove_photo" value="1" style="width:auto"> Mevcut fotoğrafı kaldır</span><?php endif; ?></label>
    </div>
    <div class="row"><button>Kaydet</button></div>
  </form>

  <form method="post" class="card">
    <h2>Şifre değiştir</h2>
    <?= csrf_field() ?><input type="hidden" name="action" value="change_pw">
    <div class="grid2">
      <label class="span2">Mevcut şifre<input type="password" name="old" required autocomplete="current-password"></label>
      <label>Yeni şifre<input type="password" name="p1" required minlength="10" autocomplete="new-password"></label>
      <label>Yeni şifre tekrar<input type="password" name="p2" required minlength="10" autocomplete="new-password"></label>
    </div>
    <div class="row"><button>Değiştir</button></div>
  </form>

  <?php
    $pending = $_SESSION['totp_pending'] ?? null;
    $showRec = $_SESSION['show_recovery'] ?? null; unset($_SESSION['show_recovery']);
    $host = preg_replace('/^www\./', '', (string)($_SERVER['HTTP_HOST'] ?? 'site'));
  ?>
  <div class="card" id="iki-adim">
    <h2>İki adımlı doğrulama <span class="badge <?= empty($auth['totp']) ? 'off' : 'on' ?>"><?= empty($auth['totp']) ? 'Kapalı' : 'Açık' ?></span></h2>

    <?php if ($showRec): ?>
      <div class="rec">
        <p><strong>Kurtarma kodlarınız.</strong> Her biri bir kez kullanılabilir. Telefonunuzu kaybederseniz giriş yapmanın tek yolu bunlar. Bu sayfadan çıkınca bir daha gösterilmez.</p>
        <ol class="codes"><?php foreach ($showRec as $c): ?><li><?= h($c) ?></li><?php endforeach; ?></ol>
        <div class="row">
          <button type="button" class="link" id="rec-copy">Kopyala</button>
          <a href="#" id="rec-dl" download="<?= h($host) ?>-kurtarma-kodlari.txt">Metin dosyası olarak indir</a>
        </div>
      </div>
      <script>
      (() => {
        const txt = <?= json_encode("$host yönetim paneli, kurtarma kodları (" . date('d.m.Y') . ")\n\n" . implode("\n", $showRec) . "\n") ?>;
        document.getElementById('rec-dl').href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' }));
        const b = document.getElementById('rec-copy');
        b.addEventListener('click', async () => { try { await navigator.clipboard.writeText(txt); b.textContent = 'Kopyalandı'; } catch (e) {} });
      })();
      </script>
    <?php endif; ?>

    <?php if (empty($auth['totp']) && !$pending): ?>
      <p class="muted">Açıkken girişte şifreye ek olarak telefonunuzdaki bir uygulamanın ürettiği 6 haneli kod sorulur. Şifreniz çalınsa bile kod olmadan kimse giremez.
        Google Authenticator, Microsoft Authenticator, Aegis veya 1Password gibi bir uygulama gerekir.</p>
      <form method="post"><?= csrf_field() ?><input type="hidden" name="action" value="totp_begin"><button>Kurulumu başlat</button></form>

    <?php elseif ($pending): $uri = totp_uri($pending, 'admin', $host); ?>
      <div class="totp-setup">
        <div>
          <div id="qr" class="qr" aria-label="Kurulum için QR kod"></div>
          <script src="assets/qrcode.js"></script>
          <script>
            (() => { const q = qrcode(0, 'M'); q.addData(<?= json_encode($uri) ?>); q.make();
              document.getElementById('qr').innerHTML = q.createSvgTag({ cellSize: 5, margin: 3, scalable: true }); })();
          </script>
        </div>
        <div>
          <ol class="steps">
            <li>Telefonunuzda kimlik doğrulama uygulamasını açın ve <strong>QR kodu tarayın</strong>.</li>
            <li>Tarayamıyorsanız bu anahtarı elle girin:<br><code class="key"><?= h(trim(chunk_split($pending, 4, ' '))) ?></code></li>
            <li>Uygulamada görünen 6 haneli kodu aşağıya yazın.</li>
          </ol>
          <form method="post" class="row" autocomplete="off">
            <?= csrf_field() ?><input type="hidden" name="action" value="totp_enable">
            <input name="code" required inputmode="numeric" autocomplete="one-time-code" maxlength="7" class="otp" placeholder="123 456" aria-label="6 haneli kod" style="max-width:160px">
            <button>Doğrula ve aç</button>
          </form>
          <form method="post"><?= csrf_field() ?><input type="hidden" name="action" value="totp_cancel"><button class="link">Vazgeç</button></form>
        </div>
      </div>

    <?php else: ?>
      <p class="muted">Girişte telefonunuzdaki kod soruluyor. Kalan kurtarma kodu: <strong><?= count($auth['recovery'] ?? []) ?></strong></p>
      <div class="grid2">
        <form method="post" autocomplete="off">
          <?= csrf_field() ?><input type="hidden" name="action" value="totp_regen">
          <label>Yeni kurtarma kodları üret (uygulamadaki güncel kod)<input name="code" required inputmode="numeric" maxlength="7" class="otp" placeholder="123 456"></label>
          <button>Yeni kodlar üret</button>
        </form>
        <form method="post" autocomplete="off" onsubmit="return confirm('İki adımlı doğrulama kapatılsın mı?')">
          <?= csrf_field() ?><input type="hidden" name="action" value="totp_disable">
          <label>Kapatmak için şifreniz<input type="password" name="p" required autocomplete="current-password"></label>
          <label>ve uygulamadaki güncel kod<input name="code" required inputmode="numeric" maxlength="7" class="otp" placeholder="123 456"></label>
          <button class="danger-btn">Kapat</button>
        </form>
      </div>
    <?php endif; ?>
  </div>
<?php endif; ?>
</main>
<script>
document.querySelectorAll('.drop input[type=file]').forEach(inp => {
  const lab = inp.closest('.drop'), span = lab.querySelector('span');
  inp.addEventListener('change', () => { if (inp.files[0]) { span.textContent = inp.files[0].name + ' (' + (inp.files[0].size/1048576).toFixed(1) + ' MB)'; lab.classList.add('has'); } });
  ['dragenter','dragover'].forEach(e => lab.addEventListener(e, ev => { ev.preventDefault(); lab.classList.add('over'); }));
  ['dragleave','drop'].forEach(e => lab.addEventListener(e, () => lab.classList.remove('over')));
  lab.addEventListener('drop', ev => { ev.preventDefault(); inp.files = ev.dataTransfer.files; inp.dispatchEvent(new Event('change')); });
});
document.querySelectorAll('form').forEach(f => f.addEventListener('submit', () => { const b = f.querySelector('button:not(.link)'); if (b && f.querySelector('input[type=file]')?.files?.length) { b.disabled = true; b.textContent = 'Yükleniyor…'; } }));
</script>
<?php page_foot();

// ---------- layout helpers ----------
function del_btn(array $it): string {
    return '<form method="post" class="inline" onsubmit="return confirm(\'Silinsin mi? Dosya da silinecek.\')">' . csrf_field()
        . '<input type="hidden" name="action" value="delete"><input type="hidden" name="id" value="' . h($it['id']) . '">'
        . '<button class="link danger">Sil</button></form>';
}
function show_flash(?array $f): void { if ($f) echo '<div class="flash ' . h($f[0]) . '">' . h($f[1]) . '</div>'; }
function page_head(string $title): void { ?><!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title><?= h($title) ?> · Yönetim</title>
<link rel="stylesheet" href="assets/style.css?v=1"><link rel="stylesheet" href="assets/admin.css?v=2"></head><body class="admin"><?php }
function page_foot(): void { echo '</body></html>'; }
