<?php

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Método no permitido', 405);
}

$body = json_decode(file_get_contents('php://input'), true);

$name     = trim($body['name']     ?? '');
$username = trim($body['username'] ?? '');
$email    = trim($body['email']    ?? '');
$password =      $body['password'] ?? '';

if (!$name)                                               jsonError('El nombre es requerido');
if (!$username)                                           jsonError('El usuario es requerido');
if (!preg_match('/^[a-z0-9_]{3,30}$/', $username))       jsonError('Usuario inválido: solo letras minúsculas, números y guión bajo (3-30 caracteres)');
if (!filter_var($email, FILTER_VALIDATE_EMAIL))           jsonError('Correo inválido');
if (strlen($password) < 8)                                jsonError('La contraseña debe tener al menos 8 caracteres');

try {
    $db = getDb();

    $stmt = $db->prepare('SELECT id FROM users WHERE email = ? OR username = ?');
    $stmt->execute([$email, $username]);
    $existing = $stmt->fetch();
    if ($existing) {
        jsonError('Este correo o usuario ya está registrado', 409);
    }

    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    $role = defaultRoleForEmail($email);

    $stmt = $db->prepare('INSERT INTO users (name, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$name, $username, $email, $hash, $role]);

    jsonSuccess([
        'message' => 'Cuenta creada correctamente',
        'user'    => ['id' => (int) $db->lastInsertId(), 'name' => $name, 'username' => $username, 'email' => $email],
    ]);

} catch (PDOException $e) {
    jsonError('Error interno del servidor', 500);
}
