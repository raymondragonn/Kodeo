<?php
/**
 * Proyectos de clientes.
 *   GET   /projects.php          — cliente: sus proyectos; admin: todos (con sus órdenes de pago)
 *   POST  /projects.php          — solo admin: crea proyecto {name, user_email?, notes?}
 *   PATCH /projects.php?id={id}  — solo admin: actualiza {name, status, notes, user_email}
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/project-helpers.php';
require_once __DIR__ . '/review-helpers.php';

setCorsHeaders();

const PROJECT_STATUSES = ['diagnostico', 'en_diseno', 'en_desarrollo', 'completado', 'cancelado'];
// Orden obligatorio de avance — 'cancelado' es la única excepción, se puede
// colocar desde cualquier estatus.
const PROJECT_STATUS_ORDER = ['diagnostico', 'en_diseno', 'en_desarrollo', 'completado'];

$auth   = getAuthUser();
$method = $_SERVER['REQUEST_METHOD'];
$db     = getDb();
$isAdmin = $auth['role'] === 'administrador';

/** Adjunta a cada proyecto sus órdenes de pago (con token: el dueño lo necesita para pagar). */
function attachPaymentOrders(PDO $db, array $projects): array {
    if (!$projects) return [];
    $ids          = array_column($projects, 'id');
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $db->prepare("
        SELECT id, project_id, public_token, descripcion, amount, currency, tipo_pago,
               status, permite_msi, es_cargo_extra, paid_at, created_at
        FROM payment_orders
        WHERE project_id IN ($placeholders)
        ORDER BY created_at DESC
    ");
    $stmt->execute($ids);

    $byProject = [];
    foreach ($stmt->fetchAll() as $order) {
        $byProject[$order['project_id']][] = $order;
    }
    foreach ($projects as &$project) {
        $project['payment_orders'] = $byProject[$project['id']] ?? [];
    }
    return $projects;
}

/** Adjunta a cada proyecto su reseña, si ya se generó (null mientras no esté 'completado'). */
function attachProjectReviews(PDO $db, array $projects): array {
    if (!$projects) return [];
    $ids          = array_column($projects, 'id');
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $db->prepare("
        SELECT id, project_id, public_token, rating, rating_comunicacion, rating_diseno, rating_velocidad,
               expectativas, feedback, mejoras, puede_publicar, submitted_at, created_at
        FROM project_reviews
        WHERE project_id IN ($placeholders)
    ");
    $stmt->execute($ids);

    $byProject = [];
    foreach ($stmt->fetchAll() as $review) {
        $byProject[$review['project_id']] = $review;
    }
    foreach ($projects as &$project) {
        $project['review'] = $byProject[$project['id']] ?? null;
    }
    return $projects;
}

/** Adjunta a cada proyecto su bitácora de actividad (más reciente primero). */
function attachProjectActivity(PDO $db, array $projects): array {
    if (!$projects) return [];
    $ids          = array_column($projects, 'id');
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $db->prepare("
        SELECT id, project_id, event, detail, created_at
        FROM project_activity
        WHERE project_id IN ($placeholders)
        ORDER BY created_at DESC, id DESC
    ");
    $stmt->execute($ids);

    $byProject = [];
    foreach ($stmt->fetchAll() as $entry) {
        $byProject[$entry['project_id']][] = $entry;
    }
    foreach ($projects as &$project) {
        $project['activity'] = $byProject[$project['id']] ?? [];
    }
    return $projects;
}

function attachProjectPaymentState(PDO $db, array $projects): array {
    if (!$projects) return [];

    $ids          = array_column($projects, 'id');
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $db->prepare("
        SELECT
            p.id,
            a.stripe_payment_intent_id AS appointment_payment_intent_id,
            EXISTS (
                SELECT 1
                FROM payment_orders po
                WHERE po.project_id = p.id
                  AND po.status = 'pagado'
            ) AS has_paid_order
        FROM projects p
        LEFT JOIN appointments a ON a.id = p.appointment_id
        WHERE p.id IN ($placeholders)
    ");
    $stmt->execute($ids);

    $stateByProject = [];
    foreach ($stmt->fetchAll() as $row) {
        $stateByProject[(int) $row['id']] = [
            'has_confirmed_payment' => !empty($row['appointment_payment_intent_id']) || (int) ($row['has_paid_order'] ?? 0) === 1,
        ];
    }

    foreach ($projects as &$project) {
        $project['has_confirmed_payment'] = $stateByProject[(int) $project['id']]['has_confirmed_payment'] ?? false;
    }

    return $projects;
}

function projectHasConfirmedPayment(PDO $db, int $projectId): bool {
    $stmt = $db->prepare('
        SELECT
            p.id,
            p.appointment_id,
            a.stripe_payment_intent_id AS appointment_payment_intent_id,
            EXISTS (
                SELECT 1
                FROM payment_orders po
                WHERE po.project_id = p.id
                  AND po.status = \'pagado\'
            ) AS has_paid_order
        FROM projects p
        LEFT JOIN appointments a ON a.id = p.appointment_id
        WHERE p.id = ?
        LIMIT 1
    ');
    $stmt->execute([$projectId]);
    $row = $stmt->fetch();
    if (!$row) return false;

    return !empty($row['appointment_payment_intent_id']) || (int) ($row['has_paid_order'] ?? 0) === 1;
}

// ── GET ?id= : detalle de un proyecto, con bitácora de actividad ──
if ($method === 'GET' && isset($_GET['id'])) {
    $id = (int) $_GET['id'];
    if (!$id) jsonError('ID requerido');

    $stmt = $db->prepare('
        SELECT p.*, u.name AS user_name, u.email AS user_email
        FROM projects p LEFT JOIN users u ON u.id = p.user_id
        WHERE p.id = ?
    ');
    $stmt->execute([$id]);
    $project = $stmt->fetch();
    if (!$project) jsonError('Proyecto no encontrado', 404);

    if (!$isAdmin && (int) $project['user_id'] !== (int) $auth['sub']) {
        jsonError('Acceso denegado', 403);
    }

    $project = attachPaymentOrders($db, [$project]);
    $project = attachProjectPaymentState($db, $project);
    $project = attachProjectReviews($db, $project);
    $project = attachProjectActivity($db, $project);
    jsonSuccess(['project' => $project[0]]);
}

// ── GET: listar proyectos ──────────────────────────────────────
if ($method === 'GET') {
    backfillMissingDiagnosticProjects($db);

    if ($isAdmin) {
        $stmt = $db->query('
            SELECT p.*, u.name AS user_name, u.email AS user_email
            FROM projects p
            LEFT JOIN users u ON u.id = p.user_id
            WHERE p.status <> \'cancelado\'
            ORDER BY p.created_at DESC
        ');
    } else {
        syncClaimedProjectsForUser($db, (int) $auth['sub']);
        $stmt = $db->prepare('
            SELECT p.*, u.name AS user_name, u.email AS user_email
            FROM projects p
            LEFT JOIN users u ON u.id = p.user_id
            WHERE p.user_id = ? AND p.status NOT IN (\'diagnostico\', \'cancelado\')
            ORDER BY p.created_at DESC
        ');
        $stmt->execute([$auth['sub']]);
    }
    $projects = attachPaymentOrders($db, $stmt->fetchAll());
    $projects = attachProjectPaymentState($db, $projects);
    $projects = attachProjectReviews($db, $projects);
    jsonSuccess(['projects' => $projects]);
}

if (!$isAdmin) jsonError('Acceso denegado', 403);

/** Resuelve un correo a user_id; null si viene vacío (proyecto para prospecto sin cuenta). */
function resolveUserId(PDO $db, string $email): ?int {
    if ($email === '') return null;
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) jsonError('Correo de cliente inválido');
    $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$email]);
    $id = $stmt->fetchColumn();
    if (!$id) jsonError('No existe un usuario con ese correo. Déjalo vacío: el cliente quedará ligado al abrir su link de pago.', 404);
    return (int) $id;
}

// ── POST ?id= : generar (o recuperar) el link de encuesta de satisfacción ──
// Solo disponible cuando el proyecto ya está 'completado' — es la única
// forma de habilitar la encuesta, y queda a discreción del admin generarla
// y compartirla (no se envía correo automático).
if ($method === 'POST' && isset($_GET['id'])) {
    $id = (int) $_GET['id'];
    if (!$id) jsonError('ID requerido');

    $stmt = $db->prepare('SELECT status FROM projects WHERE id = ?');
    $stmt->execute([$id]);
    $status = $stmt->fetchColumn();
    if ($status === false) jsonError('Proyecto no encontrado', 404);
    if ($status !== 'completado') {
        jsonError('Solo puedes generar la encuesta de satisfacción cuando el proyecto está completado.', 409);
    }

    $review = createProjectReview($db, $id);
    logProjectActivity($db, $id, 'review_generated', 'Encuesta de satisfacción generada');
    jsonSuccess([
        'review'     => $review,
        'review_url' => ALLOWED_ORIGIN . '/resena/' . $review['public_token'],
    ]);
}

// ── POST: crear proyecto (solo admin) ──────────────────────────
if ($method === 'POST') {
    $body  = json_decode(file_get_contents('php://input'), true) ?? [];
    $name  = trim($body['name'] ?? '');
    $notes = trim($body['notes'] ?? '');
    $email = trim($body['user_email'] ?? '');

    if ($name === '') jsonError('El nombre del proyecto es requerido');

    $userId = resolveUserId($db, $email);

    $db->prepare('INSERT INTO projects (user_id, name, notes) VALUES (?, ?, ?)')
       ->execute([$userId, $name, $notes ?: null]);
    $newId = (int) $db->lastInsertId();

    logProjectActivity($db, $newId, 'created', 'Proyecto creado' . ($email !== '' ? " y asignado a {$email}" : ' (prospecto sin cuenta)'));

    $stmt = $db->prepare('
        SELECT p.*, u.name AS user_name, u.email AS user_email
        FROM projects p LEFT JOIN users u ON u.id = p.user_id
        WHERE p.id = ?
    ');
    $stmt->execute([$newId]);
    $project = $stmt->fetch();
    $project['payment_orders'] = [];
    $project['activity'] = [];

    jsonSuccess(['project' => $project]);
}

// ── PATCH: actualizar proyecto (solo admin) ────────────────────
if ($method === 'PATCH') {
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) jsonError('ID requerido');

    $body       = json_decode(file_get_contents('php://input'), true) ?? [];
    $sets       = [];
    $values     = [];
    $activityLog = [];

    if (array_key_exists('name', $body)) {
        $name = trim($body['name']);
        if ($name === '') jsonError('El nombre no puede quedar vacío');
        $sets[] = 'name = ?';  $values[] = $name;
    }
    if (array_key_exists('status', $body)) {
        $newStatus = $body['status'];
        if (!in_array($newStatus, PROJECT_STATUSES, true)) {
            jsonError('Estatus inválido. Valores: ' . implode(', ', PROJECT_STATUSES));
        }

        $currentStmt = $db->prepare('SELECT status FROM projects WHERE id = ?');
        $currentStmt->execute([$id]);
        $currentStatus = $currentStmt->fetchColumn();
        if ($currentStatus === false) jsonError('Proyecto no encontrado', 404);

        if ($newStatus !== 'cancelado') {
            $currentIdx = array_search($currentStatus, PROJECT_STATUS_ORDER, true);
            $newIdx     = array_search($newStatus, PROJECT_STATUS_ORDER, true);
            if ($newStatus !== $currentStatus && ($currentIdx === false || $newIdx !== $currentIdx + 1)) {
                jsonError('Los proyectos deben avanzar en orden: diagnóstico → en diseño → en desarrollo → completado.', 409);
            }
        }

        if ($newStatus === 'en_diseno' && !projectHasConfirmedPayment($db, $id)) {
            jsonError('El proyecto solo puede pasar a "En diseño" cuando el pago ya fue confirmado por Stripe o validado manualmente.', 409);
        }

        $sets[] = 'status = ?'; $values[] = $newStatus;
        if ($newStatus !== $currentStatus) {
            $fromLabel = PROJECT_STATUS_LABELS[$currentStatus] ?? $currentStatus;
            $toLabel   = PROJECT_STATUS_LABELS[$newStatus] ?? $newStatus;
            $activityLog[] = ['event' => 'status_changed', 'detail' => "Estatus actualizado: {$fromLabel} → {$toLabel}"];
        }
    }
    if (array_key_exists('notes', $body)) {
        $sets[] = 'notes = ?';  $values[] = trim($body['notes']) ?: null;
    }
    if (array_key_exists('user_email', $body)) {
        $emailInput = trim($body['user_email']);
        $sets[] = 'user_id = ?'; $values[] = resolveUserId($db, $emailInput);
        $activityLog[] = [
            'event'  => 'assigned',
            'detail' => $emailInput === '' ? 'Proyecto desasignado de cliente' : "Proyecto asignado a {$emailInput}",
        ];
    }

    if (empty($sets)) jsonError('Nada que actualizar');

    $values[] = $id;
    $db->prepare('UPDATE projects SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($values);

    foreach ($activityLog as $entry) {
        logProjectActivity($db, $id, $entry['event'], $entry['detail']);
    }

    $stmt = $db->prepare('
        SELECT p.*, u.name AS user_name, u.email AS user_email
        FROM projects p LEFT JOIN users u ON u.id = p.user_id
        WHERE p.id = ?
    ');
    $stmt->execute([$id]);
    $project = $stmt->fetch();
    if (!$project) jsonError('Proyecto no encontrado', 404);

    $project = attachPaymentOrders($db, [$project]);
    $project = attachProjectPaymentState($db, $project);
    $project = attachProjectReviews($db, $project);
    $project = attachProjectActivity($db, $project);
    jsonSuccess(['project' => $project[0]]);
}

jsonError('Método no permitido', 405);
