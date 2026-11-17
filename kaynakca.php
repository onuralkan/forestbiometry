<?php
// Bibliography of the platform: every source the tools' methods and tests rely on, APA 7, from inc/kaynakca.json
// (extracted from docs/METHODS.md and docs/KAYNAK_LISTESI.md; no detail added that those documents do not give).
require __DIR__ . '/inc/site.php';
$tr = site_ctx()['tr'];
$refs = json_decode((string) @file_get_contents(__DIR__ . '/inc/kaynakca.json'), true) ?: [];   // docs/kaynakca.json without the sources of archived (removed) tools
site_top([
    'title' => $tr ? 'Kaynakça' : 'References',
    'desc'  => $tr ? 'forestbiometry.online araçlarının yöntemlerinde ve testlerinde kullanılan bütün kaynaklar (APA 7).' : 'Every source used in the methods and tests of the forestbiometry.online tools (APA 7).',
]);
/** Authors in APA 7: up to 20 listed, "&" before the last; 21 or more: the first 19, "…", the last. */
function apa_authors(array $a): string {
    $n = count($a); if (!$n) return '';
    if ($n === 1) return $a[0];
    if ($n <= 20) return implode(', ', array_slice($a, 0, -1)) . ', & ' . $a[$n - 1];
    return implode(', ', array_slice($a, 0, 19)) . ', … ' . $a[$n - 1];
}
function apa_end(string $s): string { $s = rtrim($s); return preg_match('/[.?!]$/u', $s) ? $s : $s . '.'; }
/** One reference in APA 7 (HTML); fields the source documents do not give are left out, never guessed. */
function apa(array $r, bool $tr): string {
    $au = apa_authors($r['authors'] ?? []); $y = $r['year'] ?? 'n.d.';
    $o = $au !== '' ? h(apa_end($au)) . ' (' . h($y) . '). ' : '';
    $ed = '';
    if (!empty($r['edition'])) {
        $e = (string) $r['edition'];
        if ($tr) $ed = ' (' . h($e) . (ctype_digit($e) ? '. baskı' : '') . ')';
        else { $n = (int) $e; $suf = ctype_digit($e) ? (in_array($n % 100, [11, 12, 13], true) ? 'th' : ([1 => 'st', 2 => 'nd', 3 => 'rd'][$n % 10] ?? 'th')) : ''; $ed = ' (' . h($e) . $suf . ' ed.)'; }
    }
    $title = trim((string) ($r['title'] ?? ''));
    $type = $r['type'] ?? 'other';
    if ($title === '') {
        foreach (['container', 'publisher'] as $k) if (!empty($r[$k])) $o .= '<i>' . h($r[$k]) . '</i>' . (!empty($r['volume']) && $k === 'container' ? ', <i>' . h($r['volume']) . '</i>' : '') . '. ';
    } elseif ($type === 'article') {
        $o .= h(apa_end($title)) . ' ';
        if (!empty($r['container'])) {
            $o .= '<i>' . h($r['container']) . '</i>';
            if (!empty($r['volume'])) $o .= ', <i>' . h($r['volume']) . '</i>' . (!empty($r['issue']) ? '(' . h($r['issue']) . ')' : '');
            if (!empty($r['pages'])) $o .= ', ' . h($r['pages']);
            $o .= '.';
        }
    } elseif ($type === 'chapter') {
        $o .= h(apa_end($title)) . ' ';
        if (!empty($r['container'])) $o .= ($tr ? 'İçinde ' : 'In ') . '<i>' . h($r['container']) . '</i>' . (!empty($r['pages']) ? ' (' . ($tr ? 's. ' : 'pp. ') . h($r['pages']) . ')' : '') . '. ';
        if (!empty($r['publisher'])) $o .= h(apa_end($r['publisher']));
    } elseif ($type === 'software') {
        $o .= '<i>' . h($title) . '</i>' . (!empty($r['version']) ? ' (' . ($tr ? 'Sürüm ' : 'Version ') . h($r['version']) . ')' : '') . ' [' . ($tr ? 'Yazılım' : 'Computer software') . ']. ';
        if (!empty($r['publisher'])) $o .= h(apa_end($r['publisher']));
    } else {
        $o .= '<i>' . h($title) . '</i>' . $ed . '. ';
        if (!empty($r['container'])) $o .= h(apa_end($r['container'])) . ' ';
        if (!empty($r['publisher'])) $o .= h(apa_end($r['publisher']));
    }
    if (!empty($r['doi'])) $o .= ' <a href="https://doi.org/' . h($r['doi']) . '" rel="noopener">https://doi.org/' . h($r['doi']) . '</a>';
    elseif (!empty($r['url'])) $o .= ' <a href="' . h($r['url']) . '" rel="noopener">' . h($r['url']) . '</a>';
    return trim($o);
}
$label = ['B' => $tr ? 'okundu, uygulandı' : 'read, applied', 'A' => $tr ? 'ikincil kaynaktan' : 'via a secondary source', 'P' => $tr ? 'R paketi, sayısal referans' : 'R package, numerical reference', 'İ' => $tr ? 'İncelendi' : 'Reviewed', 'D' => $tr ? 'tanım ya da doğrulanacak' : 'definition or to be verified'];
?>
  <section class="card about" aria-labelledby="h-refs">
    <h2 id="h-refs" class="b-h2"><?= $tr ? 'Kaynakça' : 'References' ?></h2>
    <p><?= $tr ? 'Araçların yöntemlerinde, katsayısız denklem biçimlerinde ve sayısal testlerinde kullanılan bütün kaynaklar, APA 7 biçiminde. Her kaynağın yanında hangi araçta ya da yöntem bölümünde kullanıldığı ve okunma durumu yazılıdır. Site hiçbir tür ya da yöre katsayısı içermez; buradaki kaynaklar yöntemler içindir.'
                   : 'Every source used in the tools\' methods, coefficient-free equation forms and numerical tests, in APA 7 style. Next to each source: where it is used and its reading status. The site contains no species or regional coefficients; these sources are for the methods.' ?></p>
    <p class="muted small"><?= $tr ? 'Durumlar: ' : 'Status: ' ?><?= h(implode(' · ', array_map(function ($k, $v) { return "$k: $v"; }, array_keys($label), $label))) ?>. <?= $tr ? 'Ayrıntı: proje deposundaki docs/METHODS.md.' : 'Details: docs/METHODS.md in the project repository.' ?></p>
    <p class="small" id="refs-n"><?= $tr ? count($refs) . ' kaynak.' : count($refs) . ' sources.' ?></p>
    <ol class="refs" id="refs">
      <?php foreach ($refs as $r): ?>
      <li id="ref-<?= h($r['key'] ?? '') ?>"><?= apa($r, $tr) ?>
        <span class="muted small"> — <?= h(implode('; ', array_unique(array_map(function ($t) { return trim(preg_replace('/\s*\(.*?\)/u', '', $t)); }, $r['tools'] ?? [])))) ?><?= !empty($r['status']) ? ' · ' . h($r['status']) . ' (' . h($label[$r['status']] ?? $r['status']) . ')' : '' ?><?= !empty($r['note']) && stripos($r['note'], 'incomplete') === 0 ? ' · ' . ($tr ? 'künye kaynak belgelerde eksik' : 'citation incomplete in the source documents') : '' ?></span></li>
      <?php endforeach; ?>
    </ol>
  </section>
<?php site_bottom();
