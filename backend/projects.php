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

setCorsHeaders();

const PROJECT_STATUSES = ['en_diseno', 'en_desarrollo', 'completado', 'cancelado'];

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

// ── GET: listar proyectos ──────────────────────────────────────
if ($method === 'GET') {
    if ($isAdmin) {
        $stmt = $db->query('
            SELECT p.*, u.name AS user_name, u.email AS user_email
            FROM projects p
            LEFT JOIN users u ON u.id = p.user_id
            ORDER BY p.created_at DESC
        ');
    } else {
        $stmt = $db->prepare('
            SELECT p.*, u.name AS user_name, u.email AS user_email
            FROM projects p
            LEFT JOIN users u ON u.id = p.user_id
            WHERE p.user_id = ?
            ORDER BY p.created_at DESC
        ');
        $stmt->execute([$auth['sub']]);
    }
    jsonSuccess(['projects' => attachPaymentOrders($db, $stmt->fetchAll())]);
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
        if (!in_array($body['status'], PROJECT_STATUSES, true)) {
            jsonError('Estatus inválido. Valores: ' . implode(', ', PROJECT_STATUSES));
        }
        $sets[] = 'status = ?'; $values[] = $body['status'];
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

    jsonSuccess(['project' => attachPaymentOrders($db, [$project])[0]]);
}

jsonError('Método no permitido', 405);
