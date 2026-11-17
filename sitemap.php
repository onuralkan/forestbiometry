<?php
// Sitemap of the public pages, generated from site_tools() so that a new tool is listed without editing this file.
// Every page in both languages (?lang=tr, ?lang=en) with its hreflang alternates.
require __DIR__ . '/inc/site.php';
header('Content-Type: application/xml; charset=utf-8');
$pages = [''];
foreach (site_tools(true) as $t) if (!empty($t['file'])) $pages[] = $t['file'];
$pages[] = 'kilavuz.php';
foreach (array_merge(['genel', 'is-akisi', 'sorun-giderme'], array_map(function ($t) { return basename($t['file'], '.php'); }, site_tools(true))) as $id) if (is_file(__DIR__ . "/inc/guide/tr/$id.php")) $pages[] = 'kilavuz.php?k=' . $id;   // one guide page per section
$pages[] = 'hakkinda.php';
$pages[] = 'kaynakca.php';
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' . "\n";
foreach ($pages as $p) foreach (['tr', 'en'] as $l) {
    $sep = strpos($p, '?') === false ? '?' : '&';
    echo '  <url><loc>' . htmlspecialchars(SITE_BASE . $p . $sep . 'lang=' . $l, ENT_XML1) . '</loc>';
    foreach (['tr', 'en'] as $a) echo '<xhtml:link rel="alternate" hreflang="' . $a . '" href="' . htmlspecialchars(SITE_BASE . $p . $sep . 'lang=' . $a, ENT_XML1) . '"/>';
    echo "</url>\n";
}
echo "</urlset>\n";
