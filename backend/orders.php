<?php

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/vendor/autoload.php';

setCorsHeaders();

const ORDER_STATUS_LABELS = [
    'pendiente'  => 'Pendiente',
    'en_proceso' => 'En proceso',
    'completado' => 'Completado',
    'cancelado'  => 'Cancelado',
];

/**
 * Avisa por correo al cliente dueño del pedido que su estado cambió.
 * Nunca lanza: un fallo de envío no debe tumbar la respuesta del PATCH.
 */
function notifyOrderStatusChange(array $order): void {
    $label  = ORDER_STATUS_LABELS[$order['status']] ?? $order['status'];
    $accent = SERVICE_ACCENTS[$order['service']] ?? DEFAULT_EMAIL_ACCENT;

    $body = '
        <p style="margin: 0 0 14px;">Hola ' . htmlspecialchars($order['user_name']) . ',</p>
        <p style="margin: 0 0 18px;">El estado de tu pedido <strong style="color: #ffffff;">' . htmlspecialchars($order['service']) . '</strong> (#' . (int) $order['id'] . ') cambió a:</p>
        <p style="margin: 0 0 4px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase; color: ' . htmlspecialchars($accent) . ';">' . htmlspecialchars($label) . '</p>
    ';

    $html = renderEmailLayout(
        'Actualización de tu pedido',
        $body,
        ['label' => 'Ver mis pedidos', 'url' => ALLOWED_ORIGIN . '/pedidos'],
        $accent
    );

    sendMail($order['user_email'], 'Actualización de tu pedido — Kodeo', $html);
}

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

    $previousStatus = $db->prepare('SELECT status FROM orders WHERE id = ?');
    $previousStatus->execute([$id]);
    $previousStatus = $previousStatus->fetchColumn();

    $values[] = $id;
    $db->prepare('UPDATE orders SET ' . implode(', ', $sets) . ' WHERE id = ?')
       ->execute($values);

    $stmt = $db->prepare('
        SELECT o.*, u.name AS user_name, u.username, u.email AS user_email
        FROM orders o JOIN users u ON u.id = o.user_id
        WHERE o.id = ?
    ');
    $stmt->execute([$id]);
    $order = $stmt->fetch();

    if ($order && array_key_exists('status', $body) && $body['status'] !== $previousStatus) {
        notifyOrderStatusChange($order);
    }

    jsonSuccess(['order' => $order]);
}

jsonError('Método no permitido', 405);
