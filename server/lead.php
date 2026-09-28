<?php
/**
 * Space Cabin — lead endpoint (PHP 8+, no dependencies).
 *
 * Receives the JSON posted by src/scripts/form.js and:
 *   1. validates it again server-side (Iranian mobile, required fields)
 *   2. blocks spam: honeypot, minimum fill time, JS token, per-IP rate limit
 *   3. stores the lead in SQLite (leads.sqlite) — or CSV if SQLite is unavailable
 *   4. emails the sales team
 *   5. forwards it to a CRM via webhook (optional)
 *
 * Setup: copy config.sample.php → config.php, then set `form.endpoint` in
 * src/content/shared.json to this file's URL and rebuild.
 */

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');

$config = is_file(__DIR__ . '/config.php') ? require __DIR__ . '/config.php' : require __DIR__ . '/config.sample.php';

// ── CORS (only the site's own origin) ──────────────────────────────────────
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && in_array($origin, $config['allowed_origins'], true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { fail(405, 'method_not_allowed'); }

function fail(int $code, string $error): never {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $error]);
    exit;
}

$raw = file_get_contents('php://input', false, null, 0, 20000) ?: '';
$in = json_decode($raw, true);
if (!is_array($in)) fail(400, 'bad_json');

// ── Anti-spam ──────────────────────────────────────────────────────────────
if (!empty($in['company'])) fail(422, 'spam');                          // honeypot
$started = (int)($in['started_at'] ?? 0);
$elapsed = (int)(microtime(true) * 1000) - $started;
if ($started <= 0 || $elapsed < $config['min_fill_ms'] || $elapsed > 86400000) fail(422, 'spam'); // time trap
// JS token = reverse(base64("<started_at>:<lang>")) — proves the page's JS actually ran.
$decoded = base64_decode(strrev((string)($in['js_token'] ?? '')), true) ?: '';
if (!str_starts_with($decoded, $started . ':')) fail(422, 'spam');

// Per-IP rate limit (file based, no Redis needed)
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$rlFile = sys_get_temp_dir() . '/sc_rl_' . md5($ip);
$hits = array_filter(explode(',', @file_get_contents($rlFile) ?: ''), fn($t) => $t && (time() - (int)$t) < 3600);
if (count($hits) >= $config['max_per_hour']) fail(429, 'rate_limited');
$hits[] = time();
file_put_contents($rlFile, implode(',', $hits));

// ── Validation ─────────────────────────────────────────────────────────────
function clean($v, int $max = 200): string {
    return mb_substr(trim(strip_tags((string)$v)), 0, $max);
}
function normalize_mobile(string $s): ?string {
    $s = strtr($s, ['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9',
                    '٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9']);
    $s = preg_replace('/[\s\-()]/', '', $s);
    $s = preg_replace('/^(\+98|0098|98)(?=9)/', '0', $s);
    if (preg_match('/^9\d{9}$/', $s)) $s = '0' . $s;
    return preg_match('/^09\d{9}$/', $s) ? $s : null;
}

$lead = [
    'ref'          => 'SC-' . strtoupper(substr(base_convert((string)(int)(microtime(true) * 1000), 10, 36), -6)),
    'created_at'   => gmdate('c'),
    'request_type' => in_array($in['request_type'] ?? '', ['consult', 'visit'], true) ? $in['request_type'] : 'consult',
    'name'         => clean($in['name'] ?? '', 120),
    'mobile'       => normalize_mobile((string)($in['mobile'] ?? '')),
    'city'         => clean($in['city'] ?? '', 80),
    'use'          => clean($in['use'] ?? '', 80),
    'version'      => clean($in['version'] ?? '', 40),
    'message'      => clean($in['message'] ?? '', 2000),
    'lang'         => ($in['lang'] ?? 'fa') === 'en' ? 'en' : 'fa',
    'page'         => clean($in['page'] ?? '', 500),
    'utm_source'   => clean($in['attribution']['last']['utm_source'] ?? '', 120),
    'utm_medium'   => clean($in['attribution']['last']['utm_medium'] ?? '', 120),
    'utm_campaign' => clean($in['attribution']['last']['utm_campaign'] ?? '', 200),
    'utm_term'     => clean($in['attribution']['last']['utm_term'] ?? '', 200),
    'utm_content'  => clean($in['attribution']['last']['utm_content'] ?? '', 200),
    'referrer'     => clean($in['attribution']['last']['referrer'] ?? '', 500),
    'first_touch'  => json_encode($in['attribution']['first'] ?? new stdClass(), JSON_UNESCAPED_UNICODE),
    'ip'           => $ip,
    'user_agent'   => clean($_SERVER['HTTP_USER_AGENT'] ?? '', 300),
];
if (mb_strlen($lead['name']) < 3 || !$lead['mobile'] || !$lead['city'] || !$lead['use']) fail(422, 'invalid');

// ── Store ──────────────────────────────────────────────────────────────────
@mkdir(dirname($config['sqlite_path']), 0775, true);
try {
    $db = new PDO('sqlite:' . $config['sqlite_path']);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $cols = array_keys($lead);
    $db->exec('CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY AUTOINCREMENT, ' . implode(', ', array_map(fn($c) => "$c TEXT", $cols)) . ')');
    $stmt = $db->prepare('INSERT INTO leads (' . implode(',', $cols) . ') VALUES (' . implode(',', array_map(fn($c) => ":$c", $cols)) . ')');
    $stmt->execute($lead);
} catch (Throwable $e) {
    $csv = fopen($config['csv_path'], 'a');
    if (ftell($csv) === 0) fputcsv($csv, array_keys($lead));
    fputcsv($csv, $lead);
    fclose($csv);
}

// ── Email ──────────────────────────────────────────────────────────────────
if (!empty($config['notify_email'])) {
    $subject = '=?UTF-8?B?' . base64_encode("لید جدید اسپیس کابین — {$lead['name']} ({$lead['ref']})") . '?=';
    $body = '';
    foreach ($lead as $k => $v) $body .= str_pad($k, 14) . ": $v\n";
    @mail($config['notify_email'], $subject, $body, "From: {$config['from_email']}\r\nContent-Type: text/plain; charset=UTF-8");
}

// ── CRM webhook ────────────────────────────────────────────────────────────
if (!empty($config['webhook_url'])) {
    $ctx = stream_context_create(['http' => [
        'method' => 'POST', 'timeout' => 4, 'ignore_errors' => true,
        'header' => "Content-Type: application/json\r\n" . ($config['webhook_secret'] ? "X-Webhook-Secret: {$config['webhook_secret']}\r\n" : ''),
        'content' => json_encode($lead, JSON_UNESCAPED_UNICODE),
    ]]);
    @file_get_contents($config['webhook_url'], false, $ctx);
}

echo json_encode(['ok' => true, 'ref' => $lead['ref']]);
