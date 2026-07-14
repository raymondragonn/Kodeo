<?php

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/project-helpers.php';
require_once __DIR__ . '/vendor/autoload.php';

setCorsHeaders();

$auth   = getAuthUser();
$method = $_SERVER['REQUEST_METHOD'];
$db     = getDb();

// ── GET: listar citas ──────────────────────────────────────────────────────
if ($method === 'GET') {
    // Citas de panel vencidas: se eliminan automáticamente al pasar su fecha
    // (scheduled_at se guarda en UTC y el contenedor corre en UTC)
    $db->exec("DELETE FROM appointments WHERE call_type = 'panel' AND scheduled_at IS NOT NULL AND scheduled_at < NOW()");

    // Auto-asociar citas que llegaron por webhook antes de que el usuario tuviera cuenta
    $db->prepare('
        UPDATE appointments SET user_id = ? WHERE user_id IS NULL AND attendee_email = ?
    ')->execute([(int)$auth['sub'], $auth['email']]);
    syncClaimedProjectsForUser($db, (int) $auth['sub']);
    backfillMissingDiagnosticProjects($db);

    if ($auth['role'] === 'administrador') {
        $stmt = $db->query("
            SELECT a.*, COALESCE(u.name, a.attendee_email) AS user_name,
                   COALESCE(u.email, a.attendee_email) AS user_email
            FROM appointments a
            LEFT JOIN users u ON u.id = a.user_id
            WHERE a.status <> 'cancelled'
            ORDER BY a.created_at DESC
        ");
    } else {
        $stmt = $db->prepare("
            SELECT a.*, COALESCE(u.name, a.attendee_email) AS user_name,
                   COALESCE(u.email, a.attendee_email) AS user_email
            FROM appointments a
            LEFT JOIN users u ON u.id = a.user_id
            WHERE a.user_id = ? AND a.status <> 'cancelled'
            ORDER BY a.created_at DESC
        ");
        $stmt->execute([(int)$auth['sub']]);
    }

    $appointments = $stmt->fetchAll();
    // scheduled_at se guarda en UTC (date.timezone del backend) pero MySQL lo
    // devuelve como "Y-m-d H:i:s" sin indicar zona — new Date() en el navegador
    // interpreta ese formato como hora LOCAL del visitante, no UTC, corriendo
    // la hora mostrada por el offset de su zona (p. ej. +6h en CDMX). Marcarlo
    // explícitamente como UTC aquí para que el frontend lo parsee bien.
    foreach ($appointments as &$apt) {
        if ($apt['scheduled_at']) {
            $apt['scheduled_at'] = str_replace(' ', 'T', $apt['scheduled_at']) . 'Z';
        }
    }
    unset($apt);

    jsonSuccess(['appointments' => $appointments]);
}

// ── POST: registrar cita agendada desde el panel (confirmada por WhatsApp) ──
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $service = trim($body['service'] ?? '');
    $reason  = trim($body['reason'] ?? '');
    $tipo    = ($body['tipo'] ?? '') === 'existente' ? 'existente' : 'nuevo';
    $when    = trim($body['scheduled_at'] ?? '');

    if ($service === '') jsonError('El proyecto o producto es requerido');
    if ($reason === '')  jsonError('El motivo es requerido');

    try { $dt = new DateTime($when); } catch (Exception $e) { jsonError('Fecha inválida'); }
    $dt->setTimezone(new DateTimeZone('UTC'));
    if ($dt <= new DateTime('now', new DateTimeZone('UTC'))) jsonError('La fecha de la cita debe ser futura');

    $db->prepare("
        INSERT INTO appointments (user_id, attendee_email, service, service_code, call_type, scheduled_at, status, project_details)
        VALUES (?, ?, ?, ?, 'panel', ?, 'pending', ?)
    ")->execute([(int)$auth['sub'], $auth['email'], $service, $tipo, $dt->format('Y-m-d H:i:s'), $reason]);

    jsonSuccess(['created' => true, 'id' => (int)$db->lastInsertId()]);
}

// ── PATCH: actualizar cita ─────────────────────────────────────────────────
if ($method === 'PATCH') {
    $id     = (int) ($_GET['id'] ?? 0);
    $action = $_GET['action'] ?? '';
    if (!$id) jsonError('ID requerido');

    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    // ── Admin cambia el horario de una cita de panel ───────────────────────
    if ($action === 'reschedule') {
        if ($auth['role'] !== 'administrador') jsonError('Acceso denegado', 403);

        $when = trim($body['scheduled_at'] ?? '');
        if (!$when) jsonError('scheduled_at requerido');
        try { $dt = new DateTime($when); } catch (Exception $e) { jsonError('Fecha inválida'); }
        $dt->setTimezone(new DateTimeZone('UTC'));

        $stmt = $db->prepare("
            SELECT a.*, COALESCE(u.name, a.attendee_email) AS user_name,
                   COALESCE(u.email, a.attendee_email) AS user_email
            FROM appointments a
            LEFT JOIN users u ON u.id = a.user_id
            WHERE a.id = ? AND a.call_type = 'panel'
        ");
        $stmt->execute([$id]);
        $appointment = $stmt->fetch();
        if (!$appointment) jsonError('Cita no encontrada', 404);

        $db->prepare("UPDATE appointments SET scheduled_at = ?, status = 'rescheduled' WHERE id = ?")
           ->execute([$dt->format('Y-m-d H:i:s'), $id]);

        notifyClientRescheduled($appointment, $dt);
        jsonSuccess(['updated' => true]);
    }

    // ── Admin libera el formulario de proyecto ─────────────────────────────
    if ($action === 'release_form') {
        if ($auth['role'] !== 'administrador') jsonError('Acceso denegado', 403);

        $stmt = $db->prepare('
            SELECT a.*, COALESCE(u.name, a.attendee_email) AS user_name,
                   COALESCE(u.email, a.attendee_email) AS user_email
            FROM appointments a
            LEFT JOIN users u ON u.id = a.user_id
            WHERE a.id = ? AND a.call_type = \'intro\'
        ');
        $stmt->execute([$id]);
        $appointment = $stmt->fetch();
        if (!$appointment) jsonError('Cita no encontrada', 404);
        if ($appointment['form_released']) jsonError('El formulario ya fue liberado');
        if (!$appointment['user_email']) jsonError('La cita no tiene un correo asociado', 400);

        $db->prepare('UPDATE appointments SET form_released = 1 WHERE id = ?')->execute([$id]);

        notifyClientFormReleased($appointment);
        jsonSuccess(['updated' => true]);
    }

    // ── Cliente agrega detalles del proyecto (una vez liberado el formulario) ──
    if ($action === 'details') {
        $details = trim($body['project_details'] ?? '');
        if ($details === '') jsonError('project_details no puede estar vacío');

        $stmt = $db->prepare("SELECT user_id, form_released FROM appointments WHERE id = ? AND call_type = 'intro'");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) jsonError('Cita no encontrada', 404);
        if ((int)$row['user_id'] !== (int)$auth['sub']) jsonError('Acceso denegado', 403);
        if (!$row['form_released']) jsonError('El formulario aún no está disponible', 403);

        $db->prepare("UPDATE appointments SET project_details = ?, status = 'form_submitted' WHERE id = ?")
           ->execute([$details, $id]);

        notifyTeamProjectDetails($id, $details, $auth);
        jsonSuccess(['updated' => true]);
    }

    // ── Admin habilita pago ────────────────────────────────────────────────
    if ($action === 'enable_payment') {
        if ($auth['role'] !== 'administrador') jsonError('Acceso denegado', 403);

        $amount = $body['amount'] ?? null;
        if (!$amount || !is_numeric($amount) || $amount <= 0) jsonError('Monto inválido');

        $stmt = $db->prepare("
            SELECT a.*, u.name AS user_name, u.email AS user_email
            FROM appointments a
            JOIN users u ON u.id = a.user_id
            WHERE a.id = ? AND a.call_type = 'intro'
        ");
        $stmt->execute([$id]);
        $appointment = $stmt->fetch();
        if (!$appointment) jsonError('Cita no encontrada', 404);

        $db->prepare('UPDATE appointments SET payment_enabled = 1, amount = ? WHERE id = ?')
           ->execute([(float)$amount, $id]);

        notifyClientPaymentReady($appointment, (float)$amount);
        jsonSuccess(['updated' => true]);
    }

    // ── Admin cancela una cita ──────────────────────────────────────────────
    if ($action === 'cancel') {
        if ($auth['role'] !== 'administrador') jsonError('Acceso denegado', 403);

        $stmt = $db->prepare('
            SELECT a.*, COALESCE(u.name, a.attendee_email) AS user_name,
                   COALESCE(u.email, a.attendee_email) AS user_email
            FROM appointments a
            LEFT JOIN users u ON u.id = a.user_id
            WHERE a.id = ?
        ');
        $stmt->execute([$id]);
        $appointment = $stmt->fetch();
        if (!$appointment) jsonError('Cita no encontrada', 404);
        if (in_array($appointment['status'], ['cancelled', 'completado'], true)) {
            jsonError('La cita ya está cancelada o completada');
        }

        $db->prepare("UPDATE appointments SET status = 'cancelled' WHERE id = ?")->execute([$id]);

        notifyClientCancelled($appointment);
        jsonSuccess(['updated' => true]);
    }

    // ── Admin marca proyecto como completado ───────────────────────────────
    if ($action === 'complete') {
        if ($auth['role'] !== 'administrador') jsonError('Acceso denegado', 403);

        $stmt = $db->prepare("
            SELECT a.*, u.name AS user_name, u.email AS user_email
            FROM appointments a
            JOIN users u ON u.id = a.user_id
            WHERE a.id = ? AND a.call_type = 'intro'
        ");
        $stmt->execute([$id]);
        $appointment = $stmt->fetch();
        if (!$appointment) jsonError('Cita no encontrada', 404);
        if ($appointment['status'] === 'completado') jsonError('El proyecto ya está marcado como completado');

        $db->prepare("UPDATE appointments SET status = 'completado' WHERE id = ?")
           ->execute([$id]);

        notifyClientProjectComplete($appointment);
        jsonSuccess(['updated' => true]);
    }

    // ── Cliente envía encuesta de satisfacción ─────────────────────────────
    if ($action === 'feedback') {
        $feedback = trim($body['feedback'] ?? '');
        if ($feedback === '') jsonError('feedback no puede estar vacío');

        $stmt = $db->prepare("SELECT user_id, status FROM appointments WHERE id = ? AND call_type = 'intro'");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) jsonError('Cita no encontrada', 404);
        if ((int)$row['user_id'] !== (int)$auth['sub']) jsonError('Acceso denegado', 403);
        if ($row['status'] !== 'completado') jsonError('El proyecto aún no está completado', 400);

        $db->prepare('UPDATE appointments SET feedback = ? WHERE id = ?')
           ->execute([$feedback, $id]);

        notifyTeamFeedback($id, json_decode($feedback, true) ?: [], $auth);
        jsonSuccess(['updated' => true]);
    }

    jsonError('Acción no reconocida');
}

jsonError('Método no permitido', 405);

// ── Helpers de notificación ────────────────────────────────────────────────

function notifyClientRescheduled(array $appointment, DateTime $utc): void {
    if (empty($appointment['user_email'])) return;

    $mx = clone $utc;
    $mx->setTimezone(new DateTimeZone('America/Mexico_City'));
    $fecha = $mx->format('d/m/Y') . ' a las ' . $mx->format('g:i A') . ' (hora del centro de México)';

    $body = '
        <p style="margin: 0 0 14px;">Hola ' . htmlspecialchars($appointment['user_name']) . ',</p>
        <p style="margin: 0 0 14px;">Tu cita sobre <strong style="color:#ffffff;">'
            . htmlspecialchars($appointment['service'] ?? 'tu proyecto') . '</strong> cambió de horario.</p>
        <p style="margin: 0 0 4px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; color: #ffffff;">'
            . htmlspecialchars($fecha) . '</p>
    ';

    $html = renderEmailLayout(
        'Tu cita fue reprogramada',
        $body,
        ['label' => 'Ver mis citas', 'url' => ALLOWED_ORIGIN . '/citas'],
        DEFAULT_EMAIL_ACCENT
    );

    sendMail($appointment['user_email'], 'Tu cita fue reprogramada — Kodeo', $html);
}

function notifyClientCancelled(array $appointment): void {
    if (empty($appointment['user_email'])) return;

    $body = '
        <p style="margin: 0 0 14px;">Hola ' . htmlspecialchars($appointment['user_name']) . ',</p>
        <p style="margin: 0 0 14px;">Tu cita sobre <strong style="color:#ffffff;">'
            . htmlspecialchars($appointment['service'] ?? 'tu proyecto') . '</strong> ha sido cancelada.</p>
        <p style="margin: 0; color: #aaa; font-size: 13px;">Si tienes dudas o quieres agendar de nuevo, contáctanos.</p>
    ';

    $html = renderEmailLayout(
        'Tu cita fue cancelada',
        $body,
        ['label' => 'Ver mis citas', 'url' => ALLOWED_ORIGIN . '/citas'],
        DEFAULT_EMAIL_ACCENT
    );

    sendMail($appointment['user_email'], 'Tu cita fue cancelada — Kodeo', $html);
}

function notifyTeamProjectDetails(int $appointmentId, string $details, array $auth): void {
    $teamEmail = SMTP_FROM_EMAIL;
    if (!$teamEmail) return;

    $body = '
        <p style="margin: 0 0 14px;">Un cliente ha agregado detalles a su proyecto.</p>
        <p style="margin: 0 0 6px;"><strong style="color:#ffffff;">Cliente:</strong> '
            . htmlspecialchars($auth['name'] ?? '') . ' (' . htmlspecialchars($auth['email'] ?? '') . ')</p>
        <p style="margin: 0 0 6px;"><strong style="color:#ffffff;">Cita #:</strong> ' . $appointmentId . '</p>
        <p style="margin: 0 0 14px;"><strong style="color:#ffffff;">Detalles:</strong></p>
        <p style="margin: 0; white-space: pre-wrap;">' . htmlspecialchars($details) . '</p>
    ';

    $html = renderEmailLayout(
        'Nuevo detalle de proyecto',
        $body,
        ['label' => 'Ver citas', 'url' => ALLOWED_ORIGIN . '/citas'],
        DEFAULT_EMAIL_ACCENT
    );

    sendMail($teamEmail, 'Nuevo detalle de proyecto — Kodeo', $html);
}

function notifyClientFormReleased(array $appointment): void {
    $accent = SERVICE_ACCENTS[$appointment['service']] ?? DEFAULT_EMAIL_ACCENT;

    $body = '
        <p style="margin: 0 0 14px;">Hola ' . htmlspecialchars($appointment['user_name']) . ',</p>
        <p style="margin: 0 0 14px;">Gracias por platicar con nosotros sobre tu proyecto de
            <strong style="color:#ffffff;">' . htmlspecialchars($appointment['service'] ?? 'tu proyecto') . '</strong>.
            El siguiente paso es contarnos los detalles a través de un breve formulario.</p>
        <p style="margin: 0; color: #aaa; font-size: 13px;">Si aún no tienes cuenta, podrás crear una fácilmente al entrar.</p>
    ';

    $html = renderEmailLayout(
        'Cuéntanos sobre tu proyecto',
        $body,
        ['label' => 'Ir al formulario', 'url' => ALLOWED_ORIGIN . '/citas'],
        $accent
    );

    sendMail($appointment['user_email'], 'Cuéntanos sobre tu proyecto — Kodeo', $html);
}

function notifyClientPaymentReady(array $appointment, float $amount): void {
    $amountFormatted = '$' . number_format($amount, 0, '.', ',') . ' MXN';
    $accent = SERVICE_ACCENTS[$appointment['service']] ?? DEFAULT_EMAIL_ACCENT;

    $body = '
        <p style="margin: 0 0 14px;">Hola ' . htmlspecialchars($appointment['user_name']) . ',</p>
        <p style="margin: 0 0 14px;">Tu consulta para <strong style="color:#ffffff;">'
            . htmlspecialchars($appointment['service']) . '</strong> ya tiene un precio definido y está lista para pagar.</p>
        <p style="margin: 0 0 4px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: bold;
            letter-spacing: 1.5px; text-transform: uppercase; color: ' . htmlspecialchars($accent) . ';">'
            . $amountFormatted . '</p>
    ';

    $html = renderEmailLayout(
        'Tu pago está listo',
        $body,
        ['label' => 'Ir a pagar', 'url' => ALLOWED_ORIGIN . '/citas'],
        $accent
    );

    sendMail($appointment['user_email'], 'Tu pago está listo — Kodeo', $html);
}

function notifyClientProjectComplete(array $appointment): void {
    $accent = SERVICE_ACCENTS[$appointment['service']] ?? DEFAULT_EMAIL_ACCENT;

    $body = '
        <p style="margin: 0 0 14px;">Hola ' . htmlspecialchars($appointment['user_name']) . ',</p>
        <p style="margin: 0 0 14px;">¡Tu proyecto de <strong style="color:#ffffff;">'
            . htmlspecialchars($appointment['service']) . '</strong> ha sido completado!</p>
        <p style="margin: 0 0 14px;">Nos encantaría saber tu opinión sobre el proceso y el resultado.
            Entra a tus citas y completa la breve encuesta — solo toma un momento.</p>
        <p style="margin: 0; color: #aaa; font-size: 13px;">Tu retroalimentación nos ayuda a seguir mejorando.</p>
    ';

    $html = renderEmailLayout(
        '¡Tu proyecto está listo!',
        $body,
        ['label' => 'Dejar mi opinión', 'url' => ALLOWED_ORIGIN . '/citas'],
        $accent
    );

    sendMail($appointment['user_email'], '¡Tu proyecto está listo! — Kodeo', $html);
}

function notifyTeamFeedback(int $appointmentId, array $data, array $auth): void {
    $teamEmail = SMTP_FROM_EMAIL;
    if (!$teamEmail) return;

    $recommend_labels = ['yes' => 'Sí, sin duda', 'maybe' => 'Tal vez', 'no' => 'No por ahora'];

    $rows = '';
    if (isset($data['satisfaction']))  $rows .= '<p style="margin:0 0 8px;"><strong style="color:#fff;">Satisfacción:</strong> ' . (int)$data['satisfaction'] . ' / 5</p>';
    if (isset($data['communication'])) $rows .= '<p style="margin:0 0 8px;"><strong style="color:#fff;">Comunicación:</strong> ' . (int)$data['communication'] . ' / 5</p>';
    if (!empty($data['recommend']))    $rows .= '<p style="margin:0 0 8px;"><strong style="color:#fff;">¿Nos recomendaría?:</strong> ' . htmlspecialchars($recommend_labels[$data['recommend']] ?? $data['recommend']) . '</p>';
    if (!empty($data['highlight']))    $rows .= '<p style="margin:0 0 8px;"><strong style="color:#fff;">Lo mejor:</strong> ' . htmlspecialchars($data['highlight']) . '</p>';
    if (!empty($data['improve']))      $rows .= '<p style="margin:0 0 8px;"><strong style="color:#fff;">A mejorar:</strong> ' . htmlspecialchars($data['improve']) . '</p>';

    $body = '
        <p style="margin: 0 0 14px;">Un cliente ha enviado su encuesta de satisfacción.</p>
        <p style="margin: 0 0 6px;"><strong style="color:#ffffff;">Cliente:</strong> '
            . htmlspecialchars($auth['name'] ?? '') . ' (' . htmlspecialchars($auth['email'] ?? '') . ')</p>
        <p style="margin: 0 0 20px;"><strong style="color:#ffffff;">Cita #:</strong> ' . $appointmentId . '</p>
        <div style="border-left: 3px solid #63C44D; padding-left: 16px;">' . $rows . '</div>
    ';

    $html = renderEmailLayout(
        'Nueva encuesta de satisfacción',
        $body,
        ['label' => 'Ver citas', 'url' => ALLOWED_ORIGIN . '/citas'],
        '#63C44D'
    );

    sendMail($teamEmail, 'Nueva encuesta de cliente — Kodeo', $html);
}
