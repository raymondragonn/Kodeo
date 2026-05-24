<?php

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\JWK;

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
    $ctx = stream_context_create(['http' => ['timeout' => 5]]);
    $raw = @file_get_contents(
        'https://oauth2.googleapis.com/tokeninfo?id_token=' . urlencode($token),
        false,
        $ctx
    );

    if ($raw === false) jsonError('No se pudo verificar el token de Google', 502);

    $payload = json_decode($raw, true);

    if (!empty($payload['error_description'])) {
        jsonError('Token de Google inválido: ' . $payload['error_description'], 401);
    }

    $clientId = getenv('GOOGLE_CLIENT_ID') ?: '';
    if ($clientId && ($payload['aud'] ?? '') !== $clientId) {
        jsonError('Token de Google no pertenece a esta aplicación', 401);
    }

    $oauthId = $payload['sub']   ?? null;
    $email   = $payload['email'] ?? null;
    if (!$name) $name = $payload['name'] ?? null;

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

            $stmt = $db->prepare(
                'INSERT INTO users (name, username, email, password_hash, oauth_provider, oauth_id)
                 VALUES (?, ?, ?, NULL, ?, ?)'
            );
            $stmt->execute([$displayName, $username, $email, $provider, $oauthId]);

            $stmt = $db->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
            $stmt->execute([$db->lastInsertId()]);
            $user = $stmt->fetch();
        }
    }

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
