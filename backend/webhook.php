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
require_once __DIR__ . '/vendor/autoload.php';

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

    // Aquí conecta con tu base de datos o envía un email de confirmación.
    // Ejemplo de log:
    error_log("[STRIPE] Pago exitoso | ID: {$pi->id} | Método: {$method} | Monto: {$amount} {$currency} | MSI: {$installments}");
}

function handlePaymentFailed(\Stripe\PaymentIntent $pi): void {
    $reason = $pi->last_payment_error->message ?? 'desconocido';
    error_log("[STRIPE] Pago fallido | ID: {$pi->id} | Razón: {$reason}");
}

function handleChargeSucceeded(\Stripe\Charge $charge): void {
    error_log("[STRIPE] Cargo exitoso | ID: {$charge->id} | Monto: " . ($charge->amount / 100) . " " . strtoupper($charge->currency));
}
