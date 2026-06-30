<?php
/**
 * Recordatorios 24h antes de cada cita.
 * Ejecutar via cron cada hora:
 *   0 * * * * php /var/www/html/reminder.php >> /var/log/kodeo-reminder.log 2>&1
 *
 * Lógica: busca citas confirmadas cuya scheduled_at esté entre 23 y 25 horas
 * desde ahora para cubrir la ventana de una hora del cron sin duplicar envíos.
 * La columna reminder_sent_at evita el reenvío si el cron corre más de una vez
 * dentro de esa ventana.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/vendor/autoload.php';

$db = getDb();

$stmt = $db->query("
    SELECT a.*, u.name AS user_name, u.email AS user_email, a.video_url
    FROM appointments a
    LEFT JOIN users u ON u.id = a.user_id
    WHERE a.status IN ('confirmed', 'rescheduled')
      AND a.scheduled_at BETWEEN
            DATE_ADD(NOW(), INTERVAL 23 HOUR) AND
            DATE_ADD(NOW(), INTERVAL 25 HOUR)
      AND a.reminder_sent_at IS NULL
      AND (a.attendee_email IS NOT NULL OR u.email IS NOT NULL)
");

$rows = $stmt->fetchAll();

foreach ($rows as $apt) {
    $email = $apt['user_email'] ?: $apt['attendee_email'];
    $name  = $apt['user_name']  ?: 'Cliente';

    if (sendReminderEmail($email, $name, $apt)) {
        $db->prepare('UPDATE appointments SET reminder_sent_at = NOW() WHERE id = ?')
           ->execute([$apt['id']]);
        echo '[' . date('Y-m-d H:i:s') . '] Recordatorio enviado a ' . $email . ' (cita #' . $apt['id'] . ")\n";
    }
}

if (empty($rows)) {
    echo '[' . date('Y-m-d H:i:s') . "] Sin citas próximas — nada que enviar.\n";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sendReminderEmail(string $email, string $name, array $apt): bool {
    $service     = $apt['service'] ?? null;
    $accent      = SERVICE_ACCENTS[$service] ?? DEFAULT_EMAIL_ACCENT;
    $scheduledAt = $apt['scheduled_at'];

    $days   = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    $months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
               'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    $tz   = new \DateTimeZone('America/Mexico_City');
    $dt   = new \DateTime($scheduledAt, new \DateTimeZone('UTC'));
    $dt->setTimezone($tz);

    $dayName   = $days[(int) $dt->format('w')];
    $day       = (int) $dt->format('j');
    $monthName = $months[(int) $dt->format('n') - 1];
    $year      = $dt->format('Y');
    $hour      = $dt->format('g:i') . ($dt->format('A') === 'AM' ? ' am' : ' pm');
    $dateLabel = $dayName . ', ' . $day . ' de ' . $monthName . ' de ' . $year . ' · ' . $hour . ' (Ciudad de México)';

    $serviceRow = $service
        ? '<p style="margin:0 0 8px;"><strong style="color:#ffffff;">Servicio:</strong> ' . htmlspecialchars($service) . '</p>'
        : '';

    $body = '
        <p style="margin:0 0 24px;">Hola ' . htmlspecialchars($name) . ', mañana tienes una reunión con el equipo de Kodeo.</p>
        <div style="border-left:3px solid ' . htmlspecialchars($accent) . '; padding-left:16px;">
            ' . $serviceRow . '
            <p style="margin:0 0 8px;"><strong style="color:#ffffff;">Cuándo:</strong> ' . htmlspecialchars($dateLabel) . '</p>
        </div>
        <p style="margin:20px 0 0; color:#9b9b9b;">Para reagendar o cancelar, escríbenos por WhatsApp.</p>
    ';

    $waUrl = 'https://wa.me/' . KODEO_WHATSAPP . '?text=' . rawurlencode('Hola, quisiera hablar sobre mi reunión con ustedes.');

    $html = renderEmailLayout(
        'Tu reunión es mañana',
        $body,
        ['label' => 'Escribir por WhatsApp', 'url' => $waUrl],
        $accent
    );

    return sendMail($email, 'Recordatorio: tu reunión con Kodeo es mañana', $html);
}


