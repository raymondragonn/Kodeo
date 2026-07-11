<?php
/**
 * Webhook de Stripe — recibe notificaciones de eventos de pago.
 * Configura esta URL en: Dashboard Stripe → Developers → Webhooks.
 *
 * Eventos escuchados:
 *   - payment_intent.succeeded       → Pago confirmado (tarjeta, OXXO, SPEI)
 *   - payment_intent.payment_failed  → Pago fallido
 *   - charge.succeeded               → Cargo exitoso
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/payment-order-helpers.php';

\Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);

$payload   = file_get_contents('php://input');
$sigHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';

try {
    $event = \Stripe\Webhook::constructEvent($payload, $sigHeader, STRIPE_WEBHOOK_SECRET);
} catch (\UnexpectedValueException $e) {
    http_response_code(400);
    exit('Payload inválido');
} catch (\Stripe\Exception\SignatureVerificationException $e) {
    http_response_code(400);
    exit('Firma inválida');
}

switch ($event->type) {
    case 'payment_intent.succeeded':
        $pi = $event->data->object;
        handlePaymentSucceeded($pi);
        break;

    case 'payment_intent.payment_failed':
        $pi = $event->data->object;
        handlePaymentFailed($pi);
        break;

    case 'charge.succeeded':
        $charge = $event->data->object;
        handleChargeSucceeded($charge);
        break;

    default:
        // Evento no manejado — ignorar
        break;
}

http_response_code(200);
echo json_encode(['received' => true]);

// ---------------------------------------------------------------------------

function handlePaymentSucceeded(\Stripe\PaymentIntent $pi): void {
    $method      = $pi->payment_method_types[0] ?? 'unknown';
    $amount      = $pi->amount / 100;
    $currency    = strtoupper($pi->currency);
    $installments = $pi->metadata['installments_plan'] ?? 'none';

    error_log("[STRIPE] Pago exitoso | ID: {$pi->id} | Método: {$method} | Monto: {$amount} {$currency} | MSI: {$installments}");

    // Orden de pago personalizada: se liquida en payment_orders, no crea pedido legacy
    if (settlePaymentOrder($pi)) return;

    $userId  = $pi->metadata['user_id']  ?? null;
    $service = $pi->metadata['service']  ?? null;
    if (!$userId || !$service) {
        error_log("[STRIPE] Pago sin metadata de user_id/service, no se crea pedido | ID: {$pi->id}");
        return;
    }

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
        ')->execute([(int)$userId, $service, $amount, $startDate, $delivery, $pi->id]);

        if ($appointmentId) {
            $db->prepare('UPDATE appointments SET stripe_payment_intent_id = ? WHERE id = ?')
               ->execute([$pi->id, $appointmentId]);
        }
    } catch (\PDOException $e) {
        if ($e->getCode() !== '23000') throw $e; // duplicado (reintento de webhook) — ignorar
    }
}

function handlePaymentFailed(\Stripe\PaymentIntent $pi): void {
    $reason = $pi->last_payment_error->message ?? 'desconocido';
    error_log("[STRIPE] Pago fallido | ID: {$pi->id} | Razón: {$reason}");
}

function handleChargeSucceeded(\Stripe\Charge $charge): void {
    error_log("[STRIPE] Cargo exitoso | ID: {$charge->id} | Monto: " . ($charge->amount / 100) . " " . strtoupper($charge->currency));
}
