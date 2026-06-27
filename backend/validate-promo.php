<?php

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/auth.php';

setCorsHeaders();
getAuthUser();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Método no permitido', 405);

$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$code   = trim(strtoupper($body['code']   ?? ''));
$amount = (int)($body['amount'] ?? 0); // centavos

if (!$code)        jsonError('Código requerido');
if ($amount < 100) jsonError('Monto inválido');

\Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);

try {
    $results = \Stripe\PromotionCode::all(['code' => $code, 'active' => true, 'limit' => 1]);

    if (empty($results->data)) {
        jsonSuccess(['valid' => false, 'error' => 'Código inválido o expirado']);
    }

    $promo  = $results->data[0];
    $coupon = $promo->coupon;

    if (!$coupon->valid) {
        jsonSuccess(['valid' => false, 'error' => 'Este código ya no está disponible']);
    }

    // Verificar monto mínimo si existe restricción
    $minAmount = $promo->restrictions->minimum_amount ?? null;
    if ($minAmount && $amount < $minAmount) {
        $min = number_format($minAmount / 100, 0, '.', ',');
        jsonSuccess(['valid' => false, 'error' => "Monto mínimo para este código: \${$min} MXN"]);
    }

    // Calcular descuento
    $discount = 0;
    $description = '';

    if ($coupon->percent_off) {
        $discount    = (int) round($amount * $coupon->percent_off / 100);
        $description = $coupon->percent_off . '% de descuento';
    } elseif ($coupon->amount_off) {
        $discount    = min((int) $coupon->amount_off, $amount);
        $description = '$' . number_format($coupon->amount_off / 100, 0, '.', ',') . ' MXN de descuento';
    }

    jsonSuccess([
        'valid'          => true,
        'promo_code_id'  => $promo->id,
        'discount_cents' => $discount,
        'final_cents'    => max(0, $amount - $discount),
        'description'    => $description,
    ]);

} catch (\Stripe\Exception\ApiErrorException $e) {
    jsonError('Error al validar el código: ' . $e->getMessage(), 500);
}
