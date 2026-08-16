<?php
/**
 * Órdenes de pago personalizadas (cotizaciones / anticipos / cargos extras).
 *   GET   /payment-orders.php?token={t}  — detalle por link público (requiere sesión;
 *                                          si el proyecto no tiene dueño, lo reclama)
 *   POST  /payment-orders.php            — solo admin: crea orden y devuelve pay_url
 *   PATCH /payment-orders.php?id={id}    — solo admin: marca pagada (transferencia) o cancela
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/payment-order-helpers.php';
require_once __DIR__ . '/project-helpers.php';

setCorsHeaders();

$auth    = getAuthUser();
$method  = $_SERVER['REQUEST_METHOD'];
$db      = getDb();
$isAdmin = $auth['role'] === 'administrador';

function fetchOrderByToken(PDO $db, string $token): ?array {
    $stmt = $db->prepare('
        SELECT po.*, p.name AS project_name, p.status AS project_status, p.user_id AS project_user_id,
               COALESCE(u.name, p.client_name) AS user_name,
               COALESCE(u.email, p.client_email) AS user_email
        FROM payment_orders po
        JOIN projects p ON p.id = po.project_id
        LEFT JOIN users u ON u.id = p.user_id
        WHERE po.public_token = ?
    ');
    $stmt->execute([$token]);
    return $stmt->fetch() ?: null;
}

// ── GET ?token= : detalle de la orden para la pantalla de pago ─
if ($method === 'GET') {
    $token = trim($_GET['token'] ?? '');
    if (!preg_match('/^[a-f0-9]{32}$/', $token)) jsonError('Link de pago inválido', 404);

    $order = fetchOrderByToken($db, $token);
    if (!$order) jsonError('Esta orden de pago no existe o fue eliminada.', 404);

    // Proyecto sin dueño (prospecto): el usuario autenticado que abre el link lo reclama
    if ($order['project_user_id'] === null && !$isAdmin) {
        $db->prepare('UPDATE projects SET user_id = ? WHERE id = ? AND user_id IS NULL')
           ->execute([(int) $auth['sub'], (int) $order['project_id']]);
        $order = fetchOrderByToken($db, $token);
    }

    if (!$isAdmin && (int) $order['project_user_id'] !== (int) $auth['sub']) {
        jsonError('Esta orden de pago pertenece a otra cuenta.', 403);
    }

    jsonSuccess(['order' => $order, 'publishableKey' => STRIPE_PUBLISHABLE_KEY]);
}

if (!$isAdmin) jsonError('Acceso denegado', 403);

// ── POST: crear orden de pago (solo admin) ─────────────────────
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];

    $projectId   = (int) ($body['project_id'] ?? 0);
    $amount      = $body['amount'] ?? null;                 // en pesos (ej. 6500 o 6500.50)
    $descripcion = trim($body['descripcion'] ?? '');
    $permiteMsi  = !empty($body['permite_msi']);
    $esExtra     = !empty($body['es_cargo_extra']);

    if (!$projectId) jsonError('project_id requerido');
    if (!is_numeric($amount) || (float) $amount < 10) jsonError('Monto inválido. Mínimo $10 MXN.');
    if ($esExtra && $descripcion === '') jsonError('Un cargo extra requiere descripción del cambio.');

    $stmt = $db->prepare('SELECT id FROM projects WHERE id = ?');
    $stmt->execute([$projectId]);
    if (!$stmt->fetch()) jsonError('Proyecto no encontrado', 404);

    $token = bin2hex(random_bytes(16));

    $db->prepare('
        INSERT INTO payment_orders (project_id, public_token, descripcion, amount, permite_msi, es_cargo_extra)
        VALUES (?, ?, ?, ?, ?, ?)
    ')->execute([$projectId, $token, $descripcion, round((float) $amount, 2), (int) $permiteMsi, (int) $esExtra]);

    $order  = fetchOrderByToken($db, $token);
    $payUrl = ALLOWED_ORIGIN . '/pago/orden/' . $token;

    $monto = '$' . number_format((float) $order['amount'], 2) . ' ' . $order['currency'];
    logProjectActivity($db, $projectId, $esExtra ? 'extra_charge_created' : 'order_created',
        ($esExtra ? 'Cargo extra creado: ' : 'Orden de pago creada: ') . ($descripcion !== '' ? "{$descripcion} · " : '') . $monto);

    // Si el proyecto ya tiene cliente ligado, le mandamos el link por correo
    notifyPaymentOrderCreated($order, $payUrl);

    jsonSuccess(['order' => $order, 'pay_url' => $payUrl]);
}

// ── PATCH: marcar pagada (transferencia) / cancelar / reabrir ──
if ($method === 'PATCH') {
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) jsonError('ID requerido');

    $body   = json_decode(file_get_contents('php://input'), true) ?? [];
    $status = $body['status'] ?? '';

    if (!in_array($status, ['pagado', 'cancelado', 'pendiente'], true)) {
        jsonError('Estatus inválido. Valores: pagado, cancelado, pendiente');
    }

    $stmt = $db->prepare('SELECT status, project_id FROM payment_orders WHERE id = ?');
    $stmt->execute([$id]);
    $existing = $stmt->fetch();
    if (!$existing) jsonError('Orden no encontrada', 404);
    $current = $existing['status'];

    if ($status === 'pagado') {
        // Confirmación manual = el cliente pagó por transferencia
        $db->prepare("
            UPDATE payment_orders
            SET status = 'pagado', tipo_pago = 'transferencia', paid_at = NOW()
            WHERE id = ? AND status = 'pendiente'
        ")->execute([$id]);
        if ($current === 'pendiente') {
            notifyPaymentOrderPaid($id);
            logProjectActivity($db, $existing['project_id'], 'order_paid', "Orden de pago #{$id} marcada como pagada (transferencia)");
        }
    } else {
        $db->prepare('UPDATE payment_orders SET status = ?, paid_at = NULL WHERE id = ?')
           ->execute([$status, $id]);
        if ($status !== $current) {
            $label = $status === 'cancelado' ? 'cancelada' : 'reabierta';
            logProjectActivity($db, $existing['project_id'], 'order_' . $status, "Orden de pago #{$id} {$label}");
        }
    }

    $stmt = $db->prepare('
        SELECT po.*, p.name AS project_name
        FROM payment_orders po JOIN projects p ON p.id = po.project_id
        WHERE po.id = ?
    ');
    $stmt->execute([$id]);
    jsonSuccess(['order' => $stmt->fetch()]);
}

jsonError('Método no permitido', 405);
