<?php
/**
 * Pago en efectivo via OXXO.
 * Genera un voucher con número de referencia; el cliente lo paga en tienda.
 * Stripe confirma el pago en ~1 hora después del pago en caja.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/auth.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Método no permitido', 405);
}

$auth = getAuthUser();

$body = json_decode(file_get_contents('php://input'), true);

$amount  = $body['amount'] ?? null;   // Centavos MXN
$name    = trim($body['name'] ?? '');
$email   = trim($body['email'] ?? '');
$service = trim($body['service'] ?? 'Servicio Kodeo');
$code    = trim($body['code'] ?? '');

if (!$amount || !is_numeric($amount) || $amount < 1000) {
    jsonError('Monto inválido. Mínimo 1000 centavos ($10 MXN).');
}
if (!$name) {
    jsonError('El nombre del cliente es requerido.');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonError('Email inválido.');
}

\Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);

try {
    $paymentIntent = \Stripe\PaymentIntent::create([
        'amount'               => (int)$amount,
        'currency'             => 'mxn',
        'payment_method_types' => ['oxxo'],
        'payment_method_data'  => [
            'type'  => 'oxxo',
            'billing_details' => [
                'name'  => $name,
                'email' => $email,
            ],
        ],
        'confirm' => true,
        // El voucher expira en 3 días (259200 segundos)
        'payment_method_options' => [
            'oxxo' => [
                'expires_after_days' => 3,
            ],
        ],
        'return_url' => ALLOWED_ORIGIN . '/pago-confirmado',
        'metadata' => [
            'user_id'      => $auth['sub'],
            'service'      => $service,
            'service_code' => $code,
        ],
    ]);

    $voucherUrl = $paymentIntent->next_action->oxxo_display_details->hosted_voucher_url ?? null;

    jsonSuccess([
        'paymentIntentId' => $paymentIntent->id,
        'status'          => $paymentIntent->status,
        'voucherUrl'      => $voucherUrl,
        'expiresAt'       => $paymentIntent->next_action->oxxo_display_details->expires_after ?? null,
    ]);
} catch (\Stripe\Exception\ApiErrorException $e) {
    jsonError($e->getMessage());
}
