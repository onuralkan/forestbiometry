<?php
// Time-based one-time passwords (RFC 6238), compatible with Google Authenticator,
// Microsoft Authenticator, Aegis, 1Password etc. No external libraries. PHP 7.4+.
declare(strict_types=1);

const TOTP_PERIOD = 30;
const TOTP_DIGITS = 6;
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function totp_new_secret(): string {          // 160 random bits, base32 (32 chars)
    $bytes = random_bytes(20); $bits = '';
    foreach (str_split($bytes) as $c) $bits .= str_pad(decbin(ord($c)), 8, '0', STR_PAD_LEFT);
    $out = '';
    foreach (str_split($bits, 5) as $chunk) $out .= B32[bindec(str_pad($chunk, 5, '0'))];
    return $out;
}

function b32_decode(string $s): string {
    $s = strtoupper(preg_replace('/[^A-Za-z2-7]/', '', $s));
    $bits = '';
    for ($i = 0, $n = strlen($s); $i < $n; $i++) $bits .= str_pad(decbin(strpos(B32, $s[$i])), 5, '0', STR_PAD_LEFT);
    $out = '';
    foreach (str_split($bits, 8) as $byte) if (strlen($byte) === 8) $out .= chr(bindec($byte));
    return $out;
}

function totp_at(string $secret, int $step): string {
    $h = hash_hmac('sha1', pack('N2', 0, $step), b32_decode($secret), true);
    $o = ord($h[19]) & 0x0f;
    $v = ((ord($h[$o]) & 0x7f) << 24) | (ord($h[$o + 1]) << 16) | (ord($h[$o + 2]) << 8) | ord($h[$o + 3]);
    return str_pad((string)($v % (10 ** TOTP_DIGITS)), TOTP_DIGITS, '0', STR_PAD_LEFT);
}

/** Returns the matching time step (to block reuse), or null. Accepts ±1 step for clock drift. */
function totp_verify(string $secret, string $code, int $lastStep = 0): ?int {
    $code = preg_replace('/\D/', '', $code);
    if (strlen($code) !== TOTP_DIGITS) return null;
    $now = intdiv(time(), TOTP_PERIOD);
    foreach ([0, -1, 1] as $d) {
        $step = $now + $d;
        if ($step > $lastStep && hash_equals(totp_at($secret, $step), $code)) return $step;
    }
    return null;
}

function totp_uri(string $secret, string $account, string $issuer): string {
    return 'otpauth://totp/' . rawurlencode($issuer . ':' . $account)
        . '?secret=' . $secret . '&issuer=' . rawurlencode($issuer) . '&algorithm=SHA1&digits=' . TOTP_DIGITS . '&period=' . TOTP_PERIOD;
}

/** 8 one-time recovery codes like "K7QD-M2XP". Returns [plain list, hashed list]. */
function recovery_codes(): array {
    $alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no 0/O/1/I
    $plain = [];
    for ($i = 0; $i < 8; $i++) {
        $c = '';
        for ($j = 0; $j < 8; $j++) $c .= $alpha[random_int(0, strlen($alpha) - 1)];
        $plain[] = substr($c, 0, 4) . '-' . substr($c, 4);
    }
    return [$plain, array_map('recovery_hash', $plain)];
}
function recovery_hash(string $c): string { return hash('sha256', strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $c))); }
