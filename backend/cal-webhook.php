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
    $responses     = $payload['responses'] ?? [];
    $whatsapp      = trim($responses['attendeePhoneNumber']['value'] ?? '');
    $videoUrl      = $payload['videoCallUrl'] ?? null;

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
            INSERT INTO appointments (user_id, attendee_email, whatsapp, cal_booking_uid, service, service_code, scheduled_at, status, video_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, \'confirmed\', ?)
            ON DUPLICATE KEY UPDATE
                user_id        = COALESCE(user_id, VALUES(user_id)),
                attendee_email = VALUES(attendee_email),
                whatsapp       = VALUES(whatsapp),
                service        = VALUES(service),
                service_code   = VALUES(service_code),
                scheduled_at   = VALUES(scheduled_at),
                status         = \'confirmed\',
                video_url      = VALUES(video_url)
        ')->execute([$userId ?: null, $attendeeEmail, $whatsapp ?: null, $uid, $service, $serviceCode, $scheduledAt, $videoUrl]);

        notifyTeamNewBooking($service, $scheduledAt, $attendee);
        if ($attendeeEmail) notifyGuestBookingConfirmed($payload);
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

    $attendees = $payload['attendees'] ?? [];
    $hasEmail  = !empty(($attendees[0] ?? [])['email']);
    if ($hasEmail) notifyGuestBookingCancelled($payload);

}

function handleBookingRescheduled(array $payload): void {
    $uid       = $payload['uid'] ?? null;
    $startTime = $payload['startTime'] ?? null;
    if (!$uid) return;

    $scheduledAt = $startTime ? date('Y-m-d H:i:s', strtotime($startTime)) : null;

    $videoUrl = $payload['videoCallUrl'] ?? null;

    try {
        getDb()->prepare('UPDATE appointments SET scheduled_at = ?, status = ?, video_url = ? WHERE cal_booking_uid = ?')
               ->execute([$scheduledAt, 'rescheduled', $videoUrl, $uid]);
    } catch (\PDOException $e) {
        error_log('[CAL] Error al reprogramar cita: ' . $e->getMessage());
    }

    $attendees = $payload['attendees'] ?? [];
    $hasEmail  = !empty(($attendees[0] ?? [])['email']);
    if ($hasEmail) notifyGuestBookingRescheduled($payload);

}

function notifyGuestBookingCancelled(array $payload): void {
    $attendees   = $payload['attendees']   ?? [];
    $organizer   = $payload['organizer']   ?? [];
    $startTime   = $payload['startTime']   ?? null;
    $endTime     = $payload['endTime']     ?? null;
    $metadata    = $payload['metadata']    ?? [];
    $service     = $metadata['service']    ?? null;
    $cancellationReason = trim($payload['cancellationReason'] ?? '');

    $accent        = SERVICE_ACCENTS[$service] ?? DEFAULT_EMAIL_ACCENT;
    $organizerName = htmlspecialchars($organizer['name'] ?? 'Kodeo | Agencia Digital');
    $dateLabel     = formatBookingDateSpanish($startTime, $endTime);

    foreach ($attendees as $attendee) {
        $name  = $attendee['name']  ?? 'Cliente';
        $email = $attendee['email'] ?? null;
        if (!$email) continue;

        $serviceRow = $service
            ? '<p style="margin:0 0 8px;"><strong style="color:#ffffff;">Servicio:</strong> ' . htmlspecialchars($service) . '</p>'
            : '';

        $reasonRow = $cancellationReason
            ? '<p style="margin:12px 0 0;"><strong style="color:#ffffff;">Motivo:</strong> ' . htmlspecialchars($cancellationReason) . '</p>'
            : '';

        $waUrl = 'https://wa.me/' . KODEO_WHATSAPP . '?text=' . rawurlencode('Hola, quisiera hablar sobre mi reunión con ustedes.');

        $body = '
            <p style="margin:0 0 24px;">Hola ' . htmlspecialchars($name) . ', tu reunión ha sido cancelada.</p>
            <div style="border-left:3px solid #e05050; padding-left:16px;">
                ' . $serviceRow . '
                <p style="margin:0 0 8px;"><strong style="color:#ffffff;">Fecha que tenías:</strong> ' . htmlspecialchars($dateLabel) . '</p>
                <p style="margin:0 0 4px;"><strong style="color:#ffffff;">Organizador:</strong> ' . $organizerName . '</p>
                ' . $reasonRow . '
            </div>
            <p style="margin:24px 0 0; color:#9b9b9b;">Si deseas reagendar o tienes alguna duda, escríbenos directamente por WhatsApp.</p>
        ';

        $html = renderEmailLayout(
            'Reunión cancelada',
            $body,
            ['label' => 'Escribir por WhatsApp', 'url' => $waUrl],
            '#e05050'
        );
        sendMail($email, 'Tu reunión con Kodeo ha sido cancelada', $html);
    }
}

