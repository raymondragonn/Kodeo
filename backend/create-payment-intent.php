<?php
/**
 * Tarjeta de crédito con Meses Sin Intereses (MSI)
 * Requiere cuenta Stripe con país México y tarjetas MX elegibles.
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

$amount      = $body['amount'] ?? null;       // Monto en centavos (ej. 150000 = $1,500 MXN)
$currency    = $body['currency'] ?? 'mxn';
$service     = trim($body['service'] ?? 'Servicio Kodeo');
$code        = trim($body['code'] ?? '');
$installments = (int)($body['installments'] ?? 0); // 0 = sin MSI, 3, 6, 9, 12, 18, 24

if (!$amount || !is_numeric($amount) || $amount < 1000) {
    jsonError('Monto inválido. Mínimo 1000 centavos ($10 MXN).');
}

\Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);

try {
    $params = [
        'amount'               => (int)$amount,
        'currency'             => $currency,
        'payment_method_types' => ['card'],
        'payment_method_options' => [
            'card' => [
                'installments' => [
                    'enabled' => $installments > 0,
                ],
            ],
        ],
        'metadata' => [
            'user_id'            => $auth['sub'],
            'service'            => $service,
            'service_code'       => $code,
            'installments_plan'  => $installments > 0 ? "{$installments}_months" : 'none',
        ],
    ];

    $paymentIntent = \Stripe\PaymentIntent::create($params);

    jsonSuccess([
        'clientSecret'      => $paymentIntent->client_secret,
        'paymentIntentId'   => $paymentIntent->id,
        'publishableKey'    => STRIPE_PUBLISHABLE_KEY,
        'installmentsEnabled' => $installments > 0,
    ]);
} catch (\Stripe\Exception\ApiErrorException $e) {
    jsonError($e->getMessage());
}
