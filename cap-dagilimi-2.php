<?php
// The development address of the new diameter distribution engine; the tool now lives at cap-dagilimi.php.
$q = isset($_SERVER['QUERY_STRING']) && $_SERVER['QUERY_STRING'] !== '' ? '?' . $_SERVER['QUERY_STRING'] : '';
header('Location: cap-dagilimi.php' . $q, true, 301);
exit;
