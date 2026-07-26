<?php
/**
 * Reseñas de proyectos completados — endpoint público, sin sesión
 * (el link ya es el secreto, igual que reset-password.php).
 *   GET  /reviews.php?token={t}  — detalle para la pantalla de calificación
 *   POST /reviews.php            — {token, rating, feedback} guarda la reseña
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/review-helpers.php';

setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDb();

function fetchReviewByToken(PDO $db, string $token): ?array {
    $stmt = $db->prepare('
        SELECT r.*, p.name AS project_name, p.user_id AS project_user_id,
               u.name AS user_name, u.email AS user_email
        FROM project_reviews r
        JOIN projects p ON p.id = r.project_id
        LEFT JOIN users u ON u.id = p.user_id
        WHERE r.public_token = ?
    ');
    $stmt->execute([$token]);
    return $stmt->fetch() ?: null;
}

// ── GET ?token= : detalle para la pantalla de calificación ─────
if ($method === 'GET') {
    $token = trim($_GET['token'] ?? '');
    if (!preg_match('/^[a-f0-9]{32}$/', $token)) jsonError('Enlace inválido', 404);

    $review = fetchReviewByToken($db, $token);
    if (!$review) jsonError('Este enlace no existe o ya no es válido.', 404);

    jsonSuccess([
        'project_name'      => $review['project_name'],
        'already_submitted' => $review['submitted_at'] !== null,
        'rating'            => $review['submitted_at'] !== null ? (int) $review['rating'] : null,
        'feedback'          => $review['submitted_at'] !== null ? $review['feedback'] : null,
    ]);
}

// ── POST: enviar calificación ───────────────────────────────────
if ($method === 'POST') {
    $body  = json_decode(file_get_contents('php://input'), true) ?? [];
    $token = trim($body['token'] ?? '');

    if (!preg_match('/^[a-f0-9]{32}$/', $token)) jsonError('Enlace inválido', 404);

    $review = fetchReviewByToken($db, $token);
    if (!$review) jsonError('Este enlace no existe o ya no es válido.', 404);

    // Idempotente: si ya se respondió, no sobrescribimos y devolvemos éxito.
    if ($review['submitted_at'] !== null) {
        jsonSuccess(['message' => 'Ya habíamos recibido tu opinión, ¡gracias!']);
    }

    $rating = filter_var($body['rating'] ?? null, FILTER_VALIDATE_INT);
    if ($rating === false || $rating === null || $rating < 0 || $rating > 5) {
        jsonError('La calificación debe ser un número entre 0 y 5.');
    }

    $feedback = trim((string) ($body['feedback'] ?? ''));
    if (mb_strlen($feedback) > 1000) jsonError('El comentario no puede superar los 1000 caracteres.');

    $db->prepare('
        UPDATE project_reviews
        SET rating = ?, feedback = ?, submitted_at = NOW()
        WHERE id = ? AND submitted_at IS NULL
    ')->execute([$rating, $feedback ?: null, $review['id']]);

    $review['rating']   = $rating;
    $review['feedback'] = $feedback ?: null;
    notifyReviewSubmitted($review, [
        'id'         => $review['project_id'],
        'name'       => $review['project_name'],
        'user_name'  => $review['user_name'],
        'user_email' => $review['user_email'],
    ]);

    jsonSuccess(['message' => '¡Gracias por tu opinión!']);
}

jsonError('Método no permitido', 405);
