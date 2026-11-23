<?php
// Sign out (POST with the form token from the Account page).
declare(strict_types=1);
require __DIR__ . '/../inc/account.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && fb_config() && fb_csrf_ok($_POST['csrf'] ?? null)) fb_sign_out();
header('Location: ../account.php');
