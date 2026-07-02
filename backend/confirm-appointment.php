<?php
/**
 * Crea la cita si aún no existe. Sirve como respaldo síncrono al webhook de
 * Cal.com: el frontend lo llama justo después de un booking exitoso para que
 * la cita quede reflejada en /panel sin depender de que el webhook ya haya
 * llegado (el webhook sigue siendo la fuente autoritativa — al llegar
 * actualiza whatsapp, video_url y estado vía ON DUPLICATE KEY).
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/vendor/autoload.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Método no permitido', 405);
}

$auth = getAuthUser();

$body        = json_decode(file_get_contents('php://input'), true) ?? [];
$uid         = trim($body['uid'] ?? '');
$startTime   = $body['startTime'] ?? null;
$service     = $body['service'] ?? null;
$serviceCode = $body['serviceCode'] ?? null;

if (!$uid) {
    jsonError('uid requerido.');
}

$scheduledAt = $startTime ? date('Y-m-d H:i:s', strtotime($startTime)) : null;

try {
    getDb()->prepare('
        INSERT INTO appointments (user_id, attendee_email, cal_booking_uid, service, service_code, scheduled_at, status)
        VALUES (?, ?, ?, ?, ?, ?, \'confirmed\')
    ')->execute([(int)$auth['sub'], $auth['email'], $uid, $service, $serviceCode, $scheduledAt]);

    jsonSuccess(['created' => true]);
} catch (\PDOException $e) {
    if ($e->getCode() !== '23000') throw $e; // ya existe (creada por el webhook o una llamada previa)
    jsonSuccess(['created' => false, 'status' => 'already_exists']);
}
