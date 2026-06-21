<?php

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/vendor/autoload.php';

use Firebase\JWT\JWT;

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Método no permitido', 405);
}

$body       = json_decode(file_get_contents('php://input'), true);
$identifier = trim($body['identifier'] ?? ''); // correo o usuario
$password   =      $body['password']   ?? '';

if (!$identifier) jsonError('Ingresa tu correo o usuario');
if (!$password)   jsonError('Ingresa tu contraseña');

try {
    $db = getDb();

    // Buscar por email o username
    $stmt = $db->prepare('SELECT * FROM users WHERE email = ? OR username = ? LIMIT 1');
    $stmt->execute([$identifier, $identifier]);
    $user = $stmt->fetch();

    if (!$user) jsonError('Credenciales incorrectas', 401);
    if ($user['password_hash'] === null) jsonError('Esta cuenta usa inicio de sesión con ' . ucfirst($user['oauth_provider'] ?? 'OAuth') . '. Usa el botón correspondiente.', 401);
    if (!password_verify($password, $user['password_hash'])) jsonError('Credenciales incorrectas', 401);

    ensureAdminRole($db, $user);

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

    $token = JWT::encode($payload, $secret, 'HS256');

    jsonSuccess([
        'token' => $token,
        'user'  => [
            'id'       => (int) $user['id'],
            'name'     => $user['name'],
            'username' => $user['username'],
            'email'    => $user['email'],
            'role'     => $user['role'],
        ],
    ]);

} catch (PDOException $e) {
    jsonError('Error interno del servidor', 500);
}
