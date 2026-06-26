<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/db.php';

use Firebase\JWT\JWT;

setCorsHeaders();
header('Content-Type: application/json; charset=utf-8');

$user   = getAuthUser();
$method = $_SERVER['REQUEST_METHOD'];

// ── PATCH: guardar etiqueta de proyecto ───────────────────────────────────────

if ($method === 'PATCH') {
    $rawId = $_GET['order_id'] ?? '';
    $key   = $rawId === 'kodeo' ? 'kodeo' : ((int) $rawId ? strval((int) $rawId) : null);
    if (!$key) jsonError('order_id inválido', 400);

    // kodeo.mx solo editable por admins; pedidos: debe ser el dueño
    if ($key === 'kodeo') {
        if ($user['role'] !== 'administrador') jsonError('Acceso denegado', 403);
    } else {
        $db   = getDb();
        $stmt = $db->prepare('SELECT id FROM orders WHERE id = ? AND user_id = ?');
        $stmt->execute([(int) $key, $user['sub']]);
        if (!$stmt->fetch()) jsonError('Pedido no encontrado', 404);
    }

    $body  = json_decode(file_get_contents('php://input'), true) ?? [];
    $label = mb_substr(trim($body['label'] ?? ''), 0, 80, 'UTF-8');

    $labelsFile = __DIR__ . '/analytics_labels.json';
    $labels = file_exists($labelsFile) ? (json_decode(file_get_contents($labelsFile), true) ?? []) : [];
    if ($label === '') unset($labels[$key]);
    else $labels[$key] = $label;
    file_put_contents($labelsFile, json_encode($labels, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

    jsonSuccess(['ok' => true, 'key' => $key, 'label' => $label]);
}

if ($method !== 'GET') jsonError('Method not allowed', 405);

// ── GET ?action=meta: etiquetas + estado de configuración ─────────────────────
// Accesible para cualquier usuario autenticado; kodeo solo se incluye si es admin.

if (($_GET['action'] ?? '') === 'meta') {
    $labelsFile = __DIR__ . '/analytics_labels.json';
    $labels = file_exists($labelsFile) ? (json_decode(file_get_contents($labelsFile), true) ?? []) : [];

    $pid  = getenv('GA4_PROPERTY_ID')      ?: '';
    $cred = getenv('GA4_CREDENTIALS_PATH') ?: '';
    // kodeo.mx solo visible para admins
    $configured = $user['role'] === 'administrador'
        ? ['kodeo' => ($pid && $cred && file_exists(__DIR__ . '/' . $cred))]
        : [];

    $configFile = __DIR__ . '/ga4_projects.json';
    if (file_exists($configFile)) {
        $configs = json_decode(file_get_contents($configFile), true) ?? [];
        foreach ($configs as $oid => $cfg) {
            $credFile = __DIR__ . '/' . ($cfg['credentials_path'] ?? '');
            $configured[$oid] = !empty($cfg['property_id']) && file_exists($credFile);
        }
    }

    jsonSuccess(['labels' => $labels, 'configured' => $configured]);
}

// ── GET ?project=X&period=Y: datos de analíticas ──────────────────────────────

$period = $_GET['period'] ?? '28daysAgo';
if (!in_array($period, ['7daysAgo', '28daysAgo', '90daysAgo'], true)) $period = '28daysAgo';
$days      = (int) filter_var($period, FILTER_SANITIZE_NUMBER_INT);
$prevStart = ($days * 2) . 'daysAgo';
$prevEnd   = ($days + 1) . 'daysAgo';

$project = trim($_GET['project'] ?? 'kodeo');

if ($project === 'kodeo') {
    if ($user['role'] !== 'administrador') jsonError('Acceso denegado', 403);

    $propertyId = getenv('GA4_PROPERTY_ID')      ?: '';
    $credPath   = getenv('GA4_CREDENTIALS_PATH') ?: '';
    if (!$propertyId || !$credPath) jsonSuccess(['configured' => false]);

    $credFile = __DIR__ . '/' . $credPath;
    if (!file_exists($credFile)) jsonSuccess(['configured' => false]);

    $creds = json_decode(file_get_contents($credFile), true);
    if (!$creds || empty($creds['private_key']) || empty($creds['client_email'])) jsonError('Credenciales GA4 inválidas', 500);

} else {
    $orderId = (int) $project;
    if (!$orderId) jsonError('Proyecto inválido', 400);

    $db   = getDb();
    $stmt = $db->prepare('SELECT id FROM orders WHERE id = ? AND user_id = ?');
    $stmt->execute([$orderId, $user['sub']]);
    if (!$stmt->fetch()) jsonError('Pedido no encontrado', 404);

    $configFile = __DIR__ . '/ga4_projects.json';
    if (!file_exists($configFile)) jsonSuccess(['configured' => false, 'pending' => true]);

    $configs = json_decode(file_get_contents($configFile), true) ?? [];
    $config  = $configs[strval($orderId)] ?? null;

    if (!$config || empty($config['property_id']) || empty($config['credentials_path'])) {
        jsonSuccess(['configured' => false, 'pending' => true]);
    }

    $propertyId = $config['property_id'];
    $credFile   = __DIR__ . '/' . $config['credentials_path'];
    if (!file_exists($credFile)) jsonSuccess(['configured' => false, 'pending' => true]);

    $creds = json_decode(file_get_contents($credFile), true);
    if (!$creds || empty($creds['private_key']) || empty($creds['client_email'])) jsonError('Credenciales de proyecto inválidas', 500);
}

// ── Autenticación con cuenta de servicio ─────────────────────────────────────

function getServiceAccountToken(array $creds): string {
    $now     = time();
    $payload = [
        'iss'   => $creds['client_email'],
        'sub'   => $creds['client_email'],
        'aud'   => 'https://oauth2.googleapis.com/token',
        'iat'   => $now,
        'exp'   => $now + 3600,
        'scope' => 'https://www.googleapis.com/auth/analytics.readonly',
    ];

    $assertion = JWT::encode($payload, $creds['private_key'], 'RS256');

    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => http_build_query([
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion'  => $assertion,
        ]),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded'],
        CURLOPT_TIMEOUT        => 10,
    ]);
    $resp = json_decode(curl_exec($ch), true);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($err) throw new \RuntimeException('Error cURL OAuth2: ' . $err);
    if (empty($resp['access_token'])) throw new \RuntimeException('Token OAuth2 inválido: ' . json_encode($resp));

    return $resp['access_token'];
}