function notifyGuestBookingRescheduled(array $payload): void {
    $attendees = $payload['attendees'] ?? [];
    $organizer = $payload['organizer'] ?? [];
    $startTime = $payload['startTime'] ?? null;
    $endTime   = $payload['endTime']   ?? null;
    $videoUrl  = $payload['videoCallUrl'] ?? null;
    $metadata  = $payload['metadata']    ?? [];
    $service   = $metadata['service']    ?? null;

    $accent        = SERVICE_ACCENTS[$service] ?? DEFAULT_EMAIL_ACCENT;
    $organizerName = htmlspecialchars($organizer['name'] ?? 'Kodeo | Agencia Digital');
    $dateLabel     = formatBookingDateSpanish($startTime, $endTime);

    foreach ($attendees as $attendee) {
        $name  = $attendee['name']  ?? 'Cliente';
        $email = $attendee['email'] ?? null;
        if (!$email) continue;

        $serviceRow = $service
            ? '<p style="margin:0 0 8px;"><strong style="color:#ffffff;">Servicio:</strong> ' . htmlspecialchars($service) . '</p>'
            : '';

        $whereRow = $videoUrl
            ? '<p style="margin:12px 0 0;"><strong style="color:#ffffff;">Enlace de la reunión:</strong><br>
               <a href="' . htmlspecialchars($videoUrl) . '" style="color:' . htmlspecialchars($accent) . '; word-break:break-all;">' . htmlspecialchars($videoUrl) . '</a></p>'
            : '';

        $waUrl = 'https://wa.me/' . KODEO_WHATSAPP . '?text=' . rawurlencode('Hola, quisiera hablar sobre mi reunión con ustedes.');

        $body = '
            <p style="margin:0 0 24px;">Hola ' . htmlspecialchars($name) . ', tu reunión ha sido reagendada.</p>
            <div style="border-left:3px solid ' . htmlspecialchars($accent) . '; padding-left:16px;">
                ' . $serviceRow . '
                <p style="margin:0 0 8px;"><strong style="color:#ffffff;">Nueva fecha:</strong> ' . htmlspecialchars($dateLabel) . '</p>
                <p style="margin:0 0 4px;"><strong style="color:#ffffff;">Organizador:</strong> ' . $organizerName . '</p>
                ' . $whereRow . '
            </div>
            <p style="margin:24px 0 0; color:#9b9b9b;">Para reagendar o cancelar tu reunión, escríbenos directamente por WhatsApp.</p>
        ';

        $cta  = $videoUrl
            ? ['label' => 'Unirse a la reunión', 'url' => $videoUrl]
            : ['label' => 'Escribir por WhatsApp', 'url' => $waUrl];
        $html = renderEmailLayout('Reunión reagendada', $body, $cta, $accent);
        sendMail($email, 'Tu reunión con Kodeo ha sido reagendada', $html);
    }
}

