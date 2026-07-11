<?php
/**
 * Helpers del flujo de órdenes de pago personalizadas (tabla payment_orders).
 * Compartidos entre webhook.php (asíncrono) y confirm-payment.php (respaldo
 * síncrono) para que la liquidación sea idéntica llegue por donde llegue.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';

const PAYMENT_ORDER_ACCENT = '#5170ff';

/**
 * Marca como pagada la orden referida en la metadata del PaymentIntent.
 * Devuelve true si el PaymentIntent pertenecía a una orden de pago (y por
 * tanto el caller NO debe crear un pedido legacy en `orders`).
 * Idempotente: reintentos de webhook o la doble vía webhook/confirm no
 * duplican efectos gracias al UPDATE condicionado a status = 'pendiente'.
 */
function settlePaymentOrder(\Stripe\PaymentIntent $pi): bool {
    $orderId = isset($pi->metadata['payment_order_id']) ? (int) $pi->metadata['payment_order_id'] : 0;
    if (!$orderId) return false;

    $db = getDb();

    $updated = $db->prepare("
        UPDATE payment_orders
        SET status = 'pagado', tipo_pago = 'stripe', stripe_payment_intent_id = ?, paid_at = NOW()
        WHERE id = ? AND status = 'pendiente'
    ");
    $updated->execute([$pi->id, $orderId]);

    if ($updated->rowCount() > 0) {
        notifyPaymentOrderPaid($orderId);
    }

    return true;
}

/**
 * Avisa al admin (y confirma al cliente) que una orden quedó pagada.
 * Nunca lanza: un fallo de correo no debe tumbar el webhook.
 */
function notifyPaymentOrderPaid(int $orderId): void {
    try {
        $db   = getDb();
        $stmt = $db->prepare('
            SELECT po.*, p.name AS project_name, u.name AS user_name, u.email AS user_email
            FROM payment_orders po
            JOIN projects p ON p.id = po.project_id
            LEFT JOIN users u ON u.id = p.user_id
            WHERE po.id = ?
        ');
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
        if (!$order) return;

        $monto = '$' . number_format((float) $order['amount'], 2) . ' ' . $order['currency'];
        $tipo  = $order['es_cargo_extra'] ? 'Cargo extra' : 'Orden de pago';

        // ── Aviso interno al admin ──
        $adminBody = '
            <p style="margin: 0 0 14px;"><strong style="color: #ffffff;">' . htmlspecialchars($tipo) . ' pagada</strong> (#' . (int) $order['id'] . ')</p>
            <p style="margin: 0 0 8px;">Proyecto: <strong style="color: #ffffff;">' . htmlspecialchars($order['project_name']) . '</strong></p>
            <p style="margin: 0 0 8px;">Cliente: ' . htmlspecialchars($order['user_name'] ?? 'Sin asignar') . ' (' . htmlspecialchars($order['user_email'] ?? '—') . ')</p>
            <p style="margin: 0 0 8px;">Monto: <strong style="color: #ffffff;">' . htmlspecialchars($monto) . '</strong></p>' .
            ($order['descripcion'] !== '' ? '<p style="margin: 0 0 8px;">Concepto: ' . htmlspecialchars($order['descripcion']) . '</p>' : '');

        if (ADMIN_NOTIFY_EMAIL) {
            sendMail(
                ADMIN_NOTIFY_EMAIL,
                ($order['es_cargo_extra'] ? '✅ Cargo extra aprobado y pagado' : '✅ Orden de pago liquidada') . ' — ' . $order['project_name'],
                renderEmailLayout('Pago recibido', $adminBody, null, PAYMENT_ORDER_ACCENT)
            );
        }

        // ── Confirmación al cliente ──
        if (!empty($order['user_email'])) {
            $clientBody = '
                <p style="margin: 0 0 14px;">Hola ' . htmlspecialchars($order['user_name']) . ',</p>
                <p style="margin: 0 0 18px;">Recibimos tu pago de <strong style="color: #ffffff;">' . htmlspecialchars($monto) . '</strong> para el proyecto <strong style="color: #ffffff;">' . htmlspecialchars($order['project_name']) . '</strong>.</p>' .
                ($order['descripcion'] !== '' ? '<p style="margin: 0 0 18px;">Concepto: ' . htmlspecialchars($order['descripcion']) . '</p>' : '') .
                '<p style="margin: 0 0 4px;">Ya puedes seguir el avance desde tu panel.</p>';

            sendMail(
                $order['user_email'],
                'Pago confirmado — Kodeo',
                renderEmailLayout('¡Pago confirmado!', $clientBody, ['label' => 'Ver mi proyecto', 'url' => ALLOWED_ORIGIN . '/proyectos'], PAYMENT_ORDER_ACCENT)
            );
        }
    } catch (\Throwable $e) {
        error_log('[PAYMENT_ORDER] Error notificando pago de orden #' . $orderId . ': ' . $e->getMessage());
    }
}

/**
 * Envía al cliente el link de pago de una orden recién creada.
 * Se usa desde payment-orders.php cuando el proyecto ya tiene usuario ligado.
 */
function notifyPaymentOrderCreated(array $order, string $payUrl): void {
    if (empty($order['user_email'])) return;

    $monto = '$' . number_format((float) $order['amount'], 2) . ' ' . $order['currency'];

    if ($order['es_cargo_extra']) {
        $heading = 'Solicitud de cambio pendiente';
        $subject = 'Tienes una solicitud de cambio por aprobar — Kodeo';
        $intro   = 'Registramos un ajuste en tu proyecto <strong style="color: #ffffff;">' . htmlspecialchars($order['project_name']) . '</strong> que requiere tu aprobación:';
        $cta     = 'Revisar y aprobar';
    } else {
        $heading = 'Tu orden de pago está lista';
        $subject = 'Orden de pago de tu proyecto — Kodeo';
        $intro   = 'Generamos la orden de pago de tu proyecto <strong style="color: #ffffff;">' . htmlspecialchars($order['project_name']) . '</strong>:';
        $cta     = 'Ver y pagar';
    }

    $body = '
        <p style="margin: 0 0 14px;">Hola ' . htmlspecialchars($order['user_name'] ?? '') . ',</p>
        <p style="margin: 0 0 18px;">' . $intro . '</p>' .
        ($order['descripcion'] !== '' ? '<p style="margin: 0 0 8px;">Concepto: <strong style="color: #ffffff;">' . htmlspecialchars($order['descripcion']) . '</strong></p>' : '') .
        '<p style="margin: 0 0 18px;">Monto: <strong style="color: #ffffff;">' . htmlspecialchars($monto) . '</strong></p>';

    sendMail($order['user_email'], $subject, renderEmailLayout($heading, $body, ['label' => $cta, 'url' => $payUrl], PAYMENT_ORDER_ACCENT));
}
