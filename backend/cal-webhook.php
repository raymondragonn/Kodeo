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
require_once __DIR__ . '/project-helpers.php';
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
    // Cal.com puede truncar/descartar la metadata en bookings con payloads muy
    // grandes — normalizar a null en vez de string vacío para que el COALESCE
    // del UPDATE no lo confunda con un valor real y borre el servicio ya
    // guardado por confirm-appointment.php.
    $serviceCode   = trim($metadata['serviceCode'] ?? '') ?: null;
    $service       = trim($metadata['service'] ?? '') ?: null;
    $attendees     = $payload['attendees'] ?? [];
    $attendee      = $attendees[0] ?? [];
    $attendeeEmail = $attendee['email'] ?? null;
    $responses     = $payload['responses'] ?? [];
    $whatsapp      = trim($responses['attendeePhoneNumber']['value'] ?? '');
    $videoUrl      = $payload['videoCallUrl'] ?? null;

    // callType distingue las 3 llamadas del proyecto (consulta inicial,
    // revisión de diseño, entrega) — viaja en la metadata del booking.
    $callType = trim($metadata['callType'] ?? '') ?: 'intro';
    if (!in_array($callType, ['intro', 'design_review', 'delivery'], true)) $callType = 'intro';
    $projectId = isset($metadata['projectId']) ? (int)$metadata['projectId'] : null;

    if (!$uid) {
        error_log("[CAL] BOOKING_CREATED sin uid — payload: " . json_encode($payload));
        return;
    }

    $scheduledAt = $startTime ? date('Y-m-d H:i:s', strtotime($startTime)) : null;

    // ── Revisión de diseño / entrega: fila ligera enlazada al proyecto ya
    // existente. El formulario, el pago y el feedback siempre viven en la
    // fila raíz ("intro"); estas filas solo registran la llamada en sí.
    if ($callType !== 'intro') {
        if (!$projectId) {
            error_log("[CAL] BOOKING_CREATED de tipo $callType sin projectId — payload: " . json_encode($payload));
            return;
        }

        $userId = isset($metadata['userId']) ? (int)$metadata['userId'] : null;
        if (!$userId) {
            $row = getDb()->prepare('SELECT user_id FROM appointments WHERE id = ?');
            $row->execute([$projectId]);
            $found  = $row->fetch();
            $userId = $found ? (int)$found['user_id'] : null;
        }

        try {
            getDb()->prepare('
                INSERT INTO appointments (user_id, project_id, attendee_email, whatsapp, cal_booking_uid, service, service_code, call_type, scheduled_at, status, video_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, \'confirmed\', ?)
                ON DUPLICATE KEY UPDATE
                    user_id      = COALESCE(user_id, VALUES(user_id)),
                    project_id   = COALESCE(project_id, VALUES(project_id)),
                    scheduled_at = COALESCE(VALUES(scheduled_at), scheduled_at),
                    video_url    = COALESCE(VALUES(video_url), video_url)
            ')->execute([$userId ?: null, $projectId, $attendeeEmail, $whatsapp ?: null, $uid, $service, $serviceCode, $callType, $scheduledAt, $videoUrl]);

            notifyTeamNewBooking($service, $scheduledAt, $attendee);
            if ($attendeeEmail) notifyGuestBookingConfirmed($payload);
        } catch (\PDOException $e) {
            error_log('[CAL] Error al insertar llamada de proyecto: ' . $e->getMessage());
        }
        return;
    }

    // ── Consulta inicial: crea o actualiza la fila raíz del proyecto. Puede
    // llegar sin cuenta asociada (agendada como invitado, sin login) — se
    // vincula por email cuando el cliente cree su cuenta (ver GET en
    // appointments.php). El formulario de detalles ya no viaja aquí: se
    // llena después, desde el portal, una vez que el admin lo libera.
    $userId = isset($metadata['userId']) ? (int)$metadata['userId'] : null;
    if (!$userId && $attendeeEmail) {
        $row = getDb()->prepare('SELECT id FROM users WHERE email = ?');
        $row->execute([$attendeeEmail]);
        $found  = $row->fetch();
        $userId = $found ? (int)$found['id'] : null;
    }

    try {
        getDb()->prepare('
            INSERT INTO appointments (user_id, attendee_email, whatsapp, cal_booking_uid, service, service_code, call_type, scheduled_at, status, video_url)
            VALUES (?, ?, ?, ?, ?, ?, \'intro\', ?, \'confirmed\', ?)
            ON DUPLICATE KEY UPDATE
                user_id        = COALESCE(user_id, VALUES(user_id)),
                attendee_email = COALESCE(VALUES(attendee_email), attendee_email),
                whatsapp       = COALESCE(VALUES(whatsapp), whatsapp),
                service        = COALESCE(VALUES(service), service),
                service_code   = COALESCE(VALUES(service_code), service_code),
                scheduled_at   = COALESCE(VALUES(scheduled_at), scheduled_at),
                video_url      = COALESCE(VALUES(video_url), video_url)
        ')->execute([$userId ?: null, $attendeeEmail, $whatsapp ?: null, $uid, $service, $serviceCode, $scheduledAt, $videoUrl]);

        $stmt = getDb()->prepare("
            SELECT id, user_id, service, service_code
            FROM appointments
            WHERE cal_booking_uid = ? AND call_type = 'intro'
            LIMIT 1
        ");
        $stmt->execute([$uid]);
        $appointment = $stmt->fetch();
        if ($appointment) {
            ensureDiagnosticProjectForIntroAppointment(
                getDb(),
                (int) $appointment['id'],
                isset($appointment['user_id']) ? (int) $appointment['user_id'] : null,
                $appointment['service'] ?? null,
                $appointment['service_code'] ?? null
            );
        }

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
        ['label' => 'Ver citas', 'url' => ALLOWED_ORIGIN . '/citas'],
        DEFAULT_EMAIL_ACCENT
    );

    sendMail($teamEmail, 'Nueva consulta agendada — Kodeo', $html);
}
