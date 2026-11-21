<?php
// AI interpretation of a tool's results (21 Nov 2026, user decision). The browser sends the summary of one run (the
// same object the tool writes into its JSON run record: settings and result tables, no row data); this endpoint checks
// the account (signed in with ORCID, approved), the monthly quota and the per-minute limit, asks Claude for a short
// interpretation and returns the text. Nothing of the request or the answer is stored on the server.
//   GET  → the account state (signed in, status, used / quota, form token)
//   POST {tool, version, summary} with header X-CSRF → {text, model, used, quota} or {error}
// Calls the Messages API over HTTPS with curl (the site has no package manager, so no SDK).
declare(strict_types=1);
require __DIR__ . '/../inc/account.php';

/** Tools that may ask for an interpretation, with what the model has to know about each one's result object. */
const FB_TOOLS = [
    'model-degerlendirme' => [
        'name' => 'Model Evaluation (Forest Biometry)',
        'guide' => "The object compares the predictions of one or more models (or columns of predicted values) with observed values. "
            . "Errors are e = y − ŷ (observed − predicted): positive bias means the model under-predicts on average. "
            . "Measures per model: bias (mean error), MAE, RMSE, relative versions, prediction R² (1 − SSE/SST, can be negative), "
            . "optional groups (plot, species, fold, diameter class), optional inference (t interval for the bias, equivalence tests "
            . "against a margin, bootstrap percentile/BCa intervals), and optionally a bootstrap of the overall rank (Poudel and Cao 2013, Eq. 10). "
            . "rows.sameSample tells whether all models were evaluated on the same rows; settings.models[].role says whether a column comes "
            . "from training data, test data or cross-validation (a training-data evaluation is optimistic).",
    ],
];

const FB_SYSTEM = <<<'TXT'
You write a short interpretation of the results of a forest biometrics calculation for a researcher. The results are in the JSON object the user sends; it was produced by the tool named there.

Rules:
- Use only the numbers in the object. Never invent a number, a reference value, a threshold or a literature comparison. Quote the numbers you discuss with the units and rounding the object implies.
- Interpret, do not restate every number: what the results say, which differences matter, how sure one can be (intervals, sample size, same rows or not), and what the results do not show.
- Name the limits that follow from the settings (e.g. evaluation on training data is optimistic; different rows per model make the comparison unfair; few groups make group results unstable). Do not judge the method itself unless the object shows a problem.
- Do not recommend a model as "correct" or "valid"; say which performs better on these data by which measure.
- Plain English for a scientific reader, no marketing tone, no emojis. About 200–350 words. Structure: a one-paragraph summary, then short sections with the headings "Comparison", "Uncertainty" and "Limits". Plain text with those headings on their own lines; no tables.
- If the object is empty, inconsistent or not a result of the named tool, say so briefly instead of interpreting.
TXT;

$c = fb_config();
if ($_SERVER['REQUEST_METHOD'] === 'GET') fb_json(fb_state());   // {configured:false} without the service
if (!$c) fb_json(['error' => 'not-configured'], 503);
if ($_SERVER['REQUEST_METHOD'] !== 'POST') fb_json(['error' => 'method'], 405);

$u = fb_user();
if (!$u) fb_json(['error' => 'signin'], 401);
if (!fb_csrf_ok($_SERVER['HTTP_X_CSRF'] ?? null)) fb_json(['error' => 'token'], 403);
if ($u['status'] !== 'approved') fb_json(['error' => $u['status'] === 'blocked' ? 'blocked' : 'pending'], 403);

$raw = file_get_contents('php://input', false, null, 0, (int)$c['max_request_bytes'] + 1);
if ($raw === false || strlen($raw) > (int)$c['max_request_bytes']) fb_json(['error' => 'too-large'], 413);
$in = json_decode($raw, true);
if (!is_array($in) || !isset($in['tool'], $in['summary']) || !is_array($in['summary']) || !isset(FB_TOOLS[$in['tool']])) fb_json(['error' => 'bad-request'], 400);
$tool = FB_TOOLS[$in['tool']];

$err = fb_take($u['orcid']);
if ($err !== '') fb_json(['error' => $err, 'used' => fb_used($u['orcid']), 'quota' => (int)$c['monthly_quota']], 429);

$user = "Tool: " . $tool['name'] . " " . substr((string)($in['version'] ?? ''), 0, 40) . "\n\nWhat the tool's result object holds:\n" . $tool['guide']
    . "\n\nResult object (JSON):\n" . json_encode($in['summary'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

if (!empty($c['anthropic_mock'])) {   // test servers: no call, a fixed text that shows what was sent
    $text = "Summary\nMock interpretation of " . $tool['name'] . " (" . strlen($user) . " characters sent).\n\nComparison\n-\n\nUncertainty\n-\n\nLimits\n-";
    fb_json(['text' => $text, 'model' => 'mock', 'used' => fb_used($u['orcid']), 'quota' => (int)$c['monthly_quota']]);
}

$req = ['model' => $c['anthropic_model'], 'max_tokens' => (int)$c['max_output_tokens'], 'system' => FB_SYSTEM,
    'output_config' => ['effort' => 'medium'], 'fallbacks' => 'default',
    'messages' => [['role' => 'user', 'content' => $user]]];
/** One Messages API call → [http code, decoded body or null, curl error]. */
function fb_claude(array $c, array $req, bool $beta): array {
    $h = ['content-type: application/json', 'x-api-key: ' . $c['anthropic_key'], 'anthropic-version: ' . $c['anthropic_version']];
    if ($beta) $h[] = 'anthropic-beta: server-side-fallback-2026-07-01';
    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 120, CURLOPT_HTTPHEADER => $h,
        CURLOPT_POSTFIELDS => json_encode($req, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
    $body = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); $cerr = curl_error($ch); curl_close($ch);
    return [$code, is_string($body) ? json_decode($body, true) : null, $cerr];
}
[$code, $r, $cerr] = fb_claude($c, $req, true);
if ($code === 400) {   // the optional parts (refusal fallback, effort) refused by this API version: once more without them
    $min = $req; unset($min['fallbacks'], $min['output_config']);
    [$code, $r, $cerr] = fb_claude($c, $min, false);
}
if ($code !== 200 || !is_array($r)) {
    fb_give_back($u['orcid']);
    $type = is_array($r) && isset($r['error']['type']) ? (string)$r['error']['type'] : ($code ? 'http-' . $code : 'connection');
    $why = is_array($r) && isset($r['error']['message']) ? (string)$r['error']['message'] : $cerr;   // never contains the key
    error_log('interpret: Claude API error ' . $type . ': ' . $why);
    fb_json(['error' => 'upstream', 'detail' => substr($type . ($why !== '' ? ': ' . $why : ''), 0, 300)], 502);
}
if (($r['stop_reason'] ?? '') === 'refusal') { fb_give_back($u['orcid']); fb_json(['error' => 'refusal'], 422); }
$text = '';
foreach ($r['content'] ?? [] as $b) if (($b['type'] ?? '') === 'text') $text .= $b['text'];
if (trim($text) === '') { fb_give_back($u['orcid']); fb_json(['error' => 'empty'], 502); }
fb_json(['text' => $text, 'model' => (string)($r['model'] ?? $c['anthropic_model']), 'truncated' => ($r['stop_reason'] ?? '') === 'max_tokens',
    'used' => fb_used($u['orcid']), 'quota' => (int)$c['monthly_quota']]);