// ── Llamada a GA4 Data API (REST) ────────────────────────────────────────────

function ga4Report(string $token, string $propertyId, array $body): array {
    $url = "https://analyticsdata.googleapis.com/v1beta/properties/{$propertyId}:runReport";
    $ch  = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($body),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . $token,
            'Content-Type: application/json',
        ],
        CURLOPT_TIMEOUT        => 15,
    ]);
    $raw = curl_exec($ch);
    $err = curl_error($ch);
    curl_close($ch);

    if ($err) throw new \RuntimeException('Error cURL GA4: ' . $err);
    $data = json_decode($raw, true);
    if (!is_array($data)) throw new \RuntimeException('Respuesta GA4 inválida');
    if (!empty($data['error'])) throw new \RuntimeException($data['error']['message'] ?? 'Error GA4');

    return $data;
}

function parseOverviewRow(array $row): array {
    $m = $row['metricValues'] ?? [];
    return [
        'users'      => (int)   ($m[0]['value'] ?? 0),
        'sessions'   => (int)   ($m[1]['value'] ?? 0),
        'pageViews'  => (int)   ($m[2]['value'] ?? 0),
        'events'     => (int)   ($m[3]['value'] ?? 0),
        'bounceRate' => round((float)($m[4]['value'] ?? 0) * 100, 1),
    ];
}

$empty = ['users'=>0,'sessions'=>0,'pageViews'=>0,'events'=>0,'bounceRate'=>0.0];

// ── Ejecución ────────────────────────────────────────────────────────────────