function notifyGuestBookingConfirmed(array $payload): void {
    $attendees = $payload['attendees']    ?? [];
    $organizer = $payload['organizer']    ?? [];
    $startTime = $payload['startTime']    ?? null;
    $endTime   = $payload['endTime']      ?? null;
    $videoUrl  = $payload['videoCallUrl'] ?? null;
    $metadata  = $payload['metadata']     ?? [];
    $service   = $metadata['service']     ?? null;

    $accent        = SERVICE_ACCENTS[$service] ?? DEFAULT_EMAIL_ACCENT;
    $organizerName = htmlspecialchars($organizer['name'] ?? 'Kodeo | Agencia Digital');
    $dateLabel     = formatBookingDateSpanish($startTime, $endTime);

    $waUrl = 'https://wa.me/' . KODEO_WHATSAPP . '?text=' . rawurlencode('Hola, quisiera hablar sobre mi reunión con ustedes.');

    foreach ($attendees as $attendee) {
        $name  = $attendee['name']  ?? 'Cliente';
        $email = $attendee['email'] ?? null;
        if (!$email) continue;

        $serviceRow = $service
            ? '<p style="margin:0 0 8px;"><strong style="color:#ffffff;">Servicio:</strong> ' . htmlspecialchars($service) . '</p>'
            : '';

        $whereRow = $videoUrl
            ? '<p style="margin:12px 0 0;"><strong style="color:#ffffff;">Enlace de la reunión:</strong><br>
               <a href="' . htmlspecialchars($videoUrl) . '" style="color:' . htmlspecialchars($accent) . '; word-break:break-all;">' . htmlspecialchars($videoUrl) . '</a></p>'
            : '';

        $body = '
            <p style="margin:0 0 24px;">Hola ' . htmlspecialchars($name) . ', tu reunión con el equipo de Kodeo ha sido agendada.</p>
            <div style="border-left:3px solid ' . htmlspecialchars($accent) . '; padding-left:16px;">
                ' . $serviceRow . '
                <p style="margin:0 0 8px;"><strong style="color:#ffffff;">Cuándo:</strong> ' . htmlspecialchars($dateLabel) . '</p>
                <p style="margin:0 0 4px;"><strong style="color:#ffffff;">Organizador:</strong> ' . $organizerName . '</p>
                ' . $whereRow . '
            </div>
            <p style="margin:24px 0 0; color:#9b9b9b;">Para reagendar o cancelar tu reunión, escríbenos directamente por WhatsApp.</p>
        ';

        $cta = $videoUrl
            ? ['label' => 'Unirse a la reunión', 'url' => $videoUrl]
            : ['label' => 'Escribir por WhatsApp', 'url' => $waUrl];

        $html = renderEmailLayout('Reunión agendada', $body, $cta, $accent);
        sendMail($email, 'Tu reunión con Kodeo ha sido agendada', $html);
    }
}

function formatBookingDateSpanish(?string $startIso, ?string $endIso): string {
    if (!$startIso) return 'Por definir';

    $days   = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    $months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
               'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    $tz    = new \DateTimeZone('America/Mexico_City');
    $start = new \DateTime($startIso);
    $start->setTimezone($tz);

    $dayName   = $days[(int) $start->format('w')];
    $day       = (int) $start->format('j');
    $monthName = $months[(int) $start->format('n') - 1];
    $year      = $start->format('Y');
    $startH    = $start->format('g:i') . ($start->format('A') === 'AM' ? ' am' : ' pm');

    $dateStr = $dayName . ', ' . $day . ' de ' . $monthName . ' de ' . $year;

    if ($endIso) {
        $end  = new \DateTime($endIso);
        $end->setTimezone($tz);
        $endH = $end->format('g:i') . ($end->format('A') === 'AM' ? ' am' : ' pm');
        return $dateStr . ' · ' . $startH . ' – ' . $endH . ' (Ciudad de México)';
    }

    return $dateStr . ' · ' . $startH . ' (Ciudad de México)';
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
