<?php
/**
 * Restablece la contraseña a partir de un token válido y no expirado
 * generado por forgot-password.php.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Método no permitido', 405);
}

$body     = json_decode(file_get_contents('php://input'), true);
$token    = trim($body['token']    ?? '');
$password =      $body['password'] ?? '';

if (!$token)                jsonError('Enlace inválido.');
if (strlen($password) < 8)  jsonError('La contraseña debe tener al menos 8 caracteres');

try {
    $db = getDb();

    $tokenHash = hash('sha256', $token);

    $stmt = $db->prepare('
        SELECT id FROM users
        WHERE reset_token_hash = ? AND reset_token_expires > NOW()
        LIMIT 1
    ');
    $stmt->execute([$tokenHash]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonError('El enlace es inválido o ya expiró. Solicita uno nuevo.', 400);
    }

    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);

    $db->prepare('
        UPDATE users
        SET password_hash = ?, reset_token_hash = NULL, reset_token_expires = NULL
        WHERE id = ?
    ')->execute([$hash, $user['id']]);

    jsonSuccess(['message' => 'Contraseña actualizada correctamente.']);
} catch (\PDOException $e) {
    jsonError('Error interno del servidor', 500);
}
