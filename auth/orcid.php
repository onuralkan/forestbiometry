<?php
// Sign in with ORCID (OAuth 2.0 authorization code, scope /authenticate): the only way to sign in (21 Nov 2026, user
// decision). Without ?code this page sends the visitor to ORCID; ORCID sends them back here with ?code and ?state.
// ORCID's token answer carries the ORCID iD and the name; nothing else is requested or stored.
// Test servers only: with 'orcid_mock' => true in the private config, ?mock=<iD>&name=<name> signs in directly.
declare(strict_types=1);
require __DIR__ . '/../inc/account.php';

$c = fb_config();
if (!$c) { http_response_code(404); exit('The interpretation service is not configured on this server.'); }

$back = isset($_GET['back']) && preg_match('~^[a-z0-9-]+\.php$~', (string)$_GET['back']) ? (string)$_GET['back'] : 'account.php';
$https = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
$self = ($https ? 'https://' : 'http://') . ($_SERVER['HTTP_HOST'] ?? 'forestbiometry.online') . strtok($_SERVER['REQUEST_URI'] ?? '/auth/orcid.php', '?');

if (!empty($c['orcid_mock']) && isset($_GET['mock'])) {
    $id = (string)$_GET['mock'];
    if (!preg_match('~^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$~', $id)) { http_response_code(400); exit('Bad iD'); }
    if (!fb_sign_in($id, substr((string)($_GET['name'] ?? 'Test user'), 0, 120))) { header('Location: ../account.php?signin=closed'); exit; }
    header('Location: ../' . $back); exit;
}

if (!isset($_GET['code'])) {
    if (isset($_GET['error'])) { header('Location: ../account.php?signin=cancelled'); exit; }
    fb_session(true);
    $_SESSION['oauth_state'] = bin2hex(random_bytes(16));
    $_SESSION['oauth_back'] = $back;
    $q = http_build_query(['client_id' => $c['orcid_client_id'], 'response_type' => 'code', 'scope' => '/authenticate',
        'redirect_uri' => $self, 'state' => $_SESSION['oauth_state']]);
    header('Location: ' . rtrim($c['orcid_base'], '/') . '/oauth/authorize?' . $q); exit;
}

fb_session(true);
if (!isset($_GET['state'], $_SESSION['oauth_state']) || !hash_equals($_SESSION['oauth_state'], (string)$_GET['state'])) {
    http_response_code(400); exit('The sign-in could not be verified. Please try again from the Account page.');
}
$back = $_SESSION['oauth_back'] ?? 'account.php';
unset($_SESSION['oauth_state'], $_SESSION['oauth_back']);

$ch = curl_init(rtrim($c['orcid_base'], '/') . '/oauth/token');
curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 20, CURLOPT_HTTPHEADER => ['Accept: application/json'],
    CURLOPT_POSTFIELDS => http_build_query(['client_id' => $c['orcid_client_id'], 'client_secret' => $c['orcid_client_secret'],
        'grant_type' => 'authorization_code', 'code' => (string)$_GET['code'], 'redirect_uri' => $self])]);
$body = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
$t = is_string($body) ? json_decode($body, true) : null;
if ($code !== 200 || !is_array($t) || empty($t['orcid']) || !preg_match('~^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$~', (string)$t['orcid'])) {
    http_response_code(502); exit('ORCID did not confirm the sign-in. Please try again later.');
}
if (!fb_sign_in((string)$t['orcid'], substr(trim((string)($t['name'] ?? '')) ?: (string)$t['orcid'], 0, 120))) { header('Location: ../account.php?signin=closed'); exit; }
header('Location: ../' . $back);
