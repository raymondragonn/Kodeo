<?php
/**
 * Actualiza la información personal (nombre, usuario, correo) del usuario
 * autenticado. Como esos datos viven en el JWT, se reemite un token nuevo.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/auth.php';

use Firebase\JWT\JWT;

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'PATCH') {
    jsonError('Método no permitido', 405);
}

$auth = getAuthUser();

$body     = json_decode(file_get_contents('php://input'), true) ?? [];
$name     = trim($body['name']     ?? '');
$username = trim($body['username'] ?? '');
$email    = trim($body['email']    ?? '');

if (!$name)                                            jsonError('El nombre es requerido');
if (!preg_match('/^[a-z0-9_]{3,30}$/', $username))     jsonError('Usuario inválido: solo letras minúsculas, números y guión bajo (3-30 caracteres)');
if (!filter_var($email, FILTER_VALIDATE_EMAIL))        jsonError('Correo inválido');

try {
    $db = getDb();

    $stmt = $db->prepare('SELECT id FROM users WHERE (email = ? OR username = ?) AND id != ?');
    $stmt->execute([$email, $username, (int)$auth['sub']]);
    if ($stmt->fetch()) {
        jsonError('Este correo o usuario ya está en uso por otra cuenta', 409);
    }

    $db->prepare('UPDATE users SET name = ?, username = ?, email = ? WHERE id = ?')
       ->execute([$name, $username, $email, (int)$auth['sub']]);

    $stmt = $db->prepare('SELECT id, name, username, email, role FROM users WHERE id = ?');
    $stmt->execute([(int)$auth['sub']]);
    $user = $stmt->fetch();

    $secret = getenv('JWT_SECRET') ?: 'kodeo_jwt_secret_dev';
    $now    = time();

    $token = JWT::encode([
        'iss'      => 'kodeo-api',
        'iat'      => $now,
        'exp'      => $now + JWT_TTL_SECONDS,
        'sub'      => $user['id'],
        'name'     => $user['name'],
        'username' => $user['username'],
        'email'    => $user['email'],
        'role'     => $user['role'],
    ], $secret, 'HS256');

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
} catch (\PDOException $e) {
    if ($e->getCode() === '23000') jsonError('Este correo o usuario ya está en uso por otra cuenta', 409);
    jsonError('Error interno del servidor', 500);
}
