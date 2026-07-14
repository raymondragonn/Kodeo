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

    $stmt = $db->prepare('
        SELECT p.*, u.name AS user_name, u.email AS user_email
        FROM projects p LEFT JOIN users u ON u.id = p.user_id
        WHERE p.id = ?
    ');
    $stmt->execute([(int) $db->lastInsertId()]);
    $project = $stmt->fetch();
    $project['payment_orders'] = [];

    jsonSuccess(['project' => $project]);
}

// ── PATCH: actualizar proyecto (solo admin) ────────────────────
if ($method === 'PATCH') {
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) jsonError('ID requerido');

    $body   = json_decode(file_get_contents('php://input'), true) ?? [];
    $sets   = [];
    $values = [];

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

        if ($newStatus !== 'cancelado') {
            $currentStmt = $db->prepare('SELECT status FROM projects WHERE id = ?');
            $currentStmt->execute([$id]);
            $currentStatus = $currentStmt->fetchColumn();
            if ($currentStatus === false) jsonError('Proyecto no encontrado', 404);

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
    }
    if (array_key_exists('notes', $body)) {
        $sets[] = 'notes = ?';  $values[] = trim($body['notes']) ?: null;
    }
    if (array_key_exists('user_email', $body)) {
        $sets[] = 'user_id = ?'; $values[] = resolveUserId($db, trim($body['user_email']));
    }

    if (empty($sets)) jsonError('Nada que actualizar');

    $values[] = $id;
    $db->prepare('UPDATE projects SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($values);

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
    jsonSuccess(['project' => $project[0]]);
}

jsonError('Método no permitido', 405);
