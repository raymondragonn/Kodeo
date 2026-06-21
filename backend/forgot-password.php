<?php
/**
 * Solicita el restablecimiento de contraseña: genera un token de un solo uso,
 * lo guarda hasheado (1h de vigencia) y envía el enlace por correo.
 * Siempre responde con éxito genérico, exista o no la cuenta, para no filtrar
 * qué correos están registrados.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/vendor/autoload.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Método no permitido', 405);
}

$body  = json_decode(file_get_contents('php://input'), true);
$email = trim($body['email'] ?? '');

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonError('Ingresa un correo válido.');
}

$genericResponse = ['message' => 'Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña.'];

try {
    $db = getDb();

    $stmt = $db->prepare('SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    // Cuenta inexistente o creada solo por OAuth (sin contraseña que restablecer)
    if (!$user || $user['password_hash'] === null) {
        jsonSuccess($genericResponse);
    }

    $token     = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $token);
    $expires   = (new DateTime('+1 hour'))->format('Y-m-d H:i:s');

    $db->prepare('UPDATE users SET reset_token_hash = ?, reset_token_expires = ? WHERE id = ?')
       ->execute([$tokenHash, $expires, $user['id']]);

    $resetUrl = ALLOWED_ORIGIN . '/restablecer?token=' . $token;

    $body = '
        <p style="margin: 0 0 14px;">Hola ' . htmlspecialchars($user['name']) . ',</p>
        <p style="margin: 0 0 14px;">Recibimos una solicitud para restablecer tu contraseña en Kodeo. Este enlace es válido por 1 hora.</p>
        <p style="margin: 0;">Si no solicitaste esto, puedes ignorar este correo — tu contraseña seguirá igual.</p>
    ';

    $html = renderEmailLayout(
        'Restablece tu contraseña',
        $body,
        ['label' => 'Restablecer mi contraseña', 'url' => $resetUrl]
    );

    sendMail($user['email'], 'Restablece tu contraseña — Kodeo', $html);

    jsonSuccess($genericResponse);
} catch (\PDOException $e) {
    jsonError('Error interno del servidor', 500);
}
