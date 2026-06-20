<?php

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

setCorsHeaders();

$auth   = getAuthUser();
$method = $_SERVER['REQUEST_METHOD'];
$db     = getDb();

// ── GET: listar pedidos ────────────────────────────────────────
if ($method === 'GET') {
    if ($auth['role'] === 'administrador') {
        $stmt = $db->query('
            SELECT o.*, u.name AS user_name, u.username, u.email AS user_email
            FROM orders o
            JOIN users u ON u.id = o.user_id
            ORDER BY o.created_at DESC
        ');
    } else {
        $stmt = $db->prepare('
            SELECT o.*, u.name AS user_name, u.username, u.email AS user_email
            FROM orders o
            JOIN users u ON u.id = o.user_id
            WHERE o.user_id = ?
            ORDER BY o.created_at DESC
        ');
        $stmt->execute([$auth['sub']]);
    }
    jsonSuccess(['orders' => $stmt->fetchAll()]);
}

// ── PATCH: actualizar pedido (solo administrador) ──────────────
if ($method === 'PATCH') {
    if ($auth['role'] !== 'administrador') jsonError('Acceso denegado', 403);

    $id   = (int) ($_GET['id'] ?? 0);
    if (!$id) jsonError('ID requerido');

    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $allowed = ['status', 'start_date', 'delivery_date', 'notes'];
    $sets    = [];
    $values  = [];

    foreach ($allowed as $field) {
        if (!array_key_exists($field, $body)) continue;
        $sets[]   = "$field = ?";
        $values[] = $body[$field] === '' ? null : $body[$field];
    }

    if (empty($sets)) jsonError('Nada que actualizar');

    $values[] = $id;
    $db->prepare('UPDATE orders SET ' . implode(', ', $sets) . ' WHERE id = ?')
       ->execute($values);

    $stmt = $db->prepare('
        SELECT o.*, u.name AS user_name, u.username, u.email AS user_email
        FROM orders o JOIN users u ON u.id = o.user_id
        WHERE o.id = ?
    ');
    $stmt->execute([$id]);
    jsonSuccess(['order' => $stmt->fetch()]);
}

jsonError('Método no permitido', 405);
