<?php
/**
 * Crea la cita si aún no existe. Sirve como respaldo síncrono al webhook de
 * Cal.com: el frontend lo llama justo después de un booking exitoso para que
 * la cita quede reflejada en /citas sin depender de que el webhook ya haya
 * llegado (el webhook sigue siendo la fuente autoritativa — al llegar
 * actualiza whatsapp, video_url y estado vía ON DUPLICATE KEY).
 *
 * Solo se invoca cuando hay sesión iniciada: la consulta inicial anónima
 * (sin cuenta) depende únicamente del webhook, ya que este endpoint requiere
 * JWT. Cubre 3 casos:
 *   - Cliente logueado agenda una consulta inicial (proyecto nuevo).
 *   - Cliente logueado agenda la revisión de diseño de un proyecto propio.
 *   - Admin agenda la entrega a nombre del cliente dueño del proyecto.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/project-helpers.php';
require_once __DIR__ . '/vendor/autoload.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Método no permitido', 405);
}

$auth = getAuthUser();

$body        = json_decode(file_get_contents('php://input'), true) ?? [];
$uid         = trim($body['uid'] ?? '');
$startTime   = $body['startTime'] ?? null;
$service     = trim($body['service'] ?? '') ?: null;
$serviceCode = trim($body['serviceCode'] ?? '') ?: null;
$callType    = trim($body['call_type'] ?? '') ?: 'intro';
if (!in_array($callType, ['intro', 'design_review', 'delivery'], true)) $callType = 'intro';
$projectId = isset($body['project_id']) ? (int) $body['project_id'] : null;

if (!$uid) {
    jsonError('uid requerido.');
}

$scheduledAt = $startTime ? date('Y-m-d H:i:s', strtotime($startTime)) : null;
$db          = getDb();

// ── Revisión de diseño / entrega: fila ligera enlazada al proyecto ─────────
if ($callType !== 'intro') {
    if (!$projectId) jsonError('project_id requerido.');

    $row = $db->prepare('SELECT user_id FROM appointments WHERE id = ? AND call_type = \'intro\'');
    $row->execute([$projectId]);
    $project = $row->fetch();
    if (!$project) jsonError('Proyecto no encontrado', 404);

    $userId = (int) $project['user_id'];
    if ($auth['role'] !== 'administrador' && $userId !== (int) $auth['sub']) {
        jsonError('Acceso denegado', 403);
    }

    $db->prepare('
        INSERT INTO appointments (user_id, project_id, attendee_email, cal_booking_uid, service, service_code, call_type, scheduled_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, \'confirmed\')
        ON DUPLICATE KEY UPDATE
            scheduled_at = COALESCE(scheduled_at, VALUES(scheduled_at))
    ')->execute([$userId, $projectId, $auth['email'], $uid, $service, $serviceCode, $callType, $scheduledAt]);

    jsonSuccess(['created' => true]);
}

// ── Consulta inicial (cliente ya logueado agendando un proyecto) ──────────
$db->prepare('
    INSERT INTO appointments (user_id, attendee_email, cal_booking_uid, service, service_code, call_type, scheduled_at, status)
    VALUES (?, ?, ?, ?, ?, \'intro\', ?, \'confirmed\')
    ON DUPLICATE KEY UPDATE
        service      = COALESCE(service, VALUES(service)),
        service_code = COALESCE(service_code, VALUES(service_code)),
        scheduled_at = COALESCE(scheduled_at, VALUES(scheduled_at))
')->execute([(int) $auth['sub'], $auth['email'], $uid, $service, $serviceCode, $scheduledAt]);

$stmt = $db->prepare("
    SELECT id, user_id, service, service_code
    FROM appointments
    WHERE cal_booking_uid = ? AND call_type = 'intro'
    LIMIT 1
");
$stmt->execute([$uid]);
$appointment = $stmt->fetch();
if ($appointment) {
    ensureDiagnosticProjectForIntroAppointment(
        $db,
        (int) $appointment['id'],
        isset($appointment['user_id']) ? (int) $appointment['user_id'] : null,
        $appointment['service'] ?? null,
        $appointment['service_code'] ?? null
    );
}

jsonSuccess(['created' => true]);
