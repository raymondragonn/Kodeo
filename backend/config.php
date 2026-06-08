<?php

// Cargar .env si existe (Docker lo inyecta como variables de entorno reales,
// pero en hosting sin Docker hay que parsearlo aquí antes de leer getenv())
$envFile = __DIR__ . '/.env';
if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) continue;
        [$key, $val] = explode('=', $line, 2);
        if (!getenv(trim($key))) putenv(trim($key) . '=' . trim($val));
    }
}

mb_internal_encoding('UTF-8');
mb_language('neutral');

define('STRIPE_SECRET_KEY',     getenv('STRIPE_SECRET_KEY')     ?: 'sk_test_REEMPLAZA_CON_TU_CLAVE_SECRETA');
define('STRIPE_PUBLISHABLE_KEY', getenv('STRIPE_PUBLISHABLE_KEY') ?: 'pk_test_REEMPLAZA_CON_TU_CLAVE_PUBLICA');
define('STRIPE_WEBHOOK_SECRET', getenv('STRIPE_WEBHOOK_SECRET')  ?: 'whsec_REEMPLAZA_CON_TU_WEBHOOK_SECRET');
define('ALLOWED_ORIGIN',        getenv('ALLOWED_ORIGIN')        ?: 'http://localhost:5000');

function setCorsHeaders(): void {
    $origin     = $_SERVER['HTTP_ORIGIN'] ?? '';
    $envOrigin  = ALLOWED_ORIGIN;

    // En desarrollo acepta cualquier origen localhost; en producción usa ALLOWED_ORIGIN exacto
    $isLocalhost = (bool) preg_match('/^https?:\/\/localhost(:\d+)?$/', $origin);
    $allowed     = ($isLocalhost || $origin === $envOrigin) ? $origin : $envOrigin;

    header('Access-Control-Allow-Origin: ' . $allowed);
    header('Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Vary: Origin');
    header('Content-Type: application/json; charset=utf-8');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function jsonError(string $message, int $code = 400): never {
    http_response_code($code);
    echo json_encode(['error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonSuccess(array $data): never {
    http_response_code(200);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
