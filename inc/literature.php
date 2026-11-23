<?php
// Literature box on the tool pages (23 Nov 2026, user decision): recent and most-cited publications on a tool's methods
// from the Scopus Search API (Elsevier), shown ONLY to the administrator (the single administrator of config.php). The
// key stays in the private config.php ('elsevier_key', optional 'elsevier_insttoken'); the browser never sees it and
// talks only to api/literature.php. Nothing of a visitor is sent to Elsevier: only the tool's search query.
// Results are cached for 24 h in the private database (quota) and shown with the Scopus attribution and links.
declare(strict_types=1);
require_once __DIR__ . '/account.php';

/** Default Scopus queries per tool id (site_tool_id); the administrator can replace them in the box (lit_queries table). */
const FB_LIT_DEFAULT = [
    'veri-denetcisi' => 'TITLE-ABS-KEY(("forest inventory" OR "tree measurement") AND ("data quality" OR "measurement error" OR outlier))',
    'ornek-alan' => 'TITLE-ABS-KEY(("stand density" OR "basal area" OR "quadratic mean diameter" OR "top height") AND "sample plot")',
    'model-degerlendirme' => 'TITLE-ABS-KEY(("model evaluation" OR "model validation" OR "prediction accuracy") AND (forest OR tree OR stand))',
    'cap-dagilimi' => 'TITLE-ABS-KEY("diameter distribution" AND (weibull OR "johnson sb" OR "parameter recovery" OR "parameter prediction"))',
    'boy-cap' => 'TITLE-ABS-KEY(("height-diameter" OR "height diameter") AND model AND (tree OR stand))',
    'ornekleme-planlayici' => 'TITLE-ABS-KEY("forest inventory" AND ("sampling design" OR "sample size" OR "plot size"))',
    'nispi-siralama' => 'TITLE-ABS-KEY(("relative rank" OR "ranking" OR "model selection") AND ("goodness of fit" OR "fit statistics") AND forest)',
    'seksiyon-hacmi' => 'TITLE-ABS-KEY(("stem volume" OR "log volume") AND (smalian OR huber OR newton OR "section"))',
    'bonitet' => 'TITLE-ABS-KEY("site index" AND ("dominant height" OR "top height") AND (curve OR model))',
    'mescere-yapisi' => 'TITLE-ABS-KEY(("stand structure" OR "spatial pattern" OR "competition index") AND (tree OR forest))',
    'govde-profili' => 'TITLE-ABS-KEY(("taper equation" OR "taper function" OR "stem profile") AND tree)',
    'buyume-islevi' => 'TITLE-ABS-KEY(("growth function" OR "growth model") AND (richards OR "chapman-richards" OR gompertz OR korf) AND (tree OR stand))',
    'katsayi-kutuphanesi' => 'TITLE-ABS-KEY(("allometric equation" OR "volume equation" OR "biomass equation") AND (coefficients OR database OR compilation))',
    'kayit-dogrulayici' => 'TITLE-ABS-KEY(("reproducibility" OR "reproducible research") AND (forestry OR "forest science" OR "forest biometrics"))',
    'veri-yoneticisi' => 'TITLE-ABS-KEY(("forest inventory" OR "permanent sample plot") AND ("data management" OR database OR remeasurement))',
    'pano' => 'TITLE-ABS-KEY(("data visualization" OR "graphical") AND ("forest inventory" OR "forest data"))',
    'rapor' => 'TITLE-ABS-KEY(("forest inventory" OR "forest biometrics") AND (report OR reporting) AND (software OR tool))',
    'agac-olcumu' => 'TITLE-ABS-KEY(("tree height measurement" OR hypsometer OR "diameter at breast height") AND (error OR accuracy))',
    'biyokutle-karbon' => 'TITLE-ABS-KEY(("allometric" OR "biomass equation" OR "biomass expansion factor") AND (tree OR forest) AND (biomass OR carbon))',
    'hacim-denklemleri' => 'TITLE-ABS-KEY(("volume equation" OR "volume model" OR "volume table") AND tree)',
    'tomruk-olcumu' => 'TITLE-ABS-KEY(("log scaling" OR "log volume" OR "log rule") AND (timber OR sawlog))',
    'dogrusal-olmayan-regresyon' => 'TITLE-ABS-KEY("nonlinear regression" AND (forest OR tree OR stand) AND (model OR fitting))',
    'karma-modeller' => 'TITLE-ABS-KEY(("mixed-effects" OR "mixed effects" OR "random effects") AND (tree OR stand) AND (height OR diameter OR growth))',
    'denklem-sistemleri' => 'TITLE-ABS-KEY(("seemingly unrelated regression" OR "simultaneous equations" OR "system of equations" OR "compatible") AND (forest OR tree OR stand))',
];
const FB_LIT_TTL = 86400;   // cache lifetime, seconds
const FB_LIT_COUNT = 10;    // results per list

/** The service is available: Elsevier key configured (or the test mock). */
function fb_lit_on(): bool { $c = fb_config(); return $c !== null && (($c['elsevier_key'] ?? '') !== '' || !empty($c['elsevier_mock'])); }

