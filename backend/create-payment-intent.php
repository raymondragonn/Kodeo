<?php
/**
 * Tarjeta de crédito con Meses Sin Intereses (MSI)
 * Requiere cuenta Stripe con país México y tarjetas MX elegibles.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/auth.php';
require_once __DIR__ . '/promo.php';

setCorsHeaders();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Método no permitido', 405);
}

$auth = getAuthUser();

$body = json_decode(file_get_contents('php://input'), true);

// ── Órdenes de pago personalizadas (/pago/orden/{token}) ──────────────────
// El monto NO viene del cliente: se lee de payment_orders y el recargo MSI
// se calcula aquí para que el total no sea manipulable desde el navegador.
$paymentOrderToken = trim($body['payment_order_token'] ?? '');
if ($paymentOrderToken !== '') {
    if (!preg_match('/^[a-f0-9]{32}$/', $paymentOrderToken)) jsonError('Link de pago inválido', 404);

    $db   = getDb();
    $stmt = $db->prepare('
        SELECT po.*, p.name AS project_name, p.user_id AS project_user_id
        FROM payment_orders po JOIN projects p ON p.id = po.project_id
        WHERE po.public_token = ?
    ');
    $stmt->execute([$paymentOrderToken]);
    $order = $stmt->fetch();

    if (!$order)                          jsonError('Esta orden de pago no existe.', 404);
    if ($order['status'] === 'pagado')    jsonError('Esta orden ya fue pagada.');
    if ($order['status'] === 'cancelado') jsonError('Esta orden fue cancelada.');
    if ($order['project_user_id'] !== null
        && (int) $order['project_user_id'] !== (int) $auth['sub']
        && $auth['role'] !== 'administrador') {
        jsonError('Esta orden de pago pertenece a otra cuenta.', 403);
    }

    $installments = (int) ($body['installments'] ?? 0);
    if (!$order['permite_msi']) $installments = 0;
    if ($installments && !isset(MSI_SURCHARGE_RATES[$installments])) jsonError('Plan de meses inválido.');

    $promoCode = trim($body['promo_code'] ?? '');

    \Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);

    // Descuento sobre el monto base; el recargo MSI se aplica al monto ya descontado
    $baseCents   = (int) round((float) $order['amount'] * 100);
    $promo       = resolvePromoCode($promoCode ?: null, $baseCents);
    $chargeCents = $promo['final_amount'];
    $surcharge   = $installments ? (int) round($chargeCents * MSI_SURCHARGE_RATES[$installments]) : 0;
    $totalCents  = $chargeCents + $surcharge;

    $metadata = [
        'user_id'           => $auth['sub'],
        'payment_order_id'  => (string) $order['id'],
        'service'           => $order['project_name'],
        'es_cargo_extra'    => $order['es_cargo_extra'] ? '1' : '0',
        'installments_plan' => $installments > 0 ? "{$installments}_months" : 'none',
    ];
    if ($promo['discount'] > 0) {
        $metadata['promo_code']     = $promoCode;
        $metadata['discount_cents'] = (string) $promo['discount'];
    }

    try {
        $paymentIntent = \Stripe\PaymentIntent::create([
            'amount'               => $totalCents,
            'currency'             => strtolower($order['currency']),
            'payment_method_types' => ['card'],
            'payment_method_options' => [
                'card' => ['installments' => ['enabled' => $installments > 0]],
            ],
            'metadata' => $metadata,
        ]);

        jsonSuccess([
            'clientSecret'        => $paymentIntent->client_secret,
            'paymentIntentId'     => $paymentIntent->id,
            'publishableKey'      => STRIPE_PUBLISHABLE_KEY,
            'installmentsEnabled' => $installments > 0,
            'amounts'             => [
                'base'      => $baseCents,
                'discount'  => $promo['discount'],
                'surcharge' => $surcharge,
                'total'     => $totalCents,
            ],
        ]);
    } catch (\Stripe\Exception\ApiErrorException $e) {
        jsonError($e->getMessage());
    }
}

$amount        = $body['amount'] ?? null;       // Monto en centavos (ej. 150000 = $1,500 MXN)
$currency      = $body['currency'] ?? 'mxn';
$service       = trim($body['service'] ?? 'Servicio Kodeo');
$code          = trim($body['code'] ?? '');
$installments  = (int)($body['installments'] ?? 0); // 0 = sin MSI, 3, 6, 9, 12, 18, 24
$appointmentId = isset($body['appointment_id']) ? (int)$body['appointment_id'] : null;
$promoCode     = trim($body['promo_code'] ?? '');

if (!$amount || !is_numeric($amount) || $amount < 1000) {
    jsonError('Monto inválido. Mínimo 1000 centavos ($10 MXN).');
}

\Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);

$promo       = resolvePromoCode($promoCode ?: null, (int)$amount);
$finalAmount = $promo['final_amount'];

try {
    $params = [
        'amount'               => $finalAmount,
        'currency'             => $currency,
        'payment_method_types' => ['card'],
        'payment_method_options' => [
            'card' => [
                'installments' => [
                    'enabled' => $installments > 0,
                ],
            ],
        ],
        'metadata' => array_filter([
            'user_id'            => $auth['sub'],
            'service'            => $service,
            'service_code'       => $code,
            'installments_plan'  => $installments > 0 ? "{$installments}_months" : 'none',
            'appointment_id'     => $appointmentId ? (string)$appointmentId : null,
            'promo_code'         => $promoCode ?: null,
            'discount_cents'     => $promo['discount'] > 0 ? (string)$promo['discount'] : null,
        ]),
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
