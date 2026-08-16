<?php

require_once __DIR__ . '/db.php';

function inferProjectName(?string $service, ?string $serviceCode): string {
    $service = trim((string) $service);
    if ($service !== '') return $service;

    return match ((string) $serviceCode) {
        '01' => 'Landing Page',
        '02' => 'Sitio Web',
        '03' => 'Tienda Online',
        '04' => 'Tarjeta de Fidelidad',
        default => 'Proyecto en diagnóstico',
    };
}

function ensureDiagnosticProjectForIntroAppointment(
    PDO $db,
    int $appointmentId,
    ?int $userId,
    ?string $service,
    ?string $serviceCode
): void {
    if ($appointmentId <= 0) return;

    $name = inferProjectName($service, $serviceCode);

    $db->prepare("
        INSERT INTO projects (appointment_id, user_id, name, status, notes)
        VALUES (?, ?, ?, 'diagnostico', 'Generado automáticamente al agendar la cita inicial.')
        ON DUPLICATE KEY UPDATE
            user_id = COALESCE(projects.user_id, VALUES(user_id)),
            name    = CASE
                        WHEN projects.name IS NULL OR projects.name = '' THEN VALUES(name)
                        ELSE projects.name
                      END
    ")->execute([$appointmentId, $userId, $name]);
}

// Repara citas de consulta inicial que no generaron su proyecto de
// diagnóstico (p. ej. por una falla de base de datos al momento del
// booking) — vuelve a intentarlo cada vez que el panel se consulta.
function backfillMissingDiagnosticProjects(PDO $db): void {
    $stmt = $db->query("
        SELECT a.id, a.user_id, a.service, a.service_code
        FROM appointments a
        LEFT JOIN projects p ON p.appointment_id = a.id
        WHERE a.call_type = 'intro' AND p.id IS NULL
    ");
    foreach ($stmt->fetchAll() as $appointment) {
        ensureDiagnosticProjectForIntroAppointment(
            $db,
            (int) $appointment['id'],
            isset($appointment['user_id']) ? (int) $appointment['user_id'] : null,
            $appointment['service'] ?? null,
            $appointment['service_code'] ?? null
        );
    }
}

const PROJECT_STATUS_LABELS = [
    'diagnostico'   => 'En diagnóstico',
    'en_diseno'     => 'En diseño',
    'en_desarrollo' => 'En desarrollo',
    'completado'    => 'Completado',
    'cancelado'     => 'Cancelado',
];

/** Registra un evento en la bitácora del proyecto (tabla project_activity). */
function logProjectActivity(PDO $db, int $projectId, string $event, ?string $detail = null): void {
    $db->prepare('INSERT INTO project_activity (project_id, event, detail) VALUES (?, ?, ?)')
       ->execute([$projectId, $event, $detail]);
}

function syncClaimedProjectsForUser(PDO $db, int $userId): void {
    if ($userId <= 0) return;

    $db->prepare("
        UPDATE projects p
        JOIN appointments a ON a.id = p.appointment_id
        SET p.user_id = ?
        WHERE p.user_id IS NULL
          AND a.call_type = 'intro'
          AND a.user_id = ?
    ")->execute([$userId, $userId]);
}
