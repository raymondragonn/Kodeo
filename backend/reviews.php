<?php
/**
 * Reseñas de proyectos completados — endpoint público, sin sesión
 * (el link ya es el secreto, igual que reset-password.php).
 *   GET  /reviews.php?token={t}       — detalle para la pantalla de calificación
 *   GET  /reviews.php?action=public   — reseñas publicables + promedio (para el sitio)
 *   POST /reviews.php                 — {token, rating, feedback} guarda la reseña
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/review-helpers.php';
require_once __DIR__ . '/project-helpers.php';

setCorsHeaders();

$method = $_SERVER['REQUEST_METHOD'];
$db     = getDb();

function fetchReviewByToken(PDO $db, string $token): ?array {
    $stmt = $db->prepare('
        SELECT r.*, p.name AS project_name, p.user_id AS project_user_id,
               COALESCE(u.name, p.client_name) AS user_name,
               COALESCE(u.email, p.client_email) AS user_email
        FROM project_reviews r
        JOIN projects p ON p.id = r.project_id
        LEFT JOIN users u ON u.id = p.user_id
        WHERE r.public_token = ?
    ');
    $stmt->execute([$token]);
    return $stmt->fetch() ?: null;
}

// ── GET ?action=public : reseñas que el cliente autorizó publicar ──────
// Lo consume el sitio en tiempo de compilación para emitir los datos
// estructurados de valoraciones (Review / AggregateRating). Solo devuelve
// reseñas ya enviadas y con consentimiento explícito; nunca `mejoras`, que es
// crítica interna.
if ($method === 'GET' && ($_GET['action'] ?? '') === 'public') {
    $stmt = $db->query('
        SELECT r.rating, r.feedback, r.submitted_at,
               r.rating_comunicacion, r.rating_diseno, r.rating_velocidad,
               r.autor_nombre, r.autor_rol,
               p.name AS project_name
        FROM project_reviews r
        JOIN projects p ON p.id = r.project_id
        WHERE r.submitted_at IS NOT NULL
          AND r.puede_publicar = 1
          AND r.rating > 0
        ORDER BY r.submitted_at DESC
        LIMIT 50
    ');
    $reviews = $stmt->fetchAll();

    $agg = $db->query('
        SELECT COUNT(*) AS total, ROUND(AVG(rating), 2) AS promedio
        FROM project_reviews
        WHERE submitted_at IS NOT NULL AND puede_publicar = 1 AND rating > 0
    ')->fetch();

    jsonSuccess([
        'reviews'  => array_map(static fn($r) => [
            'rating'       => (int) $r['rating'],
            'feedback'     => $r['feedback'],
            'submitted_at' => $r['submitted_at'],
            'project_name' => $r['project_name'],
            'autor_nombre' => $r['autor_nombre'],
            'autor_rol'    => $r['autor_rol'],
        ], $reviews),
        'total'    => (int) ($agg['total'] ?? 0),
        'promedio' => $agg['promedio'] !== null ? (float) $agg['promedio'] : null,
    ]);
}

// ── GET ?token= : detalle para la pantalla de calificación ─────
if ($method === 'GET') {
    $token = trim($_GET['token'] ?? '');
    if (!preg_match('/^[a-f0-9]{32}$/', $token)) jsonError('Enlace inválido', 404);

    $review = fetchReviewByToken($db, $token);
    if (!$review) jsonError('Este enlace no existe o ya no es válido.', 404);

    jsonSuccess([
        'project_name'      => $review['project_name'],
        // Cuenta ligada o contacto que capturó el admin (COALESCE en la query).
        'client_name'       => $review['user_name'],
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
    if ($rating === false || $rating === null || $rating < 1 || $rating > 5) {
        jsonError('La calificación general debe ser un número entre 1 y 5.');
    }

    $ratingComunicacion = filter_var($body['rating_comunicacion'] ?? null, FILTER_VALIDATE_INT);
    if ($ratingComunicacion === false || $ratingComunicacion === null || $ratingComunicacion < 1 || $ratingComunicacion > 5) {
        jsonError('La calificación de comunicación debe ser un número entre 1 y 5.');
    }

    $ratingDiseno = filter_var($body['rating_diseno'] ?? null, FILTER_VALIDATE_INT);
    if ($ratingDiseno === false || $ratingDiseno === null || $ratingDiseno < 1 || $ratingDiseno > 5) {
        jsonError('La calificación de diseño debe ser un número entre 1 y 5.');
    }

    $ratingVelocidad = filter_var($body['rating_velocidad'] ?? null, FILTER_VALIDATE_INT);
    if ($ratingVelocidad === false || $ratingVelocidad === null || $ratingVelocidad < 1 || $ratingVelocidad > 5) {
        jsonError('La calificación de velocidad de entrega debe ser un número entre 1 y 5.');
    }

    $expectativasValidas = ['supero', 'cumplio', 'parcial', 'no_cumplio'];
    $expectativas = trim((string) ($body['expectativas'] ?? ''));
    if (!in_array($expectativas, $expectativasValidas, true)) {
        jsonError('Selecciona si el producto web cumplió tus expectativas.');
    }

    $puedePublicar = filter_var($body['puede_publicar'] ?? null, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    if ($puedePublicar === null) jsonError('Indica si podemos publicar tu reseña.');

    $feedback = trim((string) ($body['feedback'] ?? ''));
    if ($feedback === '') jsonError('Cuéntanos tu experiencia.');
    if (mb_strlen($feedback) > 1000) jsonError('El comentario no puede superar los 1000 caracteres.');

    $mejoras = trim((string) ($body['mejoras'] ?? ''));
    if (mb_strlen($mejoras) > 1000) jsonError('El comentario de mejoras no puede superar los 1000 caracteres.');

    // Con qué nombre aparecer si autoriza publicar. Solo se piden —y solo se
    // guardan— cuando ha dado el consentimiento.
    $autorNombre = $puedePublicar ? trim((string) ($body['autor_nombre'] ?? '')) : '';
    $autorRol    = $puedePublicar ? trim((string) ($body['autor_rol'] ?? '')) : '';
    if (mb_strlen($autorNombre) > 120 || mb_strlen($autorRol) > 120) {
        jsonError('El nombre y el rol no pueden superar los 120 caracteres.');
    }

    $db->prepare('
        UPDATE project_reviews
        SET rating = ?, rating_comunicacion = ?, rating_diseno = ?, rating_velocidad = ?,
            expectativas = ?, feedback = ?, mejoras = ?, puede_publicar = ?,
            autor_nombre = ?, autor_rol = ?, submitted_at = NOW()
        WHERE id = ? AND submitted_at IS NULL
    ')->execute([
        $rating, $ratingComunicacion, $ratingDiseno, $ratingVelocidad,
        $expectativas, $feedback ?: null, $mejoras ?: null, $puedePublicar ? 1 : 0,
        $autorNombre ?: null, $autorRol ?: null,
        $review['id'],
    ]);

    $review['rating']              = $rating;
    $review['rating_comunicacion'] = $ratingComunicacion;
    $review['rating_diseno']       = $ratingDiseno;
    $review['rating_velocidad']    = $ratingVelocidad;
    $review['expectativas']        = $expectativas;
    $review['feedback']            = $feedback ?: null;
    $review['mejoras']             = $mejoras ?: null;
    $review['puede_publicar']      = $puedePublicar;
    logProjectActivity($db, (int) $review['project_id'], 'review_submitted', "Encuesta de satisfacción respondida ({$rating}/5)");
    notifyReviewSubmitted($review, [
        'id'         => $review['project_id'],
        'name'       => $review['project_name'],
        'user_name'  => $review['user_name'],
        'user_email' => $review['user_email'],
    ]);

    jsonSuccess(['message' => '¡Gracias por tu opinión!']);
}

jsonError('Método no permitido', 405);
