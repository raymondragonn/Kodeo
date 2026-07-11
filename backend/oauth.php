<?php

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\JWK;

// Debug logging
$debug_log = function($msg) {
    file_put_contents('/var/www/html/oauth_debug.log', date('Y-m-d H:i:s') . " - " . $msg . "\n", FILE_APPEND);
};

$debug_log("=== Nueva petición ===");
$debug_log("Method: " . $_SERVER['REQUEST_METHOD']);
$debug_log("Content-Type: " . ($_SERVER['CONTENT_TYPE'] ?? 'N/A'));

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Método no permitido', 405);
}

$body     = json_decode(file_get_contents('php://input'), true);
$provider = $body['provider'] ?? '';
$token    = $body['token']    ?? '';
$name     = $body['name']     ?? null;

if (!in_array($provider, ['google', 'apple'], true)) jsonError('Provider no válido');
if (!$token) jsonError('Token requerido');

// ----------------------------------------------------------------
//  Verificación según provider
// ----------------------------------------------------------------

$oauthId = null;
$email   = null;

if ($provider === 'google') {
    try {
        $debug_log("Obteniendo claves JWK de Firebase...");
        $ctx = stream_context_create(['http' => ['timeout' => 10]]);
        $raw = @file_get_contents(
            'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
            false,
            $ctx
        );

        if ($raw === false) {
            $debug_log("Error: No se pudo contactar a Google. PHP Error: " . (error_get_last()['message'] ?? 'Unknown'));
            jsonError('No se pudo verificar el token: fallo al contactar los servidores de Google', 502);
        }

        $debug_log("Claves JWK obtenidas: " . strlen($raw) . " bytes");
        $jwks = json_decode($raw, true);

        if (!$jwks || !isset($jwks['keys'])) {
            $debug_log("Error: Formato JWK inválido");
            jsonError('Error interno al obtener claves de Firebase', 500);
        }

        $keys = JWK::parseKeySet($jwks);
        JWT::$leeway = 300; // tolera hasta 5 min de desfase de reloj (común en Docker/Windows)
        $decoded = JWT::decode($token, $keys);
        $debug_log("JWT decodificado: sub=" . ($decoded->sub ?? 'N/A'));

        $firebaseProjectId = getenv('FIREBASE_PROJECT_ID') ?: 'kodeoweb-c4691';
        $expectedIss       = 'https://securetoken.google.com/' . $firebaseProjectId;

        if (($decoded->aud ?? '') !== $firebaseProjectId) {
            $debug_log("aud inválido: " . ($decoded->aud ?? 'N/A'));
            jsonError('El token no pertenece a este proyecto Firebase', 401);
        }
        if (($decoded->iss ?? '') !== $expectedIss) {
            $debug_log("iss inválido: " . ($decoded->iss ?? 'N/A'));
            jsonError('Emisor del token inválido', 401);
        }

        $oauthId = $decoded->sub   ?? null;
        $email   = $decoded->email ?? null;
        if (!$name) $name = $decoded->name ?? null;
        $debug_log("Token Firebase válido: oauthId=$oauthId, email=$email");

    } catch (Exception $e) {
        $debug_log("Exception: " . $e->getMessage());
        jsonError('Token de Google inválido: ' . $e->getMessage(), 401);
    }
} elseif ($provider === 'apple') {
    $ctx  = stream_context_create(['http' => ['timeout' => 5]]);
    $raw  = @file_get_contents('https://appleid.apple.com/auth/keys', false, $ctx);

    if ($raw === false) jsonError('No se pudo obtener claves de Apple', 502);

    $jwks = json_decode($raw, true);

    try {
        $keys    = JWK::parseKeySet($jwks);
        $decoded = JWT::decode($token, $keys);
    } catch (Exception $e) {
        jsonError('Token de Apple inválido: ' . $e->getMessage(), 401);
    }

    $oauthId = $decoded->sub   ?? null;
    $email   = $decoded->email ?? null;
    if (!$name && isset($body['name'])) $name = $body['name'];
}

if (!$oauthId) jsonError('No se pudo extraer identidad del token', 401);
if (!$email)   jsonError('El token no incluye email', 401);

// ----------------------------------------------------------------
//  Find-or-create
// ----------------------------------------------------------------

try {
    $db = getDb();

    // 1. Buscar por oauth_provider + oauth_id
    $stmt = $db->prepare('SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ? LIMIT 1');
    $stmt->execute([$provider, $oauthId]);
    $user = $stmt->fetch();

    if (!$user) {
        // 2. Buscar por email
        $stmt = $db->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user) {
            // Vincular cuenta existente
            $stmt = $db->prepare('UPDATE users SET oauth_provider = ?, oauth_id = ? WHERE id = ?');
            $stmt->execute([$provider, $oauthId, $user['id']]);
            $user['oauth_provider'] = $provider;
            $user['oauth_id']       = $oauthId;
        } else {
            // 3. Crear nuevo usuario
            $displayName = $name ?: explode('@', $email)[0];
            $username    = generateUsername($db, $displayName, $email);
            $role        = defaultRoleForEmail($email);

            $stmt = $db->prepare(
                'INSERT INTO users (name, username, email, password_hash, oauth_provider, oauth_id, role)
                 VALUES (?, ?, ?, NULL, ?, ?, ?)'
            );
            $stmt->execute([$displayName, $username, $email, $provider, $oauthId, $role]);

            $stmt = $db->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
            $stmt->execute([$db->lastInsertId()]);
            $user = $stmt->fetch();
        }
    }

    $user = ensureAdminRole($db, $user);

} catch (PDOException $e) {
    jsonError('Error interno del servidor', 500);
}

// ----------------------------------------------------------------
//  Emitir JWT
// ----------------------------------------------------------------

$secret = getenv('JWT_SECRET') ?: 'kodeo_jwt_secret_dev';
$now    = time();

$payload = [
    'iss'      => 'kodeo-api',
    'iat'      => $now,
    'exp'      => $now + 60 * 60 * 24 * 7,
    'sub'      => $user['id'],
    'name'     => $user['name'],
    'username' => $user['username'],
    'email'    => $user['email'],
    'role'     => $user['role'],
];

$jwtToken = JWT::encode($payload, $secret, 'HS256');

jsonSuccess([
    'token' => $jwtToken,
    'user'  => [
        'id'       => (int) $user['id'],
        'name'     => $user['name'],
        'username' => $user['username'],
        'email'    => $user['email'],
        'role'     => $user['role'],
    ],
]);

// ----------------------------------------------------------------
//  Helper
// ----------------------------------------------------------------

function generateUsername(PDO $db, string $name, ?string $email): string {
    $base = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', explode(' ', $name)[0]));

    if (!$base && $email) {
        $base = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', explode('@', $email)[0]));
    }

    if (!$base) $base = 'usuario';

    $stmt = $db->prepare('SELECT username FROM users WHERE username = ? LIMIT 1');
    $stmt->execute([$base]);

    if (!$stmt->fetch()) return $base;

    for ($i = 2; $i <= 9999; $i++) {
        $candidate = $base . $i;
        $stmt->execute([$candidate]);
        if (!$stmt->fetch()) return $candidate;
    }

    return $base . bin2hex(random_bytes(3));
}
