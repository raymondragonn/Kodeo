<?php
/**
 * Reseñas de proyectos completados (tabla project_reviews).
 * El admin genera el link a demanda desde projects.php (solo disponible
 * cuando el proyecto está 'completado') y lo comparte manualmente con el
 * cliente; la respuesta se recibe sin sesión desde reviews.php.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

const REVIEW_ACCENT = '#63C44D';

/**
 * Crea (o recupera, si ya existía) la reseña de un proyecto recién completado.
 * Idempotente vía ON DUPLICATE KEY: un proyecto solo tiene una reseña.
 */
function createProjectReview(PDO $db, int $projectId): array {
    $token = bin2hex(random_bytes(16));

    $db->prepare('
        INSERT INTO project_reviews (project_id, public_token)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE id = id
    ')->execute([$projectId, $token]);

    $stmt = $db->prepare('SELECT * FROM project_reviews WHERE project_id = ?');
    $stmt->execute([$projectId]);
    return $stmt->fetch();
}

/**
 * Avisa al admin que llegó una calificación nueva.
 */
function notifyReviewSubmitted(array $review, array $project): void {
    if (!ADMIN_NOTIFY_EMAIL) return;

    try {
        $stars = str_repeat('★', (int) $review['rating']) . str_repeat('☆', 5 - (int) $review['rating']);

        $body = '
            <p style="margin: 0 0 14px;"><strong style="color: #ffffff;">Nueva reseña recibida</strong></p>
            <p style="margin: 0 0 8px;">Proyecto: <strong style="color: #ffffff;">' . htmlspecialchars($project['name']) . '</strong></p>
            <p style="margin: 0 0 8px;">Cliente: ' . htmlspecialchars($project['user_name'] ?? 'Sin asignar') . ' (' . htmlspecialchars($project['user_email'] ?? '—') . ')</p>
            <p style="margin: 0 0 8px;">Calificación: <strong style="color: #ffffff;">' . $stars . ' (' . (int) $review['rating'] . '/5)</strong></p>' .
            (!empty($review['feedback']) ? '<p style="margin: 0 0 8px;">Comentario: ' . nl2br(htmlspecialchars($review['feedback'])) . '</p>' : '');

        sendMail(
            ADMIN_NOTIFY_EMAIL,
            '⭐ Nueva reseña — ' . $project['name'],
            renderEmailLayout('Nueva reseña', $body, null, REVIEW_ACCENT)
        );
    } catch (\Throwable $e) {
        error_log('[REVIEW] Error notificando reseña recibida, proyecto #' . $project['id'] . ': ' . $e->getMessage());
    }
}