try {
    $token = getServiceAccountToken($creds);

    $metrics = [
        ['name' => 'activeUsers'],
        ['name' => 'sessions'],
        ['name' => 'screenPageViews'],
        ['name' => 'eventCount'],
        ['name' => 'bounceRate'],
    ];

    $overviewData = ga4Report($token, $propertyId, [
        'dateRanges' => [
            ['startDate' => $period,    'endDate' => 'today'],
            ['startDate' => $prevStart, 'endDate' => $prevEnd],
        ],
        'metrics' => $metrics,
    ]);

    $overview = ['current' => $empty, 'previous' => $empty];
    foreach ($overviewData['rows'] ?? [] as $row) {
        $rangeKey = $row['dimensionValues'][0]['value'] ?? 'date_range_0';
        if ($rangeKey === 'date_range_0') $overview['current']  = parseOverviewRow($row);
        if ($rangeKey === 'date_range_1') $overview['previous'] = parseOverviewRow($row);
    }

    $pagesData = ga4Report($token, $propertyId, [
        'dateRanges' => [['startDate' => $period, 'endDate' => 'today']],
        'dimensions' => [['name' => 'pagePath']],
        'metrics'    => [['name' => 'screenPageViews']],
        'orderBys'   => [['metric' => ['metricName' => 'screenPageViews'], 'desc' => true]],
        'limit'      => 8,
    ]);
    $pages = [];
    foreach ($pagesData['rows'] ?? [] as $row) {
        $pages[] = [
            'path'  => $row['dimensionValues'][0]['value'] ?? '/',
            'views' => (int)($row['metricValues'][0]['value'] ?? 0),
        ];
    }

    $sourcesData = ga4Report($token, $propertyId, [
        'dateRanges' => [['startDate' => $period, 'endDate' => 'today']],
        'dimensions' => [['name' => 'sessionDefaultChannelGrouping']],
        'metrics'    => [['name' => 'sessions']],
        'orderBys'   => [['metric' => ['metricName' => 'sessions'], 'desc' => true]],
        'limit'      => 6,
    ]);
    $sources = [];
    foreach ($sourcesData['rows'] ?? [] as $row) {
        $sources[] = [
            'channel'  => $row['dimensionValues'][0]['value'] ?? '(unknown)',
            'sessions' => (int)($row['metricValues'][0]['value'] ?? 0),
        ];
    }

    $eventsData = ga4Report($token, $propertyId, [
        'dateRanges' => [['startDate' => $period, 'endDate' => 'today']],
        'dimensions' => [['name' => 'eventName']],
        'metrics'    => [['name' => 'eventCount']],
        'orderBys'   => [['metric' => ['metricName' => 'eventCount'], 'desc' => true]],
        'limit'      => 12,
    ]);
    $events = [];
    foreach ($eventsData['rows'] ?? [] as $row) {
        $events[] = [
            'name'  => $row['dimensionValues'][0]['value'] ?? '',
            'count' => (int)($row['metricValues'][0]['value'] ?? 0),
        ];
    }

    $dailyData = ga4Report($token, $propertyId, [
        'dateRanges' => [['startDate' => $period, 'endDate' => 'today']],
        'dimensions' => [['name' => 'date']],
        'metrics'    => [
            ['name' => 'activeUsers'],
            ['name' => 'sessions'],
        ],
        'orderBys' => [['dimension' => ['orderType' => 'ALPHANUMERIC', 'dimensionName' => 'date'], 'desc' => false]],
        'limit'    => 90,
    ]);
    $daily = [];
    foreach ($dailyData['rows'] ?? [] as $row) {
        $d       = $row['dimensionValues'][0]['value'] ?? '';
        $daily[] = [
            'date'     => substr($d, 0, 4) . '-' . substr($d, 4, 2) . '-' . substr($d, 6, 2),
            'users'    => (int)($row['metricValues'][0]['value'] ?? 0),
            'sessions' => (int)($row['metricValues'][1]['value'] ?? 0),
        ];
    }

    jsonSuccess([
        'configured' => true,
        'period'     => $period,
        'overview'   => $overview,
        'pages'      => $pages,
        'sources'    => $sources,
        'events'     => $events,
        'daily'      => $daily,
    ]);

} catch (\Throwable $e) {
    error_log('[GA4] ' . $e->getMessage());
    jsonError('Error al conectar con GA4: ' . $e->getMessage(), 500);
}
