<?php
/**
 * Webhook de Cal.com — recibe eventos de reservas.
 * Configurar en: Cal.com → Settings → Webhooks.
 *
 * Eventos manejados:
 *   BOOKING_CREATED      → Crea la cita en BD y notifica al equipo
 *   BOOKING_CANCELLED    → Marca la cita como cancelada
 *   BOOKING_RESCHEDULED  → Actualiza fecha/hora de la cita
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/vendor/autoload.php';

$rawBody = file_get_contents('php://input');

// ── Verificar firma ────────────────────────────────────────────────────────
$secret = CAL_WEBHOOK_SECRET;
if ($secret) {
    $signature = $_SERVER['HTTP_X_CAL_SIGNATURE_256'] ?? '';
    $expected  = hash_hmac('sha256', $rawBody, $secret);
    if (!hash_equals($expected, $signature)) {
        http_response_code(400);
        exit('Firma inválida');
    }
}

$event = json_decode($rawBody, true);
if (!$event) {
    http_response_code(400);
    exit('Payload inválido');
}

$trigger = $event['triggerEvent'] ?? '';
$payload = $event['payload'] ?? [];

switch ($trigger) {
    case 'BOOKING_CREATED':
        handleBookingCreated($payload);
        break;

    case 'BOOKING_CANCELLED':
        handleBookingCancelled($payload);
        break;

    case 'BOOKING_RESCHEDULED':
        handleBookingRescheduled($payload);
        break;

    default:
        // Evento no manejado — ignorar silenciosamente
        break;
}

http_response_code(200);
echo json_encode(['received' => true]);

// ── Handlers ───────────────────────────────────────────────────────────────

function handleBookingCreated(array $payload): void {
    $uid           = $payload['uid'] ?? null;
    $startTime     = $payload['startTime'] ?? null;
    $metadata      = $payload['metadata'] ?? [];
    $serviceCode   = $metadata['serviceCode'] ?? null;
    $service       = $metadata['service'] ?? null;
    $attendees     = $payload['attendees'] ?? [];
    $attendee      = $attendees[0] ?? [];
    $attendeeEmail = $attendee['email'] ?? null;

    if (!$uid) {
        error_log("[CAL] BOOKING_CREATED sin uid — payload: " . json_encode($payload));
        return;
    }

    // Intentar resolver el user_id: primero por metadata, luego por email
    $userId = isset($metadata['userId']) ? (int)$metadata['userId'] : null;
    if (!$userId && $attendeeEmail) {
        $row = getDb()->prepare('SELECT id FROM users WHERE email = ?');
        $row->execute([$attendeeEmail]);
        $found  = $row->fetch();
        $userId = $found ? (int)$found['id'] : null;
    }
    // Si no hay usuario aún, se guarda null — se asociará cuando el usuario cree su cuenta

    $scheduledAt = $startTime ? date('Y-m-d H:i:s', strtotime($startTime)) : null;

    try {
        getDb()->prepare('
            INSERT INTO appointments (user_id, attendee_email, cal_booking_uid, service, service_code, scheduled_at, status)
            VALUES (?, ?, ?, ?, ?, ?, \'confirmed\')
            ON DUPLICATE KEY UPDATE
                user_id        = COALESCE(user_id, VALUES(user_id)),
                attendee_email = VALUES(attendee_email),
                service        = VALUES(service),
                service_code   = VALUES(service_code),
                scheduled_at   = VALUES(scheduled_at),
                status         = \'confirmed\'
        ')->execute([$userId ?: null, $attendeeEmail, $uid, $service, $serviceCode, $scheduledAt]);

        notifyTeamNewBooking($service, $scheduledAt, $attendee);
    } catch (\PDOException $e) {
        error_log('[CAL] Error al insertar cita: ' . $e->getMessage());
    }
}

function handleBookingCancelled(array $payload): void {
    $uid = $payload['uid'] ?? null;
    if (!$uid) return;

    try {
        getDb()->prepare('UPDATE appointments SET status = ? WHERE cal_booking_uid = ?')
               ->execute(['cancelled', $uid]);
    } catch (\PDOException $e) {
        error_log('[CAL] Error al cancelar cita: ' . $e->getMessage());
    }
}

function handleBookingRescheduled(array $payload): void {
    $uid       = $payload['uid'] ?? null;
    $startTime = $payload['startTime'] ?? null;
    if (!$uid) return;

    $scheduledAt = $startTime ? date('Y-m-d H:i:s', strtotime($startTime)) : null;

    try {
        getDb()->prepare('UPDATE appointments SET scheduled_at = ?, status = ? WHERE cal_booking_uid = ?')
               ->execute([$scheduledAt, 'rescheduled', $uid]);
    } catch (\PDOException $e) {
        error_log('[CAL] Error al reprogramar cita: ' . $e->getMessage());
    }
}

function notifyTeamNewBooking(?string $service, ?string $scheduledAt, array $attendee): void {
    $teamEmail = SMTP_FROM_EMAIL;
    if (!$teamEmail) return;

    $attendeeName  = htmlspecialchars($attendee['name']  ?? 'Cliente');
    $attendeeEmail = htmlspecialchars($attendee['email'] ?? '');
    $serviceLabel  = htmlspecialchars($service ?? 'Sin especificar');
    $dateLabel     = $scheduledAt ? date('d/m/Y H:i', strtotime($scheduledAt)) : 'Sin fecha';

    $body = '
        <p style="margin: 0 0 14px;">Se agendó una nueva consulta en Cal.com.</p>
        <p style="margin: 0 0 6px;"><strong style="color:#ffffff;">Cliente:</strong> ' . $attendeeName
            . ($attendeeEmail ? ' (' . $attendeeEmail . ')' : '') . '</p>
        <p style="margin: 0 0 6px;"><strong style="color:#ffffff;">Servicio:</strong> ' . $serviceLabel . '</p>
        <p style="margin: 0 0 6px;"><strong style="color:#ffffff;">Fecha:</strong> ' . $dateLabel . '</p>
    ';

    $html = renderEmailLayout(
        'Nueva consulta agendada',
        $body,
        ['label' => 'Ver panel', 'url' => ALLOWED_ORIGIN . '/panel'],
        DEFAULT_EMAIL_ACCENT
    );

    sendMail($teamEmail, 'Nueva consulta agendada — Kodeo', $html);
}
