<?php
// Shared helpers. Not web-accessible (see inc/.htaccess).
declare(strict_types=1);

date_default_timezone_set('Europe/Istanbul');

const ROOT        = __DIR__ . '/..';
const DATA_DIR    = ROOT . '/data';
const UPLOAD_DIR  = ROOT . '/files';
const MAX_UPLOAD_MB = 50;
const ALLOWED_EXT = ['pdf','doc','docx','ppt','pptx','xls','xlsx','csv','txt','zip','rar','7z','r','rmd','py','ipynb','sas','png','jpg','jpeg'];

ini_set('session.cookie_httponly', '1');
ini_set('session.use_strict_mode', '1');
if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
    ini_set('session.cookie_secure', '1');
}
session_name('oa_sess');
session_start();

function h(?string $s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

// Data is stored as .php files whose first line exits, so even a server that
// ignores .htaccess (e.g. nginx) never serves the JSON to a browser.
const DATA_GUARD = "<?php http_response_code(404); exit; ?>\n";

function load_json(string $name, $default) {
    $f = DATA_DIR . "/$name.php";
    if (!is_file($f)) return $default;
    $raw = (string)file_get_contents($f);
    if (strncmp($raw, DATA_GUARD, strlen(DATA_GUARD)) === 0) $raw = substr($raw, strlen(DATA_GUARD));
    $d = json_decode($raw, true);
    return is_array($d) ? $d : $default;
}

function save_json(string $name, $data): void {
    if (!is_dir(DATA_DIR)) mkdir(DATA_DIR, 0755, true);
    $f = DATA_DIR . "/$name.php";
    $tmp = $f . '.tmp';
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (file_put_contents($tmp, DATA_GUARD . $json, LOCK_EX) === false) {
        throw new RuntimeException('Cannot write ' . $f . ' — check folder permissions (data/ must be writable).');
    }
    rename($tmp, $f);
}

function default_settings(): array {
    return [
        'name'      => 'Onur Alkan',
        'title_tr'  => 'Doç. Dr.',
        'title_en'  => 'Assoc. Prof. Dr.',
        'affil_tr'  => 'Isparta Uygulamalı Bilimler Üniversitesi, Orman Fakültesi',
        'affil_en'  => 'Isparta University of Applied Sciences, Faculty of Forestry',
        'bio_tr'    => 'Orman biyometrisi alanında çalışıyorum: gövde çapı dağılımları, boy–çap ilişkileri, gövde biçimi ve biyokütle modelleri. Karma etkili modeller, kantil regresyon ve yapay sinir ağları gibi istatistiksel yöntemleri Türkiye\'nin başlıca orman ağacı türlerine uyguluyorum.',
        'bio_en'    => 'I work in forest biometrics: diameter distributions, height–diameter relationships, stem taper and biomass models. I apply statistical methods such as mixed-effects models, quantile regression and artificial neural networks to Turkey\'s major forest tree species.',
        'interests_tr' => 'Çap dağılımı modelleri, Weibull dağılımı, boy–çap modelleri, gövde çapı modelleri, biyokütle, karma etkili modeller, yapay sinir ağları',
        'interests_en' => 'Diameter distribution models, Weibull distribution, height–diameter models, stem taper, biomass, mixed-effects models, artificial neural networks',
        'email'     => 'onuralkan@isparta.edu.tr',
        'office_tr' => '',
        'office_en' => '',
        'scholar'   => '',
        'orcid'     => '',
        'researchgate' => '',
        'yoksis'    => '',
    ];
}

function settings(): array { return array_merge(default_settings(), load_json('settings', [])); }

function auth(): array { return load_json('auth', []); }

function is_admin(): bool { return !empty($_SESSION['admin']) && ($_SESSION['ua'] ?? '') === ($_SERVER['HTTP_USER_AGENT'] ?? ''); }

function csrf_token(): string {
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
    return $_SESSION['csrf'];
}
function csrf_field(): string { return '<input type="hidden" name="csrf" value="' . csrf_token() . '">'; }
function csrf_ok(): bool { return isset($_POST['csrf']) && hash_equals(csrf_token(), (string)$_POST['csrf']); }

// ---------- language ----------
function lang(): string {
    if (isset($_GET['lang']) && in_array($_GET['lang'], ['tr','en'], true)) {
        setcookie('lang', $_GET['lang'], ['expires' => time() + 31536000, 'path' => '/', 'samesite' => 'Lax']);
        return $_GET['lang'];
    }
    if (isset($_COOKIE['lang']) && in_array($_COOKIE['lang'], ['tr','en'], true)) return $_COOKIE['lang'];
    $al = strtolower($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '');
    return substr($al, 0, 2) === 'tr' ? 'tr' : 'en';
}

const T = [
    'about'      => ['tr' => 'Hakkımda',        'en' => 'About'],
    'notes'      => ['tr' => 'Ders Notları',    'en' => 'Lecture Notes'],
    'pubs'       => ['tr' => 'Yayınlar',        'en' => 'Publications'],
    'contact'    => ['tr' => 'İletişim',        'en' => 'Contact'],
    'interests'  => ['tr' => 'Çalışma alanları','en' => 'Research interests'],
    'no_notes'   => ['tr' => 'Henüz ders notu yüklenmedi.', 'en' => 'No lecture notes yet.'],
    'no_pubs'    => ['tr' => 'Henüz yayın eklenmedi.',      'en' => 'No publications yet.'],
    'download'   => ['tr' => 'İndir',  'en' => 'Download'],
    'search'     => ['tr' => 'Ara…',   'en' => 'Search…'],
    'all'        => ['tr' => 'Tümü',   'en' => 'All'],
    'article'    => ['tr' => 'Makale', 'en' => 'Article'],
    'chapter'    => ['tr' => 'Kitap bölümü', 'en' => 'Book chapter'],
    'conference' => ['tr' => 'Bildiri','en' => 'Conference paper'],
    'thesis'     => ['tr' => 'Tez',    'en' => 'Thesis'],
    'other'      => ['tr' => 'Diğer',  'en' => 'Other'],
    'updated'    => ['tr' => 'Güncellendi', 'en' => 'Updated'],
    'office'     => ['tr' => 'Ofis',   'en' => 'Office'],
    'email'      => ['tr' => 'E-posta','en' => 'Email'],
];
function t(string $k, string $l): string { return T[$k][$l] ?? $k; }

function pick(array $item, string $field, string $l): string {
    $v = $item[$field . '_' . $l] ?? '';
    if ($v === '') $v = $item[$field . '_' . ($l === 'tr' ? 'en' : 'tr')] ?? '';
    return (string)$v;
}

// Old-style DOI links (http://dx.doi.org/...) -> https://doi.org/...
function https_url(string $u): string {
    return (string)preg_replace('~^http://(dx\.)?doi\.org/~i', 'https://doi.org/', trim($u));
}

function human_size(int $b): string {
    if ($b < 1024) return $b . ' B';
    if ($b < 1048576) return round($b / 1024) . ' KB';
    return number_format($b / 1048576, 1) . ' MB';
}

function safe_filename(string $orig): string {
    $map = ['ç'=>'c','Ç'=>'C','ğ'=>'g','Ğ'=>'G','ı'=>'i','İ'=>'I','ö'=>'o','Ö'=>'O','ş'=>'s','Ş'=>'S','ü'=>'u','Ü'=>'U'];
    $s = strtr($orig, $map);
    $s = preg_replace('/[^A-Za-z0-9._-]+/', '-', $s);
    $s = trim((string)$s, '-.');
    return $s === '' ? 'file' : substr($s, 0, 120);
}
