<?php
// The Diameter Distribution Lab moved to the tools section (Module 4, Weibull version).
// Permanent redirect; the language parameter is kept. Browsers keep the #fragment on redirects.
$q = isset($_GET['lang']) && in_array($_GET['lang'], ['tr', 'en'], true) ? '?lang=' . $_GET['lang'] : '';
header('Location: araclar/cap-dagilimi.php' . $q, true, 301);
exit;
