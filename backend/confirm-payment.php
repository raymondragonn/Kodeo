<?php
/**
 * Confirma un PaymentIntent con Stripe y crea el pedido si aún no existe.
 * Sirve como respaldo síncrono al webhook: el frontend lo llama justo después
 * de un pago exitoso (o al aterrizar en /pago-confirmado) para que el pedido
 * quede reflejado en /pedidos sin depender de que el webhook ya haya llegado.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/payment-order-helpers.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Método no permitido', 405);
}

$auth = getAuthUser();

$body            = json_decode(file_get_contents('php://input'), true);
$paymentIntentId = trim($body['paymentIntentId'] ?? '');

if (!$paymentIntentId) {
    jsonError('paymentIntentId requerido.');
}

\Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);

try {
    $pi = \Stripe\PaymentIntent::retrieve($paymentIntentId);
} catch (\Stripe\Exception\ApiErrorException $e) {
    jsonError('No se encontró el pago.', 404);
}

if ((string)($pi->metadata['user_id'] ?? '') !== (string)$auth['sub']) {
    jsonError('No autorizado', 403);
}

if ($pi->status !== 'succeeded') {
    jsonSuccess(['created' => false, 'status' => $pi->status]);
}

// Orden de pago personalizada: se liquida en payment_orders, no crea pedido legacy
if (settlePaymentOrder($pi)) {
    jsonSuccess(['created' => true, 'payment_order' => true]);
}

$service = $pi->metadata['service'] ?? 'Servicio Kodeo';
$amount  = $pi->amount / 100;

$code      = $pi->metadata['service_code'] ?? null;
$devDays   = SERVICE_DEV_DAYS[$code] ?? DEFAULT_DEV_DAYS;
$startDate = date('Y-m-d');
$delivery  = addBusinessDays($startDate, $devDays);

$appointmentId = isset($pi->metadata['appointment_id']) ? (int)$pi->metadata['appointment_id'] : null;

try {
    $db = getDb();
    $db->prepare('
        INSERT INTO orders (user_id, service, amount, status, start_date, delivery_date, stripe_payment_intent_id)
        VALUES (?, ?, ?, \'pendiente\', ?, ?, ?)
    ')->execute([(int)$auth['sub'], $service, $amount, $startDate, $delivery, $pi->id]);

    if ($appointmentId) {
        $db->prepare('UPDATE appointments SET stripe_payment_intent_id = ? WHERE id = ?')
           ->execute([$pi->id, $appointmentId]);
    }

    jsonSuccess(['created' => true]);
} catch (\PDOException $e) {
    if ($e->getCode() !== '23000') throw $e; // ya existe (creado por webhook o llamada previa)
    jsonSuccess(['created' => false, 'status' => 'already_exists']);
}
