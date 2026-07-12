<?php

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Método no permitido', 405);
}

$body = json_decode(file_get_contents('php://input'), true);

$name     = trim($body['name']     ?? '');
$email    = trim($body['email']    ?? '');
$password =      $body['password'] ?? '';

if (!$name)                                               jsonError('El nombre es requerido');
if (!filter_var($email, FILTER_VALIDATE_EMAIL))           jsonError('Correo inválido');
if (strlen($password) < 8)                                jsonError('La contraseña debe tener al menos 8 caracteres');
if (strlen($password) > 64)                               jsonError('La contraseña no puede exceder 64 caracteres');
if (!preg_match('/[a-z]/', $password))                    jsonError('La contraseña debe incluir al menos una letra minúscula');
if (!preg_match('/[A-Z]/', $password))                    jsonError('La contraseña debe incluir al menos una letra mayúscula');
if (!preg_match('/[0-9]/', $password))                    jsonError('La contraseña debe incluir al menos un número');
if (!preg_match('/[^A-Za-z0-9]/', $password))             jsonError('La contraseña debe incluir al menos un carácter especial');

try {
    $db = getDb();

    $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        jsonError('Este correo ya está registrado', 409);
    }

    // El username no se pide en el formulario: se genera automáticamente a
    // partir del correo y se garantiza único (generateUsername vive en config.php).
    $username = generateUsername($db, '', $email);

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