function fb_lit_db(): PDO {
    $db = fb_db();
    $db->exec('CREATE TABLE IF NOT EXISTS lit_queries (tool TEXT PRIMARY KEY, query TEXT NOT NULL, updated TEXT NOT NULL)');
    $db->exec('CREATE TABLE IF NOT EXISTS lit_cache (k TEXT PRIMARY KEY, at INTEGER NOT NULL, body TEXT NOT NULL)');
    return $db;
}
/** [query, custom?] of a tool. */
function fb_lit_query(string $tool): array {
    $st = fb_lit_db()->prepare('SELECT query FROM lit_queries WHERE tool = ?'); $st->execute([$tool]);
    $q = $st->fetchColumn();
    return is_string($q) && $q !== '' ? [$q, true] : [FB_LIT_DEFAULT[$tool] ?? '', false];
}
function fb_lit_set_query(string $tool, string $q): void {
    $db = fb_lit_db();
    if ($q === '') $db->prepare('DELETE FROM lit_queries WHERE tool = ?')->execute([$tool]);
    else $db->prepare('INSERT OR REPLACE INTO lit_queries (tool, query, updated) VALUES (?, ?, ?)')->execute([$tool, $q, gmdate('c')]);
}

/** One Scopus Search call → ['ok' => bool, 'status' => int, 'total' => int, 'entries' => [...], 'error' => ?string]. */
function fb_lit_fetch(string $query, string $sort): array {
    $c = fb_config();
    $p = ['query' => $query, 'count' => FB_LIT_COUNT, 'start' => 0, 'view' => 'STANDARD', 'sort' => $sort === 'cited' ? '-citedby-count' : '-coverDate'];
    if (!empty($c['elsevier_mock'])) {   // test servers: no call, two fixed entries that show the query and the order
        return ['ok' => true, 'status' => 200, 'total' => 2, 'entries' => [
            ['title' => 'Mock result for ' . $query, 'creator' => 'Doe J.', 'journal' => 'Mock Journal', 'year' => $sort === 'cited' ? '2001' : '2026', 'volume' => '1', 'pages' => '1-10', 'doi' => '10.0000/mock.1', 'cited' => $sort === 'cited' ? 500 : 0, 'type' => 'Article', 'scopus' => 'https://www.scopus.com/'],
            ['title' => 'Second mock result (' . $sort . ')', 'creator' => 'Roe R.', 'journal' => 'Mock Journal', 'year' => '2020', 'volume' => null, 'pages' => null, 'doi' => null, 'cited' => 3, 'type' => 'Review', 'scopus' => null]]];
    }
    $h = ['Accept: application/json', 'X-ELS-APIKey: ' . $c['elsevier_key']];
    if (($c['elsevier_insttoken'] ?? '') !== '') $h[] = 'X-ELS-Insttoken: ' . $c['elsevier_insttoken'];
    $ch = curl_init('https://api.elsevier.com/content/search/scopus?' . http_build_query($p, '', '&', PHP_QUERY_RFC3986));
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 25, CURLOPT_HTTPHEADER => $h]);
    $body = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); $cerr = curl_error($ch); curl_close($ch);
    $j = is_string($body) ? json_decode($body, true) : null;
    if ($code !== 200 || !is_array($j) || !isset($j['search-results'])) {
        $why = is_array($j) ? ($j['service-error']['status']['statusCode'] ?? $j['error-response']['error-code'] ?? '') . ' ' . ($j['service-error']['status']['statusText'] ?? $j['error-response']['error-message'] ?? '') : $cerr;
        error_log('literature: Scopus error ' . $code . ' ' . $why);   // never contains the key
        return ['ok' => false, 'status' => $code, 'total' => 0, 'entries' => [], 'error' => trim(($code ? 'HTTP ' . $code . ' ' : 'connection ') . $why)];
    }
    $sr = $j['search-results']; $out = [];
    foreach ((array)($sr['entry'] ?? []) as $e) {
        if (!is_array($e) || isset($e['error'])) continue;
        $link = null; foreach ((array)($e['link'] ?? []) as $l) if (($l['@ref'] ?? '') === 'scopus') $link = (string)$l['@href'];
        $out[] = ['title' => (string)($e['dc:title'] ?? ''), 'creator' => $e['dc:creator'] ?? null, 'journal' => $e['prism:publicationName'] ?? null,
            'year' => isset($e['prism:coverDate']) ? substr((string)$e['prism:coverDate'], 0, 4) : null, 'volume' => $e['prism:volume'] ?? null,
            'pages' => $e['prism:pageRange'] ?? null, 'doi' => $e['prism:doi'] ?? null, 'cited' => isset($e['citedby-count']) ? (int)$e['citedby-count'] : null,
            'type' => $e['subtypeDescription'] ?? null, 'scopus' => $link];
    }
    return ['ok' => true, 'status' => 200, 'total' => (int)($sr['opensearch:totalResults'] ?? 0), 'entries' => $out];
}

/** Cached list for a tool and sort ('recent' | 'cited'); refresh bypasses the cache. */
function fb_lit_list(string $tool, string $sort, bool $refresh = false): array {
    [$q, $custom] = fb_lit_query($tool);
    if ($q === '') return ['tool' => $tool, 'query' => '', 'custom' => false, 'sort' => $sort, 'ok' => false, 'error' => 'no-query', 'entries' => []];
    $k = hash('sha256', $sort . "\n" . $q); $db = fb_lit_db();
    if (!$refresh) {
        $st = $db->prepare('SELECT at, body FROM lit_cache WHERE k = ?'); $st->execute([$k]); $r = $st->fetch();
        if ($r && time() - (int)$r['at'] < FB_LIT_TTL) { $b = json_decode($r['body'], true); if (is_array($b)) return $b + ['cached' => true]; }
    }
    $res = fb_lit_fetch($q, $sort);
    $body = ['tool' => $tool, 'query' => $q, 'custom' => $custom, 'sort' => $sort, 'fetched' => gmdate('c')] + $res;
    if ($res['ok']) $db->prepare('INSERT OR REPLACE INTO lit_cache (k, at, body) VALUES (?, ?, ?)')->execute([$k, time(), json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
    return $body + ['cached' => false];
}
