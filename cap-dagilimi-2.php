<?php
// The development address of the new diameter distribution engine; the tool now lives at diameter-distribution.php.
$q = isset($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] !== '' ? '?' . $_SERVER['QUERY_STRING'] : '';
header('Location: diameter-distribution.php' . $q, true, 301);
exit;
