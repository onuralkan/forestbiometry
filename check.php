<?php
// Kurulum kontrolü — sorun çözülünce SİLİN.
header('Content-Type: text/plain; charset=utf-8');
echo "PHP sürümü: " . PHP_VERSION . (version_compare(PHP_VERSION, '7.4', '>=') ? "  ✓\n" : "  ✗ (en az 7.4 gerekli — panelden yükseltin)\n");
foreach (['json','session','mbstring','gd'] as $e) echo "Eklenti $e: " . (extension_loaded($e) ? "✓" : ($e === 'gd' ? "yok (sadece fotoğraf için, sorun değil)" : "✗ YOK")) . "\n";
foreach (['data','files'] as $d) echo "$d/ yazılabilir: " . (is_writable(__DIR__ . "/$d") ? "✓" : "✗ — izinleri 755 yapın") . "\n";
echo "upload_max_filesize: " . ini_get('upload_max_filesize') . "\npost_max_size: " . ini_get('post_max_size') . "\n";
echo "Sunucu: " . ($_SERVER['SERVER_SOFTWARE'] ?? '?') . "\n";
