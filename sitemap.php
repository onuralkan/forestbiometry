<?php
// Sitemap of the public pages, generated from site_tools() so that a new tool is listed without editing this file.
// Every page once (the site is English only since 20 Nov 2026).
require __DIR__ . '/inc/site.php';
header('Content-Type: application/xml; charset=utf-8');
$pages = ['', 'araclar.php'];
foreach (site_tools() as $t) if (!empty($t['file'])) $pages[] = $t['file'];
$pages[] = 'kilavuz.php';
foreach (array_merge(['genel', 'is-akisi', 'sorun-giderme'], array_map(function ($t) { return basename($t['file'], '.php'); }, site_tools())) as $id) if (is_file(__DIR__ . "/inc/guide/en/$id.php")) $pages[] = 'kilavuz.php?k=' . $id;   // one guide page per section
$pages[] = 'hakkinda.php';
$pages[] = 'kaynakca.php';
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">' . "\n";
foreach ($pages as $p) echo '  <url><loc>' . htmlspecialchars(SITE_BASE . $p, ENT_XML1) . "</loc></url>\n";
echo "</urlset>\n";
